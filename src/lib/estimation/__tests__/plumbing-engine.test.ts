/**
 * Plumbing engine tests (Tier 2, Engine 2)
 *
 * Pins the honesty contract:
 *  - pipe run lengths never assumed; missing run → unsized line,
 *    named missing input, incomplete estimate
 *  - 0 run = "no pipe of this category" (line omitted), blank ≠ 0
 *  - waste visible in every pipe breakdown
 *  - hot water only when the user provides a run
 *  - fittings are labelled planning allowances
 *  - PRICE NOT CONFIGURED for unpriced materials; totals stay null
 *  - labour separate and never automatic
 *  - deterministic: same inputs, same outputs
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_PLUMBING_RULES,
  parsePlumbingRules,
  calculatePlumbing,
  type PlumbingInput,
  type PlumbingRules,
} from "../plumbing-engine";

const rules: PlumbingRules = {
  ...DEFAULT_PLUMBING_RULES,
  pipe_waste_pct: 10,
  elbow_per_fixture: 3,
  tee_per_fixture: 1,
  reducer_per_fixture: 1,
  union_per_fixture: 1,
  valve_per_tap: 1,
};

function makeInput(overrides: Partial<PlumbingInput> = {}): PlumbingInput {
  return {
    taps: 6,
    wcs: 2,
    showers: 1,
    sinks: 2,
    floor_drains: 2,
    water_storage_tanks: 1,
    pumps: 1,
    cold_run_m: 40,
    hot_run_m: null,
    waste_run_m: 25,
    drainage_run_m: 15,
    labour: { mode: "none" },
    ...overrides,
  };
}

const FULL_PRICES = {
  "plumb-pipe-cold": 800,
  "plumb-pipe-hot": 1200,
  "plumb-pipe-waste": 600,
  "plumb-pipe-drainage": 1500,
  "plumb-elbow": 250,
  "plumb-tee": 300,
  "plumb-reducer": 200,
  "plumb-union": 350,
  "plumb-valve": 1800,
  "plumb-tap": 3500,
  "plumb-wc-connection": 1200,
  "plumb-shower-connection": 2500,
  "plumb-sink-connection": 1500,
  "plumb-floor-drain": 2000,
  "plumb-storage-connection": 3500,
  "plumb-pump-connection": 4000,
};

// ─────────────────────────────────────────────
// Rules parsing
// ─────────────────────────────────────────────

describe("parsePlumbingRules", () => {
  it("defaults waste to zero and allowances to null — nothing silently invented", () => {
    const parsed = parsePlumbingRules([]);
    expect(parsed.pipe_waste_pct).toBe(0);
    expect(parsed.elbow_per_fixture).toBeNull();
    expect(parsed.valve_per_tap).toBeNull();
  });

  it("applies configured rules, ignores inactive and nonsense values", () => {
    const parsed = parsePlumbingRules([
      { rule_key: "pipe_waste_pct", rule_value: { value: 12 } },
      { rule_key: "elbow_per_fixture", rule_value: { value: 4 } },
      {
        rule_key: "elbow_per_fixture",
        rule_value: { value: -1 },
        is_active: false,
      },
      { rule_key: "valve_per_tap", rule_value: { value: "one" } },
    ]);
    expect(parsed.pipe_waste_pct).toBe(12);
    expect(parsed.elbow_per_fixture).toBe(4);
    expect(parsed.valve_per_tap).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────

describe("input validation", () => {
  it("refuses negative and fractional counts with the field named", () => {
    const a = calculatePlumbing(makeInput({ taps: -1 }), rules, FULL_PRICES);
    expect(a.ok).toBe(false);
    expect(a.errors[0]).toMatch(/Taps/i);
    const b = calculatePlumbing(makeInput({ wcs: 1.5 }), rules, FULL_PRICES);
    expect(b.ok).toBe(false);
  });

  it("refuses negative run lengths", () => {
    const r = calculatePlumbing(
      makeInput({ cold_run_m: -5 }),
      rules,
      FULL_PRICES,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/Cold water pipe run/i);
  });
});

// ─────────────────────────────────────────────
// Pipes
// ─────────────────────────────────────────────

describe("pipe categories", () => {
  it("sizes each pipe category from the user's run with visible waste", () => {
    const r = calculatePlumbing(makeInput(), rules, FULL_PRICES);
    const cold = r.lines.find((l) => l.key === "pipe_cold");
    // 40 × 1.10 = 44
    expect(cold?.quantity).toBe(44);
    expect(cold?.unit_price).toBe(800);
    expect(cold?.line_total).toBe(35200);
    expect(cold?.detail).toMatch(/40 m × 1\.10 = 44 m/);

    const waste = r.lines.find((l) => l.key === "pipe_waste");
    // 25 × 1.10 = 27.5 → 28
    expect(waste?.quantity).toBe(28);
    const drain = r.lines.find((l) => l.key === "pipe_drainage");
    // 15 × 1.10 = 16.5 → 17
    expect(drain?.quantity).toBe(17);
  });

  it("hot water appears only when the user provides a run length", () => {
    const without = calculatePlumbing(makeInput(), rules, FULL_PRICES);
    expect(
      without.lines.find((l) => l.key === "pipe_hot")?.quantity_source,
    ).toBe("missing");
    expect(without.missing.some((m) => /Hot water pipe/.test(m))).toBe(true);

    const withHot = calculatePlumbing(
      makeInput({ hot_run_m: 20 }),
      rules,
      FULL_PRICES,
    );
    expect(withHot.lines.find((l) => l.key === "pipe_hot")?.quantity).toBe(22);
  });

  it("zero run means explicitly none — the line is omitted, not marked missing", () => {
    const r = calculatePlumbing(
      makeInput({ drainage_run_m: 0 }),
      rules,
      FULL_PRICES,
    );
    expect(r.lines.find((l) => l.key === "pipe_drainage")).toBeUndefined();
    expect(r.missing.some((m) => /Drainage pipe/.test(m))).toBe(false);
  });

  it("blank run stays unsized and marks the estimate incomplete", () => {
    const r = calculatePlumbing(
      makeInput({ cold_run_m: null }),
      rules,
      FULL_PRICES,
    );
    expect(r.ok).toBe(true);
    const cold = r.lines.find((l) => l.key === "pipe_cold");
    expect(cold?.quantity).toBeNull();
    expect(cold?.line_total).toBeNull();
    expect(r.incomplete).toBe(true);
    expect(r.material_subtotal).toBeNull();
    expect(r.grand_total).toBeNull();
    expect(r.missing[0]).toMatch(/will not assume hidden pipe lengths/i);
  });

  it("decimal runs round up to whole metres only at the end", () => {
    const r = calculatePlumbing(
      makeInput({ cold_run_m: 10.1 }),
      rules,
      FULL_PRICES,
    );
    // 10.1 × 1.1 = 11.11 → 12
    expect(r.lines.find((l) => l.key === "pipe_cold")?.quantity).toBe(12);
  });

  it("extremely small runs round up to 1 m, never zero", () => {
    const r = calculatePlumbing(
      makeInput({ cold_run_m: 0.01 }),
      rules,
      FULL_PRICES,
    );
    expect(r.lines.find((l) => l.key === "pipe_cold")?.quantity).toBe(1);
  });

  it("extremely large runs stay finite", () => {
    const r = calculatePlumbing(
      makeInput({ cold_run_m: 5_000_000 }),
      rules,
      FULL_PRICES,
    );
    const cold = r.lines.find((l) => l.key === "pipe_cold");
    expect(cold?.quantity).toBe(5_500_000);
    expect(Number.isFinite(r.priced_subtotal)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Fittings and fixtures
// ─────────────────────────────────────────────

describe("fittings and fixtures", () => {
  it("fittings follow the labelled planning allowance over fixture connections", () => {
    // fixtures = 6 taps + 2 WC + 1 shower + 2 sinks + 2 drains = 13
    const r = calculatePlumbing(makeInput(), rules, FULL_PRICES);
    expect(r.lines.find((l) => l.key === "elbows")?.quantity).toBe(39);
    expect(r.lines.find((l) => l.key === "elbows")?.label).toMatch(
      /planning allowance/i,
    );
    expect(r.lines.find((l) => l.key === "tees")?.quantity).toBe(13);
    expect(r.lines.find((l) => l.key === "valves")?.quantity).toBe(6);
  });

  it("without an allowance configured the fitting is reported missing, never guessed", () => {
    const bare = { ...rules, elbow_per_fixture: null };
    const r = calculatePlumbing(makeInput(), bare, FULL_PRICES);
    expect(r.lines.find((l) => l.key === "elbows")).toBeUndefined();
    expect(r.missing.some((m) => /Pipe elbows/.test(m))).toBe(true);
  });

  it("connection kits take quantities directly from user counts", () => {
    const r = calculatePlumbing(makeInput(), rules, FULL_PRICES);
    expect(r.lines.find((l) => l.key === "taps")?.quantity).toBe(6);
    expect(r.lines.find((l) => l.key === "wc_connections")?.quantity).toBe(2);
    expect(r.lines.find((l) => l.key === "pump_connections")?.quantity).toBe(1);
    expect(r.lines.find((l) => l.key === "taps")?.quantity_source).toBe(
      "user_provided",
    );
  });

  it("zero-count fixtures are omitted, not zeroed", () => {
    const r = calculatePlumbing(makeInput({ pumps: 0 }), rules, FULL_PRICES);
    expect(r.lines.find((l) => l.key === "pump_connections")).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// Prices and totals
// ─────────────────────────────────────────────

describe("pricing honesty", () => {
  it("unpriced materials show PRICE NOT CONFIGURED and keep totals null", () => {
    const r = calculatePlumbing(makeInput(), rules, {});
    expect(r.lines.length).toBeGreaterThan(0);
    expect(r.lines.every((l) => l.unit_price === null)).toBe(true);
    expect(r.warnings.some((w) => /PRICE NOT CONFIGURED/.test(w))).toBe(true);
    expect(r.material_subtotal).toBeNull();
    expect(r.priced_subtotal).toBe(0);
    // the takeoff is still valid without prices
    expect(r.lines.find((l) => l.key === "pipe_cold")?.quantity).toBe(44);
  });

  it("partially priced: priced subtotal counts only priced lines", () => {
    const partial = { ...FULL_PRICES };
    delete (partial as Record<string, number | undefined>)["plumb-pipe-cold"];
    const r = calculatePlumbing(makeInput(), rules, partial);
    expect(r.material_subtotal).toBeNull();
    const expected = r.lines
      .filter((l) => l.line_total !== null)
      .reduce((s, l) => s + (l.line_total ?? 0), 0);
    expect(r.priced_subtotal).toBe(Math.round(expected * 100) / 100);
  });
});

// ─────────────────────────────────────────────
// Labour
// ─────────────────────────────────────────────

describe("labour", () => {
  it("mode none excludes labour explicitly", () => {
    const r = calculatePlumbing(makeInput(), rules, FULL_PRICES);
    expect(r.labour_total).toBe(0);
    expect(r.steps.some((s) => /Excluded — not added/.test(s.detail))).toBe(
      true,
    );
  });

  it("per-fixture labour uses the user's rate", () => {
    const r = calculatePlumbing(
      makeInput({ labour: { mode: "per_fixture", per_fixture_rate: 1000 } }),
      rules,
      FULL_PRICES,
    );
    // 13 fixtures + 1 tank + 1 pump = 15 × 1000
    expect(r.labour_total).toBe(15000);
  });

  it("missing labour rate is an error, never a guess", () => {
    const r = calculatePlumbing(
      makeInput({ labour: { mode: "per_fixture", per_fixture_rate: null } }),
      rules,
      FULL_PRICES,
    );
    expect(r.ok).toBe(false);
    expect(r.grand_total).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Determinism and completeness
// ─────────────────────────────────────────────

describe("determinism and completeness", () => {
  it("identical inputs produce identical outputs", () => {
    const a = calculatePlumbing(makeInput(), rules, FULL_PRICES);
    const b = calculatePlumbing(makeInput(), rules, FULL_PRICES);
    expect(a).toEqual(b);
  });

  it("a fully sized and priced estimate is complete with a grand total", () => {
    const r = calculatePlumbing(
      makeInput({ hot_run_m: 20 }),
      rules,
      FULL_PRICES,
    );
    expect(r.incomplete).toBe(false);
    expect(r.material_subtotal).not.toBeNull();
    expect(r.grand_total).toBe(r.material_subtotal);
  });

  it("always carries the not-a-design warning", () => {
    const r = calculatePlumbing(makeInput(), rules, FULL_PRICES);
    expect(
      r.warnings.some((w) => /not professional plumbing design/.test(w)),
    ).toBe(true);
  });
});
