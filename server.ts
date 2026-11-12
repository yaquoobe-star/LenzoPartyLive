import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import agoraTokenPkg from 'agora-token';

const { RtcTokenBuilder, RtcRole } = (agoraTokenPkg as any).default || agoraTokenPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = 3000;

server.on('error', (err) => {
  console.error('HTTP server error:', err);
});

app.use(express.json());

// CORS Middleware supporting custom domain https://lenzoparty.com, local dev, and cloud run
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://lenzoparty.com',
    'https://www.lenzoparty.com',
    'http://localhost:3000',
    'http://localhost:5173',
  ];
  if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.run.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
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

// Seed default history for demo/initial view
const DEFAULT_USER_ID = 'user_current_01';
matchHistories.set(DEFAULT_USER_ID, [
  {
    id: 'hist_01',
    matchId: 'pk_prev_01',
    date: 'Today, 2:15 PM',
    durationSeconds: 300,
    opponent: {
      id: 'user_kingraja',
      name: 'KingRaja 👑',
      username: '@kingraja',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      level: 68
    },
    myScore: 28400,
    opponentScore: 24100,
    result: 'win',
    giftsReceived: 42,
    likesReceived: 3820,
    coinsEarned: 28400
  },
  {
    id: 'hist_02',
    matchId: 'pk_prev_02',
    date: 'Yesterday, 8:45 PM',
    durationSeconds: 300,
    opponent: {
      id: 'user_angel',
      name: 'Angel Girl 💕',
      username: '@angelgirl',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
      level: 56
    },
    myScore: 19500,
    opponentScore: 23200,
    result: 'loss',
    giftsReceived: 29,
    likesReceived: 2940,
    coinsEarned: 19500
  }
]);

// WebSocket Server (PK Battles & Real-Time Sync)
const pkWss = new WebSocketServer({ noServer: true });
const wss = pkWss; // PK & Match Real-Time Synchronization

pkWss.on('error', (err) => {
  console.warn('[PK WS] warning/error:', err);
});

// Route HTTP Upgrade headers to WebSocket Server
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

// PK WebSocket Connection handler
pkWss.on('connection', (ws: ExtendedWebSocket) => {
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'auth') {
        ws.userId = msg.userId;
      } else if (msg.type === 'subscribe_match') {
        ws.subscribedMatchId = msg.matchId;
        // Send initial match state if exists
        if (msg.matchId && activeSessions.has(msg.matchId)) {
          const session = activeSessions.get(msg.matchId)!;
          ws.send(JSON.stringify({
            event: 'pk:sync_state',
            payload: { session, serverTime: Date.now() }
          }));
        }
      } else if (msg.type === 'unsubscribe_match') {
        ws.subscribedMatchId = undefined;
      }
    } catch (err) {
      // Invalid message format
    }
  });
});

// Periodic ping to keep PK WS alive
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

