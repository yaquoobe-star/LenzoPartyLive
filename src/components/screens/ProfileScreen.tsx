import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Share2, 
  Crown, 
  Wallet, 
  ChevronRight, 
  Edit3, 
  Copy, 
  Check, 
  Coins, 
  Plus, 
  Play,
  Trash2,
  X,
  Heart,
  MessageSquare,
  Sparkles,
  Lock,
  Bookmark,
  BookmarkCheck,
  Video,
  Eye,
  UserCheck,
  UserPlus,
  ArrowLeft,
  MessageCircle,
  Gift
} from 'lucide-react';
import { UserProfile, ScreenType, VideoItem } from '../../types';
import { AvatarWithFrame } from '../common/AvatarWithFrame';
import { LevelBadge } from '../common/LevelBadge';
import { COIN_CONFIG } from '../../utils/coinConfig';
import { getUserLevelProgress } from '../../utils/levelSystem';
import { EditProfileModal } from './EditProfileModal';
import { ShareProfileModal } from '../profile/ShareProfileModal';
import { FollowersListModal } from '../profile/FollowersListModal';
import { profileService } from '../../utils/profileService';

interface ProfileScreenProps {
  currentUser: UserProfile;
  viewingUser?: UserProfile | null;
  onUpdateProfile: (updated: UserProfile) => void;
  onNavigate: (screen: ScreenType) => void;
  onOpenWallet: () => void;
  onOpenVIP: () => void;
  userVideos?: VideoItem[];
  onSelectVideo?: (video: VideoItem) => void;
  onOpenUploadVideo?: () => void;
  onDeleteVideo?: (videoId: string) => void;
  onBack?: () => void;
  onSelectUser?: (user: UserProfile) => void;
  onSendMessage?: (user: UserProfile) => void;
  onSendGift?: (user: UserProfile) => void;
}

