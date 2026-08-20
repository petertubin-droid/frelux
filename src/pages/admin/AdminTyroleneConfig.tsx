/**
 * FRELUX Admin — Tyrolene Configuration
 *
 * Admin page for configuring:
 * - Standard partition dimensions (width × height)
 * - Material ratio (per 4 partitions)
 * - Material prices (cement, sand, acrylic-bond, water-seal, anti-fungal)
 * - Pack sizes per material
 * - Production rules (Owerri / Outside Owerri)
 *
 * Only authorized admins can access this page (RequireAdmin).
 * All changes are audited.
 */

import { useEffect, useState, useCallback } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle2, Info, Ruler, Package, DollarSign, MapPin } from 'lucide-react';
import {
  AdminHeader,
  AdminCard,
  AdminButton,
  AdminField,
  Toggle,
} from '@/components/admin/AdminUi';
import { supabase } from '@/lib/supabase';
import { classNames } from '@/lib/utils';
import type {
  EstimationCalcRule,
  EstimationMaterial,
  EstimationPrice,
} from '@/types/estimation';

// =========================================================
// Types
// =========================================================

type TabType = 'partition' | 'ratio' | 'prices' | 'production';

interface MaterialRatioEntry {
  slug: string;
  quantity: number;
  unit: string;
}

interface ProductionRule {
  id: string;
  product_category: string;
  quality_slug: string | null;
  location_rule: string;
  min_quantity: number;
  unit: string;
  is_active: boolean;
  description: string | null;
}

// =========================================================
// Constants
// =========================================================

const TYROLENE_SLUGS = ['cement', 'sand', 'acrylic-bond', 'water-seal', 'anti-fungal'];

// =========================================================
// Component
// =========================================================

