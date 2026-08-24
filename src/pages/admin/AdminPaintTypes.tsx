import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { DbPaintType } from '@/types/database';
import {AdminHeader, AdminCard, AdminButton, AdminField, StateMessage, Toggle, AdminInput} from '@/components/admin/AdminUi';
import { AdminModal } from '@/components/admin/AdminModal';

export default function AdminPaintTypes() {
  const [items, setItems] = useState<DbPaintType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DbPaintType | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    const { data, error } = await supabase.from('paint_types').select('*').order('sort_order');
    if (error) setError(error.message); else setItems(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleActive(item: DbPaintType) {
    const { error } = await supabase.from('paint_types').update({ is_active: !item.is_active }).eq('id', item.id);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, is_active: !p.is_active } : p)));
  }

  async function remove(item: DbPaintType) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('paint_types').delete().eq('id', item.id);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.filter((p) => p.id !== item.id));
  }

  return (
    <>
      <AdminHeader title="Paint Calculator" subtitle="Manage paint types, coverage rates, and container sizes used by the calculator."
        action={<AdminButton onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Add paint type</AdminButton>} />
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading ? <StateMessage type="loading" title="Loading…" message="Fetching paint types." />
        : items.length === 0 ? <StateMessage type="empty" title="No paint types yet" message="Add your first paint type to get started." />
        : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="card p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-brand-navy dark:text-white">{item.name}</h3>
                    {!item.is_active && <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">Inactive</span>}
                  </div>
                  {item.description && <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{item.description}</p>}
                  <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">Coverage: {item.coverage_rate} {item.coverage_unit} · Containers: {item.container_sizes.join(', ')} L</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Toggle checked={item.is_active} onChange={() => toggleActive(item)} />
                  <AdminButton variant="secondary" onClick={() => { setEditing(item); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /> Edit</AdminButton>
                  <AdminButton variant="danger" onClick={() => remove(item)}><Trash2 className="h-3.5 w-3.5" /></AdminButton>
                </div>
              </div>
            ))}
          </div>
        )}
      {showForm && <PaintTypeForm initial={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </>
  );
}

function PaintTypeForm({ initial, onClose, onSaved }: { initial: DbPaintType | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [coverageRate, setCoverageRate] = useState(initial?.coverage_rate ?? 10);
  const [coverageUnit, setCoverageUnit] = useState(initial?.coverage_unit ?? 'm2_per_liter');
  const [containerSizes, setContainerSizes] = useState(initial?.container_sizes?.join(', ') ?? '1, 4, 20');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSave() {
    if (!name.trim()) { setFormError('Name is required'); return; }
    if (coverageRate <= 0) { setFormError('Coverage rate must be greater than 0'); return; }
    const sizes = containerSizes.split(',').map((s) => Number(s.trim())).filter((n) => n > 0);
    if (sizes.length === 0) { setFormError('Enter at least one valid container size'); return; }
    setSaving(true); setFormError(null);
    const payload = { name: name.trim(), description: description.trim() || null, coverage_rate: coverageRate, coverage_unit: coverageUnit, container_sizes: sizes, is_active: isActive, sort_order: sortOrder };
    const { error } = initial ? await supabase.from('paint_types').update(payload).eq('id', initial.id) : await supabase.from('paint_types').insert(payload);
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    onSaved();
  }

  return (
    <AdminModal open onClose={onClose} title={initial ? 'Edit paint type' : 'Add paint type'} maxWidth="max-w-lg">
          <AdminField label="Name"><AdminInput  value={name} onChange={(e) => setName(e.target.value)} placeholder="Emulsion" /></AdminField>
          <AdminField label="Description"><AdminTextarea  rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></AdminField>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Coverage rate" hint="m² per liter per coat" error={coverageRate <= 0 ? 'Must be > 0' : undefined}>
              <AdminInput type="number" min={0} step="0.1"  value={coverageRate} onChange={(e) => setCoverageRate(Number(e.target.value))} />
            </AdminField>
            <AdminField label="Coverage unit">
              <AdminSelect  value={coverageUnit} onChange={(e) => setCoverageUnit(e.target.value)}>
                <option value="m2_per_liter">m² per liter</option>
                <option value="sqft_per_liter">sq ft per liter</option>
              </AdminSelect>
            </AdminField>
          </div>
          <AdminField label="Container sizes (liters)" hint="Comma separated, e.g. 1, 4, 20">
            <AdminInput  value={containerSizes} onChange={(e) => setContainerSizes(e.target.value)} />
          </AdminField>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Sort order"><AdminInput type="number"  value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></AdminField>
            <div><span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Active</span><div className="mt-2"><Toggle checked={isActive} onChange={setIsActive} /></div></div>
          </div>
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <AdminButton variant="secondary" onClick={onClose}>Cancel</AdminButton>
            <AdminButton onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</AdminButton>
          </div>
    </AdminModal>
  );
}
