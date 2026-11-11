import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  X, 
  Check, 
  Clock, 
  Flame, 
  ShieldAlert, 
  Users 
} from 'lucide-react';
import { PKMatchInvitation, UserProfile } from '../../types';
import { AvatarWithFrame } from '../common/AvatarWithFrame';
import { LevelBadge } from '../common/LevelBadge';

interface PKIncomingChallengeModalProps {
  invitation: PKMatchInvitation | null;
  onAccept: (invitation: PKMatchInvitation) => void;
  onDecline: (invitation: PKMatchInvitation) => void;
}

export const PKIncomingChallengeModal: React.FC<PKIncomingChallengeModalProps> = ({
  invitation,
  onAccept,
  onDecline,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    if (!invitation) return;

    // Authoritative calculation of remaining seconds
    const calcRemaining = () => {
      const ms = Math.max(0, invitation.expiresAt - Date.now());
      return Math.ceil(ms / 1000);
    };

    setSecondsLeft(calcRemaining());

    const interval = setInterval(() => {
      const remaining = calcRemaining();
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onDecline(invitation);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [invitation, onDecline]);

  if (!invitation) return null;

  const percent = Math.max(0, Math.min(100, (secondsLeft / 30) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="w-full max-w-md bg-[#160C25] border-2 border-[#EF4444] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.35)] relative flex flex-col animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Warning / Challenge Banner */}
        <div className="bg-gradient-to-r from-[#EF4444] via-[#F59E0B] to-[#EF4444] p-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 animate-bounce" />
            <span className="text-xs font-black uppercase tracking-wider">
              PK Battle Challenge Received!
            </span>
          </div>

          <div className="flex items-center gap-1 font-mono text-xs font-black bg-black/30 px-2 py-0.5 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            <span>{secondsLeft}s</span>
          </div>
        </div>

        {/* Circular Countdown Progress Bar */}
        <div className="w-full h-1.5 bg-black/40">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-red-500 transition-all duration-1000 ease-linear"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Challenger Card */}
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <AvatarWithFrame
              avatar={invitation.fromHost.avatar}
              name={invitation.fromHost.name}
              level={invitation.fromHost.level || 50}
              size="xl"
            />
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow">
              Challenger
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <h3 className="text-lg font-black text-white">
                {invitation.fromHost.name}
              </h3>
              <LevelBadge level={invitation.fromHost.level || 50} size="sm" />
            </div>

            <p className="text-xs text-[#B9AECF]">
              {invitation.fromHost.username || `@${invitation.fromHost.name.toLowerCase().replace(/\s+/g, '')}`} • ID: {invitation.fromHost.displayId || 'Live Host'}
            </p>
          </div>

          {/* Invitation Note */}
          <div className="w-full p-3 rounded-2xl bg-[#211333] border border-white/10 text-xs text-white/90 italic">
            "{invitation.note || 'Challenged you to a 5-Minute PK Live Battle!'}"
          </div>

          {/* Battle Details Pill */}
          <div className="grid grid-cols-2 gap-2 w-full text-xs">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col items-center">
              <span className="text-[10px] text-[#B9AECF]">Match Duration</span>
              <span className="font-bold text-white font-mono text-sm">05:00</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col items-center">
              <span className="text-[10px] text-[#B9AECF]">Scoring Mode</span>
              <span className="font-bold text-[#FFC84A] font-mono text-sm">1 Coin = 1 Pt</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-[#090611] border-t border-white/[0.08] grid grid-cols-2 gap-3">
          <button
            onClick={() => onDecline(invitation)}
            className="py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <X className="w-4 h-4" />
            <span>Decline</span>
          </button>

          <button
            onClick={() => onAccept(invitation)}
            className="py-3 rounded-2xl bg-gradient-to-r from-[#10B981] via-[#059669] to-[#047857] hover:opacity-95 text-white text-xs font-black shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Swords className="w-4 h-4" />
            <span>Accept Battle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
