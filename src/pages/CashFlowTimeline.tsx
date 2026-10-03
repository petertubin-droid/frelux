/**
 * FRELUX Cash-Flow Timeline (Future Engine 6)
 *
 * Deterministic phased payment schedule for an estimate total,
 * from admin-configured milestone templates. Percentages must
 * sum to exactly 100% — anything else is refused, never
 * silently adjusted.
 *
 * - The schedule is produced ONLY by calculateCashFlow.
 *   This page renders; it never computes payments itself.
 */

import { useEffect, useState } from "react";
import { useSeo } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import {
  fetchCashFlowTemplates,
  fetchCalcRules,
} from "@/lib/estimation/queries";
import {
  calculateCashFlow,
  type CashFlowResult,
} from "@/lib/estimation/cash-flow-engine";
import type { CashFlowTemplate, EstimationCalcRule } from "@/types/estimation";
import AdSlot from "@/components/ui/AdSlot";

const money = (v: number) =>
  `₦${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function CashFlowTimeline() {
  useSeo({
    title: "Cash-Flow Timeline — FRELUX",
    description:
      "Generate a deterministic phased payment schedule for any estimate total from admin-configured milestone templates.",
  });

  const [templates, setTemplates] = useState<CashFlowTemplate[]>([]);
  const [rules, setRules] = useState<EstimationCalcRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [templateId, setTemplateId] = useState("");
  const [total, setTotal] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [result, setResult] = useState<CashFlowResult | null>(null);

  useEffect(() => {
    fetchCashFlowTemplates({ activeOnly: true }).then(({ data, error }) => {
      if (error)
        setLoadError(
          getSafeError(error, "Failed to load cash-flow templates."),
        );
      else {
        setTemplates(data);
        const def = data.find((t) => t.is_default) ?? data[0];
        if (def) setTemplateId(def.id);
      }
    });
    fetchCalcRules("cash_flow").then(({ data }) => setRules(data));
  }, []);

  const selected = templates.find((t) => t.id === templateId) ?? null;

  const run = () => {
    if (!selected) return;
    const r = calculateCashFlow({
      total_amount: Number(total),
      start_date: startDate,
      milestones: selected.milestones,
      rules,
    });
    setResult(r);
    if (r.ok) track("cash_flow_scheduled");
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Cash-Flow Timeline"
          subtitle="Phased payment schedule for an estimate total, from admin-configured milestone templates. Milestone percentages must sum to exactly 100% — FRELUX refuses anything else rather than silently adjusting your payment plan."
        />

        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No cash-flow templates configured yet. The admin team defines
              payment milestone structures (e.g. mobilization, mid-project,
              completion) — FRELUX never publishes guessed payment plans.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-1 text-sm font-medium">
                Template
                <select
                  className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                  value={templateId}
                  onChange={(e) => {
                    setTemplateId(e.target.value);
                    setResult(null);
                  }}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Estimate total (₦)
                <input
                  type="number"
                  min="1"
                  className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  placeholder="e.g. 2500000"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Start date
                <input
                  type="date"
                  className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <div className="sm:col-span-3">
                <button
                  type="button"
                  onClick={run}
                  disabled={!selected || !total || !startDate}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Generate Schedule
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
                {result.payments.length} payments for{" "}
                {money(result.total_amount!)} starting {result.start_date}
              </p>
              <p className="mt-1 text-3xl font-bold">
                {money(result.scheduled_total)} scheduled
              </p>
              <div className="mt-4 space-y-2">
                {result.payments.map((p, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {p.label} · {p.percent}% · {p.date}
                      </span>
                      <span>
                        {money(p.amount)}{" "}
                        <span className="text-xs text-muted-foreground">
                          (cumulative {money(p.cumulative_amount)})
                        </span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${p.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
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
      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </Container>
  );
}
