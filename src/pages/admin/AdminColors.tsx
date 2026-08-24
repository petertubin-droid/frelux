import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Download, Upload, BadgeCheck, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { DbColorCategory, DbColorCombination, DbPaintColor, DbColorFamily } from '@/types/database';
import {AdminHeader, AdminCard, AdminButton, AdminField, StateMessage, Toggle, CollapsibleGroup, GroupControls, AdminInput} from '@/components/admin/AdminUi';
import { AdminModal } from '@/components/admin/AdminModal';
import { MediaUploader } from '@/components/admin/MediaUploader';
import { classNames } from '@/lib/utils';
import { readableTextColor } from '@/lib/colors';

type Tab = 'paint_colors' | 'combinations' | 'categories' | 'families';

export default function AdminColors() {
  const [tab, setTab] = useState<Tab>('paint_colors');
  return (
    <>
      <AdminHeader title="Color Gallery" subtitle="Manage individual paint colors, palettes, categories, and color families." />
      <div className="mb-5 inline-flex flex-wrap rounded-lg border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid p-1">
        {(['paint_colors','combinations','categories','families'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={classNames('rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-all', tab === t ? 'bg-brand-purple text-white' : 'text-neutral-600 hover:text-brand-purple')}>{t.replace('_', ' ')}</button>
        ))}
      </div>
      {tab === 'paint_colors' && <PaintColorsTab />}
      {tab === 'combinations' && <CombinationsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'families' && <FamiliesTab />}
    </>
  );
}

// =========================================================
// Paint Colors Tab
// =========================================================

