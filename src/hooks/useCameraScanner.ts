import { useCallback, useEffect, useRef, useState } from 'react';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import zxingWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import {
  interpretBarcode,
  SUPPORTED_BARCODE_FORMATS,
  type BarcodeInterpretation,
} from '../lib/barcodeFormats';

export type CameraStatus = 'idle' | 'starting' | 'active' | 'error';

export interface CameraOption {
  deviceId: string;
  label: string;
}

interface UseCameraScannerOptions {
  onResult: (reading: BarcodeInterpretation) => void;
  autoStart?: boolean;
}

const DECODE_INTERVAL_MS = 160;
const SUCCESS_INTERVAL_MS = 900;
const MAX_DECODE_WIDTH = 1600;
const PERMISSION_TIMEOUT_MS = 15_000;

const READER_OPTIONS = {
  formats: [...SUPPORTED_BARCODE_FORMATS],
  tryHarder: true,
  maxNumberOfSymbols: 1,
};

interface CameraCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
  focusMode?: string[];
  exposureMode?: string[];
  whiteBalanceMode?: string[];
}

let modulePromise: Promise<unknown> | null = null;

/** Loads the bundled WASM decoder once, from the local build (offline-safe). */
function ensureDecoderReady(): Promise<unknown> {
  if (!modulePromise) {
    modulePromise = prepareZXingModule({
      fireImmediately: true,
      overrides: {
        locateFile: (path: string) => (path.endsWith('.wasm') ? zxingWasmUrl : path),
      },
    }).catch((error: unknown) => {
      modulePromise = null;
      throw error;
    });
  }
  return modulePromise;
}

function friendlyCameraError(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Camera access was blocked. Allow camera access in your browser settings, or use a USB scanner or manual entry.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera was found on this device. Use a USB scanner or enter the barcode manually.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'The camera is currently in use by another application. Close it and try again.';
    case 'OverconstrainedError':
      return 'The selected camera is unavailable. Choose another camera and try again.';
    case 'SecurityError':
      return 'Camera access requires a secure connection (HTTPS or localhost).';
    default:
      return 'The camera could not be started. Check your browser permissions and try again.';
  }
}

function readCapabilities(track: MediaStreamTrack | null): CameraCapabilities | undefined {
  if (!track?.getCapabilities) return undefined;
  try {
    return track.getCapabilities() as CameraCapabilities;
  } catch {
    return undefined;
  }
}

/**
 * Requests continuous autofocus/exposure/white balance when the device
 * exposes them. Every constraint is applied separately because browsers
 * reject the whole set if one entry is unsupported.
 */
async function applyCameraEnhancements(track: MediaStreamTrack): Promise<CameraCapabilities | undefined> {
  const capabilities = readCapabilities(track);
  const constraints: MediaTrackConstraintSet[] = [];

  if (capabilities?.focusMode?.includes('continuous')) {
    constraints.push({ focusMode: 'continuous' } as MediaTrackConstraintSet);
  }
  if (capabilities?.exposureMode?.includes('continuous')) {
    constraints.push({ exposureMode: 'continuous' } as MediaTrackConstraintSet);
  }
  if (capabilities?.whiteBalanceMode?.includes('continuous')) {
    constraints.push({ whiteBalanceMode: 'continuous' } as MediaTrackConstraintSet);
  }

  for (const constraint of constraints) {
    try {
      await track.applyConstraints({ advanced: [constraint] });
    } catch {
      // The feature is optional and varies by device/browser.
    }
  }

  return capabilities;
}

