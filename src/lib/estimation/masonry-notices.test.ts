import { describe, expect, it } from "vitest";
import { calculateMasonryTakeoff } from "@/lib/estimation/masonry-standalone-engine";

const base = {
  marketCode: "NG",
  wallLengthM: 10,
  wallHeightM: 3,
};

describe("masonry notices", () => {
  it("says nothing when every input can be used as given", () => {
    expect(calculateMasonryTakeoff(base).notices).toEqual([]);
  });

  it("reports openings that exceed the wall instead of returning a silent zero", () => {
    const result = calculateMasonryTakeoff({
      ...base,
      wallLengthM: 2,
      wallHeightM: 1,
      openings: [{ widthM: 3, heightM: 3 } as never],
    });
    expect(result.netWallAreaM2).toBe(0);
    expect(result.unitsRequiredGross).toBe(0);
    const notice = result.notices.find(
      (row) => row.code === "openings-exceed-wall",
    );
    expect(notice?.message).toContain("9");
    expect(notice?.message).toContain("2");
  });

  it("names the unit it fell back to when a custom unit is unusable", () => {
    const result = calculateMasonryTakeoff({
      ...base,
      customUnit: { lengthMm: 0, heightMm: 0, widthMm: 225, isHollow: true },
    });
    const notice = result.notices.find(
      (row) => row.code === "custom-unit-ignored",
    );
    expect(notice?.message).toContain("9-inch Hollow Sandcrete Block");
    // The quantities really are the default unit's, so the notice is true.
    expect(result.unit.id).toBe("ng-sandcrete-9in");
  });

  it("reports a wall with no size rather than four zero quantities", () => {
    const result = calculateMasonryTakeoff({
      ...base,
      wallLengthM: 0,
      wallHeightM: 0,
    });
    expect(result.notices.some((row) => row.code === "wall-not-measured")).toBe(
      true,
    );
  });

  it("reports a unit id that the market does not maintain", () => {
    const result = calculateMasonryTakeoff({
      ...base,
      selectedUnitId: "does-not-exist",
    });
    const notice = result.notices.find((row) => row.code === "unit-not-found");
    expect(notice?.message).toContain("does-not-exist");
    expect(result.unit.id).toBe("ng-sandcrete-9in");
  });

  it("uses a complete custom unit without any notice", () => {
    const result = calculateMasonryTakeoff({
      ...base,
      customUnit: {
        lengthMm: 400,
        heightMm: 200,
        widthMm: 200,
        isHollow: true,
      },
    });
    expect(result.unit.id).toBe("custom-unit");
    expect(result.notices).toEqual([]);
    // 1 / (0.410 x 0.210) = 11.6129 units per m2 at a 10 mm joint.
    expect(result.unitsPerM2).toBeCloseTo(11.61, 2);
  });
});
