import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { DbPaintProduct, DbMaterialPrice, DbLaborRate, DbPaintType } from '@/types/database';
import {AdminHeader, AdminCard, AdminButton, AdminField, StateMessage, Toggle, AdminInput} from '@/components/admin/AdminUi';
import { AdminModal } from '@/components/admin/AdminModal';
import { classNames, formatCurrency } from '@/lib/utils';

type Tab = 'products' | 'materials' | 'labor';

export default function AdminPricing() {
  const [tab, setTab] = useState<Tab>('products');
  return (
    <>
      <AdminHeader title="Cost & Pricing" subtitle="Manage paint products, materials, and labor rates." />
      <div className="mb-5 inline-flex rounded-lg border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid p-1">
        {(['products','materials','labor'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={classNames('rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-all', tab === t ? 'bg-brand-purple text-white' : 'text-neutral-600 hover:text-brand-purple')}>
            {t === 'products' ? 'Paint products' : t === 'materials' ? 'Materials' : 'Labor rates'}
          </button>
        ))}
      </div>
      {tab === 'products' && <ProductsTab />}
      {tab === 'materials' && <MaterialsTab />}
      {tab === 'labor' && <LaborTab />}
    </>
  );
}

function useCrud<T extends { id: string }>(table: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    const { data, error } = await supabase.from(table).select('*').order('sort_order');
    if (error) setError(error.message);
    setItems(data ?? []);
    setLoading(false);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);
  return { items, setItems, loading, error, setError, load };
}

