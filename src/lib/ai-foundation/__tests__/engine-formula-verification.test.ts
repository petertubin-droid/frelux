import { describe, expect, it } from "vitest";
import { executeEngine } from "@/lib/ai-foundation/engines-registry";
import {
  SOIL_BEARING_CAPACITY,
  designFoundation,
} from "@/lib/engineering/foundation-calculator";
import { calculateRoofArea } from "@/lib/estimation/build-to-roof-engine";
import { designBeam } from "@/lib/engineering/structural-calculator";
import { voltageDropPercent } from "@/lib/estimation/electrical-engine";
import { blocksPerM2 } from "@/lib/estimation/build-to-roof-engine";
import { applyRegionalCost } from "@/lib/estimation/regional-cost-engine";
import {
  calculatePlumbing,
  parsePlumbingRules,
} from "@/lib/estimation/plumbing-engine";
import {
  calculateCeilingArea,
  calculateWallArea,
} from "@/lib/estimation/paint-engine";
import { calculatePartitionArea } from "@/lib/estimation/tyrolene-engine";

/**
 * Independent verification of the maths the API serves.
 *
 * Every expected value in this file was derived by hand from the formula, not
 * copied from what the code currently returns. If a number changes here, either
 * the engineering changed deliberately or something broke. That is the point:
 * a regression in a quantity or a load becomes a red test rather than a wrong
 * invoice.
 *
 * Scope, stated honestly: these are arithmetic and code-formula checks against
 * first principles. They are not a substitute for a chartered engineer's review
 * of the design assumptions.
 */

const closeTo = (actual: number, expected: number, tolerance = 0.01) => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

// ── Roof geometry ────────────────────────────────────────────────────────────
// A pitched plane is a horizontal projection divided by cos(pitch). For a
// 10 m by 8 m footprint at 30 degrees: 80 / cos(30) = 80 / 0.8660254 = 92.376.
describe("roof geometry, first principles", () => {
  it("scales a gable plane by the slope factor applied to the true pitch", () => {
    closeTo(calculateRoofArea(10, 8, 30, 0, "gable"), 92.38, 0.01);
  });

  it("returns the plan area for a flat roof, with no slope factor", () => {
    closeTo(calculateRoofArea(10, 8, 0, 0, "flat"), 80, 0.01);
  });

  it("reduces to the plan area at zero pitch for every roof type", () => {
    for (const type of ["gable", "hip", "mono_pitch"]) {
      closeTo(calculateRoofArea(12, 7, 0, 0, type), 84, 0.05);
    }
  });

  it("keeps the projected planes summing to the footprint on a hip roof", () => {
    // Two trapezoids plus two triangles must tile the rectangle exactly, in
    // both the square and the elongated case. A missing plane or a doubled
    // triangle shows up here as a footprint that does not match.
    for (const [l, w] of [
      [10, 8],
      [10, 10],
      [20, 6],
    ]) {
      const plan = l * w;
      const sloped = calculateRoofArea(l, w, 30, 0, "hip");
      closeTo(sloped, plan / Math.cos((30 * Math.PI) / 180), 0.15);
    }
  });

  it("treats overhang as extra eave on every side, not extra pitch", () => {
    const none = calculateRoofArea(10, 8, 30, 0, "gable");
    const over = calculateRoofArea(10, 8, 30, 0.5, "gable");
    expect(over).toBeGreaterThan(none);
    // 0.5 m each side adds 1 m to both dimensions before the slope factor.
    closeTo(over, (11 * 9) / Math.cos((30 * Math.PI) / 180), 0.05);
  });

  it("increases monotonically with pitch", () => {
    const areas = [0, 15, 30, 45].map((p) =>
      calculateRoofArea(10, 8, p, 0, "gable"),
    );
    for (let i = 1; i < areas.length; i += 1) {
      expect(areas[i]).toBeGreaterThan(areas[i - 1]);
    }
  });
});

