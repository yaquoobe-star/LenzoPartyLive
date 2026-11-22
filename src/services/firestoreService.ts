import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  UserProfile, 
  VideoItem, 
  LiveStream, 
  PartyRoom, 
  Conversation, 
  ChatMessage, 
  NotificationItem, 
  Transaction 
} from '../types';
import {
  clampPartyMaxSeatsForHostLevel,
  getActiveSeatCapacity,
  isSeatLockedByHostLevel,
  sanitizeUserLevel,
} from '../utils/partySeatRules';

/**
 * 1. REAL POSTS / VIDEOS FIRESTORE SERVICE
 */
export async function fetchFirestoreVideos(): Promise<VideoItem[]> {
  const collPath = 'posts';
  try {
    const q = query(collection(db, collPath), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        creator: data.creator || data.user || {
          id: data.userId || 'unknown',
          name: 'Creator',
          avatar: '',
          level: 1,
          fansCount: '0',
          followingCount: 0,
          likesCount: '0',
          coins: 0,
          diamonds: 0,
          vipLevel: 0,
          isVIP: false,
          bio: '',
          displayId: '',
        },
        videoUrl: data.videoUrl,
        thumbnailUrl: data.thumbnailUrl || data.videoUrl,
        description: data.description || '',
        musicTitle: data.musicTitle || 'Original Sound - Lenzo Party Live',
        hashtags: data.hashtags || ['#viral', '#lenzo'],
        likesCount: data.likesCount || 0,
        commentsCount: data.commentsCount || 0,
        sharesCount: data.sharesCount || 0,
        repostsCount: data.repostsCount || 0,
        isLiked: false,
        isSaved: false,
        isPrivate: data.isPrivate || false,
        createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate().toISOString() : new Date().toISOString(),
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, collPath);
    return [];
  }
}

export function subscribeFirestoreVideos(onUpdate: (videos: VideoItem[]) => void) {
  const collPath = 'posts';
  const q = query(collection(db, collPath), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snap) => {
      const vids = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          creator: data.creator || data.user || {
            id: data.userId || 'unknown',
            name: 'Creator',
            avatar: '',
            level: 1,
            fansCount: '0',
            followingCount: 0,
            likesCount: '0',
            coins: 0,
            diamonds: 0,
            vipLevel: 0,
            isVIP: false,
            bio: '',
            displayId: '',
          },
          videoUrl: data.videoUrl,
          thumbnailUrl: data.thumbnailUrl || data.videoUrl,
          description: data.description || '',
          musicTitle: data.musicTitle || 'Original Sound - Lenzo Party Live',
          hashtags: data.hashtags || ['#viral', '#lenzo'],
          likesCount: data.likesCount || 0,
          commentsCount: data.commentsCount || 0,
          sharesCount: data.sharesCount || 0,
          repostsCount: data.repostsCount || 0,
          isLiked: false,
          isSaved: false,
          isPrivate: data.isPrivate || false,
          createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate().toISOString() : new Date().toISOString(),
        };
      });
      onUpdate(vids);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, collPath);
    }
  );
}

export async function createFirestoreVideo(video: {
  videoUrl: string;
  thumbnailUrl?: string;
  description: string;
  musicTitle?: string;
  isPrivate?: boolean;
}): Promise<string> {
  const collPath = 'posts';
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Authentication required to upload a video.');

  try {
    const docRef = await addDoc(collection(db, collPath), {
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl || video.videoUrl,
      description: video.description,
      musicTitle: video.musicTitle || 'Original Sound - Lenzo Party Live',
      isPrivate: video.isPrivate || false,
      userId: currentUser.uid,
      user: {
        id: currentUser.uid,
        name: currentUser.displayName || 'Lenzo Creator',
        username: `@${(currentUser.email?.split('@')[0] || 'user').toLowerCase()}`,
        avatar: currentUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        level: 1,
      },
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, collPath);
    throw err;
  }
}

export async function toggleLikeVideo(videoId: string, isLiked: boolean): Promise<void> {
  const docRef = doc(db, 'posts', videoId);
  try {
    await updateDoc(docRef, {
      likesCount: increment(isLiked ? 1 : -1),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `posts/${videoId}`);
  }
}

/**
 * Deep-sanitize payloads before writing to Cloud Firestore.
 * - Removes all `undefined` object keys (Firestore rejects `undefined` with INVALID_ARGUMENT).
 * - Converts `undefined` array elements to `null`.
 * - Preserves Firestore FieldValue / Timestamp sentinel objects intact.
 */
const VALID_DOC_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

function isFirestoreSentinelOrTimestamp(val: any): boolean {
  if (!val || typeof val !== 'object') return false;
  if (val instanceof Timestamp) return true;
  if (typeof val._methodName === 'string') return true;
  if (typeof val.toDate === 'function' && typeof val.seconds === 'number') return true;
  return false;
}

export function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined) return null as unknown as T;
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      return 0 as unknown as T;
    }
    return value;
  }
  if (isFirestoreSentinelOrTimestamp(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => (item === undefined ? null : stripUndefinedDeep(item))) as unknown as T;
  }
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(value as Record<string, any>)) {
    if (v === undefined) continue;
    out[k] = stripUndefinedDeep(v);
  }
  return out as T;
}

