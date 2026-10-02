/**
 * FRELUX Labour Productivity & Crew Engine (Future Engine 7)
 *
 * Deterministic worker-days and crew duration from
 * admin-configured productivity rates per finishing task,
 * with a transparent site-efficiency loss applied as a
 * separate labelled line.
 *
 * Philosophy (unchanged): the efficiency loss is never silently
 * folded into the base rate, missing rates are refused — never
 * guessed — and calendar days are always whole days (you cannot
 * schedule a fraction of a working day).
 */

import type { EstimationCalcRule } from "@/types/estimation";

// ─────────────────────────────────────────────
// Contracts
// ─────────────────────────────────────────────

export interface LabourInput {
  /** Task key matching an active labour_rate, e.g. 'screeding_wall' */
  task_key: string;
  /** Quantity of work in the rate's unit (e.g. 240 sqm) */
  quantity: number;
  /** Crew size (whole number >= 1) */
  crew_size: number;
  /** Active labour rates from the database */
  rates: LabourRateLike[];
  /** Active calc rules (calculator_type = 'labour') */
  rules: EstimationCalcRule[];
}

/** Minimal shape the engine needs — mirrors the labour_rates table. */
export interface LabourRateLike {
  task_key: string;
  task_label: string | null;
  unit: string;
  output_per_worker_day: number;
  is_active: boolean;
  source_reference: string;
}

export interface LabourResult {
  ok: boolean;
  task_key: string | null;
  task_label: string | null;
  unit: string | null;
  quantity: number | null;
  base_rate: number | null;
  efficiency_loss_percent: number | null;
  effective_rate: number | null;
  worker_days: number | null;
  crew_size: number | null;
  calendar_days: number | null;
  source_reference: string | null;
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

function ruleNumber(
  rules: EstimationCalcRule[],
  key: string,
  fallback: number,
): number {
  const r = rules.find((x) => x.rule_key === key && x.is_active !== false);
  const v = Number((r?.rule_value as Record<string, unknown> | null)?.value);
  return Number.isFinite(v) ? v : fallback;
}

// ─────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────

export function calculateLabour(input: LabourInput): LabourResult {
  const result: LabourResult = {
    ok: false,
    task_key: null,
    task_label: null,
    unit: null,
    quantity: null,
    base_rate: null,
    efficiency_loss_percent: null,
    effective_rate: null,
    worker_days: null,
    crew_size: null,
    calendar_days: null,
    source_reference: null,
    warnings: [],
    steps: [],
  };

  // ── 1. Validate the inputs ──
  const taskKey = input.task_key?.trim();
  const quantity = Number(input.quantity);
  const crew = Number(input.crew_size);

  if (!taskKey) {
    result.warnings.push(
      "A task must be selected — the engine never schedules work without one.",
    );
    return result;
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    result.warnings.push("Quantity of work must be a positive number.");
    return result;
  }
  if (!Number.isInteger(crew) || crew < 1) {
    result.warnings.push(
      "Crew size must be a whole number of at least 1 worker.",
    );
    return result;
  }

  // ── 2. Deterministic rate lookup: active rate for the task ──
  const rate = (input.rates ?? []).find(
    (r) =>
      r.is_active !== false &&
      r.task_key.trim().toLowerCase() === taskKey.toLowerCase(),
  );
  if (!rate) {
    result.warnings.push(
      `No labour rate is configured for '${taskKey}' — the engine refuses to guess a productivity figure. Add a rate under Admin → Labour Rates.`,
    );
    return result;
  }
  const baseRate = Number(rate.output_per_worker_day);
  if (!Number.isFinite(baseRate) || baseRate <= 0) {
    result.warnings.push(
      `The configured rate for '${rate.task_key}' is invalid — the line was refused instead of guessed.`,
    );
    return result;
  }

  // ── 3. Rules (DB-configured, defaults only when absent) ──
  const decimals = Math.max(
    0,
    Math.min(6, ruleNumber(input.rules, "rounding_decimals", 2)),
  );
  let loss = ruleNumber(input.rules, "efficiency_loss_percent", 15);
  if (loss < 0 || loss >= 100) {
    loss = 15;
    result.warnings.push(
      "The configured efficiency loss was outside 0–99 and was ignored (the default 15% was used) — invalid configuration is never silently applied.",
    );
  }

  // ── 4. Effective rate: base × (1 − loss) — loss is a separate labelled line ──
  const effective = roundTo(baseRate * (1 - loss / 100), decimals);
  const workerDays = roundTo(quantity / effective, decimals);
  // Calendar days are ALWAYS whole days: ceil(worker-days ÷ crew), never a fraction.
  const calendarDays = Math.ceil(roundTo(workerDays / crew, 6) - 1e-9);

  result.ok = true;
  result.task_key = rate.task_key;
  result.task_label = rate.task_label ?? rate.task_key;
  result.unit = rate.unit;
  result.quantity = quantity;
  result.base_rate = baseRate;
  result.efficiency_loss_percent = loss;
  result.effective_rate = effective;
  result.worker_days = workerDays;
  result.crew_size = crew;
  result.calendar_days = calendarDays;
  result.source_reference = rate.source_reference;

  result.steps.push({
    label: "Base rate",
    detail: `${rate.task_label ?? rate.task_key}: ${baseRate} ${rate.unit} per worker-day (source: ${rate.source_reference}).`,
  });
  result.steps.push({
    label: "Site efficiency",
    detail: `${baseRate} × (1 − ${loss}%) = ${effective} ${rate.unit} per worker-day (separate allowance, never folded into the base rate).`,
  });
  result.steps.push({
    label: "Worker-days",
    detail: `${quantity} ${rate.unit} ÷ ${effective} ${rate.unit}/worker-day = ${workerDays} worker-days.`,
  });
  result.steps.push({
    label: "Crew duration",
    detail: `${workerDays} worker-days ÷ ${crew} worker${crew === 1 ? "" : "s"} = ${roundTo(workerDays / crew, decimals)} → ${calendarDays} whole calendar day${calendarDays === 1 ? "" : "s"} (always rounded up — a fraction of a working day cannot be scheduled).`,
  });

  return result;
}
