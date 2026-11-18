import { 
  UserProfile, 
  LiveStream, 
  PartyRoom, 
  GiftItem, 
  Conversation, 
  RankingEntry, 
  RechargePackage, 
  Transaction,
  NotificationItem,
  ChatMessage
} from '../types';

export const CURRENT_USER: UserProfile = {
  id: 'guest',
  displayId: '',
  name: 'Guest User',
  username: '',
  avatar: '',
  coverImage: '',
  bio: '',
  level: 1,
  currentExp: 0,
  nextLevelExp: 500,
  totalGiftsReceived: 0,
  totalGiftsValue: 0,
  vipLevel: 0,
  isVIP: false,
  fansCount: '0',
  followersCount: 0,
  followingCount: 0,
  likesCount: '0',
  totalLikes: 0,
  coins: 0,
  diamonds: 0,
  gender: 'unspecified',
  country: '',
  birthday: '',
  isFollowing: false,
};

export const MOCK_USERS: Record<string, UserProfile> = {};

export const MOCK_LIVE_STREAMS: LiveStream[] = [];

export const MOCK_PARTY_ROOMS: PartyRoom[] = [];

export const MOCK_GIFTS: GiftItem[] = [
  {
    id: 'gift_rose',
    name: 'Rose',
    category: 'Popular',
    coins: 5,
    icon: '🌹',
    imageColor: 'from-rose-500 to-red-600',
    animationType: 'pop',
  },
  {
    id: 'gift_heart',
    name: 'Heart',
    category: 'Popular',
    coins: 10,
    icon: '💖',
    imageColor: 'from-pink-500 to-rose-600',
    animationType: 'pop',
  },
  {
    id: 'gift_crown',
    name: 'Crown',
    category: 'Popular',
    coins: 20,
    icon: '👑',
    imageColor: 'from-amber-400 to-yellow-600',
    animationType: 'glow',
  },
  {
    id: 'gift_teddy',
    name: 'Teddy Bear',
    category: 'Animated',
    coins: 30,
    icon: '🧸',
    imageColor: 'from-amber-600 to-orange-700',
    animationType: 'pop',
  },
  {
    id: 'gift_yacht',
    name: 'Yacht',
    category: 'Animated',
    coins: 50,
    icon: '🛥️',
    imageColor: 'from-sky-400 to-blue-600',
    animationType: 'float',
  },
  {
    id: 'gift_diamond',
    name: 'Diamond',
    category: 'Animated',
    coins: 100,
    icon: '💎',
    imageColor: 'from-cyan-400 to-blue-600',
    animationType: 'glow',
  },
  {
    id: 'gift_rocket',
    name: 'Rocket',
    category: 'Luxury',
    coins: 200,
    icon: '🚀',
    imageColor: 'from-indigo-500 to-purple-600',
    animationType: 'float',
  },
  {
    id: 'gift_castle',
    name: 'Castle',
    category: 'Luxury',
    coins: 500,
    icon: '🏰',
    imageColor: 'from-purple-400 to-pink-600',
    animationType: 'glow',
  },
  {
    id: 'gift_car',
    name: 'Sports Car',
    category: 'Luxury',
    coins: 1000,
    icon: '🏎️',
    imageColor: 'from-red-500 to-rose-700',
    animationType: 'float',
  },
  {
    id: 'gift_dragon',
    name: 'Dragon',
    category: 'Special',
    coins: 10000,
    icon: '🐉',
    imageColor: 'from-amber-500 to-orange-700',
    animationType: 'blast',
  },
  {
    id: 'gift_love',
    name: 'Love',
    category: 'Love',
    coins: 20000,
    icon: '💖',
    imageColor: 'from-pink-500 to-fuchsia-700',
    animationType: 'blast',
  },
  {
    id: 'gift_fireworks',
    name: 'Fireworks',
    category: 'Special',
    coins: 50000,
    icon: '🎆',
    imageColor: 'from-fuchsia-500 via-purple-500 to-amber-400',
    animationType: 'blast',
  },
  {
    id: 'gift_galaxy',
    name: 'Galaxy',
    category: 'Exclusive',
    coins: 80000,
    icon: '🌌',
    imageColor: 'from-indigo-500 via-purple-600 to-pink-500',
    animationType: 'blast',
  },
  {
    id: 'gift_sports_car',
    name: 'Supercar',
    category: 'Exclusive',
    coins: 100000,
    icon: '🚀',
    imageColor: 'from-yellow-400 via-red-500 to-pink-600',
    animationType: 'blast',
  }
];

export const MOCK_CONVERSATIONS: Conversation[] = [];

export const MOCK_STAR_RANKINGS: RankingEntry[] = [];

export const MOCK_CONTRIBUTION_RANKINGS: RankingEntry[] = [];

export const MOCK_WEALTH_RANKINGS: RankingEntry[] = [];

export const MOCK_RECHARGE_PACKAGES: RechargePackage[] = [
  { id: 'pack_1', coins: 100, price: '$0.99' },
  { id: 'pack_2', coins: 550, bonusCoins: 50, price: '$4.99', isPopular: true, discountBadge: '+10% Bonus' },
  { id: 'pack_3', coins: 1200, bonusCoins: 150, price: '$9.99', discountBadge: '+15% Bonus' },
  { id: 'pack_4', coins: 3800, bonusCoins: 600, price: '$29.99', discountBadge: '+20% Bonus' },
  { id: 'pack_5', coins: 13000, bonusCoins: 2500, price: '$99.99', discountBadge: '+25% Extra' },
  { id: 'pack_6', coins: 70000, bonusCoins: 18000, price: '$499.99', discountBadge: 'VIP Elite' }
];

export const MOCK_TRANSACTIONS: Transaction[] = [];

export const MOCK_NOTIFICATIONS: NotificationItem[] = [];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];
