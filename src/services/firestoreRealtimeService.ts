import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ChatMessage, LiveViewerInfo, UserProfile } from '../types';

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

function isValidFirestoreId(id: string | undefined | null): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 128 && VALID_ID_REGEX.test(id);
}

export interface FirestoreRtcSignalPayload {
  type?: 'offer' | 'answer';
  sdp?: RTCSessionDescriptionInit | null;
  ice?: RTCIceCandidateInit[];
  sessionId?: string;
  updatedAt?: number;
}

export interface FirestoreLiveViewerDoc {
  userId: string;
  name?: string;
  username?: string;
  avatar?: string;
  level?: number;
  vipLevel?: number;
  isVIP?: boolean;
  isHost?: boolean;
  joinedAt?: number;
  lastSeen?: number;
  // WebRTC Viewer -> Host signaling fields
  rtcSessionId?: string;
  rtcReadyAt?: number;
  rtcAnswer?: RTCSessionDescriptionInit | null;
  rtcAnswerSessionId?: string;
  rtcViewerIce?: RTCIceCandidateInit[];
  // WebRTC Host -> Viewer signaling fields
  rtcOffer?: RTCSessionDescriptionInit | null;
  rtcOfferSessionId?: string;
  rtcHostIce?: RTCIceCandidateInit[];
  rtcHostUpdatedAt?: number;
  rtcHostCameraOn?: boolean;
}

export interface FirestoreRoomParticipantDoc {
  userId: string;
  name?: string;
  username?: string;
  avatar?: string;
  level?: number;
  vipLevel?: number;
  isVIP?: boolean;
  isHost?: boolean;
  isSpeaker?: boolean;
  joinedAt?: number;
  lastSeen?: number;
  // Map of targetPeerId -> outbound WebRTC signaling envelope written by this participant
  rtcSignals?: Record<string, FirestoreRtcSignalPayload>;
}

const ACTIVE_PRESENCE_TTL_MS = 120000; // 2 minutes stale cutoff

function mapViewerInfo(raw: any, fallbackId: string): LiveViewerInfo {
  const now = Date.now();
  return {
    userId: String(raw?.userId || fallbackId),
    name: String(raw?.name || 'User'),
    username: String(raw?.username || ''),
    avatar: String(raw?.avatar || ''),
    level: typeof raw?.level === 'number' ? raw.level : 1,
    vipLevel: typeof raw?.vipLevel === 'number' ? raw.vipLevel : 0,
    isVIP: Boolean(raw?.isVIP),
    isHost: Boolean(raw?.isHost),
    joinedAt: typeof raw?.joinedAt === 'number' ? raw.joinedAt : now,
    lastSeen: typeof raw?.lastSeen === 'number' ? raw.lastSeen : now,
  };
}

// ============================================================================
// 1. LIVE STREAMING: PRESENCE, COMMENTS & WEBRTC SIGNALING OVER FIRESTORE
// ============================================================================

export async function joinFirestoreLiveViewer(
  streamId: string,
  user: UserProfile,
  isHost = false
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !isValidFirestoreId(streamId) || !isValidFirestoreId(uid)) return;
  try {
    const now = Date.now();
    await setDoc(
      doc(db, 'live_streams', streamId, 'viewers', uid),
      {
        userId: uid,
        name: user.name || 'Viewer',
        username: user.username || '',
        avatar: user.avatar || '',
        level: user.level || 1,
        vipLevel: user.vipLevel || 0,
        isVIP: Boolean(user.isVIP),
        isHost: Boolean(isHost),
        joinedAt: now,
        lastSeen: now,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[Firestore Live] joinViewer notice:', err);
  }
}

export async function heartbeatFirestoreLiveViewer(
  streamId: string,
  user: UserProfile,
  isHost = false
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !isValidFirestoreId(streamId) || !isValidFirestoreId(uid)) return;
  try {
    await setDoc(
      doc(db, 'live_streams', streamId, 'viewers', uid),
      {
        userId: uid,
        name: user.name || 'Viewer',
        avatar: user.avatar || '',
        isHost: Boolean(isHost),
        lastSeen: Date.now(),
      },
      { merge: true }
    );
  } catch {
    // Ignore transient heartbeat errors (e.g., stream just ended)
  }
}

export async function leaveFirestoreLiveViewer(streamId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !isValidFirestoreId(streamId) || !isValidFirestoreId(uid)) return;
  try {
    await deleteDoc(doc(db, 'live_streams', streamId, 'viewers', uid));
  } catch {
    // Ignore if already deleted
  }
}

