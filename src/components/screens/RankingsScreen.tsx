import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Crown,
  ChevronRight,
  UserPlus,
  UserCheck,
  Sliders,
  X,
  Trophy,
  Gift,
  Eye,
  Clock,
  Radio,
  Globe2,
  Video,
  Mic,
  RefreshCw,
  Flame,
} from 'lucide-react';
import {
  RankingCategory,
  RankingEntry,
  RankingConfig,
  RankingPeriod,
  RankingScope,
  UserProfile,
  ScreenType,
} from '../../types';
import { auth } from '../../firebase';
import { liveAndRoomService } from '../../services/liveAndRoomService';
import { profileService } from '../../utils/profileService';
import { LevelBadge } from '../common/LevelBadge';
import { VerifiedTick, resolveVerificationStatus } from '../common/VerifiedBadge';

interface RankingsScreenProps {
  currentUser: UserProfile;
  onNavigate: (screen: ScreenType) => void;
  onSelectUser: (user: UserProfile) => void;
}

const SCOPE_TABS: Array<{ id: RankingScope; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'global', label: 'Global App', icon: Globe2 },
  { id: 'solo', label: 'Solo Live', icon: Video },
  { id: 'party', label: 'Party Rooms', icon: Mic },
];

const CATEGORY_TABS: Array<{ id: RankingCategory; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'all', label: 'All', icon: Trophy },
  { id: 'host', label: 'Top Hosts', icon: Crown },
  { id: 'gifter', label: 'Top Gifters', icon: Gift },
  { id: 'viewer', label: 'Top Viewers', icon: Eye },
];

const PERIOD_TABS: Array<{ id: RankingPeriod; label: string }> = [
  { id: 'hourly', label: 'Hourly' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'all_time', label: 'All-Time' },
];

