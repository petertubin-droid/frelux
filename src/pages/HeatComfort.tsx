/**
 * FRELUX Heat Comfort (Future Engine 6)
 *
 * Compares how two finish choices affect indoor heat comfort
 * via admin-configured solar reflectance (albedo) factors.
 *
 * - The comparison is produced ONLY by calculateHeatComfort.
 *   This page renders; it never scores a finish itself.
 * - Finishes without a configured albedo are refused with a
 *   clear message - never scored with an assumed reflectance.
 */

import { useEffect, useState, useCallback } from "react";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import {
  fetchThermalFinishFactors,
  fetchCalcRules,
} from "@/lib/estimation/queries";
import {
  calculateHeatComfort,
  type HeatComfortResult,
} from "@/lib/estimation/heat-comfort-engine";
import type {
  ThermalFinishFactor,
  EstimationCalcRule,
} from "@/types/estimation";
import AdSlot from "@/components/ui/AdSlot";

export default function HeatComfort() {
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    {
      name: "Heat Comfort: Finish Choice & Indoor Heat",
      path: "/heat-comfort",
    },
  ]);
  useSeo({
    title: "Heat Comfort: Finish Choice & Indoor Heat | FRELUX",
    description:
      "Compare how two finishes affect indoor heat comfort using configured solar reflectance data. Every number comes from a sourced factor: never a guess.",
  });

  const [factors, setFactors] = useState<ThermalFinishFactor[]>([]);
  const [rules, setRules] = useState<EstimationCalcRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [surfaceType, setSurfaceType] = useState<"roof" | "wall">("roof");
  const [area, setArea] = useState("100");
  const [currentCat, setCurrentCat] = useState("");
  const [proposedCat, setProposedCat] = useState("");
  const [result, setResult] = useState<HeatComfortResult | null>(null);

  const load = useCallback(async () => {
    const f = await fetchThermalFinishFactors(true);
    if (f.error)
      setLoadError(
        getSafeError(f.error, "Failed to load thermal finish factors."),
      );
    else setFactors(f.data);
    const rl = await fetchCalcRules("heat_comfort");
    setRules(rl.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const surfaceFactors = factors.filter((f) => f.surface_type === surfaceType);

  const run = () => {
    setResult(null);
    const factorMap: Record<string, { solar_reflectance: number }> = {};
    for (const f of factors)
      factorMap[`${f.surface_type}:${f.category}`] = {
        solar_reflectance: f.solar_reflectance,
      };

    const r = calculateHeatComfort({
      surface_type: surfaceType,
      area_sqm: Number(area),
      current_category: currentCat,
      proposed_category: proposedCat,
      factors: factorMap,
      rules,
    });
    setResult(r);
    if (r.ok) track("heat_compared");
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Home", path: "/" },
            { label: "Construction Tools", path: "/construction-tools" },
            { label: "Heat Comfort: Finish Choice & Indoor Heat" },
          ]}
          title="Heat Comfort: Finish Choice & Indoor Heat"
          subtitle="Brighter finishes reflect more solar energy and keep a space cooler. Compare two finishes on a roof or wall and see the honest difference in absorbed heat: computed only from sourced reflectance factors, never a guess."
        />

        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Surface type
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                value={surfaceType}
                onChange={(e) => {
                  setSurfaceType(e.target.value as "roof" | "wall");
                  setCurrentCat("");
                  setProposedCat("");
                  setResult(null);
                }}
              >
                <option value="roof">Roof</option>
                <option value="wall">Wall</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Surface area (m²)
              <input
                type="number"
                min="1"
                step="1"
                className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Current finish
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                value={currentCat}
                onChange={(e) => {
                  setCurrentCat(e.target.value);
                  setResult(null);
                }}
              >
                <option value="">Select the current finish</option>
                {surfaceFactors.map((f) => (
                  <option key={f.id} value={f.category}>
                    {f.category_label ?? f.category}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Proposed finish
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                value={proposedCat}
                onChange={(e) => {
                  setProposedCat(e.target.value);
                  setResult(null);
                }}
              >
                <option value="">Select the proposed finish</option>
                {surfaceFactors.map((f) => (
                  <option key={f.id} value={f.category}>
                    {f.category_label ?? f.category}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={run}
            disabled={!currentCat || !proposedCat}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Compare finishes
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
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Current albedo
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {result.current_albedo}
                </p>
                <p className="text-xs text-muted-foreground">
                  absorbs {result.current_absorbed_fraction} of solar energy
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Proposed albedo
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {result.proposed_albedo}
                </p>
                <p className="text-xs text-muted-foreground">
                  absorbs {result.proposed_absorbed_fraction} of solar energy
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Energy delta
                </p>
                <p
                  className={`mt-1 text-xl font-semibold ${result.daily_energy_delta_kwh! > 0 ? "text-emerald-600 dark:text-emerald-400" : result.daily_energy_delta_kwh! < 0 ? "text-destructive" : ""}`}
                >
                  {result.daily_energy_delta_kwh! > 0 ? "+" : ""}
                  {result.daily_energy_delta_kwh} kWh/day
                </p>
                <p className="text-xs text-muted-foreground">
                  solar energy no longer absorbed
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Effect
                </p>
                <p
                  className={`mt-1 text-xl font-semibold ${result.direction === "cooler" ? "text-emerald-600 dark:text-emerald-400" : result.direction === "warmer" ? "text-destructive" : ""}`}
                >
                  {result.direction === "cooler"
                    ? "Cooler"
                    : result.direction === "warmer"
                      ? "Warmer"
                      : "No change"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.reduction_percent !== null
                    ? `${result.reduction_percent}% absorbed-energy reduction`
                    : "percentage not computable"}
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

            {result.meaningful_benefit !== null && (
              <p
                className={`text-sm font-medium ${result.meaningful_benefit ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
              >
                {result.meaningful_benefit
                  ? "Above the configured threshold: a meaningful cooling benefit."
                  : "Below the admin-configured threshold for a meaningful cooling benefit."}
              </p>
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
