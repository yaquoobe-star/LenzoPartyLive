import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTaskSnapshot,
} from 'firebase/storage';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { storage, auth, db, FIREBASE_RUNTIME_INFO } from '../firebase';
import { apiFetch, apiUrl, resolveMediaUrl } from '../utils/apiConfig';

export const MAX_REEL_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB strict maximum
export const MAX_FIRESTORE_FALLBACK_VIDEO_BYTES = 15 * 1024 * 1024; // 15 MB Firestore chunk fallback ceiling
const DEFAULT_CHUNK_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB chunks (proxy, Cloud Run & mobile safe)
const FIRESTORE_CHUNK_RAW_BYTES = 450 * 1024; // 450 KB raw binary (~600 KB base64 < 750 KB rule limit)
const FIRESTORE_CHUNK_PREFIX = 'firestore_chunks://';

export type UploadProgressPhase =
  | 'init'
  | 'uploading'
  | 'finalizing'
  | 'thumbnail'
  | 'saving'
  | 'complete';

export interface UploadProgressInfo {
  percent: number;
  bytesTransferred?: number;
  totalBytes?: number;
  bytesPerSecond?: number;
  etaSeconds?: number;
  phase?: UploadProgressPhase;
  chunkIndex?: number;
  totalChunks?: number;
  stage?: string;
}

export interface UploadProgressCallback {
  (progressPercent: number, snapshotOrInfo?: UploadTaskSnapshot | UploadProgressInfo): void;
}

// Cached probe result so we never sit in a 10-minute Firebase Storage retry loop when the bucket is unprovisioned (404)
let firebaseStorageProbeCache: { available: boolean; checkedAt: number } | null = null;
const STORAGE_PROBE_TTL_MS = 5 * 60 * 1000;

/**
 * Fast 2.5-second probe to check whether the configured Firebase Storage bucket exists.
 * Returns false immediately if Google Cloud Storage returns 404 (bucket not enabled in Firebase Console),
 * preventing Firebase SDK's default 10-minute silent retry stall at 5%.
 */
async function isFirebaseStorageBucketReady(): Promise<boolean> {
  const bucket = (FIREBASE_RUNTIME_INFO.storageBucket || '').trim();
  if (!bucket) return false;

  const now = Date.now();
  if (firebaseStorageProbeCache && now - firebaseStorageProbeCache.checkedAt < STORAGE_PROBE_TTL_MS) {
    return firebaseStorageProbeCache.available;
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 2500);
    const resp = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?maxResults=1`,
      { method: 'GET', signal: controller.signal }
    );
    // 404 means the bucket itself does not exist / Firebase Storage is not enabled.
    // 200, 401, or 403 means the bucket exists and is reachable.
    const available = resp.status !== 404;
    firebaseStorageProbeCache = { available, checkedAt: now };
    if (!available) {
      console.info(
        `[Storage] Firebase Storage bucket "${bucket}" is not provisioned (404); routing media uploads to Lenzo persistent server storage.`
      );
    }
    return available;
  } catch {
    // Network error or timeout probing Google Storage — fall back to backend storage right away
    firebaseStorageProbeCache = { available: false, checkedAt: now };
    return false;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function compressImageToDataUrl(file: File | Blob, maxDimension: number, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read selected image.'));
    reader.onload = () => {
      const src = String(reader.result || '');
      if (typeof Image === 'undefined' || typeof document === 'undefined') {
        resolve(src);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width || 1, img.height || 1));
        const width = Math.max(1, Math.round((img.width || maxDimension) * scale));
        const height = Math.max(1, Math.round((img.height || maxDimension) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a profile or cover image to Firebase Storage (when enabled) or backend media storage
 */
export async function uploadUserImage(
  file: File | Blob,
  folder: 'avatars' | 'covers' | 'payment_slips',
  onProgress?: UploadProgressCallback
): Promise<string> {
  const user = auth.currentUser;
  const maxDim = folder === 'covers' ? 1200 : folder === 'payment_slips' ? 720 : 512;

  if (user && (await isFirebaseStorageBucketReady())) {
    try {
      const fileType = file.type || 'image/jpeg';
      const ext = fileType.includes('png') ? 'png' : fileType.includes('webp') ? 'webp' : 'jpg';
      const fileName = `${folder}_${user.uid}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, `users/${user.uid}/${folder}/${fileName}`);

      const storageUrl = await new Promise<string>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file, {
          contentType: fileType,
          customMetadata: {
            userId: user.uid,
            uploadedAt: new Date().toISOString(),
          },
        });
        const timeoutId = setTimeout(() => {
          uploadTask.cancel();
          reject(new Error('Firebase Storage upload timed out'));
        }, 12000);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress =
              snapshot.totalBytes > 0
                ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                : 25;
            onProgress?.(Math.round(progress), snapshot);
          },
          (error) => {
            clearTimeout(timeoutId);
            reject(error);
          },
          async () => {
            clearTimeout(timeoutId);
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadUrl);
            } catch (urlErr) {
              reject(urlErr);
            }
          }
        );
      });

      if (storageUrl) return storageUrl;
    } catch (storageErr) {
      console.warn('[Firebase Storage] Falling back to backend media upload:', storageErr);
    }
  }

  // Fallback: compress cleanly and upload via backend /api/media/upload so URL stays short for Firestore
  onProgress?.(45, {} as UploadTaskSnapshot);
  const dataUrl = await compressImageToDataUrl(file, maxDim, 0.78);

  try {
    const res = await apiFetch('/api/media/upload', {
      method: 'POST',
      body: JSON.stringify({ dataUrl, folder }),
    });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (data.url) {
        onProgress?.(100, {} as UploadTaskSnapshot);
        return resolveMediaUrl(data.url);
      }
    }
  } catch (apiErr) {
    console.warn('[Media Upload] Backend fallback notice:', apiErr);
  }

  onProgress?.(100, {} as UploadTaskSnapshot);
  return dataUrl;
}

/**
 * Upload a Party Room custom background photo from user's gallery so Host, Viewers & Guests
 * on both Web and Android see the exact same background reliably.
 */
