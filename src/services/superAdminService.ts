import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { isAuthorizedAdminEmail, SUPER_ADMIN_EMAIL } from '../utils/adminAuth';
import { apiFetch } from '../utils/apiConfig';
import { ALL_500_GIFTS } from '../data/giftCatalog';
import { GiftItem } from '../types';

export interface AdminActivePartyRoom {
  id: string;
  displayId: string;
  title: string;
  category: string;
  hostId: string;
  hostName: string;
  hostUsername: string;
  hostAvatar: string;
  status: 'active' | 'empty' | 'closed' | string;
  hostPresent: boolean;
  maxSeats: number;
  occupiedSeats: number;
  participantsCount: number;
  isLocked: boolean;
  allowJoin: boolean;
  announcement: string;
  createdAt: string;
  source: 'server_live' | 'firestore' | 'merged';
}

export interface AdminActiveLiveStream {
  id: string;
  title: string;
  category: string;
  hostId: string;
  hostName: string;
  hostUsername: string;
  hostAvatar: string;
  status: string;
  hostPresent: boolean;
  viewersCount: number;
  likesCount: number;
  commentsCount: number;
  giftsCoinValue: number;
  isPrivate: boolean;
  allowGuests: boolean;
  startTime: number;
  source: 'server_live' | 'firestore' | 'merged';
}

export interface BackendLiveOverview {
  serverTime: string;
  uptimeSeconds: number;
  activeWebSocketClients: number;
  onlineSocketUsers: number;
  activePartyRoomsCount: number;
  activeLiveStreamsCount: number;
  activePartyRooms: AdminActivePartyRoom[];
  activeLiveStreams: AdminActiveLiveStream[];
}

export interface AdminReportRecord {
  id: string;
  reporterUid: string;
  reporterName: string;
  targetType: 'user' | 'room' | 'stream' | 'reel';
  targetId: string;
  targetOwnerUid: string;
  targetLabel: string;
  reason: string;
  details: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  adminNote: string;
  actionTaken: string;
  reviewedBy: string;
  reviewedAt: string;
  createdAt: string;
}

