import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Home, Building2, Trees, Fence, RotateCcw, ArrowRight, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import MultiStepProgress from '@/components/ui/MultiStepProgress';
import TemplatePicker from '@/components/ui/TemplatePicker';
import CountUp from '@/components/ui/CountUp';
import StickyActionBar from '@/components/ui/StickyActionBar';
import { useToast } from '@/components/ui/Toast';
import { calculatePaint, type CalcConfig } from '@/lib/calc';
import { track } from '@/lib/analytics';
import { logAnalyticsEvent, fetchPaintTypes, fetchScreedingMixConfig, saveUserProject } from '@/lib/queries';
import { formatNumber } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useCalcDefaults } from '@/lib/use-calc-defaults';
import { HowCalculatedSection, EstimateDisclaimer, ReportCalculationIssue } from '@/components/calculators';
import CalculatorNearMe from '@/components/calculators/CalculatorNearMe';
import type { CalculatorInput, CalculatorResult, ProjectType, Unit, OpeningDimensions, ScreedingMixConfig } from '@/types';
import type { DbPaintType } from '@/types/database';
import { RewardedFeatureGate } from '@/components/rewarded/RewardedFeatureGate';
import { AdvancedCalculator } from '@/components/rewarded/AdvancedCalculator';

const projectTypes: { value: ProjectType; label: string; description: string; icon: typeof Home }[] = [
  { value: 'room', label: 'Room', description: 'A single interior room', icon: Home },
  { value: 'house', label: 'House', description: 'Whole house interior', icon: Building2 },
  { value: 'exterior', label: 'Exterior', description: 'Outside walls', icon: Trees },
  { value: 'fence', label: 'Fence or Gate', description: 'Fence, gate, or railing', icon: Fence },
];

// Defaults are fetched from admin-configured calc rules via useCalcDefaults
// WASTE_OPTIONS and defaultDoorDims/defaultWindowDims are set dynamically in the component

const ADVANCED_FEATURES = [
  'Advanced material breakdown with line items',
  'Custom mix ratio editor',
  'Labour cost customization',
  'Multiple waste percentage scenarios',
  'Thickness and multiple coat calculations',
  'Profit and markup calculator',
  'Transport and logistics cost estimator',
  'Tax/VAT calculator',
  'Save, duplicate and compare estimates',
  'Export professional PDF quotations',
  'Material shopping list',
  'Cost comparison between brands',
  'AI recommendations for reducing waste',
  'AI assistant for calculation questions',
];

import { useSeo } from '@/lib/seo';
import { RelatedTools, CALC_LINKS } from '@/components/seo/SeoSections';