function formatCountdown(resetAt: number | null | undefined): string {
  if (!resetAt) return 'All-Time Hall of Fame';
  const diffMs = Math.max(0, resetAt - Date.now());
  const totalMins = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;
  if (days > 0) return `Resets in ${days}d ${hours}h`;
  if (hours > 0) return `Resets in ${hours}h ${mins}m`;
  return `Resets in ${Math.max(1, mins)}m`;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function buildMetricsLine(entry: RankingEntry, category: RankingCategory): string {
  const m = entry.metrics;
  if (!m) return entry.roleLabel || 'Active';
  if (category === 'gifter') {
    return `${m.giftsCount.toLocaleString()} gifts sent · ${m.sessionsCount} rooms`;
  }
  if (category === 'viewer') {
    const parts: string[] = [];
    if (m.giftsCoins > 0) parts.push(`🎁 ${formatCompact(m.giftsCoins)}`);
    if (m.commentsCount > 0) parts.push(`💬 ${m.commentsCount}`);
    if (m.likesCount > 0) parts.push(`❤️ ${formatCompact(m.likesCount)}`);
    if (m.watchMinutes > 0) parts.push(`⏱ ${m.watchMinutes}m`);
    return parts.length > 0 ? parts.join(' · ') : `${m.sessionsCount} sessions joined`;
  }
  if (category === 'host') {
    const parts: string[] = [];
    if (m.giftsCoins > 0) parts.push(`🎁 ${formatCompact(m.giftsCoins)} coins`);
    if (m.uniqueViewers > 0) parts.push(`👁 ${m.uniqueViewers} viewers`);
    if (m.likesCount > 0) parts.push(`❤️ ${formatCompact(m.likesCount)}`);
    return parts.length > 0 ? parts.join(' · ') : entry.isLive ? 'Broadcasting Live' : 'Active Host';
  }
  const parts: string[] = [];
  if (entry.roleLabel) parts.push(entry.roleLabel);
  if (m.giftsCoins > 0) parts.push(`🎁 ${formatCompact(m.giftsCoins)}`);
  if (m.uniqueViewers > 0) parts.push(`👁 ${m.uniqueViewers}`);
  else if (m.commentsCount > 0) parts.push(`💬 ${m.commentsCount}`);
  return parts.join(' · ');
}

export const RankingsScreen: React.FC<RankingsScreenProps> = ({
  currentUser,
  onNavigate,
  onSelectUser,
}) => {
  const [scope, setScope] = useState<RankingScope>('global');
  const [category, setCategory] = useState<RankingCategory>('all');
  const [period, setPeriod] = useState<RankingPeriod>('daily');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myEntry, setMyEntry] = useState<RankingEntry | null>(null);
  const [resetAt, setResetAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [followedMap, setFollowedMap] = useState<Record<string, boolean>>({});
  const [showAdminConfig, setShowAdminConfig] = useState(false);
  const [weights, setWeights] = useState<RankingConfig>({
    giftValueWeight: 1,
    uniqueViewerWeight: 25,
    engagementWeight: 2,
    activeLiveBoost: 500,
  });
  const [savingWeights, setSavingWeights] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAdmin =
    auth.currentUser?.email?.toLowerCase() === 'yaquoobe@gmail.com' &&
    auth.currentUser?.emailVerified === true;

  const loadRankings = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const data = await liveAndRoomService.fetchLeaderboard({
          scope,
          category,
          period,
          userId: currentUser.id,
          limit: 50,
        });
        setRankings(data.rankings);
        setMyRank(data.myRank);
        setMyEntry(data.myEntry || null);
        setResetAt(data.resetAt ?? null);
        if (data.config) {
          setWeights(data.config);
        }
      } catch {
        if (!silent) setRankings([]);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [scope, category, period, currentUser.id]
  );

  useEffect(() => {
    loadRankings(false);
  }, [loadRankings]);

  // Real-time WebSocket auto-refresh
  useEffect(() => {
    const unsubscribe = liveAndRoomService.addEventListener((event) => {
      if (
        event === 'rankings:updated' ||
        event === 'rankings:config_updated' ||
        event === 'live:directory_updated' ||
        event === 'room:directory_updated'
      ) {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => {
          loadRankings(true);
        }, 400);
      }
    });
    const handleGlobalRefresh = () => {
      void loadRankings(false);
    };
    window.addEventListener('lenzo:app-refresh', handleGlobalRefresh);

    return () => {
      unsubscribe();
      window.removeEventListener('lenzo:app-refresh', handleGlobalRefresh);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [loadRankings]);

  useEffect(() => {
    if (!isAdmin) return;
    liveAndRoomService.fetchAdminRankingConfig().then((cfg) => {
      if (cfg) setWeights(cfg);
    });
  }, [isAdmin]);

  const topThree = rankings.length >= 3 ? rankings.slice(0, 3) : [];
  const topSingle = rankings.length > 0 && rankings.length < 3 ? rankings[0] : null;
  const listRankings = rankings.length >= 3 ? rankings.slice(3) : rankings.slice(1);

  const toggleFollow = async (userId: string) => {
    if (!currentUser.id || currentUser.id === 'guest' || userId === currentUser.id) return;
    try {
      const res = await profileService.toggleFollow(userId, currentUser.id);
      setFollowedMap((prev) => ({
        ...prev,
        [userId]: res.isFollowing,
      }));
    } catch {
      // ignore
    }
  };

  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWeights(true);
    setStatusMessage(null);
    try {
      const updated = await liveAndRoomService.updateRankingConfig(weights);
      setWeights(updated);
      setStatusMessage('Ranking weights updated!');
      setTimeout(() => {
        setShowAdminConfig(false);
        setStatusMessage(null);
        loadRankings(false);
      }, 900);
    } catch (err: any) {
      setStatusMessage(err?.message || 'Failed to update weights.');
    } finally {
      setSavingWeights(false);
    }
  };

  return (
    <div className="w-full pb-24 sm:pb-12 animate-fade-in">
      <div className="max-w-3xl mx-auto px-3.5 sm:px-6 safe-pt-3 space-y-3.5">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => onNavigate('home')}
              className="w-9 h-9 rounded-full bg-[#160C25] hover:bg-[#211333] border border-white/10 flex items-center justify-center text-white transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white font-display truncate">
                  Leaderboards
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[9px] font-black uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-[11px] text-[#B9AECF] flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-[#FFC84A]" />
                <span>{formatCountdown(resetAt)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => loadRankings(false)}
              className="w-9 h-9 rounded-xl bg-[#160C25] hover:bg-[#211333] border border-white/10 flex items-center justify-center text-white transition-colors"
              title="Refresh Rankings"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowAdminConfig(true)}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#211333] hover:bg-[#2d1a46] border border-[#FFC84A]/40 text-[#FFC84A] text-[10px] font-bold transition-colors"
                title="Admin Ranking Weights"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Weights</span>
              </button>
            )}
          </div>
        </div>

        {/* Scope Selector: Global App | Solo Live | Party Rooms */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#160C25] rounded-2xl border border-white/10">
          {SCOPE_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = scope === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setScope(tab.id)}
                className={`py-2 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                  active
                    ? 'bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] shadow-md'
                    : 'text-[#C5B9DE] hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Category Tabs: All | Top Hosts | Top Gifters | Top Viewers */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#160C25] rounded-2xl border border-white/10">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = category === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={`py-2 px-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                  active
                    ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md shadow-[#F328D5]/20'
                    : 'text-[#B9AECF] hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Time Period Strip: Hourly | Daily | Weekly | Monthly | All-Time */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {PERIOD_TABS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                period === p.id
                  ? 'bg-white text-[#120722] border-white shadow'
                  : 'bg-[#160C25] text-[#C5B9DE] border-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center gap-2 text-xs text-[#B9AECF]">
            <div className="w-8 h-8 border-2 border-[#FFC84A] border-t-transparent rounded-full animate-spin" />
            <span>Loading real-time rankings...</span>
          </div>
        ) : rankings.length === 0 ? (
          <div className="rounded-3xl bg-[#160C25] border border-white/10 p-10 text-center flex flex-col items-center gap-3">
            <Trophy className="w-11 h-11 text-[#FFC84A]/55" />
            <h3 className="text-base font-extrabold text-white">
              No Ranked Activity Yet ({PERIOD_TABS.find((p) => p.id === period)?.label})
            </h3>
            <p className="text-xs text-[#B9AECF] max-w-sm leading-relaxed">
              Rankings update automatically in real time when hosts go live, viewers join &amp; chat, or gifts are sent in Solo Live and Party Rooms.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('create_live')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-bold"
              >
                Start Solo Live
              </button>
              <button
                type="button"
                onClick={() => onNavigate('rooms')}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold"
              >
                Join Party Rooms
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Top 3 Visual Podium (#2 — #1 — #3) */}
            {topThree.length === 3 && (
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 items-end pt-4 pb-1">
                {[topThree[1], topThree[0], topThree[2]].map((entry) => {
                  const isFirst = entry.rank === 1;
                  const verified = resolveVerificationStatus({
                    user: entry.user,
                    level: entry.user.level,
                    vipLevel: entry.user.vipLevel,
                    superVipLevel: entry.user.superVipLevel,
                  });
                  const cardCls = isFirst
                    ? 'bg-gradient-to-b from-[#3A1C12] via-[#260F3E] to-[#160C25] border-[#FFC84A]/65 shadow-xl shadow-[#FFC84A]/15 -mt-4 py-5'
                    : entry.rank === 2
                      ? 'bg-gradient-to-b from-[#23193A] to-[#160C25] border-slate-300/40 py-4'
                      : 'bg-gradient-to-b from-[#2B1928] to-[#160C25] border-amber-600/45 py-4';

                  return (
                    <div
                      key={entry.user.id}
                      onClick={() => onSelectUser(entry.user)}
                      className={`relative rounded-3xl border px-2.5 sm:px-3.5 flex flex-col items-center text-center cursor-pointer group transition-transform hover:scale-[1.02] ${cardCls}`}
                    >
                      {isFirst && (
                        <Crown className="w-7 h-7 text-[#FFC84A] fill-[#FFC84A] -mt-2 mb-1 drop-shadow-[0_2px_10px_rgba(255,200,74,0.75)]" />
                      )}

                      <div className="relative">
                        {entry.user.avatar ? (
                          <img
                            src={entry.user.avatar}
                            alt={entry.user.name}
                            referrerPolicy="no-referrer"
                            className={`rounded-full object-cover ring-2 ${
                              isFirst
                                ? 'w-16 h-16 sm:w-20 sm:h-20 ring-[#FFC84A]'
                                : entry.rank === 2
                                  ? 'w-13 h-13 sm:w-16 sm:h-16 ring-slate-300'
                                  : 'w-13 h-13 sm:w-16 sm:h-16 ring-amber-500'
                            }`}
                          />
                        ) : (
                          <div
                            className={`rounded-full bg-[#241240] flex items-center justify-center font-black text-white ring-2 ${
                              isFirst
                                ? 'w-16 h-16 sm:w-20 sm:h-20 text-xl ring-[#FFC84A]'
                                : 'w-13 h-13 sm:w-16 sm:h-16 text-base ring-white/30'
                            }`}
                          >
                            {(entry.user.name || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-black shadow ${
                            isFirst
                              ? 'bg-[#FFC84A] text-[#090611]'
                              : entry.rank === 2
                                ? 'bg-slate-200 text-[#090611]'
                                : 'bg-amber-600 text-white'
                          }`}
                        >
                          #{entry.rank}
                        </span>
                      </div>

                      <div className="flex items-center justify-center gap-1 mt-3 max-w-full">
                        <span className="text-xs sm:text-sm font-extrabold text-white truncate group-hover:text-[#FFC84A] transition-colors">
                          {entry.user.name}
                        </span>
                        {verified.tier !== 'none' && (
                          <VerifiedTick tier={verified.tier} size="xs" />
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                        <LevelBadge level={entry.user.level || 0} size="xs" />
                        {entry.isLive && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-600 text-[8px] font-black text-white uppercase">
                            LIVE
                          </span>
                        )}
                      </div>

                      <div
                        className={`mt-2 px-2.5 py-1 rounded-full font-mono font-black text-[11px] tabular-nums ${
                          isFirst
                            ? 'bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611]'
                            : 'bg-white/10 text-[#FFC84A]'
                        }`}
                      >
                        {entry.score}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Hero #1 Card when 1–2 users are ranked */}
            {topSingle && (
              <div
                onClick={() => onSelectUser(topSingle.user)}
                className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-[#2a1342] via-[#1d0e30] to-[#160C25] border border-[#FFC84A]/45 p-6 flex flex-col items-center text-center cursor-pointer group shadow-xl shadow-[#8B20FF]/20"
              >
                <div className="absolute top-0 w-60 h-60 bg-gradient-to-b from-[#FFC84A]/20 to-transparent rounded-full blur-2xl pointer-events-none" />
                <Crown className="w-8 h-8 text-[#FFC84A] fill-[#FFC84A] mb-2 drop-shadow-[0_2px_10px_rgba(255,200,74,0.8)]" />
                <div className="relative">
                  <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-[#FFC84A] via-[#F328D5] to-[#8B20FF] shadow-2xl group-hover:scale-105 transition-transform">
                    {topSingle.user.avatar ? (
                      <img
                        src={topSingle.user.avatar}
                        alt={topSingle.user.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full rounded-full object-cover ring-4 ring-[#160C25]"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[#211333] ring-4 ring-[#160C25] flex items-center justify-center text-white text-2xl font-black">
                        {topSingle.user.name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#FFC84A] text-[#090611] text-[10px] font-black">
                    #1
                  </span>
                </div>

                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <h3 className="text-lg sm:text-xl font-extrabold text-white font-display group-hover:text-[#FFC84A] transition-colors">
                    {topSingle.user.name}
                  </h3>
                  {(() => {
                    const v = resolveVerificationStatus({
                      user: topSingle.user,
                      level: topSingle.user.level,
                      vipLevel: topSingle.user.vipLevel,
                      superVipLevel: topSingle.user.superVipLevel,
                    });
                    return v.tier !== 'none' ? <VerifiedTick tier={v.tier} size="sm" /> : null;
                  })()}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <LevelBadge level={topSingle.user.level || 0} size="xs" />
                  <span className="text-xs text-[#B9AECF]">
                    {buildMetricsLine(topSingle, category)}
                  </span>
                </div>

                <div className="px-5 py-1.5 rounded-full bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] font-black font-mono text-sm shadow-md mt-2.5">
                  {topSingle.score}
                </div>
              </div>
            )}

            {/* Ranked List */}
            {listRankings.length > 0 && (
              <div className="space-y-2">
                {listRankings.map((entry) => {
                  const isFollowed = followedMap[entry.user.id] ?? entry.user.isFollowing;
                  const verified = resolveVerificationStatus({
                    user: entry.user,
                    level: entry.user.level,
                    vipLevel: entry.user.vipLevel,
                    superVipLevel: entry.user.superVipLevel,
                  });
                  const rankBadgeColor =
                    entry.rank === 2
                      ? 'text-slate-200 bg-slate-300/15 border-slate-300/35'
                      : entry.rank === 3
                        ? 'text-amber-400 bg-amber-600/15 border-amber-500/35'
                        : 'text-[#B9AECF] bg-white/5 border-white/10';

                  return (
                    <div
                      key={entry.user.id}
                      onClick={() => onSelectUser(entry.user)}
                      className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer group shadow-md ${
                        entry.user.id === currentUser.id
                          ? 'bg-[#261144] border-[#FA26A0]/50'
                          : 'bg-[#160C25] hover:bg-[#211333] border-white/10 hover:border-[#8B20FF]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-extrabold text-xs border shrink-0 ${rankBadgeColor}`}
                        >
                          {entry.rank}
                        </div>

                        <div className="relative shrink-0">
                          {entry.user.avatar ? (
                            <img
                              src={entry.user.avatar}
                              alt={entry.user.name}
                              referrerPolicy="no-referrer"
                              className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-[#8B20FF] transition-all"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-[#211333] ring-2 ring-white/10 flex items-center justify-center text-white font-bold text-sm">
                              {entry.user.name?.charAt(0) || 'U'}
                            </div>
                          )}
                          {entry.isLive && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 ring-2 ring-[#160C25] flex items-center justify-center">
                              <Radio className="w-2 h-2 text-white" />
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-white group-hover:text-[#F328D5] transition-colors truncate">
                              {entry.user.name}
                            </span>
                            {verified.tier !== 'none' && (
                              <VerifiedTick tier={verified.tier} size="xs" />
                            )}
                            <LevelBadge level={entry.user.level || 0} size="xs" />
                          </div>
                          <span className="text-[11px] text-[#B9AECF] truncate mt-0.5">
                            {buildMetricsLine(entry, category)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-xs sm:text-sm font-extrabold text-[#FFC84A] font-mono tabular-nums">
                          {entry.score}
                        </span>

                        {entry.user.id !== currentUser.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFollow(entry.user.id);
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                              isFollowed
                                ? 'bg-white/10 text-[#B9AECF] hover:bg-white/20'
                                : 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md shadow-[#F328D5]/20'
                            }`}
                            title={isFollowed ? 'Following' : 'Follow'}
                          >
                            {isFollowed ? (
                              <UserCheck className="w-4 h-4" />
                            ) : (
                              <UserPlus className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Current User Ranking Footer */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#211333] to-[#160C25] border border-white/10 flex items-center justify-between text-xs font-bold text-white">
          <div className="flex items-center gap-2 min-w-0">
            <Flame className="w-4 h-4 text-[#FA26A0] shrink-0" />
            <span className="text-[#B9AECF]">My Ranking:</span>
            <span className="text-[#FFC84A] font-mono">
              {myRank ? `#${myRank}` : 'Unranked'}
            </span>
            {myEntry && (
              <span className="text-white/80 font-mono truncate">
                · {myEntry.score}
              </span>
            )}
          </div>
          <button
            onClick={() => onNavigate('profile')}
            className="text-[#F328D5] flex items-center gap-1 hover:underline shrink-0"
          >
            <span>Profile</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Admin Ranking Weights Tuning Modal */}
      {showAdminConfig && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleSaveWeights}
            className="w-full max-w-md bg-[#160C25] border border-[#FFC84A]/40 rounded-3xl p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#FFC84A]" />
                <h3 className="text-sm font-extrabold text-white">Host Ranking Formula Weights</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminConfig(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="flex flex-col gap-1">
                <span className="text-[#B9AECF] font-semibold">Unique Viewer Weight</span>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={weights.uniqueViewerWeight}
                  onChange={(e) => setWeights({ ...weights, uniqueViewerWeight: Number(e.target.value) })}
                  className="bg-[#211333] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F328D5]"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[#B9AECF] font-semibold">Gift Value Weight</span>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={weights.giftValueWeight}
                  onChange={(e) => setWeights({ ...weights, giftValueWeight: Number(e.target.value) })}
                  className="bg-[#211333] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F328D5]"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[#B9AECF] font-semibold">Engagement Weight</span>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={weights.engagementWeight}
                  onChange={(e) => setWeights({ ...weights, engagementWeight: Number(e.target.value) })}
                  className="bg-[#211333] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F328D5]"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[#B9AECF] font-semibold">Active Live Boost</span>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={weights.activeLiveBoost}
                  onChange={(e) => setWeights({ ...weights, activeLiveBoost: Number(e.target.value) })}
                  className="bg-[#211333] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F328D5]"
                />
              </label>
            </div>

            {statusMessage && (
              <p className="text-xs text-center font-bold text-emerald-400">{statusMessage}</p>
            )}

            <button
              type="submit"
              disabled={savingWeights}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-bold shadow-lg disabled:opacity-60"
            >
              {savingWeights ? 'Saving...' : 'Save Ranking Formula'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
