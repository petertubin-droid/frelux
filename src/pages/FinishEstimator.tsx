import { useState, useEffect } from 'react';
import { Paintbrush, SprayCan, Layers, Loader2, AlertCircle, CheckCircle2, ArrowRight, RotateCcw, Save, ChevronDown, Info } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import ResultCard from '@/components/ui/ResultCard';
import { calculateFinish, getFinishTypeLabel, getFinishTypeDescription, getDefaultCoats, dbToFinishMaterialConfig, type FinishType, type FinishCalcResult, type FinishMaterialConfig } from '@/lib/finish-calc';
import { fetchFinishTypes, fetchSiteSettings, saveUserProject, logAnalyticsEvent } from '@/lib/queries';
import { calculateScreedingArea, validateScreedingInput, formatCurrency, formatNumber, DEFAULT_DOOR_WIDTH_M, DEFAULT_DOOR_HEIGHT_M, DEFAULT_WINDOW_WIDTH_M, DEFAULT_WINDOW_HEIGHT_M } from '@/lib/utils';
import { track } from '@/lib/analytics';
import { useSeo } from '@/lib/seo';
import type { ScreedingCalcInput, ScreedingCalcResult, Unit, OpeningDimensions } from '@/types';
import type { DbFinishType, DbSiteSettings } from '@/types/database';
import { trackCalculation } from '@/lib/achievements';
import { trackRecentTool } from '@/lib/smart-defaults';

import { FaqSection, RelatedTools, CALC_LINKS } from '@/components/seo/SeoSections';
import { FinishEstimatorSeo } from '@/components/seo/SeoContent';
const defaultDoorDims: OpeningDimensions = { width: DEFAULT_DOOR_WIDTH_M, height: DEFAULT_DOOR_HEIGHT_M };
const defaultWindowDims: OpeningDimensions = { width: DEFAULT_WINDOW_WIDTH_M, height: DEFAULT_WINDOW_HEIGHT_M };

const finishTypeMeta: Record<FinishType, { icon: typeof Paintbrush; color: string }> = {
  painting: { icon: Paintbrush, color: 'text-blue-600' },
  tyrolene: { icon: SprayCan, color: 'text-amber-600' },
  grafitex: { icon: Layers, color: 'text-emerald-600' },
};

