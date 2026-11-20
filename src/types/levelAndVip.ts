import {
  ActiveFrameType,
  AchievementBadgeDefinition,
  EarnedAchievementRecord,
  EvaluatedAchievementBadge,
  LevelDefinition,
  LevelTierConfig,
  LevelTierId,
  SuperVipTierDefinition,
  VipTierDefinition,
} from '../shared/progressionEngine';

export type {
  ActiveFrameType,
  AchievementBadgeDefinition,
  EarnedAchievementRecord,
  EvaluatedAchievementBadge,
  LevelDefinition,
  LevelTierConfig,
  LevelTierId,
  SuperVipTierDefinition,
  VipTierDefinition,
};

export type LevelTierName = LevelTierId;

export interface VipFrameDefinition extends VipTierDefinition {
  tier: number;
  name: string;
  unlockLevel: number;
  borderColor: string;
  glowColor: string;
  gradientBg: string;
  badgeIcon: string;
  perks: string[];
}

export interface UserLevelProgression {
  userId: string;
  currentLevel: number; // 1..100
  currentTier: LevelTierId;
  currentTierName: string;
  totalQualifyingCoinsSpent: number;
  coinsInCurrentLevel: number;
  coinsNeededForNextLevel: number;
  remainingCoinsNeeded: number;
  percentage: number;
  isMaxLevel: boolean;
  isMaxMastery: boolean;
  highestUnlockedVipTier: number; // 0..12
  unlockedVipTiers: number[];
  highestUnlockedSuperVipTier: number; // 0..6
  unlockedSuperVipTiers: number[];
  activeFrameType: ActiveFrameType;
  equippedVipFrame: number; // 0..12
  equippedSuperVipFrame: number; // 0..6
  earnedAchievements: EarnedAchievementRecord[];
  equippedAchievementBadges: string[]; // max 3
  updatedAt?: string;
}

export interface LevelUpEvent {
  oldLevel: number;
  newLevel: number;
  oldTier: LevelTierId;
  newTier: LevelTierId;
  tierChanged?: boolean;
  coinsSpent?: number;
  badge: LevelDefinition;
  unlockedVipFrame?: VipFrameDefinition;
  unlockedVipFrames?: VipTierDefinition[];
  unlockedSuperVipFrame?: SuperVipTierDefinition;
  unlockedSuperVipFrames?: SuperVipTierDefinition[];
  newlyEarnedAchievements?: AchievementBadgeDefinition[];
}

export interface ProgressionUnlockHistoryEntry {
  id: string;
  userId: string;
  type: 'level_up' | 'tier_up' | 'vip_unlock' | 'super_vip_unlock' | 'achievement_earned' | 'frame_equipped' | 'admin_adjustment';
  title: string;
  detail: string;
  oldLevel?: number;
  newLevel?: number;
  coinsDelta?: number;
  transactionId?: string;
  createdAt: string;
}
