import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationActionType,
  NotificationCategory,
  NotificationItem,
  NotificationPreferences,
} from '../types';
import { apiFetch } from '../utils/apiConfig';
import { isVerifiedAdminSession } from '../utils/adminAuth';

export type PushPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface PushNotificationPayload {
  id: string;
  type: NotificationCategory;
  title: string;
  message: string;
  avatar?: string;
  senderId?: string;
  senderName?: string;
  actionType?: NotificationActionType;
  targetId?: string;
  actionUrl?: string;
  priority?: 'normal' | 'high' | 'urgent';
  createdAtMs: number;
}

export interface DispatchNotificationInput {
  targetUserId: string;
  type: NotificationCategory;
  title: string;
  message: string;
  avatar?: string;
  senderId?: string;
  senderName?: string;
  actionType?: NotificationActionType;
  targetId?: string;
  actionUrl?: string;
  priority?: 'normal' | 'high' | 'urgent';
  eventKey?: string;
  allowSelf?: boolean;
}

const ANDROID_CHANNEL_ID = 'lenzo_party_alerts';
const SEEN_PUSH_IDS = new Set<string>();
const MAX_SEEN_CACHE = 250;

let swRegistrationCache: ServiceWorkerRegistration | null = null;
let androidChannelReady = false;
let audioCtx: AudioContext | null = null;

function rememberSeenPushId(id: string): boolean {
  if (!id) return false;
  if (SEEN_PUSH_IDS.has(id)) return true;
  SEEN_PUSH_IDS.add(id);
  if (SEEN_PUSH_IDS.size > MAX_SEEN_CACHE) {
    const first = SEEN_PUSH_IDS.values().next().value;
    if (first) SEEN_PUSH_IDS.delete(first);
  }
  return false;
}

export function normalizeNotificationCategory(rawType?: string): NotificationCategory {
  switch (String(rawType || '').toLowerCase()) {
    case 'messages':
    case 'message':
    case 'chat':
      return 'messages';
    case 'gifts':
    case 'gift':
      return 'gifts';
    case 'followers':
    case 'follow':
    case 'like':
    case 'comment':
      return 'followers';
    case 'rooms':
    case 'room':
    case 'live':
      return 'rooms';
    case 'pk':
      return 'pk';
    case 'wallet':
    case 'coins':
    case 'diamonds':
    case 'withdrawal':
      return 'wallet';
    case 'agency':
      return 'agency';
    case 'progression':
    case 'level':
    case 'vip':
      return 'progression';
    default:
      return 'system';
  }
}

export function formatRelativeNotificationTime(ms?: number): string {
  if (!ms || !Number.isFinite(ms)) return 'Just now';
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(ms).toLocaleDateString();
}

export function isCategoryEnabledForUser(
  type: string,
  masterEnabled: boolean,
  prefs?: Partial<NotificationPreferences>
): boolean {
  if (!masterEnabled) return false;
  const normalized = normalizeNotificationCategory(type);
  const merged = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(prefs || {}) };
  return merged[normalized] !== false;
}

function makeSafeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Play a subtle dual-tone chime via Web Audio API without requiring external audio assets.
 */
export function playNotificationChime(priority: 'normal' | 'high' | 'urgent' = 'normal'): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!audioCtx) {
      audioCtx = new AudioContextCtor();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume().catch(() => {});
    }
    const now = audioCtx.currentTime;
    const notes = priority === 'urgent' ? [784, 1046.5, 1318.5] : [659.25, 987.77];

    notes.forEach((freq, idx) => {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.085);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.085);
      gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.085 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.085 + 0.22);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + idx * 0.085);
      osc.stop(now + idx * 0.085 + 0.24);
    });
  } catch {
    // Non-blocking (browser autoplay policy before user gesture)
  }
}

export function triggerNotificationVibration(priority: 'normal' | 'high' | 'urgent' = 'normal'): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(priority === 'urgent' ? [140, 60, 140, 60, 140] : [75, 40, 75]);
  } catch {
    // ignore
  }
}

/**
 * Query current platform notification permission status.
 */
export async function getPushPermissionState(): Promise<PushPermissionState> {
  if (typeof window === 'undefined') return 'unsupported';
  try {
    if (Capacitor.isNativePlatform()) {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display === 'granted') return 'granted';
      if (perm.display === 'denied') return 'denied';
      return 'default';
    }
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission as PushPermissionState;
  } catch {
    return 'unsupported';
  }
}

