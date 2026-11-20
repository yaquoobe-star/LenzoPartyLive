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
} from 'lucide-react';
import { LiveLeaderboardModal } from '../common/LiveLeaderboardModal';
import {
  PartyRoom,
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
  setNativeLiveAudioMode,
  stopMediaStream,
  createAudioAnalyser,
  AudioAnalyserController,
} from '../../utils/mediaDeviceHelper';
import { agoraRtcService } from '../../utils/agoraRtcService';
import { webrtcMediaService } from '../../utils/webrtcMediaService';
import { liveAndRoomService } from '../../services/liveAndRoomService';
import {
  joinFirestoreRoomParticipant,
  leaveFirestoreRoomParticipant,
  sendFirestoreRoomMessage,
  subscribeFirestorePartyRoomDoc,
  subscribeFirestoreRoomMessages,
  subscribeFirestoreRoomParticipants,
  syncFirestorePartyRoomState,
  updateFirestoreRoomParticipantCount,
  updateFirestoreRoomParticipantState,
} from '../../services/firestoreRealtimeService';
import { roomService } from '../../utils/roomService';

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
}

interface ActivityItem {
  id: string;
  name: string;
  avatar: string;
  text: string;
  isHost?: boolean;
  type?: 'join' | 'vip' | 'chat' | 'gift';
}

