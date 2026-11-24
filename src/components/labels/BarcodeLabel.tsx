import { Download } from 'lucide-react';
import { createPortal } from 'react-dom';
import { formatPrice } from '../../lib/utils';
import type { CurrencyCode, LabelSize, Product } from '../../types';
import { BarcodeSVG } from '../ui/BarcodeSVG';

export function LabelPreviewCard({
  product,
  storeName,
  currency,
  size,
  onDownload,
}: {
  product: Product;
  storeName: string;
  currency: CurrencyCode;
  size: LabelSize;
  onDownload?: (product: Product) => void;
}) {
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-md border border-[#D7DEE8] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${
        size === 'large' ? 'aspect-[86/50]' : 'aspect-[54/32]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[6.5px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
            {storeName}
          </p>
          <p
            className="mt-0.5 overflow-hidden text-[11px] font-semibold leading-[1.25] text-[#172033]"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {product.name}
          </p>
        </div>
        <p className="shrink-0 whitespace-nowrap text-[12px] font-bold leading-[1.2] tracking-[-0.01em] text-[#172554] tabular">
          {formatPrice(product.price, currency)}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 items-center py-1.5">
        <BarcodeSVG
          value={product.barcode}
          width={1.3}
          height={size === 'large' ? 42 : 34}
          fontSize={10}
          className="w-full"
        />
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#F1F5F9] pt-1.5">
        <span className="truncate text-[7px] font-medium uppercase tracking-[0.06em] text-[#64748B]">
          SKU {product.sku || '—'}
        </span>
        {onDownload ? (
          <button
            type="button"
            onClick={() => onDownload(product)}
            aria-label={`Download label for ${product.name}`}
            title="Download label PNG"
            className="flex h-6 w-6 items-center justify-center rounded border border-line bg-white text-[#64748B] opacity-100 transition-all hover:border-[#CBD5E1] hover:text-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Download size={11} aria-hidden="true" />
          </button>
        ) : (
          <span className="text-[6.5px] uppercase tracking-[0.1em] text-[#CBD5E1]">CODE128</span>
        )}
      </div>
    </div>
  );
}

export function PrintLabelCard({
  product,
  storeName,
  currency,
  size,
}: {
  product: Product;
  storeName: string;
  currency: CurrencyCode;
  size: LabelSize;
}) {
  const large = size === 'large';
  return (
    <div
      className="label-print text-[#172033]"
      style={{
        width: large ? '86mm' : '54mm',
        height: large ? '50mm' : '32mm',
        padding: large ? '4mm' : '3mm',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={
              large
                ? 'text-[5pt] font-semibold uppercase tracking-[0.12em] text-[#64748B]'
                : 'text-[4pt] font-semibold uppercase tracking-[0.12em] text-[#64748B]'
            }
          >
            {storeName}
          </p>
          <p
            className={
              large
                ? 'mt-[1mm] overflow-hidden text-[9.5pt] font-semibold leading-[1.22] text-[#172033]'
                : 'mt-[0.6mm] overflow-hidden text-[7pt] font-semibold leading-[1.22] text-[#172033]'
            }
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {product.name}
          </p>
        </div>
        <p
          className={
            large
              ? 'shrink-0 whitespace-nowrap text-[14pt] font-bold leading-none tracking-[-0.01em] text-[#172554]'
              : 'shrink-0 whitespace-nowrap text-[10.5pt] font-bold leading-none tracking-[-0.01em] text-[#172554]'
          }
        >
          {formatPrice(product.price, currency)}
        </p>
      </div>

      <div className="mt-[1mm] flex min-h-0 flex-1 items-center">
        <BarcodeSVG
          value={product.barcode}
          width={2}
          height={large ? 52 : 40}
          fontSize={large ? 14 : 11}
          className="w-full"
        />
      </div>

      <div
        className={
          large
            ? 'mt-[1mm] flex items-end justify-between gap-2 border-t border-[#E5EAF1] pt-[1mm] text-[6pt] font-medium uppercase tracking-[0.05em] text-[#64748B]'
            : 'mt-[0.8mm] flex items-end justify-between gap-2 border-t border-[#E5EAF1] pt-[0.8mm] text-[5pt] font-medium uppercase tracking-[0.05em] text-[#64748B]'
        }
      >
        <span className="truncate">SKU {product.sku || '—'}</span>
        <span className="truncate">CODE128</span>
      </div>
    </div>
  );
}

export function LabelPrintSheet({
  labels,
  storeName,
  currency,
  size,
}: {
  labels: Product[];
  storeName: string;
  currency: CurrencyCode;
  size: LabelSize;
}) {
  if (labels.length === 0) return null;
  const columns = size === 'large' ? 2 : 3;

  return createPortal(
    <div className="print-sheet" data-size={size}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, ${size === 'large' ? '86mm' : '54mm'})`,
          columnGap: '4mm',
          rowGap: '4mm',
          alignItems: 'start',
        }}
      >
        {labels.map((product, index) => (
          <PrintLabelCard
            key={`${product.id ?? product.barcode}-${index}`}
            product={product}
            storeName={storeName}
            currency={currency}
            size={size}
          />
        ))}
      </div>
    </div>,
    document.body,
  );
}
