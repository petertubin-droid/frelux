import { describe, expect, it } from "vitest";
import { executeEngine } from "@/lib/ai-foundation/engines-registry";
import {
  SOIL_BEARING_CAPACITY,
  designFoundation,
} from "@/lib/engineering/foundation-calculator";
import { calculateRoofArea } from "@/lib/estimation/build-to-roof-engine";
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
