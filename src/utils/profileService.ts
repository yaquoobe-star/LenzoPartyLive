import { UserProfile, VideoItem } from '../types';
import { CURRENT_USER } from '../data/mockData';
import { apiFetch } from './apiConfig';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { FirestoreUserData, mapFirestoreUserToProfile } from '../services/authService';
import { syncFirestoreFollow } from '../services/firestoreService';

const LOCAL_STORAGE_PROFILE_KEY = 'lenzo_party_user_profile_v3';
const LOCAL_STORAGE_FOLLOWING_KEY = 'lenzo_party_following_v2';
const LOCAL_STORAGE_LIKED_VIDEOS_KEY = 'lenzo_party_liked_videos_v2';
const LOCAL_STORAGE_SAVED_VIDEOS_KEY = 'lenzo_party_saved_videos_v2';
const LOCAL_STORAGE_CUSTOM_VIDEOS_KEY = 'lenzo_party_custom_videos_v2';

export interface FollowListMember {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  level: number;
  isVIP: boolean;
  isFollowing: boolean;
}

class ProfileService {
  private currentUserId: string = CURRENT_USER.id;

  private getStoredFollowingIds(): Set<string> {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_FOLLOWING_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch (e) {
      console.warn('Failed to load following set:', e);
    }
    return new Set();
  }

