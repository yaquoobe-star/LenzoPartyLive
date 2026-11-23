import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { WebSocketServer, WebSocket } from 'ws';
import agoraTokenPkg from 'agora-token';
import type WebPushType from 'web-push';
import type NodemailerType from 'nodemailer';
import {
  ALL_100_LEVELS,
  ACHIEVEMENT_BADGE_DEFINITIONS,
  ActiveFrameType,
  AchievementBadgeDefinition,
  EarnedAchievementRecord,
  LEVEL_TIER_CONFIGS,
  MAX_EQUIPPED_ACHIEVEMENT_BADGES,
  SUPER_VIP_TIER_DEFINITIONS,
  SuperVipTierDefinition,
  TOTAL_PROGRESSION_COINS_EXACT,
  UserActivityMetrics,
  VIP_TIER_DEFINITIONS,
  VipTierDefinition,
  calculateProgressionState,
  detectMilestoneUnlocks,
  evaluateAchievementBadges,
  getLevelDefinition,
  getProgressionMathAudit,
  getSuperVipTierDefinition,
  getVipTierDefinition,
} from './src/shared/progressionEngine';
import {
  OFFICIAL_ECONOMY_DEFAULTS,
  OFFICIAL_GIFT_CATALOG,
  PlatformEconomyConfig,
  calculateCoinPurchasePricePkr,
  calculateGiftSplit,
  calculateWithdrawalWaterfall,
  normalizeEconomyConfig,
  runFinancialQaAssertions,
  validateEconomySettings,
} from './src/shared/financialEngine';

const { RtcTokenBuilder, RtcRole } = (agoraTokenPkg as any).default || agoraTokenPkg;
const _require = createRequire(import.meta.url);
const webpush = _require('web-push') as typeof WebPushType;
const nodemailer = _require('nodemailer') as typeof NodemailerType;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'confident-drake-3bcxw';
const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID ||
  'ai-studio-lenzopartylive-752abd83-49ce-4746-993c-862081735425';
const ANDROID_PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME || 'com.lenzoparty.app';
const FIREBASE_ANDROID_APP_ID =
  process.env.FIREBASE_ANDROID_APP_ID || '1:238539539886:android:16b058b5f0154c3d1df43f';
const FIREBASE_WEB_APP_ID =
  process.env.FIREBASE_WEB_APP_ID || '1:238539539886:web:0832836cf24ff0781df43f';

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 3000);

server.on('error', (err) => {
  console.error('HTTP server error:', err);
});

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Graceful JSON handler for oversized payloads
app.use((err: any, _req: Request, res: Response, next: express.NextFunction) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      error: 'Uploaded file is too large. Maximum allowed size is 100 MB for videos and 5 MB for images.',
    });
  }
  next(err);
});

// CORS Middleware supporting Cloudflare frontend (lenzoparty.com / FRONTEND_URL), Railway API (api.lenzoparty.com),
// Capacitor Android WebView (https://localhost / capacitor://localhost), local dev, and Cloud Run
const configuredFrontendOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = new Set([
    'https://lenzoparty.com',
    'https://www.lenzoparty.com',
    'https://api.lenzoparty.com',
    'https://localhost',
    'http://localhost',
    'capacitor://localhost',
    'http://localhost:3000',
    'http://localhost:5173',
    ...configuredFrontendOrigins,
  ]);
  if (origin && (allowedOrigins.has(origin) || origin.endsWith('.run.app') || origin.endsWith('.pages.dev'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Platform, Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Permissions-Policy', 'camera=*, microphone=*, autoplay=*, display-capture=*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Cached Google x509 certificates for verifying Firebase Auth ID tokens without IAM credentials
let cachedFirebaseCerts: Record<string, string> = {};
let certsExpiresAt = 0;

async function getFirebasePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now < certsExpiresAt && Object.keys(cachedFirebaseCerts).length > 0) {
    return cachedFirebaseCerts;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error(`Failed to fetch Firebase public keys (${resp.status})`);
  }
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 3600 * 1000;
  cachedFirebaseCerts = (await resp.json()) as Record<string, string>;
  certsExpiresAt = now + maxAgeMs;
  return cachedFirebaseCerts;
}

async function verifyFirebaseBearerToken(authHeader?: string) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT');
  }
  let header: any;
  let payload: any;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    throw new Error('Malformed or invalid Firebase ID token');
  }

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported JWT algorithm or missing key ID');
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.aud !== FIREBASE_PROJECT_ID) {
    throw new Error('Firebase token audience mismatch');
  }
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) {
    throw new Error('Firebase token issuer mismatch');
  }
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Firebase token subject missing');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new Error('Firebase token expired');
  }

  const certs = await getFirebasePublicCerts();
  const pem = certs[header.kid];
  if (!pem) {
    throw new Error('Unknown Firebase signing key ID');
  }
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${parts[0]}.${parts[1]}`);
  verifier.end();
  const isValid = verifier.verify(pem, Buffer.from(parts[2], 'base64url'));
  if (!isValid) {
    throw new Error('Invalid Firebase token signature');
  }

  return {
    uid: payload.sub as string,
    email: (payload.email as string) || '',
    emailVerified: Boolean(payload.email_verified),
    name: (payload.name as string) || '',
    picture: (payload.picture as string) || '',
    signInProvider: payload.firebase?.sign_in_provider || 'unknown',
  };
}

interface AuthenticatedRequest extends Request {
  firebaseUser?: Awaited<ReturnType<typeof verifyFirebaseBearerToken>>;
}

// Reject invalid or expired Firebase ID tokens anywhere on /api/*
const PUBLIC_AUTH_OTP_PATHS = new Set([
  '/health',
  '/auth/email/status',
  '/auth/email/send-otp',
  '/auth/email/verify-otp',
]);

app.use('/api', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (PUBLIC_AUTH_OTP_PATHS.has(req.path)) {
    return next();
  }
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }
  try {
    const verified = await verifyFirebaseBearerToken(authHeader);
    if (!verified) {
      return res.status(401).json({
        authenticated: false,
        error: 'Malformed Authorization header. Expected Bearer <Firebase ID Token>.',
      });
    }
    req.firebaseUser = verified;
    return next();
  } catch (err: any) {
    return res.status(401).json({
      authenticated: false,
      error: err?.message || 'Invalid or expired Firebase ID token.',
    });
  }
});

// In-Memory PK Match State (Authoritative Server Store)
interface PKParticipant {
  user: any;
  score: number;
  likes: number;
  giftsReceivedCount: number;
  giftsCoinValue: number;
  isHost: boolean;
  status: 'connected' | 'reconnecting' | 'disconnected';
}

interface PKMatchInvitation {
  id: string;
  fromHost: any;
  toHost: any;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  note?: string;
}

interface PKGiftEvent {
  id: string;
  gift: any;
  sender: any;
  recipientId: string;
  quantity: number;
  points: number;
  timestamp: number;
}

interface PKLikeEvent {
  id: string;
  recipientId: string;
  count: number;
  x?: number;
  y?: number;
  timestamp: number;
}

interface PKMatchSession {
  id: string;
  host1: PKParticipant;
  host2: PKParticipant;
  status: 'idle' | 'invite_pending' | 'in_progress' | 'completed' | 'cancelled' | 'forfeited';
  startTime: number;
  durationMs: number;
  endTime: number;
  remainingSeconds: number;
  winnerId?: string | 'draw';
  mvp?: {
    user: any;
    amount: number;
    recipientId: string;
  };
  scoringRules: {
    pointsPerCoin: number;
    pointsPerLike: number;
  };
  recentGifts: PKGiftEvent[];
  recentLikes: PKLikeEvent[];
}

interface PKMatchHistoryItem {
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

const activeSessions = new Map<string, PKMatchSession>();
const pendingInvitations = new Map<string, PKMatchInvitation>();
const matchHistories = new Map<string, PKMatchHistoryItem[]>();
const processedTransactions = new Set<string>();

// Shared Helpers: Input Sanitization & Rate Limiting
function sanitizeText(raw: unknown, maxLen = 300): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function formatCompactCount(num: number): string {
  if (!Number.isFinite(num) || num <= 0) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.floor(num));
}

const AUTHORIZED_ADMIN_EMAILS = new Set([
  'saifkhokhar657@gmail.com',
  'lenzopartyofficial@gmail.com',
  'malikyaqoobniaz@gmail.com',
]);

function isVerifiedAdmin(req: AuthenticatedRequest): boolean {
  const email = req.firebaseUser?.email?.trim().toLowerCase() || '';
  return Boolean(
    req.firebaseUser &&
    AUTHORIZED_ADMIN_EMAILS.has(email) &&
    req.firebaseUser.emailVerified
  );
}

// Per-user rate limiters (comment / heart spam protection)
const lastCommentTimeMap = new Map<string, number>();
const lastHeartTimeMap = new Map<string, number>();

// Authoritative Live Streams, Party Rooms, Rankings & Metrics
interface ServerViewerRecord {
  userId: string;
  name: string;
  username?: string;
  avatar: string;
  level: number;
  vipLevel: number;
  isVIP: boolean;
  joinedAt: number;
  lastSeen: number;
  isHost?: boolean;
}

interface ServerLiveStream {
  id: string;
  title: string;
  category: string;
  host: any;
  coverImage: string;
  channelName: string;
  isLive: boolean;
  allowGuests: boolean;
  isPrivate: boolean;
  announcement?: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  giftsCoinValue: number;
  startTime: number;
  viewers: Map<string, ServerViewerRecord>;
  uniqueViewerIds: Set<string>;
  recentJoinAnnouncements: Map<string, number>;
  comments: any[];
}

interface ServerPartyRoom {
  id: string;
  displayId: string;
  title: string;
  category: string;
  host: any;
  coverImage: string;
  iconType: string;
  maxSeats: 5 | 8 | 16;
  roomType: 'public' | 'private' | 'secret';
  password?: string;
  announcement: string;
  isLocked: boolean;
  allowJoin: boolean;
  seats: (any | null)[];
  mutedSeatIndices: Set<number>;
  pendingRequests: Map<string, any>;
  participants: Map<string, ServerViewerRecord>;
  recentJoinAnnouncements: Map<string, number>;
  messages: any[];
  likesCount: number;
  giftsCoinValue: number;
  startTime: number;
  backgroundType: 'preset' | 'host_dp' | 'custom';
  backgroundId: string;
  backgroundImage: string;
}

interface BroadcasterMetricRecord {
  user: any;
  giftsCoinValue: number;
  giftsCount: number;
  totalLikes: number;
  totalComments: number;
  uniqueViewerIds: Set<string>;
  liveStreamId?: string;
  isCurrentlyLive: boolean;
  lastActiveAt: number;
}

interface ContributorMetricRecord {
  user: any;
  coinsSpent: number;
  giftsSentCount: number;
  lastActiveAt: number;
}

interface RankingConfig {
  giftValueWeight: number;
  uniqueViewerWeight: number;
  engagementWeight: number;
  activeLiveBoost: number;
  updatedAt: string;
  updatedBy?: string;
}

const liveStreamsMap = new Map<string, ServerLiveStream>();
const partyRoomsMap = new Map<string, ServerPartyRoom>();
const broadcasterMetricsMap = new Map<string, BroadcasterMetricRecord>();
const contributorMetricsMap = new Map<string, ContributorMetricRecord>();

let rankingConfig: RankingConfig = {
  giftValueWeight: 1.0,
  uniqueViewerWeight: 25,
  engagementWeight: 2,
  activeLiveBoost: 500,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

type RankingScope = 'global' | 'solo' | 'party';
type RankingCategory = 'all' | 'host' | 'gifter' | 'viewer';
type RankingPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'all_time';
type RankingEventType = 'gift' | 'viewer_join' | 'viewer_watch' | 'heart' | 'comment' | 'host_live';

interface RankingActivityEvent {
  id: string;
  timestamp: number;
  scope: RankingScope;
  contextId?: string;
  type: RankingEventType;
  actorId: string;
  targetId?: string;
  coins: number;
  quantity: number;
}

const RANKINGS_STORE_PATH = path.join(process.cwd(), '.lenzo_rankings_store.json');
const serverUsers = new Map<string, any>();
const rankingEvents: RankingActivityEvent[] = [];
const rankingUsersCache = new Map<string, any>();
const lastWatchCreditMap = new Map<string, number>();
const lastRankBroadcastMap = new Map<string, number>();
let rankingsPersistTimer: ReturnType<typeof setTimeout> | null = null;

function cacheRankingUser(user: any) {
  if (!user || !user.id) return;
  const existing = rankingUsersCache.get(user.id) || {};
  const merged = {
    ...existing,
    ...user,
    id: user.id,
    name: user.name || existing.name || 'User',
    avatar: user.avatar || existing.avatar || '',
    displayId: user.displayId || existing.displayId || String(user.id).slice(-6).toUpperCase(),
    level: typeof user.level === 'number' ? user.level : (existing.level ?? 0),
    vipLevel: typeof user.vipLevel === 'number' ? user.vipLevel : (existing.vipLevel ?? 0),
    superVipLevel: typeof user.superVipLevel === 'number' ? user.superVipLevel : (existing.superVipLevel ?? 0),
    isVIP: Boolean(user.isVIP ?? existing.isVIP ?? ((user.vipLevel ?? existing.vipLevel ?? 0) > 0)),
    isSuperVIP: Boolean(user.isSuperVIP ?? existing.isSuperVIP ?? ((user.superVipLevel ?? existing.superVipLevel ?? 0) > 0)),
    isVerified: user.isVerified ?? existing.isVerified,
    verificationTier: user.verificationTier ?? existing.verificationTier,
    verifiedTag: user.verifiedTag ?? existing.verifiedTag,
  };
  rankingUsersCache.set(user.id, merged);
}

function getRankingUserProfile(userId: string): any {
  const fromServer = serverUsers.get(userId);
  const fromCache = rankingUsersCache.get(userId);
  const base = fromServer || fromCache;
  if (base) {
    return {
      id: userId,
      displayId: base.displayId || userId.slice(-6).toUpperCase(),
      name: base.name || 'Lenzo User',
      username: base.username || `@${(base.name || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
      email: base.email || '',
      avatar: base.avatar || '',
      bio: base.bio || '',
      level: typeof base.level === 'number' ? base.level : 0,
      vipLevel: typeof base.vipLevel === 'number' ? base.vipLevel : 0,
      isVIP: Boolean(base.isVIP || (base.vipLevel || 0) > 0),
      superVipLevel: typeof base.superVipLevel === 'number' ? base.superVipLevel : 0,
      isSuperVIP: Boolean(base.isSuperVIP || (base.superVipLevel || 0) > 0),
      isVerified: base.isVerified,
      verificationTier: base.verificationTier,
      verifiedTag: base.verifiedTag || '',
      fansCount: base.fansCount || '0',
      followingCount: base.followingCount || 0,
      likesCount: base.likesCount || '0',
      coins: base.coins || 0,
      diamonds: base.diamonds || 0,
    };
  }
  return {
    id: userId,
    displayId: userId.slice(-6).toUpperCase(),
    name: `User ${userId.slice(-4)}`,
    username: `@user_${userId.slice(-4).toLowerCase()}`,
    avatar: '',
    bio: '',
    level: 0,
    vipLevel: 0,
    isVIP: false,
    superVipLevel: 0,
    isSuperVIP: false,
    fansCount: '0',
    followingCount: 0,
    likesCount: '0',
    coins: 0,
    diamonds: 0,
  };
}

function scheduleRankingsPersist() {
  if (rankingsPersistTimer) return;
  rankingsPersistTimer = setTimeout(() => {
    rankingsPersistTimer = null;
    try {
      const payload = {
        events: rankingEvents.slice(-25000),
        users: Array.from(rankingUsersCache.values()).slice(-2000),
        rankingConfig,
      };
      fs.writeFileSync(RANKINGS_STORE_PATH, JSON.stringify(payload), 'utf8');
    } catch {
      // non-fatal on ephemeral filesystems
    }
  }, 800);
}



function loadRankingsStoreFromDisk() {
  try {
    if (!fs.existsSync(RANKINGS_STORE_PATH)) return;
    const raw = JSON.parse(fs.readFileSync(RANKINGS_STORE_PATH, 'utf8'));
    if (Array.isArray(raw.events)) {
      for (const ev of raw.events) {
        if (ev && ev.id && ev.actorId && typeof ev.timestamp === 'number') {
          rankingEvents.push(ev);
        }
      }
    }
    if (Array.isArray(raw.users)) {
      for (const u of raw.users) {
        if (u && u.id) {
          cacheRankingUser(u);
          if (!serverUsers.has(u.id)) {
            serverUsers.set(u.id, u);
          }
        }
      }
    }
    if (raw.rankingConfig && typeof raw.rankingConfig === 'object') {
      rankingConfig = { ...rankingConfig, ...raw.rankingConfig };
    }
  } catch (err) {
    console.warn('[Rankings] Could not hydrate disk cache:', err);
  }
}

