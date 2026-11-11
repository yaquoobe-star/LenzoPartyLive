import AgoraRTC, {
  IAgoraRTCClient,
  ILocalVideoTrack,
  ILocalAudioTrack,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
  UID,
  ConnectionState,
} from 'agora-rtc-sdk-ng';
import { UserProfile } from '../types';

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

class AgoraRtcService {
  private client: IAgoraRTCClient | null = null;
  private localAudioTrack: ILocalAudioTrack | null = null;
  private localVideoTrack: ILocalVideoTrack | null = null;

  private currentChannel: string | null = null;
  private currentRole: 'host' | 'audience' = 'audience';
  private currentUid: UID | null = null;
  private isFrontCamera: boolean = true;
  private isCameraOn: boolean = true;
  private isMicMuted: boolean = false;
  private cameraPermissionDenied: boolean = false;
  private micPermissionDenied: boolean = false;
  private availableCameras: MediaDeviceInfo[] = [];
  private currentCameraIndex: number = 0;

  // Track in-flight operations to prevent WebSocket abort collisions
  private activeJoinPromise: Promise<UID> | null = null;
  private isLeaving: boolean = false;

  // Remote streams
  private remoteHosts: Map<UID, AgoraRemoteHost> = new Map();

  // Listeners
  private onRemoteTrackCallbacks: Set<(host: AgoraRemoteHost) => void> = new Set();
  private onUserLeftCallbacks: Set<(uid: UID) => void> = new Set();
  private onStatusCallbacks: Set<(status: AgoraConnectionStatus) => void> = new Set();
  private onVolumeCallbacks: Set<(volumes: AgoraVolumeInfo[]) => void> = new Set();

