import React, { useState, useRef, useEffect } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Repeat2, 
  Gift, 
  Music, 
  Sparkles, 
  X, 
  Send, 
  Check, 
  Volume2, 
  VolumeX, 
  Plus,
  Play
} from 'lucide-react';
import { VideoItem, UserProfile, GiftItem } from '../../types';
import { AvatarWithFrame } from '../common/AvatarWithFrame';

interface VideoFeedScreenProps {
  videos: VideoItem[];
  currentUser: UserProfile;
  onOpenGiftShop: (recipient: UserProfile) => void;
  onSelectUser: (user: UserProfile) => void;
  onUploadClick: () => void;
  onUpdateVideo?: (updatedVideo: VideoItem) => void;
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

export const VideoFeedScreen: React.FC<VideoFeedScreenProps> = ({
  videos,
  currentUser,
  onOpenGiftShop,
  onSelectUser,
  onUploadClick,
  onUpdateVideo,
  activeGiftCelebration,
}) => {
  const [feedVideos, setFeedVideos] = useState<VideoItem[]>(videos);
  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou');
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  // Sync feed when videos prop updates (e.g. after upload)
  useEffect(() => {
    setFeedVideos(videos);
    setActiveVideoIndex(0);
  }, [videos]);
  const [isMuted, setIsMuted] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  
  // Comment drawer state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Array<{ id: string; user: string; avatar: string; text: string; time: string; likes: number }>>([
    { id: 'c1', user: 'Ali123', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', text: 'So beautiful! ❤️', time: '1h ago', likes: 24 },
    { id: 'c2', user: 'Mahi786', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', text: 'Lovely vibes 💖✨', time: '34m ago', likes: 12 },
    { id: 'c3', user: 'KingStar', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', text: 'Nice! 👍 Queen of party live', time: '12m ago', likes: 8 }
  ]);
  const [commentInput, setCommentInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const lastTapRef = useRef<number>(0);
  const currentVideo = feedVideos[activeVideoIndex] || feedVideos[0];

  // Playback timer & progress
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isEndOfFeed, setIsEndOfFeed] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Continuous automatic video progression and auto-advance
  useEffect(() => {
    if (!isPlaying || isEndOfFeed) return;

    setPlaybackProgress(0);
    const progressInterval = setInterval(() => {
      setPlaybackProgress((prev) => {
        if (prev >= 100) {
          // Video finished: auto advance to next video or end-of-feed
          if (activeVideoIndex < feedVideos.length - 1) {
            setActiveVideoIndex((i) => i + 1);
            return 0;
          } else {
            setIsEndOfFeed(true);
            return 100;
          }
        }
        return prev + 2.5; // ~8 seconds simulated video length
      });
    }, 200);

    return () => clearInterval(progressInterval);
  }, [activeVideoIndex, isPlaying, isEndOfFeed, feedVideos.length]);

  const triggerHeartAtCoord = (x: number, y: number) => {
    const id = Date.now() + Math.random();
    setFloatingHearts((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
    }, 1800);
  };

  const handleDoubleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      triggerHeartAtCoord(x, y);

      // Toggle like state if not already liked
      if (!currentVideo.isLiked) {
        toggleLike();
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      // Single tap toggles play/pause
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= 340) {
          setIsPlaying((p) => !p);
        }
      }, 350);
    }
  };

  // Touch gestures for mobile vertical swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    if (diffY > 40) {
      handleScrollNext(); // swipe up
    } else if (diffY < -40) {
      handleScrollPrev(); // swipe down
    }
    touchStartY.current = null;
  };

  const toggleLike = () => {
    const v = currentVideo;
    if (!v) return;
    const isNowLiked = !v.isLiked;
    const updatedCount = isNowLiked ? v.likesCount + 1 : Math.max(0, v.likesCount - 1);
    const updatedVideo: VideoItem = {
      ...v,
      isLiked: isNowLiked,
      likesCount: updatedCount,
    };

    setFeedVideos((prev) =>
      prev.map((item, i) => (i === activeVideoIndex ? updatedVideo : item))
    );
    onUpdateVideo?.(updatedVideo);
    showToast(isNowLiked ? '❤️ Liked video!' : '💔 Removed like');
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

    setFeedVideos((prev) =>
      prev.map((item, i) => (i === activeVideoIndex ? updatedVideo : item))
    );
    onUpdateVideo?.(updatedVideo);
    showToast(isNowReposted ? '🔁 Video reposted to your profile!' : 'Undo repost');
  };

  const handleAddComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentInput.trim()) return;

    setComments((prev) => [
      {
        id: `c_${Date.now()}`,
        user: currentUser.name,
        avatar: currentUser.avatar,
        text: commentInput.trim(),
        time: 'Just now',
        likes: 0
      },
      ...prev
    ]);
    setCommentInput('');

    setFeedVideos((prev) =>
      prev.map((v, i) => (i === activeVideoIndex ? { ...v, commentsCount: v.commentsCount + 1 } : v))
    );
  };

  const handleScrollNext = () => {
    if (isEndOfFeed) {
      setIsEndOfFeed(false);
      setActiveVideoIndex(0);
      return;
    }
    if (activeVideoIndex < feedVideos.length - 1) {
      setActiveVideoIndex(activeVideoIndex + 1);
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

  // If at the end of the feed, render the Video Ended Screen matching reference image #8
  if (isEndOfFeed) {
    return (
      <div 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative w-full h-[calc(100vh-64px)] md:h-screen bg-[#090611] overflow-hidden select-none animate-fade-in flex flex-col justify-between p-6 text-center"
      >
        {/* Background cosmic glow and star particles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-gradient-to-tr from-[#8B20FF]/25 via-[#F328D5]/20 to-transparent rounded-full blur-[100px]" />
          {/* Floating starry decorations matching screen #8 */}
          <div className="absolute top-1/4 left-1/5 text-amber-400 text-lg animate-ping">⭐</div>
          <div className="absolute top-1/3 right-1/4 text-pink-400 text-xl animate-pulse">✨</div>
          <div className="absolute bottom-1/3 left-1/4 text-cyan-400 text-sm animate-bounce">🌟</div>
          <div className="absolute bottom-1/4 right-1/5 text-purple-400 text-lg animate-pulse">⭐</div>
        </div>

        {/* Top Header */}
        <div className="relative z-30 flex items-center justify-between pt-safe">
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

        {/* Center Clapperboard & Video Ended matching reference screen #8 */}
        <div className="relative z-20 flex flex-col items-center my-auto space-y-5 max-w-sm mx-auto">
          {/* Neon Clapperboard Card */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-[#3B82F6]/20 via-[#8B20FF]/30 to-[#F328D5]/20 border-2 border-[#8B20FF] p-4 flex flex-col items-center justify-center text-white shadow-[0_0_35px_rgba(139,32,255,0.45)] group">
            {/* Clapper stripes top bar */}
            <div className="w-full h-4 rounded-t-lg bg-gradient-to-r from-white/30 via-white/70 to-white/30 flex justify-between px-1 items-center mb-2">
              <span className="w-2 h-2 bg-[#8B20FF] rounded-full" />
              <span className="w-2 h-2 bg-[#F328D5] rounded-full" />
              <span className="w-2 h-2 bg-[#3B82F6] rounded-full" />
            </div>
            
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8B20FF] to-[#F328D5] flex items-center justify-center text-white shadow-lg">
              <Play className="w-6 h-6 fill-white ml-0.5" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-white font-display tracking-tight mb-2">
              Video Ended
            </h2>
            <p className="text-xs text-[#B9AECF] leading-relaxed">
              Swipe up for next video <br />
              or check more videos
            </p>
          </div>

          {/* Explore More Button matching reference */}
          <button
            onClick={() => {
              setIsEndOfFeed(false);
              setActiveVideoIndex(0);
            }}
            className="w-full py-3 rounded-full bg-gradient-to-r from-[#8B20FF] via-[#a825e6] to-[#F328D5] hover:opacity-95 text-white font-extrabold text-sm shadow-lg shadow-[#8B20FF]/30 active:scale-95 transition-all"
          >
            Explore More
          </button>

          {/* Animated chevron up indicator */}
          <div 
            onClick={() => {
              setIsEndOfFeed(false);
              setActiveVideoIndex(0);
            }}
            className="flex flex-col items-center cursor-pointer text-white/60 hover:text-white pt-2 animate-bounce"
          >
            <span className="text-xl">˄</span>
          </div>
        </div>

        <div className="pb-4" />
      </div>
    );
  }

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-[calc(100vh-64px)] md:h-screen bg-black overflow-hidden select-none animate-fade-in flex flex-col justify-between"
    >
      {/* Toast */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#8B20FF] text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg shadow-[#8B20FF]/50 animate-fade-in pointer-events-none">
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
                +{activeGiftCelebration.gift.coins * activeGiftCelebration.quantity} Coins Gift Support 💖
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Header matching reference screen #4: (< For You Following [Search]) */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 pt-safe pointer-events-auto">
        <button
          onClick={handleScrollPrev}
          disabled={activeVideoIndex === 0}
          className={`w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-opacity ${
            activeVideoIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/60'
          }`}
          title="Previous Video"
        >
          ‹
        </button>

        {/* Segmented Tab: For You / Following */}
        <div className="flex items-center bg-black/40 backdrop-blur-md border border-white/15 rounded-full p-1 shadow-lg">
          <button
            onClick={() => setActiveTab('foryou')}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
              activeTab === 'foryou'
                ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md shadow-[#F328D5]/30'
                : 'text-[#B9AECF] hover:text-white'
            }`}
          >
            For You
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
              activeTab === 'following'
                ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md shadow-[#F328D5]/30'
                : 'text-[#B9AECF] hover:text-white'
            }`}
          >
            Following
          </button>
        </div>

        <button
          onClick={() => showToast('Search videos and creators...')}
          className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          title="Search Videos"
        >
          🔍
        </button>
      </div>

      {/* Video Content Container with Double-tap Detection */}
      <div 
        onDoubleClick={handleDoubleTap}
        onClick={handleDoubleTap}
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-pointer"
      >
        <img
          src={currentVideo.videoUrl}
          alt={currentVideo.description}
          className="w-full h-full object-cover filter brightness-95"
        />

        {/* Ambient Overlays for Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85 pointer-events-none" />

        {/* Play/Pause state indicator */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/20 animate-scale-in">
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

        {/* Up / Down Navigation Controls for Desktop/Web scrolling */}
        <div className="hidden md:flex flex-col gap-2 absolute right-24 top-1/2 -translate-y-1/2 z-30">
          <button
            onClick={(e) => { e.stopPropagation(); handleScrollPrev(); }}
            disabled={activeVideoIndex === 0}
            className="w-10 h-10 rounded-full bg-black/60 border border-white/15 flex items-center justify-center text-white hover:bg-[#8B20FF]"
          >
            ▲
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleScrollNext(); }}
            className="w-10 h-10 rounded-full bg-black/60 border border-white/15 flex items-center justify-center text-white hover:bg-[#F328D5]"
          >
            ▼
          </button>
        </div>
      </div>

      {/* Right Action Floating Column (Like, Comment, Repost, Gift, Share) matching reference image */}
      <div className="absolute right-3.5 bottom-24 sm:bottom-28 z-30 flex flex-col items-center gap-4 pointer-events-auto">
        {/* Creator Avatar with Follow '+' button */}
        <div className="relative mb-1">
          <div 
            onClick={() => onSelectUser(currentVideo.creator)}
            className="cursor-pointer hover:scale-105 transition-transform"
          >
            <AvatarWithFrame
              avatar={currentVideo.creator.avatar}
              name={currentVideo.creator.name}
              level={currentVideo.creator.level || 12}
              size="md"
            />
          </div>

          <button
            onClick={() => showToast(`Followed ${currentVideo.creator.name}!`)}
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-gradient-to-r from-[#F328D5] to-[#8B20FF] text-white flex items-center justify-center shadow-md active:scale-90 transition-transform"
            title="Follow Creator"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </div>

        {/* Like Button */}
        <button
          onClick={toggleLike}
          className="flex flex-col items-center group active:scale-75 transition-transform"
        >
          <div className={`w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center transition-colors ${
            currentVideo.isLiked ? 'text-rose-500' : 'text-white'
          }`}>
            <Heart className={`w-6 h-6 ${currentVideo.isLiked ? 'fill-rose-500 stroke-rose-500' : 'stroke-[2]'}`} />
          </div>
          <span className="text-[11px] font-bold text-white mt-1 shadow-sm font-mono">
            {(currentVideo.likesCount / 1000).toFixed(1)}K
          </span>
        </button>

        {/* Comments Button */}
        <button
          onClick={() => setShowComments(true)}
          className="flex flex-col items-center group active:scale-75 transition-transform"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white">
            <MessageCircle className="w-6 h-6 stroke-[2]" />
          </div>
          <span className="text-[11px] font-bold text-white mt-1 shadow-sm font-mono">
            {(currentVideo.commentsCount / 1000).toFixed(1)}K
          </span>
        </button>

        {/* Repost Button */}
        <button
          onClick={toggleRepost}
          className="flex flex-col items-center group active:scale-75 transition-transform"
        >
          <div className={`w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center transition-colors ${
            currentVideo.isReposted ? 'text-[#06B6D4]' : 'text-white'
          }`}>
            <Repeat2 className="w-6 h-6 stroke-[2]" />
          </div>
          <span className="text-[11px] font-bold text-white mt-1 shadow-sm font-mono">
            {(currentVideo.repostsCount / 1000).toFixed(1)}K
          </span>
        </button>

        {/* Virtual Gift Button */}
        <button
          onClick={() => onOpenGiftShop(currentVideo.creator)}
          className="flex flex-col items-center group active:scale-75 transition-transform"
        >
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#8B20FF] via-[#F328D5] to-[#FFC84A] flex items-center justify-center text-white shadow-lg shadow-[#F328D5]/40 animate-pulse">
            <Gift className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] font-bold text-[#FFC84A] mt-1 shadow-sm">
            Gift
          </span>
        </button>

        {/* Share Button */}
        <button
          onClick={() => showToast('Video link copied to clipboard!')}
          className="flex flex-col items-center group active:scale-75 transition-transform"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white">
            <Share2 className="w-5 h-5 stroke-[2]" />
          </div>
          <span className="text-[11px] font-bold text-white mt-1 shadow-sm">
            Share
          </span>
        </button>
      </div>

      {/* Bottom Creator Meta & Description */}
      <div className="relative z-30 p-4 pb-6 max-w-lg pointer-events-auto">
        <div className="flex items-center gap-2 mb-2">
          <span 
            onClick={() => onSelectUser(currentVideo.creator)}
            className="text-sm font-black text-white hover:underline cursor-pointer"
          >
            {currentVideo.creator.name}
          </span>
          <span className="text-xs text-[#B9AECF] font-mono">{currentVideo.creator.username}</span>

          <button
            onClick={() => showToast(`Followed ${currentVideo.creator.name}!`)}
            className="px-3 py-0.5 rounded-full bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-[11px] font-bold shadow"
          >
            Follow
          </button>
        </div>

        <p className="text-xs text-white/90 line-clamp-2 leading-relaxed mb-2 drop-shadow">
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

        {/* Music ticker */}
        <div className="flex items-center gap-2 text-xs text-white/80">
          <Music className="w-3.5 h-3.5 text-[#F328D5] animate-spin" />
          <span className="text-[11px] font-mono truncate max-w-xs">{currentVideo.musicTitle}</span>
        </div>
      </div>

      {/* Video Progress Scrubber Bar matching reference screen #4 */}
      <div className="absolute bottom-0 left-0 right-0 z-30 h-1 bg-white/20">
        <div 
          className="h-full bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] transition-all duration-200 shadow-[0_0_8px_#F328D5]"
          style={{ width: `${playbackProgress}%` }}
        />
      </div>

      {/* Slide-Up Comments Drawer */}
      {showComments && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#160C25] border-t border-white/15 rounded-t-3xl p-4 sm:p-5 h-[65vh] flex flex-col justify-between shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#F328D5]" />
                <span>Comments ({comments.length})</span>
              </span>
              <button onClick={() => setShowComments(false)} className="text-[#B9AECF] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 no-scrollbar">
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-3 text-xs">
                  <img src={c.avatar} alt={c.user} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{c.user}</span>
                      <span className="text-[10px] text-[#B9AECF]">{c.time}</span>
                    </div>
                    <p className="text-white/90 mt-0.5">{c.text}</p>
                  </div>
                  <button className="flex flex-col items-center text-[#B9AECF] hover:text-rose-400">
                    <Heart className="w-3.5 h-3.5" />
                    <span className="text-[9px]">{c.likes}</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2 border-t border-white/[0.08]">
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                className="flex-1 bg-black/50 border border-white/15 rounded-full px-4 py-2 text-xs text-white placeholder-[#B9AECF] outline-none focus:border-[#F328D5]"
              />
              <button
                type="submit"
                disabled={!commentInput.trim()}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-bold disabled:opacity-40"
              >
                Post
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
