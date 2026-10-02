/**
 * FRELUX Project Cash-Flow Timeline Engine (Future Engine 6)
 *
 * Deterministic phased payment schedules from an estimate total:
 * an admin-configured milestone template (label, percent, offset
 * months) is applied to the project value.
 *
 * Philosophy (unchanged): the engine refuses a template whose
 * percentages do not sum to exactly 100% — it never silently
 * normalises or guesses the missing share. Dates come from the
 * project start + milestone offsets, nothing is invented.
 */

import type { EstimationCalcRule } from "@/types/estimation";

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
}

export interface CashFlowPayment {
  label: string;
  percent: number;
  amount: number;
  /** ISO date of the payment milestone */
  date: string;
  cumulative_amount: number;
}

export interface CashFlowResult {
  ok: boolean;
  total_amount: number | null;
  start_date: string | null;
  payments: CashFlowPayment[];
  scheduled_total: number;
  warnings: string[];
  steps: { label: string; detail: string }[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function roundTo(v: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

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
export function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const target = new Date(d.getTime());
  const day = target.getUTCDate();
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + months);
  // Clamp to the last day of the target month
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return target.toISOString().slice(0, 10);
}

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
      "Project total must be a positive number — the engine does not schedule payments for a zero or invalid estimate.",
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
      "No payment milestones configured — nothing to schedule.",
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
      `${invalidLines} milestone${invalidLines === 1 ? "" : "s"} had a missing label, non-positive percent or negative offset and were excluded — payment schedules are never guessed.`,
    );
  }

  if (valid.length === 0) {
    result.warnings.push(
      "No valid milestones remained after validation — nothing to schedule.",
    );
    return result;
  }

  // Percentages must sum to exactly the configured total — never silently normalised.
  if (Math.abs(percentSum - requiredSum) > 1e-9) {
    result.warnings.push(
      `Milestone percentages sum to ${percentSum}% but must sum to exactly ${requiredSum}% — the template was refused instead of being silently adjusted.`,
    );
    return result;
  }

  // ── 3. Deterministic schedule: percent × total, start + offset months ──
  result.total_amount = roundTo(total, decimals);
  result.start_date = input.start_date.slice(0, 10);

  let cumulative = 0;
  const ordered = [...valid].sort((a, b) => a.offset_months - b.offset_months);
  for (const m of ordered) {
    const amount = roundTo((total * m.percent) / 100, decimals);
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
      detail: `${m.percent}% × ₦${total.toLocaleString()} = ₦${amount.toLocaleString()}, due ${date} (${m.offset_months} month${m.offset_months === 1 ? "" : "s"} after start).`,
    });
  }

  result.scheduled_total = cumulative;
  result.steps.push({
    label: "Total",
    detail: `₦${cumulative.toLocaleString()} scheduled across ${result.payments.length} milestones, matching the ₦${total.toLocaleString()} estimate.`,
  });

  result.ok = true;
  return result;
}
