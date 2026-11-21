import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  Coins,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { ScreenType, UserProfile } from '../../types';
import {
  LenzoStoreProduct,
  StoreCategoryId,
  StoreCategoryRecord,
  UserInventoryItem,
} from '../../types/store';
import {
  DEFAULT_STORE_CATEGORIES,
  DEFAULT_STORE_PRODUCTS,
} from '../../data/storeCatalog';
import {
  purchaseStoreProduct,
  subscribeStoreCategories,
  subscribeStoreProducts,
  subscribeUserInventory,
  toggleEquipInventoryItem,
} from '../../services/storeService';
import { subscribeUserWallet } from '../../services/walletService';
import { StoreAssetPreview } from '../common/StoreAssetPreview';

interface StoreScreenProps {
  currentUser: UserProfile;
  onNavigate: (screen: ScreenType) => void;
  onOpenWallet: () => void;
  onOpenVIP: () => void;
  onUpdateUserBalance: (newCoins: number, newDiamonds: number) => void;
}

/**
 * Reusable glossy metallic golden coin emblem
 */
const GoldenCoinIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} aria-hidden="true">
    <defs>
      <radialGradient id="lenzoGoldCoinGrad" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FFF7CC" />
        <stop offset="45%" stopColor="#FFC84A" />
        <stop offset="85%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#92400E" />
      </radialGradient>
    </defs>
    <circle cx="12" cy="12" r="10.5" fill="url(#lenzoGoldCoinGrad)" stroke="#FEF08A" strokeWidth="1.2" />
    <circle cx="12" cy="12" r="7.5" fill="none" stroke="#FFFBEB" strokeOpacity="0.65" strokeWidth="1" />
    <path
      d="M12 7.2 L13.4 10.3 L16.8 10.7 L14.2 12.9 L14.9 16.3 L12 14.5 L9.1 16.3 L9.8 12.9 L7.2 10.7 L10.6 10.3 Z"
      fill="#FFFBEB"
      opacity="0.92"
    />
  </svg>
);

/**
 * Sculpted Golden Royal Crown Emblem above STORE title
 */
const StoreHeroCrown: React.FC = () => (
  <svg
    viewBox="0 0 96 52"
    className="w-16 h-9 mx-auto drop-shadow-[0_0_16px_rgba(255,200,74,0.85)]"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="storeCrownGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF8D6" />
        <stop offset="38%" stopColor="#FFC84A" />
        <stop offset="72%" stopColor="#EAB308" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
    </defs>
    {/* Crown Body */}
    <path
      d="M14 42 L8 16 L29 27 L48 8 L67 27 L88 16 L82 42 Z"
      fill="url(#storeCrownGold)"
      stroke="#FEF08A"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Crown Base Band */}
    <rect x="14" y="40" width="68" height="8" rx="4" fill="url(#storeCrownGold)" stroke="#FFFBEB" strokeWidth="1.4" />
    {/* Crown Jewels */}
    <circle cx="8" cy="14" r="4" fill="#FEF08A" stroke="#D97706" strokeWidth="1.2" />
    <circle cx="48" cy="6" r="4.8" fill="#FFFBEB" stroke="#D97706" strokeWidth="1.2" />
    <circle cx="88" cy="14" r="4" fill="#FEF08A" stroke="#D97706" strokeWidth="1.2" />
    <polygon points="48,22 54,30 48,37 42,30" fill="#C084FC" stroke="#FFFBEB" strokeWidth="1" />
    <circle cx="30" cy="33" r="2.8" fill="#F472B6" />
    <circle cx="66" cy="33" r="2.8" fill="#F472B6" />
  </svg>
);

/**
 * Decorative Golden Laurel Wreath Branch flanking the STORE heading
 */
const GoldenLaurelBranch: React.FC<{ mirrored?: boolean }> = ({ mirrored = false }) => (
  <svg
    viewBox="0 0 68 42"
    className={`w-12 h-8 sm:w-14 sm:h-9 shrink-0 drop-shadow-[0_0_10px_rgba(255,200,74,0.6)] ${
      mirrored ? '-scale-x-100' : ''
    }`}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="laurelGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF7CC" />
        <stop offset="55%" stopColor="#FFC84A" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
    </defs>
    {/* Curved Stem */}
    <path
      d="M58 36 C36 35 18 24 10 6"
      fill="none"
      stroke="url(#laurelGold)"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    {/* Laurel Leaves */}
    <ellipse cx="14" cy="12" rx="6.5" ry="3.2" transform="rotate(-35 14 12)" fill="url(#laurelGold)" />
    <ellipse cx="22" cy="18" rx="7" ry="3.4" transform="rotate(-24 22 18)" fill="url(#laurelGold)" />
    <ellipse cx="32" cy="24" rx="7.2" ry="3.5" transform="rotate(-14 32 24)" fill="url(#laurelGold)" />
    <ellipse cx="44" cy="30" rx="7.4" ry="3.5" transform="rotate(-4 44 30)" fill="url(#laurelGold)" />
    <ellipse cx="19" cy="25" rx="6" ry="3" transform="rotate(28 19 25)" fill="url(#laurelGold)" opacity="0.88" />
    <ellipse cx="30" cy="32" rx="6.5" ry="3.2" transform="rotate(20 30 32)" fill="url(#laurelGold)" opacity="0.88" />
    <ellipse cx="43" cy="36" rx="6.5" ry="3" transform="rotate(12 43 36)" fill="url(#laurelGold)" opacity="0.88" />
  </svg>
);