function safeImageUrlForCard(url?: string | null, maxBytes = 160000): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  // Guard against oversized inline base64 images exceeding Firestore's 1 MiB document limit
  if (trimmed.startsWith('data:') && trimmed.length > maxBytes) {
    return '';
  }
  return trimmed;
}

export function sanitizeFirestoreUserCard(
  user: Partial<UserProfile> | null | undefined,
  forcedUid?: string
): UserProfile {
  const uid = forcedUid || user?.id || auth.currentUser?.uid || 'unknown';
  const card: Record<string, any> = {
    id: String(uid),
    name: String(user?.name || auth.currentUser?.displayName || 'Lenzo User').slice(0, 80),
    username: String(user?.username || `@${String(uid).slice(0, 8)}`).slice(0, 60),
    displayId: String(user?.displayId || String(uid).slice(0, 8)),
    avatar: safeImageUrlForCard(user?.avatar || auth.currentUser?.photoURL || ''),
    level: typeof user?.level === 'number' && Number.isFinite(user.level) ? user.level : 0,
    fansCount: String(user?.fansCount ?? '0'),
    followingCount: typeof user?.followingCount === 'number' ? user.followingCount : 0,
    likesCount: String(user?.likesCount ?? '0'),
    coins: typeof user?.coins === 'number' ? user.coins : 0,
    diamonds: typeof user?.diamonds === 'number' ? user.diamonds : 0,
    vipLevel: typeof user?.vipLevel === 'number' ? user.vipLevel : 0,
    isVIP: Boolean(user?.isVIP),
    superVipLevel: typeof user?.superVipLevel === 'number' ? user.superVipLevel : 0,
    isSuperVIP: Boolean(user?.isSuperVIP),
    bio: String(user?.bio || '').slice(0, 200),
    isOnline: true,
  };
  const safeCover = safeImageUrlForCard(user?.coverImage, 120000);
  if (safeCover) card.coverImage = safeCover;
  if (typeof user?.isVerified === 'boolean') card.isVerified = user.isVerified;
  if (user?.verificationTier) card.verificationTier = user.verificationTier;
  if (user?.country) card.country = user.country;
  if (user?.activeFrameType) card.activeFrameType = user.activeFrameType;
  if (typeof user?.equippedVipFrame === 'number') card.equippedVipFrame = user.equippedVipFrame;
  if (typeof user?.equippedSuperVipFrame === 'number') card.equippedSuperVipFrame = user.equippedSuperVipFrame;
  if (Array.isArray(user?.equippedBadges) && user.equippedBadges.length > 0) {
    card.equippedBadges = user.equippedBadges.slice(0, 6);
  }
  return card as UserProfile;
}

function toMillis(val: any, fallback = Date.now()): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (val && typeof val.toMillis === 'function') return val.toMillis();
  if (val && typeof val.seconds === 'number') return val.seconds * 1000;
  return fallback;
}

