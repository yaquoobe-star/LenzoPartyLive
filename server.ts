import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import agoraTokenPkg from 'agora-token';
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

const { RtcTokenBuilder, RtcRole } = (agoraTokenPkg as any).default || agoraTokenPkg;

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
      error: 'Uploaded file or request payload is too large. Please choose an image under 5MB.',
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Platform');
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
app.use('/api', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.path === '/health') {
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

function isVerifiedAdmin(req: AuthenticatedRequest): boolean {
  return Boolean(
    req.firebaseUser &&
    req.firebaseUser.email === 'yaquoobe@gmail.com' &&
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
  maxSeats: 8 | 16;
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

function ensureBroadcasterMetric(user: any): BroadcasterMetricRecord | null {
  if (!user || !user.id) return null;
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
  const occupiedSeats = room.seats.filter(Boolean).length;
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
    maxSeats: room.maxSeats,
    roomType: room.roomType,
    hasPassword: Boolean(room.roomType === 'private' && room.password),
    announcement: room.announcement,
    seats: room.seats,
    mutedSeatIndices: Array.from(room.mutedSeatIndices),
    isLocked: room.isLocked,
    allowJoin: room.allowJoin,
    isOwnerPresent: room.participants.has(room.host?.id),
    startTime: room.startTime,
    likesCount: room.likesCount,
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
      }
    }
  }
}, 1000);

// REST API Endpoints

// 0. Health & Ecosystem Verification Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
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