interface FloatingHeart {
  id: number;
  x: number;
  size: number;
  color: string;
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
}) => {
  const isRoomHost = currentUser.id === room.host.id;
  const maxSeats = room.maxSeats === 16 ? 16 : 8;

  // Strictly mirror server seat occupancy — NEVER inject a ghost Host into an empty Seat 0
  const normalizeSeats = (raw?: (UserProfile | null)[], count = maxSeats): (UserProfile | null)[] => {
    const arr: (UserProfile | null)[] = Array(count).fill(null);
    if (Array.isArray(raw)) {
      for (let i = 0; i < Math.min(count, raw.length); i++) {
        arr[i] = raw[i] || null;
      }
    }
    return arr;
  };

  const [seats, setSeats] = useState<(UserProfile | null)[]>(() => normalizeSeats(room.seats, maxSeats));
  const [mutedSeatIndices, setMutedSeatIndices] = useState<number[]>(room.mutedSeatIndices || []);
  const [seatRequests, setSeatRequests] = useState<SeatRequest[]>(room.seatRequests || []);
  const [participantsList, setParticipantsList] = useState<LiveViewerInfo[]>([]);
  const [participantTotal, setParticipantTotal] = useState<number>(room.numericParticipants ?? 0);

  const userSeatIndex = seats.findIndex((s) => s?.id === currentUser.id);
  const isCurrentlySeated = userSeatIndex !== -1;
  const isHostMutedOnMySeat = userSeatIndex !== -1 && mutedSeatIndices.includes(userSeatIndex);

  // Modals & Interactive States
  const [showSeatRequestsModal, setShowSeatRequestsModal] = useState(false);
  const [requestTargetSeat, setRequestTargetSeat] = useState<number | null>(null);
  const [showRequestConfirmModal, setShowRequestConfirmModal] = useState(false);
  const [showInviteToSeatModal, setShowInviteToSeatModal] = useState<number | null>(null);
  const [incomingSeatInvite, setIncomingSeatInvite] = useState<SeatInvitation | null>(null);
  const [selectedSeatMember, setSelectedSeatMember] = useState<{ index: number; user: UserProfile } | null>(null);
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
  const [partyEntryNotice, setPartyEntryNotice] = useState<{ id: string; name: string } | null>(null);
  const [speakingSeats, setSpeakingSeats] = useState<Record<number, number>>({});
  const [realMicVolume, setRealMicVolume] = useState(0);
  const [agoraVoiceState, setAgoraVoiceState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [voiceTransport, setVoiceTransport] = useState<'agora' | 'webrtc' | 'connecting'>('connecting');

  const realMicStreamRef = useRef<MediaStream | null>(null);
  const realMicAnalyserRef = useRef<AudioAnalyserController | null>(null);
  const realMicRafRef = useRef<number | null>(null);
  const hasExplicitlyLeftRef = useRef<boolean>(false);
  const partyEntryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenPartyEntriesRef = useRef<Map<string, number>>(new Map());
  const voiceTransportRef = useRef<'agora' | 'webrtc' | 'connecting'>('connecting');
  voiceTransportRef.current = voiceTransport;
  const seatsRef = useRef<(UserProfile | null)[]>(seats);
  seatsRef.current = seats;

  // Settings & Announcements
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showEditAnnouncementModal, setShowEditAnnouncementModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [roomAnnouncement, setRoomAnnouncement] = useState(
    room.announcement || 'Welcome! Hop on a seat, respect everyone & enjoy the party.'
  );
  const [isSeatLocked, setIsSeatLocked] = useState(Boolean(room.isLocked));
  const [isAllowJoin, setIsAllowJoin] = useState(room.allowJoin !== false);

  // Floating Hearts & Chat Activities (Zero Mock Data)
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const activityBottomRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  // Update local room snapshot when prop changes
  useEffect(() => {
    setSeats(normalizeSeats(room.seats, maxSeats));
    if (room.mutedSeatIndices) setMutedSeatIndices(room.mutedSeatIndices);
    if (room.seatRequests) setSeatRequests(room.seatRequests);
  }, [room.id]);

  // Real-Time Backend, WebSocket & Cloud Firestore Room Lifecycle (15s Heartbeat + Strict Real-Time Participants Only)
  useEffect(() => {
    let active = true;
    hasExplicitlyLeftRef.current = false;
    const knownParticipantIds = new Set<string>([currentUser.id]);
    let fsParticipantsInitialized = false;

    liveAndRoomService.setCurrentUser(currentUser.id);
    liveAndRoomService.subscribeRoom(room.id, currentUser.id);

    // Register real-time participant presence in Cloud Firestore (works even when Railway API is 502)
    void joinFirestoreRoomParticipant(
      room.id,
      currentUser,
      isRoomHost,
      seatsRef.current.some((s) => s?.id === currentUser.id)
    );

    const applyServerRoomState = (nextRoom: PartyRoom) => {
      setSeats(normalizeSeats(nextRoom.seats, nextRoom.maxSeats || maxSeats));
      if (Array.isArray(nextRoom.mutedSeatIndices)) {
        setMutedSeatIndices(nextRoom.mutedSeatIndices);
      }
      setIsSeatLocked(Boolean(nextRoom.isLocked));
      setIsAllowJoin(nextRoom.allowJoin !== false);
      if (nextRoom.announcement !== undefined) setRoomAnnouncement(nextRoom.announcement);
      if (typeof nextRoom.numericParticipants === 'number') {
        setParticipantTotal((prev) => Math.max(prev, nextRoom.numericParticipants || 0));
      }
      onUpdateRoom?.(nextRoom);
    };

    const refreshRealTimeParticipants = () => {
      liveAndRoomService.fetchRoomParticipants(room.id, 1, 50).then((res) => {
        if (!active || res.participants.length === 0) return;
        setParticipantsList((prev) => {
          const map = new Map<string, LiveViewerInfo>();
          prev.forEach((p) => map.set(p.userId, p));
          res.participants.forEach((p) => map.set(p.userId, p));
          const merged = Array.from(map.values());
          setParticipantTotal(merged.length);
          return merged;
        });
      });
    };

    liveAndRoomService
      .joinPartyRoom(room.id, currentUser, room.password)
      .then((res) => {
        if (!active) return;
        if (res.room) {
          applyServerRoomState(res.room);
        }
        if (Array.isArray(res.participants) && res.participants.length > 0) {
          setParticipantsList((prev) => {
            const map = new Map<string, LiveViewerInfo>();
            prev.forEach((p) => map.set(p.userId, p));
            res.participants!.forEach((p) => map.set(p.userId, p));
            const merged = Array.from(map.values());
            setParticipantTotal(merged.length);
            return merged;
          });
        } else {
          refreshRealTimeParticipants();
        }
        if (Array.isArray(res.pendingRequests)) {
          setSeatRequests(
            res.pendingRequests.map((r: any) => ({
              id: r.id,
              user: r.user,
              seatIndex: r.requestedSeatIndex ?? r.seatIndex ?? 1,
              requestedAt: r.createdAt || r.requestedAt || Date.now(),
            }))
          );
        }
        if (Array.isArray(res.messages) && res.messages.length > 0) {
          setActivities((prev) => {
            const seen = new Set(prev.map((a) => a.id));
            const next = [...prev];
            res.messages.forEach((m) => {
              if (!seen.has(m.id)) {
                seen.add(m.id);
                next.push({
                  id: m.id,
                  name: m.senderName,
                  avatar: m.senderAvatar,
                  text: m.text,
                  isHost: m.isHost,
                  type: m.gift ? 'gift' : m.isSystem ? 'join' : 'chat',
                });
              }
            });
            return next.slice(-60);
          });
        }
      })
      .catch((err) => {
        console.warn('[AudioRoom] Backend join fallback to Firestore:', err?.message || err);
      });

    // Cloud Firestore real-time participants subscription
    const unsubFsParticipants = subscribeFirestoreRoomParticipants(room.id, (fsParticipants) => {
      if (!active) return;
      if (!fsParticipantsInitialized) {
        fsParticipantsInitialized = true;
        fsParticipants.forEach((p) => knownParticipantIds.add(p.userId));
      } else {
        fsParticipants.forEach((p) => {
          if (!knownParticipantIds.has(p.userId) && p.userId !== currentUser.id) {
            knownParticipantIds.add(p.userId);
            const now = Date.now();
            const lastSeen = seenPartyEntriesRef.current.get(p.userId) || 0;
            if (now - lastSeen > 10000) {
              seenPartyEntriesRef.current.set(p.userId, now);
              setPartyEntryNotice({ id: `entry_fs_${p.userId}_${now}`, name: p.name || 'Viewer' });
              if (partyEntryTimerRef.current) clearTimeout(partyEntryTimerRef.current);
              partyEntryTimerRef.current = setTimeout(() => setPartyEntryNotice(null), 3500);
              setActivities((prev) => [
                ...prev.slice(-49),
                {
                  id: `join_fs_${p.userId}_${now}`,
                  name: p.name || 'Viewer',
                  avatar: p.avatar || '',
                  text: 'joined the party room',
                  isHost: Boolean(p.isHost),
                  type: 'join',
                },
              ]);
              setTimeout(() => activityBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 40);
            }
          }
        });
      }
      setParticipantsList(fsParticipants);
      setParticipantTotal(fsParticipants.length);
      if (isRoomHost) {
        void updateFirestoreRoomParticipantCount(room.id, fsParticipants.length);
      }
    });

    // Cloud Firestore real-time room messages subscription
    const unsubFsMessages = subscribeFirestoreRoomMessages(room.id, (fsMessages) => {
      if (!active || fsMessages.length === 0) return;
      setActivities((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        const next = [...prev];
        let changed = false;
        fsMessages.forEach((m) => {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            next.push({
              id: m.id,
              name: m.senderName,
              avatar: m.senderAvatar,
              text: m.text,
              isHost: m.isHost,
              type: m.gift ? 'gift' : m.isSystem ? 'join' : 'chat',
            });
            changed = true;
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
        if (Array.isArray(data.seats)) {
          setSeats(normalizeSeats(data.seats, data.maxSeats === 16 ? 16 : maxSeats));
        }
        if (Array.isArray(data.mutedSeatIndices)) {
          setMutedSeatIndices(data.mutedSeatIndices);
        }
        if (Array.isArray(data.seatRequests)) {
          setSeatRequests(data.seatRequests as SeatRequest[]);
        }
        if (typeof data.isLocked === 'boolean') setIsSeatLocked(data.isLocked);
        if (typeof data.allowJoin === 'boolean') setIsAllowJoin(data.allowJoin);
        if (typeof data.announcement === 'string') setRoomAnnouncement(data.announcement);
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

    const unsubWs = liveAndRoomService.addEventListener((event, payload) => {
      if (!active || !payload) return;
      if (payload.roomId && payload.roomId !== room.id) return;

      if (
        (event === 'room:updated' ||
          event === 'room:state_updated' ||
          event === 'room:sync_state' ||
          event === 'room:settings_updated' ||
          event === 'room:seat_occupied' ||
          event === 'room:seat_vacated') &&
        payload.room
      ) {
        applyServerRoomState(payload.room as PartyRoom);
        if (Array.isArray(payload.participants)) {
          setParticipantsList(payload.participants);
          setParticipantTotal(payload.participants.length);
        }
        if (event === 'room:sync_state') {
          if (Array.isArray(payload.pendingRequests)) {
            setSeatRequests(
              payload.pendingRequests.map((r: any) => ({
                id: r.id,
                user: r.user,
                seatIndex: r.requestedSeatIndex ?? r.seatIndex ?? 1,
                requestedAt: r.createdAt || r.requestedAt || Date.now(),
              }))
            );
          }
          if (Array.isArray(payload.messages)) {
            setActivities(
              payload.messages.map((m: any) => ({
                id: m.id,
                name: m.senderName,
                avatar: m.senderAvatar,
                text: m.text,
                isHost: m.isHost,
                type: m.gift ? 'gift' : m.isSystem ? 'join' : 'chat',
              }))
            );
          }
        }
      } else if (event === 'room:participant_joined') {
        if (payload.room) applyServerRoomState(payload.room as PartyRoom);
        if (Array.isArray(payload.participants)) {
          setParticipantsList(payload.participants);
          setParticipantTotal(payload.participants.length);
        } else {
          refreshRealTimeParticipants();
        }
        if (payload.participant && payload.participant.userId !== currentUser.id) {
          const p = payload.participant;
          const now = Date.now();
          const lastSeen = seenPartyEntriesRef.current.get(p.userId) || 0;
          if (now - lastSeen > 10000) {
            seenPartyEntriesRef.current.set(p.userId, now);
            setPartyEntryNotice({ id: `entry_${p.userId}_${now}`, name: p.name || 'Viewer' });
            if (partyEntryTimerRef.current) clearTimeout(partyEntryTimerRef.current);
            partyEntryTimerRef.current = setTimeout(() => setPartyEntryNotice(null), 3500);
            setActivities((prev) => [
              ...prev.slice(-49),
              {
                id: `join_${p.userId}_${now}`,
                name: p.name || 'Viewer',
                avatar: p.avatar || '',
                text: 'joined the party room',
                isHost: Boolean(p.isHost),
                type: 'join',
              },
            ]);
            setTimeout(() => activityBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 40);
          }
        }
      } else if (event === 'room:participant_left') {
        if (payload.room) applyServerRoomState(payload.room as PartyRoom);
        if (Array.isArray(payload.participants)) {
          setParticipantsList(payload.participants);
          setParticipantTotal(payload.participants.length);
        } else if (payload.userId) {
          setParticipantsList((prev) => {
            const next = prev.filter((p) => p.userId !== payload.userId);
            setParticipantTotal(next.length);
            return next;
          });
        } else {
          refreshRealTimeParticipants();
        }
      } else if (event === 'room:heart') {
        if (payload.userId && payload.userId !== currentUser.id) {
          const remoteHeart: FloatingHeart = {
            id: Date.now() + Math.random(),
            x: 72 + Math.random() * 18,
            size: 24 + Math.random() * 14,
            color: ['#FF2A85', '#FF6090', '#FA26A0', '#FFB703', '#9D4EDD'][Math.floor(Math.random() * 5)],
          };
          setFloatingHearts((prev) => [...prev, remoteHeart]);
          setTimeout(() => {
            setFloatingHearts((prev) => prev.filter((h) => h.id !== remoteHeart.id));
          }, 2000);
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
        showToast(`Approved! You are now on Seat #${(payload.seatIndex ?? 1) + 1}`);
      } else if (event === 'room:seat_request_rejected') {
        showToast('Host declined your seat request');
      } else if (event === 'room:chat' && payload.message) {
        const m = payload.message;
        setActivities((prev) =>
          prev.some((a) => a.id === m.id)
            ? prev
            : [
                ...prev,
                {
                  id: m.id,
                  name: m.senderName,
                  avatar: m.senderAvatar,
                  text: m.text,
                  isHost: m.isHost,
                  type: m.gift ? 'gift' : m.isSystem ? 'join' : 'chat',
                },
              ]
        );
        setTimeout(() => activityBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 40);
      } else if (event === 'room:closed') {
        if (!isRoomHost) {
          showToast('Host has closed this party room');
          webrtcMediaService.stopPartyVoice();
          agoraRtcService.leaveChannel().catch(() => {});
          setTimeout(() => {
            if (active) onClose();
          }, 1200);
        }
      }
    });

    return () => {
      active = false;
      clearInterval(heartbeatInterval);
      if (partyEntryTimerRef.current) clearTimeout(partyEntryTimerRef.current);
      unsubWs();
      unsubFsParticipants();
      unsubFsMessages();
      unsubFsRoomDoc();
      liveAndRoomService.unsubscribeRoom();
      if (!hasExplicitlyLeftRef.current) {
        liveAndRoomService.leavePartyRoom(room.id, currentUser.id);
        void leaveFirestoreRoomParticipant(room.id);
      }
    };
  }, [room.id, currentUser.id, isRoomHost]);

  // Unified Real-Time Party Voice Engine (Agora RTC + WebRTC Audio Mesh Fallback)
  useEffect(() => {
    let isMounted = true;
    const initiallySeated = seatsRef.current.some((s) => s?.id === currentUser.id);
    const effectiveMuted = isMicMuted || isHostMutedOnMySeat;
    const initialRole: 'host' | 'audience' = initiallySeated ? 'host' : 'audience';

    const joinPartyVoice = async () => {
      try {
        setAgoraVoiceState('connecting');
        setVoiceTransport('connecting');
        void setNativeLiveAudioMode(true);

        let localMicStream: MediaStream | null = realMicStreamRef.current;
        if (initiallySeated && !localMicStream) {
          try {
            localMicStream = await acquireRealMicrophone();
            if (!isMounted) {
              stopMediaStream(localMicStream);
              return;
            }
            localMicStream.getAudioTracks().forEach((t) => {
              t.enabled = !effectiveMuted;
            });
            realMicStreamRef.current = localMicStream;
            realMicAnalyserRef.current = createAudioAnalyser(localMicStream);
            setMicPermissionDenied(false);
          } catch (micErr) {
            console.warn('[Party Voice] Mic acquisition notice:', micErr);
            if (isMounted) setMicPermissionDenied(true);
          }
        }

        const config = await agoraRtcService.getAgoraConfig();
        if (!isMounted) return;

        if (config.configured && config.appId) {
          try {
            const tokenData = await agoraRtcService.requestRtcToken(
              `party_${room.id}`,
              currentUser.id,
              initiallySeated ? 'broadcaster' : 'audience'
            );
            if (!isMounted) return;

            if (tokenData.token) {
              setVoiceTransport('agora');
              await agoraRtcService.joinChannel({
                appId: config.appId,
                channelName: `party_${room.id}`,
                userAccount: currentUser.id,
                role: initialRole,
                token: tokenData.token,
                enableVideo: false,
                enableAudio: initiallySeated,
                mediaStream: initiallySeated ? localMicStream : null,
              });
              if (!isMounted) return;
              if (effectiveMuted) {
                await agoraRtcService.setMicrophoneMuted(true);
              }
              setAgoraVoiceState('connected');
              return;
            }
          } catch (agoraErr) {
            console.warn('[Party Voice] Agora voice failed, falling back to real-time WebRTC mesh:', agoraErr);
            await agoraRtcService.leaveChannel().catch(() => {});
          }
        }

        if (!isMounted) return;

        // WebRTC Real-Time Party Voice Mesh fallback
        setVoiceTransport('webrtc');
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
          }
        );
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

    const unsubVolumes = agoraRtcService.onVolumeIndicator((volumes) => {
      if (!isMounted) return;
      const now = Date.now();
      for (const v of volumes) {
        if (v.level > 10) {
          if (v.uid === 0 || v.uid === currentUser.id) {
            setRealMicVolume(v.level);
            const mySeatIdx = seatsRef.current.findIndex((s) => s?.id === currentUser.id);
            if (mySeatIdx !== -1) {
              setSpeakingSeats((prev) => ({ ...prev, [mySeatIdx]: now }));
            }
          } else {
            const remoteSeatIdx = seatsRef.current.findIndex((s) => s && s.id === v.uid);
            if (remoteSeatIdx !== -1) {
              setSpeakingSeats((prev) => ({ ...prev, [remoteSeatIdx]: now }));
            }
          }
        }
      }
    });

    return () => {
      isMounted = false;
      unsubAutoplay();
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
        });
        await agoraRtcService.setMicrophoneMuted(effectiveMuted);
      } else {
        webrtcMediaService.updatePartySpeakerRole(true, micStream);
        webrtcMediaService.setPartyMicMuted(effectiveMuted);
      }
      showToast('Microphone access granted — voice is live');
    } catch {
      setMicPermissionDenied(true);
      showToast('Please allow Microphone permission in app/browser settings');
    }
  };

  // Synchronize seat join / seat leave role changes (NEVER triggered by mute toggles!)
  useEffect(() => {
    let active = true;
    const syncSeatRole = async () => {
      if (voiceTransport === 'connecting') return;

      if (isCurrentlySeated) {
        let micStream = realMicStreamRef.current;
        if (!micStream) {
          try {
            micStream = await acquireRealMicrophone();
            if (!active) {
              stopMediaStream(micStream);
              return;
            }
            realMicStreamRef.current = micStream;
            realMicAnalyserRef.current = createAudioAnalyser(micStream);
            setMicPermissionDenied(false);
          } catch (err) {
            console.warn('[Party Voice] Mic unavailable when taking seat:', err);
            if (active) setMicPermissionDenied(true);
          }
        }
        const effectiveMuted = isMicMuted || isHostMutedOnMySeat;
        if (micStream) {
          micStream.getAudioTracks().forEach((t) => {
            t.enabled = !effectiveMuted;
          });
        }
        if (voiceTransport === 'agora') {
          await agoraRtcService.switchRole('host', {
            enableVideo: false,
            enableAudio: true,
            mediaStream: micStream,
          });
          await agoraRtcService.setMicrophoneMuted(effectiveMuted);
        } else if (voiceTransport === 'webrtc') {
          webrtcMediaService.updatePartySpeakerRole(true, micStream);
          webrtcMediaService.setPartyMicMuted(effectiveMuted);
        }
      } else {
        // Stepped down from seat -> switch cleanly to listener and release mic
        setMicPermissionDenied(false);
        if (voiceTransport === 'agora') {
          await agoraRtcService.switchRole('audience', { enableVideo: false, enableAudio: false });
        } else if (voiceTransport === 'webrtc') {
          webrtcMediaService.updatePartySpeakerRole(false, null);
        }
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

    syncSeatRole();
    return () => {
      active = false;
    };
  }, [isCurrentlySeated, voiceTransport]);

  // Lightweight local mute toggle & speaking volume meter (Zero track teardown!)
  useEffect(() => {
    const effectiveMuted = isMicMuted || isHostMutedOnMySeat || !isCurrentlySeated;
    if (realMicStreamRef.current) {
      realMicStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !effectiveMuted;
      });
    }
    agoraRtcService.setMicrophoneMuted(effectiveMuted);
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
    updatedAnnouncement?: string
  ) => {
    const nextRoom: PartyRoom = {
      ...room,
      seats: updatedSeats,
      mutedSeatIndices,
      numericParticipants: participantTotal,
      participantCount: String(participantTotal),
      isLocked: updatedLocked !== undefined ? updatedLocked : isSeatLocked,
      allowJoin: updatedAllowJoin !== undefined ? updatedAllowJoin : isAllowJoin,
      announcement: updatedAnnouncement !== undefined ? updatedAnnouncement : roomAnnouncement,
      seatRequests: updatedRequests !== undefined ? updatedRequests : seatRequests,
      isOwnerPresent: participantsList.some((p) => p.userId === room.host.id),
    };
    onUpdateRoom?.(nextRoom);
    void syncFirestorePartyRoomState(room.id, isRoomHost, {
      seats: updatedSeats,
      seatRequests: nextRoom.seatRequests,
      numericParticipants: participantTotal,
      participantCount: String(participantTotal),
      mutedSeatIndices,
      isLocked: nextRoom.isLocked,
      allowJoin: nextRoom.allowJoin,
      announcement: nextRoom.announcement,
    });
  };

  // Cleanly exit party room (vacates seat, removes pending request, disconnects voice & leaves server room)
  const handleCleanLeaveParty = async () => {
    setShowExitRoomModal(false);
    setShowSettingsSheet(false);
    hasExplicitlyLeftRef.current = true;
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
    await Promise.all([
      liveAndRoomService.leavePartyRoom(room.id, currentUser.id).catch(() => {}),
      leaveFirestoreRoomParticipant(room.id).catch(() => {}),
    ]);
    onClose();
  };

  // Seat Click Handler
  const handleSeatClick = (index: number) => {
    const occupant = seats[index];
    const isMe = occupant?.id === currentUser.id;

    if (isMe) {
      setShowMySeatModal(index);
      return;
    }

    if (occupant) {
      if (isRoomHost && index !== 0) {
        setSelectedSeatMember({ index, user: occupant });
      } else {
        onSelectUser(occupant);
      }
      return;
    }

    if (isRoomHost) {
      const ownerSittingIdx = seats.findIndex((s) => s?.id === currentUser.id);
      if (ownerSittingIdx === -1) {
        setShowOwnerSeatChoice(index);
      } else {
        liveAndRoomService.fetchRoomParticipants(room.id, 1, 50).then((r) => setParticipantsList(r.participants));
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
    setShowRequestConfirmModal(false);
    try {
      const req = await roomService.requestSeat(
        room.id,
        currentUser,
        requestTargetSeat,
        room.host.id
      );
      const mappedReq: SeatRequest = {
        id: req?.id || `sr_${Date.now()}`,
        user: req?.user || currentUser,
        seatIndex: req?.requestedSeatIndex ?? requestTargetSeat,
        requestedAt: req?.createdAt || Date.now(),
      };
      const nextRequests: SeatRequest[] = [
        ...seatRequests.filter((r) => r.user.id !== currentUser.id),
        mappedReq,
      ];
      setSeatRequests(nextRequests);
      syncRoom(seats, nextRequests);
      showToast(`Join request sent for Seat #${requestTargetSeat + 1}`);
    } catch (err: any) {
      showToast(err?.message || 'Could not send seat request');
    }
  };

  const handleAcceptSeatRequest = async (req: SeatRequest) => {
    try {
      const res = await roomService.respondSeatRequest(
        room.id,
        currentUser.id,
        req.user.id,
        true,
        req.seatIndex
      );
      const nextSeats = normalizeSeats(res.seats, maxSeats);
      const nextRequests = seatRequests.filter((r) => r.id !== req.id);
      setSeats(nextSeats);
      setSeatRequests(nextRequests);
      syncRoom(nextSeats, nextRequests);
      showToast(`Approved ${req.user.name} for Seat #${req.seatIndex + 1}`);
    } catch {
      const updated = [...seats];
      const prevIdx = updated.findIndex((s) => s?.id === req.user.id);
      if (prevIdx !== -1) updated[prevIdx] = null;
      let targetIdx = req.seatIndex;
      if (updated[targetIdx] !== null) {
        const emptyIdx = updated.findIndex((s) => s === null);
        if (emptyIdx === -1) {
          showToast('All seats are currently full');
          return;
        }
        targetIdx = emptyIdx;
      }
      updated[targetIdx] = req.user;
      const nextRequests = seatRequests.filter((r) => r.id !== req.id);
      setSeats(updated);
      setSeatRequests(nextRequests);
      syncRoom(updated, nextRequests);
    }
  };

  const handleRejectSeatRequest = async (req: SeatRequest) => {
    try {
      await roomService.respondSeatRequest(
        room.id,
        currentUser.id,
        req.user.id,
        false,
        req.seatIndex
      );
    } catch {
      // local state update below
    }
    const nextRequests = seatRequests.filter((r) => r.id !== req.id);
    setSeatRequests(nextRequests);
    syncRoom(seats, nextRequests);
    showToast(`Declined request from ${req.user.name}`);
  };

  const handleToggleSeatMute = async (seatIndex: number) => {
    if (!isRoomHost) return;
    const currentlyMuted = mutedSeatIndices.includes(seatIndex);
    try {
      const nextMuted = await liveAndRoomService.muteRoomSeat(
        room.id,
        currentUser.id,
        seatIndex,
        !currentlyMuted
      );
      setMutedSeatIndices(nextMuted);
      showToast(!currentlyMuted ? `Muted Seat #${seatIndex + 1}` : `Unmuted Seat #${seatIndex + 1}`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update seat mute');
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedSeatMember) return;
    const idx = selectedSeatMember.index;
    const member = selectedSeatMember.user;
    try {
      await roomService.removeSeat(room.id, currentUser.id, idx);
    } catch {
      // update local state optimistically
    }
    const updated = [...seats];
    updated[idx] = null;
    setSeats(updated);
    syncRoom(updated);
    setSelectedSeatMember(null);
    showToast(`Removed ${member.name} from Seat #${idx + 1}`);
  };

  const handleSendSeatInvite = async (targetUser: UserProfile) => {
    if (showInviteToSeatModal === null) return;
    const targetSeat = showInviteToSeatModal;
    setShowInviteToSeatModal(null);
    try {
      const nextSeats = normalizeSeats(
        await liveAndRoomService.takeSeatDirect(room.id, currentUser.id, targetSeat, targetUser),
        maxSeats
      );
      setSeats(nextSeats);
      syncRoom(nextSeats);
      showToast(`Invited ${targetUser.name} to Seat #${targetSeat + 1}`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to assign seat');
    }
  };

  const handleAcceptSeatInvitation = async () => {
    if (!incomingSeatInvite) return;
    const idx = incomingSeatInvite.seatIndex;
    const updated = [...seats];
    const prevSeat = updated.findIndex((s) => s?.id === incomingSeatInvite.toUser.id);
    if (prevSeat !== -1) updated[prevSeat] = null;
    updated[idx] = incomingSeatInvite.toUser;
    setSeats(updated);
    syncRoom(updated);
    showToast(`Joined Seat #${idx + 1}`);
    setIncomingSeatInvite(null);
  };

  const handleOwnerTakeSeat = async (index: number) => {
    setShowOwnerSeatChoice(null);
    try {
      const nextSeats = normalizeSeats(
        await liveAndRoomService.takeSeatDirect(room.id, currentUser.id, index, currentUser),
        maxSeats
      );
      setSeats(nextSeats);
      syncRoom(nextSeats);
    } catch {
      const updated = [...seats];
      const prevSeat = updated.findIndex((s) => s?.id === currentUser.id);
      if (prevSeat !== -1) updated[prevSeat] = null;
      updated[index] = currentUser;
      setSeats(updated);
      syncRoom(updated);
    }
    showToast(`Took Seat #${index + 1}`);
  };

  const handleLeaveSeat = async (index: number) => {
    setShowMySeatModal(null);
    setShowExitRoomModal(false);
    try {
      const returnedSeats = await liveAndRoomService.leaveOwnSeat(room.id, currentUser.id);
      const nextSeats =
        returnedSeats.length > 0
          ? normalizeSeats(returnedSeats, maxSeats)
          : seats.map((s, i) => (i === index ? null : s));
      setSeats(nextSeats);
      syncRoom(nextSeats);
    } catch {
      const updated = [...seats];
      updated[index] = null;
      setSeats(updated);
      syncRoom(updated);
    }
    showToast(`Stepped down from Seat #${index + 1}`);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if (!text) return;

    setInputMessage('');
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
      void sendFirestoreRoomMessage(room.id, currentUser, text, isRoomHost, backendSaved.id);
    } catch {
      const fallbackId = `rm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      saved = await sendFirestoreRoomMessage(room.id, currentUser, text, isRoomHost, fallbackId);
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
                name: msgToAdd.senderName,
                avatar: msgToAdd.senderAvatar,
                text: msgToAdd.text,
                isHost: msgToAdd.isHost,
                type: 'chat',
              },
            ]
      );
      setTimeout(() => activityBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 40);
    } else {
      showToast('Could not send message. Please check your connection.');
      setInputMessage(text);
    }
  };

  const handleTriggerHeart = () => {
    const newHeart: FloatingHeart = {
      id: Date.now() + Math.random(),
      x: 75 + Math.random() * 15,
      size: 24 + Math.random() * 14,
      color: ['#FF2A85', '#FF6090', '#FA26A0', '#FFB703', '#9D4EDD'][Math.floor(Math.random() * 5)],
    };
    setFloatingHearts((prev) => [...prev, newHeart]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 2000);
    liveAndRoomService.sendRoomHeart(room.id, currentUser.id, 1);
  };

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

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-[#060212] flex flex-col justify-between overflow-hidden select-none text-white font-sans">
      {/* Background Stage Visuals */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#41106A]/75 via-[#16062B]/90 to-[#060212]" />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-[60%] opacity-35 blur-xl"
          style={{
            background:
              'radial-gradient(ellipse at top, rgba(255, 215, 0, 0.45) 0%, rgba(200, 80, 255, 0.25) 45%, transparent 75%)',
          }}
        />
      </div>

      {/* Floating Hearts */}
      {floatingHearts.map((heart) => (
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
      ))}

      {/* Toast Alert */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-[#FF007A] to-[#FA26A0] text-white text-xs font-black py-2 px-5 rounded-full shadow-2xl animate-fade-in pointer-events-none border border-white/25">
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
      <header className="relative z-30 flex items-center justify-between px-3 pt-safe pt-2.5 pb-2">
        <div className="flex items-center gap-2 max-w-[52%]">
          <button
            onClick={() => setShowExitRoomModal(true)}
            className="w-8 h-8 rounded-full bg-[#1F0C3B]/80 hover:bg-[#2C1252] border border-white/15 flex items-center justify-center text-white transition-all active:scale-95 shrink-0"
            title="Exit Party Options"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div
            onClick={() => onSelectUser(room.host)}
            className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform min-w-0"
          >
            {room.host.avatar ? (
              <img
                src={room.host.avatar}
                alt={room.host.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-[#FFDF00] shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#8B20FF] ring-2 ring-[#FFDF00] flex items-center justify-center text-xs font-black shrink-0">
                {(room.host.name || 'H').charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black text-white truncate leading-tight">
                {room.title}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] text-white/80 font-mono leading-tight">
                <span>ID: {room.displayId || room.id.slice(-5)}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-bold">{maxSeats} Seats</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Real-Time Top Viewers Avatar Stack + Participants Count Pill */}
          <button
            onClick={() => {
              liveAndRoomService
                .fetchRoomParticipants(room.id, 1, 50)
                .then((r) => {
                  setParticipantsList(r.participants);
                  setParticipantTotal(r.totalCount);
                });
              setShowParticipantsModal(true);
            }}
            className="flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full bg-[#1C0B35]/90 border border-white/15 text-white text-[10px] font-mono font-bold shadow hover:bg-[#2B1252] transition-colors"
            title="Real-Time Connected Viewers"
          >
            {participantsList.length > 0 && (
              <span className="flex items-center -space-x-1.5">
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
            <Users className="w-3 h-3 text-cyan-300" />
            <span>{participantTotal}</span>
          </button>

          {/* Real-Time Party Room & Global Leaderboard Trigger */}
          <button
            type="button"
            onClick={() => setShowLeaderboardModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-[#3A2208]/95 to-[#241136]/95 hover:from-[#4E2E0B] hover:to-[#32174A] border border-[#FFC84A]/50 text-[#FFC84A] text-[10px] font-black shadow transition-all active:scale-95 shrink-0"
            title="Open Party Leaderboard (Hourly, Daily, Weekly, Monthly)"
          >
            <Trophy className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Rank</span>
          </button>

          {/* Local Mic Mute (visible ONLY when currently seated) */}
          {isCurrentlySeated && (
            <button
              onClick={() => {
                if (isHostMutedOnMySeat) {
                  showToast('Your seat microphone is muted by Host');
                  return;
                }
                const next = !isMicMuted;
                setIsMicMuted(next);
                showToast(next ? 'Mic muted' : 'Mic active');
              }}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center transition-all active:scale-95 shadow shrink-0 ${
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

          {/* More / Room Settings */}
          <button
            onClick={() => setShowSettingsSheet(true)}
            className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1F0C3B]/80 hover:bg-[#2C1252] border border-white/15 flex items-center justify-center text-white transition-all active:scale-95 shrink-0"
            title="Room Settings"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
            {isRoomHost && seatRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FA26A0] text-[9px] font-black flex items-center justify-center">
                {seatRequests.length}
              </span>
            )}
          </button>

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

      {/* STAGE AREA */}
      <main className="flex-1 relative z-10 flex flex-col justify-start px-3 sm:px-5 overflow-y-auto no-scrollbar space-y-3">
        {/* Announcement Strip + Join Notice + Mic Permission / Autoplay Unlock Banners */}
        {roomAnnouncement && (
          <div className="max-w-md mx-auto w-full px-3 py-1.5 rounded-full bg-[#17092E]/85 border border-white/10 text-[11px] text-[#E6DCF8] text-center truncate">
            {roomAnnouncement}
          </div>
        )}

        {partyEntryNotice && (
          <div className="max-w-md mx-auto w-full flex justify-center animate-fade-in">
            <div className="px-4 py-1 rounded-full bg-gradient-to-r from-[#8B20FF]/90 to-[#FA26A0]/90 border border-white/25 text-white text-[11px] font-bold shadow-lg">
              {partyEntryNotice.name} joined the party room
            </div>
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

        {/* Quick Seated Action Strip (One-tap Mute & Leave Seat for both Host and Audience) */}
        {isCurrentlySeated && (
          <div className="max-w-md mx-auto w-full flex items-center justify-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-[10px] font-bold">
              On Seat #{userSeatIndex + 1} • {isMicMuted || isHostMutedOnMySeat ? 'Mic Muted' : 'Voice Live'}
            </span>
            <button
              type="button"
              onClick={() => handleLeaveSeat(userSeatIndex)}
              className="px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-[10px] font-extrabold active:scale-95 transition-all"
            >
              Leave Seat
            </button>
          </div>
        )}

        {/* HERO THRONES (Seat 0: Host Throne, Seat 1: Co-Host / Seat #2) */}
        <div className="flex items-center justify-center gap-6 sm:gap-12 pt-2 pb-1">
          {/* Seat 0: Host Seat (Renders actual occupant OR empty Host Seat if host stepped down) */}
          <div
            onClick={() => handleSeatClick(0)}
            className="flex flex-col items-center cursor-pointer group active:scale-95 transition-transform"
          >
            <div className="relative flex flex-col items-center">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 text-lg">👑</div>
              {Boolean(speakingSeats[0]) && seatZero && !mutedSeatIndices.includes(0) && (
                <div className="absolute -inset-2 rounded-full border-2 border-emerald-400 animate-ping opacity-80 z-0" />
              )}
              <div className="relative z-10 w-18 h-18 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-tr from-[#9B7110] via-[#FFDF00] to-[#FFE770] shadow-[0_0_22px_rgba(255,223,0,0.5)]">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#160A2B] border-2 border-[#FFDF00] flex items-center justify-center">
                  {seatZero ? (
                    seatZero.avatar ? (
                      <img src={seatZero.avatar} alt={seatZero.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-black text-white">
                        {(seatZero.name || 'H').charAt(0).toUpperCase()}
                      </span>
                    )
                  ) : (
                    <Plus className="w-6 h-6 text-[#FFDF00]/80" />
                  )}
                </div>
                {seatZero && (mutedSeatIndices.includes(0) || (seatZero.id === currentUser.id && isMicMuted)) && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-600 border border-white flex items-center justify-center">
                    <MicOff className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div className="relative z-20 -mt-2.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black text-[9px] font-black uppercase shadow">
                Host
              </div>
              <span className="mt-1 text-xs font-black text-white truncate max-w-[95px]">
                {seatZero ? seatZero.name : isRoomHost ? 'Take Seat' : 'Empty'}
              </span>
            </div>
          </div>

          {/* Seat 1: Co-Host / Seat #2 */}
          <div
            onClick={() => handleSeatClick(1)}
            className="flex flex-col items-center cursor-pointer group active:scale-95 transition-transform"
          >
            <div className="relative flex flex-col items-center">
              {Boolean(speakingSeats[1]) && seatOne && !mutedSeatIndices.includes(1) && (
                <div className="absolute -inset-2 rounded-full border-2 border-emerald-400 animate-ping opacity-80 z-0" />
              )}
              <div className="relative z-10 w-18 h-18 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-tr from-[#9D0208] via-[#FA26A0] to-[#FF70A6] shadow-[0_0_22px_rgba(250,38,160,0.5)]">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#160A2B] border-2 border-[#FA26A0] flex items-center justify-center">
                  {seatOne ? (
                    seatOne.avatar ? (
                      <img src={seatOne.avatar} alt={seatOne.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-black text-white">
                        {(seatOne.name || 'S').charAt(0).toUpperCase()}
                      </span>
                    )
                  ) : isSeatLocked ? (
                    <Lock className="w-5 h-5 text-white/50" />
                  ) : (
                    <Plus className="w-6 h-6 text-white/80" />
                  )}
                </div>
                {seatOne && (
                  <div
                    className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border border-white flex items-center justify-center ${
                      mutedSeatIndices.includes(1) || (seatOne.id === currentUser.id && isMicMuted)
                        ? 'bg-rose-600'
                        : 'bg-[#160A2B]'
                    }`}
                  >
                    {mutedSeatIndices.includes(1) || (seatOne.id === currentUser.id && isMicMuted) ? (
                      <MicOff className="w-3 h-3 text-white" />
                    ) : (
                      <Mic className="w-3 h-3 text-emerald-400" />
                    )}
                  </div>
                )}
              </div>
              <div className="relative z-20 -mt-2.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#FA26A0] to-[#FF007A] text-white text-[9px] font-black uppercase shadow">
                Seat 2
              </div>
              <span className="mt-1 text-xs font-bold text-white/90 truncate max-w-[95px]">
                {seatOne ? seatOne.name : 'Join'}
              </span>
            </div>
          </div>
        </div>

        {/* DYNAMIC PARTICIPANT SEATS GRID (6 remaining for 8-seat, 14 remaining for 16-seat) */}
        <div className={`grid ${gridColsClass} gap-2.5 max-w-lg mx-auto w-full pt-1`}>
          {remainingSeatIndices.map((idx) => {
            const member = seats[idx];
            const isSeatMuted = mutedSeatIndices.includes(idx) || (member?.id === currentUser.id && isMicMuted);
            const isSpeaking = Boolean(speakingSeats[idx]) && Boolean(member) && !isSeatMuted;

            return (
              <div
                key={idx}
                onClick={() => handleSeatClick(idx)}
                className="flex flex-col items-center cursor-pointer group active:scale-95 transition-transform"
              >
                <div className="relative flex flex-col items-center">
                  {isSpeaking && (
                    <div className="absolute -inset-1 rounded-full border-2 border-emerald-400 animate-ping opacity-80 z-0" />
                  )}

                  <div
                    className={`relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full p-0.5 flex items-center justify-center ${
                      member
                        ? 'bg-gradient-to-tr from-[#D4AF37] via-[#FFDF00] to-[#AA7C11]'
                        : 'bg-gradient-to-tr from-[#0096C7] via-[#00B4D8] to-[#48CAE4]'
                    }`}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden bg-[#160A2B] flex items-center justify-center">
                      {member ? (
                        member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-black text-white">
                            {(member.name || 'U').charAt(0).toUpperCase()}
                          </span>
                        )
                      ) : isSeatLocked ? (
                        <Lock className="w-4 h-4 text-white/40" />
                      ) : (
                        <Plus className="w-5 h-5 text-white/80" />
                      )}
                    </div>

                    {member && (
                      <div
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border border-white/30 ${
                          isSeatMuted ? 'bg-rose-600' : isSpeaking ? 'bg-emerald-500' : 'bg-[#0E061B]'
                        }`}
                      >
                        {isSeatMuted ? (
                          <MicOff className="w-2.5 h-2.5 text-white" />
                        ) : (
                          <Mic className="w-2.5 h-2.5 text-cyan-300" />
                        )}
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] sm:text-[11px] font-bold text-white mt-1 truncate max-w-[68px] text-center">
                    {member ? member.name.split(' ')[0] : `No.${idx + 1}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* LIVE ROOM CHAT / ACTIVITY FEED */}
        <div className="flex items-end justify-between gap-3 pt-2 pb-1 max-w-lg mx-auto w-full flex-1 min-h-[120px]">
          <div className="flex-1 space-y-1.5 max-h-44 overflow-y-auto no-scrollbar pr-1">
            {activities.length === 0 ? (
              <div className="px-3 py-1.5 rounded-full bg-[#17092E]/70 border border-white/10 text-[11px] text-[#B9AECF] w-fit">
                Say hi to start the conversation in {room.title}.
              </div>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#17092E]/85 backdrop-blur-md border border-purple-500/30 text-[11px] shadow-sm w-fit max-w-full"
                >
                  {act.avatar ? (
                    <img
                      src={act.avatar}
                      alt={act.name}
                      className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-yellow-400"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[#8B20FF] text-[9px] font-black flex items-center justify-center shrink-0">
                      {(act.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex items-baseline gap-1 text-[11px] truncate">
                    <span className="font-extrabold text-[#FFE043] shrink-0">{act.name}:</span>
                    <span className="text-white/95 font-medium truncate">{act.text}</span>
                  </div>
                </div>
              ))
            )}
            <div ref={activityBottomRef} />
          </div>

          {/* Gift Box Shortcut */}
          <button
            type="button"
            onClick={handleOpenGiftModal}
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#6B21A8] via-[#FA26A0] to-[#FFDF00] p-0.5 shadow-[0_0_20px_rgba(250,38,160,0.6)] active:scale-95 transition-transform shrink-0"
            title="Send Room Gift"
          >
            <div className="w-full h-full rounded-[14px] bg-[#160A2B] flex items-center justify-center text-2xl">
              🎁
            </div>
          </button>
        </div>
      </main>

      {/* BOTTOM BAR */}
      <footer className="relative z-30 px-3 pb-safe pb-3 pt-2 bg-gradient-to-t from-[#060212] via-[#0D041B]/95 to-transparent">
        <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
          <button
            onClick={handleOpenGiftModal}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#9D0208] via-[#FA26A0] to-[#FF007A] flex items-center justify-center text-white shadow-[0_0_22px_rgba(250,38,160,0.8)] border border-white/30 active:scale-95 transition-all shrink-0"
            title="Open Gift Shop"
          >
            <span className="text-2xl">🎁</span>
          </button>

          <form
            onSubmit={handleSendMessage}
            className="flex-1 flex items-center bg-[#170B2E]/90 border border-purple-500/30 focus-within:border-[#FA26A0] rounded-full px-3.5 py-2.5 transition-colors backdrop-blur-md"
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
              type="text"
              placeholder="Say Hi..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-white/50 outline-none font-medium"
            />
            {inputMessage.trim() && (
              <button
                type="submit"
                className="w-7 h-7 rounded-full bg-[#FA26A0] text-white flex items-center justify-center shrink-0 ml-1 shadow"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          <button
            onClick={handleTriggerHeart}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#9D0208] via-[#FA26A0] to-[#FF007A] flex items-center justify-center text-white shadow-[0_0_22px_rgba(250,38,160,0.8)] border border-white/30 active:scale-90 transition-all shrink-0"
            title="Send Heart"
          >
            <span className="text-2xl">💖</span>
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
                participantsList.map((p) => (
                  <div
                    key={p.userId}
                    onClick={() => {
                      setShowParticipantsModal(false);
                      onSelectUser({
                        id: p.userId,
                        displayId: p.userId.slice(-6).toUpperCase(),
                        name: p.name,
                        username: p.username || `@${p.name.toLowerCase().replace(/\s+/g, '')}`,
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
                      });
                    }}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-[#200E38] border border-white/5 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {p.avatar ? (
                        <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#8B20FF] text-xs font-black flex items-center justify-center">
                          {(p.name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-bold text-white truncate">{p.name}</span>
                    </div>
                    {p.isHost && (
                      <span className="px-2 py-0.5 rounded bg-[#FFC84A] text-black text-[9px] font-black">
                        HOST
                      </span>
                    )}
                  </div>
                ))
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

            {isRoomHost ? (
              <div className="space-y-2">
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

      {/* INVITE CONNECTED PARTICIPANT TO SEAT MODAL */}
      {showInviteToSeatModal !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#160A2B] border-t border-white/15 rounded-t-3xl p-5 shadow-2xl flex flex-col max-h-[75vh]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div>
                <h3 className="text-sm font-black text-white">Invite to Seat #{showInviteToSeatModal + 1}</h3>
                <p className="text-[10px] text-white/60">Select a connected listener to invite</p>
              </div>
              <button
                onClick={() => setShowInviteToSeatModal(null)}
                className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto no-scrollbar flex-1 py-1">
              {(() => {
                const eligibleListeners = participantsList.filter(
                  (p) => !seats.some((s) => s?.id === p.userId)
                );
                if (eligibleListeners.length === 0) {
                  return (
                    <p className="text-xs text-white/60 text-center py-8">
                      No unseated listeners are in the room right now.
                    </p>
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
                  return (
                    <div
                      key={p.userId}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-[#200E38] border border-white/5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.avatar ? (
                          <img src={p.avatar} alt={p.name} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#8B20FF] text-xs font-black flex items-center justify-center">
                            {(p.name || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-bold text-white truncate">{p.name}</span>
                      </div>
                      <button
                        onClick={() => handleSendSeatInvite(memberProfile)}
                        className="px-3.5 py-1.5 rounded-full bg-[#FA26A0] text-white text-xs font-bold shrink-0"
                      >
                        Seat User
                      </button>
                    </div>
                  );
                });
              })()}
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

      {/* MANAGE OCCUPIED SEAT PARTICIPANT (HOST CONTROLS) */}
      {selectedSeatMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#160A2B] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              {selectedSeatMember.user.avatar ? (
                <img
                  src={selectedSeatMember.user.avatar}
                  alt={selectedSeatMember.user.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-[#FA26A0]"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#8B20FF] text-sm font-black flex items-center justify-center ring-2 ring-[#FA26A0]">
                  {(selectedSeatMember.user.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">{selectedSeatMember.user.name}</span>
                <span className="text-[10px] text-[#FA26A0] font-mono">
                  Seat #{selectedSeatMember.index + 1}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  const target = selectedSeatMember.user;
                  setSelectedSeatMember(null);
                  onSelectUser(target);
                }}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <span>View User Profile</span>
              </button>

              <button
                onClick={() => {
                  const idx = selectedSeatMember.index;
                  setSelectedSeatMember(null);
                  handleToggleSeatMute(idx);
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold flex items-center justify-center gap-2"
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
                onClick={handleRemoveMember}
                className="w-full py-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-2"
              >
                <UserX className="w-4 h-4" />
                <span>Remove from Seat</span>
              </button>

              <button
                onClick={() => setSelectedSeatMember(null)}
                className="w-full py-2 rounded-xl text-white/50 text-xs font-medium"
              >
                Cancel
              </button>
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
      <LiveLeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        mode="party"
        contextId={room.id}
        contextTitle={room.title}
        currentUser={currentUser}
        onSelectUser={onSelectUser}
      />
    </div>
  );
};
