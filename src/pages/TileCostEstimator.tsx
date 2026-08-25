import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { calculateTile } from '@/lib/pop-tile-calc';
import { calculateLabourCost } from '@/lib/labour';
import LabourCostSection, { useLabourConfig } from '@/components/labour/LabourCostSection';
import { track } from '@/lib/analytics';
import { logAnalyticsEvent, fetchTileSizes, fetchTileMaterials, fetchSiteSettings, saveUserProject } from '@/lib/queries';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useSeo } from '@/lib/seo';
import { useCalcDefaults } from '@/lib/use-calc-defaults';
import { EstimateDisclaimer, ReportCalculationIssue } from '@/components/calculators';
import type { TileCalcInput, TileCalcResult, Unit } from '@/types';
// Engine integration
import { useEngineFeatures } from '@/lib/measurement';
import {
  EngineConfidenceBadge,
  EngineExplanationPanel,
  EngineMaterialSummaryCard,
} from '@/components/engine';
import type { DbTileSize, DbTileMaterial, DbSiteSettings } from '@/types/database';
import { RelatedTools, CALC_LINKS } from '@/components/seo/SeoSections';
import RelatedToolsLinks from '@/components/ui/RelatedToolsLinks';
import { monitoredCalc } from '@/lib/calculator-monitor';

interface PassedState {
  surfaceArea?: number;
  grandTotal?: number;
  input?: Partial<TileCalcInput>;
}

