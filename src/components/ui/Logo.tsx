import { cn } from '../../lib/utils';

export function LogoMark({ className, size = 34 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      role="img"
      aria-label="Vantage Inventory"
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id="vantage-mark" x1="18" y1="0" x2="18" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E40AF" />
          <stop offset="1" stopColor="#14234F" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="9" fill="url(#vantage-mark)" />
      <rect x="10" y="9.5" width="2" height="17" rx="0.4" fill="white" />
      <rect x="14" y="9.5" width="1" height="17" rx="0.3" fill="white" />
      <rect x="17" y="9.5" width="3.5" height="17" rx="0.4" fill="#60A5FA" />
      <rect x="22.5" y="9.5" width="1" height="17" rx="0.3" fill="white" />
      <rect x="25" y="9.5" width="2.2" height="17" rx="0.4" fill="white" />
    </svg>
  );
}

export function LogoWordmark({
  className,
  tone = 'light',
}: {
  className?: string;
  tone?: 'light' | 'dark';
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={34} />
      <div className="leading-none">
        <span
          className={cn(
            'block text-[16.5px] font-semibold tracking-[-0.02em]',
            tone === 'light' ? 'text-white' : 'text-ink',
          )}
        >
          Vantage
        </span>
        <span
          className={cn(
            'mt-1 block text-[9px] font-semibold uppercase tracking-[0.19em]',
            tone === 'light' ? 'text-[#8195BD]' : 'text-muted',
          )}
        >
          Inventory
        </span>
      </div>
    </div>
  );
}
