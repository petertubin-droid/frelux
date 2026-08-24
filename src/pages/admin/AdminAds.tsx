import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Save, Loader2, Megaphone, Layers, BarChart3,
  Download, Upload, ArrowUp, ArrowDown, Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {AdminHeader, AdminCard, AdminButton, AdminField, StateMessage, Toggle, AdminInput, AdminIconButton} from '@/components/admin/AdminUi';
import { AdminModal } from '@/components/admin/AdminModal';
import { classNames } from '@/lib/utils';
import { clearAdConfigCache } from '@/lib/ad-config';
import { BUILTIN_PROVIDERS, CUSTOM_PROVIDER_SCHEMA, PLACEMENT_TYPE_LABELS, PAGE_TARGET_LABELS } from '@/lib/ad-providers';
import type { DbAdProvider, DbAdPlacement, AdProviderType } from '@/types/database';

type Tab = 'providers' | 'placements' | 'analytics';

export default function AdminAds() {
  const [tab, setTab] = useState<Tab>('providers');
  return (
    <>
      <AdminHeader
        title="Ad Management Center"
        subtitle="Manage ad providers, placements, and analytics across the entire site. Add unlimited providers without code changes."
      />
      <div className="mb-5 inline-flex flex-wrap rounded-lg border border-neutral-200 bg-white dark:bg-neutral-900 p-1 dark:border-neutral-700">
        {([
          { key: 'providers', label: 'Providers', icon: Megaphone },
          { key: 'placements', label: 'Placements', icon: Layers },
          { key: 'analytics', label: 'Analytics', icon: BarChart3 },
        ] as { key: Tab; label: string; icon: typeof Megaphone }[]).map((t) => (
          <AdminButton
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={classNames(
              'inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-all',
              tab === t.key ? 'bg-brand-purple text-white' : 'text-neutral-600 hover:text-brand-purple dark:text-neutral-300',
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </AdminButton>
        ))}
      </div>
      {tab === 'providers' && <ProvidersTab />}
      {tab === 'placements' && <PlacementsTab />}
      {tab === 'analytics' && <AnalyticsTab />}
    </>
  );
}

// =========================================================
// Providers Tab
// =========================================================
function ProvidersTab() {
  const [providers, setProviders] = useState<DbAdProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DbAdProvider | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('ad_providers').select('*').order('priority');
    if (error) setError(error.message);
    setProviders((data as DbAdProvider[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(prov: DbAdProvider) {
    const { error } = await supabase.from('ad_providers').update({ is_active: !prov.is_active }).eq('id', prov.id);
    if (error) { setError(error.message); return; }
    setProviders((prev) => prev.map((p) => p.id === prov.id ? { ...p, is_active: !p.is_active } : p));
    clearAdConfigCache();
  }

  async function movePriority(prov: DbAdProvider, dir: -1 | 1) {
    const sorted = [...providers].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex((p) => p.id === prov.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swapProv = sorted[swapIdx];
    const [res1, res2] = await Promise.all([
      supabase.from('ad_providers').update({ priority: swapProv.priority }).eq('id', prov.id),
      supabase.from('ad_providers').update({ priority: prov.priority }).eq('id', swapProv.id),
    ]);
    if (res1.error || res2.error) {
      setError(res1.error?.message || res2.error?.message || 'Failed to swap priorities');
      load();
      return;
    }
    load();
    clearAdConfigCache();
  }

  async function remove(prov: DbAdProvider) {
    if (prov.is_system) { setError('Built in providers cannot be deleted. Disable them instead.'); return; }
    if (!confirm(`Delete provider "${prov.name}"?`)) return;
    const { error } = await supabase.from('ad_providers').delete().eq('id', prov.id);
    if (error) { setError(error.message); return; }
    setProviders((prev) => prev.filter((p) => p.id !== prov.id));
    clearAdConfigCache();
  }

  async function exportConfig() {
    const blob = new Blob([JSON.stringify(providers, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ad_providers_export.json'; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching ad providers." />;
  if (error) return <StateMessage type="error" title="Error" message={error} />;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{providers.length} providers configured · {providers.filter(p => p.is_active).length} active</p>
        <div className="flex flex-wrap gap-2">
          <AdminButton variant="secondary" onClick={exportConfig}><Download className="h-4 w-4" /> Export</AdminButton>
          <AdminButton variant="secondary" onClick={() => setShowImport(true)}><Upload className="h-4 w-4" /> Import</AdminButton>
          <AdminButton onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Add Provider</AdminButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {[...providers].sort((a, b) => a.priority - b.priority).map((prov, idx, arr) => (
          <div key={prov.id} className="card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
                  <Megaphone className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate text-xs font-bold text-brand-navy dark:text-white">{prov.name}</h3>
                  </div>
                  <p className="text-[10px] text-neutral-400 capitalize">{prov.provider_type} · /{prov.slug}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className={classNames('rounded-full px-1.5 py-0.5 text-[9px] font-semibold', prov.is_active ? 'bg-accent-green/15 text-accent-green' : 'bg-neutral-200 text-neutral-500')}>
                  {prov.is_active ? 'On' : 'Off'}
                </span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-white/5">
              <div className="flex items-center gap-0.5">
                <AdminIconButton variant="ghost" type="button" onClick={() => movePriority(prov, -1)} disabled={idx === 0}  aria-label="Move up"><ArrowUp className="h-3 w-3" /></AdminIconButton>
                <AdminIconButton variant="ghost" type="button" onClick={() => movePriority(prov, 1)} disabled={idx === arr.length - 1}  aria-label="Move down"><ArrowDown className="h-3 w-3" /></AdminIconButton>
                <Toggle checked={prov.is_active} onChange={() => toggleActive(prov)} />
              </div>
              <div className="flex items-center gap-0.5">
                <AdminIconButton variant="ghost" type="button" onClick={() => { setEditing(prov); setShowForm(true); }} ><Pencil className="h-3 w-3" /></AdminIconButton>
                {!prov.is_system && <AdminIconButton variant="danger" type="button" onClick={() => remove(prov)} ><Trash2 className="h-3 w-3" /></AdminIconButton>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && <ProviderForm initial={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); load(); }} />}
    </>
  );
}

function ProviderForm({ initial, onClose, onSaved }: { initial: DbAdProvider | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [providerType, setProviderType] = useState<AdProviderType>(initial?.provider_type ?? 'display');
  const [priority, setPriority] = useState(initial?.priority ?? 99);
  const [isActive, setIsActive] = useState(initial?.is_active ?? false);
  const [credentials, setCredentials] = useState<Record<string, string>>(initial?.credentials ?? {});
  const [settings, setSettings] = useState<Record<string, unknown>>(initial?.settings ?? {});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [useCustomSchema, setUseCustomSchema] = useState(!initial && !BUILTIN_PROVIDERS.find((p) => p.slug === slug));

  const schema = useCustomSchema ? CUSTOM_PROVIDER_SCHEMA : BUILTIN_PROVIDERS.find((p) => p.slug === slug) ?? CUSTOM_PROVIDER_SCHEMA;

  function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }

  async function onSave() {
    if (!name.trim()) { setFormError('Name is required'); return; }
    const finalSlug = slug || slugify(name);
    if (!finalSlug) { setFormError('Invalid slug'); return; }
    setSaving(true); setFormError(null);
    const payload = {
      name: name.trim(),
      slug: finalSlug,
      provider_type: providerType,
      priority,
      is_active: isActive,
      credentials,
      settings,
    };
    const { error } = initial
      ? await supabase.from('ad_providers').update(payload).eq('id', initial.id)
      : await supabase.from('ad_providers').insert({ ...payload, is_system: false });
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    clearAdConfigCache();
    onSaved();
  }

  return (
    <AdminModal open onClose={onClose} title={initial ? 'Edit Provider' : 'Add Provider'} maxWidth="max-w-2xl">
          {!initial && (
            <AdminField label="Provider Type">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm">
                  <AdminInput type="radio" checked={!useCustomSchema} onChange={() => setUseCustomSchema(false)} className="text-brand-purple" />
                  Built in
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <AdminInput type="radio" checked={useCustomSchema} onChange={() => setUseCustomSchema(true)} className="text-brand-purple" />
                  Custom
                </label>
              </div>
            </AdminField>
          )}
          {!initial && !useCustomSchema && (
            <AdminField label="Select Built in Provider">
              <AdminSelect  value={slug} onChange={(e) => {
                setSlug(e.target.value);
                const s = BUILTIN_PROVIDERS.find((p) => p.slug === e.target.value);
                if (s) { setName(s.name); setProviderType(s.provider_type as AdProviderType); }
              }}>
                <option value="">Choose a provider</option>
                {BUILTIN_PROVIDERS.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </AdminSelect>
            </AdminField>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Provider Name"><AdminInput  value={name} onChange={(e) => setName(e.target.value)} disabled={!!initial && initial.is_system} /></AdminField>
            <AdminField label="Slug" hint="Machine identifier"><AdminInput  value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from name" disabled={!!initial} /></AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminField label="Type">
              <AdminSelect  value={providerType} onChange={(e) => setProviderType(e.target.value as AdProviderType)}>
                <option value="display">Display</option>
                <option value="rewarded">Rewarded</option>
                <option value="interstitial">Interstitial</option>
                <option value="native">Native</option>
                <option value="mixed">Mixed</option>
              </AdminSelect>
            </AdminField>
            <AdminField label="Priority" hint="Lower = higher priority"><AdminInput type="number"  value={priority} onChange={(e) => setPriority(Number(e.target.value))} /></AdminField>
            <AdminField label="Active">
              <div className="pt-2"><Toggle checked={isActive} onChange={setIsActive} /></div>
            </AdminField>
          </div>

          {/* Credential fields */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Credentials</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {schema.credential_fields.map((field) => (
                <AdminField key={field.key} label={field.label}>
                  <AdminInput
                    type={field.type}
                    
                    value={credentials[field.key] ?? ''}
                    onChange={(e) => setCredentials({ ...credentials, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                  />
                </AdminField>
              ))}
            </div>
          </div>

          {/* Setting fields */}
          {schema.setting_fields.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Settings</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {schema.setting_fields.map((field) => (
                  <AdminField key={field.key} label={field.label}>
                    {field.type === 'boolean' ? (
                      <div className="pt-2"><Toggle checked={settings[field.key] as boolean ?? field.default as boolean} onChange={(v) => setSettings({ ...settings, [field.key]: v })} /></div>
                    ) : (
                      <AdminInput
                        type={field.type}
                        
                        value={String(settings[field.key] ?? field.default)}
                        onChange={(e) => setSettings({ ...settings, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                      />
                    )}
                  </AdminField>
                ))}
              </div>
            </div>
          )}

          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <AdminButton variant="secondary" onClick={onClose}>Cancel</AdminButton>
            <AdminButton onClick={onSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? 'Saving…' : 'Save'}</AdminButton>
          </div>
    </AdminModal>
  );
}

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ added: number; errors: string[] } | null>(null);

  async function doImport() {
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) { setResult({ added: 0, errors: ['JSON must be an array'] }); return; }
      setImporting(true);
      let added = 0;
      const errors: string[] = [];
      for (const item of data) {
        if (!item.name || !item.slug) { errors.push(`Missing name/slug for item ${data.indexOf(item)}`); continue; }
        const { error } = await supabase.from('ad_providers').upsert({
          name: item.name,
          slug: item.slug,
          provider_type: item.provider_type ?? 'display',
          priority: item.priority ?? 99,
          is_active: item.is_active ?? false,
          credentials: item.credentials ?? {},
          settings: item.settings ?? {},
          is_system: false,
        }, { onConflict: 'slug' });
        if (error) errors.push(`${item.name}: ${error.message}`);
        else added++;
      }
      setResult({ added, errors });
      setImporting(false);
      if (added > 0) { clearAdConfigCache(); onDone(); }
    } catch {
      setResult({ added: 0, errors: ['Invalid JSON'] });
      setImporting(false);
    }
  }

  return (
    <AdminModal open onClose={onClose} title="Import Providers" maxWidth="max-w-xl">
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Paste exported JSON. Existing providers with matching slugs will be updated.</p>
        <AdminTextarea className="mt-3 font-mono text-sm" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder='[{"name":"...","slug":"..."}]' />
        {result && (
          <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 dark:bg-neutral-800 p-3 text-sm dark:border-neutral-700">
            <p className="font-semibold text-brand-navy dark:text-white">Added/Updated: {result.added}</p>
            {result.errors.length > 0 && <p className="mt-1 text-red-600">{result.errors.join(', ')}</p>}
          </div>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <AdminButton variant="secondary" onClick={onClose}>Close</AdminButton>
          <AdminButton onClick={doImport} disabled={importing || !text.trim()}>{importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import</AdminButton>
        </div>
    </AdminModal>
  );
}

// =========================================================
// Placements Tab
// =========================================================
function PlacementsTab() {
  const [placements, setPlacements] = useState<DbAdPlacement[]>([]);
  const [providers, setProviders] = useState<DbAdProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DbAdPlacement | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, provRes] = await Promise.all([
      supabase.from('ad_placements').select('*').order('placement_key'),
      supabase.from('ad_providers').select('*').order('priority'),
    ]);
    if (pRes.error) setError(pRes.error.message);
    setPlacements((pRes.data as DbAdPlacement[]) ?? []);
    setProviders((provRes.data as DbAdProvider[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(pl: DbAdPlacement) {
    const { error } = await supabase.from('ad_placements').update({ is_active: !pl.is_active }).eq('id', pl.id);
    if (error) { setError(error.message); return; }
    setPlacements((prev) => prev.map((p) => p.id === pl.id ? { ...p, is_active: !p.is_active } : p));
    clearAdConfigCache();
  }

  async function remove(pl: DbAdPlacement) {
    if (!confirm(`Delete placement "${pl.placement_name}"?`)) return;
    const { error } = await supabase.from('ad_placements').delete().eq('id', pl.id);
    if (error) { setError(error.message); return; }
    setPlacements((prev) => prev.filter((p) => p.id !== pl.id));
    clearAdConfigCache();
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching ad placements." />;

  return (
    <>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{placements.length} placements · {placements.filter(p => p.is_active).length} active</p>
        <AdminButton onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Add Placement</AdminButton>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {placements.map((pl) => {
          const assignedProviders = (pl.provider_ids as string[]).map(pid => providers.find(p => p.id === pid)).filter(Boolean) as DbAdProvider[];
          return (
            <div key={pl.id} className="card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-xs font-bold text-brand-navy dark:text-white">{pl.placement_name}</h3>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      {PLACEMENT_TYPE_LABELS[pl.placement_type] ?? pl.placement_type} · /{pl.placement_key}
                    </p>
                  </div>
                </div>
                <span className={classNames('rounded-full px-1.5 py-0.5 text-[9px] font-semibold', pl.is_active ? 'bg-accent-green/15 text-accent-green' : 'bg-neutral-200 text-neutral-500')}>
                  {pl.is_active ? 'On' : 'Off'}
                </span>
              </div>
              {assignedProviders.length > 0 && (
                <p className="mt-1.5 text-[10px] text-brand-purple">{assignedProviders.map(p => p.name).join(' → ')}</p>
              )}
              <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-white/5">
                <Toggle checked={pl.is_active} onChange={() => toggleActive(pl)} />
                <div className="flex items-center gap-0.5">
                  <AdminIconButton variant="ghost" type="button" onClick={() => { setEditing(pl); setShowForm(true); }} ><Pencil className="h-3 w-3" /></AdminIconButton>
                  <AdminIconButton variant="danger" type="button" onClick={() => remove(pl)} ><Trash2 className="h-3 w-3" /></AdminIconButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {showForm && <PlacementForm initial={editing} providers={providers} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </>
  );
}

function PlacementForm({ initial, providers, onClose, onSaved }: { initial: DbAdPlacement | null; providers: DbAdProvider[]; onClose: () => void; onSaved: () => void }) {
  const [placementKey, setPlacementKey] = useState(initial?.placement_key ?? '');
  const [placementName, setPlacementName] = useState(initial?.placement_name ?? '');
  const [placementType, setPlacementType] = useState(initial?.placement_type ?? 'banner');
  const [pageTarget, setPageTarget] = useState(initial?.page_target ?? 'global');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [providerIds, setProviderIds] = useState<string[]>(initial?.provider_ids ?? []);
  const [adUnitIds, setAdUnitIds] = useState<Record<string, string>>(initial?.ad_unit_ids ?? {});
  const [displayRules, setDisplayRules] = useState(initial?.display_rules ?? { mobile: true, desktop: true, refresh_seconds: 0, min_height: 100 });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }

  function toggleProvider(id: string) {
    setProviderIds((prev) => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  function moveProvider(id: string, dir: -1 | 1) {
    const idx = providerIds.indexOf(id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= providerIds.length) return;
    const newArr = [...providerIds];
    [newArr[idx], newArr[swapIdx]] = [newArr[swapIdx], newArr[idx]];
    setProviderIds(newArr);
  }

  async function onSave() {
    if (!placementName.trim()) { setFormError('Placement name is required'); return; }
    const finalKey = placementKey || slugify(placementName);
    if (!finalKey) { setFormError('Invalid placement key'); return; }
    setSaving(true); setFormError(null);
    const payload = {
      placement_key: finalKey,
      placement_name: placementName.trim(),
      placement_type: placementType,
      page_target: pageTarget,
      is_active: isActive,
      provider_ids: providerIds,
      ad_unit_ids: adUnitIds,
      display_rules: displayRules,
    };
    const { error } = initial
      ? await supabase.from('ad_placements').update(payload).eq('id', initial.id)
      : await supabase.from('ad_placements').insert(payload);
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    clearAdConfigCache();
    onSaved();
  }

  const activeProviders = providers.filter(p => p.is_active || providerIds.includes(p.id));

  return (
    <AdminModal open onClose={onClose} title={initial ? 'Edit Placement' : 'Add Placement'} maxWidth="max-w-2xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Placement Name"><AdminInput  value={placementName} onChange={(e) => setPlacementName(e.target.value)} /></AdminField>
            <AdminField label="Placement Key" hint="URL friendly identifier"><AdminInput  value={placementKey} onChange={(e) => setPlacementKey(e.target.value)} placeholder="auto from name" disabled={!!initial} /></AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminField label="Type">
              <AdminSelect  value={placementType} onChange={(e) => setPlacementType(e.target.value as typeof placementType)}>
                {Object.entries(PLACEMENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </AdminSelect>
            </AdminField>
            <AdminField label="Page Target">
              <AdminSelect  value={pageTarget} onChange={(e) => setPageTarget(e.target.value as typeof pageTarget)}>
                {Object.entries(PAGE_TARGET_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </AdminSelect>
            </AdminField>
            <AdminField label="Active">
              <div className="pt-2"><Toggle checked={isActive} onChange={setIsActive} /></div>
            </AdminField>
          </div>

          {/* Display rules */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Display Rules</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="Show on Mobile"><div className="pt-2"><Toggle checked={displayRules.mobile} onChange={(v) => setDisplayRules({ ...displayRules, mobile: v })} /></div></AdminField>
              <AdminField label="Show on Desktop"><div className="pt-2"><Toggle checked={displayRules.desktop} onChange={(v) => setDisplayRules({ ...displayRules, desktop: v })} /></div></AdminField>
              <AdminField label="Refresh (seconds)" hint="0 = no refresh"><AdminInput type="number"  value={displayRules.refresh_seconds} onChange={(e) => setDisplayRules({ ...displayRules, refresh_seconds: Number(e.target.value) })} /></AdminField>
              <AdminField label="Min Height (px)"><AdminInput type="number"  value={displayRules.min_height} onChange={(e) => setDisplayRules({ ...displayRules, min_height: Number(e.target.value) })} /></AdminField>
            </div>
          </div>

          {/* Provider assignment + ad unit IDs */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Provider Fallback Chain</h3>
            <p className="mb-2 text-xs text-neutral-400 dark:text-neutral-500">Select providers in order of priority. The first provider with a configured ad unit ID will be used; if it fails, the next provider is tried.</p>
            {activeProviders.length === 0 && <p className="text-sm text-neutral-400 dark:text-neutral-500">No active providers. Enable providers in the Providers tab first.</p>}
            <div className="space-y-2">
              {activeProviders.map((prov) => {
                const isSelected = providerIds.includes(prov.id);
                const order = providerIds.indexOf(prov.id);
                return (
                  <div key={prov.id} className={classNames('flex items-center gap-3 rounded-lg border p-3', isSelected ? 'border-brand-purple bg-brand-purple/5' : 'border-neutral-200 dark:border-neutral-700')}>
                    <AdminButton type="button" onClick={() => toggleProvider(prov.id)} className={classNames('flex h-5 w-5 items-center justify-center rounded border', isSelected ? 'border-brand-purple bg-brand-purple text-white' : 'border-neutral-300')}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </AdminButton>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-brand-navy dark:text-white">{prov.name}</p>
                      {isSelected && (
                        <AdminInput
                          type="text"
                          className="mt-1.5 text-xs"
                          value={adUnitIds[prov.id] ?? ''}
                          onChange={(e) => setAdUnitIds({ ...adUnitIds, [prov.id]: e.target.value })}
                          placeholder={`Ad unit ID for ${prov.name}`}
                        />
                      )}
                    </div>
                    {isSelected && order >= 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-brand-purple">#{order + 1}</span>
                        <AdminIconButton variant="ghost" type="button" onClick={() => moveProvider(prov.id, -1)} disabled={order === 0} ><ArrowUp className="h-3 w-3" /></AdminIconButton>
                        <AdminIconButton variant="ghost" type="button" onClick={() => moveProvider(prov.id, 1)} disabled={order === providerIds.length - 1} ><ArrowDown className="h-3 w-3" /></AdminIconButton>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <AdminButton variant="secondary" onClick={onClose}>Cancel</AdminButton>
            <AdminButton onClick={onSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? 'Saving…' : 'Save'}</AdminButton>
          </div>
    </AdminModal>
  );
}

// =========================================================
// Analytics Tab
// =========================================================
function AnalyticsTab() {
  const [events, setEvents] = useState<{ event_type: string; count: number; revenue: number }[]>([]);
  const [providerStats, setProviderStats] = useState<{ provider_name: string; event_type: string; count: number; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null);
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from('ad_analytics_events')
        .select('event_type, provider_id, revenue_estimated, created_at, ad_providers(name)')
        .gte('created_at', since);
      if (error) { setError(error.message); setLoading(false); return; }

      // Aggregate by event type
      const byType: Record<string, { count: number; revenue: number }> = {};
      const byProvider: Record<string, { provider_name: string; event_type: string; count: number; revenue: number }> = {};
      for (const ev of (data ?? []) as Array<Record<string, unknown>>) {
        const et = ev.event_type as string;
        const rev = Number(ev.revenue_estimated ?? 0);
        const provName = (ev.ad_providers as { name: string } | null)?.name ?? 'Unknown';
        if (!byType[et]) byType[et] = { count: 0, revenue: 0 };
        byType[et].count++;
        byType[et].revenue += rev;
        const pk = `${provName}_${et}`;
        if (!byProvider[pk]) byProvider[pk] = { provider_name: provName, event_type: et, count: 0, revenue: 0 };
        byProvider[pk].count++;
        byProvider[pk].revenue += rev;
      }
      setEvents(Object.entries(byType).map(([event_type, v]) => ({ event_type, count: v.count, revenue: v.revenue })));
      setProviderStats(Object.values(byProvider));
      setLoading(false);
    }
    load();
  }, [days]);

  const totalImpressions = events.find(e => e.event_type === 'impression')?.count ?? 0;
  const totalClicks = events.find(e => e.event_type === 'click')?.count ?? 0;
  const totalRewards = events.find(e => e.event_type === 'reward')?.count ?? 0;
  const totalRevenue = events.reduce((sum, e) => sum + e.revenue, 0);
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : '0';
  const completionRate = totalImpressions > 0 ? (totalRewards / totalImpressions * 100).toFixed(1) : '0';

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching ad analytics." />;
  if (error) return <StateMessage type="error" title="Analytics Error" message={error} />;

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-neutral-500 dark:text-neutral-400">Time range:</span>
        {[7, 30, 90].map((d) => (
          <AdminButton key={d} type="button" onClick={() => setDays(d)} className={classNames('rounded-md px-3 py-1 text-sm font-semibold', days === d ? 'bg-brand-purple text-white' : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800')}>{d} days</AdminButton>
        ))}
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Impressions', value: totalImpressions.toLocaleString() },
          { label: 'Clicks', value: totalClicks.toLocaleString() },
          { label: 'CTR', value: `${ctr}%` },
          { label: 'Rewarded Views', value: totalRewards.toLocaleString() },
          { label: 'Completion Rate', value: `${completionRate}%` },
          { label: 'Est. Revenue', value: `$${totalRevenue.toFixed(2)}` },
        ].map((stat) => (
          <AdminCard key={stat.label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{stat.label}</p>
            <p className="mt-1 text-xl font-bold text-brand-navy dark:text-white">{stat.value}</p>
          </AdminCard>
        ))}
      </div>

      {/* Event breakdown */}
      <AdminCard className="mb-4 p-5">
        <h2 className="text-sm font-bold text-brand-navy dark:text-white">Event Breakdown</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {events.map((ev) => (
            <div key={ev.event_type} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
              <p className="text-xs font-semibold capitalize text-neutral-500 dark:text-neutral-400">{ev.event_type}</p>
              <p className="mt-1 text-lg font-bold text-brand-navy dark:text-white">{ev.count.toLocaleString()}</p>
              {ev.revenue > 0 && <p className="text-xs text-accent-green">${ev.revenue.toFixed(2)}</p>}
            </div>
          ))}
          {events.length === 0 && <p className="text-sm text-neutral-400 dark:text-neutral-500">No events recorded yet.</p>}
        </div>
      </AdminCard>

      {/* Provider performance */}
      <AdminCard className="p-5">
        <h2 className="text-sm font-bold text-brand-navy dark:text-white">Provider Performance</h2>
        {providerStats.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400 dark:text-neutral-500">No provider analytics yet. Events will appear here once ads start serving.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:border-neutral-700">
                  <th className="pb-2 pr-4">Provider</th>
                  <th className="pb-2 pr-4">Event Type</th>
                  <th className="pb-2 pr-4 text-right">Count</th>
                  <th className="pb-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {providerStats.map((stat, i) => (
                  <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800">
                    <td className="py-2 pr-4 font-medium text-brand-navy dark:text-white">{stat.provider_name}</td>
                    <td className="py-2 pr-4 capitalize text-neutral-500 dark:text-neutral-400">{stat.event_type}</td>
                    <td className="py-2 pr-4 text-right font-semibold">{stat.count.toLocaleString()}</td>
                    <td className="py-2 text-right text-accent-green">${stat.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </>
  );
}
