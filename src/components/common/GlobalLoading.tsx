import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

// 1. Startup / Fullscreen Branded Loading Screen
export const BrandLoadingScreen: React.FC<{
  progress?: number;
  message?: string;
  onSkip?: () => void;
}> = ({ progress = 65, message = 'Loading...', onSkip }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 sm:p-10 bg-[#070214] select-none overflow-hidden animate-fade-in">
      {/* Ambient Royal Violet / Magenta / Cyan Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[460px] h-[460px] rounded-full bg-gradient-to-tr from-[#8B20FF]/35 via-[#F328D5]/25 to-[#38BDF8]/25 blur-[110px]" />
      </div>

      {/* Top Bar with Skip Intro */}
      <div className="w-full flex justify-end z-10">
        {onSkip && (
          <button
            onClick={onSkip}
            className="text-xs text-[#D4CBE8] hover:text-white bg-white/5 hover:bg-white/15 px-3.5 py-1.5 rounded-full border border-white/15 transition-colors backdrop-blur-md"
          >
            Skip Intro ›
          </button>
        )}
      </div>

      {/* Center Official Lenzo Party LIVE Brand Emblem */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
          <div className="absolute inset-2 rounded-[40px] bg-gradient-to-tr from-[#F328D5]/35 via-[#8B20FF]/35 to-[#38BDF8]/35 blur-2xl animate-pulse" />
          <img
            src="/app-icon.png?v=3"
            alt="Lenzo Party LIVE"
            draggable={false}
            className="relative z-10 w-full h-full object-contain drop-shadow-[0_16px_40px_rgba(168,85,247,0.55)]"
          />
        </div>
      </div>

      {/* Bottom Progress Bar & Spinner */}
      <div className="w-full max-w-xs flex flex-col items-center gap-3 z-10 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-full border-2 border-white/15 border-t-[#F328D5] border-r-[#38BDF8] animate-spin" />
          <span className="text-xs font-semibold text-[#D6CCE9] tracking-wider">
            {message}
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#150A2E] rounded-full overflow-hidden border border-white/15 p-[1px] relative shadow-lg">
          <div
            className="h-full bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#38BDF8] rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_#F328D5]"
            style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// 2. Stream & Room Connecting Overlay (Prevents blank screens while joining broadcast)
export const StreamConnectingOverlay: React.FC<{
  title?: string;
  hostName?: string;
  onRetry?: () => void;
  isError?: boolean;
}> = ({ title = 'Connecting to Stream...', hostName, onRetry, isError = false }) => {
  return (
    <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
      <div className="relative mb-4">
        {isError ? (
          <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
        ) : (
          <div className="relative w-16 h-16">
            <div className="w-full h-full rounded-full border-3 border-white/10 border-t-[#8B20FF] border-r-[#F328D5] animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-white/5 border-b-[#FFC84A] animate-spin-reverse" />
          </div>
        )}
      </div>

      <h4 className="text-base font-bold text-white mb-1">
        {isError ? 'Stream Connection Failed' : title}
      </h4>
      {hostName && !isError && (
        <p className="text-xs text-[#B9AECF] mb-4">
          Joining <span className="text-[#FFC84A] font-semibold">{hostName}</span>'s live room...
        </p>
      )}

      {isError && (
        <div className="space-y-3 mt-2">
          <p className="text-xs text-[#B9AECF] max-w-xs">
            Unable to establish secure live stream connection. Check your network or retry.
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-5 py-2 rounded-full bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white font-bold text-xs flex items-center gap-2 mx-auto active:scale-95 transition-all shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// 3. Video Buffering Overlay (Short video feed spinner)
export const VideoBufferingIndicator: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
      <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-transparent border-t-[#F328D5] border-r-[#8B20FF] animate-spin" />
      </div>
    </div>
  );
};

// 4. Skeleton Card Loader for Discover feeds & Profiles
export const SkeletonCard: React.FC<{ type?: 'stream' | 'video' | 'profile' | 'horizontal' }> = ({
  type = 'stream',
}) => {
  if (type === 'stream') {
    return (
      <div className="aspect-[3/4] rounded-2xl bg-[#160C25] border border-white/5 p-3 flex flex-col justify-between animate-pulse">
        <div className="flex justify-between items-center">
          <div className="w-12 h-4 rounded-full bg-white/10" />
          <div className="w-8 h-4 rounded-full bg-white/10" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/15" />
            <div className="w-20 h-3 rounded bg-white/15" />
          </div>
          <div className="w-32 h-2.5 rounded bg-white/10" />
        </div>
      </div>
    );
  }

  if (type === 'horizontal') {
    return (
      <div className="w-40 sm:w-48 shrink-0 aspect-[3/4] rounded-2xl bg-[#160C25] border border-white/5 p-3 flex flex-col justify-between animate-pulse">
        <div className="w-12 h-4 rounded-full bg-white/10" />
        <div className="space-y-2">
          <div className="w-20 h-3 rounded bg-white/15" />
          <div className="w-28 h-6 rounded-full bg-white/10" />
        </div>
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className="aspect-[9/16] rounded-2xl bg-[#160C25] border border-white/5 animate-pulse relative overflow-hidden">
        <div className="absolute bottom-4 left-3 right-3 space-y-2">
          <div className="w-24 h-3 rounded bg-white/15" />
          <div className="w-36 h-2 rounded bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-3xl bg-[#160C25] border border-white/5 animate-pulse flex items-center gap-3">
      <div className="w-14 h-14 rounded-full bg-white/15 shrink-0" />
      <div className="space-y-2 flex-1">
        <div className="w-24 h-3.5 rounded bg-white/15" />
        <div className="w-16 h-2.5 rounded bg-white/10" />
      </div>
    </div>
  );
};
