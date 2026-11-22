import React, { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Coins,
  Crown,
  Edit3,
  PauseCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Unlock,
  Users,
  X,
} from 'lucide-react';
import {
  AdminUserRecord,
  adminAdjustUserCoins,
  adminBanDevice,
  adminEditUserProfileAndProgression,
  adminSetUserBlockStatus,
  adminSetUserSuspension,
  adminUnbanDevice,
  subscribeAllUsersForAdmin,
} from '../../services/adminService';
import { VerificationTier } from '../../types';
import { LevelBadge } from '../common/LevelBadge';
import { SuperVipTierBadge, VipTierBadge } from '../common/AvatarWithFrame';
import { VerifiedTick } from '../common/VerifiedBadge';

interface AdminUsersControlTabProps {
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

type StatusFilter = 'all' | 'active' | 'blocked' | 'suspended' | 'device_banned' | 'vip';

const QUICK_COIN_PRESETS = [10_000, 50_000, 100_000, 500_000, 1_000_000, 5_000_000];

const SUSPEND_DURATIONS: Array<{ label: string; hours: number }> = [
  { label: '24 Hours', hours: 24 },
  { label: '7 Days', hours: 24 * 7 },
  { label: '30 Days', hours: 24 * 30 },
  { label: 'Permanent', hours: 0 },
];

export const AdminUsersControlTab: React.FC<AdminUsersControlTabProps> = ({
  onNotify,
  onError,
}) => {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  // Coin form state
  const [coinAmountInput, setCoinAmountInput] = useState('50000');
  const [coinReason, setCoinReason] = useState('Direct Admin Coin Grant');

  // Edit profile / level / VIP state
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editLevel, setEditLevel] = useState('0');
  const [editVipLevel, setEditVipLevel] = useState('0');
  const [editSuperVipLevel, setEditSuperVipLevel] = useState('0');
  const [editVerificationTier, setEditVerificationTier] = useState<VerificationTier>('none');
  const [editVerifiedTag, setEditVerifiedTag] = useState('');

