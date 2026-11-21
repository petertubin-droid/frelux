import { describe, expect, it } from "vitest";
import { calculateDemolitionTakeoff } from "../demolition-standalone-engine";

/**
 * Conformance suite for the demolition and debris takeoff.
 *
 * Expectations come from how demolition debris is actually measured and
 * carted away, not from the engine's own arithmetic:
 *
 * - Volume in place is the geometry of what is coming down.
 * - Broken debris bulks: published factors run about 1.3-1.5 for concrete and
 *   brickwork rubble, higher for timber and sheet roofing. The default has to
 *   sit inside the masonry band, because that is the common case.
 * - A skip is filled with loose debris and is limited by BOTH volume and mass.
 *   An 8-yard (6.1 m3) skip carries roughly 8 tonnes on the road, so a takeoff
 *   that reports volume only cannot tell you whether the booking is legal.
 * - Rubble does not fill a skip edge to edge, so the usable volume is a
 *   fraction of the nominal capacity.
 */
const wall = {
  type: "wall" as const,
  lengthM: 5,
  widthM: 2.5,
  thicknessM: 0.115,
};

describe("demolition: volume in place", () => {
  it("measures a wall as length x height x thickness", () => {
    // 5 x 2.5 x 0.115 = 1.4375 m3
    const r = calculateDemolitionTakeoff({ marketCode: "GB", items: [wall] });
    expect(r.inPlaceVolumeM3).toBeCloseTo(1.438, 3);
  });

  it("multiplies by the number of identical elements", () => {
    const one = calculateDemolitionTakeoff({ marketCode: "GB", items: [wall] });
    const three = calculateDemolitionTakeoff({
      marketCode: "GB",
      items: [{ ...wall, quantity: 3 }],
    });
    expect(three.inPlaceVolumeM3).toBeCloseTo(one.inPlaceVolumeM3 * 3, 2);
  });

  it("adds separate elements of different types", () => {
    const r = calculateDemolitionTakeoff({
      marketCode: "GB",
      items: [
        wall,
        {
          type: "slab",
          lengthM: 4,
          widthM: 3,
          thicknessM: 0.15,
        },
      ],
    });
    // 1.4375 + 1.8 = 3.2375, rounded to 3 dp by the engine.
    expect(r.inPlaceVolumeM3).toBeCloseTo(3.2375, 2);
  });

  it("returns nothing for no items, rather than a phantom load", () => {
    const r = calculateDemolitionTakeoff({ marketCode: "GB" });
    expect(r.inPlaceVolumeM3).toBe(0);
    expect(r.looseDebrisVolumeM3).toBe(0);
    expect(r.estimatedSkipLoads).toBeNull();
    expect(r.estimatedMassTonnes).toBe(0);
  });
});

describe("demolition: bulking", () => {
  it("bulks loose debris by a factor inside the published masonry band", () => {
    const r = calculateDemolitionTakeoff({ marketCode: "GB", items: [wall] });
    const factor = r.looseDebrisVolumeM3 / r.inPlaceVolumeM3;
    expect(factor).toBeGreaterThanOrEqual(1.3);
    expect(factor).toBeLessThanOrEqual(1.5);
  });

  it("honours an edited bulking factor", () => {
    const r = calculateDemolitionTakeoff({
      marketCode: "GB",
      items: [wall],
      bulkingFactor: 1.5,
    });
    expect(r.looseDebrisVolumeM3).toBeCloseTo(r.inPlaceVolumeM3 * 1.5, 2);
  });

  it("treats a factor below 1 as 1, and says so", () => {
    const r = calculateDemolitionTakeoff({
      marketCode: "GB",
      items: [wall],
      bulkingFactor: 0.8,
    });
    expect(r.looseDebrisVolumeM3).toBeCloseTo(r.inPlaceVolumeM3, 3);
    expect(r.assumptions.join(" ")).toMatch(/below 1 is treated as 1/i);
  });
});

