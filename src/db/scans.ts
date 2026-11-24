import type { Product, ScanRecord, ScanSource } from '../types';
import { db } from './database';

/**
 * Finds a product by barcode. Besides the scanned value, callers can supply
 * valid GTIN equivalents (for example UPC-A saved as a thirteen-digit GTIN),
 * so a physical code matches however it was originally stored.
 */
export async function getProductByBarcode(
  rawBarcode: string,
  alternatives: Iterable<string> = [],
): Promise<Product | null> {
  const candidates = [
    ...new Set(
      [rawBarcode, ...alternatives]
        .map((candidate) => candidate.trim())
        .filter(Boolean),
    ),
  ];
  if (candidates.length === 0) return null;
  const products = await db.products.where('barcode').anyOf(candidates).toArray();
  return products[0] ?? null;
}

export async function lookupAndRecordScan(
  rawBarcode: string,
  source: ScanSource,
  format?: string,
  alternatives: Iterable<string> = [],
): Promise<{ product: Product | null; barcode: string }> {
  const barcode = rawBarcode.trim();
  if (!barcode) return { product: null, barcode };

  const product = await getProductByBarcode(barcode, alternatives);
  try {
    await db.scans.add({
      barcode,
      productId: product?.id,
      productName: product?.name,
      found: Boolean(product),
      source,
      ...(format ? { format } : {}),
      createdAt: new Date(),
    });
  } catch (error) {
    // A scan must never be lost just because activity logging failed.
    console.error('Failed to record scan', error);
  }
  return { product, barcode };
}

export async function listRecentScans(limit = 6): Promise<ScanRecord[]> {
  return db.scans.orderBy('createdAt').reverse().limit(limit).toArray();
}

export interface ScanSummary {
  total: number;
  found: number;
}

export async function getScanSummary(since: Date): Promise<ScanSummary> {
  const scans = await db.scans.where('createdAt').aboveOrEqual(since).toArray();
  let found = 0;
  for (const scan of scans) if (scan.found) found += 1;
  return { total: scans.length, found };
}
