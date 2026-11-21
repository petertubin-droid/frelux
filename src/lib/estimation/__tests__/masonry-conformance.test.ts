import { describe, expect, it } from "vitest";
import {
  calculateMasonryTakeoff,
  type MasonryCalculationInput,
} from "@/lib/estimation/masonry-standalone-engine";

/**
 * Audit 9 conformance suite: Masonry & Blockwork.
 *
 * Unit rates are the published trade figures, worked here from the module:
 *   units/m2 = 1 / ((L + joint) x (H + joint))
 *     9-inch NG block 450 x 225 at 12 mm  = 1/0.109494 = 9.13 per m2
 *     US CMU 397 x 194 at 9.5 mm          = 1/0.080447 = 12.43 per m2
 *     UK brick 215 x 65 at 10 mm          = 1/0.016875 = 59.26 per m2
 *   solid mortar = wall volume - unit volume
 *   hollow mortar is the calibrated face-shell allowance scaled by joint
 *   dry mortar = wet x 1.33, then the mix split, cement at 1440 kg/m3
 */

const run = (over: Partial<MasonryCalculationInput> = {}) => {
  const result = calculateMasonryTakeoff({
    marketCode: "NG",
    wallLengthM: 10,
    wallHeightM: 3,
    ...over,
  });
  return result;
};

const unitRate = (lengthMm: number, heightMm: number, jointMm: number) =>
  1 / (((lengthMm + jointMm) / 1000) * ((heightMm + jointMm) / 1000));

describe("Masonry: units per square metre from the module", () => {
  it("gives 9.13 per m2 for the 9-inch sandcrete block at a 12 mm joint", () => {
    const data = run();
    expect(data.unitsPerM2).toBeCloseTo(unitRate(450, 225, 12), 2);
    expect(data.unitsPerM2).toBeCloseTo(9.13, 2);
  });

  it("gives 12.43 per m2 for the US CMU at its 3/8 inch joint", () => {
    const data = run({ marketCode: "US" });
    expect(data.unitsPerM2).toBeCloseTo(unitRate(397, 194, 9.5), 2);
  });

  it("gives 59.26 per m2 for a UK facing brick at a 10 mm joint", () => {
    const data = run({ marketCode: "GB" });
    expect(data.unitsPerM2).toBeCloseTo(unitRate(215, 65, 10), 2);
    expect(data.unitsPerM2).toBeCloseTo(59.26, 2);
  });

  it("widens the joint and orders fewer units for the same wall", () => {
    const tight = run({ jointThicknessMm: 10 });
    const wide = run({ jointThicknessMm: 20 });
    expect(wide.unitsPerM2).toBeLessThan(tight.unitsPerM2);
    expect(wide.unitsRequiredGross).toBeLessThan(tight.unitsRequiredGross);
  });

  it("doubles the units for a two-leaf wall without changing the face rate", () => {
    const single = run({ leafCount: 1 });
    const cavity = run({ leafCount: 2 });
    expect(cavity.unitsPerM2).toBeCloseTo(single.unitsPerM2, 6);
    expect(cavity.unitsPerM2Effective).toBeCloseTo(single.unitsPerM2 * 2, 1);
    expect(cavity.unitsRequiredNet).toBeCloseTo(single.unitsRequiredNet * 2, 0);
  });
});

describe("Masonry: wall area and openings", () => {
  it("deducts openings by area and quantity", () => {
    const data = run({
      openings: [
        { id: "w1", description: "Window", widthM: 1, heightM: 2, quantity: 3 },
        {
          id: "d1",
          description: "Door",
          widthM: 0.9,
          heightM: 2.1,
          quantity: 1,
        },
      ],
    });
    // 10 x 3 = 30 m2 gross, less (1x2x3) + (0.9x2.1x1) = 6 + 1.89 = 7.89.
    expect(data.grossWallAreaM2).toBeCloseTo(30, 2);
    expect(data.openingsAreaM2).toBeCloseTo(7.89, 2);
    expect(data.netWallAreaM2).toBeCloseTo(22.11, 2);
  });

  it("holds the net area at zero and says so when openings exceed the wall", () => {
    const data = run({
      openings: [
        {
          id: "big",
          description: "Overwide opening",
          widthM: 20,
          heightM: 3,
          quantity: 1,
        },
      ],
    });
    expect(data.netWallAreaM2).toBe(0);
    expect(data.unitsRequiredGross).toBe(0);
    expect(data.notices.map((n) => n.code)).toContain("openings-exceed-wall");
  });

  it("reports an unmeasured wall instead of a quantity", () => {
    const data = run({ wallLengthM: 0 });
    expect(data.unitsRequiredGross).toBe(0);
    expect(data.notices.map((n) => n.code)).toContain("wall-not-measured");
  });

  it("multiplies by the wall count", () => {
    const one = run({ wallCount: 1 });
    const four = run({ wallCount: 4 });
    expect(four.grossWallAreaM2).toBeCloseTo(one.grossWallAreaM2 * 4, 2);
    expect(four.unitsRequiredNet).toBeCloseTo(one.unitsRequiredNet * 4, 0);
  });
});