function PaintColorsTab() {
  const [items, setItems] = useState<DbPaintColor[]>([]);
  const [families, setFamilies] = useState<DbColorFamily[]>([]);
  const [categories, setCategories] = useState<DbColorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DbPaintColor | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true); setError(null);
    const [pc, fam, cats] = await Promise.all([
      supabase.from('paint_colors').select('*').order('display_order').order('name'),
      supabase.from('color_families').select('*').order('sort_order'),
      supabase.from('color_categories').select('*').order('sort_order'),
    ]);
    if (pc.error) setError(pc.error.message);
    setItems(pc.data ?? []);
    setFamilies(fam.data ?? []);
    setCategories(cats.data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleField(item: DbPaintColor, field: 'is_featured' | 'is_trending' | 'is_active') {
    const { error } = await supabase.from('paint_colors').update({ [field]: !item[field] }).eq('id', item.id);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.map((p) => p.id === item.id ? { ...p, [field]: !p[field] } : p));
  }

  async function remove(item: DbPaintColor) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    const { error } = await supabase.from('paint_colors').delete().eq('id', item.id);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.filter((p) => p.id !== item.id));
  }

  function exportCsv() {
    const headers = ['name','slug','hex_code','family_slug','category_slug','is_interior','is_exterior','is_featured','is_trending','popularity_score','display_order'];
    const rows = items.map((c) => {
      const fam = families.find((f) => f.id === c.color_family_id);
      const cat = categories.find((ct) => ct.id === c.category_id);
      return [c.name, c.slug, c.hex_code, fam?.slug ?? '', cat?.slug ?? '', c.is_interior, c.is_exterior, c.is_featured, c.is_trending, c.popularity_score, c.display_order]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'paint_colors_export.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = search
    ? items.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.hex_code.toLowerCase().includes(search.toLowerCase()))
    : items;

  // Group colors by family so the panel is a set of organized,
  // collapsible sections instead of one long flat scroll.
  const groups: { key: string; label: string; sortOrder: number; items: DbPaintColor[] }[] = [];
  const groupIndex = new Map<string, number>();
  for (const item of filtered) {
    const fam = families.find((f) => f.id === item.color_family_id);
    const key = fam?.id ?? '__none__';
    const label = fam?.name ?? 'Uncategorized';
    const sortOrder = fam?.sort_order ?? Number.MAX_SAFE_INTEGER;
    let idx = groupIndex.get(key);
    if (idx === undefined) {
      idx = groups.length;
      groupIndex.set(key, idx);
      groups.push({ key, label, sortOrder, items: [] });
    }
    groups[idx].items.push(item);
  }
  groups.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));

  function isOpen(key: string) {
    // While searching, auto-expand every group that has a match so results are visible.
    if (search) return true;
    return !collapsed.has(key);
  }
  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  function expandAll() { setCollapsed(new Set()); }
  function collapseAll() { setCollapsed(new Set(groups.map((g) => g.key))); }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching paint colors." />;

  return (
    <>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or hex…" className="input-field dark:bg-brand-navy-mid dark:border-white/10 pl-9" />
        </div>
        <div className="flex gap-2">
          <AdminButton variant="secondary" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</AdminButton>
          <AdminButton variant="secondary" onClick={() => setShowImport(true)}><Upload className="h-4 w-4" /> Import</AdminButton>
          <AdminButton onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Add color</AdminButton>
        </div>
      </div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{filtered.length} of {items.length} colors</p>
        {!search && groups.length > 1 && <GroupControls onExpandAll={expandAll} onCollapseAll={collapseAll} groupLabel={`${groups.length} color families`} />}
      </div>
      {filtered.length === 0 ? <StateMessage type="empty" title="No colors found" message="Add your first paint color or adjust your search." /> : (
        <div className="space-y-3">
          {groups.map((group) => (
            <CollapsibleGroup
              key={group.key}
              title={group.label}
              count={group.items.length}
              isOpen={isOpen(group.key)}
              onToggle={() => toggleGroup(group.key)}
              preview={
                <div className="flex items-center -space-x-1.5">
                  {group.items.slice(0, 6).map((c) => (
                    <div key={c.id} className="h-5 w-5 rounded-full ring-2 ring-white dark:ring-brand-navy-mid" style={{ background: c.hex_code }} title={c.name} />
                  ))}
                  {group.items.length > 6 && <span className="ml-2 text-[11px] font-semibold text-neutral-400">+{group.items.length - 6}</span>}
                </div>
              }
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <div key={item.id} className="card p-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-black/5" style={{ background: item.hex_code }}>
                      <span className="text-[8px] font-bold" style={{ color: readableTextColor(item.hex_code) }}>{item.hex_code}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate text-xs font-bold text-brand-navy dark:text-white">{item.name}</h3>
                        {!item.is_active && <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-600">Off</span>}
                        {item.is_featured && <BadgeCheck className="h-3 w-3 text-brand-purple" />}
                        {item.is_trending && <TrendingUp className="h-3 w-3 text-accent-orange" />}
                      </div>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500">{item.is_interior ? 'Int' : ''}{item.is_interior && item.is_exterior ? '/' : ''}{item.is_exterior ? 'Ext' : ''}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-white/5">
                    <div className="flex items-center gap-1">
                      <ToggleChip active={item.is_featured} onClick={() => toggleField(item, 'is_featured')} label="Feat" />
                      <ToggleChip active={item.is_trending} onClick={() => toggleField(item, 'is_trending')} label="Trend" />
                      <ToggleChip active={item.is_active} onClick={() => toggleField(item, 'is_active')} label="On" />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <AdminButton variant="secondary" onClick={() => { setEditing(item); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></AdminButton>
                      <AdminButton variant="danger" onClick={() => remove(item)}><Trash2 className="h-3.5 w-3.5" /></AdminButton>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </CollapsibleGroup>
          ))}
        </div>
      )}
      {showForm && <PaintColorForm initial={editing} families={families} categories={categories} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {showImport && <ImportModal families={families} categories={categories} onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); load(); }} />}
    </>
  );
}

function ToggleChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={classNames('rounded-md border px-2 py-1 text-[10px] font-semibold transition-all', active ? 'border-brand-purple bg-brand-purple text-white' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300')}>{label}</button>
  );
}

