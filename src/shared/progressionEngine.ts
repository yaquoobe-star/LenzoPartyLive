/**
 * LENZO PARTY LIVE — AUTHORITATIVE 100-LEVEL, 12-VIP, 6-SUPER-VIP & ACHIEVEMENT ENGINE
 * Shared pure TypeScript module imported by BOTH Express backend (server.ts) and React client.
 *
 * Exact Mathematical Specification:
 * - Total levels: 100
 * - 10 Tiers (every 10 levels): Bronze, Silver, Gold, Platinum, Diamond, Ruby, Emerald, Sapphire, Crown, Royal
 * - Levels 1–50 exact total:    600,000,000 coins (Lv 1 = 1,000,000; Lv 50 = 23,000,000)
 * - Levels 51–100 exact total: 1,400,000,000 coins (Lv 51 = 23,200,000; Lv 100 = 32,800,000)
 * - Grand total (Lv 1–100):    2,000,000,000 coins EXACT
 * - 12 VIP Tiers: every 8 levels (Lv 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96)
 * - 6 Super VIP Tiers: every 12 levels (Lv 12, 24, 36, 48, 60, 72 — remains highest through Lv 100)
 * - 10 Independent Achievement Badges with unique shapes, artwork keys, and criteria
 */

export type LevelTierId =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'ruby'
  | 'emerald'
  | 'sapphire'
  | 'crown'
  | 'royal';

export type ActiveFrameType = 'none' | 'vip' | 'super_vip';

export interface LevelTierConfig {
  id: LevelTierId;
  name: string; // e.g., 'BRONZE', 'SILVER', ..., 'ROYAL'
  displayName: string; // e.g., 'Bronze', 'Silver', ..., 'Royal'
  minLevel: number;
  maxLevel: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  gradientCss: string;
  borderHex: string;
  glowRgba: string;
  textColorHex: string;
  insignia: 'shield' | 'chevron' | 'star' | 'prism' | 'diamond' | 'flame' | 'leaf' | 'gem' | 'crown' | 'imperial';
  visualEffect: 'metallic' | 'brushed' | 'shimmer' | 'hologram' | 'crystalline' | 'ember' | 'aurora' | 'celestial' | 'radiant' | 'imperial_aura';
  tierPerks: string[];
}

export interface LevelDefinition {
  level: number;
  tierId: LevelTierId;
  tierName: string;
  subRank: string; // Roman I..X within the 10-level tier
  title: string;
  coinsForThisLevel: number; // Exact individual cost of Level N
  cumulativeStart: number; // Cumulative coins at the start of Level N
  cumulativeCoins: number; // Exact cumulative total through Level N
  colorHex: string;
  secondaryHex: string;
  gradientCss: string;
  glowRgba: string;
  insignia: LevelTierConfig['insignia'];
  vipUnlockTier?: number; // 1..12 if this level unlocks a VIP tier
  superVipUnlockTier?: number; // 1..6 if this level unlocks a Super VIP tier
  perks: string[];
}

export interface VipTierDefinition {
  tier: number; // 1..12
  code: string; // 'VIP 1' .. 'VIP 12'
  name: string;
  frameName: string;
  unlockLevel: number; // 8, 16, 24, ..., 96
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  gradientCss: string;
  glowColor: string;
  animationStyle: 'subtle' | 'shimmer' | 'pulse' | 'orbit' | 'prism' | 'legendary';
  perks: string[];
}

export interface SuperVipTierDefinition {
  tier: number; // 1..6
  code: string; // 'SUPER VIP 1' .. 'SUPER VIP 6'
  name: string;
  frameName: string;
  themeKey:
    | 'royal_purple_energy'
    | 'electric_blue_crystal'
    | 'red_inferno'
    | 'emerald_royal'
    | 'diamond_aurora'
    | 'legendary_cosmic_gold';
  unlockLevel: number; // 12, 24, 36, 48, 60, 72
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  gradientCss: string;
  glowColor: string;
  particleColor: string;
  perks: string[];
}

export type AchievementShape =
  | 'hex'
  | 'diamond'
  | 'shield'
  | 'bolt'
  | 'crown'
  | 'heart'
  | 'star'
  | 'crest'
  | 'trophy'
  | 'sunburst';

export type AchievementIconKey =
  | 'gift'
  | 'gem'
  | 'flame'
  | 'zap'
  | 'crown'
  | 'heart'
  | 'sparkles'
  | 'shield'
  | 'trophy'
  | 'award';

export interface AchievementBadgeDefinition {
  id: string;
  name: string;
  category: 'gifting' | 'hosting' | 'activity' | 'social' | 'events' | 'creator';
  rarity: 'rare' | 'epic' | 'legendary' | 'mythic';
  description: string;
  unlockConditionText: string;
  shape: AchievementShape;
  iconKey: AchievementIconKey;
  accentFrom: string;
  accentTo: string;
  borderHex: string;
  metricKey:
    | 'coinsSpent'
    | 'diamondsEarned'
    | 'sessionsAndVideos'
    | 'loginStreakDays'
    | 'giftsSentCount'
    | 'followersOrLikes'
    | 'profileAndUploads'
    | 'agencyAndFollowing'
    | 'pkWinsOrEvents'
    | 'legendaryScore';
  targetValue: number;
}

export interface EarnedAchievementRecord {
  badgeId: string;
  earnedAt: string;
  source?: string;
}

export interface UserActivityMetrics {
  totalQualifyingCoinsSpent: number;
  diamondsEarned: number;
  publicVideosCount: number;
  liveSessionsHosted: number;
  loginStreakDays: number;
  giftsSentCount: number;
  followersCount: number;
  followingCount: number;
  totalLikesCount: number;
  hasAgency: boolean;
  pkWinsCount: number;
  eventsWonCount: number;
  profileCompletedSteps: number;
}

export interface EvaluatedAchievementBadge extends AchievementBadgeDefinition {
  isEarned: boolean;
  isEquipped: boolean;
  earnedAt?: string;
  progressCurrent: number;
  progressTarget: number;
  progressPercent: number;
}

export interface ComputedProgressionState {
  userId: string;
  currentLevel: number; // 1..100
  currentTierId: LevelTierId;
  currentTierName: string;
  currentLevelDef: LevelDefinition;
  nextLevelDef: LevelDefinition | null;
  totalQualifyingCoinsSpent: number;
  coinsInCurrentLevel: number;
  coinsForCurrentLevel: number;
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
  equippedAchievementBadges: string[]; // max 3
}

