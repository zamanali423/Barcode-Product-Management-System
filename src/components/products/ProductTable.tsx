import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Copy,
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react';
import { cn, formatDate, formatPrice } from '../../lib/utils';
import type { ProductSortKey, SortDirection } from '../../lib/productSearch';
import type { CurrencyCode, Product } from '../../types';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/Button';

interface ProductTableProps {
  products: Product[];
  currency: CurrencyCode;
  sortKey: ProductSortKey;
  sortDirection: SortDirection;
  onSort: (key: ProductSortKey) => void;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onCopy: (barcode: string) => void;
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDirection,
  onSort,
  align = 'left',
  className,
}: {
  label: string;
  column: ProductSortKey;
  sortKey: ProductSortKey;
  sortDirection: SortDirection;
  onSort: (key: ProductSortKey) => void;
  align?: 'left' | 'right';
  className?: string;
}) {
  const active = sortKey === column;
  const Icon = active ? (sortDirection === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn(
        'bg-[#FAFBFD] px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.055em] text-[#64748B] first:rounded-tl-xl last:rounded-tr-xl',
        align === 'right' ? 'text-right' : 'text-left',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          'group inline-flex items-center gap-1.5 rounded transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
          align === 'right' && 'flex-row-reverse',
          active && 'text-ink',
        )}
      >
        {label}
        <Icon
          size={11.5}
          className={cn(active ? 'text-brand-600' : 'text-subtle/70 group-hover:text-muted')}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

export function ProductTable({
  products,
  currency,
  sortKey,
  sortDirection,
  onSort,
  onView,
  onEdit,
  onDelete,
  onCopy,
}: ProductTableProps) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[880px] border-collapse">
          <thead>
            <tr>
              <SortHeader
                label="Product"
                column="name"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSort}
                className="pl-5"
              />
              <SortHeader
                label="SKU"
                column="sku"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Category"
                column="category"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Price"
                column="price"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSort}
                align="right"
              />
              <th
                scope="col"
                className="bg-[#FAFBFD] px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.055em] text-[#64748B]"
              >
                Barcode
              </th>
              <SortHeader
                label="Date added"
                column="createdAt"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <th
                scope="col"
                className="rounded-tr-xl bg-[#FAFBFD] py-2.5 pl-4 pr-5 text-right text-[10.5px] font-semibold uppercase tracking-[0.055em] text-[#64748B]"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F3F8]">
            {products.map((product) => (
              <tr key={product.id} className="group transition-colors hover:bg-[#FAFCFE]">
                <td className="max-w-[260px] py-3 pl-5 pr-4">
                  <button
                    type="button"
                    onClick={() => onView(product)}
                    className="block max-w-full truncate text-left text-[12.8px] font-medium text-ink underline-offset-2 transition-colors hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                  >
                    {product.name}
                  </button>
                  <p className="mt-0.5 truncate text-[10.5px] text-subtle">
                    Updated {formatDate(product.updatedAt)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-[11px] text-[#475569]">{product.sku || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  {product.category ? (
                    <Badge variant="outline">{product.category}</Badge>
                  ) : (
                    <span className="text-[11.5px] text-subtle">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="whitespace-nowrap text-[12.5px] font-semibold tabular text-ink">
                    {formatPrice(product.price, currency)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-mono text-[10.5px] tracking-[0.02em] text-[#64748B]">
                      {product.barcode}
                    </span>
                    <button
                      type="button"
                      onClick={() => onCopy(product.barcode)}
                      aria-label={`Copy barcode for ${product.name}`}
                      title="Copy barcode"
                      className="rounded p-0.5 text-subtle opacity-0 transition-all hover:bg-white hover:text-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 group-hover:opacity-100"
                    >
                      <Copy size={11.5} />
                    </button>
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[11.5px] text-muted">
                  {formatDate(product.createdAt)}
                </td>
                <td className="py-3 pl-4 pr-5">
                  <div className="flex items-center justify-end gap-0.5">
                    <IconButton
                      label={`View ${product.name}`}
                      icon={<Eye />}
                      iconSize="sm"
                      onClick={() => onView(product)}
                      className="text-muted"
                    />
                    <IconButton
                      label={`Edit ${product.name}`}
                      icon={<Pencil />}
                      iconSize="sm"
                      onClick={() => onEdit(product)}
                      className="text-muted"
                    />
                    <IconButton
                      label={`Delete ${product.name}`}
                      icon={<Trash2 />}
                      iconSize="sm"
                      onClick={() => onDelete(product)}
                      className="text-muted hover:bg-danger/5 hover:text-danger"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-[#F0F3F8] md:hidden">
        {products.map((product) => (
          <li key={product.id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => onView(product)}
                className="min-w-0 text-left"
              >
                <span className="block text-[13px] font-medium leading-5 text-ink">
                  {product.name}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-muted">
                  <Badge variant="outline">{product.category || 'Uncategorised'}</Badge>
                  <span className="font-mono">{product.sku || 'No SKU'}</span>
                </span>
              </button>
              <span className="shrink-0 text-[12.5px] font-semibold tabular text-ink">
                {formatPrice(product.price, currency)}
              </span>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onCopy(product.barcode)}
                className="inline-flex items-center gap-1.5 rounded text-[10.5px] font-mono text-[#64748B] transition-colors hover:text-ink"
                aria-label={`Copy barcode ${product.barcode}`}
              >
                {product.barcode}
                <Copy size={10.5} className="text-subtle" />
              </button>
              <div className="flex items-center gap-0.5">
                <IconButton
                  label={`View ${product.name}`}
                  icon={<Eye />}
                  iconSize="sm"
                  onClick={() => onView(product)}
                  className="text-muted"
                />
                <IconButton
                  label={`Edit ${product.name}`}
                  icon={<Pencil />}
                  iconSize="sm"
                  onClick={() => onEdit(product)}
                  className="text-muted"
                />
                <IconButton
                  label={`Delete ${product.name}`}
                  icon={<Trash2 />}
                  iconSize="sm"
                  onClick={() => onDelete(product)}
                  className="text-muted hover:bg-danger/5 hover:text-danger"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
