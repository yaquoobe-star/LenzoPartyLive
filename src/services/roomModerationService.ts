import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { RoomKickDuration, RoomKickRecord, UserProfile } from '../types';
import {
  cancelFirestoreSeatRequest,
  evictFirestoreRoomParticipant,
  vacateFirestoreSeat,
} from './firestoreRealtimeService';

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

function isValidId(id: string | undefined | null): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 128 && VALID_ID_REGEX.test(id);
}

export interface RoomKickOption {
  type: RoomKickDuration;
  label: string;
  shortLabel: string;
  description: string;
  durationMs: number | null; // null = current stream/session
}

export const ROOM_KICK_OPTIONS: RoomKickOption[] = [
  {
    type: 'session',
    label: 'Kick (This Stream Only)',
    shortLabel: 'This Stream',
    description: 'User cannot re-enter while this party session is live',
    durationMs: null,
  },
  {
    type: '24h',
    label: 'Kick for 24 Hours',
    shortLabel: '24 Hours',
    description: 'Cannot enter or interact in this room for 24 hours',
    durationMs: 24 * 60 * 60 * 1000,
  },
  {
    type: '15d',
    label: 'Kick for 15 Days',
    shortLabel: '15 Days',
    description: 'Cannot enter or interact in this room for 15 days',
    durationMs: 15 * 24 * 60 * 60 * 1000,
  },
  {
    type: '30d',
    label: 'Kick for 30 Days',
    shortLabel: '30 Days',
    description: 'Cannot enter or interact in this room for 30 days',
    durationMs: 30 * 24 * 60 * 60 * 1000,
  },
];

const LOCAL_KICKS_KEY = 'lenzo_party_room_kicks_v1';

function readLocalKicks(key: string): RoomKickRecord[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_KICKS_KEY}_${key}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalKicks(key: string, records: RoomKickRecord[]) {
  try {
    localStorage.setItem(`${LOCAL_KICKS_KEY}_${key}`, JSON.stringify(records));
  } catch {
    // ignore storage quota errors
  }
}

export function getRoomKickDocId(roomId: string, targetUserId: string): string {
  return `${roomId}_${targetUserId}`;
}

export function isKickRecordActive(
  kick: RoomKickRecord,
  now: number = Date.now()
): boolean {
  if (!kick || !kick.targetUserId || !kick.roomId) return false;
  if (kick.durationType === 'session') {
    return true;
  }
  return typeof kick.expiresAt === 'number' && kick.expiresAt > now;
}

/**
 * Checks whether a user is actively kicked from a given party room.
 * - 'session' kick blocks re-entry only for that exact active roomId.
 * - '24h' | '15d' | '30d' kicks block re-entry to that roomId OR any room by that host until expiresAt.
 */
export function getActiveKickForRoom(
  kicks: RoomKickRecord[],
  roomId: string,
  hostId?: string,
  now: number = Date.now()
): RoomKickRecord | null {
  for (const kick of kicks) {
    if (!isKickRecordActive(kick, now)) continue;
    if (kick.durationType === 'session') {
      if (kick.roomId === roomId) return kick;
    } else if (kick.roomId === roomId || (hostId && kick.hostId === hostId)) {
      return kick;
    }
  }
  return null;
}

export function formatKickDurationLabel(durationType: RoomKickDuration): string {
  switch (durationType) {
    case 'session':
      return 'this stream session';
    case '24h':
      return '24 Hours';
    case '15d':
      return '15 Days';
    case '30d':
      return '30 Days';
    default:
      return 'this session';
  }
}

