import React, { useRef, useState } from 'react';
import {
  X,
  Music,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  FileAudio,
  Film,
  Youtube,
  Trash2,
  Plus,
  Radio,
  AlertTriangle,
  Headphones,
  Loader2,
  Link2,
  ClipboardPaste,
  Info,
} from 'lucide-react';
import { PartyMusicState, PartyMusicTrackMeta } from '../../types';
import { extractYouTubeVideoId } from '../../utils/partyMusicEngine';
import { apiFetch } from '../../utils/apiConfig';
import { isNativeAndroidApp } from '../../utils/mediaDeviceHelper';

interface LoadedYouTubePreview {
  videoId: string;
  title: string;
  authorName: string;
  thumbnailUrl: string;
  url: string;
}

interface PartyMusicPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  isHost: boolean;
  musicState: PartyMusicState;
  displayPositionSec: number;
  displayDurationSec: number;
  isLoadingTrack: boolean;
  errorMessage: string | null;
  voiceTransport: 'agora' | 'webrtc' | 'connecting';
  isSpeakerMuted: boolean;
  localListenerVolume: number;
  onLocalListenerVolumeChange: (vol: number) => void;
  onAddGalleryAudioFiles: (files: FileList) => void;
  onAddGalleryVideoFiles: (files: FileList) => void;
  onPickNativeGalleryAudio?: () => Promise<boolean>;
  onPickNativeGalleryVideo?: () => Promise<boolean>;
  onAddYouTubeTrack: (
    videoId: string,
    customTitle?: string,
    thumbnailUrl?: string,
    authorName?: string
  ) => Promise<void>;
  onPlayTrackAtIndex: (index: number) => void;
  onTogglePlayPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (positionSec: number) => void;
  onHostVolumeChange: (volume: number) => void;
  onRemoveQueueItem: (trackId: string) => void;
  onClearError: () => void;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.floor(sec);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function sourceBadgeLabel(track: PartyMusicTrackMeta): string {
  if (track.sourceType === 'gallery_video') return 'Gallery Video (Audio)';
  if (track.sourceType === 'youtube') return 'YouTube Embed';
  return 'Gallery Audio';
}

