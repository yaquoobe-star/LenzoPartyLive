/**
 * Lenzo Party Live - Real Device Camera & Microphone Media Helper
 * Handles camera rotation (front selfie vs back/rear environment camera),
 * device enumeration, fallback strategies, and real-time audio volume analysis.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativeMediaPermissionsResult {
  camera: boolean;
  microphone: boolean;
  cameraPermanentlyDenied?: boolean;
  microphonePermanentlyDenied?: boolean;
}

interface MediaPermissionsPluginInterface {
  checkMediaPermissions(): Promise<NativeMediaPermissionsResult>;
  requestMediaPermissions(options: { video: boolean; audio: boolean }): Promise<NativeMediaPermissionsResult>;
  openAppSettings(): Promise<{ opened: boolean }>;
  setCommunicationAudioMode(options: { enabled: boolean }): Promise<void>;
  setKeepScreenOn(options: { enabled: boolean }): Promise<{ enabled: boolean }>;
  getKeepScreenOnState(): Promise<{ enabled: boolean }>;
}

const NativeMediaPermissions = registerPlugin<MediaPermissionsPluginInterface>('MediaPermissions');

export function isNativeAndroidApp(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function openNativeAppSettings(): Promise<boolean> {
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    try {
      await NativeMediaPermissions.openAppSettings();
      return true;
    } catch (err) {
      console.warn('[MediaPermissions] openAppSettings warning:', err);
    }
  }
  return false;
}

export async function setNativeLiveAudioMode(enabled: boolean): Promise<void> {
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    try {
      await NativeMediaPermissions.setCommunicationAudioMode({ enabled });
    } catch {
      // ignore if unsupported
    }
  }
}

export async function setNativeKeepScreenOn(enabled: boolean): Promise<boolean> {
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    try {
      const res = await NativeMediaPermissions.setKeepScreenOn({ enabled });
      return Boolean(res?.enabled ?? enabled);
    } catch (err) {
      console.warn('[ScreenWakeLock] Native setKeepScreenOn warning:', err);
    }
  }
  return false;
}

/**
 * Request native Android runtime CAMERA / RECORD_AUDIO permissions before calling getUserMedia.
 * No-op on web browsers (where getUserMedia triggers the browser permission dialog directly).
 */
export async function ensureNativeMediaPermissions(options: {
  video: boolean;
  audio: boolean;
}): Promise<NativeMediaPermissionsResult> {
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    try {
      return await NativeMediaPermissions.requestMediaPermissions({
        video: options.video,
        audio: options.audio,
      });
    } catch (err) {
      console.warn('[MediaPermissions] Native permission request warning:', err);
    }
  }
  return {
    camera: options.video,
    microphone: options.audio,
    cameraPermanentlyDenied: false,
    microphonePermanentlyDenied: false,
  };
}

function isPermissionError(err: any): boolean {
  const name = String(err?.name || '');
  const msg = String(err?.message || '').toLowerCase();
  return (
    name === 'NotAllowedError' ||
    name === 'PermissionDeniedError' ||
    name === 'SecurityError' ||
    msg.includes('permission denied') ||
    msg.includes('permission dismissed') ||
    msg.includes('not allowed')
  );
}

export interface StagedLiveMedia {
  stream: MediaStream;
  isFront: boolean;
  isCameraOn: boolean;
  isMicOn: boolean;
  label: string;
  isRealBackCamera: boolean;
  hasAudio: boolean;
  stagedAt: number;
}

let stagedLiveMedia: StagedLiveMedia | null = null;

/**
 * Hand off an already-acquired hardware camera & mic MediaStream from CreateLiveScreen
 * directly to ActiveLiveScreen without closing/re-opening the camera (avoids NotReadableError on Android).
 */
export function setStagedLiveStream(media: Omit<StagedLiveMedia, 'stagedAt'> | null): void {
  if (stagedLiveMedia && stagedLiveMedia.stream !== media?.stream) {
    stopMediaStream(stagedLiveMedia.stream);
  }
  stagedLiveMedia = media ? { ...media, stagedAt: Date.now() } : null;
}

export function consumeStagedLiveStream(): StagedLiveMedia | null {
  const current = stagedLiveMedia;
  stagedLiveMedia = null;
  if (!current) return null;
  const hasLiveTracks = current.stream.getTracks().some((t) => t.readyState === 'live');
  if (!hasLiveTracks) {
    stopMediaStream(current.stream);
    return null;
  }
  return current;
}

export function clearStagedLiveStream(): void {
  if (stagedLiveMedia) {
    stopMediaStream(stagedLiveMedia.stream);
    stagedLiveMedia = null;
  }
}

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
    const videoDevices = devices.filter((d) => d.kind === 'videoinput' && Boolean(d.deviceId));

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
 * Prompts Android OS runtime permissions first (when native) and uses standard facingMode
 * getUserMedia first so browser/WebView camera + microphone dialogs always appear cleanly.
 */
