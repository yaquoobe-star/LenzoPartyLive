import React from 'react';
import {
  Gift,
  Gem,
  Flame,
  Zap,
  Crown,
  Heart,
  Sparkles,
  Shield,
  Trophy,
  Award,
  Lock,
} from 'lucide-react';
import { AchievementIconKey, AchievementShape } from '../../shared/progressionEngine';

export function renderAchievementIcon(iconKey: AchievementIconKey, className = 'w-4 h-4') {
  switch (iconKey) {
    case 'gift':
      return <Gift className={className} />;
    case 'gem':
      return <Gem className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'crown':
      return <Crown className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'trophy':
      return <Trophy className={className} />;
    case 'award':
    default:
      return <Award className={className} />;
  }
}

const SHAPE_CLIP_PATHS: Record<AchievementShape, string> = {
  hex: 'polygon(25% 4%, 75% 4%, 98% 50%, 75% 96%, 25% 96%, 2% 50%)',
  diamond: 'polygon(50% 2%, 98% 50%, 50% 98%, 2% 50%)',
  shield: 'polygon(12% 6%, 88% 6%, 94% 55%, 50% 98%, 6% 55%)',
  bolt: 'polygon(18% 4%, 82% 4%, 96% 32%, 82% 96%, 18% 96%, 4% 32%)',
  crown: 'polygon(8% 22%, 30% 6%, 50% 18%, 70% 6%, 92% 22%, 88% 92%, 12% 92%)',
  heart: 'polygon(50% 14%, 82% 4%, 98% 34%, 50% 96%, 2% 34%, 18% 4%)',
  star: 'polygon(50% 2%, 66% 32%, 98% 38%, 74% 62%, 80% 96%, 50% 80%, 20% 96%, 26% 62%, 2% 38%, 34% 32%)',
  crest: 'polygon(15% 4%, 85% 4%, 96% 24%, 90% 76%, 50% 98%, 10% 76%, 4% 24%)',
  trophy: 'polygon(14% 6%, 86% 6%, 96% 42%, 78% 94%, 22% 94%, 4% 42%)',
  sunburst: 'polygon(50% 0%, 63% 14%, 84% 10%, 86% 30%, 100% 50%, 86% 70%, 84% 90%, 63% 86%, 50% 100%, 37% 86%, 16% 90%, 14% 70%, 0% 50%, 14% 30%, 16% 10%, 37% 14%)',
};

interface AchievementBadgeEmblemProps {
  shape: AchievementShape;
  iconKey: AchievementIconKey;
  accentFrom: string;
  accentTo: string;
  borderHex: string;
  isEarned: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const AchievementBadgeEmblem: React.FC<AchievementBadgeEmblemProps> = ({
  shape,
  iconKey,
  accentFrom,
  accentTo,
  borderHex,
  isEarned,
  size = 'md',
}) => {
  const dims = {
    xs: { outer: 'w-6 h-6', icon: 'w-3 h-3', lock: 'w-2.5 h-2.5' },
    sm: { outer: 'w-8 h-8', icon: 'w-3.5 h-3.5', lock: 'w-3 h-3' },
    md: { outer: 'w-12 h-12', icon: 'w-5 h-5', lock: 'w-3.5 h-3.5' },
    lg: { outer: 'w-14 h-14', icon: 'w-6 h-6', lock: 'w-4 h-4' },
  }[size];

  const clip = SHAPE_CLIP_PATHS[shape] || SHAPE_CLIP_PATHS.hex;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${dims.outer}`}>
      <div
        className="w-full h-full flex items-center justify-center transition-transform"
        style={{
          clipPath: clip,
          background: isEarned
            ? `linear-gradient(135deg, ${accentFrom}, ${accentTo})`
            : 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
          boxShadow: isEarned ? `0 4px 14px ${borderHex}55` : 'none',
        }}
      >
        <div
          className="w-[86%] h-[86%] flex items-center justify-center text-white"
          style={{
            clipPath: clip,
            background: isEarned
              ? `linear-gradient(155deg, ${accentFrom}e8, ${accentTo}f5)`
              : 'rgba(14, 7, 27, 0.9)',
          }}
        >
          <span className={isEarned ? 'text-white drop-shadow' : 'text-white/35'}>
            {renderAchievementIcon(iconKey, dims.icon)}
          </span>
        </div>
      </div>

      {!isEarned && (
        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#090611] border border-white/20 flex items-center justify-center text-[#B9AECF]">
          <Lock className="w-2.5 h-2.5" />
        </span>
      )}
    </div>
  );
};
