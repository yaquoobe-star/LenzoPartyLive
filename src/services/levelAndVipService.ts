import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { apiFetch } from '../utils/apiConfig';
import {
  ActiveFrameType,
  EarnedAchievementRecord,
  LevelUpEvent,
  ProgressionUnlockHistoryEntry,
  UserLevelProgression,
} from '../types/levelAndVip';
import {
  calculateLevelProgression,
  detectMilestoneUnlocks,
  getLevelDefinition,
  getVipFrameDefinition,
} from '../utils/levelAndVipConfig';
import {
  EvaluatedAchievementBadge,
  MAX_EQUIPPED_ACHIEVEMENT_BADGES,
  UserActivityMetrics,
} from '../shared/progressionEngine';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // non-fatal if not signed in via Firebase
  }
  return headers;
}

/**
 * Normalizes any remote progression payload through our exact local 0–100 Coin Chart engine
 * so stale backend deployments or cached snapshots can never revert the exact CSV thresholds.
 */
function normalizeProgressionPayload(
  raw: Partial<UserLevelProgression> | null | undefined,
  userId: string,
  minCoinsFloor: number = 0
): UserLevelProgression {
  const totalCoins = Math.max(
    minCoinsFloor,
    typeof raw?.totalQualifyingCoinsSpent === 'number' && Number.isFinite(raw.totalQualifyingCoinsSpent)
      ? Math.floor(raw.totalQualifyingCoinsSpent)
      : 0
  );
  const equippedVipFrame = typeof raw?.equippedVipFrame === 'number' ? raw.equippedVipFrame : 0;
  const equippedSuperVipFrame = typeof raw?.equippedSuperVipFrame === 'number' ? raw.equippedSuperVipFrame : 0;
  const activeFrameType: ActiveFrameType =
    raw?.activeFrameType === 'vip' || raw?.activeFrameType === 'super_vip' || raw?.activeFrameType === 'none'
      ? raw.activeFrameType
      : equippedSuperVipFrame > 0
      ? 'super_vip'
      : equippedVipFrame > 0
      ? 'vip'
      : 'none';

  return calculateLevelProgression(totalCoins, userId, equippedVipFrame, {
    activeFrameType,
    equippedSuperVipFrame,
    earnedAchievements: Array.isArray(raw?.earnedAchievements) ? raw.earnedAchievements : [],
    equippedAchievementBadges: Array.isArray(raw?.equippedAchievementBadges)
      ? raw.equippedAchievementBadges.slice(0, MAX_EQUIPPED_ACHIEVEMENT_BADGES)
      : [],
  });
}

/**
 * 1. SUBSCRIBE TO USER LEVEL PROGRESSION (Realtime Firestore Primary + Non-Destructive Sync)
 */