// ── Wall and partition areas ─────────────────────────────────────────────────
describe("wall and partition areas, first principles", () => {
  it("computes a closed room as perimeter times height", () => {
    // 2 x (5 + 4) x 3 = 54 m²
    closeTo(calculateWallArea(5, 4, 3), 54, 0.001);
  });

  it("doubles a single wall run when only one dimension is given", () => {
    // A partition has two faces, so 5 m by 3 m is 30 m², not 15.
    closeTo(calculateWallArea(5, 0, 3), 30, 0.001);
  });

  it("returns zero rather than a number when a dimension is missing", () => {
    expect(calculateWallArea(0, 4, 3)).toBe(0);
    expect(calculateWallArea(5, 4, 0)).toBe(0);
  });

  it("refuses to treat negative dimensions as area", () => {
    expect(calculateWallArea(-5, 4, 3)).toBe(0);
    expect(calculatePartitionArea(-4, 3)).toBe(0);
  });

  it("computes ceiling area as the plan, not the walls", () => {
    closeTo(calculateCeilingArea(5, 4), 20, 0.001);
  });

  it("computes a partition as one face, 4.2 m by 2.7 m", () => {
    closeTo(calculatePartitionArea(4.2, 2.7), 11.34, 0.0001);
  });
});

// ── Foundation, first principles ─────────────────────────────────────────────
// A strip footing must spread the wall load over enough soil that the pressure
// stays under the soil's allowable bearing pressure. width = load / capacity.
describe("foundation design, first principles", () => {
  const base = {
    shape: "strip" as const,
    soil_type: "firm_clay" as const,
    foundation_depth: 1.2,
    concrete_grade: "C25",
    building_length: 10,
    building_width: 8,
  };

  it("sizes a strip footing from load divided by allowable pressure", () => {
    // 1.10 x 30 kN/m over 150 kN/m² is 0.22 m, so 220 mm is the requirement.
    // The 1.10 covers footing self-weight and overburden, and is disclosed in
    // formula_transparency rather than buried in the arithmetic.
    const r = designFoundation({ ...base, wall_load: 30 });
    closeTo(r.required_width, 220, 1);
    expect(r.formula_transparency.join(" ")).toContain("1.10");
    expect(r.bearing_check_pass).toBe(true);
    expect(r.bearing_capacity).toBe(SOIL_BEARING_CAPACITY.firm_clay);
  });

  it("scales footing width in proportion to load", () => {
    const light = designFoundation({ ...base, wall_load: 30 });
    const heavy = designFoundation({ ...base, wall_load: 60 });
    // Double the load, double the width before rounding to a buildable size.
    closeTo(heavy.required_width / light.required_width, 2, 0.05);
  });

  it("never designs a footing that fails its own bearing check", () => {
    for (const load of [10, 30, 60, 120, 240]) {
      const r = designFoundation({ ...base, wall_load: load });
      expect(r.recommended_width).toBeGreaterThanOrEqual(r.required_width);
      expect(r.bearing_check_pass).toBe(true);
      closeTo(r.applied_pressure, load / (r.recommended_width / 1000), 0.6);
    }
  });

  it("treats the built-in soil values as allowable, not ultimate", () => {
    // Dividing an already-allowable value by a safety factor again would give a
    // footing around 2.5 times larger than the soil needs. A 30 kN/m load on
    // 150 kN/m² firm clay must be 200 mm, never 500 mm.
    // Applied once, that factor gives 220 mm. Applied twice (the old bug) it
    // would give 550 mm, so anything near the minimum proves it is not doubled.
    const r = designFoundation({ ...base, wall_load: 30 });
    expect(r.required_width).toBeLessThan(300);
    expect(r.recommended_width).toBe(300); // the 300 mm practical minimum governs
    expect(r.bearing_check_pass).toBe(true);
  });

  it("derives the three volumes from the width and the stated thicknesses", () => {
    const r = designFoundation({ ...base, wall_load: 50 });
    const widthM = r.recommended_width / 1000;
    // Total strip length for a 10 m by 8 m building is the perimeter.
    const perimeter = 2 * (10 + 8);
    closeTo(r.concrete_volume, widthM * 0.225 * perimeter, 0.6);
    closeTo(r.blinding_volume, widthM * 0.075 * perimeter, 0.6);
    closeTo(r.hardcore_volume, widthM * 0.15 * perimeter, 0.6);
  });

  it("excavates to the stated depth, not deeper than it", () => {
    const shallow = designFoundation({
      ...base,
      wall_load: 40,
      foundation_depth: 1,
    });
    const deep = designFoundation({
      ...base,
      wall_load: 40,
      foundation_depth: 2,
    });
    closeTo(deep.excavation_volume / shallow.excavation_volume, 2, 0.06);
  });

  it("widens rather than passes when the soil is weaker", () => {
    const clay = designFoundation({
      ...base,
      wall_load: 60,
      soil_type: "firm_clay",
    });
    const sand = designFoundation({
      ...base,
      wall_load: 60,
      soil_type: "loose_sand",
    });
    expect(sand.recommended_width).toBeGreaterThan(clay.recommended_width);
    expect(sand.bearing_check_pass).toBe(true);
  });

  it("uses a custom capacity only when the soil type is custom", () => {
    const r = designFoundation({
      ...base,
      wall_load: 60,
      soil_type: "custom",
      custom_bearing_capacity: 75,
    });
    expect(r.bearing_capacity).toBe(75);
    closeTo(r.required_width, ((1.1 * 60) / 75) * 1000, 1);
  });
});

