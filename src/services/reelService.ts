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
  startAfter,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  increment,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, VideoComment, VideoItem } from '../types';
import { sanitizeFirestoreUserCard, stripUndefinedDeep } from './firestoreService';
import { deleteStorageFileByUrl, deleteStoragePath, MAX_REEL_VIDEO_BYTES } from './storageService';
import { resolveMediaUrl } from '../utils/apiConfig';

export const REELS_PAGE_SIZE = 12;

export function generateReelId(): string {
  return `reel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function toTimestampInfo(val: any): { iso: string; millis: number } {
  if (!val) {
    const now = Date.now();
    return { iso: new Date(now).toISOString(), millis: now };
  }
  if (val instanceof Timestamp) {
    return { iso: val.toDate().toISOString(), millis: val.toMillis() };
  }
  if (typeof val.toMillis === 'function') {
    const ms = val.toMillis();
    return { iso: new Date(ms).toISOString(), millis: ms };
  }
  if (typeof val.seconds === 'number') {
    const ms = val.seconds * 1000;
    return { iso: new Date(ms).toISOString(), millis: ms };
  }
  if (typeof val === 'number' && Number.isFinite(val)) {
    return { iso: new Date(val).toISOString(), millis: val };
  }
  const parsed = Date.parse(String(val));
  if (Number.isFinite(parsed)) {
    return { iso: new Date(parsed).toISOString(), millis: parsed };
  }
  const now = Date.now();
  return { iso: new Date(now).toISOString(), millis: now };
}

function mapReelDocToVideoItem(
  id: string,
  data: Record<string, any>,
  likedReelIds: Set<string>
): VideoItem {
  const creatorUid = String(data.creatorUID || data.creatorUid || data.userId || data.creator?.id || 'unknown');
  const creator = sanitizeFirestoreUserCard(data.creator || data.user, creatorUid);
  const ts = toTimestampInfo(data.createdAt ?? data.createdAtMillis);
  const visibility: 'public' | 'friends' | 'private' =
    data.visibility === 'private' || data.isPrivate
      ? 'private'
      : data.visibility === 'friends'
        ? 'friends'
        : 'public';

  return {
    id,
    creator,
    creatorUid,
    videoUrl: resolveMediaUrl(String(data.videoUrl || '')),
    videoStoragePath: typeof data.videoStoragePath === 'string' ? data.videoStoragePath : undefined,
    thumbnailUrl: resolveMediaUrl(String(data.thumbnailUrl || data.videoUrl || '')),
    thumbnailStoragePath: typeof data.thumbnailStoragePath === 'string' ? data.thumbnailStoragePath : undefined,
    description: String(data.caption ?? data.description ?? ''),
    musicTitle: String(data.musicTitle || `Original Sound - ${creator.name}`),
    hashtags: Array.isArray(data.hashtags) ? data.hashtags.map(String) : ['#lenzo', '#reels'],
    likesCount: typeof data.likesCount === 'number' ? Math.max(0, data.likesCount) : 0,
    commentsCount: typeof data.commentsCount === 'number' ? Math.max(0, data.commentsCount) : 0,
    sharesCount: typeof data.sharesCount === 'number' ? Math.max(0, data.sharesCount) : 0,
    repostsCount: typeof data.repostsCount === 'number' ? Math.max(0, data.repostsCount) : 0,
    viewsCount: typeof data.viewsCount === 'number' ? Math.max(0, data.viewsCount) : 0,
    isLiked: likedReelIds.has(id),
    isSaved: false,
    privacy: visibility,
    isPrivate: visibility === 'private',
    processingStatus: data.processingStatus || 'ready',
    createdAt: ts.iso,
    createdAtMillis: typeof data.createdAtMillis === 'number' ? data.createdAtMillis : ts.millis,
    sourceCollection: 'reels',
    contentType: 'video',
    storageBackend:
      data.storageBackend === 'firebase_storage' ||
      data.storageBackend === 'server_media' ||
      data.storageBackend === 'firestore_chunks'
        ? data.storageBackend
        : undefined,
    videoMimeType: typeof data.videoMimeType === 'string' ? data.videoMimeType : undefined,
    mediaChunkCount: typeof data.mediaChunkCount === 'number' ? data.mediaChunkCount : undefined,
  };
}

/**
 * Create a new Reel document in Firestore `reels/{reelID}`
 */
export async function createReelDocument(params: {
  reelId: string;
  creator: UserProfile;
  videoUrl: string;
  videoStoragePath: string;
  thumbnailUrl: string;
  thumbnailStoragePath?: string;
  caption: string;
  hashtags: string[];
  visibility: 'public' | 'friends' | 'private';
  musicTitle?: string;
  fileSizeBytes?: number;
  storageBackend?: 'firebase_storage' | 'server_media' | 'firestore_chunks';
  videoMimeType?: string;
  mediaChunkCount?: number;
}): Promise<VideoItem> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required to publish a reel.');
  }

  if (typeof params.fileSizeBytes === 'number' && params.fileSizeBytes > MAX_REEL_VIDEO_BYTES) {
    throw new Error('Video exceeds the 100 MB maximum limit.');
  }

  const safeCreator = sanitizeFirestoreUserCard(params.creator, user.uid);
  const nowMs = Date.now();
  const safeFileSize =
    typeof params.fileSizeBytes === 'number' &&
    Number.isFinite(params.fileSizeBytes) &&
    params.fileSizeBytes > 0 &&
    params.fileSizeBytes <= MAX_REEL_VIDEO_BYTES
      ? Math.round(params.fileSizeBytes)
      : undefined;

  const payload = stripUndefinedDeep({
    reelID: params.reelId,
    creatorUID: user.uid,
    creator: safeCreator,
    videoUrl: params.videoUrl,
    videoStoragePath: params.videoStoragePath,
    thumbnailUrl: params.thumbnailUrl || params.videoUrl,
    thumbnailStoragePath: params.thumbnailStoragePath || '',
    videoMimeType: params.videoMimeType ? params.videoMimeType.slice(0, 64) : undefined,
    mediaChunkCount:
      typeof params.mediaChunkCount === 'number' && params.mediaChunkCount >= 1 && params.mediaChunkCount <= 40
        ? Math.round(params.mediaChunkCount)
        : undefined,
    caption: params.caption.trim().slice(0, 500),
    description: params.caption.trim().slice(0, 500),
    musicTitle: (params.musicTitle || `Original Sound - ${safeCreator.name}`).slice(0, 120),
    hashtags: params.hashtags.slice(0, 12),
    visibility: params.visibility,
    isPrivate: params.visibility === 'private',
    fileSizeBytes: safeFileSize,
    storageBackend: params.storageBackend || 'server_media',
    likesCount: 0,
    commentsCount: 0,
    viewsCount: 0,
    sharesCount: 0,
    repostsCount: 0,
    processingStatus: 'ready',
    createdAtMillis: nowMs,
  });

  try {
    await setDoc(doc(db, 'reels', params.reelId), {
      ...payload,
      createdAt: serverTimestamp(),
    });

    return {
      id: params.reelId,
      creator: safeCreator,
      creatorUid: user.uid,
      videoUrl: params.videoUrl,
      videoStoragePath: params.videoStoragePath,
      thumbnailUrl: params.thumbnailUrl || params.videoUrl,
      thumbnailStoragePath: params.thumbnailStoragePath || '',
      description: payload.caption,
      musicTitle: payload.musicTitle,
      hashtags: payload.hashtags,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      repostsCount: 0,
      viewsCount: 0,
      isLiked: false,
      isSaved: false,
      privacy: params.visibility,
      isPrivate: params.visibility === 'private',
      processingStatus: 'ready',
      createdAt: new Date(nowMs).toISOString(),
      createdAtMillis: nowMs,
      sourceCollection: 'reels',
      contentType: 'video',
      storageBackend: payload.storageBackend,
      videoMimeType: payload.videoMimeType,
      mediaChunkCount: payload.mediaChunkCount,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `reels/${params.reelId}`);
    throw err;
  }
}

async function fetchViewerLikedReelIds(viewerUid?: string | null): Promise<Set<string>> {
  const liked = new Set<string>();
  if (!viewerUid) return liked;
  try {
    const q = query(collection(db, 'reel_likes'), where('userId', '==', viewerUid), limit(200));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      const rId = d.data()?.reelId;
      if (typeof rId === 'string' && rId) liked.add(rId);
    });
  } catch (err) {
    console.warn('[Reels] Could not hydrate reel likes:', err);
  }
  return liked;
}

export interface ReelsFeedSnapshot {
  reels: VideoItem[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Real-time subscription to Firestore `reels` collection ordered by `createdAt desc`
 */
export function subscribeReelsFeed(
  viewerUid: string | null | undefined,
  pageSize: number = REELS_PAGE_SIZE,
  onUpdate: (snapshot: ReelsFeedSnapshot) => void
): () => void {
  let active = true;
  let cachedLikes = new Set<string>();
  if (viewerUid) {
    fetchViewerLikedReelIds(viewerUid).then((set) => {
      if (active) cachedLikes = set;
    });
  }

  // Order by numeric `createdAtMillis` (always populated immediately on create, never null during latency compensation)
  const q = query(collection(db, 'reels'), orderBy('createdAtMillis', 'desc'), limit(pageSize));
  let activeUnsub: (() => void) | null = null;

  const handleSnap = async (snap: any) => {
    if (!active) return;
    if (viewerUid && cachedLikes.size === 0) {
      cachedLikes = await fetchViewerLikedReelIds(viewerUid);
    }
    const items = snap.docs
      .map((d: any) => mapReelDocToVideoItem(d.id, d.data(), cachedLikes))
      .filter((reel: VideoItem) => {
        if (!reel.videoUrl) return false;
        if (reel.privacy === 'private') {
          return Boolean(viewerUid && (reel.creatorUid === viewerUid || reel.creator.id === viewerUid));
        }
        return true;
      })
      .sort((a: VideoItem, b: VideoItem) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0));

    const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    onUpdate({
      reels: items,
      lastDoc,
      hasMore: snap.docs.length >= pageSize,
    });
  };

  activeUnsub = onSnapshot(
    q,
    (snap) => {
      void handleSnap(snap);
    },
    (err) => {
      console.warn('[Firestore] subscribeReelsFeed primary query notice, falling back to createdAt:', err);
      if (!active) return;
      const fallbackQ = query(collection(db, 'reels'), orderBy('createdAt', 'desc'), limit(pageSize));
      activeUnsub = onSnapshot(
        fallbackQ,
        (snap) => {
          void handleSnap(snap);
        },
        (fallbackErr) => {
          console.warn('[Firestore] subscribeReelsFeed fallback notice:', fallbackErr);
        }
      );
    }
  );

  return () => {
    active = false;
    activeUnsub?.();
  };
}

/**
 * Cursor-based pagination for loading older Reels from Firestore
 */
export async function fetchMoreReels(
  lastDoc: QueryDocumentSnapshot<DocumentData>,
  viewerUid?: string | null,
  pageSize: number = REELS_PAGE_SIZE
): Promise<ReelsFeedSnapshot> {
  try {
    const likedSet = await fetchViewerLikedReelIds(viewerUid);
    const q = query(
      collection(db, 'reels'),
      orderBy('createdAt', 'desc'),
      startAfter(lastDoc),
      limit(pageSize)
    );
    const snap = await getDocs(q);
    const items = snap.docs
      .map((d) => mapReelDocToVideoItem(d.id, d.data(), likedSet))
      .filter((reel) => {
        if (!reel.videoUrl) return false;
        if (reel.privacy === 'private') {
          return Boolean(viewerUid && (reel.creatorUid === viewerUid || reel.creator.id === viewerUid));
        }
        return true;
      });
    return {
      reels: items,
      lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
      hasMore: snap.docs.length >= pageSize,
    };
  } catch (err) {
    console.warn('[Firestore] fetchMoreReels notice:', err);
    return { reels: [], lastDoc: null, hasMore: false };
  }
}

/**
 * Atomic Like toggle using `reel_likes/{reelId}_{userId}` and counter update on `reels/{reelId}` (or `posts/{reelId}`)
 */
export async function toggleReelLike(
  reel: Pick<VideoItem, 'id' | 'sourceCollection'>,
  userId: string
): Promise<{ liked: boolean; likesCount?: number }> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('Authentication required to like reels.');
  }

  const targetCollection = reel.sourceCollection === 'posts' ? 'posts' : 'reels';
  const likeDocId = `${reel.id}_${userId}`;
  const likeRef = doc(db, 'reel_likes', likeDocId);
  const reelRef = doc(db, targetCollection, reel.id);

  try {
    return await runTransaction(db, async (tx) => {
      const [likeSnap, reelSnap] = await Promise.all([tx.get(likeRef), tx.get(reelRef)]);
      const currentLikes = reelSnap.exists() ? Number(reelSnap.data()?.likesCount || 0) : 0;

      if (likeSnap.exists()) {
        tx.delete(likeRef);
        const nextCount = Math.max(0, currentLikes - 1);
        if (reelSnap.exists()) {
          tx.update(reelRef, { likesCount: nextCount });
        }
        return { liked: false, likesCount: nextCount };
      } else {
        tx.set(likeRef, {
          reelId: reel.id,
          userId,
          createdAt: serverTimestamp(),
        });
        const nextCount = currentLikes + 1;
        if (reelSnap.exists()) {
          tx.update(reelRef, { likesCount: nextCount });
        }
        return { liked: true, likesCount: nextCount };
      }
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `reel_likes/${likeDocId}`);
    throw err;
  }
}

/**
 * Subscribe to persisted comments in `reel_comments` for a specific reel
 */
export function subscribeReelComments(
  reelId: string,
  onUpdate: (comments: VideoComment[]) => void
): () => void {
  const q = query(
    collection(db, 'reel_comments'),
    where('reelId', '==', reelId),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => {
      const mapped = snap.docs
        .map((d) => {
          const data = d.data();
          const ts = toTimestampInfo(data.createdAt ?? data.createdAtMillis);
          const commentUser = sanitizeFirestoreUserCard(
            {
              id: data.userId || 'unknown',
              name: data.userName || 'Lenzo User',
              avatar: data.userAvatar || '',
              level: typeof data.userLevel === 'number' ? data.userLevel : 0,
              vipLevel: typeof data.userVipLevel === 'number' ? data.userVipLevel : 0,
              isVIP: Boolean(data.userVipLevel && data.userVipLevel > 0),
            },
            data.userId || 'unknown'
          );
          return {
            id: d.id,
            user: commentUser,
            text: String(data.text || ''),
            timestamp: new Date(ts.millis).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            likes: typeof data.likesCount === 'number' ? data.likesCount : 0,
            _sortMs: ts.millis,
          };
        })
        .sort((a, b) => b._sortMs - a._sortMs)
        .map(({ _sortMs, ...comment }) => comment);

      onUpdate(mapped);
    },
    (err) => {
      console.warn('[Firestore] subscribeReelComments notice:', err);
    }
  );
}

/**
 * Persist a new comment in `reel_comments` and increment `commentsCount` on the parent reel
 */
export async function addReelComment(params: {
  reelId: string;
  user: UserProfile;
  text: string;
  sourceCollection?: 'reels' | 'posts';
}): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required to post a comment.');
  }
  const cleanText = params.text.trim().slice(0, 400);
  if (!cleanText) {
    throw new Error('Comment cannot be empty.');
  }

  try {
    const docRef = await addDoc(collection(db, 'reel_comments'), {
      reelId: params.reelId,
      userId: currentUser.uid,
      userName: (params.user.name || currentUser.displayName || 'Lenzo User').slice(0, 80),
      userAvatar: params.user.avatar || currentUser.photoURL || '',
      userLevel: typeof params.user.level === 'number' ? params.user.level : 0,
      userVipLevel: typeof params.user.vipLevel === 'number' ? params.user.vipLevel : 0,
      text: cleanText,
      likesCount: 0,
      createdAtMillis: Date.now(),
      createdAt: serverTimestamp(),
    });

    const targetCollection = params.sourceCollection === 'posts' ? 'posts' : 'reels';
    await updateDoc(doc(db, targetCollection, params.reelId), {
      commentsCount: increment(1),
    }).catch(() => {});

    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'reel_comments');
    throw err;
  }
}

/**
 * Record a deduplicated Reel view in `reel_views/{reelId}_{userId}` and increment `viewsCount` once per user
 */
export async function recordReelView(
  reelId: string,
  userId?: string | null,
  sourceCollection?: 'reels' | 'posts'
): Promise<void> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) return;
  const viewDocId = `${reelId}_${userId}`;
  const viewRef = doc(db, 'reel_views', viewDocId);
  try {
    const existing = await getDoc(viewRef);
    if (existing.exists()) return;

    await setDoc(viewRef, {
      reelId,
      userId,
      viewedAt: serverTimestamp(),
    });

    const targetCollection = sourceCollection === 'posts' ? 'posts' : 'reels';
    await updateDoc(doc(db, targetCollection, reelId), {
      viewsCount: increment(1),
    }).catch(() => {});
  } catch {
    // Non-blocking telemetry
  }
}

/**
 * Increment share counter for a reel
 */
export async function incrementReelShare(
  reelId: string,
  sourceCollection?: 'reels' | 'posts'
): Promise<void> {
  if (!auth.currentUser) return;
  const targetCollection = sourceCollection === 'posts' ? 'posts' : 'reels';
  try {
    await updateDoc(doc(db, targetCollection, reelId), {
      sharesCount: increment(1),
    });
  } catch {
    // Non-blocking
  }
}

/**
 * Delete own reel: removes Firebase Storage video & thumbnail AND Firestore document
 */
export async function deleteOwnReel(reel: VideoItem): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required to delete a reel.');
  }
  const ownerUid = reel.creatorUid || reel.creator?.id;
  if (ownerUid !== currentUser.uid) {
    throw new Error('Only the creator can delete this reel.');
  }

  // Delete Storage objects first (best-effort if already removed)
  if (reel.videoStoragePath) {
    await deleteStoragePath(reel.videoStoragePath);
  } else if (reel.videoUrl) {
    await deleteStorageFileByUrl(reel.videoUrl);
  }

  if (reel.thumbnailStoragePath) {
    await deleteStoragePath(reel.thumbnailStoragePath);
  } else if (reel.thumbnailUrl && reel.thumbnailUrl !== reel.videoUrl) {
    await deleteStorageFileByUrl(reel.thumbnailUrl);
  }

  const targetCollection = reel.sourceCollection === 'posts' ? 'posts' : 'reels';
  try {
    await deleteDoc(doc(db, targetCollection, reel.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${targetCollection}/${reel.id}`);
    throw err;
  }
}

/**
 * Submit a content/user report into Firestore `reports`
 */
export async function submitContentReport(params: {
  targetType: 'reel' | 'user' | 'room' | 'stream';
  targetId: string;
  targetOwnerUid?: string;
  reason: string;
  details?: string;
}): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required to submit a report.');
  }
  try {
    const docRef = await addDoc(collection(db, 'reports'), {
      reporterUid: currentUser.uid,
      targetType: params.targetType,
      targetId: params.targetId,
      targetOwnerUid: params.targetOwnerUid || '',
      reason: params.reason.trim().slice(0, 120),
      details: (params.details || '').trim().slice(0, 500),
      status: 'open',
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'reports');
    throw err;
  }
}
