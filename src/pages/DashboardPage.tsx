import {
  ArrowRight,
  CalendarPlus,
  FolderTree,
  Package,
  PackageOpen,
  Plus,
  ScanLine,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ActivityFeed } from '../components/activity/ActivityFeed';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState, PageHeader, SectionHeader } from '../components/ui/PageChrome';
import {
  useCategories,
  useProducts,
  useRecentActivity,
  useSettings,
  useTodayScanSummary,
} from '../hooks/useDatabaseData';
import { formatNumber, formatPrice, formatRelativeTime } from '../lib/utils';
import type { Product } from '../types';

function StatCard({
  label,
  value,
  meta,
  icon,
  iconClassName,
}: {
  label: string;
  value: string;
  meta: string;
  icon: ReactNode;
  iconClassName: string;
}) {
  return (
    <div className="card p-4 sm:p-4.5">
      <div className="flex items-start justify-between gap-3">
        <p className="pt-0.5 text-[11.5px] font-medium text-muted">{label}</p>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] ${iconClassName}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-1.5 text-[24px] font-semibold tracking-[-0.03em] text-ink tabular sm:text-[26px]">
        {value}
      </p>
      <p className="mt-1 line-clamp-1 text-[10.5px] text-subtle">{meta}</p>
    </div>
  );
}

function RecentProductRow({
  product,
  currency,
  onOpen,
}: {
  product: Product;
  currency: string;
  onOpen: (product: Product) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(product)}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#FAFCFE] sm:px-5"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-[#F8FAFD] text-[#64748B]">
        <Package size={14} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium text-ink">{product.name}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-subtle">
          <span className="truncate">{product.category || 'Uncategorised'}</span>
          <span className="text-[#CBD5E1]">·</span>
          <span className="truncate font-mono">{product.sku || 'No SKU'}</span>
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-[12px] font-semibold tabular text-ink">
          {formatPrice(product.price, currency as 'PKR')}
        </span>
        <span className="mt-0.5 block text-[10px] text-subtle">
          {formatRelativeTime(product.createdAt)}
        </span>
      </span>
    </button>
  );
}

