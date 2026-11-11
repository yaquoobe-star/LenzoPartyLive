import { UserProfile, VideoItem } from '../types';
import { CURRENT_USER, MOCK_USERS } from '../data/mockData';
import { INITIAL_VIDEOS } from '../data/videoData';

const LOCAL_STORAGE_PROFILE_KEY = 'lonzo_party_user_profile_v2';
const LOCAL_STORAGE_FOLLOWING_KEY = 'lonzo_party_following_v1';
const LOCAL_STORAGE_LIKED_VIDEOS_KEY = 'lonzo_party_liked_videos_v1';
const LOCAL_STORAGE_SAVED_VIDEOS_KEY = 'lonzo_party_saved_videos_v1';
const LOCAL_STORAGE_CUSTOM_VIDEOS_KEY = 'lonzo_party_custom_videos_v1';

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

  // Initialize cached followed IDs from storage
  private getStoredFollowingIds(): Set<string> {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_FOLLOWING_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch (e) {
      console.warn('Failed to load following set:', e);
    }
    // Default following seed
    return new Set(['user_sara', 'user_rohan', 'user_king']);
  }

  private saveStoredFollowingIds(ids: Set<string>): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_FOLLOWING_KEY, JSON.stringify(Array.from(ids)));
    } catch (e) {
      console.warn('Failed to save following set:', e);
    }
  }

  // Liked Video IDs
  private getStoredLikedVideoIds(): Set<string> {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_LIKED_VIDEOS_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch (e) {
      console.warn('Failed to load liked videos:', e);
    }
    return new Set(['vid_user_2', 'vid_1']);
  }

  private saveStoredLikedVideoIds(ids: Set<string>): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_LIKED_VIDEOS_KEY, JSON.stringify(Array.from(ids)));
    } catch (e) {
      console.warn('Failed to save liked videos:', e);
    }
  }

  // Saved / Bookmarked Video IDs
  private getStoredSavedVideoIds(): Set<string> {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SAVED_VIDEOS_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch (e) {
      console.warn('Failed to load saved videos:', e);
    }
    return new Set(['vid_user_1', 'vid_2']);
  }

  private saveStoredSavedVideoIds(ids: Set<string>): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_SAVED_VIDEOS_KEY, JSON.stringify(Array.from(ids)));
    } catch (e) {
      console.warn('Failed to save saved videos:', e);
    }
  }

  // Custom User Uploaded Videos (persisted)
  getStoredVideos(): VideoItem[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_VIDEOS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as VideoItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load stored videos:', e);
    }

    // Seed default set including 1 private video for testing Tab 2
    const defaultList: VideoItem[] = [
      ...INITIAL_VIDEOS,
      {
        id: 'vid_user_private_1',
        creator: CURRENT_USER,
        videoUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80',
        description: '🔒 Exclusive Behind The Scenes DJ Rehearsal (Private)',
        musicTitle: 'Private Studio Jam 2026',
        hashtags: ['#bts', '#rehearsal', '#private'],
        likesCount: 380,
        commentsCount: 24,
        sharesCount: 0,
        repostsCount: 0,
        viewsCount: 512,
        isLiked: false,
        isSaved: true,
        createdAt: '4 days ago',
        privacy: 'private',
      },
    ];
    this.saveStoredVideos(defaultList);
    return defaultList;
  }

  saveStoredVideos(videos: VideoItem[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_CUSTOM_VIDEOS_KEY, JSON.stringify(videos));
    } catch (e) {
      console.warn('Failed to save videos:', e);
    }
  }

  /**
   * Fetch user profile from backend API or local cache
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          return data.user;
        }
      }
    } catch (e) {
      // Backend unreachable or offline
    }

    // Fallback to local profile or mock user
    if (userId === this.currentUserId || userId === CURRENT_USER.id) {
      const stored = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      if (stored) {
        return { ...CURRENT_USER, ...JSON.parse(stored) };
      }
      return CURRENT_USER;
    }

    // Lookup other mock users
    const found = Object.values(MOCK_USERS).find(
      (u) => u.id === userId || u.displayId === userId || u.username === userId || u.username === `@${userId}`
    );
    if (found) {
      const followingSet = this.getStoredFollowingIds();
      return {
        ...found,
        isFollowing: followingSet.has(found.id),
      };
    }

    return {
      ...CURRENT_USER,
      id: userId,
      name: 'Party Creator',
      username: `@user_${userId.slice(0, 6)}`,
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
      const res = await fetch(`/api/users/check_username?username=${encodeURIComponent(clean)}&userId=${encodeURIComponent(currentUserId)}`);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      // offline fallback
    }

    // Check existing mock users
    const match = Object.values(MOCK_USERS).find(
      (u) => u.id !== currentUserId && u.username?.toLowerCase().replace(/^@/, '') === clean
    );
    if (match) {
      return { available: false, message: 'This username is already taken. Please choose another.' };
    }

    return { available: true };
  }

  /**
   * Update profile with database validation & persistence
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    // 1. Send to backend if available
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(data.user));
          return data.user;
        }
      }
    } catch (e) {
      console.warn('Backend update failed, persisting locally:', e);
    }

    // 2. Persist locally
    const current = await this.getUserProfile(userId);
    const updated: UserProfile = {
      ...current,
      ...updates,
      id: current.id, // Protected
      displayId: current.displayId, // Protected
    };

    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(updated));
    return updated;
  }

  /**
   * Get Followers List for user
   */
  async getFollowers(userId: string): Promise<FollowListMember[]> {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/followers`);
      if (res.ok) {
        const data = await res.json();
        if (data.followers) return data.followers;
      }
    } catch (e) {
      // offline fallback
    }

    const followingSet = this.getStoredFollowingIds();
    // Default active community followers
    return [
      {
        id: 'user_sara',
        name: 'Sara Khan 🌸',
        username: '@sarakhan',
        avatar: MOCK_USERS.sara.avatar,
        bio: 'Singing, dancing & late night vibes! 🎤',
        level: 48,
        isVIP: true,
        isFollowing: followingSet.has('user_sara'),
      },
      {
        id: 'user_rohan',
        name: 'Rohan Kumar 🔥',
        username: '@rohan_kumar',
        avatar: MOCK_USERS.rohan.avatar,
        bio: 'DJ & EDM Beatmaker. Party room host.',
        level: 52,
        isVIP: true,
        isFollowing: followingSet.has('user_rohan'),
      },
      {
        id: 'user_queen_girl',
        name: 'Queen Star 👑',
        username: '@queenstar',
        avatar: MOCK_USERS.queen_girl.avatar,
        bio: 'Top gifter on Lonzo Party Live! 💖',
        level: 65,
        isVIP: true,
        isFollowing: followingSet.has('user_queen_girl'),
      },
      {
        id: 'user_pink_girl',
        name: 'Pink Rose 🌹',
        username: '@pinkrose',
        avatar: MOCK_USERS.pink_girl.avatar,
        bio: 'Guitar acoustics & chill conversations.',
        level: 39,
        isVIP: false,
        isFollowing: followingSet.has('user_pink_girl'),
      },
      {
        id: 'user_sweetie',
        name: 'Sweetie Girl ✨',
        username: '@sweetie',
        avatar: MOCK_USERS.sweetie.avatar,
        bio: 'Daily life & party moments!',
        level: 35,
        isVIP: false,
        isFollowing: followingSet.has('user_sweetie'),
      },
    ];
  }

  /**
   * Get Following List for user
   */
  async getFollowing(userId: string): Promise<FollowListMember[]> {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/following`);
      if (res.ok) {
        const data = await res.json();
        if (data.following) return data.following;
      }
    } catch (e) {
      // offline fallback
    }

    const followingSet = this.getStoredFollowingIds();
    const allUsers = Object.values(MOCK_USERS);
    const result: FollowListMember[] = [];

    allUsers.forEach((u) => {
      if (followingSet.has(u.id)) {
        result.push({
          id: u.id,
          name: u.name,
          username: u.username || `@${u.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          avatar: u.avatar,
          bio: u.bio,
          level: u.level,
          isVIP: u.isVIP,
          isFollowing: true,
        });
      }
    });

    return result;
  }

  /**
   * Follow / Unfollow User with atomic count update & self-follow prevention
   */
  async toggleFollow(
    targetUserId: string,
    currentUserId: string
  ): Promise<{ isFollowing: boolean; targetFollowersCount: number; myFollowingCount: number }> {
    if (targetUserId === currentUserId) {
      throw new Error('You cannot follow yourself.');
    }

    try {
      const followingSet = this.getStoredFollowingIds();
      const isCurrentlyFollowing = followingSet.has(targetUserId);
      const action = isCurrentlyFollowing ? 'unfollow' : 'follow';

      const res = await fetch(`/api/users/${encodeURIComponent(targetUserId)}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId: currentUserId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (isCurrentlyFollowing) {
          followingSet.delete(targetUserId);
        } else {
          followingSet.add(targetUserId);
        }
        this.saveStoredFollowingIds(followingSet);
        return {
          isFollowing: !isCurrentlyFollowing,
          targetFollowersCount: data.targetFollowersCount,
          myFollowingCount: followingSet.size,
        };
      }
    } catch (e) {
      // fallback
    }

    // Local Toggle Fallback
    const followingSet = this.getStoredFollowingIds();
    const isNowFollowing = !followingSet.has(targetUserId);
    if (isNowFollowing) {
      followingSet.add(targetUserId);
    } else {
      followingSet.delete(targetUserId);
    }
    this.saveStoredFollowingIds(followingSet);

    return {
      isFollowing: isNowFollowing,
      targetFollowersCount: isNowFollowing ? 12421 : 12420,
      myFollowingCount: followingSet.size,
    };
  }

  /**
   * Get 4 video tabs for profile
   * TAB 1: Public Videos
   * TAB 2: Private Videos (visible only to profile owner)
   * TAB 3: Liked Videos (videos liked by the user)
   * TAB 4: Saved Videos (videos bookmarked/saved by user)
   */
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

    // Tab 1: Public videos created by profile owner
    const publicVideos = allVideos
      .filter((v) => (v.creator.id === profileOwnerId || (profileOwnerId === CURRENT_USER.id && v.creator.id === CURRENT_USER.id)) && v.privacy !== 'private')
      .map((v) => ({
        ...v,
        viewsCount: v.viewsCount || Math.max(120, v.likesCount * 3 + 450),
        isLiked: likedIds.has(v.id),
        isSaved: savedIds.has(v.id),
      }));

    // Tab 2: Private videos (enforce ownership security: ONLY owner can view!)
    const privateVideos = isOwner
      ? allVideos
          .filter((v) => (v.creator.id === profileOwnerId || (profileOwnerId === CURRENT_USER.id && v.creator.id === CURRENT_USER.id)) && v.privacy === 'private')
          .map((v) => ({
            ...v,
            viewsCount: v.viewsCount || 520,
            isLiked: likedIds.has(v.id),
            isSaved: savedIds.has(v.id),
          }))
      : [];

    // Tab 3: Liked videos
    const likedVideos = allVideos
      .filter((v) => likedIds.has(v.id))
      .map((v) => ({
        ...v,
        viewsCount: v.viewsCount || Math.max(150, v.likesCount * 3 + 200),
        isLiked: true,
        isSaved: savedIds.has(v.id),
      }));

    // Tab 4: Saved videos (private to owner)
    const savedVideos = isOwner
      ? allVideos
          .filter((v) => savedIds.has(v.id))
          .map((v) => ({
            ...v,
            viewsCount: v.viewsCount || Math.max(150, v.likesCount * 2 + 100),
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

  /**
   * Toggle Like on a video
   */
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

    // Update stored video like count
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

  /**
   * Toggle Save / Bookmark on a video
   */
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

    // Update stored video isSaved flag
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

  /**
   * Calculate Total Likes across all published videos of a creator
   */
  calculateTotalLikes(userId: string): number {
    const videos = this.getStoredVideos();
    const userVids = videos.filter(
      (v) => v.creator.id === userId || (userId === CURRENT_USER.id && v.creator.id === CURRENT_USER.id)
    );
    return userVids.reduce((sum, v) => sum + (v.likesCount || 0), 0);
  }

  /**
   * Generate clean shareable profile URL
   */
  generateShareUrl(user: UserProfile): string {
    const cleanUsername = (user.username || `@user_${user.displayId}`).replace(/^@/, '');
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lonzoparty.app';
    return `${origin}/u/${encodeURIComponent(cleanUsername)}`;
  }
}

export const profileService = new ProfileService();
