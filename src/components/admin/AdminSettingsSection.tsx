import React, { useEffect, useState } from 'react';
import {
  Coins,
  Headphones,
  Image,
  Megaphone,
  Pause,
  Play,
  Plus,
  Save,
  Send,
  Settings,
  Sliders,
  Trash2,
} from 'lucide-react';
import {
  AdminAnnouncementRecord,
  AdminAppBannerRecord,
  AppSettingsConfig,
  adminDeleteAppAnnouncement,
  adminDeleteAppBanner,
  adminSaveAppBanner,
  adminSaveAppSettings,
  adminToggleAppAnnouncement,
} from '../../services/superAdminService';
import { sendAdminGlobalPushBroadcast } from '../../services/pushNotificationService';
import {
  adminDeleteCoinPackage,
  adminSaveCoinPackage,
  adminSeedOfficialCoinPackages,
} from '../../services/financialService';
import { subscribeCoinPackages } from '../../services/walletService';
import { NotificationCategory, WalletRechargePackage } from '../../types';

interface AdminSettingsSectionProps {
  settings: AppSettingsConfig;
  announcements: AdminAnnouncementRecord[];
  banners: AdminAppBannerRecord[];
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

type SettingsSubTab = 'announcements' | 'banners' | 'coin_packages' | 'app_config' | 'support';

const BANNER_GRADIENTS = [
  { label: 'Lenzo Royal Violet', value: 'from-[#8B20FF] via-[#D946EF] to-[#FFC84A]' },
  { label: 'Imperial Gold', value: 'from-[#F59E0B] via-[#D97706] to-[#78350F]' },
  { label: 'Midnight Emerald', value: 'from-[#059669] via-[#0D9488] to-[#0F172A]' },
  { label: 'Crimson Spotlight', value: 'from-[#E11D48] via-[#9333EA] to-[#1E1B4B]' },
];

export const AdminSettingsSection: React.FC<AdminSettingsSectionProps> = ({
  settings,
  announcements,
  banners,
  onNotify,
  onError,
}) => {
  const [subTab, setSubTab] = useState<SettingsSubTab>('announcements');

  // Announcements form
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annCategory, setAnnCategory] = useState<NotificationCategory>('system');
  const [annPriority, setAnnPriority] = useState<'normal' | 'high' | 'urgent'>('high');
  const [sendingAnn, setSendingAnn] = useState(false);

  // Banner form
  const [bannerDraft, setBannerDraft] = useState<{
    id: string;
    title: string;
    subtitle: string;
    badgeText: string;
    imageUrl: string;
    ctaLabel: string;
    ctaAction: string;
    accentGradient: string;
    priority: string;
    active: boolean;
    startsAt: string;
    endsAt: string;
  }>({
    id: '',
    title: '',
    subtitle: '',
    badgeText: 'EVENT',
    imageUrl: '',
    ctaLabel: 'Explore Now',
    ctaAction: 'open_store',
    accentGradient: BANNER_GRADIENTS[0].value,
    priority: '10',
    active: true,
    startsAt: '',
    endsAt: '',
  });
  const [savingBanner, setSavingBanner] = useState(false);

  // Coin packages live state
  const [packages, setPackages] = useState<WalletRechargePackage[]>([]);
  const [pkgDraft, setPkgDraft] = useState({
    id: '',
    coins: '10000',
    bonusCoins: '500',
    pricePkr: '290',
    displayPrice: 'Rs. 290',
    badge: '',
    enabled: true,
  });
  const [savingPkg, setSavingPkg] = useState(false);