export async function uploadPartyBackgroundImage(
  file: File | Blob,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const user = auth.currentUser;
  onProgress?.(15, {} as UploadTaskSnapshot);

  const compressedDataUrl = await compressImageToDataUrl(file, 960, 0.78);
  onProgress?.(35, {} as UploadTaskSnapshot);

  if (user && (await isFirebaseStorageBucketReady())) {
    try {
      const uploadBlob = await fetch(compressedDataUrl)
        .then((r) => r.blob())
        .catch(() => file);
      const fileType = uploadBlob.type || 'image/jpeg';
      const ext = fileType.includes('png') ? 'png' : fileType.includes('webp') ? 'webp' : 'jpg';
      const fileName = `party_bg_${user.uid}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, `users/${user.uid}/party_backgrounds/${fileName}`);

      const storageUrl = await new Promise<string>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, uploadBlob, {
          contentType: fileType,
          customMetadata: {
            userId: user.uid,
            purpose: 'party_background',
            uploadedAt: new Date().toISOString(),
          },
        });
        const timeoutId = setTimeout(() => {
          uploadTask.cancel();
          reject(new Error('Firebase Storage upload timed out'));
        }, 12000);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const pct =
              snapshot.totalBytes > 0
                ? 35 + (snapshot.bytesTransferred / snapshot.totalBytes) * 60
                : 55;
            onProgress?.(Math.min(95, Math.round(pct)), snapshot);
          },
          (error) => {
            clearTimeout(timeoutId);
            reject(error);
          },
          async () => {
            clearTimeout(timeoutId);
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadUrl);
            } catch (urlErr) {
              reject(urlErr);
            }
          }
        );
      });

      if (storageUrl) {
        onProgress?.(100, {} as UploadTaskSnapshot);
        return storageUrl;
      }
    } catch (storageErr) {
      console.warn('[Party Background] Firebase Storage fallback to backend media upload:', storageErr);
    }
  }

  // Fallback 1: Upload to backend /api/media/upload for a short URL
  try {
    onProgress?.(70, {} as UploadTaskSnapshot);
    const res = await apiFetch('/api/media/upload', {
      method: 'POST',
      body: JSON.stringify({ dataUrl: compressedDataUrl, folder: 'covers' }),
    });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (data.url) {
        onProgress?.(100, {} as UploadTaskSnapshot);
        return resolveMediaUrl(data.url);
      }
    }
  } catch (apiErr) {
    console.warn('[Party Background] Backend media upload fallback notice:', apiErr);
  }

  // Fallback 2: Ensure compact Firestore-safe JPEG data URL (< 160 KB)
  let compactUrl = compressedDataUrl;
  if (compactUrl.length > 155000) {
    compactUrl = await compressImageToDataUrl(file, 720, 0.64);
  }
  if (compactUrl.length > 155000) {
    compactUrl = await compressImageToDataUrl(file, 540, 0.56);
  }
  onProgress?.(100, {} as UploadTaskSnapshot);
  return compactUrl;
}

const ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
  'video/ogg',
  'video/3gpp',
  'video/x-matroska',
];

function inferVideoTypeAndExt(videoFile: File | Blob): { mimeType: string; ext: string; fileName: string } {
  const fileName = videoFile instanceof File ? videoFile.name : 'reel.mp4';
  const nameLower = fileName.toLowerCase();
  const rawMime = (videoFile.type || '').split(';')[0].trim().toLowerCase();

  if (rawMime && ALLOWED_VIDEO_MIMES.includes(rawMime)) {
    const ext =
      rawMime.includes('webm')
        ? 'webm'
        : rawMime.includes('quicktime')
          ? 'mov'
          : rawMime.includes('ogg')
            ? 'ogv'
            : rawMime.includes('3gpp')
              ? '3gp'
              : rawMime.includes('matroska')
                ? 'mkv'
                : 'mp4';
    return { mimeType: rawMime, ext, fileName };
  }

  if (nameLower.endsWith('.webm')) return { mimeType: 'video/webm', ext: 'webm', fileName };
  if (nameLower.endsWith('.mov')) return { mimeType: 'video/quicktime', ext: 'mov', fileName };
  if (nameLower.endsWith('.ogv') || nameLower.endsWith('.ogg')) return { mimeType: 'video/ogg', ext: 'ogv', fileName };
  if (nameLower.endsWith('.3gp')) return { mimeType: 'video/3gpp', ext: '3gp', fileName };
  if (nameLower.endsWith('.mkv')) return { mimeType: 'video/x-matroska', ext: 'mkv', fileName };
  if (nameLower.endsWith('.mp4') || nameLower.endsWith('.m4v') || !rawMime || rawMime.startsWith('video/')) {
    return { mimeType: 'video/mp4', ext: 'mp4', fileName };
  }

  throw new Error('Unsupported video format. Please select an MP4, WebM, MOV, or 3GP video.');
}

/**
 * Extract a JPEG thumbnail Blob from a local video File/Blob using an offscreen video + canvas
 */
export async function captureVideoThumbnailBlob(videoFile: File | Blob): Promise<Blob | null> {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return null;
  const objectUrl = URL.createObjectURL(videoFile);
  try {
    const blob = await new Promise<Blob | null>((resolve) => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.crossOrigin = 'anonymous';

      const cleanup = () => {
        video.onloadeddata = null;
        video.onseeked = null;
        video.onerror = null;
      };

      const timeout = setTimeout(() => {
        cleanup();
        resolve(null);
      }, 5000);

      const drawFrame = () => {
        try {
          const vw = video.videoWidth || 720;
          const vh = video.videoHeight || 1280;
          const scale = Math.min(1, 720 / Math.max(vw, vh));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(vw * scale));
          canvas.height = Math.max(1, Math.round(vh * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            clearTimeout(timeout);
            cleanup();
            resolve(null);
            return;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (jpgBlob) => {
              clearTimeout(timeout);
              cleanup();
              resolve(jpgBlob);
            },
            'image/jpeg',
            0.8
          );
        } catch {
          clearTimeout(timeout);
          cleanup();
          resolve(null);
        }
      };

      video.onloadeddata = () => {
        try {
          video.currentTime = Math.min(0.4, Math.max(0, (video.duration || 1) * 0.1));
        } catch {
          drawFrame();
        }
      };
      video.onseeked = drawFrame;
      video.onerror = () => {
        clearTimeout(timeout);
        cleanup();
        resolve(null);
      };
      video.src = objectUrl;
    });
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export interface ReelUploadResult {
  videoUrl: string;
  videoStoragePath: string;
  thumbnailUrl: string;
  thumbnailStoragePath: string;
  fileSizeBytes: number;
  storageBackend: 'firebase_storage' | 'server_media' | 'firestore_chunks';
  videoMimeType?: string;
  mediaChunkCount?: number;
}

export function isFirestoreChunkedVideoUrl(url?: string | null): boolean {
  return Boolean(url && typeof url === 'string' && url.startsWith(FIRESTORE_CHUNK_PREFIX));
}

export function extractFirestoreChunkedReelId(url?: string | null): string | null {
  if (!isFirestoreChunkedVideoUrl(url)) return null;
  const raw = String(url).slice(FIRESTORE_CHUNK_PREFIX.length).split(/[/?#]/)[0]?.trim() || '';
  return /^[a-zA-Z0-9_-]{3,128}$/.test(raw) ? raw : null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const blockSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += blockSize) {
    const slice = bytes.subarray(i, Math.min(bytes.length, i + blockSize));
    parts.push(String.fromCharCode(...slice));
  }
  return btoa(parts.join(''));
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// LRU objectURL cache for resolved Firestore chunked reels (prevents redundant downloads & mobile RAM bloat)
const MAX_CACHED_CHUNK_BLOBS = 12;
const resolvedChunkReelCache = new Map<string, string>();
const inflightChunkReelLoads = new Map<string, Promise<string>>();

export async function resolveFirestoreChunkedReelUrl(
  videoUrl: string,
  fallbackMimeType = 'video/mp4'
): Promise<string> {
  if (!isFirestoreChunkedVideoUrl(videoUrl)) return videoUrl;
  const reelId = extractFirestoreChunkedReelId(videoUrl);
  if (!reelId) {
    throw new Error('Invalid reel media reference.');
  }

  const cached = resolvedChunkReelCache.get(reelId);
  if (cached) {
    // Refresh LRU order
    resolvedChunkReelCache.delete(reelId);
    resolvedChunkReelCache.set(reelId, cached);
    return cached;
  }

  const pending = inflightChunkReelLoads.get(reelId);
  if (pending) return pending;

  const loader = (async () => {
    const snap = await getDocs(collection(db, 'reels', reelId, 'media_chunks'));
    if (snap.empty) {
      throw new Error('Video media chunks are no longer available.');
    }
    const ordered = snap.docs
      .map((d) => {
        const data = d.data() as Record<string, any>;
        return {
          index: typeof data.chunkIndex === 'number' ? data.chunkIndex : Number.MAX_SAFE_INTEGER,
          data: typeof data.data === 'string' ? data.data : '',
          mimeType: typeof data.mimeType === 'string' ? data.mimeType : '',
        };
      })
      .filter((c) => c.data.length > 0)
      .sort((a, b) => a.index - b.index);

    if (ordered.length === 0) {
      throw new Error('Video media payload is empty.');
    }

    const mimeType = ordered[0].mimeType || fallbackMimeType || 'video/mp4';
    const parts: BlobPart[] = ordered.map((c) => base64ToUint8Array(c.data) as unknown as BlobPart);
    const blob = new Blob(parts, { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);

    resolvedChunkReelCache.set(reelId, objectUrl);
    if (resolvedChunkReelCache.size > MAX_CACHED_CHUNK_BLOBS) {
      const oldestKey = resolvedChunkReelCache.keys().next().value;
      if (oldestKey) {
        const oldestUrl = resolvedChunkReelCache.get(oldestKey);
        resolvedChunkReelCache.delete(oldestKey);
        if (oldestUrl) {
          try {
            URL.revokeObjectURL(oldestUrl);
          } catch {
            // ignore
          }
        }
      }
    }
    return objectUrl;
  })().finally(() => {
    inflightChunkReelLoads.delete(reelId);
  });

  inflightChunkReelLoads.set(reelId, loader);
  return loader;
}

export async function deleteFirestoreReelChunks(reelId: string): Promise<boolean> {
  if (!auth.currentUser || !/^[a-zA-Z0-9_-]{3,128}$/.test(reelId)) return false;
  try {
    const snap = await getDocs(collection(db, 'reels', reelId, 'media_chunks'));
    if (snap.empty) return true;
    for (let i = 0; i < snap.docs.length; i += 250) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 250).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    const cached = resolvedChunkReelCache.get(reelId);
    if (cached) {
      resolvedChunkReelCache.delete(reelId);
      try {
        URL.revokeObjectURL(cached);
      } catch {
        // ignore
      }
    }
    return true;
  } catch (err) {
    console.warn('[Firestore Chunks] Could not delete reel media chunks:', reelId, err);
    return false;
  }
}

/**
 * Tier 3 Resilient Cloud Fallback: Stores videos <= 15 MB in Firestore `reels/{reelId}/media_chunks/*`
 * so Reels upload & play reliably across Web, AI Studio Preview, and Android APK even when
 * Firebase Storage is unprovisioned (404) and api.lenzoparty.com is offline (502).
 */
async function uploadReelViaFirestoreChunks(params: {
  reelId: string;
  videoFile: File | Blob;
  mimeType: string;
  signal?: AbortSignal;
  onProgress?: UploadProgressCallback;
}): Promise<ReelUploadResult> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required to upload reels.');
  }
  if (params.signal?.aborted) {
    throw createAbortError();
  }

  const totalBytes = params.videoFile.size;
  if (totalBytes > MAX_FIRESTORE_FALLBACK_VIDEO_BYTES) {
    const sizeMb = (totalBytes / (1024 * 1024)).toFixed(1);
    throw new Error(
      `Video is ${sizeMb} MB. While Firebase Storage / media server is offline, cloud fallback supports videos up to 15 MB. Please pick a shorter/smaller video or enable Firebase Storage for up to 100 MB.`
    );
  }

  const totalChunks = Math.max(1, Math.ceil(totalBytes / FIRESTORE_CHUNK_RAW_BYTES));
  const uploadStartMs = Date.now();
  let highWaterPct = 2;
  let completedBytes = 0;

  const emitProgress = (info: UploadProgressInfo) => {
    const clampedPct = Math.max(highWaterPct, Math.min(96, Math.round(info.percent)));
    highWaterPct = clampedPct;
    params.onProgress?.(clampedPct, {
      ...info,
      percent: clampedPct,
      totalBytes,
    });
  };

  emitProgress({
    percent: 3,
    bytesTransferred: 0,
    totalBytes,
    phase: 'uploading',
    chunkIndex: 1,
    totalChunks,
    stage: `Uploading video to cloud (0.0 / ${formatMb(totalBytes)} MB)`,
  });

  // Upload chunks in small parallel batches (3 concurrent) for fast mobile + web throughput
  const CONCURRENCY = 3;
  try {
    for (let batchStart = 0; batchStart < totalChunks; batchStart += CONCURRENCY) {
      if (params.signal?.aborted) {
        throw createAbortError();
      }
      const indices: number[] = [];
      for (let i = batchStart; i < Math.min(totalChunks, batchStart + CONCURRENCY); i++) {
        indices.push(i);
      }

      await Promise.all(
        indices.map(async (chunkIndex) => {
          if (params.signal?.aborted) {
            throw createAbortError();
          }
          const start = chunkIndex * FIRESTORE_CHUNK_RAW_BYTES;
          const end = Math.min(totalBytes, start + FIRESTORE_CHUNK_RAW_BYTES);
          const chunkBlob = params.videoFile.slice(start, end);
          const arrayBuf = await chunkBlob.arrayBuffer();
          const b64 = arrayBufferToBase64(arrayBuf);
          const chunkDocId = `chunk_${String(chunkIndex).padStart(4, '0')}`;

          await setDoc(doc(db, 'reels', params.reelId, 'media_chunks', chunkDocId), {
            reelId: params.reelId,
            creatorUID: user.uid,
            chunkIndex,
            totalChunks,
            mimeType: params.mimeType,
            data: b64,
          });

          completedBytes = Math.min(totalBytes, completedBytes + (end - start));
          const elapsedSec = Math.max(0.25, (Date.now() - uploadStartMs) / 1000);
          const bytesPerSecond = completedBytes / elapsedSec;
          const remainingBytes = Math.max(0, totalBytes - completedBytes);
          const etaSeconds = bytesPerSecond > 1024 ? Math.ceil(remainingBytes / bytesPerSecond) : undefined;
          const pct = Math.min(91, Math.max(3, Math.round(3 + (completedBytes / totalBytes) * 88)));

          emitProgress({
            percent: pct,
            bytesTransferred: completedBytes,
            totalBytes,
            bytesPerSecond,
            etaSeconds,
            phase: 'uploading',
            chunkIndex: Math.min(totalChunks, chunkIndex + 1),
            totalChunks,
            stage: `Uploading video (${formatMb(completedBytes)} / ${formatMb(totalBytes)} MB)`,
          });
        })
      );
    }
  } catch (err: any) {
    // Clean up partial chunks if cancelled or failed
    void deleteFirestoreReelChunks(params.reelId);
    throw err;
  }

  if (params.signal?.aborted) {
    void deleteFirestoreReelChunks(params.reelId);
    throw createAbortError();
  }

  // Generate compact JPEG cover data URL (< 90 KB) so feed & profile grid show preview instantly
  let thumbnailUrl = '';
  try {
    emitProgress({
      percent: 93,
      bytesTransferred: totalBytes,
      totalBytes,
      phase: 'thumbnail',
      stage: 'Creating preview cover...',
    });
    const thumbBlob = await captureVideoThumbnailBlob(params.videoFile);
    if (thumbBlob && thumbBlob.size > 0 && !params.signal?.aborted) {
      let compactThumb = await compressImageToDataUrl(thumbBlob, 480, 0.72);
      if (compactThumb.length > 140000) {
        compactThumb = await compressImageToDataUrl(thumbBlob, 360, 0.6);
      }
      if (compactThumb.length <= 155000) {
        thumbnailUrl = compactThumb;
      }
    }
  } catch {
    // Non-fatal: video still plays without poster
  }

  const videoUrl = `${FIRESTORE_CHUNK_PREFIX}${params.reelId}`;
  // Pre-seed local blob URL cache so the creator's newly published reel plays with zero delay!
  try {
    const localBlobUrl = URL.createObjectURL(params.videoFile);
    resolvedChunkReelCache.set(params.reelId, localBlobUrl);
  } catch {
    // ignore
  }

  emitProgress({
    percent: 96,
    bytesTransferred: totalBytes,
    totalBytes,
    phase: 'saving',
    stage: 'Publishing reel...',
  });

  return {
    videoUrl,
    videoStoragePath: `firestore_chunks:${params.reelId}`,
    thumbnailUrl: thumbnailUrl || videoUrl,
    thumbnailStoragePath: '',
    fileSizeBytes: totalBytes,
    storageBackend: 'firestore_chunks',
    videoMimeType: params.mimeType,
    mediaChunkCount: totalChunks,
  };
}

function createAbortError(): Error {
  const err = new Error('Upload cancelled.');
  err.name = 'AbortError';
  return err;
}

function formatMb(bytes: number): string {
  return (Math.max(0, bytes) / (1024 * 1024)).toFixed(1);
}

/**
 * Send one raw binary chunk via XMLHttpRequest so both Web and Android WebView get
 * smooth real-time byte-by-byte upload progress (with AbortSignal cancellation).
 */
function uploadChunkWithXhr(params: {
  url: string;
  chunk: Blob;
  idToken: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  onChunkProgress?: (loadedBytes: number) => void;
}): Promise<any> {
  return new Promise((resolve, reject) => {
    if (params.signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', params.url, true);
    xhr.timeout = params.timeoutMs ?? 45000;
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.setRequestHeader('Authorization', `Bearer ${params.idToken}`);

    const onAbort = () => {
      try {
        xhr.abort();
      } catch {
        // ignore
      }
      reject(createAbortError());
    };
    params.signal?.addEventListener('abort', onAbort, { once: true });

    const cleanup = () => {
      params.signal?.removeEventListener('abort', onAbort);
    };

    xhr.upload.onloadstart = () => {
      params.onChunkProgress?.(0);
    };

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        params.onChunkProgress?.(Math.min(params.chunk.size, ev.loaded));
      } else if (ev.loaded > 0) {
        params.onChunkProgress?.(Math.min(params.chunk.size, ev.loaded));
      }
    };

    xhr.upload.onload = () => {
      params.onChunkProgress?.(params.chunk.size);
    };

    xhr.onload = () => {
      cleanup();
      let parsed: any = null;
      try {
        parsed = JSON.parse(xhr.responseText || '{}');
      } catch {
        parsed = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parsed || { success: true });
      } else {
        const msg =
          parsed?.error ||
          (xhr.status === 413
            ? 'Video exceeds the 100 MB maximum limit.'
            : xhr.status === 502 || xhr.status === 503
              ? 'Media storage server is temporarily unavailable (502/503). Please try again shortly.'
              : `Upload chunk failed (HTTP ${xhr.status}).`);
        const err: any = new Error(msg);
        err.status = xhr.status;
        reject(err);
      }
    };

    xhr.onerror = () => {
      cleanup();
      if (params.signal?.aborted) {
        reject(createAbortError());
        return;
      }
      const err: any = new Error('Network connection interrupted while uploading video chunk.');
      err.isNetworkError = true;
      reject(err);
    };

    xhr.ontimeout = () => {
      cleanup();
      const err: any = new Error('Video chunk upload timed out. Please check your internet speed and retry.');
      err.isTimeout = true;
      reject(err);
    };

    xhr.onabort = () => {
      cleanup();
      reject(createAbortError());
    };

    xhr.send(params.chunk);
  });
}

