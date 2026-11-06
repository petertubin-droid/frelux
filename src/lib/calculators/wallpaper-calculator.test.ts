import { describe, expect, it } from "vitest";
import { calculateWallpaperEstimate, type WallpaperEstimateInput } from "./wallpaper-calculator";

const base: WallpaperEstimateInput = {
  walls: [{ id: "1", label: "Wall 1", widthM: 3.6, heightM: 3, doors: 0, windows: 0 }],
  rollWidthM: 0.53,
  rollLengthM: 10,
  stockFormat: "roll",
  unitsPerPackage: 1,
  openingDoorWidthM: 0.9,
  openingDoorHeightM: 2.1,
  openingWindowWidthM: 1.25,
  openingWindowHeightM: 1.2,
  pattern: "random",
  patternRepeatM: 0,
  trimAllowanceM: 0.3,
  wasteRate: 0,
  extraRoll: false,
  rollPrice: 12_500,
  labourPerRoll: 4_500,
  adhesivePerRolls: 5,
  adhesivePackPrice: 0,
  adhesiveRequired: true,
};

describe("calculateWallpaperEstimate", () => {
  it("uses physical full-height strip yield for the illustrated 3.6m × 3m wall", () => {
    const result = calculateWallpaperEstimate(base);
    expect(result.strips).toBe(7);
    expect(result.rolls).toBe(3);
    expect(result.packages).toBe(3);
    expect(result.totalCost).toBe(51_000);
    expect(result.adhesivePacks).toBe(1);
  });

  it("deducts editable openings from area without assuming their offcuts replace full drops", () => {
    const result = calculateWallpaperEstimate({
      ...base,
      walls: [{ ...base.walls[0], doors: 1, windows: 1 }],
    });
    expect(result.openingAreaM2).toBeCloseTo(3.39);
    expect(result.netAreaM2).toBeCloseTo(7.41);
    expect(result.rolls).toBe(3);
  });

  it("rounds waste strips and applies a declared pattern-repeat cut length", () => {
    const result = calculateWallpaperEstimate({ ...base, wasteRate: 0.12, pattern: "straight", patternRepeatM: 0.32 });
    expect(result.strips).toBe(8);
    expect(result.rolls).toBe(4);
  });

  it("adds a spare roll to purchased materials without charging install labour or paste for it", () => {
    const result = calculateWallpaperEstimate({ ...base, extraRoll: true, adhesivePackPrice: 2_000 });
    expect(result.rolls).toBe(4);
    expect(result.packages).toBe(4);
    expect(result.adhesivePacks).toBe(1);
    expect(result.labourCost).toBe(13_500);
    expect(result.materialCost).toBe(52_000);
  });

  it("uses match repeats only for matched designs and adds trim allowance", () => {
    const unmatched = calculateWallpaperEstimate({ ...base, pattern: "random", patternRepeatM: 0.64 });
    const matched = calculateWallpaperEstimate({ ...base, pattern: "straight", patternRepeatM: 0.64 });
    expect(unmatched.rolls).toBe(3);
    expect(matched.rolls).toBeGreaterThanOrEqual(unmatched.rolls);
  });

  it("prices multi-roll packages while keeping cutting yield and labor in physical rolls", () => {
    const result = calculateWallpaperEstimate({ ...base, unitsPerPackage: 2, rollPrice: 20_000 });
    expect(result.rolls).toBe(3);
    expect(result.packages).toBe(2);
    expect(result.materialCost).toBe(40_000);
    expect(result.labourCost).toBe(13_500);
  });

  it("counts fixed mural panels individually instead of reusing offcuts from another panel", () => {
    const result = calculateWallpaperEstimate({
      ...base,
      walls: [{ ...base.walls[0], widthM: 3.6, heightM: 3 }],
      stockFormat: "fixed-panel",
      rollWidthM: 0.6,
      rollLengthM: 3.3,
      pattern: "random",
      patternRepeatM: 0,
      trimAllowanceM: 0.3,
    });
    expect(result.rolls).toBe(6);
    expect(calculateWallpaperEstimate({ ...base, stockFormat: "fixed-panel", unitsPerPackage: 3, rollWidthM: 0.6, rollLengthM: 3.3 }).packages).toBe(2);
    expect(calculateWallpaperEstimate({ ...base, stockFormat: "fixed-panel", rollLengthM: 3 }).invalidWall).toContain("mural panel");
  });

  it("prices adhesive packs separately when the selected system requires paste", () => {
    const result = calculateWallpaperEstimate({ ...base, adhesivePackPrice: 2_000 });
    expect(result.adhesivePacks).toBe(1);
    expect(result.adhesiveCost).toBe(2_000);
    expect(result.materialCost).toBe(39_500);
  });

  it("does not budget paste for pre-pasted or self-adhesive products", () => {
    const result = calculateWallpaperEstimate({ ...base, adhesivePackPrice: 2_000, adhesiveRequired: false });
    expect(result.adhesivePacks).toBe(0);
    expect(result.adhesiveCost).toBe(0);
  });

  it("rejects invalid walls, invalid calculator bounds, and oversized openings", () => {
    expect(calculateWallpaperEstimate({ ...base, rollWidthM: 0 }).invalidWall).toBe("calculator inputs");
    expect(calculateWallpaperEstimate({ ...base, wasteRate: 2 }).invalidWall).toBe("calculator inputs");
    expect(calculateWallpaperEstimate({ ...base, rollPrice: -1 }).invalidWall).toBe("calculator inputs");
    expect(calculateWallpaperEstimate({ ...base, walls: [{ ...base.walls[0], widthM: 0 }] }).invalidWall).toBe("Wall 1");
    expect(calculateWallpaperEstimate({ ...base, walls: [{ ...base.walls[0], doors: 6 }] }).invalidWall).toBe("Wall 1");
  });
});
