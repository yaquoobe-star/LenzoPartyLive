import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  MoreHorizontal, 
  Mic, 
  MicOff, 
  Gift, 
  Plus, 
  Heart, 
  Send, 
  X, 
  Smile, 
  Sparkles, 
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
  AlertTriangle
} from 'lucide-react';
import { PartyRoom, UserProfile, GiftItem, SeatRequest, SeatInvitation } from '../../types';
import { MOCK_USERS, MOCK_GIFTS } from '../../data/mockData';
import { 
  acquireRealMicrophone, 
  stopMediaStream, 
  createAudioAnalyser, 
  AudioAnalyserController 
} from '../../utils/mediaDeviceHelper';
import { agoraRtcService } from '../../utils/agoraRtcService';

interface AudioRoomScreenProps {
  room: PartyRoom;
  currentUser: UserProfile;
  onClose: () => void;
  onOpenGiftShop?: (recipient: UserProfile) => void;
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
  time?: string;
  isHost?: boolean;
  type?: 'join' | 'vip' | 'chat' | 'gift';
}

interface FloatingHeart {
  id: number;
  x: number;
  size: number;
  color: string;
}

// Preset participant seeds matching the exact reference image
const REFERENCE_SEATS_SEED: (UserProfile | null)[] = [
  // Seat 0: Owner (Mr KHIZAR)
  {
    id: 'user_host_khizar',
    displayId: '4528',
    name: 'Mr KHIZAR',
    username: '@mrkhizar',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1000&auto=format&fit=crop&q=80',
    bio: 'Music Lovers Room Owner 👑 | Vibe with the best tracks 🎵',
    level: 55,
    vipLevel: 5,
    isVIP: true,
    fansCount: '1.4M',
    followingCount: 320,
    likesCount: '9.2M',
    coins: 78900,
    diamonds: 45000,
    gender: 'male',
    isFollowing: false,
  },
  // Seat 1: VIP (Zara Khan)
  {
    id: 'user_vip_zara',
    displayId: '8820',
    name: 'Zara Khan',
    username: '@zarakhan',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1000&auto=format&fit=crop&q=80',
    bio: 'VIP Queen ✨ Singing & Laughs daily 💖',
    level: 48,
    vipLevel: 5,
    isVIP: true,
    fansCount: '890K',
    followingCount: 210,
    likesCount: '5.8M',
    coins: 42000,
    diamonds: 21000,
    gender: 'female',
    isFollowing: true,
  },
  // Seat 2 (Row 1 - #1): Sweetie (1.5K)
  {
    id: 'user_sweetie',
    displayId: '5549',
    name: 'Sweetie',
    username: '@sweetie',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1000&auto=format&fit=crop&q=80',
    bio: 'Late night chill, acoustic songs 🌸',
    level: 38,
    vipLevel: 3,
    isVIP: true,
    fansCount: '450K',
    followingCount: 140,
    likesCount: '3.1M',
    coins: 12000,
    diamonds: 1500,
    gender: 'female',
    isFollowing: false,
  },
  // Seat 3 (Row 1 - #2): Kami Sandhu (2.5K)
  {
    id: 'user_kami_sandhu',
    displayId: '6612',
    name: 'Kami Sandhu',
    username: '@kamisandhu',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1000&auto=format&fit=crop&q=80',
    bio: 'Live guitar & party vibes ⚡',
    level: 41,
    vipLevel: 4,
    isVIP: true,
    fansCount: '620K',
    followingCount: 190,
    likesCount: '4.2M',
    coins: 18000,
    diamonds: 2500,
    gender: 'male',
    isFollowing: false,
  },
  // Seat 4 (Row 1 - #3): Bilal (630)
  {
    id: 'user_bilal',
    displayId: '7731',
    name: 'Bilal',
    username: '@bilal_pk',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop&q=80',
    bio: 'Good vibes only 🎵 Enjoying the beats',
    level: 32,
    vipLevel: 2,
    isVIP: false,
    fansCount: '210K',
    followingCount: 80,
    likesCount: '1.4M',
    coins: 6500,
    diamonds: 630,
    gender: 'male',
    isFollowing: false,
  },
  // Seat 5 (Row 1 - #4): Faheem (2K)
  {
    id: 'user_faheem',
    displayId: '8842',
    name: 'Faheem',
    username: '@faheem_music',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1000&auto=format&fit=crop&q=80',
    bio: 'Music producer & sound architect 🎧',
    level: 39,
    vipLevel: 3,
    isVIP: true,
    fansCount: '340K',
    followingCount: 150,
    likesCount: '2.8M',
    coins: 14000,
    diamonds: 2000,
    gender: 'male',
    isFollowing: false,
  },
  // Seat 6 (Row 1 - #5): Ilyas (15K)
  {
    id: 'user_ilyas',
    displayId: '9920',
    name: 'Ilyas',
    username: '@ilyas_star',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1000&auto=format&fit=crop&q=80',
    bio: 'Top contributor & royal supporter 💎',
    level: 52,
    vipLevel: 5,
    isVIP: true,
    fansCount: '950K',
    followingCount: 280,
    likesCount: '7.4M',
    coins: 95000,
    diamonds: 15000,
    gender: 'male',
    isFollowing: false,
  },
  // Seat 7 (Row 2 - #6): Aslang (1.5K)
  {
    id: 'user_aslang',
    displayId: '3310',
    name: 'Aslang',
    username: '@aslang',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1000&auto=format&fit=crop&q=80',
    bio: 'Royal stage regular 👑 chilling with friends',
    level: 36,
    vipLevel: 3,
    isVIP: true,
    fansCount: '310K',
    followingCount: 110,
    likesCount: '1.9M',
    coins: 8900,
    diamonds: 1500,
    gender: 'male',
    isFollowing: false,
  },
  // Seat 8 (Row 2 - #7): Empty (No.7)
  null,
  // Seat 9 (Row 2 - #8): Empty (No.8)
  null,
  // Seat 10 (Row 2 - #9): Empty (No.9)
  null,
  // Seat 11 (Row 2 - #10): Empty (No.10)
  null,
];