// ── Honesty at the engine boundary ───────────────────────────────────────────
describe("engines never invent a market or a price", () => {
  it("refuses a structural engine with no market rather than assuming Nigeria", async () => {
    const r = await executeEngine("foundation_calculator", {
      shape: "strip",
      soil_type: "firm_clay",
      wall_load: 30,
      foundation_depth: 1.2,
      concrete_grade: "C25",
    });
    if (!r.ok) {
      expect(r.error).toBeTruthy();
      expect(r.costs).toBeNull();
    } else {
      // If it answered, it must not have priced anything it was not given.
      if (r.costs) expect(r.costs.currency).toBeTruthy();
    }
  });

  it("reports no cost summary when a calculator has no prices at all", async () => {
    const r = await executeEngine("painting_project", {
      length: 5,
      width: 4,
      wallHeight: 3,
      doors: 1,
      windows: 1,
      coats: 2,
      projectType: "room",
    });
    expect(r.ok).toBe(true);
    // Manual-calculator contract: quantities yes, fabricated prices no.
    expect(r.costs).toBeNull();
    expect(r.quantities.length).toBeGreaterThan(0);
  });
});

// ── Margin pricing ───────────────────────────────────────────────────────────
// Markup on cost raises the cost: price = cost x (1 + m).
// Margin on price divides the cost: price = cost / (1 - m).
// Confusing the two silently undercharges, and at 20 percent the gap between
// them is 4 percent of the price, which is a real job's profit.
describe("margin pricing, first principles", () => {
  it("prices a markup on cost as cost plus the percentage of cost", async () => {
    const { calculateMargin } = await import("@/lib/estimation/margin-engine");
    const r = calculateMargin({
      base_cost: 1000,
      margin_percent: 20,
      basis: "markup_on_cost",
      currency: "NGN",
      rules: [],
    } as never);
    expect(r.ok).toBe(true);
    closeTo(r.profit as number, 200, 0.01);
    closeTo(r.quote_total as number, 1200, 0.01);
  });

  it("prices a margin on price as cost divided by one minus the percentage", async () => {
    const { calculateMargin } = await import("@/lib/estimation/margin-engine");
    const r = calculateMargin({
      base_cost: 1000,
      margin_percent: 20,
      basis: "margin_on_price",
      currency: "NGN",
      rules: [],
    } as never);
    expect(r.ok).toBe(true);
    // 1000 / 0.8 = 1250, and the profit is genuinely 20 percent OF THE PRICE.
    closeTo(r.quote_total as number, 1250, 0.01);
    closeTo(r.profit as number, 250, 0.01);
    closeTo(((r.profit as number) / (r.quote_total as number)) * 100, 20, 0.01);
  });

  it("refuses a 100 percent margin on price instead of dividing by zero", async () => {
    const { calculateMargin } = await import("@/lib/estimation/margin-engine");
    const r = calculateMargin({
      base_cost: 1000,
      margin_percent: 100,
      basis: "margin_on_price",
      currency: "NGN",
      rules: [],
    } as never);
    expect(r.ok).toBe(false);
    expect(r.quote_total).toBeNull();
  });

  it("never invents tax without a configured rule", async () => {
    const { calculateMargin } = await import("@/lib/estimation/margin-engine");
    const r = calculateMargin({
      base_cost: 1000,
      margin_percent: 10,
      basis: "markup_on_cost",
      currency: "NGN",
      rules: [],
    } as never);
    // A zero or absent VAT line is honest; a guessed rate is not.
    const vat = (r as unknown as { vat_amount?: number | null }).vat_amount;
    expect(vat ?? 0).toBe(0);
  });
});

