import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, History, Search, Filter, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminHeader, AdminCard, AdminButton, AdminField, StateMessage, Toggle } from '@/components/admin/AdminUi';

interface PriceItem {
  id: string;
  price_type: 'product' | 'quality' | 'material';
  ref_id: string;
  price: number;
  currency: string;
  pack_size_id: string | null;
  effective_date: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PriceHistoryItem {
  id: string;
  price_type: 'product' | 'quality' | 'material';
  ref_id: string;
  old_price: number | null;
  new_price: number;
  currency: string;
  changed_by: string | null;
  change_reason: string | null;
  created_at: string;
}

interface RefOption {
  id: string;
  name: string;
  type: 'product' | 'quality' | 'material';
  detail?: string;
}

interface PackSizeOption {
  id: string;
  ref_id: string;
  pack_size: number;
}

function formatCurrency(amount: number, currency: string = 'NGN'): string {
  const symbol = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `;
  return `${symbol}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getPriceTypeBadge(type: 'product' | 'quality' | 'material') {
  switch (type) {
    case 'product':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'quality':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'material':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    default:
      return 'bg-neutral-100 text-neutral-700 border-neutral-200';
  }
}

export default function AdminEstimationPricing() {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [refOptions, setRefOptions] = useState<RefOption[]>([]);
  const [packSizes, setPackSizes] = useState<PackSizeOption[]>([]);
  const [refMap, setRefMap] = useState<Record<string, RefOption>>({});
  const [packSizeMap, setPackSizeMap] = useState<Record<string, number>>({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PriceItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // History modal state
  const [historyItem, setHistoryItem] = useState<PriceItem | null>(null);

  // Search & Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'product' | 'quality' | 'material'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadReferenceData = useCallback(async () => {
    try {
      const [pRes, qRes, mRes, psRes] = await Promise.all([
        supabase.from('estimation_products').select('id, name, category'),
        supabase.from('estimation_product_quality').select('id, name, product_id'),
        supabase.from('estimation_materials').select('id, name, category'),
        supabase.from('estimation_pack_sizes').select('id, ref_id, pack_size'),
      ]);

      const options: RefOption[] = [];
      const map: Record<string, RefOption> = {};

      if (pRes.data) {
        pRes.data.forEach((p) => {
          const item: RefOption = { id: p.id, name: p.name, type: 'product', detail: p.category };
          options.push(item);
          map[p.id] = item;
        });
      }

      if (qRes.data) {
        qRes.data.forEach((q) => {
          const item: RefOption = { id: q.id, name: q.name, type: 'quality', detail: 'Quality Level' };
          options.push(item);
          map[q.id] = item;
        });
      }

      if (mRes.data) {
        mRes.data.forEach((m) => {
          const item: RefOption = { id: m.id, name: m.name, type: 'material', detail: m.category };
          options.push(item);
          map[m.id] = item;
        });
      }

      const psMap: Record<string, number> = {};
      const psOpts: PackSizeOption[] = [];
      if (psRes.data) {
        psRes.data.forEach((ps) => {
          psMap[ps.id] = ps.pack_size;
          psOpts.push({ id: ps.id, ref_id: ps.ref_id, pack_size: ps.pack_size });
        });
      }

      setRefOptions(options);
      setRefMap(map);
      setPackSizes(psOpts);
      setPackSizeMap(psMap);
    } catch {
      // Ignore reference lookup errors gracefully
    }
  }, []);

  const loadPrices = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('estimation_prices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setItems((data as PriceItem[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPrices();
    loadReferenceData();
  }, [loadPrices, loadReferenceData]);

  async function toggleActive(item: PriceItem) {
    const { error } = await supabase
      .from('estimation_prices')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);

    if (error) {
      setError(error.message);
      return;
    }

    setItems((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, is_active: !p.is_active } : p))
    );
  }

  async function remove(item: PriceItem) {
    const refName = refMap[item.ref_id]?.name || item.ref_id;
    if (!confirm(`Delete price record for "${refName}" (${formatCurrency(item.price, item.currency)})? This cannot be undone.`)) {
      return;
    }

    const { error } = await supabase.from('estimation_prices').delete().eq('id', item.id);
    if (error) {
      setError(error.message);
      return;
    }

    setItems((prev) => prev.filter((p) => p.id !== item.id));
  }

  const filteredItems = items.filter((item) => {
    if (typeFilter !== 'all' && item.price_type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const refName = (refMap[item.ref_id]?.name || '').toLowerCase();
      const refId = item.ref_id.toLowerCase();
      const notes = (item.notes || '').toLowerCase();
      return refName.includes(q) || refId.includes(q) || notes.includes(q);
    }
    return true;
  });

  return (
    <>
      <AdminHeader
        title="Estimation Pricing"
        subtitle="Manage base prices and active currency rates for products, quality levels, and materials."
        action={
          <AdminButton onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Add Price
          </AdminButton>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-400" />
          <div className="flex rounded-lg border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid dark:border-white/5 dark:bg-brand-navy-mid p-1 text-xs font-medium">
            {(['all', 'product', 'quality', 'material'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(type)}
                className={`rounded-md px-3 py-1.5 capitalize transition-colors ${
                  typeFilter === type
                    ? 'bg-brand-purple text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search price items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field dark:bg-brand-navy-mid dark:border-white/10 pl-9 text-xs"
          />
        </div>
      </div>

      {loading ? (
        <StateMessage type="loading" title="Loading pricing..." message="Fetching price configuration records." />
      ) : filteredItems.length === 0 ? (
        <StateMessage
          type="empty"
          title="No price records found"
          message={searchQuery || typeFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Add your first price record to configure calculation pricing.'}
        />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const refInfo = refMap[item.ref_id];
            const packSizeVal = item.pack_size_id ? packSizeMap[item.pack_size_id] : null;

            return (
              <div key={item.id} className="card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${getPriceTypeBadge(item.price_type)}`}>
                        {item.price_type}
                      </span>
                      <h3 className="truncate text-xs font-bold text-brand-navy dark:text-white">
                        {refInfo ? refInfo.name : `Ref: ${item.ref_id.slice(0, 8)}...`}
                      </h3>
                      {!item.is_active && <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-600">Off</span>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">
                      {packSizeVal && <span>Pack: {packSizeVal}</span>}
                      <span className="inline-flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" />{item.effective_date}</span>
                    </div>
                    {item.notes && <p className="mt-0.5 line-clamp-1 text-[10px] italic text-neutral-400">{item.notes}</p>}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-brand-navy dark:text-white">{formatCurrency(item.price, item.currency)}</span>
                    <span className="text-[9px] uppercase text-neutral-400">{item.currency}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Toggle checked={item.is_active} onChange={() => toggleActive(item)} />
                    <button type="button" onClick={() => setHistoryItem(item)} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-brand-purple dark:hover:bg-white/10" title="History"><History className="h-3 w-3" /></button>
                    <button type="button" onClick={() => { setEditing(item); setShowForm(true); }} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-brand-purple dark:hover:bg-white/10"><Pencil className="h-3 w-3" /></button>
                    <button type="button" onClick={() => remove(item)} className="rounded-md p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <PricingForm
          initial={editing}
          refOptions={refOptions}
          packSizes={packSizes}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            loadPrices();
          }}
        />
      )}

      {/* Price History Modal */}
      {historyItem && (
        <PriceHistoryModal
          item={historyItem}
          refName={refMap[historyItem.ref_id]?.name || historyItem.ref_id}
          onClose={() => setHistoryItem(null)}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────
// Form Modal Component
// ─────────────────────────────────────────────────────────
function PricingForm({
  initial,
  refOptions,
  packSizes,
  onClose,
  onSaved,
}: {
  initial: PriceItem | null;
  refOptions: RefOption[];
  packSizes: PackSizeOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [priceType, setPriceType] = useState<'product' | 'quality' | 'material'>(
    initial?.price_type ?? 'product'
  );
  const [refId, setRefId] = useState(initial?.ref_id ?? '');
  const [customRefId, setCustomRefId] = useState('');
  const [useCustomRef, setUseCustomRef] = useState(false);
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [currency, setCurrency] = useState(initial?.currency ?? 'NGN');
  const [packSizeId, setPackSizeId] = useState(initial?.pack_size_id ?? '');
  const [effectiveDate, setEffectiveDate] = useState(
    initial?.effective_date ?? new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filter reference options by selected price_type
  const filteredRefOptions = refOptions.filter((r) => r.type === priceType);

  // Filter pack sizes matching selected ref_id
  const filteredPackSizes = packSizes.filter(
    (ps) => !refId || ps.ref_id === refId
  );

  useEffect(() => {
    // Reset refId if switching price_type unless editing existing item with matching type
    if (initial && initial.price_type === priceType) {
      setRefId(initial.ref_id);
    } else if (filteredRefOptions.length > 0) {
      setRefId(filteredRefOptions[0].id);
    } else {
      setRefId('');
    }
  }, [priceType, initial, filteredRefOptions]);

  async function onSave() {
    const finalRefId = useCustomRef ? customRefId.trim() : refId.trim();

    if (!finalRefId) {
      setFormError('Target reference ID is required');
      return;
    }
    if (isNaN(price) || price < 0) {
      setFormError('Price must be greater than or equal to 0');
      return;
    }
    if (!currency.trim()) {
      setFormError('Currency code is required');
      return;
    }
    if (!effectiveDate) {
      setFormError('Effective date is required');
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      price_type: priceType,
      ref_id: finalRefId,
      price: Math.max(0, Number(price) || 0),
      currency: currency.trim().toUpperCase(),
      pack_size_id: packSizeId.trim() || null,
      effective_date: effectiveDate,
      notes: notes.trim() || null,
      is_active: isActive,
    };

    const { error } = initial
      ? await supabase.from('estimation_prices').update(payload).eq('id', initial.id)
      : await supabase.from('estimation_prices').insert(payload);

    setSaving(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-navy dark:text-white">
            {initial ? 'Edit Price Record' : 'Add Price Record'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <AdminField label="Price Type">
            <select
              className="input-field dark:bg-brand-navy-mid dark:border-white/10"
              value={priceType}
              onChange={(e) => setPriceType(e.target.value as 'product' | 'quality' | 'material')}
            >
              <option value="product">Product Price</option>
              <option value="quality">Quality Level Price</option>
              <option value="material">Material Price</option>
            </select>
          </AdminField>

          <AdminField label="Target Item">
            {!useCustomRef && filteredRefOptions.length > 0 ? (
              <div className="space-y-1.5">
                <select
                  className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                  value={refId}
                  onChange={(e) => setRefId(e.target.value)}
                >
                  {filteredRefOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name} {opt.detail ? `(${opt.detail})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setUseCustomRef(true)}
                  className="text-xs text-brand-purple hover:underline"
                >
                  Enter manual UUID
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Paste UUID ref_id"
                  className="input-field dark:bg-brand-navy-mid dark:border-white/10 font-mono text-xs"
                  value={useCustomRef ? customRefId : refId}
                  onChange={(e) =>
                    useCustomRef ? setCustomRefId(e.target.value) : setRefId(e.target.value)
                  }
                />
                {filteredRefOptions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setUseCustomRef(false)}
                    className="text-xs text-brand-purple hover:underline"
                  >
                    Select from catalog list
                  </button>
                )}
              </div>
            )}
          </AdminField>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Price Amount">
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field dark:bg-brand-navy-mid dark:border-white/10 font-semibold"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </AdminField>

            <AdminField label="Currency">
              <select
                className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </AdminField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Pack Size (Optional)">
              <select
                className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                value={packSizeId}
                onChange={(e) => setPackSizeId(e.target.value)}
              >
                <option value="">-- No Specific Pack Size --</option>
                {filteredPackSizes.map((ps) => (
                  <option key={ps.id} value={ps.id}>
                    Pack Size: {ps.pack_size}
                  </option>
                ))}
              </select>
            </AdminField>

            <AdminField label="Effective Date">
              <input
                type="date"
                className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </AdminField>
          </div>

          <AdminField label="Notes / Comments">
            <textarea
              className="input-field dark:bg-brand-navy-mid dark:border-white/10"
              rows={2}
              placeholder="e.g. Standard wholesale pricing updated for Q3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </AdminField>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Is Active</span>
            <Toggle checked={isActive} onChange={setIsActive} />
          </div>

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <AdminButton variant="secondary" onClick={onClose}>
              Cancel
            </AdminButton>
            <AdminButton onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Price'}
            </AdminButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Price History Modal Component
// ─────────────────────────────────────────────────────────
function PriceHistoryModal({
  item,
  refName,
  onClose,
}: {
  item: PriceItem;
  refName: string;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<PriceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('estimation_price_history')
        .select('*')
        .eq('ref_id', item.ref_id)
        .eq('price_type', item.price_type)
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setHistory((data as PriceHistoryItem[]) ?? []);
      }
      setLoading(false);
    }

    loadHistory();
  }, [item.ref_id, item.price_type]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-brand-navy dark:text-white">Price History</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
              {refName} ({item.price_type})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <StateMessage type="loading" title="Loading history..." message="Fetching price logs." />
          ) : history.length === 0 ? (
            <StateMessage
              type="empty"
              title="No history recorded yet"
              message="Price history logs are created automatically whenever price changes occur."
            />
          ) : (
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="rounded-lg border border-neutral-200 p-3 text-xs bg-neutral-50 dark:bg-white/5">
                  <div className="flex items-center justify-between font-medium text-neutral-800">
                    <span className="flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5 text-brand-purple" />
                      {h.old_price !== null ? (
                        <span>
                          <span className="line-through text-neutral-400 dark:text-neutral-500">
                            {formatCurrency(h.old_price, h.currency)}
                          </span>{' '}
                          →{' '}
                          <span className="font-bold text-brand-navy dark:text-white">
                            {formatCurrency(h.new_price, h.currency)}
                          </span>
                        </span>
                      ) : (
                        <span className="font-bold text-brand-navy dark:text-white">
                          Initial Price: {formatCurrency(h.new_price, h.currency)}
                        </span>
                      )}
                    </span>
                    <span className="text-neutral-400 dark:text-neutral-500">
                      {new Date(h.created_at).toLocaleString()}
                    </span>
                  </div>

                  {h.change_reason && (
                    <p className="mt-1 text-neutral-600 italic">Reason: {h.change_reason}</p>
                  )}

                  {h.changed_by && (
                    <p className="mt-0.5 text-[10px] text-neutral-400 font-mono">
                      Changed by: {h.changed_by}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t flex justify-end">
          <AdminButton variant="secondary" onClick={onClose}>
            Close
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
