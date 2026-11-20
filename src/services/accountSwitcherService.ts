import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile } from '../types';

export const MAX_SAVED_ACCOUNTS = 5;

const STORAGE_KEY_SAVED_ACCOUNTS = 'lenzo_party_device_accounts_v1';
const STORAGE_KEY_LAST_LOGIN_UID = 'lenzo_party_last_login_uid_v1';

/**
 * Non-secret public account metadata stored on-device for:
 * 1) Multi-account switching (max 5 accounts per device)
 * 2) Logged-out "Welcome Back / Last Logged-In Account" screen
 *
 * SECURITY: Never stores passwords, OAuth access/refresh tokens, or private secrets.
 * Actual account access is ALWAYS granted exclusively by Firebase Authentication.
 */
export interface SavedDeviceAccount {
  uid: string;
  displayId: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  authProvider: 'google' | 'password';
  level: number;
  vipLevel: number;
  lastUsedAt: string;
}

export interface PersistedUserSettings {
  userId: string;
  notificationsEnabled: boolean;
  darkMode: boolean;
  language: string;
  showOnlineStatus: boolean;
  allowDirectMessages: 'everyone' | 'followers' | 'nobody';
  updatedAt: string;
}

export const DEFAULT_USER_SETTINGS: Omit<PersistedUserSettings, 'userId' | 'updatedAt'> = {
  notificationsEnabled: true,
  darkMode: true,
  language: 'English',
  showOnlineStatus: true,
  allowDirectMessages: 'everyone',
};

function readRawAccounts(): SavedDeviceAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_ACCOUNTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is SavedDeviceAccount =>
          Boolean(item && typeof item.uid === 'string' && item.uid.length > 0 && typeof item.email === 'string')
      )
      .slice(0, MAX_SAVED_ACCOUNTS);
  } catch {
    return [];
  }
}

function writeRawAccounts(accounts: SavedDeviceAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SAVED_ACCOUNTS, JSON.stringify(accounts.slice(0, MAX_SAVED_ACCOUNTS)));
  } catch (err) {
    console.warn('[AccountSwitcher] Could not persist device account list:', err);
  }
}

export function getSavedDeviceAccounts(): SavedDeviceAccount[] {
  return readRawAccounts().sort(
    (a, b) => new Date(b.lastUsedAt || 0).getTime() - new Date(a.lastUsedAt || 0).getTime()
  );
}

export function canAddAnotherDeviceAccount(existingUid?: string): boolean {
  const accounts = readRawAccounts();
  if (existingUid && accounts.some((a) => a.uid === existingUid)) return true;
  return accounts.length < MAX_SAVED_ACCOUNTS;
}

/**
 * Save or refresh an authenticated account on this device (strictly capped at 5 accounts).
 * Also updates the device's Last Logged-In Account reference.
 */
export function rememberAuthenticatedAccount(
  profile: UserProfile,
  authProvider: 'google' | 'password'
): { saved: boolean; limitReached: boolean; accounts: SavedDeviceAccount[] } {
  if (!profile?.id || profile.id === 'user_current_01') {
    return { saved: false, limitReached: false, accounts: getSavedDeviceAccounts() };
  }

  const now = new Date().toISOString();
  const entry: SavedDeviceAccount = {
    uid: profile.id,
    displayId: profile.displayId || profile.id.slice(0, 6).toUpperCase(),
    name: profile.name || 'Lenzo User',
    username: profile.username || `@${(profile.email?.split('@')[0] || 'user').toLowerCase()}`,
    email: profile.email || '',
    avatar: profile.avatar || '',
    authProvider,
    level: typeof profile.level === 'number' ? profile.level : 0,
    vipLevel: typeof profile.vipLevel === 'number' ? profile.vipLevel : 0,
    lastUsedAt: now,
  };

  const existing = readRawAccounts();
  const existingIdx = existing.findIndex((a) => a.uid === entry.uid);

  let next: SavedDeviceAccount[];
  let limitReached = false;

  if (existingIdx >= 0) {
    next = existing.map((a, idx) => (idx === existingIdx ? { ...a, ...entry } : a));
  } else if (existing.length < MAX_SAVED_ACCOUNTS) {
    next = [entry, ...existing];
  } else {
    // Cap strictly enforced at 5 accounts: do not exceed 5 saved slots
    limitReached = true;
    next = existing;
  }

  writeRawAccounts(next);
  if (typeof window !== 'undefined' && !limitReached) {
    try {
      localStorage.setItem(STORAGE_KEY_LAST_LOGIN_UID, entry.uid);
    } catch {
      // ignore storage errors
    }
  }

  return { saved: !limitReached, limitReached, accounts: getSavedDeviceAccounts() };
}

