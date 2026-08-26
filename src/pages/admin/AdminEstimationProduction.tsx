/**
 * FRELUX Admin — Estimation Production Rules
 *
 * Manage production minimums for FRELUX paint production.
 * Owerri: no minimum. Outside Owerri: product-specific minimums.
 */

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {AdminHeader,
  AdminCard,
  AdminButton,
  AdminField,
  StateMessage,
  Toggle,
  AdminIconButton,
  AdminInput,
  AdminSelect,
  AdminTextarea} from '@/components/admin/AdminUi';
import { AdminModal } from '@/components/admin/AdminModal';

interface ProductionRule {
  id: string;
  product_category: string;
  quality_slug: string | null;
  location_rule: string;
  min_quantity: number;
  unit: string;
  is_active: boolean;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const PRODUCT_CATEGORIES = [
  { value: 'emulsion', label: 'Emulsion' },
  { value: 'matt', label: 'Matt' },
  { value: 'satin', label: 'Satin' },
];

const QUALITY_SLUGS = [
  { value: '', label: 'All Qualities' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'high_quality', label: 'High Quality' },
];

const LOCATION_RULES = [
  { value: 'owerri', label: 'Owerri' },
  { value: 'outside_owerri', label: 'Outside Owerri' },
];

export default function AdminEstimationProduction() {
  const [rules, setRules] = useState<ProductionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProductionRule | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('estimation_production_rules')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) setError(error.message);
    else setRules(data as ProductionRule[] ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleSave = async (rule: Partial<ProductionRule>) => {
    if (rule.id) {
      const { error } = await supabase
        .from('estimation_production_rules')
        .update(rule)
        .eq('id', rule.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase
        .from('estimation_production_rules')
        .insert(rule);
      if (error) setError(error.message);
    }
    setEditing(null);
    setShowForm(false);
    fetchRules();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this production rule?')) return;
    const { error } = await supabase
      .from('estimation_production_rules')
      .delete()
      .eq('id', id);
    if (error) setError(error.message);
    fetchRules();
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('estimation_production_rules')
      .update({ is_active: !current })
      .eq('id', id);
    if (error) setError(error.message);
    fetchRules();
  };

  return (
    <>
      <AdminHeader
        title="Production Rules"
        subtitle="Manage FRELUX paint production minimums by product and location."
        action={
          <AdminButton onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add Rule
          </AdminButton>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <StateMessage type="loading" title="Loading…" message="Fetching production rules." />
      ) : rules.length === 0 && !showForm ? (
        <StateMessage type="empty" title="No rules found" message="Add production rules to manage minimums." />
      ) : (
        <div className="space-y-6">
          {/* Group rules by Product → Quality → Location */}
          {Object.entries(
            rules.reduce((acc, rule) => {
              const cat = rule.product_category;
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(rule);
              return acc;
            }, {} as Record<string, ProductionRule[]>)
          ).map(([cat, catRules]) => {
            const catLabel = PRODUCT_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
            return (
              <div key={cat}>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
                  {catLabel}
                </h3>
                <div className="space-y-2">
                  {/* Sub-group by quality */}
                  {Object.entries(
                    catRules.reduce((qAcc, rule) => {
                      const q = rule.quality_slug ?? '_all';
                      if (!qAcc[q]) qAcc[q] = [];
                      qAcc[q].push(rule);
                      return qAcc;
                    }, {} as Record<string, ProductionRule[]>)
                  ).map(([qKey, qRules]) => {
                    const qLabel = qKey === '_all' ? 'All Qualities' : QUALITY_SLUGS.find((q) => q.value === qKey)?.label ?? qKey;
                    return (
                      <div key={qKey} className="rounded-lg border border-neutral-200 dark:border-white/10">
                        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 dark:border-white/10 dark:bg-white/5">
                          <span className="text-xs font-semibold text-brand-purple">{qLabel}</span>
                        </div>
                        <div className="divide-y divide-neutral-100 dark:divide-white/5">
                          {qRules.map((rule) => (
                            <div key={rule.id} className="flex items-start justify-between px-4 py-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-white/5 dark:text-neutral-300">
                                    {LOCATION_RULES.find((l) => l.value === rule.location_rule)?.label ?? rule.location_rule}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                                  Minimum: <span className="font-semibold">{rule.min_quantity} {rule.unit}</span>
                                  {rule.description && `, ${rule.description}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Toggle checked={rule.is_active} onChange={() => handleToggleActive(rule.id, rule.is_active)} />
                                <AdminIconButton variant="ghost" onClick={() => { setEditing(rule); setShowForm(true); }} >
                                  <Pencil className="h-4 w-4" />
                                </AdminIconButton>
                                <AdminIconButton variant="danger" onClick={() => handleDelete(rule.id)} >
                                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                                </AdminIconButton>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ProductionRuleForm
          rule={editing}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </>
  );
}

function ProductionRuleForm({
  rule, onSave, onCancel,
}: {
  rule: ProductionRule | null;
  onSave: (rule: Partial<ProductionRule>) => void;
  onCancel: () => void;
}) {
  const [productCategory, setProductCategory] = useState(rule?.product_category ?? 'emulsion');
  const [qualitySlug, setQualitySlug] = useState(rule?.quality_slug ?? '');
  const [locationRule, setLocationRule] = useState(rule?.location_rule ?? 'outside_owerri');
  const [minQuantity, setMinQuantity] = useState(rule?.min_quantity ?? 10);
  const [unit, setUnit] = useState(rule?.unit ?? 'buckets');
  const [description, setDescription] = useState(rule?.description ?? '');
  const [sortOrder, setSortOrder] = useState(rule?.sort_order ?? 0);

  return (
    <AdminModal open onClose={onCancel} title={rule ? 'Edit Rule' : 'Add Production Rule'} maxWidth="max-w-md">

        <div className="space-y-3">
          <AdminField label="Product Category">
            <AdminSelect value={productCategory} onChange={(e) => setProductCategory(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white">
              {PRODUCT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </AdminSelect>
          </AdminField>

          <AdminField label="Quality Level (optional)" hint="Leave as 'All Qualities' for a general minimum.">
            <AdminSelect value={qualitySlug} onChange={(e) => setQualitySlug(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white">
              {QUALITY_SLUGS.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
            </AdminSelect>
          </AdminField>

          <AdminField label="Location Rule">
            <AdminSelect value={locationRule} onChange={(e) => setLocationRule(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white">
              {LOCATION_RULES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </AdminSelect>
          </AdminField>

          <AdminField label="Minimum Quantity" hint="Set to 0 for no minimum (Owerri rule).">
            <AdminInput type="number" value={minQuantity} onChange={(e) => setMinQuantity(parseFloat(e.target.value) || 0)} min={0}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white" />
          </AdminField>

          <AdminField label="Unit">
            <AdminInput type="text" value={unit} onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white" />
          </AdminField>

          <AdminField label="Description (optional)">
            <AdminTextarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white" />
          </AdminField>

          <AdminField label="Sort Order">
            <AdminInput type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white" />
          </AdminField>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <AdminButton variant="secondary" onClick={onCancel}>Cancel</AdminButton>
          <AdminButton onClick={() => onSave({
            id: rule?.id,
            product_category: productCategory,
            quality_slug: qualitySlug || null,
            location_rule: locationRule,
            min_quantity: minQuantity,
            unit,
            description: description || null,
            sort_order: sortOrder,
            is_active: true,
          })}>Save</AdminButton>
        </div>
    </AdminModal>
  );
}
