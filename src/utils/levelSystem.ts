import { UserProfile } from '../types';
import {
  ALL_100_LEVELS,
  TOTAL_LEVELS,
  calculateProgressionState,
  getLevelDefinition,
  getTierConfigForLevel,
  LevelTierId,
} from '../shared/progressionEngine';

export type LevelTier = LevelTierId;

export interface LevelTierDetails {
  tier: LevelTierId;
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
  totalQualifyingCoinsSpent: number;
  tierDetails: LevelTierDetails;
}

export const MAX_LEVEL = TOTAL_LEVELS;

export function getExpNeededForLevel(level: number): number {
  const def = getLevelDefinition(level);
  return def.coinsForThisLevel;
}

export function getCumulativeExpForLevel(level: number): number {
  const safe = Number.isFinite(level) ? Math.floor(level) : 0;
  const bounded = Math.min(MAX_LEVEL, Math.max(0, safe));
  return ALL_100_LEVELS[bounded].cumulativeCoins;
}

export function getLevelTierDetails(level: number): LevelTierDetails {
  const cfg = getTierConfigForLevel(level);
  const iconMap: Record<typeof cfg.insignia, LevelTierDetails['iconName']> = {
    shield: 'shield',
    chevron: 'shield',
    star: 'star',
    prism: 'sparkle',
    diamond: 'gem',
    flame: 'flame',
    leaf: 'sparkle',
    gem: 'gem',
    crown: 'crown',
    imperial: 'crown',
  };

  return {
    tier: cfg.id,
    tierName: `${cfg.displayName} Tier (Lv ${cfg.minLevel}–${cfg.maxLevel})`,
    badgeLabel: cfg.name,
    iconName: iconMap[cfg.insignia],
    badgeGradient: 'from-[#8B20FF] to-[#FA26A0]',
    avatarRing: `ring-2 shadow-lg`,
    textColor: 'text-white',
    glowEffect: `shadow-md`,
    perks: cfg.tierPerks,
  };
}

/**
 * Calculates unified 100-level coin progression for any UserProfile.
 * Uses user.totalQualifyingCoinsSpent if available, or derives baseline from user.level.
 */
export function getUserLevelProgress(user: UserProfile): LevelProgressDetails {
  const baselineCoins =
    typeof user.totalQualifyingCoinsSpent === 'number'
      ? user.totalQualifyingCoinsSpent
      : getCumulativeExpForLevel(Math.max(0, user.level ?? 0)) + Math.max(0, user.currentExp || 0);

  const computed = calculateProgressionState(baselineCoins, {
    userId: user.id,
    activeFrameType: user.activeFrameType,
    equippedVipFrame: user.equippedVipFrame ?? user.vipLevel ?? 0,
    equippedSuperVipFrame: user.equippedSuperVipFrame ?? user.superVipLevel ?? 0,
  });

  return {
    currentLevel: computed.currentLevel,
    currentExp: computed.coinsInCurrentLevel,
    expInCurrentLevel: computed.coinsInCurrentLevel,
    expNeededForNextLevel: computed.coinsForCurrentLevel,
    remainingExp: computed.remainingCoinsNeeded,
    progressPercent: computed.percentage,
    totalQualifyingCoinsSpent: computed.totalQualifyingCoinsSpent,
    tierDetails: getLevelTierDetails(computed.currentLevel),
  };
}
