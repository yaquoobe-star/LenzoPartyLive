import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ChatMessage, LiveViewerInfo, UserProfile } from '../types';
import {
  clampPartyMaxSeatsForHostLevel,
  isSeatLockedByHostLevel,
  sanitizePartySeatsForHostLevel,
  sanitizeUserLevel,
} from '../utils/partySeatRules';

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
  superVipLevel?: number;
  isVIP?: boolean;
  isSuperVIP?: boolean;
  isHost?: boolean;
  isSpeaker?: boolean;
  joinedAt?: number;
  lastSeen?: number;
  // Map of targetPeerId -> outbound WebRTC signaling envelope written by this participant
  rtcSignals?: Record<string, FirestoreRtcSignalPayload>;
}

const ACTIVE_PRESENCE_TTL_MS = 60000; // 60 seconds stale cutoff (4x 15s heartbeat)

function mapViewerInfo(raw: any, fallbackId: string): LiveViewerInfo {
  const now = Date.now();
  return {
    userId: String(raw?.userId || fallbackId),
    name: String(raw?.name || 'User'),
    username: String(raw?.username || ''),
    avatar: String(raw?.avatar || ''),
    level: typeof raw?.level === 'number' ? raw.level : 0,
    vipLevel: typeof raw?.vipLevel === 'number' ? raw.vipLevel : 0,
    superVipLevel: typeof raw?.superVipLevel === 'number' ? raw.superVipLevel : 0,
    isVIP: Boolean(raw?.isVIP || (typeof raw?.vipLevel === 'number' && raw.vipLevel > 0)),
    isSuperVIP: Boolean(raw?.isSuperVIP || (typeof raw?.superVipLevel === 'number' && raw.superVipLevel > 0)),
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

export async function syncFirestoreLiveStreamLifecycle(
  streamId: string,
  patch: {
    numericViewers?: number;
    hostPresent?: boolean;
    status?: 'active' | 'empty' | 'closed';
    emptySince?: number | null;
    closesAt?: number | null;
  }
): Promise<void> {
  if (!auth.currentUser || !isValidFirestoreId(streamId)) return;
  try {
    const payload: Record<string, any> = {};
    if (typeof patch.numericViewers === 'number') {
      const safe = Math.max(0, Math.floor(patch.numericViewers));
      payload.numericViewers = safe;
      payload.viewerCount = String(safe);
      payload.viewersCount = safe;
    }
    if (typeof patch.hostPresent === 'boolean') {
      payload.hostPresent = patch.hostPresent;
    }
    if (patch.status) {
      payload.status = patch.status;
    }
    if (patch.emptySince !== undefined) {
      payload.emptySince = patch.emptySince;
    }
    if (patch.closesAt !== undefined) {
      payload.closesAt = patch.closesAt;
    }
    if (Object.keys(payload).length === 0) return;
    await updateDoc(doc(db, 'live_streams', streamId), payload);
  } catch {
    // Non-fatal if stream doc was deleted
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
        if (now - lastSeen > ACTIVE_PRESENCE_TTL_MS) {
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
    senderLevel: typeof sender.level === 'number' ? sender.level : 0,
    senderVip: typeof sender.vipLevel === 'number' ? sender.vipLevel : 0,
    senderSuperVip: typeof sender.superVipLevel === 'number' ? sender.superVipLevel : 0,
    senderIsVip: Boolean(sender.isVIP || (sender.vipLevel || 0) > 0),
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
              senderLevel: typeof data.senderLevel === 'number' ? data.senderLevel : typeof data.level === 'number' ? data.level : 0,
              senderVip: typeof data.senderVip === 'number' ? data.senderVip : typeof data.vipLevel === 'number' ? data.vipLevel : 0,
              senderSuperVip: typeof data.senderSuperVip === 'number' ? data.senderSuperVip : typeof data.superVipLevel === 'number' ? data.superVipLevel : 0,
              senderIsVip: Boolean(data.senderIsVip || data.isVIP || (typeof data.senderVip === 'number' && data.senderVip > 0)),
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
        level: typeof user.level === 'number' ? user.level : 0,
        vipLevel: typeof user.vipLevel === 'number' ? user.vipLevel : 0,
        superVipLevel: typeof user.superVipLevel === 'number' ? user.superVipLevel : 0,
        isVIP: Boolean(user.isVIP || (user.vipLevel || 0) > 0),
        isSuperVIP: Boolean(user.isSuperVIP || (user.superVipLevel || 0) > 0),
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

export async function evictFirestoreRoomParticipant(
  roomId: string,
  targetUserId: string
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !isValidFirestoreId(roomId) || !isValidFirestoreId(targetUserId)) return;
  try {
    // Permanent Room Owner protection: never evict the room owner unless self-leaving
    if (targetUserId !== uid) {
      const roomSnap = await getDoc(doc(db, 'party_rooms', roomId));
      if (roomSnap.exists()) {
        const ownerId = (roomSnap.data() as Record<string, any>)?.host?.id;
        if (ownerId && targetUserId === ownerId) {
          return;
        }
      }
    }
    await deleteDoc(doc(db, 'party_rooms', roomId, 'participants', targetUserId));
  } catch {
    // ignore if participant doc already absent
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

export async function clearFirestorePartyPeerSignals(roomId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !isValidFirestoreId(roomId) || !isValidFirestoreId(uid)) return;
  try {
    await setDoc(
      doc(db, 'party_rooms', roomId, 'participants', uid),
      {
        userId: uid,
        lastSeen: Date.now(),
        rtcSignals: {},
      },
      { merge: true }
    );
  } catch {
    // Non-fatal
  }
}

export function subscribeFirestoreRoomParticipants(
  roomId: string,
  onUpdate: (
    participants: LiveViewerInfo[],
    rawDocs: Map<string, FirestoreRoomParticipantDoc>,
    removedParticipants: LiveViewerInfo[]
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
      const removedParticipants: LiveViewerInfo[] = [];

      snap.docChanges().forEach((change) => {
        if (change.type === 'removed') {
          const removedData = change.doc.data() as FirestoreRoomParticipantDoc;
          removedParticipants.push(mapViewerInfo(removedData, change.doc.id));
        }
      });

      snap.docs.forEach((docSnap) => {
        const data = docSnap.data() as FirestoreRoomParticipantDoc;
        const lastSeen = typeof data.lastSeen === 'number' ? data.lastSeen : data.joinedAt || now;
        if (now - lastSeen > ACTIVE_PRESENCE_TTL_MS) {
          return;
        }
        rawDocs.set(docSnap.id, { ...data, userId: String(data.userId || docSnap.id) });
        participants.push(mapViewerInfo(data, docSnap.id));
      });

      participants.sort((a, b) => (a.isHost ? -1 : b.isHost ? 1 : (a.joinedAt || 0) - (b.joinedAt || 0)));
      onUpdate(participants, rawDocs, removedParticipants);
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
  customId?: string,
  replyTo?: {
    id: string;
    senderId?: string;
    senderName: string;
    text: string;
  } | null
): Promise<ChatMessage | null> {
  const uid = auth.currentUser?.uid;
  const trimmed = text.trim().slice(0, 500);
  if (!uid || !trimmed || !isValidFirestoreId(roomId)) return null;

  const rawId = customId && isValidFirestoreId(customId)
    ? customId
    : `rm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const cleanReply =
    replyTo && replyTo.senderName
      ? {
          id: String(replyTo.id || '').slice(0, 128),
          ...(replyTo.senderId ? { senderId: String(replyTo.senderId).slice(0, 128) } : {}),
          senderName: String(replyTo.senderName).slice(0, 64),
          text: String(replyTo.text || '').slice(0, 180),
        }
      : undefined;

  const now = Date.now();
  const msg: ChatMessage = {
    id: rawId,
    senderId: uid,
    senderName: sender.name || 'User',
    senderAvatar: sender.avatar || '',
    senderLevel: typeof sender.level === 'number' ? sender.level : 0,
    senderVip: typeof sender.vipLevel === 'number' ? sender.vipLevel : 0,
    senderSuperVip: typeof sender.superVipLevel === 'number' ? sender.superVipLevel : 0,
    senderIsVip: Boolean(sender.isVIP || (sender.vipLevel || 0) > 0),
    text: trimmed,
    timestamp: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isHost,
    ...(cleanReply ? { replyTo: cleanReply } : {}),
  };

  try {
    const payload: Record<string, any> = {
      ...msg,
      userId: uid,
      createdAt: now,
    };
    if (cleanReply) {
      payload.replyToMessageId = cleanReply.id;
      if (cleanReply.senderId) payload.replyToUserId = cleanReply.senderId;
      payload.replyToUserName = cleanReply.senderName;
      payload.replyToText = cleanReply.text;
    }
    await setDoc(doc(db, 'party_rooms', roomId, 'messages', rawId), payload);
    return msg;
  } catch (err) {
    console.warn('[Firestore Room] sendMessage notice:', err);
    return null;
  }
}

export async function editFirestoreRoomMessage(
  roomId: string,
  messageId: string,
  newText: string
): Promise<boolean> {
  const uid = auth.currentUser?.uid;
  const trimmed = newText.trim().slice(0, 500);
  if (!uid || !trimmed || !isValidFirestoreId(roomId) || !isValidFirestoreId(messageId)) {
    return false;
  }
  try {
    await updateDoc(doc(db, 'party_rooms', roomId, 'messages', messageId), {
      text: trimmed,
      isEdited: true,
      editedAt: Date.now(),
    });
    return true;
  } catch (err) {
    console.warn('[Firestore Room] editMessage notice:', err);
    return false;
  }
}

export async function deleteFirestoreRoomMessage(
  roomId: string,
  messageId: string
): Promise<boolean> {
  if (!auth.currentUser || !isValidFirestoreId(roomId) || !isValidFirestoreId(messageId)) {
    return false;
  }
  try {
    await deleteDoc(doc(db, 'party_rooms', roomId, 'messages', messageId));
    return true;
  } catch (err) {
    console.warn('[Firestore Room] deleteMessage notice:', err);
    return false;
  }
}

export async function clearFirestoreRoomMessages(roomId: string): Promise<boolean> {
  if (!auth.currentUser || !isValidFirestoreId(roomId)) return false;
  try {
    const snap = await getDocs(collection(db, 'party_rooms', roomId, 'messages'));
    const docs = snap.docs;
    // Delete in batches of up to 400 documents
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    // Stamp chatClearedAt so every connected viewer wipes local/WS messages immediately too
    await updateDoc(doc(db, 'party_rooms', roomId), {
      chatClearedAt: Date.now(),
    }).catch(() => {});
    return true;
  } catch (err) {
    console.warn('[Firestore Room] clearMessages notice:', err);
    return false;
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
          const rawReply = data.replyTo && typeof data.replyTo === 'object' ? data.replyTo : null;
          const replySenderName = rawReply?.senderName || data.replyToUserName || '';
          const replyTo = replySenderName
            ? {
                id: String(rawReply?.id || data.replyToMessageId || ''),
                senderId: rawReply?.senderId || data.replyToUserId ? String(rawReply?.senderId || data.replyToUserId) : undefined,
                senderName: String(replySenderName),
                text: String(rawReply?.text || data.replyToText || ''),
              }
            : undefined;
          return {
            createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
            msg: {
              id: d.id,
              senderId: String(data.senderId || data.userId || ''),
              senderName: String(data.senderName || 'User'),
              senderAvatar: String(data.senderAvatar || ''),
              text: String(data.text || ''),
              timestamp: String(data.timestamp || 'Now'),
              createdAtMillis: typeof data.createdAt === 'number' ? data.createdAt : 0,
              isHost: Boolean(data.isHost),
              senderLevel: typeof data.senderLevel === 'number' ? data.senderLevel : typeof data.level === 'number' ? data.level : 0,
              senderVip: typeof data.senderVip === 'number' ? data.senderVip : typeof data.vipLevel === 'number' ? data.vipLevel : 0,
              senderSuperVip: typeof data.senderSuperVip === 'number' ? data.senderSuperVip : typeof data.superVipLevel === 'number' ? data.superVipLevel : 0,
              senderIsVip: Boolean(data.senderIsVip || data.isVIP || (typeof data.senderVip === 'number' && data.senderVip > 0)),
              isSystem: Boolean(data.isSystem),
              isEdited: Boolean(data.isEdited),
              ...(replyTo ? { replyTo } : {}),
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

export async function syncFirestorePartyRoomLifecycle(
  roomId: string,
  patch: {
    numericParticipants?: number;
    hostPresent?: boolean;
    status?: 'active' | 'empty' | 'closed';
    emptySince?: number | null;
    closesAt?: number | null;
  }
): Promise<void> {
  if (!auth.currentUser || !isValidFirestoreId(roomId)) return;
  try {
    const payload: Record<string, any> = {};
    if (typeof patch.numericParticipants === 'number') {
      const safe = Math.max(0, Math.floor(patch.numericParticipants));
      payload.numericParticipants = safe;
      payload.participantCount = String(safe);
      payload.viewersCount = safe;
    }
    if (typeof patch.hostPresent === 'boolean') {
      payload.hostPresent = patch.hostPresent;
      payload.isOwnerPresent = patch.hostPresent;
    }
    if (patch.status) {
      payload.status = patch.status;
    }
    if (patch.emptySince !== undefined) {
      payload.emptySince = patch.emptySince;
    }
    if (patch.closesAt !== undefined) {
      payload.closesAt = patch.closesAt;
    }
    if (Object.keys(payload).length === 0) return;
    await updateDoc(doc(db, 'party_rooms', roomId), payload);
  } catch {
    // Non-fatal if room doc was deleted
  }
}

export function subscribeFirestorePartyRoomDoc(
  roomId: string,
  onStatus: (exists: boolean, data: Record<string, any> | null) => void
): () => void {
  if (!auth.currentUser || !isValidFirestoreId(roomId)) {
    return () => {};
  }

  return onSnapshot(
    doc(db, 'party_rooms', roomId),
    (snap) => {
      onStatus(snap.exists(), snap.exists() ? snap.data() : null);
    },
    () => {}
  );
}

function compactSeatUser(user: UserProfile | null | undefined): UserProfile | null {
  if (!user || !user.id) return null;
  const clean: Record<string, any> = {
    id: String(user.id),
    name: String(user.name || 'User').slice(0, 80),
    username: String(user.username || ''),
    displayId: String(user.displayId || ''),
    avatar: typeof user.avatar === 'string' && (!user.avatar.startsWith('data:') || user.avatar.length <= 160000) ? user.avatar : '',
    level: typeof user.level === 'number' ? user.level : 0,
    fansCount: String(user.fansCount ?? '0'),
    followingCount: typeof user.followingCount === 'number' ? user.followingCount : 0,
    likesCount: String(user.likesCount ?? '0'),
    coins: typeof user.coins === 'number' ? user.coins : 0,
    diamonds: typeof user.diamonds === 'number' ? user.diamonds : 0,
    vipLevel: typeof user.vipLevel === 'number' ? user.vipLevel : 0,
    isVIP: Boolean(user.isVIP),
    bio: String(user.bio || '').slice(0, 140),
  };
  if (typeof user.isVerified === 'boolean') clean.isVerified = user.isVerified;
  if (user.verificationTier) clean.verificationTier = user.verificationTier;
  if (typeof user.equippedVipFrame === 'number') clean.equippedVipFrame = user.equippedVipFrame;
  if (user.activeFrameType) clean.activeFrameType = user.activeFrameType;
  return clean as UserProfile;
}

export async function syncFirestorePartyRoomState(
  roomId: string,
  isHost: boolean,
  patch: {
    seats?: (UserProfile | null)[];
    seatRequests?: Array<{ id: string; user: UserProfile; seatIndex: number; requestedAt: number }>;
    numericParticipants?: number;
    participantCount?: string;
    likesCount?: number;
    mutedSeatIndices?: number[];
    isLocked?: boolean;
    allowJoin?: boolean;
    announcement?: string;
    maxSeats?: number;
    hostLevel?: number;
    host?: UserProfile;
    backgroundType?: 'preset' | 'host_dp' | 'custom';
    backgroundId?: string;
    backgroundImage?: string;
    seatTheme?: 'default' | 'gold' | 'green';
    chatClearedAt?: number;
    isModerator?: boolean;
  }
): Promise<void> {
  if (!auth.currentUser || !isValidFirestoreId(roomId)) return;
  try {
    const payload: Record<string, any> = {};
    const resolvedHostLevel =
      typeof patch.hostLevel === 'number'
        ? sanitizeUserLevel(patch.hostLevel)
        : typeof patch.host?.level === 'number'
        ? sanitizeUserLevel(patch.host.level)
        : undefined;
    const clampedMaxSeats =
      typeof patch.maxSeats === 'number'
        ? resolvedHostLevel !== undefined
          ? Math.max(
              clampPartyMaxSeatsForHostLevel(patch.maxSeats, resolvedHostLevel),
              Array.isArray(patch.seats) ? patch.seats.length : 0
            )
          : [5, 8, 16].includes(patch.maxSeats)
          ? patch.maxSeats
          : 5
        : undefined;

    if (Array.isArray(patch.seats)) {
      const compacted = patch.seats.map((s) => compactSeatUser(s));
      const targetLen = Math.max(clampedMaxSeats ?? compacted.length, compacted.length);
      const preserved: (UserProfile | null)[] = Array.from({ length: targetLen }, (_, idx) => compacted[idx] || null);
      payload.seats = preserved;
    }
    if (Array.isArray(patch.seatRequests)) {
      payload.seatRequests = patch.seatRequests
        .map((r) => {
          const u = compactSeatUser(r.user);
          if (!u) return null;
          return {
            id: String(r.id || `sr_${Date.now()}`),
            user: u,
            seatIndex: typeof r.seatIndex === 'number' ? r.seatIndex : 2,
            requestedAt: typeof r.requestedAt === 'number' ? r.requestedAt : Date.now(),
          };
        })
        .filter(Boolean);
    }
    if (typeof patch.numericParticipants === 'number') {
      const safe = Math.max(0, Math.floor(patch.numericParticipants));
      payload.numericParticipants = safe;
      payload.viewersCount = safe;
      payload.participantCount = patch.participantCount ?? String(safe);
    }
    if (typeof patch.likesCount === 'number') {
      payload.likesCount = Math.max(0, Math.floor(patch.likesCount));
    }
    if (typeof patch.chatClearedAt === 'number') {
      payload.chatClearedAt = Math.max(0, Math.floor(patch.chatClearedAt));
    }
    if (isHost || patch.isModerator) {
      if (Array.isArray(patch.mutedSeatIndices)) payload.mutedSeatIndices = patch.mutedSeatIndices;
      if (typeof patch.isLocked === 'boolean') payload.isLocked = patch.isLocked;
      if (typeof patch.allowJoin === 'boolean') payload.allowJoin = patch.allowJoin;
      if (typeof patch.announcement === 'string') payload.announcement = patch.announcement.slice(0, 200);
    }
    if (isHost) {
      if (patch.host) {
        const compactHost = compactSeatUser(patch.host);
        if (compactHost) payload.host = compactHost;
      }
      if (clampedMaxSeats !== undefined) payload.maxSeats = clampedMaxSeats;
      if (
        patch.backgroundType === 'preset' ||
        patch.backgroundType === 'host_dp' ||
        patch.backgroundType === 'custom'
      ) {
        payload.backgroundType = patch.backgroundType;
      }
      if (typeof patch.backgroundId === 'string' && patch.backgroundId.trim()) {
        payload.backgroundId = patch.backgroundId.trim().slice(0, 48);
      }
      if (typeof patch.backgroundImage === 'string') {
        const trimmed = patch.backgroundImage.trim();
        payload.backgroundImage =
          !trimmed || !trimmed.startsWith('data:') || trimmed.length <= 160000
            ? trimmed.slice(0, 160000)
            : '';
      }
      if (
        patch.seatTheme === 'default' ||
        patch.seatTheme === 'gold' ||
        patch.seatTheme === 'green'
      ) {
        payload.seatTheme = patch.seatTheme;
      }
    }
    if (Object.keys(payload).length === 0) return;
    await updateDoc(doc(db, 'party_rooms', roomId), payload);
  } catch {
    // Non-fatal: room may have just closed
  }
}

export interface FirestoreSeatRequestEntry {
  id: string;
  user: UserProfile;
  seatIndex: number;
  requestedAt: number;
}

/**
 * Atomically append/update a listener's seat request directly on the Firestore party room doc.
 * Works cross-device (Web <-> Android) even if the Express backend is unreachable or restarted.
 */
export async function submitFirestoreSeatRequest(
  roomId: string,
  request: FirestoreSeatRequestEntry
): Promise<{ success: boolean; seatRequests?: FirestoreSeatRequestEntry[]; error?: string }> {
  if (!auth.currentUser || !isValidFirestoreId(roomId)) {
    return { success: false, error: 'Please sign in to request a seat.' };
  }
  const compactUser = compactSeatUser(request.user);
  if (!compactUser) {
    return { success: false, error: 'Invalid user profile.' };
  }

  const roomRef = doc(db, 'party_rooms', roomId);
  try {
    const updatedRequests = await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) {
        throw new Error('This party room has already been closed.');
      }
      const data = snap.data() as Record<string, any>;
      if (data.isLocked || data.allowJoin === false) {
        throw new Error('Stage seats are currently locked by the host.');
      }
      const currentSeats: (UserProfile | null)[] = Array.isArray(data.seats) ? data.seats : [];
      if (currentSeats.some((s) => s && s.id === compactUser.id)) {
        throw new Error('You already occupy a seat in this room.');
      }
      const hostLevel = sanitizeUserLevel(data.host?.level);
      const maxSeats = clampPartyMaxSeatsForHostLevel(data.maxSeats, hostLevel);
      const defaultSeat = isSeatLockedByHostLevel(1, hostLevel) ? 2 : 1;
      if (typeof request.seatIndex === 'number' && request.seatIndex >= maxSeats) {
        throw new Error(
          request.seatIndex >= 8
            ? '16-seat stage unlocks at Host Level 20.'
            : '8-seat stage unlocks at Host Level 10.'
        );
      }
      const safeIndex =
        typeof request.seatIndex === 'number' && request.seatIndex >= 0 && request.seatIndex < maxSeats
          ? request.seatIndex
          : defaultSeat;
      if (isSeatLockedByHostLevel(safeIndex, hostLevel)) {
        throw new Error('Seat #2 is locked until the host reaches Level 5.');
      }

      const existing: FirestoreSeatRequestEntry[] = Array.isArray(data.seatRequests)
        ? data.seatRequests
        : [];
      const nextEntry: FirestoreSeatRequestEntry = {
        id: String(request.id || `sr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
        user: compactUser,
        seatIndex: safeIndex,
        requestedAt: typeof request.requestedAt === 'number' ? request.requestedAt : Date.now(),
      };
      const nextRequests = [
        ...existing.filter((r) => r?.user?.id && r.user.id !== compactUser.id),
        nextEntry,
      ];

      tx.update(roomRef, { seatRequests: nextRequests });
      return nextRequests;
    });

    return { success: true, seatRequests: updatedRequests };
  } catch (err: any) {
    const rawMsg = String(err?.message || '');
    if (/permission|insufficient/i.test(rawMsg)) {
      return { success: false, error: 'You cannot request a seat in this room.' };
    }
    return { success: false, error: rawMsg || 'Could not send seat request.' };
  }
}

/**
 * Atomically approve or decline a pending seat request directly on Firestore party room doc.
 */
export async function respondFirestoreSeatRequest(
  roomId: string,
  applicant: UserProfile,
  approve: boolean,
  preferredSeatIndex: number,
  maxSeatsFallback = 5
): Promise<{
  success: boolean;
  seats?: (UserProfile | null)[];
  seatRequests?: FirestoreSeatRequestEntry[];
  assignedSeatIndex?: number;
  error?: string;
}> {
  if (!auth.currentUser || !isValidFirestoreId(roomId)) {
    return { success: false, error: 'Authentication required.' };
  }
  const roomRef = doc(db, 'party_rooms', roomId);
  try {
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) {
        throw new Error('Party room not found.');
      }
      const data = snap.data() as Record<string, any>;
      const hostLevel = sanitizeUserLevel(data.host?.level);
      const rawSeats: (UserProfile | null)[] = Array.isArray(data.seats) ? data.seats : [];
      const storedMax = typeof data.maxSeats === 'number' && [5, 8, 16].includes(data.maxSeats)
        ? data.maxSeats
        : clampPartyMaxSeatsForHostLevel(data.maxSeats ?? maxSeatsFallback, hostLevel);
      const maxSeats = Math.max(storedMax, rawSeats.length);
      const nextSeats: (UserProfile | null)[] = Array.from(
        { length: maxSeats },
        (_, idx) => (rawSeats[idx] ? compactSeatUser(rawSeats[idx]) : null)
      );

      const existingReqs: FirestoreSeatRequestEntry[] = Array.isArray(data.seatRequests)
        ? data.seatRequests
        : [];
      const nextRequests = existingReqs.filter((r) => r?.user?.id !== applicant.id);
      let assignedSeatIndex = -1;

      if (approve) {
        // Clear applicant from any old seat
        for (let i = 0; i < nextSeats.length; i++) {
          if (nextSeats[i]?.id === applicant.id) {
            nextSeats[i] = null;
          }
        }
        const seatTwoLocked = isSeatLockedByHostLevel(1, hostLevel) && maxSeats <= 5;
        const defaultSeat = seatTwoLocked ? 2 : 1;
        let targetIdx =
          typeof preferredSeatIndex === 'number' &&
          preferredSeatIndex >= 0 &&
          preferredSeatIndex < maxSeats &&
          !(preferredSeatIndex === 1 && seatTwoLocked)
            ? preferredSeatIndex
            : defaultSeat;
        if (nextSeats[targetIdx] !== null || (targetIdx === 1 && seatTwoLocked)) {
          const openIdx = nextSeats.findIndex(
            (s, idx) => s === null && !(idx === 1 && seatTwoLocked)
          );
          if (openIdx === -1) {
            throw new Error('All unlocked seats are currently full.');
          }
          targetIdx = openIdx;
        }
        nextSeats[targetIdx] = compactSeatUser(applicant);
        assignedSeatIndex = targetIdx;
      }

      const isHostActor = data.host?.id === auth.currentUser?.uid;
      if (isHostActor) {
        tx.update(roomRef, {
          seats: nextSeats,
          seatRequests: nextRequests,
        });
      } else {
        tx.update(roomRef, {
          seats: nextSeats,
          seatRequests: nextRequests,
        });
      }

      return { seats: nextSeats, seatRequests: nextRequests, assignedSeatIndex };
    });

    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: String(err?.message || 'Failed to update seat request.') };
  }
}

