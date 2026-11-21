import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Upload, 
  Video, 
  CheckCircle2, 
  Sparkles, 
  X, 
  Lock, 
  Globe, 
  Users, 
  Film,
  Play,
  RotateCcw,
  Volume2,
  VolumeX
} from 'lucide-react';
import { UserProfile, VideoItem } from '../../types';
import { uploadReelVideoAndThumbnail } from '../../services/storageService';
import { createReelDocument, generateReelId } from '../../services/reelService';

interface UploadVideoScreenProps {
  currentUser: UserProfile;
  initialVideoUrl?: string;
  initialFile?: File | Blob | null;
  onClose: () => void;
  onUploadSuccess: (video: VideoItem) => void;
}

const MAX_REEL_FILE_BYTES = 100 * 1024 * 1024; // 100 MB

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<string>('Preparing upload...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialVideoUrl) {
      setPreviewUrl(initialVideoUrl);
    }
    if (initialFile) {
      setSelectedFile(initialFile);
    }
  }, [initialVideoUrl, initialFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const mime = (file.type || '').toLowerCase();
      if (mime && !mime.startsWith('video/')) {
        setErrorMessage('Please select a valid video file (MP4, WebM, or MOV).');
        return;
      }
      if (file.size > MAX_REEL_FILE_BYTES) {
        setErrorMessage('Video is larger than 100 MB. Please select a smaller clip.');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
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
    setHashtags(hashtags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedFile) {
      setErrorMessage('Please select a video file to upload to Lenzo Reels.');
      fileInputRef.current?.click();
      return;
    }
    if (!caption.trim()) {
      setErrorMessage('Please enter a caption for your reel.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);
    setUploadStage('Uploading video & generating thumbnail...');

    try {
      const reelId = generateReelId();

      // 1. Upload video & thumbnail to Firebase Storage: reels/{userUID}/{reelID}/video.{ext} & thumbnail.jpg
      const uploaded = await uploadReelVideoAndThumbnail({
        reelId,
        videoFile: selectedFile,
        onProgress: (pct) => {
          setUploadProgress(Math.max(5, Math.min(92, Math.round(pct))));
          if (pct >= 88) {
            setUploadStage('Saving thumbnail & publishing to feed...');
          }
        },
      });

      setUploadProgress(96);
      setUploadStage('Saving reel metadata to Firestore...');

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
      });

      setUploadProgress(100);
      setUploadStage('Published!');

      setTimeout(() => {
        setIsUploading(false);
        onUploadSuccess(createdReel);
      }, 300);
    } catch (err: any) {
      console.error('[Reel Upload Error]:', err);
      setIsUploading(false);
      setUploadProgress(0);
      setErrorMessage(
        err?.message || 'Failed to upload reel. Please check your connection and try again.'
      );
    }
  };

  const isBlobOrVideoUrl =
    Boolean(previewUrl) &&
    (previewUrl.startsWith('blob:') ||
      previewUrl.endsWith('.mp4') ||
      previewUrl.endsWith('.webm') ||
      previewUrl.endsWith('.mov') ||
      previewUrl.includes('firebasestorage'));

  return (
    <div className="min-h-dvh-screen w-full bg-[#080413] text-white flex flex-col justify-between px-4 sm:px-6 safe-pt-4 safe-pb-4 select-none animate-fade-in font-sans">
      {/* Hidden file input to select video */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col justify-between">
        
        {/* ========================================================
            1. HEADER (Cancel Button, Title, and Action)
           ======================================================== */}
        <header className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#160E24] hover:bg-[#201433] border border-white/10 text-xs font-bold text-[#9E97AA] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>

          <h2 className="text-base font-black text-white font-display">
            Video Upload
          </h2>

          <div className="w-16" /> {/* Balance spacer */}
        </header>

        {errorMessage && (
          <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs py-2 px-3.5 rounded-2xl mb-4 animate-shake">
            {errorMessage}
          </div>
        )}

        {/* ========================================================
            2. VIDEO PREVIEW CONTAINER
            Matching Section C: "Video Preview"
           ======================================================== */}
        <div className="relative mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-[#FA26A0]" />
              <span>Video Preview</span>
            </span>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-bold text-[#FA26A0] hover:text-pink-300 transition-colors flex items-center gap-1"
            >
              <span>Change Video</span>
              <span>›</span>
            </button>
          </div>

          <div className="relative h-60 sm:h-72 w-full rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl flex items-center justify-center group">
            {isBlobOrVideoUrl ? (
              <video
                ref={videoPlayerRef}
                src={previewUrl}
                autoPlay
                loop
                playsInline
                muted={isMuted}
                controls
                className="w-full h-full object-contain bg-black"
              />
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
          </div>
        </div>

        {/* ========================================================
            3. CAPTION & HASHTAGS
            Matching Section C: "Caption"
           ======================================================== */}
        <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-white">Caption *</label>
                <span className="text-[10px] text-[#9E97AA] font-mono">{caption.length}/150</span>
              </div>
              <textarea
                rows={3}
                maxLength={150}
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
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Custom Tag */}
              <div className="flex items-center gap-2">
                {['#dance', '#music', '#friends', '#trending'].map((sug) => (
                  <button
                    key={sug}
                    type="button"
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
                    onClick={() => setPrivacy(mode)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold capitalize transition-all ${
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
              4. UPLOAD PROGRESS & SUBMIT / CANCEL BUTTONS
              Matching Section C: "Upload Video button", "Cancel option"
             ======================================================== */}
          <div className="pt-3 pb-4 space-y-2.5">
            {isUploading && (
              <div className="space-y-1.5 animate-fade-in">
                <div className="flex items-center justify-between text-xs text-[#FA26A0] font-bold">
                  <span>{uploadStage}</span>
                  <span className="font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#FF007A] to-[#FA26A0] transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-4 rounded-full bg-[#FA26A0] hover:bg-[#e01d8b] text-white font-black text-sm shadow-xl shadow-pink-900/40 hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{isUploading ? 'Publishing...' : 'Upload Video'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="w-full py-3 rounded-full bg-white/5 hover:bg-white/10 text-[#9E97AA] hover:text-white font-bold text-xs active:scale-98 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