export function subscribeUserLevelProgression(
  userId: string,
  initialCoinsSpent: number = 0,
  onUpdate: (progression: UserLevelProgression) => void
) {
  const docRef = doc(db, 'user_levels', userId);
  const userRef = doc(db, 'users', userId);
  let latestFirestoreCoins = Math.max(0, Math.floor(initialCoinsSpent || 0));

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const totalCoins = typeof data.totalQualifyingCoinsSpent === 'number'
          ? Math.max(0, Math.floor(data.totalQualifyingCoinsSpent))
          : latestFirestoreCoins;
        latestFirestoreCoins = Math.max(latestFirestoreCoins, totalCoins);

        const equippedVipFrame = typeof data.equippedVipFrame === 'number' ? data.equippedVipFrame : 0;
        const equippedSuperVipFrame = typeof data.equippedSuperVipFrame === 'number' ? data.equippedSuperVipFrame : 0;
        const activeFrameType: ActiveFrameType =
          data.activeFrameType === 'vip' || data.activeFrameType === 'super_vip' || data.activeFrameType === 'none'
            ? data.activeFrameType
            : equippedSuperVipFrame > 0
            ? 'super_vip'
            : equippedVipFrame > 0
            ? 'vip'
            : 'none';
        const earnedAchievements: EarnedAchievementRecord[] = Array.isArray(data.earnedAchievements)
          ? data.earnedAchievements
          : [];
        const equippedAchievementBadges: string[] = Array.isArray(data.equippedAchievementBadges)
          ? data.equippedAchievementBadges.slice(0, MAX_EQUIPPED_ACHIEVEMENT_BADGES)
          : [];

        const prog = calculateLevelProgression(totalCoins, userId, equippedVipFrame, {
          activeFrameType,
          equippedSuperVipFrame,
          earnedAchievements,
          equippedAchievementBadges,
        });

        // Auto-sync Firestore level/tier if user's stored level is outdated under the exact 0–100 chart
        if (
          data.currentLevel !== prog.currentLevel ||
          data.currentTier !== prog.currentTier
        ) {
          setDoc(
            docRef,
            {
              currentLevel: prog.currentLevel,
              currentTier: prog.currentTier,
              unlockedVipTiers: prog.unlockedVipTiers,
              unlockedSuperVipTiers: prog.unlockedSuperVipTiers,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          ).catch(() => {});
          setDoc(
            userRef,
            {
              level: prog.currentLevel,
              totalQualifyingCoinsSpent: prog.totalQualifyingCoinsSpent,
              vipLevel: prog.highestUnlockedVipTier,
              isVIP: prog.highestUnlockedVipTier > 0,
              superVipLevel: prog.highestUnlockedSuperVipTier,
              isSuperVIP: prog.highestUnlockedSuperVipTier > 0,
            },
            { merge: true }
          ).catch(() => {});
        }

        onUpdate(prog);
      } else {
        const initialProg = calculateLevelProgression(latestFirestoreCoins, userId, 0);
        setDoc(
          docRef,
          {
            userId,
            currentLevel: initialProg.currentLevel,
            currentTier: initialProg.currentTier,
            totalQualifyingCoinsSpent: latestFirestoreCoins,
            activeFrameType: initialProg.activeFrameType,
            equippedVipFrame: initialProg.equippedVipFrame,
            equippedSuperVipFrame: initialProg.equippedSuperVipFrame,
            unlockedVipTiers: initialProg.unlockedVipTiers,
            unlockedSuperVipTiers: initialProg.unlockedSuperVipTiers,
            earnedAchievements: [],
            equippedAchievementBadges: [],
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ).catch(() => {});
        onUpdate(initialProg);
      }
    },
    (err) => {
      console.warn('Level progression listener notice:', err);
      onUpdate(calculateLevelProgression(latestFirestoreCoins, userId, 0));
    }
  );
}

/**
 * Fetch authoritative progression, evaluated achievements, and unlock history from backend,
 * strictly normalized through the exact 0–100 CSV coin chart and merged with Firestore coins.
 */
export async function fetchAuthoritativeProgression(userId: string): Promise<{
  progression: UserLevelProgression;
  achievements: EvaluatedAchievementBadge[];
  unlockHistory: ProgressionUnlockHistoryEntry[];
} | null> {
  try {
    let firestoreCoins = 0;
    try {
      const snap = await getDoc(doc(db, 'user_levels', userId));
      if (snap.exists() && typeof snap.data().totalQualifyingCoinsSpent === 'number') {
        firestoreCoins = Math.max(0, Math.floor(snap.data().totalQualifyingCoinsSpent));
      }
    } catch {
      // ignore read failure
    }

    const headers = await getAuthHeaders();
    const res = await apiFetch(`/api/progression/user/${encodeURIComponent(userId)}`, {
      headers,
    });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      return {
        ...data,
        progression: normalizeProgressionPayload(data.progression, userId, firestoreCoins),
      };
    }
  } catch {
    // offline fallback handled by Firestore snapshot
  }
  return null;
}