function normalizeFirestorePartyRoom(id: string, data: any): PartyRoom {
  const hostCard = sanitizeFirestoreUserCard(data?.host);
  const hostLevel = sanitizeUserLevel(hostCard.level);
  const maxSeats = clampPartyMaxSeatsForHostLevel(data?.maxSeats, hostLevel);
  const activeCapacity = getActiveSeatCapacity(maxSeats, hostLevel);
  const rawSeats = Array.isArray(data?.seats) ? data.seats : [];
  const seats: (UserProfile | null)[] = Array(maxSeats).fill(null);
  for (let i = 0; i < Math.min(maxSeats, rawSeats.length); i++) {
    seats[i] =
      rawSeats[i] && !isSeatLockedByHostLevel(i, hostLevel)
        ? sanitizeFirestoreUserCard(rawSeats[i])
        : null;
  }
  const numericParticipants =
    typeof data?.numericParticipants === 'number'
      ? data.numericParticipants
      : typeof data?.viewersCount === 'number'
        ? data.viewersCount
        : Math.max(1, seats.filter(Boolean).length);

  return {
    id,
    displayId: String(data?.displayId || id.replace(/[^0-9]/g, '').slice(-5) || '10001'),
    title: String(data?.title || 'Party Voice Room'),
    category: (data?.category || 'Party') as PartyRoom['category'],
    host: hostCard,
    coverImage: String(data?.coverImage || data?.host?.avatar || ''),
    iconType: data?.iconType || 'heart',
    participantCount: String(data?.participantCount || `${numericParticipants}/${activeCapacity}`),
    numericParticipants,
    isAudioRoom: true,
    maxSeats,
    roomType: data?.roomType === 'private' ? 'private' : 'public',
    ...(data?.password ? { password: String(data.password) } : {}),
    announcement: String(data?.announcement || 'Welcome to my party voice room!'),
    seats,
    mutedSeatIndices: Array.isArray(data?.mutedSeatIndices) ? data.mutedSeatIndices : [],
    seatRequests: Array.isArray(data?.seatRequests) ? data.seatRequests : [],
    isLocked: Boolean(data?.isLocked),
    allowJoin: data?.allowJoin !== false,
    startTime: toMillis(data?.startTime ?? data?.createdAt),
    likesCount: typeof data?.likesCount === 'number' ? data.likesCount : 0,
    backgroundType:
      data?.backgroundType === 'host_dp' || data?.backgroundType === 'custom'
        ? data.backgroundType
        : 'preset',
    backgroundId: typeof data?.backgroundId === 'string' && data.backgroundId.trim() ? data.backgroundId : 'royal_neon',
    backgroundImage: typeof data?.backgroundImage === 'string' ? data.backgroundImage : '',
  };
}

function normalizeFirestoreLiveStream(id: string, data: any): LiveStream {
  const numericViewers =
    typeof data?.numericViewers === 'number'
      ? data.numericViewers
      : typeof data?.viewersCount === 'number'
        ? data.viewersCount
        : 0;
  return {
    id,
    title: String(data?.title || 'Live Broadcast'),
    category: String(data?.category || 'Live'),
    host: sanitizeFirestoreUserCard(data?.host),
    coverImage: String(data?.coverImage || data?.host?.coverImage || data?.host?.avatar || ''),
    viewerCount: String(data?.viewerCount ?? numericViewers),
    numericViewers,
    isLive: data?.isLive !== false && data?.status !== 'ended',
    tags: Array.isArray(data?.tags) ? data.tags : [String(data?.category || 'Live')],
    guests: Array.isArray(data?.guests) ? data.guests : [],
    likesCount: typeof data?.likesCount === 'number' ? data.likesCount : 0,
    commentsCount: typeof data?.commentsCount === 'number' ? data.commentsCount : 0,
    startTime: toMillis(data?.startTime ?? data?.createdAt),
    allowGuests: data?.allowGuests !== false,
    isPrivate: Boolean(data?.isPrivate),
  };
}

/**
 * 2. REAL PARTY ROOMS FIRESTORE SERVICE
 */
export async function fetchFirestorePartyRooms(): Promise<PartyRoom[]> {
  const collPath = 'party_rooms';
  try {
    const q = query(collection(db, collPath), limit(100));
    const snap = await getDocs(q);
    return snap.docs
      .filter((d) => d.data()?.status !== 'closed' && d.data()?.status !== 'ended')
      .map((d) => normalizeFirestorePartyRoom(d.id, d.data()))
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
  } catch (err) {
    console.warn('[Firestore] fetchFirestorePartyRooms notice:', err);
    return [];
  }
}

export function subscribeFirestorePartyRooms(onUpdate: (rooms: PartyRoom[]) => void) {
  const collPath = 'party_rooms';
  const q = query(collection(db, collPath), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      const rooms = snap.docs
        .filter((d) => d.data()?.status !== 'closed' && d.data()?.status !== 'ended')
        .map((d) => normalizeFirestorePartyRoom(d.id, d.data()))
        .sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
      onUpdate(rooms);
    },
    (err) => {
      console.warn('[Firestore] subscribeFirestorePartyRooms notice:', err);
    }
  );
}

