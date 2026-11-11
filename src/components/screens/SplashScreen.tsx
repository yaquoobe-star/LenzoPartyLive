import React, { useEffect, useState } from 'react';
import { LonzoLogo } from '../common/LonzoLogo';
import { auth } from '../../firebase';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('Connecting to Linzo Live...');

  useEffect(() => {
    // Dynamic status text
    const t1 = setTimeout(() => setStatusText('Verifying Firebase Session...'), 350);
    const t2 = setTimeout(() => setStatusText('Synchronizing Cloud Firestore...'), 700);

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
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between p-6 sm:p-10 bg-[#090611] overflow-hidden select-none">
      {/* Background silky glowing neon ribbon waves */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top ambient radial gradient */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-[#8B20FF]/30 via-[#F328D5]/25 to-transparent rounded-full blur-[130px] animate-pulse" />
        
        {/* Abstract neon swoosh lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-60"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="splashNeonSwoosh" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B20FF" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#F328D5" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#FFC84A" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <path
            d="M-100,600 C300,200 800,800 1600,300"
            stroke="url(#splashNeonSwoosh)"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M-50,700 C400,300 900,900 1700,400"
            stroke="url(#splashNeonSwoosh)"
            strokeWidth="1.5"
            strokeDasharray="8 6"
            fill="none"
          />
        </svg>
      </div>

      {/* Top spacer with Skip Intro button */}
      <div className="w-full flex justify-end z-10">
        <button
          type="button"
          onClick={onComplete}
          className="text-xs text-[#B9AECF] hover:text-white bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded-full border border-white/10 transition-colors backdrop-blur-md active:scale-95"
        >
          Skip Intro ›
        </button>
      </div>

      {/* Center Brand Identity with Crowned Play Icon */}
      <div className="flex flex-col items-center z-10 animate-fade-in my-auto text-center space-y-5">
        <LonzoLogo size="xl" showTagline={true} />

        {/* Circular spinning ring */}
        <div className="pt-2 flex flex-col items-center">
          <div className="relative w-10 h-10 mb-3">
            <div className="w-full h-full rounded-full border-2 border-white/15 border-t-[#F328D5] border-r-[#8B20FF] animate-spin" />
            <div className="absolute inset-0 rounded-full blur-[8px] bg-[#F328D5]/30 animate-pulse pointer-events-none" />
          </div>
          <span className="text-xs font-semibold text-[#B9AECF] tracking-wider animate-pulse">
            {statusText}
          </span>
        </div>
      </div>

      {/* Bottom Loading Progress Bar */}
      <div className="w-full max-w-xs flex flex-col items-center gap-3 z-10 pb-6">
        <div className="w-full h-1.5 bg-[#160C25] rounded-full overflow-hidden border border-white/10 p-[1px] relative shadow-lg">
          <div
            className="h-full bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] rounded-full transition-all duration-300 ease-out shadow-[0_0_14px_#F328D5]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#9E97AA] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>Firebase Auth Ready</span>
        </div>
      </div>
    </div>
  );
};
