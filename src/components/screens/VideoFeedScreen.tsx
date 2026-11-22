import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Repeat2,
  Gift,
  Music,
  X,
  Plus,
  Play,
  Trash2,
  Flag,
  Eye,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { VideoItem, UserProfile, GiftItem, VideoComment } from '../../types';
import { AvatarWithFrame } from '../common/AvatarWithFrame';
import {
  toggleReelLike,
  subscribeReelComments,
  addReelComment,
  recordReelView,
  incrementReelShare,
  deleteOwnReel,
  submitContentReport,
} from '../../services/reelService';
import {
  isFirestoreChunkedVideoUrl,
  resolveFirestoreChunkedReelUrl,
} from '../../services/storageService';

interface VideoFeedScreenProps {
  videos: VideoItem[];
  currentUser: UserProfile;
  onOpenGiftShop: (recipient: UserProfile) => void;
  onSelectUser: (user: UserProfile) => void;
  onUploadClick: () => void;
  onUpdateVideo?: (updatedVideo: VideoItem) => void;
  onDeleteVideo?: (videoId: string) => void;
  hasMoreVideos?: boolean;
  isLoadingMore?: boolean;
  onLoadMoreVideos?: () => void;
  activeGiftCelebration?: {
    gift: GiftItem;
    sender: string;
    recipient: string;
    quantity: number;
  } | null;
}

interface FloatingHeart {
  id: number;
  x: number;
  y: number;
}

function isPlayableVideoUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (isFirestoreChunkedVideoUrl(url)) return true;
  if (lower.startsWith('blob:') || lower.startsWith('data:video/')) return true;
  if (/\.(mp4|webm|mov|m4v|ogg|ogv|3gp|mkv|m3u8)(\?|$)/i.test(lower)) return true;
  if (lower.includes('/api/reels/media/')) {
    return !/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(lower);
  }
  if (lower.includes('firebasestorage') && !/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(lower)) {
    return true;
  }
  return false;
}

function formatCompactCount(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(Math.max(0, num));
}