export interface MilestoneUnlockDiff {
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
  crossedLevels: number[];
  tierChanged: boolean;
  oldTierId: LevelTierId;
  newTierId: LevelTierId;
  newlyUnlockedVipTiers: number[];
  newlyUnlockedSuperVipTiers: number[];
  newlyUnlockedVipFrames: VipTierDefinition[];
  newlyUnlockedSuperVipFrames: SuperVipTierDefinition[];
}

export const MIN_LEVEL = 0;
export const TOTAL_LEVELS = 100; // Maximum reachable level (0..100 = 101 total levels)
export const TOTAL_LEVEL_COUNT = 101;
export const LEVELS_1_TO_50_EXACT_TOTAL = 600_000_000;
export const LEVELS_51_TO_100_EXACT_TOTAL = 1_400_000_000;
export const TOTAL_PROGRESSION_COINS_EXACT = 2_000_000_000;
export const MAX_EQUIPPED_ACHIEVEMENT_BADGES = 3;

const ROMAN_SUBRANKS = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export const LEVEL_TIER_CONFIGS: LevelTierConfig[] = [
  {
    id: 'bronze',
    name: 'BRONZE',
    displayName: 'Bronze',
    minLevel: 0,
    maxLevel: 9,
    primaryColor: '#CD7F32',
    secondaryColor: '#8C4A19',
    accentColor: '#F3B87A',
    gradientCss: 'linear-gradient(135deg, #E29B52 0%, #B46024 55%, #6B3210 100%)',
    borderHex: '#E5A362',
    glowRgba: 'rgba(205, 127, 50, 0.35)',
    textColorHex: '#F7C998',
    insignia: 'shield',
    visualEffect: 'metallic',
    tierPerks: [
      'Bronze Metallic Insignia on Profile & Rooms',
      'Room Chat Level Tag Highlight',
      'Eligible for VIP 1 Frame at Level 8',
    ],
  },
  {
    id: 'silver',
    name: 'SILVER',
    displayName: 'Silver',
    minLevel: 10,
    maxLevel: 19,
    primaryColor: '#CBD5E1',
    secondaryColor: '#64748B',
    accentColor: '#F8FAFC',
    gradientCss: 'linear-gradient(135deg, #F1F5F9 0%, #94A3B8 55%, #475569 100%)',
    borderHex: '#E2E8F0',
    glowRgba: 'rgba(203, 213, 225, 0.42)',
    textColorHex: '#F1F5F9',
    insignia: 'chevron',
    visualEffect: 'brushed',
    tierPerks: [
      'Brushed Silver Crest Insignia',
      'Unlocks Super VIP 1 at Level 12 & VIP 2 at Level 16',
      'Silver Entrance Sparkle in Audio Party Rooms',
    ],
  },
  {
    id: 'gold',
    name: 'GOLD',
    displayName: 'Gold',
    minLevel: 20,
    maxLevel: 29,
    primaryColor: '#FBBF24',
    secondaryColor: '#B45309',
    accentColor: '#FEF08A',
    gradientCss: 'linear-gradient(135deg, #FDE047 0%, #F59E0B 52%, #B45309 100%)',
    borderHex: '#FDE047',
    glowRgba: 'rgba(251, 191, 36, 0.48)',
    textColorHex: '#FEF08A',
    insignia: 'star',
    visualEffect: 'shimmer',
    tierPerks: [
      '24K Golden Star Insignia with Shimmer',
      'Unlocks VIP 3 & Super VIP 2 Dual Milestone at Level 24',
      'Golden Room Entry Callout Banner',
    ],
  },
  {
    id: 'platinum',
    name: 'PLATINUM',
    displayName: 'Platinum',
    minLevel: 30,
    maxLevel: 39,
    primaryColor: '#A78BFA',
    secondaryColor: '#4F46E5',
    accentColor: '#E0E7FF',
    gradientCss: 'linear-gradient(135deg, #E0E7FF 0%, #A78BFA 45%, #4F46E5 100%)',
    borderHex: '#C4B5FD',
    glowRgba: 'rgba(167, 139, 250, 0.5)',
    textColorHex: '#EDE9FE',
    insignia: 'prism',
    visualEffect: 'hologram',
    tierPerks: [
      'Platinum Prism Holographic Badge',
      'Unlocks VIP 4 (Lv 32), Super VIP 3 (Lv 36) & VIP 5 (Lv 40)',
      'Priority Guest Seat Queue in Live & Party Rooms',
    ],
  },
  {
    id: 'diamond',
    name: 'DIAMOND',
    displayName: 'Diamond',
    minLevel: 40,
    maxLevel: 49,
    primaryColor: '#22D3EE',
    secondaryColor: '#2563EB',
    accentColor: '#CFFAFE',
    gradientCss: 'linear-gradient(135deg, #A5F3FC 0%, #06B6D4 48%, #1D4ED8 100%)',
    borderHex: '#67E8F9',
    glowRgba: 'rgba(34, 211, 238, 0.55)',
    textColorHex: '#CFFAFE',
    insignia: 'diamond',
    visualEffect: 'crystalline',
    tierPerks: [
      'Faceted Diamond Crystal Emblem',
      'Unlocks VIP 6 & Super VIP 4 Dual Milestone at Level 48',
      'Crystalline Aura in Top Broadcaster Rankings',
    ],
  },
  {
    id: 'ruby',
    name: 'RUBY',
    displayName: 'Ruby',
    minLevel: 50,
    maxLevel: 59,
    primaryColor: '#F43F5E',
    secondaryColor: '#9F1239',
    accentColor: '#FECDD3',
    gradientCss: 'linear-gradient(135deg, #FDA4AF 0%, #E11D48 48%, #881337 100%)',
    borderHex: '#FB7185',
    glowRgba: 'rgba(244, 63, 94, 0.55)',
    textColorHex: '#FFE4E6',
    insignia: 'flame',
    visualEffect: 'ember',
    tierPerks: [
      'Crimson Ruby Flame Emblem (Elite Halfway Tier)',
      'Unlocks VIP 7 (Lv 56) & Super VIP 5 Diamond Aurora (Lv 60)',
      'Ruby Spotlight Entrance Across All Streams',
    ],
  },
  {
    id: 'emerald',
    name: 'EMERALD',
    displayName: 'Emerald',
    minLevel: 60,
    maxLevel: 69,
    primaryColor: '#10B981',
    secondaryColor: '#065F46',
    accentColor: '#A7F3D0',
    gradientCss: 'linear-gradient(135deg, #6EE7B7 0%, #10B981 48%, #064E3B 100%)',
    borderHex: '#34D399',
    glowRgba: 'rgba(16, 185, 129, 0.55)',
    textColorHex: '#D1FAE5',
    insignia: 'leaf',
    visualEffect: 'aurora',
    tierPerks: [
      'Imperial Emerald Crest with Aurora Sheen',
      'Unlocks VIP 8 Sapphire Frame at Level 64',
      'Dedicated VIP Lounge Badge & Priority Support',
    ],
  },
  {
    id: 'sapphire',
    name: 'SAPPHIRE',
    displayName: 'Sapphire',
    minLevel: 70,
    maxLevel: 79,
    primaryColor: '#3B82F6',
    secondaryColor: '#1E3A8A',
    accentColor: '#BFDBFE',
    gradientCss: 'linear-gradient(135deg, #93C5FD 0%, #2563EB 48%, #172554 100%)',
    borderHex: '#60A5FA',
    glowRgba: 'rgba(59, 130, 246, 0.6)',
    textColorHex: '#DBEAFE',
    insignia: 'gem',
    visualEffect: 'celestial',
    tierPerks: [
      'Deep Celestial Sapphire Jewel Emblem',
      'Unlocks VIP 9 & Ultimate Super VIP 6 Cosmic Gold at Level 72, VIP 10 at Level 80',
      'Celestial Entrance Wave on Stream Join',
    ],
  },
  {
    id: 'crown',
    name: 'CROWN',
    displayName: 'Crown',
    minLevel: 80,
    maxLevel: 89,
    primaryColor: '#F59E0B',
    secondaryColor: '#9333EA',
    accentColor: '#FDE68A',
    gradientCss: 'linear-gradient(135deg, #FDE047 0%, #F59E0B 40%, #9333EA 100%)',
    borderHex: '#FBBF24',
    glowRgba: 'rgba(245, 158, 11, 0.65)',
    textColorHex: '#FEF3C7',
    insignia: 'crown',
    visualEffect: 'radiant',
    tierPerks: [
      'Sovereign Crown Radiant Emblem',
      'Unlocks VIP 11 Luxury Animated Frame at Level 88',
      'Global Sovereign Banner on High-Value Gifts',
    ],
  },
  {
    id: 'royal',
    name: 'ROYAL',
    displayName: 'Royal',
    minLevel: 90,
    maxLevel: 100,
    primaryColor: '#FA26A0',
    secondaryColor: '#7C3AED',
    accentColor: '#FFC84A',
    gradientCss: 'linear-gradient(135deg, #FFC84A 0%, #FA26A0 48%, #7C3AED 100%)',
    borderHex: '#FFC84A',
    glowRgba: 'rgba(255, 200, 74, 0.72)',
    textColorHex: '#FFF7D6',
    insignia: 'imperial',
    visualEffect: 'imperial_aura',
    tierPerks: [
      'Supreme Lenzo Royal Imperial Insignia (Lv 91–100)',
      'Unlocks VIP 12 Ultimate Legendary Frame at Level 96',
      'Permanent Hall of Royalty Distinction & Cosmic Entrance',
    ],
  },
];