describe("demolition: skip loads", () => {
  const base = { marketCode: "GB", items: [wall], skipCapacityM3: 6.1 };

  it("divides loose volume by the usable share of the skip", () => {
    // 1.4375 x 1.35 = 1.941 m3 loose; usable = 6.1 x 0.85 = 5.185; one skip.
    const r = calculateDemolitionTakeoff(base);
    expect(r.estimatedSkipLoads).toBe(1);
  });

  it("rounds a part-filled skip up to a whole booking", () => {
    const r = calculateDemolitionTakeoff({
      ...base,
      items: [{ ...wall, quantity: 4 }],
    });
    // 7.7625 m3 loose against 5.185 usable = 1.497, so two skips.
    expect(r.estimatedSkipLoads).toBe(2);
  });

  it("reports no skip figure when no capacity is entered", () => {
    const r = calculateDemolitionTakeoff({ marketCode: "GB", items: [wall] });
    expect(r.estimatedSkipLoads).toBeNull();
  });

  it("refuses to divide by a zero loading efficiency", () => {
    const r = calculateDemolitionTakeoff({
      ...base,
      loadingEfficiency: 0,
    });
    expect(r.estimatedSkipLoads).toBeNull();
  });

  it("a lower loading efficiency never reduces the number of skips", () => {
    const generous = calculateDemolitionTakeoff({
      ...base,
      items: [{ ...wall, quantity: 6 }],
      loadingEfficiency: 0.9,
    });
    const mean = calculateDemolitionTakeoff({
      ...base,
      items: [{ ...wall, quantity: 6 }],
      loadingEfficiency: 0.7,
    });
    expect(mean.estimatedSkipLoads!).toBeGreaterThanOrEqual(
      generous.estimatedSkipLoads!,
    );
  });
});

describe("demolition: mass", () => {
  it("estimates mass from in-place volume at the mixed-rubble default", () => {
    const r = calculateDemolitionTakeoff({ marketCode: "GB", items: [wall] });
    // 1.4375 m3 x 1.8 t/m3 = 2.5875 t
    expect(r.estimatedMassTonnes).toBeCloseTo(2.59, 1);
  });

  it("honours an edited density for a known material", () => {
    const r = calculateDemolitionTakeoff({
      marketCode: "GB",
      items: [wall],
      debrisDensityTonnesM3: 2.35,
    });
    expect(r.estimatedMassTonnes).toBeCloseTo(3.38, 1);
  });

  it("warns that a skip is limited by weight as well as volume", () => {
    const r = calculateDemolitionTakeoff({ marketCode: "GB", items: [wall] });
    expect(r.assumptions.join(" ")).toMatch(/8 tonnes|weighed/i);
  });

  it("keeps mass consistent with the volume it reports", () => {
    const r = calculateDemolitionTakeoff({
      marketCode: "GB",
      items: [{ ...wall, quantity: 2 }],
    });
    const implied = r.estimatedMassTonnes / r.inPlaceVolumeM3;
    expect(implied).toBeCloseTo(1.8, 1);
  });
});

describe("demolition: honesty", () => {
  it("says the calculator is not a method statement", () => {
    const r = calculateDemolitionTakeoff({ marketCode: "GB", items: [wall] });
    expect(r.safetyNotice).toMatch(/not a demolition method statement/i);
    expect(r.safetyNotice).toMatch(/hazardous/i);
  });

  it("never returns a negative quantity for a bad input", () => {
    const r = calculateDemolitionTakeoff({
      marketCode: "GB",
      items: [{ ...wall, lengthM: -5, quantity: -2 }],
      bulkingFactor: -3,
      debrisDensityTonnesM3: -1,
    });
    expect(r.inPlaceVolumeM3).toBe(0);
    expect(r.looseDebrisVolumeM3).toBe(0);
    expect(r.estimatedMassTonnes).toBe(0);
    expect(Number.isFinite(r.estimatedMassTonnes)).toBe(true);
  });
});
