import React, { useState } from 'react';
import { Crown, User } from 'lucide-react';
import { getLevelTierDetails } from '../../utils/levelSystem';

interface AvatarWithFrameProps {
  src?: string | null;
  avatar?: string | null;
  name: string;
  level?: number;
  vipLevel?: number;
  isVIP?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showFrame?: boolean;
  showVipBadge?: boolean;
  className?: string;
  onClick?: () => void;
}

export const AvatarWithFrame: React.FC<AvatarWithFrameProps> = ({
  src,
  avatar,
  name,
  level = 1,
  vipLevel,
  isVIP = false,
  size = 'md',
  showFrame = true,
  showVipBadge = false,
  className = '',
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);
  const imageSource = avatar || src;
  const tierDetails = getLevelTierDetails(level);

  const sizeDimensions = {
    xs: { outer: 'w-7 h-7', inner: 'w-7 h-7', iconSize: 'w-3.5 h-3.5', badgeSize: 'w-2.5 h-2.5' },
    sm: { outer: 'w-9 h-9', inner: 'w-9 h-9', iconSize: 'w-4 h-4', badgeSize: 'w-3 h-3' },
    md: { outer: 'w-12 h-12', inner: 'w-12 h-12', iconSize: 'w-5 h-5', badgeSize: 'w-3.5 h-3.5' },
    lg: { outer: 'w-16 h-16', inner: 'w-16 h-16', iconSize: 'w-7 h-7', badgeSize: 'w-4 h-4' },
    xl: { outer: 'w-24 h-24', inner: 'w-24 h-24', iconSize: 'w-10 h-10', badgeSize: 'w-5 h-5' },
    '2xl': { outer: 'w-32 h-32', inner: 'w-32 h-32', iconSize: 'w-12 h-12', badgeSize: 'w-6 h-6' },
  }[size];

  // Professional SVG fallback generator based on initials or icon
  const getInitials = (n: string) => {
    return (n || 'User').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || 'LP';
  };

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 ${sizeDimensions.outer} ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''
      } ${className}`}
    >
      {/* Level Ring Frame if enabled */}
      <div
        className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center ${
          showFrame ? tierDetails.avatarRing : 'ring-1 ring-white/10'
        } bg-[#160C25] relative`}
      >
        {imageSource && !imageError ? (
          <img
            src={imageSource}
            alt={name || 'User DP'}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          /* High-Quality Professional Default Avatar */
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#211333] via-[#351854] to-[#8B20FF]/40 flex flex-col items-center justify-center text-white border border-white/10">
            <User className={`${sizeDimensions.iconSize} text-[#FFC84A]/80 mb-0.5`} />
            {size === 'xl' || size === '2xl' ? (
              <span className="text-[10px] font-bold font-mono tracking-wider text-white/90">
                {getInitials(name)}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* VIP Crown Badge on Bottom-Right */}
      {showVipBadge && isVIP && (
        <span
          className="absolute -bottom-1 -right-1 bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] p-1 rounded-full shadow-lg flex items-center justify-center ring-2 ring-[#090611]"
          title={`VIP ${vipLevel || 4} Member`}
        >
          <Crown className={`${sizeDimensions.badgeSize} fill-current`} />
        </span>
      )}
    </div>
  );
};
