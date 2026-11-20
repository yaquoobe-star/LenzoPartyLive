import React from 'react';
import { Trophy, Crown, ArrowRight, Check, Zap, Sparkles, Award } from 'lucide-react';
import { LevelBadge } from '../common/LevelBadge';
import {
  getLevelDefinition,
  SUPER_VIP_TIER_DEFINITIONS,
  VIP_FRAME_DEFINITIONS,
} from '../../utils/levelAndVipConfig';
import { AvatarWithFrame, SuperVipTierBadge, VipTierBadge } from '../common/AvatarWithFrame';
import { AchievementBadgeDefinition, SuperVipTierDefinition, VipTierDefinition } from '../../types/levelAndVip';
import { AchievementBadgeEmblem } from '../common/AchievementBadgeArt';
import { LevelEmblemBadge } from '../common/LevelEmblemBadge';

interface LevelUpCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  oldLevel: number;
  newLevel: number;
  coinsSpent?: number;
  userAvatar?: string;
  userName?: string;
  unlockedVipFrames?: VipTierDefinition[];
  unlockedSuperVipFrames?: SuperVipTierDefinition[];
  newlyEarnedAchievements?: AchievementBadgeDefinition[];
  onEquipVipFrame?: (tier: number) => void;
  onEquipSuperVipFrame?: (tier: number) => void;
  onOpenRoadmap?: () => void;
}