async function ensureAndroidChannel(): Promise<void> {
  if (!Capacitor.isNativePlatform() || androidChannelReady) return;
  try {
    await LocalNotifications.createChannel({
      id: ANDROID_CHANNEL_ID,
      name: 'Lenzo Party Live Alerts',
      description: 'Real-time alerts for messages, gifts, live streams, party rooms, PK battles, wallet, and agency updates',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#F328D5',
    });
    androidChannelReady = true;
  } catch {
    // non-blocking on older Android or iOS
  }
}

/**
 * Register Service Worker + Web Push VAPID subscription OR Native Android notification channel.
 */
export async function registerDeviceForPushNotifications(
  options: { requestPermission?: boolean } = {}
): Promise<{
  permission: PushPermissionState;
  subscribed: boolean;
  platform: 'web' | 'android' | 'ios';
  error?: string;
}> {
  const user = auth.currentUser;
  const platform: 'web' | 'android' | 'ios' = Capacitor.isNativePlatform()
    ? Capacitor.getPlatform() === 'ios'
      ? 'ios'
      : 'android'
    : 'web';

  if (typeof window === 'undefined') {
    return { permission: 'unsupported', subscribed: false, platform };
  }

  // 1. Native Capacitor Android / iOS Path
  if (Capacitor.isNativePlatform()) {
    try {
      await ensureAndroidChannel();
      let perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted' && options.requestPermission) {
        perm = await LocalNotifications.requestPermissions();
      }
      const mapped: PushPermissionState =
        perm.display === 'granted' ? 'granted' : perm.display === 'denied' ? 'denied' : 'default';

      if (mapped === 'granted' && user) {
        const nativeEndpoint = `capacitor://${platform}/${user.uid}`;
        const subId = `cap_${platform}_${user.uid.slice(0, 16)}`.replace(/[^a-zA-Z0-9_-]/g, '');
        await setDoc(
          doc(db, `users/${user.uid}/push_subscriptions`, subId),
          {
            userId: user.uid,
            platform,
            endpoint: nativeEndpoint,
            deviceLabel: `${platform.toUpperCase()} Native App`,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch(() => {});

        void apiFetch('/api/push/subscribe', {
          method: 'POST',
          body: JSON.stringify({
            endpoint: nativeEndpoint,
            platform,
            deviceLabel: `${platform.toUpperCase()} Native App`,
          }),
        }).catch(() => {});

        return { permission: 'granted', subscribed: true, platform };
      }

      return { permission: mapped, subscribed: false, platform };
    } catch (err: any) {
      return {
        permission: 'default',
        subscribed: false,
        platform,
        error: err?.message || 'Native notification permission error',
      };
    }
  }

  // 2. Web Browser / PWA Service Worker + Web Push Path
  if (!('Notification' in window)) {
    return { permission: 'unsupported', subscribed: false, platform };
  }

  let permission: PushPermissionState = Notification.permission as PushPermissionState;
  if (permission === 'default' && options.requestPermission) {
    try {
      permission = (await Notification.requestPermission()) as PushPermissionState;
    } catch {
      permission = Notification.permission as PushPermissionState;
    }
  }

  if (permission !== 'granted') {
    return { permission, subscribed: false, platform };
  }

  if (!user) {
    return { permission: 'granted', subscribed: false, platform };
  }

  try {
    let subscribed = false;
    if ('serviceWorker' in navigator) {
      const reg =
        swRegistrationCache || (await navigator.serviceWorker.register('/sw.js', { scope: '/' }));
      swRegistrationCache = reg;

      if ('PushManager' in window) {
        const keyRes = await apiFetch('/api/push/vapid-public-key', { skipAuth: true });
        const keyJson = keyRes.ok ? await keyRes.json().catch(() => null) : null;
        const vapidPublicKey = String(keyJson?.publicKey || '').trim();

        if (vapidPublicKey) {
          let subscription = await reg.pushManager.getSubscription();
          if (!subscription) {
            subscription = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });
          }

          if (subscription) {
            const subJson = subscription.toJSON();
            const deviceLabel = `${navigator.platform || 'Web'} · ${
              /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'Mobile Browser' : 'Desktop Browser'
            }`.slice(0, 120);

            const res = await apiFetch('/api/push/subscribe', {
              method: 'POST',
              body: JSON.stringify({
                subscription: subJson,
                platform: 'web',
                deviceLabel,
              }),
            });

            if (res.ok) {
              subscribed = true;
              const data = await res.json().catch(() => ({}));
              const subId = String(data?.subscriptionId || makeSafeId('websub')).slice(0, 64);
              await setDoc(
                doc(db, `users/${user.uid}/push_subscriptions`, subId),
                {
                  userId: user.uid,
                  platform: 'web',
                  endpoint: String(subJson.endpoint || '').slice(0, 1024),
                  deviceLabel,
                  updatedAt: new Date().toISOString(),
                },
                { merge: true }
              ).catch(() => {});
            }
          }
        }
      }
    }

    return { permission: 'granted', subscribed: subscribed || permission === 'granted', platform };
  } catch (err: any) {
    console.warn('[Push] Web Push registration notice:', err);
    return {
      permission: 'granted',
      subscribed: false,
      platform,
      error: err?.message,
    };
  }
}

