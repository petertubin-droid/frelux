import { describe, expect, it } from "vitest";
import {
  BS8666_SHAPES,
  bbsToCsv,
  bs8666CutLength,
  bs8666LinkHookMm,
  bs8666MandrelDiameterMm,
  buildBarBendingSchedule,
  rebarKgPerMetre,
  type BbsBarInput,
} from "../reinforcement-engine";

describe("BS 8666 shape codes", () => {
  it("publishes the four schedule shapes with their dimension letters", () => {
    expect(BS8666_SHAPES["00"].name).toBe("Straight");
    expect(BS8666_SHAPES["00"].requiredDims).toEqual(["a"]);
    expect(BS8666_SHAPES["11"].requiredDims).toEqual(["a", "b"]);
    expect(BS8666_SHAPES["21"].requiredDims).toEqual(["a", "b", "c"]);
    expect(BS8666_SHAPES["51"].hasHooks).toBe(true);
  });

  it("uses 4d mandrels up to 16 mm and 7d above", () => {
    expect(bs8666MandrelDiameterMm(12)).toBe(48);
    expect(bs8666MandrelDiameterMm(16)).toBe(64);
    expect(bs8666MandrelDiameterMm(20)).toBe(140);
  });

  it("gives links a hook tail of max(10d, 75 mm)", () => {
    expect(bs8666LinkHookMm(6)).toBe(75);
    expect(bs8666LinkHookMm(12)).toBe(120);
  });

  it("computes a straight bar as dimension A with no allowance", () => {
    const cut = bs8666CutLength({
      shapeCode: "00",
      diameterMm: 16,
      dims: { a: 3200 },
    });
    expect(cut.ok).toBe(true);
    expect(cut.cutLengthMm).toBe(3200);
    expect(cut.bendAllowanceMm).toBe(0);
    expect(cut.formula).toContain("L = A = 3200");
  });

  it("deducts the bend geometry on an L-bar (neutral axis, not a guess)", () => {
    const cut = bs8666CutLength({
      shapeCode: "11",
      diameterMm: 12,
      dims: { a: 1000, b: 500 },
    });
    expect(cut.ok).toBe(true);
    // 1000 + 500 - 2(24 + 12) + (pi/2)(24 + 6) = 1475.1 mm
    expect(cut.cutLengthMm).toBe(1475.1);
    expect(cut.mandrelDiameterMm).toBe(48);
    expect(cut.formula).toContain("475");
  });

  it("computes a U-bar with two 90 degree bends", () => {
    const cut = bs8666CutLength({
      shapeCode: "21",
      diameterMm: 12,
      dims: { a: 1000, b: 400, c: 1000 },
    });
    expect(cut.ok).toBe(true);
    // 2400 - 4(36) + 2(pi/2)(30) = 2350.2 mm
    expect(cut.cutLengthMm).toBe(2350.2);
  });

  it("computes a closed link with four bends and two hooks", () => {
    const cut = bs8666CutLength({
      shapeCode: "51",
      diameterMm: 8,
      dims: { a: 250, b: 450 },
    });
    expect(cut.ok).toBe(true);
    // 1400 - 8(24) + 4(pi/2)(20) + 2(80) = 1493.7 mm
    expect(cut.cutLengthMm).toBe(1493.7);
    expect(cut.hookAllowanceMm).toBe(160);
  });

  it("refuses a shape whose dimensions are missing instead of assuming", () => {
    const cut = bs8666CutLength({
      shapeCode: "11",
      diameterMm: 12,
      dims: { a: 1000 },
    });
    expect(cut.ok).toBe(false);
    expect(cut.cutLengthMm).toBeNull();
    expect(cut.errors.join(" ")).toContain("dimension B");
  });

  it("warns when a leg is shorter than the formable minimum", () => {
    const cut = bs8666CutLength({
      shapeCode: "11",
      diameterMm: 25,
      dims: { a: 40, b: 900 },
    });
    expect(cut.warnings.join(" ")).toContain("below the minimum formable leg");
  });

  it("uses BS 4449 nominal mass", () => {
    expect(rebarKgPerMetre(12)).toBeCloseTo(0.8878, 4);
    expect(rebarKgPerMetre(25)).toBeCloseTo(3.8531, 4);
  });
});

