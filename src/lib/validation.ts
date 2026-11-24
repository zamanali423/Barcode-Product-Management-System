import type { ProductFormErrors, ProductFormValues } from '../types';

const EMPTY_ERRORS: ProductFormErrors = {};

export const MAX_PRICE = 99_999_999.99;

export function validateBarcode(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'A barcode is required.';
  if (trimmed.length < 4) return 'Barcode must be at least 4 characters.';
  if (trimmed.length > 48) return 'Barcode cannot exceed 48 characters.';
  if (/\s/.test(trimmed)) return 'Barcode cannot contain spaces.';
  for (const char of trimmed) {
    const code = char.charCodeAt(0);
    if (code < 33 || code > 126) {
      return 'Barcode can only use standard printable characters.';
    }
  }
  return null;
}

export function parsePrice(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function validateProductForm(values: ProductFormValues): ProductFormErrors {
  const errors: ProductFormErrors = {};
  const name = values.name.trim();
  if (!name) {
    errors.name = 'Product name is required.';
  } else if (name.length > 120) {
    errors.name = 'Product name cannot exceed 120 characters.';
  }

  const sku = values.sku.trim();
  if (sku) {
    if (sku.length > 64) {
      errors.sku = 'SKU cannot exceed 64 characters.';
    } else if (!/^[A-Za-z0-9][A-Za-z0-9 ._/-]*$/.test(sku)) {
      errors.sku = 'Use letters, numbers, spaces, and . - _ / only.';
    }
  }

  const category = values.category.trim();
  if (category.length > 60) {
    errors.category = 'Category cannot exceed 60 characters.';
  }

  const price = parsePrice(values.price);
  if (price === null) {
    errors.price = 'Enter a valid price with up to 2 decimal places.';
  } else if (price <= 0) {
    errors.price = 'Price must be greater than zero.';
  } else if (price > MAX_PRICE) {
    errors.price = 'Price is above the supported maximum.';
  }

  if (values.description.trim().length > 1000) {
    errors.description = 'Description cannot exceed 1000 characters.';
  }

  const barcodeError = validateBarcode(values.barcode);
  if (barcodeError) errors.barcode = barcodeError;

  return errors;
}

export function hasErrors(errors: ProductFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function clearFieldError(errors: ProductFormErrors, field: keyof ProductFormErrors): ProductFormErrors {
  if (!errors[field]) return errors;
  const next = { ...errors };
  delete next[field];
  return next;
}

export function getEmptyErrors(): ProductFormErrors {
  return EMPTY_ERRORS;
}
