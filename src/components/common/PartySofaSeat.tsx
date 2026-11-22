import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'motion/react';
import { Lock, Mic, MicOff, Plus, ShieldCheck } from 'lucide-react';
import { PartySofaTheme, UserProfile } from '../../types';

export type PartySofaVariant = 'host' | 'cohost' | 'guest';

interface PartySofaSeatProps {
  seatIndex: number;
  variant: PartySofaVariant;
  occupant: UserProfile | null;
  isSpeaking: boolean;
  isMuted: boolean;
  isLocked: boolean;
  isLevelLocked?: boolean;
  levelLockText?: string;
  badgeText?: string;
  isModerator?: boolean;
  label: string;
  compact?: boolean;
  seatTheme?: PartySofaTheme;
  onClick: () => void;
}

interface SofaPalette {
  backTop: string;
  backMid: string;
  backBottom: string;
  cushionTop: string;
  cushionBottom: string;
  armTop: string;
  armBottom: string;
  trimStart: string;
  trimMid: string;
  trimEnd: string;
  glowColor: string;
  floorGlow: string;
  puffColor: string;
  avatarRingClass: string;
  emptyIconColor: string;
  badgeClass: string;
}

function getSofaPalette(
  variant: PartySofaVariant,
  occupied: boolean,
  isSpeaking: boolean,
  isLevelLocked: boolean,
  seatTheme: PartySofaTheme = 'default'
): SofaPalette {
  if (seatTheme === 'gold') {
    if (isLevelLocked && variant === 'cohost') {
      return {
        backTop: '#5C4212',
        backMid: '#3C2A0A',
        backBottom: '#1F1504',
        cushionTop: '#6E5018',
        cushionBottom: '#2B1D06',
        armTop: '#563D11',
        armBottom: '#1D1304',
        trimStart: '#FEF08A',
        trimMid: '#D4AF37',
        trimEnd: '#854D0E',
        glowColor: 'rgba(250, 204, 21, 0.38)',
        floorGlow:
          'radial-gradient(ellipse at center, rgba(250,204,21,0.34) 0%, rgba(180,83,9,0.18) 52%, transparent 76%)',
        puffColor: 'rgba(250, 204, 21, 0.45)',
        avatarRingClass:
          'bg-gradient-to-tr from-[#78350F] via-[#FACC15] to-[#FEF08A] shadow-[0_0_14px_rgba(250,204,21,0.35)]',
        emptyIconColor: 'text-amber-200',
        badgeClass:
          'bg-gradient-to-r from-[#4A320A] to-[#6E4C10] border border-amber-300/60 text-amber-100',
      };
    }

    const isHeroSeat = variant === 'host' || variant === 'cohost';
    return {
      backTop: isHeroSeat ? '#A16207' : occupied ? '#8F5808' : '#6B4208',
      backMid: isHeroSeat ? '#713F12' : occupied ? '#5C3608' : '#452806',
      backBottom: '#261403',
      cushionTop: isHeroSeat ? '#CA8A04' : occupied ? '#B4760A' : '#85530A',
      cushionBottom: '#3D2205',
      armTop: isHeroSeat ? '#B47A0B' : '#7C4D09',
      armBottom: '#2C1804',
      trimStart: isSpeaking ? '#A7F3D0' : '#FFF7C2',
      trimMid: isSpeaking ? '#34D399' : '#FFD700',
      trimEnd: isSpeaking ? '#059669' : '#B45309',
      glowColor: isSpeaking ? 'rgba(52, 211, 153, 0.65)' : 'rgba(255, 215, 0, 0.52)',
      floorGlow: isSpeaking
        ? 'radial-gradient(ellipse at center, rgba(52,211,153,0.58) 0%, rgba(255,215,0,0.34) 48%, transparent 76%)'
        : 'radial-gradient(ellipse at center, rgba(255,215,0,0.52) 0%, rgba(217,119,6,0.24) 50%, transparent 76%)',
      puffColor: 'rgba(255, 215, 0, 0.6)',
      avatarRingClass: isSpeaking
        ? 'bg-gradient-to-tr from-emerald-400 via-yellow-300 to-amber-300 shadow-[0_0_16px_rgba(52,211,153,0.55)]'
        : 'bg-gradient-to-tr from-[#92400E] via-[#FFD700] to-[#FFF7C2] shadow-[0_0_18px_rgba(255,215,0,0.52)]',
      emptyIconColor: 'text-[#FEF08A]',
      badgeClass:
        variant === 'host'
          ? 'bg-gradient-to-r from-[#FFF099] via-[#FFD700] to-[#F59E0B] text-[#221202]'
          : variant === 'cohost'
          ? 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white'
          : 'bg-[#3D2205]/90 border border-amber-400/40 text-amber-100',
    };
  }

  if (seatTheme === 'green') {
    if (isLevelLocked && variant === 'cohost') {
      return {
        backTop: '#164E3F',
        backMid: '#0F362B',
        backBottom: '#071F18',
        cushionTop: '#1D5E4C',
        cushionBottom: '#0B2A21',
        armTop: '#14473A',
        armBottom: '#081F19',
        trimStart: '#BBF7D0',
        trimMid: '#6EE7B7',
        trimEnd: '#10B981',
        glowColor: 'rgba(110, 231, 183, 0.38)',
        floorGlow:
          'radial-gradient(ellipse at center, rgba(110,231,183,0.34) 0%, rgba(16,185,129,0.16) 52%, transparent 76%)',
        puffColor: 'rgba(110, 231, 183, 0.45)',
        avatarRingClass:
          'bg-gradient-to-tr from-[#065F46] via-[#6EE7B7] to-[#D1FAE5] shadow-[0_0_14px_rgba(110,231,183,0.36)]',
        emptyIconColor: 'text-emerald-200',
        badgeClass:
          'bg-gradient-to-r from-[#0F3D30] to-[#175B48] border border-emerald-300/60 text-emerald-100',
      };
    }

    const isHeroSeat = variant === 'host' || variant === 'cohost';
    return {
      backTop: isHeroSeat ? '#1E7A5D' : occupied ? '#1A6B52' : '#145340',
      backMid: isHeroSeat ? '#125440' : occupied ? '#104937' : '#0D3B2D',
      backBottom: '#062018',
      cushionTop: isHeroSeat ? '#289974' : occupied ? '#228666' : '#1B6E54',
      cushionBottom: '#0A3024',
      armTop: isHeroSeat ? '#218766' : '#18634C',
      armBottom: '#08251C',
      trimStart: '#DCFCE7',
      trimMid: isSpeaking ? '#34D399' : '#6EE7B7',
      trimEnd: '#10B981',
      glowColor: isSpeaking ? 'rgba(52, 211, 153, 0.7)' : 'rgba(110, 231, 183, 0.48)',
      floorGlow: isSpeaking
        ? 'radial-gradient(ellipse at center, rgba(52,211,153,0.62) 0%, rgba(110,231,183,0.32) 48%, transparent 76%)'
        : 'radial-gradient(ellipse at center, rgba(110,231,183,0.48) 0%, rgba(16,185,129,0.22) 50%, transparent 76%)',
      puffColor: 'rgba(110, 231, 183, 0.58)',
      avatarRingClass: isSpeaking
        ? 'bg-gradient-to-tr from-emerald-300 via-teal-200 to-green-300 shadow-[0_0_18px_rgba(110,231,183,0.65)]'
        : 'bg-gradient-to-tr from-[#047857] via-[#6EE7B7] to-[#D1FAE5] shadow-[0_0_16px_rgba(110,231,183,0.48)]',
      emptyIconColor: 'text-[#A7F3D0]',
      badgeClass:
        variant === 'host'
          ? 'bg-gradient-to-r from-[#BBF7D0] via-[#6EE7B7] to-[#34D399] text-[#052319]'
          : variant === 'cohost'
          ? 'bg-gradient-to-r from-[#34D399] to-[#10B981] text-[#052319]'
          : 'bg-[#0B3327]/90 border border-emerald-300/40 text-emerald-100',
    };
  }

  if (variant === 'host') {
    return {
      backTop: '#5E1B89',
      backMid: '#370E5C',
      backBottom: '#1B0632',
      cushionTop: '#7B25A8',
      cushionBottom: '#2B0A4B',
      armTop: '#6A1E96',
      armBottom: '#22083B',
      trimStart: '#FFE878',
      trimMid: '#FFB703',
      trimEnd: '#C98507',
      glowColor: isSpeaking ? 'rgba(52, 211, 153, 0.65)' : 'rgba(255, 215, 0, 0.45)',
      floorGlow: isSpeaking
        ? 'radial-gradient(ellipse at center, rgba(52,211,153,0.58) 0%, rgba(255,215,0,0.28) 45%, transparent 75%)'
        : 'radial-gradient(ellipse at center, rgba(255,215,0,0.48) 0%, rgba(168,85,247,0.24) 48%, transparent 76%)',
      puffColor: 'rgba(255, 223, 0, 0.55)',
      avatarRingClass:
        'bg-gradient-to-tr from-[#9B7110] via-[#FFDF00] to-[#FFF099] shadow-[0_0_18px_rgba(255,223,0,0.5)]',
      emptyIconColor: 'text-[#FFE266]',
      badgeClass: 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black',
    };
  }

  if (variant === 'cohost') {
    if (isLevelLocked) {
      return {
        backTop: '#331F4C',
        backMid: '#211234',
        backBottom: '#120820',
        cushionTop: '#3D255B',
        cushionBottom: '#190C29',
        armTop: '#2E1A46',
        armBottom: '#130921',
        trimStart: '#B794F4',
        trimMid: '#7C4DB8',
        trimEnd: '#4C2B7A',
        glowColor: 'rgba(139, 92, 246, 0.32)',
        floorGlow:
          'radial-gradient(ellipse at center, rgba(168,85,247,0.34) 0%, rgba(245,158,11,0.12) 50%, transparent 76%)',
        puffColor: 'rgba(168, 85, 247, 0.4)',
        avatarRingClass:
          'bg-gradient-to-tr from-[#3B2654] via-[#6B4696] to-[#2B1740] shadow-[0_0_14px_rgba(139,32,255,0.28)]',
        emptyIconColor: 'text-amber-300',
        badgeClass:
          'bg-gradient-to-r from-[#3B2654] to-[#523073] border border-amber-400/50 text-amber-200',
      };
    }
    return {
      backTop: '#7E1256',
      backMid: '#4A0C3C',
      backBottom: '#210625',
      cushionTop: '#9D1B6A',
      cushionBottom: '#350931',
      armTop: '#88165D',
      armBottom: '#280728',
      trimStart: '#FF9AD5',
      trimMid: '#FA26A0',
      trimEnd: '#A8126C',
      glowColor: isSpeaking ? 'rgba(52, 211, 153, 0.65)' : 'rgba(250, 38, 160, 0.45)',
      floorGlow: isSpeaking
        ? 'radial-gradient(ellipse at center, rgba(52,211,153,0.58) 0%, rgba(250,38,160,0.28) 45%, transparent 75%)'
        : 'radial-gradient(ellipse at center, rgba(250,38,160,0.48) 0%, rgba(139,32,255,0.22) 48%, transparent 76%)',
      puffColor: 'rgba(250, 38, 160, 0.55)',
      avatarRingClass:
        'bg-gradient-to-tr from-[#B5179E] via-[#FA26A0] to-[#FF85C8] shadow-[0_0_18px_rgba(250,38,160,0.48)]',
      emptyIconColor: 'text-[#FFB3DE]',
      badgeClass: 'bg-gradient-to-r from-[#FA26A0] to-[#FF007A] text-white',
    };
  }

  // Guest Sofas
  if (occupied) {
    return {
      backTop: '#4E1D7A',
      backMid: '#2D104F',
      backBottom: '#16062C',
      cushionTop: '#64249A',
      cushionBottom: '#230B3F',
      armTop: '#562086',
      armBottom: '#1A0733',
      trimStart: isSpeaking ? '#6EE7B7' : '#FFE885',
      trimMid: isSpeaking ? '#10B981' : '#F59E0B',
      trimEnd: isSpeaking ? '#059669' : '#B45309',
      glowColor: isSpeaking ? 'rgba(52, 211, 153, 0.65)' : 'rgba(255, 200, 74, 0.42)',
      floorGlow: isSpeaking
        ? 'radial-gradient(ellipse at center, rgba(52,211,153,0.6) 0%, rgba(16,185,129,0.22) 48%, transparent 76%)'
        : 'radial-gradient(ellipse at center, rgba(255,200,74,0.38) 0%, rgba(168,85,247,0.24) 50%, transparent 76%)',
      puffColor: 'rgba(255, 215, 90, 0.52)',
      avatarRingClass: isSpeaking
        ? 'bg-gradient-to-tr from-emerald-400 via-teal-300 to-cyan-300 shadow-[0_0_14px_rgba(52,211,153,0.55)]'
        : 'bg-gradient-to-tr from-[#D4AF37] via-[#FFDF00] to-[#AA7C11] shadow-[0_0_12px_rgba(255,223,0,0.35)]',
      emptyIconColor: 'text-white/85',
      badgeClass: 'bg-[#1D0B36]/90 text-white',
    };
  }

  return {
    backTop: '#262057',
    backMid: '#18113C',
    backBottom: '#0E0724',
    cushionTop: '#312A6D',
    cushionBottom: '#140D33',
    armTop: '#2A235F',
    armBottom: '#10092A',
    trimStart: '#67E8F9',
    trimMid: '#22D3EE',
    trimEnd: '#7C3AED',
    glowColor: 'rgba(56, 189, 248, 0.34)',
    floorGlow:
      'radial-gradient(ellipse at center, rgba(34,211,238,0.32) 0%, rgba(139,92,246,0.2) 48%, transparent 76%)',
    puffColor: 'rgba(56, 189, 248, 0.45)',
    avatarRingClass: 'bg-gradient-to-tr from-[#0096C7] via-[#22D3EE] to-[#A855F7]',
    emptyIconColor: 'text-cyan-200/90',
    badgeClass: 'bg-[#170A2E]/90 text-white/80',
  };
}

