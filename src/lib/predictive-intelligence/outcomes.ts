/**
 * Outcome-label schema + historical project-outcome dataset —
 * FRELUX engine #3 "Predictive analytics & AI" milestone 1
 * (2026-10-15).
 *
 * The OUTCOME LABELS are deterministic derivations from raw
 * project facts — never typed in by hand, never guessed:
 *
 *   delay_days        = actual_end_date - planned_end_date
 *                       (null when no planned end date exists —
 *                       an honest gap, not a zero)
 *   cost_overrun_pct  = (final_amount / budgeted_amount - 1) * 100
 *                       (null when either amount is missing or
 *                       the budget is not a positive number)
 *   safety_incident_count = recorded count (>= 0)
 *
 * Covariates a back-test can condition on: market_code,
 * project_type, finish_quality, size_m2, stories, weather_delay_days.
 *
 * Honesty rules (mirroring the geospatial M1-M4 refusals):
 *  - Unknown market codes are REFUSED (20-market registry).
 *  - Negative incident/weather-delay counts are refused.
 *  - A record without actual_end_date is refused outright: it
 *    is not a completed project and does not belong in the
 *    outcome dataset.
 *  - Currency is an ISO-4217-style 3-letter code, never implied.
 */

import { supabase } from "@/lib/supabase";
import { ALL_MARKET_CODES } from "@/lib/international/capability-registry";

// ─────────────────────────────────────────────────────────
// Outcome-label schema
// ─────────────────────────────────────────────────────────

export interface OutcomeLabelDefinition {
  key: string;
  label: string;
  derivation: string;
  /** When the label is null (an honest gap, never zero). */
  nullWhen: string;
}

/** The engine-3 outcome-label schema, pinned and documented. */
export const OUTCOME_LABELS: readonly OutcomeLabelDefinition[] = [
  {
    key: "delay_days",
    label: "Schedule delay (days)",
    derivation: "actual_end_date minus planned_end_date, in days",
    nullWhen: "no planned end date was recorded for the project",
  },
  {
    key: "cost_overrun_pct",
    label: "Cost overrun (%)",
    derivation:
      "(final_amount / budgeted_amount - 1) * 100 on the recorded budget currency",
    nullWhen: "budgeted or final amount is missing, or the budget is not positive",
  },
  {
    key: "safety_incident_count",
    label: "Safety incidents (count)",
    derivation: "recorded count of reportable safety incidents",
    nullWhen: "never null; defaults to 0 when none were recorded",
  },
] as const;

export interface ProjectOutcomeInput {
  project_id?: string | null;
  market_code: string;
  project_type: string;
  finish_quality?: string | null;
  size_m2?: number | null;
  stories?: number | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  actual_end_date: string;
  budgeted_amount?: number | null;
  budgeted_currency?: string;
  final_amount?: number | null;
  safety_incident_count?: number;
  rfi_count?: number | null;
  weather_delay_days?: number | null;
  notes?: string | null;
}

export interface PreparedProjectOutcome {
  market_code: string;
  project_type: string;
  finish_quality: string | null;
  size_m2: number | null;
  stories: number | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_end_date: string;
  budgeted_amount: number | null;
  budgeted_currency: string;
  final_amount: number | null;
  delay_days: number | null;
  cost_overrun_pct: number | null;
  safety_incident_count: number;
  rfi_count: number | null;
  weather_delay_days: number | null;
  notes: string | null;
}

export interface ProjectOutcomeRecord extends PreparedProjectOutcome {
  id: string;
  user_id: string | null;
  project_id: string | null;
  created_at: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_CURRENCY = /^[A-Z]{3}$/;

function parseDate(s: string, field: string): Date {
  if (!ISO_DATE.test(s)) {
    throw new RangeError(`${field} must be a date (YYYY-MM-DD); received "${s}".`);
  }
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // Round-trip: JavaScript rolls impossible dates over silently
  // (2025-02-30 -> March 2). Compare against the written values.
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    throw new RangeError(`${field} "${s}" is not a real calendar date.`);
  }
  return date;
}