describe("Masonry: mortar and cement", () => {
  it("takes solid mortar as wall volume less unit volume", () => {
    // 5-inch solid NG block: 125 mm leaf.
    const data = run({
      wallLengthM: 10,
      wallHeightM: 3,
      selectedUnitId: "ng-sandcrete-5in",
    });
    const net = data.netWallAreaM2;
    const wallVolume = net * 0.125;
    const unitVolume = data.unitsRequiredNet * (0.45 * 0.225 * 0.125);
    expect(data.mortarVolumeM3Net).toBeCloseTo(wallVolume - unitVolume, 2);
  });

  it("scales hollow mortar with the joint, as bed and head joints are", () => {
    const standard = run({ jointThicknessMm: 12 });
    const doubled = run({ jointThicknessMm: 24 });
    expect(doubled.mortarVolumeM3Net).toBeCloseTo(
      standard.mortarVolumeM3Net * 2,
      2,
    );
  });

  it("applies the 1.33 dry factor and the mix split, then whole bags", () => {
    const data = run();
    const gross = data.mortarVolumeM3Net * 1.33 * 1.05;
    expect(data.mortarVolumeM3Gross).toBeCloseTo(gross, 2);
    // 1:5 mix: cement is one part in six of the dry volume, at 1440 kg/m3.
    const cementKg = gross * (1 / 6) * 1440;
    expect(data.cementBagsRequired).toBe(Math.ceil(cementKg / 50));
    // Water at a 0.55 water/cement ratio by mass.
    expect(data.waterLiters).toBeCloseTo(Math.round(cementKg * 0.55), 0);
  });

  it("orders more cement for a richer mix of the same mortar", () => {
    const lean = run({ mortarMixRatio: "1:6" });
    const rich = run({ mortarMixRatio: "1:3" });
    expect(rich.cementBagsRequired).toBeGreaterThan(lean.cementBagsRequired);
    expect(rich.mortarVolumeM3Gross).toBeCloseTo(lean.mortarVolumeM3Gross, 3);
  });

  it("uses the market cement bag mass, not a fixed 50 kg", () => {
    const ng = run();
    const us = run({ marketCode: "US" });
    expect(ng.cementBagWeightKg).toBe(50);
    expect(us.cementBagWeightKg).toBeCloseTo(42.6, 1);
  });
});

describe("Masonry: custom units and honest fallbacks", () => {
  it("uses a complete custom unit", () => {
    const data = run({
      customUnit: {
        name: "300 x 200 x 150",
        lengthMm: 300,
        heightMm: 200,
        widthMm: 150,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
      },
    });
    expect(data.unit.lengthMm).toBe(300);
    expect(data.unitsPerM2).toBeCloseTo(unitRate(300, 200, 10), 2);
  });

  it("ignores an incomplete custom unit and says which unit it used", () => {
    const data = run({
      customUnit: { name: "half entered", lengthMm: 300, heightMm: 0 },
    });
    expect(data.unit.lengthMm).toBe(450);
    expect(data.notices.map((n) => n.code)).toContain("custom-unit-ignored");
  });

  it("falls back to the market default for an unknown unit id, and says so", () => {
    const data = run({ selectedUnitId: "does-not-exist" });
    expect(data.unit.id).toBe("ng-sandcrete-9in");
    expect(data.notices.map((n) => n.code)).toContain("unit-not-found");
  });
});
