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
import {
  mergeEpdWithAdminFactors,
  type EpdFactor,
} from "./ec3-epd";
import {
  calculateWholeLifeCarbon,
  type WholeLifeResult,
} from "./whole-life-carbon";
import { roundTo, ruleDecimals } from "./shared/rule-value";

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
  /**
   * Plant-specific verified EPD factors from the EC3 lookup
   * (Sustainability Pillar 5). When supplied, an EPD declaration WINS
   * over the admin factor for its category and the line result is
   * labeled factor_source: "epd". Admin factors cover the rest.
   */
  epdFactors?: readonly EpdFactor[];
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
  /** Where the factor came from: a verified EPD or the admin-configured table. */
  factor_source?: "epd" | "admin";
  /** RICS/EN 15978 lifecycle module the emission was bucketed into. */
  module_stage?: string | null;
}

export interface EmbodiedCarbonResult {
  ok: boolean;
  total_kg_co2e: number;
  covered_lines: number;
  excluded_lines: number;
  line_results: CarbonLineResult[];
  warnings: string[];
  steps: { label: string; detail: string }[];
  /** RICS/EN 15978 module breakdown (PAS 2080 / LEED / BREEAM reporting). */
  whole_life?: WholeLifeResult;
  /** Categories where a verified EPD replaced the static admin factor. */
  epd_replaced_categories?: string[];
  /** Why EPD data was unavailable, when the caller attempted a lookup. */
  epd_unavailable_reason?: string | null;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────





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
    result.warnings.push("No estimate lines provided: nothing to calculate.");
    return result;
  }

  const decimals = ruleDecimals(input.rules);
  const activeAdmin = input.factors.filter((f) => f.is_active !== false);

  // ── EPD merge (Sustainability Pillar 5) ──
  // A plant-specific verified EPD wins per category; admin factors cover
  // the rest. Every merged factor carries its source so the audit trail
  // can always say which number came from a declaration vs an estimate.
  let active: (CarbonFactor & { factor_source: "epd" | "admin" })[];
  if (input.epdFactors && input.epdFactors.length > 0) {
    const merged = mergeEpdWithAdminFactors(input.epdFactors, activeAdmin);
    result.warnings.push(...merged.warnings);
    active = merged.factors.map((f) => ({
      id: f.source === "epd" ? `epd:${f.epd_id}` : `admin:${f.category}`,
      category: f.category,
      category_label: f.category,
      unit: f.unit,
      kg_co2e_per_unit: f.kg_co2e_per_unit,
      description: null,
      source_reference: f.source_reference,
      module_stage: f.module_stage ?? null,
      epd_id: f.source === "epd" ? f.epd_id ?? null : null,
      epd_plant: f.source === "epd" ? f.plant ?? null : null,
      effective_date: "",
      is_active: true,
      sort_order: 0,
      created_at: "",
      updated_at: "",
      factor_source: f.source,
    }));
    result.epd_replaced_categories = merged.replaced;
  } else {
    active = activeAdmin.map((f) => ({ ...f, factor_source: "admin" as const }));
  }

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
        `'${category}' has an invalid quantity: excluded instead of guessed.`,
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
        `No carbon factor is configured for '${category}': the line was excluded from the total. Add a factor under Admin → Carbon Factors for full coverage.`,
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
        `The configured factor for '${factor.category}' is invalid: the line was excluded instead of guessed.`,
      );
      continue;
    }

    const kg = roundTo(qty * perUnit, decimals);
    result.total_kg_co2e = roundTo(result.total_kg_co2e + kg, decimals);
    result.covered_lines += 1;
    const factorSource = (factor as { factor_source?: "epd" | "admin" }).factor_source ?? "admin";
    result.line_results.push({
      category,
      quantity: qty,
      unit: line.unit ?? factor.unit,
      kg_co2e: kg,
      factor_id: factor.id,
      matched_category: factor.category,
      excluded: false,
      source_reference: factor.source_reference,
      factor_source: factorSource,
      module_stage: factor.module_stage ?? null,
    });
    result.steps.push({
      label: category,
      detail: `${qty} ${factor.unit} × ${perUnit} kgCO2e/${factor.unit} = ${kg} kgCO2e (${factorSource === "epd" ? "verified EPD" : "admin factor"}; source: ${factor.source_reference}).`,
    });
  }

  if (result.covered_lines === 0) {
    result.warnings.push(
      "No line could be matched to a configured carbon factor: the total is 0 kgCO2e and reflects ONLY configured categories.",
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

  // ── RICS whole life carbon module breakdown (PAS 2080 / LEED / BREEAM) ──
  const wholeLife = calculateWholeLifeCarbon({
    lines: result.line_results
      .filter((l) => !l.excluded && l.kg_co2e !== null)
      .map((l) => ({
        label: l.category,
        module: l.module_stage ?? null,
        kg_co2e: l.kg_co2e as number,
      })),
  });
  result.whole_life = wholeLife;
  // Exclusion-grade warnings (unknown module codes, non-numeric values) are
  // calculation-validity issues and surface at the top level; the A1–A3
  // product-stage assumption is disclosed inside the whole-life breakdown
  // (whole_life.warnings + disclosures) where the assessor reads modules.
  result.warnings.push(
    ...wholeLife.warnings.filter(
      (w) =>
        w.includes("excluded instead of guessed") ||
        w.includes("excluded from the assessment"),
    ),
  );
  result.steps.push({
    label: "RICS module breakdown",
    detail: `Upfront carbon (A1–A5) ${wholeLife.upfrontCarbon} kgCO2e; use stage embodied ${wholeLife.useStageEmbodied}; operational ${wholeLife.operationalInUse}; end of life ${wholeLife.endOfLife}; total excluding D ${wholeLife.totalExcludingD}; whole life including D ${wholeLife.wholeLifeTotal} kgCO2e.`,
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
