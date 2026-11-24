import {
  CircleAlert,
  Copy,
  Lock,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Wand2,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateUniqueBarcode } from '../../db/barcodes';
import { createProduct, regenerateProductBarcode, updateProduct } from '../../db/products';
import { useCategories, useSettings } from '../../hooks/useDatabaseData';
import { messageFromError, toDataError } from '../../lib/errors';
import { clearFieldError, hasErrors, parsePrice, validateProductForm } from '../../lib/validation';
import { cn, copyText } from '../../lib/utils';
import type { Product, ProductField, ProductFormErrors, ProductFormValues } from '../../types';
import { BarcodeSVG } from '../ui/BarcodeSVG';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/Dialog';
import { FormField, Input, Textarea } from '../ui/Form';
import { useToast } from '../ui/Toast';
import { CategoryCombobox } from './CategoryCombobox';

const fieldIds: Record<Exclude<ProductField, 'barcode'>, string> = {
  name: 'product-name',
  sku: 'product-sku',
  category: 'product-category',
  price: 'product-price',
  description: 'product-description',
};

function focusField(field: ProductField) {
  if (field === 'barcode') {
    document.getElementById('product-barcode-panel')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
    return;
  }
  document.getElementById(fieldIds[field])?.focus();
}

export function ProductForm({
  mode,
  product,
  initialBarcode,
}: {
  mode: 'create' | 'edit';
  product?: Product;
  initialBarcode?: string;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const { currency } = useSettings();
  const categories = useCategories();
  const isEdit = mode === 'edit';
  const [values, setValues] = useState<ProductFormValues>(() => ({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    category: product?.category ?? '',
    price: product ? String(product.price) : '',
    description: product?.description ?? '',
    barcode: product?.barcode ?? initialBarcode ?? '',
  }));
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [replaceOpen, setReplaceOpen] = useState(false);

  useEffect(() => {
    if (isEdit || initialBarcode) return;
    let cancelled = false;
    setBarcodeLoading(true);
    generateUniqueBarcode()
      .then((code) => {
        if (cancelled) return;
        setValues((previous) => ({ ...previous, barcode: code }));
        setBarcodeError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setBarcodeError(messageFromError(error, 'A barcode could not be generated.'));
      })
      .finally(() => {
        if (!cancelled) setBarcodeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, initialBarcode]);

  const updateField = (field: keyof ProductFormValues, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => clearFieldError(previous, field));
  };

  const handleRegenerate = async () => {
    if (isEdit && product?.id !== undefined) {
      setBarcodeLoading(true);
      try {
        const nextBarcode = await regenerateProductBarcode(product.id);
        setValues((previous) => ({ ...previous, barcode: nextBarcode }));
        setReplaceOpen(false);
        toast.success('Barcode regenerated', 'Previously printed labels will no longer match.');
      } catch (error) {
        toast.error('Could not regenerate the barcode', messageFromError(error));
      } finally {
        setBarcodeLoading(false);
      }
      return;
    }

    setBarcodeLoading(true);
    try {
      const nextBarcode = await generateUniqueBarcode();
      setValues((previous) => ({ ...previous, barcode: nextBarcode }));
      setBarcodeError(null);
    } catch (error) {
      toast.error('Could not generate a barcode', messageFromError(error));
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handleCopyBarcode = async () => {
    const copied = await copyText(values.barcode);
    if (copied) toast.success('Barcode copied');
    else toast.error('Could not copy the barcode');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (barcodeLoading) return;

    const validationErrors = validateProductForm(values);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      const firstField = (Object.keys(validationErrors) as ProductField[])[0];
      requestAnimationFrame(() => focusField(firstField));
      return;
    }

    const price = parsePrice(values.price);
    if (price === null) return;
    setSaving(true);
    try {
      if (isEdit && product?.id !== undefined) {
        await updateProduct(product.id, {
          name: values.name,
          sku: values.sku,
          category: values.category,
          price,
          description: values.description,
        });
        toast.success('Product updated', `${values.name.trim()} was saved.`);
      } else {
        await createProduct({
          name: values.name,
          sku: values.sku,
          category: values.category,
          price,
          description: values.description,
          barcode: values.barcode,
        });
        toast.success('Product added', `${values.name.trim()} is now in your catalogue.`);
      }
      navigate('/products');
    } catch (error) {
      const dataError = toDataError(error);
      if (dataError?.field) {
        const field = dataError.field;
        setErrors((previous) => ({ ...previous, [field]: dataError.message }));
        requestAnimationFrame(() => focusField(field));
      } else {
        toast.error(
          isEdit ? 'Could not update the product' : 'Could not add the product',
          messageFromError(error),
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const barcodeProblem = errors.barcode ?? barcodeError;

  return (
    <>
      <form onSubmit={handleSubmit} noValidate>
        {!isEdit && initialBarcode ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-[#DCE8FA] bg-[#F3F8FF] px-4 py-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-brand-700 shadow-sm">
              <ScanLine size={15} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[12.5px] font-semibold text-ink">Barcode captured from a scan</p>
              <p className="mt-0.5 text-[11.5px] leading-4 text-muted">
                The scanned code{' '}
                <span className="font-mono text-[11px] text-ink">{initialBarcode}</span> will be
                saved with this product. Review the details before saving.
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="card overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[13.5px] font-semibold">Product information</h2>
              <p className="mt-0.5 text-[12px] text-muted">
                Details shown on the product record, scanner result and labels.
              </p>
            </div>

            <div className="space-y-5 px-5 py-5">
              <FormField
                label="Product name"
                htmlFor="product-name"
                required
                error={errors.name}
                hint="A clear, descriptive product name."
              >
                <Input
                  id="product-name"
                  value={values.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  invalid={Boolean(errors.name)}
                  placeholder="e.g. Premium Quality Pipe"
                  aria-describedby={errors.name ? 'product-name-error' : undefined}
                  autoFocus={!isEdit}
                  maxLength={120}
                />
              </FormField>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FormField
                  label="SKU"
                  htmlFor="product-sku"
                  error={errors.sku}
                  hint="Your internal stock code."
                >
                  <Input
                    id="product-sku"
                    value={values.sku}
                    onChange={(event) => updateField('sku', event.target.value)}
                    invalid={Boolean(errors.sku)}
                    placeholder="e.g. PIPE-001"
                    className="font-mono text-[12.5px]"
                    maxLength={64}
                  />
                </FormField>

                <FormField
                  label="Category"
                  htmlFor="product-category"
                  error={errors.category}
                  hint="Group similar products."
                >
                  <CategoryCombobox
                    id="product-category"
                    value={values.category}
                    onChange={(nextValue) => updateField('category', nextValue)}
                    categories={categories}
                    invalid={Boolean(errors.category)}
                  />
                </FormField>
              </div>

              <FormField
                label="Product price"
                htmlFor="product-price"
                required
                error={errors.price}
                hint={`Selling price per unit in ${currency}.`}
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10.5px] font-semibold tracking-[0.04em] text-muted">
                    {currency}
                  </span>
                  <Input
                    id="product-price"
                    type="text"
                    inputMode="decimal"
                    value={values.price}
                    onChange={(event) => updateField('price', event.target.value)}
                    invalid={Boolean(errors.price)}
                    placeholder="0.00"
                    className="pl-[58px] text-[14px] font-medium tabular"
                    aria-describedby={errors.price ? 'product-price-error' : undefined}
                    autoComplete="off"
                  />
                </div>
              </FormField>

              <FormField
                label="Description"
                htmlFor="product-description"
                error={errors.description}
                action={
                  <span className="text-[10.5px] tabular text-subtle">
                    {values.description.length}/1000
                  </span>
                }
              >
                <Textarea
                  id="product-description"
                  value={values.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  invalid={Boolean(errors.description)}
                  placeholder="Add notes, specifications or dimensions for this product."
                  maxLength={1000}
                  rows={4}
                />
              </FormField>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-line bg-[#FAFBFD] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="hidden text-[11px] text-subtle sm:block">
                All changes are stored on this device.
              </p>
              <div className="flex justify-end gap-2">
                <Button onClick={() => navigate('/products')} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={saving}
                  disabled={barcodeLoading || Boolean(barcodeError) || !values.barcode}
                >
                  {isEdit ? 'Save changes' : 'Save product'}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:sticky lg:top-[88px]">
            <div id="product-barcode-panel" className="card overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
                <div>
                  <h2 className="text-[13px] font-semibold">Barcode</h2>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {isEdit ? 'Locked to this product' : 'Generated automatically'}
                  </p>
                </div>
                <Badge variant={isEdit ? 'neutral' : 'brand'}>
                  {isEdit ? <Lock size={10} aria-hidden="true" /> : <Wand2 size={10} aria-hidden="true" />}
                  CODE128
                </Badge>
              </div>

              <div className="px-4 py-4">
                <div
                  className={cn(
                    'flex min-h-[128px] items-center justify-center rounded-lg border bg-white p-4',
                    barcodeProblem ? 'border-danger/30' : 'border-line',
                  )}
                >
                  {barcodeLoading ? (
                    <div className="w-full space-y-2.5 py-2" aria-label="Generating barcode">
                      <div className="mx-auto h-14 w-full max-w-[220px] animate-pulse rounded bg-[#EEF2F8]" />
                      <div className="mx-auto h-2.5 w-28 animate-pulse rounded bg-[#EEF2F8]" />
                    </div>
                  ) : values.barcode ? (
                    <BarcodeSVG
                      value={values.barcode}
                      height={52}
                      width={1.7}
                      fontSize={13}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-[11.5px] text-muted">No barcode generated yet.</p>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-1.5">
                  <p className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-slate-600">
                    {values.barcode || '—'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconLeft={<Copy size={13} />}
                    onClick={handleCopyBarcode}
                    disabled={!values.barcode}
                  >
                    Copy
                  </Button>
                </div>

                {barcodeProblem ? (
                  <p role="alert" className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-4 text-danger">
                    <CircleAlert size={13} className="mt-px shrink-0" aria-hidden="true" />
                    {barcodeProblem}
                  </p>
                ) : null}

                <div className="mt-3 border-t border-line pt-3">
                  {isEdit ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      iconLeft={<RefreshCw size={13} />}
                      className="w-full justify-start px-1.5 text-muted"
                      onClick={() => setReplaceOpen(true)}
                      disabled={barcodeLoading}
                    >
                      Replace barcode…
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      iconLeft={<RefreshCw size={13} />}
                      className="w-full justify-start px-1.5 text-muted"
                      onClick={handleRegenerate}
                      disabled={barcodeLoading}
                    >
                      Regenerate barcode
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#E6ECF4] bg-[#F8FAFD] px-4 py-3.5">
              <div className="flex items-center gap-2 text-[11.5px] font-medium text-[#475569]">
                <ShieldCheck size={14} className="text-success" aria-hidden="true" />
                Saved locally, available offline
              </div>
              <p className="mt-1.5 pl-[22px] text-[11px] leading-4 text-muted">
                {isEdit
                  ? 'Editing the product keeps its barcode unchanged unless you explicitly replace it.'
                  : 'Each product receives a unique CODE128 barcode. Duplicate codes are rejected automatically.'}
              </p>
            </div>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={replaceOpen}
        onClose={() => setReplaceOpen(false)}
        onConfirm={handleRegenerate}
        title="Replace this barcode?"
        description="A new code will be generated for this product. Previously printed labels will no longer scan to it."
        confirmLabel="Replace barcode"
        cancelLabel="Keep current"
        loading={barcodeLoading}
      />
    </>
  );
}
