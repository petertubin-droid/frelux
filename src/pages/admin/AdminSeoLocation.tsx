import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { _MapPin, Save, Trash2, Loader2, Plus, Search, Globe, _Shield, Eye, EyeOff, Navigation, _Check, X, AlertCircle } from 'lucide-react';
import { fetchCategories, fetchLocations } from '@/lib/pro-connect';
import { adminFetchSeoPageSettings, adminUpsertSeoPageSettings, adminDeleteSeoPageSettings, adminUpdateLocationCoords, adminUpdateCategorySeo, adminUpdateListingSeo, adminUpdateProProfileSeo, type SeoPageSetting } from '@/lib/location-discovery';
import type { DbProCategory, DbProLocation } from '@/types/pro-connect';
import { classNames } from '@/lib/utils';
import {AdminButton, AdminIconButton, AdminInput, AdminSelect, AdminTextarea,
  AdminTabButton} from '@/components/admin/AdminUi';

// ============================================================
// Admin SEO & Location Management
// ============================================================
// Tabs: Locations (coords), Categories (SEO), SEO Pages, Indexability

type Tab = 'locations' | 'categories' | 'seo_pages' | 'indexability';

export default function AdminSeoLocation() {
  const [tab, setTab] = useState<Tab>('locations');

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-white">SEO & Location Management</h1>

      <div className="mb-6 flex flex-wrap gap-1 border-b border-neutral-200 dark:border-white/10">
        {([
          ['locations', 'Locations'],
          ['categories', 'Categories'],
          ['seo_pages', 'SEO Pages'],
          ['indexability', 'Indexability'],
        ] as const).map(([key, label]) => (
          <AdminTabButton key={key} active={tab === key} onClick={() => setTab(key)}>
            {label}
          </AdminTabButton>
        ))}
      </div>

      {tab === 'locations' && <LocationsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'seo_pages' && <SeoPagesTab />}
      {tab === 'indexability' && <IndexabilityTab />}
    </div>
  );
}

