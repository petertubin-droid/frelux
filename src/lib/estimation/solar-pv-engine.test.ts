/**
 * Solar/PV Estimator tests (Future Engine 16 - primary engine)
 *
 * Every expected value is hand-computed. Base panel: 550 Wp,
 * 2.28 m × 1.13 m = 2.5764 m², ₦180,000. Rules: 5.0 sun hours,
 * 0.20 loss, 1.15 DC/AC ratio, 2 rails/panel, 2 mid + 4 end
 * clamps, 1 MC4 pair, 2 m DC cable/panel, string max 10,
 * ₦15,000 labour/panel, rounding 2.
 *
 * Roof-area mode, 60 m², 15 m run:
 *   panels floor(60/2.5764) = 23 → 12.65 kWp → 50.6 kWh/day
 *   inverter 12.65/1.15 = 11.0 kW, strings ceil(23/10) = 3
 *   rails 23×2×2.28 = 104.88 m; DC cable 23×2 + 2×15 = 76 m
 *   full priced total incl. ₦345,000 labour = ₦9,386,460 (4,140,000 + 471,960 + 55,200 + 92,000 + 57,500 + 136,800 + 33,000 + 75,000 + 15,000 + 70,000 + 45,000 + 3,850,000 = 9,041,460 + 345,000)
 *
 * Energy-target mode, 30 kWh/day:
 *   required 30/(5×0.8) = 7.5 kWp → ceil(7.5/0.55) = 14 panels
 *   → 7.7 kWp, 30.8 kWh/day, needed roof area 14×2.5764 = 36.07 m²
 */

import { describe, it, expect } from "vitest";
import { calculateSolarPv, type SolarPvInput } from "./solar-pv-engine";

const panel = {
  watt_peak: 550,
  length_m: 2.28,
  width_m: 1.13,
  unit_price_naira: 180000,
};

const prices = {
  mounting_rail_per_m: { price_naira: 4500 },
  mid_clamp: { price_naira: 1200 },
  end_clamp: { price_naira: 1000 },
  mc4_connector_pair: { price_naira: 2500 },
  dc_cable_per_m: { price_naira: 1800 },
  ac_cable_per_m: { price_naira: 2200 },
  dc_breaker: { price_naira: 25000 },
  ac_breaker: { price_naira: 15000 },
  surge_protector: { price_naira: 35000 },
  earthing_kit: { price_naira: 45000 },
  inverter_price_per_kw: { price_naira: 350000 },
  battery_unit: { price_naira: 450000 },
};

const rules = [
  { rule_key: "peak_sun_hours_day", rule_value: { value: 5.0 } },
  { rule_key: "system_loss_factor", rule_value: { value: 0.2 } },
  { rule_key: "inverter_dc_ac_ratio", rule_value: { value: 1.15 } },
  { rule_key: "rails_per_panel", rule_value: { value: 2 } },
  { rule_key: "mid_clamps_per_panel", rule_value: { value: 2 } },
  { rule_key: "end_clamps_per_panel", rule_value: { value: 4 } },
  { rule_key: "mc4_pairs_per_panel", rule_value: { value: 1 } },
  { rule_key: "dc_cable_per_panel_m", rule_value: { value: 2 } },
  { rule_key: "string_size_max", rule_value: { value: 10 } },
  { rule_key: "labor_cost_per_panel_naira", rule_value: { value: 15000 } },
  { rule_key: "rounding_decimals", rule_value: { value: 2 } },
];

function makeInput(over: Partial<SolarPvInput> = {}): SolarPvInput {
  return {
    mode: "roof_area",
    panel,
    usable_roof_area_m2: 60,
    cable_run_m: 15,
    battery_storage_kwh: null,
    prices,
    rules,
    ...over,
  };
}

