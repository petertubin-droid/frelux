import { describe, expect, it } from "vitest";
import {
  PS_BOARDS,
  calculatePolystyreneCeiling,
  rectanglePerimeter,
  seamLengthPerM2,
  type PsCalcInput,
} from "./polystyrene-ceiling";

const base: PsCalcInput = {
  lengthM: 5,
  widthM: 4,
  includeDrops: false,
  dropHeightM: 0,
  dropPerimeterM: 0,
  boardSize: "1200x2400",
  thickness: 25,
  installation: "bonded",
  design: "flat",
  includeCornice: false,
  includePaint: false,
};

const pick = (
  result: ReturnType<typeof calculatePolystyreneCeiling>,
  key: string,
) => result.lines.find((l) => l.key === key);

describe("polystyrene ceiling take-off", () => {
  // 5 x 4 m room, 1.2 x 2.4 m boards, flat design.
  it("counts boards from measured area plus the flat design wastage", () => {
    const r = calculatePolystyreneCeiling(base);
    expect(r.flatAreaM2).toBe(20);
    expect(r.surfaceM2).toBe(20);
    expect(r.wastePct).toBe(10);
    expect(r.wasteAreaM2).toBe(2);
    // 22 m2 at 2.88 m2 per board is 7.64 boards, so 8 boards.
    expect(r.boardsRequired).toBe(8);
    expect(pick(r, "boards")?.packs).toBe(8);
  });

  // Joint density for a 1.2 x 2.4 m board is 1/1.2 + 1/2.4 = 1.25 m per m2.
  it("derives seam length from board geometry, not a fixed rate", () => {
    expect(seamLengthPerM2(PS_BOARDS["1200x2400"])).toBeCloseTo(1.25, 6);
    // 1.2 m across, 3.0 m along: 1/1.2 + 1/3.0 = 1.167 m of seam per m2.
    expect(seamLengthPerM2(PS_BOARDS["1200x3000"])).toBeCloseTo(
      1 / 1.2 + 1 / 3,
      6,
    );
    const r = calculatePolystyreneCeiling(base);
    expect(r.seamLengthM).toBe(25);
    // The wall edge adds the 18 m perimeter, so 43 m is reinforced; with a 10%
    // lap on a 45 m roll that is two rolls, not one.
    expect(r.edgeSeamM).toBe(18);
    expect(r.reinforcedSeamM).toBe(43);
    expect(pick(r, "tape")?.packs).toBe(2);
  });

  it("uses a larger board's own coverage and joint density", () => {
    const r = calculatePolystyreneCeiling({ ...base, boardSize: "1200x3000" });
    expect(r.boardAreaM2).toBe(3.6);
    // 22 m2 at 3.6 m2 per board is 6.11 boards, so 7.
    expect(r.boardsRequired).toBe(7);
    expect(r.seamLengthM).toBeCloseTo(20 * (1 / 1.2 + 1 / 3), 3);
  });

  it("adds the vertical drop area to the surface and the boards", () => {
    const r = calculatePolystyreneCeiling({
      ...base,
      includeDrops: true,
      dropHeightM: 0.2,
      dropPerimeterM: 18,
      design: "stepped",
    });
    expect(r.dropAreaM2).toBeCloseTo(3.6, 6);
    expect(r.surfaceM2).toBeCloseTo(23.6, 6);
    expect(r.wastePct).toBe(15);
    // 23.6 m2 + 15% = 27.14 m2, 9.42 boards, so 10.
    expect(r.boardsRequired).toBe(10);
  });

  it("falls back to the room perimeter when a drop run is not given", () => {
    const r = calculatePolystyreneCeiling({
      ...base,
      includeDrops: true,
      dropHeightM: 0.15,
    });
    expect(r.dropAreaM2).toBeCloseTo(0.15 * 18, 6);
  });

  it("warns instead of silently ignoring a drop with no height", () => {
    const r = calculatePolystyreneCeiling({
      ...base,
      includeDrops: true,
      dropHeightM: 0,
    });
    expect(r.dropAreaM2).toBe(0);
    expect(r.warnings.join(" ")).toMatch(/no drop height/i);
  });

  it("prices bonded work with adhesive only, and framed work with a frame", () => {
    const bonded = calculatePolystyreneCeiling(base);
    expect(pick(bonded, "adhesive")?.packs).toBe(2); // 20 m2 at 10 m2 per can
    expect(pick(bonded, "frame")).toBeUndefined();
    expect(pick(bonded, "screws")).toBeUndefined();

    const framed = calculatePolystyreneCeiling({
      ...base,
      installation: "timber",
    });
    // 20 m2 at 25 m2 per can, spotted to the frame.
    expect(pick(framed, "adhesive")?.packs).toBe(1);
    // 600 mm centres both ways is 3.33 m of frame per m2: 66.67 m, 19 lengths.
    expect(pick(framed, "frame")?.packs).toBe(19);
    expect(pick(framed, "screws")?.packs).toBe(334);
    expect(pick(framed, "nails")?.packs).toBe(112);
  });

  it("adds hangers and binding wire only for a wire-suspended drop", () => {
    const wire = calculatePolystyreneCeiling({ ...base, installation: "wire" });
    expect(pick(wire, "hangers")?.packs).toBe(14); // 20 m2 at one per 1.44 m2
    expect(pick(wire, "wire")?.quantity).toBeCloseTo(0.42, 2);
    const metal = calculatePolystyreneCeiling({
      ...base,
      installation: "metal",
    });
    expect(pick(metal, "hangers")).toBeUndefined();
    expect(pick(metal, "frame")?.label).toMatch(/metal/i);
  });

  it("adds cornice by perimeter and paint by two coats", () => {
    const r = calculatePolystyreneCeiling({
      ...base,
      includeCornice: true,
      includePaint: true,
    });
    expect(rectanglePerimeter(5, 4)).toBe(18);
    expect(pick(r, "cornice")?.quantity).toBe(18);
    expect(pick(r, "cornice")?.packs).toBe(8); // 2.4 m lengths
    expect(pick(r, "paint")?.quantity).toBe(4); // 0.2 L/m2 over 20 m2
    expect(pick(r, "paint")?.packs).toBe(1); // 20 L cans
  });

  it("keeps quantities fixed while prices and labour move the money", () => {
    const priced = calculatePolystyreneCeiling(base, {
      boards: 12000,
      adhesive: 4500,
    });
    expect(priced.materialCost).toBe(8 * 12000 + 2 * 4500);
    expect(priced.boardsRequired).toBe(8);

    const labour = calculatePolystyreneCeiling(
      { ...base, design: "stepped", labourRatePerM2: 2500 },
      { boards: 12000 },
    );
    // Stepped work carries a 1.15 labour factor over measured surface.
    expect(labour.labourCost).toBe(Math.round(20 * 2500 * 1.15 * 100) / 100);
    expect(labour.grandTotal).toBe(labour.materialCost + labour.labourCost);

    // Doubling a price must not change a single quantity.
    const dearer = calculatePolystyreneCeiling(base, {
      boards: 24000,
      adhesive: 4500,
    });
    expect(dearer.lines.map((l) => l.quantity)).toEqual(
      priced.lines.map((l) => l.quantity),
    );
  });

  it("reports which lines are still unpriced rather than pretending they are free", () => {
    const r = calculatePolystyreneCeiling(base, { boards: 12000 });
    expect(r.unpricedLines).toContain("adhesive");
    expect(r.unpricedLines).not.toContain("boards");
    expect(r.warnings.join(" ")).toMatch(/no unit price/i);
    expect(r.materialCost).toBe(8 * 12000);
  });

  it("honours a wastage override and flags thin board in a stepped design", () => {
    const r = calculatePolystyreneCeiling({ ...base, wastePctOverride: 0 });
    expect(r.wastePct).toBe(0);
    expect(r.boardsRequired).toBe(7); // 20 / 2.88 = 6.94

    const thin = calculatePolystyreneCeiling({
      ...base,
      thickness: 20,
      design: "coffered",
    });
    expect(thin.warnings.join(" ")).toMatch(/20 mm board is thin/i);
  });

  it("returns an empty, warned take-off when no dimensions are entered", () => {
    const r = calculatePolystyreneCeiling({ ...base, lengthM: 0, widthM: 0 });
    expect(r.surfaceM2).toBe(0);
    expect(r.boardsRequired).toBe(0);
    expect(r.warnings.join(" ")).toMatch(/enter the room dimensions/i);
  });
});
