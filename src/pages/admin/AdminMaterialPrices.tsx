import { useState, useEffect } from "react";
import { Loader2, Edit, Save, X, TrendingUp, History } from "lucide-react";
import {
  fetchMaterialsWithPrices,
  updateMaterialPrice,
  fetchMaterialPriceHistory,
} from "@/lib/project-intelligence";
import type { MaterialWithPrice } from "@/lib/project-intelligence";
import type { DbMaterialPriceHistory } from "@/types/database";

export default function AdminMaterialPrices() {
  const [materials, setMaterials] = useState<MaterialWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [history, setHistory] = useState<DbMaterialPriceHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchMaterialsWithPrices()
      .then((data) => {
        setMaterials(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleUpdatePrice(material: MaterialWithPrice) {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) return;
    try {
      await updateMaterialPrice(material.id, price);
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === material.id
            ? { ...m, previous_price: m.current_price, current_price: price }
            : m,
        ),
      );
      setEditingId(null);
      setNewPrice("");
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function loadHistory() {
    const data = await fetchMaterialPriceHistory(undefined, 20);
    setHistory(data);
    setShowHistory(true);
  }

  const fmt = (v: number) => "₦" + (v || 0).toLocaleString();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Material Price Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage current material prices. Price history is preserved
            automatically.
          </p>
        </div>
        <button
          onClick={loadHistory}
          className="group inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-medium hover:bg-muted/80 transition-all hover:scale-105"
        >
          <History className="h-4 w-4 group-hover:rotate-12 transition-transform" />{" "}
          Price History
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted">
                {[
                  "Material",
                  "Category",
                  "Current Price",
                  "Previous Price",
                  "Updated",
                  "Action",
                ].map((h) => (
                  <th
                    key={h}
                    className="p-3 text-left font-medium text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr
                  key={m.id}
                  className="border-b hover:bg-muted/30 transition-colors"
                >
                  <td className="p-3 font-medium">
                    {m.name}
                    {m.brand && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({m.brand})
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground capitalize">
                    {m.category}
                  </td>
                  <td className="p-3 font-semibold">{fmt(m.current_price)}</td>
                  <td className="p-3 text-muted-foreground">
                    {m.previous_price ? fmt(m.previous_price) : "—"}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {m.price_updated_at
                      ? new Date(m.price_updated_at).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="p-3">
                    {editingId === m.id ? (
                      <div className="flex gap-1">
                        <input
                          type="number"
                          className="w-24 rounded border bg-background px-2 py-1 text-sm transition-all focus:ring-2 focus:ring-primary/50 outline-none"
                          value={newPrice}
                          onChange={(e) => setNewPrice(e.target.value)}
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdatePrice(m)}
                          className="rounded p-1.5 hover:bg-emerald-500/10 transition-all hover:scale-110"
                        >
                          <Save className="h-4 w-4 text-emerald-600" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded p-1.5 hover:bg-muted transition-all"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(m.id);
                          setNewPrice(String(m.current_price));
                        }}
                        className="group inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-all hover:scale-105"
                      >
                        <Edit className="h-3 w-3 group-hover:scale-110 transition-transform" />{" "}
                        Update
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "fadeInScale 0.3s ease-out" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Price History</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="rounded-lg p-1.5 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No price changes recorded yet.
                </p>
              ) : (
                history.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{h.material_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(h.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {h.old_price !== null && (
                        <span className="text-muted-foreground">
                          {fmt(h.old_price)}
                        </span>
                      )}
                      {h.old_price !== null && (
                        <TrendingUp className="h-3 w-3 text-primary" />
                      )}
                      <span className="font-semibold">{fmt(h.new_price)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}
