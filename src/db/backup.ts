import { isCurrencyCode } from '../lib/currencies';
import { DataError } from '../lib/errors';
import type {
  ActivityEntry,
  AppSettings,
  BackUpFile,
  BackupSummary,
  Category,
  LabelSize,
  Product,
  RestoreMode,
  ScanRecord,
  ScanSource,
  UsbScanSuffix,
} from '../types';
import { DEFAULT_SETTINGS, db } from './database';

type CleanCategory = Pick<Category, 'name'>;

export interface ParsedBackup {
  products: Product[];
  categories: CleanCategory[];
  settings?: AppSettings;
  activity: ActivityEntry[];
  scans: ScanRecord[];
  exportedAt: string | null;
  summary: BackupSummary;
}

export interface RestoreResult {
  mode: RestoreMode;
  productsAdded: number;
  productsSkipped: number;
  categoriesAdded: number;
  scansRestored: number;
  activityRestored: number;
}

export async function buildBackup(): Promise<BackUpFile> {
  const [products, categories, settings, activity, scans] = await Promise.all([
    db.products.toArray(),
    db.categories.toArray(),
    db.settings.get('app'),
    db.activity.toArray(),
    db.scans.toArray(),
  ]);
  return {
    format: 'vantage-inventory-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    products,
    categories,
    settings: settings ?? DEFAULT_SETTINGS,
    activity,
    scans,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown, maxLength = 2000): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
    return undefined;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function sanitizeProduct(value: unknown, index: number): Product {
  if (!isRecord(value)) {
    throw new DataError('import-failed', `Product ${index + 1} is not a valid record.`);
  }
  const name = asTrimmedString(value.name, 120);
  const barcode = asTrimmedString(value.barcode, 48);
  const rawPrice = value.price;
  const price =
    typeof rawPrice === 'number'
      ? rawPrice
      : typeof rawPrice === 'string'
        ? Number(rawPrice)
        : Number.NaN;

  if (!name) throw new DataError('import-failed', `Product ${index + 1} is missing a name.`);
  if (!barcode) throw new DataError('import-failed', `Product ${index + 1} is missing a barcode.`);
  if (!Number.isFinite(price) || price < 0) {
    throw new DataError('import-failed', `Product “${name}” has an invalid price.`);
  }

  const createdAt = parseDate(value.createdAt) ?? new Date();
  return {
    name,
    sku: asTrimmedString(value.sku, 64),
    category: asTrimmedString(value.category, 60),
    price: Math.round(price * 100) / 100,
    description: typeof value.description === 'string' ? value.description.slice(0, 1000) : '',
    barcode,
    createdAt,
    updatedAt: parseDate(value.updatedAt) ?? createdAt,
  };
}

function sanitizeSettings(value: unknown): AppSettings | undefined {
  if (!isRecord(value)) return undefined;
  const currency =
    isCurrencyCode(value.currency) ? value.currency : DEFAULT_SETTINGS.currency;
  const duplicateWindowRaw =
    typeof value.duplicateWindowSeconds === 'number'
      ? Math.round(value.duplicateWindowSeconds)
      : DEFAULT_SETTINGS.duplicateWindowSeconds;
  const duplicateWindowSeconds = Math.min(10, Math.max(1, duplicateWindowRaw));
  const labelSize: LabelSize =
    value.defaultLabelSize === 'large' || value.defaultLabelSize === 'standard'
      ? value.defaultLabelSize
      : DEFAULT_SETTINGS.defaultLabelSize;
  const usbScanSuffix: UsbScanSuffix =
    value.usbScanSuffix === 'enter' ||
    value.usbScanSuffix === 'tab' ||
    value.usbScanSuffix === 'both'
      ? value.usbScanSuffix
      : DEFAULT_SETTINGS.usbScanSuffix;
  return {
    key: 'app',
    storeName:
      asTrimmedString(value.storeName, 80) || DEFAULT_SETTINGS.storeName,
    currency,
    scannerSound:
      typeof value.scannerSound === 'boolean'
        ? value.scannerSound
        : DEFAULT_SETTINGS.scannerSound,
    duplicateWindowSeconds,
    usbScanSuffix,
    defaultLabelSize: labelSize,
    lastBackupAt: parseDate(value.lastBackupAt),
  };
}

function sanitizeActivity(value: unknown): ActivityEntry | null {
  if (!isRecord(value)) return null;
  const type = value.type;
  if (type !== 'created' && type !== 'updated' && type !== 'deleted') return null;
  const productName = asTrimmedString(value.productName, 120);
  if (!productName) return null;
  return {
    type,
    productName,
    barcode: asTrimmedString(value.barcode, 48),
    note: asTrimmedString(value.note, 160) || undefined,
    createdAt: parseDate(value.createdAt) ?? new Date(),
  };
}

function sanitizeScan(value: unknown): ScanRecord | null {
  if (!isRecord(value)) return null;
  const barcode = asTrimmedString(value.barcode, 2048);
  if (!barcode) return null;
  const source: ScanSource =
    value.source === 'camera' || value.source === 'usb' || value.source === 'manual'
      ? value.source
      : 'manual';
  return {
    barcode,
    productId: typeof value.productId === 'number' ? value.productId : undefined,
    productName: asTrimmedString(value.productName, 120) || undefined,
    found: Boolean(value.found),
    source,
    format: asTrimmedString(value.format, 40) || undefined,
    createdAt: parseDate(value.createdAt) ?? new Date(),
  };
}

export function parseBackupJson(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new DataError('import-failed', 'This file is not valid JSON.');
  }
  if (!isRecord(raw) || raw.format !== 'vantage-inventory-backup') {
    throw new DataError('import-failed', 'This is not a Vantage Inventory backup file.');
  }
  if (raw.version !== 1) {
    throw new DataError('import-failed', 'This backup version is not supported.');
  }
  if (!Array.isArray(raw.products)) {
    throw new DataError('import-failed', 'The backup does not contain a product list.');
  }

  const products = raw.products.map((product, index) => sanitizeProduct(product, index));
  const seenBarcodes = new Set<string>();
  for (const product of products) {
    if (seenBarcodes.has(product.barcode)) {
      throw new DataError(
        'import-failed',
        `The backup contains the barcode ${product.barcode} more than once.`,
      );
    }
    seenBarcodes.add(product.barcode);
  }

  const categories: CleanCategory[] = [];
  const categoryKeys = new Set<string>();
  const addCategory = (nameRaw: string) => {
    const name = nameRaw.trim();
    if (!name) return;
    const key = name.toLocaleLowerCase();
    if (categoryKeys.has(key)) return;
    categoryKeys.add(key);
    categories.push({ name });
  };

  if (Array.isArray(raw.categories)) {
    for (const entry of raw.categories) {
      if (isRecord(entry)) addCategory(asTrimmedString(entry.name, 60));
    }
  }
  for (const product of products) addCategory(product.category);

  const activity: ActivityEntry[] = Array.isArray(raw.activity)
    ? raw.activity
        .map((entry) => sanitizeActivity(entry))
        .filter((entry): entry is ActivityEntry => entry !== null)
    : [];
  const scans: ScanRecord[] = Array.isArray(raw.scans)
    ? raw.scans
        .map((entry) => sanitizeScan(entry))
        .filter((entry): entry is ScanRecord => entry !== null)
    : [];
  const settings = sanitizeSettings(raw.settings);
  const exportedAt =
    typeof raw.exportedAt === 'string' && !Number.isNaN(new Date(raw.exportedAt).getTime())
      ? raw.exportedAt
      : null;

  return {
    products,
    categories,
    settings,
    activity,
    scans,
    exportedAt,
    summary: {
      products: products.length,
      categories: categories.length,
      scans: scans.length,
      exportedAt,
      hasSettings: Boolean(settings),
    },
  };
}

