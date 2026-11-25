import { liveAndRoomService } from '../services/liveAndRoomService';
import {
  clearFirestorePartyPeerSignals,
  FirestoreLiveViewerDoc,
  FirestoreRoomParticipantDoc,
  subscribeFirestoreLiveViewerDoc,
  subscribeFirestoreLiveViewers,
  subscribeFirestoreRoomParticipants,
  writeFirestoreLiveHostSignal,
  writeFirestoreLiveViewerSignal,
  writeFirestorePartyPeerSignal,
} from '../services/firestoreRealtimeService';
import { UserProfile } from '../types';
import { apiFetch } from './apiConfig';

export type WebRtcConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';

// Default STUN + Metered OpenRelay TURN servers for 4G/5G symmetric carrier NAT traversal
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.relay.metered.ca:80' },
  {
    urls: [
      'turn:global.relay.metered.ca:80',
      'turn:global.relay.metered.ca:80?transport=tcp',
      'turn:global.relay.metered.ca:443',
      'turns:global.relay.metered.ca:443?transport=tcp',
    ],
    username: 'e8dd65b92f6dde43c1b02764',
    credential: 'uWdWNmkhvyqTWjsm',
  },
];

interface LiveViewerCallbacks {
  onRemoteStream: (stream: MediaStream) => void;
  onStatusChange?: (status: WebRtcConnectionStatus) => void;
  onAutoplayBlocked?: () => void;
}

interface PartyVoiceCallbacks {
  onRemoteSpeakersChange?: (speakerIds: string[]) => void;
  onRemoteVolume?: (peerId: string, level: number) => void;
  onStatusChange?: (status: WebRtcConnectionStatus) => void;
  onAutoplayBlocked?: () => void;
}

