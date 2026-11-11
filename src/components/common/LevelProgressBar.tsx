import React from 'react';
import { UserProfile } from '../../types';
import { getUserLevelProgress } from '../../utils/levelSystem';
import { LevelBadge } from './LevelBadge';
import { Sparkles, ArrowRight, Zap } from 'lucide-react';

interface LevelProgressBarProps {
  user: UserProfile;
  className?: string;
  onViewPerks?: () => void;
}

export const LevelProgressBar: React.FC<LevelProgressBarProps> = ({
  user,
  className = '',
  onViewPerks,
}) => {
  const progress = getUserLevelProgress(user);
  const nextLevel = progress.currentLevel + 1;

  return (
    <div className={`w-full p-4 rounded-2xl bg-gradient-to-br from-[#160C25] to-[#211333] border border-white/10 shadow-lg ${className}`}>
      {/* Header Row: Level Badges and EXP figures */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <LevelBadge level={progress.currentLevel} size="sm" showTierName={true} />
        </div>

        <div className="flex items-center gap-1.5 text-right shrink-0">
          <span className="text-[11px] font-mono font-bold text-white">
            {progress.expInCurrentLevel.toLocaleString()}
          </span>
          <span className="text-[11px] text-[#B9AECF]">/</span>
          <span className="text-[11px] font-mono text-[#B9AECF]">
            {progress.expNeededForNextLevel.toLocaleString()} EXP
          </span>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="relative w-full h-3 bg-[#090611] rounded-full overflow-hidden border border-white/10 p-[1.5px] shadow-inner mb-2">
        {/* Animated Gradient Fill */}
        <div
          className={`h-full rounded-full bg-gradient-to-r ${progress.tierDetails.badgeGradient} transition-all duration-700 ease-out shadow-sm relative`}
          style={{ width: `${Math.max(4, progress.progressPercent)}%` }}
        >
          {/* Subtle light shimmer bar */}
          <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse pointer-events-none" />
        </div>
      </div>

      {/* Footer Info Row: Remaining EXP & Percentage */}
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-[#B9AECF]">
          <Zap className="w-3.5 h-3.5 text-[#FFC84A]" />
          <span>
            <span className="text-white font-bold font-mono">{progress.remainingExp.toLocaleString()} EXP</span> required for <span className="text-[#FFC84A] font-bold">Level {nextLevel}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono font-extrabold text-[#F328D5] bg-[#F328D5]/10 px-2 py-0.5 rounded-full border border-[#F328D5]/20">
            {progress.progressPercent}%
          </span>
          {onViewPerks && (
            <button
              onClick={onViewPerks}
              className="text-[#FFC84A] hover:text-white transition-colors flex items-center gap-0.5 font-bold"
            >
              <span>Perks</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
