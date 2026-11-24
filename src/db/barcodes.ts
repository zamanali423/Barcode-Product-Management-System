import { generateBarcodeCandidate } from '../lib/barcode';
import { DataError } from '../lib/errors';
import { db } from './database';

/**
 * Generates a candidate until it is confirmed unused. The unique Dexie index
 * is still the final guard if two tabs race during a write.
 */
export async function generateUniqueBarcode(): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = generateBarcodeCandidate();
    const existing = await db.products.where('barcode').equals(candidate).first();
    if (!existing) return candidate;
  }
  throw new DataError(
    'barcode-generation',
    'Could not generate a unique barcode. Please try again.',
  );
}

export async function isBarcodeTaken(barcode: string, excludeProductId?: number): Promise<boolean> {
  const existing = await db.products.where('barcode').equals(barcode.trim()).first();
  return Boolean(existing && existing.id !== excludeProductId);
}
