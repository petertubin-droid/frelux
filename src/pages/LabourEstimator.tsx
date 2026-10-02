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
import { useSeo } from "@/lib/seo";
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

export default function LabourEstimator() {
  useSeo({
    title: "Labour & Crew Estimator — FRELUX",
    description:
      "Estimate worker-days and crew duration for any finishing task from admin-configured, verifiable productivity rates.",
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
          title="Labour & Crew Estimator"
          subtitle="Worker-days and crew duration for a quantity of work, from admin-configured productivity rates with verifiable sources. The site-efficiency loss is shown as a separate line — never folded into the base rate — and calendar days are always whole days."
        />

        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
          {rates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No labour rates configured yet. Rates are entered by the admin
              team from verifiable sources (contractor data, benchmark studies)
              — FRELUX never publishes guessed productivity figures.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-1 text-sm font-medium">
                Task
                <select
                  className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                  value={taskKey}
                  onChange={(e) => {
                    setTaskKey(e.target.value);
                    setResult(null);
                  }}
                >
                  <option value="">Select a task</option>
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
                Crew size (workers)
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
                  Estimate Labour
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
