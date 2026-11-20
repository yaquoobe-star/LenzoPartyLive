import { liveAndRoomService } from '../services/liveAndRoomService';

export type WebRtcConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 6,
};

interface LiveViewerCallbacks {
  onRemoteStream: (stream: MediaStream) => void;
  onStatusChange?: (status: WebRtcConnectionStatus) => void;
  onAutoplayBlocked?: () => void;
}

interface PartyVoiceCallbacks {
  onRemoteSpeakersChange?: (speakerIds: string[]) => void;
  onStatusChange?: (status: WebRtcConnectionStatus) => void;
  onAutoplayBlocked?: () => void;
}

/**
 * Real-time WebRTC Media Engine over Lenzo WebSocket Signaling (/ws).
 * Provides real video + audio delivery for Live Streams (1-to-Many) and
 * multi-speaker voice for Party Rooms whenever Agora RTC credentials are not configured
 * or when direct peer media fallback is active.
 */
class WebRtcMediaService {
  // --- LIVE STREAM STATE ---
  private liveMode: 'idle' | 'host' | 'viewer' = 'idle';
  private liveStreamId: string | null = null;
  private liveUserId: string | null = null;
  private liveHostUserId: string | null = null;
  private liveLocalStream: MediaStream | null = null;
  private liveHostPeers = new Map<string, RTCPeerConnection>();
  private liveHostPendingIce = new Map<string, RTCIceCandidateInit[]>();
  private liveViewerPc: RTCPeerConnection | null = null;
  private liveViewerPendingIce: RTCIceCandidateInit[] = [];
  private liveViewerCallbacks: LiveViewerCallbacks | null = null;
  private liveViewerRetryTimer: ReturnType<typeof setInterval> | null = null;
  private liveViewerRetryCount = 0;
  private liveUnsubscribe: (() => void) | null = null;

  // --- PARTY ROOM VOICE STATE ---
  private partyRoomId: string | null = null;
  private partyUserId: string | null = null;
  private partyIsSpeaker = false;
  private partyLocalStream: MediaStream | null = null;
  private partyPeers = new Map<string, RTCPeerConnection>();
  private partyPendingIce = new Map<string, RTCIceCandidateInit[]>();
  private partyRemoteAudioEls = new Map<string, HTMLAudioElement>();
  private partySpeakerMuted = false;
  private partyCallbacks: PartyVoiceCallbacks | null = null;
  private partyUnsubscribe: (() => void) | null = null;
  private partyPresenceTimer: ReturnType<typeof setInterval> | null = null;

  // ============================================================================
  // 1. LIVE STREAMING: HOST PUBLISHER (1-to-Many)
  // ============================================================================

  public startLiveHost(streamId: string, hostUserId: string, localStream: MediaStream | null) {
    this.stopLive();
    if (typeof RTCPeerConnection === 'undefined') return;

    this.liveMode = 'host';
    this.liveStreamId = streamId;
    this.liveUserId = hostUserId;
    this.liveHostUserId = hostUserId;
    this.liveLocalStream = localStream;

    this.liveUnsubscribe = liveAndRoomService.addEventListener((event, payload) => {
      if (this.liveMode !== 'host' || !payload || payload.streamId !== this.liveStreamId) return;
      const fromUserId = String(payload.fromUserId || '');
      if (!fromUserId || fromUserId === this.liveUserId) return;

      if (event === 'webrtc:viewer_ready') {
        void this.createLiveHostOffer(fromUserId);
      } else if (event === 'webrtc:answer' && payload.sdp) {
        void this.handleLiveHostAnswer(fromUserId, payload.sdp);
      } else if (event === 'webrtc:ice' && payload.candidate) {
        void this.handleLiveHostIce(fromUserId, payload.candidate);
      } else if (event === 'webrtc:peer_left') {
        this.closeLiveHostPeer(fromUserId);
      }
    });

    // Notify any viewers already waiting in this stream that the host media is ready
    liveAndRoomService.sendSignal({
      signalType: 'webrtc:host_ready',
      fromUserId: hostUserId,
      streamId,
      payload: { hasStream: Boolean(localStream) },
    });
  }

