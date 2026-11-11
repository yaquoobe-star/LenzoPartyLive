import React, { useState, useEffect } from 'react';
import { 
  X, 
  Swords, 
  Users, 
  Flame, 
  Sparkles, 
  Search, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { UserProfile, PKMatchInvitation } from '../../types';
import { pkService } from '../../utils/pkService';
import { AvatarWithFrame } from '../common/AvatarWithFrame';
import { LevelBadge } from '../common/LevelBadge';

interface PKHostInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  activeHost: UserProfile;
  onInviteSent?: (invitation: PKMatchInvitation) => void;
  onMatchStarted?: (session: any) => void;
}

export const PKHostInviteModal: React.FC<PKHostInviteModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeHost,
  onInviteSent,
  onMatchStarted,
}) => {
  const [hosts, setHosts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeInvite, setActiveInvite] = useState<PKMatchInvitation | null>(null);
  const [inviteSecondsLeft, setInviteSecondsLeft] = useState(30);
  const [customNote, setCustomNote] = useState('Challenged you to a 5-Minute PK Live Battle!');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAutoAcceptTestMode, setIsAutoAcceptTestMode] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setActiveInvite(null);
      setErrorMessage(null);
      return;
    }

    setIsLoading(true);
    pkService.fetchEligibleHosts().then((data) => {
      // Filter out self
      const filtered = data.filter((h) => h.id !== activeHost.id);
      setHosts(filtered);
      setIsLoading(false);
    });

    // Listen to PK WebSocket events
    const unsubscribe = pkService.addEventListener((event, payload) => {
      if (event === 'pk:match_started' && payload?.session) {
        setActiveInvite(null);
        onClose();
        onMatchStarted?.(payload.session);
      } else if (event === 'pk:invite_rejected') {
        setErrorMessage('Host declined your PK challenge.');
        setActiveInvite(null);
      } else if (event === 'pk:invite_expired') {
        setErrorMessage('Invitation timed out without response.');
        setActiveInvite(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, activeHost.id]);

  // Invitation 30s countdown timer
  useEffect(() => {
    if (!activeInvite) return;
    setInviteSecondsLeft(30);

    const interval = setInterval(() => {
      setInviteSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setActiveInvite(null);
          setErrorMessage('Invitation expired.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeInvite]);

  if (!isOpen) return null;

  const handleSendChallenge = async (targetHost: any) => {
    try {
      setErrorMessage(null);
      setIsLoading(true);
      const res = await pkService.sendPKInvite(activeHost, targetHost, customNote, isAutoAcceptTestMode);

      if (res.session) {
        // Immediate match launch via Auto-Accept Test Mode!
        setActiveInvite(null);
        onClose();
        onMatchStarted?.(res.session);
        return;
      }

      setActiveInvite(res.invitation);
      onInviteSent?.(res.invitation);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send challenge');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelInvite = async () => {
    if (!activeInvite) return;
    try {
      await pkService.cancelPKInvite(activeInvite.id, activeHost.id);
      setActiveInvite(null);
      setErrorMessage('Challenge cancelled.');
    } catch (err) {
      setActiveInvite(null);
    }
  };

  const filteredHosts = hosts.filter((h) =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="w-full max-w-lg bg-[#160C25] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
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
                Challenge Live Host
                <span className="text-[10px] bg-red-500/20 text-red-400 font-mono px-2 py-0.5 rounded-full border border-red-500/30">
                  5 Min Battle
                </span>
              </h3>
              <p className="text-[11px] text-[#B9AECF]">
                Pick an active live host to start a real-time PK Match
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error / Feedback Message */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Outgoing Pending Invitation Radar Banner */}
        {activeInvite ? (
          <div className="p-6 flex flex-col items-center text-center space-y-4 bg-gradient-to-b from-[#211333] to-[#160C25]">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-[#EF4444]/20 flex items-center justify-center animate-ping absolute inset-0" />
              <img
                src={activeInvite.toHost.avatar}
                alt={activeInvite.toHost.name}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-[#EF4444] shadow-2xl relative z-10"
              />
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider">
                Waiting
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-bold text-white">
                Challenging {activeInvite.toHost.name}
              </h4>
              <p className="text-xs text-[#B9AECF]">
                Waiting for host to accept your challenge...
              </p>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#211333] border border-white/10 text-white font-mono text-sm">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              <span>Expires in {inviteSecondsLeft}s</span>
            </div>

            <div className="w-full space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={async () => {
                    try {
                      const res = await pkService.respondPKInvite(activeInvite.id, true, activeInvite.toHost.id);
                      if (res.session) {
                        setActiveInvite(null);
                        onClose();
                        onMatchStarted?.(res.session);
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold transition-all shadow"
                >
                  Host Accepts ✓
                </button>
                <button
                  onClick={async () => {
                    try {
                      await pkService.respondPKInvite(activeInvite.id, false, activeInvite.toHost.id);
                      setActiveInvite(null);
                      setErrorMessage(`${activeInvite.toHost.name} declined your PK challenge.`);
                    } catch (e) {
                      setActiveInvite(null);
                    }
                  }}
                  className="py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 text-xs font-bold transition-all"
                >
                  Host Declines ✕
                </button>
              </div>

              <button
                onClick={handleCancelInvite}
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10"
              >
                Cancel Challenge
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 flex-1 flex flex-col overflow-hidden">
            {/* Auto-Accept Test Mode Switch */}
            <div className="mb-3.5 p-3 rounded-2xl bg-gradient-to-r from-[#211333] via-[#2c1344] to-[#211333] border border-[#FFC84A]/30 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                  isAutoAcceptTestMode ? 'bg-[#FFC84A] text-[#090611] shadow-lg shadow-[#FFC84A]/40' : 'bg-white/10 text-white/60'
                }`}>
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Auto-Accept Test Mode</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                      isAutoAcceptTestMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-white/10 text-white/50'
                    }`}>
                      {isAutoAcceptTestMode ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#B9AECF]">
                    {isAutoAcceptTestMode 
                      ? 'Instant match start on challenge (single device testing)' 
                      : 'Standard 30s challenge waiting radar'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAutoAcceptTestMode(!isAutoAcceptTestMode)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
                  isAutoAcceptTestMode ? 'bg-gradient-to-r from-[#FFC84A] to-[#F59E0B]' : 'bg-white/20'
                }`}
                title="Toggle Auto-Accept Test Mode"
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  isAutoAcceptTestMode ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-[#B9AECF] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search live hosts by name or @username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#211333] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#B9AECF]/60 focus:outline-none focus:border-[#F328D5] transition-colors"
              />
            </div>

            {/* Custom Battle Pitch/Note Input */}
            <div className="mb-3">
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Add challenge message..."
                maxLength={60}
                className="w-full bg-[#090611] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[11px] text-white/90 placeholder-white/40 focus:outline-none focus:border-[#8B20FF]"
              />
            </div>

            {/* Host List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-8 h-8 border-2 border-[#F328D5] border-t-transparent rounded-full animate-spin mb-2" />
                  <span className="text-xs text-[#B9AECF]">Finding active live hosts...</span>
                </div>
              ) : filteredHosts.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#B9AECF]">
                  No active live hosts found matching "{searchQuery}"
                </div>
              ) : (
                filteredHosts.map((host) => (
                  <div
                    key={host.id}
                    className="p-3 rounded-2xl bg-[#211333] border border-white/[0.06] hover:border-[#EF4444]/40 flex items-center justify-between gap-3 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <AvatarWithFrame
                          avatar={host.avatar}
                          name={host.name}
                          level={host.level}
                          size="md"
                        />
                        <span className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-red-500 border-2 border-[#160C25] animate-pulse" />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white truncate">
                            {host.name}
                          </span>
                          <LevelBadge level={host.level} size="sm" />
                        </div>
                        <span className="text-[11px] text-[#B9AECF] truncate">
                          {host.username} • 👤 {host.viewerCount}
                        </span>
                        <span className="text-[10px] text-amber-400 font-medium truncate mt-0.5">
                          {host.category}
                        </span>
                      </div>
                    </div>

                    <button
                      disabled={host.isBusy}
                      onClick={() => handleSendChallenge(host)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all active:scale-95 ${
                        host.isBusy
                          ? 'bg-white/10 text-[#B9AECF] cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#EF4444] to-[#F59E0B] text-white shadow-md shadow-red-500/20 hover:opacity-95'
                      }`}
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>{host.isBusy ? 'In Battle' : 'Challenge'}</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 bg-[#090611] border-t border-white/[0.08] flex items-center justify-between text-[11px] text-[#B9AECF]">
          <span className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Standard Battle Duration: <strong>05:00</strong>
          </span>
          <span className="text-[#06B6D4]">
            1 Coin = 1 PK Point
          </span>
        </div>
      </div>
    </div>
  );
};
