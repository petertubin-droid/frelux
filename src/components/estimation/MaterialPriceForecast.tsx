/**
 * Material Price Forecast panel (Future Engine 4)
 *
 * Self-contained panel on the Material Prices page: pick a
 * material with recorded history, choose a horizon, and the
 * deterministic forecastMaterialPrice engine projects the
 * fitted trend with warnings - never an invented inflation
 * guess. This component renders; it never computes trends.
 */

import { useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import { fetchMaterialPriceHistory } from "@/lib/project-intelligence";
import { fetchCalcRules } from "@/lib/estimation/queries";
import {
  forecastMaterialPrice,
  type PriceForecastResult,
} from "@/lib/estimation/price-forecast-engine";
import type { EstimationCalcRule } from "@/types/estimation";
import type { DbMaterialPriceHistory } from "@/types/database";

const money = (v: number) =>
  `₦${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function MaterialPriceForecast() {
  const [history, setHistory] = useState<DbMaterialPriceHistory[]>([]);
  const [rules, setRules] = useState<EstimationCalcRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [materialKey, setMaterialKey] = useState("");
  const [horizon, setHorizon] = useState("6");
  const [result, setResult] = useState<PriceForecastResult | null>(null);

  useEffect(() => {
    fetchMaterialPriceHistory(undefined, 500)
      .then((data) => setHistory(data))
      .catch((e) =>
        setLoadError(getSafeError(e, "Failed to load price history.")),
      );
    fetchCalcRules("price_forecast").then(({ data }) => setRules(data));
  }, []);

  // Group history into per-material chronological series:
  // each change row contributes its new_price, and the oldest
  // row's old_price extends the series one point further back.
  const materials = useMemo(() => {
    const byMaterial = new Map<string, DbMaterialPriceHistory[]>();
    for (const h of history) {
      const key = h.material_id ?? h.material_name;
      if (!byMaterial.has(key)) byMaterial.set(key, []);
      byMaterial.get(key)!.push(h);
    }
    const list: {
      key: string;
      label: string;
      points: { date: string; price: number }[];
    }[] = [];
    for (const [key, rows] of byMaterial) {
      rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
      const points: { date: string; price: number }[] = [];
      const oldest = rows[0];
      if (
        oldest.old_price !== null &&
        Number.isFinite(Number(oldest.old_price))
      ) {
        points.push({
          date: oldest.created_at,
          price: Number(oldest.old_price),
        });
      }
      for (const r of rows)
        points.push({ date: r.created_at, price: Number(r.new_price) });
      if (points.length >= 2)
        list.push({ key, label: rows[0].material_name, points });
    }
    return list;
  }, [history]);

  const selected = materials.find((m) => m.key === materialKey) ?? null;

  const run = () => {
    if (!selected) return;
    const r = forecastMaterialPrice({
      history: selected.points,
      horizon_months: Number(horizon),
      rules,
    });
    setResult(r);
    if (r.ok) track("price_forecast_generated");
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
      <h2 className="mb-1 text-base font-semibold">Price Forecast</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Trend projections computed only from recorded price history
        (least-squares fit, no invented inflation). The engine refuses materials
        with too little history instead of guessing.
      </p>

      {loadError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {materials.length === 0 && !loadError ? (
        <p className="text-sm text-muted-foreground">
          No materials with recorded price history yet: forecasts become
          available as prices are tracked over time.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-medium">
              Material
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                value={materialKey}
                onChange={(e) => {
                  setMaterialKey(e.target.value);
                  setResult(null);
                }}
              >
                <option value="">Select material</option>
                {materials.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label} ({m.points.length} price points)
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Horizon (months)
              <input
                type="number"
                min="1"
                max="36"
                className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                value={horizon}
                onChange={(e) => setHorizon(e.target.value)}
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={run}
                disabled={!materialKey || !horizon}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Forecast Price
              </button>
            </div>
          </div>

          {result && !result.ok && (
            <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              {result.warnings.map((w, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  {w}
                </p>
              ))}
            </div>
          )}

          {result?.ok && (
            <div className="mt-4 space-y-3">
              {result.warnings.map((w, i) => (
                <p
                  key={i}
                  className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-muted-foreground"
                >
                  {w}
                </p>
              ))}
              <div className="flex items-center gap-4 rounded-lg border border-border p-4 dark:border-white/5">
                {result.trend === "rising" && (
                  <TrendingUp className="h-6 w-6 text-primary" />
                )}
                {result.trend === "falling" && (
                  <TrendingDown className="h-6 w-6 text-primary" />
                )}
                {result.trend === "flat" && (
                  <Minus className="h-6 w-6 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm text-muted-foreground">
                    {money(result.current_price!)} today →{" "}
                    {money(result.projected_price!)} in {result.horizon_months}{" "}
                    month{result.horizon_months === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Fitted trend: {result.monthly_change! >= 0 ? "+" : ""}
                    {money(result.monthly_change!)}/month (
                    {result.monthly_change_percent}%)
                  </p>
                </div>
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">
                  Forecast breakdown
                </summary>
                <ul className="mt-2 space-y-1">
                  {result.steps.map((s, i) => (
                    <li key={i}>
                      <span className="font-medium">{s.label}:</span>{" "}
                      <span className="text-muted-foreground">{s.detail}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}
        </>
      )}
    </div>
  );
}
