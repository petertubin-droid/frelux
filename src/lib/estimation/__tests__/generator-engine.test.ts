/**
 * Generator engine tests (Tier 2, Engine 8)
 *
 * Pins the honesty contract:
 *  - the engine NEVER sizes the generator: the size bracket is
 *    the user's choice, and every result says so
 *  - cable run never assumed: blank → missing + incomplete;
 *    0 → explicitly confirmed in the steps
 *  - ATS/battery are labelled assumptions; cable waste visible
 *  - PRICE NOT CONFIGURED; totals null; labour lump-sum only
 *  - deterministic
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_GENERATOR_RULES,
  parseGeneratorRules,
  calculateGenerator,
  type GeneratorInput,
  type GeneratorRules,
} from "../generator-engine";

const rules: GeneratorRules = { gen_cable_waste_pct: 5 };

function makeInput(overrides: Partial<GeneratorInput> = {}): GeneratorInput {
  return {
    size: "20kva",
    units: 1,
    include_ats: true,
    cable_run_m: 18,
    include_battery: true,
    labour: { mode: "none" },
    ...overrides,
  };
}

const FULL_PRICES = {
  "gen-unit-10kva": 1_200_000,
  "gen-unit-20kva": 2_100_000,
  "gen-unit-30kva": 3_400_000,
  "gen-unit-50kva": 5_800_000,
  "gen-ats": 180_000,
  "gen-battery": 45_000,
  "gen-cable-per-m": 12_500,
};

// ─────────────────────────────────────────────
// Rules parsing
// ─────────────────────────────────────────────

describe("parseGeneratorRules", () => {
  it("defaults to zero waste", () => {
    expect(parseGeneratorRules([]).gen_cable_waste_pct).toBe(0);
  });

  it("applies the rule; ignores nonsense", () => {
    const a = parseGeneratorRules([
      { rule_key: "gen_cable_waste_pct", rule_value: { value: 8 } },
    ]);
    expect(a.gen_cable_waste_pct).toBe(8);
    const b = parseGeneratorRules([
      { rule_key: "gen_cable_waste_pct", rule_value: { value: 150 } },
    ]);
    expect(b.gen_cable_waste_pct).toBe(0);
  });
});

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────

describe("input validation", () => {
  it("refuses zero, fractional and too many units", () => {
    expect(
      calculateGenerator(makeInput({ units: 0 }), rules, FULL_PRICES).ok,
    ).toBe(false);
    expect(
      calculateGenerator(makeInput({ units: 1.5 }), rules, FULL_PRICES).ok,
    ).toBe(false);
    expect(
      calculateGenerator(makeInput({ units: 99 }), rules, FULL_PRICES).ok,
    ).toBe(false);
  });

  it("refuses unknown sizes and negative cable runs", () => {
    const a = calculateGenerator(
      makeInput({ size: "75kva" as never }),
      rules,
      FULL_PRICES,
    );
    expect(a.ok).toBe(false);
    expect(a.errors.join(" ")).toMatch(/10kva, 20kva, 30kva, 50kva/i);
    const b = calculateGenerator(
      makeInput({ cable_run_m: -1 }),
      rules,
      FULL_PRICES,
    );
    expect(b.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Lines
// ─────────────────────────────────────────────

describe("material lines", () => {
  it("the chosen bracket is priced as the user's choice, never a calculated size", () => {
    const r = calculateGenerator(makeInput(), rules, FULL_PRICES);
    const gen = r.lines.find((l) => l.key === "generator");
    expect(gen?.material_slug).toBe("gen-unit-20kva");
    expect(gen?.line_total).toBe(2_100_000);
    expect(gen?.detail).toMatch(/your chosen bracket/);
    expect(r.warnings.some((w) => /did NOT size the generator/.test(w))).toBe(
      true,
    );
  });

  it("cable: measured run × waste factor, whole metres up", () => {
    const r = calculateGenerator(makeInput(), rules, FULL_PRICES);
    const cable = r.lines.find((l) => l.key === "cable");
    // 18 × 1.05 = 18.9 → 19
    expect(cable?.quantity).toBe(19);
    expect(cable?.line_total).toBe(237_500);
  });

  it("blank cable run → missing + incomplete; 0 → confirmed in steps, no line", () => {
    const blank = calculateGenerator(
      makeInput({ cable_run_m: null }),
      rules,
      FULL_PRICES,
    );
    expect(blank.lines.find((l) => l.key === "cable")?.quantity).toBeNull();
    expect(blank.missing.some((m) => /will not assume a length/.test(m))).toBe(
      true,
    );
    expect(blank.incomplete).toBe(true);
    expect(blank.grand_total).toBeNull();

    const zero = calculateGenerator(
      makeInput({ cable_run_m: 0 }),
      rules,
      FULL_PRICES,
    );
    expect(zero.lines.find((l) => l.key === "cable")).toBeUndefined();
    expect(
      zero.steps.some((s) =>
        /confirm the set truly mounts at the panel/.test(s.detail),
      ),
    ).toBe(true);
    expect(zero.incomplete).toBe(false);
  });

  it("ATS and battery are labelled, one per set, absent when excluded", () => {
    const r = calculateGenerator(makeInput({ units: 2 }), rules, FULL_PRICES);
    expect(r.lines.find((l) => l.key === "ats")?.quantity).toBe(2);
    expect(r.lines.find((l) => l.key === "battery")?.quantity).toBe(2);
    const bare = calculateGenerator(
      makeInput({ include_ats: false, include_battery: false }),
      rules,
      FULL_PRICES,
    );
    expect(bare.lines.find((l) => l.key === "ats")).toBeUndefined();
    expect(bare.lines.find((l) => l.key === "battery")).toBeUndefined();
    expect(bare.incomplete).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Prices, labour, determinism
// ─────────────────────────────────────────────

describe("pricing honesty", () => {
  it("unpriced materials keep quantities but null totals", () => {
    const r = calculateGenerator(makeInput(), rules, {});
    expect(r.lines.every((l) => l.unit_price === null)).toBe(true);
    expect(r.material_subtotal).toBeNull();
    expect(r.priced_subtotal).toBe(0);
    expect(r.lines.find((l) => l.key === "generator")?.quantity).toBe(1);
  });

  it("fully priced → complete with grand total", () => {
    const r = calculateGenerator(makeInput(), rules, FULL_PRICES);
    expect(r.incomplete).toBe(false);
    expect(r.grand_total).toBe(r.material_subtotal);
  });
});

describe("labour", () => {
  it("lump sum respected; none excluded", () => {
    const a = calculateGenerator(
      makeInput({ labour: { mode: "lump_sum", lump_sum: 250000 } }),
      rules,
      FULL_PRICES,
    );
    expect(a.labour_total).toBe(250000);
    const b = calculateGenerator(makeInput(), rules, FULL_PRICES);
    expect(b.labour_total).toBe(0);
  });

  it("missing lump sum is an error, never guessed", () => {
    const r = calculateGenerator(
      makeInput({ labour: { mode: "lump_sum", lump_sum: null } }),
      rules,
      FULL_PRICES,
    );
    expect(r.ok).toBe(false);
    expect(r.grand_total).toBeNull();
  });
});

describe("determinism", () => {
  it("identical inputs produce identical outputs", () => {
    const a = calculateGenerator(makeInput(), rules, FULL_PRICES);
    const b = calculateGenerator(makeInput(), rules, FULL_PRICES);
    expect(a).toEqual(b);
  });
});
