import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { PartyMusicState } from '../../types';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    __lenzoYtApiPromise?: Promise<any>;
  }
}

function loadYouTubeIframeApi(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window unavailable'));
  }
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }
  if (window.__lenzoYtApiPromise) {
    return window.__lenzoYtApiPromise;
  }

  window.__lenzoYtApiPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('YouTube Player API timed out. Check your internet connection.'));
    }, 12000);

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      if (typeof prevReady === 'function') {
        try {
          prevReady();
        } catch {
          // ignore
        }
      }
      resolve(window.YT);
    };

    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => {
        clearTimeout(timeout);
        window.__lenzoYtApiPromise = undefined;
        reject(new Error('Unable to load official YouTube IFrame Player.'));
      };
      document.head.appendChild(tag);
    }
  });

  return window.__lenzoYtApiPromise;
}

interface PartyYouTubeSyncPlayerProps {
  musicState: PartyMusicState;
  clockOffsetMs: number;
  isHost: boolean;
  isSpeakerMuted: boolean;
  localVolumeOverride?: number | null;
  compact?: boolean;
  onProgress?: (currentTimeSec: number, durationSec: number) => void;
  onEnded?: () => void;
  onError?: (message: string) => void;
}

/**
 * Policy-Compliant Official YouTube IFrame Synchronized Player.
 * Uses YouTube's official IFrame Player API without extracting or bypassing protected streams.
 * Synchronizes Host + Seated Participants + Non-seated Listeners across join-in-progress,
 * play/pause, seek, track change, and reconnection recovery.
 */