export const StoreScreen: React.FC<StoreScreenProps> = ({
  currentUser,
  onNavigate,
  onOpenWallet,
  onUpdateUserBalance,
}) => {
  // Real-time catalog, inventory & authoritative wallet state
  const [categories, setCategories] = useState<StoreCategoryRecord[]>(DEFAULT_STORE_CATEGORIES);
  const [products, setProducts] = useState<LenzoStoreProduct[]>(DEFAULT_STORE_PRODUCTS);
  const [inventory, setInventory] = useState<UserInventoryItem[]>([]);
  const [walletCoins, setWalletCoins] = useState<number>(currentUser.coins ?? 0);

  // Active Store selection state
  const [selectedCategoryId, setSelectedCategoryId] = useState<StoreCategoryId>('vip_frames');
  const [selectedProductId, setSelectedProductId] = useState<string>('vip_frame_royal_flame');

  // Animation preview modal & purchase dialog states
  const [previewModalProduct, setPreviewModalProduct] = useState<LenzoStoreProduct | null>(null);
  const [previewReplayKey, setPreviewReplayKey] = useState<number>(0);
  const [confirmPurchaseProduct, setConfirmPurchaseProduct] = useState<LenzoStoreProduct | null>(null);
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
  const [equippingId, setEquippingId] = useState<string | null>(null);
  const [purchaseSuccessModal, setPurchaseSuccessModal] = useState<{
    product: LenzoStoreProduct;
    inventoryItem?: UserInventoryItem;
    newBalance: number;
  } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ type, text });
    window.setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 3200);
  };

  // Subscribe to Firestore store_categories, store_products, user_inventory, and wallets/{uid}
  useEffect(() => {
    const unsubCats = subscribeStoreCategories(setCategories);
    const unsubProds = subscribeStoreProducts(setProducts);
    const unsubInv = currentUser.id
      ? subscribeUserInventory(currentUser.id, setInventory)
      : () => {};
    const unsubWallet = currentUser.id
      ? subscribeUserWallet(currentUser.id, (w) => {
          const synced = w.walletPurchasedCoins > 0 ? w.walletPurchasedCoins : Math.max(w.walletPurchasedCoins, currentUser.coins ?? 0);
          setWalletCoins(synced);
        })
      : () => {};

    return () => {
      unsubCats();
      unsubProds();
      unsubInv();
      unsubWallet();
      // Stop any active preview animation cleanly on unmount
      setPreviewModalProduct(null);
    };
  }, [currentUser.id]);

  // Keep local displayed balance aligned if user recharges via WalletModal
  useEffect(() => {
    if (typeof currentUser.coins === 'number') {
      setWalletCoins((prev) => (currentUser.coins > prev ? currentUser.coins : prev || currentUser.coins));
    }
  }, [currentUser.coins]);

  // STRICT Category Filtering: ONLY products belonging to the selected category are ever displayed
  const categoryProducts = useMemo(() => {
    return products
      .filter((p) => p.enabled !== false && p.categoryId === selectedCategoryId)
      .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
  }, [products, selectedCategoryId]);

  // Ensure selectedProductId ALWAYS belongs to the currently active category
  const featuredProduct = useMemo<LenzoStoreProduct | null>(() => {
    if (categoryProducts.length === 0) return null;
    const found = categoryProducts.find((p) => p.id === selectedProductId);
    if (found) return found;
    return categoryProducts.find((p) => p.isFeatured) || categoryProducts[0];
  }, [categoryProducts, selectedProductId]);

  // Fast inventory lookup map by productId
  const inventoryByProductId = useMemo(() => {
    const map = new Map<string, UserInventoryItem>();
    inventory.forEach((item) => map.set(item.productId, item));
    return map;
  }, [inventory]);

  const handleSelectCategory = (catId: StoreCategoryId) => {
    // Immediately stop any active preview animation when switching category
    setPreviewModalProduct(null);
    setConfirmPurchaseProduct(null);
    setSelectedCategoryId(catId);

    const matching = products
      .filter((p) => p.enabled !== false && p.categoryId === catId)
      .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
    const nextFeatured = matching.find((p) => p.isFeatured) || matching[0];
    if (nextFeatured) {
      setSelectedProductId(nextFeatured.id);
    }
  };

  const handleOpenPreviewAnimation = (product: LenzoStoreProduct) => {
    setSelectedProductId(product.id);
    setPreviewReplayKey((k) => k + 1);
    setPreviewModalProduct(product);
  };

  const handleTapGetNow = (product: LenzoStoreProduct) => {
    const owned = inventoryByProductId.get(product.id);
    if (owned) {
      void handleToggleEquip(owned, !owned.equipped);
      return;
    }

    const effectiveCoins = Math.max(walletCoins, currentUser.coins ?? 0);
    if (effectiveCoins < product.priceCoins) {
      showToast(
        `You need ${(product.priceCoins - effectiveCoins).toLocaleString()} more coins. Opening Coin Recharge...`,
        'info'
      );
      onOpenWallet();
      return;
    }

    setConfirmPurchaseProduct(product);
  };

  const handleConfirmPurchase = async () => {
    if (!confirmPurchaseProduct || isPurchasing) return;
    setIsPurchasing(true);

    const targetProduct = confirmPurchaseProduct;
    const result = await purchaseStoreProduct({
      userId: currentUser.id,
      product: targetProduct,
      fallbackBalanceCoins: Math.max(walletCoins, currentUser.coins ?? 0),
    });

    setIsPurchasing(false);
    setConfirmPurchaseProduct(null);

    if (!result.success) {
      if (result.errorCode === 'INSUFFICIENT_COINS') {
        showToast(result.message, 'info');
        onOpenWallet();
        return;
      }
      showToast(result.message, result.errorCode === 'ALREADY_OWNED' ? 'info' : 'error');
      return;
    }

    if (typeof result.newBalance === 'number') {
      setWalletCoins(result.newBalance);
      onUpdateUserBalance(result.newBalance, currentUser.diamonds ?? 0);
    }

    setPurchaseSuccessModal({
      product: targetProduct,
      inventoryItem: result.inventoryItem,
      newBalance: result.newBalance ?? walletCoins,
    });
  };

  const handleToggleEquip = async (item: UserInventoryItem, nextEquip: boolean) => {
    if (equippingId) return;
    setEquippingId(item.productId);
    const res = await toggleEquipInventoryItem({
      userId: currentUser.id,
      item,
      equip: nextEquip,
    });
    setEquippingId(null);
    showToast(res.message, res.success ? 'success' : 'error');
  };

  const activeCategoryObj =
    categories.find((c) => c.id === selectedCategoryId) || DEFAULT_STORE_CATEGORIES[0];

  const featuredOwned = featuredProduct
    ? inventoryByProductId.get(featuredProduct.id)
    : undefined;

  const displayedCoins = Math.max(walletCoins, currentUser.coins ?? 0);

  return (
    <div
      className="relative min-h-dvh-screen w-full overflow-x-clip pb-28 md:pb-12 text-white select-none"
      style={{
        background:
          'radial-gradient(ellipse 90% 55% at 50% 0%, #360E6B 0%, #17062E 38%, #090314 76%, #05010B 100%)',
      }}
    >
      {/* Ambient Neon Particle Backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[300px] rounded-full blur-[110px] opacity-40"
          style={{
            background: 'radial-gradient(circle, #9333EA 0%, #EC4899 48%, transparent 75%)',
          }}
        />
        <div
          className="absolute bottom-24 -left-16 w-64 h-64 rounded-full blur-[100px] opacity-25"
          style={{ background: '#7C3AED' }}
        />
        <div
          className="absolute bottom-40 -right-16 w-64 h-64 rounded-full blur-[100px] opacity-20"
          style={{ background: '#F59E0B' }}
        />
        {/* Floating Subtle Sparkle Dots */}
        <span className="absolute top-24 left-[12%] w-1.5 h-1.5 rounded-full bg-amber-300/70 animate-lenzo-particle" />
        <span
          className="absolute top-36 right-[16%] w-1.5 h-1.5 rounded-full bg-fuchsia-400/80 animate-lenzo-particle"
          style={{ animationDelay: '0.7s' }}
        />
        <span
          className="absolute top-60 left-[84%] w-1 h-1 rounded-full bg-violet-300/80 animate-lenzo-particle"
          style={{ animationDelay: '1.3s' }}
        />
        <span
          className="absolute top-[460px] left-[8%] w-1.5 h-1.5 rounded-full bg-amber-200/60 animate-lenzo-particle"
          style={{ animationDelay: '1.8s' }}
        />
      </div>

      {/* Main Centered Responsive Container */}
      <div className="relative z-10 max-w-xl mx-auto px-3.5 sm:px-5">
        {/* ============================================================
            1. TOP HEADER BAR (Back Left | Lenzo Party Center | Coins + Right)
            ============================================================ */}
        <header className="sticky top-0 z-30 -mx-3.5 sm:-mx-5 px-3.5 sm:px-5 safe-pt-3 pb-3 backdrop-blur-xl bg-[#0D041D]/80 border-b border-purple-500/20">
          <div className="flex items-center justify-between gap-2">
            {/* Back Button (Top Left) */}
            <button
              type="button"
              onClick={() => onNavigate('home')}
              aria-label="Go Back"
              className="w-9 h-9 rounded-xl bg-white/[0.06] border border-purple-400/30 flex items-center justify-center text-white hover:bg-purple-500/20 hover:border-purple-300/60 active:scale-95 transition-all shadow-[0_0_12px_rgba(168,85,247,0.28)]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Centered Lenzo Party Branding */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="font-display text-lg sm:text-xl font-black tracking-tight bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(217,70,239,0.55)]"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, #FFFFFF 0%, #F5D0FE 42%, #FFC84A 100%)',
                }}
              >
                Lenzo Party
              </span>
            </div>

            {/* User Coin Balance & Plus/Recharge Button (Top Right) */}
            <button
              type="button"
              onClick={onOpenWallet}
              className="group flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-[#190933]/90 border border-amber-400/45 shadow-[0_0_16px_rgba(255,200,74,0.24)] hover:border-amber-300 active:scale-95 transition-all"
              title="Recharge Lenzo Coins"
            >
              <GoldenCoinIcon className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-black text-amber-200 tabular-nums tracking-tight">
                {displayedCoins.toLocaleString()}
              </span>
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FFC84A] via-[#F59E0B] to-[#D97706] text-[#1A0826] flex items-center justify-center shadow-[0_0_10px_rgba(255,200,74,0.65)] group-hover:scale-105 transition-transform">
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </span>
            </button>
          </div>
        </header>

        {/* ============================================================
            2. HERO STORE HEADING (Golden Crown Above + Golden Laurels Sides)
            ============================================================ */}
        <section className="pt-4 pb-5 text-center">
          <StoreHeroCrown />
          <div className="mt-0.5 flex items-center justify-center gap-2 sm:gap-3">
            <GoldenLaurelBranch />
            <h1
              className="font-display text-[32px] sm:text-[38px] leading-none font-black tracking-[0.14em] bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(180deg, #FFFDF2 0%, #FFE484 44%, #F59E0B 82%, #D97706 100%)',
                filter: 'drop-shadow(0 0 18px rgba(255, 200, 74, 0.55))',
              }}
            >
              STORE
            </h1>
            <GoldenLaurelBranch mirrored />
          </div>
        </section>

        {/* ============================================================
            3. FOUR MAIN STORE CATEGORIES (Exact 2-Column Glossy Grid)
            ============================================================ */}
        <section aria-label="Store Categories" className="grid grid-cols-2 gap-3 sm:gap-3.5">
          {categories.slice(0, 4).map((cat) => {
            const isSelected = cat.id === selectedCategoryId;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat.id)}
                className={`group relative rounded-[22px] p-[1.5px] text-left transition-all duration-300 active:scale-[0.97] ${
                  isSelected
                    ? 'scale-[1.01]'
                    : 'opacity-90 hover:opacity-100'
                }`}
                style={{
                  background: isSelected
                    ? `linear-gradient(135deg, #FFC84A 0%, #EC4899 50%, #9333EA 100%)`
                    : 'linear-gradient(135deg, rgba(168,85,247,0.52) 0%, rgba(236,72,153,0.28) 55%, rgba(255,200,74,0.34) 100%)',
                  boxShadow: isSelected
                    ? `0 0 26px ${cat.glowColor}, 0 8px 22px rgba(0,0,0,0.6)`
                    : '0 6px 18px rgba(0,0,0,0.5)',
                }}
              >
                <div
                  className="relative h-full rounded-[20.5px] px-2.5 pt-2.5 pb-3 flex flex-col items-center justify-between overflow-hidden"
                  style={{
                    background: isSelected
                      ? 'radial-gradient(circle at 50% 25%, #2D0D5C 0%, #140529 66%, #0B0318 100%)'
                      : 'radial-gradient(circle at 50% 25%, #210A42 0%, #100421 70%, #090213 100%)',
                  }}
                >
                  {/* Top Glossy Specular Rim */}
                  <div className="pointer-events-none absolute top-0 inset-x-4 h-[1px] bg-gradient-to-r from-transparent via-white/45 to-transparent" />

                  {/* Active Corner Sparkle */}
                  {isSelected && (
                    <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_12px_#FFC84A] animate-pulse" />
                  )}

                  {/* 3D Glossy Generated Category Emblem */}
                  <div className="relative w-[86px] h-[86px] sm:w-[98px] sm:h-[98px] rounded-2xl overflow-hidden flex items-center justify-center">
                    <div
                      className={`pointer-events-none absolute inset-1 rounded-full blur-lg transition-opacity duration-300 ${
                        isSelected ? 'opacity-65' : 'opacity-30 group-hover:opacity-50'
                      }`}
                      style={{ background: cat.glowColor }}
                    />
                    <img
                      src={cat.imageUrl}
                      alt={cat.title}
                      className={`relative z-10 w-full h-full object-cover rounded-2xl transition-transform duration-300 ${
                        isSelected ? 'scale-105' : 'group-hover:scale-105'
                      }`}
                    />
                  </div>

                  {/* Category Label */}
                  <div className="mt-2 text-center">
                    <div
                      className={`font-display text-[13px] sm:text-sm font-black tracking-[0.08em] uppercase ${
                        isSelected
                          ? 'text-amber-200 drop-shadow-[0_0_10px_rgba(255,200,74,0.65)]'
                          : 'text-white/95'
                      }`}
                    >
                      {cat.title}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {/* ============================================================
            4. SELECTED CATEGORY PRODUCT SECTION HEADER
            ============================================================ */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3 px-0.5">
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-5 rounded-full"
                style={{
                  background: `linear-gradient(180deg, ${activeCategoryObj.accentFrom}, ${activeCategoryObj.accentTo})`,
                  boxShadow: `0 0 10px ${activeCategoryObj.glowColor}`,
                }}
              />
              <h2 className="font-display text-sm sm:text-base font-black tracking-[0.1em] uppercase text-white">
                {activeCategoryObj.title}
              </h2>
            </div>
            <span className="text-[11px] font-bold text-purple-200/80">
              {categoryProducts.length} {categoryProducts.length === 1 ? 'Item' : 'Items'}
            </span>
          </div>

          {/* ============================================================
              5. PRODUCT CARDS (Strict Category Filter — 3-Column Grid)
              ============================================================ */}
          {categoryProducts.length === 0 ? (
            <div className="rounded-2xl border border-purple-500/30 bg-[#140729]/80 p-6 text-center">
              <Sparkles className="w-7 h-7 text-purple-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-white">No active items in {activeCategoryObj.title}</p>
              <p className="text-xs text-purple-200/70 mt-1">
                New luxury items added from Lenzo Admin will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {categoryProducts.map((product) => {
                const isSelected = featuredProduct?.id === product.id;
                const ownedItem = inventoryByProductId.get(product.id);
                const isEquipped = Boolean(ownedItem?.equipped);

                return (
                  <div
                    key={product.id}
                    onClick={() => setSelectedProductId(product.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedProductId(product.id);
                      }
                    }}
                    className={`group relative rounded-[18px] p-[1.5px] cursor-pointer transition-all duration-200 active:scale-[0.97] ${
                      isSelected ? '-translate-y-0.5' : 'hover:-translate-y-0.5'
                    }`}
                    style={{
                      background: isSelected
                        ? 'linear-gradient(155deg, #FFC84A 0%, #EC4899 52%, #8B5CF6 100%)'
                        : 'linear-gradient(155deg, rgba(168,85,247,0.5) 0%, rgba(124,58,237,0.2) 100%)',
                      boxShadow: isSelected
                        ? `0 0 22px ${product.glowColor}`
                        : '0 4px 14px rgba(0,0,0,0.45)',
                    }}
                  >
                    <div
                      className="relative h-full rounded-[16.5px] px-2 pt-2.5 pb-2.5 flex flex-col items-center text-center overflow-hidden"
                      style={{
                        background: isSelected
                          ? 'linear-gradient(180deg, #270D4F 0%, #120526 100%)'
                          : 'linear-gradient(180deg, #1B0938 0%, #0E041E 100%)',
                      }}
                    >
                      {/* Owned / Equipped Indicator */}
                      {ownedItem && (
                        <span
                          className={`absolute top-1.5 right-1.5 z-20 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                            isEquipped
                              ? 'bg-emerald-500/90 text-white shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                              : 'bg-purple-500/80 text-white'
                          }`}
                        >
                          {isEquipped ? 'ON' : 'OWNED'}
                        </span>
                      )}

                      {/* Live Animated Product Visual */}
                      <div className="my-0.5 flex items-center justify-center">
                        <StoreAssetPreview
                          product={product}
                          userAvatar={currentUser.avatar}
                          userName={currentUser.name}
                          size="sm"
                          isPlaying={isSelected}
                        />
                      </div>

                      {/* Product Name */}
                      <div className="mt-1.5 w-full truncate font-display text-[11px] sm:text-xs font-extrabold text-white tracking-tight">
                        {product.name}
                      </div>

                      {/* Coin Price */}
                      <div className="mt-1 flex items-center justify-center gap-1">
                        <GoldenCoinIcon className="w-3.5 h-3.5" />
                        <span className="text-[11px] sm:text-xs font-black text-amber-300 tabular-nums">
                          {product.priceCoins.toLocaleString()}
                        </span>
                      </div>

                      {/* Preview Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPreviewAnimation(product);
                        }}
                        className="mt-2 w-full py-1.5 px-2 rounded-lg bg-gradient-to-r from-[#7C3AED]/85 via-[#A855F7]/85 to-[#D946EF]/85 hover:from-[#8B5CF6] hover:to-[#EC4899] border border-purple-300/40 text-[10px] font-black uppercase tracking-wider text-white flex items-center justify-center gap-1 shadow-[0_0_12px_rgba(168,85,247,0.45)] active:scale-95 transition-all"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Preview</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ============================================================
            6. FEATURED PRODUCT PREVIEW CARD (Bottom Showcase)
            ============================================================ */}
        {featuredProduct && (
          <section aria-label="Featured Product Preview" className="mt-5">
            <div
              className="relative rounded-[24px] p-[1.5px]"
              style={{
                background:
                  'linear-gradient(135deg, #FFC84A 0%, #EC4899 45%, #8B5CF6 100%)',
                boxShadow: `0 0 32px ${featuredProduct.glowColor}, 0 14px 30px rgba(0,0,0,0.65)`,
              }}
            >
              <div
                className="relative rounded-[22.5px] p-4 sm:p-5 overflow-hidden"
                style={{
                  background:
                    'radial-gradient(circle at 22% 50%, #340F68 0%, #16062E 52%, #0B0319 100%)',
                }}
              >
                {/* Top Specular Edge */}
                <div className="pointer-events-none absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />

                <div className="flex items-center gap-4 sm:gap-5">
                  {/* LEFT: Large Live Animated Product Preview */}
                  <div
                    onClick={() => handleOpenPreviewAnimation(featuredProduct)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenPreviewAnimation(featuredProduct);
                      }
                    }}
                    className="relative shrink-0 cursor-pointer group"
                    title="Tap to open full-stage animation preview"
                  >
                    <div
                      className="rounded-2xl p-2 border border-purple-400/35 bg-[#120526]/85 flex items-center justify-center"
                      style={{
                        boxShadow: `inset 0 0 22px ${featuredProduct.glowColor}`,
                      }}
                    >
                      <StoreAssetPreview
                        product={featuredProduct}
                        userAvatar={currentUser.avatar}
                        userName={currentUser.name}
                        size="lg"
                        isPlaying={!previewModalProduct}
                      />
                    </div>
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#190833] border border-purple-400/50 text-[9px] font-black uppercase tracking-wider text-purple-200 whitespace-nowrap shadow">
                      Live FX
                    </span>
                  </div>

                  {/* RIGHT: Product Name, Coin Price, PREVIEW ANIMATION & GET NOW */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-fuchsia-300">
                        {activeCategoryObj.title}
                      </span>
                      {featuredProduct.badgeText && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-300/45 text-[9px] font-black uppercase text-amber-200">
                          {featuredProduct.badgeText}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-1 font-display text-xl sm:text-2xl font-black text-white leading-tight truncate">
                      {featuredProduct.name}
                    </h3>

                    <div className="mt-1.5 flex items-center gap-1.5">
                      <GoldenCoinIcon className="w-5 h-5" />
                      <span className="text-lg sm:text-xl font-black text-amber-300 tabular-nums">
                        {featuredProduct.priceCoins.toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-amber-200/80 uppercase">Coins</span>
                    </div>

                    {featuredProduct.description && (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-purple-100/75 line-clamp-2">
                        {featuredProduct.description}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-3.5 flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenPreviewAnimation(featuredProduct)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600/35 hover:bg-purple-600/55 border border-purple-300/50 text-[11px] font-black uppercase tracking-wider text-white flex items-center justify-center gap-1.5 shadow-[0_0_16px_rgba(168,85,247,0.35)] active:scale-95 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current text-fuchsia-200" />
                        <span className="whitespace-nowrap">Preview Animation</span>
                      </button>

                      {featuredOwned ? (
                        <button
                          type="button"
                          disabled={equippingId === featuredProduct.id}
                          onClick={() =>
                            void handleToggleEquip(featuredOwned, !featuredOwned.equipped)
                          }
                          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                            featuredOwned.equipped
                              ? 'bg-emerald-500/25 border border-emerald-400/70 text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.35)]'
                              : 'bg-gradient-to-r from-[#9333EA] to-[#EC4899] border border-pink-300/50 text-white shadow-[0_0_18px_rgba(236,72,153,0.5)]'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>
                            {equippingId === featuredProduct.id
                              ? 'Updating...'
                              : featuredOwned.equipped
                              ? 'Equipped'
                              : 'Equip Now'}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleTapGetNow(featuredProduct)}
                          className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-[#1C072B] flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-[0_0_22px_rgba(255,200,74,0.55)]"
                          style={{
                            background:
                              'linear-gradient(135deg, #FFF3B0 0%, #FFC84A 48%, #F59E0B 100%)',
                          }}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Get Now</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ============================================================
          TOAST FEEDBACK BANNER
          ============================================================ */}
      {toast && (
        <div className="fixed safe-top-offset-16 left-1/2 -translate-x-1/2 z-[80] w-[92%] max-w-sm pointer-events-none">
          <div
            className={`px-4 py-3 rounded-2xl border backdrop-blur-xl text-xs font-bold text-center shadow-2xl ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-400/60 text-emerald-100'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-400/60 text-rose-100'
                : 'bg-[#1D0A3D]/95 border-purple-400/60 text-purple-100'
            }`}
          >
            {toast.text}
          </div>
        </div>
      )}

      {/* ============================================================
          FULL-STAGE LIVE ANIMATION PREVIEW MODAL
          ============================================================ */}
      {previewModalProduct && (
        <div
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewModalProduct(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-[28px] p-[1.5px]"
            style={{
              background:
                'linear-gradient(145deg, #FFC84A 0%, #EC4899 50%, #7C3AED 100%)',
              boxShadow: `0 0 48px ${previewModalProduct.glowColor}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative rounded-[26.5px] p-5 text-center overflow-hidden"
              style={{
                background:
                  'radial-gradient(circle at 50% 28%, #36106B 0%, #140529 58%, #090214 100%)',
              }}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setPreviewModalProduct(null)}
                aria-label="Close Preview"
                className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                Live Animation Preview
              </div>
              <h3 className="mt-1 font-display text-2xl font-black text-white">
                {previewModalProduct.name}
              </h3>

              {/* Large Animated Stage */}
              <div className="my-5 flex items-center justify-center">
                <div
                  key={`${previewModalProduct.id}_${previewReplayKey}`}
                  className="p-4 rounded-3xl border border-purple-400/35 bg-[#0C031A]/80 shadow-inner"
                >
                  <StoreAssetPreview
                    product={previewModalProduct}
                    userAvatar={currentUser.avatar}
                    userName={currentUser.name}
                    size="xl"
                    isPlaying={true}
                  />
                </div>
              </div>

              <p className="text-xs text-purple-100/80 leading-relaxed px-2">
                {previewModalProduct.description}
              </p>

              <div className="mt-4 flex items-center justify-center gap-1.5">
                <GoldenCoinIcon className="w-5 h-5" />
                <span className="text-xl font-black text-amber-300 tabular-nums">
                  {previewModalProduct.priceCoins.toLocaleString()} Coins
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPreviewReplayKey((k) => k + 1)}
                  className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-purple-300/35 text-xs font-black uppercase tracking-wider text-white flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Replay FX</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = previewModalProduct;
                    setPreviewModalProduct(null);
                    handleTapGetNow(target);
                  }}
                  className="py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider text-[#1C072B] flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,200,74,0.55)]"
                  style={{
                    background:
                      'linear-gradient(135deg, #FFF3B0 0%, #FFC84A 48%, #F59E0B 100%)',
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {inventoryByProductId.has(previewModalProduct.id)
                      ? inventoryByProductId.get(previewModalProduct.id)?.equipped
                        ? 'Unequip'
                        : 'Equip Now'
                      : 'Get Now'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SECURE PURCHASE CONFIRMATION DIALOG
          ============================================================ */}
      {confirmPurchaseProduct && (
        <div
          className="fixed inset-0 z-[75] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => !isPurchasing && setConfirmPurchaseProduct(null)}
        >
          <div
            className="w-full max-w-sm rounded-[26px] p-[1.5px]"
            style={{
              background:
                'linear-gradient(145deg, #FFC84A 0%, #A855F7 55%, #EC4899 100%)',
              boxShadow: '0 0 40px rgba(168,85,247,0.55)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-[24.5px] bg-[#130527] p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-300" />
                  <h3 className="font-display text-base font-black uppercase tracking-wide text-white">
                    Confirm Purchase
                  </h3>
                </div>
                {!isPurchasing && (
                  <button
                    type="button"
                    onClick={() => setConfirmPurchaseProduct(null)}
                    className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.04] border border-purple-400/25">
                <StoreAssetPreview
                  product={confirmPurchaseProduct}
                  userAvatar={currentUser.avatar}
                  userName={currentUser.name}
                  size="sm"
                  isPlaying={true}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-base font-black text-white truncate">
                    {confirmPurchaseProduct.name}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <GoldenCoinIcon className="w-4 h-4" />
                    <span className="text-sm font-black text-amber-300 tabular-nums">
                      {confirmPurchaseProduct.priceCoins.toLocaleString()} Coins
                    </span>
                  </div>
                </div>
              </div>

              {/* Balance Breakdown */}
              <div className="mt-4 space-y-2 rounded-2xl bg-[#0B0318] border border-white/10 p-3.5 text-xs">
                <div className="flex items-center justify-between text-purple-200/80">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-amber-300" />
                    Current Balance
                  </span>
                  <span className="font-bold text-white tabular-nums">
                    {displayedCoins.toLocaleString()} Coins
                  </span>
                </div>
                <div className="flex items-center justify-between text-purple-200/80">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-fuchsia-300" />
                    Item Price
                  </span>
                  <span className="font-bold text-rose-300 tabular-nums">
                    -{confirmPurchaseProduct.priceCoins.toLocaleString()} Coins
                  </span>
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="font-bold text-white">Balance After</span>
                  <span className="font-black text-amber-300 tabular-nums">
                    {Math.max(0, displayedCoins - confirmPurchaseProduct.priceCoins).toLocaleString()} Coins
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isPurchasing}
                  onClick={() => setConfirmPurchaseProduct(null)}
                  className="py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-purple-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPurchasing}
                  onClick={() => void handleConfirmPurchase()}
                  className="py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-[#1C072B] disabled:opacity-60 shadow-[0_0_20px_rgba(255,200,74,0.5)]"
                  style={{
                    background:
                      'linear-gradient(135deg, #FFF3B0 0%, #FFC84A 48%, #F59E0B 100%)',
                  }}
                >
                  {isPurchasing ? 'Processing...' : 'Confirm Buy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          PURCHASE SUCCESS DIALOG (Immediate Equip / Use Option)
          ============================================================ */}
      {purchaseSuccessModal && (
        <div
          className="fixed inset-0 z-[78] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPurchaseSuccessModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-[26px] p-[1.5px]"
            style={{
              background:
                'linear-gradient(145deg, #34D399 0%, #FFC84A 50%, #A855F7 100%)',
              boxShadow: '0 0 44px rgba(52,211,153,0.45)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-[24.5px] bg-[#130527] p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                <CheckCircle2 className="w-7 h-7 text-emerald-300" />
              </div>

              <h3 className="font-display text-xl font-black text-white">
                Purchase Successful!
              </h3>
              <p className="mt-1 text-xs text-purple-200/80">
                <span className="font-bold text-amber-200">
                  {purchaseSuccessModal.product.name}
                </span>{' '}
                has been added to your Lenzo Party inventory.
              </p>

              <div className="my-4 flex justify-center">
                <StoreAssetPreview
                  product={purchaseSuccessModal.product}
                  userAvatar={currentUser.avatar}
                  userName={currentUser.name}
                  size="md"
                  isPlaying={true}
                />
              </div>

              <div className="text-[11px] font-bold text-amber-200/90 mb-4">
                Remaining Balance: {purchaseSuccessModal.newBalance.toLocaleString()} Coins
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPurchaseSuccessModal(null)}
                  className="py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white"
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const inv =
                      purchaseSuccessModal.inventoryItem ||
                      inventoryByProductId.get(purchaseSuccessModal.product.id);
                    setPurchaseSuccessModal(null);
                    if (inv) {
                      await handleToggleEquip(inv, true);
                    }
                  }}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-[#9333EA] to-[#EC4899] text-xs font-black uppercase tracking-wider text-white shadow-[0_0_18px_rgba(236,72,153,0.55)]"
                >
                  Equip Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
