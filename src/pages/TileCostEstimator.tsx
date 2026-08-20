import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { calculateTile } from '@/lib/pop-tile-calc';
import { track } from '@/lib/analytics';
import { logAnalyticsEvent, fetchTileSizes, fetchTileMaterials, fetchSiteSettings, saveUserProject } from '@/lib/queries';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useSeo } from '@/lib/seo';
import type { TileCalcInput, TileCalcResult, Unit } from '@/types';
import type { DbTileSize, DbTileMaterial, DbSiteSettings } from '@/types/database';

import { FaqSection, RelatedTools, CALC_LINKS } from '@/components/seo/SeoSections';
import { TileCostEstimatorSeo } from '@/components/seo/SeoContent';
import LabourCostSection, { useLabourConfig } from '@/components/labour/LabourCostSection';
import { calculateLabourCost } from '@/lib/labour';
interface PassedState {
  surfaceArea?: number;
  grandTotal?: number;
  input?: Partial<TileCalcInput>;
}

export default function TileCostEstimator() {
  useSeo({
    title: 'Tile Cost Estimator: Estimate Tile Installation Cost',
    description: 'Estimate the full cost of your tile installation project including tiles, adhesive, grout, and waste. Labour not included.',
    canonicalPath: '/tile-cost-estimator',
    ogType: 'website',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'FRELUX Tile Cost Estimator',
      description: 'Estimate the full cost of your tile installation project including tiles, adhesive, grout, and waste. Labour not included.',
      url: 'https://freluxpaintcalc.com/tile-cost-estimator',
      applicationCategory: 'CalculatorApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  });

  const location = useLocation();
  const passed = (location.state as PassedState | null) ?? {};
  const { user } = useAuth();

  const [, setTileSizes] = useState<DbTileSize[]>([]);
  const [tileMaterials, setTileMaterials] = useState<DbTileMaterial[]>([]);
  const [settings, setSettings] = useState<DbSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { config: labourConfig, setConfig: setLabourConfig } = useLabourConfig('tile');
  const [result, setResult] = useState<TileCalcResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [input, setInput] = useState<TileCalcInput>({
    surfaceType: passed.input?.surfaceType ?? 'floor',
    method: passed.input?.method ?? 'adhesive',
    length: passed.input?.length ?? 0,
    width: passed.input?.width ?? 0,
    height: passed.input?.height ?? 0,
    tileWidthMm: passed.input?.tileWidthMm ?? 300,
    tileHeightMm: passed.input?.tileHeightMm ?? 300,
    tilesPerBox: passed.input?.tilesPerBox ?? 11,
    tilePricePerBox: passed.input?.tilePricePerBox ?? 12000,
    adhesiveCoverageRate: passed.input?.adhesiveCoverageRate ?? 5,
    adhesivePricePerBag: passed.input?.adhesivePricePerBag ?? 4500,
    cementCoverageRate: passed.input?.cementCoverageRate ?? 5,
    cementPricePerBag: passed.input?.cementPricePerBag ?? 4500,
    cementPackageSize: passed.input?.cementPackageSize ?? 1,
    sandCoverageRate: passed.input?.sandCoverageRate ?? 5,
    sandPricePerBag: passed.input?.sandPricePerBag ?? 3000,
    sandPackageSize: passed.input?.sandPackageSize ?? 1,
    groutCoverageRate: passed.input?.groutCoverageRate ?? 20,
    groutPricePerKg: passed.input?.groutPricePerKg ?? 1500,
    spacerCoverageRate: passed.input?.spacerCoverageRate ?? 50,
    spacerPricePerPack: passed.input?.spacerPricePerPack ?? 500,
    spacerPackageSize: passed.input?.spacerPackageSize ?? 1,
    wasteMargin: passed.input?.wasteMargin ?? 10,
    labourRatePerSqm: passed.input?.labourRatePerSqm ?? 0,
    unit: passed.input?.unit ?? 'meters',
  });

  const currencySymbol = settings?.default_currency_symbol ?? '₦';
  const currency = settings?.default_currency ?? 'NGN';

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

      setLoading(false);
    }
    load();
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
      const rawResult = calculateTile({ ...inputWithArea, labourRatePerSqm: 0 }, tileMaterials, currency, currencySymbol);
      const r: TileCalcResult = { ...rawResult, labourCost: 0, grandTotal: rawResult.materialCost };
      setResult(r);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passed.surfaceArea, tileMaterials]);

  function update<K extends keyof TileCalcInput>(key: K, value: TileCalcInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function compute() {
    const rawResult = calculateTile({ ...input, labourRatePerSqm: 0 }, tileMaterials, currency, currencySymbol);
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
        <PageHeader eyebrow="Estimate" title="Tile Cost Estimator" subtitle="Estimate material and labour costs for your tile installation." breadcrumbs={[{ label: 'Cost Estimators', path: '/cost-estimator' }, { label: 'Tile Cost Estimator' }]} />
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Estimate" title="Tile Cost Estimator" subtitle="Estimate tile, adhesive, grout, and labour costs for your tiling project." breadcrumbs={[{ label: 'Cost Estimators', path: '/cost-estimator' }, { label: 'Tile Cost Estimator' }]} />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Input panel */}
          <div className="card p-6 sm:p-8 lg:col-span-3">
            <Section title="Surface">
              <Field label="Surface type">
                <select value={input.surfaceType} onChange={(e) => update('surfaceType', e.target.value as 'floor' | 'wall')} className="input-field">
                  <option value="floor">Floor</option>
                  <option value="wall">Wall</option>
                </select>
              </Field>
              <div className="mt-4 inline-flex rounded-lg border border-neutral-200 p-1">
                {(['meters', 'feet'] as Unit[]).map((u) => (
                  <button key={u} type="button" onClick={() => update('unit', u)}
                    className={'rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-all ' + (input.unit === u ? 'bg-brand-purple text-white' : 'text-neutral-600 hover:text-brand-purple')}>
                    {u}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label={input.surfaceType === 'floor' ? 'Floor length' : 'Wall length'} suffix={input.unit === 'meters' ? 'm' : 'ft'}>
                  <input type="number" min={0} step="0.01" value={input.length || ''} onChange={(e) => update('length', Number(e.target.value))} className="input-field" placeholder="0.00" />
                </Field>
                {input.surfaceType === 'floor' ? (
                  <Field label="Floor width" suffix={input.unit === 'meters' ? 'm' : 'ft'}>
                    <input type="number" min={0} step="0.01" value={input.width || ''} onChange={(e) => update('width', Number(e.target.value))} className="input-field" placeholder="0.00" />
                  </Field>
                ) : (
                  <Field label="Wall height" suffix={input.unit === 'meters' ? 'm' : 'ft'}>
                    <input type="number" min={0} step="0.01" value={input.height || ''} onChange={(e) => update('height', Number(e.target.value))} className="input-field" placeholder="0.00" />
                  </Field>
                )}
              </div>
            </Section>

            <Section title="Tile specifications">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tile width (mm)">
                  <input type="number" min={1} value={input.tileWidthMm} onChange={(e) => update('tileWidthMm', Number(e.target.value))} className="input-field" />
                </Field>
                <Field label="Tile height (mm)">
                  <input type="number" min={1} value={input.tileHeightMm} onChange={(e) => update('tileHeightMm', Number(e.target.value))} className="input-field" />
                </Field>
                <Field label="Tiles per box">
                  <input type="number" min={1} value={input.tilesPerBox} onChange={(e) => update('tilesPerBox', Number(e.target.value))} className="input-field" />
                </Field>
                <Field label={`Price per box (${currencySymbol})`}>
                  <input type="number" min={0} value={input.tilePricePerBox || ''} onChange={(e) => update('tilePricePerBox', Number(e.target.value))} className="input-field" placeholder="0" />
                </Field>
              </div>
            </Section>

            <Section title="Installation Method">
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  { value: 'adhesive', label: 'Tile Adhesive', desc: 'Pre-mixed adhesive' },
                  { value: 'traditional', label: 'Traditional', desc: 'Cement + sharp sand' },
                ] as const).map((m) => {
                  const selected = input.method === m.value;
                  return (
                    <button key={m.value} type="button" onClick={() => update('method', m.value)}
                      className={'flex items-start gap-3 rounded-lg border p-4 text-left transition-all ' + (selected ? 'border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20' : 'border-neutral-200 hover:border-neutral-300')}>
                      <span>
                        <span className="block text-sm font-semibold text-brand-navy">{m.label}</span>
                        <span className="block text-xs text-neutral-500">{m.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Materials">
              {input.method === 'adhesive' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={`Adhesive price per bag (${currencySymbol})`}>
                    <input type="number" min={0} value={input.adhesivePricePerBag || ''} onChange={(e) => update('adhesivePricePerBag', Number(e.target.value))} className="input-field" placeholder="0" />
                  </Field>
                  <Field label="Adhesive coverage (m²/bag)">
                    <input type="number" min={0} step="0.1" value={input.adhesiveCoverageRate || ''} onChange={(e) => update('adhesiveCoverageRate', Number(e.target.value))} className="input-field" placeholder="0" />
                  </Field>
                </div>
              )}
              {input.method === 'traditional' && (
                <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                <Field label="Waste margin (%)">
                  <input type="number" min={0} max={50} value={input.wasteMargin} onChange={(e) => update('wasteMargin', Number(e.target.value))} className="input-field" />
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
              <div className="bg-brand-navy p-6 text-white">
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
                    {result.method === 'adhesive' && <Row label="Adhesive cost" value={formatCurrency(result.adhesiveCost, currencySymbol)} />}
                    {result.method === 'traditional' && <Row label="Cement cost" value={formatCurrency(result.cementCost, currencySymbol)} />}
                    {result.method === 'traditional' && <Row label="Sharp sand cost" value={formatCurrency(result.sandCost, currencySymbol)} />}
                    <Row label="Grout cost" value={formatCurrency(result.groutCost, currencySymbol)} />
                    <Row label="Tile spacers cost" value={formatCurrency(result.spacerCost, currencySymbol)} />
                    <div className="border-t border-neutral-100 pt-2">
                      <Row label="Material cost" value={formatCurrency(result.materialCost, currencySymbol)} />
                      {labourConfig.includeLabour && <Row label="Labour cost" value={formatCurrency(result.labourCost, currencySymbol)} />}
                    </div>
                    <div className="border-t border-neutral-100 pt-2">
                      <Row label="Grand total" value={formatCurrency(result.grandTotal, currencySymbol)} strong />
                    </div>
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-green" />
                      {input.surfaceType === 'floor' ? 'Floor' : 'Wall'} tiling with {input.wasteMargin}% waste margin.
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

      <TileCostEstimatorSeo />

      <FaqSection faqs={[
        { question: "How much does tiling cost?", answer: <span>Tiling cost depends on the tile type, area, adhesive, grout, and labour. Enter your tile area from the Tile Calculator to get a practical cost estimate.</span> },
        { question: "What additional materials do I need for tiling?", answer: <span>Besides tiles, you need tile adhesive, grout, spacers, and potentially waterproofing membrane for wet areas. The estimator includes these in the cost breakdown.</span> },
      ]} />

      <RelatedTools links={[
        CALC_LINKS.tileCalc,
        CALC_LINKS.costEstimator,
        CALC_LINKS.screedingCost,
        CALC_LINKS.popCeilingCost,
      ]} />
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
      <span className={'text-sm ' + (strong ? 'font-bold text-brand-navy dark:text-white' : 'text-neutral-500 dark:text-neutral-400')}>{label}</span>
      <span className={'text-sm ' + (strong ? 'font-bold text-brand-navy dark:text-white' : 'text-neutral-700 dark:text-neutral-200')}>{value}</span>
    </div>
  );
}
