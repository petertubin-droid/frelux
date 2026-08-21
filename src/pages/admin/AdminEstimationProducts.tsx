import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminHeader, AdminCard, AdminButton, AdminField, StateMessage, Toggle } from '@/components/admin/AdminUi';

// ─────────────────────────────────────────────────────────
// Types (inline — matches DB columns from estimation_products)
// ─────────────────────────────────────────────────────────
interface EstProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  product_type: string;
  calculation_method: string;
  standard_pack_size: number | null;
  pack_unit_id: string | null;
  recommended_surface: string | null;
  finish: string | null;
  texture: string | null;
  gloss_level: string | null;
  durability: string | null;
  colour_compatibility: string | null;
  paint_compatibility: string | null;
  has_quality_levels: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface EstQuality {
  id: string;
  product_id: string;
  name: string;
  slug: string;
  description: string | null;
  coverage: number | null;
  coverage_unit: string | null;
  finish: string | null;
  texture: string | null;
  gloss_level: string | null;
  shine_level: string | null;
  durability: string | null;
  is_active: boolean;
  sort_order: number;
}

const CALC_METHODS = ['room_based', 'partition_based', 'area_based', 'material_based', 'fixed_quantity', 'custom'];
const PRODUCT_TYPES = ['paint', 'coating', 'primer', 'sealer', 'adhesive', 'other'];
const CATEGORIES = ['emulsion', 'matt', 'satin', 'tyrolene', 'grafitex', 'primer', 'sealer', 'screeding', 'pop', 'tile', 'other'];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function AdminEstimationProducts() {
  const [products, setProducts] = useState<EstProduct[]>([]);
  const [qualityMap, setQualityMap] = useState<Record<string, EstQuality[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EstProduct | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingQuality, setEditingQuality] = useState<EstQuality | null>(null);
  const [showQualityForm, setShowQualityForm] = useState(false);
  const [qualityProductId, setQualityProductId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.from('estimation_products').select('*').order('sort_order');
    if (error) { setError(error.message); setLoading(false); return; }
    setProducts(data ?? []);
    // Load quality levels for all products
    const { data: qData } = await supabase.from('estimation_product_quality').select('*').order('sort_order');
    const map: Record<string, EstQuality[]> = {};
    (qData ?? []).forEach((q: EstQuality) => {
      if (!map[q.product_id]) map[q.product_id] = [];
      map[q.product_id].push(q);
    });
    setQualityMap(map);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(p: EstProduct) {
    const { error } = await supabase.from('estimation_products').update({ is_active: !p.is_active }).eq('id', p.id);
    if (error) { setError(error.message); return; }
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
  }

  async function remove(p: EstProduct) {
    if (!confirm(`Delete "${p.name}"? Quality levels will also be deleted.`)) return;
    const { error } = await supabase.from('estimation_products').delete().eq('id', p.id);
    if (error) { setError(error.message); return; }
    setProducts(prev => prev.filter(x => x.id !== p.id));
  }

  async function toggleQualityActive(q: EstQuality) {
    const { error } = await supabase.from('estimation_product_quality').update({ is_active: !q.is_active }).eq('id', q.id);
    if (error) { setError(error.message); return; }
    setQualityMap(prev => ({
      ...prev,
      [q.product_id]: (prev[q.product_id] ?? []).map(x => x.id === q.id ? { ...x, is_active: !x.is_active } : x),
    }));
  }

  async function removeQuality(q: EstQuality) {
    if (!confirm(`Delete quality level "${q.name}"?`)) return;
    const { error } = await supabase.from('estimation_product_quality').delete().eq('id', q.id);
    if (error) { setError(error.message); return; }
    setQualityMap(prev => ({
      ...prev,
      [q.product_id]: (prev[q.product_id] ?? []).filter(x => x.id !== q.id),
    }));
  }

  return (
    <>
      <AdminHeader
        title="Estimation Products"
        subtitle="Manage paint types and quality levels. Coverage settings here feed the FRELUX ROOM-BASED estimation engine — not an m² calculator."
        action={<AdminButton onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Add product</AdminButton>}
      />
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading ? (
        <StateMessage type="loading" title="Loading…" message="Fetching estimation products." />
      ) : products.length === 0 ? (
        <StateMessage type="empty" title="No products yet" message="Add your first estimation product to get started." />
      ) : (
        <div className="space-y-3">
          {products.map(p => (
            <div key={p.id}>
              <AdminCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-brand-navy dark:text-white">{p.name}</h3>
                    {!p.is_active && <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">Inactive</span>}
                    {p.has_quality_levels && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">Quality tiers</span>}
                  </div>
                  {p.description && <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{p.description}</p>}
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-neutral-400 dark:text-neutral-500">
                    <span>Category: {p.category}</span>
                    <span>·</span>
                    <span>Type: {p.product_type}</span>
                    <span>·</span>
                    <span>Method: {p.calculation_method}</span>
                    {p.standard_pack_size && <><span>·</span><span>Pack: {p.standard_pack_size}</span></>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {p.has_quality_levels && (
                    <AdminButton variant="secondary" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                      {expandedId === p.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      {qualityMap[p.id]?.length ?? 0} levels
                    </AdminButton>
                  )}
                  <Toggle checked={p.is_active} onChange={() => toggleActive(p)} />
                  <AdminButton variant="secondary" onClick={() => { setEditing(p); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></AdminButton>
                  <AdminButton variant="danger" onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5" /></AdminButton>
                </div>
              </AdminCard>
              {expandedId === p.id && p.has_quality_levels && (
                <div className="ml-4 mt-1 space-y-2">
                  {(qualityMap[p.id] ?? []).map(q => (
                    <div key={q.id} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 dark:bg-white/5 dark:border-white/5 dark:bg-white/5 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-semibold text-brand-navy dark:text-white">{q.name}</span>
                        {q.coverage && <span className="text-xs text-neutral-400 dark:text-neutral-500">· {q.coverage} {q.coverage_unit ?? ''}</span>}
                        {!q.is_active && <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">Inactive</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Toggle checked={q.is_active} onChange={() => toggleQualityActive(q)} />
                        <AdminButton variant="secondary" onClick={() => { setEditingQuality(q); setQualityProductId(p.id); setShowQualityForm(true); }}><Pencil className="h-3 w-3" /></AdminButton>
                        <AdminButton variant="danger" onClick={() => removeQuality(q)}><Trash2 className="h-3 w-3" /></AdminButton>
                      </div>
                    </div>
                  ))}
                  <AdminButton variant="secondary" onClick={() => { setEditingQuality(null); setQualityProductId(p.id); setShowQualityForm(true); }}>
                    <Plus className="h-3.5 w-3.5" /> Add quality level
                  </AdminButton>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showForm && <ProductForm initial={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {showQualityForm && qualityProductId && (
        <QualityForm
          initial={editingQuality}
          productId={qualityProductId}
          onClose={() => setShowQualityForm(false)}
          onSaved={() => { setShowQualityForm(false); load(); }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────
// Product Form
// ─────────────────────────────────────────────────────────
function ProductForm({ initial, onClose, onSaved }: { initial: EstProduct | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'emulsion');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [productType, setProductType] = useState(initial?.product_type ?? 'paint');
  const [calcMethod, setCalcMethod] = useState(initial?.calculation_method ?? 'area_based');
  const [standardPackSize, setStandardPackSize] = useState(initial?.standard_pack_size?.toString() ?? '');
  const [recommendedSurface, setRecommendedSurface] = useState(initial?.recommended_surface ?? '');
  const [finish, setFinish] = useState(initial?.finish ?? '');
  const [texture, setTexture] = useState(initial?.texture ?? '');
  const [glossLevel, setGlossLevel] = useState(initial?.gloss_level ?? '');
  const [durability, setDurability] = useState(initial?.durability ?? '');
  const [colourCompat, setColourCompat] = useState(initial?.colour_compatibility ?? '');
  const [paintCompat, setPaintCompat] = useState(initial?.paint_compatibility ?? '');
  const [hasQuality, setHasQuality] = useState(initial?.has_quality_levels ?? false);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSave() {
    if (!name.trim()) { setFormError('Name is required'); return; }
    const finalSlug = slug.trim() || slugify(name);
    setSaving(true); setFormError(null);
    const payload = {
      name: name.trim(),
      slug: finalSlug,
      category,
      description: description.trim() || null,
      product_type: productType,
      calculation_method: calcMethod,
      standard_pack_size: standardPackSize ? Math.max(1, Number(standardPackSize) || 1) : null,
      recommended_surface: recommendedSurface.trim() || null,
      finish: finish.trim() || null,
      texture: texture.trim() || null,
      gloss_level: glossLevel.trim() || null,
      durability: durability.trim() || null,
      colour_compatibility: colourCompat.trim() || null,
      paint_compatibility: paintCompat.trim() || null,
      has_quality_levels: hasQuality,
      is_active: isActive,
      sort_order: sortOrder,
    };
    const { error } = initial
      ? await supabase.from('estimation_products').update(payload).eq('id', initial.id)
      : await supabase.from('estimation_products').insert(payload);
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl my-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-navy dark:text-white">{initial ? 'Edit product' : 'Add product'}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Name"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. FRELUX Emulsion" /></AdminField>
            <AdminField label="Slug" hint="Auto-generated if left blank"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={slug} onChange={e => setSlug(e.target.value)} placeholder="frelux-emulsion" /></AdminField>
          </div>
          <AdminField label="Description"><textarea className="input-field dark:bg-brand-navy-mid dark:border-white/10" rows={2} value={description} onChange={e => setDescription(e.target.value)} /></AdminField>
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminField label="Category">
              <select className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </AdminField>
            <AdminField label="Product type">
              <select className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={productType} onChange={e => setProductType(e.target.value)}>
                {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </AdminField>
            <AdminField label="Calculation method">
              <select className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={calcMethod} onChange={e => setCalcMethod(e.target.value)}>
                {CALC_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Standard pack size" hint="Leave blank if not yet configured"><input type="number" min={0} step="0.1" className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={standardPackSize} onChange={e => setStandardPackSize(e.target.value)} /></AdminField>
            <AdminField label="Sort order"><input type="number" className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} /></AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Recommended surface"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={recommendedSurface} onChange={e => setRecommendedSurface(e.target.value)} /></AdminField>
            <AdminField label="Finish"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={finish} onChange={e => setFinish(e.target.value)} /></AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Texture"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={texture} onChange={e => setTexture(e.target.value)} /></AdminField>
            <AdminField label="Gloss level"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={glossLevel} onChange={e => setGlossLevel(e.target.value)} /></AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Durability"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={durability} onChange={e => setDurability(e.target.value)} /></AdminField>
            <AdminField label="Colour compatibility"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={colourCompat} onChange={e => setColourCompat(e.target.value)} /></AdminField>
          </div>
          <AdminField label="Paint compatibility"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={paintCompat} onChange={e => setPaintCompat(e.target.value)} /></AdminField>
          <div className="flex items-center gap-6">
            <div><span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Has quality levels</span><div className="mt-2"><Toggle checked={hasQuality} onChange={setHasQuality} /></div></div>
            <div><span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Active</span><div className="mt-2"><Toggle checked={isActive} onChange={setIsActive} /></div></div>
          </div>
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <AdminButton variant="secondary" onClick={onClose}>Cancel</AdminButton>
            <AdminButton onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</AdminButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Quality Level Form
// ─────────────────────────────────────────────────────────
function QualityForm({ initial, productId, onClose, onSaved }: { initial: EstQuality | null; productId: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [coverage, setCoverage] = useState(initial?.coverage?.toString() ?? '');
  const [coverageUnit, setCoverageUnit] = useState(initial?.coverage_unit ?? 'm2_per_liter');
  const [finish, setFinish] = useState(initial?.finish ?? '');
  const [texture, setTexture] = useState(initial?.texture ?? '');
  const [glossLevel, setGlossLevel] = useState(initial?.gloss_level ?? '');
  const [shineLevel, setShineLevel] = useState(initial?.shine_level ?? '');
  const [durability, setDurability] = useState(initial?.durability ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSave() {
    if (!name.trim()) { setFormError('Name is required'); return; }
    const finalSlug = slug.trim() || slugify(name);
    setSaving(true); setFormError(null);
    const payload = {
      product_id: productId,
      name: name.trim(),
      slug: finalSlug,
      description: description.trim() || null,
      coverage: coverage ? Number(coverage) : null,
      coverage_unit: coverage ? coverageUnit : null,
      finish: finish.trim() || null,
      texture: texture.trim() || null,
      gloss_level: glossLevel.trim() || null,
      shine_level: shineLevel.trim() || null,
      durability: durability.trim() || null,
      is_active: isActive,
      sort_order: sortOrder,
    };
    const { error } = initial
      ? await supabase.from('estimation_product_quality').update(payload).eq('id', initial.id)
      : await supabase.from('estimation_product_quality').insert(payload);
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl my-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-navy dark:text-white">{initial ? 'Edit quality level' : 'Add quality level'}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Name"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={name} onChange={e => setName(e.target.value)} placeholder="Standard, Premium, High Quality" /></AdminField>
            <AdminField label="Slug" hint="Auto-generated if left blank"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={slug} onChange={e => setSlug(e.target.value)} /></AdminField>
          </div>
          <AdminField label="Description"><textarea className="input-field dark:bg-brand-navy-mid dark:border-white/10" rows={2} value={description} onChange={e => setDescription(e.target.value)} /></AdminField>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Coverage rate" hint="Leave blank if not yet configured"><input type="number" min={0} step="0.1" className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={coverage} onChange={e => setCoverage(e.target.value)} /></AdminField>
            <AdminField label="Coverage unit">
              <select className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={coverageUnit} onChange={e => setCoverageUnit(e.target.value)}>
                <option value="m2_per_liter">m² per liter</option>
                <option value="m2_per_kg">m² per kg</option>
                <option value="m2_per_bag">m² per bag</option>
              </select>
            </AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminField label="Finish"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={finish} onChange={e => setFinish(e.target.value)} /></AdminField>
            <AdminField label="Texture"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={texture} onChange={e => setTexture(e.target.value)} /></AdminField>
            <AdminField label="Gloss level"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={glossLevel} onChange={e => setGlossLevel(e.target.value)} /></AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Shine level"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={shineLevel} onChange={e => setShineLevel(e.target.value)} /></AdminField>
            <AdminField label="Durability"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={durability} onChange={e => setDurability(e.target.value)} /></AdminField>
          </div>
          <div className="flex items-center gap-6">
            <div><span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Active</span><div className="mt-2"><Toggle checked={isActive} onChange={setIsActive} /></div></div>
            <AdminField label="Sort order"><input type="number" className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} /></AdminField>
          </div>
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <AdminButton variant="secondary" onClick={onClose}>Cancel</AdminButton>
            <AdminButton onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</AdminButton>
          </div>
        </div>
      </div>
    </div>
  );
}
