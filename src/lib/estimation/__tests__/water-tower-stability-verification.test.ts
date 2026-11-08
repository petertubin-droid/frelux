import { describe, expect, it } from "vitest";
import { calculateWaterTowerStaging } from "../water-tower-staging-engine";

/**
 * Independent verification of the water-tower stability correction.
 *
 * The expected numbers below are hand calculations from the geometry and the
 * wind expression q = 0.613 v^2, written out here rather than taken from the
 * engine. No production function produces the expected value.
 *
 * Worked example: 5,000 L tank, 4 m tower, concrete legs, 30 m/s wind.
 *
 *   Tank      D = cbrt(4 * 5 / (pi * 1.15)) = 1.77 m
 *             H = 4 * 5 / (pi * 1.77^2)    = 2.03 m
 *   Base      max(1.5, 1.77 + 0.30)         = 2.07 m
 *   Weights   tank shell   5000 * 0.032     = 160 kg
 *             deck joists 7 * 2.07 * 7.5 + 14 * 2.07 * 0.15 * 0.025 * 600
 *                                           = 109 + 65 = 174 kg
 *             columns 4 * 0.23 * 0.23 * 4 * 2400 = 2,031 kg
 *             empty total = 160 + 174 + 2031   = 2,365 kg = 23.2 kN
 *             full  total = 2,365 + 5,000      = 7,365 kg = 72.3 kN
 *   Wind      q = 0.613 * 30^2 = 551.7      -> 552 Pa
 *             tank area   1.77 * 2.03       = 3.59 m2, Cd 0.8, arm 4 + 1.015
 *             frame area  2.07 * 4 * 0.20   = 1.66 m2, Cd 2.0, arm 2.0
 *             M = 441.6 * 3.59 * 5.015 / 1000 + 1987 * 1.66 * 2 / 1000
 *               = 7.96 + 3.66 = 11.6 kNm
 *   Overturning on the EMPTY weight (the governing case):
 *             R = 23.2 * (2.07 / 2)         = 24.0 kNm
 *             FS = 24.0 / 11.6              = 2.07
 *   On the full weight FS = 72.3 * 1.035 / 11.6 = 6.4, which is what made the
 *   old single-case calculation look safe.
 */
const CASE = {
  tankVolumeLiters: 5000,
  towerHeightMeters: 4,
  constructionMaterial: "concrete" as const,
};

describe("water tower stability, independent hand check", () => {
  const result = calculateWaterTowerStaging(CASE);
  const empty = result.loadCases.find((c) => c.id === "empty")!;
  const full = result.loadCases.find((c) => c.id === "full")!;

  it("overturning moment matches the hand wind calculation", () => {
    const q = 0.613 * 30 * 30; // Pa
    const d = Math.cbrt((4 * 5) / (Math.PI * 1.15));
    const h = (4 * 5) / (Math.PI * d * d);
    const base = Math.max(1.5, d + 0.3);
    const mTank = (q * 0.8 * (d * h) * (4 + h / 2)) / 1000;
    const mFrame = (q * 2.0 * (base * 4 * 0.2) * 2) / 1000;
    expect(result.overturningMomentKnm).toBeCloseTo(mTank + mFrame, 0);
  });

  it("empty-tank weight excludes the stored water", () => {
    // 2,365 kg of tank, deck and columns; 5,000 kg of water left out.
    expect(empty.weightKn).toBeCloseTo(23.2, 0);
    expect(full.weightKn).toBeCloseTo(72.3, 0);
    expect(full.weightKn - empty.weightKn).toBeCloseTo(49.05, 0);
  });

  it("resisting moment is the empty weight on a half base", () => {
    const expected = empty.weightKn * (result.baseSizeMeters / 2);
    expect(empty.resistingMomentKnm).toBeCloseTo(expected, 1);
  });

  it("reports a factor of 2.07 on the case that governs", () => {
    expect(empty.overturningSafetyFactor).toBeCloseTo(2.07, 1);
    expect(result.governingCaseId).toBe("empty");
    expect(result.overturningSafetyFactor).toBe(
      empty.overturningSafetyFactor,
    );
  });

  it("regression: the full tank must not be used as the stabilising weight", () => {
    // The defect this replaces reported 6.4, which passed on water that may
    // not be in the tank.
    expect(full.overturningSafetyFactor).toBeCloseTo(6.4, 0);
    expect(result.overturningSafetyFactor).toBeLessThan(
      full.overturningSafetyFactor,
    );
    expect(result.resistingMomentKnm).toBeLessThan(full.resistingMomentKnm);
  });

  it("flags leg uplift when the wind couple lifts a leg", () => {
    // 5,000 L steel tower on 6 m: light frame, heavy sail.
    const steel = calculateWaterTowerStaging({
      tankVolumeLiters: 5000,
      towerHeightMeters: 6,
      constructionMaterial: "steel",
    });
    const steelEmpty = steel.loadCases[0];
    expect(steelEmpty.overturningSafetyFactor).toBeLessThan(1.5);
    expect(steelEmpty.minLegLoadKn).toBeLessThan(0);
    expect(steelEmpty.pass).toBe(false);
    expect(
      steel.warnings.some((w) => /lift|holding-down|ballast/i.test(w)),
    ).toBe(true);
  });

  it("keeps the leg load identity: W/4 +/- M/(b*sqrt2)", () => {
    const couple =
      result.overturningMomentKnm / (result.baseSizeMeters * Math.SQRT2);
    expect(empty.maxLegLoadKn).toBeCloseTo(empty.weightKn / 4 + couple, 1);
    expect(empty.minLegLoadKn).toBeCloseTo(empty.weightKn / 4 - couple, 1);
  });

  it("checks sliding against base friction", () => {
    const expected = (0.5 * empty.weightKn) / result.windForceKn;
    expect(empty.slidingSafetyFactor).toBeCloseTo(expected, 1);
  });

  it("a tower that cannot stand empty is not reported as passing", () => {
    const tall = calculateWaterTowerStaging({
      tankVolumeLiters: 1000,
      towerHeightMeters: 6,
      constructionMaterial: "steel",
    });
    expect(tall.loadCases.every((c) => c.pass)).toBe(false);
    expect(tall.warnings.length).toBeGreaterThan(0);
  });
});
