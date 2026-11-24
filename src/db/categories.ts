import type { Category } from '../types';
import { db } from './database';

export async function listCategories(): Promise<Category[]> {
  return db.categories.orderBy('name').toArray();
}

/**
 * Resolves a typed category to an existing display name (case-insensitive)
 * or registers a new category. Called inside product write transactions.
 */
export async function ensureCategory(rawName: string): Promise<string> {
  const name = rawName.trim();
  if (!name) return '';
  const nameLower = name.toLocaleLowerCase();
  const existing = await db.categories.where('nameLower').equals(nameLower).first();
  if (existing) return existing.name;
  await db.categories.add({ name, nameLower, createdAt: new Date() });
  return name;
}

/** Removes a category once no products reference it. */
export async function pruneCategory(categoryName: string): Promise<void> {
  const name = categoryName.trim();
  if (!name) return;
  const remaining = await db.products.where('category').equals(name).count();
  if (remaining > 0) return;
  const existing = await db.categories.where('nameLower').equals(name.toLocaleLowerCase()).first();
  if (existing?.id !== undefined) {
    await db.categories.delete(existing.id);
  }
}
