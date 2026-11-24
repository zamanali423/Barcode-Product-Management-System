import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'neutral' | 'brand' | 'success' | 'danger' | 'warning' | 'outline';

const variants: Record<BadgeVariant, string> = {
  neutral: 'border-[#E2E8F0] bg-[#F1F5F9] text-[#475569]',
  brand: 'border-brand-100 bg-brand-50 text-brand-800',
  success: 'border-[#DCFCE7] bg-[#F0FDF4] text-[#15803D]',
  danger: 'border-[#FEE2E2] bg-[#FEF2F2] text-[#B91C1C]',
  warning: 'border-[#FEF3C7] bg-[#FFFBEB] text-[#B45309]',
  outline: 'border-[#E5EAF1] bg-white text-[#64748B]',
};

export function Badge({
  children,
  variant = 'neutral',
  className,
  dot = false,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4',
        variants[variant],
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            variant === 'success'
              ? 'bg-success'
              : variant === 'danger'
                ? 'bg-danger'
                : variant === 'warning'
                  ? 'bg-warning'
                  : variant === 'brand'
                    ? 'bg-brand-500'
                    : 'bg-slate-400',
          )}
        />
      ) : null}
      {children}
    </span>
  );
}
