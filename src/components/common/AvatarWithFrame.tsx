import React from 'react';
import { Crown, Sparkles, Flame } from 'lucide-react';
import {
  getSuperVipTierDefinition,
  getVipFrameDefinition,
} from '../../utils/levelAndVipConfig';
import { ActiveFrameType } from '../../types/levelAndVip';

interface AvatarWithFrameProps {
  src?: string;
  avatar?: string; // Backwards-compatible alias for src
  name?: string;
  level?: number;
  vipLevel?: number; // 0..12 (equipped or active VIP tier)
  superVipLevel?: number; // 0..6 (equipped or active Super VIP tier)
  activeFrameType?: ActiveFrameType; // Mutually exclusive: 'vip' | 'super_vip' | 'none'
  isVIP?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showFrame?: boolean;
  showVipBadge?: boolean;
  onClick?: () => void;
  className?: string;
}

const SIZE_MAP = {
  xs: { container: 'w-7 h-7', padding: 'p-[2px]', badge: 'text-[7px] px-1', dot: 'w-1.5 h-1.5' },
  sm: { container: 'w-9 h-9', padding: 'p-[2px]', badge: 'text-[8px] px-1', dot: 'w-1.5 h-1.5' },
  md: { container: 'w-12 h-12', padding: 'p-[2.5px]', badge: 'text-[8px] px-1.5', dot: 'w-2 h-2' },
  lg: { container: 'w-16 h-16', padding: 'p-[3px]', badge: 'text-[9px] px-1.5', dot: 'w-2 h-2' },
  xl: { container: 'w-24 h-24', padding: 'p-[4px]', badge: 'text-[10px] px-2', dot: 'w-2.5 h-2.5' },
  '2xl': { container: 'w-28 h-28', padding: 'p-[4.5px]', badge: 'text-[11px] px-2.5', dot: 'w-3 h-3' },
};

/**
 * Reusable VIP 1–12 Membership Crest Badge
 */
export const VipTierBadge: React.FC<{
  tier: number;
  size?: 'xs' | 'sm' | 'md';
  onClick?: () => void;
  className?: string;
}> = ({ tier, size = 'sm', onClick, className = '' }) => {
  const def = tier > 0 ? getVipFrameDefinition(tier) : undefined;
  const pad =
    size === 'xs'
      ? 'px-1.5 py-0.5 text-[9px] gap-1'
      : size === 'md'
      ? 'px-3 py-1 text-xs gap-1.5'
      : 'px-2 py-0.5 text-[10px] gap-1';

  const style: React.CSSProperties = def
    ? {
        background: def.gradientCss,
        borderColor: def.accentColor,
        boxShadow: `0 2px 10px ${def.glowColor}`,
      }
    : {};

  const body = (
    <>
      <Crown className={size === 'md' ? 'w-3.5 h-3.5 fill-current' : 'w-3 h-3 fill-current'} />
      <span className="font-black tracking-wide whitespace-nowrap">
        {def ? def.code : 'VIP 0'}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={style}
        className={`inline-flex items-center rounded-lg border font-black transition-transform active:scale-95 ${
          def ? 'text-white' : 'bg-white/[0.08] border-white/15 text-[#D7CEEB] hover:bg-white/[0.14]'
        } ${pad} ${className}`}
      >
        {body}
      </button>
    );
  }

  return (
    <span
      style={style}
      className={`inline-flex items-center rounded-lg border font-black ${
        def ? 'text-white' : 'bg-white/[0.08] border-white/15 text-[#D7CEEB]'
      } ${pad} ${className}`}
    >
      {body}
    </span>
  );
};

/**
 * Reusable Super VIP 1–6 Separate Ultra-Premium Crest Badge
 */
export const SuperVipTierBadge: React.FC<{
  tier: number;
  size?: 'xs' | 'sm' | 'md';
  onClick?: () => void;
  className?: string;
}> = ({ tier, size = 'sm', onClick, className = '' }) => {
  if (tier <= 0) return null;
  const def = getSuperVipTierDefinition(tier);
  if (!def) return null;

  const pad =
    size === 'xs'
      ? 'px-1.5 py-0.5 text-[9px] gap-1'
      : size === 'md'
      ? 'px-3 py-1 text-xs gap-1.5'
      : 'px-2 py-0.5 text-[10px] gap-1';

  const style: React.CSSProperties = {
    background: def.gradientCss,
    borderColor: def.accentColor,
    boxShadow: `0 2px 14px ${def.glowColor}`,
  };

  const body = (
    <>
      <Sparkles className={size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
      <span className="font-black tracking-wider whitespace-nowrap">SVIP {def.tier}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={style}
        className={`inline-flex items-center rounded-lg border text-white transition-transform hover:scale-105 active:scale-95 ${pad} ${className}`}
      >
        {body}
      </button>
    );
  }

  return (
    <span
      style={style}
      className={`inline-flex items-center rounded-lg border text-white ${pad} ${className}`}
    >
      {body}
    </span>
  );
};