/**
 * Unsubscribe current browser/device push endpoint (called when disabling push or logging out).
 */
export async function unregisterDevicePushNotifications(): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
      const reg = swRegistrationCache || (await navigator.serviceWorker.getRegistration('/'));
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe().catch(() => {});
        if (auth.currentUser) {
          await apiFetch('/api/push/unsubscribe', {
            method: 'POST',
            body: JSON.stringify({ endpoint }),
          }).catch(() => {});
        }
      }
    }
  } catch {
    // non-blocking
  }
}

/**
 * Show an OS-level notification (Native Android Local Notification or Browser Notification)
 * with automatic deduplication so a push never appears twice.
 */
export async function deliverOsDeviceNotification(
  payload: PushNotificationPayload,
  prefs?: Partial<NotificationPreferences>
): Promise<boolean> {
  if (rememberSeenPushId(`os_${payload.id}`)) {
    return false;
  }

  const merged = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(prefs || {}) };
  const priority = payload.priority || 'normal';

  if (merged.soundEnabled) {
    playNotificationChime(priority);
  }
  if (merged.vibrateEnabled) {
    triggerNotificationVibration(priority);
  }

  // Native Android / iOS system tray notification
  if (Capacitor.isNativePlatform()) {
    try {
      await ensureAndroidChannel();
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display === 'granted') {
        const numericId = Math.abs(
          Array.from(payload.id).reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0)
        ) % 2147480000;
        await LocalNotifications.schedule({
          notifications: [
            {
              id: numericId || Math.floor(Math.random() * 999999),
              title: payload.title,
              body: payload.message,
              channelId: ANDROID_CHANNEL_ID,
              schedule: { at: new Date(Date.now() + 80) },
              extra: {
                id: payload.id,
                type: payload.type,
                actionType: payload.actionType || 'open_notifications',
                targetId: payload.targetId || '',
                senderId: payload.senderId || '',
              },
            },
          ],
        });
        return true;
      }
    } catch (err) {
      console.warn('[Push] Android local notification error:', err);
    }
    return false;
  }

  // Browser OS Notification when page is backgrounded or permission is granted
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    if (document.hidden) {
      try {
        const reg = swRegistrationCache || (await navigator.serviceWorker?.getRegistration('/'));
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(payload.title, {
            body: payload.message,
            icon: payload.avatar || '/app-icon.png?v=3',
            badge: '/app-icon.png?v=3',
            tag: `lenzo-${payload.type}-${payload.id}`,
            data: {
              id: payload.id,
              type: payload.type,
              actionType: payload.actionType || 'open_notifications',
              targetId: payload.targetId || '',
              senderId: payload.senderId || '',
            },
          });
          return true;
        }
        new Notification(payload.title, {
          body: payload.message,
          icon: payload.avatar || '/app-icon.png?v=3',
          tag: `lenzo-${payload.type}-${payload.id}`,
        });
        return true;
      } catch {
        // non-blocking
      }
    }
  }

  return false;
}

/**
 * Listen for OS notification taps (both Native Android Capacitor & Web Service Worker postMessage).
 */
