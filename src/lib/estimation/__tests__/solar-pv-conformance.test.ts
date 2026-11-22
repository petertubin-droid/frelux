// =========================================================
// SOLAR PV CONFORMANCE (audit #26)
//
// Expectations come from IEC 62548-1 / IEC 60364-7-712 and from arithmetic done
// by hand here, not from the engine's own output. The safety property being
// pinned: on the coldest design morning a string's open-circuit voltage must
// stay under the inverter's maximum DC input, because Voc rises as temperature
// falls and that is when it peaks.
// =========================================================
import { describe, expect, it } from "vitest";
import {
  calculateSolarPv,
  stringSeriesLimits,
  type SolarPvInput,
} from "../solar-pv-engine";

// A 550 W module, 2.28 x 1.13 m, with realistic crystalline-silicon electricals.
const MODULE = {
  watt_peak: 550,
  length_m: 2.28,
  width_m: 1.13,
  unit_price_naira: 230000,
};

const PRICES = {
  panel: { price_naira: 230000 },
  mounting_rail_per_m: { price_naira: 3500 },
  inverter_price_per_kw: { price_naira: 350000 },
};

// The engine refuses to run without the full component rule set, so these are
// the same shapes the solar suite uses, minus the string_size_max, which each
// test supplies explicitly because it is the subject.
const RULES = [
  { rule_key: "peak_sun_hours_day", rule_value: { value: 5.0 } },
  { rule_key: "system_loss_factor", rule_value: { value: 0.2 } },
  { rule_key: "inverter_dc_ac_ratio", rule_value: { value: 1.15 } },
  { rule_key: "rails_per_panel", rule_value: { value: 2 } },
  { rule_key: "mid_clamps_per_panel", rule_value: { value: 2 } },
  { rule_key: "end_clamps_per_panel", rule_value: { value: 4 } },
  { rule_key: "mc4_pairs_per_panel", rule_value: { value: 1 } },
  { rule_key: "dc_cable_per_panel_m", rule_value: { value: 2 } },
  { rule_key: "labor_cost_per_panel_naira", rule_value: { value: 15000 } },
  { rule_key: "rounding_decimals", rule_value: { value: 2 } },
];

function makeInput(over: Partial<SolarPvInput> = {}): SolarPvInput {
  return {
    mode: "roof_area",
    panel: MODULE,
    usable_roof_area_m2: 60,
    cable_run_m: 15,
    battery_storage_kwh: null,
    prices: PRICES,
    rules: RULES,
    ...over,
  } as SolarPvInput;
}

const ELECTRICALS = {
  module_voc_v: 41.2,
  module_vmp_v: 34.5,
  module_voc_temp_coeff_per_c: -0.0029,
  module_vmp_temp_coeff_per_c: -0.0035,
  inverter_max_dc_voltage_v: 600,
  inverter_mppt_min_v: 200,
  design_min_cell_temp_c: 0,
  design_max_cell_temp_c: 70,
};

describe("solar pv: string voltage limits (IEC 62548-1)", () => {
  it("corrects Voc to the coldest design temperature", () => {
    // 41.2 x (1 + (-0.0029 x (0 - 25))) = 41.2 x 1.0725 = 44.187 V
    const r = stringSeriesLimits(ELECTRICALS);
    expect(r.voc_cold_v).toBeCloseTo(44.19, 2);
    // 600 / 44.187 = 13.58, so thirteen panels in series, never fourteen.
    expect(r.max_series).toBe(13);
  });

  it("corrects Vmp to the hottest design temperature for the MPPT floor", () => {
    // 34.5 x (1 + (-0.0035 x (70 - 25))) = 34.5 x 0.8425 = 29.066 V
    const r = stringSeriesLimits(ELECTRICALS);
    expect(r.vmp_hot_v).toBeCloseTo(29.07, 2);
    // 200 / 29.066 = 6.88, so seven panels is the shortest string that still
    // tracks in the heat.
    expect(r.min_series).toBe(7);
  });

  it("sizes strings from the voltage limit, not the configured maximum", () => {
    const res = calculateSolarPv(
      makeInput({
        ...ELECTRICALS,
        rules: [
          ...RULES,
          { rule_key: "string_size_max", rule_value: { value: 20 } },
        ],
      }),
    );
    // 13 panels is the ceiling, so 20 panels need two strings, not one.
    expect(res.string_count).toBe(2);
    expect(res.warnings.join(" ")).toMatch(
      /exceeds the 13 the module voltage allows/,
    );
    // The warning has to state the numbers the user can check.
    expect(res.warnings.join(" ")).toMatch(/44\.19 V per panel/);
  });

  it("keeps a configured maximum that is already inside the limit", () => {
    const res = calculateSolarPv(
      makeInput({
        ...ELECTRICALS,
        rules: [
          ...RULES,
          { rule_key: "string_size_max", rule_value: { value: 8 } },
        ],
      }),
    );
    expect(res.string_count).toBe(3);
    expect(res.warnings.join(" ")).not.toMatch(/exceeds the 13/);
  });

  it("names an inverter that cannot satisfy both limits at once", () => {
    // 450 V MPPT floor needs 16 panels at 29.066 V, above the 13 the DC limit
    // allows: no string length works, so the inverter is mismatched.
    const res = calculateSolarPv(
      makeInput({
        ...ELECTRICALS,
        inverter_mppt_min_v: 450,
        rules: [
          ...RULES,
          { rule_key: "string_size_max", rule_value: { value: 20 } },
        ],
      }),
    );
    expect(res.warnings.join(" ")).toMatch(
      /No string length satisfies both limits/,
    );
  });

  it("discloses that string length is an assumption when data is absent", () => {
    const res = calculateSolarPv(
      makeInput({
        rules: [
          ...RULES,
          { rule_key: "string_size_max", rule_value: { value: 10 } },
        ],
      }),
    );
    expect(res.warnings.join(" ")).toMatch(
      /String length is the configured assumption of 10 panels, not a voltage check/,
    );
  });

  it("returns no limits rather than inventing them", () => {
    const r = stringSeriesLimits({ module_voc_v: 41.2 });
    expect(r.max_series).toBeNull();
    expect(r.voc_cold_v).toBeNull();
  });
});
