import { describe, expect, it } from "vitest";
import { calculateWallpaperEstimate, type WallpaperEstimateInput } from "./wallpaper-calculator";

const base: WallpaperEstimateInput = {
  walls: [{ id: "1", label: "Wall 1", widthM: 3.6, heightM: 3, doors: 0, windows: 0 }],
  rollWidthM: 0.53,
  rollLengthM: 10,
  openingDoorWidthM: 0.9,
  openingDoorHeightM: 2.1,
  openingWindowWidthM: 1.25,
  openingWindowHeightM: 1.2,
  pattern: "random",
  patternRepeatM: 0,
  wasteRate: 0,
  extraRoll: false,
  rollPrice: 12_500,
  labourPerRoll: 4_500,
  adhesivePerRolls: 5,
};

describe("calculateWallpaperEstimate", () => {
  it("uses physical full-height strip yield for the illustrated 3.6m × 3m wall", () => {
    const result = calculateWallpaperEstimate(base);
    expect(result.strips).toBe(7);
    expect(result.rolls).toBe(3);
    expect(result.totalCost).toBe(51_000);
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
    expect(result.rolls).toBe(3);
  });

  it("adds a spare roll only when explicitly selected", () => {
    expect(calculateWallpaperEstimate({ ...base, extraRoll: true }).rolls).toBe(4);
  });

  it("rejects invalid walls, invalid calculator bounds, and oversized openings", () => {
    expect(calculateWallpaperEstimate({ ...base, rollWidthM: 0 }).invalidWall).toBe("calculator inputs");
    expect(calculateWallpaperEstimate({ ...base, wasteRate: 2 }).invalidWall).toBe("calculator inputs");
    expect(calculateWallpaperEstimate({ ...base, walls: [{ ...base.walls[0], widthM: 0 }] }).invalidWall).toBe("Wall 1");
    expect(calculateWallpaperEstimate({ ...base, walls: [{ ...base.walls[0], doors: 6 }] }).invalidWall).toBe("Wall 1");
  });
});