export function useCameraScanner({ onResult, autoStart = false }: UseCameraScannerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const decodingRef = useRef(false);
  const nextScanAtRef = useRef(0);
  const sessionRef = useRef(0);
  const onResultRef = useRef(onResult);

  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<CameraOption[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    decodingRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    trackRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const start = useCallback(
    async (requestedDeviceId?: string) => {
      const session = sessionRef.current + 1;
      sessionRef.current = session;

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      decodingRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      trackRef.current = null;
      setError(null);
      setStatus('starting');

      if (typeof window !== 'undefined' && !window.isSecureContext) {
        setStatus('error');
        setError(
          'Camera access requires a secure connection. Open the app over HTTPS or localhost, or use a USB scanner.',
        );
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setError(
          'This browser does not support camera access. Use a USB scanner or enter the barcode manually.',
        );
        return;
      }
      const video = videoRef.current;
      if (!video) {
        setStatus('error');
        setError('The camera preview is not ready. Please try again.');
        return;
      }

      // Warm the decoder while the permission prompt is open.
      const decoderReady = ensureDecoderReady();

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: requestedDeviceId
          ? {
              deviceId: { exact: requestedDeviceId },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 },
            }
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 },
            },
      };

      let stream: MediaStream | null = null;
      const permissionTimeout = window.setTimeout(() => {
        if (session !== sessionRef.current) return;
        sessionRef.current += 1;
        stream?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setStatus('error');
        setError(
          'Camera access was not granted. Allow camera access in your browser, then try again — or use a USB scanner or manual entry.',
        );
      }, PERMISSION_TIMEOUT_MS);

      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        window.clearTimeout(permissionTimeout);
        if (session !== sessionRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const track = stream.getVideoTracks()[0] ?? null;
        trackRef.current = track;
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          // Autoplay can be briefly rejected; the stream still renders once ready.
        }

        try {
          await decoderReady;
        } catch {
          if (session !== sessionRef.current) return;
          stream.getTracks().forEach((videoTrack) => videoTrack.stop());
          streamRef.current = null;
          trackRef.current = null;
          video.srcObject = null;
          setStatus('error');
          setError(
            'The barcode recognition engine could not load. Reload the app and try again, or use a USB scanner.',
          );
          return;
        }
        if (session !== sessionRef.current) return;

        setStatus('active');

        if (track) {
          const actualDeviceId = track.getSettings().deviceId;
          if (actualDeviceId) setActiveDeviceId(actualDeviceId);

          const enhancement = applyCameraEnhancements(track);
          setTorchSupported(Boolean(readCapabilities(track)?.torch));
          void enhancement.then((capabilities) => {
            if (session !== sessionRef.current) return;
            setTorchSupported(Boolean(capabilities?.torch));
          });

          track.addEventListener('ended', () => {
            if (session !== sessionRef.current) return;
            setStatus('error');
            setError('The camera stream ended. Start the camera again to continue scanning.');
            setTorchOn(false);
            setTorchSupported(false);
          });
        }

        try {
          const inputs = await navigator.mediaDevices.enumerateDevices();
          if (session !== sessionRef.current) return;
          setDevices(
            inputs
              .filter((device) => device.kind === 'videoinput')
              .map((device, index) => ({
                deviceId: device.deviceId,
                label: device.label || `Camera ${index + 1}`,
              })),
          );
        } catch {
          // Device enumeration is a nice-to-have; scanning still works.
        }

        const decodeFrame = async () => {
          if (session !== sessionRef.current) return;
          const currentVideo = videoRef.current;

          if (
            currentVideo &&
            currentVideo.readyState >= 2 &&
            Date.now() >= nextScanAtRef.current &&
            !decodingRef.current
          ) {
            const width = currentVideo.videoWidth;
            const height = currentVideo.videoHeight;
            if (width > 0 && height > 0) {
              decodingRef.current = true;
              try {
                const canvas = canvasRef.current ?? document.createElement('canvas');
                canvasRef.current = canvas;
                const scale = Math.min(1, MAX_DECODE_WIDTH / width);
                const canvasWidth = Math.max(1, Math.round(width * scale));
                const canvasHeight = Math.max(1, Math.round(height * scale));
                if (canvas.width !== canvasWidth) canvas.width = canvasWidth;
                if (canvas.height !== canvasHeight) canvas.height = canvasHeight;

                const context = canvas.getContext('2d', { willReadFrequently: true });
                if (context) {
                  context.drawImage(currentVideo, 0, 0, canvasWidth, canvasHeight);
                  const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
                  const results = await readBarcodes(imageData, READER_OPTIONS);
                  if (session !== sessionRef.current) return;

                  const decoded =
                    results.find((result) => result.isValid && result.text.trim()) ??
                    results.find((result) => result.text.trim());
                  if (decoded?.text) {
                    const reading = interpretBarcode(decoded.text, decoded.format, decoded.extra);
                    if (reading.value) {
                      nextScanAtRef.current = Date.now() + SUCCESS_INTERVAL_MS;
                      onResultRef.current(reading);
                    }
                  }
                }
              } catch (decodeError) {
                // A frame that cannot be decoded is normal; keep scanning.
                console.warn('Camera frame decode failed', decodeError);
              } finally {
                decodingRef.current = false;
              }
            }
          }

          if (session === sessionRef.current) {
            timerRef.current = window.setTimeout(decodeFrame, DECODE_INTERVAL_MS);
          }
        };

        void decodeFrame();
      } catch (startError) {
        window.clearTimeout(permissionTimeout);
        if (session !== sessionRef.current) {
          stream?.getTracks().forEach((track) => track.stop());
          return;
        }
        stream?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        trackRef.current = null;
        video.srcObject = null;
        setStatus('error');
        setError(friendlyCameraError(startError));
      }
    },
    [],
  );

  const selectDevice = useCallback(
    async (deviceId: string) => {
      setActiveDeviceId(deviceId);
      await start(deviceId);
    },
    [start],
  );

  const toggleTorch = useCallback(async () => {
    const track = trackRef.current;
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }, [torchOn]);

  useEffect(() => {
    if (!autoStart) return;
    const timer = window.setTimeout(() => {
      void start();
    }, 200);
    return () => {
      window.clearTimeout(timer);
      stop();
    };
  }, [autoStart, start, stop]);

  return {
    videoRef,
    status,
    error,
    devices,
    activeDeviceId,
    torchSupported,
    torchOn,
    start,
    stop,
    selectDevice,
    toggleTorch,
  };
}