  constructor() {
    // Configure AgoraRTC client defaults - level 2 = WARNING
    AgoraRTC.setLogLevel(2);

    // Safeguard against Agora internal WS_ABORT and device permission rejections (camera & microphone)
    if (typeof window !== 'undefined') {
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

      // Intercept and handle benign Agora SDK internal teardown & permission messages
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
  async getAgoraConfig(): Promise<{ configured: boolean; appId: string }> {
    try {
      const res = await fetch('/api/agora/config');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed to fetch Agora config:', e);
    }
    return { configured: false, appId: '' };
  }

  /**
   * Fetch secure RTC Token from server-side token generator
   */
  async requestRtcToken(
    channelName: string,
    userAccount: string,
    role: 'broadcaster' | 'audience'
  ): Promise<{ token: string | null; appId: string; configured: boolean; error?: string }> {
    try {
      const res = await fetch('/api/agora/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelName,
          uid: userAccount,
          role,
        }),
      });

      const data = await res.json();
      return data;
    } catch (err: any) {
      console.error('Failed to request Agora RTC token:', err);
      return { token: null, appId: '', configured: false, error: err.message };
    }
  }

  /**
   * Initialize or retrieve the Agora RTC Client
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

  private setupClientEvents(client: IAgoraRTCClient) {
    // Enable audio volume indicators (local and remote)
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
      try {
        await client.subscribe(user, mediaType);

        let remote = this.remoteHosts.get(user.uid);
        if (!remote) {
          remote = {
            uid: user.uid,
            hasVideo: false,
            hasAudio: false,
            isCameraOn: true,
            isMicMuted: false,
          };
          this.remoteHosts.set(user.uid, remote);
        }

        if (mediaType === 'video') {
          remote.videoTrack = user.videoTrack;
          remote.hasVideo = true;
          remote.isCameraOn = true;
        }

        if (mediaType === 'audio') {
          remote.audioTrack = user.audioTrack;
          remote.hasAudio = true;
          remote.isMicMuted = false;
          try {
            user.audioTrack?.play();
          } catch (e) {
            console.warn('[Agora RTC] Audio play warning:', e);
          }
        }

        this.notifyRemoteTrackListeners(remote);
      } catch (err) {
        console.warn('[Agora RTC] Subscribe warning:', err);
      }
    });

    // 2. Remote user unpublished media
    client.on('user-unpublished', (user, mediaType) => {
      const remote = this.remoteHosts.get(user.uid);
      if (remote) {
        if (mediaType === 'video') {
          remote.videoTrack = undefined;
          remote.hasVideo = false;
          remote.isCameraOn = false;
        }
        if (mediaType === 'audio') {
          remote.audioTrack = undefined;
          remote.hasAudio = false;
          remote.isMicMuted = true;
        }
        this.notifyRemoteTrackListeners(remote);
      }
    });

    // 3. Remote user left channel
    client.on('user-left', (user) => {
      this.remoteHosts.delete(user.uid);
      this.onUserLeftCallbacks.forEach((cb) => cb(user.uid));
    });

    // 4. Connection state change
    client.on('connection-state-change', (curState, revState, reason) => {
      this.notifyStatusListeners({
        state: curState,
        reason,
        isBroadcaster: this.currentRole === 'host',
        channelName: this.currentChannel || '',
        uid: this.currentUid || '',
      });
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
      console.warn('Failed to enumerate cameras:', e);
      return [];
    }
  }

  /**
   * Host Broadcaster: Initialize physical device camera and microphone tracks safely
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

    // Fast-path: If real MediaStream already exists (e.g. from mediaDeviceHelper)
    if (options?.mediaStream) {
      const audioTracks = options.mediaStream.getAudioTracks();
      const videoTracks = options.mediaStream.getVideoTracks();

      if (shouldEnableAudio && audioTracks.length > 0 && audioTracks[0].readyState === 'live') {
        try {
          if (this.localAudioTrack) {
            try { this.localAudioTrack.close(); } catch (_) {}
          }
          this.localAudioTrack = AgoraRTC.createCustomAudioTrack({
            mediaStreamTrack: audioTracks[0],
          });
        } catch (err: any) {
          console.warn('[Agora RTC] Could not create custom audio track from stream:', err?.message || err);
        }
      }

      if (shouldEnableVideo && videoTracks.length > 0 && videoTracks[0].readyState === 'live') {
        try {
          if (this.localVideoTrack) {
            try { this.localVideoTrack.close(); } catch (_) {}
          }
          this.localVideoTrack = AgoraRTC.createCustomVideoTrack({
            mediaStreamTrack: videoTracks[0],
          });
        } catch (err: any) {
          console.warn('[Agora RTC] Could not create custom video track from stream:', err?.message || err);
        }
      }

      if (this.localVideoTrack || this.localAudioTrack) {
        return {
          videoTrack: this.localVideoTrack,
          audioTrack: this.localAudioTrack,
          hasAudio: !!this.localAudioTrack,
          hasVideo: !!this.localVideoTrack,
        };
      }
    }

    // Standard device acquisition with safe try/catch for both audio and video
    await this.enumerateVideoDevices();

    // 1. Create real microphone audio track safely without throwing unhandled PERMISSION_DENIED
    if (shouldEnableAudio && !this.localAudioTrack) {
      try {
        this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          AEC: true,
          ANS: true,
          AGC: true,
        });
        this.micPermissionDenied = false;
      } catch (err: any) {
        console.warn('[Agora RTC] Microphone permission not granted or device unavailable:', err?.message || err);
        this.localAudioTrack = null;
        this.micPermissionDenied = true;
      }
    }

    // 2. Create real camera video track safely
    if (shouldEnableVideo && !this.localVideoTrack) {
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

    return {
      videoTrack: this.localVideoTrack,
      audioTrack: this.localAudioTrack,
      hasAudio: !!this.localAudioTrack,
      hasVideo: !!this.localVideoTrack,
    };
  }

  /**
   * Join an Agora RTC Channel as Host (Broadcaster) or Viewer (Audience)
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
    const client = this.getOrCreateClient();
    this.currentChannel = params.channelName;
    this.currentRole = params.role;

    // Track active join promise to avoid racing with leaveChannel
    const joinOperation = (async () => {
      let targetAppId = params.appId;
      let targetToken = params.token;

      // Auto-fetch token and appId if omitted
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

      // Set client role
      await client.setClientRole(params.role);

      // Join channel
      const uid = await client.join(
        targetAppId,
        params.channelName,
        targetToken || null,
        params.userAccount
      );
      this.currentUid = uid;

      // If host, publish local media tracks to the channel
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
            console.log('[Agora RTC] Successfully published local tracks:', tracksToPublish.map((t) => t.trackMediaType));
          } catch (pubErr) {
            console.warn('[Agora RTC] Warning publishing local tracks:', pubErr);
          }
        }
      }

      return uid;
    })();

    this.activeJoinPromise = joinOperation;

    try {
      const uid = await joinOperation;
      return uid;
    } finally {
      if (this.activeJoinPromise === joinOperation) {
        this.activeJoinPromise = null;
      }
    }
  }

  /**
   * Dynamically switch client role (Host <-> Audience) for Party Live seat actions
   */
  async switchRole(
    newRole: 'host' | 'audience',
    options?: { enableVideo?: boolean; enableAudio?: boolean; isFront?: boolean }
  ): Promise<void> {
    if (!this.client || this.client.connectionState !== 'CONNECTED') return;

    try {
      this.currentRole = newRole;
      await this.client.setClientRole(newRole);

      if (newRole === 'host') {
        // Upgrade to Broadcaster: create & publish tracks
        await this.createLocalTracks({
          isFront: options?.isFront ?? this.isFrontCamera,
          enableVideo: options?.enableVideo ?? false,
          enableAudio: options?.enableAudio ?? true,
        });

        const tracks: (ILocalAudioTrack | ILocalVideoTrack)[] = [];
        if (this.localAudioTrack && options?.enableAudio !== false) tracks.push(this.localAudioTrack);
        if (this.localVideoTrack && options?.enableVideo === true) tracks.push(this.localVideoTrack);

        if (tracks.length > 0) {
          await this.client.publish(tracks);
          console.log('[Agora RTC] Dynamic role upgrade: published tracks', tracks.length);
        }
      } else {
        // Downgrade to Audience: unpublish and stop local tracks
        const tracksToUnpublish: (ILocalAudioTrack | ILocalVideoTrack)[] = [];
        if (this.localAudioTrack) tracksToUnpublish.push(this.localAudioTrack);
        if (this.localVideoTrack) tracksToUnpublish.push(this.localVideoTrack);

        if (tracksToUnpublish.length > 0) {
          try {
            await this.client.unpublish(tracksToUnpublish);
          } catch (e) {
            console.warn('[Agora RTC] Unpublish warning on role switch:', e);
          }
        }
        this.stopLocalTracks();
        console.log('[Agora RTC] Dynamic role downgrade: reverted to audience');
      }
    } catch (err: any) {
      console.warn('[Agora RTC] Error switching role:', err?.message || err);
    }
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
    const remote = this.remoteHosts.get(uid);
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
        // Cycle device IDs
        this.currentCameraIndex = (this.currentCameraIndex + 1) % this.availableCameras.length;
        const targetDevice = this.availableCameras[this.currentCameraIndex];
        await (this.localVideoTrack as ICameraVideoTrack).setDevice(targetDevice.deviceId);
      } else {
        // Fallback: re-acquire track with opposite facing mode
        const newTrack = await AgoraRTC.createCameraVideoTrack({
          facingMode: nextFront ? 'user' : 'environment',
          encoderConfig: { width: 1280, height: 720, frameRate: 30 },
        });

        if (this.client && this.currentRole === 'host') {
          await this.client.unpublish([this.localVideoTrack]);
          this.localVideoTrack.close();
          this.localVideoTrack = newTrack;
          await this.client.publish([newTrack]);
        } else {
          this.localVideoTrack.close();
          this.localVideoTrack = newTrack;
        }
      }
      return true;
    } catch (err) {
      console.warn('Failed to flip camera in Agora RTC:', err);
      return false;
    }
  }

  /**
   * Toggle camera video ON / OFF
   */
  async setCameraEnabled(enabled: boolean): Promise<void> {
    this.isCameraOn = enabled;
    if (this.localVideoTrack) {
      try {
        await this.localVideoTrack.setEnabled(enabled);
      } catch (e) {
        console.warn('Error setting camera enabled:', e);
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
        console.warn('Error setting microphone muted:', e);
      }
    }
  }

  /**
   * Mute or unmute remote audio playback locally (Speaker toggle)
   */
  setSpeakerMuted(muted: boolean): void {
    this.remoteHosts.forEach((host) => {
      if (host.audioTrack) {
        if (muted) {
          host.audioTrack.stop();
        } else {
          host.audioTrack.play();
        }
      }
    });
  }

  /**
   * Stop local camera and microphone tracks completely
   */
  stopLocalTracks() {
    if (this.localVideoTrack) {
      try {
        this.localVideoTrack.stop();
        this.localVideoTrack.close();
      } catch (e) {
        console.warn('Error closing video track:', e);
      }
      this.localVideoTrack = null;
    }

    if (this.localAudioTrack) {
      try {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
      } catch (e) {
        console.warn('Error closing audio track:', e);
      }
      this.localAudioTrack = null;
    }
  }

  /**
   * Leave Agora RTC channel and release all camera, microphone & network resources cleanly
   */
  async leaveChannel(): Promise<void> {
    if (this.isLeaving) return;
    this.isLeaving = true;

    try {
      // If a join operation is currently executing, wait for it before leaving to avoid WS_ABORT
      if (this.activeJoinPromise) {
        try {
          await this.activeJoinPromise;
        } catch (_) {
          // ignore error from join
        }
        this.activeJoinPromise = null;
      }

      this.stopLocalTracks();

      if (this.client) {
        const state = this.client.connectionState;
        if (state === 'CONNECTED') {
          try {
            await this.client.leave();
          } catch (leaveErr: any) {
            console.warn('[Agora RTC] Handled leave exception:', leaveErr?.message || leaveErr);
          }
        }
      }
    } catch (err: any) {
      console.warn('[Agora RTC] Error leaving channel:', err?.message || err);
    } finally {
      this.currentChannel = null;
      this.currentUid = null;
      this.remoteHosts.clear();
      this.client = null; // Recreate pristine client next time to prevent aborted socket reuse
      this.isLeaving = false;
    }
  }

  // Getters
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
    return () => this.onRemoteTrackCallbacks.delete(cb);
  }

  onUserLeft(cb: (uid: UID) => void): () => void {
    this.onUserLeftCallbacks.add(cb);
    return () => this.onUserLeftCallbacks.delete(cb);
  }

  onStatusChange(cb: (status: AgoraConnectionStatus) => void): () => void {
    this.onStatusCallbacks.add(cb);
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
