/**
 * Lenzo Party Live — Global Party Music Distribution Engine
 *
 * Handles Host-side media validation, codec/container inspection, resilient multi-stage decoding,
 * soft-limited mixing, local monitoring, and real-time distribution over Agora RTC (primary)
 * or WebRTC Party Voice Mesh (fallback) for:
 *  - Gallery Audio (MP3, AAC, M4A, WAV, OGG, FLAC, WEBM)
 *  - Gallery Video (MP4, MOV, WEBM, MKV, 3GP — audio-only extraction; video never shown to room)
 *
 * Decoding Pipeline (fixes Android WebView blob/crossOrigin/content:// & HEVC video decode errors):
 *  - Stage 1: Native Android MediaExtractor+MediaMuxer (pre-extracted audio-only .m4a/.webm from content:// URI)
 *             or File bytes -> Magic-byte container validation -> Web Audio decodeAudioData() -> AudioBufferSourceNode
 *  - Stage 2: Streaming HTMLMediaElement fallback (for >50MB files or streaming containers) WITHOUT invalid
 *             crossOrigin='anonymous' on blob:/same-origin URLs, with canonicalized MIME Blob & captureStream fallback
 *  - Stage 3: Agora native createBufferSourceAudioTrack fallback for audio files on Agora transport
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
  /** Resolved Capacitor WebView URL (https://localhost/_capacitor_file_/...) from native Android picker */
  nativeFileUrl?: string;
  /** Native Android MediaExtractor-verified audio codec (e.g. audio/mp4a-latm, audio/mpeg) */
  audioCodec?: string;
  /** True if Android MediaMuxer already extracted audio-only track from a Gallery Video */
  extractedAudioOnly?: boolean;
  fileSize?: number;
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

export interface MediaHeaderInspection {
  valid: boolean;
  detectedContainer: string;
  canonicalMime: string;
  error?: string;
}

type EngineListener = (state: PartyMusicEngineStatus) => void;
type TrackEndedListener = (trackId: string) => void;

const SUPPORTED_AUDIO_EXT = /\.(mp3|aac|m4a|wav|ogg|opus|flac|webm|3gp|amr)$/i;
const SUPPORTED_VIDEO_EXT = /\.(mp4|mov|webm|mkv|m4v|3gp|3gpp)$/i;
const MAX_DECODE_AUDIO_DATA_BYTES = 50 * 1024 * 1024; // 50 MB safe threshold for in-memory PCM decode

/**
 * Strictly parses supported YouTube URLs and returns the 11-character Video ID, or null if invalid.
 * Supported:
 *  - https://www.youtube.com/watch?v=VIDEO_ID
 *  - https://youtu.be/VIDEO_ID
 *  - https://m.youtube.com/watch?v=VIDEO_ID
 *  - https://music.youtube.com/watch?v=VIDEO_ID
 *  - https://www.youtube.com/shorts/VIDEO_ID
 *  - https://www.youtube.com/live/VIDEO_ID
 *  - https://www.youtube.com/embed/VIDEO_ID
 *  - Share URLs with ?si=, &t=, &list=, &feature=share, etc.
 */
export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;

  // Reject bare non-URL words (e.g. "invalidlink") so invalid input always reports an error
  const looksLikeYouTubeUrl = /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(trimmed);
  if (!looksLikeYouTubeUrl) {
    return null;
  }

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    const isAllowedYtHost =
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com' ||
      host === 'youtube-nocookie.com' ||
      host.endsWith('.youtube.com');

    if (isAllowedYtHost) {
      const vParam = url.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
        return vParam;
      }
      const segments = url.pathname.split('/').filter(Boolean);
      const markerIdx = segments.findIndex((s) =>
        ['embed', 'shorts', 'live', 'v', 'e'].includes(s.toLowerCase())
      );
      if (
        markerIdx >= 0 &&
        segments[markerIdx + 1] &&
        /^[a-zA-Z0-9_-]{11}$/.test(segments[markerIdx + 1])
      ) {
        return segments[markerIdx + 1];
      }
    }
  } catch {
    const match = trimmed.match(
      /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
    );
    if (match?.[1]) return match[1];
  }
  return null;
}