describe("calculateSolarPv: roof area mode", () => {
  it("computes the hand-verified full takeoff", () => {
    const res = calculateSolarPv(makeInput());
    expect(res.ok).toBe(true);
    expect(res.panel_count).toBe(23);
    expect(res.array_kwp).toBe(12.65);
    expect(res.daily_energy_kwh).toBe(50.6);
    expect(res.inverter_size_kw).toBe(11);
    expect(res.string_count).toBe(3);

    const m = Object.fromEntries(res.materials.map((l) => [l.key, l]));
    expect(m["mounting_rail_per_m"].quantity).toBe(104.88);
    expect(m["mid_clamp"].quantity).toBe(46);
    expect(m["end_clamp"].quantity).toBe(92);
    expect(m["mc4_connector_pair"].quantity).toBe(23);
    expect(m["dc_cable_per_m"].quantity).toBe(76);
    expect(m["ac_cable_per_m"].quantity).toBe(15);
    expect(m["dc_breaker"].quantity).toBe(3);
    expect(m["ac_breaker"].quantity).toBe(1);
    expect(m["surge_protector"].quantity).toBe(2);
    expect(m["earthing_kit"].quantity).toBe(1);
    expect(m["inverter_price_per_kw"].quantity).toBe(11);

    expect(m["panel"].line_cost_naira).toBe(4140000);
    expect(m["mounting_rail_per_m"].line_cost_naira).toBe(471960);
    expect(m["inverter_price_per_kw"].line_cost_naira).toBe(3850000);

    expect(res.labor_cost_naira).toBe(345000);
    expect(res.total_cost_naira).toBe(9386460);
    expect(res.warnings).toEqual([]);
  });

  it("refuses a roof smaller than one panel: nothing to estimate", () => {
    const res = calculateSolarPv(makeInput({ usable_roof_area_m2: 2 }));
    expect(res.ok).toBe(false);
    expect(res.warnings[0]).toMatch(/smaller than one panel/);
    expect(res.panel_count).toBeNull();
  });
});

describe("calculateSolarPv: energy target mode", () => {
  it("sizes the array for the hand-verified 30 kWh/day target", () => {
    const res = calculateSolarPv(
      makeInput({
        mode: "energy_target",
        daily_energy_target_kwh: 30,
        usable_roof_area_m2: undefined,
      }),
    );
    expect(res.ok).toBe(true);
    expect(res.panel_count).toBe(14);
    expect(res.array_kwp).toBe(7.7);
    expect(res.daily_energy_kwh).toBe(30.8);
    expect(res.needed_roof_area_m2).toBe(36.07);
    expect(res.string_count).toBe(2); // ceil(14/10)
  });

  it("refuses a target that physically cannot fit the given roof", () => {
    const res = calculateSolarPv(
      makeInput({
        mode: "energy_target",
        daily_energy_target_kwh: 30,
        usable_roof_area_m2: 20,
      }),
    );
    expect(res.ok).toBe(false);
    expect(res.warnings[0]).toMatch(
      /needs 36\.07 m² of roof but only 20 m² is available/,
    );
  });
});

describe("calculateSolarPv: batteries", () => {
  it("sizes the battery bank from the configured unit capacity (10 kWh ÷ 5.12 → 2 units)", () => {
    const res = calculateSolarPv(
      makeInput({
        battery_storage_kwh: 10,
        rules: [
          ...rules,
          {
            rule_key: "battery_unit_capacity_kwh",
            rule_value: { value: 5.12 },
          },
        ],
      }),
    );
    expect(res.ok).toBe(true);
    expect(res.battery_count).toBe(2);
    const battery = res.materials.find((l) => l.key === "battery_unit");
    expect(battery?.quantity).toBe(2);
    expect(battery?.line_cost_naira).toBe(900000);
  });

  it("refuses to invent a battery unit capacity when storage is requested but the rule is missing", () => {
    const res = calculateSolarPv(makeInput({ battery_storage_kwh: 10 }));
    expect(res.ok).toBe(false);
    expect(res.warnings[0]).toMatch(/refuses to invent a battery size/);
  });
});

