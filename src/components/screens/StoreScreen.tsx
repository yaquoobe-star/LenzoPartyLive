import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Coins, 
  Gem, 
  Crown, 
  Sparkles, 
  Flame, 
  ShieldCheck, 
  Check, 
  Plus, 
  Minus, 
  Trash2, 
  X, 
  ShoppingCart, 
  ArrowLeft,
  ChevronRight,
  Eye,
  Gift,
  Zap,
  Filter
} from 'lucide-react';
import { UserProfile, ScreenType, StoreProduct, CartItem } from '../../types';
import { purchaseStoreItem } from '../../services/firestoreService';

interface StoreScreenProps {
  currentUser: UserProfile;
  onNavigate: (screen: ScreenType) => void;
  onOpenWallet: () => void;
  onOpenVIP: () => void;
  onUpdateUserBalance?: (coins: number, diamonds: number) => void;
}

export const STORE_PRODUCTS: StoreProduct[] = [
  // 1. Entrance Effects
  {
    id: 'ent_supercar',
    name: 'Cyber Lamborghini Supercar',
    category: 'entrance',
    price: 15000,
    currency: 'coins',
    priceDisplay: '15,000',
    image: 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?w=400&auto=format&fit=crop&q=80',
    badge: 'HOT',
    rarity: 'legendary',
    description: 'Arrive in party rooms and live streams with a roar of dual-turbo neon engines and high-voltage purple particle trails.',
    benefits: ['Full-screen entrance animation', 'Audio engine sound effect', 'Top banner broadcast announcement', 'Valid for 30 days'],
    isPopular: true,
  },
  {
    id: 'ent_dragon',
    name: 'Imperial Golden Dragon',
    category: 'entrance',
    price: 35000,
    currency: 'coins',
    priceDisplay: '35,000',
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&auto=format&fit=crop&q=80',
    badge: 'MYTHIC',
    rarity: 'mythic',
    description: 'A colossal 3D golden dragon circles the entire screen, sending golden sparks and a kingdom announcement to all attendees.',
    benefits: ['Global room broadcast', 'Customizable greeting text', 'Gold VIP chat tag badge', 'Valid for 60 days'],
  },
  {
    id: 'ent_phoenix',
    name: 'Neon Cyber Phoenix',
    category: 'entrance',
    price: 22000,
    currency: 'coins',
    priceDisplay: '22,000',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=80',
    badge: 'EXCLUSIVE',
    rarity: 'epic',
    description: 'Soar into any room surrounded by blazing purple and electric blue wings with ambient chime sounds.',
    benefits: ['Interactive wing flap animation', 'Auto-pinned 10s seat highlight', 'Valid for 30 days'],
  },

  // 2. VIP Passes
  {
    id: 'vip_gold',
    name: 'Royal Gold VIP Pass',
    category: 'vip',
    price: 9999,
    currency: 'coins',
    priceDisplay: '9,999',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&auto=format&fit=crop&q=80',
    badge: 'BESTSELLER',
    rarity: 'legendary',
    description: 'Upgrade your profile with the coveted Gold Crown frame, exclusive chat colors, and room entry priority.',
    benefits: ['Golden Name Tag & Chat Bubble', 'Anti-Kick room privilege', '2x Daily Level EXP boost', '30 Days validity'],
    isPopular: true,
  },
  {
    id: 'vip_emperor',
    name: 'Emperor Supreme VIP Pass',
    category: 'vip',
    price: 29999,
    currency: 'coins',
    priceDisplay: '29,999',
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80',
    badge: 'MAX PRIVILEGE',
    rarity: 'mythic',
    description: 'The pinnacle status in Linzo Live. Full room immunity, stealth mode, and personalized concierge.',
    benefits: ['Exclusive animated Emperor Crown', 'Stealth entrance toggle', 'Send unlimited room announcements', '60 Days validity'],
  },

  // 3. Avatar Frames & Badges
  {
    id: 'frame_cyber_halo',
    name: 'Cyberpunk Neon Halo Frame',
    category: 'frames',
    price: 3500,
    currency: 'coins',
    priceDisplay: '3,500',
    image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&auto=format&fit=crop&q=80',
    badge: 'NEW',
    rarity: 'rare',
    description: 'Electric pulsating ring with holographic frequency lines around your avatar in rooms and feed.',
    benefits: ['Animated profile frame', 'Glows when speaking on mic', 'Permanent unlock'],
  },
  {
    id: 'frame_diamond_wings',
    name: 'Archangel Diamond Wings',
    category: 'frames',
    price: 8500,
    currency: 'coins',
    priceDisplay: '8,500',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
    badge: 'PREMIUM',
    rarity: 'epic',
    description: 'Crystalline wings that gently pulse with iridescent rainbow highlights.',
    benefits: ['Permanent profile decoration', 'Special badge in chat messages'],
  },

  // 4. Virtual Gifts
  {
    id: 'gift_super_yacht',
    name: 'Luxury Mega Yacht 3D',
    category: 'gifts',
    price: 18000,
    currency: 'coins',
    priceDisplay: '18,000',
    image: 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d17?w=400&auto=format&fit=crop&q=80',
    badge: '3D GIFT',
    rarity: 'epic',
    description: 'Send a magnificent 3D superyacht across the host screen with ocean waves and fireworks.',
    benefits: ['Full-screen 3D particle effect', 'Gives host 9,000 Diamonds', 'Level-up point explosion'],
  },
  {
    id: 'gift_space_rocket',
    name: 'Galactic Falcon Rocket',
    category: 'gifts',
    price: 50000,
    currency: 'coins',
    priceDisplay: '50,000',
    image: 'https://images.unsplash.com/photo-1517976487507-5b3b194d65c3?w=400&auto=format&fit=crop&q=80',
    badge: 'ULTRA RARE',
    rarity: 'mythic',
    description: 'Blast off a spacecraft that shakes the room and sends golden coins raining for all viewers to tap!',
    benefits: ['Broadcast to all active rooms', 'Spawns 5,000 coin lucky drops', 'Permanent top contributor title'],
    isPopular: true,
  },

  // 5. Coin Bundles
  {
    id: 'bundle_starter',
    name: 'Starter Fortune Pack',
    category: 'coins',
    price: 250,
    currency: 'diamonds',
    priceDisplay: '250 Diamonds',
    image: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=400&auto=format&fit=crop&q=80',
    badge: '+20% BONUS',
    rarity: 'common',
    description: 'Convert 250 Diamonds into 10,000 Coins with a 2,000 Coin bonus gift.',
    benefits: ['Instant coin conversion', 'Zero conversion fee', 'Immediate delivery'],
  },
  {
    id: 'bundle_whale',
    name: 'High Roller Treasury Pack',
    category: 'coins',
    price: 1200,
    currency: 'diamonds',
    priceDisplay: '1,200 Diamonds',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&auto=format&fit=crop&q=80',
    badge: 'BEST DEAL',
    rarity: 'legendary',
    description: 'Convert 1,200 Diamonds into 60,000 Coins plus a free 7-day Cyber Halo Frame.',
    benefits: ['60,000 Coins', 'Free 7-Day Frame bonus', 'Instant upgrade to VIP 2'],
    isPopular: true,
  },

  // 6. Creator Gear
  {
    id: 'gear_neon_stage',
    name: 'Neon Cyber DJ Stage Theme',
    category: 'gear',
    price: 12000,
    currency: 'coins',
    priceDisplay: '12,000',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80',
    badge: 'HOST GEAR',
    rarity: 'epic',
    description: 'Transform your audio party room into a cyberpunk underground club with animated laser lights.',
    benefits: ['Custom room background', 'Dynamic equalizer floor beats', 'Permanent room custom skin'],
  },
];