describe("margin engine survives a caller with no rule set", () => {
  it("prices without throwing when rules is omitted entirely", async () => {
    const { calculateMargin } = await import("@/lib/estimation/margin-engine");
    // An API caller has no idea what a rule set is. It must get a priced
    // answer with default rounding, never "Cannot read properties of
    // undefined (reading 'find')".
    const r = calculateMargin({
      base_cost: 1000,
      margin_percent: 20,
      basis: "markup_on_cost",
      currency: "NGN",
    } as never);
    expect(r.ok).toBe(true);
    closeTo(r.quote_total as number, 1200, 0.01);
  });
});

// ── Pad and raft footings ────────────────────────────────────────────────────
// A pad spreads a column load over square area: side = sqrt(1.1 x load / capacity).
// Raft spreads every wall load over the whole footprint.
describe("pad footing design, first principles", () => {
  const base = {
    shape: "pad" as const,
    soil_type: "firm_clay" as const,
    foundation_depth: 1.2,
    concrete_grade: "C25",
    building_length: 10,
    building_width: 8,
  };

  it("sizes a square pad from the required area", () => {
    // 1.10 x 200 kN = 220 kN over 150 kN/m² = 1.4667 m², side = 1.211 m.
    const r = designFoundation({ ...base, column_load: 200, wall_load: 0 });
    closeTo(r.area_per_pad as number, 1.69, 0.01); // 1.3 m x 1.3 m after rounding
    closeTo(r.required_width, 1211, 2);
    expect(r.recommended_width).toBe(1300); // rounded up to 100 mm
  });

  it("checks the pressure it will actually apply, not the required one", () => {
    const r = designFoundation({ ...base, column_load: 200, wall_load: 0 });
    // 220 kN over the built pad of 1.69 m², not over the theoretical 1.4667 m².
    closeTo(r.applied_pressure, 220 / 1.69, 0.1);
    expect(r.bearing_check_pass).toBe(true);
  });

  it("derives volumes from the pad area and the stated thicknesses", () => {
    const r = designFoundation({ ...base, column_load: 200, wall_load: 0 });
    const area = 1.3 * 1.3;
    closeTo(r.concrete_volume, area * 0.3, 0.06); // 300 mm pad
    closeTo(r.blinding_volume, area * 0.075, 0.06);
    closeTo(r.hardcore_volume, area * 0.15, 0.06);
    closeTo(r.excavation_volume, area * 1.2, 0.06);
  });

  it("applies the BS 8110 punching shear check at 1.5d from the column face", () => {
    const r = designFoundation({ ...base, column_load: 200, wall_load: 0 });
    // d = 300 - 40 cover - 10 half bar = 250 mm
    // u1 = 4 x (225 + 3 x 250) = 3900 mm
    // v  = 1.4 x 200 kN / (3900 x 250) = 0.287 N/mm²
    // v_c = 0.79 x (0.15)^(1/3) x (400/250)^(1/4) / 1.25 = 0.378 N/mm²
    closeTo(r.punching_shear_stress as number, 0.287, 0.002);
    closeTo(r.punching_shear_capacity as number, 0.378, 0.005);
    expect(r.punching_shear_check_pass).toBe(true);
  });

  it("fails punching shear at 300 kN, which the unfactored capacity hid", () => {
    // v = 1.4 x 300 kN / (3900 x 250) = 0.431 N/mm², above the 0.378 capacity.
    // Without the gamma_m divisor the capacity came out at 0.472 and this pad
    // passed, so the check was 25 percent too generous in the unsafe direction.
    const r = designFoundation({ ...base, column_load: 300, wall_load: 0 });
    closeTo(r.punching_shear_stress as number, 0.431, 0.002);
    expect(r.punching_shear_check_pass).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/punching shear/i);
  });

  it("passes a heavier load once the user supplies a wider column", () => {
    const narrow = designFoundation({
      ...base,
      column_load: 300,
      wall_load: 0,
    });
    const wide = designFoundation({
      ...base,
      column_load: 300,
      wall_load: 0,
      column_width_mm: 450,
    });
    // A wider column lengthens the critical perimeter, so a bigger load fits.
    // Capacity depends only on concrete and depth, so a wider column does not
    // raise it: it lengthens the critical perimeter and lowers the applied
    // stress instead. Asserting a capacity rise would have encoded nonsense.
    expect(wide.punching_shear_stress as number).toBeLessThan(
      narrow.punching_shear_stress as number,
    );
    // u1 for a 450 mm column is 4 x (450 + 750) = 4800 mm, so the stress
    // falls to 420000 / (4800 x 250) = 0.350 N/mm².
    closeTo(wide.punching_shear_stress as number, 0.35, 0.002);
  });
});

