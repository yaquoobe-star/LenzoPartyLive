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
import { LenzoLogo } from '../common/LenzoLogo';
import { 
  signInWithGoogle, 
  checkRedirectAuthOutcome,
  registerWithEmail, 
  sendEmailOtp,
  verifyEmailOtp,
  loginWithEmail, 
  resetPassword, 
  resendVerification,
  checkEmailVerificationStatus,
  fetchCurrentFirestoreProfile,
  FIREBASE_AUTH_SETTINGS_URL,
  DEFAULT_AVATARS 
} from '../../services/authService';
import {
  SavedDeviceAccount,
  MAX_SAVED_ACCOUNTS,
  getLastLoggedInAccount,
  getSavedDeviceAccounts,
  canAddAnotherDeviceAccount,
} from '../../services/accountSwitcherService';
import { auth } from '../../firebase';
import { UserProfile } from '../../types';

export type AuthSubScreen = 'welcome_back' | 'welcome' | 'login' | 'signup' | 'forgot_password' | 'verification' | 'email_otp' | 'complete_profile';

interface AuthScreenProps {
  onSuccess: (profile: UserProfile) => void;
  onSkip?: () => void;
  initialSubScreen?: AuthSubScreen;
  mode?: 'login' | 'add_account';
  prefillEmail?: string;
  onCancelAddAccount?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ 
  onSuccess, 
  onSkip, 
  initialSubScreen,
  mode = 'login',
  prefillEmail,
  onCancelAddAccount,
}) => {
  const [savedAccounts, setSavedAccounts] = useState<SavedDeviceAccount[]>(() => getSavedDeviceAccounts());
  const [lastAccount, setLastAccount] = useState<SavedDeviceAccount | null>(() => getLastLoggedInAccount());

  const computedInitialSubScreen: AuthSubScreen = (() => {
    if (initialSubScreen) return initialSubScreen;
    if (prefillEmail) return 'login';
    if (mode !== 'add_account' && lastAccount) return 'welcome_back';
    return 'welcome';
  })();

  // Navigation between authentication sub-screens
  const [subScreen, setSubScreen] = useState<AuthSubScreen>(computedInitialSubScreen);

  // Form Fields State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(prefillEmail || '');
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
  const [unauthorizedHost, setUnauthorizedHost] = useState<string | null>(null);
  const [copiedHost, setCopiedHost] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Terms and Privacy modals
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Registered user email state for verification screen
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [emailOtpChallenge, setEmailOtpChallenge] = useState('');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [signupVerificationMode, setSignupVerificationMode] = useState<'otp' | 'link'>('otp');
  const [emailLinkFallbackOffered, setEmailLinkFallbackOffered] = useState(false);

  useEffect(() => {
    if (otpResendCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpResendCooldown]);

  useEffect(() => {
    setSavedAccounts(getSavedDeviceAccounts());
    setLastAccount(getLastLoggedInAccount());
  }, [mode]);

  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail);
      setSubScreen('login');
    }
  }, [prefillEmail]);

  const isDeviceAccountLimitReached = mode === 'add_account' && !canAddAnotherDeviceAccount();

  // Clear messages when switching views
  const navigateTo = (screen: AuthSubScreen) => {
    setErrorMessage(null);
    setUnauthorizedHost(null);
    setSuccessMessage(null);
    setSubScreen(screen);
  };

  // Check for Google redirect result on component mount (for mobile/custom domain redirect flows)
  useEffect(() => {
    let active = true;
    checkRedirectAuthOutcome().then((outcome) => {
      if (!active) return;
      if (outcome.profile) {
        setSuccessMessage(`Welcome to Lenzo Party Live, ${outcome.profile.name}! ✨`);
        setTimeout(() => {
          onSuccess(outcome.profile!);
        }, 500);
      } else if (outcome.error) {
        if (outcome.unauthorizedDomain) {
          setUnauthorizedHost(outcome.unauthorizedDomain);
        }
        setErrorMessage(outcome.error);
      }
    });
    return () => {
      active = false;
    };
  }, [onSuccess]);

  // 1. REAL GOOGLE AUTHENTICATION FLOW
  const handleGoogleAuth = async (loginHint?: string) => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    setUnauthorizedHost(null);
    try {
      const authResult = await signInWithGoogle(
        loginHint ? { loginHint, forceAccountPicker: true } : { forceAccountPicker: true }
      );
      if (!authResult) {
        // Full page redirect was initiated (e.g., popup blocked or mobile browser)
        return;
      }
      const { profile } = authResult;
      setSuccessMessage(`Welcome to Lenzo Party Live, ${profile.name}!`);
      setTimeout(() => {
        onSuccess(profile);
      }, 450);
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain' || err?.unauthorizedDomain) {
        const host = err.unauthorizedDomain || (typeof window !== 'undefined' ? window.location.hostname : 'lenzoparty.com');
        setUnauthorizedHost(host);
      }
      setErrorMessage(err.message || 'Google Authentication failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // 1B. CONTINUE AS SAVED / LAST LOGGED-IN ACCOUNT (ALWAYS VERIFIED THROUGH FIREBASE AUTH)
  const handleContinueAsSavedAccount = async (account: SavedDeviceAccount) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // If Firebase already has a live verified session matching this UID, restore it immediately
    if (auth.currentUser && auth.currentUser.uid === account.uid) {
      setIsLoading(true);
      try {
        const profile = await fetchCurrentFirestoreProfile(account.uid);
        if (profile) {
          setSuccessMessage(`Welcome back, ${profile.name}!`);
          setTimeout(() => onSuccess(profile), 350);
          return;
        }
      } catch {
        // Fall through to provider sign-in
      } finally {
        setIsLoading(false);
      }
    }

    if (account.authProvider === 'google') {
      await handleGoogleAuth(account.email);
    } else {
      setEmail(account.email);
      setPassword('');
      navigateTo('login');
    }
  };

  // 2. EMAIL SIGN-UP: send custom SMTP 6-digit OTP first; only create Firebase account after verification.
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmailLinkFallbackOffered(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendEmailOtp(cleanEmail);
      setEmail(cleanEmail);
      setRegisteredEmail(cleanEmail);
      setSignupVerificationMode('otp');
      setEmailOtpChallenge(result.challenge);
      setEmailOtpCode('');
      setEmailOtpVerified(false);
      setOtpResendCooldown(result.cooldownSeconds || 45);
      setSuccessMessage('6-digit verification code sent! Check your inbox (and spam folder).');
      setSubScreen('email_otp');
    } catch (err: any) {
      if (typeof err?.retryAfterSeconds === 'number' && err.retryAfterSeconds > 0) {
        setOtpResendCooldown(err.retryAfterSeconds);
      }
      if (
        err?.code === 'SMTP_NOT_CONFIGURED' ||
        err?.code === 'SMTP_AUTH_ERROR' ||
        err?.code === 'SMTP_BACKEND_UNREACHABLE' ||
        err?.code === 'SMTP_CONNECTION_ERROR' ||
        err?.code === 'SMTP_DELIVERY_FAILED' ||
        err?.code === 'RAILWAY_SMTP_BLOCKED' ||
        err?.code === 'EMAIL_PROVIDER_AUTH_ERROR' ||
        err?.code === 'EMAIL_SENDER_UNVERIFIED' ||
        err?.code === 'EMAIL_WEBHOOK_ERROR' ||
        err?.code === 'EMAIL_WEBHOOK_ACCESS_ERROR'
      ) {
        setEmailLinkFallbackOffered(true);
      }
      setErrorMessage(err.message || 'Could not send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueWithEmailLinkSignup = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address first.');
      return;
    }
    setEmail(cleanEmail);
    setRegisteredEmail(cleanEmail);
    setSignupVerificationMode('link');
    setEmailOtpVerified(false);
    setSubScreen('complete_profile');
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = fullName.trim();
    const cleanEmail = (registeredEmail || email).trim().toLowerCase();
    const isOtpFlow = signupVerificationMode === 'otp';
    if (isOtpFlow && !emailOtpVerified) {
      setErrorMessage('Please verify your email with the 6-digit OTP first.');
      setSubScreen('signup');
      return;
    }
    if (cleanName.length < 2) {
      setErrorMessage('Please enter your full name (at least 2 characters).');
      return;
    }
    if (password.length < 6) {
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
        emailOtpVerified: isOtpFlow,
      });
      if (isOtpFlow) {
        setSuccessMessage(`Email verified! Welcome to Lenzo Party Live, ${profile.name}!`);
        setTimeout(() => onSuccess(profile), 450);
      } else {
        setVerificationSent(true);
        setSuccessMessage(`Verification email sent to ${cleanEmail}. Open your inbox and tap the link.`);
        setSubScreen('verification');
      }
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        setEmail(cleanEmail);
        setPassword('');
        setConfirmPassword('');
        setSubScreen('login');
        setErrorMessage('An account with this email already exists. Please log in with your password.');
        return;
      }
      setErrorMessage(err.message || 'Account creation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    const cleanEmail = (registeredEmail || email).trim().toLowerCase();
    const cleanOtp = emailOtpCode.replace(/\D/g, '').slice(0, 6);

    if (!emailOtpChallenge) {
      setErrorMessage('Verification session expired. Please request a new code.');
      return;
    }
    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage('Enter the 6-digit code sent to your email.');
      return;
    }
    setIsLoading(true);
    try {
      await verifyEmailOtp(cleanEmail, cleanOtp, emailOtpChallenge);
      setEmailOtpCode(cleanOtp);
      setEmailOtpVerified(true);
      setSignupVerificationMode('otp');
      setSuccessMessage('Email verified! Now complete your profile.');
      setSubScreen('complete_profile');
    } catch (err: any) {
      setErrorMessage(err.message || 'Email verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmailOtp = async () => {
    const cleanEmail = (registeredEmail || email).trim().toLowerCase();
    if (!cleanEmail || otpResendCooldown > 0 || isLoading) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const r = await sendEmailOtp(cleanEmail);
      setEmailOtpChallenge(r.challenge);
      setEmailOtpCode('');
      setEmailOtpVerified(false);
      setOtpResendCooldown(r.cooldownSeconds || 45);
      setSuccessMessage('A fresh 6-digit verification code has been sent to your email.');
    } catch (err: any) {
      if (typeof err?.retryAfterSeconds === 'number' && err.retryAfterSeconds > 0) {
        setOtpResendCooldown(err.retryAfterSeconds);
      }
      setErrorMessage(err.message || 'Could not resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. REAL EMAIL & PASSWORD LOGIN FLOW
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
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

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
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

  // 5. RESEND VERIFICATION EMAIL & CHECK LIVE VERIFICATION STATUS
  const handleResendVerification = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      await resendVerification();
      setSuccessMessage('A fresh verification link was sent to your email! Check inbox & spam.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend email. Please try again in a moment.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckEmailLinkVerified = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const result = await checkEmailVerificationStatus();
      if (result.verified && result.profile) {
        setSuccessMessage(`Email verified! Welcome to Lenzo Party Live, ${result.profile.name}!`);
        setTimeout(() => onSuccess(result.profile!), 400);
      } else {
        setErrorMessage('Email is not verified yet. Open the verification email in your inbox, click the link, then tap again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not verify email status. Please try logging in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh-screen w-full flex flex-col items-center justify-center px-4 sm:px-6 safe-pt-4 safe-pb-6 bg-[#090611] select-none text-white font-sans">
      
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

      {/* Top Bar with Add-Account Back Button & Guest / Skip Option */}
      <div className="absolute safe-top-offset-4 left-4 right-4 z-20 flex items-center justify-between">
        <div>
          {mode === 'add_account' && onCancelAddAccount && (
            <button
              type="button"
              onClick={onCancelAddAccount}
              className="text-xs text-white bg-white/10 hover:bg-white/15 px-3.5 py-1.5 rounded-full border border-white/15 transition-all backdrop-blur-md active:scale-95 flex items-center gap-1.5 font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to App</span>
            </button>
          )}
        </div>
        <div>
          {onSkip && mode !== 'add_account' && (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-[#B9AECF] hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10 transition-all backdrop-blur-md active:scale-95"
            >
              Explore as Guest ›
            </button>
          )}
        </div>
      </div>

      {/* Central Glassmorphic Card Container */}
      <div className="w-full max-w-md bg-[#160C25]/90 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_15px_45px_rgba(0,0,0,0.7)] z-10 animate-fade-in relative">
        
        {/* Animated Feedback Alerts */}
        {errorMessage && (
          <div className="w-full bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs py-3 px-3.5 rounded-2xl mb-5 space-y-2.5 animate-fade-in">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span className="flex-1 leading-snug">{errorMessage}</span>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setUnauthorizedHost(null);
                }}
                className="text-rose-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {unauthorizedHost && (
              <div className="pt-2 border-t border-rose-400/25 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigateTo('login')}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white font-bold text-[11px] shadow active:scale-95"
                >
                  Login with Email Instead
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(unauthorizedHost).catch(() => {});
                    setCopiedHost(true);
                    setTimeout(() => setCopiedHost(false), 2000);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-[11px]"
                >
                  {copiedHost ? 'Copied Domain' : `Copy "${unauthorizedHost}"`}
                </button>
                <a
                  href={FIREBASE_AUTH_SETTINGS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-xl bg-amber-400/20 border border-amber-400/40 text-[#FFC84A] font-semibold text-[11px] hover:bg-amber-400/30"
                >
                  Open Firebase Auth Settings
                </a>
              </div>
            )}
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
            SCREEN 0: LAST LOGGED-IN ACCOUNT ("WELCOME BACK" CARD)
           ======================================================== */}
        {subScreen === 'welcome_back' && lastAccount && (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <div className="mb-4 scale-100">
              <LenzoLogo size="lg" showTagline={false} />
            </div>

            <span className="text-[11px] font-black tracking-[0.22em] text-[#FFC84A] uppercase mb-1">
              WELCOME BACK
            </span>
            <p className="text-xs text-[#B9AECF] mb-5">
              Last time you logged in as:
            </p>

            {/* Saved Account Identity Card */}
            <div className="w-full p-4 rounded-2xl bg-white/[0.04] border border-white/15 mb-6 flex items-center gap-3.5 text-left">
              <img
                src={lastAccount.avatar || DEFAULT_AVATARS[0]}
                alt={lastAccount.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-[#F328D5] shadow-lg shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate">{lastAccount.name}</p>
                <p className="text-xs text-[#FFC84A] font-semibold truncate">{lastAccount.username}</p>
                <p className="text-[11px] text-[#B9AECF] truncate mt-0.5">{lastAccount.email}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-white/10 text-white/80 uppercase">
                    {lastAccount.authProvider === 'google' ? 'Google Account' : 'Email Account'}
                  </span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#8B20FF]/30 text-purple-200">
                    Lv.{lastAccount.level}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={() => handleContinueAsSavedAccount(lastAccount)}
                disabled={isGoogleLoading || isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] text-white font-black text-xs sm:text-sm shadow-lg shadow-[#F328D5]/30 hover:opacity-95 transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGoogleLoading || isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>CONTINUE AS THIS ACCOUNT</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigateTo('welcome')}
                disabled={isGoogleLoading || isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold text-xs sm:text-sm transition-all active:scale-98"
              >
                USE ANOTHER ACCOUNT
              </button>
            </div>

            <p className="mt-5 text-[10px] text-[#B9AECF]/65 leading-relaxed">
              Verified via Firebase Authentication. Your permanent UID, coins, VIP tier, and inventory are preserved automatically.
            </p>
          </div>
        )}

        {/* ========================================================
            SCREEN 1: WELCOME / LOGIN CHOICE SCREEN
           ======================================================== */}
        {subScreen === 'welcome' && (
          <div className="flex flex-col items-center text-center animate-fade-in">
            {/* Crowned Logo */}
            <div className="mb-5 scale-105">
              <LenzoLogo size="lg" showTagline={true} />
            </div>

            <h1 className="text-2xl font-black text-white font-display tracking-tight mb-2">
              {mode === 'add_account' ? 'Add Lenzo Account' : 'Live Stream & Party'}
            </h1>
            <p className="text-xs text-[#B9AECF] max-w-xs mb-5 leading-relaxed">
              {mode === 'add_account'
                ? `Sign in with another account to save it on this device (${savedAccounts.length}/${MAX_SAVED_ACCOUNTS} used).`
                : 'Join thousands of broadcasters in real-time video, multi-seat voice rooms, and high-energy PK battles!'}
            </p>

            {isDeviceAccountLimitReached && (
              <div className="w-full mb-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-400/35 text-amber-200 text-xs text-left leading-relaxed">
                You already have {MAX_SAVED_ACCOUNTS} accounts saved on this device. Remove one in Switch Account if you want to save a new slot.
              </div>
            )}

            {/* Quick-pick saved device accounts when choosing another account */}
            {mode !== 'add_account' && savedAccounts.length > 0 && (
              <div className="w-full mb-5 text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#B9AECF]">
                    Saved on this device ({savedAccounts.length}/{MAX_SAVED_ACCOUNTS})
                  </span>
                  {lastAccount && (
                    <button
                      type="button"
                      onClick={() => navigateTo('welcome_back')}
                      className="text-[10px] font-bold text-[#FFC84A] hover:underline"
                    >
                      Last Account ›
                    </button>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {savedAccounts.map((acc) => (
                    <button
                      key={acc.uid}
                      type="button"
                      onClick={() => handleContinueAsSavedAccount(acc)}
                      className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 transition-colors"
                    >
                      <img
                        src={acc.avatar || DEFAULT_AVATARS[0]}
                        alt={acc.name}
                        className="w-7 h-7 rounded-full object-cover border border-white/20"
                      />
                      <div className="text-left max-w-[115px]">
                        <p className="text-[11px] font-bold text-white truncate">{acc.name}</p>
                        <p className="text-[9px] text-[#B9AECF] truncate">{acc.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Feature Pills */}
            <div className="grid grid-cols-3 gap-2 w-full mb-6">
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
                onClick={() => handleGoogleAuth()}
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
            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={() => navigateTo('welcome')} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#B9AECF]">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-black text-white font-display">Create Account</h2>
              <div className="w-9" />
            </div>
            <p className="text-xs text-[#B9AECF] text-center mb-6">Start by verifying your email address.</p>
            <form onSubmit={handleEmailSignUp} className="w-full space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[#B9AECF] block mb-1">Email Address</label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 absolute left-3.5 text-[#B9AECF]" />
                  <input type="email" required autoComplete="email" placeholder="Enter your email address" value={email}
                    onChange={(e) => {
                      setEmail(e.target.value.trimStart());
                      if (emailLinkFallbackOffered) setEmailLinkFallbackOffered(false);
                    }}
                    className="w-full bg-[#211333] border border-white/10 focus:border-[#F328D5] rounded-2xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-[#B9AECF]/40 outline-none" />
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] text-white font-bold text-sm disabled:opacity-60">
                {isLoading ? 'Sending 6-Digit OTP...' : 'Send 6-Digit Email OTP'}
              </button>
              {emailLinkFallbackOffered && (
                <button
                  type="button"
                  onClick={handleContinueWithEmailLinkSignup}
                  className="w-full py-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 font-bold text-xs transition-colors"
                >
                  Continue with Email Verification Link Instead
                </button>
              )}
            </form>
            <div className="w-full flex items-center my-4">
              <div className="flex-1 border-t border-white/10" />
              <span className="px-3 text-[10px] text-[#B9AECF] uppercase">or</span>
              <div className="flex-1 border-t border-white/10" />
            </div>
            <button type="button" onClick={() => handleGoogleAuth()} disabled={isGoogleLoading} className="w-full py-2.5 rounded-2xl bg-[#211333] border border-white/10 text-white text-xs font-semibold flex items-center justify-center gap-3">
              <span>Continue with Google</span>
            </button>
            <div className="mt-5 text-center text-xs text-[#B9AECF]">
              <span>Already have an account? </span>
              <button type="button" onClick={() => navigateTo('login')} className="text-[#F328D5] font-bold">Log In</button>
            </div>
          </div>
        )}

        {subScreen === 'complete_profile' && (
          <div className="flex flex-col animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => navigateTo(signupVerificationMode === 'otp' ? 'email_otp' : 'signup')}
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#B9AECF]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-black text-white font-display">Complete Profile</h2>
              <div className="w-9" />
            </div>
            <p className="text-xs text-[#B9AECF] text-center mb-4">
              {signupVerificationMode === 'otp' ? 'Verified: ' : 'Email: '}
              <span className="text-[#FFC84A]">{registeredEmail}</span>
            </p>
            <div className="flex flex-col items-center mb-5">
              <img src={selectedAvatar} alt="Selected Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-[#F328D5] mb-2" />
              <span className="text-[10px] text-[#9E97AA] mb-2">Choose an Avatar (Optional)</span>
              <div className="flex items-center gap-2">
                {DEFAULT_AVATARS.map((av, idx) => (
                  <button key={idx} type="button" onClick={() => setSelectedAvatar(av)} className={`w-8 h-8 rounded-full overflow-hidden border-2 ${selectedAvatar === av ? 'border-[#FFC84A] scale-110' : 'border-transparent opacity-60'}`}>
                    <img src={av} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
            <form onSubmit={handleCompleteProfile} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-[#B9AECF] block mb-1">Full Name</label>
                <div className="relative flex items-center"><UserIcon className="w-4 h-4 absolute left-3.5 text-[#B9AECF]" />
                  <input type="text" required minLength={2} autoComplete="name" placeholder="Enter your full name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#211333] border border-white/10 focus:border-[#F328D5] rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#B9AECF]/40 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#B9AECF] block mb-1">Password</label>
                <div className="relative flex items-center"><Lock className="w-4 h-4 absolute left-3.5 text-[#B9AECF]" />
                  <input type={showPassword ? 'text' : 'password'} required minLength={6} autoComplete="new-password" placeholder="Create a password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#211333] border border-white/10 focus:border-[#F328D5] rounded-2xl pl-10 pr-11 py-3 text-sm text-white placeholder-[#B9AECF]/40 outline-none" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 text-[#B9AECF]">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#B9AECF] block mb-1">Confirm Password</label>
                <div className="relative flex items-center"><Lock className="w-4 h-4 absolute left-3.5 text-[#B9AECF]" />
                  <input type={showConfirmPassword ? 'text' : 'password'} required minLength={6} autoComplete="new-password" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#211333] border border-white/10 focus:border-[#F328D5] rounded-2xl pl-10 pr-11 py-3 text-sm text-white placeholder-[#B9AECF]/40 outline-none" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 text-[#B9AECF]">{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="agreeTermsAfterOtp" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="rounded border-white/20 bg-[#211333] text-[#F328D5]" />
                <label htmlFor="agreeTermsAfterOtp" className="text-[11px] text-[#B9AECF]">I agree to the Terms and Privacy Policy</label>
              </div>
              <button
                type="submit"
                disabled={isLoading || (signupVerificationMode === 'otp' && !emailOtpVerified)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] text-white font-bold text-sm disabled:opacity-60"
              >
                {isLoading
                  ? 'Creating Account...'
                  : signupVerificationMode === 'otp'
                    ? 'Create Account & Enter App'
                    : 'Create Account & Send Verification Link'}
              </button>
            </form>
          </div>
        )}

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
              onClick={() => handleGoogleAuth()}
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
        {subScreen === 'email_otp' && (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#8B20FF] to-[#F328D5] flex items-center justify-center text-white mb-4 shadow-xl shadow-[#F328D5]/40">
              <Mail className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white font-display mb-2">Enter 6-Digit Code</h2>
            <p className="text-xs text-[#B9AECF] mb-2">
              We sent a 6-digit verification code to <span className="text-[#FFC84A] font-semibold">{registeredEmail}</span>.
            </p>
            <p className="text-[11px] text-[#9E97AA] mb-5">
              Valid for 10 minutes. Check Spam or Promotions if you do not see it in your inbox.
            </p>
            <form onSubmit={handleVerifyEmailOtp} className="w-full space-y-3">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                required
                value={emailOtpCode}
                onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full bg-[#211333] border border-white/10 focus:border-[#F328D5] rounded-2xl px-4 py-4 text-center tracking-[0.5em] text-xl font-bold text-white outline-none"
              />
              <button
                type="submit"
                disabled={isLoading || emailOtpCode.length !== 6}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] text-white font-bold text-sm disabled:opacity-60"
              >
                {isLoading ? 'Verifying...' : 'Verify Email Code'}
              </button>
            </form>
            <button
              type="button"
              disabled={isLoading || otpResendCooldown > 0}
              onClick={handleResendEmailOtp}
              className="mt-4 text-xs text-[#F328D5] font-semibold disabled:opacity-50"
            >
              {otpResendCooldown > 0 ? `Resend Code in ${otpResendCooldown}s` : 'Resend Code'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEmailOtpChallenge('');
                setEmailOtpCode('');
                setEmailOtpVerified(false);
                navigateTo('signup');
              }}
              className="mt-4 text-xs text-[#B9AECF]"
            >
              Change email address
            </button>
          </div>
        )}

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
                <span>Open your email inbox (or Spam folder) and click the verification link.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Come back here and tap "I've Verified My Email" to enter Lenzo Party Live.</span>
              </div>
            </div>

            <div className="w-full space-y-3">
              {/* Live Email Verification Check */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleCheckEmailLinkVerified}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#F328D5]/30 hover:opacity-95 transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <span>{isLoading ? 'Checking Verification...' : "I've Verified My Email"}</span>
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
                By creating an account, browsing live streams, joining audio party rooms, or engaging in PK battles on Lenzo Party Live, you agree to abide by these Terms of Service.
              </p>
              <p className="font-bold text-white">2. Community Standards & Live Streaming</p>
              <p>
                Lenzo Party Live strictly prohibits harassment, hate speech, inappropriate or explicit content, and copyrighted broadcasts. Broadcasters must respect fellow community members.
              </p>
              <p className="font-bold text-white">3. Virtual Gifts and Coins</p>
              <p>
                Coins and virtual gifts are digital entertainment assets designed for creator appreciation during live broadcasts and PK battles.
              </p>
              <p className="font-bold text-white">4. Account Security</p>
              <p>
                You are responsible for safeguarding your login credentials. Lenzo Party Live uses secure Firebase Authentication to protect user accounts.
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
