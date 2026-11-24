import { Database, PanelLeftClose, PanelLeftOpen, X, type LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useProducts } from '../../hooks/useDatabaseData';
import { cn, formatNumber } from '../../lib/utils';
import { LogoMark, LogoWordmark } from '../ui/Logo';
import { isNavActive, navSections } from './navigation';

function SidebarLink({
  label,
  to,
  icon: Icon,
  active,
  collapsed,
  badge,
  onNavigate,
}: {
  label: string;
  to: string;
  icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        'group relative flex h-[38px] items-center gap-2.5 rounded-lg text-[12.8px] font-medium transition-colors duration-150',
        collapsed ? 'justify-center px-0' : 'px-2.5',
        active
          ? 'bg-[#182A52] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035)]'
          : 'text-[#97A9C8] hover:bg-white/[0.05] hover:text-white',
      )}
    >
      {active && !collapsed ? (
        <span
          aria-hidden="true"
          className="absolute left-0 top-2 h-[22px] w-[2px] rounded-r-full bg-[#5E9BFF]"
        />
      ) : null}
      <Icon
        size={17}
        strokeWidth={1.9}
        aria-hidden="true"
        className={cn(
          'shrink-0 transition-colors',
          active ? 'text-[#82B2FF]' : 'text-[#7D90B4] group-hover:text-[#B7C7E5]',
        )}
      />
      <span className={cn('truncate', collapsed ? 'sr-only' : 'block')}>{label}</span>
      {badge !== undefined && !collapsed ? (
        <span className="ml-auto rounded-[5px] bg-white/[0.07] px-1.5 py-0.5 text-[10px] font-medium tabular text-[#A9BAD7]">
          {formatNumber(badge)}
        </span>
      ) : null}
    </Link>
  );
}

function SidebarBody({
  collapsed,
  productCount,
  onToggleCollapsed,
  onCloseMobile,
  mobile,
}: {
  collapsed: boolean;
  productCount: number;
  onToggleCollapsed: () => void;
  onCloseMobile?: () => void;
  mobile: boolean;
}) {
  const { pathname } = useLocation();
  const isCollapsed = mobile ? false : collapsed;

  return (
    <>
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-white/[0.06]',
          isCollapsed ? 'justify-center px-3' : 'justify-between px-4',
        )}
      >
        {isCollapsed ? (
          <LogoMark size={32} />
        ) : (
          <LogoWordmark tone="light" />
        )}
        {mobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9DAFCE] transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X size={17} />
          </button>
        ) : null}
      </div>

      <nav
        aria-label="Primary"
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden py-3',
          isCollapsed ? 'px-2' : 'px-2.5',
        )}
      >
        {navSections.map((section, sectionIndex) => (
          <div key={section.label} className={cn(sectionIndex > 0 && 'mt-4')}>
            {isCollapsed ? (
              sectionIndex > 0 ? (
                <div className="mx-2 mb-2 h-px bg-white/[0.07]" aria-hidden="true" />
              ) : null
            ) : (
              <p className="mb-1.5 px-2.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#64789E]">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <SidebarLink
                  key={item.to}
                  label={item.label}
                  to={item.to}
                  icon={item.icon}
                  active={isNavActive(item.to, pathname)}
                  collapsed={isCollapsed}
                  badge={item.to === '/products' ? productCount : undefined}
                  onNavigate={onCloseMobile}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn('shrink-0 border-t border-white/[0.06] p-2.5', isCollapsed && 'px-2')}>
        {isCollapsed ? (
          <div
            title="Local database — IndexedDB, data stays on this device"
            className="mb-1 flex h-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.035] text-[#7D9CD0]"
          >
            <Database size={15} aria-hidden="true" />
          </div>
        ) : (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.035] px-2.5 py-2">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" aria-hidden="true" />
              <span className="text-[11px] font-medium text-[#C6D4EA]">Local database</span>
            </div>
            <p className="mt-0.5 pl-3 text-[10px] leading-4 text-[#7084A9]">
              IndexedDB · data stays on this device
            </p>
          </div>
        )}
        {!mobile ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'mt-1 flex h-8 w-full items-center gap-2 rounded-lg text-[11.5px] font-medium text-[#788CAD] transition-colors hover:bg-white/[0.05] hover:text-white',
              isCollapsed ? 'justify-center px-0' : 'px-2.5',
            )}
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            {!isCollapsed ? <span>Collapse sidebar</span> : <span className="sr-only">Expand sidebar</span>}
          </button>
        ) : null}
      </div>
    </>
  );
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const products = useProducts();
  const productCount = products.length;

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-white/[0.05] bg-gradient-to-b from-[#0D1C3E] to-[#08132B] shadow-[1px_0_0_rgba(255,255,255,0.02)] transition-[width] duration-200 ease-out lg:flex',
          collapsed ? 'w-[76px]' : 'w-[264px]',
        )}
      >
        <SidebarBody
          collapsed={collapsed}
          productCount={productCount}
          onToggleCollapsed={onToggleCollapsed}
          mobile={false}
        />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-[#050D20]/55 backdrop-blur-[2px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside
            aria-label="Mobile navigation"
            className="relative flex h-full w-[284px] animate-drawer-in flex-col border-r border-white/10 bg-gradient-to-b from-[#0D1C3E] to-[#08132B] shadow-pop"
          >
            <SidebarBody
              collapsed={false}
              productCount={productCount}
              onToggleCollapsed={onToggleCollapsed}
              onCloseMobile={onCloseMobile}
              mobile
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}
