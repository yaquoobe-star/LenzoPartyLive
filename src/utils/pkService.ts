import { 
  UserProfile, 
  GiftItem, 
  PKMatchSession, 
  PKMatchInvitation, 
  PKMatchHistoryItem, 
  PKGiftEvent, 
  PKLikeEvent 
} from '../types';

type PKEventCallback = (event: string, payload: any) => void;

class PKService {
  private socket: WebSocket | null = null;
  private currentUserId: string | null = null;
  private currentMatchId: string | null = null;
  private listeners: Set<PKEventCallback> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;

  constructor() {
    this.initWebSocket();
  }

  public setCurrentUser(userId: string) {
    this.currentUserId = userId;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'auth', userId }));
    }
  }

  public subscribeToMatch(matchId: string) {
    this.currentMatchId = matchId;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'subscribe_match', matchId }));
    }
  }

  public unsubscribeFromMatch() {
    this.currentMatchId = null;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'unsubscribe_match' }));
    }
  }

  public addEventListener(cb: PKEventCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(event: string, payload: any) {
    this.listeners.forEach((cb) => {
      try {
        cb(event, payload);
      } catch (err) {
        console.error('PK event listener error:', err);
      }
    });
  }

  private initWebSocket() {
    if (typeof window === 'undefined' || this.isConnecting) return;
    this.isConnecting = true;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/pk`;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
        if (this.currentUserId) {
          this.socket?.send(JSON.stringify({ type: 'auth', userId: this.currentUserId }));
        }
        if (this.currentMatchId) {
          this.socket?.send(JSON.stringify({ type: 'subscribe_match', matchId: this.currentMatchId }));
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.event) {
            this.notify(data.event, data.payload);
          }
        } catch (e) {
          // ignore invalid json
        }
      };

      this.socket.onclose = () => {
        this.isConnecting = false;
        this.socket = null;
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.isConnecting = false;
      };
    } catch (e) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.initWebSocket();
    }, 3000);
  }

  // --- REST API Calls with graceful fallbacks ---

  public async fetchEligibleHosts(): Promise<any[]> {
    try {
      const res = await fetch('/api/pk/hosts');
      if (res.ok) {
        const data = await res.json();
        return data.hosts || [];
      }
    } catch (err) {
      console.warn('Fallback to local eligible hosts:', err);
    }

    return [
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
      }
    ];
  }

  public async sendPKInvite(
    fromHost: UserProfile, 
    toHost: any, 
    note?: string, 
    autoAccept: boolean = false
  ): Promise<{ invitation: PKMatchInvitation; session?: PKMatchSession }> {
    const res = await fetch('/api/pk/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromHost, toHost, note, autoAccept })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to send invite' }));
      throw new Error(err.error || 'Failed to send invite');
    }

    const data = await res.json();
    return { invitation: data.invitation, session: data.session };
  }

  public async respondPKInvite(inviteId: string, accept: boolean, responderId: string): Promise<{ success: boolean; session?: PKMatchSession }> {
    const res = await fetch('/api/pk/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId, accept, responderId })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to respond to invite' }));
      throw new Error(err.error || 'Failed to respond to invite');
    }

    return await res.json();
  }

  public async cancelPKInvite(inviteId: string, hostId: string): Promise<boolean> {
    const res = await fetch('/api/pk/cancel_invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId, hostId })
    });
    return res.ok;
  }

  public async fetchMatchSession(matchId: string): Promise<{ session: PKMatchSession; serverTime: number }> {
    const res = await fetch(`/api/pk/session/${matchId}`);
    if (!res.ok) {
      throw new Error('Session not found');
    }
    return await res.json();
  }

  public async sendPKGift(
    matchId: string,
    sender: UserProfile,
    recipientId: string,
    gift: GiftItem,
    quantity: number = 1
  ): Promise<{ success: boolean; host1Score: number; host2Score: number; giftEvent: PKGiftEvent }> {
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const res = await fetch('/api/pk/gift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId,
        sender,
        recipientId,
        gift,
        quantity,
        txId
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to drop gift in PK match' }));
      throw new Error(err.error || 'Failed to drop gift in PK match');
    }

    return await res.json();
  }

  public async sendPKLike(
    matchId: string,
    recipientId: string,
    count: number = 1,
    x?: number,
    y?: number
  ): Promise<void> {
    try {
      await fetch('/api/pk/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, recipientId, count, x, y })
      });
    } catch (e) {
      // Likes are non-blocking fire-and-forget
    }
  }

  public async forfeitMatch(matchId: string, hostId: string, reason?: string): Promise<void> {
    await fetch('/api/pk/forfeit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, hostId, reason })
    });
  }

  public async fetchMatchHistory(userId: string): Promise<PKMatchHistoryItem[]> {
    try {
      const res = await fetch(`/api/pk/history/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.history && data.history.length > 0) {
          // Sync to localStorage
          localStorage.setItem(`lonzo_pk_history_${userId}`, JSON.stringify(data.history));
          return data.history;
        }
      }
    } catch (e) {
      console.warn('Server history fetch error, reading local storage:', e);
    }

    // LocalStorage fallback
    const local = localStorage.getItem(`lonzo_pk_history_${userId}`);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (err) {
        // ignore
      }
    }

    return [];
  }

  public saveMatchHistoryLocally(userId: string, item: PKMatchHistoryItem) {
    const key = `lonzo_pk_history_${userId}`;
    const local = localStorage.getItem(key);
    let list: PKMatchHistoryItem[] = [];
    if (local) {
      try {
        list = JSON.parse(local);
      } catch (e) {
        list = [];
      }
    }
    // Prevent duplicate matchId
    if (!list.some((h) => h.matchId === item.matchId)) {
      list = [item, ...list];
      localStorage.setItem(key, JSON.stringify(list));
    }
  }
}

export const pkService = new PKService();
