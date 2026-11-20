import React, { useEffect, useRef } from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { LenzoStoreProduct } from '../../types/store';

interface StoreAssetPreviewProps {
  product: LenzoStoreProduct;
  userAvatar?: string;
  userName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isPlaying?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg' | 'xl', { box: string; avatar: string; crown: string }> = {
  sm: { box: 'w-[74px] h-[74px]', avatar: 'w-11 h-11', crown: 'w-4 h-4' },
  md: { box: 'w-[104px] h-[104px]', avatar: 'w-14 h-14', crown: 'w-5 h-5' },
  lg: { box: 'w-[126px] h-[126px]', avatar: 'w-16 h-16', crown: 'w-6 h-6' },
  xl: { box: 'w-[220px] h-[220px]', avatar: 'w-28 h-28', crown: 'w-9 h-9' },
};

function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.startsWith('data:video/');
}

/**
 * Real GPU-accelerated animated visual showcase for all 4 Lenzo Party Store categories:
 * - VIP FRAMES: rotating flame/galaxy/diamond halos around the user's real avatar
 * - SPECIAL ENTRY: opening golden palace gates, red carpet shimmer & sweeping spotlights
 * - CUSTOM GIFT: bouncing glowing gift box with popping lid & rising particle burst
 * - PREMIUM ASSETS: floating multifaceted neon purple diamond with orbital light rings
 * Also supports admin-uploaded custom image / GIF / video assets seamlessly.
 */
