/**
 * FRELUX Regional Cost Index Engine (Future Engine 3)
 *
 * Location-adjusted costing. Given a base cost (e.g. from any
 * FRELUX estimate) and a target state + category, the engine
 * applies the admin-configured regional factor.
 *
 * Philosophy (unchanged): the engine never invents a factor.
 * Fallback order is fixed and documented: exact state+category →
 * state 'general' → national baseline (calc_rules). Every fallback
 * produces a warning so the user knows exactly what was applied.
 */

import type { EstimationCalcRule, RegionalCostIndex } from "@/types/estimation";

// ─────────────────────────────────────────────
// Contracts
// ─────────────────────────────────────────────

export interface RegionalCostInput {
  base_cost: number;
  /** ISO 3166-1 alpha-2 market. Defaults to "NG" (backwards compatible). */
  country?: string;
  state: string;
  category?: string | null;
  /** Active indices loaded from the database */
  indices: RegionalCostIndex[];
  /** Active calc rules (calculator_type = 'regional_cost') */
  rules: EstimationCalcRule[];
}

export interface RegionalCostResult {
  ok: boolean;
  adjusted_cost: number | null;
  applied_factor: number | null;
  applied_source:
    "state_category" | "state_general" | "national_baseline" | null;
  matched_index_id: string | null;
  warnings: string[];
  steps: { label: string; detail: string }[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function money(v: number): number {
  return Math.round(v * 100) / 100;
}

function nationalBaseline(rules: EstimationCalcRule[]): number {
  const rule = rules.find(
    (r) => r.rule_key === "national_baseline_factor" && r.is_active !== false,
  );
  const f = Number(
    (rule?.rule_value as Record<string, unknown> | null)?.factor,
  );
  return Number.isFinite(f) && f > 0 ? f : 1;
}

// ─────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────

export function applyRegionalCost(
  input: RegionalCostInput,
): RegionalCostResult {
  const result: RegionalCostResult = {
    ok: false,
    adjusted_cost: null,
    applied_factor: null,
    applied_source: null,
    matched_index_id: null,
    warnings: [],
    steps: [],
  };

  const base = Number(input.base_cost);
  if (!Number.isFinite(base) || base < 0) {
    result.warnings.push("Base cost must be zero or a positive number.");
    return result;
  }
  const state = input.state?.trim();
  if (!state) {
    result.warnings.push("A target state is required.");
    return result;
  }
  const category = (input.category ?? "general").trim() || "general";
  const country = (input.country ?? "NG").trim().toUpperCase() || "NG";

  // Country-first filter: an index belongs to one market. Rows without a
  // country (pre-dating the column) are treated as NG, so existing
  // behaviour is byte-for-byte identical.
  const active = input.indices.filter(
    (i) =>
      i.is_active !== false && (i.country ?? "NG").toUpperCase() === country,
  );

  // ── 1. Exact state + category ──
  let match = active.find(
    (i) =>
      i.state.toLowerCase() === state.toLowerCase() && i.category === category,
  );
  let source: RegionalCostResult["applied_source"] = "state_category";

  // ── 2. State general (only when a specific category was requested) ──
  if (!match && category !== "general") {
    match = active.find(
      (i) =>
        i.state.toLowerCase() === state.toLowerCase() &&
        i.category === "general",
    );
    if (match) source = "state_general";
  }

  // ── 3. National baseline (never a guess — a documented fallback with warning) ──
  if (!match) {
    source = "national_baseline";
    const baseline = nationalBaseline(input.rules);
    const factor = baseline;
    const adjusted = money(base * factor);
    result.applied_factor = factor;
    result.applied_source = source;
    result.adjusted_cost = adjusted;
    result.steps.push({
      label: "Applied factor",
      detail: `No index configured for ${country}/${state}/${category}. National baseline ${factor.toFixed(2)} applied with a warning — the engine does not guess a regional multiplier.`,
    });
    result.steps.push({
      label: "Adjusted cost",
      detail: `${base.toLocaleString()} × ${factor.toFixed(2)} = ${adjusted.toLocaleString()}`,
    });
    result.warnings.push(
      `No regional cost index is configured for ${country}/${state}${category !== "general" ? ` (${category})` : ""}. ` +
        `The national baseline (${factor.toFixed(2)}) was used. Add an index under Admin → Regional Cost Indices for state-accurate costing.`,
    );
    result.ok = true;
    return result;
  }

  // ── 4. Configured index: state + category (deterministic) ──
  const factor = Number(match.cost_factor);
  if (!Number.isFinite(factor) || factor <= 0) {
    result.warnings.push(
      `The configured index for ${state}/${match.category} has an invalid factor. Nothing was applied.`,
    );
    return result;
  }
  if (source === "state_general" && category !== "general") {
    result.warnings.push(
      `No ${category} index is configured for ${state} — the state's general index (${factor.toFixed(2)}) was applied instead.`,
    );
  }
  const adjusted = money(base * factor);
  result.applied_factor = factor;
  result.applied_source = source;
  result.matched_index_id = match.id;
  result.adjusted_cost = adjusted;
  result.steps.push({
    label: "Applied factor",
    detail: `${factor.toFixed(2)} (${state} / ${match.category}, source: ${match.source_reference}).`,
  });
  result.steps.push({
    label: "Adjusted cost",
    detail: `${base.toLocaleString()} × ${factor.toFixed(2)} = ${adjusted.toLocaleString()}`,
  });
  result.ok = true;
  return result;
}

/** Unique sorted list of states with at least one active index (for the page's selector). */
export function countriesWithIndices(indices: RegionalCostIndex[]): string[] {
  return [
    ...new Set(
      indices
        .filter((i) => i.is_active !== false)
        .map((i) => (i.country ?? "NG").toUpperCase()),
    ),
  ].sort();
}

export function statesWithIndices(indices: RegionalCostIndex[]): string[] {
  return Array.from(
    new Set(
      indices
        .filter((i) => i.is_active !== false)
        .map((i) => i.state.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
}
