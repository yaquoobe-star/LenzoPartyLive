import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Settings,
  Share2,
  Crown,
  Wallet,
  ChevronRight,
  Edit3,
  Copy,
  Check,
  Plus,
  Play,
  Trash2,
  X,
  Heart,
  MessageSquare,
  Sparkles,
  Lock,
  Unlock,
  Bookmark,
  BookmarkCheck,
  Video,
  UserCheck,
  UserPlus,
  ArrowLeft,
  MessageCircle,
  Gift,
  Camera,
  Image as ImageIcon,
  Building2,
  Award,
  Trophy,
  BarChart3,
  LayoutGrid,
  ShieldCheck,
  Ban,
  ShieldAlert,
  ArrowRightLeft,
} from 'lucide-react';

import { UserProfile, ScreenType, VideoItem, Conversation } from '../../types';
import { AvatarWithFrame, SuperVipTierBadge, VipTierBadge } from '../common/AvatarWithFrame';
import { LevelBadge } from '../common/LevelBadge';
import { LevelEmblemBadge } from '../common/LevelEmblemBadge';
import { VerifiedNameTag } from '../common/VerifiedBadge';
import { isAuthorizedAdminEmail } from '../../utils/adminAuth';
import { AchievementBadgeEmblem } from '../common/AchievementBadgeArt';
import { getUserLevelProgress } from '../../utils/levelSystem';
import {
  ACHIEVEMENT_BADGE_DEFINITIONS,
  SUPER_VIP_TIER_DEFINITIONS,
  VIP_FRAME_DEFINITIONS,
  calculateLevelProgression,
  evaluateAchievementBadges,
  formatCoinsCompact,
} from '../../utils/levelAndVipConfig';
import { equipAchievementBadges } from '../../services/levelAndVipService';
import { ProgressionModalTab } from './LevelAndVIPModal';
import { EditProfileModal } from './EditProfileModal';
import { ShareProfileModal } from '../profile/ShareProfileModal';
import { FollowersListModal } from '../profile/FollowersListModal';
import { BadgeVaultModal } from '../profile/BadgeVaultModal';
import { AchievementsModal } from '../profile/AchievementsModal';
import { AgencyCenterModal } from '../profile/AgencyCenterModal';
import { BlockedUsersModal } from '../profile/BlockedUsersModal';
import { BlockedUserRecord, blockUser as blockUserService, unblockUser as unblockUserService } from '../../services/blockService';
import {
  isFirestoreChunkedVideoUrl,
  resolveFirestoreChunkedReelUrl,
} from '../../services/storageService';
import { profileService } from '../../utils/profileService';
import { uploadUserImage } from '../../services/storageService';
import {
  calculateAgeFromBirthday,
  computeUserAchievements,
  getCountryFlag,
} from '../../services/profileModuleService';

interface ProfileScreenProps {
  currentUser: UserProfile;
  viewingUser?: UserProfile | null;
  conversations?: Conversation[];
  blockedUsers?: BlockedUserRecord[];
  blockedByUserIds?: string[];
  onBlockUser?: (target: UserProfile) => Promise<void> | void;
  onUnblockUser?: (targetUserId: string, targetName?: string) => Promise<void> | void;
  onUpdateProfile: (updated: UserProfile) => void;
  onNavigate: (screen: ScreenType) => void;
  onOpenWallet: () => void;
  onOpenVIP: () => void;
  onOpenLevelVIP?: (tab?: ProgressionModalTab) => void;
  onOpenAdminPanel?: () => void;
  userVideos?: VideoItem[];
  onSelectVideo?: (video: VideoItem) => void;
  onOpenUploadVideo?: () => void;
  onDeleteVideo?: (videoId: string) => void;
  onBack?: () => void;
  onSelectUser?: (user: UserProfile) => void;
  onSendMessage?: (user: UserProfile) => void;
  onSendGift?: (user: UserProfile) => void;
  onOpenAccountSwitcher?: () => void;
}