export const VIP_TIER_DEFINITIONS: VipTierDefinition[] = [
  {
    tier: 1,
    code: 'VIP 1',
    name: 'Bronze VIP',
    frameName: 'Bronze Premium Frame',
    unlockLevel: 8,
    primaryColor: '#CD7F32',
    secondaryColor: '#7C3E12',
    accentColor: '#F6C690',
    gradientCss: 'linear-gradient(135deg, #E39F58, #B56225, #7C3E12)',
    glowColor: 'rgba(205, 127, 50, 0.55)',
    animationStyle: 'subtle',
    perks: ['Bronze Premium Avatar Frame', 'VIP 1 Profile Crest', 'Priority Chat Highlight'],
  },
  {
    tier: 2,
    code: 'VIP 2',
    name: 'Silver VIP',
    frameName: 'Silver Metallic Frame',
    unlockLevel: 16,
    primaryColor: '#CBD5E1',
    secondaryColor: '#475569',
    accentColor: '#F8FAFC',
    gradientCss: 'linear-gradient(135deg, #F8FAFC, #94A3B8, #475569)',
    glowColor: 'rgba(203, 213, 225, 0.55)',
    animationStyle: 'subtle',
    perks: ['Silver Metallic Avatar Frame', 'VIP 2 Profile Crest', 'Silver Room Entry Tag'],
  },
  {
    tier: 3,
    code: 'VIP 3',
    name: 'Golden VIP',
    frameName: 'Golden Animated Frame',
    unlockLevel: 24,
    primaryColor: '#FBBF24',
    secondaryColor: '#B45309',
    accentColor: '#FEF08A',
    gradientCss: 'linear-gradient(135deg, #FEF08A, #F59E0B, #B45309)',
    glowColor: 'rgba(251, 191, 36, 0.65)',
    animationStyle: 'shimmer',
    perks: ['Golden Animated Avatar Frame', 'Golden Shimmer Chat Bubble', 'VIP Seat Priority'],
  },
  {
    tier: 4,
    code: 'VIP 4',
    name: 'Platinum VIP',
    frameName: 'Platinum Frame',
    unlockLevel: 32,
    primaryColor: '#A78BFA',
    secondaryColor: '#4338CA',
    accentColor: '#EDE9FE',
    gradientCss: 'linear-gradient(135deg, #EDE9FE, #A78BFA, #4338CA)',
    glowColor: 'rgba(167, 139, 250, 0.65)',
    animationStyle: 'shimmer',
    perks: ['Platinum Mirror Avatar Frame', 'Holographic Profile Shine', 'Custom Gift Combo Trail'],
  },
  {
    tier: 5,
    code: 'VIP 5',
    name: 'Diamond VIP',
    frameName: 'Diamond Frame',
    unlockLevel: 40,
    primaryColor: '#22D3EE',
    secondaryColor: '#1D4ED8',
    accentColor: '#CFFAFE',
    gradientCss: 'linear-gradient(135deg, #CFFAFE, #06B6D4, #1D4ED8)',
    glowColor: 'rgba(34, 211, 238, 0.7)',
    animationStyle: 'pulse',
    perks: ['Diamond Facet Avatar Frame', 'Diamond Sparkle Room Entry', 'Anti-Kick Room Shield'],
  },
  {
    tier: 6,
    code: 'VIP 6',
    name: 'Ruby VIP',
    frameName: 'Ruby Frame',
    unlockLevel: 48,
    primaryColor: '#F43F5E',
    secondaryColor: '#881337',
    accentColor: '#FECDD3',
    gradientCss: 'linear-gradient(135deg, #FDA4AF, #E11D48, #881337)',
    glowColor: 'rgba(244, 63, 94, 0.72)',
    animationStyle: 'pulse',
    perks: ['Crimson Ruby Avatar Frame', 'Ruby Flare Stream Notice', 'VIP Host Invite Priority'],
  },
  {
    tier: 7,
    code: 'VIP 7',
    name: 'Emerald VIP',
    frameName: 'Emerald Frame',
    unlockLevel: 56,
    primaryColor: '#10B981',
    secondaryColor: '#064E3B',
    accentColor: '#A7F3D0',
    gradientCss: 'linear-gradient(135deg, #6EE7B7, #10B981, #064E3B)',
    glowColor: 'rgba(16, 185, 129, 0.72)',
    animationStyle: 'orbit',
    perks: ['Emerald Jewel Avatar Frame', 'Emerald Aura on Rankings', 'Exclusive VIP Support Lane'],
  },
  {
    tier: 8,
    code: 'VIP 8',
    name: 'Sapphire VIP',
    frameName: 'Sapphire Frame',
    unlockLevel: 64,
    primaryColor: '#3B82F6',
    secondaryColor: '#1E3A8A',
    accentColor: '#BFDBFE',
    gradientCss: 'linear-gradient(135deg, #93C5FD, #2563EB, #1E3A8A)',
    glowColor: 'rgba(59, 130, 246, 0.75)',
    animationStyle: 'orbit',
    perks: ['Sapphire Royal Avatar Frame', 'Celestial Blue Entrance Wave', 'Featured Viewer Tag'],
  },
  {
    tier: 9,
    code: 'VIP 9',
    name: 'Crown VIP',
    frameName: 'Crown Frame',
    unlockLevel: 72,
    primaryColor: '#F59E0B',
    secondaryColor: '#7C3AED',
    accentColor: '#FEF08A',
    gradientCss: 'linear-gradient(135deg, #FEF08A, #F59E0B, #7C3AED)',
    glowColor: 'rgba(245, 158, 11, 0.78)',
    animationStyle: 'prism',
    perks: ['Sovereign Crown Avatar Frame', 'Golden Crown Chat Prefix', 'Top Audience List Pin'],
  },
  {
    tier: 10,
    code: 'VIP 10',
    name: 'Royal Gold VIP',
    frameName: 'Royal Gold Frame',
    unlockLevel: 80,
    primaryColor: '#FFC84A',
    secondaryColor: '#92400E',
    accentColor: '#FFFBEB',
    gradientCss: 'linear-gradient(135deg, #FFFBEB, #FFC84A, #B45309)',
    glowColor: 'rgba(255, 200, 74, 0.82)',
    animationStyle: 'prism',
    perks: ['Royal Gold Embossed Frame', 'Royal Gold Entrance Spotlight', 'VIP Concierge Perks'],
  },
  {
    tier: 11,
    code: 'VIP 11',
    name: 'Luxury VIP',
    frameName: 'Luxury Animated Frame',
    unlockLevel: 88,
    primaryColor: '#EC4899',
    secondaryColor: '#7C3AED',
    accentColor: '#FFC84A',
    gradientCss: 'linear-gradient(135deg, #FFC84A, #EC4899, #7C3AED)',
    glowColor: 'rgba(236, 72, 153, 0.85)',
    animationStyle: 'legendary',
    perks: ['Luxury Animated Prism Frame', 'Global Room Announcement', 'Exclusive Luxury Gift Aura'],
  },
  {
    tier: 12,
    code: 'VIP 12',
    name: 'Ultimate Legendary VIP',
    frameName: 'Ultimate Legendary Frame',
    unlockLevel: 96,
    primaryColor: '#FFC84A',
    secondaryColor: '#FA26A0',
    accentColor: '#38BDF8',
    gradientCss: 'linear-gradient(135deg, #FFC84A, #FA26A0, #8B20FF, #38BDF8)',
    glowColor: 'rgba(255, 200, 74, 0.92)',
    animationStyle: 'legendary',
    perks: ['Ultimate Legendary Multi-Ring Frame', 'Hall of Legends Profile Distinction', 'Supreme VIP Entrance Showcase'],
  },
];

