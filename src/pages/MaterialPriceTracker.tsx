import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Loader2,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Pencil,
  History,
  X,
  DollarSign,
  Package,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { useSeo } from "@/lib/seo";
import {
  fetchMaterialsWithPrices,
  updateMaterialPrice,
  fetchMaterialPriceHistory,
  hasPriceChanged,
  type MaterialWithPrice,
} from "@/lib/project-intelligence";
import type { DbMaterialPriceHistory } from "@/types/database";
import { Button } from "@/components/ui/shadcn/button";

const fmt = (v: number) => "₦" + (v || 0).toLocaleString();

export default function MaterialPriceTracker() {
  const { toast } = useToast();

  useSeo({
    title: "Material Price Tracker",
    description:
      "Track and update material prices. See price history and spot cost changes.",
    noIndex: true,
  });

  const [materials, setMaterials] = useState<MaterialWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editSource, setEditSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [historyFor, setHistoryFor] = useState<MaterialWithPrice | null>(null);
  const [history, setHistory] = useState<DbMaterialPriceHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMaterialsWithPrices(categoryFilter || undefined);
      setMaterials(data);
    } catch (e) {
      toast({ title: (e as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    materials.forEach((m) => cats.add(m.category));
    return Array.from(cats).sort();
  }, [materials]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return materials.filter(
      (m) =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.brand && m.brand.toLowerCase().includes(q)),
    );
  }, [materials, search]);

  const stats = useMemo(() => {
    const changed = materials.filter(
      (m) =>
        m.previous_price !== null &&
        hasPriceChanged(m.previous_price, m.current_price),
    );
    const increased = changed.filter(
      (m) => (m.current_price ?? 0) > (m.previous_price ?? 0),
    );
    const decreased = changed.filter(
      (m) => (m.current_price ?? 0) < (m.previous_price ?? 0),
    );
    const avgChange =
      changed.length > 0
        ? changed.reduce((sum, m) => {
            const pct =
              m.previous_price && m.previous_price > 0
                ? ((m.current_price - m.previous_price) / m.previous_price) *
                  100
                : 0;
            return sum + pct;
          }, 0) / changed.length
        : 0;
    return {
      total: materials.length,
      changed: changed.length,
      increased: increased.length,
      decreased: decreased.length,
      avgChange,
    };
  }, [materials]);

  async function handleSavePrice(material: MaterialWithPrice) {
    const newPrice = Number(editPrice);
    if (!newPrice || newPrice <= 0) {
      toast({ title: "Enter a valid price", variant: "error" });
      return;
    }
    setSaving(true);
    try {
      await updateMaterialPrice(material.id, newPrice, editSource || undefined);
      toast({ title: "Price updated", variant: "success" });
      setEditId(null);
      setEditPrice("");
      setEditSource("");
      loadData();
    } catch (e) {
      toast({ title: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function loadHistory(material: MaterialWithPrice) {
    setHistoryFor(material);
    setHistoryLoading(true);
    try {
      const h = await fetchMaterialPriceHistory(material.id, 30);
      setHistory(h);
    } catch (e) {
      toast({ title: (e as Error).message, variant: "error" });
    } finally {
      setHistoryLoading(false);
    }
  }

  function priceDirection(m: MaterialWithPrice) {
    if (
      m.previous_price === null ||
      !hasPriceChanged(m.previous_price, m.current_price)
    )
      return "stable";
    return m.current_price > m.previous_price ? "up" : "down";
  }

  return (
    <>
      <PageHeader
        title="Material Price Tracker"
        subtitle="Monitor material costs, update prices, and track changes over time."
      />

      <div className="mx-auto max-w-5xl px-4 pb-12 pt-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Package}
            label="Tracked Materials"
            value={String(stats.total)}
            color="text-primary"
          />
          <StatCard
            icon={TrendingUp}
            label="Price Increases"
            value={String(stats.increased)}
            color="text-emerald-600"
          />
          <StatCard
            icon={TrendingDown}
            label="Price Drops"
            value={String(stats.decreased)}
            color="text-rose-600"
          />
          <StatCard
            icon={DollarSign}
            label="Avg Change"
            value={`${stats.avgChange > 0 ? "+" : ""}${stats.avgChange.toFixed(1)}%`}
            color={
              stats.avgChange > 0
                ? "text-emerald-600"
                : stats.avgChange < 0
                  ? "text-rose-600"
                  : "text-muted-foreground"
            }
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search materials..."
              className="w-full rounded-lg border bg-background pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none min-w-[160px]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Material list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <Package className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No materials found. Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((m) => {
              const dir = priceDirection(m);
              const isEditing = editId === m.id;
              return (
                <div
                  key={m.id}
                  className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Name & category */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{m.name}</p>
                        {m.brand && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {m.brand}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">
                        {m.category.replace("_", " ")}
                        {m.unit && ` · ${m.unit}`}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-lg border bg-background overflow-hidden">
                            <span className="px-2 py-1.5 text-sm text-muted-foreground bg-muted">
                              ₦
                            </span>
                            <input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              placeholder="New price"
                              min={0}
                              autoFocus
                              className="w-24 px-2 py-1.5 text-sm focus:outline-none border-l"
                            />
                          </div>
                          <input
                            type="text"
                            value={editSource}
                            onChange={(e) => setEditSource(e.target.value)}
                            placeholder="Source"
                            className="w-24 rounded-lg border bg-background px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                          />
                          <Button
                            onClick={() => handleSavePrice(m)}
                            disabled={saving}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                          >
                            {saving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </Button>
                          <Button
                            onClick={() => {
                              setEditId(null);
                              setEditPrice("");
                              setEditSource("");
                            }}
                            className="p-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-semibold">
                              {fmt(m.current_price)}
                            </p>
                            {m.previous_price !== null && dir !== "stable" && (
                              <p
                                className={`flex items-center justify-end gap-0.5 text-xs ${
                                  dir === "up"
                                    ? "text-emerald-600"
                                    : "text-rose-600"
                                }`}
                              >
                                {dir === "up" ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {m.previous_price > 0
                                  ? `${Math.abs(
                                      ((m.current_price - m.previous_price) /
                                        m.previous_price) *
                                        100,
                                    ).toFixed(1)}%`
                                  : ""}
                              </p>
                            )}
                            {m.previous_price !== null && dir === "stable" && (
                              <p className="flex items-center justify-end gap-0.5 text-xs text-muted-foreground">
                                <Minus className="h-3 w-3" />
                                {fmt(m.previous_price)}
                              </p>
                            )}
                            {m.price_updated_at && (
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(
                                  m.price_updated_at,
                                ).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          onClick={() => {
                            setEditId(m.id);
                            setEditPrice(String(m.current_price));
                            setEditSource(m.price_source || "");
                          }}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Edit price"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => loadHistory(m)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Price history"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History modal */}
      {historyFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setHistoryFor(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Price History</h3>
                <p className="text-sm text-muted-foreground">
                  {historyFor.name}
                  {historyFor.brand && ` · ${historyFor.brand}`}
                </p>
              </div>
              <Button
                onClick={() => setHistoryFor(null)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No price changes recorded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {history.map((h, i) => {
                  const isLatest = i === 0;
                  const oldP = h.old_price ?? 0;
                  const newP = h.new_price;
                  const pct = oldP > 0 ? ((newP - oldP) / oldP) * 100 : 0;
                  const dir =
                    oldP > 0 && newP > oldP
                      ? "up"
                      : oldP > 0 && newP < oldP
                        ? "down"
                        : "stable";
                  return (
                    <div
                      key={h.id}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        isLatest ? "border-primary/30 bg-primary/5" : ""
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {fmt(newP)}
                          </span>
                          {dir !== "stable" && (
                            <span
                              className={`text-xs ${
                                dir === "up"
                                  ? "text-emerald-600"
                                  : "text-rose-600"
                              }`}
                            >
                              {dir === "up" ? "↑" : "↓"}{" "}
                              {Math.abs(pct).toFixed(1)}%
                            </span>
                          )}
                          {isLatest && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                              Latest
                            </span>
                          )}
                        </div>
                        {h.old_price !== null && (
                          <p className="text-xs text-muted-foreground">
                            from {fmt(oldP)}
                            {h.price_source && ` · ${h.price_source}`}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(h.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <Icon className={`h-5 w-5 mb-2 ${color}`} />
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