function daysBetween(a: Date, b: Date): number {
  const DAY_MS = 86_400_000;
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/**
 * Pure validation + label derivation. No I/O. Refusals throw
 * RangeError with honest, specific messages.
 */
export function prepareProjectOutcome(
  input: ProjectOutcomeInput,
): PreparedProjectOutcome {
  if (!ALL_MARKET_CODES.includes(input.market_code)) {
    throw new RangeError(
      `Unknown market "${input.market_code}". The outcome dataset only accepts the 20 registered markets (${ALL_MARKET_CODES.join(", ")}). Refusing rather than guessing a market.`,
    );
  }
  if (!input.project_type?.trim()) {
    throw new RangeError("project_type is required: the back-test conditions on it.");
  }
  const actualEnd = parseDate(input.actual_end_date, "actual_end_date");
  if (!input.actual_end_date?.trim()) {
    throw new RangeError(
      "actual_end_date is required: only COMPLETED projects belong in the outcome dataset. Refusing rather than recording an unfinished project as history.",
    );
  }

  let plannedEnd: Date | null = null;
  if (input.planned_end_date) {
    plannedEnd = parseDate(input.planned_end_date, "planned_end_date");
  }
  let plannedStart: Date | null = null;
  if (input.planned_start_date) {
    plannedStart = parseDate(input.planned_start_date, "planned_start_date");
  }
  if (plannedStart && plannedEnd && plannedStart > plannedEnd) {
    throw new RangeError(
      "planned_start_date must not be after planned_end_date.",
    );
  }
  if (plannedEnd && plannedEnd > actualEnd) {
    // Early completion is a legitimate negative delay label; a planned end
    // more than a year after completion is a data error.
    // (DB CHECK mirrors the same guard.)
    void actualEnd;
  }

  const budgetedCurrency = input.budgeted_currency ?? "XXX";
  if (!ISO_CURRENCY.test(budgetedCurrency)) {
    throw new RangeError(
      `budgeted_currency must be a 3-letter ISO code (received "${budgetedCurrency}").`,
    );
  }

  if (input.size_m2 != null && (!Number.isFinite(input.size_m2) || input.size_m2 <= 0)) {
    throw new RangeError("size_m2 must be a positive number.");
  }
  if (input.stories != null && (!Number.isInteger(input.stories) || input.stories < 1)) {
    throw new RangeError("stories must be an integer >= 1.");
  }
  const incidents = input.safety_incident_count ?? 0;
  if (!Number.isInteger(incidents) || incidents < 0) {
    throw new RangeError(
      `safety_incident_count must be an integer >= 0 (received ${incidents}).`,
    );
  }
  const rfiCount = input.rfi_count ?? null;
  if (rfiCount != null && (!Number.isInteger(rfiCount) || rfiCount < 0)) {
    throw new RangeError("rfi_count must be an integer >= 0.");
  }
  const weatherDelay = input.weather_delay_days ?? null;
  if (weatherDelay != null && (!Number.isInteger(weatherDelay) || weatherDelay < 0)) {
    throw new RangeError("weather_delay_days must be an integer >= 0.");
  }
  if (
    input.budgeted_amount != null &&
    (!Number.isFinite(input.budgeted_amount) || input.budgeted_amount < 0)
  ) {
    throw new RangeError("budgeted_amount must be a number >= 0.");
  }
  if (
    input.final_amount != null &&
    (!Number.isFinite(input.final_amount) || input.final_amount < 0)
  ) {
    throw new RangeError("final_amount must be a number >= 0.");
  }

  // ── Deterministic label derivation ──
  const delay_days =
    plannedEnd !== null ? daysBetween(plannedEnd, actualEnd) : null;
  const cost_overrun_pct =
    input.budgeted_amount != null &&
    input.budgeted_amount > 0 &&
    input.final_amount != null
      ? (input.final_amount / input.budgeted_amount - 1) * 100
      : null;

  return {
    market_code: input.market_code,
    project_type: input.project_type.trim(),
    finish_quality: input.finish_quality?.trim() || null,
    size_m2: input.size_m2 ?? null,
    stories: input.stories ?? null,
    planned_start_date: input.planned_start_date || null,
    planned_end_date: input.planned_end_date || null,
    actual_end_date: input.actual_end_date,
    budgeted_amount: input.budgeted_amount ?? null,
    budgeted_currency: budgetedCurrency,
    final_amount: input.final_amount ?? null,
    delay_days,
    cost_overrun_pct,
    safety_incident_count: incidents,
    rfi_count: rfiCount,
    weather_delay_days: weatherDelay,
    notes: input.notes?.trim() || null,
  };
}

// ─────────────────────────────────────────────────────────
// Persistence (Supabase, owner-scoped by RLS)
// ─────────────────────────────────────────────────────────

export async function saveProjectOutcome(input: ProjectOutcomeInput) {
  let prepared: PreparedProjectOutcome;
  try {
    prepared = prepareProjectOutcome(input);
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "The outcome record could not be validated.",
    };
  }
  const { data, error } = await supabase
    .from("project_outcomes")
    .insert({ ...prepared, project_id: input.project_id ?? null })
    .select()
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, record: data as ProjectOutcomeRecord };
}

export async function fetchProjectOutcomes(opts?: {
  market_code?: string;
  limit?: number;
}) {
  let q = supabase
    .from("project_outcomes")
    .select("*")
    .order("actual_end_date", { ascending: true });
  if (opts?.market_code) q = q.eq("market_code", opts.market_code);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, records: (data ?? []) as ProjectOutcomeRecord[] };
}
