import { PackageOpen, PackageSearch, Plus, ScanLine, Search, X } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProductDetailsDialog } from '../components/products/ProductDetailsDialog';
import { ProductTable } from '../components/products/ProductTable';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/Dialog';
import { EmptyState, PageHeader } from '../components/ui/PageChrome';
import { Pagination } from '../components/ui/Pagination';
import { Select } from '../components/ui/Form';
import { useToast } from '../components/ui/Toast';
import { deleteProduct } from '../db/products';
import { useCategories, useProducts, useSettings } from '../hooks/useDatabaseData';
import { messageFromError } from '../lib/errors';
import {
  filterProducts,
  sortProducts,
  type ProductSortKey,
  type SortDirection,
} from '../lib/productSearch';
import { copyText, formatNumber, pluralize } from '../lib/utils';
import type { Product } from '../types';

const sortOptions = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'name:asc', label: 'Name A–Z' },
  { value: 'name:desc', label: 'Name Z–A' },
  { value: 'price:asc', label: 'Price low–high' },
  { value: 'price:desc', label: 'Price high–low' },
];

export default function ProductsPage() {
  const products = useProducts();
  const categories = useCategories();
  const { currency } = useSettings();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const deferredQuery = useDeferredValue(query);
  const [category, setCategory] = useState('all');
  const [sortKey, setSortKey] = useState<ProductSortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '');
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [deferredQuery, category, sortKey, sortDirection]);

  useEffect(() => {
    if (category !== 'all' && !categories.some((item) => item.name === category)) {
      setCategory('all');
    }
  }, [categories, category]);

  const filtered = useMemo(() => {
    const base =
      category === 'all' ? products : products.filter((product) => product.category === category);
    return sortProducts(filterProducts(base, deferredQuery), sortKey, sortDirection);
  }, [products, category, deferredQuery, sortKey, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageProducts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasFilters = query.trim().length > 0 || category !== 'all';
  const mobileSortValue = `${sortKey}:${sortDirection}`;

  const handleSort = (key: ProductSortKey) => {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const handleClearFilters = () => {
    setQuery('');
    setCategory('all');
    setPage(1);
    if (searchParams.get('q')) setSearchParams({}, { replace: true });
  };

  const handleCopy = async (barcode: string) => {
    const copied = await copyText(barcode);
    if (copied) toast.success('Barcode copied', barcode);
    else toast.error('Could not copy the barcode');
  };

  const handleEdit = (product: Product) => {
    if (product.id === undefined) return;
    setDetailProduct(null);
    navigate(`/products/${product.id}/edit`);
  };

  const handlePrint = (product: Product) => {
    if (product.id === undefined) return;
    setDetailProduct(null);
    navigate(`/labels?product=${product.id}`);
  };

  const handleDelete = async () => {
    if (deleteTarget?.id === undefined) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      toast.success('Product deleted', `${deleteTarget.name} was removed from the catalogue.`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Could not delete the product', messageFromError(error));
    } finally {
      setDeleting(false);
    }
  };

  const totalCategories = categories.length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        description={`${pluralize(products.length, 'product')} stored locally${
          totalCategories > 0
            ? ` across ${pluralize(totalCategories, 'category', 'categories')}`
            : ''
        }.`}
        actions={
          <>
            <Button
              iconLeft={<ScanLine size={14} />}
              onClick={() => navigate('/scanner')}
              className="hidden xs:inline-flex"
            >
              Scan barcode
            </Button>
            <Button
              variant="primary"
              iconLeft={<Plus size={14} />}
              onClick={() => navigate('/products/new')}
            >
              Add product
            </Button>
          </>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-2.5 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-[300px]">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, SKU or barcode…"
              aria-label="Search products"
              className="h-9 w-full rounded-lg border border-line bg-[#FAFBFD] pl-9 pr-9 text-[12.5px] text-ink outline-none transition-colors placeholder:text-subtle/80 hover:border-[#D3DCE8] focus:border-brand-500 focus:bg-white focus:ring-[3px] focus:ring-brand-500/15 [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-subtle transition-colors hover:bg-[#F1F5F9] hover:text-ink"
              >
                <X size={12} />
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Filter by category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
              className="h-9 min-w-[150px] text-[12px]"
              wrapperClassName="w-[calc(50%-4px)] sm:w-auto"
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item.id ?? item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Sort products"
              value={mobileSortValue}
              onChange={(event) => {
                const [key, direction] = event.target.value.split(':') as [
                  ProductSortKey,
                  SortDirection,
                ];
                setSortKey(key);
                setSortDirection(direction);
                setPage(1);
              }}
              className="h-9 min-w-[150px] text-[12px] md:hidden"
              wrapperClassName="w-[calc(50%-4px)] sm:w-auto"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {hasFilters ? (
              <Button
                variant="ghost"
                size="sm"
                iconLeft={<X size={12.5} />}
                onClick={handleClearFilters}
              >
                Clear
              </Button>
            ) : null}
            <span className="ml-auto hidden whitespace-nowrap text-[11px] text-subtle md:block">
              {hasFilters
                ? `${formatNumber(filtered.length)} of ${formatNumber(products.length)}`
                : `${formatNumber(products.length)} total`}
            </span>
          </div>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon={<PackageOpen />}
            title="Your catalogue is empty"
            description="Register your first product to generate a scannable barcode, or scan an existing barcode to get started."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="primary"
                  iconLeft={<Plus size={14} />}
                  onClick={() => navigate('/products/new')}
                >
                  Add your first product
                </Button>
                <Button iconLeft={<ScanLine size={14} />} onClick={() => navigate('/scanner')}>
                  Open scanner
                </Button>
              </div>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<PackageSearch />}
            title="No products match your filters"
            description="Try a different search term or category, or clear the filters to see the full catalogue."
            action={<Button onClick={handleClearFilters}>Clear filters</Button>}
          />
        ) : (
          <>
            <ProductTable
              products={pageProducts}
              currency={currency}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              onView={setDetailProduct}
              onEdit={handleEdit}
              onDelete={setDeleteTarget}
              onCopy={handleCopy}
            />
            <Pagination
              page={currentPage}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        )}
      </div>

      <ProductDetailsDialog
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onEdit={handleEdit}
        onDelete={(product) => {
          setDetailProduct(null);
          setDeleteTarget(product);
        }}
        onPrint={handlePrint}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        title="Delete this product?"
        description="This permanently removes the product from this device. Its barcode will no longer return a result when scanned."
        confirmLabel="Delete product"
        loading={deleting}
      >
        {deleteTarget ? (
          <div className="mt-3 rounded-md border border-line bg-white px-3 py-2.5">
            <p className="text-[12.5px] font-medium text-ink">{deleteTarget.name}</p>
            <p className="mt-0.5 font-mono text-[10.5px] text-muted">{deleteTarget.barcode}</p>
          </div>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