export const PartyYouTubeSyncPlayer: React.FC<PartyYouTubeSyncPlayerProps> = ({
  musicState,
  clockOffsetMs,
  isHost,
  isSpeakerMuted,
  localVolumeOverride,
  compact = false,
  onProgress,
  onEnded,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef<boolean>(false);
  const loadedVideoIdRef = useRef<string | null>(null);
  const [ytError, setYtError] = useState<string | null>(null);
  const [needsTapToPlay, setNeedsTapToPlay] = useState(false);

  const activeTrack = musicState.activeTrack;
  const videoId = activeTrack?.sourceType === 'youtube' ? activeTrack.youtubeVideoId || null : null;

  const computeExpectedPosition = (): number => {
    const base = Math.max(0, Number(musicState.positionSec) || 0);
    if (musicState.status !== 'playing') return base;
    const approxServerNow = Date.now() + clockOffsetMs;
    const refTime = musicState.serverTime || musicState.updatedAt || approxServerNow;
    const elapsed = Math.max(0, (approxServerNow - refTime) / 1000);
    const total = base + elapsed;
    if (activeTrack && activeTrack.durationSec > 0) {
      return Math.min(activeTrack.durationSec, total);
    }
    return total;
  };

  // Mount & tear down official YT.Player cleanly
  useEffect(() => {
    if (!videoId || musicState.status === 'stopped' || musicState.status === 'idle') {
      if (playerRef.current) {
        try {
          playerRef.current.stopVideo?.();
          playerRef.current.destroy?.();
        } catch {
          // ignore
        }
        playerRef.current = null;
        playerReadyRef.current = false;
        loadedVideoIdRef.current = null;
      }
      setYtError(null);
      setNeedsTapToPlay(false);
      return;
    }

    let cancelled = false;
    setYtError(null);

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !containerRef.current) return;

        if (!playerRef.current) {
          loadedVideoIdRef.current = videoId;
          const isRealPublicHttpsOrigin =
            typeof window !== 'undefined' &&
            window.location.protocol === 'https:' &&
            !window.location.hostname.includes('localhost') &&
            window.location.hostname !== '127.0.0.1';
          playerRef.current = new YT.Player(containerRef.current, {
            videoId,
            width: '100%',
            height: '100%',
            playerVars: {
              autoplay: musicState.status === 'playing' ? 1 : 0,
              controls: isHost ? 1 : 0,
              disablekb: isHost ? 0 : 1,
              modestbranding: 1,
              playsinline: 1,
              rel: 0,
              ...(isRealPublicHttpsOrigin ? { origin: window.location.origin } : {}),
            },
            events: {
              onReady: (ev: any) => {
                if (cancelled) return;
                playerReadyRef.current = true;
                const player = ev.target;
                const vol = Math.max(0, Math.min(100, localVolumeOverride ?? musicState.volume ?? 65));
                try {
                  player.setVolume(vol);
                  if (isSpeakerMuted) {
                    player.mute();
                  } else {
                    player.unMute();
                  }
                  const expectedPos = computeExpectedPosition();
                  if (expectedPos > 1) {
                    player.seekTo(expectedPos, true);
                  }
                  if (musicState.status === 'playing') {
                    player.playVideo();
                  } else {
                    player.pauseVideo();
                  }
                } catch {
                  // ignore
                }
              },
              onStateChange: (ev: any) => {
                if (cancelled) return;
                const YTState = window.YT?.PlayerState;
                if (!YTState) return;
                if (ev.data === YTState.PLAYING) {
                  setNeedsTapToPlay(false);
                  setYtError(null);
                } else if (ev.data === YTState.ENDED && isHost) {
                  onEnded?.();
                } else if (ev.data === YTState.UNSTARTED && musicState.status === 'playing') {
                  setNeedsTapToPlay(true);
                }
              },
              onError: (ev: any) => {
                if (cancelled) return;
                const code = Number(ev?.data);
                let msg = 'YouTube playback error.';
                if (code === 101 || code === 150 || code === 153) {
                  msg = 'This YouTube video does not allow embedded playback. Choose another YouTube link or use Gallery Audio for global Agora broadcast.';
                } else if (code === 100) {
                  msg = 'YouTube video not found or private.';
                } else if (code === 2) {
                  msg = 'Invalid YouTube video ID.';
                }
                setYtError(msg);
                onError?.(msg);
              },
            },
          });
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          const msg = err?.message || 'Unable to load YouTube Player.';
          setYtError(msg);
          onError?.(msg);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [videoId, musicState.status === 'stopped' || musicState.status === 'idle']);

  // Synchronize playback state, track switches, volume, mute, and drift correction
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !playerReadyRef.current || !videoId) return;

    try {
      const vol = Math.max(0, Math.min(100, localVolumeOverride ?? musicState.volume ?? 65));
      player.setVolume?.(vol);
      if (isSpeakerMuted) {
        player.mute?.();
      } else {
        player.unMute?.();
      }

      if (loadedVideoIdRef.current !== videoId) {
        loadedVideoIdRef.current = videoId;
        const startPos = computeExpectedPosition();
        if (musicState.status === 'playing') {
          player.loadVideoById?.({ videoId, startSeconds: startPos });
        } else {
          player.cueVideoById?.({ videoId, startSeconds: startPos });
        }
        return;
      }

      const expectedPos = computeExpectedPosition();
      const currentPos = typeof player.getCurrentTime === 'function' ? Number(player.getCurrentTime()) || 0 : 0;
      const drift = Math.abs(expectedPos - currentPos);

      if (musicState.status === 'playing') {
        if (drift > 2.0) {
          player.seekTo?.(expectedPos, true);
        }
        const st = player.getPlayerState?.();
        if (st !== window.YT?.PlayerState?.PLAYING && st !== window.YT?.PlayerState?.BUFFERING) {
          player.playVideo?.();
        }
      } else if (musicState.status === 'paused') {
        if (drift > 1.2) {
          player.seekTo?.(expectedPos, true);
        }
        player.pauseVideo?.();
      } else if (musicState.status === 'stopped') {
        player.stopVideo?.();
      }
    } catch {
      // ignore transient iframe state errors
    }
  }, [
    videoId,
    musicState.status,
    musicState.positionSec,
    musicState.updatedAt,
    musicState.volume,
    isSpeakerMuted,
    localVolumeOverride,
  ]);

  // Report live progress for Host & synced progress bar
  useEffect(() => {
    if (!videoId || musicState.status !== 'playing') return;
    const timer = setInterval(() => {
      const player = playerRef.current;
      if (!player || !playerReadyRef.current) return;
      try {
        const cur = Number(player.getCurrentTime?.()) || 0;
        const dur = Number(player.getDuration?.()) || activeTrack?.durationSec || 0;
        onProgress?.(cur, dur);
      } catch {
        // ignore
      }
    }, 600);
    return () => clearInterval(timer);
  }, [videoId, musicState.status, activeTrack?.durationSec]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy?.();
        } catch {
          // ignore
        }
        playerRef.current = null;
        playerReadyRef.current = false;
      }
    };
  }, []);

  if (!videoId || musicState.status === 'stopped' || musicState.status === 'idle') {
    return null;
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden border border-[#00D4FF]/35 bg-[#090B1E]/95 shadow-[0_0_16px_rgba(0,212,255,0.2)] ${
        compact ? 'w-full' : 'w-full'
      }`}
    >
      <div className="flex items-center justify-between px-2.5 py-1 bg-[#071A38]/90 border-b border-white/10">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-[10px] font-black text-cyan-200 truncate">
            YouTube Sync • {activeTrack?.title || 'Playing'}
          </span>
        </div>
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] font-bold text-white/60 hover:text-cyan-300 flex items-center gap-0.5 shrink-0"
        >
          YouTube <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>

      <div className={`relative w-full bg-black ${compact ? 'h-[118px]' : 'aspect-video max-h-44'}`}>
        <div ref={containerRef} className="w-full h-full" />
        {needsTapToPlay && !ytError && (
          <button
            type="button"
            onClick={() => {
              try {
                playerRef.current?.unMute?.();
                playerRef.current?.playVideo?.();
                setNeedsTapToPlay(false);
              } catch {
                // ignore
              }
            }}
            className="absolute inset-0 bg-black/65 flex items-center justify-center text-xs font-black text-cyan-200"
          >
            Tap to Sync YouTube Audio
          </button>
        )}
      </div>

      {ytError && (
        <div className="px-2.5 py-1.5 bg-rose-950/90 border-t border-rose-500/40 flex items-center gap-1.5 text-[10px] font-semibold text-rose-200">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>{ytError}</span>
        </div>
      )}
    </div>
  );
};
