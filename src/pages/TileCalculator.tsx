import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, ArrowRight, CheckCircle2, AlertCircle, Loader2, Grid3x3 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { calculateTile } from '@/lib/pop-tile-calc';
import { track } from '@/lib/analytics';
import { logAnalyticsEvent, fetchTileSizes, fetchTileMaterials, fetchSiteSettings, saveUserProject } from '@/lib/queries';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useSeo } from '@/lib/seo';
import { useCalcDefaults } from '@/lib/use-calc-defaults';
import { HowCalculatedSection, EstimateDisclaimer, ReportCalculationIssue } from '@/components/calculators';
import CalculatorNearMe from '@/components/calculators/CalculatorNearMe';
import { saveEstimateHistory } from '@/lib/crm';
import ProConnectCTA from '@/components/pro-connect/ProConnectCTA';
// Engine integration
import { useEngineFeatures } from '@/lib/measurement';
import {
  EngineConfidenceBadge,
  EngineConfidenceDetail,
  EngineExplanationPanel,
  EngineAlreadyHaveInput,
  EngineWasteSelector,
  EngineMaterialSummaryCard,
} from '@/components/engine';
import { useTemplateLoader } from "@/lib/useTemplateLoader";
import type { TileCalcInput, TileCalcResult, Unit } from '@/types';
import type { DbTileSize, DbTileMaterial, DbSiteSettings } from '@/types/database';
import SaveTemplateButton from '@/components/templates/SaveTemplateButton';
import LoadTemplateButton from '@/components/templates/LoadTemplateButton';
import { trackCalculation } from '@/lib/achievements';
import { trackCalculationWithRewards } from '@/lib/rewards-integration';
import { trackRecentTool } from '@/lib/smart-defaults';

import { FaqSection, RelatedTools, CALC_LINKS } from '@/components/seo/SeoSections';
import { TileCalculatorSeo } from '@/components/seo/SeoContent';
import RelatedToolsLinks from '@/components/ui/RelatedToolsLinks';
export default function TileCalculator() {
  const { defaults: calcDefaults } = useCalcDefaults('tile');
  useSeo({
    title: 'Tile Calculator: How Many Tiles Do I Need?',
    description: 'Free tile calculator. Enter your floor or wall dimensions and tile size to calculate tile quantity, boxes, adhesive, grout, and labour cost.',
    canonicalPath: '/tile-calculator',
    ogType: 'website',
    keywords: 'tile calculator, how many tiles do i need, tile quantity calculator, floor tile calculator, wall tile calculator',
    structuredDataArray: [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'FRELUX Tile Calculator',
        applicationCategory: 'CalculatorApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' },
          { '@type': 'ListItem', position: 2, name: 'Tile Calculator', item: 'https://freluxtools.netlify.app/tile-calculator' },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'How do I calculate how many tiles I need?', acceptedAnswer: { '@type': 'Answer', text: 'Measure the area to be tiled and divide by the area of one tile. Add 10–15% for cuts and breakage.' } },
          { '@type': 'Question', name: 'How much extra tile should I buy?', acceptedAnswer: { '@type': 'Answer', text: 'Buy 10–15% more tiles than calculated to cover cuts, breakage, and future repairs.' } },
        ],
      },
    ],
  });

  const { user } = useAuth();
