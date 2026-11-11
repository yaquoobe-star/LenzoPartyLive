import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTaskSnapshot,
} from 'firebase/storage';
import { storage, auth } from '../firebase';

export interface UploadProgressCallback {
  (progressPercent: number, snapshot: UploadTaskSnapshot): void;
}

/**
 * Upload a profile or cover image to Firebase Storage
 */
export async function uploadUserImage(
  file: File | Blob,
  folder: 'avatars' | 'covers',
  onProgress?: UploadProgressCallback
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required to upload user images.');
  }

  const fileType = file.type || 'image/jpeg';
  const ext = fileType.includes('png') ? 'png' : fileType.includes('webp') ? 'webp' : 'jpg';
  const fileName = `${folder}_${user.uid}_${Date.now()}.${ext}`;
  const storageRef = ref(storage, `users/${user.uid}/${folder}/${fileName}`);

  return new Promise((resolve, reject) => {
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
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(Math.round(progress), snapshot);
      },
      (error) => {
        console.error('[Firebase Storage] Image upload error:', error);
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
