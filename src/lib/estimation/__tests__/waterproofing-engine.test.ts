/**
 * Waterproofing engine tests (Tier 2, Engine 3)
 *
 * Pins the honesty contract:
 *  - measured areas/runs never assumed: missing → unsized line,
 *    named missing input, incomplete estimate
 *  - 0 = surface doesn't exist (line omitted); blank ≠ 0
 *  - coats, coverage, waste and overlaps are visible rules
 *  - missing coverage/coat rules → reported, never guessed
 *  - PRICE NOT CONFIGURED for unpriced materials; totals stay null
 *  - labour separate; deterministic
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_WATERPROOFING_RULES,
  parseWaterproofingRules,
  calculateWaterproofing,
  type WaterproofingInput,
  type WaterproofingRules,
} from "../waterproofing-engine";

const rules: WaterproofingRules = {
  ...DEFAULT_WATERPROOFING_RULES,
  coating_waste_pct: 10,
  coats_wet_floor: 2,
  coats_wet_wall: 2,
  coats_terrace: 2,
  cementitious_coverage_m2_per_bag: 8,
  membrane_roll_coverage_m2: 10,
  tape_overlap_pct: 10,
  dpc_overlap_pct: 5,
};

function makeInput(
  overrides: Partial<WaterproofingInput> = {},
): WaterproofingInput {
  return {
    dpc_run_m: 40,
    dpm_area_m2: 20,
    wet_floor_area_m2: 8,
    wet_wall_area_m2: 12,
    wet_perimeter_m: 12,
    terrace_area_m2: 30,
    labour: { mode: "none" },
    ...overrides,
  };
}

const FULL_PRICES = {
  "dpc-per-meter": 500,
  "dpm-per-m2": 1500,
  "waterproofing-cementitious-coating": 9500,
  "bituminous-membrane-roll": 22000,
  "waterproofing-tape": 900,
};

// ─────────────────────────────────────────────
// Rules parsing
// ─────────────────────────────────────────────

describe("parseWaterproofingRules", () => {
  it("defaults to nothing silently invented", () => {
    const parsed = parseWaterproofingRules([]);
    expect(parsed.coating_waste_pct).toBe(0);
    expect(parsed.coats_wet_floor).toBeNull();
    expect(parsed.cementitious_coverage_m2_per_bag).toBeNull();
    expect(parsed.membrane_roll_coverage_m2).toBeNull();
  });

  it("applies configured rules; ignores nonsense", () => {
    const parsed = parseWaterproofingRules([
      { rule_key: "coats_wet_floor", rule_value: { value: 3 } },
      {
        rule_key: "coats_wet_floor",
        rule_value: { value: 99 },
        is_active: false,
      },
      {
        rule_key: "cementitious_coverage_m2_per_bag",
        rule_value: { value: 10 },
      },
      { rule_key: "membrane_roll_coverage_m2", rule_value: { value: 0 } },
      { rule_key: "dpc_overlap_pct", rule_value: { value: 150 } },
    ]);
    expect(parsed.coats_wet_floor).toBe(3);
    expect(parsed.cementitious_coverage_m2_per_bag).toBe(10);
    expect(parsed.membrane_roll_coverage_m2).toBeNull();
    expect(parsed.dpc_overlap_pct).toBe(0);
  });
});

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────

describe("input validation", () => {
  it("refuses negative areas with the field named", () => {
    const r = calculateWaterproofing(
      makeInput({ terrace_area_m2: -1 }),
      rules,
      FULL_PRICES,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/Terrace\/roof area/i);
  });
});

// ─────────────────────────────────────────────
// Lines
// ─────────────────────────────────────────────

describe("material lines", () => {
  it("DPC run gets visible overlap and rounds up", () => {
    const r = calculateWaterproofing(makeInput(), rules, FULL_PRICES);
    const dpc = r.lines.find((l) => l.key === "dpc");
    // 40 × 1.05 = 42
    expect(dpc?.quantity).toBe(42);
    expect(dpc?.unit_price).toBe(500);
    expect(dpc?.line_total).toBe(21000);
  });

  it("DPM area rounds up to whole m²", () => {
    const r = calculateWaterproofing(
      makeInput({ dpm_area_m2: 20.4 }),
      rules,
      FULL_PRICES,
    );
    expect(r.lines.find((l) => l.key === "dpm")?.quantity).toBe(21);
  });

  it("coating: coats × area ÷ coverage, waste visible, whole bags", () => {
    const r = calculateWaterproofing(makeInput(), rules, FULL_PRICES);
    const coat = r.lines.find((l) => l.key === "cementitious_coating");
    // (8×2 + 12×2) = 40 m² × 1.10 = 44 ÷ 8 = 5.5 → 6 bags
    expect(coat?.quantity).toBe(6);
    expect(coat?.quantity_source).toBe("rule_derived");
    expect(r.steps.some((s) => /8 m² × 2 coats/.test(s.detail))).toBe(true);
    expect(coat?.detail).toMatch(/waste 10%/);
  });

  it("terrace membrane: area ÷ roll coverage, whole rolls", () => {
    const r = calculateWaterproofing(makeInput(), rules, FULL_PRICES);
    // 30 ÷ 10 = 3
    expect(r.lines.find((l) => l.key === "bituminous_membrane")?.quantity).toBe(
      3,
    );
  });

  it("tape: perimeter × overlap factor, rounds up", () => {
    const r = calculateWaterproofing(makeInput(), rules, FULL_PRICES);
    // 12 × 1.10 = 13.2 → 14
    expect(r.lines.find((l) => l.key === "tape")?.quantity).toBe(14);
  });

  it("zero area means the line is omitted; blank means unsized + incomplete", () => {
    const zero = calculateWaterproofing(
      makeInput({ terrace_area_m2: 0 }),
      rules,
      FULL_PRICES,
    );
    expect(
      zero.lines.find((l) => l.key === "bituminous_membrane"),
    ).toBeUndefined();

    const blank = calculateWaterproofing(
      makeInput({ terrace_area_m2: null }),
      rules,
      FULL_PRICES,
    );
    expect(
      blank.lines.find((l) => l.key === "bituminous_membrane"),
    ).toBeUndefined();
    // terrace blank is allowed (no terrace) - but DPC blank is a required question
    const noDpc = calculateWaterproofing(
      makeInput({ dpc_run_m: null }),
      rules,
      FULL_PRICES,
    );
    const dpc = noDpc.lines.find((l) => l.key === "dpc");
    expect(dpc?.quantity).toBeNull();
    expect(noDpc.missing.some((m) => /DPC roll/.test(m))).toBe(true);
    expect(noDpc.incomplete).toBe(true);
  });

  it("missing coverage or coat rules are reported, never guessed", () => {
    const noCov = { ...rules, cementitious_coverage_m2_per_bag: null };
    const r = calculateWaterproofing(makeInput(), noCov, FULL_PRICES);
    expect(
      r.lines.find((l) => l.key === "cementitious_coating"),
    ).toBeUndefined();
    expect(r.missing.some((m) => /coverage rate configured/.test(m))).toBe(
      true,
    );

    const noCoats = { ...rules, coats_wet_floor: null, coats_wet_wall: null };
    const r2 = calculateWaterproofing(makeInput(), noCoats, FULL_PRICES);
    expect(
      r2.lines.find((l) => l.key === "cementitious_coating"),
    ).toBeUndefined();
    expect(
      r2.missing.filter((m) => /coat count configured/.test(m)).length,
    ).toBe(2);
  });
});

// ─────────────────────────────────────────────
// Prices, labour, determinism
// ─────────────────────────────────────────────

describe("pricing honesty", () => {
  it("unpriced materials keep quantity but null totals", () => {
    const r = calculateWaterproofing(makeInput(), rules, {});
    expect(r.lines.every((l) => l.unit_price === null)).toBe(true);
    expect(r.material_subtotal).toBeNull();
    expect(r.priced_subtotal).toBe(0);
    expect(r.lines.find((l) => l.key === "dpc")?.quantity).toBe(42);
  });

  it("fully priced and sized → complete with grand total", () => {
    const r = calculateWaterproofing(makeInput(), rules, FULL_PRICES);
    expect(r.incomplete).toBe(false);
    expect(r.grand_total).toBe(r.material_subtotal);
  });
});

describe("labour", () => {
  it("per-m² labour covers the treated areas", () => {
    const r = calculateWaterproofing(
      makeInput({ labour: { mode: "per_m2", per_m2_rate: 500 } }),
      rules,
      FULL_PRICES,
    );
    // max(20, 8+12+30) = 50 m² × 500
    expect(r.labour_total).toBe(25000);
  });

  it("lump sum respected; none excluded", () => {
    const a = calculateWaterproofing(
      makeInput({ labour: { mode: "lump_sum", lump_sum: 10000 } }),
      rules,
      FULL_PRICES,
    );
    expect(a.labour_total).toBe(10000);
    const b = calculateWaterproofing(makeInput(), rules, FULL_PRICES);
    expect(b.labour_total).toBe(0);
  });
});

describe("determinism", () => {
  it("identical inputs produce identical outputs", () => {
    const a = calculateWaterproofing(makeInput(), rules, FULL_PRICES);
    const b = calculateWaterproofing(makeInput(), rules, FULL_PRICES);
    expect(a).toEqual(b);
  });
});