const mountedRef = useRef(true);
    useEffect(() => { trackRecentTool('/tile-calculator', 'Tile Calculator', 'Grid3x3'); 
    return () => { mountedRef.current = false; };
  });
  const [tileSizes, setTileSizes] = useState<DbTileSize[]>([]);
  const [tileMaterials, setTileMaterials] = useState<DbTileMaterial[]>([]);
  const [settings, setSettings] = useState<DbSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<TileCalcResult | null>(null);
  // Engine features
  const engine = useEngineFeatures({ calculatorType: 'tile' });
  const [alreadyHave, setAlreadyHave] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const currencySymbol = settings?.default_currency_symbol ?? '₦';
  const currency = settings?.default_currency ?? 'NGN';

  const [input, setInput] = useState<TileCalcInput>({
    surfaceType: 'floor',
    method: 'adhesive',
    length: 0,
    width: 0,
    height: 0,
    tileWidthMm: 300,
    tileHeightMm: 300,
    tilesPerBox: 11,
    tilePricePerBox: 12000,
    adhesiveCoverageRate: 5,
    adhesivePricePerBag: 4500,
    cementCoverageRate: 5,
    cementPricePerBag: 4500,
    cementPackageSize: 1,
    sandCoverageRate: 5,
    sandPricePerBag: 3000,
    sandPackageSize: 1,
    groutCoverageRate: 20,
    groutPricePerKg: 1500,
    spacerCoverageRate: 50,
    spacerPricePerPack: 500,
    spacerPackageSize: 1,
    wasteMargin: 10,
    labourRatePerSqm: 2000,
    unit: 'meters',
  });
  const { templateData: loadedTemplate } = useTemplateLoader();
  useEffect(() => {
    if (loadedTemplate?.input_data) {
      setInput(loadedTemplate.input_data as unknown as TileCalcInput);
    }
  }, [loadedTemplate]);

  useEffect(() => {
    async function load() {
      const [sizesRes, matRes, settingsRes] = await Promise.all([
        fetchTileSizes(),
        fetchTileMaterials(),
        fetchSiteSettings(),
      ]);
      setTileSizes(sizesRes.data);
      setTileMaterials(matRes.data);
      setSettings(settingsRes.data);

      // Auto-fill material prices from seeded data
      const adhesive = matRes.data.find((m) => m.category === 'adhesive');
      if (adhesive) {
        setInput((prev) => ({
          ...prev,
          adhesiveCoverageRate: Number(adhesive.coverage_rate),
          adhesivePricePerBag: Number(adhesive.unit_price),
        }));
      }
      const cement = matRes.data.find((m) => m.category === 'cement');
      if (cement) {
        setInput((prev) => ({
          ...prev,
          cementCoverageRate: Number(cement.coverage_rate),
          cementPricePerBag: Number(cement.unit_price),
          cementPackageSize: Number(cement.package_size) || 1,
        }));
      }
      const sand = matRes.data.find((m) => m.category === 'sand');
      if (sand) {
        setInput((prev) => ({
          ...prev,
          sandCoverageRate: Number(sand.coverage_rate),
          sandPricePerBag: Number(sand.unit_price),
          sandPackageSize: Number(sand.package_size) || 1,
        }));
      }
      const grout = matRes.data.find((m) => m.category === 'grout');
      if (grout) {
        setInput((prev) => ({
          ...prev,
          groutCoverageRate: Number(grout.coverage_rate),
          groutPricePerKg: Number(grout.unit_price),
        }));
      }
      const spacer = matRes.data.find((m) => m.category === 'spacer');
      if (spacer) {
        setInput((prev) => ({
          ...prev,
          spacerCoverageRate: Number(spacer.coverage_rate),
          spacerPricePerPack: Number(spacer.unit_price),
          spacerPackageSize: Number(spacer.package_size) || 1,
        }));
      }
      const labour = matRes.data.find((m) => m.category === 'labour');
      if (labour) {
        setInput((prev) => ({ ...prev, labourRatePerSqm: Number(labour.labour_rate_per_sqm) }));
      }

      setLoading(false);
    }
    load();
  }, []);

  function update<K extends keyof TileCalcInput>(key: K, value: TileCalcInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  }

  function onTileSizeChange(sizeId: string) {
    const size = tileSizes.find((s) => s.id === sizeId);
    if (size) {
      setInput((prev) => ({
        ...prev,
        tileWidthMm: size.width_mm,
        tileHeightMm: size.height_mm,
        tilesPerBox: size.tiles_per_box,
      }));
    }
  }

  function compute() {
    const e: Record<string, string> = {};
    if (input.length <= 0) e.length = 'Enter a valid length';
    if (input.surfaceType === 'floor' && input.width <= 0) e.width = 'Enter a valid width';
    if (input.surfaceType === 'wall' && input.height <= 0) e.height = 'Enter a valid height';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const r = calculateTile(input, tileMaterials, currency, currencySymbol);
    trackCalculation('tile');
    trackCalculationWithRewards('tile', 'Tile Calculator');
    setResult(r);
    track('tile_calculated', { surfaceType: input.surfaceType, area: r.surfaceArea, tiles: r.tilesNeeded });
    void saveEstimateHistory(user?.id ?? null, { calculator_type: 'tile', project_name: `Tile: ${input.surfaceType}`, input_data: input as unknown as Record<string, unknown>, result_data: r as unknown as Record<string, unknown> }).catch(() => {});
    logAnalyticsEvent('tile_calculated', { surfaceType: input.surfaceType, area: r.surfaceArea, tiles: r.tilesNeeded });
  }

  function startOver() {
    setResult(null);
    setInput({ ...input, length: 0, width: 0, height: 0 });
  }

  async function handleSave() {
    if (!user || !result) return;
    setSaving(true);
    const { error } = await saveUserProject('Tile Calculation', 'tile', { ...input, result });
    setSaveMsg(error ? `Save failed: ${error}` : 'Saved to your projects');
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  }

  if (loading) {
    return (
      <>
        <PageHeader eyebrow="Calculate" title="Tile Calculator" subtitle="Calculate tile quantities, adhesive, and grout." breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Calculators', path: '/calculators' }, { label: 'Tile Calculator' }]} />
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Calculate" title="Tile Calculator" subtitle="Calculate tile quantity, boxes, adhesive, grout, and labour cost for your tiling project." breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Calculators', path: '/calculators' }, { label: 'Tile Calculator' }]} />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <LoadTemplateButton calculatorType="tile" onLoad={(t) => setInput(t.input_data as unknown as TileCalcInput)} />
          <SaveTemplateButton calculatorType="tile" inputData={input as unknown as Record<string, unknown>} defaultName={`${input.length}×${input.width} ${input.surfaceType}`} />
        </div>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {!result && (
          <div className="card p-6 sm:p-8 dark:border-white/5 dark:bg-brand-navy-mid">
            {/* Surface type */}
            <h2 className="text-lg font-bold text-brand-navy dark:text-white">Surface type</h2>
            <p className="mt-1 text-sm text-neutral-500">Are you tiling a floor or a wall?</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {([
                { value: 'floor', label: 'Floor', desc: 'Tile a floor surface' },
                { value: 'wall', label: 'Wall', desc: 'Tile a wall surface' },
              ] as const).map((s) => {
                const selected = input.surfaceType === s.value;
                return (
                  <button key={s.value} type="button" onClick={() => update('surfaceType', s.value)}
                    className={'flex items-start gap-3 rounded-lg border p-4 text-left transition-all ' + (selected ? 'border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20' : 'border-neutral-200 hover:border-neutral-300')}>
                    <span className={'inline-flex h-10 w-10 items-center justify-center rounded-lg ' + (selected ? 'bg-brand-purple text-white' : 'bg-neutral-100 text-neutral-600')}>
                      <Grid3x3 className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-brand-navy dark:text-white">{s.label}</span>
                      <span className="block text-xs text-neutral-500">{s.desc}</span>
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
              <Field label={input.surfaceType === 'floor' ? 'Floor length' : 'Wall length'} suffix={input.unit === 'meters' ? 'm' : 'ft'} error={errors.length}>
                <input type="number" min={0} step="0.01" value={input.length || ''} onChange={(e) => update('length', Number(e.target.value))} className="input-field" placeholder="0.00" />
              </Field>
              {input.surfaceType === 'floor' ? (
                <Field label="Floor width" suffix={input.unit === 'meters' ? 'm' : 'ft'} error={errors.width}>
                  <input type="number" min={0} step="0.01" value={input.width || ''} onChange={(e) => update('width', Number(e.target.value))} className="input-field" placeholder="0.00" />
                </Field>
              ) : (
                <Field label="Wall height" suffix={input.unit === 'meters' ? 'm' : 'ft'} error={errors.height}>
                  <input type="number" min={0} step="0.01" value={input.height || ''} onChange={(e) => update('height', Number(e.target.value))} className="input-field" placeholder="0.00" />
                </Field>
              )}
            </div>

            {/* Tile size */}
            <div className="mt-6">
              <Field label="Tile size" hint="Select a standard size or enter custom dimensions">
                <select onChange={(e) => onTileSizeChange(e.target.value)} className="input-field" defaultValue="">
                  <option value="">Custom size</option>
                  {tileSizes.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.tiles_per_box}/box)</option>
                  ))}
                </select>
              </Field>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Tile width (mm)">
                  <input type="number" min={1} value={input.tileWidthMm} onChange={(e) => update('tileWidthMm', Number(e.target.value))} className="input-field" />
                </Field>
                <Field label="Tile height (mm)">
                  <input type="number" min={1} value={input.tileHeightMm} onChange={(e) => update('tileHeightMm', Number(e.target.value))} className="input-field" />
                </Field>
              </div>
            </div>

            {/* Pricing */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Tiles per box">
                <input type="number" min={1} value={input.tilesPerBox} onChange={(e) => update('tilesPerBox', Number(e.target.value))} className="input-field" />
              </Field>
              <Field label={`Price per box (${currencySymbol})`}>
                <input type="number" min={0} value={input.tilePricePerBox || ''} onChange={(e) => update('tilePricePerBox', Number(e.target.value))} className="input-field" placeholder="0" />
              </Field>
            </div>

            {/* Installation method */}
            <div className="mt-6">
              <h2 className="text-lg font-bold text-brand-navy">Installation method</h2>
              <p className="mt-1 text-sm text-neutral-500">Choose how the tiles will be installed.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {([
                  { value: 'adhesive', label: 'Tile Adhesive Method', desc: 'Pre-mixed adhesive (recommended)' },
                  { value: 'traditional', label: 'Traditional Method', desc: 'Cement + sharp sand mix' },
                ] as const).map((m) => {
                  const selected = input.method === m.value;
                  return (
                    <button key={m.value} type="button" onClick={() => update('method', m.value)}
                      className={'flex items-start gap-3 rounded-lg border p-4 text-left transition-all ' + (selected ? 'border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20' : 'border-neutral-200 hover:border-neutral-300')}>
                      <span className={'inline-flex h-10 w-10 items-center justify-center rounded-lg ' + (selected ? 'bg-brand-purple text-white' : 'bg-neutral-100 text-neutral-600')}>
                        <Grid3x3 className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-brand-navy">{m.label}</span>
                        <span className="block text-xs text-neutral-500">{m.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Material inputs based on method */}
            {input.method === 'adhesive' && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label={`Adhesive price per bag (${currencySymbol})`}>
                  <input type="number" min={0} value={input.adhesivePricePerBag || ''} onChange={(e) => update('adhesivePricePerBag', Number(e.target.value))} className="input-field" placeholder="0" />
                </Field>
                <Field label="Adhesive coverage (m²/bag)">
                  <input type="number" min={0} step="0.1" value={input.adhesiveCoverageRate || ''} onChange={(e) => update('adhesiveCoverageRate', Number(e.target.value))} className="input-field" placeholder="0" />
                </Field>
              </div>
            )}

            {input.method === 'traditional' && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label={`Cement price per bag (${currencySymbol})`}>
                  <input type="number" min={0} value={input.cementPricePerBag || ''} onChange={(e) => update('cementPricePerBag', Number(e.target.value))} className="input-field" placeholder="0" />
                </Field>
                <Field label="Cement coverage (m²/bag)">
                  <input type="number" min={0} step="0.1" value={input.cementCoverageRate || ''} onChange={(e) => update('cementCoverageRate', Number(e.target.value))} className="input-field" placeholder="0" />
                </Field>
                <Field label={`Sharp sand price per bag (${currencySymbol})`}>
                  <input type="number" min={0} value={input.sandPricePerBag || ''} onChange={(e) => update('sandPricePerBag', Number(e.target.value))} className="input-field" placeholder="0" />
                </Field>
                <Field label="Sharp sand coverage (m²/bag)">
                  <input type="number" min={0} step="0.1" value={input.sandCoverageRate || ''} onChange={(e) => update('sandCoverageRate', Number(e.target.value))} className="input-field" placeholder="0" />
                </Field>
              </div>
            )}

            {/* Grout + Spacers (always shown) */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label={`Grout price per kg (${currencySymbol})`}>
                <input type="number" min={0} value={input.groutPricePerKg || ''} onChange={(e) => update('groutPricePerKg', Number(e.target.value))} className="input-field" placeholder="0" />
              </Field>
              <Field label="Grout coverage (m²/kg)">
                <input type="number" min={0} step="0.1" value={input.groutCoverageRate || ''} onChange={(e) => update('groutCoverageRate', Number(e.target.value))} className="input-field" placeholder="0" />
              </Field>
              <Field label={`Tile spacers price per pack (${currencySymbol})`}>
                <input type="number" min={0} value={input.spacerPricePerPack || ''} onChange={(e) => update('spacerPricePerPack', Number(e.target.value))} className="input-field" placeholder="0" />
              </Field>
              <Field label="Spacer coverage (m²/pack)">
                <input type="number" min={0} step="0.1" value={input.spacerCoverageRate || ''} onChange={(e) => update('spacerCoverageRate', Number(e.target.value))} className="input-field" placeholder="0" />
              </Field>
            </div>

            {/* Waste margin */}
            <div className="mt-6">
              <span className="block text-sm font-semibold text-neutral-700">Waste / safety margin</span>
              <p className="mt-0.5 text-xs text-neutral-400">Extra tiles added for cuts, breakage, and future repairs.</p>
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
              Calculate Tiles <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {result && (
          <TileResultCard result={result} input={input} currencySymbol={currencySymbol}
            onAgain={() => setResult(null)} onStartOver={startOver}
            user={user} onSave={handleSave} saving={saving} saveMsg={saveMsg}
            calcDefaults={{ howCalculatedText: calcDefaults.howCalculatedText as string || '', estimateDisclaimer: calcDefaults.estimateDisclaimer }} />
        )}
      </div>

      <TileCalculatorSeo />

      <FaqSection faqs={[
        { question: "How do I calculate how many tiles I need?", answer: <span>Measure the area to be tiled and divide by the area of one tile. Add 10–15% for cuts and breakage. The calculator does this automatically and also estimates adhesive and grout.</span> },
        { question: "How much extra tile should I buy?", answer: <span>Buy 10–15% more tiles than the calculated quantity to cover cuts, breakage, and future repairs. The calculator includes a waste factor for this.</span> },
        { question: "Does the calculator work for both floor and wall tiles?", answer: <span>Yes. Select the surface type (floor or wall) and enter your dimensions. The calculator adjusts for the different tile sizes and materials typically used.</span> },
      ]} />

      <RelatedTools links={[
        CALC_LINKS.tileCost,
        CALC_LINKS.paintCalculator,
        CALC_LINKS.screedingCalc,
        CALC_LINKS.popCeilingCalc,
        CALC_LINKS.buildToRoof,
        CALC_LINKS.imageEstimator,
      ]} />
      <ProConnectCTA calculatorType="tile" />
    </>
  );
}

function TileResultCard({ result, input, currencySymbol, onAgain, onStartOver, user, onSave, saving, saveMsg, calcDefaults, engine, alreadyHave, onAlreadyHaveChange }: {
  result: TileCalcResult;
  input: TileCalcInput;
  currencySymbol: string;
  onAgain: () => void;
  onStartOver: () => void;
  user: { email?: string } | null;
  onSave: () => void;
  saving: boolean;
  saveMsg: string;
  calcDefaults: { howCalculatedText: string; estimateDisclaimer: string };
  engine: ReturnType<typeof useEngineFeatures>;
  alreadyHave: number;
  onAlreadyHaveChange: (n: number) => void;
}) {
  return (
    <div className="mt-8 card overflow-hidden dark:border-white/5">
      <div className="relative bg-gradient-to-br from-brand-navy to-brand-purple p-6 text-white sm:p-8">
        <div className="flex items-center gap-2 text-accent-green">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">Your Tile Estimate</span>
        </div>
        <p className="mt-3 text-sm text-white/60">
          {input.surfaceType === 'floor' ? 'Floor' : 'Wall'} tiling · {input.tileWidthMm}×{input.tileHeightMm}mm · {input.wasteMargin}% waste
        </p>
        <p className="calc-result mt-1 text-4xl font-bold sm:text-5xl">{result.boxesNeeded} box(es)</p>
        <p className="mt-1 text-sm text-white/60">{result.tilesNeeded} tiles needed</p>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8 dark:bg-brand-navy-mid">
        <Stat label="Surface area" value={`${formatNumber(result.surfaceArea)} m²`} />
        <Stat label="Tile area" value={`${formatNumber(result.tileArea, 3)} m²`} />
        <Stat label="Tiles needed" value={`${result.tilesNeeded}`} />
        <Stat label="Boxes needed" value={`${result.boxesNeeded}`} />
        {result.method === 'adhesive' && <Stat label="Adhesive needed" value={`${result.adhesiveNeeded} bag(s)`} />}
        {result.method === 'traditional' && <Stat label="Cement needed" value={`${result.cementNeeded} bag(s)`} />}
        {result.method === 'traditional' && <Stat label="Sharp sand needed" value={`${result.sandNeeded} bag(s)`} />}
        <Stat label="Grout needed" value={`${result.groutNeeded} kg`} />
        <Stat label="Tile spacers needed" value={`${result.spacerNeeded} pack(s)`} />
      </div>

      <div className="mt-2 space-y-2 px-6 pb-6 sm:px-8">
        <Row label="Tile cost" value={formatCurrency(result.tileCost, currencySymbol)} />
        {result.method === 'adhesive' && <Row label="Adhesive cost" value={formatCurrency(result.adhesiveCost, currencySymbol)} />}
        {result.method === 'traditional' && <Row label="Cement cost" value={formatCurrency(result.cementCost, currencySymbol)} />}
        {result.method === 'traditional' && <Row label="Sharp sand cost" value={formatCurrency(result.sandCost, currencySymbol)} />}
        <Row label="Grout cost" value={formatCurrency(result.groutCost, currencySymbol)} />
        <Row label="Tile spacers cost" value={formatCurrency(result.spacerCost, currencySymbol)} />
        <Row label="Labour cost" value={formatCurrency(result.labourCost, currencySymbol)} />
        <div className="border-t border-neutral-100 pt-2">
          <Row label="Grand total" value={formatCurrency(result.grandTotal, currencySymbol)} strong />
        </div>
      </div>

      {saveMsg && <p className="px-6 pb-2 text-sm text-brand-purple sm:px-8">{saveMsg}</p>}

      {/* ── Engine Features (Additive) ── */}
      <div className="space-y-3 px-6 pb-4 sm:px-8">
        <div className="flex items-center gap-2">
          <EngineConfidenceBadge result={engine.assessConfidence({
            ruleValid: true,
            inputComplete: true,
            materialSpecComplete: result.tilesNeeded > 0,
            marketPriceAvailable: result.materialCost > 0,
            sourceReliability: 'verified',
            productMatched: result.boxesNeeded > 0,
          })} />
        </div>

        <EngineAlreadyHaveInput
          required={result.boxesNeeded}
          alreadyHave={alreadyHave}
          onAlreadyHaveChange={onAlreadyHaveChange}
          unit="boxes"
        />

        <EngineWasteSelector
          resolution={engine.wasteResolution}
          userWaste={engine.userWaste}
          onUserWasteChange={engine.setUserWaste}
        />

        <EngineExplanationPanel result={engine.buildExplanation({
          subject: 'Tile Calculation',
          resultSummary: `${result.boxesNeeded} boxes needed (${result.tilesNeeded} tiles) for ${formatNumber(result.surfaceArea)} m²`,
          steps: [
            { description: 'Surface area', value: `${formatNumber(result.surfaceArea)} m²` },
            { description: 'Tile area', value: `${formatNumber(result.tileArea, 3)} m²` },
            { description: 'Tiles needed', value: String(result.tilesNeeded) },
            { description: 'Boxes needed', value: String(result.boxesNeeded) },
            { description: 'Waste amount', value: `${result.wasteAmount} tiles` },
            ...(result.method === 'adhesive' ? [{ description: 'Adhesive needed', value: `${result.adhesiveNeeded} bags` }] : []),
            ...(result.method === 'traditional' ? [{ description: 'Cement needed', value: `${result.cementNeeded} bags` }] : []),
            { description: 'Grout needed', value: `${result.groutNeeded} kg` },
            { description: 'Grand total', value: formatCurrency(result.grandTotal, currencySymbol) },
          ],
          notes: [
            `Method: ${result.method}`,
            `Waste margin: ${input.wasteMargin}%`,
          ],
        })} />

        <EngineConfidenceDetail result={engine.assessConfidence({
          ruleValid: true,
          inputComplete: true,
          materialSpecComplete: result.tilesNeeded > 0,
          marketPriceAvailable: result.materialCost > 0,
          sourceReliability: 'verified',
          productMatched: result.boxesNeeded > 0,
        })} />

        <EngineMaterialSummaryCard summary={engine.buildMaterialSummary([
          { materialId: 'tiles', productName: 'Tiles', totalQuantity: result.boxesNeeded, quantityUnit: 'boxes', spaceIds: ['surface'] },
          ...(result.method === 'adhesive' ? [{ materialId: 'adhesive', productName: 'Adhesive', totalQuantity: result.adhesiveNeeded, quantityUnit: 'bags', spaceIds: ['surface'] }] : []),
          ...(result.method === 'traditional' ? [{ materialId: 'cement', productName: 'Cement', totalQuantity: result.cementNeeded, quantityUnit: 'bags', spaceIds: ['surface'] }] : []),
          { materialId: 'grout', productName: 'Grout', totalQuantity: result.groutNeeded, quantityUnit: 'kg', spaceIds: ['surface'] },
        ])} />
      </div>

      <HowCalculatedSection
        methodologyText={calcDefaults.howCalculatedText}
        assumptions={[
          { label: 'Surface type', value: input.surfaceType },
          { label: 'Tile size', value: `${input.tileWidthMm}×${input.tileHeightMm}mm` },
          { label: 'Waste margin', value: `${input.wasteMargin}%` },
          { label: 'Method', value: input.method },
        ]}
      />
      <EstimateDisclaimer text={calcDefaults.estimateDisclaimer} />
      <ReportCalculationIssue
        calculatorType="tile"
        userInput={{ surfaceType: input.surfaceType, tileWidthMm: input.tileWidthMm, tileHeightMm: input.tileHeightMm, wasteMargin: input.wasteMargin, method: input.method }}
        actualResult={{ surfaceArea: result.surfaceArea, tilesNeeded: result.tilesNeeded, boxesNeeded: result.boxesNeeded, grandTotal: result.grandTotal }}
      />

      <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
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
        {/* Post as Job CTA */}
        <div className="mt-4 rounded-xl border border-brand-purple/20 bg-brand-purple/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-brand-navy dark:text-white">Need a pro for this tiling job?</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Post this estimate as a job and get bids from verified tilers near you.</p>
            </div>
            <a
              href={`/marketplace/post?project_type=tiling&budget_min=${Math.round(result.grandTotal * 0.9)}&budget_max=${Math.round(result.grandTotal * 1.2)}&title=Tiling — ${result.surfaceArea.toFixed(1)} m²`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-purple-dark whitespace-nowrap"
            >
              Post as Job
            </a>
          </div>
        </div>

        {/* Find Near Me */}
        <div className="mt-4">
          <CalculatorNearMe
            tradeSlug="tiling"
            materialName="Tiles"
            projectType="tiling"
          />
        </div>

          <Link to="/tile-cost-estimator" state={{ surfaceArea: result.surfaceArea, grandTotal: result.grandTotal, input }}
            className="btn-primary">
            Continue to Cost Estimate <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
        <RelatedToolsLinks />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card dark:border-white/5 dark:bg-brand-navy-mid">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">{label}</p>
      <p className="mt-1.5 text-xl font-bold text-brand-navy dark:text-white dark:text-white">{value}</p>
    </div>
  );
}

function Field({ label, hint, suffix, error, children }: { label: string; hint?: string; suffix?: string; error?: string; children: ReactNode }) {
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
