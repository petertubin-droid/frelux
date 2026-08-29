import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Loader2, Save, X } from "lucide-react";
import {
  fetchPaintComparisons,
  upsertPaintComparison,
  deletePaintComparison,
} from "@/lib/project-intelligence";
import type { DbPaintComparison } from "@/types/database";

export default function AdminPaintComparison() {
  const [items, setItems] = useState<DbPaintComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DbPaintComparison | null>(null);
  const [showForm, setShowForm] = useState(false);

  const empty = {
    paint_type: "",
    display_name: "",
    description: "",
    finish: "",
    recommended_use: "",
    durability: "",
    washability: "",
    appearance: "",
    product_characteristics: "",
    suitable_areas: "",
    price_range: "",
    sort_order: 0,
    is_active: true,
  };
  const [form, setForm] = useState<Partial<DbPaintComparison>>(empty);

  useEffect(() => {
    fetchPaintComparisons()
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!form.paint_type) return;
    try {
      await upsertPaintComparison(
        form as Partial<DbPaintComparison> & { paint_type: string },
      );
      await loadItems();
      setShowForm(false);
      setForm(empty);
      setEditing(null);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function loadItems() {
    const data = await fetchPaintComparisons();
    setItems(data);
  }

  function startEdit(item: DbPaintComparison) {
    setEditing(item);
    setForm(item);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (confirm("Delete this paint comparison entry?")) {
      await deletePaintComparison(id);
      loadItems();
    }
  }

  const inputCls =
    "w-full rounded-lg border bg-background px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/50 outline-none";
  const labelCls = "block text-sm font-medium mb-1";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Paint Comparison</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage paint comparison data shown on the comparison page.
          </p>
        </div>
        <button
          onClick={() => {
            setForm(empty);
            setEditing(null);
            setShowForm(true);
          }}
          className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />{" "}
          Add Paint Type
        </button>
      </div>

      {showForm && (
        <div
          className="rounded-2xl border bg-card p-6 shadow-lg space-y-4"
          style={{ animation: "fadeInUp 0.3s ease-out" }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {editing ? "Edit" : "Add"} Paint Type
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg p-1.5 hover:bg-muted transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Paint Type Key *</label>
              <input
                className={inputCls}
                value={form.paint_type || ""}
                onChange={(e) =>
                  setForm({ ...form, paint_type: e.target.value })
                }
                placeholder="matt, satin, emulsion"
                disabled={!!editing}
              />
            </div>
            <div>
              <label className={labelCls}>Display Name *</label>
              <input
                className={inputCls}
                value={form.display_name || ""}
                onChange={(e) =>
                  setForm({ ...form, display_name: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea
                className={inputCls}
                rows={2}
                value={form.description || ""}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Finish</label>
              <input
                className={inputCls}
                value={form.finish || ""}
                onChange={(e) => setForm({ ...form, finish: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Recommended Use</label>
              <input
                className={inputCls}
                value={form.recommended_use || ""}
                onChange={(e) =>
                  setForm({ ...form, recommended_use: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Durability</label>
              <input
                className={inputCls}
                value={form.durability || ""}
                onChange={(e) =>
                  setForm({ ...form, durability: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Washability</label>
              <input
                className={inputCls}
                value={form.washability || ""}
                onChange={(e) =>
                  setForm({ ...form, washability: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Appearance</label>
              <input
                className={inputCls}
                value={form.appearance || ""}
                onChange={(e) =>
                  setForm({ ...form, appearance: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Suitable Areas</label>
              <input
                className={inputCls}
                value={form.suitable_areas || ""}
                onChange={(e) =>
                  setForm({ ...form, suitable_areas: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Price Range</label>
              <input
                className={inputCls}
                value={form.price_range || ""}
                onChange={(e) =>
                  setForm({ ...form, price_range: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Product Characteristics</label>
              <input
                className={inputCls}
                value={form.product_characteristics || ""}
                onChange={(e) =>
                  setForm({ ...form, product_characteristics: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Sort Order</label>
              <input
                type="number"
                className={inputCls}
                value={form.sort_order || 0}
                onChange={(e) =>
                  setForm({ ...form, sort_order: parseInt(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="group flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Save className="h-4 w-4 group-hover:scale-110 transition-transform" />{" "}
              Save
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && (
        <div className="grid gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <div className="flex-1">
                <h3 className="font-semibold">
                  {item.display_name}{" "}
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    {item.paint_type}
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {item.description || "No description"}
                </p>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                  {item.finish && (
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      {item.finish}
                    </span>
                  )}
                  {item.price_range && (
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      {item.price_range}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(item)}
                  className="rounded-lg p-2 hover:bg-muted transition-all hover:scale-110"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="rounded-lg p-2 hover:bg-destructive/10 transition-all hover:scale-110"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
