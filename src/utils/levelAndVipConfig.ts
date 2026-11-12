import {
  LevelMajorTier,
  LevelDefinition,
  VipFrameDefinition,
  UserLevelProgression,
} from '../types/levelAndVip';

// ROMAN NUMERALS for Sub-Ranks I through X
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// BASE COIN EXPONENTS FOR BALANCED PROGRESSION
// Total qualifying coins needed to reach each level (1 to 50)
const LEVEL_COIN_REQUIREMENTS: number[] = [
  0,        // Level 1: Starter
  250,      // Level 2
  600,      // Level 3
  1100,     // Level 4
  1800,     // Level 5
  2700,     // Level 6 -> Unlocks VIP 1!
  3900,     // Level 7
  5400,     // Level 8
  7200,     // Level 9
  9500,     // Level 10 -> Bronze X
  12500,    // Level 11 -> Silver I
  16000,    // Level 12 -> Unlocks VIP 2!
  20500,    // Level 13
  26000,    // Level 14
  32500,    // Level 15
  40000,    // Level 16
  49000,    // Level 17
  59000,    // Level 18 -> Unlocks VIP 3!
  71000,    // Level 19
  85000,    // Level 20 -> Silver X
  102000,   // Level 21 -> Gold I
  122000,   // Level 22
  145000,   // Level 23
  172000,   // Level 24 -> Unlocks VIP 4!
  203000,   // Level 25
  238000,   // Level 26
  278000,   // Level 27
  323000,   // Level 28
  373000,   // Level 29
  430000,   // Level 30 -> Unlocks VIP 5! & Gold X
  495000,   // Level 31 -> Platinum I
  568000,   // Level 32
  650000,   // Level 33
  742000,   // Level 34
  845000,   // Level 35
  960000,   // Level 36 -> Unlocks VIP 6!
  1090000,  // Level 37
  1235000,  // Level 38
  1395000,  // Level 39
  1575000,  // Level 40 -> Platinum X
  1775000,  // Level 41 -> Diamond I
  2000000,  // Level 42 -> Unlocks VIP 7!
  2250000,  // Level 43
  2530000,  // Level 44
  2840000,  // Level 45
  3180000,  // Level 46
  3560000,  // Level 47
  3980000,  // Level 48 -> Unlocks VIP 8 (Celestial)!
  4450000,  // Level 49
  5000000,  // Level 50 -> MAX LEVEL: Diamond X
];

// Helper to determine tier from level
export function getTierFromLevel(level: number): LevelMajorTier {
  if (level <= 10) return 'bronze';
  if (level <= 20) return 'silver';
  if (level <= 30) return 'gold';
  if (level <= 40) return 'platinum';
  return 'diamond';
}

