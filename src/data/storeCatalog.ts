import vipFramesIcon from '../assets/images/store_cat_vip_frames_1795168966830.jpg';
import specialEntryIcon from '../assets/images/store_cat_special_entry_1795168967865.jpg';
import customGiftIcon from '../assets/images/store_cat_custom_gift_1795168966908.jpg';
import premiumAssetsIcon from '../assets/images/store_cat_premium_assets_1795168967977.jpg';
import {
  LenzoStoreProduct,
  StoreAnimationPreset,
  StoreCategoryId,
  StoreCategoryRecord,
} from '../types/store';

export const STORE_CATEGORY_ICONS: Record<StoreCategoryId, string> = {
  vip_frames: vipFramesIcon,
  special_entry: specialEntryIcon,
  custom_gift: customGiftIcon,
  premium_assets: premiumAssetsIcon,
};

export const DEFAULT_STORE_CATEGORIES: StoreCategoryRecord[] = [
  {
    id: 'vip_frames',
    title: 'VIP FRAMES',
    subtitle: 'Royal animated avatar crowns & neon halos',
    imageUrl: vipFramesIcon,
    accentFrom: '#FFC84A',
    accentTo: '#A855F7',
    glowColor: 'rgba(168, 85, 247, 0.72)',
    order: 1,
    enabled: true,
  },
  {
    id: 'special_entry',
    title: 'SPECIAL ENTRY',
    subtitle: 'Grand royal gates, red carpets & spotlights',
    imageUrl: specialEntryIcon,
    accentFrom: '#F59E0B',
    accentTo: '#EC4899',
    glowColor: 'rgba(245, 158, 11, 0.65)',
    order: 2,
    enabled: true,
  },
  {
    id: 'custom_gift',
    title: 'CUSTOM GIFT',
    subtitle: 'Luxury animated gift boxes & golden bursts',
    imageUrl: customGiftIcon,
    accentFrom: '#C084FC',
    accentTo: '#F59E0B',
    glowColor: 'rgba(192, 132, 252, 0.72)',
    order: 3,
    enabled: true,
  },
  {
    id: 'premium_assets',
    title: 'PREMIUM ASSETS',
    subtitle: 'Prismatic diamonds, aura crests & media FX',
    imageUrl: premiumAssetsIcon,
    accentFrom: '#D946EF',
    accentTo: '#7C3AED',
    glowColor: 'rgba(217, 70, 239, 0.72)',
    order: 4,
    enabled: true,
  },
];

export const STORE_ANIMATION_PRESET_OPTIONS: Array<{
  value: StoreAnimationPreset;
  label: string;
  categoryId: StoreCategoryId;
}> = [
  { value: 'royal_flame', label: 'Royal Flame Crown Ring', categoryId: 'vip_frames' },
  { value: 'neon_galaxy', label: 'Neon Galaxy Orbit Halo', categoryId: 'vip_frames' },
  { value: 'diamond_aura', label: 'Diamond Aura Prism Frame', categoryId: 'vip_frames' },
  { value: 'imperial_carpet', label: 'Imperial Red Carpet Walk', categoryId: 'special_entry' },
  { value: 'golden_gate', label: 'Royal Golden Gate Opening', categoryId: 'special_entry' },
  { value: 'phantom_spotlight', label: 'Phantom VIP Spotlight Arrival', categoryId: 'special_entry' },
  { value: 'velvet_gift_box', label: 'Velvet Galaxy Gift Burst', categoryId: 'custom_gift' },
  { value: 'golden_ribbon_gift', label: 'Golden Ribbon Treasure Box', categoryId: 'custom_gift' },
  { value: 'starburst_chest', label: 'Starburst Crown Luxury Chest', categoryId: 'custom_gift' },
  { value: 'amethyst_prism', label: 'Amethyst Prism Diamond Aura', categoryId: 'premium_assets' },
  { value: 'neon_diamond_crest', label: 'Neon Diamond Crest FX', categoryId: 'premium_assets' },
  { value: 'celestial_crystal', label: 'Celestial Crystal Orb Pack', categoryId: 'premium_assets' },
];

