import Dexie, { type Table } from 'dexie';
import type { ActivityEntry, AppSettings, Category, Product, ScanRecord } from '../types';

export class VantageDatabase extends Dexie {
  products!: Table<Product, number>;
  categories!: Table<Category, number>;
  activity!: Table<ActivityEntry, number>;
  scans!: Table<ScanRecord, number>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('vantage-inventory');

    this.version(1).stores({
      products: '++id, &barcode, sku, category, name, createdAt, updatedAt',
      categories: '++id, &nameLower, name, createdAt',
      activity: '++id, type, productId, createdAt',
      settings: 'key',
    });

    this.version(2).stores({
      scans: '++id, barcode, productId, found, createdAt',
    });
  }
}

export const db = new VantageDatabase();

export const DEFAULT_SETTINGS: AppSettings = {
  key: 'app',
  storeName: 'Vantage Inventory',
  currency: 'PKR',
  scannerSound: true,
  duplicateWindowSeconds: 2,
  defaultLabelSize: 'standard',
};

export async function initializeDatabase(): Promise<void> {
  await db.open();
  const existing = await db.settings.get('app');
  if (!existing) {
    await db.settings.add({ ...DEFAULT_SETTINGS });
  }
}
