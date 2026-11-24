import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { isNavActive, mobileNavItems } from './navigation';

export function MobileNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Mobile primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex h-[58px] max-w-md items-stretch px-1">
        {mobileNavItems.map((item) => {
          const active = isNavActive(item.to, pathname);
          const isScan = item.to === '/scanner';
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[9.5px] font-medium transition-colors',
                active ? 'text-brand-900' : 'text-[#7A8BA5] hover:text-ink',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
                  isScan
                    ? active
                      ? 'bg-brand-900 text-white shadow-[0_1px_3px_rgba(11,23,54,0.3)]'
                      : 'bg-brand-50 text-brand-700'
                    : active
                      ? 'bg-[#EFF4FD] text-brand-800'
                      : 'text-[#7A8BA5]',
                )}
              >
                <Icon size={isScan ? 17 : 16.5} strokeWidth={active ? 2.2 : 1.9} aria-hidden="true" />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
