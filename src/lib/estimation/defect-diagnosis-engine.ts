/**
 * FRELUX Defect Diagnosis Engine (Future Engine 9)
 *
 * Deterministic symptom-to-root-cause mapping with fix
 * quantities, from an admin-configured knowledge base.
 *
 * Philosophy (unchanged): causes are ranked by the admin's
 * sort_order (likelihood is an editorial call, never an
 * algorithm's). A cause only gets a fix quantity when the
 * admin configured a consumption rate — otherwise the engine
 * says so instead of guessing. Unknown symptoms are refused,
 * never matched approximately.
 */

import type { EstimationCalcRule } from "@/types/estimation";

// ─────────────────────────────────────────────
// Contracts
// ─────────────────────────────────────────────

export interface DefectCauseLike {
  defect_id: string;
  cause_key: string;
  cause_label: string;
  root_cause: string;
  severity: "low" | "medium" | "high";
  fix_summary: string;
  fix_material: string | null;
  fix_consumption_per_sqm: number | null;
  fix_unit: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface DiagnosisInput {
  symptom_key: string;
  /** All active causes for this symptom, from the database */
  causes: DefectCauseLike[];
  /** Affected area in sqm (optional; enables fix quantities) */
  affected_area_sqm: number | null;
  /** Active calc rules (calculator_type = 'defects') */
  rules: EstimationCalcRule[];
}

export interface DiagnosedCause {
  cause_key: string;
  cause_label: string;
  root_cause: string;
  severity: "low" | "medium" | "high";
  fix_summary: string;
  fix_material: string | null;
  fix_quantity: number | null;
  fix_unit: string | null;
  quantity_note: string | null;
}

export interface DiagnosisResult {
  ok: boolean;
  symptom_key: string | null;
  affected_area_sqm: number | null;
  causes: DiagnosedCause[];
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

export function diagnoseDefect(input: DiagnosisInput): DiagnosisResult {
  const result: DiagnosisResult = {
    ok: false,
    symptom_key: null,
    affected_area_sqm: null,
    causes: [],
    warnings: [],
    steps: [],
  };

  // ── 1. Validate the inputs ──
  const symptomKey = input.symptom_key?.trim();
  if (!symptomKey) {
    result.warnings.push(
      "A symptom must be selected — the engine never diagnoses without one.",
    );
    return result;
  }

  const area = input.affected_area_sqm;
  if (area !== null) {
    const a = Number(area);
    if (!Number.isFinite(a) || a <= 0) {
      result.warnings.push(
        "Affected area must be a positive number of square metres (or left empty for a qualitative diagnosis).",
      );
      return result;
    }
  }

  const decimals = Math.max(
    0,
    Math.min(6, ruleNumber(input.rules, "rounding_decimals", 2)),
  );

  // ── 2. Deterministic cause mapping: active causes, ranked by admin sort_order ──
  const causes = (input.causes ?? [])
    .filter((c) => c.is_active !== false)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  if (causes.length === 0) {
    result.warnings.push(
      `No root causes are configured for '${symptomKey}' — the engine refuses to guess a diagnosis. Add causes under Admin → Defects.`,
    );
    return result;
  }

  // ── 3. Fix quantities: only from configured consumption rates — never invented ──
  const diagnosed: DiagnosedCause[] = causes.map((c) => {
    const consumption = c.fix_consumption_per_sqm;
    let fix_quantity: number | null = null;
    let quantityNote: string | null = null;

    if (consumption !== null && consumption !== undefined) {
      const rate = Number(consumption);
      if (Number.isFinite(rate) && rate > 0) {
        if (area !== null) {
          fix_quantity = roundTo(area * rate, decimals);
          result.steps.push({
            label: `Fix quantity — ${c.cause_label}`,
            detail: `${area} sqm × ${rate} ${c.fix_unit ?? "unit"}/sqm = ${fix_quantity} ${c.fix_unit ?? "unit"} of ${c.fix_material ?? "fix material"} (configured rate, never guessed).`,
          });
        } else {
          quantityNote =
            "Enter an affected area to compute the exact fix quantity from this cause's configured consumption rate.";
        }
      } else {
        quantityNote =
          "This cause's configured consumption rate is invalid and was ignored — no quantity was guessed.";
        result.warnings.push(quantityNote);
      }
    } else {
      quantityNote =
        "No consumption rate is configured for this cause — the fix is qualitative, and the engine does not invent a quantity.";
    }

    return {
      cause_key: c.cause_key,
      cause_label: c.cause_label,
      root_cause: c.root_cause,
      severity: c.severity,
      fix_summary: c.fix_summary,
      fix_material: c.fix_material,
      fix_quantity,
      fix_unit: c.fix_unit,
      quantity_note: quantityNote,
    };
  });

  result.ok = true;
  result.symptom_key = symptomKey;
  result.affected_area_sqm =
    area !== null ? roundTo(Number(area), decimals) : null;
  result.causes = diagnosed;
  result.steps.push({
    label: "Ranking",
    detail: `${diagnosed.length} cause${diagnosed.length === 1 ? "" : "s"} listed in the admin's configured likelihood order — the engine does not re-rank them algorithmically.`,
  });

  return result;
}
