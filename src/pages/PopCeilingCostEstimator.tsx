import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { calculatePopCeiling } from '@/lib/pop-tile-calc';
import { calculateLabourCost } from '@/lib/labour';
import LabourCostSection, { useLabourConfig } from '@/components/labour/LabourCostSection';
import { track } from '@/lib/analytics';
import { logAnalyticsEvent, fetchPopMaterials, fetchSiteSettings, saveUserProject } from '@/lib/queries';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useSeo } from '@/lib/seo';
import type { PopCalcInput, PopCalcResult, Unit } from '@/types';
import type { DbPopMaterial, DbSiteSettings } from '@/types/database';

interface PassedState {
  ceilingArea?: number;
  workflow?: string;
  grandTotal?: number;
}

export default function PopCeilingCostEstimator() {
  useSeo({
    title: 'POP Ceiling Cost Estimator — Estimate POP Ceiling Project Cost',
    description: 'Estimate the full cost of your POP ceiling project including materials, labour, and waste for both Nigerian and international workflows.',
    canonicalPath: '/pop-ceiling-cost-estimator',
    ogType: 'website',
  });

  const location = useLocation();
  const passed = (location.state as PassedState | null) ?? {};
  const { user } = useAuth();

  const [materials, setMaterials] = useState<DbPopMaterial[]>([]);
  const [settings, setSettings] = useState<DbSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PopCalcResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const { config: labourConfig, setConfig: setLabourConfig } = useLabourConfig('pop_ceiling');

  const [input, setInput] = useState<PopCalcInput>({
    workflow: (passed.workflow as 'nigeria' | 'international') ?? 'nigeria',
    roomLength: 0,
    roomWidth: 0,
    unit: 'meters',
    wasteMargin: 10,
    includeDecorative: true,
    includeOptional: false,
  });

  const currencySymbol = settings?.default_currency_symbol ?? '₦';
  const currency = settings?.default_currency ?? 'NGN';

  useEffect(() => {
    async function load() {
      const [matRes, settingsRes] = await Promise.all([
        fetchPopMaterials(),
        fetchSiteSettings(),
      ]);
      setMaterials(matRes.data);
      setSettings(settingsRes.data);
      setLoading(false);
    }
    load();
  }, []);

  // Auto-calculate when ceilingArea is passed from calculator
  useEffect(() => {
    if (passed.ceilingArea && passed.ceilingArea > 0 && materials.length > 0) {
      const sqrtArea = Math.sqrt(passed.ceilingArea);
      const inputWithArea: PopCalcInput = {
        ...input,
        roomLength: sqrtArea,
        roomWidth: sqrtArea,
      };
      const nonLabourMaterials = materials.filter((m) => m.category !== 'labour');
      const rawResult = calculatePopCeiling(inputWithArea, nonLabourMaterials, currency, currencySymbol);
      const labourCost = calculateLabourCost(labourConfig, rawResult.ceilingArea);
      const r: PopCalcResult = { ...rawResult, labourCost, grandTotal: rawResult.materialCost + labourCost };
      setResult(r);
      track('pop_ceiling_estimate_generated', { workflow: input.workflow, total: r.grandTotal });
      logAnalyticsEvent('pop_ceiling_estimate_generated', { workflow: input.workflow, total: r.grandTotal });
    }
  }, [passed.ceilingArea, materials, labourConfig]);

  function update<K extends keyof PopCalcInput>(key: K, value: PopCalcInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function compute() {
    const nonLabourMaterials = materials.filter((m) => m.category !== 'labour');
    const rawResult = calculatePopCeiling(input, nonLabourMaterials, currency, currencySymbol);
    const labourCost = calculateLabourCost(labourConfig, rawResult.ceilingArea);
    const r: PopCalcResult = { ...rawResult, labourCost, grandTotal: rawResult.materialCost + labourCost };
    setResult(r);
    track('pop_ceiling_estimate_generated', { workflow: input.workflow, total: r.grandTotal });
    logAnalyticsEvent('pop_ceiling_estimate_generated', { workflow: input.workflow, total: r.grandTotal });
  }

  async function handleSave() {
    if (!user || !result) return;
    setSaving(true);
    const { error } = await saveUserProject('POP Ceiling Cost Estimate', 'pop_estimate', { ...input, result, labourConfig });
    setSaveMsg(error ? `Save failed: ${error}` : 'Saved to your projects');
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  }

  if (loading) {
    return (
      <>
        <PageHeader eyebrow="Estimate" title="POP Ceiling Cost Estimator" subtitle="Estimate material and labour costs for your POP ceiling project." backTo="/" backLabel="Home" />
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Estimate" title="POP Ceiling Cost Estimator" subtitle="Estimate material quantities, labour cost, and grand total for your POP ceiling project." backTo="/" backLabel="Home" />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Input panel */}
          <div className="card p-6 sm:p-8 lg:col-span-3">
            <Section title="Workflow">
              <Field label="POP ceiling workflow">
                <select value={input.workflow} onChange={(e) => update('workflow', e.target.value as 'nigeria' | 'international')} className="input-field">
                  <option value="nigeria">Nigeria (POP cement, fibre, surface board)</option>
                  <option value="international">International (gypsum board, framework)</option>
                </select>
              </Field>
            </Section>

            <Section title="Dimensions">
              <div className="inline-flex rounded-lg border border-neutral-200 p-1">
                {(['meters', 'feet'] as Unit[]).map((u) => (
                  <button key={u} type="button" onClick={() => update('unit', u)}
                    className={'rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-all ' + (input.unit === u ? 'bg-brand-purple text-white' : 'text-neutral-600 hover:text-brand-purple')}>
                    {u}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Room length" suffix={input.unit === 'meters' ? 'm' : 'ft'}>
                  <input type="number" min={0} step="0.01" value={input.roomLength || ''} onChange={(e) => update('roomLength', Number(e.target.value))} className="input-field" placeholder="0.00" />
                </Field>
                <Field label="Room width" suffix={input.unit === 'meters' ? 'm' : 'ft'}>
                  <input type="number" min={0} step="0.01" value={input.roomWidth || ''} onChange={(e) => update('roomWidth', Number(e.target.value))} className="input-field" placeholder="0.00" />
                </Field>
              </div>
            </Section>

            <Section title="Options">
              <div className="space-y-3">
                <ToggleRow checked={input.includeDecorative} onChange={(v) => update('includeDecorative', v)} label="Include decorative components" hint="Cornices, ceiling roses, light troughs, LED channels" />
                <ToggleRow checked={input.includeOptional} onChange={(v) => update('includeOptional', v)} label="Include optional items" hint="Scaffolding, electrician, PVC panels" />
              </div>
            </Section>

            <Section title="Waste margin">
              <div className="flex flex-wrap gap-2">
                {[0, 5, 10, 15, 20].map((w) => (
                  <button key={w} type="button" onClick={() => update('wasteMargin', w)}
                    className={'rounded-lg border px-4 py-2 text-sm font-semibold transition-all ' + (input.wasteMargin === w ? 'border-brand-purple bg-brand-purple text-white' : 'border-neutral-200 text-neutral-600 hover:border-neutral-300')}>
                    {w}%
                  </button>
                ))}
              </div>
            </Section>

            <LabourCostSection
              estimatorKey="pop_ceiling"
              config={labourConfig}
              onChange={setLabourConfig}
              currencySymbol={currencySymbol}
              area={result?.ceilingArea ?? 0}
              last
            />

            <button type="button" onClick={compute} disabled={input.roomLength <= 0 || input.roomWidth <= 0} className="btn-primary mt-6 w-full disabled:opacity-50 sm:w-auto">
              Generate Estimate <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Results panel */}
          <div className="lg:col-span-2">
            <div className="card sticky top-20 overflow-hidden">
              <div className="bg-brand-navy p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Estimated total</p>
                {result ? (
                  <p className="mt-1 text-3xl font-bold sm:text-4xl">{formatCurrency(result.grandTotal, currencySymbol)}</p>
                ) : (
                  <p className="mt-1 text-3xl font-bold text-white/40 sm:text-4xl">{currencySymbol}—</p>
                )}
                <p className="mt-1 text-xs text-white/50">Estimate only — not a final quote.</p>
              </div>
              <div className="space-y-2 p-6">
                {result ? (
                  <>
                    <Row label="Ceiling area" value={`${formatNumber(result.ceilingArea)} m²`} />
                    <Row label="Material cost" value={formatCurrency(result.materialCost, currencySymbol)} />
                    {labourConfig.includeLabour && <Row label="Labour cost" value={formatCurrency(result.labourCost, currencySymbol)} />}
                    <Row label="Waste allowance" value={`${formatNumber(result.wasteAmount)} m²`} />
                    <div className="border-t border-neutral-100 pt-2">
                      <Row label="Grand total" value={formatCurrency(result.grandTotal, currencySymbol)} strong />
                    </div>
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-green" />
                      {input.workflow === 'nigeria' ? 'Nigeria' : 'International'} workflow with {input.wasteMargin}% waste margin.
                    </div>
                    {saveMsg && <p className="text-sm text-brand-purple">{saveMsg}</p>}
                    {user && (
                      <button type="button" onClick={handleSave} disabled={saving} className="btn-secondary mt-3 w-full disabled:opacity-50">
                        {saving ? 'Saving…' : 'Save to Projects'}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-neutral-400">Enter dimensions and click Generate Estimate to see your cost breakdown.</p>
                )}
              </div>
              <div className="border-t border-neutral-100 bg-neutral-50 px-6 py-3 text-xs text-neutral-500">
                Estimate only. Actual costs may vary depending on materials, location, and market prices.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ title, children, last }: { title: string; children: ReactNode; last?: boolean }) {
  return (
    <div className={last ? '' : 'mb-6 border-b border-neutral-100 pb-6'}>
      <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-500">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, hint, suffix, children }: { label: string; hint?: string; suffix?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-neutral-700">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-neutral-400">{hint}</span>}
      <div className="relative mt-1.5">
        {children}
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">{suffix}</span>}
      </div>
    </label>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={'text-sm ' + (strong ? 'font-bold text-brand-navy' : 'text-neutral-500')}>{label}</span>
      <span className={'text-sm ' + (strong ? 'font-bold text-brand-navy' : 'text-neutral-700')}>{value}</span>
    </div>
  );
}

function ToggleRow({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
      <button type="button" onClick={() => onChange(!checked)}
        className={'relative h-5 w-9 shrink-0 rounded-full transition-colors ' + (checked ? 'bg-accent-green' : 'bg-neutral-300')}
        aria-pressed={checked}>
        <span className={'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ' + (checked ? 'translate-x-4' : 'translate-x-0.5')} />
      </button>
      <div>
        <p className="text-sm font-semibold text-neutral-700">{label}</p>
        {hint && <p className="text-xs text-neutral-400">{hint}</p>}
      </div>
    </div>
  );
}
