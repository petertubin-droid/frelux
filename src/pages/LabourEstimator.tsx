/**
 * FRELUX Labour & Crew Estimator (Future Engine 7)
 *
 * Deterministic worker-days and crew duration from
 * admin-configured productivity rates, with a transparent
 * site-efficiency loss and whole calendar days.
 *
 * - The schedule is produced ONLY by calculateLabour.
 *   This page renders; it never computes durations itself.
 */

import { useEffect, useState } from "react";
import { stageStudioImport } from "@/lib/document-studio";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { useMarket } from "@/lib/international/market-context";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { fetchLabourRates, fetchCalcRules } from "@/lib/estimation/queries";
import {
  calculateLabour,
  type LabourResult,
} from "@/lib/estimation/labour-crew-engine";
import type { LabourRate, EstimationCalcRule } from "@/types/estimation";
import AdSlot from "@/components/ui/AdSlot";
import { useLanguage } from "@/lib/i18n";

export default function LabourEstimator() {
  const { t } = useLanguage();
  const { market } = useMarket();
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    { name: "Labour & Crew Estimator", path: "/labour-estimator" },
  ]);
  useSeo({
    title: "Labour & Crew Estimator: FRELUX",
    description:
      "Estimate worker-days and crew duration for any finishing task from verified, verifiable productivity rates.",
  });

  const [rates, setRates] = useState<LabourRate[]>([]);
  const [rules, setRules] = useState<EstimationCalcRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [taskKey, setTaskKey] = useState("");
  const [quantity, setQuantity] = useState("");
  const [crewSize, setCrewSize] = useState("2");
  const [result, setResult] = useState<LabourResult | null>(null);

  useEffect(() => {
    fetchLabourRates({ activeOnly: true }).then(({ data, error }) => {
      if (error)
        setLoadError(getSafeError(error, "Failed to load labour rates."));
      else setRates(data);
    });
    fetchCalcRules("labour").then(({ data }) => setRules(data));
  }, []);

  const selected = rates.find((r) => r.task_key === taskKey) ?? null;

  const run = () => {
    const r = calculateLabour({
      task_key: taskKey,
      quantity: Number(quantity),
      crew_size: Number(crewSize),
      rates,
      rules,
    });
    setResult(r);
    if (r.ok) track("labour_estimated");
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Home", path: "/" },
            { label: "Construction Tools", path: "/construction-tools" },
            { label: "Labour & Crew Estimator" },
          ]}
          title={t("Labour & Crew Estimator")}
          subtitle="Worker-days and crew duration for a quantity of work, from verified productivity rates with verifiable sources. The site-efficiency loss is shown as a separate line: never folded into the base rate: and calendar days are always whole days."
        />

        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        )}

        <div className="rounded-lg border border-border/60 bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">
          <span>
            Active Market:{" "}
            <strong className="text-foreground">
              {market.countryName} ({market.marketCode})
            </strong>
            . Productivity rates represent benchmark output per worker-day from
            verifiable industry references and apply across crew sizes.
            Site-specific efficiency and local working conditions adjust the
            effective output.
          </span>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
          {rates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No labour rates configured yet. Rates are entered by FRELUX team
              from verifiable sources (contractor data, benchmark studies) :
              FRELUX never publishes guessed productivity figures.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-1 text-sm font-medium">
                {t("Task")}
                <select
                  className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                  value={taskKey}
                  onChange={(e) => {
                    setTaskKey(e.target.value);
                    setResult(null);
                  }}
                >
                  <option value="">{t("Select a task")}</option>
                  {rates.map((r) => (
                    <option key={r.id} value={r.task_key}>
                      {r.task_label ?? r.task_key} ({r.output_per_worker_day}{" "}
                      {r.unit}/wd)
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                {selected ? `Quantity (${selected.unit})` : "Quantity"}
                <input
                  type="number"
                  min="1"
                  step="any"
                  className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 240"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                {t("Crew size (workers)")}
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                  value={crewSize}
                  onChange={(e) => setCrewSize(e.target.value)}
                />
              </label>
              <div className="sm:col-span-3">
                <button
                  type="button"
                  onClick={run}
                  disabled={!taskKey || !quantity}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {t("Estimate Labour")}
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
                {result.task_label} · {result.quantity} {result.unit} · crew of{" "}
                {result.crew_size}
              </p>
              <div className="mt-1 flex items-baseline gap-3">
                <p className="text-3xl font-bold">
                  {result.calendar_days} day
                  {result.calendar_days === 1 ? "" : "s"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {result.worker_days} worker-days at {result.effective_rate}{" "}
                  {result.unit}/worker-day
                </p>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Rate: {result.base_rate} {result.unit}/wd (source:{" "}
                {result.source_reference}), less{" "}
                {result.efficiency_loss_percent}% site efficiency.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex rounded-lg border border-primary/40 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
              onClick={() => {
                stageStudioImport({
                  title: `Labour schedule · ${result.task_label}`,
                  document_type: "labour_schedule",
                  currency: market.currencyCode || "NGN",
                  notes: `Quantity: ${result.quantity} ${result.unit}. Crew size: ${result.crew_size}. Calendar duration: ${result.calendar_days} days. Worker-days: ${result.worker_days}. Rate: ${result.base_rate} ${result.unit}/worker-day (source: ${result.source_reference}). Efficiency adjustment: ${result.efficiency_loss_percent}%. Labour cost is not supplied by this estimator; no cost is fabricated.`,
                  materials: [],
                });
                window.location.assign("/document-studio?calculatorImport=1");
              }}
            >
              {t("Customize labour schedule in Document Studio")}
            </button>
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
      <AdSlot slotKey="calculator_mid" className="mt-8" />
      <AdSlot slotKey="calculator_native" className="mt-8" />
    </Container>
  );
}
