import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X, Check, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {AdminHeader, AdminCard, AdminButton, AdminField, StateMessage, Toggle, AdminInput} from '@/components/admin/AdminUi';
import { classNames } from '@/lib/utils';
import type { DbTileSize, DbTileMaterial, TileMaterialCategory } from '@/types/database';

type Status = 'loading' | 'ready' | 'error';
type Tab = 'sizes' | 'materials';

const tileCategories: TileMaterialCategory[] = ['tile', 'adhesive', 'grout', 'spacer', 'cement', 'sand', 'labour', 'other'];

export default function AdminTileMaterials() {
  const [tab, setTab] = useState<Tab>('sizes');
  const [sizes, setSizes] = useState<DbTileSize[]>([]);
  const [materials, setMaterials] = useState<DbTileMaterial[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [editingSize, setEditingSize] = useState<DbTileSize | null>(null);
  const [editingMat, setEditingMat] = useState<DbTileMaterial | null>(null);
  const [showSizeEditor, setShowSizeEditor] = useState(false);
  const [showMatEditor, setShowMatEditor] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setStatus('loading');
    const [sizeRes, matRes] = await Promise.all([
      supabase.from('tile_sizes').select('*').order('sort_order'),
      supabase.from('tile_materials').select('*').order('category').order('sort_order'),
    ]);
    if (sizeRes.error) { setError(sizeRes.error.message); setStatus('error'); return; }
    if (matRes.error) { setError(matRes.error.message); setStatus('error'); return; }
    setSizes((sizeRes.data ?? []) as DbTileSize[]);
    setMaterials((matRes.data ?? []) as DbTileMaterial[]);
    setStatus('ready');
  }

  async function handleSaveSize(data: Partial<DbTileSize>) {
    if (editingSize) {
      await supabase.from('tile_sizes').update({ ...data, updated_at: new Date().toISOString() }).eq('id', editingSize.id);
    } else {
      await supabase.from('tile_sizes').insert(data);
    }
    setShowSizeEditor(false); setEditingSize(null); load();
  }

  async function handleSaveMat(data: Partial<DbTileMaterial>) {
    // Validate numeric fields before saving
    const validated = { ...data };
    if ('coverage_rate' in validated) validated.coverage_rate = Math.max(0.1, Number(validated.coverage_rate) || 0.1);
    if ('package_size' in validated) validated.package_size = Math.max(1, Number(validated.package_size) || 1);
    if ('unit_price' in validated) validated.unit_price = Math.max(0, Number(validated.unit_price) || 0);
    if ('labour_rate_per_sqm' in validated) validated.labour_rate_per_sqm = Math.max(0, Number(validated.labour_rate_per_sqm) || 0);
    if (editingMat) {
      await supabase.from('tile_materials').update({ ...validated, updated_at: new Date().toISOString() }).eq('id', editingMat.id);
    } else {
      await supabase.from('tile_materials').insert(validated);
    }
    setShowMatEditor(false); setEditingMat(null); load();
  }

  async function handleDeleteSize(id: string) {
    if (!confirm('Delete this tile size?')) return;
    await supabase.from('tile_sizes').delete().eq('id', id);
    setSizes((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleDeleteMat(id: string) {
    if (!confirm('Delete this material?')) return;
    await supabase.from('tile_materials').delete().eq('id', id);
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleToggleSizeActive(s: DbTileSize) {
    await supabase.from('tile_sizes').update({ is_active: !s.is_active }).eq('id', s.id);
    setSizes((prev) => prev.map((x) => x.id === s.id ? { ...x, is_active: !x.is_active } : x));
  }

  async function handleToggleMatActive(m: DbTileMaterial) {
    await supabase.from('tile_materials').update({ is_active: !m.is_active }).eq('id', m.id);
    setMaterials((prev) => prev.map((x) => x.id === m.id ? { ...x, is_active: !x.is_active } : x));
  }

  function handleExportSizes() {
    const csv = ['name,width_mm,height_mm,tiles_per_box,is_standard,is_active,sort_order'];
    sizes.forEach((s) => csv.push([`"${s.name}"`, s.width_mm, s.height_mm, s.tiles_per_box, s.is_standard, s.is_active, s.sort_order].join(',')));
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'tile_sizes.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  if (status === 'loading') return <><AdminHeader title="Tile Library" subtitle="Manage tile sizes and installation materials." /><StateMessage type="loading" title="Loading…" message="Fetching data." /></>;
  if (status === 'error') return <><AdminHeader title="Tile Library" subtitle="Manage tile sizes and installation materials." /><StateMessage type="error" title="Error" message={error} /></>;

  return (
    <>
      <AdminHeader title="Tile Library" subtitle="Manage tile sizes and installation materials."
        action={tab === 'sizes' ?
          <div className="flex gap-2"><AdminButton onClick={handleExportSizes}><Download className="h-4 w-4" /> Export</AdminButton>
          <AdminButton onClick={() => { setEditingSize(null); setShowSizeEditor(true); }}><Plus className="h-4 w-4" /> Add Size</AdminButton></div> :
          <AdminButton onClick={() => { setEditingMat(null); setShowMatEditor(true); }}><Plus className="h-4 w-4" /> Add Material</AdminButton>
        }
      />

      <div className="mb-4 inline-flex rounded-lg border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid p-1">
        {(['sizes', 'materials'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={classNames('rounded-md px-4 py-2 text-sm font-semibold capitalize transition-all', tab === t ? 'bg-brand-purple text-white' : 'text-neutral-600 hover:text-brand-purple')}>
            {t === 'sizes' ? 'Tile Sizes' : 'Materials'}
          </button>
        ))}
      </div>

      {/* Tile sizes */}
      {tab === 'sizes' && !showSizeEditor && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sizes.length === 0 ? (
            <StateMessage type="empty" title="No tile sizes" message="Add tile sizes to get started." />
          ) : sizes.map((s) => (
            <AdminCard key={s.id} className="flex flex-col gap-2 p-3">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-bold text-brand-navy dark:text-white">{s.name}</p>
                  {s.is_standard && <span className="rounded-full bg-brand-purple/15 px-1.5 py-0.5 text-[9px] font-semibold text-brand-purple">Std</span>}
                  <span className={classNames('rounded-full px-1.5 py-0.5 text-[9px] font-semibold', s.is_active ? 'bg-accent-green/15 text-accent-green' : 'bg-neutral-100 text-neutral-500')}>
                    {s.is_active ? 'On' : 'Off'}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">{s.width_mm}×{s.height_mm}mm · {s.tiles_per_box}/box</p>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-white/5">
                <Toggle checked={s.is_active} onChange={() => handleToggleSizeActive(s)} />
                <div className="flex items-center gap-0.5">
                  <button type="button" onClick={() => { setEditingSize(s); setShowSizeEditor(true); }} className="rounded-md p-1.5 text-neutral-400 hover:text-brand-purple"><Pencil className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => handleDeleteSize(s.id)} className="rounded-md p-1.5 text-neutral-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {tab === 'sizes' && showSizeEditor && (
        <TileSizeEditor size={editingSize} onSave={handleSaveSize} onCancel={() => { setShowSizeEditor(false); setEditingSize(null); }} />
      )}

      {/* Tile materials */}
      {tab === 'materials' && !showMatEditor && (
        <div className="space-y-3">
          {materials.length === 0 ? (
            <StateMessage type="empty" title="No materials" message="Add tile installation materials." />
          ) : tileCategories.map((cat) => {
            const catItems = materials.filter((m) => m.category === cat);
            if (catItems.length === 0) return null;
            return (
              <div key={cat}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">{cat}</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {catItems.map((m) => (
                    <AdminCard key={m.id} className="flex flex-col gap-2 p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-brand-navy dark:text-white">{m.name}</p>
                          <span className={classNames('rounded-full px-2 py-0.5 text-[10px] font-semibold', m.is_active ? 'bg-accent-green/15 text-accent-green' : 'bg-neutral-100 text-neutral-500')}>
                            {m.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">{m.coverage_rate} {m.coverage_unit} · ₦{m.unit_price} · Labour ₦{m.labour_rate_per_sqm}/m²</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Toggle checked={m.is_active} onChange={() => handleToggleMatActive(m)} />
                        <button type="button" onClick={() => { setEditingMat(m); setShowMatEditor(true); }} className="rounded-md p-2 text-neutral-400 hover:text-brand-purple"><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => handleDeleteMat(m.id)} className="rounded-md p-2 text-neutral-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </AdminCard>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'materials' && showMatEditor && (
        <TileMaterialEditor material={editingMat} onSave={handleSaveMat} onCancel={() => { setShowMatEditor(false); setEditingMat(null); }} />
      )}
    </>
  );
}

function TileSizeEditor({ size, onSave, onCancel }: { size: DbTileSize | null; onSave: (d: Partial<DbTileSize>) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: size?.name ?? '',
    width_mm: size?.width_mm ?? 300,
    height_mm: size?.height_mm ?? 300,
    tiles_per_box: size?.tiles_per_box ?? 1,
    is_standard: size?.is_standard ?? true,
    is_active: size?.is_active ?? true,
    sort_order: size?.sort_order ?? 0,
  });
  return (
    <AdminCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">{size ? 'Edit Tile Size' : 'New Tile Size'}</h2>
        <button type="button" onClick={onCancel} className="rounded-md p-2 text-neutral-400 hover:text-neutral-600"><X className="h-4 w-4" /></button>
      </div>
      <AdminField label="Name"><AdminInput  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 300 × 300 mm" /></AdminField>
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminField label="Width (mm)"><AdminInput type="number"  value={form.width_mm} onChange={(e) => setForm({ ...form, width_mm: Number(e.target.value) })} /></AdminField>
        <AdminField label="Height (mm)"><AdminInput type="number"  value={form.height_mm} onChange={(e) => setForm({ ...form, height_mm: Number(e.target.value) })} /></AdminField>
        <AdminField label="Tiles per box"><AdminInput type="number" min={1}  value={form.tiles_per_box} onChange={(e) => setForm({ ...form, tiles_per_box: Number(e.target.value) })} /></AdminField>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminField label="Sort Order"><AdminInput type="number"  value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></AdminField>
        <label className="flex items-center gap-2 pt-6 text-sm text-neutral-600"><input type="checkbox" checked={form.is_standard} onChange={(e) => setForm({ ...form, is_standard: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-brand-purple" /> Standard</label>
        <label className="flex items-center gap-2 pt-6 text-sm text-neutral-600"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-brand-purple" /> Active</label>
      </div>
      <div className="flex justify-end gap-3">
        <AdminButton onClick={onCancel}>Cancel</AdminButton>
        <AdminButton onClick={() => onSave(form)} disabled={!form.name.trim()}><Check className="h-4 w-4" /> Save</AdminButton>
      </div>
    </AdminCard>
  );
}

function TileMaterialEditor({ material, onSave, onCancel }: { material: DbTileMaterial | null; onSave: (d: Partial<DbTileMaterial>) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    category: material?.category ?? 'adhesive',
    name: material?.name ?? '',
    unit: material?.unit ?? 'bag',
    coverage_rate: material?.coverage_rate ?? 1,
    coverage_unit: material?.coverage_unit ?? 'm²',
    package_size: material?.package_size ?? 1,
    package_unit: material?.package_unit ?? 'unit',
    unit_price: material?.unit_price ?? 0,
    labour_rate_per_sqm: material?.labour_rate_per_sqm ?? 0,
    is_active: material?.is_active ?? true,
    sort_order: material?.sort_order ?? 0,
  });
  return (
    <AdminCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">{material ? 'Edit Material' : 'New Material'}</h2>
        <button type="button" onClick={onCancel} className="rounded-md p-2 text-neutral-400 hover:text-neutral-600"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Name"><AdminInput  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></AdminField>
        <AdminField label="Category">
          <AdminSelect  value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as TileMaterialCategory })}>
            {tileCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </AdminSelect>
        </AdminField>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminField label="Coverage Rate"><AdminInput type="number" step="0.1"  value={form.coverage_rate} onChange={(e) => setForm({ ...form, coverage_rate: Number(e.target.value) })} /></AdminField>
        <AdminField label="Coverage Unit"><AdminInput  value={form.coverage_unit} onChange={(e) => setForm({ ...form, coverage_unit: e.target.value })} /></AdminField>
        <AdminField label="Unit"><AdminInput  value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></AdminField>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminField label="Package Size"><AdminInput type="number" step="0.1"  value={form.package_size} onChange={(e) => setForm({ ...form, package_size: Number(e.target.value) })} /></AdminField>
        <AdminField label="Package Unit"><AdminInput  value={form.package_unit} onChange={(e) => setForm({ ...form, package_unit: e.target.value })} /></AdminField>
        <AdminField label="Unit Price (₦)"><AdminInput type="number"  value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })} /></AdminField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Labour Rate/m² (₦)"><AdminInput type="number"  value={form.labour_rate_per_sqm} onChange={(e) => setForm({ ...form, labour_rate_per_sqm: Number(e.target.value) })} /></AdminField>
        <AdminField label="Sort Order"><AdminInput type="number"  value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></AdminField>
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral-600"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-brand-purple" /> Active</label>
      <div className="flex justify-end gap-3">
        <AdminButton onClick={onCancel}>Cancel</AdminButton>
        <AdminButton onClick={() => onSave(form)} disabled={!form.name.trim()}><Check className="h-4 w-4" /> Save</AdminButton>
      </div>
    </AdminCard>
  );
}
