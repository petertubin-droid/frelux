/**
 * Predictive Analytics — FRELUX engine #3 "Predictive analytics
 * & AI" UI (2026-10-15). Contractor workspace page.
 *
 * Shows, from the owner's own recorded outcome history:
 *  - the outcome dataset overview,
 *  - the register-outcome form (labels derived, never typed),
 *  - per-market data-quality verdicts (M3),
 *  - walk-forward back-test metrics with uncertainty bounds (M2),
 *  - the safety decision-support panel behind the independent
 *    validation gate (M4).
 *
 * Every claim on this page carries its evidence; insufficient
 * history renders honest refusals, never invented numbers.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchProjectOutcomes,
  OUTCOME_LABELS,
  saveProjectOutcome,
  type ProjectOutcomeRecord,
} from "@/lib/predictive-intelligence/outcomes";
import {
  walkForwardBacktest,
  type OutcomeLabelKey,
  type OutcomePredictor,
} from "@/lib/predictive-intelligence/backtest";
import {
  assessMarketDataQuality,
  type DataQualityLabel,
} from "@/lib/predictive-intelligence/data-quality";
import {
  assessSafetyRisk,
  fetchSafetyValidation,
  type SafetyValidationRecord,
} from "@/lib/predictive-intelligence/safety";
import { ALL_MARKET_CODES } from "@/lib/international/capability-registry";
import { Loader2, TrendingUp, ShieldAlert, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";

const VERDICT_STYLES: Record<string, string> = {
  adequate:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  insufficient_data: "bg-muted text-muted-foreground border-border",
  stale:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  biased_sample:
    "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
};

function VerdictChip({ verdict }: { verdict: string }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${VERDICT_STYLES[verdict] ?? VERDICT_STYLES.insufficient_data}`}
    >
      {verdict.replace("_", " ")}
    </span>
  );
}

/** Market-mean predictor used for the honest baseline back-test. */
function meanPredictor(
  label: OutcomeLabelKey,
): OutcomePredictor<OutcomeLabelKey> {
  return (train) => {
    const labelled = train.filter(
      (r) => r[label] !== null && r[label] !== undefined,
    );
    if (labelled.length === 0) return null;
    const mean =
      labelled.reduce((s, r) => s + (r[label] as number), 0) / labelled.length;
    return { prediction: mean };
  };
}

const FORM_DEFAULT = {
  market_code: "NG",
  project_type: "",
  planned_end_date: "",
  actual_end_date: "",
  budgeted_amount: "",
  budgeted_currency: "NGN",
  final_amount: "",
  safety_incident_count: "0",
};

