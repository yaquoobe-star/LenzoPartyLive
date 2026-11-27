import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  Coins,
  FileClock,
  Gift,
  Radio,
  Tv,
  UserPlus,
  Users,
  Wifi,
  ArrowUpRight,
} from 'lucide-react';
import { AdminAuditLogRecord, AdminUserRecord } from '../../services/adminService';
import {
  AdminActiveLiveStream,
  AdminActivePartyRoom,
  AdminReportRecord,
  BackendLiveOverview,
} from '../../services/superAdminService';
import { DualAgencyRecord } from '../../services/agencyService';
import { CoinPurchaseRecord, GiftTransactionRecord } from '../../types';

export type SuperAdminNavSection =
  | 'overview'
  | 'users'
  | 'rooms'
  | 'coins_gifts'
  | 'agencies'
  | 'moderation'
  | 'settings'
  | 'store_progression';

interface AdminOverviewSectionProps {
  users: AdminUserRecord[];
  activeRooms: AdminActivePartyRoom[];
  activeStreams: AdminActiveLiveStream[];
  giftTxs: GiftTransactionRecord[];
  coinPurchases: CoinPurchaseRecord[];
  agencies: DualAgencyRecord[];
  reports: AdminReportRecord[];
  auditLogs: AdminAuditLogRecord[];
  backendLive: BackendLiveOverview | null;
  loading: boolean;
  onNavigate: (section: SuperAdminNavSection) => void;
}

type StatsPeriod = 'daily' | 'weekly' | 'monthly';

function parseIsoMs(value?: string): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.floor(n).toLocaleString();
}

