import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { EstimationMaterial, EstimationUnit } from '@/types/estimation';
import { AdminHeader, AdminCard, AdminButton, AdminField, StateMessage, Toggle, CollapsibleGroup, GroupControls } from '@/components/admin/AdminUi';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminEstimationMaterials() {
  const [items, setItems] = useState<EstimationMaterial[]>([]);
  const [units, setUnits] = useState<EstimationUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EstimationMaterial | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Fetch units for dropdowns and unit name display
    const { data: unitsData, error: unitsError } = await supabase
      .from('estimation_units')
      .select('*')
      .order('sort_order');

    if (unitsError) {
      setError(unitsError.message);
      setLoading(false);
      return;
    }

    setUnits(unitsData ?? []);

    // Fetch materials
    const { data, error: materialsError } = await supabase
      .from('estimation_materials')
      .select('*')
      .order('sort_order');

    if (materialsError) {
      setError(materialsError.message);
    } else {
      setItems(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(item: EstimationMaterial) {
    const { error } = await supabase
      .from('estimation_materials')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);

    if (error) {
      setError(error.message);
      return;
    }

    setItems((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, is_active: !m.is_active } : m))
    );
  }

  async function remove(item: EstimationMaterial) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;

    const { error } = await supabase
      .from('estimation_materials')
      .delete()
      .eq('id', item.id);

    if (error) {
      setError(error.message);
      return;
    }

    setItems((prev) => prev.filter((m) => m.id !== item.id));
  }

  const unitMap = units.reduce<Record<string, EstimationUnit>>((acc, u) => {
    acc[u.id] = u;
    return acc;
  }, {});

  const filtered = search
    ? items.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.category.toLowerCase().includes(search.toLowerCase()))
    : items;

  // Group materials by category so the list reads as organized sections
  // instead of one long flat scroll.
  const groupOrder: string[] = [];
  const groupMap = new Map<string, EstimationMaterial[]>();
  for (const item of filtered) {
    const key = item.category || 'general';
    if (!groupMap.has(key)) { groupMap.set(key, []); groupOrder.push(key); }
    groupMap.get(key)!.push(item);
  }
  groupOrder.sort((a, b) => a.localeCompare(b));
  const groups = groupOrder.map((key) => ({ key, items: groupMap.get(key)! }));

  function isGroupOpen(key: string) {
    if (search) return true;
    return !collapsed.has(key);
  }
  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  function expandAll() { setCollapsed(new Set()); }
  function collapseAll() { setCollapsed(new Set(groups.map((g) => g.key))); }

  return (
    <>
      <AdminHeader
        title="Estimation Materials"
        subtitle="Manage the material catalogue, measurement units, pack sizes, and suppliers."
        action={
          <AdminButton
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add material
          </AdminButton>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or category…"
              className="input-field dark:bg-brand-navy-mid dark:border-white/10 pl-9"
            />
          </div>
          {!search && groups.length > 1 && (
            <GroupControls onExpandAll={expandAll} onCollapseAll={collapseAll} groupLabel={`${groups.length} categories`} />
          )}
        </div>
      )}

      {loading ? (
        <StateMessage
          type="loading"
          title="Loading…"
          message="Fetching estimation materials."
        />
      ) : items.length === 0 ? (
        <StateMessage
          type="empty"
          title="No estimation materials yet"
          message="Add your first estimation material to get started."
        />
      ) : filtered.length === 0 ? (
        <StateMessage
          type="empty"
          title="No materials found"
          message="Adjust your search to see results."
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <CollapsibleGroup
              key={group.key}
              title={group.key.replace(/_/g, ' ')}
              count={group.items.length}
              isOpen={isGroupOpen(group.key)}
              onToggle={() => toggleGroup(group.key)}
            >
              {group.items.map((item) => {
                const baseUnit = item.unit_id ? unitMap[item.unit_id] : null;
                const packUnit = item.pack_unit_id ? unitMap[item.pack_unit_id] : null;

                return (
                  <AdminCard
                    key={item.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-brand-navy dark:text-white">{item.name}</h3>
                        {!item.is_active && (
                          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
                            Inactive
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{item.description}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400 dark:text-neutral-500">
                        {baseUnit && (
                          <span>
                            Unit: {baseUnit.name} ({baseUnit.symbol})
                          </span>
                        )}
                        {item.pack_size !== null && item.pack_size !== undefined && (
                          <span>
                            Pack Size: {item.pack_size} {packUnit ? packUnit.symbol : ''}
                          </span>
                        )}
                        {item.supplier && <span>Supplier: {item.supplier}</span>}
                        {item.effective_date && <span>Effective: {item.effective_date}</span>}
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
                        <Trash2 className="h-3.5 w-3.5" />
                      </AdminButton>
                    </div>
                  </AdminCard>
                );
              })}
            </CollapsibleGroup>
          ))}
        </div>
      )}

      {showForm && (
        <MaterialForm
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

function MaterialForm({
  initial,
  units,
  onClose,
  onSaved,
}: {
  initial: EstimationMaterial | null;
  units: EstimationUnit[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'general');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [unitId, setUnitId] = useState(initial?.unit_id ?? '');
  const [packSize, setPackSize] = useState<string>(
    initial?.pack_size !== null && initial?.pack_size !== undefined ? String(initial.pack_size) : ''
  );
  const [packUnitId, setPackUnitId] = useState(initial?.pack_unit_id ?? '');
  const [supplier, setSupplier] = useState(initial?.supplier ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [effectiveDate, setEffectiveDate] = useState(initial?.effective_date ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSave() {
    if (!name.trim()) {
      setFormError('Name is required');
      return;
    }
    const finalSlug = slug.trim() ? slugify(slug) : slugify(name);
    if (!finalSlug) {
      setFormError('Slug is required');
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      name: name.trim(),
      slug: finalSlug,
      category: category.trim() || 'general',
      description: description.trim() || null,
      unit_id: unitId || null,
      pack_size: packSize !== '' && !isNaN(Number(packSize)) ? Math.max(1, Number(packSize)) : null,
      pack_unit_id: packUnitId || null,
      supplier: supplier.trim() || null,
      notes: notes.trim() || null,
      effective_date: effectiveDate || null,
      is_active: isActive,
      sort_order: sortOrder,
    };

    const { error } = initial
      ? await supabase.from('estimation_materials').update(payload).eq('id', initial.id)
      : await supabase.from('estimation_materials').insert(payload);

    setSaving(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl my-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-navy dark:text-white">
            {initial ? 'Edit estimation material' : 'Add estimation material'}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Name">
              <input
                className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                value={name}
                onChange={(e) => {
                  const val = e.target.value;
                  setName(val);
                  if (!initial && (!slug || slug === slugify(name))) {
                    setSlug(slugify(val));
                  }
                }}
                placeholder="e.g. Wall Putty"
              />
            </AdminField>
            <AdminField label="Slug" hint="Auto-generated if left blank">
              <input
                className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. wall-putty"
              />
            </AdminField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Category">
              <input
                className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. primer, filler, putty"
                list="material-category-list"
              />
              <datalist id="material-category-list">
                <option value="general" />
                <option value="primer" />
                <option value="filler" />
                <option value="putty" />
                <option value="cement" />
                <option value="adhesive" />
                <option value="screeding" />
                <option value="pop" />
                <option value="tile" />
              </datalist>
            </AdminField>
            <AdminField label="Supplier">
              <input
                className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Berger Paints"
              />
            </AdminField>
          </div>

          <AdminField label="Description">
            <textarea
              className="input-field dark:bg-brand-navy-mid dark:border-white/10"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Material description or specification..."
            />
          </AdminField>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Base unit">
              <select
                className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
              >
                <option value="">-- Select unit --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Pack size">
              <input
                type="number"
                step="any"
                min={0}
                className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                placeholder="e.g. 20"
              />
            </AdminField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Pack unit">
              <select
                className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                value={packUnitId}
                onChange={(e) => setPackUnitId(e.target.value)}
              >
                <option value="">-- Select pack unit --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Effective date">
              <input
                type="date"
                className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </AdminField>
          </div>

          <AdminField label="Notes">
            <textarea
              className="input-field dark:bg-brand-navy-mid dark:border-white/10"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional internal notes..."
            />
          </AdminField>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Sort order">
              <input
                type="number"
                className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </AdminField>
            <div>
              <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Active</span>
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
        </div>
      </div>
    </div>
  );
}
