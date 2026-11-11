import { UserProfile, GiftItem } from './index';

export type PKMatchStatus = 
  | 'idle'
  | 'invite_pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'forfeited';

export interface PKParticipant {
  user: UserProfile;
  score: number;
  likes: number;
  giftsReceivedCount: number;
  giftsCoinValue: number;
  isHost: boolean;
  status: 'connected' | 'reconnecting' | 'disconnected';
  topContributor?: {
    user: UserProfile;
    contribution: number;
  };
}

export interface PKMatchInvitation {
  id: string;
  fromHost: UserProfile;
  toHost: UserProfile;
  createdAt: number;
  expiresAt: number; // 30s expiration
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  note?: string;
}

export interface PKGiftEvent {
  id: string;
  gift: GiftItem;
  sender: UserProfile;
  recipientId: string;
  quantity: number;
  points: number;
  timestamp: number;
}

export interface PKLikeEvent {
  id: string;
  recipientId: string;
  count: number;
  x?: number;
  y?: number;
  timestamp: number;
}

export interface PKMatchSession {
  id: string;
  host1: PKParticipant;
  host2: PKParticipant;
  status: PKMatchStatus;
  startTime: number; // authoritative unix timestamp (ms)
  durationMs: number; // default: 300,000 ms (5 mins)
  endTime: number; // authoritative unix timestamp (ms)
  remainingSeconds: number;
  winnerId?: string | 'draw';
  mvp?: {
    user: UserProfile;
    amount: number;
    recipientId: string;
  };
  scoringRules: {
    pointsPerCoin: number; // 1 point per coin default
    pointsPerLike: number; // 0 points default (likes are separate count)
  };
  recentGifts: PKGiftEvent[];
  recentLikes: PKLikeEvent[];
}

export interface PKMatchHistoryItem {
  id: string;
  matchId: string;
  date: string;
  durationSeconds: number;
  opponent: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    level: number;
  };
  myScore: number;
  opponentScore: number;
  result: 'win' | 'loss' | 'draw';
  giftsReceived: number;
  likesReceived: number;
  coinsEarned: number;
}
