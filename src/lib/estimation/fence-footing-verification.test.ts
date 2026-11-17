import { describe, expect, it } from "vitest";
import {
  calculateFenceBlockwork,
  FOOTING_DEPTH_M,
  FOOTING_WIDTH_FACTOR,
  type FenceBlockworkInput,
} from "./fence-blockwork";

/**
 * The strip footing under a fence wall carries load by being wider than the
 * wall. It was sized the exact width of the block, which spreads nothing, and on
 * a 30 by 15 m plot with two foundation courses that meant 3.915 m3 of concrete
 * and 18 bags where the footing actually needs twice the width: 7.830 m3 and 35
 * bags, with the whole job rising from 43 bags to 60.
 *
 * The width is now twice the wall thickness with a 300 mm floor, and a measured
 * width is used instead when the user enters one.
 */
const base: FenceBlockworkInput = {
  market: "NG",
  lengthM: 30,
  widthM: 15,
  coaches: 9,
  unitKey: "ng-block-9",
  gateWidthM: 3,
  gateCoaches: 5,
  foundationCourses: 2,
  mortarRatio: 4,
};

describe("fence strip footing", () => {
  it("defaults to twice the wall thickness", () => {
    const r = calculateFenceBlockwork(base).result!;
    expect(FOOTING_WIDTH_FACTOR).toBe(2);
    expect(r.foundation.footingWidthM).toBeCloseTo(r.wall.thicknessM * 2, 3);
    expect(r.foundation.footingWidthM).toBeCloseTo(0.45, 3);
  });

  it("works the concrete on the footing width and run", () => {
    const r = calculateFenceBlockwork(base).result!;
    // 90 m perimeter less the 3 m gate is an 87 m run, 0.45 m wide, 0.2 m deep.
    expect(r.foundation.footingConcreteM3).toBeCloseTo(87 * 0.45 * 0.2, 3);
    expect(r.foundation.footingConcreteM3).toBeCloseTo(7.83, 2);
    // Lean 1:3:6 dry volume 1.54, cement one part in ten: 1.2058 m3, and 35
    // bags of 50 kg at 1,440 kg/m3.
    expect(r.foundation.cementBags).toBe(35);
    expect(r.cement.bags).toBe(60);
  });

  it("uses a width the user has measured", () => {
    const wide = calculateFenceBlockwork({
      ...base,
      footingWidthM: 0.6,
    }).result!;
    expect(wide.foundation.footingWidthM).toBeCloseTo(0.6, 3);
    expect(wide.foundation.footingConcreteM3).toBeCloseTo(87 * 0.6 * 0.2, 3);
    expect(wide.cement.bags).toBeGreaterThan(
      calculateFenceBlockwork(base).result!.cement.bags,
    );
  });

  it("orders no concrete when no footing is built", () => {
    const none = calculateFenceBlockwork({
      ...base,
      foundationCourses: 0,
    }).result!;
    expect(none.foundation.footingConcreteM3).toBe(0);
    expect(none.foundation.cementBags).toBe(0);
    expect(none.foundation.footingWidthM).toBeGreaterThan(0);
  });

  it("holds the 300 mm floor for a thin unit", () => {
    // A 100 mm brick wall would ask for 200 mm by the factor alone.
    const brick = calculateFenceBlockwork({
      ...base,
      unitKey: "uk-brick",
      foundationCourses: 2,
    }).result!;
    expect(brick.wall.thicknessM).toBeLessThan(0.15);
    expect(brick.foundation.footingWidthM).toBeCloseTo(0.3, 3);
    // The gate takes 3 m out of the 90 m run, so the footing runs 87 m.
    expect(brick.foundation.footingConcreteM3).toBeCloseTo(
      (brick.site.perimeterM - 3) * 0.3 * FOOTING_DEPTH_M,
      2,
    );
  });
});
