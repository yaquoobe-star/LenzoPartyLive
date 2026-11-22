import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('Connecting to Lenzo Party Live...');

  useEffect(() => {
    const t1 = setTimeout(() => setStatusText('Verifying Session...'), 350);
    const t2 = setTimeout(() => setStatusText('Loading Live Rooms & Parties...'), 700);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 350);
          return 100;
        }
        return prev + 18;
      });
    }, 220);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(timer);
    };
  }, [onComplete]);

  return (
    <div className="relative min-h-dvh-screen w-full flex flex-col items-center justify-between px-6 sm:px-10 safe-pt-4 safe-pb-6 bg-[#070214] overflow-hidden select-none">
      {/* Ambient Royal Violet / Magenta / Cyan Glow Matching Native Android Splash */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[460px] h-[460px] sm:w-[560px] sm:h-[560px] rounded-full bg-gradient-to-tr from-[#8B20FF]/35 via-[#F328D5]/25 to-[#38BDF8]/25 blur-[110px] animate-pulse" />
      </div>

      {/* Top Skip Intro Action */}
      <div className="w-full flex justify-end z-10">
        <button
          type="button"
          onClick={onComplete}
          className="text-xs text-[#D4CBE8] hover:text-white bg-white/5 hover:bg-white/15 px-4 py-1.5 rounded-full border border-white/15 transition-colors backdrop-blur-md active:scale-95"
        >
          Skip Intro ›
        </button>
      </div>

      {/* Center Official Lenzo Party LIVE Brand Emblem */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto animate-fade-in">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          <div className="absolute inset-2 rounded-[44px] bg-gradient-to-tr from-[#F328D5]/40 via-[#8B20FF]/40 to-[#38BDF8]/40 blur-2xl animate-pulse" />
          <img
            src="/app-icon.png?v=3"
            alt="Lenzo Party LIVE"
            draggable={false}
            className="relative z-10 w-full h-full object-contain drop-shadow-[0_18px_45px_rgba(168,85,247,0.55)]"
          />
        </div>
        <div className="mt-5 text-[#D4CBE8]/90 text-[11px] sm:text-xs font-semibold tracking-[0.25em] uppercase flex items-center gap-2">
          <span>Chat</span>
          <span className="text-[#F328D5]">•</span>
          <span>Live</span>
          <span className="text-[#38BDF8]">•</span>
          <span>Party</span>
          <span className="text-[#FFC84A]">•</span>
          <span>Connect</span>
        </div>
      </div>

      {/* Bottom Loading Progress Indicator */}
      <div className="w-full max-w-xs flex flex-col items-center gap-2.5 z-10 pb-6">
        <span className="text-xs font-semibold text-[#D6CCE9] tracking-wider drop-shadow">
          {statusText}
        </span>
        <div className="w-full h-1.5 bg-[#150A2E] rounded-full overflow-hidden border border-white/15 p-[1px] relative shadow-lg">
          <div
            className="h-full bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#38BDF8] rounded-full transition-all duration-300 ease-out shadow-[0_0_14px_#F328D5]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
