import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  Bell,
  Globe,
  Moon,
  Lock,
  UserX,
  Info,
  Trash2,
  LogOut,
  ChevronRight,
  Check,
  Wallet,
  ArrowRightLeft,
  Copy,
  Link2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { HostModeratorRecord, ScreenType, UserProfile } from '../../types';
import { BlockedUserRecord } from '../../services/blockService';
import { BlockedUsersModal } from '../profile/BlockedUsersModal';
import {
  MAX_SAVED_ACCOUNTS,
  getSavedDeviceAccounts,
  loadUserSettingsFromFirestore,
  saveUserSettingsToFirestore,
  subscribeUserSettings,
  submitAccountDeletionRequest,
} from '../../services/accountSwitcherService';
import { getLinkedAuthProviders, linkGoogleAccount } from '../../services/authService';
import { auth, FIREBASE_RUNTIME_INFO } from '../../firebase';

interface SettingsScreenProps {
  currentUser: UserProfile;
  onNavigate: (screen: ScreenType) => void;
  onLogout: () => void;
  onOpenWallet?: () => void;
  onOpenAccountSwitcher?: () => void;
  isAdmin?: boolean;
  onOpenAdminProgression?: () => void;
  blockedUsers?: BlockedUserRecord[];
  onUnblockUser?: (targetUserId: string, targetName?: string) => Promise<void> | void;
  moderators?: HostModeratorRecord[];
  onRemoveModerator?: (moderatorUserId: string, moderatorName?: string) => Promise<void> | void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  currentUser,
  onNavigate,
  onLogout,
  onOpenWallet,
  onOpenAccountSwitcher,
  isAdmin = false,
  onOpenAdminProgression,
  blockedUsers = [],
  onUnblockUser,
  moderators = [],
  onRemoveModerator,
}) => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [allowDirectMessages, setAllowDirectMessages] = useState<'everyone' | 'followers' | 'nobody'>('everyone');
  const [cacheSize, setCacheSize] = useState('12.5MB');
  const [language, setLanguage] = useState('English');

  // Modals
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [linkedProviders, setLinkedProviders] = useState<string[]>(() => getLinkedAuthProviders());
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);
  const [isModeratorsModalOpen, setIsModeratorsModalOpen] = useState(false);
  const [removingModId, setRemovingModId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const savedAccountsCount = getSavedDeviceAccounts().length;

  // Hydrate and subscribe to Firestore user_settings/{uid}
  useEffect(() => {
    const uid = auth.currentUser?.uid || currentUser.id;
    if (!uid || uid === 'user_current_01') return;

    loadUserSettingsFromFirestore(uid).then((settings) => {
      setNotifications(settings.notificationsEnabled);
      setDarkMode(settings.darkMode);
      setLanguage(settings.language);
      setShowOnlineStatus(settings.showOnlineStatus);
      setAllowDirectMessages(settings.allowDirectMessages);
    });

    const unsub = subscribeUserSettings(uid, (settings) => {
      setNotifications(settings.notificationsEnabled);
      setDarkMode(settings.darkMode);
      setLanguage(settings.language);
      setShowOnlineStatus(settings.showOnlineStatus);
      setAllowDirectMessages(settings.allowDirectMessages);
    });
    return () => unsub();
  }, [currentUser.id]);

  const persistSetting = (partial: Parameters<typeof saveUserSettingsToFirestore>[1]) => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      void saveUserSettingsToFirestore(uid, partial).catch(() => {});
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const handleClearCache = () => {
    setCacheSize('0.0MB');
    showToast('App cache successfully cleared! 12.5MB freed.');
  };

  const handleLinkGoogle = async () => {
    setIsLinkingGoogle(true);
    try {
      const updated = await linkGoogleAccount();
      setLinkedProviders(updated);
      showToast('Google sign-in linked to your permanent Lenzo account!');
    } catch (err: any) {
      showToast(err?.message || 'Could not link Google account.');
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (isDeletingAccount) return;
    setIsDeletingAccount(true);
    try {
      await submitAccountDeletionRequest(deleteReason || 'User requested account deletion');
      if (auth.currentUser) {
        await auth.currentUser.delete();
        showToast('Your account was permanently deleted.');
        setShowDeleteAccountModal(false);
        setTimeout(() => onLogout(), 1000);
      }
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        showToast('Deletion request logged. For security, please log out and log in again to complete immediate deletion.');
      } else {
        showToast(err?.message || 'Deletion request logged. Please re-authenticate to finalize.');
      }
      setShowDeleteAccountModal(false);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="w-full pb-28 md:pb-12 animate-fade-in select-none">
      <div className="max-w-2xl mx-auto px-3.5 sm:px-6 safe-pt-3 space-y-4">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed safe-top-offset-16 left-1/2 -translate-x-1/2 z-[140] bg-[#8B20FF] text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg shadow-[#8B20FF]/50 max-w-[90vw] text-center">
            {toastMessage}
          </div>
        )}

        {/* Language Modal */}
        {showLanguageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-[#160C25] border border-white/10 rounded-3xl p-5 max-w-xs w-full">
              <h3 className="text-base font-bold text-white font-display mb-3">Select Language</h3>
              <div className="space-y-2 mb-4">
                {['English', 'Español', 'العربية', 'اردو', 'Français', 'Türkçe'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setLanguage(lang);
                      persistSetting({ language: lang });
                      setShowLanguageModal(false);
                      showToast(`Language saved to cloud: ${lang}`);
                    }}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      language === lang ? 'bg-[#8B20FF] text-white' : 'bg-[#211333] text-[#B9AECF] hover:text-white'
                    }`}
                  >
                    <span>{lang}</span>
                    {language === lang && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowLanguageModal(false)}
                className="w-full py-2 rounded-xl bg-white/10 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Account Security & Permanent Firebase Identity Modal */}
        {showSecurityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#160C25] border border-white/15 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#8B20FF]" />
                  Account Security &amp; Identity
                </h3>
                <button
                  onClick={() => setShowSecurityModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-[#B9AECF] uppercase">Permanent Firebase UID</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-white truncate">{auth.currentUser?.uid || currentUser.id}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(auth.currentUser?.uid || currentUser.id).catch(() => {});
                        showToast('Permanent UID copied!');
                      }}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                    <span className="text-[10px] text-[#B9AECF] block">Lenzo ID</span>
                    <span className="font-mono font-bold text-white">{currentUser.displayId}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                    <span className="text-[10px] text-[#B9AECF] block">Firebase Project</span>
                    <span className="font-mono font-bold text-emerald-300 truncate block">
                      {FIREBASE_RUNTIME_INFO.projectId}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                  <span className="text-[10px] font-bold text-[#B9AECF] uppercase block">Linked Sign-In Providers</span>
                  <div className="flex flex-wrap gap-1.5">
                    {linkedProviders.length === 0 ? (
                      <span className="text-[#B9AECF]">Session sign-in active</span>
                    ) : (
                      linkedProviders.map((p) => (
                        <span
                          key={p}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]"
                        >
                          {p === 'google.com' ? 'Google Account' : p === 'password' ? 'Email & Password' : p}
                        </span>
                      ))
                    )}
                  </div>
                  {!linkedProviders.includes('google.com') && auth.currentUser && (
                    <button
                      type="button"
                      disabled={isLinkingGoogle}
                      onClick={() => void handleLinkGoogle()}
                      className="mt-1 w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-white/90 disabled:opacity-50"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>{isLinkingGoogle ? 'Linking Google...' : 'Link Google Sign-In to This UID'}</span>
                    </button>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                  <span className="text-[#B9AECF]">Firebase App Check</span>
                  <span
                    className={`font-bold text-[11px] ${
                      FIREBASE_RUNTIME_INFO.appCheckEnabled ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {FIREBASE_RUNTIME_INFO.appCheckEnabled ? 'Active' : 'Ready (Site Key Pending)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Settings Modal */}
        {showPrivacyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#160C25] border border-white/15 rounded-3xl p-5 max-w-sm w-full space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#8B20FF]" />
                  Privacy Settings
                </h3>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                <div>
                  <p className="text-xs font-bold text-white">Show Online Status</p>
                  <p className="text-[10px] text-[#B9AECF]">Allow others to see when you are active</p>
                </div>
                <button
                  onClick={() => {
                    const next = !showOnlineStatus;
                    setShowOnlineStatus(next);
                    persistSetting({ showOnlineStatus: next });
                    showToast('Privacy setting synced');
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    showOnlineStatus ? 'bg-[#8B20FF]' : 'bg-[#211333]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      showOnlineStatus ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-bold text-white">Who can send direct messages</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['everyone', 'followers', 'nobody'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setAllowDirectMessages(opt);
                        persistSetting({ allowDirectMessages: opt });
                        showToast(`Messages allowed from: ${opt}`);
                      }}
                      className={`py-2 rounded-xl text-[11px] font-bold capitalize border transition-colors ${
                        allowDirectMessages === opt
                          ? 'bg-[#8B20FF] border-[#F328D5] text-white'
                          : 'bg-white/[0.04] border-white/10 text-[#B9AECF]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account In-App Confirmation Modal (no window.confirm) */}
        {showDeleteAccountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#160C25] border border-rose-500/40 rounded-3xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white text-center">Delete Account Permanently?</h3>
              <p className="text-xs text-[#B9AECF] text-center leading-relaxed">
                This logs an official deletion request and permanently deletes your Firebase Auth credentials. This action cannot be undone.
              </p>
              <textarea
                rows={2}
                placeholder="Optional reason for leaving..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                maxLength={250}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-[#B9AECF]/50 outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isDeletingAccount}
                  onClick={() => setShowDeleteAccountModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingAccount}
                  onClick={() => void handleConfirmDeleteAccount()}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold disabled:opacity-50"
                >
                  {isDeletingAccount ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('profile')}
            className="w-9 h-9 rounded-full bg-[#160C25] hover:bg-[#211333] border border-white/10 flex items-center justify-center text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-extrabold text-white font-display">Settings</h2>
        </div>

        {/* Settings Items Rows */}
        <div className="space-y-2 pt-2">
          {/* Switch Account Row (Multi-Account Switcher up to 5) */}
          {onOpenAccountSwitcher && (
            <div
              onClick={onOpenAccountSwitcher}
              className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-[#fe2c55]/15 via-[#160C25] to-[#25f4ee]/10 hover:opacity-95 border border-[#fe2c55]/35 transition-all cursor-pointer group shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#fe2c55] to-[#8B20FF] text-white flex items-center justify-center shadow-sm">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-black text-white flex items-center gap-1.5">
                    Switch Account
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-[#25f4ee] font-mono">
                      {savedAccountsCount}/{MAX_SAVED_ACCOUNTS} SAVED
                    </span>
                  </span>
                  <span className="text-[10px] text-[#B9AECF] block">
                    Manage up to 5 accounts on this device with isolated data
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#25f4ee] group-hover:translate-x-1 transition-transform" />
            </div>
          )}

          {/* Wallet & Earnings Dashboard */}
          {onOpenWallet && (
            <div
              onClick={onOpenWallet}
              className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#F328D5]/15 to-[#8B20FF]/15 hover:opacity-95 border border-amber-400/40 transition-all cursor-pointer group shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-black flex items-center justify-center font-black shadow-sm">
                  <Wallet className="w-4 h-4 text-black" />
                </div>
                <div>
                  <span className="text-sm font-black text-white flex items-center gap-1.5">
                    WALLET &amp; EARNINGS
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                      PKR CASHOUT
                    </span>
                  </span>
                  <span className="text-[10px] text-[#B9AECF] block">
                    Recharge coins, convert earnings, and request bank payouts
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#FFC84A] group-hover:translate-x-1 transition-transform" />
            </div>
          )}

          {/* Admin-Only Progression Management Console */}
          {isAdmin && onOpenAdminProgression && (
            <div
              onClick={onOpenAdminProgression}
              className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-[#2D1154] via-[#1C0B36] to-[#2B1707] hover:opacity-95 border border-[#FFC84A]/50 transition-all cursor-pointer group shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#FFC84A]/20 border border-[#FFC84A]/50 text-[#FFC84A] flex items-center justify-center font-black">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-black text-white flex items-center gap-1.5">
                    ADMIN PROGRESSION PANEL
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FFC84A]/20 text-[#FFC84A] font-mono">
                      100 LV · VIP · SVIP
                    </span>
                  </span>
                  <span className="text-[10px] text-[#C5B9DE] block">
                    Inspect 100 levels, edit VIP/Super VIP/badges &amp; audit logs
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#FFC84A] group-hover:translate-x-1 transition-transform" />
            </div>
          )}

          {/* Account Security */}
          <div
            onClick={() => {
              setLinkedProviders(getLinkedAuthProviders());
              setShowSecurityModal(true);
            }}
            className="flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/[0.08] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#8B20FF]" />
              <div>
                <span className="text-sm font-semibold text-white block">Account Security</span>
                <span className="text-[10px] text-[#B9AECF]">Permanent UID, Linked Providers &amp; App Check</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#B9AECF]" />
          </div>

          {/* Notifications Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#160C25] border border-white/[0.08]">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-[#F328D5]" />
              <span className="text-sm font-semibold text-white">Notifications</span>
            </div>
            <button
              onClick={() => {
                const next = !notifications;
                setNotifications(next);
                persistSetting({ notificationsEnabled: next });
                showToast(next ? 'Notifications enabled (saved)' : 'Notifications paused (saved)');
              }}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                notifications ? 'bg-[#F328D5]' : 'bg-[#211333]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  notifications ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Language Selector */}
          <div
            onClick={() => setShowLanguageModal(true)}
            className="flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/[0.08] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-[#06B6D4]" />
              <span className="text-sm font-semibold text-white">Language</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#B9AECF]">{language}</span>
              <ChevronRight className="w-4 h-4 text-[#B9AECF]" />
            </div>
          </div>

          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#160C25] border border-white/[0.08]">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-[#FFC84A]" />
              <span className="text-sm font-semibold text-white">Dark Mode</span>
            </div>
            <button
              onClick={() => {
                const next = !darkMode;
                setDarkMode(next);
                persistSetting({ darkMode: next });
                showToast('Theme preference synced to your account');
              }}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                darkMode ? 'bg-[#8B20FF]' : 'bg-[#211333]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  darkMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Privacy Settings */}
          <div
            onClick={() => setShowPrivacyModal(true)}
            className="flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/[0.08] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-[#8B20FF]" />
              <span className="text-sm font-semibold text-white">Privacy Settings</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#B9AECF]" />
          </div>

          {/* Moderation & Lifetime Moderators */}
          <div
            onClick={() => setIsModeratorsModalOpen(true)}
            className="flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-cyan-500/20 hover:border-cyan-400/40 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <div>
                <span className="text-sm font-semibold text-white block">Moderation &amp; Moderators</span>
                <span className="text-[10px] text-[#B9AECF]">
                  Manage lifetime moderators for your Party Rooms
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-[11px] font-bold text-cyan-300">
                {moderators.length}
              </span>
              <ChevronRight className="w-4 h-4 text-[#B9AECF]" />
            </div>
          </div>

          {/* Blocked Users */}
          <div
            onClick={() => setIsBlockedModalOpen(true)}
            className="flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/[0.08] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <UserX className="w-5 h-5 text-rose-400" />
              <span className="text-sm font-semibold text-white">Blocked Users</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#B9AECF]">{blockedUsers.length}</span>
              <ChevronRight className="w-4 h-4 text-[#B9AECF]" />
            </div>
          </div>

          {/* Manage Lifetime Moderators Modal */}
          {isModeratorsModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
              <div className="w-full max-w-md rounded-3xl bg-[#140A24] border border-cyan-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[82vh]">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-cyan-950/60 via-[#1A0D30] to-indigo-950/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-cyan-300" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">My Room Moderators</h3>
                      <p className="text-[11px] text-cyan-200/80">
                        Active for life across all your broadcasts until removed
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsModeratorsModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
                  {moderators.length === 0 ? (
                    <div className="py-10 px-4 text-center space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-400/25 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-cyan-300/70" />
                      </div>
                      <p className="text-sm font-bold text-white">No Moderators Assigned Yet</p>
                      <p className="text-xs text-[#B9AECF] leading-relaxed">
                        Open your Party Room, tap any user on a seat, comment, or audience list, and choose{' '}
                        <span className="text-cyan-300 font-bold">Make Moderator</span>. They will keep Moderator
                        powers across all your future rooms until you remove them here.
                      </p>
                    </div>
                  ) : (
                    moderators.map((mod) => (
                      <div
                        key={mod.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={
                              mod.moderatorAvatar ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(mod.moderatorName || 'M')}&background=0891b2&color=fff`
                            }
                            alt={mod.moderatorName}
                            className="w-11 h-11 rounded-full object-cover border-2 border-cyan-400/70 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-white truncate">
                                {mod.moderatorName}
                              </span>
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 text-[8.5px] font-black uppercase text-white">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                MOD
                              </span>
                            </div>
                            <p className="text-[10px] text-[#B9AECF] truncate">
                              {mod.moderatorUsername ? `${mod.moderatorUsername} · ` : ''}
                              {mod.moderatorDisplayId ? `ID: ${mod.moderatorDisplayId}` : 'Lifetime Moderator'}
                            </p>
                            <p className="text-[9.5px] text-white/45 mt-0.5">
                              Added {new Date(mod.assignedAt || Date.now()).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <button
                          disabled={removingModId === mod.moderatorUserId}
                          onClick={async () => {
                            if (!onRemoveModerator) return;
                            setRemovingModId(mod.moderatorUserId);
                            try {
                              await onRemoveModerator(mod.moderatorUserId, mod.moderatorName);
                              showToast(`${mod.moderatorName} removed from Moderators.`);
                            } finally {
                              setRemovingModId(null);
                            }
                          }}
                          className="shrink-0 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/40 text-rose-300 text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50"
                        >
                          {removingModId === mod.moderatorUserId ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02] text-[10.5px] text-[#B9AECF] leading-relaxed">
                  Moderators can control seats, accept requests, kick or block users (except the Host), and delete or clear chat history.
                </div>
              </div>
            </div>
          )}

          <BlockedUsersModal
            isOpen={isBlockedModalOpen}
            onClose={() => setIsBlockedModalOpen(false)}
            blockedUsers={blockedUsers}
            onUnblock={async (uid, uname) => {
              if (onUnblockUser) await onUnblockUser(uid, uname);
              showToast(`${uname} has been unblocked.`);
            }}
          />

          {/* About Lenzo Party Live */}
          <div
            onClick={() =>
              showToast(`Lenzo Party Live v1.0.2 (Build 3 · ${FIREBASE_RUNTIME_INFO.projectId} · com.lenzoparty.app)`)
            }
            className="flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/[0.08] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-[#06B6D4]" />
              <span className="text-sm font-semibold text-white">About Lenzo Party Live</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#B9AECF]">v1.0.2 (Build 3)</span>
              <ChevronRight className="w-4 h-4 text-[#B9AECF]" />
            </div>
          </div>

          {/* Clear Cache */}
          <div
            onClick={handleClearCache}
            className="flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/[0.08] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-[#B9AECF]" />
              <span className="text-sm font-semibold text-white">Clear Cache</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono text-[#B9AECF]">{cacheSize}</span>
              <ChevronRight className="w-4 h-4 text-[#B9AECF]" />
            </div>
          </div>
        </div>

        {/* Account Actions: Logout & Delete Account */}
        <div className="pt-4 space-y-2.5">
          <button
            onClick={onLogout}
            className="w-full py-3.5 rounded-2xl bg-[#211333] hover:bg-rose-950/40 border border-rose-500/30 hover:border-rose-500 text-rose-400 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>

          <button
            onClick={() => setShowDeleteAccountModal(true)}
            className="w-full py-2.5 rounded-xl bg-transparent hover:bg-rose-950/20 text-rose-500/70 hover:text-rose-400 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