app.post('/api/rooms/create', (req: AuthenticatedRequest, res: Response) => {
  const { id, displayId, title, category, host, coverImage, iconType, maxSeats, roomType, password, announcement } = req.body;
  if (!host || !host.id || !title || !String(title).trim()) {
    return res.status(400).json({ error: 'Valid room title and authenticated host are required.' });
  }
  if (req.firebaseUser && req.firebaseUser.uid !== host.id) {
    return res.status(403).json({ error: 'Host ID does not match authenticated user.' });
  }

  const normalizedMaxSeats: 8 | 16 = Number(maxSeats) === 16 ? 16 : 8;
  const roomId = sanitizeText(id, 128) || `room_${Date.now()}`;
  const seats = Array(normalizedMaxSeats).fill(null);
  seats[0] = host;

  const newRoom: ServerPartyRoom = {
    id: roomId,
    displayId: sanitizeText(displayId, 24) || Math.floor(10000 + Math.random() * 90000).toString(),
    title: sanitizeText(title, 100),
    category: sanitizeText(category, 40) || 'Party',
    host,
    coverImage: typeof coverImage === 'string' ? coverImage.slice(0, 1500) : '',
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
    room.participants.get(userId)!.lastSeen = Date.now();
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

app.post('/api/rooms/:roomId/request_seat', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { user, requestedSeatIndex } = req.body;
  if (!user || !user.id) {
    return res.status(400).json({ error: 'Valid user object required.' });
  }

  const room = partyRoomsMap.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found or already closed.' });
  }
  if (!room.allowJoin || room.isLocked) {
    return res.status(403).json({ error: 'Stage seats are currently locked by host.' });
  }
  if (room.host?.id === user.id) {
    return res.status(400).json({ error: 'Room host already holds stage authority.' });
  }
  if (room.pendingRequests.has(user.id)) {
    return res.status(400).json({ error: 'You already have a pending seat request for this room.' });
  }
  if (room.seats.some((s) => s && s.id === user.id)) {
    return res.status(400).json({ error: 'You already occupy a seat in this room.' });
  }

  const idx = typeof requestedSeatIndex === 'number' && requestedSeatIndex > 0 && requestedSeatIndex < room.maxSeats ? requestedSeatIndex : 1;
  const requestId = `seat_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const requestObj = {
    id: requestId,
    roomId,
    user,
    requestedSeatIndex: idx,
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now() + 60000,
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
  const { applicantId, approve, targetSeatIndex } = req.body;
  const room = partyRoomsMap.get(roomId);

  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }
  if (room.host.id !== hostId) {
    return res.status(403).json({ error: 'Permission denied. Only the room host can approve or reject seat requests.' });
  }

  const requestObj = room.pendingRequests.get(applicantId);
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
  if (seatIdx <= 0 || seatIdx >= room.maxSeats || room.seats[seatIdx] !== null) {
    seatIdx = room.seats.findIndex((s, i) => i > 0 && s === null);
  }
  if (seatIdx === -1) {
    return res.status(400).json({ error: 'All stage seats are currently occupied.' });
  }

  room.seats[seatIdx] = requestObj.user;
  requestObj.status = 'accepted';

  const serialized = serializePartyRoom(room);
  broadcastToRoom(roomId, 'room:seat_occupied', {
    roomId,
    seatIndex: seatIdx,
    user: requestObj.user,
    room: serialized,
  });
  broadcastToUser(applicantId, 'room:seat_request_accepted', { roomId, seatIndex: seatIdx });
  broadcastAll('room:directory_updated', { roomId, action: 'updated', room: serialized });

  res.json({ success: true, seatIndex: seatIdx, seats: room.seats, room: serialized });
});

app.post('/api/rooms/:roomId/remove_seat', (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const hostId = req.firebaseUser?.uid || req.body?.hostId;
  const { seatIndex } = req.body;
  const room = partyRoomsMap.get(roomId);

  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }
  if (room.host.id !== hostId) {
    return res.status(403).json({ error: 'Unauthorized. Only room host can remove participants.' });
  }

  if (typeof seatIndex === 'number' && seatIndex > 0 && seatIndex < room.maxSeats) {
    const removedUser = room.seats[seatIndex];
    room.seats[seatIndex] = null;
    room.mutedSeatIndices.delete(seatIndex);
    const serialized = serializePartyRoom(room);
    broadcastToRoom(roomId, 'room:seat_vacated', { roomId, seatIndex, removedUser, room: serialized });
    broadcastAll('room:directory_updated', { roomId, action: 'updated', room: serialized });
  }

  res.json({ success: true, seats: room.seats });
});

app.post('/api/rooms/:roomId/leave_seat', (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const userId = req.firebaseUser?.uid || req.body?.userId;
  const room = partyRoomsMap.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
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
  const { seatIndex, user } = req.body;
  const room = partyRoomsMap.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }
  if (room.host.id !== hostId) {
    return res.status(403).json({ error: 'Only host can assign seats directly.' });
  }
  if (typeof seatIndex === 'number' && seatIndex >= 0 && seatIndex < room.maxSeats && user?.id) {
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
  const { isLocked, allowJoin, announcement } = req.body;
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

  const serialized = serializePartyRoom(room);
  broadcastToRoom(roomId, 'room:settings_updated', { roomId, room: serialized });
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

  broadcastToRoom(roomId, 'room:chat', { roomId, message: chatMsg });
  res.json({ success: true, message: chatMsg });
});

app.post('/api/rooms/:roomId/heart', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { senderId, userId, count = 1 } = req.body;
  const heartSenderId = senderId || userId || '';
  const room = partyRoomsMap.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }
  const now = Date.now();
  const lastAt = lastHeartTimeMap.get(heartSenderId || 'anon') || 0;
  if (now - lastAt < 200) {
    return res.json({ success: true, likesCount: room.likesCount });
  }
  lastHeartTimeMap.set(heartSenderId || 'anon', now);

  const delta = Math.min(Math.max(1, Number(count) || 1), 10);
  room.likesCount += delta;

  broadcastToRoom(roomId, 'room:heart', {
    roomId,
    userId: heartSenderId,
    senderId: heartSenderId,
    likesCount: room.likesCount,
    delta,
  });
  res.json({ success: true, likesCount: room.likesCount });
});

app.post('/api/rooms/:roomId/gift', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { sender, recipient, gift, quantity = 1 } = req.body;
  const room = partyRoomsMap.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
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
const serverUsers = new Map<string, any>();
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

app.get('/api/live/active_streams', (_req: Request, res: Response) => {
  const streams = Array.from(liveStreamsMap.values())
    .filter((s) => s.isLive)
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

  const serialized = serializeLiveStream(newStream);
  broadcastAll('live:directory_updated', { streamId, action: 'started', stream: serialized });
  res.json({ success: true, stream: serialized });
});

app.post('/api/live/:streamId/join', (req: Request, res: Response) => {
  const { streamId } = req.params;
  const { user } = req.body;
  const stream = liveStreamsMap.get(streamId);
  if (!stream || !stream.isLive) {
    return res.status(404).json({ error: 'Live broadcast has ended or does not exist.' });
  }
  if (!user || !user.id) {
    return res.status(400).json({ error: 'User profile required to join stream.' });
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
  }
  serverUsers.set(user.id, user);

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
    stream.viewers.get(userId)!.lastSeen = Date.now();
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
  const { sender, text } = req.body;
  const stream = liveStreamsMap.get(streamId);
  if (!stream || !stream.isLive) {
    return res.status(404).json({ error: 'Stream has ended.' });
  }
  if (!sender || !sender.id) {
    return res.status(400).json({ error: 'Authenticated sender required.' });
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

  const msg = {
    id: `lc_${now}_${Math.random().toString(36).substring(2, 6)}`,
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

  broadcastToLive(streamId, 'live:comment', { streamId, message: msg, commentsCount: stream.commentsCount });
  res.json({ success: true, message: msg });
});

app.post('/api/live/:streamId/heart', (req: Request, res: Response) => {
  const { streamId } = req.params;
  const { senderId, count = 1 } = req.body;
  const stream = liveStreamsMap.get(streamId);
  if (!stream || !stream.isLive) {
    return res.status(404).json({ error: 'Stream has ended.' });
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

// --- CONFIGURABLE BROADCASTER RANKINGS & ADMIN CONTROLS ---

function computeWeightedBroadcasterScore(rec: BroadcasterMetricRecord): number {
  const giftPart = rec.giftsCoinValue * rankingConfig.giftValueWeight;
  const viewerPart = rec.uniqueViewerIds.size * rankingConfig.uniqueViewerWeight;
  const engagementPart = (rec.totalLikes + rec.totalComments * 3) * rankingConfig.engagementWeight;
  const livePart = rec.isCurrentlyLive ? rankingConfig.activeLiveBoost : 0;
  return Math.round(giftPart + viewerPart + engagementPart + livePart);
}

app.get('/api/rankings/top-broadcasters', (_req: Request, res: Response) => {
  const entries = Array.from(broadcasterMetricsMap.values())
    .map((rec) => {
      const activeStream = Array.from(liveStreamsMap.values()).find((s) => s.host?.id === rec.user.id);
      const isCurrentlyLive = Boolean(activeStream);
      const computedScore = computeWeightedBroadcasterScore({ ...rec, isCurrentlyLive });
      return {
        user: rec.user,
        score: computedScore,
        formattedScore: formatCompactCount(computedScore),
        liveStreamId: activeStream?.id,
        isCurrentlyLive,
        breakdown: {
          giftsCoinValue: rec.giftsCoinValue,
          uniqueViewers: rec.uniqueViewerIds.size,
          totalLikes: rec.totalLikes,
          totalComments: rec.totalComments,
        },
      };
    })
    .filter((entry) => entry.score > 0 || entry.isCurrentlyLive)
    .sort((a, b) => b.score - a.score || (b.isCurrentlyLive ? 1 : 0) - (a.isCurrentlyLive ? 1 : 0))
    .slice(0, 2)
    .map((entry, idx) => ({
      rank: idx + 1,
      ...entry,
    }));

  res.json({ broadcasters: entries, config: rankingConfig });
});

app.get('/api/rankings', (req: Request, res: Response) => {
  const tab = String(req.query.tab || 'Star');
  const userId = String(req.query.userId || '');

  let list: any[] = [];
  if (tab === 'Star') {
    list = Array.from(broadcasterMetricsMap.values())
      .map((rec) => {
        const isLive = Array.from(liveStreamsMap.values()).some((s) => s.host?.id === rec.user.id);
        const numericScore = computeWeightedBroadcasterScore({ ...rec, isCurrentlyLive: isLive });
        return {
          user: rec.user,
          numericScore,
          score: formatCompactCount(numericScore),
          isLive,
        };
      })
      .filter((e) => e.numericScore > 0 || e.isLive)
      .sort((a, b) => b.numericScore - a.numericScore);
  } else if (tab === 'Contribution') {
    list = Array.from(contributorMetricsMap.values())
      .map((rec) => ({
        user: rec.user,
        numericScore: rec.coinsSpent,
        score: formatCompactCount(rec.coinsSpent),
      }))
      .filter((e) => e.numericScore > 0)
      .sort((a, b) => b.numericScore - a.numericScore);
  } else {
    list = Array.from(serverUsers.values())
      .map((u) => {
        const coinsSpent = contributorMetricsMap.get(u.id)?.coinsSpent || 0;
        const levelVal = u.level || 1;
        const vipVal = u.vipLevel || 0;
        const numericScore = coinsSpent + vipVal * 10000 + levelVal * 100;
        return {
          user: u,
          numericScore,
          score: vipVal > 0 ? `VIP ${vipVal} • ${formatCompactCount(numericScore)}` : `Lv.${levelVal} • ${formatCompactCount(numericScore)}`,
        };
      })
      .filter((e) => e.numericScore > 0)
      .sort((a, b) => b.numericScore - a.numericScore);
  }

  const rankings = list.map((item, idx) => ({
    rank: idx + 1,
    user: item.user,
    score: item.score,
    numericScore: item.numericScore,
    badge: idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : undefined,
    trend: 'same',
  }));

  const myIndex = userId ? rankings.findIndex((r) => r.user.id === userId) : -1;
  res.json({
    rankings,
    myRank: myIndex >= 0 ? myIndex + 1 : null,
    totalCount: rankings.length,
    config: rankingConfig,
  });
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
app.get('/api/agora/config', (_req: Request, res: Response) => {
  const appId = process.env.AGORA_APP_ID || '';
  const hasCertificate = Boolean(process.env.AGORA_APP_CERTIFICATE);
  res.json({
    configured: Boolean(appId && hasCertificate),
    appId: appId || '',
    requiresCertificate: !hasCertificate,
  });
});

app.post('/api/agora/token', (req: Request, res: Response) => {
  const { channelName, uid, role = 'audience' } = req.body;

  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!channelName) {
    return res.status(400).json({ error: 'channelName is required.' });
  }

  // If credentials are not yet configured on the server
  if (!appId || !appCertificate) {
    return res.json({
      configured: false,
      token: null,
      appId: appId || '',
      channelName,
      uid: String(uid || '0'),
      role,
      message: 'Agora App ID and Certificate are pending server configuration.',
    });
  }

  try {
    const rtcRole = role === 'broadcaster' || role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const expirationTimeInSeconds = 3600; // 1 hour token & privilege duration
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const expiresAt = currentTimestamp + expirationTimeInSeconds;

    // agora-token v2 expects relative durations in seconds for BOTH tokenExpire and privilegeExpire
    const token = RtcTokenBuilder.buildTokenWithUserAccount(
      appId,
      appCertificate,
      channelName,
      String(uid || '0'),
      rtcRole,
      expirationTimeInSeconds,
      expirationTimeInSeconds
    );

    res.json({
      configured: true,
      success: true,
      token,
      appId,
      channelName,
      uid: String(uid || '0'),
      role,
      expiresAt,
    });
  } catch (err: any) {
    console.error('Error generating Agora RTC token:', err);
    res.status(500).json({ error: 'Failed to generate RTC token', details: err.message });
  }
});

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
    | 'admin_user_adjusted';
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
  if (!Number.isFinite(coinsSpent) || coinsSpent <= 0 || coinsSpent > 2_000_000_000) {
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
    rec.totalQualifyingCoinsSpent = Math.max(0, Math.min(2_000_000_000, rec.totalQualifyingCoinsSpent + addCoins));
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

  rec.updatedAt = new Date().toISOString();
  const { progression, achievements } = buildUserProgressionPayload(rec);

  progressionUnlockHistory.unshift({
    id: `uh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: targetUserId,
    type: 'admin_adjustment',
    title: `Admin Progression Adjustment`,
    detail: `${reason} (Lv ${oldState.currentLevel} → Lv ${progression.currentLevel})`,
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
    summary: `Adjusted ${targetUserId}: coins ${oldCoins.toLocaleString()} → ${rec.totalQualifyingCoinsSpent.toLocaleString()} (${reason})`,
    details: {
      oldCoins,
      newCoins: rec.totalQualifyingCoinsSpent,
      oldLevel: oldState.currentLevel,
      newLevel: progression.currentLevel,
      awardAchievementId: awardAchievementId || null,
      reason,
    },
  });
  persistProgressionStoreToDisk();

  return res.json({
    success: true,
    progression,
    achievements,
  });
});

app.get('/api/admin/progression/audit-logs', requireAdminMiddleware, (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    auditLogs: progressionAuditLogs.slice(0, 200),
    unlockHistory: progressionUnlockHistory.slice(0, 200),
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
