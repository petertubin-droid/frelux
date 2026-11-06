import { describe, expect, it } from "vitest";
import {
  calculateWallpaperEstimate,
  type WallpaperEstimateInput,
} from "./wallpaper-calculator";

const base: WallpaperEstimateInput = {
  walls: [
    { id: "1", label: "Wall 1", widthM: 3.6, heightM: 3, doors: 0, windows: 0 },
  ],
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
    const result = calculateWallpaperEstimate({
      ...base,
      wasteRate: 0.12,
      pattern: "straight",
      patternRepeatM: 0.32,
    });
    expect(result.strips).toBe(8);
    expect(result.rolls).toBe(4);
  });

  it("adds a spare roll to purchased materials without charging install labour or paste for it", () => {
    const result = calculateWallpaperEstimate({
      ...base,
      extraRoll: true,
      adhesivePackPrice: 2_000,
    });
    expect(result.rolls).toBe(4);
    expect(result.packages).toBe(4);
    expect(result.adhesivePacks).toBe(1);
    expect(result.labourCost).toBe(13_500);
    expect(result.materialCost).toBe(52_000);
  });

  it("uses match repeats only for matched designs and adds trim allowance", () => {
    const unmatched = calculateWallpaperEstimate({
      ...base,
      pattern: "random",
      patternRepeatM: 0.64,
    });
    const matched = calculateWallpaperEstimate({
      ...base,
      pattern: "straight",
      patternRepeatM: 0.64,
    });
    expect(unmatched.rolls).toBe(3);
    expect(matched.rolls).toBeGreaterThanOrEqual(unmatched.rolls);
  });

  it("prices multi-roll packages while keeping cutting yield and labor in physical rolls", () => {
    const result = calculateWallpaperEstimate({
      ...base,
      unitsPerPackage: 2,
      rollPrice: 20_000,
    });
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
    expect(
      calculateWallpaperEstimate({
        ...base,
        stockFormat: "fixed-panel",
        unitsPerPackage: 3,
        rollWidthM: 0.6,
        rollLengthM: 3.3,
      }).packages,
    ).toBe(2);
    // A printed panel is cut to its finished size, so a 3.0 m panel covers a
    // 3.0 m wall. Only a panel shorter than the wall is rejected.
    expect(
      calculateWallpaperEstimate({
        ...base,
        stockFormat: "fixed-panel",
        rollLengthM: 3,
      }).invalidWall,
    ).toBeUndefined();
    expect(
      calculateWallpaperEstimate({
        ...base,
        stockFormat: "fixed-panel",
        rollLengthM: 2.9,
      }).invalidWall,
    ).toContain("mural panel");
  });

  it("prices adhesive packs separately when the selected system requires paste", () => {
    const result = calculateWallpaperEstimate({
      ...base,
      adhesivePackPrice: 2_000,
    });
    expect(result.adhesivePacks).toBe(1);
    expect(result.adhesiveCost).toBe(2_000);
    expect(result.materialCost).toBe(39_500);
  });

  it("does not budget paste for pre-pasted or self-adhesive products", () => {
    const result = calculateWallpaperEstimate({
      ...base,
      adhesivePackPrice: 2_000,
      adhesiveRequired: false,
    });
    expect(result.adhesivePacks).toBe(0);
    expect(result.adhesiveCost).toBe(0);
  });

  it("rejects invalid walls, invalid calculator bounds, and oversized openings", () => {
    expect(
      calculateWallpaperEstimate({ ...base, rollWidthM: 0 }).invalidWall,
    ).toBe("calculator inputs");
    expect(
      calculateWallpaperEstimate({ ...base, wasteRate: 2 }).invalidWall,
    ).toBe("calculator inputs");
    expect(
      calculateWallpaperEstimate({ ...base, rollPrice: -1 }).invalidWall,
    ).toBe("calculator inputs");
    expect(
      calculateWallpaperEstimate({
        ...base,
        walls: [{ ...base.walls[0], widthM: 0 }],
      }).invalidWall,
    ).toBe("Wall 1");
    expect(
      calculateWallpaperEstimate({
        ...base,
        walls: [{ ...base.walls[0], doors: 6 }],
      }).invalidWall,
    ).toBe("Wall 1");
  });

  it("cuts half-drop drops half a repeat longer instead of letting rounding erase the shift", () => {
    const straight = calculateWallpaperEstimate({
      ...base,
      pattern: "straight",
      patternRepeatM: 0.64,
    });
    const drop = calculateWallpaperEstimate({
      ...base,
      pattern: "drop",
      patternRepeatM: 0.64,
    });
    const straightCut = straight.walls[0].cutLengthM;
    const dropCut = drop.walls[0].cutLengthM;
    // 3.0 m wall + 0.3 m trim on a 0.64 m repeat rounds to 3.84 m; the shifted
    // drops need 0.32 m more, and the earlier version produced 3.84 for both.
    expect(straightCut).toBeCloseTo(3.84, 3);
    expect(dropCut).toBeCloseTo(4.16, 3);
    expect(drop.rolls).toBeGreaterThanOrEqual(straight.rolls);
  });

  it("does not add a repeat when the cut already lands on the repeat", () => {
    // 2.7 m + 0.3 m trim = exactly 4 x 0.75 m. Floating point division must not
    // round this up to five repeats.
    const result = calculateWallpaperEstimate({
      ...base,
      walls: [{ ...base.walls[0], heightM: 2.7 }],
      pattern: "straight",
      patternRepeatM: 0.75,
    });
    expect(result.walls[0].cutLengthM).toBeCloseTo(3, 3);
  });

  it("frees a drop only for an opening that reaches the ceiling", () => {
    const ceilingHigh = calculateWallpaperEstimate({
      ...base,
      openingWindowHeightM: 3,
      walls: [{ ...base.walls[0], windows: 1 }],
    });
    // 3.6 m wall less a 1.25 m floor-to-ceiling window leaves 2.35 m: 5 drops.
    expect(ceilingHigh.walls[0].effectiveWidthM).toBeCloseTo(2.35, 3);
    expect(ceilingHigh.walls[0].installableDrops).toBe(5);
    expect(ceilingHigh.walls[0].fullHeightOpeningM2).toBeCloseTo(3.75, 3);

    const sillHeight = calculateWallpaperEstimate({
      ...base,
      walls: [{ ...base.walls[0], windows: 1 }],
    });
    expect(sillHeight.walls[0].installableDrops).toBe(7);
    expect(sillHeight.walls[0].fullHeightOpeningM2).toBe(0);
    // The area deduction still applies either way.
    expect(sillHeight.netAreaM2).toBeCloseTo(9.3, 3);
  });

  it("reports installable drops, the waste allowance and the coverage gap separately", () => {
    const result = calculateWallpaperEstimate({ ...base, wasteRate: 0.12 });
    expect(result.installableDrops).toBe(7);
    expect(result.allowanceDrops).toBe(1);
    expect(result.strips).toBe(8);
    expect(result.installedCoverageM2).toBeCloseTo(15.9, 3);
    // Eight prepared drops still pack into three rolls; the gap to the 10.8 m2
    // wall is strip ends, trimming and the allowance drop.
    expect(result.purchasedCoverageM2).toBeCloseTo(15.9, 3);
    expect(result.patternLossM2).toBeCloseTo(5.1, 3);
  });

  it("keeps the spare roll out of installed coverage and labour", () => {
    const result = calculateWallpaperEstimate({ ...base, extraRoll: true });
    expect(result.rolls).toBe(4);
    expect(result.installedCoverageM2).toBeCloseTo(15.9, 3);
    expect(result.purchasedCoverageM2).toBeCloseTo(21.2, 3);
    expect(result.labourCost).toBe(13_500);
  });
});
