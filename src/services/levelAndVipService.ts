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
 * 1. SUBSCRIBE TO USER LEVEL PROGRESSION (Realtime Firestore + Authoritative Backend Hydration)
 */
export function subscribeUserLevelProgression(
  userId: string,
  initialCoinsSpent: number = 0,
  onUpdate: (progression: UserLevelProgression) => void
) {
  const docRef = doc(db, 'user_levels', userId);

  // Hydrate authoritative progression from Express backend in background
  fetchAuthoritativeProgression(userId)
    .then((res) => {
      if (res?.progression) {
        onUpdate(res.progression);
      }
    })
    .catch(() => {});

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const totalCoins = typeof data.totalQualifyingCoinsSpent === 'number'
          ? data.totalQualifyingCoinsSpent
          : initialCoinsSpent;
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
        onUpdate(prog);
      } else {
        const initialProg = calculateLevelProgression(initialCoinsSpent, userId, 0);
        setDoc(
          docRef,
          {
            userId,
            currentLevel: initialProg.currentLevel,
            currentTier: initialProg.currentTier,
            totalQualifyingCoinsSpent: initialCoinsSpent,
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
      onUpdate(calculateLevelProgression(initialCoinsSpent, userId, 0));
    }
  );
}

/**
 * Fetch authoritative progression, evaluated achievements, and unlock history from backend.
 */
export async function fetchAuthoritativeProgression(userId: string): Promise<{
  progression: UserLevelProgression;
  achievements: EvaluatedAchievementBadge[];
  unlockHistory: ProgressionUnlockHistoryEntry[];
} | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch(`/api/progression/user/${encodeURIComponent(userId)}`, {
      headers,
    });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      return await res.json();
    }
  } catch {
    // offline fallback handled by Firestore snapshot
  }
  return null;
}

/**
 * 2. RECORD QUALIFYING GIFT COINS & AUTHORITATIVE LEVEL UP
 * Processes atomic backend coin progression with transactionId idempotency + Firestore sync.
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
  const txId = options?.transactionId || `tx_prog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 1. Primary authoritative backend execution
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/progression/spend', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        coinsSpent,
        transactionId: txId,
        reason: options?.reason || 'gift_sent',
        userSnapshot: options?.userSnapshot,
      }),
    });

    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      const prog: UserLevelProgression = data.progression;

      // Mirror authoritative state into Firestore user_levels & users docs
      try {
        await setDoc(
          doc(db, 'user_levels', userId),
          {
            userId,
            currentLevel: prog.currentLevel,
            currentTier: prog.currentTier,
            totalQualifyingCoinsSpent: prog.totalQualifyingCoinsSpent,
            activeFrameType: prog.activeFrameType,
            equippedVipFrame: prog.equippedVipFrame,
            equippedSuperVipFrame: prog.equippedSuperVipFrame,
            unlockedVipTiers: prog.unlockedVipTiers,
            unlockedSuperVipTiers: prog.unlockedSuperVipTiers,
            earnedAchievements: prog.earnedAchievements || [],
            equippedAchievementBadges: prog.equippedAchievementBadges || [],
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        await setDoc(
          doc(db, 'users', userId),
          {
            level: prog.currentLevel,
            totalQualifyingCoinsSpent: prog.totalQualifyingCoinsSpent,
            vipLevel: prog.highestUnlockedVipTier,
            isVIP: prog.highestUnlockedVipTier > 0,
            superVipLevel: prog.highestUnlockedSuperVipTier,
            isSuperVIP: prog.highestUnlockedSuperVipTier > 0,
            activeFrameType: prog.activeFrameType,
            equippedVipFrame: prog.equippedVipFrame,
            equippedSuperVipFrame: prog.equippedSuperVipFrame,
          },
          { merge: true }
        );
      } catch {
        // non-blocking Firestore mirror notice
      }

      return {
        progression: prog,
        levelUpEvent: data.levelUpEvent,
        duplicate: Boolean(data.duplicate),
      };
    }
  } catch (err) {
    console.warn('[Progression] Backend spend route fallback to Firestore tx:', err);
  }

  // 2. Resilient Firestore atomic transaction fallback
  const docRef = doc(db, 'user_levels', userId);
  const userRef = doc(db, 'users', userId);
  let resultProgression: UserLevelProgression = calculateLevelProgression(coinsSpent, userId, 0);
  let levelUpEvent: LevelUpEvent | undefined;

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(docRef);
      const data = snap.exists() ? snap.data() : {};
      const currentCoins = data.totalQualifyingCoinsSpent || 0;
      const equippedVip = data.equippedVipFrame || 0;
      const equippedSuperVip = data.equippedSuperVipFrame || 0;
      const activeFrameType: ActiveFrameType = data.activeFrameType || 'none';
      const earnedAchievements: EarnedAchievementRecord[] = Array.isArray(data.earnedAchievements)
        ? data.earnedAchievements
        : [];
      const equippedAchievementBadges: string[] = Array.isArray(data.equippedAchievementBadges)
        ? data.equippedAchievementBadges
        : [];

      const newTotalCoins = currentCoins + Math.max(0, Math.floor(coinsSpent));
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
          coinsSpent,
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
