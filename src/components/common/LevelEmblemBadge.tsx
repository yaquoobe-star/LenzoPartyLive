import React, { useId } from 'react';

export interface LevelEmblemPalette {
  decade: number;
  label: string;
  frameLight: string;
  frameMid: string;
  frameDark: string;
  innerTop: string;
  innerBottom: string;
  gemLight: string;
  gemMid: string;
  gemDark: string;
  wingLight: string;
  wingMid: string;
  wingDark: string;
  glow: string;
  textColor: string;
  crownColor: string;
}

/**
 * 11 bespoke visual palettes faithfully matching the 0–100 Level Emblem Chart:
 * 0–9 Silver-Teal Crystal · 10–19 Bronze Flame · 20–29 Frost Steel · 30–39 Imperial Gold
 * 40–49 Emerald Jade · 50–59 Electric Sapphire · 60–69 Crimson Ruby · 70–79 Amethyst Mystic
 * 80–89 Obsidian Magenta · 90–99 Celestial Platinum-Gold · 100 Supreme Golden Phoenix
 */
export function getLevelEmblemPalette(rawLevel: number): LevelEmblemPalette {
  const level = Math.max(0, Math.min(100, Math.floor(Number.isFinite(rawLevel) ? rawLevel : 0)));

  if (level === 100) {
    return {
      decade: 10,
      label: 'ROYAL 100',
      frameLight: '#FFF7C2',
      frameMid: '#F59E0B',
      frameDark: '#92400E',
      innerTop: '#241205',
      innerBottom: '#0D0614',
      gemLight: '#F5D0FE',
      gemMid: '#A855F7',
      gemDark: '#581C87',
      wingLight: '#FEF08A',
      wingMid: '#F59E0B',
      wingDark: '#B45309',
      glow: 'rgba(251, 191, 36, 0.72)',
      textColor: '#FFFBEB',
      crownColor: '#FDE047',
    };
  }

  const decade = Math.floor(level / 10);
  const palettes: LevelEmblemPalette[] = [
    // 0–9: Brushed Steel & Glowing Aqua Crystal
    {
      decade: 0,
      label: 'CRYSTAL',
      frameLight: '#F1F5F9',
      frameMid: '#94A3B8',
      frameDark: '#334155',
      innerTop: '#162831',
      innerBottom: '#0A131A',
      gemLight: '#CCFBF1',
      gemMid: '#2DD4BF',
      gemDark: '#0F766E',
      wingLight: '#99F6E4',
      wingMid: '#14B8A6',
      wingDark: '#115E59',
      glow: 'rgba(45, 212, 191, 0.48)',
      textColor: '#F8FAFC',
      crownColor: '#5EEAD4',
    },
    // 10–19: Burnished Bronze & Amber Flame Laurel
    {
      decade: 1,
      label: 'BRONZE',
      frameLight: '#FDE68A',
      frameMid: '#CD7F32',
      frameDark: '#6B2F0E',
      innerTop: '#2D160B',
      innerBottom: '#140905',
      gemLight: '#FEF3C7',
      gemMid: '#F59E0B',
      gemDark: '#B45309',
      wingLight: '#FCD34D',
      wingMid: '#D97706',
      wingDark: '#7C2D12',
      glow: 'rgba(245, 158, 11, 0.5)',
      textColor: '#FFFBEB',
      crownColor: '#FBBF24',
    },
    // 20–29: Frost Steel & Glacier Blue Paladin
    {
      decade: 2,
      label: 'SILVER',
      frameLight: '#F0F9FF',
      frameMid: '#93C5FD',
      frameDark: '#1E3A8A',
      innerTop: '#11203B',
      innerBottom: '#081020',
      gemLight: '#E0F2FE',
      gemMid: '#38BDF8',
      gemDark: '#0369A1',
      wingLight: '#DBEAFE',
      wingMid: '#60A5FA',
      wingDark: '#1D4ED8',
      glow: 'rgba(96, 165, 250, 0.52)',
      textColor: '#F0F9FF',
      crownColor: '#BAE6FD',
    },
    // 30–39: Imperial Gold Sovereign
    {
      decade: 3,
      label: 'GOLD',
      frameLight: '#FEF9C3',
      frameMid: '#FACC15',
      frameDark: '#A16207',
      innerTop: '#2E2007',
      innerBottom: '#160E03',
      gemLight: '#FEF9C3',
      gemMid: '#F59E0B',
      gemDark: '#B45309',
      wingLight: '#FEF08A',
      wingMid: '#EAB308',
      wingDark: '#A16207',
      glow: 'rgba(250, 204, 21, 0.56)',
      textColor: '#FFFDF0',
      crownColor: '#FDE047',
    },
    // 40–49: Emerald Jade Dragon
    {
      decade: 4,
      label: 'EMERALD',
      frameLight: '#D1FAE5',
      frameMid: '#10B981',
      frameDark: '#065F46',
      innerTop: '#0A291D',
      innerBottom: '#04140E',
      gemLight: '#ECFDF5',
      gemMid: '#34D399',
      gemDark: '#047857',
      wingLight: '#A7F3D0',
      wingMid: '#10B981',
      wingDark: '#065F46',
      glow: 'rgba(16, 185, 129, 0.54)',
      textColor: '#ECFDF5',
      crownColor: '#6EE7B7',
    },
    // 50–59: Electric Sapphire Crystal
    {
      decade: 5,
      label: 'SAPPHIRE',
      frameLight: '#BAE6FD',
      frameMid: '#2563EB',
      frameDark: '#1E3A8A',
      innerTop: '#0B1D47',
      innerBottom: '#050C24',
      gemLight: '#E0F2FE',
      gemMid: '#0EA5E9',
      gemDark: '#1D4ED8',
      wingLight: '#7DD3FC',
      wingMid: '#3B82F6',
      wingDark: '#1E40AF',
      glow: 'rgba(56, 189, 248, 0.58)',
      textColor: '#F0F9FF',
      crownColor: '#7DD3FC',
    },
    // 60–69: Crimson Ruby Inferno
    {
      decade: 6,
      label: 'RUBY',
      frameLight: '#FDE68A',
      frameMid: '#EF4444',
      frameDark: '#7F1D1D',
      innerTop: '#38090C',
      innerBottom: '#180406',
      gemLight: '#FEF08A',
      gemMid: '#F97316',
      gemDark: '#B91C1C',
      wingLight: '#FCA5A5',
      wingMid: '#EF4444',
      wingDark: '#991B1B',
      glow: 'rgba(239, 68, 68, 0.58)',
      textColor: '#FFF5F5',
      crownColor: '#FDBA74',
    },
    // 70–79: Amethyst Violet Mystic
    {
      decade: 7,
      label: 'AMETHYST',
      frameLight: '#F3E8FF',
      frameMid: '#A855F7',
      frameDark: '#581C87',
      innerTop: '#260C44',
      innerBottom: '#120521',
      gemLight: '#FAE8FF',
      gemMid: '#D946EF',
      gemDark: '#7E22CE',
      wingLight: '#E9D5FF',
      wingMid: '#A855F7',
      wingDark: '#6B21A8',
      glow: 'rgba(168, 85, 247, 0.6)',
      textColor: '#FAF5FF',
      crownColor: '#E879F9',
    },
    // 80–89: Obsidian Chrome & Neon Magenta
    {
      decade: 8,
      label: 'CROWN',
      frameLight: '#F8FAFC',
      frameMid: '#CBD5E1',
      frameDark: '#831843',
      innerTop: '#1E091E',
      innerBottom: '#0B0410',
      gemLight: '#FCE7F3',
      gemMid: '#EC4899',
      gemDark: '#9D174D',
      wingLight: '#FBCFE8',
      wingMid: '#EC4899',
      wingDark: '#831843',
      glow: 'rgba(236, 72, 153, 0.6)',
      textColor: '#FFF1F2',
      crownColor: '#F472B6',
    },
    // 90–99: Celestial Platinum-Gold Winged Crown
    {
      decade: 9,
      label: 'ROYAL',
      frameLight: '#FEF9C3',
      frameMid: '#F59E0B',
      frameDark: '#78350F',
      innerTop: '#1A1424',
      innerBottom: '#090710',
      gemLight: '#E0E7FF',
      gemMid: '#818CF8',
      gemDark: '#4338CA',
      wingLight: '#FFFFFF',
      wingMid: '#CBD5E1',
      wingDark: '#94A3B8',
      glow: 'rgba(253, 224, 71, 0.62)',
      textColor: '#FFFFFF',
      crownColor: '#FDE047',
    },
  ];

  return palettes[Math.min(palettes.length - 1, decade)];
}