// 50 INDIVIDUAL LEVEL DEFINITIONS
export const FIFTY_LEVELS: LevelDefinition[] = Array.from({ length: 50 }, (_, i) => {
  const level = i + 1;
  const tier = getTierFromLevel(level);
  const subIndex = (level - 1) % 10;
  const roman = ROMAN_NUMERALS[subIndex];

  const tierNames: Record<LevelMajorTier, string> = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
    diamond: 'Diamond',
  };

  const titles: Record<LevelMajorTier, string[]> = {
    bronze: [
      'Apprentice Gifter',
      'Rising Voice',
      'Party Starter',
      'Club Cadet',
      'Rhythm Seeker',
      'Bronze Vanguard',
      'Stage Enthusiast',
      'Acoustic Knight',
      'Echo Champion',
      'Bronze Supreme',
    ],
    silver: [
      'Silver Vanguard',
      'Harmonic Scout',
      'Room Trendsetter',
      'Radiant Supporter',
      'Silver Sovereign',
      'Melody Master',
      'Silver Knight',
      'Sonic Baron',
      'Silver Luminary',
      'Silver Archon',
    ],
    gold: [
      'Golden Patron',
      'Crown Gifter',
      'Aura Commander',
      'Golden Maestro',
      'Star Benefactor',
      'Golden Warlord',
      'Sunfire Host',
      'Golden Royal',
      'Imperial Patron',
      'Golden Emperor',
    ],
    platinum: [
      'Platinum Sovereign',
      'Mythic Contributor',
      'Stellar Titan',
      'Platinum Regent',
      'Grand Dynast',
      'Celestial Knight',
      'Platinum Dominator',
      'Nebula Overlord',
      'Infinity Benefactor',
      'Platinum Apex',
    ],
    diamond: [
      'Diamond Monarch',
      'Astral Overlord',
      'Galactic Luminary',
      'Cosmic Sovereign',
      'Supernova Patron',
      'Omniscient Gifter',
      'Eternal Archangel',
      'Celestial Deity',
      'Supreme Emperor',
      'MAX APEX DEITY',
    ],
  };

  const shapes: ('shield' | 'star' | 'crown' | 'gem' | 'hexagon' | 'flame' | 'crest' | 'diamond')[] = [
    'shield',
    'star',
    'crown',
    'crest',
    'hexagon',
    'shield',
    'gem',
    'star',
    'flame',
    'diamond',
  ];

  const gradients: Record<LevelMajorTier, string> = {
    bronze: 'from-[#a75d28] via-[#cd7f32] to-[#8a4216]',
    silver: 'from-[#94a3b8] via-[#e2e8f0] to-[#64748b]',
    gold: 'from-[#f59e0b] via-[#fbbf24] to-[#d97706]',
    platinum: 'from-[#8b5cf6] via-[#c084fc] to-[#6d28d9]',
    diamond: 'from-[#06b6d4] via-[#38bdf8] to-[#ec4899]',
  };

  const glows: Record<LevelMajorTier, string> = {
    bronze: 'shadow-[0_0_10px_rgba(205,127,50,0.5)]',
    silver: 'shadow-[0_0_12px_rgba(226,232,240,0.6)]',
    gold: 'shadow-[0_0_16px_rgba(251,191,36,0.7)]',
    platinum: 'shadow-[0_0_18px_rgba(192,132,252,0.75)]',
    diamond: 'shadow-[0_0_24px_rgba(56,189,248,0.85)]',
  };

  const icons: Record<LevelMajorTier, string> = {
    bronze: '🛡️',
    silver: '⚔️',
    gold: '👑',
    platinum: '✨',
    diamond: '💎',
  };

  const currentReq = LEVEL_COIN_REQUIREMENTS[level - 1];
  const prevReq = level > 1 ? LEVEL_COIN_REQUIREMENTS[level - 2] : 0;
  const coinsForThisLevel = currentReq - prevReq;

  return {
    level,
    tier,
    tierRank: `${tierNames[tier]} ${roman}`,
    name: titles[tier][subIndex],
    requiredCoins: currentReq,
    coinsForThisLevel,
    badgeTheme: {
      shape: shapes[subIndex],
      primaryColor: tier === 'bronze' ? '#cd7f32' : tier === 'silver' ? '#e2e8f0' : tier === 'gold' ? '#fbbf24' : tier === 'platinum' ? '#c084fc' : '#38bdf8',
      gradient: gradients[tier],
      borderStyle: `border-2 ${tier === 'bronze' ? 'border-[#cd7f32]' : tier === 'silver' ? 'border-[#e2e8f0]' : tier === 'gold' ? 'border-[#fbbf24]' : tier === 'platinum' ? 'border-[#c084fc]' : 'border-[#38bdf8]'}`,
      glowEffect: glows[tier],
      metallicFinish: tier,
      romanNumeral: roman,
      icon: icons[tier],
    },
    perks: [
      `Exclusive ${tierNames[tier]} ${roman} chat badge`,
      level >= 6 && level % 6 === 0 ? `Unlocks VIP ${level / 6} Animated Profile Frame` : `Gifting multiplier boost (${level * 2}%)`,
      level >= 25 ? 'Anti-kick priority in 8-seat rooms' : 'Special entrance chime sound',
      level >= 40 ? 'Full screen broadcast on entering rooms' : 'Highlighted comment aura',
    ],
  };
});

