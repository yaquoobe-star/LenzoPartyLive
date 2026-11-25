import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Plus, 
  Check, 
  Heart, 
  Gift, 
  Share2, 
  Smile, 
  Send, 
  Swords, 
  Sparkles, 
  Users, 
  Volume2, 
  VolumeX, 
  Flame,
  Flag,
  RotateCcw,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  RefreshCw,
  Crown,
  Pin,
  Sliders,
  SlidersHorizontal,
  Wand2,
  Radio,
  Eye,
  ShieldAlert,
  ChevronDown,
  CheckCircle2,
  Info,
  Trophy,
  Minimize2
} from 'lucide-react';
import { 
  LiveStream, 
  ChatMessage, 
  UserProfile, 
  GiftItem, 
  PKMatchSession, 
  LiveViewerInfo
} from '../../types';
import { AvatarWithFrame } from '../common/AvatarWithFrame';
import { LevelBadge } from '../common/LevelBadge';
import { LiveLeaderboardModal } from '../common/LiveLeaderboardModal';
import { pkService } from '../../utils/pkService';
import { 
  acquireRealDeviceCamera, 
  consumeStagedLiveStream,
  isNativeAndroidApp,
  openNativeAppSettings,
  setNativeLiveAudioMode,
  stopMediaStream, 
  createAudioAnalyser, 
  AudioAnalyserController 
} from '../../utils/mediaDeviceHelper';
import { agoraRtcService } from '../../utils/agoraRtcService';
import { webrtcMediaService } from '../../utils/webrtcMediaService';
import { liveAndRoomService } from '../../services/liveAndRoomService';
import {
  heartbeatFirestoreLiveViewer,
  joinFirestoreLiveViewer,
  leaveFirestoreLiveViewer,
  sendFirestoreLiveComment,
  subscribeFirestoreLiveComments,
  subscribeFirestoreLiveStreamDoc,
  subscribeFirestoreLiveViewers,
  syncFirestoreLiveStreamLifecycle,
  updateFirestoreLiveLikes,
  updateFirestoreLiveViewerCount,
} from '../../services/firestoreRealtimeService';
import { EMPTY_ROOM_CLEANUP_MS } from '../../shared/roomLifecycleConfig';
import { getUserLevelProgress } from '../../utils/levelSystem';
import {
  acquirePartyScreenWakeLock,
  releasePartyScreenWakeLock,
} from '../../utils/screenWakeLock';

interface ActiveLiveScreenProps {
  stream: LiveStream;
  currentUser: UserProfile;
  onClose: () => void;
  onEndLive?: (streamId: string) => void;
  onUpdateStream?: (updated: LiveStream) => void;
  onToggleFollow?: (userId: string) => void;
  onOpenGiftShop: (recipient: UserProfile) => void;
  onOpenPK: () => void;
  onSelectUser: (user: UserProfile) => void;
  activeGiftCelebration?: {
    gift: GiftItem;
    sender: string;
    recipient: string;
    quantity: number;
  } | null;
  activePKSession?: PKMatchSession | null;
  onForfeitPK?: () => void;
  onRematchPK?: () => void;
  blockedUserIds?: string[];
  blockedByUserIds?: string[];
  isMinimized?: boolean;
  onMinimize?: () => void;
  exitSignal?: number;
}

interface BurstParticle {
  id: number;
  burstX: number;
  burstY: number;
  color: string;
  size: number;
}

interface BurstHeart {
  id: number;
  x: number;
  y: number;
  color: string;
  hostSide: 'left' | 'right';
  rotation: number;
  particles: BurstParticle[];
}

type VideoFilterType = 'normal' | 'beauty' | 'golden' | 'neon' | 'cyber';

const VIDEO_FILTERS: Record<VideoFilterType, { label: string; icon: string; css: string }> = {
  normal: { label: 'Normal', icon: '✨', css: '' },
  beauty: { label: 'Beauty Glow', icon: '💖', css: 'contrast-[1.08] brightness-[1.12] saturate-[1.15]' },
  golden: { label: 'Golden Hour', icon: '🌅', css: 'sepia-[0.22] saturate-[1.3] contrast-[1.08]' },
  neon: { label: 'Neon Glow', icon: '🟣', css: 'saturate-[1.5] contrast-[1.25] hue-rotate-[15deg]' },
  cyber: { label: 'Cyberpunk', icon: '⚡', css: 'contrast-[1.3] brightness-[1.05] hue-rotate-[180deg] saturate-[1.35]' }
};

