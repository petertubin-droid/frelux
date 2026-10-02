/**
 * FRELUX Embodied Carbon Engine (Future Engine 5)
 *
 * kgCO2e per estimate line from admin-configured carbon
 * factors: quantity × factor, summed.
 *
 * Philosophy (unchanged): the engine never guesses an
 * emission. Lines without a configured factor are excluded
 * with a warning (DB-configured behavior), and every factor
 * carries a verifiable source reference.
 */

import type { CarbonFactor, EstimationCalcRule } from "@/types/estimation";

// ─────────────────────────────────────────────
// Contracts
// ─────────────────────────────────────────────

export interface CarbonLineInput {
  category: string;
  quantity: number;
  unit?: string | null;
  description?: string | null;
}

export interface EmbodiedCarbonInput {
  lines: CarbonLineInput[];
  /** Active carbon factors loaded from the database */
  factors: CarbonFactor[];
  /** Active calc rules (calculator_type = 'embodied_carbon') */
  rules: EstimationCalcRule[];
}

export interface CarbonLineResult {
  category: string;
  quantity: number;
  unit: string | null;
  kg_co2e: number | null;
  factor_id: string | null;
  matched_category: string | null;
  excluded: boolean;
  source_reference: string | null;
}

export interface EmbodiedCarbonResult {
  ok: boolean;
  total_kg_co2e: number;
  covered_lines: number;
  excluded_lines: number;
  line_results: CarbonLineResult[];
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

function ruleDecimals(rules: EstimationCalcRule[]): number {
  const r = rules.find(
    (x) => x.rule_key === "rounding_decimals" && x.is_active !== false,
  );
  const v = Number((r?.rule_value as Record<string, unknown> | null)?.value);
  return Number.isInteger(v) && v >= 0 && v <= 6 ? v : 2;
}

// ─────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────

export function calculateEmbodiedCarbon(
  input: EmbodiedCarbonInput,
): EmbodiedCarbonResult {
  const result: EmbodiedCarbonResult = {
    ok: false,
    total_kg_co2e: 0,
    covered_lines: 0,
    excluded_lines: 0,
    line_results: [],
    warnings: [],
    steps: [],
  };

  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    result.warnings.push("No estimate lines provided — nothing to calculate.");
    return result;
  }

  const decimals = ruleDecimals(input.rules);
  const active = input.factors.filter((f) => f.is_active !== false);

  for (const line of input.lines) {
    const qty = Number(line.quantity);
    const category = line.category?.trim();
    if (!category) {
      result.excluded_lines += 1;
      result.line_results.push({
        category: "",
        quantity: Number.isFinite(qty) ? qty : 0,
        unit: line.unit ?? null,
        kg_co2e: null,
        factor_id: null,
        matched_category: null,
        excluded: true,
        source_reference: null,
      });
      result.warnings.push("A line without a category was excluded.");
      continue;
    }
    if (!Number.isFinite(qty) || qty < 0) {
      result.excluded_lines += 1;
      result.line_results.push({
        category,
        quantity: Number.isFinite(qty) ? qty : 0,
        unit: line.unit ?? null,
        kg_co2e: null,
        factor_id: null,
        matched_category: null,
        excluded: true,
        source_reference: null,
      });
      result.warnings.push(
        `'${category}' has an invalid quantity — excluded instead of guessed.`,
      );
      continue;
    }

    // Deterministic match: active factor for the category (case-insensitive)
    const factor = active.find(
      (f) => f.category.trim().toLowerCase() === category.toLowerCase(),
    );

    if (!factor) {
      // DB-configured behavior: exclude with a warning, never guess.
      result.excluded_lines += 1;
      result.line_results.push({
        category,
        quantity: qty,
        unit: line.unit ?? null,
        kg_co2e: null,
        factor_id: null,
        matched_category: null,
        excluded: true,
        source_reference: null,
      });
      result.warnings.push(
        `No carbon factor is configured for '${category}' — the line was excluded from the total. Add a factor under Admin → Carbon Factors for full coverage.`,
      );
      continue;
    }

    const perUnit = Number(factor.kg_co2e_per_unit);
    if (!Number.isFinite(perUnit) || perUnit < 0) {
      result.excluded_lines += 1;
      result.line_results.push({
        category,
        quantity: qty,
        unit: line.unit ?? null,
        kg_co2e: null,
        factor_id: factor.id,
        matched_category: factor.category,
        excluded: true,
        source_reference: factor.source_reference,
      });
      result.warnings.push(
        `The configured factor for '${factor.category}' is invalid — the line was excluded instead of guessed.`,
      );
      continue;
    }

    const kg = roundTo(qty * perUnit, decimals);
    result.total_kg_co2e = roundTo(result.total_kg_co2e + kg, decimals);
    result.covered_lines += 1;
    result.line_results.push({
      category,
      quantity: qty,
      unit: line.unit ?? factor.unit,
      kg_co2e: kg,
      factor_id: factor.id,
      matched_category: factor.category,
      excluded: false,
      source_reference: factor.source_reference,
    });
    result.steps.push({
      label: category,
      detail: `${qty} ${factor.unit} × ${perUnit} kgCO2e/${factor.unit} = ${kg} kgCO2e (source: ${factor.source_reference}).`,
    });
  }

  if (result.covered_lines === 0) {
    result.warnings.push(
      "No line could be matched to a configured carbon factor — the total is 0 kgCO2e and reflects ONLY configured categories.",
    );
  } else if (result.excluded_lines > 0) {
    result.warnings.push(
      `Total covers ${result.covered_lines} of ${input.lines.length} lines (${result.excluded_lines} excluded for missing/invalid factors).`,
    );
  }

  result.steps.push({
    label: "Total",
    detail: `${result.total_kg_co2e} kgCO2e across ${result.covered_lines} covered line${result.covered_lines === 1 ? "" : "s"}.`,
  });

  result.ok = true;
  return result;
}

/** Unique sorted list of categories with an active factor (for selectors). */
export function categoriesWithFactors(factors: CarbonFactor[]): string[] {
  return Array.from(
    new Set(
      factors
        .filter((f) => f.is_active !== false)
        .map((f) => f.category.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
}
