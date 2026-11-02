/**
 * Foundation engine tests (Tier 2, Engine 6)
 *
 * Pins the honesty contract:
 *  - volumes/areas never assumed; missing → named missing input,
 *    incomplete estimate, no grand total
 *  - 0 = none (line omitted); blank ≠ 0
 *  - mix math visible: dry factor 1.54, bag volume 0.0347 m³,
 *    the configured ratio, waste shown separately
 *  - missing mix ratio or blocks rule → reported, never guessed
 *  - PRICE NOT CONFIGURED; totals null; labour separate
 *  - deterministic; exact 1 m³ sanity-checked against published
 *    1:2:4 values (≈7 bags, 0.44 sand, 0.88 granite)
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_FOUNDATION_RULES,
  parseFoundationRules,
  calculateFoundation,
  type FoundationInput,
  type FoundationRules,
} from "../foundation-engine";

const rules: FoundationRules = {
  ...DEFAULT_FOUNDATION_RULES,
  mix_ratio: { cement: 1, sand: 2, granite: 4 },
  concrete_waste_pct: 5,
  blocks_per_m2: 10,
};

function makeInput(overrides: Partial<FoundationInput> = {}): FoundationInput {
  return {
    concrete_volume_m3: 10,
    block_wall_area_m2: 45,
    hardcore_volume_m3: 12,
    formwork_area_m2: 20,
    labour: { mode: "none" },
    ...overrides,
  };
}

const FULL_PRICES = {
  "cement-per-bag": 9500,
  "sand-per-m3": 8500,
  "granite-per-m3": 18000,
  "hardcore-per-m3": 7500,
  "block-per-piece": 1100,
  "formwork-per-m2": 2500,
};

// ─────────────────────────────────────────────
// Rules parsing
// ─────────────────────────────────────────────

describe("parseFoundationRules", () => {
  it("defaults to nothing silently invented", () => {
    const parsed = parseFoundationRules([]);
    expect(parsed.mix_ratio).toBeNull();
    expect(parsed.blocks_per_m2).toBeNull();
    expect(parsed.concrete_waste_pct).toBe(0);
  });

  it("reads the mix ratio object, ignoring nonsense", () => {
    const parsed = parseFoundationRules([
      {
        rule_key: "concrete_mix_ratio",
        rule_value: { value: { cement: 1, sand: 2, granite: 4 } },
      },
      { rule_key: "concrete_waste_pct", rule_value: { value: 5 } },
      { rule_key: "blocks_per_m2", rule_value: { value: 10 } },
      { rule_key: "blocks_per_m2", rule_value: { value: 0 }, is_active: false },
    ]);
    expect(parsed.mix_ratio).toEqual({ cement: 1, sand: 2, granite: 4 });
    expect(parsed.concrete_waste_pct).toBe(5);
    expect(parsed.blocks_per_m2).toBe(10);
  });

  it("rejects a broken ratio rather than guessing", () => {
    const parsed = parseFoundationRules([
      {
        rule_key: "concrete_mix_ratio",
        rule_value: { value: { cement: 1, sand: 2 } },
      },
    ]);
    expect(parsed.mix_ratio).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────

describe("input validation", () => {
  it("refuses negative volumes with the field named", () => {
    const r = calculateFoundation(
      makeInput({ hardcore_volume_m3: -2 }),
      rules,
      FULL_PRICES,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/Hardcore fill volume/i);
  });
});

// ─────────────────────────────────────────────
// Concrete mix math
// ─────────────────────────────────────────────

describe("concrete mix math", () => {
  it("1 m³ of 1:2:4 matches published values: ≈7 bags, 0.44 sand, 0.88 granite", () => {
    const zeroWaste = { ...rules, concrete_waste_pct: 0 };
    const r = calculateFoundation(
      makeInput({
        concrete_volume_m3: 1,
        block_wall_area_m2: 0,
        hardcore_volume_m3: 0,
        formwork_area_m2: 0,
      }),
      zeroWaste,
      FULL_PRICES,
    );
    // dry 1.54; cement 0.22 m³ ÷ 0.0347 = 6.34 → 7 bags
    expect(r.lines.find((l) => l.key === "cement")?.quantity).toBe(7);
    // sand 0.44 m³
    expect(r.lines.find((l) => l.key === "sand")?.quantity).toBe(1);
    // granite 0.88 m³
    expect(r.lines.find((l) => l.key === "granite")?.quantity).toBe(1);
    expect(r.steps.some((s) => /× 1\.54 dry factor/.test(s.detail))).toBe(true);
    expect(r.steps.some((s) => /0\.0347 m³\/bag/.test(s.detail))).toBe(true);
  });

  it("10 m³ with 5% waste: every constant visible", () => {
    const r = calculateFoundation(
      makeInput({
        block_wall_area_m2: 0,
        hardcore_volume_m3: 0,
        formwork_area_m2: 0,
      }),
      rules,
      FULL_PRICES,
    );
    // dry = 10 × 1.05 × 1.54 = 16.17; cement = 2.31 ÷ 0.0347 = 66.57 → 67
    expect(r.lines.find((l) => l.key === "cement")?.quantity).toBe(67);
    // sand = 2/7 × 16.17 = 4.62 → 5
    expect(r.lines.find((l) => l.key === "sand")?.quantity).toBe(5);
    // granite = 4/7 × 16.17 = 9.24 → 10
    expect(r.lines.find((l) => l.key === "granite")?.quantity).toBe(10);
    expect(
      r.steps.some((s) => /10 m³ wet × 1\.05 \(waste 5%\)/.test(s.detail)),
    ).toBe(true);
  });

  it("a different configured ratio changes the split honestly", () => {
    const r12 = { ...rules, mix_ratio: { cement: 1, sand: 2, granite: 3 } };
    const r = calculateFoundation(
      makeInput({
        block_wall_area_m2: 0,
        hardcore_volume_m3: 0,
        formwork_area_m2: 0,
      }),
      r12,
      FULL_PRICES,
    );
    // dry 16.17; cement = 2.695 ÷ 0.0347 = 77.66 → 78
    expect(r.lines.find((l) => l.key === "cement")?.quantity).toBe(78);
    // granite = 3/6 × 16.17 = 8.085 → 9
    expect(r.lines.find((l) => l.key === "granite")?.quantity).toBe(9);
  });

  it("no mix ratio → concrete materials reported missing, never guessed", () => {
    const bare = { ...rules, mix_ratio: null };
    const r = calculateFoundation(makeInput(), bare, FULL_PRICES);
    expect(r.lines.find((l) => l.key === "cement")).toBeUndefined();
    expect(r.missing.some((m) => /mix ratio configured/.test(m))).toBe(true);
    expect(r.incomplete).toBe(true);
    expect(r.grand_total).toBeNull();
  });

  it("0 concrete volume omits the mix lines; blank is a question", () => {
    const zero = calculateFoundation(
      makeInput({ concrete_volume_m3: 0 }),
      rules,
      FULL_PRICES,
    );
    expect(zero.lines.find((l) => l.key === "cement")).toBeUndefined();

    const blank = calculateFoundation(
      makeInput({ concrete_volume_m3: null }),
      rules,
      FULL_PRICES,
    );
    expect(blank.missing.some((m) => /Concrete volume/.test(m))).toBe(true);
    expect(blank.incomplete).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Blocks, hardcore, formwork
// ─────────────────────────────────────────────

describe("blocks, hardcore and formwork", () => {
  it("blocks follow the visible blocks-per-m² rule", () => {
    const r = calculateFoundation(
      makeInput({
        concrete_volume_m3: 0,
        hardcore_volume_m3: 0,
        formwork_area_m2: 0,
      }),
      rules,
      FULL_PRICES,
    );
    const blocks = r.lines.find((l) => l.key === "blocks");
    // 45 × 10 = 450
    expect(blocks?.quantity).toBe(450);
    expect(blocks?.line_total).toBe(495000);
  });

  it("no blocks rule → reported missing, never guessed", () => {
    const bare = { ...rules, blocks_per_m2: null };
    const r = calculateFoundation(makeInput(), bare, FULL_PRICES);
    expect(r.lines.find((l) => l.key === "blocks")).toBeUndefined();
    expect(r.missing.some((m) => /blocks-per-m² rule configured/.test(m))).toBe(
      true,
    );
  });

  it("hardcore and formwork take user quantities, whole units up", () => {
    const r = calculateFoundation(
      makeInput({
        concrete_volume_m3: 0,
        block_wall_area_m2: 0,
        hardcore_volume_m3: 12.3,
        formwork_area_m2: 20.1,
      }),
      rules,
      FULL_PRICES,
    );
    expect(r.lines.find((l) => l.key === "hardcore")?.quantity).toBe(13);
    expect(r.lines.find((l) => l.key === "formwork")?.quantity).toBe(21);
  });

  it("formwork blank asks a question; formwork 0 pours against soil", () => {
    const blank = calculateFoundation(
      makeInput({ formwork_area_m2: null }),
      rules,
      FULL_PRICES,
    );
    expect(blank.missing.some((m) => /Formwork/.test(m))).toBe(true);
    const zero = calculateFoundation(
      makeInput({ formwork_area_m2: 0 }),
      rules,
      FULL_PRICES,
    );
    expect(zero.lines.find((l) => l.key === "formwork")).toBeUndefined();
    expect(zero.missing.some((m) => /Formwork/.test(m))).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Prices, labour, determinism
// ─────────────────────────────────────────────

describe("pricing honesty", () => {
  it("unpriced materials keep quantities but null totals", () => {
    const r = calculateFoundation(makeInput(), rules, {});
    expect(r.lines.every((l) => l.unit_price === null)).toBe(true);
    expect(r.material_subtotal).toBeNull();
    expect(r.priced_subtotal).toBe(0);
    expect(r.lines.find((l) => l.key === "cement")?.quantity).toBe(67);
  });

  it("fully priced and sized → complete with grand total", () => {
    const r = calculateFoundation(makeInput(), rules, FULL_PRICES);
    expect(r.incomplete).toBe(false);
    expect(r.grand_total).toBe(r.material_subtotal);
  });
});

describe("labour", () => {
  it("per-m³ labour on the concrete volume", () => {
    const r = calculateFoundation(
      makeInput({ labour: { mode: "per_m3", per_m3_rate: 25000 } }),
      rules,
      FULL_PRICES,
    );
    expect(r.labour_total).toBe(250000);
  });

  it("missing rate is an error, never guessed", () => {
    const r = calculateFoundation(
      makeInput({ labour: { mode: "per_m3", per_m3_rate: null } }),
      rules,
      FULL_PRICES,
    );
    expect(r.ok).toBe(false);
    expect(r.grand_total).toBeNull();
  });
});

describe("determinism", () => {
  it("identical inputs produce identical outputs", () => {
    const a = calculateFoundation(makeInput(), rules, FULL_PRICES);
    const b = calculateFoundation(makeInput(), rules, FULL_PRICES);
    expect(a).toEqual(b);
  });
});
