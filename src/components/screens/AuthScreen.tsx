import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User as UserIcon, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  X, 
  RefreshCw, 
  Camera, 
  ShieldCheck,
  Check,
  Radio,
  Flame,
  Users
} from 'lucide-react';
import { LonzoLogo } from '../common/LonzoLogo';
import { 
  signInWithGoogle, 
  checkRedirectAuthResult,
  registerWithEmail, 
  loginWithEmail, 
  resetPassword, 
  resendVerification,
  DEFAULT_AVATARS 
} from '../../services/authService';
import { UserProfile } from '../../types';

export type AuthSubScreen = 'welcome' | 'login' | 'signup' | 'forgot_password' | 'verification';

interface AuthScreenProps {
  onSuccess: (profile: UserProfile) => void;
  onSkip?: () => void;
  initialSubScreen?: AuthSubScreen;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ 
  onSuccess, 
  onSkip, 
  initialSubScreen = 'welcome' 
}) => {
  // Navigation between authentication sub-screens
  const [subScreen, setSubScreen] = useState<AuthSubScreen>(initialSubScreen);

  // Form Fields State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(DEFAULT_AVATARS[0]);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Terms and Privacy modals
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Registered user email state for verification screen
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);

  // Clear messages when switching views
  const navigateTo = (screen: AuthSubScreen) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubScreen(screen);
  };

  // Check for Google redirect result on component mount (for mobile/custom domain redirect flows)
  useEffect(() => {
    let active = true;
    checkRedirectAuthResult().then((profile) => {
      if (active && profile) {
        setSuccessMessage(`Welcome to Linzo Party Live, ${profile.name}! ✨`);
        setTimeout(() => {
          onSuccess(profile);
        }, 500);
      }
    });
    return () => {
      active = false;
    };
  }, [onSuccess]);

  // 1. REAL GOOGLE AUTHENTICATION FLOW
  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      const authResult = await signInWithGoogle();
      if (!authResult) {
        // Full page redirect was initiated (e.g., popup blocked or mobile browser)
        return;
      }
      const { profile } = authResult;
      setSuccessMessage(`Welcome to Linzo Party Live, ${profile.name}! ✨`);
      setTimeout(() => {
        onSuccess(profile);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Google Authentication failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // 2. REAL EMAIL & PASSWORD SIGN-UP FLOW
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName || cleanName.length < 2) {
      setErrorMessage('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('Please agree to the Terms of Service & Privacy Policy.');
      return;
    }

    setIsLoading(true);
    try {
      const { profile } = await registerWithEmail({
        fullName: cleanName,
        email: cleanEmail,
        password,
        profileImage: selectedAvatar,
      });

      setRegisteredEmail(cleanEmail);
      setVerificationSent(true);
      setSuccessMessage('Account created successfully! Verification email sent.');

      // Transition to verification banner or directly into app
      setTimeout(() => {
        setSubScreen('verification');
        setIsLoading(false);
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  // 3. REAL EMAIL & PASSWORD LOGIN FLOW
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const { profile } = await loginWithEmail(cleanEmail, password, rememberMe);
      setSuccessMessage(`Welcome back, ${profile.name}! 🌟`);
      setTimeout(() => {
        onSuccess(profile);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. REAL FORGOT PASSWORD FLOW
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter the email address linked to your account.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(cleanEmail);
      setSuccessMessage(`Password reset link sent to ${cleanEmail}. Please check your inbox.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not send reset link. Please check the email.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. RESEND VERIFICATION EMAIL
  const handleResendVerification = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      await resendVerification();
      setSuccessMessage('A fresh verification link was sent to your email! ✉️');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend email. Please try again in a moment.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-[#090611] overflow-x-hidden select-none text-white font-sans">
      
      {/* Dynamic Animated Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Neon Gradient Blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#8B20FF]/25 blur-[120px] animate-pulse" />
        <div className="absolute top-1/3 -right-32 w-[420px] h-[420px] rounded-full bg-[#F328D5]/20 blur-[130px] animate-pulse" />
        <div className="absolute -bottom-32 left-1/4 w-80 h-80 rounded-full bg-[#FFC84A]/15 blur-[110px]" />
        
        {/* Subtle Neon Lines Wave */}
        <svg
          className="absolute inset-0 w-full h-full opacity-40"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="authWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B20FF" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#F328D5" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#FFC84A" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <path
            d="M-100,500 C300,100 800,800 1600,200"
            stroke="url(#authWaveGrad)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M-50,650 C400,250 900,900 1700,350"
            stroke="url(#authWaveGrad)"
            strokeWidth="1.5"
            strokeDasharray="6 6"
            fill="none"
          />
        </svg>
      </div>

      {/* Top Bar with Guest / Skip Option */}
      <div className="absolute top-4 right-4 z-20">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-[#B9AECF] hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10 transition-all backdrop-blur-md active:scale-95"
          >
            Explore as Guest ›
          </button>
        )}
      </div>

      {/* Central Glassmorphic Card Container */}
      <div className="w-full max-w-md bg-[#160C25]/90 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_15px_45px_rgba(0,0,0,0.7)] z-10 animate-fade-in relative">
        
        {/* Animated Feedback Alerts */}
        {errorMessage && (
          <div className="w-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs py-2.5 px-3.5 rounded-2xl mb-5 flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="flex-1 leading-snug">{errorMessage}</span>
            <button 
              type="button" 
              onClick={() => setErrorMessage(null)} 
              className="text-rose-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="w-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs py-2.5 px-3.5 rounded-2xl mb-5 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="flex-1 leading-snug">{successMessage}</span>
            <button 
              type="button" 
              onClick={() => setSuccessMessage(null)} 
              className="text-emerald-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ========================================================
            SCREEN 1: WELCOME / LOGIN CHOICE SCREEN
           ======================================================== */}
        {subScreen === 'welcome' && (
          <div className="flex flex-col items-center text-center animate-fade-in">
            {/* Crowned Logo */}
            <div className="mb-5 scale-105">
              <LonzoLogo size="lg" showTagline={true} />
            </div>

            <h1 className="text-2xl font-black text-white font-display tracking-tight mb-2">
              Live Stream & Party
            </h1>
            <p className="text-xs text-[#B9AECF] max-w-xs mb-6 leading-relaxed">
              Join thousands of broadcasters in real-time video, multi-seat voice rooms, and high-energy PK battles!
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-3 gap-2 w-full mb-7">
              <div className="flex flex-col items-center p-2 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <Radio className="w-4 h-4 text-[#F328D5] mb-1" />
                <span className="text-[10px] font-bold text-white">Solo Live</span>
                <span className="text-[9px] text-[#9E97AA]">Agora HD</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <Users className="w-4 h-4 text-[#8B20FF] mb-1" />
                <span className="text-[10px] font-bold text-white">Party Live</span>
                <span className="text-[9px] text-[#9E97AA]">8 & 16 Seats</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <Flame className="w-4 h-4 text-[#FFC84A] mb-1" />
                <span className="text-[10px] font-bold text-white">PK Battles</span>
                <span className="text-[9px] text-[#9E97AA]">Live Gifts</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-3">
              {/* Continue with Google */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isGoogleLoading || isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-3 transition-all active:scale-98 disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 12s.7 2.3 1.9 4.7l3.7-2.9z" />
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              {/* Continue with Email */}
              <button
                type="button"
                onClick={() => navigateTo('login')}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#F328D5]/30 hover:opacity-95 transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4 shrink-0" />
                <span>Continue with Email</span>
              </button>

              {/* Create New Account Button */}
              <button
                type="button"
                onClick={() => navigateTo('signup')}
                className="w-full py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold text-xs sm:text-sm transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-[#FFC84A]" />
                <span>Create New Account</span>
              </button>
            </div>

            {/* Terms and Privacy notice */}
            <p className="mt-7 text-[11px] text-[#B9AECF]/70 text-center leading-relaxed">
              By continuing, you agree to our{' '}
              <button 
                type="button" 
                onClick={() => setShowTermsModal(true)} 
                className="text-[#F328D5] underline hover:text-white font-medium"
              >
                Terms & Conditions
              </button>{' '}
              and{' '}
              <button 
                type="button" 
                onClick={() => setShowPrivacyModal(true)} 
                className="text-[#F328D5] underline hover:text-white font-medium"
              >
                Privacy Policy
              </button>.
            </p>
          </div>
        )}

        {/* ========================================================
            SCREEN 2: CREATE ACCOUNT (SIGN UP) SCREEN
           ======================================================== */}
        {subScreen === 'signup' && (
          <div className="flex flex-col animate-fade-in">
            {/* Header with Back button */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => navigateTo('welcome')}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-[#B9AECF] hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-black text-white font-display">Create Account</h2>
              <div className="w-9" />
            </div>

            <p className="text-xs text-[#B9AECF] text-center mb-5">
              Enter your details to create your Linzo Party Live profile
            </p>

            {/* Optional Avatar Picker */}
            <div className="flex flex-col items-center mb-5">
              <div className="relative mb-2">
                <img
                  src={selectedAvatar}
                  alt="Selected Avatar"
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#F328D5] shadow-lg shadow-pink-900/40"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#8B20FF] border-2 border-[#160C25] flex items-center justify-center text-white text-[10px]">
                  <Camera className="w-3 h-3" />
                </div>
              </div>
              <span className="text-[10px] text-[#9E97AA] mb-2">Choose an Avatar (Optional):</span>
              <div className="flex items-center gap-2">
                {DEFAULT_AVATARS.map((av, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-transform ${
                      selectedAvatar === av ? 'border-[#FFC84A] scale-110 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={av} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Sign Up Form */}
            <form onSubmit={handleEmailSignUp} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="text-[11px] font-bold text-[#B9AECF] block mb-1">Full Name</label>
                <div className="relative flex items-center">
                  <UserIcon className="w-4 h-4 absolute left-3.5 text-[#B9AECF]" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#211333] border border-white/10 focus:border-[#F328D5] rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-[#B9AECF]/40 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="text-[11px] font-bold text-[#B9AECF] block mb-1">Email Address</label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 absolute left-3.5 text-[#B9AECF]" />
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#211333] border border-white/10 focus:border-[#F328D5] rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-[#B9AECF]/40 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] font-bold text-[#B9AECF] block mb-1">Password</label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 absolute left-3.5 text-[#B9AECF]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Create a password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#211333] border border-white/10 focus:border-[#F328D5] rounded-2xl pl-10 pr-11 py-3 text-xs sm:text-sm text-white placeholder-[#B9AECF]/40 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-[#B9AECF] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-[11px] font-bold text-[#B9AECF] block mb-1">Confirm Password</label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 absolute left-3.5 text-[#B9AECF]" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#211333] border border-white/10 focus:border-[#F328D5] rounded-2xl pl-10 pr-11 py-3 text-xs sm:text-sm text-white placeholder-[#B9AECF]/40 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 text-[#B9AECF] hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="rounded border-white/20 bg-[#211333] text-[#F328D5] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="agreeTerms" className="text-[11px] text-[#B9AECF] cursor-pointer">
                  I agree to the{' '}
                  <button 
                    type="button" 
                    onClick={() => setShowTermsModal(true)} 
                    className="text-[#F328D5] underline"
                  >
                    Terms
                  </button>{' '}
                  and{' '}
                  <button 
                    type="button" 
                    onClick={() => setShowPrivacyModal(true)} 
                    className="text-[#F328D5] underline"
                  >
                    Privacy Policy
                  </button>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#F328D5]/30 hover:opacity-95 transition-all active:scale-98 flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="w-full flex items-center my-4">
              <div className="flex-1 border-t border-white/10" />
              <span className="px-3 text-[10px] text-[#B9AECF] uppercase tracking-wider">or</span>
              <div className="flex-1 border-t border-white/10" />
            </div>

            {/* Google alternative */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isGoogleLoading}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#211333] hover:bg-[#2c1a44] border border-white/10 text-white text-xs font-semibold flex items-center justify-center gap-3 transition-colors active:scale-98"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 12s.7 2.3 1.9 4.7l3.7-2.9z" />
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Switch to Login */}
            <div className="mt-5 text-center text-xs text-[#B9AECF]">
              <span>Already have an account? </span>
              <button
                type="button"
                onClick={() => navigateTo('login')}
                className="text-[#F328D5] font-bold hover:underline"
              >
                Log In
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            SCREEN 3: EMAIL LOGIN SCREEN
           ======================================================== */}
        {subScreen === 'login' && (
          <div className="flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => navigateTo('welcome')}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-[#B9AECF] hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-black text-white font-display">Login with Email</h2>
              <div className="w-9" />
            </div>

            <p className="text-xs text-[#B9AECF] text-center mb-6">
              Welcome back! Please enter your credentials to continue.
            </p>

            {/* Login Form */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              {/* Email Address */}
              <div>
                <label className="text-[11px] font-bold text-[#B9AECF] block mb-1">Email Address</label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 absolute left-3.5 text-[#B9AECF]" />
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#211333] border border-white/10 focus:border-[#F328D5] rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-[#B9AECF]/40 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] font-bold text-[#B9AECF] block mb-1">Password</label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 absolute left-3.5 text-[#B9AECF]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#211333] border border-white/10 focus:border-[#F328D5] rounded-2xl pl-10 pr-11 py-3 text-xs sm:text-sm text-white placeholder-[#B9AECF]/40 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-[#B9AECF] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-[11px]">
                <label className="flex items-center gap-2 text-[#B9AECF] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-white/20 bg-[#211333] text-[#F328D5] focus:ring-0 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => navigateTo('forgot_password')}
                  className="text-[#FFC84A] hover:underline font-semibold"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#F328D5]/30 hover:opacity-95 transition-all active:scale-98 flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Log In</span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="w-full flex items-center my-4">
              <div className="flex-1 border-t border-white/10" />
              <span className="px-3 text-[10px] text-[#B9AECF] uppercase tracking-wider">or</span>
              <div className="flex-1 border-t border-white/10" />
            </div>

            {/* Google alternative */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isGoogleLoading}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#211333] hover:bg-[#2c1a44] border border-white/10 text-white text-xs font-semibold flex items-center justify-center gap-3 transition-colors active:scale-98"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 12s.7 2.3 1.9 4.7l3.7-2.9z" />
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Switch to Sign Up */}
            <div className="mt-5 text-center text-xs text-[#B9AECF]">
              <span>Don't have an account? </span>
              <button
                type="button"
                onClick={() => navigateTo('signup')}
                className="text-[#F328D5] font-bold hover:underline"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            SCREEN 4: FORGOT PASSWORD SCREEN
           ======================================================== */}
        {subScreen === 'forgot_password' && (
          <div className="flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => navigateTo('login')}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-[#B9AECF] hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-black text-white font-display">Reset Password</h2>
              <div className="w-9" />
            </div>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8B20FF] to-[#F328D5] flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-[#F328D5]/30">
              <Lock className="w-6 h-6" />
            </div>

            <p className="text-xs text-[#B9AECF] text-center mb-6">
              Enter your registered email and we'll send a password recovery link to your inbox.
            </p>

            {/* Reset Form */}
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[#B9AECF] block mb-1">Email Address</label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 absolute left-3.5 text-[#B9AECF]" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#211333] border border-white/10 focus:border-[#F328D5] rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-[#B9AECF]/40 outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#F328D5]/30 hover:opacity-95 transition-all active:scale-98 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => navigateTo('login')}
              className="mt-6 text-xs text-[#B9AECF] hover:text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
          </div>
        )}

        {/* ========================================================
            SCREEN 5: EMAIL VERIFICATION SCREEN
           ======================================================== */}
        {subScreen === 'verification' && (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#8B20FF] to-[#F328D5] flex items-center justify-center text-white mb-4 shadow-xl shadow-[#F328D5]/40 animate-pulse">
              <Mail className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-white font-display mb-1.5">Verify Your Email</h2>
            <p className="text-xs text-[#B9AECF] mb-4 max-w-xs leading-relaxed">
              We've sent a verification link to <br />
              <span className="text-[#FFC84A] font-semibold">{registeredEmail || email || 'your email'}</span>
            </p>

            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-[11px] text-[#B9AECF] mb-6 text-left space-y-1.5">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Click the link in the email to verify your account.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>You can now explore live streams and start partying!</span>
              </div>
            </div>

            <div className="w-full space-y-3">
              {/* Continue to App */}
              <button
                type="button"
                onClick={() => {
                  // Complete sign in
                  if (email) {
                    handleEmailLogin({ preventDefault: () => {} } as any);
                  } else {
                    navigateTo('login');
                  }
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#F328D5]/30 hover:opacity-95 transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <span>Continue to Linzo Party Live</span>
              </button>

              {/* Resend Verification */}
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Resend Verification Email</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigateTo('login')}
              className="mt-5 text-xs text-[#B9AECF] hover:text-white"
            >
              Sign in with another account
            </button>
          </div>
        )}
      </div>

      {/* ========================================================
          TERMS OF SERVICE MODAL
         ======================================================== */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#160C25] border border-white/10 rounded-3xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-display">
                <ShieldCheck className="w-5 h-5 text-[#F328D5]" />
                <span>Terms of Service</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 text-xs text-[#B9AECF] pr-1 leading-relaxed">
              <p className="font-bold text-white">1. Acceptance of Terms</p>
              <p>
                By creating an account, browsing live streams, joining audio party rooms, or engaging in PK battles on Linzo Party Live, you agree to abide by these Terms of Service.
              </p>
              <p className="font-bold text-white">2. Community Standards & Live Streaming</p>
              <p>
                Linzo Party Live strictly prohibits harassment, hate speech, inappropriate or explicit content, and copyrighted broadcasts. Broadcasters must respect fellow community members.
              </p>
              <p className="font-bold text-white">3. Virtual Gifts and Coins</p>
              <p>
                Coins and virtual gifts are digital entertainment assets designed for creator appreciation during live broadcasts and PK battles.
              </p>
              <p className="font-bold text-white">4. Account Security</p>
              <p>
                You are responsible for safeguarding your login credentials. Linzo Party Live uses secure Firebase Authentication to protect user accounts.
              </p>
            </div>

            <div className="pt-4 border-t border-white/10 mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-bold"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PRIVACY POLICY MODAL
         ======================================================== */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#160C25] border border-white/10 rounded-3xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-display">
                <ShieldCheck className="w-5 h-5 text-[#FFC84A]" />
                <span>Privacy Policy</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 text-xs text-[#B9AECF] pr-1 leading-relaxed">
              <p className="font-bold text-white">1. Data Collection</p>
              <p>
                We collect your display name, email address, profile avatar, and live stream engagement metrics (such as followers and level) to provide personalized entertainment features.
              </p>
              <p className="font-bold text-white">2. Security & Passwords</p>
              <p>
                Your passwords are encrypted through Firebase Authentication and are never stored in plain text or accessible to application staff.
              </p>
              <p className="font-bold text-white">3. Real-Time Streaming Audio & Video</p>
              <p>
                Real-time media is transmitted securely via Agora RTC SDK. Camera and microphone permissions are only accessed with explicit user authorization during live sessions.
              </p>
            </div>

            <div className="pt-4 border-t border-white/10 mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-bold"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
