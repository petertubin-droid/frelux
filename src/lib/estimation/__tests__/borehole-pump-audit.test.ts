/**
 * Regression tests for the pump selection audit.
 *
 * These cover the three faults found when the borehole engine was audited: a
 * negative drawdown in shallow holes, a pump set inside the screen or past the
 * cas, and a motor silently capped at the largest stocked rating when the duty
 * needed more.
 */
import { describe, expect, it } from "vitest";
import { calculateBoreholeWaterSystem } from "../borehole-water-system-engine";

const base = {
  drillingDepthMeters: 60,
  staticWaterLevelMeters: 12,
  expectedYieldM3PerHour: 2.5,
  householdOccupants: 6,
  marketCode: "NG",
};

describe("borehole pump selection audit", () => {
  it("never returns a negative drawdown when the screen sits deep", () => {
    // 30 m hole, water at 25 m and a 6 m screen leaves no headroom at all.
    const result = calculateBoreholeWaterSystem({
      ...base,
      drillingDepthMeters: 30,
      staticWaterLevelMeters: 25,
      expectedYieldM3PerHour: 6,
    });
    expect(result.pumping.drawdownMeters).toBeGreaterThanOrEqual(0);
    expect(result.pumping.dynamicWaterLevelMeters).toBeGreaterThanOrEqual(
      result.pumping.staticWaterLevelMeters,
    );
  });

  it("keeps the pump inside the cased section", () => {
    const result = calculateBoreholeWaterSystem(base);
    expect(result.pumping.pumpSettingDepthMeters).toBeLessThanOrEqual(
      result.well.plainCasingMeters,
    );
    expect(result.pumping.pumpSettingDepthMeters).toBeGreaterThan(
      result.pumping.dynamicWaterLevelMeters,
    );
  });

  it("says so when the casing is too shallow for the ideal setting", () => {
    const result = calculateBoreholeWaterSystem({
      ...base,
      drillingDepthMeters: 30,
      staticWaterLevelMeters: 25,
      expectedYieldM3PerHour: 6,
    });
    expect(result.pumping.warnings.length).toBeGreaterThan(0);
    expect(result.pumping.warnings.join(" ")).toMatch(
      /cased section|submergence|screen/i,
    );
  });

  it("flags a duty that needs more than the largest stocked motor", () => {
    const result = calculateBoreholeWaterSystem({
      ...base,
      drillingDepthMeters: 300,
      staticWaterLevelMeters: 30,
      expectedYieldM3PerHour: 20,
      householdOccupants: 60,
      tankElevationMeters: 12,
    });
    expect(result.pumping.recommendedMotorHp).toBe(20);
    expect(result.pumping.warnings.join(" ")).toMatch(
      /above the largest standard rating/i,
    );
  });

  it("returns an empty warning list for an ordinary domestic borehole", () => {
    const result = calculateBoreholeWaterSystem(base);
    expect(Array.isArray(result.pumping.warnings)).toBe(true);
    expect(result.pumping.warnings).toEqual([]);
  });
});
