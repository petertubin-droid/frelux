import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, ArrowRight, CheckCircle2, AlertCircle, Loader2, Grid3x3 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { calculateTile } from '@/lib/pop-tile-calc';
import { track } from '@/lib/analytics';
import { logAnalyticsEvent, fetchTileSizes, fetchTileMaterials, fetchSiteSettings, saveUserProject } from '@/lib/queries';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useSeo } from '@/lib/seo';
import type { TileCalcInput, TileCalcResult, Unit } from '@/types';
import type { DbTileSize, DbTileMaterial, DbSiteSettings } from '@/types/database';

export default function TileCalculator() {
  useSeo({
    title: 'Tile Calculator — How Many Tiles Do I Need?',
    description: 'Free tile calculator. Enter your floor or wall dimensions and tile size to calculate tile quantity, boxes, adhesive, grout, and labour cost.',
    canonicalPath: '/tile-calculator',
    ogType: 'website',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'FRELUX Tile Calculator',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' },
    },
  });

  const { user } = useAuth();
  const [tileSizes, setTileSizes] = useState<DbTileSize[]>([]);
  const [tileMaterials, setTileMaterials] = useState<DbTileMaterial[]>([]);
  const [settings, setSettings] = useState<DbSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<TileCalcResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const currencySymbol = settings?.default_currency_symbol ?? '₦';
  const currency = settings?.default_currency ?? 'NGN';

  const [input, setInput] = useState<TileCalcInput>({
    surfaceType: 'floor',
    length: 0,
    width: 0,
    height: 0,
    tileWidthMm: 300,
    tileHeightMm: 300,
    tilesPerBox: 11,
    tilePricePerBox: 12000,
    adhesiveCoverageRate: 5,
    adhesivePricePerBag: 4500,
    groutCoverageRate: 20,
    groutPricePerKg: 1500,
    wasteMargin: 10,
    labourRatePerSqm: 2000,
    unit: 'meters',
  });

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

      // Auto-fill adhesive and grout prices from seeded data
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
    setResult(r);
    track('tile_calculated', { surfaceType: input.surfaceType, area: r.surfaceArea, tiles: r.tilesNeeded });
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
        <PageHeader eyebrow="Calculate" title="Tile Calculator" subtitle="Calculate tile quantities, adhesive, and grout." backTo="/" backLabel="Home" />
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Calculate" title="Tile Calculator" subtitle="Calculate tile quantity, boxes, adhesive, grout, and labour cost for your tiling project." backTo="/" backLabel="Home" />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {!result && (
          <div className="card p-6 sm:p-8">
            {/* Surface type */}
            <h2 className="text-lg font-bold text-brand-navy">Surface type</h2>
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
                      <span className="block text-sm font-semibold text-brand-navy">{s.label}</span>
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
                  <option value="">— Custom size —</option>
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
            user={user} onSave={handleSave} saving={saving} saveMsg={saveMsg} />
        )}
      </div>
    </>
  );
}

function TileResultCard({ result, input, currencySymbol, onAgain, onStartOver, user, onSave, saving, saveMsg }: {
  result: TileCalcResult;
  input: TileCalcInput;
  currencySymbol: string;
  onAgain: () => void;
  onStartOver: () => void;
  user: { email?: string } | null;
  onSave: () => void;
  saving: boolean;
  saveMsg: string;
}) {
  return (
    <div className="mt-8 card overflow-hidden">
      <div className="bg-brand-navy p-6 text-white sm:p-8">
        <div className="flex items-center gap-2 text-accent-green">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">Your Tile Estimate</span>
        </div>
        <p className="mt-3 text-sm text-white/60">
          {input.surfaceType === 'floor' ? 'Floor' : 'Wall'} tiling · {input.tileWidthMm}×{input.tileHeightMm}mm · {input.wasteMargin}% waste
        </p>
        <p className="mt-1 text-4xl font-bold sm:text-5xl">{result.boxesNeeded} box(es)</p>
        <p className="mt-1 text-sm text-white/60">{result.tilesNeeded} tiles needed</p>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
        <Stat label="Surface area" value={`${formatNumber(result.surfaceArea)} m²`} />
        <Stat label="Tile area" value={`${formatNumber(result.tileArea, 3)} m²`} />
        <Stat label="Tiles needed" value={`${result.tilesNeeded}`} />
        <Stat label="Boxes needed" value={`${result.boxesNeeded}`} />
        <Stat label="Adhesive needed" value={`${result.adhesiveNeeded} bag(s)`} />
        <Stat label="Grout needed" value={`${result.groutNeeded} kg`} />
      </div>

      <div className="mt-2 space-y-2 px-6 pb-6 sm:px-8">
        <Row label="Tile cost" value={formatCurrency(result.tileCost, currencySymbol)} />
        <Row label="Adhesive cost" value={formatCurrency(result.adhesiveCost, currencySymbol)} />
        <Row label="Grout cost" value={formatCurrency(result.groutCost, currencySymbol)} />
        <Row label="Labour cost" value={formatCurrency(result.labourCost, currencySymbol)} />
        <div className="border-t border-neutral-100 pt-2">
          <Row label="Grand total" value={formatCurrency(result.grandTotal, currencySymbol)} strong />
        </div>
      </div>

      {saveMsg && <p className="px-6 pb-2 text-sm text-brand-purple sm:px-8">{saveMsg}</p>}

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
          <Link to="/tile-cost-estimator" state={{ surfaceArea: result.surfaceArea, grandTotal: result.grandTotal, input }}
            className="btn-primary">
            Continue to Cost Estimate <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{label}</p>
      <p className="mt-1.5 text-xl font-bold text-brand-navy">{value}</p>
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
      <span className={'text-sm ' + (strong ? 'font-bold text-brand-navy' : 'text-neutral-500')}>{label}</span>
      <span className={'text-sm ' + (strong ? 'font-bold text-brand-navy' : 'text-neutral-700')}>{value}</span>
    </div>
  );
}
