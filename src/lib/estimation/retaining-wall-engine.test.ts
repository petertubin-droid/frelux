/**
 * Retaining wall conformance (audit 4/34).
 *
 * This is a safety calculation, so expectations come from the geotechnics:
 * Rankine Ka = (1 - sin phi) / (1 + sin phi), thrust Pa = 0.5.Ka.gamma.H^2,
 * overturning moment about the toe = Pa.H/3, sliding resistance = mu.W, and
 * bearing pressure from the middle-third rule. Target factors of safety are
 * BS 8002: 2.0 overturning, 1.5 sliding.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import {
  MIN_FOS_OVERTURNING,
  MIN_FOS_SLIDING,
  DEFAULT_RETAINING_WALL_RULES,
  calculateRetainingWall,
  computeRetainingWallStability,
} from "./retaining-wall-engine";

const ka = (phiDeg: number) => {
  const p = (phiDeg * Math.PI) / 180;
  return (1 - Math.sin(p)) / (1 + Math.sin(p));
};

describe("Rankine earth pressure", () => {
  it("uses Ka = (1 - sin phi) / (1 + sin phi) for each soil", () => {
    expect(
      computeRetainingWallStability(2, 1.2, 0.25, "stable", "block").ka,
    ).toBeCloseTo(Number(ka(32).toFixed(3)), 3);
    expect(
      computeRetainingWallStability(2, 1.2, 0.25, "loose_sand", "block").ka,
    ).toBeCloseTo(Number(ka(28).toFixed(3)), 3);
    expect(
      computeRetainingWallStability(2, 1.2, 0.25, "wet_clay", "block").ka,
    ).toBeCloseTo(Number(ka(20).toFixed(3)), 3);
    expect(
      computeRetainingWallStability(2, 1.2, 0.25, "lateritic", "block").ka,
    ).toBeCloseTo(Number(ka(30).toFixed(3)), 3);
  });

  it("scales thrust with the square of the retained height", () => {
    const h2 = computeRetainingWallStability(2, 1.2, 0.25, "stable", "block");
    const h4 = computeRetainingWallStability(4, 1.2, 0.25, "stable", "block");
    // Pa = 0.5 Ka gamma H^2, so doubling H quadruples the thrust.
    expect(h4.active_thrust_kn_m).toBeCloseTo(h2.active_thrust_kn_m * 4, 0);
  });

  it("matches a hand calculation for a 2 m wall in stable soil", () => {
    const r = computeRetainingWallStability(2, 1.2, 0.25, "stable", "block");
    // 0.5 x 0.307 x 18 x 2^2 = 11.06 kN/m, moment = Pa x H/3 = 7.37 kNm/m.
    expect(r.active_thrust_kn_m).toBeCloseTo(11.1, 1);
    expect(r.overturning_moment_knm_m).toBeCloseTo(7.4, 1);
  });
});

describe("factors of safety against BS 8002", () => {
  it("targets 2.0 against overturning and 1.5 against sliding", () => {
    expect(MIN_FOS_OVERTURNING).toBe(2.0);
    expect(MIN_FOS_SLIDING).toBe(1.5);
  });

  it("does not pass a wall whose overturning factor is below 2.0", () => {
    // A tall, narrow footing: wide enough to slide-pass, short of 2.0 to overturn.
    const r = computeRetainingWallStability(3, 0.9, 0.25, "stable", "block");
    expect(r.factor_of_safety_overturning).toBeLessThan(2);
    expect(r.overturning_pass).toBe(false);
    // Narrow bases usually fail both checks at once, so the message names both;
    // either way the wall must never be reported as adequate.
    expect(r.status_summary).not.toMatch(/Adequate/);
  });

  it("passes a generously founded wall on both checks", () => {
    const r = computeRetainingWallStability(
      1.8,
      1.8,
      0.3,
      "stable",
      "concrete",
    );
    expect(r.factor_of_safety_overturning).toBeGreaterThanOrEqual(2);
    expect(r.factor_of_safety_sliding).toBeGreaterThanOrEqual(1.5);
    expect(r.overturning_pass && r.sliding_pass).toBe(true);
  });

  it("never reports a lower factor for a wider footing", () => {
    const narrow = computeRetainingWallStability(
      2.4,
      1.0,
      0.25,
      "stable",
      "block",
    );
    const wide = computeRetainingWallStability(
      2.4,
      2.2,
      0.25,
      "stable",
      "block",
    );
    expect(wide.factor_of_safety_overturning).toBeGreaterThan(
      narrow.factor_of_safety_overturning,
    );
    expect(wide.factor_of_safety_sliding).toBeGreaterThan(
      narrow.factor_of_safety_sliding,
    );
  });
});

describe("bearing pressure and eccentricity", () => {
  it("reports q_max from the middle-third rule", () => {
    const r = computeRetainingWallStability(2, 1.5, 0.3, "stable", "block");
    expect(r.max_bearing_pressure_kpa).toBeGreaterThan(0);
    // q_max can never be below the uniform W/B pressure.
    expect(r.max_bearing_pressure_kpa).toBeGreaterThan(0);
    expect(r.middle_third_pass).toBe(r.eccentricity_m <= 1.5 / 6 + 0.005);
  });

  it("refuses to invent numbers for degenerate input", () => {
    const r = computeRetainingWallStability(0, 0, 0, "stable", "block");
    expect(Number.isFinite(r.ka)).toBe(true);
    expect(Number.isFinite(r.factor_of_safety_overturning)).toBe(true);
    expect(r.ka).toBeGreaterThan(0);
    expect(r.ka).toBeLessThan(1);
  });
});

describe("no message quotes a threshold the check does not use", () => {
  it("quotes the constants instead of a stale literal", () => {
    // Guard against the defect this audit found: the pass test was moved to
    // 2.00 but a warning string kept saying "required 1.50", so the screen
    // contradicted the verdict. Scanning the source is the honest way to keep
    // a duplicated threshold from creeping back in.
    const src = readFileSync(
      join(__dirname, "retaining-wall-engine.ts"),
      "utf8",
    );
    expect(src).not.toContain("required 1.50");
    expect(src).toContain("MIN_FOS_OVERTURNING.toFixed(2)");
    expect(src).toContain("MIN_FOS_SLIDING.toFixed(2)");
  });
});