export default function DashboardPage() {
  const products = useProducts();
  const categories = useCategories();
  const activity = useRecentActivity(6);
  const scanSummary = useTodayScanSummary();
  const settings = useSettings();
  const navigate = useNavigate();

  const now = useMemo(() => Date.now(), []);
  const addedThisWeek = useMemo(
    () => products.filter((product) => now - new Date(product.createdAt).getTime() < 604_800_000).length,
    [products, now],
  );
  const uncategorised = useMemo(
    () => products.filter((product) => !product.category).length,
    [products],
  );
  const categoryBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      const name = product.category || 'Uncategorised';
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [products]);
  const maxCategoryCount = categoryBreakdown[0]?.[1] ?? 1;

  const openProduct = (product: Product) => {
    navigate(`/products?q=${encodeURIComponent(product.barcode)}`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description={`A live view of ${settings.storeName}'s catalogue, products and scanning activity.`}
        actions={
          <>
            <Button
              iconLeft={<ScanLine size={14} />}
              onClick={() => navigate('/scanner')}
              className="hidden xs:inline-flex"
            >
              Quick scan
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total products"
          value={formatNumber(products.length)}
          meta={
            products.length === 0
              ? 'No products in the catalogue yet'
              : `Last added ${formatRelativeTime(products[0]?.createdAt ?? now).toLowerCase()}`
          }
          icon={<Package size={14} aria-hidden="true" />}
          iconClassName="bg-brand-50 text-brand-700"
        />
        <StatCard
          label="Categories"
          value={formatNumber(categories.length)}
          meta={
            products.length === 0
              ? 'No categories in use'
              : uncategorised === 0
                ? 'Every product is categorised'
                : `${formatNumber(uncategorised)} uncategorised product${uncategorised === 1 ? '' : 's'}`
          }
          icon={<FolderTree size={14} aria-hidden="true" />}
          iconClassName="bg-[#F4F7FB] text-[#475569]"
        />
        <StatCard
          label="Added this week"
          value={formatNumber(addedThisWeek)}
          meta={addedThisWeek === 0 ? 'No additions in the last 7 days' : 'Products created in the last 7 days'}
          icon={<CalendarPlus size={14} aria-hidden="true" />}
          iconClassName="bg-[#F0FDF4] text-success"
        />
        <StatCard
          label="Scans today"
          value={formatNumber(scanSummary.total)}
          meta={
            scanSummary.total === 0
              ? 'No barcodes scanned today'
              : `${formatNumber(scanSummary.found)} matched · ${formatNumber(scanSummary.total - scanSummary.found)} unknown`
          }
          icon={<ScanLine size={14} aria-hidden="true" />}
          iconClassName="bg-[#F4F7FB] text-[#475569]"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="card overflow-hidden">
          <SectionHeader
            title="Recently added products"
            description="The latest records in your catalogue"
            icon={<Package size={14} />}
            action={
              <Link
                to="/products"
                className="inline-flex items-center gap-1 text-[11.5px] font-medium text-brand-700 transition-colors hover:text-brand-800"
              >
                View all
                <ArrowRight size={12.5} aria-hidden="true" />
              </Link>
            }
          />
          {products.length === 0 ? (
            <EmptyState
              icon={<PackageOpen />}
              title="Your catalogue is empty"
              description="Add your first product to generate a barcode and make it available to scan instantly."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  iconLeft={<Plus size={13} />}
                  onClick={() => navigate('/products/new')}
                >
                  Add your first product
                </Button>
              }
              className="py-10"
            />
          ) : (
            <div className="divide-y divide-[#F0F3F8]">
              {products.slice(0, 5).map((product) => (
                <RecentProductRow
                  key={product.id}
                  product={product}
                  currency={settings.currency}
                  onOpen={openProduct}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className="relative flex flex-1 flex-col overflow-hidden rounded-xl border border-[#142B57] bg-gradient-to-b from-[#102148] to-[#0A1733] p-5 text-white shadow-card">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-brand-500/15 blur-3xl"
            />
            <div className="relative flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.13em] text-[#93A9CD]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" />
                Scanner ready
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-[#A8C2EC]">
                <ScanLine size={16} aria-hidden="true" />
              </span>
            </div>
            <h2 className="relative mt-5 text-[16px] font-semibold tracking-[-0.01em] text-white">
              Look up a product instantly
            </h2>
            <p className="relative mt-1.5 text-[11.5px] leading-[18px] text-[#97ACCD]">
              Scan with your camera, a USB scanner, or enter a barcode manually. The matching
              product and price appear immediately.
            </p>
            <div className="relative mt-auto pt-5">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  iconLeft={<ScanLine size={13} />}
                  className="border-white/10 bg-white text-brand-950 shadow-none hover:bg-[#EEF4FE] active:bg-[#E4EDFC]"
                  onClick={() => navigate('/scanner')}
                >
                  Open scanner
                </Button>
                <Button
                  size="sm"
                  iconLeft={<Tag size={13} />}
                  className="border-white/10 bg-white/[0.06] text-[#D9E5F8] shadow-none hover:border-white/20 hover:bg-white/[0.1] hover:text-white"
                  onClick={() => navigate('/labels')}
                >
                  Print labels
                </Button>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[10px] text-[#7186AA]">
                <ShieldCheck size={12} aria-hidden="true" />
                Works fully offline · no connection required
              </p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <SectionHeader title="Local workspace" icon={<ShieldCheck size={14} />} />
            <dl className="divide-y divide-[#F0F3F8] px-4 sm:px-5">
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[11.5px] text-muted">Local products</dt>
                <dd className="text-[11.5px] font-medium tabular text-ink">
                  {formatNumber(products.length)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[11.5px] text-muted">Last backup</dt>
                <dd className="text-[11.5px] font-medium text-ink">
                  {settings.lastBackupAt ? (
                    formatRelativeTime(settings.lastBackupAt)
                  ) : (
                    <Badge variant="warning">Not backed up</Badge>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[11.5px] text-muted">Storage</dt>
                <dd className="text-[11.5px] font-medium text-ink">IndexedDB</dd>
              </div>
            </dl>
            <Link
              to="/settings"
              className="flex items-center justify-between border-t border-line bg-[#FAFBFD] px-4 py-2.5 text-[11px] font-medium text-muted transition-colors hover:text-ink sm:px-5"
            >
              Manage data & backups
              <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="card overflow-hidden">
          <SectionHeader
            title="Recent product activity"
            description="Product changes made on this device"
            icon={<Package size={14} />}
            action={
              <Link
                to="/products"
                className="inline-flex items-center gap-1 text-[11.5px] font-medium text-brand-700 transition-colors hover:text-brand-800"
              >
                Products
                <ArrowRight size={12.5} aria-hidden="true" />
              </Link>
            }
          />
          <ActivityFeed entries={activity} />
        </div>

        <div className="card overflow-hidden">
          <SectionHeader
            title="Catalogue by category"
            description="Product distribution"
            icon={<FolderTree size={14} />}
          />
          {categoryBreakdown.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[12px] text-muted">No products to summarise yet.</p>
              <p className="mt-1 text-[11px] text-subtle">Category totals will appear here.</p>
            </div>
          ) : (
            <ul className="space-y-3.5 px-4 py-4 sm:px-5">
              {categoryBreakdown.map(([name, count]) => (
                <li key={name}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-[11.5px] text-[#475569]">{name}</span>
                    <span className="text-[11px] font-medium tabular text-ink">{formatNumber(count)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F1F5F9]">
                    <div
                      className="h-full rounded-full bg-[#3B82F6]/80"
                      style={{ width: `${Math.max(6, (count / maxCategoryCount) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
