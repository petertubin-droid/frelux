// =========================================================
// ENGINE PRECISION CONTRACT
//
// The elevation numbers are read as measurements, so the arithmetic has to
// behave like one: one rounding at the edge, ties away from zero, aggregates
// built from unrounded parts, and the same answer every run. These tests pin
// those properties rather than any single figure, so a future edit that
// reintroduces rounding mid-calculation fails here.
// =========================================================

import { describe, expect, it } from "vitest";
import {
  calculateMathematicalElevation,
  DEFAULT_PLAN_INPUT,
} from "./mathematical-elevation-engine";
import { round1, round2, round3, roundTo } from "./rounding";

const base = {
  ...DEFAULT_PLAN_INPUT,
  building_length: 12,
  building_width: 9,
  storeys: 1,
  floor_to_floor_height: 3,
  roof_pitch_deg: 15,
  roof_type: "gable" as const,
};

const calc = (over: Record<string, unknown> = {}) =>
  calculateMathematicalElevation({ ...base, ...over } as typeof base);

describe("roundTo", () => {
  it("rounds a true half away from zero, in both directions", () => {
    // 1.005 is stored as 1.00499999999999989, which plain Math.round drops.
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
    expect(round2(-1.005)).toBe(-1.01);
    expect(round2(-2.675)).toBe(-2.68);
    expect(round1(0.15)).toBe(0.2);
    expect(round3(1.0005)).toBe(1.001);
  });

  it("leaves values that need no rounding untouched", () => {
    expect(round2(12)).toBe(12);
    expect(round2(4.5)).toBe(4.5);
    expect(roundTo(42.4, 0)).toBe(42);
    expect(roundTo(42.5, 0)).toBe(43);
  });

  it("returns a number for missing values instead of NaN", () => {
    expect(round2(NaN)).toBe(0);
    expect(round2(Infinity)).toBe(0);
    expect(round1(-Infinity)).toBe(0);
  });

  it("is idempotent, so a rounded figure can be rounded again safely", () => {
    for (const value of [0.125, 1.005, 27.675, 123.4567]) {
      const once = round2(value);
      expect(round2(once)).toBe(once);
    }
  });
});

describe("elevation precision", () => {
  it("takes clear roof span from the shorter plan dimension", () => {
    const res = calc();
    const l5 = res.levels.level_5_roof;
    expect(l5.roof_span_m).toBeCloseTo(9, 2);
  });

  it("derives the ridge rise from the half span at full precision", () => {
    const res = calc();
    const l5 = res.levels.level_5_roof;
    const halfSpan = ((l5.roof_span_m ?? 0) + 0) / 2;
    const expected = halfSpan * Math.tan((15 * Math.PI) / 180);
    // Displayed to two decimals, computed from the span the page prints.
    expect(l5.ridge_rise_m).toBeCloseTo(round2(expected), 2);
  });

  it("keeps the printed apex consistent with its own parts", () => {
    const res = calc();
    const l1 = res.levels.level_1_foundation;
    const l5 = res.levels.level_5_roof;
    const rebuilt = l5.eaves_height_m + (l5.ridge_rise_m ?? 0);
    expect(Math.abs(l5.total_building_height_m - rebuilt)).toBeLessThanOrEqual(
      0.011,
    );
    // The apex sits above the eaves by exactly the ridge rise, and the eaves
    // sit above ground, so neither can be negative or inverted.
    expect(l5.total_building_height_m).toBeGreaterThan(l5.eaves_height_m);
    expect(l1.excavation_depth_m).toBeNull();
  });

  it("grows the true roof area with the pitch, not with a rounded slope", () => {
    const shallow = calc({ roof_pitch_deg: 15 });
    const steep = calc({ roof_pitch_deg: 35 });
    expect(
      steep.levels.level_5_roof.approximate_roof_covering_area_m2 ?? 0,
    ).toBeGreaterThan(
      shallow.levels.level_5_roof.approximate_roof_covering_area_m2 ?? 0,
    );
    const l5 = shallow.levels.level_5_roof;
    const expected =
      l5.horizontal_roof_footprint_m2 / Math.cos((15 * Math.PI) / 180);
    expect((l5.approximate_roof_covering_area_m2 ?? 0) / expected).toBeCloseTo(
      1,
      2,
    );
    expect(l5.pitch_area_multiplier).toBeCloseTo(
      1 / Math.cos((15 * Math.PI) / 180),
      3,
    );
  });

  it("does not imply foundation design from a footing placeholder", () => {
    const l1 = calc().levels.level_1_foundation;
    expect(l1.footing_width_calculated_m).toBeNull();
    expect(l1.is_bearing_safe).toBeNull();
    expect(l1.applied_soil_pressure_kpa).toBeNull();
  });

  it("does not estimate blockwork without a product specification", () => {
    const l3 = calc().levels.level_3_superstructure;
    expect(l3.total_blocks_count).toBeNull();
    expect(l3.wall_courses_count).toBeNull();
  });

  it("keeps wall areas adding up to the masonry it reports", () => {
    const res = calc();
    const l3 = res.levels.level_3_superstructure;
    const gross =
      l3.gross_external_wall_area_m2 + l3.gross_internal_wall_area_m2;
    expect(
      Math.abs(gross - l3.total_opening_deductions_m2 - l3.net_masonry_area_m2),
    ).toBeLessThan(0.05);
  });

  it("is deterministic and free of NaN across the schedule", () => {
    const a = calc();
    const b = calc();
    // Identical inputs give identical figures; only the run timestamp differs.
    const { timestamp: _a, ...restA } = a;
    const { timestamp: _b, ...restB } = b;
    expect(restA).toEqual(restB);

    const { levels } = a;
    for (const level of Object.values(levels)) {
      for (const [key, value] of Object.entries(level)) {
        if (typeof value === "number") {
          expect(Number.isFinite(value), `${level.level_name}.${key}`).toBe(
            true,
          );
        }
      }
    }
    for (const item of a.five_d_bim.materials ?? []) {
      expect(Number.isFinite(item.quantity)).toBe(true);
    }
  });
});
