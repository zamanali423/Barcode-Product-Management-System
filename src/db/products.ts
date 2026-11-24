import { DataError, isConstraintError } from '../lib/errors';
import type { Product } from '../types';
import { addActivity } from './activity';
import { generateUniqueBarcode } from './barcodes';
import { ensureCategory, pruneCategory } from './categories';
import { db } from './database';

export interface CreateProductInput {
  name: string;
  sku: string;
  category: string;
  price: number;
  description: string;
  barcode: string;
}

export interface UpdateProductInput {
  name: string;
  sku: string;
  category: string;
  price: number;
  description: string;
}

export async function listProducts(): Promise<Product[]> {
  return db.products.orderBy('createdAt').reverse().toArray();
}

export async function getProduct(id: number): Promise<Product | undefined> {
  return db.products.get(id);
}

function duplicateBarcodeError() {
  return new DataError(
    'duplicate-barcode',
    'This barcode is already assigned to another product.',
    'barcode',
  );
}

async function assertSkuAvailable(sku: string, excludeProductId?: number): Promise<void> {
  if (!sku) return;
  const existing = await db.products.where('sku').equalsIgnoreCase(sku).first();
  if (existing && existing.id !== excludeProductId) {
    throw new DataError('duplicate-sku', 'This SKU is already used by another product.', 'sku');
  }
}

function normalizeFields(input: CreateProductInput | UpdateProductInput) {
  return {
    name: input.name.trim(),
    sku: input.sku.trim(),
    category: input.category.trim(),
    price: Math.round(input.price * 100) / 100,
    description: input.description.trim(),
  };
}

export async function createProduct(input: CreateProductInput): Promise<number> {
  const fields = normalizeFields(input);
  const barcode = input.barcode.trim();
  const now = new Date();

  try {
    return await db.transaction('rw', db.products, db.categories, db.activity, async () => {
      const duplicate = await db.products.where('barcode').equals(barcode).first();
      if (duplicate) throw duplicateBarcodeError();
      await assertSkuAvailable(fields.sku);

      const category = fields.category ? await ensureCategory(fields.category) : '';
      const id = await db.products.add({
        ...fields,
        category,
        barcode,
        createdAt: now,
        updatedAt: now,
      });
      await addActivity({
        type: 'created',
        productId: id,
        productName: fields.name,
        barcode,
      });
      return id;
    });
  } catch (error) {
    if (isConstraintError(error)) {
      throw duplicateBarcodeError();
    }
    throw error;
  }
}

export async function updateProduct(id: number, input: UpdateProductInput): Promise<void> {
  const fields = normalizeFields(input);

  try {
    await db.transaction('rw', db.products, db.categories, db.activity, async () => {
      const existing = await db.products.get(id);
      if (!existing) {
        throw new DataError('not-found', 'This product no longer exists.');
      }
      await assertSkuAvailable(fields.sku, id);

      const category = fields.category ? await ensureCategory(fields.category) : '';
      await db.products.update(id, {
        ...fields,
        category,
        updatedAt: new Date(),
      });
      if (existing.category && existing.category !== category) {
        await pruneCategory(existing.category);
      }
      await addActivity({
        type: 'updated',
        productId: id,
        productName: fields.name,
        barcode: existing.barcode,
      });
    });
  } catch (error) {
    if (isConstraintError(error)) {
      throw duplicateBarcodeError();
    }
    throw error;
  }
}

export async function deleteProduct(id: number): Promise<void> {
  await db.transaction('rw', db.products, db.categories, db.activity, async () => {
    const existing = await db.products.get(id);
    if (!existing) {
      throw new DataError('not-found', 'This product no longer exists.');
    }
    await db.products.delete(id);
    await pruneCategory(existing.category);
    await addActivity({
      type: 'deleted',
      productId: id,
      productName: existing.name,
      barcode: existing.barcode,
      note: 'Removed from catalogue',
    });
  });
}

/** Explicit, user-triggered barcode replacement. Editing never does this implicitly. */
export async function regenerateProductBarcode(id: number): Promise<string> {
  const barcode = await generateUniqueBarcode();

  return db.transaction('rw', db.products, db.activity, async () => {
    const existing = await db.products.get(id);
    if (!existing) {
      throw new DataError('not-found', 'This product no longer exists.');
    }
    const collision = await db.products.where('barcode').equals(barcode).first();
    if (collision) throw duplicateBarcodeError();

    await db.products.update(id, { barcode, updatedAt: new Date() });
    await addActivity({
      type: 'updated',
      productId: id,
      productName: existing.name,
      barcode,
      note: 'Barcode regenerated',
    });
    return barcode;
  });
}
