import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus, Store, Trash2, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchMyProducts, deleteProduct } from '@/lib/marketplace-products';
import type { DbMarketplaceProduct, ProductStatus } from '@/types/marketplace-products';
import { PRODUCT_CONDITION_LABELS, PRODUCT_STATUS_LABELS } from '@/types/marketplace-products';
import { useSeo } from '@/lib/seo';
import { classNames } from '@/lib/utils';

export default function MyProducts() {
  useSeo({ description: 'FRELUX marketplace', title: 'My Products — FRELUX Marketplace', canonicalPath: '/marketplace/products/my' });

  const [products, setProducts] = useState<DbMarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'sold' | 'paused'>('all');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      fetchMyProducts(user.id).then(setProducts).catch(() => {}).finally(() => setLoading(false));
    });
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    try {
      await deleteProduct(id);
      setProducts(products.filter((p) => p.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  async function toggleStatus(id: string, current: string) {
    const newStatus = current === 'active' ? 'paused' : 'active';
    try {
      const { error } = await supabase.from('marketplace_products').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setProducts(products.map((p) => p.id === id ? { ...p, status: newStatus as ProductStatus } : p));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update');
    }
  }

  const filtered = products.filter((p) => filter === 'all' || p.status === filter);

  function formatPrice(p: number, c: string) {
    return `${c === 'NGN' ? '₦' : ''}${p.toLocaleString()}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">My Products</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage your product listings on the marketplace.</p>
        </div>
        <Link to="/marketplace/products/post" className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-purple-dark">
          <Plus className="h-4 w-4" /> Sell Product
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1">
        {(['all', 'active', 'paused', 'sold'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={classNames(
              'rounded-lg px-3 py-2 text-sm font-medium capitalize',
              filter === f ? 'bg-brand-purple text-white' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'
            )}
          >
            {f} ({products.filter((p) => f === 'all' || p.status === f).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <Store className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-3 text-sm font-medium text-neutral-900 dark:text-white">No products yet</p>
          <p className="mt-1 text-xs text-neutral-400">Start selling building materials and interior products.</p>
          <Link to="/marketplace/products/post" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> Post Your First Product
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((product) => (
            <div key={product.id} className="flex items-center gap-4 rounded-xl border border-neutral-200 p-4 dark:border-white/10">
              {/* Image */}
              <Link to={`/marketplace/products/${product.id}`} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-white/5">
                {product.images.length > 0 ? (
                  <img src={product.images[product.primary_image_idx] || product.images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-neutral-300"><Store className="h-6 w-6" /></div>
                )}
              </Link>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <Link to={`/marketplace/products/${product.id}`} className="truncate text-sm font-medium text-neutral-900 dark:text-white hover:text-brand-purple">
                  {product.title}
                </Link>
                <p className="mt-0.5 text-sm font-bold text-brand-purple">{formatPrice(product.price, product.currency)}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
                  <span className={classNames(
                    'rounded-md px-1.5 py-0.5 font-medium',
                    product.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' :
                    product.status === 'sold' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' :
                    'bg-neutral-100 text-neutral-500 dark:bg-white/5'
                  )}>
                    {PRODUCT_STATUS_LABELS[product.status]}
                  </span>
                  <span>{PRODUCT_CONDITION_LABELS[product.condition]}</span>
                  <span>· {product.view_count} views</span>
                  <span>· {product.inquiry_count} inquiries</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button onClick={() => toggleStatus(product.id, product.status)} className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-brand-purple dark:hover:bg-white/5" title={product.status === 'active' ? 'Pause' : 'Activate'}>
                  {product.status === 'active' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <Link to={`/marketplace/products/${product.id}`} className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-brand-purple dark:hover:bg-white/5" title="View">
                  <Eye className="h-4 w-4" />
                </Link>
                <button onClick={() => handleDelete(product.id)} className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EyeOff({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.292 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88" />
    </svg>
  );
}
