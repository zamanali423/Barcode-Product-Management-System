import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { listRecentActivity } from '../db/activity';
import { listCategories } from '../db/categories';
import { DEFAULT_SETTINGS, db } from '../db/database';
import { getProduct, listProducts } from '../db/products';
import { getScanSummary, listRecentScans, type ScanSummary } from '../db/scans';
import { startOfToday } from '../lib/utils';
import type { ActivityEntry, AppSettings, Category, Product, ScanRecord } from '../types';

export function useSettings(): AppSettings {
  const stored = useLiveQuery(() => db.settings.get('app'), [], undefined);
  return useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...stored, key: 'app' }) as AppSettings,
    [stored],
  );
}

export function useProducts(): Product[] {
  return useLiveQuery(() => listProducts(), [], []) ?? [];
}

export function useCategories(): Category[] {
  return useLiveQuery(() => listCategories(), [], []) ?? [];
}

export interface ProductLoadState {
  product: Product | null;
  loading: boolean;
}

export function useProduct(id: number | undefined): ProductLoadState {
  const result = useLiveQuery(
    async () => ({ product: id ? ((await getProduct(id)) ?? null) : null }),
    [id],
    undefined,
  );
  return {
    product: result?.product ?? null,
    loading: result === undefined,
  };
}

export function useRecentActivity(limit = 8): ActivityEntry[] {
  return useLiveQuery(() => listRecentActivity(limit), [limit], []) ?? [];
}

export function useRecentScans(limit = 6): ScanRecord[] {
  return useLiveQuery(() => listRecentScans(limit), [limit], []) ?? [];
}

export function useTodayScanSummary(): ScanSummary {
  const since = useMemo(() => startOfToday(), []);
  return (
    useLiveQuery(() => getScanSummary(since), [since.getTime()], { total: 0, found: 0 }) ?? {
      total: 0,
      found: 0,
    }
  );
}