export async function createFirestorePartyRoom(room: PartyRoom | Omit<PartyRoom, 'id'>): Promise<string> {
  const collPath = 'party_rooms';
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('Authentication required to create a party room.');
  }

  try {
    const rawId = 'id' in room && room.id ? String(room.id) : `room_${Date.now()}`;
    const safeId = VALID_DOC_ID_REGEX.test(rawId) ? rawId : `room_${Date.now()}`;
    const safeHost = sanitizeFirestoreUserCard(room.host, uid);
    const maxSeats = clampPartyMaxSeatsForHostLevel(room.maxSeats, safeHost.level);
    const rawSeats = Array.isArray(room.seats) ? room.seats : Array(maxSeats).fill(null);
    const safeSeats: (UserProfile | null)[] = Array(maxSeats).fill(null);
    for (let i = 0; i < Math.min(maxSeats, rawSeats.length); i++) {
      const occupant = rawSeats[i];
      if (occupant && !isSeatLockedByHostLevel(i, safeHost.level)) {
        const isHostOccupant = i === 0 || occupant.id === room.host?.id || occupant.id === uid;
        safeSeats[i] = sanitizeFirestoreUserCard(occupant, isHostOccupant ? uid : occupant.id);
      }
    }

    const payload: Record<string, any> = stripUndefinedDeep({
      id: safeId,
      displayId: room.displayId || String(Math.floor(10000 + Math.random() * 90000)),
      title: String(room.title || 'Party Voice Room').trim().slice(0, 100),
      category: String(room.category || 'Party'),
      host: safeHost,
      coverImage: safeImageUrlForCard(room.coverImage, 160000) || safeHost.avatar || '',
      iconType: room.iconType || 'heart',
      participantCount: String(
        room.participantCount || `1/${getActiveSeatCapacity(maxSeats, safeHost.level)}`
      ),
      numericParticipants: typeof room.numericParticipants === 'number' ? room.numericParticipants : 1,
      viewersCount: typeof room.numericParticipants === 'number' ? room.numericParticipants : 1,
      isAudioRoom: true,
      maxSeats,
      roomType: room.roomType === 'private' ? 'private' : 'public',
      announcement: String(room.announcement || 'Welcome to my party voice room!').slice(0, 200),
      seats: safeSeats,
      mutedSeatIndices: Array.isArray(room.mutedSeatIndices) ? room.mutedSeatIndices : [],
      seatRequests: [],
      isLocked: Boolean(room.isLocked),
      allowJoin: room.allowJoin !== false,
      startTime: typeof room.startTime === 'number' ? room.startTime : Date.now(),
      updatedAt: Date.now(),
      likesCount: typeof room.likesCount === 'number' ? room.likesCount : 0,
      backgroundType:
        room.backgroundType === 'host_dp' || room.backgroundType === 'custom'
          ? room.backgroundType
          : 'preset',
      backgroundId:
        typeof room.backgroundId === 'string' && room.backgroundId.trim()
          ? room.backgroundId.trim().slice(0, 48)
          : 'royal_neon',
      backgroundImage:
        room.backgroundType === 'host_dp'
          ? safeImageUrlForCard(room.backgroundImage || safeHost.avatar, 160000) || ''
          : room.backgroundType === 'custom'
          ? safeImageUrlForCard(room.backgroundImage, 160000) || ''
          : '',
      status: 'active',
    });

    if (room.roomType === 'private' && room.password && room.password.trim()) {
      payload.password = room.password.trim();
    }

    await setDoc(doc(db, collPath, safeId), {
      ...payload,
      createdAt: serverTimestamp(),
    });
    return safeId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, collPath);
    throw err;
  }
}

export async function updateFirestorePartyRoom(roomId: string, updates: Partial<PartyRoom>): Promise<void> {
  if (!auth.currentUser || !VALID_DOC_ID_REGEX.test(roomId)) return;
  const docRef = doc(db, 'party_rooms', roomId);
  try {
    const cleanUpdates: Record<string, any> = stripUndefinedDeep({ ...updates });
    const updateHostLevel =
      updates.host && typeof updates.host.level === 'number'
        ? sanitizeUserLevel(updates.host.level)
        : undefined;
    if (typeof updates.maxSeats === 'number' && updateHostLevel !== undefined) {
      cleanUpdates.maxSeats = clampPartyMaxSeatsForHostLevel(updates.maxSeats, updateHostLevel);
    }
    if (Array.isArray(updates.seats)) {
      const clampedSeats = updates.seats.map((s, idx) =>
        s && (updateHostLevel === undefined || !isSeatLockedByHostLevel(idx, updateHostLevel))
          ? sanitizeFirestoreUserCard(s)
          : null
      );
      cleanUpdates.seats =
        typeof cleanUpdates.maxSeats === 'number'
          ? clampedSeats.slice(0, cleanUpdates.maxSeats)
          : clampedSeats;
    }
    if (updates.host) {
      cleanUpdates.host = sanitizeFirestoreUserCard(updates.host);
    }
    delete cleanUpdates.id;
    if (Object.keys(cleanUpdates).length === 0) return;
    await updateDoc(docRef, cleanUpdates);
  } catch (err) {
    console.warn(`[Firestore] updateFirestorePartyRoom (${roomId}) notice:`, err);
  }
}

export async function deleteFirestorePartyRoom(roomId: string): Promise<void> {
  if (!auth.currentUser || !VALID_DOC_ID_REGEX.test(roomId)) return;
  const docRef = doc(db, 'party_rooms', roomId);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    console.warn(`[Firestore] deleteFirestorePartyRoom (${roomId}) notice:`, err);
  }
}

