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
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { fetchMarginPresets, fetchCalcRules } from "@/lib/estimation/queries";
import {
  calculateMargin,
  type MarginResult,
} from "@/lib/estimation/margin-engine";
import { calculateProjectCost } from "@/lib/estimation/advanced-takeoff-engine";
import type { MarginPreset, EstimationCalcRule } from "@/types/estimation";
import AdSlot from "@/components/ui/AdSlot";
import { formatCurrency } from "@/lib/utils";
import { useDisplayCurrency } from "@/lib/international/currency-context";

// Worldwide-currency money formatting via the site-wide layer.
const money = (v: number) => formatCurrency(v);

export default function MarginCalculator() {
  const { symbol: currencySymbol } = useDisplayCurrency();
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    { name: "Profit Margin Calculator", path: "/margin-calculator" },
  ]);
  useSeo({
    title: "Profit Margin Calculator: FRELUX",
    description:
      "Price any base cost deterministically from verified margin presets, with the markup-on-cost vs margin-on-price distinction made explicit.",
  });

  const [presets, setPresets] = useState<MarginPreset[]>([]);
  const [rules, setRules] = useState<EstimationCalcRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [presetId, setPresetId] = useState("");
  const [cost, setCost] = useState("");
  const [costMode, setCostMode] = useState<"single" | "components">(
    "components",
  );
  const [materials, setMaterials] = useState("");
  const [otherDirect, setOtherDirect] = useState("");
  const [laborHours, setLaborHours] = useState("");
  const [laborRate, setLaborRate] = useState("");
  const [weeklyOverhead, setWeeklyOverhead] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("");
  const [costBreakdown, setCostBreakdown] = useState<{
    materials: number;
    otherDirectCosts: number;
    laborCost: number;
    overheadCost: number;
    directAndOverheadCost: number;
  } | null>(null);
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
  const componentInputs = [
    materials,
    otherDirect,
    laborHours,
    laborRate,
    weeklyOverhead,
    durationWeeks,
  ];
  const componentInputsValid = componentInputs.every(
    (value) =>
      value.trim() !== "" &&
      Number.isFinite(Number(value)) &&
      Number(value) >= 0,
  );

  const run = () => {
    if (!selected) return;
    let baseCost = Number(cost);
    if (costMode === "components") {
      const amountFields = [
        materials,
        otherDirect,
        laborHours,
        laborRate,
        weeklyOverhead,
        durationWeeks,
      ];
      if (amountFields.some((value) => value.trim() === "")) {
        setCostBreakdown(null);
        setResult({
          ok: false,
          basis: null,
          base_cost: null,
          margin_percent: null,
          profit: null,
          priced_subtotal: null,
          equivalent_other_basis_percent: null,
          vat_rate: null,
          vat_amount: null,
          quote_total: null,
          warnings: [
            "Enter each direct-cost, labor and duration field. Use 0 only when that amount or duration is truly zero.",
          ],
          steps: [],
        });
        return;
      }
      const totals = calculateProjectCost({
        materials: Number(materials),
        otherDirectCosts: Number(otherDirect),
        laborHours: Number(laborHours),
        laborRatePerHour: Number(laborRate),
        weeklyOverhead: Number(weeklyOverhead),
        durationWeeks: Number(durationWeeks),
      });
      if (!totals.data) {
        setCostBreakdown(null);
        setResult({
          ok: false,
          basis: null,
          base_cost: null,
          margin_percent: null,
          profit: null,
          priced_subtotal: null,
          equivalent_other_basis_percent: null,
          vat_rate: null,
          vat_amount: null,
          quote_total: null,
          warnings: totals.errors,
          steps: [],
        });
        return;
      }
      setCostBreakdown(totals.data);
      baseCost = totals.data.directAndOverheadCost;
    } else setCostBreakdown(null);
    const r = calculateMargin({
      base_cost: baseCost,
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
          breadcrumbs={[
            { label: "Home", path: "/" },
            { label: "Construction Tools", path: "/construction-tools" },
            { label: "Profit Margin Calculator" },
          ]}
          title="Profit Margin Calculator"
          subtitle="Build a complete bid cost from direct costs, labor hours and weekly overhead, or enter one base cost. Apply a configured profit preset and distinguish markup on cost from margin on price. VAT is added only from a configured rate, never guessed."
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
              by FRELUX team (e.g. Standard finishing, 25% markup on cost).
              FRELUX never publishes guessed pricing.
            </p>
          ) : (
            <>
              <div
                className="mb-5 flex flex-wrap gap-2"
                role="group"
                aria-label="Project cost entry method"
              >
                <button
                  type="button"
                  onClick={() => {
                    setCostMode("components");
                    setResult(null);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${costMode === "components" ? "bg-primary text-primary-foreground" : "border border-border"}`}
                >
                  Build cost from components
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCostMode("single");
                    setResult(null);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${costMode === "single" ? "bg-primary text-primary-foreground" : "border border-border"}`}
                >
                  Enter one base cost
                </button>
              </div>
              {costMode === "components" && (
                <div className="mb-5 rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
                  <h2 className="font-semibold">Build your project cost</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enter costs in the selected display currency; no cost, rate,
                    duration or tax is inferred.
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {(
                      [
                        [
                          "Materials and subcontracted direct costs",
                          materials,
                          setMaterials,
                        ],
                        ["Other direct costs", otherDirect, setOtherDirect],
                        ["Labor hours", laborHours, setLaborHours],
                        ["Labor rate per hour", laborRate, setLaborRate],
                        ["Weekly overhead", weeklyOverhead, setWeeklyOverhead],
                        [
                          "Project duration (weeks)",
                          durationWeeks,
                          setDurationWeeks,
                        ],
                      ] as const
                    ).map(([label, value, setValue]) => (
                      <label
                        key={label}
                        className="grid gap-1 text-sm font-medium"
                      >
                        {label}
                        <input
                          aria-label={label}
                          type="number"
                          min="0"
                          step="any"
                          className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                          value={value}
                          onChange={(e) => {
                            setValue(e.target.value);
                            setResult(null);
                          }}
                          placeholder="Enter amount"
                        />
                      </label>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Labor cost = hours × rate · Overhead = weekly overhead ×
                    project weeks · Cost basis = materials + other direct costs
                    + labor + overhead.
                  </p>
                </div>
              )}
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
                        {p.name}: {p.margin_percent}% {basisLabel(p)}
                      </option>
                    ))}
                  </select>
                </label>
                {costMode === "single" && (
                  <label className="grid gap-1 text-sm font-medium">
                    Base cost ({currencySymbol})
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
                )}
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={run}
                    disabled={
                      !selected ||
                      (costMode === "single" ? !cost : !componentInputsValid)
                    }
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    Calculate Quote
                  </button>
                </div>
              </div>
            </>
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
              {costBreakdown && (
                <div className="mt-4 rounded-xl bg-muted/35 p-3 text-sm">
                  <p className="mb-2 font-semibold">Cost build-up</p>
                  {[
                    [
                      "Materials and subcontracted direct costs",
                      costBreakdown.materials,
                    ],
                    ["Other direct costs", costBreakdown.otherDirectCosts],
                    ["Labor (hours × rate)", costBreakdown.laborCost],
                    [
                      "Overhead (weekly × duration)",
                      costBreakdown.overheadCost,
                    ],
                  ].map(([label, amount]) => (
                    <p
                      key={String(label)}
                      className="flex justify-between gap-4 py-1"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <span>{money(Number(amount))}</span>
                    </p>
                  ))}
                </div>
              )}
              <div className="mt-3 space-y-1 text-sm">
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Base cost</span>
                  <span>{money(result.base_cost!)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Markup on cost</span>
                  <span>
                    {((result.profit! / result.base_cost!) * 100).toFixed(2)}%
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">
                    Net margin on priced subtotal
                  </span>
                  <span>
                    {((result.profit! / result.priced_subtotal!) * 100).toFixed(
                      2,
                    )}
                    %
                  </span>
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
      <AdSlot slotKey="calculator_mid" className="mt-8" />
      <AdSlot slotKey="calculator_native" className="mt-8" />
    </Container>
  );
}
