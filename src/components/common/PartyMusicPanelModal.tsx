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
} from 'lucide-react';
import { PartyMusicState, PartyMusicTrackMeta } from '../../types';
import { extractYouTubeVideoId } from '../../utils/partyMusicEngine';

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
  onAddYouTubeTrack: (videoId: string, customTitle?: string) => Promise<void>;
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
  if (track.sourceType === 'youtube') return 'YouTube Sync';
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
  const [youtubeTitleInput, setYoutubeTitleInput] = useState('');
  const [youtubeInputError, setYoutubeInputError] = useState<string | null>(null);
  const [addingYoutube, setAddingYoutube] = useState(false);

  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const activeTrack = musicState.activeTrack;
  const isPlaying = musicState.status === 'playing';
  const isPaused = musicState.status === 'paused';
  const hasActiveTrack = Boolean(activeTrack && (isPlaying || isPaused));
  const duration = Math.max(displayDurationSec, activeTrack?.durationSec || 0);
  const clampedPos = duration > 0 ? Math.min(duration, Math.max(0, displayPositionSec)) : Math.max(0, displayPositionSec);

  const handleSubmitYouTube = async (e: React.FormEvent) => {
    e.preventDefault();
    setYoutubeInputError(null);
    const parsedId = extractYouTubeVideoId(youtubeInput);
    if (!parsedId) {
      setYoutubeInputError('Enter a valid YouTube link (youtube.com / youtu.be / music.youtube.com) or 11-character Video ID.');
      return;
    }
    setAddingYoutube(true);
    try {
      await onAddYouTubeTrack(parsedId, youtubeTitleInput.trim() || undefined);
      setYoutubeInput('');
      setYoutubeTitleInput('');
    } finally {
      setAddingYoutube(false);
    }
  };

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
                  ? `Host Broadcast • ${voiceTransport === 'agora' ? 'Agora Global Audio Mix' : voiceTransport === 'webrtc' ? 'WebRTC Global Mix' : 'Connecting...'}`
                  : 'Synchronized Live Party Music'}
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
                      {isLoadingTrack
                        ? 'Loading...'
                        : isPlaying
                        ? 'Playing for All Listeners'
                        : isPaused
                        ? 'Paused'
                        : 'Stopped'}
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
                    Supports MP3, AAC, M4A, WAV, OGG & FLAC. Mixed directly into the live Party audio stream alongside your microphone for all speakers and listeners.
                  </p>
                  <button
                    type="button"
                    onClick={() => audioFileInputRef.current?.click()}
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
                    Choose an MP4, MOV, WEBM, or MKV video from your gallery. Only its audio track is extracted and broadcast to the Party — video stays completely hidden.
                  </p>
                  <button
                    type="button"
                    onClick={() => videoFileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#00A8FF] to-[#6366F1] text-white text-xs font-black flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(59,130,246,0.4)] active:scale-[0.98] transition-all"
                  >
                    <Film className="w-4 h-4" />
                    Choose Gallery Video (Audio Only)
                  </button>
                </div>
              )}

              {sourceTab === 'youtube' && (
                <form
                  onSubmit={handleSubmitYouTube}
                  className="rounded-2xl p-3.5 bg-[#190B33] border border-white/10 space-y-2.5"
                >
                  <div className="text-xs font-bold text-white">Synchronized Official YouTube Player</div>
                  <p className="text-[10px] text-white/65 leading-relaxed">
                    Uses the official embedded YouTube IFrame Player synchronized across all room listeners (100% compliant with YouTube Terms — no protected stream extraction).
                  </p>
                  <input
                    type="text"
                    value={youtubeInput}
                    onChange={(e) => {
                      setYoutubeInput(e.target.value);
                      setYoutubeInputError(null);
                    }}
                    placeholder="Paste YouTube URL or Video ID..."
                    className="w-full px-3 py-2 rounded-xl bg-[#0D051F] border border-white/15 focus:border-[#FA26A0] text-xs text-white placeholder-white/40 outline-none"
                  />
                  <input
                    type="text"
                    value={youtubeTitleInput}
                    onChange={(e) => setYoutubeTitleInput(e.target.value)}
                    placeholder="Optional track label..."
                    className="w-full px-3 py-2 rounded-xl bg-[#0D051F] border border-white/15 focus:border-cyan-400 text-xs text-white placeholder-white/40 outline-none"
                  />
                  {youtubeInputError && (
                    <p className="text-[11px] font-semibold text-rose-300">{youtubeInputError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={addingYoutube || !youtubeInput.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FA26A0] to-[#FF007A] disabled:opacity-40 text-white text-xs font-black flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(250,38,160,0.4)] active:scale-[0.98] transition-all"
                  >
                    {addingYoutube ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Youtube className="w-4 h-4" />
                    )}
                    Play Synchronized YouTube Track
                  </button>
                </form>
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
