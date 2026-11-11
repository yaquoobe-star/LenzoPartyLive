import React from 'react';
import { X, Video, Users, Sparkles, ChevronRight, Radio } from 'lucide-react';

interface MicSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGoLive: () => void;
  onSelectCreateRoom: () => void;
}

export const MicSelectionModal: React.FC<MicSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectGoLive,
  onSelectCreateRoom,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-[#140D20] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab bar */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto -mt-2 mb-4 sm:hidden" />

        {/* Header: Title & Close */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FA26A0]/20 flex items-center justify-center text-white text-base">
              🎙️
            </div>
            <div>
              <h3 className="text-base font-black text-white font-display leading-tight">
                Broadcast & Rooms
              </h3>
              <p className="text-[11px] text-[#9E97AA]">Select your broadcasting mode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* EXACTLY TWO OPTIONS: 1. GO LIVE, 2. CREATE ROOM */}
        <div className="space-y-3 mb-2">
          {/* Option 1: GO LIVE */}
          <button
            onClick={() => {
              onClose();
              onSelectGoLive();
            }}
            className="w-full p-4 rounded-2xl bg-[#1A102B] hover:bg-[#23153A] border border-white/10 hover:border-[#FA26A0] flex items-center justify-between transition-all group active:scale-[0.98] shadow-lg"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF007A] to-[#FA26A0] flex items-center justify-center text-white shadow-lg shadow-pink-600/30 shrink-0 group-hover:scale-105 transition-transform">
                <Video className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white group-hover:text-[#FA26A0] transition-colors">
                    GO LIVE
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[9px] font-bold uppercase tracking-wider">
                    Broadcast
                  </span>
                </div>
                <span className="text-xs text-[#9E97AA] truncate mt-0.5">
                  Prepare live camera & mic stream, set title & start live
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#9E97AA] group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
          </button>

          {/* Option 2: CREATE ROOM */}
          <button
            onClick={() => {
              onClose();
              onSelectCreateRoom();
            }}
            className="w-full p-4 rounded-2xl bg-[#1A102B] hover:bg-[#23153A] border border-white/10 hover:border-[#8B20FF] flex items-center justify-between transition-all group active:scale-[0.98] shadow-lg"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8B20FF] to-[#6366F1] flex items-center justify-center text-white shadow-lg shadow-purple-600/30 shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white group-hover:text-[#8B20FF] transition-colors">
                    CREATE ROOM
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[9px] font-bold uppercase tracking-wider">
                    Voice Party
                  </span>
                </div>
                <span className="text-xs text-[#9E97AA] truncate mt-0.5">
                  Host an 8-Seat or 16-Seat voice party room with friends
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#9E97AA] group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
          </button>
        </div>

        {/* Footer info note */}
        <div className="mt-4 pt-3 border-t border-white/[0.06] text-center">
          <p className="text-[11px] text-[#6E677A]">
            Tapping Go Live or Create Room lets you prepare and preview before publishing
          </p>
        </div>
      </div>
    </div>
  );
};