export default function TileCostEstimator() {
  const { defaults: calcDefaults } = useCalcDefaults('tile_cost');
  useSeo({
    title: 'Tile Cost Estimator — Estimate Tile Installation Cost',
    description: 'Estimate the full cost of your tile installation project including tiles, adhesive, grout, labour, and waste.',
    canonicalPath: '/tile-cost-estimator',
    ogType: 'website',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'FRELUX Tile Cost Estimator',
      description: 'Estimate the full cost of your tile installation project including tiles, adhesive, grout, labour, and waste.',
      url: 'https://freluxtools.netlify.app/tile-cost-estimator',
      applicationCategory: 'CalculatorApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' },
    },
  });

  const location = useLocation();
  const passed = (location.state as PassedState | null) ?? {};
  const { user } = useAuth();

  const [, setTileSizes] = useState<DbTileSize[]>([]);
  const [tileMaterials, setTileMaterials] = useState<DbTileMaterial[]>([]);
  const [settings, setSettings] = useState<DbSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<TileCalcResult | null>(null);
  // Engine features
  const engine = useEngineFeatures({ calculatorType: 'tile_cost' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const { config: labourConfig, setConfig: setLabourConfig } = useLabourConfig('tile');

  const [input, setInput] = useState<TileCalcInput>({
    surfaceType: passed.input?.surfaceType ?? 'floor',
    length: passed.input?.length ?? 0,
    width: passed.input?.width ?? 0,
    height: passed.input?.height ?? 0,
    tileWidthMm: passed.input?.tileWidthMm ?? 300,
    tileHeightMm: passed.input?.tileHeightMm ?? 300,
    tilesPerBox: passed.input?.tilesPerBox ?? 11,
    tilePricePerBox: passed.input?.tilePricePerBox ?? 12000,
    adhesiveCoverageRate: passed.input?.adhesiveCoverageRate ?? 5,
    adhesivePricePerBag: passed.input?.adhesivePricePerBag ?? 4500,
    groutCoverageRate: passed.input?.groutCoverageRate ?? 20,
    groutPricePerKg: passed.input?.groutPricePerKg ?? 1500,
    method: passed.input?.method ?? 'adhesive',
    cementCoverageRate: passed.input?.cementCoverageRate ?? 2,
    cementPricePerBag: passed.input?.cementPricePerBag ?? 3500,
    cementPackageSize: passed.input?.cementPackageSize ?? 50,
    sandCoverageRate: passed.input?.sandCoverageRate ?? 0.04,
    sandPricePerBag: passed.input?.sandPricePerBag ?? 1500,
    sandPackageSize: passed.input?.sandPackageSize ?? 25,
    spacerCoverageRate: passed.input?.spacerCoverageRate ?? 10,
    spacerPricePerPack: passed.input?.spacerPricePerPack ?? 500,
    spacerPackageSize: passed.input?.spacerPackageSize ?? 200,
    wasteMargin: passed.input?.wasteMargin ?? 10,
    labourRatePerSqm: passed.input?.labourRatePerSqm ?? 2000,
    unit: passed.input?.unit ?? 'meters',
  });

  const currencySymbol = settings?.default_currency_symbol ?? '₦';
  const currency = settings?.default_currency ?? 'NGN';

const mountedRef = useRef(true);
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

      const adhesive = matRes.data.find((m) => m.category === 'adhesive');
      if (adhesive) {
        setInput((prev) => ({
          ...prev,
          adhesiveCoverageRate: Number(adhesive.coverage_rate),
          adhesivePricePerBag: Number(adhesive.unit_price),
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

      setLoading(false);
    }
    load();
  
    return () => { mountedRef.current = false; };
  }, []);

  // Auto-calculate when area is passed
  useEffect(() => {
    if (passed.surfaceArea && passed.surfaceArea > 0 && !passed.input) {
      const sqrtArea = Math.sqrt(passed.surfaceArea);
      const inputWithArea: TileCalcInput = {
        ...input,
        length: sqrtArea,
        width: sqrtArea,
      };
      const rawResult = monitoredCalc('Tile Cost Estimator', () => calculateTile({ ...inputWithArea, labourRatePerSqm: 0 }, tileMaterials, currency, currencySymbol));
      const labourCost = calculateLabourCost(labourConfig, rawResult.surfaceArea);
      const r: TileCalcResult = { ...rawResult, labourCost, grandTotal: rawResult.materialCost + labourCost };
      setResult(r);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passed.surfaceArea, tileMaterials, labourConfig]);

  function update<K extends keyof TileCalcInput>(key: K, value: TileCalcInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function compute() {
    const rawResult = monitoredCalc('Tile Cost Estimator', () => calculateTile({ ...input, labourRatePerSqm: 0 }, tileMaterials, currency, currencySymbol));
    const labourCost = calculateLabourCost(labourConfig, rawResult.surfaceArea);
    const r: TileCalcResult = { ...rawResult, labourCost, grandTotal: rawResult.materialCost + labourCost };
    setResult(r);
    track('tile_estimate_generated', { surfaceType: input.surfaceType, total: r.grandTotal });
    logAnalyticsEvent('tile_estimate_generated', { surfaceType: input.surfaceType, total: r.grandTotal });
  }

  async function handleSave() {
    if (!user || !result) return;
    setSaving(true);
    const { error } = await saveUserProject('Tile Cost Estimate', 'tile_estimate', { ...input, result, labourConfig });
    setSaveMsg(error ? `Save failed: ${error}` : 'Saved to your projects');
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  }

  if (loading) {
    return (
      <>
        <PageHeader eyebrow="Estimate" title="Tile Cost Estimator" subtitle="Estimate material and labour costs for your tile installation." breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Calculators', path: '/calculators' }, { label: 'Tile Cost Estimator' }] } />
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Estimate" title="Tile Cost Estimator" subtitle="Estimate tile, adhesive, grout, and labour costs for your tiling project." breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Calculators', path: '/calculators' }, { label: 'Tile Cost Estimator' }] } />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Input panel */}
          <div className="card p-6 sm:p-8 dark:border-white/5 dark:bg-brand-navy-mid lg:col-span-3">
            <Section title="Surface">
              <Field label="Surface type">
                <select value={input.surfaceType} onChange={(e) => update('surfaceType', e.target.value as 'floor' | 'wall')} className="input-field dark:bg-brand-navy-mid dark:border-white/10">
                  <option value="floor">Floor</option>
                  <option value="wall">Wall</option>
                </select>
              </Field>
              <div className="mt-4 inline-flex rounded-lg border border-neutral-200 dark:border-white/5 p-1">
                {(['meters', 'feet'] as Unit[]).map((u) => (
                  <button key={u} type="button" onClick={() => update('unit', u)}
                    className={'rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-all ' + (input.unit === u ? 'bg-brand-purple text-white' : 'text-neutral-600 dark:text-neutral-300 hover:text-brand-purple')}>
                    {u}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label={input.surfaceType === 'floor' ? 'Floor length' : 'Wall length'} suffix={input.unit === 'meters' ? 'm' : 'ft'}>
                  <input type="number" min={0} step="0.01" value={input.length || ''} onChange={(e) => update('length', Number(e.target.value))} className="input-field dark:bg-brand-navy-mid dark:border-white/10" placeholder="0.00" />
                </Field>
                {input.surfaceType === 'floor' ? (
                  <Field label="Floor width" suffix={input.unit === 'meters' ? 'm' : 'ft'}>
                    <input type="number" min={0} step="0.01" value={input.width || ''} onChange={(e) => update('width', Number(e.target.value))} className="input-field dark:bg-brand-navy-mid dark:border-white/10" placeholder="0.00" />
                  </Field>
                ) : (
                  <Field label="Wall height" suffix={input.unit === 'meters' ? 'm' : 'ft'}>
                    <input type="number" min={0} step="0.01" value={input.height || ''} onChange={(e) => update('height', Number(e.target.value))} className="input-field dark:bg-brand-navy-mid dark:border-white/10" placeholder="0.00" />
                  </Field>
                )}
              </div>
            </Section>

            <Section title="Tile specifications">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tile width (mm)">
                  <input type="number" min={1} value={input.tileWidthMm} onChange={(e) => update('tileWidthMm', Number(e.target.value))} className="input-field dark:bg-brand-navy-mid dark:border-white/10" />
                </Field>
                <Field label="Tile height (mm)">
                  <input type="number" min={1} value={input.tileHeightMm} onChange={(e) => update('tileHeightMm', Number(e.target.value))} className="input-field dark:bg-brand-navy-mid dark:border-white/10" />
                </Field>
                <Field label="Tiles per box">
                  <input type="number" min={1} value={input.tilesPerBox} onChange={(e) => update('tilesPerBox', Number(e.target.value))} className="input-field dark:bg-brand-navy-mid dark:border-white/10" />
                </Field>
                <Field label={`Price per box (${currencySymbol})`}>
                  <input type="number" min={0} value={input.tilePricePerBox || ''} onChange={(e) => update('tilePricePerBox', Number(e.target.value))} className="input-field dark:bg-brand-navy-mid dark:border-white/10" placeholder="0" />
                </Field>
              </div>
            </Section>

            <Section title="Materials">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={`Adhesive price per bag (${currencySymbol})`}>
                  <input type="number" min={0} value={input.adhesivePricePerBag || ''} onChange={(e) => update('adhesivePricePerBag', Number(e.target.value))} className="input-field dark:bg-brand-navy-mid dark:border-white/10" placeholder="0" />
                </Field>
                <Field label="Adhesive coverage (m²/bag)">
                  <input type="number" min={0} step="0.1" value={input.adhesiveCoverageRate || ''} onChange={(e) => update('adhesiveCoverageRate', Number(e.target.value))} className="input-field dark:bg-brand-navy-mid dark:border-white/10" placeholder="0" />
                </Field>
                <Field label={`Grout price per kg (${currencySymbol})`}>
                  <input type="number" min={0} value={input.groutPricePerKg || ''} onChange={(e) => update('groutPricePerKg', Number(e.target.value))} className="input-field dark:bg-brand-navy-mid dark:border-white/10" placeholder="0" />
                </Field>
                <Field label="Grout coverage (m²/kg)">
                  <input type="number" min={0} step="0.1" value={input.groutCoverageRate || ''} onChange={(e) => update('groutCoverageRate', Number(e.target.value))} className="input-field dark:bg-brand-navy-mid dark:border-white/10" placeholder="0" />
                </Field>
                <Field label="Waste margin (%)">
                  <input type="number" min={0} max={50} value={input.wasteMargin} onChange={(e) => update('wasteMargin', Number(e.target.value))} className="input-field dark:bg-brand-navy-mid dark:border-white/10" />
                </Field>
              </div>
            </Section>

            <LabourCostSection
              estimatorKey="tile"
              config={labourConfig}
              onChange={setLabourConfig}
              currencySymbol={currencySymbol}
              area={result?.surfaceArea ?? 0}
              last
            />

            <button type="button" onClick={compute} disabled={input.length <= 0} className="btn-primary mt-6 w-full disabled:opacity-50 sm:w-auto">
              Generate Estimate <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Results panel */}
          <div className="lg:col-span-2">
            <div className="card sticky top-20 overflow-hidden">
              <div className="relative bg-gradient-to-br from-brand-navy to-brand-purple p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Estimated total</p>
                {result ? (
                  <p className="mt-1 text-3xl font-bold sm:text-4xl">{formatCurrency(result.grandTotal, currencySymbol)}</p>
                ) : (
                  <p className="mt-1 text-3xl font-bold text-white/40 sm:text-4xl">{currencySymbol}0</p>
                )}
                <p className="mt-1 text-xs text-white/50">Estimate only, not a final quote.</p>
              </div>
              <div className="space-y-2 p-6">
                {result ? (
                  <>
                    <Row label="Surface area" value={`${formatNumber(result.surfaceArea)} m²`} />
                    <Row label="Tiles needed" value={`${result.tilesNeeded}`} />
                    <Row label="Boxes needed" value={`${result.boxesNeeded}`} />
                    <Row label="Tile cost" value={formatCurrency(result.tileCost, currencySymbol)} />
                    <Row label="Adhesive cost" value={formatCurrency(result.adhesiveCost, currencySymbol)} />
                    <Row label="Grout cost" value={formatCurrency(result.groutCost, currencySymbol)} />
                    <div className="border-t border-neutral-100 pt-2">
                      <Row label="Material cost" value={formatCurrency(result.materialCost, currencySymbol)} />
                      {labourConfig.includeLabour && <Row label="Labour cost" value={formatCurrency(result.labourCost, currencySymbol)} />}
                    </div>
                    <div className="border-t border-neutral-100 pt-2">
                      <Row label="Grand total" value={formatCurrency(result.grandTotal, currencySymbol)} strong />
                    </div>
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-neutral-50 dark:bg-white/5 p-3 text-xs text-neutral-500">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-green" />
                      {input.surfaceType === 'floor' ? 'Floor' : 'Wall'} tiling with {input.wasteMargin}% waste margin.
                    </div>
                    {saveMsg && <p className="text-sm text-brand-purple">{saveMsg}</p>}
                    {user && (
                      <button type="button" onClick={handleSave} disabled={saving} className="btn-secondary mt-3 w-full disabled:opacity-50">
                        {saving ? 'Saving…' : 'Save to Projects'}
                      </button>
                    )}

                    {/* ── Engine Features (Additive) ── */}
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <EngineConfidenceBadge result={engine.assessConfidence({
                          ruleValid: true,
                          inputComplete: true,
                          materialSpecComplete: result.tilesNeeded > 0,
                          marketPriceAvailable: result.materialCost > 0,
                          sourceReliability: 'trusted',
                          productMatched: result.boxesNeeded > 0,
                        })} />
                      </div>

                      <EngineExplanationPanel result={engine.buildExplanation({
                        subject: 'Tile Cost Estimate',
                        resultSummary: `${formatCurrency(result.grandTotal, currencySymbol)} total for ${formatNumber(result.surfaceArea)} m²`,
                        steps: [
                          { description: 'Surface area', value: `${formatNumber(result.surfaceArea)} m²` },
                          { description: 'Tiles needed', value: String(result.tilesNeeded) },
                          { description: 'Boxes needed', value: String(result.boxesNeeded) },
                          { description: 'Tile cost', value: formatCurrency(result.tileCost, currencySymbol) },
                          ...(result.method === 'adhesive' ? [{ description: 'Adhesive cost', value: formatCurrency(result.adhesiveCost, currencySymbol) }] : []),
                          { description: 'Grout cost', value: formatCurrency(result.groutCost, currencySymbol) },
                          { description: 'Material cost', value: formatCurrency(result.materialCost, currencySymbol) },
                          { description: 'Grand total', value: formatCurrency(result.grandTotal, currencySymbol) },
                        ],
                        notes: [`Method: ${result.method}`, `Waste margin: ${input.wasteMargin}%`],
                      })} />

                      <EngineMaterialSummaryCard summary={engine.buildMaterialSummary([
                        { materialId: 'tiles', productName: 'Tiles', totalQuantity: result.boxesNeeded, quantityUnit: 'boxes', spaceIds: ['surface'] },
                        ...(result.method === 'adhesive' ? [{ materialId: 'adhesive', productName: 'Adhesive', totalQuantity: result.adhesiveNeeded, quantityUnit: 'bags', spaceIds: ['surface'] }] : []),
                        { materialId: 'grout', productName: 'Grout', totalQuantity: result.groutNeeded, quantityUnit: 'kg', spaceIds: ['surface'] },
                      ])} />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-neutral-400">Enter dimensions and click Generate Estimate to see your cost breakdown.</p>
                )}
              </div>
              {result && (
                <div className="border-t border-neutral-100 px-6 py-3 dark:border-white/5">
                  <EstimateDisclaimer text={calcDefaults.estimateDisclaimer} />
                  <ReportCalculationIssue
                    calculatorType="tile_cost"
                    userInput={{ surfaceType: input.surfaceType, surfaceArea: result?.surfaceArea ?? 0, wasteMargin: input.wasteMargin }}
                    actualResult={{ materialCost: result.materialCost, grandTotal: result.grandTotal }}
                  />
                </div>
              )}
              <div className="border-t border-neutral-100 bg-neutral-50 dark:bg-white/5 px-6 py-3 text-xs text-neutral-500">
                Estimate only. Actual costs may vary depending on materials, location, and market prices.
              </div>
            </div>
          </div>
        </div>
      </div>
      <RelatedTools links={[
        CALC_LINKS.tileCalc,
        CALC_LINKS.costEstimator,
        CALC_LINKS.screedingCost,
        CALC_LINKS.popCeilingCost,
        CALC_LINKS.buildToRoof,
        CALC_LINKS.imageEstimator,
      ]} />
    </>
  );
}

function Section({ title, children, last }: { title: string; children: ReactNode; last?: boolean }) {
  return (
    <div className={last ? '' : 'mb-6 border-b border-neutral-100 pb-6'}>
      <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-500">{title}</h2>
      {children}
        <RelatedToolsLinks />
    </div>
  );
}

function Field({ label, hint, suffix, children }: { label: string; hint?: string; suffix?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">{label}</span>
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
      <span className={'text-sm ' + (strong ? 'font-bold text-brand-navy dark:text-white' : 'text-neutral-500 dark:text-neutral-400')}>{label}</span>
      <span className={'text-sm ' + (strong ? 'font-bold text-brand-navy dark:text-white' : 'text-neutral-700 dark:text-neutral-200')}>{value}</span>
    </div>
  );
}
