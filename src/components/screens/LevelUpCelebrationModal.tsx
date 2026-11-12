import React from 'react';
import { Sparkles, Trophy, Crown, ArrowRight, Check, Zap } from 'lucide-react';
import { LevelBadge } from '../common/LevelBadge';
import { getLevelDefinition, VIP_FRAME_DEFINITIONS } from '../../utils/levelAndVipConfig';
import { AvatarWithFrame } from '../common/AvatarWithFrame';

interface LevelUpCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  oldLevel: number;
  newLevel: number;
  coinsSpent?: number;
  userAvatar?: string;
  userName?: string;
  onEquipVipFrame?: (tier: number) => void;
}

export const LevelUpCelebrationModal: React.FC<LevelUpCelebrationModalProps> = ({
  isOpen,
  onClose,
  oldLevel,
  newLevel,
  coinsSpent = 0,
  userAvatar,
  userName,
  onEquipVipFrame,
}) => {
  if (!isOpen) return null;

  const levelDef = getLevelDefinition(newLevel);
  // Check if a VIP frame was unlocked at this level milestone (levels 6, 12, 18, 24, 30, 36, 42, 48)
  const unlockedVipFrame = VIP_FRAME_DEFINITIONS.find(f => f.unlockLevel === newLevel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="w-full max-w-sm bg-[#160C25] border border-[#FFC84A]/60 rounded-3xl p-6 shadow-2xl relative flex flex-col items-center text-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 w-60 h-60 bg-gradient-to-b from-[#FFC84A]/30 via-[#F328D5]/25 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Floating Celebration Emblem */}
        <div className="relative mb-2 mt-1">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#FFC84A] via-[#F328D5] to-[#8B20FF] p-[3px] shadow-[0_0_35px_rgba(255,200,74,0.7)] animate-bounce">
            <div className="w-full h-full rounded-full bg-[#160C25] flex items-center justify-center text-white">
              <Trophy className="w-10 h-10 text-[#FFC84A] fill-[#FFC84A]/20" />
            </div>
          </div>
          <span className="absolute -top-1 -right-1 text-2xl animate-spin">
            ✨
          </span>
        </div>

        <span className="text-[11px] font-black tracking-widest uppercase text-[#FFC84A] mb-1 bg-[#FFC84A]/10 px-3 py-1 rounded-full border border-[#FFC84A]/40">
          NEW LEVEL UNLOCKED!
        </span>

        <h3 className="text-2xl font-black text-white font-display mb-1">
          Level {newLevel} Reached!
        </h3>

        <p className="text-xs text-[#B9AECF] mb-3">
          Gifting contribution: <span className="text-white font-bold font-mono">+{coinsSpent.toLocaleString()} Coins</span>!
        </p>

        {/* Transition: Old Level -> New Level */}
        <div className="flex items-center justify-center gap-3 w-full p-3 rounded-2xl bg-[#211333] border border-white/10 mb-3">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-[#B9AECF] mb-1">Previous</span>
            <LevelBadge level={oldLevel} size="sm" />
          </div>

          <ArrowRight className="w-4 h-4 text-[#FFC84A] stroke-[3]" />

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-[#FFC84A] font-bold mb-1">New Rank</span>
            <LevelBadge level={newLevel} size="lg" showTierName={true} />
          </div>
        </div>

        {/* VIP FRAME UNLOCKED MILESTONE NOTIFICATION */}
        {unlockedVipFrame && (
          <div className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#311153] to-[#1e0b36] border-2 border-[#FFC84A] mb-3 shadow-[0_0_20px_rgba(255,200,74,0.4)] flex flex-col items-center text-center">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#FFC84A] uppercase tracking-wider mb-2">
              <Crown className="w-4 h-4" />
              <span>VIP FRAME UNLOCKED!</span>
            </div>

            <div className="my-1">
              <AvatarWithFrame
                src={userAvatar}
                name={userName || 'VIP'}
                level={newLevel}
                vipLevel={unlockedVipFrame.tier}
                isVIP={true}
                size="md"
                showFrame={true}
                showVipBadge={false}
              />
            </div>

            <h4 className="text-xs font-extrabold text-white mt-1">
              {unlockedVipFrame.name}
            </h4>
            <p className="text-[10px] text-[#D8CFEB] max-w-xs mt-0.5">
              {unlockedVipFrame.perks[0]}
            </p>

            {onEquipVipFrame && (
              <button
                onClick={() => {
                  onEquipVipFrame(unlockedVipFrame.tier);
                  onClose();
                }}
                className="mt-2.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#FFC84A] to-[#FA26A0] text-black font-black text-xs shadow-md shadow-pink-900/30 hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>EQUIP NOW</span>
              </button>
            )}
          </div>
        )}

        {/* Level Perks */}
        <div className="w-full text-left mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B9AECF] block mb-1 px-1">
            {levelDef.name} Privileges:
          </span>
          <div className="space-y-1">
            {levelDef.perks.slice(0, 2).map((perk, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-white/90 bg-[#090611] p-2 rounded-xl border border-white/5">
                <Check className="w-3.5 h-3.5 text-[#FFC84A] shrink-0" />
                <span className="truncate">{perk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Claim / Continue Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FFC84A] via-[#F59E0B] to-[#F328D5] text-[#090611] font-black text-xs shadow-xl shadow-[#FFC84A]/30 active:scale-95 transition-all"
        >
          Claim &amp; Continue
        </button>
      </div>
    </div>
  );
};
