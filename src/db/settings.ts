import type { AppSettings } from '../types';
import { DEFAULT_SETTINGS, db } from './database';

export async function getSettings(): Promise<AppSettings> {
  const stored = await db.settings.get('app');
  return { ...DEFAULT_SETTINGS, ...stored, key: 'app' };
}

export async function updateSettings(patch: Partial<Omit<AppSettings, 'key'>>): Promise<AppSettings> {
  const current = await getSettings();
  const next: AppSettings = { ...current, ...patch, key: 'app' };
  if (typeof next.storeName === 'string') {
    const trimmed = next.storeName.trim();
    next.storeName = trimmed || current.storeName || DEFAULT_SETTINGS.storeName;
  }
  await db.settings.put(next);
  return next;
}