  public sendOfferToViewer(viewerId: string) {
    if (this.liveMode !== 'host' || !viewerId || viewerId === this.liveUserId) return;
    const existing = this.liveHostPeers.get(viewerId);
    if (existing && (existing.connectionState === 'connected' || existing.connectionState === 'connecting')) {
      return;
    }
    void this.createLiveHostOffer(viewerId);
  }

  public updateLiveHostStream(newStream: MediaStream | null) {
    if (this.liveMode !== 'host') return;
    this.liveLocalStream = newStream;

    const newVideoTrack = newStream?.getVideoTracks()[0] || null;
    const newAudioTrack = newStream?.getAudioTracks()[0] || null;

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
            void this.createLiveHostOffer(viewerId);
          });
        } else {
          needsRenegotiate = true;
        }
      }

      if (newAudioTrack) {
        if (audioSender) {
          audioSender.replaceTrack(newAudioTrack).catch(() => {
            void this.createLiveHostOffer(viewerId);
          });
        } else {
          needsRenegotiate = true;
        }
      }

      if (needsRenegotiate || (!videoSender && !audioSender && newStream)) {
        void this.createLiveHostOffer(viewerId);
      }
    });

    if (this.liveStreamId && this.liveUserId && newStream) {
      liveAndRoomService.sendSignal({
        signalType: 'webrtc:host_ready',
        fromUserId: this.liveUserId,
        streamId: this.liveStreamId,
        payload: { hasStream: true },
      });
    }
  }

  private async createLiveHostOffer(viewerId: string) {
    if (!this.liveStreamId || !this.liveUserId) return;
    this.closeLiveHostPeer(viewerId);

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.liveHostPeers.set(viewerId, pc);
    this.liveHostPendingIce.set(viewerId, []);

    if (this.liveLocalStream) {
      this.liveLocalStream.getTracks().forEach((track) => {
        if (this.liveLocalStream) {
          pc.addTrack(track, this.liveLocalStream);
        }
      });
    } else {
      // Even in audio-only / no-device preview, negotiate cleanly so viewer connects
      pc.addTransceiver('video', { direction: 'sendonly' });
      pc.addTransceiver('audio', { direction: 'sendonly' });
    }

    pc.onicecandidate = (ev) => {
      if (ev.candidate && this.liveStreamId && this.liveUserId) {
        liveAndRoomService.sendSignal({
          signalType: 'webrtc:ice',
          fromUserId: this.liveUserId,
          targetUserId: viewerId,
          streamId: this.liveStreamId,
          payload: { candidate: ev.candidate.toJSON() },
        });
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
      liveAndRoomService.sendSignal({
        signalType: 'webrtc:offer',
        fromUserId: this.liveUserId,
        targetUserId: viewerId,
        streamId: this.liveStreamId,
        payload: { sdp: pc.localDescription },
      });
    } catch (err) {
      console.warn('[WebRTC Live Host] Offer creation error:', err);
      this.closeLiveHostPeer(viewerId);
    }
  }

  private async handleLiveHostAnswer(viewerId: string, sdp: RTCSessionDescriptionInit) {
    const pc = this.liveHostPeers.get(viewerId);
    if (!pc) return;
    try {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
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
    if (!pc) return;
    if (pc.remoteDescription && pc.remoteDescription.type) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    } else {
      const list = this.liveHostPendingIce.get(viewerId) || [];
      list.push(candidate);
      this.liveHostPendingIce.set(viewerId, list);
    }
  }

  private closeLiveHostPeer(viewerId: string) {
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
  }

  // ============================================================================
  // 2. LIVE STREAMING: VIEWER SUBSCRIBER
  // ============================================================================

  public startLiveViewer(
    streamId: string,
    viewerUserId: string,
    hostUserId: string,
    callbacks: LiveViewerCallbacks
  ) {
    this.stopLive();
    if (typeof RTCPeerConnection === 'undefined') {
      callbacks.onStatusChange?.('failed');
      return;
    }

    this.liveMode = 'viewer';
    this.liveStreamId = streamId;
    this.liveUserId = viewerUserId;
    this.liveHostUserId = hostUserId;
    this.liveViewerCallbacks = callbacks;
    this.liveViewerRetryCount = 0;

    callbacks.onStatusChange?.('connecting');

    this.liveUnsubscribe = liveAndRoomService.addEventListener((event, payload) => {
      if (this.liveMode !== 'viewer' || !payload || payload.streamId !== this.liveStreamId) return;
      const fromUserId = String(payload.fromUserId || '');
      if (!fromUserId || fromUserId === this.liveUserId) return;

      if (event === 'webrtc:host_ready') {
        this.requestOfferFromHost();
      } else if (event === 'webrtc:offer' && payload.sdp) {
        void this.handleLiveViewerOffer(fromUserId, payload.sdp);
      } else if (event === 'webrtc:ice' && payload.candidate) {
        void this.handleLiveViewerIce(payload.candidate);
      }
    });

    this.requestOfferFromHost();

    // Retry requesting offer while connecting (handles race if host is initializing camera)
    this.liveViewerRetryTimer = setInterval(() => {
      if (this.liveMode !== 'viewer') {
        this.clearLiveViewerRetry();
        return;
      }
      if (this.liveViewerPc && this.liveViewerPc.connectionState === 'connected') {
        this.clearLiveViewerRetry();
        return;
      }
      this.liveViewerRetryCount += 1;
      if (this.liveViewerRetryCount > 8) {
        this.clearLiveViewerRetry();
        return;
      }
      this.requestOfferFromHost();
    }, 3000);
  }

  public requestOfferFromHost() {
    if (this.liveMode !== 'viewer' || !this.liveStreamId || !this.liveUserId) return;
    liveAndRoomService.sendSignal({
      signalType: 'webrtc:viewer_ready',
      fromUserId: this.liveUserId,
      targetUserId: this.liveHostUserId || undefined,
      streamId: this.liveStreamId,
      payload: { ready: true },
    });
  }

  private async handleLiveViewerOffer(hostId: string, sdp: RTCSessionDescriptionInit) {
    if (!this.liveStreamId || !this.liveUserId) return;
    if (this.liveViewerPc) {
      try {
        this.liveViewerPc.close();
      } catch {
        // ignore
      }
      this.liveViewerPc = null;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.liveViewerPc = pc;
    this.liveViewerPendingIce = [];
    const remoteStream = new MediaStream();

    pc.ontrack = (ev) => {
      if (ev.streams && ev.streams[0]) {
        this.liveViewerCallbacks?.onRemoteStream(ev.streams[0]);
      } else {
        remoteStream.addTrack(ev.track);
        this.liveViewerCallbacks?.onRemoteStream(remoteStream);
      }
      this.liveViewerCallbacks?.onStatusChange?.('connected');
      this.clearLiveViewerRetry();
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate && this.liveStreamId && this.liveUserId) {
        liveAndRoomService.sendSignal({
          signalType: 'webrtc:ice',
          fromUserId: this.liveUserId,
          targetUserId: hostId,
          streamId: this.liveStreamId,
          payload: { candidate: ev.candidate.toJSON() },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        this.liveViewerCallbacks?.onStatusChange?.('connected');
        this.clearLiveViewerRetry();
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
      liveAndRoomService.sendSignal({
        signalType: 'webrtc:answer',
        fromUserId: this.liveUserId,
        targetUserId: hostId,
        streamId: this.liveStreamId,
        payload: { sdp: pc.localDescription },
      });
    } catch (err) {
      console.warn('[WebRTC Live Viewer] Answer error:', err);
      this.liveViewerCallbacks?.onStatusChange?.('failed');
    }
  }

  private async handleLiveViewerIce(candidate: RTCIceCandidateInit) {
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
    if (this.liveUnsubscribe) {
      this.liveUnsubscribe();
      this.liveUnsubscribe = null;
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
        pc.close();
      } catch {
        // ignore
      }
    });
    this.liveHostPeers.clear();
    this.liveHostPendingIce.clear();
    if (this.liveViewerPc) {
      try {
        this.liveViewerPc.close();
      } catch {
        // ignore
      }
      this.liveViewerPc = null;
    }
    this.liveViewerPendingIce = [];
    this.liveViewerCallbacks = null;
    this.liveLocalStream = null;
    this.liveMode = 'idle';
    this.liveStreamId = null;
    this.liveUserId = null;
    this.liveHostUserId = null;
  }

  // ============================================================================
  // 3. PARTY ROOM REAL-TIME VOICE MESH (Speakers & Listeners)
  // ============================================================================

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

    this.partyRoomId = roomId;
    this.partyUserId = userId;
    this.partyIsSpeaker = isSpeaker;
    this.partyLocalStream = localAudioStream;
    this.partyCallbacks = callbacks;

    callbacks.onStatusChange?.('connected');

    this.partyUnsubscribe = liveAndRoomService.addEventListener((event, payload) => {
      if (!this.partyRoomId || !payload || payload.roomId !== this.partyRoomId) return;
      const fromUserId = String(payload.fromUserId || '');
      if (!fromUserId || fromUserId === this.partyUserId) return;

      if (event === 'webrtc:room_peer_ready') {
        const peerIsSpeaker = Boolean(payload.isSpeaker);
        // Only connect if at least one side is a speaker
        if (!this.partyIsSpeaker && !peerIsSpeaker) return;

        // Deterministic initiator: speaker initiates to listener; between two speakers, higher ID initiates
        const shouldInitiate =
          (this.partyIsSpeaker && !peerIsSpeaker) ||
          (this.partyIsSpeaker && peerIsSpeaker && String(this.partyUserId) > fromUserId);

        if (shouldInitiate) {
          void this.createPartyOffer(fromUserId);
        } else if (peerIsSpeaker && !this.partyIsSpeaker) {
          // Respond with listener presence so the remote speaker initiates an offer to us
          liveAndRoomService.sendSignal({
            signalType: 'webrtc:room_listener_hello',
            fromUserId: this.partyUserId!,
            targetUserId: fromUserId,
            roomId: this.partyRoomId,
            payload: { isSpeaker: false },
          });
        }
      } else if (event === 'webrtc:room_listener_hello') {
        if (this.partyIsSpeaker) {
          void this.createPartyOffer(fromUserId);
        }
      } else if (event === 'webrtc:room_offer' && payload.sdp) {
        void this.handlePartyOffer(fromUserId, payload.sdp);
      } else if (event === 'webrtc:room_answer' && payload.sdp) {
        void this.handlePartyAnswer(fromUserId, payload.sdp);
      } else if (event === 'webrtc:room_ice' && payload.candidate) {
        void this.handlePartyIce(fromUserId, payload.candidate);
      } else if (event === 'webrtc:room_peer_left') {
        this.closePartyPeer(fromUserId);
      }
    });

    this.announcePartyPresence();
    // Nudge discovery briefly after join so simultaneous room joiners never miss each other
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
    }, 2500);
  }

  public updatePartySpeakerRole(isSpeaker: boolean, localAudioStream: MediaStream | null) {
    if (!this.partyRoomId || !this.partyUserId) return;
    const roleChanged = this.partyIsSpeaker !== isSpeaker;
    this.partyIsSpeaker = isSpeaker;
    this.partyLocalStream = localAudioStream;

    if (!isSpeaker) {
      // Remove outbound audio tracks from existing peers (step down to listener)
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
        if (roleChanged) {
          // Re-announce as listener so speakers stay connected to us
          this.closePartyPeer(peerId);
        }
      });
    } else if (localAudioStream) {
      const audioTrack = localAudioStream.getAudioTracks()[0];
      if (audioTrack) {
        this.partyPeers.forEach((pc, peerId) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
          if (sender) {
            sender.replaceTrack(audioTrack).catch(() => {});
          } else {
            pc.addTrack(audioTrack, localAudioStream);
            void this.createPartyOffer(peerId);
          }
        });
      }
    }

    if (roleChanged) {
      this.announcePartyPresence();
    }
  }

  public setPartyMicMuted(muted: boolean) {
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
        audioEl.play().catch(() => {
          this.partyCallbacks?.onAutoplayBlocked?.();
        });
      }
    });
  }

  public resumePartyRemoteAudio() {
    this.partyRemoteAudioEls.forEach((audioEl) => {
      audioEl.muted = this.partySpeakerMuted;
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

  private setupPartyPeerConnection(peerId: string): RTCPeerConnection {
    this.closePartyPeer(peerId);
    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.partyPeers.set(peerId, pc);
    this.partyPendingIce.set(peerId, []);

    if (this.partyIsSpeaker && this.partyLocalStream) {
      this.partyLocalStream.getAudioTracks().forEach((track) => {
        if (this.partyLocalStream) {
          pc.addTrack(track, this.partyLocalStream);
        }
      });
    }

    pc.ontrack = (ev) => {
      const stream = ev.streams && ev.streams[0] ? ev.streams[0] : new MediaStream([ev.track]);
      this.attachRemotePartyAudio(peerId, stream);
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate && this.partyRoomId && this.partyUserId) {
        liveAndRoomService.sendSignal({
          signalType: 'webrtc:room_ice',
          fromUserId: this.partyUserId,
          targetUserId: peerId,
          roomId: this.partyRoomId,
          payload: { candidate: ev.candidate.toJSON() },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePartyPeer(peerId);
      }
    };

    return pc;
  }

  private async createPartyOffer(peerId: string) {
    if (!this.partyRoomId || !this.partyUserId) return;
    const pc = this.setupPartyPeerConnection(peerId);
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);
      liveAndRoomService.sendSignal({
        signalType: 'webrtc:room_offer',
        fromUserId: this.partyUserId,
        targetUserId: peerId,
        roomId: this.partyRoomId,
        payload: { sdp: pc.localDescription },
      });
    } catch (err) {
      console.warn('[WebRTC Party] Offer error:', err);
      this.closePartyPeer(peerId);
    }
  }

  private async handlePartyOffer(peerId: string, sdp: RTCSessionDescriptionInit) {
    if (!this.partyRoomId || !this.partyUserId) return;
    const pc = this.setupPartyPeerConnection(peerId);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const queued = this.partyPendingIce.get(peerId) || [];
      this.partyPendingIce.set(peerId, []);
      for (const cand of queued) {
        await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      liveAndRoomService.sendSignal({
        signalType: 'webrtc:room_answer',
        fromUserId: this.partyUserId,
        targetUserId: peerId,
        roomId: this.partyRoomId,
        payload: { sdp: pc.localDescription },
      });
    } catch (err) {
      console.warn('[WebRTC Party] Answer error:', err);
      this.closePartyPeer(peerId);
    }
  }

  private async handlePartyAnswer(peerId: string, sdp: RTCSessionDescriptionInit) {
    const pc = this.partyPeers.get(peerId);
    if (!pc) return;
    try {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
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

  private async handlePartyIce(peerId: string, candidate: RTCIceCandidateInit) {
    const pc = this.partyPeers.get(peerId);
    if (!pc) return;
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
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);
      this.partyRemoteAudioEls.set(peerId, audioEl);
    }
    audioEl.srcObject = stream;
    audioEl.muted = this.partySpeakerMuted;
    audioEl.play().catch(() => {
      this.partyCallbacks?.onAutoplayBlocked?.();
    });
    this.notifyPartySpeakers();
  }

  private closePartyPeer(peerId: string) {
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

  public stopPartyVoice() {
    if (this.partyPresenceTimer) {
      clearInterval(this.partyPresenceTimer);
      this.partyPresenceTimer = null;
    }
    if (this.partyUnsubscribe) {
      this.partyUnsubscribe();
      this.partyUnsubscribe = null;
    }
    if (this.partyRoomId && this.partyUserId) {
      liveAndRoomService.sendSignal({
        signalType: 'webrtc:room_peer_left',
        fromUserId: this.partyUserId,
        roomId: this.partyRoomId,
      });
    }
    Array.from(this.partyPeers.keys()).forEach((peerId) => this.closePartyPeer(peerId));
    this.partyPeers.clear();
    this.partyPendingIce.clear();
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
    this.partyLocalStream = null;
    this.partyCallbacks = null;
    this.partyRoomId = null;
    this.partyUserId = null;
    this.partyIsSpeaker = false;
  }
}

export const webrtcMediaService = new WebRtcMediaService();
