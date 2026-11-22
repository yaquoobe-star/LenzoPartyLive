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
    <div className="relative min-h-dvh-screen w-full flex flex-col items-center justify-between px-6 sm:px-10 safe-pt-4 safe-pb-6 bg-[#06071C] overflow-hidden select-none">
      {/* Official Full-Bleed Lenzo Party Live Splash Artwork */}
      <div className="absolute inset-0 flex items-center justify-center bg-[#06071C] pointer-events-none">
        <div className="relative w-full h-full sm:w-auto sm:max-w-[560px] flex items-center justify-center">
          <img
            src="/splash.png?v=2"
            alt="Lenzo Party Live"
            draggable={false}
            className="w-full h-full object-cover sm:object-contain animate-fade-in"
          />
          <div className="hidden sm:block absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#06071C] to-transparent" />
          <div className="hidden sm:block absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#06071C] to-transparent" />
        </div>
        {/* Subtle bottom vignette so loading bar remains crisp and readable */}
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#06071C]/95 via-[#06071C]/50 to-transparent" />
      </div>

      {/* Top Skip Intro Action */}
      <div className="w-full flex justify-end z-10">
        <button
          type="button"
          onClick={onComplete}
          className="text-xs text-[#D4CBE8] hover:text-white bg-black/35 hover:bg-black/55 px-4 py-1.5 rounded-full border border-white/15 transition-colors backdrop-blur-md active:scale-95"
        >
          Skip Intro ›
        </button>
      </div>

      {/* Bottom Loading Progress Indicator */}
      <div className="w-full max-w-xs flex flex-col items-center gap-2.5 z-10 pb-6 mt-auto">
        <span className="text-xs font-semibold text-[#D6CCE9] tracking-wider drop-shadow">
          {statusText}
        </span>
        <div className="w-full h-1.5 bg-[#120F2E]/90 rounded-full overflow-hidden border border-white/15 p-[1px] relative shadow-lg backdrop-blur-sm">
          <div
            className="h-full bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#F5C557] rounded-full transition-all duration-300 ease-out shadow-[0_0_14px_#F328D5]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
