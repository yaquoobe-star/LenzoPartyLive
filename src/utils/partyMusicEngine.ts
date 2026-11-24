/**
 * Lenzo Party Live — Global Party Music Distribution Engine
 *
 * Handles Host-side audio capture, soft-limited mixing, local monitoring, and real-time
 * distribution over Agora RTC (primary) or WebRTC Party Voice Mesh (fallback) for:
 *  - Gallery Audio (MP3, AAC, M4A, WAV, OGG, FLAC, WEBM)
 *  - Gallery Video (MP4, MOV, WEBM, MKV, 3GP — audio-only extraction; video never shown to room)
 *
 * Music is injected digitally into the Party RTC audio stream so:
 *  1. Party Host hears it clearly without acoustic mic feedback.
 *  2. All seated Party Participants hear it alongside live voices.
 *  3. All non-seated Party Listeners subscribed to the room channel also hear it.
 *  4. Muting the Host's microphone never interrupts music playback.
 */

import AgoraRTC, { IBufferSourceAudioTrack } from 'agora-rtc-sdk-ng';
import { PartyMusicTrackMeta } from '../types';
import { agoraRtcService } from './agoraRtcService';
import { webrtcMediaService } from './webrtcMediaService';

export interface LocalPartyTrackEntry {
  meta: PartyMusicTrackMeta;
  file?: File;
  objectUrl?: string;
}

export interface PartyMusicEngineStatus {
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';
  activeTrackId: string | null;
  currentTimeSec: number;
  durationSec: number;
  volume: number; // 0..100
  transport: 'agora' | 'webrtc' | 'none';
  error: string | null;
}

type EngineListener = (state: PartyMusicEngineStatus) => void;
type TrackEndedListener = (trackId: string) => void;

const SUPPORTED_AUDIO_EXT = /\.(mp3|aac|m4a|wav|ogg|opus|flac|webm)$/i;
const SUPPORTED_VIDEO_EXT = /\.(mp4|mov|webm|mkv|m4v|3gp|avi)$/i;

export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;
  // Raw 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const vParam = url.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) return vParam;
      const segments = url.pathname.split('/').filter(Boolean);
      const markerIdx = segments.findIndex((s) => s === 'embed' || s === 'shorts' || s === 'live' || s === 'v');
      if (markerIdx >= 0 && segments[markerIdx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(segments[markerIdx + 1])) {
        return segments[markerIdx + 1];
      }
    }
  } catch {
    // Fallback regex
    const match = trimmed.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function validateGalleryMediaFile(
  file: File,
  kind: 'gallery_audio' | 'gallery_video'
): { valid: boolean; error?: string } {
  if (!file || file.size === 0) {
    return { valid: false, error: 'Selected file is empty or unreadable.' };
  }
  const type = (file.type || '').toLowerCase();
  const name = file.name || '';
  if (kind === 'gallery_audio') {
    const ok = type.startsWith('audio/') || SUPPORTED_AUDIO_EXT.test(name);
    if (!ok) {
      return {
        valid: false,
        error: `Unsupported audio format "${name}". Please choose MP3, AAC, M4A, WAV, OGG, or FLAC.`,
      };
    }
  } else {
    const ok = type.startsWith('video/') || SUPPORTED_VIDEO_EXT.test(name);
    if (!ok) {
      return {
        valid: false,
        error: `Unsupported video format "${name}". Please choose MP4, MOV, WEBM, MKV, or 3GP.`,
      };
    }
  }
  return { valid: true };
}

export function cleanFileTrackTitle(fileName: string): string {
  const withoutExt = (fileName || 'Untitled Track').replace(/\.[^/.]+$/, '');
  return withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 110) || 'Untitled Track';
}

class PartyMusicEngine {
  private audioCtx: AudioContext | null = null;
  private mediaEl: HTMLMediaElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;
  private localMonitorGain: GainNode | null = null;
  private broadcastGain: GainNode | null = null;
  private limiterNode: DynamicsCompressorNode | null = null;
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;
  private bufferSourceTrack: IBufferSourceAudioTrack | null = null;
  private activeObjectUrl: string | null = null;
  private progressTimer: ReturnType<typeof setInterval> | null = null;

