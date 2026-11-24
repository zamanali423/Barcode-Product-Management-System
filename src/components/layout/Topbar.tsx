import {
  ArrowRight,
  Bell,
  ChevronDown,
  Download,
  Menu,
  PackagePlus,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRecentActivity, useSettings } from '../../hooks/useDatabaseData';
import { useInstallPrompt } from '../../hooks/useEnvironment';
import { ActivityFeed } from '../activity/ActivityFeed';
import { Avatar } from '../ui/Avatar';
import { Button, IconButton } from '../ui/Button';
import { Popover } from '../ui/Popover';
import { useToast } from '../ui/Toast';
import { GlobalSearch } from './GlobalSearch';
import { getPageMeta } from './navigation';

function Notifications() {
  const activity = useRecentActivity(5);
  const navigate = useNavigate();
  const recentToday = activity.some(
    (entry) => Date.now() - new Date(entry.createdAt).getTime() < 86_400_000,
  );

  return (
    <Popover
      label="Notifications"
      buttonClassName="relative h-8 w-8 rounded-[7px] text-muted hover:bg-[#F4F6FA] hover:text-ink"
      panelClassName="w-[336px]"
      trigger={
        <>
          <Bell size={16.5} strokeWidth={1.9} aria-hidden="true" />
          {recentToday ? (
            <span className="absolute right-[7px] top-[7px] h-1.5 w-1.5 rounded-full bg-brand-500 ring-2 ring-white" />
          ) : null}
        </>
      }
    >
      {(close) => (
        <>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-[12.5px] font-semibold text-ink">Recent activity</span>
            <span className="text-[10.5px] text-subtle">Product changes</span>
          </div>
          <ActivityFeed entries={activity} compact />
          <button
            type="button"
            onClick={() => {
              close();
              navigate('/');
            }}
            className="flex w-full items-center justify-between border-t border-line bg-[#FAFBFD] px-4 py-2.5 text-[11.5px] font-medium text-muted transition-colors hover:text-ink"
          >
            View dashboard activity
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        </>
      )}
    </Popover>
  );
}

function WorkspaceMenu() {
  const { storeName } = useSettings();
  const { canInstall, promptInstall } = useInstallPrompt();
  const navigate = useNavigate();
  const toast = useToast();

  return (
    <Popover
      label="Workspace menu"
      buttonClassName="ml-0.5 h-9 gap-2 rounded-full py-0 pl-0.5 pr-0.5 text-muted hover:bg-[#F4F6FA] sm:pr-2"
      panelClassName="w-[278px]"
      trigger={
        <span className="flex items-center gap-2">
          <Avatar name={storeName} />
          <span className="hidden text-left xl:block">
            <span className="block max-w-[130px] truncate text-[11.5px] font-medium leading-4 text-ink">
              {storeName}
            </span>
            <span className="block text-[10px] leading-3.5 text-subtle">Local workspace</span>
          </span>
          <ChevronDown size={13} className="hidden text-subtle xl:block" aria-hidden="true" />
        </span>
      }
    >
      {(close) => (
        <>
          <div className="flex items-center gap-3 border-b border-line bg-[#FAFBFD] px-4 py-3.5">
            <Avatar name={storeName} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-semibold text-ink">{storeName}</p>
              <p className="mt-0.5 text-[10.5px] text-muted">Local workspace · Offline-first</p>
            </div>
          </div>
          <div className="p-1.5">
            <button
              type="button"
              onClick={() => {
                close();
                navigate('/settings');
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium text-ink transition-colors hover:bg-[#F4F6FA]"
            >
              <Settings size={15} className="text-muted" aria-hidden="true" />
              Workspace settings
            </button>
            <button
              type="button"
              onClick={() => {
                close();
                navigate('/products/new');
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium text-ink transition-colors hover:bg-[#F4F6FA]"
            >
              <PackagePlus size={15} className="text-muted" aria-hidden="true" />
              Register a product
            </button>
            {canInstall ? (
              <button
                type="button"
                onClick={async () => {
                  close();
                  const result = await promptInstall();
                  if (result === 'accepted') toast.success('Application installed');
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium text-ink transition-colors hover:bg-[#F4F6FA]"
              >
                <Download size={15} className="text-muted" aria-hidden="true" />
                Install application
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2 border-t border-line bg-[#FAFBFD] px-4 py-2.5 text-[10.5px] text-muted">
            <ShieldCheck size={13} className="text-success" aria-hidden="true" />
            Data is stored only on this device
          </div>
        </>
      )}
    </Popover>
  );
}

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const meta = getPageMeta(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-line bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Open navigation"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[#F4F6FA] hover:text-ink lg:hidden"
      >
        <Menu size={18} aria-hidden="true" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
        <span className="hidden text-[12px] text-subtle md:inline">{meta.section}</span>
        <span className="hidden text-[11px] text-[#CBD5E1] md:inline">/</span>
        <h1 className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-ink md:text-[13px]">
          {meta.title}
        </h1>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <GlobalSearch />
        <IconButton
          label="Search products"
          icon={<Search />}
          className="md:hidden"
          onClick={() => navigate('/products')}
        />
        <Button
          variant="primary"
          size="sm"
          iconLeft={<ScanLine size={14} />}
          className="hidden sm:inline-flex"
          onClick={() => navigate('/scanner')}
        >
          Scan
        </Button>
        <IconButton
          label="Open barcode scanner"
          icon={<ScanLine />}
          variant="primary"
          className="w-8 sm:hidden"
          onClick={() => navigate('/scanner')}
        />
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
        <div className="hidden sm:block">
          <Notifications />
        </div>
        <WorkspaceMenu />
      </div>
    </header>
  );
}
