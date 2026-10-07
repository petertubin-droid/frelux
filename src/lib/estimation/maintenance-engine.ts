/**
 * FRELUX Maintenance Schedule Engine (Future Engine 1)
 *
 * Deterministic maintenance scheduling from database-verified profiles.
 *
 * Philosophy (unchanged from the estimation engines): the engine never
 * guesses. Every service life, maintenance interval, inspection cadence
 * and cost factor comes from an admin-configured maintenance_profiles
 * row with a source reference. A category without an active matching
 * profile produces a data-requirement warning and a REFUSED schedule -
 * never an assumed value.
 *
 * Ranges are preserved end-to-end: a 4–6 year re-coat interval is
 * reported as a 4–6 year window (min/max events), never collapsed to
 * a single average.
 */

import type { MaintenanceProfile } from "@/types/estimation";

// ─────────────────────────────────────────────
// Input / output contracts
// ─────────────────────────────────────────────

export interface MaintenanceScheduleInput {
  /** Finish category, e.g. 'paint', 'pop', 'tile', 'mineral_stone' */
  category: string;
  /** Surface type, e.g. 'interior', 'exterior', 'wet_area' */
  surface_type: string;
  /** Original installed cost in the given currency. null = timing-only plan. */
  initial_cost: number | null;
  currency: string | null;
  /** ISO date the finish was (or will be) applied. Defaults to today. */
  install_date: string;
  /** Projection horizon in years. Cost milestones are capped at this. */
  horizon_years: number;
  /** Years at which cumulative cost milestones are reported (sorted). */
  milestone_years: number[];
  /** Active profiles loaded from the database. */
  profiles: MaintenanceProfile[];
}

export type MaintenanceEventType =
  "inspection" | "maintenance_cycle" | "full_redecoration";

export interface MaintenanceEvent {
  type: MaintenanceEventType;
  /** Years after installation, min and max preserved as a range */
  year_min: number;
  year_max: number;
  /** Absolute ISO date range derived from install_date */
  date_min: string;
  date_max: string;
  /** Cost of this single event (null when no initial cost given) */
  cost: number | null;
  label: string;
}

export interface MaintenanceCostMilestone {
  year: number;
  /** Cumulative cost of all events with year_min <= milestone year.
   *  Uses the EARLIEST end of each range (conservative planning: budget
   *  for the earliest plausible occurrence). null when timing-only. */
  cumulative_cost: number | null;
  events_included: number;
}

