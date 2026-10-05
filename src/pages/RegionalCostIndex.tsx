/**
 * FRELUX Regional Cost Index (Future Engine 3)
 *
 * Location-adjusted costing: see the configured regional cost
 * factors per Nigerian state and apply them to any base cost
 * (e.g. from a FRELUX estimate).
 *
 * - Adjusted costs are produced ONLY by applyRegionalCost.
 *   This page renders; it never computes factors itself.
 * - Fallbacks (state general → national baseline) are shown as
 *   warnings, never silent guesses.
 */

import { useEffect, useState } from "react";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import {
  fetchRegionalCostIndices,
  fetchCalcRules,
} from "@/lib/estimation/queries";
import {
  applyRegionalCost,
  statesWithIndices,
  countriesWithIndices,
  type RegionalCostResult,
} from "@/lib/estimation/regional-cost-engine";
import type { RegionalCostIndex, EstimationCalcRule } from "@/types/estimation";
import AdSlot from "@/components/ui/AdSlot";

const money = (v: number) =>
  `₦${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const CATEGORIES = ["general", "labour", "materials"];

export default function RegionalCostIndex() {
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    { name: "Regional Cost Index", path: "/regional-cost-index" },
  ]);
  useSeo({
    title: "Regional Cost Index — FRELUX",
    description:
      "Location-adjusted costing: state and regional labour and material cost factors applied to your FRELUX estimates, starting with Nigeria.",
  });

  const [indices, setIndices] = useState<RegionalCostIndex[]>([]);
  const [rules, setRules] = useState<EstimationCalcRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [baseCost, setBaseCost] = useState("");
  const [country, setCountry] = useState("NG");
  const [state, setState] = useState("");
  const [category, setCategory] = useState("general");
  const [result, setResult] = useState<RegionalCostResult | null>(null);

  useEffect(() => {
    fetchRegionalCostIndices().then(({ data, error }) => {
      if (error) setLoadError(getSafeError(error, "Failed to load indices."));
      else setIndices(data);
    });
    fetchCalcRules("regional_cost").then(({ data }) => setRules(data));
  }, []);

  const countries = countriesWithIndices(indices);
  const showCountrySelect =
    countries.length > 1 || (countries[0] && countries[0] !== "NG");
  const states = statesWithIndices(
    indices.filter((i) => (i.country ?? "NG").toUpperCase() === country),
  );

  const adjust = () => {
    const r = applyRegionalCost({
      base_cost: Number(baseCost),
      country,
      state,
      category,
      indices,
      rules,
    });
    setResult(r);
    if (r.ok) track("regional_cost_adjusted");
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Home", path: "/" },
            { label: "Construction Tools", path: "/construction-tools" },
            { label: "Regional Cost Index" },
          ]}
          title="Regional Cost Index"
          subtitle="State-by-state labour and material cost factors, admin-configured from verifiable sources. Apply them to any base cost to see location-accurate totals. When a state has no configured index the engine falls back to the national baseline and tells you — it never guesses a multiplier."
        />

        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        )}

        {/* ── Adjuster ── */}
        <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
          <h2 className="mb-3 text-base font-semibold">
            Adjust a base cost by state
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {showCountrySelect && (
              <label className="grid gap-1 text-sm font-medium">
                Country
                <select
                  className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setState("");
                  }}
                >
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="grid gap-1 text-sm font-medium">
              Base cost (₦)
              <input
                type="number"
                min="0"
                step="any"
                className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                value={baseCost}
                onChange={(e) => setBaseCost(e.target.value)}
                placeholder="e.g. from an estimate result"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              State / Region
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="">Select state / region</option>
                {states.map((sv) => (
                  <option key={sv} value={sv}>
                    {sv}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Category
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={adjust}
                disabled={!baseCost || !state}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Apply Regional Factor
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
              <div className="rounded-lg border border-border p-4 dark:border-white/5">
                <p className="text-sm text-muted-foreground">
                  {money(Number(baseCost))} × factor{" "}
                  {result.applied_factor!.toFixed(2)} (
                  {result.applied_source === "state_category"
                    ? "state + category index"
                    : result.applied_source === "state_general"
                      ? "state general index"
                      : "national baseline"}
                  )
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {money(result.adjusted_cost!)}
                </p>
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">
                  Applied-factor breakdown
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

        {/* ── Configured indices table ── */}
        <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
          <h2 className="mb-3 text-base font-semibold">Configured indices</h2>
          {indices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No regional cost indices configured yet. Indices are entered by
              the admin team from verifiable sources (market surveys, supplier
              price lists) — FRELUX never publishes guessed factors.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">State</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Factor</th>
                    <th className="p-3">Effective from</th>
                    <th className="p-3">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {indices
                    .filter((i) => i.is_active !== false)
                    .map((i) => (
                      <tr
                        key={i.id}
                        className="border-t border-border dark:border-white/5"
                      >
                        <td className="p-3 font-medium">{i.state}</td>
                        <td className="p-3">{i.category}</td>
                        <td className="p-3 font-mono">
                          {Number(i.cost_factor).toFixed(2)}
                        </td>
                        <td className="p-3">
                          {i.effective_date?.slice(0, 10)}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {i.source_reference}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <AdSlot slotKey="calculator_mid" className="mt-8" />
      <AdSlot slotKey="calculator_native" className="mt-8" />
      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </Container>
  );
}
