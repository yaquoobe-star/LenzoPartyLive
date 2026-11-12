export type LevelMajorTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface LevelDefinition {
  level: number;
  tier: LevelMajorTier;
  tierRank: string; // e.g., 'Bronze I', 'Bronze II' ... 'Diamond X'
  name: string; // e.g., 'Apprentice Singer', 'Grand Champion'
  requiredCoins: number; // Cumulative coins needed to reach this level
  coinsForThisLevel: number; // Coins needed from previous level to this level
  badgeTheme: {
    shape: 'shield' | 'star' | 'crown' | 'gem' | 'hexagon' | 'flame' | 'crest' | 'diamond';
    primaryColor: string;
    gradient: string;
    borderStyle: string;
    glowEffect: string;
    metallicFinish: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
    romanNumeral: string; // I, II, III, IV, V, VI, VII, VIII, IX, X
    icon: string;
  };
  perks: string[];
}

export interface VipFrameDefinition {
  tier: number; // 1 to 8
  name: string; // e.g., 'VIP 1 - Neon Cyan Ring'
  unlockLevel: number; // 6, 12, 18, 24, 30, 36, 42, 48
  themeColor: string;
  borderGradient: string;
  glowShadow: string;
  animationClass: string;
  decorativeElements: string; // crown, wings, flames, dragon, celestial
  perks: string[];
}

export interface UserLevelProgression {
  userId: string;
  currentLevel: number;
  currentTier: LevelMajorTier;
  totalQualifyingCoinsSpent: number;
  coinsInCurrentLevel: number;
  coinsNeededForNextLevel: number;
  progressPercent: number;
  remainingCoins: number;
  isMaxLevel: boolean;
  unlockedVipTiers: number[];
  equippedVipFrame: number; // 0 for none, 1-8 for VIP frames
  updatedAt: string;
}

export interface LevelUpEvent {
  newLevel: number;
  oldLevel: number;
  newTier: LevelMajorTier;
  badge: LevelDefinition;
  unlockedVipFrame?: VipFrameDefinition;
}
