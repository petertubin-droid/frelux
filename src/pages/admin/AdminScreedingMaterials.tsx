import { useEffect, useState } from 'react';
import { Save, Loader2, AlertCircle, Layers, Paintbrush, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminHeader, AdminCard, AdminField, StateMessage, Toggle } from '@/components/admin/AdminUi';
import { formatCurrency } from '@/lib/utils';
import type { DbScreedingMixConfig } from '@/types/database';

export default function AdminScreedingMaterials() {
  const [config, setConfig] = useState<DbScreedingMixConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Form state
  const [paintCoverage, setPaintCoverage] = useState(6);
  const [paintBucketSize, setPaintBucketSize] = useState(20);
  const [paintPrice, setPaintPrice] = useState(25000);
  const [cementRatio, setCementRatio] = useState(1.5);
  const [cementBagSize, setCementBagSize] = useState(40);
  const [cementPrice, setCementPrice] = useState(7500);
  const [mixRatio, setMixRatio] = useState('2:1');
  const [labourRate, setLabourRate] = useState(500);
  const [wastePct, setWastePct] = useState(10);
  const [taxPct, setTaxPct] = useState(7.5);
  const [currency, setCurrency] = useState('NGN');
  const [currencySymbol, setCurrencySymbol] = useState('₦');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from('screeding_mix_config')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      if (queryError) setError(queryError.message);
      if (data) {
        const cfg = data as DbScreedingMixConfig;
        setConfig(cfg);
        setPaintCoverage(Number(cfg.paint_coverage_rate_m2_per_l));
        setPaintBucketSize(Number(cfg.paint_bucket_size_l));
        setPaintPrice(Number(cfg.paint_price_per_bucket));
        setCementRatio(Number(cfg.cement_consumption_ratio_kg_per_l));
        setCementBagSize(Number(cfg.cement_bag_size_kg));
        setCementPrice(Number(cfg.cement_price_per_bag));
        setMixRatio(cfg.default_mix_ratio);
        setLabourRate(Number(cfg.labour_rate_per_sqm));
        setWastePct(Number(cfg.waste_percentage));
        setTaxPct(Number(cfg.tax_vat_percentage));
        setCurrency(cfg.currency);
        setCurrencySymbol(cfg.currency_symbol);
        setIsActive(cfg.is_active);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function onSave() {
    if (!config) return;
    setSaving(true);
    setSaveMsg(null);
    const { error: updateError } = await supabase
      .from('screeding_mix_config')
      .update({
        paint_coverage_rate_m2_per_l: paintCoverage,
        paint_bucket_size_l: paintBucketSize,
        paint_price_per_bucket: paintPrice,
        cement_consumption_ratio_kg_per_l: cementRatio,
        cement_bag_size_kg: cementBagSize,
        cement_price_per_bag: cementPrice,
        default_mix_ratio: mixRatio,
        labour_rate_per_sqm: labourRate,
        waste_percentage: wastePct,
        tax_vat_percentage: taxPct,
        currency,
        currency_symbol: currencySymbol,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setSaveMsg('Configuration saved successfully.');
      setTimeout(() => setSaveMsg(null), 3000);
    }
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching screeding mix configuration." />;

  return (
    <>
      <AdminHeader
        title="Wall Screeding Mix Configuration"
        subtitle="Configure the screeding mixture of Screeding Paint (20L buckets) + White Cement (40kg bags). These settings drive the screeding calculator and cost estimator."
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {saveMsg && (
        <div className="mb-4 rounded-lg border border-accent-green/30 bg-accent-green/10 p-3 text-sm text-accent-green">
          {saveMsg}
        </div>
      )}

      {/* Screeding Paint section */}
      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <Paintbrush className="h-5 w-5 text-brand-purple" />
          <h2 className="text-sm font-bold text-brand-navy">Screeding Paint (20L Buckets)</h2>
        </div>
        <p className="mt-1 text-xs text-neutral-400">Screeding Paint is measured in litres (m² per litre) and sold in 20 L buckets.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <AdminField label="Coverage rate (m²/L)" hint="Square metres covered per litre of paint">
            <input type="number" min={0} step="0.1" className="input-field" value={paintCoverage} onChange={(e) => setPaintCoverage(Number(e.target.value))} />
          </AdminField>
          <AdminField label="Bucket size (L)">
            <input type="number" min={1} className="input-field" value={paintBucketSize} onChange={(e) => setPaintBucketSize(Number(e.target.value))} />
          </AdminField>
          <AdminField label="Price per bucket">
            <input type="number" min={0} className="input-field" value={paintPrice} onChange={(e) => setPaintPrice(Number(e.target.value))} />
          </AdminField>
        </div>
      </AdminCard>

      {/* White Cement section */}
      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-brand-purple" />
          <h2 className="text-sm font-bold text-brand-navy">White Cement (40kg Bags)</h2>
        </div>
        <p className="mt-1 text-xs text-neutral-400">Cement is calculated from paint volume using the consumption ratio, then converted to 40 kg bags.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <AdminField label="Consumption ratio (kg/L)" hint="Kg of cement per litre of paint">
            <input type="number" min={0} step="0.1" className="input-field" value={cementRatio} onChange={(e) => setCementRatio(Number(e.target.value))} />
          </AdminField>
          <AdminField label="Bag size (kg)">
            <input type="number" min={1} className="input-field" value={cementBagSize} onChange={(e) => setCementBagSize(Number(e.target.value))} />
          </AdminField>
          <AdminField label="Price per bag">
            <input type="number" min={0} className="input-field" value={cementPrice} onChange={(e) => setCementPrice(Number(e.target.value))} />
          </AdminField>
        </div>
      </AdminCard>

      {/* Mix & Labour section */}
      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-brand-purple" />
          <h2 className="text-sm font-bold text-brand-navy">Mix Ratio, Labour & Overheads</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <AdminField label="Default mix ratio" hint="e.g. 2:1 (paint:cement)">
            <input type="text" className="input-field" value={mixRatio} onChange={(e) => setMixRatio(e.target.value)} />
          </AdminField>
          <AdminField label="Labour rate per m²">
            <input type="number" min={0} className="input-field" value={labourRate} onChange={(e) => setLabourRate(Number(e.target.value))} />
          </AdminField>
          <AdminField label="Waste percentage (%)">
            <input type="number" min={0} max={100} step="0.5" className="input-field" value={wastePct} onChange={(e) => setWastePct(Number(e.target.value))} />
          </AdminField>
        </div>
      </AdminCard>

      {/* Currency & Tax section */}
      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-brand-navy">Currency & Tax</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <AdminField label="Currency code">
            <input type="text" className="input-field" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </AdminField>
          <AdminField label="Currency symbol">
            <input type="text" className="input-field" value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} />
          </AdminField>
          <AdminField label="Tax/VAT (%)">
            <input type="number" min={0} max={100} step="0.5" className="input-field" value={taxPct} onChange={(e) => setTaxPct(Number(e.target.value))} />
          </AdminField>
          <div>
            <span className="block text-sm font-semibold text-neutral-700">Active</span>
            <div className="mt-2"><Toggle checked={isActive} onChange={setIsActive} /></div>
          </div>
        </div>
      </AdminCard>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-purple/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
        <span className="text-xs text-neutral-400">
          Paint: {formatCurrency(paintPrice, currencySymbol)} / {paintBucketSize}L bucket · Cement: {formatCurrency(cementPrice, currencySymbol)} / {cementBagSize}kg bag
        </span>
      </div>
    </>
  );
}
