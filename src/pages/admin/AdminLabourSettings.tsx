import { useEffect, useState, useCallback } from 'react';
import { HardHat, Plus, Pencil, Trash2, X, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminHeader, AdminCard, AdminButton, AdminField, StateMessage, Toggle } from '@/components/admin/AdminUi';
import { PRICING_METHOD_LABELS, type LabourPricingMethod, type LabourEstimatorKey } from '@/lib/labour';
import type { DbLabourSettings, DbLabourCategory } from '@/types/database';

const ESTIMATOR_LABELS: Record<LabourEstimatorKey, string> = {
  global: 'Global (all estimators)',
  paint: 'Paint Cost Estimator',
  screeding: 'Wall Screeding Cost Estimator',
  pop_ceiling: 'POP Ceiling Cost Estimator',
  tile: 'Tile Cost Estimator',
};

const ESTIMATOR_KEYS: LabourEstimatorKey[] = ['global', 'paint', 'screeding', 'pop_ceiling', 'tile'];

export default function AdminLabourSettings() {
  const [tab, setTab] = useState<'settings' | 'categories'>('settings');
  return (
    <>
      <AdminHeader
        title="Labour Settings"
        subtitle="Configure labour estimation globally or per estimator. Set suggested rates, default pricing methods, and manage labour categories. Users can always override any suggested rate from the frontend."
      />
      <div className="mb-5 inline-flex rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-900">
        {([
          { key: 'settings', label: 'Estimator Settings', icon: HardHat },
          { key: 'categories', label: 'Labour Categories', icon: Plus },
        ] as { key: 'settings' | 'categories'; label: string; icon: typeof HardHat }[]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              'inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-semibold transition-all ' +
              (tab === t.key ? 'bg-brand-purple text-white' : 'text-neutral-600 hover:text-brand-purple dark:text-neutral-300')
            }
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'settings' && <SettingsTab />}
      {tab === 'categories' && <CategoriesTab />}
    </>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<DbLabourSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('labour_settings').select('*').order('estimator_key');
    if (error) setError(error.message);
    setSettings((data as DbLabourSettings[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateSetting(id: string, updates: Partial<DbLabourSettings>) {
    setSaving(id);
    const { error: updateError } = await supabase
      .from('labour_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) {
      setError(updateError.message);
    } else {
      setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    }
    setSaving(null);
  }

  async function updateRate(id: string, rateKey: keyof DbLabourSettings['suggested_rates'], value: number) {
    const setting = settings.find((s) => s.id === id);
    if (!setting) return;
    const newRates = { ...setting.suggested_rates, [rateKey]: value };
    await updateSetting(id, { suggested_rates: newRates });
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching labour settings." />;
  if (error) return <StateMessage type="error" title="Error" message={error} />;

  return (
    <>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="space-y-3">
        {ESTIMATOR_KEYS.map((key) => {
          const setting = settings.find((s) => s.estimator_key === key);
          if (!setting) return null;
          return (
            <AdminCard key={setting.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-brand-navy dark:text-white">{ESTIMATOR_LABELS[setting.estimator_key]}</h3>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {setting.is_enabled ? 'Labour estimation enabled' : 'Labour estimation disabled'}
                    {' · '}Default method: {PRICING_METHOD_LABELS[setting.default_pricing_method]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Toggle checked={setting.is_enabled} onChange={(v) => updateSetting(setting.id, { is_enabled: v })} />
                  <span className="text-xs font-semibold text-neutral-500">{setting.is_enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AdminField label="Default Pricing Method">
                  <select
                    value={setting.default_pricing_method}
                    onChange={(e) => updateSetting(setting.id, { default_pricing_method: e.target.value as LabourPricingMethod })}
                    className="input-field"
                  >
                    {Object.entries(PRICING_METHOD_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </AdminField>
                <AdminField label="Suggested Fixed Rate" hint="Total project labour cost">
                  <input
                    type="number"
                    min={0}
                    value={setting.suggested_rates.fixed}
                    onChange={(e) => updateRate(setting.id, 'fixed', Number(e.target.value))}
                    className="input-field"
                  />
                </AdminField>
                <AdminField label="Suggested Rate per m²" hint="Per square metre">
                  <input
                    type="number"
                    min={0}
                    value={setting.suggested_rates.per_sqm}
                    onChange={(e) => updateRate(setting.id, 'per_sqm', Number(e.target.value))}
                    className="input-field"
                  />
                </AdminField>
                <AdminField label="Suggested Rate per Room" hint="Per room">
                  <input
                    type="number"
                    min={0}
                    value={setting.suggested_rates.per_room}
                    onChange={(e) => updateRate(setting.id, 'per_room', Number(e.target.value))}
                    className="input-field"
                  />
                </AdminField>
                <AdminField label="Suggested Daily Rate" hint="Per working day">
                  <input
                    type="number"
                    min={0}
                    value={setting.suggested_rates.daily}
                    onChange={(e) => updateRate(setting.id, 'daily', Number(e.target.value))}
                    className="input-field"
                  />
                </AdminField>
              </div>

              {saving === setting.id && (
                <div className="mt-3 flex items-center gap-1 text-xs text-neutral-400">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                </div>
              )}
            </AdminCard>
          );
        })}
      </div>
    </>
  );
}

function CategoriesTab() {
  const [categories, setCategories] = useState<DbLabourCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DbLabourCategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterKey, setFilterKey] = useState<LabourEstimatorKey>('paint');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('labour_categories').select('*').order('estimator_key').order('sort_order');
    if (error) setError(error.message);
    setCategories((data as DbLabourCategory[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function remove(cat: DbLabourCategory) {
    if (!confirm(`Delete category "${cat.category_name}"?`)) return;
    const { error: delError } = await supabase.from('labour_categories').delete().eq('id', cat.id);
    if (delError) { setError(delError.message); return; }
    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
  }

  async function toggleActive(cat: DbLabourCategory) {
    const { error: updateError } = await supabase
      .from('labour_categories')
      .update({ is_active: !cat.is_active, updated_at: new Date().toISOString() })
      .eq('id', cat.id);
    if (updateError) { setError(updateError.message); return; }
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, is_active: !c.is_active } : c)));
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching labour categories." />;

  const filtered = categories.filter((c) => c.estimator_key === filterKey);

  return (
    <>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(['paint', 'screeding', 'pop_ceiling', 'tile'] as LabourEstimatorKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilterKey(k)}
              className={
                'rounded-md px-3 py-1.5 text-sm font-semibold transition-all ' +
                (filterKey === k ? 'bg-brand-purple text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300')
              }
            >
              {ESTIMATOR_LABELS[k]}
            </button>
          ))}
        </div>
        <AdminButton onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Add Category</AdminButton>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-sm text-neutral-400">No categories for this estimator yet.</p>}
        {filtered.map((cat) => (
          <AdminCard key={cat.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
                <HardHat className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-bold text-brand-navy dark:text-white">{cat.category_name}</h3>
                  <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (cat.is_active ? 'bg-accent-green/15 text-accent-green' : 'bg-neutral-200 text-neutral-500')}>
                    {cat.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  {PRICING_METHOD_LABELS[cat.rate_unit] ?? cat.rate_unit} · Suggested: {Number(cat.suggested_rate).toLocaleString()}/{cat.rate_unit === 'per_sqm' ? 'm²' : cat.rate_unit === 'per_room' ? 'room' : cat.rate_unit === 'daily' ? 'day' : 'project'}
                  {cat.description && ` · ${cat.description}`}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Toggle checked={cat.is_active} onChange={() => toggleActive(cat)} />
              <AdminButton variant="secondary" onClick={() => { setEditing(cat); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></AdminButton>
              <AdminButton variant="danger" onClick={() => remove(cat)}><Trash2 className="h-3.5 w-3.5" /></AdminButton>
            </div>
          </AdminCard>
        ))}
      </div>

      {showForm && <CategoryForm initial={editing} defaultEstimator={filterKey} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </>
  );
}

function CategoryForm({ initial, defaultEstimator, onClose, onSaved }: { initial: DbLabourCategory | null; defaultEstimator: LabourEstimatorKey; onClose: () => void; onSaved: () => void }) {
  const [estimatorKey, setEstimatorKey] = useState<LabourEstimatorKey>(initial?.estimator_key ?? defaultEstimator);
  const [categoryName, setCategoryName] = useState(initial?.category_name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [suggestedRate, setSuggestedRate] = useState(initial?.suggested_rate ?? 0);
  const [rateUnit, setRateUnit] = useState<LabourPricingMethod>(initial?.rate_unit ?? 'per_sqm');
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSave() {
    if (!categoryName.trim()) { setFormError('Category name is required'); return; }
    setSaving(true); setFormError(null);
    const payload = {
      estimator_key: estimatorKey,
      category_name: categoryName.trim(),
      description: description.trim() || null,
      suggested_rate: suggestedRate,
      rate_unit: rateUnit,
      sort_order: sortOrder,
      is_active: isActive,
    };
    const { error } = initial
      ? await supabase.from('labour_categories').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', initial.id)
      : await supabase.from('labour_categories').insert(payload);
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 dark:bg-black/60">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-navy dark:text-white">{initial ? 'Edit Category' : 'Add Category'}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 space-y-4">
          <AdminField label="Estimator">
            <select className="input-field" value={estimatorKey} onChange={(e) => setEstimatorKey(e.target.value as LabourEstimatorKey)}>
              {(['paint', 'screeding', 'pop_ceiling', 'tile'] as LabourEstimatorKey[]).map((k) => <option key={k} value={k}>{ESTIMATOR_LABELS[k]}</option>)}
            </select>
          </AdminField>
          <AdminField label="Category Name"><input className="input-field" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="e.g. Skilled Painter" /></AdminField>
          <AdminField label="Description (optional)"><input className="input-field" value={description} onChange={(e) => setDescription(e.target.value)} /></AdminField>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Suggested Rate"><input type="number" min={0} className="input-field" value={suggestedRate} onChange={(e) => setSuggestedRate(Number(e.target.value))} /></AdminField>
            <AdminField label="Rate Unit">
              <select className="input-field" value={rateUnit} onChange={(e) => setRateUnit(e.target.value as LabourPricingMethod)}>
                {Object.entries(PRICING_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Sort Order"><input type="number" min={0} className="input-field" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></AdminField>
            <AdminField label="Active"><div className="pt-2"><Toggle checked={isActive} onChange={setIsActive} /></div></AdminField>
          </div>
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <AdminButton variant="secondary" onClick={onClose}>Cancel</AdminButton>
            <AdminButton onClick={onSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? 'Saving…' : 'Save'}</AdminButton>
          </div>
        </div>
      </div>
    </div>
  );
}
