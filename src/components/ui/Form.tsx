import { Check, ChevronDown, CircleAlert } from 'lucide-react';
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../lib/utils';

const controlClass = 'input-base';

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlClass, className)}
      {...props}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlClass, 'h-auto min-h-[104px] resize-y py-2.5 leading-relaxed', className)}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean; wrapperClassName?: string }
>(function Select({ className, invalid, wrapperClassName, children, ...props }, ref) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          controlClass,
          'cursor-pointer appearance-none pr-9',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
    </div>
  );
});

export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
  action,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  const errorId = `${htmlFor ?? label.replace(/\s+/g, '-').toLowerCase()}-error`;
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-0.5 text-danger">
              *
            </span>
          ) : null}
          {!required ? <span className="ml-1.5 text-[11.5px] font-normal text-subtle">Optional</span> : null}
        </label>
        {action}
      </div>
      {children}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 pt-0.5 text-[12px] leading-4 text-danger"
        >
          <CircleAlert size={13} className="mt-px shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] leading-4 text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  className,
  id,
  ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
  ariaLabel?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <span className="relative mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <input
          id={inputId}
          type="checkbox"
          aria-label={ariaLabel}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40 peer-focus-visible:ring-offset-1',
            checked
              ? 'border-brand-900 bg-brand-900 text-white'
              : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8]',
            disabled && 'opacity-50',
          )}
        >
          {checked ? <Check size={12.5} strokeWidth={3} /> : null}
        </span>
      </span>
      {label || description ? (
        <span className="min-w-0">
          {label ? (
            <label
              htmlFor={inputId}
              className={cn(
                'block cursor-pointer text-[13px] font-medium leading-[18px] text-ink',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              {label}
            </label>
          ) : null}
          {description ? (
            <span className="mt-0.5 block text-[12px] leading-4 text-muted">{description}</span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-brand-900' : 'bg-[#CBD5E1]',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_2px_rgba(16,24,40,0.22)] transition-transform duration-200',
          checked ? 'translate-x-[17px]' : 'translate-x-[2px]',
        )}
      />
    </button>
  );
}
