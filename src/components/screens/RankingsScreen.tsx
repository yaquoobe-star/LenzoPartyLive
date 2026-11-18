import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Crown,
  ChevronRight,
  UserPlus,
  UserCheck,
  Sliders,
  X,
  Trophy,
} from 'lucide-react';
import {
  RankingEntry,
  RankingConfig,
  UserProfile,
  ScreenType,
} from '../../types';
import { auth } from '../../firebase';
import { liveAndRoomService } from '../../services/liveAndRoomService';
import { profileService } from '../../utils/profileService';

interface RankingsScreenProps {
  currentUser: UserProfile;
  onNavigate: (screen: ScreenType) => void;
  onSelectUser: (user: UserProfile) => void;
}

export const RankingsScreen: React.FC<RankingsScreenProps> = ({
  currentUser,
  onNavigate,
  onSelectUser,
}) => {
  const [activeTab, setActiveTab] = useState<'Star' | 'Contribution' | 'Wealth'>('Star');
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followedMap, setFollowedMap] = useState<Record<string, boolean>>({});
  const [showAdminConfig, setShowAdminConfig] = useState(false);
  const [weights, setWeights] = useState<RankingConfig>({
    giftValueWeight: 5,
    uniqueViewerWeight: 20,
    engagementWeight: 3,
    activeLiveBoost: 100,
  });
  const [savingWeights, setSavingWeights] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isAdmin =
    auth.currentUser?.email?.toLowerCase() === 'yaquoobe@gmail.com' &&
    auth.currentUser?.emailVerified === true;

  const loadRankings = async () => {
    setIsLoading(true);
    try {
      const data = await liveAndRoomService.fetchRankings(activeTab, timeFilter, currentUser.id);
      setRankings(data.rankings);
      if (data.config) {
        setWeights(data.config);
      }
    } catch {
      setRankings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRankings();
  }, [activeTab, timeFilter]);

  useEffect(() => {
    if (!isAdmin) return;
    liveAndRoomService.fetchAdminRankingConfig().then((cfg) => {
      if (cfg) setWeights(cfg);
    });
  }, [isAdmin]);

  const topUser = rankings[0];
  const otherRankings = rankings.slice(1);
  const myEntry = rankings.find((r) => r.user.id === currentUser.id);

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
        loadRankings();
      }, 900);
    } catch (err: any) {
      setStatusMessage(err?.message || 'Failed to update weights.');
    } finally {
      setSavingWeights(false);
    }
  };

  return (
    <div className="w-full pb-20 sm:pb-12 animate-fade-in">
      <div className="max-w-3xl mx-auto px-3.5 sm:px-6 pt-3 space-y-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('home')}
              className="w-9 h-9 rounded-full bg-[#160C25] hover:bg-[#211333] border border-white/10 flex items-center justify-center text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-extrabold text-white font-display">Rankings</h2>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowAdminConfig(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#211333] hover:bg-[#2d1a46] border border-[#FFC84A]/40 text-[#FFC84A] text-[10px] font-bold transition-colors"
                title="Admin Ranking Weights"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Weights</span>
              </button>
            )}

            <div className="flex items-center gap-1 bg-[#160C25] p-1 rounded-xl border border-white/10">
              {(['daily', 'weekly', 'monthly'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeFilter(t)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all ${
                    timeFilter === t
                      ? 'bg-[#8B20FF] text-white shadow-sm'
                      : 'text-[#B9AECF] hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex p-1 bg-[#160C25] rounded-2xl border border-white/10">
          {(['Star', 'Contribution', 'Wealth'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md shadow-[#F328D5]/20'
                  : 'text-[#B9AECF] hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-xs text-[#B9AECF]">Loading live rankings...</div>
        ) : rankings.length === 0 ? (
          <div className="rounded-3xl bg-[#160C25] border border-white/10 p-10 text-center flex flex-col items-center gap-2.5">
            <Trophy className="w-10 h-10 text-[#FFC84A]/50" />
            <h3 className="text-sm font-extrabold text-white">No Ranked Broadcasters Yet</h3>
            <p className="text-xs text-[#B9AECF] max-w-sm">
              Rankings update automatically from real active broadcasts, gifts, and community engagement.
            </p>
          </div>
        ) : (
          <>
            {/* Top #1 Hero Podium Card */}
            {topUser && (
              <div
                onClick={() => onSelectUser(topUser.user)}
                className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-[#2a1342] via-[#1d0e30] to-[#160C25] border border-[#FFC84A]/40 p-6 flex flex-col items-center text-center cursor-pointer group shadow-xl shadow-[#8B20FF]/20"
              >
                <div className="absolute top-0 w-60 h-60 bg-gradient-to-b from-[#FFC84A]/25 to-transparent rounded-full blur-2xl pointer-events-none" />

                <div className="relative flex items-center justify-center my-2">
                  <svg className="w-16 h-16 sm:w-20 sm:h-20 text-[#FFC84A] opacity-90 drop-shadow-[0_0_10px_#FFC84A] -mr-3" viewBox="0 0 100 100" fill="currentColor">
                    <path d="M90 50 C70 10, 30 10, 5 35 C20 40, 40 45, 60 52 C40 55, 20 62, 10 75 C30 70, 60 68, 85 58 Z" />
                  </svg>

                  <div className="relative z-10">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center justify-center">
                      <div className="relative">
                        <Crown className="w-8 h-8 text-[#FFC84A] fill-[#FFC84A] drop-shadow-[0_2px_10px_rgba(255,200,74,0.8)] animate-bounce" />
                        <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[9px] font-black px-1 rounded-full">
                          #1
                        </span>
                      </div>
                    </div>

                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-[#FFC84A] via-[#F328D5] to-[#8B20FF] shadow-2xl group-hover:scale-105 transition-transform">
                      {topUser.user.avatar ? (
                        <img
                          src={topUser.user.avatar}
                          alt={topUser.user.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full rounded-full object-cover ring-4 ring-[#160C25]"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-[#211333] ring-4 ring-[#160C25] flex items-center justify-center text-white text-2xl font-black">
                          {topUser.user.name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                  </div>

                  <svg className="w-16 h-16 sm:w-20 sm:h-20 text-[#FFC84A] opacity-90 drop-shadow-[0_0_10px_#FFC84A] -ml-3 scale-x-[-1]" viewBox="0 0 100 100" fill="currentColor">
                    <path d="M90 50 C70 10, 30 10, 5 35 C20 40, 40 45, 60 52 C40 55, 20 62, 10 75 C30 70, 60 68, 85 58 Z" />
                  </svg>
                </div>

                <div className="flex items-center gap-1.5 mt-2">
                  <h3 className="text-lg sm:text-xl font-extrabold text-white font-display group-hover:text-[#FFC84A] transition-colors">
                    {topUser.user.name}
                  </h3>
                  <Crown className="w-4 h-4 text-[#FFC84A] fill-[#FFC84A]" />
                </div>
                {topUser.user.displayId && (
                  <span className="text-xs text-[#B9AECF] font-mono mb-2">
                    ID: {topUser.user.displayId}
                  </span>
                )}

                <div className="px-5 py-1.5 rounded-full bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] font-black font-mono text-sm shadow-md flex items-center gap-1.5 mt-1">
                  <span>{topUser.score}</span>
                </div>
              </div>
            )}

            {/* Ranked List (#2+) */}
            <div className="space-y-2.5">
              {otherRankings.map((entry) => {
                const isFollowed = followedMap[entry.user.id] ?? entry.user.isFollowing;
                const rankBadgeColor =
                  entry.rank === 2
                    ? 'text-slate-300 bg-slate-300/10 border-slate-300/30'
                    : entry.rank === 3
                      ? 'text-amber-600 bg-amber-600/10 border-amber-600/30'
                      : 'text-[#B9AECF] bg-white/5 border-white/10';

                return (
                  <div
                    key={entry.user.id}
                    onClick={() => onSelectUser(entry.user)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/10 hover:border-[#8B20FF]/50 transition-all cursor-pointer group shadow-md"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-extrabold text-xs border shrink-0 ${rankBadgeColor}`}>
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
                        {entry.rank <= 3 && (
                          <span className="absolute -bottom-1 -right-1 bg-[#FFC84A] text-[#090611] p-0.5 rounded-full">
                            <Crown className="w-2.5 h-2.5 fill-current" />
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white group-hover:text-[#F328D5] transition-colors truncate">
                          {entry.user.name}
                        </span>
                        <span className="text-xs text-[#B9AECF] font-mono">
                          Lv.{entry.user.level || 1}{entry.user.displayId ? ` • ID: ${entry.user.displayId}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs sm:text-sm font-extrabold text-[#FFC84A] font-mono">
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
                          {isFollowed ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Honest Current User Ranking Footer (no #999+) */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#211333] to-[#160C25] border border-white/10 flex items-center justify-between text-xs font-bold text-white">
          <div className="flex items-center gap-2">
            <span className="text-[#B9AECF]">My Ranking:</span>
            <span className="text-[#FFC84A] font-mono">
              {myEntry ? `#${myEntry.rank}` : 'Unranked'}
            </span>
          </div>
          <button
            onClick={() => onNavigate('profile')}
            className="text-[#F328D5] flex items-center gap-1 hover:underline"
          >
            <span>See More</span>
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
                <h3 className="text-sm font-extrabold text-white">Broadcaster Ranking Weights</h3>
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
