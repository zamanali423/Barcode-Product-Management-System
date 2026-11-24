import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Copy,
  PackageSearch,
  Plus,
  ScanBarcode,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';
import { useSettings } from '../../hooks/useDatabaseData';
import { UNKNOWN_BARCODE_FORMAT } from '../../lib/barcodeFormats';
import { formatPrice, formatTime, copyText } from '../../lib/utils';
import type { Product, ScanSource } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

export interface ScanResult {
  barcode: string;
  product: Product | null;
  source: ScanSource;
  at: Date;
  /** Detected or validated symbology, or "Unknown Format". */
  format?: string;
  /** Explains an invalid check digit when format inference rejected a value. */
  formatNote?: string;
  /** Set when decoding succeeded but the local catalogue query failed. */
  lookupError?: string;
}

const sourceLabels: Record<ScanSource, string> = {
  camera: 'Camera',
  usb: 'USB scanner',
  manual: 'Manual entry',
};

const steps = ['Scan code', 'Instant match', 'View price'];

export function ScanResultPanel({
  result,
  duplicateNotice,
  onScanNext,
  onAddProduct,
  onViewProduct,
}: {
  result: ScanResult | null;
  duplicateNotice: boolean;
  onScanNext: () => void;
  onAddProduct: (barcode: string) => void;
  onViewProduct: (product: Product) => void;
}) {
  const settings = useSettings();
  const toast = useToast();

  const handleCopy = async () => {
    if (!result) return;
    const copied = await copyText(result.barcode);
    if (copied) toast.success('Barcode copied');
    else toast.error('Could not copy the barcode');
  };

  const unknownFormat = result?.format ?? UNKNOWN_BARCODE_FORMAT;
  const announcement = result
    ? result.product
      ? `Product found. ${result.product.name}. Price ${formatPrice(result.product.price, settings.currency)}.`
      : result.lookupError
        ? `Barcode ${result.barcode} was read, but the local catalogue lookup failed. Format ${unknownFormat}.`
        : `Unknown barcode detected: ${result.barcode}. Not registered. Format ${unknownFormat}.`
    : 'Scanner ready.';

  const statusBadge = result ? (
    result.product ? (
      <Badge variant="success" dot>
        Product found
      </Badge>
    ) : result.lookupError ? (
      <Badge variant="danger" dot>
        Lookup failed
      </Badge>
    ) : (
      <Badge variant="warning" dot>
        Not registered
      </Badge>
    )
  ) : (
    <Badge variant="neutral" dot>
      Waiting
    </Badge>
  );

  return (
    <div className="card flex min-h-[430px] flex-col overflow-hidden">
      <div className="flex h-[52px] shrink-0 items-center justify-between gap-2 border-b border-line px-4 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#F4F7FB] text-[#475569]">
            <ScanBarcode size={14} aria-hidden="true" />
          </span>
          <h2 className="text-[13.5px] font-semibold text-ink">Scan result</h2>
        </div>
        <div className="flex items-center gap-2">
          {duplicateNotice ? (
            <span className="hidden items-center gap-1 text-[10px] font-medium text-warning sm:inline-flex">
              <CircleAlert size={11} aria-hidden="true" />
              Duplicate ignored
            </span>
          ) : null}
          {statusBadge}
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {!result ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-[#F8FAFD]">
            <ScanBarcode size={27} className="text-brand-700" aria-hidden="true" />
            <span
              className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#4ADE80] ring-2 ring-white"
              aria-hidden="true"
            />
          </div>
          <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.01em] text-ink">
            Ready to scan
          </h3>
          <p className="mt-1.5 max-w-[330px] text-[12px] leading-5 text-muted">
            Use your camera, a USB barcode scanner, or type a barcode manually. The matching
            product and its price appear here instantly.
          </p>
          <div className="mt-6 grid w-full max-w-[340px] grid-cols-3 gap-2">
            {steps.map((step, index) => (
              <div
                key={step}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-[#EDF1F6] bg-[#FBFCFE] px-2 py-2.5"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line bg-white text-[9px] font-semibold tabular text-muted">
                  {index + 1}
                </span>
                <span className="text-[9.5px] font-medium text-[#64748B]">{step}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 flex items-center gap-1.5 text-[10px] text-subtle">
            <ShieldCheck size={12} aria-hidden="true" />
            Local lookup · no internet required
          </p>
        </div>
      ) : result.product ? (
        <div className="flex flex-1 flex-col px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand">{result.product.category || 'Uncategorised'}</Badge>
            {result.format && result.format !== UNKNOWN_BARCODE_FORMAT ? (
              <Badge variant="outline">{result.format}</Badge>
            ) : null}
            <span className="text-[10.5px] text-muted">
              SKU{' '}
              <span className="font-mono text-[10.5px] text-[#475569]">
                {result.product.sku || '—'}
              </span>
            </span>
            <span className="ml-auto text-[10px] text-subtle">
              {sourceLabels[result.source]} · {formatTime(result.at)}
            </span>
          </div>

          <h3 className="mt-2.5 text-[20px] font-semibold leading-[1.25] tracking-[-0.02em] text-ink sm:text-[22px]">
            {result.product.name}
          </h3>
          {result.product.description ? (
            <p className="mt-1.5 line-clamp-3 text-[12px] leading-5 text-muted">
              {result.product.description}
            </p>
          ) : null}

          <div className="relative mt-4 overflow-hidden rounded-xl border border-[#11264D] bg-gradient-to-br from-[#10234B] to-[#0A1733] px-4 py-4 text-white sm:px-5 sm:py-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-brand-500/20 blur-3xl"
            />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#93A9CD]">
                  Unit price
                </p>
                <p className="mt-1.5 break-words text-[32px] font-semibold leading-none tracking-[-0.035em] text-white tabular sm:text-[38px]">
                  {formatPrice(result.product.price, settings.currency)}
                </p>
              </div>
              <span className="mt-0.5 shrink-0 rounded-md border border-white/15 bg-white/[0.07] px-2 py-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#C5D5EE]">
                {settings.currency}
              </span>
            </div>
            <div className="relative mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-white/10 pt-3">
              <span className="text-[10px] text-[#93A9CD]">
                Barcode{' '}
                <span className="ml-1 font-mono tracking-[0.04em] text-[#D7E3F5]">
                  {result.product.barcode}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#93A9CD]">
                <CheckCircle2 size={11} className="text-[#4ADE80]" aria-hidden="true" />
                Matched locally
              </span>
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
            <Button iconLeft={<ScanLine size={14} />} onClick={onScanNext}>
              Scan next
            </Button>
            <Button
              variant="ghost"
              iconRight={<ArrowRight size={13} />}
              onClick={() => onViewProduct(result.product!)}
            >
              Open in products
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col px-4 py-5 text-center sm:px-5">
          <div
            className={`mx-auto mt-2 flex h-12 w-12 items-center justify-center rounded-full ${
              result.lookupError ? 'bg-[#FEF2F2] text-danger' : 'bg-[#FFFBEB] text-warning'
            }`}
          >
            {result.lookupError ? (
              <CircleAlert size={22} aria-hidden="true" />
            ) : (
              <PackageSearch size={22} aria-hidden="true" />
            )}
          </div>
          <h3 className="mt-3.5 text-[18px] font-semibold tracking-[-0.01em] text-ink">
            {result.lookupError ? 'Barcode read successfully' : 'Unknown barcode detected'}
          </h3>
          <p className="mx-auto mt-1 max-w-[350px] text-[12px] leading-5 text-muted">
            {result.lookupError
              ? 'The code was decoded, but the local catalogue could not be queried. The scanned value is preserved below.'
              : 'The code was read successfully, but no product in this local catalogue is registered with it.'}
          </p>
          <p className="mt-1.5 text-[10px] text-subtle">
            {sourceLabels[result.source]} · {formatTime(result.at)}
          </p>

          <div className="mx-auto mt-4 w-full max-w-[360px] rounded-lg border border-line bg-[#FAFBFD] p-3.5 text-left">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-subtle">
              Barcode value
            </p>
            <div className="mt-1 flex items-start justify-between gap-2">
              <p className="max-h-[84px] min-w-0 overflow-y-auto whitespace-pre-wrap break-all font-mono text-[13px] font-medium leading-5 tracking-[0.03em] text-ink">
                {result.barcode}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy scanned barcode"
                title="Copy barcode"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line bg-white text-muted transition-colors hover:text-ink"
              >
                <Copy size={11.5} />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
              <div>
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-subtle">
                  Product status
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[11.5px] font-medium text-ink">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      result.lookupError ? 'bg-danger' : 'bg-warning'
                    }`}
                    aria-hidden="true"
                  />
                  {result.lookupError ? 'Lookup unavailable' : 'Not registered'}
                </p>
              </div>
              <div>
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-subtle">
                  Barcode format
                </p>
                <p className="mt-1 truncate text-[11.5px] font-medium text-ink">
                  {unknownFormat}
                </p>
              </div>
            </div>

            {result.formatNote ? (
              <p className="mt-3 rounded-md bg-[#FFFBEB] px-2.5 py-2 text-[10px] leading-4 text-[#92400E]">
                {result.formatNote}
              </p>
            ) : null}
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-center gap-2 pt-5">
            <Button
              variant="primary"
              iconLeft={<Plus size={14} />}
              onClick={() => onAddProduct(result.barcode)}
            >
              Add product
            </Button>
            <Button iconLeft={<ScanLine size={14} />} onClick={onScanNext}>
              Scan again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
