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
import { uploadPostVideo } from '../../services/storageService';
import { createFirestoreVideo } from '../../services/firestoreService';

interface UploadVideoScreenProps {
  currentUser: UserProfile;
  initialVideoUrl?: string;
  initialFile?: File | Blob | null;
  onClose: () => void;
  onUploadSuccess: (video: VideoItem) => void;
}

export const UploadVideoScreen: React.FC<UploadVideoScreenProps> = ({
  currentUser,
  initialVideoUrl,
  initialFile,
  onClose,
  onUploadSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | Blob | null>(initialFile || null);
  const [previewUrl, setPreviewUrl] = useState<string>(
    initialVideoUrl || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80'
  );
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>(['#party', '#viral', '#lonzo']);
  const [newTagInput, setNewTagInput] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
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
    if (!caption.trim()) {
      setErrorMessage('Please enter a caption for your video.');
      return;
    }

    try {
      let finalVideoUrl = previewUrl;

      // Real Firebase Storage upload if a real file/blob is selected
      if (selectedFile) {
        setUploadProgress(10);
        finalVideoUrl = await uploadPostVideo(selectedFile, (pct) => {
          setUploadProgress(Math.max(10, Math.round(pct)));
        });
      } else {
        setUploadProgress(75);
      }

      const fullDescription = `${caption.trim()} ${hashtags.join(' ')}`;
      const isPrivate = privacy === 'private';

      // Persist real post in Cloud Firestore
      let realDocId = `vid_${Date.now()}`;
      try {
        realDocId = await createFirestoreVideo({
          videoUrl: finalVideoUrl,
          thumbnailUrl: finalVideoUrl,
          description: fullDescription,
          musicTitle: `${currentUser.name} - Original Sound 🎵`,
          isPrivate,
        });
      } catch (firestoreErr) {
        console.warn('[Firestore] Post document fallback notice:', firestoreErr);
      }

      setUploadProgress(100);

      const newVideoObj: VideoItem = {
        id: realDocId,
        creator: currentUser,
        videoUrl: finalVideoUrl,
        thumbnailUrl: finalVideoUrl,
        description: fullDescription,
        musicTitle: `${currentUser.name} - Original Sound 🎵`,
        hashtags,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        repostsCount: 0,
        isLiked: false,
        isReposted: false,
        createdAt: 'Just now',
        privacy,
      };

      setTimeout(() => {
        setIsUploading(false);
        onUploadSuccess(newVideoObj);
      }, 350);
    } catch (err: any) {
      setIsUploading(false);
      setErrorMessage(err.message || 'Failed to upload video');
    }
  };

  const isBlobOrVideoUrl = previewUrl.startsWith('blob:') || previewUrl.endsWith('.mp4') || previewUrl.endsWith('.webm');

  return (
    <div className="min-h-screen w-full bg-[#080413] text-white flex flex-col justify-between p-4 sm:p-6 select-none animate-fade-in font-sans">
      {/* Hidden file input to change video */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
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
              <div className="relative w-full h-full">
                <img
                  src={previewUrl}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover filter brightness-90"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-[#FA26A0]/80 backdrop-blur-md flex items-center justify-center text-white shadow-xl shadow-pink-900/40">
                    <Play className="w-6 h-6 fill-white ml-0.5" />
                  </div>
                </div>
              </div>
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
                  <span>Uploading video to Lonzo Party Live...</span>
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
