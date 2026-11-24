import { Copy, Pencil, Printer, Trash2 } from 'lucide-react';
import { useSettings } from '../../hooks/useDatabaseData';
import { copyText, formatDateTime, formatPrice } from '../../lib/utils';
import type { Product } from '../../types';
import { BarcodeSVG } from '../ui/BarcodeSVG';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { useToast } from '../ui/Toast';

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-subtle">{label}</dt>
      <dd className="mt-1 truncate text-[12.5px] font-medium text-ink">{value || '—'}</dd>
    </div>
  );
}

export function ProductDetailsDialog({
  product,
  onClose,
  onEdit,
  onDelete,
  onPrint,
}: {
  product: Product | null;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onPrint: (product: Product) => void;
}) {
  const { currency } = useSettings();
  const toast = useToast();

  if (!product) return null;

  const handleCopy = async () => {
    const copied = await copyText(product.barcode);
    if (copied) toast.success('Barcode copied');
    else toast.error('Could not copy the barcode');
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Product details"
      description="A complete record from your local catalogue."
      size="lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button
            variant="danger-ghost"
            iconLeft={<Trash2 size={14} />}
            onClick={() => onDelete(product)}
          >
            Delete
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button iconLeft={<Printer size={14} />} onClick={() => onPrint(product)}>
              Print label
            </Button>
            <Button
              variant="primary"
              iconLeft={<Pencil size={14} />}
              onClick={() => onEdit(product)}
            >
              Edit product
            </Button>
          </div>
        </div>
      }
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">{product.category || 'Uncategorised'}</Badge>
          <span className="text-[11px] text-muted">
            SKU <span className="font-mono text-[11px] text-slate-600">{product.sku || '—'}</span>
          </span>
        </div>
        <h3 className="mt-2.5 text-[20px] font-semibold leading-6 tracking-[-0.02em] text-ink">
          {product.name}
        </h3>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-[#E2EAF6] bg-[#F4F8FD] px-4 py-3.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#64748B]">
              Selling price
            </p>
            <p className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.02em] text-brand-950 tabular">
              {formatPrice(product.price, currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.08em] text-subtle">Currency</p>
            <p className="mt-1 text-[11.5px] font-medium text-ink">{currency}</p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 sm:grid-cols-4">
          <DetailItem label="SKU" value={product.sku || '—'} />
          <DetailItem label="Category" value={product.category || 'Uncategorised'} />
          <DetailItem label="Date added" value={formatDateTime(product.createdAt)} />
          <DetailItem label="Last updated" value={formatDateTime(product.updatedAt)} />
        </dl>

        <div className="mt-5 border-t border-line pt-5">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-subtle">
            Description
          </p>
          <p className="mt-1.5 whitespace-pre-line text-[12.5px] leading-5 text-[#475569]">
            {product.description || 'No description provided.'}
          </p>
        </div>

        <div className="mt-5 rounded-lg border border-line bg-[#FAFBFD] p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-subtle">
                Barcode
              </span>
              <Badge variant="outline">CODE128</Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<Copy size={12.5} />}
              onClick={handleCopy}
            >
              Copy
            </Button>
          </div>
          <div className="mt-2 rounded-md border border-line bg-white px-4 py-3">
            <BarcodeSVG value={product.barcode} height={46} width={1.8} fontSize={12} />
          </div>
          <p className="mt-2 text-center font-mono text-[11.5px] tracking-[0.08em] text-slate-600">
            {product.barcode}
          </p>
        </div>
      </div>
    </Dialog>
  );
}
