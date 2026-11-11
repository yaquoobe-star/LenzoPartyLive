import React, { useRef } from 'react';
import { X, Camera, Film, ChevronRight, Video, Image as ImageIcon } from 'lucide-react';

interface VideoUploadSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectGalleryFile: (file: File) => void;
}

export const VideoUploadSourceModal: React.FC<VideoUploadSourceModalProps> = ({
  isOpen,
  onClose,
  onSelectCamera,
  onSelectGalleryFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onClose();
      onSelectGalleryFile(file);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-[#140D20] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab bar */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto -mt-2 mb-4 sm:hidden" />

        {/* Hidden native video input for Gallery */}
        <input 
          ref={fileInputRef}
          type="file" 
          accept="video/*" 
          onChange={handleFileChange}
          className="hidden" 
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FA26A0]/20 flex items-center justify-center text-[#FA26A0]">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-white font-display leading-tight">
                Upload Video
              </h3>
              <p className="text-[11px] text-[#9E97AA]">Choose your video source</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* EXACTLY TWO OPTIONS: 1. CAMERA, 2. GALLERY */}
        <div className="space-y-3 mb-2">
          {/* Option 1: CAMERA */}
          <button
            onClick={() => {
              onClose();
              onSelectCamera();
            }}
            className="w-full p-4 rounded-2xl bg-[#1A102B] hover:bg-[#23153A] border border-white/10 hover:border-[#FA26A0] flex items-center justify-between transition-all group active:scale-[0.98] shadow-lg"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF007A] to-[#FA26A0] flex items-center justify-center text-white shadow-lg shadow-pink-600/30 shrink-0 group-hover:scale-105 transition-transform">
                <Camera className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white group-hover:text-[#FA26A0] transition-colors">
                    CAMERA
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[9px] font-bold uppercase tracking-wider">
                    Record New
                  </span>
                </div>
                <span className="text-xs text-[#9E97AA] truncate mt-0.5">
                  Record live video with front or rear camera & timer
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#9E97AA] group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
          </button>

          {/* Option 2: GALLERY */}
          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            className="w-full p-4 rounded-2xl bg-[#1A102B] hover:bg-[#23153A] border border-white/10 hover:border-emerald-500 flex items-center justify-between transition-all group active:scale-[0.98] shadow-lg"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30 shrink-0 group-hover:scale-105 transition-transform">
                <Film className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">
                    GALLERY
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase tracking-wider">
                    Device Media
                  </span>
                </div>
                <span className="text-xs text-[#9E97AA] truncate mt-0.5">
                  Select an existing video from your device files or library
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#9E97AA] group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
          </button>
        </div>

        {/* Footer info note */}
        <div className="mt-4 pt-3 border-t border-white/[0.06] text-center">
          <p className="text-[11px] text-[#6E677A]">
            Selected or recorded video can be reviewed and captioned before uploading
          </p>
        </div>
      </div>
    </div>
  );
};