  private saveStoredFollowingIds(ids: Set<string>): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_FOLLOWING_KEY, JSON.stringify(Array.from(ids)));
    } catch (e) {
      console.warn('Failed to save following set:', e);
    }
  }

  private getStoredLikedVideoIds(): Set<string> {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_LIKED_VIDEOS_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch (e) {
      console.warn('Failed to load liked videos:', e);
    }
    return new Set();
  }

  private saveStoredLikedVideoIds(ids: Set<string>): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_LIKED_VIDEOS_KEY, JSON.stringify(Array.from(ids)));
    } catch (e) {
      console.warn('Failed to save liked videos:', e);
    }
  }

  private getStoredSavedVideoIds(): Set<string> {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SAVED_VIDEOS_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch (e) {
      console.warn('Failed to load saved videos:', e);
    }
    return new Set();
  }

  private saveStoredSavedVideoIds(ids: Set<string>): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_SAVED_VIDEOS_KEY, JSON.stringify(Array.from(ids)));
    } catch (e) {
      console.warn('Failed to save saved videos:', e);
    }
  }

  getStoredVideos(): VideoItem[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_VIDEOS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as VideoItem[];
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load stored videos:', e);
    }
    return [];
  }

  saveStoredVideos(videos: VideoItem[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_CUSTOM_VIDEOS_KEY, JSON.stringify(videos));
    } catch (e) {
      console.warn('Failed to save videos:', e);
    }
  }

  isFollowingLocally(targetUserId: string): boolean {
    return this.getStoredFollowingIds().has(targetUserId);
  }

  /**
   * Fetch user profile from shared Cloud Firestore first, then backend API or local cache
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    const followingSet = this.getStoredFollowingIds();

    if (auth.currentUser && userId && /^[a-zA-Z0-9_-]{1,128}$/.test(userId)) {
      try {
        const snap = await getDoc(doc(db, 'users', userId));
        if (snap.exists()) {
          const profile = mapFirestoreUserToProfile(
            snap.data() as FirestoreUserData,
            userId === auth.currentUser.uid ? auth.currentUser : null
          );
          return {
            ...profile,
            isFollowing: followingSet.has(profile.id),
          };
        }
      } catch {
        // Continue to API
      }
    }

    try {
      const res = await apiFetch(`/api/users/${encodeURIComponent(userId)}`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (data.user) {
          return {
            ...data.user,
            isFollowing: followingSet.has(data.user.id),
          };
        }
      }
    } catch {
      // Backend unreachable or offline
    }

    if (userId === this.currentUserId || userId === auth.currentUser?.uid) {
      const stored = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      if (stored) {
        return { ...CURRENT_USER, ...JSON.parse(stored) };
      }
      return CURRENT_USER;
    }

    return {
      ...CURRENT_USER,
      id: userId,
      name: 'User',
      username: `@user_${userId.slice(0, 6)}`,
      isFollowing: followingSet.has(userId),
    };
  }

  /**
   * Check if a unique username is available
   */
  async isUsernameAvailable(username: string, currentUserId: string): Promise<{ available: boolean; message?: string }> {
    const clean = username.trim().toLowerCase().replace(/^@/, '');
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      return { available: false, message: 'Username must be 3-20 letters, numbers or underscores.' };
    }

    try {
      const res = await apiFetch(`/api/users/check_username?username=${encodeURIComponent(clean)}&userId=${encodeURIComponent(currentUserId)}`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        return await res.json();
      }
    } catch {
      // Offline
    }

    return { available: true };
  }

  /**
   * Update profile across Cloud Firestore (shared Web + Android), Railway backend API, and local cache
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const targetUid = auth.currentUser?.uid || userId;
    const current = await this.getUserProfile(targetUid);
    const merged: UserProfile = {
      ...current,
      ...updates,
      id: targetUid,
      displayId: current.displayId,
    };

    if (auth.currentUser && auth.currentUser.uid === targetUid) {
      try {
        const fsUpdates: Record<string, any> = {};
        if (typeof updates.name === 'string' && updates.name.trim().length >= 2) {
          fsUpdates.fullName = updates.name.trim().slice(0, 60);
        }
        if (typeof updates.username === 'string') fsUpdates.username = updates.username.slice(0, 40);
        if (typeof updates.avatar === 'string') fsUpdates.profileImage = updates.avatar.slice(0, 1500);
        if (typeof updates.coverImage === 'string') fsUpdates.coverImage = updates.coverImage.slice(0, 1500);
        if (typeof updates.bio === 'string') fsUpdates.bio = updates.bio.slice(0, 300);
        if (typeof updates.gender === 'string') fsUpdates.gender = updates.gender.slice(0, 24);
        if (typeof updates.country === 'string') fsUpdates.country = updates.country.slice(0, 64);
        if (typeof updates.birthday === 'string') fsUpdates.birthday = updates.birthday.slice(0, 32);

        if (Object.keys(fsUpdates).length > 0) {
          await updateDoc(doc(db, 'users', targetUid), fsUpdates);
        }
      } catch (err) {
        console.warn('[Firestore] Profile update sync notice:', err);
      }
    }

    try {
      const res = await apiFetch(`/api/users/${encodeURIComponent(targetUid)}`, {
        method: 'PUT',
        body: JSON.stringify(merged),
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (data.user && !auth.currentUser) {
          localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(data.user));
          return data.user;
        }
      }
    } catch (e) {
      console.warn('Backend profile sync notice:', e);
    }

    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(merged));
    return merged;
  }

  /**
   * Get Followers List for user from backend API (no fake list fallback)
   */
  async getFollowers(userId: string): Promise<FollowListMember[]> {
    const followingSet = this.getStoredFollowingIds();
    try {
      const res = await apiFetch(`/api/users/${encodeURIComponent(userId)}/followers`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data.followers)) {
          return data.followers.map((f: FollowListMember) => ({
            ...f,
            isFollowing: followingSet.has(f.id) || !!f.isFollowing,
          }));
        }
      }
    } catch {
      // Backend unavailable
    }

    return [];
  }

  /**
   * Get Following List for user from backend API (no fake list fallback)
   */
  async getFollowing(userId: string): Promise<FollowListMember[]> {
    try {
      const res = await apiFetch(`/api/users/${encodeURIComponent(userId)}/following`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data.following)) {
          return data.following;
        }
      }
    } catch {
      // Backend unavailable
    }

    return [];
  }

  /**
   * Follow / Unfollow User synced across backend + Firestore follows graph
   */
  async toggleFollow(
    targetUserId: string,
    currentUserId: string
  ): Promise<{ isFollowing: boolean; targetFollowersCount: number; myFollowingCount: number }> {
    if (targetUserId === currentUserId) {
      throw new Error('You cannot follow yourself.');
    }

    const followingSet = this.getStoredFollowingIds();
    const isCurrentlyFollowing = followingSet.has(targetUserId);
    const willFollow = !isCurrentlyFollowing;
    const action = isCurrentlyFollowing ? 'unfollow' : 'follow';

    if (willFollow) {
      followingSet.add(targetUserId);
    } else {
      followingSet.delete(targetUserId);
    }
    this.saveStoredFollowingIds(followingSet);

    if (auth.currentUser && currentUserId === auth.currentUser.uid) {
      syncFirestoreFollow(currentUserId, targetUserId, willFollow).catch(() => {});
    }

    try {
      const res = await apiFetch(`/api/users/${encodeURIComponent(targetUserId)}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ followerId: currentUserId }),
      });

      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        return {
          isFollowing: willFollow,
          targetFollowersCount: typeof data.targetFollowersCount === 'number' ? data.targetFollowersCount : 0,
          myFollowingCount: typeof data.followerFollowingCount === 'number' ? data.followerFollowingCount : followingSet.size,
        };
      }
    } catch {
      // Non-blocking fallback
    }

    return {
      isFollowing: willFollow,
      targetFollowersCount: willFollow ? 1 : 0,
      myFollowingCount: followingSet.size,
    };
  }

  async getUserVideoTabs(
    profileOwnerId: string,
    viewerId: string
  ): Promise<{
    publicVideos: VideoItem[];
    privateVideos: VideoItem[];
    likedVideos: VideoItem[];
    savedVideos: VideoItem[];
  }> {
    const isOwner = profileOwnerId === viewerId;
    const allVideos = this.getStoredVideos();
    const likedIds = this.getStoredLikedVideoIds();
    const savedIds = this.getStoredSavedVideoIds();

    const publicVideos = allVideos
      .filter((v) => v.creator.id === profileOwnerId && v.privacy !== 'private')
      .map((v) => ({
        ...v,
        viewsCount: v.viewsCount || 0,
        isLiked: likedIds.has(v.id),
        isSaved: savedIds.has(v.id),
      }));

    const privateVideos = isOwner
      ? allVideos
          .filter((v) => v.creator.id === profileOwnerId && v.privacy === 'private')
          .map((v) => ({
            ...v,
            viewsCount: v.viewsCount || 0,
            isLiked: likedIds.has(v.id),
            isSaved: savedIds.has(v.id),
          }))
      : [];

    const likedVideos = allVideos
      .filter((v) => likedIds.has(v.id))
      .map((v) => ({
        ...v,
        viewsCount: v.viewsCount || 0,
        isLiked: true,
        isSaved: savedIds.has(v.id),
      }));

    const savedVideos = isOwner
      ? allVideos
          .filter((v) => savedIds.has(v.id))
          .map((v) => ({
            ...v,
            viewsCount: v.viewsCount || 0,
            isLiked: likedIds.has(v.id),
            isSaved: true,
          }))
      : [];

    return {
      publicVideos,
      privateVideos,
      likedVideos,
      savedVideos,
    };
  }

  async toggleLikeVideo(videoId: string, _userId: string): Promise<{ isLiked: boolean; newCount: number }> {
    const likedSet = this.getStoredLikedVideoIds();
    const wasLiked = likedSet.has(videoId);
    const willLike = !wasLiked;

    if (willLike) {
      likedSet.add(videoId);
    } else {
      likedSet.delete(videoId);
    }
    this.saveStoredLikedVideoIds(likedSet);

    const videos = this.getStoredVideos();
    let newCount = 0;
    const updated = videos.map((v) => {
      if (v.id === videoId) {
        newCount = Math.max(0, v.likesCount + (willLike ? 1 : -1));
        return {
          ...v,
          likesCount: newCount,
          isLiked: willLike,
        };
      }
      return v;
    });
    this.saveStoredVideos(updated);

    return { isLiked: willLike, newCount };
  }

  async toggleSaveVideo(videoId: string): Promise<boolean> {
    const savedSet = this.getStoredSavedVideoIds();
    const wasSaved = savedSet.has(videoId);
    const willSave = !wasSaved;

    if (willSave) {
      savedSet.add(videoId);
    } else {
      savedSet.delete(videoId);
    }
    this.saveStoredSavedVideoIds(savedSet);

    const videos = this.getStoredVideos();
    const updated = videos.map((v) => {
      if (v.id === videoId) {
        return { ...v, isSaved: willSave };
      }
      return v;
    });
    this.saveStoredVideos(updated);

    return willSave;
  }

  calculateTotalLikes(userId: string): number {
    const videos = this.getStoredVideos();
    const userVids = videos.filter((v) => v.creator.id === userId);
    return userVids.reduce((sum, v) => sum + (v.likesCount || 0), 0);
  }

  generateShareUrl(user: UserProfile): string {
    const cleanUsername = (user.username || `@user_${user.displayId || user.id}`).replace(/^@/, '');
    const origin =
      typeof window !== 'undefined' &&
      window.location.origin &&
      !window.location.origin.includes('localhost')
        ? window.location.origin
        : 'https://lenzoparty.com';
    return `${origin}/?u=${encodeURIComponent(cleanUsername)}`;
  }
}

export const profileService = new ProfileService();