describe("buildBarBendingSchedule", () => {
  const bars: BbsBarInput[] = [
    {
      barMark: "B1",
      typeGrade: "B500B (T)",
      diameterMm: 16,
      members: 4,
      barsPerMember: 3,
      shapeCode: "00",
      dims: { a: 4200 },
    },
    {
      barMark: "B2",
      typeGrade: "B500B (T)",
      diameterMm: 12,
      members: 4,
      barsPerMember: 2,
      shapeCode: "11",
      dims: { a: 1000, b: 500 },
    },
    {
      barMark: "L1",
      typeGrade: "B500A (R)",
      diameterMm: 8,
      members: 4,
      barsPerMember: 20,
      shapeCode: "51",
      dims: { a: 250, b: 450 },
    },
  ];

  it("rolls up bars, lengths and weights per mark and in total", () => {
    const schedule = buildBarBendingSchedule(bars);
    expect(schedule.errors).toEqual([]);
    expect(schedule.totals.barMarks).toBe(3);
    // B1 4*3=12, B2 4*2=8, L1 4*20=80
    expect(schedule.totals.totalBars).toBe(100);

    const b1 = schedule.rows[0];
    expect(b1.totalBars).toBe(12);
    expect(b1.lengthEachMm).toBe(4200);
    expect(b1.totalLengthM).toBe(50.4);
    // 50.4 m * 1.578 kg/m
    expect(b1.weightKg).toBe(79.54); // 50.4 m x 1.5782 kg/m

    expect(schedule.rows[2].lengthEachMm).toBe(1493.7);
    expect(schedule.totals.totalLengthM).toBeCloseTo(50.4 + 11.8 + 119.5, 1);
    expect(schedule.totals.totalWeightKg).toBe(137.17); // 79.54 + 10.48 + 47.15
  });

  it("rejects duplicate bar marks rather than merging them silently", () => {
    const schedule = buildBarBendingSchedule([
      bars[0],
      { ...bars[1], barMark: "B1" },
    ]);
    expect(schedule.errors.join(" ")).toContain("Duplicate bar mark");
    expect(schedule.rows).toHaveLength(1);
  });

  it("keeps an uncomputable row visible but without invented numbers", () => {
    const schedule = buildBarBendingSchedule([
      { ...bars[1], barMark: "B9", dims: { a: 1000 } },
    ]);
    expect(schedule.rows).toHaveLength(1);
    expect(schedule.rows[0].lengthEachMm).toBeNull();
    expect(schedule.rows[0].totalLengthM).toBeNull();
    expect(schedule.rows[0].weightKg).toBeNull();
    expect(schedule.errors.join(" ")).toContain("B9");
  });

  it("states the assumptions the schedule relied on", () => {
    const schedule = buildBarBendingSchedule(bars);
    expect(schedule.notes.join(" ")).toContain("neutral-axis");
    expect(schedule.notes.join(" ")).toContain("Laps are not included");
  });

  it("exports the schedule as CSV with every schedule column", () => {
    const csv = bbsToCsv(buildBarBendingSchedule(bars));
    const [header, first] = csv.split("\n");
    expect(header).toBe(
      "Bar mark,Type/grade,Size (mm),No. of members,No. of bars in each,Total no. of bars,Length of each bar (mm),Total length (m),Shape code,A (mm),B (mm),C (mm),D (mm),Weight (kg)",
    );
    expect(first.startsWith("B1,B500B (T),16,4,3,12,4200,50.4,00,4200")).toBe(
      true,
    );
    expect(csv.split("\n")).toHaveLength(4);
  });
});
