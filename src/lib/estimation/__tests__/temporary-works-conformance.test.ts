// Audit 14: Formwork & Temporary Works (temporary-works-standalone-engine.ts).
//
// Expectations come from how the work is measured and bought, not from the
// engine:
//   - formwork contact area per element type from the surface the concrete
//     touches (soffit, two beam sides, a column's four faces, a wall's two
//     faces);
//   - plywood bought as 2440 x 1220 mm sheets, 2.98 m2 each, after reuse;
//   - scaffold counted as a bay/lift grid with TWO rows of standards, because a
//     scaffold has an inner and an outer leg at every frame.
// Findings are recorded in docs/CALCULATOR_AUDIT.md.

import { describe, expect, it } from "vitest";
import { calculateTemporaryWorksTakeoff } from "../temporary-works-standalone-engine";

const SHEET_AREA = 2.44 * 1.22; // 2.9768 m2

describe("formwork: contact area by element", () => {
  it("measures a slab soffit as length x width", () => {
    const r = calculateTemporaryWorksTakeoff({
      marketCode: "GB",
      elements: [
        { type: "slab", lengthM: 10, widthM: 8, depthOrHeightM: 0.2 },
      ],
    });
    expect(r.formContactAreaM2).toBe(80);
  });

  it("measures a beam as soffit plus two sides", () => {
    // 6 m long, 0.3 m wide, 0.6 m deep: 1.8 soffit + 7.2 sides = 9.0 m2.
    const r = calculateTemporaryWorksTakeoff({
      marketCode: "GB",
      elements: [
        { type: "beam", lengthM: 6, widthM: 0.3, depthOrHeightM: 0.6 },
      ],
    });
    expect(r.formContactAreaM2).toBeCloseTo(9, 2);
  });

  it("measures a column as its perimeter times height", () => {
    // 0.3 x 0.3 x 3 m column: 1.2 m perimeter x 3 m = 3.6 m2.
    const r = calculateTemporaryWorksTakeoff({
      marketCode: "GB",
      elements: [
        { type: "column", lengthM: 0.3, widthM: 0.3, depthOrHeightM: 3 },
      ],
    });
    expect(r.formContactAreaM2).toBeCloseTo(3.6, 2);
  });

  it("measures a wall on both faces", () => {
    // 5 m x 2.7 m wall, formed both sides: 27 m2.
    const r = calculateTemporaryWorksTakeoff({
      marketCode: "GB",
      elements: [
        { type: "wall", lengthM: 5, widthM: 0.2, depthOrHeightM: 2.7 },
      ],
    });
    expect(r.formContactAreaM2).toBeCloseTo(27, 2);
  });

  it("multiplies repeated elements and sums a mixed pour", () => {
    const r = calculateTemporaryWorksTakeoff({
      marketCode: "GB",
      elements: [
        { type: "slab", lengthM: 10, widthM: 8, depthOrHeightM: 0.2 },
        {
          type: "column",
          lengthM: 0.3,
          widthM: 0.3,
          depthOrHeightM: 3,
          quantity: 4,
        },
      ],
    });
    expect(r.formContactAreaM2).toBeCloseTo(80 + 14.4, 2);
  });
});

describe("formwork: waste, reuse and sheets", () => {
  it("adds the cutting allowance to the contact area", () => {
    const r = calculateTemporaryWorksTakeoff({
      marketCode: "GB",
      elements: [
        { type: "slab", lengthM: 10, widthM: 8, depthOrHeightM: 0.2 },
      ],
      formworkWastePercent: 10,
    });
    expect(r.grossFormworkSheetAreaM2).toBeCloseTo(88, 2);
  });

  it("divides the gross area by the reuse cycles", () => {
    const r = calculateTemporaryWorksTakeoff({
      marketCode: "GB",
      elements: [
        { type: "slab", lengthM: 10, widthM: 8, depthOrHeightM: 0.2 },
      ],
      formworkWastePercent: 10,
      formworkReuseCycles: 4,
    });
    expect(r.reusableFormworkSheetEquivalentM2).toBeCloseTo(22, 2);
  });

  it("never divides by a reuse count below one", () => {
    const r = calculateTemporaryWorksTakeoff({
      marketCode: "GB",
      elements: [
        { type: "slab", lengthM: 10, widthM: 8, depthOrHeightM: 0.2 },
      ],
      formworkWastePercent: 0,
      formworkReuseCycles: 0,
    });
    expect(r.reusableFormworkSheetEquivalentM2).toBe(80);
    expect(Number.isFinite(r.reusableFormworkSheetEquivalentM2)).toBe(true);
  });

  it("orders whole 2440 x 1220 sheets after reuse", () => {
    // 80 m2 contact, no waste, no reuse: 80 / 2.9768 = 26.9, so 27 sheets.
    const r = calculateTemporaryWorksTakeoff({
      marketCode: "GB",
      elements: [
        { type: "slab", lengthM: 10, widthM: 8, depthOrHeightM: 0.2 },
      ],
      formworkWastePercent: 0,
    });
    expect(r.formworkSheets).toBe(Math.ceil(80 / SHEET_AREA));
    expect(r.formworkSheets).toBe(27);
  });

  it("orders fewer sheets when the formwork is reused", () => {
    const once = calculateTemporaryWorksTakeoff({
      marketCode: "GB",
      elements: [
        { type: "slab", lengthM: 10, widthM: 8, depthOrHeightM: 0.2 },
      ],
      formworkWastePercent: 0,
      formworkReuseCycles: 1,
    });
    const thrice = calculateTemporaryWorksTakeoff({
      marketCode: "GB",
      elements: [
        { type: "slab", lengthM: 10, widthM: 8, depthOrHeightM: 0.2 },
      ],
      formworkWastePercent: 0,
      formworkReuseCycles: 3,
    });
    expect(thrice.formworkSheets).toBeLessThan(once.formworkSheets);
    expect(thrice.formworkSheets).toBe(9);
  });

  it("accepts a different sheet size for a market that sells one", () => {
    const r = calculateTemporaryWorksTakeoff({
      marketCode: "US",
      elements: [
        { type: "slab", lengthM: 10, widthM: 8, depthOrHeightM: 0.2 },
      ],
      formworkWastePercent: 0,
      formworkSheetLengthMm: 2438,
      formworkSheetWidthMm: 1219,
    });
    expect(r.formworkSheets).toBe(Math.ceil(80 / (2.438 * 1.219)));
  });
});