/**
 * Send a raw thumbnail blob with real XHR progress tracking.
 */
function uploadThumbnailWithXhr(params: {
  url: string;
  blob: Blob;
  idToken: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  onProgress?: (ratio: number) => void;
}): Promise<any> {
  return new Promise((resolve, reject) => {
    if (params.signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', params.url, true);
    xhr.timeout = params.timeoutMs ?? 15000;
    xhr.setRequestHeader('Content-Type', 'image/jpeg');
    xhr.setRequestHeader('Authorization', `Bearer ${params.idToken}`);

    const onAbort = () => {
      try {
        xhr.abort();
      } catch {
        // ignore
      }
      reject(createAbortError());
    };
    params.signal?.addEventListener('abort', onAbort, { once: true });

    const cleanup = () => {
      params.signal?.removeEventListener('abort', onAbort);
    };

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) {
        params.onProgress?.(Math.min(1, ev.loaded / ev.total));
      }
    };

    xhr.onload = () => {
      cleanup();
      let parsed: any = {};
      try {
        parsed = JSON.parse(xhr.responseText || '{}');
      } catch {
        parsed = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        params.onProgress?.(1);
        resolve(parsed);
      } else {
        reject(new Error(parsed?.error || `Thumbnail upload failed (HTTP ${xhr.status}).`));
      }
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error('Thumbnail upload failed due to network error.'));
    };

    xhr.ontimeout = () => {
      cleanup();
      reject(new Error('Thumbnail upload timed out.'));
    };

    xhr.onabort = () => {
      cleanup();
      reject(createAbortError());
    };

    xhr.send(params.blob);
  });
}

