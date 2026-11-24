import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'danger-ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-brand-900/10 bg-brand-900 text-white shadow-[0_1px_2px_rgba(11,23,54,0.2)] hover:bg-brand-800 active:bg-brand-950',
  secondary:
    'border border-[#D5DDE8] bg-white text-ink shadow-[0_1px_1px_rgba(16,24,40,0.03)] hover:border-[#C3CEDA] hover:bg-[#FAFBFD] active:bg-[#F4F7FB]',
  ghost: 'text-slate-600 hover:bg-slate-100/80 hover:text-ink active:bg-slate-200/60',
  subtle:
    'border border-brand-100 bg-brand-50 text-brand-800 hover:border-brand-200 hover:bg-brand-100',
  danger:
    'border border-danger/10 bg-danger text-white shadow-[0_1px_2px_rgba(220,38,38,0.2)] hover:bg-[#B91C1C] active:bg-[#991B1B]',
  'danger-ghost': 'text-danger hover:bg-danger/[0.06] active:bg-danger/10',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-[7px] px-2.5 text-[12.5px]',
  md: 'h-9 gap-2 rounded-lg px-3.5 text-[13px]',
  lg: 'h-10 gap-2 rounded-lg px-4 text-[13.5px]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export const buttonBaseClass =
  'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'secondary',
    size = 'md',
    loading = false,
    iconLeft,
    iconRight,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonBaseClass, variantClasses[variant], sizeClasses[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 15} className="animate-spin" aria-hidden="true" />
      ) : (
        iconLeft
      )}
      {children}
      {!loading ? iconRight : null}
    </button>
  );
});

interface IconButtonProps extends Omit<ButtonProps, 'iconLeft' | 'iconRight' | 'children'> {
  label: string;
  icon: ReactNode;
  iconSize?: 'sm' | 'md';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, className, variant = 'ghost', iconSize = 'md', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        buttonBaseClass,
        variantClasses[variant],
        'h-8 w-8 shrink-0 rounded-[7px] p-0',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'flex items-center justify-center',
          iconSize === 'sm' ? '[&_svg]:h-3.5 [&_svg]:w-3.5' : '[&_svg]:h-4 [&_svg]:w-4',
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
    </button>
  );
});
