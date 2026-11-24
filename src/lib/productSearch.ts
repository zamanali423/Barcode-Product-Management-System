import type { Product } from '../types';

export type ProductSortKey = 'name' | 'sku' | 'category' | 'price' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export function filterProducts(products: Product[], rawQuery: string): Product[] {
  const query = rawQuery.trim().toLocaleLowerCase();
  if (!query) return products;
  const tokens = query.split(/\s+/).filter(Boolean);
  return products.filter((product) => {
    const haystack = [
      product.name,
      product.sku,
      product.barcode,
      product.category,
    ]
      .join(' ')
      .toLocaleLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

export function sortProducts(
  products: Product[],
  key: ProductSortKey,
  direction: SortDirection,
): Product[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...products].sort((a, b) => {
    if (key === 'price') return (a.price - b.price) * factor;
    if (key === 'createdAt') {
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * factor;
    }
    const aValue = a[key]?.toString().toLocaleLowerCase() ?? '';
    const bValue = b[key]?.toString().toLocaleLowerCase() ?? '';
    if (!aValue && bValue) return 1;
    if (aValue && !bValue) return -1;
    return aValue.localeCompare(bValue) * factor;
  });
}
