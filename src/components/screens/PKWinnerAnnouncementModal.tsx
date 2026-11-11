import React from 'react';
import { 
  Trophy, 
  Crown, 
  X, 
  Sparkles, 
  Gift, 
  Heart, 
  Swords, 
  RotateCcw, 
  Flame,
  CheckCircle2
} from 'lucide-react';
import { PKMatchSession, UserProfile } from '../../types';
import { AvatarWithFrame } from '../common/AvatarWithFrame';
import { LevelBadge } from '../common/LevelBadge';

interface PKWinnerAnnouncementModalProps {
  session: PKMatchSession | null;
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onRematch?: () => void;
  onViewHistory?: () => void;
}

export const PKWinnerAnnouncementModal: React.FC<PKWinnerAnnouncementModalProps> = ({
  session,
  currentUser,
  isOpen,
  onClose,
  onRematch,
  onViewHistory,
}) => {
  if (!isOpen || !session) return null;

  const host1 = session.host1;
  const host2 = session.host2;

  const isDraw = session.winnerId === 'draw' || host1.score === host2.score;
  const winner = isDraw 
    ? null 
    : session.winnerId === host1.user.id 
      ? host1 
      : host2;

  const loser = isDraw 
    ? null 
    : winner?.user.id === host1.user.id 
      ? host2 
      : host1;

  const totalScore = host1.score + host2.score || 1;
  const percent1 = Math.round((host1.score / totalScore) * 100);
  const percent2 = 100 - percent1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="w-full max-w-lg bg-[#160C25] border-2 border-[#FFC84A]/40 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(255,200,74,0.3)] relative flex flex-col animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti & Golden Victory Header */}
        <div className="relative p-6 pb-4 bg-gradient-to-b from-[#3d240d] via-[#211333] to-[#160C25] text-center border-b border-white/[0.08] overflow-hidden">
          {/* Subtle sparkles background */}
          <div className="absolute top-2 left-6 text-2xl animate-spin">✨</div>
          <div className="absolute top-4 right-8 text-2xl animate-bounce">🎉</div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center">
            {isDraw ? (
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#06B6D4] to-[#3B82F6] flex items-center justify-center text-white shadow-xl shadow-cyan-500/25 mb-3">
                <Swords className="w-8 h-8" />
              </div>
            ) : (
              <div className="relative mb-2">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#FFC84A] via-[#F59E0B] to-[#EF4444] p-1 shadow-2xl animate-pulse">
                  <img
                    src={winner?.user.avatar}
                    alt={winner?.user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FFC84A] text-[#090611] p-1 rounded-full shadow-lg">
                  <Crown className="w-5 h-5 fill-current" />
                </div>
              </div>
            )}

            <h2 className="text-xl sm:text-2xl font-black text-white font-display tracking-wide mt-1">
              {isDraw ? "IT'S A DRAW!" : `${winner?.user.name} VICTORY!`}
            </h2>
            <p className="text-xs text-[#FFC84A] font-medium mt-0.5">
              {isDraw ? 'Both hosts fought valiantly with tied scores!' : 'PK Live Battle Champion'}
            </p>
          </div>
        </div>

        {/* Score Comparison Arena */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Host 1 Card */}
            <div className={`p-3.5 rounded-2xl border flex flex-col items-center text-center relative ${
              winner?.user.id === host1.user.id 
                ? 'bg-[#FFC84A]/10 border-[#FFC84A]/50 shadow-lg' 
                : 'bg-black/30 border-white/[0.08]'
            }`}>
              {winner?.user.id === host1.user.id && (
                <span className="absolute -top-2.5 px-2 py-0.2 rounded-full bg-[#FFC84A] text-[#090611] text-[9px] font-black uppercase">
                  Winner
                </span>
              )}
              <AvatarWithFrame
                avatar={host1.user.avatar}
                name={host1.user.name}
                level={host1.user.level || 40}
                size="md"
              />
              <span className="text-xs font-bold text-white mt-1.5 truncate max-w-[120px]">
                {host1.user.name}
              </span>
              <span className="text-lg font-black text-[#06B6D4] font-mono mt-1">
                {host1.score.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#B9AECF]">Battle Points</span>
            </div>

            {/* Host 2 Card */}
            <div className={`p-3.5 rounded-2xl border flex flex-col items-center text-center relative ${
              winner?.user.id === host2.user.id 
                ? 'bg-[#FFC84A]/10 border-[#FFC84A]/50 shadow-lg' 
                : 'bg-black/30 border-white/[0.08]'
            }`}>
              {winner?.user.id === host2.user.id && (
                <span className="absolute -top-2.5 px-2 py-0.2 rounded-full bg-[#FFC84A] text-[#090611] text-[9px] font-black uppercase">
                  Winner
                </span>
              )}
              <AvatarWithFrame
                avatar={host2.user.avatar}
                name={host2.user.name}
                level={host2.user.level || 40}
                size="md"
              />
              <span className="text-xs font-bold text-white mt-1.5 truncate max-w-[120px]">
                {host2.user.name}
              </span>
              <span className="text-lg font-black text-[#EF4444] font-mono mt-1">
                {host2.score.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#B9AECF]">Battle Points</span>
            </div>
          </div>

          {/* Tug-of-War Percentage Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-extrabold font-mono">
              <span className="text-[#06B6D4]">{percent1}%</span>
              <span className="text-xs text-[#B9AECF]">FINAL CONTRIBUTION</span>
              <span className="text-[#EF4444]">{percent2}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-black/40 overflow-hidden flex p-0.5 border border-white/10">
              <div 
                className="h-full bg-gradient-to-r from-[#06B6D4] to-[#3B82F6] rounded-l-full transition-all"
                style={{ width: `${percent1}%` }}
              />
              <div 
                className="h-full bg-gradient-to-r from-[#F59E0B] to-[#EF4444] rounded-r-full transition-all"
                style={{ width: `${percent2}%` }}
              />
            </div>
          </div>

          {/* Statistics Grid (Gifts & Double-Tap Likes) */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-[#211333] border border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-[#F328D5]" />
                <span className="text-[#B9AECF]">Gifts:</span>
              </div>
              <span className="font-bold text-white font-mono">
                {host1.giftsReceivedCount} vs {host2.giftsReceivedCount}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#211333] border border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <span className="text-[#B9AECF]">Likes:</span>
              </div>
              <span className="font-bold text-white font-mono">
                {host1.likes.toLocaleString()} vs {host2.likes.toLocaleString()}
              </span>
            </div>
          </div>

          {/* MVP Gifter Recognition */}
          {session.mvp && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-[#8B20FF]/20 via-[#F328D5]/20 to-[#FFC84A]/20 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={session.mvp.user.avatar}
                  alt={session.mvp.user.name}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-[#FFC84A]"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#FFC84A]" />
                    Battle MVP: {session.mvp.user.name}
                  </span>
                  <span className="text-[10px] text-[#B9AECF]">
                    Supported with {session.mvp.amount.toLocaleString()} pts
                  </span>
                </div>
              </div>
              <span className="text-sm font-black text-[#FFC84A] font-mono">
                MVP 👑
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-[#090611] border-t border-white/[0.08] flex flex-col sm:flex-row gap-2">
          {onRematch && (
            <button
              onClick={onRematch}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#EF4444] to-[#F59E0B] text-white text-xs font-bold shadow-md shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rematch</span>
            </button>
          )}

          {onViewHistory && (
            <button
              onClick={onViewHistory}
              className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold active:scale-95 transition-all"
            >
              View Match History
            </button>
          )}

          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-bold active:scale-95 transition-all shadow-md shadow-[#F328D5]/20"
          >
            Back to Live
          </button>
        </div>
      </div>
    </div>
  );
};
