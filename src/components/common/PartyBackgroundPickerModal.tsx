import React, { useRef, useState } from 'react';
import {
  Check,
  Crown,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import {
  PARTY_BACKGROUND_PRESETS,
  PartyBackgroundType,
  resolvePartyBackgroundImageUrl,
} from '../../utils/partyBackgrounds';
import { uploadPartyBackgroundImage } from '../../services/storageService';

export interface PartyBackgroundSelection {
  backgroundType: PartyBackgroundType;
  backgroundId: string;
  backgroundImage: string;
}

interface PartyBackgroundPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostAvatar?: string;
  hostName?: string;
  currentType: PartyBackgroundType;
  currentPresetId: string;
  currentCustomImage?: string;
  onSelectBackground: (selection: PartyBackgroundSelection) => void;
}

export const PartyBackgroundPickerModal: React.FC<PartyBackgroundPickerModalProps> = ({
  isOpen,
  onClose,
  hostAvatar,
  hostName,
  currentType,
  currentPresetId,
  currentCustomImage,
  onSelectBackground,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resolvedHostAvatar = resolvePartyBackgroundImageUrl(hostAvatar);
  const resolvedCustomImage =
    currentType === 'custom' ? resolvePartyBackgroundImageUrl(currentCustomImage) : '';

  const handleGalleryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose a valid image file (JPG, PNG, or WEBP).');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setUploadError('Image is too large. Please pick an image under 12 MB.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(10);
    try {
      const uploadedUrl = await uploadPartyBackgroundImage(file, (pct) => {
        setUploadProgress(pct);
      });
      if (!uploadedUrl) {
        throw new Error('Could not process selected image.');
      }
      onSelectBackground({
        backgroundType: 'custom',
        backgroundId: currentPresetId || 'royal_neon',
        backgroundImage: uploadedUrl,
      });
      onClose();
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload gallery photo. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div
      data-no-doubletap="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#140826] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col max-h-[86vh] overflow-hidden text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#FA26A0]" />
              <span>Party Room Background</span>
            </h3>
            <p className="text-[10px] text-white/60 mt-0.5">
              Synced live for Host, Guests &amp; all Viewers
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
            aria-label="Close background picker"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleGalleryFileChange}
          className="hidden"
        />

        <div className="overflow-y-auto no-scrollbar space-y-4 pt-4 pb-2 flex-1">
          {uploadError && (
            <div className="rounded-xl bg-rose-500/20 border border-rose-500/40 px-3 py-2 text-[11px] font-bold text-rose-200">
              {uploadError}
            </div>
          )}

          {/* Quick Special Modes: Host DP & Gallery Upload */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Option 1: Host DP as Background */}
            <button
              type="button"
              disabled={!resolvedHostAvatar || isUploading}
              onClick={() => {
                if (!resolvedHostAvatar) return;
                onSelectBackground({
                  backgroundType: 'host_dp',
                  backgroundId: currentPresetId || 'royal_neon',
                  backgroundImage: hostAvatar || resolvedHostAvatar,
                });
                onClose();
              }}
              className={`relative h-28 rounded-2xl overflow-hidden border text-left transition-all active:scale-98 ${
                currentType === 'host_dp'
                  ? 'border-[#FFDF00] ring-2 ring-[#FFDF00]/60 shadow-[0_0_20px_rgba(255,223,0,0.3)]'
                  : 'border-white/15 hover:border-[#FFDF00]/60'
              } ${!resolvedHostAvatar ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {resolvedHostAvatar ? (
                <>
                  <img
                    src={resolvedHostAvatar}
                    alt={hostName || 'Host DP'}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover scale-110 blur-[2px] brightness-75"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080314]/90 via-[#080314]/35 to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#2B104E] to-[#120624]" />
              )}

              <div className="relative z-10 h-full p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-[#FFDF00]/20 border border-[#FFDF00]/50 text-[#FFE875] text-[9px] font-black flex items-center gap-1">
                    <Crown className="w-2.5 h-2.5" />
                    <span>HOST DP</span>
                  </span>
                  {currentType === 'host_dp' && (
                    <span className="w-5 h-5 rounded-full bg-[#FFDF00] text-black flex items-center justify-center shadow">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-xs font-black text-white block leading-tight">
                    Use Host DP
                  </span>
                  <span className="text-[10px] text-white/75 block truncate">
                    {resolvedHostAvatar ? 'Atmospheric profile backdrop' : 'Add a profile photo first'}
                  </span>
                </div>
              </div>
            </button>

            {/* Option 2: Upload From Device Gallery */}
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className={`relative h-28 rounded-2xl overflow-hidden border text-left transition-all active:scale-98 ${
                currentType === 'custom'
                  ? 'border-[#FA26A0] ring-2 ring-[#FA26A0]/60 shadow-[0_0_20px_rgba(250,38,160,0.3)]'
                  : 'border-dashed border-white/25 hover:border-[#FA26A0]/80'
              }`}
            >
              {resolvedCustomImage ? (
                <>
                  <img
                    src={resolvedCustomImage}
                    alt="Custom Gallery Background"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover brightness-75"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080314]/90 via-[#080314]/40 to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#2E0E4F] via-[#1B0936] to-[#0E051E]" />
              )}

              <div className="relative z-10 h-full p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-[#FA26A0]/25 border border-[#FA26A0]/50 text-[#FFB8E2] text-[9px] font-black flex items-center gap-1">
                    {isUploading ? (
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <Upload className="w-2.5 h-2.5" />
                    )}
                    <span>GALLERY</span>
                  </span>
                  {currentType === 'custom' && !isUploading && (
                    <span className="w-5 h-5 rounded-full bg-[#FA26A0] text-white flex items-center justify-center shadow">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-xs font-black text-white block leading-tight">
                    {isUploading ? `Uploading ${uploadProgress}%` : 'From Gallery'}
                  </span>
                  <span className="text-[10px] text-white/75 block truncate">
                    {resolvedCustomImage ? 'Tap to change photo' : 'Pick any photo from device'}
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Built-In Party Stage Themes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C77DFF]" />
                <span>Party Stage Themes</span>
              </span>
              <span className="text-[10px] text-white/55 font-semibold">
                {PARTY_BACKGROUND_PRESETS.length} Themes
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {PARTY_BACKGROUND_PRESETS.map((preset) => {
                const isSelected = currentType === 'preset' && currentPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={isUploading}
                    onClick={() => {
                      onSelectBackground({
                        backgroundType: 'preset',
                        backgroundId: preset.id,
                        backgroundImage: '',
                      });
                      onClose();
                    }}
                    className={`relative h-24 rounded-2xl overflow-hidden border text-left transition-all active:scale-98 ${
                      isSelected
                        ? 'border-[#FA26A0] ring-2 ring-[#FA26A0]/60 shadow-lg'
                        : 'border-white/12 hover:border-white/35'
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
                    <div
                      className="absolute inset-0 opacity-75"
                      style={{ background: preset.glow }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#060212]/90 via-transparent to-black/20" />

                    <div className="relative z-10 h-full p-2.5 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span
                          className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-black/45 border border-white/15"
                          style={{ color: preset.accent }}
                        >
                          {preset.tag}
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-[#FA26A0] text-white flex items-center justify-center shadow">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-black text-white drop-shadow">
                        {preset.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
