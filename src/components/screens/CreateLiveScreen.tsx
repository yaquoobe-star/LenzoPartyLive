import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  CameraOff,
  Video, 
  Radio, 
  Sparkles, 
  Check, 
  ChevronDown, 
  Users, 
  Lock, 
  Image as ImageIcon,
  RefreshCw,
  Mic,
  MicOff
} from 'lucide-react';
import { LiveStream, UserProfile } from '../../types';
import { 
  acquireRealDeviceCamera, 
  stopMediaStream, 
  createAudioAnalyser, 
  AudioAnalyserController 
} from '../../utils/mediaDeviceHelper';

interface CreateLiveScreenProps {
  currentUser: UserProfile;
  onClose: () => void;
  onStartLive: (newStream: LiveStream) => void;
}

export const CreateLiveScreen: React.FC<CreateLiveScreenProps> = ({
  currentUser,
  onClose,
  onStartLive,
}) => {
  const [streamMode, setStreamMode] = useState<'stream' | 'video'>('stream');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Music');
  const [allowGuests, setAllowGuests] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCameraPreviewOn, setIsCameraPreviewOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [hasWebcam, setHasWebcam] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [audioVolumeLevel, setAudioVolumeLevel] = useState<number>(0);
  const [isFlippingCamera, setIsFlippingCamera] = useState(false);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioAnalyserRef = useRef<AudioAnalyserController | null>(null);
  const volumeRafRef = useRef<number | null>(null);

  const [coverUrl, setCoverUrl] = useState(
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80'
  );
  const [error, setError] = useState<string | null>(null);

  const sampleCovers = [
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
  ];

  // Camera & Mic preview handling
  const startPreview = async (front = isFrontCamera) => {
    if (audioAnalyserRef.current) {
      audioAnalyserRef.current.cleanup();
      audioAnalyserRef.current = null;
    }
    if (streamRef.current) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }

    if (!isCameraPreviewOn && !isMicOn) {
      setHasWebcam(false);
      setHasMic(false);
      setAudioVolumeLevel(0);
      return;
    }

    try {
      const result = await acquireRealDeviceCamera({
        isFront: front,
        enableAudio: isMicOn,
        idealWidth: 720,
        idealHeight: 1280,
      });

      streamRef.current = result.stream;
      if (videoPreviewRef.current && isCameraPreviewOn) {
        videoPreviewRef.current.srcObject = result.stream;
        videoPreviewRef.current.play().catch(() => {});
      }

      setHasWebcam(isCameraPreviewOn);
      setHasMic(result.hasAudio && isMicOn);

      if (result.hasAudio && isMicOn) {
        const controller = createAudioAnalyser(result.stream);
        audioAnalyserRef.current = controller;
      }
    } catch (err) {
      console.warn('Real camera/mic preview acquisition error:', err);
      setHasWebcam(false);
      setHasMic(false);
    }
  };

  // Real-time audio volume monitoring
  useEffect(() => {
    let active = true;
    const poll = () => {
      if (!active) return;
      if (audioAnalyserRef.current && isMicOn) {
        const level = audioAnalyserRef.current.getVolumeLevel();
        setAudioVolumeLevel(level);
      } else {
        setAudioVolumeLevel(0);
      }
      volumeRafRef.current = requestAnimationFrame(poll);
    };
    volumeRafRef.current = requestAnimationFrame(poll);
    return () => {
      active = false;
      if (volumeRafRef.current) {
        cancelAnimationFrame(volumeRafRef.current);
      }
    };
  }, [isMicOn]);

  useEffect(() => {
    if (isCameraPreviewOn) {
      startPreview(isFrontCamera);
    } else {
      if (audioAnalyserRef.current) {
        audioAnalyserRef.current.cleanup();
        audioAnalyserRef.current = null;
      }
      if (streamRef.current) {
        stopMediaStream(streamRef.current);
        streamRef.current = null;
      }
      setHasWebcam(false);
      setAudioVolumeLevel(0);
    }
    return () => {
      if (audioAnalyserRef.current) {
        audioAnalyserRef.current.cleanup();
      }
      if (streamRef.current) {
        stopMediaStream(streamRef.current);
      }
    };
  }, [isCameraPreviewOn]);

  const handleFlipCamera = async () => {
    setIsFlippingCamera(true);
    const nextFront = !isFrontCamera;
    setIsFrontCamera(nextFront);
    await startPreview(nextFront);
    setTimeout(() => setIsFlippingCamera(false), 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a live stream title');
      return;
    }

    const createdStream: LiveStream = {
      id: `live_${Date.now()}`,
      title: title.trim(),
      category,
      host: currentUser,
      coverImage: coverUrl,
      viewerCount: '1',
      numericViewers: 1,
      isLive: true,
      tags: [category, 'New', 'Live'],
      guests: [],
      likesCount: 0,
    };

    onStartLive(createdStream);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#090611] flex flex-col justify-between p-4 sm:p-6 select-none animate-fade-in">
      <div className="max-w-lg mx-auto w-full">
        {/* Header Bar matching reference image */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#160C25] hover:bg-[#211333] border border-white/10 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-bold text-white font-display">Create Live</h2>
          <div className="w-9" /> {/* Spacer */}
        </div>

        {/* Live Stream vs Video Segmented Switch */}
        <div className="flex p-1 bg-[#160C25] rounded-2xl border border-white/10 mb-5">
          <button
            type="button"
            onClick={() => setStreamMode('stream')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              streamMode === 'stream'
                ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md'
                : 'text-[#B9AECF] hover:text-white'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Live Stream</span>
          </button>
          <button
            type="button"
            onClick={() => setStreamMode('video')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              streamMode === 'video'
                ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md'
                : 'text-[#B9AECF] hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Video</span>
          </button>
        </div>

        {error && (
          <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs py-2 px-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Camera Preview / Upload Cover Container */}
        <div className="relative mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-white">Live Camera & Cover Preview</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Camera Toggle */}
              <button
                type="button"
                onClick={() => setIsCameraPreviewOn(!isCameraPreviewOn)}
                className={`px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all ${
                  isCameraPreviewOn 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {isCameraPreviewOn ? <Camera className="w-3 h-3" /> : <CameraOff className="w-3 h-3" />}
                <span>{isCameraPreviewOn ? 'Cam ON' : 'Cam OFF'}</span>
              </button>

              {/* Mic Toggle with Live Audio Volume */}
              <button
                type="button"
                onClick={() => setIsMicOn(!isMicOn)}
                className={`px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all ${
                  isMicOn 
                    ? audioVolumeLevel > 8
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {isMicOn ? <Mic className={`w-3 h-3 ${audioVolumeLevel > 8 ? 'animate-pulse text-emerald-300' : ''}`} /> : <MicOff className="w-3 h-3" />}
                <span>{isMicOn ? (audioVolumeLevel > 8 ? 'Speaking 🔊' : 'Mic ON') : 'Muted'}</span>
                {isMicOn && audioVolumeLevel > 0 && (
                  <span className="font-mono text-[9px] text-[#FFC84A]">
                    {audioVolumeLevel}%
                  </span>
                )}
              </button>

              {/* Flip Camera (Rotate to Back / Front Camera) */}
              {isCameraPreviewOn && (
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  disabled={isFlippingCamera}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all border ${
                    !isFrontCamera
                      ? 'bg-[#00F2FE]/20 text-[#00F2FE] border-[#00F2FE]/40'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                  }`}
                  title="Rotate Camera to Back or Front Camera"
                >
                  <RefreshCw className={`w-3 h-3 ${isFlippingCamera ? 'animate-spin' : ''}`} />
                  <span>{isFrontCamera ? 'Front' : '📷 Back'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="relative h-48 rounded-2xl overflow-hidden border border-white/20 hover:border-[#F328D5] bg-[#160C25] group">
            {isCameraPreviewOn && hasWebcam ? (
              <div className="relative w-full h-full">
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-all ${isFrontCamera ? '-scale-x-100' : 'scale-x-100'}`}
                />
                {/* Real Camera Pill */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-emerald-400 text-[10px] font-bold flex items-center gap-1.5 border border-emerald-500/40 shadow">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{isFrontCamera ? '🤳 Front Camera' : '📷 Back Camera (Rear)'}</span>
                </div>
                {/* Real-time mic indicator */}
                {isMicOn && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1.5 border border-white/10 shadow">
                    <Mic className="w-3 h-3 text-emerald-400" />
                    <div className="flex items-end gap-0.5 h-2.5">
                      <span className="w-0.5 bg-emerald-400 rounded-full" style={{ height: `${Math.max(2, Math.min(10, 2 + audioVolumeLevel * 0.1))}%` }} />
                      <span className="w-0.5 bg-emerald-400 rounded-full" style={{ height: `${Math.max(3, Math.min(10, 3 + audioVolumeLevel * 0.15))}%` }} />
                      <span className="w-0.5 bg-emerald-400 rounded-full" style={{ height: `${Math.max(2, Math.min(10, 2 + audioVolumeLevel * 0.08))}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ) : isCameraPreviewOn ? (
              <div className="relative w-full h-full">
                <img
                  src={coverUrl}
                  alt="Live Cover"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover filter brightness-75 group-hover:scale-105 transition-transform"
                />
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-emerald-500/80 backdrop-blur-md text-white text-[9px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>Camera Active</span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#130a21] text-center p-4">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2">
                  <CameraOff className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-white">Camera is Turned OFF</span>
                <span className="text-[10px] text-[#B9AECF]">Live stream will start in Voice / Audio mode</span>
              </div>
            )}
          </div>

          {/* Quick preset cover picker */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-[#B9AECF]">Presets:</span>
            {sampleCovers.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCoverUrl(c)}
                className={`w-7 h-7 rounded-lg overflow-hidden border ${coverUrl === c ? 'ring-2 ring-[#F328D5]' : 'border-white/20'}`}
              >
                <img src={c} alt="cover" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Live Title Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-white mb-1.5">Live Title *</label>
            <input
              type="text"
              placeholder="Enter Live Title... (e.g. Party Jam & PK Battle 🔥)"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              className="w-full bg-[#160C25] border border-white/10 focus:border-[#F328D5] rounded-xl px-4 py-3 text-sm text-white placeholder-[#B9AECF]/50 outline-none transition-colors"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-bold text-white mb-1.5">Select Category</label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full appearance-none bg-[#160C25] border border-white/10 focus:border-[#F328D5] rounded-xl px-4 py-3 text-sm text-white outline-none cursor-pointer"
              >
                <option value="Music" className="bg-[#160C25] text-white">Music & Singing</option>
                <option value="Chat" className="bg-[#160C25] text-white">Chat & Hangout</option>
                <option value="Gaming" className="bg-[#160C25] text-white">Gaming & Esports</option>
                <option value="Dance" className="bg-[#160C25] text-white">Dance & Party</option>
                <option value="PK Battle" className="bg-[#160C25] text-white">PK Battle</option>
                <option value="Friendship" className="bg-[#160C25] text-white">Friendship & Match</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#B9AECF] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Switch Toggles matching reference: Allow Guests, Private Live */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#160C25] border border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-[#06B6D4]" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">Allow Guests</span>
                  <span className="text-[10px] text-[#B9AECF]">Viewers can request video or voice seats</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAllowGuests(!allowGuests)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  allowGuests ? 'bg-[#F328D5]' : 'bg-[#211333]'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  allowGuests ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#160C25] border border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-[#FFC84A]" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">Private Live</span>
                  <span className="text-[10px] text-[#B9AECF]">Only invited followers can join</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  isPrivate ? 'bg-[#F328D5]' : 'bg-[#211333]'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  isPrivate ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Start Live Button matching reference */}
          <div className="pt-4">
            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] text-white font-extrabold text-sm shadow-xl shadow-[#F328D5]/30 hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>Start Live</span>
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
