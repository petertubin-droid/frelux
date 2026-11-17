// Verification of roof sheet coverage against published product data.
//
// A stone-coated panel is published with a cover of 1250 x 368 mm and a
// specified 2.2 panels per square metre, which is 0.46 m2 of roof per panel.
// The engine carried 0.53, which is 1.89 panels per square metre: every
// stone-coated roof came out about 15 per cent short of the panels it needs.
//
// A corrugated GI sheet is ordered as 3 ft x 6 ft and loses one corrugation to
// the side lap, about 0.076 m, so it covers 0.838 x 1.829 m = 1.53 m2. Long span
// is ordered by the metre: a 1.0 m nominal sheet laps 0.1 m and covers 0.9 m.

import { describe, expect, it } from "vitest";
import {
  LONG_SPAN_COVER_WIDTH_M,
  SHEET_COVERAGE,
  getSheetCoverage,
  normalizeRoofingMaterial,
} from "@/lib/estimation/build-to-roof-engine";

const panels = (areaM2: number, perPanel: number) =>
  Math.ceil(areaM2 / perPanel);

describe("stone-coated panel coverage", () => {
  it("matches the published cover and panels per square metre", () => {
    expect(SHEET_COVERAGE.stone_coated).toBeCloseTo(0.46, 2);
    // 1 / 0.46 is 2.17 panels per m2 against a published 2.2.
    expect(1 / SHEET_COVERAGE.stone_coated).toBeCloseTo(2.17, 2);
    expect(Math.abs(1 / SHEET_COVERAGE.stone_coated - 2.2)).toBeLessThan(0.05);
  });

  it("counts the panels a 200 m2 roof needs", () => {
    expect(panels(200, SHEET_COVERAGE.stone_coated)).toBe(435);
    // The published density asks for 440. The old 0.53 asked for 378, which is
    // 62 panels short of the published figure.
    expect(panels(200, 0.53)).toBe(378);
    expect(panels(200, 1 / 2.2)).toBe(440);
  });
});

describe("corrugated GI sheet and long span", () => {
  it("keeps the corrugated sheet at the lap-reduced cover", () => {
    const effectiveWidth = 0.9144 - 0.0762;
    expect(effectiveWidth * 1.8288).toBeCloseTo(1.533, 2);
    expect(SHEET_COVERAGE.gi_sheet).toBeCloseTo(1.53, 1);
    expect(Math.abs(SHEET_COVERAGE.gi_sheet - 1.533)).toBeLessThan(0.02);
  });

  it("takes one side lap off a nominal 1.0 m long span sheet", () => {
    expect(LONG_SPAN_COVER_WIDTH_M).toBeCloseTo(0.9, 3);
    expect(1.0 - LONG_SPAN_COVER_WIDTH_M).toBeCloseTo(0.1, 3);
  });

  it("reads the material name however it was spelled", () => {
    expect(normalizeRoofingMaterial("long-span_aluminium")).toBe(
      "long_span_aluminium",
    );
    expect(normalizeRoofingMaterial("Stone Coated")).toBe("stone_coated");
    expect(normalizeRoofingMaterial("corrugated")).toBe("gi_sheet");
    expect(getSheetCoverage("stone_coated")).toBe(0.46);
  });
});