/**
 * Upload an image or small media dataUrl to `/api/media/upload` with real XHR progress events.
 */
export async function uploadMediaDataUrlWithProgress(params: {
  dataUrl: string;
  filename?: string;
  folder: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}): Promise<{ url?: string; error?: string; ok: boolean; status: number }> {
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  const payload = JSON.stringify({
    dataUrl: params.dataUrl,
    filename: params.filename,
    folder: params.folder,
  });

  return new Promise((resolve, reject) => {
    if (params.signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl('/api/media/upload'), true);
    xhr.timeout = 45000;
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    const onAbort = () => {
      try {
        xhr.abort();
      } catch {
        // ignore
      }
      reject(createAbortError());
    };
    params.signal?.addEventListener('abort', onAbort, { once: true });

    const cleanup = () => {
      params.signal?.removeEventListener('abort', onAbort);
    };

    xhr.upload.onloadstart = () => {
      params.onProgress?.(5);
    };

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) {
        const pct = Math.min(95, Math.max(5, Math.round((ev.loaded / ev.total) * 95)));
        params.onProgress?.(pct);
      }
    };

    xhr.onload = () => {
      cleanup();
      let json: any = {};
      try {
        json = JSON.parse(xhr.responseText || '{}');
      } catch {
        json = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        params.onProgress?.(100);
        resolve({
          ok: true,
          status: xhr.status,
          url: json.url ? resolveMediaUrl(json.url) : undefined,
        });
      } else {
        resolve({
          ok: false,
          status: xhr.status,
          error: json.error || `Upload failed (HTTP ${xhr.status}).`,
        });
      }
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error('Network error while uploading media.'));
    };

    xhr.ontimeout = () => {
      cleanup();
      reject(new Error('Media upload timed out.'));
    };

    xhr.onabort = () => {
      cleanup();
      reject(createAbortError());
    };

    xhr.send(payload);
  });
}

