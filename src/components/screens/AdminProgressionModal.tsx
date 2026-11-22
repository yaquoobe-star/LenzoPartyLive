import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  DollarSign,
  FileClock,
  Layers,
  Shield,
  ShoppingBag,
  Smartphone,
  Users,
  X,
} from 'lucide-react';
import { auth } from '../../firebase';
import { isAuthorizedAdminEmail } from '../../utils/adminAuth';
import { ALL_100_LEVELS } from '../../utils/levelAndVipConfig';
import {
  AdminAuditLogRecord,
  subscribeAdminAuditLogs,
} from '../../services/adminService';
import { LevelBadge } from '../common/LevelBadge';
import { LevelEmblemBadge } from '../common/LevelEmblemBadge';
import { SuperVipTierBadge, VipTierBadge } from '../common/AvatarWithFrame';
import { AdminUsersControlTab } from './AdminUsersControlTab';
import { AdminAgenciesTab } from './AdminAgenciesTab';
import { AdminDeviceBansTab } from './AdminDeviceBansTab';
import { AdminStoreTab } from './AdminStoreTab';
import { AdminFinanceTab } from './AdminFinanceTab';

interface AdminProgressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
}

type AdminTab = 'finance' | 'users' | 'agencies' | 'devices' | 'store' | 'levels' | 'audit';

export const AdminProgressionModal: React.FC<AdminProgressionModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogRecord[]>([]);

  const activeEmail = (auth.currentUser?.email || currentUserEmail || '').trim().toLowerCase();
  const isAuthorized = isAuthorizedAdminEmail(activeEmail);
  const isEmailVerified = auth.currentUser ? auth.currentUser.emailVerified === true : false;

  useEffect(() => {
    if (!isOpen || !isAuthorized) {
      setAuditLogs([]);
      return;
    }
    const unsub = subscribeAdminAuditLogs(
      (logs) => setAuditLogs(logs),
      (msg) => setError(msg)
    );
    return () => unsub();
  }, [isOpen, isAuthorized]);

  if (!isOpen) return null;

  const notify = (msg: string) => {
    setError(null);
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const reportError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  };

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'finance', label: 'Financial Management', icon: DollarSign },
    { id: 'users', label: 'Users Control', icon: Users },
    { id: 'agencies', label: 'Agencies & Coins', icon: Building2 },
    { id: 'devices', label: 'Device Bans', icon: Smartphone },
    { id: 'store', label: 'Store', icon: ShoppingBag },
    { id: 'levels', label: 'Levels 0–100', icon: Layers },
    { id: 'audit', label: `Audit (${auditLogs.length})`, icon: FileClock },
  ];

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl h-[94dvh] sm:h-[90vh] bg-[#0F071E] border border-[#FFC84A]/30 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-gradient-to-r from-[#24103F] via-[#1A0B30] to-[#120722] border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FFC84A] to-[#F59E0B] text-[#090611] flex items-center justify-center shadow-lg shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-white truncate">
                Lenzo Administration Console
              </h2>
              <p className="text-[11px] text-[#C5B9DE] truncate">
                Real-Time User Control · Agencies &amp; System Coins · Device Bans ·{' '}
                <span className="font-mono text-[#FFC84A]">{activeEmail || 'Restricted'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Strict Authorization Gate */}
        {!isAuthorized ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-400/35 flex items-center justify-center">
              <Shield className="w-7 h-7 text-rose-400" />
            </div>
            <h3 className="text-base font-black text-white">Access Denied</h3>
            <p className="text-xs text-[#B9AECF] max-w-sm">
              This Administration Console is strictly restricted to authorized Lenzo Party administrators.
            </p>
          </div>
        ) : (
          <>
            {/* Status / Error / Verification Alerts */}
            {!isEmailVerified && (
              <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Note: Please sign in via Google or verify your admin email in Firebase Auth so live Firestore write permissions are active.
                </span>
              </div>
            )}

            {statusMsg && (
              <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{statusMsg}</span>
              </div>
            )}

            {error && (
              <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-xl bg-rose-500/15 border border-rose-400/40 text-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Tab Bar */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all ${
                      active
                        ? 'bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] shadow-md'
                        : 'bg-white/[0.06] text-[#C5B9DE] hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {activeTab === 'finance' && (
                <AdminFinanceTab onNotify={notify} onError={reportError} />
              )}

              {activeTab === 'users' && (
                <AdminUsersControlTab onNotify={notify} onError={reportError} />
              )}

              {activeTab === 'agencies' && (
                <AdminAgenciesTab onNotify={notify} onError={reportError} />
              )}

              {activeTab === 'devices' && (
                <AdminDeviceBansTab onNotify={notify} onError={reportError} />
              )}

              {activeTab === 'store' && (
                <AdminStoreTab onNotify={notify} onError={reportError} />
              )}

              {activeTab === 'levels' && (
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.06] text-[10px] uppercase tracking-wider text-[#C5B9DE]">
                      <tr>
                        <th className="py-2.5 px-3">Level</th>
                        <th className="py-2.5 px-3">Tier</th>
                        <th className="py-2.5 px-3">Level Cost</th>
                        <th className="py-2.5 px-3">Cumulative</th>
                        <th className="py-2.5 px-3">Milestones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {ALL_100_LEVELS.map((lvl) => (
                        <tr key={lvl.level} className="hover:bg-white/[0.03]">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <LevelEmblemBadge level={lvl.level} size="xs" />
                              <LevelBadge level={lvl.level} size="xs" />
                            </div>
                          </td>
                          <td className="py-2 px-3 font-bold text-white">
                            {lvl.tierName} {lvl.subRank}
                          </td>
                          <td className="py-2 px-3 font-mono text-white tabular-nums">
                            {lvl.coinsForThisLevel.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 font-mono text-[#FFC84A] tabular-nums">
                            {lvl.cumulativeCoins.toLocaleString()}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              {lvl.vipUnlockTier && <VipTierBadge tier={lvl.vipUnlockTier} size="xs" />}
                              {lvl.superVipUnlockTier && (
                                <SuperVipTierBadge tier={lvl.superVipUnlockTier} size="xs" />
                              )}
                              {!lvl.vipUnlockTier && !lvl.superVipUnlockTier && (
                                <span className="text-[#B9AECF]/60">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'audit' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#FFC84A]">
                    Real-Time Administration Audit Trail ({auditLogs.length})
                  </h3>
                  {auditLogs.length === 0 ? (
                    <p className="text-xs text-[#B9AECF] py-10 text-center rounded-2xl bg-white/[0.03] border border-white/10">
                      No administration audit logs recorded yet.
                    </p>
                  ) : (
                    auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-2xl bg-[#160B2B] border border-white/10 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px]">
                          <span className="font-black uppercase tracking-wider text-[#FFC84A]">
                            {log.action}
                          </span>
                          <span className="font-mono text-[#B9AECF]">
                            {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-white">{log.summary}</p>
                        <p className="text-[10px] font-mono text-[#B9AECF]">
                          Admin: {log.adminEmail} · Target: {log.targetLabel} · Reason: {log.reason}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