export const ActiveLiveScreen: React.FC<ActiveLiveScreenProps> = ({
  stream,
  currentUser,
  onClose,
  onEndLive,
  onUpdateStream,
  onToggleFollow,
  onOpenGiftShop,
  onOpenPK,
  onSelectUser,
  activeGiftCelebration,
  activePKSession,
  onForfeitPK,
  onRematchPK,
  blockedUserIds = [],
  blockedByUserIds = [],
  isMinimized = false,
  onMinimize,
  exitSignal = 0,
}) => {
  // Permission rule: user is stream creator / live broadcast owner
  const isActualHost = currentUser.id === stream.host.id;
  const blockedUserIdsRef = useRef<Set<string>>(new Set(blockedUserIds));
  const blockedByUserIdsRef = useRef<Set<string>>(new Set(blockedByUserIds));

  useEffect(() => {
    blockedUserIdsRef.current = new Set(blockedUserIds);
    if (isActualHost && blockedUserIds.length > 0) {
      const blockedSet = blockedUserIdsRef.current;
      setViewersList((prev) => {
        const filtered = prev.filter((v) => !blockedSet.has(v.userId));
        if (filtered.length !== prev.length) {
          setViewersTotalCount(filtered.length);
          setLiveViewerCount(filtered.length);
        }
        return filtered;
      });
      setMessages((prev) => prev.filter((m) => !blockedSet.has(m.senderId)));
    }
  }, [blockedUserIds, isActualHost]);

  useEffect(() => {
    blockedByUserIdsRef.current = new Set(blockedByUserIds);
    if (!isActualHost && blockedByUserIds.includes(stream.host.id)) {
      void releasePartyScreenWakeLock(`live_stream_${stream.id}_${currentUser.id}`);
      webrtcMediaService.stopLive();
      agoraRtcService.leaveChannel().catch(() => {});
      void leaveFirestoreLiveViewer(stream.id);
      onClose();
    }
  }, [blockedByUserIds, isActualHost, stream.host.id, stream.id, currentUser.id, onClose]);

  // Keep screen permanently awake during active live streaming sessions (host & viewers)
  useEffect(() => {
    const wakeOwnerId = `live_stream_${stream.id}_${currentUser.id}`;
    void acquirePartyScreenWakeLock(wakeOwnerId);
    return () => {
      void releasePartyScreenWakeLock(wakeOwnerId);
    };
  }, [stream.id, currentUser.id]);

  const [isHostMode, setIsHostMode] = useState<boolean>(isActualHost); // Only true if current user is the actual live owner

  // Host Hardware & Stream Controls
  const [isCameraOn, setIsCameraOn] = useState<boolean>(true);
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(true);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<VideoFilterType>('normal');
  const [showFilterPicker, setShowFilterPicker] = useState<boolean>(false);
  const [showHostControlsSheet, setShowHostControlsSheet] = useState<boolean>(false);
  const [showEndLiveConfirm, setShowEndLiveConfirm] = useState<boolean>(false);
  const [hasWebcamStream, setHasWebcamStream] = useState<boolean>(false);
  const [isFlippingCamera, setIsFlippingCamera] = useState<boolean>(false);
  const [streamSeconds, setStreamSeconds] = useState<number>(() =>
    stream.startTime ? Math.max(0, Math.floor((Date.now() - stream.startTime) / 1000)) : 0
  );

  // Chat, Entry Notification & Viewer Info States (Zero Mock Data)
  const [pinnedMessage, setPinnedMessage] = useState<string | null>(stream.announcement || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [liveViewerCount, setLiveViewerCount] = useState<number>(stream.numericViewers ?? 0);
  const [entryNotice, setEntryNotice] = useState<{ id: string; name: string } | null>(null);
  const [showViewersModal, setShowViewersModal] = useState<boolean>(false);
  const [viewersList, setViewersList] = useState<LiveViewerInfo[]>([]);
  const [viewersTotalCount, setViewersTotalCount] = useState<number>(0);
  const [viewersPage, setViewersPage] = useState<number>(1);
  const [viewersHasMore, setViewersHasMore] = useState<boolean>(false);
  const [viewersLoading, setViewersLoading] = useState<boolean>(false);

  const [inputMessage, setInputMessage] = useState('');
  const [burstHearts, setBurstHearts] = useState<BurstHeart[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(stream.host.isFollowing || false);
  const [streamLikes, setStreamLikes] = useState<number>(stream.likesCount || 0);

  const hostLevelProgress = getUserLevelProgress(stream.host);

  // Authoritative server timer synchronization for PK
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);

  // Realtime Device Camera & Audio Analyzer States
  const [audioVolumeLevel, setAudioVolumeLevel] = useState<number>(0);
  const [cameraLabel, setCameraLabel] = useState<string>('Front Camera');
  const [isRealBackCamera, setIsRealBackCamera] = useState<boolean>(false);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState<boolean>(false);

  // Real-Time Live Subscription States (Agora RTC + WebRTC Fallback for Viewers & Broadcasters)
  const [hasRemoteAgoraStream, setHasRemoteAgoraStream] = useState<boolean>(false);
  const [remoteHostIsCameraOn, setRemoteHostIsCameraOn] = useState<boolean>(true);
  const [agoraConnectionState, setAgoraConnectionState] = useState<string>('connecting');
  const [mediaTransport, setMediaTransport] = useState<'agora' | 'webrtc' | 'connecting'>('connecting');
  const [viewerSoundMuted, setViewerSoundMuted] = useState<boolean>(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState<boolean>(false);
  const [remoteWebRtcStream, setRemoteWebRtcStream] = useState<MediaStream | null>(null);
  const remotePlayerContainerRef = useRef<HTMLDivElement>(null);
  const remoteWebRtcVideoRef = useRef<HTMLVideoElement>(null);
  const localPlayerContainerRef = useRef<HTMLDivElement>(null);

  // Agora RTC Engine States
  const [agoraConfig, setAgoraConfig] = useState<{ configured: boolean; appId: string }>({ configured: false, appId: '' });
  const [agoraConnected, setAgoraConnected] = useState<boolean>(false);
  const [hasAgoraLocalVideo, setHasAgoraLocalVideo] = useState<boolean>(false);
  const [agoraRole, setAgoraRole] = useState<'host' | 'audience'>('audience');

  // References
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaTransportRef = useRef<'agora' | 'webrtc' | 'connecting'>('connecting');
  mediaTransportRef.current = mediaTransport;
  const isMutedRef = useRef<boolean>(false);
  isMutedRef.current = isMuted;
  const audioAnalyserControllerRef = useRef<AudioAnalyserController | null>(null);
  const audioVolumeRafRef = useRef<number | null>(null);
  const isAcquiringRef = useRef<boolean>(false);
  const lastTapRef = useRef<{ time: number; x: number; y: number; side: string }>({ time: 0, x: 0, y: 0, side: '' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const entryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenEntriesRef = useRef<Map<string, number>>(new Map());

  // Live broadcast duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setStreamSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load paginated viewers for (i) modal without wiping Firestore-synced viewers on empty backend response
  const loadLiveViewers = async (page = 1, append = false) => {
    setViewersLoading(true);
    try {
      const res = await liveAndRoomService.fetchLiveViewers(stream.id, page, 20);
      if (Array.isArray(res.viewers) && res.viewers.length > 0) {
        setViewersList((prev) => {
          const byId = new Map<string, LiveViewerInfo>();
          prev.forEach((v) => byId.set(v.userId, v));
          res.viewers.forEach((v) => byId.set(v.userId, v));
          const merged = Array.from(byId.values());
          setViewersTotalCount(Math.max(res.totalCount || 0, merged.length));
          return merged;
        });
      }
      setViewersHasMore(res.hasMore);
      setViewersPage(page);
    } finally {
      setViewersLoading(false);
    }
  };

  const hasExplicitlyLeftLiveRef = useRef<boolean>(false);
  const liveViewerCountRef = useRef<number>(liveViewerCount);
  useEffect(() => {
    liveViewerCountRef.current = liveViewerCount;
  }, [liveViewerCount]);

  // Cleanly exit Solo Live (marks Host or Viewer LEFT immediately without killing an occupied room; starts 5-min empty countdown if 0 remain)
  const handleCleanLeaveLive = async () => {
    setShowEndLiveConfirm(false);
    hasExplicitlyLeftLiveRef.current = true;
    if (audioAnalyserControllerRef.current) {
      audioAnalyserControllerRef.current.cleanup();
      audioAnalyserControllerRef.current = null;
    }
    if (mediaStreamRef.current) {
      stopMediaStream(mediaStreamRef.current);
      mediaStreamRef.current = null;
    }
    webrtcMediaService.stopLive();
    await agoraRtcService.leaveChannel().catch(() => {});
    void setNativeLiveAudioMode(false);

    const remainingViewers = isActualHost
      ? Math.max(0, liveViewerCountRef.current)
      : Math.max(0, liveViewerCountRef.current - 1);
    const nextHostPresent = isActualHost ? false : stream.hostPresent !== false;
    const totalActive = (nextHostPresent ? 1 : 0) + remainingViewers;
    const now = Date.now();
    const nextStatus: 'active' | 'empty' = totalActive === 0 ? 'empty' : 'active';
    const nextEmptySince = totalActive === 0 ? now : null;
    const nextClosesAt = totalActive === 0 ? now + EMPTY_ROOM_CLEANUP_MS : null;

    onUpdateStream?.({
      ...stream,
      numericViewers: remainingViewers,
      viewerCount: String(remainingViewers),
      hostPresent: nextHostPresent,
      status: nextStatus,
      emptySince: nextEmptySince,
      closesAt: nextClosesAt,
    });

    const [serverUpdatedStream] = await Promise.all([
      liveAndRoomService.leaveLiveStream(stream.id, currentUser.id).catch(() => null),
      leaveFirestoreLiveViewer(stream.id).catch(() => {}),
      syncFirestoreLiveStreamLifecycle(stream.id, {
        numericViewers: remainingViewers,
        ...(isActualHost ? { hostPresent: false } : {}),
        status: nextStatus,
        emptySince: nextEmptySince,
        closesAt: nextClosesAt,
      }).catch(() => {}),
    ]);

    void releasePartyScreenWakeLock(`live_stream_${stream.id}_${currentUser.id}`);
    if (serverUpdatedStream) {
      onUpdateStream?.(serverUpdatedStream);
    }
    onClose();
  };

  // Real-time stream join, 15s heartbeat, WebSocket + Firestore comments/likes/viewers/entry banners & exit cleanup
  useEffect(() => {
    let active = true;
    hasExplicitlyLeftLiveRef.current = false;
    let streamDocEverExisted = false;
    const initialKnownViewerIds = new Set<string>([currentUser.id]);
    let fsViewersInitialized = false;
    const streamMeta = {
      host: stream.host,
      title: stream.title,
      category: stream.category,
    };

    liveAndRoomService.setCurrentUser(currentUser.id);
    liveAndRoomService.subscribeLive(stream.id, currentUser.id);

    // Always write real-time presence to Cloud Firestore (works even when Railway API is 502)
    void joinFirestoreLiveViewer(stream.id, currentUser, isActualHost);
    void syncFirestoreLiveStreamLifecycle(stream.id, {
      status: 'active',
      emptySince: null,
      closesAt: null,
      ...(isActualHost ? { hostPresent: true } : {}),
    });

    liveAndRoomService
      .joinLiveStream(stream.id, currentUser, streamMeta)
      .then((res) => {
        if (!active) return;
        if (res.stream) {
          setLiveViewerCount(res.stream.numericViewers ?? 0);
          onUpdateStream?.(res.stream);
          if (typeof res.stream.likesCount === 'number') {
            setStreamLikes((prev) => Math.max(prev, res.stream!.likesCount || 0));
          }
        }
        if (Array.isArray(res.viewers) && res.viewers.length > 0) {
          setViewersList((prev) => {
            const byId = new Map<string, LiveViewerInfo>();
            prev.forEach((v) => byId.set(v.userId, v));
            res.viewers!.forEach((v) => byId.set(v.userId, v));
            const merged = Array.from(byId.values());
            setViewersTotalCount(merged.length);
            return merged;
          });
        }
        if (Array.isArray(res.comments) && res.comments.length > 0) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const next = [...prev];
            res.comments!.forEach((m) => {
              if (!seen.has(m.id)) {
                seen.add(m.id);
                next.push(m);
              }
            });
            return next.slice(-80);
          });
        }
      })
      .catch((err) => {
        const msg = String(err?.message || err || '');
        if (!isActualHost && /block|403|forbidden/i.test(msg)) {
          showToast('You cannot join or interact with this live stream.');
          webrtcMediaService.stopLive();
          agoraRtcService.leaveChannel().catch(() => {});
          void leaveFirestoreLiveViewer(stream.id);
          setTimeout(() => {
            if (active) onClose();
          }, 900);
          return;
        }
        console.warn('[ActiveLive] Backend join fallback to Firestore:', msg);
      });

    // Cloud Firestore real-time viewers subscription (keeps viewer count, top avatars & join notices live 24/7)
    const unsubFsViewers = subscribeFirestoreLiveViewers(stream.id, (rawFsViewers) => {
      if (!active) return;
      const fsViewers = isActualHost
        ? rawFsViewers.filter((v) => !blockedUserIdsRef.current.has(v.userId))
        : rawFsViewers;

      if (!fsViewersInitialized) {
        fsViewersInitialized = true;
        fsViewers.forEach((v) => initialKnownViewerIds.add(v.userId));
      } else {
        fsViewers.forEach((v) => {
          if (!initialKnownViewerIds.has(v.userId) && v.userId !== currentUser.id) {
            initialKnownViewerIds.add(v.userId);
            const now = Date.now();
            const lastShown = seenEntriesRef.current.get(v.userId) || 0;
            if (now - lastShown > 10000) {
              seenEntriesRef.current.set(v.userId, now);
              setEntryNotice({ id: `${v.userId}_${now}`, name: v.name || 'Viewer' });
              setMessages((prev) => [
                ...prev.slice(-79),
                {
                  id: `join_fs_${v.userId}_${now}`,
                  senderId: v.userId,
                  senderName: v.name || 'Viewer',
                  senderAvatar: v.avatar || '',
                  text: 'joined the live',
                  timestamp: 'Now',
                  isSystem: true,
                },
              ]);
              if (entryTimerRef.current) clearTimeout(entryTimerRef.current);
              entryTimerRef.current = setTimeout(() => setEntryNotice(null), 3500);
            }
            if (isActualHost && webrtcMediaService.isLiveHostActive(stream.id)) {
              webrtcMediaService.sendOfferToViewer(v.userId);
            }
          }
        });
      }

      setViewersList(fsViewers);
      setViewersTotalCount(fsViewers.length);
      setLiveViewerCount(fsViewers.length);

      if (isActualHost) {
        void updateFirestoreLiveViewerCount(stream.id, fsViewers.length);
      }
    });

    // Cloud Firestore real-time comments subscription
    const unsubFsComments = subscribeFirestoreLiveComments(stream.id, (fsComments) => {
      if (!active || fsComments.length === 0) return;
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const merged = [...prev];
        let changed = false;
        fsComments.forEach((m) => {
          if (isActualHost && blockedUserIdsRef.current.has(m.senderId)) return;
          if (!seen.has(m.id)) {
            seen.add(m.id);
            merged.push(m);
            changed = true;
          }
        });
        return changed ? merged.slice(-80) : prev;
      });
    });

    // Cloud Firestore parent stream doc listener (syncs likes & host end-stream event)
    const unsubFsStreamDoc = subscribeFirestoreLiveStreamDoc(stream.id, (exists, data) => {
      if (!active) return;
      if (exists) {
        streamDocEverExisted = true;
        if (typeof data?.likesCount === 'number') {
          setStreamLikes((prev) => Math.max(prev, data.likesCount));
        }
      } else if (streamDocEverExisted && !isActualHost) {
        showToast('Live broadcast has ended');
        webrtcMediaService.stopLive();
        agoraRtcService.leaveChannel().catch(() => {});
        setTimeout(() => {
          if (active) onClose();
        }, 1500);
      }
    });

    const heartbeat = setInterval(() => {
      liveAndRoomService.sendLiveHeartbeat(stream.id, currentUser.id);
      void heartbeatFirestoreLiveViewer(stream.id, currentUser, isActualHost);
    }, 15000);

    const unsubscribeWs = liveAndRoomService.addEventListener((event, payload) => {
      if (!active) return;

      if (
        event === 'user:blocked_by' &&
        !isActualHost &&
        payload?.blockerId === stream.host.id
      ) {
        showToast('You have been blocked by the host.');
        webrtcMediaService.stopLive();
        agoraRtcService.leaveChannel().catch(() => {});
        void leaveFirestoreLiveViewer(stream.id);
        setTimeout(() => {
          if (active) onClose();
        }, 700);
        return;
      }

      if (payload?.streamId !== stream.id) return;

      if (event === 'live:sync_state') {
        if (payload.stream && typeof payload.stream.numericViewers === 'number') {
          setLiveViewerCount(payload.stream.numericViewers);
        }
        if (Array.isArray(payload.viewers)) {
          const filtered = isActualHost
            ? payload.viewers.filter((v: LiveViewerInfo) => !blockedUserIdsRef.current.has(v.userId))
            : payload.viewers;
          setViewersList(filtered);
          setViewersTotalCount(filtered.length);
        }
        if (Array.isArray(payload.comments)) {
          const filteredComments = isActualHost
            ? payload.comments.filter((m: ChatMessage) => !blockedUserIdsRef.current.has(m.senderId))
            : payload.comments;
          setMessages(filteredComments);
        }
      } else if (event === 'live:viewer_joined') {
        if (typeof payload.numericViewers === 'number') {
          setLiveViewerCount(payload.numericViewers);
        }
        const joinedViewer: LiveViewerInfo | undefined = payload.viewer;
        if (isActualHost && joinedViewer?.userId && blockedUserIdsRef.current.has(joinedViewer.userId)) {
          return;
        }
        if (Array.isArray(payload.viewers)) {
          const filtered = isActualHost
            ? payload.viewers.filter((v: LiveViewerInfo) => !blockedUserIdsRef.current.has(v.userId))
            : payload.viewers;
          setViewersList(filtered);
          setViewersTotalCount(filtered.length);
        } else if (joinedViewer?.userId) {
          setViewersList((prev) => {
            const next = [
              ...prev.filter((v) => v.userId !== joinedViewer.userId),
              joinedViewer,
            ];
            setViewersTotalCount(next.length);
            return next;
          });
        }

        // Proactively send WebRTC offer from Host to newly joined viewer (supports standby WebRTC bridge too)
        if (
          isActualHost &&
          webrtcMediaService.isLiveHostActive(stream.id) &&
          joinedViewer?.userId &&
          joinedViewer.userId !== currentUser.id
        ) {
          webrtcMediaService.sendOfferToViewer(joinedViewer.userId);
        }

        if (joinedViewer && joinedViewer.userId !== currentUser.id) {
          const now = Date.now();
          const lastShown = seenEntriesRef.current.get(joinedViewer.userId) || 0;
          if (now - lastShown > 10000) {
            seenEntriesRef.current.set(joinedViewer.userId, now);
            setEntryNotice({
              id: `${joinedViewer.userId}_${now}`,
              name: joinedViewer.name || 'Viewer',
            });
            setMessages((prev) => [
              ...prev.slice(-79),
              {
                id: `join_${joinedViewer.userId}_${now}`,
                senderId: joinedViewer.userId,
                senderName: joinedViewer.name || 'Viewer',
                senderAvatar: joinedViewer.avatar || '',
                text: 'joined the live',
                timestamp: 'Now',
                isSystem: true,
              },
            ]);
            if (entryTimerRef.current) clearTimeout(entryTimerRef.current);
            entryTimerRef.current = setTimeout(() => setEntryNotice(null), 3500);
          }
        }
      } else if (event === 'live:viewer_left' || event === 'live:viewer_count_updated') {
        if (
          event === 'live:viewer_left' &&
          !isActualHost &&
          payload.reason === 'blocked' &&
          payload.userId === currentUser.id
        ) {
          showToast('You have been blocked by the host.');
          webrtcMediaService.stopLive();
          agoraRtcService.leaveChannel().catch(() => {});
          void leaveFirestoreLiveViewer(stream.id);
          setTimeout(() => {
            if (active) onClose();
          }, 700);
          return;
        }
        if (typeof payload.numericViewers === 'number') {
          setLiveViewerCount(payload.numericViewers);
        }
        if (Array.isArray(payload.viewers)) {
          setViewersList(payload.viewers);
          setViewersTotalCount(payload.viewers.length);
        } else if (event === 'live:viewer_left' && payload.userId) {
          setViewersList((prev) => {
            const next = prev.filter((v) => v.userId !== payload.userId);
            setViewersTotalCount(next.length);
            return next;
          });
        }
      } else if (event === 'live:comment' && payload.message) {
        const incoming: ChatMessage = payload.message;
        if (isActualHost && blockedUserIdsRef.current.has(incoming.senderId)) {
          return;
        }
        setMessages((prev) =>
          prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
        );
      } else if ((event === 'live:like' || event === 'live:heart') && typeof payload.likesCount === 'number') {
        setStreamLikes(payload.likesCount);
      } else if (event === 'live:media_state') {
        if (!isActualHost && typeof payload.isCameraOn === 'boolean') {
          setRemoteHostIsCameraOn(payload.isCameraOn);
        }
      } else if (event === 'live:gift') {
        if (payload.message) {
          const giftMsg: ChatMessage = payload.message;
          setMessages((prev) =>
            prev.some((m) => m.id === giftMsg.id) ? prev : [...prev, giftMsg]
          );
        }
      } else if (event === 'live:host_left') {
        if (!isActualHost) {
          showToast('Host stepped out of the live room');
        }
        if (payload.stream) {
          onUpdateStream?.(payload.stream as LiveStream);
        }
      } else if (event === 'live:empty_countdown_started' || event === 'live:reactivated') {
        if (payload.stream) {
          onUpdateStream?.(payload.stream as LiveStream);
        }
      } else if (event === 'live:ended') {
        if (!isActualHost || payload.autoClosed) {
          showToast(
            payload.autoClosed
              ? 'Live room closed automatically after 5 minutes of inactivity'
              : 'Live broadcast has ended'
          );
          if (audioAnalyserControllerRef.current) {
            audioAnalyserControllerRef.current.cleanup();
            audioAnalyserControllerRef.current = null;
          }
          if (mediaStreamRef.current) {
            stopMediaStream(mediaStreamRef.current);
            mediaStreamRef.current = null;
          }
          webrtcMediaService.stopLive();
          agoraRtcService.leaveChannel().catch(() => {});
          setTimeout(() => {
            if (active) onClose();
          }, 1500);
        }
      }
    });

    const cleanupOnUnexpectedLiveExit = () => {
      if (hasExplicitlyLeftLiveRef.current) return;
      hasExplicitlyLeftLiveRef.current = true;
      const remainingViewers = isActualHost
        ? Math.max(0, liveViewerCountRef.current)
        : Math.max(0, liveViewerCountRef.current - 1);
      const nextHostPresent = isActualHost ? false : stream.hostPresent !== false;
      const totalActive = (nextHostPresent ? 1 : 0) + remainingViewers;
      const now = Date.now();
      const nextStatus: 'active' | 'empty' = totalActive === 0 ? 'empty' : 'active';
      const nextEmptySince = totalActive === 0 ? now : null;
      const nextClosesAt = totalActive === 0 ? now + EMPTY_ROOM_CLEANUP_MS : null;

      onUpdateStream?.({
        ...stream,
        numericViewers: remainingViewers,
        viewerCount: String(remainingViewers),
        hostPresent: nextHostPresent,
        status: nextStatus,
        emptySince: nextEmptySince,
        closesAt: nextClosesAt,
      });
      void liveAndRoomService.leaveLiveStream(stream.id, currentUser.id).catch(() => {});
      void leaveFirestoreLiveViewer(stream.id).catch(() => {});
      void syncFirestoreLiveStreamLifecycle(stream.id, {
        numericViewers: remainingViewers,
        ...(isActualHost ? { hostPresent: false } : {}),
        status: nextStatus,
        emptySince: nextEmptySince,
        closesAt: nextClosesAt,
      }).catch(() => {});
    };

    window.addEventListener('beforeunload', cleanupOnUnexpectedLiveExit);

    return () => {
      active = false;
      window.removeEventListener('beforeunload', cleanupOnUnexpectedLiveExit);
      clearInterval(heartbeat);
      if (entryTimerRef.current) clearTimeout(entryTimerRef.current);
      unsubscribeWs();
      unsubFsViewers();
      unsubFsComments();
      unsubFsStreamDoc();
      liveAndRoomService.unsubscribeLive();
      cleanupOnUnexpectedLiveExit();
    };
  }, [stream.id, currentUser.id, isActualHost]);

  // Allow minimized floating bar exit button to cleanly end/leave live stream
  const lastLiveExitSignalRef = useRef<number>(exitSignal);
  useEffect(() => {
    if (exitSignal > 0 && exitSignal !== lastLiveExitSignalRef.current) {
      lastLiveExitSignalRef.current = exitSignal;
      if (isActualHost) {
        hasExplicitlyLeftLiveRef.current = true;
        if (audioAnalyserControllerRef.current) {
          audioAnalyserControllerRef.current.cleanup();
          audioAnalyserControllerRef.current = null;
        }
        if (mediaStreamRef.current) {
          stopMediaStream(mediaStreamRef.current);
          mediaStreamRef.current = null;
        }
        webrtcMediaService.stopLive();
        void agoraRtcService.leaveChannel().catch(() => {});
        void releasePartyScreenWakeLock(`live_stream_${stream.id}_${currentUser.id}`);
        void setNativeLiveAudioMode(false);
        void Promise.all([
          leaveFirestoreLiveViewer(stream.id).catch(() => {}),
          liveAndRoomService.endLiveStream(stream.id, currentUser.id).catch(() => {}),
        ]).finally(() => {
          onEndLive?.(stream.id);
          onClose();
        });
      } else {
        void handleCleanLeaveLive();
      }
    }
  }, [exitSignal, isActualHost, stream.id, currentUser.id]);

  // Ensure remote audio unlocks automatically on first viewer interaction
  useEffect(() => {
    if (isActualHost || isMuted) return;
    const unlockLiveAudio = () => {
      agoraRtcService.resumeRemoteAudio();
    };
    window.addEventListener('pointerdown', unlockLiveAudio, { passive: true });
    window.addEventListener('touchstart', unlockLiveAudio, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockLiveAudio);
      window.removeEventListener('touchstart', unlockLiveAudio);
    };
  }, [isActualHost, isMuted]);

  // Web Camera & Realtime Microphone Initialization & Lifecycle (Returns acquired MediaStream)
  const startCamera = async (front = isFrontCamera): Promise<MediaStream | null> => {
    if (isAcquiringRef.current) return mediaStreamRef.current;
    isAcquiringRef.current = true;

    // Clean up previous stream and audio analyser safely
    if (audioAnalyserControllerRef.current) {
      audioAnalyserControllerRef.current.cleanup();
      audioAnalyserControllerRef.current = null;
    }
    if (mediaStreamRef.current) {
      stopMediaStream(mediaStreamRef.current);
      mediaStreamRef.current = null;
    }

    try {
      const result = await acquireRealDeviceCamera({
        isFront: front,
        enableAudio: true,
        idealWidth: 1280,
        idealHeight: 720,
      });

      mediaStreamRef.current = result.stream;
      setIsRealBackCamera(result.isRealBackCamera);
      setCameraLabel(result.label);

      result.stream.getAudioTracks().forEach((track) => {
        track.enabled = !isMicMuted;
      });

      if (videoElementRef.current) {
        videoElementRef.current.srcObject = result.stream;
        videoElementRef.current.play().catch(() => {});
      }

      if (result.hasAudio) {
        const controller = createAudioAnalyser(result.stream);
        audioAnalyserControllerRef.current = controller;
      }

      setHasWebcamStream(true);
      setCameraPermissionDenied(false);
      webrtcMediaService.updateLiveHostStream(result.stream);
      void agoraRtcService.replaceLocalVideoFromStream(result.stream).then((replaced) => {
        if (replaced && localPlayerContainerRef.current) {
          agoraRtcService.playLocalVideo(localPlayerContainerRef.current);
          setHasAgoraLocalVideo(true);
        }
      });
      liveAndRoomService.sendLiveMediaState(stream.id, currentUser.id, {
        isCameraOn: true,
        isMicMuted,
        isFrontCamera: front,
      });
      if (localPlayerContainerRef.current && agoraRtcService.getLocalVideoTrack()) {
        agoraRtcService.playLocalVideo(localPlayerContainerRef.current);
      }
      return result.stream;
    } catch (err: any) {
      console.warn('Real camera/mic acquisition error:', err);
      setHasWebcamStream(false);
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        setCameraPermissionDenied(true);
      }
      return null;
    } finally {
      isAcquiringRef.current = false;
    }
  };

  // Real-time microphone audio volume polling loop (0 - 100)
  useEffect(() => {
    let isSubscribed = true;
    const pollVolume = () => {
      if (!isSubscribed) return;
      if (audioAnalyserControllerRef.current && !isMicMuted) {
        const level = audioAnalyserControllerRef.current.getVolumeLevel();
        setAudioVolumeLevel(level);
      } else {
        setAudioVolumeLevel(0);
      }
      audioVolumeRafRef.current = requestAnimationFrame(pollVolume);
    };

    audioVolumeRafRef.current = requestAnimationFrame(pollVolume);

    return () => {
      isSubscribed = false;
      if (audioVolumeRafRef.current) {
        cancelAnimationFrame(audioVolumeRafRef.current);
      }
    };
  }, [isMicMuted]);

  // Ensure local video element rebinds when camera or front/rear state mounts
  useEffect(() => {
    if (videoElementRef.current && mediaStreamRef.current) {
      videoElementRef.current.srcObject = mediaStreamRef.current;
      videoElementRef.current.play().catch(() => {});
    }
  }, [hasWebcamStream, isCameraOn, isFrontCamera]);

  // Bind WebRTC remote MediaStream to viewer video element cleanly (rebinds across transport/camera switches)
  useEffect(() => {
    const videoEl = remoteWebRtcVideoRef.current;
    if (!videoEl || !remoteWebRtcStream) return;
    if (videoEl.srcObject !== remoteWebRtcStream) {
      videoEl.srcObject = remoteWebRtcStream;
    }
    videoEl.muted = isMutedRef.current;
    videoEl.play().catch(() => {
      // Browser autoplay blocked unmuted audio: fallback to muted playback + tap-to-unmute banner
      videoEl.muted = true;
      setAutoplayBlocked(true);
      setViewerSoundMuted(true);
      videoEl.play().catch(() => {});
    });
  }, [remoteWebRtcStream, mediaTransport, hasRemoteAgoraStream, remoteHostIsCameraOn]);

  // Re-attach Agora remote video track whenever container mounts or host toggles camera back ON
  useEffect(() => {
    if (isActualHost || mediaTransport !== 'agora' || !remoteHostIsCameraOn) return;
    const container = remotePlayerContainerRef.current;
    if (!container) return;
    const remoteHost = agoraRtcService.getRemoteHosts().find((h) => Boolean(h.videoTrack));
    if (remoteHost?.videoTrack) {
      agoraRtcService.playRemoteVideo(remoteHost.uid, container);
    }
  }, [isActualHost, mediaTransport, hasRemoteAgoraStream, remoteHostIsCameraOn]);

  // Automatically unlock viewer audio playback on first user tap/gesture anywhere on the live screen
  useEffect(() => {
    if (isActualHost) return;
    const unlockOnGesture = () => {
      if (isMutedRef.current && !autoplayBlocked) return;
      if (autoplayBlocked) {
        setIsMuted(false);
        setViewerSoundMuted(false);
        setAutoplayBlocked(false);
      }
      agoraRtcService.setSpeakerMuted(false);
      agoraRtcService.resumeRemoteAudio();
      const videoEl = remoteWebRtcVideoRef.current;
      if (videoEl && videoEl.srcObject) {
        videoEl.muted = false;
        videoEl.play().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', unlockOnGesture, { passive: true });
    window.addEventListener('touchstart', unlockOnGesture, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockOnGesture);
      window.removeEventListener('touchstart', unlockOnGesture);
    };
  }, [isActualHost, autoplayBlocked]);

  // Toggle Camera On / Off
  const handleToggleCamera = () => {
    if (isCameraOn) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getVideoTracks().forEach((t) => {
          t.enabled = false;
        });
      }
      setIsCameraOn(false);
      setHasWebcamStream(false);
      agoraRtcService.setCameraEnabled(false);
      liveAndRoomService.sendLiveMediaState(stream.id, currentUser.id, {
        isCameraOn: false,
        isMicMuted,
        isFrontCamera,
      });
      showToast('📷 Camera turned OFF (Audio Mode)');
    } else {
      setIsCameraOn(true);
      agoraRtcService.setCameraEnabled(true);
      if (mediaStreamRef.current && mediaStreamRef.current.getVideoTracks().length > 0) {
        mediaStreamRef.current.getVideoTracks().forEach((t) => {
          t.enabled = true;
        });
        setHasWebcamStream(true);
        if (videoElementRef.current) {
          videoElementRef.current.srcObject = mediaStreamRef.current;
          videoElementRef.current.play().catch(() => {});
        }
        liveAndRoomService.sendLiveMediaState(stream.id, currentUser.id, {
          isCameraOn: true,
          isMicMuted,
          isFrontCamera,
        });
      } else {
        void startCamera(isFrontCamera);
      }
      showToast('📹 Camera turned ON');
    }
  };

  // Toggle Microphone Mute / Unmute (Realtime Audio Control)
  const handleToggleMic = () => {
    const nextMuted = !isMicMuted;
    setIsMicMuted(nextMuted);

    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !nextMuted;
      });
    }

    agoraRtcService.setMicrophoneMuted(nextMuted);
    liveAndRoomService.sendLiveMediaState(stream.id, currentUser.id, {
      isCameraOn,
      isMicMuted: nextMuted,
      isFrontCamera,
    });

    if (nextMuted) {
      setAudioVolumeLevel(0);
      showToast('🔇 Microphone Muted (Realtime Off)');
    } else {
      showToast('🎙️ Microphone Active (Realtime On)');
    }
  };

  // Toggle Viewer Speaker Mute / Unmute (Controls BOTH Agora & WebRTC remote playback)
  const handleToggleViewerSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    setViewerSoundMuted(nextMuted);
    if (!nextMuted) {
      setAutoplayBlocked(false);
    }
    agoraRtcService.setSpeakerMuted(nextMuted);
    if (!nextMuted) {
      agoraRtcService.resumeRemoteAudio();
    }
    if (remoteWebRtcVideoRef.current) {
      remoteWebRtcVideoRef.current.muted = nextMuted;
      if (!nextMuted) {
        remoteWebRtcVideoRef.current.play().catch(() => {});
      }
    }
    showToast(nextMuted ? '🔇 Stream sound muted' : '🔊 Stream sound active');
  };

  const handleUnlockViewerAudio = () => {
    setIsMuted(false);
    setViewerSoundMuted(false);
    setAutoplayBlocked(false);
    agoraRtcService.setSpeakerMuted(false);
    agoraRtcService.resumeRemoteAudio();
    if (remoteWebRtcVideoRef.current) {
      remoteWebRtcVideoRef.current.muted = false;
      remoteWebRtcVideoRef.current.play().catch(() => {});
    }
    showToast('🔊 Live stream audio enabled');
  };

  // Flip Camera Front / Back (Rotate to Back Camera)
  const handleFlipCamera = async () => {
    if (isFlippingCamera || isAcquiringRef.current) return;
    setIsFlippingCamera(true);
    const nextFront = !isFrontCamera;
    setIsFrontCamera(nextFront);
    await startCamera(nextFront);
    await agoraRtcService.flipCamera();
    if (localPlayerContainerRef.current) {
      agoraRtcService.playLocalVideo(localPlayerContainerRef.current);
    }
    showToast(nextFront ? '🤳 Switched to Front Camera (Selfie)' : '📷 Switched to Back Camera (Rear)');
    setTimeout(() => setIsFlippingCamera(false), 500);
  };

  // Retry camera + mic permission acquisition and republish to active transport
  const handleRetryHostCamera = async () => {
    setCameraPermissionDenied(false);
    agoraRtcService.resetPermissionDeniedFlags();
    const newStream = await startCamera(isFrontCamera);
    if (!newStream) {
      showToast('Please allow Camera & Microphone permissions in settings');
      return;
    }
    // Always update standby/active WebRTC host stream so cross-platform viewers receive the new tracks
    webrtcMediaService.updateLiveHostStream(newStream);
    if (mediaTransportRef.current === 'agora') {
      try {
        await agoraRtcService.switchRole('host', {
          enableVideo: true,
          enableAudio: !isMicMuted,
          mediaStream: newStream,
        });
        if (localPlayerContainerRef.current && agoraRtcService.getLocalVideoTrack()) {
          agoraRtcService.playLocalVideo(localPlayerContainerRef.current);
          setHasAgoraLocalVideo(true);
        }
      } catch (err) {
        console.warn('[Live Media] Agora camera republish notice:', err);
        setHasAgoraLocalVideo(false);
      }
    } else {
      setHasAgoraLocalVideo(false);
    }
    showToast('Camera & microphone are now live');
  };

  // Unified Real-Time Live Media Engine (Dual-Transport Agora + Standby WebRTC Bridge for Cross-Platform Android ↔ Web)
  useEffect(() => {
    let isSubscribed = true;
    let hasAgoraTrack = false;
    let webrtcFallbackStarted = false;
    let agoraFallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const role = isActualHost && isHostMode ? 'host' : 'audience';
    setAgoraRole(role);
    setHasRemoteAgoraStream(false);
    setHasAgoraLocalVideo(false);
    setRemoteWebRtcStream(null);
    setAutoplayBlocked(false);

    const startWebRtcViewerFallback = () => {
      if (!isSubscribed || webrtcFallbackStarted || hasAgoraTrack) return;
      webrtcFallbackStarted = true;
      webrtcMediaService.startLiveViewer(
        stream.id,
        currentUser.id,
        stream.host.id,
        {
          onRemoteStream: (remoteStream) => {
            if (!isSubscribed) return;
            if (agoraFallbackTimer) {
              clearTimeout(agoraFallbackTimer);
              agoraFallbackTimer = null;
            }
            setMediaTransport('webrtc');
            setRemoteWebRtcStream(remoteStream);
            setHasRemoteAgoraStream(true);
            const hasActiveVideo = remoteStream
              .getVideoTracks()
              .some((t) => t.readyState === 'live' && t.enabled);
            setRemoteHostIsCameraOn(hasActiveVideo || remoteStream.getVideoTracks().length > 0);
            setAgoraConnected(true);
            setAgoraConnectionState('connected');
            // WebRTC delivered the real host feed first; release idle Agora channel cleanly
            agoraRtcService.leaveChannel().catch(() => {});
          },
          onStatusChange: (status) => {
            if (!isSubscribed || hasAgoraTrack) return;
            if (status === 'connected') {
              setAgoraConnected(true);
              setAgoraConnectionState('connected');
            } else if (status === 'connecting' || status === 'reconnecting') {
              setAgoraConnectionState('connecting');
            } else if (status === 'failed') {
              setAgoraConnectionState('error');
            }
          },
          onAutoplayBlocked: () => {
            if (!isSubscribed) return;
            setAutoplayBlocked(true);
            setViewerSoundMuted(true);
          },
        },
        currentUser
      );
    };

    const setupLiveMedia = async () => {
      try {
        setAgoraConnectionState('connecting');
        setMediaTransport('connecting');
        void setNativeLiveAudioMode(true);

        // 1. For Host: FIRST consume pre-acquired hardware stream handed off from CreateLiveScreen tap
        //    (avoids Android NotReadableError hardware camera lock and guarantees instant real camera feed!)
        let acquiredStream: MediaStream | null = mediaStreamRef.current;
        let effectiveCameraOn = isCameraOn;
        let effectiveFront = isFrontCamera;
        let effectiveMicMuted = isMicMuted;

        if (role === 'host' && !acquiredStream) {
          const staged = consumeStagedLiveStream();
          if (staged && staged.stream.getTracks().some((t) => t.readyState === 'live')) {
            acquiredStream = staged.stream;
            mediaStreamRef.current = staged.stream;
            effectiveCameraOn = staged.isCameraOn;
            effectiveFront = staged.isFront;
            effectiveMicMuted = !staged.isMicOn;

            setIsCameraOn(staged.isCameraOn);
            setIsFrontCamera(staged.isFront);
            setIsMicMuted(!staged.isMicOn);
            setCameraLabel(staged.label);
            setIsRealBackCamera(staged.isRealBackCamera);
            setHasWebcamStream(staged.isCameraOn && staged.stream.getVideoTracks().length > 0);
            setCameraPermissionDenied(false);

            if (videoElementRef.current && staged.isCameraOn) {
              videoElementRef.current.srcObject = staged.stream;
              videoElementRef.current.play().catch(() => {});
            }
            if (staged.hasAudio) {
              audioAnalyserControllerRef.current = createAudioAnalyser(staged.stream);
            }
          } else if (isCameraOn) {
            acquiredStream = await startCamera(isFrontCamera);
            if (!isSubscribed) return;
          }
        }

        const config = await agoraRtcService.getAgoraConfig();
        if (!isSubscribed) return;
        setAgoraConfig(config);

        if (config.configured && config.appId) {
          try {
            const tokenData = await agoraRtcService.requestRtcToken(
              stream.id,
              currentUser.id,
              role === 'host' ? 'broadcaster' : 'audience'
            );
            if (!isSubscribed) return;

            const canJoinAgora = Boolean(tokenData.token) || (tokenData.configured && tokenData.tokenRequired === false);
            if (canJoinAgora) {
              setMediaTransport('agora');
              await agoraRtcService.joinChannel({
                appId: config.appId,
                channelName: stream.id,
                userAccount: currentUser.id,
                role,
                token: tokenData.token,
                enableVideo: effectiveCameraOn && Boolean(acquiredStream || !cameraPermissionDenied),
                enableAudio: !effectiveMicMuted,
                isFront: effectiveFront,
                mediaStream: acquiredStream,
              });

              if (!isSubscribed) return;
              setAgoraConnected(true);
              setAgoraConnectionState('connected');

              if (agoraRtcService.getIsCameraPermissionDenied()) {
                setCameraPermissionDenied(true);
              }

              if (role === 'host') {
                if (localPlayerContainerRef.current && agoraRtcService.getLocalVideoTrack()) {
                  agoraRtcService.playLocalVideo(localPlayerContainerRef.current);
                  setHasAgoraLocalVideo(true);
                }
                // Dual-Transport Bridge: also run WebRTC Host in standby so WebRTC-only viewers still receive video + audio
                webrtcMediaService.startLiveHost(stream.id, currentUser.id, acquiredStream);
              } else if (role === 'audience') {
                const existingHost =
                  agoraRtcService.getRemoteHosts().find((h) => String(h.uid) === String(stream.host.id)) ||
                  agoraRtcService.getRemoteHosts()[0];
                if (existingHost && (existingHost.videoTrack || existingHost.audioTrack)) {
                  hasAgoraTrack = true;
                  if (existingHost.videoTrack && remotePlayerContainerRef.current) {
                    agoraRtcService.playRemoteVideo(existingHost.uid, remotePlayerContainerRef.current);
                    setHasRemoteAgoraStream(true);
                  }
                  if (existingHost.audioTrack) {
                    setHasRemoteAgoraStream(true);
                    if (!isMutedRef.current) {
                      try {
                        existingHost.audioTrack.play();
                      } catch {
                        setAutoplayBlocked(true);
                        setViewerSoundMuted(true);
                      }
                    }
                  }
                  setRemoteHostIsCameraOn(existingHost.hasVideo);
                } else {
                  // Watchdog: if host is broadcasting via WebRTC fallback, bridge automatically after 4s
                  agoraFallbackTimer = setTimeout(() => {
                    if (isSubscribed && !hasAgoraTrack) {
                      startWebRtcViewerFallback();
                    }
                  }, 4000);
                }
              }
              return;
            }
          } catch (agoraErr: any) {
            if ((agoraErr as Error)?.message === 'AGORA_JOIN_SUPERSEDED' || !isSubscribed) return;
            console.warn('[Live Media] Agora connection failed, falling back to real-time WebRTC:', agoraErr?.message || agoraErr);
            await agoraRtcService.leaveChannel(stream.id).catch(() => {});
          }
        }

        if (!isSubscribed) return;

        // 2. Real-Time WebRTC Signaling Fallback over Firestore + /ws
        setHasAgoraLocalVideo(false);
        setMediaTransport('webrtc');
        if (role === 'host') {
          webrtcMediaService.startLiveHost(stream.id, currentUser.id, acquiredStream);
          setAgoraConnected(true);
          setAgoraConnectionState('connected');
        } else {
          startWebRtcViewerFallback();
        }
      } catch (err: any) {
        console.warn('[Live Media] Connection notice:', err?.message || err);
        if (isSubscribed) setAgoraConnectionState('error');
      }
    };

    setupLiveMedia();

    const unsubAgoraStatus = agoraRtcService.onStatusChange((status) => {
      if (!isSubscribed || mediaTransportRef.current !== 'agora') return;
      if (status.channelName && status.channelName !== stream.id) return;
      if (status.state === 'CONNECTED') {
        setAgoraConnected(true);
        setAgoraConnectionState('connected');
      } else if (status.state === 'CONNECTING' || status.state === 'RECONNECTING') {
        setAgoraConnectionState('connecting');
      } else if (status.state === 'DISCONNECTED' || status.state === 'DISCONNECTING') {
        setAgoraConnected(false);
        setAgoraConnectionState('idle');
      }
    });

    const unsubRemote = agoraRtcService.onRemoteTrack((remoteHost) => {
      if (!isSubscribed || agoraRtcService.getCurrentChannel() !== stream.id) return;
      try {
        if (remoteHost.videoTrack || remoteHost.audioTrack) {
          hasAgoraTrack = true;
          if (agoraFallbackTimer) {
            clearTimeout(agoraFallbackTimer);
            agoraFallbackTimer = null;
          }
          if (webrtcFallbackStarted) {
            webrtcMediaService.stopLive();
            webrtcFallbackStarted = false;
          }
          setMediaTransport('agora');
          setAgoraConnected(true);
          setAgoraConnectionState('connected');
        }
        if (remoteHost.videoTrack && remotePlayerContainerRef.current) {
          agoraRtcService.playRemoteVideo(remoteHost.uid, remotePlayerContainerRef.current);
          setHasRemoteAgoraStream(true);
        }
        if (remoteHost.audioTrack) {
          // Audio-only streams still count as connected remote broadcast!
          setHasRemoteAgoraStream(true);
          if (!isMutedRef.current) {
            try {
              remoteHost.audioTrack.play();
            } catch {
              setAutoplayBlocked(true);
              setViewerSoundMuted(true);
            }
          }
        }
        setRemoteHostIsCameraOn(remoteHost.hasVideo);
      } catch (e) {
        console.warn('[Agora Solo Live] Play remote track warning:', e);
      }
    });

    const unsubAutoplay = agoraRtcService.onAutoplayBlocked(() => {
      if (!isSubscribed) return;
      setAutoplayBlocked(true);
      setViewerSoundMuted(true);
    });

    const unsubUserLeft = agoraRtcService.onUserLeft((leftUid) => {
      if (!isSubscribed) return;
      // Only handle host leaving; never disconnect when another viewer leaves!
      if (String(leftUid) === String(stream.host.id) && !isActualHost && mediaTransportRef.current === 'agora') {
        hasAgoraTrack = false;
        setHasRemoteAgoraStream(false);
        showToast('Host temporarily disconnected from media stream');
      }
    });

    return () => {
      isSubscribed = false;
      if (agoraFallbackTimer) {
        clearTimeout(agoraFallbackTimer);
        agoraFallbackTimer = null;
      }
      unsubAgoraStatus();
      unsubRemote();
      unsubAutoplay();
      unsubUserLeft();
      webrtcMediaService.stopLive();
      agoraRtcService.leaveChannel(stream.id).catch(() => {});
      void setNativeLiveAudioMode(false);
      if (audioAnalyserControllerRef.current) {
        audioAnalyserControllerRef.current.cleanup();
        audioAnalyserControllerRef.current = null;
      }
      if (mediaStreamRef.current) {
        stopMediaStream(mediaStreamRef.current);
        mediaStreamRef.current = null;
      }
    };
  }, [stream.id, currentUser.id, isActualHost, isHostMode]);

  // Subscribe to PK real-time match events
  useEffect(() => {
    if (!activePKSession) return;

    pkService.subscribeToMatch(activePKSession.id);

    const updateTimer = () => {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((activePKSession.endTime - now) / 1000));
      setSecondsRemaining(left);
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);

    const unsubscribe = pkService.addEventListener((event, payload) => {
      if (event === 'pk:likes_updated' && payload?.likeEvent) {
        triggerHeartAnimation(
          payload.likeEvent.x || 50,
          payload.likeEvent.y || 50,
          payload.likeEvent.recipientId === activePKSession.host1.user.id ? 'left' : 'right'
        );
      } else if (event === 'pk:gift_dropped' && payload?.giftEvent) {
        showToast(`🎁 ${payload.giftEvent.sender.name} sent ${payload.giftEvent.quantity}x ${payload.giftEvent.gift.name} (+${payload.giftEvent.points} pts)!`);
      }
    });

    return () => {
      clearInterval(timerInterval);
      unsubscribe();
      pkService.unsubscribeFromMatch();
    };
  }, [activePKSession?.id, activePKSession?.endTime]);

  // Auto scroll chat to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Triggers the large, premium animated double-tap heart with particle stars
  const triggerHeartAnimation = (xPercent: number, yPercent: number, side: 'left' | 'right') => {
    const id = Date.now() + Math.random();
    const colors = ['#F328D5', '#8B20FF', '#FFC84A', '#EC4899', '#06B6D4', '#EF4444'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const rotation = (Math.random() - 0.5) * 28; // -14 to +14 deg

    const particles: BurstParticle[] = Array.from({ length: 6 }).map((_, i) => {
      const angle = (i * 60 + (Math.random() - 0.5) * 25) * (Math.PI / 180);
      const dist = 35 + Math.random() * 32;
      return {
        id: i,
        burstX: Math.cos(angle) * dist,
        burstY: Math.sin(angle) * dist,
        color: colors[i % colors.length],
        size: 4 + Math.random() * 4,
      };
    });

    setBurstHearts((prev) => [
      ...prev,
      { id, x: xPercent, y: yPercent, color: randomColor, hostSide: side, rotation, particles }
    ]);

    setTimeout(() => {
      setBurstHearts((prev) => prev.filter((h) => h.id !== id));
    }, 1300);
  };

  // Universal Double-Tap Gesture Handler across live video viewing area
  const handleAreaPointerDown = (e: React.PointerEvent<HTMLDivElement>, side: 'left' | 'right' = 'left') => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('form')) {
      return;
    }

    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const prev = lastTapRef.current;
    const dist = Math.hypot(clientX - prev.x, clientY - prev.y);

    if (now - prev.time < 380 && dist < 70 && prev.side === side) {
      lastTapRef.current = { time: 0, x: 0, y: 0, side: '' };
      const xPercent = Math.max(8, Math.min(92, ((clientX - rect.left) / rect.width) * 100));
      const yPercent = Math.max(10, Math.min(88, ((clientY - rect.top) / rect.height) * 100));

      triggerHeartAnimation(xPercent, yPercent, side);
      const nextLikesOptimistic = streamLikes + 1;
      setStreamLikes(nextLikesOptimistic);
      void updateFirestoreLiveLikes(stream.id, nextLikesOptimistic);
      liveAndRoomService
        .sendLiveHeart(stream.id, currentUser.id, 1, {
          host: stream.host,
          title: stream.title,
          category: stream.category,
        })
        .then((nextTotal) => {
          if (nextTotal > 0) setStreamLikes((prev) => Math.max(prev, nextTotal));
        });

      if (activePKSession) {
        const targetHostId = side === 'left' ? activePKSession.host1.user.id : activePKSession.host2.user.id;
        pkService.sendPKLike(activePKSession.id, targetHostId, 1, xPercent, yPercent);
      }
    } else {
      lastTapRef.current = { time: now, x: clientX, y: clientY, side };
    }
  };

  // One-tap Heart / Like interaction button (works seamlessly across Web & Android)
  const handleQuickHeart = () => {
    if (!isActualHost && blockedByUserIdsRef.current.has(stream.host.id)) {
      showToast('You cannot interact with this live stream.');
      return;
    }
    const xPercent = 65 + Math.random() * 20;
    const yPercent = 58 + Math.random() * 18;
    triggerHeartAnimation(xPercent, yPercent, 'left');
    const nextLikesOptimistic = streamLikes + 1;
    setStreamLikes(nextLikesOptimistic);
    void updateFirestoreLiveLikes(stream.id, nextLikesOptimistic);
    liveAndRoomService
      .sendLiveHeart(stream.id, currentUser.id, 1, {
        host: stream.host,
        title: stream.title,
        category: stream.category,
      })
      .then((nextTotal) => {
        if (nextTotal > 0) setStreamLikes((prev) => Math.max(prev, nextTotal));
      });
    if (activePKSession) {
      pkService.sendPKLike(activePKSession.id, activePKSession.host1.user.id, 1, xPercent, yPercent);
    }
  };

  // Send Message (Firestore-first for instant cross-platform Web ↔ Android delivery + parallel Express mirror with shared ID)
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend) return;

    if (!isActualHost && blockedByUserIdsRef.current.has(stream.host.id)) {
      showToast('You cannot interact with this live stream.');
      return;
    }

    setInputMessage('');
    setShowEmojiPicker(false);

    const msgId = `cm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMsg: ChatMessage = {
      id: msgId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text: textToSend,
      timestamp: 'Now',
      isHost: isActualHost,
    };

    // Instant local echo so chat responds immediately
    setMessages((prev) => (prev.some((m) => m.id === msgId) ? prev : [...prev.slice(-79), optimisticMsg]));

    const streamMeta = {
      host: stream.host,
      title: stream.title,
      category: stream.category,
    };

    const [fsResult, backendResult] = await Promise.all([
      sendFirestoreLiveComment(stream.id, currentUser, textToSend, isActualHost, msgId).catch(() => null),
      liveAndRoomService
        .sendLiveComment(stream.id, currentUser, textToSend, msgId, streamMeta)
        .catch((err: any) => {
          const errMsg = String(err?.message || err || '');
          if (/block|403|forbidden/i.test(errMsg)) {
            return { blocked: true as const };
          }
          return null;
        }),
    ]);

    if (backendResult && 'blocked' in backendResult) {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      showToast('You are blocked from commenting in this live stream.');
      return;
    }

    if (!fsResult && !backendResult) {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      showToast('Could not send message. Please check your connection.');
      setInputMessage(textToSend);
    }
  };

  // Host Pins a Message
  const handlePinMessage = (text: string) => {
    setPinnedMessage(text);
    showToast('Pinned to live chat');
  };

  const handleSendEmoji = (emoji: string) => {
    setInputMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Format seconds into MM:SS
  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // PK Scoring calculations
  const host1 = activePKSession?.host1;
  const host2 = activePKSession?.host2;
  const totalScore = (host1?.score || 0) + (host2?.score || 0) || 1;
  const percent1 = Math.round(((host1?.score || 0) / totalScore) * 100);
  const percent2 = 100 - percent1;
  const leadingSide = (host1?.score || 0) > (host2?.score || 0) ? 'left' : (host2?.score || 0) > (host1?.score || 0) ? 'right' : 'tie';

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  return (
    <div className="relative w-full h-dvh-screen bg-black overflow-hidden flex flex-col justify-between select-none animate-fade-in font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-[calc(var(--safe-top)+6.25rem)] left-1/2 -translate-x-1/2 z-50 bg-[#8B20FF] text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg shadow-[#8B20FF]/50 animate-fade-in pointer-events-none flex items-center gap-1.5 border border-white/20 max-w-[90vw] text-center">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Forfeit PK Confirmation Modal */}
      {showForfeitConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#160C25] border border-red-500/30 p-5 rounded-3xl text-center space-y-4">
            <h4 className="text-base font-bold text-white">Forfeit PK Battle?</h4>
            <p className="text-xs text-[#B9AECF]">
              Forfeiting will immediately award victory to the opposing host. Are you sure?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowForfeitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowForfeitConfirm(false);
                  onForfeitPK?.();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Confirm Forfeit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Host End Live Broadcast Confirmation Modal */}
      {showEndLiveConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#160C25] border border-white/15 p-6 rounded-3xl text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/35 text-rose-400 flex items-center justify-center mx-auto">
              <X className="w-7 h-7 stroke-[2.5]" />
            </div>
            <h4 className="text-lg font-black text-white font-display">End Live Broadcast?</h4>
            <p className="text-xs text-[#B9AECF]">
              Your camera & mic will turn off, your live card will be removed immediately, and viewers will be returned home.
            </p>

            <div className="grid grid-cols-3 gap-2 bg-[#090611] p-3 rounded-2xl border border-white/10 text-left">
              <div>
                <span className="text-[10px] text-[#B9AECF]">Duration</span>
                <p className="text-xs font-bold text-white font-mono">{formatDuration(streamSeconds)}</p>
              </div>
              <div>
                <span className="text-[10px] text-[#B9AECF]">Viewers</span>
                <p className="text-xs font-bold text-[#06B6D4] font-mono">{liveViewerCount.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] text-[#B9AECF]">Likes</span>
                <p className="text-xs font-bold text-rose-400 font-mono">{streamLikes.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  setShowEndLiveConfirm(false);
                  hasExplicitlyLeftLiveRef.current = true;
                  if (audioAnalyserControllerRef.current) {
                    audioAnalyserControllerRef.current.cleanup();
                    audioAnalyserControllerRef.current = null;
                  }
                  if (mediaStreamRef.current) {
                    stopMediaStream(mediaStreamRef.current);
                    mediaStreamRef.current = null;
                  }
                  webrtcMediaService.stopLive();
                  await agoraRtcService.leaveChannel().catch(() => {});
                  void setNativeLiveAudioMode(false);
                  await Promise.all([
                    leaveFirestoreLiveViewer(stream.id).catch(() => {}),
                    liveAndRoomService.endLiveStream(stream.id, currentUser.id).catch(() => {}),
                  ]);
                  onEndLive?.(stream.id);
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:opacity-90 text-white text-xs font-extrabold shadow-lg shadow-red-600/30 transition-all"
              >
                End Broadcast Now
              </button>
              {onMinimize && (
                <button
                  type="button"
                  onClick={() => {
                    setShowEndLiveConfirm(false);
                    onMinimize();
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#00D4FF]/15 hover:bg-[#00D4FF]/25 border border-[#00D4FF]/40 text-cyan-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Minimize Live (Stay Connected)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowEndLiveConfirm(false)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
              >
                Continue Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paginated Live Viewer Info Modal */}
      {showViewersModal && (
        <div
          onClick={() => setShowViewersModal(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#160C25] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col max-h-[75vh]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>Live Viewers ({viewersTotalCount.toLocaleString()})</span>
                </h3>
                <p className="text-[10px] text-[#B9AECF]">Real-time connected audience & host</p>
              </div>
              <button
                onClick={() => setShowViewersModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto no-scrollbar flex-1 py-1">
              {viewersLoading && viewersList.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#B9AECF]">Loading live viewers...</div>
              ) : viewersList.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#B9AECF]">No active viewers right now.</div>
              ) : (
                viewersList.map((viewer) => (
                  <div
                    key={viewer.userId}
                    onClick={() => {
                      setShowViewersModal(false);
                      onSelectUser({
                        id: viewer.userId,
                        displayId: viewer.userId.slice(-6).toUpperCase(),
                        name: viewer.name,
                        username: viewer.username || `@${viewer.name.toLowerCase().replace(/\s+/g, '')}`,
                        avatar: viewer.avatar,
                        bio: '',
                        level: viewer.level || 1,
                        vipLevel: viewer.vipLevel || 0,
                        isVIP: Boolean(viewer.isVIP),
                        fansCount: '0',
                        followingCount: 0,
                        likesCount: '0',
                        coins: 0,
                        diamonds: 0,
                      });
                    }}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-[#201136] border border-white/5 hover:border-[#F328D5]/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {viewer.avatar ? (
                        <img
                          src={viewer.avatar}
                          alt={viewer.name}
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-white/20 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#8B20FF] text-white text-xs font-black flex items-center justify-center shrink-0">
                          {(viewer.name || 'V').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">{viewer.name}</span>
                          {viewer.isHost && (
                            <span className="px-1.5 py-0.2 rounded bg-[#FFC84A] text-black text-[9px] font-black">
                              HOST
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#B9AECF] truncate block">
                          {viewer.username || `@${viewer.userId.slice(0, 8)}`}
                        </span>
                      </div>
                    </div>
                    <LevelBadge level={viewer.level || 1} size="sm" />
                  </div>
                ))
              )}

              {viewersHasMore && (
                <button
                  onClick={() => loadLiveViewers(viewersPage + 1, true)}
                  disabled={viewersLoading}
                  className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white"
                >
                  {viewersLoading ? 'Loading...' : 'Load More Viewers'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Video Arena: Either TikTok-Style PK Battle Arena OR Solo Live with Real Camera */}
      {activePKSession && host1 && host2 ? (
        /* ========================================================
           TIKTOK-STYLE PK BATTLE ARENA (Side-by-Side 50/50 Split)
           ======================================================== */
        <div className="absolute inset-0 z-0 flex flex-row bg-[#090611] overflow-hidden select-none">
          {/* Vertical Middle Laser Divider */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-gradient-to-b from-transparent via-[#FF0050] to-[#00F2FE] z-20 shadow-[0_0_12px_#FF0050]" />

          {/* ========================================================
              LEFT HOST PANEL (Host 1 / Team Cyan / Team Blue #00F2FE)
             ======================================================== */}
          <div 
            onPointerDown={(e) => handleAreaPointerDown(e, 'left')}
            className="relative w-1/2 h-full overflow-hidden border-r border-[#00F2FE]/30 cursor-pointer group select-none touch-manipulation"
          >
            {isCameraOn && hasWebcamStream ? (
              <video
                ref={videoElementRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isFrontCamera ? '-scale-x-100' : ''} ${VIDEO_FILTERS[activeFilter].css}`}
              />
            ) : !isCameraOn ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#130924] p-4 text-center">
                <AvatarWithFrame
                  avatar={host1.user.avatar}
                  name={host1.user.name}
                  level={host1.user.level || 40}
                  size="lg"
                />
                <span className="mt-2 text-xs font-bold text-rose-400 flex items-center gap-1">
                  <CameraOff className="w-3.5 h-3.5" /> Camera OFF
                </span>
              </div>
            ) : (
              <img
                src={host1.user.coverImage || stream.coverImage}
                alt={host1.user.name}
                referrerPolicy="no-referrer"
                className={`w-full h-full object-cover filter brightness-95 pointer-events-none ${VIDEO_FILTERS[activeFilter].css}`}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60 pointer-events-none" />

            {/* Host 1 Name & Live Score (TikTok Style) */}
            <div className="absolute top-24 left-2.5 z-20 flex flex-col pointer-events-none">
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-[#00F2FE]/40 w-fit">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-[#00F2FE]">
                  <img src={host1.user.avatar} alt={host1.user.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-[11px] font-black text-white truncate max-w-[70px]">
                  {host1.user.name.split(' ')[0]}
                </span>
                <span className="text-[11px] text-[#00F2FE] font-mono font-black">
                  {host1.score.toLocaleString()}
                </span>
              </div>

              {/* TikTok WINNING / LOSING status badge */}
              <div className="mt-1">
                {leadingSide === 'left' ? (
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-black text-[9px] font-black uppercase tracking-wider shadow-md animate-pulse">
                    🔥 WINNING (+{Math.abs(host1.score - host2.score).toLocaleString()})
                  </span>
                ) : leadingSide === 'right' ? (
                  <span className="px-2 py-0.5 rounded-full bg-black/60 border border-white/20 text-white/70 text-[9px] font-bold uppercase tracking-wider">
                    DEFEND 🛡️
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-bold uppercase">
                    TIED ⚔️
                  </span>
                )}
              </div>

              {/* Team Cyan Badge */}
              <div className="mt-1">
                <span className="px-2 py-0.5 rounded-full bg-[#00F2FE]/15 border border-[#00F2FE]/40 text-[#00F2FE] text-[9px] font-bold">
                  Team Blue
                </span>
              </div>
            </div>

            {/* Quick Support Host 1 Button */}
            <div className="absolute bottom-20 left-2.5 z-20">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  pkService.sendPKGift(activePKSession.id, currentUser, host1.user.id, {
                    id: 'gift_rose',
                    name: 'Rose',
                    icon: '🌹',
                    coins: 5,
                    category: 'Popular',
                    imageColor: 'from-rose-500 to-red-600',
                    animationType: 'pop'
                  }, 1);
                  showToast(`Sent Rose to ${host1.user.name}! 🌹`);
                }}
                className="px-2.5 py-1 rounded-full bg-[#00F2FE]/25 hover:bg-[#00F2FE]/40 border border-[#00F2FE]/60 text-[#00F2FE] hover:text-white text-[10px] font-black flex items-center gap-1 shadow-md backdrop-blur-md active:scale-95 transition-all"
              >
                <span>🌹</span>
                <span>Support</span>
              </button>
            </div>

            {/* Large Burst Hearts for Left Host */}
            {burstHearts
              .filter((h) => h.hostSide === 'left')
              .map((heart) => (
                <div
                  key={heart.id}
                  className="absolute pointer-events-none z-30 select-none animate-double-tap-heart"
                  style={{ left: `${heart.x}%`, top: `${heart.y}%` }}
                >
                  <div className="relative flex items-center justify-center">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-14 h-14 filter drop-shadow-[0_0_15px_#00F2FE]"
                      style={{ transform: `rotate(${heart.rotation}deg)` }}
                    >
                      <path
                        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        fill="#00F2FE"
                        stroke="#FFFFFF"
                        strokeWidth="0.8"
                      />
                    </svg>
                    <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full bg-[#00F2FE] text-black text-[9px] font-black font-mono shadow-md">
                      +1
                    </span>
                  </div>
                </div>
              ))}
          </div>

          {/* ========================================================
              RIGHT HOST PANEL (Host 2 / Team Red / Magenta #FE2C55)
             ======================================================== */}
          <div 
            onPointerDown={(e) => handleAreaPointerDown(e, 'right')}
            className="relative w-1/2 h-full overflow-hidden border-l border-[#FE2C55]/30 cursor-pointer group select-none touch-manipulation"
          >
            <img
              src={host2.user.coverImage || host2.user.avatar}
              alt={host2.user.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover filter brightness-95 pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60 pointer-events-none" />

            {/* Host 2 Name & Live Score (TikTok Style) */}
            <div className="absolute top-24 right-2.5 z-20 flex flex-col items-end pointer-events-none">
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-[#FE2C55]/40 w-fit">
                <span className="text-[11px] text-[#FE2C55] font-mono font-black">
                  {host2.score.toLocaleString()}
                </span>
                <span className="text-[11px] font-black text-white truncate max-w-[70px]">
                  {host2.user.name.split(' ')[0]}
                </span>
                <div className="w-6 h-6 rounded-full overflow-hidden border border-[#FE2C55]">
                  <img src={host2.user.avatar} alt={host2.user.name} className="w-full h-full object-cover" />
                </div>
              </div>

              {/* TikTok WINNING / LOSING status badge */}
              <div className="mt-1">
                {leadingSide === 'right' ? (
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-black text-[9px] font-black uppercase tracking-wider shadow-md animate-pulse">
                    🔥 WINNING (+{Math.abs(host2.score - host1.score).toLocaleString()})
                  </span>
                ) : leadingSide === 'left' ? (
                  <span className="px-2 py-0.5 rounded-full bg-black/60 border border-white/20 text-white/70 text-[9px] font-bold uppercase tracking-wider">
                    DEFEND 🛡️
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-bold uppercase">
                    TIED ⚔️
                  </span>
                )}
              </div>

              {/* Team Red Badge */}
              <div className="mt-1">
                <span className="px-2 py-0.5 rounded-full bg-[#FE2C55]/15 border border-[#FE2C55]/40 text-[#FE2C55] text-[9px] font-bold">
                  Team Red
                </span>
              </div>
            </div>

            {/* Quick Support Host 2 Button */}
            <div className="absolute bottom-20 right-2.5 z-20">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  pkService.sendPKGift(activePKSession.id, currentUser, host2.user.id, {
                    id: 'gift_rose',
                    name: 'Rose',
                    icon: '🌹',
                    coins: 5,
                    category: 'Popular',
                    imageColor: 'from-rose-500 to-red-600',
                    animationType: 'pop'
                  }, 1);
                  showToast(`Sent Rose to ${host2.user.name}! 🌹`);
                }}
                className="px-2.5 py-1 rounded-full bg-[#FE2C55]/25 hover:bg-[#FE2C55]/40 border border-[#FE2C55]/60 text-[#FE2C55] hover:text-white text-[10px] font-black flex items-center gap-1 shadow-md backdrop-blur-md active:scale-95 transition-all"
              >
                <span>🌹</span>
                <span>Support</span>
              </button>
            </div>

            {/* Large Burst Hearts for Right Host */}
            {burstHearts
              .filter((h) => h.hostSide === 'right')
              .map((heart) => (
                <div
                  key={heart.id}
                  className="absolute pointer-events-none z-30 select-none animate-double-tap-heart"
                  style={{ left: `${heart.x}%`, top: `${heart.y}%` }}
                >
                  <div className="relative flex items-center justify-center">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-14 h-14 filter drop-shadow-[0_0_15px_#FE2C55]"
                      style={{ transform: `rotate(${heart.rotation}deg)` }}
                    >
                      <path
                        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        fill="#FE2C55"
                        stroke="#FFFFFF"
                        strokeWidth="0.8"
                      />
                    </svg>
                    <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full bg-[#FE2C55] text-white text-[9px] font-black font-mono shadow-md">
                      +1
                    </span>
                  </div>
                </div>
              ))}
          </div>

          {/* ========================================================
              TIKTOK TUG-OF-WAR PROGRESS BAR ACROSS TOP
             ======================================================== */}
          <div className="absolute top-[calc(var(--safe-top)+6.5rem)] left-3 right-3 z-30 pointer-events-none">
            {/* Center Battle Timer & Glowing VS Emblem */}
            <div className="flex items-center justify-center mb-1">
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white font-mono text-[11px] font-black shadow-xl">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-red-400">PK ⏱️</span>
                <span>{minutes}:{seconds < 10 ? `0${seconds}` : seconds}</span>
              </div>
            </div>

            {/* Continuous Tug of War Bar */}
            <div className="relative w-full h-3.5 rounded-full bg-black/70 p-[2px] border border-white/20 flex shadow-2xl overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00F2FE] via-[#06B6D4] to-[#2563EB] rounded-l-full transition-all duration-300 ease-out shadow-[0_0_12px_#00F2FE]"
                style={{ width: `${percent1}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-[#F59E0B] via-[#FE2C55] to-[#EF4444] rounded-r-full transition-all duration-300 ease-out shadow-[0_0_12px_#FE2C55]"
                style={{ width: `${percent2}%` }}
              />

              {/* Electric Center Spark on the bar */}
              <div 
                className="absolute top-0 bottom-0 w-3 -ml-1.5 bg-white rounded-full shadow-[0_0_8px_#FFFFFF] z-10 animate-pulse"
                style={{ left: `${percent1}%` }}
              />
            </div>

            {/* Score Percentage Labels */}
            <div className="flex justify-between items-center text-[10px] font-mono font-black mt-0.5 px-1">
              <span className="text-[#00F2FE]">{percent1}%</span>
              <span className="text-white/60 text-[9px] uppercase tracking-widest font-display">⚔️ TikTok Live Battle ⚔️</span>
              <span className="text-[#FE2C55]">{percent2}%</span>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================
           SOLO LIVE STREAM WITH REAL CAMERA FEED
           ======================================================== */
        <div 
          onPointerDown={(e) => handleAreaPointerDown(e, 'left')}
          className="absolute inset-0 z-0 cursor-pointer overflow-hidden select-none touch-manipulation"
        >
          {isActualHost && isHostMode ? (
            /* ========================================================
               HOST PERSPECTIVE: Real Device Camera Preview
               ======================================================== */
            isCameraOn ? (
              <div className="relative w-full h-full">
                {/* Agora Local Video Container & Direct Hardware Camera Stream */}
                <div
                  ref={localPlayerContainerRef}
                  className={`w-full h-full object-cover [&>div]:w-full [&>div]:h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover ${
                    mediaTransport === 'agora' && hasAgoraLocalVideo
                      ? 'opacity-100'
                      : 'opacity-0 pointer-events-none'
                  }`}
                />
                <video
                  ref={videoElementRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-all absolute inset-0 ${isFrontCamera ? '-scale-x-100' : 'scale-x-100'} ${VIDEO_FILTERS[activeFilter].css} ${
                    hasWebcamStream && !(mediaTransport === 'agora' && hasAgoraLocalVideo)
                      ? 'opacity-100'
                      : 'opacity-0 pointer-events-none'
                  }`}
                />

                {hasWebcamStream && (
                  <div className="absolute top-[calc(var(--safe-top)+6.75rem)] right-3 sm:right-4 z-20 flex flex-col items-end gap-1.5 pointer-events-auto">
                    {/* Real Device Camera Mode & Instant Rotate Button */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-emerald-500/40 text-emerald-400 text-[11px] font-bold shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>
                        {mediaTransport === 'agora'
                          ? 'Live HD'
                          : isFrontCamera
                            ? 'Front Camera'
                            : 'Back Camera'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFlipCamera();
                        }}
                        disabled={isFlippingCamera}
                        className="ml-1 p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-transform active:scale-90"
                        title="Rotate between Front and Back Camera"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFlippingCamera ? 'animate-spin' : ''}`} />
                      </button>
                      {activeFilter !== 'normal' && (
                        <span className="text-[#FFC84A] font-mono ml-0.5">[{VIDEO_FILTERS[activeFilter].label}]</span>
                      )}
                    </div>

                    {/* Realtime Microphone Waveform & Volume Indicator */}
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md border text-[11px] font-bold shadow-lg transition-all ${
                      isMicMuted
                        ? 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                        : audioVolumeLevel > 8
                          ? 'bg-black/80 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                          : 'bg-black/70 border-white/15 text-white/90'
                    }`}>
                      {isMicMuted ? (
                        <>
                          <MicOff className="w-3.5 h-3.5 text-rose-400" />
                          <span>Mic Muted</span>
                        </>
                      ) : (
                        <>
                          <Mic className={`w-3.5 h-3.5 ${audioVolumeLevel > 8 ? 'text-emerald-400 animate-pulse' : 'text-emerald-400/80'}`} />
                          {/* Animated 4 Equalizer Bars driven by REAL audio volume */}
                          <div className="flex items-end gap-0.5 h-3">
                            <span 
                              className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                              style={{ height: `${Math.max(3, Math.min(12, 3 + (audioVolumeLevel * 0.12)))}px` }} 
                            />
                            <span 
                              className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                              style={{ height: `${Math.max(4, Math.min(12, 4 + (audioVolumeLevel * 0.18)))}px` }} 
                            />
                            <span 
                              className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                              style={{ height: `${Math.max(5, Math.min(12, 5 + (audioVolumeLevel * 0.22)))}px` }} 
                            />
                            <span 
                              className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                              style={{ height: `${Math.max(3, Math.min(12, 3 + (audioVolumeLevel * 0.14)))}px` }} 
                            />
                          </div>
                          <span className="font-mono text-[10px] text-emerald-400">
                            {audioVolumeLevel > 8 ? 'Speaking...' : 'Realtime Mic ON'}
                          </span>
                          {audioVolumeLevel > 0 && (
                            <span className="font-mono text-[9px] text-[#FFC84A]">
                              {audioVolumeLevel}%
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* If camera is not yet acquired or permission was denied */}
                {!hasWebcamStream && (
                  <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#140D24] via-[#090611] to-[#040208] z-10">
                    <div className="w-20 h-20 rounded-full bg-[#FA26A0]/20 border-2 border-[#FA26A0] flex items-center justify-center text-4xl mb-4 shadow-[0_0_35px_rgba(250,38,160,0.6)] animate-pulse">
                      {cameraPermissionDenied ? '🎙️' : '📹'}
                    </div>
                    <h3 className="text-lg font-black text-white text-center font-display">
                      {cameraPermissionDenied ? 'Live in Audio Mode (Camera Blocked)' : 'Device Camera Studio'}
                    </h3>
                    <p className="text-xs text-[#9E97AA] text-center max-w-xs mt-1.5 mb-5 leading-relaxed">
                      {cameraPermissionDenied
                        ? 'Camera access was blocked in browser settings. Your stream is active with real microphone audio & avatar. Tap below to retry or allow camera.'
                        : 'Your real camera and microphone will be broadcast to all viewers in real time via Agora RTC.'}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleRetryHostCamera();
                        }}
                        className="px-6 py-3 rounded-full bg-gradient-to-r from-[#FA26A0] via-[#F328D5] to-[#8B20FF] text-white text-xs font-black shadow-xl shadow-pink-900/60 flex items-center gap-2 active:scale-95 transition-all"
                      >
                        <Camera className="w-4 h-4" />
                        <span>{cameraPermissionDenied ? 'Allow Camera & Mic' : 'Activate Camera & Mic'}</span>
                      </button>

                      {cameraPermissionDenied && isNativeAndroidApp() && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void openNativeAppSettings();
                          }}
                          className="px-4 py-2.5 rounded-full bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/40 text-amber-200 text-xs font-bold transition-all"
                        >
                          Open Phone Settings
                        </button>
                      )}

                      {cameraPermissionDenied && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsCameraOn(false);
                            agoraRtcService.setCameraEnabled(false);
                          }}
                          className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all"
                        >
                          Stay in Audio Mode 🎙️
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* HOST CAMERA IS OFF: Audio Broadcast Presentation */
              <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#090611] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-[#140827]/80 to-transparent" />
                <div className="relative z-10 flex flex-col items-center text-center p-6 max-w-sm">
                  <div className="relative mb-5 flex items-center justify-center">
                    <div className="absolute w-36 h-36 rounded-full border border-[#8B20FF]/30 animate-ping" />
                    <div className="absolute w-44 h-44 rounded-full border border-[#F328D5]/20 animate-pulse" />
                    <AvatarWithFrame
                      avatar={stream.host.avatar}
                      name={stream.host.name}
                      level={stream.host.level || 42}
                      size="xl"
                    />
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-rose-600 border-2 border-[#090611] flex items-center justify-center text-white shadow-lg">
                      <CameraOff className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="px-3.5 py-1 rounded-full bg-black/70 border border-rose-500/40 text-rose-300 text-xs font-bold mb-2 flex items-center gap-1.5 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>Your Camera is OFF (Audio Broadcast Active)</span>
                  </div>
                  <p className="text-xs text-[#B9AECF] mb-4">
                    Viewers hear your live voice in real time. Tap below to turn video back on.
                  </p>
                  <button
                    onClick={handleToggleCamera}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-extrabold shadow-lg shadow-pink-500/30 flex items-center gap-2 active:scale-95 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Turn Camera ON</span>
                  </button>
                </div>
              </div>
            )
          ) : (
            /* ========================================================
               REMOTE VIEWER PERSPECTIVE: Real-Time Agora RTC or WebRTC Live Broadcast Stream
               ======================================================== */
            <div className="relative w-full h-full">
              {/* Agora RTC Remote Video Player Container */}
              <div
                ref={remotePlayerContainerRef}
                className={`w-full h-full overflow-hidden [&>div]:w-full [&>div]:h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover ${
                  mediaTransport === 'agora' && hasRemoteAgoraStream && remoteHostIsCameraOn
                    ? 'opacity-100'
                    : 'opacity-0 absolute inset-0 pointer-events-none'
                }`}
              />

              {/* WebRTC Real-Time Remote Video Player */}
              <video
                ref={remoteWebRtcVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${
                  mediaTransport === 'webrtc' && hasRemoteAgoraStream && remoteHostIsCameraOn
                    ? 'opacity-100'
                    : 'opacity-0 absolute inset-0 pointer-events-none'
                }`}
              />

              {/* Status Overlay: Real-Time Stream Status + Tap to Unmute Audio */}
              {hasRemoteAgoraStream && (
                <div className="absolute top-[calc(var(--safe-top)+6.75rem)] right-3 sm:right-4 z-20 flex flex-col items-end gap-1.5 pointer-events-auto">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-emerald-500/40 text-emerald-400 text-[11px] font-bold shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>LIVE • Real-Time Stream</span>
                  </div>

                  {(viewerSoundMuted || autoplayBlocked) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnlockViewerAudio();
                      }}
                      className="px-3 py-1.5 rounded-full bg-[#FA26A0] text-white text-[11px] font-bold shadow-lg shadow-pink-900/50 flex items-center gap-1.5 animate-pulse"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>Tap to Enable Host Audio</span>
                    </button>
                  )}
                </div>
              )}

              {/* If Host Camera is OFF on remote end (Audio Mode) */}
              {hasRemoteAgoraStream && !remoteHostIsCameraOn && (
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#090611] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-[#160A2A]/80 to-transparent" />
                  <div className="relative z-10 flex flex-col items-center text-center p-6 max-w-sm">
                    <div className="relative mb-5 flex items-center justify-center">
                      <div className="absolute w-36 h-36 rounded-full border border-pink-500/30 animate-ping" />
                      <div className="absolute w-44 h-44 rounded-full border border-cyan-400/20 animate-pulse" />
                      <AvatarWithFrame
                        avatar={stream.host.avatar}
                        name={stream.host.name}
                        level={stream.host.level || 42}
                        size="xl"
                      />
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-rose-600 border-2 border-[#090611] flex items-center justify-center text-white shadow-lg">
                        <CameraOff className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="px-3.5 py-1 rounded-full bg-black/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold mb-2 flex items-center gap-1.5 shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Host Audio Broadcast (Camera Off)</span>
                    </div>
                    <p className="text-xs text-[#B9AECF] max-w-xs">
                      {stream.host.name} is broadcasting live audio in real time.
                    </p>
                  </div>
                </div>
              )}

              {/* If Remote Stream is Connecting or Waiting for Host Video */}
              {!hasRemoteAgoraStream && (
                <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#160B29] via-[#090513] to-[#030107]">
                  <div className="relative mb-5 flex items-center justify-center">
                    <div className="absolute w-32 h-32 rounded-full border-2 border-[#FA26A0]/40 border-t-transparent animate-spin" />
                    <AvatarWithFrame
                      avatar={stream.host.avatar}
                      name={stream.host.name}
                      level={stream.host.level || 42}
                      size="xl"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/70 border border-white/15 text-white text-xs font-bold shadow-lg mb-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>
                      {agoraConnectionState === 'connecting'
                        ? 'Connecting to Live Stream...'
                        : 'Waiting for Host Video Feed...'}
                    </span>
                  </div>
                  <p className="text-xs text-[#9E97AA] text-center max-w-xs mb-4">
                    Real-time video & audio from {stream.host.name} will appear as soon as the host feed links.
                  </p>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      setIsMuted(false);
                      setViewerSoundMuted(false);
                      setAutoplayBlocked(false);
                      setAgoraConnectionState('connecting');
                      showToast('Reconnecting real-time live feed...');

                      const existing =
                        agoraRtcService.getRemoteHosts().find((h) => String(h.uid) === String(stream.host.id)) ||
                        agoraRtcService.getRemoteHosts()[0];

                      if (existing && (existing.videoTrack || existing.audioTrack)) {
                        setMediaTransport('agora');
                        if (existing.videoTrack && remotePlayerContainerRef.current) {
                          agoraRtcService.playRemoteVideo(existing.uid, remotePlayerContainerRef.current);
                          setHasRemoteAgoraStream(true);
                          setRemoteHostIsCameraOn(true);
                        }
                        if (existing.audioTrack) {
                          setHasRemoteAgoraStream(true);
                        }
                        agoraRtcService.setSpeakerMuted(false);
                        agoraRtcService.resumeRemoteAudio();
                        setAgoraConnected(true);
                        setAgoraConnectionState('connected');
                        return;
                      }

                      // Re-attempt Agora join cleanly if configured on backend
                      if (agoraConfig?.configured && agoraConfig.appId && agoraRtcService.getConnectionState() !== 'CONNECTED') {
                        try {
                          const tokenRes = await agoraRtcService.requestRtcToken(stream.id, currentUser.id, 'audience', true);
                          const canJoin = Boolean(tokenRes.token) || (tokenRes.configured && tokenRes.tokenRequired === false);
                          if (canJoin) {
                            setMediaTransport('agora');
                            await agoraRtcService.joinChannel({
                              appId: agoraConfig.appId,
                              channelName: stream.id,
                              userAccount: currentUser.id,
                              role: 'audience',
                              token: tokenRes.token,
                              enableVideo: false,
                              enableAudio: false,
                            });
                            setAgoraConnected(true);
                            setAgoraConnectionState('connected');
                            return;
                          }
                        } catch (rejoinErr) {
                          console.warn('[Live Viewer] Agora manual reconnect fallback:', rejoinErr);
                        }
                      }

                      if (webrtcMediaService.isLiveViewerActive(stream.id)) {
                        webrtcMediaService.requestOfferFromHost();
                      } else {
                        webrtcMediaService.startLiveViewer(
                          stream.id,
                          currentUser.id,
                          stream.host.id,
                          {
                            onRemoteStream: (remoteStream) => {
                              setMediaTransport('webrtc');
                              setRemoteWebRtcStream(remoteStream);
                              setHasRemoteAgoraStream(true);
                              const hasActiveVideo = remoteStream
                                .getVideoTracks()
                                .some((t) => t.readyState === 'live' && t.enabled);
                              setRemoteHostIsCameraOn(hasActiveVideo || remoteStream.getVideoTracks().length > 0);
                              setAgoraConnected(true);
                              setAgoraConnectionState('connected');
                              agoraRtcService.leaveChannel().catch(() => {});
                            },
                            onStatusChange: (status) => {
                              if (status === 'connected') {
                                setAgoraConnected(true);
                                setAgoraConnectionState('connected');
                              } else if (status === 'connecting' || status === 'reconnecting') {
                                setAgoraConnectionState('connecting');
                              }
                            },
                            onAutoplayBlocked: () => {
                              setAutoplayBlocked(true);
                              setViewerSoundMuted(true);
                            },
                          },
                          currentUser
                        );
                      }
                      if (remoteWebRtcVideoRef.current) {
                        remoteWebRtcVideoRef.current.muted = false;
                        remoteWebRtcVideoRef.current.play().catch(() => {});
                      }
                    }}
                    className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reconnect Feed</span>
                  </button>
                </div>
              )}
            </div>
          )}


          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/90 pointer-events-none" />

          {/* Large Premium Double-Tap Burst Hearts */}
          {burstHearts.map((heart) => (
            <div
              key={heart.id}
              className="absolute pointer-events-none z-30 select-none animate-double-tap-heart"
              style={{ left: `${heart.x}%`, top: `${heart.y}%` }}
            >
              {heart.particles.map((p) => (
                <div
                  key={p.id}
                  className="absolute pointer-events-none rounded-full animate-particle-sparkle"
                  style={{
                    left: '50%',
                    top: '50%',
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    backgroundColor: p.color,
                    boxShadow: `0 0 10px ${p.color}`,
                    '--burst-x': `${p.burstX}px`,
                    '--burst-y': `${p.burstY}px`,
                  } as React.CSSProperties}
                />
              ))}

              <div className="relative flex flex-col items-center justify-center animate-double-tap-heart">
                <svg
                  viewBox="0 0 24 24"
                  className="w-24 h-24 sm:w-28 sm:h-28 filter drop-shadow-[0_0_25px_#F328D5] drop-shadow-[0_0_40px_#FFC84A]"
                  style={{ transform: `rotate(${heart.rotation}deg)` }}
                >
                  <path
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    fill="#F328D5"
                    stroke="#FFFFFF"
                    strokeWidth="0.8"
                  />
                </svg>

                <div className="mt-1 px-4 py-1 rounded-full bg-black/60 backdrop-blur-md border border-[#F328D5]/60 shadow-[0_0_20px_rgba(243,40,213,0.8)]">
                  <span className="text-sm font-black text-white tracking-wider drop-shadow-[0_0_10px_#F328D5]">
                    Double Tap!
                  </span>
                </div>

                <span className="absolute -top-1 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FFC84A] to-[#F328D5] text-[#090611] text-[11px] font-black font-mono shadow-lg shadow-[#F328D5]/60 animate-pulse">
                  +1
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Header Bar & Level Indicator */}
      <div className="relative z-30 flex flex-col px-3 sm:px-5 safe-pt-3 pb-1.5 gap-2">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 min-w-0">
          {/* Host Profile Info Pill */}
          <div 
            onClick={() => onSelectUser(stream.host)}
            className="flex items-center gap-1.5 flex-1 min-w-0 max-w-[58%] sm:max-w-[54%] bg-black/55 backdrop-blur-md border border-white/10 rounded-full pl-1 pr-2 py-1 cursor-pointer hover:bg-black/70 transition-colors shadow-lg"
          >
            <div className="shrink-0">
              <AvatarWithFrame
                avatar={stream.host.avatar}
                name={stream.host.name}
                level={stream.host.level || 0}
                size="sm"
              />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-white leading-tight flex items-center gap-1 min-w-0">
                <span className="truncate">{stream.host.name}</span>
                {isActualHost && (
                  <span className="shrink-0 text-[8px] bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] font-black px-1 py-0.2 rounded-sm uppercase">
                    HOST
                  </span>
                )}
              </span>
              <span className="text-[10px] text-[#FFC84A] font-bold leading-tight flex items-center gap-0.5">
                <span>🔥</span>
                <span>{stream.host.fansCount || '0'}</span>
              </span>
            </div>

            {!isActualHost && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const nextFollow = !isFollowing;
                  setIsFollowing(nextFollow);
                  onToggleFollow?.(stream.host.id);
                  showToast(nextFollow ? `Followed ${stream.host.name}` : `Unfollowed ${stream.host.name}`);
                }}
                className={`ml-0.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] font-bold transition-all active:scale-95 shrink-0 ${
                  isFollowing
                    ? 'bg-white/20 text-white'
                    : 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md shadow-[#F328D5]/30'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>

          {/* Right Action Controls (Exit / End Broadcast X is always locked at top-right!) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Real-Time Top Viewers Avatar Stack + Viewer Count Pill */}
            <div className="flex items-center gap-1">
              {viewersList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowViewersModal(true);
                    loadLiveViewers(1, false);
                  }}
                  className="hidden sm:flex items-center -space-x-2 pr-0.5 cursor-pointer"
                  title="Real-Time Viewers"
                >
                  {viewersList.slice(0, 3).map((v) => (
                    v.avatar ? (
                      <img
                        key={v.userId}
                        src={v.avatar}
                        alt={v.name}
                        className="w-6 h-6 rounded-full object-cover border border-[#160C25] ring-1 ring-white/30"
                      />
                    ) : (
                      <div
                        key={v.userId}
                        className="w-6 h-6 rounded-full bg-[#8B20FF] text-white text-[10px] font-black flex items-center justify-center border border-[#160C25] ring-1 ring-white/30"
                      >
                        {(v.name || 'V').charAt(0).toUpperCase()}
                      </div>
                    )
                  ))}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowViewersModal(true);
                  loadLiveViewers(1, false);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/55 backdrop-blur-md text-white text-xs font-bold border border-white/10 shadow hover:bg-black/75 transition-colors"
                title="View Live Audience List"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-300" />
                <span className="font-mono text-[11px]">{liveViewerCount.toLocaleString()}</span>
              </button>
            </div>

            {/* Real-Time Solo Live & Global Leaderboard Trigger */}
            <button
              type="button"
              onClick={() => setShowLeaderboardModal(true)}
              className="w-8 h-8 sm:w-auto sm:px-2.5 rounded-full bg-gradient-to-r from-[#3A2208]/90 to-[#241136]/90 hover:from-[#4E2E0B] hover:to-[#32174A] backdrop-blur-md border border-[#FFC84A]/50 text-[#FFC84A] text-[11px] font-black shadow-lg flex items-center justify-center gap-1 transition-all active:scale-95 shrink-0"
              title="Open Live Leaderboard (Hourly, Daily, Weekly, Monthly)"
            >
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Rank</span>
            </button>

            {/* Audio Mute toggle (Controls both Agora & WebRTC remote sound) */}
            <button
              onClick={handleToggleViewerSound}
              className="w-8 h-8 rounded-full bg-black/55 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/75 transition-colors shrink-0"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Minimize Live Button (Blue Neon floating mini-player) */}
            {onMinimize && !isMinimized && (
              <button
                type="button"
                onClick={onMinimize}
                aria-label="Minimize Live Broadcast"
                className="w-8 h-8 rounded-full bg-[#071A38]/85 hover:bg-[#0D2B59] backdrop-blur-md border border-[#00D4FF]/55 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(0,212,255,0.35)] transition-all active:scale-95 shrink-0"
                title="Minimize Live (Stay Connected)"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            )}

            {/* Prominent Top-Right Exit / End Broadcast Button (Always Visible on Mobile & Desktop) */}
            <button
              type="button"
              onClick={() => {
                if (isActualHost) {
                  setShowEndLiveConfirm(true);
                } else {
                  void handleCleanLeaveLive();
                }
              }}
              aria-label={isActualHost ? 'End Broadcast / Exit Live' : 'Exit Live Stream'}
              className={`w-9 h-9 rounded-full backdrop-blur-md border flex items-center justify-center transition-all active:scale-95 shrink-0 shadow-lg ${
                isActualHost
                  ? 'bg-rose-600/90 hover:bg-rose-600 border-white/25 text-white shadow-rose-900/40'
                  : 'bg-black/65 hover:bg-black/85 border-white/15 text-white'
              }`}
              title={isActualHost ? 'End Broadcast / Exit Live' : 'Exit Stream'}
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Level Progress Bar, Host View Toggle & Live Duration */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 shadow">
              <span className="px-1.5 py-0.2 rounded-md bg-[#FFC84A] text-[#090611] text-[10px] font-black">
                Lv.{hostLevelProgress.currentLevel}
              </span>
              <div className="w-14 sm:w-24 h-2 rounded-full bg-white/20 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] rounded-full shadow-[0_0_8px_#FFC84A]"
                  style={{ width: `${hostLevelProgress.progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-white/90">
                {hostLevelProgress.progressPercent}%
              </span>
            </div>

            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FF2E93] to-[#FF007A] text-white text-[10px] font-black shadow-md shadow-pink-500/30 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>LIVE</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Compact Host Mode Switcher (kept on second row so top-right Exit X is never crowded) */}
            {isActualHost && (
              <button
                type="button"
                onClick={() => {
                  const nextMode = !isHostMode;
                  setIsHostMode(nextMode);
                  showToast(nextMode ? 'Switched to Host Control Mode' : 'Switched to Viewer Mode');
                }}
                className={`px-2 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 border transition-all active:scale-95 shadow ${
                  isHostMode 
                    ? 'bg-[#FFC84A] text-[#090611] border-[#FFC84A] shadow-[#FFC84A]/30' 
                    : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                }`}
                title="Toggle between Host Controls and Viewer View"
              >
                <Crown className="w-3 h-3" />
                <span>{isHostMode ? 'Host' : 'Viewer'}</span>
              </button>
            )}

            {/* Broadcast Duration Badge */}
            <div className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white font-mono text-[10px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              <span>{formatDuration(streamSeconds)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Video Area - Live Overlay Chat & Entry Notification */}
      <div className="flex-1 flex flex-col justify-end px-3 sm:px-5 pb-2 pointer-events-none">
        {entryNotice && (
          <div className="mb-2 w-fit max-w-[85%] px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#8B20FF]/90 to-[#F328D5]/90 backdrop-blur-md border border-white/20 text-white text-xs font-bold shadow-lg animate-fade-in">
            {entryNotice.name} entered the live.
          </div>
        )}

        {(pinnedMessage || messages.length > 0) && (
          <div className="w-full max-w-sm space-y-1.5 pointer-events-auto">
            {pinnedMessage && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 backdrop-blur-md text-[11px] text-amber-200 font-semibold">
                {pinnedMessage}
              </div>
            )}
            <div className="max-h-40 overflow-y-auto no-scrollbar space-y-1 pr-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => isActualHost && !msg.isSystem && handlePinMessage(`${msg.senderName}: ${msg.text}`)}
                  className={`px-3 py-1.5 rounded-2xl backdrop-blur-md border text-xs w-fit max-w-full ${
                    msg.isSystem
                      ? 'bg-[#8B20FF]/35 border-[#F328D5]/40 text-white'
                      : 'bg-black/50 border-white/10 cursor-pointer'
                  }`}
                >
                  {msg.isHost && !msg.isSystem && (
                    <span className="mr-1.5 px-1.5 py-0.2 rounded bg-[#FFC84A] text-black text-[9px] font-black">
                      HOST
                    </span>
                  )}
                  <span className={`font-bold mr-1.5 ${msg.isSystem ? 'text-[#FFE28A]' : 'text-[#FFC84A]'}`}>
                    {msg.senderName}{msg.isSystem ? '' : ':'}
                  </span>
                  <span className="text-white/95 break-words">{msg.text}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Control Section */}
      <div className="relative z-30 px-3 sm:px-4 pt-3 safe-pb-3 bg-gradient-to-t from-black via-black/90 to-transparent">
        {/* PK Quick Support Selector when Battle is Live */}
        {activePKSession && host1 && host2 && (
          <div className="flex items-center justify-between gap-3 mb-3 max-w-xl mx-auto">
            <button
              onClick={() => onOpenGiftShop(host1.user)}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#06B6D4] to-[#3B82F6] text-white text-xs font-bold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Gift {host1.user.name.split(' ')[0]}</span>
            </button>

            <button
              onClick={() => onOpenGiftShop(host2.user)}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#EF4444] to-[#F59E0B] text-white text-xs font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Gift {host2.user.name.split(' ')[0]}</span>
            </button>
          </div>
        )}

        {/* Video Filter Selector Palette */}
        {showFilterPicker && (
          <div className="flex items-center gap-2 mb-3 bg-[#160C25]/95 backdrop-blur-md p-2 px-3 rounded-2xl border border-white/15 max-w-xl mx-auto animate-fade-in shadow-2xl overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-black text-[#FFC84A] shrink-0 mr-1">Filters:</span>
            {(Object.keys(VIDEO_FILTERS) as VideoFilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setActiveFilter(f);
                  showToast(`Filter applied: ${VIDEO_FILTERS[f].label}`);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                  activeFilter === f
                    ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md'
                    : 'bg-white/10 hover:bg-white/20 text-[#B9AECF]'
                }`}
              >
                <span>{VIDEO_FILTERS[f].icon}</span>
                <span>{VIDEO_FILTERS[f].label}</span>
              </button>
            ))}
          </div>
        )}

        {/* DEDICATED HOST CONTROL TOOLBAR (Camera ON/OFF, Flip Camera, Mic, Filters, PK) - ONLY FOR LIVE OWNER */}
        {isActualHost && isHostMode && (
          <div className="flex items-center justify-between gap-1.5 p-2 px-3 rounded-2xl bg-[#160C25]/90 backdrop-blur-md border border-[#F328D5]/35 mb-2.5 max-w-xl mx-auto shadow-2xl">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {/* 1. Camera Toggle (ON / OFF) */}
              <button
                onClick={handleToggleCamera}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95 shadow ${
                  isCameraOn
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                }`}
                title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                {isCameraOn ? <Camera className="w-3.5 h-3.5 stroke-[2.2]" /> : <CameraOff className="w-3.5 h-3.5 stroke-[2.2]" />}
                <span>{isCameraOn ? 'Camera ON' : 'Camera OFF'}</span>
              </button>

              {/* 2. Flip Camera (Rotate to Back / Front Camera) */}
              {isCameraOn && (
                <button
                  onClick={handleFlipCamera}
                  disabled={isFlippingCamera}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 border ${
                    !isFrontCamera
                      ? 'bg-[#00F2FE]/20 text-[#00F2FE] border-[#00F2FE]/50 shadow-[0_0_12px_rgba(0,242,254,0.3)]'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                  }`}
                  title="Rotate Camera (Switch to Back / Front Camera)"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFlippingCamera ? 'animate-spin' : ''}`} />
                  <span className="text-[11px] font-extrabold">{isFrontCamera ? 'Front Cam' : '📷 Back Cam'}</span>
                </button>
              )}

              {/* 3. Host Microphone Toggle with Realtime Audio Level */}
              <button
                onClick={handleToggleMic}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 border ${
                  isMicMuted
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : audioVolumeLevel > 8
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.35)]'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                }`}
                title={isMicMuted ? 'Unmute Host Microphone' : 'Mute Host Microphone'}
              >
                {isMicMuted ? (
                  <MicOff className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Mic className={`w-3.5 h-3.5 ${audioVolumeLevel > 8 ? 'text-emerald-400 animate-pulse' : 'text-emerald-400'}`} />
                )}
                <span className="text-[11px]">
                  {isMicMuted ? 'Muted' : audioVolumeLevel > 8 ? 'Speaking 🔊' : 'Mic Live'}
                </span>
                {!isMicMuted && audioVolumeLevel > 0 && (
                  <span className="text-[10px] font-mono text-emerald-400 font-black">
                    {audioVolumeLevel}%
                  </span>
                )}
              </button>

              {/* 4. Beauty / Glow Video Filter */}
              <button
                onClick={() => setShowFilterPicker(!showFilterPicker)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95 ${
                  showFilterPicker
                    ? 'bg-[#F328D5] text-white shadow-md'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                title="Camera Beauty & Color Filters"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FFC84A]" />
                <span className="text-[11px]">Filters</span>
              </button>
            </div>

            {/* 5. PK Battle / Forfeit PK Control (Single clean PK button in bottom toolbar) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {activePKSession ? (
                <button
                  onClick={() => setShowForfeitConfirm(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black flex items-center gap-1 shadow active:scale-95"
                  title="Forfeit PK Battle"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Forfeit</span>
                </button>
              ) : (
                <button
                  onClick={onOpenPK}
                  className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#EF4444] text-white text-xs font-black flex items-center gap-1 shadow active:scale-95"
                  title="Challenge Host to PK Battle"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>PK</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Emoji Bar */}
        {showEmojiPicker && (
          <div className="flex items-center gap-2 mb-3 bg-[#160C25]/90 backdrop-blur-md p-2 rounded-2xl border border-white/10 w-fit animate-fade-in shadow-xl mx-auto">
            {['😍', '🔥', '👑', '💖', '👏', '🎉', '🌹', '💎'].map((em) => (
              <button
                key={em}
                onClick={() => handleSendEmoji(em)}
                className="text-xl hover:scale-125 transition-transform p-1"
              >
                {em}
              </button>
            ))}
          </div>
        )}

        {/* Interactive Bottom Bar: Chat Input, Virtual Gifts, Share, More */}
        <div className="flex items-center justify-between gap-2 max-w-xl mx-auto">
          {/* Chat Input Field */}
          <form 
            onSubmit={handleSendMessage}
            className="flex-1 flex items-center bg-black/55 backdrop-blur-md border border-white/15 rounded-full px-4 py-2.5 focus-within:border-[#F328D5] transition-colors shadow-lg"
          >
            <input
              type="text"
              placeholder={isActualHost ? "Say something as Host 👑..." : "Say something..."}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-white/50 outline-none"
            />
            {inputMessage ? (
              <button
                type="submit"
                className="w-6 h-6 rounded-full bg-[#F328D5] text-white flex items-center justify-center shrink-0 ml-1 shadow"
              >
                <Send className="w-3 h-3" />
              </button>
            ) : null}
          </form>

          {/* One-Tap Like / Heart Interaction Button */}
          <button
            type="button"
            onClick={handleQuickHeart}
            className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF2E93] to-[#F328D5] flex items-center justify-center text-white shadow-lg shadow-pink-500/40 active:scale-90 transition-all shrink-0"
            title="Send Heart"
          >
            <Heart className="w-4.5 h-4.5 fill-white text-white" />
            {streamLikes > 0 && (
              <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 rounded-full bg-black/80 border border-pink-400/50 text-[9px] font-black text-pink-200 font-mono">
                {streamLikes > 999 ? `${(streamLikes / 1000).toFixed(1)}k` : streamLikes}
              </span>
            )}
          </button>

          {/* Virtual Gift Button 🎁 */}
          <button
            onClick={() => onOpenGiftShop(stream.host)}
            className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#8B20FF] via-[#F328D5] to-[#FFC84A] flex items-center justify-center text-white shadow-lg shadow-[#F328D5]/50 active:scale-95 transition-all animate-pulse shrink-0"
            title="Send Gift"
          >
            <Gift className="w-5 h-5 text-white stroke-[2.2]" />
          </button>

          {/* Share Stream Button */}
          <button
            onClick={() => {
              const shareUrl = `https://lenzoparty.com/live/${encodeURIComponent(stream.id)}`;
              navigator.clipboard?.writeText(shareUrl).catch(() => {});
              showToast('Live stream link copied to clipboard');
            }}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:text-[#06B6D4] transition-colors active:scale-95 shadow"
            title="Share Stream"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Emoji / Options Button */}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:text-[#FFC84A] transition-colors active:scale-95 shadow"
            title="Emojis & Presets"
          >
            <Smile className="w-4 h-4" />
          </button>
        </div>
      </div>
      <LiveLeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        mode="solo"
        contextId={stream.id}
        contextTitle={stream.title}
        currentUser={currentUser}
        onSelectUser={onSelectUser}
      />
    </div>
  );
};
