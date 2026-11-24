import '@fontsource-variable/inter';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TriangleAlert } from 'lucide-react';
import App from './App';
import { LogoMark } from './components/ui/Logo';
import { initializeDatabase } from './db/database';

function StartupError({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-6">
      <div className="card w-full max-w-md p-6 text-center">
        <LogoMark size={42} className="mx-auto" />
        <span className="mx-auto mt-5 flex h-10 w-10 items-center justify-center rounded-full bg-[#FEF2F2] text-danger">
          <TriangleAlert size={18} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-[18px] font-semibold">Local database unavailable</h1>
        <p className="mt-2 text-[12.5px] leading-5 text-muted">
          Vantage could not open its IndexedDB database. This can happen in private browsing or when
          browser storage is blocked.
        </p>
        <p className="mt-3 rounded-md border border-line bg-[#FAFBFD] px-3 py-2 font-mono text-[10.5px] text-muted">
          {message}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-brand-900 px-4 text-[12.5px] font-medium text-white transition-colors hover:bg-brand-800"
        >
          Reload application
        </button>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

const root = createRoot(container);

initializeDatabase()
  .then(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((error: unknown) => {
    console.error('Failed to initialise the local database', error);
    const message = error instanceof Error ? error.message : 'Unknown storage error';
    root.render(<StartupError message={message} />);
  });