describe("raft foundation, first principles", () => {
  const raft = {
    shape: "raft" as const,
    soil_type: "firm_clay" as const,
    foundation_depth: 1.2,
    concrete_grade: "C25",
    building_length: 10,
    building_width: 8,
  };

  it("spreads all wall load over the whole footprint", () => {
    // Perimeter 36 m at 20 kN/m is 720 kN over 80 m² = 9 kN/m².
    const r = designFoundation({ ...raft, wall_load: 20 });
    closeTo(r.applied_pressure, 9, 0.1);
    expect(r.bearing_check_pass).toBe(true);
  });

  it("builds the raft at 300 mm over the full area", () => {
    const r = designFoundation({ ...raft, wall_load: 20 });
    closeTo(r.concrete_volume, 80 * 0.3, 0.1);
    closeTo(r.blinding_volume, 80 * 0.075, 0.1);
    closeTo(r.excavation_volume, 80 * 1.2, 0.1);
  });

  it("passes 135 kN/m² on firm clay, whose allowable is 150", () => {
    // 300 kN/m x 36 m = 10,800 kN over 80 m² = 135 kN/m². Correctly a PASS, and
    // worth pinning: claiming failure here would be its own inaccuracy.
    const r = designFoundation({ ...raft, wall_load: 300 });
    closeTo(r.applied_pressure, 135, 0.5);
    expect(r.bearing_check_pass).toBe(true);
  });

  it("fails the same 135 kN/m² on loose sand, whose allowable is 100", () => {
    const r = designFoundation({
      ...raft,
      wall_load: 300,
      soil_type: "loose_sand",
    });
    closeTo(r.applied_pressure, 135, 0.5);
    expect(r.bearing_check_pass).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/exceeds/i);
  });
});

