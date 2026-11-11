export type ScreenType = 
  | 'splash'          // 01 Splash Screen
  | 'login'           // 02 Login Screen
  | 'signup'          // 03 Sign Up Screen
  | 'home'            // 04 Home Screen
  | 'live_active'     // 05 Live Screen
  | 'host_profile'    // 06 Live Host Profile
  | 'party_8'         // 07 Party Room (8 Seats)
  | 'party_16'        // 08 Party Room (16 Seats)
  | 'audio_room'      // Party Room alias
  | 'rooms'           // 09 Rooms Discovery
  | 'party'           // Rooms Discovery alias
  | 'create_room'     // 10 Create Room
  | 'room_settings'   // 11 Room Settings
  | 'profile'         // 12 User Profile
  | 'edit_profile'    // 13 Edit Profile
  | 'match_request'   // 14 Match Request
  | 'battle'          // 15 Battle Screen
  | 'inbox'           // 16 Inbox
  | 'messages'        // Inbox alias
  | 'notifications'   // 17 Notifications
  | 'wallet'          // 18 Wallet
  | 'gift_collection' // 19 Gift Collection
  | 'rankings'        // 20 Ranking
  | 'live_rooms'      // 21 Live Rooms
  | 'my_rooms'        // 22 My Rooms
  | 'settings'        // 23 Settings
  | 'help_support'    // 24 Help and Support
  | 'about'           // 25 About App
  | 'create_live'
  | 'auth'
  | 'search'
  | 'videos'
  | 'upload_video';

export type PlatformViewMode = 'responsive' | 'mobile_ios' | 'mobile_android' | 'desktop';

export type LevelTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'emperor';

export interface UserProfile {
  id: string;
  displayId: string;
  name: string;
  username?: string; // e.g. @queensara
  avatar: string;
  coverImage?: string;
  bio: string;
  level: number;
  currentExp?: number;
  nextLevelExp?: number;
  totalGiftsReceived?: number;
  totalGiftsValue?: number; // in coins
  vipLevel: number;
  isVIP: boolean;
  fansCount: string;
  followersCount?: number;
  followingCount: number;
  likesCount: string;
  totalLikes?: number;
  coins: number;
  diamonds: number;
  gender?: 'female' | 'male' | 'other' | 'unspecified';
  country?: string;
  birthday?: string;
  isFollowing?: boolean;
}



export interface LiveStream {
  id: string;
  title: string;
  category: string;
  host: UserProfile;
  coverImage: string;
  viewerCount: string;
  numericViewers: number;
  isLive: boolean;
  tags: string[];
  guests: UserProfile[];
  likesCount: number;
  streamUrl?: string;
}

export interface PartyRoom {
  id: string;
  title: string;
  category: 'Party' | 'Music' | 'Game' | 'Chat' | 'Friendship' | 'Trending' | 'Love' | 'Dance';
  host: UserProfile;
  coverImage: string;
  iconType: 'mic' | 'game' | 'heart' | 'chat' | 'lips' | 'music' | 'dance';
  participantCount: string;
  numericParticipants: number;
  isAudioRoom: boolean;
  maxSeats: number;
  roomType: 'public' | 'private' | 'secret';
  announcement?: string;
  seats: (UserProfile | null)[];
  displayId?: string;
  password?: string;
  isLocked?: boolean;
  allowJoin?: boolean;
  seatRequests?: SeatRequest[];
  isOwnerPresent?: boolean;
}

export interface SeatRequest {
  id: string;
  user: UserProfile;
  seatIndex: number;
  requestedAt: number;
}

export interface SeatInvitation {
  id: string;
  fromHost: UserProfile;
  toUser: UserProfile;
  seatIndex: number;
  sentAt: number;
}

export interface GiftItem {
  id: string;
  name: string;
  category: 'Popular' | 'Animated' | 'Luxury' | 'Special' | 'Exclusive' | 'Love';
  coins: number;
  icon: string;
  imageColor: string;
  animationType: 'pop' | 'glow' | 'float' | 'blast';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderVip?: number;
  isHost?: boolean;
  isPinned?: boolean;
  text: string;
  timestamp: string;
  isSystem?: boolean;
  gift?: {
    name: string;
    icon: string;
    quantity: number;
  };
}

export interface Conversation {
  id: string;
  user: UserProfile;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
}

export interface RankingEntry {
  rank: number;
  user: UserProfile;
  score: string;
  numericScore: number;
  badge?: 'gold' | 'silver' | 'bronze';
  trend?: 'up' | 'down' | 'same';
}

export interface RechargePackage {
  id: string;
  coins: number;
  bonusCoins?: number;
  price: string;
  isPopular?: boolean;
  discountBadge?: string;
}

export interface Transaction {
  id: string;
  type: 'recharge' | 'gift_sent' | 'gift_received' | 'vip_upgrade';
  description: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending';
}

export interface NotificationItem {
  id: string;
  type: 'all' | 'followers' | 'messages' | 'gifts' | 'rooms' | 'system';
  title: string;
  message: string;
  avatar?: string;
  timestamp: string;
  isRead: boolean;
}

export * from './pk';
export * from './videoAndRoom';