export function formatRemainingKickTime(kick: RoomKickRecord, now: number = Date.now()): string {
  if (kick.durationType === 'session' || typeof kick.expiresAt !== 'number') {
    return 'until this party stream ends';
  }
  const diffMs = Math.max(0, kick.expiresAt - now);
  if (diffMs <= 0) return 'expired';
  const totalMinutes = Math.ceil(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;
  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m remaining`;
  }
  return `${Math.max(1, mins)}m remaining`;
}

function mapKickDoc(id: string, raw: Record<string, any>): RoomKickRecord {
  const rawDuration = String(raw.durationType || 'session');
  const durationType: RoomKickDuration =
    rawDuration === '24h' || rawDuration === '15d' || rawDuration === '30d'
      ? rawDuration
      : 'session';
  return {
    id,
    roomId: String(raw.roomId || ''),
    roomTitle: raw.roomTitle ? String(raw.roomTitle) : '',
    hostId: String(raw.hostId || ''),
    targetUserId: String(raw.targetUserId || ''),
    targetUserName: String(raw.targetUserName || 'User'),
    targetUserAvatar: raw.targetUserAvatar ? String(raw.targetUserAvatar) : '',
    durationType,
    kickedAt: typeof raw.kickedAt === 'number' ? raw.kickedAt : Date.now(),
    expiresAt: typeof raw.expiresAt === 'number' ? raw.expiresAt : null,
  };
}

/**
 * Host kicks a user from the Party Room for the selected duration:
 * - session (current stream only)
 * - 24h (24 hours)
 * - 15d (15 days)
 * - 30d (30 days)
 * Persists in Firestore `room_kicks/{roomId}_{targetUserId}` and immediately vacates their seat & presence.
 */
export async function kickUserFromRoom(params: {
  roomId: string;
  roomTitle?: string;
  hostId: string;
  targetUser: Pick<UserProfile, 'id' | 'name' | 'avatar'>;
  durationType: RoomKickDuration;
  maxSeats?: number;
}): Promise<{ success: boolean; record?: RoomKickRecord; error?: string }> {
  const { roomId, roomTitle = '', hostId, targetUser, durationType, maxSeats = 5 } = params;
  if (!isValidId(roomId) || !isValidId(hostId) || !isValidId(targetUser?.id)) {
    return { success: false, error: 'Invalid room or user.' };
  }
  if (hostId === targetUser.id) {
    return { success: false, error: 'You cannot kick yourself.' };
  }

  const opt = ROOM_KICK_OPTIONS.find((o) => o.type === durationType) || ROOM_KICK_OPTIONS[0];
  const now = Date.now();
  const expiresAt = opt.durationMs ? now + opt.durationMs : null;
  const kickId = getRoomKickDocId(roomId, targetUser.id);

  const record: RoomKickRecord = {
    id: kickId,
    roomId,
    roomTitle: roomTitle.slice(0, 100),
    hostId,
    targetUserId: targetUser.id,
    targetUserName: (targetUser.name || 'User').slice(0, 64),
    targetUserAvatar: (targetUser.avatar || '').slice(0, 1500),
    durationType,
    kickedAt: now,
    expiresAt,
  };

  // Persist to Firestore (primary real-time source of truth)
  if (auth.currentUser && auth.currentUser.uid === hostId) {
    try {
      const payload: Record<string, any> = {
        roomId: record.roomId,
        roomTitle: record.roomTitle || '',
        hostId: record.hostId,
        targetUserId: record.targetUserId,
        targetUserName: record.targetUserName,
        targetUserAvatar: record.targetUserAvatar || '',
        durationType: record.durationType,
        kickedAt: record.kickedAt,
      };
      if (typeof record.expiresAt === 'number') {
        payload.expiresAt = record.expiresAt;
      }
      await setDoc(doc(db, 'room_kicks', kickId), payload);
    } catch (err: any) {
      console.warn('[RoomModeration] Firestore kick write failed:', err);
      return {
        success: false,
        error: err?.message || 'Could not save room kick. Please try again.',
      };
    }

    // Immediately remove from seat, pending seat requests, and active participants
    await Promise.all([
      vacateFirestoreSeat(roomId, targetUser.id, undefined, maxSeats).catch(() => null),
      cancelFirestoreSeatRequest(roomId, targetUser.id).catch(() => null),
      evictFirestoreRoomParticipant(roomId, targetUser.id).catch(() => null),
    ]);
  }

  return { success: true, record };
}

/**
 * Host lifts an active room kick early.
 */
export async function unkickUserFromRoom(
  roomId: string,
  targetUserId: string
): Promise<{ success: boolean }> {
  if (!isValidId(roomId) || !isValidId(targetUserId) || !auth.currentUser) {
    return { success: false };
  }
  try {
    await deleteDoc(doc(db, 'room_kicks', getRoomKickDocId(roomId, targetUserId)));
    return { success: true };
  } catch (err) {
    console.warn('[RoomModeration] unkick error:', err);
    return { success: false };
  }
}

/**
 * Subscribe in real time to all active kicks targeting the current signed-in user.
 * Used in App.tsx and AudioRoomScreen.tsx for instant ejection & re-entry blocking.
 */
export function subscribeMyActiveRoomKicks(
  userId: string,
  onUpdate: (records: RoomKickRecord[]) => void
): () => void {
  if (!userId || !auth.currentUser) {
    onUpdate([]);
    return () => {};
  }

  const cached = readLocalKicks(`target_${userId}`).filter((k) => isKickRecordActive(k));
  if (cached.length > 0) {
    onUpdate(cached);
  }

  const q = query(
    collection(db, 'room_kicks'),
    where('targetUserId', '==', userId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const now = Date.now();
      const active = snap.docs
        .map((d) => mapKickDoc(d.id, d.data()))
        .filter((k) => isKickRecordActive(k, now));
      writeLocalKicks(`target_${userId}`, active);
      onUpdate(active);
    },
    (err) => {
      console.warn('[RoomModeration] subscribeMyActiveRoomKicks notice:', err?.message || err);
    }
  );
}

/**
 * Subscribe in real time to all active kicks issued by the Host for a specific room.
 */
export function subscribeRoomKicksForHost(
  roomId: string,
  hostId: string,
  onUpdate: (records: RoomKickRecord[]) => void
): () => void {
  if (!isValidId(roomId) || !isValidId(hostId) || !auth.currentUser) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, 'room_kicks'),
    where('hostId', '==', hostId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const now = Date.now();
      const list = snap.docs
        .map((d) => mapKickDoc(d.id, d.data()))
        .filter((k) => isKickRecordActive(k, now) && (k.roomId === roomId || k.durationType !== 'session'))
        .sort((a, b) => b.kickedAt - a.kickedAt);
      onUpdate(list);
    },
    (err) => {
      console.warn('[RoomModeration] subscribeRoomKicksForHost notice:', err?.message || err);
    }
  );
}