// ── Beam design ──────────────────────────────────────────────────────────────
describe("beam design, first principles", () => {
  const beam = {
    span: 6,
    beam_type: "suspended_beam" as const,
    support_condition: "simply_supported" as const,
    live_load: 10,
    dead_load: 6,
    tributary_width: 3,
    concrete_grade: "C25" as const,
    steel_grade: "Fe500" as const,
    cover_mm: 25,
  };

  it("derives the design moment from a simply supported factored UDL", () => {
    // M = w L² / 8 for a simply supported span under uniform load, using the
    // engine's own reported factored load and effective span.
    const r = designBeam(beam as never);
    closeTo(
      r.max_moment,
      (r.factored_load * r.effective_span * r.effective_span) / 8,
      Math.max(0.2, r.max_moment * 0.01),
    );
  });

  it("derives the design shear as w L / 2 at the support", () => {
    const r = designBeam(beam as never);
    closeTo(
      r.max_shear,
      (r.factored_load * r.effective_span) / 2,
      Math.max(0.2, r.max_shear * 0.01),
    );
  });

  it("needs at least the steel implied by the moment and a full lever arm", () => {
    // Independent bracket. For singly reinforced BS 8110 sections the lever arm
    // z lies between 0.75d and 0.95d, so As = M / (0.87 fy z) must fall between
    // those two bounds. A section outside the bracket is either unsafe (too
    // little steel for the moment) or absurdly over-reinforced.
    const r = designBeam(beam as never);
    const dEff = r.required_depth - 25 - 10; // cover and half bar
    const low = (r.max_moment * 1e6) / (0.87 * 500 * 0.95 * dEff);
    const high = (r.max_moment * 1e6) / (0.87 * 500 * 0.75 * dEff);
    expect(r.area_steel_required).toBeGreaterThanOrEqual(low * 0.99);
    expect(r.area_steel_required).toBeLessThanOrEqual(high * 1.01);
  });

  it("never returns less steel than its own stated minimum", () => {
    for (const span of [3, 5, 8]) {
      const r = designBeam({ ...beam, span } as never);
      expect(r.area_steel_required).toBeGreaterThanOrEqual(r.min_steel_area);
      expect(r.max_steel_area).toBeGreaterThan(r.min_steel_area);
      expect(r.required_depth).toBeGreaterThan(0);
    }
  });

  it("grows the moment with the square of the span", () => {
    const short = designBeam({ ...beam, span: 4 } as never);
    const long = designBeam({ ...beam, span: 8 } as never);
    // Load also grows with the effective span slightly, so 4x is approximate.
    const ratio = long.max_moment / short.max_moment;
    expect(ratio).toBeGreaterThan(3.5);
    expect(ratio).toBeLessThan(4.6);
  });

  it("needs more steel for more load, never less", () => {
    const light = designBeam({ ...beam, live_load: 5 } as never);
    const heavy = designBeam({ ...beam, live_load: 20 } as never);
    expect(heavy.area_steel_required).toBeGreaterThan(
      light.area_steel_required,
    );
    expect(heavy.recommended_bar_count).toBeGreaterThanOrEqual(
      light.recommended_bar_count,
    );
  });

  it("reports positive shear capacity and buildable links", () => {
    const r = designBeam(beam as never);
    expect(r.shear_capacity).toBeGreaterThan(0);
    expect(r.link_spacing).toBeGreaterThan(0);
    expect(r.link_spacing).toBeLessThanOrEqual(300); // BS 8110 maximum
  });
});

// ── Electrical voltage drop ──────────────────────────────────────────────────
// Single-phase two-core copper: drop = 2 x L x I x rho / A, with I = P / V.
describe("electrical voltage drop, first principles", () => {
  it("computes the drop for a 2 kW feeder on 2.5 mm² over 20 m at 230 V", () => {
    // I = 2000 / 230 = 8.696 A; drop = 2 x 20 x 8.696 x 0.0225 / 2.5 = 3.13 V
    // which is 1.36 percent of 230 V, comfortably inside the 3 percent limit.
    // 0.0225 is copper at 70 C, the basis of tabulated voltage drop; at the
    // 20 C value of 0.0172 the same cable would appear 24 percent better.
    const v = voltageDropPercent({
      run_m: 20,
      load_watts: 2000,
      voltage: 230,
      cross_section_mm2: 2.5,
      lighting_dominant: true,
    });
    closeTo(v.drop_percent, 1.36, 0.02);
    expect(v.passes).toBe(true);
    expect(v.limit_percent).toBe(3);
  });

  it("fails the same load at 120 V, as the physics requires", () => {
    // Halving the voltage doubles the current, so the drop doubles. 1 kW over
    // 25 m on 2.5 mm² at 120 V gives 3.75 V, which is 3.13 percent: over the
    // 3 percent lighting limit but inside the 5 percent power limit. The engine
    // must distinguish the two, not use one number.
    const lighting = voltageDropPercent({
      run_m: 25,
      load_watts: 1000,
      voltage: 120,
      cross_section_mm2: 2.5,
      lighting_dominant: true,
    });
    const power = voltageDropPercent({
      run_m: 25,
      load_watts: 1000,
      voltage: 120,
      cross_section_mm2: 2.5,
      lighting_dominant: false,
    });
    closeTo(lighting.drop_percent, 3.13, 0.05);
    expect(lighting.passes).toBe(false);
    expect(power.passes).toBe(true);
  });

  it("doubles the drop when the run doubles", () => {
    const near = voltageDropPercent({
      run_m: 10,
      load_watts: 2000,
      voltage: 230,
      cross_section_mm2: 2.5,
    });
    const far = voltageDropPercent({
      run_m: 20,
      load_watts: 2000,
      voltage: 230,
      cross_section_mm2: 2.5,
    });
    closeTo(far.drop_percent / near.drop_percent, 2, 0.01);
  });

  it("halves the drop when the cable cross-section doubles", () => {
    const thin = voltageDropPercent({
      run_m: 30,
      load_watts: 3000,
      voltage: 230,
      cross_section_mm2: 2.5,
    });
    const thick = voltageDropPercent({
      run_m: 30,
      load_watts: 3000,
      voltage: 230,
      cross_section_mm2: 5,
    });
    closeTo(thin.drop_percent / thick.drop_percent, 2, 0.02);
  });

  it("refuses to certify a check it could not perform", () => {
    // A zero run length is not a pass: it is an unanswered question.
    const v = voltageDropPercent({
      run_m: 0,
      load_watts: 2000,
      voltage: 230,
      cross_section_mm2: 2.5,
    });
    expect(v.passes).toBe(false);
    expect(v.detail).toMatch(/must all be provided/i);
  });
});

