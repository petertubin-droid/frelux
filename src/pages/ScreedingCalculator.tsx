import { useState, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Home, RectangleHorizontal, RotateCcw, ArrowRight, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { calculateScreedingArea, validateScreedingInput } from '@/lib/utils';
import { track } from '@/lib/analytics';
import { logAnalyticsEvent } from '@/lib/queries';
import { formatNumber } from '@/lib/utils';
import {
  DEFAULT_DOOR_WIDTH_M,
  DEFAULT_DOOR_HEIGHT_M,
  DEFAULT_WINDOW_WIDTH_M,
  DEFAULT_WINDOW_HEIGHT_M,
} from '@/lib/utils';
import type { ScreedingCalcInput, ScreedingCalcResult, Unit, OpeningDimensions } from '@/types';
import { useSeo } from '@/lib/seo';
import SaveTemplateButton from '@/components/templates/SaveTemplateButton';
import LoadTemplateButton from '@/components/templates/LoadTemplateButton';
import { useTemplateLoader } from "@/lib/useTemplateLoader";
import type { DbCalculatorTemplate } from '@/types/database';
import { trackCalculation } from '@/lib/achievements';
import { trackRecentTool } from '@/lib/smart-defaults';

import { FaqSection, RelatedTools, CALC_LINKS } from '@/components/seo/SeoSections';
import { ScreedingCalculatorSeo } from '@/components/seo/SeoContent';
const defaultDoorDims: OpeningDimensions = { width: DEFAULT_DOOR_WIDTH_M, height: DEFAULT_DOOR_HEIGHT_M };
const defaultWindowDims: OpeningDimensions = { width: DEFAULT_WINDOW_WIDTH_M, height: DEFAULT_WINDOW_HEIGHT_M };

export default function ScreedingCalculator() {
  useSeo({
    title: 'Wall Screeding Calculator: How Much Screeding Do I Need?',
    description:
      'Free wall screeding calculator. Enter your room or wall dimensions, doors, and windows to calculate the exact wall area that needs screeding.',
    canonicalPath: '/screeding-calculator',
    ogType: 'website',
    keywords: 'screeding calculator, wall screeding, screeding area calculator, wall preparation, cement screed',
    structuredDataArray: [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'FRELUX Wall Screeding Calculator',
        applicationCategory: 'CalculatorApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxpaintcalc.com' },
          { '@type': 'ListItem', position: 2, name: 'Screeding Calculator', item: 'https://freluxpaintcalc.com/screeding-calculator' },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'What is wall screeding?', acceptedAnswer: { '@type': 'Answer', text: 'Wall screeding is the process of smoothing wall surfaces with a cement-based mixture before painting.' } },
          { '@type': 'Question', name: 'How do I calculate screeding area?', acceptedAnswer: { '@type': 'Answer', text: 'Measure the length and height of each wall, then subtract the area of doors and windows. The calculator does this automatically.' } },
        ],
      },
    ],
  });

  useEffect(() => { trackRecentTool('/screeding-calculator', 'Screeding Calculator', 'Layers'); });
  const [result, setResult] = useState<ScreedingCalcResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [input, setInput] = useState<ScreedingCalcInput>({
    method: 'full_room',
    roomLength: 0,
    roomWidth: 0,
    wallWidth: 0,
    wallCount: 1,
    wallHeight: 0,
    doors: 0,
    doorDims: defaultDoorDims,
    windows: 0,
    windowDims: defaultWindowDims,
    unit: 'meters',
  });

  const { templateData: loadedTemplate } = useTemplateLoader();
  useEffect(() => {
    if (loadedTemplate?.input_data) {
      setInput(loadedTemplate.input_data as unknown as ScreedingCalcInput);
    }
  }, [loadedTemplate]);
  useEffect(() => {
    track('screeding_calculator_opened', {});
    logAnalyticsEvent('screeding_calculator_opened', {});
  }, []);

  function update<K extends keyof ScreedingCalcInput>(key: K, value: ScreedingCalcInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  }

  function compute() {
    const e = validateScreedingInput(input);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    const r = calculateScreedingArea(input);
    trackCalculation('screeding');
    setResult(r);
    track('screeding_calculation_completed', { method: r.method, netArea: r.netScreedingArea });
    logAnalyticsEvent('screeding_calculation_completed', { method: r.method, netArea: r.netScreedingArea });
  }

  function startOver() {
    setResult(null);
    setInput({
      method: 'full_room',
      roomLength: 0,
      roomWidth: 0,
      wallWidth: 0,
      wallCount: 1,
      wallHeight: 0,
      doors: 0,
      doorDims: defaultDoorDims,
      windows: 0,
      windowDims: defaultWindowDims,
      unit: 'meters',
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Tool"
        title="Wall Screeding Calculator"
        subtitle="Calculate the exact wall surface area that needs screeding, with door and window openings deducted."
        breadcrumbs={[{ label: 'Screeding Calculator' }]}
        useCalcTitle
      />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <LoadTemplateButton calculatorType="screeding" onLoad={(t) => setInput(t.input_data as unknown as ScreedingCalcInput)} />
          <SaveTemplateButton calculatorType="screeding" inputData={input as unknown as Record<string, unknown>} defaultName={`${input.method === "full_room" ? `${input.roomLength}×${input.roomWidth}` : `${input.wallWidth}×${input.wallCount} walls`} Screeding`} />
        </div>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {!result && (
          <div className="card p-6 sm:p-8">
            {/* Method selection */}
            <h2 className="text-lg font-bold text-brand-navy dark:text-white">Choose calculation method</h2>
            <p className="mt-1 text-sm text-neutral-500">Select how you want to measure your walls.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => update('method', 'full_room')}
                className={
                  'flex items-start gap-3 rounded-lg border p-4 text-left transition-all ' +
                  (input.method === 'full_room' ? 'border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20' : 'border-neutral-200 hover:border-neutral-300')
                }
              >
                <span className={'inline-flex h-10 w-10 items-center justify-center rounded-lg ' + (input.method === 'full_room' ? 'bg-brand-purple text-white' : 'bg-neutral-100 text-neutral-600')}>
                  <Home className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-brand-navy dark:text-white">Full Room</span>
                  <span className="block text-xs text-neutral-500">Measure all four walls using room length and width.</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => update('method', 'individual_wall')}
                className={
                  'flex items-start gap-3 rounded-lg border p-4 text-left transition-all ' +
                  (input.method === 'individual_wall' ? 'border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20' : 'border-neutral-200 hover:border-neutral-300')
                }
              >
                <span className={'inline-flex h-10 w-10 items-center justify-center rounded-lg ' + (input.method === 'individual_wall' ? 'bg-brand-purple text-white' : 'bg-neutral-100 text-neutral-600')}>
                  <RectangleHorizontal className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-brand-navy dark:text-white">Individual Wall</span>
                  <span className="block text-xs text-neutral-500">Measure one wall and specify how many similar walls.</span>
                </span>
              </button>
            </div>

            {/* Unit toggle */}
            <div className="mt-6">
              <div className="inline-flex rounded-lg border border-neutral-200 p-1">
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
            </div>

            {/* Dimensions */}
            <div className="mt-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500">Dimensions</h3>
              {input.method === 'full_room' ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <Field label="Room length" suffix={input.unit === 'meters' ? 'm' : 'ft'} error={errors.roomLength}>
                    <input type="number" min={0} step="0.01" value={input.roomLength || ''} onChange={(e) => update('roomLength', Number(e.target.value))} className="input-field" placeholder="0.00" />
                  </Field>
                  <Field label="Room width (Optional if not applicable)" suffix={input.unit === 'meters' ? 'm' : 'ft'} hint="Leave blank if only one pair of walls needs screeding">
                    <input type="number" min={0} step="0.01" value={input.roomWidth || ''} onChange={(e) => update('roomWidth', Number(e.target.value))} className="input-field" placeholder="0.00" />
                  </Field>
                  <Field label="Wall height" suffix={input.unit === 'meters' ? 'm' : 'ft'} error={errors.wallHeight}>
                    <input type="number" min={0} step="0.01" value={input.wallHeight || ''} onChange={(e) => update('wallHeight', Number(e.target.value))} className="input-field" placeholder="0.00" />
                  </Field>
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <Field label="Wall width" suffix={input.unit === 'meters' ? 'm' : 'ft'} error={errors.wallWidth}>
                    <input type="number" min={0} step="0.01" value={input.wallWidth || ''} onChange={(e) => update('wallWidth', Number(e.target.value))} className="input-field" placeholder="0.00" />
                  </Field>
                  <Field label="Number of similar walls" error={errors.wallCount}>
                    <input type="number" min={1} value={input.wallCount} onChange={(e) => update('wallCount', Number(e.target.value))} className="input-field" placeholder="1" />
                  </Field>
                  <Field label="Wall height" suffix={input.unit === 'meters' ? 'm' : 'ft'} error={errors.wallHeight}>
                    <input type="number" min={0} step="0.01" value={input.wallHeight || ''} onChange={(e) => update('wallHeight', Number(e.target.value))} className="input-field" placeholder="0.00" />
                  </Field>
                </div>
              )}
            </div>

            {/* Openings */}
            <OpeningsSection input={input} update={update} errors={errors} />

            {Object.keys(errors).length > 0 && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Please fix the errors above before calculating.</p>
              </div>
            )}

            <button type="button" onClick={compute} className="btn-primary mt-6 w-full sm:w-auto">
              Calculate Screeding Area
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {result && (
          <ScreedingResultCard
            result={result}
            input={input}
            onAgain={() => setResult(null)}
            onStartOver={startOver}
          />
        )}
      </div>

      <ScreedingCalculatorSeo />

      <FaqSection faqs={[
        { question: "What is wall screeding?", answer: <span>Wall screeding is the process of smoothing wall surfaces with a cement-based mixture before painting. It creates a flat, even surface for a professional paint finish.</span> },
        { question: "How do I calculate screeding area?", answer: <span>Measure the length and height of each wall, then subtract the area of doors and windows. The calculator does this automatically when you enter your room dimensions.</span> },
        { question: "Do I need to screed before painting?", answer: <span>Screeding is recommended for uneven or rough walls. It provides a smooth surface that ensures better paint adhesion and a more professional finish.</span> },
      ]} />

      <RelatedTools links={[
        CALC_LINKS.screedingCost,
        CALC_LINKS.paintCalculator,
        CALC_LINKS.popCeilingCalc,
        CALC_LINKS.tileCalc,
      ]} />
    </>
  );
}

