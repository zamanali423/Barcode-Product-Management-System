import type { ProductField } from '../types';

export type DataErrorCode =
  | 'duplicate-barcode'
  | 'duplicate-sku'
  | 'barcode-generation'
  | 'not-found'
  | 'invalid-input'
  | 'import-failed';

export class DataError extends Error {
  readonly code: DataErrorCode;
  readonly field?: ProductField;

  constructor(code: DataErrorCode, message: string, field?: ProductField) {
    super(message);
    this.name = 'DataError';
    this.code = code;
    this.field = field;
  }
}

function errorChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current; depth += 1) {
    chain.push(current);
    if (typeof current === 'object' && current !== null && 'inner' in current) {
      current = (current as { inner?: unknown }).inner;
    } else {
      break;
    }
  }
  return chain;
}

/**
 * Dexie wraps errors thrown inside a transaction in a DexieError whose
 * `inner` field references the original error. Unwrap it so field-level
 * validation can survive database transactions.
 */
export function toDataError(error: unknown): DataError | null {
  for (const item of errorChain(error)) {
    if (item instanceof DataError) return item;
  }
  return null;
}

export function isConstraintError(error: unknown): boolean {
  return errorChain(error).some(
    (item) => item instanceof Error && item.name === 'ConstraintError',
  );
}

export function messageFromError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  const dataError = toDataError(error);
  if (dataError) return dataError.message;

  const chain = errorChain(error);
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const item = chain[index];
    if (item instanceof Error && item.message) return item.message;
  }
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}