export interface MaintenanceResult {
  ok: boolean;
  category: string;
  surface_type: string;
  profileName: string | null;
  events: MaintenanceEvent[];
  milestones: MaintenanceCostMilestone[];
  warnings: string[];
  steps: { label: string; detail: string }[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

function addYears(isoDate: string, years: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  const target = new Date(d);
  target.setUTCFullYear(target.getUTCFullYear() + Math.floor(years));
  // Fractional years: add remaining days (1 decimal max, e.g. 0.5 → ~183 days)
  const frac = years - Math.floor(years);
  if (frac > 0) {
    target.setUTCDate(target.getUTCDate() + Math.round(frac * 365));
  }
  return target.toISOString().slice(0, 10);
}

function money(v: number): number {
  return Math.round(v * 100) / 100;
}

const YEAR_LABEL = (min: number, max: number) =>
  min === max ? `year ${min}` : `years ${min}–${max}`;

// ─────────────────────────────────────────────
// Profile matching: exact category+surface first, then category+'any'.
// Never falls back to a different category - that would be a guess.
// ─────────────────────────────────────────────

export function matchMaintenanceProfile(
  profiles: MaintenanceProfile[],
  category: string,
  surface_type: string,
): MaintenanceProfile | null {
  const active = profiles.filter((p) => p.is_active !== false);
  const exact = active.find(
    (p) =>
      p.finish_category.toLowerCase() === category.toLowerCase() &&
      p.surface_type.toLowerCase() === surface_type.toLowerCase(),
  );
  if (exact) return exact;
  const generic = active.find(
    (p) =>
      p.finish_category.toLowerCase() === category.toLowerCase() &&
      p.surface_type.toLowerCase() === "any",
  );
  return generic ?? null;
}

// ─────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────

export function calculateMaintenanceSchedule(
  input: MaintenanceScheduleInput,
): MaintenanceResult {
  const result: MaintenanceResult = {
    ok: false,
    category: input.category,
    surface_type: input.surface_type,
    profileName: null,
    events: [],
    milestones: [],
    warnings: [],
    steps: [],
  };

  // ── 0. Input validation ──
  const horizon = num(input.horizon_years);
  if (horizon === null || horizon <= 0 || horizon > 100) {
    result.warnings.push(
      "Horizon must be a positive number of years (max 100).",
    );
    return result;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.install_date)) {
    result.warnings.push(
      "Installation date must be a valid ISO date (YYYY-MM-DD).",
    );
    return result;
  }
  const milestones = [...input.milestone_years]
    .map((y) => num(y))
    .filter((y): y is number => y !== null && y > 0)
    .sort((a, b) => a - b)
    .filter((y, i, arr) => i === 0 || y !== arr[i - 1]);
  if (milestones.length === 0) {
    result.warnings.push("At least one cost milestone year is required.");
    return result;
  }
  const initialCost = num(input.initial_cost);
  if (initialCost !== null && initialCost < 0) {
    result.warnings.push("Initial cost cannot be negative.");
    return result;
  }

  // ── 1. Profile match (verified data or refusal) ──
  const profile = matchMaintenanceProfile(
    input.profiles,
    input.category,
    input.surface_type,
  );
  if (!profile) {
    result.warnings.push(
      `No active maintenance profile is configured for '${input.category}' on '${input.surface_type}' surfaces. ` +
        `The schedule cannot be produced until an administrator adds verified maintenance data ` +
        `(service life, maintenance interval, cost factors) under Admin → Maintenance Profiles.`,
    );
    return result;
  }
  result.profileName =
    profile.description ??
    `${profile.finish_category} / ${profile.surface_type}`;
  result.steps.push({
    label: "Profile",
    detail:
      `Matched profile: ${profile.finish_category} / ${profile.surface_type}` +
      `${profile.source_reference ? ` (source: ${profile.source_reference})` : ""}`,
  });

  // ── 2. Service life range ──
  const lifeMin = num(profile.service_life_min_years);
  const lifeMax = num(profile.service_life_max_years);
  if (lifeMin === null || lifeMax === null) {
    result.warnings.push(
      "Configured service life is incomplete on the profile. Fix the profile in Admin.",
    );
    return result;
  }
  result.steps.push({
    label: "Service life",
    detail:
      `Full redecoration expected in ${YEAR_LABEL(lifeMin, lifeMax)}` +
      ` (configured range, not an average).`,
  });

  // ── 3. Cost factors (verified configuration) ──
  const maintFactor = num(profile.maintenance_cost_factor);
  const replFactor = num(profile.replacement_cost_factor);
  if (maintFactor === null || replFactor === null) {
    result.warnings.push(
      "Configured cost factors are incomplete on the profile. Fix the profile in Admin.",
    );
    return result;
  }

  const events: MaintenanceEvent[] = [];

  // ── 4. Inspections (optional; NULL = not configured, no events) ──
  const insp = num(profile.inspection_interval_years);
  if (insp !== null && insp > 0) {
    for (let y = insp; y <= horizon; y += insp) {
      events.push({
        type: "inspection",
        year_min: y,
        year_max: y,
        date_min: addYears(input.install_date, y),
        date_max: addYears(input.install_date, y),
        cost: null, // inspections carry no material cost in this model
        label: `Routine inspection (every ${insp} ${insp === 1 ? "year" : "years"})`,
      });
    }
    result.steps.push({
      label: "Inspections",
      detail: `Routine inspection every ${insp} ${insp === 1 ? "year" : "years"} through year ${Math.floor(horizon)}.`,
    });
  }

  // ── 5. Maintenance cycles (optional; range preserved) ──
  const intMin = num(profile.maintenance_interval_min_years);
  const intMax = num(profile.maintenance_interval_max_years);
  if (intMin !== null && intMax !== null && intMin > 0) {
    // Repeating cycle: first cycle at [intMin, intMax]; subsequent cycles
    // offset by the max (deterministic: the earliest plausible first
    // occurrence defines the conservative cadence).
    const step = intMax;
    for (let base = intMin; base <= horizon; base += step) {
      const eMin = Math.round(base * 10) / 10;
      const eMax = Math.round((base + (intMax - intMin)) * 10) / 10;
      if (eMin > horizon) break;
      events.push({
        type: "maintenance_cycle",
        year_min: eMin,
        year_max: eMax,
        date_min: addYears(input.install_date, eMin),
        date_max: addYears(input.install_date, eMax),
        cost: initialCost !== null ? money(initialCost * maintFactor) : null,
        label: `Maintenance cycle (re-coat/service): ${money(maintFactor * 100)}% of installed cost`,
      });
    }
    result.steps.push({
      label: "Maintenance cycles",
      detail:
        `First cycle in ${YEAR_LABEL(intMin, intMax)}, repeating on the configured cadence` +
        `${initialCost !== null ? `, each at ${money(maintFactor * 100)}% of the installed cost` : ""}.`,
    });
  }

  // ── 6. Full redecoration at service life ──
  if (lifeMin <= horizon) {
    events.push({
      type: "full_redecoration",
      year_min: lifeMin,
      year_max: lifeMax,
      date_min: addYears(input.install_date, lifeMin),
      date_max: addYears(input.install_date, lifeMax),
      cost: initialCost !== null ? money(initialCost * replFactor) : null,
      label: `Full redecoration: ${money(replFactor * 100)}% of installed cost`,
    });
    result.steps.push({
      label: "Full redecoration",
      detail:
        `Plan for a full redo in ${YEAR_LABEL(lifeMin, lifeMax)}` +
        `${initialCost !== null ? ` at ${money(replFactor * 100)}% of the installed cost` : ""}.`,
    });
  } else {
    result.steps.push({
      label: "Full redecoration",
      detail: `Service life (${YEAR_LABEL(lifeMin, lifeMax)}) falls outside the ${horizon}-year horizon; no redecoration event inside this plan.`,
    });
  }

  if (initialCost === null) {
    result.warnings.push(
      "No initial cost provided: the schedule shows timing only. Enter the installed cost from any FRELUX calculator result to get cost projections.",
    );
  }

  events.sort((a, b) => a.year_min - b.year_min || a.year_max - b.year_max);
  result.events = events;

  // ── 7. Cost milestones (conservative: earliest plausible occurrence) ──
  if (initialCost !== null) {
    result.milestones = milestones.map((year) => {
      const included = events.filter(
        (e) => e.cost !== null && e.year_min <= year,
      );
      const cumulative = included.reduce((sum, e) => sum + (e.cost ?? 0), 0);
      return {
        year,
        cumulative_cost: money(cumulative),
        events_included: included.length,
      };
    });
    result.steps.push({
      label: "Cost milestones",
      detail:
        milestones
          .map((y) =>
            `Year ${y}: ${result.milestones.find((m) => m.year === y)?.cumulative_cost ?? 0} ${input.currency ?? ""}`.trim(),
          )
          .join(" · ") +
        " (earliest-occurrence budgeting: an event counts once its range starts)",
    });
  } else {
    result.milestones = milestones.map((year) => ({
      year,
      cumulative_cost: null,
      events_included: events.filter(
        (e) => e.cost !== null && e.year_min <= year,
      ).length,
    }));
  }

  result.ok = true;
  return result;
}
