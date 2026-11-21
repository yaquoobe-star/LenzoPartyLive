import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTaskSnapshot,
} from 'firebase/storage';
import { storage, auth } from '../firebase';
import { apiFetch } from '../utils/apiConfig';

export interface UploadProgressCallback {
  (progressPercent: number, snapshot: UploadTaskSnapshot): void;
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
 * Upload a profile or cover image to Firebase Storage (with resilient backend fallback)
 */
export async function uploadUserImage(
  file: File | Blob,
  folder: 'avatars' | 'covers',
  onProgress?: UploadProgressCallback
): Promise<string> {
  const user = auth.currentUser;
  const maxDim = folder === 'covers' ? 1200 : 512;

  if (user) {
    try {
      const fileType = file.type || 'image/jpeg';
      const ext = fileType.includes('png') ? 'png' : fileType.includes('webp') ? 'webp' : 'jpg';
      const fileName = `${folder}_${user.uid}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, `users/${user.uid}/${folder}/${fileName}`);

      const storageUrl = await new Promise<string>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Firebase Storage upload timed out')), 12000);
        const uploadTask = uploadBytesResumable(storageRef, file, {
          contentType: fileType,
          customMetadata: {
            userId: user.uid,
            uploadedAt: new Date().toISOString(),
          },
        });

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = snapshot.totalBytes > 0
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

  // Fallback: compress cleanly and upload via backend /api/media/upload so URL stays short (< 80 chars) for Firestore
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
        return data.url;
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
 * - First attempts Firebase Storage (users/{uid}/party_backgrounds/...)
 * - Falls back to compressed JPEG uploaded via /api/media/upload
 * - Final fallback returns a compact Firestore-safe JPEG data URL (< 160 KB)
 */
export async function uploadPartyBackgroundImage(
  file: File | Blob,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const user = auth.currentUser;
  onProgress?.(15, {} as UploadTaskSnapshot);

  // Compress once up front for fast mobile uploads & crisp portrait/stage aspect ratio
  const compressedDataUrl = await compressImageToDataUrl(file, 960, 0.78);
  onProgress?.(35, {} as UploadTaskSnapshot);

  if (user) {
    try {
      const uploadBlob = await fetch(compressedDataUrl)
        .then((r) => r.blob())
        .catch(() => file);
      const fileType = uploadBlob.type || 'image/jpeg';
      const ext = fileType.includes('png') ? 'png' : fileType.includes('webp') ? 'webp' : 'jpg';
      const fileName = `party_bg_${user.uid}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, `users/${user.uid}/party_backgrounds/${fileName}`);

      const storageUrl = await new Promise<string>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Firebase Storage upload timed out')), 12000);
        const uploadTask = uploadBytesResumable(storageRef, uploadBlob, {
          contentType: fileType,
          customMetadata: {
            userId: user.uid,
            purpose: 'party_background',
            uploadedAt: new Date().toISOString(),
          },
        });

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

  // Fallback 1: Upload to backend /api/media/upload for a tiny URL
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
        return data.url;
      }
    }
  } catch (apiErr) {
    console.warn('[Party Background] Backend media upload fallback notice:', apiErr);
  }

  // Fallback 2: Ensure compact Firestore-safe JPEG data URL (< 160 KB) so cross-device Firestore sync always succeeds
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

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
  'video/ogg',
];
const MAX_REEL_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

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
      }, 6000);

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
}

/**
 * Upload a Reel video + auto-captured thumbnail to structured Firebase Storage paths:
 *   reels/{userUID}/{reelID}/video.{ext}
 *   reels/{userUID}/{reelID}/thumbnail.jpg
 */
export async function uploadReelVideoAndThumbnail(params: {
  reelId: string;
  videoFile: File | Blob;
  onProgress?: UploadProgressCallback;
}): Promise<ReelUploadResult> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required to upload reels.');
  }

  const fileType = (params.videoFile.type || 'video/mp4').toLowerCase();
  if (fileType && !ALLOWED_VIDEO_TYPES.some((allowed) => fileType.startsWith(allowed.split(';')[0]))) {
    throw new Error('Unsupported video format. Please upload an MP4, WebM, or MOV video.');
  }
  if (params.videoFile.size <= 0) {
    throw new Error('Selected video file is empty.');
  }
  if (params.videoFile.size > MAX_REEL_VIDEO_BYTES) {
    throw new Error('Video file exceeds the 100 MB maximum limit.');
  }

  const ext = fileType.includes('webm') ? 'webm' : fileType.includes('quicktime') ? 'mov' : 'mp4';
  const videoStoragePath = `reels/${user.uid}/${params.reelId}/video.${ext}`;
  const videoRef = ref(storage, videoStoragePath);

  const videoUrl = await new Promise<string>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(videoRef, params.videoFile, {
      contentType: fileType,
      customMetadata: {
        userId: user.uid,
        reelId: params.reelId,
        uploadedAt: new Date().toISOString(),
      },
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = snapshot.totalBytes > 0 ? (snapshot.bytesTransferred / snapshot.totalBytes) * 88 : 15;
        params.onProgress?.(Math.min(88, Math.max(5, Math.round(pct))), snapshot);
      },
      (error) => {
        console.error('[Firebase Storage] Reel video upload error:', error);
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (urlErr) {
          reject(urlErr);
        }
      }
    );
  });

  // Extract & upload real JPEG thumbnail to reels/{userUID}/{reelID}/thumbnail.jpg
  let thumbnailUrl = videoUrl;
  let thumbnailStoragePath = '';
  try {
    const thumbBlob = await captureVideoThumbnailBlob(params.videoFile);
    if (thumbBlob && thumbBlob.size > 0) {
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
        thumbTask.on(
          'state_changed',
          () => {},
          (err) => reject(err),
          async () => {
            try {
              resolve(await getDownloadURL(thumbTask.snapshot.ref));
            } catch (e) {
              reject(e);
            }
          }
        );
      });
    }
  } catch (thumbErr) {
    console.warn('[Firebase Storage] Reel thumbnail upload fallback:', thumbErr);
    thumbnailStoragePath = '';
  }

  params.onProgress?.(96, {} as UploadTaskSnapshot);

  return {
    videoUrl,
    videoStoragePath,
    thumbnailUrl,
    thumbnailStoragePath,
  };
}

/**
 * Upload a short video to Firebase Storage (legacy helper kept for backward compatibility)
 */
export async function uploadPostVideo(
  videoFile: File | Blob,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const reelId = `reel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const uploaded = await uploadReelVideoAndThumbnail({
    reelId,
    videoFile,
    onProgress,
  });
  return uploaded.videoUrl;
}

/**
 * Safely delete a file from Firebase Storage by storage path (e.g. reels/{uid}/{reelId}/video.mp4)
 */
export async function deleteStoragePath(storagePath?: string | null): Promise<boolean> {
  if (!storagePath || !storagePath.trim()) return false;
  try {
    const storageRef = ref(storage, storagePath.trim());
    await deleteObject(storageRef);
    return true;
  } catch (err) {
    console.warn('[Firebase Storage] Could not delete storage path:', storagePath, err);
    return false;
  }
}

/**
 * Safely delete an uploaded file from Firebase Storage by URL
 */
export async function deleteStorageFileByUrl(fileUrl: string): Promise<boolean> {
  if (!fileUrl || !fileUrl.includes('firebasestorage')) return false;
  try {
    const storageRef = ref(storage, fileUrl);
    await deleteObject(storageRef);
    return true;
  } catch (err) {
    console.warn('[Firebase Storage] Could not delete file:', err);
    return false;
  }
}
