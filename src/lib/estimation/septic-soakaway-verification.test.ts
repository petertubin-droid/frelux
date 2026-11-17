import { describe, expect, it } from "vitest";
import { calculateSepticSizing } from "./septic-sizing-engine";

/**
 * The worksheet's only geometry is the soakaway pit, and it is where a wrong
 * sign or a lost pi term would show. The absorption area of an open-bottomed
 * cylinder is the base plus the wetted wall, A = pi D^2/4 + pi D h, which
 * rearranges to D = 2 (sqrt(h^2 + A/pi) - h). Sidewall only is D = A/(pi h) and a
 * zero-depth pit is base only, D = 2 sqrt(A/pi). Each is checked by putting the
 * solved diameter back into the area it came from, so the test does not simply
 * repeat the algebra it is meant to check.
 */
const base = {
  marketCode: "NG",
  occupants: 6,
  designFlowLitresPerPersonPerDay: 150,
  retentionDays: 1,
  storageAllowanceDays: 1,
  freeboardPercent: 10,
  acceptedSoilLoadingRateLitresPerM2PerDay: 75,
};

const areaOf = (d: number, h: number, sidewallOnly: boolean) =>
  sidewallOnly ? Math.PI * d * h : (Math.PI * d * d) / 4 + Math.PI * d * h;

describe("septic and soakaway sizing", () => {
  it("works the tank volume from flow, retention and storage", () => {
    // 6 people at 150 L is 900 L/day, two days of detention plus storage is
    // 1.800 m3, and 10 per cent freeboard takes it to 1.980 m3.
    const r = calculateSepticSizing(base);
    expect(r.dailyDesignFlowLitres).toBe(900);
    expect(r.tankWorkingVolumeM3).toBeCloseTo(1.8, 3);
    expect(r.tankTotalVolumeM3).toBeCloseTo(1.98, 3);
  });

  it("converts to US gallons at 3.78541 litres", () => {
    const r = calculateSepticSizing(base);
    expect(r.dailyDesignFlowGallons).toBeCloseTo(900 / 3.78541, 1);
    expect(r.tankWorkingVolumeGallons).toBeCloseTo(1800 / 3.78541, 1);
    expect(r.tankTotalVolumeGallons).toBeCloseTo(1980 / 3.78541, 1);
  });

  it("sizes the absorption area from the soil loading rate", () => {
    // 900 L/day over 75 L/m2/day is 12 m2.
    const r = calculateSepticSizing(base);
    expect(r.soakawayRequiredAbsorptionAreaM2).toBeCloseTo(12, 2);
    expect(r.soakawayRequiredAbsorptionAreaSqFt).toBeCloseTo(12 * 10.7639, 1);
  });

  it("solves a combined base and wall pit back to its own area", () => {
    const r = calculateSepticSizing({ ...base, soakawayDepthM: 1.5 });
    const d = r.indicativeSoakawayDiameterM as number;
    // 12 m2 in a 1.5 m deep pit: D = 2 (sqrt(2.25 + 12/pi) - 1.5) = 1.93 m.
    expect(d).toBeCloseTo(1.93, 2);
    expect(areaOf(d, 1.5, false)).toBeCloseTo(12, 1);
  });

  it("solves a sidewall-only pit and a base-only pit the same way", () => {
    const wall = calculateSepticSizing({
      ...base,
      soakawayDepthM: 1.5,
      sidewallOnly: true,
    });
    const dw = wall.indicativeSoakawayDiameterM as number;
    expect(dw).toBeCloseTo(12 / (Math.PI * 1.5), 2);
    expect(areaOf(dw, 1.5, true)).toBeCloseTo(12, 1);

    const flat = calculateSepticSizing({ ...base, soakawayDepthM: 0 });
    const df = flat.indicativeSoakawayDiameterM as number;
    expect(df).toBeCloseTo(2 * Math.sqrt(12 / Math.PI), 2);
    expect(areaOf(df, 0, false)).toBeCloseTo(12, 1);
  });

  it("returns no pit dimension without a usable loading rate or depth", () => {
    // A sidewall-only pit needs a depth to have any wall to percolate through.
    const noDepth = calculateSepticSizing({
      ...base,
      soakawayDepthM: 0,
      sidewallOnly: true,
    });
    expect(noDepth.indicativeSoakawayDiameterM).toBeNull();

    const noRate = calculateSepticSizing({
      ...base,
      acceptedSoilLoadingRateLitresPerM2PerDay: Number.NaN,
      soakawayDepthM: 1.5,
    });
    expect(noRate.soakawayRequiredAbsorptionAreaM2).toBeNull();
    expect(noRate.indicativeSoakawayDiameterM).toBeNull();
  });
});
