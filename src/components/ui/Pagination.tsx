import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select } from './Form';
import { cn, formatNumber } from '../../lib/utils';

function pageItems(current: number, pageCount: number): Array<number | 'ellipsis'> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages = new Set<number>([1, pageCount, current - 1, current, current + 1]);
  if (current <= 4) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
    pages.add(5);
  }
  if (current >= pageCount - 3) {
    pages.add(pageCount - 1);
    pages.add(pageCount - 2);
    pages.add(pageCount - 3);
    pages.add(pageCount - 4);
  }
  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);
  const items: Array<number | 'ellipsis'> = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) items.push('ellipsis');
    items.push(page);
  });
  return items;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-muted">
        <span>
          Showing <span className="font-medium text-ink">{formatNumber(from)}</span>–
          <span className="font-medium text-ink">{formatNumber(to)}</span> of{' '}
          <span className="font-medium text-ink">{formatNumber(total)}</span>
        </span>
        {onPageSizeChange ? (
          <span className="flex items-center gap-1.5">
            <span className="hidden xs:inline">Rows</span>
            <Select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              aria-label="Rows per page"
              className="h-7 w-[62px] rounded-md text-[11.5px]"
              wrapperClassName="inline-block"
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </span>
        ) : null}
      </div>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-muted transition-colors hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft size={15} />
        </button>
        <div className="hidden items-center gap-1 sm:flex">
          {pageItems(page, pageCount).map((item, index) =>
            item === 'ellipsis' ? (
              <span
                key={`ellipsis-${index}`}
                className="flex h-8 w-7 items-center justify-center text-[12px] text-subtle"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                aria-current={item === page ? 'page' : undefined}
                onClick={() => onPageChange(item)}
                className={cn(
                  'flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-[12px] font-medium tabular transition-colors',
                  item === page
                    ? 'bg-brand-900 text-white'
                    : 'border border-transparent text-muted hover:border-line hover:bg-canvas hover:text-ink',
                )}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <span className="px-2 text-[12px] text-muted sm:hidden">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-muted transition-colors hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight size={15} />
        </button>
      </nav>
    </div>
  );
}
