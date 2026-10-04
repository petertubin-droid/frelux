/**
 * FRELUX Embodied Carbon Estimator (Future Engine 5)
 *
 * kgCO2e for a set of estimate lines from admin-configured
 * carbon factors. Lines without a configured factor are
 * excluded with a warning — never a guessed emission.
 *
 * - Totals are produced ONLY by calculateEmbodiedCarbon.
 *   This page renders; it never computes emissions itself.
 */

import { useEffect, useState } from "react";
import { useSeo } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { fetchCarbonFactors, fetchCalcRules } from "@/lib/estimation/queries";
import {
  calculateEmbodiedCarbon,
  categoriesWithFactors,
  type EmbodiedCarbonResult,
} from "@/lib/estimation/embodied-carbon-engine";
import type { CarbonFactor, EstimationCalcRule } from "@/types/estimation";
import AdSlot from "@/components/ui/AdSlot";

interface LineForm {
  category: string;
  quantity: string;
}

const emptyLine: LineForm = { category: "", quantity: "" };

export default function CarbonFootprint() {
  useSeo({
    title: "Embodied Carbon Estimator — FRELUX",
    description:
      "Estimate the embodied carbon (kgCO2e) of your construction and finishing works from verified, admin-configured emission factors.",
  });

  const [factors, setFactors] = useState<CarbonFactor[]>([]);
  const [rules, setRules] = useState<EstimationCalcRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [lines, setLines] = useState<LineForm[]>([{ ...emptyLine }]);
  const [result, setResult] = useState<EmbodiedCarbonResult | null>(null);

  useEffect(() => {
    fetchCarbonFactors().then(({ data, error }) => {
      if (error)
        setLoadError(getSafeError(error, "Failed to load carbon factors."));
      else setFactors(data);
    });
    fetchCalcRules("embodied_carbon").then(({ data }) => setRules(data));
  }, []);

  const categories = categoriesWithFactors(factors);
  const factorByCategory = (cat: string) =>
    factors.find(
      (f) =>
        f.is_active !== false && f.category.toLowerCase() === cat.toLowerCase(),
    );

  const setLine = (i: number, patch: Partial<LineForm>) =>
    setLines((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    );

  const calculate = () => {
    const r = calculateEmbodiedCarbon({
      lines: lines
        .filter((l) => l.category && l.quantity !== "")
        .map((l) => ({ category: l.category, quantity: Number(l.quantity) })),
      factors,
      rules,
    });
    setResult(r);
    if (r.ok) track("carbon_estimated");
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Home", path: "/" },
            { label: "Construction Tools", path: "/construction-tools" },
            { label: "Embodied Carbon Estimator" },
          ]}
          title="Embodied Carbon Estimator"
          subtitle="kgCO2e per line from admin-configured, verifiable emission factors (EPDs, ICE database). Lines without a configured factor are excluded with a warning — FRELUX never guesses an emission."
        />

        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
          <h2 className="mb-3 text-base font-semibold">Estimate lines</h2>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No carbon factors configured yet. Factors are entered by the admin
              team from verifiable sources — FRELUX never publishes guessed
              emission values.
            </p>
          ) : (
            <div className="space-y-3">
              {lines.map((line, i) => {
                const factor = line.category
                  ? factorByCategory(line.category)
                  : null;
                return (
                  <div
                    key={i}
                    className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                  >
                    <select
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={line.category}
                      onChange={(e) => setLine(i, { category: e.target.value })}
                    >
                      <option value="">Select material/finish</option>
                      {categories.map((c) => {
                        const f = factorByCategory(c)!;
                        return (
                          <option key={c} value={c}>
                            {f.category_label ?? c} ({f.unit})
                          </option>
                        );
                      })}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={line.quantity}
                      onChange={(e) => setLine(i, { quantity: e.target.value })}
                      placeholder={`Quantity${factor ? ` (${factor.unit})` : ""}`}
                    />
                    <p className="self-center text-xs text-muted-foreground">
                      {factor
                        ? `${factor.kg_co2e_per_unit} kgCO2e/${factor.unit} · ${factor.source_reference}`
                        : "Pick a material to see its factor and source"}
                    </p>
                    <button
                      type="button"
                      className="self-center rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-30"
                      disabled={lines.length === 1}
                      onClick={() =>
                        setLines((prev) => prev.filter((_, idx) => idx !== i))
                      }
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
                  onClick={() =>
                    setLines((prev) => [...prev, { ...emptyLine }])
                  }
                >
                  + Add line
                </button>
                <button
                  type="button"
                  onClick={calculate}
                  disabled={!lines.some((l) => l.category && l.quantity !== "")}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Calculate Carbon
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
                Total embodied carbon across {result.covered_lines} covered line
                {result.covered_lines === 1 ? "" : "s"}
                {result.excluded_lines > 0
                  ? ` (${result.excluded_lines} excluded — see warnings)`
                  : ""}
              </p>
              <p className="mt-1 text-3xl font-bold">
                {result.total_kg_co2e.toLocaleString()} kgCO₂e
              </p>
            </div>
            <details className="rounded-lg border border-border bg-card p-4 text-sm dark:border-white/5">
              <summary className="cursor-pointer font-medium">
                Per-line breakdown
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