  private state: PartyMusicEngineStatus = {
    status: 'idle',
    activeTrackId: null,
    currentTimeSec: 0,
    durationSec: 0,
    volume: 65,
    transport: 'none',
    error: null,
  };

  private listeners = new Set<EngineListener>();
  private endedListeners = new Set<TrackEndedListener>();

  public subscribe(cb: EngineListener): () => void {
    this.listeners.add(cb);
    cb({ ...this.state });
    return () => this.listeners.delete(cb);
  }

  public onTrackEnded(cb: TrackEndedListener): () => void {
    this.endedListeners.add(cb);
    return () => this.endedListeners.delete(cb);
  }

  public getState(): PartyMusicEngineStatus {
    return { ...this.state };
  }

  private emitState(patch: Partial<PartyMusicEngineStatus>) {
    this.state = { ...this.state, ...patch };
    const snap = { ...this.state };
    this.listeners.forEach((cb) => {
      try {
        cb(snap);
      } catch {
        // ignore
      }
    });
  }

  private ensureAudioGraph(): AudioContext {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) {
      throw new Error('Web Audio API is not available on this device.');
    }
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private clearProgressTimer() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private teardownCurrentNodes() {
    this.clearProgressTimer();

    if (this.bufferSourceTrack) {
      try {
        this.bufferSourceTrack.stopProcessAudioBuffer();
        this.bufferSourceTrack.stop();
        this.bufferSourceTrack.close();
      } catch {
        // ignore
      }
      this.bufferSourceTrack = null;
    }

    if (this.mediaSourceNode) {
      try {
        this.mediaSourceNode.disconnect();
      } catch {
        // ignore
      }
      this.mediaSourceNode = null;
    }
    if (this.localMonitorGain) {
      try {
        this.localMonitorGain.disconnect();
      } catch {
        // ignore
      }
      this.localMonitorGain = null;
    }
    if (this.broadcastGain) {
      try {
        this.broadcastGain.disconnect();
      } catch {
        // ignore
      }
      this.broadcastGain = null;
    }
    if (this.limiterNode) {
      try {
        this.limiterNode.disconnect();
      } catch {
        // ignore
      }
      this.limiterNode = null;
    }
    if (this.mediaStreamDest) {
      try {
        this.mediaStreamDest.stream.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      this.mediaStreamDest = null;
    }
    if (this.mediaEl) {
      try {
        this.mediaEl.onended = null;
        this.mediaEl.onerror = null;
        this.mediaEl.pause();
        this.mediaEl.removeAttribute('src');
        this.mediaEl.load();
        this.mediaEl.remove();
      } catch {
        // ignore
      }
      this.mediaEl = null;
    }
    if (this.activeObjectUrl) {
      try {
        URL.revokeObjectURL(this.activeObjectUrl);
      } catch {
        // ignore
      }
      this.activeObjectUrl = null;
    }
  }

  /**
   * Load and broadcast a local Gallery Audio or Gallery Video file into the active Party Room.
   * For Gallery Video, only the extracted audio track is routed and distributed; video is never displayed.
   */
  public async playLocalFile(params: {
    entry: LocalPartyTrackEntry;
    transport: 'agora' | 'webrtc' | 'connecting';
    volumePercent?: number;
    startPositionSec?: number;
  }): Promise<{ ok: boolean; durationSec: number; transport: 'agora' | 'webrtc' | 'none'; error?: string }> {
    const { entry, transport, volumePercent = this.state.volume, startPositionSec = 0 } = params;
    if (!entry.file) {
      const msg = 'Local media file is unavailable. Please re-select the file from Gallery.';
      this.emitState({ status: 'error', error: msg });
      return { ok: false, durationSec: 0, transport: 'none', error: msg };
    }

    const kind = entry.meta.sourceType === 'gallery_video' ? 'gallery_video' : 'gallery_audio';
    const validation = validateGalleryMediaFile(entry.file, kind);
    if (!validation.valid) {
      this.emitState({ status: 'error', error: validation.error || 'Unsupported media file.' });
      return { ok: false, durationSec: 0, transport: 'none', error: validation.error };
    }

    // Stop any previous broadcast cleanly
    await this.stop({ silentEmit: true });
    this.emitState({
      status: 'loading',
      activeTrackId: entry.meta.id,
      currentTimeSec: startPositionSec,
      volume: Math.max(0, Math.min(100, Math.round(volumePercent))),
      error: null,
    });

    const normalizedVol = Math.max(0, Math.min(1, volumePercent / 100));

    // Attempt 1: Web Audio MediaElement pipeline (works for BOTH Gallery Audio AND Gallery Video!)
    try {
      const ctx = this.ensureAudioGraph();
      const objectUrl = URL.createObjectURL(entry.file);
      this.activeObjectUrl = objectUrl;

      const mediaEl: HTMLMediaElement =
        kind === 'gallery_video'
          ? document.createElement('video')
          : document.createElement('audio');

      mediaEl.src = objectUrl;
      mediaEl.preload = 'auto';
      mediaEl.crossOrigin = 'anonymous';
      mediaEl.muted = false;
      mediaEl.volume = 1.0;
      if (kind === 'gallery_video') {
        const videoEl = mediaEl as HTMLVideoElement;
        videoEl.playsInline = true;
        videoEl.setAttribute('playsinline', 'true');
        videoEl.setAttribute('webkit-playsinline', 'true');
      }
      // Keep visually hidden (1x1 transparent offscreen) so Android WebView decodes audio reliably
      mediaEl.style.position = 'fixed';
      mediaEl.style.width = '1px';
      mediaEl.style.height = '1px';
      mediaEl.style.opacity = '0';
      mediaEl.style.pointerEvents = 'none';
      mediaEl.style.left = '-9999px';
      mediaEl.style.top = '-9999px';
      document.body.appendChild(mediaEl);
      this.mediaEl = mediaEl;

      // Wait for metadata so we get real duration & verify decodable media
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Media load timed out. Format may be unsupported.')), 12000);
        const onLoaded = () => {
          clearTimeout(timeout);
          mediaEl.removeEventListener('loadedmetadata', onLoaded);
          mediaEl.removeEventListener('error', onErr);
          resolve();
        };
        const onErr = () => {
          clearTimeout(timeout);
          mediaEl.removeEventListener('loadedmetadata', onLoaded);
          mediaEl.removeEventListener('error', onErr);
          reject(new Error('Unable to decode this media file. Try MP3, AAC, M4A, or MP4.'));
        };
        if (mediaEl.readyState >= 1) {
          onLoaded();
        } else {
          mediaEl.addEventListener('loadedmetadata', onLoaded);
          mediaEl.addEventListener('error', onErr);
          mediaEl.load();
        }
      });

      const durationSec = Number.isFinite(mediaEl.duration) && mediaEl.duration > 0 ? mediaEl.duration : 0;
      if (startPositionSec > 0 && durationSec > 0) {
        mediaEl.currentTime = Math.min(durationSec - 0.5, startPositionSec);
      }

      // Build Web Audio graph with anti-clipping limiter and independent Host monitor + RTC broadcast gains
      const sourceNode = ctx.createMediaElementSource(mediaEl);
      const localMonitorGain = ctx.createGain();
      // Slightly attenuated local monitor (0.85x) avoids acoustic bleed into Host mic on speakerphone
      localMonitorGain.gain.value = normalizedVol * 0.85;

      const broadcastGain = ctx.createGain();
      broadcastGain.gain.value = normalizedVol;

      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -5;
      limiter.knee.value = 10;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.15;

      const dest = ctx.createMediaStreamDestination();

      sourceNode.connect(localMonitorGain);
      localMonitorGain.connect(ctx.destination);

      sourceNode.connect(broadcastGain);
      broadcastGain.connect(limiter);
      limiter.connect(dest);

      this.mediaSourceNode = sourceNode;
      this.localMonitorGain = localMonitorGain;
      this.broadcastGain = broadcastGain;
      this.limiterNode = limiter;
      this.mediaStreamDest = dest;

      const musicTrack = dest.stream.getAudioTracks()[0];
      if (!musicTrack || musicTrack.readyState !== 'live') {
        throw new Error('Could not capture live audio stream from selected file.');
      }

      // Start playback BEFORE publishing so audio frames are flowing immediately
      await mediaEl.play();

      // Publish music track into active RTC transport
      let activeTransport: 'agora' | 'webrtc' | 'none' = 'none';
      if (transport === 'agora' || agoraRtcService.getConnectionState() === 'CONNECTED') {
        const published = await agoraRtcService.publishMusicAudioTrack(musicTrack);
        if (published) {
          activeTransport = 'agora';
        }
      }
      if (activeTransport === 'none' && transport === 'webrtc') {
        webrtcMediaService.setPartyMusicTrack(musicTrack, volumePercent);
        activeTransport = 'webrtc';
      }

      if (activeTransport === 'none') {
        // Fallback: if Agora wasn't connected yet, still try WebRTC if active or return clear error
        if (agoraRtcService.getConnectionState() !== 'CONNECTED' && transport !== 'webrtc') {
          this.teardownCurrentNodes();
          const msg = 'Party audio channel is not connected yet. Please wait a moment and try again.';
          this.emitState({ status: 'error', error: msg, transport: 'none' });
          return { ok: false, durationSec: 0, transport: 'none', error: msg };
        }
      }

      mediaEl.onended = () => {
        const finishedId = entry.meta.id;
        this.emitState({ status: 'stopped', currentTimeSec: durationSec });
        this.endedListeners.forEach((cb) => cb(finishedId));
      };

      mediaEl.onerror = () => {
        const errMsg = 'Playback interrupted due to a media decoding error.';
        this.emitState({ status: 'error', error: errMsg });
      };

      this.startProgressPolling();
      this.emitState({
        status: 'playing',
        activeTrackId: entry.meta.id,
        currentTimeSec: mediaEl.currentTime || startPositionSec,
        durationSec,
        volume: Math.round(volumePercent),
        transport: activeTransport,
        error: null,
      });

      return { ok: true, durationSec, transport: activeTransport };
    } catch (primaryErr: any) {
      // Attempt 2 (Audio files on Agora): Agora native createBufferSourceAudioTrack fallback
      if (kind === 'gallery_audio' && (transport === 'agora' || agoraRtcService.getConnectionState() === 'CONNECTED')) {
        try {
          this.teardownCurrentNodes();
          const bufferTrack = await AgoraRTC.createBufferSourceAudioTrack({
            source: entry.file,
            encoderConfig: 'music_standard',
          });
          bufferTrack.setVolume(Math.max(0, Math.min(100, Math.round(volumePercent))));
          const published = await agoraRtcService.publishMusicBufferTrack(bufferTrack);
          if (!published) {
            bufferTrack.close();
            throw new Error('Could not publish audio buffer track to Agora channel.');
          }
          bufferTrack.startProcessAudioBuffer({ loop: false });
          bufferTrack.play(); // Local Host monitoring
          if (startPositionSec > 0 && bufferTrack.duration > 0) {
            bufferTrack.seekAudioBuffer(Math.min(bufferTrack.duration - 0.5, startPositionSec));
          }
          bufferTrack.on('source-state-change', (currentState: string) => {
            if (currentState === 'stopped') {
              const finishedId = entry.meta.id;
              this.emitState({ status: 'stopped', currentTimeSec: bufferTrack.duration || 0 });
              this.endedListeners.forEach((cb) => cb(finishedId));
            }
          });
          this.bufferSourceTrack = bufferTrack;
          this.startProgressPolling();
          const durationSec = bufferTrack.duration || 0;
          this.emitState({
            status: 'playing',
            activeTrackId: entry.meta.id,
            currentTimeSec: startPositionSec,
            durationSec,
            volume: Math.round(volumePercent),
            transport: 'agora',
            error: null,
          });
          return { ok: true, durationSec, transport: 'agora' };
        } catch (fallbackErr: any) {
          this.teardownCurrentNodes();
          const msg = fallbackErr?.message || primaryErr?.message || 'Failed to play selected audio file.';
          this.emitState({ status: 'error', error: msg, transport: 'none' });
          return { ok: false, durationSec: 0, transport: 'none', error: msg };
        }
      }

      this.teardownCurrentNodes();
      const msg = primaryErr?.message || 'Unable to play selected media file.';
      this.emitState({ status: 'error', error: msg, transport: 'none' });
      return { ok: false, durationSec: 0, transport: 'none', error: msg };
    }
  }

  private startProgressPolling() {
    this.clearProgressTimer();
    this.progressTimer = setInterval(() => {
      if (this.state.status !== 'playing') return;
      if (this.mediaEl) {
        const cur = Number.isFinite(this.mediaEl.currentTime) ? this.mediaEl.currentTime : 0;
        const dur = Number.isFinite(this.mediaEl.duration) ? this.mediaEl.duration : this.state.durationSec;
        this.emitState({ currentTimeSec: cur, durationSec: dur });
      } else if (this.bufferSourceTrack) {
        const cur = this.bufferSourceTrack.getCurrentTime() || 0;
        const dur = this.bufferSourceTrack.duration || this.state.durationSec;
        this.emitState({ currentTimeSec: cur, durationSec: dur });
      }
    }, 500);
  }

  public async pause(): Promise<number> {
    let pos = this.state.currentTimeSec;
    if (this.mediaEl) {
      this.mediaEl.pause();
      pos = Number.isFinite(this.mediaEl.currentTime) ? this.mediaEl.currentTime : pos;
    } else if (this.bufferSourceTrack) {
      this.bufferSourceTrack.pauseProcessAudioBuffer();
      pos = this.bufferSourceTrack.getCurrentTime() || pos;
    }
    await agoraRtcService.setMusicTrackEnabled(false);
    this.emitState({ status: 'paused', currentTimeSec: pos });
    return pos;
  }

  public async resume(): Promise<number> {
    let pos = this.state.currentTimeSec;
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume().catch(() => {});
    }
    await agoraRtcService.setMusicTrackEnabled(true);
    if (this.mediaEl) {
      await this.mediaEl.play();
      pos = Number.isFinite(this.mediaEl.currentTime) ? this.mediaEl.currentTime : pos;
    } else if (this.bufferSourceTrack) {
      this.bufferSourceTrack.resumeProcessAudioBuffer();
      pos = this.bufferSourceTrack.getCurrentTime() || pos;
    }
    this.startProgressPolling();
    this.emitState({ status: 'playing', currentTimeSec: pos, error: null });
    return pos;
  }

  public seek(positionSec: number): number {
    const safePos = Math.max(0, Math.min(this.state.durationSec || positionSec, positionSec));
    if (this.mediaEl) {
      this.mediaEl.currentTime = safePos;
    } else if (this.bufferSourceTrack) {
      this.bufferSourceTrack.seekAudioBuffer(safePos);
    }
    this.emitState({ currentTimeSec: safePos });
    return safePos;
  }

  public setVolume(volumePercent: number): void {
    const clamped = Math.max(0, Math.min(100, Math.round(volumePercent)));
    const normalized = clamped / 100;
    if (this.localMonitorGain) {
      this.localMonitorGain.gain.value = normalized * 0.85;
    }
    if (this.broadcastGain) {
      this.broadcastGain.gain.value = normalized;
    }
    if (this.bufferSourceTrack) {
      this.bufferSourceTrack.setVolume(clamped);
    }
    webrtcMediaService.setPartyMusicVolume(clamped);
    this.emitState({ volume: clamped });
  }

  public setLocalHostMuted(muted: boolean): void {
    if (this.localMonitorGain) {
      this.localMonitorGain.gain.value = muted ? 0 : (this.state.volume / 100) * 0.85;
    }
  }

  public async stop(options?: { silentEmit?: boolean }): Promise<void> {
    await agoraRtcService.unpublishMusicAudioTrack().catch(() => {});
    webrtcMediaService.setPartyMusicTrack(null);
    this.teardownCurrentNodes();
    if (!options?.silentEmit) {
      this.emitState({
        status: 'stopped',
        activeTrackId: null,
        currentTimeSec: 0,
        durationSec: 0,
        transport: 'none',
        error: null,
      });
    }
  }

  public async dispose(): Promise<void> {
    await this.stop();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        await this.audioCtx.close();
      } catch {
        // ignore
      }
      this.audioCtx = null;
    }
  }
}

export const partyMusicEngine = new PartyMusicEngine();
