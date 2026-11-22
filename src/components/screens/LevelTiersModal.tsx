import React from 'react';
import { X, Trophy, Check, Gift } from 'lucide-react';
import { LevelBadge } from '../common/LevelBadge';
import {
  ALL_100_LEVELS,
  LEVEL_TIER_CONFIGS,
  TOTAL_PROGRESSION_COINS_EXACT,
  getTierConfigForLevel,
} from '../../utils/levelAndVipConfig';

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

  const activeTier = getTierConfigForLevel(currentLevel);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
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
              <h3 className="text-base font-bold text-white font-display">Lenzo Level Tiers (0–100)</h3>
              <p className="text-[11px] text-[#B9AECF]">
                10 Official Tiers · {TOTAL_PROGRESSION_COINS_EXACT.toLocaleString()} Total Coins
              </p>
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
            <span className="font-bold text-white block">Real-Time Coin Progression:</span>
            <span className="text-[#B9AECF] text-[11px]">
              Every coin you spend on gifts or store items instantly advances your level in real time — starting at 50,000 coins for Level 1 up to 1,333,333,333 coins for Level 100 Legend!
            </span>
          </div>
        </div>

        {/* 10 Authoritative Tiers List */}
        <div className="p-4 sm:p-5 overflow-y-auto no-scrollbar flex-1 space-y-3">
          {LEVEL_TIER_CONFIGS.map((tier) => {
            const isUserTier = activeTier.id === tier.id;
            const startLevelDef = ALL_100_LEVELS[tier.minLevel === 0 ? 1 : tier.minLevel];
            const endLevelDef = ALL_100_LEVELS[tier.maxLevel];

            return (
              <div
                key={tier.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isUserTier
                    ? 'bg-gradient-to-br from-[#26133e] to-[#361858] border-[#FFC84A]/60 shadow-lg shadow-[#8B20FF]/20 ring-1 ring-[#FFC84A]/40'
                    : 'bg-[#211333]/90 border-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <LevelBadge level={tier.maxLevel} size="sm" />
                    <span className="text-sm font-bold text-white font-display truncate">
                      {tier.displayName} Tier
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-semibold text-[#FFC84A]">
                      Lv {tier.minLevel}–{tier.maxLevel}
                    </span>
                    {isUserTier && (
                      <span className="px-2 py-0.5 rounded-full bg-[#FFC84A] text-[#090611] text-[9px] font-black uppercase">
                        Current
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[11px] font-mono text-[#D7CEEB] mb-3 tabular-nums">
                  Coins Range:{' '}
                  <span className="text-white font-bold">
                    {startLevelDef.cumulativeStart.toLocaleString()}
                  </span>{' '}
                  →{' '}
                  <span className="text-[#FFC84A] font-bold">
                    {endLevelDef.cumulativeCoins.toLocaleString()}
                  </span>
                </p>

                <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                  {tier.tierPerks.map((perk, j) => (
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