function ProductsTab() {
  const { items, setItems, loading, error, setError, load } = useCrud<DbPaintProduct>('paint_products');
  const [paintTypes, setPaintTypes] = useState<DbPaintType[]>([]);
  const [editing, setEditing] = useState<DbPaintProduct | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { supabase.from('paint_types').select('*').order('name').then(({ data }) => setPaintTypes(data ?? [])); }, []);

  async function toggleActive(item: DbPaintProduct) {
    const { error } = await supabase.from('paint_products').update({ is_active: !item.is_active }).eq('id', item.id);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, is_active: !p.is_active } : p)));
  }
  async function remove(item: DbPaintProduct) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    const { error } = await supabase.from('paint_products').delete().eq('id', item.id);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.filter((p) => p.id !== item.id));
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching paint products." />;
  return (
    <>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex justify-end"><AdminButton onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Add product</AdminButton></div>
      {items.length === 0 ? <StateMessage type="empty" title="No products yet" message="Add your first paint product." /> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const type = paintTypes.find((t) => t.id === item.paint_type_id);
            return (
              <AdminCard key={item.id} className="flex flex-col gap-2 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate text-xs font-bold text-brand-navy dark:text-white">{item.name}</h3>
                    {!item.is_active && <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-600">Off</span>}
                  </div>
                  <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">{item.brand && `${item.brand} · `}{type?.name ?? 'No type'} · {item.container_size} L</p>
                  <p className="mt-1 text-xs font-semibold text-brand-purple">{formatCurrency(Number(item.price), '₦')}</p>
                </div>
                <div className="mt-2 flex shrink-0 items-center justify-between border-t border-neutral-100 pt-2 dark:border-white/5">
                  <Toggle checked={item.is_active} onChange={() => toggleActive(item)} />
                  <div className="flex items-center gap-0.5">
                    <AdminButton variant="secondary" onClick={() => { setEditing(item); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></AdminButton>
                    <AdminButton variant="danger" onClick={() => remove(item)}><Trash2 className="h-3.5 w-3.5" /></AdminButton>
                  </div>
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}
      {showForm && <SimpleForm table="paint_products" initial={editing} paintTypes={paintTypes} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </>
  );
}

function SimpleForm({ table, initial, paintTypes, onClose, onSaved }: { table: string; initial: DbPaintProduct | null; paintTypes: DbPaintType[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [paintTypeId, setPaintTypeId] = useState(initial?.paint_type_id ?? '');
  const [containerSize, setContainerSize] = useState(initial?.container_size ?? 4);
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [currency, setCurrency] = useState(initial?.currency ?? 'NGN');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSave() {
    if (!name.trim()) { setFormError('Name is required'); return; }
    if (containerSize <= 0) { setFormError('Container size must be > 0'); return; }
    if (price < 0) { setFormError('Price cannot be negative'); return; }
    setSaving(true); setFormError(null);
    const payload = { name: name.trim(), brand: brand.trim() || null, paint_type_id: paintTypeId || null, container_size: containerSize, price, currency, is_active: isActive, sort_order: sortOrder };
    const { error } = initial ? await supabase.from(table).update(payload).eq('id', initial.id) : await supabase.from(table).insert(payload);
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    onSaved();
  }

  return (
    <AdminModal open onClose={onClose} title={initial ? 'Edit product' : 'Add product'} maxWidth="max-w-lg">
          <AdminField label="Product name"><AdminInput  value={name} onChange={(e) => setName(e.target.value)} /></AdminField>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Brand"><AdminInput  value={brand} onChange={(e) => setBrand(e.target.value)} /></AdminField>
            <AdminField label="Paint type">
              <select className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={paintTypeId} onChange={(e) => setPaintTypeId(e.target.value)}>
                <option value="">— None —</option>
                {paintTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminField label="Container size (L)" error={containerSize <= 0 ? 'Must be > 0' : undefined}><AdminInput type="number" min={0} step="0.1"  value={containerSize} onChange={(e) => setContainerSize(Number(e.target.value))} /></AdminField>
            <AdminField label="Price" error={price < 0 ? 'Cannot be negative' : undefined}><AdminInput type="number" min={0}  value={price} onChange={(e) => setPrice(Number(e.target.value))} /></AdminField>
            <AdminField label="Currency"><select className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="NGN">NGN (₦)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option></select></AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Sort order"><AdminInput type="number"  value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></AdminField>
            <div><span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Active</span><div className="mt-2"><Toggle checked={isActive} onChange={setIsActive} /></div></div>
          </div>
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <div className="flex justify-end gap-3 pt-2"><AdminButton variant="secondary" onClick={onClose}>Cancel</AdminButton><AdminButton onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</AdminButton></div>
    </AdminModal>
  );
}

function MaterialsTab() {
  const { items, setItems, loading, error, setError, load } = useCrud<DbMaterialPrice>('material_prices');
  const [editing, setEditing] = useState<DbMaterialPrice | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function toggleActive(item: DbMaterialPrice) {
    const { error } = await supabase.from('material_prices').update({ is_active: !item.is_active }).eq('id', item.id);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, is_active: !p.is_active } : p)));
  }
  async function remove(item: DbMaterialPrice) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    const { error } = await supabase.from('material_prices').delete().eq('id', item.id);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.filter((p) => p.id !== item.id));
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching materials." />;
  return (
    <>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex justify-end"><AdminButton onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Add material</AdminButton></div>
      {items.length === 0 ? <StateMessage type="empty" title="No materials yet" message="Add your first material price." /> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <AdminCard key={item.id} className="flex flex-col gap-2 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5"><h3 className="truncate text-xs font-bold text-brand-navy dark:text-white">{item.name}</h3>{!item.is_active && <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-600">Off</span>}</div>
                <p className="mt-0.5 text-[10px] text-neutral-500 capitalize">{item.category} · {item.unit}</p>
                <p className="mt-1 text-xs font-semibold text-brand-purple">{formatCurrency(Number(item.price), '₦')}</p>
              </div>
              <div className="mt-2 flex shrink-0 items-center justify-between border-t border-neutral-100 pt-2 dark:border-white/5">
                <Toggle checked={item.is_active} onChange={() => toggleActive(item)} />
                <div className="flex items-center gap-0.5">
                  <AdminButton variant="secondary" onClick={() => { setEditing(item); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></AdminButton>
                  <AdminButton variant="danger" onClick={() => remove(item)}><Trash2 className="h-3.5 w-3.5" /></AdminButton>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
      {showForm && <MaterialForm initial={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </>
  );
}

function MaterialForm({ initial, onClose, onSaved }: { initial: DbMaterialPrice | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<DbMaterialPrice['category']>(initial?.category ?? 'primer');
  const [unit, setUnit] = useState(initial?.unit ?? 'liter');
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [currency, setCurrency] = useState(initial?.currency ?? 'NGN');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSave() {
    if (!name.trim()) { setFormError('Name is required'); return; }
    if (price < 0) { setFormError('Price cannot be negative'); return; }
    setSaving(true); setFormError(null);
    const payload = { name: name.trim(), category, unit, price, currency, is_active: isActive, sort_order: sortOrder };
    const { error } = initial ? await supabase.from('material_prices').update(payload).eq('id', initial.id) : await supabase.from('material_prices').insert(payload);
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    onSaved();
  }

  return (
    <AdminModal open onClose={onClose} title={initial ? 'Edit material' : 'Add material'} maxWidth="max-w-lg">
          <AdminField label="Name"><AdminInput  value={name} onChange={(e) => setName(e.target.value)} /></AdminField>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Category"><select className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={category} onChange={(e) => setCategory(e.target.value as DbMaterialPrice['category'])}>{['primer','filler','putty','sandpaper','brushes','rollers','other'].map((c) => <option key={c} value={c}>{c}</option>)}</select></AdminField>
            <AdminField label="Unit"><AdminInput  value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="liter, kg, pack" /></AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminField label="Price" error={price < 0 ? 'Cannot be negative' : undefined}><AdminInput type="number" min={0}  value={price} onChange={(e) => setPrice(Number(e.target.value))} /></AdminField>
            <AdminField label="Currency"><select className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="NGN">NGN (₦)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option></select></AdminField>
            <AdminField label="Sort order"><AdminInput type="number"  value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></AdminField>
          </div>
          <div><span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Active</span><div className="mt-2"><Toggle checked={isActive} onChange={setIsActive} /></div></div>
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <div className="flex justify-end gap-3 pt-2"><AdminButton variant="secondary" onClick={onClose}>Cancel</AdminButton><AdminButton onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</AdminButton></div>
    </AdminModal>
  );
}

function LaborTab() {
  const { items, setItems, loading, error, setError, load } = useCrud<DbLaborRate>('labor_rates');
  const [editing, setEditing] = useState<DbLaborRate | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function toggleActive(item: DbLaborRate) {
    const { error } = await supabase.from('labor_rates').update({ is_active: !item.is_active }).eq('id', item.id);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, is_active: !p.is_active } : p)));
  }
  async function remove(item: DbLaborRate) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    const { error } = await supabase.from('labor_rates').delete().eq('id', item.id);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.filter((p) => p.id !== item.id));
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching labor rates." />;
  return (
    <>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex justify-end"><AdminButton onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Add labor rate</AdminButton></div>
      {items.length === 0 ? <StateMessage type="empty" title="No labor rates yet" message="Add your first labor rate." /> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <AdminCard key={item.id} className="flex flex-col gap-2 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5"><h3 className="truncate text-xs font-bold text-brand-navy dark:text-white">{item.name}</h3>{!item.is_active && <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-600">Off</span>}</div>
                <p className="mt-1 text-xs font-semibold text-brand-purple">{formatCurrency(Number(item.rate_per_sqm), '₦')} / m²</p>
              </div>
              <div className="mt-2 flex shrink-0 items-center justify-between border-t border-neutral-100 pt-2 dark:border-white/5">
                <Toggle checked={item.is_active} onChange={() => toggleActive(item)} />
                <div className="flex items-center gap-0.5">
                  <AdminButton variant="secondary" onClick={() => { setEditing(item); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></AdminButton>
                  <AdminButton variant="danger" onClick={() => remove(item)}><Trash2 className="h-3.5 w-3.5" /></AdminButton>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
      {showForm && <LaborForm initial={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </>
  );
}

function LaborForm({ initial, onClose, onSaved }: { initial: DbLaborRate | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [ratePerSqm, setRatePerSqm] = useState(initial?.rate_per_sqm ?? 0);
  const [currency, setCurrency] = useState(initial?.currency ?? 'NGN');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSave() {
    if (!name.trim()) { setFormError('Name is required'); return; }
    if (ratePerSqm < 0) { setFormError('Rate cannot be negative'); return; }
    setSaving(true); setFormError(null);
    const payload = { name: name.trim(), rate_per_sqm: ratePerSqm, currency, is_active: isActive, sort_order: sortOrder };
    const { error } = initial ? await supabase.from('labor_rates').update(payload).eq('id', initial.id) : await supabase.from('labor_rates').insert(payload);
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    onSaved();
  }

  return (
    <AdminModal open onClose={onClose} title={initial ? 'Edit labor rate' : 'Add labor rate'} maxWidth="max-w-lg">
          <AdminField label="Rate name"><AdminInput  value={name} onChange={(e) => setName(e.target.value)} placeholder="Standard painter" /></AdminField>
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminField label="Rate per m²" error={ratePerSqm < 0 ? 'Cannot be negative' : undefined}><AdminInput type="number" min={0}  value={ratePerSqm} onChange={(e) => setRatePerSqm(Number(e.target.value))} /></AdminField>
            <AdminField label="Currency"><select className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="NGN">NGN (₦)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option></select></AdminField>
            <AdminField label="Sort order"><AdminInput type="number"  value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></AdminField>
          </div>
          <div><span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Active</span><div className="mt-2"><Toggle checked={isActive} onChange={setIsActive} /></div></div>
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <div className="flex justify-end gap-3 pt-2"><AdminButton variant="secondary" onClick={onClose}>Cancel</AdminButton><AdminButton onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</AdminButton></div>
    </AdminModal>
  );
}