export async function updateFirestoreLiveViewerCount(
  streamId: string,
  count: number
): Promise<void> {
  if (!auth.currentUser || !isValidFirestoreId(streamId)) return;
  try {
    const safeCount = Math.max(0, Math.floor(count));
    await updateDoc(doc(db, 'live_streams', streamId), {
      numericViewers: safeCount,
      viewerCount: String(safeCount),
      viewersCount: safeCount,
    });
  } catch {
    // Stream doc may have been deleted
  }
}

export async function updateFirestoreLiveLikes(
  streamId: string,
  likesCount: number
): Promise<void> {
  if (!auth.currentUser || !isValidFirestoreId(streamId)) return;
  try {
    await updateDoc(doc(db, 'live_streams', streamId), {
      likesCount: Math.max(0, Math.floor(likesCount)),
    });
  } catch {
    // ignore
  }
}

export function subscribeFirestoreLiveViewers(
  streamId: string,
  onUpdate: (viewers: LiveViewerInfo[], rawDocs: Map<string, FirestoreLiveViewerDoc>) => void
): () => void {
  if (!auth.currentUser || !isValidFirestoreId(streamId)) {
    return () => {};
  }

  return onSnapshot(
    collection(db, 'live_streams', streamId, 'viewers'),
    (snap) => {
      const now = Date.now();
      const viewers: LiveViewerInfo[] = [];
      const rawDocs = new Map<string, FirestoreLiveViewerDoc>();

      snap.docs.forEach((docSnap) => {
        const data = docSnap.data() as FirestoreLiveViewerDoc;
        const lastSeen = typeof data.lastSeen === 'number' ? data.lastSeen : data.joinedAt || now;
        if (now - lastSeen > ACTIVE_PRESENCE_TTL_MS && !data.isHost) {
          return;
        }
        rawDocs.set(docSnap.id, { ...data, userId: String(data.userId || docSnap.id) });
        if (!data.isHost) {
          viewers.push(mapViewerInfo(data, docSnap.id));
        }
      });

      viewers.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
      onUpdate(viewers, rawDocs);
    },
    (err) => {
      console.warn('[Firestore Live] Viewers subscription notice:', err?.message || err);
    }
  );
}

export function subscribeFirestoreLiveViewerDoc(
  streamId: string,
  viewerId: string,
  onData: (data: FirestoreLiveViewerDoc | null) => void
): () => void {
  if (!auth.currentUser || !isValidFirestoreId(streamId) || !isValidFirestoreId(viewerId)) {
    return () => {};
  }

  return onSnapshot(
    doc(db, 'live_streams', streamId, 'viewers', viewerId),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(snap.data() as FirestoreLiveViewerDoc);
    },
    (err) => {
      console.warn('[Firestore Live] Viewer doc subscription notice:', err?.message || err);
    }
  );
}

export async function writeFirestoreLiveViewerSignal(
  streamId: string,
  viewerUser: Partial<UserProfile> | null,
  patch: Partial<FirestoreLiveViewerDoc>
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !isValidFirestoreId(streamId) || !isValidFirestoreId(uid)) return;
  try {
    const payload: Record<string, any> = {
      userId: uid,
      isHost: false,
      lastSeen: Date.now(),
      ...patch,
    };
    if (viewerUser?.name) payload.name = viewerUser.name;
    if (viewerUser?.username) payload.username = viewerUser.username;
    if (viewerUser?.avatar) payload.avatar = viewerUser.avatar;
    if (typeof viewerUser?.level === 'number') payload.level = viewerUser.level;
    if (typeof viewerUser?.vipLevel === 'number') payload.vipLevel = viewerUser.vipLevel;
    if (typeof viewerUser?.isVIP === 'boolean') payload.isVIP = viewerUser.isVIP;

    await setDoc(doc(db, 'live_streams', streamId, 'viewers', uid), payload, { merge: true });
  } catch (err) {
    console.warn('[Firestore Live] writeViewerSignal notice:', err);
  }
}

