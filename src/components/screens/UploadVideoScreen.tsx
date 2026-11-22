import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Upload,
  Video,
  CheckCircle2,
  X,
  Globe,
  Film,
} from 'lucide-react';
import { UserProfile, VideoItem } from '../../types';
import {
  uploadReelVideoAndThumbnail,
  UploadProgressInfo,
  UploadProgressPhase,
} from '../../services/storageService';
import { createReelDocument, generateReelId } from '../../services/reelService';

interface UploadVideoScreenProps {
  currentUser: UserProfile;
  initialVideoUrl?: string;
  initialFile?: File | Blob | null;
  onClose: () => void;
  onUploadSuccess: (video: VideoItem) => void;
}

const MAX_REEL_FILE_BYTES = 100 * 1024 * 1024; // 100 MB

function formatSpeed(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return '';
  if (bytesPerSecond >= 1024 * 1024) {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  return `${Math.max(1, Math.round(bytesPerSecond / 1024))} KB/s`;
}

function formatEta(seconds?: number): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return '';
  if (seconds < 60) return `${Math.ceil(seconds)}s left`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return `${mins}m ${secs}s left`;
}

export const UploadVideoScreen: React.FC<UploadVideoScreenProps> = ({
  currentUser,
  initialVideoUrl,
  initialFile,
  onClose,
  onUploadSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | Blob | null>(initialFile || null);
  const [previewUrl, setPreviewUrl] = useState<string>(initialVideoUrl || '');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>(['#party', '#viral', '#lenzo']);
  const [newTagInput, setNewTagInput] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');

  // Granular determinate upload progress state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<'idle' | UploadProgressPhase>('idle');
  const [uploadStage, setUploadStage] = useState<string>('Ready to upload');
  const [bytesTransferred, setBytesTransferred] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [uploadSpeedBps, setUploadSpeedBps] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState<number | undefined>(undefined);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [isMuted] = useState(false);

  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const localObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialVideoUrl) {
      setPreviewUrl(initialVideoUrl);
      setPreviewError(false);
    }
    if (initialFile) {
      setSelectedFile(initialFile);
    }
  }, [initialVideoUrl, initialFile]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (localObjectUrlRef.current) {
        URL.revokeObjectURL(localObjectUrlRef.current);
        localObjectUrlRef.current = null;
      }
    };
  }, []);

  const resetProgressState = () => {
    setIsUploading(false);
    setUploadProgress(0);
    setUploadPhase('idle');
    setUploadStage('Ready to upload');
    setBytesTransferred(0);
    setTotalBytes(0);
    setUploadSpeedBps(0);
    setEtaSeconds(undefined);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const mime = (file.type || '').toLowerCase();
      const nameLower = (file.name || '').toLowerCase();
      const hasVideoExt = /\.(mp4|webm|mov|m4v|ogv|ogg|3gp|mkv)$/i.test(nameLower);
      if (mime && !mime.startsWith('video/') && !hasVideoExt) {
        setErrorMessage('Please select a valid video file (MP4, WebM, MOV, or 3GP).');
        e.target.value = '';
        return;
      }
      if (file.size <= 0) {
        setErrorMessage('Selected video file is empty. Please choose another video.');
        e.target.value = '';
        return;
      }
      if (file.size > MAX_REEL_FILE_BYTES) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        setErrorMessage(`Video is ${sizeMb} MB. Maximum allowed upload size is 100 MB.`);
        e.target.value = '';
        return;
      }

      if (localObjectUrlRef.current) {
        URL.revokeObjectURL(localObjectUrlRef.current);
      }
      const url = URL.createObjectURL(file);
      localObjectUrlRef.current = url;
      setSelectedFile(file);
      setPreviewUrl(url);
      setPreviewError(false);
    }
    e.target.value = '';
  };

  const handleAddHashtag = (tagToAdd?: string) => {
    const raw = tagToAdd || newTagInput;
    if (!raw.trim()) return;
    const cleanTag = raw.startsWith('#') ? raw.trim() : `#${raw.trim()}`;
    if (!hashtags.includes(cleanTag)) {
      setHashtags([...hashtags, cleanTag]);
    }
    if (!tagToAdd) setNewTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    if (isUploading) return;
    setHashtags(hashtags.filter((t) => t !== tag));
  };

  const handleCancelOrClose = () => {
    if (isUploading) {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      resetProgressState();
      setErrorMessage('Upload cancelled.');
      return;
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;
    setErrorMessage(null);

    if (!selectedFile) {
      setErrorMessage('Please select a video file to upload to Lenzo Reels.');
      fileInputRef.current?.click();
      return;
    }
    if (selectedFile.size > MAX_REEL_FILE_BYTES) {
      const sizeMb = (selectedFile.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(`Video is ${sizeMb} MB. Maximum allowed upload size is 100 MB.`);
      return;
    }
    if (!caption.trim()) {
      setErrorMessage('Please enter a caption for your reel.');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadPhase('init');
    setUploadStage('Connecting to storage...');
    setBytesTransferred(0);
    setTotalBytes(selectedFile.size);
    setUploadSpeedBps(0);
    setEtaSeconds(undefined);

    try {
      const reelId = generateReelId();

      // 1. Upload video (<= 100 MB) & thumbnail with real-time progress events
      const uploaded = await uploadReelVideoAndThumbnail({
        reelId,
        videoFile: selectedFile,
        signal: controller.signal,
        onProgress: (pct, info) => {
          const normalizedPct = Math.max(0, Math.min(96, Math.round(pct)));
          setUploadProgress(normalizedPct);

          if (info && 'percent' in info) {
            const progressInfo = info as UploadProgressInfo;
            if (typeof progressInfo.bytesTransferred === 'number') {
              setBytesTransferred(progressInfo.bytesTransferred);
            }
            if (typeof progressInfo.totalBytes === 'number' && progressInfo.totalBytes > 0) {
              setTotalBytes(progressInfo.totalBytes);
            }
            if (typeof progressInfo.bytesPerSecond === 'number') {
              setUploadSpeedBps(progressInfo.bytesPerSecond);
            }
            setEtaSeconds(progressInfo.etaSeconds);
            if (progressInfo.phase) {
              setUploadPhase(progressInfo.phase);
            }
            if (progressInfo.stage) {
              setUploadStage(progressInfo.stage);
            }
          } else if (normalizedPct >= 91) {
            setUploadPhase('thumbnail');
            setUploadStage('Creating preview cover...');
          } else {
            setUploadPhase('uploading');
            setUploadStage(`Uploading video (${normalizedPct}%)`);
          }
        },
      });

      if (controller.signal.aborted) {
        return;
      }

      setUploadProgress(98);
      setUploadPhase('saving');
      setUploadStage('Publishing reel...');
      setEtaSeconds(undefined);

      // 2. Persist Reel metadata in Cloud Firestore `reels/{reelID}`
      const createdReel = await createReelDocument({
        reelId,
        creator: currentUser,
        videoUrl: uploaded.videoUrl,
        videoStoragePath: uploaded.videoStoragePath,
        thumbnailUrl: uploaded.thumbnailUrl,
        thumbnailStoragePath: uploaded.thumbnailStoragePath,
        caption: caption.trim(),
        hashtags,
        visibility: privacy,
        musicTitle: `${currentUser.name} - Original Sound`,
        fileSizeBytes: uploaded.fileSizeBytes,
        storageBackend: uploaded.storageBackend,
        videoMimeType: uploaded.videoMimeType,
        mediaChunkCount: uploaded.mediaChunkCount,
      });

      setUploadProgress(100);
      setUploadPhase('complete');
      setUploadStage('Published');
      abortControllerRef.current = null;

      setTimeout(() => {
        setIsUploading(false);
        onUploadSuccess(createdReel);
      }, 350);
    } catch (err: any) {
      abortControllerRef.current = null;
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        resetProgressState();
        setErrorMessage('Upload cancelled.');
        return;
      }
      console.error('[Reel Upload Error]:', err);
      resetProgressState();
      setErrorMessage(
        err?.message || 'Failed to upload reel. Please check your connection and try again.'
      );
    }
  };

  const isBlobOrVideoUrl =
    Boolean(previewUrl) &&
    (previewUrl.startsWith('blob:') ||
      /\.(mp4|webm|mov|m4v|ogv|3gp|mkv)(\?|$)/i.test(previewUrl) ||
      previewUrl.includes('/api/reels/media/') ||
      previewUrl.includes('firebasestorage'));

  const selectedSizeMb = selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(1) : null;
  const transferredMb = (bytesTransferred / (1024 * 1024)).toFixed(1);
  const totalMb = ((totalBytes || selectedFile?.size || 0) / (1024 * 1024)).toFixed(1);
  const speedText = uploadPhase === 'uploading' ? formatSpeed(uploadSpeedBps) : '';
  const etaText = uploadPhase === 'uploading' ? formatEta(etaSeconds) : '';

  // Circular SVG ring math (radius = 38, circumference ~= 238.76)
  const ringRadius = 38;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - Math.max(0, Math.min(100, uploadProgress)) / 100);

  const stepIndex =
    uploadPhase === 'complete'
      ? 3
      : uploadPhase === 'saving'
        ? 2
        : uploadPhase === 'finalizing' || uploadPhase === 'thumbnail'
          ? 1
          : 0;

  const buttonLabel = !isUploading
    ? 'Upload Video'
    : uploadProgress >= 100
      ? 'Published 100%'
      : uploadPhase === 'saving'
        ? `Publishing ${uploadProgress}%`
        : uploadPhase === 'finalizing' || uploadPhase === 'thumbnail'
          ? `Processing ${uploadProgress}%`
          : `Uploading ${uploadProgress}%`;

  return (
    <div className="min-h-dvh-screen w-full bg-[#080413] text-white flex flex-col justify-between px-4 sm:px-6 safe-pt-4 safe-pb-4 select-none animate-fade-in font-sans">
      {/* Hidden file input to select video */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/3gpp,video/*"
        onChange={handleFileChange}
        disabled={isUploading}
        className="hidden"
      />

      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col justify-between">
        {/* ========================================================
            1. HEADER (Cancel Button, Title, and Balance Spacer)
           ======================================================== */}
        <header className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
          <button
            type="button"
            onClick={handleCancelOrClose}
            className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#160E24] hover:bg-[#201433] border border-white/10 text-xs font-bold text-[#9E97AA] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isUploading ? 'Cancel Upload' : 'Cancel'}</span>
          </button>

          <h2 className="text-base font-black text-white font-display">
            Video Upload
          </h2>

          <div className="w-16 text-right">
            {isUploading && (
              <span className="text-xs font-mono font-bold text-[#FA26A0] tabular-nums">
                {uploadProgress}%
              </span>
            )}
          </div>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs py-2.5 px-3.5 rounded-2xl mb-4 animate-shake"
          >
            {errorMessage}
          </div>
        )}

        {/* ========================================================
            2. VIDEO PREVIEW CONTAINER WITH DETERMINATE PROGRESS OVERLAY
           ======================================================== */}
        <div className="relative mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-[#FA26A0]" />
              <span>Video Preview</span>
              {selectedSizeMb && (
                <span className="text-[11px] font-mono text-[#9E97AA] tabular-nums">
                  · {selectedSizeMb} MB / 100 MB
                </span>
              )}
            </span>

            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[36px] text-[11px] font-bold text-[#FA26A0] hover:text-pink-300 disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <span>Change Video</span>
              <span>›</span>
            </button>
          </div>

          <div className="relative h-60 sm:h-72 w-full rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl flex items-center justify-center group">
            {isBlobOrVideoUrl && !previewError ? (
              <video
                ref={videoPlayerRef}
                src={previewUrl}
                autoPlay
                loop
                playsInline
                muted={isMuted}
                controls={!isUploading}
                onError={() => setPreviewError(true)}
                className="w-full h-full object-contain bg-black"
              />
            ) : isBlobOrVideoUrl && previewError ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#140D20] px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                  <Film className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-white">Video Selected &amp; Ready</span>
                <span className="text-[11px] text-[#9E97AA]">
                  Preview unavailable for this codec, but your video can still be uploaded.
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full flex flex-col items-center justify-center gap-2.5 bg-[#140D20] hover:bg-[#1b122b] transition-colors px-6 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-[#FA26A0]/20 border border-[#FA26A0]/40 flex items-center justify-center text-[#FA26A0]">
                  <Video className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-white">Tap to Select Reel Video</span>
                <span className="text-[11px] text-[#9E97AA]">MP4, WebM, or MOV · Max 100 MB</span>
              </button>
            )}

            {/* Determinate Upload Progress Scrim Overlay */}
            {isUploading && (
              <div
                aria-live="polite"
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center z-10 animate-fade-in"
              >
                <div className="relative w-24 h-24 flex items-center justify-center mb-3">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
                    <circle
                      cx="48"
                      cy="48"
                      r={ringRadius}
                      fill="none"
                      stroke="rgba(255,255,255,0.14)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r={ringRadius}
                      fill="none"
                      stroke={uploadProgress >= 100 ? '#10B981' : '#FA26A0'}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringOffset}
                      className="transition-[stroke-dashoffset] duration-150 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {uploadProgress >= 100 ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <span className="text-xl font-black font-mono tabular-nums text-white">
                        {uploadProgress}%
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm font-bold text-white leading-snug">{uploadStage}</p>
                <div className="mt-1.5 flex items-center justify-center gap-2 text-[11px] font-mono tabular-nums text-[#C9C3D4]">
                  <span>
                    {transferredMb} / {totalMb} MB
                  </span>
                  {speedText && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{speedText}</span>
                    </>
                  )}
                  {etaText && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{etaText}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            3. CAPTION & HASHTAGS
           ======================================================== */}
        <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
          <div className={`space-y-3 transition-opacity ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-white">Caption *</label>
                <span className="text-[10px] text-[#9E97AA] font-mono tabular-nums">
                  {caption.length}/150
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={150}
                disabled={isUploading}
                placeholder="Write an engaging caption for your video..."
                value={caption}
                onChange={(e) => {
                  setCaption(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full bg-[#140D20] border border-white/10 focus:border-[#FA26A0] rounded-2xl p-3.5 text-xs text-white placeholder-[#9E97AA] outline-none resize-none transition-colors"
              />
            </div>

            {/* Quick Hashtag Suggestions */}
            <div>
              <label className="block text-[11px] font-bold text-[#9E97AA] mb-1.5">Hashtags</label>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full bg-[#1A102B] border border-[#FA26A0]/30 text-xs text-[#FA26A0] font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => handleRemoveTag(tag)}
                      aria-label={`Remove ${tag}`}
                      className="hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Custom Tag */}
              <div className="flex flex-wrap items-center gap-2">
                {['#dance', '#music', '#friends', '#trending'].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    disabled={isUploading}
                    onClick={() => handleAddHashtag(sug)}
                    className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] text-[#9E97AA] hover:text-white font-semibold transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy Selector */}
            <div className="p-3 rounded-2xl bg-[#140D20] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-[#FA26A0]" />
                <span className="text-xs font-bold text-white">Who can view</span>
              </div>
              <div className="flex items-center gap-1.5">
                {(['public', 'friends', 'private'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={isUploading}
                    onClick={() => setPrivacy(mode)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold capitalize transition-all ${
                      privacy === mode
                        ? 'bg-[#FA26A0] text-white shadow'
                        : 'text-[#9E97AA] hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ========================================================
              4. DETERMINATE UPLOAD PROGRESS & SUBMIT / CANCEL BUTTONS
             ======================================================== */}
          <div className="pt-3 pb-4 space-y-2.5">
            {isUploading && (
              <div className="p-3.5 rounded-2xl bg-[#140D20] border border-white/10 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-white truncate">{uploadStage}</span>
                  <span className="font-mono font-black text-[#FA26A0] tabular-nums shrink-0">
                    {uploadProgress}%
                  </span>
                </div>

                <div
                  role="progressbar"
                  aria-label="Video upload progress"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden"
                >
                  <div
                    className={`h-full w-full origin-left transition-transform duration-150 ease-out ${
                      uploadProgress >= 100
                        ? 'bg-emerald-400'
                        : 'bg-gradient-to-r from-[#FF007A] to-[#FA26A0]'
                    }`}
                    style={{ transform: `scaleX(${Math.max(0.01, uploadProgress / 100)})` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#9E97AA]">
                  <div className="flex items-center gap-1.5">
                    <span className={stepIndex >= 0 ? 'text-white font-semibold' : ''}>Upload</span>
                    <span aria-hidden="true">·</span>
                    <span className={stepIndex >= 1 ? 'text-white font-semibold' : ''}>Process</span>
                    <span aria-hidden="true">·</span>
                    <span className={stepIndex >= 2 ? 'text-white font-semibold' : ''}>Publish</span>
                  </div>
                  <span className="font-mono tabular-nums">
                    {transferredMb} / {totalMb} MB
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading}
              className="w-full min-h-[48px] py-3.5 rounded-full bg-[#FA26A0] hover:bg-[#e01d8b] text-white font-black text-sm shadow-xl shadow-pink-900/40 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-75"
            >
              {uploadProgress >= 100 && isUploading ? (
                <CheckCircle2 className="w-4 h-4 text-white" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span className="font-mono tabular-nums sm:font-sans">{buttonLabel}</span>
            </button>

            <button
              type="button"
              onClick={handleCancelOrClose}
              className="w-full min-h-[44px] py-3 rounded-full bg-white/5 hover:bg-white/10 text-[#9E97AA] hover:text-white font-bold text-xs active:scale-[0.98] transition-all"
            >
              {isUploading ? 'Cancel Upload' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
