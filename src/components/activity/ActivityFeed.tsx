import { PackagePlus, Pencil, Trash2 } from 'lucide-react';
import { cn, formatRelativeTime } from '../../lib/utils';
import type { ActivityEntry, ActivityType } from '../../types';

const activityMeta: Record<
  ActivityType,
  { label: string; icon: typeof PackagePlus; iconClass: string }
> = {
  created: {
    label: 'Product added',
    icon: PackagePlus,
    iconClass: 'bg-[#F0FDF4] text-success',
  },
  updated: {
    label: 'Product updated',
    icon: Pencil,
    iconClass: 'bg-brand-50 text-brand-700',
  },
  deleted: {
    label: 'Product deleted',
    icon: Trash2,
    iconClass: 'bg-[#FEF2F2] text-danger',
  },
};

export function ActivityFeed({
  entries,
  compact = false,
  className,
}: {
  entries: ActivityEntry[];
  compact?: boolean;
  className?: string;
}) {
  if (entries.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center px-5 py-9 text-center',
          className,
        )}
      >
        <p className="text-[12.5px] text-muted">No product activity yet.</p>
        <p className="mt-1 text-[11.5px] text-subtle">
          Adding, editing or deleting a product will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className={cn('divide-y divide-[#F0F3F8]', className)}>
      {entries.map((entry) => {
        const meta = activityMeta[entry.type];
        const Icon = meta.icon;
        return (
          <li key={entry.id ?? `${entry.createdAt}-${entry.barcode}`} className="flex gap-3 px-4 py-3 sm:px-5">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px]',
                meta.iconClass,
              )}
            >
              <Icon size={13.5} strokeWidth={2} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('truncate text-[12.5px] font-medium text-ink', compact && 'text-[12px]')}>
                {entry.productName}
              </p>
              <p className="mt-0.5 truncate text-[11.5px] text-muted">
                {entry.note ?? meta.label}
                <span className="mx-1 text-[#CBD5E1]">·</span>
                {formatRelativeTime(entry.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