  // Enforcement state
  const [enforcementReason, setEnforcementReason] = useState('');
  const [suspendHours, setSuspendHours] = useState<number>(24);
  const [manualDeviceIdInput, setManualDeviceIdInput] = useState('');

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeAllUsersForAdmin(
      (list) => {
        setUsers(list);
        setLoading(false);
      },
      (errMsg) => {
        setLoading(false);
        onError(errMsg);
      }
    );
    return () => unsub();
  }, [onError]);

  const selectedUser = useMemo(
    () => users.find((u) => u.uid === selectedUid) || null,
    [users, selectedUid]
  );

  // Populate editor fields whenever selected user switches
  useEffect(() => {
    if (!selectedUser) return;
    setEditName(selectedUser.fullName);
    setEditUsername(selectedUser.username.replace(/^@/, ''));
    setEditLevel(String(selectedUser.level));
    setEditVipLevel(String(selectedUser.vipLevel));
    setEditSuperVipLevel(String(selectedUser.superVipLevel));
    setEditVerificationTier(selectedUser.verificationTier);
    setEditVerifiedTag(selectedUser.verifiedTag);
    setEnforcementReason(selectedUser.blockReason || selectedUser.suspendReason || '');
    setManualDeviceIdInput(selectedUser.lastDeviceId || '');
  }, [selectedUser?.uid]);

  const stats = useMemo(() => {
    const now = Date.now();
    let online = 0;
    let blocked = 0;
    let suspended = 0;
    let deviceBanned = 0;
    let vip = 0;
    users.forEach((u) => {
      if (u.isOnline) online += 1;
      if (u.isBlocked || u.accountStatus === 'blocked') blocked += 1;
      if (u.accountStatus === 'suspended' && (!u.suspendedUntil || u.suspendedUntil > now)) {
        suspended += 1;
      }
      if (u.isDeviceBanned) deviceBanned += 1;
      if (u.vipLevel > 0 || u.superVipLevel > 0) vip += 1;
    });
    return { total: users.length, online, blocked, suspended, deviceBanned, vip };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = Date.now();
    return users.filter((u) => {
      if (statusFilter === 'active') {
        if (u.isBlocked || u.accountStatus === 'blocked' || u.accountStatus === 'suspended' || u.isDeviceBanned) {
          return false;
        }
      } else if (statusFilter === 'blocked') {
        if (!u.isBlocked && u.accountStatus !== 'blocked') return false;
      } else if (statusFilter === 'suspended') {
        if (u.accountStatus !== 'suspended' || (u.suspendedUntil > 0 && u.suspendedUntil <= now)) return false;
      } else if (statusFilter === 'device_banned') {
        if (!u.isDeviceBanned) return false;
      } else if (statusFilter === 'vip') {
        if (u.vipLevel <= 0 && u.superVipLevel <= 0) return false;
      }

      if (!q) return true;
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.displayId.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q) ||
        u.lastDeviceId.toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery, statusFilter]);

  const handleCoinAction = async (mode: 'add' | 'deduct' | 'set') => {
    if (!selectedUser) return;
    const amt = Math.trunc(Number(coinAmountInput));
    if (!Number.isFinite(amt) || (mode !== 'set' && amt <= 0) || amt < 0) {
      onError('Please enter a valid coin amount.');
      return;
    }
    setBusyAction(`coins_${mode}`);
    const res = await adminAdjustUserCoins({
      targetUid: selectedUser.uid,
      amount: amt,
      mode,
      reason: coinReason,
    });
    setBusyAction(null);
    if (res.success) {
      onNotify(
        `${selectedUser.fullName}: Coin balance updated to ${(res.newBalance ?? 0).toLocaleString()} coins.`
      );
    } else {
      onError(res.error || 'Failed to adjust coins.');
    }
  };

  const handleSaveProfileAndProgression = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setBusyAction('save_profile');
    const res = await adminEditUserProfileAndProgression({
      targetUid: selectedUser.uid,
      fullName: editName,
      username: editUsername,
      level: Number(editLevel),
      vipLevel: Number(editVipLevel),
      superVipLevel: Number(editSuperVipLevel),
      verificationTier: editVerificationTier,
      verifiedTag: editVerifiedTag,
      reason: 'Admin direct profile, level & VIP update',
    });
    setBusyAction(null);
    if (res.success) {
      onNotify(
        `Saved ${editName.trim()} (@${editUsername.replace(/^@/, '')}) · Lv.${editLevel} · VIP ${editVipLevel}`
      );
    } else {
      onError(res.error || 'Failed to update user profile.');
    }
  };

  const handleToggleBlock = async (blocked: boolean) => {
    if (!selectedUser) return;
    setBusyAction('block');
    const res = await adminSetUserBlockStatus({
      targetUid: selectedUser.uid,
      targetName: selectedUser.fullName,
      blocked,
      reason: enforcementReason || (blocked ? 'Blocked by Lenzo Administration' : 'Unblocked by Administration'),
    });
    setBusyAction(null);
    if (res.success) {
      onNotify(blocked ? `Blocked ${selectedUser.fullName}.` : `Unblocked ${selectedUser.fullName}.`);
    } else {
      onError(res.error || 'Failed to update block status.');
    }
  };

  const handleToggleSuspend = async (suspended: boolean) => {
    if (!selectedUser) return;
    setBusyAction('suspend');
    const res = await adminSetUserSuspension({
      targetUid: selectedUser.uid,
      targetName: selectedUser.fullName,
      suspended,
      durationHours: suspendHours,
      reason: enforcementReason || (suspended ? 'ID Suspended by Lenzo Administration' : 'Suspension lifted'),
    });
    setBusyAction(null);
    if (res.success) {
      onNotify(
        suspended
          ? `Suspended ${selectedUser.fullName} (${suspendHours === 0 ? 'Permanent' : `${suspendHours}h`}).`
          : `Restored ${selectedUser.fullName} from suspension.`
      );
    } else {
      onError(res.error || 'Failed to update suspension status.');
    }
  };

  const handleBanOrUnbanDevice = async (ban: boolean) => {
    if (!selectedUser) return;
    const deviceId = (manualDeviceIdInput || selectedUser.lastDeviceId || '').trim();
    if (!deviceId) {
      onError('No Device ID recorded yet for this account. Enter a Device ID manually or wait for user sign-in.');
      return;
    }
    setBusyAction('device_ban');
    const res = ban
      ? await adminBanDevice({
          deviceId,
          targetUid: selectedUser.uid,
          targetUserName: selectedUser.fullName,
          targetUserEmail: selectedUser.email,
          reason: enforcementReason || 'Device permanently banned by Lenzo Administration',
        })
      : await adminUnbanDevice({
          deviceId,
          targetUid: selectedUser.uid,
          targetUserName: selectedUser.fullName,
        });
    setBusyAction(null);
    if (res.success) {
      onNotify(ban ? `Device ${deviceId} banned immediately.` : `Device ${deviceId} unbanned.`);
    } else {
      onError(res.error || 'Device ban action failed.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Real-Time KPI Summary Strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: 'Total IDs', value: stats.total, color: 'text-white', bg: 'bg-white/[0.04]' },
          { label: 'Online', value: stats.online, color: 'text-emerald-300', bg: 'bg-emerald-500/10' },
          { label: 'VIP Users', value: stats.vip, color: 'text-[#FFC84A]', bg: 'bg-amber-500/10' },
          { label: 'Blocked', value: stats.blocked, color: 'text-rose-300', bg: 'bg-rose-500/10' },
          { label: 'Suspended', value: stats.suspended, color: 'text-orange-300', bg: 'bg-orange-500/10' },
          { label: 'Device Ban', value: stats.deviceBanned, color: 'text-fuchsia-300', bg: 'bg-fuchsia-500/10' },
        ].map((item) => (
          <div
            key={item.label}
            className={`p-2.5 rounded-xl border border-white/10 ${item.bg} text-center`}
          >
            <div className={`text-base font-black font-mono tabular-nums ${item.color}`}>
              {item.value.toLocaleString()}
            </div>
            <div className="text-[10px] font-bold text-[#B9AECF] uppercase tracking-wider">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Live Search & Status Filter Controls */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-[#B9AECF] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Name, @username, Email, Lenzo ID (LP...), UID or Device ID..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-black/45 border border-white/15 text-xs text-white placeholder:text-[#9A8DB5] focus:outline-none focus:border-[#FFC84A]/60"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#B9AECF] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {(
            [
              { id: 'all', label: `All IDs (${stats.total})` },
              { id: 'active', label: 'Active' },
              { id: 'vip', label: `VIP (${stats.vip})` },
              { id: 'blocked', label: `Blocked (${stats.blocked})` },
              { id: 'suspended', label: `Suspended (${stats.suspended})` },
              { id: 'device_banned', label: `Device Banned (${stats.deviceBanned})` },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all ${
                statusFilter === f.id
                  ? 'bg-[#FFC84A] text-[#090611]'
                  : 'bg-white/[0.06] text-[#C5B9DE] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Users List */}
      {loading ? (
        <div className="py-12 flex flex-col items-center gap-2 text-xs text-[#B9AECF]">
          <RefreshCw className="w-6 h-6 animate-spin text-[#FFC84A]" />
          <span>Streaming all user accounts in real time...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
          <Users className="w-8 h-8 text-[#B9AECF]/50 mx-auto" />
          <p className="text-xs font-bold text-white">No matching user accounts found</p>
          <p className="text-[11px] text-[#B9AECF]">Try clearing your search or status filter.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredUsers.map((u) => {
            const isSuspendedActive =
              u.accountStatus === 'suspended' && (!u.suspendedUntil || u.suspendedUntil > Date.now());
            const isSelected = selectedUid === u.uid;

            return (
              <div
                key={u.uid}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isSelected
                    ? 'bg-[#21103C] border-[#FFC84A]/60 shadow-[0_0_24px_rgba(255,200,74,0.12)]'
                    : 'bg-[#160B2B] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <img
                        src={u.profileImage || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.uid}
                        alt={u.fullName}
                        className="w-11 h-11 rounded-full object-cover border border-white/15 bg-black/40"
                      />
                      {u.isOnline && (
                        <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#160B2B] absolute -bottom-0.5 -right-0.5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-black text-white truncate max-w-[180px]">
                          {u.fullName}
                        </span>
                        {u.verificationTier === 'gold' && <VerifiedTick tier="gold" size="xs" />}
                        {u.verificationTier === 'blue' && <VerifiedTick tier="blue" size="xs" />}
                        <LevelBadge level={u.level} size="xs" />
                        {u.vipLevel > 0 && <VipTierBadge tier={u.vipLevel} size="xs" />}
                        {u.superVipLevel > 0 && <SuperVipTierBadge tier={u.superVipLevel} size="xs" />}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#C5B9DE]">
                        <span className="font-semibold text-[#E8DEFA]">{u.username}</span>
                        <span>·</span>
                        <span className="font-mono text-[#FFC84A]">{u.displayId}</span>
                        <span>·</span>
                        <span className="truncate max-w-[190px]">{u.email || 'No email'}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-[11px]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/25 text-[#FFC84A] font-mono font-bold tabular-nums">
                          <Coins className="w-3 h-3" />
                          {u.coins.toLocaleString()}
                        </span>

                        {u.lastDeviceId && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.06] text-[#B9AECF] font-mono text-[10px]">
                            <Smartphone className="w-3 h-3 text-sky-400" />
                            {u.lastDeviceId.slice(0, 14)}
                          </span>
                        )}

                        {u.isBlocked && (
                          <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-200 text-[10px] font-black uppercase">
                            BLOCKED
                          </span>
                        )}
                        {isSuspendedActive && (
                          <span className="px-2 py-0.5 rounded-lg bg-orange-500/20 border border-orange-400/40 text-orange-200 text-[10px] font-black uppercase">
                            SUSPENDED
                          </span>
                        )}
                        {u.isDeviceBanned && (
                          <span className="px-2 py-0.5 rounded-lg bg-fuchsia-500/25 border border-fuchsia-400/45 text-fuchsia-200 text-[10px] font-black uppercase">
                            DEVICE BANNED
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedUid(isSelected ? null : u.uid)}
                    className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 transition-all ${
                      isSelected
                        ? 'bg-white/15 text-white'
                        : 'bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] hover:brightness-110'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isSelected ? 'Close' : 'Control'}</span>
                  </button>
                </div>

                {/* Inline Real-Time Control Console for Selected User */}
                {isSelected && selectedUser && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                    {/* UID & Device Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl bg-black/40 border border-white/[0.07] text-[10px] font-mono text-[#B9AECF]">
                      <div className="truncate">
                        <span className="text-[#8E81AA]">UID:</span> {selectedUser.uid}
                      </div>
                      <div className="truncate">
                        <span className="text-[#8E81AA]">Device:</span>{' '}
                        {selectedUser.lastDeviceId
                          ? `${selectedUser.lastDeviceId} (${selectedUser.lastDeviceInfo || 'Registered'})`
                          : 'Not recorded yet'}
                      </div>
                    </div>

                    {/* SECTION 1: DIRECT USER COINS CONTROL */}
                    <div className="p-3.5 rounded-2xl bg-black/35 border border-amber-400/25 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="text-xs font-black text-[#FFC84A] uppercase tracking-wider flex items-center gap-1.5">
                          <Coins className="w-4 h-4" />
                          <span>Direct User Coins Control</span>
                        </h4>
                        <span className="text-xs font-mono font-black text-white tabular-nums">
                          Balance: {selectedUser.coins.toLocaleString()} coins
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {QUICK_COIN_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCoinAmountInput(String(preset))}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-[11px] font-mono font-bold text-[#FFC84A]"
                          >
                            +{preset >= 1_000_000 ? `${preset / 1_000_000}M` : `${preset / 1_000}K`}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="number"
                          min="0"
                          value={coinAmountInput}
                          onChange={(e) => setCoinAmountInput(e.target.value)}
                          placeholder="Enter coins amount"
                          className="px-3 py-2 rounded-xl bg-black/55 border border-white/15 text-xs text-white font-mono"
                        />
                        <input
                          type="text"
                          value={coinReason}
                          onChange={(e) => setCoinReason(e.target.value)}
                          placeholder="Reason / Note"
                          className="px-3 py-2 rounded-xl bg-black/55 border border-white/15 text-xs text-white"
                        />
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          disabled={busyAction !== null}
                          onClick={() => void handleCoinAction('add')}
                          className="flex-1 min-w-[110px] py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{busyAction === 'coins_add' ? 'Adding...' : 'Add Coins'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyAction !== null}
                          onClick={() => void handleCoinAction('deduct')}
                          className="px-3.5 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/45 border border-rose-400/35 text-rose-200 text-xs font-black disabled:opacity-50"
                        >
                          {busyAction === 'coins_deduct' ? '...' : 'Deduct'}
                        </button>
                        <button
                          type="button"
                          disabled={busyAction !== null}
                          onClick={() => void handleCoinAction('set')}
                          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold disabled:opacity-50"
                        >
                          {busyAction === 'coins_set' ? '...' : 'Set Exact'}
                        </button>
                      </div>
                    </div>

                    {/* SECTION 2: EDIT NAME, USERNAME, LEVEL, VIP & VERIFICATION */}
                    <form
                      onSubmit={handleSaveProfileAndProgression}
                      className="p-3.5 rounded-2xl bg-black/35 border border-fuchsia-400/25 space-y-3"
                    >
                      <h4 className="text-xs font-black text-fuchsia-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-[#FFC84A]" />
                        <span>Edit Name, Username, Level (0–100) &amp; VIP</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[10px] font-bold text-[#B9AECF] block mb-1">
                            Display Name
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            maxLength={60}
                            className="w-full px-3 py-2 rounded-xl bg-black/55 border border-white/15 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-[#B9AECF] block mb-1">
                            Username (without @)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#9A8DB5]">@</span>
                            <input
                              type="text"
                              value={editUsername}
                              onChange={(e) => setEditUsername(e.target.value.replace(/^@+/, ''))}
                              maxLength={36}
                              className="w-full pl-7 pr-3 py-2 rounded-xl bg-black/55 border border-white/15 text-xs text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-[#B9AECF] block mb-1">
                            Level (0 – 100)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={editLevel}
                            onChange={(e) => setEditLevel(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-black/55 border border-white/15 text-xs text-white font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-[#B9AECF] block mb-1">
                              VIP (0–12)
                            </label>
                            <select
                              value={editVipLevel}
                              onChange={(e) => setEditVipLevel(e.target.value)}
                              className="w-full px-2.5 py-2 rounded-xl bg-black/70 border border-white/15 text-xs text-white"
                            >
                              {Array.from({ length: 13 }, (_, i) => (
                                <option key={i} value={i}>
                                  {i === 0 ? 'No VIP' : `VIP ${i}`}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-[#B9AECF] block mb-1">
                              Super VIP (0–6)
                            </label>
                            <select
                              value={editSuperVipLevel}
                              onChange={(e) => setEditSuperVipLevel(e.target.value)}
                              className="w-full px-2.5 py-2 rounded-xl bg-black/70 border border-white/15 text-xs text-white"
                            >
                              {Array.from({ length: 7 }, (_, i) => (
                                <option key={i} value={i}>
                                  {i === 0 ? 'None' : `SVIP ${i}`}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-[#B9AECF] block mb-1">
                            Verification Tick
                          </label>
                          <select
                            value={editVerificationTier}
                            onChange={(e) => setEditVerificationTier(e.target.value as VerificationTier)}
                            className="w-full px-3 py-2 rounded-xl bg-black/70 border border-white/15 text-xs text-white"
                          >
                            <option value="none">None / Standard</option>
                            <option value="blue">Blue Tick — Respect</option>
                            <option value="gold">Golden Tick — Legend</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-[#B9AECF] block mb-1">
                            Custom Verified Tag (Optional)
                          </label>
                          <input
                            type="text"
                            value={editVerifiedTag}
                            onChange={(e) => setEditVerifiedTag(e.target.value)}
                            maxLength={32}
                            placeholder="e.g. Official, Legend"
                            className="w-full px-3 py-2 rounded-xl bg-black/55 border border-white/15 text-xs text-white"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={busyAction !== null}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] hover:brightness-110 text-white text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        <span>
                          {busyAction === 'save_profile'
                            ? 'Saving Live Changes...'
                            : 'Save Profile, Level & VIP (Real-Time)'}
                        </span>
                      </button>
                    </form>

                    {/* SECTION 3: BLOCK USER, SUSPEND ID & DEVICE BAN */}
                    <div className="p-3.5 rounded-2xl bg-black/35 border border-rose-500/25 space-y-3">
                      <h4 className="text-xs font-black text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Block User, Suspend ID &amp; Device Ban</span>
                      </h4>

                      <input
                        type="text"
                        value={enforcementReason}
                        onChange={(e) => setEnforcementReason(e.target.value)}
                        placeholder="Enforcement reason shown to user (e.g. Policy violation, Spam, Fraud)..."
                        className="w-full px-3 py-2 rounded-xl bg-black/55 border border-white/15 text-xs text-white"
                      />

                      {/* Suspend Duration Picker */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-[#B9AECF] mr-1">Suspend Duration:</span>
                        {SUSPEND_DURATIONS.map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => setSuspendHours(opt.hours)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              suspendHours === opt.hours
                                ? 'bg-orange-500 text-black'
                                : 'bg-white/[0.07] text-[#C5B9DE] hover:text-white'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedUser.isBlocked ? (
                          <button
                            type="button"
                            disabled={busyAction !== null}
                            onClick={() => void handleToggleBlock(false)}
                            className="py-2.5 px-3 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-400/40 text-emerald-200 text-xs font-black flex items-center justify-center gap-1.5"
                          >
                            <Unlock className="w-4 h-4" />
                            <span>Unblock User</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyAction !== null}
                            onClick={() => void handleToggleBlock(true)}
                            className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center justify-center gap-1.5"
                          >
                            <Ban className="w-4 h-4" />
                            <span>Block User Permanently</span>
                          </button>
                        )}

                        {selectedUser.accountStatus === 'suspended' ? (
                          <button
                            type="button"
                            disabled={busyAction !== null}
                            onClick={() => void handleToggleSuspend(false)}
                            className="py-2.5 px-3 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-400/40 text-emerald-200 text-xs font-black flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Unsuspend ID</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyAction !== null}
                            onClick={() => void handleToggleSuspend(true)}
                            className="py-2.5 px-3 rounded-xl bg-orange-500/25 hover:bg-orange-500/35 border border-orange-400/45 text-orange-200 text-xs font-black flex items-center justify-center gap-1.5"
                          >
                            <PauseCircle className="w-4 h-4" />
                            <span>
                              Suspend ID ({suspendHours === 0 ? 'Permanent' : `${suspendHours >= 24 ? `${Math.round(suspendHours / 24)}d` : `${suspendHours}h`}`})
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Device Ban Control Row */}
                      <div className="pt-2 border-t border-white/10 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={manualDeviceIdInput}
                            onChange={(e) => setManualDeviceIdInput(e.target.value)}
                            placeholder="User Device ID (auto-filled on login)"
                            className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/55 border border-white/15 text-xs text-white font-mono"
                          />
                          {selectedUser.isDeviceBanned ? (
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() => void handleBanOrUnbanDevice(false)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-400/40 text-emerald-200 text-xs font-black flex items-center gap-1.5 shrink-0"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              <span>Unban Device</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() => void handleBanOrUnbanDevice(true)}
                              className="px-3.5 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-black flex items-center gap-1.5 shrink-0"
                            >
                              <Smartphone className="w-4 h-4" />
                              <span>Ban Device</span>
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-[#A59AB8]">
                          Device Ban immediately locks out this device across all accounts in real time until unbanned.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