export type ProfileContentTab = 'public' | 'private' | 'saved' | 'posts' | 'liked';

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentUser,
  viewingUser,
  conversations = [],
  blockedUsers = [],
  blockedByUserIds = [],
  onBlockUser,
  onUnblockUser,
  onUpdateProfile,
  onNavigate,
  onOpenWallet,
  onOpenVIP,
  onOpenLevelVIP,
  onOpenAdminPanel,
  userVideos = [],
  onOpenUploadVideo,
  onDeleteVideo,
  onBack,
  onSelectUser,
  onSendMessage,
  onSendGift,
  onOpenAccountSwitcher,
}) => {
  const isOwner = !viewingUser || viewingUser.id === currentUser.id;
  const activeUser = isOwner ? currentUser : viewingUser;

  // Content Tab State (5 Tabs: Public, Private, Saved, Posts, Liked)
  const [activeTab, setActiveTab] = useState<ProfileContentTab>('public');

  // Modals State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following' | 'likes'>('followers');
  const [isBadgeVaultOpen, setIsBadgeVaultOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
  const [agencyModalMode, setAgencyModalMode] = useState<'center' | 'join' | 'create'>('center');
  const [isBlockedUsersModalOpen, setIsBlockedUsersModalOpen] = useState(false);
  const [showBlockConfirmModal, setShowBlockConfirmModal] = useState(false);
  const [isBlockBusy, setIsBlockBusy] = useState(false);

  const isTargetBlockedByMe = useMemo(
    () => !isOwner && blockedUsers.some((b) => b.blockedUserId === activeUser.id),
    [isOwner, blockedUsers, activeUser.id]
  );
  const isCurrentUserBlockedByTarget = useMemo(
    () => !isOwner && blockedByUserIds.includes(activeUser.id),
    [isOwner, blockedByUserIds, activeUser.id]
  );
  const isInteractionBlocked = isTargetBlockedByMe || isCurrentUserBlockedByTarget;

  // Direct Cover & Avatar Upload State
  const [uploadingMedia, setUploadingMedia] = useState<{ type: 'avatar' | 'cover'; progress: number } | null>(null);
  const quickAvatarInputRef = useRef<HTMLInputElement>(null);
  const quickCoverInputRef = useRef<HTMLInputElement>(null);

  // Video Player & Delete Confirmation State
  const [playingVideo, setPlayingVideo] = useState<VideoItem | null>(null);
  const [resolvedPlayingVideoUrl, setResolvedPlayingVideoUrl] = useState<string>('');
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!playingVideo) {
      setResolvedPlayingVideoUrl('');
      return;
    }
    if (isFirestoreChunkedVideoUrl(playingVideo.videoUrl)) {
      setResolvedPlayingVideoUrl('');
      resolveFirestoreChunkedReelUrl(playingVideo.videoUrl, playingVideo.videoMimeType)
        .then((blobUrl) => {
          if (!cancelled) setResolvedPlayingVideoUrl(blobUrl);
        })
        .catch(() => {
          if (!cancelled) setResolvedPlayingVideoUrl('');
        });
    } else {
      setResolvedPlayingVideoUrl(playingVideo.videoUrl);
    }
    return () => {
      cancelled = true;
    };
  }, [playingVideo?.id, playingVideo?.videoUrl, playingVideo?.videoMimeType]);

  // Content Tabs Data
  const [publicVideos, setPublicVideos] = useState<VideoItem[]>([]);
  const [privateVideos, setPrivateVideos] = useState<VideoItem[]>([]);
  const [savedVideos, setSavedVideos] = useState<VideoItem[]>([]);
  const [postsList, setPostsList] = useState<VideoItem[]>([]);
  const [likedVideos, setLikedVideos] = useState<VideoItem[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(true);

  // Dynamic Real Social Stats & Rank
  const [isFollowingTarget, setIsFollowingTarget] = useState<boolean>(
    activeUser.isFollowing || profileService.isFollowingLocally(activeUser.id)
  );
  const [followersCount, setFollowersCount] = useState<number>(activeUser.followersCount || 0);
  const [followingCount, setFollowingCount] = useState<number>(activeUser.followingCount || 0);
  const [totalLikesCount, setTotalLikesCount] = useState<number>(activeUser.totalLikes || 0);

  // UI Helpers
  const [copiedId, setCopiedId] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  // Load real content tabs and follower/following counts
  const loadProfileData = async () => {
    if (!isOwner && isCurrentUserBlockedByTarget) {
      setPublicVideos([]);
      setPrivateVideos([]);
      setSavedVideos([]);
      setPostsList([]);
      setLikedVideos([]);
      setIsLoadingContent(false);
      return;
    }
    setIsLoadingContent(true);
    try {
      const [tabs, followersList, followingList] = await Promise.all([
        profileService.getUserContentTabs(
          activeUser.id,
          currentUser.id,
          userVideos,
          currentUser.savedVideoIds || [],
          currentUser.likedVideoIds || []
        ),
        profileService.getFollowers(activeUser.id),
        profileService.getFollowing(activeUser.id),
      ]);

      setPublicVideos(tabs.publicVideos);
      setPrivateVideos(tabs.privateVideos);
      setSavedVideos(tabs.savedVideos);
      setPostsList(tabs.posts);
      setLikedVideos(tabs.likedVideos);
      setTotalLikesCount(Math.max(tabs.totalLikesReceived, activeUser.totalLikes || 0));

      if (followersList.length > 0 || typeof activeUser.followersCount !== 'number') {
        setFollowersCount(Math.max(followersList.length, activeUser.followersCount || 0));
      } else {
        setFollowersCount(activeUser.followersCount || 0);
      }

      if (followingList.length > 0 || typeof activeUser.followingCount !== 'number') {
        setFollowingCount(Math.max(followingList.length, activeUser.followingCount || 0));
      } else {
        setFollowingCount(activeUser.followingCount || 0);
      }
    } catch (err) {
      console.warn('Profile data refresh notice:', err);
    } finally {
      setIsLoadingContent(false);
    }
  };

  useEffect(() => {
    loadProfileData();
    setIsFollowingTarget(activeUser.isFollowing || profileService.isFollowingLocally(activeUser.id));
    if (!isOwner && (activeTab === 'private' || activeTab === 'saved')) {
      setActiveTab('public');
    }
  }, [activeUser.id, currentUser.id, userVideos.length]);

  // Re-fetch profile content, social counts & live rank when user pulls down to refresh
  useEffect(() => {
    const handleGlobalRefresh = () => {
      void loadProfileData();
    };
    window.addEventListener('lenzo:app-refresh', handleGlobalRefresh);
    return () => {
      window.removeEventListener('lenzo:app-refresh', handleGlobalRefresh);
    };
  }, [activeUser.id, currentUser.id, userVideos.length]);

  // Unified 100-Level, 12-VIP, 6-Super-VIP & 10-Achievement Progression Computations
  const levelProgress = useMemo(() => getUserLevelProgress(activeUser), [activeUser]);

  const fullProgression = useMemo(
    () =>
      calculateLevelProgression(
        levelProgress.totalQualifyingCoinsSpent,
        activeUser.id,
        activeUser.equippedVipFrame ?? 0,
        {
          activeFrameType: activeUser.activeFrameType,
          equippedSuperVipFrame: activeUser.equippedSuperVipFrame ?? 0,
          earnedAchievements: activeUser.earnedAchievements ?? [],
          equippedAchievementBadges: activeUser.equippedBadges ?? [],
        }
      ),
    [levelProgress.totalQualifyingCoinsSpent, activeUser]
  );

  const achievementBadges = useMemo(() => {
    const profileCompletedSteps =
      (activeUser.name && activeUser.name.trim().length >= 2 ? 1 : 0) +
      (activeUser.bio && activeUser.bio.trim().length >= 5 ? 1 : 0) +
      (activeUser.country && activeUser.country.trim().length > 0 ? 1 : 0);

    return evaluateAchievementBadges(
      {
        totalQualifyingCoinsSpent: fullProgression.totalQualifyingCoinsSpent,
        diamondsEarned: activeUser.diamonds || 0,
        publicVideosCount: publicVideos.length,
        liveSessionsHosted: activeUser.liveSessionsHosted || 0,
        loginStreakDays: activeUser.loginStreakDays || 1,
        giftsSentCount: activeUser.giftsSentCount || 0,
        followersCount,
        followingCount,
        totalLikesCount,
        hasAgency: Boolean(activeUser.agencyId && activeUser.agencyStatus === 'active'),
        pkWinsCount: activeUser.pkWinsCount || 0,
        eventsWonCount: activeUser.eventsWonCount || 0,
        profileCompletedSteps,
      },
      activeUser.earnedAchievements || [],
      activeUser.equippedBadges || [],
      ACHIEVEMENT_BADGE_DEFINITIONS
    );
  }, [activeUser, fullProgression.totalQualifyingCoinsSpent, publicVideos.length, totalLikesCount, followersCount, followingCount]);

  const achievements = useMemo(
    () =>
      computeUserAchievements({
        user: activeUser,
        publicVideosCount: publicVideos.length,
        totalLikesCount,
        followersCount,
        followingCount,
      }),
    [activeUser, publicVideos.length, totalLikesCount, followersCount, followingCount]
  );

  const earnedBadges = useMemo(() => achievementBadges.filter((b) => b.isEarned), [achievementBadges]);
  const equippedBadges = useMemo(() => achievementBadges.filter((b) => b.isEquipped).slice(0, 3), [achievementBadges]);
  const unlockedAchievementsCount = useMemo(
    () => achievements.filter((a) => a.isUnlocked).length,
    [achievements]
  );

  const openProgressionHub = (tab: ProgressionModalTab) => {
    if (onOpenLevelVIP) {
      onOpenLevelVIP(tab);
    } else {
      onOpenVIP();
    }
  };

  // Handlers
  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(activeUser.displayId);
      setCopiedId(true);
      showToast(`Lenzo ID ${activeUser.displayId} copied`);
      setTimeout(() => setCopiedId(false), 1800);
    }
  };

  const handleQuickImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'avatar' | 'cover'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !isOwner) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be 5MB or smaller.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast('Please select a PNG, JPG, or WEBP image.');
      return;
    }

    setUploadingMedia({ type: kind, progress: 15 });
    try {
      const uploadedUrl = await uploadUserImage(
        file,
        kind === 'cover' ? 'covers' : 'avatars',
        (pct) => setUploadingMedia({ type: kind, progress: Math.max(15, pct) })
      );

      const updated = await profileService.updateProfile(
        currentUser.id,
        kind === 'cover' ? { coverImage: uploadedUrl } : { avatar: uploadedUrl }
      );
      onUpdateProfile(updated);
      showToast(kind === 'cover' ? 'Cover photo updated' : 'Profile picture updated');
    } catch (err: any) {
      showToast(err?.message || 'Upload failed. Please try again.');
    } finally {
      setUploadingMedia(null);
    }
  };

  const handleToggleFollow = async () => {
    if (isOwner) return;
    if (isInteractionBlocked) {
      showToast(
        isTargetBlockedByMe
          ? `Unblock ${activeUser.name} first to follow them.`
          : 'You cannot interact with this profile.'
      );
      return;
    }
    try {
      const res = await profileService.toggleFollow(activeUser.id, currentUser.id);
      setIsFollowingTarget(res.isFollowing);
      setFollowersCount((prev) =>
        res.targetFollowersCount > 0
          ? res.targetFollowersCount
          : Math.max(0, prev + (res.isFollowing ? 1 : -1))
      );
      showToast(res.isFollowing ? `Following ${activeUser.name}` : `Unfollowed ${activeUser.name}`);
    } catch (err: any) {
      showToast(err?.message || 'Could not update follow status.');
    }
  };

  const handleConfirmBlockTarget = async () => {
    if (isOwner || isBlockBusy) return;
    setIsBlockBusy(true);
    try {
      if (onBlockUser) {
        await onBlockUser(activeUser);
      } else {
        await blockUserService({ blockerId: currentUser.id, targetUser: activeUser });
      }
      setIsFollowingTarget(false);
      setShowBlockConfirmModal(false);
      showToast(`${activeUser.name} has been blocked. They can no longer join your streams, rooms, or message you.`);
    } catch {
      showToast('Could not block user right now.');
    } finally {
      setIsBlockBusy(false);
    }
  };

  const handleUnblockTarget = async (targetId: string, targetName: string) => {
    if (isBlockBusy) return;
    setIsBlockBusy(true);
    try {
      if (onUnblockUser) {
        await onUnblockUser(targetId, targetName);
      } else {
        await unblockUserService({ blockerId: currentUser.id, targetUserId: targetId });
      }
      showToast(`${targetName} has been unblocked.`);
    } catch {
      showToast('Could not unblock user right now.');
    } finally {
      setIsBlockBusy(false);
    }
  };

  const handleToggleEquipBadge = async (badgeId: string) => {
    if (!isOwner) return;
    const current = new Set(currentUser.equippedBadges || []);
    if (current.has(badgeId)) {
      current.delete(badgeId);
    } else {
      if (current.size >= 3) {
        showToast('Max 3 achievement badges equipped. Unequip one first.');
        return;
      }
      current.add(badgeId);
    }
    const nextBadges = Array.from(current).slice(0, 3);
    await equipAchievementBadges(currentUser.id, nextBadges).catch(() => {});
    const updated = await profileService.updateProfile(currentUser.id, {
      equippedBadges: nextBadges,
    });
    onUpdateProfile(updated);
    showToast(current.has(badgeId) ? 'Achievement badge equipped to profile' : 'Badge unequipped');
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!isOwner) return;
    await profileService.deleteUserVideo(videoId, currentUser.id);
    setPublicVideos((prev) => prev.filter((v) => v.id !== videoId));
    setPrivateVideos((prev) => prev.filter((v) => v.id !== videoId));
    setSavedVideos((prev) => prev.filter((v) => v.id !== videoId));
    setPostsList((prev) => prev.filter((v) => v.id !== videoId));
    setLikedVideos((prev) => prev.filter((v) => v.id !== videoId));
    if (onDeleteVideo) onDeleteVideo(videoId);
    if (playingVideo?.id === videoId) setPlayingVideo(null);
    setVideoToDelete(null);
    showToast('Content removed from profile');
  };

  const handleToggleVideoPrivacy = async (video: VideoItem) => {
    if (!isOwner) return;
    const isCurrentlyPrivate = video.privacy === 'private' || video.isPrivate === true;
    const nextPrivacy: 'public' | 'private' = isCurrentlyPrivate ? 'public' : 'private';
    await profileService.toggleVideoPrivacy(video.id, currentUser.id, nextPrivacy);
    setPlayingVideo({ ...video, privacy: nextPrivacy, isPrivate: nextPrivacy === 'private' });
    await loadProfileData();
    showToast(nextPrivacy === 'private' ? 'Moved to Private tab' : 'Published to Public tab');
  };

  const handleToggleLikeInPlayer = async (video: VideoItem) => {
    const res = await profileService.toggleLikeVideo(video.id, currentUser.id);
    setPlayingVideo({ ...video, isLiked: res.isLiked, likesCount: res.newCount });
    await loadProfileData();
    showToast(res.isLiked ? 'Added to Liked' : 'Removed like');
  };

  const handleToggleSaveInPlayer = async (video: VideoItem) => {
    const isNowSaved = await profileService.toggleSaveVideo(video.id, currentUser.id);
    setPlayingVideo({ ...video, isSaved: isNowSaved });
    await loadProfileData();
    showToast(isNowSaved ? 'Saved to bookmarks' : 'Removed from Saved');
  };

  const getTabItems = (): VideoItem[] => {
    switch (activeTab) {
      case 'public':
        return publicVideos;
      case 'private':
        return isOwner ? privateVideos : [];
      case 'saved':
        return isOwner ? savedVideos : [];
      case 'posts':
        return postsList;
      case 'liked':
        return likedVideos;
      default:
        return publicVideos;
    }
  };

  const currentTabItems = getTabItems();
  const displayAge = activeUser.showAge !== false ? calculateAgeFromBirthday(activeUser.birthday) : null;
  const displayGender =
    activeUser.showGender !== false &&
    activeUser.gender &&
    activeUser.gender !== 'unspecified'
      ? activeUser.gender.charAt(0).toUpperCase() + activeUser.gender.slice(1)
      : null;
  const showOnline = activeUser.showOnlineStatus !== false;
  const isOnlineNow = isOwner ? true : activeUser.isOnline ?? true;
  const hasAgency = Boolean(activeUser.agencyId && activeUser.agencyStatus === 'active');
  const vipTier = Math.max(fullProgression.highestUnlockedVipTier, activeUser.vipLevel || 0);
  const superVipTier = Math.max(fullProgression.highestUnlockedSuperVipTier, activeUser.superVipLevel || 0);
  const isVipMember = Boolean(activeUser.isVIP || vipTier > 0);
  const nextVipDef = VIP_FRAME_DEFINITIONS.find((v) => v.unlockLevel > fullProgression.currentLevel);
  const nextSuperVipDef = SUPER_VIP_TIER_DEFINITIONS.find((sv) => sv.unlockLevel > fullProgression.currentLevel);

  const openStatsModal = (tab: 'following' | 'followers' | 'likes') => {
    setFollowersModalTab(tab);
    setIsFollowersModalOpen(true);
  };

  const openAgencyCenter = (mode: 'center' | 'join' | 'create') => {
    setAgencyModalMode(mode);
    setIsAgencyModalOpen(true);
  };

  const formatCompact = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const isVideoSource = (url?: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      isFirestoreChunkedVideoUrl(url) ||
      lower.startsWith('blob:') ||
      lower.startsWith('data:video/') ||
      /\.(mp4|webm|mov|m4v|ogv|ogg|3gp|mkv|m3u8)(\?|$)/i.test(lower) ||
      (lower.includes('/api/reels/media/') && !/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(lower)) ||
      (lower.includes('firebasestorage') && !/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(lower)) ||
      lower.includes('/videos%2f')
    );
  };

  const emptyStateCopy: Record<
    ProfileContentTab,
    { title: string; subtitle: string; showUploadCta: boolean }
  > = {
    public: {
      title: 'No public videos yet',
      subtitle: isOwner
        ? 'Upload moments from the + tab to showcase your talent!'
        : `${activeUser.name} has not published public videos yet.`,
      showUploadCta: isOwner,
    },
    private: {
      title: 'No private videos yet',
      subtitle: 'Videos marked Private stay visible only to you and never appear on public feeds.',
      showUploadCta: isOwner,
    },
    saved: {
      title: 'No saved moments yet',
      subtitle: 'Tap Save on any video or moment to keep it handy in your personal collection.',
      showUploadCta: false,
    },
    posts: {
      title: 'No uploaded posts yet',
      subtitle: isOwner
        ? 'Share your highlights, song clips, and party room moments from the + tab.'
        : `${activeUser.name} has not shared any posts yet.`,
      showUploadCta: isOwner,
    },
    liked: {
      title: 'No liked content yet',
      subtitle: 'Videos and moments you like across Lenzo Party will appear here.',
      showUploadCta: false,
    },
  };

  if (!isOwner && isCurrentUserBlockedByTarget) {
    return (
      <div
        className="w-full min-h-dvh-screen bg-[#090611] text-white font-sans flex flex-col"
        style={{ paddingBottom: 'calc(7.5rem + var(--safe-bottom, 0px))' }}
      >
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3.5 bg-[#090611]/90 backdrop-blur-md border-b border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              if (onBack) {
                onBack();
              } else {
                onNavigate('home');
              }
            }}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-white">Account Unavailable</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/35 flex items-center justify-center mb-4">
            <Ban className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-lg font-extrabold text-white mb-2">
            Account Unavailable
          </h2>
          <p className="text-xs text-[#B9AECF] max-w-xs leading-relaxed mb-6">
            You cannot view this user&apos;s ID, profile, videos, or interact with them.
          </p>
          <button
            type="button"
            onClick={() => {
              if (onBack) {
                onBack();
              } else {
                onNavigate('home');
              }
            }}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-bold shadow-lg active:scale-95 transition-transform"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full min-h-dvh-screen bg-[#090611] text-white sm:pb-16 font-sans"
      style={{ paddingBottom: 'calc(7.5rem + var(--safe-bottom, 0px))' }}
    >
      {/* Hidden quick upload inputs for owner */}
      {isOwner && (
        <>
          <input
            ref={quickAvatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleQuickImageUpload(e, 'avatar')}
          />
          <input
            ref={quickCoverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleQuickImageUpload(e, 'cover')}
          />
        </>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed safe-top-offset-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#241145] border border-[#FA26A0]/50 text-white text-xs font-bold shadow-2xl shadow-[#8B20FF]/30 pointer-events-none max-w-[90vw] text-center">
          {toastMessage}
        </div>
      )}

      {/* Modals */}
      {isOwner && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          currentUser={currentUser}
          onSaveProfile={async (updated) => {
            const saved = await profileService.updateProfile(currentUser.id, updated);
            onUpdateProfile(saved);
            showToast('Profile updated successfully');
          }}
        />
      )}

      <ShareProfileModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        user={activeUser}
        currentUser={currentUser}
        conversations={conversations}
        onSendInApp={(target) => {
          if (onSendMessage) onSendMessage(target);
        }}
      />

      <FollowersListModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        userId={activeUser.id}
        initialTab={followersModalTab}
        currentUser={currentUser}
        userPublishedVideos={postsList}
        totalLikesCount={totalLikesCount}
        onSelectUser={(u) => {
          if (onSelectUser) onSelectUser(u);
        }}
        onSelectVideo={(vid) => setPlayingVideo(vid)}
        onFollowChange={() => loadProfileData()}
      />

      <BadgeVaultModal
        isOpen={isBadgeVaultOpen}
        onClose={() => setIsBadgeVaultOpen(false)}
        achievementBadges={achievementBadges}
        isOwner={isOwner}
        onToggleEquipBadge={handleToggleEquipBadge}
      />

      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
        achievements={achievements}
      />

      <AgencyCenterModal
        isOpen={isAgencyModalOpen}
        onClose={() => setIsAgencyModalOpen(false)}
        currentUser={currentUser}
        initialMode={agencyModalMode}
        onSendMessage={onSendMessage}
        onProfileUpdated={(updated) => {
          onUpdateProfile(updated);
          showToast(
            updated.agencyName
              ? `Agency synced: ${updated.agencyName}`
              : 'Agency membership updated'
          );
        }}
      />

      {/* Owner Blocked Users Management Modal */}
      {isOwner && (
        <BlockedUsersModal
          isOpen={isBlockedUsersModalOpen}
          onClose={() => setIsBlockedUsersModalOpen(false)}
          blockedUsers={blockedUsers}
          onUnblock={(uid, uname) => handleUnblockTarget(uid, uname)}
        />
      )}

      {/* Block User Confirmation Dialog */}
      {!isOwner && showBlockConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => !isBlockBusy && setShowBlockConfirmModal(false)}
        >
          <div
            className="w-full max-w-xs bg-[#140B24] border border-rose-500/35 rounded-3xl p-5 text-center space-y-3.5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-400 flex items-center justify-center mx-auto">
              <Ban className="w-5 h-5" />
            </div>
            <h4 className="text-base font-extrabold text-white">
              Block {activeUser.name}?
            </h4>
            <p className="text-xs text-[#C4B8DE] leading-relaxed">
              They will be immediately removed and prevented from joining your live streams, entering your party rooms, commenting, gifting, or sending you direct messages.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={isBlockBusy}
                onClick={() => setShowBlockConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBlockBusy}
                onClick={() => void handleConfirmBlockTarget()}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold disabled:opacity-50"
              >
                {isBlockBusy ? 'Blocking...' : 'Block User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {videoToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setVideoToDelete(null)}
        >
          <div
            className="w-full max-w-xs bg-[#140B24] border border-white/10 rounded-3xl p-5 text-center space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Delete this moment?</h4>
            <p className="text-xs text-[#B9AECF]">
              This permanently deletes the item from your profile.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setVideoToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteVideo(videoToDelete)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Detail & Playback Modal */}
      {playingVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md"
          onClick={() => setPlayingVideo(null)}
        >
          <div
            className="relative w-full max-w-sm bg-[#140B24] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-white px-3 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                {playingVideo.privacy === 'private' || playingVideo.isPrivate ? (
                  <>
                    <Lock className="w-3 h-3 text-[#FFC84A]" />
                    <span className="text-[#FFC84A]">Private</span>
                  </>
                ) : (
                  <span>Public · {playingVideo.createdAt}</span>
                )}
              </span>

              <div className="flex items-center gap-1.5">
                {isOwner && playingVideo.creator?.id === currentUser.id && (
                  <>
                    <button
                      onClick={() => handleToggleVideoPrivacy(playingVideo)}
                      className="px-2.5 h-8 rounded-full bg-black/65 hover:bg-black/85 border border-white/15 text-white text-[11px] font-bold flex items-center gap-1"
                      title="Toggle Public / Private"
                    >
                      {playingVideo.privacy === 'private' || playingVideo.isPrivate ? (
                        <>
                          <Unlock className="w-3 h-3 text-emerald-400" />
                          <span>Make Public</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 text-[#FFC84A]" />
                          <span>Private</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setVideoToDelete(playingVideo.id)}
                      className="w-8 h-8 rounded-full bg-rose-600/85 hover:bg-rose-600 flex items-center justify-center text-white"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setPlayingVideo(null)}
                  className="w-8 h-8 rounded-full bg-black/65 hover:bg-black/85 flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative aspect-[9/14] w-full bg-black flex items-center justify-center overflow-hidden">
              {isVideoSource(playingVideo.videoUrl) ? (
                resolvedPlayingVideoUrl ? (
                  <video
                    src={resolvedPlayingVideoUrl}
                    poster={
                      playingVideo.thumbnailUrl && !isFirestoreChunkedVideoUrl(playingVideo.thumbnailUrl)
                        ? playingVideo.thumbnailUrl
                        : undefined
                    }
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-xs text-[#B9AECF]">
                    <div className="w-8 h-8 border-2 border-[#FA26A0] border-t-transparent rounded-full animate-spin" />
                    <span>Loading video...</span>
                  </div>
                )
              ) : (
                <img
                  src={playingVideo.thumbnailUrl || playingVideo.videoUrl}
                  alt={playingVideo.description}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="p-4 bg-[#140B24] space-y-3">
              <p className="text-xs text-white leading-relaxed font-medium">
                {playingVideo.description || 'Lenzo Party Moment'}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                <button
                  onClick={() => handleToggleLikeInPlayer(playingVideo)}
                  className={`flex items-center gap-1.5 font-bold ${
                    playingVideo.isLiked ? 'text-[#FA26A0]' : 'text-white/80 hover:text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${playingVideo.isLiked ? 'fill-current' : ''}`} />
                  <span className="tabular-nums">{(playingVideo.likesCount || 0).toLocaleString()}</span>
                </button>

                <button
                  onClick={() => handleToggleSaveInPlayer(playingVideo)}
                  className={`flex items-center gap-1.5 font-bold ${
                    playingVideo.isSaved ? 'text-[#FFC84A]' : 'text-white/80 hover:text-white'
                  }`}
                >
                  {playingVideo.isSaved ? (
                    <BookmarkCheck className="w-4 h-4 fill-current" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                  <span>{playingVideo.isSaved ? 'Saved' : 'Save'}</span>
                </button>

                <span className="flex items-center gap-1.5 text-[#B9AECF] tabular-nums">
                  <MessageSquare className="w-4 h-4" />
                  <span>{(playingVideo.commentsCount || 0).toLocaleString()}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MAIN RESPONSIVE CONTAINER (Mobile-first -> Full 2-col Desktop)
         ==================================================================== */}
      <div className="max-w-5xl mx-auto">
        {/* 1. PROFILE HEADER & FULL-WIDTH COVER SECTION */}
        <section className="relative">
          {/* Cover Photo Banner */}
          <div className="relative h-44 sm:h-56 w-full overflow-hidden sm:rounded-b-3xl bg-gradient-to-br from-[#2B1055] via-[#4C1784] to-[#170929] border-b border-white/[0.08]">
            {activeUser.coverImage ? (
              <img
                src={activeUser.coverImage}
                alt={`${activeUser.name} cover`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0">
                <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#FA26A0]/20 blur-3xl" />
                <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-[#8B20FF]/25 blur-3xl" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#090611] via-[#090611]/35 to-black/35" />

            {/* Top Utility Bar over Cover */}
            <div className="absolute safe-top-offset-3 left-3 right-3 z-20 flex items-center justify-between gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {!isOwner && onBack ? (
                  <button
                    onClick={onBack}
                    aria-label="Go Back"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-95 transition-transform shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="px-2.5 sm:px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] sm:text-xs font-extrabold tracking-wide text-white truncate">
                    LENZO
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {isOwner && (
                  <button
                    onClick={() => quickCoverInputRef.current?.click()}
                    className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/15 text-white text-[11px] sm:text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-[#FA26A0] shrink-0" />
                    <span className="hidden sm:inline">Change Cover</span>
                    <span className="sm:hidden">Cover</span>
                  </button>
                )}

                <button
                  onClick={() => setIsShareModalOpen(true)}
                  aria-label="Share Profile"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-95 transition-all shrink-0"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                {isOwner && (
                  <button
                    onClick={() => setIsBlockedUsersModalOpen(true)}
                    aria-label="Blocked Users"
                    title="Manage Blocked Users"
                    className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-rose-500/25 backdrop-blur-md border border-white/15 hover:border-rose-400/45 flex items-center justify-center text-white active:scale-95 transition-all shrink-0"
                  >
                    <Ban className="w-4 h-4 text-rose-300" />
                    {blockedUsers.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 text-[9px] font-black text-white flex items-center justify-center border border-[#090611]">
                        {blockedUsers.length > 99 ? '99+' : blockedUsers.length}
                      </span>
                    )}
                  </button>
                )}

                {isOwner && onOpenAccountSwitcher && (
                  <button
                    onClick={onOpenAccountSwitcher}
                    aria-label="Switch Account"
                    title="Switch Account"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-[#fe2c55]/30 backdrop-blur-md border border-white/15 hover:border-[#fe2c55]/50 flex items-center justify-center text-white active:scale-95 transition-all shrink-0"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-[#25f4ee]" />
                  </button>
                )}

                {isOwner && (
                  <button
                    onClick={() => onNavigate('settings')}
                    aria-label="Settings"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-95 transition-all shrink-0"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Cover Upload Progress Indicator */}
            {uploadingMedia?.type === 'cover' && (
              <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                <div className="w-44 h-2 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] transition-all"
                    style={{ width: `${uploadingMedia.progress}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-white tabular-nums">
                  Uploading cover ({uploadingMedia.progress}%)
                </span>
              </div>
            )}
          </div>

          {/* Avatar + Primary Actions Overlap Row */}
          <div className="px-4 sm:px-6 -mt-12 sm:-mt-14 relative z-20 flex items-end justify-between gap-3">
            {/* Profile Picture with VIP Frame + Online Dot + Upload Button */}
            <div className="relative shrink-0">
              <div className="rounded-full p-1 bg-[#090611]">
                <AvatarWithFrame
                  src={activeUser.avatar}
                  name={activeUser.name}
                  level={fullProgression.currentLevel}
                  vipLevel={fullProgression.equippedVipFrame}
                  superVipLevel={fullProgression.equippedSuperVipFrame}
                  activeFrameType={fullProgression.activeFrameType}
                  isVIP={isVipMember}
                  size="xl"
                  showFrame={true}
                  showVipBadge={false}
                  onClick={() => {
                    if (isOwner) quickAvatarInputRef.current?.click();
                  }}
                />
              </div>

              {/* Online / Offline Status Indicator */}
              {showOnline && (
                <span
                  title={isOnlineNow ? 'Online' : 'Offline'}
                  className={`absolute top-2 right-2 w-3.5 h-3.5 rounded-full ring-2 ring-[#090611] ${
                    isOnlineNow ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />
              )}

              {/* Direct Avatar Upload Trigger */}
              {isOwner && (
                <button
                  onClick={() => quickAvatarInputRef.current?.click()}
                  aria-label="Change Profile Picture"
                  className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-gradient-to-tr from-[#8B20FF] to-[#FA26A0] text-white flex items-center justify-center shadow-lg ring-2 ring-[#090611] hover:scale-105 active:scale-95 transition-transform"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}

              {uploadingMedia?.type === 'avatar' && (
                <div className="absolute inset-0 rounded-full bg-black/75 flex items-center justify-center">
                  <span className="text-xs font-mono font-bold text-white tabular-nums">
                    {uploadingMedia.progress}%
                  </span>
                </div>
              )}
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 pb-1 flex-wrap justify-end">
              {isOwner ? (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] hover:opacity-95 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-[#8B20FF]/25 whitespace-nowrap active:scale-95 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <>
                  {!isInteractionBlocked && (
                    <button
                      onClick={handleToggleFollow}
                      className={`h-10 px-4 rounded-xl text-xs font-extrabold flex items-center gap-1.5 active:scale-95 transition-all ${
                        isFollowingTarget
                          ? 'bg-white/12 hover:bg-white/20 text-white border border-white/15'
                          : 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white shadow-lg shadow-[#8B20FF]/25'
                      }`}
                    >
                      {isFollowingTarget ? (
                        <>
                          <UserCheck className="w-4 h-4 text-emerald-400" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  )}

                  {onSendMessage && !isInteractionBlocked && (
                    <button
                      onClick={() => onSendMessage(activeUser)}
                      aria-label="Message"
                      className="h-10 w-10 rounded-xl bg-[#1B1030] hover:bg-[#271645] border border-white/10 flex items-center justify-center text-[#06B6D4]"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}

                  {onSendGift && !isInteractionBlocked && (
                    <button
                      onClick={() => onSendGift(activeUser)}
                      aria-label="Send Gift"
                      className="h-10 w-10 rounded-xl bg-[#1B1030] hover:bg-[#271645] border border-white/10 flex items-center justify-center text-[#FA26A0]"
                    >
                      <Gift className="w-4 h-4" />
                    </button>
                  )}

                  {isTargetBlockedByMe ? (
                    <button
                      type="button"
                      disabled={isBlockBusy}
                      onClick={() => void handleUnblockTarget(activeUser.id, activeUser.name)}
                      className="h-10 px-3.5 rounded-xl bg-rose-500/20 hover:bg-emerald-500/20 border border-rose-400/50 hover:border-emerald-400/50 text-rose-200 hover:text-emerald-200 text-xs font-extrabold flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>{isBlockBusy ? 'Updating...' : 'Unblock'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowBlockConfirmModal(true)}
                      aria-label="Block User"
                      title={`Block ${activeUser.name}`}
                      className="h-10 px-3 rounded-xl bg-[#1B1030] hover:bg-rose-600/25 border border-white/10 hover:border-rose-400/50 text-rose-300 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Block</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Blocked Status Notice Banner when viewing a blocked user or blocked by them */}
          {!isOwner && isInteractionBlocked && (
            <div className="px-4 sm:px-6 mt-3">
              <div className="rounded-2xl bg-rose-950/50 border border-rose-500/40 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <p className="text-xs text-rose-100 leading-snug">
                    {isTargetBlockedByMe
                      ? `You have blocked ${activeUser.name}. They cannot interact with your streams, party rooms, or messages.`
                      : `You cannot follow, message, or interact with ${activeUser.name}.`}
                  </p>
                </div>
                {isTargetBlockedByMe && (
                  <button
                    type="button"
                    disabled={isBlockBusy}
                    onClick={() => void handleUnblockTarget(activeUser.id, activeUser.name)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold shrink-0"
                  >
                    Unblock
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ====================================================================
            RESPONSIVE 2-COLUMN BODY (Mobile single column -> Desktop 2-col)
           ==================================================================== */}
        <div className="px-4 sm:px-6 pt-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT COLUMN: Identity, Stats, Level & VIP, Agency & Crew, Badges */}
          <div className="lg:col-span-5 space-y-4">
            {/* 2. USER INFORMATION SECTION */}
            <div className="p-4 sm:p-5 rounded-3xl bg-[#140B24] border border-white/[0.08] flex flex-col gap-3.5">
              {/* Header Flex-Grid: Identity & Primary Badges (Left) + Hero Level Emblem (Right) */}
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start sm:items-center gap-x-3 sm:gap-x-4 gap-y-3">
                {/* Left Identity & Badge Stack */}
                <div className="min-w-0 flex flex-col gap-2.5">
                  {/* Row 1: Display Name + Verification Tag (Blue Tick Respect / Golden Tick Legends) */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 min-w-0">
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight truncate max-w-full">
                      {activeUser.name}
                    </h1>
                    <VerifiedNameTag
                      user={activeUser}
                      level={fullProgression.currentLevel}
                      vipLevel={vipTier}
                      superVipLevel={superVipTier}
                      showUnverifiedHint={isOwner}
                    />
                  </div>

                  {/* Row 2: @username + Copyable Lenzo Party ID */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
                    <span className="text-[#FA26A0] font-mono font-bold truncate max-w-[165px]">
                      {activeUser.username || `@${activeUser.displayId.toLowerCase()}`}
                    </span>
                    <span className="text-white/25 select-none">·</span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[#D7CEEB] font-mono text-[11px] transition-colors"
                    >
                      <span>ID: {activeUser.displayId}</span>
                      {copiedId ? (
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <Copy className="w-3 h-3 text-[#B9AECF] shrink-0" />
                      )}
                    </button>
                  </div>

                  {/* Row 3: Progression & Membership Badges Rail (Level + VIP + Super VIP) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <LevelBadge
                      level={fullProgression.currentLevel}
                      size="profile"
                      progressPercent={fullProgression.percentage}
                      onClick={() => openProgressionHub('roadmap')}
                    />
                    <VipTierBadge
                      tier={vipTier}
                      size="md"
                      onClick={() => openProgressionHub('vip')}
                    />
                    {superVipTier > 0 && (
                      <SuperVipTierBadge
                        tier={superVipTier}
                        size="md"
                        onClick={() => openProgressionHub('super_vip')}
                      />
                    )}
                  </div>
                </div>

                {/* Right Slot: Prominent Clickable Level Emblem Shield (0–100) */}
                <button
                  type="button"
                  onClick={() => openProgressionHub('roadmap')}
                  aria-label={`Level ${fullProgression.currentLevel} Emblem — Tap to view all levels 0 to 100`}
                  className="group shrink-0 self-start sm:self-center flex flex-col items-center justify-center px-2.5 py-2 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] transition-all duration-200 hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FA26A0]"
                >
                  <LevelEmblemBadge
                    level={fullProgression.currentLevel}
                    size="hero"
                  />
                  <span className="mt-1.5 text-[10px] font-black tracking-wider uppercase text-[#E9D5FF] group-hover:text-[#FFC84A] transition-colors whitespace-nowrap tabular-nums">
                    LV.{fullProgression.currentLevel} · {fullProgression.currentTierName}
                  </span>
                </button>
              </div>

              {/* Full-Width Equipped Achievement Badges Strip (up to 3) */}
              {equippedBadges.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {equippedBadges.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setIsBadgeVaultOpen(true)}
                      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-[#1D0F38] hover:bg-[#29154E] border border-white/10 text-[10px] font-bold text-white transition-colors"
                    >
                      <AchievementBadgeEmblem
                        shape={b.shape}
                        iconKey={b.iconKey}
                        accentFrom={b.accentFrom}
                        accentTo={b.accentTo}
                        borderHex={b.borderHex}
                        isEarned={true}
                        size="xs"
                      />
                      <span>{b.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Full-Width Status Icons & Metadata Rail: Country, Gender/Age, Online Status, Crew */}
              {(activeUser.country || displayGender || displayAge !== null || showOnline || activeUser.crewBadge) && (
                <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-white/[0.06] text-[11px] text-[#D7CEEB]">
                  {activeUser.country && (
                    <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-white/[0.05] border border-white/[0.07]">
                      <span className="leading-none">{getCountryFlag(activeUser.country)}</span>
                      <span className="font-medium leading-none">{activeUser.country}</span>
                    </span>
                  )}

                  {(displayGender || displayAge !== null) && (
                    <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-white/[0.05] border border-white/[0.07]">
                      {displayGender && <span className="leading-none">{displayGender}</span>}
                      {displayGender && displayAge !== null && (
                        <span className="text-white/30 leading-none">·</span>
                      )}
                      {displayAge !== null && (
                        <span className="tabular-nums leading-none">{displayAge} yrs</span>
                      )}
                    </span>
                  )}

                  {showOnline && (
                    <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-white/[0.05] border border-white/[0.07]">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isOnlineNow
                            ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.75)]'
                            : 'bg-slate-400'
                        }`}
                      />
                      <span className="font-medium leading-none">
                        {isOnlineNow ? 'Online' : 'Offline'}
                      </span>
                    </span>
                  )}

                  {activeUser.crewBadge && (
                    <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-[#8B20FF]/20 border border-[#8B20FF]/40 text-[#E9D5FF] font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#C084FC] shrink-0" />
                      <span className="leading-none">{activeUser.crewBadge}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Bio */}
              <p className="text-xs text-[#D7CEEB] leading-relaxed pt-2 border-t border-white/[0.07]">
                {activeUser.bio
                  ? activeUser.bio
                  : isOwner
                  ? 'No bio yet. Tap Edit Profile to introduce yourself to your audience.'
                  : 'Member of Lenzo Party Live.'}
              </p>

              {/* 3. CLICKABLE PROFILE STATISTICS (Following, Followers, Likes) */}
              <div className="grid grid-cols-3 rounded-2xl bg-[#0E071B] border border-white/[0.07] divide-x divide-white/[0.08]">
                <button
                  onClick={() => openStatsModal('following')}
                  className="py-3 px-2 flex flex-col items-center hover:bg-white/[0.04] rounded-l-2xl transition-colors"
                >
                  <span className="text-base sm:text-lg font-black text-white font-mono tabular-nums">
                    {formatCompact(followingCount)}
                  </span>
                  <span className="text-[11px] font-semibold text-[#B9AECF]">Following</span>
                </button>

                <button
                  onClick={() => openStatsModal('followers')}
                  className="py-3 px-2 flex flex-col items-center hover:bg-white/[0.04] transition-colors"
                >
                  <span className="text-base sm:text-lg font-black text-white font-mono tabular-nums">
                    {formatCompact(followersCount)}
                  </span>
                  <span className="text-[11px] font-semibold text-[#B9AECF]">Followers</span>
                </button>

                <button
                  onClick={() => openStatsModal('likes')}
                  className="py-3 px-2 flex flex-col items-center hover:bg-white/[0.04] rounded-r-2xl transition-colors"
                >
                  <span className="text-base sm:text-lg font-black text-[#FFC84A] font-mono tabular-nums">
                    {formatCompact(totalLikesCount)}
                  </span>
                  <span className="text-[11px] font-semibold text-[#B9AECF]">Likes</span>
                </button>
              </div>
            </div>

            {/* 4. FOUR SEPARATE INTERACTIVE PROGRESSION CARDS */}
            <div className="space-y-3">
              {/* Card 1: 100-Level Progress Card -> Opens Full 100-Level Roadmap */}
              <div
                onClick={() => openProgressionHub('roadmap')}
                className="p-4 rounded-3xl bg-gradient-to-br from-[#1E0F3A] via-[#140B24] to-[#110820] border border-white/12 hover:border-[#FA26A0]/50 transition-all cursor-pointer space-y-3 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <LevelEmblemBadge level={fullProgression.currentLevel} size="sm" className="shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white truncate">
                        {fullProgression.currentTierName} Tier · Lv.{fullProgression.currentLevel}/100
                      </p>
                      <p className="text-[11px] text-[#B9AECF] truncate font-mono tabular-nums">
                        {fullProgression.isMaxMastery
                          ? '1.33B Coin Legend Mastery Complete'
                          : `Need ${fullProgression.remainingCoinsNeeded.toLocaleString()} coins for Lv.${Math.min(100, fullProgression.currentLevel + 1)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-mono font-black text-[#FFC84A] tabular-nums">
                      {fullProgression.percentage}%
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#B9AECF] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-black/55 border border-white/[0.08] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#8B20FF] via-[#FA26A0] to-[#FFC84A] transition-all duration-500"
                      style={{ width: `${Math.max(4, fullProgression.percentage)}%` }}
                    />
                  </div>
                  {!fullProgression.isMaxMastery && (
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#B9AECF] tabular-nums">
                      <span>Spent: {fullProgression.totalQualifyingCoinsSpent.toLocaleString()}</span>
                      <span className="text-[#FFC84A]">
                        {fullProgression.coinsInCurrentLevel.toLocaleString()} / {fullProgression.coinsNeededForNextLevel.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Unified VIP Member & Super VIP Card */}
              <div className="rounded-3xl bg-gradient-to-br from-[#28152C] via-[#170C27] to-[#120820] border border-[#FFC84A]/30 overflow-hidden shadow-[0_10px_28px_rgba(0,0,0,0.35)]">
                {/* VIP Membership Row */}
                <button
                  type="button"
                  onClick={() => openProgressionHub('vip')}
                  className="w-full p-4 hover:bg-white/[0.04] text-left transition-colors active:bg-white/[0.06] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#FFC84A]/15 border border-[#FFC84A]/40 text-[#FFC84A] flex items-center justify-center shrink-0">
                      <Crown className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-white truncate">VIP Member</p>
                        <VipTierBadge tier={vipTier} size="xs" />
                      </div>
                      <p className="text-[11px] text-[#D7CEEB] mt-0.5 truncate tabular-nums">
                        {fullProgression.unlockedVipTiers.length}/12 Frames ·{' '}
                        <span className="text-[#FFC84A] font-semibold">
                          {nextVipDef ? `Next ${nextVipDef.code} (Lv.${nextVipDef.unlockLevel})` : 'All 12 Unlocked'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#FFC84A]/80 shrink-0" />
                </button>

                <div className="h-px bg-white/[0.08] mx-4" />

                {/* Super VIP Collection Row */}
                <button
                  type="button"
                  onClick={() => openProgressionHub('super_vip')}
                  className="w-full p-4 hover:bg-white/[0.04] text-left transition-colors active:bg-white/[0.06] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/45 text-fuchsia-300 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-white truncate">Super VIP</p>
                        {superVipTier > 0 ? (
                          <SuperVipTierBadge tier={superVipTier} size="xs" />
                        ) : (
                          <span className="text-[10px] font-bold text-fuchsia-200 tabular-nums">
                            SVIP 0/6
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#D7CEEB] mt-0.5 truncate tabular-nums">
                        {fullProgression.unlockedSuperVipTiers.length}/6 Animated ·{' '}
                        <span className="text-fuchsia-300 font-semibold">
                          {nextSuperVipDef
                            ? `Next ${nextSuperVipDef.code} (Lv.${nextSuperVipDef.unlockLevel})`
                            : 'Max Cosmic Gold'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-fuchsia-300/80 shrink-0" />
                </button>
              </div>

              {/* Card 4: Independent Achievement Badges Card -> Opens Badge Vault */}
              <div className="p-4 rounded-3xl bg-[#140B24] border border-white/[0.1] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#B9AECF] flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#FFC84A]" />
                      <span>Achievement Badges</span>
                    </h2>
                    <p className="text-[11px] text-[#B9AECF] mt-0.5 tabular-nums">
                      {earnedBadges.length}/{achievementBadges.length} earned · {equippedBadges.length}/3 equipped
                    </p>
                  </div>

                  <button
                    onClick={() => openProgressionHub('achievements')}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <span>Badge Vault</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {(equippedBadges.length > 0 ? equippedBadges : achievementBadges.slice(0, 4))
                    .slice(0, 4)
                    .map((badge) => (
                      <button
                        key={badge.id}
                        onClick={() => setIsBadgeVaultOpen(true)}
                        className={`p-2.5 rounded-2xl border flex flex-col items-center text-center gap-1.5 transition-all ${
                          badge.isEarned
                            ? 'bg-[#1D1036] border-white/15 hover:border-[#FA26A0]/55'
                            : 'bg-white/[0.02] border-white/[0.06] opacity-70'
                        }`}
                      >
                        <AchievementBadgeEmblem
                          shape={badge.shape}
                          iconKey={badge.iconKey}
                          accentFrom={badge.accentFrom}
                          accentTo={badge.accentTo}
                          borderHex={badge.borderHex}
                          isEarned={badge.isEarned}
                          size="sm"
                        />
                        <span className="text-[10px] font-bold text-white line-clamp-1">
                          {badge.name}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Admin-Only Administration Console Card (Strictly Visible Only to Authorized Admins) */}
            {isOwner && isAuthorizedAdminEmail(currentUser.email) && onOpenAdminPanel && (
              <button
                type="button"
                onClick={onOpenAdminPanel}
                className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#24103F] to-fuchsia-500/15 border border-[#FFC84A]/50 hover:border-[#FFC84A] flex items-center justify-between gap-3 text-left transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#FFC84A]/20 text-[#FFC84A] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white">Lenzo Administration Panel</p>
                    <p className="text-[10px] text-[#C5B9DE] truncate">
                      Live users, direct coins, agencies, block/suspend, device ban, level &amp; VIP
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#FFC84A] shrink-0" />
              </button>
            )}

          </div>

          {/* RIGHT COLUMN: 4-Option Quick Access Bar (Screenshot Style) + 5 Content Tabs */}
          <div className="lg:col-span-7 space-y-5">
            {/* 7. PROFILE QUICK ACCESS BAR (4 GLOWING ICON TILES MATCHING SCREENSHOT) */}
            <section className="rounded-3xl bg-[#130921] border border-white/[0.09] px-3 py-4 sm:px-5 sm:py-5 shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
              <div className="grid grid-cols-4 gap-2 sm:gap-4 items-start">
                {/* 1. Top Achievements */}
                <button
                  type="button"
                  onClick={() => setIsAchievementsOpen(true)}
                  className="group flex flex-col items-center text-center focus:outline-none active:scale-95 transition-transform"
                >
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-[2px] bg-gradient-to-br from-[#F43F9E] via-[#C026D3] to-[#F59E0B] shadow-[0_0_20px_rgba(236,72,153,0.42)] group-hover:shadow-[0_0_24px_rgba(245,158,11,0.55)] transition-shadow">
                    <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-[#2A103E] to-[#170826] flex items-center justify-center">
                      <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-[#FBBF24] drop-shadow-[0_0_8px_rgba(251,191,36,0.55)]" />
                    </div>
                    {unlockedAchievementsCount > 0 && (
                      <span
                        aria-hidden="true"
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#F59E0B] ring-2 ring-[#130921] shadow-[0_0_8px_rgba(245,158,11,0.85)]"
                      />
                    )}
                  </div>
                  <span className="mt-2 text-[11px] sm:text-xs font-extrabold leading-tight text-[#FBBF24]">
                    Top
                    <br />
                    Achievements
                  </span>
                  <span className="mt-0.5 text-[9.5px] sm:text-[10px] text-[#9E93B8] leading-tight line-clamp-1 tabular-nums">
                    {unlockedAchievementsCount > 0
                      ? `${unlockedAchievementsCount}/${achievements.length} Earned`
                      : 'Milestones'}
                  </span>
                </button>

                {/* 2. Agency */}
                <button
                  type="button"
                  onClick={() => openAgencyCenter(hasAgency ? 'center' : 'join')}
                  className="group flex flex-col items-center text-center focus:outline-none active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-[#3B82F6] bg-gradient-to-b from-[#132852] to-[#0C1633] shadow-[0_0_18px_rgba(59,130,246,0.4),inset_0_0_12px_rgba(59,130,246,0.18)] group-hover:shadow-[0_0_24px_rgba(59,130,246,0.6)] flex items-center justify-center transition-shadow">
                    <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-[#60A5FA]" />
                  </div>
                  <span className="mt-2 text-[11px] sm:text-xs font-extrabold leading-tight text-white">
                    Agency
                  </span>
                </button>

                {/* 3. Wallet */}
                <button
                  type="button"
                  onClick={onOpenWallet}
                  className="group flex flex-col items-center text-center focus:outline-none active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-[#D97706] bg-gradient-to-b from-[#36200B] to-[#1D1109] shadow-[0_0_18px_rgba(245,158,11,0.38),inset_0_0_12px_rgba(245,158,11,0.16)] group-hover:shadow-[0_0_24px_rgba(245,158,11,0.58)] flex items-center justify-center transition-shadow">
                    <Wallet className="w-6 h-6 sm:w-7 sm:h-7 text-[#FBBF24]" />
                  </div>
                  <span className="mt-2 text-[11px] sm:text-xs font-extrabold leading-tight text-white">
                    Wallet
                  </span>
                </button>

                {/* 4. Rankings */}
                <button
                  type="button"
                  onClick={() => onNavigate('rankings')}
                  className="group flex flex-col items-center text-center focus:outline-none active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-[#C026D3] bg-gradient-to-b from-[#321149] to-[#1A092B] shadow-[0_0_18px_rgba(192,38,211,0.42),inset_0_0_12px_rgba(192,38,211,0.18)] group-hover:shadow-[0_0_24px_rgba(192,38,211,0.62)] flex items-center justify-center transition-shadow">
                    <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-[#E879F9]" />
                  </div>
                  <span className="mt-2 text-[11px] sm:text-xs font-extrabold leading-tight text-white">
                    Rankings
                  </span>
                </button>
              </div>
            </section>

            {/* 8. PROFILE CONTENT TABS (Public, Private, Saved, Posts, Liked) */}
            <section className="rounded-3xl bg-[#140B24] border border-white/[0.08] p-4 sm:p-5 space-y-4">
              {/* Horizontally Scrollable Tab Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {([
                  { id: 'public', label: 'Public', count: publicVideos.length, icon: Video },
                  { id: 'private', label: 'Private', count: isOwner ? privateVideos.length : null, icon: Lock },
                  { id: 'saved', label: 'Saved', count: isOwner ? savedVideos.length : null, icon: Bookmark },
                  { id: 'posts', label: 'Posts', count: postsList.length, icon: LayoutGrid },
                  { id: 'liked', label: 'Liked', count: likedVideos.length, icon: Heart },
                ] as const).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white shadow-md shadow-[#8B20FF]/25'
                          : 'bg-white/[0.04] text-[#B9AECF] hover:text-white hover:bg-white/[0.08]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                      {tab.count !== null && (
                        <span className="text-[10px] font-mono tabular-nums opacity-85">
                          ({tab.count})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Upload Bar for Owner on Public / Posts */}
              {isOwner && onOpenUploadVideo && (activeTab === 'public' || activeTab === 'posts') && (
                <div className="flex items-center justify-between gap-2 px-1">
                  <span className="text-xs text-[#B9AECF]">
                    {activeTab === 'public' ? 'Your Public Showcase' : 'All Uploaded Moments'}
                  </span>
                  <button
                    onClick={onOpenUploadVideo}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>
                </div>
              )}

              {/* Content Grid / Protected Gate / Empty States */}
              {isLoadingContent ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2.5">
                  <div className="w-8 h-8 border-2 border-[#FA26A0] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-[#B9AECF]">Loading content...</span>
                </div>
              ) : (activeTab === 'private' || activeTab === 'saved') && !isOwner ? (
                <div className="py-12 px-4 rounded-2xl bg-[#0E071B] border border-white/[0.07] text-center flex flex-col items-center space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFC84A]/15 border border-[#FFC84A]/30 text-[#FFC84A] flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    {activeTab === 'private' ? 'Private content is protected' : 'Saved items are private'}
                  </h4>
                  <p className="text-xs text-[#B9AECF] max-w-xs">
                    Only the authorized profile owner can view {activeTab} items.
                  </p>
                </div>
              ) : currentTabItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {currentTabItems.map((item) => {
                    const isPriv = item.privacy === 'private' || item.isPrivate === true;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setPlayingVideo(item)}
                        className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#0E071B] border border-white/10 hover:border-[#FA26A0]/60 cursor-pointer transition-all flex flex-col justify-between p-2.5"
                      >
                        {item.thumbnailUrl && !isFirestoreChunkedVideoUrl(item.thumbnailUrl) ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.description || 'Lenzo moment'}
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : !isFirestoreChunkedVideoUrl(item.videoUrl) && !isVideoSource(item.videoUrl) ? (
                          <img
                            src={item.videoUrl}
                            alt={item.description || 'Lenzo moment'}
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-[#1C0F33] via-[#120922] to-[#260D3B] flex items-center justify-center">
                            <Play className="w-8 h-8 text-[#FA26A0]/80 fill-[#FA26A0]/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/35 pointer-events-none" />

                        <div className="relative z-10 flex items-center justify-between gap-1">
                          {isPriv ? (
                            <span className="px-2 py-0.5 rounded-md bg-black/70 border border-[#FFC84A]/40 text-[#FFC84A] text-[10px] font-bold flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Private</span>
                            </span>
                          ) : (
                            <span />
                          )}

                          {isOwner && item.creator?.id === currentUser.id && activeTab !== 'liked' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setVideoToDelete(item.id);
                              }}
                              aria-label="Delete item"
                              className="w-7 h-7 rounded-full bg-black/65 hover:bg-rose-600 text-white flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="relative z-10 flex items-center justify-between text-[11px] font-mono font-bold text-white tabular-nums">
                          <span className="flex items-center gap-1">
                            <Play className="w-3 h-3 fill-white" />
                            <span>{formatCompact(item.viewsCount || 0)}</span>
                          </span>
                          <span className="flex items-center gap-1 text-pink-300">
                            <Heart className="w-3 h-3 fill-current" />
                            <span>{formatCompact(item.likesCount || 0)}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 px-4 rounded-2xl bg-[#0E071B] border border-white/[0.07] text-center flex flex-col items-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.05] text-[#C084FC] flex items-center justify-center">
                    {activeTab === 'public' && <Video className="w-5 h-5" />}
                    {activeTab === 'private' && <Lock className="w-5 h-5 text-[#FFC84A]" />}
                    {activeTab === 'saved' && <Bookmark className="w-5 h-5 text-[#06B6D4]" />}
                    {activeTab === 'posts' && <LayoutGrid className="w-5 h-5" />}
                    {activeTab === 'liked' && <Heart className="w-5 h-5 text-[#FA26A0]" />}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">
                      {emptyStateCopy[activeTab].title}
                    </h4>
                    <p className="text-xs text-[#B9AECF] max-w-xs mx-auto leading-relaxed">
                      {emptyStateCopy[activeTab].subtitle}
                    </p>
                  </div>
                  {emptyStateCopy[activeTab].showUploadCta && onOpenUploadVideo && (
                    <button
                      onClick={onOpenUploadVideo}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-[#8B20FF]/25 active:scale-95 transition-transform"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Upload First Moment</span>
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
