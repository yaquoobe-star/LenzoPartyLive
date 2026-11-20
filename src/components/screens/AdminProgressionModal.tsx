import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  CheckCircle2,
  AlertCircle,
  Layers,
  Crown,
  Sparkles,
  Award,
  Users,
  FileClock,
  Save,
  RefreshCw,
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { apiFetch } from '../../utils/apiConfig';
import {
  AchievementBadgeDefinition,
  LevelDefinition,
  SuperVipTierDefinition,
  VipTierDefinition,
} from '../../types/levelAndVip';
import { LevelBadge } from '../common/LevelBadge';
import { LevelEmblemBadge } from '../common/LevelEmblemBadge';
import { SuperVipTierBadge, VipTierBadge } from '../common/AvatarWithFrame';
import { VerifiedTick } from '../common/VerifiedBadge';

interface AdminProgressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
}

type AdminTab = 'levels' | 'vip' | 'achievements' | 'users' | 'audit';

export const AdminProgressionModal: React.FC<AdminProgressionModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('levels');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [overview, setOverview] = useState<{
    audit: any;
    levels: LevelDefinition[];
    vipTiers: VipTierDefinition[];
    superVipTiers: SuperVipTierDefinition[];
    achievements: AchievementBadgeDefinition[];
    users: any[];
    unlockHistory: any[];
    auditLogs: any[];
  } | null>(null);

  // Admin edit forms
  const [editingVip, setEditingVip] = useState<{ tier: number; frameName: string; perk0: string } | null>(null);
  const [editingSuperVip, setEditingSuperVip] = useState<{ tier: number; name: string; frameName: string } | null>(null);
  const [editingAch, setEditingAch] = useState<{ id: string; name: string; description: string; targetValue: number } | null>(null);
  const [adjustTargetUid, setAdjustTargetUid] = useState('');
  const [adjustCoins, setAdjustCoins] = useState('0');
  const [adjustAchId, setAdjustAchId] = useState('');
  const [adjustVerificationTier, setAdjustVerificationTier] = useState<'' | 'blue' | 'gold' | 'none' | 'auto'>('');
  const [adjustVerifiedTag, setAdjustVerifiedTag] = useState('');
  const [adjustReason, setAdjustReason] = useState('Admin QA / Support Verification');

  const getTokenHeaders = async (): Promise<Record<string, string>> => {
    const token = await auth.currentUser?.getIdToken(true);
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getTokenHeaders();
      const res = await apiFetch('/api/admin/progression/overview', { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Access denied (HTTP ${res.status})`);
        setOverview(null);
      } else {
        setOverview(data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load admin progression overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOverview();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const notify = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleSaveConfig = async (section: string, id: string | number, patch: Record<string, any>) => {
    try {
      const headers = await getTokenHeaders();
      const res = await apiFetch('/api/admin/progression/config', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ section, id, patch }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to save configuration');
        return;
      }
      setEditingVip(null);
      setEditingSuperVip(null);
      setEditingAch(null);
      notify('Configuration saved & logged in audit trail');
      await fetchOverview();
    } catch (err: any) {
      setError(err?.message || 'Save failed');
    }
  };

  const handleAdjustUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetUid.trim()) {
      setError('Target User ID is required.');
      return;
    }
    const targetUid = adjustTargetUid.trim();
    try {
      const headers = await getTokenHeaders();
      const res = await apiFetch('/api/admin/progression/adjust-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetUserId: targetUid,
          addCoins: Number(adjustCoins || 0),
          awardAchievementId: adjustAchId || undefined,
          verificationTier: adjustVerificationTier || undefined,
          verifiedTag: adjustVerifiedTag.trim() ? adjustVerifiedTag.trim() : undefined,
          reason: adjustReason.trim() || 'Admin adjustment',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Adjustment failed');
        return;
      }

      // Sync verified tick/tag directly to Firestore users/{uid} when assigned by admin
      if (adjustVerificationTier === 'blue' || adjustVerificationTier === 'gold' || adjustVerificationTier === 'none') {
        try {
          const userRef = doc(db, 'users', targetUid);
          const patch: Record<string, any> = {
            verificationTier: adjustVerificationTier,
            isVerified: adjustVerificationTier !== 'none',
          };
          if (adjustVerifiedTag.trim()) {
            patch.verifiedTag = adjustVerifiedTag.trim().slice(0, 32);
          } else if (adjustVerificationTier === 'none') {
            patch.verifiedTag = '';
          }
          await updateDoc(userRef, patch);
        } catch (fsErr) {
          console.warn('Firestore user verification sync notice:', fsErr);
        }
      }

      const verifySummary =
        adjustVerificationTier === 'gold'
          ? ' · Golden Tick (Legend)'
          : adjustVerificationTier === 'blue'
            ? ' · Blue Tick (Respect)'
            : adjustVerificationTier === 'none'
              ? ' · Unverified'
              : '';
      notify(`Updated user ${targetUid} → Level ${data.progression?.currentLevel}${verifySummary}`);
      await fetchOverview();
    } catch (err: any) {
      setError(err?.message || 'Adjustment failed');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#0F071C] border border-[#FFC84A]/35 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#24103F] via-[#1B0C31] to-[#140924] border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#FFC84A]/20 border border-[#FFC84A]/50 text-[#FFC84A] flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-white truncate">
                Lenzo Admin — Progression Management Console
              </h2>
              <p className="text-[11px] text-[#C5B9DE] truncate">
                Authorized Admin: {currentUserEmail || auth.currentUser?.email || 'Not Verified'} · Audited RBAC Protected
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchOverview}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status / Error Banners */}
        {statusMsg && (
          <div className="mx-5 mt-3 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}
        {error && (
          <div className="mx-5 mt-3 px-4 py-2.5 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Mathematical Integrity Bar */}
        {overview?.audit && (
          <div className="mx-5 mt-3 p-3 rounded-2xl bg-[#180C2F] border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div>
              <span className="text-[10px] text-[#B9AECF] block">Total Levels</span>
              <span className="text-sm font-black font-mono text-white">{overview.audit.totalLevels}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#B9AECF] block">Lv 1–50 Exact Sum</span>
              <span className="text-sm font-black font-mono text-emerald-400">
                {overview.audit.sumLevels1To50.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#B9AECF] block">Lv 51–100 Exact Sum</span>
              <span className="text-sm font-black font-mono text-fuchsia-300">
                {overview.audit.sumLevels51To100.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#B9AECF] block">Grand Total (Exact)</span>
              <span className="text-sm font-black font-mono text-[#FFC84A]">
                {overview.audit.grandTotalCoins.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {([
            { id: 'levels', label: 'Levels 0–100', icon: Layers },
            { id: 'vip', label: 'VIP & Super VIP', icon: Crown },
            { id: 'achievements', label: 'Achievements', icon: Award },
            { id: 'users', label: 'Users & Adjust', icon: Users },
            { id: 'audit', label: 'Audit Logs', icon: FileClock },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611]'
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
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && !overview ? (
            <div className="py-16 flex flex-col items-center gap-2 text-[#B9AECF] text-xs">
              <div className="w-8 h-8 border-2 border-[#FFC84A] border-t-transparent rounded-full animate-spin" />
              <span>Verifying Admin Token &amp; Loading Progression Registry...</span>
            </div>
          ) : !overview ? (
            <div className="py-14 text-center space-y-2 rounded-2xl bg-white/[0.03] border border-white/10 px-4">
              <Shield className="w-10 h-10 text-rose-400 mx-auto" />
              <p className="text-sm font-bold text-white">Administrator Authorization Required</p>
              <p className="text-xs text-[#B9AECF] max-w-md mx-auto">
                Only the verified administrator account (yaquoobe@gmail.com) can access or modify Lenzo Party progression tables and audit logs.
              </p>
            </div>
          ) : (
            <>
              {/* TAB: 100 LEVELS TABLE */}
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
                      {overview.levels.map((lvl) => (
                        <tr key={lvl.level} className="hover:bg-white/[0.03]">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <LevelEmblemBadge level={lvl.level} size="xs" />
                              <LevelBadge level={lvl.level} size="xs" />
                            </div>
                          </td>
                          <td className="py-2 px-3 font-bold text-white">{lvl.tierName} {lvl.subRank}</td>
                          <td className="py-2 px-3 font-mono text-white tabular-nums">
                            {lvl.coinsForThisLevel.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 font-mono text-[#FFC84A] tabular-nums">
                            {lvl.cumulativeCoins.toLocaleString()}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              {lvl.vipUnlockTier && <VipTierBadge tier={lvl.vipUnlockTier} size="xs" />}
                              {lvl.superVipUnlockTier && <SuperVipTierBadge tier={lvl.superVipUnlockTier} size="xs" />}
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

              {/* TAB: VIP (12) & SUPER VIP (6) CONFIG */}
              {activeTab === 'vip' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#FFC84A] mb-2.5 flex items-center gap-1.5">
                      <Crown className="w-4 h-4" />
                      <span>12 VIP Tiers (Unlocks Every 8 Levels)</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {overview.vipTiers.map((vip) => (
                        <div
                          key={vip.tier}
                          className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <VipTierBadge tier={vip.tier} size="xs" />
                            <span className="text-[11px] font-mono text-[#C5B9DE]">Unlock: Lv.{vip.unlockLevel}</span>
                          </div>
                          {editingVip?.tier === vip.tier ? (
                            <div className="space-y-2">
                              <input
                                value={editingVip.frameName}
                                onChange={(e) => setEditingVip({ ...editingVip, frameName: e.target.value })}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white"
                                placeholder="Frame Name"
                              />
                              <input
                                value={editingVip.perk0}
                                onChange={(e) => setEditingVip({ ...editingVip, perk0: e.target.value })}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white"
                                placeholder="Primary Perk"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    handleSaveConfig('vip', vip.tier, {
                                      frameName: editingVip.frameName,
                                      perks: [editingVip.perk0, ...vip.perks.slice(1)],
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-[#FFC84A] text-black text-xs font-black flex items-center gap-1"
                                >
                                  <Save className="w-3 h-3" />
                                  <span>Save</span>
                                </button>
                                <button
                                  onClick={() => setEditingVip(null)}
                                  className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate">{vip.frameName}</p>
                                <p className="text-[10px] text-[#B9AECF] truncate">{vip.perks[0]}</p>
                              </div>
                              <button
                                onClick={() =>
                                  setEditingVip({
                                    tier: vip.tier,
                                    frameName: vip.frameName,
                                    perk0: vip.perks[0] || '',
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold shrink-0"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-fuchsia-300 mb-2.5 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>6 Super VIP Tiers (Unlocks Every 12 Levels)</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {overview.superVipTiers.map((sv) => (
                        <div
                          key={sv.tier}
                          className="p-3 rounded-2xl bg-fuchsia-950/20 border border-fuchsia-500/25 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <SuperVipTierBadge tier={sv.tier} size="xs" />
                            <span className="text-[11px] font-mono text-fuchsia-200">Unlock: Lv.{sv.unlockLevel}</span>
                          </div>
                          {editingSuperVip?.tier === sv.tier ? (
                            <div className="space-y-2">
                              <input
                                value={editingSuperVip.name}
                                onChange={(e) => setEditingSuperVip({ ...editingSuperVip, name: e.target.value })}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white"
                              />
                              <input
                                value={editingSuperVip.frameName}
                                onChange={(e) => setEditingSuperVip({ ...editingSuperVip, frameName: e.target.value })}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    handleSaveConfig('super_vip', sv.tier, {
                                      name: editingSuperVip.name,
                                      frameName: editingSuperVip.frameName,
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-fuchsia-500 text-white text-xs font-black"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingSuperVip(null)}
                                  className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate">{sv.name}</p>
                                <p className="text-[10px] text-[#C5B9DE] truncate">{sv.frameName}</p>
                              </div>
                              <button
                                onClick={() =>
                                  setEditingSuperVip({
                                    tier: sv.tier,
                                    name: sv.name,
                                    frameName: sv.frameName,
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold shrink-0"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: ACHIEVEMENTS CONFIG */}
              {activeTab === 'achievements' && (
                <div className="space-y-2.5">
                  {overview.achievements.map((ach) => (
                    <div key={ach.id} className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                      {editingAch?.id === ach.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              value={editingAch.name}
                              onChange={(e) => setEditingAch({ ...editingAch, name: e.target.value })}
                              className="px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white"
                            />
                            <input
                              type="number"
                              value={editingAch.targetValue}
                              onChange={(e) =>
                                setEditingAch({ ...editingAch, targetValue: Number(e.target.value) })
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white font-mono"
                            />
                          </div>
                          <input
                            value={editingAch.description}
                            onChange={(e) => setEditingAch({ ...editingAch, description: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                handleSaveConfig('achievement', ach.id, {
                                  name: editingAch.name,
                                  description: editingAch.description,
                                  targetValue: editingAch.targetValue,
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-[#FFC84A] text-black text-xs font-black"
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={() => setEditingAch(null)}
                              className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-white">{ach.name}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-[#FFC84A]">
                                Target: {ach.targetValue.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#C5B9DE] mt-0.5">{ach.description}</p>
                          </div>
                          <button
                            onClick={() =>
                              setEditingAch({
                                id: ach.id,
                                name: ach.name,
                                description: ach.description,
                                targetValue: ach.targetValue,
                              })
                            }
                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold shrink-0"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAB: USERS & AUDITED ADJUSTMENT */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <form
                    onSubmit={handleAdjustUser}
                    className="p-4 rounded-2xl bg-[#180C2F] border border-[#FFC84A]/30 space-y-3"
                  >
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#FFC84A]">
                      Audited User Progression Adjustment
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        value={adjustTargetUid}
                        onChange={(e) => setAdjustTargetUid(e.target.value)}
                        placeholder="Target User UID"
                        className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-mono"
                      />
                      <input
                        type="number"
                        value={adjustCoins}
                        onChange={(e) => setAdjustCoins(e.target.value)}
                        placeholder="Qualifying Coins Delta (+ or -)"
                        className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-mono"
                      />
                      <select
                        value={adjustAchId}
                        onChange={(e) => setAdjustAchId(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
                      >
                        <option value="">Optional: Award Achievement Badge...</option>
                        {overview.achievements.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.id})
                          </option>
                        ))}
                      </select>
                      <select
                        value={adjustVerificationTier}
                        onChange={(e) => setAdjustVerificationTier(e.target.value as any)}
                        className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
                      >
                        <option value="">Verification Badge: Keep Current</option>
                        <option value="blue">Blue Tick — Verified for Respect</option>
                        <option value="gold">Golden Tick — Verified for Legends</option>
                        <option value="none">Remove Verification Tick</option>
                        <option value="auto">Auto (Level / VIP Based)</option>
                      </select>
                      <input
                        value={adjustVerifiedTag}
                        onChange={(e) => setAdjustVerifiedTag(e.target.value)}
                        maxLength={32}
                        placeholder="Optional Custom Tag (e.g. Respect / Legend)"
                        className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
                      />
                      <input
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        placeholder="Audit Reason (Required)"
                        className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white sm:col-span-2"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-black text-xs font-black"
                    >
                      Apply Audited Adjustment
                    </button>
                  </form>

                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#B9AECF]">
                      Tracked Users ({overview.users.length})
                    </h3>
                    {overview.users.length === 0 ? (
                      <p className="text-xs text-[#B9AECF] py-6 text-center rounded-2xl bg-white/[0.03]">
                        No users recorded in backend progression store yet.
                      </p>
                    ) : (
                      overview.users.map((u: any) => (
                        <div
                          key={u.userId}
                          className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3 flex-wrap"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white">{u.userName || u.userId}</span>
                              {u.verificationTier === 'gold' && <VerifiedTick tier="gold" size="xs" />}
                              {u.verificationTier === 'blue' && <VerifiedTick tier="blue" size="xs" />}
                              <LevelBadge level={u.progression.currentLevel} size="xs" />
                              {u.progression.highestUnlockedVipTier > 0 && (
                                <VipTierBadge tier={u.progression.highestUnlockedVipTier} size="xs" />
                              )}
                              {u.progression.highestUnlockedSuperVipTier > 0 && (
                                <SuperVipTierBadge tier={u.progression.highestUnlockedSuperVipTier} size="xs" />
                              )}
                            </div>
                            <p className="text-[10px] font-mono text-[#B9AECF] mt-1">
                              UID: {u.userId} · Spent: {u.progression.totalQualifyingCoinsSpent.toLocaleString()} coins ·{' '}
                              {u.earnedAchievementsCount}/10 badges
                            </p>
                          </div>
                          <button
                            onClick={() => setAdjustTargetUid(u.userId)}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold"
                          >
                            Select UID
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB: AUDIT LOGS & UNLOCK HISTORY */}
              {activeTab === 'audit' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#FFC84A]">
                    Chronological Audit &amp; Coin Deduction Trail ({overview.auditLogs.length})
                  </h3>
                  {overview.auditLogs.length === 0 ? (
                    <p className="text-xs text-[#B9AECF] py-8 text-center rounded-2xl bg-white/[0.03]">
                      No audit events logged yet.
                    </p>
                  ) : (
                    overview.auditLogs.map((log: any) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px]">
                          <span className="font-black uppercase tracking-wider text-[#FFC84A]">
                            {log.action}
                          </span>
                          <span className="font-mono text-[#B9AECF]">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-white">{log.summary}</p>
                        <p className="text-[10px] font-mono text-[#B9AECF]">
                          Actor: {log.actorEmail || log.actorId}
                          {log.targetUserId ? ` · Target: ${log.targetUserId}` : ''}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
