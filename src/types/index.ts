export type ScreenType = 
  | 'splash'          // 01 Splash Screen
  | 'login'           // 02 Login Screen
  | 'signup'          // 03 Sign Up Screen
  | 'home'            // 04 Home Screen
  | 'store'           // 05 Store Screen (NEW)
  | 'live_active'     // 06 Live Screen
  | 'host_profile'    // 07 Live Host Profile
  | 'party_8'         // 08 Party Room (8 Seats)
  | 'party_16'        // 09 Party Room (16 Seats)
  | 'audio_room'      // Party Room alias
  | 'rooms'           // 10 Rooms Discovery
  | 'party'           // Rooms Discovery alias
  | 'create_room'     // 11 Create Room
  | 'room_settings'   // 12 Room Settings
  | 'profile'         // 13 User Profile
  | 'edit_profile'    // 14 Edit Profile
  | 'match_request'   // 15 Match Request
  | 'battle'          // 16 Battle Screen
  | 'inbox'           // 17 Inbox
  | 'messages'        // Inbox alias (NEW WhatsApp-style Chat)
  | 'chat'            // Chat alias
  | 'notifications'   // 18 Notifications
  | 'wallet'          // 19 Wallet
  | 'gift_collection' // 20 Gift Collection
  | 'rankings'        // 21 Ranking
  | 'live_rooms'      // 22 Live Rooms
  | 'my_rooms'        // 23 My Rooms
  | 'settings'        // 24 Settings
  | 'help_support'    // 25 Help and Support
  | 'about'           // 26 About App
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
  equippedVipFrame?: number;
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

export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface MessageReplyPreview {
  id: string;
  senderName: string;
  text: string;
  type?: 'text' | 'voice' | 'image' | 'video' | 'file' | 'room_invite' | 'profile_share' | 'post_share';
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
  createdAtMillis?: number;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  type?: 'text' | 'voice' | 'image' | 'video' | 'file' | 'room_invite' | 'profile_share' | 'post_share';
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: string;
  voiceDuration?: number; // in seconds
  voiceWaveform?: number[];
  replyTo?: MessageReplyPreview;
  reactions?: MessageReaction[];
  mentions?: string[];
  isEdited?: boolean;
  isStarred?: boolean;
  isForwarded?: boolean;
  deletedForEveryone?: boolean;
  deletedForUsers?: string[];
  isSystem?: boolean;
  roomInvite?: {
    roomId: string;
    title: string;
    category: string;
    hostName: string;
    hostAvatar: string;
  };
  gift?: {
    name: string;
    icon: string;
    quantity: number;
  };
}

export interface ChatGroup {
  id: string;
  name: string;
  avatar: string;
  description: string;
  creatorId: string;
  adminIds: string[];
  moderatorIds: string[];
  memberIds: string[];
  membersCount: number;
  privacy: 'public' | 'private';
  onlyAdminsCanMessage: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

export interface Conversation {
  id: string;
  type?: 'direct' | 'group';
  user: UserProfile;
  group?: ChatGroup;
  lastMessage: string;
  lastMessageType?: 'text' | 'voice' | 'image' | 'video' | 'file' | 'room_invite';
  lastMessageStatus?: 'sending' | 'sent' | 'delivered' | 'read';
  lastMessageSenderId?: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  isRequest?: boolean; // Message request from non-friend
  isBlocked?: boolean;
}

export interface StoreProduct {
  id: string;
  name: string;
  category: 'coins' | 'vip' | 'entrance' | 'gifts' | 'frames' | 'gear';
  price: number;
  currency: 'coins' | 'diamonds' | 'usd';
  priceDisplay: string;
  image: string;
  badge?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  description: string;
  benefits: string[];
  isPopular?: boolean;
  previewEffect?: string;
}

export interface CartItem {
  product: StoreProduct;
  quantity: number;
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
export * from './wallet';
export * from './levelAndVip';


