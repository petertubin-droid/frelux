import { useState, useEffect } from "react";
import { Loader2, Edit, Save, X, TrendingUp, History } from "lucide-react";
import {
  fetchMaterialsWithPrices,
  updateMaterialPrice,
  fetchMaterialPriceHistory,
} from "@/lib/project-intelligence";
import type { MaterialWithPrice } from "@/lib/project-intelligence";
import type { DbMaterialPriceHistory } from "@/types/database";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/components/ui/Toast";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

import { useEscapeKey } from "@/lib/use-escape-key";
export default function AdminMaterialPrices() {
  const { error: notifyError } = useToast();
  const { t } = useLanguage();
  const [materials, setMaterials] = useState<MaterialWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [history, setHistory] = useState<DbMaterialPriceHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  useEscapeKey(() => setShowHistory(false));

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
      notifyError((e as Error).message);
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
      <AdminPageHeader
        title={t("Material Price Tracker")}
        description="Manage current material prices. Price history is preserved automatically."
        actions={
          <Button
            variant="ghost"
            onClick={loadHistory}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <History className="h-4 w-4" aria-hidden="true" /> Price History
          </Button>
        }
      />

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
                    {m.previous_price ? fmt(m.previous_price) : ""}
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
                        <Button
                          aria-label="Save price"
                          variant="ghost"
                          onClick={() => handleUpdatePrice(m)}
                          className="rounded p-1.5 hover:bg-emerald-500/10 transition-all hover:scale-110"
                        >
                          <Save className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button
                          aria-label="Cancel price edit"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          className="rounded p-1.5 hover:bg-muted transition-all"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingId(m.id);
                          setNewPrice(String(m.current_price));
                        }}
                        className="group inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-all hover:scale-105"
                      >
                        <Edit className="h-3 w-3 group-hover:scale-110 transition-transform" />{" "}
                        Update
                      </Button>
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
          role="presentation"
        >
          <div
            className="w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "fadeInScale 0.3s ease-out" }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">{t("Price History")}</h3>
              <Button
                aria-label="Close price history"
                variant="ghost"
                onClick={() => setShowHistory(false)}
                className="rounded-lg p-1.5 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t("No price changes recorded yet.")}
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
