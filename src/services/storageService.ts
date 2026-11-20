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
  const maxDim = folder === 'covers' ? 1400 : 640;

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
  const dataUrl = await compressImageToDataUrl(file, maxDim, 0.82);

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
 * Upload a short video to Firebase Storage
 */
export async function uploadPostVideo(
  videoFile: File | Blob,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required to upload videos.');
  }

  const fileType = videoFile.type || 'video/mp4';
  const ext = fileType.includes('webm') ? 'webm' : 'mp4';
  const fileName = `video_${user.uid}_${Date.now()}.${ext}`;
  const storageRef = ref(storage, `videos/${user.uid}/${fileName}`);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, videoFile, {
      contentType: fileType,
      customMetadata: {
        userId: user.uid,
        uploadedAt: new Date().toISOString(),
      },
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(Math.round(progress), snapshot);
      },
      (error) => {
        console.error('[Firebase Storage] Video upload error:', error);
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
}

/**
 * Safely delete an uploaded file from Firebase Storage by URL
 */
export async function deleteStorageFileByUrl(fileUrl: string): Promise<boolean> {
  try {
    const storageRef = ref(storage, fileUrl);
    await deleteObject(storageRef);
    return true;
  } catch (err) {
    console.warn('[Firebase Storage] Could not delete file:', err);
    return false;
  }
}