export async function writeFirestoreLiveHostSignal(
  streamId: string,
  viewerId: string,
  patch: Partial<FirestoreLiveViewerDoc>
): Promise<void> {
  if (!auth.currentUser || !isValidFirestoreId(streamId) || !isValidFirestoreId(viewerId)) return;
  try {
    await setDoc(
      doc(db, 'live_streams', streamId, 'viewers', viewerId),
      {
        userId: viewerId,
        rtcHostUpdatedAt: Date.now(),
        ...patch,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[Firestore Live] writeHostSignal notice:', err);
  }
}

export async function sendFirestoreLiveComment(
  streamId: string,
  sender: UserProfile,
  text: string,
  isHost: boolean,
  customId?: string
): Promise<ChatMessage | null> {
  const uid = auth.currentUser?.uid;
  const trimmed = text.trim().slice(0, 500);
  if (!uid || !trimmed || !isValidFirestoreId(streamId)) return null;

  const rawId = customId && isValidFirestoreId(customId)
    ? customId
    : `cm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const now = Date.now();
  const msg: ChatMessage = {
    id: rawId,
    senderId: uid,
    senderName: sender.name || 'User',
    senderAvatar: sender.avatar || '',
    senderVip: sender.vipLevel || 0,
    text: trimmed,
    timestamp: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isHost,
  };

  try {
    await setDoc(doc(db, 'live_streams', streamId, 'comments', rawId), {
      ...msg,
      userId: uid,
      createdAt: now,
    });
    return msg;
  } catch (err) {
    console.warn('[Firestore Live] sendComment notice:', err);
    return null;
  }
}

export function subscribeFirestoreLiveComments(
  streamId: string,
  onUpdate: (messages: ChatMessage[]) => void
): () => void {
  if (!auth.currentUser || !isValidFirestoreId(streamId)) {
    return () => {};
  }

  return onSnapshot(
    collection(db, 'live_streams', streamId, 'comments'),
    (snap) => {
      const items = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
            msg: {
              id: d.id,
              senderId: String(data.senderId || data.userId || ''),
              senderName: String(data.senderName || 'User'),
              senderAvatar: String(data.senderAvatar || ''),
              text: String(data.text || ''),
              timestamp: String(data.timestamp || 'Now'),
              isHost: Boolean(data.isHost),
              senderVip: typeof data.senderVip === 'number' ? data.senderVip : typeof data.vipLevel === 'number' ? data.vipLevel : 0,
              isSystem: Boolean(data.isSystem),
            } as ChatMessage,
          };
        })
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(-80)
        .map((x) => x.msg);

      onUpdate(items);
    },
    (err) => {
      console.warn('[Firestore Live] Comments subscription notice:', err?.message || err);
    }
  );
}

export function subscribeFirestoreLiveStreamDoc(
  streamId: string,
  onStatus: (exists: boolean, data: any | null) => void
): () => void {
  if (!auth.currentUser || !isValidFirestoreId(streamId)) {
    return () => {};
  }
  return onSnapshot(
    doc(db, 'live_streams', streamId),
    (snap) => {
      onStatus(snap.exists(), snap.exists() ? snap.data() : null);
    },
    () => {}
  );
}

// ============================================================================
// 2. PARTY ROOMS: PARTICIPANTS, CHAT & WEBRTC VOICE SIGNALING OVER FIRESTORE
// ============================================================================

export async function joinFirestoreRoomParticipant(
  roomId: string,
  user: UserProfile,
  isHost: boolean,
  isSpeaker: boolean
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !isValidFirestoreId(roomId) || !isValidFirestoreId(uid)) return;
  try {
    const now = Date.now();
    await setDoc(
      doc(db, 'party_rooms', roomId, 'participants', uid),
      {
        userId: uid,
        name: user.name || 'User',
        username: user.username || '',
        avatar: user.avatar || '',
        level: user.level || 1,
        vipLevel: user.vipLevel || 0,
        isVIP: Boolean(user.isVIP),
        isHost: Boolean(isHost),
        isSpeaker: Boolean(isSpeaker),
        joinedAt: now,
        lastSeen: now,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[Firestore Room] joinParticipant notice:', err);
  }
}

export async function updateFirestoreRoomParticipantState(
  roomId: string,
  patch: Partial<FirestoreRoomParticipantDoc>
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !isValidFirestoreId(roomId) || !isValidFirestoreId(uid)) return;
  try {
    await setDoc(
      doc(db, 'party_rooms', roomId, 'participants', uid),
      {
        userId: uid,
        lastSeen: Date.now(),
        ...patch,
      },
      { merge: true }
    );
  } catch {
    // ignore transient errors
  }
}

export async function leaveFirestoreRoomParticipant(roomId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !isValidFirestoreId(roomId) || !isValidFirestoreId(uid)) return;
  try {
    await deleteDoc(doc(db, 'party_rooms', roomId, 'participants', uid));
  } catch {
    // ignore
  }
}

export async function writeFirestorePartyPeerSignal(
  roomId: string,
  targetPeerId: string,
  signal: FirestoreRtcSignalPayload
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !isValidFirestoreId(roomId) || !isValidFirestoreId(uid) || !isValidFirestoreId(targetPeerId)) {
    return;
  }
  try {
    await setDoc(
      doc(db, 'party_rooms', roomId, 'participants', uid),
      {
        userId: uid,
        lastSeen: Date.now(),
        rtcSignals: {
          [targetPeerId]: {
            ...signal,
            updatedAt: Date.now(),
          },
        },
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[Firestore Room] writePeerSignal notice:', err);
  }
}

export function subscribeFirestoreRoomParticipants(
  roomId: string,
  onUpdate: (
    participants: LiveViewerInfo[],
    rawDocs: Map<string, FirestoreRoomParticipantDoc>
  ) => void
): () => void {
  if (!auth.currentUser || !isValidFirestoreId(roomId)) {
    return () => {};
  }

  return onSnapshot(
    collection(db, 'party_rooms', roomId, 'participants'),
    (snap) => {
      const now = Date.now();
      const participants: LiveViewerInfo[] = [];
      const rawDocs = new Map<string, FirestoreRoomParticipantDoc>();

      snap.docs.forEach((docSnap) => {
        const data = docSnap.data() as FirestoreRoomParticipantDoc;
        const lastSeen = typeof data.lastSeen === 'number' ? data.lastSeen : data.joinedAt || now;
        if (now - lastSeen > ACTIVE_PRESENCE_TTL_MS && !data.isHost) {
          return;
        }
        rawDocs.set(docSnap.id, { ...data, userId: String(data.userId || docSnap.id) });
        participants.push(mapViewerInfo(data, docSnap.id));
      });

      participants.sort((a, b) => (a.isHost ? -1 : b.isHost ? 1 : (a.joinedAt || 0) - (b.joinedAt || 0)));
      onUpdate(participants, rawDocs);
    },
    (err) => {
      console.warn('[Firestore Room] Participants subscription notice:', err?.message || err);
    }
  );
}

export async function sendFirestoreRoomMessage(
  roomId: string,
  sender: UserProfile,
  text: string,
  isHost: boolean,
  customId?: string
): Promise<ChatMessage | null> {
  const uid = auth.currentUser?.uid;
  const trimmed = text.trim().slice(0, 500);
  if (!uid || !trimmed || !isValidFirestoreId(roomId)) return null;

  const rawId = customId && isValidFirestoreId(customId)
    ? customId
    : `rm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const now = Date.now();
  const msg: ChatMessage = {
    id: rawId,
    senderId: uid,
    senderName: sender.name || 'User',
    senderAvatar: sender.avatar || '',
    senderVip: sender.vipLevel || 0,
    text: trimmed,
    timestamp: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isHost,
  };

  try {
    await setDoc(doc(db, 'party_rooms', roomId, 'messages', rawId), {
      ...msg,
      userId: uid,
      createdAt: now,
    });
    return msg;
  } catch (err) {
    console.warn('[Firestore Room] sendMessage notice:', err);
    return null;
  }
}

export function subscribeFirestoreRoomMessages(
  roomId: string,
  onUpdate: (messages: ChatMessage[]) => void
): () => void {
  if (!auth.currentUser || !isValidFirestoreId(roomId)) {
    return () => {};
  }

  return onSnapshot(
    collection(db, 'party_rooms', roomId, 'messages'),
    (snap) => {
      const items = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
            msg: {
              id: d.id,
              senderId: String(data.senderId || data.userId || ''),
              senderName: String(data.senderName || 'User'),
              senderAvatar: String(data.senderAvatar || ''),
              text: String(data.text || ''),
              timestamp: String(data.timestamp || 'Now'),
              isHost: Boolean(data.isHost),
              senderVip: typeof data.senderVip === 'number' ? data.senderVip : typeof data.vipLevel === 'number' ? data.vipLevel : 0,
              isSystem: Boolean(data.isSystem),
            } as ChatMessage,
          };
        })
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(-80)
        .map((x) => x.msg);

      onUpdate(items);
    },
    (err) => {
      console.warn('[Firestore Room] Messages subscription notice:', err?.message || err);
    }
  );
}

export async function updateFirestoreRoomParticipantCount(
  roomId: string,
  count: number
): Promise<void> {
  if (!auth.currentUser || !isValidFirestoreId(roomId)) return;
  try {
    const safeCount = Math.max(0, Math.floor(count));
    await updateDoc(doc(db, 'party_rooms', roomId), {
      numericParticipants: safeCount,
      participantCount: String(safeCount),
      viewersCount: safeCount,
    });
  } catch {
    // ignore
  }
}
