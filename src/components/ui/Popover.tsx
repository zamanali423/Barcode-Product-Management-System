import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { cn } from '../../lib/utils';

export function Popover({
  trigger,
  children,
  label,
  buttonClassName,
  panelClassName,
  align = 'end',
  ariaHasPopup = 'dialog',
}: {
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  label: string;
  buttonClassName?: string;
  panelClassName?: string;
  align?: 'start' | 'end';
  ariaHasPopup?: 'dialog' | 'menu' | 'listbox' | 'true';
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const close = useCallback(() => setOpen(false), []);

  useClickOutside([containerRef], close, open);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup={ariaHasPopup}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((previous) => !previous)}
        className={cn(
          'inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2',
          buttonClassName,
        )}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className={cn(
            'absolute top-full z-40 mt-2 animate-rise overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-pop',
            align === 'end' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
            panelClassName,
          )}
        >
          {children(close)}
        </div>
      ) : null}
    </div>
  );
}