/**
 * Upload a Reel video (<= 100 MB) + JPEG thumbnail via chunked binary streaming to the Lenzo server.
 * Splits into 4 MB chunks so large videos up to 100 MB upload reliably across Cloud Run, Railway,
 * Cloudflare, and mobile 4G networks with live progress & automatic chunk retry.
 */
async function uploadReelViaChunkedBackend(params: {
  reelId: string;
  videoFile: File | Blob;
  mimeType: string;
  fileName: string;
  signal?: AbortSignal;
  onProgress?: UploadProgressCallback;
}): Promise<ReelUploadResult> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required to upload reels.');
  }
  if (params.signal?.aborted) {
    throw createAbortError();
  }

  const totalBytes = params.videoFile.size;
  const idToken = await user.getIdToken();
  let highWaterPct = 0;

  const emitProgress = (info: UploadProgressInfo) => {
    const clampedPct = Math.max(highWaterPct, Math.min(96, Math.round(info.percent)));
    highWaterPct = clampedPct;
    params.onProgress?.(clampedPct, {
      ...info,
      percent: clampedPct,
      totalBytes: info.totalBytes ?? totalBytes,
    });
  };

  // 1. Initialize upload session on backend (validates auth, MIME & <= 100 MB)
  emitProgress({
    percent: 1,
    bytesTransferred: 0,
    totalBytes,
    phase: 'init',
    stage: 'Preparing upload session...',
  });

  const initRes = await apiFetch('/api/reels/upload/init', {
    method: 'POST',
    timeoutMs: 15000,
    signal: params.signal,
    body: JSON.stringify({
      reelId: params.reelId,
      fileSize: totalBytes,
      contentType: params.mimeType,
      fileName: params.fileName,
    }),
  });

  const initData = await initRes.json().catch(() => ({}));
  if (!initRes.ok || !initData?.uploadId) {
    throw new Error(
      initData?.error ||
        (initRes.status === 413
          ? 'Video exceeds the 100 MB maximum limit.'
          : initRes.status === 502 || initRes.status === 503
            ? 'Media server is temporarily offline (502). Please check backend deployment or enable Firebase Storage.'
            : `Could not start video upload (HTTP ${initRes.status}).`)
    );
  }

  const uploadId: string = initData.uploadId;
  const chunkSize: number =
    typeof initData.chunkSize === 'number' && initData.chunkSize >= 512 * 1024
      ? initData.chunkSize
      : DEFAULT_CHUNK_SIZE_BYTES;

  // 2. Stream file in 4 MB chunks with live progress (2% -> 90%) and automatic retry per chunk
  const totalChunks = Math.ceil(totalBytes / chunkSize);
  let uploadedSoFar = 0;
  const uploadStartMs = Date.now();

  emitProgress({
    percent: 2,
    bytesTransferred: 0,
    totalBytes,
    phase: 'uploading',
    chunkIndex: 1,
    totalChunks,
    stage: `Uploading video (0.0 / ${formatMb(totalBytes)} MB)`,
  });

  for (let index = 0; index < totalChunks; index++) {
    if (params.signal?.aborted) {
      throw createAbortError();
    }

    const start = index * chunkSize;
    const end = Math.min(totalBytes, start + chunkSize);
    const chunkBlob = params.videoFile.slice(start, end);
    const chunkUrl = apiUrl(`/api/reels/upload/chunk/${encodeURIComponent(uploadId)}?index=${index}`);

    let attempt = 0;
    let chunkDone = false;
    let lastError: any = null;

    while (attempt < 3 && !chunkDone) {
      if (params.signal?.aborted) {
        throw createAbortError();
      }
      attempt += 1;
      try {
        const freshToken = attempt > 1 ? await user.getIdToken(true) : idToken;
        await uploadChunkWithXhr({
          url: chunkUrl,
          chunk: chunkBlob,
          idToken: freshToken,
          timeoutMs: 45000,
          signal: params.signal,
          onChunkProgress: (loaded) => {
            const bytesNow = Math.min(totalBytes, uploadedSoFar + loaded);
            const elapsedSec = Math.max(0.25, (Date.now() - uploadStartMs) / 1000);
            const bytesPerSecond = bytesNow / elapsedSec;
            const remainingBytes = Math.max(0, totalBytes - bytesNow);
            const etaSeconds = bytesPerSecond > 1024 ? Math.ceil(remainingBytes / bytesPerSecond) : undefined;
            const pct = Math.min(90, Math.max(2, Math.round(2 + (bytesNow / totalBytes) * 88)));
            emitProgress({
              percent: pct,
              bytesTransferred: bytesNow,
              totalBytes,
              bytesPerSecond,
              etaSeconds,
              phase: 'uploading',
              chunkIndex: index + 1,
              totalChunks,
              stage: `Uploading video (${formatMb(bytesNow)} / ${formatMb(totalBytes)} MB)`,
            });
          },
        });
        chunkDone = true;
      } catch (chunkErr: any) {
        if (chunkErr?.name === 'AbortError' || params.signal?.aborted) {
          throw createAbortError();
        }
        lastError = chunkErr;
        // Never retry hard client errors (413 too large, 400/401/403)
        if (chunkErr?.status && chunkErr.status >= 400 && chunkErr.status < 500) {
          throw chunkErr;
        }
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 700 * attempt));
        }
      }
    }

    if (!chunkDone) {
      throw lastError || new Error('Video chunk upload failed. Please check your internet connection.');
    }

    uploadedSoFar = end;
    const elapsedSec = Math.max(0.25, (Date.now() - uploadStartMs) / 1000);
    const bytesPerSecond = uploadedSoFar / elapsedSec;
    const remainingBytes = Math.max(0, totalBytes - uploadedSoFar);
    const etaSeconds = bytesPerSecond > 1024 ? Math.ceil(remainingBytes / bytesPerSecond) : undefined;
    const pct = Math.min(90, Math.max(2, Math.round(2 + (uploadedSoFar / totalBytes) * 88)));
    emitProgress({
      percent: pct,
      bytesTransferred: uploadedSoFar,
      totalBytes,
      bytesPerSecond,
      etaSeconds,
      phase: 'uploading',
      chunkIndex: index + 1,
      totalChunks,
      stage: `Uploading video (${formatMb(uploadedSoFar)} / ${formatMb(totalBytes)} MB)`,
    });
  }

  if (params.signal?.aborted) {
    throw createAbortError();
  }

  // 3. Finalize video file on server
  emitProgress({
    percent: 91,
    bytesTransferred: totalBytes,
    totalBytes,
    phase: 'finalizing',
    stage: 'Finalizing video file...',
  });

  const completeRes = await apiFetch(`/api/reels/upload/complete/${encodeURIComponent(uploadId)}`, {
    method: 'POST',
    timeoutMs: 25000,
    signal: params.signal,
    body: JSON.stringify({ reelId: params.reelId }),
  });

  const completeData = await completeRes.json().catch(() => ({}));
  if (!completeRes.ok || !completeData?.videoUrl) {
    throw new Error(completeData?.error || 'Failed to finalize uploaded reel video.');
  }

  const videoUrl = resolveMediaUrl(completeData.videoUrl);
  const videoStoragePath: string = completeData.videoStoragePath || `server_media:${params.reelId}`;

  // 4. Generate & upload JPEG thumbnail (non-blocking if codec cannot draw canvas frame)
  let thumbnailUrl = videoUrl;
  let thumbnailStoragePath = '';
  try {
    emitProgress({
      percent: 93,
      bytesTransferred: totalBytes,
      totalBytes,
      phase: 'thumbnail',
      stage: 'Creating preview cover...',
    });
    const thumbBlob = await captureVideoThumbnailBlob(params.videoFile);
    if (thumbBlob && thumbBlob.size > 0 && !params.signal?.aborted) {
      const freshToken = await user.getIdToken();
      const thumbData = await uploadThumbnailWithXhr({
        url: apiUrl(`/api/reels/thumbnail/${encodeURIComponent(params.reelId)}`),
        blob: thumbBlob,
        idToken: freshToken,
        timeoutMs: 15000,
        signal: params.signal,
        onProgress: (ratio) => {
          emitProgress({
            percent: 93 + Math.round(ratio * 3),
            bytesTransferred: totalBytes,
            totalBytes,
            phase: 'thumbnail',
            stage: 'Uploading preview cover...',
          });
        },
      });
      if (thumbData?.thumbnailUrl) {
        thumbnailUrl = resolveMediaUrl(thumbData.thumbnailUrl);
        thumbnailStoragePath = thumbData.thumbnailStoragePath || '';
      }
    }
  } catch (thumbErr: any) {
    if (thumbErr?.name === 'AbortError' || params.signal?.aborted) {
      throw createAbortError();
    }
    console.warn('[Reels Storage] Thumbnail upload skipped:', thumbErr);
  }

  emitProgress({
    percent: 96,
    bytesTransferred: totalBytes,
    totalBytes,
    phase: 'saving',
    stage: 'Publishing reel...',
  });

  return {
    videoUrl,
    videoStoragePath,
    thumbnailUrl,
    thumbnailStoragePath,
    fileSizeBytes: totalBytes,
    storageBackend: 'server_media',
  };
}