  // Global app config & support form
  const [cfgDraft, setCfgDraft] = useState<Omit<AppSettingsConfig, 'updatedAt' | 'updatedBy'>>({
    maintenanceMode: settings.maintenanceMode,
    maintenanceMessage: settings.maintenanceMessage,
    minAppVersion: settings.minAppVersion,
    welcomeMessage: settings.welcomeMessage,
    supportEmail: settings.supportEmail,
    supportWhatsapp: settings.supportWhatsapp,
    supportTelegram: settings.supportTelegram,
    websiteUrl: settings.websiteUrl,
    privacyPolicyUrl: settings.privacyPolicyUrl,
    termsUrl: settings.termsUrl,
    giftingEnabled: settings.giftingEnabled,
    partyRoomsEnabled: settings.partyRoomsEnabled,
    liveStreamsEnabled: settings.liveStreamsEnabled,
    reelsEnabled: settings.reelsEnabled,
    agencyApplicationsEnabled: settings.agencyApplicationsEnabled,
    registrationsEnabled: settings.registrationsEnabled,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    setCfgDraft({
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage,
      minAppVersion: settings.minAppVersion,
      welcomeMessage: settings.welcomeMessage,
      supportEmail: settings.supportEmail,
      supportWhatsapp: settings.supportWhatsapp,
      supportTelegram: settings.supportTelegram,
      websiteUrl: settings.websiteUrl,
      privacyPolicyUrl: settings.privacyPolicyUrl,
      termsUrl: settings.termsUrl,
      giftingEnabled: settings.giftingEnabled,
      partyRoomsEnabled: settings.partyRoomsEnabled,
      liveStreamsEnabled: settings.liveStreamsEnabled,
      reelsEnabled: settings.reelsEnabled,
      agencyApplicationsEnabled: settings.agencyApplicationsEnabled,
      registrationsEnabled: settings.registrationsEnabled,
    });
  }, [settings]);

