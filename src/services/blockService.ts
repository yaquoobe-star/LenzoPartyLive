import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { apiFetch } from '../utils/apiConfig';

export interface BlockedUserRecord {
  id: string; // deterministic: `${blockerId}_${blockedUserId}`
  blockerId: string;
  blockedUserId: string;
  blockedUserName: string;
  blockedUserUsername?: string;
  blockedUserDisplayId?: string;
  blockedUserAvatar?: string;
  reason?: string;
  createdAt: string;
}

const LOCAL_BLOCKS_KEY = 'lenzo_party_blocked_users_v1';

function toIsoDate(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function readLocalBlocks(blockerId: string): BlockedUserRecord[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_BLOCKS_KEY}_${blockerId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalBlocks(blockerId: string, records: BlockedUserRecord[]) {
  try {
    localStorage.setItem(`${LOCAL_BLOCKS_KEY}_${blockerId}`, JSON.stringify(records));
  } catch {
    // ignore storage quota errors
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {
      // ignore token error
    }
  }
  return headers;
}

export function getBlockDocId(blockerId: string, blockedUserId: string): string {
  return `${blockerId}_${blockedUserId}`;
}

/**
 * Subscribe in real time to all users blocked BY the current user.
 */
export function subscribeBlockedByMe(
  userId: string,
  onUpdate: (records: BlockedUserRecord[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  // Emit cached records immediately for instant UI responsiveness
  const cached = readLocalBlocks(userId);
  if (cached.length > 0) {
    onUpdate(cached);
  }

  // Hydrate from backend API as backup
  void (async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await apiFetch('/api/users/blocks', { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.blockedUsers) && data.blockedUsers.length > 0) {
          writeLocalBlocks(userId, data.blockedUsers);
          onUpdate(data.blockedUsers);
        }
      }
    } catch {
      // Firestore snapshot is primary
    }
  })();

  const q = query(
    collection(db, 'blocked_users'),
    where('blockerId', '==', userId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const records: BlockedUserRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          blockerId: String(data.blockerId || userId),
          blockedUserId: String(data.blockedUserId || ''),
          blockedUserName: String(data.blockedUserName || 'Lenzo User'),
          blockedUserUsername: data.blockedUserUsername ? String(data.blockedUserUsername) : '',
          blockedUserDisplayId: data.blockedUserDisplayId ? String(data.blockedUserDisplayId) : '',
          blockedUserAvatar: data.blockedUserAvatar ? String(data.blockedUserAvatar) : '',
          reason: data.reason ? String(data.reason) : '',
          createdAt: toIsoDate(data.createdAt),
        };
      });
      records.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      writeLocalBlocks(userId, records);
      onUpdate(records);
    },
    () => {
      onUpdate(readLocalBlocks(userId));
    }
  );
}

/**
 * Subscribe in real time to all user IDs who have BLOCKED the current user.
 * Enables instant real-time ejection from streams/rooms and message blocking.
 */
export function subscribeBlockedMe(
  userId: string,
  onUpdate: (blockerIds: string[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  // Also hydrate from backend API
  void (async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await apiFetch('/api/users/blocks', { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.blockedByIds)) {
          onUpdate(data.blockedByIds.map(String));
        }
      }
    } catch {
      // Firestore snapshot is primary
    }
  })();

  const q = query(
    collection(db, 'blocked_users'),
    where('blockedUserId', '==', userId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const ids = snap.docs
        .map((d) => String(d.data()?.blockerId || ''))
        .filter(Boolean);
      onUpdate(Array.from(new Set(ids)));
    },
    () => {
      // keep existing state on transient listener warning
    }
  );
}

/**
 * Block a user:
 * 1. Persists deterministic record in Firestore `blocked_users/{blockerId}_{blockedUserId}`.
 * 2. Calls backend `POST /api/users/:targetId/block` which immediately evicts them from
 *    the blocker's active streams, party rooms, seats, and seat requests and removes follows.
 * 3. Updates local cache immediately.
 */
