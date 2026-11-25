import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  MoreHorizontal,
  Mic,
  MicOff,
  Plus,
  Send,
  X,
  Smile,
  UserPlus,
  Check,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  ChevronRight,
  LogOut,
  Edit2,
  Crown,
  Trash2,
  Clock,
  UserCheck,
  UserX,
  AlertTriangle,
  Lock,
  Users,
  Trophy,
  Image as ImageIcon,
  Star,
  Ban,
  ShieldOff,
  ShieldCheck,
  ArrowDownCircle,
  Reply,
  Eraser,
  Minimize2,
  Search,
  Music,
  Play,
  Pause,
  Radio,
} from 'lucide-react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { sendPushNotification } from '../../services/pushNotificationService';
import { LiveLeaderboardModal } from '../common/LiveLeaderboardModal';
import { PartyMusicPanelModal } from '../common/PartyMusicPanelModal';
import { PartyYouTubeSyncPlayer } from '../common/PartyYouTubeSyncPlayer';
import {
  PartyBackgroundPickerModal,
  PartyBackgroundSelection,
} from '../common/PartyBackgroundPickerModal';
import { PartySofaSeat } from '../common/PartySofaSeat';
import { LevelBadge } from '../common/LevelBadge';
import { SuperVipTierBadge, VipTierBadge } from '../common/AvatarWithFrame';
import {
  DEFAULT_PARTY_BACKGROUND_ID,
  PartyBackgroundType,
  extractRoomBackgroundConfig,
  normalizePartyBackgroundType,
  resolvePartyRoomBackground,
} from '../../utils/partyBackgrounds';
import {
  HostModeratorRecord,
  PartyMusicState,
  PartyMusicTrackMeta,
  PartyRoom,
  PartySofaTheme,
  RoomKickDuration,
  RoomKickRecord,
  UserProfile,
  GiftItem,
  SeatRequest,
  SeatInvitation,
  LiveViewerInfo,
} from '../../types';
import {
  acquireRealMicrophone,
  isNativeAndroidApp,
  openNativeAppSettings,
  pickNativePartyMediaFile,
  setNativeLiveAudioMode,
  stopMediaStream,
  createAudioAnalyser,
  AudioAnalyserController,
} from '../../utils/mediaDeviceHelper';
import {
  acquirePartyScreenWakeLock,
  releasePartyScreenWakeLock,
} from '../../utils/screenWakeLock';
import {
  cleanFileTrackTitle,
  LocalPartyTrackEntry,
  partyMusicEngine,
  validateGalleryMediaFile,
} from '../../utils/partyMusicEngine';
import { agoraRtcService } from '../../utils/agoraRtcService';
import { webrtcMediaService } from '../../utils/webrtcMediaService';
import { liveAndRoomService } from '../../services/liveAndRoomService';
import {
  cancelFirestoreSeatRequest,
  clearFirestoreRoomMessages,
  deleteFirestoreRoomMessage,
  editFirestoreRoomMessage,
  evictFirestoreRoomParticipant,
  FirestoreRoomHeartEvent,
  joinFirestoreRoomParticipant,
  leaveFirestoreRoomParticipant,
  respondFirestoreSeatRequest,
  sendFirestoreRoomHeart,
  sendFirestoreRoomMessage,
  submitFirestoreSeatRequest,
  subscribeFirestorePartyRoomDoc,
  subscribeFirestoreRoomMessages,
  subscribeFirestoreRoomParticipants,
  syncFirestorePartyRoomLifecycle,
  syncFirestorePartyRoomState,
  takeFirestoreSeatDirect,
  updateFirestoreRoomParticipantCount,
  updateFirestoreRoomParticipantState,
  vacateFirestoreSeat,
} from '../../services/firestoreRealtimeService';
import { EMPTY_ROOM_CLEANUP_MS } from '../../shared/roomLifecycleConfig';
import {
  ROOM_KICK_OPTIONS,
  assignHostModerator,
  formatKickDurationLabel,
  formatRemainingKickTime,
  getActiveKickForRoom,
  kickUserFromRoom,
  removeHostModerator,
  subscribeHostModerators,
  subscribeRoomKicksForHost,
  unkickUserFromRoom,
} from '../../services/roomModerationService';
import { blockUser as blockUserService } from '../../services/blockService';
import { roomService } from '../../utils/roomService';
import {
  PARTY_SEAT_TIERS,
  PartySeatCount,
  clampPartyMaxSeatsForHostLevel,
  isSeatIndexAllowedForRoom,
  isSeatLockedByHostLevel,
  isSeatModeUnlockedForLevel,
  sanitizePartySeatsForHostLevel,
  sanitizeUserLevel,
} from '../../utils/partySeatRules';

interface AudioRoomScreenProps {
  room: PartyRoom;
  currentUser: UserProfile;
  onClose: () => void;
  onOpenGiftShop?: (recipient: UserProfile) => void;
  onOpenWallet?: () => void;
  onSelectUser: (user: UserProfile) => void;
  onOpenPK?: () => void;
  onUpdateRoom?: (updatedRoom: PartyRoom) => void;
  onCloseRoom?: (roomId: string) => void;
  activeGiftCelebration?: {
    gift: GiftItem;
    sender: string;
    recipient: string;
    quantity: number;
  } | null;
  blockedUserIds?: string[];
  blockedByUserIds?: string[];
  activeRoomKicks?: RoomKickRecord[];
  onBlockUser?: (user: UserProfile) => Promise<void> | void;
  isMinimized?: boolean;
  onMinimize?: () => void;
  onMiniStateChange?: (state: {
    isSeated: boolean;
    isMicMuted: boolean;
    participantCount: number;
    seatedCount: number;
  }) => void;
  exitSignal?: number;
  toggleMicSignal?: number;
}

interface ActivityItem {
  id: string;
  userId?: string;
  name: string;
  avatar: string;
  text: string;
  level?: number;
  vipLevel?: number;
  superVipLevel?: number;
  isVIP?: boolean;
  isHost?: boolean;
  type?: 'join' | 'leave' | 'vip' | 'chat' | 'gift';
  isEdited?: boolean;
  replyTo?: {
    id: string;
    senderId?: string;
    senderName: string;
    text: string;
  };
  fromFirestore?: boolean;
}

interface FloatingHeart {
  id: number;
  x: number;
  y?: number;
  size: number;
  color: string;
  isBurst?: boolean;
}

