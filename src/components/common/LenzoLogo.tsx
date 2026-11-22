import React from 'react';

interface LenzoLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
  horizontal?: boolean;
  uppercase?: boolean;
}

export const LenzoLogo: React.FC<LenzoLogoProps> = ({
  size = 'md',
  showText = true,
  showTagline = true,
  className = '',
  horizontal = false,
}) => {
  const iconDimensions = {
    sm: { width: 42, height: 42 },
    md: { width: 76, height: 76 },
    lg: { width: 132, height: 132 },
    xl: { width: 176, height: 176 },
  }[size];

  // For large vertical displays, the official emblem itself already carries the iconic
  // "Lenzo Party LIVE" typography, so we only render side text for compact/horizontal headers.
  const shouldRenderSideWordmark = showText && (horizontal || size === 'sm');

  return (
    <div
      className={`flex ${
        horizontal ? 'flex-row items-center gap-3' : 'flex-col items-center text-center'
      } ${className}`}
    >
      {/* Official Lenzo Party LIVE Royal Masquerade Crown Emblem */}
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: iconDimensions.width, height: iconDimensions.height }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#8B20FF] via-[#F328D5] to-[#38BDF8] opacity-40 blur-xl scale-115 pointer-events-none" />
        <img
          src="/app-icon.png?v=3"
          alt="Lenzo Party LIVE"
          draggable={false}
          className="relative z-10 w-full h-full object-contain drop-shadow-[0_10px_28px_rgba(168,85,247,0.5)]"
        />
      </div>

      {/* Horizontal / Compact Wordmark */}
      {shouldRenderSideWordmark && (
        <div className={`flex flex-col ${horizontal ? 'text-left' : 'items-center mt-2'}`}>
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`font-display font-black italic tracking-tight bg-gradient-to-b from-white via-[#FCE7F3] to-[#F472B6] bg-clip-text text-transparent drop-shadow-sm ${
                size === 'sm' ? 'text-base' : size === 'md' ? 'text-xl' : 'text-2xl'
              }`}
            >
              Lenzo Party
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#FF1744] to-[#F43F5E] text-white font-black text-[9px] tracking-wider uppercase shadow-[0_0_10px_rgba(244,63,94,0.65)]">
              LIVE
            </span>
          </div>

          {showTagline && (
            <div
              className={`text-[#B9AECF] font-medium tracking-wider flex items-center ${
                horizontal ? 'justify-start' : 'justify-center'
              } gap-1.5 text-[10px] mt-1`}
            >
              <span>Chat</span>
              <span className="text-[#F328D5]">•</span>
              <span>Live</span>
              <span className="text-[#8B20FF]">•</span>
              <span>Party</span>
            </div>
          )}
        </div>
      )}

      {/* Tagline under large standalone emblem */}
      {!shouldRenderSideWordmark && showTagline && (
        <div className="text-[#D4CBE8] font-semibold tracking-[0.2em] uppercase flex items-center justify-center gap-2 text-[11px] sm:text-xs mt-3">
          <span>Chat</span>
          <span className="text-[#F328D5]">•</span>
          <span>Live</span>
          <span className="text-[#38BDF8]">•</span>
          <span>Party</span>
          <span className="text-[#FFC84A]">•</span>
          <span>Connect</span>
        </div>
      )}
    </div>
  );
};