function PaintColorForm({ initial, families, categories, onClose, onSaved }: { initial: DbPaintColor | null; families: DbColorFamily[]; categories: DbColorCategory[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [hex, setHex] = useState(initial?.hex_code ?? '#');
  const [familyId, setFamilyId] = useState(initial?.color_family_id ?? '');
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? '');
  const [usage, setUsage] = useState((initial?.recommended_usage ?? []).join(', '));
  const [finishes, setFinishes] = useState((initial?.finish_compatibility ?? []).join(', '));
  const [isInterior, setIsInterior] = useState(initial?.is_interior ?? true);
  const [isExterior, setIsExterior] = useState(initial?.is_exterior ?? false);
  const [popularity, setPopularity] = useState(initial?.popularity_score ?? 0);
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured ?? false);
  const [isTrending, setIsTrending] = useState(initial?.is_trending ?? false);
  const [displayOrder, setDisplayOrder] = useState(initial?.display_order ?? 0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  async function onSave() {
    if (!name.trim()) { setFormError('Name is required'); return; }
    const finalSlug = slugify(slug || name);
    if (!finalSlug || !/^[a-z0-9-]+$/.test(finalSlug)) { setFormError('Invalid slug'); return; }
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) { setFormError('Invalid HEX (use #RRGGBB format)'); return; }
    setSaving(true); setFormError(null);
    const payload = {
      name: name.trim(), slug: finalSlug, hex_code: hex.toUpperCase(),
      color_family_id: familyId || null, category_id: categoryId || null,
      recommended_usage: usage.split(',').map((r) => r.trim()).filter(Boolean),
      finish_compatibility: finishes.split(',').map((r) => r.trim()).filter(Boolean),
      is_interior: isInterior, is_exterior: isExterior,
      popularity_score: popularity, is_featured: isFeatured, is_trending: isTrending,
      display_order: displayOrder,
    };
    const { error } = initial ? await supabase.from('paint_colors').update(payload).eq('id', initial.id) : await supabase.from('paint_colors').insert(payload);
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    onSaved();
  }

  return (
    <AdminModal open onClose={onClose} title={initial ? 'Edit color' : 'Add color'} maxWidth="max-w-2xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Name"><AdminInput  value={name} onChange={(e) => setName(e.target.value)} onBlur={() => !slug && setSlug(slugify(name))} /></AdminField>
            <AdminField label="Slug" hint="lowercase, no spaces"><AdminInput  value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from name" /></AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminField label="HEX code" hint="#RRGGBB"><AdminInput className="font-mono" value={hex} onChange={(e) => setHex(e.target.value)} placeholder="#F5F1E8" /></AdminField>
            <div className="flex items-end"><div className="h-10 w-full rounded-lg ring-1 ring-black/5" style={{ background: hex }} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Color family"><select className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={familyId} onChange={(e) => setFamilyId(e.target.value)}><option value="">— None —</option>{families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></AdminField>
            <AdminField label="Category"><select className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">— None —</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Recommended usage" hint="Comma separated"><AdminInput  value={usage} onChange={(e) => setUsage(e.target.value)} placeholder="Living Room, Bedroom" /></AdminField>
            <AdminField label="Finish compatibility" hint="Comma separated"><AdminInput  value={finishes} onChange={(e) => setFinishes(e.target.value)} placeholder="Emulsion, Satin" /></AdminField>
          </div>
          <div className="flex flex-wrap gap-4">
            <div><span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Interior</span><div className="mt-2"><Toggle checked={isInterior} onChange={setIsInterior} /></div></div>
            <div><span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Exterior</span><div className="mt-2"><Toggle checked={isExterior} onChange={setIsExterior} /></div></div>
            <div><span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Featured</span><div className="mt-2"><Toggle checked={isFeatured} onChange={setIsFeatured} /></div></div>
            <div><span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Trending</span><div className="mt-2"><Toggle checked={isTrending} onChange={setIsTrending} /></div></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Popularity score"><AdminInput type="number"  value={popularity} onChange={(e) => setPopularity(Number(e.target.value))} /></AdminField>
            <AdminField label="Display order"><AdminInput type="number"  value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></AdminField>
          </div>
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <div className="flex justify-end gap-3 pt-2"><AdminButton variant="secondary" onClick={onClose}>Cancel</AdminButton><AdminButton onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</AdminButton></div>
    </AdminModal>
  );
}