function recordRankingEvent(input: {
  scope: RankingScope;
  contextId?: string;
  type: RankingEventType;
  actor?: any;
  actorId?: string;
  target?: any;
  targetId?: string;
  coins?: number;
  quantity?: number;
}) {
  const actorId = input.actor?.id || input.actorId || '';
  const targetId = input.target?.id || input.targetId || undefined;
  if (!actorId) return;

  if (input.actor?.id) cacheRankingUser(input.actor);
  if (input.target?.id) cacheRankingUser(input.target);

  const now = Date.now();
  const ev: RankingActivityEvent = {
    id: `rk_${now}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: now,
    scope: input.scope,
    contextId: input.contextId,
    type: input.type,
    actorId,
    targetId,
    coins: Math.max(0, Math.floor(Number(input.coins || 0))),
    quantity: Math.max(1, Math.floor(Number(input.quantity || 1))),
  };
  rankingEvents.push(ev);
  if (rankingEvents.length > 30000) {
    rankingEvents.splice(0, rankingEvents.length - 25000);
  }
  scheduleRankingsPersist();

  // Broadcast throttled live ranking update notification so open leaderboards refresh instantly
  const throttleKey = `${input.scope}:${input.contextId || 'global'}`;
  const lastBcast = lastRankBroadcastMap.get(throttleKey) || 0;
  if (now - lastBcast >= 500 || input.type === 'gift') {
    lastRankBroadcastMap.set(throttleKey, now);
    broadcastAll('rankings:updated', {
      scope: input.scope,
      contextId: input.contextId || null,
      type: input.type,
      timestamp: now,
    });
  }
}

loadRankingsStoreFromDisk();

function ensureBroadcasterMetric(user: any): BroadcasterMetricRecord | null {
  if (!user || !user.id) return null;
  cacheRankingUser(user);
  let rec = broadcasterMetricsMap.get(user.id);
  if (!rec) {
    rec = {
      user,
      giftsCoinValue: 0,
      giftsCount: 0,
      totalLikes: 0,
      totalComments: 0,
      uniqueViewerIds: new Set<string>(),
      isCurrentlyLive: false,
      lastActiveAt: Date.now(),
    };
    broadcasterMetricsMap.set(user.id, rec);
  } else {
    rec.user = { ...rec.user, ...user };
    rec.lastActiveAt = Date.now();
  }
  return rec;
}

function serializeLiveStream(stream: ServerLiveStream) {
  const numericViewers = stream.viewers.size;
  return {
    id: stream.id,
    title: stream.title,
    category: stream.category,
    host: stream.host,
    coverImage: stream.coverImage,
    viewerCount: formatCompactCount(numericViewers),
    numericViewers,
    isLive: stream.isLive,
    tags: stream.tags,
    guests: [],
    likesCount: stream.likesCount,
    commentsCount: stream.commentsCount,
    streamUrl: stream.channelName,
    startTime: stream.startTime,
    announcement: stream.announcement || '',
    allowGuests: stream.allowGuests,
    isPrivate: stream.isPrivate,
  };
}

function serializePartyRoom(room: ServerPartyRoom) {
  const safeMaxSeats = clampServerMaxSeatsForHostLevel(room.maxSeats, room.host);
  const safeSeats = Array(safeMaxSeats).fill(null);
  for (let i = 0; i < Math.min(safeMaxSeats, room.seats.length); i++) {
    if (room.seats[i] && !isServerSeatLockedByHostLevel(i, room.host)) {
      safeSeats[i] = room.seats[i];
    }
  }
  const occupiedSeats = safeSeats.filter(Boolean).length;
  const numericParticipants = room.participants.size;
  return {
    id: room.id,
    displayId: room.displayId,
    title: room.title,
    category: room.category,
    host: room.host,
    coverImage: room.coverImage,
    iconType: room.iconType,
    participantCount: String(numericParticipants),
    numericParticipants,
    seatedCount: occupiedSeats,
    isAudioRoom: true,
    maxSeats: safeMaxSeats,
    roomType: room.roomType,
    hasPassword: Boolean(room.roomType === 'private' && room.password),
    announcement: room.announcement,
    seats: safeSeats,
    mutedSeatIndices: Array.from(room.mutedSeatIndices).filter((idx) => idx < safeMaxSeats),
    isLocked: room.isLocked,
    allowJoin: room.allowJoin,
    isOwnerPresent: room.participants.has(room.host?.id),
    startTime: room.startTime,
    likesCount: room.likesCount,
    backgroundType: room.backgroundType || 'preset',
    backgroundId: room.backgroundId || 'royal_neon',
    backgroundImage: room.backgroundImage || '',
  };
}

// WebSocket Server (PK Battles, Live Streams, Party Rooms & Real-Time Sync)
const pkWss = new WebSocketServer({ noServer: true });
const wss = pkWss;

pkWss.on('error', (err) => {
  console.warn('[WS] warning/error:', err);
});

server.on('upgrade', (request, socket, head) => {
  try {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (pathname === '/ws/pk' || pathname === '/ws') {
      pkWss.handleUpgrade(request, socket, head, (ws) => {
        pkWss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  } catch (err) {
    socket.destroy();
  }
});

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  subscribedMatchId?: string;
  subscribedStreamId?: string;
  subscribedRoomId?: string;
  isAlive?: boolean;
}

function broadcastToMatch(matchId: string, event: string, payload: any) {
  const message = JSON.stringify({ event, payload, timestamp: Date.now() });
  wss.clients.forEach((client: WebSocket) => {
    const extClient = client as ExtendedWebSocket;
    if (extClient.readyState === WebSocket.OPEN && extClient.subscribedMatchId === matchId) {
      extClient.send(message);
    }
  });
}

function broadcastToLive(streamId: string, event: string, payload: any) {
  const message = JSON.stringify({ event, payload, timestamp: Date.now() });
  wss.clients.forEach((client: WebSocket) => {
    const extClient = client as ExtendedWebSocket;
    if (extClient.readyState === WebSocket.OPEN && extClient.subscribedStreamId === streamId) {
      extClient.send(message);
    }
  });
}

function broadcastToRoom(roomId: string, event: string, payload: any) {
  const message = JSON.stringify({ event, payload, timestamp: Date.now() });
  wss.clients.forEach((client: WebSocket) => {
    const extClient = client as ExtendedWebSocket;
    if (extClient.readyState === WebSocket.OPEN && extClient.subscribedRoomId === roomId) {
      extClient.send(message);
    }
  });
}

function broadcastToUser(userId: string, event: string, payload: any) {
  const message = JSON.stringify({ event, payload, timestamp: Date.now() });
  wss.clients.forEach((client: WebSocket) => {
    const extClient = client as ExtendedWebSocket;
    if (extClient.readyState === WebSocket.OPEN && extClient.userId === userId) {
      extClient.send(message);
    }
  });
}

function broadcastAll(event: string, payload: any) {
  const message = JSON.stringify({ event, payload, timestamp: Date.now() });
  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function hasOtherSocketInStream(userId: string, streamId: string, excludeWs?: ExtendedWebSocket): boolean {
  let found = false;
  wss.clients.forEach((client: WebSocket) => {
    const ext = client as ExtendedWebSocket;
    if (
      ext !== excludeWs &&
      ext.readyState === WebSocket.OPEN &&
      ext.userId === userId &&
      ext.subscribedStreamId === streamId
    ) {
      found = true;
    }
  });
  return found;
}

function hasOtherSocketInRoom(userId: string, roomId: string, excludeWs?: ExtendedWebSocket): boolean {
  let found = false;
  wss.clients.forEach((client: WebSocket) => {
    const ext = client as ExtendedWebSocket;
    if (
      ext !== excludeWs &&
      ext.readyState === WebSocket.OPEN &&
      ext.userId === userId &&
      ext.subscribedRoomId === roomId
    ) {
      found = true;
    }
  });
  return found;
}

pkWss.on('connection', (ws: ExtendedWebSocket) => {
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'auth' && msg.userId) {
        ws.userId = String(msg.userId);
      } else if (msg.type === 'subscribe_match') {
        ws.subscribedMatchId = msg.matchId;
        if (msg.matchId && activeSessions.has(msg.matchId)) {
          const session = activeSessions.get(msg.matchId)!;
          ws.send(JSON.stringify({
            event: 'pk:sync_state',
            payload: { session, serverTime: Date.now() }
          }));
        }
      } else if (msg.type === 'unsubscribe_match') {
        ws.subscribedMatchId = undefined;
      } else if (msg.type === 'subscribe_live' && msg.streamId) {
        ws.subscribedStreamId = String(msg.streamId);
        if (msg.userId) ws.userId = String(msg.userId);
        const stream = liveStreamsMap.get(ws.subscribedStreamId);
        if (stream) {
          ws.send(JSON.stringify({
            event: 'live:sync_state',
            payload: {
              streamId: stream.id,
              stream: serializeLiveStream(stream),
              viewers: Array.from(stream.viewers.values()).sort((a, b) => b.joinedAt - a.joinedAt),
              comments: stream.comments.slice(-50),
              serverTime: Date.now(),
            }
          }));
        }
      } else if (msg.type === 'unsubscribe_live') {
        ws.subscribedStreamId = undefined;
      } else if (msg.type === 'subscribe_room' && msg.roomId) {
        ws.subscribedRoomId = String(msg.roomId);
        if (msg.userId) ws.userId = String(msg.userId);
        const room = partyRoomsMap.get(ws.subscribedRoomId);
        if (room) {
          ws.send(JSON.stringify({
            event: 'room:sync_state',
            payload: {
              roomId: room.id,
              room: serializePartyRoom(room),
              participants: Array.from(room.participants.values()).sort((a, b) => b.joinedAt - a.joinedAt),
              pendingRequests: Array.from(room.pendingRequests.values()),
              messages: room.messages.slice(-50),
              serverTime: Date.now(),
            }
          }));
        }
      } else if (msg.type === 'unsubscribe_room') {
        ws.subscribedRoomId = undefined;
      } else if (msg.type === 'webrtc:signal' && msg.signalType) {
        // Real-time WebRTC signaling relay for live streams & party voice rooms
        const fromUserId = String(msg.fromUserId || ws.userId || '');
        if (!fromUserId) return;
        const payload = {
          ...(msg.payload || {}),
          fromUserId,
          streamId: msg.streamId,
          roomId: msg.roomId,
        };
        if (msg.targetUserId) {
          broadcastToUser(String(msg.targetUserId), String(msg.signalType), payload);
        } else if (msg.streamId) {
          const message = JSON.stringify({ event: String(msg.signalType), payload, timestamp: Date.now() });
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as ExtendedWebSocket;
            if (
              extClient !== ws &&
              extClient.readyState === WebSocket.OPEN &&
              extClient.subscribedStreamId === String(msg.streamId)
            ) {
              extClient.send(message);
            }
          });
        } else if (msg.roomId) {
          const message = JSON.stringify({ event: String(msg.signalType), payload, timestamp: Date.now() });
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as ExtendedWebSocket;
            if (
              extClient !== ws &&
              extClient.readyState === WebSocket.OPEN &&
              extClient.subscribedRoomId === String(msg.roomId)
            ) {
              extClient.send(message);
            }
          });
        }
      } else if (msg.type === 'live:media_state' && msg.streamId) {
        broadcastToLive(String(msg.streamId), 'live:media_state', {
          streamId: String(msg.streamId),
          hostId: String(msg.hostId || ws.userId || ''),
          isCameraOn: Boolean(msg.isCameraOn),
          isMicMuted: Boolean(msg.isMicMuted),
          isFrontCamera: msg.isFrontCamera !== false,
        });
      }
    } catch {
      // ignore invalid message
    }
  });

  ws.on('close', () => {
    const uid = ws.userId;
    if (uid && ws.subscribedStreamId) {
      const stream = liveStreamsMap.get(ws.subscribedStreamId);
      if (stream && !hasOtherSocketInStream(uid, ws.subscribedStreamId, ws)) {
        broadcastToLive(stream.id, 'webrtc:peer_left', { streamId: stream.id, fromUserId: uid });
        if (stream.viewers.has(uid)) {
          stream.viewers.delete(uid);
          const serialized = serializeLiveStream(stream);
          broadcastToLive(stream.id, 'live:viewer_left', {
            streamId: stream.id,
            userId: uid,
            numericViewers: serialized.numericViewers,
            viewerCount: serialized.viewerCount,
          });
          broadcastAll('live:directory_updated', { streamId: stream.id, action: 'updated', stream: serialized });
        }
      }
    }
    if (uid && ws.subscribedRoomId) {
      const room = partyRoomsMap.get(ws.subscribedRoomId);
      if (room && !hasOtherSocketInRoom(uid, ws.subscribedRoomId, ws)) {
        broadcastToRoom(room.id, 'webrtc:room_peer_left', { roomId: room.id, fromUserId: uid });
        room.participants.delete(uid);
        if (room.pendingRequests.has(uid)) {
          room.pendingRequests.delete(uid);
          broadcastToRoom(room.id, 'room:seat_request_cancelled', { roomId: room.id, userId: uid });
        }
        // Vacate any seat (including Host Seat 0) if disconnecting user has no other open socket in the room
        const seatIdx = room.seats.findIndex((s) => s && s.id === uid);
        if (seatIdx >= 0) {
          const removedUser = room.seats[seatIdx];
          room.seats[seatIdx] = null;
          room.mutedSeatIndices.delete(seatIdx);
          broadcastToRoom(room.id, 'room:seat_vacated', {
            roomId: room.id,
            seatIndex: seatIdx,
            removedUser,
            room: serializePartyRoom(room),
          });
        }
        const serialized = serializePartyRoom(room);
        broadcastToRoom(room.id, 'room:participant_left', {
          roomId: room.id,
          userId: uid,
          room: serialized,
        });
        broadcastAll('room:directory_updated', { roomId: room.id, action: 'updated', room: serialized });
      }
    }
  });
});

// Periodic ping to keep WS alive
const pingInterval = setInterval(() => {
  pkWss.clients.forEach((client: WebSocket) => {
    const extClient = client as ExtendedWebSocket;
    if (!extClient.isAlive) {
      return extClient.terminate();
    }
    extClient.isAlive = false;
    extClient.ping();
  });
}, 25000);

// Prune stale live viewers (>90s without heartbeat) & expired seat requests (>60s)
setInterval(() => {
  const now = Date.now();
  for (const stream of liveStreamsMap.values()) {
    let changed = false;
    for (const [uid, v] of stream.viewers.entries()) {
      if (now - v.lastSeen > 90000) {
        stream.viewers.delete(uid);
        changed = true;
      }
    }
    if (changed) {
      const serialized = serializeLiveStream(stream);
      broadcastToLive(stream.id, 'live:viewer_count_updated', {
        streamId: stream.id,
        numericViewers: serialized.numericViewers,
        viewerCount: serialized.viewerCount,
      });
    }
  }
  for (const room of partyRoomsMap.values()) {
    let participantsChanged = false;
    for (const [uid, participant] of room.participants.entries()) {
      if (now - participant.lastSeen > 90000 && !hasOtherSocketInRoom(uid, room.id)) {
        room.participants.delete(uid);
        participantsChanged = true;
        const seatIdx = room.seats.findIndex((s) => s && s.id === uid);
        if (seatIdx >= 0) {
          const removedUser = room.seats[seatIdx];
          room.seats[seatIdx] = null;
          room.mutedSeatIndices.delete(seatIdx);
          broadcastToRoom(room.id, 'room:seat_vacated', {
            roomId: room.id,
            seatIndex: seatIdx,
            removedUser,
            room: serializePartyRoom(room),
          });
        }
        broadcastToRoom(room.id, 'room:participant_left', {
          roomId: room.id,
          userId: uid,
          room: serializePartyRoom(room),
        });
      }
    }
    if (participantsChanged) {
      const serialized = serializePartyRoom(room);
      broadcastAll('room:directory_updated', { roomId: room.id, action: 'updated', room: serialized });
    }
    for (const [uid, reqObj] of room.pendingRequests.entries()) {
      if (reqObj.expiresAt && now > reqObj.expiresAt) {
        room.pendingRequests.delete(uid);
        broadcastToRoom(room.id, 'room:seat_request_cancelled', { roomId: room.id, userId: uid });
      }
    }
  }
}, 15000);

// Authoritative Timer & Match Management Tick (every 1 second)
setInterval(() => {
  const now = Date.now();

  for (const [id, invite] of pendingInvitations.entries()) {
    if (invite.status === 'pending' && now >= invite.expiresAt) {
      invite.status = 'expired';
      broadcastToUser(invite.fromHost.id, 'pk:invite_expired', { inviteId: id });
      broadcastToUser(invite.toHost.id, 'pk:invite_expired', { inviteId: id });
    }
  }

  for (const [matchId, session] of activeSessions.entries()) {
    if (session.status === 'in_progress') {
      const remainingMs = Math.max(0, session.endTime - now);
      session.remainingSeconds = Math.ceil(remainingMs / 1000);

      if (remainingMs <= 0) {
        session.status = 'completed';
        session.remainingSeconds = 0;

        if (session.host1.score > session.host2.score) {
          session.winnerId = session.host1.user.id;
        } else if (session.host2.score > session.host1.score) {
          session.winnerId = session.host2.user.id;
        } else {
          session.winnerId = 'draw';
        }

        const nowFormatted =
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
          ', ' +
          new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });

        const host1HistoryItem: PKMatchHistoryItem = {
          id: `hist_${Date.now()}_1`,
          matchId: session.id,
          date: nowFormatted,
          durationSeconds: Math.round(session.durationMs / 1000),
          opponent: {
            id: session.host2.user.id,
            name: session.host2.user.name,
            username: session.host2.user.username || '@' + session.host2.user.name.toLowerCase().replace(/\s+/g, ''),
            avatar: session.host2.user.avatar,
            level: session.host2.user.level || 1
          },
          myScore: session.host1.score,
          opponentScore: session.host2.score,
          result: session.winnerId === session.host1.user.id ? 'win' : session.winnerId === 'draw' ? 'draw' : 'loss',
          giftsReceived: session.host1.giftsReceivedCount,
          likesReceived: session.host1.likes,
          coinsEarned: session.host1.giftsCoinValue
        };

        const host2HistoryItem: PKMatchHistoryItem = {
          id: `hist_${Date.now()}_2`,
          matchId: session.id,
          date: nowFormatted,
          durationSeconds: Math.round(session.durationMs / 1000),
          opponent: {
            id: session.host1.user.id,
            name: session.host1.user.name,
            username: session.host1.user.username || '@' + session.host1.user.name.toLowerCase().replace(/\s+/g, ''),
            avatar: session.host1.user.avatar,
            level: session.host1.user.level || 1
          },
          myScore: session.host2.score,
          opponentScore: session.host1.score,
          result: session.winnerId === session.host2.user.id ? 'win' : session.winnerId === 'draw' ? 'draw' : 'loss',
          giftsReceived: session.host2.giftsReceivedCount,
          likesReceived: session.host2.likes,
          coinsEarned: session.host2.giftsCoinValue
        };

        const list1 = matchHistories.get(session.host1.user.id) || [];
        matchHistories.set(session.host1.user.id, [host1HistoryItem, ...list1]);

        const list2 = matchHistories.get(session.host2.user.id) || [];
        matchHistories.set(session.host2.user.id, [host2HistoryItem, ...list2]);

        broadcastToMatch(matchId, 'pk:match_ended', {
          session,
          winnerId: session.winnerId,
          host1Score: session.host1.score,
          host2Score: session.host2.score,
          serverTime: now
        });

        const winnerName =
          session.winnerId === session.host1.user.id
            ? session.host1.user.name
            : session.winnerId === session.host2.user.id
              ? session.host2.user.name
              : 'Draw';
        void dispatchServerPushToUsers([session.host1.user.id, session.host2.user.id], {
          id: `pk_end_${matchId}`,
          type: 'pk',
          title: session.winnerId === 'draw' ? '⚔️ PK Battle Ended in a Draw!' : `🏆 PK Winner: ${winnerName}`,
          message: `Final Score: ${session.host1.user.name} (${session.host1.score}) vs ${session.host2.user.name} (${session.host2.score})`,
          actionType: 'open_pk',
          targetId: matchId,
          priority: 'high',
        }).catch(() => {});
      }
    }
  }
}, 1000);

// REST API Endpoints

// 0. Health & Custom Email OTP Verification Engine (SMTP via Nodemailer — Zero Third-Party Lock-in)
// Supports Gmail App Password (SMTP_USER + SMTP_PASS) or any standard SMTP server (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).
const EMAIL_OTP_TTL_SECONDS = 10 * 60;
const EMAIL_OTP_RESEND_COOLDOWN_MS = 45_000;
const EMAIL_OTP_MAX_VERIFY_ATTEMPTS = 5;
const EMAIL_OTP_IP_WINDOW_MS = 15 * 60_000;
const EMAIL_OTP_IP_MAX_REQUESTS = 15;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMAIL_OTP_STORE_PATH = path.join(process.cwd(), '.lenzo_email_otp_store.json');
// Secure per-process random signing key fallback when EMAIL_OTP_SECRET env var is not explicitly configured.
const GENERATED_EMAIL_OTP_SECRET = crypto.randomBytes(32).toString('hex');

interface EmailOtpStateStore {
  latestJtiByEmail: Record<string, { jti: string; exp: number; issuedAt: number }>;
  usedJtis: Record<string, number>;
  failedAttemptsByJti: Record<string, { count: number; exp: number }>;
  lastSentByEmail: Record<string, number>;
}

const emailOtpState: EmailOtpStateStore = {
  latestJtiByEmail: {},
  usedJtis: {},
  failedAttemptsByJti: {},
  lastSentByEmail: {},
};
const emailOtpIpRequests = new Map<string, number[]>();

let cachedSmtpTransportKey = '';
let cachedSmtpTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

type EmailOtpProvider = 'brevo-http' | 'gmail-webhook' | 'custom-smtp' | 'none';
type EmailOtpTransportMode = 'https' | 'smtp' | 'none';

function isRailwayRuntime(): boolean {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID ||
      process.env.RAILWAY_STATIC_URL
  );
}

function isSafeHttpsWebhookUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      !host ||
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host === '[::1]' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function maskEmailForLog(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const [local, domain] = parts;
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

function parseFromEmailAddress(rawFrom: string): { valid: boolean; address: string; domain: string | null } {
  const trimmed = rawFrom.trim();
  if (!trimmed) return { valid: false, address: '', domain: null };
  // Supports either "user@domain.com" or "Lenzo Party Live <user@domain.com>"
  const angleMatch = trimmed.match(/<([^<>]+)>$/);
  const address = (angleMatch ? angleMatch[1] : trimmed).trim().toLowerCase();
  if (!EMAIL_REGEX.test(address)) {
    return { valid: false, address: '', domain: null };
  }
  const domain = address.split('@')[1] || null;
  return { valid: true, address, domain };
}

function inferSmtpHostAndPort(smtpUser: string): { host: string; port: number; secure: boolean } {
  const domain = (smtpUser.split('@')[1] || '').toLowerCase();
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return { host: 'smtp.gmail.com', port: 465, secure: true };
  }
  if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com' || domain === 'office365.com') {
    return { host: 'smtp-mail.outlook.com', port: 587, secure: false };
  }
  if (domain === 'zoho.com' || domain === 'zohomail.com') {
    return { host: 'smtp.zoho.com', port: 465, secure: true };
  }
  if (domain === 'yahoo.com' || domain === 'ymail.com') {
    return { host: 'smtp.mail.yahoo.com', port: 465, secure: true };
  }
  return { host: '', port: 587, secure: false };
}

function getEmailOtpConfig() {
  const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
  const rawWebhookUrl = (process.env.EMAIL_WEBHOOK_URL || '').trim();
  const webhookUrlValid = isSafeHttpsWebhookUrl(rawWebhookUrl);
  const webhookSecret = (process.env.EMAIL_WEBHOOK_SECRET || '').trim();

  const smtpUser = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
  const rawPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').trim();
  const explicitHost = (process.env.SMTP_HOST || '').trim();
  const inferred = inferSmtpHostAndPort(smtpUser);
  const smtpHost = explicitHost || inferred.host;
  const parsedPort = Number(process.env.SMTP_PORT || '');
  const smtpPort = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : inferred.port;
  const rawSecure = (process.env.SMTP_SECURE || '').trim().toLowerCase();

  // Port 465 always uses implicit TLS; ports 587 and 2525 MUST use STARTTLS (secure: false) so handshakes never stall.
  const smtpSecure =
    smtpPort === 465
      ? true
      : smtpPort === 587 || smtpPort === 2525
        ? false
        : rawSecure === 'true'
          ? true
          : rawSecure === 'false'
            ? false
            : explicitHost
              ? false
              : inferred.secure;

  // Google App Passwords are often pasted with spaces ("abcd efgh ijkl mnop"); normalize for Gmail SMTP.
  const smtpPass =
    smtpHost.toLowerCase() === 'smtp.gmail.com' ? rawPass.replace(/\s+/g, '') : rawPass;

  const rawFrom = (process.env.EMAIL_FROM || process.env.SMTP_FROM || '').trim();
  const fallbackFromAddress = smtpUser || 'lenzopartyofficial@gmail.com';
  const smtpFrom = rawFrom || `Lenzo Party Live <${fallbackFromAddress}>`;
  const parsedFrom = parseFromEmailAddress(smtpFrom);

  const explicitSecret = (process.env.EMAIL_OTP_SECRET || '').trim();
  const emailOtpSecret = explicitSecret || GENERATED_EMAIL_OTP_SECRET;

  let provider: EmailOtpProvider = 'none';
  let transportMode: EmailOtpTransportMode = 'none';
  let configured = false;
  const missingVars: string[] = [];

  if (brevoApiKey) {
    provider = 'brevo-http';
    transportMode = 'https';
    configured = parsedFrom.valid;
    if (!parsedFrom.valid) missingVars.push('EMAIL_FROM');
  } else if (rawWebhookUrl) {
    provider = 'gmail-webhook';
    transportMode = 'https';
    configured = webhookUrlValid;
    if (!webhookUrlValid) missingVars.push('EMAIL_WEBHOOK_URL');
  } else if (smtpHost && smtpUser && smtpPass && parsedFrom.valid) {
    provider = 'custom-smtp';
    transportMode = 'smtp';
    configured = true;
  } else {
    if (!smtpUser) missingVars.push('BREVO_API_KEY or EMAIL_WEBHOOK_URL or SMTP_USER');
    if (smtpUser && !smtpPass) missingVars.push('SMTP_PASS');
    if (smtpUser && !smtpHost) missingVars.push('SMTP_HOST');
  }

  return {
    provider,
    transportMode,
    brevoApiKey,
    webhookUrl: webhookUrlValid ? rawWebhookUrl : '',
    webhookSecret,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    smtpFrom,
    fromAddress: parsedFrom.address || 'lenzopartyofficial@gmail.com',
    fromValid: parsedFrom.valid,
    fromDomain: parsedFrom.domain,
    emailOtpSecret,
    emailOtpSecretExplicit: Boolean(explicitSecret),
    missingVars,
    configured,
  };
}

function getSmtpTransporter(cfg: ReturnType<typeof getEmailOtpConfig>) {
  const key = `${cfg.smtpHost}:${cfg.smtpPort}:${cfg.smtpSecure}:${cfg.smtpUser}:${crypto
    .createHash('sha256')
    .update(cfg.smtpPass)
    .digest('hex')
    .slice(0, 12)}`;
  if (cachedSmtpTransporter && cachedSmtpTransportKey === key) {
    return cachedSmtpTransporter;
  }
  cachedSmtpTransporter = nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure: cfg.smtpSecure,
    requireTLS: cfg.smtpPort === 587,
    auth: {
      user: cfg.smtpUser,
      pass: cfg.smtpPass,
    },
    // Fail fast (8s) so Railway Trial/Hobby SMTP port blocks return structured JSON before Cloudflare 504s.
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 10_000,
  });
  cachedSmtpTransportKey = key;
  return cachedSmtpTransporter;
}

async function sendViaBrevoHttp(
  cfg: ReturnType<typeof getEmailOtpConfig>,
  payload: { to: string; subject: string; text: string; html: string }
): Promise<{ messageId: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': cfg.brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          name: 'Lenzo Party Live',
          email: cfg.fromAddress,
        },
        to: [{ email: payload.to }],
        replyTo: {
          name: 'Lenzo Party Live Support',
          email: 'lenzopartyofficial@gmail.com',
        },
        subject: payload.subject,
        textContent: payload.text,
        htmlContent: payload.html,
      }),
      signal: controller.signal,
    });

    const rawText = await resp.text().catch(() => '');
    let data: any = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    if (!resp.ok) {
      const apiErr: any = new Error(
        String(data?.message || data?.code || `Brevo HTTP ${resp.status}`)
      );
      apiErr.httpStatus = resp.status;
      apiErr.brevoCode = String(data?.code || '');
      if (resp.status === 401 || resp.status === 403) {
        apiErr.code = 'EMAIL_PROVIDER_AUTH_ERROR';
      } else if (
        resp.status === 400 &&
        /sender|not valid|unverified/i.test(String(data?.message || ''))
      ) {
        apiErr.code = 'EMAIL_SENDER_UNVERIFIED';
      } else {
        apiErr.code = 'EMAIL_PROVIDER_ERROR';
      }
      throw apiErr;
    }

    return { messageId: String(data?.messageId || `brevo_${Date.now()}`) };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      const timeoutErr: any = new Error('Brevo HTTPS API request timed out.');
      timeoutErr.code = 'ETIMEDOUT';
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function sendViaEmailWebhook(
  cfg: ReturnType<typeof getEmailOtpConfig>,
  payload: { to: string; subject: string; text: string; html: string }
): Promise<{ messageId: string }> {
  if (!cfg.webhookUrl || !isSafeHttpsWebhookUrl(cfg.webhookUrl)) {
    const cfgErr: any = new Error('EMAIL_WEBHOOK_URL must be a valid public HTTPS URL.');
    cfgErr.code = 'EMAIL_WEBHOOK_ERROR';
    throw cfgErr;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const resp = await fetch(cfg.webhookUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/plain, */*',
      },
      body: JSON.stringify({
        secret: cfg.webhookSecret || undefined,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        replyTo: 'lenzopartyofficial@gmail.com',
        senderName: 'Lenzo Party Live',
      }),
      signal: controller.signal,
    });

    const contentType = (resp.headers.get('content-type') || '').toLowerCase();
    const rawText = await resp.text().catch(() => '');
    let data: any = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    const looksLikeHtml =
      contentType.includes('text/html') || /^\s*<!doctype html|^\s*<html/i.test(rawText);

    if (looksLikeHtml) {
      const accessErr: any = new Error(
        'Email webhook returned an HTML page instead of JSON. Make sure your Google Apps Script Web App is deployed with "Execute as: Me" and "Who has access: Anyone".'
      );
      accessErr.code = 'EMAIL_WEBHOOK_ACCESS_ERROR';
      throw accessErr;
    }

    if (!resp.ok || (data && (data.ok === false || data.success === false))) {
      const webhookErr: any = new Error(
        String(data?.error || data?.message || `Email webhook failed with HTTP ${resp.status}`)
      );
      webhookErr.code = resp.status === 401 || resp.status === 403 ? 'EMAIL_PROVIDER_AUTH_ERROR' : 'EMAIL_WEBHOOK_ERROR';
      throw webhookErr;
    }

    return {
      messageId: String(data?.messageId || `webhook_${Date.now()}`),
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      const timeoutErr: any = new Error('Email webhook request timed out.');
      timeoutErr.code = 'ETIMEDOUT';
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function dispatchOtpEmail(
  cfg: ReturnType<typeof getEmailOtpConfig>,
  payload: { to: string; subject: string; text: string; html: string }
): Promise<{ messageId: string; provider: EmailOtpProvider; transportMode: EmailOtpTransportMode }> {
  if (cfg.provider === 'brevo-http') {
    const result = await sendViaBrevoHttp(cfg, payload);
    return { messageId: result.messageId, provider: cfg.provider, transportMode: 'https' };
  }
  if (cfg.provider === 'gmail-webhook') {
    const result = await sendViaEmailWebhook(cfg, payload);
    return { messageId: result.messageId, provider: cfg.provider, transportMode: 'https' };
  }
  const transporter = getSmtpTransporter(cfg);
  const mailInfo = await transporter.sendMail({
    from: cfg.smtpFrom,
    to: payload.to,
    replyTo: 'lenzopartyofficial@gmail.com',
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
  return {
    messageId: String(mailInfo?.messageId || ''),
    provider: 'custom-smtp',
    transportMode: 'smtp',
  };
}

function buildOtpEmailHtml(otp: string): string {
  const formattedOtp = `${otp.slice(0, 3)} ${otp.slice(3)}`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:24px 12px;background:#090611;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#ffffff;">
  <div style="max-width:480px;margin:0 auto;background:linear-gradient(160deg,#1B0F2E 0%,#120820 100%);border:1px solid rgba(255,200,74,0.28);border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
    <div style="padding:24px 24px 18px;text-align:center;background:linear-gradient(135deg,rgba(139,32,255,0.28),rgba(243,40,213,0.18));border-bottom:1px solid rgba(255,255,255,0.08);">
      <div style="display:inline-block;padding:6px 14px;border-radius:999px;background:rgba(255,200,74,0.14);border:1px solid rgba(255,200,74,0.45);color:#FFC84A;font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;">Lenzo Party Live</div>
      <h1 style="margin:14px 0 4px;font-size:22px;font-weight:800;color:#ffffff;">Email Verification Code</h1>
      <p style="margin:0;font-size:13px;color:#CBBFE0;">Enter this 6-digit code in the app to verify your account</p>
    </div>
    <div style="padding:28px 24px;text-align:center;">
      <div style="display:inline-block;padding:18px 30px;background:#221338;border:1.5px solid rgba(243,40,213,0.45);border-radius:16px;font-size:34px;font-weight:900;letter-spacing:8px;color:#FFC84A;font-family:'Courier New',Courier,monospace;">${formattedOtp}</div>
      <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#B9AECF;">
        This code expires in <strong style="color:#ffffff;">10 minutes</strong> and can only be used once.<br/>
        Never share this verification code with anyone.
      </p>
    </div>
    <div style="padding:16px 24px;background:rgba(0,0,0,0.25);border-top:1px solid rgba(255,255,255,0.06);text-align:center;font-size:11px;color:#8E82A8;">
      If you did not request this code, you can safely ignore this email.<br/>
      Official Support: <a href="mailto:lenzopartyofficial@gmail.com" style="color:#FFC84A;text-decoration:none;">lenzopartyofficial@gmail.com</a>
    </div>
  </div>
</body>
</html>`;
}

function pruneEmailOtpState() {
  const nowSec = Math.floor(Date.now() / 1000);
  const nowMs = Date.now();
  for (const [email, rec] of Object.entries(emailOtpState.latestJtiByEmail)) {
    if (!rec || rec.exp <= nowSec) {
      delete emailOtpState.latestJtiByEmail[email];
    }
  }
  for (const [jti, exp] of Object.entries(emailOtpState.usedJtis)) {
    if (!exp || exp <= nowSec) {
      delete emailOtpState.usedJtis[jti];
    }
  }
  for (const [jti, rec] of Object.entries(emailOtpState.failedAttemptsByJti)) {
    if (!rec || rec.exp <= nowSec) {
      delete emailOtpState.failedAttemptsByJti[jti];
    }
  }
  for (const [email, sentAt] of Object.entries(emailOtpState.lastSentByEmail)) {
    if (!sentAt || nowMs - sentAt > EMAIL_OTP_RESEND_COOLDOWN_MS * 2) {
      delete emailOtpState.lastSentByEmail[email];
    }
  }
}

function loadEmailOtpStateFromDisk() {
  try {
    if (!fs.existsSync(EMAIL_OTP_STORE_PATH)) return;
    const raw = JSON.parse(fs.readFileSync(EMAIL_OTP_STORE_PATH, 'utf8'));
    if (raw && typeof raw === 'object') {
      if (raw.latestJtiByEmail && typeof raw.latestJtiByEmail === 'object') {
        Object.assign(emailOtpState.latestJtiByEmail, raw.latestJtiByEmail);
      }
      if (raw.usedJtis && typeof raw.usedJtis === 'object') {
        Object.assign(emailOtpState.usedJtis, raw.usedJtis);
      }
      if (raw.failedAttemptsByJti && typeof raw.failedAttemptsByJti === 'object') {
        Object.assign(emailOtpState.failedAttemptsByJti, raw.failedAttemptsByJti);
      }
      if (raw.lastSentByEmail && typeof raw.lastSentByEmail === 'object') {
        Object.assign(emailOtpState.lastSentByEmail, raw.lastSentByEmail);
      }
    }
    pruneEmailOtpState();
  } catch (err) {
    console.warn('[Email OTP] Could not hydrate OTP challenge state from disk:', (err as Error)?.message || err);
  }
}

function persistEmailOtpStateToDisk() {
  try {
    pruneEmailOtpState();
    // Stores ONLY non-secret challenge metadata (jti, expiry, attempt counters); never stores plaintext OTPs or secrets.
    fs.writeFileSync(EMAIL_OTP_STORE_PATH, JSON.stringify(emailOtpState), 'utf8');
  } catch {
    // Non-fatal on ephemeral filesystems; HMAC challenge verification remains stateless-compatible across restarts.
  }
}

loadEmailOtpStateFromDisk();

function computeSaltedOtpHash(secret: string, jti: string, email: string, salt: string, otp: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${jti}:${email}:${salt}:${otp}`)
    .digest('hex');
}

function makeEmailOtpChallenge(email: string, otp: string, expiresAt: number, secret: string): { challenge: string; jti: string } {
  const jti = crypto.randomBytes(16).toString('hex');
  const salt = crypto.randomBytes(16).toString('hex');
  const iat = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      v: 2,
      jti,
      email,
      salt,
      otpHash: computeSaltedOtpHash(secret, jti, email, salt, otp),
      iat,
      exp: expiresAt,
    })
  ).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return { challenge: `${payload}.${signature}`, jti };
}

type OtpVerifyResult =
  | { ok: true; jti: string; exp: number }
  | { ok: false; code: string; status: number; error: string };

function verifyEmailOtpChallenge(email: string, otp: string, challenge: string, secret: string): OtpVerifyResult {
  if (!secret) {
    return {
      ok: false,
      code: 'OTP_NOT_CONFIGURED',
      status: 503,
      error: 'Email verification service is not ready on the server.',
    };
  }
  if (!challenge || typeof challenge !== 'string') {
    return {
      ok: false,
      code: 'OTP_MALFORMED',
      status: 400,
      error: 'Missing verification session. Please request a new code.',
    };
  }
  const dotParts = challenge.trim().split('.');
  if (dotParts.length !== 2 || !dotParts[0] || !dotParts[1]) {
    return {
      ok: false,
      code: 'OTP_MALFORMED',
      status: 400,
      error: 'Invalid verification session. Please request a new code.',
    };
  }

  const [payload, signature] = dotParts;
  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest();
  let suppliedSig: Buffer;
  try {
    suppliedSig = Buffer.from(signature, 'base64url');
  } catch {
    return {
      ok: false,
      code: 'OTP_MALFORMED',
      status: 400,
      error: 'Invalid verification signature. Please request a new code.',
    };
  }

  if (suppliedSig.length !== expectedSig.length || !crypto.timingSafeEqual(suppliedSig, expectedSig)) {
    return {
      ok: false,
      code: 'OTP_SIGNATURE_INVALID',
      status: 400,
      error: 'Verification session expired or was reset. Please request a new code.',
    };
  }

  let data: any;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return {
      ok: false,
      code: 'OTP_MALFORMED',
      status: 400,
      error: 'Corrupted verification session. Please request a new code.',
    };
  }

  if (!data || typeof data !== 'object' || String(data.email || '').toLowerCase() !== email) {
    return {
      ok: false,
      code: 'OTP_EMAIL_MISMATCH',
      status: 400,
      error: 'This verification code does not match the entered email address.',
    };
  }

  const exp = Number(data.exp || 0);
  const nowSec = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(exp) || exp <= nowSec) {
    return {
      ok: false,
      code: 'OTP_EXPIRED',
      status: 400,
      error: 'This verification code has expired. Please request a new code.',
    };
  }

  const jti = typeof data.jti === 'string' && data.jti ? data.jti : `legacy_${payload.slice(0, 24)}`;

  pruneEmailOtpState();

  if (emailOtpState.usedJtis[jti]) {
    return {
      ok: false,
      code: 'OTP_ALREADY_USED',
      status: 400,
      error: 'This verification code has already been used. Please request a new code.',
    };
  }

  const latestRecord = emailOtpState.latestJtiByEmail[email];
  if (latestRecord && latestRecord.jti !== jti) {
    return {
      ok: false,
      code: 'OTP_SUPERSEDED',
      status: 400,
      error: 'A newer verification code was sent to your email. Please enter the latest code.',
    };
  }

  const failedRec = emailOtpState.failedAttemptsByJti[jti];
  if (failedRec && failedRec.count >= EMAIL_OTP_MAX_VERIFY_ATTEMPTS) {
    return {
      ok: false,
      code: 'OTP_TOO_MANY_ATTEMPTS',
      status: 429,
      error: 'Too many incorrect code attempts. Please request a new verification code.',
    };
  }

  const expectedHashHex =
    data.v === 2 && typeof data.salt === 'string' && data.salt
      ? computeSaltedOtpHash(secret, jti, email, data.salt, otp)
      : crypto.createHash('sha256').update(otp).digest('hex');

  if (typeof data.otpHash !== 'string' || !/^[0-9a-f]{64}$/i.test(data.otpHash)) {
    return {
      ok: false,
      code: 'OTP_MALFORMED',
      status: 400,
      error: 'Invalid verification session. Please request a new code.',
    };
  }

  const storedHashBuf = Buffer.from(data.otpHash, 'hex');
  const computedHashBuf = Buffer.from(expectedHashHex, 'hex');
  if (storedHashBuf.length !== computedHashBuf.length || !crypto.timingSafeEqual(storedHashBuf, computedHashBuf)) {
    const nextCount = (failedRec?.count || 0) + 1;
    emailOtpState.failedAttemptsByJti[jti] = { count: nextCount, exp };
    persistEmailOtpStateToDisk();
    const remaining = Math.max(0, EMAIL_OTP_MAX_VERIFY_ATTEMPTS - nextCount);
    return {
      ok: false,
      code: 'OTP_INVALID',
      status: 400,
      error:
        remaining > 0
          ? `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many incorrect code attempts. Please request a new verification code.',
    };
  }

  // Mark challenge single-use upon successful verification
  emailOtpState.usedJtis[jti] = exp;
  delete emailOtpState.failedAttemptsByJti[jti];
  persistEmailOtpStateToDisk();

  return { ok: true, jti, exp };
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

app.get('/api/auth/email/status', (_req: Request, res: Response) => {
  const cfg = getEmailOtpConfig();
  return res.json({
    configured: cfg.configured,
    provider: cfg.provider,
    transportMode: cfg.transportMode,
    smtpHost: cfg.provider === 'custom-smtp' ? cfg.smtpHost || null : null,
    smtpPort: cfg.provider === 'custom-smtp' ? cfg.smtpPort : null,
    smtpSecure: cfg.provider === 'custom-smtp' ? cfg.smtpSecure : null,
    fromDomain: cfg.fromDomain,
    missingVars: cfg.missingVars,
    otpTtlSeconds: EMAIL_OTP_TTL_SECONDS,
    resendCooldownSeconds: Math.floor(EMAIL_OTP_RESEND_COOLDOWN_MS / 1000),
  });
});

app.post('/api/auth/email/send-otp', async (req: Request, res: Response) => {
  const rawEmail = typeof req.body?.email === 'string' ? req.body.email : '';
  const email = rawEmail.trim().toLowerCase();
  const maskedEmail = email ? maskEmailForLog(email) : '<empty>';
  const cfg = getEmailOtpConfig();

  console.info('[Email OTP] send-otp request received', {
    email: maskedEmail,
    configured: cfg.configured,
    provider: cfg.provider,
    transportMode: cfg.transportMode,
    fromDomain: cfg.fromDomain,
  });

  try {
    if (!email || email.length > 254 || /[\r\n]/.test(rawEmail) || !EMAIL_REGEX.test(email)) {
      console.warn('[Email OTP] Email validation failed', { email: maskedEmail });
      return res.status(400).json({
        success: false,
        code: 'INVALID_EMAIL',
        error: 'Enter a valid email address.',
      });
    }

    if (!cfg.configured) {
      const missingText =
        cfg.missingVars.length > 0
          ? `Set ${cfg.missingVars.join(' and ')} on the backend server.`
          : 'Email sender configuration is invalid.';
      console.error('[Email OTP] Email OTP configuration incomplete', {
        provider: cfg.provider,
        missingVars: cfg.missingVars,
        fromValid: cfg.fromValid,
      });
      return res.status(503).json({
        success: false,
        code: 'SMTP_NOT_CONFIGURED',
        missingVars: cfg.missingVars,
        error: `Custom Email OTP server needs HTTPS email delivery (EMAIL_WEBHOOK_URL or BREVO_API_KEY) or SMTP credentials. ${missingText}`,
      });
    }

    const now = Date.now();
    pruneEmailOtpState();

    // Per-IP sliding window protection
    const clientIp = getClientIp(req);
    const ipTimestamps = (emailOtpIpRequests.get(clientIp) || []).filter(
      (ts) => now - ts < EMAIL_OTP_IP_WINDOW_MS
    );
    if (ipTimestamps.length >= EMAIL_OTP_IP_MAX_REQUESTS) {
      console.warn('[Email OTP] IP rate limit reached', { email: maskedEmail });
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        error: 'Too many verification code requests. Please wait a few minutes and try again.',
      });
    }

    // Per-email resend cooldown
    const lastSent = emailOtpState.lastSentByEmail[email] || 0;
    const elapsedMs = now - lastSent;
    if (lastSent > 0 && elapsedMs < EMAIL_OTP_RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.max(1, Math.ceil((EMAIL_OTP_RESEND_COOLDOWN_MS - elapsedMs) / 1000));
      console.warn('[Email OTP] Cooldown active', { email: maskedEmail, retryAfterSeconds });
      return res.status(429).json({
        success: false,
        code: 'COOLDOWN_ACTIVE',
        retryAfterSeconds,
        error: `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
      });
    }

    const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const expiresAt = Math.floor(now / 1000) + EMAIL_OTP_TTL_SECONDS;
    const { challenge, jti } = makeEmailOtpChallenge(email, otp, expiresAt, cfg.emailOtpSecret);

    const delivery = await dispatchOtpEmail(cfg, {
      to: email,
      subject: `${otp} is your Lenzo Party Live verification code`,
      text: `Lenzo Party Live\n\nYour 6-digit verification code is: ${otp}\n\nThis code expires in 10 minutes and can only be used once. Do not share it with anyone.\n\nOfficial Support: lenzopartyofficial@gmail.com`,
      html: buildOtpEmailHtml(otp),
    });

    // Email server accepted the message: supersede any previous active OTP for this email & record cooldown
    emailOtpState.latestJtiByEmail[email] = { jti, exp: expiresAt, issuedAt: now };
    emailOtpState.lastSentByEmail[email] = now;
    ipTimestamps.push(now);
    emailOtpIpRequests.set(clientIp, ipTimestamps);
    persistEmailOtpStateToDisk();

    console.info('[Email OTP] Verification email dispatched', {
      email: maskedEmail,
      provider: delivery.provider,
      transportMode: delivery.transportMode,
      messageId: delivery.messageId,
      jtiPrefix: jti.slice(0, 8),
      expiresIn: EMAIL_OTP_TTL_SECONDS,
    });

    return res.json({
      success: true,
      challenge,
      provider: delivery.provider,
      transportMode: delivery.transportMode,
      expiresIn: EMAIL_OTP_TTL_SECONDS,
      cooldownSeconds: Math.floor(EMAIL_OTP_RESEND_COOLDOWN_MS / 1000),
      messageId: delivery.messageId,
    });
  } catch (error: any) {
    const errCode = String(error?.code || '').toUpperCase();
    const responseCode = Number(error?.responseCode || 0);
    const rawMsg = String(error?.message || error || '');

    console.error('[Email OTP] Delivery failed', {
      email: maskedEmail,
      provider: cfg.provider,
      transportMode: cfg.transportMode,
      smtpHost: cfg.provider === 'custom-smtp' ? cfg.smtpHost : null,
      smtpPort: cfg.provider === 'custom-smtp' ? cfg.smtpPort : null,
      errCode,
      responseCode,
      message: rawMsg,
    });

    if (errCode === 'EMAIL_WEBHOOK_ACCESS_ERROR') {
      return res.status(502).json({
        success: false,
        code: 'EMAIL_WEBHOOK_ACCESS_ERROR',
        error: rawMsg,
      });
    }

    if (errCode === 'EMAIL_SENDER_UNVERIFIED') {
      return res.status(502).json({
        success: false,
        code: 'EMAIL_SENDER_UNVERIFIED',
        error:
          'Sender email is not yet verified in Brevo. Verify lenzopartyofficial@gmail.com under Brevo -> Senders & IP, then retry.',
      });
    }

    if (errCode === 'EMAIL_PROVIDER_AUTH_ERROR') {
      return res.status(502).json({
        success: false,
        code: 'EMAIL_PROVIDER_AUTH_ERROR',
        error:
          cfg.provider === 'brevo-http'
            ? 'BREVO_API_KEY was rejected. Check your Brevo SMTP & API key in Railway Variables.'
            : 'EMAIL_WEBHOOK_SECRET did not match the secret configured in your email webhook.',
      });
    }

    if (errCode === 'EMAIL_WEBHOOK_ERROR') {
      return res.status(502).json({
        success: false,
        code: 'EMAIL_WEBHOOK_ERROR',
        error: rawMsg || 'Email webhook could not send the verification code.',
      });
    }

    if (errCode === 'EAUTH' || responseCode === 534 || responseCode === 535) {
      return res.status(502).json({
        success: false,
        code: 'SMTP_AUTH_ERROR',
        error:
          'SMTP authentication failed. For Gmail, enable 2-Step Verification and use a 16-character Google App Password in SMTP_PASS.',
      });
    }

    if (errCode === 'EENVELOPE' || responseCode === 550 || responseCode === 553) {
      return res.status(400).json({
        success: false,
        code: 'SMTP_RECIPIENT_ERROR',
        error: 'Email address could not receive mail. Please double-check the spelling and try again.',
      });
    }

    const isConnectionError =
      errCode === 'ETIMEDOUT' ||
      errCode === 'ESOCKET' ||
      errCode === 'ECONNECTION' ||
      errCode === 'ECONNREFUSED' ||
      errCode === 'ENOTFOUND';

    if (
      isConnectionError &&
      cfg.provider === 'custom-smtp' &&
      isRailwayRuntime() &&
      (cfg.smtpPort === 25 || cfg.smtpPort === 465 || cfg.smtpPort === 587)
    ) {
      return res.status(502).json({
        success: false,
        code: 'RAILWAY_SMTP_BLOCKED',
        error:
          'Railway Trial/Hobby plans block outbound SMTP ports (465/587). Add EMAIL_WEBHOOK_URL (free Gmail Apps Script over HTTPS 443) or BREVO_API_KEY in Railway Variables for instant 6-digit Email OTP delivery.',
      });
    }

    if (isConnectionError) {
      return res.status(502).json({
        success: false,
        code: 'SMTP_CONNECTION_ERROR',
        error: 'Could not connect to the email mail server. Please try again in a moment.',
      });
    }

    return res.status(502).json({
      success: false,
      code: 'SMTP_DELIVERY_FAILED',
      error: 'Could not deliver the verification email right now. Please try again.',
    });
  }
});

app.post('/api/auth/email/verify-otp', (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const otp = String(req.body?.otp || '').replace(/\D/g, '');
  const challenge = String(req.body?.challenge || '').trim();
  const maskedEmail = email ? maskEmailForLog(email) : '<empty>';
  const cfg = getEmailOtpConfig();

  if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
    console.warn('[Email OTP] Verify rejected: invalid email', { email: maskedEmail });
    return res.status(400).json({
      success: false,
      verified: false,
      code: 'INVALID_EMAIL',
      error: 'Enter a valid email address.',
    });
  }

  if (!/^\d{6}$/.test(otp)) {
    console.warn('[Email OTP] Verify rejected: invalid OTP format', {
      email: maskedEmail,
      otpLength: otp.length,
    });
    return res.status(400).json({
      success: false,
      verified: false,
      code: 'INVALID_OTP_FORMAT',
      error: 'Enter the exact 6-digit verification code sent to your email.',
    });
  }

  const verification = verifyEmailOtpChallenge(email, otp, challenge, cfg.emailOtpSecret);
  if (!verification.ok) {
    console.warn('[Email OTP] Verification failed', {
      email: maskedEmail,
      code: verification.code,
    });
    return res.status(verification.status).json({
      success: false,
      verified: false,
      code: verification.code,
      error: verification.error,
    });
  }

  console.info('[Email OTP] Verification succeeded', {
    email: maskedEmail,
    jtiPrefix: verification.jti.slice(0, 8),
  });

  return res.json({
    success: true,
    verified: true,
    email,
    verifiedAt: new Date().toISOString(),
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  const emailOtpCfg = getEmailOtpConfig();
  res.json({
    status: 'ok',
    service: 'lenzo-party-live-backend',
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || (process.env.RAILWAY_ENVIRONMENT ? 'production' : 'development'),
    firebaseProjectId: FIREBASE_PROJECT_ID,
    firestoreDatabaseId: FIRESTORE_DATABASE_ID,
    androidPackageName: ANDROID_PACKAGE_NAME,
    firebaseAndroidAppId: FIREBASE_ANDROID_APP_ID,
    firebaseWebAppId: FIREBASE_WEB_APP_ID,
    agoraConfigured: Boolean(process.env.AGORA_APP_ID && process.env.AGORA_APP_CERTIFICATE),
    emailOtp: {
      configured: emailOtpCfg.configured,
      provider: emailOtpCfg.provider,
      transportMode: emailOtpCfg.transportMode,
      smtpHost: emailOtpCfg.provider === 'custom-smtp' ? emailOtpCfg.smtpHost || null : null,
      smtpPort: emailOtpCfg.provider === 'custom-smtp' ? emailOtpCfg.smtpPort : null,
      smtpSecure: emailOtpCfg.provider === 'custom-smtp' ? emailOtpCfg.smtpSecure : null,
      fromValid: emailOtpCfg.fromValid,
      fromDomain: emailOtpCfg.fromDomain,
      emailOtpSecretExplicit: emailOtpCfg.emailOtpSecretExplicit,
      missingVars: emailOtpCfg.missingVars,
      otpTtlSeconds: EMAIL_OTP_TTL_SECONDS,
      resendCooldownSeconds: Math.floor(EMAIL_OTP_RESEND_COOLDOWN_MS / 1000),
    },
    activeWebSocketClients: pkWss.clients.size,
    activeLiveStreams: liveStreamsMap.size,
    activePartyRooms: partyRoomsMap.size,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
});

// 0b. Firebase Auth Session Verification Endpoints
app.get('/api/auth/verify', async (req: Request, res: Response) => {
  try {
    const verified = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!verified) {
      return res.status(401).json({ authenticated: false, error: 'Missing Bearer token' });
    }
    return res.json({ authenticated: true, user: verified, firebaseProjectId: FIREBASE_PROJECT_ID });
  } catch (err: any) {
    return res.status(401).json({ authenticated: false, error: err?.message || 'Invalid token' });
  }
});

app.post('/api/auth/session', async (req: Request, res: Response) => {
  try {
    const verified = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!verified) {
      return res.status(401).json({ authenticated: false, error: 'Missing Bearer token' });
    }
    return res.json({
      authenticated: true,
      uid: verified.uid,
      email: verified.email,
      emailVerified: verified.emailVerified,
      provider: verified.signInProvider,
      firebaseProjectId: FIREBASE_PROJECT_ID,
    });
  } catch (err: any) {
    return res.status(401).json({ authenticated: false, error: err?.message || 'Invalid Firebase ID token' });
  }
});

// 1. Get REAL eligible active live hosts for PK Battles (zero fake hosts)
app.get('/api/pk/hosts', (_req: Request, res: Response) => {
  const busyHostIds = new Set<string>();
  for (const session of activeSessions.values()) {
    if (session.status === 'in_progress') {
      busyHostIds.add(session.host1.user.id);
      busyHostIds.add(session.host2.user.id);
    }
  }

  const eligibleHosts = Array.from(liveStreamsMap.values())
    .filter((s) => s.isLive && s.host?.id)
    .map((s) => ({
      id: s.host.id,
      displayId: s.host.displayId || s.host.id.slice(0, 8),
      name: s.host.name,
      username: s.host.username || `@${(s.host.name || 'host').toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      avatar: s.host.avatar,
      level: s.host.level || 1,
      viewerCount: formatCompactCount(s.viewers.size),
      isLive: true,
      category: s.category,
      streamTitle: s.title,
      isBusy: busyHostIds.has(s.host.id),
    }));

  res.json({ hosts: eligibleHosts });
});