export const VideoFeedScreen: React.FC<VideoFeedScreenProps> = ({
  videos,
  currentUser,
  onOpenGiftShop,
  onSelectUser,
  onUploadClick,
  onUpdateVideo,
  onDeleteVideo,
  hasMoreVideos = false,
  isLoadingMore = false,
  onLoadMoreVideos,
  activeGiftCelebration,
}) => {
  const [feedVideos, setFeedVideos] = useState<VideoItem[]>(videos);
  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou');
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  // Sync feed when videos prop updates; jump to index 0 when a brand-new reel is prepended
  useEffect(() => {
    setFeedVideos((prev) => {
      const prevIds = new Set(prev.map((v) => v.id));
      const newestTopId = videos[0]?.id;
      const isNewTopPrepend = Boolean(newestTopId && prev.length > 0 && !prevIds.has(newestTopId));

      if (isNewTopPrepend) {
        setIsEndOfFeed(false);
        setActiveVideoIndex(0);
        return videos;
      }

      const currentId = prev[activeVideoIndex]?.id;
      if (currentId) {
        const nextIdx = videos.findIndex((v) => v.id === currentId);
        if (nextIdx >= 0 && nextIdx !== activeVideoIndex) {
          setActiveVideoIndex(nextIdx);
        } else if (nextIdx === -1 && activeVideoIndex >= videos.length) {
          setActiveVideoIndex(Math.max(0, videos.length - 1));
        }
      } else if (videos.length > 0) {
        setActiveVideoIndex(0);
      }
      return videos;
    });
  }, [videos]);

  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);

  // Persisted Comments drawer state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Delete & Report modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate content');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const lastTapRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const wheelLockUntilRef = useRef<number>(0);
  const viewedIdsRef = useRef<Set<string>>(new Set());

  const currentVideo = feedVideos[activeVideoIndex] || feedVideos[0];
  const isCurrentVideoPlayable = isPlayableVideoUrl(currentVideo?.videoUrl);
  const isOwnVideo = Boolean(
    currentVideo &&
      (currentVideo.creatorUid === currentUser.id || currentVideo.creator?.id === currentUser.id)
  );

  // Playback & resilient video resolution state
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isEndOfFeed, setIsEndOfFeed] = useState(false);
  const [resolvedVideoSrc, setResolvedVideoSrc] = useState<string>('');
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);
  const [videoRetryNonce, setVideoRetryNonce] = useState(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  // Deduplicated Firestore view tracking whenever active reel changes
  useEffect(() => {
    if (!currentVideo || isEndOfFeed) return;
    if (!viewedIdsRef.current.has(currentVideo.id)) {
      viewedIdsRef.current.add(currentVideo.id);
      void recordReelView(currentVideo.id, currentUser.id, currentVideo.sourceCollection);
    }
    setPlaybackProgress(0);
    setIsPlaying(true);
  }, [currentVideo?.id, currentUser.id, isEndOfFeed]);

  // Real-time Firestore comments subscription when drawer is open
  useEffect(() => {
    if (!showComments || !currentVideo) return;
    const unsub = subscribeReelComments(currentVideo.id, (list) => {
      setComments(list);
    });
    return () => unsub();
  }, [showComments, currentVideo?.id]);

  // Resolve standard or Firestore-chunked video URLs and pre-warm the next reel
  useEffect(() => {
    let cancelled = false;
    setVideoLoadError(null);

    if (!currentVideo || isEndOfFeed || !isCurrentVideoPlayable) {
      setResolvedVideoSrc('');
      setIsVideoLoading(false);
      return;
    }

    const rawUrl = currentVideo.videoUrl;
    if (isFirestoreChunkedVideoUrl(rawUrl)) {
      setResolvedVideoSrc('');
      setIsVideoLoading(true);
      resolveFirestoreChunkedReelUrl(rawUrl, currentVideo.videoMimeType)
        .then((blobUrl) => {
          if (cancelled) return;
          setResolvedVideoSrc(blobUrl);
          setIsVideoLoading(false);
        })
        .catch((err) => {
          if (cancelled) return;
          console.warn('[VideoFeed] Chunked reel load failed:', err);
          setIsVideoLoading(false);
          setVideoLoadError('Unable to load video right now. Tap to retry.');
        });
    } else {
      setResolvedVideoSrc(rawUrl);
      setIsVideoLoading(true);
    }

    // Background pre-warm next chunked reel so vertical swipes are instant
    const nextVideo = feedVideos[activeVideoIndex + 1];
    if (nextVideo && isFirestoreChunkedVideoUrl(nextVideo.videoUrl)) {
      void resolveFirestoreChunkedReelUrl(nextVideo.videoUrl, nextVideo.videoMimeType).catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [currentVideo?.id, currentVideo?.videoUrl, currentVideo?.videoMimeType, isCurrentVideoPlayable, isEndOfFeed, videoRetryNonce, activeVideoIndex, feedVideos]);

  // Real HTML5 <video> play/pause sync — ALWAYS keep audio ON automatically without a speaker toggle
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isCurrentVideoPlayable || !resolvedVideoSrc || isEndOfFeed) return;

    let unlockCleanup: (() => void) | null = null;

    if (isPlaying) {
      el.muted = false;
      el.volume = 1;
      el.play().catch(() => {
        // If a browser enforces autoplay lock on cold load before any gesture,
        // start temporarily silent and automatically unmute on the very first interaction anywhere.
        el.muted = true;
        el.play().catch(() => {});

        const unlockAudio = () => {
          const v = videoRef.current;
          if (v) {
            v.muted = false;
            v.volume = 1;
            v.play().catch(() => {});
          }
          cleanupUnlock();
        };

        const cleanupUnlock = () => {
          window.removeEventListener('pointerdown', unlockAudio, true);
          window.removeEventListener('touchstart', unlockAudio, true);
          window.removeEventListener('click', unlockAudio, true);
          window.removeEventListener('keydown', unlockAudio, true);
        };

        window.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true });
        window.addEventListener('touchstart', unlockAudio, { capture: true, passive: true });
        window.addEventListener('click', unlockAudio, { capture: true, passive: true });
        window.addEventListener('keydown', unlockAudio, { capture: true, passive: true });
        unlockCleanup = cleanupUnlock;
      });
    } else {
      el.pause();
    }

    return () => {
      if (unlockCleanup) unlockCleanup();
    };
  }, [isPlaying, currentVideo?.id, resolvedVideoSrc, isCurrentVideoPlayable, isEndOfFeed]);

  // Fallback timer ONLY for legacy static image posts (real videos drive progress via onTimeUpdate)
  useEffect(() => {
    if (!currentVideo || !isPlaying || isEndOfFeed || isCurrentVideoPlayable) return;
    setPlaybackProgress(0);
    const progressInterval = setInterval(() => {
      setPlaybackProgress((prev) => {
        if (prev >= 100) {
          if (activeVideoIndex < feedVideos.length - 1) {
            setActiveVideoIndex((i) => i + 1);
            return 0;
          } else {
            setIsEndOfFeed(true);
            return 100;
          }
        }
        return prev + 2.5;
      });
    }, 200);
    return () => clearInterval(progressInterval);
  }, [activeVideoIndex, isPlaying, isEndOfFeed, feedVideos.length, isCurrentVideoPlayable]);

  const triggerHeartAtCoord = (x: number, y: number) => {
    const id = Date.now() + Math.random();
    setFloatingHearts((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
    }, 1800);
  };

  const handleVideoSurfaceTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      triggerHeartAtCoord(x, y);
      if (currentVideo && !currentVideo.isLiked) {
        void toggleLike();
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= 310) {
          setIsPlaying((p) => !p);
        }
      }, 320);
    }
  };

  // Touch gestures for mobile vertical swiping (ignored when modal/comments sheet is open)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (showComments || showDeleteConfirm || showReportModal) return;
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null || showComments || showDeleteConfirm || showReportModal) {
      touchStartY.current = null;
      touchStartX.current = null;
      return;
    }
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    const diffX =
      touchStartX.current !== null ? Math.abs(touchStartX.current - e.changedTouches[0].clientX) : 0;
    if (Math.abs(diffY) > 40 && Math.abs(diffY) > diffX * 1.15) {
      if (diffY > 0) {
        handleScrollNext();
      } else {
        handleScrollPrev();
      }
    }
    touchStartY.current = null;
    touchStartX.current = null;
  };

  // Mouse wheel / trackpad vertical scrolling between reels
  const handleWheel = (e: React.WheelEvent) => {
    if (showComments || showDeleteConfirm || showReportModal) return;
    const now = Date.now();
    if (now < wheelLockUntilRef.current) return;
    if (Math.abs(e.deltaY) < 28) return;
    wheelLockUntilRef.current = now + 420;
    if (e.deltaY > 0) {
      handleScrollNext();
    } else {
      handleScrollPrev();
    }
  };

  const toggleLike = async () => {
    const v = currentVideo;
    if (!v) return;
    const optimisticLiked = !v.isLiked;
    const optimisticCount = optimisticLiked ? v.likesCount + 1 : Math.max(0, v.likesCount - 1);
    const optimisticVideo: VideoItem = {
      ...v,
      isLiked: optimisticLiked,
      likesCount: optimisticCount,
    };

    setFeedVideos((prev) => prev.map((item) => (item.id === v.id ? optimisticVideo : item)));
    onUpdateVideo?.(optimisticVideo);

    try {
      const result = await toggleReelLike(v, currentUser.id);
      const syncedVideo: VideoItem = {
        ...v,
        isLiked: result.liked,
        likesCount: typeof result.likesCount === 'number' ? result.likesCount : optimisticCount,
      };
      setFeedVideos((prev) => prev.map((item) => (item.id === v.id ? syncedVideo : item)));
      onUpdateVideo?.(syncedVideo);
    } catch {
      showToast('Could not sync like right now.');
    }
  };

  const toggleRepost = () => {
    const v = currentVideo;
    if (!v) return;
    const isNowReposted = !v.isReposted;
    const updatedCount = isNowReposted ? v.repostsCount + 1 : Math.max(0, v.repostsCount - 1);
    const updatedVideo: VideoItem = {
      ...v,
      isReposted: isNowReposted,
      repostsCount: updatedCount,
    };
    setFeedVideos((prev) => prev.map((item) => (item.id === v.id ? updatedVideo : item)));
    onUpdateVideo?.(updatedVideo);
    showToast(isNowReposted ? 'Reel reposted!' : 'Repost removed');
  };

  const handleShareReel = async () => {
    if (!currentVideo) return;
    const shareUrl = `${window.location.origin}/?reel=${currentVideo.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${currentVideo.creator.name} on Lenzo Party`,
          text: currentVideo.description,
          url: shareUrl,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Reel link copied to clipboard!');
      }
      await incrementReelShare(currentVideo.id, currentVideo.sourceCollection);
      setFeedVideos((prev) =>
        prev.map((item) =>
          item.id === currentVideo.id ? { ...item, sharesCount: (item.sharesCount || 0) + 1 } : item
        )
      );
    } catch {
      // User dismissed native share sheet
    }
  };

  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentInput.trim() || !currentVideo || isPostingComment) return;
    setIsPostingComment(true);
    try {
      await addReelComment({
        reelId: currentVideo.id,
        user: currentUser,
        text: commentInput.trim(),
        sourceCollection: currentVideo.sourceCollection,
      });
      setCommentInput('');
      setFeedVideos((prev) =>
        prev.map((v) =>
          v.id === currentVideo.id ? { ...v, commentsCount: (v.commentsCount || 0) + 1 } : v
        )
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed to post comment.');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleConfirmDeleteReel = async () => {
    if (!currentVideo || !isOwnVideo || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteOwnReel(currentVideo);
      const deletedId = currentVideo.id;
      setFeedVideos((prev) => prev.filter((item) => item.id !== deletedId));
      onDeleteVideo?.(deletedId);
      setShowDeleteConfirm(false);
      setActiveVideoIndex((idx) => Math.max(0, Math.min(idx, feedVideos.length - 2)));
      showToast('Reel permanently deleted from Storage & Feed.');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete reel.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVideo || isSubmittingReport) return;
    setIsSubmittingReport(true);
    try {
      await submitContentReport({
        targetType: 'reel',
        targetId: currentVideo.id,
        targetOwnerUid: currentVideo.creatorUid || currentVideo.creator.id,
        reason: reportReason,
        details: reportDetails,
      });
      setShowReportModal(false);
      setReportDetails('');
      showToast('Report submitted. Thank you for keeping Lenzo Party safe.');
    } catch (err: any) {
      showToast(err?.message || 'Could not submit report.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleScrollNext = () => {
    if (isEndOfFeed) {
      setIsEndOfFeed(false);
      setActiveVideoIndex(0);
      return;
    }
    if (activeVideoIndex < feedVideos.length - 1) {
      setActiveVideoIndex(activeVideoIndex + 1);
    } else if (hasMoreVideos && onLoadMoreVideos) {
      onLoadMoreVideos();
    } else {
      setIsEndOfFeed(true);
    }
  };

  const handleScrollPrev = () => {
    if (isEndOfFeed) {
      setIsEndOfFeed(false);
      return;
    }
    if (activeVideoIndex > 0) {
      setActiveVideoIndex(activeVideoIndex - 1);
    }
  };

  // Empty State when no videos exist yet
  if (!currentVideo) {
    return (
      <div className="relative w-full h-[calc(100dvh-64px-var(--safe-bottom))] md:h-dvh-screen bg-[#090611] overflow-hidden select-none animate-fade-in flex flex-col items-center justify-center p-6 safe-pt-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#160C25] border border-white/10 flex items-center justify-center mb-4">
          <Play className="w-7 h-7 text-[#F328D5]" />
        </div>
        <h2 className="text-lg font-extrabold text-white font-display">No Reels Yet</h2>
        <p className="text-xs text-[#B9AECF] mt-1 max-w-xs">
          Reels uploaded by creators to Firebase Storage appear here in real time.
        </p>
        <button
          onClick={onUploadClick}
          className="mt-5 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-extrabold shadow-lg active:scale-95 transition-transform flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Upload Reel
        </button>
      </div>
    );
  }

  // End of Feed Screen
  if (isEndOfFeed) {
    return (
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className="relative w-full h-[calc(100dvh-64px-var(--safe-bottom))] md:h-dvh-screen bg-[#090611] overflow-hidden select-none animate-fade-in flex flex-col justify-between px-4 pb-6 safe-pt-3 text-center"
      >
        <div className="relative z-30 flex items-center justify-between gap-2">
          <button
            onClick={() => setIsEndOfFeed(false)}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white"
          >
            ‹
          </button>
          <div className="flex items-center bg-black/40 backdrop-blur-md border border-white/15 rounded-full p-1">
            <span className="px-4 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white">
              For You
            </span>
            <span className="px-4 py-1.5 rounded-full text-xs font-black text-[#B9AECF]">
              Following
            </span>
          </div>
          <div className="w-9 h-9" />
        </div>

        <div className="relative z-20 flex flex-col items-center my-auto space-y-5 max-w-sm mx-auto">
          <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-tr from-[#3B82F6]/20 via-[#8B20FF]/30 to-[#F328D5]/20 border-2 border-[#8B20FF] p-4 flex flex-col items-center justify-center text-white shadow-[0_0_35px_rgba(139,32,255,0.45)]">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8B20FF] to-[#F328D5] flex items-center justify-center text-white shadow-lg">
              <Play className="w-6 h-6 fill-white ml-0.5" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-white font-display tracking-tight mb-2">
              You're All Caught Up
            </h2>
            <p className="text-xs text-[#B9AECF] leading-relaxed">
              Load more reels or replay from the top.
            </p>
          </div>

          <div className="w-full space-y-2.5">
            {hasMoreVideos && onLoadMoreVideos && (
              <button
                onClick={() => {
                  setIsEndOfFeed(false);
                  onLoadMoreVideos();
                }}
                disabled={isLoadingMore}
                className="w-full py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white font-extrabold text-sm flex items-center justify-center gap-2"
              >
                {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Load More Reels</span>
              </button>
            )}
            <button
              onClick={() => {
                setIsEndOfFeed(false);
                setActiveVideoIndex(0);
              }}
              className="w-full py-3 rounded-full bg-gradient-to-r from-[#8B20FF] via-[#a825e6] to-[#F328D5] hover:opacity-95 text-white font-extrabold text-sm shadow-lg shadow-[#8B20FF]/30 active:scale-95 transition-all"
            >
              Replay Feed
            </button>
          </div>
        </div>

        <div className="pb-4" />
      </div>
    );
  }

  return (
    <div
      data-ptr-block={activeVideoIndex > 0 ? 'true' : undefined}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      className="relative w-full h-[calc(100dvh-64px-var(--safe-bottom))] md:h-dvh-screen bg-black overflow-hidden select-none animate-fade-in flex flex-col justify-between"
    >
      {/* Toast */}
      {toastMessage && (
        <div className="absolute safe-top-offset-16 left-1/2 -translate-x-1/2 z-50 bg-[#8B20FF] text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg shadow-[#8B20FF]/50 animate-fade-in pointer-events-none whitespace-nowrap">
          {toastMessage}
        </div>
      )}

      {/* Gift Celebration Banner on Video */}
      {activeGiftCelebration && (
        <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center animate-bounce">
            <span className="text-7xl filter drop-shadow-[0_0_35px_#F328D5] mb-3">
              {activeGiftCelebration.gift.icon}
            </span>
            <div className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#190C2B] to-[#2D0F47] border border-[#F328D5] text-center shadow-2xl">
              <span className="text-sm font-black text-white block">
                {activeGiftCelebration.sender} sent {activeGiftCelebration.quantity}x {activeGiftCelebration.gift.name}!
              </span>
              <span className="text-xs text-[#FFC84A] font-bold">
                +{activeGiftCelebration.gift.coins * activeGiftCelebration.quantity} Coins Gift Support
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between gap-2 px-3 sm:px-4 pb-3 safe-pt-3 pointer-events-auto">
        <button
          onClick={handleScrollPrev}
          disabled={activeVideoIndex === 0}
          className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-opacity ${
            activeVideoIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/60'
          }`}
          title="Previous Reel"
        >
          ‹
        </button>

        {/* Segmented Tab */}
        <div className="flex items-center bg-black/40 backdrop-blur-md border border-white/15 rounded-full p-1 shadow-lg shrink-0">
          <button
            onClick={() => setActiveTab('foryou')}
            className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-black transition-all ${
              activeTab === 'foryou'
                ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md shadow-[#F328D5]/30'
                : 'text-[#B9AECF] hover:text-white'
            }`}
          >
            For You
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-black transition-all ${
              activeTab === 'following'
                ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md shadow-[#F328D5]/30'
                : 'text-[#B9AECF] hover:text-white'
            }`}
          >
            Following
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onUploadClick}
            className="w-9 h-9 rounded-full bg-gradient-to-r from-[#8B20FF] to-[#F328D5] flex items-center justify-center text-white shadow-md active:scale-95 transition-transform"
            title="Upload Reel"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Real Video / Media Player Container */}
      <div
        onClick={handleVideoSurfaceTap}
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-pointer bg-black"
      >
        {isCurrentVideoPlayable ? (
          resolvedVideoSrc ? (
            <video
              key={`${currentVideo.id}_${videoRetryNonce}`}
              ref={videoRef}
              src={resolvedVideoSrc}
              poster={
                currentVideo.thumbnailUrl &&
                currentVideo.thumbnailUrl !== currentVideo.videoUrl &&
                !isFirestoreChunkedVideoUrl(currentVideo.thumbnailUrl)
                  ? currentVideo.thumbnailUrl
                  : undefined
              }
              autoPlay
              loop
              playsInline
              preload="auto"
              onLoadStart={() => setIsVideoLoading(true)}
              onLoadedData={() => {
                setIsVideoLoading(false);
                setVideoLoadError(null);
              }}
              onCanPlay={(e) => {
                setIsVideoLoading(false);
                setVideoLoadError(null);
                if (isPlaying && e.currentTarget.paused) {
                  e.currentTarget.play().catch(() => {
                    e.currentTarget.muted = true;
                    e.currentTarget.play().catch(() => {});
                  });
                }
              }}
              onWaiting={() => setIsVideoLoading(true)}
              onPlaying={() => {
                setIsVideoLoading(false);
                setVideoLoadError(null);
              }}
              onError={() => {
                setIsVideoLoading(false);
                setVideoLoadError('Video playback error. Tap to retry.');
              }}
              onTimeUpdate={(e) => {
                const el = e.currentTarget;
                if (el.duration && Number.isFinite(el.duration) && el.duration > 0) {
                  setPlaybackProgress(Math.min(100, (el.currentTime / el.duration) * 100));
                }
              }}
              className="w-full h-full object-cover"
            />
          ) : currentVideo.thumbnailUrl && !isFirestoreChunkedVideoUrl(currentVideo.thumbnailUrl) ? (
            <img
              src={currentVideo.thumbnailUrl}
              alt={currentVideo.description}
              className="w-full h-full object-cover filter brightness-90"
            />
          ) : (
            <div className="w-full h-full bg-[#090611]" />
          )
        ) : (
          <img
            src={
              currentVideo.thumbnailUrl && !isFirestoreChunkedVideoUrl(currentVideo.thumbnailUrl)
                ? currentVideo.thumbnailUrl
                : currentVideo.videoUrl
            }
            alt={currentVideo.description}
            className="w-full h-full object-cover filter brightness-95"
          />
        )}

        {/* Loading / Buffering Spinner */}
        {isCurrentVideoPlayable && isVideoLoading && !videoLoadError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-12 h-12 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-[#FA26A0] animate-spin" />
            </div>
          </div>
        )}

        {/* Video Error Recovery Overlay */}
        {videoLoadError && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setVideoLoadError(null);
              setVideoRetryNonce((n) => n + 1);
            }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm z-25 px-6 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-[#FA26A0]/20 border border-[#FA26A0]/50 flex items-center justify-center text-[#FA26A0]">
              <RefreshCw className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-white max-w-xs">{videoLoadError}</p>
            <span className="px-4 py-1.5 rounded-full bg-[#FA26A0] text-white text-xs font-extrabold">
              Retry Video
            </span>
          </div>
        )}

        {/* Ambient Overlays for Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/85 pointer-events-none" />

        {/* Play/Pause state indicator */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <Play className="w-8 h-8 fill-white ml-1" />
            </div>
          </div>
        )}

        {/* Floating Hearts from Double-tap */}
        {floatingHearts.map((h) => (
          <div
            key={h.id}
            className="absolute pointer-events-none text-4xl animate-float-heart drop-shadow-[0_0_12px_#F328D5] z-30"
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
          >
            💖
          </div>
        ))}

        {/* Desktop Up/Down controls */}
        <div className="hidden md:flex flex-col gap-2 absolute right-24 top-1/2 -translate-y-1/2 z-30">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleScrollPrev();
            }}
            disabled={activeVideoIndex === 0}
            className="w-10 h-10 rounded-full bg-black/60 border border-white/15 flex items-center justify-center text-white hover:bg-[#8B20FF] disabled:opacity-35"
          >
            ▲
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleScrollNext();
            }}
            className="w-10 h-10 rounded-full bg-black/60 border border-white/15 flex items-center justify-center text-white hover:bg-[#F328D5]"
          >
            ▼
          </button>
        </div>
      </div>

      {/* Right Action Floating Column */}
      <div className="absolute right-3.5 bottom-24 sm:bottom-28 z-30 flex flex-col items-center gap-3.5 pointer-events-auto">
        {/* Creator Avatar */}
        <div className="relative mb-1">
          <div
            onClick={() => onSelectUser(currentVideo.creator)}
            className="cursor-pointer hover:scale-105 transition-transform"
          >
            <AvatarWithFrame
              avatar={currentVideo.creator.avatar}
              name={currentVideo.creator.name}
              level={currentVideo.creator.level || 0}
              size="md"
            />
          </div>
        </div>

        {/* Like Button */}
        <button
          onClick={() => void toggleLike()}
          className="flex flex-col items-center group active:scale-75 transition-transform"
        >
          <div
            className={`w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center transition-colors ${
              currentVideo.isLiked ? 'text-rose-500' : 'text-white'
            }`}
          >
            <Heart
              className={`w-6 h-6 ${currentVideo.isLiked ? 'fill-rose-500 stroke-rose-500' : 'stroke-[2]'}`}
            />
          </div>
          <span className="text-[11px] font-bold text-white mt-1 font-mono">
            {formatCompactCount(currentVideo.likesCount)}
          </span>
        </button>

        {/* Comments Button */}
        <button
          onClick={() => setShowComments(true)}
          className="flex flex-col items-center group active:scale-75 transition-transform"
        >
          <div className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center text-white">
            <MessageCircle className="w-6 h-6 stroke-[2]" />
          </div>
          <span className="text-[11px] font-bold text-white mt-1 font-mono">
            {formatCompactCount(currentVideo.commentsCount)}
          </span>
        </button>

        {/* Repost Button */}
        <button
          onClick={toggleRepost}
          className="flex flex-col items-center group active:scale-75 transition-transform"
        >
          <div
            className={`w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center transition-colors ${
              currentVideo.isReposted ? 'text-[#06B6D4]' : 'text-white'
            }`}
          >
            <Repeat2 className="w-6 h-6 stroke-[2]" />
          </div>
          <span className="text-[11px] font-bold text-white mt-1 font-mono">
            {formatCompactCount(currentVideo.repostsCount)}
          </span>
        </button>

        {/* Virtual Gift Button */}
        <button
          onClick={() => onOpenGiftShop(currentVideo.creator)}
          className="flex flex-col items-center group active:scale-75 transition-transform"
        >
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#8B20FF] via-[#F328D5] to-[#FFC84A] flex items-center justify-center text-white shadow-lg shadow-[#F328D5]/40">
            <Gift className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] font-bold text-[#FFC84A] mt-1">Gift</span>
        </button>

        {/* Share Button */}
        <button
          onClick={() => void handleShareReel()}
          className="flex flex-col items-center group active:scale-75 transition-transform"
        >
          <div className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center text-white">
            <Share2 className="w-5 h-5 stroke-[2]" />
          </div>
          <span className="text-[11px] font-bold text-white mt-1 font-mono">
            {formatCompactCount(currentVideo.sharesCount || 0)}
          </span>
        </button>

        {/* Owner Delete OR Viewer Report Button */}
        {isOwnVideo ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex flex-col items-center group active:scale-75 transition-transform"
            title="Delete Your Reel"
          >
            <div className="w-10 h-10 rounded-full bg-rose-600/35 hover:bg-rose-600/60 backdrop-blur-md border border-rose-400/40 flex items-center justify-center text-rose-200">
              <Trash2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-rose-300 mt-1">Delete</span>
          </button>
        ) : (
          <button
            onClick={() => setShowReportModal(true)}
            className="flex flex-col items-center group active:scale-75 transition-transform"
            title="Report Reel"
          >
            <div className="w-10 h-10 rounded-full bg-black/45 hover:bg-amber-500/25 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/75 hover:text-amber-300">
              <Flag className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-white/70 mt-1">Report</span>
          </button>
        )}
      </div>

      {/* Bottom Creator Meta & Description */}
      <div className="relative z-30 p-4 pb-6 pr-20 max-w-lg pointer-events-auto">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            onClick={() => onSelectUser(currentVideo.creator)}
            className="text-sm font-black text-white hover:underline cursor-pointer"
          >
            {currentVideo.creator.name}
          </span>
          <span className="text-xs text-[#B9AECF] font-mono">{currentVideo.creator.username}</span>
          <span className="inline-flex items-center gap-1 text-[10px] text-white/70 bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
            <Eye className="w-3 h-3" />
            {formatCompactCount(currentVideo.viewsCount || 0)}
          </span>
        </div>

        <p className="text-xs text-white/95 line-clamp-2 leading-relaxed mb-2 drop-shadow">
          {currentVideo.description}
        </p>

        {/* Hashtags */}
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {currentVideo.hashtags.map((tag) => (
            <span key={tag} className="text-xs font-bold text-[#FFC84A]">
              {tag}
            </span>
          ))}
        </div>

        {/* Music ticker + Pagination badge */}
        <div className="flex items-center justify-between gap-2 text-xs text-white/80">
          <div className="flex items-center gap-2 min-w-0">
            <Music className="w-3.5 h-3.5 text-[#F328D5] shrink-0" />
            <span className="text-[11px] font-mono truncate">{currentVideo.musicTitle}</span>
          </div>
          {hasMoreVideos && onLoadMoreVideos && activeVideoIndex >= feedVideos.length - 2 && (
            <button
              onClick={onLoadMoreVideos}
              disabled={isLoadingMore}
              className="shrink-0 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-[10px] font-bold text-white"
            >
              {isLoadingMore ? 'Loading...' : 'Load More'}
            </button>
          )}
        </div>
      </div>

      {/* Video Progress Scrubber Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 h-1 bg-white/20">
        <div
          className="h-full bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] transition-all duration-150 shadow-[0_0_8px_#F328D5]"
          style={{ width: `${playbackProgress}%` }}
        />
      </div>

      {/* Slide-Up Persisted Comments Drawer */}
      {showComments && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-lg bg-[#160C25] border-t border-white/15 rounded-t-3xl p-4 sm:p-5 h-[65vh] flex flex-col justify-between shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#F328D5]" />
                <span>Comments ({comments.length})</span>
              </span>
              <button onClick={() => setShowComments(false)} className="text-[#B9AECF] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 no-scrollbar">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[#B9AECF]">
                  <p>No comments yet. Be the first to share a thought!</p>
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 text-xs">
                    <img
                      src={
                        c.user.avatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
                      }
                      alt={c.user.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white truncate">{c.user.name}</span>
                        <span className="text-[10px] text-[#B9AECF]">{c.timestamp}</span>
                      </div>
                      <p className="text-white/90 mt-0.5 break-words">{c.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={(e) => void handleAddComment(e)}
              className="flex items-center gap-2 pt-2 border-t border-white/[0.08]"
            >
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                maxLength={400}
                className="flex-1 bg-black/50 border border-white/15 rounded-full px-4 py-2 text-xs text-white placeholder-[#B9AECF] outline-none focus:border-[#F328D5]"
              />
              <button
                type="submit"
                disabled={!commentInput.trim() || isPostingComment}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-bold disabled:opacity-40"
              >
                {isPostingComment ? '...' : 'Post'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Owner Delete Reel Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-xs bg-[#160C25] border border-rose-500/35 rounded-3xl p-5 text-center space-y-3.5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <h4 className="text-base font-extrabold text-white">Delete This Reel?</h4>
            <p className="text-xs text-[#B9AECF] leading-relaxed">
              This will permanently remove the video and thumbnail from Firebase Storage and Firestore.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleConfirmDeleteReel()}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Reel Modal */}
      {showReportModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <form
            onSubmit={(e) => void handleSubmitReport(e)}
            className="w-full max-w-sm bg-[#160C25] border border-white/15 rounded-3xl p-5 space-y-3.5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                <Flag className="w-4 h-4 text-amber-400" />
                Report Reel
              </h4>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {[
                'Inappropriate content',
                'Spam or scam',
                'Harassment or hate speech',
                'Copyright violation',
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setReportReason(reason)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    reportReason === reason
                      ? 'bg-[#8B20FF]/30 border-[#F328D5] text-white'
                      : 'bg-white/[0.04] border-white/10 text-[#B9AECF]'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              placeholder="Optional details..."
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              maxLength={300}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-[#B9AECF]/50 outline-none"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingReport}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-extrabold disabled:opacity-50"
              >
                {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
