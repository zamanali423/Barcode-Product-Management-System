import {
  LayoutDashboard,
  Package,
  PackagePlus,
  ScanLine,
  Settings,
  Tag,
  type LucideIcon,
} from 'lucide-react';

export interface NavItemConfig {
  label: string;
  to: string;
  icon: LucideIcon;
}

export interface NavSectionConfig {
  label: string;
  items: NavItemConfig[];
}

export const navSections: NavSectionConfig[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard }],
  },
  {
    label: 'Catalogue',
    items: [
      { label: 'Products', to: '/products', icon: Package },
      { label: 'Add product', to: '/products/new', icon: PackagePlus },
      { label: 'Barcode labels', to: '/labels', icon: Tag },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Barcode scanner', to: '/scanner', icon: ScanLine },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
];

export const mobileNavItems = [
  { label: 'Home', to: '/', icon: LayoutDashboard },
  { label: 'Products', to: '/products', icon: Package },
  { label: 'Scan', to: '/scanner', icon: ScanLine },
  { label: 'Labels', to: '/labels', icon: Tag },
  { label: 'Settings', to: '/settings', icon: Settings },
];

export function isNavActive(to: string, pathname: string): boolean {
  if (to === '/') return pathname === '/';
  if (to === '/products') {
    return pathname === '/products' || (pathname.startsWith('/products/') && pathname !== '/products/new');
  }
  if (to === '/products/new') return pathname === '/products/new';
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function getPageMeta(pathname: string): { title: string; section: string } {
  if (pathname === '/') return { title: 'Dashboard', section: 'Overview' };
  if (pathname === '/products') return { title: 'Products', section: 'Catalogue' };
  if (pathname === '/products/new') return { title: 'Add product', section: 'Catalogue' };
  if (/^\/products\/\d+\/edit$/.test(pathname)) {
    return { title: 'Edit product', section: 'Catalogue' };
  }
  if (pathname === '/scanner') return { title: 'Barcode scanner', section: 'Operations' };
  if (pathname === '/labels') return { title: 'Barcode labels', section: 'Catalogue' };
  if (pathname === '/settings') return { title: 'Settings', section: 'Workspace' };
  return { title: 'Page not found', section: 'Vantage' };
}