function ImportModal({ families, categories, onClose, onDone }: { families: DbColorFamily[]; categories: DbColorCategory[]; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState('');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [result, setResult] = useState<{ added: number; errors: string[]; duplicates: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<{ name: string; hex: string; familySlug: string; catSlug: string; valid: boolean; error?: string }[] | null>(null);

  function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  function parseInput(input: string): { name: string; hex: string; familySlug: string; catSlug: string }[] {
    if (format === 'json') {
      try {
        const parsed = JSON.parse(input);
        if (!Array.isArray(parsed)) throw new Error('JSON must be an array');
        return parsed.map((item: Record<string, unknown>) => ({
          name: String(item.name ?? ''),
          hex: String(item.hex ?? item.hex_code ?? ''),
          familySlug: String(item.family_slug ?? ''),
          catSlug: String(item.category_slug ?? ''),
        }));
      } catch { return []; }
    }
    const lines = input.trim().split('\n').filter(Boolean);
    return lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
      return { name: parts[0] ?? '', hex: parts[1] ?? '', familySlug: parts[2] ?? '', catSlug: parts[3] ?? '' };
    });
  }

  function validateRows(rows: { name: string; hex: string; familySlug: string; catSlug: string }[]) {
    const seen = new Set<string>();
    const validated = rows.map((row) => {
      const slug = slugify(row.name);
      let error: string | undefined;
      if (!row.name) error = 'Missing name';
      else if (!/^#[0-9A-Fa-f]{6}$/.test(row.hex)) error = 'Invalid hex';
      else if (seen.has(slug)) error = 'Duplicate in import';
      else if (!slug) error = 'Invalid slug from name';
      if (!error) seen.add(slug);
      return { ...row, valid: !error, error };
    });
    setPreview(validated);
  }

  useEffect(() => {
    if (!text.trim()) { setPreview(null); return; }
    const rows = parseInput(text);
    validateRows(rows);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, format]);

  async function doImport() {
    if (!preview) return;
    const validRows = preview.filter((r) => r.valid);
    if (validRows.length === 0) return;
    setImporting(true);
    let added = 0;
    let duplicates = 0;
    const errors: string[] = [];
    for (const row of validRows) {
      const fam = families.find((f) => f.slug === row.familySlug);
      const cat = categories.find((c) => c.slug === row.catSlug);
      const slug = slugify(row.name);
      const { error } = await supabase.from('paint_colors').insert({
        name: row.name, slug, hex_code: row.hex.toUpperCase(),
        color_family_id: fam?.id ?? null, category_id: cat?.id ?? null,
      }).select('id').maybeSingle();
      if (error) {
        if (error.code === '23505') { duplicates++; errors.push(`${row.name}: duplicate slug already in database`); }
        else errors.push(`${row.name}: ${error.message}`);
      } else { added++; }
    }
    setResult({ added, errors, duplicates });
    setImporting(false);
    if (added > 0) setTimeout(onDone, 2000);
  }

  function downloadErrorReport() {
    if (!result) return;
    const report = result.errors.join('\n');
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'import_errors.txt'; a.click();
    URL.revokeObjectURL(url);
  }

  const validCount = preview?.filter((r) => r.valid).length ?? 0;
  const errorCount = preview?.filter((r) => !r.valid).length ?? 0;

  return (
    <AdminModal open onClose={onClose} title="Bulk import colors" maxWidth="max-w-2xl">

        {/* Format toggle */}
        <div className="mt-3 inline-flex rounded-lg border border-neutral-200 p-1">
          <button type="button" onClick={() => setFormat('csv')} className={classNames('rounded-md px-4 py-1.5 text-sm font-semibold transition-all', format === 'csv' ? 'bg-brand-purple text-white' : 'text-neutral-600')}>CSV</button>
          <button type="button" onClick={() => setFormat('json')} className={classNames('rounded-md px-4 py-1.5 text-sm font-semibold transition-all', format === 'json' ? 'bg-brand-purple text-white' : 'text-neutral-600')}>JSON</button>
        </div>

        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
          {format === 'csv'
            ? <>Format: <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">Name, #HEX, family slug, category slug</code></>
            : <>Format: <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">JSON array of objects: name, hex, family_slug, category_slug</code></>}
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500">Family and category slugs are optional. RGB/HSL are auto computed from the hex code.</p>

        <AdminTextarea className="mt-3 font-mono text-xs" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={format === 'csv' ? 'Warm White, #F5F1E8, white, interior-wall-colors' : '[{"name": "Warm White", "hex": "#F5F1E8"}]'} />

        {/* Validation preview */}
        {preview && (
          <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 dark:bg-white/5 dark:border-white/5 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                <span className="text-accent-green">{validCount} valid</span>
                {errorCount > 0 && <span className="ml-3 text-red-600">{errorCount} invalid</span>}
              </p>
              <button type="button" onClick={() => setPreview(null)} className="text-xs text-neutral-400 hover:text-neutral-600">Hide preview</button>
            </div>
            <div className="mt-2 max-h-32 overflow-y-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-neutral-400 dark:text-neutral-500"><th className="pb-1">Name</th><th className="pb-1">HEX</th><th className="pb-1">Status</th></tr></thead>
                <tbody>
                  {preview.slice(0, 20).map((r, i) => (
                    <tr key={i} className={r.valid ? '' : 'text-red-500'}>
                      <td className="py-0.5">{r.name || '—'}</td>
                      <td className="py-0.5 font-mono">{r.hex || '—'}</td>
                      <td className="py-0.5">{r.valid ? 'OK' : r.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 20 && <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">…and {preview.length - 20} more</p>}
            </div>
          </div>
        )}

        {/* Import result */}
        {result && (
          <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 dark:bg-white/5 dark:border-white/5 p-3 text-sm">
            <p className="font-semibold text-accent-green">{result.added} colors added{result.duplicates > 0 && `, ${result.duplicates} duplicates skipped`}</p>
            {result.errors.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-red-600">{result.errors.length} errors</p>
                  <button type="button" onClick={downloadErrorReport} className="text-xs font-semibold text-brand-purple hover:underline">Download error report</button>
                </div>
                <ul className="mt-1 text-xs text-red-500">{result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}</ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-3">
          <AdminButton variant="secondary" onClick={onClose}>Close</AdminButton>
          <AdminButton onClick={doImport} disabled={importing || validCount === 0}>{importing ? 'Importing…' : `Import ${validCount} colors`}</AdminButton>
        </div>
    </AdminModal>
  );
}

// =========================================================
// Color Families Tab
// =========================================================

function FamiliesTab() {
  const [items, setItems] = useState<DbColorFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DbColorFamily | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    const { data, error } = await supabase.from('color_families').select('*').order('sort_order');
    if (error) setError(error.message);
    setItems(data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleActive(item: DbColorFamily) {
    const { error } = await supabase.from('color_families').update({ is_active: !item.is_active }).eq('id', item.id);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.map((p) => p.id === item.id ? { ...p, is_active: !p.is_active } : p));
  }
  async function remove(item: DbColorFamily) {
    if (!confirm(`Delete family "${item.name}"?`)) return;
    const { error } = await supabase.from('color_families').delete().eq('id', item.id);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.filter((p) => p.id !== item.id));
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching color families." />;
  return (
    <>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex justify-end"><AdminButton onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Add family</AdminButton></div>
      {items.length === 0 ? <StateMessage type="empty" title="No families yet" message="Add your first color family." /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <AdminCard key={item.id} className="flex items-center justify-between">
              <div><h3 className="text-base font-bold text-brand-navy dark:text-white">{item.name}</h3><p className="text-xs text-neutral-400 dark:text-neutral-500">/{item.slug}</p></div>
              <div className="flex shrink-0 items-center gap-2">
                <Toggle checked={item.is_active} onChange={() => toggleActive(item)} />
                <AdminButton variant="secondary" onClick={() => { setEditing(item); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></AdminButton>
                <AdminButton variant="danger" onClick={() => remove(item)}><Trash2 className="h-3.5 w-3.5" /></AdminButton>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
      {showForm && <FamilyForm initial={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </>
  );
}

function FamilyForm({ initial, onClose, onSaved }: { initial: DbColorFamily | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  async function onSave() {
    if (!name.trim()) { setFormError('Name is required'); return; }
    const finalSlug = slugify(slug || name);
    if (!finalSlug || !/^[a-z0-9-]+$/.test(finalSlug)) { setFormError('Invalid slug'); return; }
    setSaving(true); setFormError(null);
    const payload = { name: name.trim(), slug: finalSlug, description: description.trim() || null, is_active: isActive, sort_order: sortOrder };
    const { error } = initial ? await supabase.from('color_families').update(payload).eq('id', initial.id) : await supabase.from('color_families').insert(payload);
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    onSaved();
  }

  return (
    <AdminModal open onClose={onClose} title={initial ? 'Edit family' : 'Add family'} maxWidth="max-w-md">
          <AdminField label="Name"><AdminInput  value={name} onChange={(e) => setName(e.target.value)} onBlur={() => !slug && setSlug(slugify(name))} /></AdminField>
          <AdminField label="Slug" hint="lowercase, no spaces"><AdminInput  value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from name" /></AdminField>
          <AdminField label="Description"><AdminInput  value={description} onChange={(e) => setDescription(e.target.value)} /></AdminField>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Sort order"><AdminInput type="number"  value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></AdminField>
            <div><span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Active</span><div className="mt-2"><Toggle checked={isActive} onChange={setIsActive} /></div></div>
          </div>
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <div className="flex justify-end gap-3 pt-2"><AdminButton variant="secondary" onClick={onClose}>Cancel</AdminButton><AdminButton onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</AdminButton></div>
    </AdminModal>
  );
}

// =========================================================
// Combinations Tab (existing, unchanged)
// =========================================================

function CombinationsTab() {
  const [items, setItems] = useState<DbColorCombination[]>([]);
  const [categories, setCategories] = useState<DbColorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DbColorCombination | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    const [comb, cats] = await Promise.all([supabase.from('color_combinations').select('*').order('sort_order'), supabase.from('color_categories').select('*').order('name')]);
    if (comb.error) setError(comb.error.message);
    if (cats.error) setError(cats.error.message);
    setItems(comb.data ?? []); setCategories(cats.data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function togglePublished(item: DbColorCombination) {
    const { error } = await supabase.from('color_combinations').update({ is_published: !item.is_published }).eq('id', item.id);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, is_published: !p.is_published } : p)));
  }
  async function remove(item: DbColorCombination) {
    if (!confirm(`Delete "${item.title}"?`)) return;
    const { error } = await supabase.from('color_combinations').delete().eq('id', item.id);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.filter((p) => p.id !== item.id));
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching color combinations." />;
  return (
    <>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex justify-end"><AdminButton onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Add combination</AdminButton></div>
      {items.length === 0 ? <StateMessage type="empty" title="No combinations yet" message="Add your first color combination." /> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const cats = categories.filter((c) => item.category_ids?.includes(c.id));
            return (
              <div key={item.id} className="card group overflow-hidden p-0">
                <div className="relative aspect-video overflow-hidden">
                  <img src={item.image_url} alt={item.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                  <div className="absolute right-2 top-2">
                    {!item.is_published ? <span className="rounded-full bg-neutral-900/70 px-2 py-0.5 text-[10px] font-semibold text-white">Draft</span> : <span className="rounded-full bg-accent-green/90 px-2 py-0.5 text-[10px] font-semibold text-white">Published</span>}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="truncate text-sm font-bold text-brand-navy dark:text-white">{item.title}</h3>
                  <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">{item.description}</p>
                  {cats.length > 0 && <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">{cats.map((c) => c.name).join(' · ')}</p>}
                  <div className="mt-2.5 flex items-center justify-between border-t border-neutral-100 pt-2.5 dark:border-white/5">
                    <Toggle checked={item.is_published} onChange={() => togglePublished(item)} />
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => { setEditing(item); setShowForm(true); }} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-brand-purple dark:hover:bg-white/10"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => remove(item)} className="rounded-md p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showForm && <CombinationForm initial={editing} categories={categories} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </>
  );
}

function CombinationForm({ initial, categories, onClose, onSaved }: { initial: DbColorCombination | null; categories: DbColorCategory[]; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [mainName, setMainName] = useState(initial?.main_color_name ?? '');
  const [mainCode, setMainCode] = useState(initial?.main_color_code ?? '#');
  const [secName, setSecName] = useState(initial?.secondary_color_name ?? '');
  const [secCode, setSecCode] = useState(initial?.secondary_color_code ?? '#');
  const [accName, setAccName] = useState(initial?.accent_color_name ?? '');
  const [accCode, setAccCode] = useState(initial?.accent_color_code ?? '#');
  const [rooms, setRooms] = useState((initial?.recommended_rooms ?? []).join(', '));
  const [style, setStyle] = useState(initial?.style ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '');
  const [categoryIds, setCategoryIds] = useState<string[]>(initial?.category_ids ?? []);
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? false);
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  async function onSave() {
    if (!title.trim()) { setFormError('Title is required'); return; }
    const finalSlug = slugify(slug || title);
    if (!finalSlug || !/^[a-z0-9-]+$/.test(finalSlug)) { setFormError('Invalid slug'); return; }
    if (!description.trim()) { setFormError('Description is required'); return; }
    if (!imageUrl.trim()) { setFormError('Image URL is required'); return; }
    if (!style.trim()) { setFormError('Style is required'); return; }
    setSaving(true); setFormError(null);
    const payload = { title: title.trim(), slug: finalSlug, description: description.trim(), main_color_name: mainName.trim(), main_color_code: mainCode.trim(), secondary_color_name: secName.trim(), secondary_color_code: secCode.trim(), accent_color_name: accName.trim(), accent_color_code: accCode.trim(), recommended_rooms: rooms.split(',').map((r) => r.trim()).filter(Boolean), style: style.trim(), image_url: imageUrl.trim(), category_ids: categoryIds, is_published: isPublished, sort_order: sortOrder };
    const { error } = initial ? await supabase.from('color_combinations').update(payload).eq('id', initial.id) : await supabase.from('color_combinations').insert(payload);
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    onSaved();
  }

  return (
    <AdminModal open onClose={onClose} title={initial ? 'Edit combination' : 'Add combination'} maxWidth="max-w-2xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Title"><AdminInput  value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => !slug && setSlug(slugify(title))} /></AdminField>
            <AdminField label="Slug" hint="lowercase, no spaces"><AdminInput  value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from title" /></AdminField>
          </div>
          <AdminField label="Description"><AdminTextarea  rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></AdminField>
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminField label="Main color name"><AdminInput  value={mainName} onChange={(e) => setMainName(e.target.value)} /></AdminField>
            <AdminField label="Main color code"><AdminInput  value={mainCode} onChange={(e) => setMainCode(e.target.value)} placeholder="#F5F1E8" /></AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminField label="Secondary name"><AdminInput  value={secName} onChange={(e) => setSecName(e.target.value)} /></AdminField>
            <AdminField label="Secondary code"><AdminInput  value={secCode} onChange={(e) => setSecCode(e.target.value)} /></AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminField label="Accent name"><AdminInput  value={accName} onChange={(e) => setAccName(e.target.value)} /></AdminField>
            <AdminField label="Accent code"><AdminInput  value={accCode} onChange={(e) => setAccCode(e.target.value)} /></AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Recommended rooms" hint="Comma separated"><AdminInput  value={rooms} onChange={(e) => setRooms(e.target.value)} placeholder="Living Room, Hallway" /></AdminField>
            <AdminField label="Style"><AdminInput  value={style} onChange={(e) => setStyle(e.target.value)} /></AdminField>
          </div>
          <MediaUploader label="Image" value={imageUrl} onChange={setImageUrl} folder="colors" />
          <AdminField label="Categories">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const selected = categoryIds.includes(c.id);
                return <button key={c.id} type="button" onClick={() => setCategoryIds((prev) => selected ? prev.filter((id) => id !== c.id) : [...prev, c.id])} className={classNames('rounded-full border px-3 py-1.5 text-xs font-semibold transition-all', selected ? 'border-brand-purple bg-brand-purple text-white' : 'border-neutral-200 text-neutral-600 hover:border-neutral-300')}>{c.name}</button>;
              })}
            </div>
          </AdminField>
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminField label="Sort order"><AdminInput type="number"  value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></AdminField>
            <div><span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Published</span><div className="mt-2"><Toggle checked={isPublished} onChange={setIsPublished} /></div></div>
          </div>
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <div className="flex justify-end gap-3 pt-2"><AdminButton variant="secondary" onClick={onClose}>Cancel</AdminButton><AdminButton onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</AdminButton></div>
    </AdminModal>
  );
}

// =========================================================
// Categories Tab (existing, unchanged)
// =========================================================

function CategoriesTab() {
  const [items, setItems] = useState<DbColorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DbColorCategory | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    const { data, error } = await supabase.from('color_categories').select('*').order('sort_order');
    if (error) setError(error.message);
    setItems(data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleActive(item: DbColorCategory) {
    const { error } = await supabase.from('color_categories').update({ is_active: !item.is_active }).eq('id', item.id);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, is_active: !p.is_active } : p)));
  }
  async function remove(item: DbColorCategory) {
    if (!confirm(`Delete category "${item.name}"?`)) return;
    const { error } = await supabase.from('color_categories').delete().eq('id', item.id);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.filter((p) => p.id !== item.id));
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching categories." />;
  return (
    <>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex justify-end"><AdminButton onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Add category</AdminButton></div>
      {items.length === 0 ? <StateMessage type="empty" title="No categories yet" message="Add your first category." /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <AdminCard key={item.id} className="flex items-center justify-between">
              <div><h3 className="text-base font-bold text-brand-navy dark:text-white">{item.name}</h3><p className="text-xs text-neutral-400 dark:text-neutral-500">/{item.slug}</p></div>
              <div className="flex shrink-0 items-center gap-2">
                <Toggle checked={item.is_active} onChange={() => toggleActive(item)} />
                <AdminButton variant="secondary" onClick={() => { setEditing(item); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></AdminButton>
                <AdminButton variant="danger" onClick={() => remove(item)}><Trash2 className="h-3.5 w-3.5" /></AdminButton>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
      {showForm && <CategoryForm initial={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </>
  );
}

function CategoryForm({ initial, onClose, onSaved }: { initial: DbColorCategory | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [type, setType] = useState<DbColorCategory['type']>(initial?.type ?? 'room');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  async function onSave() {
    if (!name.trim()) { setFormError('Name is required'); return; }
    const finalSlug = slugify(slug || name);
    if (!finalSlug || !/^[a-z0-9-]+$/.test(finalSlug)) { setFormError('Invalid slug'); return; }
    setSaving(true); setFormError(null);
    const payload = { name: name.trim(), slug: finalSlug, type, is_active: isActive, sort_order: sortOrder };
    const { error } = initial ? await supabase.from('color_categories').update(payload).eq('id', initial.id) : await supabase.from('color_categories').insert(payload);
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    onSaved();
  }

  return (
    <AdminModal open onClose={onClose} title={initial ? 'Edit category' : 'Add category'} maxWidth="max-w-md">
          <AdminField label="Name"><AdminInput  value={name} onChange={(e) => setName(e.target.value)} onBlur={() => !slug && setSlug(slugify(name))} /></AdminField>
          <AdminField label="Slug" hint="lowercase, no spaces"><AdminInput  value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from name" /></AdminField>
          <AdminField label="Type">
            <select className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={type} onChange={(e) => setType(e.target.value as DbColorCategory['type'])}>
              <option value="room">Room</option>
              <option value="style">Style</option>
              <option value="surface">Surface</option>
              <option value="collection">Collection</option>
              <option value="seasonal">Seasonal</option>
            </select>
          </AdminField>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Sort order"><AdminInput type="number"  value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></AdminField>
            <div><span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Active</span><div className="mt-2"><Toggle checked={isActive} onChange={setIsActive} /></div></div>
          </div>
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <div className="flex justify-end gap-3 pt-2"><AdminButton variant="secondary" onClick={onClose}>Cancel</AdminButton><AdminButton onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</AdminButton></div>
    </AdminModal>
  );
}