/**
 * Atomically seat a user (host taking a seat or host directly assigning a listener).
 */
export async function takeFirestoreSeatDirect(
  roomId: string,
  seatIndex: number,
  targetUser: UserProfile,
  maxSeatsFallback = 5
): Promise<{ success: boolean; seats?: (UserProfile | null)[]; seatRequests?: FirestoreSeatRequestEntry[]; error?: string }> {
  if (!auth.currentUser || !isValidFirestoreId(roomId)) return { success: false };
  const compactUser = compactSeatUser(targetUser);
  if (!compactUser) return { success: false };

  const roomRef = doc(db, 'party_rooms', roomId);
  try {
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return null;
      const data = snap.data() as Record<string, any>;
      const hostLevel = sanitizeUserLevel(data.host?.level);
      const rawSeats: (UserProfile | null)[] = Array.isArray(data.seats) ? data.seats : [];
      const storedMax = typeof data.maxSeats === 'number' && [5, 8, 16].includes(data.maxSeats)
        ? data.maxSeats
        : clampPartyMaxSeatsForHostLevel(data.maxSeats ?? maxSeatsFallback, hostLevel);
      const maxSeats = Math.max(storedMax, rawSeats.length);
      const seatTwoLocked = seatIndex === 1 && isSeatLockedByHostLevel(1, hostLevel) && maxSeats <= 5;
      if (seatIndex < 0 || seatIndex >= maxSeats || seatTwoLocked) {
        return null;
      }
      const nextSeats: (UserProfile | null)[] = Array.from(
        { length: maxSeats },
        (_, idx) => (rawSeats[idx] ? compactSeatUser(rawSeats[idx]) : null)
      );
      for (let i = 0; i < nextSeats.length; i++) {
        if (nextSeats[i]?.id === compactUser.id) nextSeats[i] = null;
      }
      nextSeats[seatIndex] = compactUser;
      const existingReqs: FirestoreSeatRequestEntry[] = Array.isArray(data.seatRequests)
        ? data.seatRequests
        : [];
      const nextRequests = existingReqs.filter((r) => r?.user?.id !== compactUser.id);
      tx.update(roomRef, { seats: nextSeats, seatRequests: nextRequests });
      return { seats: nextSeats, seatRequests: nextRequests };
    });
    return result ? { success: true, ...result } : { success: false };
  } catch {
    return { success: false };
  }
}

