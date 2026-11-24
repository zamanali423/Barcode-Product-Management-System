import {
  Info,
  Minus,
  Package,
  PackageOpen,
  Plus,
  Printer,
  Search,
  Tag,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LabelPreviewCard, LabelPrintSheet } from '../components/labels/BarcodeLabel';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Checkbox, Select } from '../components/ui/Form';
import { EmptyState, PageHeader, SectionHeader } from '../components/ui/PageChrome';
import { useToast } from '../components/ui/Toast';
import { useProducts, useSettings } from '../hooks/useDatabaseData';
import { messageFromError } from '../lib/errors';
import { downloadBarcodeLabel } from '../lib/labelCanvas';
import { filterProducts } from '../lib/productSearch';
import { cn, formatPrice, pluralize } from '../lib/utils';
import type { LabelSize, Product } from '../types';

const MAX_LABELS = 250;
const MAX_QUANTITY = 50;

function QuantityStepper({
  value,
  onChange,
  productName,
}: {
  value: number;
  onChange: (value: number) => void;
  productName: string;
}) {
  return (
    <div className="flex h-6 items-center gap-0.5 rounded-[6px] border border-line bg-white px-0.5">
      <button
        type="button"
        aria-label={`Decrease label quantity for ${productName}`}
        disabled={value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
        className="flex h-5 w-5 items-center justify-center rounded text-muted transition-colors hover:bg-[#F1F5F9] hover:text-ink disabled:pointer-events-none disabled:opacity-30"
      >
        <Minus size={10.5} />
      </button>
      <span className="w-5 text-center text-[10.5px] font-medium tabular text-ink">{value}</span>
      <button
        type="button"
        aria-label={`Increase label quantity for ${productName}`}
        disabled={value >= MAX_QUANTITY}
        onClick={() => onChange(Math.min(MAX_QUANTITY, value + 1))}
        className="flex h-5 w-5 items-center justify-center rounded text-muted transition-colors hover:bg-[#F1F5F9] hover:text-ink disabled:pointer-events-none disabled:opacity-30"
      >
        <Plus size={10.5} />
      </button>
    </div>
  );
}

export default function LabelsPage() {
  const products = useProducts();
  const settings = useSettings();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [labelSize, setLabelSize] = useState<LabelSize>(settings.defaultLabelSize);
  const [printing, setPrinting] = useState(false);
  const preselectHandled = useRef(false);
  const sizeTouched = useRef(false);

  useEffect(() => {
    if (!sizeTouched.current) setLabelSize(settings.defaultLabelSize);
  }, [settings.defaultLabelSize]);

  useEffect(() => {
    if (preselectHandled.current || products.length === 0) return;
    preselectHandled.current = true;
    const productParam = searchParams.get('product');
    if (!productParam) return;
    const productId = Number(productParam);
    if (products.some((product) => product.id === productId)) {
      setSelected({ [productId]: 1 });
    }
  }, [products, searchParams]);

  const filtered = useMemo(() => filterProducts(products, search), [products, search]);
  const selectedProducts = useMemo(
    () =>
      products.filter(
        (product) => product.id !== undefined && selected[product.id] !== undefined,
      ),
    [products, selected],
  );
  const selectedCount = selectedProducts.length;
  const totalLabels = useMemo(
    () =>
      selectedProducts.reduce(
        (total, product) => total + (product.id !== undefined ? selected[product.id] ?? 1 : 0),
        0,
      ),
    [selectedProducts, selected],
  );
  const allVisibleSelected =
    filtered.length > 0 &&
    filtered.every((product) => product.id !== undefined && selected[product.id] !== undefined);

  const labelsToPrint = useMemo(
    () =>
      selectedProducts.flatMap((product) => {
        const copies = product.id !== undefined ? selected[product.id] ?? 1 : 1;
        return Array.from({ length: copies }, () => product);
      }),
    [selectedProducts, selected],
  );

  const toggleProduct = (product: Product) => {
    if (product.id === undefined) return;
    setSelected((previous) => {
      const next = { ...previous };
      if (next[product.id!] !== undefined) delete next[product.id!];
      else next[product.id!] = 1;
      return next;
    });
  };

  const setQuantity = (productId: number, quantity: number) => {
    setSelected((previous) => ({ ...previous, [productId]: quantity }));
  };

  const toggleAllVisible = () => {
    setSelected((previous) => {
      const next = { ...previous };
      if (allVisibleSelected) {
        for (const product of filtered) {
          if (product.id !== undefined) delete next[product.id];
        }
      } else {
        for (const product of filtered) {
          if (product.id !== undefined && next[product.id] === undefined) next[product.id] = 1;
        }
      }
      return next;
    });
  };

  const selectAll = () => {
    const next: Record<number, number> = {};
    for (const product of products) {
      if (product.id !== undefined) next[product.id] = 1;
    }
    setSelected(next);
  };

  const handlePrint = async () => {
    if (labelsToPrint.length === 0) return;
    if (labelsToPrint.length > MAX_LABELS) {
      toast.error(
        'Too many labels to print',
        `Reduce the selection to ${MAX_LABELS} labels or fewer, then try again.`,
      );
      return;
    }
    setPrinting(true);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      window.print();
    } finally {
      setPrinting(false);
    }
  };

  const handleDownload = async (product: Product) => {
    try {
      await downloadBarcodeLabel(product, {
        storeName: settings.storeName,
        currency: settings.currency,
        size: labelSize,
      });
      toast.success('Label downloaded', `${product.name} · PNG`);
    } catch (error) {
      toast.error('Could not create the label image', messageFromError(error));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Barcode labels"
        description="Select products, set label quantities, then print or download scannable CODE128 labels."
      />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(350px,5fr)_minmax(0,7fr)]">
        <div className="card overflow-hidden xl:sticky xl:top-[84px]">
          <SectionHeader
            title="Select products"
            description="Choose products and copies to include"
            icon={<Package size={14} />}
            action={
              selectedCount > 0 ? (
                <Badge variant="brand">{pluralize(selectedCount, 'product selected', 'products selected')}</Badge>
              ) : null
            }
          />

          {products.length === 0 ? (
            <EmptyState
              icon={<PackageOpen />}
              title="No products to label"
              description="Add a product first, then come back to preview and print its barcode labels."
              action={
                <Button variant="primary" size="sm" onClick={() => navigate('/products/new')}>
                  Add product
                </Button>
              }
            />
          ) : (
            <>
              <div className="border-b border-line px-4 py-3">
                <div className="relative">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search products…"
                    aria-label="Search products for labels"
                    className="h-9 w-full rounded-lg border border-line bg-[#FAFBFD] pl-9 pr-9 text-[12.5px] text-ink outline-none transition-colors placeholder:text-subtle/80 focus:border-brand-500 focus:bg-white focus:ring-[3px] focus:ring-brand-500/15 [&::-webkit-search-cancel-button]:hidden"
                  />
                  {search ? (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      aria-label="Clear product search"
                      className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-subtle transition-colors hover:bg-[#F1F5F9] hover:text-ink"
                    >
                      <X size={12} />
                    </button>
                  ) : null}
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleAllVisible}
                    label={allVisibleSelected ? 'Deselect all results' : 'Select all results'}
                  />
                  {selectedCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => setSelected({})}
                      className="text-[10.5px] font-medium text-muted transition-colors hover:text-danger"
                    >
                      Clear selection
                    </button>
                  ) : (
                    <span className="text-[10.5px] text-subtle">{filtered.length} shown</span>
                  )}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-[12.5px] font-medium text-ink">No matching products</p>
                  <p className="mt-1 text-[11.5px] text-muted">
                    Try a different search to find products to label.
                  </p>
                </div>
              ) : (
                <ul className="max-h-[440px] divide-y divide-[#F0F3F8] overflow-y-auto xl:max-h-[520px]">
                  {filtered.map((product) => {
                    const selectedQuantity =
                      product.id !== undefined ? selected[product.id] : undefined;
                    const isSelected = selectedQuantity !== undefined;
                    return (
                      <li
                        key={product.id ?? product.barcode}
                        className={cn(
                          'flex items-start gap-2.5 px-4 py-2.5 transition-colors',
                          isSelected ? 'bg-[#F8FBFF]' : 'hover:bg-[#FAFCFE]',
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleProduct(product)}
                          ariaLabel={`Select ${product.name} for labelling`}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => toggleProduct(product)}
                              className="min-w-0 flex-1 truncate text-left text-[12.5px] font-medium text-ink transition-colors hover:text-brand-700"
                            >
                              {product.name}
                            </button>
                            <span className="shrink-0 text-[11px] font-medium tabular text-[#475569]">
                              {formatPrice(product.price, settings.currency)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate text-[10px] text-subtle">
                              <span className="font-mono">{product.sku || 'No SKU'}</span>
                              <span className="mx-1 text-[#D3DCE8]">·</span>
                              {product.category || 'Uncategorised'}
                            </span>
                            {isSelected ? (
                              <QuantityStepper
                                value={selectedQuantity}
                                onChange={(quantity) => {
                                  if (product.id !== undefined) setQuantity(product.id, quantity);
                                }}
                                productName={product.name}
                              />
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-line bg-[#FAFBFD] px-4 py-2.5">
                <p className="text-[11px] text-muted">
                  {selectedCount === 0
                    ? 'Select products to create labels'
                    : `${pluralize(selectedCount, 'product')} · ${pluralize(totalLabels, 'label')}`}
                </p>
                {selectedCount === 0 ? (
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-[10.5px] font-medium text-brand-700 transition-colors hover:text-brand-800"
                  >
                    Select all products
                  </button>
                ) : (
                  <span className="text-[10.5px] text-subtle">Max {MAX_QUANTITY} per product</span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="card overflow-hidden">
          <SectionHeader
            title="Label preview"
            description={`${labelSize === 'large' ? '86 × 50 mm' : '54 × 32 mm'} · CODE128`}
            icon={<Tag size={14} />}
            action={
              <Button
                variant="primary"
                size="sm"
                iconLeft={<Printer size={13} />}
                onClick={handlePrint}
                disabled={totalLabels === 0}
                loading={printing}
              >
                Print {totalLabels > 0 ? `${totalLabels} label${totalLabels === 1 ? '' : 's'}` : 'labels'}
              </Button>
            }
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-[#FAFBFD] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <label htmlFor="label-size" className="text-[11px] font-medium text-muted">
                Label size
              </label>
              <Select
                id="label-size"
                value={labelSize}
                onChange={(event) => {
                  sizeTouched.current = true;
                  setLabelSize(event.target.value as LabelSize);
                }}
                className="h-8 min-w-[170px] rounded-md text-[11.5px]"
                wrapperClassName="inline-block"
              >
                <option value="standard">Standard · 54 × 32 mm</option>
                <option value="large">Large · 86 × 50 mm</option>
              </Select>
            </div>
            <p className="text-[10.5px] text-subtle">
              {totalLabels > 0 ? `${totalLabels} label${totalLabels === 1 ? '' : 's'} ready` : 'No labels selected'}
            </p>
          </div>

          {totalLabels === 0 ? (
            <EmptyState
              icon={<Tag />}
              title="No labels selected"
              description="Pick products from the selection panel to preview their labels here. Product name, price, SKU and a CODE128 barcode are included."
              action={
                products.length > 0 ? (
                  <Button variant="secondary" size="sm" onClick={selectAll}>
                    Select all products
                  </Button>
                ) : undefined
              }
              className="py-16"
            />
          ) : (
            <div className="px-4 py-4 sm:px-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[11px] font-medium text-[#475569]">
                  Preview
                  <span className="ml-1.5 font-normal text-subtle">
                    {labelsToPrint.length > 8
                      ? `showing first 8 of ${labelsToPrint.length}`
                      : `${labelsToPrint.length} label${labelsToPrint.length === 1 ? '' : 's'}`}
                  </span>
                </p>
                <Badge variant="outline">Scannable CODE128</Badge>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {labelsToPrint.slice(0, 8).map((product, index) => (
                  <LabelPreviewCard
                    key={`${product.id ?? product.barcode}-${index}`}
                    product={product}
                    storeName={settings.storeName}
                    currency={settings.currency}
                    size={labelSize}
                    onDownload={handleDownload}
                  />
                ))}
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#E8EEF6] bg-[#F8FAFD] px-3 py-2.5">
                <Info size={13} className="mt-px shrink-0 text-[#64748B]" aria-hidden="true" />
                <p className="text-[10.5px] leading-[16px] text-muted">
                  Print at 100% scale with no additional margins for the most reliable scanning. Each
                  label can also be downloaded as a high-resolution PNG.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <LabelPrintSheet
        labels={labelsToPrint}
        storeName={settings.storeName}
        currency={settings.currency}
        size={labelSize}
      />
    </div>
  );
}