export async function blockUser(params: {
  blockerId: string;
  targetUser: Pick<UserProfile, 'id' | 'name' | 'username' | 'displayId' | 'avatar'>;
  reason?: string;
}): Promise<{ success: boolean; record?: BlockedUserRecord; error?: string }> {
  const { blockerId, targetUser, reason = '' } = params;
  if (!blockerId || !targetUser?.id) {
    return { success: false, error: 'Invalid user.' };
  }
  if (blockerId === targetUser.id) {
    return { success: false, error: 'You cannot block yourself.' };
  }

  const blockId = getBlockDocId(blockerId, targetUser.id);
  const nowIso = new Date().toISOString();

  const record: BlockedUserRecord = {
    id: blockId,
    blockerId,
    blockedUserId: targetUser.id,
    blockedUserName: (targetUser.name || 'Lenzo User').slice(0, 64),
    blockedUserUsername: (targetUser.username || '').slice(0, 64),
    blockedUserDisplayId: (targetUser.displayId || '').slice(0, 32),
    blockedUserAvatar: (targetUser.avatar || '').slice(0, 1500),
    reason: reason.trim().slice(0, 200),
    createdAt: nowIso,
  };

  // Update local cache immediately
  const existing = readLocalBlocks(blockerId).filter(
    (r) => r.blockedUserId !== targetUser.id
  );
  writeLocalBlocks(blockerId, [record, ...existing]);

  // Persist to Firestore (when authenticated as blocker)
  if (auth.currentUser && auth.currentUser.uid === blockerId) {
    try {
      await setDoc(doc(db, 'blocked_users', blockId), {
        blockerId: record.blockerId,
        blockedUserId: record.blockedUserId,
        blockedUserName: record.blockedUserName,
        blockedUserUsername: record.blockedUserUsername || '',
        blockedUserDisplayId: record.blockedUserDisplayId || '',
        blockedUserAvatar: record.blockedUserAvatar || '',
        reason: record.reason || '',
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('[BlockService] Firestore block write notice:', err);
    }

    // Also remove follow doc in Firestore if it exists
    try {
      await deleteDoc(doc(db, 'follows', `${blockerId}_${targetUser.id}`)).catch(() => {});
    } catch {
      // ignore
    }
  }

  // Sync to Express backend (enforces room/stream eviction + server-side guards)
  try {
    const headers = await getAuthHeaders();
    await apiFetch(`/api/users/${encodeURIComponent(targetUser.id)}/block`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        blockerId,
        blockedUserName: record.blockedUserName,
        blockedUserUsername: record.blockedUserUsername,
        blockedUserDisplayId: record.blockedUserDisplayId,
        blockedUserAvatar: record.blockedUserAvatar,
        reason: record.reason,
      }),
    });
  } catch (err) {
    console.warn('[BlockService] Backend block sync notice:', err);
  }

  return { success: true, record };
}

/**
 * Unblock a previously blocked user in Firestore, Express backend, and local cache.
 */
export async function unblockUser(params: {
  blockerId: string;
  targetUserId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { blockerId, targetUserId } = params;
  if (!blockerId || !targetUserId) {
    return { success: false, error: 'Invalid user.' };
  }

  const blockId = getBlockDocId(blockerId, targetUserId);

  // Update local cache immediately
  const next = readLocalBlocks(blockerId).filter(
    (r) => r.blockedUserId !== targetUserId
  );
  writeLocalBlocks(blockerId, next);

  // Delete from Firestore
  if (auth.currentUser && auth.currentUser.uid === blockerId) {
    try {
      await deleteDoc(doc(db, 'blocked_users', blockId));
    } catch (err) {
      console.warn('[BlockService] Firestore unblock delete notice:', err);
    }
  }

  // Sync to Express backend
  try {
    const headers = await getAuthHeaders();
    await apiFetch(`/api/users/${encodeURIComponent(targetUserId)}/unblock`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ blockerId }),
    });
  } catch (err) {
    console.warn('[BlockService] Backend unblock sync notice:', err);
  }

  return { success: true };
}

/**
 * Convert a BlockedUserRecord into a minimal UserProfile for UI components like MessagesScreen.
 */
export function blockedRecordToUserProfile(record: BlockedUserRecord): UserProfile {
  return {
    id: record.blockedUserId,
    displayId: record.blockedUserDisplayId || record.blockedUserId.slice(0, 8),
    name: record.blockedUserName || 'Blocked User',
    username: record.blockedUserUsername || '',
    avatar: record.blockedUserAvatar || '',
    bio: '',
    level: 1,
    vipLevel: 0,
    coins: 0,
    diamonds: 0,
    fansCount: '0',
    followingCount: 0,
    likesCount: '0',
    isVIP: false,
  };
}
