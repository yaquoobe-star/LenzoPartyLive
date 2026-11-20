import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Trophy,
  Crown,
  Gift,
  Eye,
  Flame,
  Clock,
  Radio,
  Sparkles,
  UserPlus,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import {
  RankingCategory,
  RankingEntry,
  RankingPeriod,
  RankingScope,
  UserProfile,
} from '../../types';
import { liveAndRoomService } from '../../services/liveAndRoomService';
import { profileService } from '../../utils/profileService';
import { LevelBadge } from './LevelBadge';
import { VerifiedTick, resolveVerificationStatus } from './VerifiedBadge';

interface LiveLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'solo' | 'party';
  contextId: string;
  contextTitle?: string;
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  initialScopeTab?: 'this_room' | 'mode_global' | 'global';
  initialCategory?: RankingCategory;
}

const PERIOD_OPTIONS: Array<{ id: RankingPeriod; label: string }> = [
  { id: 'hourly', label: 'Hourly' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'all_time', label: 'All-Time' },
];

const CATEGORY_OPTIONS: Array<{ id: RankingCategory; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'all', label: 'All', icon: Trophy },
  { id: 'host', label: 'Host', icon: Crown },
  { id: 'gifter', label: 'Gifter', icon: Gift },
  { id: 'viewer', label: 'Top Viewer', icon: Eye },
];