// 2. Send Invitation
app.post('/api/pk/invite', (req: Request, res: Response) => {
  const { fromHost, toHost, note } = req.body;
  if (!fromHost || !toHost) {
    return res.status(400).json({ error: 'fromHost and toHost are required' });
  }

  // Prevent multiple matches if already in progress
  for (const session of activeSessions.values()) {
    if (session.status === 'in_progress') {
      if (session.host1.user.id === fromHost.id || session.host2.user.id === fromHost.id) {
        return res.status(400).json({ error: 'You are already in an active PK match.' });
      }
      if (session.host1.user.id === toHost.id || session.host2.user.id === toHost.id) {
        return res.status(400).json({ error: 'The selected host is already in a PK match.' });
      }
    }
  }

  const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const invitation: PKMatchInvitation = {
    id: inviteId,
    fromHost,
    toHost,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30000, // 30s timeout
    status: 'pending',
    note: note || 'Challenged you to a 5-Minute PK Live Battle!'
  };

  // Support Test Mode with Auto-Accept functionality
  if (req.body.autoAccept) {
    invitation.status = 'accepted';
    const matchId = `pk_match_${Date.now()}`;
    const now = Date.now();
    const durationMs = 300000; // 5 minutes

    const newSession: PKMatchSession = {
      id: matchId,
      host1: {
        user: fromHost,
        score: 0,
        likes: 0,
        giftsReceivedCount: 0,
        giftsCoinValue: 0,
        isHost: true,
        status: 'connected'
      },
      host2: {
        user: toHost,
        score: 0,
        likes: 0,
        giftsReceivedCount: 0,
        giftsCoinValue: 0,
        isHost: true,
        status: 'connected'
      },
      status: 'in_progress',
      startTime: now,
      durationMs,
      endTime: now + durationMs,
      remainingSeconds: 300,
      scoringRules: {
        pointsPerCoin: 1,
        pointsPerLike: 0
      },
      recentGifts: [],
      recentLikes: []
    };

    activeSessions.set(matchId, newSession);

    // Broadcast instant match start
    broadcastToUser(fromHost.id, 'pk:match_started', { session: newSession, matchId });
    broadcastToUser(toHost.id, 'pk:match_started', { session: newSession, matchId });
    broadcastAll('pk:match_started', { session: newSession, matchId });

    return res.json({ success: true, invitation, session: newSession });
  }

  pendingInvitations.set(inviteId, invitation);

  // Real-time notification to challenged host and broadcast
  broadcastToUser(toHost.id, 'pk:invite_received', invitation);
  void dispatchServerPushToUsers([toHost.id], {
    id: `pk_inv_${inviteId}`,
    type: 'pk',
    title: '⚔️ Incoming PK Battle Challenge!',
    message: `${fromHost.name || 'A live host'} challenged you to a 5-minute PK Battle!`,
    avatar: fromHost.avatar || '',
    senderId: fromHost.id,
    senderName: fromHost.name || '',
    actionType: 'open_pk',
    targetId: inviteId,
    priority: 'urgent',
  }).catch(() => {});
  broadcastAll('pk:invite_announced', {
    fromHostName: fromHost.name,
    toHostName: toHost.name,
    inviteId
  });

  res.json({ success: true, invitation });
});

// 3. Respond to Invitation (Accept / Reject)
app.post('/api/pk/respond', (req: Request, res: Response) => {
  const { inviteId, accept, responderId } = req.body;
  const invitation = pendingInvitations.get(inviteId);

  if (!invitation) {
    return res.status(404).json({ error: 'Invitation not found or expired.' });
  }

  if (invitation.status !== 'pending') {
    return res.status(400).json({ error: `Invitation is already ${invitation.status}.` });
  }

  if (Date.now() > invitation.expiresAt) {
    invitation.status = 'expired';
    return res.status(400).json({ error: 'Invitation has expired.' });
  }

  if (!accept) {
    invitation.status = 'rejected';
    broadcastToUser(invitation.fromHost.id, 'pk:invite_rejected', {
      inviteId,
      byHost: invitation.toHost
    });
    return res.json({ success: true, status: 'rejected' });
  }

  // Accept -> Start Official 5-Minute (300,000ms) PK Session
  invitation.status = 'accepted';
  const matchId = `pk_match_${Date.now()}`;
  const now = Date.now();
  const durationMs = 300000; // 5 minutes

  const newSession: PKMatchSession = {
    id: matchId,
    host1: {
      user: invitation.fromHost,
      score: 0,
      likes: 0,
      giftsReceivedCount: 0,
      giftsCoinValue: 0,
      isHost: true,
      status: 'connected'
    },
    host2: {
      user: invitation.toHost,
      score: 0,
      likes: 0,
      giftsReceivedCount: 0,
      giftsCoinValue: 0,
      isHost: true,
      status: 'connected'
    },
    status: 'in_progress',
    startTime: now,
    durationMs,
    endTime: now + durationMs,
    remainingSeconds: 300,
    scoringRules: {
      pointsPerCoin: 1,
      pointsPerLike: 0
    },
    recentGifts: [],
    recentLikes: []
  };

  activeSessions.set(matchId, newSession);

  // Broadcast Match Started
  broadcastToUser(invitation.fromHost.id, 'pk:match_started', { session: newSession, matchId });
  broadcastToUser(invitation.toHost.id, 'pk:match_started', { session: newSession, matchId });
  broadcastAll('pk:match_started', { session: newSession, matchId });
  void dispatchServerPushToUsers([invitation.fromHost.id], {
    id: `pk_start_${matchId}`,
    type: 'pk',
    title: '🔥 PK Battle Accepted!',
    message: `${invitation.toHost.name || 'Your opponent'} accepted your PK challenge — battle is LIVE!`,
    avatar: invitation.toHost.avatar || '',
    senderId: invitation.toHost.id,
    senderName: invitation.toHost.name || '',
    actionType: 'open_pk',
    targetId: matchId,
    priority: 'high',
  }).catch(() => {});

  res.json({ success: true, session: newSession });
});

// 4. Cancel Outgoing Invitation
app.post('/api/pk/cancel_invite', (req: Request, res: Response) => {
  const { inviteId, hostId } = req.body;
  const invitation = pendingInvitations.get(inviteId);
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation not found.' });
  }

  invitation.status = 'cancelled';
  broadcastToUser(invitation.toHost.id, 'pk:invite_cancelled', { inviteId });
  res.json({ success: true, status: 'cancelled' });
});

// 5. Get Session State
app.get('/api/pk/session/:id', (req: Request, res: Response) => {
  const session = activeSessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  const now = Date.now();
  const remainingSeconds = Math.max(0, Math.ceil((session.endTime - now) / 1000));

  res.json({
    session: {
      ...session,
      remainingSeconds
    },
    serverTime: now
  });
});

// 6. Send Gift during PK Match
app.post('/api/pk/gift', (req: Request, res: Response) => {
  const { matchId, sender, recipientId, gift, quantity, txId } = req.body;

  if (!matchId || !sender || !recipientId || !gift) {
    return res.status(400).json({ error: 'Invalid gift request parameters.' });
  }

  // Deduplication check
  if (txId && processedTransactions.has(txId)) {
    return res.status(200).json({ success: true, message: 'Transaction already processed.' });
  }

  const session = activeSessions.get(matchId);
  if (!session) {
    return res.status(404).json({ error: 'Match session not found.' });
  }

  if (session.status !== 'in_progress') {
    return res.status(400).json({ error: 'Match has already ended.' });
  }

  const cost = gift.coins * (quantity || 1);
  if (sender.coins < cost) {
    return res.status(400).json({ error: 'Insufficient coin balance.' });
  }

  if (txId) {
    processedTransactions.add(txId);
  }

  const pointsToAdd = cost * (session.scoringRules.pointsPerCoin || 1);

  // Apply score to target host
  if (session.host1.user.id === recipientId) {
    session.host1.score += pointsToAdd;
    session.host1.giftsReceivedCount += (quantity || 1);
    session.host1.giftsCoinValue += cost;
  } else if (session.host2.user.id === recipientId) {
    session.host2.score += pointsToAdd;
    session.host2.giftsReceivedCount += (quantity || 1);
    session.host2.giftsCoinValue += cost;
  } else {
    return res.status(400).json({ error: 'Recipient is not a participant in this match.' });
  }

  // Update MVP if highest single contributor
  if (!session.mvp || pointsToAdd > session.mvp.amount) {
    session.mvp = {
      user: sender,
      amount: pointsToAdd,
      recipientId
    };
  }

  const giftEvent: PKGiftEvent = {
    id: `gift_ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    gift,
    sender,
    recipientId,
    quantity: quantity || 1,
    points: pointsToAdd,
    timestamp: Date.now()
  };

  session.recentGifts.unshift(giftEvent);
  if (session.recentGifts.length > 25) {
    session.recentGifts.pop();
  }

  // Real-time broadcast to all viewers in match
  broadcastToMatch(matchId, 'pk:gift_dropped', {
    giftEvent,
    host1Score: session.host1.score,
    host2Score: session.host2.score,
    mvp: session.mvp
  });

  res.json({
    success: true,
    giftEvent,
    host1Score: session.host1.score,
    host2Score: session.host2.score
  });
});

// 7. Double-Tap Like System
app.post('/api/pk/like', (req: Request, res: Response) => {
  const { matchId, recipientId, count = 1, x, y } = req.body;
  const session = activeSessions.get(matchId);
  if (!session) {
    return res.status(404).json({ error: 'Match session not found.' });
  }

  if (session.status !== 'in_progress') {
    return res.status(400).json({ error: 'Match is not active.' });
  }

  const likeCount = Math.min(Math.max(1, count), 10); // cap bursts to 10 per request to prevent spam

  if (session.host1.user.id === recipientId) {
    session.host1.likes += likeCount;
  } else if (session.host2.user.id === recipientId) {
    session.host2.likes += likeCount;
  }

  const likeEvent: PKLikeEvent = {
    id: `like_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    recipientId,
    count: likeCount,
    x,
    y,
    timestamp: Date.now()
  };

  session.recentLikes.unshift(likeEvent);
  if (session.recentLikes.length > 20) {
    session.recentLikes.pop();
  }

  // Broadcast like burst to match
  broadcastToMatch(matchId, 'pk:likes_updated', {
    likeEvent,
    host1Likes: session.host1.likes,
    host2Likes: session.host2.likes
  });

  res.json({
    success: true,
    host1Likes: session.host1.likes,
    host2Likes: session.host2.likes
  });
});

// 8. Forfeit / Cancel Active Match
app.post('/api/pk/forfeit', (req: Request, res: Response) => {
  const { matchId, hostId, reason } = req.body;
  const session = activeSessions.get(matchId);
  if (!session) {
    return res.status(404).json({ error: 'Match session not found.' });
  }

  // Permission check: only active host can forfeit
  if (session.host1.user.id !== hostId && session.host2.user.id !== hostId) {
    return res.status(403).json({ error: 'Unauthorized. Only active PK hosts can forfeit.' });
  }

  if (session.status === 'in_progress') {
    session.status = 'forfeited';
    session.winnerId = session.host1.user.id === hostId ? session.host2.user.id : session.host1.user.id;

    broadcastToMatch(matchId, 'pk:match_cancelled', {
      session,
      forfeitedBy: hostId,
      reason: reason || 'Host forfeited the battle.'
    });
  }

  res.json({ success: true, session });
});

// 9. Match History Endpoint
app.get('/api/pk/history/:userId', (req: Request, res: Response) => {
  const history = matchHistories.get(req.params.userId) || [];
  res.json({ history });
});

// 10. Save Match to History
app.post('/api/pk/history', (req: Request, res: Response) => {
  const { userId, historyItem } = req.body;
  if (!userId || !historyItem) {
    return res.status(400).json({ error: 'userId and historyItem are required.' });
  }

  const list = matchHistories.get(userId) || [];
  matchHistories.set(userId, [historyItem, ...list]);
  res.json({ success: true, history: matchHistories.get(userId) });
});

// --- REAL-TIME PARTY ROOM ENGINE (Dynamic 8 or 16 Seats, Zero Fake Seeds) ---

app.get('/api/rooms', (_req: Request, res: Response) => {
  const rooms = Array.from(partyRoomsMap.values())
    .sort((a, b) => b.startTime - a.startTime)
    .map(serializePartyRoom);
  res.json({ rooms });
});

app.get('/api/rooms/:roomId', (req: Request, res: Response) => {
  const room = partyRoomsMap.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Party room not found or has ended.' });
  }
  res.json({
    room: serializePartyRoom(room),
    pendingRequests: Array.from(room.pendingRequests.values()),
    messages: room.messages.slice(-50),
  });
});

function getServerHostLevel(host: any): number {
  const raw = Number(host?.level ?? 0);
  return Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
}

function clampServerMaxSeatsForHostLevel(requested: any, host: any): 5 | 8 | 16 {
  const hostLevel = getServerHostLevel(host);
  const num = Number(requested);
  if (num === 16 && hostLevel >= 20) return 16;
  if (num === 8 && hostLevel >= 10) return 8;
  if (num === 5 || num === 4) return 5;
  if (hostLevel >= 20) return 16;
  if (hostLevel >= 10) return 8;
  return 5;
}

function isServerSeatLockedByHostLevel(seatIndex: number, host: any): boolean {
  return seatIndex === 1 && getServerHostLevel(host) < 5;
}

function sanitizeRoomBackgroundType(raw: any): 'preset' | 'host_dp' | 'custom' {
  if (raw === 'host_dp' || raw === 'custom' || raw === 'preset') return raw;
  return 'preset';
}

function sanitizeRoomBackgroundImage(raw: any): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image/')) {
    return trimmed.length <= 250000 ? trimmed : '';
  }
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/api/media/')) {
    return trimmed.slice(0, 2000);
  }
  return '';
}

app.post('/api/rooms/create', (req: AuthenticatedRequest, res: Response) => {
  const {
    id,
    displayId,
    title,
    category,
    host,
    coverImage,
    iconType,
    maxSeats,
    roomType,
    password,
    announcement,
    backgroundType,
    backgroundId,
    backgroundImage,
  } = req.body;
  if (!host || !host.id || !title || !String(title).trim()) {
    return res.status(400).json({ error: 'Valid room title and authenticated host are required.' });
  }
  if (req.firebaseUser && req.firebaseUser.uid !== host.id) {
    return res.status(403).json({ error: 'Host ID does not match authenticated user.' });
  }

  const normalizedMaxSeats: 5 | 8 | 16 = clampServerMaxSeatsForHostLevel(maxSeats, host);
  const roomId = sanitizeText(id, 128) || `room_${Date.now()}`;
  const seats = Array(normalizedMaxSeats).fill(null);
  seats[0] = host;
  const safeBgType = sanitizeRoomBackgroundType(backgroundType);
  const safeBgId = sanitizeText(backgroundId, 48) || 'royal_neon';
  const safeBgImage =
    safeBgType === 'host_dp'
      ? sanitizeRoomBackgroundImage(backgroundImage || host?.avatar)
      : safeBgType === 'custom'
      ? sanitizeRoomBackgroundImage(backgroundImage)
      : '';

  const newRoom: ServerPartyRoom = {
    id: roomId,
    displayId: sanitizeText(displayId, 24) || Math.floor(10000 + Math.random() * 90000).toString(),
    title: sanitizeText(title, 100),
    category: sanitizeText(category, 40) || 'Party',
    host,
    coverImage: typeof coverImage === 'string' ? coverImage.slice(0, 2000) : '',
    iconType: sanitizeText(iconType, 20) || 'mic',
    maxSeats: normalizedMaxSeats,
    roomType: roomType === 'private' ? 'private' : roomType === 'secret' ? 'secret' : 'public',
    password: roomType === 'private' && password ? sanitizeText(password, 64) : undefined,
    announcement: sanitizeText(announcement, 250) || 'Welcome to our party voice room!',
    isLocked: false,
    allowJoin: true,
    seats,
    mutedSeatIndices: new Set<number>(),
    pendingRequests: new Map(),
    participants: new Map(),
    recentJoinAnnouncements: new Map(),
    messages: [],
    likesCount: 0,
    giftsCoinValue: 0,
    startTime: Date.now(),
    backgroundType: safeBgType,
    backgroundId: safeBgId,
    backgroundImage: safeBgImage,
  };

  newRoom.participants.set(host.id, {
    userId: host.id,
    name: host.name || 'Host',
    username: host.username,
    avatar: host.avatar || '',
    level: host.level || 1,
    vipLevel: host.vipLevel || 0,
    isVIP: Boolean(host.isVIP),
    joinedAt: Date.now(),
    lastSeen: Date.now(),
    isHost: true,
  });

  serverUsers.set(host.id, host);
  partyRoomsMap.set(roomId, newRoom);
  recordRankingEvent({
    scope: 'party',
    contextId: roomId,
    type: 'host_live',
    actor: host,
    target: host,
  });

  const serialized = serializePartyRoom(newRoom);
  broadcastAll('room:directory_updated', { roomId, action: 'created', room: serialized });

  res.json({ success: true, room: serialized });
});

app.post('/api/rooms/:roomId/join', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { user, password } = req.body;
  const room = partyRoomsMap.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Party room not found or closed.' });
  }
  if (!user || !user.id) {
    return res.status(400).json({ error: 'Authenticated user required to join room.' });
  }
  if (user.id !== room.host.id && isUserBlockedBy(room.host.id, user.id)) {
    return res.status(403).json({ error: 'You cannot join this room because the host has blocked you.' });
  }

  if (room.roomType === 'private' && room.password && user.id !== room.host.id && password !== room.password) {
    return res.status(403).json({ error: 'Incorrect room password.' });
  }

  const now = Date.now();
  const isNewParticipant = !room.participants.has(user.id);
  const lastBannerAt = room.recentJoinAnnouncements.get(user.id) || 0;
  const shouldEmitBanner = isNewParticipant && now - lastBannerAt > 15000 && user.id !== room.host.id;

  const viewerRecord: ServerViewerRecord = {
    userId: user.id,
    name: user.name || 'Guest',
    username: user.username,
    avatar: user.avatar || '',
    level: user.level || 1,
    vipLevel: user.vipLevel || 0,
    isVIP: Boolean(user.isVIP),
    joinedAt: room.participants.get(user.id)?.joinedAt || now,
    lastSeen: now,
    isHost: user.id === room.host.id,
  };
  room.participants.set(user.id, viewerRecord);
  serverUsers.set(user.id, user);
  cacheRankingUser(user);
  if (isNewParticipant && user.id !== room.host.id) {
    recordRankingEvent({
      scope: 'party',
      contextId: roomId,
      type: 'viewer_join',
      actor: user,
      target: room.host,
    });
  }

  const serialized = serializePartyRoom(room);
  const participantsSnapshot = Array.from(room.participants.values()).sort((a, b) => b.joinedAt - a.joinedAt);
  if (shouldEmitBanner) {
    room.recentJoinAnnouncements.set(user.id, now);
    broadcastToRoom(roomId, 'room:participant_joined', {
      roomId,
      participant: viewerRecord,
      participants: participantsSnapshot,
      room: serialized,
    });
  } else {
    broadcastToRoom(roomId, 'room:state_updated', {
      roomId,
      participants: participantsSnapshot,
      room: serialized,
    });
  }
  broadcastAll('room:directory_updated', { roomId, action: 'updated', room: serialized });

  res.json({
    success: true,
    room: serialized,
    participants: participantsSnapshot,
    pendingRequests: Array.from(room.pendingRequests.values()),
    messages: room.messages.slice(-50),
  });
});

app.post('/api/rooms/:roomId/heartbeat', (req: Request, res: Response) => {
  const room = partyRoomsMap.get(req.params.roomId);
  const { userId } = req.body;
  if (!room) {
    return res.status(404).json({ error: 'Party room closed or not found.' });
  }
  if (userId && room.participants.has(userId)) {
    const now = Date.now();
    room.participants.get(userId)!.lastSeen = now;
    if (userId !== room.host.id) {
      const creditKey = `party:${room.id}:${userId}`;
      const lastCredit = lastWatchCreditMap.get(creditKey) || 0;
      if (now - lastCredit >= 30000) {
        lastWatchCreditMap.set(creditKey, now);
        recordRankingEvent({
          scope: 'party',
          contextId: room.id,
          type: 'viewer_watch',
          actorId: userId,
          target: room.host,
          quantity: 1,
        });
      }
    }
  }
  res.json({ success: true, numericParticipants: room.participants.size });
});

app.post('/api/rooms/:roomId/leave', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { userId } = req.body;
  const room = partyRoomsMap.get(roomId);
  if (!room) {
    return res.json({ success: true });
  }

  if (userId) {
    room.participants.delete(userId);
    if (room.pendingRequests.has(userId)) {
      room.pendingRequests.delete(userId);
      broadcastToRoom(roomId, 'room:seat_request_cancelled', { roomId, userId });
    }
    const seatIdx = room.seats.findIndex((s) => s && s.id === userId);
    if (seatIdx >= 0) {
      const removedUser = room.seats[seatIdx];
      room.seats[seatIdx] = null;
      room.mutedSeatIndices.delete(seatIdx);
      broadcastToRoom(roomId, 'room:seat_vacated', {
        roomId,
        seatIndex: seatIdx,
        removedUser,
        room: serializePartyRoom(room),
      });
    }
    const serialized = serializePartyRoom(room);
    broadcastToRoom(roomId, 'webrtc:room_peer_left', { roomId, fromUserId: userId });
    const participantsSnapshot = Array.from(room.participants.values()).sort((a, b) => b.joinedAt - a.joinedAt);
    broadcastToRoom(roomId, 'room:participant_left', {
      roomId,
      userId,
      participants: participantsSnapshot,
      room: serialized,
    });
    broadcastAll('room:directory_updated', { roomId, action: 'updated', room: serialized });
  }

  res.json({ success: true });
});

app.post('/api/rooms/:roomId/end', (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const hostId = req.firebaseUser?.uid || req.body?.hostId;
  const room = partyRoomsMap.get(roomId);
  if (!room) {
    return res.json({ success: true, alreadyClosed: true });
  }
  if (room.host?.id !== hostId && !isVerifiedAdmin(req)) {
    return res.status(403).json({ error: 'Only the room host can close this party room.' });
  }

  partyRoomsMap.delete(roomId);
  broadcastToRoom(roomId, 'room:closed', { roomId, reason: 'Host ended the party room.' });
  broadcastAll('room:directory_updated', { roomId, action: 'ended' });
  res.json({ success: true });
});

app.get('/api/rooms/:roomId/participants', (req: Request, res: Response) => {
  const room = partyRoomsMap.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
  const all = Array.from(room.participants.values()).sort((a, b) => b.joinedAt - a.joinedAt);
  const start = (page - 1) * limit;
  const slice = all.slice(start, start + limit);
  res.json({
    participants: slice,
    totalCount: all.length,
    page,
    limit,
    hasMore: start + slice.length < all.length,
  });
});

app.get('/api/rooms/:roomId/seats', (req: Request, res: Response) => {
  const room = partyRoomsMap.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.', seats: [], mutedSeatIndices: [], pendingRequests: [] });
  }
  res.json({
    seats: room.seats,
    mutedSeatIndices: Array.from(room.mutedSeatIndices),
    pendingRequests: Array.from(room.pendingRequests.values()),
    isLocked: room.isLocked,
    allowJoin: room.allowJoin,
    maxSeats: room.maxSeats,
  });
});

function ensurePartyRoomHydrated(
  roomId: string,
  meta?: { host?: any; title?: string; maxSeats?: number } | null,
  fallbackHostId?: string
): ServerPartyRoom | null {
  const existing = partyRoomsMap.get(roomId);
  if (existing) return existing;
  const hostObj = meta?.host?.id
    ? meta.host
    : fallbackHostId
    ? serverUsers.get(fallbackHostId) || { id: fallbackHostId, name: 'Host', avatar: '' }
    : null;
  if (!hostObj || !hostObj.id) return null;

  const maxSeats = clampServerMaxSeatsForHostLevel(meta?.maxSeats, hostObj);
  const seats: (any | null)[] = Array(maxSeats).fill(null);
  seats[0] = hostObj;

  const hydrated: ServerPartyRoom = {
    id: roomId,
    displayId: roomId.replace(/\D/g, '').slice(-5) || String(Math.floor(10000 + Math.random() * 90000)),
    title: String(meta?.title || `${hostObj.name || 'Host'}'s Party Room`),
    category: 'Party',
    host: hostObj,
    coverImage: hostObj.avatar || '',
    iconType: 'heart',
    maxSeats,
    roomType: 'public',
    announcement: 'Welcome! Hop on a seat, respect everyone & enjoy the party.',
    seats,
    mutedSeatIndices: new Set<number>(),
    isLocked: false,
    allowJoin: true,
    startTime: Date.now(),
    likesCount: 0,
    giftsCoinValue: 0,
    participants: new Map(),
    pendingRequests: new Map(),
    messages: [],
    recentJoinAnnouncements: new Map(),
    backgroundType: 'preset',
    backgroundId: 'royal_neon',
    backgroundImage: '',
  };
  partyRoomsMap.set(roomId, hydrated);
  return hydrated;
}

