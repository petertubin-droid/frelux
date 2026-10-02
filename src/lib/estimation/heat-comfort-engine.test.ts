/**
 * Heat Comfort Engine tests (Future Engine 6)
 *
 * Every expected value below is hand-verified.
 * Fixture: area 100 m², irradiance rule 5.5 kWh/m²/day,
 * current dark membrane albedo 0.20, proposed cool coating
 * albedo 0.65.
 *
 *   absorbed current  = 1 − 0.20 = 0.80
 *   absorbed proposed = 1 − 0.65 = 0.35
 *   daily delta = 100 × 5.5 × (0.65 − 0.20) = +247.5 kWh/day
 *   reduction % = (0.80 − 0.35) / 0.80 × 100 = 56.25%
 */

import { describe, it, expect } from "vitest";
import {
  calculateHeatComfort,
  type HeatComfortInput,
} from "./heat-comfort-engine";
import type { EstimationCalcRule } from "@/types/estimation";

const rule = (key: string, value: number): EstimationCalcRule =>
  ({
    id: `r-${key}`,
    rule_key: key,
    calculator_type: "heat_comfort",
    rule_value: { value },
    rule_status: "verified_frelux",
    description: null,
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  }) as unknown as EstimationCalcRule;

const baseRules = () => [
  rule("solar_irradiance_kwh_per_sqm_day", 5.5),
  rule("meaningful_reduction_threshold", 0.15),
  rule("rounding_decimals", 2),
];

const factors = () => ({
  "roof:dark_membrane": { solar_reflectance: 0.2 },
  "roof:cool_coating": { solar_reflectance: 0.65 },
  "wall:white_emulsion": { solar_reflectance: 0.7 },
  "wall:dark_paint": { solar_reflectance: 0.25 },
});

const input = (over: Partial<HeatComfortInput> = {}): HeatComfortInput => ({
  surface_type: "roof",
  area_sqm: 100,
  current_category: "dark_membrane",
  proposed_category: "cool_coating",
  factors: factors(),
  rules: baseRules(),
  ...over,
});

describe("calculateHeatComfort", () => {
  it("computes the cooling benefit hand-verified end to end", () => {
    const r = calculateHeatComfort(input());
    expect(r.ok).toBe(true);
    expect(r.current_albedo).toBe(0.2);
    expect(r.proposed_albedo).toBe(0.65);
    expect(r.current_absorbed_fraction).toBe(0.8);
    expect(r.proposed_absorbed_fraction).toBe(0.35);
    expect(r.daily_energy_delta_kwh).toBe(247.5);
    expect(r.reduction_percent).toBe(56.25);
    expect(r.direction).toBe("cooler");
    expect(r.meaningful_benefit).toBe(true);
  });

  it("applies the admin meaningfulness threshold honestly", () => {
    // Threshold 60% > the 56.25% reduction → below threshold
    const r = calculateHeatComfort(
      input({
        rules: [
          rule("solar_irradiance_kwh_per_sqm_day", 5.5),
          rule("meaningful_reduction_threshold", 0.6),
          rule("rounding_decimals", 2),
        ],
      }),
    );
    expect(r.meaningful_benefit).toBe(false);
  });

  it("reports a warmer direction and a warning for a darker proposed finish", () => {
    // 100 × 5.5 × (0.25 − 0.70) = −247.5 kWh/day → absorbs MORE heat
    const r = calculateHeatComfort(
      input({
        surface_type: "wall",
        current_category: "white_emulsion",
        proposed_category: "dark_paint",
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.direction).toBe("warmer");
    expect(r.daily_energy_delta_kwh).toBe(-247.5);
    expect(r.reduction_percent).toBe(-150); // (0.75−0.30)/0.30 × 100 = +150% MORE absorbed → −150
    expect(r.meaningful_benefit).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/making the space warmer, not cooler/);
  });

  it("treats an identical albedo as no change", () => {
    const r = calculateHeatComfort(
      input({ proposed_category: "dark_membrane" }),
    );
    expect(r.direction).toBe("no_change");
    expect(r.daily_energy_delta_kwh).toBe(0);
    expect(r.meaningful_benefit).toBe(false);
  });

  it("refuses a finish without a configured factor — never assumes an albedo", () => {
    const r = calculateHeatComfort(
      input({ proposed_category: "unobtainium_coating" }),
    );
    expect(r.ok).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/never assumes a reflectance/);
  });

  it("refuses an albedo outside the physical 0–1 range instead of clamping", () => {
    const r = calculateHeatComfort(
      input({
        factors: {
          "roof:dark_membrane": { solar_reflectance: 1.4 },
          "roof:cool_coating": { solar_reflectance: 0.65 },
        },
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.warnings.join(" ")).toMatch(
      /never clamps data to force an answer/,
    );
  });

  it("refuses an invalid or missing area, surface type, or categories", () => {
    expect(calculateHeatComfort(input({ area_sqm: 0 })).ok).toBe(false);
    expect(calculateHeatComfort(input({ area_sqm: -10 })).ok).toBe(false);
    expect(
      calculateHeatComfort(
        input({ surface_type: "floor" as unknown as "roof" }),
      ).ok,
    ).toBe(false);
    expect(calculateHeatComfort(input({ current_category: " " })).ok).toBe(
      false,
    );
    expect(calculateHeatComfort(input({ proposed_category: "" })).ok).toBe(
      false,
    );
    expect(
      calculateHeatComfort(
        input({ surface_type: "floor" as unknown as "roof" }),
      ).warnings.join(" "),
    ).toMatch(/never scores an unknown surface/);
  });

  it("refuses to run without a valid irradiance rule — never invents a climate", () => {
    const r = calculateHeatComfort(
      input({ rules: [rule("meaningful_reduction_threshold", 0.15)] }),
    );
    expect(r.ok).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/never invents a climate/);
  });

  it("yields null reduction_percent on a fully reflective base instead of a fake number", () => {
    const r = calculateHeatComfort(
      input({
        factors: {
          "roof:dark_membrane": { solar_reflectance: 1 },
          "roof:cool_coating": { solar_reflectance: 0.65 },
        },
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.current_absorbed_fraction).toBe(0);
    expect(r.reduction_percent).toBeNull();
    expect(r.daily_energy_delta_kwh).toBe(-192.5); // 100 × 5.5 × (0.65 − 1.00) = −192.5
    expect(r.warnings.join(" ")).toMatch(
      /no percentage reduction is computable/,
    );
  });

  it("scales with area (hand-verified)", () => {
    // 250 m²: 250 × 5.5 × 0.45 = 618.75 kWh/day
    const r = calculateHeatComfort(input({ area_sqm: 250 }));
    expect(r.daily_energy_delta_kwh).toBe(618.75);
    expect(r.reduction_percent).toBe(56.25); // unchanged — it is per-unit
  });
});