export interface AdminGiftCatalogRecord {
  id: string;
  name: string;
  category: string;
  coins: number;
  icon: string;
  iconUrl?: string;
  imageColor: string;
  animationType: 'pop' | 'glow' | 'float' | 'blast';
  animationUrl?: string;
  enabled: boolean;
  sortOrder: number;
  isCustom?: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export interface AdminAppBannerRecord {
  id: string;
  title: string;
  subtitle: string;
  badgeText: string;
  imageUrl: string;
  ctaLabel: string;
  ctaAction: string;
  accentGradient: string;
  priority: number;
  active: boolean;
  startsAt: string;
  endsAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface AdminAnnouncementRecord {
  id: string;
  title: string;
  message: string;
  category: string;
  priority: 'normal' | 'high' | 'urgent';
  active: boolean;
  adminUid: string;
  adminEmail: string;
  createdAt: string;
}

export interface AppSettingsConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  minAppVersion: string;
  welcomeMessage: string;
  supportEmail: string;
  supportWhatsapp: string;
  supportTelegram: string;
  websiteUrl: string;
  privacyPolicyUrl: string;
  termsUrl: string;
  giftingEnabled: boolean;
  partyRoomsEnabled: boolean;
  liveStreamsEnabled: boolean;
  reelsEnabled: boolean;
  agencyApplicationsEnabled: boolean;
  registrationsEnabled: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface AdminHostMembershipRecord {
  id: string;
  agencyId: string;
  agencyName: string;
  agencyOwnerUid: string;
  hostUid: string;
  hostName: string;
  hostUsername: string;
  hostDisplayId: string;
  hostAvatar: string;
  hostWhatsapp: string;
  status: 'pending' | 'accepted' | 'rejected' | 'removed' | 'cancelled';
  dealCommissionPercent: number;
  dealTargetCoins: number;
  dealTargetHours: number;
  dealNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserActivityHistory {
  walletTransactions: Array<{
    id: string;
    category: string;
    amount: number;
    balanceAfter: number;
    description: string;
    createdAt: string;
  }>;
  giftTransactions: Array<{
    id: string;
    direction: 'sent' | 'received';
    giftName: string;
    coinAmount: number;
    counterpartyId: string;
    createdAt: string;
  }>;
  reportsAgainst: AdminReportRecord[];
}

export const DEFAULT_APP_SETTINGS: AppSettingsConfig = {
  maintenanceMode: false,
  maintenanceMessage: 'LenzoPartyLive is undergoing scheduled maintenance. Please check back shortly.',
  minAppVersion: '1.0.0',
  welcomeMessage: 'Welcome to LenzoPartyLive! Enjoy live voice party rooms, solo streams & VIP rewards.',
  supportEmail: 'lenzopartyofficial@gmail.com',
  supportWhatsapp: '',
  supportTelegram: '',
  websiteUrl: 'https://lenzoparty.com',
  privacyPolicyUrl: 'https://lenzoparty.com/privacy',
  termsUrl: 'https://lenzoparty.com/terms',
  giftingEnabled: true,
  partyRoomsEnabled: true,
  liveStreamsEnabled: true,
  reelsEnabled: true,
  agencyApplicationsEnabled: true,
  registrationsEnabled: true,
  updatedAt: '',
  updatedBy: '',
};

function assertVerifiedSuperAdmin(): { uid: string; email: string } {
  const user = auth.currentUser;
  const email = (user?.email || '').trim().toLowerCase();
  if (!user || !isAuthorizedAdminEmail(email)) {
    throw new Error(`Access denied: Only verified Super Admin (${SUPER_ADMIN_EMAIL}) can perform this action.`);
  }
  if (!user.emailVerified) {
    throw new Error('Super Admin email must be verified in Firebase Authentication before saving changes.');
  }
  return { uid: user.uid, email };
}

function makeDocId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`.replace(/[^a-zA-Z0-9_\-]/g, '');
}

export function normalizeTimestamp(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' && Number.isFinite(val)) return new Date(val).toISOString();
  if (typeof val?.toDate === 'function') {
    try {
      return val.toDate().toISOString();
    } catch {
      return '';
    }
  }
  if (typeof val?.seconds === 'number') {
    return new Date(val.seconds * 1000).toISOString();
  }
  return '';
}

async function writeSuperAdminAuditLog(params: {
  adminUid: string;
  adminEmail: string;
  action: string;
  targetUid: string;
  targetLabel: string;
  summary: string;
  reason: string;
}): Promise<void> {
  const logId = makeDocId('sadm');
  await setDoc(doc(db, 'progression_audit_logs', logId), {
    id: logId,
    adminUid: params.adminUid,
    adminEmail: params.adminEmail,
    action: params.action.slice(0, 80),
    targetUid: params.targetUid.slice(0, 128),
    targetLabel: params.targetLabel.slice(0, 120),
    summary: params.summary.slice(0, 360),
    reason: (params.reason || 'Super Admin action').slice(0, 240),
    createdAt: new Date().toISOString(),
  });
}

// ============================================================================
// 1. BACKEND SUPER ADMIN VERIFICATION & LIVE SERVER OVERVIEW
// ============================================================================
export async function verifySuperAdminBackendAccess(): Promise<{
  authorized: boolean;
  email?: string;
  error?: string;
}> {
  try {
    const res = await apiFetch('/api/admin/verify-access');
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        authorized: false,
        error: errData?.error || `Backend denied Super Admin access (HTTP ${res.status}).`,
      };
    }
    const data = await res.json();
    return { authorized: Boolean(data?.authorized), email: data?.email };
  } catch (err: any) {
    return { authorized: false, error: err?.message || 'Unable to verify Super Admin access with backend.' };
  }
}

export async function fetchBackendLiveOverview(): Promise<BackendLiveOverview | null> {
  try {
    const res = await apiFetch('/api/admin/live-overview');
    if (!res.ok) return null;
    const data = await res.json();
    return data as BackendLiveOverview;
  } catch {
    return null;
  }
}

// ============================================================================
// 2. REAL-TIME PARTY ROOMS & LIVE STREAMS MANAGEMENT
// ============================================================================
export function subscribeActivePartyRoomsForAdmin(
  onUpdate: (rooms: AdminActivePartyRoom[]) => void,
  onError?: (msg: string) => void
) {
  return onSnapshot(
    collection(db, 'party_rooms'),
    (snap) => {
      const rooms: AdminActivePartyRoom[] = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, any>;
          const seatsArr = Array.isArray(data.seats) ? data.seats : [];
          const occupiedSeats = seatsArr.filter((s: any) => Boolean(s && (s.user || s.id || s.userId))).length;
          const status = String(data.status || 'active');
          return {
            id: d.id,
            displayId: String(data.displayId || d.id),
            title: String(data.title || 'Untitled Party Room'),
            category: String(data.category || 'Party'),
            hostId: String(data.host?.id || data.hostId || ''),
            hostName: String(data.host?.name || 'Host'),
            hostUsername: String(data.host?.username || ''),
            hostAvatar: String(data.host?.avatar || ''),
            status,
            hostPresent: data.hostPresent !== false,
            maxSeats: Math.max(1, Number(data.maxSeats || 8)),
            occupiedSeats,
            participantsCount: Math.max(
              occupiedSeats,
              Number(data.numericParticipants ?? data.participantCount ?? data.viewersCount ?? 0) || 0
            ),
            isLocked: Boolean(data.isLocked),
            allowJoin: data.allowJoin !== false,
            announcement: String(data.announcement || ''),
            createdAt: normalizeTimestamp(data.createdAt),
            source: 'firestore' as const,
          };
        })
        .filter((r) => r.status !== 'closed' && r.status !== 'ended')
        .sort((a, b) => b.participantsCount - a.participantsCount);
      onUpdate(rooms);
    },
    (err) => {
      onError?.(err?.message || 'Unable to load active party rooms.');
      onUpdate([]);
    }
  );
}

export function subscribeActiveLiveStreamsForAdmin(
  onUpdate: (streams: AdminActiveLiveStream[]) => void,
  onError?: (msg: string) => void
) {
  return onSnapshot(
    collection(db, 'live_streams'),
    (snap) => {
      const streams: AdminActiveLiveStream[] = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, any>;
          const status = String(data.status || (data.isLive === false ? 'ended' : 'active'));
          return {
            id: d.id,
            title: String(data.title || 'Live Broadcast'),
            category: String(data.category || 'Live'),
            hostId: String(data.host?.id || data.hostId || ''),
            hostName: String(data.host?.name || 'Streamer'),
            hostUsername: String(data.host?.username || ''),
            hostAvatar: String(data.host?.avatar || ''),
            status,
            hostPresent: data.hostPresent !== false,
            viewersCount: Number(data.numericViewers ?? data.viewerCount ?? data.viewersCount ?? 0) || 0,
            likesCount: Number(data.likesCount || 0) || 0,
            commentsCount: Number(data.commentsCount || 0) || 0,
            giftsCoinValue: Number(data.giftsCoinValue || 0) || 0,
            isPrivate: Boolean(data.isPrivate),
            allowGuests: Boolean(data.allowGuests),
            startTime: Number(data.startTime || 0) || Date.parse(normalizeTimestamp(data.createdAt)) || 0,
            source: 'firestore' as const,
          };
        })
        .filter((s) => s.status !== 'closed' && s.status !== 'ended')
        .sort((a, b) => b.viewersCount - a.viewersCount);
      onUpdate(streams);
    },
    (err) => {
      onError?.(err?.message || 'Unable to load active live streams.');
      onUpdate([]);
    }
  );
}

export async function adminEndPartyRoom(params: {
  roomId: string;
  roomTitle?: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = assertVerifiedSuperAdmin();
    const roomId = params.roomId.trim();
    const cleanReason = (params.reason || 'Room ended by Super Admin moderation.').trim().slice(0, 240);

    // 1. Force-close authoritative server WebSocket/runtime session
    await apiFetch(`/api/admin/rooms/${encodeURIComponent(roomId)}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: cleanReason }),
    }).catch(() => null);

    // 2. Remove/close in Firestore so all discovery listeners remove it immediately
    try {
      await deleteDoc(doc(db, 'party_rooms', roomId));
    } catch {
      await updateDoc(doc(db, 'party_rooms', roomId), {
        status: 'closed',
        hostPresent: false,
        announcement: cleanReason,
      }).catch(() => null);
    }

    await writeSuperAdminAuditLog({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: 'room_ended_moderation',
      targetUid: roomId,
      targetLabel: params.roomTitle || roomId,
      summary: `Force-ended Party Room "${params.roomTitle || roomId}" (${roomId})`,
      reason: cleanReason,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to end party room.' };
  }
}