app.post('/api/rooms/:roomId/request_seat', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { user, requestedSeatIndex, seatIndex, roomHostId, roomMeta } = req.body;
  if (!user || !user.id) {
    return res.status(400).json({ error: 'Valid user object required.' });
  }

  const room = ensurePartyRoomHydrated(roomId, roomMeta, roomHostId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found or already closed.' });
  }
  if (user.id !== room.host.id && isUserBlockedBy(room.host.id, user.id)) {
    return res.status(403).json({ error: 'You cannot request a seat because the host has blocked you.' });
  }
  if (!room.allowJoin || room.isLocked) {
    return res.status(403).json({ error: 'Stage seats are currently locked by host.' });
  }
  if (room.host?.id === user.id) {
    return res.status(400).json({ error: 'Room host already holds stage authority.' });
  }
  if (room.seats.some((s) => s && s.id === user.id)) {
    return res.status(400).json({ error: 'You already occupy a seat in this room.' });
  }

  const rawIdx = typeof requestedSeatIndex === 'number' ? requestedSeatIndex : seatIndex;
  const safeMaxSeats = clampServerMaxSeatsForHostLevel(room.maxSeats, room.host);
  if (typeof rawIdx === 'number' && rawIdx >= safeMaxSeats) {
    return res.status(403).json({
      error: rawIdx >= 8 ? '16-seat stage unlocks at Host Level 20.' : '8-seat stage unlocks at Host Level 10.',
    });
  }
  const defaultIdx = isServerSeatLockedByHostLevel(1, room.host) ? 2 : 1;
  const idx = typeof rawIdx === 'number' && rawIdx >= 0 && rawIdx < safeMaxSeats ? rawIdx : defaultIdx;
  if (isServerSeatLockedByHostLevel(idx, room.host)) {
    return res.status(403).json({ error: 'Seat #2 is locked until the host reaches Level 5.' });
  }
  const existingReq = room.pendingRequests.get(user.id);
  const requestId = existingReq?.id || `seat_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const requestObj = {
    id: requestId,
    roomId,
    user,
    requestedSeatIndex: idx,
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now() + 180000,
  };

  room.pendingRequests.set(user.id, requestObj);
  broadcastToUser(room.host.id, 'room:seat_request_received', requestObj);
  broadcastToRoom(roomId, 'room:seat_request_updated', { roomId, requestObj });

  res.json({ success: true, request: requestObj });
});

app.post('/api/rooms/:roomId/cancel_seat_request', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { userId } = req.body;
  const room = partyRoomsMap.get(roomId);
  if (room && room.pendingRequests.has(userId)) {
    room.pendingRequests.delete(userId);
    broadcastToRoom(roomId, 'room:seat_request_cancelled', { roomId, userId });
  }
  res.json({ success: true });
});

app.post('/api/rooms/:roomId/respond_seat_request', (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const hostId = req.firebaseUser?.uid || req.body?.hostId;
  const { applicantId, approve, targetSeatIndex, applicantUser } = req.body;
  const room = ensurePartyRoomHydrated(roomId, null, hostId);

  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }
  if (room.host.id !== hostId) {
    return res.status(403).json({ error: 'Permission denied. Only the room host can approve or reject seat requests.' });
  }

  const requestObj = room.pendingRequests.get(applicantId) || (
    applicantUser && applicantUser.id
      ? {
          id: `fs_req_${Date.now()}`,
          roomId,
          user: applicantUser,
          requestedSeatIndex: typeof targetSeatIndex === 'number' ? targetSeatIndex : 1,
          status: 'pending',
          createdAt: Date.now(),
          expiresAt: Date.now() + 60000,
        }
      : null
  );
  if (!requestObj) {
    return res.status(404).json({ error: 'Seat request not found or expired.' });
  }

  room.pendingRequests.delete(applicantId);

  if (!approve) {
    requestObj.status = 'rejected';
    broadcastToUser(applicantId, 'room:seat_request_rejected', { roomId });
    broadcastToRoom(roomId, 'room:seat_request_cancelled', { roomId, userId: applicantId });
    return res.json({ success: true, status: 'rejected' });
  }

  let seatIdx = typeof targetSeatIndex === 'number' ? targetSeatIndex : requestObj.requestedSeatIndex;
  if (
    seatIdx < 0 ||
    seatIdx >= room.maxSeats ||
    room.seats[seatIdx] !== null ||
    isServerSeatLockedByHostLevel(seatIdx, room.host)
  ) {
    seatIdx = room.seats.findIndex((s, idx) => s === null && !isServerSeatLockedByHostLevel(idx, room.host));
  }
  if (seatIdx === -1) {
    return res.status(400).json({ error: 'All unlocked stage seats are currently occupied.' });
  }

  // Clear applicant from any previous seat
  for (let i = 0; i < room.seats.length; i++) {
    if (room.seats[i]?.id === applicantId) {
      room.seats[i] = null;
      room.mutedSeatIndices.delete(i);
    }
  }
  room.seats[seatIdx] = requestObj.user;
  requestObj.status = 'accepted';

  // Issue fresh Agora broadcaster RTC token for the newly promoted speaker
  const agoraChannel = `party_${roomId}`;
  const promotedAgora = mintAgoraRtcToken(agoraChannel, String(applicantId), 'broadcaster');

  const serialized = serializePartyRoom(room);
  broadcastToRoom(roomId, 'room:seat_occupied', {
    roomId,
    seatIndex: seatIdx,
    user: requestObj.user,
    room: serialized,
  });
  broadcastToUser(applicantId, 'room:seat_request_accepted', {
    roomId,
    seatIndex: seatIdx,
    agoraChannel,
    agoraAppId: promotedAgora.appId || undefined,
    agoraToken: promotedAgora.token || undefined,
    agoraExpiresAt: promotedAgora.expiresAt || undefined,
  });
  broadcastAll('room:directory_updated', { roomId, action: 'updated', room: serialized });

  res.json({
    success: true,
    seatIndex: seatIdx,
    seats: room.seats,
    room: serialized,
    agoraChannel,
    agoraToken: promotedAgora.token || null,
    agoraAppId: promotedAgora.appId || '',
    agoraExpiresAt: promotedAgora.expiresAt || null,
  });
});

app.post('/api/rooms/:roomId/remove_seat', (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const hostId = req.firebaseUser?.uid || req.body?.hostId;
  const { seatIndex, targetUserId, roomMeta } = req.body || {};
  const room = ensurePartyRoomHydrated(roomId, roomMeta, hostId);

  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }
  if (room.host.id !== hostId) {
    return res.status(403).json({ error: 'Unauthorized. Only room host can kick participants from seats.' });
  }

  let resolvedSeatIdx =
    typeof seatIndex === 'number' && seatIndex >= 0 && seatIndex < room.maxSeats
      ? seatIndex
      : -1;

  if (
    resolvedSeatIdx === -1 &&
    typeof targetUserId === 'string' &&
    targetUserId.trim()
  ) {
    resolvedSeatIdx = room.seats.findIndex((s) => s && s.id === targetUserId.trim());
  }

  if (resolvedSeatIdx >= 0 && resolvedSeatIdx < room.maxSeats) {
    const removedUser = room.seats[resolvedSeatIdx];
    if (removedUser && removedUser.id === hostId) {
      return res.status(400).json({ error: 'Use Leave Seat to step down from your own seat.' });
    }
    room.seats[resolvedSeatIdx] = null;
    room.mutedSeatIndices.delete(resolvedSeatIdx);
    // Also clear any duplicate occurrence of targetUserId if present
    if (typeof targetUserId === 'string' && targetUserId.trim()) {
      for (let i = 0; i < room.seats.length; i++) {
        if (room.seats[i]?.id === targetUserId.trim() && room.seats[i]?.id !== hostId) {
          room.seats[i] = null;
          room.mutedSeatIndices.delete(i);
        }
      }
    }
    const serialized = serializePartyRoom(room);
    broadcastToRoom(roomId, 'room:seat_vacated', {
      roomId,
      seatIndex: resolvedSeatIdx,
      removedUser,
      kicked: true,
      room: serialized,
    });
    if (removedUser?.id) {
      broadcastToUser(removedUser.id, 'room:seat_kicked', {
        roomId,
        seatIndex: resolvedSeatIdx,
        hostName: room.host?.name || 'Host',
      });
    }
    broadcastAll('room:directory_updated', { roomId, action: 'updated', room: serialized });
    return res.json({
      success: true,
      kicked: true,
      seatIndex: resolvedSeatIdx,
      seats: room.seats,
      mutedSeatIndices: Array.from(room.mutedSeatIndices),
      room: serialized,
    });
  }

  res.json({
    success: true,
    seats: room.seats,
    mutedSeatIndices: Array.from(room.mutedSeatIndices),
    room: serializePartyRoom(room),
  });
});

app.post('/api/rooms/:roomId/leave_seat', (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const userId = req.firebaseUser?.uid || req.body?.userId;
  const { roomMeta, roomHostId } = req.body || {};
  const room = ensurePartyRoomHydrated(roomId, roomMeta, roomHostId);
  if (!room) {
    return res.json({ success: true, seats: [] });
  }
  // Allow both Host (Seat 0 or any seat) and Audience speakers to step down cleanly
  const seatIdx = room.seats.findIndex((s) => s && s.id === userId);
  if (seatIdx >= 0) {
    const removedUser = room.seats[seatIdx];
    room.seats[seatIdx] = null;
    room.mutedSeatIndices.delete(seatIdx);
    const serialized = serializePartyRoom(room);
    broadcastToRoom(roomId, 'room:seat_vacated', { roomId, seatIndex: seatIdx, removedUser, room: serialized });
    broadcastAll('room:directory_updated', { roomId, action: 'updated', room: serialized });
  }
  res.json({ success: true, seats: room.seats, room: serializePartyRoom(room) });
});

app.post('/api/rooms/:roomId/take_seat', (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const hostId = req.firebaseUser?.uid || req.body?.hostId;
  const { seatIndex, user, roomMeta } = req.body;
  const room = ensurePartyRoomHydrated(roomId, roomMeta, hostId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }
  if (room.host.id !== hostId) {
    return res.status(403).json({ error: 'Only host can assign seats directly.' });
  }
  const safeMaxSeats = clampServerMaxSeatsForHostLevel(room.maxSeats, room.host);
  if (typeof seatIndex === 'number' && seatIndex >= 0 && seatIndex < safeMaxSeats && user?.id) {
    if (isServerSeatLockedByHostLevel(seatIndex, room.host)) {
      return res.status(403).json({ error: 'Seat #2 unlocks when the host reaches Level 5.' });
    }
    // Ensure user does not occupy two seats at once
    const existingIdx = room.seats.findIndex((s) => s && s.id === user.id);
    if (existingIdx >= 0 && existingIdx !== seatIndex) {
      room.seats[existingIdx] = null;
      room.mutedSeatIndices.delete(existingIdx);
    }
    room.seats[seatIndex] = user;
    const serialized = serializePartyRoom(room);
    broadcastToRoom(roomId, 'room:seat_occupied', { roomId, seatIndex, user, room: serialized });
    broadcastAll('room:directory_updated', { roomId, action: 'updated', room: serialized });
  } else if (typeof seatIndex === 'number' && seatIndex >= safeMaxSeats) {
    return res.status(403).json({
      error: seatIndex >= 8 ? '16-seat stage unlocks at Host Level 20.' : '8-seat stage unlocks at Host Level 10.',
    });
  }
  res.json({ success: true, seats: room.seats, room: serializePartyRoom(room) });
});

app.post('/api/rooms/:roomId/mute_seat', (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const hostId = req.firebaseUser?.uid || req.body?.hostId;
  const { seatIndex, muted } = req.body;
  const room = partyRoomsMap.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }
  if (room.host.id !== hostId) {
    return res.status(403).json({ error: 'Only room host can mute or unmute stage seats.' });
  }
  if (typeof seatIndex === 'number' && seatIndex >= 0 && seatIndex < room.maxSeats) {
    if (muted) {
      room.mutedSeatIndices.add(seatIndex);
    } else {
      room.mutedSeatIndices.delete(seatIndex);
    }
    broadcastToRoom(roomId, 'room:seat_muted', {
      roomId,
      seatIndex,
      muted: Boolean(muted),
      mutedSeatIndices: Array.from(room.mutedSeatIndices),
    });
  }
  res.json({ success: true, mutedSeatIndices: Array.from(room.mutedSeatIndices) });
});

app.post('/api/rooms/:roomId/settings', (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const hostId = req.firebaseUser?.uid || req.body?.hostId;
  const {
    isLocked,
    allowJoin,
    announcement,
    maxSeats,
    backgroundType,
    backgroundId,
    backgroundImage,
  } = req.body;
  const room = partyRoomsMap.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }
  if (room.host.id !== hostId) {
    return res.status(403).json({ error: 'Only host can change room settings.' });
  }
  if (typeof isLocked === 'boolean') room.isLocked = isLocked;
  if (typeof allowJoin === 'boolean') room.allowJoin = allowJoin;
  if (typeof announcement === 'string') room.announcement = sanitizeText(announcement, 250);
  if (backgroundType !== undefined) {
    room.backgroundType = sanitizeRoomBackgroundType(backgroundType);
  }
  if (typeof backgroundId === 'string' && backgroundId.trim()) {
    room.backgroundId = sanitizeText(backgroundId, 48) || 'royal_neon';
  }
  if (backgroundImage !== undefined) {
    room.backgroundImage =
      room.backgroundType === 'host_dp'
        ? sanitizeRoomBackgroundImage(backgroundImage || room.host?.avatar)
        : room.backgroundType === 'custom'
        ? sanitizeRoomBackgroundImage(backgroundImage)
        : '';
  }
  if (typeof maxSeats === 'number') {
    const allowedMax = clampServerMaxSeatsForHostLevel(maxSeats, room.host);
    if (allowedMax !== room.maxSeats) {
      const nextSeats = Array(allowedMax).fill(null);
      for (let i = 0; i < Math.min(allowedMax, room.seats.length); i++) {
        if (room.seats[i] && !isServerSeatLockedByHostLevel(i, room.host)) {
          nextSeats[i] = room.seats[i];
        }
      }
      room.maxSeats = allowedMax;
      room.seats = nextSeats;
      room.mutedSeatIndices = new Set(Array.from(room.mutedSeatIndices).filter((idx) => idx < allowedMax));
    }
  }

  const serialized = serializePartyRoom(room);
  broadcastToRoom(roomId, 'room:settings_updated', { roomId, room: serialized });
  broadcastAll('room:directory_updated', { roomId, action: 'updated', room: serialized });
  res.json({ success: true, room: serialized });
});

app.post('/api/rooms/:roomId/chat', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { sender, text } = req.body;
  const room = partyRoomsMap.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }
  if (!sender || !sender.id) {
    return res.status(400).json({ error: 'Authenticated sender required.' });
  }
  if (sender.id !== room.host.id && isUserBlockedBy(room.host.id, sender.id)) {
    return res.status(403).json({ error: 'You cannot send messages in this room because the host has blocked you.' });
  }
  const cleanText = sanitizeText(text, 300);
  if (!cleanText) {
    return res.status(400).json({ error: 'Message text cannot be empty.' });
  }
  const now = Date.now();
  const lastAt = lastCommentTimeMap.get(sender.id) || 0;
  if (now - lastAt < 750) {
    return res.status(429).json({ error: 'You are sending messages too fast. Please wait a moment.' });
  }
  lastCommentTimeMap.set(sender.id, now);

  const chatMsg = {
    id: `rm_${now}_${Math.random().toString(36).substring(2, 6)}`,
    senderId: sender.id,
    senderName: sender.name || 'Guest',
    senderAvatar: sender.avatar || '',
    senderVip: sender.vipLevel || 0,
    isHost: sender.id === room.host?.id,
    text: cleanText,
    timestamp: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAtMillis: now,
  };
  room.messages.push(chatMsg);
  if (room.messages.length > 200) room.messages.shift();
  recordRankingEvent({
    scope: 'party',
    contextId: roomId,
    type: 'comment',
    actor: sender,
    target: room.host,
    quantity: 1,
  });

  broadcastToRoom(roomId, 'room:chat', { roomId, message: chatMsg });
  res.json({ success: true, message: chatMsg });
});

app.post('/api/rooms/:roomId/heart', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { senderId, userId, senderName, count = 1, x, y, roomHostId, roomMeta } = req.body || {};
  const heartSenderId = senderId || userId || '';
  const room = ensurePartyRoomHydrated(roomId, roomMeta, roomHostId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }
  if (heartSenderId && heartSenderId !== room.host.id && isUserBlockedBy(room.host.id, heartSenderId)) {
    return res.status(403).json({ error: 'You cannot interact with this room because the host has blocked you.' });
  }
  const now = Date.now();
  const lastAt = lastHeartTimeMap.get(heartSenderId || 'anon') || 0;
  if (now - lastAt < 120) {
    return res.json({ success: true, likesCount: room.likesCount, throttled: true });
  }
  lastHeartTimeMap.set(heartSenderId || 'anon', now);

  const delta = Math.min(Math.max(1, Math.round(Number(count) || 1)), 20);
  room.likesCount += delta;
  if (heartSenderId) {
    recordRankingEvent({
      scope: 'party',
      contextId: roomId,
      type: 'heart',
      actorId: heartSenderId,
      target: room.host,
      quantity: delta,
    });
  }

  const safeX = typeof x === 'number' && Number.isFinite(x) ? Math.max(5, Math.min(95, x)) : undefined;
  const safeY = typeof y === 'number' && Number.isFinite(y) ? Math.max(10, Math.min(90, y)) : undefined;

  broadcastToRoom(roomId, 'room:heart', {
    roomId,
    userId: heartSenderId,
    senderId: heartSenderId,
    senderName: typeof senderName === 'string' ? senderName.slice(0, 60) : undefined,
    likesCount: room.likesCount,
    delta,
    count: delta,
    x: safeX,
    y: safeY,
    timestamp: now,
  });
  res.json({ success: true, likesCount: room.likesCount, delta });
});

app.post('/api/rooms/:roomId/gift', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { sender, recipient, gift, quantity = 1 } = req.body;
  const room = partyRoomsMap.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }
  if (sender?.id && (isUserBlockedBy(room.host.id, sender.id) || (recipient?.id && isUserBlockedBy(recipient.id, sender.id)))) {
    return res.status(403).json({ error: 'You cannot send gifts to a user who has blocked you.' });
  }
  const qty = Math.max(1, Number(quantity) || 1);
  const totalCoins = Math.max(0, Number(gift?.coins || 0) * qty);
  room.giftsCoinValue += totalCoins;

  const targetHost = recipient?.id ? recipient : room.host;
  const metric = ensureBroadcasterMetric(targetHost);
  if (metric) {
    metric.giftsCoinValue += totalCoins;
    metric.giftsCount += qty;
  }
  if (sender?.id) {
    const cRec = contributorMetricsMap.get(sender.id) || {
      user: sender,
      coinsSpent: 0,
      giftsSentCount: 0,
      lastActiveAt: Date.now(),
    };
    cRec.user = { ...cRec.user, ...sender };
    cRec.coinsSpent += totalCoins;
    cRec.giftsSentCount += qty;
    cRec.lastActiveAt = Date.now();
    contributorMetricsMap.set(sender.id, cRec);

    recordRankingEvent({
      scope: 'party',
      contextId: roomId,
      type: 'gift',
      actor: sender,
      target: targetHost,
      coins: totalCoins,
      quantity: qty,
    });
  }

  const eventPayload = {
    roomId,
    sender,
    recipient: targetHost,
    gift,
    quantity: qty,
    totalCoins,
    timestamp: Date.now(),
  };
  broadcastToRoom(roomId, 'room:gift', eventPayload);
  res.json({ success: true, ...eventPayload });
});

// --- VIDEO UPLOAD & FEED ENDPOINTS ---
const serverVideos: any[] = [];

app.get('/api/videos', (_req: Request, res: Response) => {
  res.json({ videos: serverVideos });
});

app.post('/api/videos/upload', (req: Request, res: Response) => {
  const { video } = req.body;
  if (!video || !video.creator || !video.description) {
    return res.status(400).json({ error: 'Video details and creator information required.' });
  }

  const newVideo = {
    ...video,
    id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    repostsCount: 0,
    createdAt: 'Just now'
  };

  serverVideos.unshift(newVideo);
  broadcastAll('video:new_published', newVideo);

  res.json({ success: true, video: newVideo });
});

// --- REAL USER PROFILES, SOCIAL GRAPH & FOLLOWS (ZERO FAKE OFFSETS) ---

const userFollowersMap = new Map<string, Set<string>>();
const userFollowingMap = new Map<string, Set<string>>();

app.post('/api/users/sync', (req: AuthenticatedRequest, res: Response) => {
  const { user } = req.body;
  if (!user || !user.id) {
    return res.status(400).json({ error: 'Valid user object required.' });
  }
  if (req.firebaseUser && req.firebaseUser.uid !== user.id) {
    return res.status(403).json({ error: 'Cannot sync profile for another user.' });
  }
  const existing = serverUsers.get(user.id) || {};
  const merged = { ...existing, ...user };
  serverUsers.set(user.id, merged);
  cacheRankingUser(merged);
  res.json({ success: true, user: merged });
});

app.get('/api/users/search', (req: Request, res: Response) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  const users = Array.from(serverUsers.values()).filter((u) => {
    if (!q) return true;
    return (
      u.name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.displayId?.toLowerCase().includes(q)
    );
  });
  res.json({ users: users.slice(0, 30) });
});

app.get('/api/users/check_username', (req: Request, res: Response) => {
  const username = String(req.query.username || '').toLowerCase().trim().replace(/^@/, '');
  const userId = String(req.query.userId || '');

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return res.json({ available: false, message: 'Username must be 3-20 letters, numbers, or underscores.' });
  }

  for (const [id, user] of serverUsers.entries()) {
    if (id !== userId && user.username?.toLowerCase().replace(/^@/, '') === username) {
      return res.json({ available: false, message: 'This username is already taken. Please choose another.' });
    }
  }

  res.json({ available: true });
});

app.get('/api/users/blocks', (req: AuthenticatedRequest, res: Response) => {
  const uid = req.firebaseUser?.uid || (typeof req.query.userId === 'string' ? req.query.userId : '');
  if (!uid) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const myMap = blockedRecordsByBlocker.get(uid);
  const blockedUsers = myMap ? Array.from(myMap.values()) : [];
  const blockedIds = blockedUsers.map((r) => r.blockedUserId);
  const blockedByIds: string[] = [];
  blockedRecordsByBlocker.forEach((inner, blockerId) => {
    if (inner.has(uid)) blockedByIds.push(blockerId);
  });

  return res.json({ blockedIds, blockedByIds, blockedUsers });
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const userId = req.params.id;
  const user = serverUsers.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const followers = userFollowersMap.get(userId) || new Set();
  const following = userFollowingMap.get(userId) || new Set();
  const userVideosList = serverVideos.filter((v) => v.creator?.id === userId);
  const totalLikes = userVideosList.reduce((acc, v) => acc + (v.likesCount || 0), 0);

  res.json({
    user: {
      ...user,
      followersCount: followers.size,
      fansCount: formatCompactCount(followers.size),
      followingCount: following.size,
      totalLikes,
      likesCount: formatCompactCount(totalLikes),
    },
  });
});

app.put('/api/users/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.params.id;
  if (!req.firebaseUser) {
    return res.status(401).json({ error: 'Authentication required to update this user profile.' });
  }
  if (req.firebaseUser.uid !== userId) {
    return res.status(403).json({ error: 'Forbidden: you can only update your own user profile.' });
  }

  const existing = serverUsers.get(userId) || {
    id: userId,
    displayId: userId.substring(0, 6).toUpperCase(),
    name: req.body?.name || 'Lenzo User',
    username: req.body?.username || `@${userId.slice(0, 8).toLowerCase()}`,
    avatar: req.body?.avatar || '',
    coverImage: req.body?.coverImage || '',
    bio: req.body?.bio || '',
    level: 1,
    vipLevel: 0,
    isVIP: false,
    coins: 0,
    diamonds: 0,
    gender: 'unspecified',
    country: '',
    birthday: '',
  };

  const {
    name,
    username,
    bio,
    avatar,
    coverImage,
    gender,
    country,
    birthday,
    showGender,
    showAge,
    showOnlineStatus,
    equippedBadges,
    agencyId,
    agencyName,
    agencyCode,
    agencyLogo,
    agencyRole,
    agencyStatus,
    crewName,
    crewBadge,
    savedVideoIds,
    likedVideoIds,
  } = req.body;

  if (username) {
    const clean = String(username).toLowerCase().trim().replace(/^@/, '');
    for (const [id, u] of serverUsers.entries()) {
      if (id !== userId && u.username?.toLowerCase().replace(/^@/, '') === clean) {
        return res.status(400).json({ error: 'Username is already taken by another user.' });
      }
    }
    existing.username = `@${clean}`;
  }

  if (name) existing.name = sanitizeText(name, 60);
  if (typeof bio === 'string') existing.bio = sanitizeText(bio, 300);
  if (typeof avatar === 'string' && avatar.length <= 1500) existing.avatar = avatar;
  if (typeof coverImage === 'string' && coverImage.length <= 1500) existing.coverImage = coverImage;
  if (gender) existing.gender = gender;
  if (typeof country === 'string') existing.country = sanitizeText(country, 64);
  if (typeof birthday === 'string') existing.birthday = sanitizeText(birthday, 32);
  if (typeof showGender === 'boolean') existing.showGender = showGender;
  if (typeof showAge === 'boolean') existing.showAge = showAge;
  if (typeof showOnlineStatus === 'boolean') existing.showOnlineStatus = showOnlineStatus;
  if (Array.isArray(equippedBadges)) existing.equippedBadges = equippedBadges.slice(0, 3).map(String);
  if (typeof agencyId === 'string') existing.agencyId = sanitizeText(agencyId, 64);
  if (typeof agencyName === 'string') existing.agencyName = sanitizeText(agencyName, 64);
  if (typeof agencyCode === 'string') existing.agencyCode = sanitizeText(agencyCode, 32);
  if (typeof agencyLogo === 'string') existing.agencyLogo = agencyLogo.slice(0, 500);
  if (typeof agencyRole === 'string') existing.agencyRole = agencyRole;
  if (typeof agencyStatus === 'string') existing.agencyStatus = agencyStatus;
  if (typeof crewName === 'string') existing.crewName = sanitizeText(crewName, 48);
  if (typeof crewBadge === 'string') existing.crewBadge = sanitizeText(crewBadge, 24);
  if (Array.isArray(savedVideoIds)) existing.savedVideoIds = savedVideoIds.slice(0, 200).map(String);
  if (Array.isArray(likedVideoIds)) existing.likedVideoIds = likedVideoIds.slice(0, 200).map(String);

  serverUsers.set(userId, existing);

  const followers = userFollowersMap.get(userId) || new Set();
  const following = userFollowingMap.get(userId) || new Set();
  const userVideosList = serverVideos.filter((v) => v.creator?.id === userId);
  const totalLikes = userVideosList.reduce((acc, v) => acc + (v.likesCount || 0), 0);

  res.json({
    success: true,
    user: {
      ...existing,
      followersCount: followers.size,
      fansCount: formatCompactCount(followers.size),
      followingCount: following.size,
      totalLikes,
      likesCount: formatCompactCount(totalLikes),
    },
  });
});

app.get('/api/users/resolve/:identifier', (req: Request, res: Response) => {
  const raw = decodeURIComponent(req.params.identifier || '').trim();
  const lower = raw.toLowerCase();
  const cleanHandle = lower.replace(/^@/, '');

  let found = serverUsers.get(raw);
  if (!found) {
    for (const u of serverUsers.values()) {
      const uHandle = (u.username || '').toLowerCase().replace(/^@/, '');
      if (
        u.id === raw ||
        (u.displayId && u.displayId.toLowerCase() === lower) ||
        (uHandle && uHandle === cleanHandle)
      ) {
        found = u;
        break;
      }
    }
  }

  if (!found) {
    return res.status(404).json({ error: 'Profile not found.' });
  }

  const followers = userFollowersMap.get(found.id) || new Set();
  const following = userFollowingMap.get(found.id) || new Set();
  const userVideosList = serverVideos.filter((v) => v.creator?.id === found.id);
  const totalLikes = userVideosList.reduce((acc, v) => acc + (v.likesCount || 0), 0);

  res.json({
    user: {
      ...found,
      followersCount: followers.size,
      fansCount: formatCompactCount(followers.size),
      followingCount: following.size,
      totalLikes,
      likesCount: formatCompactCount(totalLikes),
    },
  });
});

// --- MEDIA UPLOAD FALLBACK (FOR PROFILE AVATAR & COVER PHOTO WHEN STORAGE IS UNAVAILABLE) ---
const uploadedMediaStore = new Map<string, { mimeType: string; buffer: Buffer; ownerId: string; createdAt: number }>();

app.post('/api/media/upload', (req: AuthenticatedRequest, res: Response) => {
  const { dataUrl, folder } = req.body || {};
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Valid base64 image dataUrl required.' });
  }
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/i);
  if (!match) {
    return res.status(400).json({ error: 'Unsupported image format. Use PNG, JPG, or WEBP.' });
  }
  const mimeType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 5 * 1024 * 1024) {
    return res.status(413).json({ error: 'Image must be 5MB or smaller.' });
  }
  const mediaId = `med_${folder === 'covers' ? 'cov' : 'avt'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  uploadedMediaStore.set(mediaId, {
    mimeType,
    buffer,
    ownerId: req.firebaseUser?.uid || 'anon',
    createdAt: Date.now(),
  });
  // Keep memory bounded to latest 200 uploads
  if (uploadedMediaStore.size > 200) {
    const oldestKey = uploadedMediaStore.keys().next().value;
    if (oldestKey) uploadedMediaStore.delete(oldestKey);
  }
  res.json({ success: true, url: `/api/media/${mediaId}`, mediaId });
});

app.get('/api/media/:mediaId', (req: Request, res: Response) => {
  const item = uploadedMediaStore.get(req.params.mediaId);
  if (!item) {
    return res.status(404).json({ error: 'Media not found.' });
  }
  res.setHeader('Content-Type', item.mimeType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(item.buffer);
});

// ============================================================================
// PRODUCTION REELS MEDIA STORAGE (CHUNKED STREAMING UP TO 100 MB + HTTP RANGE)
// ============================================================================
const MAX_REEL_VIDEO_BYTES = 100 * 1024 * 1024; // Strict 100 MB maximum
const MAX_REEL_THUMB_BYTES = 5 * 1024 * 1024; // 5 MB thumbnail maximum
const REEL_CHUNK_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB chunks (proxy & Cloud Run safe)
const REELS_MEDIA_DIR = path.resolve(
  process.env.REELS_STORAGE_DIR || path.join(__dirname, 'data', 'reels_media')
);
const REELS_TMP_DIR = path.resolve(REELS_MEDIA_DIR, '_tmp');

try {
  fs.mkdirSync(REELS_MEDIA_DIR, { recursive: true });
  fs.mkdirSync(REELS_TMP_DIR, { recursive: true });
} catch (mkdirErr) {
  console.warn('[Reels Storage] Could not initialize media directory:', mkdirErr);
}

const ALLOWED_REEL_VIDEO_MIMES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/x-m4v': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/ogg': 'ogv',
  'video/3gpp': '3gp',
  'video/x-matroska': 'mkv',
};

const EXT_TO_VIDEO_MIME: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  ogv: 'video/ogg',
  '3gp': 'video/3gpp',
  mkv: 'video/x-matroska',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

interface ActiveReelUploadSession {
  uploadId: string;
  reelId: string;
  ownerId: string;
  mimeType: string;
  ext: string;
  expectedSize: number;
  receivedBytes: number;
  nextChunkIndex: number;
  tempPath: string;
  createdAt: number;
}

const activeReelUploadSessions = new Map<string, ActiveReelUploadSession>();

function isSafeReelIdentifier(id: string): boolean {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{3,128}$/.test(id);
}

function resolveConfinedReelPath(...segments: string[]): string | null {
  const resolved = path.resolve(REELS_MEDIA_DIR, ...segments);
  if (!resolved.startsWith(REELS_MEDIA_DIR + path.sep)) {
    return null;
  }
  return resolved;
}

function resolvePublicBaseUrl(req: Request): string {
  const configured = (process.env.PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  const forwardedHost = String(req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim();
  if (!forwardedHost) return '';
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(forwardedHost)) {
    return '';
  }
  return `https://${forwardedHost}`;
}

function resolveVideoMimeAndExt(rawContentType?: string, rawFileName?: string): { mimeType: string; ext: string } | null {
  const cleanMime = String(rawContentType || '').split(';')[0].trim().toLowerCase();
  if (cleanMime && ALLOWED_REEL_VIDEO_MIMES[cleanMime]) {
    return { mimeType: cleanMime, ext: ALLOWED_REEL_VIDEO_MIMES[cleanMime] };
  }
  const nameLower = String(rawFileName || '').toLowerCase();
  if (nameLower.endsWith('.mp4') || nameLower.endsWith('.m4v')) return { mimeType: 'video/mp4', ext: 'mp4' };
  if (nameLower.endsWith('.webm')) return { mimeType: 'video/webm', ext: 'webm' };
  if (nameLower.endsWith('.mov')) return { mimeType: 'video/quicktime', ext: 'mov' };
  if (nameLower.endsWith('.ogv') || nameLower.endsWith('.ogg')) return { mimeType: 'video/ogg', ext: 'ogv' };
  if (nameLower.endsWith('.3gp')) return { mimeType: 'video/3gpp', ext: '3gp' };
  if (nameLower.endsWith('.mkv')) return { mimeType: 'video/x-matroska', ext: 'mkv' };
  if (cleanMime.startsWith('video/')) return { mimeType: 'video/mp4', ext: 'mp4' };
  return null;
}

function cleanupStaleReelUploads() {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, session] of activeReelUploadSessions.entries()) {
    if (session.createdAt < cutoff) {
      activeReelUploadSessions.delete(id);
      fs.promises.unlink(session.tempPath).catch(() => {});
    }
  }
}

setInterval(cleanupStaleReelUploads, 10 * 60 * 1000).unref();

