import {
  ALL_100_LEVELS,
  ACHIEVEMENT_BADGE_DEFINITIONS,
  ActiveFrameType,
  EarnedAchievementRecord,
  LEVEL_TIER_CONFIGS,
  SUPER_VIP_TIER_DEFINITIONS,
  TOTAL_LEVELS,
  TOTAL_PROGRESSION_COINS_EXACT,
  LEVELS_1_TO_50_EXACT_TOTAL,
  LEVELS_51_TO_100_EXACT_TOTAL,
  VIP_TIER_DEFINITIONS,
  calculateProgressionState,
  detectMilestoneUnlocks,
  evaluateAchievementBadges,
  formatCoinsCompact,
  getLevelDefinition,
  getProgressionMathAudit,
  getSuperVipTierDefinition,
  getTierConfigForLevel,
  getUnlockedSuperVipTiersForLevel,
  getUnlockedVipTiersForLevel,
  getVipTierDefinition,
} from '../shared/progressionEngine';
import { UserLevelProgression, VipFrameDefinition } from '../types/levelAndVip';

export {
  ALL_100_LEVELS,
  ACHIEVEMENT_BADGE_DEFINITIONS,
  LEVEL_TIER_CONFIGS,
  SUPER_VIP_TIER_DEFINITIONS,
  VIP_TIER_DEFINITIONS,
  TOTAL_LEVELS,
  TOTAL_PROGRESSION_COINS_EXACT,
  LEVELS_1_TO_50_EXACT_TOTAL,
  LEVELS_51_TO_100_EXACT_TOTAL,
  detectMilestoneUnlocks,
  evaluateAchievementBadges,
  formatCoinsCompact,
  getLevelDefinition,
  getProgressionMathAudit,
  getSuperVipTierDefinition,
  getTierConfigForLevel,
  getUnlockedSuperVipTiersForLevel,
  getUnlockedVipTiersForLevel,
  getVipTierDefinition,
};

/**
 * 100 Level definitions alias for backward compatibility across existing imports.
 */
export const LEVEL_DEFINITIONS = ALL_100_LEVELS;

/**
 * 12 VIP Frame definitions mapped with legacy display helpers so all existing consumers stay compatible.
 */
export const VIP_FRAME_DEFINITIONS: VipFrameDefinition[] = VIP_TIER_DEFINITIONS.map((v) => ({
  ...v,
  borderColor: v.primaryColor,
  glowColor: v.glowColor,
  gradientBg: v.gradientCss,
  badgeIcon: v.code,
}));

export function getVipFrameDefinition(tier: number): VipFrameDefinition | undefined {
  return VIP_FRAME_DEFINITIONS.find((f) => f.tier === tier);
}

/**
 * Computes full UserLevelProgression from total qualifying coins spent using the exact 1,333,333,333 coin chart.
 */
export function calculateLevelProgression(
  totalQualifyingCoinsSpent: number,
  userId: string = '',
  equippedVipFrame: number = 0,
  options?: {
    activeFrameType?: ActiveFrameType;
    equippedSuperVipFrame?: number;
    earnedAchievements?: EarnedAchievementRecord[];
    equippedAchievementBadges?: string[];
  }
): UserLevelProgression {
  const computed = calculateProgressionState(totalQualifyingCoinsSpent, {
    userId,
    activeFrameType: options?.activeFrameType,
    equippedVipFrame,
    equippedSuperVipFrame: options?.equippedSuperVipFrame ?? 0,
    equippedAchievementBadges: options?.equippedAchievementBadges ?? [],
  });

  return {
    userId,
    currentLevel: computed.currentLevel,
    currentTier: computed.currentTierId,
    currentTierName: computed.currentTierName,
    totalQualifyingCoinsSpent: computed.totalQualifyingCoinsSpent,
    coinsInCurrentLevel: computed.coinsInCurrentLevel,
    coinsNeededForNextLevel: computed.coinsForCurrentLevel,
    remainingCoinsNeeded: computed.remainingCoinsNeeded,
    percentage: computed.percentage,
    isMaxLevel: computed.isMaxLevel,
    isMaxMastery: computed.isMaxMastery,
    highestUnlockedVipTier: computed.highestUnlockedVipTier,
    unlockedVipTiers: computed.unlockedVipTiers,
    highestUnlockedSuperVipTier: computed.highestUnlockedSuperVipTier,
    unlockedSuperVipTiers: computed.unlockedSuperVipTiers,
    activeFrameType: computed.activeFrameType,
    equippedVipFrame: computed.equippedVipFrame,
    equippedSuperVipFrame: computed.equippedSuperVipFrame,
    earnedAchievements: options?.earnedAchievements ?? [],
    equippedAchievementBadges: computed.equippedAchievementBadges,
  };
}
