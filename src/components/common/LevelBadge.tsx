import React from 'react';
import {
  Shield,
  ChevronUp,
  Star,
  Sparkles,
  Gem,
  Flame,
  Crown,
  Hexagon,
  Compass,
  Award,
} from 'lucide-react';
import { getLevelDefinition, getTierConfigForLevel } from '../../utils/levelAndVipConfig';
import { LevelTierConfig } from '../../types/levelAndVip';
import { LevelEmblemBadge } from './LevelEmblemBadge';

interface LevelBadgeProps {
  level: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'profile';
  showTierName?: boolean;
  progressPercent?: number;
  onClick?: () => void;
  className?: string;
}

export function renderTierInsignia(
  insignia: LevelTierConfig['insignia'],
  className = 'w-3.5 h-3.5'
) {
  switch (insignia) {
    case 'shield':
      return <Shield className={className} />;
    case 'chevron':
      return <ChevronUp className={className} />;
    case 'star':
      return <Star className={`${className} fill-current`} />;
    case 'prism':
      return <Hexagon className={className} />;
    case 'diamond':
      return <Gem className={className} />;
    case 'flame':
      return <Flame className={`${className} fill-current`} />;
    case 'leaf':
      return <Compass className={className} />;
    case 'gem':
      return <Sparkles className={className} />;
    case 'crown':
      return <Crown className={`${className} fill-current`} />;
    case 'imperial':
      return <Award className={className} />;
    default:
      return <Shield className={className} />;
  }
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  level,
  size = 'sm',
  showTierName = false,
  progressPercent,
  onClick,
  className = '',
}) => {
  const safeLevel = Math.max(0, Math.min(100, Number.isFinite(level) ? Math.floor(level) : 0));
  const def = getLevelDefinition(safeLevel);
  const tierCfg = getTierConfigForLevel(safeLevel);
  const isHighPrestige = safeLevel >= 50;
  const isRoyal = safeLevel >= 90;

  // Dedicated rich clickable profile identity badge with level emblem, tier name, glow & mini progress bar
  if (size === 'profile') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group relative inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] select-none overflow-hidden ${className}`}
        style={{
          background: tierCfg.gradientCss,
          borderColor: tierCfg.borderHex,
          boxShadow: `0 4px 16px ${tierCfg.glowRgba}`,
        }}
        title={`Level ${safeLevel} · ${tierCfg.name} Tier — Tap to view Levels 0–100`}
      >
        {isHighPrestige && (
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        )}

        <LevelEmblemBadge level={safeLevel} size="xs" className="shrink-0" />

        <div className="flex flex-col items-start leading-none text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black tracking-tight text-white drop-shadow-sm tabular-nums">
              Lv.{safeLevel}
            </span>
            <span className="text-[10px] font-extrabold tracking-wider uppercase text-white/95 bg-black/30 px-1.5 py-0.5 rounded-md">
              {tierCfg.name}
            </span>
          </div>

          {typeof progressPercent === 'number' && (
            <div className="mt-1 flex items-center gap-1.5 w-full">
              <div className="w-16 h-1 rounded-full bg-black/45 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${Math.max(4, Math.min(100, progressPercent))}%` }}
                />
              </div>
              <span className="text-[9px] font-mono font-bold text-white/90 tabular-nums">
                {progressPercent}%
              </span>
            </div>
          )}
        </div>
      </button>
    );
  }

  const sizeStyles = {
    xs: 'px-1.5 py-0.5 text-[9px] gap-1 rounded-md',
    sm: 'px-2 py-0.5 text-[10px] gap-1 rounded-lg',
    md: 'px-2.5 py-1 text-xs gap-1.5 rounded-lg',
    lg: 'px-3.5 py-1.5 text-sm gap-2 rounded-xl',
  }[size];

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  const content = (
    <>
      <span className="shrink-0 flex items-center justify-center text-white drop-shadow-sm">
        {renderTierInsignia(tierCfg.insignia, iconSizes)}
      </span>
      <span className="font-black tracking-tight leading-none text-white drop-shadow-sm tabular-nums">
        Lv.{safeLevel}
      </span>
      {showTierName && (
        <span className="opacity-95 font-extrabold uppercase tracking-wider text-[0.82em] border-l border-white/30 pl-1.5 text-white">
          {tierCfg.name} {def.subRank}
        </span>
      )}
    </>
  );

  const sharedStyle: React.CSSProperties = {
    background: tierCfg.gradientCss,
    borderColor: tierCfg.borderHex,
    boxShadow: isRoyal
      ? `0 0 18px ${tierCfg.glowRgba}, inset 0 1px 0 rgba(255,255,255,0.4)`
      : isHighPrestige
      ? `0 2px 12px ${tierCfg.glowRgba}`
      : `0 1px 6px ${tierCfg.glowRgba}`,
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center justify-center border select-none transition-transform hover:scale-105 active:scale-95 ${sizeStyles} ${className}`}
        style={sharedStyle}
        title={`${def.title} (${tierCfg.name} Tier · Level ${safeLevel}/100)`}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center border select-none ${sizeStyles} ${className}`}
      style={sharedStyle}
      title={`${def.title} (${tierCfg.name} Tier · Level ${safeLevel}/100)`}
    >
      {content}
    </span>
  );
};