// EIGHT VIP PROFILE FRAMES (Unlocked every 6 levels from Level 6 to Level 48)
export const EIGHT_VIP_FRAMES: VipFrameDefinition[] = [
  {
    tier: 1,
    name: 'VIP 1: Neon Cyan Ring',
    unlockLevel: 6,
    themeColor: '#06b6d4',
    borderGradient: 'from-cyan-400 via-sky-300 to-blue-500',
    glowShadow: '0 0 14px rgba(6,182,212,0.6)',
    animationClass: 'animate-spin-slow',
    decorativeElements: 'cyan_particles',
    perks: [
      'Neon Cyan Pulsing Avatar Border',
      'VIP 1 Badge in Room Seats',
      'Daily Free 50 Coins Drop',
    ],
  },
  {
    tier: 2,
    name: 'VIP 2: Amethyst Radiance',
    unlockLevel: 12,
    themeColor: '#a855f7',
    borderGradient: 'from-purple-500 via-fuchsia-400 to-indigo-500',
    glowShadow: '0 0 16px rgba(168,85,247,0.7)',
    animationClass: 'animate-pulse',
    decorativeElements: 'amethyst_crystals',
    perks: [
      'Violet Crystalline Profile Frame',
      'Custom Entry Sound Effect',
      '5% Cashback on Gift Sending',
    ],
  },
  {
    tier: 3,
    name: 'VIP 3: Radiant Golden Crown',
    unlockLevel: 18,
    themeColor: '#eab308',
    borderGradient: 'from-amber-400 via-yellow-200 to-amber-600',
    glowShadow: '0 0 18px rgba(234,179,8,0.8)',
    animationClass: 'animate-bounce-subtle',
    decorativeElements: 'golden_crown',
    perks: [
      'Animated Golden Crown Top Adornment',
      'Golden Shimmer Message Aura',
      '10% Gifting Bonus Points',
    ],
  },
  {
    tier: 4,
    name: 'VIP 4: Cyber Rose Flare',
    unlockLevel: 24,
    themeColor: '#f43f5e',
    borderGradient: 'from-rose-500 via-pink-400 to-fuchsia-600',
    glowShadow: '0 0 20px rgba(244,63,94,0.8)',
    animationClass: 'animate-pulse',
    decorativeElements: 'rose_wings',
    perks: [
      'Dual Neon Rose Blade Wings',
      'Stealth Incognito Mode in Audio Rooms',
      'Special PK Battle Entrance Strobe',
    ],
  },
  {
    tier: 5,
    name: 'VIP 5: Emerald Dragon Crest',
    unlockLevel: 30,
    themeColor: '#10b981',
    borderGradient: 'from-emerald-400 via-teal-300 to-green-600',
    glowShadow: '0 0 22px rgba(16,185,129,0.85)',
    animationClass: 'animate-glow',
    decorativeElements: 'emerald_dragon',
    perks: [
      'Imperial Emerald Dragon Ring with Coiling Tail',
      'Anti-Kick Immunity in All Party Rooms',
      '15% Gifting Bonus',
    ],
  },
  {
    tier: 6,
    name: 'VIP 6: Solar Phoenix Blaze',
    unlockLevel: 36,
    themeColor: '#f97316',
    borderGradient: 'from-orange-500 via-amber-300 to-red-600',
    glowShadow: '0 0 24px rgba(249,115,22,0.9)',
    animationClass: 'animate-flame',
    decorativeElements: 'solar_flames',
    perks: [
      'Blazing Phoenix Wings & Solar Sparks',
      'Broadcast Banner when Entering Live Streams',
      'Dedicated VIP Concierge Priority',
    ],
  },
  {
    tier: 7,
    name: 'VIP 7: Void Nebula Aura',
    unlockLevel: 42,
    themeColor: '#d946ef',
    borderGradient: 'from-fuchsia-500 via-purple-300 to-cyan-400',
    glowShadow: '0 0 28px rgba(217,70,239,0.95)',
    animationClass: 'animate-nebula',
    decorativeElements: 'cosmic_nebula',
    perks: [
      'Cosmic Hologram Orbiting Planets',
      'Global Soundboard Access in Audio Rooms',
      '20% Gift Cashback & EXP Multiplier',
    ],
  },
  {
    tier: 8,
    name: 'VIP 8: Archon Celestial Eternity',
    unlockLevel: 48,
    themeColor: '#38bdf8',
    borderGradient: 'from-sky-300 via-amber-200 to-fuchsia-400',
    glowShadow: '0 0 34px rgba(56,189,248,1)',
    animationClass: 'animate-celestial',
    decorativeElements: 'archon_halo',
    perks: [
      'Supreme Floating Archon Halo & Stardust Trail',
      'Unrestricted Top Host Seating Priority',
      'Global System Announcement across entire app',
      'Permanent VIP Sovereign Title',
    ],
  },
];

