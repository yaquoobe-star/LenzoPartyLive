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
  uppercase = true,
}) => {
  const iconDimensions = {
    sm: { width: 38, height: 38, radius: 'rounded-xl' },
    md: { width: 56, height: 56, radius: 'rounded-2xl' },
    lg: { width: 92, height: 92, radius: 'rounded-[22px]' },
    xl: { width: 132, height: 132, radius: 'rounded-[28px]' },
  }[size];

  return (
    <div
      className={`flex ${
        horizontal ? 'flex-row items-center gap-3' : 'flex-col items-center text-center'
      } ${className}`}
    >
      {/* Official Lenzo Party Live Crowned Play Brand Icon */}
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: iconDimensions.width, height: iconDimensions.height }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#8B20FF] via-[#F328D5] to-[#F5C557] opacity-45 blur-xl scale-115 pointer-events-none" />
        <img
          src="/app-icon.png?v=2"
          alt="Lenzo Party Live"
          draggable={false}
          className={`relative z-10 w-full h-full object-cover ${iconDimensions.radius} border border-[#F328D5]/30 shadow-[0_8px_24px_rgba(139,32,255,0.45)] bg-[#06071C]`}
        />
      </div>

      {/* Official Brand Typography: LENZO (White) + PARTY (White) + LIVE (Gold) */}
      {showText && (
        <div className={`flex flex-col ${horizontal ? 'text-left' : 'items-center mt-2.5'}`}>
          {horizontal ? (
            <div className="flex flex-col leading-none">
              <span
                className={`font-display font-black tracking-wider text-white drop-shadow-sm ${
                  size === 'sm'
                    ? 'text-sm'
                    : size === 'md'
                      ? 'text-lg'
                      : 'text-2xl'
                }`}
              >
                {uppercase ? 'LENZO' : 'Lenzo'}
              </span>
              <div
                className={`flex items-center gap-1 font-display font-extrabold tracking-widest mt-0.5 ${
                  size === 'sm'
                    ? 'text-[10px]'
                    : size === 'md'
                      ? 'text-xs'
                      : 'text-sm'
                }`}
              >
                <span className="text-white">{uppercase ? 'PARTY' : 'Party'}</span>
                <span className="text-[#F5C557]">{uppercase ? 'LIVE' : 'Live'}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center leading-none">
              <span
                className={`font-display font-black tracking-[0.08em] text-white drop-shadow-sm ${
                  size === 'sm'
                    ? 'text-base'
                    : size === 'md'
                      ? 'text-2xl'
                      : size === 'lg'
                        ? 'text-3xl sm:text-4xl'
                        : 'text-4xl sm:text-5xl'
                }`}
              >
                {uppercase ? 'LENZO' : 'Lenzo'}
              </span>
              <div
                className={`flex items-center gap-1.5 font-display font-extrabold tracking-[0.12em] mt-1 ${
                  size === 'sm'
                    ? 'text-xs'
                    : size === 'md'
                      ? 'text-sm'
                      : size === 'lg'
                        ? 'text-lg sm:text-xl'
                        : 'text-xl sm:text-2xl'
                }`}
              >
                <span className="text-white">{uppercase ? 'PARTY' : 'Party'}</span>
                <span className="text-[#F5C557]">{uppercase ? 'LIVE' : 'Live'}</span>
              </div>
            </div>
          )}

          {showTagline && (
            <div
              className={`text-[#B9AECF] font-medium tracking-wider flex items-center ${
                horizontal ? 'justify-start' : 'justify-center'
              } gap-1.5 ${
                size === 'sm' ? 'text-[9px] mt-1' : size === 'md' ? 'text-xs mt-1.5' : 'text-xs sm:text-sm mt-2'
              }`}
            >
              <span>Chat</span>
              <span className="text-[#F328D5] text-[10px]">•</span>
              <span>Live</span>
              <span className="text-[#8B20FF] text-[10px]">•</span>
              <span>Party</span>
              {size === 'lg' || size === 'xl' ? (
                <>
                  <span className="text-[#F5C557] text-[10px]">•</span>
                  <span>Connect</span>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
