import React, { useState, useEffect } from 'react';
import { 
  X, 
  Swords, 
  Trophy, 
  Gift, 
  Flame, 
  Sparkles, 
  Crown, 
  Send 
} from 'lucide-react';
import { UserProfile, GiftItem } from '../../types';

interface PKBattleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  host1?: UserProfile;
  host2?: UserProfile;
  onOpenGiftShop: (recipient: UserProfile) => void;
}

export const PKBattleModal: React.FC<PKBattleModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  host1 = currentUser,
  host2,
  onOpenGiftShop,
}) => {
  const opponent: UserProfile = host2 || {
    id: 'user_kingraja',
    displayId: '77218390',
    name: 'KingRaja 👑',
    username: '@kingraja',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    bio: 'Top Gifter & Party Host',
    level: 68,
    currentExp: 42000,
    nextLevelExp: 50000,
    totalGiftsReceived: 1240,
    totalGiftsValue: 380000,
    vipLevel: 5,
    isVIP: true,
    fansCount: '3.1M',
    followingCount: 89,
    likesCount: '21.4M',
    coins: 145000,
    diamonds: 89000,
  };


  const [score1, setScore1] = useState(14850);
  const [score2, setScore2] = useState(18200);
  const [timeLeft, setTimeLeft] = useState(185); // seconds (3:05)
  const [battleFinished, setBattleFinished] = useState(false);
  const [boostEffect, setBoostEffect] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setBattleFinished(true);
          return 0;
        }
        return prev - 1;
      });

      // Random dynamic score updates to simulate live audience gifts
      if (Math.random() > 0.6) {
        setScore2((s) => s + Math.floor(Math.random() * 250 + 50));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalScores = score1 + score2 || 1;
  const percent1 = Math.round((score1 / totalScores) * 100);
  const percent2 = 100 - percent1;

  const handleBoostTeam1 = () => {
    setScore1((s) => s + 500);
    setBoostEffect(true);
    setTimeout(() => setBoostEffect(false), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="w-full max-w-xl bg-[#160C25] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Battle Header */}
        <div className="relative p-4 bg-gradient-to-r from-[#211333] via-[#351854] to-[#211333] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center font-black">
              <Swords className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-white font-display">Live PK Battle Arena</h3>
              <p className="text-[10px] text-[#B9AECF]">Send gifts to boost your host to victory!</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Timer Badge */}
            <div className="px-3 py-1 rounded-full bg-red-600/30 border border-red-500/50 text-white text-xs font-mono font-black flex items-center gap-1.5 shadow">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>{minutes}:{seconds < 10 ? `0${seconds}` : seconds}</span>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Dual-Host Arena View */}
        <div className="relative p-4 sm:p-6 bg-gradient-to-b from-[#160C25] to-[#0c0717]">
          {/* Centered 'VS' Emblem */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#EF4444] to-[#F59E0B] p-[2px] shadow-2xl animate-pulse">
              <div className="w-full h-full rounded-full bg-[#090611] flex items-center justify-center text-white font-black text-xs font-display">
                VS
              </div>
            </div>
          </div>

          {/* Two Hosts Split Display */}
          <div className="grid grid-cols-2 gap-4 relative z-10">
            {/* Host 1 (Left / Blue Team) */}
            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-[#06B6D4]/10 border border-[#06B6D4]/30 shadow-lg">
              <div className="relative mb-2">
                <img
                  src={host1.avatar}
                  alt={host1.name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-[#06B6D4] shadow-xl"
                />
                <span className="absolute -bottom-1 -right-1 bg-[#06B6D4] text-[#090611] text-[9px] font-black px-1.5 py-0.2 rounded-full shadow">
                  Team Blue
                </span>
              </div>
              <h4 className="text-sm font-bold text-white truncate max-w-[120px]">{host1.name}</h4>
              <span className="text-xs text-[#06B6D4] font-mono font-bold mt-1">
                {score1.toLocaleString()} pts
              </span>
              <button
                onClick={handleBoostTeam1}
                className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-[#06B6D4] to-[#3B82F6] text-white text-xs font-bold shadow active:scale-95 transition-all flex items-center justify-center gap-1"
              >
                <span>Boost Team</span>
                <Flame className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Host 2 (Right / Red Team) */}
            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/30 shadow-lg">
              <div className="relative mb-2">
                <img
                  src={opponent.avatar}
                  alt={opponent.name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-[#EF4444] shadow-xl"
                />
                <span className="absolute -bottom-1 -right-1 bg-[#EF4444] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow">
                  Team Red
                </span>
              </div>
              <h4 className="text-sm font-bold text-white truncate max-w-[120px]">{opponent.name}</h4>
              <span className="text-xs text-[#EF4444] font-mono font-bold mt-1">
                {score2.toLocaleString()} pts
              </span>
              <button
                onClick={() => onOpenGiftShop(opponent)}
                className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-[#EF4444] to-[#F59E0B] text-white text-xs font-bold shadow active:scale-95 transition-all flex items-center justify-center gap-1"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Send Gift</span>
              </button>
            </div>
          </div>

          {/* PK Battle Tug-of-War Score Bar */}
          <div className="mt-6 space-y-1.5">
            <div className="flex justify-between text-xs font-extrabold font-mono">
              <span className="text-[#06B6D4]">{percent1}%</span>
              <span className="text-white/70">BATTLE PROGRESS</span>
              <span className="text-[#EF4444]">{percent2}%</span>
            </div>
            
            <div className="w-full h-4 rounded-full bg-[#160C25] border border-white/10 overflow-hidden flex p-0.5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-[#06B6D4] to-[#3B82F6] rounded-l-full transition-all duration-500 ease-out shadow-[0_0_10px_#06B6D4]"
                style={{ width: `${percent1}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-[#F59E0B] to-[#EF4444] rounded-r-full transition-all duration-500 ease-out shadow-[0_0_10px_#EF4444]"
                style={{ width: `${percent2}%` }}
              />
            </div>
          </div>

          {/* Winner Announcement if finished */}
          {battleFinished && (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] text-center shadow-2xl animate-bounce">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Trophy className="w-5 h-5 fill-current" />
                <h4 className="text-base font-black">
                  {score1 > score2 ? `${host1.name} Wins!` : `${opponent.name} Wins!`}
                </h4>
              </div>
              <p className="text-xs font-semibold">
                Celebration bonus unlocked! Thanks to all gifters and supporters!
              </p>
            </div>
          )}
        </div>

        {/* Live Top Contributors Strip */}
        <div className="p-4 bg-[#211333] border-t border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FFC84A]" />
            <span className="text-xs font-bold text-white">Top Battle MVP:</span>
            <span className="text-xs text-[#FFC84A] font-bold">KingRaja (+8,200)</span>
          </div>
          <button
            onClick={() => onOpenGiftShop(host1)}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-bold shadow hover:opacity-95 transition-all"
          >
            Gift Host
          </button>
        </div>
      </div>
    </div>
  );
};
