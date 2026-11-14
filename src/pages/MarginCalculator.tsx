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

import EstimateDisclaimer from "@/components/calculators/EstimateDisclaimer";
import CalculatorResetButton from "@/components/calculators/CalculatorResetButton";
import HowCalculatedSection from "@/components/calculators/HowCalculatedSection";
import { QuoteShareButton } from "@/components/calculators/QuoteShareButton";
import { methodologyText } from "@/lib/calculatorMethodology";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
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
import { useLanguage } from "@/lib/i18n";

// Worldwide-currency money formatting via the site-wide layer.
const money = (v: number) => formatCurrency(v);

export default function MarginCalculator() {
  const { t } = useLanguage();
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

  /** Clears only what the visitor typed. Presets and rules stay loaded, since
   *  they are the catalogue this calculator prices against, not user input. */
  const resetInputs = () => {
    setCost("");
    setMaterials("");
    setOtherDirect("");
    setLaborHours("");
    setLaborRate("");
    setWeeklyOverhead("");
    setDurationWeeks("");
    setCostBreakdown(null);
    setResult(null);
  };

  const buildQuote = () => {
    if (!result?.ok || result.quote_total === null) return null;
    return {
      title: "FRELUX Profit Margin Estimate",
      metaRows: [
        ["Preset", selected?.name ?? "Configured preset"],
        ["Basis", result.basis ?? "margin on price"],
        ["Margin applied", `${result.margin_percent ?? 0}%`],
        ["Base cost", result.base_cost === null ? "" : money(result.base_cost)],
      ] as Array<[string, string]>,
      lines: (result.steps ?? []).map((step) => ({
        label: step.label,
        detail: step.detail,
      })),
      totals: [
        {
          label: "Profit",
          value: result.profit === null ? "" : money(result.profit),
        },
        {
          label: result.vat_rate !== null ? `VAT (${result.vat_rate}%)` : "VAT",
          value: result.vat_amount === null ? "" : money(result.vat_amount),
        },
        {
          label: "Quote total",
          value: money(result.quote_total),
          strong: true,
        },
      ],
    };
  };

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
          title={t("Profit Margin Calculator")}
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
                aria-label={t("Project cost entry method")}
              >
                <button
                  type="button"
                  onClick={() => {
                    setCostMode("components");
                    setResult(null);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${costMode === "components" ? "bg-primary text-primary-foreground" : "border border-border"}`}
                >
                  {t("Build cost from components")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCostMode("single");
                    setResult(null);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${costMode === "single" ? "bg-primary text-primary-foreground" : "border border-border"}`}
                >
                  {t("Enter one base cost")}
                </button>
              </div>
              {costMode === "components" && (
                <div className="mb-5 rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
                  <h2 className="font-semibold">
                    {t("Build your project cost")}
                  </h2>
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
                          placeholder={t("Enter amount")}
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
                  {t("Margin preset")}
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
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {t("Calculate Quote")}
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
                  <p className="mb-2 font-semibold">{t("Cost build-up")}</p>
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
                  <span className="text-muted-foreground">
                    {t("Base cost")}
                  </span>
                  <span>{money(result.base_cost!)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("Markup on cost")}
                  </span>
                  <span>
                    {((result.profit! / result.base_cost!) * 100).toFixed(2)}%
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("Net margin on priced subtotal")}
                  </span>
                  <span>
                    {((result.profit! / result.priced_subtotal!) * 100).toFixed(
                      2,
                    )}
                    %
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">{t("Profit")}</span>
                  <span>{money(result.profit!)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("Priced subtotal")}
                  </span>
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
                  <span>{t("Quote total")}</span>
                  <span>{money(result.quote_total!)}</span>
                </p>
              </div>
            </div>
            <details className="rounded-lg border border-border bg-card p-4 text-sm dark:border-white/5">
              <summary className="cursor-pointer font-medium">
                {t("Calculation breakdown")}
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
      <div className="mt-6 space-y-3">
        <QuoteShareButton
          showPdf
          build={buildQuote}
          kind="Profit Margin Estimate"
          link="/margin-calculator"
        />
        <CalculatorResetButton onReset={resetInputs} />
        <HowCalculatedSection methodologyText={methodologyText("margin")} />
      </div>
      <AdSlot slotKey="calculator_mid" className="mt-8" />
      <AdSlot slotKey="calculator_native" className="mt-8" />
      <div className="mt-10">
        <RelatedTools
          links={[
            CALC_LINKS.smartCalc,
            CALC_LINKS.buildToRoof,
            CALC_LINKS.imageEstimator,
          ]}
        />
      </div>

      <EstimateDisclaimer />
    </Container>
  );
}
