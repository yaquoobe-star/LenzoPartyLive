import { UserProfile, VideoItem } from '../types';
import { CURRENT_USER } from '../data/mockData';
import { apiFetch } from './apiConfig';
import { auth, db } from '../firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { FirestoreUserData, mapFirestoreUserToProfile } from '../services/authService';
import {
  fetchFirestoreVideos,
  syncFirestoreFollow,
  toggleLikeVideo as toggleFirestoreLikeVideo,
} from '../services/firestoreService';

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

  getStoredLikedVideoIds(): Set<string> {
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

  getStoredSavedVideoIds(): Set<string> {
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
   * Fetch user profile from Cloud Firestore first, then Express resolve/user API, then local cache
   */
  async getUserProfile(userIdOrHandle: string): Promise<UserProfile> {
    const followingSet = this.getStoredFollowingIds();
    const cleaned = (userIdOrHandle || '').trim();

    if (auth.currentUser && cleaned && /^[a-zA-Z0-9_-]{1,128}$/.test(cleaned)) {
      try {
        const snap = await getDoc(doc(db, 'users', cleaned));
        if (snap.exists()) {
          const profile = mapFirestoreUserToProfile(
            snap.data() as FirestoreUserData,
            cleaned === auth.currentUser.uid ? auth.currentUser : null
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
      const res = await apiFetch(`/api/users/resolve/${encodeURIComponent(cleaned)}`);
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

    if (cleaned === this.currentUserId || cleaned === auth.currentUser?.uid) {
      const stored = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      if (stored) {
        return { ...CURRENT_USER, ...JSON.parse(stored) };
      }
      return CURRENT_USER;
    }

    return {
      ...CURRENT_USER,
      id: cleaned || 'unknown',
      displayId: (cleaned || 'USER00').slice(0, 8).toUpperCase(),
      name: 'Lenzo Creator',
      username: `@${(cleaned || 'user').replace(/^@/, '').slice(0, 14)}`,
      isFollowing: followingSet.has(cleaned),
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
      const res = await apiFetch(
        `/api/users/check_username?username=${encodeURIComponent(clean)}&userId=${encodeURIComponent(currentUserId)}`
      );
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        return await res.json();
      }
    } catch {
      // Offline
    }

    return { available: true };
  }

  /**
   * Update profile across Cloud Firestore (shared Web + Android), Express backend API, and local cache
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
        if (typeof updates.avatar === 'string' && updates.avatar.length <= 1500) {
          fsUpdates.profileImage = updates.avatar;
        }
        if (typeof updates.coverImage === 'string' && updates.coverImage.length <= 1500) {
          fsUpdates.coverImage = updates.coverImage;
        }
        if (typeof updates.bio === 'string') fsUpdates.bio = updates.bio.slice(0, 300);
        if (typeof updates.gender === 'string') fsUpdates.gender = updates.gender.slice(0, 24);
        if (typeof updates.country === 'string') fsUpdates.country = updates.country.slice(0, 64);
        if (typeof updates.birthday === 'string') fsUpdates.birthday = updates.birthday.slice(0, 32);
        if (typeof updates.showGender === 'boolean') fsUpdates.showGender = updates.showGender;
        if (typeof updates.showAge === 'boolean') fsUpdates.showAge = updates.showAge;
        if (typeof updates.showOnlineStatus === 'boolean') fsUpdates.showOnlineStatus = updates.showOnlineStatus;
        if (Array.isArray(updates.equippedBadges)) {
          fsUpdates.equippedBadges = updates.equippedBadges.slice(0, 3);
        }
        if (typeof updates.agencyId === 'string') fsUpdates.agencyId = updates.agencyId;
        if (typeof updates.agencyName === 'string') fsUpdates.agencyName = updates.agencyName;
        if (typeof updates.agencyCode === 'string') fsUpdates.agencyCode = updates.agencyCode;
        if (typeof updates.agencyLogo === 'string') fsUpdates.agencyLogo = updates.agencyLogo;
        if (typeof updates.agencyRole === 'string' || updates.agencyRole === undefined) {
          if ('agencyRole' in updates) fsUpdates.agencyRole = updates.agencyRole || '';
        }
        if (typeof updates.agencyStatus === 'string') fsUpdates.agencyStatus = updates.agencyStatus;
        if (typeof updates.crewName === 'string') fsUpdates.crewName = updates.crewName;
        if (typeof updates.crewBadge === 'string') fsUpdates.crewBadge = updates.crewBadge;
        if (Array.isArray(updates.savedVideoIds)) fsUpdates.savedVideoIds = updates.savedVideoIds.slice(0, 200);
        if (Array.isArray(updates.likedVideoIds)) fsUpdates.likedVideoIds = updates.likedVideoIds.slice(0, 200);

        if (Object.keys(fsUpdates).length > 0) {
          await updateDoc(doc(db, 'users', targetUid), fsUpdates);
        }
      } catch (err) {
        console.warn('[Firestore] Profile update sync notice:', err);
      }
    }

    try {
      const apiPayload: Record<string, any> = { ...merged };
      if (typeof apiPayload.avatar === 'string' && apiPayload.avatar.length > 1500) {
        delete apiPayload.avatar;
      }
      if (typeof apiPayload.coverImage === 'string' && apiPayload.coverImage.length > 1500) {
        delete apiPayload.coverImage;
      }
      const res = await apiFetch(`/api/users/${encodeURIComponent(targetUid)}`, {
        method: 'PUT',
        body: JSON.stringify(apiPayload),
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
   * Fetch real Followers List from Cloud Firestore `follows` collection + Express backend
   */
  async getFollowers(userId: string): Promise<FollowListMember[]> {
    const followingSet = this.getStoredFollowingIds();
    const mapById = new Map<string, FollowListMember>();

    if (auth.currentUser && userId) {
      try {
        const q = query(collection(db, 'follows'), where('followingId', '==', userId));
        const snap = await getDocs(q);
        const followerIds = snap.docs
          .map((d) => String(d.data().followerId || ''))
          .filter(Boolean);

        const profiles = await Promise.all(
          followerIds.slice(0, 50).map(async (fid) => {
            try {
              const uSnap = await getDoc(doc(db, 'users', fid));
              if (!uSnap.exists()) return null;
              const u = mapFirestoreUserToProfile(uSnap.data() as FirestoreUserData, null);
              return {
                id: u.id,
                name: u.name,
                username: u.username || `@${u.displayId}`,
                avatar: u.avatar,
                bio: u.bio || '',
                level: u.level,
                isVIP: u.isVIP,
                isFollowing: followingSet.has(u.id),
              } as FollowListMember;
            } catch {
              return null;
            }
          })
        );

        for (const p of profiles) {
          if (p) mapById.set(p.id, p);
        }
      } catch {
        // Continue to API
      }
    }

    try {
      const res = await apiFetch(`/api/users/${encodeURIComponent(userId)}/followers`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data.followers)) {
          for (const f of data.followers as FollowListMember[]) {
            if (!mapById.has(f.id)) {
              mapById.set(f.id, {
                ...f,
                isFollowing: followingSet.has(f.id) || !!f.isFollowing,
              });
            }
          }
        }
      }
    } catch {
      // Backend unavailable
    }

    return Array.from(mapById.values());
  }

  /**
   * Fetch real Following List from Cloud Firestore `follows` collection + Express backend
   */
  async getFollowing(userId: string): Promise<FollowListMember[]> {
    const mapById = new Map<string, FollowListMember>();

    if (auth.currentUser && userId) {
      try {
        const q = query(collection(db, 'follows'), where('followerId', '==', userId));
        const snap = await getDocs(q);
        const followingIds = snap.docs
          .map((d) => String(d.data().followingId || ''))
          .filter(Boolean);

        const profiles = await Promise.all(
          followingIds.slice(0, 50).map(async (tid) => {
            try {
              const uSnap = await getDoc(doc(db, 'users', tid));
              if (!uSnap.exists()) return null;
              const u = mapFirestoreUserToProfile(uSnap.data() as FirestoreUserData, null);
              return {
                id: u.id,
                name: u.name,
                username: u.username || `@${u.displayId}`,
                avatar: u.avatar,
                bio: u.bio || '',
                level: u.level,
                isVIP: u.isVIP,
                isFollowing: true,
              } as FollowListMember;
            } catch {
              return null;
            }
          })
        );

        for (const p of profiles) {
          if (p) mapById.set(p.id, p);
        }
      } catch {
        // Continue to API
      }
    }

    try {
      const res = await apiFetch(`/api/users/${encodeURIComponent(userId)}/following`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data.following)) {
          for (const f of data.following as FollowListMember[]) {
            if (!mapById.has(f.id)) {
              mapById.set(f.id, { ...f, isFollowing: true });
            }
          }
        }
      }
    } catch {
      // Backend unavailable
    }

    return Array.from(mapById.values());
  }

  /**
   * Follow / Unfollow User synced across Firestore follows graph + backend API
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
      await syncFirestoreFollow(currentUserId, targetUserId, willFollow).catch(() => {});
      updateDoc(doc(db, 'users', currentUserId), {
        followingCount: followingSet.size,
      }).catch(() => {});
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
          myFollowingCount: typeof data.myFollowingCount === 'number' ? data.myFollowingCount : followingSet.size,
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

  /**
   * Load all 5 profile content buckets (Public, Private, Saved, Posts, Liked)
   * Merges Firestore `posts`, passed `feedVideos`, and local custom uploads.
   * Strictly enforces owner-only authorization on `privateVideos` and `savedVideos`.
   */
  async getUserContentTabs(
    profileOwnerId: string,
    viewerId: string,
    feedVideos: VideoItem[] = [],
    ownerSavedIds: string[] = [],
    ownerLikedIds: string[] = []
  ): Promise<{
    publicVideos: VideoItem[];
    privateVideos: VideoItem[];
    savedVideos: VideoItem[];
    posts: VideoItem[];
    likedVideos: VideoItem[];
    totalLikesReceived: number;
  }> {
    const isOwner = Boolean(profileOwnerId && viewerId && profileOwnerId === viewerId);

    const videoMap = new Map<string, VideoItem>();
    for (const v of this.getStoredVideos()) {
      if (v && v.id) videoMap.set(v.id, v);
    }
    for (const v of feedVideos) {
      if (v && v.id) videoMap.set(v.id, { ...videoMap.get(v.id), ...v });
    }

    if (auth.currentUser) {
      try {
        const fsVideos = await fetchFirestoreVideos();
        for (const v of fsVideos) {
          if (v && v.id) {
            const normalizedPrivacy = v.isPrivate ? 'private' : (v.privacy || 'public');
            videoMap.set(v.id, {
              ...videoMap.get(v.id),
              ...v,
              privacy: normalizedPrivacy,
              isPrivate: normalizedPrivacy === 'private',
            });
          }
        }
      } catch {
        // Use merged local + feed videos
      }
    }

    const allVideos = Array.from(videoMap.values());
    const likedIds = new Set<string>([
      ...Array.from(this.getStoredLikedVideoIds()),
      ...(isOwner ? ownerLikedIds : []),
    ]);
    const savedIds = new Set<string>([
      ...Array.from(this.getStoredSavedVideoIds()),
      ...(isOwner ? ownerSavedIds : []),
    ]);

    const decorate = (v: VideoItem): VideoItem => {
      const isPriv = v.privacy === 'private' || v.isPrivate === true;
      return {
        ...v,
        privacy: isPriv ? 'private' : (v.privacy || 'public'),
        isPrivate: isPriv,
        viewsCount: v.viewsCount || 0,
        likesCount: v.likesCount || 0,
        commentsCount: v.commentsCount || 0,
        isLiked: likedIds.has(v.id) || Boolean(v.isLiked),
        isSaved: savedIds.has(v.id) || Boolean(v.isSaved),
      };
    };

    const isItemPrivate = (v: VideoItem) => v.privacy === 'private' || v.isPrivate === true;
    const isOwnedByProfile = (v: VideoItem) => v.creator?.id === profileOwnerId;

    const publicVideos = allVideos
      .filter((v) => isOwnedByProfile(v) && !isItemPrivate(v) && v.contentType !== 'post')
      .map(decorate);

    // STRICT AUTHORIZATION: Private content is NEVER exposed to non-owners
    const privateVideos = isOwner
      ? allVideos.filter((v) => isOwnedByProfile(v) && isItemPrivate(v)).map(decorate)
      : [];

    const posts = allVideos
      .filter((v) => isOwnedByProfile(v) && (!isItemPrivate(v) || isOwner))
      .map(decorate);

    const savedVideos = isOwner
      ? allVideos
          .filter((v) => savedIds.has(v.id) && (!isItemPrivate(v) || isOwnedByProfile(v)))
          .map(decorate)
      : [];

    const likedVideos = allVideos
      .filter((v) => likedIds.has(v.id) && !isItemPrivate(v))
      .map(decorate);

    const totalLikesReceived = allVideos
      .filter((v) => isOwnedByProfile(v))
      .reduce((sum, v) => sum + (v.likesCount || 0), 0);

    return {
      publicVideos,
      privateVideos,
      savedVideos,
      posts,
      likedVideos,
      totalLikesReceived,
    };
  }

  async getUserVideoTabs(profileOwnerId: string, viewerId: string) {
    const res = await this.getUserContentTabs(profileOwnerId, viewerId);
    return {
      publicVideos: res.publicVideos,
      privateVideos: res.privateVideos,
      likedVideos: res.likedVideos,
      savedVideos: res.savedVideos,
    };
  }

  async toggleLikeVideo(videoId: string, userId: string): Promise<{ isLiked: boolean; newCount: number }> {
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
    let newCount = willLike ? 1 : 0;
    const updated = videos.map((v) => {
      if (v.id === videoId) {
        newCount = Math.max(0, (v.likesCount || 0) + (willLike ? 1 : -1));
        return {
          ...v,
          likesCount: newCount,
          isLiked: willLike,
        };
      }
      return v;
    });
    this.saveStoredVideos(updated);

    if (auth.currentUser && auth.currentUser.uid === userId) {
      toggleFirestoreLikeVideo(videoId, willLike).catch(() => {});
      updateDoc(doc(db, 'users', userId), {
        likedVideoIds: Array.from(likedSet).slice(0, 200),
      }).catch(() => {});
    }

    return { isLiked: willLike, newCount };
  }

  async toggleSaveVideo(videoId: string, userId?: string): Promise<boolean> {
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

    const uid = userId || auth.currentUser?.uid;
    if (auth.currentUser && uid && auth.currentUser.uid === uid) {
      updateDoc(doc(db, 'users', uid), {
        savedVideoIds: Array.from(savedSet).slice(0, 200),
      }).catch(() => {});
    }

    return willSave;
  }

  async toggleVideoPrivacy(videoId: string, userId: string, nextPrivacy: 'public' | 'private'): Promise<boolean> {
    const isPriv = nextPrivacy === 'private';
    const videos = this.getStoredVideos().map((v) =>
      v.id === videoId ? { ...v, privacy: nextPrivacy, isPrivate: isPriv } : v
    );
    this.saveStoredVideos(videos);

    if (auth.currentUser && auth.currentUser.uid === userId) {
      updateDoc(doc(db, 'posts', videoId), { isPrivate: isPriv }).catch(() => {});
    }

    try {
      await apiFetch(`/api/videos/${encodeURIComponent(videoId)}/privacy`, {
        method: 'PATCH',
        body: JSON.stringify({ privacy: nextPrivacy, userId }),
      });
    } catch {
      // Non-blocking
    }

    return true;
  }

  async deleteUserVideo(videoId: string, userId: string): Promise<void> {
    const filtered = this.getStoredVideos().filter((v) => v.id !== videoId);
    this.saveStoredVideos(filtered);

    if (auth.currentUser && auth.currentUser.uid === userId) {
      deleteDoc(doc(db, 'posts', videoId)).catch(() => {});
    }

    try {
      await apiFetch(`/api/videos/${encodeURIComponent(videoId)}?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
    } catch {
      // Non-blocking
    }
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
    return `${origin}/?profile=${encodeURIComponent(user.id)}&u=${encodeURIComponent(cleanUsername)}`;
  }
}

export const profileService = new ProfileService();
