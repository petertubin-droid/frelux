import { useEffect, useState, useCallback } from 'react';
import { HardHat, Info } from 'lucide-react';
import {
  type LabourConfig,
  type LabourEstimatorKey,
  type LabourPricingMethod,
  DEFAULT_LABOUR_CONFIG,
  PRICING_METHOD_LABELS,
  PRICING_METHOD_DESCRIPTIONS,
  fetchLabourSettings,
  fetchLabourCategories,
  createInitialLabourConfig,
} from '@/lib/labour';
import type { DbLabourCategory } from '@/types/database';
import { classNames } from '@/lib/utils';

interface LabourCostSectionProps {
  estimatorKey: LabourEstimatorKey;
  config: LabourConfig;
  onChange: (config: LabourConfig) => void;
  currencySymbol: string;
  area: number;
  /** Optional label override */
  label?: string;
  /** Whether this is the last section (no bottom border) */
  last?: boolean;
}

/**
 * Shared labour cost section component.
 * Renders an "Include Labour Cost" toggle (OFF by default).
 * When enabled, shows 5 pricing method choices and relevant input fields.
 * Users can always override any suggested rate.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useLabourConfig(estimatorKey: LabourEstimatorKey) {
  const [config, setConfig] = useState<LabourConfig>(DEFAULT_LABOUR_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const settings = await fetchLabourSettings(estimatorKey);
      if (cancelled) return;
      setConfig(createInitialLabourConfig(settings));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [estimatorKey]);

  const updateConfig = useCallback((updates: Partial<LabourConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  return { config, setConfig, updateConfig, loading };
}

export default function LabourCostSection({
  estimatorKey,
  config,
  onChange,
  currencySymbol,
  area,
  label = 'Labour Cost',
  last = false,
}: LabourCostSectionProps) {
  const [categories, setCategories] = useState<DbLabourCategory[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cats = await fetchLabourCategories(estimatorKey);
      if (!cancelled) setCategories(cats);
    })();
    return () => { cancelled = true; };
  }, [estimatorKey]);

  function update(updates: Partial<LabourConfig>) {
    onChange({ ...config, ...updates });
  }

  function applyCategory(catId: string) {
    const cat = categories.find((c) => c.id === catId);
    if (cat) {
      onChange({
        ...config,
        categoryId: catId,
        pricingMethod: cat.rate_unit,
        perSqmRate: cat.rate_unit === 'per_sqm' ? Number(cat.suggested_rate) : config.perSqmRate,
        perRoomRate: cat.rate_unit === 'per_room' ? Number(cat.suggested_rate) : config.perRoomRate,
        dailyRate: cat.rate_unit === 'daily' ? Number(cat.suggested_rate) : config.dailyRate,
        fixedAmount: cat.rate_unit === 'fixed' ? Number(cat.suggested_rate) : config.fixedAmount,
      });
    } else {
      update({ categoryId: null });
    }
  }

  const methods: LabourPricingMethod[] = ['fixed', 'per_sqm', 'per_room', 'daily', 'custom'];

  return (
    <div className={last ? '' : 'mb-6 border-b border-neutral-100 pb-6'}>
      <div className="flex items-center justify-between">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-neutral-500">
          <HardHat className="h-4 w-4" />
          {label}
        </h2>
        <Toggle checked={config.includeLabour} onChange={(v) => update({ includeLabour: v })} />
      </div>

      {!config.includeLabour && (
        <p className="text-sm text-neutral-400">
          Labour cost is optional. Toggle on to include labour in your estimate.
        </p>
      )}

      {config.includeLabour && (
        <div className="space-y-4">
          {/* Pricing method selector */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">Pricing Method</label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {methods.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => update({ pricingMethod: method })}
                  className={classNames(
                    'rounded-lg border p-3 text-left transition-all',
                    config.pricingMethod === method
                      ? 'border-brand-purple bg-brand-purple/5'
                      : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600',
                  )}
                >
                  <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                    {PRICING_METHOD_LABELS[method]}
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-400">
                    {PRICING_METHOD_DESCRIPTIONS[method]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Suggested categories */}
          {categories.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-700">
                Suggested Labour Categories
                <span className="ml-1 font-normal text-neutral-400">(optional — you can override)</span>
              </label>
              <select
                value={config.categoryId ?? ''}
                onChange={(e) => applyCategory(e.target.value)}
                className="input-field"
              >
                <option value="">— No category selected —</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.category_name} · {currencySymbol}{Number(cat.suggested_rate).toLocaleString()}/{cat.rate_unit === 'per_sqm' ? 'm²' : cat.rate_unit === 'per_room' ? 'room' : cat.rate_unit === 'daily' ? 'day' : 'project'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Method-specific inputs */}
          <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800/50">
            {config.pricingMethod === 'fixed' && (
              <Field label={`Fixed Labour Cost (${currencySymbol})`} hint="Enter the total labour cost for the entire project">
                <input
                  type="number"
                  min={0}
                  value={config.fixedAmount || ''}
                  onChange={(e) => update({ fixedAmount: Number(e.target.value) })}
                  className="input-field"
                  placeholder="0"
                />
              </Field>
            )}

            {config.pricingMethod === 'per_sqm' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={`Labour Rate per m² (${currencySymbol})`} hint="Rate multiplied by total area">
                  <input
                    type="number"
                    min={0}
                    value={config.perSqmRate || ''}
                    onChange={(e) => update({ perSqmRate: Number(e.target.value) })}
                    className="input-field"
                    placeholder="0"
                  />
                </Field>
                <Field label="Area (m²)" hint="Auto calculated from your inputs">
                  <input
                    type="number"
                    min={0}
                    value={area ? area.toFixed(2) : ''}
                    readOnly
                    className="input-field bg-neutral-100 dark:bg-neutral-700"
                    placeholder="0"
                  />
                </Field>
              </div>
            )}

            {config.pricingMethod === 'per_room' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={`Labour Rate per Room (${currencySymbol})`}>
                  <input
                    type="number"
                    min={0}
                    value={config.perRoomRate || ''}
                    onChange={(e) => update({ perRoomRate: Number(e.target.value) })}
                    className="input-field"
                    placeholder="0"
                  />
                </Field>
                <Field label="Number of Rooms">
                  <input
                    type="number"
                    min={1}
                    value={config.roomCount}
                    onChange={(e) => update({ roomCount: Number(e.target.value) })}
                    className="input-field"
                    placeholder="1"
                  />
                </Field>
              </div>
            )}

            {config.pricingMethod === 'daily' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={`Daily Labour Rate (${currencySymbol})`}>
                  <input
                    type="number"
                    min={0}
                    value={config.dailyRate || ''}
                    onChange={(e) => update({ dailyRate: Number(e.target.value) })}
                    className="input-field"
                    placeholder="0"
                  />
                </Field>
                <Field label="Number of Days">
                  <input
                    type="number"
                    min={1}
                    value={config.dayCount}
                    onChange={(e) => update({ dayCount: Number(e.target.value) })}
                    className="input-field"
                    placeholder="1"
                  />
                </Field>
              </div>
            )}

            {config.pricingMethod === 'custom' && (
              <Field label={`Custom Labour Amount (${currencySymbol})`} hint="Enter any custom labour cost — full flexibility">
                <input
                  type="number"
                  min={0}
                  value={config.customAmount || ''}
                  onChange={(e) => update({ customAmount: Number(e.target.value) })}
                  className="input-field"
                  placeholder="0"
                />
              </Field>
            )}
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 rounded-lg bg-brand-purple/5 p-3 text-xs text-neutral-500 dark:text-neutral-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-purple" />
            <span>
              Labour rates vary by contractor, location, and project. These are suggestions only —
              you can enter any amount. Your labour selection is saved with your estimate.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={classNames(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors',
        checked ? 'bg-accent-green' : 'bg-neutral-300 dark:bg-neutral-600',
      )}
      aria-pressed={checked}
      aria-label="Include labour cost"
    >
      <span
        className={classNames(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-neutral-400">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