export default function FinishEstimator() {
  useSeo({
    title: 'Finish Estimator: Painting, Tyrolene & Grafitex Cost Calculator',
    description: 'Estimate material quantities and costs for wall finishes including Painting, Tyrolene, and Grafitex. Based on real coverage rates and package sizes. Labour not included.',
    canonicalPath: '/finish-estimator',
    ogType: 'website',
    keywords: 'finish estimator, wall finish calculator, tyrolene cost, grafitex cost, painting cost calculator',
    structuredDataArray: [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'FRELUX Finish Estimator',
        applicationCategory: 'CalculatorApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxpaintcalc.com' },
          { '@type': 'ListItem', position: 2, name: 'Finish Estimator', item: 'https://freluxpaintcalc.com/finish-estimator' },
        ],
      },
    ],
  });

  useEffect(() => { trackRecentTool('/finish-estimator', 'Finish Estimator', 'Calculator'); });
  const [finishTypes, setFinishTypes] = useState<DbFinishType[]>([]);
  const [settings, setSettings] = useState<DbSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedFinish, setSelectedFinish] = useState<FinishType>('painting');
  const [result, setResult] = useState<FinishCalcResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  // Grafitex-specific state
  const [grafitexBucketPrice, setGrafitexBucketPrice] = useState(20000); // Admin-configurable, default ₦20,000
  const [grafitexPartitionCount, setGrafitexPartitionCount] = useState(4);
  const [grafitexUsePartitions, setGrafitexUsePartitions] = useState(true);

  const currencySymbol = settings?.default_currency_symbol ?? '₦';
  const currency = settings?.default_currency ?? 'NGN';

  const [areaInput, setAreaInput] = useState<ScreedingCalcInput>({
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

  const [coats, setCoats] = useState(2);
  const [wasteMargin, setWasteMargin] = useState(10);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [ftRes, settingsRes] = await Promise.all([
        fetchFinishTypes(),
        fetchSiteSettings(),
      ]);
      if (ftRes.error) setLoadError(ftRes.error);
      else setFinishTypes(ftRes.data);

      if (settingsRes.data) setSettings(settingsRes.data);
      setLoading(false);
    }
    load();
    track('finish_estimator_opened', {});
    logAnalyticsEvent('finish_estimator_opened', {});
  }, []);

  // Update coats when finish type changes
  useEffect(() => {
    setCoats(getDefaultCoats(selectedFinish));
    setResult(null);
  }, [selectedFinish]);

  function updateArea<K extends keyof ScreedingCalcInput>(key: K, value: ScreedingCalcInput[K]) {
    setAreaInput((prev) => ({ ...prev, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
    setResult(null);
  }

  function compute() {
    if (selectedFinish === 'grafitex') {
      // Grafitex: partition-based calculation
      const calcResult = calculateFinish({
        finishType: 'grafitex',
        area: 0, // Not used when partitionCount is provided
        coats: 1,
        wasteMargin: 0,
        currency,
        currencySymbol,
        grafitexBucketPrice,
        grafitexPartitionsPerBucket: 2, // FRELUX rule: 1 bucket = 2 standard partitions
        standardPartitionArea: 9, // 3m × 3m
        standardPartitionCount: grafitexUsePartitions ? grafitexPartitionCount : undefined,
      });
      setResult(calcResult);
      setSaved(false);
      track('finish_estimate_completed', { finishType: 'grafitex', partitions: grafitexPartitionCount });
      logAnalyticsEvent('finish_estimate_completed', { finishType: 'grafitex', partitions: grafitexPartitionCount });
      return;
    }

    // Painting / Tyrolene: area-based calculation
    const e = validateScreedingInput(areaInput);
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const areaResult: ScreedingCalcResult = calculateScreedingArea(areaInput);
    const area = areaResult.netScreedingArea;
    if (area <= 0) {
      setErrors({ area: 'Net area must be greater than 0' });
      return;
    }

    const dbMaterials = finishTypes.filter((ft) => ft.slug === selectedFinish);
    const materials: FinishMaterialConfig[] =
      dbMaterials.length > 0
        ? dbMaterials.map(dbToFinishMaterialConfig)
        : [];

    trackCalculation('finish');
    const calcResult = calculateFinish({
      finishType: selectedFinish,
      area,
      coats,
      wasteMargin,
      materials: materials.length > 0 ? materials : undefined,
      currency,
      currencySymbol,
    });

    setResult(calcResult);
    setSaved(false);
    track('finish_estimate_completed', { finishType: selectedFinish, area, coats });
    logAnalyticsEvent('finish_estimate_completed', { finishType: selectedFinish, area, coats });
  }

  async function handleSave() {
    if (!result) return;
    const name = `${getFinishTypeLabel(result.finishType)}, ${formatNumber(result.area)} m²`;
    const { error } = await saveUserProject(
      name,
      'custom',
      { finishType: selectedFinish, areaInput, coats, wasteMargin, result },
      undefined,
    );
    if (error) {
      setErrors({ save: error });
      return;
    }
    setSaved(true);
  }

  function startOver() {
    setResult(null);
    setSaved(false);
    setErrors({});
  }

  const finishTypesList: FinishType[] = ['painting', 'tyrolene', 'grafitex'];

  return (
    <>
      <PageHeader
        eyebrow="Estimate"
        title="Finish Estimator"
        subtitle="Calculate material quantities and costs for Painting, Tyrolene, and Grafitex wall finishes. Labour not included."
        backTo="/"
        backLabel="Home"
      />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
            <span className="ml-3 text-sm text-neutral-500">Loading finish types...</span>
          </div>
        )}

        {loadError && !loading && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Couldn't load finish type data: {loadError}. Default values will be used for calculations.</p>
          </div>
        )}

        {/* Labour notice */}
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Labour: Not included, negotiated separately.</p>
              <p className="text-xs text-amber-700 mt-1">This calculator provides material quantities and costs only. Labour is not calculated.</p>
            </div>
          </div>
        </div>

        {!loading && !result && (
          <div className="space-y-8">
            {/* Step 1: Finish Type Selection */}
            <div className="card p-6 sm:p-8">
              <h2 className="font-display text-lg font-bold text-neutral-900">Choose finish type</h2>
              <p className="mt-1 text-sm text-neutral-500">Select the wall finish you want to estimate.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {finishTypesList.map((ft) => {
                  const meta = finishTypeMeta[ft];
                  const Icon = meta.icon;
                  const selected = selectedFinish === ft;
                  return (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => setSelectedFinish(ft)}
                      className={
                        'flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all ' +
                        (selected
                          ? 'border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20'
                          : 'border-neutral-200 hover:border-neutral-300')
                      }
                    >
                      <span
                        className={
                          'inline-flex h-10 w-10 items-center justify-center rounded-lg ' +
                          (selected ? 'bg-brand-purple text-white' : 'bg-neutral-100 ' + meta.color)
                        }
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-neutral-900">{getFinishTypeLabel(ft)}</span>
                        <span className="mt-0.5 block text-xs text-neutral-500">{getFinishTypeDescription(ft)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Grafitex Input (partition-based) */}
            {selectedFinish === 'grafitex' && (
              <div className="card p-6 sm:p-8">
                <h2 className="font-display text-lg font-bold text-neutral-900">Grafitex Partitions</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Grafitex is measured in 20-L buckets. 1 bucket covers 2 standard partitions (FRELUX rule).
                </p>

                <div className="mt-6 space-y-5">
                  {/* Partition count */}
                  <div>
                    <label className="section-label">Number of Standard Partitions</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setGrafitexPartitionCount(Math.max(0, grafitexPartitionCount - 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:border-brand-purple"
                      >
                        –
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={grafitexPartitionCount}
                        onChange={(e) => setGrafitexPartitionCount(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-24 text-center rounded-lg border border-neutral-200 px-3 py-2 text-lg font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => setGrafitexPartitionCount(grafitexPartitionCount + 1)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:border-brand-purple"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-xs text-neutral-400 mt-2">
                      Standard partition: 3m × 3m = 9m². Theoretical buckets: {(grafitexPartitionCount / 2).toFixed(2)}
                    </p>
                  </div>

                  {/* Bucket price (admin-configurable) */}
                  <div>
                    <label className="section-label">Bucket Price (₦): Admin Configurable</label>
                    <input
                      type="number"
                      min="0"
                      value={grafitexBucketPrice}
                      onChange={(e) => setGrafitexBucketPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="input-field"
                    />
                    <p className="text-xs text-neutral-400 mt-1">
                      Current reference price: ₦20,000 per 20-L bucket. Admin can configure this price.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2b: Area Input for Painting/Tyrolene */}
            {selectedFinish !== 'grafitex' && (
              <div className="card p-6 sm:p-8">
                <h2 className="font-display text-lg font-bold text-neutral-900">Surface area</h2>
                <p className="mt-1 text-sm text-neutral-500">Enter your wall dimensions to calculate the paintable area.</p>

                <div className="mt-6 space-y-5">
                  {/* Method toggle */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateArea('method', 'full_room')}
                      className={
                        'flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ' +
                        (areaInput.method === 'full_room'
                          ? 'border-brand-purple bg-brand-purple/5 text-brand-purple'
                          : 'border-neutral-200 text-neutral-600 hover:border-neutral-300')
                      }
                    >
                      Full Room
                    </button>
                    <button
                      type="button"
                      onClick={() => updateArea('method', 'direct_wall')}
                      className={
                        'flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ' +
                        (areaInput.method === 'direct_wall'
                          ? 'border-brand-purple bg-brand-purple/5 text-brand-purple'
                          : 'border-neutral-200 text-neutral-600 hover:border-neutral-300')
                      }
                    >
                      Direct Wall
                    </button>
                  </div>

                  {areaInput.method === 'full_room' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="section-label">Room Length ({areaInput.unit})</label>
                          <input
                            type="number"
                            className="input-field"
                            value={areaInput.roomLength || ''}
                            onChange={(e) => updateArea('roomLength', parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="section-label">Room Width ({areaInput.unit})</label>
                          <input
                            type="number"
                            className="input-field"
                            value={areaInput.roomWidth || ''}
                            onChange={(e) => updateArea('roomWidth', parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="section-label">Wall Height ({areaInput.unit})</label>
                        <input
                          type="number"
                          className="input-field"
                          value={areaInput.wallHeight || ''}
                          onChange={(e) => updateArea('wallHeight', parseFloat(e.target.value) || 0)}
                          min="0"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="section-label">Wall Width ({areaInput.unit})</label>
                        <input
                          type="number"
                          className="input-field"
                          value={areaInput.wallWidth || ''}
                          onChange={(e) => updateArea('wallWidth', parseFloat(e.target.value) || 0)}
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="section-label">Wall Height ({areaInput.unit})</label>
                        <input
                          type="number"
                          className="input-field"
                          value={areaInput.wallHeight || ''}
                          onChange={(e) => updateArea('wallHeight', parseFloat(e.target.value) || 0)}
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="section-label">Number of Walls</label>
                        <input
                          type="number"
                          className="input-field"
                          value={areaInput.wallCount}
                          onChange={(e) => updateArea('wallCount', Math.max(1, parseInt(e.target.value) || 1))}
                          min="1"
                        />
                      </div>
                    </>
                  )}

                  {/* Unit toggle */}
                  <div className="flex gap-2">
                    {(['meters', 'feet'] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => updateArea('unit', u)}
                        className={
                          'rounded-lg border px-4 py-2 text-sm font-medium ' +
                          (areaInput.unit === u
                            ? 'border-brand-purple bg-brand-purple/5 text-brand-purple'
                            : 'border-neutral-200 text-neutral-600')
                        }
                      >
                        {u === 'meters' ? 'Metres' : 'Feet'}
                      </button>
                    ))}
                  </div>

                  {/* Doors & Windows (full room only) */}
                  {areaInput.method === 'full_room' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="section-label">Doors</label>
                        <input
                          type="number"
                          className="input-field"
                          value={areaInput.doors}
                          onChange={(e) => updateArea('doors', Math.max(0, parseInt(e.target.value) || 0))}
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="section-label">Windows</label>
                        <input
                          type="number"
                          className="input-field"
                          value={areaInput.windows}
                          onChange={(e) => updateArea('windows', Math.max(0, parseInt(e.target.value) || 0))}
                          min="0"
                        />
                      </div>
                    </div>
                  )}

                  {/* Coats & Waste */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="section-label">Coats</label>
                      <input
                        type="number"
                        className="input-field"
                        value={coats}
                        onChange={(e) => setCoats(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                        min="1"
                        max="10"
                      />
                    </div>
                    <div>
                      <label className="section-label">Waste Margin (%)</label>
                      <input
                        type="number"
                        className="input-field"
                        value={wasteMargin}
                        onChange={(e) => setWasteMargin(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={compute}
                  className="btn-primary mt-6 w-full"
                  disabled={loading}
                >
                  Calculate Estimate
                  <ArrowRight className="h-4 w-4" />
                </button>
                {errors.area && <p className="mt-2 text-center text-xs text-red-500">{errors.area}</p>}
              </div>
            )}

            {/* Grafitex calculate button */}
            {selectedFinish === 'grafitex' && (
              <button
                type="button"
                onClick={compute}
                className="btn-primary w-full"
                disabled={loading || grafitexPartitionCount <= 0}
              >
                Calculate Grafitex Estimate
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {!loading && result && (
          <div className="space-y-6">
            <ResultCard
              title={`${getFinishTypeLabel(result.finishType)} Estimate`}
              subtitle={
                result.finishType === 'grafitex'
                  ? `${result.grafitexEquivalentPartitions} standard partitions, ${result.coats} coat`
                  : `${formatNumber(result.area)} m² · ${result.coats} coat${result.coats > 1 ? 's' : ''} · ${result.wasteMargin}% waste`
              }
              stats={[
                result.finishType === 'grafitex'
                  ? { label: 'Equivalent Partitions', value: `${result.grafitexEquivalentPartitions}`, highlight: true }
                  : { label: 'Surface Area', value: `${formatNumber(result.area)} m²`, highlight: true },
                { label: 'Material Cost', value: formatCurrency(result.materialCost, currencySymbol) },
                { label: 'Materials', value: `${result.materials.length} type${result.materials.length > 1 ? 's' : ''}` },
              ]}
              grandTotal={result.totalCost}
              currencySymbol={currencySymbol}
              onSave={handleSave}
              onRecalculate={startOver}
            >
              {/* Material Breakdown */}
              <div className="mt-6 space-y-4">
                <h4 className="text-sm font-bold text-neutral-900">Material Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                        <th className="pb-2 font-medium">Material</th>
                        <th className="pb-2 text-right font-medium">Theoretical</th>
                        <th className="pb-2 text-right font-medium">Practical</th>
                        <th className="pb-2 text-right font-medium">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.materials.map((mat, i) => (
                        <tr key={i} className="border-b border-neutral-100 last:border-0">
                          <td className="py-3">
                            <span className="font-medium text-neutral-900">{mat.name}</span>
                            {mat.isBase && <span className="ml-2 text-xs text-neutral-400">Base</span>}
                            {mat.isFinishing && <span className="ml-2 text-xs text-neutral-400">Finishing</span>}
                          </td>
                          <td className="py-3 text-right text-neutral-600">
                            {formatNumber(mat.quantityRequired)} {mat.coverageUnit}
                          </td>
                          <td className="py-3 text-right text-neutral-600">
                            {mat.packagesNeeded} × {mat.packageSize}{mat.packageUnit}
                          </td>
                          <td className="py-3 text-right font-medium text-neutral-900">
                            {formatCurrency(mat.cost, currencySymbol)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Grafitex partition info */}
                {result.finishType === 'grafitex' && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-xs font-semibold text-emerald-800 mb-1">FRELUX Grafitex Rule</p>
                    <p className="text-xs text-emerald-700">
                      1 × 20-L bucket = 2 standard partitions. Theoretical: {result.grafitexBucketsTheoretical} buckets. Practical purchase: {result.grafitexBucketsPractical} buckets.
                    </p>
                  </div>
                )}

                {/* Cost Summary */}
                <div className="rounded-xl bg-neutral-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Total Materials</span>
                    <span className="font-semibold text-neutral-900">{formatCurrency(result.materialCost, currencySymbol)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2 text-sm">
                    <span className="font-bold text-neutral-900">Grand Total</span>
                    <span className="font-bold text-brand-purple">{formatCurrency(result.totalCost, currencySymbol)}</span>
                  </div>
                </div>

                {/* Labour note */}
                <div className="rounded-lg border border-neutral-200 p-3">
                  <p className="text-xs text-neutral-500">{result.labourNote}</p>
                </div>

                {/* Calculation transparency */}
                <button
                  onClick={() => setShowSteps(!showSteps)}
                  className="flex items-center gap-1.5 text-xs font-medium text-brand-purple hover:text-brand-purple-dark"
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSteps ? 'rotate-180' : ''}`} />
                  {showSteps ? 'Hide calculation breakdown' : 'How was this calculated?'}
                </button>

                {showSteps && (
                  <div className="rounded-lg border border-neutral-200 p-3 space-y-2">
                    {result.finishType === 'grafitex' ? (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500">Standard Partitions</span>
                          <span className="font-medium">{result.grafitexEquivalentPartitions}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500">FRELUX Rule</span>
                          <span className="font-medium">1 bucket = 2 partitions</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500">Theoretical Buckets</span>
                          <span className="font-medium">{result.grafitexEquivalentPartitions} ÷ 2 = {result.grafitexBucketsTheoretical}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500">Practical Buckets (rounded up)</span>
                          <span className="font-medium">{result.grafitexBucketsPractical}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500">Price per Bucket</span>
                          <span className="font-medium">{formatCurrency(grafitexBucketPrice, currencySymbol)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500">Total Cost</span>
                          <span className="font-medium">{result.grafitexBucketsPractical} × {formatCurrency(grafitexBucketPrice, currencySymbol)} = {formatCurrency(result.materialCost, currencySymbol)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500">Surface Area</span>
                          <span className="font-medium">{formatNumber(result.area)} m²</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500">Coats</span>
                          <span className="font-medium">{result.coats}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500">Waste Margin</span>
                          <span className="font-medium">{result.wasteMargin}%</span>
                        </div>
                        {result.materials.map((m, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-neutral-500">{m.name} (theoretical)</span>
                            <span className="font-medium">{formatNumber(m.quantityRequired)} {m.coverageUnit}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </ResultCard>

            {saved && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <p>Estimate saved to your projects. Find it in My Projects.</p>
              </div>
            )}

            {errors.save && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{errors.save}</p>
              </div>
            )}
          </div>
        )}

        {/* Tyrolene redirect notice */}
        {!loading && !result && selectedFinish === 'tyrolene' && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-700">
              <Info className="inline h-4 w-4 mr-1" />
              For accurate Tyrolene partition-based estimation, use the dedicated{' '}
              <a href="/tyrolene-estimator" className="font-semibold underline">Tyrolene Estimator</a>.
            </p>
          </div>
        )}

        {/* Empty state when no finish types from DB */}
        {!loading && !result && finishTypes.length === 0 && !loadError && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            <p className="font-medium">Using default finish parameters</p>
            <p className="mt-1 text-xs">No finish type data found in the database. An administrator can configure finish types in the admin panel.</p>
          </div>
        )}
      </div>

      <FinishEstimatorSeo />

      <FaqSection faqs={[
        { question: "What wall finishes does the Finish Estimator support?", answer: <span>The Finish Estimator supports Painting, Tyrolene, and Grafitex finishes. Each uses real coverage rates and package sizes for accurate material and cost estimates.</span> },
        { question: "Does the Finish Estimator include labour costs?", answer: <span>No, the Finish Estimator covers material quantities and costs only. For labour-inclusive estimates, use the Painting Estimator or individual cost estimators.</span> },
      ]} />

      <RelatedTools links={[
        CALC_LINKS.paintingEstimator,
        CALC_LINKS.tyroleneEstimator,
        CALC_LINKS.costEstimator,
        CALC_LINKS.paintCalculator,
      ]} />
    </>
  );
}
