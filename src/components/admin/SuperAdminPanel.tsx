import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Coins,
  Flag,
  LayoutDashboard,
  Menu,
  Radio,
  RefreshCw,
  Settings,
  Shield,
  ShoppingBag,
  Users,
  X,
} from 'lucide-react';
import { auth } from '../../firebase';
import {
  SUPER_ADMIN_EMAIL,
  isAuthorizedAdminEmail,
} from '../../utils/adminAuth';
import {
  AdminAuditLogRecord,
  AdminUserRecord,
  subscribeAdminAuditLogs,
  subscribeAllUsersForAdmin,
} from '../../services/adminService';
import {
  AdminActiveLiveStream,
  AdminActivePartyRoom,
  AdminAnnouncementRecord,
  AdminAppBannerRecord,
  AdminGiftCatalogRecord,
  AdminReportRecord,
  AppSettingsConfig,
  BackendLiveOverview,
  DEFAULT_APP_SETTINGS,
  fetchBackendLiveOverview,
  subscribeActiveLiveStreamsForAdmin,
  subscribeActivePartyRoomsForAdmin,
  subscribeAllAnnouncementsForAdmin,
  subscribeAllAppBannersForAdmin,
  subscribeAppSettings,
  subscribeGiftCatalogOverrides,
  subscribeReportsForAdmin,
  verifySuperAdminBackendAccess,
} from '../../services/superAdminService';
import {
  subscribeCoinPurchases,
  subscribeGiftTransactions,
} from '../../services/financialService';
import {
  DualAgencyRecord,
  subscribeAllAgenciesForAdmin,
} from '../../services/agencyService';
import { CoinPurchaseRecord, GiftTransactionRecord } from '../../types';
import {
  AdminOverviewSection,
  SuperAdminNavSection,
} from './AdminOverviewSection';
import { AdminUsersAndActivitySection } from './AdminUsersAndActivitySection';
import { AdminLiveRoomsSection } from './AdminLiveRoomsSection';
import { AdminGiftsAndCoinsSection } from './AdminGiftsAndCoinsSection';
import { AdminAgenciesAndHostsSection } from './AdminAgenciesAndHostsSection';
import { AdminModerationSection } from './AdminModerationSection';
import { AdminSettingsSection } from './AdminSettingsSection';
import { AdminStoreAndProgressionSection } from './AdminStoreAndProgressionSection';

interface SuperAdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
}

const NAV_ITEMS: Array<{
  id: SuperAdminNavSection;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'overview',
    label: 'Dashboard Overview',
    description: 'Live platform metrics & growth trends',
    icon: LayoutDashboard,
  },
  {
    id: 'users',
    label: 'User Management',
    description: 'Accounts, status, coins & history',
    icon: Users,
  },
  {
    id: 'rooms',
    label: 'Live Rooms & Streams',
    description: 'Real-time audio/video monitoring',
    icon: Radio,
  },
  {
    id: 'coins_gifts',
    label: 'Coins & Gifts',
    description: 'Gift catalog, ledger & economy',
    icon: Coins,
  },
  {
    id: 'agencies',
    label: 'Agencies & Hosts',
    description: 'Agencies, hosts & settlements',
    icon: Building2,
  },
  {
    id: 'moderation',
    label: 'Reports & Moderation',
    description: 'Complaints, audit log & bans',
    icon: Flag,
  },
  {
    id: 'settings',
    label: 'App Settings',
    description: 'Announcements, banners & config',
    icon: Settings,
  },
  {
    id: 'store_progression',
    label: 'Store & Rankings',
    description: 'Store items, VIP & rankings',
    icon: ShoppingBag,
  },
];

