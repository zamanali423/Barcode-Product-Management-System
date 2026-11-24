import { ArrowLeft, PackageX } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProductForm } from '../components/products/ProductForm';
import { Button } from '../components/ui/Button';
import { EmptyState, PageHeader, PageLoader } from '../components/ui/PageChrome';
import { useProduct } from '../hooks/useDatabaseData';

export default function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const numericId = id && /^\d+$/.test(id) ? Number(id) : undefined;
  const { product, loading } = useProduct(numericId);

  if (loading) {
    return (
      <div className="card">
        <PageLoader label="Loading product…" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Edit product"
          actions={
            <Button iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/products')}>
              Back to products
            </Button>
          }
        />
        <div className="card">
          <EmptyState
            icon={<PackageX />}
            title="Product not found"
            description="This product may have been deleted. Return to the catalogue to choose another record."
            action={
              <Button variant="primary" onClick={() => navigate('/products')}>
                Go to products
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Edit product"
        description="Update product details. Its barcode stays unchanged unless you explicitly replace it."
        actions={
          <Button iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/products')}>
            Back to products
          </Button>
        }
      />
      <ProductForm mode="edit" product={product} />
    </div>
  );
}
