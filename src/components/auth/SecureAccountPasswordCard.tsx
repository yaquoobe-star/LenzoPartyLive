import React, { useState } from 'react';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Check,
  X,
} from 'lucide-react';
import { linkPasswordToGoogleAccount } from '../../services/authService';
import { UserProfile } from '../../types';

interface SecureAccountPasswordCardProps {
  email: string;
  userName?: string;
  onSuccess: (result: { providerIds: string[]; profile: UserProfile | null; alreadyLinked?: boolean }) => void;
  onLater: () => void;
}

/**
 * One-time "Secure Your Account" card shown to Google-authenticated users who have not yet
 * linked an Email & Password credential to their existing Firebase UID.
 *
 * SECURITY:
 * - Links Email/Password directly to the active Google UID via Firebase `linkWithCredential()`.
 * - Never creates a duplicate account or alters existing coins, diamonds, VIP, levels, or profile.
 * - Never stores plaintext passwords in Firestore, localStorage, sessionStorage, or logs.
 * - Uses semantic form autofill attributes (`username`, `new-password`) so Android Password Manager
 *   can offer its native save-password prompt safely.
 */
export const SecureAccountPasswordCard: React.FC<SecureAccountPasswordCardProps> = ({
  email,
  userName,
  onSuccess,
  onLater,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hasMinLength = password.length >= 6;
  const hasStrongLength = password.length >= 8;
  const hasLetterAndNumber = /[A-Za-z]/.test(password) && /\d/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const strengthLabel = !password
    ? ''
    : !hasMinLength
      ? 'Too short'
      : hasStrongLength && hasLetterAndNumber
        ? 'Strong'
        : 'Good';

  const strengthColor = !hasMinLength
    ? 'text-rose-400'
    : hasStrongLength && hasLetterAndNumber
      ? 'text-emerald-400'
      : 'text-[#FFC84A]';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Password cannot contain only spaces.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter carefully.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await linkPasswordToGoogleAccount(password);
      // Immediately clear plaintext password state from memory
      setPassword('');
      setConfirmPassword('');
      setSuccessMessage(
        result.alreadyLinked
          ? 'Email & Password login is already active for this account!'
          : 'Password registered! You can now log in with Email & Password or Google using this same account.'
      );
      setTimeout(() => {
        onSuccess(result);
      }, 900);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not register password right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-[#090611]/85 backdrop-blur-md animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="secure-account-card-title"
    >
      <div className="relative w-full max-w-md bg-[#160C25]/95 border border-white/15 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.75)] text-white my-auto overflow-hidden">
        {/* Subtle Lenzo ambient glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-56 h-56 rounded-full bg-[#F328D5]/20 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-[#8B20FF]/20 blur-[80px]" />

        <div className="relative z-10">
          {/* Top Icon + Close (Later) */}
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8B20FF] via-[#F328D5] to-[#FFC84A] p-[1.5px] shadow-lg shadow-[#F328D5]/30">
              <div className="w-full h-full rounded-2xl bg-[#160C25] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-[#FFC84A]" />
              </div>
            </div>
            <button
              type="button"
              onClick={onLater}
              disabled={isSubmitting}
              aria-label="Remind me later"
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-[#B9AECF] hover:text-white transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Exact Card Title & Description */}
          <h2
            id="secure-account-card-title"
            className="text-xl font-black text-white font-display tracking-tight mb-1.5"
          >
            Secure Your Account
          </h2>
          <p className="text-xs text-[#B9AECF] leading-relaxed mb-5">
            Register a password to access your account using Email &amp; Password on the Play Store version.
          </p>

          {/* Same-account guarantee notice */}
          <div className="mb-4 px-3.5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-2.5 text-[11px] text-[#D7CEE8]">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Links directly to {userName ? `${userName}'s` : 'your'} existing account — keeps your UID, coins, diamonds, VIP, levels &amp; history untouched.
            </span>
          </div>

          {/* Error Feedback */}
          {errorMessage && (
            <div className="w-full bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs py-2.5 px-3.5 rounded-2xl mb-4 flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span className="flex-1 leading-snug">{errorMessage}</span>
            </div>
          )}

          {/* Success Feedback */}
          {successMessage && (
            <div className="w-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs py-2.5 px-3.5 rounded-2xl mb-4 flex items-start gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span className="flex-1 leading-snug">{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Existing Registered Gmail Address (Read-Only, Autofill Username) */}
            <div>
              <label
                htmlFor="secure-account-email"
                className="text-[11px] font-bold text-[#B9AECF] block mb-1"
              >
                Registered Gmail Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 absolute left-3.5 text-[#FFC84A]" />
                <input
                  id="secure-account-email"
                  name="username"
                  type="email"
                  autoComplete="username"
                  readOnly
                  value={email}
                  className="w-full bg-[#1C102E] border border-white/10 rounded-2xl pl-10 pr-20 py-3 text-xs sm:text-sm text-white/90 font-medium outline-none cursor-default select-all"
                />
                <span className="absolute right-3 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-bold text-emerald-300 uppercase">
                  Verified
                </span>
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="secure-account-password"
                  className="text-[11px] font-bold text-[#B9AECF]"
                >
                  Password
                </label>
                {strengthLabel && (
                  <span className={`text-[10px] font-bold ${strengthColor}`}>{strengthLabel}</span>
                )}
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute left-3.5 text-[#B9AECF]" />
                <input
                  id="secure-account-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  placeholder="Create password (min 6 characters)"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={isSubmitting || Boolean(successMessage)}
                  className="w-full bg-[#211333] border border-white/10 focus:border-[#F328D5] rounded-2xl pl-10 pr-11 py-3 text-xs sm:text-sm text-white placeholder-[#B9AECF]/40 outline-none transition-colors disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 text-[#B9AECF] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="secure-account-confirm-password"
                className="text-[11px] font-bold text-[#B9AECF] block mb-1"
              >
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute left-3.5 text-[#B9AECF]" />
                <input
                  id="secure-account-confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={isSubmitting || Boolean(successMessage)}
                  className={`w-full bg-[#211333] border rounded-2xl pl-10 pr-11 py-3 text-xs sm:text-sm text-white placeholder-[#B9AECF]/40 outline-none transition-colors disabled:opacity-60 ${
                    confirmPassword.length > 0 && !passwordsMatch
                      ? 'border-rose-500/60 focus:border-rose-400'
                      : passwordsMatch
                        ? 'border-emerald-500/50 focus:border-emerald-400'
                        : 'border-white/10 focus:border-[#F328D5]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  className="absolute right-3.5 text-[#B9AECF] hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="mt-1 text-[10px] text-rose-300 font-medium">Passwords do not match yet.</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={isSubmitting || Boolean(successMessage) || !hasMinLength || !passwordsMatch}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] text-white font-black text-xs sm:text-sm shadow-lg shadow-[#F328D5]/30 hover:opacity-95 transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Registering Password...</span>
                  </>
                ) : (
                  <span>Register Password</span>
                )}
              </button>

              <button
                type="button"
                onClick={onLater}
                disabled={isSubmitting || Boolean(successMessage)}
                className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#B9AECF] hover:text-white font-bold text-xs transition-colors disabled:opacity-50"
              >
                Later
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