function stripProductId(product: Product): Omit<Product, 'id'> {
  return {
    name: product.name,
    sku: product.sku,
    category: product.category,
    price: product.price,
    description: product.description,
    barcode: product.barcode,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export async function restoreBackup(
  backup: ParsedBackup,
  mode: RestoreMode,
): Promise<RestoreResult> {
  if (mode === 'merge') {
    return db.transaction('rw', db.products, db.categories, async () => {
      const existingProducts = await db.products.toArray();
      const existingBarcodes = new Set(existingProducts.map((product) => product.barcode));
      const existingSkus = new Set(
        existingProducts
          .map((product) => product.sku.toLocaleLowerCase())
          .filter(Boolean),
      );
      const existingCategories = await db.categories.toArray();
      const categoryNames = new Set(existingCategories.map((cat) => cat.nameLower));
      let productsAdded = 0;
      let productsSkipped = 0;
      let categoriesAdded = 0;

      for (const product of backup.products) {
        const skuKey = product.sku.toLocaleLowerCase();
        if (existingBarcodes.has(product.barcode) || (skuKey && existingSkus.has(skuKey))) {
          productsSkipped += 1;
          continue;
        }
        let category = '';
        if (product.category) {
          const key = product.category.toLocaleLowerCase();
          const existing = await db.categories.where('nameLower').equals(key).first();
          if (existing) {
            category = existing.name;
          } else {
            await db.categories.add({
              name: product.category,
              nameLower: key,
              createdAt: new Date(),
            });
            category = product.category;
            categoryNames.add(key);
            categoriesAdded += 1;
          }
        }
        await db.products.add({ ...stripProductId(product), category });
        existingBarcodes.add(product.barcode);
        if (skuKey) existingSkus.add(skuKey);
        productsAdded += 1;
      }

      return {
        mode,
        productsAdded,
        productsSkipped,
        categoriesAdded,
        scansRestored: 0,
        activityRestored: 0,
      };
    });
  }

  return db.transaction(
    'rw',
    db.products,
    db.categories,
    db.activity,
    db.scans,
    db.settings,
    async () => {
      await Promise.all([
        db.products.clear(),
        db.categories.clear(),
        db.activity.clear(),
        db.scans.clear(),
      ]);
      if (backup.settings) {
        await db.settings.put({ ...backup.settings, key: 'app' });
      }

      let categoriesAdded = 0;
      for (const category of backup.categories) {
        const key = category.name.toLocaleLowerCase();
        const exists = await db.categories.where('nameLower').equals(key).first();
        if (exists) continue;
        await db.categories.add({ name: category.name, nameLower: key, createdAt: new Date() });
        categoriesAdded += 1;
      }

      if (backup.products.length > 0) {
        await db.products.bulkAdd(backup.products.map((product) => stripProductId(product)));
      }
      if (backup.activity.length > 0) {
        await db.activity.bulkAdd(
          backup.activity.map((entry) => ({
            type: entry.type,
            productName: entry.productName,
            barcode: entry.barcode,
            note: entry.note,
            createdAt: entry.createdAt,
          })),
        );
      }
      if (backup.scans.length > 0) {
        await db.scans.bulkAdd(
          backup.scans.map((scan) => ({
            barcode: scan.barcode,
            productId: undefined,
            productName: scan.productName,
            found: scan.found,
            source: scan.source,
            format: scan.format,
            createdAt: scan.createdAt,
          })),
        );
      }

      return {
        mode,
        productsAdded: backup.products.length,
        productsSkipped: 0,
        categoriesAdded,
        scansRestored: backup.scans.length,
        activityRestored: backup.activity.length,
      };
    },
  );
}

export async function resetWorkspace(): Promise<void> {
  await db.transaction(
    'rw',
    db.products,
    db.categories,
    db.activity,
    db.scans,
    db.settings,
    async () => {
      await Promise.all([
        db.products.clear(),
        db.categories.clear(),
        db.activity.clear(),
        db.scans.clear(),
      ]);
      const settings = await db.settings.get('app');
      if (settings) {
        await db.settings.put({ ...settings, lastBackupAt: undefined });
      }
    },
  );
}