export const AudioRoomScreen: React.FC<AudioRoomScreenProps> = ({
  room,
  currentUser,
  onClose,
  onOpenGiftShop,
  onOpenWallet,
  onSelectUser,
  onUpdateRoom,
  onCloseRoom,
  activeGiftCelebration,
  blockedUserIds = [],
  blockedByUserIds = [],
  activeRoomKicks = [],
  onBlockUser,
  isMinimized = false,
  onMinimize,
  onMiniStateChange,
  exitSignal = 0,
  toggleMicSignal = 0,
}) => {
  const isRoomHost = currentUser.id === room.host.id;
  const [hostModerators, setHostModerators] = useState<HostModeratorRecord[]>([]);
  const moderatorIdsSet = new Set(hostModerators.map((m) => m.moderatorUserId));
  const isCurrentUserModerator = !isRoomHost && moderatorIdsSet.has(currentUser.id);
  const canModerate = isRoomHost || isCurrentUserModerator;
  const canModerateTarget = (targetUserId?: string | null): boolean => {
    // Permanent Room Owner protection: Room Owner can NEVER be kicked, removed, muted, or blocked by anyone
    if (!targetUserId || targetUserId === currentUser.id || targetUserId === room.host.id) return false;
    if (isRoomHost) return true;
    if (!isCurrentUserModerator) return false;
    if (moderatorIdsSet.has(targetUserId)) return false;
    return true;
  };
  const blockedUserIdsRef = useRef<Set<string>>(new Set(blockedUserIds));
  const blockedByUserIdsRef = useRef<Set<string>>(new Set(blockedByUserIds));

  useEffect(() => {
    blockedUserIdsRef.current = new Set(blockedUserIds);
    if (isRoomHost && blockedUserIds.length > 0) {
      const blockedSet = blockedUserIdsRef.current;
      setParticipantsList((prev) => {
        const filtered = prev.filter((p) => !blockedSet.has(p.userId));
        if (filtered.length !== prev.length) {
          setParticipantTotal(filtered.length);
        }
        return filtered;
      });
      setSeatRequests((prev) => prev.filter((r) => !blockedSet.has(r.user.id)));
      setSeats((prev) => {
        let changed = false;
        const next = prev.map((s) => {
          if (s && blockedSet.has(s.id)) {
            changed = true;
            return null;
          }
          return s;
        });
        if (changed) {
          void syncFirestorePartyRoomState(room.id, true, { seats: next });
        }
        return changed ? next : prev;
      });
    }
  }, [blockedUserIds, isRoomHost, room.id]);

  useEffect(() => {
    blockedByUserIdsRef.current = new Set(blockedByUserIds);
    if (!isRoomHost && blockedByUserIds.includes(room.host.id)) {
      webrtcMediaService.stopPartyVoice();
      agoraRtcService.leaveChannel().catch(() => {});
      void leaveFirestoreRoomParticipant(room.id);
      onClose();
    }
  }, [blockedByUserIds, isRoomHost, room.host.id, room.id, onClose]);

  // Real-time Kick enforcement: if Host kicks current user (session / 24h / 15d / 30d), eject immediately (Room Owner is permanently immune)
  useEffect(() => {
    if (isRoomHost || currentUser.id === room.host.id) return;
    const activeKick = getActiveKickForRoom(activeRoomKicks, room.id, room.host.id, Date.now(), currentUser.id);
    if (activeKick) {
      hasExplicitlyLeftRef.current = true;
      webrtcMediaService.stopPartyVoice();
      agoraRtcService.leaveChannel().catch(() => {});
      void leaveFirestoreRoomParticipant(room.id);
      showToast(
        activeKick.durationType === 'session'
          ? 'You were kicked from this party stream and cannot re-enter this session.'
          : `You were kicked from this room (${formatRemainingKickTime(activeKick)}).`
      );
      const timer = setTimeout(() => {
        onClose();
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [activeRoomKicks, isRoomHost, room.id, room.host.id, onClose]);

  const [liveHostLevel, setLiveHostLevel] = useState<number>(() =>
    sanitizeUserLevel(isRoomHost ? currentUser.level : room.host.level)
  );
  const hostLevel = isRoomHost ? sanitizeUserLevel(currentUser.level) : liveHostLevel;
  const hostLevelRef = useRef<number>(hostLevel);
  hostLevelRef.current = hostLevel;

  const [maxSeats, setMaxSeats] = useState<PartySeatCount>(() =>
    clampPartyMaxSeatsForHostLevel(room.maxSeats, hostLevel)
  );
  const maxSeatsRef = useRef<PartySeatCount>(maxSeats);
  maxSeatsRef.current = maxSeats;
  const isCoHostSeatLevelLocked = isSeatLockedByHostLevel(1, hostLevel);

  // Strictly mirror server seat occupancy while enforcing host-level maxSeats
  const normalizeSeats = (
    raw?: (UserProfile | null)[],
    count: number = maxSeatsRef.current,
    level: number = hostLevelRef.current
  ): (UserProfile | null)[] => sanitizePartySeatsForHostLevel(raw, count, level);

  const profileToViewerInfo = (u: UserProfile, isHostFlag: boolean): LiveViewerInfo => {
    const now = Date.now();
    return {
      userId: u.id,
      name: u.name || 'User',
      username: u.username || '',
      avatar: u.avatar || '',
      level: typeof u.level === 'number' ? u.level : 0,
      vipLevel: typeof u.vipLevel === 'number' ? u.vipLevel : 0,
      superVipLevel: typeof u.superVipLevel === 'number' ? u.superVipLevel : 0,
      isVIP: Boolean(u.isVIP || (u.vipLevel || 0) > 0),
      isSuperVIP: Boolean(u.isSuperVIP || (u.superVipLevel || 0) > 0),
      isHost: isHostFlag,
      joinedAt: now,
      lastSeen: now,
    };
  };

  const [seats, setSeats] = useState<(UserProfile | null)[]>(() =>
    normalizeSeats(room.seats, clampPartyMaxSeatsForHostLevel(room.maxSeats, hostLevel), hostLevel)
  );
  const [mutedSeatIndices, setMutedSeatIndices] = useState<number[]>(room.mutedSeatIndices || []);
  const [seatRequests, setSeatRequests] = useState<SeatRequest[]>(room.seatRequests || []);
  const [participantsList, setParticipantsList] = useState<LiveViewerInfo[]>(() => {
    const initialSeats = normalizeSeats(
      room.seats,
      clampPartyMaxSeatsForHostLevel(room.maxSeats, hostLevel),
      hostLevel
    );
    const map = new Map<string, LiveViewerInfo>();
    map.set(currentUser.id, profileToViewerInfo(currentUser, isRoomHost));
    initialSeats.forEach((seatUser) => {
      if (seatUser?.id && !map.has(seatUser.id)) {
        map.set(seatUser.id, profileToViewerInfo(seatUser, seatUser.id === room.host.id));
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.isHost ? -1 : b.isHost ? 1 : 0));
  });
  const [participantTotal, setParticipantTotal] = useState<number>(() => {
    const initialSeats = normalizeSeats(
      room.seats,
      clampPartyMaxSeatsForHostLevel(room.maxSeats, hostLevel),
      hostLevel
    );
    const seededIds = new Set<string>([currentUser.id]);
    initialSeats.forEach((s) => {
      if (s?.id) seededIds.add(s.id);
    });
    return Math.max(seededIds.size, room.numericParticipants ?? 0);
  });

  const userSeatIndex = seats.findIndex((s) => s?.id === currentUser.id);
  const isCurrentlySeated = userSeatIndex !== -1;
  const isHostMutedOnMySeat = userSeatIndex !== -1 && mutedSeatIndices.includes(userSeatIndex);

  // Modals & Interactive States
  const [showSeatRequestsModal, setShowSeatRequestsModal] = useState(false);
  const [requestTargetSeat, setRequestTargetSeat] = useState<number | null>(null);
  const [showRequestConfirmModal, setShowRequestConfirmModal] = useState(false);
  const [showInviteToSeatModal, setShowInviteToSeatModal] = useState<number | null>(null);
  const [inviteModalTab, setInviteModalTab] = useState<'room' | 'users'>('room');
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [invitableUsers, setInvitableUsers] = useState<UserProfile[]>([]);
  const [inviteUsersLoading, setInviteUsersLoading] = useState(false);
  const [invitedUserIds, setInvitedUserIds] = useState<Record<string, boolean>>({});
  const [incomingSeatInvite, setIncomingSeatInvite] = useState<SeatInvitation | null>(null);
  const [selectedSeatMember, setSelectedSeatMember] = useState<{ index: number | null; user: UserProfile } | null>(null);
  const [showKickDurationPicker, setShowKickDurationPicker] = useState(false);
  const [showBlockMemberConfirm, setShowBlockMemberConfirm] = useState(false);
  const [moderationBusy, setModerationBusy] = useState(false);
  const [hostRoomKicks, setHostRoomKicks] = useState<RoomKickRecord[]>([]);
  const [showKickedUsersModal, setShowKickedUsersModal] = useState(false);
  const [showModeratorsListModal, setShowModeratorsListModal] = useState(false);
  const [showClearChatConfirmModal, setShowClearChatConfirmModal] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);
  const [showOwnerSeatChoice, setShowOwnerSeatChoice] = useState<number | null>(null);
  const [showCloseRoomConfirmModal, setShowCloseRoomConfirmModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showExitRoomModal, setShowExitRoomModal] = useState(false);
  const [showMySeatModal, setShowMySeatModal] = useState<number | null>(null);

  // Microphone, Speaker & Real Speaking States (NO simulated Math.random intervals)
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [partyEntryNotice, setPartyEntryNotice] = useState<{
    id: string;
    userId?: string;
    name: string;
    level?: number;
    vipLevel?: number;
    superVipLevel?: number;
    isVIP?: boolean;
  } | null>(null);
  const [speakingSeats, setSpeakingSeats] = useState<Record<number, number>>({});
  const [realMicVolume, setRealMicVolume] = useState(0);
  const [agoraVoiceState, setAgoraVoiceState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [voiceTransport, setVoiceTransport] = useState<'agora' | 'webrtc' | 'connecting'>('connecting');

  const realMicStreamRef = useRef<MediaStream | null>(null);
  const realMicAnalyserRef = useRef<AudioAnalyserController | null>(null);
  const realMicRafRef = useRef<number | null>(null);
  const hasExplicitlyLeftRef = useRef<boolean>(false);
  const voiceJoinedRef = useRef<boolean>(false);
  const activePublishedRoleRef = useRef<'host' | 'audience' | null>(null);
  const pendingPromotedAgoraTokenRef = useRef<string | null>(null);
  const hadPendingSeatReqRef = useRef<boolean>(false);
  const cancelledOwnReqRef = useRef<boolean>(false);
  const selfLeftSeatRef = useRef<boolean>(false);
  const kickedToastShownAtRef = useRef<number>(0);
  const seenHeartEventIdsRef = useRef<Set<string>>(new Set());
  const lastStageTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const pendingHeartBatchRef = useRef<{ count: number; x?: number; y?: number }>({ count: 0 });
  const heartBatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const partyEntryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenPartyEntriesRef = useRef<Map<string, number>>(new Map());
  const seenPartyLeavesRef = useRef<Map<string, number>>(new Map());
  const voiceTransportRef = useRef<'agora' | 'webrtc' | 'connecting'>('connecting');
  voiceTransportRef.current = voiceTransport;
  const isMicMutedRef = useRef<boolean>(isMicMuted);
  isMicMutedRef.current = isMicMuted;
  const mutedSeatIndicesRef = useRef<number[]>(mutedSeatIndices);
  mutedSeatIndicesRef.current = mutedSeatIndices;
  const seatsRef = useRef<(UserProfile | null)[]>(seats);
  seatsRef.current = seats;
  const participantsListRef = useRef<LiveViewerInfo[]>(participantsList);
  participantsListRef.current = participantsList;
  const participantTotalRef = useRef<number>(participantTotal);
  participantTotalRef.current = participantTotal;
  const recentlyLeftUserIdsRef = useRef<Map<string, number>>(new Map());
  const hasFsParticipantsRef = useRef<boolean>(false);
  const roomEnteredAtRef = useRef<number>(Date.now());
  const preEntryMsgIdsRef = useRef<Set<string>>(new Set());
  const fsMessagesBaselineCapturedRef = useRef<boolean>(false);
  const optimisticSentMsgIdsRef = useRef<Set<string>>(new Set());

  const RECENTLY_LEFT_TTL_MS = 4000;

  const isUserRecentlyLeft = (userId: string): boolean => {
    const leftAt = recentlyLeftUserIdsRef.current.get(userId);
    if (!leftAt) return false;
    if (Date.now() - leftAt > RECENTLY_LEFT_TTL_MS) {
      recentlyLeftUserIdsRef.current.delete(userId);
      return false;
    }
    return true;
  };

  const markUserRecentlyLeft = (userId: string) => {
    if (!userId) return;
    recentlyLeftUserIdsRef.current.set(userId, Date.now());
  };

  const clearUserRecentlyLeft = (userId: string) => {
    if (!userId) return;
    recentlyLeftUserIdsRef.current.delete(userId);
  };

  const reconcileParticipantsWithSeats = (
    baseParticipants: LiveViewerInfo[],
    currentSeats: (UserProfile | null)[],
    excludeIds?: Set<string>
  ): LiveViewerInfo[] => {
    const seatedIds = new Set<string>();
    const map = new Map<string, LiveViewerInfo>();

    baseParticipants.forEach((p) => {
      if (!p?.userId) return;
      if (isRoomHost && blockedUserIdsRef.current.has(p.userId)) return;
      if (excludeIds?.has(p.userId)) return;
      if (isUserRecentlyLeft(p.userId)) return;
      map.set(p.userId, p);
    });

    currentSeats.forEach((seatUser) => {
      if (!seatUser?.id) return;
      if (isRoomHost && blockedUserIdsRef.current.has(seatUser.id)) return;
      if (excludeIds?.has(seatUser.id)) return;
      if (isUserRecentlyLeft(seatUser.id)) return;
      seatedIds.add(seatUser.id);
      const existing = map.get(seatUser.id);
      if (!existing) {
        map.set(seatUser.id, profileToViewerInfo(seatUser, seatUser.id === room.host.id));
      } else {
        map.set(seatUser.id, {
          ...existing,
          name: seatUser.name || existing.name,
          username: seatUser.username || existing.username,
          avatar: seatUser.avatar || existing.avatar,
          level: typeof seatUser.level === 'number' ? seatUser.level : existing.level,
          vipLevel: typeof seatUser.vipLevel === 'number' ? seatUser.vipLevel : existing.vipLevel,
          superVipLevel:
            typeof seatUser.superVipLevel === 'number'
              ? seatUser.superVipLevel
              : existing.superVipLevel,
          isVIP: Boolean(seatUser.isVIP || (seatUser.vipLevel || 0) > 0 || existing.isVIP),
          isSuperVIP: Boolean(
            seatUser.isSuperVIP || (seatUser.superVipLevel || 0) > 0 || existing.isSuperVIP
          ),
          isHost: existing.isHost || seatUser.id === room.host.id,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.isHost && !b.isHost) return -1;
      if (!a.isHost && b.isHost) return 1;
      const aSeated = seatedIds.has(a.userId);
      const bSeated = seatedIds.has(b.userId);
      if (aSeated && !bSeated) return -1;
      if (!aSeated && bSeated) return 1;
      return (a.joinedAt || 0) - (b.joinedAt || 0);
    });
  };

  // Settings & Announcements
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showEditAnnouncementModal, setShowEditAnnouncementModal] = useState(false);

  // Global Party Music State (Server-Authoritative Sync + Host Audio Distribution)
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [partyMusicState, setPartyMusicState] = useState<PartyMusicState>(() =>
    room.musicState || {
      roomId: room.id,
      hostId: room.host.id,
      status: 'idle',
      activeTrack: null,
      queue: [],
      currentIndex: -1,
      positionSec: 0,
      volume: 65,
      updatedAt: Date.now(),
      updatedBy: room.host.id,
      audioTransport: 'none',
    }
  );
  const partyMusicStateRef = useRef<PartyMusicState>(partyMusicState);
  partyMusicStateRef.current = partyMusicState;
  const [musicClockOffsetMs, setMusicClockOffsetMs] = useState(0);
  const [musicDisplayPosSec, setMusicDisplayPosSec] = useState(0);
  const [musicDisplayDurSec, setMusicDisplayDurSec] = useState(0);
  const [musicLoadingTrack, setMusicLoadingTrack] = useState(false);
  const [musicErrorMessage, setMusicErrorMessage] = useState<string | null>(null);
  const [localListenerMusicVol, setLocalListenerMusicVol] = useState(80);
  const localMusicEntriesRef = useRef<Map<string, LocalPartyTrackEntry>>(new Map());
  const musicAutoNextGuardRef = useRef<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [roomLikesCount, setRoomLikesCount] = useState<number>(room.likesCount || 0);
  const [roomAnnouncement, setRoomAnnouncement] = useState(
    room.announcement || 'Welcome! Hop on a seat, respect everyone & enjoy the party.'
  );
  const [isSeatLocked, setIsSeatLocked] = useState(Boolean(room.isLocked));
  const [isAllowJoin, setIsAllowJoin] = useState(room.allowJoin !== false);

  // Synced Party Room Stage Background (Preset Themes, Host DP, or Custom Gallery Photo)
  const initialBg = extractRoomBackgroundConfig(room);
  const [backgroundType, setBackgroundType] = useState<PartyBackgroundType>(initialBg.backgroundType);
  const [backgroundId, setBackgroundId] = useState<string>(initialBg.backgroundId);
  const [backgroundImage, setBackgroundImage] = useState<string>(initialBg.backgroundImage);
  const [seatTheme, setSeatTheme] = useState<PartySofaTheme>(
    room.seatTheme === 'gold' || room.seatTheme === 'green' ? room.seatTheme : 'default'
  );
  const backgroundRef = useRef({
    backgroundType: initialBg.backgroundType,
    backgroundId: initialBg.backgroundId,
    backgroundImage: initialBg.backgroundImage,
  });
  backgroundRef.current = { backgroundType, backgroundId, backgroundImage };

  // Floating Hearts & Chat Activities (Zero Mock Data)
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [replyTarget, setReplyTarget] = useState<{
    id: string;
    senderId?: string;
    senderName: string;
    text: string;
  } | null>(null);
  const [editingComment, setEditingComment] = useState<{
    id: string;
    originalText: string;
  } | null>(null);
  const [swipingMsgId, setSwipingMsgId] = useState<string | null>(null);
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);
  const swipeTouchRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    triggered: boolean;
  } | null>(null);
  const lastChatClearedAtRef = useRef<number>(
    typeof room.chatClearedAt === 'number' ? room.chatClearedAt : 0
  );
  const chatInputRef = useRef<HTMLInputElement>(null);
  const activityBottomRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  const spawnHeartVisual = (xPercent: number, yPercent?: number, isBurst = false) => {
    const colors = ['#FF2A85', '#FF6090', '#FA26A0', '#FFB703', '#C77DFF', '#FF4D8D'];
    const newHeart: FloatingHeart = {
      id: Date.now() + Math.random(),
      x: Math.max(6, Math.min(94, xPercent)),
      y: typeof yPercent === 'number' ? Math.max(12, Math.min(86, yPercent)) : undefined,
      size: isBurst ? 34 + Math.random() * 14 : 24 + Math.random() * 14,
      color: colors[Math.floor(Math.random() * colors.length)],
      isBurst,
    };
    setFloatingHearts((prev) => [...prev.slice(-28), newHeart]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, isBurst ? 1150 : 2000);
  };

  useEffect(() => {
    return () => {
      if (heartBatchTimerRef.current) {
        clearTimeout(heartBatchTimerRef.current);
        heartBatchTimerRef.current = null;
      }
    };
  }, []);

  const prevSeatedRef = useRef<boolean>(isCurrentlySeated);
  const seenSeatReqIdsRef = useRef<Set<string>>(new Set((room.seatRequests || []).map((r) => r.id)));
  const seatReqHydratedRef = useRef<boolean>(false);

  // Update local room snapshot when prop changes
  useEffect(() => {
    const initialLvl = sanitizeUserLevel(isRoomHost ? currentUser.level : room.host.level);
    setLiveHostLevel(initialLvl);
    const nextMax = clampPartyMaxSeatsForHostLevel(room.maxSeats, initialLvl);
    setMaxSeats(nextMax);
    setSeats(normalizeSeats(room.seats, nextMax, initialLvl));
    if (room.mutedSeatIndices) setMutedSeatIndices(room.mutedSeatIndices.filter((i) => i < nextMax));
    if (room.seatRequests) {
      setSeatRequests(
        room.seatRequests.filter(
          (r) => r.seatIndex >= 0 && r.seatIndex < nextMax && !isSeatLockedByHostLevel(r.seatIndex, initialLvl)
        )
      );
    }
    const nextBg = extractRoomBackgroundConfig(room);
    setBackgroundType(nextBg.backgroundType);
    setBackgroundId(nextBg.backgroundId);
    setBackgroundImage(nextBg.backgroundImage);
    setSeatTheme(room.seatTheme === 'gold' || room.seatTheme === 'green' ? room.seatTheme : 'default');
    seenSeatReqIdsRef.current = new Set((room.seatRequests || []).map((r) => r.id));
    seatReqHydratedRef.current = false;
  }, [room.id]);

  // Real-time subscription to this Host's lifetime Moderators (visible to everyone in the room)
  useEffect(() => {
    if (!room.host.id) {
      setHostModerators([]);
      return;
    }
    return subscribeHostModerators(room.host.id, (records) => {
      setHostModerators(records);
    });
  }, [room.host.id]);

  // Host & Moderators subscribe to active kicks for this room so they can review or lift kicks
  useEffect(() => {
    if (!canModerate) {
      setHostRoomKicks([]);
      return;
    }
    return subscribeRoomKicksForHost(room.id, room.host.id, (records) => {
      setHostRoomKicks(records);
    });
  }, [canModerate, room.id, room.host.id]);

  // Keep maxSeats and host.level synchronized WITHOUT ever wiping already-occupied seats
  useEffect(() => {
    const occupiedCount = seatsRef.current.length;
    const desiredMax = clampPartyMaxSeatsForHostLevel(maxSeatsRef.current, hostLevel);
    const safeMax: PartySeatCount =
      occupiedCount >= 16 ? 16 : occupiedCount >= 8 ? Math.max(8, desiredMax) as PartySeatCount : desiredMax;

    if (safeMax !== maxSeatsRef.current) {
      setMaxSeats(safeMax);
      maxSeatsRef.current = safeMax;
    }

    if (isRoomHost) {
      const storedHostLevel = sanitizeUserLevel(room.host?.level);
      if (storedHostLevel !== hostLevel) {
        void syncFirestorePartyRoomState(room.id, true, {
          host: { ...room.host, ...currentUser, level: hostLevel },
          hostLevel,
        });
      }
    }
  }, [hostLevel, isRoomHost, room.id]);

  // Notify viewer immediately when Host approves them onto a seat or kicks them from a seat (Firestore + WS)
  useEffect(() => {
    if (!isRoomHost && !prevSeatedRef.current && isCurrentlySeated && userSeatIndex !== -1) {
      showToast(`Approved! You are now on Seat #${userSeatIndex + 1} — mic is live.`);
    } else if (!isRoomHost && prevSeatedRef.current && !isCurrentlySeated) {
      if (!selfLeftSeatRef.current && !hasExplicitlyLeftRef.current) {
        const now = Date.now();
        if (now - kickedToastShownAtRef.current > 2500) {
          kickedToastShownAtRef.current = now;
          showToast('You were removed from the seat by Host');
        }
      }
      selfLeftSeatRef.current = false;
    }
    prevSeatedRef.current = isCurrentlySeated;
  }, [isCurrentlySeated, userSeatIndex, isRoomHost]);

  // Notify Host & Moderators immediately when a new viewer seat request arrives via Firestore or WS
  useEffect(() => {
    if (!seatReqHydratedRef.current) {
      seatRequests.forEach((r) => seenSeatReqIdsRef.current.add(r.id));
      seatReqHydratedRef.current = true;
      return;
    }
    if (canModerate) {
      for (const req of seatRequests) {
        if (req?.id && !seenSeatReqIdsRef.current.has(req.id) && req.user?.id !== currentUser.id) {
          seenSeatReqIdsRef.current.add(req.id);
          showToast(`${req.user.name} requested Seat #${req.seatIndex + 1}`);
        }
      }
    }
  }, [seatRequests, canModerate, currentUser.id]);

  // Unlock browser / Android WebView remote audio automatically on the user's first tap anywhere in the room
  useEffect(() => {
    if (isSpeakerMuted) return;
    const unlockAudioOnGesture = () => {
      agoraRtcService.resumeRemoteAudio();
      webrtcMediaService.resumePartyRemoteAudio();
      setAutoplayBlocked(false);
    };
    window.addEventListener('pointerdown', unlockAudioOnGesture, { passive: true });
    window.addEventListener('touchstart', unlockAudioOnGesture, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudioOnGesture);
      window.removeEventListener('touchstart', unlockAudioOnGesture);
    };
  }, [isSpeakerMuted]);

  // FEATURE 1: Keep mobile/Android screen permanently awake during the entire active Party Room session
  // (Party Host, seated participants, AND non-seated listeners). Released automatically upon leaving/closing.
  useEffect(() => {
    const wakeOwnerId = `party_room_${room.id}_${currentUser.id}`;
    void acquirePartyScreenWakeLock(wakeOwnerId);
    return () => {
      void releasePartyScreenWakeLock(wakeOwnerId);
    };
  }, [room.id, currentUser.id]);

  // Sync local Host monitor mute with room Speaker toggle without interrupting remote Party Music distribution
  useEffect(() => {
    if (isRoomHost) {
      partyMusicEngine.setLocalHostMuted(isSpeakerMuted);
    }
  }, [isRoomHost, isSpeakerMuted]);

  // Subscribe to Host-side local audio distribution engine progress & errors + cleanup on room exit
  useEffect(() => {
    if (!isRoomHost) return;
    const unsubStatus = partyMusicEngine.subscribe((eng) => {
      if (eng.status === 'loading') {
        setMusicLoadingTrack(true);
      } else {
        setMusicLoadingTrack(false);
      }
      if (eng.error) {
        setMusicErrorMessage(eng.error);
      }
      if (eng.status === 'playing' || eng.status === 'paused') {
        setMusicDisplayPosSec(eng.currentTimeSec);
        if (eng.durationSec > 0) setMusicDisplayDurSec(eng.durationSec);
      }
    });
    const unsubEnded = partyMusicEngine.onTrackEnded((finishedTrackId) => {
      if (musicAutoNextGuardRef.current === finishedTrackId) return;
      musicAutoNextGuardRef.current = finishedTrackId;
      void handleMusicNextTrackRef.current?.();
    });
    return () => {
      unsubStatus();
      unsubEnded();
      void partyMusicEngine.stop();
      localMusicEntriesRef.current.forEach((entry) => {
        if (entry.objectUrl) {
          try {
            URL.revokeObjectURL(entry.objectUrl);
          } catch {
            // ignore
          }
        }
      });
      localMusicEntriesRef.current.clear();
    };
  }, [isRoomHost, room.id]);

  // Keep synchronized progress clock advancing smoothly for all listeners & YouTube sync
  useEffect(() => {
    const st = partyMusicState;
    if (!st.activeTrack || st.status === 'idle' || st.status === 'stopped') {
      setMusicDisplayPosSec(0);
      setMusicDisplayDurSec(0);
      return;
    }
    if (st.activeTrack.durationSec > 0) {
      setMusicDisplayDurSec(st.activeTrack.durationSec);
    }
    if (st.status === 'paused') {
      setMusicDisplayPosSec(st.positionSec || 0);
      return;
    }
    // Host local RTC tracks update displayPos directly from partyMusicEngine; listeners & YouTube compute synced pos
    if (isRoomHost && st.activeTrack.sourceType !== 'youtube') return;

    const updateSyncedPos = () => {
      const approxServerNow = Date.now() + musicClockOffsetMs;
      const refTime = st.serverTime || st.updatedAt || approxServerNow;
      const elapsed = Math.max(0, (approxServerNow - refTime) / 1000);
      const nextPos = (st.positionSec || 0) + elapsed;
      const dur = st.activeTrack?.durationSec || 0;
      setMusicDisplayPosSec(dur > 0 ? Math.min(dur, nextPos) : nextPos);
    };
    updateSyncedPos();
    const timer = setInterval(updateSyncedPos, 500);
    return () => clearInterval(timer);
  }, [
    isRoomHost,
    musicClockOffsetMs,
    partyMusicState.status,
    partyMusicState.activeTrack?.id,
    partyMusicState.activeTrack?.sourceType,
    partyMusicState.activeTrack?.durationSec,
    partyMusicState.positionSec,
    partyMusicState.updatedAt,
    partyMusicState.serverTime,
  ]);

  // Real-Time Backend, WebSocket & Cloud Firestore Room Lifecycle (15s Heartbeat + Strict Real-Time Participants Only)
  useEffect(() => {
    let active = true;
    hasExplicitlyLeftRef.current = false;
    // Reset comments & establish fresh entry baseline so users never see historical messages from before entry
    roomEnteredAtRef.current = Date.now();
    preEntryMsgIdsRef.current = new Set();
    fsMessagesBaselineCapturedRef.current = false;
    optimisticSentMsgIdsRef.current = new Set();
    setActivities([]);

    const knownParticipantIds = new Set<string>([currentUser.id]);
    let prevFsParticipantIds = new Set<string>();
    let fsParticipantsInitialized = false;
    hasFsParticipantsRef.current = false;
    recentlyLeftUserIdsRef.current.clear();

    liveAndRoomService.setCurrentUser(currentUser.id);
    liveAndRoomService.subscribeRoom(room.id, currentUser.id);

    // Register real-time participant presence in Cloud Firestore (works even when Railway API is 502)
    void joinFirestoreRoomParticipant(
      room.id,
      currentUser,
      isRoomHost,
      seatsRef.current.some((s) => s?.id === currentUser.id)
    );

    const applyServerRoomState = (nextRoom: PartyRoom, allowSeatClear = false, excludeUserId?: string) => {
      const effectiveLevel = isRoomHost
        ? hostLevelRef.current
        : typeof nextRoom.host?.level === 'number'
        ? sanitizeUserLevel(nextRoom.host.level)
        : hostLevelRef.current;
      if (!isRoomHost && typeof nextRoom.host?.level === 'number') {
        setLiveHostLevel(effectiveLevel);
      }
      const incomingMax = [5, 8, 16].includes(Number(nextRoom.maxSeats))
        ? Number(nextRoom.maxSeats)
        : clampPartyMaxSeatsForHostLevel(nextRoom.maxSeats ?? maxSeatsRef.current, effectiveLevel);
      const nextMax = Math.max(incomingMax, maxSeatsRef.current, Array.isArray(nextRoom.seats) ? nextRoom.seats.length : 0);
      const incomingSeatsRaw: (UserProfile | null)[] = Array.isArray(nextRoom.seats) ? nextRoom.seats : [];
      const currentSeats = seatsRef.current;
      // Prevent stale/freshly-hydrated server memory (which may have all-null seats after restart)
      // from knocking the Host or seated speakers off their active seats, while always allowing
      // explicit departures or seat vacates to clear immediately.
      const mergedSeats: (UserProfile | null)[] = Array.from({ length: nextMax }, (_, idx) => {
        const inc = incomingSeatsRaw[idx] || null;
        if (inc) {
          if (excludeUserId && inc.id === excludeUserId) return null;
          if (isUserRecentlyLeft(inc.id)) return null;
          return inc;
        }
        if (!allowSeatClear && currentSeats[idx]) {
          if (excludeUserId && currentSeats[idx]?.id === excludeUserId) return null;
          if (currentSeats[idx]?.id && isUserRecentlyLeft(currentSeats[idx]!.id)) return null;
          return currentSeats[idx];
        }
        return null;
      });
      setMaxSeats(nextMax as PartySeatCount);
      setSeats(mergedSeats);
      seatsRef.current = mergedSeats;
      if (Array.isArray(nextRoom.mutedSeatIndices)) {
        setMutedSeatIndices(nextRoom.mutedSeatIndices.filter((i) => i < nextMax));
      }
      setIsSeatLocked(Boolean(nextRoom.isLocked));
      setIsAllowJoin(nextRoom.allowJoin !== false);
      if (nextRoom.announcement !== undefined) setRoomAnnouncement(nextRoom.announcement);
      if (nextRoom.backgroundType !== undefined) {
        setBackgroundType(normalizePartyBackgroundType(nextRoom.backgroundType));
      }
      if (typeof nextRoom.backgroundId === 'string' && nextRoom.backgroundId.trim()) {
        setBackgroundId(nextRoom.backgroundId.trim());
      }
      if (typeof nextRoom.backgroundImage === 'string') {
        setBackgroundImage(nextRoom.backgroundImage);
      }
      if (nextRoom.seatTheme === 'default' || nextRoom.seatTheme === 'gold' || nextRoom.seatTheme === 'green') {
        setSeatTheme(nextRoom.seatTheme);
      }
      const excludeSet = excludeUserId ? new Set([excludeUserId]) : undefined;
      const nextParticipants = reconcileParticipantsWithSeats(
        participantsListRef.current,
        mergedSeats,
        excludeSet
      );
      setParticipantsList(nextParticipants);
      participantsListRef.current = nextParticipants;
      const nextCount = nextParticipants.length;
      setParticipantTotal(nextCount);
      participantTotalRef.current = nextCount;
      onUpdateRoom?.({
        ...nextRoom,
        maxSeats: nextMax as PartySeatCount,
        seats: mergedSeats,
        numericParticipants: nextCount,
        participantCount: String(nextCount),
      });
    };

    const refreshRealTimeParticipants = () => {
      liveAndRoomService.fetchRoomParticipants(room.id, 1, 50).then((res) => {
        if (!active || res.participants.length === 0) return;
        // When Firestore real-time participants stream is already active, do not let a stale
        // Express snapshot resurrect departed users.
        if (hasFsParticipantsRef.current) return;
        const reconciled = reconcileParticipantsWithSeats(res.participants, seatsRef.current);
        setParticipantsList(reconciled);
        participantsListRef.current = reconciled;
        setParticipantTotal(reconciled.length);
        participantTotalRef.current = reconciled.length;
      });
    };

    void syncFirestorePartyRoomLifecycle(room.id, {
      status: 'active',
      emptySince: null,
      closesAt: null,
      ...(isRoomHost ? { hostPresent: true } : {}),
    });

    const applyIncomingMusicState = (incoming?: PartyMusicState | null, serverTime?: number) => {
      if (!incoming || typeof incoming !== 'object') return;
      const refServerTime = typeof serverTime === 'number' ? serverTime : incoming.serverTime;
      if (typeof refServerTime === 'number' && refServerTime > 0) {
        setMusicClockOffsetMs(refServerTime - Date.now());
      }
      setPartyMusicState(incoming);
    };

    liveAndRoomService
      .joinPartyRoom(room.id, currentUser, room.password)
      .then((res) => {
        if (!active) return;
        if (res.room) {
          applyServerRoomState(res.room);
        }
        applyIncomingMusicState(res.musicState || res.room?.musicState);
        if (Array.isArray(res.participants) && res.participants.length > 0 && !hasFsParticipantsRef.current) {
          const reconciled = reconcileParticipantsWithSeats(res.participants, seatsRef.current);
          setParticipantsList(reconciled);
          participantsListRef.current = reconciled;
          setParticipantTotal(reconciled.length);
          participantTotalRef.current = reconciled.length;
        } else if (!hasFsParticipantsRef.current) {
          refreshRealTimeParticipants();
        }
        if (Array.isArray(res.pendingRequests) && res.pendingRequests.length > 0) {
          const incoming = res.pendingRequests
            .filter((r: any) => r?.user?.id && (!isRoomHost || !blockedUserIdsRef.current.has(r.user.id)))
            .map((r: any) => ({
              id: r.id,
              user: r.user,
              seatIndex: r.requestedSeatIndex ?? r.seatIndex ?? 1,
              requestedAt: r.createdAt || r.requestedAt || Date.now(),
            }));
          if (incoming.length > 0) {
            setSeatRequests((prev) => {
              const byUser = new Map<string, SeatRequest>();
              prev.forEach((p) => byUser.set(p.user.id, p));
              incoming.forEach((inc) => byUser.set(inc.user.id, inc));
              return Array.from(byUser.values());
            });
          }
        }
        // Intentionally ignore historical res.messages so entering/re-entering users only see new comments from this moment onward.
      })
      .catch((err) => {
        const msg = String(err?.message || err || '');
        if (!isRoomHost && /block|403|forbidden/i.test(msg)) {
          showToast('You cannot join or interact with this party room.');
          webrtcMediaService.stopPartyVoice();
          agoraRtcService.leaveChannel().catch(() => {});
          void leaveFirestoreRoomParticipant(room.id);
          setTimeout(() => {
            if (active) onClose();
          }, 900);
          return;
        }
        console.warn('[AudioRoom] Backend join fallback to Firestore:', msg);
      });

    const emitPartyLeaveNotification = (departed: {
      userId: string;
      name: string;
      avatar?: string;
      level?: number;
      vipLevel?: number;
      superVipLevel?: number;
      isVIP?: boolean;
      isHost?: boolean;
    }) => {
      if (!departed.userId || departed.userId === currentUser.id) return;
      if (isRoomHost && blockedUserIdsRef.current.has(departed.userId)) return;
      const now = Date.now();
      const lastLeftAt = seenPartyLeavesRef.current.get(departed.userId) || 0;
      if (now - lastLeftAt < 10000) return;
      seenPartyLeavesRef.current.set(departed.userId, now);
      setActivities((prev) => [
        ...prev.slice(-49),
        {
          id: `leave_${departed.userId}_${now}`,
          userId: departed.userId,
          name: departed.name || 'Viewer',
          avatar: departed.avatar || '',
          text: 'left the party.',
          level: typeof departed.level === 'number' ? departed.level : 0,
          vipLevel: typeof departed.vipLevel === 'number' ? departed.vipLevel : 0,
          superVipLevel: typeof departed.superVipLevel === 'number' ? departed.superVipLevel : 0,
          isVIP: Boolean(departed.isVIP || (departed.vipLevel || 0) > 0),
          isHost: Boolean(departed.isHost),
          type: 'leave',
        },
      ]);
      setTimeout(() => activityBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 40);
    };

    // Cloud Firestore real-time participants subscription (authoritative for live joins & leaves)
    const unsubFsParticipants = subscribeFirestoreRoomParticipants(
      room.id,
      (rawFsParticipants, _rawDocs, removedParticipants) => {
      if (!active) return;
      hasFsParticipantsRef.current = true;
      const fsParticipants = isRoomHost
        ? rawFsParticipants.filter((p) => !blockedUserIdsRef.current.has(p.userId))
        : rawFsParticipants;

      const currentFsIds = new Set<string>();
      fsParticipants.forEach((p) => {
        currentFsIds.add(p.userId);
        // If a user re-joined cleanly after recently leaving, clear the recently-left guard
        const leftAt = recentlyLeftUserIdsRef.current.get(p.userId);
        if (leftAt && (p.joinedAt || 0) > leftAt) {
          clearUserRecentlyLeft(p.userId);
        }
      });

      const departedIds = new Set<string>();
      if (!fsParticipantsInitialized) {
        fsParticipantsInitialized = true;
        fsParticipants.forEach((p) => knownParticipantIds.add(p.userId));
      } else {
        // Explicit leave notifications ONLY for Firestore doc deletions (not temporary disconnects or minimizes)
        removedParticipants.forEach((removedUser) => {
          if (!removedUser?.userId || removedUser.userId === currentUser.id) return;
          const cachedPrev = participantsListRef.current.find((p) => p.userId === removedUser.userId);
          const seatedPrev = seatsRef.current.find((s) => s?.id === removedUser.userId);
          const resolvedName =
            removedUser.name && removedUser.name !== 'User'
              ? removedUser.name
              : cachedPrev?.name || seatedPrev?.name || (removedUser.userId === room.host.id ? room.host.name : 'Viewer');
          emitPartyLeaveNotification({
            userId: removedUser.userId,
            name: resolvedName,
            avatar: removedUser.avatar || cachedPrev?.avatar || seatedPrev?.avatar || '',
            level: removedUser.level ?? cachedPrev?.level ?? seatedPrev?.level ?? 0,
            vipLevel: removedUser.vipLevel ?? cachedPrev?.vipLevel ?? seatedPrev?.vipLevel ?? 0,
            superVipLevel: removedUser.superVipLevel ?? cachedPrev?.superVipLevel ?? seatedPrev?.superVipLevel ?? 0,
            isVIP: Boolean(removedUser.isVIP || cachedPrev?.isVIP || seatedPrev?.isVIP),
            isHost: Boolean(removedUser.isHost || removedUser.userId === room.host.id),
          });
        });

        // Detect users who left the room (or timed out) and immediately remove them everywhere
        prevFsParticipantIds.forEach((prevId) => {
          if (!currentFsIds.has(prevId) && prevId !== currentUser.id) {
            departedIds.add(prevId);
            knownParticipantIds.delete(prevId);
            markUserRecentlyLeft(prevId);
          }
        });

        fsParticipants.forEach((p) => {
          if (!knownParticipantIds.has(p.userId) && p.userId !== currentUser.id) {
            knownParticipantIds.add(p.userId);
            clearUserRecentlyLeft(p.userId);
            seenPartyLeavesRef.current.delete(p.userId);
            const now = Date.now();
            const lastSeen = seenPartyEntriesRef.current.get(p.userId) || 0;
            if (now - lastSeen > 10000) {
              seenPartyEntriesRef.current.set(p.userId, now);
              setPartyEntryNotice({
                id: `entry_fs_${p.userId}_${now}`,
                userId: p.userId,
                name: p.name || 'Viewer',
                level: typeof p.level === 'number' ? p.level : 0,
                vipLevel: typeof p.vipLevel === 'number' ? p.vipLevel : 0,
                superVipLevel: typeof p.superVipLevel === 'number' ? p.superVipLevel : 0,
                isVIP: Boolean(p.isVIP || (p.vipLevel || 0) > 0),
              });
              if (partyEntryTimerRef.current) clearTimeout(partyEntryTimerRef.current);
              partyEntryTimerRef.current = setTimeout(() => setPartyEntryNotice(null), 3500);
              setActivities((prev) => [
                ...prev.slice(-49),
                {
                  id: `join_fs_${p.userId}_${now}`,
                  userId: p.userId,
                  name: p.name || 'Viewer',
                  avatar: p.avatar || '',
                  text: 'joined the party room',
                  level: typeof p.level === 'number' ? p.level : 0,
                  vipLevel: typeof p.vipLevel === 'number' ? p.vipLevel : 0,
                  superVipLevel: typeof p.superVipLevel === 'number' ? p.superVipLevel : 0,
                  isVIP: Boolean(p.isVIP || (p.vipLevel || 0) > 0),
                  isHost: Boolean(p.isHost),
                  type: 'join',
                },
              ]);
              setTimeout(() => activityBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 40);
            }
          }
        });
      }
      prevFsParticipantIds = currentFsIds;

      // Immediately vacate any departed user from local seats (and Firestore room doc if Host/Mod)
      let activeSeats = seatsRef.current;
      if (departedIds.size > 0) {
        let seatsChanged = false;
        const cleanedSeats = activeSeats.map((seatUser, idx) => {
          if (seatUser?.id && departedIds.has(seatUser.id)) {
            seatsChanged = true;
            if (isRoomHost || isCurrentUserModerator) {
              void vacateFirestoreSeat(room.id, seatUser.id, idx, maxSeatsRef.current).catch(() => {});
            }
            return null;
          }
          return seatUser;
        });
        if (seatsChanged) {
          activeSeats = cleanedSeats;
          setSeats(cleanedSeats);
          seatsRef.current = cleanedSeats;
        }
      }

      const reconciledParticipants = reconcileParticipantsWithSeats(
        fsParticipants,
        activeSeats,
        departedIds.size > 0 ? departedIds : undefined
      );
      setParticipantsList(reconciledParticipants);
      participantsListRef.current = reconciledParticipants;
      setParticipantTotal(reconciledParticipants.length);
      participantTotalRef.current = reconciledParticipants.length;

      const hostStillPresent = reconciledParticipants.some((p) => p.userId === room.host.id);
      onUpdateRoom?.({
        ...room,
        maxSeats: maxSeatsRef.current,
        seats: activeSeats,
        numericParticipants: reconciledParticipants.length,
        participantCount: String(reconciledParticipants.length),
        hostPresent: hostStillPresent,
        isOwnerPresent: hostStillPresent,
      });

      if (isRoomHost) {
        void updateFirestoreRoomParticipantCount(room.id, reconciledParticipants.length);
      }
    });

    // Cloud Firestore real-time room messages subscription (strictly post-entry messages + real-time deletions)
    const unsubFsMessages = subscribeFirestoreRoomMessages(room.id, (fsMessages) => {
      if (!active) return;

      // Capture all pre-existing historical messages on the initial snapshot and exclude them from view
      if (!fsMessagesBaselineCapturedRef.current) {
        fsMessagesBaselineCapturedRef.current = true;
        fsMessages.forEach((m) => {
          if (!optimisticSentMsgIdsRef.current.has(m.id)) {
            preEntryMsgIdsRef.current.add(m.id);
          }
        });
        return;
      }

      const fsIds = new Set(fsMessages.map((m) => m.id));
      setActivities((prev) => {
        // Remove any previously synced Firestore chat items that were deleted by Host/Moderator/author
        const kept = prev.filter((item) => !item.fromFirestore || fsIds.has(item.id));
        const seen = new Set(kept.map((a) => a.id));
        const next = [...kept];
        let changed = kept.length !== prev.length;

        fsMessages.forEach((m) => {
          if (preEntryMsgIdsRef.current.has(m.id)) return;
          const isOptimisticOwn = optimisticSentMsgIdsRef.current.has(m.id);
          if (
            !isOptimisticOwn &&
            typeof m.createdAtMillis === 'number' &&
            m.createdAtMillis > 0 &&
            m.createdAtMillis < roomEnteredAtRef.current - 5000
          ) {
            preEntryMsgIdsRef.current.add(m.id);
            return;
          }
          if (isRoomHost && blockedUserIdsRef.current.has(m.senderId)) return;
          if (!seen.has(m.id)) {
            seen.add(m.id);
            next.push({
              id: m.id,
              userId: m.senderId,
              name: m.senderName,
              avatar: m.senderAvatar,
              text: m.text,
              level: typeof m.senderLevel === 'number' ? m.senderLevel : 0,
              vipLevel: typeof m.senderVip === 'number' ? m.senderVip : 0,
              superVipLevel: typeof m.senderSuperVip === 'number' ? m.senderSuperVip : 0,
              isVIP: Boolean(m.senderIsVip || (m.senderVip || 0) > 0),
              isHost: m.isHost,
              type: m.gift ? 'gift' : m.isSystem ? 'join' : 'chat',
              isEdited: Boolean(m.isEdited),
              ...(m.replyTo ? { replyTo: m.replyTo } : {}),
              fromFirestore: true,
            });
            changed = true;
          } else {
            // Upgrade any local optimistic item with Firestore reply/synced metadata & real-time edits
            const idx = next.findIndex((a) => a.id === m.id);
            if (
              idx !== -1 &&
              (!next[idx].fromFirestore ||
                (!next[idx].replyTo && m.replyTo) ||
                next[idx].text !== m.text ||
                Boolean(next[idx].isEdited) !== Boolean(m.isEdited))
            ) {
              next[idx] = {
                ...next[idx],
                text: m.text,
                isEdited: Boolean(m.isEdited),
                ...(m.replyTo ? { replyTo: m.replyTo } : {}),
                fromFirestore: true,
              };
              changed = true;
            }
          }
        });
        return changed ? next.slice(-60) : prev;
      });
    });

    // Cloud Firestore real-time parent party room doc subscription (syncs seats, requests & host close across Web + Android)
    let roomDocEverExisted = false;
    const unsubFsRoomDoc = subscribeFirestorePartyRoomDoc(room.id, (exists, data) => {
      if (!active) return;
      if (exists && data) {
        roomDocEverExisted = true;
        const effectiveLevel = isRoomHost
          ? hostLevelRef.current
          : typeof data.host?.level === 'number'
          ? sanitizeUserLevel(data.host.level)
          : hostLevelRef.current;
        if (!isRoomHost && typeof data.host?.level === 'number') {
          setLiveHostLevel(effectiveLevel);
        }
        const rawFsSeats: (UserProfile | null)[] = Array.isArray(data.seats) ? data.seats : [];
        const storedFsMax = [5, 8, 16].includes(Number(data.maxSeats))
          ? Number(data.maxSeats)
          : clampPartyMaxSeatsForHostLevel(data.maxSeats ?? maxSeatsRef.current, effectiveLevel);
        const nextMax = Math.max(storedFsMax, rawFsSeats.length);
        setMaxSeats(nextMax as PartySeatCount);
        if (Array.isArray(data.seats)) {
          const prevSeats = seatsRef.current;
          const preservedSeats: (UserProfile | null)[] = Array.from(
            { length: nextMax },
            (_, idx) => {
              const occupant = rawFsSeats[idx] || null;
              if (occupant?.id && isUserRecentlyLeft(occupant.id)) return null;
              return occupant;
            }
          );
          const wasSelfSeated = prevSeats.some((s) => s?.id === currentUser.id);
          const isSelfNowSeated = preservedSeats.some((s) => s?.id === currentUser.id);
          setSeats(preservedSeats);
          seatsRef.current = preservedSeats;

          // If current user just joined a seat (e.g. approved/seated remotely), immediately refresh Firestore presence
          if (!wasSelfSeated && isSelfNowSeated) {
            clearUserRecentlyLeft(currentUser.id);
            void joinFirestoreRoomParticipant(room.id, currentUser, isRoomHost, true);
          }

          // Immediately synchronize seated users into participants display & room card
          const nextParticipants = reconcileParticipantsWithSeats(
            participantsListRef.current,
            preservedSeats
          );
          setParticipantsList(nextParticipants);
          participantsListRef.current = nextParticipants;
          setParticipantTotal(nextParticipants.length);
          participantTotalRef.current = nextParticipants.length;
          onUpdateRoom?.({
            ...room,
            maxSeats: nextMax as PartySeatCount,
            seats: preservedSeats,
            numericParticipants: nextParticipants.length,
            participantCount: String(nextParticipants.length),
          });
        }
        if (Array.isArray(data.mutedSeatIndices)) {
          setMutedSeatIndices(data.mutedSeatIndices.filter((i: number) => i < nextMax));
        }
        if (Array.isArray(data.seatRequests)) {
          const filteredFsRequests = (data.seatRequests as SeatRequest[]).filter(
            (r) => r?.user?.id && (!isRoomHost || !blockedUserIdsRef.current.has(r.user.id))
          );
          // Notify viewer if their pending seat request was rejected by host cross-device
          if (!isRoomHost) {
            const wasPending = hadPendingSeatReqRef.current;
            const stillPending = filteredFsRequests.some((r) => r.user.id === currentUser.id);
            const nowSeated = Array.isArray(data.seats) && data.seats.some((s: any) => s?.id === currentUser.id);
            hadPendingSeatReqRef.current = stillPending;
            if (wasPending && !stillPending && !nowSeated && !cancelledOwnReqRef.current) {
              showToast('Host declined your seat request');
            }
            if (wasPending && nowSeated) {
              const myIdx = (data.seats as any[]).findIndex((s) => s?.id === currentUser.id);
              showToast(`Approved! You are now on Seat #${myIdx + 1}`);
            }
            cancelledOwnReqRef.current = false;
          }
          setSeatRequests(filteredFsRequests);
        }
        if (typeof data.likesCount === 'number') {
          setRoomLikesCount((prev) => Math.max(prev, data.likesCount));
        }
        if (data.lastHeartEvent && typeof data.lastHeartEvent === 'object') {
          const ev = data.lastHeartEvent as FirestoreRoomHeartEvent;
          if (
            ev.id &&
            ev.senderId &&
            ev.senderId !== currentUser.id &&
            !seenHeartEventIdsRef.current.has(ev.id) &&
            Date.now() - (ev.timestamp || 0) < 12000
          ) {
            seenHeartEventIdsRef.current.add(ev.id);
            const burstCount = Math.min(Math.max(1, ev.count || 1), 5);
            for (let i = 0; i < burstCount; i++) {
              setTimeout(() => {
                spawnHeartVisual(
                  typeof ev.x === 'number' ? ev.x + (Math.random() * 10 - 5) : 65 + Math.random() * 25,
                  typeof ev.y === 'number' ? ev.y + (Math.random() * 8 - 4) : undefined,
                  typeof ev.y === 'number'
                );
              }, i * 95);
            }
          }
        }
        if (typeof data.isLocked === 'boolean') setIsSeatLocked(data.isLocked);
        if (typeof data.allowJoin === 'boolean') setIsAllowJoin(data.allowJoin);
        if (typeof data.announcement === 'string') setRoomAnnouncement(data.announcement);
        if (data.backgroundType !== undefined) {
          setBackgroundType(normalizePartyBackgroundType(data.backgroundType));
        }
        if (typeof data.backgroundId === 'string' && data.backgroundId.trim()) {
          setBackgroundId(data.backgroundId.trim());
        }
        if (typeof data.backgroundImage === 'string') {
          setBackgroundImage(data.backgroundImage);
        }
        if (data.seatTheme === 'default' || data.seatTheme === 'gold' || data.seatTheme === 'green') {
          setSeatTheme(data.seatTheme);
        }
        if (
          typeof data.chatClearedAt === 'number' &&
          data.chatClearedAt > lastChatClearedAtRef.current
        ) {
          lastChatClearedAtRef.current = data.chatClearedAt;
          setActivities([]);
          setReplyTarget(null);
        }
      } else if (roomDocEverExisted && !isRoomHost) {
        showToast('Party room was closed by the host');
        webrtcMediaService.stopPartyVoice();
        agoraRtcService.leaveChannel().catch(() => {});
        setTimeout(() => {
          if (active) onClose();
        }, 1200);
      }
    });

    const heartbeatInterval = setInterval(() => {
      liveAndRoomService.sendRoomHeartbeat(room.id, currentUser.id);
      void updateFirestoreRoomParticipantState(room.id, {
        isSpeaker: seatsRef.current.some((s) => s?.id === currentUser.id),
      });
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !hasExplicitlyLeftRef.current) {
        liveAndRoomService.sendRoomHeartbeat(room.id, currentUser.id);
        void updateFirestoreRoomParticipantState(room.id, {
          isSpeaker: seatsRef.current.some((s) => s?.id === currentUser.id),
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const unsubWs = liveAndRoomService.addEventListener((event, payload) => {
      if (!active || !payload) return;

      if (
        event === 'user:blocked_by' &&
        !isRoomHost &&
        payload.blockerId === room.host.id
      ) {
        showToast('You have been blocked by the room host.');
        webrtcMediaService.stopPartyVoice();
        agoraRtcService.leaveChannel().catch(() => {});
        void leaveFirestoreRoomParticipant(room.id);
        setTimeout(() => {
          if (active) onClose();
        }, 700);
        return;
      }

      if (payload.roomId && payload.roomId !== room.id) return;

      if (
        (event === 'room:updated' ||
          event === 'room:state_updated' ||
          event === 'room:sync_state' ||
          event === 'room:settings_updated' ||
          event === 'room:seat_occupied' ||
          event === 'room:seat_vacated' ||
          event === 'room:empty_countdown_started' ||
          event === 'room:reactivated') &&
        payload.room
      ) {
        if (event === 'room:seat_occupied' && payload.user?.id) {
          clearUserRecentlyLeft(payload.user.id);
        }
        applyServerRoomState(
          payload.room as PartyRoom,
          event === 'room:seat_vacated'
        );
        if (Array.isArray(payload.participants)) {
          const reconciled = reconcileParticipantsWithSeats(
            payload.participants as LiveViewerInfo[],
            seatsRef.current
          );
          setParticipantsList(reconciled);
          participantsListRef.current = reconciled;
          setParticipantTotal(reconciled.length);
          participantTotalRef.current = reconciled.length;
        }
        if (event === 'room:sync_state') {
          applyIncomingMusicState(
            (payload.musicState || payload.room?.musicState) as PartyMusicState | undefined,
            typeof payload.serverTime === 'number' ? payload.serverTime : undefined
          );
          if (Array.isArray(payload.pendingRequests) && payload.pendingRequests.length > 0) {
            const incoming: SeatRequest[] = payload.pendingRequests
              .filter((r: any) => r?.user?.id && (!isRoomHost || !blockedUserIdsRef.current.has(r.user.id)))
              .map((r: any) => ({
                id: r.id,
                user: r.user,
                seatIndex: r.requestedSeatIndex ?? r.seatIndex ?? 1,
                requestedAt: r.createdAt || r.requestedAt || Date.now(),
              }));
            if (incoming.length > 0) {
              setSeatRequests((prev) => {
                const byUser = new Map<string, SeatRequest>();
                prev.forEach((p) => byUser.set(p.user.id, p));
                incoming.forEach((inc) => byUser.set(inc.user.id, inc));
                return Array.from(byUser.values());
              });
            }
          }
          // Intentionally ignore historical payload.messages so room chat starts fresh from entry time.
        }
      } else if (event === 'room:music_updated' && payload.musicState) {
        applyIncomingMusicState(payload.musicState as PartyMusicState);
      } else if (event === 'room:participant_joined') {
        if (payload.participant?.userId) {
          clearUserRecentlyLeft(payload.participant.userId);
          seenPartyLeavesRef.current.delete(payload.participant.userId);
          knownParticipantIds.add(payload.participant.userId);
        }
        if (payload.room) applyServerRoomState(payload.room as PartyRoom);
        if (isRoomHost && payload.participant?.userId && blockedUserIdsRef.current.has(payload.participant.userId)) {
          return;
        }
        if (Array.isArray(payload.participants)) {
          const reconciled = reconcileParticipantsWithSeats(
            payload.participants as LiveViewerInfo[],
            seatsRef.current
          );
          setParticipantsList(reconciled);
          participantsListRef.current = reconciled;
          setParticipantTotal(reconciled.length);
          participantTotalRef.current = reconciled.length;
        } else if (payload.participant?.userId) {
          const base = [
            ...participantsListRef.current.filter((p) => p.userId !== payload.participant.userId),
            payload.participant as LiveViewerInfo,
          ];
          const reconciled = reconcileParticipantsWithSeats(base, seatsRef.current);
          setParticipantsList(reconciled);
          participantsListRef.current = reconciled;
          setParticipantTotal(reconciled.length);
          participantTotalRef.current = reconciled.length;
        } else {
          refreshRealTimeParticipants();
        }
        if (payload.participant && payload.participant.userId !== currentUser.id) {
          const p = payload.participant;
          const now = Date.now();
          const lastSeen = seenPartyEntriesRef.current.get(p.userId) || 0;
          if (now - lastSeen > 10000) {
            seenPartyEntriesRef.current.set(p.userId, now);
            setPartyEntryNotice({
              id: `entry_${p.userId}_${now}`,
              name: p.name || 'Viewer',
              level: typeof p.level === 'number' ? p.level : 0,
              vipLevel: typeof p.vipLevel === 'number' ? p.vipLevel : 0,
              superVipLevel: typeof p.superVipLevel === 'number' ? p.superVipLevel : 0,
              isVIP: Boolean(p.isVIP || (p.vipLevel || 0) > 0),
            });
            if (partyEntryTimerRef.current) clearTimeout(partyEntryTimerRef.current);
            partyEntryTimerRef.current = setTimeout(() => setPartyEntryNotice(null), 3500);
            setActivities((prev) => [
              ...prev.slice(-49),
              {
                id: `join_${p.userId}_${now}`,
                userId: p.userId,
                name: p.name || 'Viewer',
                avatar: p.avatar || '',
                text: 'joined the party room',
                level: typeof p.level === 'number' ? p.level : 0,
                vipLevel: typeof p.vipLevel === 'number' ? p.vipLevel : 0,
                superVipLevel: typeof p.superVipLevel === 'number' ? p.superVipLevel : 0,
                isVIP: Boolean(p.isVIP || (p.vipLevel || 0) > 0),
                isHost: Boolean(p.isHost),
                type: 'join',
              },
            ]);
            setTimeout(() => activityBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 40);
          }
        }
      } else if (event === 'room:participant_left') {
        if (
          !isRoomHost &&
          payload.reason === 'blocked' &&
          payload.userId === currentUser.id
        ) {
          showToast('You have been blocked by the room host.');
          webrtcMediaService.stopPartyVoice();
          agoraRtcService.leaveChannel().catch(() => {});
          void leaveFirestoreRoomParticipant(room.id);
          setTimeout(() => {
            if (active) onClose();
          }, 700);
          return;
        }
        const departedUserId = typeof payload.userId === 'string' ? payload.userId : '';
        // Capture departing user metadata BEFORE removing them so leave notification has the exact username
        const cachedParticipantBeforeLeave = departedUserId
          ? participantsListRef.current.find((p) => p.userId === departedUserId)
          : undefined;
        const cachedSeatBeforeLeave = departedUserId
          ? seatsRef.current.find((s) => s?.id === departedUserId)
          : undefined;
        const serverDeparted = payload.participant as LiveViewerInfo | null | undefined;
        if (departedUserId && payload.reason === 'explicit_leave') {
          const resolvedName =
            (serverDeparted?.name && serverDeparted.name !== 'User' ? serverDeparted.name : '') ||
            cachedParticipantBeforeLeave?.name ||
            cachedSeatBeforeLeave?.name ||
            (departedUserId === room.host.id ? room.host.name : 'Viewer');
          emitPartyLeaveNotification({
            userId: departedUserId,
            name: resolvedName,
            avatar:
              serverDeparted?.avatar ||
              cachedParticipantBeforeLeave?.avatar ||
              cachedSeatBeforeLeave?.avatar ||
              '',
            level:
              serverDeparted?.level ??
              cachedParticipantBeforeLeave?.level ??
              cachedSeatBeforeLeave?.level ??
              0,
            vipLevel:
              serverDeparted?.vipLevel ??
              cachedParticipantBeforeLeave?.vipLevel ??
              cachedSeatBeforeLeave?.vipLevel ??
              0,
            superVipLevel:
              serverDeparted?.superVipLevel ??
              cachedParticipantBeforeLeave?.superVipLevel ??
              cachedSeatBeforeLeave?.superVipLevel ??
              0,
            isVIP: Boolean(
              serverDeparted?.isVIP || cachedParticipantBeforeLeave?.isVIP || cachedSeatBeforeLeave?.isVIP
            ),
            isHost: Boolean(payload.isHost || serverDeparted?.isHost || departedUserId === room.host.id),
          });
        }
        if (departedUserId) {
          markUserRecentlyLeft(departedUserId);
          knownParticipantIds.delete(departedUserId);
        }
        if (payload.room) {
          applyServerRoomState(payload.room as PartyRoom, true, departedUserId || undefined);
        } else if (departedUserId) {
          const clearedSeats = seatsRef.current.map((s) => (s?.id === departedUserId ? null : s));
          setSeats(clearedSeats);
          seatsRef.current = clearedSeats;
        }
        const excludeSet = departedUserId ? new Set([departedUserId]) : undefined;
        const nextParticipants = Array.isArray(payload.participants)
          ? reconcileParticipantsWithSeats(
              payload.participants as LiveViewerInfo[],
              seatsRef.current,
              excludeSet
            )
          : reconcileParticipantsWithSeats(
              participantsListRef.current.filter((p) => p.userId !== departedUserId),
              seatsRef.current,
              excludeSet
            );
        setParticipantsList(nextParticipants);
        participantsListRef.current = nextParticipants;
        setParticipantTotal(nextParticipants.length);
        participantTotalRef.current = nextParticipants.length;
        const hostStillPresent = nextParticipants.some((p) => p.userId === room.host.id);
        onUpdateRoom?.({
          ...room,
          ...(payload.room ? (payload.room as PartyRoom) : {}),
          maxSeats: maxSeatsRef.current,
          seats: seatsRef.current,
          numericParticipants: nextParticipants.length,
          participantCount: String(nextParticipants.length),
          hostPresent: hostStillPresent,
          isOwnerPresent: hostStillPresent,
        });
      } else if (event === 'room:heart') {
        if (typeof payload.likesCount === 'number') {
          setRoomLikesCount((prev) => Math.max(prev, payload.likesCount));
        }
        if (payload.userId && payload.userId !== currentUser.id) {
          const eventKey = `ws_${payload.userId}_${payload.timestamp || Date.now()}`;
          if (!seenHeartEventIdsRef.current.has(eventKey)) {
            seenHeartEventIdsRef.current.add(eventKey);
            const burstCount = Math.min(Math.max(1, Number(payload.delta || payload.count || 1)), 5);
            for (let i = 0; i < burstCount; i++) {
              setTimeout(() => {
                spawnHeartVisual(
                  typeof payload.x === 'number' ? payload.x + (Math.random() * 10 - 5) : 70 + Math.random() * 20,
                  typeof payload.y === 'number' ? payload.y + (Math.random() * 8 - 4) : undefined,
                  typeof payload.y === 'number'
                );
              }, i * 90);
            }
          }
        }
      } else if (event === 'room:seat_muted' && Array.isArray(payload.mutedSeatIndices)) {
        setMutedSeatIndices(payload.mutedSeatIndices);
      } else if (event === 'room:seat_request_received' || event === 'room:seat_request_updated') {
        const reqObj = payload.requestObj || payload;
        if (reqObj?.user?.id) {
          setSeatRequests((prev) => [
            ...prev.filter((r) => r.user.id !== reqObj.user.id),
            {
              id: reqObj.id || `sr_${Date.now()}`,
              user: reqObj.user,
              seatIndex: reqObj.requestedSeatIndex ?? reqObj.seatIndex ?? 1,
              requestedAt: reqObj.createdAt || Date.now(),
            },
          ]);
        }
      } else if (event === 'room:seat_request_cancelled' && payload.userId) {
        setSeatRequests((prev) => prev.filter((r) => r.user.id !== payload.userId));
      } else if (event === 'room:seat_request_accepted') {
        if (payload.agoraToken) {
          pendingPromotedAgoraTokenRef.current = payload.agoraToken;
        }
        hadPendingSeatReqRef.current = false;
        showToast(`Approved! You are now on Seat #${(payload.seatIndex ?? 1) + 1}`);
      } else if (event === 'room:seat_request_rejected') {
        hadPendingSeatReqRef.current = false;
        showToast('Host declined your seat request');
      } else if (event === 'room:seat_invited') {
        if (payload.toUserId === currentUser.id && !isCurrentlySeated) {
          setIncomingSeatInvite({
            id: payload.id || `inv_${Date.now()}`,
            fromHost: payload.fromHost || room.host,
            toUser: currentUser,
            seatIndex: typeof payload.seatIndex === 'number' ? payload.seatIndex : 1,
            sentAt: payload.createdAt || Date.now(),
          });
          showToast(`${payload.fromHost?.name || room.host.name} invited you to Seat #${(payload.seatIndex ?? 1) + 1}`);
        }
      } else if (event === 'room:seat_kicked') {
        // Room Owner is permanently immune to seat kick events
        if (!isRoomHost && currentUser.id !== room.host.id) {
          const now = Date.now();
          if (now - kickedToastShownAtRef.current > 2500) {
            kickedToastShownAtRef.current = now;
            showToast(`You were removed from Seat #${(payload.seatIndex ?? 0) + 1} by Host`);
          }
        }
      } else if (event === 'room:chat' && payload.message) {
        const m = payload.message;
        if (preEntryMsgIdsRef.current.has(m.id)) return;
        const msgCreatedAt = typeof m.createdAt === 'number' ? m.createdAt : 0;
        if (
          msgCreatedAt > 0 &&
          msgCreatedAt < roomEnteredAtRef.current - 3000 &&
          !optimisticSentMsgIdsRef.current.has(m.id)
        ) {
          preEntryMsgIdsRef.current.add(m.id);
          return;
        }
        setActivities((prev) =>
          prev.some((a) => a.id === m.id)
            ? prev
            : [
                ...prev,
                {
                  id: m.id,
                  userId: m.senderId,
                  name: m.senderName,
                  avatar: m.senderAvatar,
                  text: m.text,
                  level: typeof m.senderLevel === 'number' ? m.senderLevel : typeof m.level === 'number' ? m.level : 0,
                  vipLevel: typeof m.senderVip === 'number' ? m.senderVip : typeof m.vipLevel === 'number' ? m.vipLevel : 0,
                  superVipLevel: typeof m.senderSuperVip === 'number' ? m.senderSuperVip : 0,
                  isVIP: Boolean(m.senderIsVip || (m.senderVip || 0) > 0),
                  isHost: m.isHost,
                  type: m.gift ? 'gift' : m.isSystem ? 'join' : 'chat',
                  isEdited: Boolean(m.isEdited),
                },
              ]
        );
        setTimeout(() => activityBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 40);
      } else if (event === 'room:chat_edited' && payload.messageId && typeof payload.text === 'string') {
        const editedId = String(payload.messageId);
        const editedText = String(payload.text);
        setActivities((prev) =>
          prev.map((a) =>
            a.id === editedId
              ? {
                  ...a,
                  text: editedText,
                  isEdited: true,
                }
              : a
          )
        );
      } else if (event === 'room:closed') {
        if (!isRoomHost || payload.autoClosed) {
          showToast(
            payload.autoClosed
              ? 'Party room closed automatically after 5 minutes of inactivity'
              : 'Host has closed this party room'
          );
          webrtcMediaService.stopPartyVoice();
          agoraRtcService.leaveChannel().catch(() => {});
          setTimeout(() => {
            if (active) onClose();
          }, 1200);
        }
      }
    });

    const cleanupOnUnexpectedExit = () => {
      if (hasExplicitlyLeftRef.current) return;
      hasExplicitlyLeftRef.current = true;
      const leavingSeatIdx = seatsRef.current.findIndex((s) => s?.id === currentUser.id);
      const targetSeatIdx = leavingSeatIdx !== -1 ? leavingSeatIdx : isRoomHost ? 0 : undefined;
      const nextSeats = seatsRef.current.map((s, idx) =>
        s?.id === currentUser.id || (isRoomHost && idx === 0) ? null : s
      );
      const nextCount = Math.max(0, participantTotalRef.current - 1);
      const now = Date.now();
      const nextStatus: 'active' | 'empty' = nextCount === 0 ? 'empty' : 'active';
      const nextEmptySince = nextCount === 0 ? now : null;
      const nextClosesAt = nextCount === 0 ? now + EMPTY_ROOM_CLEANUP_MS : null;
      const nextHostPresent = isRoomHost ? false : room.hostPresent;

      onUpdateRoom?.({
        ...room,
        seats: nextSeats,
        numericParticipants: nextCount,
        participantCount: String(nextCount),
        hostPresent: nextHostPresent,
        isOwnerPresent: nextHostPresent,
        status: nextStatus,
        emptySince: nextEmptySince,
        closesAt: nextClosesAt,
      });
      if (targetSeatIdx !== undefined) {
        void vacateFirestoreSeat(room.id, currentUser.id, targetSeatIdx, maxSeatsRef.current).catch(() => {});
      }
      void syncFirestorePartyRoomLifecycle(room.id, {
        numericParticipants: nextCount,
        ...(isRoomHost ? { hostPresent: false } : {}),
        status: nextStatus,
        emptySince: nextEmptySince,
        closesAt: nextClosesAt,
      }).catch(() => {});
      if (isRoomHost) {
        void partyMusicEngine.stop();
        if (partyMusicStateRef.current.status === 'playing' || partyMusicStateRef.current.status === 'paused') {
          void liveAndRoomService
            .updateRoomMusicState({
              roomId: room.id,
              hostId: currentUser.id,
              action: 'stop',
              roomMeta: { host: room.host, title: room.title, maxSeats: maxSeatsRef.current },
            })
            .catch(() => {});
        }
      }
      void releasePartyScreenWakeLock(`party_room_${room.id}_${currentUser.id}`);
      void liveAndRoomService.leavePartyRoom(room.id, currentUser.id).catch(() => {});
      void leaveFirestoreRoomParticipant(room.id).catch(() => {});
    };

    window.addEventListener('beforeunload', cleanupOnUnexpectedExit);
    window.addEventListener('pagehide', cleanupOnUnexpectedExit);

    return () => {
      active = false;
      window.removeEventListener('beforeunload', cleanupOnUnexpectedExit);
      window.removeEventListener('pagehide', cleanupOnUnexpectedExit);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatInterval);
      if (partyEntryTimerRef.current) clearTimeout(partyEntryTimerRef.current);
      unsubWs();
      unsubFsParticipants();
      unsubFsMessages();
      unsubFsRoomDoc();
      liveAndRoomService.unsubscribeRoom();
      cleanupOnUnexpectedExit();
    };
  }, [room.id, currentUser.id, isRoomHost]);

  // Unified Real-Time Party Voice Engine (Agora RTC + WebRTC Audio Mesh Fallback)
  useEffect(() => {
    let isMounted = true;
    voiceJoinedRef.current = false;
    activePublishedRoleRef.current = null;
    const initiallySeated = seatsRef.current.some((s) => s?.id === currentUser.id);
    const effectiveMuted = isMicMutedRef.current || mutedSeatIndicesRef.current.includes(
      seatsRef.current.findIndex((s) => s?.id === currentUser.id)
    );
    const initialRole: 'host' | 'audience' = initiallySeated ? 'host' : 'audience';

    const joinPartyVoice = async () => {
      try {
        setAgoraVoiceState('connecting');
        setVoiceTransport('connecting');
        void setNativeLiveAudioMode(true);

        // Parallelize real microphone capture + fast Agora token lookup (eliminates redundant sequential config wait!)
        const micPromise: Promise<MediaStream | null> =
          initiallySeated && !realMicStreamRef.current
            ? acquireRealMicrophone()
                .then((stream) => {
                  if (!isMounted) {
                    stopMediaStream(stream);
                    return null;
                  }
                  stream.getAudioTracks().forEach((t) => {
                    t.enabled = !effectiveMuted;
                  });
                  realMicStreamRef.current = stream;
                  realMicAnalyserRef.current = createAudioAnalyser(stream);
                  setMicPermissionDenied(false);
                  return stream;
                })
                .catch((micErr) => {
                  console.warn('[Party Voice] Mic acquisition notice:', micErr);
                  if (isMounted) setMicPermissionDenied(true);
                  return null;
                })
            : Promise.resolve(realMicStreamRef.current);

        const tokenPromise = agoraRtcService.requestRtcToken(
          `party_${room.id}`,
          currentUser.id,
          initiallySeated ? 'broadcaster' : 'audience',
          false,
          5000
        );

        const [localMicStream, tokenData] = await Promise.all([micPromise, tokenPromise]);
        if (!isMounted) return;

        const canJoinAgora =
          Boolean(tokenData.configured && tokenData.appId) &&
          (Boolean(tokenData.token) || tokenData.tokenRequired === false);

        if (canJoinAgora) {
          try {
            await agoraRtcService.joinChannel({
              appId: tokenData.appId,
              channelName: `party_${room.id}`,
              userAccount: currentUser.id,
              role: initialRole,
              token: tokenData.token,
              enableVideo: false,
              enableAudio: initiallySeated,
              mediaStream: initiallySeated ? localMicStream : null,
            });
            if (!isMounted) return;
            if (initiallySeated && effectiveMuted) {
              await agoraRtcService.setMicrophoneMuted(true);
            }
            voiceJoinedRef.current = true;
            activePublishedRoleRef.current = initialRole;
            setVoiceTransport('agora');
            setAgoraVoiceState('connected');
            return;
          } catch (agoraErr) {
            console.warn('[Party Voice] Agora voice failed, falling back to real-time WebRTC mesh:', agoraErr);
            await agoraRtcService.leaveChannel().catch(() => {});
          }
        }

        if (!isMounted) return;

        // WebRTC Real-Time Party Voice Mesh fallback (connects within ~1.5-3s)
        webrtcMediaService.startPartyVoice(
          room.id,
          currentUser.id,
          initiallySeated,
          initiallySeated ? localMicStream : null,
          {
            onStatusChange: (status) => {
              if (!isMounted) return;
              setAgoraVoiceState(status === 'connected' ? 'connected' : status === 'connecting' ? 'connecting' : 'disconnected');
            },
            onAutoplayBlocked: () => {
              if (!isMounted) return;
              setAutoplayBlocked(true);
            },
            onRemoteVolume: (peerId, level) => {
              if (!isMounted || level <= 12) return;
              const remoteSeatIdx = seatsRef.current.findIndex((s) => s && String(s.id) === String(peerId));
              if (remoteSeatIdx !== -1 && !mutedSeatIndicesRef.current.includes(remoteSeatIdx)) {
                setSpeakingSeats((prev) => ({ ...prev, [remoteSeatIdx]: Date.now() }));
              }
            },
          }
        );
        voiceJoinedRef.current = true;
        activePublishedRoleRef.current = initialRole;
        setVoiceTransport('webrtc');
        if (isMounted) setAgoraVoiceState('connected');
      } catch (err) {
        console.warn('[Party Voice] Join warning:', err);
        if (isMounted) setAgoraVoiceState('disconnected');
      }
    };

    joinPartyVoice();

    const unsubAutoplay = agoraRtcService.onAutoplayBlocked(() => {
      if (isMounted) setAutoplayBlocked(true);
    });

    const unsubStatus = agoraRtcService.onStatusChange((status) => {
      if (!isMounted || voiceTransportRef.current !== 'agora') return;
      if (status.state === 'CONNECTED') {
        setAgoraVoiceState('connected');
      } else if (status.state === 'CONNECTING' || status.state === 'RECONNECTING') {
        setAgoraVoiceState('connecting');
      } else {
        setAgoraVoiceState('disconnected');
      }
    });

    const unsubVolumes = agoraRtcService.onVolumeIndicator((volumes) => {
      if (!isMounted) return;
      const now = Date.now();
      for (const v of volumes) {
        if (v.level <= 12) continue;
        const uidStr = String(v.uid);
        if (v.uid === 0 || uidStr === String(currentUser.id)) {
          const mySeatIdx = seatsRef.current.findIndex((s) => s && String(s.id) === String(currentUser.id));
          const locallyMuted = isMicMutedRef.current || (mySeatIdx !== -1 && mutedSeatIndicesRef.current.includes(mySeatIdx));
          if (mySeatIdx !== -1 && !locallyMuted) {
            setRealMicVolume(v.level);
            setSpeakingSeats((prev) => ({ ...prev, [mySeatIdx]: now }));
          }
        } else {
          const remoteSeatIdx = seatsRef.current.findIndex((s) => s && String(s.id) === uidStr);
          if (remoteSeatIdx !== -1 && !mutedSeatIndicesRef.current.includes(remoteSeatIdx)) {
            setSpeakingSeats((prev) => ({ ...prev, [remoteSeatIdx]: now }));
          }
        }
      }
    });

    return () => {
      isMounted = false;
      voiceJoinedRef.current = false;
      activePublishedRoleRef.current = null;
      unsubAutoplay();
      unsubStatus();
      unsubVolumes();
      webrtcMediaService.stopPartyVoice();
      agoraRtcService.leaveChannel().catch(() => {});
      void setNativeLiveAudioMode(false);
    };
  }, [room.id, currentUser.id]);

  // Manual user-gesture microphone permission request & publish for seated speakers
  const handleRetryPartyMic = async () => {
    try {
      const micStream = await acquireRealMicrophone();
      if (realMicAnalyserRef.current) {
        realMicAnalyserRef.current.cleanup();
      }
      if (realMicStreamRef.current) {
        stopMediaStream(realMicStreamRef.current);
      }
      const effectiveMuted = isMicMuted || isHostMutedOnMySeat;
      micStream.getAudioTracks().forEach((t) => {
        t.enabled = !effectiveMuted;
      });
      realMicStreamRef.current = micStream;
      realMicAnalyserRef.current = createAudioAnalyser(micStream);
      setMicPermissionDenied(false);

      if (voiceTransportRef.current === 'agora') {
        await agoraRtcService.switchRole('host', {
          enableVideo: false,
          enableAudio: true,
          mediaStream: micStream,
          forceRepublish: true,
        });
        await agoraRtcService.setMicrophoneMuted(effectiveMuted);
        activePublishedRoleRef.current = 'host';
      } else {
        webrtcMediaService.updatePartySpeakerRole(true, micStream);
        webrtcMediaService.setPartyMicMuted(effectiveMuted);
        activePublishedRoleRef.current = 'host';
      }
      showToast('Microphone access granted — voice is live');
    } catch {
      setMicPermissionDenied(true);
      showToast('Please allow Microphone permission in app/browser settings');
    }
  };

  // Synchronize seat join / seat leave role changes ONLY when role actually transitions!
  useEffect(() => {
    let active = true;
    const syncSeatRole = async () => {
      if (!voiceJoinedRef.current || voiceTransport === 'connecting') return;
      const targetRole: 'host' | 'audience' = isCurrentlySeated ? 'host' : 'audience';
      if (activePublishedRoleRef.current === targetRole) {
        return;
      }

      if (isCurrentlySeated) {
        let micStream = realMicStreamRef.current;
        const hasLiveAudio = micStream?.getAudioTracks().some((t) => t.readyState === 'live');
        if (!micStream || !hasLiveAudio) {
          try {
            if (micStream) stopMediaStream(micStream);
            micStream = await acquireRealMicrophone();
            if (!active) {
              stopMediaStream(micStream);
              return;
            }
            realMicStreamRef.current = micStream;
            if (realMicAnalyserRef.current) {
              realMicAnalyserRef.current.cleanup();
            }
            realMicAnalyserRef.current = createAudioAnalyser(micStream);
            setMicPermissionDenied(false);
          } catch (err) {
            console.warn('[Party Voice] Mic unavailable when taking seat:', err);
            if (active) setMicPermissionDenied(true);
          }
        }
        const effectiveMuted = isMicMutedRef.current || isHostMutedOnMySeat;
        if (micStream) {
          micStream.getAudioTracks().forEach((t) => {
            t.enabled = !effectiveMuted;
          });
        }
        if (voiceTransport === 'agora') {
          const promotedToken = pendingPromotedAgoraTokenRef.current;
          pendingPromotedAgoraTokenRef.current = null;
          const switched = await agoraRtcService.switchRole('host', {
            enableVideo: false,
            enableAudio: true,
            mediaStream: micStream,
            token: promotedToken,
          });
          if (switched) {
            activePublishedRoleRef.current = 'host';
            await agoraRtcService.setMicrophoneMuted(effectiveMuted);
          }
        } else if (voiceTransport === 'webrtc') {
          webrtcMediaService.updatePartySpeakerRole(true, micStream);
          webrtcMediaService.setPartyMicMuted(effectiveMuted);
          activePublishedRoleRef.current = 'host';
        }
      } else {
        // Stepped down from seat -> switch cleanly to listener and release mic
        setMicPermissionDenied(false);
        if (voiceTransport === 'agora') {
          await agoraRtcService.switchRole('audience', { enableVideo: false, enableAudio: false });
        } else if (voiceTransport === 'webrtc') {
          webrtcMediaService.updatePartySpeakerRole(false, null);
        }
        activePublishedRoleRef.current = 'audience';
        if (realMicAnalyserRef.current) {
          realMicAnalyserRef.current.cleanup();
          realMicAnalyserRef.current = null;
        }
        if (realMicStreamRef.current) {
          stopMediaStream(realMicStreamRef.current);
          realMicStreamRef.current = null;
        }
        setRealMicVolume(0);
      }
      void updateFirestoreRoomParticipantState(room.id, { isSpeaker: isCurrentlySeated });
    };

    void syncSeatRole();
    return () => {
      active = false;
    };
  }, [isCurrentlySeated, voiceTransport, agoraVoiceState]);

  // Lightweight local mute toggle & speaking volume meter (Zero track teardown!)
  useEffect(() => {
    const effectiveMuted = isMicMuted || isHostMutedOnMySeat || !isCurrentlySeated;
    if (realMicStreamRef.current) {
      realMicStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !effectiveMuted;
      });
    }
    if (!effectiveMuted && voiceTransportRef.current === 'agora' && voiceJoinedRef.current) {
      void agoraRtcService.ensureLocalAudioPublished(false);
    } else {
      void agoraRtcService.setMicrophoneMuted(effectiveMuted);
    }
    webrtcMediaService.setPartyMicMuted(effectiveMuted);

    let active = true;
    if (!effectiveMuted) {
      const pollVolume = () => {
        if (!active) return;
        if (realMicAnalyserRef.current) {
          const vol = realMicAnalyserRef.current.getVolumeLevel();
          setRealMicVolume(vol);
          if (vol > 8 && userSeatIndex !== -1) {
            setSpeakingSeats((prev) => ({ ...prev, [userSeatIndex]: Date.now() }));
          }
        }
        realMicRafRef.current = requestAnimationFrame(pollVolume);
      };
      realMicRafRef.current = requestAnimationFrame(pollVolume);
    } else {
      setRealMicVolume(0);
    }

    return () => {
      active = false;
      if (realMicRafRef.current) cancelAnimationFrame(realMicRafRef.current);
    };
  }, [isMicMuted, isHostMutedOnMySeat, isCurrentlySeated, userSeatIndex]);

  // Expire speaking rings naturally after 1.1s of silence
  useEffect(() => {
    const timer = setInterval(() => {
      const cutoff = Date.now() - 1100;
      setSpeakingSeats((prev) => {
        const next: Record<number, number> = {};
        let changed = false;
        for (const [k, ts] of Object.entries(prev)) {
          if (ts > cutoff) {
            next[Number(k)] = ts;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 600);
    return () => clearInterval(timer);
  }, []);

  // Cleanup hardware mic on unmount
  useEffect(() => {
    return () => {
      if (realMicAnalyserRef.current) realMicAnalyserRef.current.cleanup();
      if (realMicStreamRef.current) stopMediaStream(realMicStreamRef.current);
    };
  }, []);

  const syncRoom = (
    updatedSeats: (UserProfile | null)[],
    updatedRequests?: SeatRequest[],
    updatedLocked?: boolean,
    updatedAllowJoin?: boolean,
    updatedAnnouncement?: string,
    skipFirestoreSync = false,
    updatedMaxSeats?: PartySeatCount,
    updatedBackground?: Partial<PartyBackgroundSelection>
  ) => {
    const effectiveLevel = hostLevelRef.current;
    const resolvedMaxSeats = clampPartyMaxSeatsForHostLevel(
      updatedMaxSeats ?? maxSeatsRef.current,
      effectiveLevel
    );
    const sanitizedSeats = normalizeSeats(updatedSeats, resolvedMaxSeats, effectiveLevel);
    const resolvedBgType = updatedBackground?.backgroundType ?? backgroundRef.current.backgroundType;
    const resolvedBgId = updatedBackground?.backgroundId ?? backgroundRef.current.backgroundId;
    const resolvedBgImage =
      updatedBackground?.backgroundImage !== undefined
        ? updatedBackground.backgroundImage
        : backgroundRef.current.backgroundImage;

    const liveParticipantCount = participantTotalRef.current;
    const liveHostPresent = participantsListRef.current.some((p) => p.userId === room.host.id);
    const nextRoom: PartyRoom = {
      ...room,
      host: isRoomHost ? { ...room.host, level: effectiveLevel } : room.host,
      maxSeats: resolvedMaxSeats,
      seats: sanitizedSeats,
      mutedSeatIndices: mutedSeatIndices.filter((i) => i < resolvedMaxSeats),
      numericParticipants: liveParticipantCount,
      participantCount: String(liveParticipantCount),
      isLocked: updatedLocked !== undefined ? updatedLocked : isSeatLocked,
      allowJoin: updatedAllowJoin !== undefined ? updatedAllowJoin : isAllowJoin,
      announcement: updatedAnnouncement !== undefined ? updatedAnnouncement : roomAnnouncement,
      seatRequests: updatedRequests !== undefined ? updatedRequests : seatRequests,
      hostPresent: liveHostPresent,
      isOwnerPresent: liveHostPresent,
      backgroundType: resolvedBgType,
      backgroundId: resolvedBgId,
      backgroundImage: resolvedBgImage,
    };
    onUpdateRoom?.(nextRoom);
    if (!skipFirestoreSync) {
      void syncFirestorePartyRoomState(room.id, isRoomHost, {
        isModerator: isCurrentUserModerator,
        hostLevel: effectiveLevel,
        maxSeats: resolvedMaxSeats,
        seats: sanitizedSeats,
        seatRequests: nextRoom.seatRequests,
        numericParticipants: liveParticipantCount,
        participantCount: String(liveParticipantCount),
        mutedSeatIndices: nextRoom.mutedSeatIndices,
        isLocked: nextRoom.isLocked,
        allowJoin: nextRoom.allowJoin,
        announcement: nextRoom.announcement,
        backgroundType: resolvedBgType,
        backgroundId: resolvedBgId,
        backgroundImage: resolvedBgImage,
      });
    }
  };

  const handleUpdatePartyBackground = (selection: PartyBackgroundSelection) => {
    if (!isRoomHost) {
      showToast('Only the party host can change the room background.');
      return;
    }
    const nextBgType = normalizePartyBackgroundType(selection.backgroundType);
    const nextBgId = selection.backgroundId || DEFAULT_PARTY_BACKGROUND_ID;
    const nextBgImage =
      nextBgType === 'host_dp'
        ? room.host.avatar || selection.backgroundImage || ''
        : nextBgType === 'custom'
        ? selection.backgroundImage || ''
        : '';

    setBackgroundType(nextBgType);
    setBackgroundId(nextBgId);
    setBackgroundImage(nextBgImage);
    backgroundRef.current = {
      backgroundType: nextBgType,
      backgroundId: nextBgId,
      backgroundImage: nextBgImage,
    };

    void liveAndRoomService.updateRoomSettings(room.id, currentUser.id, {
      backgroundType: nextBgType,
      backgroundId: nextBgId,
      backgroundImage: nextBgImage,
    });
    syncRoom(seats, seatRequests, isSeatLocked, isAllowJoin, roomAnnouncement, false, maxSeats, {
      backgroundType: nextBgType,
      backgroundId: nextBgId,
      backgroundImage: nextBgImage,
    });

    const label =
      nextBgType === 'host_dp'
        ? 'Host DP applied as party background'
        : nextBgType === 'custom'
        ? 'Gallery photo applied for everyone'
        : 'Party theme updated for everyone';
    showToast(label);
  };

  const handleToggleMyMic = () => {
    if (!isCurrentlySeated) {
      showToast('Take a seat first to use your microphone');
      return;
    }
    if (isHostMutedOnMySeat) {
      showToast('Your seat microphone is muted by Host');
      return;
    }
    const next = !isMicMuted;
    setIsMicMuted(next);
    showToast(next ? 'Mic muted' : 'Mic ON — speaking live');
  };

  // Sync compact state to App.tsx floating mini-player bar when minimized
  useEffect(() => {
    onMiniStateChange?.({
      isSeated: isCurrentlySeated,
      isMicMuted: isMicMuted || isHostMutedOnMySeat,
      participantCount: participantTotal,
      seatedCount: seats.filter(Boolean).length,
    });
  }, [isCurrentlySeated, isMicMuted, isHostMutedOnMySeat, participantTotal, seats, onMiniStateChange]);

  // React to mic toggle & exit triggers from the minimized floating mini-room bar
  const lastToggleMicSignalRef = useRef<number>(toggleMicSignal);
  useEffect(() => {
    if (toggleMicSignal > 0 && toggleMicSignal !== lastToggleMicSignalRef.current) {
      lastToggleMicSignalRef.current = toggleMicSignal;
      handleToggleMyMic();
    }
  }, [toggleMicSignal]);

  const lastExitSignalRef = useRef<number>(exitSignal);
  useEffect(() => {
    if (exitSignal > 0 && exitSignal !== lastExitSignalRef.current) {
      lastExitSignalRef.current = exitSignal;
      void handleCleanLeaveParty();
    }
  }, [exitSignal]);

  // Load registered Lenzo users for the Host "Invite Users" modal tab
  const loadInvitableUsers = async () => {
    if (inviteUsersLoading) return;
    setInviteUsersLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), limit(40)));
      const list: UserProfile[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Record<string, any>;
        const uid = docSnap.id;
        if (!uid || uid === currentUser.id || blockedUserIdsRef.current.has(uid)) return;
        list.push({
          id: uid,
          displayId: String(d.displayId || uid.slice(-6).toUpperCase()),
          name: String(d.name || d.displayName || 'Lenzo User'),
          username: String(d.username || `@${uid.slice(0, 6)}`),
          avatar: String(d.avatar || d.photoURL || ''),
          bio: String(d.bio || ''),
          level: typeof d.level === 'number' ? d.level : 1,
          vipLevel: typeof d.vipLevel === 'number' ? d.vipLevel : 0,
          isVIP: Boolean(d.isVIP || (d.vipLevel || 0) > 0),
          fansCount: String(d.fansCount || '0'),
          followingCount: Number(d.followingCount || 0),
          likesCount: String(d.likesCount || '0'),
          coins: 0,
          diamonds: 0,
        });
      });
      setInvitableUsers(list);
    } catch {
      // Non-fatal
    } finally {
      setInviteUsersLoading(false);
    }
  };

  const openHostInviteModal = (preferredSeat?: number) => {
    const firstOpenSeat = seats.findIndex(
      (s, i) => i > 0 && !s && isSeatIndexAllowedForRoom(i, maxSeats, hostLevel)
    );
    const resolvedSeat =
      typeof preferredSeat === 'number'
        ? preferredSeat
        : firstOpenSeat !== -1
        ? firstOpenSeat
        : Math.min(2, maxSeats - 1);
    setInviteModalTab(typeof preferredSeat === 'number' ? 'room' : 'users');
    setShowInviteToSeatModal(resolvedSeat);
    void loadInvitableUsers();
    if (!hasFsParticipantsRef.current) {
      liveAndRoomService.fetchRoomParticipants(room.id, 1, 50).then((r) => {
        if (r.participants.length > 0 && !hasFsParticipantsRef.current) {
          const reconciled = reconcileParticipantsWithSeats(r.participants, seatsRef.current);
          setParticipantsList(reconciled);
          participantsListRef.current = reconciled;
          setParticipantTotal(reconciled.length);
          participantTotalRef.current = reconciled.length;
        }
      });
    }
  };

  const handleChangeSeatMode = (targetSeats: PartySeatCount) => {
    if (!isRoomHost) return;
    if (!isSeatModeUnlockedForLevel(targetSeats, hostLevel)) {
      const reqLv = targetSeats === 16 ? 20 : 10;
      showToast(`Reach Level ${reqLv} to unlock ${targetSeats}-seat Party Rooms (Current: Lv.${hostLevel})`);
      return;
    }
    const clamped = clampPartyMaxSeatsForHostLevel(targetSeats, hostLevel);
    if (clamped === maxSeats) return;
    const resizedSeats = normalizeSeats(seats, clamped, hostLevel);
    const nextMuted = mutedSeatIndices.filter((idx) => idx < clamped);
    const nextRequests = seatRequests.filter(
      (r) => r.seatIndex >= 0 && r.seatIndex < clamped && !isSeatLockedByHostLevel(r.seatIndex, hostLevel)
    );
    setMaxSeats(clamped);
    setSeats(resizedSeats);
    setMutedSeatIndices(nextMuted);
    setSeatRequests(nextRequests);
    void liveAndRoomService.updateRoomSettings(room.id, currentUser.id, { maxSeats: clamped });
    syncRoom(resizedSeats, nextRequests, isSeatLocked, isAllowJoin, roomAnnouncement, false, clamped);
    showToast(`Room updated to ${clamped}-seat layout`);
  };

  // Cleanly exit party room (vacates seat — including Host Seat #1 — updates count & lifecycle, disconnects voice & leaves room)
  const handleCleanLeaveParty = async () => {
    setShowExitRoomModal(false);
    setShowSettingsSheet(false);
    hasExplicitlyLeftRef.current = true;
    markUserRecentlyLeft(currentUser.id);
    const leavingSeatIdx = seatsRef.current.findIndex((s) => s?.id === currentUser.id);
    const targetSeatIdx = leavingSeatIdx !== -1 ? leavingSeatIdx : isRoomHost ? 0 : undefined;
    const nextSeats = seatsRef.current.map((s, idx) =>
      s?.id === currentUser.id || (isRoomHost && idx === 0) ? null : s
    );
    const remainingParticipants = participantsListRef.current.filter((p) => p.userId !== currentUser.id);
    const remainingCount = remainingParticipants.length;
    const now = Date.now();
    const nextStatus: 'active' | 'empty' = remainingCount === 0 ? 'empty' : 'active';
    const nextEmptySince = remainingCount === 0 ? now : null;
    const nextClosesAt = remainingCount === 0 ? now + EMPTY_ROOM_CLEANUP_MS : null;
    const nextHostPresent = isRoomHost ? false : room.hostPresent;

    // Immediately reflect empty host seat, cleared avatar, updated participants & count in UI + parent room directory
    setSeats(nextSeats);
    seatsRef.current = nextSeats;
    setParticipantsList(remainingParticipants);
    participantsListRef.current = remainingParticipants;
    setParticipantTotal(remainingCount);
    participantTotalRef.current = remainingCount;
    onUpdateRoom?.({
      ...room,
      seats: nextSeats,
      numericParticipants: remainingCount,
      participantCount: String(remainingCount),
      hostPresent: nextHostPresent,
      isOwnerPresent: nextHostPresent,
      status: nextStatus,
      emptySince: nextEmptySince,
      closesAt: nextClosesAt,
    });

    if (isRoomHost) {
      await partyMusicEngine.stop().catch(() => {});
    }
    void releasePartyScreenWakeLock(`party_room_${room.id}`);
    webrtcMediaService.stopPartyVoice();
    if (realMicAnalyserRef.current) {
      realMicAnalyserRef.current.cleanup();
      realMicAnalyserRef.current = null;
    }
    if (realMicStreamRef.current) {
      stopMediaStream(realMicStreamRef.current);
      realMicStreamRef.current = null;
    }
    await agoraRtcService.leaveChannel().catch(() => {});
    const [serverUpdatedRoom] = await Promise.all([
      liveAndRoomService.leavePartyRoom(room.id, currentUser.id).catch(() => null),
      targetSeatIdx !== undefined
        ? vacateFirestoreSeat(room.id, currentUser.id, targetSeatIdx, maxSeatsRef.current).catch(() => {})
        : Promise.resolve(),
      leaveFirestoreRoomParticipant(room.id).catch(() => {}),
      syncFirestorePartyRoomLifecycle(room.id, {
        numericParticipants: remainingCount,
        ...(isRoomHost ? { hostPresent: false } : {}),
        status: nextStatus,
        emptySince: nextEmptySince,
        closesAt: nextClosesAt,
      }).catch(() => {}),
    ]);
    if (serverUpdatedRoom) {
      onUpdateRoom?.(serverUpdatedRoom);
    }
    onClose();
  };

  // Seat Click Handler
  const handleSeatClick = (index: number) => {
    if (isSeatLockedByHostLevel(index, hostLevel)) {
      showToast(`Seat #2 unlocks when Host reaches Level 5 (Current: Lv.${hostLevel})`);
      return;
    }
    if (!isSeatIndexAllowedForRoom(index, maxSeats, hostLevel)) {
      showToast(
        index >= 8
          ? '16-seat stage unlocks when Host reaches Level 20'
          : '8-seat stage unlocks when Host reaches Level 10'
      );
      return;
    }
    const occupant = seats[index];
    const isMe = occupant?.id === currentUser.id;

    if (isMe) {
      setShowMySeatModal(index);
      return;
    }

    if (occupant) {
      if (canModerateTarget(occupant.id)) {
        setShowKickDurationPicker(false);
        setShowBlockMemberConfirm(false);
        setSelectedSeatMember({ index, user: occupant });
      } else {
        onSelectUser(occupant);
      }
      return;
    }

    if (canModerate) {
      if (isRoomHost && index === 0) {
        void handleOwnerTakeSeat(0);
        return;
      }
      const ownerSittingIdx = seats.findIndex((s) => s?.id === currentUser.id);
      if (ownerSittingIdx === -1) {
        setShowOwnerSeatChoice(index);
      } else {
        if (!hasFsParticipantsRef.current) {
          liveAndRoomService.fetchRoomParticipants(room.id, 1, 50).then((r) => {
            if (r.participants.length > 0 && !hasFsParticipantsRef.current) {
              const reconciled = reconcileParticipantsWithSeats(r.participants, seatsRef.current);
              setParticipantsList(reconciled);
              participantsListRef.current = reconciled;
              setParticipantTotal(reconciled.length);
              participantTotalRef.current = reconciled.length;
            }
          });
        }
        setShowInviteToSeatModal(index);
      }
      return;
    }

    if (isSeatLocked) {
      showToast('Seats are currently locked by Host');
      return;
    }
    if (!isAllowJoin) {
      showToast('Joining is currently disabled by Host');
      return;
    }

    const alreadySittingIdx = seats.findIndex((s) => s?.id === currentUser.id);
    if (alreadySittingIdx !== -1) {
      showToast(`You already occupy Seat #${alreadySittingIdx + 1}. Tap your seat to leave first.`);
      return;
    }

    const hasPending = seatRequests.some((r) => r.seatIndex === index && r.user.id === currentUser.id);
    if (hasPending) {
      showToast(`Your join request for Seat #${index + 1} is pending Host approval.`);
      return;
    }

    setRequestTargetSeat(index);
    setShowRequestConfirmModal(true);
  };

  const handleSendSeatRequest = async () => {
    if (requestTargetSeat === null) return;
    const targetSeat = requestTargetSeat;
    setShowRequestConfirmModal(false);
    if (isSeatLockedByHostLevel(targetSeat, hostLevel)) {
      showToast(`Seat #2 unlocks when Host reaches Level 5 (Current: Lv.${hostLevel})`);
      return;
    }
    if (!isSeatIndexAllowedForRoom(targetSeat, maxSeats, hostLevel)) {
      showToast('This seat is locked at the current Host level.');
      return;
    }
    if (!isRoomHost && blockedByUserIdsRef.current.has(room.host.id)) {
      showToast('You are blocked from requesting a seat in this room.');
      return;
    }

    const newReq: SeatRequest = {
      id: `sr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      user: currentUser,
      seatIndex: targetSeat,
      requestedAt: Date.now(),
    };

    // Primary atomic persistence: Cloud Firestore (works cross-device Web <-> Android even when Express is restarted/unreachable)
    const fsRes = await submitFirestoreSeatRequest(room.id, newReq);

    // Best-effort Express/WS mirror (auto-hydrates Firestore-only rooms on server.ts)
    const serverPromise = roomService
      .requestSeat(room.id, currentUser, targetSeat, room.host.id, {
        host: room.host,
        title: room.title,
        maxSeats,
      })
      .catch((err) => ({ __err: err }));

    if (fsRes.success) {
      hadPendingSeatReqRef.current = true;
      const nextRequests: SeatRequest[] =
        Array.isArray(fsRes.seatRequests) && fsRes.seatRequests.length > 0
          ? fsRes.seatRequests
          : [...seatRequests.filter((r) => r.user.id !== currentUser.id), newReq];
      setSeatRequests(nextRequests);
      syncRoom(seats, nextRequests, undefined, undefined, undefined, true);
      showToast(`Seat request sent for Seat #${targetSeat + 1} — waiting for Host approval`);
      void serverPromise;
      return;
    }

    // Fallback: if Firestore failed (e.g., transient network), use Express response
    const srvRes: any = await serverPromise;
    if (srvRes && !srvRes.__err) {
      hadPendingSeatReqRef.current = true;
      const mappedReq: SeatRequest = {
        id: srvRes.id || newReq.id,
        user: srvRes.user || currentUser,
        seatIndex: srvRes.requestedSeatIndex ?? targetSeat,
        requestedAt: srvRes.createdAt || newReq.requestedAt,
      };
      const nextRequests: SeatRequest[] = [
        ...seatRequests.filter((r) => r.user.id !== currentUser.id),
        mappedReq,
      ];
      setSeatRequests(nextRequests);
      syncRoom(seats, nextRequests);
      showToast(`Seat request sent for Seat #${targetSeat + 1} — waiting for Host approval`);
      return;
    }

    const rawErr = String(fsRes.error || srvRes?.__err?.message || '');
    console.warn('[Party Seat Request] Failed:', {
      roomId: room.id,
      userId: currentUser.id,
      targetSeat,
      firestoreError: fsRes.error,
      backendError: srvRes?.__err?.message,
    });
    const friendlyErr = /failed to fetch|networkerror|unable to reach backend|timed out/i.test(rawErr)
      ? 'Network connection unstable — please try tapping the seat again.'
      : rawErr || 'Could not send seat request. Please try again.';
    showToast(friendlyErr);
  };

  const handleCancelMySeatRequest = async () => {
    cancelledOwnReqRef.current = true;
    hadPendingSeatReqRef.current = false;
    const fsRes = await cancelFirestoreSeatRequest(room.id, currentUser.id);
    void roomService.cancelSeatRequest(room.id, currentUser.id).catch(() => {});
    const nextRequests =
      fsRes.success && Array.isArray(fsRes.seatRequests)
        ? fsRes.seatRequests
        : seatRequests.filter((r) => r.user.id !== currentUser.id);
    setSeatRequests(nextRequests);
    syncRoom(seats, nextRequests, undefined, undefined, undefined, fsRes.success);
    showToast('Seat request cancelled');
  };

  const handleAcceptSeatRequest = async (req: SeatRequest) => {
    clearUserRecentlyLeft(req.user.id);
    // Immediate optimistic seat & participant update so the user's profile appears with zero delay
    const optimisticSeats = normalizeSeats(seatsRef.current, maxSeats, hostLevel);
    const prevIdxOpt = optimisticSeats.findIndex((s) => s?.id === req.user.id);
    if (prevIdxOpt !== -1) optimisticSeats[prevIdxOpt] = null;
    let optTargetIdx =
      req.seatIndex >= 0 && req.seatIndex < maxSeats && optimisticSeats[req.seatIndex] === null
        ? req.seatIndex
        : optimisticSeats.findIndex((s) => s === null);
    if (optTargetIdx !== -1) {
      optimisticSeats[optTargetIdx] = req.user;
      const optRequests = seatRequests.filter((r) => r.user.id !== req.user.id);
      setSeats(optimisticSeats);
      seatsRef.current = optimisticSeats;
      setSeatRequests(optRequests);
      const optParticipants = reconcileParticipantsWithSeats(
        participantsListRef.current,
        optimisticSeats
      );
      setParticipantsList(optParticipants);
      participantsListRef.current = optParticipants;
      setParticipantTotal(optParticipants.length);
      participantTotalRef.current = optParticipants.length;
    }

    // Primary atomic approval in Cloud Firestore so viewer immediately enters seat & activates mic cross-device
    const fsRes = await respondFirestoreSeatRequest(
      room.id,
      req.user,
      true,
      req.seatIndex,
      maxSeats
    );

    // Mirror to Express/WS in parallel
    const serverPromise = roomService
      .respondSeatRequest(room.id, currentUser.id, req.user.id, true, req.seatIndex, req.user)
      .catch(() => null);

    if (fsRes.success && Array.isArray(fsRes.seats)) {
      const nextSeats = normalizeSeats(fsRes.seats, maxSeats);
      const nextRequests = Array.isArray(fsRes.seatRequests)
        ? fsRes.seatRequests
        : seatRequests.filter((r) => r.user.id !== req.user.id);
      const assignedSeat =
        typeof fsRes.assignedSeatIndex === 'number' && fsRes.assignedSeatIndex >= 0
          ? fsRes.assignedSeatIndex
          : req.seatIndex;
      setSeats(nextSeats);
      seatsRef.current = nextSeats;
      setSeatRequests(nextRequests);
      const nextParticipants = reconcileParticipantsWithSeats(participantsListRef.current, nextSeats);
      setParticipantsList(nextParticipants);
      participantsListRef.current = nextParticipants;
      setParticipantTotal(nextParticipants.length);
      participantTotalRef.current = nextParticipants.length;
      syncRoom(nextSeats, nextRequests, undefined, undefined, undefined, true);
      showToast(`Approved ${req.user.name} for Seat #${assignedSeat + 1}`);
      void serverPromise;
      return;
    }

    // Fallback to Express response or optimistic local sync
    const srvRes = await serverPromise;
    if (srvRes?.seats) {
      const nextSeats = normalizeSeats(srvRes.seats, maxSeats);
      const nextRequests = seatRequests.filter((r) => r.user.id !== req.user.id);
      setSeats(nextSeats);
      seatsRef.current = nextSeats;
      setSeatRequests(nextRequests);
      const nextParticipants = reconcileParticipantsWithSeats(participantsListRef.current, nextSeats);
      setParticipantsList(nextParticipants);
      participantsListRef.current = nextParticipants;
      setParticipantTotal(nextParticipants.length);
      participantTotalRef.current = nextParticipants.length;
      syncRoom(nextSeats, nextRequests);
      showToast(`Approved ${req.user.name} for Seat #${(srvRes.seatIndex ?? req.seatIndex) + 1}`);
      return;
    }

    const updated = [...seats];
    const prevIdx = updated.findIndex((s) => s?.id === req.user.id);
    if (prevIdx !== -1) updated[prevIdx] = null;
    let targetIdx = req.seatIndex;
    if (updated[targetIdx] !== null || isSeatLockedByHostLevel(targetIdx, hostLevel)) {
      const emptyIdx = updated.findIndex((s, i) => s === null && !isSeatLockedByHostLevel(i, hostLevel));
      if (emptyIdx === -1) {
        showToast(fsRes.error || 'All unlocked seats are currently full');
        return;
      }
      targetIdx = emptyIdx;
    }
    updated[targetIdx] = req.user;
    const nextRequests = seatRequests.filter((r) => r.user.id !== req.user.id);
    setSeats(updated);
    setSeatRequests(nextRequests);
    syncRoom(updated, nextRequests);
    showToast(`Approved ${req.user.name} for Seat #${targetIdx + 1}`);
  };

  const handleRejectSeatRequest = async (req: SeatRequest) => {
    const fsRes = await respondFirestoreSeatRequest(
      room.id,
      req.user,
      false,
      req.seatIndex,
      maxSeats
    );
    void roomService
      .respondSeatRequest(room.id, currentUser.id, req.user.id, false, req.seatIndex, req.user)
      .catch(() => null);

    const nextRequests =
      fsRes.success && Array.isArray(fsRes.seatRequests)
        ? fsRes.seatRequests
        : seatRequests.filter((r) => r.user.id !== req.user.id);
    setSeatRequests(nextRequests);
    syncRoom(seats, nextRequests, undefined, undefined, undefined, fsRes.success);
    showToast(`Declined request from ${req.user.name}`);
  };

  const handleToggleSeatMute = async (seatIndex: number) => {
    if (!canModerate) return;
    const occupant = seats[seatIndex];
    if (occupant && !canModerateTarget(occupant.id)) {
      showToast('You cannot mute this user');
      return;
    }
    const currentlyMuted = mutedSeatIndices.includes(seatIndex);
    try {
      const nextMuted = await liveAndRoomService.muteRoomSeat(
        room.id,
        currentUser.id,
        seatIndex,
        !currentlyMuted
      );
      setMutedSeatIndices(nextMuted);
      void syncFirestorePartyRoomState(room.id, isRoomHost, {
        isModerator: isCurrentUserModerator,
        mutedSeatIndices: nextMuted,
      });
      showToast(!currentlyMuted ? `Muted Seat #${seatIndex + 1}` : `Unmuted Seat #${seatIndex + 1}`);
    } catch {
      const nextMuted = currentlyMuted
        ? mutedSeatIndices.filter((i) => i !== seatIndex)
        : [...mutedSeatIndices, seatIndex];
      setMutedSeatIndices(nextMuted);
      void syncFirestorePartyRoomState(room.id, isRoomHost, {
        isModerator: isCurrentUserModerator,
        mutedSeatIndices: nextMuted,
      });
      showToast(!currentlyMuted ? `Muted Seat #${seatIndex + 1}` : `Unmuted Seat #${seatIndex + 1}`);
    }
  };

  const handleSelectSeatTheme = (nextTheme: PartySofaTheme) => {
    setSeatTheme(nextTheme);
    onUpdateRoom?.({ ...room, seatTheme: nextTheme });
    if (isRoomHost) {
      void syncFirestorePartyRoomState(room.id, true, { seatTheme: nextTheme });
    }
    showToast(
      nextTheme === 'gold'
        ? 'Seats changed to Golden theme'
        : nextTheme === 'green'
        ? 'Seats changed to Light Green theme'
        : 'Seats reset to Default color'
    );
  };

  const closeModerationModal = () => {
    setSelectedSeatMember(null);
    setShowKickDurationPicker(false);
    setShowBlockMemberConfirm(false);
  };

  // Remove from Seat ONLY (steps user down to audience without kicking from room — Host & Moderator)
  const handleRemoveFromSeat = async () => {
    if (!canModerate || !selectedSeatMember || selectedSeatMember.index === null) return;
    const idx = selectedSeatMember.index;
    const member = selectedSeatMember.user;
    if (!canModerateTarget(member.id)) {
      closeModerationModal();
      return;
    }

    // Optimistically remove from seat & unmute that slot so the plump sofa fluff-up triggers immediately
    const optimisticSeats = seats.map((s, i) => (i === idx || s?.id === member.id ? null : s));
    const nextMuted = mutedSeatIndices.filter((mIdx) => mIdx !== idx);
    closeModerationModal();
    setSeats(optimisticSeats);
    setMutedSeatIndices(nextMuted);

    const [fsRes] = await Promise.all([
      vacateFirestoreSeat(room.id, member.id, idx, maxSeats),
      roomService
        .removeSeat(
          room.id,
          currentUser.id,
          idx,
          { host: room.host, title: room.title, maxSeats },
          member.id
        )
        .catch(() => null),
    ]);

    const updated =
      fsRes.success && Array.isArray(fsRes.seats)
        ? normalizeSeats(fsRes.seats, maxSeats)
        : optimisticSeats;
    const resolvedMuted =
      fsRes.success && Array.isArray(fsRes.mutedSeatIndices)
        ? fsRes.mutedSeatIndices
        : nextMuted;
    setSeats(updated);
    setMutedSeatIndices(resolvedMuted);
    syncRoom(updated, undefined, undefined, undefined, undefined, fsRes.success);
    showToast(`Removed ${member.name} from Seat #${idx + 1}`);
  };

  // Kick User from Room for chosen duration (This Stream / 24 Hours / 15 Days / 30 Days — Host & Moderator)
  const handleKickUserWithDuration = async (durationType: RoomKickDuration) => {
    if (!canModerate || !selectedSeatMember || moderationBusy) return;
    const member = selectedSeatMember.user;
    const seatIdx = selectedSeatMember.index;
    if (!canModerateTarget(member.id)) {
      closeModerationModal();
      return;
    }
    setModerationBusy(true);
    try {
      const res = await kickUserFromRoom({
        roomId: room.id,
        roomTitle: room.title,
        hostId: room.host.id,
        targetUser: member,
        durationType,
        maxSeats,
      });
      if (!res.success) {
        showToast(res.error || 'Could not kick user. Please try again.');
        return;
      }
      // Also notify Express seat removal if seated
      if (seatIdx !== null) {
        void roomService
          .removeSeat(
            room.id,
            currentUser.id,
            seatIdx,
            { host: room.host, title: room.title, maxSeats },
            member.id
          )
          .catch(() => null);
      }
      const nextSeats = seats.map((s) => (s?.id === member.id ? null : s));
      const nextReqs = seatRequests.filter((r) => r.user.id !== member.id);
      setSeats(nextSeats);
      setSeatRequests(nextReqs);
      setParticipantsList((prev) => {
        const filtered = prev.filter((p) => p.userId !== member.id);
        setParticipantTotal(filtered.length);
        return filtered;
      });
      closeModerationModal();
      showToast(`Kicked ${member.name} (${formatKickDurationLabel(durationType)})`);
    } finally {
      setModerationBusy(false);
    }
  };

  // Permanently Block User (Host & Moderator — Moderator blocks on behalf of Host's rooms/streams)
  const handlePermanentBlockMember = async () => {
    if (!canModerate || !selectedSeatMember || moderationBusy) return;
    const member = selectedSeatMember.user;
    const seatIdx = selectedSeatMember.index;
    if (!canModerateTarget(member.id)) {
      closeModerationModal();
      return;
    }
    setModerationBusy(true);
    try {
      await Promise.all([
        isRoomHost && onBlockUser
          ? Promise.resolve(onBlockUser(member))
          : blockUserService({
              blockerId: room.host.id,
              targetUser: member,
              reason: `Blocked by Moderator ${currentUser.name}`,
            }),
        vacateFirestoreSeat(room.id, member.id, seatIdx ?? undefined, maxSeats).catch(() => null),
        cancelFirestoreSeatRequest(room.id, member.id).catch(() => null),
        evictFirestoreRoomParticipant(room.id, member.id).catch(() => null),
      ]);
      const nextSeats = seats.map((s) => (s?.id === member.id ? null : s));
      const nextReqs = seatRequests.filter((r) => r.user.id !== member.id);
      setSeats(nextSeats);
      setSeatRequests(nextReqs);
      setParticipantsList((prev) => {
        const filtered = prev.filter((p) => p.userId !== member.id);
        setParticipantTotal(filtered.length);
        return filtered;
      });
      closeModerationModal();
      showToast(`Permanently blocked ${member.name}`);
    } finally {
      setModerationBusy(false);
    }
  };

  // Host-only: Assign or Remove Lifetime Moderator
  const handleToggleModeratorRole = async (target: UserProfile) => {
    if (!isRoomHost || !target?.id || target.id === currentUser.id || moderationBusy) return;
    const currentlyMod = moderatorIdsSet.has(target.id);
    setModerationBusy(true);
    try {
      if (currentlyMod) {
        const res = await removeHostModerator({
          hostId: currentUser.id,
          moderatorUserId: target.id,
        });
        if (res.success) {
          showToast(`Removed ${target.name} from Moderators`);
          closeModerationModal();
        } else {
          showToast(res.error || 'Could not remove moderator');
        }
      } else {
        const res = await assignHostModerator({
          hostId: currentUser.id,
          hostName: currentUser.name,
          targetUser: target,
        });
        if (res.success) {
          showToast(`${target.name} is now your Lifetime Moderator`);
          closeModerationModal();
        } else {
          showToast(res.error || 'Could not assign moderator');
        }
      }
    } finally {
      setModerationBusy(false);
    }
  };

  // Delete single comment (Host, Moderator, or comment author)
  const handleDeleteSingleComment = async (act: ActivityItem) => {
    if (!act?.id) return;
    const canDelete = canModerate || act.userId === currentUser.id;
    if (!canDelete) return;
    setActivities((prev) => prev.filter((item) => item.id !== act.id));
    if (replyTarget?.id === act.id) setReplyTarget(null);
    if (editingComment?.id === act.id) {
      setEditingComment(null);
      setInputMessage('');
    }
    if (act.type !== 'join' && act.type !== 'leave') {
      await deleteFirestoreRoomMessage(room.id, act.id);
    }
    showToast('Comment deleted');
  };

  // Clear entire room comment history (Host & Moderator)
  const handleClearAllComments = async () => {
    if (!canModerate || isClearingChat) return;
    setIsClearingChat(true);
    try {
      const ok = await clearFirestoreRoomMessages(room.id);
      lastChatClearedAtRef.current = Date.now();
      setActivities([]);
      setReplyTarget(null);
      setEditingComment(null);
      setShowClearChatConfirmModal(false);
      showToast(ok ? 'All chat comments cleared' : 'Chat cleared locally');
    } finally {
      setIsClearingChat(false);
    }
  };

  // Start swipe/tap reply & @mention for a comment
  const handleStartReply = (act: ActivityItem) => {
    if (!act?.name) return;
    setEditingComment(null);
    setReplyTarget({
      id: act.id,
      senderId: act.userId,
      senderName: act.name,
      text: act.text,
    });
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 30);
  };

  // Start editing own comment (strictly author-only)
  const handleStartEditComment = (act: ActivityItem) => {
    if (!act?.id || act.userId !== currentUser.id) return;
    if (act.type === 'join' || act.type === 'leave' || act.type === 'gift') return;
    setReplyTarget(null);
    setEditingComment({
      id: act.id,
      originalText: act.text,
    });
    setInputMessage(act.text);
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 30);
  };

  // ============================================================================
  // GLOBAL PARTY MUSIC CONTROLS (Host-Authorized Real Audio Distribution & Sync)
  // ============================================================================
  const musicRoomMeta = () => ({
    host: room.host,
    title: room.title,
    maxSeats: maxSeatsRef.current,
  });

  const startHostTrackAtIndex = async (
    index: number,
    explicitQueue?: PartyMusicTrackMeta[]
  ) => {
    if (!isRoomHost) {
      showToast('Only the Party Host can control room music.');
      return;
    }
    const queue = explicitQueue || partyMusicStateRef.current.queue;
    if (index < 0 || index >= queue.length) return;
    const track = queue[index];
    setMusicErrorMessage(null);
    musicAutoNextGuardRef.current = null;

    if (track.sourceType === 'youtube') {
      // Ensure any local RTC gallery audio track is cleanly unpublished before switching to YouTube Sync
      await partyMusicEngine.stop();
      const res = await liveAndRoomService.updateRoomMusicState({
        roomId: room.id,
        hostId: currentUser.id,
        action: 'play',
        track,
        queue,
        currentIndex: index,
        positionSec: 0,
        volume: partyMusicStateRef.current.volume,
        audioTransport: 'youtube_sync',
        roomMeta: musicRoomMeta(),
      });
      if (!res.success) {
        const err = res.error || 'Failed to sync YouTube track to room.';
        setMusicErrorMessage(err);
        showToast(err);
        return;
      }
      if (res.musicState) setPartyMusicState(res.musicState);
      showToast(`Playing YouTube Sync: ${track.title}`);
      return;
    }

    // Gallery Audio or Gallery Video -> extract & publish real audio into Party RTC channel!
    const localEntry = localMusicEntriesRef.current.get(track.id);
    if (!localEntry?.file && !localEntry?.nativeFileUrl) {
      const err = 'Local media file is no longer in memory. Please re-select the file from Gallery.';
      setMusicErrorMessage(err);
      showToast(err);
      return;
    }

    const playResult = await partyMusicEngine.playLocalFile({
      entry: localEntry,
      transport: voiceTransportRef.current,
      volumePercent: partyMusicStateRef.current.volume,
      startPositionSec: 0,
    });

    if (!playResult.ok) {
      const err = playResult.error || 'Unable to broadcast selected media track.';
      setMusicErrorMessage(err);
      showToast(err);
      return;
    }

    const updatedTrack: PartyMusicTrackMeta = {
      ...track,
      durationSec: playResult.durationSec > 0 ? playResult.durationSec : track.durationSec,
    };
    const updatedQueue = queue.map((t, i) => (i === index ? updatedTrack : t));

    const syncRes = await liveAndRoomService.updateRoomMusicState({
      roomId: room.id,
      hostId: currentUser.id,
      action: 'play',
      track: updatedTrack,
      queue: updatedQueue,
      currentIndex: index,
      positionSec: 0,
      volume: partyMusicStateRef.current.volume,
      audioTransport: playResult.transport,
      roomMeta: musicRoomMeta(),
    });

    if (syncRes.musicState) {
      setPartyMusicState(syncRes.musicState);
    } else {
      setPartyMusicState((prev) => ({
        ...prev,
        status: 'playing',
        activeTrack: updatedTrack,
        queue: updatedQueue,
        currentIndex: index,
        positionSec: 0,
        updatedAt: Date.now(),
        audioTransport: playResult.transport,
      }));
    }
    showToast(
      track.sourceType === 'gallery_video'
        ? `Streaming video audio to room: ${track.title}`
        : `Playing for all listeners: ${track.title}`
    );
  };

  const handleAddGalleryFiles = async (
    files: FileList,
    sourceType: 'gallery_audio' | 'gallery_video'
  ) => {
    if (!isRoomHost) return;
    setMusicErrorMessage(null);
    const addedTracks: PartyMusicTrackMeta[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const check = validateGalleryMediaFile(file, sourceType);
      if (!check.valid) {
        errors.push(check.error || `Unsupported file: ${file.name}`);
        continue;
      }
      const id = `trk_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
      const meta: PartyMusicTrackMeta = {
        id,
        title: cleanFileTrackTitle(file.name),
        sourceType,
        durationSec: 0,
        mimeType: file.type || undefined,
      };
      localMusicEntriesRef.current.set(id, { meta, file });
      addedTracks.push(meta);
    }

    if (errors.length > 0) {
      setMusicErrorMessage(errors[0]);
      showToast(errors[0]);
    }
    if (addedTracks.length === 0) return;

    const prevQueue = partyMusicStateRef.current.queue;
    const nextQueue = [...prevQueue, ...addedTracks];
    const shouldAutoPlay =
      partyMusicStateRef.current.status !== 'playing' && partyMusicStateRef.current.status !== 'paused';

    if (shouldAutoPlay) {
      await startHostTrackAtIndex(prevQueue.length, nextQueue);
    } else {
      const res = await liveAndRoomService.updateRoomMusicState({
        roomId: room.id,
        hostId: currentUser.id,
        action: 'queue_update',
        queue: nextQueue,
        roomMeta: musicRoomMeta(),
      });
      if (res.musicState) setPartyMusicState(res.musicState);
      showToast(`Added ${addedTracks.length} track${addedTracks.length > 1 ? 's' : ''} to Party Queue`);
    }
  };

  const handlePickNativeGalleryMedia = async (
    sourceType: 'gallery_audio' | 'gallery_video'
  ): Promise<boolean> => {
    if (!isRoomHost || !isNativeAndroidApp()) return false;
    setMusicErrorMessage(null);
    try {
      const picked = await pickNativePartyMediaFile(sourceType === 'gallery_video' ? 'video' : 'audio');
      if (!picked) {
        return false; // Fall back to HTML file input if native bridge unavailable
      }
      if (picked.cancelled) {
        return true;
      }
      if (!picked.webViewFileUrl) {
        const err = 'Unable to open selected file from Android storage. Please try another file.';
        setMusicErrorMessage(err);
        showToast(err);
        return true;
      }

      const id = `trk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const meta: PartyMusicTrackMeta = {
        id,
        title: cleanFileTrackTitle(picked.fileName || (sourceType === 'gallery_video' ? 'Gallery Video' : 'Gallery Audio')),
        artist: picked.extractedAudioOnly ? 'Gallery Video (Audio Extracted)' : undefined,
        sourceType,
        durationSec: picked.durationSec && picked.durationSec > 0 ? picked.durationSec : 0,
        mimeType: picked.mimeType || undefined,
      };
      localMusicEntriesRef.current.set(id, {
        meta,
        nativeFileUrl: picked.webViewFileUrl,
        audioCodec: picked.audioCodec,
        extractedAudioOnly: Boolean(picked.extractedAudioOnly),
        fileSize: picked.fileSize,
      });

      const prevQueue = partyMusicStateRef.current.queue;
      const nextQueue = [...prevQueue, meta];
      const shouldAutoPlay =
        partyMusicStateRef.current.status !== 'playing' && partyMusicStateRef.current.status !== 'paused';

      if (shouldAutoPlay) {
        await startHostTrackAtIndex(prevQueue.length, nextQueue);
      } else {
        const res = await liveAndRoomService.updateRoomMusicState({
          roomId: room.id,
          hostId: currentUser.id,
          action: 'queue_update',
          queue: nextQueue,
          roomMeta: musicRoomMeta(),
        });
        if (res.musicState) setPartyMusicState(res.musicState);
        showToast(`Added "${meta.title}" to Party Queue`);
      }
      return true;
    } catch (err: any) {
      const rawMsg = String(err?.message || '');
      if (rawMsg.toLowerCase().includes('not implemented') || rawMsg.toLowerCase().includes('unavailable')) {
        return false; // Fall back to standard file picker
      }
      const msg = rawMsg || 'Unable to load selected media file from Android gallery.';
      setMusicErrorMessage(msg);
      showToast(msg);
      return true;
    }
  };

  const handleAddYouTubeTrack = async (
    videoId: string,
    customTitle?: string,
    providedThumbnailUrl?: string,
    providedAuthorName?: string
  ) => {
    if (!isRoomHost) return;
    setMusicErrorMessage(null);
    let resolvedTitle = customTitle || `YouTube Video (${videoId})`;
    let resolvedThumb = providedThumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    let resolvedAuthor = providedAuthorName || 'YouTube';

    if (!customTitle) {
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.title) resolvedTitle = String(data.title).slice(0, 120);
          if (data?.thumbnail_url) resolvedThumb = String(data.thumbnail_url);
          if (data?.author_name) resolvedAuthor = String(data.author_name).slice(0, 80);
        }
      } catch {
        // Fallback to default YouTube label
      }
    }

    const newTrack: PartyMusicTrackMeta = {
      id: `yt_${videoId}_${Date.now()}`,
      title: resolvedTitle,
      artist: resolvedAuthor,
      sourceType: 'youtube',
      durationSec: 0,
      youtubeVideoId: videoId,
      thumbnailUrl: resolvedThumb,
    };

    const prevQueue = partyMusicStateRef.current.queue;
    const nextQueue = [...prevQueue, newTrack];
    await startHostTrackAtIndex(prevQueue.length, nextQueue);
  };

  const handleMusicTogglePlayPause = async () => {
    if (!isRoomHost) return;
    const st = partyMusicStateRef.current;
    if (!st.activeTrack || st.status === 'idle' || st.status === 'stopped') {
      if (st.queue.length > 0) {
        const targetIdx = st.currentIndex >= 0 && st.currentIndex < st.queue.length ? st.currentIndex : 0;
        await startHostTrackAtIndex(targetIdx);
      }
      return;
    }

    if (st.status === 'playing') {
      let pos = musicDisplayPosSec;
      if (st.activeTrack.sourceType !== 'youtube') {
        pos = await partyMusicEngine.pause();
      }
      const res = await liveAndRoomService.updateRoomMusicState({
        roomId: room.id,
        hostId: currentUser.id,
        action: 'pause',
        positionSec: pos,
        roomMeta: musicRoomMeta(),
      });
      if (res.musicState) setPartyMusicState(res.musicState);
    } else if (st.status === 'paused') {
      let pos = st.positionSec;
      if (st.activeTrack.sourceType !== 'youtube') {
        try {
          pos = await partyMusicEngine.resume();
        } catch {
          // If local engine needs reload, restart from saved position
          const idx = st.queue.findIndex((t) => t.id === st.activeTrack?.id);
          if (idx >= 0) {
            await startHostTrackAtIndex(idx);
            return;
          }
        }
      }
      const res = await liveAndRoomService.updateRoomMusicState({
        roomId: room.id,
        hostId: currentUser.id,
        action: 'resume',
        positionSec: pos,
        audioTransport: st.activeTrack.sourceType === 'youtube' ? 'youtube_sync' : partyMusicEngine.getState().transport,
        roomMeta: musicRoomMeta(),
      });
      if (res.musicState) setPartyMusicState(res.musicState);
    }
  };

  const handleMusicStop = async () => {
    if (!isRoomHost) return;
    await partyMusicEngine.stop();
    const res = await liveAndRoomService.updateRoomMusicState({
      roomId: room.id,
      hostId: currentUser.id,
      action: 'stop',
      roomMeta: musicRoomMeta(),
    });
    if (res.musicState) {
      setPartyMusicState(res.musicState);
    } else {
      setPartyMusicState((prev) => ({
        ...prev,
        status: 'stopped',
        activeTrack: null,
        currentIndex: -1,
        positionSec: 0,
        audioTransport: 'none',
      }));
    }
    setMusicErrorMessage(null);
    showToast('Party music stopped for all listeners');
  };

  const handleMusicNextTrack = async () => {
    if (!isRoomHost) return;
    const st = partyMusicStateRef.current;
    if (st.queue.length === 0) {
      await handleMusicStop();
      return;
    }
    const nextIdx = st.currentIndex >= 0 ? (st.currentIndex + 1) % st.queue.length : 0;
    await startHostTrackAtIndex(nextIdx);
  };
  const handleMusicNextTrackRef = useRef<(() => Promise<void>) | null>(null);
  handleMusicNextTrackRef.current = handleMusicNextTrack;

  const handleMusicPreviousTrack = async () => {
    if (!isRoomHost) return;
    const st = partyMusicStateRef.current;
    if (st.queue.length === 0) return;
    const prevIdx =
      st.currentIndex > 0 ? st.currentIndex - 1 : st.queue.length - 1;
    await startHostTrackAtIndex(prevIdx);
  };

  const handleMusicSeek = async (targetPosSec: number) => {
    if (!isRoomHost || !partyMusicStateRef.current.activeTrack) return;
    if (partyMusicStateRef.current.activeTrack.sourceType !== 'youtube') {
      partyMusicEngine.seek(targetPosSec);
    }
    setMusicDisplayPosSec(targetPosSec);
    const res = await liveAndRoomService.updateRoomMusicState({
      roomId: room.id,
      hostId: currentUser.id,
      action: 'seek',
      positionSec: targetPosSec,
      roomMeta: musicRoomMeta(),
    });
    if (res.musicState) setPartyMusicState(res.musicState);
  };

  const handleMusicVolumeChange = (volumePercent: number) => {
    if (!isRoomHost) return;
    const clamped = Math.max(0, Math.min(100, Math.round(volumePercent)));
    partyMusicEngine.setVolume(clamped);
    setPartyMusicState((prev) => ({ ...prev, volume: clamped }));
    void liveAndRoomService.updateRoomMusicState({
      roomId: room.id,
      hostId: currentUser.id,
      action: 'volume',
      volume: clamped,
      roomMeta: musicRoomMeta(),
    });
  };

  const handleRemoveQueueItem = async (trackId: string) => {
    if (!isRoomHost) return;
    const st = partyMusicStateRef.current;
    const wasActive = st.activeTrack?.id === trackId;
    const nextQueue = st.queue.filter((t) => t.id !== trackId);
    localMusicEntriesRef.current.delete(trackId);
    if (wasActive) {
      await partyMusicEngine.stop();
      if (nextQueue.length > 0) {
        await startHostTrackAtIndex(0, nextQueue);
        return;
      }
      const stopRes = await liveAndRoomService.updateRoomMusicState({
        roomId: room.id,
        hostId: currentUser.id,
        action: 'stop',
        queue: [],
        roomMeta: musicRoomMeta(),
      });
      if (stopRes.musicState) setPartyMusicState(stopRes.musicState);
      return;
    }
    const res = await liveAndRoomService.updateRoomMusicState({
      roomId: room.id,
      hostId: currentUser.id,
      action: 'queue_update',
      queue: nextQueue,
      roomMeta: musicRoomMeta(),
    });
    if (res.musicState) setPartyMusicState(res.musicState);
  };

  const handleSendSeatInvite = async (targetUser: UserProfile, directSeat = false) => {
    if (showInviteToSeatModal === null) return;
    const targetSeat = showInviteToSeatModal;
    if (!isSeatIndexAllowedForRoom(targetSeat, maxSeats, hostLevel)) {
      showToast(
        isSeatLockedByHostLevel(targetSeat, hostLevel)
          ? `Seat #2 unlocks when Host reaches Level 5 (Current: Lv.${hostLevel})`
          : 'This seat is locked at the current Host level.'
      );
      return;
    }

    if (directSeat) {
      setShowInviteToSeatModal(null);
      clearUserRecentlyLeft(targetUser.id);
      // Optimistically place the user on the seat & in participants immediately
      const optimisticSeats = Array.from({ length: maxSeats }, (_, idx) => seatsRef.current[idx] || null);
      const prevIdxOpt = optimisticSeats.findIndex((s) => s?.id === targetUser.id);
      if (prevIdxOpt !== -1) optimisticSeats[prevIdxOpt] = null;
      optimisticSeats[targetSeat] = targetUser;
      setSeats(optimisticSeats);
      seatsRef.current = optimisticSeats;
      const optParticipants = reconcileParticipantsWithSeats(participantsListRef.current, optimisticSeats);
      setParticipantsList(optParticipants);
      participantsListRef.current = optParticipants;
      setParticipantTotal(optParticipants.length);
      participantTotalRef.current = optParticipants.length;

      const fsRes = await takeFirestoreSeatDirect(room.id, targetSeat, targetUser, maxSeats);
      void liveAndRoomService
        .takeSeatDirect(room.id, currentUser.id, targetSeat, targetUser)
        .catch(() => null);

      if (fsRes.success && Array.isArray(fsRes.seats)) {
        const nextSeats = Array.from({ length: maxSeats }, (_, idx) => fsRes.seats?.[idx] || null);
        const nextRequests = Array.isArray(fsRes.seatRequests) ? fsRes.seatRequests : seatRequests;
        setSeats(nextSeats);
        seatsRef.current = nextSeats;
        setSeatRequests(nextRequests);
        const nextParticipants = reconcileParticipantsWithSeats(participantsListRef.current, nextSeats);
        setParticipantsList(nextParticipants);
        participantsListRef.current = nextParticipants;
        setParticipantTotal(nextParticipants.length);
        participantTotalRef.current = nextParticipants.length;
        syncRoom(nextSeats, nextRequests, undefined, undefined, undefined, true);
        showToast(`Seated ${targetUser.name} on Seat #${targetSeat + 1}`);
        return;
      }

      syncRoom(optimisticSeats);
      showToast(`Seated ${targetUser.name} on Seat #${targetSeat + 1}`);
      return;
    }

    // Send real-time seat invitation to listener (popup with Accept/Decline + push notification)
    setInvitedUserIds((prev) => ({ ...prev, [targetUser.id]: true }));
    const [wsRes] = await Promise.all([
      liveAndRoomService.sendRoomInvite({
        roomId: room.id,
        hostId: currentUser.id,
        targetUserId: targetUser.id,
        targetUser,
        seatIndex: targetSeat,
        inviteType: 'seat',
        roomMeta: { host: room.host, title: room.title, maxSeats },
      }),
      sendPushNotification({
        targetUserId: targetUser.id,
        type: 'rooms',
        title: 'Seat Invitation',
        message: `${currentUser.name} invited you to Seat #${targetSeat + 1} in "${room.title}"`,
        avatar: currentUser.avatar,
        senderId: currentUser.id,
        senderName: currentUser.name,
        actionType: 'open_room',
        targetId: room.id,
        priority: 'high',
      }).catch(() => {}),
    ]);
    if (wsRes.success) {
      showToast(`Invitation sent to ${targetUser.name} for Seat #${targetSeat + 1}`);
    } else {
      showToast(`Invitation notification sent to ${targetUser.name}`);
    }
  };

  const handleSendRoomInviteToUser = async (targetUser: UserProfile) => {
    if (!targetUser?.id || targetUser.id === currentUser.id) return;
    setInvitedUserIds((prev) => ({ ...prev, [targetUser.id]: true }));
    const [wsRes] = await Promise.all([
      liveAndRoomService.sendRoomInvite({
        roomId: room.id,
        hostId: currentUser.id,
        targetUserId: targetUser.id,
        targetUser,
        inviteType: 'room',
        roomMeta: { host: room.host, title: room.title, maxSeats },
      }),
      sendPushNotification({
        targetUserId: targetUser.id,
        type: 'rooms',
        title: 'Party Room Invitation',
        message: `${currentUser.name} invited you to join "${room.title}"`,
        avatar: currentUser.avatar,
        senderId: currentUser.id,
        senderName: currentUser.name,
        actionType: 'open_room',
        targetId: room.id,
        priority: 'high',
      }).catch(() => {}),
    ]);
    if (wsRes.success) {
      showToast(`Invited ${targetUser.name} to join this room!`);
    } else {
      showToast(`Room invitation sent to ${targetUser.name}!`);
    }
  };

  const handleAcceptSeatInvitation = async () => {
    if (!incomingSeatInvite) return;
    const idx = incomingSeatInvite.seatIndex;
    const invitedUser = incomingSeatInvite.toUser;
    if (!isSeatIndexAllowedForRoom(idx, maxSeats, hostLevel)) {
      showToast('This seat is locked at the current Host level.');
      setIncomingSeatInvite(null);
      return;
    }
    setIncomingSeatInvite(null);
    clearUserRecentlyLeft(invitedUser.id);

    // Optimistically display user on seat & in room participants immediately
    const optimisticSeats = Array.from({ length: maxSeats }, (_, i) => seatsRef.current[i] || null);
    const prevSeatOpt = optimisticSeats.findIndex((s) => s?.id === invitedUser.id);
    if (prevSeatOpt !== -1) optimisticSeats[prevSeatOpt] = null;
    optimisticSeats[idx] = invitedUser;
    setSeats(optimisticSeats);
    seatsRef.current = optimisticSeats;
    const optParticipants = reconcileParticipantsWithSeats(participantsListRef.current, optimisticSeats);
    setParticipantsList(optParticipants);
    participantsListRef.current = optParticipants;
    setParticipantTotal(optParticipants.length);
    participantTotalRef.current = optParticipants.length;

    if (invitedUser.id === currentUser.id) {
      void joinFirestoreRoomParticipant(room.id, currentUser, isRoomHost, true);
    }

    const fsRes = await takeFirestoreSeatDirect(room.id, idx, invitedUser, maxSeats);
    const updated =
      fsRes.success && Array.isArray(fsRes.seats)
        ? Array.from({ length: maxSeats }, (_, i) => fsRes.seats?.[i] || null)
        : optimisticSeats;
    setSeats(updated);
    seatsRef.current = updated;
    const nextParticipants = reconcileParticipantsWithSeats(participantsListRef.current, updated);
    setParticipantsList(nextParticipants);
    participantsListRef.current = nextParticipants;
    setParticipantTotal(nextParticipants.length);
    participantTotalRef.current = nextParticipants.length;
    syncRoom(updated, undefined, undefined, undefined, undefined, fsRes.success);
    showToast(`Joined Seat #${idx + 1} — mic is live`);
  };

  const handleOwnerTakeSeat = async (index: number) => {
    setShowOwnerSeatChoice(null);
    if (!isSeatIndexAllowedForRoom(index, maxSeats, hostLevel)) {
      showToast('This seat is locked at the current Host level.');
      return;
    }
    clearUserRecentlyLeft(currentUser.id);

    // Immediate optimistic update so profile appears on seat & in participants with zero delay
    const optimisticSeats = normalizeSeats(seatsRef.current, maxSeats, hostLevel);
    const prevSeatOpt = optimisticSeats.findIndex((s) => s?.id === currentUser.id);
    if (prevSeatOpt !== -1) optimisticSeats[prevSeatOpt] = null;
    optimisticSeats[index] = currentUser;
    setSeats(optimisticSeats);
    seatsRef.current = optimisticSeats;
    const optParticipants = reconcileParticipantsWithSeats(participantsListRef.current, optimisticSeats);
    setParticipantsList(optParticipants);
    participantsListRef.current = optParticipants;
    setParticipantTotal(optParticipants.length);
    participantTotalRef.current = optParticipants.length;

    void joinFirestoreRoomParticipant(room.id, currentUser, isRoomHost, true);

    const fsRes = await takeFirestoreSeatDirect(room.id, index, currentUser, maxSeats);
    void liveAndRoomService
      .takeSeatDirect(room.id, currentUser.id, index, currentUser)
      .catch(() => null);

    if (fsRes.success && Array.isArray(fsRes.seats)) {
      const nextSeats = normalizeSeats(fsRes.seats, maxSeats, hostLevel);
      setSeats(nextSeats);
      seatsRef.current = nextSeats;
      const nextParticipants = reconcileParticipantsWithSeats(participantsListRef.current, nextSeats);
      setParticipantsList(nextParticipants);
      participantsListRef.current = nextParticipants;
      setParticipantTotal(nextParticipants.length);
      participantTotalRef.current = nextParticipants.length;
      syncRoom(nextSeats, undefined, undefined, undefined, undefined, true);
    } else {
      syncRoom(optimisticSeats);
    }
    showToast(`Took Seat #${index + 1}`);
  };

  const handleLeaveSeat = async (index: number) => {
    selfLeftSeatRef.current = true;
    setShowMySeatModal(null);
    setShowExitRoomModal(false);

    // Immediately clear seat locally so step-down is instant
    const optimisticSeats = seatsRef.current.map((s, i) =>
      i === index || s?.id === currentUser.id ? null : s
    );
    setSeats(optimisticSeats);
    seatsRef.current = optimisticSeats;
    void updateFirestoreRoomParticipantState(room.id, { isSpeaker: false });

    const fsRes = await vacateFirestoreSeat(room.id, currentUser.id, index, maxSeats);
    void liveAndRoomService.leaveOwnSeat(room.id, currentUser.id).catch(() => []);
    const nextSeats =
      fsRes.success && Array.isArray(fsRes.seats)
        ? normalizeSeats(fsRes.seats, maxSeats)
        : optimisticSeats;
    setSeats(nextSeats);
    seatsRef.current = nextSeats;
    syncRoom(nextSeats, undefined, undefined, undefined, undefined, fsRes.success);
    showToast(`Stepped down from Seat #${index + 1}`);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawText = inputMessage.trim();
    if (!rawText) {
      if (editingComment) {
        showToast('Comment cannot be empty');
      }
      return;
    }

    if (!isRoomHost && blockedByUserIdsRef.current.has(room.host.id)) {
      showToast('You are blocked from chatting in this room.');
      return;
    }

    // Save edited comment in-place (preserving ID, author, timestamp, replies, and metadata)
    if (editingComment) {
      const targetEdit = editingComment;
      setEditingComment(null);
      setInputMessage('');
      setShowEmojiPicker(false);

      if (rawText === targetEdit.originalText) {
        return;
      }

      // Update immediately in local comment feed
      setActivities((prev) =>
        prev.map((item) =>
          item.id === targetEdit.id && item.userId === currentUser.id
            ? { ...item, text: rawText, isEdited: true }
            : item
        )
      );

      const [fsEdited, wsEdited] = await Promise.all([
        editFirestoreRoomMessage(room.id, targetEdit.id, rawText),
        liveAndRoomService.editRoomChat(room.id, currentUser.id, targetEdit.id, rawText),
      ]);

      if (fsEdited || wsEdited) {
        showToast('Comment updated');
      } else {
        // Roll back local edit if both Firestore and backend failed
        setActivities((prev) =>
          prev.map((item) =>
            item.id === targetEdit.id
              ? { ...item, text: targetEdit.originalText }
              : item
          )
        );
        showToast('Could not update comment. Please try again.');
      }
      return;
    }

    const activeReply = replyTarget;
    const mentionTag = activeReply ? `@${activeReply.senderName}` : '';
    const text =
      activeReply && !rawText.toLowerCase().startsWith(mentionTag.toLowerCase())
        ? `${mentionTag} ${rawText}`
        : rawText;

    setInputMessage('');
    setReplyTarget(null);
    setShowEmojiPicker(false);

    let saved: {
      id: string;
      senderName: string;
      senderAvatar: string;
      text: string;
      isHost?: boolean;
    } | null = null;

    try {
      const backendSaved = await liveAndRoomService.sendRoomChat(room.id, currentUser, text);
      saved = backendSaved;
      optimisticSentMsgIdsRef.current.add(backendSaved.id);
      void sendFirestoreRoomMessage(room.id, currentUser, text, isRoomHost, backendSaved.id, activeReply);
    } catch (err: any) {
      const errMsg = String(err?.message || err || '');
      if (/block|403|forbidden/i.test(errMsg)) {
        showToast('You are blocked from chatting in this room.');
        return;
      }
      const fallbackId = `rm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      optimisticSentMsgIdsRef.current.add(fallbackId);
      saved = await sendFirestoreRoomMessage(room.id, currentUser, text, isRoomHost, fallbackId, activeReply);
    }

    if (saved) {
      const msgToAdd = saved;
      setActivities((prev) =>
        prev.some((a) => a.id === msgToAdd.id)
          ? prev
          : [
              ...prev,
              {
                id: msgToAdd.id,
                userId: currentUser.id,
                name: msgToAdd.senderName,
                avatar: msgToAdd.senderAvatar,
                text: msgToAdd.text,
                level: typeof currentUser.level === 'number' ? currentUser.level : 0,
                vipLevel: typeof currentUser.vipLevel === 'number' ? currentUser.vipLevel : 0,
                superVipLevel: typeof currentUser.superVipLevel === 'number' ? currentUser.superVipLevel : 0,
                isVIP: Boolean(currentUser.isVIP || (currentUser.vipLevel || 0) > 0),
                isHost: msgToAdd.isHost,
                type: 'chat',
                ...(activeReply ? { replyTo: activeReply } : {}),
                fromFirestore: true,
              },
            ]
      );
      setTimeout(() => activityBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 40);
    } else {
      showToast('Could not send message. Please check your connection.');
      setInputMessage(rawText);
      if (activeReply) setReplyTarget(activeReply);
    }
  };

  const flushHeartBatch = () => {
    const batch = pendingHeartBatchRef.current;
    if (batch.count <= 0) return;
    const countToSend = Math.min(batch.count, 20);
    const xToSend = batch.x;
    const yToSend = batch.y;
    pendingHeartBatchRef.current = { count: 0 };

    void liveAndRoomService.sendRoomHeart(room.id, currentUser.id, countToSend, {
      senderName: currentUser.name,
      x: xToSend,
      y: yToSend,
      roomHostId: room.host.id,
      roomMeta: { host: room.host, title: room.title, maxSeats },
    });
    void sendFirestoreRoomHeart(
      room.id,
      currentUser.id,
      currentUser.name,
      countToSend,
      xToSend,
      yToSend
    );
  };

  const queuePartyHeartSync = (xPercent?: number, yPercent?: number) => {
    setRoomLikesCount((prev) => prev + 1);
    pendingHeartBatchRef.current = {
      count: pendingHeartBatchRef.current.count + 1,
      x: xPercent ?? pendingHeartBatchRef.current.x,
      y: yPercent ?? pendingHeartBatchRef.current.y,
    };
    if (!heartBatchTimerRef.current) {
      heartBatchTimerRef.current = setTimeout(() => {
        heartBatchTimerRef.current = null;
        flushHeartBatch();
      }, 350);
    }
  };

  const handleTriggerHeart = () => {
    if (!isRoomHost && blockedByUserIdsRef.current.has(room.host.id)) {
      showToast('You cannot interact with this room.');
      return;
    }
    const x = 75 + Math.random() * 15;
    spawnHeartVisual(x, undefined, false);
    queuePartyHeartSync(x, undefined);
  };

  // Real Double-Tap Hearts anywhere on the Party Room stage (never interferes with seats/buttons or audio!)
  const handleStagePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null;
    if (
      target?.closest(
        'button, input, textarea, a, [data-seat-interactive="true"], [data-no-doubletap="true"]'
      )
    ) {
      return;
    }
    const now = Date.now();
    const prev = lastStageTapRef.current;
    const dx = prev ? Math.abs(e.clientX - prev.x) : 999;
    const dy = prev ? Math.abs(e.clientY - prev.y) : 999;

    if (prev && now - prev.time < 320 && dx < 65 && dy < 65) {
      if (!isRoomHost && blockedByUserIdsRef.current.has(room.host.id)) {
        showToast('You cannot interact with this room.');
        return;
      }
      const xPercent = (e.clientX / Math.max(1, window.innerWidth)) * 100;
      const yPercent = (e.clientY / Math.max(1, window.innerHeight)) * 100;
      // Burst at tap point + trailing floating heart for lively feedback
      spawnHeartVisual(xPercent, yPercent, true);
      spawnHeartVisual(xPercent + (Math.random() * 10 - 5), undefined, false);
      queuePartyHeartSync(xPercent, yPercent);
      // Keep last tap timestamp fresh so rapid repeated taps keep firing hearts smoothly
      lastStageTapRef.current = { time: now, x: e.clientX, y: e.clientY };
    } else {
      lastStageTapRef.current = { time: now, x: e.clientX, y: e.clientY };
    }
  };

  const myPendingSeatRequest = !isRoomHost
    ? seatRequests.find((r) => r.user.id === currentUser.id) || null
    : null;

  const handleOpenGiftModal = () => {
    if (onOpenGiftShop) {
      onOpenGiftShop(seats[0] || room.host);
    } else {
      showToast('Gift shop unavailable');
    }
  };

  const seatZero = seats[0] || null;
  const seatOne = seats[1] || null;
  const remainingSeatIndices = Array.from({ length: maxSeats - 2 }, (_, i) => i + 2);
  const gridColsClass = maxSeats === 16 ? 'grid-cols-4 sm:grid-cols-5' : 'grid-cols-3';
  const activeStageBackground = resolvePartyRoomBackground({
    backgroundType,
    backgroundId,
    backgroundImage,
    hostAvatar: room.host.avatar,
  });

  return (
    <div className="fixed inset-0 z-50 w-full h-dvh-screen bg-[#060212] flex flex-col justify-between overflow-hidden select-none text-white font-sans">
      {/* Synced Live Party Stage Background (Visible to Host, Guests & all Viewers) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden transition-all duration-500">
        {/* Base Theme Gradient */}
        <div
          className="absolute inset-0 transition-all duration-500"
          style={{ background: activeStageBackground.preset.gradient }}
        />

        {/* Optional Photo Layer (Host DP, Gallery Upload, or Scenic Preset) */}
        {activeStageBackground.imageUrl && (
          <img
            src={activeStageBackground.imageUrl}
            alt={activeStageBackground.label}
            referrerPolicy="no-referrer"
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
              activeStageBackground.useSoftBlur
                ? 'scale-110 blur-[6px] opacity-75'
                : activeStageBackground.type === 'custom'
                ? 'opacity-85'
                : 'opacity-55'
            }`}
          />
        )}

        {/* Ambient Spotlight Glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-[60%] opacity-40 blur-xl"
          style={{ background: activeStageBackground.preset.glow }}
        />

        {/* Cinematic Dark Scrim for Crisp Seat & Chat Readability */}
        <div
          className={`absolute inset-0 ${
            activeStageBackground.type === 'preset' && !activeStageBackground.imageUrl
              ? 'bg-gradient-to-b from-black/15 via-transparent to-[#060212]/70'
              : 'bg-gradient-to-b from-[#060212]/75 via-[#0B041B]/45 to-[#060212]/90'
          }`}
        />
      </div>

      {/* Floating & Double-Tap Burst Hearts */}
      {floatingHearts.map((heart) =>
        heart.isBurst && typeof heart.y === 'number' ? (
          <div
            key={heart.id}
            className="fixed pointer-events-none animate-double-tap-heart z-50"
            style={{
              left: `${heart.x}%`,
              top: `${heart.y}%`,
              transform: 'translate(-50%, -50%)',
              color: heart.color,
              fontSize: `${heart.size}px`,
              filter: 'drop-shadow(0 0 14px currentColor)',
            }}
          >
            💖
          </div>
        ) : (
          <div
            key={heart.id}
            className="fixed pointer-events-none animate-float-heart z-50"
            style={{
              left: `${heart.x}%`,
              bottom: '80px',
              color: heart.color,
              fontSize: `${heart.size}px`,
              filter: 'drop-shadow(0 0 8px currentColor)',
            }}
          >
            💖
          </div>
        )
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div className="absolute safe-top-offset-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-[#FF007A] to-[#FA26A0] text-white text-xs font-black py-2 px-5 rounded-full shadow-2xl animate-fade-in pointer-events-none border border-white/25 max-w-[90vw] text-center">
          {toastMessage}
        </div>
      )}

      {/* Global Gift Celebration Overlay */}
      {activeGiftCelebration && (
        <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/55 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center animate-bounce">
            <span className="text-7xl filter drop-shadow-[0_0_35px_#FA26A0] mb-3">
              {activeGiftCelebration.gift.icon}
            </span>
            <div className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#200A38] to-[#450E63] border-2 border-[#FA26A0] text-center shadow-2xl">
              <span className="text-sm font-black text-white block">
                {activeGiftCelebration.sender} sent {activeGiftCelebration.quantity}x{' '}
                {activeGiftCelebration.gift.name} to {activeGiftCelebration.recipient}
              </span>
              <span className="text-xs text-[#FFDF00] font-bold">
                +{(activeGiftCelebration.gift.coins * activeGiftCelebration.quantity).toLocaleString()} Coins
              </span>
            </div>
          </div>
        </div>
      )}

      {/* HEADER BAR */}
      <header className="relative z-30 flex items-center justify-between gap-2 px-3 safe-pt-2.5 pb-2">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          <button
            onClick={() => setShowExitRoomModal(true)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1F0C3B]/80 hover:bg-[#2C1252] border border-white/15 flex items-center justify-center text-white transition-all active:scale-95 shrink-0"
            title="Exit Party Options"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <div
            onClick={() => onSelectUser(room.host)}
            className="flex items-center gap-1.5 sm:gap-2 cursor-pointer active:scale-95 transition-transform min-w-0 flex-1"
          >
            {room.host.avatar ? (
              <img
                src={room.host.avatar}
                alt={room.host.name}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-2 ring-[#FFDF00] shrink-0"
              />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#8B20FF] ring-2 ring-[#FFDF00] flex items-center justify-center text-xs font-black shrink-0">
                {(room.host.name || 'H').charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-black text-white truncate leading-tight">
                {room.title}
              </span>
              <div className="flex items-center gap-1 text-[9.5px] sm:text-[10px] text-white/80 font-mono leading-tight min-w-0">
                <span className="truncate">ID:{room.displayId || room.id.slice(-5)}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-emerald-400 font-bold shrink-0">
                  {`${maxSeats}S`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Real-Time Top Viewers Avatar Stack + Participants Count Pill */}
          <button
            onClick={() => {
              if (!hasFsParticipantsRef.current) {
                liveAndRoomService
                  .fetchRoomParticipants(room.id, 1, 50)
                  .then((r) => {
                    if (r.participants.length > 0 && !hasFsParticipantsRef.current) {
                      const reconciled = reconcileParticipantsWithSeats(r.participants, seatsRef.current);
                      setParticipantsList(reconciled);
                      participantsListRef.current = reconciled;
                      setParticipantTotal(reconciled.length);
                      participantTotalRef.current = reconciled.length;
                    }
                  });
              }
              setShowParticipantsModal(true);
            }}
            className="flex items-center gap-1 px-2 sm:pl-1.5 sm:pr-2.5 h-7 sm:h-8 rounded-full bg-[#1C0B35]/90 border border-white/15 text-white text-[10px] font-mono font-bold shadow hover:bg-[#2B1252] transition-colors shrink-0"
            title="Real-Time Connected Viewers"
          >
            {participantsList.length > 0 && (
              <span className="hidden sm:flex items-center -space-x-1.5">
                {participantsList.slice(0, 3).map((p) => (
                  p.avatar ? (
                    <img
                      key={p.userId}
                      src={p.avatar}
                      alt={p.name}
                      className="w-5 h-5 rounded-full object-cover border border-[#1C0B35] ring-1 ring-white/30"
                    />
                  ) : (
                    <span
                      key={p.userId}
                      className="w-5 h-5 rounded-full bg-[#8B20FF] text-white text-[9px] font-black flex items-center justify-center border border-[#1C0B35] ring-1 ring-white/30"
                    >
                      {(p.name || 'V').charAt(0).toUpperCase()}
                    </span>
                  )
                ))}
              </span>
            )}
            <Users className="w-3 h-3 text-cyan-300 shrink-0" />
            <span>{participantTotal}</span>
          </button>

          {/* Real-Time Party Room & Global Leaderboard Trigger */}
          <button
            type="button"
            onClick={() => setShowLeaderboardModal(true)}
            className="w-7 h-7 sm:w-auto sm:h-8 sm:px-2.5 rounded-full bg-gradient-to-r from-[#3A2208]/95 to-[#241136]/95 hover:from-[#4E2E0B] hover:to-[#32174A] border border-[#FFC84A]/50 text-[#FFC84A] text-[10px] font-black shadow flex items-center justify-center gap-1 transition-all active:scale-95 shrink-0"
            title="Open Party Leaderboard (Hourly, Daily, Weekly, Monthly)"
          >
            <Trophy className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Rank</span>
          </button>

          {/* Local Mic Mute in Header (shown on sm+ tablets/desktop; mobile uses dedicated bottom-bar Mic button to prevent top-bar crowding) */}
          {isCurrentlySeated && (
            <button
              onClick={handleToggleMyMic}
              className={`hidden sm:flex w-8 h-8 rounded-full border items-center justify-center transition-all active:scale-95 shadow shrink-0 ${
                isMicMuted || isHostMutedOnMySeat
                  ? 'bg-rose-950/90 border-rose-500/50 text-rose-400'
                  : 'bg-[#1F0C3B]/80 border-emerald-400/50 text-emerald-400'
              }`}
              title={isMicMuted || isHostMutedOnMySeat ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isMicMuted || isHostMutedOnMySeat ? (
                <MicOff className="w-3.5 h-3.5" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Speaker Mute */}
          <button
            onClick={() => {
              const next = !isSpeakerMuted;
              setIsSpeakerMuted(next);
              if (!next) setAutoplayBlocked(false);
              agoraRtcService.setSpeakerMuted(next);
              webrtcMediaService.setPartySpeakerMuted(next);
              if (!next) {
                agoraRtcService.resumeRemoteAudio();
                webrtcMediaService.resumePartyRemoteAudio();
              }
              showToast(next ? 'Room audio muted' : 'Room audio active');
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1F0C3B]/80 hover:bg-[#2C1252] border border-white/15 flex items-center justify-center text-white transition-all active:scale-95 shrink-0"
            title="Speaker Mute/Unmute"
          >
            {isSpeakerMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Party Music Button (Host Controls / Listener Synchronized View) */}
          <button
            type="button"
            onClick={() => setShowMusicModal(true)}
            aria-label="Open Party Music"
            className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all active:scale-95 shrink-0 ${
              partyMusicState.status === 'playing'
                ? 'bg-[#071A38] border border-[#00D4FF] text-cyan-300 shadow-[0_0_14px_rgba(0,212,255,0.6)]'
                : 'bg-[#1F0C3B]/80 hover:bg-[#2C1252] border border-[#00D4FF]/40 text-cyan-200'
            }`}
            title={isRoomHost ? 'Party Music Player (Play for Room)' : 'Now Playing in Party'}
          >
            <Music className={`w-3.5 h-3.5 ${partyMusicState.status === 'playing' ? 'animate-pulse' : ''}`} />
            {partyMusicState.status === 'playing' && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0D041B]" />
            )}
          </button>

          {/* Host Quick Invite Button (Invite Friends/Users or Listeners to Seat) */}
          {isRoomHost && (
            <button
              type="button"
              onClick={() => openHostInviteModal()}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#071A38]/85 hover:bg-[#0D2B59] border border-[#00D4FF]/55 flex items-center justify-center text-cyan-300 shadow-[0_0_10px_rgba(0,212,255,0.3)] transition-all active:scale-95 shrink-0"
              title="Invite Users to Room or Seat"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Host Quick Background Picker Button */}
          {isRoomHost && (
            <button
              type="button"
              onClick={() => setShowBackgroundPicker(true)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1F0C3B]/80 hover:bg-[#2C1252] border border-[#FA26A0]/45 flex items-center justify-center text-[#FFB8E2] transition-all active:scale-95 shrink-0"
              title="Change Party Background (Themes, Host DP, Gallery)"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
          )}

          {/* More / Room Settings */}
          <button
            onClick={() => setShowSettingsSheet(true)}
            className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1F0C3B]/80 hover:bg-[#2C1252] border border-white/15 flex items-center justify-center text-white transition-all active:scale-95 shrink-0"
            title="Room Settings"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
            {canModerate && seatRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FA26A0] text-[9px] font-black flex items-center justify-center">
                {seatRequests.length}
              </span>
            )}
          </button>

          {/* Minimize Live Room Button (Keep Audio & Seat Connected in Floating Blue Neon Bar) */}
          {onMinimize && !isMinimized && (
            <button
              type="button"
              onClick={onMinimize}
              aria-label="Minimize Party Room"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#071A38]/90 hover:bg-[#0D2B59] border border-[#00D4FF]/60 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(0,212,255,0.38)] transition-all active:scale-95 shrink-0"
              title="Minimize Room (Stay Connected)"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Dedicated Exit Button (Host & Audience Exit Menu) */}
          <button
            onClick={() => setShowExitRoomModal(true)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-600/80 hover:bg-rose-600 border border-rose-400/40 flex items-center justify-center text-white transition-all active:scale-95 shrink-0"
            title="Exit Party Room"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* STAGE AREA (Double-tap anywhere on open stage to burst synced hearts!) */}
      <main
        onPointerDown={handleStagePointerDown}
        className="flex-1 relative z-10 flex flex-col justify-start px-3 sm:px-5 overflow-y-auto no-scrollbar space-y-3 touch-manipulation"
      >
        {/* Announcement Strip + Live Likes & Voice Status + Join Notice */}
        <div className="max-w-md mx-auto w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#17092E]/85 border border-white/10 text-[10px] font-bold">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                agoraVoiceState === 'connected'
                  ? 'bg-emerald-400'
                  : agoraVoiceState === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-400'
              }`}
            />
            <span className="text-white/85">
              {agoraVoiceState === 'connected'
                ? isCurrentlySeated
                  ? isMicMuted || isHostMutedOnMySeat
                    ? 'Seated • Mic Muted'
                    : 'Voice Live'
                  : 'Listening Live'
                : agoraVoiceState === 'connecting'
                ? 'Connecting Voice...'
                : 'Voice Reconnecting'}
            </span>
          </div>

          <div className="flex items-center gap-1.5" data-no-doubletap="true">
            {/* 3-Star Seat Color Switcher (Golden, Light Green, Default Seat Color) next to Heart */}
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#17092E]/88 border border-white/15 shadow-md backdrop-blur-md"
              title="Tap a Star to change Party Seat colors"
            >
              <button
                type="button"
                onClick={() => handleSelectSeatTheme('gold')}
                aria-label="Golden Seats Theme"
                title="Golden Seats"
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  seatTheme === 'gold'
                    ? 'bg-amber-400/25 ring-2 ring-[#FFD700] scale-110 shadow-[0_0_10px_rgba(255,215,0,0.75)]'
                    : 'hover:bg-white/10 opacity-85 hover:opacity-100'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-[#FFD700] fill-[#FFD700]" />
              </button>
              <button
                type="button"
                onClick={() => handleSelectSeatTheme('green')}
                aria-label="Light Green Seats Theme"
                title="Light Green Seats"
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  seatTheme === 'green'
                    ? 'bg-emerald-300/25 ring-2 ring-[#6EE7B7] scale-110 shadow-[0_0_10px_rgba(110,231,183,0.75)]'
                    : 'hover:bg-white/10 opacity-85 hover:opacity-100'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-[#6EE7B7] fill-[#6EE7B7]" />
              </button>
              <button
                type="button"
                onClick={() => handleSelectSeatTheme('default')}
                aria-label="Default Seats Theme"
                title="Default Seat Color"
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  seatTheme === 'default'
                    ? 'bg-purple-400/25 ring-2 ring-[#A855F7] scale-110 shadow-[0_0_10px_rgba(168,85,247,0.75)]'
                    : 'hover:bg-white/10 opacity-85 hover:opacity-100'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-[#A855F7] fill-[#A855F7]" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#240B3D]/85 border border-[#FA26A0]/35 text-[10px] font-black text-[#FFB3DE]">
              <span>💖</span>
              <span className="font-mono">{roomLikesCount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {roomAnnouncement && (
          <div className="max-w-md mx-auto w-full px-3 py-1.5 rounded-full bg-[#17092E]/85 border border-white/10 text-[11px] text-[#E6DCF8] text-center truncate">
            {roomAnnouncement}
          </div>
        )}

        {/* Global Party Music Now Playing Mini-Strip (Visible to Host, Seated Speakers & Non-Seated Listeners) */}
        {partyMusicState.activeTrack &&
          (partyMusicState.status === 'playing' || partyMusicState.status === 'paused') && (
            <div
              data-no-doubletap="true"
              className="max-w-md mx-auto w-full space-y-2"
            >
              <div
                onClick={() => setShowMusicModal(true)}
                className="w-full px-3 py-2 rounded-2xl bg-gradient-to-r from-[#071A38]/92 via-[#150C32]/92 to-[#220B3A]/92 border border-[#00D4FF]/45 shadow-[0_0_16px_rgba(0,212,255,0.22)] flex items-center justify-between gap-2 cursor-pointer backdrop-blur-md"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shrink-0">
                    <Radio
                      className={`w-3.5 h-3.5 ${
                        partyMusicState.status === 'playing' ? 'animate-pulse text-emerald-300' : 'text-amber-300'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black text-white truncate">
                      {partyMusicState.activeTrack.title}
                    </div>
                    <div className="text-[9.5px] font-bold text-cyan-200/80 truncate">
                      {partyMusicState.status === 'playing' ? 'Live Party Music' : 'Paused'} •{' '}
                      {partyMusicState.activeTrack.sourceType === 'youtube'
                        ? 'YouTube Sync'
                        : partyMusicState.activeTrack.sourceType === 'gallery_video'
                        ? 'Video Audio'
                        : 'Gallery Audio'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isRoomHost && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleMusicTogglePlayPause();
                      }}
                      aria-label={partyMusicState.status === 'playing' ? 'Pause Party Music' : 'Resume Party Music'}
                      className="w-7 h-7 rounded-full bg-[#00D4FF]/20 hover:bg-[#00D4FF]/35 border border-[#00D4FF]/60 flex items-center justify-center text-cyan-200 active:scale-95"
                    >
                      {partyMusicState.status === 'playing' ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-black text-white/85">
                    {isRoomHost ? 'Controls' : 'View'}
                  </span>
                </div>
              </div>

              {partyMusicState.activeTrack.sourceType === 'youtube' && (
                <PartyYouTubeSyncPlayer
                  musicState={partyMusicState}
                  clockOffsetMs={musicClockOffsetMs}
                  isHost={isRoomHost}
                  isSpeakerMuted={isSpeakerMuted}
                  localVolumeOverride={isRoomHost ? null : localListenerMusicVol}
                  compact
                  onProgress={(cur, dur) => {
                    setMusicDisplayPosSec(cur);
                    if (dur > 0) setMusicDisplayDurSec(dur);
                  }}
                  onEnded={() => {
                    if (isRoomHost) void handleMusicNextTrack();
                  }}
                  onError={(msg) => setMusicErrorMessage(msg)}
                />
              )}
            </div>
          )}

        {partyEntryNotice && (
          <div className="max-w-md mx-auto w-full flex justify-center animate-fade-in">
            <div className="inline-flex flex-wrap items-center justify-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#8B20FF]/90 to-[#FA26A0]/90 border border-white/25 text-white text-[11px] font-bold shadow-lg">
              <LevelBadge level={partyEntryNotice.level ?? 0} size="xs" />
              <VipTierBadge tier={partyEntryNotice.vipLevel ?? 0} size="xs" />
              {(partyEntryNotice.superVipLevel ?? 0) > 0 && (
                <SuperVipTierBadge tier={partyEntryNotice.superVipLevel ?? 0} size="xs" />
              )}
              {partyEntryNotice.userId && moderatorIdsSet.has(partyEntryNotice.userId) && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-cyan-500 text-white text-[8.5px] font-black uppercase">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  MOD
                </span>
              )}
              <span>{partyEntryNotice.name} joined the party room</span>
            </div>
          </div>
        )}

        {myPendingSeatRequest && !isCurrentlySeated && (
          <div
            data-no-doubletap="true"
            className="max-w-md mx-auto w-full rounded-2xl bg-[#240D42]/95 border border-amber-400/50 px-3 py-2 flex items-center justify-between gap-2 shadow-lg"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="w-4 h-4 text-amber-300 shrink-0" />
              <p className="text-[11px] font-bold text-amber-100 truncate">
                Seat #{myPendingSeatRequest.seatIndex + 1} request pending Host approval...
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleCancelMySeatRequest()}
              className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-rose-500/30 border border-white/15 text-[10px] font-black text-white shrink-0 active:scale-95"
            >
              Cancel
            </button>
          </div>
        )}

        {isCurrentlySeated && micPermissionDenied && (
          <div className="max-w-md mx-auto w-full flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => void handleRetryPartyMic()}
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-[#060212] text-xs font-black flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Allow Microphone Access to Speak</span>
            </button>
            {isNativeAndroidApp() && (
              <button
                type="button"
                onClick={() => void openNativeAppSettings()}
                className="px-3.5 py-1.5 rounded-full bg-amber-500/25 border border-amber-400/40 text-amber-200 text-xs font-bold active:scale-95 transition-all"
              >
                Open Phone Settings
              </button>
            )}
          </div>
        )}

        {autoplayBlocked && !isSpeakerMuted && (
          <div className="max-w-md mx-auto w-full flex justify-center">
            <button
              type="button"
              onClick={() => {
                setAutoplayBlocked(false);
                agoraRtcService.resumeRemoteAudio();
                webrtcMediaService.resumePartyRemoteAudio();
                showToast('Party room voice enabled');
              }}
              className="px-4 py-1.5 rounded-full bg-[#FA26A0] text-white text-xs font-bold flex items-center gap-1.5 shadow-lg animate-pulse"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Tap to Enable Party Voice Audio</span>
            </button>
          </div>
        )}

        {/* Prominent 1-Tap Host & Moderator Seat Request Banner */}
        {canModerate && seatRequests.length > 0 && (() => {
          const latestReq = seatRequests[seatRequests.length - 1];
          if (!latestReq?.user) return null;
          return (
            <div
              data-no-doubletap="true"
              className="max-w-md mx-auto w-full rounded-2xl bg-gradient-to-r from-[#281146]/95 via-[#3B135C]/95 to-[#281146]/95 border border-[#FA26A0]/60 shadow-[0_0_24px_rgba(250,38,160,0.3)] px-3 py-2 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#FA26A0] bg-[#160A2B] shrink-0 flex items-center justify-center">
                  {latestReq.user.avatar ? (
                    <img
                      src={latestReq.user.avatar}
                      alt={latestReq.user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-black text-white">
                      {(latestReq.user.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-white truncate">
                    {latestReq.user.name}
                  </p>
                  <p className="text-[10px] font-bold text-[#FFD166] truncate">
                    Wants Seat #{latestReq.seatIndex + 1}
                    {seatRequests.length > 1 ? ` • +${seatRequests.length - 1} waiting` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => void handleAcceptSeatRequest(latestReq)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-[#051B14] text-[11px] font-black flex items-center gap-1 shadow active:scale-95 transition-transform"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Accept</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleRejectSeatRequest(latestReq)}
                  aria-label="Decline seat request"
                  className="w-7 h-7 rounded-xl bg-white/10 hover:bg-rose-500/30 border border-white/15 text-white/80 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                {seatRequests.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowSeatRequestsModal(true)}
                    className="px-2 py-1.5 rounded-xl bg-[#FA26A0]/25 border border-[#FA26A0]/50 text-[#FFB3DE] text-[10px] font-black active:scale-95"
                  >
                    All ({seatRequests.length})
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Quick Seated Action Strip (One-tap Mic On/Off & Leave Seat for both Guests and Host) */}
        {isCurrentlySeated && (
          <div
            data-no-doubletap="true"
            className="max-w-md mx-auto w-full flex flex-wrap items-center justify-center gap-2"
          >
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-[10px] font-bold">
              Seat #{userSeatIndex + 1}
            </span>
            <button
              type="button"
              onClick={handleToggleMyMic}
              className={`px-3 py-1 rounded-full border text-[10px] font-extrabold flex items-center gap-1.5 active:scale-95 transition-all ${
                isMicMuted || isHostMutedOnMySeat
                  ? 'bg-rose-600/25 border-rose-400/50 text-rose-200'
                  : 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200'
              }`}
            >
              {isMicMuted || isHostMutedOnMySeat ? (
                <>
                  <MicOff className="w-3 h-3" />
                  <span>{isHostMutedOnMySeat ? 'Muted by Host' : 'Mic OFF'}</span>
                </>
              ) : (
                <>
                  <Mic className="w-3 h-3" />
                  <span>Mic ON</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleLeaveSeat(userSeatIndex)}
              className="px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-[10px] font-extrabold active:scale-95 transition-all"
            >
              Leave Seat
            </button>
          </div>
        )}

        {/* Empty Room Notice when all seats (including Host Seat #1) are vacant */}
        {seats.every((s) => !s) && (
          <div className="flex items-center justify-center pt-1.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/45 border border-white/15 text-[11px] font-semibold text-white/80 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              <span>
                {isRoomHost
                  ? 'Room is empty · Tap Host seat to take the stage'
                  : 'Room is currently empty · Host is away'}
              </span>
            </div>
          </div>
        )}

        {/* HERO THRONES (Seat 0: Host Velvet Throne Sofa, Seat 1: Co-Host VIP Sofa) */}
        <div className="flex items-center justify-center gap-5 sm:gap-11 pt-2.5 pb-1">
          <PartySofaSeat
            seatIndex={0}
            variant="host"
            occupant={seatZero}
            isMuted={Boolean(
              seatZero &&
                (mutedSeatIndices.includes(0) || (seatZero.id === currentUser.id && isMicMuted))
            )}
            isSpeaking={Boolean(
              speakingSeats[0] &&
                seatZero &&
                !mutedSeatIndices.includes(0) &&
                !(seatZero.id === currentUser.id && isMicMuted)
            )}
            isLocked={false}
            badgeText="Host"
            label={seatZero ? seatZero.name : isRoomHost ? 'Take Seat' : 'Empty'}
            seatTheme={seatTheme}
            onClick={() => handleSeatClick(0)}
          />

          <PartySofaSeat
            seatIndex={1}
            variant="cohost"
            occupant={seatOne}
            isMuted={Boolean(
              seatOne &&
                (mutedSeatIndices.includes(1) || (seatOne.id === currentUser.id && isMicMuted))
            )}
            isSpeaking={Boolean(
              speakingSeats[1] &&
                seatOne &&
                !mutedSeatIndices.includes(1) &&
                !(seatOne.id === currentUser.id && isMicMuted)
            )}
            isLocked={isSeatLocked}
            isLevelLocked={false}
            badgeText="Seat 2"
            isModerator={Boolean(seatOne && moderatorIdsSet.has(seatOne.id))}
            label={seatOne ? seatOne.name : 'Join'}
            seatTheme={seatTheme}
            onClick={() => handleSeatClick(1)}
          />
        </div>

        {/* DYNAMIC PARTICIPANT SOFA SEATS GRID (3 for 5-seat, 6 for 8-seat, 14 for 16-seat) */}
        <div
          className={`grid ${gridColsClass} ${
            maxSeats === 16 ? 'gap-x-1.5 gap-y-2' : 'gap-x-2.5 gap-y-2.5'
          } max-w-lg mx-auto w-full pt-0.5`}
        >
          {remainingSeatIndices.map((idx) => {
            const member = seats[idx];
            const isSeatMuted =
              mutedSeatIndices.includes(idx) || (member?.id === currentUser.id && isMicMuted);
            const isSpeaking = Boolean(speakingSeats[idx]) && Boolean(member) && !isSeatMuted;

            return (
              <PartySofaSeat
                key={idx}
                seatIndex={idx}
                variant="guest"
                occupant={member}
                isMuted={isSeatMuted}
                isSpeaking={isSpeaking}
                isLocked={isSeatLocked}
                compact={maxSeats === 16}
                isModerator={Boolean(member && moderatorIdsSet.has(member.id))}
                label={member ? member.name.split(' ')[0] : `No.${idx + 1}`}
                seatTheme={seatTheme}
                onClick={() => handleSeatClick(idx)}
              />
            );
          })}
        </div>

        {/* LIVE ROOM CHAT / ACTIVITY FEED (With Level, VIP, MOD Badges, Swipe-to-Reply @Mention & Comment Delete) */}
        <div className="flex flex-col justify-end gap-1.5 pt-2 pb-1 max-w-lg mx-auto w-full flex-1 min-h-[125px]">
          {canModerate && activities.length > 0 && (
            <div className="flex items-center justify-between px-1" data-no-doubletap="true">
              <span className="text-[9.5px] font-bold text-white/45">
                Swipe any comment right to reply
              </span>
              <button
                type="button"
                onClick={() => setShowClearChatConfirmModal(true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/35 text-rose-200 text-[9.5px] font-extrabold active:scale-95 transition-all"
              >
                <Eraser className="w-2.5 h-2.5" />
                <span>Clear Chat</span>
              </button>
            </div>
          )}

          <div className="flex-1 space-y-1.5 max-h-44 overflow-y-auto no-scrollbar pr-1">
            {activities.length === 0 ? (
              <div className="px-3 py-1.5 rounded-full bg-[#17092E]/70 border border-white/10 text-[11px] text-[#B9AECF] w-fit">
                Say hi to start the conversation in {room.title}.
              </div>
            ) : (
              activities.map((act) => {
                const matchedParticipant = act.userId
                  ? participantsList.find((p) => p.userId === act.userId)
                  : undefined;
                const matchedSeatIdx = act.userId
                  ? seats.findIndex((s) => s?.id === act.userId)
                  : -1;
                const matchedSeatedUser = matchedSeatIdx >= 0 ? seats[matchedSeatIdx] : null;
                const resolvedLevel =
                  typeof act.level === 'number'
                    ? act.level
                    : matchedSeatedUser?.level ?? matchedParticipant?.level ?? 0;
                const resolvedVip =
                  typeof act.vipLevel === 'number'
                    ? act.vipLevel
                    : matchedSeatedUser?.vipLevel ?? matchedParticipant?.vipLevel ?? 0;
                const resolvedSuperVip =
                  typeof act.superVipLevel === 'number'
                    ? act.superVipLevel
                    : matchedSeatedUser?.superVipLevel ?? matchedParticipant?.superVipLevel ?? 0;
                const isActModerator = Boolean(act.userId && moderatorIdsSet.has(act.userId));
                const isSystemNotice = act.type === 'join' || act.type === 'leave';
                const canEditThisComment =
                  act.userId === currentUser.id && !isSystemNotice && act.type !== 'gift';
                const canDeleteThisComment = canModerate || act.userId === currentUser.id;
                const isBeingSwiped = swipingMsgId === act.id && swipeOffsetX > 4;

                const handleTapActivityUser = () => {
                  if (!act.userId) return;
                  const targetProfile: UserProfile = matchedSeatedUser || {
                    id: act.userId,
                    displayId: act.userId.slice(-6).toUpperCase(),
                    name: act.name,
                    username: matchedParticipant?.username || `@${act.name.toLowerCase().replace(/\s+/g, '')}`,
                    avatar: act.avatar || matchedParticipant?.avatar || '',
                    bio: '',
                    level: resolvedLevel,
                    vipLevel: resolvedVip,
                    superVipLevel: resolvedSuperVip,
                    isVIP: resolvedVip > 0,
                    fansCount: '0',
                    followingCount: 0,
                    likesCount: '0',
                    coins: 0,
                    diamonds: 0,
                  };
                  if (canModerateTarget(act.userId)) {
                    setShowKickDurationPicker(false);
                    setShowBlockMemberConfirm(false);
                    setSelectedSeatMember({
                      index: matchedSeatIdx >= 0 ? matchedSeatIdx : null,
                      user: targetProfile,
                    });
                  } else {
                    onSelectUser(targetProfile);
                  }
                };

                const renderTextWithMentions = (raw: string) => {
                  const parts = raw.split(/(@[^\s@]+(?:\s[A-Za-z0-9_]+)?)/g);
                  return parts.map((part, i) =>
                    part.startsWith('@') ? (
                      <span key={i} className="text-cyan-300 font-extrabold">
                        {part}
                      </span>
                    ) : (
                      <React.Fragment key={i}>{part}</React.Fragment>
                    )
                  );
                };

                return (
                  <div
                    key={act.id}
                    data-no-doubletap="true"
                    className="relative flex items-center gap-1 max-w-full group"
                    onTouchStart={(e) => {
                      if (isSystemNotice || !e.touches[0]) return;
                      swipeTouchRef.current = {
                        id: act.id,
                        startX: e.touches[0].clientX,
                        startY: e.touches[0].clientY,
                        triggered: false,
                      };
                    }}
                    onTouchMove={(e) => {
                      const st = swipeTouchRef.current;
                      if (!st || st.id !== act.id || !e.touches[0]) return;
                      const dx = e.touches[0].clientX - st.startX;
                      const dy = Math.abs(e.touches[0].clientY - st.startY);
                      if (dy > 32 && !st.triggered) {
                        swipeTouchRef.current = null;
                        setSwipingMsgId(null);
                        setSwipeOffsetX(0);
                        return;
                      }
                      if (dx > 8) {
                        setSwipingMsgId(act.id);
                        setSwipeOffsetX(Math.min(62, dx));
                        if (dx >= 42 && !st.triggered) {
                          st.triggered = true;
                          handleStartReply(act);
                        }
                      }
                    }}
                    onTouchEnd={() => {
                      swipeTouchRef.current = null;
                      setSwipingMsgId(null);
                      setSwipeOffsetX(0);
                    }}
                    onTouchCancel={() => {
                      swipeTouchRef.current = null;
                      setSwipingMsgId(null);
                      setSwipeOffsetX(0);
                    }}
                  >
                    {isBeingSwiped && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-cyan-500/30 border border-cyan-300/60 flex items-center justify-center text-cyan-200 pointer-events-none">
                        <Reply className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div
                      style={
                        isBeingSwiped
                          ? { transform: `translateX(${swipeOffsetX}px)`, transition: 'none' }
                          : { transform: 'translateX(0px)', transition: 'transform 180ms ease-out' }
                      }
                      onClick={handleTapActivityUser}
                      className={`flex items-start gap-2 px-2.5 py-1.5 rounded-2xl backdrop-blur-md border text-[11px] shadow-sm w-fit max-w-full ${
                        act.userId ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''
                      } ${
                        isSystemNotice
                          ? 'bg-[#210D40]/85 border-[#FA26A0]/35'
                          : 'bg-[#17092E]/88 border-purple-500/30'
                      }`}
                    >
                      {act.avatar ? (
                        <img
                          src={act.avatar}
                          alt={act.name}
                          className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-yellow-400 mt-0.5"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-[#8B20FF] text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">
                          {(act.name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        {act.replyTo && (
                          <div className="mb-0.5 pl-2 border-l-2 border-cyan-400/80 text-[10px] text-cyan-200/85 truncate max-w-[220px]">
                            <span className="font-bold text-cyan-300">↩ @{act.replyTo.senderName}</span>
                            {act.replyTo.text ? `: ${act.replyTo.text}` : ''}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-1 text-[11px] leading-snug min-w-0">
                          <LevelBadge level={resolvedLevel} size="xs" className="shrink-0" />
                          <VipTierBadge tier={resolvedVip} size="xs" className="shrink-0" />
                          {resolvedSuperVip > 0 && (
                            <SuperVipTierBadge tier={resolvedSuperVip} size="xs" className="shrink-0" />
                          )}
                          {act.isHost && (
                            <span className="px-1.5 py-0.5 rounded bg-[#FFC84A] text-black text-[8px] font-black uppercase leading-none shrink-0">
                              HOST
                            </span>
                          )}
                          {!act.isHost && isActModerator && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-[8px] font-black uppercase leading-none shrink-0">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              MOD
                            </span>
                          )}
                          <span className="font-extrabold text-[#FFE043] shrink-0">
                            {act.name}
                            {isSystemNotice ? '' : ':'}
                          </span>
                          <span
                            className={`font-medium break-words ${
                              isSystemNotice ? 'text-[#FFB3DE]' : 'text-white/95'
                            }`}
                          >
                            {isSystemNotice ? act.text : renderTextWithMentions(act.text)}
                            {act.isEdited && !isSystemNotice && (
                              <span className="ml-1 text-[9px] text-white/45 italic">(edited)</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Quick Tap Reply | Delete | Edit Actions */}
                      {!isSystemNotice && (
                        <div className="flex items-center gap-1 ml-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartReply(act);
                            }}
                            title={`Reply to @${act.name}`}
                            className="w-5 h-5 rounded-full bg-white/10 hover:bg-cyan-500/30 flex items-center justify-center text-cyan-200/80 hover:text-cyan-200 transition-colors"
                          >
                            <Reply className="w-3 h-3" />
                          </button>
                          {canDeleteThisComment && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDeleteSingleComment(act);
                              }}
                              title="Delete comment"
                              className="w-5 h-5 rounded-full bg-white/10 hover:bg-rose-500/35 flex items-center justify-center text-rose-300/80 hover:text-rose-200 transition-colors"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                          {canEditThisComment && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditComment(act);
                              }}
                              title="Edit comment"
                              aria-label="Edit comment"
                              className="w-5 h-5 rounded-full bg-white/10 hover:bg-amber-500/35 flex items-center justify-center text-amber-200/85 hover:text-amber-200 transition-colors"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={activityBottomRef} />
          </div>
        </div>
      </main>

      {/* BOTTOM BAR (Reply/Edit Preview + Single Gift Box + Seated Guest/Host Mic Toggle + Chat Input + Heart) */}
      <footer className="relative z-30 px-3 safe-pb-3 pt-2 bg-gradient-to-t from-[#060212] via-[#0D041B]/95 to-transparent">
        {editingComment && (
          <div className="max-w-md mx-auto mb-1.5 px-3 py-1.5 rounded-2xl bg-[#1C0D38]/95 border border-amber-400/45 flex items-center justify-between gap-2 shadow-lg animate-fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <Edit2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-black text-amber-300 block truncate">
                  Editing comment
                </span>
                <span className="text-[10px] text-white/70 block truncate">
                  {editingComment.originalText}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingComment(null);
                  setInputMessage('');
                }}
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white/85 transition-colors"
                aria-label="Cancel edit"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!inputMessage.trim()}
                onClick={() => {
                  void handleSendMessage();
                }}
                className="px-2.5 py-1 rounded-full bg-[#FA26A0] hover:bg-[#ff3cad] disabled:opacity-45 text-[10px] font-bold text-white transition-colors shadow-sm"
                aria-label="Save edit"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {replyTarget && !editingComment && (
          <div className="max-w-md mx-auto mb-1.5 px-3 py-1.5 rounded-2xl bg-[#1C0D38]/95 border border-cyan-400/45 flex items-center justify-between gap-2 shadow-lg animate-fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <Reply className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-black text-cyan-300 block truncate">
                  Replying to @{replyTarget.senderName}
                </span>
                <span className="text-[10px] text-white/70 block truncate">
                  {replyTarget.text}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyTarget(null)}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 shrink-0"
              aria-label="Cancel reply"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
          <button
            type="button"
            onClick={handleOpenGiftModal}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#9D0208] via-[#FA26A0] to-[#FF007A] flex items-center justify-center text-white shadow-[0_0_22px_rgba(250,38,160,0.8)] border border-white/30 active:scale-95 transition-all shrink-0"
            title="Open Gift Shop"
          >
            <span className="text-xl sm:text-2xl">🎁</span>
          </button>

          {isCurrentlySeated && (
            <button
              type="button"
              onClick={handleToggleMyMic}
              className={`h-11 sm:h-12 px-3 rounded-full border flex items-center justify-center gap-1.5 text-xs font-black active:scale-95 transition-all shrink-0 shadow-lg ${
                isMicMuted || isHostMutedOnMySeat
                  ? 'bg-rose-600/90 border-rose-300/60 text-white shadow-rose-900/50'
                  : 'bg-emerald-500/90 border-emerald-200/70 text-[#051B14] shadow-emerald-900/50'
              }`}
              title={isMicMuted || isHostMutedOnMySeat ? 'Turn Mic ON' : 'Turn Mic OFF'}
            >
              {isMicMuted || isHostMutedOnMySeat ? (
                <>
                  <MicOff className="w-4 h-4 shrink-0" />
                  <span className="hidden xs:inline">Off</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 shrink-0" />
                  <span className="hidden xs:inline">On</span>
                </>
              )}
            </button>
          )}

          <form
            onSubmit={handleSendMessage}
            className="flex-1 flex items-center bg-[#170B2E]/90 border border-purple-500/30 focus-within:border-[#FA26A0] rounded-full px-3.5 py-2.5 transition-colors backdrop-blur-md min-w-0"
          >
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-[#FFE043] hover:text-white shrink-0 mr-2"
              title="Add Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>
            <input
              ref={chatInputRef}
              type="text"
              placeholder={
                editingComment
                  ? 'Edit your comment...'
                  : replyTarget
                  ? `Reply to @${replyTarget.senderName}...`
                  : 'Say Hi...'
              }
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && editingComment) {
                  e.preventDefault();
                  setEditingComment(null);
                  setInputMessage('');
                }
              }}
              className="w-full bg-transparent text-xs text-white placeholder-white/50 outline-none font-medium"
            />
            {inputMessage.trim() && (
              <button
                type="submit"
                className="w-7 h-7 rounded-full bg-[#FA26A0] text-white flex items-center justify-center shrink-0 ml-1 shadow"
                title={editingComment ? 'Save comment' : 'Send message'}
              >
                {editingComment ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            )}
          </form>

          <button
            type="button"
            onClick={handleTriggerHeart}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#9D0208] via-[#FA26A0] to-[#FF007A] flex items-center justify-center text-white shadow-[0_0_22px_rgba(250,38,160,0.8)] border border-white/30 active:scale-90 transition-all shrink-0"
            title="Send Heart"
          >
            <span className="text-xl sm:text-2xl">💖</span>
          </button>
        </div>

        {showEmojiPicker && (
          <div className="flex items-center justify-center gap-3 mt-2 bg-[#1C0B35] p-2 rounded-2xl border border-white/15 w-fit animate-fade-in shadow-2xl mx-auto">
            {['❤️', '👏', '🔥', '🎉', '🎵', '😍', '🌹', '👑'].map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => {
                  setInputMessage((prev) => prev + em);
                  setShowEmojiPicker(false);
                }}
                className="text-xl hover:scale-125 transition-transform p-0.5"
              >
                {em}
              </button>
            ))}
          </div>
        )}
      </footer>

      {/* PARTICIPANTS LIST MODAL */}
      {showParticipantsModal && (
        <div
          onClick={() => setShowParticipantsModal(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#160A2B] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col max-h-[75vh]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <h3 className="text-sm font-black text-white">
                Room Participants ({participantTotal})
              </h3>
              <button
                onClick={() => setShowParticipantsModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto no-scrollbar py-1">
              {participantsList.length === 0 ? (
                <p className="text-xs text-white/60 text-center py-8">No active listeners right now.</p>
              ) : (
                participantsList.map((p) => {
                  const memberProfile: UserProfile = {
                    id: p.userId,
                    displayId: p.userId.slice(-6).toUpperCase(),
                    name: p.name,
                    username: p.username || `@${p.name.toLowerCase().replace(/\s+/g, '')}`,
                    avatar: p.avatar,
                    bio: '',
                    level: typeof p.level === 'number' ? p.level : 0,
                    vipLevel: typeof p.vipLevel === 'number' ? p.vipLevel : 0,
                    superVipLevel: typeof p.superVipLevel === 'number' ? p.superVipLevel : 0,
                    isVIP: Boolean(p.isVIP || (p.vipLevel || 0) > 0),
                    fansCount: '0',
                    followingCount: 0,
                    likesCount: '0',
                    coins: 0,
                    diamonds: 0,
                  };
                  const seatedIdx = seats.findIndex((s) => s?.id === p.userId);
                  const isParticipantMod = moderatorIdsSet.has(p.userId);
                  return (
                    <div
                      key={p.userId}
                      onClick={() => {
                        setShowParticipantsModal(false);
                        if (canModerateTarget(p.userId)) {
                          setShowKickDurationPicker(false);
                          setShowBlockMemberConfirm(false);
                          setSelectedSeatMember({
                            index: seatedIdx >= 0 ? seatedIdx : null,
                            user: memberProfile,
                          });
                        } else {
                          onSelectUser(memberProfile);
                        }
                      }}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#200E38] border border-white/5 cursor-pointer hover:border-white/15 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.avatar ? (
                          <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#8B20FF] text-xs font-black flex items-center justify-center shrink-0">
                            {(p.name || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white truncate block">{p.name}</span>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <LevelBadge level={p.level ?? 0} size="xs" />
                            <VipTierBadge tier={p.vipLevel ?? 0} size="xs" />
                            {(p.superVipLevel ?? 0) > 0 && (
                              <SuperVipTierBadge tier={p.superVipLevel ?? 0} size="xs" />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {p.isHost && (
                          <span className="px-2 py-0.5 rounded bg-[#FFC84A] text-black text-[9px] font-black">
                            HOST
                          </span>
                        )}
                        {!p.isHost && isParticipantMod && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-[9px] font-black uppercase">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            MOD
                          </span>
                        )}
                        {canModerateTarget(p.userId) && (
                          <span className="px-2 py-1 rounded-lg bg-white/10 text-[10px] font-bold text-white/85">
                            Manage
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ROOM SETTINGS SHEET */}
      {showSettingsSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#160A2B] border-t border-white/15 rounded-t-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#FA26A0]" />
                Room Controls & Settings ({agoraVoiceState})
              </h3>
              <button
                onClick={() => setShowSettingsSheet(false)}
                className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {canModerate ? (
              <div className="space-y-2 max-h-[68vh] overflow-y-auto no-scrollbar pr-0.5">
                {isCurrentUserModerator && (
                  <div className="px-3 py-2 rounded-2xl bg-cyan-500/15 border border-cyan-400/35 flex items-center gap-2 text-[11px] font-bold text-cyan-200">
                    <ShieldCheck className="w-4 h-4 text-cyan-300 shrink-0" />
                    <span>Moderator Mode Active — Full Room &amp; Seat Controls</span>
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowSettingsSheet(false);
                    setShowSeatRequestsModal(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <span className="text-xs font-bold text-white">Review Seat Requests</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#FA26A0] text-white text-[10px] font-bold font-mono">
                    {seatRequests.length}
                  </span>
                </button>

                {isRoomHost && (
                  <button
                    onClick={() => {
                      setShowSettingsSheet(false);
                      setShowBackgroundPicker(true);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <ImageIcon className="w-4 h-4 text-[#FA26A0]" />
                      <div className="text-left">
                        <span className="text-xs font-bold text-white block">Party Background</span>
                        <span className="text-[10px] text-white/60 block">
                          Current: {activeStageBackground.label} (Themes, Host DP, Gallery)
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/50" />
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowSettingsSheet(false);
                    setShowEditAnnouncementModal(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Edit2 className="w-4 h-4 text-amber-300" />
                    <span className="text-xs font-bold text-white">Edit Announcement</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/50" />
                </button>

                {isRoomHost && (
                  <button
                    onClick={() => {
                      setShowSettingsSheet(false);
                      setShowModeratorsListModal(true);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-cyan-300" />
                      <span className="text-xs font-bold text-white">Lifetime Moderators</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-[10px] font-bold font-mono">
                      {hostModerators.length}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowSettingsSheet(false);
                    setShowKickedUsersModal(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldOff className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold text-white">Kicked Users</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/25 border border-rose-400/40 text-rose-200 text-[10px] font-bold font-mono">
                    {hostRoomKicks.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setShowSettingsSheet(false);
                    setShowClearChatConfirmModal(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/25 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Eraser className="w-4 h-4 text-rose-300" />
                    <span className="text-xs font-bold text-rose-200">Clear Comment History</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-300/60" />
                </button>

                {/* Host Level-Gated Seat Layout Switcher (Host Only) */}
                {isRoomHost && (
                  <div className="p-3 rounded-2xl bg-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Room Seat Mode</span>
                      <span className="text-[10px] font-bold text-[#D8B4FE]">Host Lv.{hostLevel}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {PARTY_SEAT_TIERS.map((tier) => {
                        const unlocked = isSeatModeUnlockedForLevel(tier.maxSeats, hostLevel);
                        const active = maxSeats === tier.maxSeats;
                        return (
                          <button
                            key={tier.maxSeats}
                            type="button"
                            onClick={() => handleChangeSeatMode(tier.maxSeats)}
                            className={`py-2 px-1.5 rounded-xl text-center flex flex-col items-center gap-0.5 border transition-all ${
                              active
                                ? 'bg-[#FA26A0] border-[#FF85C8] text-white shadow'
                                : unlocked
                                ? 'bg-[#200E38] border-white/10 text-white/90 hover:border-[#FA26A0]/60'
                                : 'bg-[#120822] border-white/5 text-white/40'
                            }`}
                          >
                            <span className="text-[9px] font-black uppercase opacity-80">{tier.tierLabel}</span>
                            <span className="text-[11px] font-black flex items-center gap-1">
                              {!unlocked && <Lock className="w-3 h-3 text-amber-300" />}
                              {tier.maxSeats} Seats
                            </span>
                            {!unlocked && (
                              <span className="text-[8px] font-bold text-amber-300">Lv.{tier.minLevel}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-[#B9AECF] leading-snug pt-0.5">
                      {hostLevel < 10
                        ? 'All 5 seats unlocked by default! Reach Lv.10 for 8 seats (+3 lower) and Lv.20 for 16 seats.'
                        : hostLevel < 20
                        ? 'Lv.10+: Switch between 5 or 8 seats anytime. Reach Lv.20 to unlock 16 seats.'
                        : 'Lv.20+: Full access to switch between 5, 8, or 16 seats anytime.'}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5">
                  <span className="text-xs font-bold text-white">Lock Seats</span>
                  <input
                    type="checkbox"
                    checked={isSeatLocked}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setIsSeatLocked(val);
                      liveAndRoomService.updateRoomSettings(room.id, currentUser.id, { isLocked: val });
                      syncRoom(seats, seatRequests, val);
                      showToast(val ? 'Seats locked' : 'Seats unlocked');
                    }}
                    className="accent-[#FA26A0]"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5">
                  <span className="text-xs font-bold text-white">Allow Join</span>
                  <input
                    type="checkbox"
                    checked={isAllowJoin}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setIsAllowJoin(val);
                      liveAndRoomService.updateRoomSettings(room.id, currentUser.id, { allowJoin: val });
                      syncRoom(seats, seatRequests, undefined, val);
                      showToast(val ? 'Joining enabled' : 'Joining disabled');
                    }}
                    className="accent-[#FA26A0]"
                  />
                </div>

                {isCurrentlySeated && (
                  <button
                    onClick={() => {
                      setShowSettingsSheet(false);
                      handleLeaveSeat(userSeatIndex);
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-bold"
                  >
                    Leave Seat #{userSeatIndex + 1} (Stay as Listener)
                  </button>
                )}

                {isRoomHost ? (
                  <>
                    <button
                      onClick={handleCleanLeaveParty}
                      className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Exit Room View (Keep Party Active)</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowSettingsSheet(false);
                        setShowCloseRoomConfirmModal(true);
                      }}
                      className="w-full py-2.5 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-rose-600/30"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Permanently Close Room</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleCleanLeaveParty}
                    className="w-full py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Leave Party Room</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {userSeatIndex !== -1 && (
                  <button
                    onClick={() => {
                      setShowSettingsSheet(false);
                      handleLeaveSeat(userSeatIndex);
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-bold"
                  >
                    Leave Seat #{userSeatIndex + 1} (Step Down to Audience)
                  </button>
                )}
                <button
                  onClick={handleCleanLeaveParty}
                  className="w-full py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Leave Party Room</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ROLE-AWARE EXIT PARTY ROOM MODAL (Host & Audience Complete Exit System) */}
      {showExitRoomModal && (
        <div
          onClick={() => setShowExitRoomModal(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#160A2B] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <LogOut className="w-4 h-4 text-[#FA26A0]" />
                <span>{isRoomHost ? 'Host Exit & Seat Controls' : 'Party Room Exit'}</span>
              </h3>
              <button
                onClick={() => setShowExitRoomModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {onMinimize && (
              <button
                type="button"
                onClick={() => {
                  setShowExitRoomModal(false);
                  onMinimize();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-[#00D4FF]/15 hover:bg-[#00D4FF]/25 border border-[#00D4FF]/45 text-cyan-200 text-xs font-extrabold flex items-center justify-between transition-all"
              >
                <span>Minimize Room (Keep Audio & Seat Active)</span>
                <Minimize2 className="w-4 h-4 text-cyan-300" />
              </button>
            )}

            {isCurrentlySeated && (
              <button
                onClick={() => handleLeaveSeat(userSeatIndex)}
                className="w-full py-3 px-4 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-extrabold flex items-center justify-between transition-all"
              >
                <span>Leave Seat #{userSeatIndex + 1} (Listen in Audience)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {isRoomHost ? (
              <>
                <button
                  onClick={handleCleanLeaveParty}
                  className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold flex items-center justify-between transition-all"
                >
                  <span>Exit Room View (Keep Party Open)</span>
                  <LogOut className="w-4 h-4 text-white/70" />
                </button>
                <button
                  onClick={() => {
                    setShowExitRoomModal(false);
                    setShowCloseRoomConfirmModal(true);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-rose-600/25 hover:bg-rose-600/35 border border-rose-500/50 text-rose-200 text-xs font-extrabold flex items-center justify-between transition-all"
                >
                  <span>End & Close Party Room for Everyone</span>
                  <Trash2 className="w-4 h-4 text-rose-300" />
                </button>
              </>
            ) : (
              <button
                onClick={handleCleanLeaveParty}
                className="w-full py-3 px-4 rounded-2xl bg-rose-600/25 hover:bg-rose-600/35 border border-rose-500/50 text-rose-200 text-xs font-extrabold flex items-center justify-between transition-all"
              >
                <span>Leave Party Room</span>
                <LogOut className="w-4 h-4 text-rose-300" />
              </button>
            )}

            <button
              onClick={() => setShowExitRoomModal(false)}
              className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/75 text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* TAP OWN SEAT ACTION SHEET (Mute/Unmute, Leave Seat, Profile) */}
      {showMySeatModal !== null && (
        <div
          onClick={() => setShowMySeatModal(null)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#160A2B] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-2.5"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-black text-white">Seat #{showMySeatModal + 1} Controls</h3>
              <button
                onClick={() => setShowMySeatModal(null)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => {
                if (isHostMutedOnMySeat) {
                  showToast('Your seat microphone is muted by Host');
                  return;
                }
                const next = !isMicMuted;
                setIsMicMuted(next);
                setShowMySeatModal(null);
                showToast(next ? 'Mic muted' : 'Mic active');
              }}
              className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              {isMicMuted ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-rose-400" />}
              <span>{isMicMuted ? 'Unmute My Microphone' : 'Mute My Microphone'}</span>
            </button>
            <button
              onClick={() => handleLeaveSeat(showMySeatModal)}
              className="w-full py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-extrabold"
            >
              Leave Seat #{showMySeatModal + 1}
            </button>
            <button
              onClick={() => {
                setShowMySeatModal(null);
                onSelectUser(currentUser);
              }}
              className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-bold"
            >
              View My Profile
            </button>
          </div>
        </div>
      )}

      {/* EDIT ANNOUNCEMENT MODAL */}
      {showEditAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#160A2B] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-black text-white">Edit Announcement</h3>
            <textarea
              rows={3}
              value={roomAnnouncement}
              onChange={(e) => setRoomAnnouncement(e.target.value)}
              className="w-full bg-[#200E38] border border-white/10 focus:border-[#FA26A0] rounded-xl p-3 text-xs text-white placeholder-white/50 outline-none resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditAnnouncementModal(false)}
                className="flex-1 py-2 rounded-xl bg-white/10 text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowEditAnnouncementModal(false);
                  liveAndRoomService.updateRoomSettings(room.id, currentUser.id, {
                    announcement: roomAnnouncement,
                  });
                  syncRoom(seats, undefined, undefined, undefined, roomAnnouncement);
                  showToast('Announcement updated');
                }}
                className="flex-1 py-2 rounded-xl bg-[#FA26A0] text-white text-xs font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEAT REQUESTS MODAL */}
      {showSeatRequestsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#160A2B] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-black text-white">
                Seat Requests ({seatRequests.length})
              </h3>
              <button
                onClick={() => setShowSeatRequestsModal(false)}
                className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {seatRequests.length === 0 ? (
              <div className="py-6 text-center text-white/60">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50 text-[#FA26A0]" />
                <p className="text-xs font-bold text-white">No pending requests</p>
                <p className="text-[11px] text-white/50 mt-1">Listeners tapping empty seats appear here.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar py-1">
                {seatRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-[#200E38] border border-white/5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {req.user.avatar ? (
                        <img
                          src={req.user.avatar}
                          alt={req.user.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#8B20FF] text-xs font-black flex items-center justify-center shrink-0">
                          {(req.user.name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">{req.user.name}</span>
                        <span className="text-[10px] text-[#FA26A0]">Seat #{req.seatIndex + 1}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleRejectSeatRequest(req)}
                        className="p-1.5 rounded-xl bg-white/10 text-white hover:bg-white/20"
                      >
                        <UserX className="w-4 h-4 text-rose-400" />
                      </button>
                      <button
                        onClick={() => handleAcceptSeatRequest(req)}
                        className="px-3 py-1.5 rounded-xl bg-[#FA26A0] text-white text-xs font-bold flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowSeatRequestsModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM SEND SEAT REQUEST MODAL */}
      {showRequestConfirmModal && requestTargetSeat !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#160A2B] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 text-center">
            <h3 className="text-sm font-black text-white">Request Seat #{requestTargetSeat + 1}</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Send a microphone request to Host{' '}
              <span className="text-white font-bold">{(seatZero || room.host).name}</span>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRequestConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSendSeatRequest}
                className="flex-1 py-2.5 rounded-xl bg-[#FA26A0] text-white text-xs font-bold"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOST INVITE MODAL (INVITE LISTENERS TO SEAT + INVITE USERS TO ROOM) */}
      {showInviteToSeatModal !== null && (
        <div
          onClick={() => setShowInviteToSeatModal(null)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#120A26] border-t border-[#00D4FF]/30 rounded-t-3xl p-5 shadow-2xl flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-cyan-300" />
                  <span>Invite to Party Room</span>
                </h3>
                <p className="text-[10px] text-white/60">
                  {inviteModalTab === 'room'
                    ? `Invite a connected listener to Seat #${showInviteToSeatModal + 1}`
                    : 'Send a live room invitation to friends & users'}
                </p>
              </div>
              <button
                onClick={() => setShowInviteToSeatModal(null)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Tabs: In-Room Listeners vs Invite Users */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 mb-3">
              <button
                type="button"
                onClick={() => setInviteModalTab('room')}
                className={`py-2 rounded-xl text-xs font-black transition-all ${
                  inviteModalTab === 'room'
                    ? 'bg-gradient-to-r from-[#00A8FF] to-[#2563EB] text-white shadow'
                    : 'text-white/65 hover:text-white'
                }`}
              >
                In Room (Seat #{showInviteToSeatModal + 1})
              </button>
              <button
                type="button"
                onClick={() => {
                  setInviteModalTab('users');
                  if (invitableUsers.length === 0) void loadInvitableUsers();
                }}
                className={`py-2 rounded-xl text-xs font-black transition-all ${
                  inviteModalTab === 'users'
                    ? 'bg-gradient-to-r from-[#00A8FF] to-[#2563EB] text-white shadow'
                    : 'text-white/65 hover:text-white'
                }`}
              >
                Invite Users
              </button>
            </div>

            {inviteModalTab === 'users' && (
              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 text-white/45 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inviteSearchQuery}
                  onChange={(e) => setInviteSearchQuery(e.target.value)}
                  placeholder="Search user name or ID..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/60"
                />
              </div>
            )}

            <div className="space-y-2 overflow-y-auto no-scrollbar flex-1 py-1">
              {inviteModalTab === 'room' ? (
                (() => {
                  const eligibleListeners = participantsList.filter(
                    (p) => p.userId !== currentUser.id && !seats.some((s) => s?.id === p.userId)
                  );
                  if (eligibleListeners.length === 0) {
                    return (
                      <div className="text-center py-8 space-y-2">
                        <p className="text-xs text-white/60">
                          No unseated listeners are in the room right now.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setInviteModalTab('users');
                            if (invitableUsers.length === 0) void loadInvitableUsers();
                          }}
                          className="px-4 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-bold"
                        >
                          Invite Friends to Room
                        </button>
                      </div>
                    );
                  }
                  return eligibleListeners.map((p) => {
                    const memberProfile: UserProfile = {
                      id: p.userId,
                      displayId: p.userId.slice(-6).toUpperCase(),
                      name: p.name,
                      username: p.username,
                      avatar: p.avatar,
                      bio: '',
                      level: p.level || 1,
                      vipLevel: p.vipLevel || 0,
                      isVIP: Boolean(p.isVIP),
                      fansCount: '0',
                      followingCount: 0,
                      likesCount: '0',
                      coins: 0,
                      diamonds: 0,
                    };
                    const alreadyInvited = Boolean(invitedUserIds[p.userId]);
                    return (
                      <div
                        key={p.userId}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#1C1238] border border-white/10"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {p.avatar ? (
                            <img src={p.avatar} alt={p.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#2563EB] text-xs font-black flex items-center justify-center shrink-0">
                              {(p.name || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs font-bold text-white truncate">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => void handleSendSeatInvite(memberProfile, false)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                              alreadyInvited
                                ? 'bg-emerald-500/25 border border-emerald-400/50 text-emerald-200'
                                : 'bg-gradient-to-r from-[#00A8FF] to-[#2563EB] text-white'
                            }`}
                          >
                            {alreadyInvited ? 'Invited' : 'Invite'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSendSeatInvite(memberProfile, true)}
                            className="px-2.5 py-1.5 rounded-full bg-[#FA26A0]/85 hover:bg-[#FA26A0] text-white text-[11px] font-bold"
                          >
                            Seat
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()
              ) : inviteUsersLoading ? (
                <p className="text-xs text-white/60 text-center py-8">Loading users...</p>
              ) : (
                (() => {
                  const q = inviteSearchQuery.trim().toLowerCase();
                  const filteredUsers = invitableUsers.filter((u) => {
                    if (!q) return true;
                    return (
                      (u.name || '').toLowerCase().includes(q) ||
                      (u.username || '').toLowerCase().includes(q) ||
                      String(u.displayId || '').toLowerCase().includes(q)
                    );
                  });
                  if (filteredUsers.length === 0) {
                    return (
                      <p className="text-xs text-white/60 text-center py-8">
                        No matching users found.
                      </p>
                    );
                  }
                  return filteredUsers.map((u) => {
                    const alreadyInvited = Boolean(invitedUserIds[u.id]);
                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#1C1238] border border-white/10"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#2563EB] text-xs font-black flex items-center justify-center shrink-0">
                              {(u.name || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white truncate block">{u.name}</span>
                            <span className="text-[10px] text-white/55 font-mono truncate block">
                              ID: {u.displayId}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleSendRoomInviteToUser(u)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                            alreadyInvited
                              ? 'bg-emerald-500/25 border border-emerald-400/50 text-emerald-200'
                              : 'bg-gradient-to-r from-[#00A8FF] to-[#2563EB] text-white shadow'
                          }`}
                        >
                          {alreadyInvited ? 'Invited ✓' : 'Invite'}
                        </button>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* INCOMING SEAT INVITATION */}
      {incomingSeatInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#160A2B] border border-[#FA26A0]/40 rounded-3xl p-5 shadow-2xl space-y-4 text-center">
            <h3 className="text-sm font-black text-white">You Are Invited to Speak</h3>
            <p className="text-xs text-white/70">
              Host {incomingSeatInvite.fromHost.name} invited you to Seat #{incomingSeatInvite.seatIndex + 1}.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setIncomingSeatInvite(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold"
              >
                Decline
              </button>
              <button
                onClick={handleAcceptSeatInvitation}
                className="flex-1 py-2.5 rounded-xl bg-[#FA26A0] text-white text-xs font-bold"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE PARTICIPANT / OCCUPIED SEAT (HOST & MODERATOR MENU: MAKE MODERATOR, REMOVE FROM SEAT, 4-TIER KICK, PERMANENT BLOCK) */}
      {selectedSeatMember && canModerateTarget(selectedSeatMember.user.id) && (
        <div
          data-no-doubletap="true"
          onClick={closeModerationModal}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#160A2B] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-3 max-h-[85vh] overflow-y-auto no-scrollbar"
          >
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                {selectedSeatMember.user.avatar ? (
                  <img
                    src={selectedSeatMember.user.avatar}
                    alt={selectedSeatMember.user.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-[#FA26A0] shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#8B20FF] text-sm font-black flex items-center justify-center ring-2 ring-[#FA26A0] shrink-0">
                    {(selectedSeatMember.user.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-white truncate">
                      {selectedSeatMember.user.name}
                    </span>
                    {moderatorIdsSet.has(selectedSeatMember.user.id) && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-[8.5px] font-black uppercase shrink-0">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        MOD
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    <LevelBadge level={selectedSeatMember.user.level ?? 0} size="xs" />
                    <VipTierBadge tier={selectedSeatMember.user.vipLevel ?? 0} size="xs" />
                    {(selectedSeatMember.user.superVipLevel ?? 0) > 0 && (
                      <SuperVipTierBadge tier={selectedSeatMember.user.superVipLevel ?? 0} size="xs" />
                    )}
                  </div>
                  <span className="text-[10px] text-[#FA26A0] font-mono font-bold mt-0.5">
                    {selectedSeatMember.index !== null
                      ? `Seat #${selectedSeatMember.index + 1} • ${isRoomHost ? 'Host' : 'Moderator'} Controls`
                      : `Room Audience • ${isRoomHost ? 'Host' : 'Moderator'} Controls`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModerationModal}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white shrink-0"
                aria-label="Close moderation menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {showKickDurationPicker ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-200 flex items-center gap-1.5">
                    <ShieldOff className="w-4 h-4 text-rose-400" />
                    Select Kick Duration
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowKickDurationPicker(false)}
                    className="text-[11px] font-bold text-white/65 hover:text-white"
                  >
                    Back
                  </button>
                </div>
                <p className="text-[11px] text-white/65 leading-snug">
                  Kicked users are removed immediately and cannot re-enter or interact during the selected period.
                </p>
                <div className="space-y-1.5 pt-1">
                  {ROOM_KICK_OPTIONS.map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      disabled={moderationBusy}
                      onClick={() => void handleKickUserWithDuration(opt.type)}
                      className="w-full p-3 rounded-2xl bg-[#22103D] hover:bg-rose-600/25 border border-white/10 hover:border-rose-400/50 text-left transition-all flex items-center justify-between gap-2 disabled:opacity-50"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-black text-white block">{opt.label}</span>
                        <span className="text-[10px] text-white/65 block">{opt.description}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-rose-500/25 text-rose-200 text-[10px] font-black shrink-0">
                        {opt.shortLabel}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : showBlockMemberConfirm ? (
              <div className="space-y-3 pt-1">
                <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-300 text-xs font-black">
                    <Ban className="w-4 h-4 shrink-0" />
                    <span>Permanently Block {selectedSeatMember.user.name}?</span>
                  </div>
                  <p className="text-[11px] text-rose-100/80 leading-relaxed">
                    They will be permanently blocked from entering this Host&apos;s party rooms or live streams and interacting in the room.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={moderationBusy}
                    onClick={() => setShowBlockMemberConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={moderationBusy}
                    onClick={() => void handlePermanentBlockMember()}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-lg disabled:opacity-50"
                  >
                    {moderationBusy ? 'Blocking...' : 'Confirm Block'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedSeatMember.user;
                    closeModerationModal();
                    onSelectUser(target);
                  }}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  <span>View User Profile</span>
                </button>

                {/* Host-only: Make / Remove Lifetime Moderator */}
                {isRoomHost && (
                  <button
                    type="button"
                    disabled={moderationBusy}
                    onClick={() => void handleToggleModeratorRole(selectedSeatMember.user)}
                    className={`w-full py-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                      moderatorIdsSet.has(selectedSeatMember.user.id)
                        ? 'bg-cyan-950/70 hover:bg-cyan-900/70 border-cyan-400/50 text-cyan-200'
                        : 'bg-gradient-to-r from-cyan-500/90 via-sky-500/90 to-indigo-500/90 hover:opacity-95 border-cyan-300/60 text-white shadow-lg shadow-cyan-500/20'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {moderatorIdsSet.has(selectedSeatMember.user.id)
                        ? 'Remove Moderator'
                        : 'Make Moderator (Lifetime)'}
                    </span>
                  </button>
                )}

                {selectedSeatMember.index !== null && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const idx = selectedSeatMember.index!;
                        closeModerationModal();
                        handleToggleSeatMute(idx);
                      }}
                      className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      {mutedSeatIndices.includes(selectedSeatMember.index) ? (
                        <>
                          <Mic className="w-4 h-4" />
                          <span>Unmute Seat Microphone</span>
                        </>
                      ) : (
                        <>
                          <MicOff className="w-4 h-4" />
                          <span>Mute Seat Microphone</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleRemoveFromSeat()}
                      className="w-full py-2.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/40 text-orange-200 text-xs font-black flex items-center justify-center gap-2 transition-colors"
                    >
                      <ArrowDownCircle className="w-4 h-4" />
                      <span>Remove from Seat</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowBlockMemberConfirm(false);
                    setShowKickDurationPicker(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 border border-rose-400/40 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 active:scale-[0.99] transition-all"
                >
                  <ShieldOff className="w-4 h-4" />
                  <span>Kick User (Session / 24h / 15d / 30d)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowKickDurationPicker(false);
                    setShowBlockMemberConfirm(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-red-950/80 hover:bg-red-900/80 border border-red-500/50 text-red-200 text-xs font-black flex items-center justify-center gap-2 transition-colors"
                >
                  <Ban className="w-4 h-4" />
                  <span>Block User (Permanent)</span>
                </button>

                <button
                  type="button"
                  onClick={closeModerationModal}
                  className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/65 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LIFETIME MODERATORS LIST MODAL (HOST ONLY) */}
      {showModeratorsListModal && isRoomHost && (
        <div
          data-no-doubletap="true"
          onClick={() => setShowModeratorsListModal(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#160A2B] border-t sm:border border-cyan-500/30 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col max-h-[75vh]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-300" />
                  <span>Lifetime Moderators ({hostModerators.length})</span>
                </h3>
                <p className="text-[10px] text-cyan-200/75 mt-0.5">
                  Active across all your broadcasts until removed here or in Settings
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModeratorsListModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto no-scrollbar py-1">
              {hostModerators.length === 0 ? (
                <p className="text-xs text-white/60 text-center py-8 leading-relaxed">
                  No moderators assigned yet. Tap any user on a seat, comment, or audience list and tap{' '}
                  <span className="text-cyan-300 font-bold">Make Moderator</span>.
                </p>
              ) : (
                hostModerators.map((mod) => (
                  <div
                    key={mod.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#200E38] border border-white/10"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {mod.moderatorAvatar ? (
                        <img
                          src={mod.moderatorAvatar}
                          alt={mod.moderatorName}
                          className="w-9 h-9 rounded-full object-cover ring-2 ring-cyan-400/70 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-cyan-600/40 text-xs font-black flex items-center justify-center shrink-0">
                          {(mod.moderatorName || 'M').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white truncate block">
                          {mod.moderatorName}
                        </span>
                        <span className="text-[10px] text-cyan-300 font-semibold block">
                          Moderator • Added {new Date(mod.assignedAt || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await removeHostModerator({
                          hostId: currentUser.id,
                          moderatorUserId: mod.moderatorUserId,
                        });
                        if (res.success) {
                          showToast(`Removed ${mod.moderatorName} from Moderators`);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/40 text-rose-200 text-[10px] font-black shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* CLEAR COMMENT HISTORY CONFIRMATION MODAL (HOST & MODERATOR) */}
      {showClearChatConfirmModal && canModerate && (
        <div
          data-no-doubletap="true"
          onClick={() => setShowClearChatConfirmModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#160A2B] border border-rose-500/40 rounded-3xl p-5 shadow-2xl space-y-4 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-300">
              <Eraser className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-white">Clear All Comment History?</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              This will permanently delete all room comments for everyone in this party room.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isClearingChat}
                onClick={() => setShowClearChatConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearingChat}
                onClick={() => void handleClearAllComments()}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black disabled:opacity-50"
              >
                {isClearingChat ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KICKED USERS MANAGEMENT MODAL (HOST & MODERATOR) */}
      {showKickedUsersModal && canModerate && (
        <div
          data-no-doubletap="true"
          onClick={() => setShowKickedUsersModal(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#160A2B] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col max-h-[75vh]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <ShieldOff className="w-4 h-4 text-rose-400" />
                <span>Kicked Users ({hostRoomKicks.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowKickedUsersModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto no-scrollbar py-1">
              {hostRoomKicks.length === 0 ? (
                <p className="text-xs text-white/60 text-center py-8">
                  No users are currently kicked from this room.
                </p>
              ) : (
                hostRoomKicks.map((kick) => (
                  <div
                    key={kick.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#200E38] border border-white/10"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {kick.targetUserAvatar ? (
                        <img
                          src={kick.targetUserAvatar}
                          alt={kick.targetUserName}
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-rose-600/40 text-xs font-black flex items-center justify-center shrink-0">
                          {(kick.targetUserName || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white truncate block">
                          {kick.targetUserName}
                        </span>
                        <span className="text-[10px] text-rose-300 font-semibold block">
                          {formatKickDurationLabel(kick.durationType)} • {formatRemainingKickTime(kick)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await unkickUserFromRoom(kick.roomId, kick.targetUserId);
                        if (res.success) {
                          showToast(`Removed kick for ${kick.targetUserName}`);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-emerald-500/25 border border-white/15 text-white text-[10px] font-black shrink-0"
                    >
                      Unkick
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* OWNER SEAT CHOICE */}
      {showOwnerSeatChoice !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#160A2B] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 text-center">
            <h3 className="text-sm font-black text-white">Seat #{showOwnerSeatChoice + 1}</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleOwnerTakeSeat(showOwnerSeatChoice)}
                className="w-full py-2.5 rounded-xl bg-[#FA26A0] text-white text-xs font-bold flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4 text-amber-300" />
                <span>Sit in Seat #{showOwnerSeatChoice + 1}</span>
              </button>
              <button
                onClick={() => {
                  const target = showOwnerSeatChoice;
                  setShowOwnerSeatChoice(null);
                  setShowInviteToSeatModal(target);
                }}
                className="w-full py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4 text-pink-400" />
                <span>Invite Audience Member</span>
              </button>
              <button
                onClick={() => setShowOwnerSeatChoice(null)}
                className="w-full py-2 text-xs text-white/50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT CLOSE ROOM CONFIRMATION */}
      {showCloseRoomConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#160A2B] border border-rose-500/40 rounded-3xl p-5 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-white">Permanently Close Room?</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              This will end the party room and disconnect all connected listeners.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowCloseRoomConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold"
              >
                Keep Active
              </button>
              <button
                onClick={async () => {
                  setShowCloseRoomConfirmModal(false);
                  hasExplicitlyLeftRef.current = true;
                  await partyMusicEngine.stop().catch(() => {});
                  await releasePartyScreenWakeLock(`party_room_${room.id}_${currentUser.id}`).catch(() => {});
                  if (realMicAnalyserRef.current) realMicAnalyserRef.current.cleanup();
                  if (realMicStreamRef.current) stopMediaStream(realMicStreamRef.current);
                  webrtcMediaService.stopPartyVoice();
                  await agoraRtcService.leaveChannel().catch(() => {});
                  await liveAndRoomService.endPartyRoom(room.id, currentUser.id).catch(() => {});
                  onCloseRoom?.(room.id);
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg"
              >
                Close Permanently
              </button>
            </div>
          </div>
        </div>
      )}
      <PartyMusicPanelModal
        isOpen={showMusicModal}
        onClose={() => setShowMusicModal(false)}
        isHost={isRoomHost}
        musicState={partyMusicState}
        displayPositionSec={musicDisplayPosSec}
        displayDurationSec={musicDisplayDurSec}
        isLoadingTrack={musicLoadingTrack}
        errorMessage={musicErrorMessage}
        voiceTransport={voiceTransport}
        isSpeakerMuted={isSpeakerMuted}
        localListenerVolume={localListenerMusicVol}
        onLocalListenerVolumeChange={setLocalListenerMusicVol}
        onAddGalleryAudioFiles={(files) => void handleAddGalleryFiles(files, 'gallery_audio')}
        onAddGalleryVideoFiles={(files) => void handleAddGalleryFiles(files, 'gallery_video')}
        onPickNativeGalleryAudio={() => handlePickNativeGalleryMedia('gallery_audio')}
        onPickNativeGalleryVideo={() => handlePickNativeGalleryMedia('gallery_video')}
        onAddYouTubeTrack={handleAddYouTubeTrack}
        onPlayTrackAtIndex={(idx) => void startHostTrackAtIndex(idx)}
        onTogglePlayPause={() => void handleMusicTogglePlayPause()}
        onStop={() => void handleMusicStop()}
        onNext={() => void handleMusicNextTrack()}
        onPrevious={() => void handleMusicPreviousTrack()}
        onSeek={(pos) => void handleMusicSeek(pos)}
        onHostVolumeChange={handleMusicVolumeChange}
        onRemoveQueueItem={(trackId) => void handleRemoveQueueItem(trackId)}
        onClearError={() => setMusicErrorMessage(null)}
      />
      <LiveLeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        mode="party"
        contextId={room.id}
        contextTitle={room.title}
        currentUser={currentUser}
        onSelectUser={onSelectUser}
      />
      <PartyBackgroundPickerModal
        isOpen={showBackgroundPicker}
        onClose={() => setShowBackgroundPicker(false)}
        hostAvatar={room.host.avatar}
        hostName={room.host.name}
        currentType={backgroundType}
        currentPresetId={backgroundId}
        currentCustomImage={backgroundImage}
        onSelectBackground={handleUpdatePartyBackground}
      />
    </div>
  );
};