// ============================================================
// Locations Tab — manage coordinates for pro_locations
// ============================================================
function LocationsTab() {
  const [locations, setLocations] = useState<DbProLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchLocations();
    setLocations(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = locations.filter((l) => {
    const q = search.toLowerCase();
    return !q || l.state.toLowerCase().includes(q) || l.city.toLowerCase().includes(q) || (l.slug || '').toLowerCase().includes(q);
  });

  function startEdit(loc: DbProLocation) {
    setEditingId(loc.id);
    setEditLat(loc.latitude?.toString() ?? '');
    setEditLng(loc.longitude?.toString() ?? '');
    setEditSlug(loc.slug ?? '');
  }

  async function handleSave(id: string) {
    setSaving(true);
    setError(null);
    const lat = parseFloat(editLat);
    const lng = parseFloat(editLng);

    if (editLat && (isNaN(lat) || lat < -90 || lat > 90)) {
      setError('Invalid latitude (must be -90 to 90)');
      setSaving(false);
      return;
    }
    if (editLng && (isNaN(lng) || lng < -180 || lng > 180)) {
      setError('Invalid longitude (must be -180 to 180)');
      setSaving(false);
      return;
    }

    // Update coordinates
    if (editLat || editLng) {
      await adminUpdateLocationCoords(id, lat || 0, lng || 0);
    }

    // Update slug
    if (editSlug) {
      const { error: slugError } = await supabase
        .from('pro_locations')
        .update({ slug: editSlug })
        .eq('id', id);
      if (slugError) setError(slugError.message);
    }

    setSaving(false);
    setEditingId(null);
    load();
  }

  async function handleAutoGeocode(loc: DbProLocation) {
    // Use OpenStreetMap Nominatim to get coordinates from city/state
    const query = encodeURIComponent(`${loc.city}, ${loc.state}, Nigeria`);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
      const data = await res.json();
      if (data && data[0]) {
        setEditingId(loc.id);
        setEditLat(data[0].lat);
        setEditLng(data[0].lon);
        setEditSlug(loc.slug ?? '');
      }
    } catch {
      setError('Geocoding failed. Enter coordinates manually.');
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <AdminInput
 type="text"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
            placeholder="Search locations..."
            className="rounded-lg border border-neutral-200 py-2 pl-10 pr-4 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
          />
        </div>
        <span className="text-sm text-neutral-500">{locations.length} locations</span>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-brand-purple" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-400 dark:border-white/10">
                <th className="py-2 pr-4">State</th>
                <th className="py-2 pr-4">City</th>
                <th className="py-2 pr-4">Slug</th>
                <th className="py-2 pr-4">Latitude</th>
                <th className="py-2 pr-4">Longitude</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((loc) => (
                <tr key={loc.id} className="border-b border-neutral-100 dark:border-white/5">
                  <td className="py-2 pr-4 text-neutral-700 dark:text-neutral-200">{loc.state}</td>
                  <td className="py-2 pr-4 text-neutral-700 dark:text-neutral-200">{loc.city}</td>
                  <td className="py-2 pr-4">
                    {editingId === loc.id ? (
                      <AdminInput value={editSlug} onChange={(e) => setEditSlug(e.target.value)} className="w-28 rounded border border-neutral-200 px-2 py-1 text-xs dark:border-white/10 dark:bg-brand-navy dark:text-white" />
                    ) : (
                      <span className="text-xs text-neutral-500">{loc.slug || '—'}</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {editingId === loc.id ? (
                      <AdminInput value={editLat} onChange={(e) => setEditLat(e.target.value)} placeholder="e.g. 6.45" className="w-20 rounded border border-neutral-200 px-2 py-1 text-xs dark:border-white/10 dark:bg-brand-navy dark:text-white" />
                    ) : (
                      <span className={classNames('text-xs', loc.latitude ? 'text-emerald-600' : 'text-neutral-400')}>
                        {loc.latitude ? loc.latitude.toFixed(4) : '—'}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {editingId === loc.id ? (
                      <AdminInput value={editLng} onChange={(e) => setEditLng(e.target.value)} placeholder="e.g. 3.39" className="w-20 rounded border border-neutral-200 px-2 py-1 text-xs dark:border-white/10 dark:bg-brand-navy dark:text-white" />
                    ) : (
                      <span className={classNames('text-xs', loc.longitude ? 'text-emerald-600' : 'text-neutral-400')}>
                        {loc.longitude ? loc.longitude.toFixed(4) : '—'}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-1">
                      {editingId === loc.id ? (
                        <>
                          <AdminIconButton variant="ghost" onClick={() => handleSave(loc.id)} disabled={saving} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-500/10">
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          </AdminIconButton>
                          <AdminIconButton variant="ghost" onClick={() => setEditingId(null)} >
                            <X className="h-3.5 w-3.5" />
                          </AdminIconButton>
                        </>
                      ) : (
                        <>
                          <AdminIconButton variant="ghost" onClick={() => startEdit(loc)} title="Edit" className="rounded p-1 text-brand-purple hover:bg-brand-purple/10">
                            <Navigation className="h-3.5 w-3.5" />
                          </AdminIconButton>
                          {!loc.latitude && (
                            <AdminIconButton variant="ghost" onClick={() => handleAutoGeocode(loc)} className="rounded-lg p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10" title="Auto-geocode">
                              <Globe className="h-3.5 w-3.5" />
                            </AdminIconButton>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-500">No locations found. Add locations in Pro Connect Management.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Categories Tab — manage SEO metadata for pro_categories
// ============================================================
function CategoriesTab() {
  const [categories, setCategories] = useState<DbProCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editIndexable, setEditIndexable] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchCategories();
    setCategories(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit(cat: DbProCategory) {
    setEditingId(cat.id);
    setEditTitle(cat.seo_title ?? '');
    setEditDesc(cat.seo_description ?? '');
    setEditIndexable(cat.seo_indexable ?? true);
  }

  async function handleSave(id: string) {
    setSaving(true);
    await adminUpdateCategorySeo(id, {
      seo_title: editTitle || undefined,
      seo_description: editDesc || undefined,
      seo_indexable: editIndexable,
    });
    setSaving(false);
    setEditingId(null);
    load();
  }

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-brand-purple" />
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.id} className="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">{cat.name}</h3>
                  <p className="text-xs text-neutral-500">/{cat.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={classNames(
                    'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
                    cat.seo_indexable
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                      : 'bg-neutral-100 text-neutral-500 dark:bg-white/5'
                  )}>
                    {cat.seo_indexable ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {cat.seo_indexable ? 'Indexable' : 'No-index'}
                  </span>
                  <AdminButton
                    variant="secondary"
                    onClick={() => editingId === cat.id ? setEditingId(null) : startEdit(cat)}
                    className="text-xs py-1"
                  >
                    {editingId === cat.id ? 'Cancel' : 'Edit SEO'}
                  </AdminButton>
                </div>
              </div>

              {editingId === cat.id && (
                <div className="mt-4 space-y-3 border-t border-neutral-100 pt-3 dark:border-white/5">
                  <div>
                    <label className="text-xs font-medium text-neutral-500">SEO Title</label>
                    <AdminInput
 value={editTitle}
 onChange={(e) => setEditTitle(e.target.value)}
                      placeholder={`${cat.name} Services & Jobs — FRELUX Marketplace`}
                      className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500">SEO Description</label>
                    <AdminTextarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder={`Find ${cat.name} professionals and job listings on FRELUX...`}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <AdminInput
 type="checkbox"
 checked={editIndexable}
 onChange={(e) => setEditIndexable(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-neutral-700 dark:text-neutral-200">Allow search engines to index this category page</span>
                  </label>
                  <AdminButton
                    onClick={() => handleSave(cat.id)}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </AdminButton>
                </div>
              )}

              {!editingId && (cat.seo_title || cat.seo_description) && (
                <div className="mt-2 text-xs text-neutral-500">
                  {cat.seo_title && <p><strong>Title:</strong> {cat.seo_title}</p>}
                  {cat.seo_description && <p className="mt-0.5"><strong>Desc:</strong> {cat.seo_description}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SEO Pages Tab — manage custom SEO for dynamic pages
// ============================================================
function SeoPagesTab() {
  const [settings, setSettings] = useState<SeoPageSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    page_type: 'marketplace_category',
    entity_id: '',
    category_slug: '',
    location_slug: '',
    seo_title: '',
    seo_description: '',
    canonical_path: '',
    is_indexable: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const data = await adminFetchSeoPageSettings();
    setSettings(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    setSaving(true);
    await adminUpsertSeoPageSettings({
      page_type: form.page_type,
      entity_id: form.entity_id || null,
      category_slug: form.category_slug || null,
      location_slug: form.location_slug || null,
      seo_title: form.seo_title,
      seo_description: form.seo_description,
      canonical_path: form.canonical_path || null,
      is_indexable: form.is_indexable,
    });
    setSaving(false);
    setShowForm(false);
    setForm({ page_type: 'marketplace_category', entity_id: '', category_slug: '', location_slug: '', seo_title: '', seo_description: '', canonical_path: '', is_indexable: true });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this SEO page setting?')) return;
    await adminDeleteSeoPageSettings(id);
    load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-neutral-500">Custom SEO metadata for dynamic pages (category, location, combo pages).</p>
        <AdminButton
          onClick={() => setShowForm(!showForm)}
          className="py-2"
        >
          <Plus className="h-4 w-4" />
          Add SEO Page
        </AdminButton>
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-neutral-200 p-4 dark:border-white/10">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-neutral-500">Page Type</label>
              <AdminSelect
                value={form.page_type}
                onChange={(e) => setForm({ ...form, page_type: e.target.value })}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
              >
                <option value="marketplace_category">Marketplace Category</option>
                <option value="marketplace_location">Marketplace Location</option>
                <option value="pro_category_location">Pro Category + Location</option>
                <option value="seller_profile">Seller Profile</option>
                <option value="listing_detail">Listing Detail</option>
              </AdminSelect>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500">Entity ID (optional)</label>
              <AdminInput
 value={form.entity_id}
 onChange={(e) => setForm({ ...form, entity_id: e.target.value })}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500">Category Slug (optional)</label>
              <AdminInput
 value={form.category_slug}
 onChange={(e) => setForm({ ...form, category_slug: e.target.value })}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500">Location Slug (optional)</label>
              <AdminInput
 value={form.location_slug}
 onChange={(e) => setForm({ ...form, location_slug: e.target.value })}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-neutral-500">SEO Title *</label>
              <AdminInput
 value={form.seo_title}
 onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-neutral-500">SEO Description *</label>
              <AdminTextarea
                value={form.seo_description}
                onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500">Canonical Path (optional)</label>
              <AdminInput
 value={form.canonical_path}
 onChange={(e) => setForm({ ...form, canonical_path: e.target.value })}
                placeholder="/marketplace/category/painting"
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm pt-6">
                <AdminInput
 type="checkbox"
 checked={form.is_indexable}
 onChange={(e) => setForm({ ...form, is_indexable: e.target.checked })}
                  className="rounded"
                />
                <span className="text-neutral-700 dark:text-neutral-200">Indexable</span>
              </label>
            </div>
          </div>
          <AdminButton
            onClick={handleCreate}
            disabled={saving || !form.seo_title || !form.seo_description}
            className="mt-3"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save SEO Setting
          </AdminButton>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-brand-purple" />
        </div>
      ) : settings.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">No custom SEO page settings yet.</p>
      ) : (
        <div className="space-y-2">
          {settings.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-white/10">
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white">{s.seo_title}</p>
                <p className="truncate text-xs text-neutral-500">{s.page_type} · {s.category_slug || s.entity_id || s.location_slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={classNames(
                  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs',
                  s.is_indexable ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-neutral-100 text-neutral-500 dark:bg-white/5'
                )}>
                  {s.is_indexable ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </span>
                <AdminIconButton variant="danger" onClick={() => handleDelete(s.id)} >
                  <Trash2 className="h-3.5 w-3.5" />
                </AdminIconButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Indexability Tab — control which listings/profiles are indexable
// ============================================================
function IndexabilityTab() {
  const [listings, setListings] = useState<unknown[]>([]);
  const [profiles, setProfiles] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab2, setTab2] = useState<'listings' | 'profiles'>('listings');

  const load = useCallback(async () => {
    setLoading(true);
    const [listingsRes, profilesRes] = await Promise.all([
      supabase.from('marketplace_listings').select('id, title, seo_indexable, seo_title, status, is_active').order('created_at', { ascending: false }).limit(50),
      supabase.from('pro_profiles').select('id, display_name, business_name, slug, seo_indexable, seo_title, verification_status, is_listed').order('created_at', { ascending: false }).limit(50),
    ]);
    setListings(listingsRes.data ?? []);
    setProfiles(profilesRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleListingIndexable(id: string, current: boolean) {
    await adminUpdateListingSeo(id, { seo_indexable: !current });
    load();
  }

  async function toggleProfileIndexable(id: string, current: boolean) {
    await adminUpdateProProfileSeo(id, { seo_indexable: !current });
    load();
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <AdminButton
          onClick={() => setTab2('listings')}
          className={classNames(
            'rounded-lg px-4 py-2 text-sm font-medium',
            tab2 === 'listings' ? 'bg-brand-purple text-white' : 'border border-neutral-200 text-neutral-600 dark:border-white/10 dark:text-neutral-400'
          )}
        >
          Marketplace Listings
        </AdminButton>
        <AdminButton
          onClick={() => setTab2('profiles')}
          className={classNames(
            'rounded-lg px-4 py-2 text-sm font-medium',
            tab2 === 'profiles' ? 'bg-brand-purple text-white' : 'border border-neutral-200 text-neutral-600 dark:border-white/10 dark:text-neutral-400'
          )}
        >
          Professional Profiles
        </AdminButton>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-brand-purple" />
        </div>
      ) : tab2 === 'listings' ? (
        <div className="space-y-2">
          {listings.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-white/10">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{l.title}</p>
                <p className="text-xs text-neutral-500">{l.status} · {l.is_active ? 'Active' : 'Inactive'}</p>
              </div>
              <AdminIconButton variant="ghost"
                onClick={() => toggleListingIndexable(l.id, l.seo_indexable)}
                className={classNames(
                  'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium',
                  l.seo_indexable
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                    : 'bg-neutral-100 text-neutral-500 dark:bg-white/5'
                )}
              >
                {l.seo_indexable ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {l.seo_indexable ? 'Indexable' : 'Hidden'}
              </AdminIconButton>
            </div>
          ))}
          {listings.length === 0 && <p className="py-8 text-center text-sm text-neutral-500">No listings found.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-white/10">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{p.business_name || p.display_name}</p>
                <p className="text-xs text-neutral-500">{p.verification_status} · /{p.slug}</p>
              </div>
              <AdminIconButton variant="ghost"
                onClick={() => toggleProfileIndexable(p.id, p.seo_indexable)}
                className={classNames(
                  'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium',
                  p.seo_indexable
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                    : 'bg-neutral-100 text-neutral-500 dark:bg-white/5'
                )}
              >
                {p.seo_indexable ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {p.seo_indexable ? 'Indexable' : 'Hidden'}
              </AdminIconButton>
            </div>
          ))}
          {profiles.length === 0 && <p className="py-8 text-center text-sm text-neutral-500">No profiles found.</p>}
        </div>
      )}
    </div>
  );
}
