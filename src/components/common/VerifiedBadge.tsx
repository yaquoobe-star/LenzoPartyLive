import React, { useId, useState } from 'react';
import { X, CheckCircle2, Sparkles, Crown, ShieldCheck } from 'lucide-react';
import { UserProfile, VerificationTier } from '../../types';
import { isAuthorizedAdminEmail } from '../../utils/adminAuth';

export interface ResolvedVerification {
  tier: VerificationTier;
  isVerified: boolean;
  isLegend: boolean;
  isRespected: boolean;
  tagLabel: string;
  badgeTitle: string;
  subtitle: string;
  reason: string;
}

export function resolveVerificationStatus(params: {
  user?: Partial<UserProfile> | null;
  level?: number;
  vipLevel?: number;
  superVipLevel?: number;
}): ResolvedVerification {
  const user = params.user;
  const level = params.level ?? user?.level ?? 0;
  const vipLevel = params.vipLevel ?? user?.vipLevel ?? 0;
  const superVipLevel = params.superVipLevel ?? user?.superVipLevel ?? 0;
  const followers = user?.followersCount ?? 0;
  const isAdminAccount = isAuthorizedAdminEmail(user?.email);
  const customTag = user?.verifiedTag?.trim();

  let tier: VerificationTier = 'none';
  let reason = 'Reach Lv.8, unlock VIP 1, join a verified agency, or receive Admin verification.';

  if (user?.verificationTier === 'gold') {
    tier = 'gold';
    reason = 'Awarded Official Legend Verification.';
  } else if (user?.verificationTier === 'blue') {
    tier = 'blue';
    reason = 'Awarded Official Respect Verification.';
  } else if (user?.verificationTier === 'none') {
    tier = 'none';
  } else {
    // Automatic progression & authority tier derivation
    if (isAdminAccount || level >= 50 || superVipLevel >= 3 || vipLevel >= 6) {
      tier = 'gold';
      if (isAdminAccount) {
        reason = 'Official Lenzo Party Founder & Legend.';
      } else if (level >= 50) {
        reason = `Earned at Level ${level} (Legend Tier Lv.50+).`;
      } else if (superVipLevel >= 3) {
        reason = `Earned via Super VIP ${superVipLevel} Legend status.`;
      } else {
        reason = `Earned via VIP ${vipLevel} Legend status.`;
      }
    } else if (
      user?.isVerified ||
      level >= 8 ||
      vipLevel >= 1 ||
      followers >= 1000 ||
      user?.agencyStatus === 'active'
    ) {
      tier = 'blue';
      if (user?.isVerified) {
        reason = 'Verified Respected Creator on Lenzo Party.';
      } else if (level >= 8) {
        reason = `Earned at Level ${level} (Respected Member Lv.8+).`;
      } else if (vipLevel >= 1) {
        reason = `Earned via VIP ${vipLevel} Membership.`;
      } else if (followers >= 1000) {
        reason = 'Earned with 1,000+ community followers.';
      } else {
        reason = 'Earned as an active verified Agency member.';
      }
    }
  }

  if (tier === 'gold') {
    return {
      tier: 'gold',
      isVerified: true,
      isLegend: true,
      isRespected: true,
      tagLabel: customTag || 'Legend',
      badgeTitle: 'Verified Legend',
      subtitle: 'Golden Tick · Legends',
      reason,
    };
  }

  if (tier === 'blue') {
    return {
      tier: 'blue',
      isVerified: true,
      isLegend: false,
      isRespected: true,
      tagLabel: customTag || 'Respect',
      badgeTitle: 'Verified · Respect',
      subtitle: 'Blue Tick · Respect',
      reason,
    };
  }

  return {
    tier: 'none',
    isVerified: false,
    isLegend: false,
    isRespected: false,
    tagLabel: '',
    badgeTitle: 'Not Verified',
    subtitle: 'Verification Tiers',
    reason,
  };
}