function makeSessionId(prefix = 'rtc'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function iceKey(c: RTCIceCandidateInit): string {
  return `${c.candidate || ''}|${c.sdpMid || ''}|${c.sdpMLineIndex ?? ''}`;
}

/**
 * Dual-Transport Real-Time WebRTC Media Engine:
 * - Primary signaling over Lenzo WebSocket (/ws)
 * - Automatic parallel failover over Cloud Firestore subcollections
 *   (works 24/7 even if the Railway HTTP/WS backend is down/502)
 * - Full STUN + TURN relay configuration for real mobile 4G/5G CGNAT devices
 */
class WebRtcMediaService {
  // Cached ICE configuration (refreshed from /api/rtc/ice-servers when available)
  private cachedIceServers: RTCIceServer[] = DEFAULT_ICE_SERVERS;
  private iceFetchAttempted = false;

  // --- LIVE STREAM STATE ---
  private liveMode: 'idle' | 'host' | 'viewer' = 'idle';
  private liveStreamId: string | null = null;
  private liveUserId: string | null = null;
  private liveHostUserId: string | null = null;
  private liveViewerUser: UserProfile | null = null;
  private liveLocalStream: MediaStream | null = null;
  private liveHostPeers = new Map<string, RTCPeerConnection>();
  private liveHostPendingIce = new Map<string, RTCIceCandidateInit[]>();
  private liveHostSeenViewerIce = new Map<string, Set<string>>();
  private liveHostOutboundIce = new Map<string, RTCIceCandidateInit[]>();
  private liveHostIceFlushTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private liveHostAnsweredSessions = new Map<string, string>();
  private liveHostOfferedSessions = new Map<string, string>();
  private liveWaitingViewers = new Set<string>();

  private liveViewerPc: RTCPeerConnection | null = null;
  private liveViewerPendingIce: RTCIceCandidateInit[] = [];
  private liveViewerSeenHostIce = new Set<string>();
  private liveViewerOutboundIce: RTCIceCandidateInit[] = [];
  private liveViewerIceFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private liveViewerSessionId: string = '';
  private liveViewerHandledOfferSession: string = '';
  private liveViewerRemoteStream: MediaStream | null = null;
  private liveViewerCallbacks: LiveViewerCallbacks | null = null;
  private liveViewerRetryTimer: ReturnType<typeof setInterval> | null = null;
  private liveViewerRetryCount = 0;
  private liveStartedAt = 0;
  private liveViewerLastOfferAt = 0;

  private liveUnsubscribeWs: (() => void) | null = null;
  private liveUnsubscribeFs: (() => void) | null = null;

  // --- PARTY ROOM VOICE STATE ---
  private partyRoomId: string | null = null;
  private partyUserId: string | null = null;
  private partyIsSpeaker = false;
  private partyStartedAt = 0;
  private partySessionGen = 0;
  private partyLocalStream: MediaStream | null = null;
  private partyKnownPeers = new Map<string, { isSpeaker: boolean }>();
  private partyPendingOfferPeers = new Set<string>();
  private partyPeers = new Map<string, RTCPeerConnection>();
  private partyPendingIce = new Map<string, RTCIceCandidateInit[]>();
  private partySeenRemoteIce = new Map<string, Set<string>>();
  private partyOutboundIce = new Map<string, RTCIceCandidateInit[]>();
  private partyOutboundSdp = new Map<string, RTCSessionDescriptionInit>();
  private partyIceFlushTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private partyHandledOfferSessions = new Map<string, string>();
  private partyHandledAnswerSessions = new Map<string, string>();
  private partyPeerSessions = new Map<string, string>();
  private partyRemoteAudioEls = new Map<string, HTMLAudioElement>();
  private sharedPartyAudioCtx: AudioContext | null = null;
  private partyRemoteAnalysers = new Map<
    string,
    { source: MediaStreamAudioSourceNode; analyser: AnalyserNode; data: Uint8Array<ArrayBuffer> }
  >();
  private partyVolumeTimer: ReturnType<typeof setInterval> | null = null;
  private partySpeakerMuted = false;
  private partyMicMuted = false;
  private partyMusicTrack: MediaStreamTrack | null = null;
  private partyMusicVolume = 0.65;
  private partyMixerCtx: AudioContext | null = null;
  private partyMixerMicGain: GainNode | null = null;
  private partyMixerMusicGain: GainNode | null = null;
  private partyMixedStream: MediaStream | null = null;
  private partyCallbacks: PartyVoiceCallbacks | null = null;
  private partyUnsubscribeWs: (() => void) | null = null;
  private partyUnsubscribeFs: (() => void) | null = null;
  private partyPresenceTimer: ReturnType<typeof setInterval> | null = null;
  private partyQuickPresenceTimer: ReturnType<typeof setTimeout> | null = null;

  private getRtcConfig(): RTCConfiguration {
    return {
      iceServers: this.cachedIceServers,
      iceCandidatePoolSize: 8,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    };
  }

  private async refreshIceServers(): Promise<void> {
    if (this.iceFetchAttempted) return;
    this.iceFetchAttempted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    try {
      const res = await apiFetch('/api/rtc/ice-servers', { signal: controller.signal });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
          this.cachedIceServers = data.iceServers;
        }
      }
    } catch {
      // Keep default STUN + OpenRelay TURN servers
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private hasLiveMediaTracks(stream: MediaStream | null): boolean {
    if (!stream) return false;
    return stream.getTracks().some((t) => t.readyState === 'live');
  }

  // ============================================================================
  // 1. LIVE STREAMING: HOST PUBLISHER (1-to-Many over WS + Firestore Failover)
  // ============================================================================

  public isLiveHostActive(streamId?: string): boolean {
    if (this.liveMode !== 'host') return false;
    return streamId ? this.liveStreamId === streamId : Boolean(this.liveStreamId);
  }

  public isLiveViewerActive(streamId?: string): boolean {
    if (this.liveMode !== 'viewer') return false;
    return streamId ? this.liveStreamId === streamId : Boolean(this.liveStreamId);
  }

  public startLiveHost(streamId: string, hostUserId: string, localStream: MediaStream | null) {
    this.stopLive();
    if (typeof RTCPeerConnection === 'undefined') return;

    void this.refreshIceServers();

    this.liveMode = 'host';
    this.liveStreamId = streamId;
    this.liveUserId = hostUserId;
    this.liveHostUserId = hostUserId;
    this.liveLocalStream = localStream;
    this.liveStartedAt = Date.now();

    // 1. WebSocket signaling listener
    this.liveUnsubscribeWs = liveAndRoomService.addEventListener((event, payload) => {
      if (this.liveMode !== 'host' || !payload || payload.streamId !== this.liveStreamId) return;
      const fromUserId = String(payload.fromUserId || '');
      if (!fromUserId || fromUserId === this.liveUserId) return;

      if (event === 'webrtc:viewer_ready') {
        const sessionId = String(payload.sessionId || makeSessionId('ws'));
        void this.handleViewerReadyOnHost(fromUserId, sessionId);
      } else if (event === 'webrtc:answer' && payload.sdp) {
        void this.handleLiveHostAnswer(fromUserId, payload.sdp, payload.sessionId);
      } else if (event === 'webrtc:ice' && payload.candidate) {
        void this.handleLiveHostIce(fromUserId, payload.candidate);
      } else if (event === 'webrtc:peer_left') {
        this.liveWaitingViewers.delete(fromUserId);
        this.closeLiveHostPeer(fromUserId);
      }
    });

    // 2. Cloud Firestore failover signaling listener (monitors live_streams/{streamId}/viewers/*)
    this.liveUnsubscribeFs = subscribeFirestoreLiveViewers(streamId, (_viewers, rawDocs) => {
      if (this.liveMode !== 'host' || this.liveStreamId !== streamId) return;

      const activeIds = new Set<string>();
      rawDocs.forEach((vDoc: FirestoreLiveViewerDoc, docId: string) => {
        const viewerId = String(vDoc.userId || docId);
        if (!viewerId || viewerId === this.liveUserId || vDoc.isHost) return;
        activeIds.add(viewerId);

        const reqSession = vDoc.rtcSessionId || '';
        const offeredSession = this.liveHostOfferedSessions.get(viewerId) || '';
        const existingPc = this.liveHostPeers.get(viewerId);
        const existingHealthy = Boolean(
          existingPc &&
            (existingPc.connectionState === 'connected' ||
              existingPc.iceConnectionState === 'connected' ||
              existingPc.iceConnectionState === 'completed')
        );

        // New viewer ready request or viewer explicitly refreshed session (never disturb healthy connected peer)
        if (reqSession && reqSession !== offeredSession && !existingHealthy) {
          void this.handleViewerReadyOnHost(viewerId, reqSession);
        } else if (!reqSession && !existingPc && !this.liveWaitingViewers.has(viewerId)) {
          // Viewer joined Firestore viewers subcollection even before writing rtcSessionId
          void this.handleViewerReadyOnHost(viewerId, makeSessionId('fs_auto'));
        }

        // Apply viewer's SDP answer ONLY if it matches our active offered session
        const activeOffered = this.liveHostOfferedSessions.get(viewerId);
        if (
          vDoc.rtcAnswer &&
          vDoc.rtcAnswer.sdp &&
          activeOffered &&
          (!vDoc.rtcAnswerSessionId || vDoc.rtcAnswerSessionId === activeOffered)
        ) {
          const ansKey = vDoc.rtcAnswerSessionId || activeOffered;
          if (this.liveHostAnsweredSessions.get(viewerId) !== ansKey) {
            void this.handleLiveHostAnswer(viewerId, vDoc.rtcAnswer, ansKey);
          }
        }

        // Apply viewer ICE candidates from Firestore
        if (Array.isArray(vDoc.rtcViewerIce) && vDoc.rtcViewerIce.length > 0) {
          for (const cand of vDoc.rtcViewerIce) {
            void this.handleLiveHostIce(viewerId, cand);
          }
        }
      });

      // Clean up disconnected peers whose Firestore viewer doc disappeared only if PC is closed/failed
      Array.from(this.liveHostPeers.keys()).forEach((peerId) => {
        const pc = this.liveHostPeers.get(peerId);
        if (!activeIds.has(peerId) && pc && (pc.connectionState === 'disconnected' || pc.connectionState === 'failed')) {
          this.closeLiveHostPeer(peerId);
        }
      });
    });

    // Broadcast host_ready over WebSocket
    liveAndRoomService.sendSignal({
      signalType: 'webrtc:host_ready',
      fromUserId: hostUserId,
      streamId,
      payload: { hasStream: this.hasLiveMediaTracks(localStream) },
    });
  }

  private async handleViewerReadyOnHost(viewerId: string, sessionId: string) {
    if (this.liveMode !== 'host' || !viewerId || viewerId === this.liveUserId) return;

    // Do NOT send an empty/black fake transceiver while Host camera/mic is still initializing!
    if (!this.hasLiveMediaTracks(this.liveLocalStream)) {
      this.liveWaitingViewers.add(viewerId);
      return;
    }

    this.liveWaitingViewers.delete(viewerId);
    await this.createLiveHostOffer(viewerId, sessionId);
  }

  public sendOfferToViewer(viewerId: string) {
    if (this.liveMode !== 'host' || !viewerId || viewerId === this.liveUserId) return;
    const existing = this.liveHostPeers.get(viewerId);
    if (existing && (existing.connectionState === 'connected' || existing.connectionState === 'connecting')) {
      return;
    }
    void this.handleViewerReadyOnHost(viewerId, makeSessionId('host_push'));
  }

  public updateLiveHostStream(newStream: MediaStream | null) {
    if (this.liveMode !== 'host') return;
    this.liveLocalStream = newStream;

    if (!this.hasLiveMediaTracks(newStream)) {
      return;
    }

    const newVideoTrack = newStream?.getVideoTracks().find((t) => t.readyState === 'live') || null;
    const newAudioTrack = newStream?.getAudioTracks().find((t) => t.readyState === 'live') || null;

    // 1. Update or renegotiate existing viewer peers
    this.liveHostPeers.forEach((pc, viewerId) => {
      const transceivers = pc.getTransceivers();
      const videoSender =
        pc.getSenders().find((s) => s.track?.kind === 'video') ||
        transceivers.find((t) => t.receiver.track?.kind === 'video')?.sender;
      const audioSender =
        pc.getSenders().find((s) => s.track?.kind === 'audio') ||
        transceivers.find((t) => t.receiver.track?.kind === 'audio')?.sender;

      let needsRenegotiate = false;

      if (newVideoTrack) {
        if (videoSender) {
          videoSender.replaceTrack(newVideoTrack).catch(() => {
            void this.createLiveHostOffer(viewerId, makeSessionId('reneg'));
          });
        } else {
          needsRenegotiate = true;
        }
      }

      if (newAudioTrack) {
        if (audioSender) {
          audioSender.replaceTrack(newAudioTrack).catch(() => {
            void this.createLiveHostOffer(viewerId, makeSessionId('reneg'));
          });
        } else {
          needsRenegotiate = true;
        }
      }

      if (needsRenegotiate || (!videoSender && !audioSender)) {
        void this.createLiveHostOffer(viewerId, makeSessionId('reneg'));
      }
    });

    // 2. Immediately push real offers to any viewers who arrived while camera/mic was still warming up
    if (this.liveWaitingViewers.size > 0) {
      const queued = Array.from(this.liveWaitingViewers);
      this.liveWaitingViewers.clear();
      queued.forEach((viewerId) => {
        void this.createLiveHostOffer(viewerId, makeSessionId('ready_push'));
      });
    }

    if (this.liveStreamId && this.liveUserId) {
      liveAndRoomService.sendSignal({
        signalType: 'webrtc:host_ready',
        fromUserId: this.liveUserId,
        streamId: this.liveStreamId,
        payload: { hasStream: true },
      });
    }
  }

  private scheduleHostIceFlush(viewerId: string, offerSessionId: string) {
    if (this.liveHostIceFlushTimers.has(viewerId)) return;
    const timer = setTimeout(() => {
      this.liveHostIceFlushTimers.delete(viewerId);
      if (this.liveMode !== 'host' || !this.liveStreamId) return;
      if (this.liveHostOfferedSessions.get(viewerId) !== offerSessionId) return;
      const batch = this.liveHostOutboundIce.get(viewerId);
      if (!batch || batch.length === 0) return;
      void writeFirestoreLiveHostSignal(this.liveStreamId, viewerId, {
        rtcOfferSessionId: offerSessionId,
        rtcHostIce: batch.slice(0, 32),
      });
    }, 260);
    this.liveHostIceFlushTimers.set(viewerId, timer);
  }

  private async createLiveHostOffer(viewerId: string, offerSessionId: string) {
    if (!this.liveStreamId || !this.liveUserId || !this.hasLiveMediaTracks(this.liveLocalStream)) {
      this.liveWaitingViewers.add(viewerId);
      return;
    }

    this.closeLiveHostPeer(viewerId);
    this.liveHostOfferedSessions.set(viewerId, offerSessionId);
    this.liveHostAnsweredSessions.delete(viewerId);
    this.liveHostOutboundIce.set(viewerId, []);
    this.liveHostSeenViewerIce.set(viewerId, new Set());

    const pc = new RTCPeerConnection(this.getRtcConfig());
    this.liveHostPeers.set(viewerId, pc);
    this.liveHostPendingIce.set(viewerId, []);

    const stream = this.liveLocalStream!;
    stream.getTracks().forEach((track) => {
      if (track.readyState === 'live') {
        pc.addTrack(track, stream);
      }
    });

    pc.onicecandidate = (ev) => {
      if (ev.candidate && this.liveStreamId && this.liveUserId) {
        const candJson = ev.candidate.toJSON();
        // Send immediately over WebSocket
        liveAndRoomService.sendSignal({
          signalType: 'webrtc:ice',
          fromUserId: this.liveUserId,
          targetUserId: viewerId,
          streamId: this.liveStreamId,
          payload: { candidate: candJson, sessionId: offerSessionId },
        });
        // Also batch into Firestore viewer doc for guaranteed delivery if WS is down
        const out = this.liveHostOutboundIce.get(viewerId) || [];
        out.push(candJson);
        this.liveHostOutboundIce.set(viewerId, out);
        this.scheduleHostIceFlush(viewerId, offerSessionId);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closeLiveHostPeer(viewerId);
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const localSdp: RTCSessionDescriptionInit = {
        type: pc.localDescription?.type || offer.type,
        sdp: pc.localDescription?.sdp || offer.sdp,
      };

      // Transport 1: WebSocket
      liveAndRoomService.sendSignal({
        signalType: 'webrtc:offer',
        fromUserId: this.liveUserId,
        targetUserId: viewerId,
        streamId: this.liveStreamId,
        payload: { sdp: localSdp, sessionId: offerSessionId },
      });

      // Transport 2: Cloud Firestore failover
      void writeFirestoreLiveHostSignal(this.liveStreamId, viewerId, {
        rtcOffer: localSdp,
        rtcOfferSessionId: offerSessionId,
        rtcHostIce: [],
        rtcHostCameraOn: stream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled),
      });
    } catch (err) {
      console.warn('[WebRTC Live Host] Offer creation error:', err);
      this.closeLiveHostPeer(viewerId);
    }
  }

  private async handleLiveHostAnswer(
    viewerId: string,
    sdp: RTCSessionDescriptionInit,
    sessionKey?: string
  ) {
    const pc = this.liveHostPeers.get(viewerId);
    if (!pc) return;
    const expectedSession = this.liveHostOfferedSessions.get(viewerId);
    if (sessionKey && expectedSession && sessionKey !== expectedSession) {
      return;
    }
    try {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        if (sessionKey) {
          this.liveHostAnsweredSessions.set(viewerId, sessionKey);
        }
        const queued = this.liveHostPendingIce.get(viewerId) || [];
        this.liveHostPendingIce.set(viewerId, []);
        for (const cand of queued) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[WebRTC Live Host] Answer error:', err);
    }
  }

  private async handleLiveHostIce(viewerId: string, candidate: RTCIceCandidateInit) {
    const pc = this.liveHostPeers.get(viewerId);
    if (!pc || !candidate?.candidate) return;

    const seen = this.liveHostSeenViewerIce.get(viewerId) || new Set<string>();
    const key = iceKey(candidate);
    if (seen.has(key)) return;
    seen.add(key);
    this.liveHostSeenViewerIce.set(viewerId, seen);

    if (pc.remoteDescription && pc.remoteDescription.type) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    } else {
      const list = this.liveHostPendingIce.get(viewerId) || [];
      list.push(candidate);
      this.liveHostPendingIce.set(viewerId, list);
    }
  }

  private closeLiveHostPeer(viewerId: string) {
    const timer = this.liveHostIceFlushTimers.get(viewerId);
    if (timer) {
      clearTimeout(timer);
      this.liveHostIceFlushTimers.delete(viewerId);
    }
    const pc = this.liveHostPeers.get(viewerId);
    if (pc) {
      try {
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        pc.close();
      } catch {
        // ignore
      }
      this.liveHostPeers.delete(viewerId);
    }
    this.liveHostPendingIce.delete(viewerId);
    this.liveHostOutboundIce.delete(viewerId);
    this.liveHostSeenViewerIce.delete(viewerId);
  }

  // ============================================================================
  // 2. LIVE STREAMING: VIEWER SUBSCRIBER (over WS + Firestore Failover)
  // ============================================================================

  public startLiveViewer(
    streamId: string,
    viewerUserId: string,
    hostUserId: string,
    callbacks: LiveViewerCallbacks,
    viewerUser?: UserProfile
  ) {
    this.stopLive();
    if (typeof RTCPeerConnection === 'undefined') {
      callbacks.onStatusChange?.('failed');
      return;
    }

    void this.refreshIceServers();

    this.liveMode = 'viewer';
    this.liveStreamId = streamId;
    this.liveUserId = viewerUserId;
    this.liveHostUserId = hostUserId;
    this.liveViewerUser = viewerUser || null;
    this.liveViewerCallbacks = callbacks;
    this.liveViewerRetryCount = 0;
    this.liveViewerSessionId = makeSessionId('vw');
    this.liveViewerHandledOfferSession = '';
    this.liveStartedAt = Date.now();
    this.liveViewerLastOfferAt = 0;

    callbacks.onStatusChange?.('connecting');

    // 1. WebSocket signaling listener
    this.liveUnsubscribeWs = liveAndRoomService.addEventListener((event, payload) => {
      if (this.liveMode !== 'viewer' || !payload || payload.streamId !== this.liveStreamId) return;
      const fromUserId = String(payload.fromUserId || '');
      if (!fromUserId || fromUserId === this.liveUserId) return;

      if (event === 'webrtc:host_ready') {
        const isConnected = Boolean(
          this.liveViewerPc &&
            (this.liveViewerPc.connectionState === 'connected' ||
              this.liveViewerPc.iceConnectionState === 'connected' ||
              this.liveViewerPc.iceConnectionState === 'completed')
        );
        if (!isConnected) {
          this.requestOfferFromHost();
        }
      } else if (event === 'webrtc:offer' && payload.sdp) {
        const offerSession = String(payload.sessionId || `ws_${Date.now()}`);
        void this.handleLiveViewerOffer(fromUserId, payload.sdp, offerSession);
      } else if (event === 'webrtc:ice' && payload.candidate) {
        void this.handleLiveViewerIce(payload.candidate);
      }
    });

    // 2. Cloud Firestore failover listener on live_streams/{streamId}/viewers/{viewerUserId}
    this.liveUnsubscribeFs = subscribeFirestoreLiveViewerDoc(streamId, viewerUserId, (vDoc) => {
      if (this.liveMode !== 'viewer' || this.liveStreamId !== streamId || !vDoc) return;

      // Ignore stale pre-session offers left over from a previous viewing session
      if (vDoc.rtcHostUpdatedAt && vDoc.rtcHostUpdatedAt < this.liveStartedAt - 15000) {
        return;
      }

      const offerSession = vDoc.rtcOfferSessionId || '';
      if (
        vDoc.rtcOffer &&
        vDoc.rtcOffer.sdp &&
        offerSession &&
        offerSession !== this.liveViewerHandledOfferSession
      ) {
        void this.handleLiveViewerOffer(hostUserId, vDoc.rtcOffer, offerSession);
      }

      if (Array.isArray(vDoc.rtcHostIce) && vDoc.rtcHostIce.length > 0) {
        for (const cand of vDoc.rtcHostIce) {
          void this.handleLiveViewerIce(cand);
        }
      }
    });

    this.requestOfferFromHost();

    // Gentle recovery timer: NEVER kills an actively connecting ICE/TURN handshake!
    this.liveViewerRetryTimer = setInterval(() => {
      if (this.liveMode !== 'viewer') {
        this.clearLiveViewerRetry();
        return;
      }
      const pc = this.liveViewerPc;
      if (
        pc &&
        (pc.connectionState === 'connected' ||
          pc.iceConnectionState === 'connected' ||
          pc.iceConnectionState === 'completed')
      ) {
        this.clearLiveViewerRetry();
        return;
      }
      // If we recently received an offer and ICE is actively checking/connecting, give mobile TURN up to 10s!
      if (
        pc &&
        (pc.connectionState === 'connecting' || pc.iceConnectionState === 'checking') &&
        Date.now() - this.liveViewerLastOfferAt < 10000
      ) {
        return;
      }
      this.liveViewerRetryCount += 1;
      if (this.liveViewerRetryCount > 10) {
        this.clearLiveViewerRetry();
        return;
      }
      this.requestOfferFromHost();
    }, 5000);
  }

  public requestOfferFromHost() {
    if (this.liveMode !== 'viewer' || !this.liveStreamId || !this.liveUserId) return;
    // Generate a fresh sessionId so Host's Firestore onSnapshot triggers even on manual Reconnect
    this.liveViewerSessionId = makeSessionId('vw');
    this.liveViewerHandledOfferSession = '';
    this.liveViewerLastOfferAt = 0;

    // Transport 1: WebSocket
    liveAndRoomService.sendSignal({
      signalType: 'webrtc:viewer_ready',
      fromUserId: this.liveUserId,
      targetUserId: this.liveHostUserId || undefined,
      streamId: this.liveStreamId,
      payload: { ready: true, sessionId: this.liveViewerSessionId },
    });

    // Transport 2: Cloud Firestore failover
    void writeFirestoreLiveViewerSignal(this.liveStreamId, this.liveViewerUser, {
      rtcSessionId: this.liveViewerSessionId,
      rtcReadyAt: Date.now(),
      rtcAnswer: null,
      rtcAnswerSessionId: '',
      rtcViewerIce: [],
    });
  }

  private scheduleViewerIceFlush(answerSessionId: string) {
    if (this.liveViewerIceFlushTimer) return;
    this.liveViewerIceFlushTimer = setTimeout(() => {
      this.liveViewerIceFlushTimer = null;
      if (this.liveMode !== 'viewer' || !this.liveStreamId) return;
      if (this.liveViewerOutboundIce.length === 0) return;
      void writeFirestoreLiveViewerSignal(this.liveStreamId, this.liveViewerUser, {
        rtcAnswerSessionId: answerSessionId,
        rtcViewerIce: this.liveViewerOutboundIce.slice(0, 32),
      });
    }, 260);
  }

  private async handleLiveViewerOffer(
    hostId: string,
    sdp: RTCSessionDescriptionInit,
    offerSessionId: string
  ) {
    if (!this.liveStreamId || !this.liveUserId) return;
    if (offerSessionId && this.liveViewerHandledOfferSession === offerSessionId) return;
    this.liveViewerHandledOfferSession = offerSessionId;
    this.liveViewerLastOfferAt = Date.now();

    if (this.liveViewerIceFlushTimer) {
      clearTimeout(this.liveViewerIceFlushTimer);
      this.liveViewerIceFlushTimer = null;
    }
    if (this.liveViewerPc) {
      try {
        this.liveViewerPc.onicecandidate = null;
        this.liveViewerPc.ontrack = null;
        this.liveViewerPc.onconnectionstatechange = null;
        this.liveViewerPc.oniceconnectionstatechange = null;
        this.liveViewerPc.close();
      } catch {
        // ignore
      }
      this.liveViewerPc = null;
    }

    const pc = new RTCPeerConnection(this.getRtcConfig());
    this.liveViewerPc = pc;
    this.liveViewerPendingIce = [];
    this.liveViewerSeenHostIce = new Set();
    this.liveViewerOutboundIce = [];
    const remoteStream = new MediaStream();
    this.liveViewerRemoteStream = remoteStream;

    const emitRemoteSnapshot = () => {
      pc.getReceivers().forEach((r) => {
        if (r.track && r.track.readyState === 'live' && !remoteStream.getTracks().some((t) => t.id === r.track.id)) {
          remoteStream.addTrack(r.track);
        }
      });
      if (remoteStream.getTracks().some((t) => t.readyState === 'live')) {
        const snapshotStream = new MediaStream(remoteStream.getTracks());
        this.liveViewerCallbacks?.onRemoteStream(snapshotStream);
        this.liveViewerCallbacks?.onStatusChange?.('connected');
        this.clearLiveViewerRetry();
      }
    };

    pc.ontrack = (ev) => {
      if (ev.track && ev.track.readyState !== 'ended') {
        const alreadyHas = remoteStream.getTracks().some((t) => t.id === ev.track.id);
        if (!alreadyHas) {
          remoteStream.addTrack(ev.track);
        }
      }
      if (ev.streams && ev.streams[0]) {
        ev.streams[0].getTracks().forEach((t) => {
          if (t.readyState !== 'ended' && !remoteStream.getTracks().some((x) => x.id === t.id)) {
            remoteStream.addTrack(t);
          }
        });
      }
      emitRemoteSnapshot();
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate && this.liveStreamId && this.liveUserId) {
        const candJson = ev.candidate.toJSON();
        liveAndRoomService.sendSignal({
          signalType: 'webrtc:ice',
          fromUserId: this.liveUserId,
          targetUserId: hostId,
          streamId: this.liveStreamId,
          payload: { candidate: candJson, sessionId: offerSessionId },
        });
        this.liveViewerOutboundIce.push(candJson);
        this.scheduleViewerIceFlush(offerSessionId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      if (iceState === 'connected' || iceState === 'completed') {
        emitRemoteSnapshot();
      } else if (iceState === 'failed') {
        this.liveViewerCallbacks?.onStatusChange?.('failed');
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        emitRemoteSnapshot();
      } else if (state === 'connecting') {
        this.liveViewerCallbacks?.onStatusChange?.('connecting');
      } else if (state === 'disconnected') {
        this.liveViewerCallbacks?.onStatusChange?.('reconnecting');
      } else if (state === 'failed') {
        this.liveViewerCallbacks?.onStatusChange?.('failed');
      }
    };

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      for (const cand of this.liveViewerPendingIce) {
        await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
      }
      this.liveViewerPendingIce = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const localAnswer: RTCSessionDescriptionInit = {
        type: pc.localDescription?.type || answer.type,
        sdp: pc.localDescription?.sdp || answer.sdp,
      };

      // Transport 1: WebSocket
      liveAndRoomService.sendSignal({
        signalType: 'webrtc:answer',
        fromUserId: this.liveUserId,
        targetUserId: hostId,
        streamId: this.liveStreamId,
        payload: { sdp: localAnswer, sessionId: offerSessionId },
      });

      // Transport 2: Cloud Firestore failover
      void writeFirestoreLiveViewerSignal(this.liveStreamId, this.liveViewerUser, {
        rtcAnswer: localAnswer,
        rtcAnswerSessionId: offerSessionId,
      });
    } catch (err) {
      console.warn('[WebRTC Live Viewer] Answer error:', err);
      this.liveViewerCallbacks?.onStatusChange?.('failed');
    }
  }

  private async handleLiveViewerIce(candidate: RTCIceCandidateInit) {
    if (!candidate?.candidate) return;
    const key = iceKey(candidate);
    if (this.liveViewerSeenHostIce.has(key)) return;
    this.liveViewerSeenHostIce.add(key);

    if (this.liveViewerPc && this.liveViewerPc.remoteDescription?.type) {
      await this.liveViewerPc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    } else {
      this.liveViewerPendingIce.push(candidate);
    }
  }

  private clearLiveViewerRetry() {
    if (this.liveViewerRetryTimer) {
      clearInterval(this.liveViewerRetryTimer);
      this.liveViewerRetryTimer = null;
    }
  }

  public stopLive() {
    this.clearLiveViewerRetry();
    if (this.liveViewerIceFlushTimer) {
      clearTimeout(this.liveViewerIceFlushTimer);
      this.liveViewerIceFlushTimer = null;
    }
    this.liveHostIceFlushTimers.forEach((t) => clearTimeout(t));
    this.liveHostIceFlushTimers.clear();

    if (this.liveUnsubscribeWs) {
      this.liveUnsubscribeWs();
      this.liveUnsubscribeWs = null;
    }
    if (this.liveUnsubscribeFs) {
      this.liveUnsubscribeFs();
      this.liveUnsubscribeFs = null;
    }
    if (this.liveStreamId && this.liveUserId) {
      liveAndRoomService.sendSignal({
        signalType: 'webrtc:peer_left',
        fromUserId: this.liveUserId,
        streamId: this.liveStreamId,
      });
    }
    this.liveHostPeers.forEach((pc) => {
      try {
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        pc.close();
      } catch {
        // ignore
      }
    });
    this.liveHostPeers.clear();
    this.liveHostPendingIce.clear();
    this.liveHostOutboundIce.clear();
    this.liveHostSeenViewerIce.clear();
    this.liveHostOfferedSessions.clear();
    this.liveHostAnsweredSessions.clear();
    this.liveWaitingViewers.clear();

    if (this.liveViewerPc) {
      try {
        this.liveViewerPc.onicecandidate = null;
        this.liveViewerPc.ontrack = null;
        this.liveViewerPc.onconnectionstatechange = null;
        this.liveViewerPc.close();
      } catch {
        // ignore
      }
      this.liveViewerPc = null;
    }
    this.liveViewerPendingIce = [];
    this.liveViewerSeenHostIce.clear();
    this.liveViewerOutboundIce = [];
    this.liveViewerRemoteStream = null;
    this.liveViewerCallbacks = null;
    this.liveViewerUser = null;
    this.liveLocalStream = null;
    this.liveMode = 'idle';
    this.liveStreamId = null;
    this.liveUserId = null;
    this.liveHostUserId = null;
    this.liveViewerSessionId = '';
    this.liveViewerHandledOfferSession = '';
  }

  // ============================================================================
  // 3. PARTY ROOM REAL-TIME VOICE MESH (over WS + Firestore Failover)
  // ============================================================================

  private getOutboundPartyAudioStream(): MediaStream | null {
    if (this.partyMixedStream && this.partyMixedStream.getAudioTracks().some((t) => t.readyState === 'live')) {
      return this.partyMixedStream;
    }
    return this.partyLocalStream;
  }

  private hasLivePartyAudioTrack(): boolean {
    const active = this.getOutboundPartyAudioStream();
    if (!active) return false;
    return active.getAudioTracks().some((t) => t.readyState === 'live');
  }

  private shouldInitiatePartyOffer(peerId: string, peerIsSpeaker: boolean): boolean {
    if (!this.partyIsSpeaker && !this.partyMusicTrack) return false;
    if (!peerIsSpeaker) return true;
    return String(this.partyUserId || '') > peerId;
  }

  private isPartyPeerHealthy(peerId: string): boolean {
    const pc = this.partyPeers.get(peerId);
    if (!pc) return false;
    if (pc.connectionState === 'connected' || pc.connectionState === 'connecting') {
      return true;
    }
    if (pc.signalingState === 'have-local-offer' && pc.iceConnectionState !== 'failed' && pc.iceConnectionState !== 'closed') {
      return true;
    }
    return false;
  }

  private maybeInitiatePartyPeer(peerId: string, peerIsSpeaker: boolean, forceRenegotiate = false) {
    if (!this.partyRoomId || !this.partyUserId || !peerId || peerId === this.partyUserId) return;
    this.partyKnownPeers.set(peerId, { isSpeaker: peerIsSpeaker });

    if (!this.shouldInitiatePartyOffer(peerId, peerIsSpeaker)) {
      return;
    }

    // Do NOT send a silent/trackless offer while speaker mic is still being acquired!
    if (!this.hasLivePartyAudioTrack()) {
      this.partyPendingOfferPeers.add(peerId);
      return;
    }

    if (!forceRenegotiate && this.isPartyPeerHealthy(peerId)) {
      return;
    }

    this.partyPendingOfferPeers.delete(peerId);
    void this.createPartyOffer(peerId);
  }

  public startPartyVoice(
    roomId: string,
    userId: string,
    isSpeaker: boolean,
    localAudioStream: MediaStream | null,
    callbacks: PartyVoiceCallbacks
  ) {
    this.stopPartyVoice();
    if (typeof RTCPeerConnection === 'undefined') {
      callbacks.onStatusChange?.('failed');
      return;
    }

    void this.refreshIceServers();

    const mySessionGen = ++this.partySessionGen;
    this.partyRoomId = roomId;
    this.partyUserId = userId;
    this.partyIsSpeaker = isSpeaker;
    this.partyStartedAt = Date.now();
    this.partyLocalStream = localAudioStream;
    this.partyCallbacks = callbacks;

    // Clear any stale rtcSignals left from a previous session in this room
    void clearFirestorePartyPeerSignals(roomId);

    callbacks.onStatusChange?.('connected');

    // Poll remote WebRTC audio analysers so viewer UI lights up speaking rings for Host & Speakers
    this.partyVolumeTimer = setInterval(() => {
      if (!this.partyRoomId || this.partyRemoteAnalysers.size === 0) return;
      this.partyRemoteAnalysers.forEach((entry, peerId) => {
        try {
          entry.analyser.getByteTimeDomainData(entry.data);
          let sumSq = 0;
          for (let i = 0; i < entry.data.length; i++) {
            const v = (entry.data[i] - 128) / 128;
            sumSq += v * v;
          }
          const rms = Math.sqrt(sumSq / entry.data.length);
          const level = Math.min(100, Math.round(rms * 320));
          if (level > 6) {
            this.partyCallbacks?.onRemoteVolume?.(peerId, level);
          }
        } catch {
          // ignore
        }
      });
    }, 180);

    // 1. WebSocket signaling listener
    this.partyUnsubscribeWs = liveAndRoomService.addEventListener((event, payload) => {
      if (this.partySessionGen !== mySessionGen || !this.partyRoomId || this.partyRoomId !== roomId || !payload || payload.roomId !== roomId) return;
      const fromUserId = String(payload.fromUserId || '');
      if (!fromUserId || fromUserId === this.partyUserId) return;

      if (event === 'webrtc:room_peer_ready') {
        const peerIsSpeaker = Boolean(payload.isSpeaker);
        this.partyKnownPeers.set(fromUserId, { isSpeaker: peerIsSpeaker });
        if (!this.partyIsSpeaker && !peerIsSpeaker) return;

        if (this.shouldInitiatePartyOffer(fromUserId, peerIsSpeaker)) {
          this.maybeInitiatePartyPeer(fromUserId, peerIsSpeaker, false);
        } else if (peerIsSpeaker && !this.partyIsSpeaker && !this.isPartyPeerHealthy(fromUserId)) {
          liveAndRoomService.sendSignal({
            signalType: 'webrtc:room_listener_hello',
            fromUserId: this.partyUserId!,
            targetUserId: fromUserId,
            roomId: this.partyRoomId,
            payload: { isSpeaker: false },
          });
        }
      } else if (event === 'webrtc:room_listener_hello') {
        this.partyKnownPeers.set(fromUserId, { isSpeaker: false });
        if (this.partyIsSpeaker) {
          this.maybeInitiatePartyPeer(fromUserId, false, false);
        }
      } else if (event === 'webrtc:room_offer' && payload.sdp) {
        void this.handlePartyOffer(fromUserId, payload.sdp, payload.sessionId);
      } else if (event === 'webrtc:room_answer' && payload.sdp) {
        void this.handlePartyAnswer(fromUserId, payload.sdp, payload.sessionId);
      } else if (event === 'webrtc:room_ice' && payload.candidate) {
        void this.handlePartyIce(fromUserId, payload.candidate, payload.sessionId);
      } else if (event === 'webrtc:room_peer_left') {
        this.partyKnownPeers.delete(fromUserId);
        this.partyPendingOfferPeers.delete(fromUserId);
        this.closePartyPeer(fromUserId);
      }
    });

    // 2. Cloud Firestore failover signaling listener on party_rooms/{roomId}/participants/*
    this.partyUnsubscribeFs = subscribeFirestoreRoomParticipants(roomId, (_list, rawDocs) => {
      if (this.partySessionGen !== mySessionGen || !this.partyRoomId || this.partyRoomId !== roomId || !this.partyUserId) return;

      rawDocs.forEach((pDoc: FirestoreRoomParticipantDoc, docId: string) => {
        const peerId = String(pDoc.userId || docId);
        if (!peerId || peerId === this.partyUserId) return;

        const peerIsSpeaker = Boolean(pDoc.isSpeaker);
        this.partyKnownPeers.set(peerId, { isSpeaker: peerIsSpeaker });

        // Initiate cleanly if we are speaker & deterministic initiator and peer isn't already connecting/connected
        if (this.shouldInitiatePartyOffer(peerId, peerIsSpeaker)) {
          this.maybeInitiatePartyPeer(peerId, peerIsSpeaker, false);
        }

        // Check if this peer wrote a fresh signaling envelope addressed to us
        const envelope = pDoc.rtcSignals?.[this.partyUserId!];
        if (!envelope) return;

        // Ignore stale signals left over from long before we joined this room
        if (typeof envelope.updatedAt === 'number' && envelope.updatedAt < this.partyStartedAt - 15000) {
          return;
        }

        if (envelope.type === 'offer' && envelope.sdp && envelope.sdp.sdp) {
          const offerSession = String(envelope.sessionId || `fs_off_${envelope.updatedAt || 0}`);
          if (this.partyHandledOfferSessions.get(peerId) !== offerSession) {
            void this.handlePartyOffer(peerId, envelope.sdp, offerSession);
          }
        } else if (envelope.type === 'answer' && envelope.sdp && envelope.sdp.sdp) {
          const answerSession = String(envelope.sessionId || '');
          const expectedSession = this.partyPeerSessions.get(peerId) || '';
          if (
            (!answerSession || !expectedSession || answerSession === expectedSession) &&
            this.partyHandledAnswerSessions.get(peerId) !== (answerSession || 'default')
          ) {
            void this.handlePartyAnswer(peerId, envelope.sdp, answerSession);
          }
        }

        if (Array.isArray(envelope.ice) && envelope.ice.length > 0) {
          for (const cand of envelope.ice) {
            void this.handlePartyIce(peerId, cand, envelope.sessionId);
          }
        }
      });
    });

    this.announcePartyPresence();
    // Fast initial re-announce at 650ms so simultaneous joiners lock audio within ~1.5-3s
    this.partyQuickPresenceTimer = setTimeout(() => {
      this.partyQuickPresenceTimer = null;
      if (this.partyRoomId) {
        this.announcePartyPresence();
      }
    }, 650);

    let ticks = 0;
    this.partyPresenceTimer = setInterval(() => {
      ticks += 1;
      if (!this.partyRoomId || ticks > 3) {
        if (this.partyPresenceTimer) {
          clearInterval(this.partyPresenceTimer);
          this.partyPresenceTimer = null;
        }
        return;
      }
      this.announcePartyPresence();
    }, 2400);
  }

  public updatePartySpeakerRole(isSpeaker: boolean, localAudioStream: MediaStream | null) {
    if (!this.partyRoomId || !this.partyUserId) return;
    const roleChanged = this.partyIsSpeaker !== isSpeaker;
    const hadLiveTrack = this.hasLivePartyAudioTrack();
    this.partyIsSpeaker = isSpeaker;
    this.partyLocalStream = localAudioStream;
    const nowHasLiveTrack = this.hasLivePartyAudioTrack();

    if (!isSpeaker) {
      this.partyPendingOfferPeers.clear();
      this.partyPeers.forEach((pc, peerId) => {
        pc.getSenders().forEach((sender) => {
          if (sender.track) {
            try {
              pc.removeTrack(sender);
            } catch {
              // ignore
            }
          }
        });
        // Keep receiving audio from other speakers, only close connections to non-speaking listeners
        const peerMeta = this.partyKnownPeers.get(peerId);
        if (roleChanged && !peerMeta?.isSpeaker) {
          this.closePartyPeer(peerId);
        }
      });
    } else if (localAudioStream && nowHasLiveTrack) {
      const audioTrack = localAudioStream.getAudioTracks().find((t) => t.readyState === 'live');
      if (audioTrack) {
        // 1. Update or renegotiate any existing peers
        this.partyPeers.forEach((pc, peerId) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
          if (sender) {
            sender.replaceTrack(audioTrack).catch(() => {
              void this.createPartyOffer(peerId);
            });
          } else {
            // Peer existed without an outbound audio track — renegotiate cleanly with fresh offer!
            void this.createPartyOffer(peerId);
          }
        });

        // 2. Push fresh offers to EVERY known listener/peer in the room that doesn't have an active connection yet!
        this.partyKnownPeers.forEach((meta, peerId) => {
          if (this.shouldInitiatePartyOffer(peerId, meta.isSpeaker)) {
            if (!this.partyPeers.has(peerId) || !hadLiveTrack || roleChanged) {
              this.maybeInitiatePartyPeer(peerId, meta.isSpeaker, !hadLiveTrack);
            }
          }
        });

        // 3. Flush any queued peers waiting for mic warmup
        if (this.partyPendingOfferPeers.size > 0) {
          const queued = Array.from(this.partyPendingOfferPeers);
          this.partyPendingOfferPeers.clear();
          queued.forEach((peerId) => {
            void this.createPartyOffer(peerId);
          });
        }
      }
    }

    if (roleChanged || (!hadLiveTrack && nowHasLiveTrack)) {
      this.announcePartyPresence();
    }
  }

  private teardownPartyMixer() {
    this.partyMixerMicGain = null;
    this.partyMixerMusicGain = null;
    if (this.partyMixedStream) {
      this.partyMixedStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      this.partyMixedStream = null;
    }
    if (this.partyMixerCtx) {
      try {
        void this.partyMixerCtx.close();
      } catch {
        // ignore
      }
      this.partyMixerCtx = null;
    }
  }

  private rebuildPartyMixedStream(): MediaStream | null {
    this.teardownPartyMixer();
    const liveMusic = this.partyMusicTrack && this.partyMusicTrack.readyState === 'live' ? this.partyMusicTrack : null;
    if (!liveMusic) {
      return this.partyLocalStream;
    }
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        this.partyMixedStream = new MediaStream([liveMusic]);
        return this.partyMixedStream;
      }
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const dest = ctx.createMediaStreamDestination();
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 12;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.15;
      limiter.connect(dest);

      // Branch 1: Host Microphone (independent mute)
      const micTrack = this.partyLocalStream?.getAudioTracks().find((t) => t.readyState === 'live');
      if (micTrack) {
        const micSource = ctx.createMediaStreamSource(new MediaStream([micTrack]));
        const micGain = ctx.createGain();
        micGain.gain.value = this.partyMicMuted ? 0 : 1.0;
        micSource.connect(micGain);
        micGain.connect(limiter);
        this.partyMixerMicGain = micGain;
      }

      // Branch 2: Party Music (independent volume)
      const musicSource = ctx.createMediaStreamSource(new MediaStream([liveMusic]));
      const musicGain = ctx.createGain();
      musicGain.gain.value = Math.max(0, Math.min(1, this.partyMusicVolume));
      musicSource.connect(musicGain);
      musicGain.connect(limiter);
      this.partyMixerMusicGain = musicGain;

      this.partyMixerCtx = ctx;
      this.partyMixedStream = dest.stream;
      return this.partyMixedStream;
    } catch {
      this.partyMixedStream = new MediaStream([liveMusic]);
      return this.partyMixedStream;
    }
  }

  /**
   * Inject or remove a Party Music track into the WebRTC Party Voice Mesh alongside the Host's mic.
   * Updates all active peer connections (both seated speakers AND non-seated listeners).
   */
  public setPartyMusicTrack(musicTrack: MediaStreamTrack | null, volumePercent = 65) {
    this.partyMusicTrack = musicTrack && musicTrack.readyState === 'live' ? musicTrack : null;
    this.partyMusicVolume = Math.max(0, Math.min(1, volumePercent / 100));
    if (!this.partyRoomId || !this.partyUserId) return;

    const outboundStream = this.rebuildPartyMixedStream();
    const outboundTrack = outboundStream?.getAudioTracks().find((t) => t.readyState === 'live') || null;

    if (outboundTrack) {
      this.partyPeers.forEach((pc, peerId) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
        if (sender) {
          sender.replaceTrack(outboundTrack).catch(() => {
            void this.createPartyOffer(peerId);
          });
        } else {
          void this.createPartyOffer(peerId);
        }
      });

      this.partyKnownPeers.forEach((meta, peerId) => {
        if (this.shouldInitiatePartyOffer(peerId, meta.isSpeaker) && !this.isPartyPeerHealthy(peerId)) {
          this.maybeInitiatePartyPeer(peerId, meta.isSpeaker, false);
        }
      });
    }
  }

  public setPartyMusicVolume(volumePercent: number) {
    this.partyMusicVolume = Math.max(0, Math.min(1, volumePercent / 100));
    if (this.partyMixerMusicGain) {
      this.partyMixerMusicGain.gain.value = this.partyMusicVolume;
    }
  }

  public setPartyMicMuted(muted: boolean) {
    this.partyMicMuted = muted;
    if (this.partyMixerMicGain) {
      this.partyMixerMicGain.gain.value = muted ? 0 : 1.0;
    }
    if (this.partyLocalStream) {
      this.partyLocalStream.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
    }
  }

  public setPartySpeakerMuted(muted: boolean) {
    this.partySpeakerMuted = muted;
    this.partyRemoteAudioEls.forEach((audioEl) => {
      audioEl.muted = muted;
      if (!muted) {
        audioEl.volume = 1.0;
        audioEl.play().catch(() => {
          this.partyCallbacks?.onAutoplayBlocked?.();
        });
      }
    });
  }

  public resumePartyRemoteAudio() {
    if (this.sharedPartyAudioCtx && this.sharedPartyAudioCtx.state === 'suspended') {
      this.sharedPartyAudioCtx.resume().catch(() => {});
    }
    this.partyRemoteAudioEls.forEach((audioEl) => {
      audioEl.muted = this.partySpeakerMuted;
      audioEl.volume = 1.0;
      if (!this.partySpeakerMuted) {
        audioEl.play().catch(() => {});
      }
    });
  }

  private announcePartyPresence() {
    if (!this.partyRoomId || !this.partyUserId) return;
    liveAndRoomService.sendSignal({
      signalType: 'webrtc:room_peer_ready',
      fromUserId: this.partyUserId,
      roomId: this.partyRoomId,
      payload: { isSpeaker: this.partyIsSpeaker },
    });
  }

  private schedulePartyIceFlush(peerId: string, type: 'offer' | 'answer', sessionId: string) {
    if (this.partyIceFlushTimers.has(peerId)) return;
    const timer = setTimeout(() => {
      this.partyIceFlushTimers.delete(peerId);
      if (!this.partyRoomId) return;
      if (this.partyPeerSessions.get(peerId) !== sessionId) return;
      const batch = this.partyOutboundIce.get(peerId);
      if (!batch || batch.length === 0) return;
      const sdp = this.partyOutboundSdp.get(peerId);
      void writeFirestorePartyPeerSignal(this.partyRoomId, peerId, {
        type,
        ...(sdp ? { sdp } : {}),
        sessionId,
        ice: batch.slice(0, 32),
      });
    }, 60);
    this.partyIceFlushTimers.set(peerId, timer);
  }

  private setupPartyPeerConnection(
    peerId: string,
    signalType: 'offer' | 'answer',
    sessionId: string
  ): RTCPeerConnection {
    this.closePartyPeer(peerId);
    const pc = new RTCPeerConnection(this.getRtcConfig());
    this.partyPeers.set(peerId, pc);
    this.partyPendingIce.set(peerId, []);
    this.partySeenRemoteIce.set(peerId, new Set());
    this.partyOutboundIce.set(peerId, []);
    this.partyPeerSessions.set(peerId, sessionId);
    this.partyHandledAnswerSessions.delete(peerId);

    const outboundStream = this.getOutboundPartyAudioStream();
    if ((this.partyIsSpeaker || this.partyMusicTrack) && outboundStream) {
      outboundStream.getAudioTracks().forEach((track) => {
        if (track.readyState === 'live') {
          pc.addTrack(track, outboundStream);
        }
      });
    }

    const sessionGen = this.partySessionGen;
    const activeRoomId = this.partyRoomId;

    pc.ontrack = (ev) => {
      if (this.partySessionGen !== sessionGen || this.partyRoomId !== activeRoomId || this.partyPeers.get(peerId) !== pc) {
        try {
          ev.track.stop();
        } catch {
          // ignore
        }
        return;
      }
      const stream = ev.streams && ev.streams[0] ? ev.streams[0] : new MediaStream([ev.track]);
      this.attachRemotePartyAudio(peerId, stream);
    };

    pc.onicecandidate = (ev) => {
      if (
        ev.candidate &&
        this.partySessionGen === sessionGen &&
        this.partyRoomId === activeRoomId &&
        this.partyRoomId &&
        this.partyUserId
      ) {
        const candJson = ev.candidate.toJSON();
        liveAndRoomService.sendSignal({
          signalType: 'webrtc:room_ice',
          fromUserId: this.partyUserId,
          targetUserId: peerId,
          roomId: this.partyRoomId,
          payload: { candidate: candJson, sessionId },
        });
        const out = this.partyOutboundIce.get(peerId) || [];
        out.push(candJson);
        this.partyOutboundIce.set(peerId, out);
        this.schedulePartyIceFlush(peerId, signalType, sessionId);
      }
    };

    pc.onconnectionstatechange = () => {
      if (this.partySessionGen !== sessionGen || this.partyRoomId !== activeRoomId) return;
      if (pc.connectionState === 'connected') {
        this.partyCallbacks?.onStatusChange?.('connected');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        if (this.partyPeers.get(peerId) === pc) {
          this.closePartyPeer(peerId);
        }
      }
    };

    return pc;
  }

  private async createPartyOffer(peerId: string) {
    if (!this.partyRoomId || !this.partyUserId) return;
    if (this.partyIsSpeaker && !this.hasLivePartyAudioTrack()) {
      this.partyPendingOfferPeers.add(peerId);
      return;
    }
    const gen = this.partySessionGen;
    const activeRoomId = this.partyRoomId;
    const sessionId = makeSessionId('pr');
    const pc = this.setupPartyPeerConnection(peerId, 'offer', sessionId);
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      if (this.partySessionGen !== gen || this.partyRoomId !== activeRoomId || this.partyPeers.get(peerId) !== pc) {
        try { pc.close(); } catch {}
        return;
      }
      await pc.setLocalDescription(offer);
      if (this.partySessionGen !== gen || this.partyRoomId !== activeRoomId || this.partyPeers.get(peerId) !== pc) {
        try { pc.close(); } catch {}
        return;
      }
      const localSdp: RTCSessionDescriptionInit = {
        type: pc.localDescription?.type || offer.type,
        sdp: pc.localDescription?.sdp || offer.sdp,
      };
      this.partyOutboundSdp.set(peerId, localSdp);

      liveAndRoomService.sendSignal({
        signalType: 'webrtc:room_offer',
        fromUserId: this.partyUserId,
        targetUserId: peerId,
        roomId: activeRoomId,
        payload: { sdp: localSdp, sessionId },
      });
      void writeFirestorePartyPeerSignal(activeRoomId, peerId, {
        type: 'offer',
        sdp: localSdp,
        sessionId,
        ice: [],
      });
    } catch (err) {
      console.warn('[WebRTC Party] Offer error:', err);
      if (this.partySessionGen === gen && this.partyPeers.get(peerId) === pc) {
        this.closePartyPeer(peerId);
      }
    }
  }

  private async handlePartyOffer(
    peerId: string,
    sdp: RTCSessionDescriptionInit,
    incomingSessionId?: string
  ) {
    if (!this.partyRoomId || !this.partyUserId) return;
    const sessionId = incomingSessionId || makeSessionId('pa');

    // Deduplicate identical offers arriving over both WebSocket AND Firestore!
    if (this.partyHandledOfferSessions.get(peerId) === sessionId) {
      return;
    }

    // Polite/impolite glare protection: if we already have an outbound offer in flight
    // and we are the deterministic initiator (impolite peer), ignore colliding offer instead of tearing down audio!
    const existingPc = this.partyPeers.get(peerId);
    if (
      existingPc &&
      existingPc.signalingState === 'have-local-offer' &&
      String(this.partyUserId) > peerId
    ) {
      return;
    }

    const gen = this.partySessionGen;
    const activeRoomId = this.partyRoomId;
    this.partyHandledOfferSessions.set(peerId, sessionId);

    const pc = this.setupPartyPeerConnection(peerId, 'answer', sessionId);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      if (this.partySessionGen !== gen || this.partyRoomId !== activeRoomId || this.partyPeers.get(peerId) !== pc) {
        try { pc.close(); } catch {}
        return;
      }
      const queued = this.partyPendingIce.get(peerId) || [];
      this.partyPendingIce.set(peerId, []);
      for (const cand of queued) {
        await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
      }
      const answer = await pc.createAnswer();
      if (this.partySessionGen !== gen || this.partyRoomId !== activeRoomId || this.partyPeers.get(peerId) !== pc) {
        try { pc.close(); } catch {}
        return;
      }
      await pc.setLocalDescription(answer);
      if (this.partySessionGen !== gen || this.partyRoomId !== activeRoomId || this.partyPeers.get(peerId) !== pc) {
        try { pc.close(); } catch {}
        return;
      }
      const localSdp: RTCSessionDescriptionInit = {
        type: pc.localDescription?.type || answer.type,
        sdp: pc.localDescription?.sdp || answer.sdp,
      };
      this.partyOutboundSdp.set(peerId, localSdp);

      liveAndRoomService.sendSignal({
        signalType: 'webrtc:room_answer',
        fromUserId: this.partyUserId,
        targetUserId: peerId,
        roomId: activeRoomId,
        payload: { sdp: localSdp, sessionId },
      });
      void writeFirestorePartyPeerSignal(activeRoomId, peerId, {
        type: 'answer',
        sdp: localSdp,
        sessionId,
        ice: this.partyOutboundIce.get(peerId)?.slice(0, 32) || [],
      });
    } catch (err) {
      console.warn('[WebRTC Party] Answer error:', err);
      if (this.partySessionGen === gen && this.partyPeers.get(peerId) === pc) {
        this.closePartyPeer(peerId);
      }
    }
  }

  private async handlePartyAnswer(
    peerId: string,
    sdp: RTCSessionDescriptionInit,
    incomingSessionId?: string
  ) {
    const pc = this.partyPeers.get(peerId);
    if (!pc) return;
    const expectedSession = this.partyPeerSessions.get(peerId);
    if (incomingSessionId && expectedSession && incomingSessionId !== expectedSession) {
      return; // Ignore stale answer from an older offer session
    }
    const ansKey = incomingSessionId || expectedSession || 'default';
    if (this.partyHandledAnswerSessions.get(peerId) === ansKey) {
      return;
    }
    try {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        this.partyHandledAnswerSessions.set(peerId, ansKey);
        const queued = this.partyPendingIce.get(peerId) || [];
        this.partyPendingIce.set(peerId, []);
        for (const cand of queued) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[WebRTC Party] Remote answer error:', err);
    }
  }

  private async handlePartyIce(
    peerId: string,
    candidate: RTCIceCandidateInit,
    incomingSessionId?: string
  ) {
    const pc = this.partyPeers.get(peerId);
    if (!pc || !candidate?.candidate) return;
    const expectedSession = this.partyPeerSessions.get(peerId);
    if (incomingSessionId && expectedSession && incomingSessionId !== expectedSession) {
      return;
    }

    const seen = this.partySeenRemoteIce.get(peerId) || new Set<string>();
    const key = iceKey(candidate);
    if (seen.has(key)) return;
    seen.add(key);
    this.partySeenRemoteIce.set(peerId, seen);

    if (pc.remoteDescription && pc.remoteDescription.type) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    } else {
      const list = this.partyPendingIce.get(peerId) || [];
      list.push(candidate);
      this.partyPendingIce.set(peerId, list);
    }
  }

  private attachRemotePartyAudio(peerId: string, stream: MediaStream) {
    if (typeof document === 'undefined') return;
    let audioEl = this.partyRemoteAudioEls.get(peerId);
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      (audioEl as any).playsInline = true;
      audioEl.setAttribute('playsinline', 'true');
      audioEl.volume = 1.0;
      // Avoid display:none so Android WebView / mobile browsers never suspend audio decoding
      audioEl.style.position = 'fixed';
      audioEl.style.width = '1px';
      audioEl.style.height = '1px';
      audioEl.style.opacity = '0';
      audioEl.style.pointerEvents = 'none';
      audioEl.style.left = '-10px';
      audioEl.style.top = '-10px';
      document.body.appendChild(audioEl);
      this.partyRemoteAudioEls.set(peerId, audioEl);
    }
    audioEl.srcObject = stream;
    audioEl.muted = this.partySpeakerMuted;
    audioEl.volume = 1.0;
    audioEl.play().catch(() => {
      this.partyCallbacks?.onAutoplayBlocked?.();
    });

    // Attach lightweight remote volume analyser using ONE shared AudioContext (avoids Chrome/Android 6-AudioContext crash!)
    if (!this.partyRemoteAnalysers.has(peerId) && typeof window !== 'undefined') {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          if (!this.sharedPartyAudioCtx || this.sharedPartyAudioCtx.state === 'closed') {
            this.sharedPartyAudioCtx = new AudioCtx();
          }
          const ctx = this.sharedPartyAudioCtx;
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          const data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
          this.partyRemoteAnalysers.set(peerId, { source, analyser, data });
        }
      } catch {
        // Non-fatal: audio still plays via HTMLAudioElement
      }
    }

    this.notifyPartySpeakers();
  }

  private closePartyPeer(peerId: string) {
    const timer = this.partyIceFlushTimers.get(peerId);
    if (timer) {
      clearTimeout(timer);
      this.partyIceFlushTimers.delete(peerId);
    }
    const pc = this.partyPeers.get(peerId);
    if (pc) {
      try {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        pc.close();
      } catch {
        // ignore
      }
      this.partyPeers.delete(peerId);
    }
    this.partyPendingIce.delete(peerId);
    this.partySeenRemoteIce.delete(peerId);
    this.partyOutboundIce.delete(peerId);
    this.partyOutboundSdp.delete(peerId);
    this.partyPeerSessions.delete(peerId);
    const analyserEntry = this.partyRemoteAnalysers.get(peerId);
    if (analyserEntry) {
      try {
        analyserEntry.source.disconnect();
        analyserEntry.analyser.disconnect();
      } catch {
        // ignore
      }
      this.partyRemoteAnalysers.delete(peerId);
    }
    const audioEl = this.partyRemoteAudioEls.get(peerId);
    if (audioEl) {
      try {
        audioEl.pause();
        audioEl.srcObject = null;
        audioEl.remove();
      } catch {
        // ignore
      }
      this.partyRemoteAudioEls.delete(peerId);
    }
    this.notifyPartySpeakers();
  }

  private notifyPartySpeakers() {
    this.partyCallbacks?.onRemoteSpeakersChange?.(Array.from(this.partyRemoteAudioEls.keys()));
  }

  public stopPartyVoice(expectedRoomId?: string) {
    if (expectedRoomId && this.partyRoomId && this.partyRoomId !== expectedRoomId) {
      return;
    }
    this.partySessionGen += 1;
    if (this.partyQuickPresenceTimer) {
      clearTimeout(this.partyQuickPresenceTimer);
      this.partyQuickPresenceTimer = null;
    }
    if (this.partyPresenceTimer) {
      clearInterval(this.partyPresenceTimer);
      this.partyPresenceTimer = null;
    }
    if (this.partyVolumeTimer) {
      clearInterval(this.partyVolumeTimer);
      this.partyVolumeTimer = null;
    }
    this.partyIceFlushTimers.forEach((t) => clearTimeout(t));
    this.partyIceFlushTimers.clear();
    if (this.partyUnsubscribeWs) {
      this.partyUnsubscribeWs();
      this.partyUnsubscribeWs = null;
    }
    if (this.partyUnsubscribeFs) {
      this.partyUnsubscribeFs();
      this.partyUnsubscribeFs = null;
    }
    if (this.partyRoomId && this.partyUserId) {
      void clearFirestorePartyPeerSignals(this.partyRoomId);
      liveAndRoomService.sendSignal({
        signalType: 'webrtc:room_peer_left',
        fromUserId: this.partyUserId,
        roomId: this.partyRoomId,
      });
    }
    Array.from(this.partyPeers.keys()).forEach((peerId) => this.closePartyPeer(peerId));
    this.partyPeers.clear();
    this.partyKnownPeers.clear();
    this.partyPendingOfferPeers.clear();
    this.partyPendingIce.clear();
    this.partySeenRemoteIce.clear();
    this.partyOutboundIce.clear();
    this.partyOutboundSdp.clear();
    this.partyHandledOfferSessions.clear();
    this.partyHandledAnswerSessions.clear();
    this.partyPeerSessions.clear();
    this.partyRemoteAnalysers.forEach((entry) => {
      try {
        entry.source.disconnect();
        entry.analyser.disconnect();
      } catch {
        // ignore
      }
    });
    this.partyRemoteAnalysers.clear();
    if (this.sharedPartyAudioCtx) {
      try {
        void this.sharedPartyAudioCtx.close();
      } catch {
        // ignore
      }
      this.sharedPartyAudioCtx = null;
    }
    this.partyRemoteAudioEls.forEach((audioEl) => {
      try {
        audioEl.pause();
        audioEl.srcObject = null;
        audioEl.remove();
      } catch {
        // ignore
      }
    });
    this.partyRemoteAudioEls.clear();
    this.teardownPartyMixer();
    this.partyMusicTrack = null;
    this.partyMicMuted = false;
    this.partyLocalStream = null;
    this.partyCallbacks = null;
    this.partyRoomId = null;
    this.partyUserId = null;
    this.partyIsSpeaker = false;
    this.partyStartedAt = 0;
  }
}

export const webrtcMediaService = new WebRtcMediaService();