// Calculate progression from cumulative qualifying gifting coins
export function calculateLevelProgression(
  totalQualifyingCoins: number,
  userId: string = 'current_user',
  equippedFrame: number = 0
): UserLevelProgression {
  let currentLevel = 1;

  for (let i = 0; i < FIFTY_LEVELS.length; i++) {
    if (totalQualifyingCoins >= FIFTY_LEVELS[i].requiredCoins) {
      currentLevel = FIFTY_LEVELS[i].level;
    } else {
      break;
    }
  }

  const isMaxLevel = currentLevel >= 50;
  const currentDef = FIFTY_LEVELS[currentLevel - 1];
  const nextDef = !isMaxLevel ? FIFTY_LEVELS[currentLevel] : currentDef;

  const coinsInCurrentLevel = totalQualifyingCoins - currentDef.requiredCoins;
  const coinsNeededForNextLevel = !isMaxLevel ? nextDef.requiredCoins - currentDef.requiredCoins : 0;
  const remainingCoins = !isMaxLevel ? Math.max(0, nextDef.requiredCoins - totalQualifyingCoins) : 0;
  const progressPercent = isMaxLevel
    ? 100
    : Math.min(100, Math.max(0, Math.round((coinsInCurrentLevel / coinsNeededForNextLevel) * 100)));

  // Unlocked VIP tiers based on current level
  const unlockedVipTiers = EIGHT_VIP_FRAMES
    .filter((f) => currentLevel >= f.unlockLevel)
    .map((f) => f.tier);

  // If equippedFrame is not valid or 0, default to highest unlocked tier
  let resolvedEquippedFrame = equippedFrame;
  if (resolvedEquippedFrame === 0 && unlockedVipTiers.length > 0) {
    resolvedEquippedFrame = Math.max(...unlockedVipTiers);
  } else if (!unlockedVipTiers.includes(resolvedEquippedFrame)) {
    resolvedEquippedFrame = unlockedVipTiers.length > 0 ? Math.max(...unlockedVipTiers) : 0;
  }

  return {
    userId,
    currentLevel,
    currentTier: currentDef.tier,
    totalQualifyingCoinsSpent: totalQualifyingCoins,
    coinsInCurrentLevel: Math.max(0, coinsInCurrentLevel),
    coinsNeededForNextLevel,
    progressPercent,
    remainingCoins,
    isMaxLevel,
    unlockedVipTiers,
    equippedVipFrame: resolvedEquippedFrame,
    updatedAt: new Date().toISOString(),
  };
}

// Get definition for single level (1-50)
export function getLevelDefinition(level: number): LevelDefinition {
  const bounded = Math.min(50, Math.max(1, level));
  return FIFTY_LEVELS[bounded - 1];
}

// Get VIP frame definition (1-8)
export function getVipFrameDefinition(tier: number): VipFrameDefinition | undefined {
  return EIGHT_VIP_FRAMES.find((f) => f.tier === tier);
}

// Aliases for system integration
export const LEVEL_DEFINITIONS = FIFTY_LEVELS;
export const VIP_FRAME_DEFINITIONS = EIGHT_VIP_FRAMES;

export const MAJOR_TIERS: { tier: LevelMajorTier; name: string; range: string }[] = [
  { tier: 'bronze', name: 'Bronze', range: 'Lv 1 - 10' },
  { tier: 'silver', name: 'Silver', range: 'Lv 11 - 20' },
  { tier: 'gold', name: 'Gold', range: 'Lv 21 - 30' },
  { tier: 'platinum', name: 'Platinum', range: 'Lv 31 - 40' },
  { tier: 'diamond', name: 'Diamond', range: 'Lv 41 - 50 (MAX)' },
];