export function bindNotificationClickListener(
  onAction: (payload: {
    actionType?: NotificationActionType;
    targetId?: string;
    senderId?: string;
    type?: NotificationCategory;
  }) => void
): () => void {
  const cleanups: Array<() => void> = [];

  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    const swHandler = (event: MessageEvent) => {
      if (event.data?.type === 'LENZO_PUSH_NOTIFICATION_CLICK' && event.data?.payload) {
        const p = event.data.payload;
        onAction({
          actionType: p.actionType,
          targetId: p.targetId,
          senderId: p.senderId,
          type: normalizeNotificationCategory(p.type),
        });
      }
    };
    navigator.serviceWorker.addEventListener('message', swHandler);
    cleanups.push(() => navigator.serviceWorker.removeEventListener('message', swHandler));
  }

  if (Capacitor.isNativePlatform()) {
    let removed = false;
    void LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      if (removed) return;
      const extra = event?.notification?.extra || {};
      onAction({
        actionType: extra.actionType,
        targetId: extra.targetId,
        senderId: extra.senderId,
        type: normalizeNotificationCategory(extra.type),
      });
    }).then((handle) => {
      if (removed) {
        void handle.remove();
      } else {
        cleanups.push(() => {
          void handle.remove();
        });
      }
    }).catch(() => {});
    cleanups.push(() => {
      removed = true;
    });
  }

  return () => cleanups.forEach((fn) => fn());
}

/**
 * Universal Single-User Push Dispatcher:
 * 1) Persists notification in Firestore `users/{targetUserId}/notifications/{id}`
 * 2) Dispatches real-time OS Web Push + WebSocket push via `/api/push/send`
 */
export async function sendPushNotification(input: DispatchNotificationInput): Promise<void> {
  const targetUserId = String(input.targetUserId || '').trim();
  if (!targetUserId || targetUserId === 'user_current_01') return;

  const currentUid = auth.currentUser?.uid || '';
  if (!input.allowSelf && currentUid && targetUserId === currentUid) {
    return;
  }

  const notifId = makeSafeId(input.eventKey || input.type || 'ntf');
  const title = String(input.title || 'Lenzo Party Live').trim().slice(0, 140);
  const message = String(input.message || '').trim().slice(0, 420);
  if (!title || !message) return;

  const type = normalizeNotificationCategory(input.type);
  const priority =
    input.priority === 'urgent' || input.priority === 'high' ? input.priority : 'normal';

  const firestoreDoc: Record<string, any> = {
    title,
    message,
    type,
    isRead: false,
    priority,
    createdAt: serverTimestamp(),
  };

  if (input.avatar && typeof input.avatar === 'string') {
    firestoreDoc.avatar = input.avatar.slice(0, 512);
  }
  if (input.senderId || currentUid) {
    firestoreDoc.senderId = String(input.senderId || currentUid).slice(0, 128);
  }
  if (input.senderName) {
    firestoreDoc.senderName = String(input.senderName).slice(0, 120);
  }
  if (input.actionType) {
    firestoreDoc.actionType = String(input.actionType).slice(0, 48);
  }
  if (input.targetId) {
    firestoreDoc.targetId = String(input.targetId).slice(0, 160);
  }
  if (input.actionUrl) {
    firestoreDoc.actionUrl = String(input.actionUrl).slice(0, 240);
  }
  if (input.eventKey) {
    firestoreDoc.eventKey = String(input.eventKey).slice(0, 128);
  }

  // 1. Write to Firestore persistent Notification Center
  const writeFirestore = setDoc(
    doc(db, `users/${targetUserId}/notifications`, notifId),
    firestoreDoc
  ).catch((err) => {
    console.warn('[Push] Firestore notification write notice:', err?.message || err);
  });

  // 2. Dispatch real-time OS Web Push + WebSocket banner via backend
  const writeBackend = apiFetch('/api/push/send', {
    method: 'POST',
    timeoutMs: 8000,
    body: JSON.stringify({
      id: notifId,
      targetUserIds: [targetUserId],
      type,
      title,
      message,
      avatar: firestoreDoc.avatar,
      senderName: firestoreDoc.senderName,
      actionType: firestoreDoc.actionType || 'open_notifications',
      targetId: firestoreDoc.targetId || '',
      actionUrl: firestoreDoc.actionUrl || '/',
      priority,
    }),
  }).catch(() => {});

  await Promise.allSettled([writeFirestore, writeBackend]);
}

/**
 * Universal Multi-User Push Dispatcher (e.g., notifying all followers when a Host goes Live or opens a Party Room).
 */