export const SUPER_VIP_TIER_DEFINITIONS: SuperVipTierDefinition[] = [
  {
    tier: 1,
    code: 'SUPER VIP 1',
    name: 'Royal Purple Energy',
    frameName: 'Royal Purple Energy Frame',
    themeKey: 'royal_purple_energy',
    unlockLevel: 12,
    primaryColor: '#9333EA',
    secondaryColor: '#4C1D95',
    accentColor: '#E879F9',
    gradientCss: 'linear-gradient(135deg, #F0ABFC 0%, #9333EA 50%, #3B0764 100%)',
    glowColor: 'rgba(168, 85, 247, 0.78)',
    particleColor: '#E879F9',
    perks: [
      'Royal Purple Energy Animated Frame',
      'Super VIP 1 Separate Profile Crest',
      'Violet Energy Pulse in Audio & Live Rooms',
    ],
  },
  {
    tier: 2,
    code: 'SUPER VIP 2',
    name: 'Electric Blue Crystal',
    frameName: 'Electric Blue Crystal Frame',
    themeKey: 'electric_blue_crystal',
    unlockLevel: 24,
    primaryColor: '#0EA5E9',
    secondaryColor: '#1E3A8A',
    accentColor: '#7DD3FC',
    gradientCss: 'linear-gradient(135deg, #BAE6FD 0%, #0EA5E9 50%, #1E3A8A 100%)',
    glowColor: 'rgba(14, 165, 233, 0.82)',
    particleColor: '#38BDF8',
    perks: [
      'Electric Blue Crystal Animated Frame',
      'Super VIP 2 Crystal Shard Crest',
      'Electric Crystal Entrance Flash',
    ],
  },
  {
    tier: 3,
    code: 'SUPER VIP 3',
    name: 'Red Inferno',
    frameName: 'Red Inferno Frame',
    themeKey: 'red_inferno',
    unlockLevel: 36,
    primaryColor: '#EF4444',
    secondaryColor: '#7F1D1D',
    accentColor: '#FDBA74',
    gradientCss: 'linear-gradient(135deg, #FDBA74 0%, #EF4444 50%, #7F1D1D 100%)',
    glowColor: 'rgba(239, 68, 68, 0.85)',
    particleColor: '#FB923C',
    perks: [
      'Red Inferno Flame Animated Frame',
      'Super VIP 3 Ember Crest',
      'Inferno Spark Trail on Live Gifts',
    ],
  },
  {
    tier: 4,
    code: 'SUPER VIP 4',
    name: 'Emerald Royal',
    frameName: 'Emerald Royal Frame',
    themeKey: 'emerald_royal',
    unlockLevel: 48,
    primaryColor: '#10B981',
    secondaryColor: '#064E3B',
    accentColor: '#FDE047',
    gradientCss: 'linear-gradient(135deg, #A7F3D0 0%, #10B981 52%, #065F46 100%)',
    glowColor: 'rgba(16, 185, 129, 0.85)',
    particleColor: '#34D399',
    perks: [
      'Emerald Royal Crown Animated Frame',
      'Super VIP 4 Sovereign Emerald Crest',
      'Royal Emerald Entrance Banner',
    ],
  },
  {
    tier: 5,
    code: 'SUPER VIP 5',
    name: 'Diamond Aurora',
    frameName: 'Diamond Aurora Frame',
    themeKey: 'diamond_aurora',
    unlockLevel: 60,
    primaryColor: '#22D3EE',
    secondaryColor: '#8B5CF6',
    accentColor: '#F472B6',
    gradientCss: 'linear-gradient(135deg, #A5F3FC 0%, #22D3EE 35%, #8B5CF6 70%, #F472B6 100%)',
    glowColor: 'rgba(34, 211, 238, 0.88)',
    particleColor: '#A5F3FC',
    perks: [
      'Diamond Aurora Prismatic Animated Frame',
      'Super VIP 5 Aurora Prism Crest',
      'Aurora Borealis Entrance Effect',
    ],
  },
  {
    tier: 6,
    code: 'SUPER VIP 6',
    name: 'Legendary Cosmic Gold',
    frameName: 'Legendary Cosmic Gold Frame',
    themeKey: 'legendary_cosmic_gold',
    unlockLevel: 72,
    primaryColor: '#FFC84A',
    secondaryColor: '#9333EA',
    accentColor: '#FFF7D6',
    gradientCss: 'linear-gradient(135deg, #FFF7D6 0%, #FFC84A 38%, #FA26A0 72%, #7C3AED 100%)',
    glowColor: 'rgba(255, 200, 74, 0.95)',
    particleColor: '#FFC84A',
    perks: [
      'Legendary Cosmic Gold Animated Frame (Max Super VIP through Lv 100)',
      'Super VIP 6 Cosmic Sovereign Crest',
      'Supreme Cosmic Gold Room & Stream Entrance',
    ],
  },
];

