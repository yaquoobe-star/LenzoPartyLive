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
} from 'lucide-react';
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
  stopMediaStream,
  createAudioAnalyser,
  AudioAnalyserController,
} from '../../utils/mediaDeviceHelper';
import { agoraRtcService } from '../../utils/agoraRtcService';
import { liveAndRoomService } from '../../services/liveAndRoomService';
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

  const normalizeSeats = (raw?: (UserProfile | null)[], count = maxSeats): (UserProfile | null)[] => {
    const arr: (UserProfile | null)[] = Array(count).fill(null);
    if (Array.isArray(raw)) {
      for (let i = 0; i < Math.min(count, raw.length); i++) {
        arr[i] = raw[i] || null;
      }
    }
    if (!arr[0] && room.host) {
      arr[0] = room.host;
    }
    return arr;
  };

  const [seats, setSeats] = useState<(UserProfile | null)[]>(() => normalizeSeats(room.seats, maxSeats));
  const [mutedSeatIndices, setMutedSeatIndices] = useState<number[]>(room.mutedSeatIndices || []);
  const [seatRequests, setSeatRequests] = useState<SeatRequest[]>(room.seatRequests || []);
  const [participantsList, setParticipantsList] = useState<LiveViewerInfo[]>([]);
  const [participantTotal, setParticipantTotal] = useState<number>(room.numericParticipants || 1);

  const userSeatIndex = seats.findIndex((s) => s?.id === currentUser.id);
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

  // Microphone, Speaker & Real Speaking States (NO simulated Math.random intervals)
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [speakingSeats, setSpeakingSeats] = useState<Record<number, number>>({});
  const [realMicVolume, setRealMicVolume] = useState(0);
  const [agoraVoiceState, setAgoraVoiceState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const realMicStreamRef = useRef<MediaStream | null>(null);
  const realMicAnalyserRef = useRef<AudioAnalyserController | null>(null);
  const realMicRafRef = useRef<number | null>(null);
  const seatsRef = useRef<(UserProfile | null)[]>(seats);
  seatsRef.current = seats;

  // Settings & Announcements
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
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

  // Real-Time Backend & WebSocket Room Lifecycle
  useEffect(() => {
    let active = true;
    liveAndRoomService.setCurrentUser(currentUser.id);
    liveAndRoomService.subscribeRoom(room.id, currentUser.id);

    liveAndRoomService
      .joinPartyRoom(room.id, currentUser, room.password)
      .then((res) => {
        if (!active) return;
        if (res.room) {
          setSeats(normalizeSeats(res.room.seats, res.room.maxSeats || maxSeats));
          setMutedSeatIndices(res.room.mutedSeatIndices || []);
          setIsSeatLocked(Boolean(res.room.isLocked));
          setIsAllowJoin(res.room.allowJoin !== false);
          if (res.room.announcement) setRoomAnnouncement(res.room.announcement);
          if (typeof res.room.numericParticipants === 'number') {
            setParticipantTotal(res.room.numericParticipants);
          }
        }
        if (Array.isArray(res.pendingRequests)) {
          setSeatRequests(res.pendingRequests);
        }
        if (Array.isArray(res.messages)) {
          setActivities(
            res.messages.map((m) => ({
              id: m.id,
              name: m.senderName,
              avatar: m.senderAvatar,
              text: m.text,
              isHost: m.isHost,
              type: m.gift ? 'gift' : m.isSystem ? 'join' : 'chat',
            }))
          );
        }
      })
      .catch((err) => {
        console.warn('[AudioRoom] Join notice:', err?.message || err);
      });

    liveAndRoomService.fetchRoomParticipants(room.id, 1, 50).then((res) => {
      if (!active) return;
      setParticipantsList(res.participants);
      if (res.totalCount > 0) setParticipantTotal(res.totalCount);
    });

    const unsubWs = liveAndRoomService.addEventListener((event, payload) => {
      if (!active || payload?.roomId !== room.id) return;

      if (event === 'room:updated' && payload.room) {
        const nextRoom: PartyRoom = payload.room;
        setSeats(normalizeSeats(nextRoom.seats, nextRoom.maxSeats || maxSeats));
        if (Array.isArray(nextRoom.mutedSeatIndices)) {
          setMutedSeatIndices(nextRoom.mutedSeatIndices);
        }
        setIsSeatLocked(Boolean(nextRoom.isLocked));
        setIsAllowJoin(nextRoom.allowJoin !== false);
        if (nextRoom.announcement !== undefined) setRoomAnnouncement(nextRoom.announcement);
        if (typeof nextRoom.numericParticipants === 'number') {
          setParticipantTotal(nextRoom.numericParticipants);
        }
        onUpdateRoom?.(nextRoom);
      } else if (event === 'room:seat_muted' && Array.isArray(payload.mutedSeatIndices)) {
        setMutedSeatIndices(payload.mutedSeatIndices);
      } else if (event === 'room:seat_request' && Array.isArray(payload.pendingRequests)) {
        setSeatRequests(payload.pendingRequests);
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
          showToast('Host has closed the room');
          setTimeout(() => {
            if (active) onClose();
          }, 1200);
        }
      }
    });

    return () => {
      active = false;
      unsubWs();
      liveAndRoomService.unsubscribeRoom();
      if (!isRoomHost) {
        liveAndRoomService.leavePartyRoom(room.id, currentUser.id);
      }
    };
  }, [room.id, currentUser.id, isRoomHost]);

  // Agora RTC Engine Setup
  useEffect(() => {
    let isMounted = true;
    const isSeated = userSeatIndex !== -1 || currentUser.id === room.host.id;
    const effectiveMuted = isMicMuted || isHostMutedOnMySeat;
    const initialRole: 'host' | 'audience' = isSeated ? 'host' : 'audience';

    const joinPartyAgora = async () => {
      try {
        setAgoraVoiceState('connecting');
        const config = await agoraRtcService.getAgoraConfig();
        if (!isMounted) return;
        if (!config.configured || !config.appId) {
          setAgoraVoiceState('disconnected');
          return;
        }
        const tokenData = await agoraRtcService.requestRtcToken(
          `party_${room.id}`,
          currentUser.id,
          isSeated ? 'broadcaster' : 'audience'
        );
        if (!isMounted || !tokenData.token) {
          setAgoraVoiceState('disconnected');
          return;
        }
        await agoraRtcService.joinChannel({
          appId: config.appId,
          channelName: `party_${room.id}`,
          userAccount: currentUser.id,
          role: initialRole,
          token: tokenData.token,
          enableVideo: false,
          enableAudio: isSeated && !effectiveMuted,
        });
        if (isMounted) setAgoraVoiceState('connected');
      } catch (err) {
        console.warn('[Party Live Agora] Join warning:', err);
        if (isMounted) setAgoraVoiceState('disconnected');
      }
    };

    joinPartyAgora();

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
      unsubVolumes();
      agoraRtcService.leaveChannel().catch(() => {});
    };
  }, [room.id]);

  // Synchronize dynamic seat/mute role changes with Agora RTC
  useEffect(() => {
    const isSeated = userSeatIndex !== -1 || currentUser.id === room.host.id;
    const effectiveMuted = isMicMuted || isHostMutedOnMySeat;
    const targetRole: 'host' | 'audience' = isSeated ? 'host' : 'audience';
    agoraRtcService
      .switchRole(targetRole, {
        enableVideo: false,
        enableAudio: isSeated && !effectiveMuted,
      })
      .catch(() => {});
  }, [userSeatIndex, currentUser.id, room.host.id, isMicMuted, isHostMutedOnMySeat]);

  // Real local microphone capture when seated and unmuted
  useEffect(() => {
    let isSubscribed = true;
    const effectiveMuted = isMicMuted || isHostMutedOnMySeat;

    const setupRealMic = async () => {
      const isSeated = userSeatIndex !== -1 || currentUser.id === room.host.id;
      if (isSeated && !effectiveMuted) {
        try {
          if (!realMicStreamRef.current) {
            const stream = await acquireRealMicrophone();
            if (!isSubscribed) {
              stopMediaStream(stream);
              return;
            }
            realMicStreamRef.current = stream;
            realMicAnalyserRef.current = createAudioAnalyser(stream);
          } else {
            realMicStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = true));
          }

          const pollVolume = () => {
            if (!isSubscribed) return;
            if (realMicAnalyserRef.current && !effectiveMuted) {
              const vol = realMicAnalyserRef.current.getVolumeLevel();
              setRealMicVolume(vol);
              if (vol > 8 && userSeatIndex !== -1) {
                setSpeakingSeats((prev) => ({ ...prev, [userSeatIndex]: Date.now() }));
              }
            } else {
              setRealMicVolume(0);
            }
            realMicRafRef.current = requestAnimationFrame(pollVolume);
          };

          realMicRafRef.current = requestAnimationFrame(pollVolume);
        } catch (err) {
          console.warn('Real microphone not available in room:', err);
        }
      } else {
        if (realMicStreamRef.current) {
          realMicStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
        }
        setRealMicVolume(0);
      }
    };

    setupRealMic();

    return () => {
      isSubscribed = false;
      if (realMicRafRef.current) cancelAnimationFrame(realMicRafRef.current);
    };
  }, [userSeatIndex, isMicMuted, isHostMutedOnMySeat, room.host.id, currentUser.id]);

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
    const seatedCount = updatedSeats.filter(Boolean).length;
    const nextRoom: PartyRoom = {
      ...room,
      seats: updatedSeats,
      mutedSeatIndices,
      numericParticipants: Math.max(participantTotal, seatedCount),
      participantCount: `${Math.max(participantTotal, seatedCount)}/${maxSeats}`,
      isLocked: updatedLocked !== undefined ? updatedLocked : isSeatLocked,
      allowJoin: updatedAllowJoin !== undefined ? updatedAllowJoin : isAllowJoin,
      announcement: updatedAnnouncement !== undefined ? updatedAnnouncement : roomAnnouncement,
      seatRequests: updatedRequests !== undefined ? updatedRequests : seatRequests,
      isOwnerPresent: isRoomHost,
    };
    onUpdateRoom?.(nextRoom);
  };

  // Seat Click Handler
  const handleSeatClick = (index: number) => {
    const occupant = seats[index];
    const isMe = occupant?.id === currentUser.id;

    if (isMe) {
      handleLeaveSeat(index);
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
    if (index === 0 && isRoomHost) {
      onSelectUser(currentUser);
      return;
    }
    try {
      const nextSeats = normalizeSeats(
        await liveAndRoomService.leaveOwnSeat(room.id, currentUser.id),
        maxSeats
      );
      setSeats(nextSeats);
      syncRoom(nextSeats);
    } catch {
      const updated = [...seats];
      updated[index] = null;
      setSeats(updated);
      syncRoom(updated);
    }
    showToast(`Left Seat #${index + 1}`);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if (!text) return;

    setInputMessage('');
    setShowEmojiPicker(false);

    try {
      const saved = await liveAndRoomService.sendRoomChat(room.id, currentUser, text);
      setActivities((prev) =>
        prev.some((a) => a.id === saved.id)
          ? prev
          : [
              ...prev,
              {
                id: saved.id,
                name: saved.senderName,
                avatar: saved.senderAvatar,
                text: saved.text,
                isHost: saved.isHost,
                type: 'chat',
              },
            ]
      );
      setTimeout(() => activityBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 40);
    } catch (err: any) {
      showToast(err?.message || 'Could not send message');
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

  const seatZero = seats[0] || room.host;
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
        <div className="flex items-center gap-2 max-w-[55%]">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1F0C3B]/80 hover:bg-[#2C1252] border border-white/15 flex items-center justify-center text-white transition-all active:scale-95 shrink-0"
            title="Leave Room View"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div
            onClick={() => onSelectUser(seatZero)}
            className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform min-w-0"
          >
            {seatZero.avatar ? (
              <img
                src={seatZero.avatar}
                alt={seatZero.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-[#FFDF00] shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#8B20FF] ring-2 ring-[#FFDF00] flex items-center justify-center text-xs font-black shrink-0">
                {(seatZero.name || 'H').charAt(0).toUpperCase()}
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
          {/* Participants Count Pill */}
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
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1C0B35]/90 border border-white/15 text-white text-[10px] font-mono font-bold shadow"
          >
            <Users className="w-3 h-3 text-cyan-300" />
            <span>{participantTotal}</span>
          </button>

          {/* Real Coin Balance Pill */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1C0B35]/90 border border-[#D4AF37]/60 text-white text-[10px] font-mono font-black shadow">
            <span className="text-[#FFDF00]">🪙</span>
            <span>{(currentUser.coins || 0).toLocaleString()}</span>
            {onOpenWallet && (
              <button
                onClick={onOpenWallet}
                className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-[#FF007A] to-[#FA26A0] text-white flex items-center justify-center text-[9px] font-black ml-0.5"
                title="Recharge Coins"
              >
                +
              </button>
            )}
          </div>

          {/* Local Mic Mute (visible when seated) */}
          {(userSeatIndex !== -1 || isRoomHost) && (
            <button
              onClick={() => {
                if (isHostMutedOnMySeat) {
                  showToast('Your seat microphone is muted by Host');
                  return;
                }
                const next = !isMicMuted;
                setIsMicMuted(next);
                agoraRtcService.setMicrophoneMuted(next);
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
              agoraRtcService.setSpeakerMuted(next);
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
        </div>
      </header>

      {/* STAGE AREA */}
      <main className="flex-1 relative z-10 flex flex-col justify-start px-3 sm:px-5 overflow-y-auto no-scrollbar space-y-3">
        {/* Announcement Strip */}
        {roomAnnouncement && (
          <div className="max-w-md mx-auto w-full px-3 py-1.5 rounded-full bg-[#17092E]/85 border border-white/10 text-[11px] text-[#E6DCF8] text-center truncate">
            {roomAnnouncement}
          </div>
        )}

        {/* HERO THRONES (Seat 0: Host Owner, Seat 1: Co-Host / Seat #2) */}
        <div className="flex items-center justify-center gap-6 sm:gap-12 pt-2 pb-1">
          {/* Seat 0: Host Owner */}
          <div
            onClick={() => handleSeatClick(0)}
            className="flex flex-col items-center cursor-pointer group active:scale-95 transition-transform"
          >
            <div className="relative flex flex-col items-center">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 text-lg">👑</div>
              {Boolean(speakingSeats[0]) && !mutedSeatIndices.includes(0) && (
                <div className="absolute -inset-2 rounded-full border-2 border-emerald-400 animate-ping opacity-80 z-0" />
              )}
              <div className="relative z-10 w-18 h-18 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-tr from-[#9B7110] via-[#FFDF00] to-[#FFE770] shadow-[0_0_22px_rgba(255,223,0,0.5)]">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#160A2B] border-2 border-[#FFDF00] flex items-center justify-center">
                  {seatZero.avatar ? (
                    <img src={seatZero.avatar} alt={seatZero.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-black text-white">
                      {(seatZero.name || 'H').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {(mutedSeatIndices.includes(0) || (isRoomHost && isMicMuted)) && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-600 border border-white flex items-center justify-center">
                    <MicOff className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div className="relative z-20 -mt-2.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black text-[9px] font-black uppercase shadow">
                Host
              </div>
              <span className="mt-1 text-xs font-black text-white truncate max-w-[95px]">
                {seatZero.name}
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
                    Step Down From Seat #{userSeatIndex + 1}
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowSettingsSheet(false);
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Leave Room</span>
                </button>
              </div>
            )}
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
              <span className="text-white font-bold">{seatZero.name}</span>.
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
                  if (realMicAnalyserRef.current) realMicAnalyserRef.current.cleanup();
                  if (realMicStreamRef.current) stopMediaStream(realMicStreamRef.current);
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
    </div>
  );
};
