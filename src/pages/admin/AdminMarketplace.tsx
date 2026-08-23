import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Star, Eye, EyeOff, Trash2, Loader2, MapPin, Users, AlertTriangle,
  Check, X, ShieldAlert, Package, Search,
} from 'lucide-react';
import {
  adminFetchAllListings, adminFetchAllOrders, adminFetchDisputes,
  adminToggleListingFeatured, adminRemoveListing, adminResolveDispute,
} from '@/lib/marketplace';
import type { DbMarketplaceListing, DbMarketplaceOrder } from '@/types/marketplace';
import { LISTING_STATUS_LABELS, ORDER_STATUS_LABELS, PROJECT_TYPE_LABELS } from '@/types/marketplace';
import { classNames } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { PRODUCT_CONDITION_LABELS, PRODUCT_STATUS_LABELS } from '@/types/marketplace-products';
import type { DbMarketplaceProduct } from '@/types/marketplace-products';

type Tab = 'listings' | 'products' | 'orders' | 'disputes';

export default function AdminMarketplace() {
  const [tab, setTab] = useState<Tab>('listings');

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-white">Marketplace Management</h1>

      <div className="mb-6 flex flex-wrap gap-1 border-b border-neutral-200 dark:border-white/10">
        {([
          ['listings', 'Listings'],
          ['products', 'Products'],
          ['orders', 'Orders'],
          ['disputes', 'Disputes'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={classNames(
              'px-4 py-2.5 text-sm font-medium transition-colors',
              tab === key
                ? 'border-b-2 border-brand-purple text-brand-purple dark:text-brand-purple-lighter'
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'listings' && <ListingsTab />}
      {tab === 'products' && <ProductsTab />}
      {tab === 'orders' && <OrdersTab />}
      {tab === 'disputes' && <DisputesTab />}
    </div>
  );
}

function ListingsTab() {
  const [listings, setListings] = useState<DbMarketplaceListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { listings: data, total: count } = await adminFetchAllListings({
        status: statusFilter || undefined,
        limit: 100,
      });
      setListings(data);
      setTotal(count);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Client-side search filter on fetched listings
  const filteredListings = search
    ? listings.filter(l => l.title.toLowerCase().includes(search.toLowerCase()))
    : listings;

  useEffect(() => { load(); }, [load]);

  async function handleFeature(id: string, featured: boolean) {
    try {
      await adminToggleListingFeatured(id, featured);
      load();
    } catch { /* ignore */ }
  }

  async function handleRemove(id: string) {
    const reason = prompt('Reason for removal?');
    if (!reason) return;
    try {
      await adminRemoveListing(id, reason);
      load();
    } catch { /* ignore */ }
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-brand-purple" /></div>;
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings..."
            className="w-full rounded-lg border border-neutral-200 py-2 pl-10 pr-4 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
        >
          <option value="">All Statuses</option>
          {Object.entries(LISTING_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredListings.map((l) => (
          <div key={l.id} className="card p-3">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-brand-purple/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-purple">
                {PROJECT_TYPE_LABELS[l.project_type]}
              </span>
              <span className="text-[10px] font-semibold text-neutral-400">
                {LISTING_STATUS_LABELS[l.status]}
              </span>
            </div>
            <Link to={`/marketplace/${l.id}`} className="mt-1.5 block truncate text-xs font-bold text-brand-navy hover:text-brand-purple dark:text-white">
              {l.title}
            </Link>
            {l.location_state && (
              <p className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-neutral-400">
                <MapPin className="h-2.5 w-2.5" /> {l.location_state}
              </p>
            )}
            <div className="mt-1 flex items-center gap-3 text-[10px] text-neutral-400">
              <span className="inline-flex items-center gap-0.5"><Users className="h-2.5 w-2.5" /> {l.bid_count}</span>
              <span className="inline-flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" /> {l.view_count}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-white/5">
              <button
                onClick={() => handleFeature(l.id, !l.is_featured)}
                className={classNames(
                  'inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-medium transition-colors',
                  l.is_featured ? 'text-amber-600' : 'text-neutral-400 hover:text-amber-500'
                )}
              >
                <Star className={classNames('h-3 w-3', l.is_featured && 'fill-amber-400')} />
                {l.is_featured ? 'Featured' : 'Feature'}
              </button>
              <button
                onClick={() => handleRemove(l.id)}
                className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-medium text-neutral-400 hover:text-red-500"
              >
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-neutral-400">{total} total listings</p>
    </div>
  );
}

// ============================================================
// PRODUCTS TAB
// ============================================================
function ProductsTab() {
  const [products, setProducts] = useState<DbMarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('marketplace_products')
      .select('*, category:marketplace_product_categories(id, name), seller:profiles!seller_id(full_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter) query = query.eq('status', statusFilter);
    if (search) query = query.or(`title.ilike.%${search}%,brand.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) { console.error(error); setLoading(false); return; }
    setProducts((data ?? []) as unknown as DbMarketplaceProduct[]);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function toggleProductStatus(id: string, current: string) {
    const newStatus = current === 'active' ? 'paused' : 'active';
    const { error } = await supabase.from('marketplace_products').update({ status: newStatus }).eq('id', id);
    if (error) { alert(error.message); return; }
    setProducts(products.map((p) => p.id === id ? { ...p, status: newStatus as any } : p));
  }

  async function adminRemoveProduct(id: string) {
    if (!confirm('Remove this product from marketplace?')) return;
    const { error } = await supabase.from('marketplace_products').update({ admin_removed: true, status: 'removed' }).eq('id', id);
    if (error) { alert(error.message); return; }
    setProducts(products.filter((p) => p.id !== id));
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white">
          <option value="">All statuses</option>
          {Object.entries(PRODUCT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-brand-purple" /></div>
      ) : products.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">No products found.</p>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 dark:border-white/10">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-white/5">
                {p.images.length > 0 && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{p.title}</p>
                <p className="text-xs text-neutral-400">
                  ₦{p.price.toLocaleString()} · {p.category?.name || 'No category'} · {PRODUCT_CONDITION_LABELS[p.condition]}
                  {p.brand && ` · ${p.brand}`}
                </p>
                <p className="text-xs text-neutral-400">
                  {p.seller?.full_name || 'Unknown'} · {p.view_count} views · {p.inquiry_count} inquiries
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span className={classNames(
                  'rounded-md px-2 py-0.5 text-xs font-medium',
                  p.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' :
                  p.status === 'sold' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' : 'bg-neutral-100 text-neutral-500 dark:bg-white/5'
                )}>{PRODUCT_STATUS_LABELS[p.status]}</span>
                <button onClick={() => toggleProductStatus(p.id, p.status)} className="rounded p-1 text-neutral-400 hover:text-brand-purple" title="Toggle status">
                  {p.status === 'active' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => adminRemoveProduct(p.id)} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" title="Remove">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState<DbMarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { orders: data } = await adminFetchAllOrders({
        status: statusFilter || undefined,
        limit: 20,
      });
      setOrders(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-brand-purple" /></div>;
  }

  return (
    <div>
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
        >
          <option value="">All Statuses</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-neutral-400">No orders found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((o) => (
            <div key={o.id} className="card p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-neutral-400">{o.order_number}</span>
                <span className="text-[10px] font-semibold text-neutral-500">{ORDER_STATUS_LABELS[o.status]}</span>
              </div>
              <Link to={`/marketplace/orders/${o.id}`} className="mt-1.5 block truncate text-xs font-bold text-brand-navy hover:text-brand-purple dark:text-white">
                {o.listing?.title || 'Untitled'}
              </Link>
              <p className="mt-0.5 text-[10px] text-neutral-400">
                Pro: {o.pro_profile?.display_name || 'Unknown'}
              </p>
              <p className="mt-1 text-sm font-bold text-brand-navy dark:text-white">₦{o.agreed_price.toLocaleString()}</p>
              <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-400">
                <span>Payment: {o.payment_status.replace('_', ' ')}</span>
                {o.client_rating && <span className="inline-flex items-center gap-0.5"><Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" /> {o.client_rating}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DisputesTab() {
  const [disputes, setDisputes] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetchDisputes();
      setDisputes(data as Array<Record<string, unknown>>);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleResolve(id: string) {
    const resolution = prompt('Resolution notes:');
    if (!resolution) return;
    setResolving(id);
    try {
      await adminResolveDispute(id, resolution);
      load();
    } catch { /* ignore */ } finally {
      setResolving(null);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-brand-purple" /></div>;
  }

  if (disputes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ShieldAlert className="h-10 w-10 text-neutral-300 dark:text-neutral-600" />
        <p className="mt-2 text-sm text-neutral-400">No disputes reported.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {disputes.map((d) => (
        <div key={d.id as string} className="card p-4">
          <div className="flex items-center justify-between">
            <span className={classNames(
              'rounded-md px-2 py-0.5 text-[10px] font-semibold',
              d.status === 'open' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
              d.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
              'bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-400'
            )}>
              {String(d.status)}
            </span>
            <span className="text-[10px] text-neutral-400">
              By {d.raised_by_role as string} · {new Date(d.created_at as string).toLocaleDateString()}
            </span>
          </div>
          <p className="mt-2 text-sm font-bold text-neutral-900 dark:text-white">{String(d.reason)}</p>
          {d.description != null && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{String(d.description)}</p>}
          {d.admin_resolution != null && String(d.admin_resolution) && (
            <p className="mt-2 rounded-md bg-emerald-50 p-2 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              ✓ {d.admin_resolution as string}
            </p>
          )}
          {d.status === 'open' && (
            <button
              onClick={() => handleResolve(d.id as string)}
              disabled={resolving === d.id}
              className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {resolving === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Resolve
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
