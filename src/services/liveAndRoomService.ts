import {
  BroadcasterRankingEntry,
  ChatMessage,
  GiftItem,
  LiveStream,
  LiveViewerInfo,
  PartyRoom,
  RankingCategory,
  RankingConfig,
  RankingEntry,
  RankingPeriod,
  RankingResponse,
  RankingScope,
  UserProfile,
} from '../types';
import { apiFetch, getWsUrl } from '../utils/apiConfig';

type RealtimeCallback = (event: string, payload: any) => void;

class LiveAndRoomService {
  private socket: WebSocket | null = null;
  private userId: string | null = null;
  private activeStreamId: string | null = null;
  private activeRoomId: string | null = null;
  private listeners = new Set<RealtimeCallback>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private isConnecting = false;

  constructor() {
    this.initWebSocket();
  }

  public setCurrentUser(userId: string | null) {
    this.userId = userId;
    if (userId && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'auth', userId }));
    }
  }

  public subscribeLive(streamId: string, userId?: string) {
    this.activeStreamId = streamId;
    if (userId) this.userId = userId;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'subscribe_live', streamId, userId: this.userId }));
    }
  }

  public unsubscribeLive() {
    this.activeStreamId = null;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'unsubscribe_live' }));
    }
  }

  public subscribeRoom(roomId: string, userId?: string) {
    this.activeRoomId = roomId;
    if (userId) this.userId = userId;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'subscribe_room', roomId, userId: this.userId }));
    }
  }

  public unsubscribeRoom() {
    this.activeRoomId = null;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'unsubscribe_room' }));
    }
  }

  private pendingMessages: string[] = [];

  private sendRaw(payloadObj: Record<string, any>) {
    const serialized = JSON.stringify(payloadObj);
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(serialized);
    } else {
      if (this.pendingMessages.length < 40) {
        this.pendingMessages.push(serialized);
      }
      if (!this.isConnecting && !this.socket) {
        this.initWebSocket();
      }
    }
  }

  public sendSignal(params: {
    signalType: string;
    fromUserId: string;
    targetUserId?: string;
    streamId?: string;
    roomId?: string;
    payload?: Record<string, any>;
  }) {
    this.sendRaw({
      type: 'webrtc:signal',
      ...params,
    });
  }

  public sendLiveMediaState(
    streamId: string,
    hostId: string,
    state: { isCameraOn: boolean; isMicMuted: boolean; isFrontCamera?: boolean }
  ) {
    this.sendRaw({
      type: 'live:media_state',
      streamId,
      hostId,
      ...state,
    });
  }

  public addEventListener(cb: RealtimeCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(event: string, payload: any) {
    this.listeners.forEach((cb) => {
      try {
        cb(event, payload);
      } catch (err) {
        console.error('[Realtime] Listener error:', err);
      }
    });
  }

  private initWebSocket() {
    if (typeof window === 'undefined' || this.isConnecting) return;
    this.isConnecting = true;

    try {
      const wsUrl = getWsUrl('/ws');
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        if (this.userId) {
          this.socket?.send(JSON.stringify({ type: 'auth', userId: this.userId }));
        }
        if (this.activeStreamId) {
          this.socket?.send(
            JSON.stringify({ type: 'subscribe_live', streamId: this.activeStreamId, userId: this.userId })
          );
        }
        if (this.activeRoomId) {
          this.socket?.send(
            JSON.stringify({ type: 'subscribe_room', roomId: this.activeRoomId, userId: this.userId })
          );
        }
        if (this.pendingMessages.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
          const queued = this.pendingMessages.splice(0, this.pendingMessages.length);
          queued.forEach((raw) => {
            try {
              this.socket?.send(raw);
            } catch {
              // ignore
            }
          });
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed?.event) {
            this.notify(parsed.event, parsed.payload);
          }
        } catch {
          // ignore malformed messages
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
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.reconnectAttempts >= 6) return;
    const delayMs = Math.min(30000, 2000 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.initWebSocket();
    }, delayMs);
  }

  // --- LIVE STREAMING API ---

  public async fetchActiveStreams(): Promise<LiveStream[]> {
    try {
      const res = await apiFetch('/api/live/active_streams');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        return Array.isArray(data.streams) ? data.streams : [];
      }
    } catch (err) {
      console.warn('[Live] fetchActiveStreams error:', err);
    }
    return [];
  }

  public async startLiveStream(stream: LiveStream): Promise<LiveStream> {
    const res = await apiFetch('/api/live/start', {
      method: 'POST',
      body: JSON.stringify(stream),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to start live stream' }));
      throw new Error(err.error || 'Failed to start live stream');
    }
    const data = await res.json();
    return data.stream || stream;
  }

  public async joinLiveStream(
    streamId: string,
    user: UserProfile,
    streamMeta?: { host?: UserProfile; title?: string; category?: string }
  ): Promise<{ stream?: LiveStream; viewers?: LiveViewerInfo[]; comments?: ChatMessage[] }> {
    const res = await apiFetch(`/api/live/${encodeURIComponent(streamId)}/join`, {
      method: 'POST',
      body: JSON.stringify({ user, streamMeta }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Live broadcast ended or unavailable' }));
      throw new Error(err.error || 'Failed to join live stream');
    }
    return await res.json();
  }

  public async sendLiveHeartbeat(streamId: string, userId: string): Promise<void> {
    await apiFetch(`/api/live/${encodeURIComponent(streamId)}/heartbeat`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }).catch(() => {});
  }

  public async leaveLiveStream(streamId: string, userId: string): Promise<void> {
    await apiFetch(`/api/live/${encodeURIComponent(streamId)}/leave`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }).catch(() => {});
  }

  public async endLiveStream(streamId: string, hostId: string): Promise<void> {
    const res = await apiFetch(`/api/live/${encodeURIComponent(streamId)}/end`, {
      method: 'POST',
      body: JSON.stringify({ hostId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to end live stream' }));
      throw new Error(err.error || 'Failed to end live stream');
    }
  }

  public async fetchLiveViewers(
    streamId: string,
    page = 1,
    limit = 20
  ): Promise<{ viewers: LiveViewerInfo[]; totalCount: number; hasMore: boolean }> {
    const res = await apiFetch(
      `/api/live/${encodeURIComponent(streamId)}/viewers?page=${page}&limit=${limit}`
    );
    if (!res.ok) {
      return { viewers: [], totalCount: 0, hasMore: false };
    }
    return await res.json();
  }

  public async sendLiveComment(
    streamId: string,
    sender: UserProfile,
    text: string,
    customId?: string,
    streamMeta?: { host?: UserProfile; title?: string; category?: string }
  ): Promise<ChatMessage> {
    const res = await apiFetch(`/api/live/${encodeURIComponent(streamId)}/comment`, {
      method: 'POST',
      body: JSON.stringify({ sender, text, customId, streamMeta }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to send comment' }));
      throw new Error(err.error || 'Failed to send comment');
    }
    const data = await res.json();
    return data.message;
  }

  public async sendLiveHeart(
    streamId: string,
    senderId: string,
    count = 1,
    streamMeta?: { host?: UserProfile; title?: string; category?: string }
  ): Promise<number> {
    try {
      const res = await apiFetch(`/api/live/${encodeURIComponent(streamId)}/heart`, {
        method: 'POST',
        body: JSON.stringify({ senderId, count, streamMeta }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.likesCount || 0;
      }
    } catch {
      // ignore transient heart burst errors
    }
    return 0;
  }

  public async recordLiveGift(
    streamId: string,
    sender: UserProfile,
    recipient: UserProfile,
    gift: GiftItem,
    quantity: number
  ): Promise<void> {
    await apiFetch(`/api/live/${encodeURIComponent(streamId)}/gift`, {
      method: 'POST',
      body: JSON.stringify({ sender, recipient, gift, quantity }),
    }).catch(() => {});
  }

  // --- PARTY ROOMS API ---

  public async fetchActiveRooms(): Promise<PartyRoom[]> {
    try {
      const res = await apiFetch('/api/rooms');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        return Array.isArray(data.rooms) ? data.rooms : [];
      }
    } catch (err) {
      console.warn('[Rooms] fetchActiveRooms error:', err);
    }
    return [];
  }

  public async createPartyRoom(room: PartyRoom): Promise<PartyRoom> {
    const res = await apiFetch('/api/rooms/create', {
      method: 'POST',
      body: JSON.stringify(room),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create room' }));
      throw new Error(err.error || 'Failed to create room');
    }
    const data = await res.json();
    return data.room || room;
  }

  public async joinPartyRoom(
    roomId: string,
    user: UserProfile,
    password?: string
  ): Promise<{
    room: PartyRoom;
    participants?: LiveViewerInfo[];
    pendingRequests: any[];
    messages: ChatMessage[];
  }> {
    const res = await apiFetch(`/api/rooms/${encodeURIComponent(roomId)}/join`, {
      method: 'POST',
      body: JSON.stringify({ user, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to join party room' }));
      throw new Error(err.error || 'Failed to join party room');
    }
    return await res.json();
  }

  public async sendRoomHeartbeat(roomId: string, userId: string): Promise<void> {
    await apiFetch(`/api/rooms/${encodeURIComponent(roomId)}/heartbeat`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }).catch(() => {});
  }

  public async leavePartyRoom(roomId: string, userId: string): Promise<void> {
    await apiFetch(`/api/rooms/${encodeURIComponent(roomId)}/leave`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }).catch(() => {});
  }

  public async endPartyRoom(roomId: string, hostId: string): Promise<void> {
    const res = await apiFetch(`/api/rooms/${encodeURIComponent(roomId)}/end`, {
      method: 'POST',
      body: JSON.stringify({ hostId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to end room' }));
      throw new Error(err.error || 'Failed to end room');
    }
  }

  public async fetchRoomParticipants(
    roomId: string,
    page = 1,
    limit = 20
  ): Promise<{ participants: LiveViewerInfo[]; totalCount: number; hasMore: boolean }> {
    const res = await apiFetch(
      `/api/rooms/${encodeURIComponent(roomId)}/participants?page=${page}&limit=${limit}`
    );
    if (!res.ok) return { participants: [], totalCount: 0, hasMore: false };
    return await res.json();
  }

  public async sendRoomChat(
    roomId: string,
    sender: UserProfile,
    text: string
  ): Promise<ChatMessage> {
    const res = await apiFetch(`/api/rooms/${encodeURIComponent(roomId)}/chat`, {
      method: 'POST',
      body: JSON.stringify({ sender, text }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to send message' }));
      throw new Error(err.error || 'Failed to send message');
    }
    const data = await res.json();
    return data.message;
  }

  public async sendRoomHeart(
    roomId: string,
    senderId: string,
    count = 1,
    options?: {
      senderName?: string;
      x?: number;
      y?: number;
      roomHostId?: string;
      roomMeta?: { host?: UserProfile; title?: string; maxSeats?: number };
    }
  ): Promise<number> {
    try {
      const res = await apiFetch(`/api/rooms/${encodeURIComponent(roomId)}/heart`, {
        method: 'POST',
        body: JSON.stringify({
          senderId,
          count,
          senderName: options?.senderName,
          x: options?.x,
          y: options?.y,
          roomHostId: options?.roomHostId,
          roomMeta: options?.roomMeta,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.likesCount || 0;
      }
    } catch {
      // ignore
    }
    return 0;
  }

  public async recordRoomGift(
    roomId: string,
    sender: UserProfile,
    recipient: UserProfile,
    gift: GiftItem,
    quantity: number
  ): Promise<void> {
    await apiFetch(`/api/rooms/${encodeURIComponent(roomId)}/gift`, {
      method: 'POST',
      body: JSON.stringify({ sender, recipient, gift, quantity }),
    }).catch(() => {});
  }

  public async muteRoomSeat(
    roomId: string,
    hostId: string,
    seatIndex: number,
    muted: boolean
  ): Promise<number[]> {
    const res = await apiFetch(`/api/rooms/${encodeURIComponent(roomId)}/mute_seat`, {
      method: 'POST',
      body: JSON.stringify({ hostId, seatIndex, muted }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to mute seat' }));
      throw new Error(err.error || 'Failed to mute seat');
    }
    const data = await res.json();
    return data.mutedSeatIndices || [];
  }

  public async leaveOwnSeat(roomId: string, userId: string): Promise<(UserProfile | null)[]> {
    const res = await apiFetch(`/api/rooms/${encodeURIComponent(roomId)}/leave_seat`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.seats || [];
  }

  public async takeSeatDirect(
    roomId: string,
    hostId: string,
    seatIndex: number,
    user: UserProfile
  ): Promise<(UserProfile | null)[]> {
    const res = await apiFetch(`/api/rooms/${encodeURIComponent(roomId)}/take_seat`, {
      method: 'POST',
      body: JSON.stringify({ hostId, seatIndex, user }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to assign seat' }));
      throw new Error(err.error || 'Failed to assign seat');
    }
    const data = await res.json();
    return data.seats || [];
  }

  public async updateRoomSettings(
    roomId: string,
    hostId: string,
    settings: {
      isLocked?: boolean;
      allowJoin?: boolean;
      announcement?: string;
      maxSeats?: number;
      backgroundType?: 'preset' | 'host_dp' | 'custom';
      backgroundId?: string;
      backgroundImage?: string;
    }
  ): Promise<PartyRoom | null> {
    const res = await apiFetch(`/api/rooms/${encodeURIComponent(roomId)}/settings`, {
      method: 'POST',
      body: JSON.stringify({ hostId, ...settings }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.room || null;
  }

  // --- RANKINGS & ADMIN CONFIG API ---

  public async fetchTopBroadcasters(): Promise<{
    broadcasters: BroadcasterRankingEntry[];
    config?: RankingConfig;
  }> {
    try {
      const res = await apiFetch('/api/rankings/top-broadcasters');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        return {
          broadcasters: Array.isArray(data.broadcasters) ? data.broadcasters : [],
          config: data.config,
        };
      }
    } catch {
      // ignore
    }
    return { broadcasters: [] };
  }

  public async fetchLeaderboard(params: {
    scope?: RankingScope;
    category?: RankingCategory;
    period?: RankingPeriod;
    contextId?: string;
    userId?: string;
    limit?: number;
  }): Promise<RankingResponse> {
    const scope: RankingScope = params.scope || 'global';
    const category: RankingCategory = params.category || 'all';
    const period: RankingPeriod = params.period || 'daily';
    const qs = new URLSearchParams({
      scope,
      category,
      period,
    });
    if (params.contextId) qs.set('contextId', params.contextId);
    if (params.userId) qs.set('userId', params.userId);
    if (params.limit) qs.set('limit', String(params.limit));

    try {
      const res = await apiFetch(`/api/rankings?${qs.toString()}`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        return {
          rankings: Array.isArray(data.rankings) ? data.rankings : [],
          myRank: data.myRank ?? null,
          myEntry: data.myEntry ?? null,
          totalCount: Number(data.totalCount || 0),
          scope: data.scope || scope,
          category: data.category || category,
          period: data.period || period,
          contextId: data.contextId ?? null,
          resetAt: data.resetAt ?? null,
          config: data.config,
        };
      }
    } catch {
      // ignore network failure
    }
    return {
      rankings: [],
      myRank: null,
      myEntry: null,
      totalCount: 0,
      scope,
      category,
      period,
      contextId: params.contextId ?? null,
      resetAt: null,
    };
  }

  public async fetchRankings(
    tab: 'Star' | 'Contribution' | 'Wealth',
    period: RankingPeriod,
    userId?: string
  ): Promise<{ rankings: RankingEntry[]; myRank: number | null; config?: RankingConfig }> {
    const category: RankingCategory =
      tab === 'Star' ? 'host' : tab === 'Contribution' ? 'gifter' : 'all';
    const data = await this.fetchLeaderboard({
      scope: 'global',
      category,
      period,
      userId,
    });
    return {
      rankings: data.rankings,
      myRank: data.myRank,
      config: data.config,
    };
  }

  public async fetchAdminRankingConfig(): Promise<RankingConfig | null> {
    try {
      const res = await apiFetch('/api/admin/ranking-config');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        return data.config || null;
      }
    } catch {
      // ignore
    }
    return null;
  }

  public async updateRankingConfig(config: Partial<RankingConfig>): Promise<RankingConfig> {
    const res = await apiFetch('/api/admin/ranking-config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update ranking config' }));
      throw new Error(err.error || 'Failed to update ranking config');
    }
    const data = await res.json();
    return data.config;
  }

  public async syncUser(user: UserProfile): Promise<void> {
    if (!user?.id) return;
    await apiFetch('/api/users/sync', {
      method: 'POST',
      body: JSON.stringify({ user }),
    }).catch(() => {});
  }
}

export const liveAndRoomService = new LiveAndRoomService();