/**
 * 2. RECORD QUALIFYING SPENT COINS & REAL-TIME LEVEL UP
 * Executes atomic Firestore transaction first so every real coin spend immediately upgrades
 * the user's Level (0–100), Tier, VIP/Super VIP unlocks, and remaining coins required in real time,
 * then mirrors to Express backend for global rankings & audit trail.
 */
export async function addQualifyingGiftingCoins(
  userId: string,
  coinsSpent: number,
  options?: {
    transactionId?: string;
    reason?: string;
    userSnapshot?: {
      name?: string;
      avatar?: string;
      email?: string;
      metrics?: Partial<UserActivityMetrics>;
    };
  }
): Promise<{
  progression: UserLevelProgression;
  levelUpEvent?: LevelUpEvent;
  duplicate?: boolean;
}> {
  const safeSpend = Math.max(0, Math.floor(Number.isFinite(coinsSpent) ? coinsSpent : 0));
  const txId = options?.transactionId || `tx_prog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const docRef = doc(db, 'user_levels', userId);
  const userRef = doc(db, 'users', userId);
  let resultProgression: UserLevelProgression = calculateLevelProgression(safeSpend, userId, 0);
  let levelUpEvent: LevelUpEvent | undefined;

  if (safeSpend > 0) {
    try {
      await runTransaction(db, async (tx) => {
        const [snap, userSnap] = await Promise.all([tx.get(docRef), tx.get(userRef)]);
        const data = snap.exists() ? snap.data() : {};
        const userData = userSnap.exists() ? userSnap.data() : {};

        const storedLevelCoins =
          typeof data.totalQualifyingCoinsSpent === 'number' ? data.totalQualifyingCoinsSpent : 0;
        const storedUserCoins =
          typeof userData.totalQualifyingCoinsSpent === 'number' ? userData.totalQualifyingCoinsSpent : 0;
        const currentCoins = Math.max(0, Math.floor(Math.max(storedLevelCoins, storedUserCoins)));

        const equippedVip = typeof data.equippedVipFrame === 'number'
          ? data.equippedVipFrame
          : typeof userData.equippedVipFrame === 'number'
          ? userData.equippedVipFrame
          : 0;
        const equippedSuperVip = typeof data.equippedSuperVipFrame === 'number'
          ? data.equippedSuperVipFrame
          : typeof userData.equippedSuperVipFrame === 'number'
          ? userData.equippedSuperVipFrame
          : 0;
        const activeFrameType: ActiveFrameType =
          data.activeFrameType === 'vip' || data.activeFrameType === 'super_vip' || data.activeFrameType === 'none'
            ? data.activeFrameType
            : userData.activeFrameType === 'vip' || userData.activeFrameType === 'super_vip'
            ? userData.activeFrameType
            : 'none';
        const earnedAchievements: EarnedAchievementRecord[] = Array.isArray(data.earnedAchievements)
          ? data.earnedAchievements
          : [];
        const equippedAchievementBadges: string[] = Array.isArray(data.equippedAchievementBadges)
          ? data.equippedAchievementBadges
          : [];

        const newTotalCoins = currentCoins + safeSpend;
        const diff = detectMilestoneUnlocks(currentCoins, newTotalCoins);

        const newProg = calculateLevelProgression(newTotalCoins, userId, equippedVip, {
          activeFrameType,
          equippedSuperVipFrame: equippedSuperVip,
          earnedAchievements,
          equippedAchievementBadges,
        });
        resultProgression = newProg;

        if (diff.leveledUp) {
          const latestVip = diff.newlyUnlockedVipTiers[diff.newlyUnlockedVipTiers.length - 1];
          const latestSuperVip = diff.newlyUnlockedSuperVipFrames[diff.newlyUnlockedSuperVipFrames.length - 1];
          levelUpEvent = {
            oldLevel: diff.oldLevel,
            newLevel: diff.newLevel,
            oldTier: diff.oldTierId,
            newTier: diff.newTierId,
            tierChanged: diff.tierChanged,
            coinsSpent: safeSpend,
            badge: getLevelDefinition(diff.newLevel),
            unlockedVipFrame: latestVip ? getVipFrameDefinition(latestVip) : undefined,
            unlockedVipFrames: diff.newlyUnlockedVipFrames,
            unlockedSuperVipFrame: latestSuperVip,
            unlockedSuperVipFrames: diff.newlyUnlockedSuperVipFrames,
          };
        }

        tx.set(
          docRef,
          {
            userId,
            currentLevel: newProg.currentLevel,
            currentTier: newProg.currentTier,
            totalQualifyingCoinsSpent: newTotalCoins,
            activeFrameType: newProg.activeFrameType,
            equippedVipFrame: newProg.equippedVipFrame,
            equippedSuperVipFrame: newProg.equippedSuperVipFrame,
            unlockedVipTiers: newProg.unlockedVipTiers,
            unlockedSuperVipTiers: newProg.unlockedSuperVipTiers,
            earnedAchievements,
            equippedAchievementBadges,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        tx.set(
          userRef,
          {
            level: newProg.currentLevel,
            totalQualifyingCoinsSpent: newTotalCoins,
            vipLevel: newProg.highestUnlockedVipTier,
            isVIP: newProg.highestUnlockedVipTier > 0,
            superVipLevel: newProg.highestUnlockedSuperVipTier,
            isSuperVIP: newProg.highestUnlockedSuperVipTier > 0,
            activeFrameType: newProg.activeFrameType,
            equippedVipFrame: newProg.equippedVipFrame,
            equippedSuperVipFrame: newProg.equippedSuperVipFrame,
          },
          { merge: true }
        );
      });
    } catch (err) {
      console.warn('Level progression Firestore tx error:', err);
    }

    // Non-blocking mirror to Express backend for global rankings & admin audit logs
    getAuthHeaders()
      .then((headers) =>
        apiFetch('/api/progression/spend', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            userId,
            coinsSpent: safeSpend,
            transactionId: txId,
            reason: options?.reason || 'gift_sent',
            userSnapshot: options?.userSnapshot,
          }),
        })
      )
      .catch(() => {});
  }

  return { progression: resultProgression, levelUpEvent };
}

/**
 * 3. EQUIP ACTIVE PROFILE FRAME (VIP 1..12 OR SUPER VIP 1..6 OR NONE)
 * Strictly validated server-side so locked frames cannot be equipped and frames never overlap!
 */
export async function equipActiveFrame(
  userId: string,
  frameType: ActiveFrameType,
  tier: number = 0
): Promise<{
  success: boolean;
  progression?: UserLevelProgression;
  message?: string;
  error?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/progression/equip-frame', {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId, frameType, tier }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Frame is locked or invalid.',
        message: data.error || 'Frame is locked or invalid.',
      };
    }

    const prog: UserLevelProgression | undefined = data.progression;

    // Mirror active frame choice into Firestore
    try {
      const nextVip = frameType === 'vip' ? tier : 0;
      const nextSuperVip = frameType === 'super_vip' ? tier : 0;
      await setDoc(
        doc(db, 'user_levels', userId),
        {
          activeFrameType: frameType,
          equippedVipFrame: nextVip,
          equippedSuperVipFrame: nextSuperVip,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await setDoc(
        doc(db, 'users', userId),
        {
          activeFrameType: frameType,
          equippedVipFrame: nextVip,
          equippedSuperVipFrame: nextSuperVip,
        },
        { merge: true }
      );
    } catch {
      // non-blocking
    }

    return {
      success: true,
      progression: prog,
      message: data.message || 'Profile frame updated',
    };
  } catch (err: any) {
    // Offline fallback with strict local unlock verification against Firestore
    try {
      const docRef = doc(db, 'user_levels', userId);
      const snap = await getDoc(docRef);
      const data = snap.exists() ? snap.data() : {};
      const unlockedVip: number[] = Array.isArray(data.unlockedVipTiers) ? data.unlockedVipTiers : [];
      const unlockedSuperVip: number[] = Array.isArray(data.unlockedSuperVipTiers) ? data.unlockedSuperVipTiers : [];

      if (frameType === 'vip' && tier > 0 && !unlockedVip.includes(tier)) {
        const msg = `VIP ${tier} frame is locked. Reach Level ${tier * 8} to unlock it.`;
        return { success: false, error: msg, message: msg };
      }
      if (frameType === 'super_vip' && tier > 0 && !unlockedSuperVip.includes(tier)) {
        const msg = `Super VIP ${tier} frame is locked. Reach Level ${tier * 12} to unlock it.`;
        return { success: false, error: msg, message: msg };
      }

      const nextVip = frameType === 'vip' ? tier : 0;
      const nextSuperVip = frameType === 'super_vip' ? tier : 0;

      await setDoc(
        docRef,
        {
          activeFrameType: frameType,
          equippedVipFrame: nextVip,
          equippedSuperVipFrame: nextSuperVip,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await setDoc(
        doc(db, 'users', userId),
        {
          activeFrameType: frameType,
          equippedVipFrame: nextVip,
          equippedSuperVipFrame: nextSuperVip,
        },
        { merge: true }
      );
      return { success: true, message: 'Frame equipped successfully' };
    } catch (innerErr: any) {
      const msg = innerErr?.message || err?.message || 'Failed to equip frame';
      return { success: false, error: msg, message: msg };
    }
  }
}

/**
 * Legacy helper alias for VIP frame equipping
 */
export async function equipVipFrame(
  userId: string,
  vipTier: number | null
): Promise<{ success: boolean; progression?: UserLevelProgression; message?: string; error?: string }> {
  const tierNum = vipTier ?? 0;
  return equipActiveFrame(userId, tierNum > 0 ? 'vip' : 'none', tierNum);
}

/**
 * Helper for Super VIP frame equipping
 */
export async function equipSuperVipFrame(
  userId: string,
  superVipTier: number | null
): Promise<{ success: boolean; progression?: UserLevelProgression; message?: string; error?: string }> {
  const tierNum = superVipTier ?? 0;
  return equipActiveFrame(userId, tierNum > 0 ? 'super_vip' : 'none', tierNum);
}

/**
 * 4. SERVER-VERIFIED ACHIEVEMENT EVALUATION & BADGE VAULT EQUIP (MAX 3)
 */
export async function syncAndEvaluateAchievements(
  userId: string,
  metrics: Partial<UserActivityMetrics>
): Promise<{
  achievements: EvaluatedAchievementBadge[];
  newlyEarned: EvaluatedAchievementBadge[];
  equippedAchievementBadges: string[];
} | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/progression/achievements/evaluate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId, metrics }),
    });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      return await res.json();
    }
  } catch {
    // ignore
  }
  return null;
}

export async function equipAchievementBadges(
  userId: string,
  badgeIds: string[]
): Promise<{
  success: boolean;
  equippedAchievementBadges?: string[];
  error?: string;
}> {
  if (badgeIds.length > MAX_EQUIPPED_ACHIEVEMENT_BADGES) {
    return {
      success: false,
      error: `You can equip at most ${MAX_EQUIPPED_ACHIEVEMENT_BADGES} achievement badges on your profile.`,
    };
  }
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/progression/achievements/equip', {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId, badgeIds }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || 'Could not equip achievement badges.' };
    }

    try {
      await setDoc(
        doc(db, 'user_levels', userId),
        { equippedAchievementBadges: data.equippedAchievementBadges || badgeIds, updatedAt: serverTimestamp() },
        { merge: true }
      );
      await setDoc(
        doc(db, 'users', userId),
        { equippedBadges: data.equippedAchievementBadges || badgeIds },
        { merge: true }
      );
    } catch {
      // non-blocking
    }

    return {
      success: true,
      equippedAchievementBadges: data.equippedAchievementBadges || badgeIds,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to equip badges.' };
  }
}