describe("calculateSolarPv: honesty guarantees", () => {
  it("refuses without a configured panel model: specs never guessed", () => {
    const res = calculateSolarPv(makeInput({ panel: null }));
    expect(res.ok).toBe(false);
    expect(res.warnings[0]).toMatch(
      /refuses to guess panel wattage or dimensions/,
    );
  });

  it("refuses each missing rule by name, one at a time", () => {
    for (const key of [
      "peak_sun_hours_day",
      "string_size_max",
      "labor_cost_per_panel_naira",
    ]) {
      const res = calculateSolarPv(
        makeInput({ rules: rules.filter((x) => x.rule_key !== key) }),
      );
      expect(res.ok).toBe(false);
      expect(res.warnings[0]).toMatch(
        new RegExp(`'${key}' rule is configured`),
      );
    }
  });

  it("reports unpriced components honestly and refuses to total an incomplete estimate", () => {
    const partialPrices = { ...prices } as Record<
      string,
      { price_naira: number | null }
    >;
    delete partialPrices["inverter_price_per_kw"];
    const res = calculateSolarPv(makeInput({ prices: partialPrices }));
    expect(res.ok).toBe(true);
    expect(res.warnings[0]).toMatch(/No price is configured for: Inverter/);
    expect(res.total_cost_naira).toBeNull();
    // 9,386,460 − 3,850,000 = 5,536,460 still reported as the priced-lines sum
    expect(res.total_of_priced_lines_naira).toBe(5536460);
    const inverterLine = res.materials.find(
      (l) => l.key === "inverter_price_per_kw",
    );
    expect(inverterLine?.quantity).toBe(11);
    expect(inverterLine?.line_cost_naira).toBeNull();
  });

  it("reports an unpriced panel model honestly", () => {
    const res = calculateSolarPv(
      makeInput({ panel: { ...panel, unit_price_naira: null } }),
    );
    expect(res.ok).toBe(true);
    expect(res.warnings[0]).toMatch(/No price is configured for: Solar panels/);
    // total without panels: 9,386,460 − 4,140,000 = 5,246,460
    expect(res.total_of_priced_lines_naira).toBe(5246460);
  });

  it("refuses a negative configured price: invalid data, not a zero price", () => {
    const res = calculateSolarPv(
      makeInput({ prices: { ...prices, dc_breaker: { price_naira: -500 } } }),
    );
    expect(res.ok).toBe(false);
    expect(res.warnings[0]).toMatch(/invalid price/);
  });

  it("refuses an invalid cable run", () => {
    expect(calculateSolarPv(makeInput({ cable_run_m: 0 })).ok).toBe(false);
    const res = calculateSolarPv(makeInput({ cable_run_m: -5 }));
    expect(res.warnings[0]).toMatch(/cable run/);
  });

  it("refuses an invalid panel model spec", () => {
    const res = calculateSolarPv(
      makeInput({
        panel: {
          watt_peak: 0,
          length_m: 2.28,
          width_m: 1.13,
          unit_price_naira: 180000,
        },
      }),
    );
    expect(res.ok).toBe(false);
    expect(res.warnings[0]).toMatch(/invalid specs/);
  });

  it("refuses a loss factor of 100% or a zero DC/AC ratio", () => {
    const res = calculateSolarPv(
      makeInput({
        rules: rules.map((x) =>
          x.rule_key === "system_loss_factor"
            ? { ...x, rule_value: { value: 1 } }
            : x,
        ),
      }),
    );
    expect(res.ok).toBe(false);
    expect(res.warnings[0]).toMatch(/system_loss_factor/);
    const res2 = calculateSolarPv(
      makeInput({
        rules: rules.map((x) =>
          x.rule_key === "inverter_dc_ac_ratio"
            ? { ...x, rule_value: { value: 0 } }
            : x,
        ),
      }),
    );
    expect(res2.ok).toBe(false);
    expect(res2.warnings[0]).toMatch(/inverter_dc_ac_ratio/);
  });
});