export default function PaintCalculator() {
  const { defaults: calcDefaults, rules: calcRules } = useCalcDefaults('painting');
  const WASTE_OPTIONS = (calcDefaults.wasteMarginOptions as number[]) ?? [0, 5, 10, 15];
  const defaultDoorDims: OpeningDimensions = { width: calcDefaults.doorWidthM, height: calcDefaults.doorHeightM };
  const defaultWindowDims: OpeningDimensions = { width: calcDefaults.windowWidthM, height: calcDefaults.windowHeightM };
  const { toast } = useToast();
  const { user } = useAuth();
  useSeo({
    title: 'Paint Calculator — How Much Paint Do I Need?',
    description:
      'Free paint calculator. Enter your room dimensions, doors, windows, and coats to estimate exactly how many liters of paint your project requires.',
    canonicalPath: '/paint-calculator',
    ogType: 'website',
    structuredDataArray: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'FRELUX Paint Calculator',
        description: 'Free paint calculator. Enter your room dimensions, doors, windows, and coats to estimate exactly how many liters of paint your project requires.',
        url: 'https://freluxtools.netlify.app/paint-calculator',
        applicationCategory: 'CalculatorApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://freluxtools.netlify.app' },
          { '@type': 'ListItem', 'position': 2, 'name': 'Calculators', 'item': 'https://freluxtools.netlify.app/calculators' },
          { '@type': 'ListItem', 'position': 3, 'name': 'Paint Calculator', 'item': 'https://freluxtools.netlify.app/paint-calculator' }
        ]
      }
    ],
  });

  const [step, setStep] = useState(1);
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [input, setInput] = useState<CalculatorInput>({
    projectType: 'room',
    length: 0,
    width: 0,
    wallHeight: 0,
    doors: 0,
    doorDims: defaultDoorDims,
    windows: 0,
    windowDims: defaultWindowDims,
    coats: 2,
    paintType: '',
    unit: 'meters',
    includeCeiling: false,
    wasteMargin: 10,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paintTypes, setPaintTypes] = useState<DbPaintType[]>([]);
  const [screedingConfig, setScreedingConfig] = useState<ScreedingMixConfig | null>(null);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTypes() {
      const { data, error } = await fetchPaintTypes();
      if (error) setTypesError(error.message);
      setPaintTypes(data);
      if (data.length > 0 && !input.paintType) {
        setInput((prev) => ({ ...prev, paintType: data[0].id }));
      }
      setTypesLoading(false);
    }
    async function loadScreedingConfig() {
      const { data } = await fetchScreedingMixConfig();
      if (data) {
        setScreedingConfig({
          paintCoverageRateM2PerL: Number(data.paint_coverage_rate_m2_per_l),
          paintBucketSizeL: Number(data.paint_bucket_size_l),
          paintPricePerBucket: Number(data.paint_price_per_bucket),
          cementConsumptionRatioKgPerL: Number(data.cement_consumption_ratio_kg_per_l),
          cementBagSizeKg: Number(data.cement_bag_size_kg),
          cementPricePerBag: Number(data.cement_price_per_bag),
          defaultMixRatio: data.default_mix_ratio,
          labourRatePerSqm: Number(data.labour_rate_per_sqm),
          wastePercentage: Number(data.waste_percentage),
          taxVatPercentage: Number(data.tax_vat_percentage),
          currency: data.currency,
          currencySymbol: data.currency_symbol,
        });
      }
    }
    loadTypes();
    loadScreedingConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calcConfig: CalcConfig | undefined = useMemo(() => {
    const selected = paintTypes.find((t) => t.id === input.paintType || t.name === input.paintType);
    if (!selected) return undefined;
    return {
      coverageRate: Number(selected.coverage_rate),
      containerSizes: selected.container_sizes,
    };
  }, [paintTypes, input.paintType]);

  const selectedPaintType = paintTypes.find((t) => t.id === input.paintType || t.name === input.paintType);

  function update<K extends keyof CalculatorInput>(key: K, value: CalculatorInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  }

  function validateStep(s: number): boolean {
    const e: Record<string, string> = {};
    if (s === 2) {
      if (input.length <= 0) e.length = 'Enter a valid length';
      // Width is optional for all project types — no validation needed when blank.
      if (input.wallHeight <= 0) e.wallHeight = 'Enter a valid wall height';
    }
    if (s === 3) {
      if (input.doors < 0) e.doors = 'Doors cannot be negative';
      if (input.windows < 0) e.windows = 'Windows cannot be negative';
      if (input.coats < 1) e.coats = 'Enter at least 1 coat';
      if (input.wasteMargin < 0 || input.wasteMargin > 100) e.wasteMargin = 'Waste margin must be 0 to 100';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validateStep(step)) return;
    if (step === 1) {
      track('calculator_started', { projectType: input.projectType });
      logAnalyticsEvent('calculator_started', { projectType: input.projectType });
    }
    setStep((s) => Math.min(3, s + 1));
  }

  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  function compute() {
    if (!validateStep(3)) return;
    if (paintTypes.length === 0) return;
    const r = calculatePaint(input, calcConfig);
    setResult(r);
    track('calculator_completed', { projectType: input.projectType, area: r.paintableArea, liters: r.adjustedLiters });
    logAnalyticsEvent('calculator_completed', { projectType: input.projectType, area: r.paintableArea, liters: r.adjustedLiters });
  }

  function startOver() {
    setStep(1);
    setResult(null);
    setInput({
      projectType: 'room',
      length: 0,
      width: 0,
      wallHeight: 0,
      doors: 0,
      doorDims: defaultDoorDims,
      windows: 0,
      windowDims: defaultWindowDims,
      coats: 2,
      paintType: paintTypes[0]?.id ?? '',
      unit: 'meters',
      includeCeiling: false,
      wasteMargin: 10,
    });
  }

  function handleLoadTemplate(data: Record<string, unknown>) {
    setInput((prev) => ({ ...prev, ...data } as CalculatorInput));
    toast({ type: 'info', title: 'Template loaded', message: 'Adjust values and recalculate.' });
  }

  async function handleSave() {
    if (!user) {
      toast({ type: 'warning', title: 'Sign in required', message: 'Sign in to save your calculations.' });
      return;
    }
    const name = `Paint: ${input.projectType} — ${formatNumber(result?.paintableArea ?? 0)} m²`;
    const { error } = await saveUserProject(name, 'paint_calc', { input, result }, undefined);
    if (error) {
      toast({ type: 'error', title: 'Failed to save', message: error });
      return;
    }
    toast({ type: 'success', title: 'Project saved', message: 'Find it in My Projects.' });
  }

  function handleExport() {
    toast({ type: 'info', title: 'Exporting PDF', message: 'Use the Advanced Calculator export for professional quotations.' });
  }

  async function handleShare() {
    if (!result || !user) {
      toast({ type: 'warning', title: 'Sign in required', message: 'Sign in to share your calculations.' });
      return;
    }
    toast({ type: 'info', title: 'Share link copied', message: 'Shareable link copied to clipboard.' });
  }

  function handleAskAi() {
    toast({ type: 'info', title: 'AI Assistant', message: 'Redirecting to the Smart Color Assistant.' });
  }

  return (
    <>
      <PageHeader
        eyebrow="Tool"
        title="Paint Calculator"
        subtitle="Estimate how much paint your project may require, step by step."
        backTo="/"
        backLabel="Home"
      />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {typesError && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Couldn't load paint types: {typesError}. Please try again later.</p>
          </div>
        )}

        {!result && paintTypes.length === 0 && !typesLoading && (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
            <p className="text-sm font-semibold text-neutral-600">No paint types configured</p>
            <p className="mt-1 text-xs text-neutral-500">
              An administrator needs to add paint types with coverage rates before the calculator can produce results.
            </p>
          </div>
        )}

        {!result && paintTypes.length > 0 && (
          <div className="mb-6">
            <MultiStepProgress
              steps={[
                { label: 'Project type', shortLabel: 'Type' },
                { label: 'Measurements', shortLabel: 'Measure' },
                { label: 'Surface details', shortLabel: 'Details' },
              ]}
              current={step - 1}
            />
          </div>
        )}

        {!result && paintTypes.length > 0 ? (
          <div className="mt-8 card p-6 sm:p-8 dark:border-white/5 dark:bg-brand-navy-mid">
            <div className="mb-6 flex justify-end">
              <TemplatePicker templateType="paint" onLoad={handleLoadTemplate} currentData={input as unknown as Record<string, unknown>} />
            </div>
            {step === 1 && <Step1 input={input} update={update} />}
            {step === 2 && <Step2 input={input} update={update} errors={errors} />}
            {step === 3 && (
              <Step3
                input={input}
                update={update}
                errors={errors}
                paintTypes={paintTypes}
                typesLoading={typesLoading}
                wasteOptions={WASTE_OPTIONS}
              />
            )}

            <div className="mt-8 flex items-center justify-between border-t border-neutral-100 pt-6">
              <button type="button" onClick={back} disabled={step === 1} className="btn-secondary disabled:opacity-40">
                Back
              </button>
              {step < 3 ? (
                <button type="button" onClick={next} className="btn-primary">
                  Continue
                </button>
              ) : (
                <button type="button" onClick={compute} className="btn-primary">
                  Calculate
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ) : null}

        {result && (
          <ResultCard
            result={result}
            input={input}
            paintTypeName={selectedPaintType?.name ?? input.paintType}
            onAgain={() => setResult(null)}
            onStartOver={startOver}
            calcDefaults={calcDefaults}
          onSave={handleSave}
          onExport={handleExport}
          onShare={handleShare}
          onAskAi={handleAskAi}
          />
        )}

        {result && (
          <StickyActionBar
            onRecalculate={() => setResult(null)}
          />
        )}

        {result && screedingConfig && (
          <RewardedFeatureGate
            toolKey="advanced_calculator"
            featureName="Advanced Calculator"
            features={ADVANCED_FEATURES}
          >
            {(access) => (
              <AdvancedCalculator
                netArea={result.paintableArea}
                config={screedingConfig}
                clientHash={access.clientHash}
              />
            )}
          </RewardedFeatureGate>
        )}
      </div>
      <RelatedTools links={[
        CALC_LINKS.costEstimator,
        CALC_LINKS.screedingCalc,
        CALC_LINKS.popCeilingCalc,
        CALC_LINKS.tileCalc,
        CALC_LINKS.buildToRoof,
        CALC_LINKS.imageEstimator,
      ]} />
    </>
  );
}

function Step1({
  input,
  update,
}: {
  input: CalculatorInput;
  update: <K extends keyof CalculatorInput>(key: K, value: CalculatorInput[K]) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-brand-navy dark:text-white">Choose project type</h2>
      <p className="mt-1 text-sm text-neutral-500">Select what you're painting to tailor the calculation.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {projectTypes.map((p) => {
          const Icon = p.icon;
          const selected = input.projectType === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => update('projectType', p.value)}
              className={
                'flex items-start gap-3 rounded-lg border p-4 text-left transition-all ' +
                (selected ? 'border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20' : 'border-neutral-200 hover:border-neutral-300')
              }
            >
              <span className={'inline-flex h-10 w-10 items-center justify-center rounded-lg ' + (selected ? 'bg-brand-purple text-white' : 'bg-neutral-100 text-neutral-600')}>
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-brand-navy dark:text-white">{p.label}</span>
                <span className="block text-xs text-neutral-500">{p.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step2({
  input,
  update,
  errors,
}: {
  input: CalculatorInput;
  update: <K extends keyof CalculatorInput>(key: K, value: CalculatorInput[K]) => void;
  errors: Record<string, string>;
}) {
  const unitLabel = input.unit === 'meters' ? 'm' : 'ft';
  const isFence = input.projectType === 'fence';
  const isExterior = input.projectType === 'exterior';

  return (
    <div>
      <h2 className="text-lg font-bold text-brand-navy dark:text-white">Enter measurements</h2>
      <p className="mt-1 text-sm text-neutral-500">Provide the dimensions of the area you're painting.</p>

      <div className="mt-5 inline-flex rounded-lg border border-neutral-200 p-1">
        {(['meters', 'feet'] as Unit[]).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => update('unit', u)}
            className={
              'rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-all ' +
              (input.unit === u ? 'bg-brand-purple text-white' : 'text-neutral-600 hover:text-brand-purple')
            }
            aria-pressed={input.unit === u}
          >
            {u}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-neutral-400">
        Currently using <span className="font-semibold text-neutral-600">{input.unit}</span>.
      </p>

      <div className={'mt-6 grid gap-4 ' + (isFence ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
        <Field label={isFence ? 'Fence length' : 'Length'} suffix={unitLabel} error={errors.length}>
          <input type="number" min={0} step="0.01" value={input.length || ''} onChange={(e) => update('length', Number(e.target.value))} className="input-field" placeholder="0.00" />
        </Field>
        {!isFence && (
          <Field label="Width (Optional if not applicable)" suffix={unitLabel} hint="Leave blank if only one pair of walls needs painting">
            <input type="number" min={0} step="0.01" value={input.width || ''} onChange={(e) => update('width', Number(e.target.value))} className="input-field" placeholder="0.00" />
          </Field>
        )}
        <Field label={isFence ? 'Fence height' : 'Wall height'} suffix={unitLabel} error={errors.wallHeight}>
          <input type="number" min={0} step="0.01" value={input.wallHeight || ''} onChange={(e) => update('wallHeight', Number(e.target.value))} className="input-field" placeholder="0.00" />
        </Field>
      </div>

      {!isFence && !isExterior && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-neutral-200 p-4">
          <Toggle checked={input.includeCeiling} onChange={(v) => update('includeCeiling', v)} />
          <div>
            <p className="text-sm font-semibold text-neutral-700">Include ceiling</p>
            <p className="text-xs text-neutral-400">Adds the ceiling area (length × width) to the paintable surface. Requires width to be entered.</p>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-neutral-400">
        Calculations are performed in metric internally; feet values are converted automatically.
      </p>
    </div>
  );
}

function Step3({
  input,
  update,
  errors,
  paintTypes,
  typesLoading,
  wasteOptions,
}: {
  input: CalculatorInput;
  update: <K extends keyof CalculatorInput>(key: K, value: CalculatorInput[K]) => void;
  errors: Record<string, string>;
  paintTypes: DbPaintType[];
  typesLoading: boolean;
  wasteOptions: number[];
}) {
  const [showDoorDims, setShowDoorDims] = useState(false);
  const [showWindowDims, setShowWindowDims] = useState(false);
  const isFence = input.projectType === 'fence';
  const isExterior = input.projectType === 'exterior';

  // Fence and exterior projects typically have no doors/windows to subtract.
  const showOpenings = !isFence && !isExterior;

  function updateDoorDim(key: keyof OpeningDimensions, value: number) {
    update('doorDims', { ...input.doorDims, [key]: value });
  }
  function updateWindowDim(key: keyof OpeningDimensions, value: number) {
    update('windowDims', { ...input.windowDims, [key]: value });
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-brand-navy dark:text-white">Surface details</h2>
      <p className="mt-1 text-sm text-neutral-500">Tell us about the finish you want{showOpenings ? ', plus doors and windows' : ''}.</p>

      {showOpenings && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <Field label="Number of doors" error={errors.doors}>
              <input type="number" min={0} value={input.doors || 0} onChange={(e) => update('doors', Number(e.target.value))} className="input-field" />
            </Field>
            <button type="button" onClick={() => setShowDoorDims((v) => !v)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-purple hover:underline">
              <ChevronDown className={'h-3 w-3 transition-transform ' + (showDoorDims ? 'rotate-180' : '')} />
              Custom door dimensions
            </button>
            {showDoorDims && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Field label="Door width (m)">
                  <input type="number" min={0} step="0.01" value={input.doorDims.width || ''} onChange={(e) => updateDoorDim('width', Number(e.target.value))} className="input-field text-sm" />
                </Field>
                <Field label="Door height (m)">
                  <input type="number" min={0} step="0.01" value={input.doorDims.height || ''} onChange={(e) => updateDoorDim('height', Number(e.target.value))} className="input-field text-sm" />
                </Field>
              </div>
            )}
          </div>
          <div>
            <Field label="Number of windows" error={errors.windows}>
              <input type="number" min={0} value={input.windows || 0} onChange={(e) => update('windows', Number(e.target.value))} className="input-field" />
            </Field>
            <button type="button" onClick={() => setShowWindowDims((v) => !v)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-purple hover:underline">
              <ChevronDown className={'h-3 w-3 transition-transform ' + (showWindowDims ? 'rotate-180' : '')} />
              Custom window dimensions
            </button>
            {showWindowDims && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Field label="Window width (m)">
                  <input type="number" min={0} step="0.01" value={input.windowDims.width || ''} onChange={(e) => updateWindowDim('width', Number(e.target.value))} className="input-field text-sm" />
                </Field>
                <Field label="Window height (m)">
                  <input type="number" min={0} step="0.01" value={input.windowDims.height || ''} onChange={(e) => updateWindowDim('height', Number(e.target.value))} className="input-field text-sm" />
                </Field>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={'mt-4 ' + (showOpenings ? '' : 'mt-6')}>
        <Field label="Number of paint coats" error={errors.coats}>
          <input type="number" min={1} max={6} value={input.coats} onChange={(e) => update('coats', Number(e.target.value))} className="input-field" />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Paint type">
          <select value={input.paintType} onChange={(e) => update('paintType', e.target.value)} className="input-field">
            {typesLoading && <option value="">Loading…</option>}
            {paintTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({Number(t.coverage_rate)} m²/L per coat)
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-4">
        <span className="block text-sm font-semibold text-neutral-700">Waste / safety margin</span>
        <p className="mt-0.5 text-xs text-neutral-400">Extra paint added to account for spills, roller waste, and touch ups.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {wasteOptions.map((w: number) => (
            <button
              key={w}
              type="button"
              onClick={() => update('wasteMargin', w)}
              className={
                'rounded-lg border px-4 py-2 text-sm font-semibold transition-all ' +
                (input.wasteMargin === w
                  ? 'border-brand-purple bg-brand-purple text-white'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-300')
              }
            >
              {w}%
            </button>
          ))}
        </div>
        {errors.wasteMargin && <span className="mt-1 block text-xs text-red-600">{errors.wasteMargin}</span>}
      </div>
    </div>
  );
}

function ResultCard({
  result,
  input,
  paintTypeName,
  onAgain,
  onStartOver,
  onSave: _onSave,
  onExport: _onExport,
  onShare: _onShare,
  onAskAi: _onAskAi,
  calcDefaults,
}: {
  result: CalculatorResult;
  input: CalculatorInput;
  paintTypeName: string;
  onAgain: () => void;
  onStartOver: () => void;
  onSave?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onAskAi?: () => void;
  calcDefaults: any;
}) {
  return (
    <div className="mt-8 card overflow-hidden dark:border-white/5 animate-fade-in-up dark:border-white/5">
      <div className="relative bg-gradient-to-br from-brand-navy to-brand-purple p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-1/2 -right-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
        </div>
        <div className="relative flex items-center gap-2 text-accent-green">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">Your estimate</span>
        </div>
        <p className="relative mt-3 text-sm text-white/60">
          {input.projectType} project · {input.coats} coat{input.coats > 1 ? 's' : ''} · {paintTypeName}
          {input.wasteMargin > 0 && ` · ${input.wasteMargin}% waste margin`}
        </p>
        <p className="relative mt-1 text-4xl font-bold sm:text-5xl animate-count-glow">{formatNumber(result.adjustedLiters, 1)} L</p>
        <p className="relative mt-1 text-sm text-white/60">estimated paint required (incl. waste margin)</p>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8 dark:bg-brand-navy-mid">
        <Stat label="Paintable area" value={`${formatNumber(result.paintableArea)} m²`} countValue={result.paintableArea} suffix=" m²" />
        <Stat label="Paint type" value={paintTypeName} />
        <Stat label="Coverage rate" value={`${formatNumber(result.coverageRate, 1)} m²/L per coat`} countValue={result.coverageRate} decimals={1} suffix=" m²/L" />
        <Stat label="Base paint required" value={`${formatNumber(result.paintRequiredLiters, 1)} L`} countValue={result.paintRequiredLiters} decimals={1} suffix=" L" />
        {input.wasteMargin > 0 && (
          <Stat label="After waste margin" value={`${formatNumber(result.adjustedLiters, 1)} L`} countValue={result.adjustedLiters} decimals={1} suffix=" L" />
        )}
        <Stat label="Total to purchase" value={`${formatNumber(result.totalRecommendedLiters, 1)} L`} countValue={result.totalRecommendedLiters} decimals={1} suffix=" L" highlight />
      </div>

      <div className="border-t border-neutral-100 px-6 py-4 sm:px-8 dark:border-white/5">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Recommended containers</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {result.recommendedContainers.map((c, i) => (
            <span key={i} className="rounded-lg border border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-white/5 px-3 py-1.5 text-sm font-semibold text-brand-navy dark:text-white">
              {c.count} × {c.size} L
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-neutral-100 bg-neutral-50 px-6 py-4 text-xs text-neutral-500 sm:px-8 dark:border-white/5 dark:bg-white/5 dark:text-neutral-400">
        Wall area: {formatNumber(result.wallArea)} m²
        {result.ceilingArea > 0 && ` · Ceiling: ${formatNumber(result.ceilingArea)} m²`}
        {result.doorArea > 0 && ` · Doors: ${formatNumber(result.doorArea)} m²`}
        {result.windowArea > 0 && ` · Windows: ${formatNumber(result.windowArea)} m²`}
        <br />
        Coverage ~{formatNumber(result.coverageRate, 1)} m² per liter per coat. Final amounts vary by surface texture,
        application method, and product.
      </div>

      {/* Find Near Me */}
      <div className="px-6 py-4 sm:px-8">
        <CalculatorNearMe
          tradeSlug="painting"
          materialName={paintTypeName}
          projectType="painting"
        />
      </div>

      <div className="px-6 pb-2 sm:px-8">
        <HowCalculatedSection
          methodologyText={(calcDefaults.howCalculatedText as string) || ''}
          assumptions={[
            { label: 'Coverage rate', value: `${formatNumber(result.coverageRate, 1)} m²/L per coat` },
            { label: 'Coats', value: `${input.coats}` },
            { label: 'Waste margin', value: `${input.wasteMargin}%` },
            { label: 'Container sizes', value: `${(calcDefaults.containerSizes as number[])?.join(', ') ?? '1, 4, 20'} L` },
            { label: 'Door dimensions', value: `${calcDefaults.doorWidthM}m × ${calcDefaults.doorHeightM}m` },
            { label: 'Window dimensions', value: `${calcDefaults.windowWidthM}m × ${calcDefaults.windowHeightM}m` },
          ]}
        />
        <EstimateDisclaimer text={calcDefaults.estimateDisclaimer} />
        <ReportCalculationIssue
          calculatorType="painting"
          userInput={{ projectType: input.projectType, length: input.length, width: input.width, wallHeight: input.wallHeight, coats: input.coats, unit: input.unit }}
          actualResult={{ paintRequiredLiters: result.paintRequiredLiters, adjustedLiters: result.adjustedLiters, totalRecommendedLiters: result.totalRecommendedLiters }}
        />
      </div>

      <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <button type="button" onClick={onAgain} className="btn-secondary press-scale">
          <RotateCcw className="h-4 w-4" />
          Calculate Again
        </button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onStartOver} className="btn-secondary press-scale">
            Start Over
          </button>
          <Link
            to="/cost-estimator"
            state={{
              projectType: input.projectType,
              paintableArea: result.paintableArea,
              paintLiters: result.adjustedLiters,
              coats: input.coats,
              paintType: input.paintType,
              paintTypeName,
              recommendedContainers: result.recommendedContainers,
              totalRecommendedLiters: result.totalRecommendedLiters,
            }}
            className="btn-primary press-scale group"
          >
            Continue to Cost Estimate
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, countValue, decimals = 0, suffix, highlight }: { label: string; value: string; countValue?: number; decimals?: number; suffix?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 transition-all ${highlight ? 'stat-card-highlight' : 'stat-card'}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{label}</p>
      <p className={`mt-1.5 text-xl font-bold tabular-nums ${highlight ? 'text-brand-purple dark:text-brand-purple-lighter' : 'text-brand-navy dark:text-white'}`}>
        {countValue !== undefined ? <CountUp value={countValue} decimals={decimals} suffix={suffix} /> : value}
      </p>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={'relative h-5 w-9 shrink-0 rounded-full transition-colors ' + (checked ? 'bg-accent-green' : 'bg-neutral-300')}
      aria-pressed={checked}
    >
      <span className={'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform dark:bg-brand-navy-mid ' + (checked ? 'translate-x-4' : 'translate-x-0.5')} />
    </button>
  );
}

function Field({
  label,
  suffix,
  hint,
  error,
  children,
}: {
  label: string;
  suffix?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
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