describe("scaffold: bay and lift grid", () => {
  const scaffold = {
    marketCode: "GB",
    scaffoldRunLengthM: 20,
    scaffoldWorkingHeightM: 4,
    scaffoldBayLengthM: 2,
    scaffoldLiftHeightM: 2,
    scaffoldDeckWidthM: 0.6,
  };

  it("stands on two rows of standards at every bay position", () => {
    // 10 bays = 11 positions, 2 lifts = 3 levels, 2 rows: 66 standards.
    const r = calculateTemporaryWorksTakeoff(scaffold);
    expect(r.scaffoldStandards).toBe(66);
  });

  it("counts ledgers along both rows at every lift", () => {
    // 10 bays x 3 levels x 2 rows = 60.
    const r = calculateTemporaryWorksTakeoff(scaffold);
    expect(r.scaffoldLedgers).toBe(60);
  });

  it("counts transoms across the width at every lift", () => {
    const r = calculateTemporaryWorksTakeoff(scaffold);
    expect(r.scaffoldTransoms).toBe(40);
  });

  it("rounds a part bay up, so a 21 m run is 11 bays", () => {
    const r = calculateTemporaryWorksTakeoff({
      ...scaffold,
      scaffoldRunLengthM: 21,
    });
    expect(r.scaffoldStandards).toBe(2 * 12 * 3);
  });

  it("counts deck area and guardrails per lift", () => {
    const r = calculateTemporaryWorksTakeoff(scaffold);
    expect(r.scaffoldDeckAreaM2).toBeCloseTo(20 * 0.6 * 2, 2);
    expect(r.scaffoldGuardrailLengthM).toBeCloseTo(20 * 2 * 2, 2);
  });

  it("returns no scaffold at all when no run is entered", () => {
    const r = calculateTemporaryWorksTakeoff({ marketCode: "GB" });
    expect(r.scaffoldStandards).toBe(0);
    expect(r.scaffoldLedgers).toBe(0);
    expect(r.scaffoldDeckAreaM2).toBe(0);
  });

  it("never returns a negative or non-finite count", () => {
    const r = calculateTemporaryWorksTakeoff({
      marketCode: "GB",
      scaffoldRunLengthM: -10,
      scaffoldWorkingHeightM: -4,
      scaffoldBayLengthM: 0,
      scaffoldLiftHeightM: 0,
    });
    expect(r.scaffoldStandards).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(r.scaffoldDeckAreaM2)).toBe(true);
  });
});

describe("temporary works: honesty", () => {
  it("says it is not a scaffold design or a safety approval", () => {
    const r = calculateTemporaryWorksTakeoff({
      marketCode: "GB",
      scaffoldRunLengthM: 20,
      scaffoldWorkingHeightM: 4,
    });
    expect(r.safetyNotice).toMatch(/quantity estimate only/i);
    expect(r.safetyNotice).toMatch(/competent person/i);
    expect(r.assumptions.join(" ")).toMatch(/not a safe scaffold design/i);
  });

  it("discloses what the formwork area leaves out", () => {
    const r = calculateTemporaryWorksTakeoff({
      marketCode: "GB",
      elements: [
        { type: "slab", lengthM: 10, widthM: 8, depthOrHeightM: 0.2 },
      ],
    });
    const text = r.assumptions.join(" ");
    expect(text).toMatch(/no allowance for propping/i);
    expect(text).toMatch(/two rows of standards/i);
    expect(text).toMatch(/2440 x 1220 mm/);
  });
});
