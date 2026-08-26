import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store, Package, DollarSign, Star, TrendingUp, Loader2, Plus,
  Edit, BadgeCheck, MapPin, Phone, Truck, CheckCircle2, Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSeo } from '@/lib/seo';
import { AdminButton, AdminInput, AdminSelect } from '@/components/admin/AdminUi';
import type { DbMarketplaceSellerProfile, SellerType } from '@/types/marketplace-expansion';
import { SELLER_TYPE_LABELS, SELLER_VERIFICATION_LABELS } from '@/types/marketplace-expansion';
import type { DbMarketplaceProduct } from '@/types/marketplace-products';
import { PRODUCT_STATUS_LABELS } from '@/types/marketplace-products';

export default function SellerDashboard() {
  useSeo({
    title: 'Seller Dashboard | FRELUX Marketplace',
    description: 'Manage your seller profile, products, and sales on FRELUX Marketplace.',
    canonicalPath: '/marketplace/seller-dashboard',
  });

  const navigate = useNavigate();
  const [profile, setProfile] = useState<DbMarketplaceSellerProfile | null>(null);
  const [products, setProducts] = useState<DbMarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [sellerType, setSellerType] = useState<SellerType>('individual');
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [pickupAvailable, setPickupAvailable] = useState(true);

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/auth'); return; }

    const { data, error } = await supabase
      .from('marketplace_seller_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    setProfile(data as unknown as DbMarketplaceSellerProfile | null);

    if (data) {
      const p = data as unknown as DbMarketplaceSellerProfile;
      setSellerType(p.seller_type);
      setBusinessName(p.business_name || '');
      setBusinessPhone(p.business_phone || '');
      setBusinessAddress(p.business_address || '');
      setDeliveryAvailable(p.default_delivery_available);
      setPickupAvailable(p.default_pickup_available);
    }

    const { data: prods, error: prodErr } = await supabase
      .from('marketplace_products')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (prodErr) throw prodErr;
    setProducts((prods ?? []) as unknown as DbMarketplaceProduct[]);
  }, [navigate]);

  useEffect(() => {
    loadProfile().catch(() => {}).finally(() => setLoading(false));
  }, [loadProfile]);

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing } = await supabase
        .from('marketplace_seller_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const payload = {
        user_id: user.id,
        seller_type: sellerType,
        business_name: businessName || null,
        business_phone: businessPhone || null,
        business_address: businessAddress || null,
        default_delivery_available: deliveryAvailable,
        default_pickup_available: pickupAvailable,
      };

      if (existing) {
        const { error } = await supabase.from('marketplace_seller_profiles').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('marketplace_seller_profiles').insert(payload);
        if (error) throw error;
      }
      setEditing(false);
      loadProfile();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-brand-purple" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Seller Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage your profile, products, and sales</p>
        </div>
        <Link to="/marketplace/products/post" className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-purple-dark">
          <Plus aria-hidden="true" className="h-4 w-4" /> List a Product
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Package aria-hidden="true" className="h-5 w-5" />} label="Active Products" value={products.filter(p => (p as unknown as Record<string, unknown>).status === 'active').length} />
        <StatCard icon={<TrendingUp aria-hidden="true" className="h-5 w-5" />} label="Total Products" value={products.length} />
        <StatCard icon={<Star aria-hidden="true" className="h-5 w-5" />} label="Rating" value={profile ? `${profile.rating_avg.toFixed(1)} (${profile.rating_count})` : '—'} />
        <StatCard icon={<DollarSign aria-hidden="true" className="h-5 w-5" />} label="Total Sales" value={profile?.total_sales ?? 0} />
      </div>

      {/* Profile Card */}
      <div className="mb-6 rounded-xl border border-neutral-200 p-5 dark:border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-purple/10">
              <Store className="h-6 w-6 text-brand-purple" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{businessName || 'Individual Seller'}</h2>
                {profile?.verification_status === 'verified' && <BadgeCheck aria-hidden="true" className="h-4 w-4 text-brand-purple" />}
              </div>
              <p className="text-sm text-neutral-500">
                {SELLER_TYPE_LABELS[sellerType]}
                {profile && ` · ${SELLER_VERIFICATION_LABELS[profile.verification_status]}`}
              </p>
            </div>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 dark:border-white/10 dark:text-neutral-400">
              <Edit aria-hidden="true" className="h-4 w-4" /> Edit
            </button>
          )}
        </div>

        {!editing ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {businessPhone && <div className="flex items-center gap-2 text-sm text-neutral-500"><Phone aria-hidden="true" className="h-4 w-4" /> {businessPhone}</div>}
            {businessAddress && <div className="flex items-center gap-2 text-sm text-neutral-500"><MapPin aria-hidden="true" className="h-4 w-4" /> {businessAddress}</div>}
            <div className="flex items-center gap-2 text-sm text-neutral-500"><Truck className="h-4 w-4" /> {deliveryAvailable ? 'Delivery available' : 'No delivery'}</div>
            <div className="flex items-center gap-2 text-sm text-neutral-500"><CheckCircle2 className="h-4 w-4" /> {pickupAvailable ? 'Pickup available' : 'No pickup'}</div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Seller Type</label>
                <AdminSelect value={sellerType} onChange={(e) => setSellerType(e.target.value as SellerType)} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white">
                  {Object.entries(SELLER_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </AdminSelect>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Business Name</label>
                <AdminInput type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your business name" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Business Phone</label>
                <AdminInput type="text" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} placeholder="+234..." className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Business Address</label>
                <AdminInput type="text" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="Your address" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300"><input type="checkbox" checked={deliveryAvailable} onChange={(e) => setDeliveryAvailable(e.target.checked)} className="rounded" /> Delivery available</label>
              <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300"><input type="checkbox" checked={pickupAvailable} onChange={(e) => setPickupAvailable(e.target.checked)} className="rounded" /> Pickup available</label>
            </div>
            <div className="flex gap-2">
              <AdminButton variant="primary" onClick={handleSaveProfile} disabled={saving}>
                {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save Profile
              </AdminButton>
              <AdminButton variant="secondary" onClick={() => setEditing(false)}>Cancel</AdminButton>
            </div>
          </div>
        )}

        {profile?.verification_status === 'unverified' && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            <Clock className="h-4 w-4" />
            Your seller profile is unverified. Submit verification documents to get a verified badge.
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="rounded-xl border border-neutral-200 dark:border-white/10">
        <div className="border-b border-neutral-200 p-4 dark:border-white/10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Your Products</h2>
        </div>
        {products.length === 0 ? (
          <div className="py-12 text-center">
            <Package aria-hidden="true" className="mx-auto h-10 w-10 text-neutral-300" />
            <p className="mt-3 text-sm font-medium text-neutral-900 dark:text-white">No products yet</p>
            <Link to="/marketplace/products/post" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white">
              <Plus aria-hidden="true" className="h-4 w-4" /> List Your First Product
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-white/5">
            {products.map((p) => {
              const prod = p as unknown as Record<string, unknown>;
              return (
                <Link key={prod.id as string} to={`/marketplace/products/${prod.id}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-white/5">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-white/5">
                    {Array.isArray(prod.images) && (prod.images as unknown[]).length > 0 ? (
                      <img src={(prod.images as string[])[(prod.primary_image_idx as number) || 0]} alt={prod.title as string} className="h-full w-full object-cover" />
                    ) : (
                      <Package aria-hidden="true" className="m-auto h-6 w-6 text-neutral-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{prod.title as string}</p>
                    <p className="text-xs text-neutral-400">
                      {PRODUCT_STATUS_LABELS[prod.status as keyof typeof PRODUCT_STATUS_LABELS] || (prod.status as string)}
                      · {new Date(prod.created_at as string).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-brand-purple">
                    {prod.currency === 'NGN' ? '₦' : ''}{Number(prod.price).toLocaleString()}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
      <div className="flex items-center gap-2 text-neutral-400">{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className="mt-2 text-xl font-bold text-neutral-900 dark:text-white">{value}</p>
    </div>
  );
}