/**
 * 3. REAL LIVE STREAMS FIRESTORE SERVICE
 */
function dedupeStreamsByHost(streams: LiveStream[]): LiveStream[] {
  const sorted = [...streams].sort(
    (a, b) => (b.startTime || 0) - (a.startTime || 0) || (b.numericViewers || 0) - (a.numericViewers || 0)
  );
  const byHost = new Map<string, LiveStream>();
  for (const stream of sorted) {
    const hostKey = stream.host?.id || stream.id;
    if (!byHost.has(hostKey)) {
      byHost.set(hostKey, stream);
    }
  }
  return Array.from(byHost.values()).sort(
    (a, b) => (b.numericViewers || 0) - (a.numericViewers || 0) || (b.startTime || 0) - (a.startTime || 0)
  );
}

export async function fetchFirestoreLiveStreams(): Promise<LiveStream[]> {
  const collPath = 'live_streams';
  try {
    const q = query(collection(db, collPath), limit(100));
    const snap = await getDocs(q);
    const list = snap.docs
      .filter((d) => d.data()?.isLive !== false && d.data()?.status !== 'ended')
      .map((d) => normalizeFirestoreLiveStream(d.id, d.data()));
    return dedupeStreamsByHost(list);
  } catch (err) {
    console.warn('[Firestore] fetchFirestoreLiveStreams notice:', err);
    return [];
  }
}

export function subscribeFirestoreLiveStreams(onUpdate: (streams: LiveStream[]) => void) {
  const collPath = 'live_streams';
  const q = query(collection(db, collPath), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .filter((d) => d.data()?.isLive !== false && d.data()?.status !== 'ended')
        .map((d) => normalizeFirestoreLiveStream(d.id, d.data()));
      onUpdate(dedupeStreamsByHost(list));
    },
    (err) => {
      console.warn('[Firestore] subscribeFirestoreLiveStreams notice:', err);
    }
  );
}

export async function createFirestoreLiveStream(stream: LiveStream | Omit<LiveStream, 'id'>): Promise<string> {
  const collPath = 'live_streams';
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('Authentication required to start a live stream.');
  }

  try {
    const rawId = 'id' in stream && stream.id ? String(stream.id) : `live_${Date.now()}`;
    const safeId = VALID_DOC_ID_REGEX.test(rawId) ? rawId : `live_${Date.now()}`;
    const safeHost = sanitizeFirestoreUserCard(stream.host, uid);

    // Clean up any stale/previous live_streams docs owned by this host so strictly ONE Solo Live card exists per host
    try {
      const existingSnap = await getDocs(query(collection(db, collPath), limit(100)));
      const staleDeletes: Promise<void>[] = [];
      existingSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (docSnap.id !== safeId && data?.host?.id === uid) {
          staleDeletes.push(deleteDoc(doc(db, collPath, docSnap.id)).catch(() => {}));
        }
      });
      if (staleDeletes.length > 0) {
        await Promise.all(staleDeletes);
      }
    } catch {
      // Non-fatal cleanup
    }

    const payload: Record<string, any> = stripUndefinedDeep({
      id: safeId,
      title: String(stream.title || 'Live Broadcast').trim().slice(0, 120),
      category: String(stream.category || 'Live'),
      host: safeHost,
      coverImage: safeImageUrlForCard(stream.coverImage, 160000) || safeHost.coverImage || safeHost.avatar || '',
      viewerCount: String(stream.viewerCount ?? '0'),
      numericViewers: typeof stream.numericViewers === 'number' ? stream.numericViewers : 0,
      viewersCount: typeof stream.numericViewers === 'number' ? stream.numericViewers : 0,
      isLive: true,
      status: 'live',
      tags: Array.isArray(stream.tags) ? stream.tags.slice(0, 8) : [String(stream.category || 'Live'), 'Live'],
      guests: [],
      likesCount: typeof stream.likesCount === 'number' ? stream.likesCount : 0,
      commentsCount: typeof stream.commentsCount === 'number' ? stream.commentsCount : 0,
      startTime: typeof stream.startTime === 'number' ? stream.startTime : Date.now(),
      updatedAt: Date.now(),
      allowGuests: stream.allowGuests !== false,
      isPrivate: Boolean(stream.isPrivate),
    });

    await setDoc(doc(db, collPath, safeId), {
      ...payload,
      createdAt: serverTimestamp(),
    });
    return safeId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, collPath);
    throw err;
  }
}

