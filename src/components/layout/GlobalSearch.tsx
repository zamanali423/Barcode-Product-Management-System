import { ArrowRight, Package, Search } from 'lucide-react';
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts, useSettings } from '../../hooks/useDatabaseData';
import { useClickOutside } from '../../hooks/useClickOutside';
import { filterProducts } from '../../lib/productSearch';
import { cn, formatPrice } from '../../lib/utils';
import type { Product } from '../../types';

export function GlobalSearch() {
  const products = useProducts();
  const { currency } = useSettings();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shortcutLabel = useMemo(
    () => (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl K'),
    [],
  );

  const matches = useMemo(
    () => (deferredQuery.trim() ? filterProducts(products, deferredQuery) : []),
    [products, deferredQuery],
  );
  const results = matches.slice(0, 6);
  const showPanel = open && query.trim().length > 0;

  useClickOutside([containerRef], () => setOpen(false), showPanel);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
  }, [deferredQuery]);

  const openProduct = (product: Product) => {
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
    navigate(`/products?q=${encodeURIComponent(product.barcode)}`);
  };

  const openFullSearch = () => {
    const trimmed = query.trim();
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
    navigate(`/products${trimmed ? `?q=${encodeURIComponent(trimmed)}` : ''}`);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!showPanel) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, -1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) openProduct(results[activeIndex]);
      else openFullSearch();
    } else if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative hidden w-[286px] shrink-0 md:block xl:w-[344px]">
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        value={query}
        placeholder="Search products…"
        aria-label="Search products, SKU or barcode"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        autoComplete="off"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="h-9 w-full rounded-lg border border-[#E4E9F1] bg-[#F6F8FB] pl-9 pr-[60px] text-[12.5px] text-ink outline-none transition-colors placeholder:text-subtle/80 hover:border-[#D3DCE8] focus:border-brand-500 focus:bg-white focus:ring-[3px] focus:ring-brand-500/15 [&::-webkit-search-cancel-button]:hidden"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-[#E2E8F0] bg-white px-1.5 py-0.5 text-[9.5px] font-medium text-subtle">
        {shortcutLabel}
      </span>

      {showPanel ? (
        <div
          id="global-search-results"
          className="absolute left-0 right-0 top-full z-50 mt-2 animate-rise overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-pop"
        >
          {results.length > 0 ? (
            <>
              <div className="flex items-center justify-between px-3.5 pb-1 pt-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.11em] text-subtle">
                  Products
                </span>
                <span className="text-[10.5px] text-subtle">{matches.length} found</span>
              </div>
              <div className="px-1.5 pb-1">
                {results.map((product, index) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => openProduct(product)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors',
                      index === activeIndex ? 'bg-[#F3F7FD]' : 'hover:bg-[#F7F9FC]',
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-[#FAFBFD] text-muted">
                      <Package size={13.5} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-ink">
                        {product.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[10.5px] text-subtle">
                        {product.sku || 'No SKU'}
                        {product.category ? ` · ${product.category}` : ''}
                        <span className="ml-1.5 font-mono text-[10px]">{product.barcode}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-[11.5px] font-semibold tabular text-brand-900">
                      {formatPrice(product.price, currency)}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-[12.5px] font-medium text-ink">No matching products</p>
              <p className="mt-1 text-[11.5px] leading-4 text-muted">
                Nothing matches “{query.trim()}”. Try a product name, SKU or barcode.
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={openFullSearch}
            className="flex w-full items-center justify-between gap-3 border-t border-line bg-[#FAFBFD] px-3.5 py-2.5 text-left text-[11px] font-medium text-muted transition-colors hover:text-ink"
          >
            <span>View all results in Products</span>
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