export async function acquireRealDeviceCamera(options: {
  isFront: boolean;
  enableAudio: boolean;
  idealWidth?: number;
  idealHeight?: number;
}): Promise<CameraStreamResult> {
  const { isFront, enableAudio, idealWidth = 1280, idealHeight = 720 } = options;

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera & Microphone API requires HTTPS or supported device browser');
  }

  // Explicitly request Android runtime CAMERA + RECORD_AUDIO permissions first on native APK
  const nativePerm = await ensureNativeMediaPermissions({ video: true, audio: enableAudio });
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    if (!nativePerm.camera) {
      const deniedErr: any = new Error(
        nativePerm.cameraPermanentlyDenied
          ? 'Camera permission is disabled in Android Settings. Tap Open Settings to allow Camera & Microphone.'
          : 'Camera permission was denied. Tap Allow Camera & Mic to connect your real camera.'
      );
      deniedErr.name = 'NotAllowedError';
      deniedErr.permanentlyDenied = Boolean(
        nativePerm.cameraPermanentlyDenied || nativePerm.microphonePermanentlyDenied
      );
      throw deniedErr;
    }
  }

  const shouldRequestAudio =
    enableAudio && (!(typeof window !== 'undefined' && Capacitor.isNativePlatform()) || nativePerm.microphone);

  const audioConstraint = shouldRequestAudio
    ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    : false;

  let stream: MediaStream | null = null;
  let isRealBackCamera = false;
  let activeLabel = '';
  let lastError: any = null;

  if (!isFront) {
    // -------------------------------------------------------------------
    // TARGET: REAR / BACK CAMERA
    // -------------------------------------------------------------------
    const { backCamera, allCameras } = await enumerateCameraDevices();

    // Strategy 1: exact facingMode: 'environment' (Mobile Chrome / Safari / WebView standard)
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
      activeLabel = 'Back Camera';
    } catch (err) {
      if (isPermissionError(err)) throw err;
      lastError = err;
    }

    // Strategy 2: Explicit non-empty deviceId of identified back camera
    if (!stream && backCamera?.deviceId) {
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
        if (isPermissionError(err)) throw err;
        lastError = err;
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
        activeLabel = 'Back Camera';
      } catch (err) {
        if (isPermissionError(err)) throw err;
        lastError = err;
      }
    }

    // Strategy 4: Fallback to any available camera + audio, then video-only (only for non-permission errors)
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: shouldRequestAudio ? true : false,
        });
        isRealBackCamera = allCameras.length > 1;
        activeLabel = 'Camera';
      } catch (err) {
        if (isPermissionError(err)) throw err;
        lastError = err;
        if (shouldRequestAudio) {
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
    // Single atomic getUserMedia({ video, audio }) so OS/Browser asks once & connects both!
    // -------------------------------------------------------------------
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: idealWidth },
          height: { ideal: idealHeight },
        },
        audio: audioConstraint,
      });
      activeLabel = 'Front Camera';
    } catch (err) {
      if (isPermissionError(err)) throw err;
      lastError = err;
      // Fallback 1 (constraint/hardware errors only): Simple constraints { video: true, audio: true }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: shouldRequestAudio ? true : false,
        });
        activeLabel = 'Default Camera';
      } catch (errSimple) {
        if (isPermissionError(errSimple)) throw errSimple;
        lastError = errSimple;
        // Fallback 2: If microphone hardware missing, try video-only
        if (shouldRequestAudio) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          activeLabel = 'Camera (Video Only)';
        } else {
          throw errSimple;
        }
      }
    }
  }

  if (!stream) {
    throw lastError || new Error('Unable to start real camera stream');
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
 * Request real device microphone stream only (useful for party audio rooms or audio-only live).
 */
export async function acquireRealMicrophone(): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone API not supported on this device/browser');
  }

  // Explicitly request Android runtime RECORD_AUDIO permission first on native APK
  const nativePerm = await ensureNativeMediaPermissions({ video: false, audio: true });
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform() && !nativePerm.microphone) {
    const deniedErr: any = new Error(
      nativePerm.microphonePermanentlyDenied
        ? 'Microphone permission is disabled in Android Settings. Tap Open Settings to allow Microphone.'
        : 'Microphone permission was denied. Tap Allow Microphone to speak.'
    );
    deniedErr.name = 'NotAllowedError';
    deniedErr.permanentlyDenied = Boolean(nativePerm.microphonePermanentlyDenied);
    throw deniedErr;
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
  } catch (err: any) {
    if (isPermissionError(err)) {
      throw err;
    }
    // Retry with minimal audio constraint for older Android WebViews
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
  }
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
