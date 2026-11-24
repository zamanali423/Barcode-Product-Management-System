import {
  Camera,
  CameraOff,
  History,
  Keyboard,
  Loader2,
  ScanLine,
  ShieldCheck,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanResultPanel, type ScanResult } from '../components/scanner/ScanResultPanel';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Form';
import { PageHeader, SectionHeader } from '../components/ui/PageChrome';
import { useToast } from '../components/ui/Toast';
import { getProductByBarcode, lookupAndRecordScan } from '../db/scans';
import { updateSettings } from '../db/settings';
import { useCameraScanner } from '../hooks/useCameraScanner';
import { useRecentScans, useSettings } from '../hooks/useDatabaseData';
import { useUsbScanner } from '../hooks/useUsbScanner';
import { resolveBarcodeFormat, UNKNOWN_BARCODE_FORMAT } from '../lib/barcodeFormats';
import { messageFromError } from '../lib/errors';
import { playScanFeedback } from '../lib/feedback';
import { cn, formatRelativeTime } from '../lib/utils';
import type { ScanRecord, ScanSource } from '../types';

const sourceLabels: Record<ScanSource, string> = {
  camera: 'Camera',
  usb: 'USB scanner',
  manual: 'Manual',
};

export default function ScannerPage() {
  const settings = useSettings();
  const recentScans = useRecentScans(6);
  const toast = useToast();
  const navigate = useNavigate();

  const [result, setResult] = useState<ScanResult | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const resultRef = useRef<ScanResult | null>(null);
  const lastScanRef = useRef<{ barcode: string; at: number } | null>(null);
  const duplicateTimeoutRef = useRef<number | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const resultPanelRef = useRef<HTMLDivElement>(null);

  const flagDuplicate = useCallback(() => {
    setDuplicateNotice(true);
    if (duplicateTimeoutRef.current) window.clearTimeout(duplicateTimeoutRef.current);
    duplicateTimeoutRef.current = window.setTimeout(() => setDuplicateNotice(false), 2200);
  }, []);

  const handleBarcode = useCallback(
    async (rawBarcode: string, source: ScanSource, decodedFormat?: string) => {
      const barcode = rawBarcode.trim();
      if (!barcode) return;

      // Recognition is independent of the catalogue. A camera supplies the
      // symbology; USB and manual input infer a validated retail format when
      // the value itself is conclusive.
      const resolvedFormat = resolveBarcodeFormat(barcode, decodedFormat);
      const recordingFormat =
        resolvedFormat.format === UNKNOWN_BARCODE_FORMAT ? undefined : resolvedFormat.format;

      const now = Date.now();
      const duplicateWindow = settings.duplicateWindowSeconds * 1000;
      const sameCodeVisible = resultRef.current?.barcode === barcode;
      const rapidRepeat =
        lastScanRef.current?.barcode === barcode &&
        now - lastScanRef.current.at < duplicateWindow;

      if (sameCodeVisible || rapidRepeat) {
        flagDuplicate();
        return;
      }

      lastScanRef.current = { barcode, at: now };
      setDuplicateNotice(false);

      try {
        const { product } = await lookupAndRecordScan(barcode, source, recordingFormat);
        const next: ScanResult = {
          barcode,
          product,
          source,
          at: new Date(),
          format: resolvedFormat.format,
          ...(resolvedFormat.note ? { formatNote: resolvedFormat.note } : {}),
        };
        resultRef.current = next;
        setResult(next);
        playScanFeedback(Boolean(product), settings.scannerSound);
      } catch (error) {
        // Decoding succeeded even if the local lookup did not. Keep the value
        // and format visible instead of reducing this to a failed scan.
        const lookupError = messageFromError(error);
        const next: ScanResult = {
          barcode,
          product: null,
          source,
          at: new Date(),
          format: resolvedFormat.format,
          ...(resolvedFormat.note ? { formatNote: resolvedFormat.note } : {}),
          lookupError,
        };
        resultRef.current = next;
        setResult(next);
        toast.error('Catalogue lookup failed', lookupError);
      }
    },
    [
      flagDuplicate,
      settings.duplicateWindowSeconds,
      settings.scannerSound,
      toast,
    ],
  );

  useUsbScanner({
    enabled: true,
    onScan: (barcode) => {
      void handleBarcode(barcode, 'usb');
    },
  });

  const {
    videoRef,
    status: cameraStatus,
    error: cameraError,
    devices,
    activeDeviceId,
    torchSupported,
    torchOn,
    start,
    stop,
    selectDevice,
    toggleTorch,
  } = useCameraScanner({
    autoStart: true,
    onResult: (barcode, format) => {
      void handleBarcode(barcode, 'camera', format);
    },
  });

  useEffect(() => {
    return () => {
      if (duplicateTimeoutRef.current) window.clearTimeout(duplicateTimeoutRef.current);
    };
  }, []);

  // On phones the result panel sits below the camera, so bring the matched
  // product and its price into view as soon as a scan resolves.
  useEffect(() => {
    if (!result) return;
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    resultPanelRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [result]);

  const handleScanNext = () => {
    resultRef.current = null;
    setResult(null);
    setDuplicateNotice(false);
  };

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = manualValue.trim();
    if (!value) {
      manualInputRef.current?.focus();
      return;
    }
    setManualValue('');
    manualInputRef.current?.blur();
    void handleBarcode(value, 'manual');
  };

  const handleRecentSelect = async (scan: ScanRecord) => {
    const decodedFormat =
      scan.format && scan.format !== UNKNOWN_BARCODE_FORMAT ? scan.format : undefined;
    const resolvedFormat = resolveBarcodeFormat(scan.barcode, decodedFormat);
    try {
      const product = await getProductByBarcode(scan.barcode);
      const next: ScanResult = {
        barcode: scan.barcode,
        product,
        source: scan.source,
        at: new Date(),
        format: resolvedFormat.format,
        ...(resolvedFormat.note ? { formatNote: resolvedFormat.note } : {}),
      };
      resultRef.current = next;
      setResult(next);
      setDuplicateNotice(false);
    } catch (error) {
      toast.error('Could not open that scan', messageFromError(error));
    }
  };

  const handleSoundToggle = async () => {
    const next = !settings.scannerSound;
    try {
      await updateSettings({ scannerSound: next });
      if (next) playScanFeedback(true, true);
    } catch (error) {
      toast.error('Could not update the sound preference', messageFromError(error));
    }
  };

  const cameraBadge =
    cameraStatus === 'active' ? (
      <Badge variant="success" dot>
        Live
      </Badge>
    ) : cameraStatus === 'starting' ? (
      <Badge variant="warning" dot>
        Starting
      </Badge>
    ) : cameraStatus === 'error' ? (
      <Badge variant="danger" dot>
        Unavailable
      </Badge>
    ) : (
      <Badge variant="neutral" dot>
        Camera off
      </Badge>
    );

  const cameraOptions =
    devices.length > 0
      ? devices
      : activeDeviceId
        ? [{ deviceId: activeDeviceId, label: 'Current camera' }]
        : [];

  const cameraHint =
    cameraStatus === 'active'
      ? 'Keep the barcode or QR code inside the frame'
      : cameraStatus === 'starting'
        ? 'Allow camera access if prompted'
        : cameraStatus === 'error'
          ? 'Use a USB scanner or manual entry below'
          : 'Start the camera to scan barcodes';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Barcode scanner"
        description="Scan any common 1D or 2D barcode with a camera, USB scanner, or manual entry. Registered products appear instantly; unregistered codes are still captured for registration."
        actions={
          <Button
            iconLeft={settings.scannerSound ? <Volume2 size={14} /> : <VolumeX size={14} />}
            onClick={handleSoundToggle}
            aria-pressed={settings.scannerSound}
          >
            Sound {settings.scannerSound ? 'on' : 'off'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5 lg:col-start-1 lg:row-start-1">
          <div className="card overflow-hidden">
            <SectionHeader
              title="Camera"
              description="1D, QR & 2D recognition"
              icon={<Camera size={14} />}
              action={cameraBadge}
            />
            <div className="p-3">
              <div
                className="scanner-viewfinder relative overflow-hidden rounded-lg border border-[#1B2E50] bg-[#071226]"
                style={{ aspectRatio: '4 / 3' }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  aria-label="Camera preview"
                  className={cn(
                    'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
                    cameraStatus === 'active' ? 'opacity-100' : 'opacity-0',
                  )}
                />

                {cameraStatus === 'active' ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute left-[8%] top-[14%] h-5 w-5 rounded-tl border-l-2 border-t-2 border-white/70"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute right-[8%] top-[14%] h-5 w-5 rounded-tr border-r-2 border-t-2 border-white/70"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute bottom-[14%] left-[8%] h-5 w-5 rounded-bl border-b-2 border-l-2 border-white/70"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute bottom-[14%] right-[8%] h-5 w-5 rounded-br border-b-2 border-r-2 border-white/70"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-[9%] top-1/2 h-px scan-sweep rounded-full bg-[#67A8FF] shadow-[0_0_14px_2px_rgba(96,150,247,0.5)]"
                    />
                    <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-black/40 px-2 py-1 text-[9.5px] font-medium text-white/90 backdrop-blur-sm">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4ADE80]" />
                      Scanning
                    </div>
                    {torchSupported ? (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        aria-label={torchOn ? 'Turn torch off' : 'Turn torch on'}
                        aria-pressed={torchOn}
                        title={torchOn ? 'Turn torch off' : 'Turn torch on'}
                        className={cn(
                          'absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md border backdrop-blur-sm transition-colors',
                          torchOn
                            ? 'border-white/60 bg-white text-brand-900'
                            : 'border-white/20 bg-black/40 text-white/90 hover:bg-black/60',
                        )}
                      >
                        <Zap size={13} fill={torchOn ? 'currentColor' : 'none'} />
                      </button>
                    ) : null}
                    <p className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-md bg-black/40 px-2.5 py-1 text-[9.5px] text-white/80 backdrop-blur-sm">
                      Align the code within the frame
                    </p>
                  </>
                ) : cameraStatus === 'starting' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                    <Loader2 size={22} className="animate-spin text-[#7FB0FF]" aria-hidden="true" />
                    <p className="mt-3 text-[12.5px] font-medium text-white">Starting camera…</p>
                    <p className="mt-1 max-w-[230px] text-[10.5px] leading-4 text-[#8096B8]">
                      Allow camera access if your browser asks for permission.
                    </p>
                  </div>
                ) : cameraStatus === 'error' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-7 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F87171]/10 text-[#FCA5A5]">
                      <CameraOff size={20} aria-hidden="true" />
                    </span>
                    <p className="mt-3 text-[12.5px] font-medium text-white">Camera unavailable</p>
                    <p className="mt-1 line-clamp-4 max-w-[280px] text-[10.5px] leading-[16px] text-[#8FA4C4]">
                      {cameraError}
                    </p>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-[#9EB6DC]">
                      <CameraOff size={20} aria-hidden="true" />
                    </span>
                    <p className="mt-3 text-[12.5px] font-medium text-white">Camera is off</p>
                    <p className="mt-1 max-w-[230px] text-[10.5px] leading-4 text-[#8096B8]">
                      Start the camera to scan barcodes or QR codes. USB scanners keep working.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-line px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10.5px] leading-4 text-subtle">{cameraHint}</p>
                {cameraStatus === 'active' ? (
                  <Button
                    size="sm"
                    iconLeft={<CameraOff size={13} />}
                    onClick={stop}
                    className="shrink-0"
                  >
                    Stop
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    iconLeft={<Camera size={13} />}
                    onClick={() => void start(activeDeviceId || undefined)}
                    loading={cameraStatus === 'starting'}
                    className="shrink-0"
                  >
                    {cameraStatus === 'error' ? 'Try again' : 'Start camera'}
                  </Button>
                )}
              </div>
              {cameraStatus === 'active' && cameraOptions.length > 1 ? (
                <div className="mt-2.5 flex items-center gap-2">
                  <Camera size={12.5} className="shrink-0 text-subtle" aria-hidden="true" />
                  <Select
                    aria-label="Camera source"
                    value={activeDeviceId}
                    onChange={(event) => void selectDevice(event.target.value)}
                    className="h-8 rounded-md text-[11px]"
                  >
                    {cameraOptions.map((device, index) => (
                      <option key={device.deviceId || index} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
              <p className="mt-2 flex items-center gap-1.5 text-[9.5px] text-subtle/90">
                <ShieldCheck size={11} aria-hidden="true" />
                Camera frames are processed on this device only.
              </p>
            </div>
          </div>
        </div>

        <div
          ref={resultPanelRef}
          className="scroll-mt-20 lg:col-span-7 lg:col-start-6 lg:row-start-1"
        >
          <ScanResultPanel
            result={result}
            duplicateNotice={duplicateNotice}
            onScanNext={handleScanNext}
            onAddProduct={(barcode) =>
              navigate(`/products/new?barcode=${encodeURIComponent(barcode)}`)
            }
            onViewProduct={(product) =>
              navigate(`/products?q=${encodeURIComponent(product.barcode)}`)
            }
          />
        </div>

        <div className="lg:col-span-5 lg:col-start-1 lg:row-start-2">
          <div className="card overflow-hidden">
            <SectionHeader
              title="USB & manual entry"
              description="Alternative scanning methods"
              icon={<Keyboard size={14} />}
              action={
                <Badge variant="success" dot>
                  USB listening
                </Badge>
              }
            />
            <div className="space-y-4 p-4">
              <div className="flex gap-3 rounded-lg border border-[#E8EEF6] bg-[#F8FAFD] px-3.5 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-white text-[#475569]">
                  <Keyboard size={14} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[12px] font-medium text-ink">USB barcode scanner ready</p>
                  <p className="mt-0.5 text-[10.5px] leading-4 text-muted">
                    Scan at any time while this page is open. Codes ending with Enter are detected
                    automatically.
                  </p>
                </div>
              </div>

              <div>
                <form onSubmit={handleManualSubmit}>
                  <label
                    htmlFor="manual-barcode"
                    className="text-[12px] font-medium text-ink"
                  >
                    Manual barcode entry
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <ScanLine
                        size={14}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
                        aria-hidden="true"
                      />
                      <input
                        ref={manualInputRef}
                        id="manual-barcode"
                        value={manualValue}
                        onChange={(event) => setManualValue(event.target.value)}
                        placeholder="Enter a barcode or QR value"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={2048}
                        className="input-base h-9 pl-9 font-mono text-[12.5px] tracking-[0.04em] placeholder:font-sans placeholder:tracking-normal"
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="primary"
                      className="shrink-0"
                      disabled={!manualValue.trim()}
                    >
                      Look up
                    </Button>
                  </div>
                  <p className="mt-1.5 text-[10.5px] leading-4 text-subtle">
                    Lookup is immediate. Repeated reads of the same code are ignored until you start
                    the next scan.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 lg:col-start-6 lg:row-start-2">
          <div className="card overflow-hidden">
            <SectionHeader
              title="Recent scans"
              description="Latest lookups stored on this device"
              icon={<History size={14} />}
            />
            {recentScans.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-9 text-center">
                <p className="text-[12px] text-muted">No scans yet.</p>
                <p className="mt-1 text-[10.5px] text-subtle">
                  Your latest barcode lookups will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#F0F3F8]">
                {recentScans.map((scan) => (
                  <li key={scan.id}>
                    <button
                      type="button"
                      onClick={() => void handleRecentSelect(scan)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#FAFCFE]"
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                          scan.found
                            ? 'bg-[#F0FDF4] text-success'
                            : 'bg-[#FEF2F2] text-danger',
                        )}
                      >
                        {scan.source === 'camera' ? (
                          <Camera size={13} aria-hidden="true" />
                        ) : scan.source === 'usb' ? (
                          <Keyboard size={13} aria-hidden="true" />
                        ) : (
                          <ScanLine size={13} aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[12px] font-medium text-ink">
                            {scan.productName || 'Unknown barcode'}
                          </span>
                          <span className="shrink-0 text-[9.5px] text-subtle">
                            {formatRelativeTime(scan.createdAt)}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted">
                          <span className="truncate font-mono tracking-[0.03em]">{scan.barcode}</span>
                          <span className="text-[#D3DCE8]">·</span>
                          <span>
                            {sourceLabels[scan.source]}
                            {scan.format ? ` · ${scan.format}` : ''}
                          </span>
                        </span>
                      </span>
                      <Badge variant={scan.found ? 'success' : 'warning'}>
                        {scan.found ? 'Matched' : 'Unknown'}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