export async function sendPushNotificationToMany(
  targetUserIds: string[],
  input: Omit<DispatchNotificationInput, 'targetUserId'>
): Promise<void> {
  const currentUid = auth.currentUser?.uid || '';
  const uniqueTargets = Array.from(
    new Set(
      targetUserIds
        .map((id) => String(id || '').trim())
        .filter((id) => id.length > 0 && id !== 'user_current_01' && (input.allowSelf || id !== currentUid))
    )
  ).slice(0, 120);

  if (uniqueTargets.length === 0) return;

  const baseId = makeSafeId(input.eventKey || input.type || 'multi');
  const title = String(input.title || 'Lenzo Party Live').trim().slice(0, 140);
  const message = String(input.message || '').trim().slice(0, 420);
  if (!title || !message) return;

  const type = normalizeNotificationCategory(input.type);
  const priority =
    input.priority === 'urgent' || input.priority === 'high' ? input.priority : 'normal';

  const firestorePayload: Record<string, any> = {
    title,
    message,
    type,
    isRead: false,
    priority,
    createdAt: serverTimestamp(),
  };
  if (input.avatar) firestorePayload.avatar = input.avatar.slice(0, 512);
  if (input.senderId || currentUid) firestorePayload.senderId = String(input.senderId || currentUid).slice(0, 128);
  if (input.senderName) firestorePayload.senderName = String(input.senderName).slice(0, 120);
  if (input.actionType) firestorePayload.actionType = String(input.actionType).slice(0, 48);
  if (input.targetId) firestorePayload.targetId = String(input.targetId).slice(0, 160);
  if (input.eventKey) firestorePayload.eventKey = String(input.eventKey).slice(0, 128);

  // Batch Firestore writes (chunked at 40 docs per batch)
  const batchPromises: Promise<void>[] = [];
  for (let i = 0; i < uniqueTargets.length; i += 40) {
    const chunk = uniqueTargets.slice(i, i + 40);
    const batch = writeBatch(db);
    chunk.forEach((uid, idx) => {
      batch.set(doc(db, `users/${uid}/notifications`, `${baseId}_${i + idx}`), firestorePayload);
    });
    batchPromises.push(batch.commit().catch(() => {}));
  }

  // Dispatch Web Push + WebSocket in one batched server call
  const serverPush = apiFetch('/api/push/send', {
    method: 'POST',
    timeoutMs: 10000,
    body: JSON.stringify({
      id: baseId,
      targetUserIds: uniqueTargets,
      type,
      title,
      message,
      avatar: firestorePayload.avatar,
      senderName: firestorePayload.senderName,
      actionType: firestorePayload.actionType || 'open_notifications',
      targetId: firestorePayload.targetId || '',
      priority,
    }),
  }).catch(() => {});

  await Promise.allSettled([...batchPromises, serverPush]);
}

/**
 * Notify all followers of a Host when they start a Live Stream or open a Party Room.
 */
export async function notifyFollowersOfLiveOrRoom(params: {
  hostId: string;
  hostName: string;
  hostAvatar?: string;
  mode: 'live' | 'room';
  targetId: string;
  sessionTitle: string;
}): Promise<void> {
  try {
    const q = query(
      collection(db, 'follows'),
      where('followingId', '==', params.hostId),
      limit(120)
    );
    const snap = await getDocs(q);
    const followerIds = snap.docs
      .map((d) => String(d.data()?.followerId || '').trim())
      .filter((id) => id.length > 0 && id !== params.hostId);

    if (followerIds.length === 0) return;

    const isLive = params.mode === 'live';
    await sendPushNotificationToMany(followerIds, {
      type: 'rooms',
      title: isLive
        ? `🔴 ${params.hostName} is LIVE now!`
        : `🎙️ ${params.hostName} opened a Party Room!`,
      message: params.sessionTitle
        ? `Join "${params.sessionTitle}" right now on Lenzo Party Live!`
        : isLive
          ? 'Tap to watch the live broadcast and say hello.'
          : 'Tap to grab a mic seat and join the party!',
      avatar: params.hostAvatar,
      senderId: params.hostId,
      senderName: params.hostName,
      actionType: isLive ? 'open_live' : 'open_room',
      targetId: params.targetId,
      priority: 'high',
      eventKey: isLive ? 'host_live' : 'host_room',
    });
  } catch (err) {
    console.warn('[Push] notifyFollowersOfLiveOrRoom notice:', err);
  }
}