export const PartySofaSeat: React.FC<PartySofaSeatProps> = ({
  seatIndex,
  variant,
  occupant,
  isSpeaking,
  isMuted,
  isLocked,
  isLevelLocked = false,
  levelLockText = 'Lv.5',
  badgeText,
  isModerator = false,
  label,
  compact = false,
  seatTheme = 'default',
  onClick,
}) => {
  const isHero = variant === 'host' || variant === 'cohost';
  const occupied = Boolean(occupant) && !isLevelLocked;
  const occupantKey = occupied && occupant ? occupant.id : null;
  const palette = getSofaPalette(variant, occupied, isSpeaking, isLevelLocked, seatTheme);

  // Motion controllers for physical "plump" cushion squish (join) & fluff-up rebound (leave)
  const sofaCushionControls = useAnimationControls();
  const frontLipControls = useAnimationControls();
  const prevOccupantIdRef = useRef<string | null>(occupantKey);
  const [cushionPuffId, setCushionPuffId] = useState<number>(0);

  useEffect(() => {
    const prevId = prevOccupantIdRef.current;
    if (prevId === occupantKey) return;
    prevOccupantIdRef.current = occupantKey;

    if (occupantKey !== null) {
      // USER JOINED SEAT: Plump downward cushion squash under weight, then soft pillowy rebound
      setCushionPuffId((n) => n + 1);
      void sofaCushionControls.start({
        scaleX: [1, 1.15, 0.93, 1.05, 0.985, 1],
        scaleY: [1, 0.81, 1.1, 0.955, 1.02, 1],
        y: [0, 4.5, -2.5, 1, -0.5, 0],
        transition: {
          duration: 0.68,
          times: [0, 0.22, 0.48, 0.7, 0.86, 1],
          ease: 'easeInOut',
        },
      });
      void frontLipControls.start({
        scaleX: [1, 1.12, 0.95, 1.03, 1],
        scaleY: [1, 0.84, 1.09, 0.97, 1],
        y: [0, 3.2, -1.4, 0.5, 0],
        transition: {
          duration: 0.66,
          times: [0, 0.24, 0.52, 0.76, 1],
          ease: 'easeInOut',
        },
      });
    } else {
      // USER LEFT SEAT: Cushion uncompresses & fluffs upward, then settles softly into resting shape
      setCushionPuffId((n) => n + 1);
      void sofaCushionControls.start({
        scaleX: [1, 0.9, 1.08, 0.97, 1.015, 1],
        scaleY: [1, 1.16, 0.92, 1.04, 0.99, 1],
        y: [0, -4.5, 1.8, -0.8, 0.3, 0],
        transition: {
          duration: 0.62,
          times: [0, 0.24, 0.5, 0.72, 0.88, 1],
          ease: 'easeInOut',
        },
      });
      void frontLipControls.start({
        scaleY: [1, 1.14, 0.94, 1.03, 1],
        y: [0, -3, 1.2, -0.4, 0],
        transition: {
          duration: 0.58,
          times: [0, 0.25, 0.55, 0.8, 1],
          ease: 'easeInOut',
        },
      });
    }
  }, [occupantKey, sofaCushionControls, frontLipControls]);

  // Unique SVG gradient IDs per seat so multiple sofas never collide
  const uid = `sofa_${seatIndex}_${variant}`;
  const delaySec = `${((seatIndex % 6) * 0.42).toFixed(2)}s`;

  // Sizing tuned cleanly for Hero thrones, standard 5/8-seat grid, and 16-seat compact grid
  const stageBoxClass = isHero
    ? 'w-[106px] h-[94px] sm:w-[116px] sm:h-[102px]'
    : compact
    ? 'w-[72px] h-[66px] sm:w-[82px] sm:h-[74px]'
    : 'w-[86px] h-[78px] sm:w-[96px] sm:h-[84px]';

  const avatarOuterClass = isHero
    ? 'w-[58px] h-[58px] sm:w-[64px] sm:h-[64px]'
    : compact
    ? 'w-[40px] h-[40px] sm:w-[44px] sm:h-[44px]'
    : 'w-[48px] h-[48px] sm:w-[52px] sm:h-[52px]';

  const avatarOffsetClass = isHero
    ? 'top-[9px] sm:top-[10px]'
    : compact
    ? 'top-[6px] sm:top-[7px]'
    : 'top-[7px] sm:top-[8px]';

  return (
    <motion.div
      data-seat-interactive="true"
      onClick={onClick}
      whileTap={{
        scaleX: 1.07,
        scaleY: 0.91,
        y: 2,
        transition: { type: 'spring', stiffness: 520, damping: 18 },
      }}
      style={{ transformOrigin: '50% 78%' }}
      className="flex flex-col items-center cursor-pointer group select-none"
    >
      <div className={`relative flex items-center justify-center ${stageBoxClass}`}>
        {/* Floating Crown for Host Throne */}
        {variant === 'host' && (
          <div
            className="absolute -top-3.5 left-1/2 z-30 text-base sm:text-lg drop-shadow-[0_0_8px_rgba(255,215,0,0.85)] pointer-events-none animate-sofa-crown"
            aria-hidden="true"
          >
            👑
          </div>
        )}

        {/* Speaking Outer Sonic Ripple Merged Into Stage */}
        {isSpeaking && occupied && (
          <div
            className="absolute inset-x-1 bottom-1 top-3 rounded-full border-2 border-emerald-400/75 animate-audio-wave pointer-events-none z-0"
            style={{ boxShadow: '0 0 18px rgba(52,211,153,0.45)' }}
          />
        )}

        {/* Plump Cushion Impact Puff Halo (triggers cleanly on Join or Leave) */}
        <AnimatePresence>
          {cushionPuffId > 0 && (
            <motion.div
              key={cushionPuffId}
              initial={{ opacity: 0.72, scaleX: 0.7, scaleY: 0.6 }}
              animate={{ opacity: 0, scaleX: 1.42, scaleY: 1.15 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.56, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[88%] h-7 rounded-full blur-md pointer-events-none z-0"
              style={{
                background: `radial-gradient(ellipse at center, ${palette.puffColor} 0%, transparent 72%)`,
              }}
            />
          )}
        </AnimatePresence>

        {/* Organic Under-Sofa Stage Floor Aura (Merges Sofa Into Any Room Background) */}
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[92%] h-5 rounded-full blur-md pointer-events-none z-0 animate-sofa-floor"
          style={{
            background: palette.floorGlow,
            animationDelay: delaySec,
          }}
        />

        {/* Animated Plush Velvet Sofa Wrapper (Idle Breath / Speaking Pulse) */}
        <div
          className={`relative w-full h-full flex items-center justify-center ${
            isSpeaking && occupied ? 'animate-sofa-speak' : 'animate-sofa-breathe'
          }`}
          style={{ animationDelay: isSpeaking ? '0s' : delaySec }}
        >
          {/* Physical Plump Cushion Physics Container (Squashes on Sit, Fluffs Up on Leave) */}
          <motion.div
            animate={sofaCushionControls}
            style={{ transformOrigin: '50% 82%' }}
            className="relative w-full h-full flex items-center justify-center"
          >
            {/* BACK LAYER SVG: Plush Tufted Backrest + Soft Inner Cavity + Curved Armrests */}
            <svg
              viewBox="0 0 120 100"
              className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-0"
              style={{
                filter: `drop-shadow(0 6px 10px rgba(4, 1, 14, 0.72)) drop-shadow(0 0 10px ${palette.glowColor})`,
              }}
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={`${uid}_back`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={palette.backTop} stopOpacity="0.96" />
                  <stop offset="55%" stopColor={palette.backMid} stopOpacity="0.94" />
                  <stop offset="100%" stopColor={palette.backBottom} stopOpacity="0.98" />
                </linearGradient>
                <linearGradient id={`${uid}_cushion`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={palette.cushionTop} stopOpacity="0.95" />
                  <stop offset="100%" stopColor={palette.cushionBottom} stopOpacity="0.98" />
                </linearGradient>
                <linearGradient id={`${uid}_arm`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={palette.armTop} stopOpacity="0.98" />
                  <stop offset="100%" stopColor={palette.armBottom} stopOpacity="0.98" />
                </linearGradient>
                <linearGradient id={`${uid}_trim`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={palette.trimStart} />
                  <stop offset="50%" stopColor={palette.trimMid} />
                  <stop offset="100%" stopColor={palette.trimEnd} />
                </linearGradient>
                <radialGradient id={`${uid}_sheen`} cx="50%" cy="18%" r="60%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.34" />
                  <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Sculpted Throne/Lounge Backrest */}
              <path
                d={
                  isHero
                    ? 'M 22 66 C 18 38, 25 14, 60 11 C 95 14, 102 38, 98 66 Z'
                    : 'M 23 68 C 20 42, 27 19, 60 17 C 93 19, 100 42, 97 68 Z'
                }
                fill={`url(#${uid}_back)`}
                stroke={`url(#${uid}_trim)`}
                strokeWidth={isHero ? '2.2' : '1.8'}
              />

              {/* Soft Velvet Specular Sheen on Backrest */}
              <path
                d={
                  isHero
                    ? 'M 26 60 C 23 38, 30 18, 60 15 C 90 18, 97 38, 94 60 Z'
                    : 'M 27 62 C 25 42, 32 23, 60 21 C 88 23, 95 42, 93 62 Z'
                }
                fill={`url(#${uid}_sheen)`}
              />

              {/* Animated Velvet Rim Glint */}
              <g opacity={occupied ? 0.5 : 0.75}>
                <path
                  d={isHero ? 'M 33 22 Q 60 13 87 22' : 'M 35 26 Q 60 19 85 26'}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeOpacity="0.45"
                  className="animate-pulse"
                />
              </g>

              {/* Subtle Royal Tufting Buttons on Backrest */}
              <g opacity={occupied ? 0.25 : 0.65}>
                <circle cx="46" cy="36" r="1.6" fill={palette.trimStart} />
                <circle cx="60" cy="31" r="1.8" fill={palette.trimStart} />
                <circle cx="74" cy="36" r="1.6" fill={palette.trimStart} />
                <path
                  d="M 46 36 L 60 31 L 74 36"
                  fill="none"
                  stroke={palette.trimMid}
                  strokeWidth="0.6"
                  strokeOpacity="0.45"
                />
              </g>

              {/* Seat Base Cushion */}
              <rect
                x="21"
                y="60"
                width="78"
                height="20"
                rx="10"
                fill={`url(#${uid}_cushion)`}
                stroke={`url(#${uid}_trim)`}
                strokeWidth="1.2"
                strokeOpacity="0.7"
              />

              {/* Left Rolled Armrest */}
              <path
                d="M 11 52 C 11 41, 27 41, 27 53 L 26 78 C 26 83, 13 83, 12 76 Z"
                fill={`url(#${uid}_arm)`}
                stroke={`url(#${uid}_trim)`}
                strokeWidth="1.6"
              />

              {/* Right Rolled Armrest */}
              <path
                d="M 109 52 C 109 41, 93 41, 93 53 L 94 78 C 94 83, 107 83, 108 76 Z"
                fill={`url(#${uid}_arm)`}
                stroke={`url(#${uid}_trim)`}
                strokeWidth="1.6"
              />

              {/* Metallic Feet Under Sofa */}
              <path
                d="M 22 83 L 25 91 L 30 91 L 31 84 Z M 98 83 L 95 91 L 90 91 L 89 84 Z"
                fill={`url(#${uid}_trim)`}
                opacity="0.9"
              />
            </svg>

            {/* MIDDLE LAYER: AnimatePresence Seated Avatar / Empty Cushion Plump Spring Transitions */}
            <div className={`absolute left-1/2 -translate-x-1/2 ${avatarOffsetClass} ${avatarOuterClass} z-10`}>
              <AnimatePresence initial={false}>
                {occupied && occupant ? (
                  <motion.div
                    key={`seated_${occupant.id}`}
                    initial={{
                      opacity: 0,
                      y: -18,
                      scaleX: 0.84,
                      scaleY: 1.16,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scaleX: 1,
                      scaleY: 1,
                    }}
                    exit={{
                      opacity: 0,
                      y: -16,
                      scaleX: 0.82,
                      scaleY: 1.15,
                      transition: { duration: 0.26, ease: [0.32, 0, 0.67, 0] },
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 410,
                      damping: 15,
                      mass: 0.88,
                    }}
                    style={{ transformOrigin: '50% 85%' }}
                    className={`absolute inset-0 rounded-full p-[2.5px] ${palette.avatarRingClass}`}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden bg-[#140826] border border-white/25 flex items-center justify-center">
                      {occupant.avatar ? (
                        <img
                          src={occupant.avatar}
                          alt={occupant.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className={`${isHero ? 'text-lg' : 'text-xs'} font-black text-white`}>
                          {(occupant.name || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`empty_${seatIndex}_${isLevelLocked ? 'lv' : isLocked ? 'lock' : 'open'}`}
                    initial={{ opacity: 0, scale: 0.55, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{
                      opacity: 0,
                      scale: 0.5,
                      y: 8,
                      transition: { duration: 0.16, ease: 'easeIn' },
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 380,
                      damping: 17,
                      delay: 0.06,
                    }}
                    className="absolute inset-0 rounded-full flex flex-col items-center justify-center transition-transform duration-200 group-hover:scale-105"
                  >
                    {isLevelLocked ? (
                      <div className="flex flex-col items-center justify-center bg-[#180A2D]/75 border border-amber-400/45 rounded-full w-full h-full backdrop-blur-[2px]">
                        <Lock className={`${isHero ? 'w-4 h-4' : 'w-3.5 h-3.5'} text-amber-300`} />
                        <span className="text-[8px] font-black text-amber-200 mt-0.5 leading-none">
                          {levelLockText}
                        </span>
                      </div>
                    ) : isLocked ? (
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black/35 border border-white/15">
                        <Lock className="w-3.5 h-3.5 text-white/55" />
                      </div>
                    ) : (
                      <div
                        className={`flex items-center justify-center rounded-full bg-white/[0.08] border border-white/20 backdrop-blur-[1px] shadow-inner ${
                          isHero ? 'w-9 h-9' : compact ? 'w-6 h-6' : 'w-7 h-7'
                        }`}
                      >
                        <Plus
                          className={`${isHero ? 'w-5 h-5' : compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${palette.emptyIconColor} transition-transform group-hover:rotate-90 duration-200`}
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* FRONT LAYER SVG (Self-contained defs + Independent Plump Cushion Rim Dip) */}
            <motion.svg
              animate={frontLipControls}
              style={{ transformOrigin: '50% 84%' }}
              viewBox="0 0 120 100"
              className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-20"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={`${uid}_front_cushion`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={palette.cushionTop} stopOpacity="0.96" />
                  <stop offset="100%" stopColor={palette.cushionBottom} stopOpacity="0.99" />
                </linearGradient>
                <linearGradient id={`${uid}_front_arm`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={palette.armTop} stopOpacity="0.98" />
                  <stop offset="100%" stopColor={palette.armBottom} stopOpacity="0.99" />
                </linearGradient>
                <linearGradient id={`${uid}_front_trim`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={palette.trimStart} />
                  <stop offset="50%" stopColor={palette.trimMid} />
                  <stop offset="100%" stopColor={palette.trimEnd} />
                </linearGradient>
              </defs>

              {/* Front Cushion Rim Overlapping Lower Edge of Avatar so User Looks Truly Seated */}
              <path
                d="M 19 71 Q 60 77 101 71 L 99 81 Q 60 87 21 81 Z"
                fill={`url(#${uid}_front_cushion)`}
                stroke={`url(#${uid}_front_trim)`}
                strokeWidth="1.5"
              />
              {/* Front Armrest Caps */}
              <ellipse
                cx="19"
                cy="67"
                rx="6.2"
                ry="7.8"
                fill={`url(#${uid}_front_arm)`}
                stroke={`url(#${uid}_front_trim)`}
                strokeWidth="1.4"
              />
              <ellipse
                cx="101"
                cy="67"
                rx="6.2"
                ry="7.8"
                fill={`url(#${uid}_front_arm)`}
                stroke={`url(#${uid}_front_trim)`}
                strokeWidth="1.4"
              />
              {/* Specular Front Piped Edge */}
              <path
                d="M 27 74.5 Q 60 79.5 93 74.5"
                fill="none"
                stroke={palette.trimStart}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeOpacity="0.85"
              />
            </motion.svg>

            {/* Speaking Micro-Equalizer Bars Along Sofa Front Trim */}
            <AnimatePresence>
              {isSpeaking && occupied && (
                <motion.div
                  initial={{ opacity: 0, scaleY: 0.4 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0, scaleY: 0.4 }}
                  transition={{ duration: 0.18 }}
                  className="absolute bottom-[13px] left-1/2 -translate-x-1/2 z-30 flex items-end gap-[2px] pointer-events-none"
                  aria-hidden="true"
                >
                  <span
                    className="w-[2.5px] h-2 rounded-full bg-emerald-300 shadow-[0_0_6px_#34D399] animate-sofa-wave"
                    style={{ animationDelay: '0s' }}
                  />
                  <span
                    className="w-[2.5px] h-3 rounded-full bg-emerald-200 shadow-[0_0_6px_#6EE7B7] animate-sofa-wave"
                    style={{ animationDelay: '0.15s' }}
                  />
                  <span
                    className="w-[2.5px] h-2 rounded-full bg-emerald-300 shadow-[0_0_6px_#34D399] animate-sofa-wave"
                    style={{ animationDelay: '0.3s' }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mic Status Indicator Anchored Cleanly on Right Armrest (Plump Spring Pop) */}
            <AnimatePresence>
              {occupied && (
                <motion.div
                  key="mic_indicator"
                  initial={{ scale: 0, opacity: 0, rotate: -25 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0, opacity: 0, rotate: 20, transition: { duration: 0.16 } }}
                  transition={{ type: 'spring', stiffness: 480, damping: 16, delay: 0.08 }}
                  className={`absolute z-30 ${
                    isHero
                      ? 'bottom-[14px] right-[9px] w-5 h-5'
                      : compact
                      ? 'bottom-[9px] right-[4px] w-4 h-4'
                      : 'bottom-[11px] right-[6px] w-4 h-4'
                  } rounded-full border border-white/80 flex items-center justify-center shadow-md ${
                    isMuted
                      ? 'bg-rose-600'
                      : isSpeaking
                      ? 'bg-emerald-500'
                      : 'bg-[#120724]'
                  }`}
                >
                  {isMuted ? (
                    <MicOff className={`${isHero ? 'w-3 h-3' : 'w-2.5 h-2.5'} text-white`} />
                  ) : (
                    <Mic
                      className={`${isHero ? 'w-3 h-3' : 'w-2.5 h-2.5'} ${
                        isSpeaking ? 'text-white' : 'text-emerald-300'
                      }`}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Optional Hero Pill Badge (Host / Seat 2 / Lv.5 Lock) */}
      {badgeText && (
        <div
          className={`relative z-30 -mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase shadow ${palette.badgeClass}`}
        >
          {badgeText}
        </div>
      )}

      {/* Participant Name or Seat Number (Smooth Crossfade on Join/Leave) */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={label}
          initial={{ opacity: 0, y: 4, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -3, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          className={`${badgeText ? 'mt-0.5' : '-mt-0.5'} ${
            isHero
              ? 'text-xs font-black max-w-[98px]'
              : compact
              ? 'text-[9px] sm:text-[10px] font-bold max-w-[66px]'
              : 'text-[10px] sm:text-[11px] font-bold max-w-[78px]'
          } text-white/95 truncate text-center drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]`}
        >
          {label}
        </motion.span>
      </AnimatePresence>

      {/* Lifetime Moderator Tag right below name on seat */}
      {occupied && isModerator && (
        <div className="mt-0.5 inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-gradient-to-r from-cyan-500/95 via-sky-500/95 to-indigo-500/95 border border-cyan-200/50 shadow-[0_0_8px_rgba(34,211,238,0.45)]">
          <ShieldCheck className="w-2.5 h-2.5 text-white shrink-0" />
          <span className="text-[7.5px] sm:text-[8px] font-black uppercase tracking-wider text-white leading-none">
            Moderator
          </span>
        </div>
      )}
    </motion.div>
  );
};