// 1. Initialize chunked video upload (validates auth, MIME & <= 100 MB size)
app.post('/api/reels/upload/init', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.firebaseUser?.uid) {
    return res.status(401).json({ error: 'Authentication required to upload reels.' });
  }

  const { reelId, fileSize, contentType, fileName } = req.body || {};
  if (!isSafeReelIdentifier(String(reelId || ''))) {
    return res.status(400).json({ error: 'Invalid reel identifier.' });
  }

  const parsedSize = Number(fileSize);
  if (!Number.isFinite(parsedSize) || parsedSize <= 0) {
    return res.status(400).json({ error: 'Selected video file is empty.' });
  }
  if (parsedSize > MAX_REEL_VIDEO_BYTES) {
    return res.status(413).json({
      error: `Video exceeds the 100 MB maximum limit (${(parsedSize / (1024 * 1024)).toFixed(1)} MB selected).`,
      maxBytes: MAX_REEL_VIDEO_BYTES,
    });
  }

  const mediaInfo = resolveVideoMimeAndExt(contentType, fileName);
  if (!mediaInfo) {
    return res.status(400).json({
      error: 'Unsupported video format. Please select an MP4, WebM, MOV, or 3GP video.',
    });
  }

  const uploadId = `upl_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const tempPath = resolveConfinedReelPath('_tmp', `${uploadId}.part`);
  if (!tempPath) {
    return res.status(400).json({ error: 'Invalid storage path.' });
  }

  try {
    await fs.promises.mkdir(REELS_TMP_DIR, { recursive: true });
    await fs.promises.writeFile(tempPath, Buffer.alloc(0));
  } catch (err) {
    console.error('[Reels Storage] Failed to allocate temp upload file:', err);
    return res.status(500).json({ error: 'Storage server could not start upload.' });
  }

  activeReelUploadSessions.set(uploadId, {
    uploadId,
    reelId: String(reelId),
    ownerId: req.firebaseUser.uid,
    mimeType: mediaInfo.mimeType,
    ext: mediaInfo.ext,
    expectedSize: parsedSize,
    receivedBytes: 0,
    nextChunkIndex: 0,
    tempPath,
    createdAt: Date.now(),
  });

  return res.json({
    success: true,
    uploadId,
    chunkSize: REEL_CHUNK_SIZE_BYTES,
    maxBytes: MAX_REEL_VIDEO_BYTES,
  });
});

// 2. Receive raw binary chunk (up to 6 MB per request, cumulative <= 100 MB)
app.put(
  '/api/reels/upload/chunk/:uploadId',
  express.raw({ type: '*/*', limit: '6mb' }),
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.firebaseUser?.uid) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const uploadId = String(req.params.uploadId || '');
    const session = activeReelUploadSessions.get(uploadId);
    if (!session) {
      return res.status(404).json({ error: 'Upload session expired or not found. Please retry.' });
    }
    if (session.ownerId !== req.firebaseUser.uid) {
      return res.status(403).json({ error: 'Forbidden: upload session belongs to another account.' });
    }

    const chunkIndex = Number(req.query.index ?? session.nextChunkIndex);
    if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
      return res.status(400).json({ error: 'Invalid chunk index.' });
    }

    // Idempotent retry handling if client retried the immediately previous chunk
    if (chunkIndex === session.nextChunkIndex - 1) {
      return res.json({
        success: true,
        duplicate: true,
        receivedBytes: session.receivedBytes,
        totalBytes: session.expectedSize,
      });
    }
    if (chunkIndex !== session.nextChunkIndex) {
      return res.status(409).json({
        error: `Unexpected chunk order (expected ${session.nextChunkIndex}, got ${chunkIndex}).`,
      });
    }

    const chunkBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (chunkBuffer.length === 0) {
      return res.status(400).json({ error: 'Empty video chunk received.' });
    }

    if (session.receivedBytes + chunkBuffer.length > MAX_REEL_VIDEO_BYTES) {
      activeReelUploadSessions.delete(uploadId);
      await fs.promises.unlink(session.tempPath).catch(() => {});
      return res.status(413).json({
        error: 'Video exceeds the 100 MB maximum limit.',
        maxBytes: MAX_REEL_VIDEO_BYTES,
      });
    }

    try {
      await fs.promises.appendFile(session.tempPath, chunkBuffer);
      session.receivedBytes += chunkBuffer.length;
      session.nextChunkIndex += 1;
      return res.json({
        success: true,
        receivedBytes: session.receivedBytes,
        totalBytes: session.expectedSize,
      });
    } catch (err) {
      console.error('[Reels Storage] Chunk write failed:', err);
      return res.status(500).json({ error: 'Failed to store video chunk.' });
    }
  }
);

// 3. Finalize chunked video upload and publish persistent media URL
app.post('/api/reels/upload/complete/:uploadId', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.firebaseUser?.uid) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const uploadId = String(req.params.uploadId || '');
  const session = activeReelUploadSessions.get(uploadId);
  if (!session) {
    return res.status(404).json({ error: 'Upload session expired or already completed.' });
  }
  if (session.ownerId !== req.firebaseUser.uid) {
    return res.status(403).json({ error: 'Forbidden: upload session belongs to another account.' });
  }

  activeReelUploadSessions.delete(uploadId);

  try {
    const stat = await fs.promises.stat(session.tempPath);
    if (stat.size <= 0) {
      await fs.promises.unlink(session.tempPath).catch(() => {});
      return res.status(400).json({ error: 'Uploaded video file is empty.' });
    }
    if (stat.size > MAX_REEL_VIDEO_BYTES) {
      await fs.promises.unlink(session.tempPath).catch(() => {});
      return res.status(413).json({ error: 'Video exceeds the 100 MB maximum limit.' });
    }

    const reelDir = resolveConfinedReelPath(session.reelId);
    const fileName = `video.${session.ext}`;
    const finalVideoPath = resolveConfinedReelPath(session.reelId, fileName);
    const metaPath = resolveConfinedReelPath(session.reelId, 'meta.json');
    if (!reelDir || !finalVideoPath || !metaPath) {
      await fs.promises.unlink(session.tempPath).catch(() => {});
      return res.status(400).json({ error: 'Invalid target storage path.' });
    }

    await fs.promises.mkdir(reelDir, { recursive: true });
    try {
      await fs.promises.rename(session.tempPath, finalVideoPath);
    } catch {
      await fs.promises.copyFile(session.tempPath, finalVideoPath);
      await fs.promises.unlink(session.tempPath).catch(() => {});
    }

    const meta = {
      reelId: session.reelId,
      ownerId: session.ownerId,
      mimeType: session.mimeType,
      fileName,
      sizeBytes: stat.size,
      createdAt: new Date().toISOString(),
    };
    await fs.promises.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');

    const relativeUrl = `/api/reels/media/${session.reelId}/${fileName}`;
    const publicBase = resolvePublicBaseUrl(req);
    const videoUrl = publicBase ? `${publicBase}${relativeUrl}` : relativeUrl;

    return res.json({
      success: true,
      videoUrl,
      relativeUrl,
      videoStoragePath: `server_media:${session.reelId}/${fileName}`,
      sizeBytes: stat.size,
      mimeType: session.mimeType,
    });
  } catch (err) {
    console.error('[Reels Storage] Finalize error:', err);
    await fs.promises.unlink(session.tempPath).catch(() => {});
    return res.status(500).json({ error: 'Failed to finalize uploaded reel video.' });
  }
});

// 4. Upload Reel JPEG/WebP/PNG thumbnail (<= 5 MB)
app.post(
  '/api/reels/thumbnail/:reelId',
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '5mb' }),
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.firebaseUser?.uid) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const reelId = String(req.params.reelId || '');
    if (!isSafeReelIdentifier(reelId)) {
      return res.status(400).json({ error: 'Invalid reel identifier.' });
    }

    const reelDir = resolveConfinedReelPath(reelId);
    const metaPath = resolveConfinedReelPath(reelId, 'meta.json');
    if (!reelDir || !metaPath) {
      return res.status(400).json({ error: 'Invalid storage path.' });
    }

    // Verify ownership if video metadata already exists
    try {
      const existingMetaRaw = await fs.promises.readFile(metaPath, 'utf8');
      const existingMeta = JSON.parse(existingMetaRaw);
      if (existingMeta?.ownerId && existingMeta.ownerId !== req.firebaseUser.uid) {
        return res.status(403).json({ error: 'Forbidden: only the creator can attach a thumbnail.' });
      }
    } catch {
      // meta.json may not exist yet if thumbnail uploaded in parallel
    }

    let imgBuffer: Buffer | null = null;
    let ext = 'jpg';

    if (Buffer.isBuffer(req.body) && req.body.length > 0) {
      imgBuffer = req.body;
      const ct = String(req.headers['content-type'] || '').toLowerCase();
      if (ct.includes('png')) ext = 'png';
      else if (ct.includes('webp')) ext = 'webp';
    } else if (req.body && typeof req.body.dataUrl === 'string') {
      const match = req.body.dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
      if (match) {
        ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
        imgBuffer = Buffer.from(match[2], 'base64');
      }
    }

    if (!imgBuffer || imgBuffer.length === 0) {
      return res.status(400).json({ error: 'Valid thumbnail image required.' });
    }
    if (imgBuffer.length > MAX_REEL_THUMB_BYTES) {
      return res.status(413).json({ error: 'Thumbnail must be 5 MB or smaller.' });
    }

    const fileName = `thumbnail.${ext}`;
    const thumbPath = resolveConfinedReelPath(reelId, fileName);
    if (!thumbPath) {
      return res.status(400).json({ error: 'Invalid thumbnail path.' });
    }

    try {
      await fs.promises.mkdir(reelDir, { recursive: true });
      await fs.promises.writeFile(thumbPath, imgBuffer);
      const relativeUrl = `/api/reels/media/${reelId}/${fileName}`;
      const publicBase = resolvePublicBaseUrl(req);
      const thumbnailUrl = publicBase ? `${publicBase}${relativeUrl}` : relativeUrl;
      return res.json({
        success: true,
        thumbnailUrl,
        relativeUrl,
        thumbnailStoragePath: `server_media:${reelId}/${fileName}`,
      });
    } catch (err) {
      console.error('[Reels Storage] Thumbnail save failed:', err);
      return res.status(500).json({ error: 'Failed to store reel thumbnail.' });
    }
  }
);

// 5. Stream Reel video & thumbnail with full HTTP Byte-Range (206 Partial Content) support
app.get('/api/reels/media/:reelId/:fileName', async (req: Request, res: Response) => {
  const reelId = String(req.params.reelId || '');
  const fileName = String(req.params.fileName || '');

  if (!isSafeReelIdentifier(reelId)) {
    return res.status(400).json({ error: 'Invalid reel identifier.' });
  }
  if (!/^(video\.(mp4|webm|mov|ogv|3gp|mkv)|thumbnail\.(jpg|jpeg|png|webp))$/i.test(fileName)) {
    return res.status(400).json({ error: 'Invalid media file name.' });
  }

  const filePath = resolveConfinedReelPath(reelId, fileName);
  if (!filePath) {
    return res.status(400).json({ error: 'Invalid media path.' });
  }

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) {
      return res.status(404).json({ error: 'Reel media not found.' });
    }
  } catch {
    return res.status(404).json({ error: 'Reel media not found.' });
  }

  const ext = fileName.split('.').pop()?.toLowerCase() || 'mp4';
  const contentType = EXT_TO_VIDEO_MIME[ext] || 'application/octet-stream';
  const totalSize = stat.size;

  res.setHeader('Content-Type', contentType);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=604800');

  const rangeHeader = req.headers.range;
  if (rangeHeader && rangeHeader.startsWith('bytes=')) {
    const [rawStart, rawEnd] = rangeHeader.replace(/bytes=/, '').split('-');
    const start = rawStart ? Number.parseInt(rawStart, 10) : 0;
    const end = rawEnd ? Math.min(totalSize - 1, Number.parseInt(rawEnd, 10)) : Math.min(totalSize - 1, start + 2 * 1024 * 1024 - 1);

    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= totalSize || end < start) {
      res.setHeader('Content-Range', `bytes */${totalSize}`);
      return res.status(416).end();
    }

    const chunkLength = end - start + 1;
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
    res.setHeader('Content-Length', String(chunkLength));

    const stream = fs.createReadStream(filePath, { start, end });
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).end();
    });
    return stream.pipe(res);
  }

  res.status(200);
  res.setHeader('Content-Length', String(totalSize));
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) res.status(500).end();
  });
  return stream.pipe(res);
});

// 6. Owner-verified deletion of stored Reel media
app.delete('/api/reels/media/:reelId', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.firebaseUser?.uid) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const reelId = String(req.params.reelId || '');
  if (!isSafeReelIdentifier(reelId)) {
    return res.status(400).json({ error: 'Invalid reel identifier.' });
  }
  const reelDir = resolveConfinedReelPath(reelId);
  const metaPath = resolveConfinedReelPath(reelId, 'meta.json');
  if (!reelDir || !metaPath) {
    return res.status(400).json({ error: 'Invalid media path.' });
  }

  try {
    const rawMeta = await fs.promises.readFile(metaPath, 'utf8');
    const meta = JSON.parse(rawMeta);
    const isAdminUser = isVerifiedAdmin(req);
    if (meta?.ownerId && meta.ownerId !== req.firebaseUser.uid && !isAdminUser) {
      return res.status(403).json({ error: 'Only the creator can delete this reel media.' });
    }
  } catch {
    // Directory may not exist
  }

  await fs.promises.rm(reelDir, { recursive: true, force: true }).catch(() => {});
  return res.json({ success: true });
});

// --- VIDEO PRIVACY & DELETE MANAGEMENT (OWNER-ONLY) ---
app.patch('/api/videos/:videoId/privacy', (req: AuthenticatedRequest, res: Response) => {
  const { videoId } = req.params;
  const { privacy, userId } = req.body || {};
  const requesterId = req.firebaseUser?.uid || userId;
  const idx = serverVideos.findIndex((v) => v.id === videoId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Video not found.' });
  }
  if (serverVideos[idx].creator?.id !== requesterId) {
    return res.status(403).json({ error: 'Only the creator can change video privacy.' });
  }
  const nextPrivacy = privacy === 'private' ? 'private' : 'public';
  serverVideos[idx] = {
    ...serverVideos[idx],
    privacy: nextPrivacy,
    isPrivate: nextPrivacy === 'private',
  };
  res.json({ success: true, video: serverVideos[idx] });
});

app.delete('/api/videos/:videoId', (req: AuthenticatedRequest, res: Response) => {
  const { videoId } = req.params;
  const requesterId = req.firebaseUser?.uid || String(req.query.userId || '');
  const idx = serverVideos.findIndex((v) => v.id === videoId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Video not found.' });
  }
  if (requesterId && serverVideos[idx].creator?.id !== requesterId) {
    return res.status(403).json({ error: 'Only the creator can delete this video.' });
  }
  serverVideos.splice(idx, 1);
  res.json({ success: true });
});

// --- AGENCY & CREW MANAGEMENT SYSTEM ---
interface ServerAgencyRecord {
  id: string;
  name: string;
  code: string;
  logo: string;
  description: string;
  crewName: string;
  crewBadge: string;
  founderId: string;
  founderName: string;
  commissionRate: number;
  region: string;
  isVerified: boolean;
  members: Array<{
    id: string;
    name: string;
    username: string;
    avatar: string;
    role: 'member' | 'host' | 'manager' | 'founder';
    level: number;
    joinedAt: string;
  }>;
  createdAt: string;
}

const serverAgencies = new Map<string, ServerAgencyRecord>();

const DEFAULT_OFFICIAL_AGENCIES: ServerAgencyRecord[] = [
  {
    id: 'ag_lenzo_official',
    name: 'Lenzo Royal Talent',
    code: 'LENZO01',
    logo: '👑',
    description: 'Official Lenzo Party Live partner agency supporting rising solo broadcasters and party hosts.',
    crewName: 'Royal Pulse',
    crewBadge: 'ROYAL',
    founderId: 'system_lenzo',
    founderName: 'Lenzo HQ',
    commissionRate: 12,
    region: 'Global',
    isVerified: true,
    members: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ag_velvet_voice',
    name: 'Velvet Voice Network',
    code: 'VELVET8',
    logo: '🎙️',
    description: 'Dedicated voice party room guild focused on nightly music sessions, talk shows, and PK battles.',
    crewName: 'Velvet Squad',
    crewBadge: 'VELVET',
    founderId: 'system_lenzo',
    founderName: 'Lenzo HQ',
    commissionRate: 10,
    region: 'South Asia & MENA',
    isVerified: true,
    members: [],
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'ag_nova_creators',
    name: 'Nova Starlight Agency',
    code: 'NOVA99',
    logo: '✨',
    description: 'Creator growth accelerator for short-video talent, dance hosts, and weekend tournament streamers.',
    crewName: 'Nova Crew',
    crewBadge: 'NOVA',
    founderId: 'system_lenzo',
    founderName: 'Lenzo HQ',
    commissionRate: 15,
    region: 'International',
    isVerified: true,
    members: [],
    createdAt: '2026-01-12T00:00:00.000Z',
  },
];

for (const ag of DEFAULT_OFFICIAL_AGENCIES) {
  serverAgencies.set(ag.id, ag);
}

app.get('/api/agencies', (req: Request, res: Response) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  const list = Array.from(serverAgencies.values())
    .filter((ag) => {
      if (!q) return true;
      return (
        ag.name.toLowerCase().includes(q) ||
        ag.code.toLowerCase().includes(q) ||
        ag.crewName.toLowerCase().includes(q) ||
        ag.region.toLowerCase().includes(q)
      );
    })
    .map((ag) => ({
      ...ag,
      membersCount: ag.members.length,
    }));
  res.json({ agencies: list });
});

app.post('/api/agencies/create', (req: AuthenticatedRequest, res: Response) => {
  const { name, description, crewName, crewBadge, region, logo, user } = req.body || {};
  const founderId = req.firebaseUser?.uid || user?.id;
  if (!founderId) {
    return res.status(401).json({ error: 'Authentication required to create an agency.' });
  }
  const cleanName = sanitizeText(name || '', 50);
  if (cleanName.length < 3) {
    return res.status(400).json({ error: 'Agency name must be at least 3 characters.' });
  }
  const cleanCode = (cleanName.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase() || 'LNZ') + Math.floor(10 + Math.random() * 89);
  const agencyId = `ag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const record: ServerAgencyRecord = {
    id: agencyId,
    name: cleanName,
    code: cleanCode,
    logo: sanitizeText(logo || '⚡', 8),
    description: sanitizeText(description || 'Creator & live host agency on Lenzo Party Live.', 220),
    crewName: sanitizeText(crewName || `${cleanName} Crew`, 40),
    crewBadge: sanitizeText((crewBadge || cleanName.slice(0, 6)).toUpperCase(), 10),
    founderId,
    founderName: sanitizeText(user?.name || 'Founder', 50),
    commissionRate: 10,
    region: sanitizeText(region || 'Global', 40),
    isVerified: false,
    members: [
      {
        id: founderId,
        name: sanitizeText(user?.name || 'Founder', 50),
        username: user?.username || `@${founderId.slice(0, 6)}`,
        avatar: user?.avatar || '',
        role: 'founder',
        level: Number(user?.level || 1),
        joinedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  };

  // Remove user from any prior agency
  for (const ag of serverAgencies.values()) {
    ag.members = ag.members.filter((m) => m.id !== founderId);
  }
  serverAgencies.set(agencyId, record);

  const existingUser = serverUsers.get(founderId);
  if (existingUser) {
    existingUser.agencyId = record.id;
    existingUser.agencyName = record.name;
    existingUser.agencyCode = record.code;
    existingUser.agencyLogo = record.logo;
    existingUser.agencyRole = 'founder';
    existingUser.agencyStatus = 'active';
    existingUser.crewName = record.crewName;
    existingUser.crewBadge = record.crewBadge;
  }

  res.json({ success: true, agency: { ...record, membersCount: record.members.length } });
});

app.post('/api/agencies/join', (req: AuthenticatedRequest, res: Response) => {
  const { agencyId, code, user } = req.body || {};
  const memberId = req.firebaseUser?.uid || user?.id;
  if (!memberId) {
    return res.status(401).json({ error: 'Authentication required to join an agency.' });
  }

  let target: ServerAgencyRecord | undefined;
  if (agencyId) {
    target = serverAgencies.get(String(agencyId));
  } else if (code) {
    const cleanCode = String(code).trim().toUpperCase();
    for (const ag of serverAgencies.values()) {
      if (ag.code.toUpperCase() === cleanCode) {
        target = ag;
        break;
      }
    }
  }

  if (!target) {
    return res.status(404).json({ error: 'Agency not found. Check the Agency ID or invite code.' });
  }

  // Remove from any other agency
  for (const ag of serverAgencies.values()) {
    ag.members = ag.members.filter((m) => m.id !== memberId);
  }

  target.members.push({
    id: memberId,
    name: sanitizeText(user?.name || 'Creator', 50),
    username: user?.username || `@${memberId.slice(0, 6)}`,
    avatar: user?.avatar || '',
    role: 'host',
    level: Number(user?.level || 1),
    joinedAt: new Date().toISOString(),
  });

  const existingUser = serverUsers.get(memberId);
  if (existingUser) {
    existingUser.agencyId = target.id;
    existingUser.agencyName = target.name;
    existingUser.agencyCode = target.code;
    existingUser.agencyLogo = target.logo;
    existingUser.agencyRole = 'host';
    existingUser.agencyStatus = 'active';
    existingUser.crewName = target.crewName;
    existingUser.crewBadge = target.crewBadge;
  }

  res.json({ success: true, agency: { ...target, membersCount: target.members.length } });
});

app.post('/api/agencies/leave', (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.body || {};
  const memberId = req.firebaseUser?.uid || userId;
  if (!memberId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  for (const ag of serverAgencies.values()) {
    ag.members = ag.members.filter((m) => m.id !== memberId);
  }

  const existingUser = serverUsers.get(memberId);
  if (existingUser) {
    existingUser.agencyId = '';
    existingUser.agencyName = '';
    existingUser.agencyCode = '';
    existingUser.agencyLogo = '';
    existingUser.agencyRole = undefined;
    existingUser.agencyStatus = 'none';
    existingUser.crewName = '';
    existingUser.crewBadge = '';
  }

  res.json({ success: true });
});

app.get('/api/users/:id/followers', (req: Request, res: Response) => {
  const targetId = req.params.id;
  const viewerId = String(req.query.viewerId || '');
  const followerIds = Array.from(userFollowersMap.get(targetId) || new Set<string>());
  const viewerFollowingSet = userFollowingMap.get(viewerId) || new Set<string>();

  const followers = followerIds
    .map((fid) => serverUsers.get(fid))
    .filter(Boolean)
    .map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username || `@${u.displayId || u.id.slice(0, 6)}`,
      avatar: u.avatar,
      bio: u.bio || '',
      level: u.level || 1,
      isVIP: Boolean(u.isVIP),
      isFollowing: viewerFollowingSet.has(u.id),
    }));

  res.json({ followers });
});

app.get('/api/users/:id/following', (req: Request, res: Response) => {
  const targetId = req.params.id;
  const followingIds = Array.from(userFollowingMap.get(targetId) || new Set<string>());

  const following = followingIds
    .map((fid) => serverUsers.get(fid))
    .filter(Boolean)
    .map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username || `@${u.displayId || u.id.slice(0, 6)}`,
      avatar: u.avatar,
      bio: u.bio || '',
      level: u.level || 1,
      isVIP: Boolean(u.isVIP),
      isFollowing: true,
    }));

  res.json({ following });
});

app.post('/api/users/:id/follow', (req: AuthenticatedRequest, res: Response) => {
  const targetId = req.params.id;
  const followerId = req.firebaseUser?.uid || req.body?.followerId;

  if (!followerId) {
    return res.status(401).json({ error: 'Authentication required to follow users.' });
  }
  if (targetId === followerId) {
    return res.status(400).json({ error: 'Cannot follow yourself.' });
  }
  if (areUsersBlocked(followerId, targetId)) {
    return res.status(403).json({ error: 'Cannot follow because a block exists between these users.' });
  }

  let followers = userFollowersMap.get(targetId);
  if (!followers) {
    followers = new Set();
    userFollowersMap.set(targetId, followers);
  }
  followers.add(followerId);

  let following = userFollowingMap.get(followerId);
  if (!following) {
    following = new Set();
    userFollowingMap.set(followerId, following);
  }
  following.add(targetId);

  res.json({
    success: true,
    isFollowing: true,
    targetFollowersCount: followers.size,
    myFollowingCount: following.size,
  });
});

app.post('/api/users/:id/unfollow', (req: AuthenticatedRequest, res: Response) => {
  const targetId = req.params.id;
  const followerId = req.firebaseUser?.uid || req.body?.followerId;

  if (!followerId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const followers = userFollowersMap.get(targetId);
  if (followers) followers.delete(followerId);

  const following = userFollowingMap.get(followerId);
  if (following) following.delete(targetId);

  res.json({
    success: true,
    isFollowing: false,
    targetFollowersCount: followers?.size || 0,
    myFollowingCount: following?.size || 0,
  });
});

// --- REAL-TIME LIVE STREAMING ENGINE ---

function ensureLiveStreamHydrated(
  streamId: string,
  meta?: { host?: any; title?: string; category?: string } | null
): ServerLiveStream | null {
  const existing = liveStreamsMap.get(streamId);
  if (existing && existing.isLive) return existing;
  if (!meta?.host?.id) return null;
  const hostObj = meta.host;
  // Guarantee strictly ONE active Solo Live per host in liveStreamsMap even when hydrated from Firestore
  for (const [oldId, oldStream] of liveStreamsMap.entries()) {
    if (oldId !== streamId && oldStream.host?.id === hostObj.id) {
      oldStream.isLive = false;
      liveStreamsMap.delete(oldId);
    }
  }
  const hydrated: ServerLiveStream = {
    id: streamId,
    title: sanitizeText(meta.title || `${hostObj.name || 'Host'}'s Live`, 100),
    category: sanitizeText(meta.category || 'Live', 40) || 'Live',
    host: hostObj,
    coverImage: typeof hostObj.avatar === 'string' ? hostObj.avatar.slice(0, 1500) : '',
    channelName: `live_${streamId}`,
    isLive: true,
    allowGuests: true,
    isPrivate: false,
    announcement: '',
    tags: [sanitizeText(meta.category || 'Live', 24) || 'Live', 'Live'],
    likesCount: 0,
    commentsCount: 0,
    giftsCoinValue: 0,
    startTime: Date.now(),
    viewers: new Map(),
    uniqueViewerIds: new Set(),
    recentJoinAnnouncements: new Map(),
    comments: [],
  };
  serverUsers.set(hostObj.id, hostObj);
  liveStreamsMap.set(streamId, hydrated);
  return hydrated;
}

app.get('/api/live/active_streams', (_req: Request, res: Response) => {
  const activeSorted = Array.from(liveStreamsMap.values())
    .filter((s) => s.isLive)
    .sort((a, b) => b.startTime - a.startTime);
  const byHost = new Map<string, ServerLiveStream>();
  for (const s of activeSorted) {
    const key = s.host?.id || s.id;
    if (!byHost.has(key)) byHost.set(key, s);
  }
  const streams = Array.from(byHost.values())
    .sort((a, b) => b.viewers.size - a.viewers.size || b.startTime - a.startTime)
    .map(serializeLiveStream);
  res.json({ streams });
});

app.get('/api/live/stream/:streamId', (req: Request, res: Response) => {
  const stream = liveStreamsMap.get(req.params.streamId);
  if (!stream || !stream.isLive) {
    return res.status(404).json({ error: 'Stream not found or offline', isLive: false });
  }
  res.json({ ...serializeLiveStream(stream), isLive: true, comments: stream.comments.slice(-50) });
});

app.post('/api/live/start', (req: AuthenticatedRequest, res: Response) => {
  const { id, title, category, host, coverImage, allowGuests, isPrivate, announcement, tags } = req.body;
  if (!host || !host.id || !title || !String(title).trim()) {
    return res.status(400).json({ error: 'Valid stream title and authenticated host are required.' });
  }
  if (req.firebaseUser && req.firebaseUser.uid !== host.id) {
    return res.status(403).json({ error: 'Host ID mismatch.' });
  }

  const streamId = sanitizeText(id, 128) || `live_${Date.now()}`;
  const cleanTitle = sanitizeText(title, 100);
  const cleanCategory = sanitizeText(category, 40) || 'Music';

  // Enforce strictly ONE active Solo Live stream per host: end & remove any previous stale stream by this host
  for (const [oldId, oldStream] of Array.from(liveStreamsMap.entries())) {
    if (oldId !== streamId && oldStream.host?.id === host.id) {
      oldStream.isLive = false;
      liveStreamsMap.delete(oldId);
      broadcastToLive(oldId, 'live:ended', { streamId: oldId, reason: 'Host started a new live broadcast.' });
      broadcastAll('live:directory_updated', { streamId: oldId, action: 'ended' });
    }
  }

  const newStream: ServerLiveStream = {
    id: streamId,
    title: cleanTitle,
    category: cleanCategory,
    host,
    coverImage: typeof coverImage === 'string' ? coverImage.slice(0, 1500) : '',
    channelName: `live_${streamId}`,
    isLive: true,
    allowGuests: allowGuests !== false,
    isPrivate: Boolean(isPrivate),
    announcement: sanitizeText(announcement, 250),
    tags: Array.isArray(tags) ? tags.slice(0, 6).map((t) => sanitizeText(t, 24)).filter(Boolean) : [cleanCategory, 'Live'],
    likesCount: 0,
    commentsCount: 0,
    giftsCoinValue: 0,
    startTime: Date.now(),
    viewers: new Map(),
    uniqueViewerIds: new Set(),
    recentJoinAnnouncements: new Map(),
    comments: [],
  };

  serverUsers.set(host.id, host);
  liveStreamsMap.set(streamId, newStream);

  const metric = ensureBroadcasterMetric(host);
  if (metric) {
    metric.isCurrentlyLive = true;
    metric.liveStreamId = streamId;
  }
  recordRankingEvent({
    scope: 'solo',
    contextId: streamId,
    type: 'host_live',
    actor: host,
    target: host,
  });

  const serialized = serializeLiveStream(newStream);
  broadcastAll('live:directory_updated', { streamId, action: 'started', stream: serialized });
  res.json({ success: true, stream: serialized });
});

app.post('/api/live/:streamId/join', (req: Request, res: Response) => {
  const { streamId } = req.params;
  const { user, streamMeta } = req.body;
  const stream = ensureLiveStreamHydrated(streamId, streamMeta);
  if (!stream || !stream.isLive) {
    return res.status(404).json({ error: 'Live broadcast has ended or does not exist.' });
  }
  if (!user || !user.id) {
    return res.status(400).json({ error: 'User profile required to join stream.' });
  }
  if (user.id !== stream.host.id && isUserBlockedBy(stream.host.id, user.id)) {
    return res.status(403).json({ error: 'You cannot join this stream because the host has blocked you.' });
  }

  const now = Date.now();
  const isNewInActiveMap = !stream.viewers.has(user.id);
  const lastJoinedBanner = stream.recentJoinAnnouncements.get(user.id) || 0;
  const shouldEmitEntryBanner = isNewInActiveMap && now - lastJoinedBanner > 15000 && user.id !== stream.host.id;

  const viewerRecord: ServerViewerRecord = {
    userId: user.id,
    name: user.name || 'Viewer',
    username: user.username,
    avatar: user.avatar || '',
    level: user.level || 1,
    vipLevel: user.vipLevel || 0,
    isVIP: Boolean(user.isVIP),
    joinedAt: stream.viewers.get(user.id)?.joinedAt || now,
    lastSeen: now,
    isHost: user.id === stream.host.id,
  };

  // Track active non-host viewers (or unique connected audience members)
  if (user.id !== stream.host.id) {
    stream.viewers.set(user.id, viewerRecord);
    stream.uniqueViewerIds.add(user.id);
    const metric = ensureBroadcasterMetric(stream.host);
    if (metric) {
      metric.uniqueViewerIds.add(user.id);
    }
    if (isNewInActiveMap) {
      recordRankingEvent({
        scope: 'solo',
        contextId: streamId,
        type: 'viewer_join',
        actor: user,
        target: stream.host,
      });
    }
  }
  serverUsers.set(user.id, user);
  cacheRankingUser(user);

  const serialized = serializeLiveStream(stream);
  const viewersSnapshot = Array.from(stream.viewers.values()).sort((a, b) => b.joinedAt - a.joinedAt);
  if (shouldEmitEntryBanner) {
    stream.recentJoinAnnouncements.set(user.id, now);
    broadcastToLive(streamId, 'live:viewer_joined', {
      streamId,
      viewer: viewerRecord,
      viewers: viewersSnapshot.slice(0, 20),
      numericViewers: serialized.numericViewers,
      viewerCount: serialized.viewerCount,
    });
  } else {
    broadcastToLive(streamId, 'live:viewer_count_updated', {
      streamId,
      viewers: viewersSnapshot.slice(0, 20),
      numericViewers: serialized.numericViewers,
      viewerCount: serialized.viewerCount,
    });
  }
  broadcastAll('live:directory_updated', { streamId, action: 'updated', stream: serialized });

  res.json({
    success: true,
    stream: serialized,
    viewers: viewersSnapshot,
    comments: stream.comments.slice(-50),
  });
});

app.post('/api/live/:streamId/heartbeat', (req: Request, res: Response) => {
  const stream = liveStreamsMap.get(req.params.streamId);
  const { userId } = req.body;
  if (!stream) return res.status(404).json({ error: 'Stream ended' });
  if (userId && stream.viewers.has(userId)) {
    const now = Date.now();
    stream.viewers.get(userId)!.lastSeen = now;
    if (userId !== stream.host.id) {
      const creditKey = `solo:${stream.id}:${userId}`;
      const lastCredit = lastWatchCreditMap.get(creditKey) || 0;
      if (now - lastCredit >= 30000) {
        lastWatchCreditMap.set(creditKey, now);
        recordRankingEvent({
          scope: 'solo',
          contextId: stream.id,
          type: 'viewer_watch',
          actorId: userId,
          target: stream.host,
          quantity: 1,
        });
      }
    }
  }
  res.json({ success: true, numericViewers: stream.viewers.size });
});

app.post('/api/live/:streamId/leave', (req: Request, res: Response) => {
  const { streamId } = req.params;
  const { userId } = req.body;
  const stream = liveStreamsMap.get(streamId);
  if (!stream) {
    return res.json({ success: true });
  }
  if (userId && stream.viewers.has(userId)) {
    stream.viewers.delete(userId);
    const serialized = serializeLiveStream(stream);
    const viewersSnapshot = Array.from(stream.viewers.values()).sort((a, b) => b.joinedAt - a.joinedAt);
    broadcastToLive(streamId, 'live:viewer_left', {
      streamId,
      userId,
      viewers: viewersSnapshot.slice(0, 20),
      numericViewers: serialized.numericViewers,
      viewerCount: serialized.viewerCount,
    });
    broadcastAll('live:directory_updated', { streamId, action: 'updated', stream: serialized });
  }
  res.json({ success: true });
});

app.post('/api/live/:streamId/end', (req: AuthenticatedRequest, res: Response) => {
  const { streamId } = req.params;
  const hostId = req.firebaseUser?.uid || req.body?.hostId;
  const stream = liveStreamsMap.get(streamId);
  if (!stream) {
    return res.json({ success: true, alreadyEnded: true });
  }
  if (stream.host?.id !== hostId && !isVerifiedAdmin(req)) {
    return res.status(403).json({ error: 'Only the host can end this live broadcast.' });
  }

  stream.isLive = false;
  liveStreamsMap.delete(streamId);

  const metric = broadcasterMetricsMap.get(stream.host.id);
  if (metric) {
    metric.isCurrentlyLive = false;
    metric.liveStreamId = undefined;
  }

  broadcastToLive(streamId, 'live:ended', { streamId, reason: 'Host ended the live broadcast.' });
  broadcastAll('live:directory_updated', { streamId, action: 'ended' });
  res.json({ success: true });
});

app.get('/api/live/:streamId/viewers', (req: Request, res: Response) => {
  const stream = liveStreamsMap.get(req.params.streamId);
  if (!stream) {
    return res.status(404).json({ error: 'Stream not found or ended.' });
  }
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
  const all = Array.from(stream.viewers.values()).sort((a, b) => b.joinedAt - a.joinedAt);
  const start = (page - 1) * limit;
  const slice = all.slice(start, start + limit);
  res.json({
    viewers: slice,
    totalCount: all.length,
    page,
    limit,
    hasMore: start + slice.length < all.length,
  });
});

app.post('/api/live/:streamId/comment', (req: Request, res: Response) => {
  const { streamId } = req.params;
  const { sender, text, customId, streamMeta } = req.body;
  const stream = ensureLiveStreamHydrated(streamId, streamMeta);
  if (!stream || !stream.isLive) {
    return res.status(404).json({ error: 'Stream has ended.' });
  }
  if (!sender || !sender.id) {
    return res.status(400).json({ error: 'Authenticated sender required.' });
  }
  if (sender.id !== stream.host.id && isUserBlockedBy(stream.host.id, sender.id)) {
    return res.status(403).json({ error: 'You cannot comment on this stream because the host has blocked you.' });
  }
  const cleanText = sanitizeText(text, 300);
  if (!cleanText) {
    return res.status(400).json({ error: 'Comment cannot be empty.' });
  }

  const now = Date.now();
  const lastAt = lastCommentTimeMap.get(sender.id) || 0;
  if (now - lastAt < 750) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please wait before commenting again.' });
  }
  lastCommentTimeMap.set(sender.id, now);

  stream.commentsCount += 1;
  const metric = ensureBroadcasterMetric(stream.host);
  if (metric) metric.totalComments += 1;

  const safeId =
    typeof customId === 'string' && /^[a-zA-Z0-9_\-]{3,128}$/.test(customId)
      ? customId
      : `lc_${now}_${Math.random().toString(36).substring(2, 6)}`;

  const msg = {
    id: safeId,
    senderId: sender.id,
    senderName: sender.name || 'Viewer',
    senderAvatar: sender.avatar || '',
    senderVip: sender.vipLevel || 0,
    isHost: sender.id === stream.host.id,
    text: cleanText,
    timestamp: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAtMillis: now,
  };
  stream.comments.push(msg);
  if (stream.comments.length > 200) stream.comments.shift();
  recordRankingEvent({
    scope: 'solo',
    contextId: streamId,
    type: 'comment',
    actor: sender,
    target: stream.host,
    quantity: 1,
  });

  broadcastToLive(streamId, 'live:comment', { streamId, message: msg, commentsCount: stream.commentsCount });
  res.json({ success: true, message: msg });
});

app.post('/api/live/:streamId/heart', (req: Request, res: Response) => {
  const { streamId } = req.params;
  const { senderId, count = 1, streamMeta } = req.body;
  const stream = ensureLiveStreamHydrated(streamId, streamMeta);
  if (!stream || !stream.isLive) {
    return res.status(404).json({ error: 'Stream has ended.' });
  }
  if (senderId && senderId !== stream.host.id && isUserBlockedBy(stream.host.id, senderId)) {
    return res.status(403).json({ error: 'You cannot interact with this stream because the host has blocked you.' });
  }
  const now = Date.now();
  const lastAt = lastHeartTimeMap.get(senderId || 'anon') || 0;
  if (now - lastAt < 180) {
    return res.json({ success: true, likesCount: stream.likesCount });
  }
  lastHeartTimeMap.set(senderId || 'anon', now);

  const delta = Math.min(Math.max(1, Number(count) || 1), 10);
  stream.likesCount += delta;
  const metric = ensureBroadcasterMetric(stream.host);
  if (metric) metric.totalLikes += delta;
  if (senderId) {
    recordRankingEvent({
      scope: 'solo',
      contextId: streamId,
      type: 'heart',
      actorId: senderId,
      target: stream.host,
      quantity: delta,
    });
  }

  broadcastToLive(streamId, 'live:heart', { streamId, likesCount: stream.likesCount, delta });
  res.json({ success: true, likesCount: stream.likesCount });
});

app.post('/api/live/:streamId/gift', (req: Request, res: Response) => {
  const { streamId } = req.params;
  const { sender, recipient, gift, quantity = 1 } = req.body;
  const stream = liveStreamsMap.get(streamId);
  if (!stream || !stream.isLive) {
    return res.status(404).json({ error: 'Stream has ended.' });
  }
  if (sender?.id && (isUserBlockedBy(stream.host.id, sender.id) || (recipient?.id && isUserBlockedBy(recipient.id, sender.id)))) {
    return res.status(403).json({ error: 'You cannot send gifts to a user who has blocked you.' });
  }
  const qty = Math.max(1, Number(quantity) || 1);
  const totalCoins = Math.max(0, Number(gift?.coins || 0) * qty);
  stream.giftsCoinValue += totalCoins;

  const targetHost = recipient?.id ? recipient : stream.host;
  const metric = ensureBroadcasterMetric(targetHost);
  if (metric) {
    metric.giftsCoinValue += totalCoins;
    metric.giftsCount += qty;
  }
  if (sender?.id) {
    const cRec = contributorMetricsMap.get(sender.id) || {
      user: sender,
      coinsSpent: 0,
      giftsSentCount: 0,
      lastActiveAt: Date.now(),
    };
    cRec.user = { ...cRec.user, ...sender };
    cRec.coinsSpent += totalCoins;
    cRec.giftsSentCount += qty;
    cRec.lastActiveAt = Date.now();
    contributorMetricsMap.set(sender.id, cRec);

    recordRankingEvent({
      scope: 'solo',
      contextId: streamId,
      type: 'gift',
      actor: sender,
      target: targetHost,
      coins: totalCoins,
      quantity: qty,
    });
  }

  const eventPayload = {
    streamId,
    sender,
    recipient: targetHost,
    gift,
    quantity: qty,
    totalCoins,
    timestamp: Date.now(),
  };
  broadcastToLive(streamId, 'live:gift', eventPayload);
  res.json({ success: true, ...eventPayload });
});

// --- MULTI-SCOPE REAL-TIME RANKING ENGINE (GLOBAL, SOLO LIVE, PARTY ROOMS) ---

function getPeriodWindow(period: RankingPeriod): { since: number; resetAt: number | null } {
  const now = Date.now();
  const d = new Date(now);
  switch (period) {
    case 'hourly': {
      const nextHour = new Date(d);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);
      return { since: now - 60 * 60 * 1000, resetAt: nextHour.getTime() };
    }
    case 'daily': {
      const nextDay = new Date(d);
      nextDay.setUTCHours(24, 0, 0, 0);
      return { since: now - 24 * 60 * 60 * 1000, resetAt: nextDay.getTime() };
    }
    case 'weekly': {
      const daysUntilMon = (8 - d.getUTCDay()) % 7 || 7;
      const nextMon = new Date(d);
      nextMon.setUTCDate(d.getUTCDate() + daysUntilMon);
      nextMon.setUTCHours(0, 0, 0, 0);
      return { since: now - 7 * 24 * 60 * 60 * 1000, resetAt: nextMon.getTime() };
    }
    case 'monthly': {
      const nextMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0));
      return { since: now - 30 * 24 * 60 * 60 * 1000, resetAt: nextMonth.getTime() };
    }
    case 'all_time':
    default:
      return { since: 0, resetAt: null };
  }
}

function computeWeightedBroadcasterScore(rec: BroadcasterMetricRecord): number {
  const giftPart = rec.giftsCoinValue * rankingConfig.giftValueWeight;
  const viewerPart = rec.uniqueViewerIds.size * rankingConfig.uniqueViewerWeight;
  const engagementPart = (rec.totalLikes + rec.totalComments * 3) * rankingConfig.engagementWeight;
  const livePart = rec.isCurrentlyLive ? rankingConfig.activeLiveBoost : 0;
  return Math.round(giftPart + viewerPart + engagementPart + livePart);
}

interface AggregatedUserRankingBucket {
  userId: string;
  hostGiftsCoins: number;
  hostGiftsCount: number;
  hostUniqueViewers: Set<string>;
  hostLikes: number;
  hostComments: number;
  hostSessions: Set<string>;
  gifterCoins: number;
  gifterCount: number;
  viewerGiftsCoins: number;
  viewerLikes: number;
  viewerComments: number;
  viewerWatchTicks: number; // each tick = 0.5 min
  viewerSessions: Set<string>;
  isHostInContext: boolean;
}

function getOrInitBucket(map: Map<string, AggregatedUserRankingBucket>, userId: string): AggregatedUserRankingBucket {
  let b = map.get(userId);
  if (!b) {
    b = {
      userId,
      hostGiftsCoins: 0,
      hostGiftsCount: 0,
      hostUniqueViewers: new Set<string>(),
      hostLikes: 0,
      hostComments: 0,
      hostSessions: new Set<string>(),
      gifterCoins: 0,
      gifterCount: 0,
      viewerGiftsCoins: 0,
      viewerLikes: 0,
      viewerComments: 0,
      viewerWatchTicks: 0,
      viewerSessions: new Set<string>(),
      isHostInContext: false,
    };
    map.set(userId, b);
  }
  return b;
}