export const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
}) => {
  const [activeSection, setActiveSection] = useState<SuperAdminNavSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Backend Super Admin verification state
  const [backendAuthState, setBackendAuthState] = useState<'checking' | 'verified' | 'denied'>('checking');

  // Real-time Firestore + Server datasets
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [firestoreRooms, setFirestoreRooms] = useState<AdminActivePartyRoom[]>([]);
  const [firestoreStreams, setFirestoreStreams] = useState<AdminActiveLiveStream[]>([]);
  const [backendLive, setBackendLive] = useState<BackendLiveOverview | null>(null);
  const [giftTxs, setGiftTxs] = useState<GiftTransactionRecord[]>([]);
  const [coinPurchases, setCoinPurchases] = useState<CoinPurchaseRecord[]>([]);
  const [agencies, setAgencies] = useState<DualAgencyRecord[]>([]);
  const [reports, setReports] = useState<AdminReportRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogRecord[]>([]);
  const [giftOverrides, setGiftOverrides] = useState<AdminGiftCatalogRecord[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettingsConfig>(DEFAULT_APP_SETTINGS);
  const [announcements, setAnnouncements] = useState<AdminAnnouncementRecord[]>([]);
  const [banners, setBanners] = useState<AdminAppBannerRecord[]>([]);
  const [refreshingLive, setRefreshingLive] = useState(false);

  const liveAuthUser = auth.currentUser;
  const activeEmail = (liveAuthUser?.email || currentUserEmail || '').trim().toLowerCase();
  const isAuthorized = Boolean(liveAuthUser && isAuthorizedAdminEmail(activeEmail));
  const isEmailVerified = Boolean(liveAuthUser?.emailVerified === true);

  const notify = useCallback((msg: string) => {
    setErrorMsg(null);
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg((prev) => (prev === msg ? null : prev)), 4000);
  }, []);

  const reportError = useCallback((msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg((prev) => (prev === msg ? null : prev)), 6000);
  }, []);

  const refreshBackendLive = useCallback(async () => {
    if (!isAuthorized) return;
    setRefreshingLive(true);
    try {
      const overview = await fetchBackendLiveOverview();
      if (overview) setBackendLive(overview);
    } finally {
      setRefreshingLive(false);
    }
  }, [isAuthorized]);

  // Verify backend enforcement & subscribe to real-time Firestore collections strictly for verified Super Admin
  useEffect(() => {
    if (!isOpen || !isAuthorized) {
      setBackendAuthState('denied');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setBackendAuthState('checking');

    verifySuperAdminBackendAccess().then((res) => {
      if (cancelled) return;
      if (res.authorized) {
        setBackendAuthState('verified');
      } else {
        setBackendAuthState('denied');
        if (res.error) reportError(res.error);
      }
    });

    void refreshBackendLive();
    const livePollTimer = window.setInterval(() => {
      void refreshBackendLive();
    }, 20_000);

    const unsubUsers = subscribeAllUsersForAdmin(
      (list) => {
        setUsers(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        reportError(err);
      }
    );
    const unsubRooms = subscribeActivePartyRoomsForAdmin((list) => setFirestoreRooms(list));
    const unsubStreams = subscribeActiveLiveStreamsForAdmin((list) => setFirestoreStreams(list));
    const unsubGifts = subscribeGiftTransactions((list) => setGiftTxs(list));
    const unsubPurchases = subscribeCoinPurchases((list) => setCoinPurchases(list));
    const unsubAgencies = subscribeAllAgenciesForAdmin((list) => setAgencies(list));
    const unsubReports = subscribeReportsForAdmin((list) => setReports(list));
    const unsubAudit = subscribeAdminAuditLogs((list) => setAuditLogs(list));
    const unsubGiftCatalog = subscribeGiftCatalogOverrides((list) => setGiftOverrides(list));
    const unsubSettings = subscribeAppSettings((cfg) => setAppSettings(cfg));
    const unsubAnnouncements = subscribeAllAnnouncementsForAdmin((list) => setAnnouncements(list));
    const unsubBanners = subscribeAllAppBannersForAdmin((list) => setBanners(list));

    return () => {
      cancelled = true;
      window.clearInterval(livePollTimer);
      unsubUsers();
      unsubRooms();
      unsubStreams();
      unsubGifts();
      unsubPurchases();
      unsubAgencies();
      unsubReports();
      unsubAudit();
      unsubGiftCatalog();
      unsubSettings();
      unsubAnnouncements();
      unsubBanners();
    };
  }, [isOpen, isAuthorized, refreshBackendLive, reportError]);

  // Merge Firestore & Backend Server active party rooms cleanly (authoritative server live counts win on conflict)
  const mergedActiveRooms = useMemo(() => {
    const map = new Map<string, AdminActivePartyRoom>();
    firestoreRooms.forEach((r) => map.set(r.id, r));
    (backendLive?.activePartyRooms || []).forEach((srv) => {
      const existing = map.get(srv.id);
      map.set(srv.id, {
        ...(existing || srv),
        ...srv,
        participantsCount: Math.max(srv.participantsCount, existing?.participantsCount || 0),
        occupiedSeats: Math.max(srv.occupiedSeats, existing?.occupiedSeats || 0),
        source: existing ? 'merged' : 'server_live',
      });
    });
    return Array.from(map.values()).sort((a, b) => b.participantsCount - a.participantsCount);
  }, [firestoreRooms, backendLive]);

  const mergedActiveStreams = useMemo(() => {
    const map = new Map<string, AdminActiveLiveStream>();
    firestoreStreams.forEach((s) => map.set(s.id, s));
    (backendLive?.activeLiveStreams || []).forEach((srv) => {
      const existing = map.get(srv.id);
      map.set(srv.id, {
        ...(existing || srv),
        ...srv,
        viewersCount: Math.max(srv.viewersCount, existing?.viewersCount || 0),
        source: existing ? 'merged' : 'server_live',
      });
    });
    return Array.from(map.values()).sort((a, b) => b.viewersCount - a.viewersCount);
  }, [firestoreStreams, backendLive]);

  const openReportsCount = useMemo(
    () => reports.filter((r) => r.status === 'open' || r.status === 'reviewing').length,
    [reports]
  );

  if (!isOpen) return null;

  const activeNavMeta = NAV_ITEMS.find((n) => n.id === activeSection) || NAV_ITEMS[0];

  const handleSelectNav = (id: SuperAdminNavSection) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
  };

  // Hard security deny gate if anyone other than the verified Super Admin attempts to render
  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#090612] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-[#130E24] border border-rose-500/40 p-7 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-rose-500/15 border border-rose-500/35 flex items-center justify-center">
            <Shield className="w-6 h-6 text-rose-400" />
          </div>
          <h2 className="text-base font-bold text-white">Super Admin Access Denied</h2>
          <p className="text-xs text-[#A59BC4] leading-relaxed">
            This panel is strictly restricted to the verified LenzoPartyLive Super Admin account. Unauthorized access attempts are blocked at both the server and database layers.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-[#FFC84A] text-[#0B0716] text-xs font-bold"
          >
            Return to LenzoPartyLive
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#090612] text-white flex overflow-hidden">
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-[#0D091A] border-r border-[#221A3A]">
        <div className="h-16 px-4 border-b border-[#221A3A] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFC84A] to-[#D97706] text-[#090612] flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white tracking-tight truncate">LenzoPartyLive</div>
            <div className="text-[11px] font-medium text-[#FFC84A] truncate">Super Admin Panel</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            const badgeCount =
              item.id === 'rooms'
                ? mergedActiveRooms.length + mergedActiveStreams.length
                : item.id === 'moderation'
                  ? openReportsCount
                  : 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  active
                    ? 'bg-[#FFC84A] text-[#0B0716] font-bold'
                    : 'text-[#B4A9D1] hover:bg-white/[0.05] hover:text-white font-medium'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs truncate">{item.label}</span>
                </span>
                {badgeCount > 0 && (
                  <span
                    className={`text-[10px] font-mono tabular-nums font-bold px-1.5 py-0.5 rounded ${
                      active ? 'bg-[#0B0716]/15 text-[#0B0716]' : 'bg-white/10 text-white'
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3.5 border-t border-[#221A3A] space-y-2.5">
          <div className="px-2.5 py-2 rounded-lg bg-[#130E24] border border-[#261E40]">
            <div className="text-[10px] uppercase tracking-wider text-[#8E83B0]">Verified Super Admin</div>
            <div className="text-[11px] font-mono text-[#FFC84A] truncate mt-0.5" title={activeEmail}>
              {activeEmail}
            </div>
            <div className="text-[10px] mt-1 font-medium text-emerald-400">
              {backendAuthState === 'verified'
                ? 'Server & Firestore Verified'
                : backendAuthState === 'checking'
                  ? 'Verifying token...'
                  : 'Verify Email Required'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to App</span>
          </button>
        </div>
      </aside>

      {/* Mobile Slide-Over Sidebar Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[110] lg:hidden bg-black/70 backdrop-blur-xs flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-[#0D091A] border-r border-[#241C3C] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-14 px-4 border-b border-[#221A3A] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FFC84A] text-[#090612] flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-sm font-bold text-white">Super Admin</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-[#A59BC4] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectNav(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs ${
                      active
                        ? 'bg-[#FFC84A] text-[#0B0716] font-bold'
                        : 'text-[#B4A9D1] hover:bg-white/[0.05] hover:text-white font-medium'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-3 border-t border-[#221A3A]">
              <div className="text-[11px] font-mono text-[#FFC84A] truncate mb-2">{activeEmail}</div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 rounded-lg bg-white/10 text-xs font-semibold text-white flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to App</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar Contract: Breadcrumb on Left, 1-2 Single-Line Actions on Right */}
        <header className="h-14 sm:h-16 px-4 sm:px-6 bg-[#0D091A] border-b border-[#221A3A] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-[#8E83B0]">
                <span className="hidden sm:inline">Super Admin</span>
                <span className="hidden sm:inline">/</span>
                <span className="text-white font-bold text-sm truncate">{activeNavMeta.label}</span>
              </div>
              <p className="hidden sm:block text-[11px] text-[#8E83B0] truncate">
                {activeNavMeta.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void refreshBackendLive()}
              disabled={refreshingLive}
              className="px-3 py-1.5 rounded-lg bg-[#16102A] border border-[#282046] hover:border-[#FFC84A]/50 text-xs font-semibold text-white flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingLive ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Live</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white whitespace-nowrap shrink-0"
            >
              Exit Admin
            </button>
          </div>
        </header>

        {/* Scrollable Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Verification / Feedback Alerts */}
            {!isEmailVerified && (
              <div className="px-4 py-3 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  Your Super Admin email (<span className="font-mono">{SUPER_ADMIN_EMAIL}</span>) is not yet marked verified in Firebase Authentication. Sign in with Google or complete email verification to unlock live Firestore &amp; backend admin writes.
                </span>
              </div>
            )}

            {statusMsg && (
              <div className="px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{statusMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="px-4 py-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Section Router */}
            {activeSection === 'overview' && (
              <AdminOverviewSection
                users={users}
                activeRooms={mergedActiveRooms}
                activeStreams={mergedActiveStreams}
                giftTxs={giftTxs}
                coinPurchases={coinPurchases}
                agencies={agencies}
                reports={reports}
                auditLogs={auditLogs}
                backendLive={backendLive}
                loading={loading}
                onNavigate={setActiveSection}
              />
            )}

            {activeSection === 'users' && (
              <AdminUsersAndActivitySection
                users={users}
                onNotify={notify}
                onError={reportError}
              />
            )}

            {activeSection === 'rooms' && (
              <AdminLiveRoomsSection
                activeRooms={mergedActiveRooms}
                activeStreams={mergedActiveStreams}
                reports={reports}
                onRefreshBackend={() => void refreshBackendLive()}
                onNotify={notify}
                onError={reportError}
              />
            )}

            {activeSection === 'coins_gifts' && (
              <AdminGiftsAndCoinsSection
                giftOverrides={giftOverrides}
                giftTxs={giftTxs}
                onNotify={notify}
                onError={reportError}
              />
            )}

            {activeSection === 'agencies' && (
              <AdminAgenciesAndHostsSection
                onNotify={notify}
                onError={reportError}
              />
            )}

            {activeSection === 'moderation' && (
              <AdminModerationSection
                reports={reports}
                auditLogs={auditLogs}
                onNotify={notify}
                onError={reportError}
              />
            )}

            {activeSection === 'settings' && (
              <AdminSettingsSection
                settings={appSettings}
                announcements={announcements}
                banners={banners}
                onNotify={notify}
                onError={reportError}
              />
            )}

            {activeSection === 'store_progression' && (
              <AdminStoreAndProgressionSection
                onNotify={notify}
                onError={reportError}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
