import React from 'react';
import { Shield, Star, Crown, Gem, Flame, Sparkles, Award } from 'lucide-react';
import { getLevelDefinition } from '../../utils/levelAndVipConfig';

interface LevelBadgeProps {
  level: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showTierName?: boolean;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  level,
  size = 'md',
  showTierName = false,
  className = '',
  onClick,
  interactive = true,
}) => {
  const def = getLevelDefinition(level);
  const theme = def.badgeTheme;

  // Shapes & Icons based on the individual level theme
  const renderShapeIcon = () => {
    const iconClass = {
      xs: 'w-2.5 h-2.5',
      sm: 'w-3 h-3',
      md: 'w-3.5 h-3.5',
      lg: 'w-4 h-4',
      xl: 'w-6 h-6',
      '2xl': 'w-8 h-8',
    }[size];

    switch (theme.shape) {
      case 'crown':
        return <Crown className={`${iconClass} fill-current text-white/95 shrink-0`} />;
      case 'gem':
      case 'diamond':
        return <Gem className={`${iconClass} fill-current text-white/95 shrink-0`} />;
      case 'flame':
        return <Flame className={`${iconClass} fill-current text-white/95 shrink-0`} />;
      case 'star':
        return <Star className={`${iconClass} fill-current text-white/95 shrink-0`} />;
      case 'crest':
        return <Award className={`${iconClass} fill-current text-white/95 shrink-0`} />;
      case 'hexagon':
      case 'shield':
      default:
        return <Shield className={`${iconClass} fill-current text-white/95 shrink-0`} />;
    }
  };

  // Distinct metallic border and gradient styles for each of the 5 tiers and individual levels
  const getBadgeStyle = () => {
    switch (theme.metallicFinish) {
      case 'diamond':
        return 'border-[#38bdf8] bg-gradient-to-r from-[#0369a1] via-[#0284c7] to-[#ec4899] shadow-[0_0_15px_rgba(56,189,248,0.7)] text-white';
      case 'platinum':
        return 'border-[#c084fc] bg-gradient-to-r from-[#6b21a8] via-[#8b5cf6] to-[#d946ef] shadow-[0_0_14px_rgba(192,132,252,0.6)] text-white';
      case 'gold':
        return 'border-[#fbbf24] bg-gradient-to-r from-[#b45309] via-[#f59e0b] to-[#d97706] shadow-[0_0_12px_rgba(251,191,36,0.6)] text-[#1a0f02] font-black';
      case 'silver':
        return 'border-[#e2e8f0] bg-gradient-to-r from-[#475569] via-[#94a3b8] to-[#64748b] shadow-[0_0_10px_rgba(226,232,240,0.5)] text-white';
      case 'bronze':
      default:
        return 'border-[#cd7f32] bg-gradient-to-r from-[#78350f] via-[#b45309] to-[#92400e] shadow-[0_0_8px_rgba(205,127,50,0.4)] text-white';
    }
  };

  // Large & Prominent Profile Layout (XL / 2XL)
  if (size === 'xl' || size === '2xl') {
    return (
      <div
        onClick={onClick}
        className={`relative inline-flex flex-col items-center justify-center p-3 sm:p-4 rounded-3xl border-2 ${getBadgeStyle()} ${theme.glowEffect} select-none transition-all ${
          interactive ? 'cursor-pointer hover:scale-105 active:scale-95 group' : ''
        } ${className}`}
        title={`${def.tierRank} • ${def.name} (Level ${level})`}
      >
        {/* Shimmer light effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/15 to-white/0 rounded-3xl pointer-events-none group-hover:via-white/30 transition-opacity" />

        <div className="flex items-center gap-2 relative z-10">
          <div className="p-2 rounded-2xl bg-black/30 backdrop-blur-sm border border-white/20">
            {renderShapeIcon()}
          </div>
          <div className="text-left">
            <span className="text-[10px] font-black tracking-widest uppercase opacity-90 block">
              {def.tierRank}
            </span>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-xl sm:text-2xl font-black tracking-tight leading-none">
                Lv.{level}
              </span>
              <span className="text-xs font-extrabold opacity-75">/ 50</span>
            </div>
          </div>
        </div>

        <div className="mt-2 pt-1.5 border-t border-white/20 w-full flex items-center justify-between text-[10px] font-bold">
          <span className="truncate max-w-[120px]">{def.name}</span>
          <span className="px-1.5 py-0.2 rounded-md bg-black/40 text-[9px] font-mono">
            {theme.romanNumeral}
          </span>
        </div>
      </div>
    );
  }

  // Standard sizes (xs, sm, md, lg)
  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-1 border',
    sm: 'text-[10px] px-2 py-0.5 gap-1.5 border',
    md: 'text-xs px-2.5 py-1 gap-1.5 border-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 border-2',
  }[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center rounded-full ${getBadgeStyle()} ${sizeClasses} select-none transition-all ${
        interactive ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
      } ${className}`}
      title={`${def.tierRank} • ${def.name} (Level ${level})`}
    >
      <span className="shrink-0">{renderShapeIcon()}</span>
      <span className="font-mono font-black tracking-tight whitespace-nowrap">
        Lv.{level}
      </span>
      <span className="font-mono text-[9px] font-bold opacity-80 border-l border-white/30 pl-1">
        {theme.romanNumeral}
      </span>
      {showTierName && (
        <span className="opacity-95 font-sans font-bold tracking-normal border-l border-white/25 pl-1.5 truncate">
          {def.tierRank}
        </span>
      )}
    </div>
  );
};