export async function updateFirestoreLiveStream(streamId: string, updates: Partial<LiveStream>): Promise<void> {
  if (!auth.currentUser || !VALID_DOC_ID_REGEX.test(streamId)) return;
  const docRef = doc(db, 'live_streams', streamId);
  try {
    const cleanUpdates: Record<string, any> = stripUndefinedDeep({ ...updates });
    if (updates.host) {
      cleanUpdates.host = sanitizeFirestoreUserCard(updates.host);
    }
    delete cleanUpdates.id;
    if (Object.keys(cleanUpdates).length === 0) return;
    await updateDoc(docRef, cleanUpdates);
  } catch (err) {
    console.warn(`[Firestore] updateFirestoreLiveStream (${streamId}) notice:`, err);
  }
}

export async function endFirestoreLiveStream(streamId: string): Promise<void> {
  if (!auth.currentUser || !VALID_DOC_ID_REGEX.test(streamId)) return;
  const docRef = doc(db, 'live_streams', streamId);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    console.warn(`[Firestore] endFirestoreLiveStream (${streamId}) notice:`, err);
  }
}

export async function syncFirestoreFollow(
  followerId: string,
  followingId: string,
  follow: boolean
): Promise<void> {
  if (!auth.currentUser || !followerId || !followingId || followerId === followingId) return;
  const followId = `${followerId}_${followingId}`;
  const ref = doc(db, 'follows', followId);
  try {
    if (follow) {
      await setDoc(ref, {
        followerId,
        followingId,
        createdAt: new Date().toISOString(),
      });
    } else {
      await deleteDoc(ref);
    }
  } catch (err) {
    handleFirestoreError(err, follow ? OperationType.CREATE : OperationType.DELETE, `follows/${followId}`);
  }
}

/**
 * 4. REAL TRANSACTIONS & COIN BALANCE FIRESTORE SERVICE
 */
export async function recordUserTransaction(transaction: {
  type: 'recharge' | 'gift_sent' | 'gift_received' | 'reward';
  amount: number;
  coinsChange: number;
  description: string;
}): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const collPath = `users/${currentUser.uid}/transactions`;
  try {
    await addDoc(collection(db, collPath), {
      ...transaction,
      userId: currentUser.uid,
      timestamp: serverTimestamp(),
    });

    // Update user balance in their Firestore profile
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      coins: increment(transaction.coinsChange),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, collPath);
  }
}

/**
 * 5. REAL NOTIFICATIONS FIRESTORE SERVICE
 */
export async function sendFirestoreNotification(targetUserId: string, notification: {
  title: string;
  message: string;
  type: 'system' | 'like' | 'follow' | 'gift';
  actionUrl?: string;
}): Promise<void> {
  const collPath = `users/${targetUserId}/notifications`;
  try {
    await addDoc(collection(db, collPath), {
      ...notification,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, collPath);
  }
}

export function subscribeUserNotifications(
  userId: string,
  onUpdate: (notifications: NotificationItem[]) => void
) {
  const collPath = `users/${userId}/notifications`;
  const q = query(collection(db, collPath), orderBy('createdAt', 'desc'), limit(40));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        time: 'Just now',
      } as unknown as NotificationItem));
      onUpdate(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, collPath);
    }
  );
}

/**
 * 6. REAL MESSAGING & WHATSAPP-STYLE FIRESTORE SERVICE
 */
export function buildDirectChatId(uidA: string, uidB: string): string {
  const a = String(uidA || '').trim();
  const b = String(uidB || '').trim();
  if (!a || !b) return `conv_${b || a}`;
  const sorted = [a, b].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
}