export function canonicalizeMimeType(
  rawMime: string | undefined,
  fileName: string,
  kind: 'gallery_audio' | 'gallery_video'
): string {
  const lowerMime = (rawMime || '').trim().toLowerCase();
  const lowerName = (fileName || '').trim().toLowerCase();

  // Fix common Android WebView / OEM non-standard MIME types
  if (lowerMime === 'audio/mp3' || lowerMime === 'audio/x-mp3' || lowerName.endsWith('.mp3')) {
    return 'audio/mpeg';
  }
  if (
    lowerMime === 'audio/x-m4a' ||
    lowerMime === 'audio/m4a' ||
    lowerMime === 'audio/mp4a-latm' ||
    lowerName.endsWith('.m4a')
  ) {
    return 'audio/mp4';
  }
  if (lowerMime === 'audio/aac' || lowerMime === 'audio/x-aac' || lowerName.endsWith('.aac')) {
    return 'audio/aac';
  }
  if (lowerMime === 'audio/x-wav' || lowerMime === 'audio/wave' || lowerName.endsWith('.wav')) {
    return 'audio/wav';
  }
  if (lowerMime === 'audio/x-flac' || lowerName.endsWith('.flac')) {
    return 'audio/flac';
  }
  if (lowerName.endsWith('.ogg') || lowerName.endsWith('.opus')) {
    return 'audio/ogg';
  }
  if (lowerName.endsWith('.mp4') || lowerName.endsWith('.m4v')) {
    return kind === 'gallery_video' ? 'video/mp4' : 'audio/mp4';
  }
  if (lowerName.endsWith('.mov')) {
    return 'video/mp4';
  }
  if (lowerName.endsWith('.webm')) {
    return kind === 'gallery_video' ? 'video/webm' : 'audio/webm';
  }
  if (lowerName.endsWith('.3gp') || lowerName.endsWith('.3gpp')) {
    return kind === 'gallery_video' ? 'video/3gpp' : 'audio/3gpp';
  }
  if (lowerName.endsWith('.mkv')) {
    return 'video/x-matroska';
  }

  if (lowerMime && lowerMime !== 'application/octet-stream') {
    return lowerMime;
  }
  return kind === 'gallery_video' ? 'video/mp4' : 'audio/mpeg';
}

/**
 * Inspects actual container magic bytes to verify media integrity & codec container
 * rather than blindly trusting Android/browser file extensions or MIME strings.
 */
