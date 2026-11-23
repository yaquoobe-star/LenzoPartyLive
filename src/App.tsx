import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { 
  ScreenType, 
  UserProfile, 
  LiveStream, 
  PartyRoom, 
  GiftItem, 
  Conversation,
  PlatformViewMode,
  PKMatchSession,
  PKMatchInvitation,
  VideoItem,
  BroadcasterRankingEntry,
  RoomKickRecord,
  HostModeratorRecord,
  NotificationItem,
  NotificationCategory,
  NotificationActionType,
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from './types';
import { 
  CURRENT_USER, 
  MOCK_GIFTS 
} from './data/mockData';
import { getInitialUserProfile, saveStoredUserProfile } from './utils/storage';
import { pkService } from './utils/pkService';
import { profileService } from './utils/profileService';
import { auth, db } from './firebase';
import {
  doc,
  getDoc,
  getDocFromServer,
  updateDoc,
  onSnapshot,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import {
  logoutUser,
  signInWithGoogle,
  fetchCurrentFirestoreProfile,
  mapFirestoreUserToProfile,
  needsGooglePasswordRegistration,
  FirestoreUserData,
} from './services/authService';
import {
  SavedDeviceAccount,
  rememberAuthenticatedAccount,
  subscribeUserSettings,
} from './services/accountSwitcherService';
import {
  REELS_PAGE_SIZE,
  subscribeReelsFeed,
  fetchMoreReels,
  deleteOwnReel,
} from './services/reelService';
import { androidBridge } from './utils/androidBridge';
import { ensureNativeMediaPermissions } from './utils/mediaDeviceHelper';
import { 
  subscribeFirestoreLiveStreams, 
  subscribeFirestorePartyRooms, 
  subscribeFirestoreVideos,
  createFirestoreLiveStream,
  createFirestorePartyRoom,
  endFirestoreLiveStream,
  deleteFirestorePartyRoom,
  syncFirestoreFollow
} from './services/firestoreService';
import { liveAndRoomService } from './services/liveAndRoomService';
import {
  processGiftTransaction,
  subscribeUserWallet,
  subscribeUserEarnings,
  subscribeWalletSettings,
  DEFAULT_WALLET_SETTINGS,
} from './services/walletService';
import {
  BlockedUserRecord,
  blockUser,
  unblockUser,
  subscribeBlockedByMe,
  subscribeBlockedMe,
} from './services/blockService';
import {
  subscribeMyActiveRoomKicks,
  getActiveKickForRoom,
  formatRemainingKickTime,
  subscribeHostModerators,
  removeHostModerator,
} from './services/roomModerationService';
import {
  clampPartyMaxSeatsForHostLevel,
  enforcePartyRoomSeatPolicy,
  isSeatLockedByHostLevel,
} from './utils/partySeatRules';
import { getOrCreateDeviceId, isAuthorizedAdminEmail } from './utils/adminAuth';
import { BannedDeviceRecord, subscribeDeviceBanStatus } from './services/adminService';

// Common Components
import { BottomNav } from './components/common/BottomNav';
import { DesktopSidebar } from './components/common/DesktopSidebar';
import { UserProfileModal } from './components/common/UserProfileModal';
import { MicSelectionModal } from './components/common/MicSelectionModal';
import { VideoUploadSourceModal } from './components/common/VideoUploadSourceModal';
import { CameraRecorderModal } from './components/common/CameraRecorderModal';
import { PushNotificationBanner } from './components/common/PushNotificationBanner';
import {
  PushNotificationPayload,
  bindNotificationClickListener,
  deliverOsDeviceNotification,
  isCategoryEnabledForUser,
  markAllNotificationsAsRead,
  normalizeNotificationCategory,
  notifyFollowersOfLiveOrRoom,
  registerDeviceForPushNotifications,
  sendPushNotification,
  subscribeGlobalPushAnnouncements,
  subscribeRealTimeNotifications,
} from './services/pushNotificationService';

// Screens
import { SplashScreen } from './components/screens/SplashScreen';
import { AuthScreen } from './components/screens/AuthScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { RoomsScreen } from './components/screens/RoomsScreen';
import { ActiveLiveScreen } from './components/screens/ActiveLiveScreen';
import { AudioRoomScreen } from './components/screens/AudioRoomScreen';
import { MessagesScreen } from './components/screens/MessagesScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { PullToRefresh, PullToRefreshResult } from './components/common/PullToRefresh';
import { VideoFeedScreen } from './components/screens/VideoFeedScreen';

// Lazy-loaded secondary screens & heavy modals to reduce initial Web/Android WebView parse time
const CreateLiveScreen = lazy(() =>
  import('./components/screens/CreateLiveScreen').then((m) => ({ default: m.CreateLiveScreen }))
);
const CreateRoomScreen = lazy(() =>
  import('./components/screens/CreateRoomScreen').then((m) => ({ default: m.CreateRoomScreen }))
);
const RankingsScreen = lazy(() =>
  import('./components/screens/RankingsScreen').then((m) => ({ default: m.RankingsScreen }))
);
const StoreScreen = lazy(() =>
  import('./components/screens/StoreScreen').then((m) => ({ default: m.StoreScreen }))
);
const SettingsScreen = lazy(() =>
  import('./components/screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen }))
);
const UploadVideoScreen = lazy(() =>
  import('./components/screens/UploadVideoScreen').then((m) => ({ default: m.UploadVideoScreen }))
);
const WalletModal = lazy(() =>
  import('./components/screens/WalletModal').then((m) => ({ default: m.WalletModal }))
);
const LevelAndVIPModal = lazy(() =>
  import('./components/screens/LevelAndVIPModal').then((m) => ({ default: m.LevelAndVIPModal }))
);
const AdminProgressionModal = lazy(() =>
  import('./components/screens/AdminProgressionModal').then((m) => ({ default: m.AdminProgressionModal }))
);

// Modals
import { GiftShopModal } from './components/screens/GiftShopModal';
import { PKBattleModal } from './components/screens/PKBattleModal';
import { PKHostInviteModal } from './components/screens/PKHostInviteModal';
import { PKIncomingChallengeModal } from './components/screens/PKIncomingChallengeModal';
import { PKWinnerAnnouncementModal } from './components/screens/PKWinnerAnnouncementModal';
import { VIPModal } from './components/screens/VIPModal';
import type { ProgressionModalTab } from './components/screens/LevelAndVIPModal';
import { LevelUpCelebrationModal } from './components/screens/LevelUpCelebrationModal';
import {
  addQualifyingGiftingCoins,
  equipSuperVipFrame,
  equipVipFrame,
  subscribeUserLevelProgression,
} from './services/levelAndVipService';
import {
  AchievementBadgeDefinition,
  SuperVipTierDefinition,
  VipTierDefinition,
} from './types/levelAndVip';
import { SearchModal } from './components/screens/SearchModal';
import { NotificationsModal } from './components/screens/NotificationsModal';
import { AccountSwitcherModal } from './components/profile/AccountSwitcherModal';
import { SecureAccountPasswordCard } from './components/auth/SecureAccountPasswordCard';

export default function App() {
  // Navigation & Screen State
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('splash');
  const [viewMode, setViewMode] = useState<PlatformViewMode>('responsive');
  const [refreshTick, setRefreshTick] = useState<number>(0);

  // Reset root scroll cleanly whenever navigating between screens
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = 0;
    }
  }, [currentScreen]);

  // Application Data States (live backend + Cloud Firestore)
  const [currentUser, setCurrentUser] = useState<UserProfile>(getInitialUserProfile);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [partyRooms, setPartyRooms] = useState<PartyRoom[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [topBroadcasters, setTopBroadcasters] = useState<BroadcasterRankingEntry[]>([]);
  const endedLiveIdsRef = useRef<Set<string>>(new Set());
  const endedRoomIdsRef = useRef<Set<string>>(new Set());
  const backendLiveIdsRef = useRef<Set<string>>(new Set());
  const backendRoomIdsRef = useRef<Set<string>>(new Set());

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [gifts] = useState<GiftItem[]>(MOCK_GIFTS);

  // Active Broadcast State
  const [activeLiveStream, setActiveLiveStream] = useState<LiveStream | null>(null);
  const [activeAudioRoom, setActiveAudioRoom] = useState<PartyRoom | null>(null);

  // Modals & Sheets Visibility
  const [isMicSelectionOpen, setIsMicSelectionOpen] = useState(false);
  const [isVideoSourceModalOpen, setIsVideoSourceModalOpen] = useState(false);
  const [isCameraRecorderOpen, setIsCameraRecorderOpen] = useState(false);
  const [stagedVideoData, setStagedVideoData] = useState<{
    url: string;
    file: File | Blob | null;
  } | null>(null);
  const [isGiftShopOpen, setIsGiftShopOpen] = useState(false);
  const [giftRecipient, setGiftRecipient] = useState<UserProfile | null>(null);
  const [isPKModalOpen, setIsPKModalOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isVIPOpen, setIsVIPOpen] = useState(false);
  const [isLevelVIPOpen, setIsLevelVIPOpen] = useState(false);
  const [levelVIPInitialTab, setLevelVIPInitialTab] = useState<ProgressionModalTab>('roadmap');
  const [isAdminProgressionOpen, setIsAdminProgressionOpen] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{
    oldLevel: number;
    newLevel: number;
    coinsSpent: number;
    unlockedVipFrames?: VipTierDefinition[];
    unlockedSuperVipFrames?: SuperVipTierDefinition[];
    newlyEarnedAchievements?: AchievementBadgeDefinition[];
  } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);
  const [showSecurePasswordModal, setShowSecurePasswordModal] = useState(false);
  const dismissedPasswordPromptUidsRef = useRef<Set<string>>(new Set());
  const [authScreenMode, setAuthScreenMode] = useState<'login' | 'add_account'>('login');
  const [authPrefillEmail, setAuthPrefillEmail] = useState<string | undefined>(undefined);
  const [viewingProfileUser, setViewingProfileUser] = useState<UserProfile | null>(null);
  const [navigatingProfileUser, setNavigatingProfileUser] = useState<UserProfile | null>(null);
  const [activeChatUser, setActiveChatUser] = useState<UserProfile | null>(null);

  // Reels Pagination & Merged Feed State
  const [firestoreReels, setFirestoreReels] = useState<VideoItem[]>([]);
  const [legacyPostVideos, setLegacyPostVideos] = useState<VideoItem[]>([]);
  const [extraPagedReels, setExtraPagedReels] = useState<VideoItem[]>([]);
  const [reelsLastDoc, setReelsLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreReels, setHasMoreReels] = useState(false);
  const [isLoadingMoreReels, setIsLoadingMoreReels] = useState(false);
  const previousAuthUidRef = useRef<string | null>(auth.currentUser?.uid || null);

  // User Blocking & Party Room Kick Moderation State (Real-time Firestore + Backend Sync)
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserRecord[]>([]);
  const [blockedByUserIds, setBlockedByUserIds] = useState<string[]>([]);
  const [activeRoomKicks, setActiveRoomKicks] = useState<RoomKickRecord[]>([]);
  const [appToast, setAppToast] = useState<string | null>(null);
  const appToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const walletSettingsRef = useRef(DEFAULT_WALLET_SETTINGS);

  // Universal Push Notifications State (Web Push VAPID + Android Local + WebSocket + Firestore)
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activePushBanner, setActivePushBanner] = useState<PushNotificationPayload | null>(null);
  const notifSettingsRef = useRef<{
    masterEnabled: boolean;
    prefs: NotificationPreferences;
  }>({
    masterEnabled: true,
    prefs: DEFAULT_NOTIFICATION_PREFERENCES,
  });
  const seenPushBannerIdsRef = useRef<Set<string>>(new Set());
  const liveStreamsRef = useRef<LiveStream[]>([]);
  const partyRoomsRef = useRef<PartyRoom[]>([]);
  liveStreamsRef.current = liveStreams;
  partyRoomsRef.current = partyRooms;

  const showAppToast = (msg: string) => {
    setAppToast(msg);
    if (appToastTimerRef.current) clearTimeout(appToastTimerRef.current);
    appToastTimerRef.current = setTimeout(() => setAppToast(null), 3200);
  };

  const blockedUserIds = blockedUsers.map((b) => b.blockedUserId);
  const isBlockedByMe = (userId?: string | null) =>
    Boolean(userId && blockedUserIds.includes(userId));
  const isBlockedByTarget = (userId?: string | null) =>
    Boolean(userId && blockedByUserIds.includes(userId));
  const isBlockedRelationship = (userId?: string | null) =>
    isBlockedByMe(userId) || isBlockedByTarget(userId);

  const [myModerators, setMyModerators] = useState<HostModeratorRecord[]>([]);
  const [activeDeviceBan, setActiveDeviceBan] = useState<BannedDeviceRecord | null>(null);
  const currentDeviceId = getOrCreateDeviceId();
  const isAuthorizedAdmin = isAuthorizedAdminEmail(auth.currentUser?.email || currentUser?.email);

  const [authenticatedUid, setAuthenticatedUid] = useState<string | null>(auth.currentUser?.uid || null);

  // Subscribe to current user's blocked list, users who blocked current user, active party room kicks & lifetime moderators
  useEffect(() => {
    const uid = authenticatedUid;
    if (!uid) {
      setBlockedUsers([]);
      setBlockedByUserIds([]);
      setActiveRoomKicks([]);
      setMyModerators([]);
      return;
    }

    const unsubByMe = subscribeBlockedByMe(uid, (records) => {
      setBlockedUsers(records);
    });
    const unsubBlockedMe = subscribeBlockedMe(uid, (ids) => {
      setBlockedByUserIds(ids);
    });
    const unsubRoomKicks = subscribeMyActiveRoomKicks(uid, (kicks) => {
      setActiveRoomKicks(kicks);
    });
    const unsubMyMods = subscribeHostModerators(uid, (mods) => {
      setMyModerators(mods);
    });

    // Also react immediately to real-time WebSocket block/unblock push events
    const unsubWsBlocks = liveAndRoomService.addEventListener((event, payload) => {
      if (event === 'user:blocked_by' && payload?.blockerId) {
        setBlockedByUserIds((prev) =>
          prev.includes(payload.blockerId) ? prev : [...prev, payload.blockerId]
        );
      } else if (event === 'user:unblocked_by' && payload?.blockerId) {
        setBlockedByUserIds((prev) => prev.filter((id) => id !== payload.blockerId));
      }
    });

    return () => {
      unsubByMe();
      unsubBlockedMe();
      unsubRoomKicks();
      unsubMyMods();
      unsubWsBlocks();
    };
  }, [authenticatedUid]);

  // Universal Deep-Link Action Handler when user taps a Push Banner, Notification Center item, or OS Push
  const handleNotificationDeepAction = useCallback(
    (payload: {
      actionType?: NotificationActionType;
      targetId?: string;
      senderId?: string;
      type?: NotificationCategory;
    }) => {
      setIsNotificationsOpen(false);
      setActivePushBanner(null);

      const action = payload.actionType;
      const targetId = payload.targetId || '';
      const senderId = payload.senderId || '';

      if (action === 'open_chat' || (!action && payload.type === 'messages')) {
        setActiveLiveStream(null);
        setActiveAudioRoom(null);
        setCurrentScreen('messages');
        if (senderId && senderId !== currentUser.id) {
          profileService.getUserProfile(senderId).then((u) => {
            if (u) setActiveChatUser(u);
          }).catch(() => {});
        }
        return;
      }

      if (action === 'open_live') {
        const match = liveStreamsRef.current.find(
          (s) => s.id === targetId || (senderId && s.host.id === senderId)
        );
        if (match) {
          setActiveAudioRoom(null);
          setActiveLiveStream(match);
          setCurrentScreen('live_active');
        } else {
          setCurrentScreen('home');
        }
        return;
      }

      if (action === 'open_room') {
        const match = partyRoomsRef.current.find(
          (r) => r.id === targetId || (senderId && r.host.id === senderId)
        );
        if (match) {
          setActiveLiveStream(null);
          setActiveAudioRoom(match);
          setCurrentScreen('audio_room');
        } else {
          setCurrentScreen('rooms');
        }
        return;
      }

      if (action === 'open_wallet' || (!action && payload.type === 'wallet')) {
        setIsWalletOpen(true);
        return;
      }

      if (action === 'open_store') {
        setActiveLiveStream(null);
        setActiveAudioRoom(null);
        setCurrentScreen('store');
        return;
      }

      if (action === 'open_reels') {
        setActiveLiveStream(null);
        setActiveAudioRoom(null);
        setCurrentScreen('videos');
        return;
      }

      if (action === 'open_agency') {
        setActiveLiveStream(null);
        setActiveAudioRoom(null);
        setNavigatingProfileUser(null);
        setCurrentScreen('profile');
        return;
      }

      if (action === 'open_pk' || (!action && payload.type === 'pk')) {
        setIsPKModalOpen(true);
        return;
      }

      if (action === 'open_admin') {
        if (isAuthorizedAdmin) {
          setIsAdminProgressionOpen(true);
        } else {
          setIsNotificationsOpen(true);
        }
        return;
      }

      if (action === 'open_profile') {
        const lookupId = targetId || senderId;
        if (lookupId && lookupId !== currentUser.id) {
          profileService.getUserProfile(lookupId).then((u) => {
            if (u) {
              setActiveLiveStream(null);
              setActiveAudioRoom(null);
              setNavigatingProfileUser(u);
              setCurrentScreen('profile');
            }
          }).catch(() => {});
        } else {
          setActiveLiveStream(null);
          setActiveAudioRoom(null);
          setNavigatingProfileUser(null);
          setCurrentScreen('profile');
        }
        return;
      }

      if (action === 'open_notifications') {
        setIsNotificationsOpen(true);
        return;
      }

      setIsNotificationsOpen(true);
    },
    [currentUser.id, isAuthorizedAdmin]
  );

  // Unified Incoming Push Presenter (deduplicates Firestore + WebSocket + Broadcast + triggers OS alert & banner)
  const presentIncomingPush = useCallback((payload: PushNotificationPayload) => {
    if (!payload?.id || !payload.title) return;
    if (seenPushBannerIdsRef.current.has(payload.id)) return;
    seenPushBannerIdsRef.current.add(payload.id);
    if (seenPushBannerIdsRef.current.size > 200) {
      const oldest = seenPushBannerIdsRef.current.values().next().value;
      if (oldest) seenPushBannerIdsRef.current.delete(oldest);
    }

    const { masterEnabled, prefs } = notifSettingsRef.current;
    if (!isCategoryEnabledForUser(payload.type, masterEnabled, prefs)) {
      return;
    }

    setActivePushBanner(payload);
    void deliverOsDeviceNotification(payload, prefs);
  }, []);

  // Real-Time Push Notification Subscriptions (Firestore + Settings + WebSocket + Global Broadcasts + Device Push)
  useEffect(() => {
    const uid = authenticatedUid;
    if (!uid) {
      setNotifications([]);
      return;
    }

    // Keep user's push notification category preferences synced in real time
    const unsubSettings = subscribeUserSettings(uid, (settings) => {
      notifSettingsRef.current = {
        masterEnabled: settings.notificationsEnabled !== false,
        prefs: settings.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES,
      };
    });

    // Silently register Web Push / Android channel if permission was already granted
    void registerDeviceForPushNotifications({ requestPermission: false }).catch(() => {});

    // 1. Live Firestore Notification Center subscription
    const unsubNotifs = subscribeRealTimeNotifications(uid, (items, newlyAdded) => {
      setNotifications(items);
      if (newlyAdded.length > 0) {
        const newest = newlyAdded[0];
        presentIncomingPush({
          id: newest.id,
          type: normalizeNotificationCategory(newest.type),
          title: newest.title,
          message: newest.message,
          avatar: newest.avatar,
          senderId: newest.senderId,
          senderName: newest.senderName,
          actionType: newest.actionType,
          targetId: newest.targetId,
          actionUrl: newest.actionUrl,
          priority: newest.priority || 'normal',
          createdAtMs: newest.createdAtMs || Date.now(),
        });
      }
    });

    // 2. Live Admin Global Push Announcements (Firestore)
    const unsubGlobal = subscribeGlobalPushAnnouncements((announcement) => {
      presentIncomingPush(announcement);
    });

    // 3. Real-Time Backend WebSocket Push Events
    const unsubWsPush = liveAndRoomService.addEventListener((event, payload) => {
      if ((event === 'push:notification' || event === 'push:broadcast') && payload) {
        presentIncomingPush({
          id: String(payload.id || `ws_${Date.now()}`),
          type: normalizeNotificationCategory(payload.type || payload.category || 'system'),
          title: String(payload.title || 'Lenzo Party Live'),
          message: String(payload.message || ''),
          avatar: typeof payload.avatar === 'string' ? payload.avatar : undefined,
          senderId: typeof payload.senderId === 'string' ? payload.senderId : undefined,
          senderName: typeof payload.senderName === 'string' ? payload.senderName : undefined,
          actionType: payload.actionType as NotificationActionType | undefined,
          targetId: typeof payload.targetId === 'string' ? payload.targetId : undefined,
          actionUrl: typeof payload.actionUrl === 'string' ? payload.actionUrl : undefined,
          priority:
            payload.priority === 'urgent' || payload.priority === 'high'
              ? payload.priority
              : 'normal',
          createdAtMs: Number(payload.createdAtMs || Date.now()),
        });
      }
    });

    return () => {
      unsubSettings();
      unsubNotifs();
      unsubGlobal();
      unsubWsPush();
    };
  }, [authenticatedUid, presentIncomingPush]);

  // Listen for OS Push Notification Taps (Service Worker postMessage + Native Android LocalNotifications + URL params)
  useEffect(() => {
    const unbind = bindNotificationClickListener((payload) => {
      handleNotificationDeepAction(payload);
    });

    if (typeof window !== 'undefined' && window.location.search) {
      try {
        const params = new URLSearchParams(window.location.search);
        const pushAction = params.get('pushAction') as NotificationActionType | null;
        if (pushAction) {
          handleNotificationDeepAction({
            actionType: pushAction,
            targetId: params.get('targetId') || undefined,
            senderId: params.get('senderId') || undefined,
          });
          params.delete('pushAction');
          params.delete('targetId');
          params.delete('senderId');
          const cleanSearch = params.toString();
          window.history.replaceState(
            {},
            '',
            `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}`
          );
        }
      } catch {
        // ignore URL parse error
      }
    }

    return () => unbind();
  }, [handleNotificationDeepAction]);

  // Real-time ejection if the host of an active live stream or party room blocks the current user
  useEffect(() => {
    if (
      activeLiveStream &&
      activeLiveStream.host.id !== currentUser.id &&
      blockedByUserIds.includes(activeLiveStream.host.id)
    ) {
      setActiveLiveStream(null);
      setActivePKSession(null);
      setCurrentScreen('home');
      showAppToast('You can no longer view or interact with this live stream.');
    }
  }, [activeLiveStream, blockedByUserIds, currentUser.id]);

  useEffect(() => {
    if (
      activeAudioRoom &&
      activeAudioRoom.host.id !== currentUser.id &&
      blockedByUserIds.includes(activeAudioRoom.host.id)
    ) {
      setActiveAudioRoom(null);
      setCurrentScreen('rooms');
      showAppToast('You have been blocked by this host and cannot access their party room.');
    }
  }, [activeAudioRoom, blockedByUserIds, currentUser.id]);

  // Real-time ejection if the host kicks the current user from an active party room
  useEffect(() => {
    if (!activeAudioRoom || activeAudioRoom.host.id === currentUser.id) return;
    const activeKick = getActiveKickForRoom(
      activeRoomKicks,
      activeAudioRoom.id,
      activeAudioRoom.host.id
    );
    if (activeKick) {
      setActiveAudioRoom(null);
      setCurrentScreen('rooms');
      showAppToast(
        activeKick.durationType === 'session'
          ? 'You were kicked from this party stream and cannot re-enter this session.'
          : `You were kicked from this party room (${formatRemainingKickTime(activeKick)}).`
      );
    }
  }, [activeAudioRoom, activeRoomKicks, currentUser.id]);

  const handleBlockUser = async (target: UserProfile) => {
    if (!target?.id || target.id === currentUser.id) return;
    const res = await blockUser({
      blockerId: currentUser.id,
      targetUser: target,
    });
    if (res.record) {
      const record = res.record;
      setBlockedUsers((prev) => [
        record,
        ...prev.filter((item) => item.blockedUserId !== target.id),
      ]);
    }
    // Clear follow flags locally when blocking
    setViewingProfileUser((prev) =>
      prev && prev.id === target.id ? { ...prev, isFollowing: false } : prev
    );
    setNavigatingProfileUser((prev) =>
      prev && prev.id === target.id ? { ...prev, isFollowing: false } : prev
    );
    setLiveStreams((prev) =>
      prev.map((s) =>
        s.host.id === target.id ? { ...s, host: { ...s.host, isFollowing: false } } : s
      )
    );
    showAppToast(`Blocked ${target.name}. They can no longer interact with your streams, rooms, or messages.`);
  };

  const handleUnblockUser = async (targetUserId: string, targetName?: string) => {
    if (!targetUserId) return;
    await unblockUser({
      blockerId: currentUser.id,
      targetUserId,
    });
    setBlockedUsers((prev) => prev.filter((item) => item.blockedUserId !== targetUserId));
    showAppToast(`Unblocked ${targetName || 'user'}.`);
  };

  const handleRemoveModerator = async (moderatorUserId: string, moderatorName?: string) => {
    if (!moderatorUserId || !currentUser?.id) return;
    const res = await removeHostModerator({
      hostId: currentUser.id,
      moderatorUserId,
    });
    if (res.success) {
      setMyModerators((prev) => prev.filter((m) => m.moderatorUserId !== moderatorUserId));
      showAppToast(`Removed ${moderatorName || 'user'} from your Moderators.`);
    }
  };

  // PK Battle Real-Time States
  const [isPKInviteModalOpen, setIsPKInviteModalOpen] = useState(false);
  const [activePKSession, setActivePKSession] = useState<PKMatchSession | null>(null);
  const [incomingPKInvite, setIncomingPKInvite] = useState<PKMatchInvitation | null>(null);
  const [pkWinnerSession, setPkWinnerSession] = useState<PKMatchSession | null>(null);

  // Active Live Gift Animation Overlay
  const [activeGiftCelebration, setActiveGiftCelebration] = useState<{
    gift: GiftItem;
    sender: string;
    recipient: string;
    quantity: number;
  } | null>(null);

  // Deep-linking URL parameter & Android App Link listener (/u/:username, ?u=, ?user=)
  useEffect(() => {
    const handleDeepLinkUrl = (rawUrl: string) => {
      try {
        const parsed = new URL(rawUrl, 'https://lenzoparty.com');
        const pathMatch = parsed.pathname.match(/^\/u\/([^/?#]+)/i);
        const usernameParam = parsed.searchParams.get('u') || (pathMatch ? decodeURIComponent(pathMatch[1]) : null);
        const userParam = parsed.searchParams.get('profile') || parsed.searchParams.get('user');

        if (usernameParam || userParam) {
          const cleanUsername = usernameParam ? `@${usernameParam.replace(/^@/, '')}`.toLowerCase() : null;
          const isSelf =
            (cleanUsername && currentUser.username?.toLowerCase() === cleanUsername) ||
            (userParam && (currentUser.id === userParam || currentUser.displayId === userParam));

          if (isSelf) {
            setNavigatingProfileUser(null);
            setCurrentScreen('profile');
          } else {
            profileService.getUserProfile(userParam || usernameParam!).then((p) => {
              if (p) {
                setNavigatingProfileUser(p);
                setCurrentScreen('profile');
              }
            });
          }
        }
      } catch (e) {
        console.warn('Deep link error:', e);
      }
    };

    if (typeof window !== 'undefined' && (window.location.search || window.location.pathname.startsWith('/u/'))) {
      handleDeepLinkUrl(window.location.href);
    }

    const unregisterUrl = androidBridge.registerUrlOpenHandler(handleDeepLinkUrl);
    return () => unregisterUrl();
  }, []);

  // Real-time PK Event Subscriptions & Sync
  useEffect(() => {
    pkService.setCurrentUser(currentUser.id);

    const unsubscribe = pkService.addEventListener((event, payload) => {
      if (event === 'pk:invite_received' && payload) {
        setIncomingPKInvite(payload);
      } else if (event === 'pk:match_started' && payload?.session) {
        setActivePKSession(payload.session);
        setIsPKInviteModalOpen(false);
        setIsPKModalOpen(false);
        setIncomingPKInvite(null);
        setCurrentScreen('live_active');
      } else if (event === 'pk:match_ended' && payload?.session) {
        setPkWinnerSession(payload.session);
        setActivePKSession(null);
        if (payload.session.winnerId) {
          const isWinner = payload.session.winnerId === currentUser.id;
          const isDraw = payload.session.winnerId === 'draw';
          const opponent = payload.session.host1.user.id === currentUser.id ? payload.session.host2.user : payload.session.host1.user;
          const myHost = payload.session.host1.user.id === currentUser.id ? payload.session.host1 : payload.session.host2;
          const opponentHost = payload.session.host1.user.id === currentUser.id ? payload.session.host2 : payload.session.host1;

          pkService.saveMatchHistoryLocally(currentUser.id, {
            id: `hist_${Date.now()}`,
            matchId: payload.session.id,
            date: 'Just now',
            durationSeconds: 300,
            opponent: {
              id: opponent.id,
              name: opponent.name,
              username: opponent.username || '@' + opponent.name.toLowerCase().replace(/\s+/g, ''),
              avatar: opponent.avatar,
              level: opponent.level || 1
            },
            myScore: myHost.score,
            opponentScore: opponentHost.score,
            result: isWinner ? 'win' : isDraw ? 'draw' : 'loss',
            giftsReceived: myHost.giftsReceivedCount,
            likesReceived: myHost.likes,
            coinsEarned: myHost.giftsCoinValue
          });
        }
      } else if (event === 'pk:match_cancelled' && payload?.session) {
        setPkWinnerSession(payload.session);
        setActivePKSession(null);
      } else if (event === 'pk:sync_state' && payload?.session) {
        setActivePKSession(payload.session);
      }
    });

    return () => unsubscribe();
  }, [currentUser.id]);

  const handleAcceptPKInvite = async (invite: PKMatchInvitation) => {
    try {
      const res = await pkService.respondPKInvite(invite.id, true, currentUser.id);
      if (res.session) {
        setActivePKSession(res.session);
        setIncomingPKInvite(null);
        setCurrentScreen('live_active');
      }
    } catch (e) {
      console.error('Error accepting PK invite:', e);
    }
  };

  const handleDeclinePKInvite = async (invite: PKMatchInvitation) => {
    try {
      await pkService.respondPKInvite(invite.id, false, currentUser.id);
      setIncomingPKInvite(null);
    } catch (e) {
      setIncomingPKInvite(null);
    }
  };

  const handleForfeitPK = async () => {
    if (!activePKSession) return;
    try {
      await pkService.forfeitMatch(activePKSession.id, currentUser.id);
    } catch (e) {
      console.error('Error forfeiting PK match:', e);
    }
  };

  const handleOpenPKFromNav = () => {
    if (activeLiveStream) {
      // Only the actual host who started this live stream can initiate a PK invitation
      if (currentUser.id === activeLiveStream.host.id) {
        setIsPKInviteModalOpen(true);
        setCurrentScreen('live_active');
      } else {
        // Ordinary viewer cannot send PK invitations on behalf of host
        console.warn('Only the live broadcast host can initiate a PK battle.');
      }
    } else {
      // If user has their own live stream, open it; otherwise navigate to Create Live
      const myStream = liveStreams.find((s) => s.host.id === currentUser.id);
      if (myStream) {
        setActiveLiveStream(myStream);
        setIsPKInviteModalOpen(true);
        setCurrentScreen('live_active');
      } else {
        setCurrentScreen('create_live');
      }
    }
  };

  // Android Native Lifecycle & Hardware Back Button Integration
  useEffect(() => {
    androidBridge.initAndroidIntegration(() => {
      console.log('[Android] Application exit requested');
    });

    const unregisterBack = androidBridge.registerBackHandler(() => {
      // 1. Close open sheets & modals first
      if (showSecurePasswordModal) {
        if (authenticatedUid) dismissedPasswordPromptUidsRef.current.add(authenticatedUid);
        setShowSecurePasswordModal(false);
        return true;
      }
      if (levelUpData) { setLevelUpData(null); return true; }
      if (pkWinnerSession) { setPkWinnerSession(null); return true; }
      if (isGiftShopOpen) { setIsGiftShopOpen(false); return true; }
      if (isWalletOpen) { setIsWalletOpen(false); return true; }
      if (isLevelVIPOpen) { setIsLevelVIPOpen(false); return true; }
      if (isVIPOpen) { setIsVIPOpen(false); return true; }
      if (isSearchOpen) { setIsSearchOpen(false); return true; }
      if (isNotificationsOpen) { setIsNotificationsOpen(false); return true; }
      if (isPKModalOpen) { setIsPKModalOpen(false); return true; }
      if (isPKInviteModalOpen) { setIsPKInviteModalOpen(false); return true; }
      if (isMicSelectionOpen) { setIsMicSelectionOpen(false); return true; }
      if (isVideoSourceModalOpen) { setIsVideoSourceModalOpen(false); return true; }
      if (isCameraRecorderOpen) { setIsCameraRecorderOpen(false); return true; }
      if (viewingProfileUser) { setViewingProfileUser(null); return true; }
      if (activeChatUser) { setActiveChatUser(null); return true; }

      // 2. Return from active broadcast to list
      if (currentScreen === 'live_active') {
        setActiveLiveStream(null);
        setCurrentScreen('home');
        return true;
      }
      if (currentScreen === 'audio_room') {
        setActiveAudioRoom(null);
        setCurrentScreen('rooms');
        return true;
      }

      // 3. Navigate back to Home from child screens
      if ([
        'profile',
        'settings',
        'upload_video',
        'create_live',
        'create_room',
        'rankings',
        'messages',
        'chat',
        'inbox',
        'videos',
        'rooms',
        'party',
        'store',
      ].includes(currentScreen)) {
        setCurrentScreen('home');
        return true;
      }

      return false;
    });

    return () => unregisterBack();
  }, [
    showSecurePasswordModal, authenticatedUid, levelUpData, pkWinnerSession, isGiftShopOpen, isWalletOpen, isLevelVIPOpen, isVIPOpen,
    isSearchOpen, isNotificationsOpen, isPKModalOpen, isPKInviteModalOpen, isMicSelectionOpen,
    isVideoSourceModalOpen, isCameraRecorderOpen, viewingProfileUser, activeChatUser, currentScreen
  ]);

  const maybePromptGooglePasswordLink = useCallback(
    (firebaseUser: typeof auth.currentUser, profile?: UserProfile | null) => {
      if (
        firebaseUser &&
        !dismissedPasswordPromptUidsRef.current.has(firebaseUser.uid) &&
        needsGooglePasswordRegistration(firebaseUser, profile)
      ) {
        setShowSecurePasswordModal(true);
      } else {
        setShowSecurePasswordModal(false);
      }
    },
    []
  );

  // Firebase Persistent Authentication Session Listener & Strict Multi-Account State Isolation
  const resetUserScopedTransientState = () => {
    setShowSecurePasswordModal(false);
    setBlockedUsers([]);
    setBlockedByUserIds([]);
    setConversations([]);
    setActiveLiveStream(null);
    setActiveAudioRoom(null);
    setActivePKSession(null);
    setIncomingPKInvite(null);
    setPkWinnerSession(null);
    setViewingProfileUser(null);
    setNavigatingProfileUser(null);
    setActiveChatUser(null);
    setLevelUpData(null);
    setExtraPagedReels([]);
    setReelsLastDoc(null);
    setHasMoreReels(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const nextUid = firebaseUser ? firebaseUser.uid : null;
      if (previousAuthUidRef.current !== nextUid) {
        // Strict isolation: clear all transient state from the previous UID before attaching the next UID
        resetUserScopedTransientState();
        previousAuthUidRef.current = nextUid;
      }

      setAuthenticatedUid(nextUid);
      if (firebaseUser) {
        liveAndRoomService.setCurrentUser(firebaseUser.uid);
        setAuthScreenMode('login');
        setAuthPrefillEmail(undefined);
        setCurrentScreen((prev) => (prev === 'auth' ? 'home' : prev));
        try {
          const profile = await fetchCurrentFirestoreProfile(firebaseUser.uid);
          if (profile) {
            setCurrentUser(profile);
            saveStoredUserProfile(profile);
            const isGoogleProvider = firebaseUser.providerData.some((p) => p.providerId === 'google.com');
            rememberAuthenticatedAccount(profile, isGoogleProvider ? 'google' : 'password');
            liveAndRoomService.syncUser(profile);
            maybePromptGooglePasswordLink(firebaseUser, profile);
          } else {
            maybePromptGooglePasswordLink(firebaseUser, null);
          }
        } catch (e) {
          console.warn('[Firebase Auth] Profile sync notice:', e);
        }
      } else {
        setShowSecurePasswordModal(false);
        liveAndRoomService.setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, [maybePromptGooglePasswordLink]);

  // Real-Time Backend Discovery & WebSocket Broadcast Sync
  useEffect(() => {
    let active = true;
    const dedupeLiveStreamsByHost = (items: LiveStream[]): LiveStream[] => {
      const sorted = [...items]
        .filter((s) => s?.id && !endedLiveIdsRef.current.has(s.id) && s.isLive !== false)
        .sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
      const byHost = new Map<string, LiveStream>();
      for (const s of sorted) {
        const hostKey = s.host?.id || s.id;
        if (!byHost.has(hostKey)) {
          byHost.set(hostKey, s);
        }
      }
      return Array.from(byHost.values()).sort(
        (a, b) => (b.numericViewers || 0) - (a.numericViewers || 0) || (b.startTime || 0) - (a.startTime || 0)
      );
    };

    const upsertStream = (incoming: LiveStream) => {
      if (!incoming?.id || endedLiveIdsRef.current.has(incoming.id)) return;
      backendLiveIdsRef.current.add(incoming.id);
      setLiveStreams((prev) => {
        const merged = prev.some((s) => s.id === incoming.id)
          ? prev.map((s) => (s.id === incoming.id ? { ...s, ...incoming } : s))
          : [incoming, ...prev];
        return dedupeLiveStreamsByHost(merged);
      });
      setActiveLiveStream((prev) => (prev && prev.id === incoming.id ? { ...prev, ...incoming } : prev));
    };

    const upsertRoom = (rawIncoming: PartyRoom) => {
      if (!rawIncoming?.id || endedRoomIdsRef.current.has(rawIncoming.id)) return;
      const incoming = enforcePartyRoomSeatPolicy(rawIncoming);
      backendRoomIdsRef.current.add(incoming.id);
      setPartyRooms((prev) => {
        const exists = prev.some((r) => r.id === incoming.id);
        if (exists) {
          return prev.map((r) => (r.id === incoming.id ? enforcePartyRoomSeatPolicy({ ...r, ...incoming }) : r));
        }
        return [incoming, ...prev];
      });
      setActiveAudioRoom((prev) =>
        prev && prev.id === incoming.id ? enforcePartyRoomSeatPolicy({ ...prev, ...incoming }) : prev
      );
    };

    const loadRealtimeBackendState = async () => {
      const [streams, rooms, rankings] = await Promise.all([
        liveAndRoomService.fetchActiveStreams(),
        liveAndRoomService.fetchActiveRooms(),
        liveAndRoomService.fetchTopBroadcasters(),
      ]);
      if (!active) return;

      backendLiveIdsRef.current = new Set(streams.map((s) => s.id));
      backendRoomIdsRef.current = new Set(rooms.map((r) => r.id));

      setLiveStreams((prev) => {
        const mergedMap = new Map<string, LiveStream>();
        prev.forEach((s) => {
          if (!endedLiveIdsRef.current.has(s.id)) mergedMap.set(s.id, s);
        });
        streams.forEach((s) => {
          if (!endedLiveIdsRef.current.has(s.id)) mergedMap.set(s.id, s);
        });
        return dedupeLiveStreamsByHost(Array.from(mergedMap.values()));
      });

      setPartyRooms((prev) => {
        const mergedMap = new Map<string, PartyRoom>();
        prev.forEach((r) => {
          if (!endedRoomIdsRef.current.has(r.id)) mergedMap.set(r.id, enforcePartyRoomSeatPolicy(r));
        });
        rooms.forEach((r) => {
          if (!endedRoomIdsRef.current.has(r.id)) mergedMap.set(r.id, enforcePartyRoomSeatPolicy(r));
        });
        return Array.from(mergedMap.values()).sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
      });

      setTopBroadcasters(rankings.broadcasters);
    };

    loadRealtimeBackendState();

    const unsubRealtime = liveAndRoomService.addEventListener((event, payload) => {
      if (event === 'live:directory_updated' && payload) {
        if (payload.action === 'ended' && payload.streamId) {
          endedLiveIdsRef.current.add(payload.streamId);
          backendLiveIdsRef.current.delete(payload.streamId);
          setLiveStreams((prev) => prev.filter((s) => s.id !== payload.streamId));
          setActiveLiveStream((prev) => {
            if (prev && prev.id === payload.streamId) {
              setActivePKSession(null);
              setCurrentScreen('home');
              return null;
            }
            return prev;
          });
          liveAndRoomService.fetchTopBroadcasters().then((res) => {
            if (active) setTopBroadcasters(res.broadcasters);
          });
        } else if (payload.stream) {
          endedLiveIdsRef.current.delete(payload.stream.id);
          upsertStream(payload.stream as LiveStream);
          if (payload.action === 'started') {
            liveAndRoomService.fetchTopBroadcasters().then((res) => {
              if (active) setTopBroadcasters(res.broadcasters);
            });
          }
        }
      } else if (event === 'live:ended' && payload?.streamId) {
        endedLiveIdsRef.current.add(payload.streamId);
        backendLiveIdsRef.current.delete(payload.streamId);
        setLiveStreams((prev) => prev.filter((s) => s.id !== payload.streamId));
        setActiveLiveStream((prev) => {
          if (prev && prev.id === payload.streamId) {
            setActivePKSession(null);
            setCurrentScreen('home');
            return null;
          }
          return prev;
        });
        liveAndRoomService.fetchTopBroadcasters().then((res) => {
          if (active) setTopBroadcasters(res.broadcasters);
        });
      } else if (
        (event === 'live:empty_countdown_started' || event === 'live:reactivated' || event === 'live:host_left') &&
        payload?.stream
      ) {
        upsertStream(payload.stream as LiveStream);
      } else if (
        (event === 'live:viewer_count_updated' || event === 'live:viewer_joined' || event === 'live:viewer_left') &&
        payload?.streamId
      ) {
        if (payload.stream) {
          upsertStream(payload.stream as LiveStream);
        } else {
          setLiveStreams((prev) =>
            prev.map((s) =>
              s.id === payload.streamId
                ? {
                    ...s,
                    numericViewers: payload.numericViewers ?? s.numericViewers,
                    viewerCount: payload.viewerCount ?? String(payload.numericViewers ?? s.numericViewers),
                  }
                : s
            )
          );
        }
      } else if ((event === 'live:like' || event === 'live:heart') && payload?.streamId) {
        setLiveStreams((prev) =>
          prev.map((s) =>
            s.id === payload.streamId && typeof payload.likesCount === 'number'
              ? { ...s, likesCount: payload.likesCount }
              : s
          )
        );
      } else if (event === 'room:directory_updated' && payload) {
        if (payload.action === 'ended' && payload.roomId) {
          endedRoomIdsRef.current.add(payload.roomId);
          backendRoomIdsRef.current.delete(payload.roomId);
          setPartyRooms((prev) => prev.filter((r) => r.id !== payload.roomId));
          setActiveAudioRoom((prev) => {
            if (prev && prev.id === payload.roomId) {
              setCurrentScreen('rooms');
              return null;
            }
            return prev;
          });
        } else if (payload.room) {
          endedRoomIdsRef.current.delete(payload.room.id);
          upsertRoom(payload.room as PartyRoom);
        }
      } else if (event === 'room:closed' && payload?.roomId) {
        endedRoomIdsRef.current.add(payload.roomId);
        backendRoomIdsRef.current.delete(payload.roomId);
        setPartyRooms((prev) => prev.filter((r) => r.id !== payload.roomId));
        setActiveAudioRoom((prev) => {
          if (prev && prev.id === payload.roomId) {
            setCurrentScreen('rooms');
            return null;
          }
          return prev;
        });
      } else if (
        (event === 'room:updated' ||
          event === 'room:state_updated' ||
          event === 'room:participant_joined' ||
          event === 'room:participant_left' ||
          event === 'room:seat_occupied' ||
          event === 'room:seat_vacated' ||
          event === 'room:empty_countdown_started' ||
          event === 'room:reactivated') &&
        payload?.room
      ) {
        upsertRoom(payload.room as PartyRoom);
      } else if (event === 'room:seat_muted' && payload?.roomId && Array.isArray(payload.mutedSeatIndices)) {
        setPartyRooms((prev) =>
          prev.map((r) =>
            r.id === payload.roomId ? { ...r, mutedSeatIndices: payload.mutedSeatIndices } : r
          )
        );
        setActiveAudioRoom((prev) =>
          prev && prev.id === payload.roomId
            ? { ...prev, mutedSeatIndices: payload.mutedSeatIndices }
            : prev
        );
      }
    });

    // Lightweight client safety sweep: immediately hide cards whose 5-minute empty countdown has elapsed
    const expirySweep = setInterval(() => {
      const now = Date.now();
      setPartyRooms((prev) => {
        const filtered = prev.filter((r) => {
          if (r.status === 'closed') return false;
          if (r.status === 'empty' && typeof r.closesAt === 'number' && r.closesAt <= now) {
            endedRoomIdsRef.current.add(r.id);
            backendRoomIdsRef.current.delete(r.id);
            return false;
          }
          return true;
        });
        return filtered.length === prev.length ? prev : filtered;
      });
      setLiveStreams((prev) => {
        const filtered = prev.filter((s) => {
          if (s.status === 'closed' || s.isLive === false) return false;
          if (s.status === 'empty' && typeof s.closesAt === 'number' && s.closesAt <= now) {
            endedLiveIdsRef.current.add(s.id);
            backendLiveIdsRef.current.delete(s.id);
            return false;
          }
          return true;
        });
        return filtered.length === prev.length ? prev : filtered;
      });
    }, 3000);

    return () => {
      active = false;
      clearInterval(expirySweep);
      unsubRealtime();
    };
  }, [refreshTick]);

  // Real-time Cloud Firestore Subscriptions for User Profile, Wallet, Earnings, Level, Live Streams, Rooms & Videos
  // Attached only when user is authenticated (conforming to Firebase security guidelines)
  useEffect(() => {
    if (!authenticatedUid) return;

    const unsubUserDoc = onSnapshot(
      doc(db, 'users', authenticatedUid),
      (snap) => {
        if (snap.exists()) {
          const mapped = mapFirestoreUserToProfile(snap.data() as FirestoreUserData, auth.currentUser);
          setCurrentUser((prev) => {
            const merged = {
              ...prev,
              ...mapped,
              isAdmin: isAuthorizedAdminEmail(auth.currentUser?.email || mapped.email),
            };
            saveStoredUserProfile(merged);
            return merged;
          });
        }
      },
      (err) => {
        console.warn('[Firestore] User profile listener notice:', err);
      }
    );

    const unsubDeviceBan = subscribeDeviceBanStatus(currentDeviceId, (banRecord) => {
      setActiveDeviceBan(banRecord);
    });

    const unsubWallet = subscribeUserWallet(authenticatedUid, (wallet) => {
      setCurrentUser((prev) => {
        if (prev.coins === wallet.walletPurchasedCoins) return prev;
        const next = { ...prev, coins: wallet.walletPurchasedCoins };
        saveStoredUserProfile(next);
        return next;
      });
    });

    const unsubEarnings = subscribeUserEarnings(authenticatedUid, (earnings) => {
      setCurrentUser((prev) => {
        if (prev.diamonds === earnings.availableEarningsCoins) return prev;
        const next = { ...prev, diamonds: earnings.availableEarningsCoins };
        saveStoredUserProfile(next);
        return next;
      });
    });

    const unsubWalletSettings = subscribeWalletSettings((s) => {
      walletSettingsRef.current = s;
    });

    const unsubLevels = subscribeUserLevelProgression(authenticatedUid, 0, (prog) => {
      setCurrentUser((prev) => {
        const next = {
          ...prev,
          level: prog.currentLevel,
          totalQualifyingCoinsSpent: prog.totalQualifyingCoinsSpent,
          vipLevel: Math.max(prog.highestUnlockedVipTier, prog.equippedVipFrame),
          equippedVipFrame: prog.equippedVipFrame,
          isVIP: prog.highestUnlockedVipTier > 0 || prog.equippedVipFrame > 0,
          superVipLevel: Math.max(prog.highestUnlockedSuperVipTier, prog.equippedSuperVipFrame),
          equippedSuperVipFrame: prog.equippedSuperVipFrame,
          isSuperVIP: prog.highestUnlockedSuperVipTier > 0 || prog.equippedSuperVipFrame > 0,
          activeFrameType: prog.activeFrameType,
          unlockedVipTiers: prog.unlockedVipTiers,
          unlockedSuperVipTiers: prog.unlockedSuperVipTiers,
          earnedAchievements: prog.earnedAchievements,
          equippedBadges:
            prog.equippedAchievementBadges.length > 0
              ? prog.equippedAchievementBadges
              : prev.equippedBadges,
        };
        saveStoredUserProfile(next);
        return next;
      });
    });

    const unsubStreams = subscribeFirestoreLiveStreams((remoteStreams) => {
      // Merge Firestore streams non-destructively while strictly enforcing ONE card per host.id
      setLiveStreams((prev) => {
        const merged = new Map<string, LiveStream>();
        remoteStreams.forEach((s) => {
          if (!endedLiveIdsRef.current.has(s.id) && s.isLive !== false) {
            merged.set(s.id, s);
          }
        });
        prev.forEach((existing) => {
          if (endedLiveIdsRef.current.has(existing.id)) return;
          if (backendLiveIdsRef.current.has(existing.id)) {
            const fsItem = merged.get(existing.id);
            if (fsItem) {
              const exactViewers =
                typeof existing.numericViewers === 'number'
                  ? existing.numericViewers
                  : fsItem.numericViewers || 0;
              merged.set(existing.id, {
                ...fsItem,
                ...existing,
                numericViewers: exactViewers,
                viewerCount: String(exactViewers),
                likesCount: Math.max(fsItem.likesCount || 0, existing.likesCount || 0),
              });
            } else {
              merged.set(existing.id, existing);
            }
          }
        });
        // Strictly collapse to the newest active stream per host.id so 2 cards never appear for one broadcaster
        const byHost = new Map<string, LiveStream>();
        Array.from(merged.values())
          .filter(
            (s) =>
              s.status !== 'closed' &&
              s.isLive !== false &&
              !(s.status === 'empty' && typeof s.closesAt === 'number' && s.closesAt <= Date.now())
          )
          .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
          .forEach((s) => {
            const hostKey = s.host?.id || s.id;
            if (!byHost.has(hostKey)) {
              byHost.set(hostKey, s);
            }
          });
        return Array.from(byHost.values()).sort(
          (a, b) => (b.numericViewers || 0) - (a.numericViewers || 0) || (b.startTime || 0) - (a.startTime || 0)
        );
      });
    });

    const unsubRooms = subscribeFirestorePartyRooms((remoteRooms) => {
      // Merge Firestore party rooms with authoritative backend lifecycle state (never resurrect closed/expired rooms)
      const now = Date.now();
      setPartyRooms((prev) => {
        const merged = new Map<string, PartyRoom>();
        remoteRooms.forEach((r) => {
          if (
            !endedRoomIdsRef.current.has(r.id) &&
            r.status !== 'closed' &&
            !(r.status === 'empty' && typeof r.closesAt === 'number' && r.closesAt <= now)
          ) {
            merged.set(r.id, enforcePartyRoomSeatPolicy(r));
          }
        });
        prev.forEach((existing) => {
          if (endedRoomIdsRef.current.has(existing.id) || existing.status === 'closed') return;
          if (existing.status === 'empty' && typeof existing.closesAt === 'number' && existing.closesAt <= now) return;
          if (backendRoomIdsRef.current.has(existing.id)) {
            const fsItem = merged.get(existing.id);
            if (fsItem) {
              merged.set(
                existing.id,
                enforcePartyRoomSeatPolicy({
                  ...fsItem,
                  ...existing,
                  numericParticipants:
                    typeof existing.numericParticipants === 'number'
                      ? existing.numericParticipants
                      : fsItem.numericParticipants || 0,
                  participantCount: String(
                    typeof existing.numericParticipants === 'number'
                      ? existing.numericParticipants
                      : fsItem.numericParticipants || 0
                  ),
                })
              );
            } else {
              merged.set(existing.id, enforcePartyRoomSeatPolicy(existing));
            }
          }
        });
        return Array.from(merged.values()).sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
      });
    });

    const unsubReels = subscribeReelsFeed(authenticatedUid, REELS_PAGE_SIZE, (snapshot) => {
      setFirestoreReels(snapshot.reels);
      setReelsLastDoc(snapshot.lastDoc);
      setHasMoreReels(snapshot.hasMore);
    });

    const unsubVideos = subscribeFirestoreVideos((remoteVideos) => {
      setLegacyPostVideos(
        remoteVideos.map((v) => ({
          ...v,
          sourceCollection: 'posts',
        }))
      );
    });

    return () => {
      unsubUserDoc();
      unsubDeviceBan();
      unsubWallet();
      unsubEarnings();
      unsubWalletSettings();
      unsubLevels();
      unsubStreams();
      unsubRooms();
      unsubReels();
      unsubVideos();
    };
  }, [authenticatedUid, currentDeviceId]);

  // Global Pull-to-Refresh handler: refreshes Solo Live, Party Rooms,
  // Rankings, User Profile/Wallet/Levels, and notifies the active screen to re-fetch fresh data
  // without tearing down active Firestore onSnapshot streams.
  const handleGlobalAppRefresh = useCallback(async (): Promise<PullToRefreshResult> => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { offline: true, message: 'No internet connection' };
    }

    try {
      // 1. Refresh real-time backend live streams, party rooms & rankings in parallel
      const [streams, rooms, rankings] = await Promise.all([
        liveAndRoomService.fetchActiveStreams().catch(() => null),
        liveAndRoomService.fetchActiveRooms().catch(() => null),
        liveAndRoomService.fetchTopBroadcasters().catch(() => null),
      ]);

      if (Array.isArray(streams)) {
        backendLiveIdsRef.current = new Set(streams.map((s) => s.id));
        setLiveStreams((prev) => {
          const mergedMap = new Map<string, LiveStream>();
          prev.forEach((s) => {
            if (!endedLiveIdsRef.current.has(s.id) && s.isLive !== false) mergedMap.set(s.id, s);
          });
          streams.forEach((s) => {
            if (!endedLiveIdsRef.current.has(s.id) && s.isLive !== false) mergedMap.set(s.id, s);
          });
          const byHost = new Map<string, LiveStream>();
          Array.from(mergedMap.values())
            .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
            .forEach((s) => {
              const hostKey = s.host?.id || s.id;
              if (!byHost.has(hostKey)) byHost.set(hostKey, s);
            });
          return Array.from(byHost.values()).sort(
            (a, b) => (b.numericViewers || 0) - (a.numericViewers || 0) || (b.startTime || 0) - (a.startTime || 0)
          );
        });
      }

      if (Array.isArray(rooms)) {
        backendRoomIdsRef.current = new Set(rooms.map((r) => r.id));
        setPartyRooms((prev) => {
          const mergedMap = new Map<string, PartyRoom>();
          prev.forEach((r) => {
            if (!endedRoomIdsRef.current.has(r.id)) mergedMap.set(r.id, r);
          });
          rooms.forEach((r) => {
            if (!endedRoomIdsRef.current.has(r.id)) mergedMap.set(r.id, r);
          });
          return Array.from(mergedMap.values()).sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
        });
      }

      if (rankings && Array.isArray(rankings.broadcasters)) {
        setTopBroadcasters(rankings.broadcasters);
      }

      // 3. Force-refresh authenticated user profile from Firestore server
      if (authenticatedUid) {
        try {
          const userDocRef = doc(db, 'users', authenticatedUid);
          const snap = await getDocFromServer(userDocRef).catch(() => getDoc(userDocRef));
          if (snap.exists()) {
            const mapped = mapFirestoreUserToProfile(snap.data() as FirestoreUserData, auth.currentUser);
            setCurrentUser((prev) => {
              const merged = { ...prev, ...mapped };
              saveStoredUserProfile(merged);
              return merged;
            });
          }
        } catch {
          // ignore transient profile fetch errors
        }
      }

      // 4. If user is inside an active Solo Live or Party Room, refresh its snapshot cleanly without disconnecting Agora
      if (activeLiveStream?.id) {
        try {
          const liveRef = doc(db, 'live_streams', activeLiveStream.id);
          const liveSnap = await getDocFromServer(liveRef).catch(() => getDoc(liveRef));
          if (liveSnap.exists()) {
            const data = liveSnap.data() as Partial<LiveStream>;
            setActiveLiveStream((prev) => (prev && prev.id === activeLiveStream.id ? { ...prev, ...data } : prev));
          }
        } catch {
          // keep active stream intact
        }
      }

      if (activeAudioRoom?.id) {
        try {
          const roomRef = doc(db, 'party_rooms', activeAudioRoom.id);
          const roomSnap = await getDocFromServer(roomRef).catch(() => getDoc(roomRef));
          if (roomSnap.exists()) {
            const data = roomSnap.data() as Partial<PartyRoom>;
            setActiveAudioRoom((prev) => (prev && prev.id === activeAudioRoom.id ? { ...prev, ...data } : prev));
          }
        } catch {
          // keep active room intact
        }
      }

      // 5. Re-bind real-time Firestore listeners & notify individual screens (Profile, Rankings, etc.)
      setRefreshTick((n) => n + 1);
      window.dispatchEvent(
        new CustomEvent('lenzo:app-refresh', {
          detail: { screen: currentScreen, timestamp: Date.now() },
        })
      );

      return { message: 'Refreshed' };
    } catch {
      return {
        offline: typeof navigator !== 'undefined' && navigator.onLine === false,
        message: typeof navigator !== 'undefined' && navigator.onLine === false ? 'No internet connection' : 'Refreshed',
      };
    }
  }, [authenticatedUid, activeLiveStream?.id, activeAudioRoom?.id, currentScreen]);

  // Merge primary `reels` collection + paginated pages + legacy `posts` without duplicates
  useEffect(() => {
    const byId = new Map<string, VideoItem>();
    [...firestoreReels, ...extraPagedReels, ...legacyPostVideos].forEach((item) => {
      if (!item?.id) return;
      if (!byId.has(item.id)) {
        byId.set(item.id, item);
      }
    });
    const merged = Array.from(byId.values()).sort(
      (a, b) => (b.createdAtMillis || Date.parse(b.createdAt) || 0) - (a.createdAtMillis || Date.parse(a.createdAt) || 0)
    );
    setVideos(merged);
  }, [firestoreReels, extraPagedReels, legacyPostVideos]);

  const handleLoadMoreReels = async () => {
    if (!reelsLastDoc || isLoadingMoreReels || !hasMoreReels) return;
    setIsLoadingMoreReels(true);
    try {
      const nextPage = await fetchMoreReels(reelsLastDoc, authenticatedUid, REELS_PAGE_SIZE);
      if (nextPage.reels.length > 0) {
        setExtraPagedReels((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          return [...prev, ...nextPage.reels.filter((r) => !existingIds.has(r.id))];
        });
      }
      setReelsLastDoc(nextPage.lastDoc);
      setHasMoreReels(nextPage.hasMore);
    } finally {
      setIsLoadingMoreReels(false);
    }
  };

  // Handler: Splash Completion
  const handleSplashComplete = () => {
    if (auth.currentUser || authenticatedUid) {
      setCurrentScreen('home');
    } else {
      setCurrentScreen('auth');
    }
  };

  // Handler: Auth Success
  const handleAuthSuccess = (profile: UserProfile) => {
    setAuthScreenMode('login');
    setAuthPrefillEmail(undefined);
    setCurrentUser(profile);
    saveStoredUserProfile(profile);
    liveAndRoomService.setCurrentUser(profile.id);
    liveAndRoomService.syncUser(profile);
    setCurrentScreen('home');
    maybePromptGooglePasswordLink(auth.currentUser, profile);
  };

  // Handler: Logout (preserves device saved accounts for Welcome Back & Account Switcher; clears active session state)
  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Logout notice:', e);
    }
    resetUserScopedTransientState();
    dismissedPasswordPromptUidsRef.current.clear();
    setAuthenticatedUid(null);
    liveAndRoomService.setCurrentUser(null);
    setCurrentUser(CURRENT_USER);
    try {
      localStorage.removeItem('lenzo_party_user_profile_v3');
    } catch (_) {}
    setAuthScreenMode('login');
    setAuthPrefillEmail(undefined);
    setCurrentScreen('auth');
  };

  // Handler: Switch Account from AccountSwitcherModal (cleanly tears down previous session & verifies target via Firebase Auth)
  const handleSwitchAccount = async (targetAccount: SavedDeviceAccount) => {
    setIsAccountSwitcherOpen(false);
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Account switch sign-out notice:', e);
    }
    resetUserScopedTransientState();
    setAuthenticatedUid(null);
    liveAndRoomService.setCurrentUser(null);
    try {
      localStorage.removeItem('lenzo_party_user_profile_v3');
    } catch (_) {}

    if (targetAccount.authProvider === 'google') {
      try {
        const result = await signInWithGoogle({
          loginHint: targetAccount.email,
          forceAccountPicker: true,
        });
        if (result?.profile) {
          handleAuthSuccess(result.profile);
          showAppToast(`Switched to ${result.profile.name}`);
        }
      } catch (err: any) {
        setAuthScreenMode('login');
        setAuthPrefillEmail(undefined);
        setCurrentScreen('auth');
        showAppToast(err?.message || 'Select your Google account to complete switching.');
      }
    } else {
      setAuthScreenMode('login');
      setAuthPrefillEmail(targetAccount.email);
      setCurrentScreen('auth');
      showAppToast(`Enter password for ${targetAccount.email} to switch account.`);
    }
  };

  // Handler: Add Account from AccountSwitcherModal
  const handleAddAccount = () => {
    setIsAccountSwitcherOpen(false);
    setAuthScreenMode('add_account');
    setAuthPrefillEmail(undefined);
    setCurrentScreen('auth');
  };

  // Handler: Select & Open a Live Stream
  const handleSelectLive = (stream: LiveStream) => {
    if (stream.host.id !== currentUser.id && isBlockedRelationship(stream.host.id)) {
      showAppToast(
        isBlockedByMe(stream.host.id)
          ? `Unblock ${stream.host.name} to view their live stream.`
          : 'You cannot join or interact with this live stream.'
      );
      return;
    }
    setActiveLiveStream(stream);
    setCurrentScreen('live_active');
  };

  // Handler: Select & Open an Audio Party Room
  const handleSelectRoom = (room: PartyRoom) => {
    if (room.host.id !== currentUser.id && isBlockedRelationship(room.host.id)) {
      showAppToast(
        isBlockedByMe(room.host.id)
          ? `Unblock ${room.host.name} to join their party room.`
          : 'You cannot join or interact with this party room.'
      );
      return;
    }
    if (room.host.id !== currentUser.id) {
      const activeKick = getActiveKickForRoom(activeRoomKicks, room.id, room.host.id);
      if (activeKick) {
        showAppToast(
          activeKick.durationType === 'session'
            ? 'You were kicked from this party stream and cannot re-enter this session.'
            : `You are kicked from this room (${formatRemainingKickTime(activeKick)}).`
        );
        return;
      }
    }
    setActiveAudioRoom(room);
    setCurrentScreen('audio_room');
  };

  // Handler: Start Newly Created Live (Sync to Cloud Firestore & Backend in parallel for instant Web + Android cards)
  const handleStartLive = async (newStream: LiveStream) => {
    const activeUid = auth.currentUser?.uid || newStream.host.id;
    const normalizedStream: LiveStream = {
      ...newStream,
      isLive: true,
      startTime: newStream.startTime || Date.now(),
      host: {
        ...newStream.host,
        id: activeUid,
      },
    };

    endedLiveIdsRef.current.delete(normalizedStream.id);
    backendLiveIdsRef.current.add(normalizedStream.id);

    const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
      new Promise<T>((resolve) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve(fallback);
          }
        }, ms);
        promise
          .then((val) => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve(val);
            }
          })
          .catch(() => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve(fallback);
            }
          });
      });

    // Write to Cloud Firestore first/in parallel so BOTH Web and Android receive the live card immediately
    const firestorePromise = createFirestoreLiveStream(normalizedStream).catch((err) => {
      console.error('[Firestore] Live stream card creation failed:', err);
      return null;
    });

    const [confirmedStream] = await Promise.all([
      withTimeout(liveAndRoomService.startLiveStream(normalizedStream), 3000, normalizedStream),
      withTimeout(firestorePromise, 4000, null),
    ]);

    const finalStream: LiveStream = {
      ...normalizedStream,
      ...confirmedStream,
      id: normalizedStream.id,
      host: {
        ...(confirmedStream.host || normalizedStream.host),
        id: activeUid,
      },
      isLive: true,
    };

    // Replace any older card for the same host.id so strictly 1 Solo Live card appears
    setLiveStreams((prev) => {
      prev.forEach((old) => {
        if (old.id !== finalStream.id && old.host?.id === activeUid) {
          endedLiveIdsRef.current.add(old.id);
          backendLiveIdsRef.current.delete(old.id);
          void endFirestoreLiveStream(old.id).catch(() => {});
        }
      });
      return [
        finalStream,
        ...prev.filter((s) => s.id !== finalStream.id && s.host?.id !== activeUid),
      ];
    });
    setActiveLiveStream(finalStream);
    setCurrentScreen('live_active');

    // Notify all followers that this host went LIVE
    void notifyFollowersOfLiveOrRoom({
      hostId: activeUid,
      hostName: finalStream.host.name,
      hostAvatar: finalStream.host.avatar,
      mode: 'live',
      targetId: finalStream.id,
      sessionTitle: finalStream.title,
    }).catch(() => {});

    liveAndRoomService
      .fetchTopBroadcasters()
      .then(({ broadcasters }) => setTopBroadcasters(broadcasters))
      .catch(() => {});
  };

  // Handler: End Live Stream permanently (removes from feed, Firestore, refreshes rankings)
  const handleEndLive = async (streamId: string) => {
    endedLiveIdsRef.current.add(streamId);
    backendLiveIdsRef.current.delete(streamId);
    setLiveStreams((prev) => prev.filter((s) => s.id !== streamId));
    setActiveLiveStream(null);
    setActivePKSession(null);
    setCurrentScreen('home');
    endFirestoreLiveStream(streamId).catch((err) => {
      console.warn('[Firestore] Live stream delete notice:', err);
    });
    liveAndRoomService
      .fetchTopBroadcasters()
      .then(({ broadcasters }) => setTopBroadcasters(broadcasters))
      .catch(() => {});
  };

  // Handler: Create Newly Created Audio Room (Sync to Cloud Firestore & Backend in parallel for instant Web + Android cards)
  const handleCreateRoom = async (newRoom: PartyRoom) => {
    const activeUid = auth.currentUser?.uid || newRoom.host.id;
    const normalizedHost: UserProfile = {
      ...newRoom.host,
      id: activeUid,
    };
    const safeMaxSeats = clampPartyMaxSeatsForHostLevel(newRoom.maxSeats, normalizedHost.level);
    const normalizedSeats: (UserProfile | null)[] = Array(safeMaxSeats).fill(null);
    if (Array.isArray(newRoom.seats)) {
      for (let idx = 0; idx < Math.min(safeMaxSeats, newRoom.seats.length); idx++) {
        const seat = newRoom.seats[idx];
        if (seat && !isSeatLockedByHostLevel(idx, normalizedHost.level)) {
          normalizedSeats[idx] = idx === 0 || seat.id === newRoom.host.id ? normalizedHost : seat;
        }
      }
    }
    if (!normalizedSeats[0]) {
      normalizedSeats[0] = normalizedHost;
    }

    const normalizedRoom: PartyRoom = {
      ...newRoom,
      maxSeats: safeMaxSeats,
      host: normalizedHost,
      seats: normalizedSeats,
      startTime: newRoom.startTime || Date.now(),
    };

    endedRoomIdsRef.current.delete(normalizedRoom.id);
    backendRoomIdsRef.current.add(normalizedRoom.id);

    const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
      new Promise<T>((resolve) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve(fallback);
          }
        }, ms);
        promise
          .then((res) => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve(res);
            }
          })
          .catch(() => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve(fallback);
            }
          });
      });

    const firestoreRoomPromise = createFirestorePartyRoom(normalizedRoom).catch((err) => {
      console.error('[Firestore] Party room card creation failed:', err);
      return null;
    });

    const [confirmedRoom] = await Promise.all([
      withTimeout(liveAndRoomService.createPartyRoom(normalizedRoom), 3000, normalizedRoom),
      withTimeout(firestoreRoomPromise, 4000, null),
    ]);

    const finalRoom: PartyRoom = enforcePartyRoomSeatPolicy({
      ...normalizedRoom,
      ...confirmedRoom,
      id: normalizedRoom.id,
      maxSeats: safeMaxSeats,
      host: {
        ...(confirmedRoom.host || normalizedHost),
        id: activeUid,
        level: normalizedHost.level,
      },
      seats: normalizedRoom.seats,
    });

    setPartyRooms((prev) => [finalRoom, ...prev.filter((r) => r.id !== finalRoom.id)]);
    setActiveAudioRoom(finalRoom);
    setCurrentScreen('audio_room');

    // Notify all followers that this host opened a Party Room
    void notifyFollowersOfLiveOrRoom({
      hostId: activeUid,
      hostName: finalRoom.host.name,
      hostAvatar: finalRoom.host.avatar,
      mode: 'room',
      targetId: finalRoom.id,
      sessionTitle: finalRoom.title,
    }).catch(() => {});
  };

  // Handlers for Mic Button & Plus Button workflows
  const handleCameraRecordingComplete = (blob: Blob, url: string) => {
    setStagedVideoData({ url, file: blob });
    setCurrentScreen('upload_video');
  };

  const handleGalleryFileSelected = (file: File) => {
    const url = URL.createObjectURL(file);
    setStagedVideoData({ url, file });
    setCurrentScreen('upload_video');
  };

  const handleOpenMicMenu = () => {
    setIsMicSelectionOpen(true);
  };

  const handleOpenPlusUpload = () => {
    setIsVideoSourceModalOpen(true);
  };

  // Handler: Update User Profile (Immediate UI update + Firestore persistence)
  const handleUpdateProfile = async (updated: UserProfile) => {
    setCurrentUser(updated);
    saveStoredUserProfile(updated);

    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const payload: Record<string, any> = {
          fullName: updated.name.slice(0, 60),
          username: (updated.username || '').slice(0, 40),
          bio: (updated.bio || '').slice(0, 300),
          gender: updated.gender || 'unspecified',
          country: (updated.country || 'Global').slice(0, 64),
          birthday: (updated.birthday || '').slice(0, 32),
          showGender: updated.showGender ?? true,
          showAge: updated.showAge ?? true,
          showOnlineStatus: updated.showOnlineStatus ?? true,
          equippedBadges: Array.isArray(updated.equippedBadges) ? updated.equippedBadges.slice(0, 3) : [],
          agencyId: updated.agencyId || '',
          agencyName: updated.agencyName || '',
          agencyCode: updated.agencyCode || '',
          agencyLogo: updated.agencyLogo || '',
          agencyRole: updated.agencyRole || '',
          agencyStatus: updated.agencyStatus || 'none',
          crewName: updated.crewName || '',
          crewBadge: updated.crewBadge || '',
        };
        if (updated.avatar && updated.avatar.length <= 1500) {
          payload.profileImage = updated.avatar;
        }
        if (typeof updated.coverImage === 'string' && updated.coverImage.length <= 1500) {
          payload.coverImage = updated.coverImage;
        }
        await updateDoc(userRef, payload);
      } catch (err) {
        console.warn('[Firestore] Profile update notice:', err);
      }
    }
  };

  // Handler: Send Gift
  const handleSendGift = async (gift: GiftItem, quantity: number, recipient: UserProfile) => {
    if (recipient.id !== currentUser.id && isBlockedRelationship(recipient.id)) {
      setIsGiftShopOpen(false);
      showAppToast(
        isBlockedByMe(recipient.id)
          ? `Unblock ${recipient.name} to send gifts.`
          : 'You cannot send gifts to this user.'
      );
      return;
    }
    const cost = gift.coins * quantity;
    if (currentUser.coins < cost) {
      showAppToast(`Insufficient Coins (${currentUser.coins.toLocaleString()}). Buy coins from an Active Agency.`);
      return;
    }

    // Optimistic update for sender (rolled back automatically if Firestore transaction fails)
    setCurrentUser((prev) => {
      const next = {
        ...prev,
        coins: prev.coins - cost,
      };
      saveStoredUserProfile(next);
      return next;
    });

    // Atomic backend execution: Deducts 100% Coins from sender's Gifting Wallet,
    // takes 40% App share, credits 60% as Diamonds to host's Earnings Wallet
    let giftSucceeded = false;
    try {
      const result = await processGiftTransaction(
        currentUser,
        recipient,
        gift,
        quantity,
        walletSettingsRef.current
      );
      if (!result.success) {
        // Rollback optimistic deduction
        setCurrentUser((prev) => {
          const restored = { ...prev, coins: prev.coins + cost };
          saveStoredUserProfile(restored);
          return restored;
        });
        showAppToast(result.error || 'Gift failed. Please check your Coin balance.');
        return;
      }
      giftSucceeded = true;
      if (recipient.id === currentUser.id) {
        setCurrentUser((prev) => {
          const next = {
            ...prev,
            diamonds: (prev.diamonds || 0) + result.netEarnings,
          };
          saveStoredUserProfile(next);
          return next;
        });
      }
    } catch (e: any) {
      setCurrentUser((prev) => {
        const restored = { ...prev, coins: prev.coins + cost };
        saveStoredUserProfile(restored);
        return restored;
      });
      showAppToast(e?.message || 'Gift failed. Please try again.');
      return;
    }

    if (giftSucceeded) {

      // Authoritative 100-Level, 12-VIP, 6-Super-VIP & Achievement Progression Update
      try {
        const txId = `gift_prog_${currentUser.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const levelRes = await addQualifyingGiftingCoins(currentUser.id, cost, {
          transactionId: txId,
          reason: `gift:${gift.name}x${quantity}`,
          userSnapshot: {
            name: currentUser.name,
            avatar: currentUser.avatar,
            email: currentUser.email,
            metrics: {
              diamondsEarned: currentUser.diamonds || 0,
              followersCount: currentUser.followersCount || 0,
              followingCount: currentUser.followingCount || 0,
              totalLikesCount: currentUser.totalLikes || 0,
              liveSessionsHosted: currentUser.liveSessionsHosted || 0,
              loginStreakDays: currentUser.loginStreakDays || 1,
              hasAgency: Boolean(currentUser.agencyId && currentUser.agencyStatus === 'active'),
            },
          },
        });
        const prog = levelRes.progression;
        setCurrentUser((prev) => {
          const next = {
            ...prev,
            level: prog.currentLevel,
            totalQualifyingCoinsSpent: prog.totalQualifyingCoinsSpent,
            vipLevel: prog.highestUnlockedVipTier,
            isVIP: prog.highestUnlockedVipTier > 0,
            superVipLevel: prog.highestUnlockedSuperVipTier,
            isSuperVIP: prog.highestUnlockedSuperVipTier > 0,
            activeFrameType: prog.activeFrameType,
            equippedVipFrame: prog.equippedVipFrame,
            equippedSuperVipFrame: prog.equippedSuperVipFrame,
            unlockedVipTiers: prog.unlockedVipTiers,
            unlockedSuperVipTiers: prog.unlockedSuperVipTiers,
            earnedAchievements: prog.earnedAchievements,
            giftsSentCount: (prev.giftsSentCount || 0) + 1,
          };
          saveStoredUserProfile(next);
          return next;
        });

        if (levelRes.levelUpEvent && levelRes.levelUpEvent.newLevel > levelRes.levelUpEvent.oldLevel) {
          const event = levelRes.levelUpEvent;
          setLevelUpData({
            oldLevel: event.oldLevel,
            newLevel: event.newLevel,
            coinsSpent: cost,
            unlockedVipFrames: event.unlockedVipFrames,
            unlockedSuperVipFrames: event.unlockedSuperVipFrames,
            newlyEarnedAchievements: event.newlyEarnedAchievements,
          });
          void sendPushNotification({
            targetUserId: currentUser.id,
            type: 'progression',
            title: `🏆 Level ${event.newLevel} Unlocked!`,
            message: `Congratulations! You reached Level ${event.newLevel} on Lenzo Party Live!`,
            actionType: 'open_profile',
            priority: 'high',
            allowSelf: true,
            eventKey: `level_up_${event.newLevel}`,
          }).catch(() => {});
        }
      } catch (levelErr) {
        console.warn('Level progression update error:', levelErr);
      }

      // Record real-time gift event in live broadcast or party room (updates broadcaster ranking score)
      if (currentScreen === 'live_active' && activeLiveStream) {
        liveAndRoomService
          .recordLiveGift(activeLiveStream.id, currentUser, recipient, gift, quantity)
          .then(() => liveAndRoomService.fetchTopBroadcasters())
          .then(({ broadcasters }) => setTopBroadcasters(broadcasters))
          .catch(() => {});
      } else if (currentScreen === 'audio_room' && activeAudioRoom) {
        liveAndRoomService
          .recordRoomGift(activeAudioRoom.id, currentUser, recipient, gift, quantity)
          .catch(() => {});
      }

      // If in active PK Battle, broadcast authoritative score update to match
      if (activePKSession) {
        pkService.sendPKGift(
          activePKSession.id,
          currentUser,
          recipient.id,
          gift,
          quantity
        ).then((res) => {
          if (res?.host1Score !== undefined && res?.host2Score !== undefined) {
            setActivePKSession((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                host1: {
                  ...prev.host1,
                  score: res.host1Score
                },
                host2: {
                  ...prev.host2,
                  score: res.host2Score
                }
              };
            });
          }
        }).catch((err) => {
          console.warn('PK gift error:', err);
        });
      }

      // Trigger Celebration Banner
      setActiveGiftCelebration({
        gift,
        sender: currentUser.name,
        recipient: recipient.name,
        quantity,
      });

      setTimeout(() => {
        setActiveGiftCelebration(null);
      }, 4000);
    }
  };


  // Handler: Recharge Coins
  const handleRechargeSuccess = (addedCoins: number) => {
    setCurrentUser((prev) => {
      const next = {
        ...prev,
        coins: prev.coins + addedCoins,
      };
      saveStoredUserProfile(next);
      return next;
    });
  };

  // Handler: Upgrade VIP Level
  const handleUpgradeVIP = (newLevel: number) => {
    setCurrentUser((prev) => {
      const next = {
        ...prev,
        vipLevel: newLevel,
        isVIP: true,
      };
      saveStoredUserProfile(next);
      return next;
    });
  };


  // Handler: Toggle Follow User
  const handleToggleFollow = async (userId: string) => {
    if (userId !== currentUser.id && isBlockedRelationship(userId)) {
      showAppToast('Cannot follow a blocked user.');
      return;
    }
    try {
      const result = await profileService.toggleFollow(userId, currentUser.id);
      syncFirestoreFollow(currentUser.id, userId, result.isFollowing).catch(() => {});
      setLiveStreams((prev) =>
        prev.map((s) => (s.host.id === userId ? { ...s, host: { ...s.host, isFollowing: result.isFollowing } } : s))
      );
      setActiveLiveStream((prev) =>
        prev && prev.host.id === userId ? { ...prev, host: { ...prev.host, isFollowing: result.isFollowing } } : prev
      );
      if (viewingProfileUser && viewingProfileUser.id === userId) {
        setViewingProfileUser((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: result.isFollowing,
                followersCount: result.targetFollowersCount,
                fansCount: result.targetFollowersCount.toLocaleString(),
              }
            : null
        );
      }
      setCurrentUser((prev) => {
        const next = { ...prev, followingCount: result.myFollowingCount };
        saveStoredUserProfile(next);
        return next;
      });
      if (result.isFollowing && userId !== currentUser.id) {
        void sendPushNotification({
          targetUserId: userId,
          type: 'followers',
          title: '✨ New Follower!',
          message: `${currentUser.name} started following you on Lenzo Party Live!`,
          avatar: currentUser.avatar,
          senderId: currentUser.id,
          senderName: currentUser.name,
          actionType: 'open_profile',
          targetId: currentUser.id,
          priority: 'normal',
          eventKey: 'new_follower',
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Toggle follow notice:', err);
    }
  };

  // Handler: Jump to Direct Message with a User
  const handleSendMessageToUser = (user: UserProfile) => {
    if (user.id !== currentUser.id && isBlockedRelationship(user.id)) {
      showAppToast(
        isBlockedByMe(user.id)
          ? `Unblock ${user.name} to send messages.`
          : 'You cannot send messages to this user.'
      );
      return;
    }
    setViewingProfileUser(null);
    setActiveChatUser(user);
    setCurrentScreen('messages');
  };

  // Filter out streams, party rooms, videos, and hosts belonging to users who permanently blocked the current user
  const visibleLiveStreams = liveStreams.filter(
    (s) => s.host.id === currentUser.id || !blockedByUserIds.includes(s.host.id)
  );
  const visiblePartyRooms = partyRooms.filter(
    (r) => r.host.id === currentUser.id || !blockedByUserIds.includes(r.host.id)
  );
  const visibleVideos = videos.filter((v) => {
    const ownerId = v.creatorUid || v.creator?.id;
    if (!ownerId || ownerId === currentUser.id) return true;
    return !blockedByUserIds.includes(ownerId) && !blockedByUserIds.includes(v.creator?.id || '');
  });

  // Derived unread counts and top hosts (excluding users who blocked current user)
  const unreadMessagesCount = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const unreadNotificationsCount = notifications.reduce((sum, n) => sum + (n.isRead ? 0 : 1), 0);
  const topHostsList = topBroadcasters
    .map((b) => b.user)
    .filter((u) => u.id === currentUser.id || !blockedByUserIds.includes(u.id));

  // Full Screen Overlays (Splash & Auth)
  if (currentScreen === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (currentScreen === 'auth') {
    return (
      <AuthScreen
        onSuccess={handleAuthSuccess}
        onSkip={() => {
          setAuthScreenMode('login');
          setAuthPrefillEmail(undefined);
          setCurrentScreen('home');
        }}
        mode={authScreenMode}
        prefillEmail={authPrefillEmail}
        onCancelAddAccount={() => {
          setAuthScreenMode('login');
          setAuthPrefillEmail(undefined);
          setCurrentScreen('profile');
        }}
      />
    );
  }

  // Real-time Admin Enforcement Lockout (Device Ban, Permanent Account Block, or Active ID Suspension)
  const isAccountBlocked = Boolean(currentUser.isBlocked || currentUser.accountStatus === 'blocked');
  const isAccountSuspended = Boolean(
    currentUser.accountStatus === 'suspended' &&
      (!currentUser.suspendedUntil || currentUser.suspendedUntil > Date.now())
  );
  const isDeviceLocked = Boolean(activeDeviceBan || currentUser.isDeviceBanned);

  if (!isAuthorizedAdmin && authenticatedUid && (isDeviceLocked || isAccountBlocked || isAccountSuspended)) {
    const title = isDeviceLocked
      ? 'Device Permanently Banned'
      : isAccountBlocked
        ? 'Account Permanently Blocked'
        : 'Account Suspended';
    const detailReason = isDeviceLocked
      ? activeDeviceBan?.reason || 'This device has been permanently restricted by Lenzo Party Administration.'
      : isAccountBlocked
        ? currentUser.blockReason || 'Your account has been permanently blocked by Lenzo Party Administration.'
        : currentUser.suspendReason || 'Your account ID has been suspended by Lenzo Party Administration.';
    const expiryLabel =
      isAccountSuspended && currentUser.suspendedUntil && currentUser.suspendedUntil > Date.now()
        ? `Suspension ends: ${new Date(currentUser.suspendedUntil).toLocaleString()}`
        : isAccountSuspended
          ? 'Duration: Permanent until reviewed by Administration'
          : null;

    return (
      <div className="min-h-dvh-screen w-full bg-[#090611] text-white flex items-center justify-center p-5">
        <div className="w-full max-w-md rounded-3xl bg-[#160B2B] border border-rose-500/40 p-6 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center mx-auto text-rose-300 text-2xl font-black">
            !
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-black text-white">{title}</h1>
            <p className="text-xs text-rose-200 leading-relaxed">{detailReason}</p>
            {expiryLabel && <p className="text-[11px] font-mono text-amber-300 pt-1">{expiryLabel}</p>}
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-[11px] font-mono text-[#B9AECF] space-y-1">
            <div>ID: {currentUser.displayId || currentUser.id}</div>
            <div>Device: {currentDeviceId}</div>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Full Screen Live Broadcast View
  if (currentScreen === 'live_active' && activeLiveStream) {
    return (
      <PullToRefresh onRefresh={handleGlobalAppRefresh}>
        <div className="relative w-full h-dvh-screen bg-black">
        <ActiveLiveScreen
          stream={activeLiveStream}
          currentUser={currentUser}
          onClose={() => {
            setActiveLiveStream(null);
            setActivePKSession(null);
            setCurrentScreen('home');
          }}
          onUpdateStream={(updatedStream) => {
            setActiveLiveStream(updatedStream);
            setLiveStreams((prev) =>
              prev.map((s) => (s.id === updatedStream.id ? updatedStream : s))
            );
          }}
          onEndLive={handleEndLive}
          onToggleFollow={handleToggleFollow}
          onOpenGiftShop={(recipient) => {
            setGiftRecipient(recipient);
            setIsGiftShopOpen(true);
          }}
          onOpenPK={() => setIsPKInviteModalOpen(true)}
          onSelectUser={(u) => setViewingProfileUser(u)}
          activeGiftCelebration={activeGiftCelebration}
          activePKSession={activePKSession}
          onForfeitPK={handleForfeitPK}
          onRematchPK={() => setIsPKInviteModalOpen(true)}
          blockedUserIds={blockedUserIds}
          blockedByUserIds={blockedByUserIds}
        />
        {/* Supporting Modals when inside live stream */}
        <GiftShopModal
          isOpen={isGiftShopOpen}
          onClose={() => setIsGiftShopOpen(false)}
          currentUser={currentUser}
          recipientUser={giftRecipient || (activePKSession ? (giftRecipient || activePKSession.host2.user) : activeLiveStream.host)}
          gifts={gifts}
          onSendGift={handleSendGift}
          onOpenWallet={() => setIsWalletOpen(true)}
        />
        <PKHostInviteModal
          isOpen={isPKInviteModalOpen}
          onClose={() => setIsPKInviteModalOpen(false)}
          currentUser={currentUser}
          activeHost={activeLiveStream.host}
          onMatchStarted={(session) => {
            setActivePKSession(session);
            setIsPKInviteModalOpen(false);
          }}
        />
        <PKIncomingChallengeModal
          invitation={incomingPKInvite}
          onAccept={handleAcceptPKInvite}
          onDecline={handleDeclinePKInvite}
        />
        <PKWinnerAnnouncementModal
          session={pkWinnerSession}
          currentUser={currentUser}
          isOpen={!!pkWinnerSession}
          onClose={() => setPkWinnerSession(null)}
          onRematch={() => {
            setPkWinnerSession(null);
            setIsPKInviteModalOpen(true);
          }}
          onViewHistory={() => {
            setPkWinnerSession(null);
            setCurrentScreen('profile');
          }}
        />
        <UserProfileModal
          user={viewingProfileUser}
          currentUserId={currentUser.id}
          isOpen={!!viewingProfileUser}
          onClose={() => setViewingProfileUser(null)}
          onToggleFollow={handleToggleFollow}
          onSendMessage={handleSendMessageToUser}
          onSendGift={(u) => {
            setGiftRecipient(u);
            setIsGiftShopOpen(true);
          }}
          isBlocked={isBlockedByMe(viewingProfileUser?.id)}
          isBlockedByTarget={isBlockedByTarget(viewingProfileUser?.id)}
          onBlockUser={handleBlockUser}
          onUnblockUser={handleUnblockUser}
          onViewFullProfile={(u) => {
            if (isBlockedByTarget(u.id)) {
              setViewingProfileUser(null);
              showAppToast('You cannot view this user\'s profile or videos.');
              return;
            }
            setViewingProfileUser(null);
            setActiveLiveStream(null);
            setActivePKSession(null);
            setNavigatingProfileUser(u);
            setCurrentScreen('profile');
          }}
        />
        <Suspense fallback={null}>
          <WalletModal
            isOpen={isWalletOpen}
            onClose={() => setIsWalletOpen(false)}
            currentUser={currentUser}
            onRechargeSuccess={handleRechargeSuccess}
            onSendMessage={handleSendMessageToUser}
          />
        </Suspense>
        {appToast && (
          <div className="fixed safe-top-offset-4 left-1/2 -translate-x-1/2 z-[150] px-4 py-2.5 rounded-2xl bg-[#160b29]/95 border border-rose-500/40 text-white text-xs font-bold shadow-[0_12px_32px_rgba(0,0,0,0.65)] backdrop-blur-md text-center max-w-[90vw]">
            {appToast}
          </div>
        )}
        <PushNotificationBanner
          notification={activePushBanner}
          onDismiss={() => setActivePushBanner(null)}
          onOpen={(notif) => handleNotificationDeepAction(notif)}
        />
        </div>
      </PullToRefresh>
    );
  }

  // Full Screen Audio Room View
  if (currentScreen === 'audio_room' && activeAudioRoom) {
    return (
      <PullToRefresh onRefresh={handleGlobalAppRefresh}>
        <div className="relative w-full min-h-dvh-screen bg-[#060212]">
        <AudioRoomScreen
          room={activeAudioRoom}
          currentUser={currentUser}
          onClose={() => {
            // Owner exits room to rooms list, but the room remains active and persistent in partyRooms!
            setActiveAudioRoom(null);
            setCurrentScreen('rooms');
          }}
          onUpdateRoom={(updatedRoom) => {
            const enforced = enforcePartyRoomSeatPolicy(updatedRoom);
            setActiveAudioRoom(enforced);
            setPartyRooms((prev) => prev.map((r) => (r.id === enforced.id ? enforced : r)));
          }}
          onCloseRoom={(roomId) => {
            // Intentional permanent close by Room Owner: removes room from directory & Firestore
            endedRoomIdsRef.current.add(roomId);
            backendRoomIdsRef.current.delete(roomId);
            setPartyRooms((prev) => prev.filter((r) => r.id !== roomId));
            setActiveAudioRoom(null);
            setCurrentScreen('rooms');
            deleteFirestorePartyRoom(roomId).catch((err) => {
              console.warn('[Firestore] Party room delete notice:', err);
            });
          }}
          onOpenGiftShop={(recipient) => {
            setGiftRecipient(recipient);
            setIsGiftShopOpen(true);
          }}
          onOpenWallet={() => setIsWalletOpen(true)}
          onSelectUser={(u) => setViewingProfileUser(u)}
          onOpenPK={handleOpenPKFromNav}
          activeGiftCelebration={activeGiftCelebration}
          blockedUserIds={blockedUserIds}
          blockedByUserIds={blockedByUserIds}
          activeRoomKicks={activeRoomKicks}
          onBlockUser={handleBlockUser}
        />
        {/* Supporting Modals when inside audio room */}
        <GiftShopModal
          isOpen={isGiftShopOpen}
          onClose={() => setIsGiftShopOpen(false)}
          currentUser={currentUser}
          recipientUser={giftRecipient || activeAudioRoom.host}
          gifts={gifts}
          onSendGift={handleSendGift}
          onOpenWallet={() => setIsWalletOpen(true)}
        />
        <UserProfileModal
          user={viewingProfileUser}
          currentUserId={currentUser.id}
          isOpen={!!viewingProfileUser}
          onClose={() => setViewingProfileUser(null)}
          onToggleFollow={handleToggleFollow}
          onSendMessage={handleSendMessageToUser}
          onSendGift={(u) => {
            setGiftRecipient(u);
            setIsGiftShopOpen(true);
          }}
          isBlocked={isBlockedByMe(viewingProfileUser?.id)}
          isBlockedByTarget={isBlockedByTarget(viewingProfileUser?.id)}
          onBlockUser={handleBlockUser}
          onUnblockUser={handleUnblockUser}
          onViewFullProfile={(u) => {
            if (isBlockedByTarget(u.id)) {
              setViewingProfileUser(null);
              showAppToast('You cannot view this user\'s profile or videos.');
              return;
            }
            setViewingProfileUser(null);
            setActiveAudioRoom(null);
            setNavigatingProfileUser(u);
            setCurrentScreen('profile');
          }}
        />
        <Suspense fallback={null}>
          <WalletModal
            isOpen={isWalletOpen}
            onClose={() => setIsWalletOpen(false)}
            currentUser={currentUser}
            onRechargeSuccess={handleRechargeSuccess}
            onSendMessage={handleSendMessageToUser}
          />
        </Suspense>
        {appToast && (
          <div className="fixed safe-top-offset-4 left-1/2 -translate-x-1/2 z-[150] px-4 py-2.5 rounded-2xl bg-[#160b29]/95 border border-rose-500/40 text-white text-xs font-bold shadow-[0_12px_32px_rgba(0,0,0,0.65)] backdrop-blur-md text-center max-w-[90vw]">
            {appToast}
          </div>
        )}
        <PushNotificationBanner
          notification={activePushBanner}
          onDismiss={() => setActivePushBanner(null)}
          onOpen={(notif) => handleNotificationDeepAction(notif)}
        />
        </div>
      </PullToRefresh>
    );
  }

  return (
    <div className="min-h-dvh-screen w-full bg-[#090611] text-white flex flex-col md:flex-row antialiased selection:bg-[#F328D5]/30">
      
      {/* Desktop Persistent Left Sidebar (Visible on md: and up) */}
      <DesktopSidebar
        currentScreen={currentScreen}
        currentUser={currentUser}
        onNavigate={(screen) => {
          if (screen === 'profile') {
            setNavigatingProfileUser(null);
          }
          setCurrentScreen(screen);
        }}
        onOpenCreateLive={() => {
          void ensureNativeMediaPermissions({ video: true, audio: true });
          setCurrentScreen('create_live');
        }}
        onOpenCreateRoom={() => {
          void ensureNativeMediaPermissions({ video: false, audio: true });
          setCurrentScreen('create_room');
        }}
        onOpenWallet={() => setIsWalletOpen(true)}
        onOpenGiftShop={() => {
          setGiftRecipient(null);
          setIsGiftShopOpen(true);
        }}
        onOpenPKModal={handleOpenPKFromNav}
        onOpenVIP={() => setIsVIPOpen(true)}
        onLogout={handleLogout}
        unreadMessagesCount={unreadMessagesCount}
      />

      {/* Main Responsive Application Area */}
      <div className="flex-1 flex flex-col min-h-dvh-screen min-w-0 bg-[#090611] relative">
        {/* Primary Screen Render Router wrapped with Universal Pull-to-Refresh */}
        <PullToRefresh onRefresh={handleGlobalAppRefresh}>
          <main className="flex-1 w-full min-w-0">
          {currentScreen === 'home' && (
            <HomeScreen
              currentUser={currentUser}
              liveStreams={visibleLiveStreams}
              partyRooms={visiblePartyRooms}
              topHosts={topHostsList}
              topBroadcasters={topBroadcasters}
              onSelectLive={handleSelectLive}
              onSelectRoom={handleSelectRoom}
              onSelectUser={(u) => setViewingProfileUser(u)}
              onNavigate={(s) => setCurrentScreen(s)}
              onOpenPK={handleOpenPKFromNav}
              onOpenGiftShop={() => {
                setGiftRecipient(null);
                setIsGiftShopOpen(true);
              }}
              onOpenMicMenu={handleOpenMicMenu}
              onToggleFollow={handleToggleFollow}
              onSendMessage={handleSendMessageToUser}
              isAdmin={isAuthorizedAdmin}
              onOpenAdminPanel={() => setIsAdminProgressionOpen(true)}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              unreadNotificationsCount={unreadNotificationsCount}
            />
          )}

          {(currentScreen === 'party' || currentScreen === 'rooms') && (
            <RoomsScreen
              partyRooms={visiblePartyRooms}
              onSelectRoom={handleSelectRoom}
              onNavigate={(s) => setCurrentScreen(s)}
              onOpenCreateRoom={() => setCurrentScreen('create_room')}
              onOpenSearch={() => setIsSearchOpen(true)}
              onOpenMicMenu={handleOpenMicMenu}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              unreadNotificationsCount={unreadNotificationsCount}
            />
          )}

          {currentScreen === 'create_live' && (
            <Suspense fallback={null}>
              <CreateLiveScreen
                currentUser={currentUser}
                onClose={() => setCurrentScreen('home')}
                onStartLive={handleStartLive}
              />
            </Suspense>
          )}

          {currentScreen === 'create_room' && (
            <Suspense fallback={null}>
              <CreateRoomScreen
                currentUser={currentUser}
                onClose={() => setCurrentScreen('rooms')}
                onCreateRoom={handleCreateRoom}
              />
            </Suspense>
          )}

          {currentScreen === 'rankings' && (
            <Suspense fallback={null}>
              <RankingsScreen
                currentUser={currentUser}
                onNavigate={(s) => setCurrentScreen(s)}
                onSelectUser={(u) => setViewingProfileUser(u)}
              />
            </Suspense>
          )}

          {currentScreen === 'store' && (
            <Suspense fallback={null}>
              <StoreScreen
                currentUser={currentUser}
                onNavigate={(s) => setCurrentScreen(s)}
                onOpenWallet={() => setIsWalletOpen(true)}
                onOpenVIP={() => setIsVIPOpen(true)}
                onUpdateUserBalance={(newCoins, newDiamonds) => {
                  setCurrentUser((prev) => ({
                    ...prev,
                    coins: newCoins,
                    diamonds: newDiamonds,
                  }));
                }}
                onCoinsSpent={(coinsSpent, reason) => {
                  if (!currentUser.id || coinsSpent <= 0) return;
                  const txId = `store_prog_${currentUser.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
                  addQualifyingGiftingCoins(currentUser.id, coinsSpent, {
                    transactionId: txId,
                    reason,
                    userSnapshot: {
                      name: currentUser.name,
                      avatar: currentUser.avatar,
                      email: currentUser.email,
                    },
                  })
                    .then((levelRes) => {
                      const prog = levelRes.progression;
                      setCurrentUser((prev) => {
                        const next = {
                          ...prev,
                          level: prog.currentLevel,
                          totalQualifyingCoinsSpent: prog.totalQualifyingCoinsSpent,
                          vipLevel: prog.highestUnlockedVipTier,
                          isVIP: prog.highestUnlockedVipTier > 0,
                          superVipLevel: prog.highestUnlockedSuperVipTier,
                          isSuperVIP: prog.highestUnlockedSuperVipTier > 0,
                          activeFrameType: prog.activeFrameType,
                          equippedVipFrame: prog.equippedVipFrame,
                          equippedSuperVipFrame: prog.equippedSuperVipFrame,
                          unlockedVipTiers: prog.unlockedVipTiers,
                          unlockedSuperVipTiers: prog.unlockedSuperVipTiers,
                        };
                        saveStoredUserProfile(next);
                        return next;
                      });
                      if (levelRes.levelUpEvent && levelRes.levelUpEvent.newLevel > levelRes.levelUpEvent.oldLevel) {
                        const event = levelRes.levelUpEvent;
                        setLevelUpData({
                          oldLevel: event.oldLevel,
                          newLevel: event.newLevel,
                          coinsSpent,
                          unlockedVipFrames: event.unlockedVipFrames,
                          unlockedSuperVipFrames: event.unlockedSuperVipFrames,
                          newlyEarnedAchievements: event.newlyEarnedAchievements,
                        });
                        void sendPushNotification({
                          targetUserId: currentUser.id,
                          type: 'progression',
                          title: `🏆 Level ${event.newLevel} Unlocked!`,
                          message: `Congratulations! You reached Level ${event.newLevel} on Lenzo Party Live!`,
                          actionType: 'open_profile',
                          priority: 'high',
                          allowSelf: true,
                          eventKey: `level_up_${event.newLevel}`,
                        }).catch(() => {});
                      }
                    })
                    .catch(() => {});
                }}
              />
            </Suspense>
          )}

          {(currentScreen === 'messages' || currentScreen === 'chat' || currentScreen === 'inbox') && (
            <MessagesScreen
              currentUser={currentUser}
              conversations={conversations}
              onNavigate={(s) => setCurrentScreen(s)}
              onSelectUser={(u) => setViewingProfileUser(u)}
              onOpenGiftShop={(u) => {
                setGiftRecipient(u);
                setIsGiftShopOpen(true);
              }}
              activeChatUser={activeChatUser}
              onCloseChat={() => setActiveChatUser(null)}
              blockedUsers={blockedUsers}
              blockedByUserIds={blockedByUserIds}
              onBlockUser={handleBlockUser}
              onUnblockUser={handleUnblockUser}
            />
          )}

          {currentScreen === 'videos' && (
            <VideoFeedScreen
              videos={visibleVideos}
              currentUser={currentUser}
              onOpenGiftShop={(recipient) => {
                setGiftRecipient(recipient);
                setIsGiftShopOpen(true);
              }}
              onSelectUser={(u) => setViewingProfileUser(u)}
              onUploadClick={handleOpenPlusUpload}
              onUpdateVideo={(updated) => {
                setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
              }}
              onDeleteVideo={(deletedId) => {
                setFirestoreReels((prev) => prev.filter((v) => v.id !== deletedId));
                setExtraPagedReels((prev) => prev.filter((v) => v.id !== deletedId));
                setLegacyPostVideos((prev) => prev.filter((v) => v.id !== deletedId));
                setVideos((prev) => prev.filter((v) => v.id !== deletedId));
              }}
              hasMoreVideos={hasMoreReels}
              isLoadingMore={isLoadingMoreReels}
              onLoadMoreVideos={handleLoadMoreReels}
              activeGiftCelebration={activeGiftCelebration}
            />
          )}

          {currentScreen === 'upload_video' && (
            <Suspense fallback={null}>
              <UploadVideoScreen
                currentUser={currentUser}
                initialVideoUrl={stagedVideoData?.url}
                initialFile={stagedVideoData?.file}
                onClose={() => {
                  if (stagedVideoData?.url?.startsWith('blob:')) {
                    URL.revokeObjectURL(stagedVideoData.url);
                  }
                  setStagedVideoData(null);
                  setCurrentScreen('videos');
                }}
                onUploadSuccess={(newVideo) => {
                  if (stagedVideoData?.url?.startsWith('blob:')) {
                    URL.revokeObjectURL(stagedVideoData.url);
                  }
                  const existingStored = profileService.getStoredVideos().filter((v) => v.id !== newVideo.id);
                  profileService.saveStoredVideos([newVideo, ...existingStored]);
                  setFirestoreReels((prev) => [newVideo, ...prev.filter((v) => v.id !== newVideo.id)]);
                  setVideos((prev) => [newVideo, ...prev.filter((v) => v.id !== newVideo.id)]);
                  setStagedVideoData(null);
                  setCurrentScreen('videos');
                }}
              />
            </Suspense>
          )}

          {currentScreen === 'profile' && (
            <ProfileScreen
              currentUser={currentUser}
              viewingUser={navigatingProfileUser}
              conversations={conversations}
              onBack={() => {
                setNavigatingProfileUser(null);
                setCurrentScreen('home');
              }}
              onSelectUser={(u) => {
                setNavigatingProfileUser(u);
              }}
              onSendMessage={handleSendMessageToUser}
              onSendGift={(u) => {
                setGiftRecipient(u);
                setIsGiftShopOpen(true);
              }}
              onUpdateProfile={handleUpdateProfile}
              onNavigate={(s) => {
                if (s !== 'profile') {
                  setNavigatingProfileUser(null);
                }
                setCurrentScreen(s);
              }}
              onOpenWallet={() => setIsWalletOpen(true)}
              onOpenVIP={() => {
                setLevelVIPInitialTab('vip');
                setIsLevelVIPOpen(true);
              }}
              onOpenLevelVIP={(tab) => {
                setLevelVIPInitialTab(tab || 'roadmap');
                setIsLevelVIPOpen(true);
              }}
              onOpenAdminPanel={() => setIsAdminProgressionOpen(true)}
              userVideos={visibleVideos}
              onSelectVideo={(_v) => setCurrentScreen('videos')}
              onOpenUploadVideo={handleOpenPlusUpload}
              onDeleteVideo={async (id) => {
                const target = videos.find((v) => v.id === id);
                if (target && (target.creatorUid === currentUser.id || target.creator.id === currentUser.id)) {
                  await deleteOwnReel(target).catch(() => {});
                }
                setFirestoreReels((prev) => prev.filter((v) => v.id !== id));
                setExtraPagedReels((prev) => prev.filter((v) => v.id !== id));
                setLegacyPostVideos((prev) => prev.filter((v) => v.id !== id));
                setVideos((prev) => prev.filter((v) => v.id !== id));
              }}
              onOpenAccountSwitcher={() => setIsAccountSwitcherOpen(true)}
              blockedUsers={blockedUsers}
              blockedByUserIds={blockedByUserIds}
              onBlockUser={handleBlockUser}
              onUnblockUser={handleUnblockUser}
            />
          )}

          {currentScreen === 'settings' && (
            <Suspense fallback={null}>
              <SettingsScreen
                currentUser={currentUser}
                onNavigate={(s) => setCurrentScreen(s)}
                onLogout={handleLogout}
                onOpenWallet={() => setIsWalletOpen(true)}
                onOpenAccountSwitcher={() => setIsAccountSwitcherOpen(true)}
                isAdmin={isAuthorizedAdmin}
                onOpenAdminProgression={() => setIsAdminProgressionOpen(true)}
                blockedUsers={blockedUsers}
                onUnblockUser={handleUnblockUser}
                moderators={myModerators}
                onRemoveModerator={handleRemoveModerator}
                onUpdateProfile={(updated) => {
                  setCurrentUser(updated);
                  saveStoredUserProfile(updated);
                }}
              />
            </Suspense>
          )}

          </main>
        </PullToRefresh>

        {/* Mobile Fixed Bottom Navigation Bar (7 Buttons: Home, Rooms, Store, +, Videos, Chat, Profile) */}
        <BottomNav
          currentScreen={currentScreen}
          onNavigate={(screen) => {
            if (screen === 'profile') {
              setNavigatingProfileUser(null);
            }
            setCurrentScreen(screen);
          }}
          onOpenCreate={handleOpenPlusUpload}
          unreadMessagesCount={unreadMessagesCount}
          storeNotificationCount={0}
        />
      </div>

      {/* Global Modals & Interactive Sheets */}
      
      {/* 1. Microphone Button Selection Modal: Exactly 2 options (1. GO LIVE, 2. CREATE ROOM) */}
      <MicSelectionModal
        isOpen={isMicSelectionOpen}
        onClose={() => setIsMicSelectionOpen(false)}
        onSelectGoLive={() => {
          void ensureNativeMediaPermissions({ video: true, audio: true });
          setCurrentScreen('create_live');
        }}
        onSelectCreateRoom={() => {
          void ensureNativeMediaPermissions({ video: false, audio: true });
          setCurrentScreen('create_room');
        }}
      />

      {/* 2. Plus (+) Button Selection Modal: Dedicated to Video Upload only (1. CAMERA, 2. GALLERY) */}
      <VideoUploadSourceModal
        isOpen={isVideoSourceModalOpen}
        onClose={() => setIsVideoSourceModalOpen(false)}
        onSelectCamera={() => setIsCameraRecorderOpen(true)}
        onSelectGalleryFile={handleGalleryFileSelected}
      />

      {/* 3. In-App Device Camera Video Recorder with review, retake, and continue */}
      <CameraRecorderModal
        isOpen={isCameraRecorderOpen}
        onClose={() => setIsCameraRecorderOpen(false)}
        onRecordingComplete={handleCameraRecordingComplete}
      />

      {/* 2. Gift Shop & Sending Panel */}
      <GiftShopModal
        isOpen={isGiftShopOpen}
        onClose={() => setIsGiftShopOpen(false)}
        currentUser={currentUser}
        recipientUser={giftRecipient}
        gifts={gifts}
        onSendGift={handleSendGift}
        onOpenWallet={() => setIsWalletOpen(true)}
      />

      {/* 3. PK Battle Arena Modal */}
      <PKBattleModal
        isOpen={isPKModalOpen}
        onClose={() => setIsPKModalOpen(false)}
        currentUser={currentUser}
        onOpenGiftShop={(r) => {
          setGiftRecipient(r);
          setIsGiftShopOpen(true);
        }}
      />

      {/* 4. Wallet & Coins Recharge Modal */}
      <Suspense fallback={null}>
        <WalletModal
          isOpen={isWalletOpen}
          onClose={() => setIsWalletOpen(false)}
          currentUser={currentUser}
          onRechargeSuccess={handleRechargeSuccess}
          onSendMessage={handleSendMessageToUser}
        />
      </Suspense>

      {/* 5. 100-LEVEL, 12-VIP, 6-SUPER-VIP & ACHIEVEMENT VAULT MODAL */}
      <Suspense fallback={null}>
        <LevelAndVIPModal
          isOpen={isLevelVIPOpen}
          onClose={() => setIsLevelVIPOpen(false)}
          currentUser={currentUser}
          initialTab={levelVIPInitialTab}
          onOpenAdminPanel={() => setIsAdminProgressionOpen(true)}
          onUpdateUser={(updated) => {
            setCurrentUser((prev) => {
              const next = { ...prev, ...updated };
              saveStoredUserProfile(next);
              return next;
            });
          }}
        />
      </Suspense>

      {/* 5b. Multi-Milestone Level Up Celebration Modal */}
      <LevelUpCelebrationModal
        isOpen={!!levelUpData}
        onClose={() => setLevelUpData(null)}
        oldLevel={levelUpData?.oldLevel || 1}
        newLevel={levelUpData?.newLevel || 2}
        coinsSpent={levelUpData?.coinsSpent || 0}
        userAvatar={currentUser.avatar}
        userName={currentUser.name}
        unlockedVipFrames={levelUpData?.unlockedVipFrames}
        unlockedSuperVipFrames={levelUpData?.unlockedSuperVipFrames}
        newlyEarnedAchievements={levelUpData?.newlyEarnedAchievements}
        onOpenRoadmap={() => {
          setLevelVIPInitialTab('roadmap');
          setIsLevelVIPOpen(true);
        }}
        onEquipVipFrame={async (tier) => {
          const res = await equipVipFrame(currentUser.id, tier);
          if (res.success) {
            setCurrentUser((prev) => {
              const next = {
                ...prev,
                activeFrameType: 'vip' as const,
                equippedVipFrame: tier,
                equippedSuperVipFrame: 0,
                vipLevel: Math.max(prev.vipLevel || 0, tier),
                isVIP: true,
              };
              saveStoredUserProfile(next);
              return next;
            });
          }
        }}
        onEquipSuperVipFrame={async (tier) => {
          const res = await equipSuperVipFrame(currentUser.id, tier);
          if (res.success) {
            setCurrentUser((prev) => {
              const next = {
                ...prev,
                activeFrameType: 'super_vip' as const,
                equippedSuperVipFrame: tier,
                equippedVipFrame: 0,
                superVipLevel: Math.max(prev.superVipLevel || 0, tier),
                isSuperVIP: true,
              };
              saveStoredUserProfile(next);
              return next;
            });
          }
        }}
      />

      {/* 5c. Admin-Only Administration Console (Strictly locked to authorized emails) */}
      {isAuthorizedAdmin && (
        <Suspense fallback={null}>
          <AdminProgressionModal
            isOpen={isAdminProgressionOpen}
            onClose={() => setIsAdminProgressionOpen(false)}
            currentUserEmail={auth.currentUser?.email || currentUser.email}
          />
        </Suspense>
      )}

      {/* VIP Membership Privileges Modal */}
      <VIPModal
        isOpen={isVIPOpen}
        onClose={() => setIsVIPOpen(false)}
        currentUser={currentUser}
        onUpgradeVIP={handleUpgradeVIP}
      />

      {/* 6. Search & Discovery Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        liveStreams={visibleLiveStreams}
        partyRooms={visiblePartyRooms}
        users={topHostsList}
        onSelectLive={handleSelectLive}
        onSelectRoom={handleSelectRoom}
        onSelectUser={(u) => setViewingProfileUser(u)}
      />

      {/* 7. Notifications Center Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onNotificationAction={handleNotificationDeepAction}
        onMarkAllRead={() => {
          const uid = auth.currentUser?.uid;
          if (!uid) return;
          const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
          if (unreadIds.length > 0) {
            void markAllNotificationsAsRead(uid, unreadIds);
          }
        }}
      />

      {/* 8. User / Host Profile Detail Modal */}
      <UserProfileModal
        user={viewingProfileUser}
        currentUserId={currentUser.id}
        isOpen={!!viewingProfileUser}
        onClose={() => setViewingProfileUser(null)}
        onToggleFollow={handleToggleFollow}
        onSendMessage={handleSendMessageToUser}
        onSendGift={(u) => {
          setGiftRecipient(u);
          setIsGiftShopOpen(true);
        }}
        isBlocked={isBlockedByMe(viewingProfileUser?.id)}
        isBlockedByTarget={isBlockedByTarget(viewingProfileUser?.id)}
        onBlockUser={handleBlockUser}
        onUnblockUser={handleUnblockUser}
        onViewFullProfile={(u) => {
          if (isBlockedByTarget(u.id)) {
            setViewingProfileUser(null);
            showAppToast('You cannot view this user\'s profile or videos.');
            return;
          }
          setViewingProfileUser(null);
          setNavigatingProfileUser(u);
          setCurrentScreen('profile');
        }}
      />

      {/* 9. Global Real-Time PK Challenge Invitation Popup */}
      <PKIncomingChallengeModal
        invitation={incomingPKInvite}
        onAccept={handleAcceptPKInvite}
        onDecline={handleDeclinePKInvite}
      />

      {/* 10. Global PK Battle Winner Announcement Modal */}
      <PKWinnerAnnouncementModal
        session={pkWinnerSession}
        currentUser={currentUser}
        isOpen={!!pkWinnerSession}
        onClose={() => setPkWinnerSession(null)}
        onRematch={() => {
          setPkWinnerSession(null);
          handleOpenPKFromNav();
        }}
        onViewHistory={() => {
          setPkWinnerSession(null);
          setCurrentScreen('profile');
        }}
      />

      {/* 11. Multi-Account Switcher Modal (Max 5 Saved Accounts) */}
      <AccountSwitcherModal
        isOpen={isAccountSwitcherOpen}
        currentUser={currentUser}
        onClose={() => setIsAccountSwitcherOpen(false)}
        onSwitchAccount={handleSwitchAccount}
        onAddAccount={handleAddAccount}
      />

      {/* 12. One-Time "Secure Your Account" Email/Password Linking Card for Google Users */}
      {showSecurePasswordModal && authenticatedUid && auth.currentUser?.email && (
        <SecureAccountPasswordCard
          email={auth.currentUser.email}
          userName={currentUser.name}
          onSuccess={({ providerIds, profile }) => {
            setCurrentUser((prev) => {
              const next: UserProfile = {
                ...prev,
                ...(profile || {}),
                providerIds,
                passwordRegistered: true,
              };
              saveStoredUserProfile(next);
              return next;
            });
            setShowSecurePasswordModal(false);
            showAppToast('Password registered! You can now log in with Email & Password or Google.');
          }}
          onLater={() => {
            if (authenticatedUid) {
              dismissedPasswordPromptUidsRef.current.add(authenticatedUid);
            }
            setShowSecurePasswordModal(false);
          }}
        />
      )}

      {/* Global Toast Feedback Banner */}
      {appToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[150] px-4 py-2.5 rounded-2xl bg-[#160b29]/95 border border-rose-500/40 text-white text-xs font-bold shadow-[0_12px_32px_rgba(0,0,0,0.65)] backdrop-blur-md text-center max-w-[90vw]">
          {appToast}
        </div>
      )}

      {/* Universal Heads-Up Push Notification Banner */}
      <PushNotificationBanner
        notification={activePushBanner}
        onDismiss={() => setActivePushBanner(null)}
        onOpen={(notif) => handleNotificationDeepAction(notif)}
      />
    </div>
  );
}
