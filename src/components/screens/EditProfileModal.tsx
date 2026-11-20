import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  Check,
  AlertCircle,
  Lock,
  Sparkles,
  User,
  AtSign,
  Globe,
  Calendar,
  Image as ImageIcon,
  ZoomIn,
  Crop,
  Shield,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { AvatarWithFrame } from '../common/AvatarWithFrame';
import { profileService } from '../../utils/profileService';
import { uploadUserImage } from '../../services/storageService';
import {
  COUNTRY_OPTIONS,
  calculateAgeFromBirthday,
} from '../../services/profileModuleService';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSaveProfile: (updatedProfile: UserProfile) => Promise<void> | void;
}

const AVATAR_PRESETS = [
  {
    id: 'preset_1',
    label: 'Glamour Star',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset_2',
    label: 'Neon Singer',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset_3',
    label: 'Pink Aura',
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset_4',
    label: 'Cyber Host',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset_5',
    label: 'EDM DJ',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset_6',
    label: 'Esports Pro',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
  },
];

const COVER_PRESETS = [
  {
    id: 'cov_1',
    label: 'Neon Stage',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80',
  },
  {
    id: 'cov_2',
    label: 'Violet Skyline',
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1200&auto=format&fit=crop&q=80',
  },
  {
    id: 'cov_3',
    label: 'Studio Lights',
    url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80',
  },
  {
    id: 'cov_4',
    label: 'Midnight Aura',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
  },
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSaveProfile,
}) => {
  // Form State
  const [displayName, setDisplayName] = useState(currentUser.name || '');
  const [username, setUsername] = useState(currentUser.username || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar || '');
  const [coverUrl, setCoverUrl] = useState(currentUser.coverImage || '');
  const [gender, setGender] = useState<'female' | 'male' | 'other' | 'unspecified'>(
    currentUser.gender || 'unspecified'
  );
  const [country, setCountry] = useState(currentUser.country || 'Pakistan');
  const [birthday, setBirthday] = useState(currentUser.birthday || '');

  // Privacy toggles
  const [showGender, setShowGender] = useState<boolean>(currentUser.showGender ?? true);
  const [showAge, setShowAge] = useState<boolean>(currentUser.showAge ?? true);
  const [showOnlineStatus, setShowOnlineStatus] = useState<boolean>(
    currentUser.showOnlineStatus ?? true
  );

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [usernameErrorText, setUsernameErrorText] = useState<string | null>(null);

  // Avatar & Cover staged uploads
  const [stagedAvatarFile, setStagedAvatarFile] = useState<File | Blob | null>(null);
  const [stagedCoverFile, setStagedCoverFile] = useState<File | Blob | null>(null);
  const [stagedPhotoUrl, setStagedPhotoUrl] = useState<string | null>(null);
  const [photoZoom, setPhotoZoom] = useState<number>(1);
  const [isCroppingOpen, setIsCroppingOpen] = useState(false);

  // UI & upload progress state
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAvatarPresets, setShowAvatarPresets] = useState(false);
  const [showCoverPresets, setShowCoverPresets] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentUser.name || '');
      setUsername(currentUser.username || '');
      setBio(currentUser.bio || '');
      setAvatarUrl(currentUser.avatar || '');
      setCoverUrl(currentUser.coverImage || '');
      setGender(currentUser.gender || 'unspecified');
      setCountry(currentUser.country || 'Pakistan');
      setBirthday(currentUser.birthday || '');
      setShowGender(currentUser.showGender ?? true);
      setShowAge(currentUser.showAge ?? true);
      setShowOnlineStatus(currentUser.showOnlineStatus ?? true);
      setStagedAvatarFile(null);
      setStagedCoverFile(null);
      setUsernameStatus('idle');
      setUsernameErrorText(null);
      setErrorMessage(null);
      setSuccessMessage(null);
      setUploadProgressText(null);
    }
  }, [isOpen, currentUser]);

  // Live username uniqueness check
  useEffect(() => {
    const clean = username.trim().toLowerCase().replace(/^@/, '');
    if (!clean) {
      setUsernameStatus('idle');
      return;
    }

    if (clean === (currentUser.username || '').toLowerCase().replace(/^@/, '')) {
      setUsernameStatus('available');
      setUsernameErrorText(null);
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      setUsernameStatus('invalid');
      setUsernameErrorText('Must be 3-20 letters, numbers, or underscores.');
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      const res = await profileService.isUsernameAvailable(clean, currentUser.id);
      if (res.available) {
        setUsernameStatus('available');
        setUsernameErrorText(null);
      } else {
        setUsernameStatus('taken');
        setUsernameErrorText(res.message || 'Username already taken');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, currentUser.id, currentUser.username]);

  if (!isOpen) return null;

  const calculatedAge = calculateAgeFromBirthday(birthday);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Profile photo must be 5MB or smaller.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image (PNG, JPG, WEBP).');
      return;
    }
    setStagedAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setStagedPhotoUrl(dataUrl);
        setPhotoZoom(1);
        setIsCroppingOpen(true);
        setErrorMessage(null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Cover photo must be 5MB or smaller.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image (PNG, JPG, WEBP).');
      return;
    }
    setStagedCoverFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCoverUrl(dataUrl);
        setErrorMessage(null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConfirmCroppedPhoto = () => {
    if (stagedPhotoUrl) {
      setAvatarUrl(stagedPhotoUrl);
      setIsCroppingOpen(false);
      setStagedPhotoUrl(null);
    }
  };

  const validateInputs = async (): Promise<boolean> => {
    setErrorMessage(null);

    const trimmedName = displayName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 30) {
      setErrorMessage('Display Name must be between 2 and 30 characters.');
      return false;
    }

    const cleanUsername = username.trim().replace(/^@/, '');
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
      setErrorMessage('Username must be 3-20 characters using only letters, numbers, or underscores.');
      return false;
    }

    const check = await profileService.isUsernameAvailable(cleanUsername, currentUser.id);
    if (
      !check.available &&
      cleanUsername.toLowerCase() !== (currentUser.username || '').toLowerCase().replace(/^@/, '')
    ) {
      setErrorMessage(check.message || 'Username already taken. Please choose another.');
      return false;
    }

    if (bio.length > 200) {
      setErrorMessage('Bio must not exceed 200 characters.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await validateInputs();
    if (!isValid) return;

    setIsLoading(true);
    setErrorMessage(null);
    setUploadProgressText(null);

    try {
      let finalAvatarUrl = avatarUrl || currentUser.avatar;
      let finalCoverUrl = coverUrl;

      if (stagedAvatarFile) {
        setUploadProgressText('Uploading profile photo...');
        finalAvatarUrl = await uploadUserImage(stagedAvatarFile, 'avatars', (pct) => {
          setUploadProgressText(`Uploading profile photo (${pct}%)...`);
        });
      }

      if (stagedCoverFile) {
        setUploadProgressText('Uploading cover banner...');
        finalCoverUrl = await uploadUserImage(stagedCoverFile, 'covers', (pct) => {
          setUploadProgressText(`Uploading cover banner (${pct}%)...`);
        });
      }

      setUploadProgressText('Saving profile...');
      const cleanHandle = username.trim().replace(/^@/, '');
      const updatedProfile: UserProfile = {
        ...currentUser,
        name: displayName.trim(),
        username: `@${cleanHandle}`,
        bio: bio.trim(),
        avatar: finalAvatarUrl,
        coverImage: finalCoverUrl,
        gender,
        country,
        birthday,
        showGender,
        showAge,
        showOnlineStatus,
      };

      await onSaveProfile(updatedProfile);
      setIsLoading(false);
      setUploadProgressText(null);
      setSuccessMessage('Profile saved and synced!');

      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 850);
    } catch (err: any) {
      setIsLoading(false);
      setUploadProgressText(null);
      setErrorMessage(err?.message || 'Failed to save profile changes.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#140B24] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-white">Edit Profile</h3>
            <p className="text-xs text-[#B9AECF]">
              Update your cover banner, photo, identity & privacy controls
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close Edit Profile"
            className="min-h-[44px] min-w-[44px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Banners */}
        {successMessage && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Crop Preview Overlay */}
        {isCroppingOpen && stagedPhotoUrl && (
          <div className="absolute inset-0 z-40 bg-black/95 flex flex-col items-center justify-center p-5">
            <div className="w-full max-w-xs bg-[#1A0E2E] border border-white/15 rounded-3xl p-5 text-center space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Crop className="w-4 h-4 text-[#FA26A0]" />
                  <span>Preview Photo</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCroppingOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative w-44 h-44 mx-auto rounded-full overflow-hidden border-4 border-[#FA26A0] bg-black">
                <img
                  src={stagedPhotoUrl}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                  style={{ transform: `scale(${photoZoom})` }}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-[#B9AECF]">
                  <span className="flex items-center gap-1">
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Zoom</span>
                  </span>
                  <span className="font-mono">{Math.round(photoZoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="2"
                  step="0.05"
                  value={photoZoom}
                  onChange={(e) => setPhotoZoom(parseFloat(e.target.value))}
                  className="w-full accent-[#FA26A0]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCroppingOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCroppedPhoto}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-xs font-bold"
                >
                  Apply Photo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarFileChange}
        />
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverFileChange}
        />

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* 1. Cover Photo & Avatar Visual Editor */}
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#1B1030]">
            <div className="relative h-32 w-full bg-gradient-to-br from-[#2B1055] via-[#4A147A] to-[#1A0B2E]">
              {coverUrl && (
                <img
                  src={coverUrl}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1B1030] via-black/20 to-black/30" />

              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-black/65 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white text-[11px] font-bold flex items-center gap-1.5"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#FA26A0]" />
                  <span>Change Cover</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCoverPresets((v) => !v)}
                  className="px-2.5 py-1.5 rounded-xl bg-black/65 hover:bg-black/80 backdrop-blur-md border border-white/15 text-[#D7CEEB] text-[11px] font-bold"
                >
                  Presets
                </button>
              </div>
            </div>

            {showCoverPresets && (
              <div className="px-4 py-3 border-b border-white/[0.08] bg-[#130A22]">
                <span className="text-[11px] font-bold text-[#B9AECF] block mb-2">
                  Choose a Cover Banner
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {COVER_PRESETS.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => {
                        setCoverUrl(c.url);
                        setStagedCoverFile(null);
                        setShowCoverPresets(false);
                      }}
                      className={`h-14 rounded-xl overflow-hidden border relative ${
                        coverUrl === c.url ? 'border-[#FA26A0] ring-2 ring-[#FA26A0]' : 'border-white/10'
                      }`}
                    >
                      <img src={c.url} alt={c.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 pb-4 -mt-10 relative flex flex-col items-center">
              <div className="relative">
                <AvatarWithFrame
                  src={avatarUrl}
                  name={displayName}
                  level={currentUser.level}
                  vipLevel={currentUser.equippedVipFrame || currentUser.vipLevel}
                  isVIP={currentUser.isVIP}
                  size="lg"
                  showFrame={true}
                  showVipBadge={false}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-gradient-to-tr from-[#8B20FF] to-[#FA26A0] text-white flex items-center justify-center shadow-lg ring-2 ring-[#1B1030]"
                  title="Upload Profile Picture"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-[#FFC84A]" />
                  <span>Upload Avatar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAvatarPresets((v) => !v)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[#D7CEEB] text-xs font-bold flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FA26A0]" />
                  <span>Avatar Presets</span>
                </button>
              </div>

              {showAvatarPresets && (
                <div className="w-full mt-3 pt-3 border-t border-white/10 grid grid-cols-6 gap-2">
                  {AVATAR_PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        setAvatarUrl(p.url);
                        setStagedAvatarFile(null);
                        setShowAvatarPresets(false);
                      }}
                      className={`aspect-square rounded-xl overflow-hidden border ${
                        avatarUrl === p.url ? 'border-[#FA26A0] ring-2 ring-[#FA26A0]' : 'border-white/10'
                      }`}
                    >
                      <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2. Non-editable Lenzo Party ID */}
          <div className="p-3.5 rounded-2xl bg-[#090611] border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-[#FFC84A]" />
              <div>
                <span className="text-[10px] text-[#B9AECF] font-bold uppercase tracking-wider block">
                  Lenzo Party ID
                </span>
                <span className="text-sm font-mono font-bold text-white">
                  {currentUser.displayId}
                </span>
              </div>
            </div>
            <span className="text-[10px] bg-white/10 text-[#D7CEEB] px-2.5 py-1 rounded-lg font-mono">
              Permanent
            </span>
          </div>

          {/* 3. Display Name */}
          <div>
            <label className="text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#FA26A0]" />
              <span>Display Name *</span>
            </label>
            <input
              type="text"
              value={displayName}
              maxLength={30}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your public display name"
              className="w-full bg-[#090611] border border-white/10 focus:border-[#FA26A0] rounded-xl px-4 py-2.5 text-sm text-white outline-none"
            />
          </div>

          {/* 4. Username */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5 text-[#8B20FF]" />
                <span>Username *</span>
              </label>
              {usernameStatus === 'checking' && (
                <span className="text-[11px] text-cyan-400 font-mono">Checking...</span>
              )}
              {usernameStatus === 'available' && (
                <span className="text-[11px] text-emerald-400 font-bold">Available</span>
              )}
              {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                <span className="text-[11px] text-rose-400 font-bold">Unavailable</span>
              )}
            </div>
            <input
              type="text"
              value={username}
              maxLength={21}
              onChange={(e) => {
                let val = e.target.value;
                if (val && !val.startsWith('@')) val = `@${val}`;
                setUsername(val);
              }}
              placeholder="@username"
              className="w-full bg-[#090611] border border-white/10 focus:border-[#8B20FF] rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none"
            />
            {usernameErrorText && (
              <span className="text-[11px] text-rose-400 mt-1 block">{usernameErrorText}</span>
            )}
          </div>

          {/* 5. Bio */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-white">Bio</label>
              <span className="text-[11px] font-mono text-[#B9AECF] tabular-nums">
                {bio.length}/200
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={200}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell fans about your music, streams, and party vibes..."
              className="w-full bg-[#090611] border border-white/10 focus:border-[#FA26A0] rounded-xl p-3 text-xs text-white outline-none resize-none leading-relaxed"
            />
          </div>

          {/* 6. Country, Gender & Birthday */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#06B6D4]" />
                <span>Country / Location</span>
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-[#090611] border border-white/10 focus:border-[#06B6D4] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.name} className="bg-[#140B24]">
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-white mb-1.5 block">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-[#090611] border border-white/10 focus:border-[#FA26A0] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
              >
                <option value="female" className="bg-[#140B24]">Female</option>
                <option value="male" className="bg-[#140B24]">Male</option>
                <option value="other" className="bg-[#140B24]">Other</option>
                <option value="unspecified" className="bg-[#140B24]">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#FFC84A]" />
                <span>Birthday</span>
              </label>
              {calculatedAge !== null && (
                <span className="text-[11px] font-mono text-[#FFC84A]">Age: {calculatedAge}</span>
              )}
            </div>
            <input
              type="date"
              value={birthday}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setBirthday(e.target.value)}
              className="w-full bg-[#090611] border border-white/10 focus:border-[#FFC84A] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
            />
          </div>

          {/* 7. Privacy Settings */}
          <div className="p-4 rounded-2xl bg-[#0E071B] border border-white/[0.08] space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Shield className="w-4 h-4 text-[#A855F7]" />
              <span>Profile Privacy Controls</span>
            </div>

            {([
              {
                label: 'Show Gender on Profile',
                value: showGender,
                toggle: () => setShowGender((v) => !v),
              },
              {
                label: 'Show Age on Profile',
                value: showAge,
                toggle: () => setShowAge((v) => !v),
              },
              {
                label: 'Show Online Status Indicator',
                value: showOnlineStatus,
                toggle: () => setShowOnlineStatus((v) => !v),
              },
            ]).map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-xs text-[#D7CEEB]">{row.label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={row.value}
                  onClick={row.toggle}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                    row.value ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0]' : 'bg-white/15'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      row.value ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </form>

        {/* Footer CTA */}
        <div className="p-4 bg-[#140B24] border-t border-white/[0.08] flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#B9AECF] truncate">
            {uploadProgressText || 'Changes sync instantly to your account'}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || usernameStatus === 'taken' || usernameStatus === 'checking'}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-xs font-extrabold shadow-lg shadow-[#8B20FF]/25 active:scale-95 transition-transform flex items-center gap-1.5 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
