import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Crown, 
  Flame, 
  Sparkles, 
  ChevronRight, 
  UserPlus, 
  UserCheck, 
  TrendingUp, 
  TrendingDown, 
  Minus 
} from 'lucide-react';
import { 
  RankingEntry, 
  UserProfile, 
  ScreenType 
} from '../../types';
import { 
  MOCK_STAR_RANKINGS, 
  MOCK_CONTRIBUTION_RANKINGS, 
  MOCK_WEALTH_RANKINGS 
} from '../../data/mockData';

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
  const [followedMap, setFollowedMap] = useState<Record<string, boolean>>({});

  const rankings: RankingEntry[] = {
    Star: MOCK_STAR_RANKINGS,
    Contribution: MOCK_CONTRIBUTION_RANKINGS,
    Wealth: MOCK_WEALTH_RANKINGS,
  }[activeTab];

  const topUser = rankings[0];
  const otherRankings = rankings.slice(1);

  const toggleFollow = (userId: string) => {
    setFollowedMap((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  return (
    <div className="w-full pb-20 sm:pb-12 animate-fade-in">
      <div className="max-w-3xl mx-auto px-3.5 sm:px-6 pt-3 space-y-4">
        
        {/* Header Bar matching reference image */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('home')}
              className="w-9 h-9 rounded-full bg-[#160C25] hover:bg-[#211333] border border-white/10 flex items-center justify-center text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-extrabold text-white font-display">Rankings</h2>
          </div>

          {/* Time Filter Chips (Daily, Weekly, Monthly) */}
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

        {/* Segmented Category Tabs matching reference: [Star] | [Contribution] | [Wealth] */}
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

        {/* Top #1 Hero Podium Card with Golden Wings matching reference image */}
        {topUser && (
          <div 
            onClick={() => onSelectUser(topUser.user)}
            className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-[#2a1342] via-[#1d0e30] to-[#160C25] border border-[#FFC84A]/40 p-6 flex flex-col items-center text-center cursor-pointer group shadow-xl shadow-[#8B20FF]/20"
          >
            {/* Ambient gold glow */}
            <div className="absolute top-0 w-60 h-60 bg-gradient-to-b from-[#FFC84A]/25 to-transparent rounded-full blur-2xl pointer-events-none" />

            {/* Stylized Golden Wings around Avatar */}
            <div className="relative flex items-center justify-center my-2">
              {/* Left Wing Vector */}
              <svg className="w-16 h-16 sm:w-20 sm:h-20 text-[#FFC84A] opacity-90 drop-shadow-[0_0_10px_#FFC84A] -mr-3" viewBox="0 0 100 100" fill="currentColor">
                <path d="M90 50 C70 10, 30 10, 5 35 C20 40, 40 45, 60 52 C40 55, 20 62, 10 75 C30 70, 60 68, 85 58 Z" />
              </svg>

              {/* Centered Avatar with Crown */}
              <div className="relative z-10">
                {/* Crown atop avatar */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center justify-center">
                  <div className="relative">
                    <Crown className="w-8 h-8 text-[#FFC84A] fill-[#FFC84A] drop-shadow-[0_2px_10px_rgba(255,200,74,0.8)] animate-bounce" />
                    <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[9px] font-black px-1 rounded-full">
                      #1
                    </span>
                  </div>
                </div>

                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-[#FFC84A] via-[#F328D5] to-[#8B20FF] shadow-2xl group-hover:scale-105 transition-transform">
                  <img
                    src={topUser.user.avatar}
                    alt={topUser.user.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full rounded-full object-cover ring-4 ring-[#160C25]"
                  />
                </div>
              </div>

              {/* Right Wing Vector */}
              <svg className="w-16 h-16 sm:w-20 sm:h-20 text-[#FFC84A] opacity-90 drop-shadow-[0_0_10px_#FFC84A] -ml-3 scale-x-[-1]" viewBox="0 0 100 100" fill="currentColor">
                <path d="M90 50 C70 10, 30 10, 5 35 C20 40, 40 45, 60 52 C40 55, 20 62, 10 75 C30 70, 60 68, 85 58 Z" />
              </svg>
            </div>

            {/* Name & ID */}
            <div className="flex items-center gap-1.5 mt-2">
              <h3 className="text-lg sm:text-xl font-extrabold text-white font-display group-hover:text-[#FFC84A] transition-colors">
                {topUser.user.name}
              </h3>
              <Crown className="w-4 h-4 text-[#FFC84A] fill-[#FFC84A]" />
            </div>
            <span className="text-xs text-[#B9AECF] font-mono mb-2">
              ID: {topUser.user.displayId}
            </span>

            {/* Score Pill */}
            <div className="px-5 py-1.5 rounded-full bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] font-black font-mono text-sm shadow-md flex items-center gap-1.5">
              <span>🔥</span>
              <span>{topUser.score}</span>
            </div>
          </div>
        )}

        {/* Ranked List (Rank #2 to #8) matching reference image */}
        <div className="space-y-2.5">
          {otherRankings.map((entry) => {
            const isFollowed = followedMap[entry.user.id] ?? entry.user.isFollowing;
            const rankBadgeColor = 
              entry.rank === 2 ? 'text-slate-300 bg-slate-300/10 border-slate-300/30' :
              entry.rank === 3 ? 'text-amber-600 bg-amber-600/10 border-amber-600/30' :
              'text-[#B9AECF] bg-white/5 border-white/10';

            return (
              <div
                key={entry.rank}
                onClick={() => onSelectUser(entry.user)}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/10 hover:border-[#8B20FF]/50 transition-all cursor-pointer group shadow-md"
              >
                {/* Left: Rank & Avatar & Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-extrabold text-xs border shrink-0 ${rankBadgeColor}`}>
                    {entry.rank}
                  </div>

                  <div className="relative shrink-0">
                    <img
                      src={entry.user.avatar}
                      alt={entry.user.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-[#8B20FF] transition-all"
                    />
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
                      Lv.{entry.user.level} • ID: {entry.user.displayId}
                    </span>
                  </div>
                </div>

                {/* Right: Score & Follow button */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs sm:text-sm font-extrabold text-[#FFC84A] font-mono">
                    {entry.score}
                  </span>

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
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Fixed "My Ranking #999+ [See More >]" matching reference */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#211333] to-[#160C25] border border-white/10 flex items-center justify-between text-xs font-bold text-white">
          <div className="flex items-center gap-2">
            <span className="text-[#B9AECF]">My Ranking:</span>
            <span className="text-[#FFC84A] font-mono">#999+</span>
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
    </div>
  );
};
