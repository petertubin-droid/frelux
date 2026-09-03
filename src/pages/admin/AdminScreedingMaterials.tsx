import { useEffect, useState } from 'react';
import { Save, Loader2, AlertCircle, Layers, Paintbrush, Package, PaintBucket } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {AdminHeader, AdminCard, AdminField, StateMessage, Toggle, AdminInput, AdminButton} from '@/components/admin/AdminUi';
import { formatCurrency } from '@/lib/utils';
import type { DbScreedingSystemConfig } from '@/types/database';
import type { ScreedingMaterialSystem } from '@/types';

type SystemTab = ScreedingMaterialSystem | 'legacy';

export default function AdminScreedingMaterials() {
  const [activeTab, setActiveTab] = useState<SystemTab>('putty');
  const [puttyConfig, setPuttyConfig] = useState<DbScreedingSystemConfig | null>(null);
  const [mixConfig, setMixConfig] = useState<DbScreedingSystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: queryError } = await supabase
          .from('screeding_system_config')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        if (queryError) throw queryError;
        if (data) {
          for (const row of data as DbScreedingSystemConfig[]) {
            if (row.system_type === 'putty') setPuttyConfig(row);
            if (row.system_type === 'white_cement_paint') setMixConfig(row);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
      setLoading(false);
    }
    load();
  }, []);

  async function saveConfig(config: DbScreedingSystemConfig, updates: Record<string, unknown>) {
    setSaving(true);
    setSaveMsg(null);
    const { error: updateError } = await supabase
      .from('screeding_system_config')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', config.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setSaveMsg(`${config.display_name} configuration saved successfully.`);
      setTimeout(() => setSaveMsg(null), 3000);
      // Reload to get fresh state
      const { data } = await supabase
        .from('screeding_system_config')
        .select('*')
        .eq('id', config.id)
        .single();
      if (data) {
        const fresh = data as DbScreedingSystemConfig;
        if (fresh.system_type === 'putty') setPuttyConfig(fresh);
        if (fresh.system_type === 'white_cement_paint') setMixConfig(fresh);
      }
    }
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching screeding material system configurations." />;

  return (
    <>
      <AdminHeader
        title="Screeding Engine Configuration"
        subtitle="Configure the screeding material systems that drive the Screeding Calculator and Cost Estimator. All values are database-driven and take effect immediately."
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {saveMsg && (
        <div className="mb-4 rounded-lg border border-accent-green/30 bg-accent-green/10 p-3 text-sm text-accent-green">
          {saveMsg}
        </div>
      )}

      {/* Tab selector */}
      <div className="mb-6 flex gap-2 border-b border-border dark:border-white/10">
        <TabButton active={activeTab === 'putty'} onClick={() => setActiveTab('putty')} icon={<PaintBucket aria-hidden="true" className="h-4 w-4" />} label="Putty" />
        <TabButton active={activeTab === 'white_cement_paint'} onClick={() => setActiveTab('white_cement_paint')} icon={<Paintbrush aria-hidden="true" className="h-4 w-4" />} label="White Cement + Paint" />
      </div>

      {activeTab === 'putty' && puttyConfig && (
        <PuttyConfigPanel config={puttyConfig} onSave={(updates) => saveConfig(puttyConfig, updates)} saving={saving} />
      )}
      {activeTab === 'putty' && !puttyConfig && (
        <StateMessage type="error" title="No configuration found" message="No active Putty configuration was found in the database. Please run the latest migration." />
      )}

      {activeTab === 'white_cement_paint' && mixConfig && (
        <MixConfigPanel config={mixConfig} onSave={(updates) => saveConfig(mixConfig, updates)} saving={saving} />
      )}
      {activeTab === 'white_cement_paint' && !mixConfig && (
        <StateMessage type="error" title="No configuration found" message="No active White Cement + Screeding Paint configuration was found in the database. Please run the latest migration." />
      )}
    </>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-primary-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// =========================================================
// Putty Configuration Panel
// =========================================================
function PuttyConfigPanel({ config, onSave, saving }: { config: DbScreedingSystemConfig; onSave: (updates: Record<string, unknown>) => void; saving: boolean }) {
  const [displayName, setDisplayName] = useState(config.display_name);
  const [description, setDescription] = useState(config.description ?? '');
  const [coverageArea, setCoverageArea] = useState(Number(config.coverage_area_m2));
  const [coverageUnit, setCoverageUnit] = useState(config.coverage_unit);
  const [defaultCoats, setDefaultCoats] = useState(Number(config.default_coats));
  const [wastePct, setWastePct] = useState(Number(config.waste_percentage));
  const [puttyName, setPuttyName] = useState(config.putty_name ?? 'Putty');
  const [puttyQuantity, setPuttyQuantity] = useState(Number(config.putty_quantity ?? 2));
  const [puttyUnit, setPuttyUnit] = useState(config.putty_unit ?? 'bucket');
  const [puttyPrice, setPuttyPrice] = useState(Number(config.putty_price_per_unit ?? 0));
  const [currency, setCurrency] = useState(config.currency);
  const [currencySymbol, setCurrencySymbol] = useState(config.currency_symbol);
  const [roundingRule, setRoundingRule] = useState(config.rounding_rule);
  const [isActive, setIsActive] = useState(config.is_active);

  function handleSave() {
    onSave({
      display_name: displayName,
      description: description || null,
      coverage_area_m2: Math.max(0.01, Number(coverageArea) || 0.01),
      coverage_unit: coverageUnit,
      default_coats: Math.max(1, Math.round(Number(defaultCoats) || 2)),
      waste_percentage: Math.max(0, Math.min(100, Number(wastePct) || 0)),
      putty_name: puttyName,
      putty_quantity: Math.max(0, Number(puttyQuantity) || 0),
      putty_unit: puttyUnit,
      putty_price_per_unit: Math.max(0, Number(puttyPrice) || 0),
      currency,
      currency_symbol: currencySymbol,
      rounding_rule: roundingRule,
      is_active: isActive,
    });
  }

  return (
    <>
      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <PaintBucket aria-hidden="true" className="h-5 w-5 text-brand-purple" />
          <h2 className="text-sm font-bold text-foreground dark:text-primary-foreground">Putty Material Configuration</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
          Configure the Putty screeding system. The calculator uses these values to determine how much Putty is needed based on wall surface area.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AdminField label="Display name" hint="Shown to users in the material selector">
            <AdminInput type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </AdminField>
          <AdminField label="Description" hint="Short description for users">
            <AdminInput type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </AdminField>
        </div>
        <div className="mt-2">
          <AdminField label="Active">
            <div className="mt-2"><Toggle checked={isActive} onChange={setIsActive} /></div>
          </AdminField>
        </div>
      </AdminCard>

      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <Layers aria-hidden="true" className="h-5 w-5 text-brand-purple" />
          <h2 className="text-sm font-bold text-foreground dark:text-primary-foreground">Coverage & Coating Rules</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
          The coverage rule defines how much area one unit group covers. Coats multiply the base requirement.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AdminField label="Coverage area (m²)" hint="Area covered per unit group">
            <AdminInput type="number" min={0.01} step="0.5" value={coverageArea} onChange={(e) => setCoverageArea(Number(e.target.value))} />
          </AdminField>
          <AdminField label="Coverage unit">
            <AdminInput type="text" value={coverageUnit} onChange={(e) => setCoverageUnit(e.target.value)} />
          </AdminField>
          <AdminField label="Default coats" hint="Default number of coats">
            <AdminInput type="number" min={1} max={10} value={defaultCoats} onChange={(e) => setDefaultCoats(Number(e.target.value))} />
          </AdminField>
          <AdminField label="Waste percentage (%)" hint="Extra material allowance for waste">
            <AdminInput type="number" min={0} max={100} step="0.5" value={wastePct} onChange={(e) => setWastePct(Number(e.target.value))} />
          </AdminField>
        </div>
      </AdminCard>

      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <Package aria-hidden="true" className="h-5 w-5 text-brand-purple" />
          <h2 className="text-sm font-bold text-foreground dark:text-primary-foreground">Putty Material</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AdminField label="Material name">
            <AdminInput type="text" value={puttyName} onChange={(e) => setPuttyName(e.target.value)} />
          </AdminField>
          <AdminField label="Required quantity per coverage area" hint="Buckets needed per coverage area">
            <AdminInput type="number" min={0} step="0.5" value={puttyQuantity} onChange={(e) => setPuttyQuantity(Number(e.target.value))} />
          </AdminField>
          <AdminField label="Unit" hint="e.g. bucket, bag, kg">
            <AdminInput type="text" value={puttyUnit} onChange={(e) => setPuttyUnit(e.target.value)} />
          </AdminField>
          <AdminField label="Price per unit">
            <AdminInput type="number" min={0} value={puttyPrice} onChange={(e) => setPuttyPrice(Number(e.target.value))} />
          </AdminField>
        </div>
      </AdminCard>

      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-foreground dark:text-primary-foreground">Currency & Rounding</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <AdminField label="Currency code">
            <AdminInput type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </AdminField>
          <AdminField label="Currency symbol">
            <AdminInput type="text" value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} />
          </AdminField>
          <AdminField label="Rounding rule">
            <select
              className="admin-input"
              value={roundingRule}
              onChange={(e) => setRoundingRule(e.target.value as 'ceil' | 'none')}
            >
              <option value="ceil">Round up (ceil)</option>
              <option value="none">No rounding</option>
            </select>
          </AdminField>
        </div>
      </AdminCard>

      <div className="flex items-center gap-3">
        <AdminButton type="button" onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-sm">
          {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save Putty Configuration'}
        </AdminButton>
        <span className="text-xs text-muted-foreground">
          Current price: {formatCurrency(puttyPrice, currencySymbol)} per {puttyUnit}
        </span>
      </div>
    </>
  );
}

// =========================================================
// White Cement + Screeding Paint Configuration Panel
// =========================================================
function MixConfigPanel({ config, onSave, saving }: { config: DbScreedingSystemConfig; onSave: (updates: Record<string, unknown>) => void; saving: boolean }) {
  const [displayName, setDisplayName] = useState(config.display_name);
  const [description, setDescription] = useState(config.description ?? '');
  const [coverageArea, setCoverageArea] = useState(Number(config.coverage_area_m2));
  const [coverageUnit, setCoverageUnit] = useState(config.coverage_unit);
  const [defaultCoats, setDefaultCoats] = useState(Number(config.default_coats));
  const [wastePct, setWastePct] = useState(Number(config.waste_percentage));
  const [paintName, setPaintName] = useState(config.paint_name ?? 'Screeding Paint');
  const [paintQuantity, setPaintQuantity] = useState(Number(config.paint_quantity ?? 2));
  const [paintUnit, setPaintUnit] = useState(config.paint_unit ?? 'bucket');
  const [paintPrice, setPaintPrice] = useState(Number(config.paint_price_per_unit ?? 0));
  const [cementName, setCementName] = useState(config.cement_name ?? 'White Cement');
  const [cementQuantity, setCementQuantity] = useState(Number(config.cement_quantity ?? 1));
  const [cementUnit, setCementUnit] = useState(config.cement_unit ?? 'bag');
  const [cementPrice, setCementPrice] = useState(Number(config.cement_price_per_unit ?? 0));
  const [currency, setCurrency] = useState(config.currency);
  const [currencySymbol, setCurrencySymbol] = useState(config.currency_symbol);
  const [roundingRule, setRoundingRule] = useState(config.rounding_rule);
  const [isActive, setIsActive] = useState(config.is_active);

  function handleSave() {
    onSave({
      display_name: displayName,
      description: description || null,
      coverage_area_m2: Math.max(0.01, Number(coverageArea) || 0.01),
      coverage_unit: coverageUnit,
      default_coats: Math.max(1, Math.round(Number(defaultCoats) || 2)),
      waste_percentage: Math.max(0, Math.min(100, Number(wastePct) || 0)),
      paint_name: paintName,
      paint_quantity: Math.max(0, Number(paintQuantity) || 0),
      paint_unit: paintUnit,
      paint_price_per_unit: Math.max(0, Number(paintPrice) || 0),
      cement_name: cementName,
      cement_quantity: Math.max(0, Number(cementQuantity) || 0),
      cement_unit: cementUnit,
      cement_price_per_unit: Math.max(0, Number(cementPrice) || 0),
      currency,
      currency_symbol: currencySymbol,
      rounding_rule: roundingRule,
      is_active: isActive,
    });
  }

  return (
    <>
      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <Paintbrush aria-hidden="true" className="h-5 w-5 text-brand-purple" />
          <h2 className="text-sm font-bold text-foreground dark:text-primary-foreground">White Cement + Screeding Paint Configuration</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
          Configure the combined White Cement and Screeding Paint system. Both materials are calculated from the same coverage rule.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AdminField label="Display name" hint="Shown to users in the material selector">
            <AdminInput type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </AdminField>
          <AdminField label="Description" hint="Short description for users">
            <AdminInput type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </AdminField>
        </div>
        <div className="mt-2">
          <AdminField label="Active">
            <div className="mt-2"><Toggle checked={isActive} onChange={setIsActive} /></div>
          </AdminField>
        </div>
      </AdminCard>

      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <Layers aria-hidden="true" className="h-5 w-5 text-brand-purple" />
          <h2 className="text-sm font-bold text-foreground dark:text-primary-foreground">Coverage & Coating Rules</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
          For every coverage area, the configured quantities of Screeding Paint and White Cement are needed. Coats multiply the base requirement.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AdminField label="Coverage area (m²)" hint="Area covered per unit group">
            <AdminInput type="number" min={0.01} step="0.5" value={coverageArea} onChange={(e) => setCoverageArea(Number(e.target.value))} />
          </AdminField>
          <AdminField label="Coverage unit">
            <AdminInput type="text" value={coverageUnit} onChange={(e) => setCoverageUnit(e.target.value)} />
          </AdminField>
          <AdminField label="Default coats" hint="Default number of coats">
            <AdminInput type="number" min={1} max={10} value={defaultCoats} onChange={(e) => setDefaultCoats(Number(e.target.value))} />
          </AdminField>
          <AdminField label="Waste percentage (%)" hint="Extra material allowance for waste">
            <AdminInput type="number" min={0} max={100} step="0.5" value={wastePct} onChange={(e) => setWastePct(Number(e.target.value))} />
          </AdminField>
        </div>
      </AdminCard>

      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <Paintbrush aria-hidden="true" className="h-5 w-5 text-brand-purple" />
          <h2 className="text-sm font-bold text-foreground dark:text-primary-foreground">Screeding Paint</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AdminField label="Material name">
            <AdminInput type="text" value={paintName} onChange={(e) => setPaintName(e.target.value)} />
          </AdminField>
          <AdminField label="Quantity per coverage area" hint="Buckets needed per coverage area">
            <AdminInput type="number" min={0} step="0.5" value={paintQuantity} onChange={(e) => setPaintQuantity(Number(e.target.value))} />
          </AdminField>
          <AdminField label="Unit" hint="e.g. bucket">
            <AdminInput type="text" value={paintUnit} onChange={(e) => setPaintUnit(e.target.value)} />
          </AdminField>
          <AdminField label="Price per unit">
            <AdminInput type="number" min={0} value={paintPrice} onChange={(e) => setPaintPrice(Number(e.target.value))} />
          </AdminField>
        </div>
      </AdminCard>

      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <Package aria-hidden="true" className="h-5 w-5 text-brand-purple" />
          <h2 className="text-sm font-bold text-foreground dark:text-primary-foreground">White Cement</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AdminField label="Material name">
            <AdminInput type="text" value={cementName} onChange={(e) => setCementName(e.target.value)} />
          </AdminField>
          <AdminField label="Quantity per coverage area" hint="Bags needed per coverage area">
            <AdminInput type="number" min={0} step="0.5" value={cementQuantity} onChange={(e) => setCementQuantity(Number(e.target.value))} />
          </AdminField>
          <AdminField label="Unit" hint="e.g. bag">
            <AdminInput type="text" value={cementUnit} onChange={(e) => setCementUnit(e.target.value)} />
          </AdminField>
          <AdminField label="Price per unit">
            <AdminInput type="number" min={0} value={cementPrice} onChange={(e) => setCementPrice(Number(e.target.value))} />
          </AdminField>
        </div>
      </AdminCard>

      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-foreground dark:text-primary-foreground">Currency & Rounding</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <AdminField label="Currency code">
            <AdminInput type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </AdminField>
          <AdminField label="Currency symbol">
            <AdminInput type="text" value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} />
          </AdminField>
          <AdminField label="Rounding rule">
            <select
              className="admin-input"
              value={roundingRule}
              onChange={(e) => setRoundingRule(e.target.value as 'ceil' | 'none')}
            >
              <option value="ceil">Round up (ceil)</option>
              <option value="none">No rounding</option>
            </select>
          </AdminField>
        </div>
      </AdminCard>

      <div className="flex items-center gap-3">
        <AdminButton type="button" onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-sm">
          {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save Configuration'}
        </AdminButton>
        <span className="text-xs text-muted-foreground">
          Paint: {formatCurrency(paintPrice, currencySymbol)}/{paintUnit} · Cement: {formatCurrency(cementPrice, currencySymbol)}/{cementUnit}
        </span>
      </div>
    </>
  );
}