function OpeningsSection({
  input,
  update,
  errors,
}: {
  input: ScreedingCalcInput;
  update: <K extends keyof ScreedingCalcInput>(key: K, value: ScreedingCalcInput[K]) => void;
  errors: Record<string, string>;
}) {
  const [showDoorDims, setShowDoorDims] = useState(false);
  const [showWindowDims, setShowWindowDims] = useState(false);

  function updateDoorDim(key: keyof OpeningDimensions, value: number) {
    update('doorDims', { ...input.doorDims, [key]: value });
  }
  function updateWindowDim(key: keyof OpeningDimensions, value: number) {
    update('windowDims', { ...input.windowDims, [key]: value });
  }

  return (
    <div className="mt-6 border-t border-neutral-100 pt-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500">Doors & Windows</h3>
      <p className="mt-1 text-xs text-neutral-400">These openings are automatically subtracted from the wall area.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
    </div>
  );
}

function ScreedingResultCard({
  result,
  input,
  onAgain,
  onStartOver,
}: {
  result: ScreedingCalcResult;
  input: ScreedingCalcInput;
  onAgain: () => void;
  onStartOver: () => void;
}) {
  return (
    <div className="mt-8 card overflow-hidden">
      <div className="bg-brand-navy p-6 text-white sm:p-8">
        <div className="flex items-center gap-2 text-accent-green">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">Your screeding area</span>
        </div>
        <p className="mt-3 text-sm text-white/60">
          {input.method === 'full_room' ? 'Full room' : 'Individual wall'} project · {input.unit}
        </p>
        <p className="calc-result mt-1 text-4xl font-bold sm:text-5xl">{formatNumber(result.netScreedingArea)} m²</p>
        <p className="mt-1 text-sm text-white/60">net wall surface requiring screeding</p>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
        <Stat label="Gross wall area" value={`${formatNumber(result.grossWallArea)} m²`} />
        <Stat label="Door area" value={`${formatNumber(result.doorArea)} m²`} />
        <Stat label="Window area" value={`${formatNumber(result.windowArea)} m²`} />
        <Stat label="Total deduction" value={`${formatNumber(result.totalDeduction)} m²`} />
      </div>

      <div className="border-t border-neutral-100 bg-neutral-50 px-6 py-4 text-xs text-neutral-500 sm:px-8">
        Net screeding area = Gross wall area − Door area − Window area.
        Actual coverage may vary depending on surface texture and application method.
      </div>

      <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <button type="button" onClick={onAgain} className="btn-secondary">
          <RotateCcw className="h-4 w-4" />
          Calculate Again
        </button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onStartOver} className="btn-secondary">
            Start Over
          </button>
          <Link
            to="/screeding-cost-estimator"
            state={{
              netScreedingArea: result.netScreedingArea,
              method: result.method,
            }}
            className="btn-primary"
          >
            Continue to Cost Estimate
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{label}</p>
      <p className="mt-1.5 text-xl font-bold text-brand-navy dark:text-white">{value}</p>
    </div>
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
