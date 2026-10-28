import { describe, it, expect } from "vitest";
import { calculateSepticSizing } from "../estimation/septic-sizing-engine";
import {
  calculateReinforcement,
  type ReinforcementInput,
  type ReinforcementRules,
} from "../estimation/reinforcement-engine";
import { calculateCashFlow, type CashFlowInput } from "../estimation/cash-flow-engine";
import { calculateHeatComfort, type HeatComfortInput } from "../estimation/heat-comfort-engine";
import { calculateSolarPv, type SolarPvInput } from "../estimation/solar-pv-engine";
import { FULL_ENGINE_INVENTORY } from "../international/engine-inventory";
import * as fs from "fs";

describe("Deep Audit Engine Fixes & Verification", () => {
  describe("Engine 1: Septic & Soakaway Sizing Engine", () => {
    it("calculates circular plan area diameter even when depth is 0 or unprovided", () => {
      const res = calculateSepticSizing({
        marketCode: "US",
        occupants: 6,
        designFlowLitresPerPersonPerDay: 150, // 900 L/day
        retentionDays: 2,
        acceptedSoilLoadingRateLitresPerM2PerDay: 50, // requires 18 m2
        soakawayDepthM: 0,
        sidewallOnly: false,
      });

      expect(res.soakawayRequiredAbsorptionAreaM2).toBe(18);
      expect(res.indicativeSoakawayDiameterM).toBeGreaterThan(0);
      // Area = pi * (D/2)^2 => D = 2 * sqrt(18 / pi) ~ 4.79m
      expect(res.indicativeSoakawayDiameterM).toBeCloseTo(4.79, 1);
      // US Customary check:
      expect(res.dailyDesignFlowGallons).toBeGreaterThan(0);
      expect(res.tankWorkingVolumeGallons).toBeGreaterThan(0);
      expect(res.soakawayRequiredAbsorptionAreaSqFt).toBeGreaterThan(0);
    });

    it("calculates combined sidewall and bottom infiltration when depth > 0 and sidewallOnly is false", () => {
      const res = calculateSepticSizing({
        marketCode: "GB",
        occupants: 4,
        designFlowLitresPerPersonPerDay: 150, // 600 L/day
        retentionDays: 2,
        acceptedSoilLoadingRateLitresPerM2PerDay: 30, // 20 m2
        soakawayDepthM: 2,
        sidewallOnly: false,
      });

      // Combined formula: D = 2 * (sqrt(h^2 + A/pi) - h) = 2 * (sqrt(4 + 6.366) - 2) ~ 2 * (3.219 - 2) = 2.44m
      expect(res.indicativeSoakawayDiameterM).toBeCloseTo(2.44, 1);
    });
  });

  describe("Engine 2: Reinforcement Steel Engine", () => {
    it("supports 8mm and 10mm shear links/stirrups and 32mm foundation bars", () => {
      const input: ReinforcementInput = {
        len_8mm_m: 240, // stirrups
        len_10mm_m: 120, // column links
        len_12mm_m: 120,
        len_16mm_m: null,
        len_20mm_m: null,
        len_25mm_m: null,
        len_32mm_m: 60, // foundation piles
        stock_length_m: 12,
        labour: { mode: "none" },
      };

      const rules: ReinforcementRules = {
        rebar_lap_waste_pct: 10,
        binding_wire_kg_per_tonne: 8,
      };

      const res = calculateReinforcement(input, rules, {});

      expect(res.ok).toBe(true);
      expect(res.total_tonnage_kg).toBeGreaterThan(0);
      // Check that 8mm, 10mm, 32mm lines exist
      const lineKeys = res.lines.map((l) => l.key);
      expect(lineKeys).toContain("rebar_8mm");
      expect(lineKeys).toContain("rebar_10mm");
      expect(lineKeys).toContain("rebar_32mm");
    });
  });

  describe("Engine 3: Cash Flow Milestone Engine", () => {
    it("tolerates standard 33.33% commercial milestone splits (99.99%) without rejection and reconciles pennies", () => {
      const input: CashFlowInput = {
        total_amount: 100000,
        start_date: "2026-01-01",
        milestones: [
          { label: "Mobilization & Substructure", percent: 33.33, offset_months: 0 },
          { label: "Superstructure & Roof", percent: 33.33, offset_months: 2 },
          { label: "Finishing & Handover", percent: 33.33, offset_months: 4 },
        ],
        rules: [],
      };

      const res = calculateCashFlow(input);
      expect(res.ok).toBe(true);
      expect(res.payments.length).toBe(3);
      // Scheduled total must match total_amount exactly
      expect(res.scheduled_total).toBe(100000);
      expect(res.payments[2].cumulative_amount).toBe(100000);
    });
  });

  describe("Engine 4: Heat Comfort Engine", () => {
    it("handles extreme high-reflectance finishes (albedo 0.999) without false division-by-zero", () => {
      const input: HeatComfortInput = {
        surface_type: "roof",
        area_sqm: 150,
        current_category: "ultra_white_cool_roof",
        proposed_category: "standard_metal",
        factors: {
          "roof:ultra_white_cool_roof": { solar_reflectance: 0.999 },
          "roof:standard_metal": { solar_reflectance: 0.25 },
        },
        rules: [
          {
            id: "1",
            calculator_type: "heat_comfort",
            rule_key: "solar_irradiance_kwh_per_sqm_day",
            rule_value: { value: 5.5 },
            is_active: true,
          },
        ],
      };

      const res = calculateHeatComfort(input);
      expect(res.ok).toBe(true);
      expect(res.reduction_percent).not.toBeNull();
      expect(res.direction).toBe("warmer");
    });

    it("accepts imperial area in square feet", () => {
      const input: HeatComfortInput = {
        surface_type: "roof",
        area_sqft: 1614.58, // ~150 m2
        current_category: "dark_asphalt",
        proposed_category: "cool_roof",
        factors: {
          "roof:dark_asphalt": { solar_reflectance: 0.15 },
          "roof:cool_roof": { solar_reflectance: 0.75 },
        },
        rules: [
          {
            id: "1",
            calculator_type: "heat_comfort",
            rule_key: "solar_irradiance_kwh_per_sqm_day",
            rule_value: { value: 5.0 },
            is_active: true,
          },
        ],
      };

      const res = calculateHeatComfort(input);
      expect(res.ok).toBe(true);
      expect(res.area_sqm).toBeCloseTo(150, 0);
      expect(res.direction).toBe("cooler");
    });
  });

  describe("Engine 5: Solar PV Engine", () => {
    it("accepts generic labor_cost_per_panel rule and imperial cable run", () => {
      const input: SolarPvInput = {
        mode: "energy_target",
        panel: {
          watt_peak: 400,
          length_m: 1.75,
          width_m: 1.05,
          unit_price_naira: 150000,
        },
        daily_energy_target_kwh: 12,
        cable_run_m: 25,
        prices: {
          panel: { price_naira: 150000 },
        },
        rules: [
          { rule_key: "peak_sun_hours_day", rule_value: { value: 5 } },
          { rule_key: "system_loss_factor", rule_value: { value: 0.2 } },
          { rule_key: "inverter_dc_ac_ratio", rule_value: { value: 1.25 } },
          { rule_key: "rails_per_panel", rule_value: { value: 1 } },
          { rule_key: "mid_clamps_per_panel", rule_value: { value: 2 } },
          { rule_key: "end_clamps_per_panel", rule_value: { value: 0.5 } },
          { rule_key: "mc4_pairs_per_panel", rule_value: { value: 1 } },
          { rule_key: "dc_cable_per_panel_m", rule_value: { value: 3 } },
          { rule_key: "string_size_max", rule_value: { value: 12 } },
          // International key without _naira suffix:
          { rule_key: "labor_cost_per_panel", rule_value: { value: 50 } },
          { rule_key: "rounding_decimals", rule_value: { value: 2 } },
        ],
      };

      const res = calculateSolarPv(input);
      expect(res.ok).toBe(true);
      expect(res.panel_count).toBeGreaterThan(0);
      expect(res.labor_cost_naira).toBeGreaterThan(0);
    });
  });

  describe("Engine Inventory Verification", () => {
    it("verifies all 54 engines have existing source files", () => {
      expect(FULL_ENGINE_INVENTORY.length).toBe(54);

      for (const engine of FULL_ENGINE_INVENTORY) {
        // At least one valid source file must exist
        const exists = engine.sourceFiles.some((f) => fs.existsSync(f));
        expect(exists, `Engine ${engine.id} has no valid existing source files`).toBe(true);
      }
    });
  });
});
