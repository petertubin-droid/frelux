import { describe, it, expect } from "vitest";
import {
  computeRetainingWallStability,
  retainingWallGeometry,
  calculateRetainingWall,
  DEFAULT_RETAINING_WALL_RULES,
} from "@/lib/estimation/retaining-wall-engine";
import {
  calculatePlumbing,
  calculatePlumbingEngineeringMetrics,
  DEFAULT_PLUMBING_RULES,
} from "@/lib/estimation/plumbing-engine";
import {
  calculateElectrical,
  DEFAULT_ELECTRICAL_RULES,
} from "@/lib/estimation/electrical-engine";

describe("Building Structure & Services Mathematical Audit Suite", () => {
  describe("Retaining Wall Geotechnical Sizing & Stability (BS 8002 / Eurocode 7)", () => {
    it("dynamically sizes recommended base width with soil thrust factor and checks Rankine stability", () => {
      // 1.8 m wall in stable soil
      const geoStable = retainingWallGeometry(
        {
          length_m: 10,
          height_m: 1.8,
          soil_type: "stable",
          stem_type: "block",
        },
        DEFAULT_RETAINING_WALL_RULES,
      );
      expect(geoStable.recommended_footing_width_m).toBe(0.6); // base rule
      expect(geoStable.stability).toBeDefined();

      // 1.8 m wall in wet clay (soil factor 1.3 -> 0.78 m)
      const geoClay = retainingWallGeometry(
        {
          length_m: 10,
          height_m: 1.8,
          soil_type: "wet_clay",
          stem_type: "concrete",
        },
        DEFAULT_RETAINING_WALL_RULES,
      );
      expect(geoClay.recommended_footing_width_m).toBe(0.78);
      expect(geoClay.footing_factor).toBe(1.3);
      expect(geoClay.stability.ka).toBeGreaterThan(0.4);
    });

    it("verifies analytical Rankine earth pressures and overturning/sliding safety factors", () => {
      const stability = computeRetainingWallStability(
        2.0, // 2m high
        1.2, // 1.2m base
        0.25, // 0.25m thick
        "stable",
        "concrete",
        0.2,
      );

      expect(stability.ka).toBeCloseTo(0.307, 2);
      expect(stability.active_thrust_kn_m).toBeGreaterThan(0);
      expect(stability.overturning_moment_knm_m).toBeGreaterThan(0);
      expect(stability.factor_of_safety_overturning).toBeGreaterThanOrEqual(1.5);
      expect(stability.overturning_pass).toBe(true);
    });

    it("flags dangerously narrow overridden footings with safety warnings", () => {
      const res = calculateRetainingWall(
        {
          length_m: 10,
          height_m: 2.5,
          soil_type: "wet_clay",
          stem_type: "concrete",
          footing_width_override_m: 0.4, // dangerously narrow for a 2.5m wall in wet clay!
        },
        DEFAULT_RETAINING_WALL_RULES,
        {},
      );

      expect(res.ok).toBe(true);
      const overturnWarning = res.warnings.some((w) =>
        w.includes("Overturning factor of safety"),
      );
      expect(overturnWarning).toBe(true);
    });
  });

  describe("Plumbing Water Demand & Header Sizing (WSFU / Hunter's Curve / BS EN 806)", () => {
    it("computes standard WSFU fixture units and Hunter peak flow", () => {
      const metrics = calculatePlumbingEngineeringMetrics({
        taps: 6,
        sinks: 2,
        showers: 2,
        wcs: 3,
        floor_drains: 2,
      });

      // 6*1.0 + 2*1.5 + 2*2.0 + 3*2.5 = 6 + 3 + 4 + 7.5 = 20.5 WSFU
      expect(metrics.total_wsfu).toBe(20.5);
      expect(metrics.peak_flow_lpm).toBeGreaterThan(50);
      expect(metrics.peak_flow_lps).toBeGreaterThan(0.8);
      expect(metrics.recommended_header_bore_mm).toBeGreaterThan(20);
      expect(metrics.water_storage_litres_24h).toBeGreaterThanOrEqual(1500);
    });

    it("attaches engineering metrics and hydraulic step to PlumbingResult", () => {
      const res = calculatePlumbing(
        {
          taps: 4,
          wcs: 2,
          showers: 2,
          sinks: 1,
          floor_drains: 1,
          water_storage_tanks: 1,
          pumps: 1,
          cold_run_m: 25,
          hot_run_m: null,
          waste_run_m: 15,
          drainage_run_m: 12,
          labour: { mode: "none" },
        },
        DEFAULT_PLUMBING_RULES,
        {},
      );

      expect(res.engineering_metrics).toBeDefined();
      expect(res.engineering_metrics?.total_wsfu).toBeGreaterThan(0);
      const hydraulicStep = res.steps.some((s) =>
        s.label.includes("Hydraulic design demand"),
      );
      expect(hydraulicStep).toBe(true);
    });
  });

  describe("Electrical Load Diversity & Main Incomer Sizing (BS 7671 / NEC 220)", () => {
    it("calculates connected kVA, diversified demand, and recommended main breaker", () => {
      const res = calculateElectrical(
        {
          building_type: "residential",
          lighting_points: 20,
          socket_points: 16,
          dedicated_points: 2,
          switches: 12,
          distribution_boards: 1,
          avg_run_lighting_m: 10,
          avg_run_socket_m: 15,
          avg_run_dedicated_m: 20,
          avg_run_earth_m: 15,
          avg_run_feeder_m: 10,
          labour: { mode: "none" },
        },
        DEFAULT_ELECTRICAL_RULES,
        {},
      );

      expect(res.circuit_summary).toBeDefined();
      expect(res.load_analysis).toBeDefined();
      expect(res.load_analysis?.total_connected_load_va).toBeGreaterThan(5000);
      expect(res.load_analysis?.diversified_demand_va).toBeGreaterThan(2000);
      expect(res.load_analysis?.recommended_main_breaker_a).toBeGreaterThanOrEqual(25);
      expect(res.load_analysis?.recommended_service_cable_mm2).toBeGreaterThanOrEqual(10);

      const loadStep = res.steps.some((s) =>
        s.label.includes("Connected load & maximum demand"),
      );
      expect(loadStep).toBe(true);
    });
  });
});
