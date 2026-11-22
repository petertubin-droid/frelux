// =========================================================
// MATHEMATICAL PLAN ELEVATION CONFORMANCE (audit #21)
//
// The drawing-scale arithmetic. Expectations are SI definitions, not the
// engine's factors: 1 mm is 0.001 m, 1 ft is 0.3048 m, 1 in is 0.0254 m.
// =========================================================
import { describe, expect, it } from "vitest";
import {
  CALIBRATION_UNITS,
  calibrationMetres,
  pixelsPerMetre,
} from "../plan-scale";

describe("plan elevation: unit conversion", () => {
  it("converts the four calibration units at their SI definitions", () => {
    expect(calibrationMetres(3000, "mm")).toBeCloseTo(3, 10);
    expect(calibrationMetres(10, "ft")).toBeCloseTo(3.048, 10);
    expect(calibrationMetres(12, "in")).toBeCloseTo(0.3048, 10);
    expect(calibrationMetres(4.5, "m")).toBeCloseTo(4.5, 10);
  });

  it("reads a typed string the same as a number", () => {
    expect(calibrationMetres("3000", "mm")).toBeCloseTo(3, 10);
  });

  it("refuses a length that cannot be real", () => {
    expect(calibrationMetres(0, "m")).toBeNull();
    expect(calibrationMetres(-5, "m")).toBeNull();
    expect(calibrationMetres("", "m")).toBeNull();
    expect(calibrationMetres("abc", "m")).toBeNull();
    expect(calibrationMetres(Number.POSITIVE_INFINITY, "m")).toBeNull();
  });

  it("offers exactly the units it can convert", () => {
    expect(CALIBRATION_UNITS.map((u) => u.value).sort()).toEqual([
      "ft",
      "in",
      "m",
      "mm",
    ]);
  });
});

describe("plan elevation: pixels per metre", () => {
  it("divides the clicked span by the known length", () => {
    // 1000 px across a 3 m wall = 333.33 px/m
    expect(pixelsPerMetre(1000, 3)).toBeCloseTo(333.333, 3);
  });

  it("refuses to divide by nothing", () => {
    expect(pixelsPerMetre(1000, null)).toBeNull();
    expect(pixelsPerMetre(1000, 0)).toBeNull();
    expect(pixelsPerMetre(0, 3)).toBeNull();
    expect(pixelsPerMetre(-10, 3)).toBeNull();
    expect(pixelsPerMetre(Number.NaN, 3)).toBeNull();
  });

  it("round-trips: scale times length returns the clicked span", () => {
    const metres = calibrationMetres(1200, "mm") as number;
    const scale = pixelsPerMetre(640, metres) as number;
    expect(scale * metres).toBeCloseTo(640, 6);
  });

  it("gives the same scale whether the length was entered in mm or m", () => {
    const fromMm = pixelsPerMetre(640, calibrationMetres(1200, "mm"));
    const fromM = pixelsPerMetre(640, calibrationMetres(1.2, "m"));
    expect(fromMm).toBeCloseTo(fromM as number, 9);
  });
});