/**
 * Upload a Reel video (strictly <= 100 MB) + auto-captured thumbnail:
 *  - Primary (when Firebase Storage bucket is provisioned): Firebase Storage `reels/{uid}/{reelId}/video.{ext}`
 *    with real `state_changed` progress events and a 12-second zero-progress stall guard.
 *  - Automatic / Instant Fallback: Persistent 4 MB chunked streaming storage on Lenzo backend
 *    (`/api/reels/upload/*` -> `/api/reels/media/{reelId}/video.{ext}`) with full HTTP 206 Range streaming.
 */
export async function uploadReelVideoAndThumbnail(params: {
  reelId: string;
  videoFile: File | Blob;
  signal?: AbortSignal;
  onProgress?: UploadProgressCallback;
}): Promise<ReelUploadResult> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required to upload reels.');
  }
  if (params.signal?.aborted) {
    throw createAbortError();
  }

  const totalBytes = params.videoFile.size;
  if (totalBytes <= 0) {
    throw new Error('Selected video file is empty.');
  }
  if (totalBytes > MAX_REEL_VIDEO_BYTES) {
    const sizeMb = (totalBytes / (1024 * 1024)).toFixed(1);
    throw new Error(`Video is ${sizeMb} MB. Maximum allowed size is 100 MB.`);
  }

  const { mimeType, ext, fileName } = inferVideoTypeAndExt(params.videoFile);

  params.onProgress?.(0, {
    percent: 0,
    bytesTransferred: 0,
    totalBytes,
    phase: 'init',
    stage: 'Connecting to storage...',
  });

  // Attempt Firebase Storage ONLY if the bucket actually exists (never stall 10 minutes on 404!)
  if (await isFirebaseStorageBucketReady()) {
    if (params.signal?.aborted) {
      throw createAbortError();
    }

    try {
      const videoStoragePath = `reels/${user.uid}/${params.reelId}/video.${ext}`;
      const videoRef = ref(storage, videoStoragePath);
      const uploadStartMs = Date.now();
      let highWaterPct = 1;

      const emitFirebaseProgress = (info: UploadProgressInfo) => {
        const clamped = Math.max(highWaterPct, Math.min(96, Math.round(info.percent)));
        highWaterPct = clamped;
        params.onProgress?.(clamped, {
          ...info,
          percent: clamped,
          totalBytes: info.totalBytes ?? totalBytes,
        });
      };

      const videoUrl = await new Promise<string>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(videoRef, params.videoFile, {
          contentType: mimeType,
          customMetadata: {
            userId: user.uid,
            reelId: params.reelId,
            uploadedAt: new Date().toISOString(),
          },
        });

        const onAbort = () => {
          uploadTask.cancel();
          reject(createAbortError());
        };
        params.signal?.addEventListener('abort', onAbort, { once: true });

        let lastBytes = 0;
        let stallTimer = setTimeout(() => {
          uploadTask.cancel();
          reject(new Error('Firebase Storage stalled with 0 bytes transferred'));
        }, 12000);

        const resetStallTimer = () => {
          clearTimeout(stallTimer);
          stallTimer = setTimeout(() => {
            uploadTask.cancel();
            reject(new Error('Firebase Storage upload stalled'));
          }, 25000);
        };

        const cleanup = () => {
          clearTimeout(stallTimer);
          params.signal?.removeEventListener('abort', onAbort);
        };

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.bytesTransferred > lastBytes) {
              lastBytes = snapshot.bytesTransferred;
              resetStallTimer();
            }
            const snapTotal = snapshot.totalBytes || totalBytes;
            const elapsedSec = Math.max(0.25, (Date.now() - uploadStartMs) / 1000);
            const bytesPerSecond = snapshot.bytesTransferred / elapsedSec;
            const remainingBytes = Math.max(0, snapTotal - snapshot.bytesTransferred);
            const etaSeconds = bytesPerSecond > 1024 ? Math.ceil(remainingBytes / bytesPerSecond) : undefined;
            const pct =
              snapTotal > 0
                ? 2 + (snapshot.bytesTransferred / snapTotal) * 88
                : 2;
            emitFirebaseProgress({
              percent: Math.min(90, Math.max(2, Math.round(pct))),
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapTotal,
              bytesPerSecond,
              etaSeconds,
              phase: 'uploading',
              stage: `Uploading video (${formatMb(snapshot.bytesTransferred)} / ${formatMb(snapTotal)} MB)`,
            });
          },
          (error) => {
            cleanup();
            if (params.signal?.aborted) {
              reject(createAbortError());
              return;
            }
            reject(error);
          },
          async () => {
            cleanup();
            try {
              emitFirebaseProgress({
                percent: 91,
                bytesTransferred: totalBytes,
                totalBytes,
                phase: 'finalizing',
                stage: 'Finalizing video URL...',
              });
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadUrl);
            } catch (urlErr) {
              reject(urlErr);
            }
          }
        );
      });

      let thumbnailUrl = videoUrl;
      let thumbnailStoragePath = '';
      try {
        emitFirebaseProgress({
          percent: 92,
          bytesTransferred: totalBytes,
          totalBytes,
          phase: 'thumbnail',
          stage: 'Creating preview cover...',
        });
        const thumbBlob = await captureVideoThumbnailBlob(params.videoFile);
        if (thumbBlob && thumbBlob.size > 0 && !params.signal?.aborted) {
          thumbnailStoragePath = `reels/${user.uid}/${params.reelId}/thumbnail.jpg`;
          const thumbRef = ref(storage, thumbnailStoragePath);
          const thumbTask = uploadBytesResumable(thumbRef, thumbBlob, {
            contentType: 'image/jpeg',
            customMetadata: {
              userId: user.uid,
              reelId: params.reelId,
            },
          });
          thumbnailUrl = await new Promise<string>((resolve, reject) => {
            const onAbort = () => {
              thumbTask.cancel();
              reject(createAbortError());
            };
            params.signal?.addEventListener('abort', onAbort, { once: true });

            const thumbTimeout = setTimeout(() => {
              thumbTask.cancel();
              reject(new Error('Thumbnail upload timed out'));
            }, 12000);

            const cleanupThumb = () => {
              clearTimeout(thumbTimeout);
              params.signal?.removeEventListener('abort', onAbort);
            };

            thumbTask.on(
              'state_changed',
              (thumbSnap) => {
                const ratio =
                  thumbSnap.totalBytes > 0 ? thumbSnap.bytesTransferred / thumbSnap.totalBytes : 0.5;
                emitFirebaseProgress({
                  percent: 93 + Math.round(ratio * 3),
                  bytesTransferred: totalBytes,
                  totalBytes,
                  phase: 'thumbnail',
                  stage: 'Uploading preview cover...',
                });
              },
              (err) => {
                cleanupThumb();
                reject(err);
              },
              async () => {
                cleanupThumb();
                try {
                  resolve(await getDownloadURL(thumbTask.snapshot.ref));
                } catch (e) {
                  reject(e);
                }
              }
            );
          });
        }
      } catch (thumbErr: any) {
        if (thumbErr?.name === 'AbortError' || params.signal?.aborted) {
          throw createAbortError();
        }
        console.warn('[Firebase Storage] Reel thumbnail upload fallback:', thumbErr);
        thumbnailStoragePath = '';
      }

      emitFirebaseProgress({
        percent: 96,
        bytesTransferred: totalBytes,
        totalBytes,
        phase: 'saving',
        stage: 'Publishing reel...',
      });

      return {
        videoUrl,
        videoStoragePath,
        thumbnailUrl,
        thumbnailStoragePath,
        fileSizeBytes: totalBytes,
        storageBackend: 'firebase_storage',
      };
    } catch (firebaseErr: any) {
      if (firebaseErr?.name === 'AbortError' || params.signal?.aborted) {
        throw createAbortError();
      }
      console.warn('[Firebase Storage] Reel upload failed; switching to Lenzo chunked server storage:', firebaseErr);
      firebaseStorageProbeCache = { available: false, checkedAt: Date.now() };
    }
  }

  // Tier 2: Persistent 4 MB chunked streaming storage on Lenzo backend (up to 100 MB)
  try {
    return await uploadReelViaChunkedBackend({
      reelId: params.reelId,
      videoFile: params.videoFile,
      mimeType,
      fileName,
      signal: params.signal,
      onProgress: params.onProgress,
    });
  } catch (backendErr: any) {
    if (backendErr?.name === 'AbortError' || params.signal?.aborted) {
      throw createAbortError();
    }
    const errMsg = String(backendErr?.message || '');
    const isBackendUnavailable =
      backendErr?.isNetworkError ||
      backendErr?.isTimeout ||
      backendErr?.status === 502 ||
      backendErr?.status === 503 ||
      backendErr?.status === 504 ||
      backendErr?.status === 404 ||
      /502|503|504|offline|unavailable|failed to fetch|unable to reach|network|timed out|could not start video upload/i.test(
        errMsg
      );

    if (!isBackendUnavailable) {
      throw backendErr;
    }

    console.warn(
      '[Reels Storage] Media server unreachable; falling back to resilient Firestore cloud chunk storage:',
      errMsg
    );

    // Tier 3: Firestore cloud chunk fallback (works on Web, AI Studio & Android APK up to 15 MB)
    return uploadReelViaFirestoreChunks({
      reelId: params.reelId,
      videoFile: params.videoFile,
      mimeType,
      signal: params.signal,
      onProgress: params.onProgress,
    });
  }
}

