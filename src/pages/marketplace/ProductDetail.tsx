import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, MapPin, Tag, MessageCircle, ArrowLeft, Share2, Eye, Shield, Truck, Store, Send } from 'lucide-react';
import { fetchProduct, incrementProductView, createInquiry, fetchProductCategories } from '@/lib/marketplace-products';
import { supabase } from '@/lib/supabase';
import type { DbMarketplaceProduct, DbProductCategory } from '@/types/marketplace-products';
import { PRODUCT_CONDITION_LABELS } from '@/types/marketplace-products';
import { useSeo } from '@/lib/seo';
import { classNames } from '@/lib/utils';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<DbMarketplaceProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showInquiry, setShowInquiry] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquiryPrice, setInquiryPrice] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<DbMarketplaceProduct[]>([]);
  const [categories, setCategories] = useState<DbProductCategory[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const p = await fetchProduct(id);
    setProduct(p);
    setLoading(false);
    if (p) {
      incrementProductView(id);
      // Fetch related products in same category
      if (p.category_id) {
        const { data: related } = await supabase
          .from('marketplace_products')
          .select('id, title, price, currency, images, primary_image_idx, location_city, created_at')
          .eq('category_id', p.category_id)
          .eq('status', 'active')
          .eq('admin_removed', false)
          .neq('id', id)
          .order('created_at', { ascending: false })
          .limit(4);
        setRelatedProducts((related ?? []) as unknown as DbMarketplaceProduct[]);
      }
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetchProductCategories().then(setCategories).catch(() => {}); }, []);

  useSeo({
    title: product?.seo_title || product?.title || 'Product — FRELUX Marketplace',
    description: product?.seo_description || product?.description?.slice(0, 160) || 'Building materials and interior design products on FRELUX Marketplace.',
    canonicalPath: `/marketplace/products/${id}`,
    noIndex: false,
    structuredData: product ? {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.description || product.title,
      offers: {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: product.currency,
        availability: product.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
      ...(product.brand ? { brand: product.brand } : {}),
      ...(product.images.length > 0 ? { image: product.images } : {}),
    } : undefined,
  });

  async function handleInquiry() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!product) return;
    setSubmitting(true);
    try {
      await createInquiry({
        product_id: product.id,
        buyer_id: user.id,
        message: inquiryMessage.trim(),
        offered_price: inquiryPrice ? parseFloat(inquiryPrice) : undefined,
        contact_phone: inquiryPhone || undefined,
      });
      setInquirySent(true);
    } catch (_e) {
      // Show error inline
    } finally {
      setSubmitting(false);
    }
  }

  function formatPrice(p: number, currency: string) {
    const sym = currency === 'NGN' ? '₦' : '';
    return `${sym}${p.toLocaleString()}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-brand-purple" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-lg font-medium text-neutral-900 dark:text-white">Product not found</p>
        <Link to="/marketplace" className="mt-3 inline-flex items-center gap-2 text-sm text-brand-purple">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to Marketplace
        </Link>
      </div>
    );
  }

  const discount = product.compare_at_price && product.compare_at_price > product.price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : null;

  const category = categories.find((c) => c.id === product.category_id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-xs text-neutral-500">
        <Link to="/marketplace" className="hover:text-brand-purple">Marketplace</Link>
        <span>/</span>
        <Link to="/marketplace?tab=products" className="hover:text-brand-purple">Products</Link>
        {category && (
          <>
            <span>/</span>
            <Link to={`/marketplace/products?category=${category.slug}`} className="hover:text-brand-purple">{category.name}</Link>
          </>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Images */}
        <div>
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-white/10">
            <img
              src={product.images[product.primary_image_idx] || product.images[selectedImage] || ''}
              alt={product.title}
              className="aspect-square w-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={classNames(
                    'aspect-square overflow-hidden rounded-lg border-2',
                    selectedImage === idx ? 'border-brand-purple' : 'border-transparent'
                  )}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {discount && (
            <span className="inline-block rounded-md bg-red-50 px-2 py-1 text-xs font-bold text-red-600 dark:bg-red-500/10">
              {discount}% OFF
            </span>
          )}
          <h1 className="mt-2 text-xl font-bold text-neutral-900 dark:text-white sm:text-2xl">{product.title}</h1>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-brand-purple">{formatPrice(product.price, product.currency)}</span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-sm text-neutral-500 line-through">{formatPrice(product.compare_at_price, product.currency)}</span>
            )}
            {product.negotiable && (
              <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-white/5">Negotiable</span>
            )}
          </div>

          {/* Quick specs */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-neutral-100 p-3 dark:border-white/5">
              <p className="text-xs text-neutral-500">Condition</p>
              <p className="mt-0.5 font-medium text-neutral-900 dark:text-white">{PRODUCT_CONDITION_LABELS[product.condition]}</p>
            </div>
            <div className="rounded-lg border border-neutral-100 p-3 dark:border-white/5">
              <p className="text-xs text-neutral-500">Quantity</p>
              <p className="mt-0.5 font-medium text-neutral-900 dark:text-white">{product.quantity} {product.unit || 'available'}</p>
            </div>
            {product.brand && (
              <div className="rounded-lg border border-neutral-100 p-3 dark:border-white/5">
                <p className="text-xs text-neutral-500">Brand</p>
                <p className="mt-0.5 font-medium text-neutral-900 dark:text-white">{product.brand}</p>
              </div>
            )}
            <div className="rounded-lg border border-neutral-100 p-3 dark:border-white/5">
              <p className="text-xs text-neutral-500">Category</p>
              <p className="mt-0.5 font-medium text-neutral-900 dark:text-white">{category?.name || 'Other'}</p>
            </div>
          </div>

          {/* Delivery / Pickup */}
          <div className="mt-3 flex flex-wrap gap-2">
            {product.delivery_available && (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 dark:bg-blue-500/10">
                <Truck className="h-3 w-3" /> Delivery{product.delivery_fee ? ` (₦${product.delivery_fee.toLocaleString()})` : ' available'}
              </span>
            )}
            {product.pickup_available && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-500/10">
                <Store className="h-3 w-3" /> Pickup available
              </span>
            )}
          </div>

          {/* Location */}
          {product.location_city && (
            <div className="mt-3 flex items-center gap-1.5 text-sm text-neutral-500">
              <MapPin aria-hidden="true" className="h-4 w-4" />
              {product.location_area && `${product.location_area}, `}{product.location_city}, {product.location_state}
            </div>
          )}

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {product.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-0.5 rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-white/5">
                  <Tag aria-hidden="true" className="h-2.5 w-2.5" />{t}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-white/5">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Description</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-300">{product.description}</p>
            </div>
          )}

          {/* Seller */}
          {product.seller && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-neutral-100 p-3 dark:border-white/5">
              <div className="h-10 w-10 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
                {product.seller.avatar_url ? (
                  <img src={product.seller.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-brand-purple">
                    {product.seller.full_name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">{product.seller.full_name}</p>
                {product.seller.marketplace_id && (
                  <p className="text-xs text-neutral-500">@{product.seller.marketplace_id}</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => setShowInquiry(!showInquiry)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-purple-dark"
            >
              <MessageCircle aria-hidden="true" className="h-4 w-4" />
              Contact Seller
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: product.title, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-600 dark:border-white/10 dark:text-neutral-300"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>

          {/* Inquiry form */}
          {showInquiry && !inquirySent && (
            <div className="mt-4 space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-white/10">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Send an inquiry</h3>
              <textarea
                value={inquiryMessage}
                onChange={(e) => setInquiryMessage(e.target.value)}
                placeholder="I'm interested in this product. Is it still available?"
                rows={3}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={inquiryPrice}
                  onChange={(e) => setInquiryPrice(e.target.value)}
                  placeholder="Offer price (₦)"
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
                />
                <input
                  type="tel"
                  value={inquiryPhone}
                  onChange={(e) => setInquiryPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
                />
              </div>
              <button
                onClick={handleInquiry}
                disabled={submitting || !inquiryMessage.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Send aria-hidden="true" className="h-3.5 w-3.5" />}
                Send Inquiry
              </button>
            </div>
          )}

          {inquirySent && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-500/10">
              <Shield aria-hidden="true" className="h-4 w-4" />
              Your inquiry has been sent. The seller will get back to you.
            </div>
          )}

          {/* Stats */}
          <div className="mt-3 flex items-center gap-3 text-xs text-neutral-500">
            <span className="inline-flex items-center gap-1"><Eye aria-hidden="true" className="h-3 w-3" /> {product.view_count} views</span>
            <span>·</span>
            <span>Posted {new Date(product.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-lg font-bold text-neutral-900 dark:text-white">Similar Products</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {relatedProducts.map((rp) => (
              <Link
                key={rp.id}
                to={`/marketplace/products/${rp.id}`}
                className="group rounded-xl border border-neutral-200 p-3 transition-all hover:border-brand-purple/30 hover:shadow-md dark:border-white/10"
              >
                <div className="aspect-square overflow-hidden rounded-lg bg-neutral-100 dark:bg-white/5">
                  {rp.images.length > 0 ? (
                    <img src={rp.images[rp.primary_image_idx] || rp.images[0]} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-300">
                      <Store className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-medium text-neutral-900 dark:text-white group-hover:text-brand-purple">{rp.title}</p>
                <p className="mt-0.5 text-sm font-bold text-brand-purple">{formatPrice(rp.price, rp.currency)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