interface VerifiedTickProps {
  tier: Exclude<VerificationTier, 'none'>;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const TICK_SIZES: Record<'xs' | 'sm' | 'md' | 'lg', number> = {
  xs: 15,
  sm: 18,
  md: 21,
  lg: 34,
};

/**
 * Crisp 12-point scalloped verification seal SVG:
 * - 'blue' => Radiant sapphire/azure Blue Tick for Respect
 * - 'gold' => Gleaming 24K molten-gold Golden Tick for Legends
 */
export const VerifiedTick: React.FC<VerifiedTickProps> = ({
  tier,
  size = 'sm',
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const px = TICK_SIZES[size];
  const isGold = tier === 'gold';

  const sealPath =
    'M16 1.6 L19.1 4.1 L23.1 3.7 L24.5 7.4 L28.2 8.8 L27.8 12.8 L30.4 16 L27.8 19.2 L28.2 23.2 L24.5 24.6 L23.1 28.3 L19.1 27.9 L16 30.4 L12.9 27.9 L8.9 28.3 L7.5 24.6 L3.8 23.2 L4.2 19.2 L1.6 16 L4.2 12.8 L3.8 8.8 L7.5 7.4 L8.9 3.7 L12.9 4.1 Z';

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={isGold ? 'Golden Tick — Verified Legend' : 'Blue Tick — Verified for Respect'}
      className={`shrink-0 ${
        isGold
          ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.65)]'
          : 'drop-shadow-[0_0_7px_rgba(56,189,248,0.6)]'
      } ${className}`}
    >
      <defs>
        {isGold ? (
          <>
            <linearGradient id={`vt_bg_${uid}`} x1="3" y1="2" x2="29" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="35%" stopColor="#FBBF24" />
              <stop offset="72%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>
            <linearGradient id={`vt_rim_${uid}`} x1="6" y1="3" x2="26" y2="29" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFBEB" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#FDE047" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#78350F" stopOpacity="0.8" />
            </linearGradient>
            <radialGradient id={`vt_shine_${uid}`} cx="34%" cy="26%" r="55%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
            </radialGradient>
          </>
        ) : (
          <>
            <linearGradient id={`vt_bg_${uid}`} x1="3" y1="2" x2="29" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7DD3FC" />
              <stop offset="38%" stopColor="#38BDF8" />
              <stop offset="74%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id={`vt_rim_${uid}`} x1="6" y1="3" x2="26" y2="29" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#60A5FA" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0.8" />
            </linearGradient>
            <radialGradient id={`vt_shine_${uid}`} cx="34%" cy="26%" r="55%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
            </radialGradient>
          </>
        )}
      </defs>

      {/* Outer Scalloped Seal */}
      <path
        d={sealPath}
        fill={`url(#vt_bg_${uid})`}
        stroke={`url(#vt_rim_${uid})`}
        strokeWidth="1.25"
        strokeLinejoin="round"
      />

      {/* Specular Gloss Overlay */}
      <circle cx="16" cy="16" r="10.2" fill={`url(#vt_shine_${uid})`} />

      {/* Inner Crisp Ring */}
      <circle
        cx="16"
        cy="16"
        r="9.4"
        fill="none"
        stroke={isGold ? '#FEF9C3' : '#E0F2FE'}
        strokeOpacity="0.38"
        strokeWidth="0.9"
      />

      {/* Checkmark Shadow for razor-sharp legibility */}
      <path
        d="M11.2 16.6 L14.5 19.9 L21.4 12.6"
        stroke={isGold ? '#78350F' : '#1E3A8A'}
        strokeOpacity="0.55"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(0 0.8)"
      />

      {/* Crisp Checkmark */}
      <path
        d="M11.2 16.6 L14.5 19.9 L21.4 12.6"
        stroke="#FFFFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

interface VerifiedNameTagProps {
  user?: Partial<UserProfile> | null;
  level?: number;
  vipLevel?: number;
  superVipLevel?: number;
  /** Compact mode renders only the tick icon (for lists/headers); full mode renders Tick + Verified Tag */
  variant?: 'full' | 'compact';
  /** When user is not yet verified, show a subtle tappable badge to inspect Blue & Golden tick tiers */
  showUnverifiedHint?: boolean;
}

export const VerifiedNameTag: React.FC<VerifiedNameTagProps> = ({
  user,
  level,
  vipLevel,
  superVipLevel,
  variant = 'full',
  showUnverifiedHint = false,
}) => {
  const [infoOpen, setInfoOpen] = useState(false);

  const status = resolveVerificationStatus({
    user,
    level,
    vipLevel,
    superVipLevel,
  });

  if (status.tier === 'none' && !showUnverifiedHint) {
    return null;
  }

  return (
    <>
      {status.tier === 'gold' && (
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          title="Golden Tick — Verified Legend (Tap for details)"
          className={
            variant === 'compact'
              ? 'inline-flex items-center justify-center shrink-0 hover:scale-110 transition-transform'
              : 'inline-flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#3B2608] via-[#2B1B07] to-[#1E1305] border border-[#FBBF24]/55 shadow-[0_0_14px_rgba(251,191,36,0.22)] hover:border-[#FDE047] active:scale-95 transition-all shrink-0'
          }
        >
          <VerifiedTick tier="gold" size={variant === 'compact' ? 'sm' : 'sm'} />
          {variant === 'full' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-wide uppercase leading-none">
              <span className="text-[#FEF08A]">Verified</span>
              <span className="text-[#FBBF24]/55">·</span>
              <span className="text-[#FBBF24]">{status.tagLabel}</span>
            </span>
          )}
        </button>
      )}

      {status.tier === 'blue' && (
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          title="Blue Tick — Verified for Respect (Tap for details)"
          className={
            variant === 'compact'
              ? 'inline-flex items-center justify-center shrink-0 hover:scale-110 transition-transform'
              : 'inline-flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#0A2240] via-[#0C1D3A] to-[#0B1730] border border-[#38BDF8]/55 shadow-[0_0_14px_rgba(56,189,248,0.2)] hover:border-[#7DD3FC] active:scale-95 transition-all shrink-0'
          }
        >
          <VerifiedTick tier="blue" size={variant === 'compact' ? 'sm' : 'sm'} />
          {variant === 'full' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-wide uppercase leading-none">
              <span className="text-[#E0F2FE]">Verified</span>
              <span className="text-[#38BDF8]/55">·</span>
              <span className="text-[#38BDF8]">{status.tagLabel}</span>
            </span>
          )}
        </button>
      )}

      {status.tier === 'none' && showUnverifiedHint && (
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          title="View Verified Blue Tick (Respect) & Golden Tick (Legends) requirements"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-[10px] font-bold text-[#D7CEEB] active:scale-95 transition-all shrink-0"
        >
          <span className="inline-flex items-center -space-x-1">
            <VerifiedTick tier="blue" size="xs" />
            <VerifiedTick tier="gold" size="xs" />
          </span>
          <span>Verify</span>
        </button>
      )}

      {/* Verification Tiers Info Modal */}
      {infoOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setInfoOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#120822] border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-[#24103F] via-[#1B0C31] to-[#120822] border-b border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                  {status.tier === 'gold' ? (
                    <VerifiedTick tier="gold" size="md" />
                  ) : status.tier === 'blue' ? (
                    <VerifiedTick tier="blue" size="md" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-[#7DD3FC]" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Lenzo Verified Badges</h3>
                  <p className="text-[11px] text-[#C5B9DE]">
                    Respect Blue Tick &amp; Legends Golden Tick
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3.5">
              {/* Current Status Summary */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#B9AECF]">
                    Current Profile Status
                  </p>
                  <p className="text-sm font-black text-white mt-0.5 truncate">
                    {status.badgeTitle}
                  </p>
                  <p className="text-[11px] text-[#C5B9DE] mt-0.5">{status.reason}</p>
                </div>
                {status.tier === 'gold' ? (
                  <VerifiedTick tier="gold" size="lg" />
                ) : status.tier === 'blue' ? (
                  <VerifiedTick tier="blue" size="lg" />
                ) : (
                  <div className="flex items-center -space-x-1.5 shrink-0 opacity-75">
                    <VerifiedTick tier="blue" size="md" />
                    <VerifiedTick tier="gold" size="md" />
                  </div>
                )}
              </div>

              {/* Blue Tick — For Respect */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  status.tier === 'blue'
                    ? 'bg-gradient-to-br from-[#0A2548]/90 to-[#0C1732] border-[#38BDF8]/65 shadow-[0_0_24px_rgba(56,189,248,0.18)]'
                    : 'bg-[#170C2B] border-white/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <VerifiedTick tier="blue" size="lg" className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-[#E0F2FE]">
                        Blue Tick — For Respect
                      </span>
                      {status.tier === 'blue' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#38BDF8]/20 border border-[#38BDF8]/50 text-[10px] font-black text-[#7DD3FC]">
                          <CheckCircle2 className="w-3 h-3" />
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#C5B9DE] mt-1 leading-relaxed">
                      Honors respected creators, trusted hosts, and valued community members across Lenzo Party.
                    </p>
                    <p className="text-[11px] text-[#7DD3FC] font-semibold mt-2">
                      Unlock: Level 8+, VIP 1+, Verified Agency, 1,000+ Followers, or Admin Grant.
                    </p>
                  </div>
                </div>
              </div>

              {/* Golden Tick — For Legends */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  status.tier === 'gold'
                    ? 'bg-gradient-to-br from-[#3D2607]/90 to-[#1D1206] border-[#FBBF24]/70 shadow-[0_0_24px_rgba(251,191,36,0.2)]'
                    : 'bg-[#170C2B] border-white/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <VerifiedTick tier="gold" size="lg" className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-[#FEF08A] flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5 text-[#FBBF24]" />
                        Golden Tick — For Legends
                      </span>
                      {status.tier === 'gold' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FBBF24]/20 border border-[#FBBF24]/55 text-[10px] font-black text-[#FEF08A]">
                          <Sparkles className="w-3 h-3" />
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#E5D7B8] mt-1 leading-relaxed">
                      Reserved for Lenzo Party Legends — elite high-tier icons, top royalty, and official VIP legends.
                    </p>
                    <p className="text-[11px] text-[#FBBF24] font-semibold mt-2">
                      Unlock: Level 50+ (Ruby–Royal), VIP 6+, Super VIP 3+, or Official Legend Grant.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-extrabold text-white transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
