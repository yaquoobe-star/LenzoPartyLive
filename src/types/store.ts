export type StoreCategoryId =
  | 'vip_frames'
  | 'special_entry'
  | 'custom_gift'
  | 'premium_assets';

export type StoreAnimationPreset =
  | 'royal_flame'
  | 'neon_galaxy'
  | 'diamond_aura'
  | 'imperial_carpet'
  | 'golden_gate'
  | 'phantom_spotlight'
  | 'velvet_gift_box'
  | 'golden_ribbon_gift'
  | 'starburst_chest'
  | 'amethyst_prism'
  | 'neon_diamond_crest'
  | 'celestial_crystal';

export interface StoreCategoryRecord {
  id: StoreCategoryId;
  title: string;
  subtitle: string;
  imageUrl: string;
  accentFrom: string;
  accentTo: string;
  glowColor: string;
  order: number;
  enabled: boolean;
}

export interface LenzoStoreProduct {
  id: string;
  name: string;
  categoryId: StoreCategoryId;
  priceCoins: number;
  description: string;
  imageUrl?: string;
  animationUrl?: string;
  animationPreset: StoreAnimationPreset;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  glowColor: string;
  badgeText?: string;
  durationDays?: number; // 0 or undefined = Permanent
  isFeatured: boolean;
  enabled: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserInventoryItem {
  id: string; // deterministic: `${userId}_${productId}`
  userId: string;
  productId: string;
  productName: string;
  categoryId: StoreCategoryId;
  animationPreset: StoreAnimationPreset;
  imageUrl?: string;
  animationUrl?: string;
  pricePaidCoins: number;
  equipped: boolean;
  purchasedAt: string;
  expiresAt?: string | null;
}

export interface StoreCoinTransaction {
  id: string;
  userId: string;
  type: 'store_purchase' | 'coin_recharge' | 'admin_adjustment';
  productId?: string;
  productName?: string;
  categoryId?: StoreCategoryId;
  amount: number; // negative for debit, positive for credit
  balanceBefore: number;
  balanceAfter: number;
  idempotencyKey: string;
  status: 'completed' | 'failed';
  createdAt: string;
}