/**
 * Send a real-time push notification to all verified platform administrators (e.g., new withdrawal or agency request).
 */
export async function notifyAdminsOfEvent(params: {
  type: NotificationCategory;
  title: string;
  message: string;
  actionType?: NotificationActionType;
  targetId?: string;
  priority?: 'normal' | 'high' | 'urgent';
}): Promise<void> {
  try {
    const snap = await getDocs(query(collection(db, 'admins'), limit(10)));
    const adminUids = snap.docs.map((d) => d.id).filter(Boolean);
    if (adminUids.length === 0) return;
    await sendPushNotificationToMany(adminUids, {
      type: params.type,
      title: params.title,
      message: params.message,
      actionType: params.actionType || 'open_admin',
      targetId: params.targetId,
      priority: params.priority || 'high',
      allowSelf: true,
    });
  } catch {
    // non-blocking (admins collection may not be readable by non-admins)
  }
}

/**
 * Send a self-test push notification (OS Web Push + WebSocket + Firestore + Native Android)
 * so the user can verify push notifications are active immediately.
 */
export async function sendSelfTestPushNotification(): Promise<{
  ok: boolean;
  webPushSent: number;
}> {
  const user = auth.currentUser;
  if (!user) return { ok: false, webPushSent: 0 };

  await sendPushNotification({
    targetUserId: user.uid,
    type: 'system',
    title: '🔔 Lenzo Party Push Notifications Active!',
    message: 'All real-time alerts are enabled for messages, gifts, live rooms, PK battles, wallet, and agency events.',
    actionType: 'open_notifications',
    priority: 'high',
    allowSelf: true,
    eventKey: 'self_test',
  });

  try {
    const res = await apiFetch('/api/push/test', { method: 'POST' });
    const data = res.ok ? await res.json().catch(() => ({})) : {};
    return { ok: true, webPushSent: Number(data?.webPushSent || 0) };
  } catch {
    return { ok: true, webPushSent: 0 };
  }
}

/**
 * Super Admin ONLY: Send a Global Push Notification Broadcast to ALL Lenzo Party users.
 */
export async function sendAdminGlobalPushBroadcast(params: {
  title: string;
  message: string;
  category?: NotificationCategory;
  priority?: 'normal' | 'high' | 'urgent';
}): Promise<{
  broadcastId: string;
  subscribedUsersCount: number;
  webPushSent: number;
  activeWebSocketClients: number;
}> {
  const user = auth.currentUser;
  if (!user || !isVerifiedAdminSession()) {
    throw new Error('Only verified Lenzo Party Super Admins can send global push broadcasts.');
  }

  const title = params.title.trim().slice(0, 140);
  const message = params.message.trim().slice(0, 500);
  if (!title || !message) {
    throw new Error('Broadcast title and message are required.');
  }

  const broadcastId = makeSafeId('bcast');
  const category = params.category || 'system';
  const priority = params.priority || 'high';

  // 1. Write Firestore global announcement document so all active & future sessions receive it
  await setDoc(doc(db, 'push_announcements', broadcastId), {
    id: broadcastId,
    adminUid: user.uid,
    adminEmail: (user.email || '').toLowerCase(),
    title,
    message,
    category,
    priority,
    active: true,
    createdAt: new Date().toISOString(),
    createdAtMillis: Date.now(),
  });

  // 2. Dispatch real-time OS Web Push + WebSocket broadcast to all devices
  const res = await apiFetch('/api/push/broadcast', {
    method: 'POST',
    body: JSON.stringify({
      id: broadcastId,
      title,
      message,
      category,
      priority,
    }),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson?.error || 'Failed to dispatch global push broadcast.');
  }

  const data = await res.json();
  return {
    broadcastId,
    subscribedUsersCount: Number(data?.subscribedUsersCount || 0),
    webPushSent: Number(data?.webPushSent || 0),
    activeWebSocketClients: Number(data?.activeWebSocketClients || 0),
  };
}

/**
 * Subscribe to the signed-in user's Notification Center in real time (Firestore).
 */
