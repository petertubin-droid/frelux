import { describe, it, expect } from "vitest";
import {
  areaInMillimetresSquared,
  boundingBox,
  calibrateMillimetresPerPixel,
  deductOpenings,
  measurePolygonInMillimetres,
  pointInPolygon,
  polygonArea,
  polygonPerimeter,
  rectangle,
  scalePolygon,
  signedArea,
} from "./polygon";

const square = rectangle(0, 0, 10, 10);

describe("polygonArea", () => {
  it("measures a square", () => {
    expect(polygonArea(square)).toBeCloseTo(100, 9);
  });

  it("measures a 3-4-5 triangle as 6", () => {
    const triangle = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 0, y: 3 },
    ];
    expect(polygonArea(triangle)).toBeCloseTo(6, 9);
    expect(polygonPerimeter(triangle)).toBeCloseTo(12, 9);
  });

  it("measures an L-shaped elevation exactly, not by bounding box", () => {
    const lShape = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 4 },
      { x: 4, y: 4 },
      { x: 4, y: 10 },
      { x: 0, y: 10 },
    ];
    // 10x4 + 4x6 = 64, where the bounding box would wrongly say 100.
    expect(polygonArea(lShape)).toBeCloseTo(64, 9);
  });

  it("flips sign with winding but never returns a negative area", () => {
    const clockwise = [...square].reverse();
    expect(signedArea(clockwise)).toBeCloseTo(-100, 9);
    expect(signedArea(square)).toBeCloseTo(100, 9);
    expect(polygonArea(clockwise)).toBeCloseTo(100, 9);
  });

  it("returns zero for degenerate shapes", () => {
    expect(polygonArea([])).toBe(0);
    expect(
      polygonArea([
        { x: 0, y: 0 },
        { x: 5, y: 5 },
      ]),
    ).toBe(0);
  });
});

describe("calibration", () => {
  it("turns one known length into millimetres per pixel", () => {
    expect(calibrateMillimetresPerPixel(12000, 400)).toBeCloseTo(30, 12);
    expect(calibrateMillimetresPerPixel(2100, 84)).toBeCloseTo(25, 12);
  });

  it("refuses a length or a span that cannot be real", () => {
    expect(calibrateMillimetresPerPixel(0, 400)).toBeNull();
    expect(calibrateMillimetresPerPixel(-5, 400)).toBeNull();
    expect(calibrateMillimetresPerPixel(12000, 0)).toBeNull();
    expect(calibrateMillimetresPerPixel(Number.NaN, 400)).toBeNull();
  });

  it("converts a pixel area with the square of the ratio", () => {
    // 100 px² at 30 mm/px is 90 000 mm², not 3 000.
    expect(areaInMillimetresSquared(100, 30)).toBeCloseTo(90_000, 6);
    expect(areaInMillimetresSquared(100, 0)).toBeNull();
  });

  it("measures a scaled polygon in millimetres", () => {
    const measured = measurePolygonInMillimetres(square, 30)!;
    expect(measured.areaMm2).toBeCloseTo(90_000, 6);
    expect(measured.perimeterMm).toBeCloseTo(1200, 6);
    expect(measurePolygonInMillimetres(square, -1)).toBeNull();
  });

  it("scales every vertex without mutating the input", () => {
    const scaled = scalePolygon(square, 30);
    expect(scaled[1]).toEqual({ x: 300, y: 0 });
    expect(square[1]).toEqual({ x: 10, y: 0 });
  });
});

describe("deductOpenings", () => {
  it("subtracts doors and windows from the gross wall", () => {
    const gross = 10_000_000; // 10 m²
    const door = 900 * 2100; // 1.89 m²
    const window = 1200 * 1200; // 1.44 m²
    const result = deductOpenings(gross, [door, window, window]);
    expect(result.deductedMm2).toBeCloseTo(4_770_000, 6);
    expect(result.netMm2).toBeCloseTo(5_230_000, 6);
    expect(result.overDeducted).toBe(false);
  });

  it("floors at zero and flags openings that exceed the wall", () => {
    const result = deductOpenings(1_000_000, [2_000_000]);
    expect(result.netMm2).toBe(0);
    expect(result.overDeducted).toBe(true);
  });

  it("ignores negative and non-finite opening areas", () => {
    const result = deductOpenings(1_000_000, [-50, Number.NaN, 250_000]);
    expect(result.deductedMm2).toBeCloseTo(250_000, 6);
    expect(result.netMm2).toBeCloseTo(750_000, 6);
  });
});

describe("boundingBox and pointInPolygon", () => {
  it("reports the extent of a polygon", () => {
    expect(boundingBox(square)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 10,
      maxY: 10,
      width: 10,
      height: 10,
    });
    expect(boundingBox([])).toBeNull();
  });

  it("knows inside from outside", () => {
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
    expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
  });
});
