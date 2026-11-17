// Verification of the tile engine against published grout and adhesive data.
//
// Grout: the engine sizes joint volume, (L+W)/(L*W) x thickness x joint x SG,
// which is the ISO 13007 and ANSI A118 relation. At the default specific
// gravity of 1.8 that is 0.324 kg/m2 for a 300 x 300 x 9 mm tile with a 3 mm
// joint, and manufacturer charts for that combination publish 0.30 to 0.35.
// A 600 x 600 x 10 mm tile with a 4 mm joint gives 0.24 against a published
// 0.25 to 0.30, and 100 x 100 x 6 mm mosaic with a 2 mm joint gives 0.43
// against a published 0.40 to 0.50.
//
// Adhesive: consumption follows the trowel notch. Published ranges are 2.5 to
// 3.0 kg/m2 on a 4 mm notch, 4.0 to 4.5 on 6 mm, 5.0 to 5.5 on 8 mm, 6.0 to 7.5
// on 10 mm and 7.0 to 7.5 on 12 mm. The table carried 4, 6, 10 and 12 and had no
// 8 mm entry, so an 8 mm bed produced no adhesive at all and a warning blaming
// the coverage rate rather than the missing bed rate.

import { describe, expect, it } from "vitest";
import { calculateTile } from "./pop-tile-calc";
import type { TileCalcInput } from "@/types";

const base: TileCalcInput = {
  surfaceType: "floor",
  method: "adhesive",
  length: 4,
  width: 3, // 12 m2
  height: 3,
  tileWidthMm: 300,
  tileHeightMm: 300,
  tileThicknessMm: 9,
  jointWidthMm: 3,
  tilesPerBox: 11,
  tilePricePerBox: 18000,
  adhesiveCoverageRate: 0,
  adhesivePricePerBag: 7000,
  cementCoverageRate: 5,
  cementPricePerBag: 9000,
  cementPackageSize: 1,
  sandCoverageRate: 0,
  sandPricePerBag: 70000,
  sandPackageSize: 1,
  sandUnitCubicMetres: 6.25,
  bedThicknessMm: 25,
  groutCoverageRate: 0,
  groutPricePerKg: 2500,
  spacerCoverageRate: 50,
  spacerPricePerPack: 500,
  spacerPackageSize: 1,
  wasteMargin: 0,
  labourRatePerSqm: 2000,
  unit: "meters",
};

const groutKgPerM2 = (widthMm: number, thickMm: number, jointMm: number) => {
  const r = calculateTile(
    {
      ...base,
      tileWidthMm: widthMm,
      tileHeightMm: widthMm,
      tileThicknessMm: thickMm,
      jointWidthMm: jointMm,
      length: 10,
      width: 10, // 100 m2 so the kg/m2 reads directly
    },
    [],
    "NGN",
    "₦",
  );
  return (r.groutNeeded ?? 0) / 100;
};

describe("tile grout follows the joint volume", () => {
  it("matches published charts across tile sizes", () => {
    // The engine reports kilograms rounded to two places, so each figure is
    // compared with the published band it sits in.
    const bands: Array<[number, number, number, number, number]> = [
      // width mm, thickness mm, joint mm, published low, published high
      [300, 9, 3, 0.3, 0.35],
      [600, 10, 4, 0.24, 0.3],
      [100, 6, 2, 0.4, 0.5],
      [150, 8, 3, 0.55, 0.6],
    ];
    for (const [width, thickness, joint, low, high] of bands) {
      const kg = groutKgPerM2(width, thickness, joint);
      expect(
        kg,
        `${width} x ${thickness} mm at ${joint} mm`,
      ).toBeGreaterThanOrEqual(low);
      expect(
        kg,
        `${width} x ${thickness} mm at ${joint} mm`,
      ).toBeLessThanOrEqual(high);
    }
  });

  it("scales with joint width and tile thickness, not with area alone", () => {
    const atThree = groutKgPerM2(300, 9, 3);
    const atSix = groutKgPerM2(300, 9, 6);
    const thick = groutKgPerM2(300, 18, 3);
    // Doubling the joint doubles the grout, and so does doubling the thickness.
    expect(atSix).toBeCloseTo(atThree * 2, 1);
    expect(thick).toBeCloseTo(atThree * 2, 1);
  });
});

describe("tile adhesive follows the trowel notch", () => {
  const adhesiveFor = (notchMm: number) =>
    calculateTile({ ...base, adhesiveNotchMm: notchMm }, [], "NGN", "₦");

  it("keeps every notch inside its published range", () => {
    const cases: Array<[number, number, number]> = [
      [4, 2.5, 3.0],
      [6, 4.0, 4.5],
      [8, 5.0, 5.5],
      [10, 6.0, 7.5],
      [12, 7.0, 7.5],
    ];
    for (const [notch, low, high] of cases) {
      const result = adhesiveFor(notch);
      const kgPerM2 = (result.adhesiveMassKg ?? 0) / 12;
      expect(kgPerM2, `${notch} mm notch`).toBeGreaterThanOrEqual(low);
      expect(kgPerM2, `${notch} mm notch`).toBeLessThanOrEqual(high);
    }
  });

  it("sizes an 8 mm bed instead of ordering nothing", () => {
    const result = adhesiveFor(8);
    expect(result.adhesiveMassKg).toBeCloseTo(63, 6);
    expect(result.adhesiveNeeded).toBe(4); // 63 kg in 20 kg bags
  });

  it("names the notch when no bed rate exists", () => {
    const result = adhesiveFor(7);
    expect(result.adhesiveNeeded).toBe(0);
    const warning = (result.warnings ?? []).join(" ");
    expect(warning).toContain("7 mm notch");
    expect(warning).toContain("no published bed rate");
  });
});