export const ACHIEVEMENT_BADGE_DEFINITIONS: AchievementBadgeDefinition[] = [
  {
    id: 'contributor',
    name: 'Contributor',
    category: 'gifting',
    rarity: 'rare',
    description: 'Generous community supporter who actively sends virtual gifts across live streams and party rooms.',
    unlockConditionText: 'Spend 1,000,000 qualifying coins on gifts',
    shape: 'hex',
    iconKey: 'gift',
    accentFrom: '#38BDF8',
    accentTo: '#6366F1',
    borderHex: '#7DD3FC',
    metricKey: 'coinsSpent',
    targetValue: 1_000_000,
  },
  {
    id: 'diamond_host',
    name: 'Diamond Host',
    category: 'hosting',
    rarity: 'epic',
    description: 'Recognizes talented hosts who earn 1,000+ Diamonds from audience appreciation.',
    unlockConditionText: 'Earn 1,000 Diamonds from live & party gifts',
    shape: 'diamond',
    iconKey: 'gem',
    accentFrom: '#06B6D4',
    accentTo: '#2563EB',
    borderHex: '#67E8F9',
    metricKey: 'diamondsEarned',
    targetValue: 1_000,
  },
  {
    id: 'marathoner',
    name: 'Marathoner',
    category: 'activity',
    rarity: 'rare',
    description: 'Dedicated broadcaster and video creator who shows up consistently for the community.',
    unlockConditionText: 'Host 5 live sessions or publish 5 public videos',
    shape: 'shield',
    iconKey: 'flame',
    accentFrom: '#F59E0B',
    accentTo: '#EF4444',
    borderHex: '#FDBA74',
    metricKey: 'sessionsAndVideos',
    targetValue: 5,
  },
  {
    id: 'streak_pro',
    name: 'Streak Pro',
    category: 'activity',
    rarity: 'rare',
    description: 'Maintains a consistent daily presence on Lenzo Party Live.',
    unlockConditionText: 'Reach a 7-day active login streak',
    shape: 'bolt',
    iconKey: 'zap',
    accentFrom: '#10B981',
    accentTo: '#06B6D4',
    borderHex: '#6EE7B7',
    metricKey: 'loginStreakDays',
    targetValue: 7,
  },
  {
    id: 'top_gifter',
    name: 'Top Gifter',
    category: 'gifting',
    rarity: 'legendary',
    description: 'Elite patron celebrated for showering hosts with grand gifts.',
    unlockConditionText: 'Send 25+ gifts or 25,000,000 qualifying coins',
    shape: 'crown',
    iconKey: 'crown',
    accentFrom: '#FFC84A',
    accentTo: '#FA26A0',
    borderHex: '#FDE047',
    metricKey: 'giftsSentCount',
    targetValue: 25,
  },
  {
    id: 'popular_host',
    name: 'Popular Host',
    category: 'social',
    rarity: 'epic',
    description: 'Beloved creator attracting followers and likes across streams and videos.',
    unlockConditionText: 'Reach 50 followers or 100 total likes',
    shape: 'heart',
    iconKey: 'heart',
    accentFrom: '#EC4899',
    accentTo: '#F43F5E',
    borderHex: '#F9A8D4',
    metricKey: 'followersOrLikes',
    targetValue: 50,
  },
  {
    id: 'rising_star',
    name: 'Rising Star',
    category: 'creator',
    rarity: 'rare',
    description: 'Completed Lenzo Party profile identity and published your spotlight moment.',
    unlockConditionText: 'Complete display name, bio & country (3/3)',
    shape: 'star',
    iconKey: 'sparkles',
    accentFrom: '#8B20FF',
    accentTo: '#FA26A0',
    borderHex: '#D8B4FE',
    metricKey: 'profileAndUploads',
    targetValue: 3,
  },
  {
    id: 'community_champion',
    name: 'Community Champion',
    category: 'social',
    rarity: 'epic',
    description: 'Pillar of the Lenzo Party ecosystem who joins an Agency or connects with 10+ creators.',
    unlockConditionText: 'Join an Agency or follow 10 creators',
    shape: 'crest',
    iconKey: 'shield',
    accentFrom: '#A855F7',
    accentTo: '#EC4899',
    borderHex: '#C084FC',
    metricKey: 'agencyAndFollowing',
    targetValue: 1,
  },
  {
    id: 'event_winner',
    name: 'Event Winner',
    category: 'events',
    rarity: 'legendary',
    description: 'Victorious competitor who claimed glory in PK Live Battles or special Lenzo events.',
    unlockConditionText: 'Win 1 PK Battle or official Lenzo event',
    shape: 'trophy',
    iconKey: 'trophy',
    accentFrom: '#FBBF24',
    accentTo: '#D97706',
    borderHex: '#FEF08A',
    metricKey: 'pkWinsOrEvents',
    targetValue: 1,
  },
  {
    id: 'legendary_creator',
    name: 'Legendary Creator',
    category: 'creator',
    rarity: 'mythic',
    description: 'Highest independent creator honor uniting audience love, diamonds earned, and published moments.',
    unlockConditionText: 'Achieve 5,000+ Diamonds & 200+ Followers/Likes combined score',
    shape: 'sunburst',
    iconKey: 'award',
    accentFrom: '#FFC84A',
    accentTo: '#7C3AED',
    borderHex: '#FFC84A',
    metricKey: 'legendaryScore',
    targetValue: 5_200,
  },
];

