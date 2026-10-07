/**
 * Defect Diagnosis Engine tests (Future Engine 9)
 *
 * Every expected value below is hand-verified.
 */

import { describe, it, expect } from "vitest";
import {
  diagnoseDefect,
  type DiagnosisInput,
  type DefectCauseLike,
} from "./defect-diagnosis-engine";
import type { EstimationCalcRule } from "@/types/estimation";

const cause = (over: Partial<DefectCauseLike> = {}): DefectCauseLike => ({
  defect_id: "d-1",
  cause_key: "salt_migration",
  cause_label: "Salt migration through masonry",
  root_cause:
    "Water is carrying dissolved salts through the wall; the salts crystallise on the surface as the water evaporates.",
  severity: "high",
  fix_summary:
    "Identify and fix the moisture source, then apply a stabilising primer before redecoration.",
  fix_material: "Stabilising primer",
  fix_consumption_per_sqm: 0.25,
  fix_unit: "litre",
  is_active: true,
  sort_order: 0,
  ...over,
});

const rule = (key: string, value: unknown): EstimationCalcRule =>
  ({
    id: `r-${key}`,
    rule_key: key,
    calculator_type: "defects",
    rule_value: { value },
    rule_status: "verified_frelux",
    description: null,
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  }) as unknown as EstimationCalcRule;

const input = (over: Partial<DiagnosisInput> = {}): DiagnosisInput => ({
  symptom_key: "efflorescence",
  causes: [cause()],
  affected_area_sqm: 120,
  rules: [rule("rounding_decimals", 2)],
  ...over,
});

describe("diagnoseDefect", () => {
  it("maps a symptom to its ranked causes with a hand-verified fix quantity", () => {
    // 120 sqm × 0.25 litre/sqm = 30 litres of stabilising primer
    const r = diagnoseDefect(input());
    expect(r.ok).toBe(true);
    expect(r.causes).toHaveLength(1);
    const c = r.causes[0];
    expect(c.cause_label).toBe("Salt migration through masonry");
    expect(c.severity).toBe("high");
    expect(c.fix_quantity).toBe(30);
    expect(c.fix_unit).toBe("litre");
    expect(c.quantity_note).toBeNull();
    expect(r.steps[0].detail).toMatch(/configured rate, never guessed/);
  });

  it("lists causes in the admin's configured order, never re-ranks", () => {
    const r = diagnoseDefect(
      input({
        causes: [
          cause({
            cause_key: "b",
            cause_label: "Low likelihood",
            sort_order: 2,
          }),
          cause({ cause_key: "a", cause_label: "Most likely", sort_order: 0 }),
          cause({ cause_key: "c", cause_label: "Middle", sort_order: 1 }),
        ],
      }),
    );
    expect(r.causes.map((c) => c.cause_key)).toEqual(["a", "c", "b"]);
    expect(r.steps[r.steps.length - 1].detail).toMatch(
      /does not re-rank them algorithmically/,
    );
  });

  it("computes fractional quantities per the decimals rule (hand-verified)", () => {
    // 75 sqm × 0.12 kg/sqm = 9 kg exactly; 45 sqm × 0.12 = 5.4
    const r = diagnoseDefect(
      input({
        causes: [cause({ fix_consumption_per_sqm: 0.12, fix_unit: "kg" })],
        affected_area_sqm: 45,
      }),
    );
    expect(r.causes[0].fix_quantity).toBe(5.4);
    expect(r.causes[0].fix_unit).toBe("kg");
  });

  it("gives a qualitative diagnosis with a note when no area is entered", () => {
    const r = diagnoseDefect(input({ affected_area_sqm: null }));
    expect(r.ok).toBe(true);
    expect(r.causes[0].fix_quantity).toBeNull();
    expect(r.causes[0].quantity_note).toMatch(
      /Enter an affected area to compute the exact fix quantity/,
    );
    expect(r.steps).toHaveLength(1); // only the ranking step: no quantity computed
  });

  it("states clearly when a cause has no configured consumption rate: never guesses", () => {
    const r = diagnoseDefect(
      input({
        causes: [cause({ fix_consumption_per_sqm: null, fix_unit: null })],
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.causes[0].fix_quantity).toBeNull();
    expect(r.causes[0].quantity_note).toMatch(/does not invent a quantity/);
  });

  it("ignores an invalid configured consumption rate and warns", () => {
    const r = diagnoseDefect(
      input({ causes: [cause({ fix_consumption_per_sqm: -1 })] }),
    );
    expect(r.ok).toBe(true);
    expect(r.causes[0].fix_quantity).toBeNull();
    expect(r.causes[0].quantity_note).toMatch(/invalid and was ignored/);
    expect(r.warnings.join(" ")).toMatch(
      /invalid and was ignored: no quantity was guessed/,
    );
  });

  it("ignores inactive causes entirely", () => {
    const r = diagnoseDefect(
      input({
        causes: [
          cause({ is_active: false }),
          cause({ cause_key: "other", sort_order: 1 }),
        ],
      }),
    );
    expect(r.causes).toHaveLength(1);
    expect(r.causes[0].cause_key).toBe("other");
  });

  it("refuses a symptom with no configured causes: never guesses", () => {
    const r = diagnoseDefect(input({ causes: [] }));
    expect(r.ok).toBe(false);
    expect(r.warnings.join(" ")).toMatch(
      /No root causes are configured for 'efflorescence'/,
    );
    expect(r.warnings.join(" ")).toMatch(/refuses to guess a diagnosis/);
  });

  it("refuses an empty symptom key and invalid areas", () => {
    expect(diagnoseDefect(input({ symptom_key: "  " })).ok).toBe(false);
    expect(diagnoseDefect(input({ affected_area_sqm: 0 })).ok).toBe(false);
    expect(diagnoseDefect(input({ affected_area_sqm: -10 })).ok).toBe(false);
    expect(diagnoseDefect(input({ affected_area_sqm: NaN })).ok).toBe(false);
    expect(
      diagnoseDefect(input({ symptom_key: "  " })).warnings.join(" "),
    ).toMatch(/never diagnoses without one/);
  });

  it("reports the affected area rounded per the decimals rule", () => {
    const r = diagnoseDefect(input({ affected_area_sqm: 120.456789 }));
    expect(r.affected_area_sqm).toBe(120.46);
  });
});
