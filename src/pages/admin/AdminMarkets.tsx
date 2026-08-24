/**
 * FRELUX Admin — International Markets Management
 *
 * Manage market profiles, material rules, products, pricing, and
 * calculator availability per market.
 *
 * This is purely additive — does not modify any existing admin pages.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Trash2, Edit2, X, Check, Globe, Package, DollarSign,
  Calculator as CalcIcon, FileText, Save,
} from 'lucide-react';
import {
  fetchMarketProfiles,
  upsertMarketProfile,
  deleteMarketProfile,
  fetchMaterialRulesDb,
  upsertMaterialRule,
  deleteMaterialRule,
  fetchCalculatorConfigsDb,
  toggleCalculatorAvailability,
} from '@/lib/international';
import type {
  MarketProfile,
  MarketMaterialRule,
  MarketCalculatorConfig,
  MarketCalculatorType,
  MarketStatus,
  MeasurementSystem,
} from '@/types/international';
import {
  MARKET_STATUS_LABELS,
  MEASUREMENT_SYSTEM_LABELS,
  CALCULATOR_TYPE_LABELS,
} from '@/types/international';
import { classNames } from '@/lib/utils';

type Tab = 'profiles' | 'rules' | 'calculators';

export default function AdminMarkets() {
  const [tab, setTab] = useState<Tab>('profiles');
  const [selectedMarket, setSelectedMarket] = useState<string>('NG');

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Globe className="h-6 w-6 text-brand-purple" />
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">International Markets</h1>
      </div>

      {/* Market selector */}
      <div className="mb-6">
        <label className="mb-1 block text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          Selected Market
        </label>
        <MarketSelector value={selectedMarket} onChange={setSelectedMarket} />
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-neutral-200 dark:border-white/10">
        {([
          ['profiles', 'Market Profiles', Globe],
          ['rules', 'Material Rules', FileText],
          ['calculators', 'Calculator Availability', CalcIcon],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={classNames(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
              tab === key
                ? 'border-b-2 border-brand-purple text-brand-purple dark:text-brand-purple-lighter'
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'profiles' && <ProfilesTab />}
      {tab === 'rules' && selectedMarket && <RulesTab marketCode={selectedMarket} />}
      {tab === 'calculators' && selectedMarket && <CalculatorsTab marketCode={selectedMarket} />}
    </div>
  );
}

// ============================================================
// MARKET SELECTOR
// ============================================================
function MarketSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [markets, setMarkets] = useState<MarketProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketProfiles(true)
      .then(setMarkets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-brand-purple" />;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-900 dark:border-white/10 dark:bg-brand-navy dark:text-white"
    >
      {markets.map((m) => (
        <option key={m.country_code} value={m.country_code}>
          {m.country_name} ({m.country_code}) — {MARKET_STATUS_LABELS[m.status]}
        </option>
      ))}
    </select>
  );
}

// ============================================================
// PROFILES TAB
// ============================================================
function ProfilesTab() {
  const [profiles, setProfiles] = useState<MarketProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MarketProfile | null>(null);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProfiles(await fetchMarketProfiles(true));
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-brand-purple" /></div>;
  }

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <p className="text-sm text-neutral-500">{profiles.length} market profiles</p>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-purple-dark"
        >
          <Plus className="h-4 w-4" /> Add Market
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {profiles.map((p) => (
          <div key={p.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {p.country_name}
                </h3>
                <p className="text-xs text-neutral-400">{p.country_code} · {p.region}</p>
              </div>
              <span className={classNames(
                'rounded-md px-2 py-0.5 text-[10px] font-semibold',
                p.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                p.status === 'coming_soon' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                'bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-400'
              )}>
                {MARKET_STATUS_LABELS[p.status]}
              </span>
            </div>

            <div className="mt-2 space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
              <p>Currency: {p.currency_code} ({p.currency_symbol})</p>
              <p>Measurement: {MEASUREMENT_SYSTEM_LABELS[p.default_measurement_system]}</p>
              <p>Version: {p.profile_version}</p>
              {p.inherits_from && <p>Inherits from: {p.inherits_from}</p>}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-white/5">
              <button
                onClick={() => setEditing(p)}
                className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-brand-purple"
              >
                <Edit2 className="h-3 w-3" /> Edit
              </button>
              {p.country_code !== 'NG' && (
                <button
                  onClick={async () => {
                    if (confirm(`Delete ${p.country_name}? This will cascade-delete all related rules, products, and pricing.`)) {
                      await deleteMarketProfile(p.country_code);
                      load();
                    }
                  }}
                  className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-red-500"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {(editing || showNew) && (
        <ProfileEditModal
          profile={editing}
          onClose={() => { setEditing(null); setShowNew(false); }}
          onSaved={() => { setEditing(null); setShowNew(false); load(); }}
        />
      )}
    </div>
  );
}

function ProfileEditModal({ profile, onClose, onSaved }: {
  profile: MarketProfile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    country_code: profile?.country_code ?? '',
    country_name: profile?.country_name ?? '',
    region: profile?.region ?? 'West Africa',
    currency_code: profile?.currency_code ?? 'NGN',
    currency_symbol: profile?.currency_symbol ?? '₦',
    currency_name: profile?.currency_name ?? 'Naira',
    default_measurement_system: profile?.default_measurement_system ?? 'metric',
    default_length_unit: profile?.default_length_unit ?? 'meters',
    default_area_unit: profile?.default_area_unit ?? 'sqm',
    default_language: profile?.default_language ?? 'en',
    status: profile?.status ?? 'unsupported',
    profile_version: profile?.profile_version ?? '1.0.0',
    sort_order: profile?.sort_order ?? 100,
    is_visible: profile?.is_visible ?? false,
    inherits_from: profile?.inherits_from ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await upsertMarketProfile({
        ...form,
        supported_length_units: form.default_measurement_system === 'imperial'
          ? ['feet'] : form.default_measurement_system === 'mixed'
          ? ['meters', 'feet', 'inches'] : ['meters', 'feet'],
        supported_area_units: ['sqm', 'sqft'],
        is_visible: form.is_visible,
        sort_order: parseInt(String(form.sort_order)) || 100,
      } as Partial<MarketProfile> & { country_code: string });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-brand-navy-mid" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-neutral-900 dark:text-white">
          {profile ? `Edit ${profile.country_name}` : 'New Market Profile'}
        </h2>

        {error && <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Country Code (ISO)" value={form.country_code} onChange={(v) => setForm({ ...form, country_code: v.toUpperCase() })} disabled={!!profile} placeholder="NG" />
          <Field label="Country Name" value={form.country_name} onChange={(v) => setForm({ ...form, country_name: v })} placeholder="Nigeria" />
          <Field label="Region" value={form.region} onChange={(v) => setForm({ ...form, region: v })} placeholder="West Africa" />
          <Field label="Currency Code" value={form.currency_code} onChange={(v) => setForm({ ...form, currency_code: v.toUpperCase() })} placeholder="NGN" />
          <Field label="Currency Symbol" value={form.currency_symbol} onChange={(v) => setForm({ ...form, currency_symbol: v })} placeholder="₦" />
          <Field label="Currency Name" value={form.currency_name} onChange={(v) => setForm({ ...form, currency_name: v })} placeholder="Naira" />
          <SelectField label="Measurement System" value={form.default_measurement_system} onChange={(v) => setForm({ ...form, default_measurement_system: v as MeasurementSystem })}
            options={Object.entries(MEASUREMENT_SYSTEM_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          <SelectField label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v as MarketStatus })}
            options={Object.entries(MARKET_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          <Field label="Default Length Unit" value={form.default_length_unit} onChange={(v) => setForm({ ...form, default_length_unit: v })} placeholder="meters" />
          <Field label="Default Area Unit" value={form.default_area_unit} onChange={(v) => setForm({ ...form, default_area_unit: v })} placeholder="sqm" />
          <Field label="Profile Version" value={form.profile_version} onChange={(v) => setForm({ ...form, profile_version: v })} placeholder="1.0.0" />
          <Field label="Sort Order" value={String(form.sort_order)} onChange={(v) => setForm({ ...form, sort_order: v })} placeholder="100" />
          <Field label="Inherits From (country code)" value={form.inherits_from} onChange={(v) => setForm({ ...form, inherits_from: v })} placeholder="" />
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
            <input type="checkbox" checked={form.is_visible} onChange={(e) => setForm({ ...form, is_visible: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-brand-purple" />
            Visible in country selector
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 dark:border-white/10 dark:text-neutral-400">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white hover:bg-brand-purple-dark disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// RULES TAB
// ============================================================
function RulesTab({ marketCode }: { marketCode: string }) {
  const [rules, setRules] = useState<MarketMaterialRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRules(await fetchMaterialRulesDb(marketCode));
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [marketCode]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-brand-purple" /></div>;
  }

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <p className="text-sm text-neutral-500">{rules.length} material rules for {marketCode}</p>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-purple-dark"
        >
          <Plus className="h-4 w-4" /> Add Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <p className="text-sm text-neutral-400 py-10 text-center">
          No material rules configured for this market yet.
          {marketCode === 'NG' && ' (Nigeria uses existing calculator defaults — rules can override them)'}
        </p>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="card flex items-center justify-between p-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-brand-purple/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-purple">
                    {CALCULATOR_TYPE_LABELS[r.calculator_type as MarketCalculatorType] ?? r.calculator_type}
                  </span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white">{r.rule_key}</span>
                  {r.rule_label && <span className="text-xs text-neutral-400">({r.rule_label})</span>}
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Version {r.rule_version} · {r.is_active ? 'Active' : 'Inactive'}
                </p>
                <pre className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 overflow-x-auto">
                  {JSON.stringify(r.rule_value, null, 2)}
                </pre>
              </div>
              <button
                onClick={async () => { await deleteMaterialRule(r.id); load(); }}
                className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <RuleEditModal marketCode={marketCode} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }} />
      )}
    </div>
  );
}

function RuleEditModal({ marketCode, onClose, onSaved }: { marketCode: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    calculator_type: 'painting' as MarketCalculatorType,
    rule_key: '',
    rule_label: '',
    rule_value: '{}',
    rule_version: '1.0.0',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      let parsedValue = {};
      try { parsedValue = JSON.parse(form.rule_value); } catch { setError('Rule value must be valid JSON'); setSaving(false); return; }
      await upsertMaterialRule({
        market_code: marketCode,
        calculator_type: form.calculator_type,
        rule_key: form.rule_key,
        rule_label: form.rule_label || null,
        rule_value: parsedValue,
        rule_version: form.rule_version,
        description: form.description || null,
        is_active: true,
      } as Partial<MarketMaterialRule>);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-brand-navy-mid" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-neutral-900 dark:text-white">New Material Rule ({marketCode})</h2>
        {error && <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</div>}
        <div className="space-y-3">
          <SelectField label="Calculator" value={form.calculator_type} onChange={(v) => setForm({ ...form, calculator_type: v as MarketCalculatorType })}
            options={Object.entries(CALCULATOR_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          <Field label="Rule Key" value={form.rule_key} onChange={(v) => setForm({ ...form, rule_key: v })} placeholder="paint_coverage_per_coat" />
          <Field label="Rule Label" value={form.rule_label} onChange={(v) => setForm({ ...form, rule_label: v })} placeholder="Paint Coverage Per Coat" />
          <div>
            <label className="mb-1 block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Rule Value (JSON)</label>
            <textarea
              value={form.rule_value}
              onChange={(e) => setForm({ ...form, rule_value: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
              placeholder='{"coverage": 35, "coverage_unit": "m² per bucket"}'
            />
          </div>
          <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Coverage per coat for standard paint" />
          <Field label="Rule Version" value={form.rule_version} onChange={(v) => setForm({ ...form, rule_version: v })} placeholder="1.0.0" />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 dark:border-white/10 dark:text-neutral-400">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white hover:bg-brand-purple-dark disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CALCULATORS TAB
// ============================================================
function CalculatorsTab({ marketCode }: { marketCode: string }) {
  const [configs, setConfigs] = useState<MarketCalculatorConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setConfigs(await fetchCalculatorConfigsDb(marketCode));
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [marketCode]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-brand-purple" /></div>;
  }

  const allCalculators = Object.keys(CALCULATOR_TYPE_LABELS) as MarketCalculatorType[];

  return (
    <div>
      <p className="mb-4 text-sm text-neutral-500">
        Control which calculators are available in this market.
        {marketCode === 'NG' && ' Nigeria has all calculators active by default.'}
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {allCalculators.map((calc) => {
          const config = configs.find((c) => c.calculator_type === calc);
          const isAvailable = marketCode === 'NG' ? true : config?.is_available ?? false;

          return (
            <div key={calc} className="card flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {CALCULATOR_TYPE_LABELS[calc]}
                </p>
                <p className="text-xs text-neutral-400">
                  {config ? `v${config.config_version}` : 'No config'}
                </p>
              </div>
              <button
                onClick={async () => {
                  await toggleCalculatorAvailability(marketCode, calc, !isAvailable);
                  load();
                }}
                className={classNames(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  isAvailable ? 'bg-brand-purple' : 'bg-neutral-300 dark:bg-white/10'
                )}
              >
                <span className={classNames(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  isAvailable ? 'translate-x-6' : 'translate-x-1'
                )} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// SHARED FORM COMPONENTS
// ============================================================
function Field({ label, value, onChange, disabled, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-200">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-900 dark:border-white/10 dark:bg-brand-navy dark:text-white disabled:opacity-50"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-200">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-900 dark:border-white/10 dark:bg-brand-navy dark:text-white"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
