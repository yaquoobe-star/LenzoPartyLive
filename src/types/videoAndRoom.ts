import { UserProfile, GiftItem } from './index';

export interface VideoItem {
  id: string;
  creator: UserProfile;
  videoUrl: string; // Video stream / MP4 or visual stream
  thumbnailUrl: string;
  description: string;
  musicTitle?: string;
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  repostsCount: number;
  viewsCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  isReposted?: boolean;
  createdAt: string;
  privacy?: 'public' | 'friends' | 'private';
}

export interface VideoComment {
  id: string;
  user: UserProfile;
  text: string;
  timestamp: string;
  likes: number;
}

export interface RoomSeatRequest {
  id: string;
  roomId: string;
  user: UserProfile;
  requestedSeatIndex?: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  createdAt: number;
  expiresAt: number;
}

export interface RoomSeatState {
  index: number;
  user: UserProfile | null;
  isLocked: boolean;
  isMuted: boolean;
  isHost: boolean;
}
