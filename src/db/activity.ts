import type { ActivityEntry, ActivityType } from '../types';
import { db } from './database';

export async function addActivity(input: {
  type: ActivityType;
  productId?: number;
  productName: string;
  barcode: string;
  note?: string;
  createdAt?: Date;
}): Promise<number> {
  return db.activity.add({
    type: input.type,
    productId: input.productId,
    productName: input.productName,
    barcode: input.barcode,
    note: input.note,
    createdAt: input.createdAt ?? new Date(),
  });
}

export async function listRecentActivity(limit = 8): Promise<ActivityEntry[]> {
  return db.activity.orderBy('createdAt').reverse().limit(limit).toArray();
}

export async function countActivitySince(since: Date): Promise<number> {
  return db.activity.where('createdAt').aboveOrEqual(since).count();
}
