/**
 * Flooring engine tests (Tier 2, Engine 4)
 *
 * Pins the honesty contract:
 *  - area/perimeter never assumed: missing → unsized line,
 *    named missing input, incomplete estimate
 *  - 0 area means nothing to cover; blank ≠ 0
 *  - coverage rules must exist for pack/roll/bag; never guessed
 *  - waste visible; whole units round up
 *  - PRICE NOT CONFIGURED; totals stay null; labour separate
 *  - deterministic
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_FLOORING_RULES,
  parseFlooringRules,
  calculateFlooring,
  type FlooringInput,
  type FlooringRules,
} from "../flooring-engine";

const rules: FlooringRules = {
  ...DEFAULT_FLOORING_RULES,
  floor_waste_pct: 8,
  laminate_pack_coverage_m2: 2.5,
  underlay_roll_coverage_m2: 10,
  adhesive_coverage_m2_per_bag: 5,
  skirting_waste_pct: 5,
};

function makeInput(overrides: Partial<FlooringInput> = {}): FlooringInput {
  return {
    flooring_type: "laminate",
    floor_area_m2: 30,
    skirting_run_m: 22,
    include_underlay: true,
    include_adhesive: false,
    labour: { mode: "none" },
    ...overrides,
  };
}

const FULL_PRICES = {
  "flooring-laminate-pack": 12500,
  "flooring-vinyl-m2": 4500,
  "flooring-parquet-m2": 18000,
  "flooring-underlay-roll": 8000,
  "flooring-adhesive-bag": 6500,
  "flooring-skirting-m": 1200,
};

// ─────────────────────────────────────────────
// Rules parsing
// ─────────────────────────────────────────────

describe("parseFlooringRules", () => {
  it("defaults to nothing silently invented", () => {
    const parsed = parseFlooringRules([]);
    expect(parsed.floor_waste_pct).toBe(0);
    expect(parsed.laminate_pack_coverage_m2).toBeNull();
    expect(parsed.adhesive_coverage_m2_per_bag).toBeNull();
  });

  it("applies configured rules; ignores nonsense", () => {
    const parsed = parseFlooringRules([
      { rule_key: "floor_waste_pct", rule_value: { value: 10 } },
      { rule_key: "laminate_pack_coverage_m2", rule_value: { value: 2.98 } },
      {
        rule_key: "underlay_roll_coverage_m2",
        rule_value: { value: -2 },
        is_active: false,
      },
      {
        rule_key: "adhesive_coverage_m2_per_bag",
        rule_value: { value: "five" },
      },
    ]);
    expect(parsed.floor_waste_pct).toBe(10);
    expect(parsed.laminate_pack_coverage_m2).toBe(2.98);
    expect(parsed.underlay_roll_coverage_m2).toBeNull();
    expect(parsed.adhesive_coverage_m2_per_bag).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────

describe("input validation", () => {
  it("refuses negative areas and unknown flooring types", () => {
    const a = calculateFlooring(
      makeInput({ floor_area_m2: -3 }),
      rules,
      FULL_PRICES,
    );
    expect(a.ok).toBe(false);
    expect(a.errors.join(" ")).toMatch(/Floor area/i);
    const b = calculateFlooring(
      makeInput({ flooring_type: "granite" as never }),
      rules,
      FULL_PRICES,
    );
    expect(b.ok).toBe(false);
    expect(b.errors.join(" ")).toMatch(/laminate, vinyl or parquet/i);
  });
});

// ─────────────────────────────────────────────
// Lines
// ─────────────────────────────────────────────

describe("material lines", () => {
  it("laminate: area + waste ÷ pack coverage → whole packs", () => {
    const r = calculateFlooring(makeInput(), rules, FULL_PRICES);
    const packs = r.lines.find((l) => l.key === "floor_covering");
    // 30 × 1.08 = 32.4 ÷ 2.5 = 12.96 → 13 packs
    expect(packs?.quantity).toBe(13);
    expect(packs?.unit_price).toBe(12500);
    expect(r.steps.some((s) => /30 m² × 1\.08/.test(s.detail))).toBe(true);
  });

  it("vinyl: priced per m² with visible waste", () => {
    const r = calculateFlooring(
      makeInput({ flooring_type: "vinyl" }),
      rules,
      FULL_PRICES,
    );
    const v = r.lines.find((l) => l.key === "floor_covering");
    // 30 × 1.08 = 32.4 → 33 m²
    expect(v?.quantity).toBe(33);
    expect(v?.material_slug).toBe("flooring-vinyl-m2");
  });

  it("parquet: same honest math, its own price", () => {
    const r = calculateFlooring(
      makeInput({ flooring_type: "parquet" }),
      rules,
      FULL_PRICES,
    );
    expect(r.lines.find((l) => l.key === "floor_covering")?.material_slug).toBe(
      "flooring-parquet-m2",
    );
    expect(r.lines.find((l) => l.key === "floor_covering")?.quantity).toBe(33);
  });

  it("underlay and adhesive: area ÷ coverage → whole units", () => {
    const r = calculateFlooring(
      makeInput({ include_adhesive: true }),
      rules,
      FULL_PRICES,
    );
    expect(r.lines.find((l) => l.key === "underlay")?.quantity).toBe(3);
    expect(r.lines.find((l) => l.key === "adhesive")?.quantity).toBe(6);
  });

  it("skirting: run × waste factor, rounds up", () => {
    const r = calculateFlooring(makeInput(), rules, FULL_PRICES);
    // 22 × 1.05 = 23.1 → 24
    expect(r.lines.find((l) => l.key === "skirting")?.quantity).toBe(24);
  });

  it("0 area omits the covering line; blank area is missing + incomplete", () => {
    const zero = calculateFlooring(
      makeInput({ floor_area_m2: 0, skirting_run_m: 10 }),
      rules,
      FULL_PRICES,
    );
    expect(zero.lines.find((l) => l.key === "floor_covering")).toBeUndefined();
    expect(zero.incomplete).toBe(false);

    const blank = calculateFlooring(
      makeInput({ floor_area_m2: null }),
      rules,
      FULL_PRICES,
    );
    expect(
      blank.lines.find((l) => l.key === "floor_covering")?.quantity,
    ).toBeNull();
    expect(blank.missing.some((m) => /Floor area/.test(m))).toBe(true);
    expect(blank.incomplete).toBe(true);
  });

  it("skirting blank is a question; skirting 0 is omitted cleanly", () => {
    const blank = calculateFlooring(
      makeInput({ skirting_run_m: null }),
      rules,
      FULL_PRICES,
    );
    expect(blank.missing.some((m) => /Skirting/.test(m))).toBe(true);
    const zero = calculateFlooring(
      makeInput({ skirting_run_m: 0 }),
      rules,
      FULL_PRICES,
    );
    expect(zero.lines.find((l) => l.key === "skirting")).toBeUndefined();
    expect(zero.missing.some((m) => /Skirting/.test(m))).toBe(false);
  });

  it("missing coverage rules are reported, never guessed", () => {
    const bare = { ...rules, laminate_pack_coverage_m2: null };
    const r = calculateFlooring(makeInput(), bare, FULL_PRICES);
    expect(r.lines.find((l) => l.key === "floor_covering")).toBeUndefined();
    expect(r.missing.some((m) => /pack coverage configured/.test(m))).toBe(
      true,
    );

    const bareU = { ...rules, underlay_roll_coverage_m2: null };
    const r2 = calculateFlooring(makeInput(), bareU, FULL_PRICES);
    expect(r2.lines.find((l) => l.key === "underlay")).toBeUndefined();
    expect(r2.missing.some((m) => /roll coverage configured/.test(m))).toBe(
      true,
    );
  });
});

// ─────────────────────────────────────────────
// Prices, labour, determinism
// ─────────────────────────────────────────────

describe("pricing honesty", () => {
  it("unpriced materials keep quantity but null totals", () => {
    const r = calculateFlooring(makeInput(), rules, {});
    expect(r.lines.every((l) => l.unit_price === null)).toBe(true);
    expect(r.material_subtotal).toBeNull();
    expect(r.lines.find((l) => l.key === "floor_covering")?.quantity).toBe(13);
  });

  it("fully priced → complete with grand total", () => {
    const r = calculateFlooring(makeInput(), rules, FULL_PRICES);
    expect(r.incomplete).toBe(false);
    expect(r.grand_total).toBe(r.material_subtotal);
  });
});

describe("labour", () => {
  it("per-m² labour on the floor area", () => {
    const r = calculateFlooring(
      makeInput({ labour: { mode: "per_m2", per_m2_rate: 1200 } }),
      rules,
      FULL_PRICES,
    );
    expect(r.labour_total).toBe(36000);
  });
});

describe("determinism", () => {
  it("identical inputs produce identical outputs", () => {
    const a = calculateFlooring(makeInput(), rules, FULL_PRICES);
    const b = calculateFlooring(makeInput(), rules, FULL_PRICES);
    expect(a).toEqual(b);
  });
});
