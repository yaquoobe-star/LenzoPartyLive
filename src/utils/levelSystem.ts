import { UserProfile, LevelTier } from '../types';

export interface LevelTierDetails {
  tier: LevelTier;
  tierName: string;
  badgeLabel: string;
  iconName: 'star' | 'shield' | 'crown' | 'sparkle' | 'gem' | 'flame';
  badgeGradient: string;
  avatarRing: string;
  textColor: string;
  glowEffect: string;
  perks: string[];
}

export interface LevelProgressDetails {
  currentLevel: number;
  currentExp: number;
  expInCurrentLevel: number;
  expNeededForNextLevel: number;
  remainingExp: number;
  progressPercent: number;
  tierDetails: LevelTierDetails;
}

export const MAX_LEVEL = 100;

// Configurable level requirements
// Returns the experience required to advance from `level` to `level + 1`
export function getExpNeededForLevel(level: number): number {
  if (level >= MAX_LEVEL) return 0; // Max level reached
  if (level < 1) return 100;
  // Progressively scaled curve for 100 levels
  return Math.round(100 * Math.pow(level, 1.25));
}

// Cumulative EXP required to achieve a given level
export function getCumulativeExpForLevel(level: number): number {
  const boundedLevel = Math.min(MAX_LEVEL, Math.max(1, level));
  let total = 0;
  for (let l = 1; l < boundedLevel; l++) {
    total += getExpNeededForLevel(l);
  }
  return total;
}

// Returns the Tier visual details based on level number (1 to 100)
export function getLevelTierDetails(level: number): LevelTierDetails {
  const boundedLevel = Math.min(MAX_LEVEL, Math.max(1, level));

  if (boundedLevel >= 100) {
    return {
      tier: 'emperor',
      tierName: 'Emperor Supreme (Level 100)',
      badgeLabel: 'Emperor',
      iconName: 'flame',
      badgeGradient: 'from-[#F328D5] via-[#8B20FF] to-[#FFC84A]',
      avatarRing: 'ring-4 ring-[#FFC84A] shadow-[0_0_25px_rgba(255,200,74,0.7)]',
      textColor: 'text-[#FFC84A]',
      glowEffect: 'shadow-[0_0_15px_rgba(243,40,213,0.6)]',
      perks: [
        'Imperial Dragon Entrance Animation',
        'Custom 3D Profile Hologram Border',
        'Global Banner Broadcast on Stream Join',
        'Top Seat Override in Audio Rooms',
      ],
    };
  }
  if (boundedLevel >= 75) {
    return {
      tier: 'diamond',
      tierName: 'Diamond Master',
      badgeLabel: 'Diamond',
      iconName: 'gem',
      badgeGradient: 'from-[#06B6D4] via-[#3B82F6] to-[#8B20FF]',
      avatarRing: 'ring-4 ring-[#06B6D4] shadow-[0_0_20px_rgba(6,182,212,0.6)]',
      textColor: 'text-[#06B6D4]',
      glowEffect: 'shadow-[0_0_12px_rgba(6,182,212,0.5)]',
      perks: [
        'Diamond Sparkle Chat Bubble',
        '20% Coin Bonus on Daily Login',
        'Priority Guest Microphone Access',
        'Diamond Crown Room Badge',
      ],
    };
  }
  if (level >= 50) {
    return {
      tier: 'platinum',
      tierName: 'Platinum Legend',
      badgeLabel: 'Platinum',
      iconName: 'sparkle',
      badgeGradient: 'from-[#8B20FF] via-[#A855F7] to-[#F328D5]',
      avatarRing: 'ring-4 ring-[#A855F7] shadow-[0_0_15px_rgba(139,32,255,0.5)]',
      textColor: 'text-[#C084FC]',
      glowEffect: 'shadow-[0_0_10px_rgba(139,32,255,0.4)]',
      perks: [
        'Platinum Shimmer Entrance',
        'Exclusive Animated Stickers',
        '15% Gift Coin Cash-back',
        'Dedicated VIP Fast-Lane Support',
      ],
    };
  }
  if (level >= 25) {
    return {
      tier: 'gold',
      tierName: 'Gold Champion',
      badgeLabel: 'Gold',
      iconName: 'crown',
      badgeGradient: 'from-[#FFC84A] to-[#D97706]',
      avatarRing: 'ring-3 ring-[#FFC84A] shadow-[0_0_12px_rgba(255,200,74,0.4)]',
      textColor: 'text-[#FFC84A]',
      glowEffect: 'shadow-[0_0_8px_rgba(255,200,74,0.3)]',
      perks: [
        'Golden Crown Profile Badge',
        'Special Sound Effect on Room Entry',
        '10% Bonus Diamonds on Gifts',
        'Gold Badge in Host Chat',
      ],
    };
  }
  if (level >= 10) {
    return {
      tier: 'silver',
      tierName: 'Silver Knight',
      badgeLabel: 'Silver',
      iconName: 'shield',
      badgeGradient: 'from-slate-300 via-slate-400 to-slate-500',
      avatarRing: 'ring-2 ring-slate-300 shadow-[0_0_8px_rgba(203,213,225,0.4)]',
      textColor: 'text-slate-200',
      glowEffect: 'shadow-[0_0_6px_rgba(203,213,225,0.3)]',
      perks: [
        'Silver Shield Nickname Frame',
        'Custom Chat Highlight',
        '5% Gifting Bonus',
      ],
    };
  }
  return {
    tier: 'bronze',
    tierName: 'Bronze Star',
    badgeLabel: 'Bronze',
    iconName: 'star',
    badgeGradient: 'from-amber-600 to-amber-800',
    avatarRing: 'ring-2 ring-amber-700/80',
    textColor: 'text-amber-400',
    glowEffect: 'shadow-[0_0_4px_rgba(180,83,9,0.3)]',
    perks: [
      'Bronze Level Badge',
      'Community Chat Access',
      'Daily Free Gift Drop',
    ],
  };
}

