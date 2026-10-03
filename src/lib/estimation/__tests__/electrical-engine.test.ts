/**
 * Electrical Wiring engine tests (Tier 2, Engine 1)
 *
 * Pins the honesty contract:
 *  - cable categories computed separately, never merged
 *  - cable length NEVER invented — missing run length leaves the
 *    line unsized, names the missing input, marks incomplete
 *  - waste visible in every cable breakdown (base, waste, final)
 *  - PRICE NOT CONFIGURED for unpriced materials; totals stay null
 *  - circuit/breaker counting from planning rules, with the
 *    estimation-not-design warning always present
 *  - labour separate, never automatic, never mixed into materials
 *  - rounding: metres round UP to whole metres, money only at the end
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_ELECTRICAL_RULES,
  parseElectricalRules,
  calculateElectrical,
  type ElectricalInput,
  type ElectricalRules,
} from "../electrical-engine";

const rules: ElectricalRules = {
  ...DEFAULT_ELECTRICAL_RULES,
  lighting_points_per_circuit: 10,
  socket_points_per_circuit: 8,
  dedicated_points_per_circuit: 1,
  cable_waste_pct: 10,
  conduit_waste_pct: 5,
  conduit_m_per_lighting_point: 3,
  conduit_m_per_socket_point: 3,
  junction_boxes_per_lighting_point: 1,
};

function makeInput(overrides: Partial<ElectricalInput> = {}): ElectricalInput {
  return {
    building_type: "2-bedroom flat",
    lighting_points: 20,
    socket_points: 16,
    dedicated_points: 2,
    switches: 18,
    distribution_boards: 1,
    avg_run_lighting_m: 12,
    avg_run_socket_m: 15,
    avg_run_dedicated_m: 20,
    avg_run_earth_m: 10,
    avg_run_feeder_m: 8,
    labour: { mode: "none" },
    ...overrides,
  };
}

const FULL_PRICES = {
  "elec-cable-lighting": 350,
  "elec-cable-socket": 450,
  "elec-cable-dedicated": 900,
  "elec-cable-earth": 300,
  "elec-cable-feeder": 2500,
  "elec-conduit": 250,
  "elec-junction-box": 150,
  "elec-breaker": 1200,
  "elec-switch-plate": 800,
  "elec-socket-outlet": 950,
  "elec-distribution-board": 25000,
};

const NO_PRICES: Record<string, number | null> = {};

// ─────────────────────────────────────────────
// Rules parsing
// ─────────────────────────────────────────────

describe("parseElectricalRules", () => {
  it("defaults waste to zero and allowances to null — nothing silently invented", () => {
    const parsed = parseElectricalRules([]);
    expect(parsed.cable_waste_pct).toBe(0);
    expect(parsed.conduit_waste_pct).toBe(0);
    expect(parsed.conduit_m_per_lighting_point).toBeNull();
    expect(parsed.junction_boxes_per_lighting_point).toBeNull();
  });

  it("applies configured rules and ignores inactive ones", () => {
    const parsed = parseElectricalRules([
      { rule_key: "lighting_points_per_circuit", rule_value: { value: 12 } },
      {
        rule_key: "cable_waste_pct",
        rule_value: { value: 15 },
        is_active: false,
      },
    ]);
    expect(parsed.lighting_points_per_circuit).toBe(12);
    expect(parsed.cable_waste_pct).toBe(0); // inactive → default, not applied
  });

  it("refuses nonsense values", () => {
    const parsed = parseElectricalRules([
      { rule_key: "lighting_points_per_circuit", rule_value: { value: 0 } },
      { rule_key: "lighting_points_per_circuit", rule_value: { value: -3 } },
      { rule_key: "cable_waste_pct", rule_value: { value: 200 } },
      {
        rule_key: "conduit_m_per_lighting_point",
        rule_value: { value: "lots" },
      },
    ]);
    expect(parsed.lighting_points_per_circuit).toBe(10);
    expect(parsed.cable_waste_pct).toBe(0);
    expect(parsed.conduit_m_per_lighting_point).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────

describe("input validation", () => {
  it("refuses negative counts with the field named", () => {
    const result = calculateElectrical(
      makeInput({ lighting_points: -2 }),
      rules,
      FULL_PRICES,
    );
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/Lighting points/i);
  });

  it("refuses fractional counts", () => {
    const result = calculateElectrical(
      makeInput({ socket_points: 2.5 }),
      rules,
      FULL_PRICES,
    );
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/whole number/i);
  });

  it("refuses non-finite and garbage counts", () => {
    const result = calculateElectrical(
      makeInput({ switches: Number.NaN }),
      rules,
      FULL_PRICES,
    );
    expect(result.ok).toBe(false);
  });

  it("refuses zero or negative average run lengths", () => {
    const result = calculateElectrical(
      makeInput({ avg_run_lighting_m: 0 }),
      rules,
      FULL_PRICES,
    );
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/Average lighting cable run/i);
  });

  it("all-zero counts produce an empty, honest result", () => {
    const result = calculateElectrical(
      makeInput({
        lighting_points: 0,
        socket_points: 0,
        dedicated_points: 0,
        switches: 0,
        distribution_boards: 0,
        avg_run_lighting_m: null,
        avg_run_socket_m: null,
        avg_run_dedicated_m: null,
        avg_run_earth_m: null,
        avg_run_feeder_m: null,
      }),
      rules,
      FULL_PRICES,
    );
    expect(result.ok).toBe(true);
    expect(result.lines).toHaveLength(0);
    expect(result.material_subtotal).toBe(0); // nothing to buy — a complete, empty estimate
    expect(result.incomplete).toBe(false);
    expect(result.grand_total).toBe(0);
  });
});

// ─────────────────────────────────────────────
// Cable categories — separate, honest, never invented
// ─────────────────────────────────────────────

describe("cable categories", () => {
  it("computes each cable category separately with waste visible", () => {
    const result = calculateElectrical(makeInput(), rules, FULL_PRICES);
    expect(result.ok).toBe(true);
    const lighting = result.lines.find((l) => l.key === "cable_lighting");
    // 20 × 12 = 240; +10% = 264 → 264 m exactly (whole metres, up)
    expect(lighting?.quantity).toBe(264);
    expect(lighting?.unit_price).toBe(350);
    expect(lighting?.line_total).toBe(92400);
    expect(lighting?.detail).toMatch(/20 × 12 m × 1\.10 = 264 m/);
    expect(lighting?.detail).toMatch(/waste \+/i);

    const socket = result.lines.find((l) => l.key === "cable_socket");
    // 16 × 15 = 240; ×1.10 = 264
    expect(socket?.quantity).toBe(264);

    const dedicated = result.lines.find((l) => l.key === "cable_dedicated");
    // 2 × 20 = 40; ×1.10 = 44
    expect(dedicated?.quantity).toBe(44);

    const earth = result.lines.find((l) => l.key === "cable_earth");
    // 16 socket points × 10 = 160; ×1.10 = 176
    expect(earth?.quantity).toBe(176);

    const feeder = result.lines.find((l) => l.key === "cable_feeder");
    // 1 DB × 8 = 8; ×1.10 = 8.8 → 9 m (whole metres, up)
    expect(feeder?.quantity).toBe(9);
  });

  it("five cable categories are five separate lines, never merged", () => {
    const result = calculateElectrical(makeInput(), rules, FULL_PRICES);
    const cableKeys = result.lines.filter((l) => l.key.startsWith("cable_"));
    expect(cableKeys).toHaveLength(5);
    expect(new Set(cableKeys.map((l) => l.material_slug)).size).toBe(5);
  });

  it("decimal run lengths are honoured and rounded up only at the end", () => {
    const result = calculateElectrical(
      makeInput({ lighting_points: 3, avg_run_lighting_m: 2.35 }),
      rules,
      FULL_PRICES,
    );
    const lighting = result.lines.find((l) => l.key === "cable_lighting");
    // 3 × 2.35 = 7.05; ×1.10 = 7.755 → 8 m
    expect(lighting?.quantity).toBe(8);
  });

  it("missing run length leaves the line unsized and names exactly what is missing", () => {
    const result = calculateElectrical(
      makeInput({ avg_run_lighting_m: null }),
      rules,
      FULL_PRICES,
    );
    expect(result.ok).toBe(true);
    const lighting = result.lines.find((l) => l.key === "cable_lighting");
    expect(lighting?.quantity).toBeNull();
    expect(lighting?.line_total).toBeNull();
    expect(lighting?.quantity_source).toBe("missing");
    expect(result.incomplete).toBe(true);
    expect(result.missing[0]).toMatch(/Lighting circuit cable/);
    expect(result.missing[0]).toMatch(/will not invent cable length/i);
    expect(result.material_subtotal).toBeNull();
    expect(result.grand_total).toBeNull();
  });

  it("zero-run categories are omitted, not zeroed", () => {
    const result = calculateElectrical(
      makeInput({ dedicated_points: 0 }),
      rules,
      FULL_PRICES,
    );
    expect(
      result.lines.find((l) => l.key === "cable_dedicated"),
    ).toBeUndefined();
  });

  it("extremely large values stay finite and honest", () => {
    const result = calculateElectrical(
      makeInput({ lighting_points: 1_000_000, avg_run_lighting_m: 50 }),
      rules,
      FULL_PRICES,
    );
    const lighting = result.lines.find((l) => l.key === "cable_lighting");
    expect(lighting?.quantity).toBe(55_000_000);
    expect(Number.isFinite(result.priced_subtotal)).toBe(true);
  });

  it("extremely small run lengths round up to 1 metre, never to zero", () => {
    const result = calculateElectrical(
      makeInput({ lighting_points: 1, avg_run_lighting_m: 0.05 }),
      rules,
      FULL_PRICES,
    );
    const lighting = result.lines.find((l) => l.key === "cable_lighting");
    expect(lighting?.quantity).toBe(1);
  });
});

// ─────────────────────────────────────────────
// Circuits and breakers — planning, not design
// ─────────────────────────────────────────────

describe("circuit counting", () => {
  it("groups points into circuits per the configured rules", () => {
    const result = calculateElectrical(makeInput(), rules, FULL_PRICES);
    // 20 lighting / 10 = 2; 16 sockets / 8 = 2; 2 dedicated / 1 = 2
    expect(result.circuit_summary).toEqual({
      lighting_circuits: 2,
      socket_circuits: 2,
      dedicated_circuits: 2,
      total_circuits: 6,
      db_ways_guidance: 6,
    });
    const breakers = result.lines.find((l) => l.key === "breakers");
    expect(breakers?.quantity).toBe(6);
    expect(breakers?.detail).toMatch(/counts circuits only/i);
  });

  it("rounds circuits UP — 11 lighting points over a 10-point rule is 2 circuits", () => {
    const result = calculateElectrical(
      makeInput({ lighting_points: 11 }),
      rules,
      FULL_PRICES,
    );
    expect(result.circuit_summary?.lighting_circuits).toBe(2);
  });

  it("always carries the estimation-not-design warning", () => {
    const result = calculateElectrical(makeInput(), rules, FULL_PRICES);
    expect(
      result.warnings.some((w) => /NOT professional electrical design/.test(w)),
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Conduit, junction boxes, accessories
// ─────────────────────────────────────────────

describe("rule-derived lines", () => {
  it("computes conduit from the labelled planning allowance", () => {
    const result = calculateElectrical(makeInput(), rules, FULL_PRICES);
    const conduit = result.lines.find((l) => l.key === "conduit");
    // 20×3 + 16×3 = 108; ×1.05 = 113.4 → 114 m
    expect(conduit?.quantity).toBe(114);
    expect(conduit?.quantity_source).toBe("rule_derived");
    expect(conduit?.label).toMatch(/planning allowance/i);
    expect(
      result.steps.some((s) => /not a site measurement/.test(s.detail)),
    ).toBe(true);
  });

  it("computes junction boxes from the rule and rounds up pieces", () => {
    const result = calculateElectrical(
      makeInput({ lighting_points: 7, junction_boxes: undefined } as never),
      rules,
      FULL_PRICES,
    );
    const jb = result.lines.find((l) => l.key === "junction_boxes");
    expect(jb?.quantity).toBe(7);
  });

  it("without a conduit allowance configured, conduit is reported missing — never guessed", () => {
    const bareRules = {
      ...rules,
      conduit_m_per_lighting_point: null,
      conduit_m_per_socket_point: null,
    };
    const result = calculateElectrical(makeInput(), bareRules, FULL_PRICES);
    expect(result.lines.find((l) => l.key === "conduit")).toBeUndefined();
    expect(result.missing.some((m) => /Conduit/.test(m))).toBe(true);
  });

  it("accessories take quantities directly from user counts", () => {
    const result = calculateElectrical(makeInput(), rules, FULL_PRICES);
    expect(result.lines.find((l) => l.key === "switch_plates")?.quantity).toBe(
      18,
    );
    expect(result.lines.find((l) => l.key === "socket_outlets")?.quantity).toBe(
      16,
    );
    expect(
      result.lines.find((l) => l.key === "distribution_boards")?.quantity,
    ).toBe(1);
    expect(
      result.lines.find((l) => l.key === "switch_plates")?.quantity_source,
    ).toBe("user_provided");
  });
});

// ─────────────────────────────────────────────
// Prices — never fabricated
// ─────────────────────────────────────────────

describe("pricing honesty", () => {
  it("unpriced materials show PRICE NOT CONFIGURED and keep the total null", () => {
    const result = calculateElectrical(makeInput(), rules, NO_PRICES);
    expect(result.lines.length).toBeGreaterThan(0);
    expect(result.lines.every((l) => l.unit_price === null)).toBe(true);
    expect(result.warnings.some((w) => /PRICE NOT CONFIGURED/.test(w))).toBe(
      true,
    );
    expect(result.material_subtotal).toBeNull();
    expect(result.grand_total).toBeNull();
    expect(result.priced_subtotal).toBe(0);
    // quantities still shown — the takeoff is valid without prices
    expect(result.lines.find((l) => l.key === "cable_lighting")?.quantity).toBe(
      264,
    );
  });

  it("partially priced: priced subtotal counts only priced lines", () => {
    const partial = { ...FULL_PRICES };
    delete (partial as Record<string, number | undefined>)["elec-cable-socket"];
    const result = calculateElectrical(makeInput(), rules, partial);
    expect(result.material_subtotal).toBeNull(); // one line unpriced
    // priced subtotal = sum of priced lines only
    const expected = result.lines
      .filter((l) => l.line_total !== null)
      .reduce((s, l) => s + (l.line_total ?? 0), 0);
    expect(result.priced_subtotal).toBe(Math.round(expected * 100) / 100);
  });

  it("a price change flows through the line total deterministically", () => {
    const a = calculateElectrical(makeInput(), rules, {
      ...FULL_PRICES,
      "elec-breaker": 1000,
    });
    const b = calculateElectrical(makeInput(), rules, {
      ...FULL_PRICES,
      "elec-breaker": 1500,
    });
    expect(a.lines.find((l) => l.key === "breakers")?.line_total).toBe(6000);
    expect(b.lines.find((l) => l.key === "breakers")?.line_total).toBe(9000);
  });
});

// ─────────────────────────────────────────────
// Labour — separate, never automatic
// ─────────────────────────────────────────────

describe("labour", () => {
  it("labour mode none excludes labour from the total explicitly", () => {
    const result = calculateElectrical(
      makeInput({ labour: { mode: "none" } }),
      rules,
      FULL_PRICES,
    );
    expect(result.labour_total).toBe(0);
    expect(
      result.steps.some((s) => /Excluded — not added/.test(s.detail)),
    ).toBe(true);
  });

  it("per-point labour uses the user's rate over total points", () => {
    const result = calculateElectrical(
      makeInput({ labour: { mode: "per_point", per_point_rate: 500 } }),
      rules,
      FULL_PRICES,
    );
    // 20 + 16 + 2 = 38 points × 500
    expect(result.labour_total).toBe(19000);
    const matSub = result.material_subtotal ?? 0;
    expect(result.grand_total).toBe(Math.round((matSub + 19000) * 100) / 100);
  });

  it("lump sum labour is passed through unchanged", () => {
    const result = calculateElectrical(
      makeInput({ labour: { mode: "lump_sum", lump_sum: 150000 } }),
      rules,
      FULL_PRICES,
    );
    expect(result.labour_total).toBe(150000);
  });

  it("per-point mode without a rate is an error, never a guess", () => {
    const result = calculateElectrical(
      makeInput({ labour: { mode: "per_point", per_point_rate: null } }),
      rules,
      FULL_PRICES,
    );
    expect(result.ok).toBe(false);
    expect(result.grand_total).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Breakdown transparency
// ─────────────────────────────────────────────

describe("calculation breakdown", () => {
  it("every computed line exposes how its quantity was produced", () => {
    const result = calculateElectrical(makeInput(), rules, FULL_PRICES);
    for (const l of result.lines) {
      expect(l.detail.length).toBeGreaterThan(0);
      if (l.quantity_source === "user_derived") {
        expect(l.detail).toMatch(/× \d+(\.\d+)? m × 1\.\d+/);
      }
    }
    // steps show the circuit derivation and the waste on cables
    expect(result.steps.some((s) => s.label.includes("Circuits"))).toBe(true);
    expect(result.steps.some((s) => /waste 10%/.test(s.detail))).toBe(true);
  });

  it("a full priced estimate produces a complete grand total", () => {
    const result = calculateElectrical(makeInput(), rules, FULL_PRICES);
    expect(result.incomplete).toBe(false);
    expect(result.material_subtotal).not.toBeNull();
    expect(result.grand_total).toBe(
      Math.round(((result.material_subtotal ?? 0) + 0) * 100) / 100,
    );
  });
});
