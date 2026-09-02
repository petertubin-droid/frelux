import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminHeader,
  AdminButton,
  AdminField,
  StateMessage,
  Toggle,
  AdminInput, AdminSelect, AdminTextarea } from '@/components/admin/AdminUi';
import { AdminModal } from '@/components/admin/AdminModal';
import { classNames } from '@/lib/utils';
import type {
  EstimationUnit,
  EstimationPackSize,
  EstimationCalcRule,
  EstimationCalcVersion,
  RuleStatus,
} from '@/types/estimation';

type TabType = 'units' | 'pack_sizes' | 'calc_rules' | 'calc_versions';

const CALCULATOR_TYPES = [
  'painting',
  'tyrolene',
  'grafitex',
  'screeding',
  'pop_ceiling',
  'tile',
];

const PURCHASE_RULES = [
  { value: 'full_pack', label: 'Full Pack' },
  { value: 'minimum_quantity', label: 'Minimum Quantity' },
  { value: 'partial_allowed', label: 'Partial Allowed' },
];

const ROUNDING_RULES = [
  { value: 'ceil', label: 'Ceil (Round Up)' },
  { value: 'floor', label: 'Floor (Round Down)' },
  { value: 'round', label: 'Round (Nearest)' },
  { value: 'none', label: 'None' },
];

const RULE_STATUSES: { value: RuleStatus; label: string }[] = [
  { value: 'verified_frelux', label: 'Verified FRELUX' },
  { value: 'admin_configured', label: 'Admin Configured' },
  { value: 'calculated', label: 'Calculated' },
  { value: 'manual_adjustment', label: 'Manual Adjustment' },
  { value: 'negotiated', label: 'Negotiated' },
];

