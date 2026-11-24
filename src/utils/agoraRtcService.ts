import AgoraRTC, {
  IAgoraRTCClient,
  ILocalVideoTrack,
  ILocalAudioTrack,
  ICameraVideoTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
  UID,
  ConnectionState,
} from 'agora-rtc-sdk-ng';
import { apiFetch } from './apiConfig';

export interface AgoraConnectionStatus {
  state: ConnectionState;
  reason?: string;
  isBroadcaster: boolean;
  channelName: string;
  uid: string | number;
}

export interface AgoraRemoteHost {
  uid: UID;
  videoTrack?: IRemoteVideoTrack;
  audioTrack?: IRemoteAudioTrack;
  hasVideo: boolean;
  hasAudio: boolean;
  isCameraOn?: boolean;
  isMicMuted?: boolean;
}

export interface AgoraVolumeInfo {
  uid: UID;
  level: number;
}

export interface AgoraServerConfig {
  configured: boolean;
  appId: string;
  tokenRequired?: boolean;
  requiresCertificate?: boolean;
  mode?: 'certificate' | 'appid-only' | 'unconfigured';
}

export interface AgoraTokenResponse {
  token: string | null;
  appId: string;
  configured: boolean;
  tokenRequired?: boolean;
  expiresAt?: number | null;
  error?: string;
}

class AgoraRtcService {
  private client: IAgoraRTCClient | null = null;
  private localAudioTrack: ILocalAudioTrack | null = null;
  private localVideoTrack: ILocalVideoTrack | null = null;

  private currentChannel: string | null = null;
  private currentUserAccount: string | null = null;
  private currentRole: 'host' | 'audience' = 'audience';
  private currentUid: UID | null = null;
  private isFrontCamera: boolean = true;
  private isCameraOn: boolean = true;
  private isMicMuted: boolean = false;
  private isSpeakerMuted: boolean = false;
  private cameraPermissionDenied: boolean = false;
  private micPermissionDenied: boolean = false;
  private availableCameras: MediaDeviceInfo[] = [];
  private currentCameraIndex: number = 0;
  private isPublishingAudioFlag: boolean = false;
  private isPublishingVideoFlag: boolean = false;

  // Serialize join / leave / role transitions to prevent duplicate sessions or WS_ABORT
  private activeJoinPromise: Promise<UID> | null = null;
  private activeLeavePromise: Promise<void> | null = null;
  private roleSwitchQueue: Promise<any> = Promise.resolve();
  private inFlightSubscribes: Map<string, Promise<void>> = new Map();
  private isLeaving: boolean = false;
  private isRenewingToken: boolean = false;
  private backendUnavailableUntil: number = 0;

  // Remote streams keyed by normalized string UID
  private remoteHosts: Map<string, AgoraRemoteHost> = new Map();

  // Listeners
  private onRemoteTrackCallbacks: Set<(host: AgoraRemoteHost) => void> = new Set();
  private onUserLeftCallbacks: Set<(uid: UID) => void> = new Set();
  private onStatusCallbacks: Set<(status: AgoraConnectionStatus) => void> = new Set();
  private onVolumeCallbacks: Set<(volumes: AgoraVolumeInfo[]) => void> = new Set();
  private onAutoplayBlockedCallbacks: Set<() => void> = new Set();

