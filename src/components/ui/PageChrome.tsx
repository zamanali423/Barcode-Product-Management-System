import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  backAction,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
  backAction?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {backAction ? <div className="mb-2">{backAction}</div> : null}
        {eyebrow ? <p className="eyebrow mb-1.5">{eyebrow}</p> : null}
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink sm:text-[24px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {icon ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[#F4F7FB] text-[#475569] [&_svg]:h-3.5 [&_svg]:w-3.5">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-[13.5px] font-semibold text-ink">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[12px] leading-4 text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-12 text-center sm:py-14',
        className,
      )}
    >
      <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-[#FAFBFD] text-[#64748B] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] [&_svg]:h-5 [&_svg]:w-5">
        {icon}
      </div>
      <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-[340px] text-[12.5px] leading-5 text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PageLoader({ label = 'Loading workspace…' }: { label?: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-muted">
      <Loader2 size={20} className="animate-spin text-brand-600" aria-hidden="true" />
      <p className="text-[12.5px]">{label}</p>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <span className="kbd">{children}</span>;
}
