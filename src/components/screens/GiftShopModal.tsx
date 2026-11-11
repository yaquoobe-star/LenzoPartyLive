import React, { useState, useMemo } from 'react';
import { 
  X, 
  ArrowLeft, 
  Plus, 
  Sparkles, 
  AlertCircle, 
  Check, 
  Send,
  Search,
  Filter
} from 'lucide-react';
import { GiftItem, UserProfile } from '../../types';
import { COIN_CONFIG } from '../../utils/coinConfig';
import { ALL_500_GIFTS, GIFT_CATEGORIES } from '../../data/giftCatalog';

interface GiftShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  recipientUser?: UserProfile | null;
  gifts?: GiftItem[];
  onSendGift: (gift: GiftItem, quantity: number, recipient: UserProfile) => void;
  onOpenWallet: () => void;
}

export const GiftShopModal: React.FC<GiftShopModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  recipientUser,
  gifts = ALL_500_GIFTS,
  onSendGift,
  onOpenWallet,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGift, setSelectedGift] = useState<GiftItem>(ALL_500_GIFTS[0]);
  const [quantity, setQuantity] = useState<number>(1);
  const [insufficientBalance, setInsufficientBalance] = useState(false);

  // Filter gifts by Category and Search, with lazy limit for maximum performance
  const filteredGifts = useMemo(() => {
    let list = ALL_500_GIFTS;
    if (activeCategory !== 'All') {
      list = list.filter((g) => {
        if (activeCategory === 'Flowers') return ['Rose', 'Tulip', 'Bouquet', 'Sunflower', 'Lily', 'Orchid', 'Jasmine', 'Lavender', 'Lotus', 'Blossom'].some(k => g.name.includes(k));
        if (activeCategory === 'Love' || activeCategory === 'Hearts') return g.category === 'Love' || g.name.includes('Heart') || g.name.includes('Love');
        if (activeCategory === 'Cute' || activeCategory === 'Animals') return ['Teddy', 'Kitty', 'Cat', 'Dog', 'Puppy', 'Panda', 'Lion', 'Unicorn', 'Dolphin', 'Eagle', 'Chick', 'Bunny'].some(k => g.name.includes(k));
        if (activeCategory === 'Luxury') return g.category === 'Luxury' || g.coins >= 1000;
        if (activeCategory === 'Cars' || activeCategory === 'Bikes') return ['Car', 'Bike', 'Racer', 'Drift', 'SUV', 'GT', 'Falcon'].some(k => g.name.includes(k));
        if (activeCategory === 'Royal') return ['Crown', 'Castle', 'Dragon', 'Imperial', 'King', 'Queen', 'Excalibur', 'Palace'].some(k => g.name.includes(k));
        if (activeCategory === 'Animated' || activeCategory === 'Special') return g.animationType === 'blast' || g.animationType === 'glow';
        return g.category === activeCategory;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((g) => g.name.toLowerCase().includes(q) || g.coins.toString().includes(q));
    }

    return list.slice(0, 120); // Performant chunk display
  }, [activeCategory, searchQuery]);

  if (!isOpen) return null;

  const targetRecipient = recipientUser || currentUser;
  const totalCost = (selectedGift?.coins || 0) * quantity;

  const handleSend = () => {
    if (currentUser.coins < totalCost) {
      setInsufficientBalance(true);
      return;
    }

    onSendGift(selectedGift, quantity, targetRecipient);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="w-full max-w-lg bg-[#160C25] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[90vh] shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab handle */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-2 sm:hidden" />

        {/* Insufficient Balance Dialog Overlay */}
        {insufficientBalance && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white font-display mb-1">Insufficient Coins</h3>
            <p className="text-xs text-[#B9AECF] mb-4 max-w-xs">
              You need <span className="text-[#FFC84A] font-bold font-mono">{totalCost.toLocaleString()} coins</span> to send this gift, but your balance is <span className="text-white font-bold font-mono">{currentUser.coins.toLocaleString()}</span>.
            </p>
            <div className="flex gap-2.5 w-full max-w-xs">
              <button
                onClick={() => setInsufficientBalance(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setInsufficientBalance(false);
                  onClose();
                  onOpenWallet();
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] text-xs font-black shadow-lg shadow-amber-500/20"
              >
                Recharge Now
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F328D5]/20 flex items-center justify-center text-[#F328D5]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display leading-tight">
                Gift Shop
                <span className="ml-1.5 text-[10px] text-[#FFC84A] font-mono font-semibold">
                  (500+ Gifts)
                </span>
              </h3>
              <span className="text-[10px] text-[#B9AECF]">
                To: <span className="text-white font-bold">{targetRecipient.name}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Coin Balance Pill with '+' */}
            <div 
              onClick={() => {
                onClose();
                onOpenWallet();
              }}
              className="flex items-center gap-1.5 bg-[#211333] hover:bg-[#2c1745] border border-[#FFC84A]/30 rounded-full px-3 py-1 cursor-pointer transition-colors"
            >
              <span>🪙</span>
              <span className="text-xs font-bold text-[#FFC84A] font-mono">
                {currentUser.coins.toLocaleString()}
              </span>
              <Plus className="w-3.5 h-3.5 text-[#FFC84A] stroke-[3]" />
            </div>

            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Tabs (500 gift organized categories) */}
        <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar border-b border-white/[0.06] bg-[#090611]/40">
          {GIFT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md shadow-[#F328D5]/30'
                  : 'bg-[#211333] text-[#B9AECF] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search input inside gift shop */}
        <div className="px-3 py-1.5 bg-[#160C25] border-b border-white/[0.04]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#B9AECF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search 500+ animated gifts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-full pl-8 pr-3 py-1 text-xs text-white placeholder-[#B9AECF]/50 outline-none focus:border-[#F328D5]"
            />
          </div>
        </div>

        {/* 500-Gift Grid (3 columns, responsive, lazy loaded) */}
        <div className="p-3 overflow-y-auto no-scrollbar flex-1 grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {filteredGifts.map((gift) => {
            const isSelected = selectedGift?.id === gift.id;
            return (
              <div
                key={gift.id}
                onClick={() => setSelectedGift(gift)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl cursor-pointer transition-all active:scale-95 text-center relative ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#2d1747] to-[#3a1b5d] border-2 border-[#F328D5] shadow-lg shadow-[#F328D5]/25'
                    : 'bg-[#211333]/80 hover:bg-[#28173e] border border-white/5'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-1 transition-transform ${
                  isSelected ? 'scale-110 drop-shadow-[0_0_10px_rgba(243,40,213,0.7)]' : ''
                }`}>
                  {gift.icon}
                </div>

                <span className="text-[11px] font-bold text-white truncate max-w-full mb-0.5">
                  {gift.name}
                </span>

                <div className="flex items-center gap-1 text-[10px] font-bold text-[#FFC84A] font-mono">
                  <span>🪙</span>
                  <span>{gift.coins.toLocaleString()}</span>
                </div>

                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-[#F328D5] text-white flex items-center justify-center shadow">
                    <Check className="w-2 h-2 stroke-[3]" />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Bar: Quantity Selector, Reference Pricing, and Send Action */}
        <div className="p-3 bg-[#0c0717] border-t border-white/[0.08] flex items-center justify-between gap-3">
          {/* Quantity multipliers */}
          <div className="flex items-center gap-1">
            {[1, 5, 10, 66, 99].map((q) => (
              <button
                key={q}
                onClick={() => setQuantity(q)}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                  quantity === q
                    ? 'bg-[#F328D5] text-white'
                    : 'bg-white/5 text-[#B9AECF] hover:bg-white/10'
                }`}
              >
                {q}x
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="block text-xs font-black text-[#FFC84A] font-mono">
                🪙 {totalCost.toLocaleString()}
              </span>
              <span className="block text-[9px] text-[#B9AECF]">
                ≈ PKR {(totalCost * 2).toLocaleString()}
              </span>
            </div>

            <button
              onClick={handleSend}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] text-white text-xs font-black shadow-lg shadow-[#F328D5]/30 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
