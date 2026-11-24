import type { Product, ScanRecord, ScanSource } from '../types';
import { db } from './database';

export async function getProductByBarcode(rawBarcode: string): Promise<Product | null> {
  const barcode = rawBarcode.trim();
  if (!barcode) return null;
  return (await db.products.where('barcode').equals(barcode).first()) ?? null;
}

export async function lookupAndRecordScan(
  rawBarcode: string,
  source: ScanSource,
  format?: string,
): Promise<{ product: Product | null; barcode: string }> {
  const barcode = rawBarcode.trim();
  if (!barcode) return { product: null, barcode };

  const product = await getProductByBarcode(barcode);
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
