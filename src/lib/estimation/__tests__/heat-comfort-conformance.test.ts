// =========================================================
// HEAT & COMFORT CONFORMANCE (audit #28)
//
// The physics is albedo arithmetic: absorbed solar = irradiance x (1 - albedo),
// so the cooling benefit of a lighter finish is irradiance x (albedo_proposed -
// albedo_current). Every expectation below is computed by hand from that
// identity, not read off the engine.
// =========================================================
import { describe, expect, it } from "vitest";
import {
  calculateHeatComfort,
  type HeatComfortInput,
} from "../heat-comfort-engine";

const factors = {
  "roof:dark": { solar_reflectance: 0.2 },
  "roof:white": { solar_reflectance: 0.8 },
  "roof:mid": { solar_reflectance: 0.5 },
};

const rules = [
  { rule_key: "solar_irradiance_kwh_per_sqm_day", rule_value: { value: 5.5 } },
  {
    rule_key: "wall_solar_irradiance_kwh_per_sqm_day",
    rule_value: { value: 3 },
  },
  { rule_key: "meaningful_reduction_threshold", rule_value: { value: 20 } },
  { rule_key: "rounding_decimals", rule_value: { value: 2 } },
] as never;

function makeInput(over: Partial<HeatComfortInput> = {}): HeatComfortInput {
  return {
    surface_type: "roof",
    area_sqm: 100,
    current_category: "dark",
    proposed_category: "white",
    factors,
    rules,
    ...over,
  } as HeatComfortInput;
}

describe("heat and comfort: albedo arithmetic", () => {
  it("computes the daily energy delta from the absorbed fractions", () => {
    // 100 m2 x 5.5 kWh/m2/day x (0.8 - 0.2) = 330 kWh/day
    const r = calculateHeatComfort(makeInput());
    expect(r.ok).toBe(true);
    expect(r.daily_energy_delta_kwh).toBeCloseTo(330, 2);
    expect(r.current_absorbed_fraction).toBeCloseTo(0.8, 4);
    expect(r.proposed_absorbed_fraction).toBeCloseTo(0.2, 4);
    expect(r.direction).toBe("cooler");
  });

  it("reports the reduction against the energy actually absorbed before", () => {
    // Absorbed falls from 0.8 to 0.2, so the reduction is (0.8 - 0.2) / 0.8 = 75%.
    const r = calculateHeatComfort(makeInput());
    expect(r.reduction_percent).toBeCloseTo(75, 2);
  });

  it("converts square feet exactly", () => {
    // 1000 ft2 x 0.092903 = 92.903 m2; x 5.5 x 0.6 = 306.5799 kWh/day
    const r = calculateHeatComfort(
      makeInput({ area_sqm: undefined, area_sqft: 1000 }),
    );
    expect(r.area_sqm).toBeCloseTo(92.9, 1);
    expect(r.daily_energy_delta_kwh).toBeCloseTo(306.58, 1);
  });

  it("reports no change when the albedo is unchanged", () => {
    const r = calculateHeatComfort(makeInput({ proposed_category: "dark" }));
    expect(r.daily_energy_delta_kwh).toBe(0);
    expect(r.direction).toBe("no_change");
  });

  it("refuses an albedo outside the physical range instead of clamping it", () => {
    const r = calculateHeatComfort(
      makeInput({
        factors: {
          "roof:dark": { solar_reflectance: 0.2 },
          "roof:white": { solar_reflectance: 1.4 },
        },
      }),
    );
    expect(r.daily_energy_delta_kwh).toBeNull();
    expect(r.warnings.join(" ")).toMatch(/outside the physical range 0–1/);
  });

  it("refuses to invent an albedo that is not configured", () => {
    const r = calculateHeatComfort(makeInput({ proposed_category: "unknown" }));
    expect(r.daily_energy_delta_kwh).toBeNull();
    expect(r.warnings.join(" ")).toMatch(/never assumes a reflectance/);
  });

  it("uses the wall irradiance rule for a wall comparison", () => {
    // 100 m2 x 3 kWh/m2/day x 0.6 = 180 kWh/day, not the roof's 5.5.
    const r = calculateHeatComfort(
      makeInput({
        surface_type: "wall",
        factors: {
          "wall:dark": { solar_reflectance: 0.2 },
          "wall:white": { solar_reflectance: 0.8 },
        },
      }),
    );
    expect(r.daily_energy_delta_kwh).toBeCloseTo(180, 2);
  });
});