function computeLeaderboard(params: {
  scope: RankingScope;
  category: RankingCategory;
  period: RankingPeriod;
  contextId?: string;
  userId?: string;
  limit?: number;
}) {
  const { scope, category, period, contextId, userId } = params;
  const maxLimit = Math.min(Math.max(1, params.limit || 50), 100);
  const { since, resetAt } = getPeriodWindow(period);

  const buckets = new Map<string, AggregatedUserRankingBucket>();

  // 1. Aggregate real time-windowed events matching scope & optional contextId
  for (const ev of rankingEvents) {
    if (ev.timestamp < since) continue;
    if (contextId) {
      if (ev.contextId !== contextId) continue;
    } else if (scope === 'solo' && ev.scope !== 'solo') {
      continue;
    } else if (scope === 'party' && ev.scope !== 'party') {
      continue;
    }

    const sessionKey = ev.contextId || `${ev.scope}:${Math.floor(ev.timestamp / 3600000)}`;

    if (ev.type === 'host_live') {
      const hb = getOrInitBucket(buckets, ev.actorId);
      hb.isHostInContext = true;
      hb.hostSessions.add(sessionKey);
    } else if (ev.type === 'gift') {
      const gb = getOrInitBucket(buckets, ev.actorId);
      gb.gifterCoins += ev.coins;
      gb.gifterCount += ev.quantity;
      if (!ev.targetId || ev.actorId !== ev.targetId) {
        gb.viewerGiftsCoins += ev.coins;
        gb.viewerSessions.add(sessionKey);
      }
      if (ev.targetId) {
        const hb = getOrInitBucket(buckets, ev.targetId);
        hb.isHostInContext = true;
        hb.hostGiftsCoins += ev.coins;
        hb.hostGiftsCount += ev.quantity;
        hb.hostUniqueViewers.add(ev.actorId);
        hb.hostSessions.add(sessionKey);
      }
    } else if (ev.type === 'viewer_join') {
      const vb = getOrInitBucket(buckets, ev.actorId);
      vb.viewerSessions.add(sessionKey);
      if (ev.targetId && ev.targetId !== ev.actorId) {
        const hb = getOrInitBucket(buckets, ev.targetId);
        hb.isHostInContext = true;
        hb.hostUniqueViewers.add(ev.actorId);
        hb.hostSessions.add(sessionKey);
      }
    } else if (ev.type === 'viewer_watch') {
      const vb = getOrInitBucket(buckets, ev.actorId);
      vb.viewerWatchTicks += ev.quantity;
      vb.viewerSessions.add(sessionKey);
      if (ev.targetId && ev.targetId !== ev.actorId) {
        const hb = getOrInitBucket(buckets, ev.targetId);
        hb.hostUniqueViewers.add(ev.actorId);
      }
    } else if (ev.type === 'heart') {
      const vb = getOrInitBucket(buckets, ev.actorId);
      vb.viewerLikes += ev.quantity;
      vb.viewerSessions.add(sessionKey);
      if (ev.targetId) {
        const hb = getOrInitBucket(buckets, ev.targetId);
        hb.isHostInContext = true;
        hb.hostLikes += ev.quantity;
        if (ev.actorId !== ev.targetId) hb.hostUniqueViewers.add(ev.actorId);
      }
    } else if (ev.type === 'comment') {
      const vb = getOrInitBucket(buckets, ev.actorId);
      vb.viewerComments += ev.quantity;
      vb.viewerSessions.add(sessionKey);
      if (ev.targetId) {
        const hb = getOrInitBucket(buckets, ev.targetId);
        hb.isHostInContext = true;
        hb.hostComments += ev.quantity;
        if (ev.actorId !== ev.targetId) hb.hostUniqueViewers.add(ev.actorId);
      }
    }
  }

  // 2. Fold in live active streams & party rooms so live hosts & real connected audience always appear immediately
  const activeSoloByHost = new Map<string, ServerLiveStream>();
  for (const s of liveStreamsMap.values()) {
    if (!s.isLive) continue;
    activeSoloByHost.set(s.host.id, s);
    if (contextId && s.id !== contextId) continue;
    if (!contextId && scope === 'party') continue;

    cacheRankingUser(s.host);
    const hb = getOrInitBucket(buckets, s.host.id);
    hb.isHostInContext = true;
    hb.hostSessions.add(s.id);
    for (const v of s.viewers.values()) {
      if (v.userId === s.host.id) continue;
      hb.hostUniqueViewers.add(v.userId);
      const vb = getOrInitBucket(buckets, v.userId);
      vb.viewerSessions.add(s.id);
      cacheRankingUser({
        id: v.userId,
        name: v.name,
        username: v.username,
        avatar: v.avatar,
        level: v.level,
        vipLevel: v.vipLevel,
        isVIP: v.isVIP,
      });
    }
  }

  const activePartyByHost = new Map<string, ServerPartyRoom>();
  for (const r of partyRoomsMap.values()) {
    activePartyByHost.set(r.host.id, r);
    if (contextId && r.id !== contextId) continue;
    if (!contextId && scope === 'solo') continue;

    cacheRankingUser(r.host);
    const hb = getOrInitBucket(buckets, r.host.id);
    hb.isHostInContext = true;
    hb.hostSessions.add(r.id);
    for (const p of r.participants.values()) {
      if (p.userId === r.host.id) continue;
      hb.hostUniqueViewers.add(p.userId);
      const vb = getOrInitBucket(buckets, p.userId);
      vb.viewerSessions.add(r.id);
      cacheRankingUser({
        id: p.userId,
        name: p.name,
        username: p.username,
        avatar: p.avatar,
        level: p.level,
        vipLevel: p.vipLevel,
        isVIP: p.isVIP,
      });
    }
  }

  // 3. For Global All-Time, also include persisted progression spend from userProgressionStore (real users only)
  if (!contextId && scope === 'global' && period === 'all_time') {
    for (const rec of userProgressionStore.values()) {
      if (rec.totalQualifyingCoinsSpent <= 0) continue;
      cacheRankingUser({
        id: rec.userId,
        name: rec.userName || undefined,
        avatar: rec.userAvatar || undefined,
        email: rec.userEmail || undefined,
        verificationTier: rec.verificationTier,
        verifiedTag: rec.verifiedTag,
      });
      const b = getOrInitBucket(buckets, rec.userId);
      if (b.gifterCoins < rec.totalQualifyingCoinsSpent) {
        b.gifterCoins = rec.totalQualifyingCoinsSpent;
        b.viewerGiftsCoins = Math.max(b.viewerGiftsCoins, rec.totalQualifyingCoinsSpent);
      }
    }
  }

  // Determine explicit context host ID (if viewing a single Solo Live or Party Room)
  const contextHostId = contextId
    ? liveStreamsMap.get(contextId)?.host?.id || partyRoomsMap.get(contextId)?.host?.id || null
    : null;

  // 4. Score each user for the requested category
  const scored: Array<{
    userId: string;
    user: any;
    numericScore: number;
    score: string;
    roleLabel: string;
    isLive: boolean;
    liveContextId?: string;
    liveContextType?: 'solo' | 'party';
    metrics: {
      giftsCoins: number;
      giftsCount: number;
      uniqueViewers: number;
      likesCount: number;
      commentsCount: number;
      watchMinutes: number;
      sessionsCount: number;
    };
  }> = [];

  for (const b of buckets.values()) {
    const activeSolo = activeSoloByHost.get(b.userId);
    const activeParty = activePartyByHost.get(b.userId);
    const isLiveInScope =
      scope === 'solo'
        ? Boolean(activeSolo)
        : scope === 'party'
          ? Boolean(activeParty)
          : Boolean(activeSolo || activeParty);

    const liveContextId =
      scope === 'party'
        ? activeParty?.id
        : scope === 'solo'
          ? activeSolo?.id
          : activeSolo?.id || activeParty?.id;
    const liveContextType: 'solo' | 'party' | undefined =
      scope === 'party'
        ? activeParty ? 'party' : undefined
        : scope === 'solo'
          ? activeSolo ? 'solo' : undefined
          : activeSolo ? 'solo' : activeParty ? 'party' : undefined;

    const watchMinutes = Math.round((b.viewerWatchTicks * 0.5) * 10) / 10;

    const hostScore = Math.round(
      b.hostGiftsCoins * rankingConfig.giftValueWeight +
        b.hostUniqueViewers.size * rankingConfig.uniqueViewerWeight +
        (b.hostLikes + b.hostComments * 3) * rankingConfig.engagementWeight +
        (isLiveInScope ? rankingConfig.activeLiveBoost : 0)
    );

    const viewerScore = Math.round(
      b.viewerGiftsCoins * 2 +
        b.viewerComments * 15 +
        b.viewerLikes * 5 +
        b.viewerSessions.size * 25 +
        watchMinutes * 10
    );

    const gifterScore = Math.round(b.gifterCoins);
    const allScore = Math.round(hostScore + gifterScore * 2 + viewerScore);

    let numericScore = 0;
    let formattedScore = '0';
    let roleLabel = 'Member';
    let metrics = {
      giftsCoins: b.hostGiftsCoins + b.gifterCoins,
      giftsCount: b.hostGiftsCount + b.gifterCount,
      uniqueViewers: b.hostUniqueViewers.size,
      likesCount: b.hostLikes + b.viewerLikes,
      commentsCount: b.hostComments + b.viewerComments,
      watchMinutes,
      sessionsCount: Math.max(b.hostSessions.size, b.viewerSessions.size),
    };

    if (category === 'host') {
      if (!b.isHostInContext && !isLiveInScope) continue;
      numericScore = hostScore;
      if (numericScore <= 0 && !isLiveInScope) continue;
      formattedScore = `${formatCompactCount(numericScore)} pts`;
      roleLabel = liveContextType === 'party' ? 'Party Host' : 'Live Host';
      metrics = {
        giftsCoins: b.hostGiftsCoins,
        giftsCount: b.hostGiftsCount,
        uniqueViewers: b.hostUniqueViewers.size,
        likesCount: b.hostLikes,
        commentsCount: b.hostComments,
        watchMinutes: 0,
        sessionsCount: b.hostSessions.size,
      };
    } else if (category === 'gifter') {
      numericScore = gifterScore;
      if (numericScore <= 0) continue;
      formattedScore = `${formatCompactCount(numericScore)} Coins`;
      roleLabel = 'Top Gifter';
      metrics = {
        giftsCoins: b.gifterCoins,
        giftsCount: b.gifterCount,
        uniqueViewers: 0,
        likesCount: b.viewerLikes,
        commentsCount: b.viewerComments,
        watchMinutes,
        sessionsCount: b.viewerSessions.size,
      };
    } else if (category === 'viewer') {
      // In a specific room/stream, keep Top Viewer strictly audience (exclude the room's own host)
      if (contextHostId && b.userId === contextHostId) continue;
      numericScore = viewerScore;
      if (numericScore <= 0) continue;
      formattedScore = `${formatCompactCount(numericScore)} pts`;
      roleLabel = 'Top Viewer';
      metrics = {
        giftsCoins: b.viewerGiftsCoins,
        giftsCount: b.gifterCount,
        uniqueViewers: 0,
        likesCount: b.viewerLikes,
        commentsCount: b.viewerComments,
        watchMinutes,
        sessionsCount: b.viewerSessions.size,
      };
    } else {
      numericScore = allScore;
      if (numericScore <= 0 && !isLiveInScope) continue;
      formattedScore = `${formatCompactCount(numericScore)} pts`;
      if (hostScore >= gifterScore * 2 && hostScore >= viewerScore && (b.isHostInContext || isLiveInScope)) {
        roleLabel = liveContextType === 'party' ? 'Party Host' : 'Live Host';
      } else if (gifterScore * 2 >= viewerScore && gifterScore > 0) {
        roleLabel = 'Top Gifter';
      } else {
        roleLabel = 'Top Viewer';
      }
    }

    const profile = getRankingUserProfile(b.userId);
    // Attach authoritative progression level/verification if known
    const progRec = userProgressionStore.get(b.userId);
    if (progRec) {
      const progState = calculateProgressionState(progRec.totalQualifyingCoinsSpent);
      profile.level = Math.max(profile.level || 0, progState.currentLevel);
      profile.vipLevel = Math.max(profile.vipLevel || 0, progState.highestUnlockedVipTier);
      profile.superVipLevel = Math.max(profile.superVipLevel || 0, progState.highestUnlockedSuperVipTier);
      if (progRec.verificationTier) profile.verificationTier = progRec.verificationTier;
      if (progRec.verifiedTag) profile.verifiedTag = progRec.verifiedTag;
    }

    scored.push({
      userId: b.userId,
      user: profile,
      numericScore,
      score: formattedScore,
      roleLabel,
      isLive: isLiveInScope,
      liveContextId,
      liveContextType,
      metrics,
    });
  }

  scored.sort(
    (a, b) =>
      b.numericScore - a.numericScore ||
      (b.isLive ? 1 : 0) - (a.isLive ? 1 : 0) ||
      b.metrics.giftsCoins - a.metrics.giftsCoins
  );

  const allRankings = scored.map((item, idx) => ({
    rank: idx + 1,
    user: item.user,
    score: item.score,
    numericScore: item.numericScore,
    badge: idx === 0 ? ('gold' as const) : idx === 1 ? ('silver' as const) : idx === 2 ? ('bronze' as const) : undefined,
    trend: 'same' as const,
    roleLabel: item.roleLabel,
    isLive: item.isLive,
    liveContextId: item.liveContextId,
    liveContextType: item.liveContextType,
    metrics: item.metrics,
  }));

  const myIndex = userId ? allRankings.findIndex((r) => r.user.id === userId) : -1;
  const myEntry = myIndex >= 0 ? allRankings[myIndex] : null;

  return {
    rankings: allRankings.slice(0, maxLimit),
    myRank: myIndex >= 0 ? myIndex + 1 : null,
    myEntry,
    totalCount: allRankings.length,
    scope,
    category,
    period,
    contextId: contextId || null,
    resetAt,
    config: rankingConfig,
  };
}

app.get('/api/rankings/top-broadcasters', (_req: Request, res: Response) => {
  const board = computeLeaderboard({
    scope: 'global',
    category: 'host',
    period: 'weekly',
    limit: 2,
  });

  const entries = board.rankings.map((entry) => ({
    rank: entry.rank,
    user: entry.user,
    score: entry.numericScore,
    formattedScore: formatCompactCount(entry.numericScore),
    liveStreamId: entry.liveContextType === 'solo' ? entry.liveContextId : undefined,
    isCurrentlyLive: Boolean(entry.isLive),
    breakdown: {
      giftsCoinValue: entry.metrics?.giftsCoins || 0,
      uniqueViewers: entry.metrics?.uniqueViewers || 0,
      totalLikes: entry.metrics?.likesCount || 0,
      totalComments: entry.metrics?.commentsCount || 0,
    },
  }));

  res.json({ broadcasters: entries, config: rankingConfig });
});

app.get('/api/rankings', (req: Request, res: Response) => {
  const rawScope = String(req.query.scope || 'global').toLowerCase();
  const scope: RankingScope =
    rawScope === 'solo' || rawScope === 'party' ? rawScope : 'global';

  const rawPeriod = String(req.query.period || 'daily').toLowerCase();
  const period: RankingPeriod =
    rawPeriod === 'hourly' ||
    rawPeriod === 'daily' ||
    rawPeriod === 'weekly' ||
    rawPeriod === 'monthly' ||
    rawPeriod === 'all_time'
      ? rawPeriod
      : 'daily';

  const rawCategory = String(req.query.category || '').toLowerCase();
  const rawTab = String(req.query.tab || '').toLowerCase();
  let category: RankingCategory = 'all';
  if (rawCategory === 'host' || rawCategory === 'gifter' || rawCategory === 'viewer' || rawCategory === 'all') {
    category = rawCategory;
  } else if (rawTab === 'star') {
    category = 'host';
  } else if (rawTab === 'contribution') {
    category = 'gifter';
  } else if (rawTab === 'wealth') {
    category = 'all';
  }

  const contextId = req.query.contextId ? sanitizeText(String(req.query.contextId), 128) : undefined;
  const userId = req.query.userId ? sanitizeText(String(req.query.userId), 128) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 50;

  const result = computeLeaderboard({
    scope,
    category,
    period,
    contextId,
    userId,
    limit,
  });

  res.json(result);
});

app.get('/api/admin/ranking-config', (_req: Request, res: Response) => {
  res.json({ config: rankingConfig });
});

app.put('/api/admin/ranking-config', (req: AuthenticatedRequest, res: Response) => {
  if (!req.firebaseUser) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (!isVerifiedAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required to update ranking weights.' });
  }

  const { giftValueWeight, uniqueViewerWeight, engagementWeight, activeLiveBoost } = req.body;
  rankingConfig = {
    giftValueWeight: Math.max(0, Number(giftValueWeight ?? rankingConfig.giftValueWeight)),
    uniqueViewerWeight: Math.max(0, Number(uniqueViewerWeight ?? rankingConfig.uniqueViewerWeight)),
    engagementWeight: Math.max(0, Number(engagementWeight ?? rankingConfig.engagementWeight)),
    activeLiveBoost: Math.max(0, Number(activeLiveBoost ?? rankingConfig.activeLiveBoost)),
    updatedAt: new Date().toISOString(),
    updatedBy: req.firebaseUser.email || req.firebaseUser.uid,
  };

  scheduleRankingsPersist();
  broadcastAll('rankings:config_updated', { config: rankingConfig });
  res.json({ success: true, config: rankingConfig });
});

// --- WEBRTC ICE / TURN SERVERS ENDPOINT (FOR 4G/5G NAT TRAVERSAL) ---
app.get('/api/rtc/ice-servers', (_req: Request, res: Response) => {
  const iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' },
  ];

  // Include operator-configured TURN relay if provided via Railway env vars
  const turnUrls = (process.env.TURN_URLS || '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  if (turnUrls.length > 0) {
    iceServers.push({
      urls: turnUrls,
      ...(process.env.TURN_USERNAME ? { username: process.env.TURN_USERNAME } : {}),
      ...(process.env.TURN_CREDENTIAL ? { credential: process.env.TURN_CREDENTIAL } : {}),
    });
  } else {
    // Reliable public Metered OpenRelay fallback for 4G symmetric CGNAT devices
    iceServers.push(
      {
        urls: 'turn:global.relay.metered.ca:80',
        username: 'e8dd65b92f6dde43c885f6f7',
        credential: 'uWdWNmkhvyqTWjsm',
      },
      {
        urls: 'turn:global.relay.metered.ca:80?transport=tcp',
        username: 'e8dd65b92f6dde43c885f6f7',
        credential: 'uWdWNmkhvyqTWjsm',
      },
      {
        urls: 'turn:global.relay.metered.ca:443',
        username: 'e8dd65b92f6dde43c885f6f7',
        credential: 'uWdWNmkhvyqTWjsm',
      },
      {
        urls: 'turns:global.relay.metered.ca:443?transport=tcp',
        username: 'e8dd65b92f6dde43c885f6f7',
        credential: 'uWdWNmkhvyqTWjsm',
      }
    );
  }

  res.json({ iceServers });
});

// --- AGORA RTC TOKEN GENERATION & CONFIG ENDPOINTS ---
interface MintedAgoraToken {
  configured: boolean;
  tokenRequired: boolean;
  token: string | null;
  appId: string;
  channelName: string;
  uid: string;
  role: 'broadcaster' | 'audience';
  expiresAt: number | null;
  serverTime: number;
  message?: string;
}

function mintAgoraRtcToken(
  channelName: string,
  uid: string,
  requestedRole: string = 'audience',
  expirationTimeInSeconds: number = 3600
): MintedAgoraToken {
  const appId = (process.env.AGORA_APP_ID || '').trim();
  const appCertificate = (process.env.AGORA_APP_CERTIFICATE || '').trim();
  const normalizedRole: 'broadcaster' | 'audience' =
    requestedRole === 'broadcaster' || requestedRole === 'host' ? 'broadcaster' : 'audience';
  const normalizedUid = String(uid || '0').trim() || '0';
  const serverTime = Math.floor(Date.now() / 1000);

  if (!appId) {
    return {
      configured: false,
      tokenRequired: true,
      token: null,
      appId: '',
      channelName,
      uid: normalizedUid,
      role: normalizedRole,
      expiresAt: null,
      serverTime,
      message: 'AGORA_APP_ID is not configured on the backend server.',
    };
  }

  // Support App-ID-only testing mode when AGORA_APP_ID is set without certificate
  if (!appCertificate) {
    return {
      configured: true,
      tokenRequired: false,
      token: null,
      appId,
      channelName,
      uid: normalizedUid,
      role: normalizedRole,
      expiresAt: serverTime + expirationTimeInSeconds,
      serverTime,
      message: 'Agora App-ID-only mode active (set AGORA_APP_CERTIFICATE for production signed tokens).',
    };
  }

  const rtcRole = normalizedRole === 'broadcaster' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const expiresAt = serverTime + expirationTimeInSeconds;

  // agora-token v2 expects relative durations in seconds for BOTH tokenExpire and privilegeExpire
  const token = RtcTokenBuilder.buildTokenWithUserAccount(
    appId,
    appCertificate,
    channelName,
    normalizedUid,
    rtcRole,
    expirationTimeInSeconds,
    expirationTimeInSeconds
  );

  return {
    configured: true,
    tokenRequired: true,
    token,
    appId,
    channelName,
    uid: normalizedUid,
    role: normalizedRole,
    expiresAt,
    serverTime,
  };
}

app.get('/api/agora/config', (_req: Request, res: Response) => {
  const appId = (process.env.AGORA_APP_ID || '').trim();
  const hasCertificate = Boolean((process.env.AGORA_APP_CERTIFICATE || '').trim());
  const configured = Boolean(appId);
  res.json({
    configured,
    appId,
    tokenRequired: hasCertificate,
    requiresCertificate: !hasCertificate,
    mode: !appId ? 'unconfigured' : hasCertificate ? 'certificate' : 'appid-only',
  });
});

const handleAgoraTokenRequest = (req: AuthenticatedRequest, res: Response) => {
  const { channelName, uid, role = 'audience' } = req.body || {};
  const cleanChannel = typeof channelName === 'string' ? channelName.trim() : '';

  if (!cleanChannel || cleanChannel.length > 64) {
    return res.status(400).json({ error: 'Valid channelName (1-64 chars) is required.' });
  }

  const effectiveUid = String(req.firebaseUser?.uid || uid || '0').trim() || '0';
  const normalizedRole: 'broadcaster' | 'audience' =
    role === 'broadcaster' || role === 'host' ? 'broadcaster' : 'audience';

  // Enforce block checks for hydrated party rooms & live streams
  if (cleanChannel.startsWith('party_')) {
    const roomId = cleanChannel.slice(6);
    const room = partyRoomsMap.get(roomId);
    if (room && effectiveUid !== room.host.id && isUserBlockedBy(room.host.id, effectiveUid)) {
      return res.status(403).json({ error: 'Access denied: you are blocked by the room host.' });
    }
  } else {
    const stream = liveStreamsMap.get(cleanChannel);
    if (stream && effectiveUid !== stream.host.id && isUserBlockedBy(stream.host.id, effectiveUid)) {
      return res.status(403).json({ error: 'Access denied: you are blocked by the host.' });
    }
  }

  try {
    const minted = mintAgoraRtcToken(cleanChannel, effectiveUid, normalizedRole, 3600);
    if (!minted.configured) {
      return res.json({
        ...minted,
        success: false,
      });
    }

    res.json({
      ...minted,
      success: true,
    });
  } catch (err: any) {
    console.error('[Agora] Error generating RTC token:', {
      channelName: cleanChannel,
      uid: effectiveUid,
      role: normalizedRole,
      error: err?.message || err,
    });
    res.status(500).json({ error: 'Failed to generate RTC token', details: err?.message || 'Unknown error' });
  }
};

app.post('/api/agora/token', handleAgoraTokenRequest);
app.post('/api/agora/refresh-token', handleAgoraTokenRequest);

// ============================================================================
// AUTHORITATIVE 100-LEVEL, 12-VIP, 6-SUPER-VIP, ACHIEVEMENT & ADMIN ENGINE
// ============================================================================

interface ServerUserProgressionRecord {
  userId: string;
  userName?: string;
  userAvatar?: string;
  userEmail?: string;
  totalQualifyingCoinsSpent: number;
  activeFrameType: ActiveFrameType;
  equippedVipFrame: number;
  equippedSuperVipFrame: number;
  earnedAchievements: EarnedAchievementRecord[];
  equippedAchievementBadges: string[];
  verificationTier?: 'none' | 'blue' | 'gold';
  verifiedTag?: string;
  metrics: UserActivityMetrics;
  updatedAt: string;
}

interface ProgressionAuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorEmail?: string;
  targetUserId?: string;
  action:
    | 'coin_spend_progression'
    | 'frame_equipped'
    | 'achievement_awarded'
    | 'achievement_equipped'
    | 'admin_config_updated'
    | 'admin_user_adjusted'
    | 'store_item_purchased'
    | 'admin_store_product_saved'
    | 'admin_store_product_deleted';
  summary: string;
  details: Record<string, any>;
}

interface ProgressionUnlockHistoryRecord {
  id: string;
  userId: string;
  type:
    | 'level_up'
    | 'tier_up'
    | 'vip_unlock'
    | 'super_vip_unlock'
    | 'achievement_earned'
    | 'frame_equipped'
    | 'admin_adjustment';
  title: string;
  detail: string;
  oldLevel?: number;
  newLevel?: number;
  coinsDelta?: number;
  transactionId?: string;
  createdAt: string;
}

interface ProgressionDynamicOverrides {
  levelPerksOverrides: Record<number, string[]>;
  vipOverrides: Record<number, Partial<Pick<VipTierDefinition, 'name' | 'frameName' | 'perks'>>>;
  superVipOverrides: Record<number, Partial<Pick<SuperVipTierDefinition, 'name' | 'frameName' | 'perks'>>>;
  achievementOverrides: Record<string, Partial<Pick<AchievementBadgeDefinition, 'name' | 'description' | 'unlockConditionText' | 'targetValue'>>>;
  updatedAt: string;
  updatedBy: string;
}

const PROGRESSION_STORE_PATH = path.resolve(__dirname, '.lenzo_progression_store.json');
const userProgressionStore = new Map<string, ServerUserProgressionRecord>();
const progressionProcessedTxIds = new Map<string, { userId: string; response: any; processedAt: number }>();
const progressionUnlockHistory: ProgressionUnlockHistoryRecord[] = [];
const progressionAuditLogs: ProgressionAuditLogEntry[] = [];