export const StoreAssetPreview: React.FC<StoreAssetPreviewProps> = ({
  product,
  userAvatar,
  userName = 'VIP',
  size = 'md',
  isPlaying = true,
  className = '',
}) => {
  const s = SIZE_CLASSES[size];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const customAnimUrl = product.animationUrl?.trim();
  const customImgUrl = product.imageUrl?.trim();

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isPlaying) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [isPlaying, customAnimUrl]);

  // Admin uploaded custom video asset
  if (customAnimUrl && isVideoUrl(customAnimUrl)) {
    return (
      <div
        className={`relative ${s.box} rounded-2xl overflow-hidden flex items-center justify-center select-none ${className}`}
        style={{
          boxShadow: `0 0 24px ${product.glowColor}`,
          background: 'radial-gradient(circle at center, rgba(139,32,255,0.28), rgba(9,4,18,0.95))',
        }}
      >
        <video
          ref={videoRef}
          src={customAnimUrl}
          loop
          muted
          playsInline
          autoPlay={isPlaying}
          className="w-full h-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl border"
          style={{ borderColor: `${product.accentColor}66` }}
        />
      </div>
    );
  }

  // Admin uploaded custom image / animated GIF (layered with subtle live glow)
  if ((customAnimUrl && !isVideoUrl(customAnimUrl)) || customImgUrl) {
    const mediaSrc = customAnimUrl || customImgUrl;
    return (
      <div
        className={`relative ${s.box} rounded-2xl overflow-hidden flex items-center justify-center select-none ${className}`}
        style={{
          boxShadow: `0 0 22px ${product.glowColor}`,
          background: 'radial-gradient(circle at center, rgba(139,32,255,0.26), rgba(8,4,16,0.95))',
        }}
      >
        <div
          className={`absolute inset-0 pointer-events-none ${isPlaying ? 'animate-lenzo-glow' : ''}`}
          style={{
            background: `radial-gradient(circle, ${product.glowColor} 0%, transparent 70%)`,
            opacity: 0.45,
          }}
        />
        <img
          src={mediaSrc}
          alt={product.name}
          className={`relative z-10 w-[88%] h-[88%] object-contain rounded-xl ${
            isPlaying ? 'animate-store-diamond' : ''
          }`}
        />
      </div>
    );
  }

  // ======================================================
  // 1. VIP FRAMES — REAL ANIMATED AVATAR FRAMES
  // ======================================================
  if (product.categoryId === 'vip_frames') {
    const preset = product.animationPreset;
    const isFlame = preset === 'royal_flame';
    const isDiamond = preset === 'diamond_aura';

    const ringConic = isFlame
      ? 'conic-gradient(from 0deg, #FFF7CC, #FFC84A, #FF6B00, #DC2626, #FF9900, #FFF7CC)'
      : isDiamond
      ? 'conic-gradient(from 0deg, #FFFFFF, #38BDF8, #C084FC, #E0F2FE, #818CF8, #FFFFFF)'
      : 'conic-gradient(from 0deg, #F0ABFC, #A855F7, #EC4899, #38BDF8, #7C3AED, #F0ABFC)';

    const outerGlow = isFlame
      ? 'radial-gradient(circle, rgba(255,140,0,0.65) 0%, rgba(255,60,0,0.2) 55%, transparent 75%)'
      : isDiamond
      ? 'radial-gradient(circle, rgba(56,189,248,0.65) 0%, rgba(192,132,252,0.24) 55%, transparent 75%)'
      : 'radial-gradient(circle, rgba(192,38,211,0.68) 0%, rgba(124,58,237,0.25) 55%, transparent 75%)';

    const initials = (userName || 'LP').slice(0, 2).toUpperCase();

    return (
      <div className={`relative ${s.box} flex items-center justify-center select-none ${className}`}>
        {/* Ambient Pulsing Aura */}
        <div
          className={`absolute inset-0 rounded-full blur-md pointer-events-none ${
            isPlaying ? (isFlame ? 'animate-store-flame' : 'animate-lenzo-glow') : ''
          }`}
          style={{ background: outerGlow }}
        />

        {/* Outer Rotating Energy Halo */}
        <div
          className={`relative flex items-center justify-center rounded-full p-[3.5px] ${
            size === 'xl' ? 'w-36 h-36 p-[6px]' : size === 'lg' ? 'w-[88px] h-[88px] p-[4.5px]' : size === 'md' ? 'w-[74px] h-[74px] p-[4px]' : 'w-[56px] h-[56px] p-[3px]'
          }`}
          style={{
            boxShadow: `0 0 ${size === 'xl' ? '34px' : '16px'} ${product.glowColor}`,
          }}
        >
          {/* Conic Rotating Ring */}
          <div
            className={`absolute inset-0 rounded-full ${
              isPlaying ? 'animate-lenzo-orbit-fast' : ''
            }`}
            style={{ background: ringConic }}
          />

          {/* Secondary Counter-Rotating Accent Ring */}
          <div
            className={`absolute -inset-[3px] rounded-full border border-dashed opacity-75 pointer-events-none ${
              isPlaying ? 'animate-store-reverse-orbit' : ''
            }`}
            style={{ borderColor: product.accentColor }}
          />

          {/* Inner Avatar Window */}
          <div className="relative z-10 w-full h-full rounded-full overflow-hidden bg-[#120724] ring-2 ring-[#0A0314] flex items-center justify-center">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-black text-amber-200 tracking-wider">{initials}</span>
            )}
          </div>

          {/* Sculpted Top Crown Crest */}
          <div
            className={`pointer-events-none absolute ${
              size === 'xl' ? '-top-5 w-11 h-11' : size === 'lg' ? '-top-3.5 w-7 h-7' : '-top-2.5 w-5 h-5'
            } left-1/2 -translate-x-1/2 z-20 rounded-full flex items-center justify-center border shadow-lg ${
              isPlaying ? 'animate-lenzo-particle' : ''
            }`}
            style={{
              background: `linear-gradient(135deg, ${product.secondaryColor}, ${product.primaryColor})`,
              borderColor: product.accentColor,
              boxShadow: `0 0 14px ${product.glowColor}`,
            }}
          >
            <Crown className={`${size === 'xl' ? 'w-6 h-6' : 'w-3 h-3'} text-white fill-amber-200`} />
          </div>

          {/* Orbiting Sparkle Particles */}
          <span
            className={`pointer-events-none absolute -top-1 -right-1 w-2 h-2 rounded-full z-20 ${
              isPlaying ? 'animate-store-sparkle-rise' : ''
            }`}
            style={{
              backgroundColor: product.accentColor,
              boxShadow: `0 0 10px ${product.accentColor}`,
            }}
          />
          <span
            className={`pointer-events-none absolute bottom-0 -left-1.5 w-1.5 h-1.5 rounded-full z-20 ${
              isPlaying ? 'animate-store-sparkle-rise' : ''
            }`}
            style={{
              backgroundColor: product.secondaryColor,
              boxShadow: `0 0 10px ${product.secondaryColor}`,
              animationDelay: '0.8s',
            }}
          />
          {isDiamond && (
            <Sparkles
              className={`pointer-events-none absolute -bottom-2 right-0 z-20 ${
                size === 'xl' ? 'w-6 h-6' : 'w-3.5 h-3.5'
              } text-cyan-200 ${isPlaying ? 'animate-lenzo-glow' : ''}`}
            />
          )}
        </div>
      </div>
    );
  }

  // ======================================================
  // 2. SPECIAL ENTRY — OPENING ROYAL GATE + RED CARPET + SPOTLIGHTS
  // ======================================================
  if (product.categoryId === 'special_entry') {
    const isSpotlight = product.animationPreset === 'phantom_spotlight';
    const carpetColor = isSpotlight ? '#9333EA' : '#DC2626';
    const carpetEdge = isSpotlight ? '#F0ABFC' : '#FACC15';

    return (
      <div
        className={`relative ${s.box} rounded-2xl overflow-hidden flex items-center justify-center select-none ${className}`}
        style={{
          background:
            'radial-gradient(circle at 50% 25%, rgba(147,51,234,0.42) 0%, rgba(16,6,34,0.96) 72%)',
          boxShadow: `inset 0 0 18px ${product.glowColor}`,
        }}
      >
        {/* Sweeping Stage Spotlights */}
        <div
          className={`pointer-events-none absolute -top-3 left-1/4 w-10 h-[125%] origin-top blur-[2px] ${
            isPlaying ? 'animate-store-spot-left' : ''
          }`}
          style={{
            background: `linear-gradient(180deg, ${product.secondaryColor}aa 0%, transparent 88%)`,
            clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)',
          }}
        />
        <div
          className={`pointer-events-none absolute -top-3 right-1/4 w-10 h-[125%] origin-top blur-[2px] ${
            isPlaying ? 'animate-store-spot-right' : ''
          }`}
          style={{
            background: `linear-gradient(180deg, ${product.primaryColor}aa 0%, transparent 88%)`,
            clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)',
          }}
        />

        {/* Animated Royal Palace Archway + Opening Doors SVG */}
        <svg viewBox="0 0 120 120" className="relative z-10 w-[94%] h-[94%]">
          <defs>
            <linearGradient id={`goldArch_${product.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF4B8" />
              <stop offset="45%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
            <linearGradient id={`carpet_${product.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={carpetColor} stopOpacity="0.95" />
              <stop offset="100%" stopColor="#450A0A" />
            </linearGradient>
          </defs>

          {/* Radiant Portal Center Light */}
          <ellipse
            cx="60"
            cy="56"
            rx="28"
            ry="32"
            fill={product.secondaryColor}
            opacity="0.28"
          />

          {/* Red / Royal Carpet Perspective */}
          <polygon
            points="43,78 77,78 98,118 22,118"
            fill={`url(#carpet_${product.id})`}
            stroke={carpetEdge}
            strokeWidth="2.2"
          />
          <line x1="60" y1="80" x2="60" y2="116" stroke={carpetEdge} strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />

          {/* Left Swinging Gate Door */}
          <g className={isPlaying ? 'animate-store-gate-left' : ''} style={{ transformOrigin: '32px 58px' }}>
            <rect x="33" y="36" width="26" height="44" rx="2" fill="#2A104E" stroke={`url(#goldArch_${product.id})`} strokeWidth="2.2" />
            <line x1="41" y1="38" x2="41" y2="78" stroke="#FCD34D" strokeWidth="1.2" opacity="0.85" />
            <line x1="50" y1="38" x2="50" y2="78" stroke="#FCD34D" strokeWidth="1.2" opacity="0.85" />
          </g>

          {/* Right Swinging Gate Door */}
          <g className={isPlaying ? 'animate-store-gate-right' : ''} style={{ transformOrigin: '88px 58px' }}>
            <rect x="61" y="36" width="26" height="44" rx="2" fill="#2A104E" stroke={`url(#goldArch_${product.id})`} strokeWidth="2.2" />
            <line x1="70" y1="38" x2="70" y2="78" stroke="#FCD34D" strokeWidth="1.2" opacity="0.85" />
            <line x1="79" y1="38" x2="79" y2="78" stroke="#FCD34D" strokeWidth="1.2" opacity="0.85" />
          </g>

          {/* Outer Ornate Golden Arch Frame */}
          <path
            d="M24 84 L24 44 C24 22 96 22 96 44 L96 84"
            fill="none"
            stroke={`url(#goldArch_${product.id})`}
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          {/* Top Crown Ornament */}
          <path
            d="M48 21 L52 11 L60 17 L68 11 L72 21 Z"
            fill={`url(#goldArch_${product.id})`}
            stroke="#FFFBEB"
            strokeWidth="1"
          />
          {/* Golden Stanchion Barriers */}
          <circle cx="24" cy="90" r="3" fill="#FDE047" />
          <line x1="24" y1="93" x2="24" y2="112" stroke="#F59E0B" strokeWidth="2.5" />
          <circle cx="96" cy="90" r="3" fill="#FDE047" />
          <line x1="96" y1="93" x2="96" y2="112" stroke="#F59E0B" strokeWidth="2.5" />
        </svg>

        {/* Rising Gold Sparkles */}
        <span
          className={`pointer-events-none absolute bottom-4 left-1/2 w-2 h-2 rounded-full bg-amber-300 z-20 ${
            isPlaying ? 'animate-store-sparkle-rise' : ''
          }`}
          style={{ boxShadow: '0 0 10px #FDE047' }}
        />
        <span
          className={`pointer-events-none absolute bottom-6 left-1/3 w-1.5 h-1.5 rounded-full bg-fuchsia-300 z-20 ${
            isPlaying ? 'animate-store-sparkle-rise' : ''
          }`}
          style={{ boxShadow: '0 0 10px #F0ABFC', animationDelay: '0.7s' }}
        />
      </div>
    );
  }

  // ======================================================
  // 3. CUSTOM GIFT — ANIMATED OPENING GIFT BOX + PARTICLE BURST
  // ======================================================
  if (product.categoryId === 'custom_gift') {
    return (
      <div
        className={`relative ${s.box} rounded-2xl overflow-hidden flex items-center justify-center select-none ${className}`}
        style={{
          background:
            'radial-gradient(circle at 50% 55%, rgba(168,85,247,0.42) 0%, rgba(14,5,28,0.96) 72%)',
        }}
      >
        {/* Bursting Glow Behind Gift */}
        <div
          className={`pointer-events-none absolute w-20 h-20 rounded-full blur-xl ${
            isPlaying ? 'animate-lenzo-glow' : ''
          }`}
          style={{ background: product.glowColor, opacity: 0.65 }}
        />

        {/* Floating Celebration Sparkles Bursting Out */}
        <span
          className={`pointer-events-none absolute top-1/3 left-1/3 w-2 h-2 rounded-full bg-amber-300 z-20 ${
            isPlaying ? 'animate-store-sparkle-rise' : ''
          }`}
          style={{ boxShadow: '0 0 10px #FACC15' }}
        />
        <span
          className={`pointer-events-none absolute top-1/3 right-1/3 w-2 h-2 rounded-full bg-pink-400 z-20 ${
            isPlaying ? 'animate-store-sparkle-rise' : ''
          }`}
          style={{ boxShadow: '0 0 10px #F472B6', animationDelay: '0.55s' }}
        />
        <span
          className={`pointer-events-none absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-cyan-300 z-20 ${
            isPlaying ? 'animate-store-sparkle-rise' : ''
          }`}
          style={{ boxShadow: '0 0 8px #67E8F9', animationDelay: '1.1s' }}
        />

        {/* Animated 3D-Style Luxury Gift Box SVG */}
        <svg
          viewBox="0 0 120 120"
          className={`relative z-10 w-[86%] h-[86%] drop-shadow-[0_6px_14px_rgba(168,85,247,0.65)] ${
            isPlaying ? 'animate-store-gift-bounce' : ''
          }`}
        >
          <defs>
            <linearGradient id={`boxBody_${product.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={product.primaryColor} />
              <stop offset="100%" stopColor="#3B0764" />
            </linearGradient>
            <linearGradient id={`ribbonGold_${product.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
          </defs>

          {/* Box Base */}
          <rect
            x="24"
            y="52"
            width="72"
            height="50"
            rx="10"
            fill={`url(#boxBody_${product.id})`}
            stroke="#E879F9"
            strokeWidth="2.2"
          />
          {/* Vertical Golden Ribbon */}
          <rect x="52" y="52" width="16" height="50" fill={`url(#ribbonGold_${product.id})`} />
          {/* Glossy Highlight */}
          <rect x="30" y="58" width="14" height="36" rx="4" fill="#FFFFFF" opacity="0.14" />

          {/* Animated Popping Lid + Sculpted Bow */}
          <g className={isPlaying ? 'animate-store-gift-lid' : ''} style={{ transformOrigin: '60px 52px' }}>
            <rect
              x="18"
              y="36"
              width="84"
              height="19"
              rx="6"
              fill={`url(#boxBody_${product.id})`}
              stroke="#F0ABFC"
              strokeWidth="2.2"
            />
            <rect x="52" y="36" width="16" height="19" fill={`url(#ribbonGold_${product.id})`} />
            {/* Left & Right Golden Bow Loops */}
            <path
              d="M60 36 C46 14 26 22 36 35 C42 40 54 37 60 36 Z"
              fill={`url(#ribbonGold_${product.id})`}
              stroke="#FFFBEB"
              strokeWidth="1.2"
            />
            <path
              d="M60 36 C74 14 94 22 84 35 C78 40 66 37 60 36 Z"
              fill={`url(#ribbonGold_${product.id})`}
              stroke="#FFFBEB"
              strokeWidth="1.2"
            />
            <circle cx="60" cy="35" r="5.5" fill="#FEF08A" stroke="#D97706" strokeWidth="1.5" />
          </g>
        </svg>
      </div>
    );
  }

  // ======================================================
  // 4. PREMIUM ASSETS — ROTATING PRISMATIC NEON DIAMOND & AURA RINGS
  // ======================================================
  return (
    <div
      className={`relative ${s.box} rounded-2xl overflow-hidden flex items-center justify-center select-none ${className}`}
      style={{
        background:
          'radial-gradient(circle at center, rgba(168,85,247,0.38) 0%, rgba(11,4,24,0.96) 72%)',
      }}
    >
      {/* Orbital Neon Ring 1 */}
      <div
        className={`pointer-events-none absolute w-[86%] h-[86%] rounded-full border-2 opacity-75 ${
          isPlaying ? 'animate-lenzo-orbit' : ''
        }`}
        style={{
          borderColor: `${product.primaryColor} transparent ${product.secondaryColor} transparent`,
          boxShadow: `0 0 18px ${product.glowColor}`,
        }}
      />
      {/* Orbital Neon Ring 2 */}
      <div
        className={`pointer-events-none absolute w-[72%] h-[72%] rounded-full border border-dashed opacity-70 ${
          isPlaying ? 'animate-store-reverse-orbit' : ''
        }`}
        style={{ borderColor: product.accentColor }}
      />

      {/* Shimmer Sweep */}
      {isPlaying && (
        <div
          className="pointer-events-none absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-store-shimmer"
        />
      )}

      {/* Faceted Crystalline Diamond SVG */}
      <svg
        viewBox="0 0 120 120"
        className={`relative z-10 w-[72%] h-[72%] drop-shadow-[0_0_16px_rgba(217,70,239,0.85)] ${
          isPlaying ? 'animate-store-diamond' : ''
        }`}
      >
        <defs>
          <linearGradient id={`gemTop_${product.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDF4FF" />
            <stop offset="45%" stopColor={product.primaryColor} />
            <stop offset="100%" stopColor={product.secondaryColor} />
          </linearGradient>
          <linearGradient id={`gemBot_${product.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={product.secondaryColor} />
            <stop offset="55%" stopColor="#6D28D9" />
            <stop offset="100%" stopColor="#2E1065" />
          </linearGradient>
        </defs>

        {/* Top Crown Facets */}
        <polygon
          points="32,26 88,26 104,50 16,50"
          fill={`url(#gemTop_${product.id})`}
          stroke="#FDE047"
          strokeWidth="2"
        />
        {/* Lower Pavilion Facets */}
        <polygon
          points="16,50 104,50 60,104"
          fill={`url(#gemBot_${product.id})`}
          stroke="#FDE047"
          strokeWidth="2"
        />
        {/* Internal Prism Lines */}
        <polyline points="32,26 42,50 60,104 78,50 88,26" fill="none" stroke="#F5D0FE" strokeWidth="1.5" opacity="0.85" />
        <polyline points="42,50 60,26 78,50" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.85" />
        <polygon points="42,50 78,50 60,104" fill="#FFFFFF" opacity="0.14" />
      </svg>

      {/* Corner Sparkle Stars */}
      <Sparkles
        className={`pointer-events-none absolute top-2 right-2 w-3.5 h-3.5 text-amber-300 z-20 ${
          isPlaying ? 'animate-lenzo-particle' : ''
        }`}
      />
      <Sparkles
        className={`pointer-events-none absolute bottom-2 left-2 w-3 h-3 text-fuchsia-300 z-20 ${
          isPlaying ? 'animate-lenzo-particle' : ''
        }`}
        style={{ animationDelay: '0.9s' }}
      />
    </div>
  );
};