export default function AdminEstimationConfig() {
  const [activeTab, setActiveTab] = useState<TabType>('units');

  return (
    <>
      <AdminHeader
        title="Estimation Config"
        subtitle="Manage units, pack sizes, calculation rules, and versions."
      />

      {/* Tabs navigation */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3">
        <AdminButton
          type="button"
          onClick={() => setActiveTab('units')}
          className={classNames(
            'rounded-lg px-4 py-2 text-sm font-semibold transition-all',
            activeTab === 'units'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'border border-border bg-card dark:border-white/5 dark:bg-card text-muted-foreground hover:bg-muted/50 dark:hover:bg-white/5 hover:text-brand-purple'
          )}
        >
          Units
        </AdminButton>
        <AdminButton
          type="button"
          onClick={() => setActiveTab('pack_sizes')}
          className={classNames(
            'rounded-lg px-4 py-2 text-sm font-semibold transition-all',
            activeTab === 'pack_sizes'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'border border-border bg-card dark:border-white/5 dark:bg-card text-muted-foreground hover:bg-muted/50 dark:hover:bg-white/5 hover:text-brand-purple'
          )}
        >
          Pack Sizes
        </AdminButton>
        <AdminButton
          type="button"
          onClick={() => setActiveTab('calc_rules')}
          className={classNames(
            'rounded-lg px-4 py-2 text-sm font-semibold transition-all',
            activeTab === 'calc_rules'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'border border-border bg-card dark:border-white/5 dark:bg-card text-muted-foreground hover:bg-muted/50 dark:hover:bg-white/5 hover:text-brand-purple'
          )}
        >
          Calc Rules
        </AdminButton>
        <AdminButton
          type="button"
          onClick={() => setActiveTab('calc_versions')}
          className={classNames(
            'rounded-lg px-4 py-2 text-sm font-semibold transition-all',
            activeTab === 'calc_versions'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'border border-border bg-card dark:border-white/5 dark:bg-card text-muted-foreground hover:bg-muted/50 dark:hover:bg-white/5 hover:text-brand-purple'
          )}
        >
          Calc Versions
        </AdminButton>
      </div>

      {/* Tab Panels */}
      {activeTab === 'units' && <UnitsTab />}
      {activeTab === 'pack_sizes' && <PackSizesTab />}
      {activeTab === 'calc_rules' && <CalcRulesTab />}
      {activeTab === 'calc_versions' && <CalcVersionsTab />}
    </>
  );
}

// =========================================================
// TAB 1: Units (estimation_units)
// =========================================================

function UnitsTab() {
  const [items, setItems] = useState<EstimationUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EstimationUnit | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('estimation_units')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) setError(error.message);
    else setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(item: EstimationUnit) {
    const { error } = await supabase
      .from('estimation_units')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);
    if (error) {
      setError(error.message);
      return;
    }
    setItems((prev) =>
      prev.map((u) => (u.id === item.id ? { ...u, is_active: !u.is_active } : u))
    );
  }

  async function remove(item: EstimationUnit) {
    if (!confirm(`Delete unit "${item.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('estimation_units').delete().eq('id', item.id);
    if (error) {
      setError(error.message);
      return;
    }
    setItems((prev) => prev.filter((u) => u.id !== item.id));
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground dark:text-primary-foreground">Estimation Units</h2>
        <AdminButton
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus aria-hidden="true" className="h-4 w-4" /> Add unit
        </AdminButton>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <StateMessage type="loading" title="Loading…" message="Fetching estimation units." />
      ) : items.length === 0 ? (
        <StateMessage
          type="empty"
          title="No units yet"
          message="Add your first estimation unit to get started."
        />
      ) : (
        <div className="space-y-5">
          {/* Group units by category */}
          {Object.entries(
            items.reduce((acc, item) => {
              const cat = item.category || 'general';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(item);
              return acc;
            }, {} as Record<string, EstimationUnit[]>)
          ).map(([cat, catItems]) => (
            <div key={cat}>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground capitalize">
                {cat}
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {catItems.map((item) => (
                  <div key={item.id} className="card p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-foreground dark:text-primary-foreground">{item.name}</h3>
                        <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-card-foreground dark:text-muted-foreground/60">
                          {item.symbol}
                        </span>
                        {!item.is_active && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
                        Sort order: {item.sort_order}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Toggle checked={item.is_active} onChange={() => toggleActive(item)} />
                      <AdminButton
                        variant="secondary"
                        onClick={() => {
                          setEditing(item);
                          setShowForm(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </AdminButton>
                      <AdminButton variant="danger" onClick={() => remove(item)}>
                        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                      </AdminButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <UnitForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </>
  );
}

function UnitForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: EstimationUnit | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [symbol, setSymbol] = useState(initial?.symbol ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'general');
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSave() {
    if (!name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!symbol.trim()) {
      setFormError('Symbol is required');
      return;
    }
    setSaving(true);
    setFormError(null);

    // Check for duplicate name or symbol (excluding current record when editing)
    const query = supabase
      .from('estimation_units')
      .select('id, name, symbol')
      .or(`name.eq.${name.trim()},symbol.eq.${symbol.trim()}`);
    if (initial) {
      query.neq('id', initial.id);
    }
    const { data: dupes, error: dupErr } = await query;
    if (dupErr) {
      setFormError(dupErr.message);
      setSaving(false);
      return;
    }
    if (dupes && dupes.length > 0) {
      const dupe = dupes[0];
      if (dupe.name.toLowerCase() === name.trim().toLowerCase()) {
        setFormError(`A unit named "${dupe.name}" already exists. Names must be unique.`);
      } else {
        setFormError(`A unit with symbol "${dupe.symbol}" already exists. Symbols must be unique.`);
      }
      setSaving(false);
      return;
    }

    const payload = {
      name: name.trim(),
      symbol: symbol.trim(),
      category: category.trim() || 'general',
      sort_order: sortOrder,
      is_active: isActive,
    };

    const { error } = initial
      ? await supabase.from('estimation_units').update(payload).eq('id', initial.id)
      : await supabase.from('estimation_units').insert(payload);

    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    onSaved();
  }

  return (
    <AdminModal open onClose={onClose} title={initial ? 'Edit unit' : 'Add unit'} maxWidth="max-w-lg">
          <AdminField label="Name">
            <AdminInput
              
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. litres, kilograms, bags"
            />
          </AdminField>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Symbol">
              <AdminInput
                className="font-mono"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="e.g. L, kg, bag"
              />
            </AdminField>
            <AdminField label="Category">
              <AdminSelect
                
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="general">general</option>
                <option value="volume">volume</option>
                <option value="weight">weight</option>
                <option value="area">area</option>
                <option value="count">count</option>
                <option value="other">other</option>
              </AdminSelect>
            </AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Sort order">
              <AdminInput
                type="number"
                
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </AdminField>
            <div>
              <span className="block text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">Active</span>
              <div className="mt-2">
                <Toggle checked={isActive} onChange={setIsActive} />
              </div>
            </div>
          </div>
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <AdminButton variant="secondary" onClick={onClose}>
              Cancel
            </AdminButton>
            <AdminButton onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </AdminButton>
          </div>
    </AdminModal>
  );
}

// =========================================================
// TAB 2: Pack Sizes (estimation_pack_sizes)
// =========================================================

interface RefItem {
  id: string;
  name: string;
}

function PackSizesTab() {
  const [packSizes, setPackSizes] = useState<EstimationPackSize[]>([]);
  const [units, setUnits] = useState<EstimationUnit[]>([]);
  const [refMap, setRefMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EstimationPackSize | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [psRes, unitsRes, prodRes, matRes, qualRes] = await Promise.all([
      supabase.from('estimation_pack_sizes').select('*').order('sort_order', { ascending: true }),
      supabase.from('estimation_units').select('*').order('sort_order', { ascending: true }),
      supabase.from('estimation_products').select('id, name'),
      supabase.from('estimation_materials').select('id, name'),
      supabase.from('estimation_product_quality').select('id, name'),
    ]);

    if (psRes.error) {
      setError(psRes.error.message);
      setLoading(false);
      return;
    }

    setPackSizes(psRes.data ?? []);
    setUnits(unitsRes.data ?? []);

    const nameMap: Record<string, string> = {};
    (prodRes.data ?? []).forEach((item: RefItem) => {
      nameMap[item.id] = `Product: ${item.name}`;
    });
    (matRes.data ?? []).forEach((item: RefItem) => {
      nameMap[item.id] = `Material: ${item.name}`;
    });
    (qualRes.data ?? []).forEach((item: RefItem) => {
      nameMap[item.id] = `Quality: ${item.name}`;
    });
    setRefMap(nameMap);

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(item: EstimationPackSize) {
    const { error } = await supabase
      .from('estimation_pack_sizes')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);
    if (error) {
      setError(error.message);
      return;
    }
    setPackSizes((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, is_active: !p.is_active } : p))
    );
  }

  async function remove(item: EstimationPackSize) {
    if (!confirm('Delete this pack size configuration? This cannot be undone.')) return;
    const { error } = await supabase.from('estimation_pack_sizes').delete().eq('id', item.id);
    if (error) {
      setError(error.message);
      return;
    }
    setPackSizes((prev) => prev.filter((p) => p.id !== item.id));
  }

  const unitMap = new Map(units.map((u) => [u.id, u]));

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground dark:text-primary-foreground">Pack Sizes</h2>
        <AdminButton
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus aria-hidden="true" className="h-4 w-4" /> Add pack size
        </AdminButton>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <StateMessage type="loading" title="Loading…" message="Fetching pack sizes." />
      ) : packSizes.length === 0 ? (
        <StateMessage
          type="empty"
          title="No pack sizes yet"
          message="Add your first pack size to get started."
        />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {packSizes.map((item) => {
            const unit = item.pack_unit_id ? unitMap.get(item.pack_unit_id) : null;
            const refName = refMap[item.ref_id] ?? item.ref_id;

            return (
              <div key={item.id} className="card p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700 capitalize">
                      {item.ref_type}
                    </span>
                    <h3 className="text-base font-bold text-foreground truncate">{refName}</h3>
                    {!item.is_active && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground dark:text-muted-foreground">
                    <span>
                      Pack size:{' '}
                      <strong className="text-foreground dark:text-primary-foreground">
                        {item.pack_size} {unit?.symbol ?? ''}
                      </strong>
                    </span>
                    <span>·</span>
                    <span>Purchase rule: {item.purchase_rule}</span>
                    <span>·</span>
                    <span>Min qty: {item.min_quantity}</span>
                    <span>·</span>
                    <span>Rounding: {item.rounding_rule}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Toggle checked={item.is_active} onChange={() => toggleActive(item)} />
                  <AdminButton
                    variant="secondary"
                    onClick={() => {
                      setEditing(item);
                      setShowForm(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </AdminButton>
                  <AdminButton variant="danger" onClick={() => remove(item)}>
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </AdminButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <PackSizeForm
          initial={editing}
          units={units}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </>
  );
}

function PackSizeForm({
  initial,
  units,
  onClose,
  onSaved,
}: {
  initial: EstimationPackSize | null;
  units: EstimationUnit[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [refType, setRefType] = useState<'product' | 'material' | 'quality'>(
    initial?.ref_type ?? 'product'
  );
  const [refId, setRefId] = useState(initial?.ref_id ?? '');
  const [packSize, setPackSize] = useState<number>(initial?.pack_size ?? 1);
  const [packUnitId, setPackUnitId] = useState<string>(
    initial?.pack_unit_id ?? (units[0]?.id || '')
  );
  const [purchaseRule, setPurchaseRule] = useState<string>(initial?.purchase_rule ?? 'full_pack');
  const [minQuantity, setMinQuantity] = useState<number>(initial?.min_quantity ?? 1);
  const [roundingRule, setRoundingRule] = useState<string>(initial?.rounding_rule ?? 'ceil');
  const [sortOrder, setSortOrder] = useState<number>(initial?.sort_order ?? 0);
  const [isActive, setIsActive] = useState<boolean>(initial?.is_active ?? true);

  const [refOptions, setRefOptions] = useState<{ id: string; name: string }[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load referenced options based on selected refType
  useEffect(() => {
    let isMounted = true;
    async function fetchRefOptions() {
      setLoadingRefs(true);
      let data: { id: string; name: string }[] | null = null;

      if (refType === 'product') {
        const res = await supabase.from('estimation_products').select('id, name').order('name');
        data = res.data;
      } else if (refType === 'material') {
        const res = await supabase.from('estimation_materials').select('id, name').order('name');
        data = res.data;
      } else if (refType === 'quality') {
        const res = await supabase.from('estimation_product_quality').select('id, name').order('name');
        data = res.data;
      }

      if (isMounted) {
        setRefOptions(data ?? []);
        setLoadingRefs(false);
      }
    }
    fetchRefOptions();
    return () => {
      isMounted = false;
    };
  }, [refType]);

  async function onSave() {
    if (!refId.trim()) {
      setFormError('Referenced ID or item is required');
      return;
    }
    if (packSize <= 0) {
      setFormError('Pack size must be greater than 0');
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      ref_type: refType,
      ref_id: refId.trim(),
      pack_size: packSize,
      pack_unit_id: packUnitId || null,
      purchase_rule: purchaseRule,
      min_quantity: minQuantity,
      rounding_rule: roundingRule,
      sort_order: sortOrder,
      is_active: isActive,
    };

    const { error } = initial
      ? await supabase.from('estimation_pack_sizes').update(payload).eq('id', initial.id)
      : await supabase.from('estimation_pack_sizes').insert(payload);

    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    onSaved();
  }

  return (
    <AdminModal open onClose={onClose} title={initial ? 'Edit pack size' : 'Add pack size'} maxWidth="max-w-lg">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Reference Type">
              <AdminSelect
                
                value={refType}
                onChange={(e) => {
                  setRefType(e.target.value as 'product' | 'material' | 'quality');
                  setRefId('');
                }}
              >
                <option value="product">Product</option>
                <option value="material">Material</option>
                <option value="quality">Quality Level</option>
              </AdminSelect>
            </AdminField>

            <AdminField label="Referenced Item">
              {loadingRefs ? (
                <div className="py-2 text-xs text-muted-foreground dark:text-muted-foreground">Loading items…</div>
              ) : refOptions.length > 0 ? (
                <AdminSelect
                  
                  value={refId}
                  onChange={(e) => setRefId(e.target.value)}
                >
                  <option value="">-- Select {refType} --</option>
                  {refOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </AdminSelect>
              ) : (
                <AdminInput
                  className="font-mono"
                  value={refId}
                  onChange={(e) => setRefId(e.target.value)}
                  placeholder="UUID of target item"
                />
              )}
            </AdminField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Pack Size">
              <AdminInput
                type="number"
                step="any"
                min="0.001"
                
                value={packSize}
                onChange={(e) => setPackSize(Number(e.target.value))}
              />
            </AdminField>

            <AdminField label="Pack Unit">
              <AdminSelect
                
                value={packUnitId}
                onChange={(e) => setPackUnitId(e.target.value)}
              >
                <option value="">-- No unit --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Purchase Rule">
              <AdminSelect
                
                value={purchaseRule}
                onChange={(e) => setPurchaseRule(e.target.value)}
              >
                {PURCHASE_RULES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>

            <AdminField label="Min Quantity">
              <AdminInput
                type="number"
                step="any"
                min="0"
                
                value={minQuantity}
                onChange={(e) => setMinQuantity(Number(e.target.value))}
              />
            </AdminField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Rounding Rule">
              <AdminSelect
                
                value={roundingRule}
                onChange={(e) => setRoundingRule(e.target.value)}
              >
                {ROUNDING_RULES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>

            <AdminField label="Sort Order">
              <AdminInput
                type="number"
                
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </AdminField>
          </div>

          <div>
            <span className="block text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">Active</span>
            <div className="mt-2">
              <Toggle checked={isActive} onChange={setIsActive} />
            </div>
          </div>

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <AdminButton variant="secondary" onClick={onClose}>
              Cancel
            </AdminButton>
            <AdminButton onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </AdminButton>
          </div>
    </AdminModal>
  );
}

// =========================================================
// TAB 3: Calc Rules (estimation_calc_rules)
// =========================================================

function getRuleStatusBadge(status: RuleStatus | string) {
  switch (status) {
    case 'verified_frelux':
      return (
        <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
          Verified FRELUX
        </span>
      );
    case 'admin_configured':
      return (
        <span className="rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
          Admin Configured
        </span>
      );
    case 'calculated':
      return (
        <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-semibold text-card-foreground dark:text-muted-foreground/60">
          Calculated
        </span>
      );
    case 'manual_adjustment':
      return (
        <span className="rounded-full border border-orange-200 bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
          Manual Adjustment
        </span>
      );
    case 'negotiated':
      return (
        <span className="rounded-full border border-purple-200 bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
          Negotiated
        </span>
      );
    default:
      return (
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
          {status}
        </span>
      );
  }
}

function CalcRulesTab() {
  const [rules, setRules] = useState<EstimationCalcRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EstimationCalcRule | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('estimation_calc_rules')
      .select('*')
      .order('rule_key');
    if (error) setError(error.message);
    else setRules(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(rule: EstimationCalcRule) {
    const { error } = await supabase
      .from('estimation_calc_rules')
      .update({ is_active: !rule.is_active })
      .eq('id', rule.id);
    if (error) {
      setError(error.message);
      return;
    }
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
    );
  }

  async function remove(rule: EstimationCalcRule) {
    if (!confirm(`Delete rule "${rule.rule_key}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('estimation_calc_rules').delete().eq('id', rule.id);
    if (error) {
      setError(error.message);
      return;
    }
    setRules((prev) => prev.filter((r) => r.id !== rule.id));
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground dark:text-primary-foreground">Calculation Rules</h2>
        <AdminButton
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus aria-hidden="true" className="h-4 w-4" /> Add calc rule
        </AdminButton>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <StateMessage type="loading" title="Loading…" message="Fetching calculation rules." />
      ) : rules.length === 0 ? (
        <StateMessage
          type="empty"
          title="No calculation rules yet"
          message="Add your first calculation rule to get started."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rules.map((rule) => (
            <div key={rule.id} className="card p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-mono text-base font-bold text-foreground dark:text-primary-foreground">
                    {rule.rule_key}
                  </h3>
                  {getRuleStatusBadge(rule.rule_status)}
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {rule.calculator_type ?? 'Global'}
                  </span>
                  {!rule.is_active && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>

                {rule.description && (
                  <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">{rule.description}</p>
                )}

                <div className="mt-2 rounded-lg bg-muted/50 dark:bg-white/5 p-2.5 border border-border">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
                    Rule Value (JSON)
                  </span>
                  <pre className="mt-1 max-h-24 overflow-x-auto font-mono text-xs text-foreground">
                    {JSON.stringify(rule.rule_value, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3 pt-1">
                <Toggle checked={rule.is_active} onChange={() => toggleActive(rule)} />
                <AdminButton
                  variant="secondary"
                  onClick={() => {
                    setEditing(rule);
                    setShowForm(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </AdminButton>
                <AdminButton variant="danger" onClick={() => remove(rule)}>
                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                </AdminButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CalcRuleForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </>
  );
}

function CalcRuleForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: EstimationCalcRule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [ruleKey, setRuleKey] = useState(initial?.rule_key ?? '');
  const [calculatorType, setCalculatorType] = useState<string>(
    initial?.calculator_type ?? ''
  );
  const [ruleValueStr, setRuleValueStr] = useState<string>(
    initial?.rule_value !== undefined ? JSON.stringify(initial.rule_value, null, 2) : '{\n  "value": 1\n}'
  );
  const [ruleStatus, setRuleStatus] = useState<RuleStatus>(
    initial?.rule_status ?? 'admin_configured'
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSave() {
    if (!ruleKey.trim()) {
      setFormError('Rule key is required');
      return;
    }

    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(ruleValueStr);
    } catch {
      setFormError('Rule value must be valid JSON (e.g. {"value": 10} or 2.5)');
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      rule_key: ruleKey.trim(),
      calculator_type: calculatorType.trim() || null,
      rule_value: parsedValue,
      rule_status: ruleStatus,
      description: description.trim() || null,
      is_active: isActive,
    };

    const { error } = initial
      ? await supabase.from('estimation_calc_rules').update(payload).eq('id', initial.id)
      : await supabase.from('estimation_calc_rules').insert(payload);

    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    onSaved();
  }

  return (
    <AdminModal open onClose={onClose} title={initial ? 'Edit calculation rule' : 'Add calculation rule'} maxWidth="max-w-lg">
          <AdminField label="Rule Key">
            <AdminInput
              className="font-mono"
              value={ruleKey}
              onChange={(e) => setRuleKey(e.target.value)}
              placeholder="e.g. standard_room_height"
            />
          </AdminField>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Calculator Type">
              <AdminSelect
                
                value={calculatorType}
                onChange={(e) => setCalculatorType(e.target.value)}
              >
                <option value="">Global (All Calculators)</option>
                {CALCULATOR_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>

            <AdminField label="Rule Status">
              <AdminSelect
                
                value={ruleStatus}
                onChange={(e) => setRuleStatus(e.target.value as RuleStatus)}
              >
                {RULE_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
          </div>

          <AdminField label="Rule Value (JSON text input)" hint="Must be valid JSON formatting">
            <AdminTextarea
              className="font-mono text-xs"
              rows={4}
              value={ruleValueStr}
              onChange={(e) => setRuleValueStr(e.target.value)}
              placeholder='{"value": 10}'
            />
          </AdminField>

          <AdminField label="Description">
            <AdminTextarea
              
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the purpose and usage of this calculation rule"
            />
          </AdminField>

          <div>
            <span className="block text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">Active</span>
            <div className="mt-2">
              <Toggle checked={isActive} onChange={setIsActive} />
            </div>
          </div>

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <AdminButton variant="secondary" onClick={onClose}>
              Cancel
            </AdminButton>
            <AdminButton onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </AdminButton>
          </div>
    </AdminModal>
  );
}

// =========================================================
// TAB 4: Calc Versions (estimation_calc_versions)
// =========================================================

function CalcVersionsTab() {
  const [versions, setVersions] = useState<EstimationCalcVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EstimationCalcVersion | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('estimation_calc_versions')
      .select('*')
      .order('calculator_type')
      .order('version_number', { ascending: false });
    if (error) setError(error.message);
    else setVersions(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(ver: EstimationCalcVersion) {
    const { error } = await supabase
      .from('estimation_calc_versions')
      .update({ is_active: !ver.is_active })
      .eq('id', ver.id);
    if (error) {
      setError(error.message);
      return;
    }
    setVersions((prev) =>
      prev.map((v) => (v.id === ver.id ? { ...v, is_active: !v.is_active } : v))
    );
  }

  async function remove(ver: EstimationCalcVersion) {
    if (
      !confirm(
        `Delete version ${ver.version_number} for "${ver.calculator_type}"? This cannot be undone.`
      )
    )
      return;
    const { error } = await supabase.from('estimation_calc_versions').delete().eq('id', ver.id);
    if (error) {
      setError(error.message);
      return;
    }
    setVersions((prev) => prev.filter((v) => v.id !== ver.id));
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground dark:text-primary-foreground">Calculation Versions</h2>
        <AdminButton
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus aria-hidden="true" className="h-4 w-4" /> Add version
        </AdminButton>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <StateMessage type="loading" title="Loading…" message="Fetching calculation versions." />
      ) : versions.length === 0 ? (
        <StateMessage
          type="empty"
          title="No calculation versions yet"
          message="Add your first calculation version to get started."
        />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {versions.map((ver) => (
            <div key={ver.id} className="card p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700 capitalize">
                    {ver.calculator_type}
                  </span>
                  <h3 className="text-base font-bold text-foreground dark:text-primary-foreground">
                    v{ver.version_number}{' '}
                    {ver.version_label ? `(${ver.version_label})` : ''}
                  </h3>
                  {!ver.is_active && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>
                {ver.description && (
                  <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">{ver.description}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Toggle checked={ver.is_active} onChange={() => toggleActive(ver)} />
                <AdminButton
                  variant="secondary"
                  onClick={() => {
                    setEditing(ver);
                    setShowForm(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </AdminButton>
                <AdminButton variant="danger" onClick={() => remove(ver)}>
                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                </AdminButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CalcVersionForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </>
  );
}

function CalcVersionForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: EstimationCalcVersion | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [calculatorType, setCalculatorType] = useState<string>(
    initial?.calculator_type ?? CALCULATOR_TYPES[0]
  );
  const [versionNumber, setVersionNumber] = useState<number>(
    initial?.version_number ?? 1
  );
  const [versionLabel, setVersionLabel] = useState<string>(
    initial?.version_label ?? ''
  );
  const [description, setDescription] = useState<string>(
    initial?.description ?? ''
  );
  const [isActive, setIsActive] = useState<boolean>(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSave() {
    if (!calculatorType.trim()) {
      setFormError('Calculator type is required');
      return;
    }
    if (versionNumber <= 0) {
      setFormError('Version number must be a positive integer');
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      calculator_type: calculatorType.trim(),
      version_number: versionNumber,
      version_label: versionLabel.trim() || null,
      description: description.trim() || null,
      is_active: isActive,
    };

    const { error } = initial
      ? await supabase.from('estimation_calc_versions').update(payload).eq('id', initial.id)
      : await supabase.from('estimation_calc_versions').insert(payload);

    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    onSaved();
  }

  return (
    <AdminModal open onClose={onClose} title={initial ? 'Edit calculation version' : 'Add calculation version'} maxWidth="max-w-lg">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Calculator Type">
              <AdminSelect
                
                value={calculatorType}
                onChange={(e) => setCalculatorType(e.target.value)}
              >
                {CALCULATOR_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>

            <AdminField label="Version Number">
              <AdminInput
                type="number"
                min="1"
                step="1"
                
                value={versionNumber}
                onChange={(e) => setVersionNumber(Number(e.target.value))}
              />
            </AdminField>
          </div>

          <AdminField label="Version Label" hint="Optional, e.g. 'v1.0' or 'Beta release'">
            <AdminInput
              
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              placeholder="e.g. v1.0"
            />
          </AdminField>

          <AdminField label="Description">
            <AdminTextarea
              
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details about changes or features in this version"
            />
          </AdminField>

          <div>
            <span className="block text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">Active</span>
            <div className="mt-2">
              <Toggle checked={isActive} onChange={setIsActive} />
            </div>
          </div>

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <AdminButton variant="secondary" onClick={onClose}>
              Cancel
            </AdminButton>
            <AdminButton onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </AdminButton>
          </div>
    </AdminModal>
  );
}
