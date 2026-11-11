import React from 'react';
import { X, Trophy, Sparkles, Check, Crown, Flame, Gem, Shield, Star, Gift, ArrowRight } from 'lucide-react';
import { LevelBadge } from '../common/LevelBadge';

interface LevelTiersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: number;
}

export const LevelTiersModal: React.FC<LevelTiersModalProps> = ({
  isOpen,
  onClose,
  currentLevel,
}) => {
  if (!isOpen) return null;

  const tiers = [
    {
      range: 'Level 1 - 9',
      name: 'Bronze Star',
      levelSample: 5,
      gradient: 'from-amber-600 to-amber-800',
      description: 'New creator tier. Start your party journey, engage with audience, and receive first community gifts.',
      perks: ['Bronze Level Badge', 'Standard Stream Chat Access', 'Daily Free Gift Claim'],
    },
    {
      range: 'Level 10 - 24',
      name: 'Silver Knight',
      levelSample: 15,
      gradient: 'from-slate-300 via-slate-400 to-slate-500',
      description: 'Active broadcaster. Unlocks silver nickname highlights and early party room seat priority.',
      perks: ['Silver Shield Nickname Frame', 'Custom Chat Glow', '5% Bonus on Gifting Activity'],
    },
    {
      range: 'Level 25 - 49',
      name: 'Gold Champion',
      levelSample: 42,
      gradient: 'from-[#FFC84A] to-[#D97706]',
      description: 'Top-tier creator and party host. Unlocks golden crown room badge and acoustic sound entrance.',
      perks: ['Golden Crown Profile Badge', 'Special Sound Effect on Room Entry', '10% Bonus Diamonds on Gifts', 'Gold Badge in Host Chat'],
    },
    {
      range: 'Level 50 - 74',
      name: 'Platinum Legend',
      levelSample: 60,
      gradient: 'from-[#8B20FF] via-[#A855F7] to-[#F328D5]',
      description: 'Celebrity broadcaster. Unlocks radiant platinum entrance, animated stickers, and priority support.',
      perks: ['Platinum Shimmer Entrance', 'Exclusive Animated Stickers', '15% Gift Coin Cash-back', 'Dedicated VIP Fast-Lane Support'],
    },
    {
      range: 'Level 75 - 99',
      name: 'Diamond Master',
      levelSample: 85,
      gradient: 'from-[#06B6D4] via-[#3B82F6] to-[#8B20FF]',
      description: 'Elite superstar. Unlocks diamond chat bubble, 20% login coin boost, and VIP host privileges.',
      perks: ['Diamond Sparkle Chat Bubble', '20% Coin Bonus on Daily Login', 'Priority Guest Microphone Access', 'Diamond Crown Room Badge'],
    },
    {
      range: 'Level 100',
      name: 'Emperor Supreme',
      levelSample: 100,
      gradient: 'from-[#F328D5] via-[#8B20FF] to-[#FFC84A]',
      description: 'The pinnacle of Lonzo Party Live prestige (Max Level 100). Imperial dragon entrance and global join announcements.',
      perks: ['Imperial Dragon Entrance Animation', 'Custom 3D Profile Hologram Border', 'Global Banner Broadcast on Stream Join', 'Top Seat Override in Audio Rooms'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="w-full max-w-lg bg-[#160C25] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFC84A]/10 text-[#FFC84A] flex items-center justify-center">
              <Trophy className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">Creator Level Tiers</h3>
              <p className="text-[11px] text-[#B9AECF]">Progression milestones and exclusive unlocked privileges</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#211333] hover:bg-[#2e1a47] flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* How it Works Banner */}
        <div className="p-4 bg-gradient-to-r from-[#211333] to-[#2c1547] border-b border-white/[0.06] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F328D5]/20 text-[#F328D5] flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="font-bold text-white block">Gift-Based Level Progression:</span>
            <span className="text-[#B9AECF] text-[11px]">
              Every 1 Coin of gift value received adds 1 EXP directly to your level bar. Level thresholds unlock automatically upon reaching milestones!
            </span>
          </div>
        </div>

        {/* Tiers List */}
        <div className="p-4 sm:p-5 overflow-y-auto no-scrollbar flex-1 space-y-3">
          {tiers.map((tier, i) => {
            const isUserTier = 
              (tier.name === 'Bronze Star' && currentLevel < 10) ||
              (tier.name === 'Silver Knight' && currentLevel >= 10 && currentLevel < 25) ||
              (tier.name === 'Gold Champion' && currentLevel >= 25 && currentLevel < 50) ||
              (tier.name === 'Platinum Legend' && currentLevel >= 50 && currentLevel < 75) ||
              (tier.name === 'Diamond Master' && currentLevel >= 75 && currentLevel < 100) ||
              (tier.name === 'Emperor Supreme' && currentLevel >= 100);

            return (
              <div
                key={i}
                className={`p-4 rounded-2xl border transition-all ${
                  isUserTier
                    ? 'bg-gradient-to-br from-[#26133e] to-[#361858] border-[#FFC84A]/60 shadow-lg shadow-[#8B20FF]/20 ring-1 ring-[#FFC84A]/40'
                    : 'bg-[#211333]/90 border-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <LevelBadge level={tier.levelSample} size="sm" />
                    <span className="text-sm font-bold text-white font-display">{tier.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-[#FFC84A]">
                      {tier.range}
                    </span>
                    {isUserTier && (
                      <span className="px-2 py-0.5 rounded-full bg-[#FFC84A] text-[#090611] text-[9px] font-black uppercase">
                        Current
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#B9AECF] mb-3 leading-relaxed">
                  {tier.description}
                </p>

                <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
                  {tier.perks.map((perk, j) => (
                    <div key={j} className="flex items-center gap-2 text-[11px] text-white/90">
                      <Check className="w-3 h-3 text-[#FFC84A] shrink-0" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#160C25] border-t border-white/[0.08]">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-bold shadow-md hover:opacity-95 active:scale-95 transition-all"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
