import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ExternalLink, Volume2, X } from 'lucide-react';
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
      window.__lenzoYtApiPromise = undefined;
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
  onHostPlaybackChange?: (event: 'playing' | 'paused' | 'seek', currentTimeSec: number) => void;
  onHostClose?: () => void;
}

/**
 * Policy-Compliant Official YouTube IFrame Synchronized Player.
 * Uses YouTube's official IFrame Player API without extracting or bypassing protected streams.
 * Strictly enforces Host-only playback control:
 * - Host can play, pause, seek, switch videos, or close/stop playback, immediately syncing all members.
 * - Non-host members see and hear synced playback in real time (including late joiners),
 *   with an interaction shield blocking independent play/pause/seek control.
 * - Single YT.Player instance prevents duplicate playback or audio conflicts.
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
  onHostPlaybackChange,
  onHostClose,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef<boolean>(false);
  const loadedVideoIdRef = useRef<string | null>(null);
  const suppressHostEmitUntilRef = useRef<number>(0);
  const lastHostObservedPosRef = useRef<number>(0);
  const mutedAutoplayActiveRef = useRef<boolean>(false);
  const autoplayWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTickCountRef = useRef<number>(0);

  // Live refs so YT.Player callbacks never read stale closures
  const musicStateRef = useRef<PartyMusicState>(musicState);
  musicStateRef.current = musicState;
  const clockOffsetMsRef = useRef<number>(clockOffsetMs);
  clockOffsetMsRef.current = clockOffsetMs;
  const isHostRef = useRef<boolean>(isHost);
  isHostRef.current = isHost;
  const isSpeakerMutedRef = useRef<boolean>(isSpeakerMuted);
  isSpeakerMutedRef.current = isSpeakerMuted;
  const localVolumeOverrideRef = useRef<number | null | undefined>(localVolumeOverride);
  localVolumeOverrideRef.current = localVolumeOverride;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onHostPlaybackChangeRef = useRef(onHostPlaybackChange);
  onHostPlaybackChangeRef.current = onHostPlaybackChange;

  const [ytError, setYtError] = useState<string | null>(null);
  const [needsTapToPlay, setNeedsTapToPlay] = useState(false);

  const activeTrack = musicState.activeTrack;
  const videoId = activeTrack?.sourceType === 'youtube' ? activeTrack.youtubeVideoId || null : null;
  const isActive = Boolean(videoId && musicState.status !== 'stopped' && musicState.status !== 'idle');

  const computeExpectedPosition = (): number => {
    const st = musicStateRef.current;
    const track = st.activeTrack;
    const base = Math.max(0, Number(st.positionSec) || 0);
    if (st.status !== 'playing') return base;
    const hasServerClock = typeof st.serverTime === 'number' && st.serverTime > 0;
    const approxNow = hasServerClock ? Date.now() + clockOffsetMsRef.current : Date.now();
    const refTime = hasServerClock ? st.serverTime! : st.updatedAt || approxNow;
    const elapsed = Math.max(0, (approxNow - refTime) / 1000);
    const total = base + elapsed;
    if (track && track.durationSec > 0) {
      return Math.min(track.durationSec, total);
    }
    return total;
  };

  const applyVolumeAndMute = (player: any) => {
    if (!player) return;
    const vol = Math.max(
      0,
      Math.min(100, localVolumeOverrideRef.current ?? musicStateRef.current.volume ?? 65)
    );
    try {
      player.setVolume?.(vol);
      if (isSpeakerMutedRef.current || mutedAutoplayActiveRef.current) {
        player.mute?.();
      } else {
        player.unMute?.();
      }
    } catch {
      // ignore
    }
  };

  const clearAutoplayWatchdog = () => {
    if (autoplayWatchdogRef.current) {
      clearTimeout(autoplayWatchdogRef.current);
      autoplayWatchdogRef.current = null;
    }
  };

  const scheduleAutoplayWatchdog = () => {
    clearAutoplayWatchdog();
    if (musicStateRef.current.status !== 'playing') return;
    autoplayWatchdogRef.current = setTimeout(() => {
      const player = playerRef.current;
      const YTState = window.YT?.PlayerState;
      if (!player || !playerReadyRef.current || !YTState) return;
      if (musicStateRef.current.status !== 'playing') return;
      try {
        const curState = player.getPlayerState?.();
        if (curState !== YTState.PLAYING && curState !== YTState.BUFFERING) {
          // Browser/Android WebView blocked unmuted autoplay: start muted so video plays immediately in sync,
          // and prompt a one-tap unmute overlay for audio.
          if (!isSpeakerMutedRef.current) {
            mutedAutoplayActiveRef.current = true;
            setNeedsTapToPlay(true);
          }
          player.mute?.();
          player.playVideo?.();
        }
      } catch {
        // ignore
      }
    }, 1500);
  };

  const destroyPlayerInstance = () => {
    clearAutoplayWatchdog();
    if (playerRef.current) {
      try {
        playerRef.current.stopVideo?.();
        playerRef.current.destroy?.();
      } catch {
        // ignore
      }
      playerRef.current = null;
    }
    playerReadyRef.current = false;
    loadedVideoIdRef.current = null;
    mutedAutoplayActiveRef.current = false;
  };

  // Mount & tear down single official YT.Player cleanly whenever active state toggles
  useEffect(() => {
    if (!isActive || !videoId) {
      destroyPlayerInstance();
      setYtError(null);
      setNeedsTapToPlay(false);
      return;
    }

    let cancelled = false;
    setYtError(null);

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !containerRef.current) return;
        const latestVideoId = musicStateRef.current.activeTrack?.youtubeVideoId;
        if (!latestVideoId) return;

        if (!playerRef.current) {
          loadedVideoIdRef.current = latestVideoId;
          suppressHostEmitUntilRef.current = Date.now() + 1400;
          const isRealPublicHttpsOrigin =
            typeof window !== 'undefined' &&
            window.location.protocol === 'https:' &&
            !window.location.hostname.includes('localhost') &&
            window.location.hostname !== '127.0.0.1';

          playerRef.current = new YT.Player(containerRef.current, {
            videoId: latestVideoId,
            width: '100%',
            height: '100%',
            playerVars: {
              autoplay: musicStateRef.current.status === 'playing' ? 1 : 0,
              controls: isHostRef.current ? 1 : 0,
              disablekb: isHostRef.current ? 0 : 1,
              fs: isHostRef.current ? 1 : 0,
              iv_load_policy: 3,
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
                suppressHostEmitUntilRef.current = Date.now() + 1400;
                try {
                  applyVolumeAndMute(player);
                  const expectedPos = computeExpectedPosition();
                  lastHostObservedPosRef.current = expectedPos;
                  if (expectedPos > 0.8) {
                    player.seekTo?.(expectedPos, true);
                  }
                  if (musicStateRef.current.status === 'playing') {
                    player.playVideo?.();
                    scheduleAutoplayWatchdog();
                  } else {
                    player.pauseVideo?.();
                  }
                } catch {
                  // ignore
                }
              },
              onStateChange: (ev: any) => {
                if (cancelled) return;
                const YTState = window.YT?.PlayerState;
                if (!YTState) return;
                const st = musicStateRef.current;
                const player = ev.target;

                if (ev.data === YTState.PLAYING) {
                  clearAutoplayWatchdog();
                  setYtError(null);
                  if (!mutedAutoplayActiveRef.current) {
                    setNeedsTapToPlay(false);
                  }
                  const curPos = typeof player?.getCurrentTime === 'function' ? Number(player.getCurrentTime()) || 0 : 0;
                  lastHostObservedPosRef.current = curPos;

                  if (isHostRef.current) {
                    if (Date.now() > suppressHostEmitUntilRef.current && st.status === 'paused') {
                      suppressHostEmitUntilRef.current = Date.now() + 900;
                      onHostPlaybackChangeRef.current?.('playing', curPos);
                    }
                  } else if (st.status === 'paused') {
                    // Non-host member must stay paused when Host is paused
                    try {
                      player?.pauseVideo?.();
                    } catch {
                      // ignore
                    }
                  }
                } else if (ev.data === YTState.PAUSED) {
                  const curPos = typeof player?.getCurrentTime === 'function' ? Number(player.getCurrentTime()) || 0 : 0;
                  if (isHostRef.current) {
                    if (Date.now() > suppressHostEmitUntilRef.current && st.status === 'playing') {
                      suppressHostEmitUntilRef.current = Date.now() + 900;
                      onHostPlaybackChangeRef.current?.('paused', curPos);
                    }
                  } else if (st.status === 'playing') {
                    // Non-host member cannot independently pause while Host is playing
                    try {
                      player?.playVideo?.();
                    } catch {
                      // ignore
                    }
                  }
                } else if (ev.data === YTState.ENDED && isHostRef.current) {
                  onEndedRef.current?.();
                } else if (
                  (ev.data === YTState.UNSTARTED || ev.data === YTState.CUED) &&
                  st.status === 'playing'
                ) {
                  scheduleAutoplayWatchdog();
                }
              },
              onError: (ev: any) => {
                if (cancelled) return;
                const code = Number(ev?.data);
                let msg = 'YouTube playback error.';
                if (code === 101 || code === 150 || code === 153) {
                  msg =
                    'This YouTube video does not allow embedded playback. Choose another YouTube link or use Gallery Audio.';
                } else if (code === 100) {
                  msg = 'YouTube video not found or private.';
                } else if (code === 2) {
                  msg = 'Invalid YouTube video ID.';
                }
                setYtError(msg);
                onErrorRef.current?.(msg);
              },
            },
          });
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          const msg = err?.message || 'Unable to load YouTube Player.';
          setYtError(msg);
          onErrorRef.current?.(msg);
        }
      });

    return () => {
      cancelled = true;
      clearAutoplayWatchdog();
    };
  }, [isActive]);

  // Synchronize playback state, track switches, volume, mute, and drift correction
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !playerReadyRef.current || !videoId || !isActive) return;

    try {
      applyVolumeAndMute(player);

      if (loadedVideoIdRef.current !== videoId) {
        loadedVideoIdRef.current = videoId;
        suppressHostEmitUntilRef.current = Date.now() + 1400;
        const startPos = computeExpectedPosition();
        lastHostObservedPosRef.current = startPos;
        if (musicState.status === 'playing') {
          player.loadVideoById?.({ videoId, startSeconds: startPos });
          scheduleAutoplayWatchdog();
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
          suppressHostEmitUntilRef.current = Date.now() + 1000;
          lastHostObservedPosRef.current = expectedPos;
          player.seekTo?.(expectedPos, true);
        }
        const st = player.getPlayerState?.();
        if (st !== window.YT?.PlayerState?.PLAYING && st !== window.YT?.PlayerState?.BUFFERING) {
          suppressHostEmitUntilRef.current = Date.now() + 1000;
          player.playVideo?.();
          scheduleAutoplayWatchdog();
        }
      } else if (musicState.status === 'paused') {
        clearAutoplayWatchdog();
        if (drift > 1.2) {
          suppressHostEmitUntilRef.current = Date.now() + 1000;
          lastHostObservedPosRef.current = expectedPos;
          player.seekTo?.(expectedPos, true);
        }
        const st = player.getPlayerState?.();
        if (st !== window.YT?.PlayerState?.PAUSED && st !== window.YT?.PlayerState?.CUED) {
          suppressHostEmitUntilRef.current = Date.now() + 1000;
          player.pauseVideo?.();
        }
      }
    } catch {
      // ignore transient iframe state errors
    }
  }, [
    isActive,
    videoId,
    musicState.status,
    musicState.positionSec,
    musicState.updatedAt,
    musicState.volume,
    isSpeakerMuted,
    localVolumeOverride,
  ]);

  // Report live progress, detect Host iframe seeks, and keep non-host members tightly synced
  useEffect(() => {
    if (!isActive || !videoId) return;
    syncTickCountRef.current = 0;

    const timer = setInterval(() => {
      const player = playerRef.current;
      if (!player || !playerReadyRef.current) return;
      const st = musicStateRef.current;
      const YTState = window.YT?.PlayerState;
      try {
        const cur = Number(player.getCurrentTime?.()) || 0;
        const dur = Number(player.getDuration?.()) || st.activeTrack?.durationSec || 0;
        if (st.status === 'playing') {
          onProgressRef.current?.(cur, dur);
        }

        if (isHostRef.current) {
          // Detect manual scrub/seek performed by Host directly inside the YouTube iframe
          if (
            st.status === 'playing' &&
            Date.now() > suppressHostEmitUntilRef.current &&
            YTState &&
            player.getPlayerState?.() === YTState.PLAYING
          ) {
            const delta = Math.abs(cur - lastHostObservedPosRef.current);
            if (delta > 3.0) {
              suppressHostEmitUntilRef.current = Date.now() + 1000;
              onHostPlaybackChangeRef.current?.('seek', cur);
            }
          }
          lastHostObservedPosRef.current = cur;
        } else {
          // Periodic strict sync enforcement for non-host members (every ~2.4s)
          syncTickCountRef.current += 1;
          if (syncTickCountRef.current % 4 === 0 && YTState) {
            const playerState = player.getPlayerState?.();
            const expected = computeExpectedPosition();
            const drift = Math.abs(expected - cur);

            if (st.status === 'playing') {
              if (drift > 2.2) {
                player.seekTo?.(expected, true);
              }
              if (playerState === YTState.PAUSED) {
                player.playVideo?.();
              }
            } else if (st.status === 'paused') {
              if (playerState === YTState.PLAYING) {
                player.pauseVideo?.();
              }
              if (drift > 1.5) {
                player.seekTo?.(expected, true);
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }, 600);

    return () => clearInterval(timer);
  }, [isActive, videoId]);

  // Guaranteed cleanup on unmount
  useEffect(() => {
    return () => {
      destroyPlayerInstance();
    };
  }, []);

  if (!isActive || !videoId) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden border border-[#00D4FF]/35 bg-[#090B1E]/95 shadow-[0_0_16px_rgba(0,212,255,0.2)] ${
        compact ? 'w-full' : 'w-full'
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-2.5 py-1 bg-[#071A38]/90 border-b border-white/10">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              musicState.status === 'playing' ? 'bg-red-500 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="text-[10px] font-black text-cyan-200 truncate">
            YouTube Sync • {activeTrack?.title || 'Playing'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isHost ? (
            <>
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-bold text-white/60 hover:text-cyan-300 flex items-center gap-0.5 shrink-0"
              >
                YouTube <ExternalLink className="w-2.5 h-2.5" />
              </a>
              {onHostClose && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onHostClose();
                  }}
                  aria-label="Close and stop YouTube player for everyone"
                  title="Close & Stop YouTube for Room"
                  className="w-5 h-5 rounded-full bg-rose-500/25 hover:bg-rose-500/45 border border-rose-400/50 flex items-center justify-center text-rose-200 active:scale-95 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </>
          ) : (
            <span className="text-[9px] font-bold text-cyan-200/80">
              {musicState.status === 'playing' ? 'Host Playing' : 'Paused by Host'}
            </span>
          )}
        </div>
      </div>

      <div className={`relative w-full bg-black ${compact ? 'h-[118px]' : 'aspect-video max-h-44'}`}>
        <div ref={containerRef} className="w-full h-full" />

        {/* Interaction Shield for non-host members: prevents independent pause/play/seek inside iframe */}
        {!isHost && <div className="absolute inset-0 z-10 bg-transparent" aria-hidden="true" />}

        {needsTapToPlay && !ytError && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              try {
                mutedAutoplayActiveRef.current = false;
                setNeedsTapToPlay(false);
                const player = playerRef.current;
                if (player) {
                  applyVolumeAndMute(player);
                  const expectedPos = computeExpectedPosition();
                  if (expectedPos > 0.5) {
                    player.seekTo?.(expectedPos, true);
                  }
                  if (musicStateRef.current.status === 'playing') {
                    player.playVideo?.();
                  }
                }
              } catch {
                // ignore
              }
            }}
            className="absolute inset-0 z-20 bg-black/65 flex items-center justify-center gap-1.5 text-xs font-black text-cyan-200 backdrop-blur-[1px]"
          >
            <Volume2 className="w-4 h-4 text-cyan-300" />
            <span>Tap to Unmute &amp; Sync Audio</span>
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