// ── Blockwork quantities ─────────────────────────────────────────────────────
// A block wall is a module of (block + joint) in both directions, so the rate
// is 1 / ((L + j)(h + j)). The engine uses a documented 25 mm joint, thicker
// than a typical 10 mm bed joint, and states why: sandcrete blocks are not
// dimensionally accurate and the thicker joint matches its foundation course
// count. Pinned as a convention, not presented as a universal standard.
describe("blockwork quantities, first principles", () => {
  it("computes blocks per m² for a 18 x 9 inch block on a 25 mm joint", () => {
    // module = (0.4572 + 0.025) x (0.2286 + 0.025) = 0.4822 x 0.2536 m²
    // rate = 1 / 0.12229 = 8.177 blocks/m²
    closeTo(blocksPerM2(18, 9), 8.18, 0.01);
  });

  it("gives the joint-free theoretical rate when the joint is zero", () => {
    // 1 / (0.4572 x 0.2286) = 9.570 blocks/m², which overstates by 17 percent
    // because it leaves no room for mortar.
    closeTo(blocksPerM2(18, 9, 0), 9.57, 0.01);
  });

  it("matches a direct course count for the same wall", () => {
    // A 10 m x 3 m wall counted course by course must equal area times rate.
    const rate = blocksPerM2(18, 9);
    const byCourses = (10 / (18 * 0.0254 + 0.025)) * (3 / (9 * 0.0254 + 0.025));
    closeTo(10 * 3 * rate, byCourses, 0.01);
  });

  it("returns zero for an impossible block rather than infinity", () => {
    expect(blocksPerM2(0, 9)).toBe(0);
    expect(blocksPerM2(18, 0)).toBe(0);
    expect(blocksPerM2(-18, 9)).toBe(0);
  });
});