export const PartyMusicPanelModal: React.FC<PartyMusicPanelModalProps> = ({
  isOpen,
  onClose,
  isHost,
  musicState,
  displayPositionSec,
  displayDurationSec,
  isLoadingTrack,
  errorMessage,
  voiceTransport,
  isSpeakerMuted,
  localListenerVolume,
  onLocalListenerVolumeChange,
  onAddGalleryAudioFiles,
  onAddGalleryVideoFiles,
  onPickNativeGalleryAudio,
  onPickNativeGalleryVideo,
  onAddYouTubeTrack,
  onPlayTrackAtIndex,
  onTogglePlayPause,
  onStop,
  onNext,
  onPrevious,
  onSeek,
  onHostVolumeChange,
  onRemoveQueueItem,
  onClearError,
}) => {
  const [sourceTab, setSourceTab] = useState<'gallery_audio' | 'gallery_video' | 'youtube'>('gallery_audio');
  const [youtubeInput, setYoutubeInput] = useState('');
  const [youtubeInputError, setYoutubeInputError] = useState<string | null>(null);
  const [loadingYoutubeMeta, setLoadingYoutubeMeta] = useState(false);
  const [loadedYouTube, setLoadedYouTube] = useState<LoadedYouTubePreview | null>(null);
  const [startingYoutube, setStartingYoutube] = useState(false);

  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const activeTrack = musicState.activeTrack;
  const isPlaying = musicState.status === 'playing';
  const isPaused = musicState.status === 'paused';
  const hasActiveTrack = Boolean(activeTrack && (isPlaying || isPaused));
  const duration = Math.max(displayDurationSec, activeTrack?.durationSec || 0);
  const clampedPos = duration > 0 ? Math.min(duration, Math.max(0, displayPositionSec)) : Math.max(0, displayPositionSec);
  const isActiveYouTube = activeTrack?.sourceType === 'youtube';

  const handleClearYouTubeLink = () => {
    setYoutubeInput('');
    setYoutubeInputError(null);
    setLoadedYouTube(null);
  };

  const handlePasteClipboard = async () => {
    setYoutubeInputError(null);
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setYoutubeInput(text.trim());
          setLoadedYouTube(null);
          return;
        }
      }
      setYoutubeInputError('Clipboard is empty or unavailable. Long-press the input box to paste your YouTube link.');
    } catch {
      setYoutubeInputError('Long-press the input box and tap Paste to insert your YouTube link.');
    }
  };

  const fetchYouTubePreview = async (videoId: string): Promise<LoadedYouTubePreview> => {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const fallbackThumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    // Primary: Backend oEmbed endpoint (avoids Android WebView CORS restrictions)
    try {
      const res = await apiFetch(`/api/youtube/oembed?videoId=${encodeURIComponent(videoId)}`);
      if (res.ok) {
        const data = await res.json();
        return {
          videoId,
          title: data?.title || `YouTube Video (${videoId})`,
          authorName: data?.authorName || 'YouTube',
          thumbnailUrl: data?.thumbnailUrl || fallbackThumb,
          url: watchUrl,
        };
      }
      if (res.status === 403 || res.status === 404) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.error || 'This YouTube video is unavailable or restricts embedded playback.'
        );
      }
    } catch (err: any) {
      if (err?.message && (err.message.includes('unavailable') || err.message.includes('restricts'))) {
        throw err;
      }
    }

    // Secondary: Direct official YouTube oEmbed
    try {
      const directRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`
      );
      if (directRes.ok) {
        const data = await directRes.json();
        return {
          videoId,
          title: String(data?.title || `YouTube Video (${videoId})`).slice(0, 140),
          authorName: String(data?.author_name || 'YouTube').slice(0, 100),
          thumbnailUrl: String(data?.thumbnail_url || fallbackThumb),
          url: watchUrl,
        };
      }
    } catch {
      // Fall back to standard video metadata
    }

    return {
      videoId,
      title: `YouTube Video (${videoId})`,
      authorName: 'YouTube',
      thumbnailUrl: fallbackThumb,
      url: watchUrl,
    };
  };

  const handleLoadYouTubeVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setYoutubeInputError(null);
    const parsedId = extractYouTubeVideoId(youtubeInput);
    if (!parsedId) {
      setLoadedYouTube(null);
      setYoutubeInputError(
        'Invalid YouTube link. Paste a valid URL like https://www.youtube.com/watch?v=... or https://youtu.be/...'
      );
      return;
    }

    setLoadingYoutubeMeta(true);
    try {
      const preview = await fetchYouTubePreview(parsedId);
      setLoadedYouTube(preview);
    } catch (err: any) {
      setLoadedYouTube(null);
      setYoutubeInputError(err?.message || 'Unable to load YouTube video details.');
    } finally {
      setLoadingYoutubeMeta(false);
    }
  };

  const handlePlayLoadedYouTube = async () => {
    if (!loadedYouTube) return;
    setStartingYoutube(true);
    setYoutubeInputError(null);
    try {
      await onAddYouTubeTrack(
        loadedYouTube.videoId,
        loadedYouTube.title,
        loadedYouTube.thumbnailUrl,
        loadedYouTube.authorName
      );
    } finally {
      setStartingYoutube(false);
    }
  };

  const handleChooseGalleryAudio = async () => {
    if (isNativeAndroidApp() && onPickNativeGalleryAudio) {
      const handled = await onPickNativeGalleryAudio();
      if (handled) return;
    }
    audioFileInputRef.current?.click();
  };

  const handleChooseGalleryVideo = async () => {
    if (isNativeAndroidApp() && onPickNativeGalleryVideo) {
      const handled = await onPickNativeGalleryVideo();
      if (handled) return;
    }
    videoFileInputRef.current?.click();
  };

  const playbackStatusLabel = isLoadingTrack
    ? 'Loading...'
    : isPlaying
    ? isActiveYouTube
      ? 'Official YouTube Embed Sync'
      : voiceTransport === 'agora'
      ? 'Broadcasting via Agora Audio'
      : 'Broadcasting to Party'
    : isPaused
    ? 'Paused'
    : 'Stopped';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#120726] border-t sm:border border-[#00D4FF]/35 rounded-t-3xl sm:rounded-3xl shadow-[0_0_32px_rgba(0,212,255,0.22)] flex flex-col max-h-[86vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-gradient-to-r from-[#071A38]/90 via-[#160A2B] to-[#240B3B]/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-[#071A38] border border-[#00D4FF]/60 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(0,212,255,0.35)] shrink-0">
              <Music className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-white truncate">Party Music System</h3>
              <p className="text-[10px] font-semibold text-cyan-200/80 truncate">
                {isHost
                  ? `Host Controls • ${voiceTransport === 'agora' ? 'Agora Global Audio Mix' : voiceTransport === 'webrtc' ? 'WebRTC Global Mix' : 'Connecting...'}`
                  : 'Party Room Music Player'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Party Music Panel"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-950/85 border border-rose-500/45 flex items-start justify-between gap-2 text-xs text-rose-100">
              <div className="flex items-start gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={onClearError}
                className="text-rose-300 hover:text-white shrink-0"
                aria-label="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Now Playing & Controls Card */}
          <div className="rounded-2xl p-3.5 bg-gradient-to-br from-[#0A1833]/95 via-[#180C32]/95 to-[#230B3A]/95 border border-[#00D4FF]/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {activeTrack?.thumbnailUrl ? (
                  <img
                    src={activeTrack.thumbnailUrl}
                    alt={activeTrack.title}
                    className="w-12 h-10 rounded-xl object-cover shrink-0 border border-white/20"
                  />
                ) : (
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isPlaying
                        ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 shadow-[0_0_14px_rgba(0,212,255,0.4)]'
                        : 'bg-white/5 border-white/15 text-white/60'
                    }`}
                  >
                    {isLoadingTrack ? (
                      <Loader2 className="w-5 h-5 animate-spin text-cyan-300" />
                    ) : activeTrack?.sourceType === 'youtube' ? (
                      <Youtube className="w-5 h-5 text-rose-400" />
                    ) : activeTrack?.sourceType === 'gallery_video' ? (
                      <Film className="w-5 h-5 text-cyan-300" />
                    ) : (
                      <Headphones className="w-5 h-5 text-cyan-300" />
                    )}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-black text-white truncate">
                    {activeTrack ? activeTrack.title : 'No Track Playing'}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                        isPlaying
                          ? 'text-emerald-300'
                          : isPaused
                          ? 'text-amber-300'
                          : 'text-white/50'
                      }`}
                    >
                      <Radio className={`w-2.5 h-2.5 ${isPlaying ? 'animate-pulse' : ''}`} />
                      {playbackStatusLabel}
                    </span>
                    {activeTrack && (
                      <span className="text-[9px] font-bold text-cyan-200/80 bg-cyan-500/15 border border-cyan-400/25 px-1.5 py-0.5 rounded-md">
                        {sourceBadgeLabel(activeTrack)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={duration > 0 ? duration : 100}
                step={0.5}
                value={duration > 0 ? clampedPos : 0}
                disabled={!isHost || !hasActiveTrack || duration <= 0}
                onChange={(e) => onSeek(Number(e.target.value))}
                className="w-full accent-[#00D4FF] h-1.5 bg-white/15 rounded-lg cursor-pointer disabled:cursor-default disabled:opacity-60"
                aria-label="Track playback position"
              />
              <div className="flex items-center justify-between text-[10px] font-mono text-white/60">
                <span>{formatTime(clampedPos)}</span>
                <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
              </div>
            </div>

            {/* Host Playback Controls */}
            {isHost ? (
              <div className="flex items-center justify-center gap-3 pt-0.5">
                <button
                  type="button"
                  onClick={onPrevious}
                  disabled={musicState.queue.length === 0}
                  aria-label="Previous track"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 flex items-center justify-center text-white transition-all active:scale-95"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onTogglePlayPause}
                  disabled={isLoadingTrack || (!hasActiveTrack && musicState.queue.length === 0)}
                  aria-label={isPlaying ? 'Pause music' : 'Play music'}
                  className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#00A8FF] via-[#00D4FF] to-[#3B82F6] text-[#041226] shadow-[0_0_20px_rgba(0,212,255,0.65)] disabled:opacity-40 flex items-center justify-center transition-all active:scale-95"
                >
                  {isLoadingTrack ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={onStop}
                  disabled={!hasActiveTrack && !isLoadingTrack}
                  aria-label="Stop music"
                  className="w-10 h-10 rounded-full bg-rose-600/80 hover:bg-rose-600 disabled:opacity-40 flex items-center justify-center text-white transition-all active:scale-95"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>

                <button
                  type="button"
                  onClick={onNext}
                  disabled={musicState.queue.length === 0}
                  aria-label="Next track"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 flex items-center justify-center text-white transition-all active:scale-95"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-center text-white/65 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                Only the Party Host can play, pause, skip, or stop shared room music.
              </p>
            )}

            {/* Independent Volume Slider */}
            <div className="flex items-center gap-2.5 pt-1">
              {isSpeakerMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-300 shrink-0" />
              )}
              <span className="text-[10px] font-bold text-white/75 shrink-0 w-16">
                {isHost ? 'Music Vol' : 'My Vol'}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={isHost ? musicState.volume : localListenerVolume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (isHost) {
                    onHostVolumeChange(v);
                  } else {
                    onLocalListenerVolumeChange(v);
                  }
                }}
                className="flex-1 accent-[#FA26A0] h-1.5 bg-white/15 rounded-lg cursor-pointer"
                aria-label="Music volume"
              />
              <span className="text-[10px] font-mono font-bold text-white/85 w-8 text-right shrink-0">
                {isHost ? musicState.volume : localListenerVolume}%
              </span>
            </div>
          </div>

          {/* Host Source Selector */}
          {isHost && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#1A0D33] border border-white/10">
                <button
                  type="button"
                  onClick={() => setSourceTab('gallery_audio')}
                  className={`flex items-center justify-center gap-1 py-2 px-1.5 rounded-xl text-[11px] font-black transition-all ${
                    sourceTab === 'gallery_audio'
                      ? 'bg-[#071A38] text-cyan-300 border border-[#00D4FF]/55 shadow-[0_0_10px_rgba(0,212,255,0.28)]'
                      : 'text-white/65 hover:text-white'
                  }`}
                >
                  <FileAudio className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Audio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSourceTab('gallery_video')}
                  className={`flex items-center justify-center gap-1 py-2 px-1.5 rounded-xl text-[11px] font-black transition-all ${
                    sourceTab === 'gallery_video'
                      ? 'bg-[#071A38] text-cyan-300 border border-[#00D4FF]/55 shadow-[0_0_10px_rgba(0,212,255,0.28)]'
                      : 'text-white/65 hover:text-white'
                  }`}
                >
                  <Film className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSourceTab('youtube')}
                  className={`flex items-center justify-center gap-1 py-2 px-1.5 rounded-xl text-[11px] font-black transition-all ${
                    sourceTab === 'youtube'
                      ? 'bg-[#2B0C28] text-[#FF7AB8] border border-[#FA26A0]/55 shadow-[0_0_10px_rgba(250,38,160,0.28)]'
                      : 'text-white/65 hover:text-white'
                  }`}
                >
                  <Youtube className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">YouTube</span>
                </button>
              </div>

              {/* Hidden File Pickers */}
              <input
                ref={audioFileInputRef}
                type="file"
                accept="audio/*,.mp3,.aac,.m4a,.wav,.ogg,.flac"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onAddGalleryAudioFiles(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
              <input
                ref={videoFileInputRef}
                type="file"
                accept="video/*,.mp4,.mov,.webm,.mkv,.m4v,.3gp"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onAddGalleryVideoFiles(e.target.files);
                    e.target.value = '';
                  }
                }}
              />

              {sourceTab === 'gallery_audio' && (
                <div className="rounded-2xl p-3.5 bg-[#190B33] border border-white/10 space-y-2.5">
                  <div className="text-xs font-bold text-white">Select Audio from Device Storage</div>
                  <p className="text-[11px] text-white/65 leading-relaxed">
                    Supports MP3, AAC, M4A, WAV, OGG & FLAC. Decoded locally and broadcast globally over Agora Party Audio alongside your microphone for all speakers and listeners.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleChooseGalleryAudio()}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#00A8FF] to-[#00D4FF] text-[#041226] text-xs font-black flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(0,212,255,0.4)] active:scale-[0.98] transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Choose Gallery Audio
                  </button>
                </div>
              )}

              {sourceTab === 'gallery_video' && (
                <div className="rounded-2xl p-3.5 bg-[#190B33] border border-white/10 space-y-2.5">
                  <div className="text-xs font-bold text-white">Extract Audio from Gallery Video</div>
                  <p className="text-[11px] text-white/65 leading-relaxed">
                    Choose an MP4, MOV, WEBM, or MKV video from your gallery. Only its audio track is extracted and broadcast globally through Agora Party Audio — video stays hidden.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleChooseGalleryVideo()}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#00A8FF] to-[#6366F1] text-white text-xs font-black flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(59,130,246,0.4)] active:scale-[0.98] transition-all"
                  >
                    <Film className="w-4 h-4" />
                    Choose Gallery Video (Audio Only)
                  </button>
                </div>
              )}

              {sourceTab === 'youtube' && (
                <div className="rounded-2xl p-3.5 bg-[#190B33] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-[#FF7AB8]" />
                      <span>Paste YouTube Link</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handlePasteClipboard()}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[10px] font-bold text-cyan-200 transition-colors"
                    >
                      <ClipboardPaste className="w-3 h-3" />
                      Paste
                    </button>
                  </div>

                  <form onSubmit={handleLoadYouTubeVideo} className="space-y-2">
                    <div className="relative flex items-center">
                      <input
                        type="url"
                        inputMode="url"
                        value={youtubeInput}
                        onChange={(e) => {
                          setYoutubeInput(e.target.value);
                          setYoutubeInputError(null);
                          if (loadedYouTube && !e.target.value.includes(loadedYouTube.videoId)) {
                            setLoadedYouTube(null);
                          }
                        }}
                        placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                        aria-label="Paste YouTube Link"
                        className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-[#0D051F] border border-white/15 focus:border-[#FA26A0] text-xs text-white placeholder-white/40 outline-none"
                      />
                      {youtubeInput && (
                        <button
                          type="button"
                          onClick={handleClearYouTubeLink}
                          aria-label="Clear YouTube link"
                          className="absolute right-2 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {youtubeInputError && (
                      <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/45 flex items-start gap-2 text-[11px] font-semibold text-rose-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{youtubeInputError}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={loadingYoutubeMeta || !youtubeInput.trim()}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#FA26A0] to-[#FF007A] disabled:opacity-40 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_0_16px_rgba(250,38,160,0.38)] active:scale-[0.98] transition-all"
                      >
                        {loadingYoutubeMeta ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Loading Video...</span>
                          </>
                        ) : (
                          <>
                            <Youtube className="w-4 h-4" />
                            <span>Load Video</span>
                          </>
                        )}
                      </button>

                      {(youtubeInput || loadedYouTube) && (
                        <button
                          type="button"
                          onClick={handleClearYouTubeLink}
                          className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/85 text-xs font-bold shrink-0 transition-colors"
                        >
                          Clear Link
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Loaded Video Preview Card (Thumbnail + Title + Playback Action) */}
                  {loadedYouTube && (
                    <div className="rounded-xl p-2.5 bg-[#0D051F] border border-[#FA26A0]/45 space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <img
                          src={loadedYouTube.thumbnailUrl}
                          alt={loadedYouTube.title}
                          className="w-20 h-14 rounded-lg object-cover shrink-0 border border-white/15 bg-black"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black text-white leading-snug line-clamp-2">
                            {loadedYouTube.title}
                          </div>
                          <div className="text-[10px] text-white/60 truncate mt-0.5">
                            {loadedYouTube.authorName} • Official YouTube Embed
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={startingYoutube}
                          onClick={() => void handlePlayLoadedYouTube()}
                          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#00A8FF] to-[#00D4FF] text-[#041226] text-xs font-black flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          {startingYoutube ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                          <span>Play in Official YouTube Player</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Honest Compliance & Architecture Notice */}
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-start gap-2 text-[10px] text-white/65 leading-relaxed">
                    <Info className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
                    <span>
                      YouTube plays through the authorized embedded YouTube IFrame Player (synced metadata & controls; YouTube audio is not extracted or re-broadcast over Agora RTC). For global Agora Party broadcasting to all listeners, use <strong className="text-cyan-200">Gallery Audio</strong> or <strong className="text-cyan-200">Gallery Video</strong>.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Track Queue */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white/90">
                Party Queue ({musicState.queue.length})
              </span>
              {musicState.queue.length > 0 && (
                <span className="text-[10px] text-white/50">
                  {isHost ? 'Tap any track to play' : 'Synced with Host'}
                </span>
              )}
            </div>

            {musicState.queue.length === 0 ? (
              <div className="text-center py-5 px-3 rounded-2xl bg-white/[0.03] border border-dashed border-white/10 text-[11px] text-white/50">
                {isHost
                  ? 'Add Gallery Audio, Gallery Video, or a YouTube track above to start playing music for the whole Party Room.'
                  : 'No tracks in the Party Music queue yet.'}
              </div>
            ) : (
              <div className="space-y-1.5">
                {musicState.queue.map((track, idx) => {
                  const isCurrent = activeTrack?.id === track.id && (isPlaying || isPaused);
                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        if (isHost) onPlayTrackAtIndex(idx);
                      }}
                      className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-[#071A38]/90 border-[#00D4FF]/60 shadow-[0_0_12px_rgba(0,212,255,0.25)]'
                          : 'bg-[#1A0D33]/85 border-white/10 hover:border-white/25'
                      } ${isHost ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-cyan-300 shrink-0">
                          {track.sourceType === 'youtube' ? (
                            <Youtube className="w-3.5 h-3.5 text-rose-400" />
                          ) : track.sourceType === 'gallery_video' ? (
                            <Film className="w-3.5 h-3.5 text-cyan-300" />
                          ) : (
                            <FileAudio className="w-3.5 h-3.5 text-cyan-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{track.title}</div>
                          <div className="text-[10px] text-white/55 truncate">
                            {sourceBadgeLabel(track)}
                            {track.durationSec > 0 ? ` • ${formatTime(track.durationSec)}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCurrent && (
                          <span className="text-[9px] font-black text-cyan-300 uppercase px-1.5 py-0.5 rounded bg-cyan-500/20">
                            {isPlaying ? 'Live' : 'Paused'}
                          </span>
                        )}
                        {isHost && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveQueueItem(track.id);
                            }}
                            aria-label="Remove track from queue"
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-rose-500/30 flex items-center justify-center text-white/60 hover:text-rose-200 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
