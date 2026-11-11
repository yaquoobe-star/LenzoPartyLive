import React, { useState } from 'react';
import { 
  X, 
  Crown, 
  Sparkles, 
  Check, 
  ShieldCheck, 
  Zap, 
  Flame, 
  Star 
} from 'lucide-react';
import { UserProfile } from '../../types';

interface VIPModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpgradeVIP: (newLevel: number) => void;
}

export const VIPModal: React.FC<VIPModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpgradeVIP,
}) => {
  const [selectedTier, setSelectedTier] = useState<number>(currentUser.vipLevel || 4);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const vipTiers = [
    {
      level: 1,
      name: 'VIP Bronze',
      gradient: 'from-amber-700 to-amber-900',
      price: '5,000 Coins / mo',
      cost: 5000,
      benefits: [
        'Bronze Crown Profile Badge',
        'Distinct Bronze Chat Nickname',
        'Standard Broadcast Entrance',
      ]
    },
    {
      level: 2,
      name: 'VIP Silver',
      gradient: 'from-slate-400 to-slate-600',
      price: '15,000 Coins / mo',
      cost: 15000,
      benefits: [
        'Silver Crown Profile Badge',
        'Special Sound Effect on Entry',
        '5% Extra Diamonds on Gifts',
        'Silver Avatar Frame',
      ]
    },
    {
      level: 3,
      name: 'VIP Gold',
      gradient: 'from-[#FFC84A] to-[#D97706]',
      price: '30,000 Coins / mo',
      cost: 30000,
      benefits: [
        'Golden Crown & Wings Badge',
        'Exclusive Animated Chat Bubble',
        '10% Gift Shop Bonus',
        'Priority Audio Room Seating',
      ]
    },
    {
      level: 4,
      name: 'VIP Platinum',
      gradient: 'from-[#8B20FF] via-[#F328D5] to-[#FFC84A]',
      price: '60,000 Coins / mo',
      cost: 60000,
      benefits: [
        'Full Platinum Dragon Entrance Effect',
        'Stealth Mode (Incognito Room Visit)',
        '15% Gift Coin Cashback',
        '24/7 Dedicated Concierge Support',
        'Exclusive Platinum Badge & Crown',
      ]
    },
    {
      level: 5,
      name: 'VIP Diamond Emperor',
      gradient: 'from-[#06B6D4] via-[#8B20FF] to-[#F328D5]',
      price: '150,000 Coins / mo',
      cost: 150000,
      benefits: [
        'Supreme Emperor Floating Castle Arrival',
        'Custom 3D Profile Frame',
        'Global Announcement on Stream Entry',
        '25% Gift Coin Cashback',
        'Unrestricted Host Seating Privilege',
      ]
    }
  ];

  const currentTierData = vipTiers.find((t) => t.level === selectedTier) || vipTiers[3];

  const handleUpgrade = () => {
    onUpgradeVIP(selectedTier);
    setToastMessage(`Congratulations! You are now ${currentTierData.name}! 👑`);
    setTimeout(() => {
      setToastMessage(null);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="w-full max-w-lg bg-[#160C25] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-[#8B20FF] text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-[#8B20FF]/50 text-center animate-bounce">
            {toastMessage}
          </div>
        )}

        {/* Header Bar */}
        <div className="p-4 sm:p-5 pb-3 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFC84A]/10 text-[#FFC84A] flex items-center justify-center">
              <Crown className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">VIP Membership Privileges</h3>
              <p className="text-[11px] text-[#B9AECF]">Elevate your status across Lonzo Party Live</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#211333] hover:bg-[#2e1a47] flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tier Cards Horizontal Selector */}
        <div className="p-4 border-b border-white/[0.06] overflow-x-auto no-scrollbar flex items-center gap-2.5">
          {vipTiers.map((tier) => {
            const isSelected = selectedTier === tier.level;
            const isCurrent = currentUser.vipLevel === tier.level;

            return (
              <button
                key={tier.level}
                onClick={() => setSelectedTier(tier.level)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white border-[#F328D5] shadow-lg shadow-[#F328D5]/20 scale-105'
                    : 'bg-[#211333] text-[#B9AECF] border-white/5 hover:text-white'
                }`}
              >
                <Crown className={`w-3.5 h-3.5 ${isSelected ? 'fill-current text-[#FFC84A]' : ''}`} />
                <span>VIP {tier.level}</span>
                {isCurrent && (
                  <span className="text-[9px] bg-white text-[#090611] font-black px-1.5 rounded-full">
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tier Showcase Card */}
        <div className="p-4 sm:p-6 overflow-y-auto no-scrollbar flex-1 space-y-4">
          <div className={`p-5 rounded-3xl bg-gradient-to-r ${currentTierData.gradient} text-white shadow-xl relative overflow-hidden`}>
            {/* Background sparkle icon */}
            <Crown className="absolute -bottom-6 -right-6 w-36 h-36 opacity-15 fill-current pointer-events-none" />

            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-xs font-black tracking-widest uppercase bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                Tier {currentTierData.level} Status
              </span>
              <span className="text-xs font-bold font-mono">
                {currentTierData.price}
              </span>
            </div>

            <h4 className="text-2xl font-black font-display mb-1 relative z-10">
              {currentTierData.name}
            </h4>
            <p className="text-xs text-white/80 relative z-10">
              Unlock prestigious animations, animated entrance titles, and gift discounts.
            </p>
          </div>

          {/* Privileges Checklist */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-[#B9AECF] uppercase tracking-wider px-1">
              Privileges & Privileged Perks:
            </h5>

            <div className="space-y-2">
              {currentTierData.benefits.map((benefit, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-[#211333] border border-white/5"
                >
                  <div className="w-7 h-7 rounded-full bg-[#FFC84A]/10 text-[#FFC84A] flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-medium text-white">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom CTA Button */}
        <div className="p-4 bg-[#160C25] border-t border-white/[0.08]">
          <button
            onClick={handleUpgrade}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FFC84A] via-[#F59E0B] to-[#F328D5] text-[#090611] font-black text-sm shadow-xl shadow-[#FFC84A]/25 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4 fill-current" />
            <span>
              {currentUser.vipLevel === currentTierData.level
                ? 'Renew Current VIP Privileges'
                : `Activate ${currentTierData.name}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