export const LevelUpCelebrationModal: React.FC<LevelUpCelebrationModalProps> = ({
  isOpen,
  onClose,
  oldLevel,
  newLevel,
  coinsSpent = 0,
  userAvatar,
  userName,
  unlockedVipFrames,
  unlockedSuperVipFrames,
  newlyEarnedAchievements = [],
  onEquipVipFrame,
  onEquipSuperVipFrame,
  onOpenRoadmap,
}) => {
  if (!isOpen) return null;

  const levelDef = getLevelDefinition(newLevel);

  // Derive crossed VIP & Super VIP frames if caller didn't explicitly pass arrays
  const resolvedVipFrames =
    unlockedVipFrames && unlockedVipFrames.length > 0
      ? unlockedVipFrames
      : VIP_FRAME_DEFINITIONS.filter((f) => f.unlockLevel > oldLevel && f.unlockLevel <= newLevel);

  const resolvedSuperVipFrames =
    unlockedSuperVipFrames && unlockedSuperVipFrames.length > 0
      ? unlockedSuperVipFrames
      : SUPER_VIP_TIER_DEFINITIONS.filter((f) => f.unlockLevel > oldLevel && f.unlockLevel <= newLevel);

  const featuredVip = resolvedVipFrames[resolvedVipFrames.length - 1];
  const featuredSuperVip = resolvedSuperVipFrames[resolvedSuperVipFrames.length - 1];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#140B24] border border-[#FFC84A]/60 rounded-3xl p-5 sm:p-6 shadow-2xl relative flex flex-col items-center text-center overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Glow */}
        <div
          className="absolute top-0 w-72 h-56 rounded-full blur-3xl pointer-events-none opacity-45"
          style={{ background: levelDef.gradientCss }}
        />

        {/* Celebration Emblem */}
        <div className="relative mb-2 mt-1">
          <div className="w-18 h-18 rounded-full bg-gradient-to-tr from-[#FFC84A] via-[#FA26A0] to-[#8B20FF] p-[3px] shadow-[0_0_30px_rgba(255,200,74,0.6)]">
            <div className="w-full h-full rounded-full bg-[#140B24] flex items-center justify-center text-white p-3">
              <Trophy className="w-9 h-9 text-[#FFC84A]" />
            </div>
          </div>
        </div>

        <span className="text-[10px] font-black tracking-widest uppercase text-[#FFC84A] mb-1 bg-[#FFC84A]/10 px-3 py-1 rounded-full border border-[#FFC84A]/40">
          LEVEL UP MILESTONE
        </span>

        <h3 className="text-2xl font-black text-white font-display">
          Level {newLevel} Reached!
        </h3>

        {coinsSpent > 0 && (
          <p className="text-xs text-[#C5B9DE] mt-1 mb-3">
            Qualifying spend:{' '}
            <span className="text-white font-bold font-mono tabular-nums">
              +{coinsSpent.toLocaleString()} Coins
            </span>
          </p>
        )}

        {/* Previous -> New Level Badge Transition */}
        <div className="flex items-center justify-center gap-4 w-full p-3.5 rounded-2xl bg-[#1E1036] border border-white/10 mb-3">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-[#B9AECF] mb-1">Previous</span>
            <LevelEmblemBadge level={oldLevel} size="sm" />
            <span className="text-[10px] font-bold text-[#C5B9DE] mt-0.5 tabular-nums">Lv.{oldLevel}</span>
          </div>

          <ArrowRight className="w-5 h-5 text-[#FFC84A] stroke-[3]" />

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-[#FFC84A] font-bold mb-1">New Level Emblem</span>
            <LevelEmblemBadge level={newLevel} size="lg" />
            <LevelBadge level={newLevel} size="sm" showTierName={true} className="mt-1" />
          </div>
        </div>

        {/* Newly Unlocked Super VIP Frame Showcase */}
        {featuredSuperVip && (
          <div className="w-full p-3.5 rounded-2xl bg-gradient-to-br from-[#2E0F54] to-[#17092B] border-2 border-fuchsia-400/70 mb-3 shadow-lg flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-fuchsia-200 uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-[#FFC84A]" />
              <span>
                {resolvedSuperVipFrames.length > 1
                  ? `${resolvedSuperVipFrames.length} SUPER VIP FRAMES UNLOCKED!`
                  : 'SUPER VIP FRAME UNLOCKED!'}
              </span>
            </div>

            <AvatarWithFrame
              src={userAvatar}
              name={userName || 'Super VIP'}
              superVipLevel={featuredSuperVip.tier}
              activeFrameType="super_vip"
              size="lg"
              showFrame={true}
              showVipBadge={false}
            />

            <div className="mt-2 flex items-center gap-1.5">
              <SuperVipTierBadge tier={featuredSuperVip.tier} size="xs" />
              <span className="text-xs font-extrabold text-white">{featuredSuperVip.frameName}</span>
            </div>

            {onEquipSuperVipFrame && (
              <button
                onClick={() => {
                  onEquipSuperVipFrame(featuredSuperVip.tier);
                  onClose();
                }}
                style={{ background: featuredSuperVip.gradientCss }}
                className="mt-2.5 px-4 py-1.5 rounded-xl text-white font-black text-xs shadow-md hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Equip Super VIP Frame</span>
              </button>
            )}
          </div>
        )}

        {/* Newly Unlocked VIP Frame Showcase */}
        {featuredVip && (
          <div className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#2D1708] to-[#1D0D35] border border-[#FFC84A]/70 mb-3 flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-[#FFC84A] uppercase tracking-wider mb-2">
              <Crown className="w-4 h-4" />
              <span>
                {resolvedVipFrames.length > 1
                  ? `${resolvedVipFrames.length} VIP FRAMES UNLOCKED!`
                  : 'VIP FRAME UNLOCKED!'}
              </span>
            </div>

            <AvatarWithFrame
              src={userAvatar}
              name={userName || 'VIP'}
              vipLevel={featuredVip.tier}
              activeFrameType="vip"
              size="md"
              showFrame={true}
              showVipBadge={false}
            />

            <div className="mt-2 flex items-center gap-1.5">
              <VipTierBadge tier={featuredVip.tier} size="xs" />
              <span className="text-xs font-extrabold text-white">{featuredVip.frameName}</span>
            </div>

            {onEquipVipFrame && (
              <button
                onClick={() => {
                  onEquipVipFrame(featuredVip.tier);
                  onClose();
                }}
                className="mt-2.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] font-black text-xs shadow-md hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Equip VIP Frame</span>
              </button>
            )}
          </div>
        )}

        {/* Newly Earned Achievements */}
        {newlyEarnedAchievements.length > 0 && (
          <div className="w-full p-3 rounded-2xl bg-white/[0.04] border border-white/10 mb-3 text-left space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#FFC84A] flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              <span>Achievements Unlocked</span>
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {newlyEarnedAchievements.map((ach) => (
                <div
                  key={ach.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10"
                >
                  <AchievementBadgeEmblem
                    shape={ach.shape}
                    iconKey={ach.iconKey}
                    accentFrom={ach.accentFrom}
                    accentTo={ach.accentTo}
                    borderHex={ach.borderHex}
                    isEarned={true}
                    size="xs"
                  />
                  <span className="text-xs font-bold text-white">{ach.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Level Perks */}
        <div className="w-full text-left mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B9AECF] block mb-1 px-1">
            {levelDef.title} ({levelDef.tierName}) Privileges:
          </span>
          <div className="space-y-1">
            {levelDef.perks.slice(0, 2).map((perk, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-white/90 bg-[#090611] px-2.5 py-2 rounded-xl border border-white/5"
              >
                <Check className="w-3.5 h-3.5 text-[#FFC84A] shrink-0" />
                <span className="truncate">{perk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex gap-2">
          {onOpenRoadmap && (
            <button
              onClick={() => {
                onClose();
                onOpenRoadmap();
              }}
              className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors"
            >
              View Roadmap
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#FFC84A] via-[#F59E0B] to-[#FA26A0] text-[#090611] font-black text-xs shadow-xl shadow-[#FFC84A]/25 active:scale-95 transition-all"
          >
            Claim &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
};