/**
 * Atomically remove a user from their seat in Firestore (used for both self-leave and Host kick).
 */
export async function vacateFirestoreSeat(
  roomId: string,
  targetUserId: string,
  seatIndex?: number,
  maxSeatsFallback = 5
): Promise<{ success: boolean; seats?: (UserProfile | null)[]; mutedSeatIndices?: number[] }> {
  const uid = auth.currentUser?.uid;
  if (!uid || !isValidFirestoreId(roomId)) return { success: false };
  const roomRef = doc(db, 'party_rooms', roomId);
  try {
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return null;
      const data = snap.data() as Record<string, any>;
      const roomOwnerId = typeof data.host?.id === 'string' ? data.host.id : '';
      // Permanent Room Owner protection: no other user or moderator can ever vacate the Room Owner's seat
      if (roomOwnerId && targetUserId === roomOwnerId && uid !== roomOwnerId) {
        return null;
      }
      const rawSeats: (UserProfile | null)[] = Array.isArray(data.seats) ? data.seats : [];
      const storedMax = typeof data.maxSeats === 'number' && [5, 8, 16].includes(data.maxSeats)
        ? data.maxSeats
        : clampPartyMaxSeatsForHostLevel(data.maxSeats ?? maxSeatsFallback, sanitizeUserLevel(data.host?.level));
      const maxSeats = Math.max(storedMax, rawSeats.length);
      const seats: (UserProfile | null)[] = Array.from(
        { length: maxSeats },
        (_, idx) => (rawSeats[idx] ? compactSeatUser(rawSeats[idx]) : null)
      );
      if (
        typeof seatIndex === 'number' &&
        seatIndex >= 0 &&
        seatIndex < seats.length &&
        roomOwnerId &&
        seats[seatIndex]?.id === roomOwnerId &&
        uid !== roomOwnerId
      ) {
        return null;
      }
      const clearedIndices = new Set<number>();
      if (typeof seatIndex === 'number' && seatIndex >= 0 && seatIndex < maxSeats) {
        if (!roomOwnerId || seats[seatIndex]?.id !== roomOwnerId || uid === roomOwnerId) {
          seats[seatIndex] = null;
          clearedIndices.add(seatIndex);
        }
      }
      for (let i = 0; i < seats.length; i++) {
        if (seats[i]?.id === targetUserId) {
          if (!roomOwnerId || seats[i]?.id !== roomOwnerId || uid === roomOwnerId) {
            seats[i] = null;
            clearedIndices.add(i);
          }
        }
      }
      const existingMuted: number[] = Array.isArray(data.mutedSeatIndices) ? data.mutedSeatIndices : [];
      const nextMuted = existingMuted.filter((mIdx) => !clearedIndices.has(mIdx) && mIdx < maxSeats);
      const isHostActor = roomOwnerId === uid;
      if (isHostActor) {
        tx.update(roomRef, { seats, mutedSeatIndices: nextMuted });
      } else {
        tx.update(roomRef, { seats });
      }
      return { seats, mutedSeatIndices: isHostActor ? nextMuted : existingMuted };
    });
    return result ? { success: true, ...result } : { success: false };
  } catch {
    return { success: false };
  }
}

