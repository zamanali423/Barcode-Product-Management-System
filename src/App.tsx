import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ToastProvider } from './components/ui/Toast';
import { PageLoader } from './components/ui/PageChrome';
import AddProductPage from './pages/AddProductPage';
import DashboardPage from './pages/DashboardPage';
import EditProductPage from './pages/EditProductPage';
import LabelsPage from './pages/LabelsPage';
import NotFoundPage from './pages/NotFoundPage';
import ProductsPage from './pages/ProductsPage';
import SettingsPage from './pages/SettingsPage';

const ScannerPage = lazy(() => import('./pages/ScannerPage'));

function ScannerFallback() {
  return (
    <div className="card">
      <PageLoader label="Preparing the scanner…" />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/new" element={<AddProductPage />} />
            <Route path="/products/:id/edit" element={<EditProductPage />} />
            <Route
              path="/scanner"
              element={
                <Suspense fallback={<ScannerFallback />}>
                  <ScannerPage />
                </Suspense>
              }
            />
            <Route path="/labels" element={<LabelsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </ToastProvider>
    </HashRouter>
  );
}
