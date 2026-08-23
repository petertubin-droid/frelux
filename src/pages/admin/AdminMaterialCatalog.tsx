import { useState, useEffect, useCallback } from 'react';
import { AdminHeader, AdminButton, StateMessage, AdminField, Toggle } from "@/components/admin/AdminUi";
import { supabase } from '@/lib/supabase';
import type { DbMaterialCatalog, MaterialCatalogCategory } from '@/types/database';
import { Plus, Trash2, Edit3, X, Search } from "lucide-react";

const CATEGORIES: MaterialCatalogCategory[] = [
  'paint', 'primer', 'white_cement', 'screeding_paint', 'pop_cement',
  'soap', 'fibre', 'boards', 'tiles', 'tile_adhesive', 'grout',
  'masking_tape', 'brushes', 'rollers', 'sandpaper', 'extension_pole',
  'ladders', 'scaffolding', 'ppe', 'accessories',
];

export default function AdminMaterialCatalog() {
  const [items, setItems] = useState<DbMaterialCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editing, setEditing] = useState<DbMaterialCatalog | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('material_catalog')
      .select('*')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setItems((data ?? []) as DbMaterialCatalog[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filtered = items.filter(item => {
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || (item.brand?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSave = async (item: Partial<DbMaterialCatalog>) => {
    if (editing) {
      const { error } = await supabase.from('material_catalog').update(item).eq('id', editing.id);
      if (error) { setError(error.message); return; }
    } else {
      const { error } = await supabase.from('material_catalog').insert(item);
      if (error) { setError(error.message); return; }
    }
    setShowForm(false);
    setEditing(null);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this material? This cannot be undone.')) return;
    const { error } = await supabase.from('material_catalog').delete().eq('id', id);
    if (error) { setError(error.message); return; }
    fetchItems();
  };

  return (
    <div>
      <AdminHeader
        title="Material Catalog"
        subtitle="Manage the Nigerian material database with quality tiers and regional pricing"
        action={<AdminButton onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Add Material</AdminButton>}
      />

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search materials..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 py-2 pl-9 pr-3 text-sm focus:border-brand-purple focus:outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <StateMessage type="loading" title="Loading materials..." message="" />
      ) : filtered.length === 0 ? (
        <StateMessage type="empty" title="No materials found" message="Add materials to the catalog to get started." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500 dark:text-neutral-400">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Brand</th>
                <th className="py-2 pr-4">Economy</th>
                <th className="py-2 pr-4">Standard</th>
                <th className="py-2 pr-4">Premium</th>
                <th className="py-2 pr-4">Luxury</th>
                <th className="py-2 pr-4">Tier</th>
                <th className="py-2 pr-4">Active</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-neutral-100 hover:bg-neutral-50 dark:bg-white/5">
                  <td className="py-2 pr-4 font-medium text-neutral-800">{item.name}</td>
                  <td className="py-2 pr-4 capitalize text-neutral-600">{item.category.replace(/_/g, ' ')}</td>
                  <td className="py-2 pr-4 text-neutral-600">{item.brand ?? '-'}</td>
                  <td className="py-2 pr-4 text-neutral-600">{item.currency}{item.economy_price.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-neutral-600">{item.currency}{item.standard_price.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-neutral-600">{item.currency}{item.premium_price.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-neutral-600">{item.currency}{item.luxury_price.toLocaleString()}</td>
                  <td className="py-2 pr-4 capitalize text-neutral-600">{item.quality_tier}</td>
                  <td className="py-2 pr-4">
                    <span className={`inline-block h-2 w-2 rounded-full ${item.is_active ? 'bg-green-500' : 'bg-neutral-300'}`} />
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(item); setShowForm(true); }} className="rounded p-1 hover:bg-neutral-100"><Edit3 className="h-4 w-4 text-neutral-500" /></button>
                      <button onClick={() => handleDelete(item.id)} className="rounded p-1 hover:bg-red-50"><Trash2 className="h-4 w-4 text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <MaterialForm
          item={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function MaterialForm({ item, onSave, onClose }: { item: DbMaterialCatalog | null; onSave: (data: Partial<DbMaterialCatalog>) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    category: item?.category ?? 'paint' as MaterialCatalogCategory,
    brand: item?.brand ?? '',
    description: item?.description ?? '',
    coverage_rate: item?.coverage_rate ?? 0,
    coverage_unit: item?.coverage_unit ?? '',
    package_size: item?.package_size ?? 0,
    package_unit: item?.package_unit ?? '',
    economy_price: item?.economy_price ?? 0,
    standard_price: item?.standard_price ?? 0,
    premium_price: item?.premium_price ?? 0,
    luxury_price: item?.luxury_price ?? 0,
    recommended_usage: (item?.recommended_usage ?? []).join(', '),
    durability_rating: item?.durability_rating ?? 'medium',
    lifespan_years: item?.lifespan_years ?? 0,
    finish_type: item?.finish_type ?? '',
    maintenance_frequency: item?.maintenance_frequency ?? '',
    quality_tier: item?.quality_tier ?? 'standard',
    is_active: item?.is_active ?? true,
    sort_order: item?.sort_order ?? 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      coverage_rate: form.coverage_rate || null,
      coverage_unit: form.coverage_unit || null,
      package_size: form.package_size || null,
      package_unit: form.package_unit || null,
      recommended_usage: form.recommended_usage.split(',').map(s => s.trim()).filter(Boolean),
      lifespan_years: form.lifespan_years || null,
      brand: form.brand || null,
      description: form.description || null,
      finish_type: form.finish_type || null,
      maintenance_frequency: form.maintenance_frequency || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-800">{item ? 'Edit Material' : 'Add Material'}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminField label="Name"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></AdminField>
            <AdminField label="Category">
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as MaterialCatalogCategory })} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>)}
              </select>
            </AdminField>
            <AdminField label="Brand"><input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></AdminField>
            <AdminField label="Quality Tier">
              <select value={form.quality_tier} onChange={e => setForm({ ...form, quality_tier: e.target.value as 'economy' | 'standard' | 'premium' | 'luxury' })} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                <option value="economy">Economy</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="luxury">Luxury</option>
              </select>
            </AdminField>
          </div>

          <AdminField label="Description"><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></AdminField>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <AdminField label="Economy Price"><input type="number" value={form.economy_price} onChange={e => setForm({ ...form, economy_price: +e.target.value })} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></AdminField>
            <AdminField label="Standard Price"><input type="number" value={form.standard_price} onChange={e => setForm({ ...form, standard_price: +e.target.value })} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></AdminField>
            <AdminField label="Premium Price"><input type="number" value={form.premium_price} onChange={e => setForm({ ...form, premium_price: +e.target.value })} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></AdminField>
            <AdminField label="Luxury Price"><input type="number" value={form.luxury_price} onChange={e => setForm({ ...form, luxury_price: +e.target.value })} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></AdminField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminField label="Coverage Rate"><input type="number" value={form.coverage_rate} onChange={e => setForm({ ...form, coverage_rate: +e.target.value })} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></AdminField>
            <AdminField label="Coverage Unit"><input value={form.coverage_unit} onChange={e => setForm({ ...form, coverage_unit: e.target.value })} placeholder="m2_per_liter" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></AdminField>
            <AdminField label="Package Size"><input type="number" value={form.package_size} onChange={e => setForm({ ...form, package_size: +e.target.value })} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></AdminField>
            <AdminField label="Package Unit"><input value={form.package_unit} onChange={e => setForm({ ...form, package_unit: e.target.value })} placeholder="kg, liters" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></AdminField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <AdminField label="Durability">
              <select value={form.durability_rating} onChange={e => setForm({ ...form, durability_rating: e.target.value as 'low' | 'medium' | 'high' | 'premium' })} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="premium">Premium</option>
              </select>
            </AdminField>
            <AdminField label="Lifespan (years)"><input type="number" value={form.lifespan_years} onChange={e => setForm({ ...form, lifespan_years: +e.target.value })} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></AdminField>
            <AdminField label="Finish Type"><input value={form.finish_type} onChange={e => setForm({ ...form, finish_type: e.target.value })} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></AdminField>
          </div>

          <AdminField label="Recommended Usage (comma-separated)"><input value={form.recommended_usage} onChange={e => setForm({ ...form, recommended_usage: e.target.value })} placeholder="living_room, bedroom" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></AdminField>

          <div className="flex items-center justify-between">
            <Toggle checked={form.is_active} onChange={v => setForm({ ...form, is_active: v })} label="Active" />
            <div className="flex gap-2">
              <AdminButton variant="secondary" onClick={onClose}>Cancel</AdminButton>
              <AdminButton type="submit">{item ? 'Update' : 'Add'} Material</AdminButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
