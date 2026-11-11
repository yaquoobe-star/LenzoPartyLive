/**
 * Lonzo Party Live - Real Device Camera & Microphone Media Helper
 * Handles camera rotation (front selfie vs back/rear environment camera),
 * device enumeration, fallback strategies, and real-time audio volume analysis.
 */

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
  isBack: boolean;
  isFront: boolean;
}

export interface CameraStreamResult {
  stream: MediaStream;
  isFront: boolean;
  isRealBackCamera: boolean;
  hasAudio: boolean;
  label: string;
}

export interface AudioAnalyserController {
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  getVolumeLevel: () => number;
  cleanup: () => void;
}

/**
 * Enumerate available video inputs and classify them as Front or Back/Rear cameras.
 */
export async function enumerateCameraDevices(): Promise<{
  frontCamera?: MediaDeviceInfo;
  backCamera?: MediaDeviceInfo;
  allCameras: MediaDeviceInfo[];
}> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return { allCameras: [] };
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((d) => d.kind === 'videoinput');

    // Patterns matching rear / back camera in mobile browsers & Android WebViews
    const backPattern = /back|rear|environment|wide|ultra-wide|telephoto|main|facing\s*0|camera\s*0/i;
    // Patterns matching front / selfie camera
    const frontPattern = /front|user|selfie|face|facing\s*1|camera\s*1/i;

    const backCamera = videoDevices.find((d) => backPattern.test(d.label));
    const frontCamera = videoDevices.find((d) => frontPattern.test(d.label));

    return {
      frontCamera: frontCamera || (videoDevices.length > 0 ? videoDevices[0] : undefined),
      backCamera: backCamera || (videoDevices.length > 1 ? videoDevices[1] : undefined),
      allCameras: videoDevices,
    };
  } catch (err) {
    console.warn('[Camera] Failed to enumerate media devices:', err);
    return { allCameras: [] };
  }
}

/**
 * Safely stops all active tracks in a media stream to release camera & microphone locks.
 */
export function stopMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (e) {
        console.warn('[Camera] Track stop error:', e);
      }
    });
  } catch (err) {
    console.warn('[Camera] Error stopping media stream:', err);
  }
}

/**
 * Request real device camera with accurate front/back rotation and real-time audio.
 */
export async function acquireRealDeviceCamera(options: {
  isFront: boolean;
  enableAudio: boolean;
  idealWidth?: number;
  idealHeight?: number;
}): Promise<CameraStreamResult> {
  const { isFront, enableAudio, idealWidth = 1280, idealHeight = 720 } = options;

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera & Microphone API not supported on this device/browser');
  }

  const { frontCamera, backCamera, allCameras } = await enumerateCameraDevices();

  const audioConstraint = enableAudio
    ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    : false;

  let stream: MediaStream | null = null;
  let isRealBackCamera = false;
  let activeLabel = '';

  if (!isFront) {
    // -------------------------------------------------------------------
    // TARGET: REAR / BACK CAMERA
    // -------------------------------------------------------------------

    // Strategy 1: Explicit deviceId of identified back camera
    if (backCamera?.deviceId) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: backCamera.deviceId },
            width: { ideal: idealWidth },
            height: { ideal: idealHeight },
          },
          audio: audioConstraint,
        });
        isRealBackCamera = true;
        activeLabel = backCamera.label || 'Back Camera';
      } catch (err) {
        console.warn('[Camera] Strategy 1 (back deviceId) failed, trying exact facingMode...', err);
      }
    }

    // Strategy 2: exact facingMode: 'environment' (Mobile Chrome / Safari standard)
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: 'environment' },
            width: { ideal: idealWidth },
            height: { ideal: idealHeight },
          },
          audio: audioConstraint,
        });
        isRealBackCamera = true;
        activeLabel = 'Back Camera (Environment)';
      } catch (err) {
        console.warn('[Camera] Strategy 2 (exact environment) failed, trying ideal facingMode...', err);
      }
    }

    // Strategy 3: ideal facingMode: 'environment'
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: idealWidth },
            height: { ideal: idealHeight },
          },
          audio: audioConstraint,
        });
        isRealBackCamera = true;
        activeLabel = 'Back Camera (Ideal)';
      } catch (err) {
        console.warn('[Camera] Strategy 3 (ideal environment) failed, trying fallback video...', err);
      }
    }

    // Strategy 4: Fallback to available camera (e.g., PC with single webcam or if rear failed)
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: audioConstraint,
        });
        isRealBackCamera = allCameras.length > 1; // if multiple cameras exist, it may still be rear
        activeLabel = 'Camera (Rear Mode)';
      } catch (err) {
        // If audio caused the failure, try pure video
        if (enableAudio) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          activeLabel = 'Camera (Video Only)';
        } else {
          throw err;
        }
      }
    }
  } else {
    // -------------------------------------------------------------------
    // TARGET: FRONT / USER CAMERA
    // -------------------------------------------------------------------

    // Strategy 1: Explicit deviceId of identified front camera
    if (frontCamera?.deviceId) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: frontCamera.deviceId },
            width: { ideal: idealWidth },
            height: { ideal: idealHeight },
          },
          audio: audioConstraint,
        });
        activeLabel = frontCamera.label || 'Front Camera';
      } catch (err) {
        console.warn('[Camera] Front camera deviceId failed, trying facingMode...', err);
      }
    }

    // Strategy 2: facingMode: 'user'
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: idealWidth },
            height: { ideal: idealHeight },
          },
          audio: audioConstraint,
        });
        activeLabel = 'Front Camera (User)';
      } catch (err) {
        // Fallback
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: audioConstraint,
          });
          activeLabel = 'Default Camera';
        } catch (errAudio) {
          if (enableAudio) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
            activeLabel = 'Default Camera (Video Only)';
          } else {
            throw errAudio;
          }
        }
      }
    }
  }

  if (!stream) {
    throw new Error('Unable to start real camera stream');
  }

  const hasAudio = stream.getAudioTracks().length > 0;

  return {
    stream,
    isFront,
    isRealBackCamera,
    hasAudio,
    label: activeLabel,
  };
}

/**
 * Request real device microphone stream only (useful for audio rooms or audio-only live).
 */
export async function acquireRealMicrophone(): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone API not supported on this device/browser');
  }

  return await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
}

/**
 * Creates a real-time Web Audio API Analyser for measuring real mic decibel volume (0 - 100).
 */
export function createAudioAnalyser(stream: MediaStream): AudioAnalyserController {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      return {
        audioContext: null,
        analyser: null,
        getVolumeLevel: () => 0,
        cleanup: () => {},
      };
    }

    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.4;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const getVolumeLevel = (): number => {
      // Check if audio tracks are muted or disabled
      const audioTracks = stream.getAudioTracks();
      const isMuted = audioTracks.length === 0 || audioTracks.every((t) => !t.enabled);
      if (isMuted) return 0;

      try {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        // Map average (typically 0 - 64 in speech) to 0 - 100%
        return Math.min(100, Math.round((avg / 50) * 100));
      } catch {
        return 0;
      }
    };

    const cleanup = () => {
      try {
        source.disconnect();
      } catch {}
      try {
        analyser.disconnect();
      } catch {}
      try {
        if (audioContext.state !== 'closed') {
          audioContext.close().catch(() => {});
        }
      } catch {}
    };

    return {
      audioContext,
      analyser,
      getVolumeLevel,
      cleanup,
    };
  } catch (err) {
    console.warn('[AudioAnalyser] Web Audio setup failed:', err);
    return {
      audioContext: null,
      analyser: null,
      getVolumeLevel: () => 0,
      cleanup: () => {},
    };
  }
}
