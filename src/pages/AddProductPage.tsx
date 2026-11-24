import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProductForm } from '../components/products/ProductForm';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageChrome';

export default function AddProductPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialBarcode = searchParams.get('barcode')?.trim() || undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Add product"
        description="Register a new item and get a unique CODE128 barcode that works offline."
        actions={
          <Button iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/products')}>
            Back to products
          </Button>
        }
      />
      <ProductForm mode="create" initialBarcode={initialBarcode} />
    </div>
  );
}