export const AudioRoomScreen: React.FC<AudioRoomScreenProps> = ({
  room,
  currentUser,
  onClose,
  onSelectUser,
  onUpdateRoom,
  onCloseRoom,
}) => {
  // Host role detection
  const isRoomHost = currentUser.id === room.host.id;

  // Total 12 seats: 2 Hero Thrones (0: Owner, 1: VIP) + 10 Participant seats (2 to 11)
  const [seats, setSeats] = useState<(UserProfile | null)[]>(() => {
    // If incoming room already has seats array, use it; otherwise initialize with reference seed
    if (room.seats && room.seats.length >= 12) {
      return [...room.seats.slice(0, 12)];
    }
    const initial = [...REFERENCE_SEATS_SEED];
    // If current user is host, make sure host avatar and name are in Seat 0
    if (isRoomHost) {
      initial[0] = { ...currentUser, name: currentUser.name || 'Mr KHIZAR' };
    } else if (room.host) {
      initial[0] = { ...room.host, name: room.host.name || 'Mr KHIZAR' };
    }
    return initial;
  });

  // Index of current user on room seats (-1 if not seated)
  const userSeatIndex = seats.findIndex((s) => s?.id === currentUser.id);

  // Seat Requests & Invitations
  const [seatRequests, setSeatRequests] = useState<SeatRequest[]>(room.seatRequests || []);
  const [showSeatRequestsModal, setShowSeatRequestsModal] = useState<boolean>(false);
  const [requestTargetSeat, setRequestTargetSeat] = useState<number | null>(null);
  const [showRequestConfirmModal, setShowRequestConfirmModal] = useState<boolean>(false);
  const [showInviteToSeatModal, setShowInviteToSeatModal] = useState<number | null>(null);
  const [incomingSeatInvite, setIncomingSeatInvite] = useState<SeatInvitation | null>(null);
  const [selectedSeatMember, setSelectedSeatMember] = useState<{ index: number; user: UserProfile } | null>(null);
  const [showOwnerSeatChoice, setShowOwnerSeatChoice] = useState<number | null>(null);
  const [showCloseRoomConfirmModal, setShowCloseRoomConfirmModal] = useState<boolean>(false);

  // Microphone & Audio Controls
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number>(0);
  const [realMicVolume, setRealMicVolume] = useState<number>(0);
  const [agoraVoiceState, setAgoraVoiceState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const realMicStreamRef = useRef<MediaStream | null>(null);
  const realMicAnalyserRef = useRef<AudioAnalyserController | null>(null);
  const realMicRafRef = useRef<number | null>(null);

  // Modals & Sheets
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showEditAnnouncementModal, setShowEditAnnouncementModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Room Settings
  const [roomAnnouncement, setRoomAnnouncement] = useState(
    room.announcement || 'Welcome everyone! Sing, vibe, make friends & enjoy late night tracks! 🎵'
  );
  const [isSeatLocked, setIsSeatLocked] = useState(room.isLocked || false);
  const [isAllowJoin, setIsAllowJoin] = useState(room.allowJoin !== false);

  // Gift System
  const [giftCategory, setGiftCategory] = useState<'Popular' | 'Animated' | 'Luxury'>('Popular');
  const [selectedGift, setSelectedGift] = useState<GiftItem>(MOCK_GIFTS[0]);
  const [userCoins, setUserCoins] = useState(currentUser.coins || 78900);
  const [activeCelebration, setActiveCelebration] = useState<{
    gift: GiftItem;
    sender: string;
    recipient: string;
  } | null>(null);

  // Floating Hearts Animation
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);

  // Input & Live Stream Pills
  const [inputMessage, setInputMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([
    {
      id: 'act_1',
      name: 'Mr KHIZAR',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      text: '👑 joined the party stage! ⭐',
      type: 'join',
      isHost: true,
    },
    {
      id: 'act_2',
      name: 'Kami Sandhu',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
      text: '⚡ entered the VIP Stage...',
      type: 'vip',
    },
    {
      id: 'act_3',
      name: 'Bilal',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
      text: 'joined the party stage! ⭐',
      type: 'join',
    },
    {
      id: 'act_4',
      name: 'Raheem bhai',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
      text: 'joined the party stage! ⭐',
      type: 'join',
    },
    {
      id: 'act_5',
      name: 'Mr King',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      text: '⚡ entered the VIP Stage! 👑',
      type: 'vip',
    },
    {
      id: 'act_6',
      name: 'Lets See',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
      text: '⚡ entered the VIP Stage!...',
      type: 'vip',
    },
  ]);

  const activityBottomRef = useRef<HTMLDivElement>(null);

  // Audience List for Invites
  const audienceList: UserProfile[] = [
    MOCK_USERS.queen_girl,
    MOCK_USERS.rdxgamer,
    MOCK_USERS.mr_khan,
    MOCK_USERS.pink_girl,
    MOCK_USERS.zoya,
    MOCK_USERS.king,
    MOCK_USERS.devilboy,
    MOCK_USERS.angel
  ];

  // Agora RTC Engine Setup
  useEffect(() => {
    let isMounted = true;
    const isSeated = userSeatIndex !== -1 || currentUser.id === room.host.id;
    const initialRole: 'host' | 'audience' = isSeated ? 'host' : 'audience';

    const joinPartyAgora = async () => {
      try {
        setAgoraVoiceState('connecting');
        await agoraRtcService.joinChannel({
          channelName: `party_${room.id}`,
          userAccount: currentUser.id,
          role: initialRole,
          enableVideo: false,
          enableAudio: isSeated && !isMicMuted,
        });
        if (isMounted) {
          setAgoraVoiceState('connected');
        }
      } catch (err: any) {
        console.warn('[Party Live Agora] Join warning:', err);
        if (isMounted) setAgoraVoiceState('disconnected');
      }
    };

    joinPartyAgora();

    const unsubVolumes = agoraRtcService.onVolumeIndicator((volumes) => {
      if (!isMounted) return;
      for (const v of volumes) {
        if (v.level > 10) {
          if (v.uid === 0 || v.uid === currentUser.id) {
            setRealMicVolume(v.level);
            const mySeatIdx = userSeatIndex !== -1 ? userSeatIndex : (currentUser.id === room.host.id ? 0 : -1);
            if (mySeatIdx !== -1) setSpeakingIndex(mySeatIdx);
          } else {
            const remoteSeatIdx = seats.findIndex((s) => s && s.id === v.uid);
            if (remoteSeatIdx !== -1) {
              setSpeakingIndex(remoteSeatIdx);
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

  // Synchronize dynamic role changes with Agora RTC
  useEffect(() => {
    const isSeated = userSeatIndex !== -1 || currentUser.id === room.host.id;
    const targetRole: 'host' | 'audience' = isSeated ? 'host' : 'audience';
    agoraRtcService
      .switchRole(targetRole, {
        enableVideo: false,
        enableAudio: isSeated && !isMicMuted,
      })
      .catch((err) => {
        console.warn('[Party Live Agora] Switch role warning:', err);
      });
  }, [userSeatIndex, currentUser.id, room.host.id, isMicMuted]);

  // Real device microphone capture
  useEffect(() => {
    let isSubscribed = true;

    const setupRealMic = async () => {
      const isSeated = userSeatIndex !== -1 || currentUser.id === room.host.id;
      if (isSeated && !isMicMuted) {
        try {
          if (!realMicStreamRef.current) {
            const stream = await acquireRealMicrophone();
            realMicStreamRef.current = stream;
            const controller = createAudioAnalyser(stream);
            realMicAnalyserRef.current = controller;
          } else {
            realMicStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = true));
          }

          const pollVolume = () => {
            if (!isSubscribed) return;
            if (realMicAnalyserRef.current && !isMicMuted) {
              const vol = realMicAnalyserRef.current.getVolumeLevel();
              setRealMicVolume(vol);
              if (vol > 8) {
                const targetIdx = userSeatIndex !== -1 ? userSeatIndex : 0;
                setSpeakingIndex(targetIdx);
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
      if (realMicRafRef.current) {
        cancelAnimationFrame(realMicRafRef.current);
      }
    };
  }, [userSeatIndex, isMicMuted, room.host.id, currentUser.id]);

  // Cleanup microphone on room exit
  useEffect(() => {
    return () => {
      if (realMicAnalyserRef.current) {
        realMicAnalyserRef.current.cleanup();
      }
      if (realMicStreamRef.current) {
        stopMediaStream(realMicStreamRef.current);
      }
    };
  }, []);

  // Ambient speaking waves rotation across occupied seats when idle
  useEffect(() => {
    const interval = setInterval(() => {
      if (realMicVolume > 8) return;
      const occupiedIndices = seats
        .map((s, idx) => (s ? idx : -1))
        .filter((idx) => idx !== -1);
      if (occupiedIndices.length > 0) {
        const rand = occupiedIndices[Math.floor(Math.random() * occupiedIndices.length)];
        setSpeakingIndex(rand);
      }
    }, 3200);
    return () => clearInterval(interval);
  }, [seats, realMicVolume]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

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
      if (isRoomHost) {
        setSelectedSeatMember({ index, user: occupant });
      } else {
        onSelectUser(occupant);
      }
      return;
    }

    // Empty seat handling
    if (isRoomHost) {
      const ownerSittingIdx = seats.findIndex((s) => s?.id === currentUser.id);
      if (ownerSittingIdx === -1) {
        setShowOwnerSeatChoice(index);
      } else {
        setShowInviteToSeatModal(index);
      }
      return;
    }

    if (isSeatLocked) {
      showToast('🔒 Seats are currently locked by Host');
      return;
    }
    if (!isAllowJoin) {
      showToast('🚫 Joining is currently disabled by Host');
      return;
    }

    const alreadySittingIdx = seats.findIndex((s) => s?.id === currentUser.id);
    if (alreadySittingIdx !== -1) {
      showToast(`You already occupy Seat #${alreadySittingIdx + 1}. Leave first to switch seats.`);
      return;
    }

    const hasPending = seatRequests.some((r) => r.seatIndex === index && r.user.id === currentUser.id);
    if (hasPending) {
      showToast(`Your join request for Seat #${index + 1} is already pending Host approval. ⏳`);
      return;
    }

    setRequestTargetSeat(index);
    setShowRequestConfirmModal(true);
  };

  // Submit Seat Join Request
  const handleSendSeatRequest = () => {
    if (requestTargetSeat === null) return;
    const newReq: SeatRequest = {
      id: `req_${Date.now()}_${currentUser.id}`,
      user: currentUser,
      seatIndex: requestTargetSeat,
      requestedAt: Date.now()
    };
    const nextRequests = [...seatRequests, newReq];
    setSeatRequests(nextRequests);
    syncRoom(seats, nextRequests);
    setShowRequestConfirmModal(false);
    showToast(`Join request sent for Seat #${requestTargetSeat + 1}! Waiting for Host approval. ⏳`);

    setActivities((prev) => [
      ...prev,
      {
        id: `act_${Date.now()}`,
        name: currentUser.name,
        avatar: currentUser.avatar,
        text: `requested to join Seat #${requestTargetSeat + 1} 🎙️`,
        type: 'chat',
      }
    ]);
  };

  // Host: Accept Seat Request
  const handleAcceptSeatRequest = (req: SeatRequest) => {
    const updated = [...seats];
    const prevIdx = updated.findIndex((s) => s?.id === req.user.id);
    if (prevIdx !== -1) updated[prevIdx] = null;

    let targetIdx = req.seatIndex;
    if (updated[targetIdx] !== null) {
      const emptyIdx = updated.findIndex((s) => s === null);
      if (emptyIdx === -1) {
        showToast('All seats are currently full!');
        return;
      }
      targetIdx = emptyIdx;
    }

    updated[targetIdx] = req.user;
    const nextRequests = seatRequests.filter((r) => r.id !== req.id);
    setSeats(updated);
    setSeatRequests(nextRequests);
    syncRoom(updated, nextRequests);
    showToast(`Approved ${req.user.name} for Seat #${targetIdx + 1}! 🎙️`);

    setActivities((prev) => [
      ...prev,
      {
        id: `act_${Date.now()}`,
        name: req.user.name,
        avatar: req.user.avatar,
        text: `joined Seat #${targetIdx + 1}! 🎙️`,
        type: 'join',
      }
    ]);
  };

  // Host: Reject Seat Request
  const handleRejectSeatRequest = (req: SeatRequest) => {
    const nextRequests = seatRequests.filter((r) => r.id !== req.id);
    setSeatRequests(nextRequests);
    syncRoom(seats, nextRequests);
    showToast(`Declined request from ${req.user.name}`);
  };

  // Host: Remove Member
  const handleRemoveMember = () => {
    if (!selectedSeatMember) return;
    const idx = selectedSeatMember.index;
    const member = selectedSeatMember.user;
    const updated = [...seats];
    updated[idx] = null;
    setSeats(updated);
    syncRoom(updated);
    setSelectedSeatMember(null);
    showToast(`Removed ${member.name} from Seat #${idx + 1}`);
  };

  // Host: Send Direct Seat Invitation
  const handleSendSeatInvite = (targetUser: UserProfile) => {
    if (showInviteToSeatModal === null) return;
    const targetSeat = showInviteToSeatModal;
    setShowInviteToSeatModal(null);
    showToast(`Invitation sent to ${targetUser.name} for Seat #${targetSeat + 1}! 📨`);

    setIncomingSeatInvite({
      id: `inv_${Date.now()}`,
      fromHost: room.host,
      toUser: targetUser,
      seatIndex: targetSeat,
      sentAt: Date.now()
    });
  };

  // Accept Direct Invitation
  const handleAcceptSeatInvitation = () => {
    if (!incomingSeatInvite) return;
    const idx = incomingSeatInvite.seatIndex;
    const updated = [...seats];
    const prevSeat = updated.findIndex((s) => s?.id === incomingSeatInvite.toUser.id);
    if (prevSeat !== -1) updated[prevSeat] = null;
    updated[idx] = incomingSeatInvite.toUser;
    setSeats(updated);
    syncRoom(updated);
    showToast(`You joined Seat #${idx + 1}! 🎙️`);
    setIncomingSeatInvite(null);
  };

  // Host Take Seat
  const handleOwnerTakeSeat = (index: number) => {
    const updated = [...seats];
    const prevSeat = updated.findIndex((s) => s?.id === currentUser.id);
    if (prevSeat !== -1) updated[prevSeat] = null;
    updated[index] = currentUser;
    setSeats(updated);
    syncRoom(updated);
    setShowOwnerSeatChoice(null);
    showToast(`You took Seat #${index + 1}! 👑`);
  };

  // Leave Seat
  const handleLeaveSeat = (index: number) => {
    const updated = [...seats];
    updated[index] = null;
    setSeats(updated);
    syncRoom(updated);
    showToast(`You left Seat #${index + 1}`);
  };

  // Send Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    const newAct: ActivityItem = {
      id: `chat_${Date.now()}`,
      name: currentUser.name,
      avatar: currentUser.avatar,
      text: inputMessage.trim(),
      isHost: isRoomHost,
      type: 'chat',
    };

    setActivities((prev) => [...prev, newAct]);
    setInputMessage('');
    setShowEmojiPicker(false);
    setTimeout(() => activityBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  // Heart Tap Reaction with Burst Animation
  const handleTriggerHeart = () => {
    const newHeart: FloatingHeart = {
      id: Date.now() + Math.random(),
      x: 75 + Math.random() * 15,
      size: 24 + Math.random() * 16,
      color: ['#FF2A85', '#FF6090', '#FA26A0', '#FFB703', '#9D4EDD'][Math.floor(Math.random() * 5)],
    };

    setFloatingHearts((prev) => [...prev, newHeart]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 2000);
  };

  // Send Gift
  const handleSendGift = () => {
    if (userCoins < selectedGift.coins) {
      showToast('⚠️ Insufficient coin balance! Please recharge.');
      return;
    }

    setUserCoins((prev) => prev - selectedGift.coins);
    setShowGiftModal(false);

    setActiveCelebration({
      gift: selectedGift,
      sender: currentUser.name,
      recipient: room.host.name || 'Mr KHIZAR'
    });

    setActivities((prev) => [
      ...prev,
      {
        id: `gift_${Date.now()}`,
        name: currentUser.name,
        avatar: currentUser.avatar,
        text: `sent ${selectedGift.name} ${selectedGift.icon}! 🎁✨`,
        type: 'gift',
      }
    ]);

    setTimeout(() => setActiveCelebration(null), 3200);
  };

  // Filtered Gifts
  const displayedGifts = MOCK_GIFTS.filter((g) => {
    if (giftCategory === 'Popular') return ['gift_rose', 'gift_heart', 'gift_crown'].includes(g.id);
    if (giftCategory === 'Animated') return ['gift_teddy', 'gift_yacht', 'gift_diamond'].includes(g.id);
    if (giftCategory === 'Luxury') return ['gift_rocket', 'gift_castle', 'gift_car'].includes(g.id);
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-[#060212] flex flex-col justify-between overflow-hidden select-none text-white font-sans">
      
      {/* ========================================================
          BACKGROUND: DJ SPEAKERS, RADIANT STAGE & CROWN LIGHT BEAM
         ======================================================== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Deep radial ambiance */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#41106A]/75 via-[#16062B]/90 to-[#060212]" />
        
        {/* Overhead Starlight Beam shining down from Central Royal Crown */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-[65%] opacity-40 blur-xl pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at top, rgba(255, 215, 0, 0.45) 0%, rgba(200, 80, 255, 0.25) 45%, transparent 75%)',
          }}
        />

        {/* Vertical radiant light rays from center crown */}
        <div 
          className="absolute top-10 left-1/2 -translate-x-1/2 w-1.5 h-64 opacity-50 blur-sm pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, #FFDF00 0%, rgba(255, 223, 0, 0.6) 40%, transparent 100%)',
          }}
        />

        {/* LEFT DJ CONCERT SPEAKER TOWER */}
        <div className="absolute left-0 top-12 sm:top-14 bottom-16 w-16 sm:w-20 pointer-events-none opacity-85 flex flex-col justify-around py-4 pl-1 z-0">
          <div className="w-full h-full rounded-r-3xl bg-gradient-to-r from-[#0E051D] via-[#1B0C32] to-[#120722] border-r border-t border-b border-[#9D4EDD]/30 shadow-[0_0_35px_rgba(157,78,221,0.25)] p-1.5 flex flex-col justify-around items-center">
            {/* Speaker Grille Subwoofers */}
            {[1, 2, 3].map((cone) => (
              <div key={cone} className="relative w-11 sm:w-13 h-11 sm:h-13 rounded-full bg-[#0B0418] border-2 border-[#D4AF37]/40 shadow-inner flex items-center justify-center">
                <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full border border-purple-500/40 bg-gradient-to-b from-[#1E0F38] to-[#0A0315] flex items-center justify-center">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#D4AF37]/70 shadow-[0_0_8px_#D4AF37]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT DJ CONCERT SPEAKER TOWER */}
        <div className="absolute right-0 top-12 sm:top-14 bottom-16 w-16 sm:w-20 pointer-events-none opacity-85 flex flex-col justify-around py-4 pr-1 z-0">
          <div className="w-full h-full rounded-l-3xl bg-gradient-to-l from-[#0E051D] via-[#1B0C32] to-[#120722] border-l border-t border-b border-[#9D4EDD]/30 shadow-[0_0_35px_rgba(157,78,221,0.25)] p-1.5 flex flex-col justify-around items-center">
            {[1, 2, 3].map((cone) => (
              <div key={cone} className="relative w-11 sm:w-13 h-11 sm:h-13 rounded-full bg-[#0B0418] border-2 border-[#D4AF37]/40 shadow-inner flex items-center justify-center">
                <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full border border-purple-500/40 bg-gradient-to-b from-[#1E0F38] to-[#0A0315] flex items-center justify-center">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#D4AF37]/70 shadow-[0_0_8px_#D4AF37]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ambient Starlight Particles */}
        <div className="absolute top-24 left-1/4 w-1 h-1 rounded-full bg-yellow-200 animate-ping opacity-75" />
        <div className="absolute top-36 right-1/4 w-1.5 h-1.5 rounded-full bg-pink-300 animate-pulse opacity-80" />
        <div className="absolute top-48 left-1/3 w-1 h-1 rounded-full bg-cyan-200 animate-pulse opacity-60" />
        <div className="absolute top-60 right-1/3 w-1 h-1 rounded-full bg-yellow-300 animate-ping opacity-70" />
      </div>

      {/* Floating Hearts Animation */}
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
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-[#FF007A] to-[#FA26A0] text-white text-xs font-black py-2 px-5 rounded-full shadow-2xl shadow-pink-900/80 animate-fade-in pointer-events-none border border-white/25">
          {toastMessage}
        </div>
      )}

      {/* Full-Screen Gift Celebration Overlay */}
      {activeCelebration && (
        <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center animate-bounce">
            <span className="text-8xl filter drop-shadow-[0_0_40px_#FA26A0] mb-3">
              {activeCelebration.gift.icon}
            </span>
            <div className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#200A38] to-[#450E63] border-2 border-[#FA26A0] text-center shadow-2xl">
              <span className="text-sm font-black text-white block">
                {activeCelebration.sender} sent {activeCelebration.gift.name}!
              </span>
              <span className="text-xs text-[#FFDF00] font-bold">
                +{activeCelebration.gift.coins} Coins 💖
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          1. HEADER BAR
          - Back Button: Left Circle Arrow
          - Host Profile / Room Info: Avatar + Blue Verified Check + "Music Lovers 🎵" + "ID: 4528 🟢 Live"
          - Middle: "🏆 Platform" Badge
          - Coin Balance: "🪙 78.9K +"
          - Top Right: Speaker volume button & More button
         ======================================================== */}
      <header className="relative z-30 flex items-center justify-between px-3 pt-safe pt-2.5 pb-2">
        {/* Left: Back Button + Host Info */}
        <div className="flex items-center gap-2 max-w-[55%]">
          {/* Back Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1F0C3B]/80 hover:bg-[#2C1252] border border-white/15 flex items-center justify-center text-white transition-all active:scale-95 shadow-md shrink-0"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Host Avatar & Room Details */}
          <div 
            onClick={() => onSelectUser(seats[0] || room.host)}
            className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
          >
            <div className="relative shrink-0">
              <img
                src={seats[0]?.avatar || room.host.avatar}
                alt={seats[0]?.name || room.host.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-[#FFDF00]"
              />
              {/* Blue verified checkmark */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#0099FF] flex items-center justify-center text-white text-[8px] font-black border border-black">
                ✓
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black text-white truncate leading-tight flex items-center gap-1 drop-shadow">
                {room.title || 'Music Lovers 🎵'}
              </span>
              <div className="flex items-center gap-1 text-[10px] text-white/80 font-mono leading-tight">
                <span>ID: {room.displayId || '4528'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                <span className="text-emerald-400 font-bold">Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Platform + Coin Balance + Volume + More */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Platform Trophy Pill */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1C0B35]/90 border border-[#D4AF37]/50 text-[#FFDF00] text-[10px] sm:text-xs font-extrabold shadow-md">
            <span>🏆</span>
            <span className="tracking-tight">Platform</span>
          </div>

          {/* Coin Balance Pill with + */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1C0B35]/90 border border-[#D4AF37]/60 text-white text-[10px] sm:text-xs font-mono font-black shadow-md">
            <span className="text-[#FFDF00]">🪙</span>
            <span>{(userCoins / 1000).toFixed(1)}K</span>
            <button 
              onClick={() => showToast('Recharge Coins Shop 🪙')}
              className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-[#FF007A] to-[#FA26A0] text-white flex items-center justify-center text-[9px] font-black ml-0.5"
            >
              +
            </button>
          </div>

          {/* Speaker Mute/Unmute */}
          <button
            onClick={() => {
              const next = !isSpeakerMuted;
              setIsSpeakerMuted(next);
              agoraRtcService.setSpeakerMuted(next);
              showToast(next ? 'Room audio muted 🔇' : 'Room audio active 🔊');
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1F0C3B]/80 hover:bg-[#2C1252] border border-white/15 flex items-center justify-center text-white transition-all active:scale-95 shadow shrink-0"
            title="Speaker Mute/Unmute"
          >
            {isSpeakerMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
          </button>

          {/* More Button */}
          <button
            onClick={() => setShowSettingsSheet(true)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1F0C3B]/80 hover:bg-[#2C1252] border border-white/15 flex items-center justify-center text-white transition-all active:scale-95 shadow shrink-0"
            title="More Options"
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </header>

      {/* ========================================================
          MAIN STAGE AREA
          - Floating 3D Royal Golden Crown Overhead
          - Two Grand Hero Thrones (Left: Owner Stage, Right: VIP Stage)
          - 10 Participant Seats (Row 1: Seats 1-5, Row 2: Seats 6-10)
          - Middle-Bottom Section:
            * Left: Stack of Glowing Translucent Activity Pills
            * Right: 3D Royal Purple Gift Box with Gold Bow on Glowing Pedestal
         ======================================================== */}
      <main className="flex-1 relative z-10 flex flex-col justify-start px-2 sm:px-4 overflow-y-auto no-scrollbar space-y-2">
        
        {/* ========================================================
            A. FLOATING CENTRAL ROYAL GOLDEN CROWN OVERHEAD
           ======================================================== */}
        <div className="relative flex justify-center items-center pt-1 pb-0">
          <div className="relative text-3xl sm:text-4xl filter drop-shadow-[0_0_20px_#FFDF00] animate-bounce">
            👑
            {/* Ambient radiant burst behind crown */}
            <div className="absolute inset-0 bg-[#FFDF00]/30 rounded-full blur-md -z-10" />
          </div>
        </div>

        {/* ========================================================
            B. TWO GRAND HERO THRONES (OWNER & VIP)
            Matching Reference:
            - Left: 3D Stepped Golden Pedestal, Crown on Avatar Ring, Mr KHIZAR, "👑 Owner" Ribbon, Verified Check
            - Right: 3D Stepped Magenta Pedestal, Tiara Crown, Zara Khan, "⭐ VIP" Ribbon, Verified Check
           ======================================================== */}
        <div className="flex items-center justify-center gap-6 sm:gap-12 pt-1 pb-2">
          
          {/* HERO 1: OWNER STAGE (Seat 0) */}
          <div 
            onClick={() => handleSeatClick(0)}
            className="flex flex-col items-center cursor-pointer group active:scale-95 transition-transform"
          >
            <div className="relative flex flex-col items-center">
              
              {/* Crown atop Owner Ring */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 text-2xl filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                👑
              </div>

              {/* Speaking Indicator Ring */}
              {speakingIndex === 0 && seats[0] && (
                <div className="absolute -inset-2 rounded-full border-2 border-emerald-400 animate-ping opacity-85 z-0" />
              )}

              {/* 3D Stepped Golden Ring & Avatar */}
              <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-gradient-to-tr from-[#9B7110] via-[#FFDF00] to-[#FFE770] shadow-[0_0_25px_rgba(255,223,0,0.6)] flex items-center justify-center">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#160A2B] border-2 border-[#FFDF00]">
                  <img
                    src={seats[0]?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'}
                    alt={seats[0]?.name || 'Mr KHIZAR'}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* 3D Stepped Golden Pedestal Base */}
              <div className="relative z-0 -mt-3 w-24 sm:w-28 h-5 rounded-full bg-gradient-to-b from-[#FFDF00] via-[#B8860B] to-[#4A3403] shadow-[0_8px_16px_rgba(0,0,0,0.8)] border-t border-[#FFF275] flex items-center justify-center">
                <div className="w-20 h-2 rounded-full bg-[#2B1B04]/80 blur-[1px]" />
              </div>

              {/* Golden Ribbon Banner: "👑 Owner" */}
              <div className="relative z-20 -mt-3.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] text-black text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1 border border-white/40">
                <span>👑</span>
                <span>Owner</span>
              </div>

              {/* Below Pedestal Name Pill: "Mr KHIZAR ✔" */}
              <div className="mt-1.5 px-3 py-0.5 rounded-full bg-[#120524]/90 border border-white/15 backdrop-blur-md flex items-center gap-1 shadow-md">
                <span className="text-xs font-black text-white truncate max-w-[90px]">
                  {seats[0]?.name || 'Mr KHIZAR'}
                </span>
                <span className="w-3 h-3 rounded-full bg-[#0099FF] text-white text-[7px] font-black flex items-center justify-center">
                  ✓
                </span>
              </div>
            </div>
          </div>

          {/* HERO 2: VIP STAGE (Seat 1) */}
          <div 
            onClick={() => handleSeatClick(1)}
            className="flex flex-col items-center cursor-pointer group active:scale-95 transition-transform"
          >
            <div className="relative flex flex-col items-center">
              
              {/* Tiara Crown atop VIP Ring */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 text-xl filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                👑
              </div>

              {/* Speaking Indicator Ring */}
              {speakingIndex === 1 && seats[1] && (
                <div className="absolute -inset-2 rounded-full border-2 border-emerald-400 animate-ping opacity-85 z-0" />
              )}

              {/* 3D Stepped Magenta/Pink Ring & Avatar */}
              <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-gradient-to-tr from-[#9D0208] via-[#FA26A0] to-[#FF70A6] shadow-[0_0_25px_rgba(250,38,160,0.65)] flex items-center justify-center">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#160A2B] border-2 border-[#FA26A0]">
                  <img
                    src={seats[1]?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                    alt={seats[1]?.name || 'Zara Khan'}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* 3D Stepped Magenta Pedestal Base */}
              <div className="relative z-0 -mt-3 w-24 sm:w-28 h-5 rounded-full bg-gradient-to-b from-[#FA26A0] via-[#9D025A] to-[#3B0721] shadow-[0_8px_16px_rgba(0,0,0,0.8)] border-t border-[#FFA6D2] flex items-center justify-center">
                <div className="w-20 h-2 rounded-full bg-[#260416]/80 blur-[1px]" />
              </div>

              {/* Magenta Ribbon Banner: "⭐ VIP" */}
              <div className="relative z-20 -mt-3.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#FA26A0] via-[#FF007A] to-[#FA26A0] text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1 border border-white/40">
                <span>⭐</span>
                <span>VIP</span>
              </div>

              {/* Below Pedestal Name Pill: "Zara Khan ✔" */}
              <div className="mt-1.5 px-3 py-0.5 rounded-full bg-[#120524]/90 border border-white/15 backdrop-blur-md flex items-center gap-1 shadow-md">
                <span className="text-xs font-black text-white truncate max-w-[90px]">
                  {seats[1]?.name || 'Zara Khan'}
                </span>
                <span className="w-3 h-3 rounded-full bg-[#0099FF] text-white text-[7px] font-black flex items-center justify-center">
                  ✓
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            C. 10 PARTICIPANT SEATS (2 ROWS OF 5 SEATS)
            - ROW 1: Seats 1 to 5
              * Sweetie (Tiara crown, 1.5K, Mic badge)
              * Kami Sandhu (2.5K, Mic badge)
              * Bilal (630, Mic badge)
              * Faheem (2K, Mic badge)
              * Ilyas (15K, Mic badge)
            - ROW 2: Seats 6 to 10
              * Aslang (Mini crown, 1.5K, Mic badge)
              * No.7 (Empty Seat: 3D pedestal + Electric blue ring + centered Plus icon. NO mic badge)
              * No.8 (Empty Seat: 3D pedestal + Electric blue ring + centered Plus icon. NO mic badge)
              * No.9 (Empty Seat: 3D pedestal + Electric blue ring + centered Plus icon. NO mic badge)
              * No.10 (Empty Seat: 3D pedestal + Electric blue ring + centered Plus icon. NO mic badge)
           ======================================================== */}
        <div className="space-y-3 pt-1">
          
          {/* ROW 1: SEATS 1 TO 5 */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 max-w-md mx-auto">
            {[
              { idx: 2, defaultCrown: '👑', ringColor: 'from-[#FA26A0] via-[#FF70A6] to-[#FA26A0]', shadow: 'rgba(250,38,160,0.5)', diamond: '1.5K' },
              { idx: 3, defaultCrown: null, ringColor: 'from-[#00B4D8] via-[#90E0EF] to-[#0077B6]', shadow: 'rgba(0,180,216,0.5)', diamond: '2.5K' },
              { idx: 4, defaultCrown: null, ringColor: 'from-[#D4AF37] via-[#FFDF00] to-[#AA7C11]', shadow: 'rgba(212,175,55,0.5)', diamond: '630' },
              { idx: 5, defaultCrown: null, ringColor: 'from-[#0096C7] via-[#48CAE4] to-[#023E8A]', shadow: 'rgba(0,150,199,0.5)', diamond: '2K' },
              { idx: 6, defaultCrown: null, ringColor: 'from-[#7209B7] via-[#B5179E] to-[#480CA8]', shadow: 'rgba(181,23,158,0.5)', diamond: '15K' },
            ].map(({ idx, defaultCrown, ringColor, shadow, diamond }) => {
              const member = seats[idx];
              const isSpeaking = speakingIndex === idx && member !== null;

              return (
                <div
                  key={idx}
                  onClick={() => handleSeatClick(idx)}
                  className="flex flex-col items-center cursor-pointer group active:scale-95 transition-transform"
                >
                  <div className="relative flex flex-col items-center">
                    
                    {/* Crown if present (Seat 1 Sweetie) */}
                    {defaultCrown && member && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 text-xs filter drop-shadow">
                        {defaultCrown}
                      </div>
                    )}

                    {/* Speaking Ping */}
                    {isSpeaking && (
                      <div className="absolute -inset-1 rounded-full border border-emerald-400 animate-ping opacity-80 z-0" />
                    )}

                    {/* Stepped Ring & Avatar */}
                    <div 
                      className={`relative z-10 w-11 h-11 sm:w-13 sm:h-13 rounded-full p-0.5 bg-gradient-to-tr ${ringColor} flex items-center justify-center`}
                      style={{ boxShadow: `0 0 14px ${shadow}` }}
                    >
                      <div className="w-full h-full rounded-full overflow-hidden bg-[#160A2B]">
                        {member ? (
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/50">
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                          </div>
                        )}
                      </div>

                      {/* Microphone Badge on bottom-right ONLY when occupied */}
                      {member && (
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] shadow border border-white/20 ${
                          isSpeaking ? 'bg-emerald-500 animate-pulse' : 'bg-[#0E061B]/95 text-cyan-300'
                        }`}>
                          <Mic className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    {/* 3D Stepped Golden Pedestal Base */}
                    <div className="relative z-0 -mt-1.5 w-12 sm:w-14 h-3 rounded-full bg-gradient-to-b from-[#D4AF37] via-[#855B09] to-[#3B2803] border-t border-[#FFE58F] shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />

                    {/* Participant Name */}
                    <span className="text-[10px] sm:text-[11px] font-extrabold text-white mt-1 truncate max-w-[55px] text-center leading-tight">
                      {member ? member.name.split(' ')[0] : `No.${idx - 1}`}
                    </span>

                    {/* Diamond Badge */}
                    <div className="mt-0.5 flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-black/60 border border-yellow-500/40 text-[9px] font-mono font-bold text-yellow-300">
                      <span>💎</span>
                      <span>{diamond}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ROW 2: SEATS 6 TO 10 */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 max-w-md mx-auto">
            {[
              { idx: 7, label: 'Aslang', defaultCrown: '👑', ringColor: 'from-[#FA26A0] via-[#FF70A6] to-[#FA26A0]', shadow: 'rgba(250,38,160,0.5)', diamond: '1.5K' },
              { idx: 8, label: 'No.7', defaultCrown: null, ringColor: 'from-[#0096C7] via-[#00B4D8] to-[#48CAE4]', shadow: 'rgba(0,180,216,0.6)', diamond: null },
              { idx: 9, label: 'No.8', defaultCrown: null, ringColor: 'from-[#0096C7] via-[#00B4D8] to-[#48CAE4]', shadow: 'rgba(0,180,216,0.6)', diamond: null },
              { idx: 10, label: 'No.9', defaultCrown: null, ringColor: 'from-[#0096C7] via-[#00B4D8] to-[#48CAE4]', shadow: 'rgba(0,180,216,0.6)', diamond: null },
              { idx: 11, label: 'No.10', defaultCrown: null, ringColor: 'from-[#0096C7] via-[#00B4D8] to-[#48CAE4]', shadow: 'rgba(0,180,216,0.6)', diamond: null },
            ].map(({ idx, label, defaultCrown, ringColor, shadow, diamond }) => {
              const member = seats[idx];
              const isSpeaking = speakingIndex === idx && member !== null;

              return (
                <div
                  key={idx}
                  onClick={() => handleSeatClick(idx)}
                  className="flex flex-col items-center cursor-pointer group active:scale-95 transition-transform"
                >
                  <div className="relative flex flex-col items-center">
                    
                    {/* Crown if present (Seat 6 Aslang) */}
                    {defaultCrown && member && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 text-xs filter drop-shadow">
                        {defaultCrown}
                      </div>
                    )}

                    {/* Speaking Ping */}
                    {isSpeaking && (
                      <div className="absolute -inset-1 rounded-full border border-emerald-400 animate-ping opacity-80 z-0" />
                    )}

                    {/* Stepped Ring & Content */}
                    <div 
                      className={`relative z-10 w-11 h-11 sm:w-13 sm:h-13 rounded-full p-0.5 bg-gradient-to-tr ${ringColor} flex items-center justify-center`}
                      style={{ boxShadow: `0 0 14px ${shadow}` }}
                    >
                      <div className="w-full h-full rounded-full overflow-hidden bg-[#160A2B] flex items-center justify-center">
                        {member ? (
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          /* EMPTY SEAT: Only the Plus icon centered in the glowing electric-blue circle! NO mic icon */
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#1C0F38] to-[#0D041B] text-white">
                            <Plus className="w-5 h-5 stroke-[3] text-white drop-shadow" />
                          </div>
                        )}
                      </div>

                      {/* Microphone Badge ONLY when user occupies seat */}
                      {member && (
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] shadow border border-white/20 ${
                          isSpeaking ? 'bg-emerald-500 animate-pulse' : 'bg-[#0E061B]/95 text-cyan-300'
                        }`}>
                          <Mic className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    {/* 3D Stepped Golden Pedestal Base */}
                    <div className="relative z-0 -mt-1.5 w-12 sm:w-14 h-3 rounded-full bg-gradient-to-b from-[#D4AF37] via-[#855B09] to-[#3B2803] border-t border-[#FFE58F] shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />

                    {/* Participant Name or Seat Number (e.g. Aslang, No.7, No.8, No.9, No.10) */}
                    <span className="text-[10px] sm:text-[11px] font-extrabold text-white mt-1 truncate max-w-[55px] text-center leading-tight">
                      {member ? member.name.split(' ')[0] : label}
                    </span>

                    {/* Diamond Badge for occupied seats */}
                    {diamond && member && (
                      <div className="mt-0.5 flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-black/60 border border-yellow-500/40 text-[9px] font-mono font-bold text-yellow-300">
                        <span>💎</span>
                        <span>{diamond}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================
            D. MIDDLE-BOTTOM LIVE SECTION
            Matching Reference:
            - Left: Stack of 6 glowing translucent purple pills
              * Mr KHIZAR 👑 joined the party stage! ⭐
              * Kami Sandhu ⚡ entered the VIP Stage...
              * Bilal joined the party stage! ⭐
              * Raheem bhai joined the party stage! ⭐
              * Mr King ⚡ entered the VIP Stage! 👑
              * Lets See ⚡ entered the VIP Stage!...
            - Right: 3D Royal Purple Gift Box with Gold Bow on Glowing Pedestal
           ======================================================== */}
        <div className="flex items-end justify-between gap-3 pt-2 pb-1 max-w-md mx-auto w-full">
          
          {/* Left Column: Stack of Live Activity Pills */}
          <div className="flex-1 space-y-1.5 max-h-48 overflow-y-auto no-scrollbar pr-1">
            {activities.map((act) => (
              <div
                key={act.id}
                className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#17092E]/80 backdrop-blur-md border border-purple-500/30 text-[11px] shadow-sm w-fit max-w-full animate-fade-in"
              >
                <img
                  src={act.avatar}
                  alt={act.name}
                  className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-yellow-400"
                />
                <div className="flex items-baseline gap-1 text-[11px] truncate">
                  <span className="font-extrabold text-[#FFE043] shrink-0">
                    {act.name}
                  </span>
                  <span className="text-white/95 font-medium truncate">
                    {act.text}
                  </span>
                </div>
              </div>
            ))}
            <div ref={activityBottomRef} />
          </div>

          {/* Right Column: 3D Royal Purple Gift Box on Glowing Stepped Pedestal */}
          <div 
            onClick={() => setShowGiftModal(true)}
            className="flex flex-col items-center cursor-pointer group active:scale-95 transition-all shrink-0 pb-1"
            title="Open Gift Shop"
          >
            <div className="relative flex flex-col items-center">
              
              {/* Particle Sparkles */}
              <div className="absolute -top-3 -right-2 text-xs text-yellow-300 animate-spin">
                ✨
              </div>
              <div className="absolute -top-2 -left-2 text-[10px] text-pink-400 animate-ping">
                ⭐
              </div>

              {/* 3D Purple Gift Box with Golden Ribbon & Bow */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center filter drop-shadow-[0_0_18px_rgba(250,38,160,0.7)] group-hover:scale-105 transition-transform">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <defs>
                    <linearGradient id="boxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8A2BE2" />
                      <stop offset="50%" stopColor="#4B0082" />
                      <stop offset="100%" stopColor="#2E0854" />
                    </linearGradient>
                    <linearGradient id="lidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#A855F7" />
                      <stop offset="100%" stopColor="#6B21A8" />
                    </linearGradient>
                    <linearGradient id="goldRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFE066" />
                      <stop offset="50%" stopColor="#FFC107" />
                      <stop offset="100%" stopColor="#FF9800" />
                    </linearGradient>
                  </defs>
                  
                  {/* Cube Body */}
                  <rect x="20" y="38" width="60" height="46" rx="6" fill="url(#boxGrad)" stroke="#C084FC" strokeWidth="1.5" />
                  
                  {/* Vertical Ribbon */}
                  <rect x="44" y="38" width="12" height="46" fill="url(#goldRibbon)" />
                  
                  {/* Horizontal Ribbon */}
                  <rect x="20" y="56" width="60" height="10" fill="url(#goldRibbon)" />
                  
                  {/* Lid */}
                  <rect x="15" y="30" width="70" height="12" rx="4" fill="url(#lidGrad)" stroke="#E9D5FF" strokeWidth="1" />
                  <rect x="44" y="30" width="12" height="12" fill="url(#goldRibbon)" />

                  {/* Golden Ribbon Bow Left Loop */}
                  <path d="M 50 30 C 35 15, 20 22, 45 30 Z" fill="url(#goldRibbon)" stroke="#FFF" strokeWidth="0.5" />
                  {/* Golden Ribbon Bow Right Loop */}
                  <path d="M 50 30 C 65 15, 80 22, 55 30 Z" fill="url(#goldRibbon)" stroke="#FFF" strokeWidth="0.5" />
                  {/* Bow Center Knot */}
                  <circle cx="50" cy="30" r="5" fill="#FFE066" stroke="#B45309" strokeWidth="1" />
                </svg>
              </div>

              {/* Glowing Pedestal Ring Underneath */}
              <div className="relative -mt-3 w-20 sm:w-24 h-4 rounded-full bg-gradient-to-r from-[#FA26A0] via-[#FF007A] to-[#FA26A0] shadow-[0_0_20px_#FA26A0] border border-white/50 flex items-center justify-center">
                <div className="w-16 h-2 rounded-full bg-black/60 blur-[1px]" />
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* ========================================================
          BOTTOM INTERACTION BAR (EXACTLY 3 CONTROLS)
          Matching Reference:
          1. Left: Glowing Magenta Circular Gift Button 🎁
          2. Center: Translucent Capsule Bar with Smile Icon 😊 and "Say Hi..." Text Input
          3. Right: Glowing Magenta Circular Heart Button 💖
          (No bottom camera, chat or share buttons!)
         ======================================================== */}
      <footer className="relative z-30 px-3 pb-safe pb-3 pt-2 bg-gradient-to-t from-[#060212] via-[#0D041B]/95 to-transparent">
        <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
          
          {/* 1. Circular Glowing Magenta Gift Button */}
          <button
            onClick={() => setShowGiftModal(true)}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#9D0208] via-[#FA26A0] to-[#FF007A] flex items-center justify-center text-white shadow-[0_0_22px_rgba(250,38,160,0.8)] border border-white/30 active:scale-95 hover:scale-105 transition-all shrink-0"
            title="Open Gift Shop"
          >
            <span className="text-2xl filter drop-shadow">🎁</span>
          </button>

          {/* 2. Center Capsule "Say Hi..." Input Bar with Emoji Button */}
          <form
            onSubmit={handleSendMessage}
            className="flex-1 flex items-center bg-[#170B2E]/90 border border-purple-500/30 focus-within:border-[#FA26A0] rounded-full px-3.5 py-2.5 transition-colors shadow-inner backdrop-blur-md"
          >
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-[#FFE043] hover:text-white shrink-0 mr-2 transition-transform active:scale-110"
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
                className="w-7 h-7 rounded-full bg-[#FA26A0] text-white flex items-center justify-center shrink-0 ml-1 active:scale-90 transition-transform shadow"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* 3. Circular Glowing Magenta Heart Button */}
          <button
            onClick={handleTriggerHeart}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#9D0208] via-[#FA26A0] to-[#FF007A] flex items-center justify-center text-white shadow-[0_0_22px_rgba(250,38,160,0.8)] border border-white/30 active:scale-90 hover:scale-105 transition-all shrink-0"
            title="Send Heart"
          >
            <span className="text-2xl filter drop-shadow">💖</span>
          </button>
        </div>

        {/* Quick Emoji Picker Drawer */}
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

      {/* ========================================================
          MODALS & SHEETS (Preserved 100% Functionality)
         ======================================================== */}

      {/* GIFT SHOP MODAL */}
      {showGiftModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#160A2B] border-t border-[#FA26A0]/40 rounded-t-3xl p-5 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎁</span>
                <div>
                  <h3 className="text-sm font-black text-white">Gift Shop</h3>
                  <p className="text-[10px] text-[#FFDF00]">Balance: {userCoins.toLocaleString()} Coins 🪙</p>
                </div>
              </div>
              <button
                onClick={() => setShowGiftModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Gift Category Tabs */}
            <div className="flex gap-2 mb-3">
              {(['Popular', 'Animated', 'Luxury'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setGiftCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    giftCategory === cat
                      ? 'bg-[#FA26A0] text-white shadow-md shadow-pink-900/50'
                      : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Gift Grid */}
            <div className="grid grid-cols-3 gap-2.5 overflow-y-auto no-scrollbar py-1">
              {displayedGifts.map((gift) => (
                <div
                  key={gift.id}
                  onClick={() => setSelectedGift(gift)}
                  className={`flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedGift.id === gift.id
                      ? 'bg-[#FA26A0]/20 border-[#FA26A0] ring-2 ring-[#FA26A0]/40 scale-102'
                      : 'bg-[#1F0E38] border-white/5 hover:border-white/20'
                  }`}
                >
                  <span className="text-3xl mb-1 filter drop-shadow">{gift.icon}</span>
                  <span className="text-xs font-bold text-white truncate max-w-full">{gift.name}</span>
                  <span className="text-[10px] text-amber-300 font-mono mt-0.5">🪙 {gift.coins}</span>
                </div>
              ))}
            </div>

            {/* Send Button */}
            <div className="pt-3 border-t border-white/10 mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-white/80">
                <span>Sending to:</span>
                <span className="font-black text-[#FFDF00]">{room.host.name || 'Mr KHIZAR'}</span>
              </div>
              <button
                onClick={handleSendGift}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#FF007A] to-[#FA26A0] text-white text-xs font-black shadow-lg shadow-pink-900/50 active:scale-95 transition-all"
              >
                Send Gift ({selectedGift.coins} 🪙)
              </button>
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
                Room Controls & Settings
              </h3>
              <button
                onClick={() => setShowSettingsSheet(false)}
                className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Host Controls */}
            {isRoomHost && (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowSettingsSheet(false);
                    setShowSeatRequestsModal(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">📩</span>
                    <span className="text-xs font-bold text-white">Review Seat Requests</span>
                  </div>
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
                      setIsSeatLocked(e.target.checked);
                      syncRoom(seats, seatRequests, e.target.checked);
                      showToast(e.target.checked ? 'Seats locked' : 'Seats unlocked');
                    }}
                    className="toggle accent-[#FA26A0]"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5">
                  <span className="text-xs font-bold text-white">Allow Join</span>
                  <input
                    type="checkbox"
                    checked={isAllowJoin}
                    onChange={(e) => {
                      setIsAllowJoin(e.target.checked);
                      syncRoom(seats, seatRequests, undefined, e.target.checked);
                      showToast(e.target.checked ? 'Joining enabled' : 'Joining disabled');
                    }}
                    className="toggle accent-[#FA26A0]"
                  />
                </div>

                <button
                  onClick={() => {
                    setShowSettingsSheet(false);
                    setShowCloseRoomConfirmModal(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-rose-600/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Permanently Close Room</span>
                </button>
              </div>
            )}

            {/* Ordinary User Options */}
            {!isRoomHost && (
              <div className="space-y-2">
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
                  syncRoom(seats, undefined, undefined, undefined, roomAnnouncement);
                  showToast('Announcement updated! 📢');
                }}
                className="flex-1 py-2 rounded-xl bg-[#FA26A0] text-white text-xs font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEAT REQUESTS MODAL (HOST APPROVAL) */}
      {showSeatRequestsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#160A2B] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-base">📩</span>
                <h3 className="text-sm font-black text-white">Seat Requests</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#FA26A0] text-white text-[10px] font-bold">
                  {seatRequests.length}
                </span>
              </div>
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
                <p className="text-[11px] text-white/50 mt-1">Listeners tapping empty seats will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar py-1">
                {seatRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-[#200E38] border border-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <img src={req.user.avatar} alt={req.user.name} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <span className="text-xs font-bold text-white block">{req.user.name}</span>
                        <span className="text-[10px] text-[#FA26A0]">Seat #{req.seatIndex + 1}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
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
              className="w-full py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold mt-1"
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
            <div className="w-12 h-12 rounded-2xl bg-[#FA26A0]/20 border border-[#FA26A0]/40 flex items-center justify-center mx-auto text-2xl">
              🎙️
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                Request Seat #{requestTargetSeat + 1}
              </h3>
              <p className="text-xs text-white/70 mt-1.5 leading-relaxed">
                Send a microphone request to Host <span className="text-white font-bold">{room.host.name || 'Mr KHIZAR'}</span>. Once approved, you will join the stage.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRequestConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSendSeatRequest}
                className="flex-1 py-2.5 rounded-xl bg-[#FA26A0] text-white text-xs font-bold active:scale-95 transition-all shadow-lg shadow-pink-900/40"
              >
                Send Request 🎙️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVITE TO SEAT MODAL */}
      {showInviteToSeatModal !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#160A2B] border-t border-white/15 rounded-t-3xl p-5 shadow-2xl flex flex-col max-h-[75vh]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div>
                <h3 className="text-sm font-black text-white">Invite to Seat #{showInviteToSeatModal + 1}</h3>
                <p className="text-[10px] text-white/60">Select an audience member to invite</p>
              </div>
              <button onClick={() => setShowInviteToSeatModal(null)} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto no-scrollbar flex-1 py-1">
              {audienceList
                .filter((user) => !seats.some((s) => s?.id === user.id))
                .map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-[#200E38] border border-white/5"
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={member.avatar} alt={member.name} className="w-9 h-9 rounded-full object-cover" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">{member.name}</span>
                        <span className="text-[10px] text-white/50">Audience</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSendSeatInvite(member)}
                      className="px-3.5 py-1.5 rounded-full bg-[#FA26A0] text-white text-xs font-bold active:scale-95 transition-all shadow"
                    >
                      Invite
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* INCOMING SEAT INVITATION POPUP */}
      {incomingSeatInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#160A2B] border border-[#FA26A0]/40 rounded-3xl p-5 shadow-2xl space-y-4 text-center ring-2 ring-[#FA26A0]/30">
            <div className="w-14 h-14 rounded-2xl bg-[#FA26A0]/20 border border-[#FA26A0]/50 flex items-center justify-center mx-auto text-3xl">
              🎙️
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-[#FA26A0]">Stage Invitation</span>
              <h3 className="text-sm font-black text-white mt-1">You're Invited to Speak!</h3>
              <p className="text-xs text-white/70 mt-1.5 leading-relaxed">
                Host <span className="text-white font-bold">{incomingSeatInvite.fromHost.name}</span> invited you to take Seat #{incomingSeatInvite.seatIndex + 1}.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setIncomingSeatInvite(null);
                  showToast('Invitation declined');
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold"
              >
                Decline
              </button>
              <button
                onClick={handleAcceptSeatInvitation}
                className="flex-1 py-2.5 rounded-xl bg-[#FA26A0] text-white text-xs font-bold active:scale-95 transition-all shadow-lg shadow-pink-900/40"
              >
                Accept 🎙️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE OCCUPIED SEAT PARTICIPANT */}
      {selectedSeatMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#160A2B] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <img
                src={selectedSeatMember.user.avatar}
                alt={selectedSeatMember.user.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-[#FA26A0]"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">{selectedSeatMember.user.name}</span>
                <span className="text-[10px] text-[#FA26A0] font-mono">Occupying Seat #{selectedSeatMember.index + 1}</span>
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

      {/* OWNER SEAT CHOICE (STAND VS SIT VS INVITE) */}
      {showOwnerSeatChoice !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#160A2B] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 text-center">
            <div className="w-10 h-10 rounded-full bg-[#FA26A0]/20 text-[#FA26A0] flex items-center justify-center mx-auto text-xl">
              👑
            </div>
            <h3 className="text-sm font-black text-white">Seat #{showOwnerSeatChoice + 1}</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleOwnerTakeSeat(showOwnerSeatChoice)}
                className="w-full py-2.5 rounded-xl bg-[#FA26A0] text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 shadow"
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

      {/* PERMANENT CLOSE ROOM MODAL */}
      {showCloseRoomConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#160A2B] border border-rose-500/40 rounded-3xl p-5 shadow-2xl space-y-4 ring-2 ring-rose-500/20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-white">Permanently Close Room?</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              This will destroy the room and disconnect all participants.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowCloseRoomConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold"
              >
                Keep Active
              </button>
              <button
                onClick={() => {
                  setShowCloseRoomConfirmModal(false);
                  onCloseRoom?.(room.id);
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold active:scale-95 transition-all shadow-lg"
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
