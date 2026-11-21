import { describe, expect, it } from "vitest";
import {
  calculateFenceBlockwork,
  type FenceBlockworkInput,
} from "@/lib/estimation/fence-blockwork";
import { MORTAR_JOINT_M, MASONRY_UNITS } from "@/config/masonry-units";

/**
 * Fence Blockwork conformance suite.
 *
 * Expectations are derived from the geometry a site actually builds: a
 * perimeter run, coaches of a named unit at a 10 mm joint, a gate cut out of
 * wall and footing, and mortar as the joint volume of the blocks laid. Nothing
 * here reads a number back out of the engine.
 */

const JOINT = MORTAR_JOINT_M; // 10 mm bed and head joint
const unit = MASONRY_UNITS["ng-block-9"];

const base = (
  over: Partial<FenceBlockworkInput> = {},
): FenceBlockworkInput => ({
  market: "NG",
  unitKey: "ng-block-9",
  lengthM: 30,
  widthM: 15,
  coaches: 10,
  mortarRatio: 4,
  ...over,
});

const run = (over: Partial<FenceBlockworkInput> = {}) =>
  calculateFenceBlockwork(base(over));

describe("Fence Blockwork: perimeter and wall area", () => {
  it("runs the perimeter of the plot, not one side", () => {
    const { result } = run();
    expect(result!.site.perimeterM).toBeCloseTo(2 * (30 + 15), 2);
  });

  it("counts a coach as one unit face plus its bed joint", () => {
    const { result } = run();
    expect(result!.wall.courseHeightM).toBeCloseTo(unit.heightM + JOINT, 3);
    expect(result!.wall.heightM).toBeCloseTo(10 * (unit.heightM + JOINT), 2);
  });

  it("measures wall area as perimeter times height", () => {
    const { result } = run();
    const perimeter = 2 * (30 + 15);
    const height = 10 * (unit.heightM + JOINT);
    expect(result!.wall.grossAreaM2).toBeCloseTo(perimeter * height, 1);
  });
});

describe("Fence Blockwork: block count", () => {
  it("uses the jointed module, so the rate is blocks per square metre of wall", () => {
    const { result } = run();
    const perM2 = 1 / ((unit.lengthM + JOINT) * (unit.heightM + JOINT));
    expect(result!.blocks.perSquareMetre).toBeCloseTo(perM2, 1);
    // A 450 x 225 block at a 10 mm joint lands near 9.25 per square metre.
    expect(perM2).toBeGreaterThan(9);
    expect(perM2).toBeLessThan(9.5);
  });

  it("counts whole blocks for the wall and adds breakage on top", () => {
    const { result } = run();
    const area = result!.wall.areaM2;
    const perM2 = 1 / ((unit.lengthM + JOINT) * (unit.heightM + JOINT));
    const net = Math.ceil(area * perM2);
    expect(result!.blocks.net).toBe(net);
    expect(result!.blocks.breakage).toBe(Math.ceil(net * 0.05));
    expect(result!.blocks.total).toBe(net + Math.ceil(net * 0.05));
  });

  it("orders more blocks when the wall is built higher", () => {
    const low = run({ coaches: 8 }).result!;
    const high = run({ coaches: 16 }).result!;
    expect(high.blocks.total).toBeGreaterThan(low.blocks.total);
  });
});

describe("Fence Blockwork: gate", () => {
  it("takes the gate out of the wall, the mortar and the footing", () => {
    const withGate = run({
      gateWidthM: 3,
      gateCoaches: 6,
      foundationCourses: 2,
    }).result!;
    const noGate = run({ foundationCourses: 2 }).result!;
    const gateArea = 3 * 6 * (unit.heightM + JOINT);
    expect(withGate.gate.deductedAreaM2).toBeCloseTo(gateArea, 1);
    expect(withGate.blocks.net).toBeLessThan(noGate.blocks.net);
    expect(withGate.mortar.wetM3).toBeLessThan(noGate.mortar.wetM3);
    expect(withGate.foundation.footingConcreteM3).toBeLessThan(
      noGate.foundation.footingConcreteM3,
    );
  });

  it("never deducts a gate wider than the run it sits in", () => {
    const { result } = run({ gateWidthM: 500, gateCoaches: 50 });
    expect(result!.gate.widthM).toBeLessThan(result!.site.perimeterM);
    expect(result!.gate.coaches).toBeLessThanOrEqual(result!.wall.coaches);
  });
});