/**
 * Atomically cancel a viewer's own pending seat request in Firestore.
 */
export async function cancelFirestoreSeatRequest(
  roomId: string,
  userId: string
): Promise<{ success: boolean; seatRequests?: FirestoreSeatRequestEntry[] }> {
  if (!auth.currentUser || !isValidFirestoreId(roomId)) return { success: false };
  const roomRef = doc(db, 'party_rooms', roomId);
  try {
    const nextRequests = await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return null;
      const data = snap.data() as Record<string, any>;
      const existing: FirestoreSeatRequestEntry[] = Array.isArray(data.seatRequests)
        ? data.seatRequests
        : [];
      const filtered = existing.filter((r) => r?.user?.id !== userId);
      tx.update(roomRef, { seatRequests: filtered });
      return filtered;
    });
    return nextRequests ? { success: true, seatRequests: nextRequests } : { success: false };
  } catch {
    return { success: false };
  }
}

export interface FirestoreRoomHeartEvent {
  id: string;
  senderId: string;
  senderName?: string;
  count: number;
  x?: number;
  y?: number;
  timestamp: number;
}

/**
 * Broadcast & persist a batched party-room heart reaction via Firestore so all participants
 * across Web and Android see double-tap hearts in real time without flooding the server.
 */
export async function sendFirestoreRoomHeart(
  roomId: string,
  senderId: string,
  senderName: string,
  count: number,
  x?: number,
  y?: number
): Promise<{ likesCount?: number }> {
  if (!auth.currentUser || !isValidFirestoreId(roomId)) return {};
  const roomRef = doc(db, 'party_rooms', roomId);
  const safeCount = Math.min(Math.max(1, Math.round(count || 1)), 20);
  const now = Date.now();
  const event: FirestoreRoomHeartEvent = {
    id: `ht_${now}_${Math.random().toString(36).slice(2, 6)}`,
    senderId,
    senderName: (senderName || 'Guest').slice(0, 60),
    count: safeCount,
    timestamp: now,
  };
  if (typeof x === 'number' && Number.isFinite(x)) {
    event.x = Math.max(5, Math.min(95, Math.round(x * 10) / 10));
  }
  if (typeof y === 'number' && Number.isFinite(y)) {
    event.y = Math.max(10, Math.min(90, Math.round(y * 10) / 10));
  }
  try {
    const likesCount = await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return undefined;
      const data = snap.data() as Record<string, any>;
      const currentLikes = typeof data.likesCount === 'number' ? data.likesCount : 0;
      const nextLikes = currentLikes + safeCount;
      tx.update(roomRef, {
        likesCount: nextLikes,
        lastHeartEvent: event,
      });
      return nextLikes;
    });
    return { likesCount };
  } catch {
    return {};
  }
}