  useEffect(() => {
    const unsub = subscribeCoinPackages((list) => setPackages(list));
    return () => unsub();
  }, []);

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) {
      onError('Enter both announcement title and message.');
      return;
    }
    setSendingAnn(true);
    try {
      const result = await sendAdminGlobalPushBroadcast({
        title: annTitle.trim(),
        message: annMessage.trim(),
        category: annCategory,
        priority: annPriority,
      });
      onNotify(
        `Announcement published live! (${result.activeWebSocketClients} live sockets · ${result.webPushSent} push endpoints)`
      );
      setAnnTitle('');
      setAnnMessage('');
    } catch (err: any) {
      onError(err?.message || 'Failed to publish announcement.');
    } finally {
      setSendingAnn(false);
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerDraft.title.trim()) {
      onError('Banner title is required.');
      return;
    }
    setSavingBanner(true);
    const res = await adminSaveAppBanner({
      id: bannerDraft.id || `bnr_${Date.now().toString(36)}`,
      title: bannerDraft.title,
      subtitle: bannerDraft.subtitle,
      badgeText: bannerDraft.badgeText,
      imageUrl: bannerDraft.imageUrl,
      ctaLabel: bannerDraft.ctaLabel,
      ctaAction: bannerDraft.ctaAction,
      accentGradient: bannerDraft.accentGradient,
      priority: Math.max(0, Math.floor(Number(bannerDraft.priority || 10))),
      active: bannerDraft.active,
      startsAt: bannerDraft.startsAt,
      endsAt: bannerDraft.endsAt,
    });
    setSavingBanner(false);
    if (res.success) {
      onNotify(`Event banner "${bannerDraft.title}" saved to Firestore.`);
      setBannerDraft({
        id: '',
        title: '',
        subtitle: '',
        badgeText: 'EVENT',
        imageUrl: '',
        ctaLabel: 'Explore Now',
        ctaAction: 'open_store',
        accentGradient: BANNER_GRADIENTS[0].value,
        priority: '10',
        active: true,
        startsAt: '',
        endsAt: '',
      });
    } else {
      onError(res.error || 'Failed to save event banner.');
    }
  };

  const handleSaveCoinPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const coins = Math.max(100, Math.floor(Number(pkgDraft.coins || 0)));
    const bonusCoins = Math.max(0, Math.floor(Number(pkgDraft.bonusCoins || 0)));
    const pricePkr = Math.max(1, Number(pkgDraft.pricePkr || 0));
    const displayPrice = pkgDraft.displayPrice.trim() || `Rs. ${pricePkr.toLocaleString()}`;
    setSavingPkg(true);
    const res = await adminSaveCoinPackage(
      {
        id: pkgDraft.id || `pkg_${coins}_${Date.now().toString(36)}`,
        coins,
        bonusCoins,
        pricePkr,
        displayPrice,
        badge: pkgDraft.badge.trim() || undefined,
        enabled: pkgDraft.enabled,
      },
      'Saved via Super Admin Panel'
    );
    setSavingPkg(false);
    if (res.success) {
      onNotify(`Coin package (${coins.toLocaleString()} coins) saved.`);
      setPkgDraft({
        id: '',
        coins: '10000',
        bonusCoins: '500',
        pricePkr: '290',
        displayPrice: 'Rs. 290',
        badge: '',
        enabled: true,
      });
    } else {
      onError(res.error || 'Failed to save coin package.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    const res = await adminSaveAppSettings(cfgDraft);
    setSavingSettings(false);
    if (res.success) {
      onNotify('App settings & support information saved to Firestore.');
    } else {
      onError(res.error || 'Failed to save app settings.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      <div className="inline-flex flex-wrap rounded-lg bg-[#0B0716] border border-[#261E40] p-0.5 gap-0.5">
        {(
          [
            { id: 'announcements', label: `Announcements (${announcements.length})`, icon: Megaphone },
            { id: 'banners', label: `Events & Banners (${banners.length})`, icon: Image },
            { id: 'coin_packages', label: `Coin Packages (${packages.length})`, icon: Coins },
            { id: 'app_config', label: 'App Configuration', icon: Sliders },
            { id: 'support', label: 'Support & Contact', icon: Headphones },
          ] as Array<{ id: SettingsSubTab; label: string; icon: React.ComponentType<{ className?: string }> }>
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
                subTab === tab.id ? 'bg-[#FFC84A] text-[#0B0716]' : 'text-[#A59BC4] hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. ANNOUNCEMENTS */}
      {subTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handlePublishAnnouncement}
            className="lg:col-span-5 p-4 sm:p-5 rounded-xl bg-[#130E24] border border-[#261E40] space-y-3.5 self-start"
          >
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#FFC84A]" />
              <span>Broadcast Global Announcement</span>
            </h3>
            <p className="text-xs text-[#988DB9]">
              Saves to Firestore and pushes live to connected users and mobile/web push subscribers.
            </p>
            <div>
              <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Headline</label>
              <input
                type="text"
                required
                maxLength={140}
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="e.g. Weekend PK Championship Live!"
                className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white focus:outline-none focus:border-[#FFC84A]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Message</label>
              <textarea
                rows={4}
                required
                maxLength={500}
                value={annMessage}
                onChange={(e) => setAnnMessage(e.target.value)}
                placeholder="Write the official announcement shown to all users..."
                className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white focus:outline-none focus:border-[#FFC84A]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Category</label>
                <select
                  value={annCategory}
                  onChange={(e) => setAnnCategory(e.target.value as NotificationCategory)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white"
                >
                  <option value="system">System</option>
                  <option value="rooms">Rooms &amp; Events</option>
                  <option value="gifts">Gifts &amp; Rewards</option>
                  <option value="wallet">Wallet &amp; Coins</option>
                  <option value="agency">Agency Update</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Priority</label>
                <select
                  value={annPriority}
                  onChange={(e) => setAnnPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={sendingAnn}
              className="w-full py-2.5 rounded-lg bg-[#FFC84A] hover:bg-[#f5bc38] text-[#0B0716] text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendingAnn ? 'Publishing...' : 'Publish Announcement'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 rounded-xl bg-[#130E24] border border-[#261E40] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#241C3C] text-xs font-bold text-white uppercase tracking-wider">
              Published Announcements ({announcements.length})
            </div>
            {announcements.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8E83B0]">
                No global announcements published yet.
              </div>
            ) : (
              <div className="divide-y divide-[#211A36]">
                {announcements.map((a) => (
                  <div key={a.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{a.title}</span>
                        <span
                          className={`text-[10px] font-mono uppercase font-semibold ${
                            a.active ? 'text-emerald-400' : 'text-[#8E83B0]'
                          }`}
                        >
                          {a.active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className="text-xs text-[#B4A9D1] mt-1">{a.message}</p>
                      <div className="text-[10px] font-mono text-[#8E83B0] mt-1.5">
                        {a.category} · {a.priority} · {a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await adminToggleAppAnnouncement(a.id, !a.active);
                          if (res.success) onNotify(`Announcement ${!a.active ? 'activated' : 'paused'}.`);
                          else onError(res.error || 'Update failed.');
                        }}
                        className="p-1.5 rounded-md bg-white/5 hover:bg-white/15 text-[#D6CFE9]"
                        title={a.active ? 'Pause' : 'Activate'}
                      >
                        {a.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await adminDeleteAppAnnouncement(a.id);
                          if (res.success) onNotify('Announcement deleted.');
                          else onError(res.error || 'Delete failed.');
                        }}
                        className="p-1.5 rounded-md bg-rose-500/15 hover:bg-rose-500/30 text-rose-300"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. EVENTS & BANNERS */}
      {subTab === 'banners' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handleSaveBanner}
            className="lg:col-span-5 p-4 sm:p-5 rounded-xl bg-[#130E24] border border-[#261E40] space-y-3 self-start"
          >
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Image className="w-4 h-4 text-[#FFC84A]" />
              <span>{bannerDraft.id ? 'Edit Event Banner' : 'Create Event Banner'}</span>
            </h3>
            <div>
              <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Banner Title</label>
              <input
                type="text"
                required
                value={bannerDraft.title}
                onChange={(e) => setBannerDraft({ ...bannerDraft, title: e.target.value })}
                placeholder="e.g. Grand Ramzan Gifting Gala"
                className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Subtitle</label>
              <input
                type="text"
                value={bannerDraft.subtitle}
                onChange={(e) => setBannerDraft({ ...bannerDraft, subtitle: e.target.value })}
                placeholder="Win exclusive VIP frames & bonus coins"
                className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Tag Label</label>
                <input
                  type="text"
                  value={bannerDraft.badgeText}
                  onChange={(e) => setBannerDraft({ ...bannerDraft, badgeText: e.target.value })}
                  placeholder="EVENT"
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Priority Order</label>
                <input
                  type="number"
                  min={0}
                  value={bannerDraft.priority}
                  onChange={(e) => setBannerDraft({ ...bannerDraft, priority: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs font-mono text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">CTA Button</label>
                <input
                  type="text"
                  value={bannerDraft.ctaLabel}
                  onChange={(e) => setBannerDraft({ ...bannerDraft, ctaLabel: e.target.value })}
                  placeholder="Explore Now"
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Gradient Theme</label>
                <select
                  value={bannerDraft.accentGradient}
                  onChange={(e) => setBannerDraft({ ...bannerDraft, accentGradient: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white"
                >
                  {BANNER_GRADIENTS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">
                Background Image URL (Optional)
              </label>
              <input
                type="url"
                value={bannerDraft.imageUrl}
                onChange={(e) => setBannerDraft({ ...bannerDraft, imageUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-white cursor-pointer">
              <input
                type="checkbox"
                checked={bannerDraft.active}
                onChange={(e) => setBannerDraft({ ...bannerDraft, active: e.target.checked })}
              />
              <span>Banner Active &amp; Visible</span>
            </label>
            <button
              type="submit"
              disabled={savingBanner}
              className="w-full py-2.5 rounded-lg bg-[#FFC84A] hover:bg-[#f5bc38] text-[#0B0716] text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingBanner ? 'Saving...' : 'Save Event Banner'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {banners.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#130E24] border border-[#261E40] text-center text-xs text-[#8E83B0]">
                No event banners created yet. Add one on the left to display live events across the platform.
              </div>
            ) : (
              banners.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl bg-[#130E24] border border-[#261E40] overflow-hidden"
                >
                  <div className={`p-4 bg-gradient-to-r ${b.accentGradient} text-white`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded">
                        {b.badgeText}
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-black/30 px-2 py-0.5 rounded">
                        {b.active ? 'ACTIVE' : 'PAUSED'} · #{b.priority}
                      </span>
                    </div>
                    <h4 className="text-base font-bold mt-2">{b.title}</h4>
                    {b.subtitle && <p className="text-xs text-white/90 mt-0.5">{b.subtitle}</p>}
                  </div>
                  <div className="px-4 py-2.5 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-[#8E83B0]">ID: {b.id}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setBannerDraft({
                            id: b.id,
                            title: b.title,
                            subtitle: b.subtitle,
                            badgeText: b.badgeText,
                            imageUrl: b.imageUrl,
                            ctaLabel: b.ctaLabel,
                            ctaAction: b.ctaAction,
                            accentGradient: b.accentGradient,
                            priority: String(b.priority),
                            active: b.active,
                            startsAt: b.startsAt,
                            endsAt: b.endsAt,
                          })
                        }
                        className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await adminDeleteAppBanner(b.id, b.title);
                          if (res.success) onNotify(`Banner "${b.title}" deleted.`);
                          else onError(res.error || 'Delete failed.');
                        }}
                        className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. COIN PACKAGES */}
      {subTab === 'coin_packages' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handleSaveCoinPackage}
            className="lg:col-span-5 p-4 sm:p-5 rounded-xl bg-[#130E24] border border-[#261E40] space-y-3 self-start"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#FFC84A]" />
                <span>{pkgDraft.id ? 'Edit Coin Package' : 'Add Coin Package'}</span>
              </h3>
              <button
                type="button"
                onClick={async () => {
                  const res = await adminSeedOfficialCoinPackages();
                  if (res.success) onNotify('Official coin packages seeded into Firestore.');
                  else onError(res.error || 'Seed failed.');
                }}
                className="text-[11px] font-semibold text-[#FFC84A] hover:underline"
              >
                Seed Defaults
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Coins</label>
                <input
                  type="number"
                  required
                  min={100}
                  value={pkgDraft.coins}
                  onChange={(e) => setPkgDraft({ ...pkgDraft, coins: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Bonus Coins</label>
                <input
                  type="number"
                  min={0}
                  value={pkgDraft.bonusCoins}
                  onChange={(e) => setPkgDraft({ ...pkgDraft, bonusCoins: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Price (PKR)</label>
                <input
                  type="number"
                  required
                  min={1}
                  step="0.01"
                  value={pkgDraft.pricePkr}
                  onChange={(e) => setPkgDraft({ ...pkgDraft, pricePkr: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Display Price</label>
                <input
                  type="text"
                  value={pkgDraft.displayPrice}
                  onChange={(e) => setPkgDraft({ ...pkgDraft, displayPrice: e.target.value })}
                  placeholder="Rs. 290"
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs font-mono text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Highlight Label (Optional)</label>
              <input
                type="text"
                value={pkgDraft.badge}
                onChange={(e) => setPkgDraft({ ...pkgDraft, badge: e.target.value })}
                placeholder="e.g. BEST VALUE"
                className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-white cursor-pointer">
              <input
                type="checkbox"
                checked={pkgDraft.enabled}
                onChange={(e) => setPkgDraft({ ...pkgDraft, enabled: e.target.checked })}
              />
              <span>Available for Purchase</span>
            </label>
            <button
              type="submit"
              disabled={savingPkg}
              className="w-full py-2.5 rounded-lg bg-[#FFC84A] hover:bg-[#f5bc38] text-[#0B0716] text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{savingPkg ? 'Saving...' : 'Save Coin Package'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 rounded-xl bg-[#130E24] border border-[#261E40] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#241C3C] text-xs font-bold text-white uppercase tracking-wider">
              Active Coin Packages ({packages.length})
            </div>
            {packages.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8E83B0]">
                No custom packages in Firestore yet. Click &ldquo;Seed Defaults&rdquo; or create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#241C3C] text-[11px] text-[#8E83B0] uppercase">
                      <th className="py-2.5 px-4">Coins</th>
                      <th className="py-2.5 px-4 text-right">Bonus</th>
                      <th className="py-2.5 px-4 text-right">PKR</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#211A36]">
                    {packages.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-4 font-mono font-bold text-[#FFC84A]">
                          {Number(p.coins || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-emerald-400">
                          +{Number(p.bonusCoins || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-white">
                          Rs. {Number(p.pricePkr || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={p.enabled !== false ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
                            {p.enabled !== false ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setPkgDraft({
                                  id: p.id,
                                  coins: String(p.coins),
                                  bonusCoins: String(p.bonusCoins || 0),
                                  pricePkr: String(p.pricePkr),
                                  displayPrice: p.displayPrice || `Rs. ${p.pricePkr}`,
                                  badge: p.badge || '',
                                  enabled: p.enabled !== false,
                                })
                              }
                              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await adminDeleteCoinPackage(p.id, 'Removed via Super Admin Panel');
                                if (res.success) onNotify('Coin package deleted.');
                                else onError(res.error || 'Delete failed.');
                              }}
                              className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. APP CONFIGURATION */}
      {subTab === 'app_config' && (
        <form
          onSubmit={handleSaveSettings}
          className="p-5 rounded-xl bg-[#130E24] border border-[#261E40] space-y-5 max-w-3xl"
        >
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#FFC84A]" />
              <span>Global App Configuration &amp; Feature Controls</span>
            </h3>
            <p className="text-xs text-[#988DB9] mt-0.5">
              Changes are saved to Firestore <code className="font-mono text-[#FFC84A]">/app_settings/global</code>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Minimum App Version</label>
              <input
                type="text"
                value={cfgDraft.minAppVersion}
                onChange={(e) => setCfgDraft({ ...cfgDraft, minAppVersion: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs font-mono text-white"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="inline-flex items-center gap-2.5 text-xs font-semibold text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cfgDraft.maintenanceMode}
                  onChange={(e) => setCfgDraft({ ...cfgDraft, maintenanceMode: e.target.checked })}
                />
                <span>Enable Maintenance Mode</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Maintenance Notice Message</label>
            <input
              type="text"
              value={cfgDraft.maintenanceMessage}
              onChange={(e) => setCfgDraft({ ...cfgDraft, maintenanceMessage: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Welcome Banner Copy</label>
            <input
              type="text"
              value={cfgDraft.welcomeMessage}
              onChange={(e) => setCfgDraft({ ...cfgDraft, welcomeMessage: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white"
            />
          </div>

          <div className="pt-2 border-t border-[#241C3C]">
            <div className="text-xs font-bold text-white mb-3">Platform Feature Switches</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-[#D6CFE9]">
              {(
                [
                  ['giftingEnabled', 'Virtual Gifting System'],
                  ['partyRoomsEnabled', 'Audio Party Rooms'],
                  ['liveStreamsEnabled', 'Solo Video Streams'],
                  ['reelsEnabled', 'Short Video Reels'],
                  ['agencyApplicationsEnabled', 'Agency Applications'],
                  ['registrationsEnabled', 'New User Sign-Ups'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#0B0716] border border-[#241C3C] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={cfgDraft[key]}
                    onChange={(e) => setCfgDraft({ ...cfgDraft, [key]: e.target.checked })}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2.5 rounded-lg bg-[#FFC84A] hover:bg-[#f5bc38] text-[#0B0716] text-xs font-bold flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSettings ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 5. SUPPORT & CONTACT */}
      {subTab === 'support' && (
        <form
          onSubmit={handleSaveSettings}
          className="p-5 rounded-xl bg-[#130E24] border border-[#261E40] space-y-4 max-w-3xl"
        >
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Headphones className="w-4 h-4 text-[#FFC84A]" />
              <span>Official Support &amp; Contact Information</span>
            </h3>
            <p className="text-xs text-[#988DB9] mt-0.5">
              Displayed to users for help desk inquiries, legal policies, and official agency verification.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Support Email</label>
              <input
                type="email"
                required
                value={cfgDraft.supportEmail}
                onChange={(e) => setCfgDraft({ ...cfgDraft, supportEmail: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">WhatsApp Support Number</label>
              <input
                type="text"
                value={cfgDraft.supportWhatsapp}
                onChange={(e) => setCfgDraft({ ...cfgDraft, supportWhatsapp: e.target.value })}
                placeholder="+92 300 0000000"
                className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Telegram / Community Link</label>
              <input
                type="url"
                value={cfgDraft.supportTelegram}
                onChange={(e) => setCfgDraft({ ...cfgDraft, supportTelegram: e.target.value })}
                placeholder="https://t.me/lenzopartylive"
                className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Official Website URL</label>
              <input
                type="url"
                value={cfgDraft.websiteUrl}
                onChange={(e) => setCfgDraft({ ...cfgDraft, websiteUrl: e.target.value })}
                placeholder="https://lenzoparty.com"
                className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Privacy Policy URL</label>
              <input
                type="url"
                value={cfgDraft.privacyPolicyUrl}
                onChange={(e) => setCfgDraft({ ...cfgDraft, privacyPolicyUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Terms of Service URL</label>
              <input
                type="url"
                value={cfgDraft.termsUrl}
                onChange={(e) => setCfgDraft({ ...cfgDraft, termsUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2.5 rounded-lg bg-[#FFC84A] hover:bg-[#f5bc38] text-[#0B0716] text-xs font-bold flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSettings ? 'Saving...' : 'Save Support Details'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