describe("Fence Blockwork: mortar", () => {
  it("takes mortar as the joint volume of the blocks actually laid", () => {
    const { result } = run();
    const bed = (unit.lengthM + JOINT) * unit.thicknessM * JOINT;
    const head = unit.heightM * unit.thicknessM * JOINT;
    expect(result!.mortar.wetM3).toBeCloseTo(
      result!.blocks.net * (bed + head),
      2,
    );
    expect(result!.mortar.dryM3).toBeCloseTo(result!.mortar.wetM3 * 1.33, 2);
  });

  it("splits a 1:4 mix four parts sand to one part cement", () => {
    const { result } = run();
    const total = result!.mortar.cementM3 + result!.mortar.sandM3;
    expect(result!.mortar.sandM3).toBeCloseTo((total * 4) / 5, 2);
    expect(result!.mortar.cementM3).toBeCloseTo(total / 5, 2);
  });

  it("orders a richer mix more cement and less sand", () => {
    const rich = run({ mortarRatio: 3 }).result!;
    const lean = run({ mortarRatio: 6 }).result!;
    expect(rich.mortar.cementM3).toBeGreaterThan(lean.mortar.cementM3);
    expect(rich.mortar.sandM3).toBeLessThan(lean.mortar.sandM3);
    expect(rich.cement.bags).toBeGreaterThanOrEqual(lean.cement.bags);
  });
});

describe("Fence Blockwork: strip footing", () => {
  it("counts no footing when no courses below ground are entered", () => {
    const { result } = run();
    expect(result!.foundation.footingConcreteM3).toBe(0);
    expect(result!.foundation.courses).toBe(0);
  });

  it("sizes the footing at twice the wall thickness by 200 mm deep", () => {
    const { result } = run({ foundationCourses: 2 });
    const runLength = result!.site.perimeterM;
    const width = Math.max(unit.thicknessM * 2, 0.3);
    expect(result!.foundation.footingWidthM).toBeCloseTo(width, 3);
    expect(result!.foundation.footingConcreteM3).toBeCloseTo(
      runLength * width * 0.2,
      2,
    );
  });

  it("takes a measured footing width over the derived one", () => {
    const { result } = run({ foundationCourses: 2, footingWidthM: 0.6 });
    expect(result!.foundation.footingWidthM).toBeCloseTo(0.6, 3);
  });

  it("splits footing concrete 1:3:6 across cement, sand and aggregate", () => {
    const { result } = run({ foundationCourses: 2 });
    const dry = result!.foundation.footingConcreteM3 * 1.54;
    expect(result!.foundation.cementBags).toBe(
      Math.ceil(dry / 10 / (50 / 1440)),
    );
    expect(result!.foundation.sandM3).toBeCloseTo((dry * 3) / 10, 2);
    expect(result!.foundation.aggregateM3).toBeCloseTo((dry * 6) / 10, 2);
  });
});

describe("Fence Blockwork: market packs and refusals", () => {
  it("counts cement in the market's own bag", () => {
    const ng = run({ market: "NG" }).result!;
    expect(ng.cement.bagKg).toBe(50);
    // A 25 kg bag holds half as much cement, so it takes about twice the bags.
    const us = run({ market: "US" }).result!;
    expect(us.cement.bagKg).toBeLessThan(50);
    expect(us.cement.bags).toBeGreaterThan(ng.cement.bags);
  });

  it("says plainly when a market has no cement pack configured", () => {
    const { result } = run({ market: "ZZ" });
    expect(result!.assumptions.join(" ")).toMatch(/no cement pack size/i);
  });

  it("refuses to guess a unit, a dimension or a wall height", () => {
    expect(run({ unitKey: "not-a-unit" as never }).errors).toHaveLength(1);
    expect(run({ lengthM: 0 }).errors.length).toBeGreaterThan(0);
    expect(run({ coaches: 0 }).errors.length).toBeGreaterThan(0);
  });
});
