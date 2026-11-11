import React, { useState } from 'react';
import { ArrowLeft, Smartphone, Mail, Lock, CheckCircle2, Shield } from 'lucide-react';
import { LonzoLogo } from '../common/LonzoLogo';

interface LoginScreenProps {
  onSuccess: () => void;
  onNavigateToSignUp: () => void;
  onBack?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSuccess,
  onNavigateToSignUp,
  onBack,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+92');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handlePhoneLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 7) {
      showToastMsg('Please enter a valid mobile number');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSuccess();
    }, 700);
  };

  const handleSocialAuth = (provider: string) => {
    setIsLoading(true);
    showToastMsg(`Logging in with ${provider}...`);
    setTimeout(() => {
      setIsLoading(false);
      onSuccess();
    }, 600);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center p-4 sm:p-6 bg-[#080413] text-white select-none overflow-hidden animate-fade-in">
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-gradient-to-b from-[#8B20FF]/25 via-[#F328D5]/20 to-transparent blur-[120px]" />
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-full h-80 bg-gradient-to-t from-[#8B20FF]/20 to-transparent blur-[90px]" />
      </div>

      {/* Toast Alert */}
      {toast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-[#8B20FF] text-white text-xs font-bold py-2 px-5 rounded-full shadow-lg shadow-[#8B20FF]/50 animate-fade-in pointer-events-none">
          {toast}
        </div>
      )}

      {/* Top Bar with optional Back */}
      <header className="relative z-10 w-full max-w-sm flex items-center justify-between pt-safe pt-2">
        {onBack ? (
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-10" />
        )}
        <button
          onClick={onSuccess}
          className="text-xs text-[#B9AECF] hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10 transition-all active:scale-95"
        >
          Explore as Guest ›
        </button>
      </header>

      {/* Center Branding & Action Card (Exact match to Screen 02 in Showcase) */}
      <main className="relative z-10 w-full max-w-sm flex flex-col items-center text-center my-auto py-4">
        {/* Logo and Crown */}
        <div className="mb-4">
          <LonzoLogo size="xl" showTagline={false} />
        </div>

        <h1 className="text-2xl font-black text-white font-display tracking-tight mb-1">
          Welcome Back!
        </h1>
        <p className="text-xs text-[#B9AECF] mb-6">
          Sign in to continue
        </p>

        {/* Buttons List */}
        <div className="w-full space-y-3">
          {/* Continue with Google */}
          <button
            onClick={() => handleSocialAuth('Google')}
            className="w-full py-3.5 px-4 rounded-2xl bg-white text-[#090611] font-bold text-xs flex items-center justify-center gap-3 shadow-lg hover:bg-gray-100 active:scale-98 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Continue with Apple */}
          <button
            onClick={() => handleSocialAuth('Apple')}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/20 text-white font-bold text-xs flex items-center justify-center gap-3 shadow-lg active:scale-98 transition-all"
          >
            <span className="text-base"></span>
            <span>Continue with Apple</span>
          </button>

          {/* Phone Number Login */}
          {showPhoneInput ? (
            <form onSubmit={handlePhoneLogin} className="space-y-2 pt-1 animate-fade-in">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-16 bg-[#160C25] border border-white/15 rounded-xl px-2 py-3 text-xs text-center text-white outline-none"
                />
                <input
                  type="tel"
                  placeholder="Enter Mobile Number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 bg-[#160C25] border border-white/15 focus:border-[#F328D5] rounded-xl px-3 py-3 text-xs text-white placeholder-white/40 outline-none"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white font-extrabold text-xs shadow-lg shadow-[#F328D5]/30 active:scale-98 transition-all"
              >
                {isLoading ? 'Verifying...' : 'Sign In with Mobile'}
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowPhoneInput(true)}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#8B20FF]/30 active:scale-98 transition-all"
            >
              <Smartphone className="w-4 h-4" />
              <span>Phone Number</span>
            </button>
          )}
        </div>

        {/* Terms and Privacy policy disclaimer */}
        <p className="text-[10px] text-[#B9AECF]/70 max-w-xs mt-6 leading-relaxed">
          By continuing, you agree to our{' '}
          <span className="text-white underline cursor-pointer">Terms</span> &{' '}
          <span className="text-white underline cursor-pointer">Privacy Policy</span>
        </p>
      </main>

      {/* Bottom Switcher: "Don't have an account? Sign Up" */}
      <footer className="relative z-10 py-3 text-center text-xs text-[#B9AECF] pb-safe">
        <span>Don't have an account? </span>
        <button
          onClick={onNavigateToSignUp}
          className="font-bold text-[#F328D5] hover:underline ml-1"
        >
          Sign Up
        </button>
      </footer>
    </div>
  );
};
