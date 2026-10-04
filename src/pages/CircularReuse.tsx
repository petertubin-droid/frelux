/**
 * FRELUX Circular/Reuse (Future Engine 9)
 *
 * Material recovery and reuse quantities for a demolition or
 * strip-out, from admin-configured recovery factors.
 *
 * - The plan is produced ONLY by calculateCircularReuse.
 *   This page renders; it never estimates recovery itself.
 * - Materials without a configured factor are refused with a
 *   clear message — never estimated with assumed rates.
 * - A missing reclaimed value is reported honestly, never
 *   invented.
 */

import { useEffect, useState, useCallback } from "react";
import { useSeo } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import {
  fetchMaterialReuseFactors,
  fetchCalcRules,
} from "@/lib/estimation/queries";
import {
  calculateCircularReuse,
  type CircularReuseResult,
} from "@/lib/estimation/circular-reuse-engine";
import type {
  MaterialReuseFactor,
  EstimationCalcRule,
} from "@/types/estimation";
import AdSlot from "@/components/ui/AdSlot";

export default function CircularReuse() {
  useSeo({
    title: "Circular & Reuse — Demolition Recovery Quantities | FRELUX",
    description:
      "Plan material recovery from a demolition or strip-out: recovered, reused, recycled and landfilled quantities, landfill-diversion rate against a circular-economy target, and reclaimed-material value. Every number comes from a sourced factor — never a guess.",
  });

  const [factors, setFactors] = useState<MaterialReuseFactor[]>([]);
  const [rules, setRules] = useState<EstimationCalcRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [result, setResult] = useState<CircularReuseResult | null>(null);

  const load = useCallback(async () => {
    const f = await fetchMaterialReuseFactors(true);
    if (f.error)
      setLoadError(
        getSafeError(f.error, "Failed to load material reuse factors."),
      );
    else setFactors(f.data);
    const rl = await fetchCalcRules("circular_reuse");
    setRules(rl.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = factors.find((f) => f.category === category);

  const run = () => {
    setResult(null);
    const factorMap: Record<
      string,
      {
        recovery_rate: number;
        reuse_fraction: number;
        recycle_fraction: number;
        unit_value_naira: number | null;
      }
    > = {};
    for (const f of factors)
      factorMap[f.category] = {
        recovery_rate: f.recovery_rate,
        reuse_fraction: f.reuse_fraction,
        recycle_fraction: f.recycle_fraction,
        unit_value_naira: f.unit_value_naira,
      };

    const r = calculateCircularReuse({
      category,
      quantity: Number(quantity),
      factors: factorMap,
      rules: rules.map((r) => ({
        rule_key: r.rule_key,
        rule_value: r.rule_value as Record<string, unknown>,
      })),
    });
    setResult(r);
    if (r.ok) track("circular_reuse_planned");
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Home", path: "/" },
            { label: "Construction Tools", path: "/construction-tools" },
            { label: "Circular & Reuse — Demolition Recovery" },
          ]}
          title="Circular & Reuse — Demolition Recovery"
          subtitle="Circular-economy mandates are coming to construction. Plan a demolition or strip-out honestly: how much material is recoverable, reusable, recyclable, and what lands in a dump — computed only from sourced recovery factors, never a guess."
        />

        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Material category
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setResult(null);
                }}
              >
                <option value="">Select the material being stripped out</option>
                {factors.map((f) => (
                  <option key={f.id} value={f.category}>
                    {f.category_label ?? f.category}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Quantity {selected ? `(${selected.unit})` : ""}
              <input
                type="number"
                min="1"
                step="1"
                className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={run}
            disabled={!category || !quantity}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Plan recovery
          </button>
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Recovered
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {result.recovered_qty} {selected?.unit}
                </p>
                <p className="text-xs text-muted-foreground">
                  recoverable from demolition
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Reused
                </p>
                <p className="mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                  {result.reused_qty} {selected?.unit}
                </p>
                <p className="text-xs text-muted-foreground">
                  fit for direct reuse
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Recycled
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {result.recycled_qty} {selected?.unit}
                </p>
                <p className="text-xs text-muted-foreground">
                  fit for recycling
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  To landfill
                </p>
                <p className="mt-1 text-xl font-semibold text-destructive">
                  {result.landfill_qty} {selected?.unit}
                </p>
                <p className="text-xs text-muted-foreground">not diverted</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Landfill diversion
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {result.diversion_percent}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.meets_diversion_target === null
                    ? "not measured — no diversion target configured"
                    : result.meets_diversion_target
                      ? "meets the configured circular-economy target"
                      : "below the configured circular-economy target"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Reuse value
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {result.reuse_value_naira === null
                    ? "—"
                    : `₦${result.reuse_value_naira.toLocaleString("en-NG")}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.reuse_value_naira === null
                    ? "no reclaimed value configured for this material"
                    : "reclaimed-material value of the reusable quantity"}
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