/**
 * Renders user avatar with mutually exclusive VIP (1..12) OR Super VIP (1..6) frame.
 * Guarantees VIP and Super VIP frames NEVER overlap or corrupt rendering.
 */
export const AvatarWithFrame: React.FC<AvatarWithFrameProps> = ({
  src,
  avatar,
  name = 'User',
  level,
  vipLevel = 0,
  superVipLevel = 0,
  activeFrameType,
  isVIP = false,
  size = 'md',
  showFrame = true,
  showVipBadge = true,
  onClick,
  className = '',
}) => {
  const s = SIZE_MAP[size] || SIZE_MAP.md;
  const fallbackImg =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
  const resolvedSrc = src || avatar || fallbackImg;

  // When callers pass only legacy `level` without explicit `activeFrameType`, derive tier frame gracefully
  const effectiveVipLevel =
    vipLevel > 0
      ? vipLevel
      : !activeFrameType && superVipLevel === 0 && typeof level === 'number' && level >= 8
      ? Math.min(12, Math.floor(level / 8))
      : 0;

  // Strictly resolve mutually exclusive frame mode
  const resolvedMode: ActiveFrameType = (() => {
    if (!showFrame) return 'none';
    if (activeFrameType === 'none') return 'none';
    if (activeFrameType === 'super_vip' && superVipLevel > 0) return 'super_vip';
    if (activeFrameType === 'vip' && effectiveVipLevel > 0) return 'vip';
    if (!activeFrameType) {
      if (superVipLevel > 0) return 'super_vip';
      if (effectiveVipLevel > 0) return 'vip';
    }
    return 'none';
  })();

  const superVipDef = resolvedMode === 'super_vip' ? getSuperVipTierDefinition(superVipLevel) : undefined;
  const vipDef = resolvedMode === 'vip' ? getVipFrameDefinition(effectiveVipLevel) : undefined;

  const isLarge = size === 'lg' || size === 'xl' || size === '2xl';

  // Super VIP Frame Rendering (6 Distinct Ultra-Premium Animated Frames)
  if (superVipDef) {
    const orbitClass =
      superVipDef.tier >= 5 ? 'animate-lenzo-orbit-fast' : 'animate-lenzo-orbit';

    const conicMap: Record<typeof superVipDef.themeKey, string> = {
      royal_purple_energy:
        'conic-gradient(from 0deg, #F0ABFC, #9333EA, #3B0764, #C084FC, #F0ABFC)',
      electric_blue_crystal:
        'conic-gradient(from 0deg, #E0F2FE, #0EA5E9, #1E3A8A, #38BDF8, #E0F2FE)',
      red_inferno:
        'conic-gradient(from 0deg, #FDE68A, #F97316, #EF4444, #7F1D1D, #FDE68A)',
      emerald_royal:
        'conic-gradient(from 0deg, #FEF08A, #10B981, #064E3B, #34D399, #FEF08A)',
      diamond_aurora:
        'conic-gradient(from 0deg, #CFFAFE, #22D3EE, #8B5CF6, #F472B6, #CFFAFE)',
      legendary_cosmic_gold:
        'conic-gradient(from 0deg, #FFF7D6, #FFC84A, #FA26A0, #7C3AED, #38BDF8, #FFF7D6)',
    };

    return (
      <div
        onClick={onClick}
        className={`relative inline-flex items-center justify-center shrink-0 select-none ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        {/* Ambient Outer Aura */}
        <div
          className="absolute -inset-[4px] rounded-full blur-md pointer-events-none animate-lenzo-glow"
          style={{ background: superVipDef.gradientCss, opacity: 0.55 }}
        />

        {/* Rotating Energy / Crystal / Cosmic Ring */}
        <div
          className={`relative ${s.container} rounded-full ${s.padding} overflow-visible flex items-center justify-center`}
          style={{
            boxShadow: `0 0 ${isLarge ? '22px' : '12px'} ${superVipDef.glowColor}`,
          }}
        >
          <div
            className={`absolute inset-0 rounded-full ${orbitClass}`}
            style={{ background: conicMap[superVipDef.themeKey] }}
          />
          <div
            className="absolute inset-[1.5px] rounded-full border pointer-events-none"
            style={{ borderColor: `${superVipDef.accentColor}aa` }}
          />

          {/* Inner Avatar Mask */}
          <div className="relative z-10 w-full h-full rounded-full overflow-hidden bg-[#0E071B] ring-2 ring-[#090611]">
            <img
              src={resolvedSrc}
              alt={name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = fallbackImg;
              }}
            />
          </div>

          {/* Controlled Corner Particle Accents for Large Avatars */}
          {isLarge && (
            <>
              <span
                className="pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center w-5 h-5 rounded-full border text-white shadow-md"
                style={{
                  background: superVipDef.gradientCss,
                  borderColor: superVipDef.accentColor,
                }}
              >
                {superVipDef.themeKey === 'red_inferno' ? (
                  <Flame className="w-2.5 h-2.5 fill-current" />
                ) : (
                  <Crown className="w-2.5 h-2.5 fill-current" />
                )}
              </span>
              <span
                className={`pointer-events-none absolute top-1 -right-0.5 z-20 ${s.dot} rounded-full animate-lenzo-particle`}
                style={{
                  backgroundColor: superVipDef.particleColor,
                  boxShadow: `0 0 8px ${superVipDef.particleColor}`,
                }}
              />
              <span
                className={`pointer-events-none absolute bottom-1.5 -left-0.5 z-20 ${s.dot} rounded-full animate-lenzo-particle`}
                style={{
                  backgroundColor: superVipDef.accentColor,
                  boxShadow: `0 0 8px ${superVipDef.accentColor}`,
                  animationDelay: '1.1s',
                }}
              />
            </>
          )}
        </div>

        {/* Optional Super VIP Pill Tag */}
        {showVipBadge && (
          <div
            className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-20 rounded-full font-black text-white shadow-md flex items-center gap-0.5 border whitespace-nowrap ${s.badge}`}
            style={{
              background: superVipDef.gradientCss,
              borderColor: superVipDef.accentColor,
            }}
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>SVIP{superVipDef.tier}</span>
          </div>
        )}
      </div>
    );
  }

  // Standard VIP 1–12 Frame Rendering (12 Distinct Tiered Metallic / Gem / Legendary Frames)
  if (vipDef) {
    const isAnimatedVip = vipDef.tier >= 3;
    const isOrbitVip = vipDef.tier >= 7;
    const vipConic =
      vipDef.tier === 12
        ? 'conic-gradient(from 0deg, #FFC84A, #FA26A0, #8B20FF, #38BDF8, #FFC84A)'
        : vipDef.tier === 11
        ? 'conic-gradient(from 0deg, #FFC84A, #EC4899, #7C3AED, #FFC84A)'
        : `conic-gradient(from 0deg, ${vipDef.accentColor}, ${vipDef.primaryColor}, ${vipDef.secondaryColor}, ${vipDef.accentColor})`;

    return (
      <div
        onClick={onClick}
        className={`relative inline-flex items-center justify-center shrink-0 select-none ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        {/* Outer Controlled Glow */}
        <div
          className={`absolute -inset-[3px] rounded-full blur-[5px] pointer-events-none ${
            isAnimatedVip ? 'animate-lenzo-glow' : 'opacity-65'
          }`}
          style={{ background: vipDef.gradientCss }}
        />

        {/* Metallic / Animated Ring */}
        <div
          className={`relative ${s.container} rounded-full ${s.padding} flex items-center justify-center`}
          style={{
            boxShadow: `0 0 ${isLarge ? '16px' : '9px'} ${vipDef.glowColor}`,
          }}
        >
          <div
            className={`absolute inset-0 rounded-full ${
              isOrbitVip ? 'animate-lenzo-orbit' : ''
            }`}
            style={{
              background: isOrbitVip ? vipConic : vipDef.gradientCss,
            }}
          />

          <div className="relative z-10 w-full h-full rounded-full overflow-hidden bg-[#0E071B] ring-2 ring-[#090611]">
            <img
              src={resolvedSrc}
              alt={name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = fallbackImg;
              }}
            />
          </div>

          {isLarge && vipDef.tier >= 9 && (
            <span
              className="pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center w-4 h-4 rounded-full border text-white shadow"
              style={{
                background: vipDef.gradientCss,
                borderColor: vipDef.accentColor,
              }}
            >
              <Crown className="w-2.5 h-2.5 fill-current" />
            </span>
          )}
        </div>

        {/* Optional VIP Tag */}
        {showVipBadge && (
          <div
            className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-20 rounded-full font-black text-white shadow-md flex items-center gap-0.5 border whitespace-nowrap ${s.badge}`}
            style={{
              background: vipDef.gradientCss,
              borderColor: vipDef.accentColor,
            }}
          >
            <Crown className="w-2.5 h-2.5 fill-current" />
            <span>VIP{vipDef.tier}</span>
          </div>
        )}
      </div>
    );
  }

  // Default Unframed Avatar
  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div
        className={`relative ${s.container} rounded-full p-[2px] ${
          isVIP ? 'bg-gradient-to-tr from-[#FFC84A] to-[#F59E0B]' : 'bg-white/15'
        }`}
      >
        <div className="w-full h-full rounded-full overflow-hidden bg-[#140B24] border border-[#090611]">
          <img
            src={resolvedSrc}
            alt={name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = fallbackImg;
            }}
          />
        </div>
      </div>
    </div>
  );
};