export type LevelEmblemSize = 'xs' | 'sm' | 'md' | 'lg' | 'hero' | 'showcase';

interface LevelEmblemBadgeProps {
  level: number;
  size?: LevelEmblemSize;
  locked?: boolean;
  onClick?: () => void;
  className?: string;
  showSubLabel?: boolean;
}

const SIZE_DIMENSIONS: Record<LevelEmblemSize, { width: number; height: number }> = {
  xs: { width: 32, height: 28 },
  sm: { width: 46, height: 40 },
  md: { width: 58, height: 50 },
  lg: { width: 74, height: 64 },
  hero: { width: 96, height: 84 },
  showcase: { width: 128, height: 112 },
};

/**
 * Renders an individually evolving, vector-crisp metallic & crystal shield emblem
 * for every single level from 0 through 100 (101 unique levels).
 */
export const LevelEmblemBadge: React.FC<LevelEmblemBadgeProps> = ({
  level,
  size = 'md',
  locked = false,
  onClick,
  className = '',
  showSubLabel = false,
}) => {
  const safeLevel = Math.max(0, Math.min(100, Math.floor(Number.isFinite(level) ? level : 0)));
  const isGrand100 = safeLevel === 100;
  const step = isGrand100 ? 10 : safeLevel % 10; // 0..9 progressive ornamentation per decade
  const palette = getLevelEmblemPalette(safeLevel);
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '');

  const dims = SIZE_DIMENSIONS[size];
  const fontSize = safeLevel >= 100 ? 27 : safeLevel >= 10 ? 31 : 34;

  const svgMarkup = (
    <svg
      width={dims.width}
      height={dims.height}
      viewBox="0 0 140 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="block overflow-visible select-none"
      style={{
        filter: locked
          ? 'grayscale(0.35) opacity(0.72)'
          : `drop-shadow(0 4px ${size === 'hero' || size === 'showcase' ? '14px' : '7px'} ${palette.glow})`,
      }}
      aria-label={`Level ${safeLevel} Emblem`}
    >
      <defs>
        <linearGradient id={`frame-${uid}`} x1="70" y1="12" x2="70" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette.frameLight} />
          <stop offset="48%" stopColor={palette.frameMid} />
          <stop offset="100%" stopColor={palette.frameDark} />
        </linearGradient>

        <linearGradient id={`inner-${uid}`} x1="70" y1="22" x2="70" y2="98" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette.innerTop} />
          <stop offset="100%" stopColor={palette.innerBottom} />
        </linearGradient>

        <linearGradient id={`wing-${uid}`} x1="10" y1="30" x2="130" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette.wingLight} />
          <stop offset="50%" stopColor={palette.wingMid} />
          <stop offset="100%" stopColor={palette.wingDark} />
        </linearGradient>

        <linearGradient id={`gem-${uid}`} x1="70" y1="6" x2="70" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette.gemLight} />
          <stop offset="55%" stopColor={palette.gemMid} />
          <stop offset="100%" stopColor={palette.gemDark} />
        </linearGradient>

        <linearGradient id={`gemBot-${uid}`} x1="70" y1="90" x2="70" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette.gemLight} />
          <stop offset="50%" stopColor={palette.gemMid} />
          <stop offset="100%" stopColor={palette.gemDark} />
        </linearGradient>

        <radialGradient id={`aura-${uid}`} cx="50%" cy="52%" r="48%">
          <stop offset="0%" stopColor={palette.gemMid} stopOpacity={isGrand100 ? '0.6' : '0.38'} />
          <stop offset="100%" stopColor={palette.gemMid} stopOpacity="0" />
        </radialGradient>

        <linearGradient id={`num-${uid}`} x1="70" y1="42" x2="70" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="72%" stopColor={palette.textColor} />
          <stop offset="100%" stopColor={palette.frameLight} />
        </linearGradient>
      </defs>

      {/* Ambient Radiant Aura for High Sub-Levels (step >= 5) & Grand 100 */}
      {(step >= 5 || isGrand100 || safeLevel >= 90) && (
        <ellipse cx="70" cy="62" rx={isGrand100 ? 64 : 50 + step} ry={isGrand100 ? 48 : 38} fill={`url(#aura-${uid})`} />
      )}

      {/* ==================================================================
          PROGRESSIVE SIDE WINGS / LAUREL FEATHERS (Evolving step 1 -> 100)
         ================================================================== */}

      {/* Grand Level 100 Cosmic Violet Energy Streaks & Heroic Phoenix Double Wings */}
      {isGrand100 && (
        <g>
          {/* Violet-Gold Cosmic Starburst Rays */}
          <path
            d="M12 72 L40 60 L16 86 L46 72 M128 72 L100 60 L124 86 L94 72"
            stroke="#C084FC"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.85"
          />
          {/* Left Heroic Phoenix Wings (4 Swept Plumes) */}
          <path
            d="M38 42 C18 30 6 20 2 34 C12 42 22 48 34 52 Z"
            fill={`url(#wing-${uid})`}
            stroke="#FEF9C3"
            strokeWidth="1.2"
          />
          <path
            d="M36 52 C14 48 4 46 6 58 C18 62 28 62 36 62 Z"
            fill={`url(#wing-${uid})`}
            stroke="#FEF9C3"
            strokeWidth="1.2"
          />
          <path
            d="M37 64 C18 64 10 68 15 79 C25 79 34 75 40 73 Z"
            fill={`url(#wing-${uid})`}
            stroke="#FEF9C3"
            strokeWidth="1.1"
          />
          <path
            d="M42 76 C26 80 22 87 29 94 C38 92 46 86 52 84 Z"
            fill={`url(#wing-${uid})`}
            stroke="#FEF9C3"
            strokeWidth="1"
          />
          {/* Right Heroic Phoenix Wings (Mirrored) */}
          <path
            d="M102 42 C122 30 134 20 138 34 C128 42 118 48 106 52 Z"
            fill={`url(#wing-${uid})`}
            stroke="#FEF9C3"
            strokeWidth="1.2"
          />
          <path
            d="M104 52 C126 48 136 46 134 58 C122 62 112 62 104 62 Z"
            fill={`url(#wing-${uid})`}
            stroke="#FEF9C3"
            strokeWidth="1.2"
          />
          <path
            d="M103 64 C122 64 130 68 125 79 C115 79 106 75 100 73 Z"
            fill={`url(#wing-${uid})`}
            stroke="#FEF9C3"
            strokeWidth="1.1"
          />
          <path
            d="M98 76 C114 80 118 87 111 94 C102 92 94 86 88 84 Z"
            fill={`url(#wing-${uid})`}
            stroke="#FEF9C3"
            strokeWidth="1"
          />
        </g>
      )}

      {/* Non-100 Levels: Decade + Step Progressive Wing & Laurel Evolution */}
      {!isGrand100 && (
        <g>
          {/* Step >= 1 (or decade >= 1): Subtle Lower Corner Spurs */}
          {(step >= 1 || palette.decade >= 1) && (
            <>
              <path d="M40 76 L26 83 L38 87 Z" fill={`url(#wing-${uid})`} opacity="0.92" />
              <path d="M100 76 L114 83 L102 87 Z" fill={`url(#wing-${uid})`} opacity="0.92" />
            </>
          )}

          {/* Step >= 2 (or decade >= 2): Sculpted Upper Shoulder Blades */}
          {(step >= 2 || palette.decade >= 2) && (
            <>
              <path
                d="M36 42 L20 35 L28 50 L36 52 Z"
                fill={`url(#wing-${uid})`}
                stroke={palette.frameLight}
                strokeWidth="0.9"
              />
              <path
                d="M104 42 L120 35 L112 50 L104 52 Z"
                fill={`url(#wing-${uid})`}
                stroke={palette.frameLight}
                strokeWidth="0.9"
              />
            </>
          )}

          {/* Step >= 3 (or decade >= 3): Mid Swept Laurel / Wing Fin */}
          {(step >= 3 || palette.decade >= 3) && (
            <>
              <path
                d="M35 55 C20 53 15 58 20 68 C27 69 33 67 37 66 Z"
                fill={`url(#wing-${uid})`}
                stroke={palette.frameLight}
                strokeWidth="0.9"
              />
              <path
                d="M105 55 C120 53 125 58 120 68 C113 69 107 67 103 66 Z"
                fill={`url(#wing-${uid})`}
                stroke={palette.frameLight}
                strokeWidth="0.9"
              />
            </>
          )}

          {/* Step >= 4: Upper Sweeping Plume & Lower Ribbon Curl */}
          {step >= 4 && (
            <>
              <path
                d="M36 46 C22 36 12 32 10 42 C18 48 26 51 35 53 Z"
                fill={`url(#wing-${uid})`}
                stroke={palette.frameLight}
                strokeWidth="0.9"
              />
              <path
                d="M104 46 C118 36 128 32 130 42 C122 48 114 51 105 53 Z"
                fill={`url(#wing-${uid})`}
                stroke={palette.frameLight}
                strokeWidth="0.9"
              />
            </>
          )}

          {/* Step >= 5: Extended Lower Wing Feather */}
          {step >= 5 && (
            <>
              <path
                d="M42 78 C28 82 22 90 30 96 C40 94 48 88 54 85 Z"
                fill={`url(#wing-${uid})`}
                stroke={palette.frameLight}
                strokeWidth="0.85"
              />
              <path
                d="M98 78 C112 82 118 90 110 96 C100 94 92 88 86 85 Z"
                fill={`url(#wing-${uid})`}
                stroke={palette.frameLight}
                strokeWidth="0.85"
              />
            </>
          )}

          {/* Step >= 7 (or decade >= 8): Wide Outer Angelic / Dragon Wing Tips */}
          {(step >= 7 || palette.decade >= 9) && (
            <>
              <path
                d="M35 39 C18 28 8 22 6 33 C14 40 24 44 35 47 Z"
                fill={`url(#wing-${uid})`}
                stroke="#FFFFFF"
                strokeOpacity="0.65"
                strokeWidth="1"
              />
              <path
                d="M105 39 C122 28 132 22 134 33 C126 40 116 44 105 47 Z"
                fill={`url(#wing-${uid})`}
                stroke="#FFFFFF"
                strokeOpacity="0.65"
                strokeWidth="1"
              />
            </>
          )}

          {/* Step >= 8: Twin Glowing Side Accent Gems */}
          {step >= 8 && (
            <>
              <polygon points="22,60 27,56 32,60 27,64" fill={`url(#gem-${uid})`} stroke="#FFFFFF" strokeWidth="0.7" />
              <polygon points="118,60 113,56 108,60 113,64" fill={`url(#gem-${uid})`} stroke="#FFFFFF" strokeWidth="0.7" />
            </>
          )}

          {/* Step === 9: Decade Apex Energy Spires */}
          {step === 9 && (
            <>
              <path d="M16 48 L4 44 L14 55 Z" fill={palette.gemLight} opacity="0.9" />
              <path d="M124 48 L136 44 L126 55 Z" fill={palette.gemLight} opacity="0.9" />
              <circle cx="14" cy="30" r="2.2" fill={palette.gemLight} />
              <circle cx="126" cy="30" r="2.2" fill={palette.gemLight} />
            </>
          )}
        </g>
      )}

      {/* ==================================================================
          ROYAL CROWN / TOP CREST (Escalating by decade & step)
         ================================================================== */}
      {isGrand100 ? (
        <g>
          {/* Grand 5-Prong Royal Sovereign Crown */}
          <path
            d="M46 29 L42 12 L55 21 L62 8 L70 19 L78 8 L85 21 L98 12 L94 29 Z"
            fill={palette.crownColor}
            stroke="#FFFBEB"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <circle cx="42" cy="11" r="2.6" fill="#FEF08A" />
          <circle cx="62" cy="7" r="2.8" fill="#FFFBEB" />
          <circle cx="78" cy="7" r="2.8" fill="#FFFBEB" />
          <circle cx="98" cy="11" r="2.6" fill="#FEF08A" />
          <polygon points="70,13 75,20 70,27 65,20" fill={`url(#gem-${uid})`} stroke="#FFFFFF" strokeWidth="0.9" />
        </g>
      ) : palette.decade >= 9 || step >= 6 ? (
        <g>
          {/* Regal 3-Prong Crown Crest for Royal 90–99 & Step 6–9 */}
          <path
            d="M52 28 L49 14 L61 22 L70 10 L79 22 L91 14 L88 28 Z"
            fill={palette.crownColor}
            stroke="#FFFFFF"
            strokeOpacity="0.8"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <circle cx="49" cy="13" r="2" fill={palette.frameLight} />
          <circle cx="70" cy="9" r="2.4" fill="#FFFFFF" />
          <circle cx="91" cy="13" r="2" fill={palette.frameLight} />
        </g>
      ) : step >= 3 ? (
        <g>
          {/* Twin Crown Diadem Spikes beside Top Gem */}
          <path d="M56 26 L52 16 L63 23 Z" fill={palette.frameLight} opacity="0.95" />
          <path d="M84 26 L88 16 L77 23 Z" fill={palette.frameLight} opacity="0.95" />
        </g>
      ) : null}

      {/* ==================================================================
          CORE BEVELED HEXAGONAL SHIELD BODY (Iconic Silhouette)
         ================================================================== */}
      {/* Outer Beveled Metallic Frame */}
      <path
        d="M70 18 L104 30 C106 31 107 33 107 35 L103 73 C102 82 95 90 70 104 C45 90 38 82 37 73 L33 35 C33 33 34 31 36 30 Z"
        fill={`url(#frame-${uid})`}
        stroke={palette.frameLight}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      {/* Secondary Recessed Bevel Rim */}
      <path
        d="M70 24 L98 34 L95 71 C94 78 88 85 70 96 C52 85 46 78 45 71 L42 34 Z"
        fill={`url(#inner-${uid})`}
        stroke={palette.frameDark}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* Crisp Specular Top-Inner Highlight Line */}
      <path
        d="M44 36 L70 27 L96 36"
        stroke={palette.frameLight}
        strokeOpacity="0.55"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Subtle Inner Center Gloss Sheen */}
      <path
        d="M44 36 L70 27 L96 36 L94 54 C80 48 60 48 46 54 Z"
        fill="#FFFFFF"
        opacity="0.07"
      />

      {/* ==================================================================
          TOP & BOTTOM FACETED CRYSTAL GEMS
         ================================================================== */}
      {/* Top Faceted Diamond Gem (visible on all levels; sits inside crown on higher tiers) */}
      <g>
        <polygon
          points="70,12 78,21 70,29 62,21"
          fill={`url(#gem-${uid})`}
          stroke="#FFFFFF"
          strokeOpacity="0.9"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <polygon points="70,14 74,21 70,22 66,21" fill="#FFFFFF" opacity="0.55" />
      </g>

      {/* Bottom Faceted Diamond Gem */}
      <g>
        <polygon
          points="70,91 77,100 70,111 63,100"
          fill={`url(#gemBot-${uid})`}
          stroke="#FFFFFF"
          strokeOpacity="0.88"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <polygon points="70,93 74,100 70,101 66,100" fill="#FFFFFF" opacity="0.5" />
      </g>

      {/* ==================================================================
          CRISP CENTERED LEVEL NUMBER (0 through 100)
         ================================================================== */}
      <text
        x="70"
        y={safeLevel >= 100 ? '69' : '70'}
        textAnchor="middle"
        fill="#000000"
        fillOpacity="0.55"
        fontSize={fontSize}
        fontWeight="900"
        fontFamily="Georgia, 'Times New Roman', serif"
        letterSpacing={safeLevel >= 100 ? '-1.2' : '-0.4'}
        transform="translate(0, 1.8)"
      >
        {safeLevel}
      </text>
      <text
        x="70"
        y={safeLevel >= 100 ? '69' : '70'}
        textAnchor="middle"
        fill={`url(#num-${uid})`}
        stroke={palette.frameDark}
        strokeWidth="0.6"
        fontSize={fontSize}
        fontWeight="900"
        fontFamily="Georgia, 'Times New Roman', serif"
        letterSpacing={safeLevel >= 100 ? '-1.2' : '-0.4'}
      >
        {safeLevel}
      </text>
    </svg>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group relative inline-flex flex-col items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FA26A0] rounded-2xl transition-transform duration-200 hover:scale-105 active:scale-95 ${className}`}
        title={`Level ${safeLevel} · ${palette.label} — Tap to view all levels (0–100)`}
      >
        {svgMarkup}
        {showSubLabel && (
          <span
            className="mt-1 text-[10px] font-black uppercase tracking-wider leading-none"
            style={{ color: palette.frameLight }}
          >
            LV.{safeLevel} · {palette.label}
          </span>
        )}
      </button>
    );
  }

  return (
    <span
      className={`inline-flex flex-col items-center justify-center ${className}`}
      title={`Level ${safeLevel} · ${palette.label}`}
    >
      {svgMarkup}
      {showSubLabel && (
        <span
          className="mt-1 text-[10px] font-black uppercase tracking-wider leading-none"
          style={{ color: palette.frameLight }}
        >
          LV.{safeLevel} · {palette.label}
        </span>
      )}
    </span>
  );
};
