import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useEnvironment';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { cn } from '../../lib/utils';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { getPageMeta } from './navigation';

export function AppShell() {
  const { pathname, search } = useLocation();
  const [collapsed, setCollapsed] = useLocalStorage('vantage.sidebar.collapsed', false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const meta = getPageMeta(pathname);
  useDocumentTitle(meta.title);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, search]);

  // Start each screen at the top; scanner results and long tables otherwise
  // leave the next route scrolled halfway down.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-dvh bg-canvas">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((previous) => !previous)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div
        className={cn(
          'flex min-h-dvh flex-col transition-[padding-left] duration-200 ease-out',
          collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]',
        )}
      >
        <Topbar onOpenSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 pb-[86px] lg:pb-0">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-7">
            <div key={pathname} className="animate-fade-in">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
