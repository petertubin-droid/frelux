/**
 * FRELUX Project Cash-Flow Timeline Engine (Future Engine 6)
 *
 * Deterministic phased payment schedules from an estimate total:
 * FRELUX-configured milestone template (label, percent, offset
 * months) is applied to the project value.
 *
 * Philosophy (unchanged): the engine refuses a template whose
 * percentages do not sum to exactly 100% - it never silently
 * normalises or guesses the missing share. Dates come from the
 * project start + milestone offsets, nothing is invented.
 */

import type { EstimationCalcRule } from "@/types/estimation";
import { formatNGNForDisplay } from "../international/fx-display";
import {
  escalateCashFlowWithRetention,
  type RetentionConfig,
} from "../finance/retention-engine";
import { roundTo } from "./shared/rule-value";
import { addMonthsIso as addMonths } from "../shared/dates";

export { addMonths };

// Engine-narrative formatting: honours the visitor display currency and
// keeps trailing decimals (up to 2) so exact math values stay visible.
const fmtAuto = (n: number) => formatNGNForDisplay(n, { decimals: "auto" });

// ─────────────────────────────────────────────
// Contracts
// ─────────────────────────────────────────────

export interface CashFlowMilestone {
  label: string;
  percent: number;
  /** Months after project start */
  offset_months: number;
}

export interface CashFlowInput {
  /** Estimate / project total in naira */
  total_amount: number;
  /** ISO project start date */
  start_date: string;
  milestones: CashFlowMilestone[];
  /** Active calc rules (calculator_type = 'cash_flow') */
  rules: EstimationCalcRule[];
  /**
   * Retention / DLP escalation (Commercial Pillar 4). When supplied, every
   * milestone disbursement is shown NET of the retention withholding, the
   * withheld pot is released at Practical Completion and after the Defects
   * Liability Period, and the S-Curve totals keep the releases visible.
   * Absent: the schedule is the plain gross milestone curve, unchanged.
   */
  retention?: RetentionConfig;
  /**
   * Practical Completion date for the retention releases. Defaults to the
   * final milestone date when omitted (the engine states the inference).
   */
  practicalCompletionDate?: string | null;
}

export interface CashFlowPayment {
  label: string;
  percent: number;
  amount: number;
  /** ISO date of the payment milestone */
  date: string;
  cumulative_amount: number;
  /** Gross milestone value before retention (set only when retention is active). */
  gross_amount?: number;
  /** Retention withheld from this payment (set only when retention is active). */
  retained?: number;
}

