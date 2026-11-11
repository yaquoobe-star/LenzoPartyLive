import React from 'react';
import { X, Video, Users } from 'lucide-react';

interface CreateActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCreateLive: () => void;
  onSelectCreateRoom: () => void;
  onSelectUploadVideo?: () => void;
}

export const CreateActionSheet: React.FC<CreateActionSheetProps> = ({
  isOpen,
  onClose,
  onSelectCreateLive,
  onSelectCreateRoom,
  onSelectUploadVideo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="w-full max-w-md bg-[#160C25] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab bar */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto -mt-2 mb-4 sm:hidden" />

        {/* Crown & Header matching reference */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="text-2xl mb-1">👑</div>
          <div className="flex items-center justify-between w-full">
            <div className="w-8" />
            <h3 className="text-lg font-black text-white font-display">Create</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#B9AECF] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2 Core Action Cards: Go Live and Create Room */}
        <div className="space-y-3 mb-4">
          {/* A. Go Live */}
          <button
            onClick={() => {
              onClose();
              onSelectCreateLive();
            }}
            className="w-full p-4 rounded-2xl bg-[#211333] hover:bg-[#2c1745] border border-white/[0.08] hover:border-[#F328D5]/50 flex items-center gap-4 transition-all group active:scale-98 shadow-md"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF2E93] to-[#FF007A] flex items-center justify-center text-white shadow-lg shadow-pink-500/25 shrink-0 group-hover:scale-105 transition-transform">
              <Video className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-white group-hover:text-[#F328D5] transition-colors">
                Go Live
              </span>
              <span className="text-[11px] text-[#B9AECF]">
                Start your live stream and connect with fans
              </span>
            </div>
          </button>

          {/* B. Create Room */}
          <button
            onClick={() => {
              onClose();
              onSelectCreateRoom();
            }}
            className="w-full p-4 rounded-2xl bg-[#211333] hover:bg-[#2c1745] border border-white/[0.08] hover:border-[#8B20FF]/50 flex items-center gap-4 transition-all group active:scale-98 shadow-md"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8B20FF] to-[#6366F1] flex items-center justify-center text-white shadow-lg shadow-purple-500/25 shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-white group-hover:text-[#8B20FF] transition-colors">
                Create Room
              </span>
              <span className="text-[11px] text-[#B9AECF]">
                Host a social party voice room with 8 or 16 seats
              </span>
            </div>
          </button>

          {/* C. Upload Video (Matching Reference Screen #3) */}
          {onSelectUploadVideo && (
            <button
              onClick={() => {
                onClose();
                onSelectUploadVideo();
              }}
              className="w-full p-4 rounded-2xl bg-[#211333] hover:bg-[#2c1745] border border-white/[0.08] hover:border-emerald-500/50 flex items-center gap-4 transition-all group active:scale-98 shadow-md"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-transform">
                <Video className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Upload Video
                </span>
                <span className="text-[11px] text-[#B9AECF]">
                  Share your amazing videos and reels with the world
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Decorative Gift Box matching reference showcase */}
        <div className="relative pt-2 pb-1 flex justify-center">
          <div className="text-4xl animate-bounce">🎁</div>
        </div>
      </div>
    </div>
  );
};
