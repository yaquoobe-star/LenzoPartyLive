import React, { useState } from 'react';
import { Crown, User, Sparkles } from 'lucide-react';
import { getVipFrameDefinition } from '../../utils/levelAndVipConfig';

interface AvatarWithFrameProps {
  src?: string | null;
  avatar?: string | null;
  name: string;
  level?: number;
  vipLevel?: number;
  isVIP?: boolean;
  equippedVipFrame?: number; // 1-8
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
  equippedVipFrame,
  size = 'md',
  showFrame = true,
  showVipBadge = false,
  className = '',
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);
  const imageSource = avatar || src;

  // Determine active VIP tier frame (1 to 8)
  const activeFrameTier = equippedVipFrame ?? (vipLevel || (isVIP ? 4 : 0));
  const frameDef = activeFrameTier > 0 ? getVipFrameDefinition(activeFrameTier) : undefined;

  const sizeDimensions = {
    xs: { outer: 'w-8 h-8', inner: 'w-7 h-7', iconSize: 'w-3.5 h-3.5', badgeSize: 'w-2.5 h-2.5', stroke: 2 },
    sm: { outer: 'w-10 h-10', inner: 'w-9 h-9', iconSize: 'w-4 h-4', badgeSize: 'w-3 h-3', stroke: 2 },
    md: { outer: 'w-14 h-14', inner: 'w-12 h-12', iconSize: 'w-5 h-5', badgeSize: 'w-3.5 h-3.5', stroke: 2.5 },
    lg: { outer: 'w-18 h-18', inner: 'w-16 h-16', iconSize: 'w-7 h-7', badgeSize: 'w-4 h-4', stroke: 3 },
    xl: { outer: 'w-28 h-28', inner: 'w-24 h-24', iconSize: 'w-10 h-10', badgeSize: 'w-5 h-5', stroke: 3.5 },
    '2xl': { outer: 'w-36 h-36', inner: 'w-32 h-32', iconSize: 'w-12 h-12', badgeSize: 'w-6 h-6', stroke: 4 },
  }[size];

  const getInitials = (n: string) => {
    return (n || 'User').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || 'LP';
  };

  // Dedicated 8 VIP Frame SVG Visual Styles
  const renderVipFrameRing = () => {
    if (!showFrame || !frameDef) {
      return (
        <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />
      );
    }

    switch (frameDef.tier) {
      case 8: // VIP 8: Archon Celestial Eternity (Rainbow Stardust + Golden Halo + Floating Wings)
        return (
          <div className="absolute -inset-2 rounded-full pointer-events-none">
            <div className="w-full h-full rounded-full border-[3px] border-transparent bg-gradient-to-r from-sky-300 via-amber-200 to-fuchsia-400 [mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [mask-composite:exclude] shadow-[0_0_25px_rgba(56,189,248,0.9)] animate-spin-slow" />
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-8 h-4 rounded-full border border-amber-300 bg-amber-400/30 blur-[0.5px] shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] animate-pulse">👑</span>
          </div>
        );

      case 7: // VIP 7: Void Nebula Aura (Fuchsia, Purple, Orbiting Cyan Sparks)
        return (
          <div className="absolute -inset-1.5 rounded-full pointer-events-none">
            <div className="w-full h-full rounded-full border-[3px] border-transparent bg-gradient-to-tr from-fuchsia-500 via-purple-300 to-cyan-400 [mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [mask-composite:exclude] shadow-[0_0_20px_rgba(217,70,239,0.85)] animate-pulse" />
            <span className="absolute -bottom-1 -right-1 text-cyan-300 text-[10px]">✨</span>
          </div>
        );

      case 6: // VIP 6: Solar Phoenix Blaze (Orange & Amber Solar Ring)
        return (
          <div className="absolute -inset-1.5 rounded-full pointer-events-none">
            <div className="w-full h-full rounded-full border-[3px] border-transparent bg-gradient-to-tr from-orange-500 via-amber-300 to-red-600 [mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [mask-composite:exclude] shadow-[0_0_18px_rgba(249,115,22,0.85)] animate-pulse" />
            <span className="absolute -top-2 right-0 text-amber-300 text-[10px]">🔥</span>
          </div>
        );

      case 5: // VIP 5: Emerald Dragon Crest (Teal & Emerald)
        return (
          <div className="absolute -inset-1.5 rounded-full pointer-events-none">
            <div className="w-full h-full rounded-full border-[2.5px] border-transparent bg-gradient-to-tr from-emerald-400 via-teal-200 to-green-600 [mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [mask-composite:exclude] shadow-[0_0_16px_rgba(16,185,129,0.8)]" />
            <span className="absolute -bottom-1 left-0 text-emerald-300 text-[10px]">🐉</span>
          </div>
        );

      case 4: // VIP 4: Cyber Rose Flare (Rose, Pink & Fuchsia)
        return (
          <div className="absolute -inset-1.5 rounded-full pointer-events-none">
            <div className="w-full h-full rounded-full border-[2.5px] border-transparent bg-gradient-to-tr from-rose-500 via-pink-300 to-fuchsia-600 [mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [mask-composite:exclude] shadow-[0_0_15px_rgba(244,63,94,0.75)] animate-pulse" />
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-pink-300 text-[9px]">🌸</span>
          </div>
        );

      case 3: // VIP 3: Radiant Golden Crown (Rich Gold & Amber)
        return (
          <div className="absolute -inset-1.5 rounded-full pointer-events-none">
            <div className="w-full h-full rounded-full border-[2.5px] border-transparent bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-600 [mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [mask-composite:exclude] shadow-[0_0_14px_rgba(251,191,36,0.75)]" />
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-amber-300 text-[11px]">👑</span>
          </div>
        );

      case 2: // VIP 2: Amethyst Radiance (Violet & Purple)
        return (
          <div className="absolute -inset-1.5 rounded-full pointer-events-none">
            <div className="w-full h-full rounded-full border-[2px] border-transparent bg-gradient-to-tr from-purple-500 via-fuchsia-300 to-indigo-500 [mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [mask-composite:exclude] shadow-[0_0_12px_rgba(168,85,247,0.7)]" />
          </div>
        );

      case 1: // VIP 1: Neon Cyan Ring (Cyan & Sky Blue)
      default:
        return (
          <div className="absolute -inset-1 rounded-full pointer-events-none">
            <div className="w-full h-full rounded-full border-[2px] border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.65)] animate-pulse" />
          </div>
        );
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 ${sizeDimensions.outer} ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''
      } ${className}`}
    >
      {/* 1. VIP Frame Overlay */}
      {renderVipFrameRing()}

      {/* 2. Inner Circular Profile Picture (DP) */}
      <div className={`relative ${sizeDimensions.inner} rounded-full overflow-hidden bg-[#160C25] flex items-center justify-center z-10 shadow-inner`}>
        {imageSource && !imageError ? (
          <img
            src={imageSource}
            alt={name || 'User DP'}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
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

      {/* 3. Small VIP Crown Indicator Badge */}
      {showVipBadge && frameDef && (
        <span
          className="absolute -bottom-1 -right-1 z-20 bg-gradient-to-r from-amber-400 to-yellow-500 text-black p-1 rounded-full shadow-lg flex items-center justify-center ring-2 ring-[#090611]"
          title={`VIP ${frameDef.tier} (${frameDef.name})`}
        >
          <Crown className={`${sizeDimensions.badgeSize} fill-black`} />
        </span>
      )}
    </div>
  );
};