export function subscribeRealTimeNotifications(
  userId: string,
  onUpdate: (items: NotificationItem[], newlyAdded: NotificationItem[]) => void
): () => void {
  if (!userId || userId === 'user_current_01') {
    onUpdate([], []);
    return () => {};
  }

  let initialHydrated = false;
  const knownIds = new Set<string>();
  const q = query(
    collection(db, `users/${userId}/notifications`),
    orderBy('createdAt', 'desc'),
    limit(60)
  );

  return onSnapshot(
    q,
    (snap) => {
      const newlyAdded: NotificationItem[] = [];
      const items: NotificationItem[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, any>;
        const createdAtMs =
          typeof data.createdAt?.toMillis === 'function'
            ? data.createdAt.toMillis()
            : typeof data.createdAt === 'number'
              ? data.createdAt
              : Date.now();
        const item: NotificationItem = {
          id: d.id,
          type: normalizeNotificationCategory(data.type),
          title: String(data.title || 'Lenzo Party Live'),
          message: String(data.message || ''),
          avatar: typeof data.avatar === 'string' ? data.avatar : undefined,
          senderId: typeof data.senderId === 'string' ? data.senderId : undefined,
          senderName: typeof data.senderName === 'string' ? data.senderName : undefined,
          actionType: data.actionType as NotificationActionType | undefined,
          targetId: typeof data.targetId === 'string' ? data.targetId : undefined,
          actionUrl: typeof data.actionUrl === 'string' ? data.actionUrl : undefined,
          priority: data.priority === 'urgent' || data.priority === 'high' ? data.priority : 'normal',
          timestamp: formatRelativeNotificationTime(createdAtMs),
          createdAtMs,
          isRead: Boolean(data.isRead),
        };

        if (initialHydrated && !knownIds.has(d.id) && !item.isRead) {
          newlyAdded.push(item);
        }
        knownIds.add(d.id);
        return item;
      });

      initialHydrated = true;
      onUpdate(items, newlyAdded);
    },
    (err) => {
      console.warn('[Push] subscribeRealTimeNotifications notice:', err?.message || err);
    }
  );
}

/**
 * Subscribe to global admin push announcements in real time.
 */
export function subscribeGlobalPushAnnouncements(
  onAnnouncement: (payload: PushNotificationPayload) => void
): () => void {
  let hydrated = false;
  const seen = new Set<string>();
  const q = query(
    collection(db, 'push_announcements'),
    where('active', '==', true),
    orderBy('createdAtMillis', 'desc'),
    limit(10)
  );

  return onSnapshot(
    q,
    (snap) => {
      snap.docs.forEach((d) => {
        const data = d.data() as Record<string, any>;
        if (!seen.has(d.id)) {
          seen.add(d.id);
          if (hydrated) {
            onAnnouncement({
              id: d.id,
              type: normalizeNotificationCategory(data.category || 'system'),
              title: String(data.title || 'Lenzo Party Announcement'),
              message: String(data.message || ''),
              senderName: 'Lenzo Party Official',
              actionType: 'open_notifications',
              priority: data.priority === 'urgent' || data.priority === 'high' ? data.priority : 'high',
              createdAtMs: Number(data.createdAtMillis || Date.now()),
            });
          }
        }
      });
      hydrated = true;
    },
    () => {}
  );
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  if (!userId || !notificationId) return;
  try {
    await updateDoc(doc(db, `users/${userId}/notifications`, notificationId), { isRead: true });
  } catch {
    // non-blocking
  }
}

export async function markAllNotificationsAsRead(userId: string, notificationIds: string[]): Promise<void> {
  if (!userId || notificationIds.length === 0) return;
  try {
    for (let i = 0; i < notificationIds.length; i += 40) {
      const batch = writeBatch(db);
      notificationIds.slice(i, i + 40).forEach((id) => {
        batch.update(doc(db, `users/${userId}/notifications`, id), { isRead: true });
      });
      await batch.commit();
    }
  } catch {
    // non-blocking
  }
}

export async function deleteSingleNotification(userId: string, notificationId: string): Promise<void> {
  if (!userId || !notificationId) return;
  try {
    await deleteDoc(doc(db, `users/${userId}/notifications`, notificationId));
  } catch {
    // non-blocking
  }
}

export async function clearAllNotifications(userId: string, notificationIds: string[]): Promise<void> {
  if (!userId || notificationIds.length === 0) return;
  try {
    for (let i = 0; i < notificationIds.length; i += 40) {
      const batch = writeBatch(db);
      notificationIds.slice(i, i + 40).forEach((id) => {
        batch.delete(doc(db, `users/${userId}/notifications`, id));
      });
      await batch.commit();
    }
  } catch {
    // non-blocking
  }
}
