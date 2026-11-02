import { describe, it, expect } from "vitest";
import {
  isLowConfidence,
  CONFIDENCE_THRESHOLD,
  extractMeasurements,
  measurementsPreserved,
} from "@/lib/construction-dictionary/translation-rules";

describe("translation rules", () => {
  it("isLowConfidence uses the 0.75 threshold", () => {
    expect(CONFIDENCE_THRESHOLD).toBe(0.75);
    expect(isLowConfidence(0.9)).toBe(false);
    expect(isLowConfidence(0.74)).toBe(true);
    expect(isLowConfidence(0.75)).toBe(false);
  });
  it("extractMeasurements finds values with units", () => {
    const ms = extractMeasurements(
      "I need 12 sqm and 5 bags plus 3.5 m of pipe",
    );
    expect(ms).toHaveLength(3);
    expect(ms[0].value).toBe(12);
    expect(ms[0].unit.toLowerCase()).toBe("sqm");
    expect(ms[1].value).toBe(5);
    expect(ms[2].value).toBeCloseTo(3.5);
  });
  it("handles comma decimals", () => {
    const ms = extractMeasurements("room is 4,5 m long");
    expect(ms[0].value).toBeCloseTo(4.5);
  });
  it("measurementsPreserved passes when all source measurements survive", () => {
    expect(
      measurementsPreserved(
        "I need 12 sqm of paint",
        "Vous avez besoin de 12 sqm",
      ),
    ).toBe(true);
  });
  it("measurementsPreserved fails when a measurement is altered or dropped", () => {
    expect(
      measurementsPreserved("I need 12 sqm", "Vous avez besoin de 13 sqm"),
    ).toBe(false);
    expect(measurementsPreserved("I need 12 sqm", "Combien?")).toBe(false);
  });
});