export const DEFAULT_STORE_PRODUCTS: LenzoStoreProduct[] = [
  // ======================================================
  // 1. VIP FRAMES (Exact Reference Showcase Items)
  // ======================================================
  {
    id: 'vip_frame_royal_flame',
    name: 'Royal Flame',
    categoryId: 'vip_frames',
    priceCoins: 2500,
    description:
      'Blazing golden crown crest with rotating molten-amber flame ring and rising royal embers around your profile avatar.',
    animationPreset: 'royal_flame',
    primaryColor: '#FF8A00',
    secondaryColor: '#FFC84A',
    accentColor: '#FFE082',
    glowColor: 'rgba(255, 160, 24, 0.75)',
    badgeText: 'POPULAR',
    durationDays: 0,
    isFeatured: true,
    enabled: true,
    sortOrder: 1,
  },
  {
    id: 'vip_frame_neon_galaxy',
    name: 'Neon Galaxy',
    categoryId: 'vip_frames',
    priceCoins: 4800,
    description:
      'Orbiting electric magenta-violet cosmic vortex with dual stardust particles and shimmering neon halo.',
    animationPreset: 'neon_galaxy',
    primaryColor: '#A855F7',
    secondaryColor: '#EC4899',
    accentColor: '#38BDF8',
    glowColor: 'rgba(192, 68, 255, 0.8)',
    badgeText: 'HOT',
    durationDays: 0,
    isFeatured: false,
    enabled: true,
    sortOrder: 2,
  },
  {
    id: 'vip_frame_diamond_aura',
    name: 'Diamond Aura',
    categoryId: 'vip_frames',
    priceCoins: 7200,
    description:
      'Ultra-luxury crystalline diamond halo with prismatic star-flares, royal platinum rim and sparkling prism aura.',
    animationPreset: 'diamond_aura',
    primaryColor: '#38BDF8',
    secondaryColor: '#C084FC',
    accentColor: '#F8FAFC',
    glowColor: 'rgba(56, 189, 248, 0.8)',
    badgeText: 'LEGENDARY',
    durationDays: 0,
    isFeatured: false,
    enabled: true,
    sortOrder: 3,
  },

  // ======================================================
  // 2. SPECIAL ENTRY
  // ======================================================
  {
    id: 'entry_imperial_carpet',
    name: 'Imperial Carpet',
    categoryId: 'special_entry',
    priceCoins: 6500,
    description:
      'Roll out a plush crimson carpet with gleaming golden stanchions and animated twin spotlights every time you enter a room.',
    animationPreset: 'imperial_carpet',
    primaryColor: '#DC2626',
    secondaryColor: '#FFC84A',
    accentColor: '#FDE68A',
    glowColor: 'rgba(245, 158, 11, 0.78)',
    badgeText: 'VIP ENTRY',
    durationDays: 0,
    isFeatured: true,
    enabled: true,
    sortOrder: 1,
  },
  {
    id: 'entry_golden_gate',
    name: 'Royal Gate',
    categoryId: 'special_entry',
    priceCoins: 9800,
    description:
      'Twin sculpted golden palace gates swing open with violet laser rays and golden stardust announcing your arrival.',
    animationPreset: 'golden_gate',
    primaryColor: '#F59E0B',
    secondaryColor: '#9333EA',
    accentColor: '#FEF08A',
    glowColor: 'rgba(255, 200, 74, 0.82)',
    badgeText: 'ROYAL',
    durationDays: 0,
    isFeatured: false,
    enabled: true,
    sortOrder: 2,
  },
  {
    id: 'entry_phantom_spotlight',
    name: 'Neon Spotlight',
    categoryId: 'special_entry',
    priceCoins: 14500,
    description:
      'Dramatic sweeping purple and magenta stage spotlights with holographic Lenzo banner across live broadcasts.',
    animationPreset: 'phantom_spotlight',
    primaryColor: '#D946EF',
    secondaryColor: '#7C3AED',
    accentColor: '#F0ABFC',
    glowColor: 'rgba(217, 70, 239, 0.85)',
    badgeText: 'MYTHIC',
    durationDays: 0,
    isFeatured: false,
    enabled: true,
    sortOrder: 3,
  },

  // ======================================================
  // 3. CUSTOM GIFT
  // ======================================================
  {
    id: 'gift_velvet_galaxy',
    name: 'Velvet Gift Box',
    categoryId: 'custom_gift',
    priceCoins: 1800,
    description:
      'Glowing violet crystal gift box wrapped in liquid gold ribbon that pops open in a shower of hearts and stardust.',
    animationPreset: 'velvet_gift_box',
    primaryColor: '#9333EA',
    secondaryColor: '#FFC84A',
    accentColor: '#F472B6',
    glowColor: 'rgba(168, 85, 247, 0.8)',
    badgeText: 'CUSTOM',
    durationDays: 0,
    isFeatured: true,
    enabled: true,
    sortOrder: 1,
  },
  {
    id: 'gift_golden_ribbon',
    name: 'Golden Ribbon',
    categoryId: 'custom_gift',
    priceCoins: 3600,
    description:
      'Hand-crafted gilded surprise chest with animated satin bow unfurling golden coin rain across the room.',
    animationPreset: 'golden_ribbon_gift',
    primaryColor: '#F59E0B',
    secondaryColor: '#EC4899',
    accentColor: '#FEF08A',
    glowColor: 'rgba(245, 158, 11, 0.8)',
    badgeText: 'LUXURY',
    durationDays: 0,
    isFeatured: false,
    enabled: true,
    sortOrder: 2,
  },
  {
    id: 'gift_starburst_chest',
    name: 'Crown Treasure',
    categoryId: 'custom_gift',
    priceCoins: 8500,
    description:
      'Royal amethyst treasure box bursting with a 3D crown hologram, golden sparks, and floating neon gems.',
    animationPreset: 'starburst_chest',
    primaryColor: '#C026D3',
    secondaryColor: '#FACC15',
    accentColor: '#E879F9',
    glowColor: 'rgba(192, 38, 211, 0.85)',
    badgeText: 'EXCLUSIVE',
    durationDays: 0,
    isFeatured: false,
    enabled: true,
    sortOrder: 3,
  },

  // ======================================================
  // 4. PREMIUM ASSETS
  // ======================================================
  {
    id: 'asset_amethyst_prism',
    name: 'Amethyst Prism',
    categoryId: 'premium_assets',
    priceCoins: 3200,
    description:
      'Rotating neon purple cut diamond emblem with prismatic violet aura rings for your profile & party seat.',
    animationPreset: 'amethyst_prism',
    primaryColor: '#A855F7',
    secondaryColor: '#EC4899',
    accentColor: '#F5D0FE',
    glowColor: 'rgba(168, 85, 247, 0.82)',
    badgeText: 'PREMIUM',
    durationDays: 0,
    isFeatured: true,
    enabled: true,
    sortOrder: 1,
  },
  {
    id: 'asset_neon_diamond_crest',
    name: 'Diamond Crest',
    categoryId: 'premium_assets',
    priceCoins: 5900,
    description:
      'High-gloss violet diamond crest emitting synchronized neon pulse waves and floating crystal shards.',
    animationPreset: 'neon_diamond_crest',
    primaryColor: '#D946EF',
    secondaryColor: '#38BDF8',
    accentColor: '#FDE047',
    glowColor: 'rgba(217, 70, 239, 0.82)',
    badgeText: 'ELITE',
    durationDays: 0,
    isFeatured: false,
    enabled: true,
    sortOrder: 2,
  },
  {
    id: 'asset_celestial_crystal',
    name: 'Celestial Orb',
    categoryId: 'premium_assets',
    priceCoins: 11000,
    description:
      'Complete luxury visual asset bundle: orbital sapphire-amethyst crystal core with animated golden star halo.',
    animationPreset: 'celestial_crystal',
    primaryColor: '#8B5CF6',
    secondaryColor: '#F59E0B',
    accentColor: '#67E8F9',
    glowColor: 'rgba(139, 92, 246, 0.88)',
    badgeText: 'MYTHIC',
    durationDays: 0,
    isFeatured: false,
    enabled: true,
    sortOrder: 3,
  },
];

export function getDefaultCategory(id: StoreCategoryId): StoreCategoryRecord {
  return (
    DEFAULT_STORE_CATEGORIES.find((c) => c.id === id) ||
    DEFAULT_STORE_CATEGORIES[0]
  );
}
