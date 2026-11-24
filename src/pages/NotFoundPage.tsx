import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">
        Error 404
      </p>
      <h1 className="mt-3 text-[24px] font-semibold tracking-[-0.02em]">Page not found</h1>
      <p className="mt-2 max-w-sm text-[13px] leading-5 text-muted">
        The page you are looking for doesn’t exist or was moved. Your local catalogue is safe.
      </p>
      <Button
        variant="primary"
        className="mt-5"
        iconLeft={<ArrowLeft size={14} />}
        onClick={() => navigate('/')}
      >
        Back to dashboard
      </Button>
    </div>
  );
}
