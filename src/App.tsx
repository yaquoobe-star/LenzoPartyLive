import React, { useState, useEffect } from 'react';
import { 
  ScreenType, 
  UserProfile, 
  LiveStream, 
  PartyRoom, 
  GiftItem, 
  Conversation,
  PlatformViewMode,
  PKMatchSession,
  PKMatchInvitation 
} from './types';
import { 
  CURRENT_USER, 
  MOCK_USERS, 
  MOCK_LIVE_STREAMS, 
  MOCK_PARTY_ROOMS, 
  MOCK_GIFTS, 
  MOCK_CONVERSATIONS, 
  MOCK_STAR_RANKINGS 
} from './data/mockData';
import { getInitialUserProfile, saveStoredUserProfile } from './utils/storage';
import { pkService } from './utils/pkService';
import { profileService } from './utils/profileService';
import { auth, db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { logoutUser, fetchCurrentFirestoreProfile } from './services/authService';
import { androidBridge } from './utils/androidBridge';
import { 
  subscribeFirestoreLiveStreams, 
  subscribeFirestorePartyRooms, 
  subscribeFirestoreVideos,
  createFirestoreLiveStream,
  createFirestorePartyRoom
} from './services/firestoreService';
import { processGiftTransaction } from './services/walletService';

// Common Components
import { BottomNav } from './components/common/BottomNav';
import { DesktopSidebar } from './components/common/DesktopSidebar';
import { CreateActionSheet } from './components/common/CreateActionSheet';
import { UserProfileModal } from './components/common/UserProfileModal';
import { MicSelectionModal } from './components/common/MicSelectionModal';
import { VideoUploadSourceModal } from './components/common/VideoUploadSourceModal';
import { CameraRecorderModal } from './components/common/CameraRecorderModal';

// Screens
import { SplashScreen } from './components/screens/SplashScreen';
import { AuthScreen } from './components/screens/AuthScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { RoomsScreen } from './components/screens/RoomsScreen';
import { ActiveLiveScreen } from './components/screens/ActiveLiveScreen';
import { AudioRoomScreen } from './components/screens/AudioRoomScreen';
import { CreateLiveScreen } from './components/screens/CreateLiveScreen';
import { CreateRoomScreen } from './components/screens/CreateRoomScreen';
import { RankingsScreen } from './components/screens/RankingsScreen';
import { MessagesScreen } from './components/screens/MessagesScreen';
import { StoreScreen } from './components/screens/StoreScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { VideoFeedScreen } from './components/screens/VideoFeedScreen';
import { UploadVideoScreen } from './components/screens/UploadVideoScreen';
import { INITIAL_VIDEOS } from './data/videoData';
import { VideoItem } from './types';

// Modals
import { GiftShopModal } from './components/screens/GiftShopModal';
import { PKBattleModal } from './components/screens/PKBattleModal';
import { PKHostInviteModal } from './components/screens/PKHostInviteModal';
import { PKIncomingChallengeModal } from './components/screens/PKIncomingChallengeModal';
import { PKWinnerAnnouncementModal } from './components/screens/PKWinnerAnnouncementModal';
import { WalletModal } from './components/screens/WalletModal';
import { VIPModal } from './components/screens/VIPModal';
import { LevelAndVIPModal } from './components/screens/LevelAndVIPModal';
import { LevelUpCelebrationModal } from './components/screens/LevelUpCelebrationModal';
import { addQualifyingGiftingCoins, equipVipFrame } from './services/levelAndVipService';
import { SearchModal } from './components/screens/SearchModal';
import { NotificationsModal } from './components/screens/NotificationsModal';

export default function App() {
  // Navigation & Screen State
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('splash');
  const [viewMode, setViewMode] = useState<PlatformViewMode>('responsive');

  // Application Data States (persisted via localStorage)
  const [currentUser, setCurrentUser] = useState<UserProfile>(getInitialUserProfile);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>(MOCK_LIVE_STREAMS);
  const [partyRooms, setPartyRooms] = useState<PartyRoom[]>(MOCK_PARTY_ROOMS);
  const [videos, setVideos] = useState<VideoItem[]>(INITIAL_VIDEOS);

  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
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
  const [levelUpData, setLevelUpData] = useState<{
    oldLevel: number;
    newLevel: number;
    coinsSpent: number;
  } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [viewingProfileUser, setViewingProfileUser] = useState<UserProfile | null>(null);
  const [navigatingProfileUser, setNavigatingProfileUser] = useState<UserProfile | null>(null);
  const [activeChatUser, setActiveChatUser] = useState<UserProfile | null>(null);

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

  // Deep-linking URL parameter listener for profile links (/u/:username or ?u= or ?user=)
  useEffect(() => {
    try {
      const search = window.location.search;
      if (search) {
        const urlParams = new URLSearchParams(search);
        const usernameParam = urlParams.get('u');
        const userParam = urlParams.get('user');

        if (usernameParam || userParam) {
          const cleanUsername = usernameParam ? `@${usernameParam.replace(/^@/, '')}`.toLowerCase() : null;
          const found = Object.values(MOCK_USERS).find(
            (u) =>
              (cleanUsername && u.username?.toLowerCase() === cleanUsername) ||
              (userParam && (u.id === userParam || u.displayId === userParam))
          );

          if (found) {
            setNavigatingProfileUser(found);
            setCurrentScreen('profile');
          } else if (usernameParam || userParam) {
            profileService.getUserProfile(userParam || usernameParam!).then((p) => {
              if (p) {
                setNavigatingProfileUser(p);
                setCurrentScreen('profile');
              }
            });
          }
        }
      }
    } catch (e) {
      console.warn('Deep link error:', e);
    }
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
      if (isGiftShopOpen) { setIsGiftShopOpen(false); return true; }
      if (isWalletOpen) { setIsWalletOpen(false); return true; }
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
      if (['profile', 'settings', 'upload_video', 'create_live', 'create_room', 'rankings', 'messages', 'videos', 'rooms'].includes(currentScreen)) {
        setCurrentScreen('home');
        return true;
      }

      return false;
    });

    return () => unregisterBack();
  }, [
    isGiftShopOpen, isWalletOpen, isVIPOpen, isSearchOpen, isNotificationsOpen,
    isPKModalOpen, isPKInviteModalOpen, isMicSelectionOpen, isVideoSourceModalOpen,
    isCameraRecorderOpen, viewingProfileUser, activeChatUser, currentScreen
  ]);

  // Firebase Persistent Authentication Session Listener & Subscriptions
  const [authenticatedUid, setAuthenticatedUid] = useState<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthenticatedUid(firebaseUser ? firebaseUser.uid : null);
      if (firebaseUser) {
        try {
          const profile = await fetchCurrentFirestoreProfile(firebaseUser.uid);
          if (profile) {
            setCurrentUser(profile);
            saveStoredUserProfile(profile);
          }
        } catch (e) {
          console.warn('[Firebase Auth] Profile sync notice:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time Cloud Firestore Subscriptions for Live Streams, Rooms & Videos
  // Attached only when user is authenticated (conforming to Firebase security guidelines)
  useEffect(() => {
    if (!authenticatedUid) return;

    const unsubStreams = subscribeFirestoreLiveStreams((remoteStreams) => {
      if (remoteStreams.length > 0) {
        setLiveStreams(remoteStreams);
      }
    });

    const unsubRooms = subscribeFirestorePartyRooms((remoteRooms) => {
      if (remoteRooms.length > 0) {
        setPartyRooms(remoteRooms);
      }
    });

    const unsubVideos = subscribeFirestoreVideos((remoteVideos) => {
      if (remoteVideos.length > 0) {
        setVideos(remoteVideos);
      }
    });

    return () => {
      unsubStreams();
      unsubRooms();
      unsubVideos();
    };
  }, [authenticatedUid]);

  // Handler: Splash Completion
  const handleSplashComplete = () => {
    if (auth.currentUser) {
      setCurrentScreen('home');
    } else {
      setCurrentScreen('auth');
    }
  };

  // Handler: Auth Success
  const handleAuthSuccess = (profile: UserProfile) => {
    setCurrentUser(profile);
    saveStoredUserProfile(profile);
    setCurrentScreen('home');
  };

  // Handler: Logout
  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Logout notice:', e);
    }
    setCurrentScreen('auth');
    setActiveLiveStream(null);
    setActiveAudioRoom(null);
  };

  // Handler: Select & Open a Live Stream
  const handleSelectLive = (stream: LiveStream) => {
    setActiveLiveStream(stream);
    setCurrentScreen('live_active');
  };

  // Handler: Select & Open an Audio Party Room
  const handleSelectRoom = (room: PartyRoom) => {
    setActiveAudioRoom(room);
    setCurrentScreen('audio_room');
  };

  // Handler: Start Newly Created Live (Sync with Firestore)
  const handleStartLive = async (newStream: LiveStream) => {
    setLiveStreams([newStream, ...liveStreams]);
    setActiveLiveStream(newStream);
    setCurrentScreen('live_active');

    try {
      await createFirestoreLiveStream(newStream);
    } catch (err) {
      console.warn('[Firestore] Live stream creation notice:', err);
    }
  };

  // Handler: Create Newly Created Audio Room (Sync with Firestore)
  const handleCreateRoom = async (newRoom: PartyRoom) => {
    setPartyRooms([newRoom, ...partyRooms]);
    setActiveAudioRoom(newRoom);
    setCurrentScreen('audio_room');

    try {
      await createFirestorePartyRoom(newRoom);
    } catch (err) {
      console.warn('[Firestore] Party room creation notice:', err);
    }
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
        await updateDoc(userRef, {
          fullName: updated.name,
          profileImage: updated.avatar,
          bio: updated.bio || '',
          gender: updated.gender || 'unspecified',
          country: updated.country || 'Global',
          birthday: updated.birthday || '',
        });
      } catch (err) {
        console.warn('[Firestore] Profile update notice:', err);
      }
    }
  };

  // Handler: Send Gift
  const handleSendGift = async (gift: GiftItem, quantity: number, recipient: UserProfile) => {
    const cost = gift.coins * quantity;
    if (currentUser.coins >= cost) {
      // Optimistic update for sender
      setCurrentUser((prev) => {
        const next = {
          ...prev,
          coins: prev.coins - cost,
        };
        saveStoredUserProfile(next);
        return next;
      });

      // Atomic backend execution: Deducts wallet coins from sender, takes commission %, credits recipient earnings
      try {
        const result = await processGiftTransaction(currentUser, recipient, gift, quantity);
        if (result.success && recipient.id === currentUser.id) {
          // If sending to self in demo/test mode, update diamonds earnings immediately
          setCurrentUser((prev) => {
            const next = {
              ...prev,
              diamonds: (prev.diamonds || 0) + result.netEarnings,
            };
            saveStoredUserProfile(next);
            return next;
          });
        }
      } catch (e) {
        console.warn('Gift transaction backend error:', e);
      }

      // Qualifying coins gifting progression update for LEVEL & VIP system
      try {
        const levelRes = await addQualifyingGiftingCoins(currentUser.id, cost);
        if (levelRes.levelUpEvent) {
          const event = levelRes.levelUpEvent;
          setLevelUpData({
            oldLevel: event.oldLevel,
            newLevel: event.newLevel,
            coinsSpent: cost,
          });
          setCurrentUser((prev) => {
            const next = {
              ...prev,
              level: event.newLevel,
              vipLevel: event.unlockedVipFrame?.tier || prev.vipLevel,
              equippedVipFrame: event.unlockedVipFrame?.tier || prev.equippedVipFrame,
            };
            saveStoredUserProfile(next);
            return next;
          });
        }
      } catch (levelErr) {
        console.warn('Level progression update error:', levelErr);
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
  const handleToggleFollow = (userId: string) => {
    setLiveStreams((prev) =>
      prev.map((s) => (s.host.id === userId ? { ...s, host: { ...s.host, isFollowing: !s.host.isFollowing } } : s))
    );
    if (viewingProfileUser && viewingProfileUser.id === userId) {
      setViewingProfileUser((prev) => (prev ? { ...prev, isFollowing: !prev.isFollowing } : null));
    }
  };

  // Handler: Jump to Direct Message with a User
  const handleSendMessageToUser = (user: UserProfile) => {
    setViewingProfileUser(null);
    setActiveChatUser(user);
    setCurrentScreen('messages');
  };

  // Top hosts derived from users
  const topHostsList = Object.values(MOCK_USERS);

  // Full Screen Overlays (Splash & Auth)
  if (currentScreen === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (currentScreen === 'auth') {
    return (
      <AuthScreen 
        onSuccess={handleAuthSuccess}
        onSkip={() => setCurrentScreen('home')}
      />
    );
  }

  // Full Screen Live Broadcast View
  if (currentScreen === 'live_active' && activeLiveStream) {
    return (
      <div className="relative w-full h-screen bg-black">
        <ActiveLiveScreen
          stream={activeLiveStream}
          currentUser={currentUser}
          onClose={() => {
            setActiveLiveStream(null);
            setActivePKSession(null);
            setCurrentScreen('home');
          }}
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
          isOpen={!!viewingProfileUser}
          onClose={() => setViewingProfileUser(null)}
          onToggleFollow={handleToggleFollow}
          onSendMessage={handleSendMessageToUser}
          onSendGift={(u) => {
            setGiftRecipient(u);
            setIsGiftShopOpen(true);
          }}
          onViewFullProfile={(u) => {
            setViewingProfileUser(null);
            setActiveLiveStream(null);
            setActivePKSession(null);
            setNavigatingProfileUser(u);
            setCurrentScreen('profile');
          }}
        />
        <WalletModal
          isOpen={isWalletOpen}
          onClose={() => setIsWalletOpen(false)}
          currentUser={currentUser}
          onRechargeSuccess={handleRechargeSuccess}
        />
      </div>
    );
  }

  // Full Screen Audio Room View
  if (currentScreen === 'audio_room' && activeAudioRoom) {
    return (
      <div className="relative w-full min-h-screen bg-[#090611]">
        <AudioRoomScreen
          room={activeAudioRoom}
          currentUser={currentUser}
          onClose={() => {
            // Owner exits room to rooms list, but the room remains active and persistent in partyRooms!
            setActiveAudioRoom(null);
            setCurrentScreen('rooms');
          }}
          onUpdateRoom={(updatedRoom) => {
            setActiveAudioRoom(updatedRoom);
            setPartyRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)));
          }}
          onCloseRoom={(roomId) => {
            // Intentional permanent close by Room Owner: removes room from directory
            setPartyRooms((prev) => prev.filter((r) => r.id !== roomId));
            setActiveAudioRoom(null);
            setCurrentScreen('rooms');
          }}
          onOpenGiftShop={(recipient) => {
            setGiftRecipient(recipient);
            setIsGiftShopOpen(true);
          }}
          onSelectUser={(u) => setViewingProfileUser(u)}
          onOpenPK={handleOpenPKFromNav}
          activeGiftCelebration={activeGiftCelebration}
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
          isOpen={!!viewingProfileUser}
          onClose={() => setViewingProfileUser(null)}
          onToggleFollow={handleToggleFollow}
          onSendMessage={handleSendMessageToUser}
          onSendGift={(u) => {
            setGiftRecipient(u);
            setIsGiftShopOpen(true);
          }}
          onViewFullProfile={(u) => {
            setViewingProfileUser(null);
            setActiveAudioRoom(null);
            setNavigatingProfileUser(u);
            setCurrentScreen('profile');
          }}
        />
        <WalletModal
          isOpen={isWalletOpen}
          onClose={() => setIsWalletOpen(false)}
          currentUser={currentUser}
          onRechargeSuccess={handleRechargeSuccess}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#090611] text-white flex flex-col md:flex-row antialiased selection:bg-[#F328D5]/30">
      
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
        onOpenCreateLive={() => setCurrentScreen('create_live')}
        onOpenCreateRoom={() => setCurrentScreen('create_room')}
        onOpenWallet={() => setIsWalletOpen(true)}
        onOpenGiftShop={() => {
          setGiftRecipient(null);
          setIsGiftShopOpen(true);
        }}
        onOpenPKModal={handleOpenPKFromNav}
        onOpenVIP={() => setIsVIPOpen(true)}
        onLogout={handleLogout}
        unreadMessagesCount={99}
      />

      {/* Main Responsive Application Area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 bg-[#090611] overflow-x-hidden relative">
        {/* Primary Screen Render Router */}
        <main className="flex-1 w-full">
          {currentScreen === 'home' && (
            <HomeScreen
              liveStreams={liveStreams}
              partyRooms={partyRooms}
              topHosts={topHostsList}
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
            />
          )}

          {(currentScreen === 'party' || currentScreen === 'rooms') && (
            <RoomsScreen
              partyRooms={partyRooms}
              onSelectRoom={handleSelectRoom}
              onNavigate={(s) => setCurrentScreen(s)}
              onOpenCreateRoom={() => setCurrentScreen('create_room')}
              onOpenSearch={() => setIsSearchOpen(true)}
              onOpenMicMenu={handleOpenMicMenu}
            />
          )}

          {currentScreen === 'create_live' && (
            <CreateLiveScreen
              currentUser={currentUser}
              onClose={() => setCurrentScreen('home')}
              onStartLive={handleStartLive}
            />
          )}

          {currentScreen === 'create_room' && (
            <CreateRoomScreen
              currentUser={currentUser}
              onClose={() => setCurrentScreen('rooms')}
              onCreateRoom={handleCreateRoom}
            />
          )}

          {currentScreen === 'rankings' && (
            <RankingsScreen
              currentUser={currentUser}
              onNavigate={(s) => setCurrentScreen(s)}
              onSelectUser={(u) => setViewingProfileUser(u)}
            />
          )}

          {currentScreen === 'store' && (
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
            />
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
            />
          )}

          {currentScreen === 'videos' && (
            <VideoFeedScreen
              videos={videos}
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
              activeGiftCelebration={activeGiftCelebration}
            />
          )}

          {currentScreen === 'upload_video' && (
            <UploadVideoScreen
              currentUser={currentUser}
              initialVideoUrl={stagedVideoData?.url}
              initialFile={stagedVideoData?.file}
              onClose={() => {
                setStagedVideoData(null);
                setCurrentScreen('videos');
              }}
              onUploadSuccess={(newVideo) => {
                setVideos([newVideo, ...videos]);
                setStagedVideoData(null);
                setCurrentScreen('videos');
              }}
            />
          )}

          {currentScreen === 'profile' && (
            <ProfileScreen
              currentUser={currentUser}
              viewingUser={navigatingProfileUser}
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
              onOpenVIP={() => setIsLevelVIPOpen(true)}
              onOpenLevelVIP={() => setIsLevelVIPOpen(true)}
              userVideos={videos.filter(v => v.creator.id === (navigatingProfileUser?.id || currentUser.id) || v.creator.name === (navigatingProfileUser?.name || currentUser.name))}
              onSelectVideo={(v) => setCurrentScreen('videos')}
              onOpenUploadVideo={handleOpenPlusUpload}
              onDeleteVideo={(id) => setVideos((prev) => prev.filter((v) => v.id !== id))}
            />
          )}

          {currentScreen === 'settings' && (
            <SettingsScreen
              onNavigate={(s) => setCurrentScreen(s)}
              onLogout={handleLogout}
              onOpenWallet={() => setIsWalletOpen(true)}
            />
          )}

        </main>

        {/* Mobile Fixed Bottom Navigation Bar (7 Buttons: Store, Home, Rooms, +, Videos, Chat, Profile) */}
        <BottomNav
          currentScreen={currentScreen}
          onNavigate={(screen) => {
            if (screen === 'profile') {
              setNavigatingProfileUser(null);
            }
            setCurrentScreen(screen);
          }}
          onOpenCreate={handleOpenPlusUpload}
          unreadMessagesCount={3}
          storeNotificationCount={1}
        />
      </div>

      {/* Global Modals & Interactive Sheets */}
      
      {/* 1. Microphone Button Selection Modal: Exactly 2 options (1. GO LIVE, 2. CREATE ROOM) */}
      <MicSelectionModal
        isOpen={isMicSelectionOpen}
        onClose={() => setIsMicSelectionOpen(false)}
        onSelectGoLive={() => setCurrentScreen('create_live')}
        onSelectCreateRoom={() => setCurrentScreen('create_room')}
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
      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        currentUser={currentUser}
        onRechargeSuccess={handleRechargeSuccess}
      />

      {/* 5. LEVEL & VIP Progression & Frames Modal */}
      <LevelAndVIPModal
        isOpen={isLevelVIPOpen}
        onClose={() => setIsLevelVIPOpen(false)}
        currentUser={currentUser}
        onUpdateUser={(updated) => {
          setCurrentUser(prev => {
            const next = { ...prev, ...updated };
            saveStoredUserProfile(next);
            return next;
          });
        }}
      />

      {/* 5b. Level Up Milestone Celebration Modal */}
      <LevelUpCelebrationModal
        isOpen={!!levelUpData}
        onClose={() => setLevelUpData(null)}
        oldLevel={levelUpData?.oldLevel || 1}
        newLevel={levelUpData?.newLevel || 2}
        coinsSpent={levelUpData?.coinsSpent || 0}
        userAvatar={currentUser.avatar}
        userName={currentUser.name}
        onEquipVipFrame={async (tier) => {
          await equipVipFrame(currentUser.id, tier);
          setCurrentUser(prev => {
            const next = {
              ...prev,
              equippedVipFrame: tier,
              vipLevel: tier,
              isVIP: true,
            };
            saveStoredUserProfile(next);
            return next;
          });
        }}
      />

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
        liveStreams={liveStreams}
        partyRooms={partyRooms}
        users={topHostsList}
        onSelectLive={handleSelectLive}
        onSelectRoom={handleSelectRoom}
        onSelectUser={(u) => setViewingProfileUser(u)}
      />

      {/* 7. Notifications Center Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onMarkAllRead={() => {}}
      />

      {/* 8. User / Host Profile Detail Modal */}
      <UserProfileModal
        user={viewingProfileUser}
        isOpen={!!viewingProfileUser}
        onClose={() => setViewingProfileUser(null)}
        onToggleFollow={handleToggleFollow}
        onSendMessage={handleSendMessageToUser}
        onSendGift={(u) => {
          setGiftRecipient(u);
          setIsGiftShopOpen(true);
        }}
        onViewFullProfile={(u) => {
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
    </div>
  );
}