export default function AdminTyroleneConfig() {
  const [activeTab, setActiveTab] = useState<TabType>('partition');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ── Partition dimensions ──
  const [partitionWidth, setPartitionWidth] = useState<string>('');
  const [partitionHeight, setPartitionHeight] = useState<string>('');
  const [partitionRuleId, setPartitionRuleId] = useState<string | null>(null);

  // ── Material ratio ──
  const [ratioEntries, setRatioEntries] = useState<MaterialRatioEntry[]>([]);
  const [partitionsPerRatio, setPartitionsPerRatio] = useState<number>(4);
  const [ratioRuleId, setRatioRuleId] = useState<string | null>(null);

  // ── Material prices ──
  const [materials, setMaterials] = useState<EstimationMaterial[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});

  // ── Production rules ──
  const [productionRules, setProductionRules] = useState<ProductionRule[]>([]);
  const [outsideOwerriMin, setOutsideOwerriMin] = useState<string>('');

  // =========================================================
  // Load configuration
  // =========================================================
  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      try {
        // Fetch calc rules for tyrolene
        const { data: rules } = await supabase
          .from('estimation_calc_rules')
          .select('*')
          .eq('calculator_type', 'tyrolene')
          .eq('is_active', true);

        const ruleMap = new Map<string, EstimationCalcRule>();
        for (const rule of (rules ?? [])) {
          ruleMap.set(rule.rule_key, rule as EstimationCalcRule);
        }

        // Standard partition dimensions
        const spRule = ruleMap.get('standard_partition_dimensions');
        if (spRule) {
          setPartitionRuleId(spRule.id);
          const val = spRule.rule_value as Record<string, unknown>;
          setPartitionWidth(val.width ? String(val.width) : '');
          setPartitionHeight(val.height ? String(val.height) : '');
        }

        // Material ratio
        const ratioRule = ruleMap.get('material_ratio');
        if (ratioRule) {
          setRatioRuleId(ratioRule.id);
          const val = ratioRule.rule_value as Record<string, unknown>;
          setPartitionsPerRatio(typeof val.partitions_per_ratio === 'number' ? val.partitions_per_ratio : 4);
          const rawMats = Array.isArray(val.materials) ? val.materials : [];
          setRatioEntries(rawMats
            .filter((m): m is Record<string, unknown> => m !== null && typeof m === 'object')
            .map((m) => ({
              slug: String(m.slug ?? ''),
              quantity: typeof m.quantity === 'number' ? m.quantity : 0,
              unit: String(m.unit ?? ''),
            })));
        }

        // Fetch materials
        const { data: matData } = await supabase
          .from('estimation_materials')
          .select('*')
          .in('slug', TYROLENE_SLUGS)
          .order('sort_order', { ascending: true });

        const mats = (matData ?? []) as EstimationMaterial[];
        setMaterials(mats);

        // Fetch prices for each material
        const priceMap: Record<string, string> = {};
        for (const mat of mats) {
          const { data: price } = await supabase
            .from('estimation_prices')
            .select('*')
            .eq('price_type', 'material')
            .eq('ref_id', mat.id)
            .eq('is_active', true)
            .order('effective_date', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (price) {
            priceMap[mat.slug] = String((price as EstimationPrice).price);
          } else {
            priceMap[mat.slug] = '';
          }
        }
        setPrices(priceMap);

        // Fetch production rules
        const { data: prodRules } = await supabase
          .from('estimation_production_rules')
          .select('*')
          .eq('product_category', 'tyrolene')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        setProductionRules((prodRules ?? []) as ProductionRule[]);

        const outsideRule = (prodRules ?? []).find(
          (r) => r.location_rule === 'outside_owerri'
        );
        setOutsideOwerriMin(outsideRule ? String((outsideRule as ProductionRule).min_quantity) : '');
      } catch (err) {
        setSaveMessage({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to load configuration',
        });
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  // =========================================================
  // Save handlers
  // =========================================================

  const savePartitionDimensions = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const width = parseFloat(partitionWidth);
      const height = parseFloat(partitionHeight);

      if (isNaN(width) || width <= 0 || isNaN(height) || height <= 0) {
        setSaveMessage({ type: 'error', message: 'Width and height must be positive numbers.' });
        return;
      }

      const ruleValue = { width, height };
      const oldData = partitionRuleId
        ? await supabase.from('estimation_calc_rules').select('rule_value').eq('id', partitionRuleId).maybeSingle()
        : null;

      if (partitionRuleId) {
        await supabase
          .from('estimation_calc_rules')
          .update({ rule_value: ruleValue })
          .eq('id', partitionRuleId);
      } else {
        const { data } = await supabase
          .from('estimation_calc_rules')
          .insert({
            rule_key: 'standard_partition_dimensions',
            calculator_type: 'tyrolene',
            rule_value: ruleValue,
            rule_status: 'admin_configured',
            description: 'Standard partition dimensions (width × height in metres) for Tyrolene estimation.',
            is_active: true,
          })
          .select()
          .single();
        if (data) setPartitionRuleId(data.id);
      }

      // Audit log
      await supabase.from('estimation_audit_log').insert({
        entity_type: 'calc_rule',
        entity_id: partitionRuleId,
        action: 'update',
        old_value: oldData?.data?.rule_value ?? null,
        new_value: ruleValue,
      });

      setSaveMessage({ type: 'success', message: 'Standard partition dimensions saved.' });
    } catch (err) {
      setSaveMessage({ type: 'error', message: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }, [partitionWidth, partitionHeight, partitionRuleId]);

  const saveMaterialRatio = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const ruleValue = {
        partitions_per_ratio: partitionsPerRatio,
        materials: ratioEntries.map(m => ({
          slug: m.slug,
          quantity: m.quantity,
          unit: m.unit,
        })),
      };

      const oldData = ratioRuleId
        ? await supabase.from('estimation_calc_rules').select('rule_value').eq('id', ratioRuleId).maybeSingle()
        : null;

      if (ratioRuleId) {
        await supabase
          .from('estimation_calc_rules')
          .update({ rule_value: ruleValue })
          .eq('id', ratioRuleId);
      } else {
        const { data } = await supabase
          .from('estimation_calc_rules')
          .insert({
            rule_key: 'material_ratio',
            calculator_type: 'tyrolene',
            rule_value: ruleValue,
            rule_status: 'verified_frelux',
            description: 'FRELUX Tyrolene material ratio per standard partitions.',
            is_active: true,
          })
          .select()
          .single();
        if (data) setRatioRuleId(data.id);
      }

      await supabase.from('estimation_audit_log').insert({
        entity_type: 'calc_rule',
        entity_id: ratioRuleId,
        action: 'update',
        old_value: oldData?.data?.rule_value ?? null,
        new_value: ruleValue,
      });

      setSaveMessage({ type: 'success', message: 'Material ratio saved. Changes apply to new estimates only.' });
    } catch (err) {
      setSaveMessage({ type: 'error', message: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }, [partitionsPerRatio, ratioEntries, ratioRuleId]);

  const savePrice = useCallback(async (materialSlug: string) => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const priceStr = prices[materialSlug];
      const newPrice = parseFloat(priceStr);

      if (isNaN(newPrice) || newPrice < 0) {
        setSaveMessage({ type: 'error', message: `Price for ${materialSlug} must be a non-negative number.` });
        return;
      }

      const material = materials.find(m => m.slug === materialSlug);
      if (!material) return;

      // Deactivate old price
      await supabase
        .from('estimation_prices')
        .update({ is_active: false })
        .eq('price_type', 'material')
        .eq('ref_id', material.id)
        .eq('is_active', true);

      // Insert new price
      await supabase
        .from('estimation_prices')
        .insert({
          price_type: 'material',
          ref_id: material.id,
          price: newPrice,
          currency: 'NGN',
          effective_date: new Date().toISOString().split('T')[0],
          is_active: true,
        });

      // Audit log
      await supabase.from('estimation_audit_log').insert({
        entity_type: 'price',
        entity_id: material.id,
        action: 'price_change',
        new_value: { price: newPrice, currency: 'NGN', material: material.name },
      });

      setSaveMessage({ type: 'success', message: `Price for ${material.name} saved. New estimates will use this price.` });
    } catch (err) {
      setSaveMessage({ type: 'error', message: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }, [prices, materials]);

  const saveProductionMin = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const minQty = parseFloat(outsideOwerriMin);

      if (outsideOwerriMin === '') {
        // If empty, don't set — leave unconfigured
        setSaveMessage({ type: 'success', message: 'Outside Owerri minimum left unconfigured. Production eligibility cannot be determined for outside-Owerri clients until a minimum is set.' });
        return;
      }

      if (isNaN(minQty) || minQty < 0) {
        setSaveMessage({ type: 'error', message: 'Minimum quantity must be a non-negative number.' });
        return;
      }

      // Check if rule already exists
      const existing = productionRules.find(r => r.location_rule === 'outside_owerri');

      if (existing) {
        await supabase
          .from('estimation_production_rules')
          .update({ min_quantity: minQty })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('estimation_production_rules')
          .insert({
            product_category: 'tyrolene',
            quality_slug: null,
            location_rule: 'outside_owerri',
            min_quantity: minQty,
            unit: 'partitions',
            is_active: true,
            description: 'FRELUX Tyrolene production minimum for outside Owerri.',
            sort_order: 21,
          });
      }

      await supabase.from('estimation_audit_log').insert({
        entity_type: 'production_rule',
        action: 'update',
        new_value: { product_category: 'tyrolene', location_rule: 'outside_owerri', min_quantity: minQty },
      });

      setSaveMessage({ type: 'success', message: 'Production minimum saved.' });
    } catch (err) {
      setSaveMessage({ type: 'error', message: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }, [outsideOwerriMin, productionRules]);

  // =========================================================
  // Render
  // =========================================================

  if (loading) {
    return (
      <>
        <AdminHeader title="Tyrolene Config" subtitle="Configure Tyrolene estimation parameters." />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
        </div>
      </>
    );
  }

  const tabs: { id: TabType; label: string; icon: typeof Ruler }[] = [
    { id: 'partition', label: 'Standard Partition', icon: Ruler },
    { id: 'ratio', label: 'Material Ratio', icon: Package },
    { id: 'prices', label: 'Material Prices', icon: DollarSign },
    { id: 'production', label: 'Production', icon: MapPin },
  ];

  return (
    <>
      <AdminHeader title="Tyrolene Config" subtitle="Configure Tyrolene estimation parameters, exterior only, partition-based." />

      {/* Tab Navigation */}
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSaveMessage(null); }}
              className={classNames(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors border',
                activeTab === tab.id
                  ? 'border-brand-purple bg-brand-purple/10 text-brand-purple'
                  : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={classNames(
          'mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm',
          saveMessage.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-800'
        )}>
          {saveMessage.type === 'success'
            ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
          {saveMessage.message}
        </div>
      )}

      {/* Tab Content */}
      {/* Standard Partition Dimensions */}
      {activeTab === 'partition' && (
        <AdminCard>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-brand-purple flex-shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-500">
                Standard partition dimensions (width × height in metres) used as the baseline for Tyrolene estimation.
                When actual partition dimensions differ, the system calculates equivalent standard partitions.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <AdminField label="Standard Partition Width (m)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={partitionWidth}
                  onChange={e => setPartitionWidth(e.target.value)}
                  placeholder="e.g., 3"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                />
              </AdminField>
              <AdminField label="Standard Partition Height (m)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={partitionHeight}
                  onChange={e => setPartitionHeight(e.target.value)}
                  placeholder="e.g., 3"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                />
              </AdminField>
            </div>
            {partitionWidth && partitionHeight && !isNaN(parseFloat(partitionWidth)) && !isNaN(parseFloat(partitionHeight)) && (
              <p className="text-xs text-neutral-400">
                Standard partition area: {(parseFloat(partitionWidth) * parseFloat(partitionHeight)).toFixed(2)}m²
              </p>
            )}
            <AdminButton onClick={savePartitionDimensions} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Dimensions
            </AdminButton>
          </div>
        </AdminCard>
      )}

      {/* Material Ratio */}
      {activeTab === 'ratio' && (
        <AdminCard>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-brand-purple flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-neutral-500">
                  FRELUX verified material ratio. For every {partitionsPerRatio} standard partitions:
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  Changes apply only to new estimates. Historical estimates retain the ratio used at the time of calculation.
                </p>
              </div>
            </div>
            <AdminField label="Partitions per Ratio">
              <input
                type="number"
                min="1"
                value={partitionsPerRatio}
                onChange={e => setPartitionsPerRatio(parseInt(e.target.value) || 4)}
                className="w-32 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              />
            </AdminField>
            <div className="space-y-2">
              {ratioEntries.map((entry, idx) => (
                <div key={entry.slug} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-neutral-700 w-32">{entry.slug.replace(/-/g, ' ')}:</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={entry.quantity}
                    onChange={e => {
                      const updated = [...ratioEntries];
                      updated[idx] = { ...entry, quantity: parseFloat(e.target.value) || 0 };
                      setRatioEntries(updated);
                    }}
                    className="w-24 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                  <span className="text-sm text-neutral-400">{entry.unit}</span>
                </div>
              ))}
            </div>
            <AdminButton onClick={saveMaterialRatio} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Ratio
            </AdminButton>
          </div>
        </AdminCard>
      )}

      {/* Material Prices */}
      {activeTab === 'prices' && (
        <AdminCard>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-brand-purple flex-shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-500">
                Configure the current price for each Tyrolene material. New estimates will use these prices.
                Historical estimates retain the price snapshot from when they were created.
              </p>
            </div>
            {materials.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">No Tyrolene materials found. Run the Tyrolene database migration first.</div>
            ) : (
              <div className="space-y-3">
                {materials.map(mat => (
                  <div key={mat.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900">{mat.name}</p>
                      <p className="text-xs text-neutral-400">{mat.slug} · {mat.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-neutral-400">₦</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={prices[mat.slug] ?? ''}
                        onChange={e => setPrices(prev => ({ ...prev, [mat.slug]: e.target.value }))}
                        placeholder="0.00"
                        className="w-32 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => savePrice(mat.slug)}
                        disabled={saving}
                        className="rounded-lg bg-brand-purple px-3 py-2 text-xs font-medium text-white hover:bg-brand-purple-dark disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdminCard>
      )}

      {/* Production Rules */}
      {activeTab === 'production' && (
        <AdminCard>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-brand-purple flex-shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-500">
                Configure Tyrolene production minimums. Owerri has no minimum (always eligible).
                For outside Owerri, set the minimum partition count or leave empty to indicate
                that production eligibility cannot be determined.
              </p>
            </div>

            {/* Owerri */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-sm font-medium text-green-900">Owerri</p>
              <p className="text-xs text-green-700 mt-1">No minimum, production is always available for clients in Owerri.</p>
            </div>

            {/* Outside Owerri */}
            <div className="rounded-lg border border-neutral-200 p-3">
              <p className="text-sm font-medium text-neutral-900 mb-2">Outside Owerri. Minimum Partitions</p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  value={outsideOwerriMin}
                  onChange={e => setOutsideOwerriMin(e.target.value)}
                  placeholder="Not configured"
                  className="w-40 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                />
                <span className="text-sm text-neutral-400">partitions</span>
                <button
                  onClick={saveProductionMin}
                  disabled={saving}
                  className="rounded-lg bg-brand-purple px-3 py-2 text-xs font-medium text-white hover:bg-brand-purple-dark disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                </button>
              </div>
              {!outsideOwerriMin && (
                <p className="text-xs text-amber-700 mt-2">
                  ⚠ Not configured. Production eligibility cannot be determined for outside-Owerri clients until a minimum is set.
                </p>
              )}
            </div>
          </div>
        </AdminCard>
      )}
    </>
  );
}
