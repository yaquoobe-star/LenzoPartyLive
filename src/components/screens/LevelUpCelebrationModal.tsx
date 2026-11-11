import React from 'react';
import { Sparkles, Trophy, Crown, ArrowRight, Check } from 'lucide-react';
import { LevelBadge } from '../common/LevelBadge';
import { getLevelTierDetails } from '../../utils/levelSystem';

interface LevelUpCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  oldLevel: number;
  newLevel: number;
  expGained: number;
}

export const LevelUpCelebrationModal: React.FC<LevelUpCelebrationModalProps> = ({
  isOpen,
  onClose,
  oldLevel,
  newLevel,
  expGained,
}) => {
  if (!isOpen) return null;

  const tierDetails = getLevelTierDetails(newLevel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="w-full max-w-sm bg-[#160C25] border border-[#FFC84A]/40 rounded-3xl p-6 shadow-2xl relative flex flex-col items-center text-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 w-48 h-48 bg-gradient-to-b from-[#FFC84A]/25 via-[#F328D5]/20 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Floating Celebration Emblem */}
        <div className="relative mb-3 mt-2">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#FFC84A] via-[#F328D5] to-[#8B20FF] p-[3px] shadow-[0_0_30px_rgba(255,200,74,0.6)] animate-bounce">
            <div className="w-full h-full rounded-full bg-[#160C25] flex items-center justify-center text-white">
              <Trophy className="w-10 h-10 text-[#FFC84A] fill-[#FFC84A]/20" />
            </div>
          </div>
          <span className="absolute -top-1 -right-1 text-2xl animate-spin">
            ✨
          </span>
        </div>

        <span className="text-[11px] font-black tracking-widest uppercase text-[#FFC84A] mb-1 bg-[#FFC84A]/10 px-3 py-1 rounded-full border border-[#FFC84A]/30">
          Level Up Milestone!
        </span>

        <h3 className="text-2xl font-black text-white font-display mb-1">
          Congratulations!
        </h3>

        <p className="text-xs text-[#B9AECF] mb-4">
          Gifting activity contributed <span className="text-white font-bold font-mono">+{expGained.toLocaleString()} EXP</span> to your creator status!
        </p>

        {/* Transition: Old Level -> New Level */}
        <div className="flex items-center justify-center gap-3 w-full p-3 rounded-2xl bg-[#211333] border border-white/10 mb-4">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-[#B9AECF] mb-1">Previous</span>
            <LevelBadge level={oldLevel} size="sm" />
          </div>

          <ArrowRight className="w-4 h-4 text-[#FFC84A] stroke-[3]" />

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-[#FFC84A] font-bold mb-1">New Rank</span>
            <LevelBadge level={newLevel} size="md" showTierName={true} />
          </div>
        </div>

        {/* Perks Unlocked */}
        <div className="w-full text-left mb-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B9AECF] block mb-1.5 px-1">
            Unlocked Privileges:
          </span>
          <div className="space-y-1.5">
            {tierDetails.perks.slice(0, 2).map((perk, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-white/90 bg-[#090611] p-2 rounded-xl border border-white/5">
                <Check className="w-3.5 h-3.5 text-[#FFC84A] shrink-0" />
                <span className="truncate">{perk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Claim Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FFC84A] via-[#F59E0B] to-[#F328D5] text-[#090611] font-black text-xs shadow-xl shadow-[#FFC84A]/30 active:scale-95 transition-all"
        >
          Claim & Continue
        </button>
      </div>
    </div>
  );
};