let progressionOverrides: ProgressionDynamicOverrides = {
  levelPerksOverrides: {},
  vipOverrides: {},
  superVipOverrides: {},
  achievementOverrides: {},
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

function loadProgressionStoreFromDisk() {
  try {
    if (!fs.existsSync(PROGRESSION_STORE_PATH)) return;
    const raw = JSON.parse(fs.readFileSync(PROGRESSION_STORE_PATH, 'utf8'));
    if (Array.isArray(raw.users)) {
      for (const rec of raw.users) {
        if (rec && rec.userId) userProgressionStore.set(rec.userId, rec);
      }
    }
    if (Array.isArray(raw.unlockHistory)) {
      progressionUnlockHistory.push(...raw.unlockHistory.slice(0, 500));
    }
    if (Array.isArray(raw.auditLogs)) {
      progressionAuditLogs.push(...raw.auditLogs.slice(0, 500));
    }
    if (raw.overrides && typeof raw.overrides === 'object') {
      progressionOverrides = {
        ...progressionOverrides,
        ...raw.overrides,
      };
    }
  } catch (err) {
    console.warn('[Progression] Could not hydrate disk cache:', err);
  }
}

function persistProgressionStoreToDisk() {
  try {
    const payload = {
      users: Array.from(userProgressionStore.values()),
      unlockHistory: progressionUnlockHistory.slice(0, 500),
      auditLogs: progressionAuditLogs.slice(0, 500),
      overrides: progressionOverrides,
    };
    fs.writeFileSync(PROGRESSION_STORE_PATH, JSON.stringify(payload, null, 2), 'utf8');
  } catch {
    // non-fatal on ephemeral filesystems
  }
}

loadProgressionStoreFromDisk();

function getEffectiveLevels() {
  return ALL_100_LEVELS.map((lvl) => ({
    ...lvl,
    perks: progressionOverrides.levelPerksOverrides[lvl.level] || lvl.perks,
  }));
}

function getEffectiveVipTiers(): VipTierDefinition[] {
  return VIP_TIER_DEFINITIONS.map((v) => ({
    ...v,
    ...(progressionOverrides.vipOverrides[v.tier] || {}),
  }));
}

function getEffectiveSuperVipTiers(): SuperVipTierDefinition[] {
  return SUPER_VIP_TIER_DEFINITIONS.map((sv) => ({
    ...sv,
    ...(progressionOverrides.superVipOverrides[sv.tier] || {}),
  }));
}

function getEffectiveAchievements(): AchievementBadgeDefinition[] {
  return ACHIEVEMENT_BADGE_DEFINITIONS.map((a) => ({
    ...a,
    ...(progressionOverrides.achievementOverrides[a.id] || {}),
  }));
}

function getOrCreateUserProgressionRecord(
  userId: string,
  meta?: { name?: string; avatar?: string; email?: string }
): ServerUserProgressionRecord {
  let rec = userProgressionStore.get(userId);
  if (!rec) {
    rec = {
      userId,
      userName: meta?.name || '',
      userAvatar: meta?.avatar || '',
      userEmail: meta?.email || '',
      totalQualifyingCoinsSpent: 0,
      activeFrameType: 'none',
      equippedVipFrame: 0,
      equippedSuperVipFrame: 0,
      earnedAchievements: [],
      equippedAchievementBadges: [],
      metrics: {
        totalQualifyingCoinsSpent: 0,
        diamondsEarned: 0,
        publicVideosCount: 0,
        liveSessionsHosted: 0,
        loginStreakDays: 1,
        giftsSentCount: 0,
        followersCount: 0,
        followingCount: 0,
        totalLikesCount: 0,
        hasAgency: false,
        pkWinsCount: 0,
        eventsWonCount: 0,
        profileCompletedSteps: 0,
      },
      updatedAt: new Date().toISOString(),
    };
    userProgressionStore.set(userId, rec);
  } else {
    if (meta?.name) rec.userName = meta.name;
    if (meta?.avatar) rec.userAvatar = meta.avatar;
    if (meta?.email) rec.userEmail = meta.email;
  }
  return rec;
}

function buildUserProgressionPayload(rec: ServerUserProgressionRecord) {
  const computed = calculateProgressionState(rec.totalQualifyingCoinsSpent, {
    userId: rec.userId,
    activeFrameType: rec.activeFrameType,
    equippedVipFrame: rec.equippedVipFrame,
    equippedSuperVipFrame: rec.equippedSuperVipFrame,
    equippedAchievementBadges: rec.equippedAchievementBadges,
  });

  const effectiveAchievements = getEffectiveAchievements();
  const evaluated = evaluateAchievementBadges(
    { ...rec.metrics, totalQualifyingCoinsSpent: rec.totalQualifyingCoinsSpent },
    rec.earnedAchievements,
    rec.equippedAchievementBadges,
    effectiveAchievements
  );

  // Sync newly earned achievements deterministically (exact once with timestamp)
  const existingEarnedIds = new Set(rec.earnedAchievements.map((e) => e.badgeId));
  const newlyEarnedDefs: AchievementBadgeDefinition[] = [];
  const nowIso = new Date().toISOString();

  for (const item of evaluated) {
    if (item.isEarned && !existingEarnedIds.has(item.id)) {
      rec.earnedAchievements.push({
        badgeId: item.id,
        earnedAt: nowIso,
        source: 'system_verified',
      });
      item.earnedAt = nowIso;
      existingEarnedIds.add(item.id);
      newlyEarnedDefs.push(item);

      progressionUnlockHistory.unshift({
        id: `uh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: rec.userId,
        type: 'achievement_earned',
        title: `Achievement Earned: ${item.name}`,
        detail: item.unlockConditionText,
        createdAt: nowIso,
      });
    }
  }

  return {
    progression: {
      userId: rec.userId,
      currentLevel: computed.currentLevel,
      currentTier: computed.currentTierId,
      currentTierName: computed.currentTierName,
      totalQualifyingCoinsSpent: computed.totalQualifyingCoinsSpent,
      coinsInCurrentLevel: computed.coinsInCurrentLevel,
      coinsNeededForNextLevel: computed.coinsForCurrentLevel,
      remainingCoinsNeeded: computed.remainingCoinsNeeded,
      percentage: computed.percentage,
      isMaxLevel: computed.isMaxLevel,
      isMaxMastery: computed.isMaxMastery,
      highestUnlockedVipTier: computed.highestUnlockedVipTier,
      unlockedVipTiers: computed.unlockedVipTiers,
      highestUnlockedSuperVipTier: computed.highestUnlockedSuperVipTier,
      unlockedSuperVipTiers: computed.unlockedSuperVipTiers,
      activeFrameType: computed.activeFrameType,
      equippedVipFrame: computed.equippedVipFrame,
      equippedSuperVipFrame: computed.equippedSuperVipFrame,
      earnedAchievements: rec.earnedAchievements,
      equippedAchievementBadges: computed.equippedAchievementBadges,
      updatedAt: rec.updatedAt,
    },
    achievements: evaluated,
    newlyEarnedDefs,
  };
}

function appendAuditLog(entry: Omit<ProgressionAuditLogEntry, 'id' | 'timestamp'>) {
  progressionAuditLogs.unshift({
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (progressionAuditLogs.length > 500) progressionAuditLogs.length = 500;
}

function requireAdminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!isVerifiedAdmin(req)) {
    return res.status(403).json({
      error: 'Forbidden: Administrator privileges (verified admin account) are required.',
    });
  }
  return next();
}

// 1. Public Progression Configuration & Mathematical Audit
app.get('/api/progression/config', (_req: Request, res: Response) => {
  res.json({
    audit: getProgressionMathAudit(),
    tiers: LEVEL_TIER_CONFIGS,
    levels: getEffectiveLevels(),
    vipTiers: getEffectiveVipTiers(),
    superVipTiers: getEffectiveSuperVipTiers(),
    achievements: getEffectiveAchievements(),
    maxEquippedAchievements: MAX_EQUIPPED_ACHIEVEMENT_BADGES,
    updatedAt: progressionOverrides.updatedAt,
  });
});

// 2. Get Authoritative User Progression, Verified Achievements & Unlock History
app.get('/api/progression/user/:userId', (req: AuthenticatedRequest, res: Response) => {
  const userId = sanitizeText(req.params.userId, 128);
  if (!userId) {
    return res.status(400).json({ error: 'Valid userId is required.' });
  }
  const rec = getOrCreateUserProgressionRecord(userId);
  const { progression, achievements } = buildUserProgressionPayload(rec);
  const unlockHistory = progressionUnlockHistory.filter((h) => h.userId === userId).slice(0, 50);

  return res.json({
    progression,
    achievements,
    unlockHistory,
    verificationTier: rec.verificationTier,
    verifiedTag: rec.verifiedTag || '',
  });
});

// 3. Atomic Qualifying Coin Spend -> Automatic Multi-Level, VIP, Super VIP & Achievement Progression
app.post('/api/progression/spend', (req: AuthenticatedRequest, res: Response) => {
  const bodyUserId = sanitizeText(req.body?.userId, 128);
  const userId = req.firebaseUser?.uid || bodyUserId;
  const coinsSpent = Math.floor(Number(req.body?.coinsSpent || 0));
  const transactionId = sanitizeText(req.body?.transactionId, 128);
  const reason = sanitizeText(req.body?.reason || 'gift_sent', 80);

  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }
  if (!Number.isFinite(coinsSpent) || coinsSpent <= 0 || coinsSpent > TOTAL_PROGRESSION_COINS_EXACT) {
    return res.status(400).json({ error: 'coinsSpent must be a positive integer.' });
  }

  // Idempotency guard: duplicate transactionId returns cached response without double-counting
  if (transactionId && progressionProcessedTxIds.has(transactionId)) {
    const cached = progressionProcessedTxIds.get(transactionId)!;
    return res.status(200).json({
      ...cached.response,
      duplicate: true,
    });
  }

  const snap = req.body?.userSnapshot || {};
  const rec = getOrCreateUserProgressionRecord(userId, {
    name: sanitizeText(snap.name || req.firebaseUser?.name || '', 80),
    avatar: sanitizeText(snap.avatar || req.firebaseUser?.picture || '', 1200),
    email: sanitizeText(snap.email || req.firebaseUser?.email || '', 120),
  });

  const oldTotalCoins = rec.totalQualifyingCoinsSpent;
  const newTotalCoins = oldTotalCoins + coinsSpent;
  const diff = detectMilestoneUnlocks(oldTotalCoins, newTotalCoins);

  rec.totalQualifyingCoinsSpent = newTotalCoins;
  rec.metrics.totalQualifyingCoinsSpent = newTotalCoins;
  rec.metrics.giftsSentCount = (rec.metrics.giftsSentCount || 0) + 1;
  if (snap.metrics && typeof snap.metrics === 'object') {
    if (typeof snap.metrics.diamondsEarned === 'number') rec.metrics.diamondsEarned = Math.max(rec.metrics.diamondsEarned, snap.metrics.diamondsEarned);
    if (typeof snap.metrics.publicVideosCount === 'number') rec.metrics.publicVideosCount = Math.max(rec.metrics.publicVideosCount, snap.metrics.publicVideosCount);
    if (typeof snap.metrics.liveSessionsHosted === 'number') rec.metrics.liveSessionsHosted = Math.max(rec.metrics.liveSessionsHosted, snap.metrics.liveSessionsHosted);
    if (typeof snap.metrics.loginStreakDays === 'number') rec.metrics.loginStreakDays = Math.max(rec.metrics.loginStreakDays, snap.metrics.loginStreakDays);
    if (typeof snap.metrics.followersCount === 'number') rec.metrics.followersCount = Math.max(rec.metrics.followersCount, snap.metrics.followersCount);
    if (typeof snap.metrics.followingCount === 'number') rec.metrics.followingCount = Math.max(rec.metrics.followingCount, snap.metrics.followingCount);
    if (typeof snap.metrics.totalLikesCount === 'number') rec.metrics.totalLikesCount = Math.max(rec.metrics.totalLikesCount, snap.metrics.totalLikesCount);
    if (typeof snap.metrics.hasAgency === 'boolean') rec.metrics.hasAgency = rec.metrics.hasAgency || snap.metrics.hasAgency;
    if (typeof snap.metrics.profileCompletedSteps === 'number') rec.metrics.profileCompletedSteps = Math.max(rec.metrics.profileCompletedSteps, snap.metrics.profileCompletedSteps);
  }
  rec.updatedAt = new Date().toISOString();

  // Only record a global ranking event if not already recorded by a solo live or party room gift endpoint
  const lowerReason = reason.toLowerCase();
  if (!lowerReason.includes('live') && !lowerReason.includes('room') && !lowerReason.includes('party')) {
    recordRankingEvent({
      scope: 'global',
      type: 'gift',
      actorId: userId,
      coins: coinsSpent,
      quantity: 1,
    });
  }

  const { progression, achievements, newlyEarnedDefs } = buildUserProgressionPayload(rec);
  const nowIso = new Date().toISOString();

  // Record exact-once unlock history entries for every crossed milestone
  if (diff.leveledUp) {
    progressionUnlockHistory.unshift({
      id: `uh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      type: diff.tierChanged ? 'tier_up' : 'level_up',
      title: diff.tierChanged
        ? `Reached Level ${diff.newLevel} (${progression.currentTierName} Tier)`
        : `Leveled Up: Lv ${diff.oldLevel} → Lv ${diff.newLevel}`,
      detail: `Spent ${coinsSpent.toLocaleString()} coins (${reason})`,
      oldLevel: diff.oldLevel,
      newLevel: diff.newLevel,
      coinsDelta: coinsSpent,
      transactionId: transactionId || undefined,
      createdAt: nowIso,
    });
  }

  for (const vipDef of diff.newlyUnlockedVipFrames) {
    progressionUnlockHistory.unshift({
      id: `uh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      type: 'vip_unlock',
      title: `Unlocked ${vipDef.code} — ${vipDef.frameName}`,
      detail: `Milestone reached at Level ${vipDef.unlockLevel}`,
      newLevel: diff.newLevel,
      transactionId: transactionId || undefined,
      createdAt: nowIso,
    });
  }

  for (const svDef of diff.newlyUnlockedSuperVipFrames) {
    progressionUnlockHistory.unshift({
      id: `uh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      type: 'super_vip_unlock',
      title: `Unlocked ${svDef.code} — ${svDef.frameName}`,
      detail: `Super VIP milestone reached at Level ${svDef.unlockLevel}`,
      newLevel: diff.newLevel,
      transactionId: transactionId || undefined,
      createdAt: nowIso,
    });
  }

  appendAuditLog({
    actorId: userId,
    actorEmail: req.firebaseUser?.email,
    targetUserId: userId,
    action: 'coin_spend_progression',
    summary: `Qualifying spend +${coinsSpent.toLocaleString()} coins (${oldTotalCoins.toLocaleString()} → ${newTotalCoins.toLocaleString()}) · Lv ${diff.oldLevel} → Lv ${diff.newLevel}`,
    details: {
      coinsSpent,
      oldTotalCoins,
      newTotalCoins,
      oldLevel: diff.oldLevel,
      newLevel: diff.newLevel,
      newlyUnlockedVipTiers: diff.newlyUnlockedVipTiers,
      newlyUnlockedSuperVipTiers: diff.newlyUnlockedSuperVipTiers,
      newlyEarnedAchievements: newlyEarnedDefs.map((d) => d.id),
      transactionId: transactionId || null,
      reason,
    },
  });

  const latestVip = diff.newlyUnlockedVipFrames[diff.newlyUnlockedVipFrames.length - 1];
  const latestSuperVip = diff.newlyUnlockedSuperVipFrames[diff.newlyUnlockedSuperVipFrames.length - 1];

  const levelUpEvent =
    diff.leveledUp || newlyEarnedDefs.length > 0
      ? {
          oldLevel: diff.oldLevel,
          newLevel: diff.newLevel,
          oldTier: diff.oldTierId,
          newTier: diff.newTierId,
          tierChanged: diff.tierChanged,
          coinsSpent,
          badge: getLevelDefinition(diff.newLevel),
          unlockedVipFrame: latestVip
            ? {
                ...latestVip,
                borderColor: latestVip.primaryColor,
                glowColor: latestVip.glowColor,
                gradientBg: latestVip.gradientCss,
                badgeIcon: latestVip.code,
              }
            : undefined,
          unlockedVipFrames: diff.newlyUnlockedVipFrames,
          unlockedSuperVipFrame: latestSuperVip,
          unlockedSuperVipFrames: diff.newlyUnlockedSuperVipFrames,
          newlyEarnedAchievements: newlyEarnedDefs,
        }
      : undefined;

  const responsePayload = {
    success: true,
    duplicate: false,
    progression,
    achievements,
    levelUpEvent,
  };

  if (transactionId) {
    progressionProcessedTxIds.set(transactionId, {
      userId,
      response: responsePayload,
      processedAt: Date.now(),
    });
  }

  persistProgressionStoreToDisk();
  broadcastToUser(userId, 'progression:updated', responsePayload);

  return res.json(responsePayload);
});

// 4. Equip Active Profile Frame (VIP 1..12 OR Super VIP 1..6 OR None) — Server-Validated!
app.post('/api/progression/equip-frame', (req: AuthenticatedRequest, res: Response) => {
  const bodyUserId = sanitizeText(req.body?.userId, 128);
  const userId = req.firebaseUser?.uid || bodyUserId;
  const frameType = req.body?.frameType as ActiveFrameType;
  const tier = Math.floor(Number(req.body?.tier || 0));

  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }
  if (!['none', 'vip', 'super_vip'].includes(frameType)) {
    return res.status(400).json({ error: 'frameType must be "none", "vip", or "super_vip".' });
  }

  const rec = getOrCreateUserProgressionRecord(userId);
  const current = calculateProgressionState(rec.totalQualifyingCoinsSpent, {
    userId,
    activeFrameType: rec.activeFrameType,
    equippedVipFrame: rec.equippedVipFrame,
    equippedSuperVipFrame: rec.equippedSuperVipFrame,
  });

  if (frameType === 'none' || tier <= 0) {
    rec.activeFrameType = 'none';
    rec.equippedVipFrame = 0;
    rec.equippedSuperVipFrame = 0;
  } else if (frameType === 'vip') {
    const def = getVipTierDefinition(tier);
    if (!def) {
      return res.status(400).json({ error: 'Invalid VIP tier (must be 1–12).' });
    }
    if (!current.unlockedVipTiers.includes(tier)) {
      return res.status(403).json({
        error: `${def.code} (${def.frameName}) is locked. Reach Level ${def.unlockLevel} to unlock it.`,
        requiredLevel: def.unlockLevel,
        currentLevel: current.currentLevel,
      });
    }
    rec.activeFrameType = 'vip';
    rec.equippedVipFrame = tier;
    rec.equippedSuperVipFrame = 0; // Mutually exclusive: prevents overlap
  } else if (frameType === 'super_vip') {
    const def = getSuperVipTierDefinition(tier);
    if (!def) {
      return res.status(400).json({ error: 'Invalid Super VIP tier (must be 1–6).' });
    }
    if (!current.unlockedSuperVipTiers.includes(tier)) {
      return res.status(403).json({
        error: `${def.code} (${def.frameName}) is locked. Reach Level ${def.unlockLevel} to unlock it.`,
        requiredLevel: def.unlockLevel,
        currentLevel: current.currentLevel,
      });
    }
    rec.activeFrameType = 'super_vip';
    rec.equippedSuperVipFrame = tier;
    rec.equippedVipFrame = 0; // Mutually exclusive: prevents overlap
  }

  rec.updatedAt = new Date().toISOString();
  const { progression } = buildUserProgressionPayload(rec);

  appendAuditLog({
    actorId: userId,
    actorEmail: req.firebaseUser?.email,
    targetUserId: userId,
    action: 'frame_equipped',
    summary:
      rec.activeFrameType === 'none'
        ? 'Unequipped profile frame'
        : `Equipped ${rec.activeFrameType === 'super_vip' ? `SUPER VIP ${rec.equippedSuperVipFrame}` : `VIP ${rec.equippedVipFrame}`} frame`,
    details: {
      activeFrameType: rec.activeFrameType,
      equippedVipFrame: rec.equippedVipFrame,
      equippedSuperVipFrame: rec.equippedSuperVipFrame,
    },
  });

  persistProgressionStoreToDisk();

  return res.json({
    success: true,
    message:
      rec.activeFrameType === 'none'
        ? 'Profile frame removed.'
        : rec.activeFrameType === 'super_vip'
        ? `Super VIP ${rec.equippedSuperVipFrame} frame equipped.`
        : `VIP ${rec.equippedVipFrame} frame equipped.`,
    progression,
  });
});

// 5. Evaluate Independent Achievement Badges from Verified Activity Metrics
app.post('/api/progression/achievements/evaluate', (req: AuthenticatedRequest, res: Response) => {
  const bodyUserId = sanitizeText(req.body?.userId, 128);
  const userId = req.firebaseUser?.uid || bodyUserId;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }

  const rec = getOrCreateUserProgressionRecord(userId);
  const m = req.body?.metrics || {};
  if (typeof m.diamondsEarned === 'number' && m.diamondsEarned >= 0) {
    rec.metrics.diamondsEarned = Math.max(rec.metrics.diamondsEarned, Math.floor(m.diamondsEarned));
  }
  if (typeof m.publicVideosCount === 'number' && m.publicVideosCount >= 0) {
    rec.metrics.publicVideosCount = Math.max(rec.metrics.publicVideosCount, Math.floor(m.publicVideosCount));
  }
  if (typeof m.liveSessionsHosted === 'number' && m.liveSessionsHosted >= 0) {
    rec.metrics.liveSessionsHosted = Math.max(rec.metrics.liveSessionsHosted, Math.floor(m.liveSessionsHosted));
  }
  if (typeof m.loginStreakDays === 'number' && m.loginStreakDays >= 1) {
    rec.metrics.loginStreakDays = Math.max(rec.metrics.loginStreakDays, Math.floor(m.loginStreakDays));
  }
  if (typeof m.followersCount === 'number' && m.followersCount >= 0) {
    rec.metrics.followersCount = Math.max(rec.metrics.followersCount, Math.floor(m.followersCount));
  }
  if (typeof m.followingCount === 'number' && m.followingCount >= 0) {
    rec.metrics.followingCount = Math.max(rec.metrics.followingCount, Math.floor(m.followingCount));
  }
  if (typeof m.totalLikesCount === 'number' && m.totalLikesCount >= 0) {
    rec.metrics.totalLikesCount = Math.max(rec.metrics.totalLikesCount, Math.floor(m.totalLikesCount));
  }
  if (typeof m.hasAgency === 'boolean') {
    rec.metrics.hasAgency = rec.metrics.hasAgency || m.hasAgency;
  }
  if (typeof m.pkWinsCount === 'number' && m.pkWinsCount >= 0) {
    rec.metrics.pkWinsCount = Math.max(rec.metrics.pkWinsCount, Math.floor(m.pkWinsCount));
  }
  if (typeof m.eventsWonCount === 'number' && m.eventsWonCount >= 0) {
    rec.metrics.eventsWonCount = Math.max(rec.metrics.eventsWonCount, Math.floor(m.eventsWonCount));
  }
  if (typeof m.profileCompletedSteps === 'number' && m.profileCompletedSteps >= 0) {
    rec.metrics.profileCompletedSteps = Math.max(
      rec.metrics.profileCompletedSteps,
      Math.min(3, Math.floor(m.profileCompletedSteps))
    );
  }
  rec.updatedAt = new Date().toISOString();

  const { progression, achievements, newlyEarnedDefs } = buildUserProgressionPayload(rec);
  if (newlyEarnedDefs.length > 0) {
    appendAuditLog({
      actorId: userId,
      targetUserId: userId,
      action: 'achievement_awarded',
      summary: `Awarded ${newlyEarnedDefs.map((d) => d.name).join(', ')}`,
      details: { awardedIds: newlyEarnedDefs.map((d) => d.id) },
    });
    persistProgressionStoreToDisk();
  }

  return res.json({
    success: true,
    progression,
    achievements,
    newlyEarned: achievements.filter((a) => newlyEarnedDefs.some((d) => d.id === a.id)),
    equippedAchievementBadges: rec.equippedAchievementBadges,
  });
});

// 6. Equip Achievement Badges in Badge Vault (Strictly Max 3 & Must Be Earned!)
app.post('/api/progression/achievements/equip', (req: AuthenticatedRequest, res: Response) => {
  const bodyUserId = sanitizeText(req.body?.userId, 128);
  const userId = req.firebaseUser?.uid || bodyUserId;
  const rawBadgeIds = req.body?.badgeIds;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }
  if (!Array.isArray(rawBadgeIds)) {
    return res.status(400).json({ error: 'badgeIds array is required.' });
  }

  const uniqueIds = Array.from(new Set(rawBadgeIds.map((id) => sanitizeText(id, 64)).filter(Boolean)));
  if (uniqueIds.length > MAX_EQUIPPED_ACHIEVEMENT_BADGES) {
    return res.status(400).json({
      error: `Maximum ${MAX_EQUIPPED_ACHIEVEMENT_BADGES} achievement badges can be equipped on your profile.`,
    });
  }

  const rec = getOrCreateUserProgressionRecord(userId);
  const { achievements } = buildUserProgressionPayload(rec);
  const earnedSet = new Set(achievements.filter((a) => a.isEarned).map((a) => a.id));

  for (const id of uniqueIds) {
    if (!earnedSet.has(id)) {
      return res.status(403).json({
        error: `Achievement badge "${id}" has not been earned yet and cannot be equipped.`,
      });
    }
  }

  rec.equippedAchievementBadges = uniqueIds;
  rec.updatedAt = new Date().toISOString();

  appendAuditLog({
    actorId: userId,
    actorEmail: req.firebaseUser?.email,
    targetUserId: userId,
    action: 'achievement_equipped',
    summary: `Updated equipped achievement badges (${uniqueIds.length}/${MAX_EQUIPPED_ACHIEVEMENT_BADGES})`,
    details: { equippedAchievementBadges: uniqueIds },
  });
  persistProgressionStoreToDisk();

  return res.json({
    success: true,
    equippedAchievementBadges: rec.equippedAchievementBadges,
  });
});

// 7. ADMIN-ONLY PROGRESSION MANAGEMENT ENDPOINTS (Strict HTTP 403 for Non-Admins!)
app.get('/api/admin/progression/overview', requireAdminMiddleware, (_req: AuthenticatedRequest, res: Response) => {
  const users = Array.from(userProgressionStore.values()).map((rec) => {
    const { progression, achievements } = buildUserProgressionPayload(rec);
    return {
      userId: rec.userId,
      userName: rec.userName || rec.userId,
      userAvatar: rec.userAvatar || '',
      userEmail: rec.userEmail || '',
      progression,
      earnedAchievementsCount: achievements.filter((a) => a.isEarned).length,
      equippedAchievementBadges: rec.equippedAchievementBadges,
      verificationTier: rec.verificationTier,
      verifiedTag: rec.verifiedTag || '',
    };
  });

  res.json({
    audit: getProgressionMathAudit(),
    tiers: LEVEL_TIER_CONFIGS,
    levels: getEffectiveLevels(),
    vipTiers: getEffectiveVipTiers(),
    superVipTiers: getEffectiveSuperVipTiers(),
    achievements: getEffectiveAchievements(),
    users,
    unlockHistory: progressionUnlockHistory.slice(0, 100),
    auditLogs: progressionAuditLogs.slice(0, 100),
    overridesUpdatedAt: progressionOverrides.updatedAt,
    overridesUpdatedBy: progressionOverrides.updatedBy,
  });
});

app.put('/api/admin/progression/config', requireAdminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { section, id, patch } = req.body || {};
  if (!section || !patch || typeof patch !== 'object') {
    return res.status(400).json({ error: 'section and patch object are required.' });
  }

  const adminEmail = req.firebaseUser?.email || 'admin';
  const adminUid = req.firebaseUser?.uid || 'admin';

  if (section === 'level') {
    const levelNum = Number(id);
    if (!Number.isInteger(levelNum) || levelNum < 1 || levelNum > 100) {
      return res.status(400).json({ error: 'Level number must be an integer between 1 and 100.' });
    }
    if (Array.isArray(patch.perks)) {
      const cleanedPerks = patch.perks
        .map((p: unknown) => sanitizeText(p, 160))
        .filter(Boolean)
        .slice(0, 6);
      progressionOverrides.levelPerksOverrides[levelNum] = cleanedPerks;
    }
  } else if (section === 'vip') {
    const tierNum = Number(id);
    if (!Number.isInteger(tierNum) || tierNum < 1 || tierNum > 12) {
      return res.status(400).json({ error: 'VIP tier must be an integer between 1 and 12.' });
    }
    const existing = progressionOverrides.vipOverrides[tierNum] || {};
    progressionOverrides.vipOverrides[tierNum] = {
      ...existing,
      ...(typeof patch.name === 'string' && patch.name.trim() ? { name: sanitizeText(patch.name, 60) } : {}),
      ...(typeof patch.frameName === 'string' && patch.frameName.trim()
        ? { frameName: sanitizeText(patch.frameName, 80) }
        : {}),
      ...(Array.isArray(patch.perks)
        ? { perks: patch.perks.map((p: unknown) => sanitizeText(p, 140)).filter(Boolean).slice(0, 6) }
        : {}),
    };
  } else if (section === 'super_vip') {
    const tierNum = Number(id);
    if (!Number.isInteger(tierNum) || tierNum < 1 || tierNum > 6) {
      return res.status(400).json({ error: 'Super VIP tier must be an integer between 1 and 6.' });
    }
    const existing = progressionOverrides.superVipOverrides[tierNum] || {};
    progressionOverrides.superVipOverrides[tierNum] = {
      ...existing,
      ...(typeof patch.name === 'string' && patch.name.trim() ? { name: sanitizeText(patch.name, 60) } : {}),
      ...(typeof patch.frameName === 'string' && patch.frameName.trim()
        ? { frameName: sanitizeText(patch.frameName, 80) }
        : {}),
      ...(Array.isArray(patch.perks)
        ? { perks: patch.perks.map((p: unknown) => sanitizeText(p, 140)).filter(Boolean).slice(0, 6) }
        : {}),
    };
  } else if (section === 'achievement') {
    const achId = sanitizeText(id, 64);
    const existsDef = ACHIEVEMENT_BADGE_DEFINITIONS.find((a) => a.id === achId);
    if (!existsDef) {
      return res.status(404).json({ error: 'Achievement badge not found.' });
    }
    const existing = progressionOverrides.achievementOverrides[achId] || {};
    progressionOverrides.achievementOverrides[achId] = {
      ...existing,
      ...(typeof patch.name === 'string' && patch.name.trim() ? { name: sanitizeText(patch.name, 60) } : {}),
      ...(typeof patch.description === 'string' && patch.description.trim()
        ? { description: sanitizeText(patch.description, 240) }
        : {}),
      ...(typeof patch.unlockConditionText === 'string' && patch.unlockConditionText.trim()
        ? { unlockConditionText: sanitizeText(patch.unlockConditionText, 180) }
        : {}),
      ...(typeof patch.targetValue === 'number' && patch.targetValue > 0
        ? { targetValue: Math.floor(patch.targetValue) }
        : {}),
    };
  } else {
    return res.status(400).json({ error: 'Invalid section. Use level, vip, super_vip, or achievement.' });
  }

  progressionOverrides.updatedAt = new Date().toISOString();
  progressionOverrides.updatedBy = adminEmail;

  appendAuditLog({
    actorId: adminUid,
    actorEmail: adminEmail,
    action: 'admin_config_updated',
    summary: `Admin updated ${section} configuration (${String(id)})`,
    details: { section, id, patch },
  });
  persistProgressionStoreToDisk();

  return res.json({
    success: true,
    updatedAt: progressionOverrides.updatedAt,
    audit: getProgressionMathAudit(),
  });
});

