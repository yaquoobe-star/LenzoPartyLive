import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserLevelProgression, LevelUpEvent } from '../types/levelAndVip';
import {
  calculateLevelProgression,
  getLevelDefinition,
  getVipFrameDefinition,
} from '../utils/levelAndVipConfig';

/**
 * 1. SUBSCRIBE TO USER LEVEL PROGRESSION
 */
export function subscribeUserLevelProgression(
  userId: string,
  initialCoinsSpent: number = 2000000, // Level 42 baseline for QueenSara
  onUpdate: (progression: UserLevelProgression) => void
) {
  const docRef = doc(db, 'user_levels', userId);

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const totalCoins = data.totalQualifyingCoinsSpent ?? initialCoinsSpent;
        const equippedFrame = data.equippedVipFrame ?? 7; // Default VIP 7 for QueenSara
        const prog = calculateLevelProgression(totalCoins, userId, equippedFrame);
        onUpdate(prog);
      } else {
        const initialProg = calculateLevelProgression(initialCoinsSpent, userId, 7);
        setDoc(docRef, {
          userId,
          currentLevel: initialProg.currentLevel,
          currentTier: initialProg.currentTier,
          totalQualifyingCoinsSpent: initialCoinsSpent,
          equippedVipFrame: initialProg.equippedVipFrame,
          unlockedVipTiers: initialProg.unlockedVipTiers,
          updatedAt: serverTimestamp(),
        }, { merge: true }).catch(console.warn);
        onUpdate(initialProg);
      }
    },
    (err) => {
      console.warn('Level progression listener notice:', err);
      onUpdate(calculateLevelProgression(initialCoinsSpent, userId, 7));
    }
  );
}

/**
 * 2. RECORD QUALIFYING GIFT COINS AND CHECK LEVEL UP
 * Only eligible purchased coins spent on gifts contribute to progression!
 */
export async function addQualifyingGiftingCoins(
  userId: string,
  coinsSpent: number
): Promise<{ progression: UserLevelProgression; levelUpEvent?: LevelUpEvent }> {
  const docRef = doc(db, 'user_levels', userId);
  const userRef = doc(db, 'users', userId);

  let resultProgression: UserLevelProgression;
  let levelUpEvent: LevelUpEvent | undefined = undefined;

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(docRef);
      const currentCoins = snap.exists() ? (snap.data().totalQualifyingCoinsSpent || 0) : 2000000;
      const equippedFrame = snap.exists() ? (snap.data().equippedVipFrame || 7) : 7;

      const oldProg = calculateLevelProgression(currentCoins, userId, equippedFrame);
      const newTotalCoins = currentCoins + coinsSpent;
      const newProg = calculateLevelProgression(newTotalCoins, userId, equippedFrame);

      resultProgression = newProg;

      if (newProg.currentLevel > oldProg.currentLevel) {
        // Leveled up!
        const badge = getLevelDefinition(newProg.currentLevel);
        const unlockedVip = newProg.unlockedVipTiers.filter((t) => !oldProg.unlockedVipTiers.includes(t));
        const newlyUnlockedFrame = unlockedVip.length > 0 ? getVipFrameDefinition(unlockedVip[unlockedVip.length - 1]) : undefined;

        levelUpEvent = {
          newLevel: newProg.currentLevel,
          oldLevel: oldProg.currentLevel,
          newTier: newProg.currentTier,
          badge,
          unlockedVipFrame: newlyUnlockedFrame,
        };
      }

      tx.set(
        docRef,
        {
          userId,
          currentLevel: newProg.currentLevel,
          currentTier: newProg.currentTier,
          totalQualifyingCoinsSpent: newTotalCoins,
          equippedVipFrame: newProg.equippedVipFrame,
          unlockedVipTiers: newProg.unlockedVipTiers,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Keep user document synced
      tx.set(
        userRef,
        {
          level: newProg.currentLevel,
          vipLevel: newProg.equippedVipFrame,
          isVIP: newProg.equippedVipFrame > 0,
        },
        { merge: true }
      );
    });

    return { progression: resultProgression!, levelUpEvent };
  } catch (err) {
    console.warn('Level progression update error:', err);
    const fallback = calculateLevelProgression(2000000 + coinsSpent, userId, 7);
    return { progression: fallback };
  }
}

/**
 * 3. EQUIP UNLOCKED VIP FRAME
 */
export async function equipVipFrame(
  userId: string,
  vipTier: number | null
): Promise<{ success: boolean; message?: string; error?: string }> {
  const tierNumber = vipTier ?? 0;
  try {
    const docRef = doc(db, 'user_levels', userId);
    const userRef = doc(db, 'users', userId);

    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const unlocked: number[] = snap.data().unlockedVipTiers || [];
      if (tierNumber !== 0 && !unlocked.includes(tierNumber)) {
        const errorMsg = `VIP ${tierNumber} frame is locked. Reach Level ${tierNumber * 6} to unlock it.`;
        return { success: false, message: errorMsg, error: errorMsg };
      }
    }

    await setDoc(docRef, { equippedVipFrame: tierNumber, updatedAt: serverTimestamp() }, { merge: true });
    await setDoc(userRef, { vipLevel: tierNumber, isVIP: tierNumber > 0 }, { merge: true });

    return { success: true, message: 'VIP Frame equipped successfully' };
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to equip VIP frame';
    return { success: false, message: errorMsg, error: errorMsg };
  }
}
