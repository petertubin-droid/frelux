import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, ArrowRight, CheckCircle2, AlertCircle, Loader2, Globe, MapPin } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { calculatePopCeiling } from '@/lib/pop-tile-calc';
import { track } from '@/lib/analytics';
import { logAnalyticsEvent, fetchPopMaterials, fetchPopWorkflows, fetchSiteSettings, saveUserProject } from '@/lib/queries';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useSeo } from '@/lib/seo';
import { useCalcDefaults } from '@/lib/use-calc-defaults';
import { HowCalculatedSection, EstimateDisclaimer, ReportCalculationIssue } from '@/components/calculators';
import CalculatorNearMe from '@/components/calculators/CalculatorNearMe';
import { saveEstimateHistory } from '@/lib/crm';
import ProConnectCTA from '@/components/pro-connect/ProConnectCTA';
import type { PopCalcInput, PopCalcResult, Unit } from '@/types';
import type { DbPopMaterial, DbPopWorkflow, DbSiteSettings } from '@/types/database';
import { useTemplateLoader } from "@/lib/useTemplateLoader";
import SaveTemplateButton from '@/components/templates/SaveTemplateButton';
import LoadTemplateButton from '@/components/templates/LoadTemplateButton';
import { trackCalculation } from '@/lib/achievements';
import { trackRecentTool } from '@/lib/smart-defaults';

