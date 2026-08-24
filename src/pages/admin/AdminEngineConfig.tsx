/**
 * FRELUX Admin — Engine Configuration Dashboard
 *
 * Central control layer for the measurement engine.
 * Admins can manage:
 * 1. Material profiles (coverage, package, waste)
 * 2. Roof material specifications
 * 3. Roof section/pitch configurations
 * 4. Waste rules (global, country, market, category)
 * 5. AI measurement verification states
 * 6. Market price data and approval status
 * 7. Rule/source/reference metadata
 * 8. Engine global settings
 * 9. Market activation status
 *
 * This is purely additive — does not modify existing admin pages.
 * Uses the existing Supabase structure and auth.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Trash2, Edit2, X, Check, Ban, Save, Settings,
  Package, Layers, TrendingUp, ShieldCheck, Globe, FileText,
  Cpu, AlertTriangle, Eye, Power,
} from 'lucide-react';
import { classNames } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import {
  COVERAGE_TYPE_LABELS,
  SCOPE_LEVEL_LABELS,
  AI_VERIFICATION_STATE_LABELS,
  RULE_SOURCE_TYPE_LABELS,
  SETTING_CATEGORY_LABELS,
} from '@/types/engine-integration';
import type {
  EmMaterialProfile,
  EmRoofMaterial,
  EmRoofSection,
  EmWasteConfig,
  EmAiVerificationState,
  EmRuleMetadata,
  EmEngineSetting,
  AiVerificationState,
} from '@/types/engine-integration';
import {
  fetchMaterialProfiles,
  upsertMaterialProfile,
  deleteMaterialProfile,
  approveMaterialProfile,
  toggleMaterialProfileActive,
  fetchRoofMaterials,
  upsertRoofMaterial,
  deleteRoofMaterial,
  fetchRoofSections,
  upsertRoofSection,
  deleteRoofSection,
  fetchWasteConfigs,
  fetchWasteConfigsByScope,
  upsertWasteConfig,
  deleteWasteConfig,
  fetchAiVerifications,
  updateAiVerificationState,
  fetchRuleMetadata,
  upsertRuleMetadata,
  deleteRuleMetadata,
  verifyRuleMetadata,
  fetchEngineSettings,
  updateEngineSetting,
  fetchMarketActivationStatus,
  toggleMarketActivation,
} from '@/lib/engine-integration';

type Tab =
  | 'materials'
  | 'roof'
  | 'waste'
  | 'ai'
  | 'rules'
  | 'settings'
  | 'markets';

const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
  { key: 'materials', label: 'Material Profiles', icon: Package },
  { key: 'roof', label: 'Roof Specs', icon: Layers },
  { key: 'waste', label: 'Waste Rules', icon: TrendingUp },
  { key: 'ai', label: 'AI Verification', icon: ShieldCheck },
  { key: 'rules', label: 'Rule Metadata', icon: FileText },
  { key: 'settings', label: 'Engine Settings', icon: Settings },
  { key: 'markets', label: 'Market Activation', icon: Globe },
];

export default function AdminEngineConfig() {
  const [tab, setTab] = useState<Tab>('materials');

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Cpu className="h-6 w-6 text-brand-purple" />
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Engine Configuration</h1>
        <span className="rounded-md bg-brand-purple/10 px-2 py-0.5 text-[10px] font-semibold text-brand-purple">
          CONTROL LAYER
        </span>
      </div>

      <div className="mb-4 rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
        ⚠️ Nigeria (NG) is the only active market. Ghana (GH) and Kenya (KE) remain inactive
        until their rules and market data are configured and approved.
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-neutral-200 dark:border-white/10">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={classNames(
              'flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors',
              tab === key
                ? 'border-b-2 border-brand-purple text-brand-purple dark:text-brand-purple-lighter'
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'materials' && <MaterialsTab />}
      {tab === 'roof' && <RoofTab />}
      {tab === 'waste' && <WasteTab />}
      {tab === 'ai' && <AiTab />}
      {tab === 'rules' && <RulesTab />}
      {tab === 'settings' && <SettingsTab />}
      {tab === 'markets' && <MarketsTab />}
    </div>
  );
}

// ============================================================
// MATERIALS TAB
// ============================================================

function MaterialsTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<EmMaterialProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EmMaterialProfile | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchMaterialProfiles());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string) {
    try {
      await approveMaterialProfile(id, user?.id ?? '');
      load();
    } catch (e) { console.error(e); }
  }

  async function handleToggle(id: string, active: boolean) {
    try {
      await toggleMaterialProfileActive(id, active);
      load();
    } catch (e) { console.error(e); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this material profile?')) return;
    try {
      await deleteMaterialProfile(id);
      load();
    } catch (e) { console.error(e); }
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin" />;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-1 rounded-md bg-brand-purple px-3 py-1.5 text-sm text-white">
          <Plus className="h-4 w-4" /> Add Profile
        </button>
      </div>

      {showForm && (
        <MaterialProfileForm
          existing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-white/10 text-left">
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Brand</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Coverage</th>
              <th className="px-3 py-2">Package</th>
              <th className="px-3 py-2">Waste %</th>
              <th className="px-3 py-2">Approved</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-neutral-100 dark:border-white/5">
                <td className="px-3 py-2 font-medium">{item.product_name}</td>
                <td className="px-3 py-2">{item.brand || '—'}</td>
                <td className="px-3 py-2">{item.category}</td>
                <td className="px-3 py-2">{item.coverage_value} {item.coverage_unit}/{COVERAGE_TYPE_LABELS[item.coverage_type]}</td>
                <td className="px-3 py-2">{item.package_size} {item.package_unit}</td>
                <td className="px-3 py-2">{item.default_waste_percent}%</td>
                <td className="px-3 py-2">
                  {item.is_approved
                    ? <Check className="h-4 w-4 text-green-600" />
                    : <Ban className="h-4 w-4 text-neutral-400" />}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    {!item.is_approved && (
                      <button onClick={() => handleApprove(item.id)} title="Approve" className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => handleToggle(item.id, !item.is_active)} title={item.is_active ? 'Deactivate' : 'Activate'} className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                      <Power className="h-4 w-4" />
                    </button>
                    <button onClick={() => { setEditing(item); setShowForm(true); }} title="Edit" className="rounded p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} title="Delete" className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-neutral-400">No material profiles yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MaterialProfileForm({ existing, onClose, onSaved }: {
  existing: EmMaterialProfile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    material_key: existing?.material_key ?? '',
    product_name: existing?.product_name ?? '',
    brand: existing?.brand ?? '',
    category: existing?.category ?? 'paint',
    coverage_type: existing?.coverage_type ?? 'area',
    coverage_value: existing?.coverage_value ?? 0,
    coverage_unit: existing?.coverage_unit ?? 'm2',
    coverage_coats: existing?.coverage_coats ?? 1,
    package_size: existing?.package_size ?? 1,
    package_unit: existing?.package_unit ?? 'litres',
    quantity_unit: existing?.quantity_unit ?? 'buckets',
    default_waste_percent: existing?.default_waste_percent ?? 10,
    market_code: existing?.market_code ?? 'NG',
    notes: existing?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await upsertMaterialProfile({
        ...form,
        brand: form.brand || null,
        coverage_value: Number(form.coverage_value),
        coverage_coats: Number(form.coverage_coats),
        package_size: Number(form.package_size),
        default_waste_percent: Number(form.default_waste_percent),
        notes: form.notes || null,
      } as any);
      onSaved();
    } catch (e) { console.error(e); alert('Failed to save'); }
    setSaving(false);
  }

  return (
    <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
      <div className="mb-3 flex justify-between">
        <h3 className="font-semibold">{existing ? 'Edit' : 'Add'} Material Profile</h3>
        <button onClick={onClose}><X className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Input label="Material Key" value={form.material_key} onChange={(v) => setForm({ ...form, material_key: v })} />
        <Input label="Product Name" value={form.product_name} onChange={(v) => setForm({ ...form, product_name: v })} />
        <Input label="Brand" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} />
        <Input label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
        <Select label="Coverage Type" value={form.coverage_type} onChange={(v) => setForm({ ...form, coverage_type: v })} options={Object.entries(COVERAGE_TYPE_LABELS)} />
        <Input label="Coverage Value" type="number" value={String(form.coverage_value)} onChange={(v) => setForm({ ...form, coverage_value: Number(v) })} />
        <Input label="Coverage Unit" value={form.coverage_unit} onChange={(v) => setForm({ ...form, coverage_unit: v })} />
        <Input label="Coats" type="number" value={String(form.coverage_coats)} onChange={(v) => setForm({ ...form, coverage_coats: Number(v) })} />
        <Input label="Package Size" type="number" value={String(form.package_size)} onChange={(v) => setForm({ ...form, package_size: Number(v) })} />
        <Input label="Package Unit" value={form.package_unit} onChange={(v) => setForm({ ...form, package_unit: v })} />
        <Input label="Quantity Unit" value={form.quantity_unit} onChange={(v) => setForm({ ...form, quantity_unit: v })} />
        <Input label="Waste %" type="number" value={String(form.default_waste_percent)} onChange={(v) => setForm({ ...form, default_waste_percent: Number(v) })} />
        <Input label="Market" value={form.market_code} onChange={(v) => setForm({ ...form, market_code: v })} />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-neutral-600">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 rounded-md bg-brand-purple px-3 py-1.5 text-sm text-white">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ROOF TAB
// ============================================================

function RoofTab() {
  const [materials, setMaterials] = useState<EmRoofMaterial[]>([]);
  const [sections, setSections] = useState<EmRoofSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'materials' | 'sections'>('materials');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, s] = await Promise.all([fetchRoofMaterials(), fetchRoofSections()]);
      setMaterials(m); setSections(s);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin" />;

  return (
    <div>
      <div className="mb-4 flex gap-1">
        <button onClick={() => setSubTab('materials')} className={classNames('rounded-md px-3 py-1.5 text-sm', subTab === 'materials' ? 'bg-brand-purple text-white' : 'text-neutral-600')}>Materials</button>
        <button onClick={() => setSubTab('sections')} className={classNames('rounded-md px-3 py-1.5 text-sm', subTab === 'sections' ? 'bg-brand-purple text-white' : 'text-neutral-600')}>Sections & Pitch</button>
      </div>

      {subTab === 'materials' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-white/10 text-left">
                <th className="px-3 py-2">Material</th>
                <th className="px-3 py-2">Brand</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Coverage</th>
                <th className="px-3 py-2">Package</th>
                <th className="px-3 py-2">Waste %</th>
                <th className="px-3 py-2">Approved</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id} className="border-b border-neutral-100 dark:border-white/5">
                  <td className="px-3 py-2 font-medium">{m.material_name}</td>
                  <td className="px-3 py-2">{m.brand || '—'}</td>
                  <td className="px-3 py-2">{m.category}</td>
                  <td className="px-3 py-2">{m.coverage_value} {m.coverage_unit}</td>
                  <td className="px-3 py-2">{m.package_size} {m.package_unit}</td>
                  <td className="px-3 py-2">{m.default_waste_percent}%</td>
                  <td className="px-3 py-2">{m.is_approved ? <Check className="h-4 w-4 text-green-600" /> : <Ban className="h-4 w-4 text-neutral-400" />}</td>
                </tr>
              ))}
              {materials.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-neutral-400">No roof materials configured</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'sections' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-white/10 text-left">
                <th className="px-3 py-2">Section</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Pitch</th>
                <th className="px-3 py-2">Flat?</th>
                <th className="px-3 py-2">Default L×W</th>
                <th className="px-3 py-2">Overhang</th>
                <th className="px-3 py-2">Area Factor</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => (
                <tr key={s.id} className="border-b border-neutral-100 dark:border-white/5">
                  <td className="px-3 py-2 font-medium">{s.section_name}</td>
                  <td className="px-3 py-2">{s.roof_type}</td>
                  <td className="px-3 py-2">
                    {s.is_flat ? 'Flat' : `${s.pitch_value}:${s.pitch_ratio_run} (${s.pitch_type})`}
                  </td>
                  <td className="px-3 py-2">{s.is_flat ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">{s.default_length ?? '—'} × {s.default_width ?? '—'}</td>
                  <td className="px-3 py-2">{s.default_overhang}m</td>
                  <td className="px-3 py-2">{s.area_factor}</td>
                </tr>
              ))}
              {sections.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-neutral-400">No roof sections configured</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// WASTE TAB
// ============================================================

function WasteTab() {
  const [configs, setConfigs] = useState<EmWasteConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setConfigs(await fetchWasteConfigs()); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin" />;

  return (
    <div>
      <div className="mb-4 rounded-md bg-blue-50 px-4 py-2 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
        Waste is resolved by hierarchy: Global → Country → Market → Category → Rule.
        More specific scopes override less specific ones.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-white/10 text-left">
              <th className="px-3 py-2">Scope</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Market</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Waste %</th>
              <th className="px-3 py-2">Override</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Description</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((c) => (
              <tr key={c.id} className="border-b border-neutral-100 dark:border-white/5">
                <td className="px-3 py-2">{SCOPE_LEVEL_LABELS[c.scope_level]}</td>
                <td className="px-3 py-2">{c.country_code || '—'}</td>
                <td className="px-3 py-2">{c.market_code || '—'}</td>
                <td className="px-3 py-2">{c.material_category || '—'}</td>
                <td className="px-3 py-2 font-semibold">{c.waste_percent}%</td>
                <td className="px-3 py-2">{c.is_override ? <Check className="h-4 w-4 text-amber-600" /> : '—'}</td>
                <td className="px-3 py-2">{c.source || '—'}</td>
                <td className="px-3 py-2">{c.description || '—'}</td>
              </tr>
            ))}
            {configs.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-neutral-400">No waste configurations</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// AI VERIFICATION TAB
// ============================================================

function AiTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<EmAiVerificationState[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AiVerificationState | ''>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchAiVerifications(filter || undefined));
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleStateChange(id: string, newState: AiVerificationState) {
    try {
      await updateAiVerificationState(id, newState, user?.id ?? '');
      load();
    } catch (e) { console.error(e); }
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin" />;

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as AiVerificationState | '')}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-neutral-900"
        >
          <option value="">All States</option>
          {Object.entries(AI_VERIFICATION_STATE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-white/10 text-left">
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2">AI Confidence</th>
              <th className="px-3 py-2">Flags</th>
              <th className="px-3 py-2">Reviewed</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-neutral-100 dark:border-white/5">
                <td className="px-3 py-2">{item.measurement_type}</td>
                <td className="px-3 py-2">
                  <span className={classNames(
                    'rounded px-2 py-0.5 text-xs font-medium',
                    item.state === 'verified' || item.state === 'auto_verified' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                    item.state === 'flagged' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                    item.state === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                    'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                  )}>
                    {AI_VERIFICATION_STATE_LABELS[item.state]}
                  </span>
                </td>
                <td className="px-3 py-2">{item.ai_confidence ? `${item.ai_confidence}%` : '—'}</td>
                <td className="px-3 py-2">{item.ai_flags?.join(', ') || '—'}</td>
                <td className="px-3 py-2">{item.reviewed_at ? new Date(item.reviewed_at).toLocaleDateString() : '—'}</td>
                <td className="px-3 py-2">{new Date(item.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => handleStateChange(item.id, 'verified')} title="Verify" className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleStateChange(item.id, 'flagged')} title="Flag" className="rounded p-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                      <AlertTriangle className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleStateChange(item.id, 'rejected')} title="Reject" className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Ban className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-neutral-400">No AI verifications</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// RULE METADATA TAB
// ============================================================

function RulesTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<EmRuleMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await fetchRuleMetadata()); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleVerify(id: string) {
    try { await verifyRuleMetadata(id, user?.id ?? ''); load(); } catch (e) { console.error(e); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this rule metadata?')) return;
    try { await deleteRuleMetadata(id); load(); } catch (e) { console.error(e); }
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-white/10 text-left">
            <th className="px-3 py-2">Rule ID</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Version</th>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Reference</th>
            <th className="px-3 py-2">Verified</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-neutral-100 dark:border-white/5">
              <td className="px-3 py-2 font-mono text-xs">{item.rule_id}</td>
              <td className="px-3 py-2">{item.rule_name}</td>
              <td className="px-3 py-2">{item.rule_version}</td>
              <td className="px-3 py-2">
                {RULE_SOURCE_TYPE_LABELS[item.source_type]}
                {item.source_name ? ` (${item.source_name})` : ''}
              </td>
              <td className="px-3 py-2">
                {item.reference_doc ? `${item.reference_doc}${item.reference_page ? ` p.${item.reference_page}` : ''}` : '—'}
              </td>
              <td className="px-3 py-2">
                {item.is_verified ? <Check className="h-4 w-4 text-green-600" /> : <Ban className="h-4 w-4 text-neutral-400" />}
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-1">
                  {!item.is_verified && (
                    <button onClick={() => handleVerify(item.id)} title="Verify" className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => handleDelete(item.id)} title="Delete" className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-neutral-400">No rule metadata</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// ENGINE SETTINGS TAB
// ============================================================

function SettingsTab() {
  const [items, setItems] = useState<EmEngineSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await fetchEngineSettings()); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(key: string) {
    try {
      const value = editing[key];
      let parsed: unknown = value;
      try { parsed = JSON.parse(value); } catch { /* keep as string */ }
      await updateEngineSetting(key, parsed);
      setEditing({ ...editing, [key]: '' });
      load();
    } catch (e) { console.error(e); alert('Failed to save'); }
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-white/10 text-left">
            <th className="px-3 py-2">Key</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">Value</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Editable</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-neutral-100 dark:border-white/5">
              <td className="px-3 py-2 font-mono text-xs">{item.setting_key}</td>
              <td className="px-3 py-2">{SETTING_CATEGORY_LABELS[item.category] || item.category}</td>
              <td className="px-3 py-2">
                {editing[item.setting_key] !== undefined ? (
                  <input
                    type="text"
                    value={editing[item.setting_key]}
                    onChange={(e) => setEditing({ ...editing, [item.setting_key]: e.target.value })}
                    className="w-full rounded border border-neutral-200 px-2 py-0.5 text-sm dark:border-white/10 dark:bg-neutral-900"
                  />
                ) : (
                  JSON.stringify(item.setting_value)
                )}
              </td>
              <td className="px-3 py-2">{item.setting_type}</td>
              <td className="px-3 py-2">{item.is_editable ? <Check className="h-4 w-4 text-green-600" /> : <Ban className="h-4 w-4 text-neutral-400" />}</td>
              <td className="px-3 py-2">
                {item.is_editable && (
                  editing[item.setting_key] !== undefined ? (
                    <button onClick={() => handleSave(item.setting_key)} className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
                      <Save className="h-4 w-4" />
                    </button>
                  ) : (
                    <button onClick={() => setEditing({ ...editing, [item.setting_key]: JSON.stringify(item.setting_value) })} className="rounded p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// MARKET ACTIVATION TAB
// ============================================================

function MarketsTab() {
  const [markets, setMarkets] = useState<{ country_code: string; country_name: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setMarkets(await fetchMarketActivationStatus()); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(code: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'coming_soon' : 'active';
    if (code !== 'NG' && newStatus === 'active') {
      if (!confirm(`Activate ${code}? Ensure all rules and market data are configured and approved first.`)) return;
    }
    try { await toggleMarketActivation(code, newStatus as any); load(); } catch (e) { console.error(e); }
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin" />;

  return (
    <div>
      <div className="mb-4 rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
        ⚠️ Activating a market requires fully configured and approved rules, material profiles, and pricing data.
        Do NOT activate international markets prematurely.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-white/10 text-left">
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((m) => (
              <tr key={m.country_code} className="border-b border-neutral-100 dark:border-white/5">
                <td className="px-3 py-2 font-mono">{m.country_code}</td>
                <td className="px-3 py-2 font-medium">{m.country_name}</td>
                <td className="px-3 py-2">
                  <span className={classNames(
                    'rounded px-2 py-0.5 text-xs font-medium',
                    m.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                    m.status === 'coming_soon' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                    'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                  )}>
                    {m.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {m.country_code === 'NG' ? (
                    <span className="text-xs text-neutral-400">Default market</span>
                  ) : (
                    <button
                      onClick={() => handleToggle(m.country_code, m.status)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-purple hover:bg-brand-purple/10"
                    >
                      <Power className="h-3 w-3" />
                      {m.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {markets.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-neutral-400">No market profiles</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// SHARED UI HELPERS
// ============================================================

function Input({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-neutral-900"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-neutral-900"
      >
        {options.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  );
}