export function subscribeUserDirectConversations(
  currentUserId: string,
  onUpdate: (conversations: Conversation[]) => void
) {
  if (!currentUserId) {
    onUpdate([]);
    return () => {};
  }
  const q = query(
    collection(db, 'chats'),
    where('participantIds', 'array-contains', currentUserId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: Conversation[] = snap.docs
        .map((d) => {
          const data = d.data() as any;
          const participantIds: string[] = Array.isArray(data.participantIds) ? data.participantIds : [];
          const otherUid = participantIds.find((uid) => uid !== currentUserId) || data.lastMessageSenderId || d.id;
          const participantsMap = data.participants && typeof data.participants === 'object' ? data.participants : {};
          const otherMeta = participantsMap[otherUid] || {};
          const updatedAtMillis = Number(data.updatedAtMillis || 0);
          const formattedTime = updatedAtMillis
            ? new Date(updatedAtMillis).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Recent';

          const otherUser: UserProfile = {
            id: otherUid,
            displayId: String(otherMeta.displayId || otherUid.slice(0, 8)),
            name: String(otherMeta.name || 'Lenzo User'),
            username: String(otherMeta.username || `@${String(otherMeta.displayId || otherUid.slice(0, 6)).toLowerCase()}`),
            avatar:
              String(otherMeta.avatar || '') ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(String(otherMeta.name || 'User'))}&background=8B20FF&color=fff`,
            bio: '',
            level: Number(otherMeta.level || 1),
            vipLevel: Number(otherMeta.vipLevel || 0),
            isVIP: Number(otherMeta.vipLevel || 0) > 0,
            coins: 0,
            diamonds: 0,
            followersCount: 0,
            followingCount: 0,
            fansCount: '0',
            likesCount: '0',
          };

          return {
            id: d.id,
            user: otherUser,
            lastMessage: String(data.lastMessage || 'Started conversation'),
            timestamp: formattedTime,
            unreadCount: data.lastMessageSenderId && data.lastMessageSenderId !== currentUserId ? 1 : 0,
            isOnline: true,
            type: 'direct' as const,
            _updatedAtMillis: updatedAtMillis,
          };
        })
        .sort((a: any, b: any) => (b._updatedAtMillis || 0) - (a._updatedAtMillis || 0))
        .map(({ _updatedAtMillis: _ignored, ...conv }: any) => conv as Conversation);

      onUpdate(list);
    },
    (err) => {
      console.warn('Direct conversations subscription notice:', err);
      onUpdate([]);
    }
  );
}

export function subscribeChatMessages(
  chatId: string,
  onUpdate: (messages: ChatMessage[]) => void
) {
  const collPath = `chats/${chatId}/messages`;
  const q = query(collection(db, collPath), orderBy('createdAtMillis', 'asc'), limit(150));
  return onSnapshot(
    q,
    (snap) => {
      const msgs = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          senderId: data.senderId,
          senderName: data.senderName || 'User',
          senderAvatar: data.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
          senderVip: data.senderVip || 0,
          isHost: data.isHost || false,
          isPinned: data.isPinned || false,
          text: data.text || '',
          timestamp: data.timestamp || (data.createdAt ? (data.createdAt as Timestamp).toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'),
          createdAtMillis: data.createdAtMillis || Date.now(),
          status: data.status || 'read',
          type: data.type || 'text',
          mediaUrl: data.mediaUrl,
          mediaName: data.mediaName,
          mediaSize: data.mediaSize,
          voiceDuration: data.voiceDuration,
          voiceWaveform: data.voiceWaveform,
          replyTo: data.replyTo,
          reactions: data.reactions || [],
          mentions: data.mentions || [],
          isEdited: data.isEdited || false,
          isStarred: data.isStarred || false,
          isForwarded: data.isForwarded || false,
          deletedForEveryone: data.deletedForEveryone || false,
          deletedForUsers: data.deletedForUsers || [],
          roomInvite: data.roomInvite,
          coinRequest: data.coinRequest,
          gift: data.gift,
        } as ChatMessage;
      });
      onUpdate(msgs);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, collPath);
    }
  );
}

export async function sendChatMessage(
  chatId: string,
  message: {
    text: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    senderDisplayId?: string;
    senderVip?: number;
    recipientId?: string;
    recipientName?: string;
    recipientAvatar?: string;
    recipientDisplayId?: string;
    type?: 'text' | 'voice' | 'image' | 'video' | 'file' | 'room_invite' | 'coin_request';
    mediaUrl?: string;
    mediaName?: string;
    mediaSize?: string;
    voiceDuration?: number;
    voiceWaveform?: number[];
    replyTo?: any;
    roomInvite?: any;
    coinRequest?: {
      coins: number;
      agencyId: string;
      agencyName: string;
      agencyCode: string;
      buyerDisplayId: string;
      note?: string;
    };
  }
): Promise<string> {
  const collPath = `chats/${chatId}/messages`;
  try {
    const cleanPayload: Record<string, any> = {
      ...message,
      status: 'sent',
      createdAt: serverTimestamp(),
      createdAtMillis: Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reactions: [],
      deletedForEveryone: false,
      deletedForUsers: [],
    };
    if (!cleanPayload.recipientId) {
      delete cleanPayload.recipientId;
    }
    delete cleanPayload.recipientName;
    delete cleanPayload.recipientAvatar;
    delete cleanPayload.recipientDisplayId;
    delete cleanPayload.senderDisplayId;
    if (!cleanPayload.coinRequest) {
      delete cleanPayload.coinRequest;
    }
    const docRef = await addDoc(collection(db, collPath), cleanPayload);

    // Update conversation metadata (including symmetric participantIds so BOTH sides see inbox live!)
    const chatRef = doc(db, 'chats', chatId);
    const chatMeta: Record<string, any> = {
      lastMessage:
        message.type === 'voice'
          ? '🎤 Voice message'
          : message.type === 'image'
            ? '📷 Payment Slip / Photo'
            : message.type === 'room_invite'
              ? '🎉 Room invitation'
              : message.type === 'coin_request' && message.coinRequest
                ? `🪙 Coin Request: ${message.coinRequest.coins.toLocaleString()} Coins`
                : message.text,
      lastMessageType: message.type || 'text',
      lastMessageStatus: 'sent',
      lastMessageSenderId: message.senderId,
      updatedAt: serverTimestamp(),
      updatedAtMillis: Date.now(),
    };

    if (message.recipientId) {
      chatMeta.participantIds = Array.from(new Set([message.senderId, message.recipientId]));
      chatMeta.participants = {
        [message.senderId]: {
          id: message.senderId,
          name: message.senderName || 'User',
          avatar: message.senderAvatar || '',
          displayId: message.senderDisplayId || message.senderId.slice(0, 8),
        },
        [message.recipientId]: {
          id: message.recipientId,
          name: message.recipientName || 'User',
          avatar: message.recipientAvatar || '',
          displayId: message.recipientDisplayId || message.recipientId.slice(0, 8),
        },
      };
    }

    await setDoc(chatRef, chatMeta, { merge: true });

    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, collPath);
    return '';
  }
}

export async function editChatMessage(
  chatId: string,
  messageId: string,
  newText: string
): Promise<void> {
  const docPath = `chats/${chatId}/messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
      text: newText,
      isEdited: true,
      editedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
  }
}

export async function deleteChatMessage(
  chatId: string,
  messageId: string,
  mode: 'for_everyone' | 'for_me',
  userId: string
): Promise<void> {
  const docPath = `chats/${chatId}/messages/${messageId}`;
  try {
    if (mode === 'for_everyone') {
      await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
        deletedForEveryone: true,
        text: '🚫 This message was deleted',
      });
    } else {
      const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
      const snap = await getDoc(msgRef);
      if (snap.exists()) {
        const deletedForUsers = snap.data().deletedForUsers || [];
        if (!deletedForUsers.includes(userId)) {
          deletedForUsers.push(userId);
          await updateDoc(msgRef, { deletedForUsers });
        }
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
  }
}

export async function reactToChatMessage(
  chatId: string,
  messageId: string,
  emoji: string,
  userId: string,
  userName: string
): Promise<void> {
  const docPath = `chats/${chatId}/messages/${messageId}`;
  try {
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;

    let reactions: any[] = snap.data().reactions || [];
    const existingIndex = reactions.findIndex((r) => r.userId === userId);

    if (existingIndex >= 0) {
      if (reactions[existingIndex].emoji === emoji) {
        reactions.splice(existingIndex, 1);
      } else {
        reactions[existingIndex].emoji = emoji;
      }
    } else {
      reactions.push({ emoji, userId, userName });
    }

    await updateDoc(msgRef, { reactions });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
  }
}

export async function pinChatMessage(
  chatId: string,
  messageId: string,
  isPinned: boolean
): Promise<void> {
  const docPath = `chats/${chatId}/messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), { isPinned });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
  }
}

export async function starChatMessage(
  chatId: string,
  messageId: string,
  isStarred: boolean
): Promise<void> {
  const docPath = `chats/${chatId}/messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), { isStarred });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
  }
}

