// Audit 13: Paving & External Works (paving-standalone-engine.ts).
//
// Expectations come from published practice, not from the engine:
//   - unit counts from the jointed module (a 200 x 100 paver at a 3 mm joint
//     occupies 0.203 x 0.103 m, so 47.8 units per m2, not the 50 the nominal
//     face gives);
//   - bedding sand at the BS 7533-3 band of 25 to 40 mm loose under the pavers;
//   - sub-base at the 100 to 200 mm compacted DTp Type 1 band used for
//     driveways, ordered loose at a 1.25 to 1.3 factor;
//   - jointing sand at the trade rate of a 25 kg bag over 8 to 15 m2, which is
//     1.7 to 3.1 kg/m2 (some suppliers quote 3.5 kg/m2).
// Where the engine and the standard disagree, the finding goes in
// docs/CALCULATOR_AUDIT.md before any code changes.

import { describe, expect, it } from "vitest";
import { calculatePavingTakeoff } from "../paving-standalone-engine";

const base = {
  marketCode: "GB",
  areaM2: 100,
  paverLengthMm: 200,
  paverWidthMm: 100,
  jointWidthMm: 3,
  beddingDepthMm: 30,
  subbaseDepthMm: 150,
};

describe("paving: paver count from the jointed module", () => {
  it("counts 47.8 units per m2 for a 200 x 100 paver at a 3 mm joint", () => {
    // 0.203 x 0.103 = 0.020909 m2 per unit laid, so 100 m2 is 4782.8 units.
    const r = calculatePavingTakeoff({ ...base, wastePercent: 0 });
    expect(r.paversRequired).toBe(4783);
    expect(r.paversRequired / 100).toBeCloseTo(47.83, 2);
  });

  it("orders fewer than the nominal 50 per m2, because joints take space", () => {
    const r = calculatePavingTakeoff({ ...base, wastePercent: 0 });
    expect(r.paversRequired / 100).toBeLessThan(50);
    expect(r.paversRequired / 100).toBeGreaterThan(45);
  });

  it("widening the joint orders fewer pavers for the same area", () => {
    const tight = calculatePavingTakeoff({
      ...base,
      jointWidthMm: 2,
      wastePercent: 0,
    });
    const wide = calculatePavingTakeoff({
      ...base,
      jointWidthMm: 5,
      wastePercent: 0,
    });
    expect(wide.paversRequired).toBeLessThan(tight.paversRequired);
  });

  it("applies the cutting allowance on top of the module count", () => {
    const none = calculatePavingTakeoff({ ...base, wastePercent: 0 });
    const five = calculatePavingTakeoff({ ...base, wastePercent: 5 });
    expect(five.paversRequired / none.paversRequired).toBeCloseTo(1.05, 2);
  });

  it("defaults to 5 per cent cutting, and 10 per cent for herringbone", () => {
    const running = calculatePavingTakeoff({ ...base, layingPattern: "running" });
    const herringbone = calculatePavingTakeoff({
      ...base,
      layingPattern: "herringbone",
    });
    expect(running.paverWastePercent).toBe(5);
    expect(herringbone.paverWastePercent).toBe(10);
    // Herringbone is the pattern that wastes the most on cut edges.
    expect(herringbone.paversRequired).toBeGreaterThan(running.paversRequired);
  });

  it("lets an explicit allowance override the pattern default", () => {
    const r = calculatePavingTakeoff({
      ...base,
      layingPattern: "herringbone",
      wastePercent: 15,
    });
    expect(r.paverWastePercent).toBe(15);
  });
});

