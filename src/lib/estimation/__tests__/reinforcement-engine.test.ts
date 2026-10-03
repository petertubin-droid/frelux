/**
 * Reinforcement engine tests (Tier 2, Engine 5)
 *
 * Pins the honesty contract:
 *  - schedule lengths never assumed; all-blank schedule is
 *    reported missing, never invented
 *  - blank diameter = not used; 0 = explicitly none
 *  - whole 12 m lengths round up; lap/waste visible and separate
 *  - tonnage from true cutting length with BS 4449 kg/m constants
 *  - binding wire follows the visible per-tonne rule
 *  - PRICE NOT CONFIGURED; totals null; labour separate
 *  - deterministic
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_REINFORCEMENT_RULES,
  parseReinforcementRules,
  calculateReinforcement,
  type ReinforcementInput,
  type ReinforcementRules,
} from "../reinforcement-engine";

const rules: ReinforcementRules = {
  ...DEFAULT_REINFORCEMENT_RULES,
  rebar_lap_waste_pct: 5,
  binding_wire_kg_per_tonne: 12,
};

function makeInput(
  overrides: Partial<ReinforcementInput> = {},
): ReinforcementInput {
  return {
    len_12mm_m: 120,
    len_16mm_m: 60,
    len_20mm_m: 0,
    len_25mm_m: null,
    labour: { mode: "none" },
    ...overrides,
  };
}

const FULL_PRICES = {
  "rebar-12mm-per-length": 11500,
  "rebar-16mm-per-length": 18500,
  "rebar-20mm-per-length": 27000,
  "rebar-25mm-per-length": 40000,
  "binding-wire-per-kg": 2500,
};

// ─────────────────────────────────────────────
// Rules parsing
// ─────────────────────────────────────────────

describe("parseReinforcementRules", () => {
  it("defaults to nothing silently invented", () => {
    const parsed = parseReinforcementRules([]);
    expect(parsed.rebar_lap_waste_pct).toBe(0);
    expect(parsed.binding_wire_kg_per_tonne).toBeNull();
  });

  it("applies configured rules; ignores nonsense", () => {
    const parsed = parseReinforcementRules([
      { rule_key: "rebar_lap_waste_pct", rule_value: { value: 7 } },
      { rule_key: "binding_wire_kg_per_tonne", rule_value: { value: 15 } },
      {
        rule_key: "binding_wire_kg_per_tonne",
        rule_value: { value: -1 },
        is_active: false,
      },
      { rule_key: "rebar_lap_waste_pct", rule_value: { value: 200 } },
    ]);
    expect(parsed.rebar_lap_waste_pct).toBe(7);
    expect(parsed.binding_wire_kg_per_tonne).toBe(15);
  });
});

// ─────────────────────────────────────────────
// Validation and the all-blank schedule
// ─────────────────────────────────────────────

describe("validation and missing schedule", () => {
  it("refuses negative lengths with the diameter named", () => {
    const r = calculateReinforcement(
      makeInput({ len_16mm_m: -5 }),
      rules,
      FULL_PRICES,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/16 mm cutting length/i);
  });

  it("an all-blank schedule is reported missing, never invented", () => {
    const r = calculateReinforcement(
      {
        len_12mm_m: null,
        len_16mm_m: null,
        len_20mm_m: null,
        len_25mm_m: null,
        labour: { mode: "none" },
      },
      rules,
      FULL_PRICES,
    );
    expect(r.ok).toBe(true);
    expect(r.lines).toHaveLength(0);
    expect(r.missing.some((m) => /will not invent steel/.test(m))).toBe(true);
    expect(r.incomplete).toBe(true);
    expect(r.grand_total).toBeNull();
  });

  it("blank and zero diameters are simply not used", () => {
    const r = calculateReinforcement(makeInput(), rules, FULL_PRICES);
    expect(r.lines.find((l) => l.key === "rebar_20mm")).toBeUndefined();
    expect(r.lines.find((l) => l.key === "rebar_25mm")).toBeUndefined();
    expect(r.missing).toHaveLength(0);
    expect(r.incomplete).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Stock lengths and tonnage
// ─────────────────────────────────────────────

describe("stock lengths and tonnage", () => {
  it("converts cutting length to whole 12 m lengths with visible lap/waste", () => {
    const r = calculateReinforcement(makeInput(), rules, FULL_PRICES);
    const d12 = r.lines.find((l) => l.key === "rebar_12mm");
    // 120 × 1.05 = 126 ÷ 12 = 10.5 → 11 lengths
    expect(d12?.quantity).toBe(11);
    expect(d12?.unit_price).toBe(11500);
    expect(d12?.detail).toMatch(/120 m schedule × 1\.05/);
    const d16 = r.lines.find((l) => l.key === "rebar_16mm");
    // 60 × 1.05 = 63 ÷ 12 = 5.25 → 6 lengths
    expect(d16?.quantity).toBe(6);
  });

  it("tonnage uses true cutting length × BS 4449 kg/m, not purchase length", () => {
    const r = calculateReinforcement(makeInput(), rules, FULL_PRICES);
    // 120 × 0.888 + 60 × 1.578 = 106.56 + 94.68 = 201.24 kg
    expect(r.total_tonnage_kg).toBe(201.2);
    expect(r.steps.some((s) => /0\.888/.test(s.detail))).toBe(true);
  });

  it("exact multiples do not gain an extra length from float dust", () => {
    // 120 m with 0% lap = exactly 10 lengths
    const zero = { ...rules, rebar_lap_waste_pct: 0 };
    const r = calculateReinforcement(
      makeInput({ len_16mm_m: 60 }),
      zero,
      FULL_PRICES,
    );
    expect(r.lines.find((l) => l.key === "rebar_16mm")?.quantity).toBe(5);
    // large: 1,000,000 × 1.05 = 1,050,000 ÷ 12 = 87,500 exactly
    const big = calculateReinforcement(
      makeInput({ len_12mm_m: 1_000_000, len_16mm_m: null }),
      rules,
      FULL_PRICES,
    );
    expect(big.lines.find((l) => l.key === "rebar_12mm")?.quantity).toBe(87500);
  });

  it("binding wire follows the visible per-tonne rule, whole kg", () => {
    const r = calculateReinforcement(makeInput(), rules, FULL_PRICES);
    // 201.24 kg = 0.20124 t × 12 = 2.41 → 3 kg
    expect(r.lines.find((l) => l.key === "binding_wire")?.quantity).toBe(3);
    expect(r.lines.find((l) => l.key === "binding_wire")?.quantity_source).toBe(
      "rule_derived",
    );
  });

  it("no binding wire rule → reported missing, never guessed", () => {
    const bare = { ...rules, binding_wire_kg_per_tonne: null };
    const r = calculateReinforcement(makeInput(), bare, FULL_PRICES);
    expect(r.lines.find((l) => l.key === "binding_wire")).toBeUndefined();
    expect(r.missing.some((m) => /Binding wire/.test(m))).toBe(true);
    expect(r.incomplete).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Prices, labour, determinism
// ─────────────────────────────────────────────

describe("pricing honesty", () => {
  it("unpriced bars keep quantities but null totals", () => {
    const r = calculateReinforcement(makeInput(), rules, {});
    expect(r.lines.every((l) => l.unit_price === null)).toBe(true);
    expect(r.material_subtotal).toBeNull();
    expect(r.priced_subtotal).toBe(0);
    expect(r.lines.find((l) => l.key === "rebar_12mm")?.quantity).toBe(11);
  });

  it("fully priced → complete with grand total", () => {
    const r = calculateReinforcement(makeInput(), rules, FULL_PRICES);
    expect(r.incomplete).toBe(false);
    expect(r.grand_total).toBe(r.material_subtotal);
  });
});

describe("labour", () => {
  it("per-tonne labour uses tonnage from true cutting length", () => {
    const r = calculateReinforcement(
      makeInput({ labour: { mode: "per_tonne", per_tonne_rate: 150000 } }),
      rules,
      FULL_PRICES,
    );
    // 0.20124 t × 150000 = 30186
    expect(r.labour_total).toBe(30186);
  });

  it("missing rate is an error, never guessed", () => {
    const r = calculateReinforcement(
      makeInput({ labour: { mode: "per_tonne", per_tonne_rate: null } }),
      rules,
      FULL_PRICES,
    );
    expect(r.ok).toBe(false);
    expect(r.grand_total).toBeNull();
  });
});

describe("determinism", () => {
  it("identical inputs produce identical outputs", () => {
    const a = calculateReinforcement(makeInput(), rules, FULL_PRICES);
    const b = calculateReinforcement(makeInput(), rules, FULL_PRICES);
    expect(a).toEqual(b);
  });
});