export const AdminOverviewSection: React.FC<AdminOverviewSectionProps> = ({
  users,
  activeRooms,
  activeStreams,
  giftTxs,
  coinPurchases,
  agencies,
  reports,
  auditLogs,
  backendLive,
  loading,
  onNavigate,
}) => {
  const [period, setPeriod] = useState<StatsPeriod>('daily');

  const kpis = useMemo(() => {
    const now = new Date();
    const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let onlineUsersFirestore = 0;
    let totalCoinsInCirculation = 0;
    let newUsersToday = 0;
    let suspendedOrBlocked = 0;

    for (const u of users) {
      if (u.isOnline) onlineUsersFirestore += 1;
      totalCoinsInCirculation += Math.max(0, u.coins || 0);
      const createdMs = parseIsoMs(u.createdAt);
      if (createdMs >= startOfTodayMs) newUsersToday += 1;
      if (u.isBlocked || u.accountStatus === 'suspended' || u.accountStatus === 'blocked') {
        suspendedOrBlocked += 1;
      }
    }

    const totalGiftCoins = giftTxs.reduce((acc, g) => acc + Math.max(0, Number(g.coinAmount || 0)), 0);
    const totalAgencyCoins = agencies.reduce((acc, a) => acc + Math.max(0, Number(a.coinBalance || 0)), 0);
    const activeAgencies = agencies.filter((a) => a.status === 'active').length;
    const openReports = reports.filter((r) => r.status === 'open' || r.status === 'reviewing').length;

    const onlineUsers = Math.max(onlineUsersFirestore, backendLive?.onlineSocketUsers || 0);

    return {
      totalUsers: users.length,
      onlineUsers,
      liveStreamers: activeStreams.length,
      activeRooms: activeRooms.length,
      totalCoinsInCirculation: totalCoinsInCirculation + totalAgencyCoins,
      userWalletCoins: totalCoinsInCirculation,
      agencyStockCoins: totalAgencyCoins,
      giftsCount: giftTxs.length,
      totalGiftCoins,
      totalAgencies: agencies.length,
      activeAgencies,
      newUsersToday,
      openReports,
      suspendedOrBlocked,
      activeSockets: backendLive?.activeWebSocketClients || 0,
    };
  }, [users, activeRooms, activeStreams, giftTxs, agencies, reports, backendLive]);

  const chartBuckets = useMemo(() => {
    const now = new Date();
    const buckets: Array<{
      key: string;
      label: string;
      startMs: number;
      endMs: number;
      newUsers: number;
      giftsCount: number;
      giftCoins: number;
      purchasedCoins: number;
    }> = [];

    if (period === 'daily') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const startMs = d.getTime();
        const endMs = startMs + 86_400_000;
        buckets.push({
          key: d.toISOString().slice(0, 10),
          label: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
          startMs,
          endMs,
          newUsers: 0,
          giftsCount: 0,
          giftCoins: 0,
          purchasedCoins: 0,
        });
      }
    } else if (period === 'weekly') {
      // Last 6 weeks
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
      for (let i = 5; i >= 0; i--) {
        const endMs = todayEnd - i * 7 * 86_400_000;
        const startMs = endMs - 7 * 86_400_000;
        const startDate = new Date(startMs);
        buckets.push({
          key: `w_${i}`,
          label: `${startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
          startMs,
          endMs,
          newUsers: 0,
          giftsCount: 0,
          giftCoins: 0,
          purchasedCoins: 0,
        });
      }
    } else {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        buckets.push({
          key: `${startDate.getFullYear()}-${startDate.getMonth() + 1}`,
          label: startDate.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
          startMs: startDate.getTime(),
          endMs: endDate.getTime(),
          newUsers: 0,
          giftsCount: 0,
          giftCoins: 0,
          purchasedCoins: 0,
        });
      }
    }

    for (const u of users) {
      const ms = parseIsoMs(u.createdAt);
      if (!ms) continue;
      const b = buckets.find((x) => ms >= x.startMs && ms < x.endMs);
      if (b) b.newUsers += 1;
    }

    for (const g of giftTxs) {
      const ms = parseIsoMs(g.createdAt);
      if (!ms) continue;
      const b = buckets.find((x) => ms >= x.startMs && ms < x.endMs);
      if (b) {
        b.giftsCount += 1;
        b.giftCoins += Math.max(0, Number(g.coinAmount || 0));
      }
    }

    for (const p of coinPurchases) {
      const ms = parseIsoMs(p.createdAt);
      if (!ms) continue;
      const b = buckets.find((x) => ms >= x.startMs && ms < x.endMs);
      if (b) {
        b.purchasedCoins += Math.max(0, Number(p.totalCoinsCredited || 0));
      }
    }

    return buckets;
  }, [period, users, giftTxs, coinPurchases]);

  const maxUsersInBucket = Math.max(1, ...chartBuckets.map((b) => b.newUsers));
  const maxGiftCoinsInBucket = Math.max(1, ...chartBuckets.map((b) => b.giftCoins));

  const periodTotals = useMemo(
    () =>
      chartBuckets.reduce(
        (acc, b) => ({
          newUsers: acc.newUsers + b.newUsers,
          giftsCount: acc.giftsCount + b.giftsCount,
          giftCoins: acc.giftCoins + b.giftCoins,
          purchasedCoins: acc.purchasedCoins + b.purchasedCoins,
        }),
        { newUsers: 0, giftsCount: 0, giftCoins: 0, purchasedCoins: 0 }
      ),
    [chartBuckets]
  );

  const statCards: Array<{
    label: string;
    value: string;
    subtext: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
    target?: SuperAdminNavSection;
  }> = [
    {
      label: 'Total Registered Users',
      value: kpis.totalUsers.toLocaleString(),
      subtext: `${kpis.suspendedOrBlocked} restricted accounts`,
      icon: Users,
      accent: 'text-sky-400',
      target: 'users',
    },
    {
      label: 'Online Users',
      value: kpis.onlineUsers.toLocaleString(),
      subtext: `${kpis.activeSockets} active WebSocket connections`,
      icon: Wifi,
      accent: 'text-emerald-400',
      target: 'users',
    },
    {
      label: 'Live Streamers',
      value: kpis.liveStreamers.toLocaleString(),
      subtext: 'Solo video broadcasts live now',
      icon: Tv,
      accent: 'text-rose-400',
      target: 'rooms',
    },
    {
      label: 'Active Party Rooms',
      value: kpis.activeRooms.toLocaleString(),
      subtext: 'Voice & multi-seat rooms open',
      icon: Radio,
      accent: 'text-violet-400',
      target: 'rooms',
    },
    {
      label: 'Coins in Circulation',
      value: formatCompact(kpis.totalCoinsInCirculation),
      subtext: `${formatCompact(kpis.userWalletCoins)} users · ${formatCompact(kpis.agencyStockCoins)} agencies`,
      icon: Coins,
      accent: 'text-[#FFC84A]',
      target: 'coins_gifts',
    },
    {
      label: 'Gifts Sent & Received',
      value: kpis.giftsCount.toLocaleString(),
      subtext: `${formatCompact(kpis.totalGiftCoins)} total coins gifted`,
      icon: Gift,
      accent: 'text-fuchsia-400',
      target: 'coins_gifts',
    },
    {
      label: 'Total Agency Accounts',
      value: kpis.totalAgencies.toLocaleString(),
      subtext: `${kpis.activeAgencies} active verified agencies`,
      icon: Building2,
      accent: 'text-amber-400',
      target: 'agencies',
    },
    {
      label: 'New Users Today',
      value: kpis.newUsersToday.toLocaleString(),
      subtext: `${kpis.openReports} open moderation reports`,
      icon: UserPlus,
      accent: 'text-teal-400',
      target: kpis.openReports > 0 ? 'moderation' : 'users',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Live KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => card.target && onNavigate(card.target)}
              className="group text-left p-4 rounded-xl bg-[#130E24] border border-[#261E40] hover:border-[#FFC84A]/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold text-[#A59BC4] truncate">{card.label}</span>
                <Icon className={`w-4 h-4 shrink-0 ${card.accent}`} />
              </div>
              {loading ? (
                <div className="h-7 w-24 rounded bg-white/10 animate-pulse mb-2" />
              ) : (
                <div className="text-2xl font-bold text-white font-mono tabular-nums tracking-tight">
                  {card.value}
                </div>
              )}
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-[#8E83B0]">
                <span className="truncate">{card.subtext}</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#FFC84A] shrink-0 transition-opacity" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Period Analytics Chart + Breakdown */}
      <div className="rounded-xl bg-[#130E24] border border-[#261E40] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#241C3C]">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#FFC84A]" />
              <span>Platform Growth &amp; Gift Economy Statistics</span>
            </h3>
            <p className="text-xs text-[#988DB9] mt-0.5">
              Computed in real time from Firestore registrations, gift ledger, and verified coin purchases.
            </p>
          </div>
          <div className="inline-flex items-center rounded-lg bg-[#0B0716] border border-[#261E40] p-0.5 self-start sm:self-auto">
            {(['daily', 'weekly', 'monthly'] as StatsPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                  period === p
                    ? 'bg-[#FFC84A] text-[#0B0716]'
                    : 'text-[#A59BC4] hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Period Summary Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 py-4 border-b border-[#241C3C]">
          <div>
            <div className="text-[11px] text-[#8E83B0] uppercase tracking-wider">Period Registrations</div>
            <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
              {periodTotals.newUsers.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#8E83B0] uppercase tracking-wider">Gifts Transferred</div>
            <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
              {periodTotals.giftsCount.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#8E83B0] uppercase tracking-wider">Gift Coin Volume</div>
            <div className="text-lg font-bold text-[#FFC84A] font-mono tabular-nums mt-0.5">
              {formatCompact(periodTotals.giftCoins)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#8E83B0] uppercase tracking-wider">Verified Coin Purchases</div>
            <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
              {formatCompact(periodTotals.purchasedCoins)}
            </div>
          </div>
        </div>

        {/* Dual Responsive SVG Bar Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-5">
          {/* Chart 1: New Users */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#D6CFE9]">New Registered Users</span>
              <span className="text-[11px] font-mono text-sky-400">Peak: {maxUsersInBucket}</span>
            </div>
            <div className="h-44 flex items-end gap-2 sm:gap-3 pt-4 pb-1 px-2 rounded-lg bg-[#0B0716] border border-[#221A38]">
              {chartBuckets.map((b) => {
                const pct = Math.max(4, Math.round((b.newUsers / maxUsersInBucket) * 100));
                return (
                  <div key={b.key} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                    <span className="text-[10px] font-mono tabular-nums text-[#B4A9D1] mb-1">
                      {b.newUsers}
                    </span>
                    <div className="w-full flex items-end justify-center h-28">
                      <div
                        className="w-full max-w-[34px] rounded-t bg-gradient-to-t from-sky-600 to-sky-400 transition-all"
                        style={{ height: `${b.newUsers === 0 ? 4 : pct}%` }}
                        title={`${b.label}: ${b.newUsers} new users`}
                      />
                    </div>
                    <span className="text-[10px] text-[#8E83B0] mt-2 truncate w-full text-center">
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 2: Gift Coins Volume */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#D6CFE9]">Gift Coins Volume</span>
              <span className="text-[11px] font-mono text-[#FFC84A]">
                Peak: {formatCompact(maxGiftCoinsInBucket)}
              </span>
            </div>
            <div className="h-44 flex items-end gap-2 sm:gap-3 pt-4 pb-1 px-2 rounded-lg bg-[#0B0716] border border-[#221A38]">
              {chartBuckets.map((b) => {
                const pct = Math.max(4, Math.round((b.giftCoins / maxGiftCoinsInBucket) * 100));
                return (
                  <div key={b.key} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                    <span className="text-[10px] font-mono tabular-nums text-[#E9D79E] mb-1">
                      {formatCompact(b.giftCoins)}
                    </span>
                    <div className="w-full flex items-end justify-center h-28">
                      <div
                        className="w-full max-w-[34px] rounded-t bg-gradient-to-t from-amber-500 to-[#FFC84A] transition-all"
                        style={{ height: `${b.giftCoins === 0 ? 4 : pct}%` }}
                        title={`${b.label}: ${b.giftCoins.toLocaleString()} coins`}
                      />
                    </div>
                    <span className="text-[10px] text-[#8E83B0] mt-2 truncate w-full text-center">
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Live Operational Overview: Rooms & Streams + Reports & Recent Audit */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Active Sessions Snapshot */}
        <div className="rounded-xl bg-[#130E24] border border-[#261E40] overflow-hidden">
          <div className="px-4 py-3.5 border-b border-[#241C3C] flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-violet-400" />
              <span>Live Sessions Right Now</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('rooms')}
              className="text-xs font-semibold text-[#FFC84A] hover:underline whitespace-nowrap"
            >
              Manage All
            </button>
          </div>
          <div className="divide-y divide-[#211A36]">
            {activeRooms.length === 0 && activeStreams.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8E83B0]">
                No live party rooms or solo streams are active at this moment.
              </div>
            ) : (
              <>
                {activeRooms.slice(0, 4).map((room) => (
                  <div key={room.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{room.title}</div>
                      <div className="text-[11px] text-[#988DB9] truncate">
                        Audio Room · Host: {room.hostName} · ID: <span className="font-mono">{room.displayId}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono tabular-nums">
                      <div className="text-xs font-semibold text-emerald-400">
                        {room.participantsCount} live
                      </div>
                      <div className="text-[10px] text-[#8E83B0]">
                        Seats {room.occupiedSeats}/{room.maxSeats}
                      </div>
                    </div>
                  </div>
                ))}
                {activeStreams.slice(0, 3).map((stream) => (
                  <div key={stream.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{stream.title}</div>
                      <div className="text-[11px] text-[#988DB9] truncate">
                        Solo Video · Host: {stream.hostName}
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono tabular-nums">
                      <div className="text-xs font-semibold text-rose-400">
                        {stream.viewersCount} viewers
                      </div>
                      <div className="text-[10px] text-[#8E83B0]">
                        {formatCompact(stream.giftsCoinValue)} coins
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Moderation Alerts & Recent Admin Activity */}
        <div className="rounded-xl bg-[#130E24] border border-[#261E40] overflow-hidden">
          <div className="px-4 py-3.5 border-b border-[#241C3C] flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileClock className="w-4 h-4 text-[#FFC84A]" />
              <span>Recent Super Admin Activity</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('moderation')}
              className="text-xs font-semibold text-[#FFC84A] hover:underline whitespace-nowrap"
            >
              Moderation &amp; Logs
            </button>
          </div>
          {kpis.openReports > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('moderation')}
              className="w-full px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/25 flex items-center justify-between text-xs text-amber-200 hover:bg-amber-500/15 transition-colors"
            >
              <span className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                {kpis.openReports} open report{kpis.openReports === 1 ? '' : 's'} awaiting review
              </span>
              <span className="font-semibold text-[#FFC84A]">Review →</span>
            </button>
          )}
          <div className="divide-y divide-[#211A36]">
            {auditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8E83B0]">
                No admin actions recorded yet. Every moderation or configuration change is logged here.
              </div>
            ) : (
              auditLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="px-4 py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-white truncate">{log.summary || log.action}</div>
                    <div className="text-[11px] text-[#8E83B0] truncate">
                      {log.action} · by {log.adminEmail}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono tabular-nums text-[#8E83B0] shrink-0">
                    {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
