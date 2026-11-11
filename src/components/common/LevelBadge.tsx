import React from 'react';
import { Star, Shield, Crown, Sparkles, Gem, Flame } from 'lucide-react';
import { getLevelTierDetails } from '../../utils/levelSystem';

interface LevelBadgeProps {
  level: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTierName?: boolean;
  className?: string;
  onClick?: () => void;
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  level,
  size = 'md',
  showTierName = false,
  className = '',
  onClick,
}) => {
  const details = getLevelTierDetails(level);

  const getIcon = () => {
    switch (details.iconName) {
      case 'flame':
        return <Flame className={`${size === 'xs' ? 'w-2.5 h-2.5' : size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} fill-current`} />;
      case 'gem':
        return <Gem className={`${size === 'xs' ? 'w-2.5 h-2.5' : size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} fill-current`} />;
      case 'sparkle':
        return <Sparkles className={`${size === 'xs' ? 'w-2.5 h-2.5' : size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} fill-current`} />;
      case 'crown':
        return <Crown className={`${size === 'xs' ? 'w-2.5 h-2.5' : size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} fill-current`} />;
      case 'shield':
        return <Shield className={`${size === 'xs' ? 'w-2.5 h-2.5' : size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} fill-current`} />;
      default:
        return <Star className={`${size === 'xs' ? 'w-2.5 h-2.5' : size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} fill-current`} />;
    }
  };

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-0.5 font-bold',
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-bold',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-extrabold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-black',
  }[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center rounded-full bg-gradient-to-r ${details.badgeGradient} text-white shadow-md ${details.glowEffect} ${sizeClasses} select-none ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''
      } ${className}`}
      title={`${details.tierName} • Level ${level}`}
    >
      <span className="shrink-0">{getIcon()}</span>
      <span className="font-mono tracking-tight whitespace-nowrap">Lv.{level}</span>
      {showTierName && (
        <span className="opacity-90 font-sans tracking-normal border-l border-white/20 pl-1.5 ml-0.5 truncate">
          {details.tierName}
        </span>
      )}
    </div>
  );
};
