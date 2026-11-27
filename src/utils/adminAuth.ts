import { auth } from '../firebase';

/**
 * Strictly authorized LenzoPartyLive Super Admin email.
 * ONLY the verified account authenticated with this exact Gmail address
 * is permitted to view or access the Super Admin Panel.
 */
export const SUPER_ADMIN_EMAIL = 'malikyaqobniazgudara@gmail.com';

export const AUTHORIZED_ADMIN_EMAILS = [SUPER_ADMIN_EMAIL] as const;

const AUTHORIZED_ADMIN_EMAIL_SET = new Set<string>(AUTHORIZED_ADMIN_EMAILS);

export function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  return AUTHORIZED_ADMIN_EMAIL_SET.has(email.trim().toLowerCase());
}

/**
 * Checks whether the active authenticated session belongs to an authorized Admin email.
 * When Firebase Auth has a live currentUser, we rely on its authoritative email.
 */
export function isCurrentAuthAdmin(fallbackEmail?: string | null): boolean {
  const liveUser = auth.currentUser;
  if (liveUser) {
    return isAuthorizedAdminEmail(liveUser.email);
  }
  return isAuthorizedAdminEmail(fallbackEmail);
}

/**
 * Strict check used before privileged writes requiring verified Firebase token claims.
 */
export function isVerifiedAdminSession(): boolean {
  const liveUser = auth.currentUser;
  if (!liveUser) return false;
  return isAuthorizedAdminEmail(liveUser.email) && liveUser.emailVerified === true;
}

const DEVICE_ID_STORAGE_KEY = 'lenzo_device_id_v1';

function generateSafeDeviceId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `dev_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    }
  } catch {
    // fallback below
  }
  const partA = Date.now().toString(36);
  const partB = Math.random().toString(36).slice(2, 12);
  const partC = Math.random().toString(36).slice(2, 10);
  return `dev_${partA}_${partB}${partC}`.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 48);
}

/**
 * Returns a persistent, Firestore-ID-safe device identifier stored on this device.
 * Matches `^[a-zA-Z0-9_\-]+$` (max 64 chars) so it can be used directly as `/banned_devices/{deviceId}`.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'dev_server';
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9_\-]{8,64}$/.test(existing)) {
      return existing;
    }
    const created = generateSafeDeviceId();
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return generateSafeDeviceId();
  }
}

/**
 * Returns a short, safe device/platform summary label (max 180 chars) for admin diagnostics.
 */
export function getDeviceSummaryLabel(): string {
  if (typeof navigator === 'undefined') return 'Unknown Device';
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isCapacitor = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());
  const platform = isCapacitor
    ? isAndroid
      ? 'Android App'
      : isIOS
        ? 'iOS App'
        : 'Native App'
    : isAndroid
      ? 'Android Web'
      : isIOS
        ? 'iOS Web'
        : /Windows/i.test(ua)
          ? 'Windows Web'
          : /Mac/i.test(ua)
            ? 'macOS Web'
            : /Linux/i.test(ua)
              ? 'Linux Web'
              : 'Web Browser';
  const modelMatch = ua.match(/Android\s[\d.]+;\s*([^;)]+)/i);
  const model = modelMatch?.[1]?.trim();
  const label = model ? `${platform} · ${model}` : platform;
  return label.replace(/[<>]/g, '').slice(0, 180);
}