  constructor() {
    // Configure AgoraRTC client defaults - level 2 = WARNING
    AgoraRTC.setLogLevel(2);
    AgoraRTC.onAudioAutoplayFailed = () => {
      this.onAutoplayBlockedCallbacks.forEach((cb) => cb());
    };

    if (typeof window !== 'undefined') {
      // Resume remote audio cleanly when returning to foreground on Android/Web
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && this.client?.connectionState === 'CONNECTED') {
            this.resumeRemoteAudio();
          }
        });
      }

      window.addEventListener('online', () => {
        if (this.client?.connectionState === 'CONNECTED') {
          this.resumeRemoteAudio();
        }
      });

      // Safeguard against Agora internal WS_ABORT and device permission rejections
      window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        const msg = String(reason?.message || reason || '');
        const code = String(reason?.code || '');
        if (
          code === 'WS_ABORT' ||
          msg.includes('WS_ABORT') ||
          msg.includes('PERMISSION_DENIED') ||
          msg.includes('NotAllowedError') ||
          msg.includes('track-mic') ||
          msg.includes('track-cam')
        ) {
          event.preventDefault();
        }
      });

      // Intercept benign Agora SDK internal teardown & permission messages
      const originalConsoleError = console.error;
      console.error = function (...args: any[]) {
        const fullMsg = args.map((a) => (typeof a === 'string' ? a : a?.message || '')).join(' ');
        if (
          fullMsg.includes('WS_ABORT') ||
          fullMsg.includes('PERMISSION_DENIED') ||
          fullMsg.includes('NotAllowedError') ||
          fullMsg.includes('track-mic') ||
          fullMsg.includes('track-cam') ||
          (fullMsg.includes('AgoraRTCError') && (fullMsg.includes('WS_ABORT') || fullMsg.includes('PERMISSION_DENIED')))
        ) {
          console.warn('[Agora RTC] Handled device permission or internal event gracefully:', fullMsg.trim());
          return;
        }
        originalConsoleError.apply(console, args);
      };
    }
  }

  /**
   * Fetch Agora Configuration from backend
   */
  async getAgoraConfig(): Promise<AgoraServerConfig> {
    if (Date.now() < this.backendUnavailableUntil) {
      return { configured: false, appId: '', tokenRequired: true, mode: 'unconfigured' };
    }
    try {
      const res = await apiFetch('/api/agora/config', { timeoutMs: 5000 });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        this.backendUnavailableUntil = 0;
        return {
          configured: Boolean(data.configured && data.appId),
          appId: String(data.appId || ''),
          tokenRequired: data.tokenRequired !== false,
          requiresCertificate: Boolean(data.requiresCertificate),
          mode: data.mode,
        };
      }
      if (res.status >= 500 || !res.headers.get('content-type')?.includes('application/json')) {
        this.backendUnavailableUntil = Date.now() + 4_000;
      }
    } catch (e) {
      this.backendUnavailableUntil = Date.now() + 4_000;
      console.warn('[Agora RTC] Failed to fetch Agora config:', e);
    }
    return { configured: false, appId: '', tokenRequired: true, mode: 'unconfigured' };
  }

  /**
   * Fetch secure RTC Token from server-side token generator
   */
  async requestRtcToken(
    channelName: string,
    userAccount: string,
    role: 'broadcaster' | 'audience',
    isRefresh: boolean = false,
    timeoutMs?: number
  ): Promise<AgoraTokenResponse> {
    if (!isRefresh && Date.now() < this.backendUnavailableUntil) {
      return {
        token: null,
        appId: '',
        configured: false,
        error: 'Agora token backend temporarily unavailable',
      };
    }
    const effectiveTimeout = Math.max(timeoutMs ?? 0, isRefresh ? 6000 : 5000);
    const maxAttempts = isRefresh ? 2 : 2;
    let lastError = 'Token request failed';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const endpoint = isRefresh ? '/api/agora/refresh-token' : '/api/agora/token';
        const res = await apiFetch(endpoint, {
          method: 'POST',
          timeoutMs: effectiveTimeout,
          body: JSON.stringify({
            channelName,
            uid: userAccount,
            role,
          }),
        });

        if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
          const errText = await res.text().catch(() => '');
          lastError = errText || `Agora token endpoint returned ${res.status}`;
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 350));
            continue;
          }
          if (!isRefresh && (res.status >= 500 || !res.headers.get('content-type')?.includes('application/json'))) {
            this.backendUnavailableUntil = Date.now() + 4_000;
          }
          return {
            token: null,
            appId: '',
            configured: false,
            error: lastError,
          };
        }

        const data = await res.json();
        this.backendUnavailableUntil = 0;
        return {
          token: data.token ?? null,
          appId: String(data.appId || ''),
          configured: Boolean(data.configured),
          tokenRequired: data.tokenRequired !== false,
          expiresAt: data.expiresAt ?? null,
          error: data.error,
        };
      } catch (err: any) {
        lastError = err?.message || 'Token request failed';
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 350));
          continue;
        }
        if (!isRefresh) {
          this.backendUnavailableUntil = Date.now() + 4_000;
        }
        console.warn('[Agora RTC] Failed to request RTC token:', lastError);
      }
    }

    return {
      token: null,
      appId: '',
      configured: false,
      error: lastError,
    };
  }

  /**
   * Initialize or retrieve the single shared Agora RTC Client
   */
  private getOrCreateClient(): IAgoraRTCClient {
    if (!this.client) {
      this.client = AgoraRTC.createClient({
        mode: 'live',
        codec: 'vp8',
      });

      this.setupClientEvents(this.client);
    }
    return this.client;
  }

  private async handleRemoteSubscribe(
    client: IAgoraRTCClient,
    user: any,
    mediaType: 'audio' | 'video'
  ): Promise<void> {
    if (!user || user.uid === undefined || user.uid === null) return;
    const key = String(user.uid);
    const lockKey = `${key}:${mediaType}`;

    const existingPromise = this.inFlightSubscribes.get(lockKey);
    if (existingPromise) {
      return existingPromise;
    }

    const op = (async () => {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          if (this.client !== client || client.connectionState !== 'CONNECTED') {
            return;
          }
          // Skip redundant subscribe if Agora already attached the track
          const alreadyHasTrack =
            (mediaType === 'audio' && Boolean(user.audioTrack)) ||
            (mediaType === 'video' && Boolean(user.videoTrack));
          if (!alreadyHasTrack) {
            await client.subscribe(user, mediaType);
          }

          let remote = this.remoteHosts.get(key);
          if (!remote) {
            remote = {
              uid: user.uid,
              hasVideo: false,
              hasAudio: false,
              isCameraOn: false,
              isMicMuted: false,
            };
            this.remoteHosts.set(key, remote);
          }

          if (mediaType === 'video') {
            remote.videoTrack = user.videoTrack;
            remote.hasVideo = Boolean(user.videoTrack);
            remote.isCameraOn = Boolean(user.videoTrack);
          }

          if (mediaType === 'audio') {
            remote.audioTrack = user.audioTrack;
            remote.hasAudio = Boolean(user.audioTrack);
            remote.isMicMuted = false;
            if (!this.isSpeakerMuted && user.audioTrack) {
              try {
                const playResult: any = user.audioTrack.play();
                if (playResult && typeof playResult.catch === 'function') {
                  playResult.catch((e: any) => {
                    console.warn('[Agora RTC] Remote audio play promise rejected:', e);
                    this.onAutoplayBlockedCallbacks.forEach((cb) => cb());
                  });
                }
              } catch (e) {
                console.warn('[Agora RTC] Remote audio play blocked:', e);
                this.onAutoplayBlockedCallbacks.forEach((cb) => cb());
              }
            }
          }

          this.notifyRemoteTrackListeners(remote);
          return;
        } catch (err) {
          if (attempt < 2 && this.client === client && client.connectionState === 'CONNECTED') {
            await new Promise((r) => setTimeout(r, 250 * attempt));
            continue;
          }
          console.warn(`[Agora RTC] Subscribe ${mediaType} warning for uid=${user?.uid}:`, err);
        }
      }
    })().finally(() => {
      if (this.inFlightSubscribes.get(lockKey) === op) {
        this.inFlightSubscribes.delete(lockKey);
      }
    });

    this.inFlightSubscribes.set(lockKey, op);
    return op;
  }

  /**
   * Sweep all remote users in the active channel to guarantee every published audio/video track
   * is subscribed and playing (critical for multi-participant rooms and post-reconnect recovery).
   */
  public async syncAllRemoteSubscriptions(): Promise<void> {
    const client = this.client;
    if (!client || client.connectionState !== 'CONNECTED' || !Array.isArray(client.remoteUsers)) {
      return;
    }
    const tasks: Promise<void>[] = [];
    for (const remoteUser of client.remoteUsers) {
      if (remoteUser.hasAudio) {
        tasks.push(this.handleRemoteSubscribe(client, remoteUser, 'audio'));
      }
      if (remoteUser.hasVideo) {
        tasks.push(this.handleRemoteSubscribe(client, remoteUser, 'video'));
      }
    }
    if (tasks.length > 0) {
      await Promise.allSettled(tasks);
    }
    this.resumeRemoteAudio();
  }

  private async renewCurrentToken(client: IAgoraRTCClient): Promise<void> {
    if (this.isRenewingToken || !this.currentChannel || !this.currentUserAccount) return;
    this.isRenewingToken = true;
    try {
      const tokenRes = await this.requestRtcToken(
        this.currentChannel,
        this.currentUserAccount,
        this.currentRole === 'host' ? 'broadcaster' : 'audience',
        true
      );
      if (tokenRes.token && this.client === client) {
        await client.renewToken(tokenRes.token);
        console.log('[Agora RTC] Token renewed cleanly for channel:', this.currentChannel);
      }
    } catch (err) {
      console.warn('[Agora RTC] Token renewal failed:', err);
    } finally {
      this.isRenewingToken = false;
    }
  }

  private setupClientEvents(client: IAgoraRTCClient) {
    // Enable real-time audio volume indicator (local + remote)
    try {
      client.enableAudioVolumeIndicator();
      client.on('volume-indicator', (volumes) => {
        const mapped = volumes.map((v) => ({ uid: v.uid, level: v.level }));
        this.onVolumeCallbacks.forEach((cb) => cb(mapped));
      });
    } catch (e) {
      console.warn('[Agora RTC] Volume indicator setup warning:', e);
    }

    // 1. Remote user published media
    client.on('user-published', async (user, mediaType) => {
      if (mediaType === 'audio' || mediaType === 'video') {
        await this.handleRemoteSubscribe(client, user, mediaType);
      }
    });

    // 2. Remote user unpublished media
    client.on('user-unpublished', (user, mediaType) => {
      const key = String(user.uid);
      const remote = this.remoteHosts.get(key);
      if (remote) {
        if (mediaType === 'video') {
          remote.videoTrack = undefined;
          remote.hasVideo = false;
          remote.isCameraOn = false;
        }
        if (mediaType === 'audio') {
          try {
            remote.audioTrack?.stop();
          } catch {
            // ignore
          }
          remote.audioTrack = undefined;
          remote.hasAudio = false;
          remote.isMicMuted = true;
        }
        this.notifyRemoteTrackListeners(remote);
      }
    });

    // 3. Remote user left channel
    client.on('user-left', (user) => {
      const key = String(user.uid);
      const existing = this.remoteHosts.get(key);
      if (existing?.audioTrack) {
        try {
          existing.audioTrack.stop();
        } catch {
          // ignore
        }
      }
      this.remoteHosts.delete(key);
      this.onUserLeftCallbacks.forEach((cb) => cb(user.uid));
    });

    // 4. Connection state change (resync remote tracks & local audio on reconnect)
    client.on('connection-state-change', (curState, prevState, reason) => {
      console.log(`[Agora RTC] Connection state ${prevState} -> ${curState} (reason: ${reason || 'normal'})`);
      this.notifyStatusListeners({
        state: curState,
        reason,
        isBroadcaster: this.currentRole === 'host',
        channelName: this.currentChannel || '',
        uid: this.currentUid || this.currentUserAccount || '',
      });
      if (curState === 'CONNECTED' && (prevState === 'RECONNECTING' || prevState === 'CONNECTING')) {
        void this.syncAllRemoteSubscriptions();
        if (this.currentRole === 'host' && (!this.isPublishingAudioFlag || !this.localAudioTrack)) {
          void this.ensureLocalAudioPublished(this.isMicMuted);
        }
      }
    });

    // 5. Automatic token renewal before and on expiry (prevents 1-hour disconnects)
    client.on('token-privilege-will-expire', () => {
      void this.renewCurrentToken(client);
    });

    client.on('token-privilege-did-expire', () => {
      void this.renewCurrentToken(client);
    });
  }

  /**
   * Enumerate real device camera inputs (front & back cameras)
   */
  async enumerateVideoDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await AgoraRTC.getCameras();
      this.availableCameras = devices;
      return devices;
    } catch (e) {
      console.warn('[Agora RTC] Failed to enumerate cameras:', e);
      return [];
    }
  }

  /**
   * Host Broadcaster: Initialize physical device camera and microphone tracks safely.
   * CRITICAL: Always clones external MediaStreamTracks so closing Agora tracks NEVER
   * kills the caller's preview or fallback MediaStream!
   */
  async createLocalTracks(options?: {
    isFront?: boolean;
    enableVideo?: boolean;
    enableAudio?: boolean;
    mediaStream?: MediaStream | null;
  }): Promise<{
    videoTrack: ILocalVideoTrack | null;
    audioTrack: ILocalAudioTrack | null;
    hasAudio: boolean;
    hasVideo: boolean;
  }> {
    const facing = options?.isFront ?? this.isFrontCamera;
    this.isFrontCamera = facing;
    const shouldEnableVideo = options?.enableVideo !== false;
    const shouldEnableAudio = options?.enableAudio !== false;

    // 1. AUDIO: Always prefer Agora native createMicrophoneAudioTrack (hardware AEC/ANS/AGC, reliable on Android WebView & Chrome).
    //    Fall back to cloning an external MediaStreamTrack ONLY if native acquisition fails.
    if (shouldEnableAudio) {
      if (this.localAudioTrack) {
        try {
          this.localAudioTrack.stop();
          this.localAudioTrack.close();
        } catch {
          // ignore
        }
        this.localAudioTrack = null;
      }

      try {
        this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: 'speech_standard',
          AEC: true,
          ANS: true,
          AGC: true,
        });
        await this.localAudioTrack.setEnabled(!this.isMicMuted).catch(() => {});
        this.micPermissionDenied = false;
      } catch (nativeErr: any) {
        const liveAudioTrack = options?.mediaStream
          ?.getAudioTracks()
          .find((t) => t.readyState === 'live');
        if (liveAudioTrack) {
          try {
            const clonedAudio = liveAudioTrack.clone();
            clonedAudio.enabled = !this.isMicMuted;
            this.localAudioTrack = AgoraRTC.createCustomAudioTrack({
              mediaStreamTrack: clonedAudio,
            });
            await this.localAudioTrack.setEnabled(!this.isMicMuted).catch(() => {});
            this.micPermissionDenied = false;
          } catch (customErr: any) {
            console.warn('[Agora RTC] Fallback custom audio track failed:', customErr?.message || customErr);
            this.localAudioTrack = null;
            this.micPermissionDenied = true;
          }
        } else {
          console.warn('[Agora RTC] Microphone permission not granted or device unavailable:', nativeErr?.message || nativeErr);
          this.localAudioTrack = null;
          this.micPermissionDenied = true;
        }
      }
    }

    // 2. VIDEO: Reuse cloned live video track from staged hardware camera stream if provided (prevents Android camera lock),
    //    otherwise create native Agora camera track.
    if (shouldEnableVideo) {
      const liveVideoTrack = options?.mediaStream
        ?.getVideoTracks()
        .find((t) => t.readyState === 'live');

      if (liveVideoTrack) {
        try {
          if (this.localVideoTrack) {
            try {
              this.localVideoTrack.stop();
              this.localVideoTrack.close();
            } catch {
              // ignore
            }
            this.localVideoTrack = null;
          }
          const clonedVideo = liveVideoTrack.clone();
          clonedVideo.enabled = this.isCameraOn;
          this.localVideoTrack = AgoraRTC.createCustomVideoTrack({
            mediaStreamTrack: clonedVideo,
          });
          this.cameraPermissionDenied = false;
        } catch (err: any) {
          console.warn('[Agora RTC] Could not create custom video track from stream:', err?.message || err);
        }
      }

      if (!this.localVideoTrack) {
        await this.enumerateVideoDevices();
        try {
          let chosenCameraId: string | undefined;
          if (this.availableCameras.length > 0) {
            const searchTerms = facing ? ['front', 'user', 'face'] : ['back', 'rear', 'environment'];
            const matched = this.availableCameras.find((cam) =>
              searchTerms.some((t) => cam.label.toLowerCase().includes(t))
            );
            if (matched) {
              chosenCameraId = matched.deviceId;
            }
          }

          this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
            cameraId: chosenCameraId,
            facingMode: facing ? 'user' : 'environment',
            encoderConfig: {
              width: 1280,
              height: 720,
              frameRate: 30,
              bitrateMin: 600,
              bitrateMax: 1500,
            },
          });
          this.cameraPermissionDenied = false;
        } catch (err: any) {
          console.warn('[Agora RTC] Camera permission not granted or device unavailable:', err?.message || err);
          this.localVideoTrack = null;
          this.cameraPermissionDenied = true;
        }
      }
    }

    return {
      videoTrack: this.localVideoTrack,
      audioTrack: this.localAudioTrack,
      hasAudio: Boolean(this.localAudioTrack),
      hasVideo: Boolean(this.localVideoTrack),
    };
  }

  /**
   * Join an Agora RTC Channel as Host (Broadcaster) or Viewer (Audience).
   * Serializes against any in-flight leave/join to guarantee single clean engine state.
   */
  async joinChannel(params: {
    appId?: string;
    channelName: string;
    userAccount: string;
    role: 'host' | 'audience';
    token?: string | null;
    enableVideo?: boolean;
    enableAudio?: boolean;
    isFront?: boolean;
    mediaStream?: MediaStream | null;
  }): Promise<UID> {
    // Wait for any in-flight teardown first
    if (this.activeLeavePromise) {
      await this.activeLeavePromise.catch(() => {});
    }

    // If joining a DIFFERENT channel, cleanly leave the previous one first
    if (this.currentChannel && this.currentChannel !== params.channelName) {
      await this.leaveChannel();
    } else if (
      this.currentChannel === params.channelName &&
      this.client &&
      (this.client.connectionState === 'CONNECTED' || this.client.connectionState === 'CONNECTING')
    ) {
      // Already connected/connecting to this exact channel — avoid duplicate join!
      if (this.activeJoinPromise) {
        await this.activeJoinPromise.catch(() => {});
      }
      if (this.currentRole !== params.role) {
        await this.switchRole(params.role, {
          enableVideo: params.enableVideo,
          enableAudio: params.enableAudio,
          isFront: params.isFront,
          mediaStream: params.mediaStream,
          token: params.token,
        });
      }
      return this.currentUid || params.userAccount;
    }

    const client = this.getOrCreateClient();
    this.currentChannel = params.channelName;
    this.currentUserAccount = params.userAccount;
    this.currentRole = params.role;
    this.isCameraOn = params.enableVideo !== false;
    this.isMicMuted = params.enableAudio === false;

    const joinOperation = (async () => {
      let targetAppId = params.appId;
      let targetToken = params.token;

      if (!targetAppId || targetToken === undefined) {
        const tokenRes = await this.requestRtcToken(
          params.channelName,
          params.userAccount,
          params.role === 'host' ? 'broadcaster' : 'audience'
        );
        if (tokenRes.appId) targetAppId = tokenRes.appId;
        if (tokenRes.token !== undefined) targetToken = tokenRes.token;
      }

      if (!targetAppId) {
        const cfg = await this.getAgoraConfig();
        targetAppId = cfg.appId;
      }

      if (!targetAppId) {
        throw new Error('Agora App ID is not configured on the server');
      }

      // Set client role (ultra-low-latency level 1 for live audience!)
      if (params.role === 'audience') {
        await client.setClientRole('audience', { level: 1 });
      } else {
        await client.setClientRole('host');
      }

      // Join channel using permanent Firebase UID as userAccount
      const uid = await client.join(
        targetAppId,
        params.channelName,
        targetToken || null,
        params.userAccount
      );
      this.currentUid = uid;
      console.log(`[Agora RTC] Joined channel=${params.channelName} role=${params.role} uid=${uid}`);

      // Catch up on ALL remote users already publishing before/during join in parallel
      await this.syncAllRemoteSubscriptions();

      // If host/broadcaster, publish local media tracks to the channel
      if (params.role === 'host') {
        await this.createLocalTracks({
          isFront: params.isFront ?? this.isFrontCamera,
          enableVideo: params.enableVideo ?? true,
          enableAudio: params.enableAudio ?? true,
          mediaStream: params.mediaStream,
        });

        const tracksToPublish: (ILocalAudioTrack | ILocalVideoTrack)[] = [];
        if (this.localAudioTrack) tracksToPublish.push(this.localAudioTrack);
        if (this.localVideoTrack && params.enableVideo !== false) tracksToPublish.push(this.localVideoTrack);

        if (tracksToPublish.length > 0 && client.connectionState === 'CONNECTED') {
          try {
            await client.publish(tracksToPublish);
            this.isPublishingAudioFlag = Boolean(this.localAudioTrack);
            this.isPublishingVideoFlag = Boolean(this.localVideoTrack && params.enableVideo !== false);
            if (this.localAudioTrack) {
              await this.localAudioTrack.setEnabled(!this.isMicMuted).catch(() => {});
            }
            console.log('[Agora RTC] Published local tracks:', tracksToPublish.map((t) => t.trackMediaType));
          } catch (pubErr) {
            console.warn('[Agora RTC] Warning publishing local tracks (retrying once):', pubErr);
            await new Promise((r) => setTimeout(r, 300));
            if (client.connectionState === 'CONNECTED') {
              await client.publish(tracksToPublish).then(() => {
                this.isPublishingAudioFlag = Boolean(this.localAudioTrack);
                this.isPublishingVideoFlag = Boolean(this.localVideoTrack && params.enableVideo !== false);
              }).catch((retryErr) => {
                console.warn('[Agora RTC] Retry publish warning:', retryErr);
              });
            }
          }
        }
      }

      return uid;
    })();

    this.activeJoinPromise = joinOperation;

    try {
      const uid = await joinOperation;
      return uid;
    } catch (err) {
      // Clear stale channel marker on failed join so retry can proceed cleanly
      if (this.client?.connectionState !== 'CONNECTED') {
        this.currentChannel = null;
        this.currentUid = null;
      }
      throw err;
    } finally {
      if (this.activeJoinPromise === joinOperation) {
        this.activeJoinPromise = null;
      }
    }
  }

  /**
   * Dynamically switch client role (Host <-> Audience) for Party Live seat actions.
   * Serialized via roleSwitchQueue so rapid seat updates never race or drop audio publishing.
   */
  async switchRole(
    newRole: 'host' | 'audience',
    options?: {
      enableVideo?: boolean;
      enableAudio?: boolean;
      isFront?: boolean;
      mediaStream?: MediaStream | null;
      token?: string | null;
      forceRepublish?: boolean;
    }
  ): Promise<boolean> {
    const runSwitch = async (): Promise<boolean> => {
      if (this.activeJoinPromise) {
        try {
          await this.activeJoinPromise;
        } catch {
          return false;
        }
      }
      if (!this.client || this.client.connectionState !== 'CONNECTED') {
        console.warn('[Agora RTC] switchRole skipped: client not connected');
        return false;
      }

      if (newRole === 'host') {
        const wantAudio = options?.enableAudio !== false;
        // CRITICAL: Reset isMicMuted when promoting from audience -> host so seated speakers are never stuck muted!
        this.isMicMuted = !wantAudio;

        // Avoid destructive teardown if already publishing in the exact same role
        if (
          this.currentRole === 'host' &&
          this.isPublishingAudioFlag &&
          this.localAudioTrack &&
          !options?.forceRepublish
        ) {
          await this.localAudioTrack.setEnabled(!this.isMicMuted).catch(() => {});
          void this.syncAllRemoteSubscriptions();
          return true;
        }
      } else if (
        this.currentRole === 'audience' &&
        !this.localAudioTrack &&
        !this.localVideoTrack
      ) {
        return true;
      }

      try {
        if (newRole === 'host') {
          // Renew token with publisher (broadcaster) privilege BEFORE role switch
          let freshToken = options?.token ?? null;
          if (!freshToken && this.currentChannel && this.currentUserAccount) {
            const tokenRes = await this.requestRtcToken(
              this.currentChannel,
              this.currentUserAccount,
              'broadcaster',
              true
            );
            freshToken = tokenRes.token;
          }
          if (freshToken && this.client) {
            try {
              await this.client.renewToken(freshToken);
            } catch (renewErr) {
              console.warn('[Agora RTC] Token renewal notice before host promotion:', renewErr);
            }
          }

          // Unpublish any old tracks before creating fresh ones
          const oldTracks: (ILocalAudioTrack | ILocalVideoTrack)[] = [];
          if (this.localAudioTrack) oldTracks.push(this.localAudioTrack);
          if (this.localVideoTrack) oldTracks.push(this.localVideoTrack);
          if (oldTracks.length > 0 && this.client) {
            try {
              await this.client.unpublish(oldTracks);
            } catch {
              // ignore
            }
            this.stopLocalTracks();
          }

          this.currentRole = 'host';
          await this.client.setClientRole('host');

          await this.createLocalTracks({
            isFront: options?.isFront ?? this.isFrontCamera,
            enableVideo: options?.enableVideo ?? false,
            enableAudio: true,
            mediaStream: options?.mediaStream ?? null,
          });

          const tracks: (ILocalAudioTrack | ILocalVideoTrack)[] = [];
          if (this.localAudioTrack) tracks.push(this.localAudioTrack);
          if (this.localVideoTrack && options?.enableVideo === true) tracks.push(this.localVideoTrack);

          if (tracks.length > 0 && this.client.connectionState === 'CONNECTED') {
            try {
              await this.client.publish(tracks);
            } catch (pubErr) {
              console.warn('[Agora RTC] First publish attempt failed on switchRole, retrying:', pubErr);
              await new Promise((r) => setTimeout(r, 300));
              if (this.client?.connectionState === 'CONNECTED') {
                await this.client.publish(tracks);
              }
            }
            this.isPublishingAudioFlag = Boolean(this.localAudioTrack);
            this.isPublishingVideoFlag = Boolean(this.localVideoTrack && options?.enableVideo === true);
            if (this.localAudioTrack) {
              await this.localAudioTrack.setEnabled(!this.isMicMuted).catch(() => {});
            }
            console.log('[Agora RTC] Role upgraded to broadcaster, published tracks:', tracks.map((t) => t.trackMediaType));
          }
          // Ensure we are subscribed to all other seated speakers as well
          void this.syncAllRemoteSubscriptions();
          return this.isPublishingAudioFlag;
        } else {
          // Downgrade to Audience: unpublish and stop local tracks
          const tracksToUnpublish: (ILocalAudioTrack | ILocalVideoTrack)[] = [];
          if (this.localAudioTrack) tracksToUnpublish.push(this.localAudioTrack);
          if (this.localVideoTrack) tracksToUnpublish.push(this.localVideoTrack);

          if (tracksToUnpublish.length > 0 && this.client) {
            try {
              await this.client.unpublish(tracksToUnpublish);
            } catch (e) {
              console.warn('[Agora RTC] Unpublish warning on role downgrade:', e);
            }
          }
          this.stopLocalTracks();
          this.currentRole = 'audience';
          await this.client.setClientRole('audience', { level: 1 });
          void this.syncAllRemoteSubscriptions();
          console.log('[Agora RTC] Role downgraded to ultra-low-latency audience');
          return true;
        }
      } catch (err: any) {
        console.warn('[Agora RTC] Error switching role:', err?.message || err);
        return false;
      }
    };

    const next = this.roleSwitchQueue.then(runSwitch, runSwitch);
    this.roleSwitchQueue = next.catch(() => false);
    return next;
  }

  /**
   * Guarantee that an active host/seated speaker has a live published local audio track.
   */
  async ensureLocalAudioPublished(muted: boolean = false): Promise<boolean> {
    this.isMicMuted = muted;
    if (!this.client || this.client.connectionState !== 'CONNECTED') return false;
    if (this.currentRole === 'host' && this.isPublishingAudioFlag && this.localAudioTrack) {
      await this.localAudioTrack.setEnabled(!muted).catch(() => {});
      return true;
    }
    const ok = await this.switchRole('host', {
      enableVideo: this.isPublishingVideoFlag,
      enableAudio: !muted,
      forceRepublish: !this.localAudioTrack || !this.isPublishingAudioFlag,
    });
    if (this.localAudioTrack) {
      await this.localAudioTrack.setEnabled(!muted).catch(() => {});
    }
    return ok;
  }

  /**
   * Play local video track directly inside a DOM container or element
   */
  playLocalVideo(containerOrId: HTMLElement | string): boolean {
    if (!this.localVideoTrack) return false;
    try {
      this.localVideoTrack.play(containerOrId as any, { fit: 'cover', mirror: this.isFrontCamera });
      return true;
    } catch (err) {
      console.warn('[Agora RTC] Error playing local video:', err);
      return false;
    }
  }

  /**
   * Play remote user's video track directly inside a DOM container or element
   */
  playRemoteVideo(uid: UID, containerOrId: HTMLElement | string): boolean {
    const remote = this.remoteHosts.get(String(uid));
    if (!remote?.videoTrack) return false;
    try {
      remote.videoTrack.play(containerOrId as any, { fit: 'cover' });
      return true;
    } catch (err) {
      console.warn('[Agora RTC] Error playing remote video:', err);
      return false;
    }
  }

  /**
   * Flip between front and rear cameras during live stream without interruption
   */
  async flipCamera(): Promise<boolean> {
    if (!this.localVideoTrack) return false;

    await this.enumerateVideoDevices();
    const nextFront = !this.isFrontCamera;
    this.isFrontCamera = nextFront;

    try {
      if (this.availableCameras.length > 1 && 'setDevice' in this.localVideoTrack) {
        this.currentCameraIndex = (this.currentCameraIndex + 1) % this.availableCameras.length;
        const targetDevice = this.availableCameras[this.currentCameraIndex];
        await (this.localVideoTrack as ICameraVideoTrack).setDevice(targetDevice.deviceId);
      } else {
        const newTrack = await AgoraRTC.createCameraVideoTrack({
          facingMode: nextFront ? 'user' : 'environment',
          encoderConfig: { width: 1280, height: 720, frameRate: 30 },
        });

        if (this.client && this.currentRole === 'host' && this.client.connectionState === 'CONNECTED') {
          await this.client.unpublish([this.localVideoTrack]);
          this.localVideoTrack.stop();
          this.localVideoTrack.close();
          this.localVideoTrack = newTrack;
          await this.client.publish([newTrack]);
        } else {
          this.localVideoTrack.stop();
          this.localVideoTrack.close();
          this.localVideoTrack = newTrack;
        }
      }
      return true;
    } catch (err) {
      console.warn('[Agora RTC] Failed to flip camera:', err);
      return false;
    }
  }

  /**
   * Replace published video track from an external MediaStream (e.g. after hardware camera flip/retry)
   */
  async replaceLocalVideoFromStream(mediaStream: MediaStream | null): Promise<boolean> {
    if (!this.client || this.currentRole !== 'host' || this.client.connectionState !== 'CONNECTED') {
      return false;
    }
    const liveVideo = mediaStream?.getVideoTracks().find((t) => t.readyState === 'live');
    if (!liveVideo) return false;

    try {
      const cloned = liveVideo.clone();
      cloned.enabled = this.isCameraOn;
      const nextTrack = AgoraRTC.createCustomVideoTrack({ mediaStreamTrack: cloned });

      if (this.localVideoTrack) {
        await this.client.unpublish([this.localVideoTrack]).catch(() => {});
        try {
          this.localVideoTrack.stop();
          this.localVideoTrack.close();
        } catch {
          // ignore
        }
      }
      this.localVideoTrack = nextTrack;
      if (this.isCameraOn) {
        await this.client.publish([nextTrack]);
        this.isPublishingVideoFlag = true;
      }
      return true;
    } catch (err) {
      console.warn('[Agora RTC] replaceLocalVideoFromStream notice:', err);
      return false;
    }
  }

  /**
   * Toggle camera video ON / OFF while keeping audio broadcast alive
   */
  async setCameraEnabled(enabled: boolean): Promise<void> {
    this.isCameraOn = enabled;
    if (this.localVideoTrack) {
      try {
        await this.localVideoTrack.setEnabled(enabled);
        this.isPublishingVideoFlag = enabled;
      } catch (e) {
        console.warn('[Agora RTC] Error setting camera enabled:', e);
      }
    }
  }

  /**
   * Toggle microphone audio track Muted / Unmuted
   */
  async setMicrophoneMuted(muted: boolean): Promise<void> {
    this.isMicMuted = muted;
    if (this.localAudioTrack) {
      try {
        await this.localAudioTrack.setEnabled(!muted);
      } catch (e) {
        console.warn('[Agora RTC] Error setting microphone muted:', e);
      }
    } else if (!muted && this.currentRole === 'host' && this.client?.connectionState === 'CONNECTED') {
      await this.ensureLocalAudioPublished(false);
    }
  }

  /**
   * Mute or unmute remote audio playback locally (Speaker toggle)
   */
  setSpeakerMuted(muted: boolean): void {
    this.isSpeakerMuted = muted;
    this.remoteHosts.forEach((host) => {
      if (host.audioTrack) {
        if (muted) {
          try {
            host.audioTrack.stop();
          } catch {
            // ignore
          }
        } else {
          try {
            host.audioTrack.play();
          } catch {
            this.onAutoplayBlockedCallbacks.forEach((cb) => cb());
          }
        }
      }
    });
  }

  /**
   * Resume all remote audio tracks after user interaction (unlocks browser autoplay policy)
   */
  resumeRemoteAudio(): void {
    if (this.isSpeakerMuted) return;
    this.remoteHosts.forEach((host) => {
      if (host.audioTrack) {
        try {
          host.audioTrack.play();
        } catch {
          // ignore
        }
      }
    });
  }

  /**
   * Stop local camera and microphone tracks completely (only closes Agora-owned clones/tracks)
   */
  stopLocalTracks() {
    this.isPublishingAudioFlag = false;
    this.isPublishingVideoFlag = false;

    if (this.localVideoTrack) {
      try {
        this.localVideoTrack.stop();
        this.localVideoTrack.close();
      } catch (e) {
        console.warn('[Agora RTC] Error closing video track:', e);
      }
      this.localVideoTrack = null;
    }

    if (this.localAudioTrack) {
      try {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
      } catch (e) {
        console.warn('[Agora RTC] Error closing audio track:', e);
      }
      this.localAudioTrack = null;
    }
  }

  /**
   * Leave Agora RTC channel and release all camera, microphone & network resources cleanly
   */
  async leaveChannel(): Promise<void> {
    if (this.activeLeavePromise) {
      return this.activeLeavePromise;
    }
    this.isLeaving = true;

    const leaveOp = (async () => {
      try {
        if (this.activeJoinPromise) {
          try {
            await this.activeJoinPromise;
          } catch {
            // ignore error from aborted join
          }
          this.activeJoinPromise = null;
        }

        if (this.client) {
          const tracksToUnpublish: (ILocalAudioTrack | ILocalVideoTrack)[] = [];
          if (this.localAudioTrack) tracksToUnpublish.push(this.localAudioTrack);
          if (this.localVideoTrack) tracksToUnpublish.push(this.localVideoTrack);
          if (tracksToUnpublish.length > 0 && this.client.connectionState === 'CONNECTED') {
            await this.client.unpublish(tracksToUnpublish).catch(() => {});
          }
        }

        this.stopLocalTracks();

        if (this.client) {
          const state = this.client.connectionState;
          if (state === 'CONNECTED' || state === 'CONNECTING' || state === 'RECONNECTING') {
            try {
              await this.client.leave();
            } catch (leaveErr: any) {
              console.warn('[Agora RTC] Handled leave exception:', leaveErr?.message || leaveErr);
            }
          }
          try {
            this.client.removeAllListeners();
          } catch {
            // ignore
          }
        }
      } catch (err: any) {
        console.warn('[Agora RTC] Error leaving channel:', err?.message || err);
      } finally {
        this.currentChannel = null;
        this.currentUserAccount = null;
        this.currentUid = null;
        this.currentRole = 'audience';
        this.remoteHosts.clear();
        this.inFlightSubscribes.clear();
        this.client = null;
        this.isLeaving = false;
        this.activeLeavePromise = null;
      }
    })();

    this.activeLeavePromise = leaveOp;
    return leaveOp;
  }

  // Getters
  getConnectionState(): ConnectionState {
    return this.client?.connectionState || 'DISCONNECTED';
  }

  isPublishingAudio(): boolean {
    return this.isPublishingAudioFlag && Boolean(this.localAudioTrack) && !this.isMicMuted;
  }

  isPublishingVideo(): boolean {
    return this.isPublishingVideoFlag && Boolean(this.localVideoTrack) && this.isCameraOn;
  }

  getLocalVideoTrack(): ILocalVideoTrack | null {
    return this.localVideoTrack;
  }

  getLocalAudioTrack(): ILocalAudioTrack | null {
    return this.localAudioTrack;
  }

  getIsFrontCamera(): boolean {
    return this.isFrontCamera;
  }

  getIsCameraOn(): boolean {
    return this.isCameraOn;
  }

  getIsMicMuted(): boolean {
    return this.isMicMuted;
  }

  getIsCameraPermissionDenied(): boolean {
    return this.cameraPermissionDenied;
  }

  getIsMicPermissionDenied(): boolean {
    return this.micPermissionDenied;
  }

  resetPermissionDeniedFlags(): void {
    this.cameraPermissionDenied = false;
    this.micPermissionDenied = false;
  }

  getRemoteHosts(): AgoraRemoteHost[] {
    return Array.from(this.remoteHosts.values());
  }

  getCurrentChannel(): string | null {
    return this.currentChannel;
  }

  getCurrentRole(): 'host' | 'audience' {
    return this.currentRole;
  }

  // Listeners registration
  onRemoteTrack(cb: (host: AgoraRemoteHost) => void): () => void {
    this.onRemoteTrackCallbacks.add(cb);
    this.remoteHosts.forEach((host) => {
      try {
        cb(host);
      } catch {
        // ignore
      }
    });
    return () => this.onRemoteTrackCallbacks.delete(cb);
  }

  onAutoplayBlocked(cb: () => void): () => void {
    this.onAutoplayBlockedCallbacks.add(cb);
    return () => this.onAutoplayBlockedCallbacks.delete(cb);
  }

  onUserLeft(cb: (uid: UID) => void): () => void {
    this.onUserLeftCallbacks.add(cb);
    return () => this.onUserLeftCallbacks.delete(cb);
  }

  onStatusChange(cb: (status: AgoraConnectionStatus) => void): () => void {
    this.onStatusCallbacks.add(cb);
    if (this.client && this.currentChannel) {
      try {
        cb({
          state: this.client.connectionState,
          isBroadcaster: this.currentRole === 'host',
          channelName: this.currentChannel,
          uid: this.currentUid || this.currentUserAccount || '',
        });
      } catch {
        // ignore
      }
    }
    return () => this.onStatusCallbacks.delete(cb);
  }

  onVolumeIndicator(cb: (volumes: AgoraVolumeInfo[]) => void): () => void {
    this.onVolumeCallbacks.add(cb);
    return () => this.onVolumeCallbacks.delete(cb);
  }

  private notifyRemoteTrackListeners(host: AgoraRemoteHost) {
    this.onRemoteTrackCallbacks.forEach((cb) => cb(host));
  }

  private notifyStatusListeners(status: AgoraConnectionStatus) {
    this.onStatusCallbacks.forEach((cb) => cb(status));
  }
}

export const agoraRtcService = new AgoraRtcService();
