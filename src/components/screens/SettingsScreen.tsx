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
  Mail,
  MessageCircle,
  Megaphone,
  ExternalLink,
  BellRing,
  Volume2,
  Vibrate,
  Send,
} from 'lucide-react';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  HostModeratorRecord,
  NotificationPreferences,
  ScreenType,
  UserProfile,
} from '../../types';
import {
  PushPermissionState,
  getPushPermissionState,
  registerDeviceForPushNotifications,
  sendSelfTestPushNotification,
  unregisterDevicePushNotifications,
} from '../../services/pushNotificationService';
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
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  });
  const [pushPermission, setPushPermission] = useState<PushPermissionState>('default');
  const [showPushSettingsModal, setShowPushSettingsModal] = useState(false);
  const [isUpdatingPush, setIsUpdatingPush] = useState(false);
  const [isSendingTestPush, setIsSendingTestPush] = useState(false);
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

  useEffect(() => {
    void getPushPermissionState().then(setPushPermission);
  }, []);

  // Hydrate and subscribe to Firestore user_settings/{uid}
  useEffect(() => {
    const uid = auth.currentUser?.uid || currentUser.id;
    if (!uid || uid === 'user_current_01') return;

    loadUserSettingsFromFirestore(uid).then((settings) => {
      setNotifications(settings.notificationsEnabled);
      setNotifPrefs(settings.notificationPreferences);
      setDarkMode(settings.darkMode);
      setLanguage(settings.language);
      setShowOnlineStatus(settings.showOnlineStatus);
      setAllowDirectMessages(settings.allowDirectMessages);
    });

    const unsub = subscribeUserSettings(uid, (settings) => {
      setNotifications(settings.notificationsEnabled);
      setNotifPrefs(settings.notificationPreferences);
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

        {/* Push Notifications Granular Control Modal */}
        {showPushSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#160C25] border border-white/15 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-[#F328D5]" />
                  Push Notifications
                </h3>
                <button
                  onClick={() => setShowPushSettingsModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Device Push Registration Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#8B20FF]/20 to-[#F328D5]/15 border border-[#F328D5]/30 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-black text-white">Device Push Status</p>
                    <p className="text-[11px] text-[#C5B9DE]">
                      {pushPermission === 'granted'
                        ? 'Active — alerts delivered even when minimized'
                        : pushPermission === 'denied'
                          ? 'Blocked in browser/OS settings — enable in site/app settings'
                          : 'Tap Enable to receive real-time OS push notifications'}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                      pushPermission === 'granted'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/35'
                        : pushPermission === 'denied'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-400/35'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-400/35'
                    }`}
                  >
                    {pushPermission === 'granted' ? 'Active' : pushPermission === 'denied' ? 'Blocked' : 'Off'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isUpdatingPush}
                    onClick={async () => {
                      setIsUpdatingPush(true);
                      try {
                        const res = await registerDeviceForPushNotifications({ requestPermission: true });
                        setPushPermission(res.permission);
                        if (res.permission === 'granted') {
                          setNotifications(true);
                          persistSetting({ notificationsEnabled: true });
                          showToast('Device push notifications activated!');
                        } else if (res.permission === 'denied') {
                          showToast('Permission blocked. Please allow Notifications in device/browser settings.');
                        } else {
                          showToast('Notification permission dismissed.');
                        }
                      } finally {
                        setIsUpdatingPush(false);
                      }
                    }}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-black disabled:opacity-50"
                  >
                    {isUpdatingPush
                      ? 'Activating...'
                      : pushPermission === 'granted'
                        ? 'Refresh Device Subscription'
                        : 'Enable Device Push'}
                  </button>
                  <button
                    type="button"
                    disabled={isSendingTestPush}
                    onClick={async () => {
                      setIsSendingTestPush(true);
                      try {
                        await sendSelfTestPushNotification();
                        showToast('Test push notification dispatched!');
                      } finally {
                        setIsSendingTestPush(false);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingTestPush ? 'Sending...' : 'Test'}</span>
                  </button>
                </div>
              </div>

              {/* Master Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                <div>
                  <p className="text-xs font-extrabold text-white">All Push Notifications</p>
                  <p className="text-[10px] text-[#B9AECF]">Master switch for all real-time alerts</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !notifications;
                    setNotifications(next);
                    persistSetting({ notificationsEnabled: next });
                    if (!next) {
                      void unregisterDevicePushNotifications();
                    } else {
                      void registerDeviceForPushNotifications({ requestPermission: true }).then((r) =>
                        setPushPermission(r.permission)
                      );
                    }
                    showToast(next ? 'All push notifications enabled' : 'Push notifications muted');
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

              {/* Category Preferences */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#B9AECF] px-1">
                  Alert Categories
                </p>
                {(
                  [
                    { key: 'messages', label: 'Direct Messages & Reactions', desc: 'Chats, voice notes, photos & invites' },
                    { key: 'gifts', label: 'Gifts & Diamond Earnings', desc: 'Every virtual gift and Host Diamonds credited' },
                    { key: 'followers', label: 'Followers, Likes & Comments', desc: 'New followers and reel interactions' },
                    { key: 'rooms', label: 'Live Streams & Party Rooms', desc: 'Followed hosts going live & moderator updates' },
                    { key: 'pk', label: 'PK Battle Challenges & Results', desc: 'Incoming PK invites, starts & winners' },
                    { key: 'wallet', label: 'Wallet, Coins & Withdrawals', desc: 'Recharges, payout approvals & transfers' },
                    { key: 'agency', label: 'Agency & Commissions', desc: 'Host contracts, slip orders & agency commissions' },
                    { key: 'progression', label: 'Levels, VIP & Store Unlocks', desc: 'Level ups, VIP upgrades & store rewards' },
                    { key: 'system', label: 'Official Announcements & Security', desc: 'Admin broadcasts & account alerts' },
                  ] as const
                ).map((item) => {
                  const enabled = notifPrefs[item.key];
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{item.label}</p>
                        <p className="text-[10px] text-[#B9AECF] truncate">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...notifPrefs, [item.key]: !enabled };
                          setNotifPrefs(updated);
                          persistSetting({ notificationPreferences: updated });
                        }}
                        className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                          enabled && notifications ? 'bg-[#8B20FF]' : 'bg-[#211333]'
                        }`}
                      >
                        <div
                          className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                            enabled && notifications ? 'translate-x-4.5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Sound & Vibration */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...notifPrefs, soundEnabled: !notifPrefs.soundEnabled };
                    setNotifPrefs(updated);
                    persistSetting({ notificationPreferences: updated });
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                    notifPrefs.soundEnabled
                      ? 'bg-[#8B20FF]/20 border-[#8B20FF]/50 text-white'
                      : 'bg-white/[0.03] border-white/10 text-[#B9AECF]'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Sound: {notifPrefs.soundEnabled ? 'On' : 'Off'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...notifPrefs, vibrateEnabled: !notifPrefs.vibrateEnabled };
                    setNotifPrefs(updated);
                    persistSetting({ notificationPreferences: updated });
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                    notifPrefs.vibrateEnabled
                      ? 'bg-[#F328D5]/20 border-[#F328D5]/50 text-white'
                      : 'bg-white/[0.03] border-white/10 text-[#B9AECF]'
                  }`}
                >
                  <Vibrate className="w-4 h-4" />
                  <span>Vibrate: {notifPrefs.vibrateEnabled ? 'On' : 'Off'}</span>
                </button>
              </div>
            </div>
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

          {/* Push Notifications Row (Opens Full Push Control Panel + Quick Toggle) */}
          <div
            onClick={() => setShowPushSettingsModal(true)}
            className="flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-[#F328D5]/25 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Bell className="w-5 h-5 text-[#F328D5] shrink-0" />
              <div className="min-w-0">
                <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                  Push Notifications
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                      notifications && pushPermission === 'granted'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : notifications
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-white/10 text-[#B9AECF]'
                    }`}
                  >
                    {!notifications ? 'Muted' : pushPermission === 'granted' ? 'Active' : 'Setup'}
                  </span>
                </span>
                <span className="text-[10px] text-[#B9AECF] block truncate">
                  Chats, gifts, live rooms, PK battles, wallet, agency &amp; test push
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#B9AECF] group-hover:translate-x-0.5 transition-transform shrink-0" />
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

          {/* Official Support & Community */}
          <div className="pt-2 space-y-2">
            <div className="px-1 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#B9AECF]">
                Official Support &amp; Community
              </span>
            </div>

            {/* Official Support Email */}
            <div className="flex items-center justify-between gap-2 p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-sky-400/20 hover:border-sky-400/40 transition-all">
              <a
                href="mailto:lenzopartyofficial@gmail.com?subject=Lenzo%20Party%20Live%20Official%20Support"
                className="flex items-center gap-3 min-w-0 flex-1"
              >
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-300 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-white block">Official Support Email</span>
                  <span className="text-xs font-mono text-sky-300 block truncate">
                    lenzopartyofficial@gmail.com
                  </span>
                </div>
              </a>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText('lenzopartyofficial@gmail.com').catch(() => {});
                    showToast('Official Support Email copied!');
                  }}
                  title="Copy Support Email"
                  className="p-2 rounded-xl bg-white/[0.07] hover:bg-white/15 text-[#C5B9DE] hover:text-white transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a
                  href="mailto:lenzopartyofficial@gmail.com?subject=Lenzo%20Party%20Live%20Official%20Support"
                  className="px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/35 text-sky-200 text-[11px] font-bold flex items-center gap-1"
                >
                  <span>Email</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Official WhatsApp Support */}
            <div className="flex items-center justify-between gap-2 p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-emerald-400/25 hover:border-emerald-400/45 transition-all">
              <a
                href="https://wa.me/97470769910?text=Hello%20Lenzo%20Party%20Official%20Support"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 min-w-0 flex-1"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-white block">Official WhatsApp Support</span>
                  <span className="text-xs font-mono text-emerald-300 block truncate">
                    0097470769910
                  </span>
                </div>
              </a>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText('0097470769910').catch(() => {});
                    showToast('Official WhatsApp number copied!');
                  }}
                  title="Copy WhatsApp Number"
                  className="p-2 rounded-xl bg-white/[0.07] hover:bg-white/15 text-[#C5B9DE] hover:text-white transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a
                  href="https://wa.me/97470769910?text=Hello%20Lenzo%20Party%20Official%20Support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#051810] text-[11px] font-black flex items-center gap-1"
                >
                  <span>Chat</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Official WhatsApp Channel */}
            <a
              href="https://whatsapp.com/channel/0029Vb8oDxx3mFY75AcHGd3n"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-[#160C25] to-teal-500/10 hover:opacity-95 border border-emerald-400/35 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-[#051810] flex items-center justify-center shrink-0 shadow-sm">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-black text-white block">
                    Join Official WhatsApp Channel
                  </span>
                  <span className="text-[11px] text-[#C5B9DE] block truncate">
                    Official updates, events &amp; announcements
                  </span>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] font-black flex items-center gap-1 shrink-0 group-hover:bg-emerald-500 group-hover:text-[#051810] transition-colors">
                <span>Join</span>
                <ExternalLink className="w-3 h-3" />
              </span>
            </a>
          </div>

          {/* About Lenzo Party Live */}
          <div
            onClick={() =>
              showToast(`Lenzo Party Live v1.0.6 (Build 7 · ${FIREBASE_RUNTIME_INFO.projectId} · com.lenzoparty.app)`)
            }
            className="flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/[0.08] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <img
                src="/app-icon.png?v=3"
                alt="Lenzo Party LIVE"
                className="w-7 h-7 object-contain drop-shadow-[0_2px_8px_rgba(168,85,247,0.5)] shrink-0"
              />
              <span className="text-sm font-semibold text-white">About Lenzo Party Live</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#B9AECF]">v1.0.6 (Build 7)</span>
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
