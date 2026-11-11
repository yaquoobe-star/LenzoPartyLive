import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  RefreshCw, 
  Mic, 
  MicOff, 
  RotateCcw, 
  ArrowRight, 
  Play, 
  Pause, 
  AlertCircle,
  Video as VideoIcon
} from 'lucide-react';
import { acquireRealDeviceCamera, stopMediaStream } from '../../utils/mediaDeviceHelper';

interface CameraRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordingComplete: (videoBlob: Blob, videoUrl: string) => void;
}

export const CameraRecorderModal: React.FC<CameraRecorderModalProps> = ({
  isOpen,
  onClose,
  onRecordingComplete,
}) => {
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(true);
  const [isMicEnabled, setIsMicEnabled] = useState<boolean>(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  // Recording states: 'idle' | 'recording' | 'preview'
  const [recordState, setRecordState] = useState<'idle' | 'recording' | 'preview'>('idle');
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  const videoElementRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  // Initialize Camera Stream
  const initCamera = async (front: boolean) => {
    // Stop any existing tracks
    if (streamRef.current) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }

    try {
      const result = await acquireRealDeviceCamera({
        isFront: front,
        enableAudio: isMicEnabled,
        idealWidth: 720,
        idealHeight: 1280,
      });

      streamRef.current = result.stream;
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = result.stream;
        videoElementRef.current.play().catch(() => {});
      }
      setHasPermission(true);
      setPermissionError(null);
    } catch (err: any) {
      console.warn('Camera permission denied or error:', err);
      setHasPermission(false);
      setPermissionError('Camera access was denied. Please allow camera and microphone permissions.');
    }
  };

  useEffect(() => {
    if (isOpen && recordState !== 'preview') {
      initCamera(isFrontCamera);
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isOpen, isFrontCamera]);

  // Start Video Recording
  const startRecording = () => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];

    try {
      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        options = { mimeType: 'video/webm;codecs=vp9,opus' };
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        options = { mimeType: 'video/webm' };
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        options = { mimeType: 'video/mp4' };
      }

      const recorder = new MediaRecorder(streamRef.current, options);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || 'video/mp4';
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setPreviewVideoUrl(url);
        setRecordState('preview');

        // Stop camera tracks during review
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setRecordState('recording');
      setRecordDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Error starting MediaRecorder:', err);
      setPermissionError('Could not start recording. You can also upload a video from your gallery.');
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Retake Video
  const handleRetake = () => {
    if (previewVideoUrl) {
      URL.revokeObjectURL(previewVideoUrl);
    }
    setRecordedBlob(null);
    setPreviewVideoUrl(null);
    setRecordDuration(0);
    setRecordState('idle');
    initCamera(isFrontCamera);
  };

  // Continue to Upload
  const handleContinue = () => {
    if (recordedBlob && previewVideoUrl) {
      onRecordingComplete(recordedBlob, previewVideoUrl);
      onClose();
    }
  };

  // Fallback: Native Device Camera input change
  const handleNativeFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setRecordedBlob(file);
      setPreviewVideoUrl(url);
      setRecordState('preview');
    }
  };

  if (!isOpen) return null;

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black select-none animate-fade-in">
      {/* Hidden file input for native camera capture fallback */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={handleNativeFileSelected}
        className="hidden"
      />

      <div className="relative w-full h-full max-w-lg mx-auto bg-black flex flex-col justify-between overflow-hidden">
        
        {/* ========================================================
            1. TOP TOOLBAR (Close, Flip Camera, Mic Toggle, Timer)
           ======================================================== */}
        <header className="relative z-30 flex items-center justify-between p-4 pt-safe">
          <button
            onClick={() => {
              if (previewVideoUrl) URL.revokeObjectURL(previewVideoUrl);
              onClose();
            }}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 active:scale-95 transition-all shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Recording Timer Display */}
          {recordState === 'recording' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 text-white font-mono text-xs font-bold animate-pulse shadow-lg">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>{formatTime(recordDuration)} / 01:00</span>
            </div>
          )}

          {recordState !== 'preview' ? (
            <div className="flex items-center gap-2">
              {/* Camera Flip Button */}
              <button
                onClick={() => setIsFrontCamera(!isFrontCamera)}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 active:scale-95 transition-all shadow-lg"
                title="Flip Camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Mic Toggle Button */}
              <button
                onClick={() => setIsMicEnabled(!isMicEnabled)}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 active:scale-95 transition-all shadow-lg"
                title={isMicEnabled ? 'Mute Microphone' : 'Enable Microphone'}
              >
                {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-red-400" />}
              </button>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full bg-[#FA26A0]/20 border border-[#FA26A0]/40 text-[#FA26A0] text-xs font-bold">
              Review Video
            </div>
          )}
        </header>

        {/* ========================================================
            2. VIEWFINDER / RECORDED VIDEO PLAYER
           ======================================================== */}
        <div className="absolute inset-0 z-10 w-full h-full bg-[#080413]">
          {recordState === 'preview' && previewVideoUrl ? (
            /* Recorded Video Preview Player */
            <video
              src={previewVideoUrl}
              autoPlay
              loop
              playsInline
              controls
              className="w-full h-full object-cover"
            />
          ) : hasPermission ? (
            /* Live Camera View */
            <video
              ref={videoElementRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isFrontCamera ? '-scale-x-100' : ''}`}
            />
          ) : (
            /* Camera Permission Required / Fallback UI */
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#140D20] to-[#080413]">
              <div className="w-16 h-16 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-[#FA26A0] mb-4">
                <VideoIcon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-white mb-2">Camera Access</h3>
              <p className="text-xs text-[#9E97AA] max-w-xs mb-6 leading-relaxed">
                {permissionError || 'Please allow camera and microphone access to record new videos directly inside Lonzo Party Live.'}
              </p>
              
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                  onClick={() => initCamera(isFrontCamera)}
                  className="w-full py-3 rounded-full bg-[#FA26A0] text-white text-xs font-bold shadow-lg shadow-pink-600/30 active:scale-95 transition-all"
                >
                  Enable Camera
                </button>
                <button
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="w-full py-3 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold active:scale-95 transition-all"
                >
                  Launch Native Camera
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            3. BOTTOM ACTION BAR (Record vs Retake/Continue)
           ======================================================== */}
        <footer className="relative z-30 p-6 pb-safe flex items-center justify-center">
          {recordState === 'preview' ? (
            /* Review State: Retake vs Continue */
            <div className="flex items-center justify-between w-full max-w-sm gap-4 bg-black/60 backdrop-blur-md p-3 rounded-3xl border border-white/10">
              {/* Retake Button */}
              <button
                onClick={handleRetake}
                className="flex-1 py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-black flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake</span>
              </button>

              {/* Continue / Next Button */}
              <button
                onClick={handleContinue}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#FA26A0] hover:bg-[#e01d8b] text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-pink-600/40 active:scale-95 transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Live Camera State: Shutter / Record Button */
            <div className="flex items-center justify-center w-full">
              {recordState === 'recording' ? (
                /* Stop Recording Button (Red square inside red circle) */
                <button
                  onClick={stopRecording}
                  className="group relative w-20 h-20 rounded-full border-4 border-red-500 flex items-center justify-center bg-black/40 backdrop-blur-sm active:scale-95 transition-transform"
                >
                  <div className="w-7 h-7 rounded-lg bg-red-600 group-hover:scale-110 transition-transform shadow-lg" />
                </button>
              ) : (
                /* Start Recording Button (Red circle inside white ring) */
                <button
                  onClick={startRecording}
                  disabled={!hasPermission}
                  className="group relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-black/30 backdrop-blur-sm active:scale-95 transition-transform disabled:opacity-50"
                >
                  <div className="w-14 h-14 rounded-full bg-[#FA26A0] group-hover:scale-105 transition-transform shadow-[0_0_20px_rgba(250,38,160,0.6)]" />
                </button>
              )}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};
