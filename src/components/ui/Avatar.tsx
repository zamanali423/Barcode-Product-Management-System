import { cn, initials } from '../../lib/utils';

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full border border-white/60 bg-gradient-to-b from-[#26406F] to-[#15294F] font-semibold tracking-wide text-white shadow-[0_1px_2px_rgba(11,23,54,0.2)]',
        size === 'sm' && 'h-7 w-7 text-[10px]',
        size === 'md' && 'h-8 w-8 text-[11px]',
        size === 'lg' && 'h-10 w-10 text-[12px]',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
