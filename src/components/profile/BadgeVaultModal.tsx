import React, { useState } from 'react';
import {
  X,
  Award,
  Gem,
  Flame,
  Zap,
  Crown,
  Heart,
  Shield,
  Sparkles,
  Lock,
  Check,
} from 'lucide-react';
import { ProfileBadgeDefinition } from '../../types';

interface BadgeVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  badges: ProfileBadgeDefinition[];
  isOwner: boolean;
  onToggleEquipBadge: (badgeId: string) => Promise<void> | void;
}

export function renderBadgeIcon(iconKey: ProfileBadgeDefinition['iconKey'], className = 'w-5 h-5') {
  switch (iconKey) {
    case 'award':
      return <Award className={className} />;
    case 'gem':
      return <Gem className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'crown':
      return <Crown className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'sparkles':
    default:
      return <Sparkles className={className} />;
  }
}

export const BadgeVaultModal: React.FC<BadgeVaultModalProps> = ({
  isOpen,
  onClose,
  badges,
  isOwner,
  onToggleEquipBadge,
}) => {
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!isOpen) return null;

  const earnedBadges = badges.filter((b) => b.isEarned);
  const equippedBadges = badges.filter((b) => b.isEquipped);
  const lockedBadges = badges.filter((b) => !b.isEarned);

  const visibleBadges =
    filter === 'earned' ? earnedBadges : filter === 'locked' ? lockedBadges : badges;

  const handleToggle = async (badge: ProfileBadgeDefinition) => {
    if (!isOwner || !badge.isEarned || busyId) return;
    setBusyId(badge.id);
    try {
      await onToggleEquipBadge(badge.id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#140B24] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-[#FFC84A]" />
              <span>Badge Vault</span>
            </h3>
            <p className="text-xs text-[#B9AECF] mt-0.5 tabular-nums">
              {earnedBadges.length} of {badges.length} earned · {equippedBadges.length}/3 equipped on profile
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Badge Vault"
            className="min-h-[44px] min-w-[44px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="px-5 pt-3 pb-2 flex items-center gap-2">
          {([
            { id: 'all', label: `All (${badges.length})` },
            { id: 'earned', label: `Earned (${earnedBadges.length})` },
            { id: 'locked', label: `Locked (${lockedBadges.length})` },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white shadow-md shadow-[#8B20FF]/25'
                  : 'bg-white/[0.05] text-[#B9AECF] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Badge Grid */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {visibleBadges.length === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-white/[0.03] border border-white/[0.06] px-4">
              <Lock className="w-8 h-8 text-[#B9AECF]/60 mx-auto mb-2" />
              <p className="text-sm font-bold text-white">No badges in this category yet</p>
              <p className="text-xs text-[#B9AECF] mt-1">
                Host live sessions, publish moments, or join an Agency to unlock milestone badges.
              </p>
            </div>
          ) : (
            visibleBadges.map((badge) => {
              const pct = Math.min(
                100,
                Math.round((badge.progressCurrent / Math.max(1, badge.progressTarget)) * 100)
              );
              return (
                <div
                  key={badge.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    badge.isEquipped
                      ? 'bg-[#21123B] border-[#FA26A0]/50 shadow-lg shadow-[#8B20FF]/10'
                      : badge.isEarned
                      ? 'bg-white/[0.04] border-white/10'
                      : 'bg-white/[0.02] border-white/[0.06] opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-inner relative"
                      style={{
                        background: badge.isEarned
                          ? `linear-gradient(135deg, ${badge.accentFrom}, ${badge.accentTo})`
                          : 'rgba(255,255,255,0.06)',
                      }}
                    >
                      {renderBadgeIcon(badge.iconKey, 'w-5 h-5')}
                      {!badge.isEarned && (
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#090611] border border-white/15 flex items-center justify-center text-[#B9AECF]">
                          <Lock className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">{badge.name}</h4>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.08] text-[#D7CEEB]">
                            {badge.tier}
                          </span>
                        </div>

                        {isOwner && badge.isEarned && (
                          <button
                            onClick={() => handleToggle(badge)}
                            disabled={busyId === badge.id}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                              badge.isEquipped
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                          >
                            {badge.isEquipped ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Equipped</span>
                              </>
                            ) : (
                              <span>Equip</span>
                            )}
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-[#B9AECF] mt-1 leading-relaxed">{badge.description}</p>

                      {!badge.isEarned && (
                        <div className="mt-2.5 space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-[#B9AECF]">
                            <span>{badge.requirementText}</span>
                            <span className="font-mono tabular-nums text-white/80">
                              {badge.progressCurrent.toLocaleString()}/{badge.progressTarget.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#8B20FF] to-[#FA26A0]"
                              style={{ width: `${Math.max(4, pct)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
