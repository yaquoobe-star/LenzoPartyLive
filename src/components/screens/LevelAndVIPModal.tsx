import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Crown,
  Sparkles,
  Award,
  Lock,
  Check,
  Eye,
  Shield,
  TrendingUp,
  Layers,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Coins,
  Filter,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { isAuthorizedAdminEmail } from '../../utils/adminAuth';
import {
  ActiveFrameType,
  EvaluatedAchievementBadge,
  LevelDefinition,
  LevelTierId,
  UserLevelProgression,
} from '../../types/levelAndVip';
import {
  ALL_100_LEVELS,
  ACHIEVEMENT_BADGE_DEFINITIONS,
  LEVEL_TIER_CONFIGS,
  LEVELS_1_TO_50_EXACT_TOTAL,
  LEVELS_51_TO_100_EXACT_TOTAL,
  SUPER_VIP_TIER_DEFINITIONS,
  TOTAL_PROGRESSION_COINS_EXACT,
  VIP_FRAME_DEFINITIONS,
  calculateLevelProgression,
  evaluateAchievementBadges,
  formatCoinsCompact,
  getLevelDefinition,
} from '../../utils/levelAndVipConfig';
import {
  equipAchievementBadges,
  equipActiveFrame,
  fetchAuthoritativeProgression,
  subscribeUserLevelProgression,
} from '../../services/levelAndVipService';
import { AvatarWithFrame, SuperVipTierBadge, VipTierBadge } from '../common/AvatarWithFrame';
import { LevelBadge } from '../common/LevelBadge';
import { LevelEmblemBadge } from '../common/LevelEmblemBadge';
import { AchievementBadgeEmblem } from '../common/AchievementBadgeArt';

export type ProgressionModalTab = 'roadmap' | 'vip' | 'super_vip' | 'achievements';

interface LevelAndVIPModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  initialTab?: ProgressionModalTab;
  onUpdateUser?: (updated: Partial<UserProfile>) => void;
  onOpenAdminPanel?: () => void;
}