export function inspectMediaContainerHeader(
  bytes: Uint8Array,
  fileName: string,
  rawMime: string,
  kind: 'gallery_audio' | 'gallery_video'
): MediaHeaderInspection {
  if (!bytes || bytes.length < 12) {
    return {
      valid: false,
      detectedContainer: 'empty',
      canonicalMime: '',
      error: 'Selected file is empty or too short to be valid media.',
    };
  }

  // Check if entire header is zero-filled (corrupted/truncated file)
  let nonZeroFound = false;
  const checkLen = Math.min(bytes.length, 64);
  for (let i = 0; i < checkLen; i++) {
    if (bytes[i] !== 0) {
      nonZeroFound = true;
      break;
    }
  }
  if (!nonZeroFound) {
    return {
      valid: false,
      detectedContainer: 'zeroed',
      canonicalMime: '',
      error: 'Selected media file appears corrupted or empty.',
    };
  }

  const b0 = bytes[0];
  const b1 = bytes[1];
  const b2 = bytes[2];
  const b3 = bytes[3];
  const ascii4 = String.fromCharCode(b0, b1, b2, b3);
  const ftyp4 = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);

  // Explicitly reject non-media documents/images masquerading with wrong extensions
  if (ascii4 === '%PDF') {
    return {
      valid: false,
      detectedContainer: 'pdf',
      canonicalMime: 'application/pdf',
      error: 'Selected file is a PDF document, not playable audio or video.',
    };
  }
  if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) {
    return {
      valid: false,
      detectedContainer: 'png',
      canonicalMime: 'image/png',
      error: 'Selected file is an image (PNG), not playable audio or video.',
    };
  }
  if (b0 === 0xff && b1 === 0xd8 && b2 === 0xff) {
    return {
      valid: false,
      detectedContainer: 'jpeg',
      canonicalMime: 'image/jpeg',
      error: 'Selected file is an image (JPEG), not playable audio or video.',
    };
  }
  if (b0 === 0x50 && b1 === 0x4b && b2 === 0x03 && b3 === 0x04) {
    return {
      valid: false,
      detectedContainer: 'zip',
      canonicalMime: 'application/zip',
      error: 'Selected file is an archive (ZIP), not playable audio or video.',
    };
  }
  if (b0 === 0x30 && b1 === 0x26 && b2 === 0xb2 && b3 === 0x75) {
    return {
      valid: false,
      detectedContainer: 'asf',
      canonicalMime: 'audio/x-ms-wma',
      error: 'WMA/WMV (ASF) format is not supported on Android WebView. Please choose MP3, AAC, M4A, WAV, or MP4.',
    };
  }

  // MP3 with ID3 tag
  if (b0 === 0x49 && b1 === 0x44 && b2 === 0x33) {
    return { valid: true, detectedContainer: 'mp3_id3', canonicalMime: 'audio/mpeg' };
  }
  // Raw ADTS AAC frame sync (0xFFF1 or 0xFFF9)
  if (b0 === 0xff && (b1 === 0xf1 || b1 === 0xf9)) {
    return { valid: true, detectedContainer: 'aac_adts', canonicalMime: 'audio/aac' };
  }
  // Raw MP3 / MPEG audio frame sync (0xFF 0xE0..0xFF)
  if (b0 === 0xff && (b1 & 0xe0) === 0xe0) {
    return { valid: true, detectedContainer: 'mp3_frame', canonicalMime: 'audio/mpeg' };
  }
  // ISO BMFF (MP4 / M4A / MOV / 3GP)
  if (ftyp4 === 'ftyp') {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).trim();
    const isAudioBrand = brand === 'M4A' || brand === 'M4B' || brand === 'mp4a';
    return {
      valid: true,
      detectedContainer: `iso_bmff_${brand || 'mp4'}`,
      canonicalMime: isAudioBrand || kind === 'gallery_audio' ? 'audio/mp4' : 'video/mp4',
    };
  }
  // WAV (RIFF....WAVE)
  if (
    ascii4 === 'RIFF' &&
    String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === 'WAVE'
  ) {
    return { valid: true, detectedContainer: 'wav', canonicalMime: 'audio/wav' };
  }
  // OGG / Opus
  if (ascii4 === 'OggS') {
    return { valid: true, detectedContainer: 'ogg', canonicalMime: 'audio/ogg' };
  }
  // FLAC
  if (ascii4 === 'fLaC') {
    return { valid: true, detectedContainer: 'flac', canonicalMime: 'audio/flac' };
  }
  // WebM / Matroska (EBML)
  if (b0 === 0x1a && b1 === 0x45 && b2 === 0xdf && b3 === 0xa3) {
    return {
      valid: true,
      detectedContainer: 'ebml_webm_mkv',
      canonicalMime: kind === 'gallery_video' ? 'video/webm' : 'audio/webm',
    };
  }
  // AMR
  if (ascii4 === '#!AM') {
    return { valid: true, detectedContainer: 'amr', canonicalMime: 'audio/amr' };
  }

  // Fallback to canonicalized MIME if extension/MIME looks valid (some MP3s have leading padding)
  const fallbackMime = canonicalizeMimeType(rawMime, fileName, kind);
  return {
    valid: true,
    detectedContainer: 'unknown_media',
    canonicalMime: fallbackMime,
  };
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
  // Note: Android content:// pickers sometimes provide empty type ("") or "application/octet-stream"
  // even for valid MP3/M4A/MP4 files; accept valid extensions or audio/video MIME prefixes.
  if (kind === 'gallery_audio') {
    const ok =
      type.startsWith('audio/') ||
      type === 'video/mp4' || // some Android pickers tag .m4a as video/mp4
      SUPPORTED_AUDIO_EXT.test(name);
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

function decodeAudioDataSafe(ctx: AudioContext, arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise<AudioBuffer>((resolve, reject) => {
    try {
      const maybePromise = ctx.decodeAudioData(
        arrayBuffer,
        (decoded) => resolve(decoded),
        (err) => reject(err || new Error('Audio codec decode failed'))
      );
      if (maybePromise && typeof (maybePromise as Promise<AudioBuffer>).then === 'function') {
        (maybePromise as Promise<AudioBuffer>).then(resolve).catch(reject);
      }
    } catch (err) {
      reject(err);
    }
  });
}

function describeMediaElementError(mediaEl: HTMLMediaElement, kind: 'gallery_audio' | 'gallery_video'): string {
  const err = mediaEl.error;
  if (!err) {
    return 'Unable to decode this media file. Try MP3, AAC, M4A, WAV, or MP4 (AAC audio).';
  }
  switch (err.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return 'Media loading was interrupted before playback started.';
    case MediaError.MEDIA_ERR_NETWORK:
      return 'Unable to read the media file from device storage. Please re-select the file.';
    case MediaError.MEDIA_ERR_DECODE:
      return kind === 'gallery_video'
        ? 'This video codec or audio track could not be decoded on this device. Try an MP4 (H.264 + AAC) video or MP3/M4A audio.'
        : 'This audio file appears corrupted or uses an unsupported codec. Try MP3, AAC, M4A, WAV, OGG, or FLAC.';
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return kind === 'gallery_video'
        ? 'This video container or audio codec is not supported. Try MP4 (AAC audio), WEBM, or MOV.'
        : 'This audio format is not supported by the device decoder. Try MP3, AAC, M4A, WAV, OGG, or FLAC.';
    default:
      return 'Unable to decode this media file. Try MP3, AAC, M4A, WAV, or MP4.';
  }
}

class PartyMusicEngine {
  private audioCtx: AudioContext | null = null;

  // Stage 1: Decoded PCM AudioBuffer pipeline (immune to Android WebView blob/crossOrigin/HEVC errors)
  private decodedBuffer: AudioBuffer | null = null;
  private bufferSourceNode: AudioBufferSourceNode | null = null;
  private bufferStartedAtCtxTime = 0;
  private bufferPausedOffsetSec = 0;
  private activePlaybackToken = 0;

  // Stage 2: Streaming HTMLMediaElement fallback
  private mediaEl: HTMLMediaElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;

  // Shared Web Audio routing graph
  private localMonitorGain: GainNode | null = null;
  private broadcastGain: GainNode | null = null;
  private limiterNode: DynamicsCompressorNode | null = null;
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;

  // Stage 3: Agora native buffer track fallback
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

  private createSharedRoutingGraph(ctx: AudioContext, normalizedVol: number): MediaStreamTrack {
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

    localMonitorGain.connect(ctx.destination);
    broadcastGain.connect(limiter);
    limiter.connect(dest);

    this.localMonitorGain = localMonitorGain;
    this.broadcastGain = broadcastGain;
    this.limiterNode = limiter;
    this.mediaStreamDest = dest;

    const musicTrack = dest.stream.getAudioTracks()[0];
    if (!musicTrack || musicTrack.readyState !== 'live') {
      throw new Error('Could not capture live audio stream from selected file.');
    }
    return musicTrack;
  }

  private clearProgressTimer() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private stopBufferSourceNodeOnly() {
    if (this.bufferSourceNode) {
      try {
        this.bufferSourceNode.onended = null;
        this.bufferSourceNode.stop();
        this.bufferSourceNode.disconnect();
      } catch {
        // ignore
      }
      this.bufferSourceNode = null;
    }
  }

  private spawnBufferSourceAt(offsetSec: number, trackId: string, token: number) {
    if (!this.audioCtx || !this.decodedBuffer || !this.localMonitorGain || !this.broadcastGain) {
      return;
    }
    this.stopBufferSourceNodeOnly();

    const safeOffset = Math.max(0, Math.min(this.decodedBuffer.duration - 0.05, offsetSec));
    const src = this.audioCtx.createBufferSource();
    src.buffer = this.decodedBuffer;
    src.connect(this.localMonitorGain);
    src.connect(this.broadcastGain);

    this.bufferPausedOffsetSec = safeOffset;
    this.bufferStartedAtCtxTime = this.audioCtx.currentTime;
    this.bufferSourceNode = src;

    src.onended = () => {
      // Only treat as natural end if this node is still the active playing node
      if (this.activePlaybackToken !== token || this.bufferSourceNode !== src) {
        return;
      }
      if (this.state.status !== 'playing') {
        return;
      }
      const dur = this.decodedBuffer?.duration || this.state.durationSec;
      this.bufferSourceNode = null;
      this.bufferPausedOffsetSec = dur;
      this.emitState({ status: 'stopped', currentTimeSec: dur });
      this.endedListeners.forEach((cb) => cb(trackId));
    };

    src.start(0, safeOffset);
  }

  private teardownCurrentNodes() {
    this.activePlaybackToken += 1;
    this.clearProgressTimer();
    this.stopBufferSourceNodeOnly();
    this.decodedBuffer = null;
    this.bufferPausedOffsetSec = 0;
    this.bufferStartedAtCtxTime = 0;

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

  private async publishMusicTrackToRtc(
    musicTrack: MediaStreamTrack,
    transport: 'agora' | 'webrtc' | 'connecting',
    volumePercent: number
  ): Promise<'agora' | 'webrtc' | 'none'> {
    if (transport === 'agora' || agoraRtcService.getConnectionState() === 'CONNECTED') {
      const published = await agoraRtcService.publishMusicAudioTrack(musicTrack);
      if (published) {
        return 'agora';
      }
    }
    if (transport === 'webrtc') {
      webrtcMediaService.setPartyMusicTrack(musicTrack, volumePercent);
      return 'webrtc';
    }
    return 'none';
  }

  private async readEntryArrayBuffer(entry: LocalPartyTrackEntry): Promise<ArrayBuffer | null> {
    if (entry.file) {
      if (entry.file.size > MAX_DECODE_AUDIO_DATA_BYTES) {
        return null; // Use streaming Stage 2 for >50MB files
      }
      return await entry.file.arrayBuffer();
    }
    if (entry.nativeFileUrl) {
      if (entry.fileSize && entry.fileSize > MAX_DECODE_AUDIO_DATA_BYTES) {
        return null;
      }
      const res = await fetch(entry.nativeFileUrl);
      if (!res.ok) {
        throw new Error(`Unable to read selected Android media file (HTTP ${res.status}).`);
      }
      return await res.arrayBuffer();
    }
    return null;
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
    if (!entry.file && !entry.nativeFileUrl) {
      const msg = 'Local media file is unavailable. Please re-select the file from Gallery.';
      this.emitState({ status: 'error', error: msg });
      return { ok: false, durationSec: 0, transport: 'none', error: msg };
    }

    const kind = entry.meta.sourceType === 'gallery_video' ? 'gallery_video' : 'gallery_audio';
    if (entry.file) {
      const validation = validateGalleryMediaFile(entry.file, kind);
      if (!validation.valid) {
        this.emitState({ status: 'error', error: validation.error || 'Unsupported media file.' });
        return { ok: false, durationSec: 0, transport: 'none', error: validation.error };
      }
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
    const fileName = entry.file?.name || entry.meta.title || 'media';
    const rawMime = entry.file?.type || entry.meta.mimeType || '';
    let canonicalMime = canonicalizeMimeType(rawMime, fileName, kind);
    let stage1Error: string | null = null;

    // -------------------------------------------------------------------------
    // STAGE 1: Real Magic-Byte Verification + Web Audio decodeAudioData() -> PCM AudioBufferSourceNode
    // Works reliably for MP3, AAC, M4A, WAV, OGG, FLAC, native-extracted video audio (.m4a),
    // AND direct MP4/MOV/WEBM audio extraction without Android WebView blob/crossOrigin/HEVC errors!
    // -------------------------------------------------------------------------
    try {
      const rawBuffer = await this.readEntryArrayBuffer(entry);
      if (rawBuffer && rawBuffer.byteLength > 0) {
        const headerInspect = inspectMediaContainerHeader(
          new Uint8Array(rawBuffer, 0, Math.min(64, rawBuffer.byteLength)),
          fileName,
          rawMime,
          kind
        );
        if (!headerInspect.valid) {
          const msg = headerInspect.error || 'Unsupported or corrupted media file.';
          this.emitState({ status: 'error', error: msg, transport: 'none' });
          return { ok: false, durationSec: 0, transport: 'none', error: msg };
        }
        canonicalMime = headerInspect.canonicalMime || canonicalMime;

        const ctx = this.ensureAudioGraph();
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }
        // Pass a copy so rawBuffer remains intact if fallback Stage 2 is needed
        const audioBuffer = await decodeAudioDataSafe(ctx, rawBuffer.slice(0));
        if (!audioBuffer || audioBuffer.duration <= 0 || audioBuffer.numberOfChannels === 0) {
          throw new Error(
            kind === 'gallery_video'
              ? 'Selected video contains no playable audio track.'
              : 'Decoded audio contains no sound channels.'
          );
        }

        const musicTrack = this.createSharedRoutingGraph(ctx, normalizedVol);
        const activeTransport = await this.publishMusicTrackToRtc(musicTrack, transport, volumePercent);
        if (activeTransport === 'none' && agoraRtcService.getConnectionState() !== 'CONNECTED') {
          this.teardownCurrentNodes();
          const msg = 'Party audio channel is not connected yet. Please wait a moment and try again.';
          this.emitState({ status: 'error', error: msg, transport: 'none' });
          return { ok: false, durationSec: 0, transport: 'none', error: msg };
        }

        this.decodedBuffer = audioBuffer;
        const token = ++this.activePlaybackToken;
        this.spawnBufferSourceAt(startPositionSec, entry.meta.id, token);
        this.startProgressPolling();

        const durationSec = audioBuffer.duration;
        this.emitState({
          status: 'playing',
          activeTrackId: entry.meta.id,
          currentTimeSec: Math.min(durationSec, Math.max(0, startPositionSec)),
          durationSec,
          volume: Math.round(volumePercent),
          transport: activeTransport,
          error: null,
        });
        return { ok: true, durationSec, transport: activeTransport };
      }
    } catch (err: any) {
      stage1Error = err?.message || 'Direct audio decode fallback triggered';
      this.teardownCurrentNodes();
    }

    // -------------------------------------------------------------------------
    // STAGE 2: Streaming HTMLMediaElement fallback (for >50MB files or streaming containers)
    // CRITICAL FIX: NEVER set crossOrigin='anonymous' on blob: or same-origin _capacitor_file_ URLs!
    // -------------------------------------------------------------------------
    let stage2Error: string | null = null;
    try {
      const ctx = this.ensureAudioGraph();
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }

      let mediaSrcUrl: string;
      if (entry.nativeFileUrl) {
        mediaSrcUrl = entry.nativeFileUrl;
      } else if (entry.file) {
        // Re-wrap with canonical MIME so Android WebView doesn't choke on empty or audio/x-m4a types
        const typedBlob = new Blob([entry.file], { type: canonicalMime });
        mediaSrcUrl = URL.createObjectURL(typedBlob);
        this.activeObjectUrl = mediaSrcUrl;
      } else {
        throw new Error('No playable source available for this track.');
      }

      const useAudioElement = kind === 'gallery_audio' || Boolean(entry.extractedAudioOnly);
      const mediaEl: HTMLMediaElement = useAudioElement
        ? document.createElement('audio')
        : document.createElement('video');

      // Do NOT set mediaEl.crossOrigin = 'anonymous' on blob: or local Capacitor URLs!
      mediaEl.preload = 'auto';
      mediaEl.muted = false;
      mediaEl.volume = 1.0;
      if (!useAudioElement) {
        const videoEl = mediaEl as HTMLVideoElement;
        videoEl.playsInline = true;
        videoEl.setAttribute('playsinline', 'true');
        videoEl.setAttribute('webkit-playsinline', 'true');
      }
      mediaEl.style.position = 'fixed';
      mediaEl.style.width = '1px';
      mediaEl.style.height = '1px';
      mediaEl.style.opacity = '0';
      mediaEl.style.pointerEvents = 'none';
      mediaEl.style.left = '-9999px';
      mediaEl.style.top = '-9999px';
      mediaEl.src = mediaSrcUrl;
      document.body.appendChild(mediaEl);
      this.mediaEl = mediaEl;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Media load timed out. The file codec may be unsupported.')),
          15000
        );
        const cleanupListeners = () => {
          clearTimeout(timeout);
          mediaEl.removeEventListener('loadedmetadata', onLoaded);
          mediaEl.removeEventListener('canplay', onLoaded);
          mediaEl.removeEventListener('error', onErr);
        };
        const onLoaded = () => {
          cleanupListeners();
          resolve();
        };
        const onErr = () => {
          cleanupListeners();
          reject(new Error(describeMediaElementError(mediaEl, kind)));
        };
        if (mediaEl.readyState >= 1) {
          onLoaded();
        } else {
          mediaEl.addEventListener('loadedmetadata', onLoaded);
          mediaEl.addEventListener('canplay', onLoaded);
          mediaEl.addEventListener('error', onErr);
          mediaEl.load();
        }
      });

      const durationSec =
        Number.isFinite(mediaEl.duration) && mediaEl.duration > 0
          ? mediaEl.duration
          : entry.meta.durationSec || 0;
      if (startPositionSec > 0 && durationSec > 0) {
        mediaEl.currentTime = Math.min(durationSec - 0.5, startPositionSec);
      }

      const musicTrack = this.createSharedRoutingGraph(ctx, normalizedVol);
      const sourceNode = ctx.createMediaElementSource(mediaEl);
      sourceNode.connect(this.localMonitorGain!);
      sourceNode.connect(this.broadcastGain!);
      this.mediaSourceNode = sourceNode;

      await mediaEl.play();

      const activeTransport = await this.publishMusicTrackToRtc(musicTrack, transport, volumePercent);
      if (activeTransport === 'none' && agoraRtcService.getConnectionState() !== 'CONNECTED') {
        this.teardownCurrentNodes();
        const msg = 'Party audio channel is not connected yet. Please wait a moment and try again.';
        this.emitState({ status: 'error', error: msg, transport: 'none' });
        return { ok: false, durationSec: 0, transport: 'none', error: msg };
      }

      mediaEl.onended = () => {
        const finishedId = entry.meta.id;
        this.emitState({ status: 'stopped', currentTimeSec: durationSec });
        this.endedListeners.forEach((cb) => cb(finishedId));
      };

      mediaEl.onerror = () => {
        const errMsg = describeMediaElementError(mediaEl, kind);
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
    } catch (err: any) {
      stage2Error = err?.message || 'Streaming decode failed';
    }

    // -------------------------------------------------------------------------
    // STAGE 3: Agora native createBufferSourceAudioTrack fallback for audio files
    // -------------------------------------------------------------------------
    if (
      (kind === 'gallery_audio' || entry.extractedAudioOnly) &&
      (transport === 'agora' || agoraRtcService.getConnectionState() === 'CONNECTED')
    ) {
      try {
        this.teardownCurrentNodes();
        let sourceForAgora: File | string | undefined = entry.file;
        if (!sourceForAgora && entry.nativeFileUrl) {
          sourceForAgora = entry.nativeFileUrl;
        }
        if (sourceForAgora) {
          const bufferTrack = await AgoraRTC.createBufferSourceAudioTrack({
            source: sourceForAgora as any,
            encoderConfig: 'music_standard',
          });
          bufferTrack.setVolume(Math.max(0, Math.min(100, Math.round(volumePercent))));
          const published = await agoraRtcService.publishMusicBufferTrack(bufferTrack);
          if (!published) {
            bufferTrack.close();
            throw new Error('Could not publish audio buffer track to Agora channel.');
          }
          bufferTrack.startProcessAudioBuffer({ loop: false });
          bufferTrack.play();
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
          const durationSec = bufferTrack.duration || entry.meta.durationSec || 0;
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
        }
      } catch {
        // Fall through to honest diagnostic error
      }
    }

    this.teardownCurrentNodes();
    const finalMsg =
      stage2Error ||
      stage1Error ||
      'Unable to decode this media file. Please select a valid MP3, AAC, M4A, WAV, OGG, FLAC, or MP4 file with an audio track.';
    this.emitState({ status: 'error', error: finalMsg, transport: 'none' });
    return { ok: false, durationSec: 0, transport: 'none', error: finalMsg };
  }

  private getCurrentBufferPosition(): number {
    if (!this.decodedBuffer) return this.state.currentTimeSec;
    if (this.state.status === 'playing' && this.audioCtx && this.bufferSourceNode) {
      const elapsed = Math.max(0, this.audioCtx.currentTime - this.bufferStartedAtCtxTime);
      return Math.min(this.decodedBuffer.duration, this.bufferPausedOffsetSec + elapsed);
    }
    return Math.min(this.decodedBuffer.duration, Math.max(0, this.bufferPausedOffsetSec));
  }

  private startProgressPolling() {
    this.clearProgressTimer();
    this.progressTimer = setInterval(() => {
      if (this.state.status !== 'playing') return;
      if (this.decodedBuffer && this.bufferSourceNode) {
        const cur = this.getCurrentBufferPosition();
        const dur = this.decodedBuffer.duration || this.state.durationSec;
        this.emitState({ currentTimeSec: cur, durationSec: dur });
      } else if (this.mediaEl) {
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
    if (this.decodedBuffer && this.bufferSourceNode) {
      pos = this.getCurrentBufferPosition();
      this.bufferPausedOffsetSec = pos;
      this.activePlaybackToken += 1;
      this.stopBufferSourceNodeOnly();
    } else if (this.mediaEl) {
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
    if (this.decodedBuffer && this.localMonitorGain && this.broadcastGain) {
      pos = this.bufferPausedOffsetSec;
      const token = ++this.activePlaybackToken;
      this.spawnBufferSourceAt(pos, this.state.activeTrackId || '', token);
    } else if (this.mediaEl) {
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
    const maxDur = this.decodedBuffer?.duration || this.state.durationSec || positionSec;
    const safePos = Math.max(0, Math.min(maxDur, positionSec));
    if (this.decodedBuffer && this.localMonitorGain && this.broadcastGain) {
      this.bufferPausedOffsetSec = safePos;
      if (this.state.status === 'playing') {
        const token = ++this.activePlaybackToken;
        this.spawnBufferSourceAt(safePos, this.state.activeTrackId || '', token);
      }
    } else if (this.mediaEl) {
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