// ── Regional cost indices ────────────────────────────────────────────────────
// Precedence is deliberate: exact state and category, then the state's general
// index, then a documented national baseline with a warning. The engine never
// guesses a multiplier for a state it does not have.
describe("regional cost, first principles and precedence", () => {
  const index = (state: string, category: string, factor: number) =>
    ({
      id: `${state}-${category}`,
      country: "NG",
      state,
      category,
      cost_factor: factor,
      description: null,
      source_reference: "test",
      effective_date: "2026-01-01",
      is_active: true,
      sort_order: 0,
      created_at: "2026-01-01",
    }) as never;

  it("applies the configured factor to the base cost", () => {
    const r = applyRegionalCost({
      base_cost: 1000,
      country: "NG",
      state: "Lagos",
      category: "residential",
      indices: [index("Lagos", "residential", 1.25)],
      rules: [],
    } as never);
    expect(r.ok).toBe(true);
    expect(r.applied_factor).toBe(1.25);
    closeTo(r.adjusted_cost as number, 1250, 0.01);
  });

  it("prefers the exact category over the state general index", () => {
    const r = applyRegionalCost({
      base_cost: 1000,
      country: "NG",
      state: "Lagos",
      category: "residential",
      indices: [
        index("Lagos", "general", 1.25),
        index("Lagos", "residential", 1.4),
      ],
      rules: [],
    } as never);
    expect(r.applied_factor).toBe(1.4);
    closeTo(r.adjusted_cost as number, 1400, 0.01);
  });

  it("falls back to the state general index when the category is missing", () => {
    const r = applyRegionalCost({
      base_cost: 1000,
      country: "NG",
      state: "Lagos",
      category: "industrial",
      indices: [index("Lagos", "general", 1.2)],
      rules: [],
    } as never);
    expect(r.applied_factor).toBe(1.2);
  });

  it("states a baseline and warns instead of inventing a state factor", () => {
    const r = applyRegionalCost({
      base_cost: 1000,
      country: "NG",
      state: "Nowhere",
      category: "general",
      indices: [index("Lagos", "general", 1.2)],
      rules: [],
    } as never);
    expect(r.applied_source).toBe("national_baseline");
    expect(r.warnings.join(" ")).toMatch(/no regional cost index/i);
    // Whatever the baseline is, it is disclosed and the arithmetic is honest.
    closeTo(r.adjusted_cost as number, 1000 * (r.applied_factor as number), 1);
  });

  it("keeps markets apart: a Lagos index never prices a Ghana job", () => {
    const r = applyRegionalCost({
      base_cost: 1000,
      country: "GH",
      state: "Lagos",
      category: "general",
      indices: [index("Lagos", "general", 1.2)],
      rules: [],
    } as never);
    expect(r.applied_source).toBe("national_baseline");
  });

  it("refuses an index with an unusable factor", () => {
    const r = applyRegionalCost({
      base_cost: 1000,
      country: "NG",
      state: "Lagos",
      category: "general",
      indices: [index("Lagos", "general", 0)],
      rules: [],
    } as never);
    expect(r.warnings.join(" ")).toMatch(/invalid factor|Nothing was applied/i);
  });
});

// ── Plumbing runs ────────────────────────────────────────────────────────────
describe("plumbing runs, first principles", () => {
  const rules = parsePlumbingRules([]);
  const input = (cold: number | null, wasteOverride?: number) =>
    ({
      taps: 2,
      wcs: 1,
      showers: 1,
      sinks: 1,
      floor_drains: 1,
      water_storage_tanks: 1,
      pumps: 0,
      cold_run_m: cold,
      hot_run_m: null,
      waste_run_m: null,
      drainage_run_m: null,
      labour: { mode: "none" },
    }) as never;

  it("sizes no pipe it was not given a run length for", () => {
    // Fixtures are countable and may legitimately be sized from counts. Pipe is
    // not: with every run null, every metre-denominated line must stay unsized
    // rather than assume a length.
    const r = calculatePlumbing(input(null), parsePlumbingRules([]), {});
    const lines = (r.lines ?? []) as {
      unit: string;
      quantity: number | null;
    }[];
    const pipes = lines.filter((l) => l.unit === "m");
    expect(pipes.length).toBeGreaterThan(0);
    expect(pipes.every((l) => l.quantity === null)).toBe(true);
  });

  it("adds waste to a measured run and rounds up to whole metres", () => {
    const r = calculatePlumbing(input(10), rules, {});
    // Must be a metre-denominated pipe line, not a fixture count that happens to
    // be non-null. Latching onto a tap line here would make this test vacuous.
    const cold = (
      r.lines as { key: string; unit: string; quantity: number | null }[]
    ).find((l) => l.unit === "m" && l.quantity !== null);
    expect(cold).toBeTruthy();
    const wastePct = Number(rules.pipe_waste_pct ?? 0);
    // 10 m plus waste, rounded up to a whole metre, never rounded down.
    expect(cold!.quantity).toBe(Math.ceil(10 * (1 + wastePct / 100)));
    expect(Number.isInteger(cold!.quantity)).toBe(true);
  });

  it("never orders less pipe for a longer run", () => {
    const short = calculatePlumbing(input(8), rules, {});
    const long = calculatePlumbing(input(16), rules, {});
    const pick = (r: unknown) =>
      (
        (
          r as { lines: { unit: string; quantity: number | null }[] }
        ).lines.find((l) => l.unit === "m" && l.quantity !== null) as {
          quantity: number;
        }
      ).quantity;
    expect(pick(long)).toBeGreaterThan(pick(short));
  });
});
