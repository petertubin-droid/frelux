/**
 * FRELUX Estimate Refresh — "Current Cost Today" (Future Engine 6, part 2)
 *
 * Inflation-proof estimating: a saved estimate already snapshots
 * the prices it was quoted at. This page refreshes one of YOUR
 * saved estimates against today's active prices and shows the
 * honest delta — per line and in total.
 *
 * - The refresh is produced ONLY by refreshEstimate. This page
 *   renders; it never prices anything itself.
 * - Lines without a current price stay at their snapshot price,
 *   clearly flagged — never inflated or guessed.
 */

import { useEffect, useState, useCallback } from "react";
import { useSeo } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import { useAuth } from "@/lib/auth";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import {
  fetchEstimates,
  fetchEstimateItems,
  fetchActivePriceForMarket,
  fetchCalcRules,
} from "@/lib/estimation/queries";
import {
  refreshEstimate,
  type RefreshResult,
  type RefreshItemInput,
  type CurrentPriceRef,
} from "@/lib/estimation/estimate-refresh-engine";
import type {
  EstimationEstimate,
  EstimationEstimateItem,
  EstimationCalcRule,
  PriceSnapshot,
} from "@/types/estimation";
import AdSlot from "@/components/ui/AdSlot";

function money(v: number): string {
  return `₦${v.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const statusLabel: Record<string, string> = {
  price_changed: "Price changed",
  unchanged: "Unchanged",
  no_current_price: "No current price — held at snapshot",
  currency_mismatch: "Currency mismatch — held at snapshot",
  no_price_reference: "No price reference — held at snapshot",
};

const statusColor: Record<string, string> = {
  price_changed: "text-amber-500",
  unchanged: "text-emerald-600 dark:text-emerald-400",
  no_current_price: "text-muted-foreground",
  currency_mismatch: "text-muted-foreground",
  no_price_reference: "text-muted-foreground",
};

function asSnapshot(
  v: PriceSnapshot | Record<string, unknown> | null,
): PriceSnapshot | null {
  if (!v) return null;
  if (
    typeof (v as PriceSnapshot).price_type === "string" &&
    typeof (v as PriceSnapshot).ref_id === "string"
  ) {
    return v as PriceSnapshot;
  }
  return null;
}

export default function EstimateRefresh() {
  useSeo({
    title: "Estimate Refresh — Current Cost Today | FRELUX",
    description:
      "Refresh a saved estimate against today's prices. Old quotes stay honest — see exactly what changed and what has no current price, never a guess.",
  });

  const { user } = useAuth();
  const [estimates, setEstimates] = useState<EstimationEstimate[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [rules, setRules] = useState<EstimationCalcRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<RefreshResult | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const est = await fetchEstimates(user.id);
    if (est.error)
      setLoadError(getSafeError(est.error, "Failed to load your estimates."));
    else setEstimates((est.data ?? []).filter((e) => e.status === "completed"));
    const rl = await fetchCalcRules("estimate_refresh");
    setRules(rl.data);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = estimates.find((e) => e.id === selectedId) ?? null;

  const run = async () => {
    if (!selected) return;
    setRefreshing(true);
    setResult(null);
    try {
      const items = await fetchEstimateItems(selected.id);
      if (items.error) {
        setLoadError(
          getSafeError(items.error, "Failed to load the estimate's items."),
        );
        return;
      }

      // Collect today's price for every distinct (price_type, ref_id) — one query each, from the active price table
      const currentPrices: Record<string, CurrentPriceRef> = {};
      const seen = new Set<string>();
      for (const it of items.data) {
        const snap = asSnapshot(it.price_snapshot);
        if (!snap?.price_type || !snap.ref_id) continue;
        const key = `${snap.price_type}:${snap.ref_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        // Refresh in the estimate's OWN market, inferred from its
        // currency, so a US-priced estimate is never re-priced from
        // the NG book (and vice versa).
        const estimateMarket = snap.currency === "USD" ? "US" : "NG";
        const { data: price } = await fetchActivePriceForMarket(
          snap.price_type,
          snap.ref_id,
          estimateMarket,
        );
        if (price) {
          currentPrices[key] = {
            price: Number(price.price),
            currency: price.currency,
            effective_date: price.effective_date,
          };
        }
      }

      const engineItems: RefreshItemInput[] = items.data.map(
        (it: EstimationEstimateItem) => {
          const snap = asSnapshot(it.price_snapshot);
          return {
            item_id: it.id,
            item_name: it.item_name,
            quantity: Number(it.quantity_required),
            unit: it.unit,
            snapshot_unit_price: snap
              ? Number(snap.unit_price)
              : Number(it.unit_price),
            snapshot_currency: snap?.currency ?? null,
            snapshot_effective_date: snap?.effective_date ?? null,
            price_type: snap?.price_type ?? null,
            ref_id: snap?.ref_id ?? null,
          };
        },
      );

      const r = refreshEstimate({
        estimate_ref: selected.estimate_ref,
        currency: selected.currency || "NGN",
        items: engineItems,
        currentPrices,
        rules,
      });
      setResult(r);
      if (r.ok) track("estimate_refreshed");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Home", path: "/" },
            { label: "Construction Tools", path: "/construction-tools" },
            { label: "Estimate Refresh — Current Cost Today" },
          ]}
          title="Estimate Refresh — Current Cost Today"
          subtitle="Inflation-proof estimating: your saved estimates snapshot the prices they were quoted at. Pick one and see what it would cost today — line by line, with every missing price flagged, never guessed."
        />

        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        )}

        {!user ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Sign in to refresh your saved estimates. Only your own estimates are
            ever listed, and only their stored snapshots are used — nothing is
            re-priced behind your back.
          </div>
        ) : estimates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            You have no completed estimates yet. Run any calculator and save the
            estimate, then come back to keep its quote honest as prices move.
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
            <label className="grid gap-1 text-sm font-medium">
              Saved estimate
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setResult(null);
                }}
              >
                <option value="">Select an estimate</option>
                {estimates.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.estimate_ref} — {e.calculator_type} (
                    {new Date(e.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={run}
              disabled={!selected || refreshing}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {refreshing ? "Refreshing…" : "Refresh to today's prices"}
            </button>
          </div>
        )}

        {result && !result.ok && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
            {result.warnings.map((w, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                {w}
              </p>
            ))}
          </div>
        )}

        {result?.ok && (
          <div className="space-y-4">
            {/* Summary tiles */}
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Quoted
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {money(result.total_then)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.estimate_ref} snapshot
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Current cost today
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {money(result.total_today)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.changed_count} changed · {result.unchanged_count}{" "}
                  unchanged · {result.missing_count} held
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Delta
                </p>
                <p
                  className={`mt-1 text-xl font-semibold ${result.delta > 0 ? "text-amber-500" : result.delta < 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}
                >
                  {result.delta >= 0 ? "+" : ""}
                  {money(result.delta)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.delta_percent !== null
                    ? `${result.delta_percent}% since quoted`
                    : "percentage not computable"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Honest lines
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {result.lines.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.missing_count} held at snapshot — never guessed
                </p>
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {w}
                  </p>
                ))}
              </div>
            )}

            {/* Per-line table */}
            <div className="overflow-x-auto rounded-lg border border-border dark:border-white/5">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Line</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Snapshot price</th>
                    <th className="p-3 text-right">Today's price</th>
                    <th className="p-3 text-right">Line then</th>
                    <th className="p-3 text-right">Line today</th>
                    <th className="p-3 text-right">Delta</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lines.map((l) => (
                    <tr
                      key={l.item_id}
                      className="border-t border-border dark:border-white/5"
                    >
                      <td className="p-3 font-medium">{l.item_name}</td>
                      <td className="p-3 text-right font-mono text-xs">
                        {l.quantity} {l.unit}
                      </td>
                      <td className="p-3 text-right font-mono text-xs">
                        {money(l.snapshot_unit_price)}
                      </td>
                      <td className="p-3 text-right font-mono text-xs">
                        {l.current_unit_price !== null
                          ? money(l.current_unit_price)
                          : "—"}
                      </td>
                      <td className="p-3 text-right font-mono text-xs">
                        {money(l.line_total_then)}
                      </td>
                      <td className="p-3 text-right font-mono text-xs">
                        {money(l.line_total_today)}
                      </td>
                      <td
                        className={`p-3 text-right font-mono text-xs ${l.delta > 0 ? "text-amber-500" : l.delta < 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}
                      >
                        {l.delta >= 0 ? "+" : ""}
                        {money(l.delta)}
                        {l.delta_percent !== null && (
                          <span className="ml-1 text-muted-foreground">
                            ({l.delta_percent}%)
                          </span>
                        )}
                      </td>
                      <td
                        className={`p-3 text-xs ${statusColor[l.price_status] ?? ""}`}
                      >
                        {statusLabel[l.price_status] ?? l.price_status}
                        {l.current_effective_date && (
                          <span className="block text-muted-foreground">
                            effective {l.current_effective_date}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <details className="rounded-lg border border-border bg-card p-4 text-sm dark:border-white/5">
              <summary className="cursor-pointer font-medium">
                How this was determined
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
      </div>
      <AdSlot slotKey="calculator_mid" className="mt-8" />
      <AdSlot slotKey="calculator_native" className="mt-8" />
      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </Container>
  );
}
