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
  CheckCircle2
} from 'lucide-react';
import { 
  LiveStream, 
  ChatMessage, 
  UserProfile, 
  GiftItem, 
  PKMatchSession, 
  PKGiftEvent, 
  PKLikeEvent 
} from '../../types';
import { AvatarWithFrame } from '../common/AvatarWithFrame';
import { LevelBadge } from '../common/LevelBadge';
import { pkService } from '../../utils/pkService';
import { 
  acquireRealDeviceCamera, 
  stopMediaStream, 
  createAudioAnalyser, 
  AudioAnalyserController 
} from '../../utils/mediaDeviceHelper';
import { agoraRtcService } from '../../utils/agoraRtcService';

interface ActiveLiveScreenProps {
  stream: LiveStream;
  currentUser: UserProfile;
  onClose: () => void;
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
  onOpenGiftShop,
  onOpenPK,
  onSelectUser,
  activeGiftCelebration,
  activePKSession,
  onForfeitPK,
  onRematchPK,
}) => {
  // Permission rule: user is stream creator / live broadcast owner
  const isActualHost = currentUser.id === stream.host.id;
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
  const [streamSeconds, setStreamSeconds] = useState<number>(342); // live timer

  // Chat & Messaging Controls
  const [pinnedMessage, setPinnedMessage] = useState<string | null>(
    '👑 Host Announcement: Welcome to Lonzo Party Live! Send gifts & double tap to support! 💕'
  );
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      senderId: stream.host.id,
      senderName: stream.host.name,
      senderAvatar: stream.host.avatar,
      isHost: true,
      text: 'Hey everyone! Welcome to my live party! Drop a like ❤️',
      timestamp: '2m ago'
    },
    {
      id: 'm2',
      senderId: 'user_lovely_star',
      senderName: 'Lovely Star 💕',
      senderAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
      text: 'So beautiful!! 😍',
      timestamp: '1m ago'
    },
    {
      id: 'm3',
      senderId: 'user_rohan',
      senderName: 'Rohan Kumar',
      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      text: 'You are amazing host! ❤️',
      timestamp: 'Just now'
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [burstHearts, setBurstHearts] = useState<BurstHeart[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [isFollowing, setIsFollowing] = useState(stream.host.isFollowing || false);
  const [streamLikes, setStreamLikes] = useState<number>(stream.likesCount || 156420);

  // Authoritative server timer synchronization for PK
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);

  // Realtime Device Camera & Audio Analyzer States
  const [audioVolumeLevel, setAudioVolumeLevel] = useState<number>(0);
  const [cameraLabel, setCameraLabel] = useState<string>('Front Camera');
  const [isRealBackCamera, setIsRealBackCamera] = useState<boolean>(false);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState<boolean>(false);

  // Agora RTC Live Subscription States (For Remote Viewers & Broadcasters)
  const [hasRemoteAgoraStream, setHasRemoteAgoraStream] = useState<boolean>(false);
  const [remoteHostIsCameraOn, setRemoteHostIsCameraOn] = useState<boolean>(true);
  const [agoraConnectionState, setAgoraConnectionState] = useState<string>('connecting');
  const [viewerSoundMuted, setViewerSoundMuted] = useState<boolean>(false);
  const remotePlayerContainerRef = useRef<HTMLDivElement>(null);
  const localPlayerContainerRef = useRef<HTMLDivElement>(null);

  // Agora RTC Engine States
  const [agoraConfig, setAgoraConfig] = useState<{ configured: boolean; appId: string }>({ configured: false, appId: '' });
  const [agoraConnected, setAgoraConnected] = useState<boolean>(false);
  const [agoraRole, setAgoraRole] = useState<'host' | 'audience'>('audience');

  // References
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioAnalyserControllerRef = useRef<AudioAnalyserController | null>(null);
  const audioVolumeRafRef = useRef<number | null>(null);
  const isAcquiringRef = useRef<boolean>(false);
  const lastTapRef = useRef<{ time: number; x: number; y: number; side: string }>({ time: 0, x: 0, y: 0, side: '' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Live broadcast duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setStreamSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Camera & Realtime Microphone Initialization & Lifecycle
  const startCamera = async (front = isFrontCamera) => {
    if (isAcquiringRef.current) return;
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

    if (!isCameraOn) {
      setHasWebcamStream(false);
      setAudioVolumeLevel(0);
      isAcquiringRef.current = false;
      return;
    }

    try {
      const result = await acquireRealDeviceCamera({
        isFront: front,
        enableAudio: true, // Always capture real microphone for live broadcast!
        idealWidth: 1280,
        idealHeight: 720,
      });

      mediaStreamRef.current = result.stream;
      setIsRealBackCamera(result.isRealBackCamera);
      setCameraLabel(result.label);

      // Enforce current mute state on real audio tracks
      result.stream.getAudioTracks().forEach((track) => {
        track.enabled = !isMicMuted;
      });

      // Bind to video element
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = result.stream;
        videoElementRef.current.play().catch(() => {});
      }

      // Initialize real-time Web Audio Analyser
      if (result.hasAudio) {
        const controller = createAudioAnalyser(result.stream);
        audioAnalyserControllerRef.current = controller;
      }

      // Camera and mic captured successfully
      setHasWebcamStream(true);
      setCameraPermissionDenied(false);
      if (localPlayerContainerRef.current) {
        agoraRtcService.playLocalVideo(localPlayerContainerRef.current);
      }
    } catch (err: any) {
      console.warn('Real camera/mic acquisition error:', err);
      setHasWebcamStream(false);
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        setCameraPermissionDenied(true);
      }
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

  // Ensure video element rebinds when camera or front/rear state mounts
  useEffect(() => {
    if (videoElementRef.current && mediaStreamRef.current) {
      videoElementRef.current.srcObject = mediaStreamRef.current;
      videoElementRef.current.play().catch(() => {});
    }
  }, [hasWebcamStream, isCameraOn, isFrontCamera]);

  // Toggle Camera On / Off
  const handleToggleCamera = () => {
    if (isCameraOn) {
      // Turn Camera OFF
      if (audioAnalyserControllerRef.current) {
        audioAnalyserControllerRef.current.cleanup();
        audioAnalyserControllerRef.current = null;
      }
      if (mediaStreamRef.current) {
        stopMediaStream(mediaStreamRef.current);
        mediaStreamRef.current = null;
      }
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = null;
      }
      setIsCameraOn(false);
      setHasWebcamStream(false);
      setAudioVolumeLevel(0);
      agoraRtcService.setCameraEnabled(false);
      showToast('📷 Camera turned OFF (Audio Mode)');
    } else {
      // Turn Camera ON
      setIsCameraOn(true);
      agoraRtcService.setCameraEnabled(true);
      startCamera(isFrontCamera);
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

    if (nextMuted) {
      setAudioVolumeLevel(0);
      showToast('🔇 Microphone Muted (Realtime Off)');
    } else {
      showToast('🎙️ Microphone Active (Realtime On)');
    }
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

  // React to Camera On/Off state for Host
  useEffect(() => {
    if (isActualHost && isHostMode) {
      if (isCameraOn) {
        startCamera(isFrontCamera);
      } else {
        if (audioAnalyserControllerRef.current) {
          audioAnalyserControllerRef.current.cleanup();
          audioAnalyserControllerRef.current = null;
        }
        if (mediaStreamRef.current) {
          stopMediaStream(mediaStreamRef.current);
          mediaStreamRef.current = null;
        }
        if (videoElementRef.current) {
          videoElementRef.current.srcObject = null;
        }
        setHasWebcamStream(false);
        setAudioVolumeLevel(0);
      }
    }

    return () => {
      if (audioAnalyserControllerRef.current) {
        audioAnalyserControllerRef.current.cleanup();
      }
      if (mediaStreamRef.current) {
        stopMediaStream(mediaStreamRef.current);
      }
    };
  }, [isCameraOn, isActualHost, isHostMode]);

  // Agora RTC Engine Solo Live Broadcasting & Viewing Integration
  useEffect(() => {
    let isSubscribed = true;

    const setupAgoraLive = async () => {
      try {
        setAgoraConnectionState('connecting');
        const config = await agoraRtcService.getAgoraConfig();
        if (!isSubscribed) return;
        setAgoraConfig(config);

        const role = isActualHost && isHostMode ? 'host' : 'audience';
        setAgoraRole(role);

        if (config.configured && config.appId) {
          const tokenData = await agoraRtcService.requestRtcToken(
            stream.id,
            currentUser.id,
            role === 'host' ? 'broadcaster' : 'audience'
          );

          if (!isSubscribed) return;

          if (tokenData.token) {
            await agoraRtcService.joinChannel({
              appId: config.appId,
              channelName: stream.id,
              userAccount: currentUser.id,
              role,
              token: tokenData.token,
              enableVideo: isCameraOn && !cameraPermissionDenied,
              enableAudio: !isMicMuted,
              isFront: isFrontCamera,
              mediaStream: mediaStreamRef.current,
            });

            if (!isSubscribed) return;
            setAgoraConnected(true);
            setAgoraConnectionState('connected');
            console.log(`[Agora Solo Live] Successfully joined channel ${stream.id} as ${role}`);

            if (agoraRtcService.getIsCameraPermissionDenied()) {
              setCameraPermissionDenied(true);
            }

            // If broadcaster and video track is live, mount local camera preview to container
            if (role === 'host' && localPlayerContainerRef.current && agoraRtcService.getLocalVideoTrack()) {
              agoraRtcService.playLocalVideo(localPlayerContainerRef.current);
            }
          }
        }
      } catch (err: any) {
        console.warn('[Agora Solo Live] Channel join error:', err?.message || err);
        setAgoraConnectionState('error');
      }
    };

    setupAgoraLive();

    const unsubRemote = agoraRtcService.onRemoteTrack((remoteHost) => {
      try {
        if (remoteHost.videoTrack && remotePlayerContainerRef.current) {
          agoraRtcService.playRemoteVideo(remoteHost.uid, remotePlayerContainerRef.current);
          setHasRemoteAgoraStream(true);
        }
        if (remoteHost.audioTrack) {
          remoteHost.audioTrack.play();
        }
        setRemoteHostIsCameraOn(remoteHost.hasVideo);
      } catch (e) {
        console.warn('[Agora Solo Live] Play remote track warning:', e);
      }
    });

    const unsubUserLeft = agoraRtcService.onUserLeft(() => {
      setHasRemoteAgoraStream(false);
      showToast('🛑 Host has ended the live broadcast');
      setTimeout(() => {
        onClose();
      }, 1800);
    });

    return () => {
      isSubscribed = false;
      unsubRemote();
      unsubUserLeft();
      agoraRtcService.leaveChannel().catch(() => {});
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
      setStreamLikes((prev) => prev + 1);

      if (activePKSession) {
        const targetHostId = side === 'left' ? activePKSession.host1.user.id : activePKSession.host2.user.id;
        pkService.sendPKLike(activePKSession.id, targetHostId, 1, xPercent, yPercent);
      }
    } else {
      lastTapRef.current = { time: now, x: clientX, y: clientY, side };
    }
  };

  // Send Message (Supports Host Badge & Pinned Comments)
  const handleSendMessage = (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: currentUser.id,
      senderName: isHostMode ? `${currentUser.name}` : currentUser.name,
      senderAvatar: currentUser.avatar,
      senderVip: currentUser.vipLevel,
      isHost: isHostMode,
      text: textToSend,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
    setShowEmojiPicker(false);
  };

  // Host Pins a Message
  const handlePinMessage = (text: string) => {
    setPinnedMessage(text);
    showToast('📌 Pinned to live chat!');
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
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col justify-between select-none animate-fade-in font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-[#8B20FF] text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg shadow-[#8B20FF]/50 animate-fade-in pointer-events-none flex items-center gap-1.5 border border-white/20">
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
            <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-2xl">
              🛑
            </div>
            <h4 className="text-lg font-black text-white font-display">End Live Broadcast?</h4>
            <p className="text-xs text-[#B9AECF]">
              Your stream will be ended and viewers will be redirected. Here is your current stream summary:
            </p>

            <div className="grid grid-cols-3 gap-2 bg-[#090611] p-3 rounded-2xl border border-white/10 text-left">
              <div>
                <span className="text-[10px] text-[#B9AECF]">Duration</span>
                <p className="text-xs font-bold text-white font-mono">{formatDuration(streamSeconds)}</p>
              </div>
              <div>
                <span className="text-[10px] text-[#B9AECF]">Viewers</span>
                <p className="text-xs font-bold text-[#06B6D4] font-mono">{stream.viewerCount || '1.2K'}</p>
              </div>
              <div>
                <span className="text-[10px] text-[#B9AECF]">Likes</span>
                <p className="text-xs font-bold text-rose-400 font-mono">{streamLikes.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowEndLiveConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
              >
                Continue Live
              </button>
              <button
                onClick={() => {
                  setShowEndLiveConfirm(false);
                  agoraRtcService.leaveChannel().catch(() => {});
                  onClose();
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:opacity-90 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all"
              >
                End Stream
              </button>
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

              {/* Host 1 Top 3 MVP Gifters */}
              <div className="flex items-center gap-1 mt-1.5">
                {[
                  { r: '🥇', a: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80' },
                  { r: '🥈', a: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80' },
                  { r: '🥉', a: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=80' }
                ].map((mvp, i) => (
                  <div key={i} className="relative w-5 h-5 rounded-full ring-1 ring-[#00F2FE]/50 overflow-hidden">
                    <img src={mvp.a} alt="MVP" className="w-full h-full object-cover" />
                    <span className="absolute -bottom-1 -right-0.5 text-[7px]">{mvp.r}</span>
                  </div>
                ))}
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

              {/* Host 2 Top 3 MVP Gifters */}
              <div className="flex items-center gap-1 mt-1.5">
                {[
                  { r: '🥇', a: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=80&auto=format&fit=crop&q=80' },
                  { r: '🥈', a: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&auto=format&fit=crop&q=80' },
                  { r: '🥉', a: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80' }
                ].map((mvp, i) => (
                  <div key={i} className="relative w-5 h-5 rounded-full ring-1 ring-[#FE2C55]/50 overflow-hidden">
                    <img src={mvp.a} alt="MVP" className="w-full h-full object-cover" />
                    <span className="absolute -bottom-1 -right-0.5 text-[7px]">{mvp.r}</span>
                  </div>
                ))}
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
          <div className="absolute top-16 sm:top-18 left-3 right-3 z-30 pointer-events-none">
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
                  className="w-full h-full object-cover"
                />
                <video
                  ref={videoElementRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-all absolute inset-0 ${isFrontCamera ? '-scale-x-100' : 'scale-x-100'} ${VIDEO_FILTERS[activeFilter].css} ${
                    hasWebcamStream && !agoraConnected ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                />

                {hasWebcamStream && (
                  <div className="absolute top-20 right-4 z-20 flex flex-col items-end gap-1.5 pointer-events-auto">
                    {/* Real Device Camera Mode & Instant Rotate Button */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-emerald-500/40 text-emerald-400 text-[11px] font-bold shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>{agoraConnected ? '🔴 Agora Live' : isFrontCamera ? '🤳 Front Camera' : '📷 Back Camera (Rear)'}</span>
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
                          setCameraPermissionDenied(false);
                          agoraRtcService.resetPermissionDeniedFlags();
                          startCamera(isFrontCamera);
                        }}
                        className="px-6 py-3 rounded-full bg-gradient-to-r from-[#FA26A0] via-[#F328D5] to-[#8B20FF] text-white text-xs font-black shadow-xl shadow-pink-900/60 flex items-center gap-2 active:scale-95 transition-all"
                      >
                        <Camera className="w-4 h-4" />
                        <span>{cameraPermissionDenied ? 'Allow Camera & Retry 🔄' : 'Activate Real Device Camera 🎥'}</span>
                      </button>

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
               REMOTE VIEWER PERSPECTIVE: Real Agora RTC Live Broadcast Stream from Host
               NO FAKE PICTURES OR DUMMY COVERS!
               ======================================================== */
            <div className="relative w-full h-full">
              {/* Agora RTC Remote Video Player Container */}
              <div
                ref={remotePlayerContainerRef}
                className={`w-full h-full overflow-hidden [&>div]:w-full [&>div]:h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover ${
                  hasRemoteAgoraStream && remoteHostIsCameraOn ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
                }`}
              />

              {/* Status Overlay: Real-Time Agora Stream Status */}
              {hasRemoteAgoraStream && remoteHostIsCameraOn && (
                <div className="absolute top-20 right-4 z-20 flex flex-col items-end gap-1.5 pointer-events-auto">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-emerald-500/40 text-emerald-400 text-[11px] font-bold shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>🔴 LIVE • Agora RTC Broadcast</span>
                  </div>

                  {viewerSoundMuted && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewerSoundMuted(false);
                        setIsMuted(false);
                      }}
                      className="px-3 py-1 rounded-full bg-[#FA26A0] text-white text-[11px] font-bold shadow-lg shadow-pink-900/50 flex items-center gap-1 animate-pulse"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>Tap to Unmute Host Audio 🔊</span>
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
                      {stream.host.name} is streaming live audio via Agora RTC.
                    </p>
                  </div>
                </div>
              )}

              {/* If Remote Stream is Connecting or Host hasn't published yet */}
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
                    <span>{agoraConnectionState === 'connecting' ? 'Connecting Agora RTC Live Feed...' : 'Waiting for Host Live Stream...'}</span>
                  </div>
                  <p className="text-xs text-[#9E97AA] text-center max-w-xs">
                    Real-time low-latency video and audio stream from {stream.host.name} powered by Agora RTC.
                  </p>
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
      <div className="relative z-30 flex flex-col p-3 sm:p-5 pt-safe gap-2">
        <div className="flex items-center justify-between">
          {/* Host Profile Info Pill */}
          <div 
            onClick={() => onSelectUser(stream.host)}
            className="flex items-center gap-2 bg-black/55 backdrop-blur-md border border-white/10 rounded-full pl-1.5 pr-2.5 py-1 cursor-pointer hover:bg-black/70 transition-colors shadow-lg"
          >
            <AvatarWithFrame
              avatar={stream.host.avatar}
              name={stream.host.name}
              level={stream.host.level || 42}
              size="sm"
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white leading-tight flex items-center gap-1">
                {stream.host.name}
                {isActualHost && (
                  <span className="text-[9px] bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] font-black px-1 rounded-sm uppercase">
                    You (Host)
                  </span>
                )}
              </span>
              <span className="text-[10px] text-[#FFC84A] font-bold leading-tight flex items-center gap-0.5">
                <span>🔥</span>
                <span>{stream.host.fansCount || '123.4K'}</span>
              </span>
            </div>

            {!isActualHost && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFollowing(!isFollowing);
                  showToast(!isFollowing ? `Followed ${stream.host.name}!` : `Unfollowed`);
                }}
                className={`ml-1 px-3 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                  isFollowing
                    ? 'bg-white/20 text-white'
                    : 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md shadow-[#F328D5]/30'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Host Mode Perspective Switcher - ONLY show to live owner */}
            {isActualHost && (
              <button
                onClick={() => {
                  const nextMode = !isHostMode;
                  setIsHostMode(nextMode);
                  showToast(nextMode ? '👑 Switched to Host Control Mode' : '👁️ Switched to Viewer Mode');
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 border transition-all active:scale-95 shadow ${
                  isHostMode 
                    ? 'bg-[#FFC84A] text-[#090611] border-[#FFC84A] shadow-[#FFC84A]/30' 
                    : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                }`}
                title="Toggle between Host Controls and Viewer View"
              >
                <Crown className="w-3 h-3" />
                <span>{isHostMode ? 'Host Controls' : 'Viewer Mode'}</span>
              </button>
            )}

            {/* Viewer Count Pill */}
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-black/55 backdrop-blur-md text-white text-xs font-bold border border-white/10 shadow">
              <span>👁️</span>
              <span className="font-mono">{stream.viewerCount || '1.2K'}</span>
            </div>

            {/* Audio Mute toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* PK Match / Live Battle Button - ONLY FOR LIVE OWNER */}
            {isActualHost && (
              activePKSession ? (
                <button
                  onClick={() => setShowForfeitConfirm(true)}
                  className="px-2.5 py-1 rounded-full bg-red-600/80 hover:bg-red-600 text-white text-[11px] font-bold flex items-center gap-1 border border-white/20 shadow active:scale-95 transition-all"
                  title="Forfeit PK Battle"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Forfeit</span>
                </button>
              ) : (
                <button
                  onClick={onOpenPK}
                  className="px-3 py-1 rounded-full bg-gradient-to-r from-[#F59E0B] via-[#EF4444] to-[#F328D5] text-white text-[11px] font-black flex items-center gap-1.5 shadow-lg shadow-red-500/25 active:scale-95 transition-all animate-pulse"
                  title="Challenge eligible host to PK Battle"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>PK</span>
                </button>
              )
            )}

            {/* Close Stream / End Live Button */}
            <button
              onClick={() => {
                if (isActualHost) {
                  setShowEndLiveConfirm(true);
                } else {
                  onClose();
                }
              }}
              className={`w-8 h-8 rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center transition-colors ${
                isActualHost ? 'bg-red-600/70 hover:bg-red-600 text-white' : 'bg-black/50 hover:bg-black/80 text-white'
              }`}
              title={isActualHost ? 'End Broadcast' : 'Exit Stream'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Level Progress Bar & Live Duration */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow">
              <span className="px-1.5 py-0.2 rounded-md bg-[#FFC84A] text-[#090611] text-[10px] font-black">
                Lv.{stream.host.level || 42}
              </span>
              <div className="w-16 sm:w-24 h-2 rounded-full bg-white/20 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] rounded-full shadow-[0_0_8px_#FFC84A]"
                  style={{ width: '68%' }}
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-white/90">
                68%
              </span>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#FF2E93] to-[#FF007A] text-white text-[10px] font-black shadow-md shadow-pink-500/30 animate-pulse">
              <span>🔥</span>
              <span>Hot Live</span>
            </div>
          </div>

          {/* Broadcast Duration Badge */}
          <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white font-mono text-[10px] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            <span>{formatDuration(streamSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Middle Video Area - Clean Unobstructed Full Screen View */}
      <div className="flex-1 pointer-events-none" />

      {/* Bottom Control Section */}
      <div className="relative z-30 p-3 sm:p-4 pb-safe bg-gradient-to-t from-black via-black/90 to-transparent">
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

            {/* 5. PK Battle Shortcut & End Stream */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={onOpenPK}
                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#EF4444] text-white text-xs font-black flex items-center gap-1 shadow active:scale-95"
                title="Challenge Host to PK Battle"
              >
                <Swords className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">PK Battle</span>
              </button>
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

          {/* Virtual Gift Button 🎁 */}
          <button
            onClick={() => onOpenGiftShop(stream.host)}
            className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#8B20FF] via-[#F328D5] to-[#FFC84A] flex items-center justify-center text-white shadow-lg shadow-[#F328D5]/50 active:scale-95 transition-all animate-pulse"
            title="Send Gift"
          >
            <Gift className="w-5 h-5 text-white stroke-[2.2]" />
          </button>

          {/* Share Stream Button */}
          <button
            onClick={() => showToast('Live stream link copied to clipboard! 📋')}
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
    </div>
  );
};
