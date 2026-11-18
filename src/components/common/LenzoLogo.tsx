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
  uppercase = false,
}) => {
  const iconDimensions = {
    sm: { width: 34, height: 34 },
    md: { width: 50, height: 50 },
    lg: { width: 84, height: 84 },
    xl: { width: 120, height: 120 },
  }[size];

  return (
    <div className={`flex ${horizontal ? 'flex-row items-center gap-3' : 'flex-col items-center text-center'} ${className}`}>
      {/* Crowned Play Button Icon — Deep Navy, Royal Purple, Neon Pink, White & Subtle Gold */}
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: iconDimensions.width, height: iconDimensions.height }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#8B20FF] via-[#F328D5] to-[#FFC84A] opacity-55 blur-xl scale-125 animate-pulse" />

        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10 drop-shadow-[0_8px_20px_rgba(243,40,213,0.45)]"
        >
          <defs>
            <linearGradient id="lenzoPlayGrad" x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#8B20FF" />
              <stop offset="48%" stopColor="#C415F5" />
              <stop offset="100%" stopColor="#F328D5" />
            </linearGradient>

            <linearGradient id="lenzoSheenGrad" x1="30" y1="20" x2="70" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
              <stop offset="30%" stopColor="#F328D5" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#8B20FF" stopOpacity="0.1" />
            </linearGradient>

            <linearGradient id="lenzoCrownGrad" x1="20" y1="0" x2="80" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFF176" />
              <stop offset="35%" stopColor="#FFC84A" />
              <stop offset="70%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            <linearGradient id="lenzoJewelGrad" x1="45" y1="20" x2="55" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F328D5" />
              <stop offset="100%" stopColor="#8B20FF" />
            </linearGradient>

            <linearGradient id="lenzoArrowGrad" x1="40" y1="40" x2="68" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#F3E8FF" />
            </linearGradient>
          </defs>

          {/* Subtle Gold Crown */}
          <g transform="translate(0, -6)">
            <path
              d="M26 30 L32 10 L43 23 L50 6 L57 23 L68 10 L74 30 C74 30 65 33 50 33 C35 33 26 30 26 30 Z"
              fill="url(#lenzoCrownGrad)"
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
            />
            <circle cx="32" cy="10" r="2.8" fill="#FFFBEB" stroke="#D97706" strokeWidth="0.8" />
            <circle cx="43" cy="23" r="2.2" fill="#FFFBEB" stroke="#D97706" strokeWidth="0.8" />
            <circle cx="50" cy="6" r="3.4" fill="#FFFFFF" stroke="#D97706" strokeWidth="0.8" />
            <circle cx="57" cy="23" r="2.2" fill="#FFFBEB" stroke="#D97706" strokeWidth="0.8" />
            <circle cx="68" cy="10" r="2.8" fill="#FFFBEB" stroke="#D97706" strokeWidth="0.8" />
            <polygon points="50,17 54,23 50,28 46,23" fill="url(#lenzoJewelGrad)" stroke="#FFE082" strokeWidth="0.8" />
            <circle cx="38" cy="26" r="1.8" fill="#F328D5" />
            <circle cx="62" cy="26" r="1.8" fill="#F328D5" />
          </g>

          {/* Rounded Play Button Body */}
          <path
            d="M32 25 C23 25 18 32 21 40 L45 78 C49 84 57 85 62 81 L82 66 C89 60 90 51 84 45 L43 27 C39 25 35 25 32 25 Z"
            fill="url(#lenzoPlayGrad)"
          />
          <path
            d="M34 29 C27 29 23 34 25 41 L47 75 C50 80 56 81 60 78 L78 65 C83 61 84 54 79 49 L43 31 C40 29 37 29 34 29 Z"
            stroke="url(#lenzoSheenGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Crisp White Play Triangle */}
          <path
            d="M44 43 C44 40.5 46.8 39 49 40.2 L63 48.5 C65.2 49.8 65.2 52.8 63 54.1 L49 62.4 C46.8 63.6 44 62.1 44 59.6 Z"
            fill="url(#lenzoArrowGrad)"
            filter="drop-shadow(0 2px 5px rgba(0,0,0,0.4))"
          />
        </svg>
      </div>

      {/* Official Brand Typography: Lenzo Party Live / LENZO PARTY LIVE */}
      {showText && (
        <div className={`flex flex-col ${horizontal ? 'text-left' : 'items-center mt-2.5'}`}>
          <div className={`flex items-center gap-1.5 font-display tracking-tight font-extrabold leading-none ${uppercase ? 'uppercase tracking-wide' : ''}`}>
            <span className={`bg-gradient-to-r from-white via-[#F3E8FF] to-[#F328D5] bg-clip-text text-transparent drop-shadow-sm ${
              size === 'sm' ? 'text-sm' : size === 'md' ? 'text-xl' : size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'
            }`}>
              {uppercase ? 'LENZO' : 'Lenzo'}
            </span>
            <span className={`bg-gradient-to-r from-[#F328D5] via-[#FFC84A] to-[#FFD770] bg-clip-text text-transparent ${
              size === 'sm' ? 'text-sm' : size === 'md' ? 'text-xl' : size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'
            }`}>
              {uppercase ? 'PARTY LIVE' : 'Party Live'}
            </span>
          </div>

          {showTagline && (
            <div className={`text-[#B9AECF] font-medium tracking-wider flex items-center justify-center gap-1.5 ${
              size === 'sm' ? 'text-[10px] mt-0.5' : size === 'md' ? 'text-xs mt-1' : 'text-sm mt-1.5'
            }`}>
              <span>Chat</span>
              <span className="text-[#F328D5] text-[10px]">•</span>
              <span>Live</span>
              <span className="text-[#8B20FF] text-[10px]">•</span>
              <span>Party</span>
              {size === 'lg' || size === 'xl' ? (
                <>
                  <span className="text-[#FFC84A] text-[10px]">•</span>
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