// Authoritative Timer & Match Management Tick (every 1 second)
setInterval(() => {
  const now = Date.now();

  // 1. Check Invitations Timeout
  for (const [id, invite] of pendingInvitations.entries()) {
    if (invite.status === 'pending' && now >= invite.expiresAt) {
      invite.status = 'expired';
      broadcastToUser(invite.fromHost.id, 'pk:invite_expired', { inviteId: id });
      broadcastToUser(invite.toHost.id, 'pk:invite_expired', { inviteId: id });
    }
  }

  // 2. Check Active PK Matches
  for (const [matchId, session] of activeSessions.entries()) {
    if (session.status === 'in_progress') {
      const remainingMs = Math.max(0, session.endTime - now);
      session.remainingSeconds = Math.ceil(remainingMs / 1000);

      // Match Completion
      if (remainingMs <= 0) {
        session.status = 'completed';
        session.remainingSeconds = 0;

        // Authoritative winner calculation
        if (session.host1.score > session.host2.score) {
          session.winnerId = session.host1.user.id;
        } else if (session.host2.score > session.host1.score) {
          session.winnerId = session.host2.user.id;
        } else {
          session.winnerId = 'draw';
        }

        // Save to Persistent History for both hosts
        const nowFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });

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

        // Broadcast End Result
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

// 1. Get eligible active hosts
app.get('/api/pk/hosts', (req: Request, res: Response) => {
  const busyHostIds = new Set<string>();
  for (const session of activeSessions.values()) {
    if (session.status === 'in_progress') {
      busyHostIds.add(session.host1.user.id);
      busyHostIds.add(session.host2.user.id);
    }
  }

  const eligibleHosts = [
    {
      id: 'user_kingraja',
      displayId: '77218390',
      name: 'KingRaja 👑',
      username: '@kingraja',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      level: 68,
      viewerCount: '12.5K',
      isLive: true,
      category: 'PK Champion',
      streamTitle: '🔥 Unbeatable PK Streak! Challenge me now!'
    },
    {
      id: 'user_angel',
      displayId: '88392104',
      name: 'Angel Girl 💕',
      username: '@angelgirl',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
      level: 56,
      viewerCount: '8.7K',
      isLive: true,
      category: 'Music Live',
      streamTitle: 'Singing & acoustic guitar vibes 🎶'
    },
    {
      id: 'user_sweetie',
      displayId: '55490218',
      name: 'Sweetie 🌸',
      username: '@sweetie',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80',
      level: 38,
      viewerCount: '5.2K',
      isLive: true,
      category: 'Chat',
      streamTitle: 'Late night chill & party stories 🌙'
    },
    {
      id: 'user_riya',
      displayId: '33109284',
      name: 'Riya Khan 💕',
      username: '@riyakhan',
      avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&auto=format&fit=crop&q=80',
      level: 45,
      viewerCount: '7.9K',
      isLive: true,
      category: 'Dance',
      streamTitle: 'Dance Battle Ready! Let the rhythm win!'
    },
    {
      id: 'user_devilboy',
      displayId: '99018241',
      name: 'DevilBoy 🔥',
      username: '@devilboy',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
      level: 49,
      viewerCount: '6.4K',
      isLive: true,
      category: 'Gaming',
      streamTitle: 'Apex & BGMI live arena 🎮'
    }
  ].map((host) => ({
    ...host,
    isBusy: busyHostIds.has(host.id)
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

// --- ROOM SEAT MANAGEMENT & REQUESTS (Role-based permissions) ---
interface RoomSeatRecord {
  roomId: string;
  hostId: string;
  seats: (any | null)[];
  pendingRequests: Map<string, any>;
}

const activeRooms = new Map<string, RoomSeatRecord>();

function getOrCreateRoom(roomId: string, hostId: string, initialSeats: any[] = []): RoomSeatRecord {
  if (!activeRooms.has(roomId)) {
    const s = initialSeats.length === 8 ? [...initialSeats] : Array(8).fill(null);
    activeRooms.set(roomId, {
      roomId,
      hostId,
      seats: s,
      pendingRequests: new Map()
    });
  }
  return activeRooms.get(roomId)!;
}

// Get room seats and pending requests
app.get('/api/rooms/:roomId/seats', (req: Request, res: Response) => {
  const room = activeRooms.get(req.params.roomId);
  if (!room) {
    return res.json({ seats: Array(8).fill(null), pendingRequests: [] });
  }
  res.json({
    seats: room.seats,
    pendingRequests: Array.from(room.pendingRequests.values())
  });
});

// Viewer requests an available seat
app.post('/api/rooms/:roomId/request_seat', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { user, requestedSeatIndex, roomHostId } = req.body;

  if (!user || !user.id) {
    return res.status(400).json({ error: 'Valid user object required.' });
  }

  const room = getOrCreateRoom(roomId, roomHostId || user.id);

  // Host doesn't need to request their own room
  if (room.hostId === user.id) {
    return res.status(400).json({ error: 'Room host already holds main stage authority.' });
  }

  // Prevent duplicate requests
  if (room.pendingRequests.has(user.id)) {
    return res.status(400).json({ error: 'You already have a pending seat request for this room.' });
  }

  // Check if user already occupies a seat
  if (room.seats.some((s) => s && s.id === user.id)) {
    return res.status(400).json({ error: 'You already occupy a seat in this room.' });
  }

  const requestId = `seat_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const requestObj = {
    id: requestId,
    roomId,
    user,
    requestedSeatIndex: typeof requestedSeatIndex === 'number' ? requestedSeatIndex : 0,
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now() + 60000 // 60s timeout
  };

  room.pendingRequests.set(user.id, requestObj);

  // Broadcast to room host & room viewers
  broadcastToUser(room.hostId, 'room:seat_request_received', requestObj);
  broadcastAll('room:seat_request_updated', { roomId, requestObj });

  res.json({ success: true, request: requestObj });
});

// Cancel pending seat request
app.post('/api/rooms/:roomId/cancel_seat_request', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { userId } = req.body;
  const room = activeRooms.get(roomId);
  if (room && room.pendingRequests.has(userId)) {
    room.pendingRequests.delete(userId);
    broadcastAll('room:seat_request_cancelled', { roomId, userId });
  }
  res.json({ success: true });
});

// Host approves or rejects seat request (Enforced host permissions)
app.post('/api/rooms/:roomId/respond_seat_request', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { hostId, applicantId, approve, targetSeatIndex } = req.body;
  const room = activeRooms.get(roomId);

  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }

  // Strict host verification: Only the room owner can approve/reject
  if (room.hostId !== hostId) {
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
    return res.json({ success: true, status: 'rejected' });
  }

  // Find target seat index
  let seatIdx = typeof targetSeatIndex === 'number' ? targetSeatIndex : requestObj.requestedSeatIndex;
  if (seatIdx < 0 || seatIdx >= 8 || room.seats[seatIdx] !== null) {
    // find first available empty seat
    seatIdx = room.seats.findIndex((s) => s === null);
  }

  if (seatIdx === -1) {
    return res.status(400).json({ error: 'All seats are currently occupied.' });
  }

  room.seats[seatIdx] = requestObj.user;
  requestObj.status = 'accepted';

  broadcastAll('room:seat_occupied', {
    roomId,
    seatIndex: seatIdx,
    user: requestObj.user
  });
  broadcastToUser(applicantId, 'room:seat_request_accepted', {
    roomId,
    seatIndex: seatIdx
  });

  res.json({ success: true, seatIndex: seatIdx, seats: room.seats });
});

// Host removes participant from seat (Enforced host permissions)
app.post('/api/rooms/:roomId/remove_seat', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { hostId, seatIndex } = req.body;
  const room = activeRooms.get(roomId);

  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }

  if (room.hostId !== hostId) {
    return res.status(403).json({ error: 'Unauthorized. Only room host can remove participants.' });
  }

  if (seatIndex >= 0 && seatIndex < 8) {
    const removedUser = room.seats[seatIndex];
    room.seats[seatIndex] = null;
    broadcastAll('room:seat_vacated', { roomId, seatIndex, removedUser });
  }

  res.json({ success: true, seats: room.seats });
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

// --- USER PROFILES, SOCIAL GRAPH & FOLLOWS ---
const serverUsers = new Map<string, any>();
const userFollowersMap = new Map<string, Set<string>>();
const userFollowingMap = new Map<string, Set<string>>();

function initServerUsers() {
  if (serverUsers.size > 0) return;

  const defaultUser = {
    id: 'user_current_01',
    displayId: 'SK99218',
    name: 'Queen Sara 👑',
    username: '@queensara',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    bio: '✨ Official Lonzo Host & Singer | VIP Creator 👑 Catch my party rooms every night at 9 PM!',
    level: 42,
    vipLevel: 5,
    isVIP: true,
    coins: 12500,
    diamonds: 4200,
    gender: 'female',
    country: 'Pakistan',
    birthday: '2001-08-14',
  };

  serverUsers.set(defaultUser.id, defaultUser);
  userFollowersMap.set(defaultUser.id, new Set(['user_sara', 'user_rohan', 'user_queen_girl', 'user_pink_girl', 'user_sweetie']));
  userFollowingMap.set(defaultUser.id, new Set(['user_sara', 'user_rohan', 'user_king']));
}

app.get('/api/users/check_username', (req: Request, res: Response) => {
  initServerUsers();
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
  initServerUsers();
  const userId = req.params.id;
  const user = serverUsers.get(userId) || serverUsers.get('user_current_01');

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const followers = userFollowersMap.get(userId) || new Set();
  const following = userFollowingMap.get(userId) || new Set();
  const userVideosList = serverVideos.filter((v) => v.creator?.id === userId || (userId === 'user_current_01' && v.creator?.id === 'user_current_01'));
  const totalLikes = userVideosList.reduce((acc, v) => acc + (v.likesCount || 0), 0) + 52700;

  res.json({
    user: {
      ...user,
      followersCount: followers.size + 12420,
      fansCount: `${((followers.size + 12420) / 1000).toFixed(1)}K`,
      followingCount: following.size + 142,
      totalLikes,
      likesCount: `${(totalLikes / 1000).toFixed(1)}K`,
    },
  });
});

app.put('/api/users/:id', (req: Request, res: Response) => {
  initServerUsers();
  const userId = req.params.id;
  const existing = serverUsers.get(userId) || serverUsers.get('user_current_01');

  if (!existing) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { name, username, bio, avatar, gender, country, birthday } = req.body;

  if (username) {
    const clean = String(username).toLowerCase().trim().replace(/^@/, '');
    for (const [id, u] of serverUsers.entries()) {
      if (id !== userId && u.username?.toLowerCase().replace(/^@/, '') === clean) {
        return res.status(400).json({ error: 'Username is already taken by another user.' });
      }
    }
    existing.username = `@${clean}`;
  }

  if (name) existing.name = String(name).trim();
  if (typeof bio === 'string') existing.bio = bio.trim();
  if (avatar) existing.avatar = avatar;
  if (gender) existing.gender = gender;
  if (country) existing.country = country;
  if (birthday) existing.birthday = birthday;

  serverUsers.set(userId, existing);

  const followers = userFollowersMap.get(userId) || new Set();
  const following = userFollowingMap.get(userId) || new Set();
  const totalLikes = 52700;

  res.json({
    success: true,
    user: {
      ...existing,
      followersCount: followers.size + 12420,
      fansCount: `${((followers.size + 12420) / 1000).toFixed(1)}K`,
      followingCount: following.size + 142,
      totalLikes,
      likesCount: `${(totalLikes / 1000).toFixed(1)}K`,
    },
  });
});

app.get('/api/users/:id/followers', (req: Request, res: Response) => {
  initServerUsers();
  const myFollowingSet = userFollowingMap.get('user_current_01') || new Set();

  const mockFollowersList = [
    {
      id: 'user_sara',
      name: 'Sara Khan 🌸',
      username: '@sarakhan',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
      bio: 'Singing, dancing & late night vibes! 🎤',
      level: 48,
      isVIP: true,
      isFollowing: myFollowingSet.has('user_sara'),
    },
    {
      id: 'user_rohan',
      name: 'Rohan Kumar 🔥',
      username: '@rohan_kumar',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      bio: 'DJ & EDM Beatmaker. Party room host.',
      level: 52,
      isVIP: true,
      isFollowing: myFollowingSet.has('user_rohan'),
    },
    {
      id: 'user_queen_girl',
      name: 'Queen Star 👑',
      username: '@queenstar',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80',
      bio: 'Top gifter on Lonzo Party Live! 💖',
      level: 65,
      isVIP: true,
      isFollowing: myFollowingSet.has('user_queen_girl'),
    },
    {
      id: 'user_pink_girl',
      name: 'Pink Rose 🌹',
      username: '@pinkrose',
      avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&auto=format&fit=crop&q=80',
      bio: 'Guitar acoustics & chill conversations.',
      level: 39,
      isVIP: false,
      isFollowing: myFollowingSet.has('user_pink_girl'),
    },
    {
      id: 'user_sweetie',
      name: 'Sweetie Girl ✨',
      username: '@sweetie',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      bio: 'Daily life & party moments!',
      level: 35,
      isVIP: false,
      isFollowing: myFollowingSet.has('user_sweetie'),
    },
  ];

  res.json({ followers: mockFollowersList });
});

app.get('/api/users/:id/following', (req: Request, res: Response) => {
  initServerUsers();
  const mockFollowingList = [
    {
      id: 'user_sara',
      name: 'Sara Khan 🌸',
      username: '@sarakhan',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
      bio: 'Singing, dancing & late night vibes! 🎤',
      level: 48,
      isVIP: true,
      isFollowing: true,
    },
    {
      id: 'user_rohan',
      name: 'Rohan Kumar 🔥',
      username: '@rohan_kumar',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      bio: 'DJ & EDM Beatmaker. Party room host.',
      level: 52,
      isVIP: true,
      isFollowing: true,
    },
    {
      id: 'user_king',
      name: 'King Raja 👑',
      username: '@kingraja',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
      bio: 'Battle Champion. Unbeatable in PK.',
      level: 68,
      isVIP: true,
      isFollowing: true,
    },
  ];

  res.json({ following: mockFollowingList });
});

app.post('/api/users/:id/follow', (req: Request, res: Response) => {
  initServerUsers();
  const targetId = req.params.id;
  const { followerId = 'user_current_01' } = req.body;

  if (targetId === followerId) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
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
    targetFollowersCount: followers.size + 12420,
    myFollowingCount: following.size + 142,
  });
});

app.post('/api/users/:id/unfollow', (req: Request, res: Response) => {
  initServerUsers();
  const targetId = req.params.id;
  const { followerId = 'user_current_01' } = req.body;

  const followers = userFollowersMap.get(targetId);
  if (followers) followers.delete(followerId);

  const following = userFollowingMap.get(followerId);
  if (following) following.delete(targetId);

  res.json({
    success: true,
    isFollowing: false,
    targetFollowersCount: Math.max(0, (followers?.size || 0) + 12420),
    myFollowingCount: Math.max(0, (following?.size || 0) + 142),
  });
});

// --- AGORA RTC ACTIVE LIVE STREAM REGISTRY ---
interface ActiveAgoraStream {
  roomId: string;
  hostId: string;
  hostProfile?: any;
  channelName: string;
  viewerCount: number;
  isCameraOn: boolean;
  isMicMuted: boolean;
  startTime: number;
}
const activeAgoraStreams = new Map<string, ActiveAgoraStream>();

app.get('/api/live/active_streams', (_req: Request, res: Response) => {
  const streams = Array.from(activeAgoraStreams.values());
  res.json({ streams });
});

app.get('/api/live/stream/:roomId', (req: Request, res: Response) => {
  const stream = activeAgoraStreams.get(req.params.roomId);
  if (!stream) {
    return res.status(404).json({ error: 'Stream not found or offline', isLive: false });
  }
  res.json({ isLive: true, ...stream });
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
    const expirationTimeInSeconds = 3600; // 1 hour token
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUserAccount(
      appId,
      appCertificate,
      channelName,
      String(uid || '0'),
      rtcRole,
      expirationTimeInSeconds,
      privilegeExpiredTs
    );

    res.json({
      configured: true,
      success: true,
      token,
      appId,
      channelName,
      uid: String(uid || '0'),
      role,
      expiresAt: privilegeExpiredTs,
    });
  } catch (err: any) {
    console.error('Error generating Agora RTC token:', err);
    res.status(500).json({ error: 'Failed to generate RTC token', details: err.message });
  }
});

// Vite Integration
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Lonzo Party Live Server running on port ${PORT}`);
  });
}

startServer();