/**
 * 7. REAL STORE PURCHASE & USER BALANCE SERVICE
 */
export async function purchaseStoreItem(
  userId: string,
  item: {
    id: string;
    name: string;
    category: string;
    price: number;
    currency: 'coins' | 'diamonds' | 'usd';
  },
  quantity: number = 1
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      return { success: false, newBalance: 0, error: 'User profile not found' };
    }

    const userData = snap.data();
    const totalCost = item.price * quantity;

    if (item.currency === 'coins') {
      const currentCoins = userData.coins || 0;
      if (currentCoins < totalCost) {
        return { success: false, newBalance: currentCoins, error: 'Insufficient coins balance' };
      }
      const newCoins = currentCoins - totalCost;
      await updateDoc(userRef, { coins: newCoins });
      
      // Add transaction history
      await addDoc(collection(db, `users/${userId}/transactions`), {
        type: 'store_purchase',
        title: `Purchased ${item.name} (${quantity}x)`,
        amount: -totalCost,
        currency: 'coins',
        timestamp: serverTimestamp(),
      });

      return { success: true, newBalance: newCoins };
    } else if (item.currency === 'diamonds') {
      const currentDiamonds = userData.diamonds || 0;
      if (currentDiamonds < totalCost) {
        return { success: false, newBalance: currentDiamonds, error: 'Insufficient diamonds balance' };
      }
      const newDiamonds = currentDiamonds - totalCost;
      await updateDoc(userRef, { diamonds: newDiamonds });
      
      return { success: true, newBalance: newDiamonds };
    } else {
      return { success: false, newBalance: userData.coins || 0, error: 'Use Wallet Recharge packages to add coins.' };
    }
  } catch (err: any) {
    return { success: false, newBalance: 0, error: err?.message || 'Transaction failed' };
  }
}