export type VideoTabType = 'videos' | 'private' | 'liked' | 'saved';

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentUser,
  viewingUser,
  onUpdateProfile,
  onNavigate,
  onOpenWallet,
  onOpenVIP,
  userVideos = [],
  onSelectVideo,
  onOpenUploadVideo,
  onDeleteVideo,
  onBack,
  onSelectUser,
  onSendMessage,
  onSendGift,
}) => {
  // Target user being displayed: either currentUser (own profile) or viewingUser (other user)
  const isOwner = !viewingUser || viewingUser.id === currentUser.id;
  const activeUser = isOwner ? currentUser : viewingUser;

  // Active video tab (Videos, Private, Liked, Saved)
  const [activeTab, setActiveTab] = useState<VideoTabType>('videos');

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following'>('followers');

  // Video playback & deletion modal state
  const [playingVideo, setPlayingVideo] = useState<VideoItem | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);

  // Video tabs data
  const [publicVideos, setPublicVideos] = useState<VideoItem[]>([]);
  const [privateVideos, setPrivateVideos] = useState<VideoItem[]>([]);
  const [likedVideos, setLikedVideos] = useState<VideoItem[]>([]);
  const [savedVideos, setSavedVideos] = useState<VideoItem[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);

  // Social Stats
  const [isFollowingTarget, setIsFollowingTarget] = useState<boolean>(activeUser.isFollowing || false);
  const [followersCount, setFollowersCount] = useState<number>(() => {
    if (activeUser.followersCount) return activeUser.followersCount;
    return parseInt(activeUser.fansCount?.replace(/[^0-9]/g, '') || '12400', 10) || 12420;
  });
  const [followingCount, setFollowingCount] = useState<number>(activeUser.followingCount || 142);
  const [totalLikesCount, setTotalLikesCount] = useState<number>(() => {
    return profileService.calculateTotalLikes(activeUser.id) || 52700;
  });

  const [copiedId, setCopiedId] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load video tabs data
  const loadTabsData = async () => {
    setIsLoadingVideos(true);
    try {
      const tabs = await profileService.getUserVideoTabs(activeUser.id, currentUser.id);
      setPublicVideos(tabs.publicVideos);
      setPrivateVideos(tabs.privateVideos);
      setLikedVideos(tabs.likedVideos);
      setSavedVideos(tabs.savedVideos);

      const computedLikes = profileService.calculateTotalLikes(activeUser.id);
      if (computedLikes > 0) {
        setTotalLikesCount(computedLikes);
      }
    } catch (e) {
      console.warn('Failed to load video tabs:', e);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  useEffect(() => {
    loadTabsData();
    setIsFollowingTarget(activeUser.isFollowing || false);
  }, [activeUser.id, currentUser.id]);

  // Level progress
  const levelProgress = getUserLevelProgress(activeUser);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(activeUser.displayId);
      setCopiedId(true);
      showToast(`User ID ${activeUser.displayId} copied!`);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleToggleFollow = async () => {
    if (isOwner) return;
    try {
      const res = await profileService.toggleFollow(activeUser.id, currentUser.id);
      setIsFollowingTarget(res.isFollowing);
      setFollowersCount(res.targetFollowersCount);
      showToast(res.isFollowing ? `Followed ${activeUser.name}! ❤️` : `Unfollowed ${activeUser.name}`);
    } catch (err: any) {
      showToast(err.message || 'Follow action failed');
    }
  };

  const handleDeleteVideo = (videoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const allVideos = profileService.getStoredVideos().filter((v) => v.id !== videoId);
    profileService.saveStoredVideos(allVideos);

    setPublicVideos((prev) => prev.filter((v) => v.id !== videoId));
    setPrivateVideos((prev) => prev.filter((v) => v.id !== videoId));
    setLikedVideos((prev) => prev.filter((v) => v.id !== videoId));
    setSavedVideos((prev) => prev.filter((v) => v.id !== videoId));

    if (onDeleteVideo) onDeleteVideo(videoId);
    if (playingVideo?.id === videoId) setPlayingVideo(null);
    setVideoToDelete(null);
    showToast('Video deleted successfully');
  };

  const handleToggleLikeInPlayer = async (video: VideoItem) => {
    const res = await profileService.toggleLikeVideo(video.id, currentUser.id);
    const updated = {
      ...video,
      isLiked: res.isLiked,
      likesCount: res.newCount,
    };
    setPlayingVideo(updated);
    loadTabsData();
    showToast(res.isLiked ? 'Liked video! ❤️' : 'Removed like');
  };

  const handleToggleSaveInPlayer = async (video: VideoItem) => {
    const isNowSaved = await profileService.toggleSaveVideo(video.id);
    const updated = {
      ...video,
      isSaved: isNowSaved,
    };
    setPlayingVideo(updated);
    loadTabsData();
    showToast(isNowSaved ? 'Saved to bookmarks! 🔖' : 'Removed from bookmarks');
  };

  // Get active tab's videos list
  const getActiveTabVideos = (): VideoItem[] => {
    switch (activeTab) {
      case 'videos':
        return publicVideos;
      case 'private':
        return privateVideos;
      case 'liked':
        return likedVideos;
      case 'saved':
        return savedVideos;
      default:
        return publicVideos;
    }
  };

  const currentTabVideos = getActiveTabVideos();

  return (
    <div className="w-full pb-24 sm:pb-14 animate-fade-in select-none bg-[#090611] min-h-screen text-white font-sans">
      <div className="max-w-xl mx-auto px-3.5 pt-2 sm:pt-3 space-y-4">
        
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-xs font-bold py-2 px-5 rounded-full shadow-xl shadow-pink-900/50 animate-bounce pointer-events-none border border-white/20">
            {toastMessage}
          </div>
        )}

        {/* Edit Profile Modal (Owner Only) */}
        {isOwner && (
          <EditProfileModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            currentUser={currentUser}
            onSaveProfile={async (updated) => {
              const res = await profileService.updateProfile(currentUser.id, updated);
              onUpdateProfile(res);
              showToast('Profile updated successfully! ✨');
            }}
          />
        )}

        {/* Share Profile Modal */}
        <ShareProfileModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          user={activeUser}
          currentUser={currentUser}
          onSendInApp={(target, msg) => {
            if (onSendMessage) onSendMessage(target);
          }}
        />

        {/* Followers / Following List Modal */}
        <FollowersListModal
          isOpen={isFollowersModalOpen}
          onClose={() => setIsFollowersModalOpen(false)}
          userId={activeUser.id}
          initialTab={followersModalTab}
          currentUser={currentUser}
          onSelectUser={(u) => {
            if (onSelectUser) onSelectUser(u);
          }}
          onFollowChange={() => {
            loadTabsData();
          }}
        />

        {/* Delete Confirmation Modal */}
        {videoToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-xs bg-[#160C25] border border-white/10 rounded-3xl p-5 text-center space-y-3 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto text-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">Delete this video?</h4>
              <p className="text-xs text-[#B9AECF]">This will permanently remove the video from your profile.</p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setVideoToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteVideo(videoToDelete)}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-600/30"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video Player Modal with Likes & Bookmark functionality */}
        {playingVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-sm bg-[#160C25] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
              
              {/* Header */}
              <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between">
                <span className="text-xs font-bold text-white px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                  {playingVideo.privacy === 'private' ? (
                    <>
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-300">Private Video</span>
                    </>
                  ) : (
                    <span>{playingVideo.createdAt}</span>
                  )}
                </span>

                <div className="flex items-center gap-1.5">
                  {isOwner && (
                    <button
                      onClick={() => setVideoToDelete(playingVideo.id)}
                      className="w-8 h-8 rounded-full bg-red-600/80 hover:bg-red-600 flex items-center justify-center text-white transition-colors shadow"
                      title="Delete Video"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setPlayingVideo(null)}
                    className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors shadow"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Video Viewport */}
              <div className="relative aspect-[9/14] w-full bg-black overflow-hidden flex items-center justify-center">
                <img
                  src={playingVideo.thumbnailUrl || playingVideo.videoUrl}
                  alt={playingVideo.description}
                  className="w-full h-full object-cover filter brightness-95"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 pointer-events-none" />

                {/* Animated Play icon */}
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-xl animate-pulse">
                  <Play className="w-7 h-7 fill-white ml-1" />
                </div>
              </div>

              {/* Video Details & Interaction Footer */}
              <div className="p-4 bg-[#160C25] space-y-3">
                <p className="text-xs text-white leading-relaxed font-medium">
                  {playingVideo.description}
                </p>

                {playingVideo.musicTitle && (
                  <p className="text-[11px] text-[#FA26A0] font-mono flex items-center gap-1">
                    <span>🎵</span>
                    <span className="truncate">{playingVideo.musicTitle}</span>
                  </p>
                )}

                {/* Action Bar: Like, Save, Comments */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-[#B9AECF]">
                  <button
                    onClick={() => handleToggleLikeInPlayer(playingVideo)}
                    className={`flex items-center gap-1.5 font-bold transition-all active:scale-95 ${
                      playingVideo.isLiked ? 'text-pink-400' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${playingVideo.isLiked ? 'fill-pink-500 text-pink-500' : ''}`} />
                    <span>{playingVideo.likesCount.toLocaleString()}</span>
                  </button>

                  <button
                    onClick={() => handleToggleSaveInPlayer(playingVideo)}
                    className={`flex items-center gap-1.5 font-bold transition-all active:scale-95 ${
                      playingVideo.isSaved ? 'text-amber-400' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {playingVideo.isSaved ? (
                      <BookmarkCheck className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                    <span>{playingVideo.isSaved ? 'Saved' : 'Save'}</span>
                  </button>

                  <span className="flex items-center gap-1.5 text-white/70">
                    <MessageSquare className="w-4 h-4" />
                    <span>{playingVideo.commentsCount.toLocaleString()}</span>
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================
            1. TOP UTILITY HEADER BAR
            - Left: Back button (if viewing another user) or Profile Title
            - Right: Share Profile button & Settings button
           ======================================================== */}
        <header className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            {!isOwner && onBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 rounded-full bg-[#160C25] hover:bg-[#211333] border border-white/10 flex items-center justify-center text-white mr-1 active:scale-95"
                title="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <span className="text-sm font-extrabold text-white tracking-tight font-display">
              {isOwner ? 'My Profile' : activeUser.name}
            </span>
            <LevelBadge level={activeUser.level} size="xs" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="w-9 h-9 rounded-full bg-[#160C25] hover:bg-[#211333] border border-white/10 flex items-center justify-center text-white transition-colors active:scale-95"
              title="Share Profile"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {isOwner && (
              <button
                onClick={() => onNavigate('settings')}
                className="w-9 h-9 rounded-full bg-[#160C25] hover:bg-[#211333] border border-white/10 flex items-center justify-center text-white transition-colors active:scale-95"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* ========================================================
            2. PRIMARY CLEAN PROFILE IDENTITY CARD
            - User Profile Picture with frame & edit action
            - Display Name, Verified Badge, Unique Username (@handle)
            - User ID with one-tap copy
            - Level & VIP badges alongside profile details
            - Bio description
            - Action Buttons (Edit Profile, Share, or Follow/Message/Gift)
           ======================================================== */}
        <div className="relative p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-[#1c0e33] via-[#160C25] to-[#12091f] border border-white/10 shadow-xl overflow-hidden flex flex-col items-center text-center">
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-l from-[#F328D5]/15 via-[#8B20FF]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* User Profile Picture (DP) */}
          <div className="relative mb-3">
            <AvatarWithFrame
              src={activeUser.avatar}
              name={activeUser.name}
              level={activeUser.level}
              vipLevel={activeUser.vipLevel}
              isVIP={activeUser.isVIP}
              size="xl"
              showFrame={true}
              showVipBadge={false}
              onClick={() => {
                if (isOwner) setIsEditModalOpen(true);
              }}
            />
            {isOwner && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-[#8B20FF] to-[#F328D5] text-white p-1.5 rounded-full shadow-lg ring-2 ring-[#090611] hover:scale-110 active:scale-95 transition-transform"
                title="Edit Photo"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Display Name with Verified Checkmark */}
          <div className="flex items-center justify-center gap-1.5 mb-0.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight">
              {activeUser.name}
            </h2>
            <div className="w-4 h-4 rounded-full bg-[#06B6D4] text-white flex items-center justify-center text-[10px] font-black shrink-0" title="Verified Creator">
              ✓
            </div>
          </div>

          {/* Unique Username (@username) and User ID */}
          <div className="flex items-center justify-center gap-2 mb-2 flex-wrap text-xs">
            <span className="text-[#FA26A0] font-mono font-bold">
              {activeUser.username || `@${activeUser.displayId}`}
            </span>
            <span className="text-white/30">•</span>
            <button
              onClick={handleCopyId}
              className="flex items-center gap-1 text-[#B9AECF] hover:text-white transition-colors font-mono"
              title="Copy User ID"
            >
              <span>ID: {activeUser.displayId}</span>
              {copiedId ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>

          {/* Level and VIP Badges Alongside Profile Information */}
          <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
            {/* Level Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] text-xs font-black shadow-md">
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span>Level {activeUser.level}</span>
            </div>

            {/* VIP Status Badge */}
            {activeUser.isVIP ? (
              <button
                onClick={onOpenVIP}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-xs font-black shadow-md shadow-pink-900/30 hover:opacity-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>VIP {activeUser.vipLevel || 5}</span>
              </button>
            ) : (
              <button
                onClick={onOpenVIP}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 text-white/80 text-xs font-bold"
              >
                <span>Get VIP</span>
              </button>
            )}
          </div>

          {/* Bio Description */}
          <p className="text-xs text-white/85 max-w-sm leading-relaxed mb-4 font-normal">
            {activeUser.bio || 'Living life on Lonzo Party Live! Singing, vibing & connecting.'}
          </p>

          {/* ========================================================
              3. COUNTERS: FOLLOWERS, FOLLOWING & TOTAL LIKES
              Clicking Followers / Following opens real interactive list!
             ======================================================== */}
          <div className="grid grid-cols-3 gap-2 w-full py-2.5 px-3 rounded-2xl bg-[#211333] border border-white/[0.08] mb-4 shadow-inner">
            
            {/* Followers Counter */}
            <button
              onClick={() => {
                setFollowersModalTab('followers');
                setIsFollowersModalOpen(true);
              }}
              className="flex flex-col items-center hover:opacity-80 transition-opacity"
            >
              <span className="text-base font-black text-white font-mono tracking-tight">
                {followersCount > 999 ? `${(followersCount / 1000).toFixed(1)}K` : followersCount}
              </span>
              <span className="text-[10px] text-[#B9AECF] font-bold">Followers</span>
            </button>

            {/* Following Counter */}
            <button
              onClick={() => {
                setFollowersModalTab('following');
                setIsFollowersModalOpen(true);
              }}
              className="flex flex-col items-center border-x border-white/10 hover:opacity-80 transition-opacity"
            >
              <span className="text-base font-black text-white font-mono tracking-tight">
                {followingCount}
              </span>
              <span className="text-[10px] text-[#B9AECF] font-bold">Following</span>
            </button>

            {/* Total Likes Counter (Received on user's published videos) */}
            <div className="flex flex-col items-center">
              <span className="text-base font-black text-[#FFC84A] font-mono tracking-tight">
                {totalLikesCount > 999 ? `${(totalLikesCount / 1000).toFixed(1)}K` : totalLikesCount}
              </span>
              <span className="text-[10px] text-[#B9AECF] font-bold">Total Likes</span>
            </div>
          </div>

          {/* Action Buttons: Owner vs Visiting User */}
          {isOwner ? (
            <div className="flex items-center gap-2.5 w-full max-w-xs">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-[#8B20FF] via-[#a825e6] to-[#F328D5] hover:opacity-95 text-white font-extrabold text-xs shadow-md shadow-[#F328D5]/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>

              <button
                onClick={() => setIsShareModalOpen(true)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white shrink-0 active:scale-95 transition-all"
                title="Share Profile"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full max-w-xs">
              <button
                onClick={handleToggleFollow}
                className={`flex-1 py-2.5 rounded-full font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow ${
                  isFollowingTarget
                    ? 'bg-white/15 text-white hover:bg-white/20'
                    : 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white shadow-pink-900/40'
                }`}
              >
                {isFollowingTarget ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Follow</span>
                  </>
                )}
              </button>

              {onSendMessage && (
                <button
                  onClick={() => onSendMessage(activeUser)}
                  className="w-10 h-10 rounded-full bg-[#160C25] hover:bg-[#281640] border border-white/10 flex items-center justify-center text-white shrink-0 active:scale-95"
                  title="Send Message"
                >
                  <MessageCircle className="w-4 h-4 text-[#06B6D4]" />
                </button>
              )}

              {onSendGift && (
                <button
                  onClick={() => onSendGift(activeUser)}
                  className="w-10 h-10 rounded-full bg-[#160C25] hover:bg-[#281640] border border-white/10 flex items-center justify-center text-white shrink-0 active:scale-95"
                  title="Send Gift"
                >
                  <Gift className="w-4 h-4 text-[#FA26A0]" />
                </button>
              )}
            </div>
          )}

        </div>

        {/* ========================================================
            4. COIN BALANCE CARD (Owner Only)
           ======================================================== */}
        {isOwner && (
          <div
            onClick={onOpenWallet}
            className="p-4 rounded-2xl bg-gradient-to-br from-[#1d1033] to-[#24133f] border border-[#FFC84A]/30 hover:border-[#FFC84A]/60 shadow-lg cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-[#B9AECF] flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-[#FFC84A]" />
                <span>Available Coin Balance</span>
              </span>
              <div className="flex items-center gap-1 text-[11px] text-[#FFC84A] font-bold group-hover:underline">
                <span>Recharge</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-[#FFC84A] font-mono tracking-tight">
                🪙 {currentUser.coins.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-emerald-400 font-mono">
                {COIN_CONFIG.formatPkrEquivalent(currentUser.coins)}
              </span>
            </div>
          </div>
        )}

        {/* ========================================================
            5. LEVEL PROGRESS BAR
           ======================================================== */}
        <div className="p-3.5 rounded-2xl bg-[#160C25] border border-white/10 shadow">
          <div className="flex items-center justify-between text-xs font-bold text-white mb-1.5">
            <span className="flex items-center gap-1 text-[#FFC84A]">
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span>Level {activeUser.level} Progress</span>
            </span>
            <span className="text-[#B9AECF] font-mono">{levelProgress.progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden border border-white/10">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[#FFC84A] via-[#F328D5] to-[#8B20FF] transition-all duration-500 shadow-sm"
              style={{ width: `${Math.max(5, levelProgress.progressPercent)}%` }}
            />
          </div>
        </div>

        {/* ========================================================
            6. EXACTLY FOUR VIDEO TABS
            TAB 1: Videos (Public Videos)
            TAB 2: Private (Private Videos, Owner Only)
            TAB 3: Liked (Videos liked by user)
            TAB 4: Saved (Videos bookmarked/saved by user)
           ======================================================== */}
        <div className="space-y-3 pt-1">
          {/* Tabs Navigation Bar */}
          <div className="flex items-center justify-between p-1 rounded-2xl bg-[#160C25] border border-white/10">
            {/* Tab 1: Videos */}
            <button
              onClick={() => setActiveTab('videos')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'videos'
                  ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white shadow-md'
                  : 'text-[#B9AECF] hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Videos</span>
              <span className="text-[10px] font-mono opacity-80">({publicVideos.length})</span>
            </button>

            {/* Tab 2: Private */}
            <button
              onClick={() => setActiveTab('private')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'private'
                  ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white shadow-md'
                  : 'text-[#B9AECF] hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Private</span>
              {isOwner && (
                <span className="text-[10px] font-mono opacity-80">({privateVideos.length})</span>
              )}
            </button>

            {/* Tab 3: Liked */}
            <button
              onClick={() => setActiveTab('liked')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'liked'
                  ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white shadow-md'
                  : 'text-[#B9AECF] hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-pink-400" />
              <span>Liked</span>
              <span className="text-[10px] font-mono opacity-80">({likedVideos.length})</span>
            </button>

            {/* Tab 4: Saved */}
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'saved'
                  ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white shadow-md'
                  : 'text-[#B9AECF] hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
              <span>Saved</span>
              {isOwner && (
                <span className="text-[10px] font-mono opacity-80">({savedVideos.length})</span>
              )}
            </button>
          </div>

          {/* Tab Subheader / Upload Shortcut */}
          {activeTab === 'videos' && isOwner && onOpenUploadVideo && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-[#B9AECF]">Published Public Videos</span>
              <button
                onClick={onOpenUploadVideo}
                className="px-3 py-1 rounded-full bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-xs font-bold flex items-center gap-1 shadow active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Video</span>
              </button>
            </div>
          )}

          {/* ========================================================
              7. MODERN 3-COLUMN RESPONSIVE THUMBNAIL GRID
             ======================================================== */}
          {isLoadingVideos ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2">
              <div className="w-8 h-8 border-2 border-[#FA26A0] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[#B9AECF]">Loading videos...</span>
            </div>
          ) : activeTab === 'private' && !isOwner ? (
            /* Security enforcement: Private tab locked to other users */
            <div className="p-8 rounded-3xl bg-[#160C25] border border-white/10 text-center flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">This user's private videos are protected</h4>
              <p className="text-xs text-[#B9AECF] max-w-xs">
                Private videos are only visible to the profile owner.
              </p>
            </div>
          ) : currentTabVideos.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {currentTabVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => setPlayingVideo(video)}
                  className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#160C25] border border-white/10 hover:border-[#F328D5]/60 transition-all cursor-pointer shadow-lg flex flex-col justify-between p-2"
                >
                  {/* Thumbnail Image */}
                  <img
                    src={video.thumbnailUrl || video.videoUrl}
                    alt={video.description}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none" />

                  {/* Top Badges (Private Lock or Delete button for owner) */}
                  <div className="relative z-10 flex items-center justify-between w-full">
                    {video.privacy === 'private' ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-500/80 text-black text-[9px] font-black flex items-center gap-0.5 shadow">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Private</span>
                      </span>
                    ) : (
                      <div />
                    )}

                    {isOwner && activeTab !== 'liked' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setVideoToDelete(video.id);
                        }}
                        className="w-6 h-6 rounded-full bg-black/60 hover:bg-red-600/90 text-white flex items-center justify-center transition-colors shadow"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Center Play Icon on Hover */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                    <div className="w-9 h-9 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center text-white shadow-lg">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Bottom Stats Overlay: View Count & Like Count */}
                  <div className="relative z-10 flex items-center justify-between text-[10px] text-white font-mono font-bold">
                    <span className="flex items-center gap-1 drop-shadow">
                      <Play className="w-2.5 h-2.5 fill-white" />
                      <span>{video.viewsCount || Math.max(120, video.likesCount * 3)}</span>
                    </span>

                    <span className="flex items-center gap-0.5 text-pink-400 drop-shadow">
                      <Heart className="w-2.5 h-2.5 fill-pink-500" />
                      <span>{video.likesCount > 999 ? `${(video.likesCount / 1000).toFixed(1)}K` : video.likesCount}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Clean Empty State for Active Tab */
            <div className="p-8 rounded-3xl bg-[#160C25] border border-white/10 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#211333] flex items-center justify-center text-2xl">
                {activeTab === 'videos' && '🎬'}
                {activeTab === 'private' && '🔒'}
                {activeTab === 'liked' && '💖'}
                {activeTab === 'saved' && '🔖'}
              </div>

              <div>
                <h4 className="text-sm font-bold text-white capitalize">
                  {activeTab === 'videos' && 'No uploaded videos yet'}
                  {activeTab === 'private' && 'No private videos'}
                  {activeTab === 'liked' && 'No liked videos yet'}
                  {activeTab === 'saved' && 'No saved videos yet'}
                </h4>
                <p className="text-xs text-[#B9AECF] mt-0.5 max-w-xs">
                  {activeTab === 'videos' && 'Share your music, party moments, and daily life on Lonzo Party!'}
                  {activeTab === 'private' && 'Videos you upload with private visibility will appear here.'}
                  {activeTab === 'liked' && 'Videos you double-tap or like on the feed will be saved here.'}
                  {activeTab === 'saved' && 'Bookmark interesting videos to watch them later.'}
                </p>
              </div>

              {activeTab === 'videos' && isOwner && onOpenUploadVideo && (
                <button
                  onClick={onOpenUploadVideo}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-xs font-bold shadow hover:opacity-95"
                >
                  Upload First Video
                </button>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