/**
 * Deterministic largest-remainder (Hamilton) integer apportionment for a 50-level linear ramp.
 * Guarantees exact endpoints (startCost, endCost), strictly increasing costs, and exact integer total.
 */
function buildLinearRampExact(
  count: number,
  startCost: number,
  endCost: number,
  expectedSum: number
): number[] {
  const step = (endCost - startCost) / (count - 1);
  const floors: number[] = [];
  const remainders: Array<{ index: number; frac: number }> = [];
  let sumFloors = 0;

  for (let i = 0; i < count; i++) {
    if (i === 0) {
      floors.push(startCost);
      sumFloors += startCost;
    } else if (i === count - 1) {
      floors.push(endCost);
      sumFloors += endCost;
    } else {
      const exact = startCost + i * step;
      const floored = Math.floor(exact);
      floors.push(floored);
      sumFloors += floored;
      remainders.push({ index: i, frac: exact - floored });
    }
  }

  let residual = expectedSum - sumFloors;
  if (residual > 0) {
    remainders.sort((a, b) => b.frac - a.frac || a.index - b.index);
    for (let k = 0; k < residual && k < remainders.length; k++) {
      floors[remainders[k].index] += 1;
    }
  } else if (residual < 0) {
    remainders.sort((a, b) => a.frac - b.frac || b.index - a.index);
    for (let k = 0; k < -residual && k < remainders.length; k++) {
      floors[remainders[k].index] -= 1;
    }
  }

  return floors;
}

export function getTierConfigForLevel(level: number): LevelTierConfig {
  const safe = Number.isFinite(level) ? Math.floor(level) : 0;
  const clamped = Math.max(MIN_LEVEL, Math.min(TOTAL_LEVELS, safe));
  const tierIndex = Math.min(LEVEL_TIER_CONFIGS.length - 1, Math.floor(clamped / 10));
  return LEVEL_TIER_CONFIGS[tierIndex];
}

function generateAll101Levels(): LevelDefinition[] {
  const firstHalf = buildLinearRampExact(50, 1_000_000, 23_000_000, LEVELS_1_TO_50_EXACT_TOTAL);
  const secondHalf = buildLinearRampExact(50, 23_200_000, 32_800_000, LEVELS_51_TO_100_EXACT_TOTAL);
  const allCosts = [...firstHalf, ...secondHalf];

  const vipByLevel = new Map<number, VipTierDefinition>();
  for (const v of VIP_TIER_DEFINITIONS) vipByLevel.set(v.unlockLevel, v);

  const superVipByLevel = new Map<number, SuperVipTierDefinition>();
  for (const sv of SUPER_VIP_TIER_DEFINITIONS) superVipByLevel.set(sv.unlockLevel, sv);

  const levels: LevelDefinition[] = [];
  const starterTier = getTierConfigForLevel(0);

  // Level 0 (Starter Entry Level — 0 coins spent; 101 total levels from 0 to 100)
  levels.push({
    level: 0,
    tierId: starterTier.id,
    tierName: starterTier.name,
    subRank: '0',
    title: 'Starter 0',
    coinsForThisLevel: 0,
    cumulativeStart: 0,
    cumulativeCoins: 0,
    colorHex: starterTier.primaryColor,
    secondaryHex: starterTier.secondaryColor,
    gradientCss: starterTier.gradientCss,
    glowRgba: starterTier.glowRgba,
    insignia: starterTier.insignia,
    perks: [
      'Level 0 Crystal Shield Emblem on Profile',
      'Send gifts in Live & Party Rooms to advance to Level 1 (1,000,000 coins)',
      ...starterTier.tierPerks,
    ],
  });

  let runningCumulative = 0;

  for (let i = 0; i < TOTAL_LEVELS; i++) {
    const level = i + 1;
    const cost = allCosts[i];
    const cumulativeStart = runningCumulative;
    runningCumulative += cost;

    const tierCfg = getTierConfigForLevel(level);
    const subIdx = level === 100 ? 10 : (level % 10) + 1;
    const subRank = ROMAN_SUBRANKS[Math.min(ROMAN_SUBRANKS.length - 1, subIdx)];
    const vipUnlock = vipByLevel.get(level);
    const superVipUnlock = superVipByLevel.get(level);

    const perks: string[] = [...tierCfg.tierPerks];
    if (vipUnlock) {
      perks.unshift(`Unlocks ${vipUnlock.code} — ${vipUnlock.frameName}`);
    }
    if (superVipUnlock) {
      perks.unshift(`Unlocks ${superVipUnlock.code} — ${superVipUnlock.frameName}`);
    }

    levels.push({
      level,
      tierId: tierCfg.id,
      tierName: tierCfg.name,
      subRank,
      title: level === 100 ? 'Royal Sovereign 100' : `${tierCfg.displayName} ${subRank}`,
      coinsForThisLevel: cost,
      cumulativeStart,
      cumulativeCoins: runningCumulative,
      colorHex: tierCfg.primaryColor,
      secondaryHex: tierCfg.secondaryColor,
      gradientCss: tierCfg.gradientCss,
      glowRgba: tierCfg.glowRgba,
      insignia: tierCfg.insignia,
      vipUnlockTier: vipUnlock?.tier,
      superVipUnlockTier: superVipUnlock?.tier,
      perks,
    });
  }

  return levels;
}

export const ALL_100_LEVELS: LevelDefinition[] = generateAll101Levels();

export function getLevelDefinition(level: number): LevelDefinition {
  const safe = Number.isFinite(level) ? Math.floor(level) : 0;
  const clamped = Math.max(MIN_LEVEL, Math.min(TOTAL_LEVELS, safe));
  return ALL_100_LEVELS[clamped];
}

export function getVipTierDefinition(tier: number): VipTierDefinition | undefined {
  return VIP_TIER_DEFINITIONS.find((v) => v.tier === tier);
}

export function getSuperVipTierDefinition(tier: number): SuperVipTierDefinition | undefined {
  return SUPER_VIP_TIER_DEFINITIONS.find((sv) => sv.tier === tier);
}