export async function adminEndLiveStream(params: {
  streamId: string;
  streamTitle?: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = assertVerifiedSuperAdmin();
    const streamId = params.streamId.trim();
    const cleanReason = (params.reason || 'Live stream ended by Super Admin moderation.').trim().slice(0, 240);

    await apiFetch(`/api/admin/streams/${encodeURIComponent(streamId)}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: cleanReason }),
    }).catch(() => null);

    try {
      await deleteDoc(doc(db, 'live_streams', streamId));
    } catch {
      await updateDoc(doc(db, 'live_streams', streamId), {
        status: 'ended',
        isLive: false,
        hostPresent: false,
      }).catch(() => null);
    }

    await writeSuperAdminAuditLog({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: 'stream_ended_moderation',
      targetUid: streamId,
      targetLabel: params.streamTitle || streamId,
      summary: `Force-ended Live Stream "${params.streamTitle || streamId}" (${streamId})`,
      reason: cleanReason,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to end live stream.' };
  }
}

// ============================================================================
// 3. USER ACTIVITY & TRANSACTION HISTORY INSPECTOR
// ============================================================================
export async function fetchUserTransactionHistory(uid: string): Promise<UserActivityHistory> {
  const cleanUid = uid.trim();
  if (!cleanUid) {
    return { walletTransactions: [], giftTransactions: [], reportsAgainst: [] };
  }

  const [walletSnap, sentGiftsSnap, receivedGiftsSnap, reportsSnap] = await Promise.all([
    getDocs(query(collection(db, 'wallet_transactions'), where('userId', '==', cleanUid))).catch(() => null),
    getDocs(query(collection(db, 'gift_transactions'), where('senderId', '==', cleanUid))).catch(() => null),
    getDocs(query(collection(db, 'gift_transactions'), where('receiverId', '==', cleanUid))).catch(() => null),
    getDocs(query(collection(db, 'reports'), where('targetOwnerUid', '==', cleanUid))).catch(() => null),
  ]);

  const walletTransactions = (walletSnap?.docs || [])
    .map((d) => {
      const data = d.data() as Record<string, any>;
      return {
        id: d.id,
        category: String(data.category || 'transaction'),
        amount: Number(data.amount || 0),
        balanceAfter: Number(data.balanceAfter || 0),
        description: String(data.description || ''),
        createdAt: normalizeTimestamp(data.createdAt),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 60);

  const giftTransactions = [
    ...(sentGiftsSnap?.docs || []).map((d) => {
      const data = d.data() as Record<string, any>;
      return {
        id: d.id,
        direction: 'sent' as const,
        giftName: String(data.giftName || data.giftId || 'Gift'),
        coinAmount: Number(data.coinAmount || 0),
        counterpartyId: String(data.receiverId || ''),
        createdAt: normalizeTimestamp(data.createdAt),
      };
    }),
    ...(receivedGiftsSnap?.docs || []).map((d) => {
      const data = d.data() as Record<string, any>;
      return {
        id: d.id,
        direction: 'received' as const,
        giftName: String(data.giftName || data.giftId || 'Gift'),
        coinAmount: Number(data.coinAmount || 0),
        counterpartyId: String(data.senderId || ''),
        createdAt: normalizeTimestamp(data.createdAt),
      };
    }),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 60);

  const reportsAgainst = (reportsSnap?.docs || [])
    .map((d) => mapReportDoc(d.id, d.data() as Record<string, any>))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { walletTransactions, giftTransactions, reportsAgainst };
}

// ============================================================================
// 4. GIFT CATALOG MANAGEMENT (REAL FIRESTORE + LIVE MERGE WITH BASE CATALOG)
// ============================================================================
export function subscribeGiftCatalogOverrides(
  onUpdate: (items: AdminGiftCatalogRecord[]) => void,
  onError?: (msg: string) => void
) {
  return onSnapshot(
    collection(db, 'gift_catalog'),
    (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, any>;
          return {
            id: String(data.id || d.id),
            name: String(data.name || 'Gift'),
            category: String(data.category || 'Special'),
            coins: Math.max(1, Math.floor(Number(data.coins || 1))),
            icon: String(data.icon || '🎁'),
            iconUrl: String(data.iconUrl || ''),
            imageColor: String(data.imageColor || 'from-[#8B20FF] to-[#F328D5]'),
            animationType: (['pop', 'glow', 'float', 'blast'].includes(data.animationType)
              ? data.animationType
              : 'glow') as 'pop' | 'glow' | 'float' | 'blast',
            animationUrl: String(data.animationUrl || ''),
            enabled: data.enabled !== false,
            sortOrder: Number(data.sortOrder ?? 100),
            isCustom: Boolean(data.isCustom),
            updatedAt: normalizeTimestamp(data.updatedAt),
            updatedBy: String(data.updatedBy || ''),
          } satisfies AdminGiftCatalogRecord;
        })
        .sort((a, b) => a.sortOrder - b.sortOrder || a.coins - b.coins);
      onUpdate(list);
    },
    (err) => {
      onError?.(err?.message || 'Unable to subscribe to gift catalog.');
      onUpdate([]);
    }
  );
}

/**
 * Merges Super Admin Firestore gift catalog overrides & custom gifts with the base catalog
 * so live rooms and solo streams always display the latest Super Admin gift prices & availability.
 */
export function mergeEffectiveGiftCatalog(overrides: AdminGiftCatalogRecord[]): GiftItem[] {
  if (!overrides.length) return ALL_500_GIFTS;
  const overrideMap = new Map<string, AdminGiftCatalogRecord>();
  overrides.forEach((item) => overrideMap.set(item.id, item));

  const merged: GiftItem[] = [];

  // 1. Custom admin gifts first (sorted by sortOrder)
  const baseIds = new Set(ALL_500_GIFTS.map((g) => g.id));
  overrides
    .filter((item) => !baseIds.has(item.id) && item.enabled)
    .forEach((item) => {
      merged.push({
        id: item.id,
        name: item.name,
        category: item.category as GiftItem['category'],
        coins: item.coins,
        icon: item.icon,
        imageColor: item.imageColor || 'from-[#8B20FF] to-[#F328D5]',
        animationType: item.animationType,
      });
    });

  // 2. Base gifts with any Super Admin overrides (price, name, icon, animation, disabled)
  ALL_500_GIFTS.forEach((base) => {
    const ov = overrideMap.get(base.id);
    if (!ov) {
      merged.push(base);
      return;
    }
    if (!ov.enabled) return;
    merged.push({
      ...base,
      name: ov.name,
      category: ov.category as GiftItem['category'],
      coins: ov.coins,
      icon: ov.icon,
      imageColor: ov.imageColor || base.imageColor,
      animationType: ov.animationType,
    });
  });

  return merged;
}

export async function adminSaveGiftCatalogItem(
  item: Omit<AdminGiftCatalogRecord, 'updatedAt' | 'updatedBy'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = assertVerifiedSuperAdmin();
    const cleanId = (item.id || makeDocId('gift')).trim().replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 80);
    const cleanName = item.name.trim().slice(0, 80);
    const cleanCategory = (item.category || 'Special').trim().slice(0, 40);
    const cleanCoins = Math.max(1, Math.min(100_000_000, Math.floor(Number(item.coins || 1))));
    const cleanIcon = (item.icon || '🎁').trim().slice(0, 24);
    if (!cleanName) return { success: false, error: 'Gift name is required.' };

    const payload: Record<string, any> = {
      id: cleanId,
      name: cleanName,
      category: cleanCategory,
      coins: cleanCoins,
      icon: cleanIcon,
      imageColor: (item.imageColor || 'from-[#8B20FF] to-[#F328D5]').slice(0, 120),
      animationType: ['pop', 'glow', 'float', 'blast'].includes(item.animationType)
        ? item.animationType
        : 'glow',
      enabled: Boolean(item.enabled),
      sortOrder: Math.max(0, Math.min(10000, Math.floor(Number(item.sortOrder || 100)))),
      isCustom: Boolean(item.isCustom),
      updatedAt: new Date().toISOString(),
      updatedBy: admin.email,
    };
    if (item.iconUrl?.trim()) payload.iconUrl = item.iconUrl.trim().slice(0, 1500);
    if (item.animationUrl?.trim()) payload.animationUrl = item.animationUrl.trim().slice(0, 1500);

    await setDoc(doc(db, 'gift_catalog', cleanId), payload);

    await writeSuperAdminAuditLog({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: 'gift_catalog_saved',
      targetUid: cleanId,
      targetLabel: cleanName,
      summary: `Saved gift "${cleanName}" (${cleanIcon}) · ${cleanCoins.toLocaleString()} coins · ${payload.enabled ? 'Active' : 'Disabled'}`,
      reason: 'Gift catalog management',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save gift.' };
  }
}

export async function adminDeleteGiftCatalogItem(
  giftId: string,
  giftName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = assertVerifiedSuperAdmin();
    await deleteDoc(doc(db, 'gift_catalog', giftId));
    await writeSuperAdminAuditLog({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: 'gift_catalog_deleted',
      targetUid: giftId,
      targetLabel: giftName,
      summary: `Deleted gift catalog override/custom item "${giftName}" (${giftId})`,
      reason: 'Gift catalog cleanup',
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete gift.' };
  }
}

// ============================================================================
// 5. REPORTS & MODERATION
// ============================================================================
function mapReportDoc(id: string, data: Record<string, any>): AdminReportRecord {
  const status = ['open', 'reviewing', 'resolved', 'dismissed'].includes(data.status)
    ? data.status
    : 'open';
  const targetType = ['user', 'room', 'stream', 'reel'].includes(data.targetType)
    ? data.targetType
    : 'user';
  return {
    id,
    reporterUid: String(data.reporterUid || ''),
    reporterName: String(data.reporterName || data.reporterUid || 'User'),
    targetType,
    targetId: String(data.targetId || ''),
    targetOwnerUid: String(data.targetOwnerUid || ''),
    targetLabel: String(data.targetLabel || data.targetName || data.targetId || ''),
    reason: String(data.reason || 'Policy violation'),
    details: String(data.details || ''),
    status,
    adminNote: String(data.adminNote || ''),
    actionTaken: String(data.actionTaken || ''),
    reviewedBy: String(data.reviewedBy || ''),
    reviewedAt: normalizeTimestamp(data.reviewedAt),
    createdAt: normalizeTimestamp(data.createdAt),
  };
}

export function subscribeReportsForAdmin(
  onUpdate: (reports: AdminReportRecord[]) => void,
  onError?: (msg: string) => void
) {
  return onSnapshot(
    collection(db, 'reports'),
    (snap) => {
      const list = snap.docs
        .map((d) => mapReportDoc(d.id, d.data() as Record<string, any>))
        .sort((a, b) => {
          const priority = (s: string) => (s === 'open' ? 0 : s === 'reviewing' ? 1 : 2);
          if (priority(a.status) !== priority(b.status)) return priority(a.status) - priority(b.status);
          return b.createdAt.localeCompare(a.createdAt);
        });
      onUpdate(list);
    },
    (err) => {
      onError?.(err?.message || 'Unable to load moderation reports.');
      onUpdate([]);
    }
  );
}

export async function adminUpdateReportStatus(params: {
  reportId: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  adminNote?: string;
  actionTaken?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = assertVerifiedSuperAdmin();
    const nowIso = new Date().toISOString();
    await updateDoc(doc(db, 'reports', params.reportId), {
      status: params.status,
      adminNote: (params.adminNote || '').trim().slice(0, 400),
      actionTaken: (params.actionTaken || '').trim().slice(0, 200),
      reviewedBy: admin.email,
      reviewedAt: nowIso,
    });

    await writeSuperAdminAuditLog({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: `report_${params.status}`,
      targetUid: params.reportId,
      targetLabel: params.reportId,
      summary: `Marked report ${params.reportId} as ${params.status}${params.actionTaken ? ` (${params.actionTaken})` : ''}`,
      reason: params.adminNote?.trim() || `Report status changed to ${params.status}`,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update report.' };
  }
}

// ============================================================================
// 6. HOST AGENCY MEMBERSHIPS (ADMIN OVERSIGHT)
// ============================================================================
export function subscribeAllAgencyHostRequestsForAdmin(
  onUpdate: (items: AdminHostMembershipRecord[]) => void,
  onError?: (msg: string) => void
) {
  return onSnapshot(
    collection(db, 'agency_host_requests'),
    (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, any>;
          return {
            id: d.id,
            agencyId: String(data.agencyId || ''),
            agencyName: String(data.agencyName || ''),
            agencyOwnerUid: String(data.agencyOwnerUid || ''),
            hostUid: String(data.hostUid || ''),
            hostName: String(data.hostName || 'Host'),
            hostUsername: String(data.hostUsername || ''),
            hostDisplayId: String(data.hostDisplayId || ''),
            hostAvatar: String(data.hostAvatar || ''),
            hostWhatsapp: String(data.hostWhatsapp || ''),
            status: (['pending', 'accepted', 'rejected', 'removed', 'cancelled'].includes(data.status)
              ? data.status
              : 'pending') as AdminHostMembershipRecord['status'],
            dealCommissionPercent: Number(data.dealCommissionPercent || 0),
            dealTargetCoins: Number(data.dealTargetCoins || 0),
            dealTargetHours: Number(data.dealTargetHours || 0),
            dealNotes: String(data.dealNotes || ''),
            createdAt: normalizeTimestamp(data.createdAt),
            updatedAt: normalizeTimestamp(data.updatedAt),
          } satisfies AdminHostMembershipRecord;
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt));
      onUpdate(list);
    },
    (err) => {
      onError?.(err?.message || 'Unable to load agency host memberships.');
      onUpdate([]);
    }
  );
}

export async function adminUpdateAgencyHostMembership(params: {
  request: AdminHostMembershipRecord;
  status: 'accepted' | 'rejected' | 'removed';
  dealCommissionPercent?: number;
  dealTargetCoins?: number;
  dealTargetHours?: number;
  dealNotes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = assertVerifiedSuperAdmin();
    const nowIso = new Date().toISOString();
    const safeComm = Math.max(0, Math.min(100, Number(params.dealCommissionPercent ?? params.request.dealCommissionPercent ?? 0)));
    const safeTargetCoins = Math.max(0, Math.floor(Number(params.dealTargetCoins ?? params.request.dealTargetCoins ?? 0)));
    const safeTargetHours = Math.max(0, Math.min(744, Number(params.dealTargetHours ?? params.request.dealTargetHours ?? 0)));

    await updateDoc(doc(db, 'agency_host_requests', params.request.id), {
      status: params.status,
      dealCommissionPercent: safeComm,
      dealTargetCoins: safeTargetCoins,
      dealTargetHours: safeTargetHours,
      dealNotes: (params.dealNotes ?? params.request.dealNotes ?? '').slice(0, 300),
      updatedAt: nowIso,
    });

    await writeSuperAdminAuditLog({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: `agency_host_${params.status}`,
      targetUid: params.request.hostUid,
      targetLabel: `${params.request.hostName} @ ${params.request.agencyName}`,
      summary: `Set host membership for ${params.request.hostName} in ${params.request.agencyName} to "${params.status}" (${safeComm}% commission)`,
      reason: params.dealNotes || 'Super Admin host membership management',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update host membership.' };
  }
}

// ============================================================================
// 7. APP SETTINGS, ANNOUNCEMENTS & EVENTS/BANNERS
// ============================================================================
export function subscribeAppSettings(
  onUpdate: (settings: AppSettingsConfig) => void,
  onError?: (msg: string) => void
) {
  return onSnapshot(
    doc(db, 'app_settings', 'global'),
    (snap) => {
      if (!snap.exists()) {
        onUpdate(DEFAULT_APP_SETTINGS);
        return;
      }
      const data = snap.data() as Record<string, any>;
      onUpdate({
        ...DEFAULT_APP_SETTINGS,
        maintenanceMode: Boolean(data.maintenanceMode),
        maintenanceMessage: String(data.maintenanceMessage || DEFAULT_APP_SETTINGS.maintenanceMessage),
        minAppVersion: String(data.minAppVersion || DEFAULT_APP_SETTINGS.minAppVersion),
        welcomeMessage: String(data.welcomeMessage || DEFAULT_APP_SETTINGS.welcomeMessage),
        supportEmail: String(data.supportEmail || DEFAULT_APP_SETTINGS.supportEmail),
        supportWhatsapp: String(data.supportWhatsapp || ''),
        supportTelegram: String(data.supportTelegram || ''),
        websiteUrl: String(data.websiteUrl || DEFAULT_APP_SETTINGS.websiteUrl),
        privacyPolicyUrl: String(data.privacyPolicyUrl || DEFAULT_APP_SETTINGS.privacyPolicyUrl),
        termsUrl: String(data.termsUrl || DEFAULT_APP_SETTINGS.termsUrl),
        giftingEnabled: data.giftingEnabled !== false,
        partyRoomsEnabled: data.partyRoomsEnabled !== false,
        liveStreamsEnabled: data.liveStreamsEnabled !== false,
        reelsEnabled: data.reelsEnabled !== false,
        agencyApplicationsEnabled: data.agencyApplicationsEnabled !== false,
        registrationsEnabled: data.registrationsEnabled !== false,
        updatedAt: normalizeTimestamp(data.updatedAt),
        updatedBy: String(data.updatedBy || ''),
      });
    },
    (err) => {
      onError?.(err?.message || 'Unable to load app settings.');
      onUpdate(DEFAULT_APP_SETTINGS);
    }
  );
}

export async function adminSaveAppSettings(
  settings: Omit<AppSettingsConfig, 'updatedAt' | 'updatedBy'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = assertVerifiedSuperAdmin();
    const nowIso = new Date().toISOString();
    await setDoc(doc(db, 'app_settings', 'global'), {
      maintenanceMode: Boolean(settings.maintenanceMode),
      maintenanceMessage: settings.maintenanceMessage.trim().slice(0, 300),
      minAppVersion: settings.minAppVersion.trim().slice(0, 32) || '1.0.0',
      welcomeMessage: settings.welcomeMessage.trim().slice(0, 240),
      supportEmail: settings.supportEmail.trim().slice(0, 120),
      supportWhatsapp: settings.supportWhatsapp.trim().slice(0, 40),
      supportTelegram: settings.supportTelegram.trim().slice(0, 200),
      websiteUrl: settings.websiteUrl.trim().slice(0, 200),
      privacyPolicyUrl: settings.privacyPolicyUrl.trim().slice(0, 240),
      termsUrl: settings.termsUrl.trim().slice(0, 240),
      giftingEnabled: Boolean(settings.giftingEnabled),
      partyRoomsEnabled: Boolean(settings.partyRoomsEnabled),
      liveStreamsEnabled: Boolean(settings.liveStreamsEnabled),
      reelsEnabled: Boolean(settings.reelsEnabled),
      agencyApplicationsEnabled: Boolean(settings.agencyApplicationsEnabled),
      registrationsEnabled: Boolean(settings.registrationsEnabled),
      updatedAt: nowIso,
      updatedBy: admin.email,
    });

    await writeSuperAdminAuditLog({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: 'app_settings_updated',
      targetUid: 'global',
      targetLabel: 'App Settings',
      summary: `Updated global app settings (Maintenance: ${settings.maintenanceMode ? 'ON' : 'OFF'}, Min v${settings.minAppVersion})`,
      reason: 'App configuration saved',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save app settings.' };
  }
}

export function subscribeAllAnnouncementsForAdmin(
  onUpdate: (items: AdminAnnouncementRecord[]) => void,
  onError?: (msg: string) => void
) {
  return onSnapshot(
    collection(db, 'push_announcements'),
    (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, any>;
          return {
            id: d.id,
            title: String(data.title || 'Announcement'),
            message: String(data.message || ''),
            category: String(data.category || 'system'),
            priority: (['normal', 'high', 'urgent'].includes(data.priority)
              ? data.priority
              : 'high') as 'normal' | 'high' | 'urgent',
            active: data.active !== false,
            adminUid: String(data.adminUid || ''),
            adminEmail: String(data.adminEmail || ''),
            createdAt: normalizeTimestamp(data.createdAt),
          } satisfies AdminAnnouncementRecord;
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onUpdate(list);
    },
    (err) => {
      onError?.(err?.message || 'Unable to load announcements.');
      onUpdate([]);
    }
  );
}

export async function adminToggleAppAnnouncement(
  id: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = assertVerifiedSuperAdmin();
    await updateDoc(doc(db, 'push_announcements', id), { active });
    await writeSuperAdminAuditLog({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: active ? 'announcement_enabled' : 'announcement_paused',
      targetUid: id,
      targetLabel: id,
      summary: `${active ? 'Activated' : 'Paused'} global announcement ${id}`,
      reason: 'Announcement visibility toggled',
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update announcement.' };
  }
}

export async function adminDeleteAppAnnouncement(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = assertVerifiedSuperAdmin();
    await deleteDoc(doc(db, 'push_announcements', id));
    await writeSuperAdminAuditLog({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: 'announcement_deleted',
      targetUid: id,
      targetLabel: id,
      summary: `Deleted announcement ${id}`,
      reason: 'Announcement removed',
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete announcement.' };
  }
}

export function subscribeAllAppBannersForAdmin(
  onUpdate: (items: AdminAppBannerRecord[]) => void,
  onError?: (msg: string) => void
) {
  return onSnapshot(
    collection(db, 'app_banners'),
    (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, any>;
          return {
            id: String(data.id || d.id),
            title: String(data.title || 'Event Banner'),
            subtitle: String(data.subtitle || ''),
            badgeText: String(data.badgeText || 'EVENT'),
            imageUrl: String(data.imageUrl || ''),
            ctaLabel: String(data.ctaLabel || 'Explore'),
            ctaAction: String(data.ctaAction || 'open_store'),
            accentGradient: String(data.accentGradient || 'from-[#8B20FF] via-[#F328D5] to-[#FFC84A]'),
            priority: Number(data.priority ?? 10),
            active: data.active !== false,
            startsAt: String(data.startsAt || ''),
            endsAt: String(data.endsAt || ''),
            updatedAt: normalizeTimestamp(data.updatedAt),
            updatedBy: String(data.updatedBy || ''),
          } satisfies AdminAppBannerRecord;
        })
        .sort((a, b) => a.priority - b.priority || b.updatedAt.localeCompare(a.updatedAt));
      onUpdate(list);
    },
    (err) => {
      onError?.(err?.message || 'Unable to load event banners.');
      onUpdate([]);
    }
  );
}

export async function adminSaveAppBanner(
  banner: Omit<AdminAppBannerRecord, 'updatedAt' | 'updatedBy'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = assertVerifiedSuperAdmin();
    const cleanId = (banner.id || makeDocId('bnr')).trim().replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 80);
    const cleanTitle = banner.title.trim().slice(0, 120);
    if (!cleanTitle) return { success: false, error: 'Banner title is required.' };

    await setDoc(doc(db, 'app_banners', cleanId), {
      id: cleanId,
      title: cleanTitle,
      subtitle: banner.subtitle.trim().slice(0, 240),
      badgeText: banner.badgeText.trim().slice(0, 40) || 'EVENT',
      imageUrl: banner.imageUrl.trim().slice(0, 1500),
      ctaLabel: banner.ctaLabel.trim().slice(0, 40) || 'Explore',
      ctaAction: banner.ctaAction.trim().slice(0, 120) || 'open_store',
      accentGradient: banner.accentGradient.trim().slice(0, 120) || 'from-[#8B20FF] to-[#FFC84A]',
      priority: Math.max(0, Math.min(1000, Math.floor(Number(banner.priority || 10)))),
      active: Boolean(banner.active),
      startsAt: banner.startsAt.trim().slice(0, 64),
      endsAt: banner.endsAt.trim().slice(0, 64),
      updatedAt: new Date().toISOString(),
      updatedBy: admin.email,
    });

    await writeSuperAdminAuditLog({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: 'app_banner_saved',
      targetUid: cleanId,
      targetLabel: cleanTitle,
      summary: `Saved event banner "${cleanTitle}" (${banner.active ? 'Active' : 'Paused'})`,
      reason: 'Events & banners management',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save event banner.' };
  }
}

export async function adminDeleteAppBanner(id: string, title: string): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = assertVerifiedSuperAdmin();
    await deleteDoc(doc(db, 'app_banners', id));
    await writeSuperAdminAuditLog({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: 'app_banner_deleted',
      targetUid: id,
      targetLabel: title,
      summary: `Deleted event banner "${title}" (${id})`,
      reason: 'Event banner removed',
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete banner.' };
  }
}