export interface CashFlowResult {
  ok: boolean;
  total_amount: number | null;
  start_date: string | null;
  payments: CashFlowPayment[];
  /** Sum of the NET disbursements when retention is active; equals scheduled_total otherwise. */
  net_total?: number;
  scheduled_total: number;
  warnings: string[];
  steps: { label: string; detail: string }[];
  /** Retention escalation summary; present only when retention was requested. */
  retention?: {
    withheldTotal: number;
    releaseAtPc: number;
    releaseAfterDlp: number;
    pcDate: string | null;
    dlpEndDate: string | null;
    balances: boolean;
    retentionBond: boolean;
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────



function ruleValue(
  rules: EstimationCalcRule[],
  key: string,
  fallback: number,
): number {
  const r = rules.find((x) => x.rule_key === key && x.is_active !== false);
  const v = Number((r?.rule_value as Record<string, unknown> | null)?.value);
  return Number.isFinite(v) && v !== 0 ? v : fallback;
}

/** Add whole months to an ISO date, clamping month-overflow (Jan 31 + 1m → Feb 28). */


// ─────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────

export function calculateCashFlow(input: CashFlowInput): CashFlowResult {
  const result: CashFlowResult = {
    ok: false,
    total_amount: null,
    start_date: null,
    payments: [],
    scheduled_total: 0,
    warnings: [],
    steps: [],
  };

  // ── 1. Validate the inputs ──
  const total = Number(input.total_amount);
  if (!Number.isFinite(total) || total <= 0) {
    result.warnings.push(
      "Project total must be a positive number: the engine does not schedule payments for a zero or invalid estimate.",
    );
    return result;
  }

  const startDate = new Date(input.start_date);
  if (!input.start_date || Number.isNaN(startDate.getTime())) {
    result.warnings.push(
      "A valid project start date is required to schedule payments.",
    );
    return result;
  }

  const decimals = ruleValue(input.rules, "rounding_decimals", 2);
  const requiredSum = ruleValue(input.rules, "require_percent_sum", 100);

  if (!Array.isArray(input.milestones) || input.milestones.length === 0) {
    result.warnings.push(
      "No payment milestones configured: nothing to schedule.",
    );
    return result;
  }

  // ── 2. Validate milestones; refuse anything the engine would have to guess ──
  const valid: CashFlowMilestone[] = [];
  let invalidLines = 0;
  let percentSum = 0;
  for (const m of input.milestones) {
    const percent = Number(m.percent);
    const offset = Number(m.offset_months);
    if (
      !m.label?.trim() ||
      !Number.isFinite(percent) ||
      percent <= 0 ||
      !Number.isFinite(offset) ||
      offset < 0
    ) {
      invalidLines += 1;
      continue;
    }
    percentSum = roundTo(percentSum + percent, 6);
    valid.push({ label: m.label.trim(), percent, offset_months: offset });
  }

  if (invalidLines > 0) {
    result.warnings.push(
      `${invalidLines} milestone${invalidLines === 1 ? "" : "s"} had a missing label, non-positive percent or negative offset and were excluded: payment schedules are never guessed.`,
    );
  }

  if (valid.length === 0) {
    result.warnings.push(
      "No valid milestones remained after validation: nothing to schedule.",
    );
    return result;
  }

  // Commercial standard: allow standard 2-decimal percentage splits (e.g. 33.33% × 3 = 99.99%) within 0.05%
  const PERCENT_TOLERANCE = 0.05;
  if (Math.abs(percentSum - requiredSum) > PERCENT_TOLERANCE) {
    result.warnings.push(
      `Milestone percentages sum to ${percentSum}% but must sum to exactly ${requiredSum}%: the template was refused instead of being silently adjusted.`,
    );
    return result;
  }

  // ── 3. Deterministic schedule: percent × total, start + offset months ──
  result.total_amount = roundTo(total, decimals);
  result.start_date = input.start_date.slice(0, 10);

  let cumulative = 0;
  const ordered = [...valid].sort((a, b) => a.offset_months - b.offset_months);
  for (let i = 0; i < ordered.length; i++) {
    const m = ordered[i];
    const isLast = i === ordered.length - 1;
    let amount = roundTo((total * m.percent) / 100, decimals);
    if (isLast && Math.abs(percentSum - requiredSum) <= PERCENT_TOLERANCE) {
      const remainingBalance = roundTo(total - cumulative, decimals);
      if (Math.abs(remainingBalance - amount) <= 0.05 * (total / 100 + 1)) {
        amount = remainingBalance;
      }
    }
    cumulative = roundTo(cumulative + amount, decimals);
    const date = addMonths(result.start_date!, m.offset_months);
    result.payments.push({
      label: m.label,
      percent: m.percent,
      amount,
      date,
      cumulative_amount: cumulative,
    });
    result.steps.push({
      label: m.label,
      detail: `${m.percent}% × ${fmtAuto(total)} = ${fmtAuto(amount)}, due ${date} (${m.offset_months} month${m.offset_months === 1 ? "" : "s"} after start).`,
    });
  }

  result.scheduled_total = cumulative;
  result.steps.push({
    label: "Total",
    detail: `${fmtAuto(cumulative)} scheduled across ${result.payments.length} milestones, matching the ${fmtAuto(total)} estimate.`,
  });

  // ── 4. Retention / DLP escalation (Commercial Pillar 4) ──
  // Withholding shrinks every interim payment; the pot releases at Practical
  // Completion and after the Defects Liability Period. The S-Curve keeps the
  // releases visible so the cumulative curve reconciles to the estimate.
  if (input.retention) {
    const escalated = escalateCashFlowWithRetention({
      payments: result.payments.map((p) => ({
        label: p.label,
        date: p.date,
        amount: p.gross_amount ?? p.amount,
      })),
      practicalCompletionDate: input.practicalCompletionDate ?? null,
      config: input.retention,
    });
    result.warnings.push(...escalated.warnings);

    if (escalated.ok) {
      // Rebuild the payment list with net disbursements and withholdings.
      result.payments = escalated.payments.map((p) => ({
        label: p.label,
        percent:
          result.payments.find((x) => x.label === p.label)?.percent ?? 0,
        amount: p.net,
        date: p.date,
        cumulative_amount: p.net,
        gross_amount: p.gross,
        retained: p.retained,
      }));
      // Release events join the schedule so the curve reconciles to the
      // estimate; the DLP event carries any rounding remainder.
      const releases: CashFlowPayment[] = [];
      if (escalated.releases.atPc > 0) {
        releases.push({
          label: "Retention release (Practical Completion)",
          percent: 0,
          amount: escalated.releases.atPc,
          date: escalated.releases.pcDate ?? "",
          cumulative_amount: escalated.releases.atPc,
        });
      }
      if (escalated.releases.atDlp > 0) {
        releases.push({
          label: "Retention release (after DLP)",
          percent: 0,
          amount: escalated.releases.atDlp,
          date: escalated.releases.dlpEndDate ?? "",
          cumulative_amount:
            escalated.releases.atPc + escalated.releases.atDlp,
        });
      }
      if (escalated.schedule.retentionBond) {
        // Bonded: gross payments, no cash release events; the schedule is
        // documented but the curve already reconciles at gross.
        result.steps.push({
          label: "Retention bond",
          detail:
            "Retention bond replaces cash retention: every milestone is disbursed gross; the surety stands behind the employer for the retention amount.",
        });
      } else {
        // Chronological cumulative amounts across net payments + releases.
        const events = [
          ...result.payments.map((p) => ({ p, kind: "net" as const })),
          ...releases.map((p) => ({ p, kind: "release" as const })),
        ].sort((a, b) => (a.p.date < b.p.date ? -1 : a.p.date > b.p.date ? 1 : 0));
        let cum = 0;
        for (const e of events) {
          cum = roundTo(cum + e.p.amount, decimals);
          e.p.cumulative_amount = cum;
        }
        result.payments.push(...releases);
        result.scheduled_total = roundTo(
          escalated.netTotal + escalated.releasedTotal,
          decimals,
        );
        for (const p of escalated.payments) {
          if (p.retained > 0) {
            result.steps.push({
              label: `${p.label} — retention`,
              detail: `${fmtAuto(p.retained)} withheld at ${escalated.schedule.retentionPercent}% from the ${fmtAuto(p.gross)} milestone (${p.date}); ${fmtAuto(p.net)} disbursed.`,
            });
          }
        }
        result.steps.push({
          label: "Retention release (PC)",
          detail: `${fmtAuto(escalated.releases.atPc)} released at Practical Completion${escalated.releases.pcDate ? ` (${escalated.releases.pcDate})` : ""} — ${escalated.schedule.releaseAtPcPercent}% of the ${fmtAuto(escalated.withheldTotal)} withheld.`,
        });
        result.steps.push({
          label: "Retention release (DLP)",
          detail: `${fmtAuto(escalated.releases.atDlp)} released after the ${escalated.schedule.dlpMonths}-month Defects Liability Period${escalated.releases.dlpEndDate ? ` (ends ${escalated.releases.dlpEndDate})` : ""}.`,
        });
        result.steps.push({
          label: "Retention ledger",
          detail: `Net disbursements ${fmtAuto(escalated.netTotal)} + releases ${fmtAuto(escalated.releasedTotal)} = ${fmtAuto(roundTo(escalated.netTotal + escalated.releasedTotal, decimals))}: the curve reconciles to the estimate to the kobo.`,
        });
      }
      result.net_total = roundTo(escalated.netTotal, decimals);
      result.retention = {
        withheldTotal: escalated.withheldTotal,
        releaseAtPc: escalated.releases.atPc,
        releaseAfterDlp: escalated.releases.atDlp,
        pcDate: escalated.releases.pcDate,
        dlpEndDate: escalated.releases.dlpEndDate,
        balances: escalated.balances,
        retentionBond: escalated.schedule.retentionBond,
      };
    } else {
      result.warnings.push(
        "Retention escalation was requested but could not be computed: the gross milestone schedule stands unchanged.",
      );
    }
  }

  result.ok = true;
  return result;
}