/**
 * Retrieve the Last Logged-In Account card for the logged-out Welcome Back screen.
 */
export function getLastLoggedInAccount(): SavedDeviceAccount | null {
  const accounts = getSavedDeviceAccounts();
  if (accounts.length === 0) return null;
  if (typeof window !== 'undefined') {
    try {
      const lastUid = localStorage.getItem(STORAGE_KEY_LAST_LOGIN_UID);
      if (lastUid) {
        const match = accounts.find((a) => a.uid === lastUid);
        if (match) return match;
      }
    } catch {
      // ignore
    }
  }
  return accounts[0];
}

/**
 * Remove an account from this device's switcher ONLY.
 * Does NOT delete the user's Firebase Auth account or any Firestore data.
 */
export function removeAccountFromDevice(uid: string): SavedDeviceAccount[] {
  const next = readRawAccounts().filter((a) => a.uid !== uid);
  writeRawAccounts(next);

  if (typeof window !== 'undefined') {
    try {
      const lastUid = localStorage.getItem(STORAGE_KEY_LAST_LOGIN_UID);
      if (lastUid === uid) {
        if (next.length > 0) {
          localStorage.setItem(STORAGE_KEY_LAST_LOGIN_UID, next[0].uid);
        } else {
          localStorage.removeItem(STORAGE_KEY_LAST_LOGIN_UID);
        }
      }
    } catch {
      // ignore
    }
  }

  return getSavedDeviceAccounts();
}

/**
 * Persist and subscribe to user settings in Firestore `user_settings/{uid}`
 */
export async function loadUserSettingsFromFirestore(uid: string): Promise<PersistedUserSettings> {
  const fallback: PersistedUserSettings = {
    userId: uid,
    ...DEFAULT_USER_SETTINGS,
    updatedAt: new Date().toISOString(),
  };
  try {
    const snap = await getDoc(doc(db, 'user_settings', uid));
    if (snap.exists()) {
      const data = snap.data();
      return {
        userId: uid,
        notificationsEnabled: data.notificationsEnabled !== false,
        darkMode: data.darkMode !== false,
        language: typeof data.language === 'string' ? data.language : 'English',
        showOnlineStatus: data.showOnlineStatus !== false,
        allowDirectMessages:
          data.allowDirectMessages === 'followers' || data.allowDirectMessages === 'nobody'
            ? data.allowDirectMessages
            : 'everyone',
        updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : fallback.updatedAt,
      };
    }
    return fallback;
  } catch (err) {
    console.warn('[Firestore] loadUserSettings notice:', err);
    return fallback;
  }
}

export async function saveUserSettingsToFirestore(
  uid: string,
  partial: Partial<Omit<PersistedUserSettings, 'userId' | 'updatedAt'>>
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const current = await loadUserSettingsFromFirestore(uid);
  const payload: PersistedUserSettings = {
    ...current,
    ...partial,
    userId: uid,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'user_settings', uid), payload, { merge: true });
}

export function subscribeUserSettings(
  uid: string,
  onUpdate: (settings: PersistedUserSettings) => void
): () => void {
  return onSnapshot(
    doc(db, 'user_settings', uid),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onUpdate({
          userId: uid,
          notificationsEnabled: data.notificationsEnabled !== false,
          darkMode: data.darkMode !== false,
          language: typeof data.language === 'string' ? data.language : 'English',
          showOnlineStatus: data.showOnlineStatus !== false,
          allowDirectMessages:
            data.allowDirectMessages === 'followers' || data.allowDirectMessages === 'nobody'
              ? data.allowDirectMessages
              : 'everyone',
          updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
        });
      }
    },
    (err) => {
      console.warn('[Firestore] subscribeUserSettings notice:', err);
    }
  );
}

/**
 * Record an account deletion request in Firestore `deletion_requests/{uid}`
 */
export async function submitAccountDeletionRequest(reason: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required.');
  await setDoc(doc(db, 'deletion_requests', user.uid), {
    userId: user.uid,
    email: (user.email || '').slice(0, 120),
    reason: reason.trim().slice(0, 300) || 'User requested account deletion',
    status: 'pending',
    requestedAt: new Date().toISOString(),
  });
}