describe("paving: bedding sand", () => {
  it("orders loose sand for the compacted bed at the published band", () => {
    const r = calculatePavingTakeoff(base);
    // 30 mm compacted x 1.20 = 36 mm loose, inside the 25-40 mm band.
    const looseDepthMm = (r.beddingSandVolumeM3 / base.areaM2) * 1000;
    expect(looseDepthMm).toBeGreaterThanOrEqual(25);
    expect(looseDepthMm).toBeLessThanOrEqual(40);
    expect(r.beddingSandVolumeM3).toBeCloseTo(3.6, 2);
  });

  it("converts loose sand to tonnes at the 1,600 kg/m3 bulk density", () => {
    const r = calculatePavingTakeoff(base);
    expect(r.beddingSandTonnes).toBeCloseTo(5.76, 2);
  });

  it("does not let the laying pattern inflate the sand", () => {
    const running = calculatePavingTakeoff({ ...base, layingPattern: "running" });
    const herringbone = calculatePavingTakeoff({
      ...base,
      layingPattern: "herringbone",
    });
    expect(herringbone.beddingSandVolumeM3).toBe(running.beddingSandVolumeM3);
  });

  it("scales with area, not with paver size", () => {
    const small = calculatePavingTakeoff({ ...base, areaM2: 50 });
    const large = calculatePavingTakeoff({ ...base, areaM2: 100 });
    expect(large.beddingSandVolumeM3).toBeCloseTo(
      small.beddingSandVolumeM3 * 2,
      2,
    );
    const bigPavers = calculatePavingTakeoff({
      ...base,
      paverLengthMm: 300,
      paverWidthMm: 150,
    });
    expect(bigPavers.beddingSandVolumeM3).toBe(large.beddingSandVolumeM3);
  });
});

describe("paving: jointing sand", () => {
  it("orders kiln-dried sand at the trade rate for a standard block", () => {
    const r = calculatePavingTakeoff(base);
    // 4.35 per cent joint area x 40 mm fill x 1,600 kg/m3 = 2.78 kg/m2.
    const kgPerM2 = r.jointingSandKg / base.areaM2;
    expect(kgPerM2).toBeGreaterThan(1.7);
    expect(kgPerM2).toBeLessThan(3.5);
    expect(r.jointingSandKg).toBeCloseTo(278.26, 1);
  });

  it("reproduces the 3.5 kg/m2 supplier figure at a 50 mm fill", () => {
    const r = calculatePavingTakeoff({ ...base, jointSandFillDepthMm: 50 });
    expect(r.jointingSandKg / base.areaM2).toBeCloseTo(3.48, 1);
  });

  it("a 25 kg bag covers the area the trade says it does", () => {
    const r = calculatePavingTakeoff(base);
    const m2PerBag = (25 / r.jointingSandKg) * base.areaM2;
    // Suppliers put one 25 kg bag over 8 to 15 m2.
    expect(m2PerBag).toBeGreaterThan(8);
    expect(m2PerBag).toBeLessThan(15);
  });

  it("widening the joint orders more jointing sand", () => {
    const narrow = calculatePavingTakeoff({ ...base, jointWidthMm: 2 });
    const wide = calculatePavingTakeoff({ ...base, jointWidthMm: 6 });
    expect(wide.jointingSandKg).toBeGreaterThan(narrow.jointingSandKg);
  });

  it("is zero when there are no joints to fill", () => {
    const r = calculatePavingTakeoff({
      ...base,
      jointWidthMm: 0,
      jointSandFillDepthMm: 0,
    });
    expect(r.jointingSandKg).toBe(0);
  });
});

