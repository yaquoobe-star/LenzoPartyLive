import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Shield, 
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
  Wallet
} from 'lucide-react';
import { ScreenType } from '../../types';

interface SettingsScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onLogout: () => void;
  onOpenWallet?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onNavigate,
  onLogout,
  onOpenWallet,
}) => {

  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [cacheSize, setCacheSize] = useState('12.5MB');
  const [language, setLanguage] = useState('English');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleClearCache = () => {
    setCacheSize('0.0MB');
    showToast('App cache successfully cleared! 12.5MB freed.');
  };

  return (
    <div className="w-full pb-20 sm:pb-12 animate-fade-in select-none">
      <div className="max-w-2xl mx-auto px-3.5 sm:px-6 pt-3 space-y-4">
        
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#8B20FF] text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg shadow-[#8B20FF]/50 animate-bounce">
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
                      setShowLanguageModal(false);
                      showToast(`Language set to ${lang}`);
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

        {/* Header Bar matching reference image */}
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
                    WALLET & EARNINGS
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                      PKR CASHOUT
                    </span>
                  </span>
                  <span className="text-[10px] text-[#B9AECF] block">Recharge coins, convert earnings, and request bank payouts</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#FFC84A] group-hover:translate-x-1 transition-transform" />
            </div>
          )}

          {/* Account Security */}
          <div
            onClick={() => showToast('Two-factor authentication and mobile binding verified.')}
            className="flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/[0.08] transition-all cursor-pointer group"
          >

            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#8B20FF]" />
              <span className="text-sm font-semibold text-white">Account Security</span>
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
                setNotifications(!notifications);
                showToast(!notifications ? 'Notifications enabled' : 'Notifications paused');
              }}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                notifications ? 'bg-[#F328D5]' : 'bg-[#211333]'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                notifications ? 'translate-x-5' : 'translate-x-0'
              }`} />
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
                setDarkMode(!darkMode);
                showToast('Midnight dark theme is active for optimal OLED viewing');
              }}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                darkMode ? 'bg-[#8B20FF]' : 'bg-[#211333]'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                darkMode ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Privacy Settings */}
          <div
            onClick={() => showToast('Stealth mode, stream visibility, and message permissions.')}
            className="flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/[0.08] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-[#8B20FF]" />
              <span className="text-sm font-semibold text-white">Privacy Settings</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#B9AECF]" />
          </div>

          {/* Blocked Users */}
          <div
            onClick={() => showToast('No blocked users currently on your account.')}
            className="flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/[0.08] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <UserX className="w-5 h-5 text-rose-400" />
              <span className="text-sm font-semibold text-white">Blocked Users</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#B9AECF]" />
          </div>

          {/* About Linzo Party Live */}
          <div
            onClick={() => showToast('Linzo Party Live v1.0.0 (Android Production Build com.linzo.partylive)')}
            className="flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/[0.08] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-[#06B6D4]" />
              <span className="text-sm font-semibold text-white">About Linzo Party Live</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#B9AECF]">v1.0.0 (Android)</span>
              <ChevronRight className="w-4 h-4 text-[#B9AECF]" />
            </div>
          </div>

          {/* Clear Cache with exact 12.5MB label */}
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
            onClick={async () => {
              const confirmed = window.confirm('Are you sure you want to delete your Linzo Party Live account? This action is permanent and cannot be undone.');
              if (confirmed) {
                try {
                  const { auth } = await import('../../firebase');
                  if (auth.currentUser) {
                    await auth.currentUser.delete();
                    showToast('Your account was permanently deleted.');
                    setTimeout(() => onLogout(), 1200);
                  }
                } catch (e: any) {
                  showToast(e?.message || 'Please log in again before deleting your account.');
                }
              }
            }}
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
