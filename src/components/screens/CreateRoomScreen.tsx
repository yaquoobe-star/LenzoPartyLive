import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Users,
  Lock,
  Eye,
  EyeOff,
  Check,
  Crown,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Upload,
} from 'lucide-react';
import { auth } from '../../firebase';
import { PartyRoom, UserProfile } from '../../types';
import {
  PARTY_SEAT_TIERS,
  PartySeatCount,
  clampPartyMaxSeatsForHostLevel,
  getActiveSeatCapacity,
  getAllowedSeatTierForLevel,
  isSeatModeUnlockedForLevel,
} from '../../utils/partySeatRules';
import {
  DEFAULT_PARTY_BACKGROUND_ID,
  PARTY_BACKGROUND_PRESETS,
  PartyBackgroundType,
  resolvePartyBackgroundImageUrl,
  resolvePartyRoomBackground,
} from '../../utils/partyBackgrounds';
import { uploadPartyBackgroundImage, uploadUserImage } from '../../services/storageService';

interface CreateRoomScreenProps {
  currentUser: UserProfile;
  onClose: () => void;
  onCreateRoom: (newRoom: PartyRoom) => void;
}

export const CreateRoomScreen: React.FC<CreateRoomScreenProps> = ({
  currentUser,
  onClose,
  onCreateRoom,
}) => {
  const seatTierState = getAllowedSeatTierForLevel(currentUser.level);
  const hostLevel = seatTierState.hostLevel;
  const [roomName, setRoomName] = useState('');
  const [maxSeats, setMaxSeats] = useState<PartySeatCount>(() => seatTierState.maxUnlockedSeats);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [coverUrl, setCoverUrl] = useState(
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
  );
  const [backgroundType, setBackgroundType] = useState<PartyBackgroundType>('preset');
  const [backgroundId, setBackgroundId] = useState<string>(DEFAULT_PARTY_BACKGROUND_ID);
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [bgUploadProgress, setBgUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const coverFileRef = useRef<HTMLInputElement | null>(null);
  const bgFileRef = useRef<HTMLInputElement | null>(null);

  const sampleCovers = [
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
  ];

  const handleCoverGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image for the room cover.');
      return;
    }
    setError(null);
    setIsUploadingCover(true);
    try {
      const url = await uploadUserImage(file, 'covers');
      if (url) setCoverUrl(url);
    } catch (err: any) {
      setError(err?.message || 'Could not upload cover image.');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleBackgroundGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image from your gallery for the party background.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('Background image must be 12 MB or smaller.');
      return;
    }
    setError(null);
    setIsUploadingBg(true);
    setBgUploadProgress(15);
    try {
      const uploadedUrl = await uploadPartyBackgroundImage(file, (pct) => {
        setBgUploadProgress(pct);
      });
      if (!uploadedUrl) throw new Error('Could not upload background photo.');
      setBackgroundType('custom');
      setBackgroundImage(uploadedUrl);
    } catch (err: any) {
      setError(err?.message || 'Failed to upload party background from gallery.');
    } finally {
      setIsUploadingBg(false);
      setBgUploadProgress(0);
    }
  };

  const resolvedStagePreview = resolvePartyRoomBackground({
    backgroundType,
    backgroundId,
    backgroundImage,
    hostAvatar: currentUser.avatar,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !currentUser.id || currentUser.id === 'guest') {
      setError('Please sign in first to create a party room.');
      return;
    }
    if (isUploadingCover || isUploadingBg) {
      setError('Please wait for your image upload to finish.');
      return;
    }
    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }

    if (isPrivate && !password.trim()) {
      setError('Please enter a room password for private room');
      return;
    }

    const hostProfile: UserProfile = {
      ...currentUser,
      id: auth.currentUser.uid,
    };

    const effectiveMaxSeats = clampPartyMaxSeatsForHostLevel(maxSeats, hostLevel);
    const activeCapacity = getActiveSeatCapacity(effectiveMaxSeats, hostLevel);

    // Initialize 5, 8, or 16 seats based on unlocked host level tier
    const emptySeats: (UserProfile | null)[] = Array(effectiveMaxSeats).fill(null);
    // Host sits in seat 0
    emptySeats[0] = hostProfile;

    const newRoom: PartyRoom = {
      id: `room_${Date.now()}`,
      displayId: Math.floor(10000 + Math.random() * 90000).toString(),
      title: roomName.trim(),
      category: 'Party',
      host: hostProfile,
      coverImage: coverUrl,
      iconType: 'heart',
      participantCount: `1/${activeCapacity}`,
      numericParticipants: 1,
      isAudioRoom: true,
      maxSeats: effectiveMaxSeats,
      roomType: isPrivate ? 'private' : 'public',
      ...(isPrivate && password.trim() ? { password: password.trim() } : {}),
      announcement: announcement.trim() || 'Welcome to my party voice room! Respect everyone and enjoy!',
      seats: emptySeats,
      mutedSeatIndices: [],
      isLocked: false,
      allowJoin: true,
      startTime: Date.now(),
      likesCount: 0,
      backgroundType,
      backgroundId,
      backgroundImage:
        backgroundType === 'host_dp'
          ? hostProfile.avatar || ''
          : backgroundType === 'custom'
          ? backgroundImage
          : '',
    };

    onCreateRoom(newRoom);
  };

  return (
    <div className="relative min-h-dvh-screen w-full bg-[#080413] flex flex-col justify-between px-4 sm:px-6 safe-pt-4 safe-pb-4 select-none animate-fade-in text-white font-sans">
      <div className="max-w-md mx-auto w-full">
        
        {/* ========================================================
            1. HEADER (Back Arrow + "Create Room")
            Matching Screenshot 1 top-right
           ======================================================== */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#160E24] hover:bg-[#201433] border border-white/10 flex items-center justify-center text-white transition-colors active:scale-95"
            title="Back to Rooms"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-black text-white font-display">Create Room</h2>
          <div className="w-9" /> {/* Spacer */}
        </div>

        {error && (
          <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs py-2 px-3 rounded-xl mb-4 animate-shake">
            {error}
          </div>
        )}

        {/* ========================================================
            2. ADD ROOM COVER BOX (Gallery Upload + Presets)
           ======================================================== */}
        <input
          ref={coverFileRef}
          type="file"
          accept="image/*"
          onChange={handleCoverGallerySelect}
          className="hidden"
        />
        <input
          ref={bgFileRef}
          type="file"
          accept="image/*"
          onChange={handleBackgroundGallerySelect}
          className="hidden"
        />

        <div className="relative mb-5">
          <div
            onClick={() => coverFileRef.current?.click()}
            className="relative h-40 rounded-2xl overflow-hidden border border-dashed border-white/20 hover:border-[#FA26A0] bg-[#140D20] group cursor-pointer"
          >
            <img
              src={resolvePartyBackgroundImageUrl(coverUrl)}
              alt="Room Cover"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover filter brightness-75 group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
              <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                {isUploadingCover ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white stroke-[1.8]" />
                )}
              </div>
              <span className="text-xs font-bold text-white">
                {isUploadingCover ? 'Uploading Cover...' : 'Tap to Choose Room Cover'}
              </span>
            </div>
          </div>

          {/* Quick preset covers picker */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-[#9E97AA]">Covers:</span>
            {sampleCovers.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCoverUrl(c)}
                className={`w-7 h-7 rounded-lg overflow-hidden border ${coverUrl === c ? 'ring-2 ring-[#FA26A0] border-[#FA26A0]' : 'border-white/20'}`}
              >
                <img src={c} alt="preset" className="w-full h-full object-cover" />
              </button>
            ))}
            {currentUser.avatar && (
              <button
                type="button"
                onClick={() => setCoverUrl(currentUser.avatar)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                  coverUrl === currentUser.avatar
                    ? 'bg-[#FA26A0]/25 border-[#FA26A0] text-white'
                    : 'bg-[#140D20] border-white/15 text-white/80'
                }`}
              >
                My DP
              </button>
            )}
          </div>
        </div>

        {/* ========================================================
            2B. PARTY ROOM STAGE BACKGROUND (Presets + Host DP + Gallery)
           ======================================================== */}
        <div className="mb-5 p-3.5 rounded-2xl bg-[#140D20] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-[#FA26A0]" />
              <span className="text-xs font-black text-white">Party Stage Background</span>
            </div>
            <span className="text-[10px] font-bold text-[#D8B4FE]">
              {resolvedStagePreview.label}
            </span>
          </div>

          {/* Live Mini Stage Preview */}
          <div className="relative h-24 rounded-xl overflow-hidden border border-white/15">
            <div
              className="absolute inset-0"
              style={{ background: resolvedStagePreview.preset.gradient }}
            />
            {resolvedStagePreview.imageUrl && (
              <img
                src={resolvedStagePreview.imageUrl}
                alt="Stage Preview"
                referrerPolicy="no-referrer"
                className={`absolute inset-0 w-full h-full object-cover ${
                  resolvedStagePreview.useSoftBlur
                    ? 'scale-110 blur-[3px] opacity-75'
                    : resolvedStagePreview.type === 'custom'
                    ? 'opacity-85'
                    : 'opacity-55'
                }`}
              />
            )}
            <div
              className="absolute inset-0 opacity-60"
              style={{ background: resolvedStagePreview.preset.glow }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#060212]/60 via-[#080216]/30 to-[#060212]/80" />
            <div className="relative z-10 h-full px-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FFDF00]"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#8B20FF] ring-2 ring-[#FFDF00] flex items-center justify-center text-xs font-black">
                    {(currentUser.name || 'H').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="text-[11px] font-black text-white block drop-shadow">
                    {roomName.trim() || `${currentUser.name || 'Host'}'s Party`}
                  </span>
                  <span className="text-[9px] text-white/75 block">
                    Visible to Host, Guests &amp; all Viewers
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-black/45 border border-white/20 text-[9px] font-black text-[#FFDF00]">
                LIVE PREVIEW
              </span>
            </div>
          </div>

          {/* Host DP + Gallery Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!currentUser.avatar || isUploadingBg}
              onClick={() => {
                if (!currentUser.avatar) return;
                setBackgroundType('host_dp');
                setBackgroundImage(currentUser.avatar);
              }}
              className={`py-2 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                backgroundType === 'host_dp'
                  ? 'bg-[#FFDF00]/20 border-[#FFDF00] text-[#FFE875]'
                  : 'bg-[#1C1130] border-white/15 text-white/90 hover:border-[#FFDF00]/60'
              } ${!currentUser.avatar ? 'opacity-45 cursor-not-allowed' : ''}`}
            >
              <Crown className="w-3.5 h-3.5 text-[#FFDF00]" />
              <span>Use Host DP</span>
              {backgroundType === 'host_dp' && <Check className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              disabled={isUploadingBg}
              onClick={() => bgFileRef.current?.click()}
              className={`py-2 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                backgroundType === 'custom'
                  ? 'bg-[#FA26A0]/25 border-[#FA26A0] text-[#FFB8E2]'
                  : 'bg-[#1C1130] border-white/15 text-white/90 hover:border-[#FA26A0]/70'
              }`}
            >
              {isUploadingBg ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FA26A0]" />
                  <span>{bgUploadProgress}%</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-[#FA26A0]" />
                  <span>Gallery Photo</span>
                  {backgroundType === 'custom' && <Check className="w-3.5 h-3.5" />}
                </>
              )}
            </button>
          </div>

          {/* Horizontal Curated Party Themes */}
          <div>
            <span className="text-[10px] font-bold text-[#B9AECF] flex items-center gap-1 mb-1.5">
              <Sparkles className="w-3 h-3 text-[#C77DFF]" />
              <span>Or choose a Party Theme:</span>
            </span>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {PARTY_BACKGROUND_PRESETS.map((preset) => {
                const selected = backgroundType === 'preset' && backgroundId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setBackgroundType('preset');
                      setBackgroundId(preset.id);
                      setBackgroundImage('');
                    }}
                    className={`relative shrink-0 w-20 h-14 rounded-xl overflow-hidden border transition-all ${
                      selected
                        ? 'border-[#FA26A0] ring-2 ring-[#FA26A0]/70 scale-[1.02]'
                        : 'border-white/15 opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div
                      className="absolute inset-0"
                      style={{ background: preset.gradient }}
                    />
                    {preset.imageUrl && (
                      <img
                        src={preset.imageUrl}
                        alt={preset.name}
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover opacity-55"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    {selected && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#FA26A0] text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                    <span className="absolute bottom-1 left-1.5 right-1 text-[9px] font-black text-white truncate text-left">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================
            3. ROOM CREATION FORM
            - Room Name
            - Room Type (8 Seats vs 16 Seats)
            - Room Privacy (Public vs Private)
            - Room Password (Optional)
            - Room Announcement (Optional)
           ======================================================== */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Name */}
          <div>
            <label className="block text-xs font-bold text-white mb-1.5">Room Name</label>
            <input
              type="text"
              placeholder="Enter room name..."
              value={roomName}
              onChange={(e) => {
                setRoomName(e.target.value);
                if (error) setError(null);
              }}
              className="w-full bg-[#140D20] border border-white/10 focus:border-[#FA26A0] rounded-xl px-4 py-3 text-xs text-white placeholder-[#9E97AA] outline-none transition-colors"
            />
          </div>

          {/* Room Type: Level 1 (4/5 Seats), Level 2 (8 Seats @ Lv.10), Level 3 (16 Seats @ Lv.20) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-white">Room Seat Mode</label>
              <span className="px-2 py-0.5 rounded-full bg-[#24113D] border border-[#A855F7]/40 text-[10px] font-black text-[#E9D5FF]">
                Your Level: Lv.{hostLevel}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {PARTY_SEAT_TIERS.map((tier) => {
                const unlocked = isSeatModeUnlockedForLevel(tier.maxSeats, hostLevel);
                const selected = maxSeats === tier.maxSeats;
                const tierLabelText =
                  tier.maxSeats === 5
                    ? hostLevel < 5
                      ? '4+1 Seats'
                      : '5 Seats'
                    : `${tier.maxSeats} Seats`;
                const subText =
                  tier.maxSeats === 5
                    ? hostLevel < 5
                      ? 'Co-Host Lv.5'
                      : 'Free Tier'
                    : unlocked
                    ? 'Unlocked'
                    : `Lv.${tier.minLevel} Lock`;

                return (
                  <button
                    key={tier.maxSeats}
                    type="button"
                    onClick={() => {
                      if (!unlocked) {
                        setError(
                          `Reach Level ${tier.minLevel} to unlock ${tier.maxSeats}-seat Party Rooms (You are Lv.${hostLevel}).`
                        );
                        return;
                      }
                      setError(null);
                      setMaxSeats(tier.maxSeats);
                    }}
                    className={`relative py-3 px-2 rounded-2xl text-center flex flex-col items-center justify-center gap-1 transition-all border ${
                      selected
                        ? 'bg-gradient-to-b from-[#FA26A0] to-[#B5179E] text-white border-[#FF85C8] shadow-lg shadow-[#FA26A0]/35'
                        : unlocked
                        ? 'bg-[#140D20] text-white/90 hover:border-[#FA26A0]/60 border-white/10'
                        : 'bg-[#10091A] text-white/45 border-white/5 opacity-80'
                    }`}
                  >
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                        selected
                          ? 'bg-black/25 text-white'
                          : unlocked
                          ? 'bg-[#8B20FF]/25 text-[#D8B4FE]'
                          : 'bg-white/5 text-white/45'
                      }`}
                    >
                      {tier.tierLabel}
                    </span>

                    <div className="flex items-center gap-1 text-xs font-black">
                      {unlocked ? (
                        <Users className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-amber-300/80 shrink-0" />
                      )}
                      <span>{tierLabelText}</span>
                    </div>

                    <span
                      className={`text-[9px] font-bold leading-tight ${
                        selected
                          ? 'text-white/90'
                          : unlocked
                          ? 'text-emerald-300/90'
                          : 'text-amber-300/80'
                      }`}
                    >
                      {subText}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-2 text-[10px] text-[#B9AECF] leading-relaxed">
              {hostLevel < 5
                ? 'Free Tier (Lv.0–4): 1 Host + 3 Guest seats active. Seat #2 beside Host unlocks at Level 5, 8 seats at Level 10, and 16 seats at Level 20.'
                : hostLevel < 10
                ? 'Level 5+ Unlocked: All 5 seats (including Co-Host Seat #2) are active! Reach Level 10 for 8 seats and Level 20 for 16 seats.'
                : hostLevel < 20
                ? 'Level 10+ Unlocked: Choose between 5-seat or 8-seat Party Rooms. Reach Level 20 to unlock 16-seat Party Rooms.'
                : 'Level 20+ Unlocked: You have full access to choose 4/5-seat, 8-seat, or 16-seat Party Rooms.'}
            </p>
          </div>

          {/* Room Privacy: Public Room vs Private Room */}
          <div>
            <label className="block text-xs font-bold text-white mb-2">Room Privacy</label>
            <div className="space-y-2">
              {/* Option 1: Public Room */}
              <div
                onClick={() => setIsPrivate(false)}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  !isPrivate 
                    ? 'bg-[#160E24] border-[#FA26A0]/60' 
                    : 'bg-[#140D20] border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    !isPrivate ? 'border-[#FA26A0]' : 'border-white/30'
                  }`}>
                    {!isPrivate && <div className="w-2.5 h-2.5 rounded-full bg-[#FA26A0]" />}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-white">Public Room</span>
                    <span className="text-[10px] text-[#9E97AA]">Anyone can join</span>
                  </div>
                </div>
              </div>

              {/* Option 2: Private Room */}
              <div
                onClick={() => setIsPrivate(true)}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  isPrivate 
                    ? 'bg-[#160E24] border-[#FA26A0]/60' 
                    : 'bg-[#140D20] border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isPrivate ? 'border-[#FA26A0]' : 'border-white/30'
                  }`}>
                    {isPrivate && <div className="w-2.5 h-2.5 rounded-full bg-[#FA26A0]" />}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-white">Private Room</span>
                    <span className="text-[10px] text-[#9E97AA]">Only with password</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Room Password (Optional / Active when Private) */}
          <div>
            <label className="block text-xs font-bold text-white mb-1.5">
              Room Password {isPrivate ? '*' : '(Optional)'}
            </label>
            <div className="relative flex items-center bg-[#140D20] border border-white/10 focus-within:border-[#FA26A0] rounded-xl px-3.5 py-3 transition-colors">
              <Lock className="w-4 h-4 text-[#9E97AA] shrink-0 mr-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-[#9E97AA] outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[#9E97AA] hover:text-white shrink-0 ml-2"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Room Announcement (Optional) with 0/100 character counter */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-white">Room Announcement (Optional)</label>
              <span className="text-[10px] text-[#9E97AA] font-mono">{announcement.length}/100</span>
            </div>
            <textarea
              rows={3}
              maxLength={100}
              placeholder="Enter announcement..."
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              className="w-full bg-[#140D20] border border-white/10 focus:border-[#FA26A0] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#9E97AA] outline-none resize-none transition-colors"
            />
          </div>

          {/* Create Room Submit Button */}
          <div className="pt-3 pb-6">
            <button
              type="submit"
              className="w-full py-4 rounded-full bg-[#FA26A0] hover:bg-[#e01d8b] text-white font-black text-sm shadow-xl shadow-[#FA26A0]/40 hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>Create Room</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
