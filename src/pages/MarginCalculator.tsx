/**
 * FRELUX Profit Margin Calculator (Future Engine 8)
 *
 * Deterministic client price and profit from a base cost and
 * admin-configured margin presets, with the markup-vs-margin
 * distinction explicit in every breakdown.
 *
 * - The pricing is produced ONLY by calculateMargin.
 *   This page renders; it never computes money itself.
 */

import { useEffect, useState } from "react";
import { useSeo } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { fetchMarginPresets, fetchCalcRules } from "@/lib/estimation/queries";
import {
  calculateMargin,
  type MarginResult,
} from "@/lib/estimation/margin-engine";
import type { MarginPreset, EstimationCalcRule } from "@/types/estimation";

const money = (v: number) =>
  `₦${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function MarginCalculator() {
  useSeo({
    title: "Profit Margin Calculator — FRELUX",
    description:
      "Price any base cost deterministically from admin-configured margin presets, with the markup-on-cost vs margin-on-price distinction made explicit.",
  });

  const [presets, setPresets] = useState<MarginPreset[]>([]);
  const [rules, setRules] = useState<EstimationCalcRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [presetId, setPresetId] = useState("");
  const [cost, setCost] = useState("");
  const [result, setResult] = useState<MarginResult | null>(null);

  useEffect(() => {
    fetchMarginPresets({ activeOnly: true }).then(({ data, error }) => {
      if (error)
        setLoadError(getSafeError(error, "Failed to load margin presets."));
      else {
        setPresets(data);
        const def = data.find((p) => p.is_default) ?? data[0];
        if (def) setPresetId(def.id);
      }
    });
    fetchCalcRules("margin").then(({ data }) => setRules(data));
  }, []);

  const selected = presets.find((p) => p.id === presetId) ?? null;

  const run = () => {
    if (!selected) return;
    const r = calculateMargin({
      base_cost: Number(cost),
      margin_percent: selected.margin_percent,
      basis: selected.basis,
      rules,
    });
    setResult(r);
    if (r.ok) track("margin_calculated");
  };

  const basisLabel = (p: MarginPreset) =>
    p.basis === "markup_on_cost" ? "markup on cost" : "margin on price";

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Profit Margin Calculator"
          subtitle="Client price and profit for any base cost, from admin-configured margin presets. Every quote shows whether the percent applied to the cost (markup) or the price (margin) — the two are never confused, and VAT is added only from a configured rate, never guessed."
        />

        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
          {presets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No margin presets configured yet. Pricing structures are entered
              by the admin team (e.g. Standard finishing, 25% markup on cost) —
              FRELUX never publishes guessed pricing.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">
                Margin preset
                <select
                  className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                  value={presetId}
                  onChange={(e) => {
                    setPresetId(e.target.value);
                    setResult(null);
                  }}
                >
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.margin_percent}% {basisLabel(p)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Base cost (₦)
                <input
                  type="number"
                  min="1"
                  step="any"
                  className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="e.g. 1000000"
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={run}
                  disabled={!selected || !cost}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Calculate Quote
                </button>
              </div>
            </div>
          )}
        </div>

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
            {result.warnings.map((w, i) => (
              <p
                key={i}
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-muted-foreground"
              >
                {w}
              </p>
            ))}
            <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
              <p className="text-sm text-muted-foreground">
                {selected?.name} · {result.margin_percent}%{" "}
                {result.basis === "markup_on_cost"
                  ? "markup on cost"
                  : "margin on price"}
                {" · "}equivalent to {result.equivalent_other_basis_percent}%
                the other way
              </p>
              <p className="mt-1 text-3xl font-bold">
                {money(result.quote_total!)}
              </p>
              <div className="mt-3 space-y-1 text-sm">
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Base cost</span>
                  <span>{money(result.base_cost!)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Profit</span>
                  <span>{money(result.profit!)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Priced subtotal</span>
                  <span>{money(result.priced_subtotal!)}</span>
                </p>
                {result.vat_amount !== null && (
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">
                      VAT
                      {result.vat_rate !== null ? ` (${result.vat_rate}%)` : ""}
                    </span>
                    <span>{money(result.vat_amount)}</span>
                  </p>
                )}
                <p className="flex justify-between border-t border-border pt-1 font-semibold">
                  <span>Quote total</span>
                  <span>{money(result.quote_total!)}</span>
                </p>
              </div>
            </div>
            <details className="rounded-lg border border-border bg-card p-4 text-sm dark:border-white/5">
              <summary className="cursor-pointer font-medium">
                Calculation breakdown
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
    </Container>
  );
}