export function getUnlockedVipTiersForLevel(level: number): number[] {
  const safe = Number.isFinite(level) ? Math.floor(level) : 0;
  const clamped = Math.max(MIN_LEVEL, Math.min(TOTAL_LEVELS, safe));
  return VIP_TIER_DEFINITIONS.filter((v) => clamped >= v.unlockLevel).map((v) => v.tier);
}

export function getUnlockedSuperVipTiersForLevel(level: number): number[] {
  const safe = Number.isFinite(level) ? Math.floor(level) : 0;
  const clamped = Math.max(MIN_LEVEL, Math.min(TOTAL_LEVELS, safe));
  return SUPER_VIP_TIER_DEFINITIONS.filter((sv) => clamped >= sv.unlockLevel).map((sv) => sv.tier);
}

/**
 * Authoritative progression calculation from total qualifying coins spent.
 * 101 Levels (0..100):
 * - 0 coins starts at Level 0 (0 -> 1 requires 1,000,000 coins)
 * - Reaching Level 50 = 600,000,000 coins EXACT
 * - Reaching Level 100 = 2,000,000,000 coins EXACT (Lv 51–100 = 1,400,000,000)
 */
export function calculateProgressionState(
  totalQualifyingCoinsSpent: number,
  options?: {
    userId?: string;
    activeFrameType?: ActiveFrameType;
    equippedVipFrame?: number;
    equippedSuperVipFrame?: number;
    equippedAchievementBadges?: string[];
  }
): ComputedProgressionState {
  const safeCoins = Math.max(0, Math.floor(Number.isFinite(totalQualifyingCoinsSpent) ? totalQualifyingCoinsSpent : 0));

  // Level N (0..100) is reached when safeCoins >= ALL_100_LEVELS[N].cumulativeCoins
  let currentLevel = 0;
  let isMaxMastery = false;

  if (safeCoins >= TOTAL_PROGRESSION_COINS_EXACT) {
    currentLevel = TOTAL_LEVELS;
    isMaxMastery = true;
  } else {
    for (let lvl = TOTAL_LEVELS; lvl >= 0; lvl--) {
      if (safeCoins >= ALL_100_LEVELS[lvl].cumulativeCoins) {
        currentLevel = lvl;
        break;
      }
    }
  }

  const currentLevelDef = getLevelDefinition(currentLevel);
  const nextLevelDef = currentLevel < TOTAL_LEVELS ? getLevelDefinition(currentLevel + 1) : null;

  const coinsForCurrentLevel = nextLevelDef ? nextLevelDef.coinsForThisLevel : currentLevelDef.coinsForThisLevel;
  const coinsInCurrentLevel = isMaxMastery
    ? coinsForCurrentLevel
    : Math.max(0, Math.min(coinsForCurrentLevel, safeCoins - currentLevelDef.cumulativeCoins));
  const remainingCoinsNeeded = isMaxMastery || !nextLevelDef
    ? 0
    : Math.max(0, nextLevelDef.cumulativeCoins - safeCoins);
  const percentage = isMaxMastery
    ? 100
    : Math.min(100, Math.max(0, Math.floor((coinsInCurrentLevel / Math.max(1, coinsForCurrentLevel)) * 100)));

  const unlockedVipTiers = getUnlockedVipTiersForLevel(currentLevel);
  const highestUnlockedVipTier = unlockedVipTiers.length > 0 ? unlockedVipTiers[unlockedVipTiers.length - 1] : 0;

  const unlockedSuperVipTiers = getUnlockedSuperVipTiersForLevel(currentLevel);
  const highestUnlockedSuperVipTier =
    unlockedSuperVipTiers.length > 0 ? unlockedSuperVipTiers[unlockedSuperVipTiers.length - 1] : 0;

  // Validate mutually exclusive active frame against actually unlocked tiers
  let activeFrameType: ActiveFrameType = options?.activeFrameType || 'none';
  let equippedVipFrame = options?.equippedVipFrame ?? 0;
  let equippedSuperVipFrame = options?.equippedSuperVipFrame ?? 0;

  if (!unlockedVipTiers.includes(equippedVipFrame)) {
    equippedVipFrame = 0;
  }
  if (!unlockedSuperVipTiers.includes(equippedSuperVipFrame)) {
    equippedSuperVipFrame = 0;
  }

  if (activeFrameType === 'super_vip') {
    if (equippedSuperVipFrame === 0) {
      activeFrameType = equippedVipFrame > 0 ? 'vip' : 'none';
    }
  } else if (activeFrameType === 'vip') {
    if (equippedVipFrame === 0) {
      activeFrameType = equippedSuperVipFrame > 0 ? 'super_vip' : 'none';
    }
  } else {
    // Backwards compatibility: if a user had an unlocked VIP frame equipped before activeFrameType existed
    if (equippedSuperVipFrame > 0) {
      activeFrameType = 'super_vip';
    } else if (equippedVipFrame > 0) {
      activeFrameType = 'vip';
    }
  }

  return {
    userId: options?.userId || '',
    currentLevel,
    currentTierId: currentLevelDef.tierId,
    currentTierName: currentLevelDef.tierName,
    currentLevelDef,
    nextLevelDef,
    totalQualifyingCoinsSpent: safeCoins,
    coinsInCurrentLevel,
    coinsForCurrentLevel,
    remainingCoinsNeeded,
    percentage,
    isMaxLevel: currentLevel >= TOTAL_LEVELS,
    isMaxMastery,
    highestUnlockedVipTier,
    unlockedVipTiers,
    highestUnlockedSuperVipTier,
    unlockedSuperVipTiers,
    activeFrameType,
    equippedVipFrame,
    equippedSuperVipFrame,
    equippedAchievementBadges: (options?.equippedAchievementBadges || []).slice(0, MAX_EQUIPPED_ACHIEVEMENT_BADGES),
  };
}

/**
 * Computes exact crossed levels & milestone unlocks when coins advance from oldCoins -> newCoins.
 * Guarantees multi-level jumps award EVERY crossed VIP & Super VIP milestone exactly once.
 */
