import { describe, expect, it } from "vitest";
import {
  DEFAULT_OPENING_DEDUCT_ABOVE_M2,
  applyWaste,
  areaM2,
  measureWall,
  openingAreaM2,
  packsRequired,
  perimeterM,
  roundUpToWhole,
  sumByUnit,
  toMetres,
} from "./measure";

describe("unit conversion", () => {
  it("converts millimetres and feet to metres", () => {
    expect(toMetres(3600, "mm")).toBe(3.6);
    expect(toMetres(12, "ft")).toBeCloseTo(3.6576, 4);
    expect(toMetres(6, "in")).toBeCloseTo(0.1524, 4);
  });

  it("treats zero, negative and non-finite lengths as nothing", () => {
    expect(toMetres(0)).toBe(0);
    expect(toMetres(-4)).toBe(0);
    expect(toMetres(Number.NaN)).toBe(0);
  });
});

describe("wall measurement", () => {
  it("deducts a door above the conventional threshold", () => {
    const wall = measureWall({
      length: 4,
      height: 3,
      openings: [{ id: "d1", width: 0.9, height: 2.1 }],
    });
    expect(wall.grossArea).toBe(12);
    expect(wall.deductedArea).toBeCloseTo(1.89, 2);
    expect(wall.netArea).toBeCloseTo(10.11, 2);
    expect(wall.deductedOpenings).toHaveLength(1);
  });

  it("measures rather than deducts a vent below the threshold", () => {
    const wall = measureWall({
      length: 4,
      height: 3,
      openings: [{ id: "v1", width: 0.3, height: 0.5 }],
    });
    expect(wall.deductedArea).toBe(0);
    expect(wall.netArea).toBe(12);
    expect(wall.measuredOpenings).toEqual([{ id: "v1", area: 0.15 }]);
  });

  it("deducts every window, not just the large ones", () => {
    const wall = measureWall({
      length: 4,
      height: 3,
      openings: [{ id: "w1", width: 0.6, height: 0.9 }],
    });
    expect(wall.deductedArea).toBe(0.54);
    expect(wall.netArea).toBeCloseTo(11.46, 2);
  });

  it("honours a per opening threshold", () => {
    const wall = measureWall({
      length: 4,
      height: 3,
      openings: [{ id: "w1", width: 0.6, height: 0.9, deductAbove: 0.4 }],
    });
    expect(wall.deductedArea).toBe(0.54);
  });

  it("accepts millimetre input without leaking a factor into the area", () => {
    const wall = measureWall({
      length: 3600,
      height: 2700,
      unit: "mm",
      openings: [{ id: "d1", width: 900, height: 2100, unit: "mm" }],
    });
    expect(wall.grossArea).toBeCloseTo(9.72, 2);
    expect(wall.netArea).toBeCloseTo(7.83, 2);
  });

  it("caps a deduction that exceeds the wall and says so", () => {
    const wall = measureWall({
      length: 2,
      height: 2,
      openings: [
        { id: "a", width: 3, height: 3 },
        { id: "b", width: 2, height: 2 },
      ],
    });
    expect(wall.deductedArea).toBe(4);
    expect(wall.netArea).toBe(0);
    expect(wall.warning).toMatch(/capped/);
  });

  it("keeps the default threshold where the platform expects it", () => {
    expect(DEFAULT_OPENING_DEDUCT_ABOVE_M2).toBe(0.5);
  });

  it("computes an opening area the same way as a wall", () => {
    expect(
      openingAreaM2({ id: "d", width: 1200, height: 1500, unit: "mm" }),
    ).toBe(1.8);
  });
});

describe("waste and purchase rounding", () => {
  it("applies waste upward only", () => {
    expect(applyWaste(100, 10)).toBe(110);
    expect(applyWaste(100, -5)).toBe(100);
    expect(applyWaste(100, Number.NaN)).toBe(100);
  });

  it("never rounds a purchase down", () => {
    expect(roundUpToWhole(4.03)).toBe(5);
    expect(roundUpToWhole(5)).toBe(5);
    expect(roundUpToWhole(0)).toBe(0);
    expect(packsRequired(11.6, 2.88)).toBe(5);
  });

  it("refuses a coverage of zero instead of dividing by it", () => {
    expect(packsRequired(10, 0)).toBe(0);
  });
});

describe("totals", () => {
  it("adds only lines that share a unit", () => {
    expect(
      sumByUnit([
        { quantity: 10.5, unit: "m2" },
        { quantity: 2, unit: "nr" },
        { quantity: 0.5, unit: "m2" },
      ]),
    ).toEqual([
      { unit: "m2", quantity: 11 },
      { unit: "nr", quantity: 2 },
    ]);
  });

  it("gives area and perimeter the expected values", () => {
    expect(areaM2(3.6, 4.2)).toBeCloseTo(15.12, 2);
    expect(perimeterM(3.6, 4.2)).toBeCloseTo(15.6, 2);
  });
});