export const StoreScreen: React.FC<StoreScreenProps> = ({
  currentUser,
  onNavigate,
  onOpenWallet,
  onOpenVIP,
  onUpdateUserBalance,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccessMessage, setPurchaseSuccessMessage] = useState<string | null>(null);
  const [purchaseErrorMessage, setPurchaseErrorMessage] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Items', icon: Sparkles },
    { id: 'entrance', label: 'Entrance Effects', icon: Zap },
    { id: 'vip', label: 'VIP Passes', icon: Crown },
    { id: 'frames', label: 'Avatar Frames', icon: ShieldCheck },
    { id: 'gifts', label: '3D Gifts', icon: Gift },
    { id: 'coins', label: 'Coin Packs', icon: Coins },
    { id: 'gear', label: 'Stage Themes', icon: Flame },
  ];

  const filteredProducts = STORE_PRODUCTS.filter((prod) => {
    const matchesCategory = selectedCategory === 'all' || prod.category === selectedCategory;
    const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          prod.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartTotalCoins = cart.reduce((acc, item) => {
    if (item.product.currency === 'coins') return acc + item.product.price * item.quantity;
    return acc;
  }, 0);

  const cartTotalDiamonds = cart.reduce((acc, item) => {
    if (item.product.currency === 'diamonds') return acc + item.product.price * item.quantity;
    return acc;
  }, 0);

  const handleAddToCart = (product: StoreProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQ = item.quantity + delta;
            return newQ > 0 ? { ...item, quantity: newQ } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleDirectBuy = async (product: StoreProduct) => {
    setIsPurchasing(true);
    setPurchaseErrorMessage(null);
    try {
      const res = await purchaseStoreItem(currentUser.id, product, 1);
      if (res.success) {
        setPurchaseSuccessMessage(`Successfully purchased ${product.name}! Enjoy your exclusive reward.`);
        if (product.currency === 'coins' && onUpdateUserBalance) {
          onUpdateUserBalance(res.newBalance, currentUser.diamonds);
        } else if (product.currency === 'diamonds' && onUpdateUserBalance) {
          onUpdateUserBalance(currentUser.coins, res.newBalance);
        }
        setSelectedProduct(null);
        setTimeout(() => setPurchaseSuccessMessage(null), 4000);
      } else {
        setPurchaseErrorMessage(res.error || 'Failed to complete purchase');
        setTimeout(() => setPurchaseErrorMessage(null), 4000);
      }
    } catch (e: any) {
      setPurchaseErrorMessage(e?.message || 'Error executing purchase');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleCheckoutCart = async () => {
    if (cart.length === 0) return;
    setIsPurchasing(true);
    setPurchaseErrorMessage(null);

    let hadError = false;
    for (const item of cart) {
      const res = await purchaseStoreItem(currentUser.id, item.product, item.quantity);
      if (!res.success) {
        hadError = true;
        setPurchaseErrorMessage(res.error || `Purchase of ${item.product.name} failed`);
        break;
      }
    }

    if (!hadError) {
      setPurchaseSuccessMessage('All items purchased successfully! Check your inventory and profile.');
      setCart([]);
      setIsCartOpen(false);
      setTimeout(() => setPurchaseSuccessMessage(null), 4000);
    }
    setIsPurchasing(false);
  };

  return (
    <div className="min-h-screen bg-[#080511] text-white pb-24 md:pb-8 flex flex-col">
      {/* 1. Top Header */}
      <header className="sticky top-0 z-30 bg-[#0c0718]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('home')}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-black bg-gradient-to-r from-white via-purple-200 to-[#F328D5] bg-clip-text text-transparent flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#F328D5]" />
                Linzo Store
              </h1>
              <p className="text-[11px] text-[#A59AB8]">Exclusive Entrance Effects, VIP Passes & Virtual Rewards</p>
            </div>
          </div>

          {/* User Balances Strip & Cart */}
          <div className="flex items-center gap-2">
            {/* Coins Balance */}
            <div 
              onClick={onOpenWallet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30 cursor-pointer hover:border-amber-400 transition-colors"
              title="Click to recharge coins"
            >
              <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-xs font-bold text-amber-300">
                {currentUser.coins.toLocaleString()}
              </span>
              <Plus className="w-3.5 h-3.5 text-amber-400" />
            </div>

            {/* Diamonds Balance */}
            <div 
              onClick={onOpenWallet}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 cursor-pointer hover:border-cyan-400 transition-colors"
              title="Diamond earnings"
            >
              <Gem className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-300">
                {currentUser.diamonds.toLocaleString()}
              </span>
            </div>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative w-9 h-9 rounded-full bg-[#1b122c] border border-white/10 hover:border-[#F328D5] flex items-center justify-center transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart className="w-4 h-4 text-[#F328D5]" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#F328D5] text-[10px] font-black text-white flex items-center justify-center shadow-lg">
                  {cart.reduce((a, b) => a + b.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Success / Error Notification Toasts */}
      {purchaseSuccessMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-600/95 text-white px-5 py-2.5 rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.5)] border border-emerald-400 text-xs font-bold flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{purchaseSuccessMessage}</span>
        </div>
      )}
      {purchaseErrorMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-rose-600/95 text-white px-5 py-2.5 rounded-2xl shadow-[0_10px_30px_rgba(225,29,72,0.5)] border border-rose-400 text-xs font-bold flex items-center gap-2">
          <X className="w-4 h-4" />
          <span>{purchaseErrorMessage}</span>
        </div>
      )}

      {/* 2. Hero Promotion Banner */}
      <div className="max-w-6xl mx-auto w-full px-4 pt-4">
        <div className="relative rounded-3xl overflow-hidden p-6 md:p-8 bg-gradient-to-r from-[#2c0847] via-[#1a0e36] to-[#0a122e] border border-white/10 shadow-[0_15px_40px_rgba(139,32,255,0.2)]">
          <div className="absolute -right-8 -bottom-10 w-64 h-64 bg-[#F328D5]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-lg">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-[#F328D5]/20 text-[#ff7bf0] border border-[#F328D5]/30 mb-3">
              <Sparkles className="w-3 h-3" /> Season 4 Exclusive
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
              Dominant Room Entrances & VIP Privileges
            </h2>
            <p className="text-xs md:text-sm text-[#c0b4d6] mt-2 leading-relaxed">
              Equip legendary 3D animations, custom sound effects, and full screen banners that announce your presence everywhere in Linzo Live.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <button 
                onClick={() => setSelectedCategory('entrance')}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-bold shadow-[0_5px_15px_rgba(243,40,213,0.4)] active:scale-95 transition-all"
              >
                Explore Entrances
              </button>
              <button 
                onClick={onOpenVIP}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 active:scale-95 transition-all"
              >
                VIP Benefits
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search Bar & Horizontal Category Tabs */}
      <div className="max-w-6xl mx-auto w-full px-4 mt-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e82a3]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search effects, VIP passes, gifts, frames..."
            className="w-full bg-[#120a21] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#786c8f] focus:outline-none focus:border-[#F328D5] transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-3 mt-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-[0_4px_12px_rgba(243,40,213,0.4)]'
                    : 'bg-[#150d24] text-[#A59AB8] hover:text-white hover:bg-[#1f1336] border border-white/[0.06]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#A59AB8]'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Products Grid */}
      <div className="max-w-6xl mx-auto w-full px-4 mt-3 flex-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {filteredProducts.map((prod) => {
            const rarityColors: Record<string, string> = {
              common: 'text-gray-300 border-gray-600/40 bg-gray-600/10',
              rare: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
              epic: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
              legendary: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
              mythic: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
            };

            return (
              <div
                key={prod.id}
                className="group relative rounded-2xl bg-[#110a20] border border-white/[0.08] hover:border-[#F328D5]/60 transition-all overflow-hidden flex flex-col justify-between"
              >
                {/* Badge */}
                {prod.badge && (
                  <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md">
                    {prod.badge}
                  </div>
                )}

                {/* Rarity */}
                {prod.rarity && (
                  <div className={`absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase border ${rarityColors[prod.rarity] || ''}`}>
                    {prod.rarity}
                  </div>
                )}

                {/* Image & Quick Preview trigger */}
                <div 
                  onClick={() => setSelectedProduct(prod)}
                  className="relative aspect-square w-full overflow-hidden bg-black/40 cursor-pointer"
                >
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#110a20] via-transparent to-transparent opacity-80" />
                  <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>

                {/* Details */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 
                      onClick={() => setSelectedProduct(prod)}
                      className="text-xs md:text-sm font-bold text-white group-hover:text-[#F328D5] transition-colors truncate cursor-pointer"
                    >
                      {prod.name}
                    </h3>
                    <p className="text-[10px] text-[#9a8ea8] line-clamp-2 mt-1 leading-normal">
                      {prod.description}
                    </p>
                  </div>

                  {/* Price & Actions */}
                  <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {prod.currency === 'coins' ? (
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Gem className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span className="text-xs font-black text-white">
                        {prod.priceDisplay}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAddToCart(prod)}
                        title="Add to cart"
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors active:scale-95"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDirectBuy(prod)}
                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#8B20FF] to-[#F328D5] hover:opacity-90 text-[10px] font-bold text-white shadow-sm active:scale-95 transition-all"
                      >
                        Buy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Product Preview & Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-[#140b25] border border-white/15 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Product Image Banner */}
            <div className="relative h-56 w-full bg-black/50 overflow-hidden">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#140b25] via-transparent to-transparent" />
              {selectedProduct.badge && (
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-[#F328D5] text-white">
                  {selectedProduct.badge}
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto no-scrollbar space-y-4">
              <div>
                <h2 className="text-lg font-black text-white">{selectedProduct.name}</h2>
                <p className="text-xs text-[#b0a3c4] mt-1">{selectedProduct.description}</p>
              </div>

              {/* Benefits */}
              {selectedProduct.benefits && (
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] space-y-2">
                  <h4 className="text-xs font-bold text-[#F328D5] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Perks & Privileges Included
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedProduct.benefits.map((b, i) => (
                      <li key={i} className="text-[11px] text-[#d6cce6] flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Price Row */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-purple-900/30 to-pink-900/20 border border-purple-500/20">
                <span className="text-xs text-[#a99cbf]">Total Price:</span>
                <div className="flex items-center gap-1.5">
                  {selectedProduct.currency === 'coins' ? (
                    <Coins className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Gem className="w-4 h-4 text-cyan-400" />
                  )}
                  <span className="text-base font-black text-white">{selectedProduct.priceDisplay}</span>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    handleAddToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-95"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add to Cart
                </button>
                <button
                  disabled={isPurchasing}
                  onClick={() => handleDirectBuy(selectedProduct)}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#c415f5] text-white text-xs font-bold shadow-[0_4px_20px_rgba(243,40,213,0.5)] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  {isPurchasing ? 'Processing...' : 'Unlock Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Shopping Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in">
          <div className="w-full max-w-md h-full bg-[#120a22] border-l border-white/10 flex flex-col p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#F328D5]" />
                <h3 className="text-base font-black text-white">Your Shopping Cart</h3>
                <span className="text-xs text-[#a99cbf]">({cart.length} items)</span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#9a8cae]">
                  <ShoppingBag className="w-12 h-12 stroke-[1.2] opacity-40 mb-3 text-[#F328D5]" />
                  <p className="text-sm font-semibold text-white">Your cart is empty</p>
                  <p className="text-xs mt-1">Explore our exclusive entrance effects, frames, and VIP passes!</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-3 rounded-2xl bg-[#1a0e30] border border-white/[0.06] flex items-center gap-3"
                  >
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-14 h-14 rounded-xl object-cover bg-black/40"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{item.product.name}</h4>
                      <div className="flex items-center gap-1 mt-1">
                        {item.product.currency === 'coins' ? (
                          <Coins className="w-3 h-3 text-amber-400" />
                        ) : (
                          <Gem className="w-3 h-3 text-cyan-400" />
                        )}
                        <span className="text-xs font-extrabold text-[#F328D5]">
                          {(item.product.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-[#251545] rounded-lg p-0.5 border border-white/10">
                        <button
                          onClick={() => handleUpdateQuantity(item.product.id, -1)}
                          className="w-6 h-6 flex items-center justify-center text-white hover:text-[#F328D5]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-white px-1.5">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.product.id, 1)}
                          className="w-6 h-6 flex items-center justify-center text-white hover:text-[#F328D5]"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleUpdateQuantity(item.product.id, -item.quantity)}
                        className="text-gray-400 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="pt-4 border-t border-white/[0.08] space-y-3">
                <div className="space-y-1.5">
                  {cartTotalCoins > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#a99cbf]">Coins Total:</span>
                      <div className="flex items-center gap-1 font-bold text-amber-300">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>{cartTotalCoins.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  {cartTotalDiamonds > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#a99cbf]">Diamonds Total:</span>
                      <div className="flex items-center gap-1 font-bold text-cyan-300">
                        <Gem className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{cartTotalDiamonds.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  disabled={isPurchasing}
                  onClick={handleCheckoutCart}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#c415f5] text-white text-xs font-black shadow-[0_6px_25px_rgba(243,40,213,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  {isPurchasing ? 'Processing Checkout...' : 'Confirm & Purchase All'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
