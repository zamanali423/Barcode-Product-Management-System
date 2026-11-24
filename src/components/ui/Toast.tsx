import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '../../lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastApi {
  toast: (input: { title: string; description?: string; variant?: ToastVariant; duration?: number }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const variantIcon: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 size={17} />,
  error: <CircleAlert size={17} />,
  info: <Info size={17} />,
};

const variantStyles: Record<ToastVariant, string> = {
  success: 'bg-[#F0FDF4] text-success',
  error: 'bg-[#FEF2F2] text-danger',
  info: 'bg-brand-50 text-brand-700',
};

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) window.clearTimeout(timer);
    timersRef.current.delete(id);
    setToasts((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback<ToastApi['toast']>(
    ({ title, description, variant = 'info', duration = 4200 }) => {
      toastCounter += 1;
      const id = toastCounter;
      const item: ToastItem = { id, title, description, variant };
      setToasts((previous) => [...previous.slice(-2), item]);
      const timer = window.setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, variant: 'success' }),
      error: (title, description) => toast({ title, description, variant: 'error', duration: 5200 }),
      info: (title, description) => toast({ title, description, variant: 'info' }),
    }),
    [toast],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-4 right-4 z-[80] flex flex-col items-end gap-2 sm:left-auto sm:w-[356px]"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role={item.variant === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full animate-toast-in items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-raised"
          >
            <span
              className={cn(
                'mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                variantStyles[item.variant],
              )}
            >
              {variantIcon[item.variant]}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] font-semibold leading-[18px] text-ink">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 text-[12px] leading-[17px] text-muted">{item.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss notification"
              className="-mr-1 -mt-1 rounded-md p-1 text-subtle transition-colors hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            >
              <X size={13.5} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
