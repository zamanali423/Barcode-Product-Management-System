export interface Product {
  id?: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  description: string;
  barcode: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductField = 'name' | 'sku' | 'category' | 'price' | 'description' | 'barcode';

export interface Category {
  id?: number;
  name: string;
  nameLower: string;
  createdAt: Date;
}

export type ActivityType = 'created' | 'updated' | 'deleted';

export interface ActivityEntry {
  id?: number;
  type: ActivityType;
  productId?: number;
  productName: string;
  barcode: string;
  note?: string;
  createdAt: Date;
}

export type ScanSource = 'camera' | 'usb' | 'manual';

export interface ScanRecord {
  id?: number;
  barcode: string;
  productId?: number;
  productName?: string;
  found: boolean;
  source: ScanSource;
  /** Decoded symbology, when the camera reports one (e.g. EAN-13, QR Code). */
  format?: string;
  createdAt: Date;
}

export type LabelSize = 'standard' | 'large';

export type CurrencyCode =
  | 'PKR'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'AED'
  | 'SAR'
  | 'INR'
  | 'BDT'
  | 'CAD'
  | 'AUD';

export interface AppSettings {
  key: 'app';
  storeName: string;
  currency: CurrencyCode;
  scannerSound: boolean;
  /** Duplicate scans of the same code are ignored for this many seconds. */
  duplicateWindowSeconds: number;
  defaultLabelSize: LabelSize;
  lastBackupAt?: Date;
}

export interface ProductFormValues {
  name: string;
  sku: string;
  category: string;
  price: string;
  description: string;
  barcode: string;
}

export type ProductFormErrors = Partial<Record<ProductField, string>>;

export interface BackUpFile {
  format: 'vantage-inventory-backup';
  version: 1;
  exportedAt: string;
  products: Product[];
  categories: Category[];
  settings?: AppSettings;
  activity?: ActivityEntry[];
  scans?: ScanRecord[];
}

export type BackupSummary = {
  products: number;
  categories: number;
  scans: number;
  exportedAt: string | null;
  hasSettings: boolean;
};

export type RestoreMode = 'merge' | 'replace';
