import React, { useEffect, useState } from 'react';
import {
  X,
  Plus,
  CheckCircle2,
  Trash2,
  ArrowRightLeft,
  ShieldCheck,
  AlertCircle,
  Mail,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../../types';
import {
  MAX_SAVED_ACCOUNTS,
  SavedDeviceAccount,
  getSavedDeviceAccounts,
  removeAccountFromDevice,
} from '../../services/accountSwitcherService';

interface AccountSwitcherModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  onClose: () => void;
  onSwitchAccount: (account: SavedDeviceAccount) => void;
  onAddAccount: () => void;
}

export const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSwitchAccount,
  onAddAccount,
}) => {
  const [accounts, setAccounts] = useState<SavedDeviceAccount[]>([]);
  const [confirmRemoveUid, setConfirmRemoveUid] = useState<string | null>(null);
  const [switchingUid, setSwitchingUid] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAccounts(getSavedDeviceAccounts());
      setConfirmRemoveUid(null);
      setSwitchingUid(null);
    }
  }, [isOpen, currentUser.id]);

  if (!isOpen) return null;

  const isAtLimit = accounts.length >= MAX_SAVED_ACCOUNTS;

  const handleRemoveFromDevice = (uid: string) => {
    const updated = removeAccountFromDevice(uid);
    setAccounts(updated);
    setConfirmRemoveUid(null);
  };

  const handleSwitch = (account: SavedDeviceAccount) => {
    if (account.uid === currentUser.id) return;
    setSwitchingUid(account.uid);
    onSwitchAccount(account);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#12121a] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#fe2c55]/15 via-[#161623] to-[#25f4ee]/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#fe2c55] to-[#7c3aed] flex items-center justify-center shadow-lg shadow-[#fe2c55]/25">
              <ArrowRightLeft className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">Switch Account</h2>
              <p className="text-[11px] text-white/55 font-medium">
                {accounts.length} / {MAX_SAVED_ACCOUNTS} Saved Accounts on This Device
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/75 transition-colors"
            aria-label="Close Account Switcher"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Assurance Notice */}
        <div className="px-5 pt-3 pb-1">
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-200/85 leading-relaxed">
              Every account keeps its permanent Firebase UID, coins, VIP tier, level, and inventory isolated and preserved. Passwords are never stored on device.
            </p>
          </div>
        </div>

        {/* Account List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5">
          {accounts.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm font-bold text-white/75">No saved accounts yet</p>
              <p className="text-xs text-white/45">Sign in with up to 5 Lenzo Party accounts to switch seamlessly.</p>
            </div>
          ) : (
            accounts.map((account) => {
              const isActive = account.uid === currentUser.id;
              const isConfirmingRemove = confirmRemoveUid === account.uid;
              const isBusy = switchingUid === account.uid;

              return (
                <div
                  key={account.uid}
                  className={`rounded-2xl p-3.5 border transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#fe2c55]/15 via-white/[0.05] to-[#25f4ee]/10 border-[#fe2c55]/40'
                      : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={
                          account.avatar ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
                        }
                        alt={account.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white/15"
                      />
                      {isActive && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#12121a] flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-white truncate">{account.name}</p>
                        {isActive && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/65 truncate">{account.username}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] text-white/45 truncate max-w-[165px]">
                          {account.email}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/75 flex items-center gap-1">
                          {account.authProvider === 'google' ? (
                            <>
                              <Sparkles className="w-2.5 h-2.5 text-[#25f4ee]" /> Google
                            </>
                          ) : (
                            <>
                              <Mail className="w-2.5 h-2.5 text-[#fe2c55]" /> Email
                            </>
                          )}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-200">
                          Lv.{account.level}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isActive && (
                        <button
                          onClick={() => handleSwitch(account)}
                          disabled={Boolean(switchingUid)}
                          className="px-3 py-1.5 rounded-xl bg-[#fe2c55] hover:bg-[#e5254b] text-white text-xs font-black transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isBusy ? 'Switching...' : 'Switch'}
                        </button>
                      )}
                      {!isActive && (
                        <button
                          onClick={() => setConfirmRemoveUid(isConfirmingRemove ? null : account.uid)}
                          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 flex items-center justify-center transition-colors"
                          title="Remove from device"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* In-app Remove Confirmation */}
                  {isConfirmingRemove && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                      <p className="text-[11px] text-white/65 leading-snug">
                        Remove from this device only? Your Firebase account &amp; data stay completely safe.
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setConfirmRemoveUid(null)}
                          className="px-2.5 py-1 rounded-lg bg-white/10 text-white/75 text-[11px] font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleRemoveFromDevice(account.uid)}
                          className="px-2.5 py-1 rounded-lg bg-red-500 text-white text-[11px] font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Add Account or Limit Warning */}
        <div className="p-5 border-t border-white/10 bg-[#0d0d14] space-y-2.5">
          {isAtLimit ? (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200 leading-relaxed">
                Maximum {MAX_SAVED_ACCOUNTS} accounts saved on this device. Remove an inactive account above to add another.
              </p>
            </div>
          ) : (
            <button
              onClick={onAddAccount}
              className="w-full py-3.5 rounded-2xl bg-white text-black hover:bg-white/90 font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Add Account ({accounts.length}/{MAX_SAVED_ACCOUNTS})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
