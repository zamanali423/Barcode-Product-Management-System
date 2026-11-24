import {
  Building2,
  Check,
  Database,
  Download,
  FileJson,
  Info,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Tag,
  TriangleAlert,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { buildBackup, parseBackupJson, resetWorkspace, restoreBackup, type ParsedBackup } from '../db/backup';
import { updateSettings } from '../db/settings';
import { useCategories, useProducts, useSettings } from '../hooks/useDatabaseData';
import { useInstallPrompt, useOnlineStatus } from '../hooks/useEnvironment';
import { CURRENCIES } from '../lib/currencies';
import { messageFromError } from '../lib/errors';
import { cn, downloadJson, formatDateTime, formatNumber, pluralize } from '../lib/utils';
import type { CurrencyCode } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog, Dialog } from '../components/ui/Dialog';
import { FormField, Input, Select, Switch } from '../components/ui/Form';
import { LogoMark } from '../components/ui/Logo';
import { PageHeader, SectionHeader } from '../components/ui/PageChrome';
import { useToast } from '../components/ui/Toast';

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5">
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-muted">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const settings = useSettings();
  const products = useProducts();
  const categories = useCategories();
  const toast = useToast();
  const { canInstall, isStandalone, promptInstall } = useInstallPrompt();
  const online = useOnlineStatus();

  const [storeName, setStoreName] = useState(settings.storeName);
  const [currency, setCurrency] = useState<CurrencyCode>(settings.currency);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<ParsedBackup | null>(null);
  const [backupFilename, setBackupFilename] = useState('');
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [restoring, setRestoring] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStoreName(settings.storeName);
    setCurrency(settings.currency);
  }, [settings.storeName, settings.currency]);

  const profileDirty =
    storeName.trim() !== settings.storeName || currency !== settings.currency;

  const savePreference = async (patch: Parameters<typeof updateSettings>[0], errorTitle: string) => {
    try {
      await updateSettings(patch);
    } catch (error) {
      toast.error(errorTitle, messageFromError(error));
    }
  };

  const handleSaveProfile = async () => {
    const trimmed = storeName.trim();
    if (!trimmed) {
      setProfileError('Workspace name is required.');
      return;
    }
    setProfileError(null);
    setSavingProfile(true);
    try {
      await updateSettings({ storeName: trimmed, currency });
      toast.success('Workspace updated', 'Your store details have been saved.');
    } catch (error) {
      toast.error('Could not save the workspace', messageFromError(error));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const backup = await buildBackup();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(backup, `vantage-backup-${stamp}.json`);
      await updateSettings({ lastBackupAt: new Date() });
      toast.success(
        'Backup downloaded',
        `${pluralize(backup.products.length, 'product')} · ${pluralize(
          backup.categories.length,
          'category',
          'categories',
        )}`,
      );
    } catch (error) {
      toast.error('Could not create the backup', messageFromError(error));
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Backup file is too large', 'The maximum supported size is 20 MB.');
      return;
    }
    setImportError(null);
    try {
      const text = await file.text();
      const parsed = parseBackupJson(text);
      setPendingBackup(parsed);
      setBackupFilename(file.name);
      setRestoreMode('merge');
    } catch (error) {
      toast.error('Backup could not be read', messageFromError(error));
    }
  };

  const handleRestore = async () => {
    if (!pendingBackup) return;
    setRestoring(true);
    setImportError(null);
    try {
      const result = await restoreBackup(pendingBackup, restoreMode);
      setPendingBackup(null);
      toast.success(
        restoreMode === 'merge' ? 'Backup merged' : 'Backup restored',
        restoreMode === 'merge'
          ? `${pluralize(result.productsAdded, 'product')} added, ${pluralize(
              result.productsSkipped,
              'product skipped',
              'products skipped',
            )}.`
          : `${pluralize(result.productsAdded, 'product')} and ${pluralize(
              result.scansRestored,
              'scan',
            )} restored.`,
      );
    } catch (error) {
      setImportError(messageFromError(error));
      toast.error('Restore failed', messageFromError(error));
    } finally {
      setRestoring(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetWorkspace();
      setResetOpen(false);
      toast.success('Workspace cleared', 'All catalogue and history data was removed.');
    } catch (error) {
      toast.error('Could not clear the workspace', messageFromError(error));
    } finally {
      setResetting(false);
    }
  };

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        toast.success('Application installed', 'Vantage is now available from your device.');
      }
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Configure your workspace, scanning behaviour, labels and local data."
      />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="card overflow-hidden">
            <SectionHeader
              title="Business profile"
              description="Shown in the workspace and on printed labels"
              icon={<Building2 size={14} />}
            />
            <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5">
              <FormField
                label="Workspace name"
                htmlFor="store-name"
                required
                error={profileError ?? undefined}
                hint="Appears at the top of the application and on label headers."
              >
                <Input
                  id="store-name"
                  value={storeName}
                  onChange={(event) => {
                    setStoreName(event.target.value);
                    setProfileError(null);
                  }}
                  invalid={Boolean(profileError)}
                  placeholder="e.g. Vantage Inventory"
                  maxLength={80}
                />
              </FormField>
              <FormField
                label="Currency"
                htmlFor="store-currency"
                required
                hint="Applied to every product price in the app and on labels."
              >
                <Select
                  id="store-currency"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
                >
                  {CURRENCIES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.code} — {item.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <div className="flex flex-col gap-2 border-t border-line bg-[#FAFBFD] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-[10.5px] text-subtle">
                Currency changes update price formatting everywhere immediately after saving.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveProfile}
                disabled={!profileDirty}
                loading={savingProfile}
              >
                Save profile
              </Button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <SectionHeader
              title="Scanning"
              description="Feedback and duplicate protection"
              icon={<ScanLine size={14} />}
            />
            <div className="divide-y divide-[#F0F3F8]">
              <SettingRow
                title="Audio feedback"
                description="Play a short tone when a barcode matches or is not found."
              >
                <Switch
                  checked={settings.scannerSound}
                  onCheckedChange={(checked) =>
                    void savePreference({ scannerSound: checked }, 'Could not update sound feedback')
                  }
                  label="Audio feedback"
                />
              </SettingRow>
              <SettingRow
                title="Duplicate scan window"
                description="Rapid repeat reads of the same barcode are ignored during this period."
              >
                <Select
                  value={settings.duplicateWindowSeconds}
                  onChange={(event) =>
                    void savePreference(
                      { duplicateWindowSeconds: Number(event.target.value) },
                      'Could not update duplicate protection',
                    )
                  }
                  aria-label="Duplicate scan window"
                  className="h-8 w-[150px] rounded-md text-[11.5px]"
                  wrapperClassName="inline-block"
                >
                  {[1, 2, 3, 5, 10].map((seconds) => (
                    <option key={seconds} value={seconds}>
                      {seconds} second{seconds === 1 ? '' : 's'}
                    </option>
                  ))}
                </Select>
              </SettingRow>
            </div>
            <p className="border-t border-line bg-[#FAFBFD] px-4 py-2.5 text-[10.5px] text-subtle sm:px-5">
              Preferences save automatically.
            </p>
          </div>

          <div className="card overflow-hidden">
            <SectionHeader
              title="Labels"
              description="Defaults for barcode label printing"
              icon={<Tag size={14} />}
            />
            <div className="divide-y divide-[#F0F3F8]">
              <SettingRow
                title="Default label size"
                description="Preselected on the barcode labels page. Standard fits three labels per A4 row."
              >
                <Select
                  value={settings.defaultLabelSize}
                  onChange={(event) =>
                    void savePreference(
                      { defaultLabelSize: event.target.value as 'standard' | 'large' },
                      'Could not update the label size',
                    )
                  }
                  aria-label="Default label size"
                  className="h-8 w-[210px] rounded-md text-[11.5px]"
                  wrapperClassName="inline-block"
                >
                  <option value="standard">Standard · 54 × 32 mm</option>
                  <option value="large">Large · 86 × 50 mm</option>
                </Select>
              </SettingRow>
            </div>
            <p className="border-t border-line bg-[#FAFBFD] px-4 py-2.5 text-[10.5px] text-subtle sm:px-5">
              Labels always include the product name, price, SKU and a CODE128 barcode.
            </p>
          </div>

          <div className="card overflow-hidden">
            <SectionHeader
              title="Data & backup"
              description="Your catalogue lives only on this device"
              icon={<Database size={14} />}
            />
            <div className="grid grid-cols-3 divide-x divide-[#F0F3F8] border-b border-line">
              <div className="px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-subtle">
                  Products
                </p>
                <p className="mt-1 text-[16px] font-semibold tabular text-ink">
                  {formatNumber(products.length)}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-subtle">
                  Categories
                </p>
                <p className="mt-1 text-[16px] font-semibold tabular text-ink">
                  {formatNumber(categories.length)}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-subtle">
                  Last backup
                </p>
                <p className="mt-1 truncate text-[11px] font-medium text-ink">
                  {settings.lastBackupAt ? formatDateTime(settings.lastBackupAt) : 'Never'}
                </p>
              </div>
            </div>

            <div className="divide-y divide-[#F0F3F8]">
              <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-[#F8FAFD] text-[#475569]">
                    <FileJson size={15} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-medium text-ink">Export a JSON backup</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-muted">
                      Includes products, categories, scans, activity, and preferences.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  iconLeft={<Download size={13} />}
                  onClick={handleExport}
                  loading={exporting}
                  className="shrink-0"
                >
                  Download backup
                </Button>
              </div>

              <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-[#F8FAFD] text-[#475569]">
                    <Upload size={15} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-medium text-ink">Restore from a backup</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-muted">
                      Merge missing products or replace the entire workspace.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0"
                >
                  Choose file
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelected}
                  className="hidden"
                  aria-label="Choose a backup file"
                />
              </div>
            </div>
            <p className="flex items-start gap-1.5 border-t border-line bg-[#FAFBFD] px-4 py-2.5 text-[10.5px] leading-4 text-subtle sm:px-5">
              <Info size={12} className="mt-px shrink-0" aria-hidden="true" />
              Store backup files somewhere safe. Clearing browser storage or site data removes this
              workspace.
            </p>
          </div>

          <div className="card overflow-hidden border-[#F1DEDE]">
            <SectionHeader
              title="Danger zone"
              description="Irreversible workspace actions"
              icon={<TriangleAlert size={14} />}
            />
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <p className="text-[12.5px] font-medium text-ink">Delete all catalogue data</p>
                <p className="mt-0.5 max-w-md text-[11px] leading-4 text-muted">
                  Permanently removes products, categories, scans and activity. Your settings and
                  preferences are kept.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setResetOpen(true)}
                className="shrink-0"
              >
                Clear workspace
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-5 xl:sticky xl:top-[84px]">
          <div className="card overflow-hidden">
            <SectionHeader title="Workspace status" icon={<ShieldCheck size={14} />} />
            <div className="px-4 py-4 sm:px-5">
              <div className="flex items-center gap-3">
                <LogoMark size={38} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink">{settings.storeName}</p>
                  <p className="mt-0.5 text-[10.5px] text-muted">Local workspace · Offline-first</p>
                </div>
              </div>
              <dl className="mt-4 divide-y divide-[#F0F3F8] border-y border-[#F0F3F8]">
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-[11px] text-muted">Database</dt>
                  <dd className="text-[11px] font-medium text-ink">IndexedDB · Dexie</dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-[11px] text-muted">Products stored</dt>
                  <dd className="text-[11px] font-medium tabular text-ink">
                    {formatNumber(products.length)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-[11px] text-muted">Categories</dt>
                  <dd className="text-[11px] font-medium tabular text-ink">
                    {formatNumber(categories.length)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-[11px] text-muted">Backup status</dt>
                  <dd>
                    {settings.lastBackupAt ? (
                      <Badge variant="success">Backed up</Badge>
                    ) : (
                      <Badge variant="warning">Not backed up</Badge>
                    )}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 flex items-center gap-1.5 text-[10px] leading-4 text-subtle">
                <ShieldCheck size={12} className="shrink-0 text-success" aria-hidden="true" />
                No cloud account, server or external database is used.
              </p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <SectionHeader
              title="Installation & offline"
              icon={<Smartphone size={14} />}
              action={
                <Badge variant={online ? 'success' : 'warning'} dot>
                  {online ? 'Online' : 'Offline'}
                </Badge>
              }
            />
            <div className="px-4 py-4 sm:px-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Smartphone size={16} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[12.5px] font-medium text-ink">Install Vantage</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-muted">
                    Run the app in its own window for faster scanning and dependable offline access.
                  </p>
                </div>
              </div>
              {isStandalone ? (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#DCFCE7] bg-[#F0FDF4] px-3 py-2 text-[11px] font-medium text-[#15803D]">
                  <Check size={13} aria-hidden="true" />
                  Running as an installed application
                </div>
              ) : canInstall ? (
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-3 w-full"
                  iconLeft={<Download size={13} />}
                  onClick={handleInstall}
                  loading={installing}
                >
                  Install application
                </Button>
              ) : (
                <p className="mt-3 rounded-lg border border-line bg-[#FAFBFD] px-3 py-2 text-[10.5px] leading-4 text-subtle">
                  Use your browser’s “Install app” option. The app caches its core assets after the
                  first production load.
                </p>
              )}
              <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-[10.5px] text-muted">
                {online ? (
                  <Wifi size={12.5} className="text-subtle" aria-hidden="true" />
                ) : (
                  <WifiOff size={12.5} className="text-warning" aria-hidden="true" />
                )}
                {online ? 'Network available' : 'No network connection'}
                <span className="text-[#D3DCE8]">·</span>
                Local features keep working
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={Boolean(pendingBackup)}
        onClose={() => {
          if (!restoring) setPendingBackup(null);
        }}
        title="Restore from backup"
        description={backupFilename || 'Review this backup before restoring.'}
        footer={
          <>
            <Button onClick={() => setPendingBackup(null)} disabled={restoring}>
              Cancel
            </Button>
            <Button
              variant={restoreMode === 'replace' ? 'danger' : 'primary'}
              onClick={handleRestore}
              loading={restoring}
            >
              {restoreMode === 'replace' ? 'Replace workspace' : 'Merge backup'}
            </Button>
          </>
        }
      >
        {pendingBackup ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-line bg-[#FAFBFD] p-3.5">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[15px] font-semibold tabular text-ink">
                    {formatNumber(pendingBackup.summary.products)}
                  </p>
                  <p className="mt-0.5 text-[9.5px] uppercase tracking-[0.06em] text-subtle">Products</p>
                </div>
                <div>
                  <p className="text-[15px] font-semibold tabular text-ink">
                    {formatNumber(pendingBackup.summary.categories)}
                  </p>
                  <p className="mt-0.5 text-[9.5px] uppercase tracking-[0.06em] text-subtle">Categories</p>
                </div>
                <div>
                  <p className="text-[15px] font-semibold tabular text-ink">
                    {formatNumber(pendingBackup.summary.scans)}
                  </p>
                  <p className="mt-0.5 text-[9.5px] uppercase tracking-[0.06em] text-subtle">Scans</p>
                </div>
              </div>
              <p className="mt-2.5 border-t border-line pt-2.5 text-center text-[10px] text-subtle">
                Exported{' '}
                {pendingBackup.summary.exportedAt
                  ? formatDateTime(pendingBackup.summary.exportedAt)
                  : 'date unavailable'}
              </p>
            </div>

            <fieldset>
              <legend className="text-[12px] font-medium text-ink">Restore method</legend>
              <div className="mt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setRestoreMode('merge')}
                  className={cn(
                    'w-full rounded-lg border px-3.5 py-3 text-left transition-colors',
                    restoreMode === 'merge'
                      ? 'border-brand-500 bg-[#F6F9FF] ring-1 ring-brand-500/50'
                      : 'border-line hover:border-[#CBD5E1]',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-[12px] font-medium text-ink">
                      Merge into current workspace
                      <Badge variant="brand">Recommended</Badge>
                    </span>
                    <span
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-full border',
                        restoreMode === 'merge' ? 'border-brand-600 bg-brand-600' : 'border-[#CBD5E1]',
                      )}
                    >
                      {restoreMode === 'merge' ? (
                        <Check size={10} className="text-white" aria-hidden="true" />
                      ) : null}
                    </span>
                  </span>
                  <span className="mt-1 block text-[10.5px] leading-4 text-muted">
                    Adds products with unused barcodes and SKUs. Existing records and history stay
                    untouched.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRestoreMode('replace')}
                  className={cn(
                    'w-full rounded-lg border px-3.5 py-3 text-left transition-colors',
                    restoreMode === 'replace'
                      ? 'border-danger bg-[#FFF8F8] ring-1 ring-danger/30'
                      : 'border-line hover:border-[#CBD5E1]',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-medium text-ink">Replace entire workspace</span>
                    <span
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-full border',
                        restoreMode === 'replace' ? 'border-danger bg-danger' : 'border-[#CBD5E1]',
                      )}
                    >
                      {restoreMode === 'replace' ? (
                        <Check size={10} className="text-white" aria-hidden="true" />
                      ) : null}
                    </span>
                  </span>
                  <span className="mt-1 block text-[10.5px] leading-4 text-muted">
                    Deletes all current products, categories, scans, activity and preferences, then
                    restores the backup exactly.
                  </span>
                </button>
              </div>
            </fieldset>

            {restoreMode === 'replace' ? (
              <p className="flex items-start gap-2 rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] px-3 py-2.5 text-[10.5px] leading-4 text-[#B91C1C]">
                <TriangleAlert size={13} className="mt-px shrink-0" aria-hidden="true" />
                This cannot be undone. Download a backup of the current workspace first if you may
                need it.
              </p>
            ) : null}

            {importError ? (
              <p role="alert" className="text-[11px] text-danger">
                {importError}
              </p>
            ) : null}
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => {
          if (!resetting) setResetOpen(false);
        }}
        onConfirm={handleReset}
        title="Delete all workspace data?"
        description="Every product, category, scan and activity record will be permanently removed from this device. Your workspace name, currency and preferences are kept."
        confirmLabel="Delete all data"
        loading={resetting}
      >
        <div className="mt-3 rounded-md border border-line bg-white px-3 py-2.5 text-[11.5px] text-muted">
          <span className="font-medium text-ink">{formatNumber(products.length)}</span> products and{' '}
          <span className="font-medium text-ink">{formatNumber(categories.length)}</span>{' '}
          categories will be removed.
        </div>
      </ConfirmDialog>
    </div>
  );
}