app.post('/api/admin/progression/adjust-user', requireAdminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const targetUserId = sanitizeText(req.body?.targetUserId, 128);
  const addCoins = Math.floor(Number(req.body?.addCoins || 0));
  const awardAchievementId = sanitizeText(req.body?.awardAchievementId || '', 64);
  const rawVerificationTier = typeof req.body?.verificationTier === 'string' ? req.body.verificationTier.trim().toLowerCase() : '';
  const rawVerifiedTag = typeof req.body?.verifiedTag === 'string' ? sanitizeText(req.body.verifiedTag, 32) : undefined;
  const reason = sanitizeText(req.body?.reason || 'Admin audited adjustment', 200);

  if (!targetUserId) {
    return res.status(400).json({ error: 'targetUserId is required.' });
  }

  const adminEmail = req.firebaseUser?.email || 'admin';
  const adminUid = req.firebaseUser?.uid || 'admin';
  const rec = getOrCreateUserProgressionRecord(targetUserId);
  const oldCoins = rec.totalQualifyingCoinsSpent;
  const oldState = calculateProgressionState(oldCoins);

  if (Number.isFinite(addCoins) && addCoins !== 0) {
    rec.totalQualifyingCoinsSpent = Math.max(0, Math.min(TOTAL_PROGRESSION_COINS_EXACT, rec.totalQualifyingCoinsSpent + addCoins));
    rec.metrics.totalQualifyingCoinsSpent = rec.totalQualifyingCoinsSpent;
  }

  if (awardAchievementId) {
    const def = ACHIEVEMENT_BADGE_DEFINITIONS.find((a) => a.id === awardAchievementId);
    if (!def) {
      return res.status(404).json({ error: 'Achievement badge ID not found.' });
    }
    if (!rec.earnedAchievements.some((e) => e.badgeId === awardAchievementId)) {
      rec.earnedAchievements.push({
        badgeId: awardAchievementId,
        earnedAt: new Date().toISOString(),
        source: `admin:${adminEmail}`,
      });
    }
  }

  if (rawVerificationTier === 'auto') {
    delete rec.verificationTier;
  } else if (rawVerificationTier === 'none' || rawVerificationTier === 'blue' || rawVerificationTier === 'gold') {
    rec.verificationTier = rawVerificationTier;
  }

  if (rawVerifiedTag !== undefined) {
    rec.verifiedTag = rawVerifiedTag;
  }

  rec.updatedAt = new Date().toISOString();
  const { progression, achievements } = buildUserProgressionPayload(rec);

  progressionUnlockHistory.unshift({
    id: `uh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: targetUserId,
    type: 'admin_adjustment',
    title: `Admin Progression Adjustment`,
    detail: `${reason} (Lv ${oldState.currentLevel} → Lv ${progression.currentLevel}${rec.verificationTier ? ` · Verify: ${rec.verificationTier}` : ''})`,
    oldLevel: oldState.currentLevel,
    newLevel: progression.currentLevel,
    coinsDelta: addCoins,
    createdAt: new Date().toISOString(),
  });

  appendAuditLog({
    actorId: adminUid,
    actorEmail: adminEmail,
    targetUserId,
    action: 'admin_user_adjusted',
    summary: `Adjusted ${targetUserId}: coins ${oldCoins.toLocaleString()} → ${rec.totalQualifyingCoinsSpent.toLocaleString()}${rec.verificationTier ? ` · Verification=${rec.verificationTier}` : ''} (${reason})`,
    details: {
      oldCoins,
      newCoins: rec.totalQualifyingCoinsSpent,
      oldLevel: oldState.currentLevel,
      newLevel: progression.currentLevel,
      awardAchievementId: awardAchievementId || null,
      verificationTier: rec.verificationTier || null,
      verifiedTag: rec.verifiedTag || null,
      reason,
    },
  });
  persistProgressionStoreToDisk();

  return res.json({
    success: true,
    progression,
    achievements,
    verificationTier: rec.verificationTier,
    verifiedTag: rec.verifiedTag || '',
  });
});

app.get('/api/admin/progression/audit-logs', requireAdminMiddleware, (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    auditLogs: progressionAuditLogs.slice(0, 200),
    unlockHistory: progressionUnlockHistory.slice(0, 200),
  });
});

// ============================================================================
// LENZO PARTY STORE — CATALOG, VALIDATED PURCHASES & ADMIN MANAGEMENT API
// ============================================================================
interface ServerStoreProduct {
  id: string;
  name: string;
  categoryId: 'vip_frames' | 'special_entry' | 'custom_gift' | 'premium_assets';
  priceCoins: number;
  description: string;
  imageUrl?: string;
  animationUrl?: string;
  animationPreset: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  glowColor: string;
  badgeText?: string;
  durationDays?: number;
  isFeatured: boolean;
  enabled: boolean;
  sortOrder: number;
  updatedAt?: string;
}

const VALID_STORE_CATEGORIES = new Set([
  'vip_frames',
  'special_entry',
  'custom_gift',
  'premium_assets',
]);

const STORE_DATA_FILE = path.resolve(__dirname, 'data', 'lenzo-store.json');

const SEED_STORE_PRODUCTS: ServerStoreProduct[] = [
  { id: 'vip_frame_royal_flame', name: 'Royal Flame', categoryId: 'vip_frames', priceCoins: 2500, description: 'Blazing golden crown crest with rotating molten-amber flame ring and rising royal embers.', animationPreset: 'royal_flame', primaryColor: '#FF8A00', secondaryColor: '#FFC84A', accentColor: '#FFE082', glowColor: 'rgba(255, 160, 24, 0.75)', badgeText: 'POPULAR', durationDays: 0, isFeatured: true, enabled: true, sortOrder: 1 },
  { id: 'vip_frame_neon_galaxy', name: 'Neon Galaxy', categoryId: 'vip_frames', priceCoins: 4800, description: 'Orbiting electric magenta-violet cosmic vortex with dual stardust particles.', animationPreset: 'neon_galaxy', primaryColor: '#A855F7', secondaryColor: '#EC4899', accentColor: '#38BDF8', glowColor: 'rgba(192, 68, 255, 0.8)', badgeText: 'HOT', durationDays: 0, isFeatured: false, enabled: true, sortOrder: 2 },
  { id: 'vip_frame_diamond_aura', name: 'Diamond Aura', categoryId: 'vip_frames', priceCoins: 7200, description: 'Ultra-luxury crystalline diamond halo with prismatic star-flares and platinum rim.', animationPreset: 'diamond_aura', primaryColor: '#38BDF8', secondaryColor: '#C084FC', accentColor: '#F8FAFC', glowColor: 'rgba(56, 189, 248, 0.8)', badgeText: 'LEGENDARY', durationDays: 0, isFeatured: false, enabled: true, sortOrder: 3 },
  { id: 'entry_imperial_carpet', name: 'Imperial Carpet', categoryId: 'special_entry', priceCoins: 6500, description: 'Plush crimson carpet with gleaming golden stanchions and animated twin spotlights.', animationPreset: 'imperial_carpet', primaryColor: '#DC2626', secondaryColor: '#FFC84A', accentColor: '#FDE68A', glowColor: 'rgba(245, 158, 11, 0.78)', badgeText: 'VIP ENTRY', durationDays: 0, isFeatured: true, enabled: true, sortOrder: 1 },
  { id: 'entry_golden_gate', name: 'Royal Gate', categoryId: 'special_entry', priceCoins: 9800, description: 'Twin sculpted golden palace gates swing open with violet laser rays.', animationPreset: 'golden_gate', primaryColor: '#F59E0B', secondaryColor: '#9333EA', accentColor: '#FEF08A', glowColor: 'rgba(255, 200, 74, 0.82)', badgeText: 'ROYAL', durationDays: 0, isFeatured: false, enabled: true, sortOrder: 2 },
  { id: 'entry_phantom_spotlight', name: 'Neon Spotlight', categoryId: 'special_entry', priceCoins: 14500, description: 'Sweeping purple and magenta stage spotlights across live broadcasts.', animationPreset: 'phantom_spotlight', primaryColor: '#D946EF', secondaryColor: '#7C3AED', accentColor: '#F0ABFC', glowColor: 'rgba(217, 70, 239, 0.85)', badgeText: 'MYTHIC', durationDays: 0, isFeatured: false, enabled: true, sortOrder: 3 },
  { id: 'gift_velvet_galaxy', name: 'Velvet Gift Box', categoryId: 'custom_gift', priceCoins: 1800, description: 'Glowing violet crystal gift box wrapped in liquid gold ribbon with stardust burst.', animationPreset: 'velvet_gift_box', primaryColor: '#9333EA', secondaryColor: '#FFC84A', accentColor: '#F472B6', glowColor: 'rgba(168, 85, 247, 0.8)', badgeText: 'CUSTOM', durationDays: 0, isFeatured: true, enabled: true, sortOrder: 1 },
  { id: 'gift_golden_ribbon', name: 'Golden Ribbon', categoryId: 'custom_gift', priceCoins: 3600, description: 'Gilded surprise chest with animated satin bow unfurling golden coin rain.', animationPreset: 'golden_ribbon_gift', primaryColor: '#F59E0B', secondaryColor: '#EC4899', accentColor: '#FEF08A', glowColor: 'rgba(245, 158, 11, 0.8)', badgeText: 'LUXURY', durationDays: 0, isFeatured: false, enabled: true, sortOrder: 2 },
  { id: 'gift_starburst_chest', name: 'Crown Treasure', categoryId: 'custom_gift', priceCoins: 8500, description: 'Royal amethyst treasure box bursting with a 3D crown hologram and sparks.', animationPreset: 'starburst_chest', primaryColor: '#C026D3', secondaryColor: '#FACC15', accentColor: '#E879F9', glowColor: 'rgba(192, 38, 211, 0.85)', badgeText: 'EXCLUSIVE', durationDays: 0, isFeatured: false, enabled: true, sortOrder: 3 },
  { id: 'asset_amethyst_prism', name: 'Amethyst Prism', categoryId: 'premium_assets', priceCoins: 3200, description: 'Rotating neon purple cut diamond emblem with prismatic violet aura rings.', animationPreset: 'amethyst_prism', primaryColor: '#A855F7', secondaryColor: '#EC4899', accentColor: '#F5D0FE', glowColor: 'rgba(168, 85, 247, 0.82)', badgeText: 'PREMIUM', durationDays: 0, isFeatured: true, enabled: true, sortOrder: 1 },
  { id: 'asset_neon_diamond_crest', name: 'Diamond Crest', categoryId: 'premium_assets', priceCoins: 5900, description: 'High-gloss violet diamond crest emitting synchronized neon pulse waves.', animationPreset: 'neon_diamond_crest', primaryColor: '#D946EF', secondaryColor: '#38BDF8', accentColor: '#FDE047', glowColor: 'rgba(217, 70, 239, 0.82)', badgeText: 'ELITE', durationDays: 0, isFeatured: false, enabled: true, sortOrder: 2 },
  { id: 'asset_celestial_crystal', name: 'Celestial Orb', categoryId: 'premium_assets', priceCoins: 11000, description: 'Orbital sapphire-amethyst crystal core with animated golden star halo.', animationPreset: 'celestial_crystal', primaryColor: '#8B5CF6', secondaryColor: '#F59E0B', accentColor: '#67E8F9', glowColor: 'rgba(139, 92, 246, 0.88)', badgeText: 'MYTHIC', durationDays: 0, isFeatured: false, enabled: true, sortOrder: 3 },
];

const storeProductsMap = new Map<string, ServerStoreProduct>();
const storeInventoryOwnership = new Map<string, Set<string>>(); // userId -> Set<productId>
const storeIdempotencyKeys = new Set<string>();

function loadStoreCatalogFromDisk() {
  SEED_STORE_PRODUCTS.forEach((p) => storeProductsMap.set(p.id, { ...p }));
  try {
    if (fs.existsSync(STORE_DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(STORE_DATA_FILE, 'utf8'));
      if (Array.isArray(parsed.products) && parsed.products.length > 0) {
        storeProductsMap.clear();
        parsed.products.forEach((p: ServerStoreProduct) => {
          if (p && p.id && VALID_STORE_CATEGORIES.has(p.categoryId)) {
            storeProductsMap.set(p.id, p);
          }
        });
      }
      if (parsed.ownership && typeof parsed.ownership === 'object') {
        Object.entries(parsed.ownership).forEach(([uid, ids]) => {
          if (Array.isArray(ids)) {
            storeInventoryOwnership.set(uid, new Set(ids.map(String)));
          }
        });
      }
    }
  } catch (err) {
    console.warn('[Store] Failed to load disk store catalog, using defaults:', err);
  }
}

function persistStoreCatalogToDisk() {
  try {
    const dir = path.dirname(STORE_DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const ownershipObj: Record<string, string[]> = {};
    storeInventoryOwnership.forEach((set, uid) => {
      ownershipObj[uid] = Array.from(set);
    });
    fs.writeFileSync(
      STORE_DATA_FILE,
      JSON.stringify(
        {
          products: Array.from(storeProductsMap.values()),
          ownership: ownershipObj,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  } catch (err) {
    console.warn('[Store] Failed to persist store catalog:', err);
  }
}

loadStoreCatalogFromDisk();

app.get('/api/store/catalog', (req: Request, res: Response) => {
  const category = typeof req.query.category === 'string' ? req.query.category : null;
  let list = Array.from(storeProductsMap.values()).filter((p) => p.enabled !== false);
  if (category && VALID_STORE_CATEGORIES.has(category)) {
    list = list.filter((p) => p.categoryId === category);
  }
  list.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
  return res.json({ products: list });
});

app.post('/api/store/purchase/validate', (req: AuthenticatedRequest, res: Response) => {
  const uid = req.firebaseUser?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'Authentication required to purchase store items.' });
  }
  const productId = String(req.body?.productId || '').trim();
  const idempotencyKey = String(req.body?.idempotencyKey || '').trim();
  if (!productId) {
    return res.status(400).json({ error: 'productId is required.' });
  }
  const prod = storeProductsMap.get(productId);
  if (!prod) {
    return res.status(404).json({ error: 'Store product not found.' });
  }
  if (!prod.enabled) {
    return res.status(410).json({ error: 'Store product is currently unavailable.' });
  }
  const ownedSet = storeInventoryOwnership.get(uid);
  const alreadyOwned = Boolean(ownedSet?.has(productId)) || (Boolean(idempotencyKey) && storeIdempotencyKeys.has(idempotencyKey));
  return res.json({
    valid: !alreadyOwned,
    alreadyOwned,
    product: {
      id: prod.id,
      name: prod.name,
      categoryId: prod.categoryId,
      priceCoins: prod.priceCoins,
      animationPreset: prod.animationPreset,
    },
  });
});

app.post('/api/store/purchase/record', (req: AuthenticatedRequest, res: Response) => {
  const uid = req.firebaseUser?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const productId = String(req.body?.productId || '').trim();
  const idempotencyKey = String(req.body?.idempotencyKey || `store_${uid}_${productId}`).trim();
  const pricePaidCoins = Math.max(0, Math.round(Number(req.body?.pricePaidCoins ?? 0)));

  if (!productId) {
    return res.status(400).json({ error: 'productId is required.' });
  }
  if (storeIdempotencyKeys.has(idempotencyKey)) {
    return res.json({ success: true, duplicate: true });
  }

  storeIdempotencyKeys.add(idempotencyKey);
  if (!storeInventoryOwnership.has(uid)) {
    storeInventoryOwnership.set(uid, new Set());
  }
  storeInventoryOwnership.get(uid)!.add(productId);
  persistStoreCatalogToDisk();

  appendAuditLog({
    actorId: uid,
    actorEmail: req.firebaseUser?.email || '',
    targetUserId: uid,
    action: 'store_item_purchased',
    summary: `Purchased Store product ${productId} for ${pricePaidCoins.toLocaleString()} coins`,
    details: { productId, pricePaidCoins, idempotencyKey },
  });

  return res.json({ success: true, productId, pricePaidCoins });
});

app.get('/api/admin/store/products', requireAdminMiddleware, (_req: AuthenticatedRequest, res: Response) => {
  const list = Array.from(storeProductsMap.values()).sort(
    (a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99)
  );
  return res.json({ products: list });
});

app.post('/api/admin/store/products', requireAdminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const body = req.body || {};
  const categoryId = String(body.categoryId || '');
  if (!VALID_STORE_CATEGORIES.has(categoryId)) {
    return res.status(400).json({ error: 'Invalid store categoryId.' });
  }
  const name = String(body.name || '').trim().slice(0, 64);
  if (!name) {
    return res.status(400).json({ error: 'Product name is required.' });
  }
  const priceCoins = Math.max(1, Math.round(Number(body.priceCoins ?? 0)));
  const id =
    String(body.id || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_') ||
    `${categoryId}_${Date.now()}`;

  const item: ServerStoreProduct = {
    id,
    name,
    categoryId: categoryId as ServerStoreProduct['categoryId'],
    priceCoins,
    description: String(body.description || '').trim().slice(0, 320),
    imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '',
    animationUrl: typeof body.animationUrl === 'string' ? body.animationUrl.trim() : '',
    animationPreset: String(body.animationPreset || 'royal_flame'),
    primaryColor: String(body.primaryColor || '#A855F7'),
    secondaryColor: String(body.secondaryColor || '#FFC84A'),
    accentColor: String(body.accentColor || '#F0ABFC'),
    glowColor: String(body.glowColor || 'rgba(168, 85, 247, 0.75)'),
    badgeText: typeof body.badgeText === 'string' ? body.badgeText.trim().slice(0, 24) : '',
    durationDays: Math.max(0, Math.round(Number(body.durationDays ?? 0))),
    isFeatured: Boolean(body.isFeatured),
    enabled: body.enabled !== false,
    sortOrder: Math.max(0, Math.round(Number(body.sortOrder ?? 10))),
    updatedAt: new Date().toISOString(),
  };

  storeProductsMap.set(id, item);
  persistStoreCatalogToDisk();

  appendAuditLog({
    actorId: req.firebaseUser?.uid || 'admin',
    actorEmail: req.firebaseUser?.email || 'lenzopartyofficial@gmail.com',
    action: 'admin_store_product_saved',
    summary: `Admin saved Store product "${name}" (${categoryId}) — ${priceCoins.toLocaleString()} coins`,
    details: { id, categoryId, priceCoins, enabled: item.enabled, isFeatured: item.isFeatured },
  });

  return res.json({ success: true, product: item });
});

app.delete('/api/admin/store/products/:id', requireAdminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id || '').trim();
  if (!id || !storeProductsMap.has(id)) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  const removed = storeProductsMap.get(id)!;
  storeProductsMap.delete(id);
  persistStoreCatalogToDisk();

  appendAuditLog({
    actorId: req.firebaseUser?.uid || 'admin',
    actorEmail: req.firebaseUser?.email || 'lenzopartyofficial@gmail.com',
    action: 'admin_store_product_deleted',
    summary: `Admin deleted Store product "${removed.name}" (${id})`,
    details: { id, categoryId: removed.categoryId },
  });

  return res.json({ success: true, deletedId: id });
});

// ============================================================================
// USER BLOCKING SYSTEM — PERSISTENCE, EVICTION & ACCESS GUARDS
// ============================================================================
interface ServerBlockedRecord {
  id: string;
  blockerId: string;
  blockedUserId: string;
  blockedUserName: string;
  blockedUserUsername?: string;
  blockedUserDisplayId?: string;
  blockedUserAvatar?: string;
  reason?: string;
  createdAt: string;
}

const BLOCKS_DATA_FILE = path.resolve(__dirname, 'data', 'lenzo-blocks.json');
const blockedRecordsByBlocker = new Map<string, Map<string, ServerBlockedRecord>>();

function loadBlocksFromDisk() {
  try {
    if (fs.existsSync(BLOCKS_DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(BLOCKS_DATA_FILE, 'utf8'));
      if (Array.isArray(parsed.records)) {
        parsed.records.forEach((rec: ServerBlockedRecord) => {
          if (rec?.blockerId && rec?.blockedUserId) {
            if (!blockedRecordsByBlocker.has(rec.blockerId)) {
              blockedRecordsByBlocker.set(rec.blockerId, new Map());
            }
            blockedRecordsByBlocker.get(rec.blockerId)!.set(rec.blockedUserId, rec);
          }
        });
      }
    }
  } catch (err) {
    console.warn('[Blocks] Failed to load disk block list:', err);
  }
}

function persistBlocksToDisk() {
  try {
    const dir = path.dirname(BLOCKS_DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const records: ServerBlockedRecord[] = [];
    blockedRecordsByBlocker.forEach((inner) => {
      inner.forEach((rec) => records.push(rec));
    });
    fs.writeFileSync(
      BLOCKS_DATA_FILE,
      JSON.stringify({ records, updatedAt: new Date().toISOString() }, null, 2)
    );
  } catch (err) {
    console.warn('[Blocks] Failed to persist block list:', err);
  }
}

function isUserBlockedBy(blockerId: string | undefined, targetId: string | undefined): boolean {
  if (!blockerId || !targetId) return false;
  return Boolean(blockedRecordsByBlocker.get(blockerId)?.has(targetId));
}

function areUsersBlocked(uidA: string | undefined, uidB: string | undefined): boolean {
  return isUserBlockedBy(uidA, uidB) || isUserBlockedBy(uidB, uidA);
}

loadBlocksFromDisk();

app.post('/api/users/:id/block', (req: AuthenticatedRequest, res: Response) => {
  const targetId = String(req.params.id || '').trim();
  const blockerId = req.firebaseUser?.uid || String(req.body?.blockerId || '').trim();
  if (!blockerId) {
    return res.status(401).json({ error: 'Authentication required to block users.' });
  }
  if (!targetId || targetId === blockerId) {
    return res.status(400).json({ error: 'Invalid target user to block.' });
  }

  const record: ServerBlockedRecord = {
    id: `${blockerId}_${targetId}`,
    blockerId,
    blockedUserId: targetId,
    blockedUserName: String(req.body?.blockedUserName || serverUsers.get(targetId)?.name || 'Lenzo User').slice(0, 64),
    blockedUserUsername: String(req.body?.blockedUserUsername || serverUsers.get(targetId)?.username || '').slice(0, 64),
    blockedUserDisplayId: String(req.body?.blockedUserDisplayId || serverUsers.get(targetId)?.displayId || '').slice(0, 32),
    blockedUserAvatar: String(req.body?.blockedUserAvatar || serverUsers.get(targetId)?.avatar || '').slice(0, 1500),
    reason: String(req.body?.reason || '').slice(0, 200),
    createdAt: new Date().toISOString(),
  };

  if (!blockedRecordsByBlocker.has(blockerId)) {
    blockedRecordsByBlocker.set(blockerId, new Map());
  }
  blockedRecordsByBlocker.get(blockerId)!.set(targetId, record);

  // Remove mutual follow relationships
  userFollowersMap.get(targetId)?.delete(blockerId);
  userFollowingMap.get(blockerId)?.delete(targetId);
  userFollowersMap.get(blockerId)?.delete(targetId);
  userFollowingMap.get(targetId)?.delete(blockerId);

  // Immediately evict blocked user from any active party room hosted by blockerId
  partyRoomsMap.forEach((room, roomId) => {
    if (room.host?.id === blockerId) {
      let changed = false;
      if (room.participants.delete(targetId)) changed = true;
      if (room.pendingRequests.delete(targetId)) changed = true;
      room.seats = room.seats.map((seatUser, idx) => {
        if (seatUser && seatUser.id === targetId) {
          room.mutedSeatIndices.delete(idx);
          changed = true;
          return null;
        }
        return seatUser;
      });
      if (changed) {
        const serialized = serializePartyRoom(room);
        broadcastToRoom(roomId, 'room:participant_left', {
          roomId,
          userId: targetId,
          reason: 'blocked',
          participantsCount: room.participants.size,
          room: serialized,
        });
      }
    }
  });

  // Immediately evict blocked user from any active live stream hosted by blockerId
  liveStreamsMap.forEach((stream, streamId) => {
    if (stream.host?.id === blockerId && stream.viewers.delete(targetId)) {
      broadcastToLive(streamId, 'live:viewer_left', {
        streamId,
        userId: targetId,
        reason: 'blocked',
        viewerCount: stream.viewers.size,
      });
    }
  });

  broadcastToUser(targetId, 'user:blocked_by', { blockerId, targetId });
  persistBlocksToDisk();

  return res.json({ success: true, record });
});

app.post('/api/users/:id/unblock', (req: AuthenticatedRequest, res: Response) => {
  const targetId = String(req.params.id || '').trim();
  const blockerId = req.firebaseUser?.uid || String(req.body?.blockerId || '').trim();
  if (!blockerId) {
    return res.status(401).json({ error: 'Authentication required to unblock users.' });
  }
  blockedRecordsByBlocker.get(blockerId)?.delete(targetId);
  persistBlocksToDisk();
  broadcastToUser(targetId, 'user:unblocked_by', { blockerId, targetId });
  return res.json({ success: true, unblockedUserId: targetId });
});

// ============================================================================
// PRODUCTION FINANCIAL ENGINE API (/api/finance/*)
// Authoritative server-side calculations, idempotency deduplication,
// official gift catalog verification, and Super Admin settings & QA suite.
// ============================================================================
const FINANCE_CONFIG_STORE_PATH = path.join(process.cwd(), '.lenzo_finance_config.json');
const FINANCE_SIGNING_SECRET =
  process.env.FINANCE_SIGNING_SECRET ||
  process.env.EMAIL_OTP_SECRET ||
  GENERATED_EMAIL_OTP_SECRET;

let serverEconomyConfig: PlatformEconomyConfig = { ...OFFICIAL_ECONOMY_DEFAULTS };
const processedFinanceIdempotencyKeys = new Map<string, { timestamp: number; payload: any }>();

function loadFinanceConfigFromDisk() {
  try {
    if (!fs.existsSync(FINANCE_CONFIG_STORE_PATH)) return;
    const raw = JSON.parse(fs.readFileSync(FINANCE_CONFIG_STORE_PATH, 'utf8'));
    if (raw && typeof raw === 'object') {
      const check = validateEconomySettings(raw);
      if (check.valid && check.normalized) {
        serverEconomyConfig = check.normalized;
      }
    }
  } catch (err) {
    console.warn('[Finance] Could not hydrate finance config from disk:', err);
  }
}

function persistFinanceConfigToDisk() {
  try {
    fs.writeFileSync(FINANCE_CONFIG_STORE_PATH, JSON.stringify(serverEconomyConfig, null, 2), 'utf8');
  } catch {
    // non-fatal on read-only/ephemeral hosts
  }
}

function signFinanceReceipt(payload: Record<string, any>): string {
  return crypto
    .createHmac('sha256', FINANCE_SIGNING_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
}

function pruneFinanceIdempotencyCache() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [k, v] of processedFinanceIdempotencyKeys.entries()) {
    if (v.timestamp < cutoff) {
      processedFinanceIdempotencyKeys.delete(k);
    }
  }
}

loadFinanceConfigFromDisk();

app.get('/api/finance/settings', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    config: serverEconomyConfig,
  });
});

app.post('/api/finance/quote-gift', (req: AuthenticatedRequest, res: Response) => {
  if (!req.firebaseUser?.uid) {
    return res.status(401).json({ error: 'Authentication required to authorize gift transactions.' });
  }
  pruneFinanceIdempotencyCache();

  const senderId = req.firebaseUser.uid;
  const receiverId = sanitizeText(req.body?.receiverId, 128);
  const giftId = sanitizeText(req.body?.giftId, 64);
  const quantity = Math.floor(Number(req.body?.quantity ?? 1));
  const rawIdemKey = sanitizeText(req.body?.idempotencyKey, 128);
  const idempotencyKey =
    rawIdemKey || `gift_${senderId.slice(0, 8)}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  if (!receiverId) {
    return res.status(400).json({ error: 'Receiver ID is required.' });
  }
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 9999) {
    return res.status(400).json({ error: 'Gift quantity must be between 1 and 9,999.' });
  }

  const idemCacheKey = `gift:${idempotencyKey}`;
  if (processedFinanceIdempotencyKeys.has(idemCacheKey)) {
    return res.status(409).json({
      error: 'Duplicate gift transaction idempotency key rejected.',
      duplicate: true,
      idempotencyKey,
    });
  }

  const catalogGift = OFFICIAL_GIFT_CATALOG[giftId];
  const unitPriceCoins = catalogGift
    ? catalogGift.coins
    : Math.floor(Number(req.body?.customStoreGiftPriceCoins || 0));

  if (!Number.isFinite(unitPriceCoins) || unitPriceCoins <= 0) {
    return res.status(400).json({ error: 'Unknown or invalid gift price.' });
  }

  const grossCoins = unitPriceCoins * quantity;
  const split = calculateGiftSplit(grossCoins, serverEconomyConfig);
  const receipt = {
    idempotencyKey,
    senderId,
    receiverId,
    giftId: catalogGift ? catalogGift.id : giftId,
    giftName: catalogGift ? catalogGift.name : sanitizeText(req.body?.giftName || 'Gift', 64),
    quantity,
    unitPriceCoins,
    ...split,
    issuedAt: Date.now(),
  };
  const signature = signFinanceReceipt(receipt);
  processedFinanceIdempotencyKeys.set(idemCacheKey, { timestamp: Date.now(), payload: receipt });

  return res.json({
    success: true,
    quote: receipt,
    signature,
  });
});

app.post('/api/finance/quote-withdrawal', (req: AuthenticatedRequest, res: Response) => {
  if (!req.firebaseUser?.uid) {
    return res.status(401).json({ error: 'Authentication required to calculate withdrawal payout.' });
  }

  const diamondsRequested = Math.floor(Number(req.body?.diamondsRequested ?? 0));
  if (!Number.isFinite(diamondsRequested) || diamondsRequested <= 0) {
    return res.status(400).json({ error: 'Diamonds requested must be greater than zero.' });
  }
  if (diamondsRequested < serverEconomyConfig.minWithdrawalDiamonds) {
    return res.status(400).json({
      error: `Minimum withdrawal is ${serverEconomyConfig.minWithdrawalDiamonds.toLocaleString()} Diamonds.`,
    });
  }
  if (diamondsRequested > serverEconomyConfig.maxWithdrawalDiamonds) {
    return res.status(400).json({
      error: `Maximum withdrawal is ${serverEconomyConfig.maxWithdrawalDiamonds.toLocaleString()} Diamonds per request.`,
    });
  }

  const hostHasActiveAgency = Boolean(req.body?.hostHasActiveAgency);
  const agencyCommissionOverridePercent =
    req.body?.agencyCommissionOverridePercent !== undefined && req.body?.agencyCommissionOverridePercent !== null
      ? Number(req.body.agencyCommissionOverridePercent)
      : null;

  const waterfall = calculateWithdrawalWaterfall(diamondsRequested, serverEconomyConfig, {
    hostHasActiveAgency,
    agencyCommissionOverridePercent,
  });
  const idempotencyKey =
    sanitizeText(req.body?.idempotencyKey, 128) ||
    `wd_${req.firebaseUser.uid.slice(0, 8)}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  const receipt = {
    idempotencyKey,
    userId: req.firebaseUser.uid,
    ...waterfall,
    issuedAt: Date.now(),
  };

  return res.json({
    success: true,
    quote: receipt,
    signature: signFinanceReceipt(receipt),
  });
});

app.post('/api/finance/verify-purchase', (req: AuthenticatedRequest, res: Response) => {
  if (!isVerifiedAdmin(req)) {
    return res.status(403).json({ error: 'Forbidden: Only authorized Super Admins can verify coin purchases.' });
  }
  pruneFinanceIdempotencyCache();

  const userId = sanitizeText(req.body?.userId, 128);
  const paidCoins = Math.floor(Number(req.body?.paidCoins ?? 0));
  const bonusCoins = Math.max(0, Math.floor(Number(req.body?.bonusCoins ?? 0)));
  const paymentReference = sanitizeText(req.body?.paymentReference, 120);
  const idempotencyKey =
    sanitizeText(req.body?.idempotencyKey, 128) ||
    `buy_${userId.slice(0, 8)}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  if (!userId || paidCoins <= 0 || !paymentReference) {
    return res.status(400).json({ error: 'userId, positive paidCoins, and paymentReference are required.' });
  }

  const idemCacheKey = `purchase:${idempotencyKey}`;
  if (processedFinanceIdempotencyKeys.has(idemCacheKey)) {
    return res.status(409).json({ error: 'Duplicate purchase verification rejected.', duplicate: true });
  }

  const priceCalc = calculateCoinPurchasePricePkr(paidCoins, serverEconomyConfig);
  const receipt = {
    idempotencyKey,
    userId,
    paidCoins: priceCalc.paidCoins,
    bonusCoins,
    totalCoinsCredited: priceCalc.paidCoins + bonusCoins,
    amountPkr: priceCalc.pricePkr,
    coinPurchaseRatePkr: priceCalc.ratePkrPerCoin,
    paymentReference,
    verifiedBy: req.firebaseUser?.email || 'admin',
    configVersion: serverEconomyConfig.configVersion,
    issuedAt: Date.now(),
  };
  processedFinanceIdempotencyKeys.set(idemCacheKey, { timestamp: Date.now(), payload: receipt });

  return res.json({
    success: true,
    receipt,
    signature: signFinanceReceipt(receipt),
  });
});

app.post('/api/finance/admin/settings', (req: AuthenticatedRequest, res: Response) => {
  if (!isVerifiedAdmin(req)) {
    return res.status(403).json({ error: 'Forbidden: Only authorized Super Admins can modify financial settings.' });
  }

  const reason = sanitizeText(req.body?.reason, 400);
  if (!reason) {
    return res.status(400).json({ error: 'A change reason is required for financial audit logging.' });
  }

  const candidate = {
    ...serverEconomyConfig,
    ...(req.body?.settings || {}),
    configVersion: serverEconomyConfig.configVersion + 1,
    updatedAt: new Date().toISOString(),
    updatedByUid: req.firebaseUser?.uid || '',
    updatedByEmail: req.firebaseUser?.email || '',
    lastChangeReason: reason,
  };

  const validation = validateEconomySettings(candidate);
  if (!validation.valid || !validation.normalized) {
    return res.status(400).json({ error: validation.error || 'Invalid economy settings.' });
  }

  const previous = { ...serverEconomyConfig };
  serverEconomyConfig = normalizeEconomyConfig(validation.normalized);
  persistFinanceConfigToDisk();

  return res.json({
    success: true,
    previous,
    config: serverEconomyConfig,
  });
});

app.post('/api/finance/admin/qa-suite', (req: AuthenticatedRequest, res: Response) => {
  if (!isVerifiedAdmin(req)) {
    return res.status(403).json({ error: 'Forbidden: Only authorized Super Admins can execute the QA suite.' });
  }
  const report = runFinancialQaAssertions();
  return res.json({
    success: report.allPassed,
    ...report,
    executedAt: new Date().toISOString(),
  });
});

// ============================================================================
// UNIVERSAL PUSH NOTIFICATIONS ENGINE (Web Push VAPID + Real-Time WebSocket)
// ============================================================================
interface StoredPushSubscription {
  id: string;
  userId: string;
  platform: 'web' | 'android' | 'ios';
  deviceLabel: string;
  endpoint: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
  updatedAt: string;
}

interface ServerPushPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  avatar?: string;
  senderId?: string;
  senderName?: string;
  actionType?: string;
  targetId?: string;
  actionUrl?: string;
  priority?: 'normal' | 'high' | 'urgent';
  timestamp?: number;
}

const PUSH_DATA_DIR = path.join(__dirname, 'data');
const PUSH_VAPID_FILE = path.join(PUSH_DATA_DIR, 'push_vapid_keys.json');
const PUSH_SUBS_FILE = path.join(PUSH_DATA_DIR, 'push_subscriptions.json');

let pushVapidPublicKey = (process.env.VAPID_PUBLIC_KEY || '').trim();
let pushVapidPrivateKey = (process.env.VAPID_PRIVATE_KEY || '').trim();
const pushVapidSubject = (process.env.VAPID_SUBJECT || 'mailto:lenzopartyofficial@gmail.com').trim();
const pushSubscriptionsByUser = new Map<string, StoredPushSubscription[]>();

function initWebPushEngine() {
  try {
    if (!fs.existsSync(PUSH_DATA_DIR)) {
      fs.mkdirSync(PUSH_DATA_DIR, { recursive: true });
    }
    if (!pushVapidPublicKey || !pushVapidPrivateKey) {
      if (fs.existsSync(PUSH_VAPID_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(PUSH_VAPID_FILE, 'utf-8'));
        if (parsed?.publicKey && parsed?.privateKey) {
          pushVapidPublicKey = String(parsed.publicKey);
          pushVapidPrivateKey = String(parsed.privateKey);
        }
      }
      if (!pushVapidPublicKey || !pushVapidPrivateKey) {
        const generated = webpush.generateVAPIDKeys();
        pushVapidPublicKey = generated.publicKey;
        pushVapidPrivateKey = generated.privateKey;
        fs.writeFileSync(
          PUSH_VAPID_FILE,
          JSON.stringify(
            {
              publicKey: pushVapidPublicKey,
              privateKey: pushVapidPrivateKey,
              createdAt: new Date().toISOString(),
            },
            null,
            2
          )
        );
      }
    }
    webpush.setVapidDetails(pushVapidSubject, pushVapidPublicKey, pushVapidPrivateKey);

    if (fs.existsSync(PUSH_SUBS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PUSH_SUBS_FILE, 'utf-8'));
      if (raw && typeof raw === 'object') {
        for (const [uid, list] of Object.entries(raw)) {
          if (Array.isArray(list)) {
            pushSubscriptionsByUser.set(uid, list as StoredPushSubscription[]);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Push] Initialization notice:', err);
  }
}

function persistPushSubscriptionsToDisk() {
  try {
    if (!fs.existsSync(PUSH_DATA_DIR)) {
      fs.mkdirSync(PUSH_DATA_DIR, { recursive: true });
    }
    const obj: Record<string, StoredPushSubscription[]> = {};
    for (const [uid, list] of pushSubscriptionsByUser.entries()) {
      if (list.length > 0) obj[uid] = list;
    }
    fs.writeFileSync(PUSH_SUBS_FILE, JSON.stringify(obj, null, 2));
  } catch (err) {
    console.warn('[Push] Persist subscriptions notice:', err);
  }
}

initWebPushEngine();

async function deliverWebPushToSubscription(
  uid: string,
  sub: StoredPushSubscription,
  payloadJson: string
): Promise<boolean> {
  if (!sub.keys?.p256dh || !sub.keys?.auth || !sub.endpoint.startsWith('http')) {
    return false;
  }
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: sub.keys,
      },
      payloadJson,
      { TTL: 86400 }
    );
    return true;
  } catch (err: any) {
    const statusCode = Number(err?.statusCode || 0);
    if (statusCode === 404 || statusCode === 410) {
      const current = pushSubscriptionsByUser.get(uid) || [];
      const next = current.filter((item) => item.endpoint !== sub.endpoint);
      if (next.length > 0) {
        pushSubscriptionsByUser.set(uid, next);
      } else {
        pushSubscriptionsByUser.delete(uid);
      }
      persistPushSubscriptionsToDisk();
    }
    return false;
  }
}

async function dispatchServerPushToUsers(
  targetUserIds: string[],
  notification: ServerPushPayload
): Promise<{ wsDelivered: number; webPushSent: number }> {
  const uniqueTargets = Array.from(
    new Set(targetUserIds.map((id) => String(id || '').trim()).filter((id) => id.length > 0))
  ).slice(0, 500);

  const normalized: ServerPushPayload = {
    id: String(notification.id || `push_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`).slice(0, 128),
    type: String(notification.type || 'system').slice(0, 32),
    title: String(notification.title || 'Lenzo Party Live').slice(0, 140),
    message: String(notification.message || '').slice(0, 420),
    avatar: notification.avatar ? String(notification.avatar).slice(0, 512) : undefined,
    senderId: notification.senderId ? String(notification.senderId).slice(0, 128) : undefined,
    senderName: notification.senderName ? String(notification.senderName).slice(0, 120) : undefined,
    actionType: notification.actionType ? String(notification.actionType).slice(0, 48) : 'open_notifications',
    targetId: notification.targetId ? String(notification.targetId).slice(0, 160) : '',
    actionUrl: notification.actionUrl ? String(notification.actionUrl).slice(0, 240) : '/',
    priority:
      notification.priority === 'urgent' || notification.priority === 'high'
        ? notification.priority
        : 'normal',
    timestamp: Date.now(),
  };

  const webPushBody = JSON.stringify({
    ...normalized,
    body: normalized.message,
    icon: normalized.avatar || '/app-icon.png',
    tag: `lenzo-${normalized.type}-${normalized.id}`,
  });

  let wsDelivered = 0;
  let webPushSent = 0;
  const webPushPromises: Promise<void>[] = [];

  for (const uid of uniqueTargets) {
    broadcastToUser(uid, 'push:notification', normalized);
    wsDelivered += 1;

    const subs = pushSubscriptionsByUser.get(uid) || [];
    for (const sub of subs) {
      webPushPromises.push(
        deliverWebPushToSubscription(uid, sub, webPushBody).then((ok) => {
          if (ok) webPushSent += 1;
        })
      );
    }
  }

  if (webPushPromises.length > 0) {
    await Promise.allSettled(webPushPromises);
  }

  return { wsDelivered, webPushSent };
}

app.get('/api/push/vapid-public-key', (_req: Request, res: Response) => {
  return res.json({
    success: Boolean(pushVapidPublicKey),
    publicKey: pushVapidPublicKey,
  });
});

app.get('/api/push/status', (req: AuthenticatedRequest, res: Response) => {
  if (!req.firebaseUser?.uid) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const subs = pushSubscriptionsByUser.get(req.firebaseUser.uid) || [];
  return res.json({
    success: true,
    vapidReady: Boolean(pushVapidPublicKey),
    deviceCount: subs.length,
    devices: subs.map((s) => ({
      id: s.id,
      platform: s.platform,
      deviceLabel: s.deviceLabel,
      updatedAt: s.updatedAt,
    })),
  });
});

app.post('/api/push/subscribe', (req: AuthenticatedRequest, res: Response) => {
  const uid = req.firebaseUser?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'Authentication required to subscribe to push notifications.' });
  }
  const sub = req.body?.subscription || {};
  const endpoint = String(sub.endpoint || req.body?.endpoint || '').trim();
  const p256dh = String(sub.keys?.p256dh || '').trim();
  const authKey = String(sub.keys?.auth || '').trim();
  const platformRaw = String(req.body?.platform || 'web').trim().toLowerCase();
  const platform: 'web' | 'android' | 'ios' =
    platformRaw === 'android' || platformRaw === 'ios' ? platformRaw : 'web';
  const deviceLabel = String(req.body?.deviceLabel || `${platform.toUpperCase()} Device`).slice(0, 120);

  if (!endpoint || endpoint.length > 1024) {
    return res.status(400).json({ error: 'Valid push subscription endpoint is required.' });
  }

  const subId = crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 24);
  const record: StoredPushSubscription = {
    id: subId,
    userId: uid,
    platform,
    deviceLabel,
    endpoint,
    ...(p256dh && authKey ? { keys: { p256dh, auth: authKey } } : {}),
    updatedAt: new Date().toISOString(),
  };

  const existing = (pushSubscriptionsByUser.get(uid) || []).filter((item) => item.endpoint !== endpoint);
  existing.unshift(record);
  pushSubscriptionsByUser.set(uid, existing.slice(0, 10));
  persistPushSubscriptionsToDisk();

  return res.json({
    success: true,
    subscriptionId: subId,
    deviceCount: pushSubscriptionsByUser.get(uid)?.length || 1,
  });
});

app.post('/api/push/unsubscribe', (req: AuthenticatedRequest, res: Response) => {
  const uid = req.firebaseUser?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const endpoint = String(req.body?.endpoint || '').trim();
  if (!endpoint) {
    pushSubscriptionsByUser.delete(uid);
  } else {
    const remaining = (pushSubscriptionsByUser.get(uid) || []).filter((item) => item.endpoint !== endpoint);
    if (remaining.length > 0) {
      pushSubscriptionsByUser.set(uid, remaining);
    } else {
      pushSubscriptionsByUser.delete(uid);
    }
  }
  persistPushSubscriptionsToDisk();
  return res.json({ success: true });
});

app.post('/api/push/send', async (req: AuthenticatedRequest, res: Response) => {
  const senderUid = req.firebaseUser?.uid;
  if (!senderUid) {
    return res.status(401).json({ error: 'Authentication required to dispatch push notifications.' });
  }
  const rawTargets = Array.isArray(req.body?.targetUserIds)
    ? req.body.targetUserIds
    : req.body?.targetUserId
      ? [req.body.targetUserId]
      : [];
  const title = String(req.body?.title || '').trim();
  const message = String(req.body?.message || '').trim();
  if (rawTargets.length === 0 || !title || !message) {
    return res.status(400).json({ error: 'targetUserIds, title, and message are required.' });
  }

  const result = await dispatchServerPushToUsers(rawTargets.map(String), {
    id: String(req.body?.id || `push_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`),
    type: String(req.body?.type || 'system'),
    title,
    message,
    avatar: typeof req.body?.avatar === 'string' ? req.body.avatar : undefined,
    senderId: senderUid,
    senderName: typeof req.body?.senderName === 'string' ? req.body.senderName : undefined,
    actionType: typeof req.body?.actionType === 'string' ? req.body.actionType : 'open_notifications',
    targetId: typeof req.body?.targetId === 'string' ? req.body.targetId : '',
    actionUrl: typeof req.body?.actionUrl === 'string' ? req.body.actionUrl : '/',
    priority:
      req.body?.priority === 'urgent' || req.body?.priority === 'high' ? req.body.priority : 'normal',
  });

  return res.json({ success: true, ...result });
});

app.post('/api/push/test', async (req: AuthenticatedRequest, res: Response) => {
  const uid = req.firebaseUser?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const result = await dispatchServerPushToUsers([uid], {
    id: `test_${Date.now()}`,
    type: 'system',
    title: '🔔 Lenzo Party Push Notifications Active!',
    message: 'Real-time push alerts are live on your device for messages, gifts, rooms, PK battles, wallet, and agency updates.',
    actionType: 'open_notifications',
    priority: 'high',
  });
  return res.json({ success: true, ...result });
});

app.post('/api/push/broadcast', async (req: AuthenticatedRequest, res: Response) => {
  if (!isVerifiedAdmin(req)) {
    return res.status(403).json({ error: 'Forbidden: Only authorized Super Admins can send global push broadcasts.' });
  }
  const title = String(req.body?.title || '').trim().slice(0, 140);
  const message = String(req.body?.message || '').trim().slice(0, 500);
  const category = String(req.body?.category || 'system').trim().slice(0, 32);
  const priority =
    req.body?.priority === 'urgent' || req.body?.priority === 'high' ? req.body.priority : 'high';
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required for a global push broadcast.' });
  }

  const payload: ServerPushPayload = {
    id: String(req.body?.id || `bcast_${Date.now()}`),
    type: category,
    title,
    message,
    senderId: req.firebaseUser?.uid,
    senderName: 'Lenzo Party Official',
    actionType: 'open_notifications',
    priority,
    timestamp: Date.now(),
  };

  broadcastAll('push:broadcast', payload);

  const webPushBody = JSON.stringify({
    ...payload,
    body: payload.message,
    icon: '/app-icon.png',
    tag: `lenzo-broadcast-${payload.id}`,
  });

  let webPushSent = 0;
  const tasks: Promise<void>[] = [];
  for (const [uid, subs] of pushSubscriptionsByUser.entries()) {
    for (const sub of subs) {
      tasks.push(
        deliverWebPushToSubscription(uid, sub, webPushBody).then((ok) => {
          if (ok) webPushSent += 1;
        })
      );
    }
  }
  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }

  return res.json({
    success: true,
    broadcastId: payload.id,
    subscribedUsersCount: pushSubscriptionsByUser.size,
    webPushSent,
    activeWebSocketClients: pkWss.clients.size,
  });
});

// Vite Integration & Production Static Serving (Cloudflare / Railway / Local Dev)
async function startServer() {
  const isRailwayRuntime = Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_SERVICE_ID ||
      process.env.RAILWAY_PROJECT_ID
  );
  const isProduction = process.env.NODE_ENV === 'production' || isRailwayRuntime;
  const distDir = path.resolve(__dirname, 'dist');
  const distIndexPath = path.resolve(distDir, 'index.html');

  if (isProduction) {
    if (fs.existsSync(distIndexPath)) {
      app.use(express.static(distDir));
      app.get('*', (req: Request, res: Response) => {
        if (req.path.startsWith('/api')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }
        res.sendFile(distIndexPath);
      });
    } else {
      app.get('*', (req: Request, res: Response) => {
        if (req.path.startsWith('/api')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }
        res.json({
          status: 'ok',
          service: 'lenzo-party-live-backend',
          frontend: 'https://lenzoparty.com',
          health: '/api/health',
        });
      });
    }
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Lenzo Party Live Server running on port ${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