// Calculates complete level progress details for a user profile
export function getUserLevelProgress(user: UserProfile): LevelProgressDetails {
  const level = Math.min(MAX_LEVEL, Math.max(1, user.level || 1));
  const isMax = level >= MAX_LEVEL;
  const neededForCurrentLevel = getExpNeededForLevel(level);

  if (isMax) {
    return {
      currentLevel: MAX_LEVEL,
      currentExp: 0,
      expInCurrentLevel: 0,
      expNeededForNextLevel: 0,
      remainingExp: 0,
      progressPercent: 100,
      tierDetails: getLevelTierDetails(MAX_LEVEL),
    };
  }

  // If user has currentExp, calculate based on it; otherwise calibrate around ~75%
  let expInLevel = user.currentExp ?? Math.round(neededForCurrentLevel * 0.75);
  
  // Guard bounds
  if (expInLevel < 0) expInLevel = 0;
  if (expInLevel > neededForCurrentLevel) expInLevel = neededForCurrentLevel;

  const remaining = Math.max(0, neededForCurrentLevel - expInLevel);
  const percent = Math.min(100, Math.max(0, Math.round((expInLevel / neededForCurrentLevel) * 100)));
  const tierDetails = getLevelTierDetails(level);

  return {
    currentLevel: level,
    currentExp: expInLevel,
    expInCurrentLevel: expInLevel,
    expNeededForNextLevel: neededForCurrentLevel,
    remainingExp: remaining,
    progressPercent: percent,
    tierDetails,
  };
}

// In-memory set of processed transaction IDs to prevent double-counting / fraud
const processedTransactions = new Set<string>();

export interface GiftingProgressionResult {
  updatedUser: UserProfile;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  expGained: number;
  newProgress: LevelProgressDetails;
  giftValueCoins: number;
}

/**
 * Gift-Based Level Progression
 * When a user receives eligible gifts from other users (or when simulated in test mode),
 * validates the gift transaction, adds EXP points (1 coin = 1 EXP),
 * increases level automatically if threshold is reached.
 */
export function processGiftingProgression(
  recipientUser: UserProfile,
  giftValueCoins: number,
  transactionId?: string
): GiftingProgressionResult {
  // Validate duplicate transactions
  if (transactionId) {
    if (processedTransactions.has(transactionId)) {
      // Duplicate transaction rejected
      return {
        updatedUser: recipientUser,
        leveledUp: false,
        oldLevel: recipientUser.level,
        newLevel: recipientUser.level,
        expGained: 0,
        newProgress: getUserLevelProgress(recipientUser),
        giftValueCoins: 0,
      };
    }
    processedTransactions.add(transactionId);
  }

  // Eligible gifting activity contributes to level progression (1 coin = 1 EXP)
  const expGained = Math.max(1, Math.round(giftValueCoins));
  let currentLevel = Math.min(MAX_LEVEL, recipientUser.level);
  let currentExp = (recipientUser.currentExp || 0) + expGained;
  let leveledUp = false;
  const oldLevel = currentLevel;

  // Process potential multi-level jumps if a massive gift is dropped, bounded at MAX_LEVEL (100)
  while (currentLevel < MAX_LEVEL) {
    const expNeeded = getExpNeededForLevel(currentLevel);
    if (currentExp >= expNeeded) {
      currentExp -= expNeeded;
      currentLevel += 1;
      leveledUp = true;
    } else {
      break;
    }
  }

  if (currentLevel >= MAX_LEVEL) {
    currentLevel = MAX_LEVEL;
    currentExp = 0;
  }

  const updatedUser: UserProfile = {
    ...recipientUser,
    level: currentLevel,
    currentExp,
    nextLevelExp: getExpNeededForLevel(currentLevel),
    totalGiftsReceived: (recipientUser.totalGiftsReceived || 0) + 1,
    totalGiftsValue: (recipientUser.totalGiftsValue || 0) + giftValueCoins,
    diamonds: (recipientUser.diamonds || 0) + Math.round(giftValueCoins * 0.5), // 50% diamonds earnings
  };

  const newProgress = getUserLevelProgress(updatedUser);

  return {
    updatedUser,
    leveledUp,
    oldLevel,
    newLevel: currentLevel,
    expGained,
    newProgress,
    giftValueCoins,
  };
}
