import React, { useState, useEffect } from 'react';
import { 
  X, 
  Swords, 
  Trophy, 
  Flame, 
  Gift, 
  Heart, 
  Calendar, 
  Clock, 
  ShieldCheck,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { UserProfile, PKMatchHistoryItem } from '../../types';
import { pkService } from '../../utils/pkService';
import { AvatarWithFrame } from '../common/AvatarWithFrame';
import { LevelBadge } from '../common/LevelBadge';

interface PKMatchHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

export const PKMatchHistoryModal: React.FC<PKMatchHistoryModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [history, setHistory] = useState<PKMatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await pkService.fetchMatchHistory(currentUser.id);
      setHistory(data);
    } catch (e) {
      console.error('Error fetching PK history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, currentUser.id]);

  if (!isOpen) return null;

  const totalMatches = history.length;
  const totalWins = history.filter((h) => h.result === 'win').length;
  const totalLosses = history.filter((h) => h.result === 'loss').length;
  const totalDraws = history.filter((h) => h.result === 'draw').length;
  const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="w-full max-w-xl bg-[#160C25] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#211333] via-[#33114d] to-[#211333] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#EF4444] to-[#F59E0B] flex items-center justify-center text-white shadow-lg shadow-red-500/25">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white font-display flex items-center gap-2">
                PK Battle History
                <span className="text-[10px] bg-[#FFC84A]/20 text-[#FFC84A] font-mono px-2 py-0.5 rounded-full border border-[#FFC84A]/30">
                  {totalMatches} Matches
                </span>
              </h3>
              <p className="text-[11px] text-[#B9AECF]">
                Verified real-time match records and server logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadHistory}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              title="Refresh History"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Win/Loss Stats Overview Card */}
        <div className="p-4 bg-[#090611] border-b border-white/[0.08] grid grid-cols-4 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-[#211333] border border-white/[0.06]">
            <span className="text-[10px] text-[#B9AECF]">Win Rate</span>
            <span className="block text-base font-black text-[#FFC84A] font-mono">{winRate}%</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#211333] border border-white/[0.06]">
            <span className="text-[10px] text-[#B9AECF]">Wins</span>
            <span className="block text-base font-black text-emerald-400 font-mono">{totalWins}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#211333] border border-white/[0.06]">
            <span className="text-[10px] text-[#B9AECF]">Losses</span>
            <span className="block text-base font-black text-rose-400 font-mono">{totalLosses}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#211333] border border-white/[0.06]">
            <span className="text-[10px] text-[#B9AECF]">Draws</span>
            <span className="block text-base font-black text-cyan-400 font-mono">{totalDraws}</span>
          </div>
        </div>

        {/* Match Records List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 border-2 border-[#F328D5] border-t-transparent rounded-full animate-spin mb-2" />
              <span className="text-xs text-[#B9AECF]">Loading battle records...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#B9AECF]">
              No PK battles recorded yet. Start a live stream and challenge a host!
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-[#211333] border border-white/[0.06] hover:border-white/20 transition-all space-y-3"
              >
                {/* Match Header Row */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#B9AECF] text-[11px]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{item.date}</span>
                    <span>•</span>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{Math.floor(item.durationSeconds / 60)}:00</span>
                  </div>

                  {/* Result Badge */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    item.result === 'win'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : item.result === 'loss'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  }`}>
                    {item.result === 'win' ? '🏆 VICTORY' : item.result === 'loss' ? 'DEFEAT' : '🤝 DRAW'}
                  </span>
                </div>

                {/* Opponent Card & Scores */}
                <div className="flex items-center justify-between gap-3 bg-black/40 p-3 rounded-xl border border-white/[0.04]">
                  {/* Opponent Info */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AvatarWithFrame
                      avatar={item.opponent.avatar}
                      name={item.opponent.name}
                      level={item.opponent.level}
                      size="sm"
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-white truncate">
                          {item.opponent.name}
                        </span>
                        <LevelBadge level={item.opponent.level} size="xs" />
                      </div>
                      <span className="text-[10px] text-[#B9AECF] truncate">
                        {item.opponent.username}
                      </span>
                    </div>
                  </div>

                  {/* Score Tally */}
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-[#B9AECF]">You</span>
                      <span className="text-sm font-black text-[#06B6D4]">
                        {item.myScore.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-xs text-white/40 font-bold">:</span>
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] text-[#B9AECF]">Opponent</span>
                      <span className="text-sm font-black text-[#EF4444]">
                        {item.opponentScore.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Match Metrics */}
                <div className="flex items-center justify-between text-[11px] text-[#B9AECF] pt-0.5 px-1">
                  <span className="flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5 text-[#F328D5]" />
                    {item.giftsReceived} Gifts ({item.coinsEarned.toLocaleString()} Coins)
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    {item.likesReceived.toLocaleString()} Likes
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