import { FaqSection, RelatedTools, CALC_LINKS } from '@/components/seo/SeoSections';
import { PopCeilingCalculatorSeo } from '@/components/seo/SeoContent';
export default function PopCeilingCalculator() {
  const { defaults: calcDefaults } = useCalcDefaults('pop_ceiling');
  useSeo({
    title: 'POP Ceiling Calculator: How Much POP Cement Do I Need?',
    description: 'Free POP ceiling calculator. Enter your room dimensions to calculate ceiling area, material quantities, and labour for both Nigerian and international POP ceiling workflows.',
    canonicalPath: '/pop-ceiling-calculator',
    ogType: 'website',
    keywords: 'POP ceiling calculator, plaster of paris, POP cement, ceiling design, POP ceiling material',
    structuredDataArray: [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'FRELUX POP Ceiling Calculator',
        applicationCategory: 'CalculatorApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' },
          { '@type': 'ListItem', position: 2, name: 'POP Ceiling Calculator', item: 'https://freluxtools.netlify.app/pop-ceiling-calculator' },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'What is a POP ceiling?', acceptedAnswer: { '@type': 'Answer', text: 'A POP (Plaster of Paris) ceiling is a decorative ceiling made from gypsum-based plaster, popular in Nigerian homes.' } },
          { '@type': 'Question', name: 'How much POP cement do I need?', acceptedAnswer: { '@type': 'Answer', text: 'POP cement quantity depends on ceiling area and design complexity. Use the calculator for an accurate estimate.' } },
        ],
      },
    ],
  });

  const { user } = useAuth();
  useEffect(() => { trackRecentTool('/pop-ceiling-calculator', 'POP Ceiling Calculator', 'Grid3x3'); });
  const [materials, setMaterials] = useState<DbPopMaterial[]>([]);
  const [workflows, setWorkflows] = useState<DbPopWorkflow[]>([]);
  const [settings, setSettings] = useState<DbSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PopCalcResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [input, setInput] = useState<PopCalcInput>({
    workflow: 'nigeria',
    roomLength: 0,
    roomWidth: 0,
    unit: 'meters',
    wasteMargin: 10,
    includeDecorative: false,
    includeOptional: false,
  });
  const { templateData: loadedTemplate } = useTemplateLoader();
  useEffect(() => {
    if (loadedTemplate?.input_data) {
      setInput(loadedTemplate.input_data as unknown as PopCalcInput);
    }
  }, [loadedTemplate]);

  const currencySymbol = settings?.default_currency_symbol ?? '₦';
  const currency = settings?.default_currency ?? 'NGN';

  useEffect(() => {
    async function load() {
      const [matRes, wfRes, settingsRes] = await Promise.all([
        fetchPopMaterials(),
        fetchPopWorkflows(),
        fetchSiteSettings(),
      ]);
      setMaterials(matRes.data);
      setWorkflows(wfRes.data);
      setSettings(settingsRes.data);
      setLoading(false);
    }
    load();
  }, []);

  function update<K extends keyof PopCalcInput>(key: K, value: PopCalcInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  }

  function compute() {
    const e: Record<string, string> = {};
    if (input.roomLength <= 0) e.roomLength = 'Enter a valid length';
    if (input.roomWidth <= 0) e.roomWidth = 'Enter a valid width';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const r = calculatePopCeiling(input, materials, currency, currencySymbol);
    trackCalculation('pop');
    setResult(r);
    track('pop_ceiling_calculated', { workflow: input.workflow, area: r.ceilingArea });
    void saveEstimateHistory(user?.id ?? null, { calculator_type: 'pop', project_name: `POP Ceiling: ${input.workflow}`, input_data: input as unknown as Record<string, unknown>, result_data: r as unknown as Record<string, unknown> }).catch(() => {});
    logAnalyticsEvent('pop_ceiling_calculated', { workflow: input.workflow, area: r.ceilingArea });
  }

  function startOver() {
    setResult(null);
    setInput({ ...input, roomLength: 0, roomWidth: 0 });
  }

  async function handleSave() {
    if (!user || !result) return;
    setSaving(true);
    const { error } = await saveUserProject('POP Ceiling Calculation', 'pop_ceiling', {
      ...input,
      result,
    });
    setSaveMsg(error ? `Save failed: ${error}` : 'Saved to your projects');
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  }

  if (loading) {
    return (
      <>
        <PageHeader eyebrow="Calculate" title="POP Ceiling Calculator" subtitle="Calculate POP ceiling materials and quantities." breadcrumbs={[{ label: 'Calculators', path: '/paint-calculator' }, { label: 'POP Ceiling Calculator' }]}
        useCalcTitle />
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Calculate" title="POP Ceiling Calculator" subtitle="Calculate ceiling area, material quantities, and labour for your POP ceiling project." breadcrumbs={[{ label: 'Calculators', path: '/paint-calculator' }, { label: 'POP Ceiling Calculator' }]} />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <LoadTemplateButton calculatorType="pop" onLoad={(t) => setInput(t.input_data as unknown as PopCalcInput)} />
          <SaveTemplateButton calculatorType="pop" inputData={input as unknown as Record<string, unknown>} defaultName={`${input.roomLength}×${input.roomWidth} POP`} />
        </div>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {!result && (
          <div className="card p-6 sm:p-8 dark:border-white/5 dark:bg-brand-navy-mid">
            {/* Workflow selection */}
            <h2 className="text-lg font-bold text-brand-navy dark:text-white">Choose workflow</h2>
            <p className="mt-1 text-sm text-neutral-500">Select the POP ceiling method that matches your region.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {workflows.map((wf) => {
                const selected = input.workflow === wf.workflow_type;
                const Icon = wf.workflow_type === 'nigeria' ? MapPin : Globe;
                return (
                  <button key={wf.id} type="button" onClick={() => update('workflow', wf.workflow_type)}
                    className={'flex items-start gap-3 rounded-lg border p-4 text-left transition-all ' + (selected ? 'border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20' : 'border-neutral-200 hover:border-neutral-300')}>
                    <span className={'inline-flex h-10 w-10 items-center justify-center rounded-lg ' + (selected ? 'bg-brand-purple text-white' : 'bg-neutral-100 text-neutral-600')}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-brand-navy dark:text-white">{wf.name}</span>
                      <span className="block text-xs text-neutral-500">{wf.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Unit toggle */}
            <div className="mt-6">
              <div className="inline-flex rounded-lg border border-neutral-200 p-1">
                {(['meters', 'feet'] as Unit[]).map((u) => (
                  <button key={u} type="button" onClick={() => update('unit', u)}
                    className={'rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-all ' + (input.unit === u ? 'bg-brand-purple text-white' : 'text-neutral-600 hover:text-brand-purple')}>
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Dimensions */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Room length" suffix={input.unit === 'meters' ? 'm' : 'ft'} error={errors.roomLength}>
                <input type="number" min={0} step="0.01" value={input.roomLength || ''} onChange={(e) => update('roomLength', Number(e.target.value))} className="input-field" placeholder="0.00" />
              </Field>
              <Field label="Room width" suffix={input.unit === 'meters' ? 'm' : 'ft'} error={errors.roomWidth}>
                <input type="number" min={0} step="0.01" value={input.roomWidth || ''} onChange={(e) => update('roomWidth', Number(e.target.value))} className="input-field" placeholder="0.00" />
              </Field>
            </div>

            {/* Options */}
            <div className="mt-6 space-y-3">
              <Toggle checked={input.includeDecorative} onChange={(v) => update('includeDecorative', v)} label="Include decorative components" hint="Cornices, ceiling roses, light troughs, LED channels, access panels" />
              <Toggle checked={input.includeOptional} onChange={(v) => update('includeOptional', v)} label="Include optional items" hint="Scaffolding, electrician, PVC panels, and other optional materials" />
            </div>

            {/* Waste margin */}
            <div className="mt-6">
              <span className="block text-sm font-semibold text-neutral-700">Waste / safety margin</span>
              <p className="mt-0.5 text-xs text-neutral-400">Extra material added to account for spillage and uneven application.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[0, 5, 10, 15, 20].map((w) => (
                  <button key={w} type="button" onClick={() => update('wasteMargin', w)}
                    className={'rounded-lg border px-4 py-2 text-sm font-semibold transition-all ' + (input.wasteMargin === w ? 'border-brand-purple bg-brand-purple text-white' : 'border-neutral-200 text-neutral-600 hover:border-neutral-300')}>
                    {w}%
                  </button>
                ))}
              </div>
            </div>

            {Object.keys(errors).length > 0 && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Please fix the errors above before calculating.</p>
              </div>
            )}

            <button type="button" onClick={compute} className="btn-primary mt-6 w-full sm:w-auto">
              Calculate POP Ceiling
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {result && (
          <PopResultCard result={result} input={input} currencySymbol={currencySymbol}
            onAgain={() => setResult(null)} onStartOver={startOver}
            calcDefaults={{ howCalculatedText: calcDefaults.howCalculatedText as string || '', estimateDisclaimer: calcDefaults.estimateDisclaimer }}
            user={user} onSave={handleSave} saving={saving} saveMsg={saveMsg} />
        )}
      </div>

      <PopCeilingCalculatorSeo />

      <FaqSection faqs={[
        { question: "What is a POP ceiling?", answer: <span>A POP (Plaster of Paris) ceiling is a decorative ceiling made from gypsum-based plaster. It is popular in Nigerian homes for creating smooth, sculpted ceiling designs.</span> },
        { question: "How much POP cement do I need?", answer: <span>POP cement quantity depends on your ceiling area and design complexity. The calculator estimates material based on room dimensions and your selected workflow.</span> },
        { question: "What is the difference between Nigerian and international POP workflows?", answer: <span>The Nigerian workflow uses specific local materials and techniques, while the international workflow follows standard gypsum board methods. The calculator supports both.</span> },
      ]} />

      <RelatedTools links={[
        CALC_LINKS.popCeilingCost,
        CALC_LINKS.paintCalculator,
        CALC_LINKS.screedingCalc,
        CALC_LINKS.tileCalc,
      ]} />
      <ProConnectCTA calculatorType="pop-ceiling" />
    </>
  );
}

function PopResultCard({ result, input, currencySymbol, onAgain, onStartOver, user, onSave, saving, saveMsg, calcDefaults }: {
  result: PopCalcResult;
  input: PopCalcInput;
  currencySymbol: string;
  onAgain: () => void;
  onStartOver: () => void;
  user: { email?: string } | null;
  onSave: () => void;
  saving: boolean;
  saveMsg: string;
  calcDefaults: { howCalculatedText: string; estimateDisclaimer: string };
}) {
  const grouped = result.materials.reduce<Record<string, typeof result.materials>>((acc, m) => {
    (acc[m.category] ??= []).push(m);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    primary: 'Primary Materials',
    finishing: 'Finishing Materials',
    decorative: 'Decorative Components',
    framework: 'Framework',
    ceiling_boards: 'Ceiling Boards',
    fasteners: 'Fasteners',
    labour: 'Labour',
  };

  return (
    <div className="mt-8 card overflow-hidden dark:border-white/5">
      <div className="relative bg-gradient-to-br from-brand-navy to-brand-purple p-6 text-white sm:p-8">
        <div className="flex items-center gap-2 text-accent-green">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">Your POP Ceiling Estimate</span>
        </div>
        <p className="mt-3 text-sm text-white/60">
          {input.workflow === 'nigeria' ? 'Nigeria' : 'International'} workflow · {input.wasteMargin}% waste margin
        </p>
        <p className="calc-result mt-1 text-4xl font-bold sm:text-5xl">{formatNumber(result.ceilingArea)} m²</p>
        <p className="mt-1 text-sm text-white/60">ceiling area</p>
      </div>

      <div className="p-6 sm:p-8">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="mb-6">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-widest text-neutral-500">{categoryLabels[cat] ?? cat}</h3>
            <div className="space-y-2">
              {items.map((m, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
                  <div>
                    <p className="text-sm font-semibold text-brand-navy dark:text-white">{m.name}</p>
                    <p className="text-xs text-neutral-400">{formatNumber(m.quantity)} {m.unit} · {m.packagesNeeded} package(s)</p>
                  </div>
                  <p className="text-sm font-bold text-brand-navy dark:text-white">{formatCurrency(m.cost, currencySymbol)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-4 space-y-2 rounded-lg bg-neutral-50 p-4">
          <Row label="Material cost" value={formatCurrency(result.materialCost, currencySymbol)} />
          <Row label="Labour cost" value={formatCurrency(result.labourCost, currencySymbol)} />
          <Row label="Waste allowance" value={`${formatNumber(result.wasteAmount)} m²`} />
          <div className="border-t border-neutral-200 pt-2">
            <Row label="Grand total" value={formatCurrency(result.grandTotal, currencySymbol)} strong />
          </div>
        </div>

        {saveMsg && <p className="mt-3 text-sm text-brand-purple">{saveMsg}</p>}

        <HowCalculatedSection
          methodologyText={(calcDefaults.howCalculatedText as string) || ''}
          assumptions={[
            { label: 'Ceiling area', value: `${formatNumber(result.ceilingArea)} m²` },
            { label: 'Waste margin', value: `${input.wasteMargin}%` },
            { label: 'Workflow', value: input.workflow },
          ]}
        />
        <EstimateDisclaimer text={calcDefaults.estimateDisclaimer} />
        <ReportCalculationIssue
          calculatorType="pop_ceiling"
          userInput={{ roomLength: input.roomLength, roomWidth: input.roomWidth, unit: input.unit, wasteMargin: input.wasteMargin, workflow: input.workflow }}
          actualResult={{ ceilingArea: result.ceilingArea, materialCost: result.materialCost, grandTotal: result.grandTotal }}
        />

        {/* Post as Job CTA */}
        <div className="mt-4 rounded-xl border border-brand-purple/20 bg-brand-purple/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-brand-navy dark:text-white">Need a pro for this POP ceiling?</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Post this estimate as a job and get bids from verified pros near you.</p>
            </div>
            <a
              href={`/marketplace/post?project_type=pop_ceiling&budget_min=${Math.round(result.grandTotal * 0.9)}&budget_max=${Math.round(result.grandTotal * 1.2)}&title=POP Ceiling Installation — ${result.ceilingArea.toFixed(1)} m²`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-purple-dark whitespace-nowrap"
            >
              Post as Job
            </a>
          </div>
        </div>

        {/* Find Near Me */}
        <div className="mt-4">
          <CalculatorNearMe
            tradeSlug="pop_ceiling"
            materialName="POP ceiling materials"
            projectType="pop_ceiling"
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={onAgain} className="btn-secondary">
            <RotateCcw className="h-4 w-4" /> Calculate Again
          </button>
          <div className="flex flex-col gap-3 sm:flex-row">
            {user && (
              <button type="button" onClick={onSave} disabled={saving} className="btn-secondary disabled:opacity-50">
                {saving ? 'Saving…' : 'Save to Projects'}
              </button>
            )}
            <button type="button" onClick={onStartOver} className="btn-secondary">Start Over</button>
            <Link to="/pop-ceiling-cost-estimator" state={{ ceilingArea: result.ceilingArea, workflow: input.workflow, grandTotal: result.grandTotal }}
              className="btn-primary">
              Continue to Cost Estimate <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 p-4">
      <button type="button" onClick={() => onChange(!checked)}
        className={'relative h-5 w-9 shrink-0 rounded-full transition-colors ' + (checked ? 'bg-accent-green' : 'bg-neutral-300')}
        aria-pressed={checked}>
        <span className={'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform dark:bg-brand-navy-mid ' + (checked ? 'translate-x-4' : 'translate-x-0.5')} />
      </button>
      <div>
        <p className="text-sm font-semibold text-neutral-700">{label}</p>
        {hint && <p className="text-xs text-neutral-400">{hint}</p>}
      </div>
    </div>
  );
}

function Field({ label, suffix, hint, error, children }: { label: string; suffix?: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-neutral-700">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-neutral-400">{hint}</span>}
      <div className="relative mt-1.5">
        {children}
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">{suffix}</span>}
      </div>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={'text-sm ' + (strong ? 'font-bold text-brand-navy dark:text-white' : 'text-neutral-500 dark:text-neutral-400')}>{label}</span>
      <span className={'text-sm ' + (strong ? 'font-bold text-brand-navy dark:text-white' : 'text-neutral-700 dark:text-neutral-200')}>{value}</span>
    </div>
  );
}
