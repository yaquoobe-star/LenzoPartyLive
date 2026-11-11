import React, { useState } from 'react';
import { ArrowLeft, User, Mail, Lock, Eye, EyeOff, Camera, Sparkles, Check } from 'lucide-react';

interface SignUpScreenProps {
  onSuccess: () => void;
  onNavigateToLogin: () => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({
  onSuccess,
  onNavigateToLogin,
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sampleAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80',
  ];

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please choose a username');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword && confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSuccess();
    }, 700);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center p-4 sm:p-6 bg-[#080413] text-white select-none overflow-y-auto no-scrollbar animate-fade-in">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 right-1/4 w-[450px] h-[450px] rounded-full bg-gradient-to-b from-[#8B20FF]/25 via-[#F328D5]/20 to-transparent blur-[120px]" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-sm flex items-center justify-between pt-safe pt-2">
        <button
          onClick={onNavigateToLogin}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-sm font-bold text-white/80">Step 1 of 1</div>
        <div className="w-10" />
      </header>

      {/* Form Container matching Screen 03 in Showcase */}
      <main className="relative z-10 w-full max-w-sm flex flex-col items-center my-auto py-4">
        <h1 className="text-2xl font-black text-white font-display tracking-tight text-center mb-1">
          Create Account
        </h1>
        <p className="text-xs text-[#B9AECF] text-center mb-5">
          Join Lonzo Party Live
        </p>

        {error && (
          <div className="w-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs py-2 px-3.5 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        {/* Profile Avatar Selection */}
        <div className="flex flex-col items-center mb-5">
          <div className="relative w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-[#8B20FF] via-[#F328D5] to-[#FFC84A] shadow-xl">
            <img
              src={selectedAvatar}
              alt="Profile"
              className="w-full h-full rounded-full object-cover ring-2 ring-[#080413]"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#8B20FF] text-white flex items-center justify-center shadow">
              <Camera className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-[11px] text-[#B9AECF] mt-2 font-medium">Select Avatar:</span>
          <div className="flex items-center gap-2 mt-1.5">
            {sampleAvatars.map((av, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedAvatar(av)}
                className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all ${
                  selectedAvatar === av ? 'border-[#F328D5] scale-110 shadow-md' : 'border-white/20 opacity-70'
                }`}
              >
                <img src={av} alt="avatar" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Input Fields */}
        <form onSubmit={handleSignUp} className="w-full space-y-3">
          {/* Username */}
          <div className="relative flex items-center bg-[#160C25] border border-white/15 focus-within:border-[#F328D5] rounded-2xl px-4 py-3 transition-colors shadow">
            <User className="w-4 h-4 text-[#B9AECF] mr-3 shrink-0" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-white/40 outline-none"
            />
          </div>

          {/* Email Address */}
          <div className="relative flex items-center bg-[#160C25] border border-white/15 focus-within:border-[#F328D5] rounded-2xl px-4 py-3 transition-colors shadow">
            <Mail className="w-4 h-4 text-[#B9AECF] mr-3 shrink-0" />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-white/40 outline-none"
            />
          </div>

          {/* Password */}
          <div className="relative flex items-center bg-[#160C25] border border-white/15 focus-within:border-[#F328D5] rounded-2xl px-4 py-3 transition-colors shadow">
            <Lock className="w-4 h-4 text-[#B9AECF] mr-3 shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-white/40 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[#B9AECF] hover:text-white ml-2"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Sign Up Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#c415f5] text-white font-extrabold text-xs shadow-lg shadow-[#F328D5]/35 hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
            <Sparkles className="w-4 h-4" />
          </button>
        </form>

        {/* Social auth separator */}
        <div className="w-full flex items-center my-4 text-xs text-[#B9AECF]/60">
          <div className="flex-1 h-px bg-white/10" />
          <span className="px-3">or continue with</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Social Buttons */}
        <div className="flex items-center gap-3 w-full justify-center">
          <button
            type="button"
            onClick={onSuccess}
            className="w-12 h-12 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/15 flex items-center justify-center text-white shadow active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
          </button>
          <button
            type="button"
            onClick={onSuccess}
            className="w-12 h-12 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/15 flex items-center justify-center text-white text-lg shadow active:scale-95 transition-all"
          >
            
          </button>
        </div>
      </main>

      {/* Footer link to Login */}
      <footer className="relative z-10 py-3 text-center text-xs text-[#B9AECF] pb-safe">
        <span>Already have an account? </span>
        <button
          onClick={onNavigateToLogin}
          className="font-bold text-[#F328D5] hover:underline ml-1"
        >
          Login
        </button>
      </footer>
    </div>
  );
};