export function detectMilestoneUnlocks(oldTotalCoins: number, newTotalCoins: number): MilestoneUnlockDiff {
  const before = calculateProgressionState(oldTotalCoins);
  const after = calculateProgressionState(newTotalCoins);

  const crossedLevels: number[] = [];
  for (let lvl = before.currentLevel + 1; lvl <= after.currentLevel; lvl++) {
    crossedLevels.push(lvl);
  }

  const oldVipSet = new Set(before.unlockedVipTiers);
  const newlyUnlockedVipTiers = after.unlockedVipTiers.filter((t) => !oldVipSet.has(t));

  const oldSuperVipSet = new Set(before.unlockedSuperVipTiers);
  const newlyUnlockedSuperVipTiers = after.unlockedSuperVipTiers.filter((t) => !oldSuperVipSet.has(t));

  return {
    oldLevel: before.currentLevel,
    newLevel: after.currentLevel,
    leveledUp: after.currentLevel > before.currentLevel,
    crossedLevels,
    tierChanged: after.currentTierId !== before.currentTierId,
    oldTierId: before.currentTierId,
    newTierId: after.currentTierId,
    newlyUnlockedVipTiers,
    newlyUnlockedSuperVipTiers,
    newlyUnlockedVipFrames: newlyUnlockedVipTiers
      .map((t) => getVipTierDefinition(t))
      .filter((d): d is VipTierDefinition => Boolean(d)),
    newlyUnlockedSuperVipFrames: newlyUnlockedSuperVipTiers
      .map((t) => getSuperVipTierDefinition(t))
      .filter((d): d is SuperVipTierDefinition => Boolean(d)),
  };
}

/**
 * Evaluates all 10 independent achievement badges against authoritative user metrics
 * plus any already-persisted earned achievement records (preserving earnedAt timestamps).
 */
export function evaluateAchievementBadges(
  metrics: UserActivityMetrics,
  persistedEarned: EarnedAchievementRecord[] = [],
  equippedIds: string[] = [],
  definitions: AchievementBadgeDefinition[] = ACHIEVEMENT_BADGE_DEFINITIONS
): EvaluatedAchievementBadge[] {
  const earnedMap = new Map<string, EarnedAchievementRecord>();
  for (const rec of persistedEarned) {
    earnedMap.set(rec.badgeId, rec);
  }
  const equippedSet = new Set(equippedIds.slice(0, MAX_EQUIPPED_ACHIEVEMENT_BADGES));

  return definitions.map((def) => {
    let progressCurrent = 0;

    switch (def.metricKey) {
      case 'coinsSpent':
        progressCurrent = metrics.totalQualifyingCoinsSpent;
        break;
      case 'diamondsEarned':
        progressCurrent = metrics.diamondsEarned;
        break;
      case 'sessionsAndVideos':
        progressCurrent = metrics.liveSessionsHosted + metrics.publicVideosCount;
        break;
      case 'loginStreakDays':
        progressCurrent = metrics.loginStreakDays;
        break;
      case 'giftsSentCount':
        // Unlocks either via gift count OR >= 25M coins spent
        progressCurrent =
          metrics.totalQualifyingCoinsSpent >= 25_000_000
            ? def.targetValue
            : metrics.giftsSentCount;
        break;
      case 'followersOrLikes':
        progressCurrent = Math.max(metrics.followersCount, Math.floor(metrics.totalLikesCount / 2));
        break;
      case 'profileAndUploads':
        progressCurrent = metrics.profileCompletedSteps;
        break;
      case 'agencyAndFollowing':
        progressCurrent = metrics.hasAgency || metrics.followingCount >= 10 ? 1 : 0;
        break;
      case 'pkWinsOrEvents':
        progressCurrent = metrics.pkWinsCount + metrics.eventsWonCount;
        break;
      case 'legendaryScore':
        progressCurrent = metrics.diamondsEarned + metrics.followersCount + metrics.totalLikesCount;
        break;
      default:
        progressCurrent = 0;
    }

    const clampedProgress = Math.min(def.targetValue, Math.max(0, Math.floor(progressCurrent)));
    const persisted = earnedMap.get(def.id);
    const isEarned = Boolean(persisted) || clampedProgress >= def.targetValue;
    const progressPercent = isEarned
      ? 100
      : Math.min(99, Math.max(0, Math.floor((clampedProgress / Math.max(1, def.targetValue)) * 100)));

    return {
      ...def,
      isEarned,
      isEquipped: isEarned && equippedSet.has(def.id),
      earnedAt: persisted?.earnedAt,
      progressCurrent: isEarned ? def.targetValue : clampedProgress,
      progressTarget: def.targetValue,
      progressPercent,
    };
  });
}

/**
 * Utility formatter for large progression coin values (e.g., 1,000,000 -> "1M", 2,000,000,000 -> "2B").
 */
export function formatCoinsCompact(coins: number): string {
  if (!Number.isFinite(coins) || coins <= 0) return '0';
  if (coins >= 1_000_000_000) {
    return `${(coins / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')}B`;
  }
  if (coins >= 1_000_000) {
    return `${(coins / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  }
  if (coins >= 1_000) {
    return `${(coins / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return Math.floor(coins).toLocaleString();
}

/**
 * Self-check helper returning exact mathematical totals for audit & admin verification.
 */
export function getProgressionMathAudit() {
  // Levels 1..50 sit at indices 1..50; Levels 51..100 sit at indices 51..100 (Index 0 is Starter Level 0 = 0 coins)
  const sum1to50 = ALL_100_LEVELS.slice(1, 51).reduce((acc, l) => acc + l.coinsForThisLevel, 0);
  const sum51to100 = ALL_100_LEVELS.slice(51, 101).reduce((acc, l) => acc + l.coinsForThisLevel, 0);
  const grandTotal = sum1to50 + sum51to100;
  return {
    totalLevels: ALL_100_LEVELS.length, // 101 (0 through 100)
    minLevel: MIN_LEVEL,
    maxLevel: TOTAL_LEVELS,
    totalTiers: LEVEL_TIER_CONFIGS.length,
    totalVipTiers: VIP_TIER_DEFINITIONS.length,
    totalSuperVipTiers: SUPER_VIP_TIER_DEFINITIONS.length,
    totalAchievements: ACHIEVEMENT_BADGE_DEFINITIONS.length,
    level0Cost: ALL_100_LEVELS[0].coinsForThisLevel,
    level1Cost: ALL_100_LEVELS[1].coinsForThisLevel,
    level50Cost: ALL_100_LEVELS[50].coinsForThisLevel,
    level51Cost: ALL_100_LEVELS[51].coinsForThisLevel,
    level100Cost: ALL_100_LEVELS[100].coinsForThisLevel,
    sumLevels1To50: sum1to50,
    sumLevels51To100: sum51to100,
    grandTotalCoins: grandTotal,
    isExact:
      ALL_100_LEVELS.length === TOTAL_LEVEL_COUNT &&
      ALL_100_LEVELS[0].level === 0 &&
      ALL_100_LEVELS[100].level === 100 &&
      sum1to50 === LEVELS_1_TO_50_EXACT_TOTAL &&
      sum51to100 === LEVELS_51_TO_100_EXACT_TOTAL &&
      grandTotal === TOTAL_PROGRESSION_COINS_EXACT,
  };
}