/**
 * Upload a short video (legacy helper kept for backward compatibility)
 */
export async function uploadPostVideo(
  videoFile: File | Blob,
  onProgress?: UploadProgressCallback,
  signal?: AbortSignal
): Promise<string> {
  const reelId = `reel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const uploaded = await uploadReelVideoAndThumbnail({
    reelId,
    videoFile,
    onProgress,
    signal,
  });
  return uploaded.videoUrl;
}

/**
 * Safely delete a file from either server_media disk storage or Firebase Storage
 */
export async function deleteStoragePath(storagePath?: string | null): Promise<boolean> {
  if (!storagePath || !storagePath.trim()) return false;
  const trimmed = storagePath.trim();

  if (trimmed.startsWith('firestore_chunks:')) {
    const reelId = trimmed.slice('firestore_chunks:'.length).split('/')[0];
    return reelId ? deleteFirestoreReelChunks(reelId) : false;
  }

  if (trimmed.startsWith('server_media:')) {
    const reelId = trimmed.slice('server_media:'.length).split('/')[0];
    if (!reelId) return false;
    try {
      const res = await apiFetch(`/api/reels/media/${encodeURIComponent(reelId)}`, {
        method: 'DELETE',
        timeoutMs: 10000,
      });
      return res.ok;
    } catch (err) {
      console.warn('[Server Media] Could not delete reel media:', reelId, err);
      return false;
    }
  }

  if (!(await isFirebaseStorageBucketReady())) return false;
  try {
    const storageRef = ref(storage, trimmed);
    await deleteObject(storageRef);
    return true;
  } catch (err) {
    console.warn('[Firebase Storage] Could not delete storage path:', trimmed, err);
    return false;
  }
}

/**
 * Safely delete an uploaded file by URL (handles Firestore chunks, server media, and Firebase Storage URLs)
 */
export async function deleteStorageFileByUrl(fileUrl: string): Promise<boolean> {
  if (!fileUrl) return false;

  if (isFirestoreChunkedVideoUrl(fileUrl)) {
    const reelId = extractFirestoreChunkedReelId(fileUrl);
    return reelId ? deleteFirestoreReelChunks(reelId) : false;
  }

  const serverMediaMatch = fileUrl.match(/\/api\/reels\/media\/([a-zA-Z0-9_-]+)\//);
  if (serverMediaMatch?.[1]) {
    try {
      const res = await apiFetch(`/api/reels/media/${encodeURIComponent(serverMediaMatch[1])}`, {
        method: 'DELETE',
        timeoutMs: 10000,
      });
      return res.ok;
    } catch (err) {
      console.warn('[Server Media] Could not delete reel media by URL:', err);
      return false;
    }
  }

  if (!fileUrl.includes('firebasestorage')) return false;
  if (!(await isFirebaseStorageBucketReady())) return false;
  try {
    const storageRef = ref(storage, fileUrl);
    await deleteObject(storageRef);
    return true;
  } catch (err) {
    console.warn('[Firebase Storage] Could not delete file:', err);
    return false;
  }
}