function formatCountdown(resetAt: number | null | undefined): string {
  if (!resetAt) return 'All-Time';
  const diffMs = Math.max(0, resetAt - Date.now());
  const totalMins = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;
  if (days > 0) return `Resets ${days}d ${hours}h`;
  if (hours > 0) return `Resets ${hours}h ${mins}m`;
  return `Resets ${Math.max(1, mins)}m`;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function renderMetricsSummary(entry: RankingEntry, category: RankingCategory): string {
  const m = entry.metrics;
  if (!m) return entry.roleLabel || '';
  if (category === 'gifter') {
    return `${m.giftsCount.toLocaleString()} gifts sent`;
  }
  if (category === 'viewer') {
    const parts: string[] = [];
    if (m.giftsCoins > 0) parts.push(`🎁 ${formatCompact(m.giftsCoins)}`);
    if (m.commentsCount > 0) parts.push(`💬 ${m.commentsCount}`);
    if (m.likesCount > 0) parts.push(`❤️ ${formatCompact(m.likesCount)}`);
    if (m.watchMinutes > 0) parts.push(`⏱ ${m.watchMinutes}m`);
    return parts.length > 0 ? parts.join(' · ') : `${m.sessionsCount} joined`;
  }
  if (category === 'host') {
    const parts: string[] = [];
    if (m.giftsCoins > 0) parts.push(`🎁 ${formatCompact(m.giftsCoins)}`);
    if (m.uniqueViewers > 0) parts.push(`👁 ${m.uniqueViewers}`);
    if (m.likesCount > 0) parts.push(`❤️ ${formatCompact(m.likesCount)}`);
    return parts.length > 0 ? parts.join(' · ') : entry.isLive ? 'Live Now' : 'Active Host';
  }
  const parts: string[] = [];
  if (entry.roleLabel) parts.push(entry.roleLabel);
  if (m.giftsCoins > 0) parts.push(`🎁 ${formatCompact(m.giftsCoins)}`);
  if (m.uniqueViewers > 0) parts.push(`👁 ${m.uniqueViewers}`);
  else if (m.commentsCount > 0) parts.push(`💬 ${m.commentsCount}`);
  return parts.join(' · ');
}

export const LiveLeaderboardModal: React.FC<LiveLeaderboardModalProps> = ({
  isOpen,
  onClose,
  mode,
  contextId,
  contextTitle,
  currentUser,
  onSelectUser,
  initialScopeTab = 'this_room',
  initialCategory = 'all',
}) => {
  const [scopeTab, setScopeTab] = useState<'this_room' | 'mode_global' | 'global'>(initialScopeTab);
  const [category, setCategory] = useState<RankingCategory>(initialCategory);
  const [period, setPeriod] = useState<RankingPeriod>('hourly');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myEntry, setMyEntry] = useState<RankingEntry | null>(null);
  const [resetAt, setResetAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [followedMap, setFollowedMap] = useState<Record<string, boolean>>({});
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadBoard = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const scope: RankingScope =
        scopeTab === 'global' ? 'global' : mode === 'solo' ? 'solo' : 'party';
      const data = await liveAndRoomService.fetchLeaderboard({
        scope,
        category,
        period,
        contextId: scopeTab === 'this_room' ? contextId : undefined,
        userId: currentUser.id,
        limit: 50,
      });
      setRankings(data.rankings);
      setMyRank(data.myRank);
      setMyEntry(data.myEntry || null);
      setResetAt(data.resetAt ?? null);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [scopeTab, mode, category, period, contextId, currentUser.id]);

  useEffect(() => {
    if (!isOpen) return;
    loadBoard(false);
  }, [isOpen, loadBoard]);

  // Real-time WebSocket auto-refresh whenever gifts, likes, comments, or joins happen
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = liveAndRoomService.addEventListener((event) => {
      if (
        event === 'rankings:updated' ||
        event === 'rankings:config_updated' ||
        event === 'live:gift' ||
        event === 'room:gift' ||
        event === 'live:viewer_joined' ||
        event === 'room:participant_joined'
      ) {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => {
          loadBoard(true);
        }, 350);
      }
    });
    return () => {
      unsubscribe();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [isOpen, loadBoard]);

  if (!isOpen) return null;

  const toggleFollow = async (userId: string) => {
    if (!currentUser.id || currentUser.id === 'guest' || userId === currentUser.id) return;
    try {
      const res = await profileService.toggleFollow(userId, currentUser.id);
      setFollowedMap((prev) => ({ ...prev, [userId]: res.isFollowing }));
    } catch {
      // ignore
    }
  };

  const topThree = rankings.length >= 3 ? rankings.slice(0, 3) : [];
  const listEntries = rankings.length >= 3 ? rankings.slice(3) : rankings;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#120722] border-t sm:border border-[#FFC84A]/35 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[86vh] overflow-hidden text-white"
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 bg-gradient-to-r from-[#281048] via-[#1C0B36] to-[#120722] border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#FFC84A] to-[#F59E0B] text-[#090611] flex items-center justify-center shadow-lg shadow-[#FFC84A]/25 shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-black text-white truncate">
                    {scopeTab === 'this_room'
                      ? mode === 'solo'
                        ? 'Live Stream Leaderboard'
                        : 'Party Room Leaderboard'
                      : scopeTab === 'mode_global'
                        ? mode === 'solo'
                          ? 'Solo Live Rankings'
                          : 'Party Rooms Rankings'
                        : 'Global App Rankings'}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[9px] font-black uppercase shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-[#C5B9DE] truncate">
                  {scopeTab === 'this_room' && contextTitle
                    ? contextTitle
                    : 'Real-time scores · Hosts, Gifters & Top Viewers'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => loadBoard(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                title="Refresh Leaderboard"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scope Switcher: This Live/Party | Solo/Party Global | Global App */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-black/40 border border-white/10">
            <button
              type="button"
              onClick={() => setScopeTab('this_room')}
              className={`py-1.5 rounded-xl text-[11px] font-extrabold transition-all ${
                scopeTab === 'this_room'
                  ? 'bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] shadow'
                  : 'text-[#C5B9DE] hover:text-white'
              }`}
            >
              {mode === 'solo' ? 'This Live' : 'This Party'}
            </button>
            <button
              type="button"
              onClick={() => setScopeTab('mode_global')}
              className={`py-1.5 rounded-xl text-[11px] font-extrabold transition-all ${
                scopeTab === 'mode_global'
                  ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow'
                  : 'text-[#C5B9DE] hover:text-white'
              }`}
            >
              {mode === 'solo' ? 'All Solo Live' : 'All Parties'}
            </button>
            <button
              type="button"
              onClick={() => setScopeTab('global')}
              className={`py-1.5 rounded-xl text-[11px] font-extrabold transition-all ${
                scopeTab === 'global'
                  ? 'bg-gradient-to-r from-[#06B6D4] to-[#8B20FF] text-white shadow'
                  : 'text-[#C5B9DE] hover:text-white'
              }`}
            >
              Global App
            </button>
          </div>

          {/* Category Tabs: All | Host | Gifter | Top Viewer */}
          <div className="grid grid-cols-4 gap-1.5">
            {CATEGORY_OPTIONS.map((cat) => {
              const Icon = cat.icon;
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border transition-all ${
                    active
                      ? 'bg-[#FA26A0]/20 border-[#FA26A0]/70 text-white shadow-sm'
                      : 'bg-white/[0.04] border-white/[0.08] text-[#B9AECF] hover:text-white'
                  }`}
                >
                  <Icon className={`w-3 h-3 shrink-0 ${active ? 'text-[#FFC84A]' : ''}`} />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Time Period Pills + Reset Countdown */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                    period === p.id
                      ? 'bg-white text-[#120722]'
                      : 'bg-white/[0.06] text-[#C5B9DE] hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#FFC84A] shrink-0">
              <Clock className="w-3 h-3" />
              <span>{formatCountdown(resetAt)}</span>
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
          {isLoading ? (
            <div className="py-14 flex flex-col items-center gap-2 text-xs text-[#B9AECF]">
              <div className="w-7 h-7 border-2 border-[#FFC84A] border-t-transparent rounded-full animate-spin" />
              <span>Loading real-time rankings...</span>
            </div>
          ) : rankings.length === 0 ? (
            <div className="py-12 px-4 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-2">
              <Sparkles className="w-9 h-9 text-[#FFC84A]/60 mx-auto" />
              <p className="text-sm font-extrabold text-white">No Ranked Activity in This Window</p>
              <p className="text-xs text-[#B9AECF] max-w-xs mx-auto leading-relaxed">
                Send gifts, tap hearts, chat, or stay watching to claim the #1 spot on this live leaderboard!
              </p>
            </div>
          ) : (
            <>
              {/* Compact Top 3 Podium (#2 - #1 - #3) */}
              {topThree.length === 3 && (
                <div className="grid grid-cols-3 gap-2 items-end pt-3 pb-1">
                  {[topThree[1], topThree[0], topThree[2]].map((entry) => {
                    const isFirst = entry.rank === 1;
                    const verified = resolveVerificationStatus({
                      user: entry.user,
                      level: entry.user.level,
                      vipLevel: entry.user.vipLevel,
                      superVipLevel: entry.user.superVipLevel,
                    });
                    const borderCls = isFirst
                      ? 'border-[#FFC84A]/60 bg-gradient-to-b from-[#331B0E] via-[#210E36] to-[#170928]'
                      : entry.rank === 2
                        ? 'border-slate-300/35 bg-[#1B0D31]'
                        : 'border-amber-600/40 bg-[#1B0D31]';

                    return (
                      <div
                        key={entry.user.id}
                        onClick={() => {
                          onClose();
                          onSelectUser(entry.user);
                        }}
                        className={`rounded-2xl border p-2.5 flex flex-col items-center text-center cursor-pointer transition-transform hover:scale-[1.02] ${borderCls} ${
                          isFirst ? '-mt-3 pb-3.5 shadow-lg shadow-[#FFC84A]/15' : ''
                        }`}
                      >
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full mb-1.5 ${
                            isFirst
                              ? 'bg-[#FFC84A] text-[#090611]'
                              : entry.rank === 2
                                ? 'bg-slate-200 text-[#090611]'
                                : 'bg-amber-600 text-white'
                          }`}
                        >
                          #{entry.rank}
                        </span>

                        <div className="relative">
                          {entry.user.avatar ? (
                            <img
                              src={entry.user.avatar}
                              alt={entry.user.name}
                              referrerPolicy="no-referrer"
                              className={`rounded-full object-cover ring-2 ${
                                isFirst
                                  ? 'w-14 h-14 ring-[#FFC84A]'
                                  : 'w-11 h-11 ring-white/25'
                              }`}
                            />
                          ) : (
                            <div
                              className={`rounded-full bg-[#2A1548] flex items-center justify-center font-black text-white ring-2 ${
                                isFirst
                                  ? 'w-14 h-14 text-lg ring-[#FFC84A]'
                                  : 'w-11 h-11 text-sm ring-white/25'
                              }`}
                            >
                              {(entry.user.name || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          {entry.isLive && (
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded bg-rose-600 text-[8px] font-black text-white uppercase">
                              LIVE
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-center gap-1 mt-2 max-w-full">
                          <span className="text-[11px] font-extrabold text-white truncate">
                            {entry.user.name}
                          </span>
                          {verified.tier !== 'none' && (
                            <VerifiedTick tier={verified.tier} size="xs" />
                          )}
                        </div>
                        <span className="text-[10px] font-mono font-black text-[#FFC84A] mt-0.5 tabular-nums">
                          {entry.score}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Ranked Rows */}
              <div className="space-y-2">
                {listEntries.map((entry) => {
                  const isFollowed = followedMap[entry.user.id] ?? entry.user.isFollowing;
                  const verified = resolveVerificationStatus({
                    user: entry.user,
                    level: entry.user.level,
                    vipLevel: entry.user.vipLevel,
                    superVipLevel: entry.user.superVipLevel,
                  });
                  const badgeCls =
                    entry.rank === 1
                      ? 'bg-[#FFC84A] text-[#090611] border-[#FFC84A]'
                      : entry.rank === 2
                        ? 'bg-slate-200 text-[#090611] border-slate-200'
                        : entry.rank === 3
                          ? 'bg-amber-600 text-white border-amber-500'
                          : 'bg-white/[0.06] text-[#D7CEEB] border-white/10';

                  return (
                    <div
                      key={entry.user.id}
                      onClick={() => {
                        onClose();
                        onSelectUser(entry.user);
                      }}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                        entry.user.id === currentUser.id
                          ? 'bg-[#281249] border-[#FA26A0]/50'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full border flex items-center justify-center font-mono text-xs font-black shrink-0 ${badgeCls}`}
                        >
                          {entry.rank}
                        </div>

                        <div className="relative shrink-0">
                          {entry.user.avatar ? (
                            <img
                              src={entry.user.avatar}
                              alt={entry.user.name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-full object-cover ring-1 ring-white/20"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#2A1548] flex items-center justify-center text-xs font-black text-white">
                              {(entry.user.name || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          {entry.isLive && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-[#120722]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold text-white truncate">
                              {entry.user.name}
                            </span>
                            {verified.tier !== 'none' && (
                              <VerifiedTick tier={verified.tier} size="xs" />
                            )}
                            <LevelBadge level={entry.user.level || 0} size="xs" />
                          </div>
                          <p className="text-[10px] text-[#B9AECF] truncate mt-0.5">
                            {renderMetricsSummary(entry, category)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono font-black text-[#FFC84A] tabular-nums">
                          {entry.score}
                        </span>
                        {entry.user.id !== currentUser.id && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFollow(entry.user.id);
                            }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                              isFollowed
                                ? 'bg-white/10 text-[#C5B9DE]'
                                : 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white'
                            }`}
                            title={isFollowed ? 'Following' : 'Follow'}
                          >
                            {isFollowed ? (
                              <UserCheck className="w-3.5 h-3.5" />
                            ) : (
                              <UserPlus className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Sticky My Rank Footer */}
        <div className="px-4 py-3 bg-[#1A0B30] border-t border-white/10 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Flame className="w-4 h-4 text-[#FA26A0] shrink-0" />
            <span className="text-[#C5B9DE] font-semibold">Your Rank:</span>
            <span className="font-mono font-black text-[#FFC84A]">
              {myRank ? `#${myRank}` : 'Unranked'}
            </span>
            {myEntry && (
              <span className="text-[11px] font-mono text-white/80 truncate">
                · {myEntry.score}
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] text-[#B9AECF] shrink-0">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span>Auto-sync</span>
          </span>
        </div>
      </div>
    </div>
  );
};