export const LevelAndVIPModal: React.FC<LevelAndVIPModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialTab = 'roadmap',
  onUpdateUser,
  onOpenAdminPanel,
}) => {
  const [activeTab, setActiveTab] = useState<ProgressionModalTab>(initialTab);
  const [roadmapStatusFilter, setRoadmapStatusFilter] = useState<'all' | 'completed' | 'current' | 'locked'>('all');
  const [selectedTierFilter, setSelectedTierFilter] = useState<LevelTierId | 'all'>('all');
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'earned' | 'locked'>('all');
  const [inspectedLevel, setInspectedLevel] = useState<LevelDefinition | null>(null);

  const initialBaselineCoins =
    typeof currentUser.totalQualifyingCoinsSpent === 'number'
      ? currentUser.totalQualifyingCoinsSpent
      : getLevelDefinition(Math.max(0, currentUser.level ?? 0)).cumulativeCoins;

  const [progression, setProgression] = useState<UserLevelProgression>(() =>
    calculateLevelProgression(initialBaselineCoins, currentUser.id, currentUser.equippedVipFrame || 0, {
      activeFrameType: currentUser.activeFrameType,
      equippedSuperVipFrame: currentUser.equippedSuperVipFrame || 0,
      earnedAchievements: currentUser.earnedAchievements || [],
      equippedAchievementBadges: currentUser.equippedBadges || [],
    })
  );

  const [serverAchievements, setServerAchievements] = useState<EvaluatedAchievementBadge[] | null>(null);
  const [previewFrame, setPreviewFrame] = useState<{ type: ActiveFrameType; tier: number } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setPreviewFrame(null);
    }
  }, [isOpen, initialTab]);

  const initialBaselineCoinsRef = React.useRef(initialBaselineCoins);
  initialBaselineCoinsRef.current = initialBaselineCoins;

  useEffect(() => {
    if (!isOpen || !currentUser.id) return;

    const unsub = subscribeUserLevelProgression(currentUser.id, initialBaselineCoinsRef.current, (prog) => {
      setProgression(prog);
    });

    fetchAuthoritativeProgression(currentUser.id)
      .then((res) => {
        if (res?.progression) {
          setProgression(res.progression);
        }
        if (Array.isArray(res?.achievements)) {
          setServerAchievements(res.achievements);
        }
      })
      .catch(() => {});

    return () => unsub();
  }, [isOpen, currentUser.id]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Evaluated independent achievement badges (server-verified or live computed fallback)
  const achievementBadges = useMemo<EvaluatedAchievementBadge[]>(() => {
    if (serverAchievements && serverAchievements.length > 0) {
      const equippedSet = new Set(progression.equippedAchievementBadges || currentUser.equippedBadges || []);
      return serverAchievements.map((b) => ({
        ...b,
        isEquipped: b.isEarned && equippedSet.has(b.id),
      }));
    }

    const profileCompletedSteps =
      (currentUser.name && currentUser.name.trim().length >= 2 ? 1 : 0) +
      (currentUser.bio && currentUser.bio.trim().length >= 5 ? 1 : 0) +
      (currentUser.country && currentUser.country.trim().length > 0 ? 1 : 0);

    return evaluateAchievementBadges(
      {
        totalQualifyingCoinsSpent: progression.totalQualifyingCoinsSpent,
        diamondsEarned: currentUser.diamonds || 0,
        publicVideosCount: 0,
        liveSessionsHosted: currentUser.liveSessionsHosted || 0,
        loginStreakDays: currentUser.loginStreakDays || 1,
        giftsSentCount: currentUser.giftsSentCount || 0,
        followersCount: currentUser.followersCount || 0,
        followingCount: currentUser.followingCount || 0,
        totalLikesCount: currentUser.totalLikes || 0,
        hasAgency: Boolean(currentUser.agencyId && currentUser.agencyStatus === 'active'),
        pkWinsCount: currentUser.pkWinsCount || 0,
        eventsWonCount: currentUser.eventsWonCount || 0,
        profileCompletedSteps,
      },
      progression.earnedAchievements || currentUser.earnedAchievements || [],
      progression.equippedAchievementBadges || currentUser.equippedBadges || [],
      ACHIEVEMENT_BADGE_DEFINITIONS
    );
  }, [serverAchievements, progression, currentUser]);

  // Filtered 101 levels list (Level 0 through Level 100)
  const filteredLevels = useMemo(() => {
    return ALL_100_LEVELS.filter((lvl) => {
      const isCompleted =
        lvl.level < progression.currentLevel ||
        (progression.isMaxMastery && lvl.level === 100);
      const isCurrent = lvl.level === progression.currentLevel && !isCompleted;
      const isLocked = lvl.level > progression.currentLevel;

      if (roadmapStatusFilter === 'completed' && !isCompleted) return false;
      if (roadmapStatusFilter === 'current' && !isCurrent) return false;
      if (roadmapStatusFilter === 'locked' && !isLocked) return false;
      if (selectedTierFilter !== 'all' && lvl.tierId !== selectedTierFilter) return false;
      return true;
    });
  }, [progression.currentLevel, progression.isMaxMastery, roadmapStatusFilter, selectedTierFilter]);

  if (!isOpen) return null;

  const handleEquipFrame = async (frameType: ActiveFrameType, tier: number) => {
    const key = `${frameType}_${tier}`;
    if (busyKey) return;
    setBusyKey(key);

    const res = await equipActiveFrame(currentUser.id, frameType, tier);
    setBusyKey(null);

    if (res.success) {
      const nextVip = frameType === 'vip' ? tier : 0;
      const nextSuperVip = frameType === 'super_vip' ? tier : 0;

      setProgression((prev) => ({
        ...prev,
        activeFrameType: frameType,
        equippedVipFrame: nextVip,
        equippedSuperVipFrame: nextSuperVip,
      }));
      setPreviewFrame(null);

      if (onUpdateUser) {
        onUpdateUser({
          activeFrameType: frameType,
          equippedVipFrame: nextVip,
          equippedSuperVipFrame: nextSuperVip,
          vipLevel: Math.max(progression.highestUnlockedVipTier, nextVip),
          isVIP: progression.highestUnlockedVipTier > 0 || nextVip > 0,
          superVipLevel: Math.max(progression.highestUnlockedSuperVipTier, nextSuperVip),
          isSuperVIP: progression.highestUnlockedSuperVipTier > 0 || nextSuperVip > 0,
        });
      }
      showToast(res.message || 'Active frame updated!', 'success');
    } else {
      showToast(res.error || 'Could not equip frame.', 'error');
    }
  };

  const handleToggleAchievementEquip = async (badge: EvaluatedAchievementBadge) => {
    if (!badge.isEarned || busyKey) return;
    const currentEquipped = new Set(progression.equippedAchievementBadges || currentUser.equippedBadges || []);
    if (currentEquipped.has(badge.id)) {
      currentEquipped.delete(badge.id);
    } else {
      if (currentEquipped.size >= 3) {
        showToast('Maximum 3 achievement badges can be equipped. Unequip one first.', 'error');
        return;
      }
      currentEquipped.add(badge.id);
    }

    const nextIds = Array.from(currentEquipped);
    setBusyKey(`ach_${badge.id}`);
    const res = await equipAchievementBadges(currentUser.id, nextIds);
    setBusyKey(null);

    if (res.success) {
      const finalIds = res.equippedAchievementBadges || nextIds;
      setProgression((prev) => ({ ...prev, equippedAchievementBadges: finalIds }));
      if (onUpdateUser) {
        onUpdateUser({ equippedBadges: finalIds });
      }
      showToast(
        finalIds.includes(badge.id) ? `${badge.name} equipped to Profile` : `${badge.name} removed from Profile`,
        'success'
      );
    } else {
      showToast(res.error || 'Could not update equipped badges.', 'error');
    }
  };

  // Resolve what avatar frame to preview in VIP / Super VIP tabs
  const displayFrameType: ActiveFrameType = previewFrame ? previewFrame.type : progression.activeFrameType;
  const displayVipTier =
    previewFrame?.type === 'vip'
      ? previewFrame.tier
      : displayFrameType === 'vip'
      ? progression.equippedVipFrame
      : 0;
  const displaySuperVipTier =
    previewFrame?.type === 'super_vip'
      ? previewFrame.tier
      : displayFrameType === 'super_vip'
      ? progression.equippedSuperVipFrame
      : 0;

  const earnedAchievementsCount = achievementBadges.filter((b) => b.isEarned).length;
  const equippedAchievementsCount = achievementBadges.filter((b) => b.isEquipped).length;
  const visibleAchievements =
    badgeFilter === 'earned'
      ? achievementBadges.filter((b) => b.isEarned)
      : badgeFilter === 'locked'
      ? achievementBadges.filter((b) => !b.isEarned)
      : achievementBadges;

  const nextVipUnlock = VIP_FRAME_DEFINITIONS.find((v) => v.unlockLevel > progression.currentLevel);
  const nextSuperVipUnlock = SUPER_VIP_TIER_DEFINITIONS.find((sv) => sv.unlockLevel > progression.currentLevel);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#110820] border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast Banner */}
        {toast && (
          <div
            className={`fixed safe-top-offset-16 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 border ${
              toast.type === 'error'
                ? 'bg-rose-950/95 border-rose-400/50 text-rose-100'
                : 'bg-[#1F0F3E]/95 border-[#FFC84A]/60 text-white'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#FFC84A] shrink-0" />
            )}
            <span>{toast.msg}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="px-4 sm:px-6 pt-4 pb-3 bg-gradient-to-r from-[#1D0C38] via-[#27104A] to-[#17092C] border-b border-white/10">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3 sm:hidden" />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FFC84A] via-[#FA26A0] to-[#8B20FF] flex items-center justify-center text-white shadow-lg shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                  Lenzo Progression &amp; Royalty
                </h2>
                <p className="text-[11px] text-[#C5B9DE] truncate">
                  Levels 0–100 (101) · 12 VIP Tiers · 6 Super VIP · 10 Badges
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isAuthorizedAdminEmail(currentUser.email) && onOpenAdminPanel && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAdminPanel();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-[#FFC84A] text-[11px] font-black flex items-center gap-1"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </button>
              )}
              <button
                onClick={onClose}
                aria-label="Close Progression Center"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 4 Main Section Navigation Tabs */}
          <div className="grid grid-cols-4 gap-1.5 mt-3.5 bg-[#090414]/80 p-1 rounded-2xl border border-white/[0.08]">
            {([
              { id: 'roadmap', label: 'Lv 0–100', icon: TrendingUp },
              { id: 'vip', label: 'VIP (12)', icon: Crown },
              { id: 'super_vip', label: 'Super VIP (6)', icon: Sparkles },
              { id: 'achievements', label: 'Badges (10)', icon: Award },
            ] as const).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPreviewFrame(null);
                  }}
                  className={`py-2 px-1.5 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
                    active
                      ? tab.id === 'super_vip'
                        ? 'bg-gradient-to-r from-[#7C3AED] via-[#FA26A0] to-[#FFC84A] text-white shadow-md'
                        : tab.id === 'vip'
                        ? 'bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] shadow-md'
                        : 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white shadow-md'
                      : 'text-[#B9AECF] hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* ================================================================
              TAB 1: 100-LEVEL ROADMAP
             ================================================================ */}
          {activeTab === 'roadmap' && (
            <>
              {/* Dedicated Next-Level Progress Panel */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#231042] via-[#170B2D] to-[#110820] border border-white/15 space-y-3.5 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <LevelEmblemBadge level={progression.currentLevel} size="lg" className="shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <LevelBadge level={progression.currentLevel} size="md" showTierName={true} />
                        {progression.highestUnlockedVipTier > 0 && (
                          <VipTierBadge tier={progression.highestUnlockedVipTier} size="xs" />
                        )}
                        {progression.highestUnlockedSuperVipTier > 0 && (
                          <SuperVipTierBadge tier={progression.highestUnlockedSuperVipTier} size="xs" />
                        )}
                      </div>
                      <p className="text-[11px] text-[#C5B9DE] mt-1 font-mono tabular-nums">
                        Total Spent:{' '}
                        <span className="text-white font-bold">
                          {progression.totalQualifyingCoinsSpent.toLocaleString()}
                        </span>{' '}
                        / {TOTAL_PROGRESSION_COINS_EXACT.toLocaleString()} Coins
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-2xl font-black font-mono text-[#FFC84A] tabular-nums">
                      {progression.percentage}%
                    </span>
                    <span className="block text-[10px] uppercase tracking-wider text-[#B9AECF] font-bold">
                      {progression.isMaxMastery ? 'LEGEND MASTERY' : `LV.${progression.currentLevel} PROGRESS`}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="h-3 rounded-full bg-black/55 border border-white/10 overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#8B20FF] via-[#FA26A0] to-[#FFC84A] transition-all duration-500"
                      style={{ width: `${Math.max(3, progression.percentage)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] tabular-nums gap-2 flex-wrap">
                    <span className="text-[#C5B9DE]">
                      {progression.isMaxMastery ? (
                        <span className="text-[#FFC84A] font-bold">
                          All 100 Levels &amp; {TOTAL_PROGRESSION_COINS_EXACT.toLocaleString()} Coin Legend Mastery Complete!
                        </span>
                      ) : (
                        <>
                          Need{' '}
                          <span className="text-white font-mono font-bold">
                            {progression.remainingCoinsNeeded.toLocaleString()}
                          </span>{' '}
                          more coins for{' '}
                          <span className="text-[#FFC84A] font-bold">
                            {progression.currentLevel < 100
                              ? `Level ${progression.currentLevel + 1}`
                              : 'Level 100 Mastery'}
                          </span>
                        </>
                      )}
                    </span>
                    <span className="font-mono text-[#FFC84A] font-bold">
                      {progression.coinsInCurrentLevel.toLocaleString()} /{' '}
                      {progression.coinsNeededForNextLevel.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Upcoming Milestones Strip */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.08]">
                  <div className="px-3 py-2 rounded-xl bg-black/35 border border-white/[0.06] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#B9AECF] block">Next VIP Unlock</span>
                      <span className="text-xs font-extrabold text-[#FFC84A]">
                        {nextVipUnlock ? `${nextVipUnlock.code} at Lv.${nextVipUnlock.unlockLevel}` : 'All 12 VIP Unlocked'}
                      </span>
                    </div>
                    <Crown className="w-4 h-4 text-[#FFC84A]/80 shrink-0" />
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-black/35 border border-white/[0.06] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#B9AECF] block">Next Super VIP</span>
                      <span className="text-xs font-extrabold text-[#E879F9]">
                        {nextSuperVipUnlock
                          ? `${nextSuperVipUnlock.code} at Lv.${nextSuperVipUnlock.unlockLevel}`
                          : 'All 6 Super VIP Unlocked'}
                      </span>
                    </div>
                    <Sparkles className="w-4 h-4 text-[#E879F9]/80 shrink-0" />
                  </div>
                </div>
              </div>

              {/* Status Filters + 10-Tier Quick Filter */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {([
                      { id: 'all', label: 'All Levels (0–100)' },
                      { id: 'completed', label: 'Completed' },
                      { id: 'current', label: 'Current' },
                      { id: 'locked', label: 'Locked' },
                    ] as const).map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setRoadmapStatusFilter(f.id)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                          roadmapStatusFilter === f.id
                            ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white shadow'
                            : 'bg-white/[0.05] text-[#B9AECF] hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-[#B9AECF] flex items-center gap-1">
                    <Coins className="w-3 h-3 text-[#FFC84A]" />
                    Lv 1–50: {formatCoinsCompact(LEVELS_1_TO_50_EXACT_TOTAL)} · Lv 51–100: {formatCoinsCompact(LEVELS_51_TO_100_EXACT_TOTAL)}
                  </span>
                </div>

                {/* 10 Tiers Horizontal Selector */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => setSelectedTierFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider shrink-0 border transition-all flex items-center gap-1 ${
                      selectedTierFilter === 'all'
                        ? 'bg-white text-[#090611] border-white'
                        : 'bg-white/[0.04] text-[#B9AECF] border-white/10 hover:text-white'
                    }`}
                  >
                    <Filter className="w-3 h-3" />
                    <span>All 10 Tiers</span>
                  </button>
                  {LEVEL_TIER_CONFIGS.map((tier) => {
                    const active = selectedTierFilter === tier.id;
                    return (
                      <button
                        key={tier.id}
                        onClick={() => setSelectedTierFilter(tier.id)}
                        style={
                          active
                            ? { background: tier.gradientCss, borderColor: tier.borderHex }
                            : undefined
                        }
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider shrink-0 border transition-all ${
                          active
                            ? 'text-white shadow-md'
                            : 'bg-white/[0.04] text-[#C5B9DE] border-white/10 hover:bg-white/[0.08]'
                        }`}
                      >
                        {tier.name} ({tier.minLevel}–{tier.maxLevel})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 101 Levels List (Level 0 through Level 100) */}
              <div className="space-y-2">
                {filteredLevels.length === 0 ? (
                  <div className="py-10 text-center rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                    <Layers className="w-8 h-8 text-[#B9AECF]/50 mx-auto mb-2" />
                    <p className="text-xs font-bold text-white">No levels match this filter</p>
                    <p className="text-[11px] text-[#B9AECF] mt-1">
                      Switch back to All Levels (0–100) to explore all 101 level badges.
                    </p>
                  </div>
                ) : (
                  filteredLevels.map((lvl) => {
                    const isCompleted =
                      lvl.level < progression.currentLevel ||
                      (progression.isMaxMastery && lvl.level === 100);
                    const isCurrent = lvl.level === progression.currentLevel && !isCompleted;
                    const isLocked = lvl.level > progression.currentLevel;
                    const coinsToReach = Math.max(0, lvl.cumulativeCoins - progression.totalQualifyingCoinsSpent);
                    const vipReward = lvl.vipUnlockTier
                      ? VIP_FRAME_DEFINITIONS.find((v) => v.tier === lvl.vipUnlockTier)
                      : undefined;
                    const superVipReward = lvl.superVipUnlockTier
                      ? SUPER_VIP_TIER_DEFINITIONS.find((sv) => sv.tier === lvl.superVipUnlockTier)
                      : undefined;

                    return (
                      <button
                        key={lvl.level}
                        type="button"
                        onClick={() => setInspectedLevel(lvl)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-gradient-to-r from-[#2A114E] via-[#210E3E] to-[#170A2C] border-[#FA26A0] shadow-lg shadow-[#8B20FF]/20'
                            : isCompleted
                            ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400/50'
                            : 'bg-white/[0.025] border-white/[0.07] hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <LevelEmblemBadge
                            level={lvl.level}
                            size="md"
                            locked={isLocked}
                            className="shrink-0"
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-white">
                                Level {lvl.level} · {lvl.title}
                              </span>
                              <span
                                className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                                  isCurrent
                                    ? 'bg-[#FA26A0] text-white'
                                    : isCompleted
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-white/10 text-[#B9AECF]'
                                }`}
                              >
                                {isCurrent ? 'Current' : isCompleted ? 'Completed' : 'Locked'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-[#C5B9DE] flex-wrap tabular-nums">
                              <span>
                                Required: <strong className="text-white">+{lvl.coinsForThisLevel.toLocaleString()}</strong>
                              </span>
                              <span className="text-white/25">·</span>
                              <span>
                                Target: <strong className="text-[#FFC84A]">{lvl.cumulativeCoins.toLocaleString()}</strong>
                              </span>
                            </div>

                            {/* Milestone unlock tags */}
                            {(vipReward || superVipReward) && (
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                {vipReward && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-md bg-[#FFC84A]/15 border border-[#FFC84A]/40 text-[#FFC84A]">
                                    <Crown className="w-2.5 h-2.5" />
                                    <span>{vipReward.code}: {vipReward.frameName}</span>
                                  </span>
                                )}
                                {superVipReward && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-md bg-fuchsia-500/20 border border-fuchsia-400/50 text-fuchsia-200">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    <span>{superVipReward.code}: {superVipReward.name}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {isCompleted ? (
                            <span className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 flex items-center justify-center">
                              <Check className="w-4 h-4" />
                            </span>
                          ) : isCurrent ? (
                            <span className="text-xs font-mono font-black text-[#FFC84A] tabular-nums">
                              {progression.percentage}%
                            </span>
                          ) : (
                            <div className="flex flex-col items-end">
                              <Lock className="w-3.5 h-3.5 text-[#B9AECF]/70 mb-0.5" />
                              <span className="text-[9px] font-mono text-[#B9AECF] tabular-nums">
                                +{formatCoinsCompact(coinsToReach)}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* ================================================================
              TAB 2: VIP MEMBERSHIP (12 TIERS — EVERY 8 LEVELS: Lv 8..96)
             ================================================================ */}
          {activeTab === 'vip' && (
            <>
              {/* Live VIP Frame Preview Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#2B1707] via-[#1B0D2E] to-[#110820] border border-[#FFC84A]/35 flex flex-col sm:flex-row items-center gap-4">
                <AvatarWithFrame
                  src={currentUser.avatar}
                  name={currentUser.name}
                  level={progression.currentLevel}
                  vipLevel={displayVipTier}
                  superVipLevel={displaySuperVipTier}
                  activeFrameType={displayFrameType}
                  size="xl"
                  showFrame={true}
                  showVipBadge={true}
                />

                <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <VipTierBadge tier={progression.highestUnlockedVipTier} size="sm" />
                    <span className="text-[11px] font-bold text-[#C5B9DE]">
                      {progression.unlockedVipTiers.length} / 12 VIP Tiers Unlocked
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white">
                    {previewFrame?.type === 'vip'
                      ? `Previewing VIP ${previewFrame.tier} Frame`
                      : progression.activeFrameType === 'vip' && progression.equippedVipFrame > 0
                      ? `Equipped: VIP ${progression.equippedVipFrame} Frame`
                      : progression.activeFrameType === 'super_vip' && progression.equippedSuperVipFrame > 0
                      ? `Super VIP ${progression.equippedSuperVipFrame} Frame Currently Active`
                      : 'VIP 1–12 Exclusive Frame Collection'}
                  </h3>
                  <p className="text-[11px] text-[#C5B9DE]">
                    VIP unlocks every 8 user levels (Lv 8 → Lv 96). Equipping a VIP frame cleanly replaces any active Super VIP frame with zero overlap.
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap">
                    {previewFrame && (
                      <button
                        onClick={() => setPreviewFrame(null)}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold"
                      >
                        Exit Preview
                      </button>
                    )}
                    {progression.activeFrameType !== 'none' && (
                      <button
                        onClick={() => handleEquipFrame('none', 0)}
                        disabled={busyKey !== null}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 text-[11px] font-bold"
                      >
                        Remove Active Frame
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 12 VIP Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VIP_FRAME_DEFINITIONS.map((vip) => {
                  const isUnlocked = progression.unlockedVipTiers.includes(vip.tier);
                  const isEquipped =
                    progression.activeFrameType === 'vip' && progression.equippedVipFrame === vip.tier;
                  const isPreviewing = previewFrame?.type === 'vip' && previewFrame.tier === vip.tier;

                  return (
                    <div
                      key={vip.tier}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                        isEquipped
                          ? 'bg-[#26143E] border-[#FFC84A] shadow-lg shadow-[#FFC84A]/15'
                          : isPreviewing
                          ? 'bg-[#201038] border-[#FA26A0]'
                          : isUnlocked
                          ? 'bg-white/[0.04] border-white/15'
                          : 'bg-white/[0.02] border-white/[0.07] opacity-85'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <AvatarWithFrame
                          src={currentUser.avatar}
                          name={currentUser.name}
                          vipLevel={vip.tier}
                          activeFrameType="vip"
                          size="md"
                          showFrame={true}
                          showVipBadge={false}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <VipTierBadge tier={vip.tier} size="xs" />
                            <span
                              className={`text-[10px] font-bold flex items-center gap-1 ${
                                isUnlocked ? 'text-emerald-400' : 'text-[#B9AECF]'
                              }`}
                            >
                              {isUnlocked ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Unlocked</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3" />
                                  <span>Lv.{vip.unlockLevel}</span>
                                </>
                              )}
                            </span>
                          </div>
                          <h4 className="text-xs font-extrabold text-white mt-1 truncate">
                            {vip.frameName}
                          </h4>
                          <p className="text-[10px] text-[#B9AECF] truncate mt-0.5">{vip.perks[0]}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewFrame({ type: 'vip', tier: vip.tier })}
                          className="flex-1 py-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] text-white text-[11px] font-bold flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>

                        {isEquipped ? (
                          <button
                            onClick={() => handleEquipFrame('none', 0)}
                            disabled={busyKey !== null}
                            className="flex-1 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-[11px] font-extrabold flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Equipped</span>
                          </button>
                        ) : isUnlocked ? (
                          <button
                            onClick={() => handleEquipFrame('vip', vip.tier)}
                            disabled={busyKey !== null}
                            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] text-[11px] font-black hover:opacity-95 active:scale-95 transition-all"
                          >
                            {busyKey === `vip_${vip.tier}` ? 'Equipping...' : 'Equip'}
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex-1 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[#B9AECF] text-[11px] font-bold flex items-center justify-center gap-1 cursor-not-allowed"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Reach Lv.{vip.unlockLevel}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ================================================================
              TAB 3: SUPER VIP SYSTEM (6 SEPARATE ULTRA-PREMIUM TIERS — Lv 12..72)
             ================================================================ */}
          {activeTab === 'super_vip' && (
            <>
              {/* Live Super VIP Showcase Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#2B0C4E] via-[#1B0936] to-[#110622] border border-fuchsia-400/40 flex flex-col sm:flex-row items-center gap-4 shadow-xl">
                <AvatarWithFrame
                  src={currentUser.avatar}
                  name={currentUser.name}
                  level={progression.currentLevel}
                  vipLevel={displayVipTier}
                  superVipLevel={displaySuperVipTier}
                  activeFrameType={displayFrameType}
                  size="xl"
                  showFrame={true}
                  showVipBadge={true}
                />

                <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-[#7C3AED] via-[#FA26A0] to-[#FFC84A] text-white text-[10px] font-black uppercase tracking-wider">
                      SUPER VIP COLLECTION
                    </span>
                    <span className="text-[11px] font-bold text-fuchsia-200">
                      {progression.unlockedSuperVipTiers.length} / 6 Unlocked
                    </span>
                  </div>

                  <h3 className="text-base font-black text-white">
                    {previewFrame?.type === 'super_vip'
                      ? `Previewing Super VIP ${previewFrame.tier}`
                      : progression.activeFrameType === 'super_vip' && progression.equippedSuperVipFrame > 0
                      ? `Active: Super VIP ${progression.equippedSuperVipFrame} Frame`
                      : 'Ultra-Premium Animated Super VIP Frames'}
                  </h3>

                  <p className="text-[11px] text-[#D7CEEB]">
                    Separate from normal VIP. Unlocks every 12 levels (Lv 12, 24, 36, 48, 60, 72) — Super VIP 6 remains the pinnacle through Level 100.
                  </p>

                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap">
                    {previewFrame && (
                      <button
                        onClick={() => setPreviewFrame(null)}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold"
                      >
                        Exit Preview
                      </button>
                    )}
                    {progression.activeFrameType !== 'none' && (
                      <button
                        onClick={() => handleEquipFrame('none', 0)}
                        disabled={busyKey !== null}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 text-[11px] font-bold"
                      >
                        Unequip Frame
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 6 Super VIP Tier Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {SUPER_VIP_TIER_DEFINITIONS.map((sv) => {
                  const isUnlocked = progression.unlockedSuperVipTiers.includes(sv.tier);
                  const isEquipped =
                    progression.activeFrameType === 'super_vip' && progression.equippedSuperVipFrame === sv.tier;
                  const isPreviewing = previewFrame?.type === 'super_vip' && previewFrame.tier === sv.tier;

                  return (
                    <div
                      key={sv.tier}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                        isEquipped
                          ? 'bg-gradient-to-br from-[#2B124C] to-[#17092B] border-[#FFC84A] shadow-xl shadow-fuchsia-500/20'
                          : isPreviewing
                          ? 'bg-[#210D3F] border-fuchsia-400'
                          : isUnlocked
                          ? 'bg-white/[0.04] border-white/15'
                          : 'bg-white/[0.02] border-white/[0.08] opacity-85'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <AvatarWithFrame
                          src={currentUser.avatar}
                          name={currentUser.name}
                          superVipLevel={sv.tier}
                          activeFrameType="super_vip"
                          size="lg"
                          showFrame={true}
                          showVipBadge={false}
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <SuperVipTierBadge tier={sv.tier} size="xs" />
                            <span
                              className={`text-[10px] font-bold flex items-center gap-1 ${
                                isUnlocked ? 'text-emerald-400' : 'text-[#B9AECF]'
                              }`}
                            >
                              {isUnlocked ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Unlocked</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3" />
                                  <span>Lv.{sv.unlockLevel}</span>
                                </>
                              )}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-white truncate">{sv.name}</h4>
                          <p className="text-[10px] text-[#C5B9DE] leading-snug">{sv.perks[0]}</p>
                          {sv.tier === 6 && (
                            <span className="inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFC84A]/20 text-[#FFC84A]">
                              Supreme Tier · Lv 72–100
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewFrame({ type: 'super_vip', tier: sv.tier })}
                          className="flex-1 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-[11px] font-bold flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>

                        {isEquipped ? (
                          <button
                            onClick={() => handleEquipFrame('none', 0)}
                            disabled={busyKey !== null}
                            className="flex-1 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-[11px] font-extrabold flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Equipped</span>
                          </button>
                        ) : isUnlocked ? (
                          <button
                            onClick={() => handleEquipFrame('super_vip', sv.tier)}
                            disabled={busyKey !== null}
                            style={{ background: sv.gradientCss }}
                            className="flex-1 py-2 rounded-xl text-white text-[11px] font-black shadow-md hover:opacity-95 active:scale-95 transition-all"
                          >
                            {busyKey === `super_vip_${sv.tier}` ? 'Equipping...' : 'Equip Frame'}
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex-1 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[#B9AECF] text-[11px] font-bold flex items-center justify-center gap-1 cursor-not-allowed"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Unlock at Lv.{sv.unlockLevel}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ================================================================
              TAB 4: INDEPENDENT ACHIEVEMENT BADGE VAULT (10 BADGES · MAX 3 EQUIPPED)
             ================================================================ */}
          {activeTab === 'achievements' && (
            <>
              <div className="p-4 rounded-2xl bg-[#180C2F] border border-white/10 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#FFC84A]" />
                    <span>Achievement Badge Vault</span>
                  </h3>
                  <p className="text-[11px] text-[#C5B9DE] mt-0.5 tabular-nums">
                    Independent from Level &amp; VIP · {earnedAchievementsCount}/{achievementBadges.length} earned ·{' '}
                    <span className="text-[#FFC84A] font-bold">{equippedAchievementsCount}/3 equipped on profile</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {([
                    { id: 'all', label: `All (${achievementBadges.length})` },
                    { id: 'earned', label: `Earned (${earnedAchievementsCount})` },
                    { id: 'locked', label: `Locked (${achievementBadges.length - earnedAchievementsCount})` },
                  ] as const).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setBadgeFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                        badgeFilter === tab.id
                          ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white'
                          : 'bg-white/[0.06] text-[#B9AECF] hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                {visibleAchievements.map((badge) => (
                  <div
                    key={badge.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      badge.isEquipped
                        ? 'bg-[#241143] border-[#FA26A0]/60 shadow-lg shadow-[#8B20FF]/15'
                        : badge.isEarned
                        ? 'bg-white/[0.04] border-white/15'
                        : 'bg-white/[0.02] border-white/[0.07] opacity-85'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <AchievementBadgeEmblem
                        shape={badge.shape}
                        iconKey={badge.iconKey}
                        accentFrom={badge.accentFrom}
                        accentTo={badge.accentTo}
                        borderHex={badge.borderHex}
                        isEarned={badge.isEarned}
                        size="md"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <h4 className="text-sm font-extrabold text-white">{badge.name}</h4>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-[#D7CEEB]">
                              {badge.rarity}
                            </span>
                          </div>

                          {badge.isEarned ? (
                            <button
                              onClick={() => handleToggleAchievementEquip(badge)}
                              disabled={busyKey === `ach_${badge.id}`}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold shrink-0 flex items-center gap-1 transition-all ${
                                badge.isEquipped
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/30'
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
                          ) : (
                            <span className="text-[10px] font-bold text-[#B9AECF] flex items-center gap-1 shrink-0">
                              <Lock className="w-3 h-3" />
                              <span>Locked</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#C5B9DE] mt-1 leading-relaxed">{badge.description}</p>

                        {badge.isEarned ? (
                          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-300 font-semibold">
                            <Calendar className="w-3 h-3" />
                            <span>
                              Earned{' '}
                              {badge.earnedAt
                                ? new Date(badge.earnedAt).toLocaleDateString()
                                : 'Verified on Lenzo Party'}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-2.5 space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-[#B9AECF] gap-2">
                              <span className="truncate">{badge.unlockConditionText}</span>
                              <span className="font-mono text-white/85 shrink-0 tabular-nums">
                                {badge.progressCurrent.toLocaleString()} / {badge.progressTarget.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#8B20FF] to-[#FA26A0]"
                                style={{ width: `${Math.max(4, badge.progressPercent)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Inspected Level Detail Drawer */}
        {inspectedLevel && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setInspectedLevel(null)}
          >
            <div
              className="w-full max-w-sm bg-[#160B2A] border border-white/15 rounded-3xl p-5 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <LevelBadge level={inspectedLevel.level} size="lg" showTierName={true} />
                <button
                  onClick={() => setInspectedLevel(null)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col items-center justify-center py-2">
                <LevelEmblemBadge level={inspectedLevel.level} size="showcase" showSubLabel={true} />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-black/40 border border-white/10">
                  <span className="text-[10px] text-[#B9AECF] block">Level {inspectedLevel.level} Required</span>
                  <span className="text-sm font-black font-mono text-white tabular-nums">
                    {inspectedLevel.coinsForThisLevel.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-black/40 border border-white/10">
                  <span className="text-[10px] text-[#B9AECF] block">Total Coins Threshold</span>
                  <span className="text-sm font-black font-mono text-[#FFC84A] tabular-nums">
                    {inspectedLevel.cumulativeCoins.toLocaleString()}
                  </span>
                </div>
              </div>

              {inspectedLevel.level > 0 && (
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-[11px] font-mono tabular-nums">
                  <span className="text-[#B9AECF]">
                    Range: {inspectedLevel.cumulativeStart.toLocaleString()} → {inspectedLevel.cumulativeCoins.toLocaleString()}
                  </span>
                  {inspectedLevel.cumulativeCoins > progression.totalQualifyingCoinsSpent ? (
                    <span className="text-[#FFC84A] font-bold">
                      Need {(inspectedLevel.cumulativeCoins - progression.totalQualifyingCoinsSpent).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold">Unlocked</span>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#B9AECF]">
                  Unlocked Privileges &amp; Milestones
                </span>
                {inspectedLevel.perks.map((perk, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-xs text-white/95 bg-white/[0.04] px-3 py-2 rounded-xl border border-white/[0.07]"
                  >
                    <Check className="w-3.5 h-3.5 text-[#FFC84A] shrink-0" />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setInspectedLevel(null)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-xs font-extrabold"
              >
                Close Level Details
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
