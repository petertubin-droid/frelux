import { describe, it, expect, beforeEach } from "vitest";
import {
  CONVERSIONS,
  formatArea,
  formatAreaDual,
  formatLength,
  formatShortLength,
  formatVolume,
  formatWeight,
  getStoredUnitSystem,
  setStoredUnitSystem,
} from "./units-display";

describe("unit display conversions", () => {
  it("uses exact fixed conversion factors", () => {
    expect(CONVERSIONS.M2_TO_FT2).toBeCloseTo(10.7639104167097, 12);
    expect(CONVERSIONS.M_TO_FT).toBeCloseTo(3.28083989501312, 12);
    expect(CONVERSIONS.MM_TO_IN).toBeCloseTo(0.0393700787401575, 15);
    expect(CONVERSIONS.KG_TO_LB).toBeCloseTo(2.20462262185, 10);
    expect(CONVERSIONS.L_TO_GAL).toBeCloseTo(0.264172052358148, 12);
  });

  it("formats area in both systems", () => {
    expect(formatArea(100, "metric")).toContain("m²");
    expect(formatArea(100, "imperial")).toContain("ft²");
    // 100 m² must render as ~1076.39 ft²
    expect(formatArea(100, "imperial")).toContain("1,076");
  });

  it("formats lengths, short lengths, weights and volumes", () => {
    expect(formatLength(5, "imperial")).toContain("ft");
    expect(formatLength(5, "metric")).toContain("m");
    expect(formatShortLength(1000, "imperial")).toContain("in");
    expect(formatWeight(50, "imperial")).toContain("lb");
    expect(formatWeight(50, "metric")).toContain("kg");
    expect(formatVolume(20, "imperial")).toContain("gal");
    expect(formatVolume(20, "metric")).toContain("L");
  });

  it("dual display always shows both unit systems", () => {
    const dual = formatAreaDual(215.4);
    expect(dual).toContain("m²");
    expect(dual).toContain("ft²");
  });

  it("prefers the stored system first in dual display", () => {
    setStoredUnitSystem("imperial");
    expect(getStoredUnitSystem()).toBe("imperial");
    const dual = formatAreaDual(100);
    expect(dual.indexOf("ft²")).toBeLessThan(dual.indexOf("m²"));

    setStoredUnitSystem("metric");
    expect(getStoredUnitSystem()).toBe("metric");
    const dualMetric = formatAreaDual(100);
    expect(dualMetric.indexOf("m²")).toBeLessThan(dualMetric.indexOf("ft²"));
  });

  it("defaults to metric when nothing is stored", () => {
    window.localStorage.removeItem("frelux_unit_system");
    expect(getStoredUnitSystem()).toBe("metric");
  });
});
