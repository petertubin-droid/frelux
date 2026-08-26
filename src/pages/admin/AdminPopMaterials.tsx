import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X, Check, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminHeader, AdminCard, AdminButton, AdminField, StateMessage, Toggle, AdminInput, AdminIconButton, AdminSelect } from '@/components/admin/AdminUi';
import { classNames } from '@/lib/utils';
import type { DbPopMaterial, PopWorkflowType, PopMaterialCategory } from '@/types/database';

type Status = 'loading' | 'ready' | 'error';

const categories: PopMaterialCategory[] = ['primary', 'finishing', 'decorative', 'framework', 'ceiling_boards', 'fasteners', 'labour'];
const workflows: PopWorkflowType[] = ['nigeria', 'international'];

export default function AdminPopMaterials() {
  const [materials, setMaterials] = useState<DbPopMaterial[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [filterWf, setFilterWf] = useState<PopWorkflowType>('nigeria');
  const [editing, setEditing] = useState<DbPopMaterial | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setStatus('loading');
    const { data, error } = await supabase.from('pop_materials').select('*').order('workflow').order('category').order('sort_order');
    if (error) { setError(error.message); setStatus('error'); return; }
    setMaterials((data ?? []) as DbPopMaterial[]);
    setStatus('ready');
  }

  async function handleSave(mat: Partial<DbPopMaterial>) {
    // Validate numeric fields before saving
    const validated = { ...mat };
    if ('coverage_rate' in validated) validated.coverage_rate = Math.max(0.1, Number(validated.coverage_rate) || 0.1);
    if ('package_size' in validated) validated.package_size = Math.max(1, Number(validated.package_size) || 1);
    if ('unit_price' in validated) validated.unit_price = Math.max(0, Number(validated.unit_price) || 0);
    if ('labour_rate_per_sqm' in validated) validated.labour_rate_per_sqm = Math.max(0, Number(validated.labour_rate_per_sqm) || 0);
    if (editing) {
      await supabase.from('pop_materials').update({ ...validated, updated_at: new Date().toISOString() }).eq('id', editing.id);
    } else {
      await supabase.from('pop_materials').insert(validated);
    }
    setShowEditor(false); setEditing(null); load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this material?')) return;
    await supabase.from('pop_materials').delete().eq('id', id);
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleToggleActive(mat: DbPopMaterial) {
    await supabase.from('pop_materials').update({ is_active: !mat.is_active }).eq('id', mat.id);
    setMaterials((prev) => prev.map((m) => m.id === mat.id ? { ...m, is_active: !m.is_active } : m));
  }

  function handleExport() {
    const csv = ['workflow,category,name,unit,coverage_rate,coverage_unit,package_size,package_unit,unit_price,labour_rate_per_sqm,is_optional,is_active,sort_order'];
    materials.forEach((m) => {
      csv.push([m.workflow, m.category, `"${m.name}"`, m.unit, m.coverage_rate, m.coverage_unit, m.package_size, m.package_unit, m.unit_price, m.labour_rate_per_sqm, m.is_optional, m.is_active, m.sort_order].join(','));
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'pop_materials.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = materials.filter((m) => m.workflow === filterWf);

  if (status === 'loading') return <><AdminHeader title="POP Materials" subtitle="Manage POP ceiling material library and pricing." /><StateMessage type="loading" title="Loading…" message="Fetching materials." /></>;
  if (status === 'error') return <><AdminHeader title="POP Materials" subtitle="Manage POP ceiling material library and pricing." /><StateMessage type="error" title="Error" message={error} /></>;

  return (
    <>
      <AdminHeader title="POP Materials" subtitle="Manage POP ceiling material library and pricing."
        action={<div className="flex gap-2">
          <AdminButton onClick={handleExport}><Download aria-hidden="true" className="h-4 w-4" /> Export</AdminButton>
          <AdminButton onClick={() => { setEditing(null); setShowEditor(true); }}><Plus aria-hidden="true" className="h-4 w-4" /> Add Material</AdminButton>
        </div>}
      />

      <div className="mb-4 inline-flex rounded-lg border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid p-1">
        {workflows.map((wf) => (
          <AdminButton key={wf} type="button" onClick={() => setFilterWf(wf)}
            className={classNames('rounded-md px-4 py-2 text-sm font-semibold capitalize transition-all', filterWf === wf ? 'bg-brand-purple text-white' : 'text-neutral-600 hover:text-brand-purple')}>
            {wf}
          </AdminButton>
        ))}
      </div>

      {!showEditor && (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <StateMessage type="empty" title="No materials" message="Add materials for this workflow." />
          ) : categories.map((cat) => {
            const catItems = filtered.filter((m) => m.category === cat);
            if (catItems.length === 0) return null;
            return (
              <div key={cat}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">{cat.replace(/_/g, ' ')}</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {catItems.map((mat) => (
                    <div key={mat.id} className="card p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-xs font-bold text-brand-navy dark:text-white">{mat.name}</p>
                            {mat.is_optional && <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-500">Opt</span>}
                          </div>
                          <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">
                            {mat.coverage_rate} {mat.coverage_unit} · {mat.package_size}{mat.package_unit} · ₦{mat.unit_price}
                          </p>
                        </div>
                        <span className={classNames('rounded-full px-1.5 py-0.5 text-[9px] font-semibold', mat.is_active ? 'bg-accent-green/15 text-accent-green' : 'bg-neutral-100 text-neutral-500')}>
                          {mat.is_active ? 'On' : 'Off'}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-white/5">
                        <Toggle checked={mat.is_active} onChange={() => handleToggleActive(mat)} />
                        <div className="flex items-center gap-0.5">
                          <AdminIconButton variant="ghost" type="button" onClick={() => { setEditing(mat); setShowEditor(true); }} ><Pencil className="h-3 w-3" /></AdminIconButton>
                          <AdminIconButton variant="danger" type="button" onClick={() => handleDelete(mat.id)} ><Trash2 aria-hidden="true" className="h-3 w-3" /></AdminIconButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showEditor && <MaterialEditor material={editing} defaultWorkflow={filterWf} onSave={handleSave} onCancel={() => { setShowEditor(false); setEditing(null); }} />}
    </>
  );
}

function MaterialEditor({ material, defaultWorkflow, onSave, onCancel }: {
  material: DbPopMaterial | null;
  defaultWorkflow: PopWorkflowType;
  onSave: (data: Partial<DbPopMaterial>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    workflow: material?.workflow ?? defaultWorkflow,
    category: material?.category ?? 'primary',
    name: material?.name ?? '',
    unit: material?.unit ?? 'bag',
    coverage_rate: material?.coverage_rate ?? 1,
    coverage_unit: material?.coverage_unit ?? 'm²',
    package_size: material?.package_size ?? 1,
    package_unit: material?.package_unit ?? 'unit',
    unit_price: material?.unit_price ?? 0,
    labour_rate_per_sqm: material?.labour_rate_per_sqm ?? 0,
    is_optional: material?.is_optional ?? false,
    is_active: material?.is_active ?? true,
    sort_order: material?.sort_order ?? 0,
  });

  return (
    <AdminCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">{material ? 'Edit Material' : 'New Material'}</h2>
        <AdminIconButton variant="ghost" type="button" onClick={onCancel} ><X aria-hidden="true" className="h-4 w-4" /></AdminIconButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Name"><AdminInput  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></AdminField>
        <AdminField label="Workflow">
          <AdminSelect  value={form.workflow} onChange={(e) => setForm({ ...form, workflow: e.target.value as PopWorkflowType })}>
            {workflows.map((w) => <option key={w} value={w} className="capitalize">{w}</option>)}
          </AdminSelect>
        </AdminField>
        <AdminField label="Category">
          <AdminSelect  value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as PopMaterialCategory })}>
            {categories.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </AdminSelect>
        </AdminField>
        <AdminField label="Unit"><AdminInput  value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></AdminField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminField label="Coverage Rate"><AdminInput type="number" step="0.1"  value={form.coverage_rate} onChange={(e) => setForm({ ...form, coverage_rate: Number(e.target.value) })} /></AdminField>
        <AdminField label="Coverage Unit"><AdminInput  value={form.coverage_unit} onChange={(e) => setForm({ ...form, coverage_unit: e.target.value })} /></AdminField>
        <AdminField label="Package Size"><AdminInput type="number" step="0.1"  value={form.package_size} onChange={(e) => setForm({ ...form, package_size: Number(e.target.value) })} /></AdminField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminField label="Package Unit"><AdminInput  value={form.package_unit} onChange={(e) => setForm({ ...form, package_unit: e.target.value })} /></AdminField>
        <AdminField label="Unit Price (₦)"><AdminInput type="number"  value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })} /></AdminField>
        <AdminField label="Labour Rate/m² (₦)"><AdminInput type="number"  value={form.labour_rate_per_sqm} onChange={(e) => setForm({ ...form, labour_rate_per_sqm: Number(e.target.value) })} /></AdminField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminField label="Sort Order"><AdminInput type="number"  value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></AdminField>
        <label className="flex items-center gap-2 pt-6 text-sm text-neutral-600">
          <AdminInput type="checkbox" checked={form.is_optional} onChange={(e) => setForm({ ...form, is_optional: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-brand-purple" /> Optional
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm text-neutral-600">
          <AdminInput type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-brand-purple" /> Active
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <AdminButton onClick={onCancel}>Cancel</AdminButton>
        <AdminButton onClick={() => onSave(form)} disabled={!form.name.trim()}>
          <Check aria-hidden="true" className="h-4 w-4" /> Save
        </AdminButton>
      </div>
    </AdminCard>
  );
}