describe("paving: sub-base", () => {
  it("orders loose Type 1 for a compacted depth in the driveway band", () => {
    const r = calculatePavingTakeoff(base);
    const compactedMm = (r.compactedSubbaseVolumeM3 / base.areaM2) * 1000;
    expect(compactedMm).toBeGreaterThanOrEqual(100);
    expect(compactedMm).toBeLessThanOrEqual(200);
    expect(r.compactedSubbaseVolumeM3).toBeCloseTo(15, 2);
  });

  it("loose volume exceeds compacted volume by the compaction factor", () => {
    const r = calculatePavingTakeoff(base);
    expect(r.looseSubbaseVolumeM3).toBeGreaterThan(r.compactedSubbaseVolumeM3);
    expect(r.looseSubbaseVolumeM3 / r.compactedSubbaseVolumeM3).toBeCloseTo(
      1.25,
      3,
    );
  });

  it("converts loose volume to tonnes, so a 100 m2 drive is about 34 t", () => {
    const r = calculatePavingTakeoff(base);
    expect(r.subbaseTonnes).toBeCloseTo(33.75, 2);
  });

  it("scales with area", () => {
    const half = calculatePavingTakeoff({ ...base, areaM2: 50 });
    const full = calculatePavingTakeoff({ ...base, areaM2: 100 });
    // Each figure is rounded to 2 dp, so doubling can differ in the last digit.
    expect(Math.abs(full.subbaseTonnes - half.subbaseTonnes * 2)).toBeLessThan(
      0.02,
    );
  });
});

describe("paving: edge units", () => {
  it("counts a 12 m edge as 12 one-metre units by default", () => {
    const r = calculatePavingTakeoff({ ...base, edgeLengthM: 12 });
    expect(r.edgeUnits).toBe(12);
  });

  it("counts 20 units on the same edge for a 600 mm kerb", () => {
    const r = calculatePavingTakeoff({
      ...base,
      edgeLengthM: 12,
      edgeUnitLengthM: 0.6,
    });
    expect(r.edgeUnits).toBe(20);
  });

  it("reports no edge units at all when no edge run was entered", () => {
    const r = calculatePavingTakeoff(base);
    expect(r.edgeUnits).toBeNull();
    // And the assumptions do not talk about a run that was not asked for.
    expect(r.assumptions.join(" ")).not.toMatch(/Edge units are counted/);
  });

  it("says which edge unit length it used", () => {
    const r = calculatePavingTakeoff({ ...base, edgeLengthM: 12 });
    expect(r.assumptions.join(" ")).toMatch(/Edge units are counted at 1 m/);
  });
});

describe("paving: degenerate input", () => {
  it("returns zeros, not NaN, for a zero area", () => {
    const r = calculatePavingTakeoff({ ...base, areaM2: 0 });
    expect(r.paversRequired).toBe(0);
    expect(r.beddingSandVolumeM3).toBe(0);
    expect(r.jointingSandKg).toBe(0);
    expect(r.subbaseTonnes).toBe(0);
    expect(Number.isNaN(r.paversRequired)).toBe(false);
  });

  it("never returns a negative quantity", () => {
    const r = calculatePavingTakeoff({
      ...base,
      areaM2: -5,
      jointWidthMm: -2,
      beddingDepthMm: -10,
      subbaseDepthMm: -20,
      wastePercent: -5,
      edgeLengthM: -3,
    });
    expect(r.paversRequired).toBeGreaterThanOrEqual(0);
    expect(r.beddingSandVolumeM3).toBeGreaterThanOrEqual(0);
    expect(r.jointingSandKg).toBeGreaterThanOrEqual(0);
    expect(r.subbaseTonnes).toBeGreaterThanOrEqual(0);
    expect(r.edgeUnits ?? 0).toBeGreaterThanOrEqual(0);
  });

  it("treats a missing paver size as the 200 x 100 default", () => {
    const explicit = calculatePavingTakeoff({ ...base, wastePercent: 0 });
    const implied = calculatePavingTakeoff({
      marketCode: "GB",
      areaM2: 100,
      wastePercent: 0,
    });
    expect(implied.paversRequired).toBe(explicit.paversRequired);
  });

  it("states its assumptions rather than implying a design", () => {
    const r = calculatePavingTakeoff(base);
    const text = r.assumptions.join(" ");
    expect(text).toMatch(/confirm actual product dimensions/i);
    expect(text).toMatch(/planning inputs/i);
    expect(text).toMatch(/Jointing sand is the joint area/i);
  });
});
