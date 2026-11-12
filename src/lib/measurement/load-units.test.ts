import { describe, it, expect } from "vitest";
import {
  KN_PER_M_PER_LB_PER_FT,
  KN_PER_KIP,
  KPA_PER_PSF,
  lineLoadToKnPerM,
  pointLoadToKn,
  formatPressure,
} from "./load-units";

describe("load units", () => {
  it("uses exact definitions for the foot and the pound", () => {
    expect(KN_PER_M_PER_LB_PER_FT).toBeCloseTo(0.0145939, 6);
    expect(KN_PER_KIP).toBeCloseTo(4.4482216, 6);
    expect(KPA_PER_PSF).toBeCloseTo(0.04788026, 7);
  });
  it("converts a 1000 plf wall to 14.59 kN/m", () => {
    expect(lineLoadToKnPerM(1000, "imperial")).toBeCloseTo(14.594, 3);
  });
  it("converts a 45 kip column to 200 kN", () => {
    expect(pointLoadToKn(45, "imperial")).toBeCloseTo(200.17, 1);
  });
  it("shows 200 kPa as 4177 psf", () => {
    expect(formatPressure(200, "imperial")).toBe("4177 psf");
    expect(formatPressure(200, "metric")).toBe("200 kN/m²");
  });
});
