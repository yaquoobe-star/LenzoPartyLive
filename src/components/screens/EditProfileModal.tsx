import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  Check, 
  AlertCircle, 
  Lock, 
  RefreshCw, 
  Sparkles, 
  User, 
  AtSign, 
  Globe, 
  Calendar,
  Image as ImageIcon,
  ZoomIn,
  Crop
} from 'lucide-react';
import { UserProfile } from '../../types';
import { AvatarWithFrame } from '../common/AvatarWithFrame';
import { profileService } from '../../utils/profileService';
import { uploadUserImage } from '../../services/storageService';

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

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSaveProfile,
}) => {
  // Form State
  const [displayName, setDisplayName] = useState(currentUser.name || '');
  const [username, setUsername] = useState(currentUser.username || '@queensara');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar || '');
  const [gender, setGender] = useState<'female' | 'male' | 'other' | 'unspecified'>(
    currentUser.gender || 'female'
  );
  const [country, setCountry] = useState(currentUser.country || 'Pakistan');
  const [birthday, setBirthday] = useState(currentUser.birthday || '2001-08-14');

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameErrorText, setUsernameErrorText] = useState<string | null>(null);

  // Photo Crop / Preview State
  const [stagedPhotoUrl, setStagedPhotoUrl] = useState<string | null>(null);
  const [stagedFile, setStagedFile] = useState<File | Blob | null>(null);
  const [photoZoom, setPhotoZoom] = useState<number>(1);
  const [isCroppingOpen, setIsCroppingOpen] = useState(false);

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentUser.name || '');
      setUsername(currentUser.username || '@queensara');
      setBio(currentUser.bio || '');
      setAvatarUrl(currentUser.avatar || '');
      setGender(currentUser.gender || 'female');
      setCountry(currentUser.country || 'Pakistan');
      setBirthday(currentUser.birthday || '2001-08-14');
      setUsernameStatus('idle');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, currentUser]);

  // Live username uniqueness debounced check
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
    }, 400);

    return () => clearTimeout(timer);
  }, [username, currentUser.id, currentUser.username]);

  if (!isOpen) return null;

  // Handle image upload from user device with crop/preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Selected image is too large. Please select an image under 5MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    setStagedFile(file);
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
    reader.onerror = () => {
      setErrorMessage('Failed to read image file from your device.');
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  // Confirm cropped / scaled profile picture
  const handleConfirmCroppedPhoto = () => {
    if (stagedPhotoUrl) {
      setAvatarUrl(stagedPhotoUrl);
      setIsCroppingOpen(false);
      setStagedPhotoUrl(null);
    }
  };

  const handleResetToDefaultAvatar = () => {
    setAvatarUrl(currentUser.avatar || AVATAR_PRESETS[0].url);
    setErrorMessage(null);
  };

  const validateInputs = async (): Promise<boolean> => {
    setErrorMessage(null);

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setErrorMessage('Display Name cannot be empty.');
      return false;
    }
    if (trimmedName.length < 2 || trimmedName.length > 30) {
      setErrorMessage('Display Name must be between 2 and 30 characters.');
      return false;
    }

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMessage('Username cannot be empty.');
      return false;
    }

    const cleanUsername = trimmedUsername.startsWith('@') ? trimmedUsername.slice(1) : trimmedUsername;
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
      setErrorMessage('Username must be 3-20 characters long and contain only letters, numbers, and underscores.');
      return false;
    }

    // Verify username uniqueness
    const check = await profileService.isUsernameAvailable(cleanUsername, currentUser.id);
    if (!check.available && cleanUsername.toLowerCase() !== (currentUser.username || '').toLowerCase().replace(/^@/, '')) {
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

    try {
      let finalAvatarUrl = avatarUrl || currentUser.avatar;

      if (stagedFile) {
        try {
          finalAvatarUrl = await uploadUserImage(stagedFile, 'avatars');
        } catch (uploadErr) {
          console.warn('[Firebase Storage] Image upload notice:', uploadErr);
        }
      }

      const formattedUsername = username.startsWith('@') ? username : `@${username}`;
      const updatedProfile: UserProfile = {
        ...currentUser,
        name: displayName.trim(),
        username: formattedUsername.trim(),
        bio: bio.trim(),
        avatar: finalAvatarUrl,
        gender,
        country,
        birthday,
      };

      await onSaveProfile(updatedProfile);

      setIsLoading(false);
      setSuccessMessage('Profile updated successfully!');

      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1000);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'An error occurred while saving your profile.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div
        className="w-full max-w-lg bg-[#160C25] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 pb-3 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#8B20FF] to-[#F328D5] flex items-center justify-center text-white shadow-md shadow-[#F328D5]/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">Edit Profile</h3>
              <p className="text-[11px] text-[#B9AECF]">Update your public photo, bio and identity details</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-full bg-[#211333] hover:bg-[#2e1a47] flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-bounce">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Crop / Preview Modal Overlay */}
        {isCroppingOpen && stagedPhotoUrl && (
          <div className="absolute inset-0 z-40 bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-xs bg-[#1A0E2E] border border-white/15 rounded-3xl p-5 text-center space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Crop className="w-4 h-4 text-[#FA26A0]" />
                  <span>Preview & Crop Photo</span>
                </span>
                <button
                  onClick={() => setIsCroppingOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Circular Avatar Crop Viewport */}
              <div className="relative w-44 h-44 mx-auto rounded-full overflow-hidden border-4 border-[#FA26A0] shadow-[0_0_25px_rgba(250,38,160,0.4)] bg-black">
                <img
                  src={stagedPhotoUrl}
                  alt="Staged Crop"
                  className="w-full h-full object-cover transition-transform duration-100"
                  style={{ transform: `scale(${photoZoom})` }}
                />
              </div>

              {/* Zoom Scale Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-[#B9AECF]">
                  <span className="flex items-center gap-1">
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Zoom Scale</span>
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
                  className="w-full accent-[#FA26A0] cursor-pointer"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCroppingOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-white/10 text-white text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCroppedPhoto}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-xs font-bold shadow"
                >
                  Apply Photo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto no-scrollbar flex-1 space-y-5">
          {/* 1. Profile Picture (DP) Section */}
          <div className="flex flex-col items-center p-4 rounded-2xl bg-[#211333] border border-white/5">
            <div className="relative mb-3">
              <AvatarWithFrame
                src={avatarUrl}
                name={displayName}
                level={currentUser.level}
                vipLevel={currentUser.vipLevel}
                isVIP={currentUser.isVIP}
                size="xl"
                showFrame={true}
                showVipBadge={true}
              />

              {/* Upload Trigger Badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-gradient-to-tr from-[#8B20FF] to-[#F328D5] text-white flex items-center justify-center shadow-lg shadow-[#F328D5]/50 ring-2 ring-[#160C25] hover:scale-110 active:scale-95 transition-transform"
                title="Upload Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden Native File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-[#FFC84A]" />
                <span>Upload From Device</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPresets(!showPresets)}
                className="px-3 py-1.5 rounded-xl bg-[#160C25] hover:bg-[#28173e] text-[#B9AECF] hover:text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F328D5]" />
                <span>Avatar Presets</span>
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleResetToDefaultAvatar}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-colors"
                >
                  Reset DP
                </button>
              )}
            </div>

            {/* Presets Gallery Drawer */}
            {showPresets && (
              <div className="w-full mt-4 pt-3 border-t border-white/10 animate-fade-in">
                <span className="text-[11px] font-bold text-[#B9AECF] block mb-2 text-center">
                  Select a Curated Avatar Preset:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {AVATAR_PRESETS.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setAvatarUrl(p.url);
                        setShowPresets(false);
                      }}
                      className={`group relative rounded-xl overflow-hidden aspect-square border cursor-pointer transition-all ${
                        avatarUrl === p.url
                          ? 'border-[#F328D5] ring-2 ring-[#F328D5] scale-105'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                      {avatarUrl === p.url && (
                        <div className="absolute inset-0 bg-[#F328D5]/40 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white stroke-[3]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Protected User ID Display (Cannot be modified) */}
          <div className="p-3.5 rounded-2xl bg-[#090611] border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-[#FFC84A]" />
              <div className="flex flex-col">
                <span className="text-[10px] text-[#B9AECF] font-bold uppercase tracking-wider">
                  Unique User ID (Protected)
                </span>
                <span className="text-sm font-mono font-bold text-white tracking-wide">
                  {currentUser.displayId}
                </span>
              </div>
            </div>
            <span className="text-[10px] bg-white/10 text-white/80 px-2 py-0.5 rounded-full font-mono">
              Non-Editable
            </span>
          </div>

          {/* 3. Display Name */}
          <div>
            <label className="block text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#F328D5]" />
              <span>Display Name *</span>
            </label>
            <input
              type="text"
              value={displayName}
              maxLength={30}
              placeholder="Enter your public display name"
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#211333] border border-white/10 focus:border-[#F328D5] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-[#B9AECF]/50 outline-none transition-colors"
            />
            <span className="text-[10px] text-[#B9AECF] mt-1 block">
              2 to 30 characters. Shown in streams and audio rooms.
            </span>
          </div>

          {/* 4. Username / Handle with Uniqueness Feedback */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5 text-[#8B20FF]" />
                <span>Unique Username Handle *</span>
              </label>

              {/* Status Badge */}
              {usernameStatus === 'checking' && (
                <span className="text-[10px] text-cyan-400 font-mono animate-pulse">Checking...</span>
              )}
              {usernameStatus === 'available' && (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> Available
                </span>
              )}
              {usernameStatus === 'taken' && (
                <span className="text-[10px] text-rose-400 font-bold">Already taken ✗</span>
              )}
              {usernameStatus === 'invalid' && (
                <span className="text-[10px] text-amber-400 font-bold">Invalid</span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={username}
                maxLength={21}
                placeholder="@username"
                onChange={(e) => {
                  let val = e.target.value;
                  if (!val.startsWith('@') && val.length > 0) val = `@${val}`;
                  setUsername(val);
                }}
                className={`w-full bg-[#211333] border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white font-mono placeholder-[#B9AECF]/50 outline-none transition-colors ${
                  usernameStatus === 'available'
                    ? 'border-emerald-500/50 focus:border-emerald-400'
                    : usernameStatus === 'taken' || usernameStatus === 'invalid'
                    ? 'border-rose-500/60 focus:border-rose-500'
                    : 'border-white/10 focus:border-[#8B20FF]'
                }`}
              />
            </div>
            {usernameErrorText ? (
              <span className="text-[10px] text-rose-400 mt-1 block">{usernameErrorText}</span>
            ) : (
              <span className="text-[10px] text-[#B9AECF] mt-1 block">
                Unique handle used for profile links (e.g. lonzoparty.app/u/username).
              </span>
            )}
          </div>

          {/* 5. Bio Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-white">Bio / Profile Description</label>
              <span className={`text-[10px] font-mono ${bio.length > 180 ? 'text-amber-400' : 'text-[#B9AECF]'}`}>
                {bio.length}/200
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={200}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell your fans and party friends about yourself..."
              className="w-full bg-[#211333] border border-white/10 focus:border-[#F328D5] rounded-xl p-3 text-xs text-white placeholder-[#B9AECF]/50 outline-none resize-none transition-colors leading-relaxed"
            />
          </div>

          {/* 6. Gender & Country Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-white mb-1.5">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-[#211333] border border-white/10 focus:border-[#F328D5] rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
              >
                <option value="female" className="bg-[#160C25]">Female</option>
                <option value="male" className="bg-[#160C25]">Male</option>
                <option value="other" className="bg-[#160C25]">Other</option>
                <option value="unspecified" className="bg-[#160C25]">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1.5 flex items-center gap-1">
                <Globe className="w-3 h-3 text-[#06B6D4]" />
                <span>Country / Region</span>
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-[#211333] border border-white/10 focus:border-[#06B6D4] rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
              >
                <option value="Pakistan" className="bg-[#160C25]">Pakistan</option>
                <option value="United States" className="bg-[#160C25]">United States</option>
                <option value="United Arab Emirates" className="bg-[#160C25]">United Arab Emirates</option>
                <option value="Saudi Arabia" className="bg-[#160C25]">Saudi Arabia</option>
                <option value="United Kingdom" className="bg-[#160C25]">United Kingdom</option>
                <option value="India" className="bg-[#160C25]">India</option>
                <option value="Turkey" className="bg-[#160C25]">Turkey</option>
                <option value="Canada" className="bg-[#160C25]">Canada</option>
              </select>
            </div>
          </div>
        </form>

        {/* Footer Buttons */}
        <div className="p-4 bg-[#160C25] border-t border-white/[0.08] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || usernameStatus === 'taken' || usernameStatus === 'checking'}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] text-white text-xs font-extrabold shadow-lg shadow-[#F328D5]/30 hover:opacity-95 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