export default function PredictiveAnalytics() {
  const { t } = useLanguage();
  const [records, setRecords] = useState<ProjectOutcomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [validation, setValidation] = useState<SafetyValidationRecord | null>(
    null,
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_DEFAULT);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const res = await fetchProjectOutcomes({ limit: 500 });
    if (!res.ok) setLoadError(res.error);
    else setRecords(res.records);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    fetchSafetyValidation().then(setValidation);
  }, [load]);

  const marketsWithData = useMemo(
    () =>
      ALL_MARKET_CODES.filter((m) => records.some((r) => r.market_code === m)),
    [records],
  );

  const qualityReports = useMemo(
    () =>
      marketsWithData.map((m) => ({
        market: m,
        reports: (
          [
            "delay_days",
            "cost_overrun_pct",
            "safety_incident_count",
          ] as DataQualityLabel[]
        ).map((label) =>
          assessMarketDataQuality({
            market_code: m,
            label,
            records,
          }),
        ),
      })),
    [marketsWithData, records],
  );

  const backtests = useMemo(
    () =>
      (["delay_days", "cost_overrun_pct"] as OutcomeLabelKey[]).map((label) =>
        walkForwardBacktest({
          records,
          label,
          predictor: meanPredictor(label),
        }),
      ),
    [records],
  );

  const safetyAssessment = useMemo(
    () =>
      assessSafetyRisk({
        project: {
          market_code: records[0]?.market_code ?? "NG",
          stories: null,
          excavation_depth_m: null,
          weather_delay_days: null,
          planned_duration_days: null,
        },
        records,
        validation,
      }),
    [records, validation],
  );

  const onSave = async () => {
    setFormError(null);
    setSaving(true);
    try {
      const result = await saveProjectOutcome({
        market_code: form.market_code,
        project_type: form.project_type,
        planned_end_date: form.planned_end_date || undefined,
        actual_end_date: form.actual_end_date,
        budgeted_amount: form.budgeted_amount
          ? Number(form.budgeted_amount)
          : undefined,
        budgeted_currency: form.budgeted_currency,
        final_amount: form.final_amount ? Number(form.final_amount) : undefined,
        safety_incident_count: Number(form.safety_incident_count || "0"),
      });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setForm(FORM_DEFAULT);
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const field =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-xs";

  return (
    <div className="space-y-5">
      {/* ── Premium analytics hero ── */}
      <div className="relative overflow-hidden rounded-xl border border-border dark:border-white/5">
        <img
          src="https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/40" />
        <div className="relative p-5">
          <div className="flex items-center gap-2">
            <TrendingUp aria-hidden="true" className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              {t("Predictive analytics")}
            </h2>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-snug text-muted-foreground">
            Built only from completed projects you recorded. Labels are derived,
            never typed; accuracy is measured by walk-forward back-test with
            out-of-sample calibration; safety outputs stay decision support
            behind an independent validation gate.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium text-secondary-foreground">
              {records.length} outcome records
            </span>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium text-secondary-foreground">
              {marketsWithData.length} market
              {marketsWithData.length === 1 ? "" : "s"} with history
            </span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2
            aria-hidden="true"
            className="h-6 w-6 animate-spin text-primary"
          />
        </div>
      )}
      {loadError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {loadError}
        </p>
      )}

      {/* ── Register an outcome ── */}
      <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">
              {t("Completed-project history")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {OUTCOME_LABELS.map((l) => l.label).join(" · ")} are derived from
              the facts you enter — never typed in.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? (
              <X className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {showForm ? "Close" : "Add completed project"}
          </Button>
        </div>

        {showForm && (
          <div className="mt-3 grid gap-2 rounded-md border border-border bg-background/60 p-3 sm:grid-cols-2">
            <label className="text-[11px] font-medium text-muted-foreground">
              {t("Market")}
              <select
                className={field}
                value={form.market_code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, market_code: e.target.value }))
                }
              >
                {ALL_MARKET_CODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-medium text-muted-foreground">
              Project type *
              <input
                className={field}
                placeholder="detached duplex"
                value={form.project_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, project_type: e.target.value }))
                }
              />
            </label>
            <label className="text-[11px] font-medium text-muted-foreground">
              {t("Planned end date")}
              <input
                type="date"
                className={field}
                value={form.planned_end_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, planned_end_date: e.target.value }))
                }
              />
            </label>
            <label className="text-[11px] font-medium text-muted-foreground">
              Actual end date *
              <input
                type="date"
                className={field}
                value={form.actual_end_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, actual_end_date: e.target.value }))
                }
              />
            </label>
            <label className="text-[11px] font-medium text-muted-foreground">
              {t("Budgeted amount")}
              <input
                type="number"
                min="0"
                className={field}
                value={form.budgeted_amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, budgeted_amount: e.target.value }))
                }
              />
            </label>
            <label className="text-[11px] font-medium text-muted-foreground">
              {t("Budget currency (ISO)")}
              <input
                className={field}
                maxLength={3}
                value={form.budgeted_currency}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    budgeted_currency: e.target.value.toUpperCase(),
                  }))
                }
              />
            </label>
            <label className="text-[11px] font-medium text-muted-foreground">
              {t("Final amount")}
              <input
                type="number"
                min="0"
                className={field}
                value={form.final_amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, final_amount: e.target.value }))
                }
              />
            </label>
            <label className="text-[11px] font-medium text-muted-foreground">
              {t("Safety incidents")}
              <input
                type="number"
                min="0"
                className={field}
                value={form.safety_incident_count}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    safety_incident_count: e.target.value,
                  }))
                }
              />
            </label>
            {formError && (
              <p className="sm:col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {formError}
              </p>
            )}
            <div className="sm:col-span-2">
              <Button size="sm" disabled={saving} onClick={onSave}>
                {saving && (
                  <Loader2
                    aria-hidden="true"
                    className="h-3.5 w-3.5 animate-spin"
                  />
                )}
                Save outcome
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Per-market data quality ── */}
      {qualityReports.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
          <h3 className="text-sm font-semibold">
            {t("Regional data quality")}
          </h3>
          <p className="text-xs text-muted-foreground">
            A predictive claim is only supported where the gates pass: sample,
            recency, span, completeness, type concentration, size spread.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {qualityReports.map(({ market, reports }) => (
              <div
                key={market}
                className="rounded-md border border-border bg-background/60 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{market}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {reports[0].sample_size} records
                  </span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {reports.map((r) => (
                    <div
                      key={r.label}
                      className="flex items-center justify-between gap-2 text-[11px]"
                    >
                      <span className="text-muted-foreground">
                        {r.label.replace(/_/g, " ")}
                      </span>
                      <VerdictChip verdict={r.verdict} />
                    </div>
                  ))}
                </div>
                {reports.some((r) => r.verdict !== "adequate") && (
                  <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                    {reports.find((r) => r.verdict !== "adequate")!.disclosure}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Back-test metrics ── */}
      <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
        <h3 className="text-sm font-semibold">
          {t("Walk-forward back-test (market-mean baseline)")}
        </h3>
        <p className="text-xs text-muted-foreground">
          Targets are predicted only from strictly earlier completions;
          intervals are calibrated on the earlier half of residuals and their
          coverage is measured out-of-sample on the later half.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {backtests.map((bt) => (
            <div
              key={bt.label}
              className="rounded-md border border-border bg-background/60 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">
                  {bt.label.replace(/_/g, " ")}
                </span>
                <VerdictChip
                  verdict={
                    bt.status === "ok" ? "adequate" : "insufficient_data"
                  }
                />
              </div>
              {bt.status === "ok" ? (
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  <dt className="text-muted-foreground">{t("Scored")}</dt>
                  <dd>{bt.scored.length}</dd>
                  <dt className="text-muted-foreground">{t("MAE")}</dt>
                  <dd>{bt.mae?.toFixed(2)}</dd>
                  <dt className="text-muted-foreground">{t("Bias")}</dt>
                  <dd>{bt.bias?.toFixed(2)}</dd>
                  {bt.calibrations.map((c) => (
                    <span key={c.nominal} className="col-span-2 contents">
                      <dt className="text-muted-foreground">
                        {Math.round(c.nominal * 100)}% interval coverage
                      </dt>
                      <dd>
                        {c.coverage === null
                          ? "not yet measurable"
                          : `${Math.round(c.coverage * 100)}% (out-of-sample)`}
                      </dd>
                    </span>
                  ))}
                </dl>
              ) : (
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                  {bt.reason}
                </p>
              )}
              <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                {bt.disclosure}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Safety decision support (validation gate) ── */}
      <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
        <div className="flex items-center gap-2">
          <ShieldAlert aria-hidden="true" className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">
            Safety risk — decision support only
          </h3>
          {safetyAssessment.validation ? (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              independently validated
            </span>
          ) : (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              pending independent validation
            </span>
          )}
        </div>
        <p className="mt-2 text-xs leading-snug text-muted-foreground">
          {safetyAssessment.disclosure}
        </p>
        {safetyAssessment.validation && (
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Limitations: {safetyAssessment.validation.limitations}
          </p>
        )}
      </div>
    </div>
  );
}
