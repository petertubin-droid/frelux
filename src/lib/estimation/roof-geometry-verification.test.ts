import { describe, it, expect } from "vitest";
import {
  decomposeRoofPlanes,
  calculateRoofArea,
  calculateRidgeLength,
  calculateHipLength,
} from "./build-to-roof-engine";

/**
 * Roof geometry, checked against closed-form values rather than the engine's own
 * previous output.
 *
 * Two invariants must hold for every roof type, pitch and overhang:
 *
 *   1. The decomposed planes tile the eave rectangle exactly:
 *      Σ projected = (L + 2o)(W + 2o)
 *   2. A plane at constant pitch has sloped area = projected / cos θ, so the
 *      total must equal that. This is exact, not an approximation, because both
 *      in-plane dimensions scale by the same factor.
 *
 * A violation of (1) means an area is counted twice or lost between planes; a
 * violation of (2) means the pitch is applied inconsistently.
 */

const TYPES = ["gable", "hip", "mono_pitch", "custom", "flat"];
const PITCHES = [0, 5, 15, 22.5, 30, 45];
const OVERHANGS = [0, 0.3, 0.6];
const SHAPES: Array<[number, number]> = [
  [8, 5],
  [10, 10],
  [6, 12],
];

describe("roof plane decomposition", () => {
  it("tiles the eave rectangle exactly", () => {
    for (const type of TYPES) {
      for (const pitch of PITCHES) {
        for (const overhang of OVERHANGS) {
          for (const [L, W] of SHAPES) {
            const planes = decomposeRoofPlanes(L, W, pitch, overhang, type);
            const projected = planes.reduce(
              (s, p) => s + p.projected_area_m2,
              0,
            );
            const eave = (L + 2 * overhang) * (W + 2 * overhang);
            expect(projected).toBeCloseTo(eave, 9);
          }
        }
      }
    }
  });

  it("applies the pitch as 1/cos θ to every sloped area", () => {
    for (const type of ["gable", "hip", "mono_pitch", "custom"]) {
      for (const pitch of [5, 15, 22.5, 30, 45]) {
        for (const [L, W] of SHAPES) {
          const factor = 1 / Math.cos((pitch * Math.PI) / 180);
          const planes = decomposeRoofPlanes(L, W, pitch, 0.4, type);
          for (const p of planes) {
            expect(p.sloped_area_m2).toBeCloseTo(
              p.projected_area_m2 * factor,
              9,
            );
          }
        }
      }
    }
  });

  it("keeps the total area consistent with the plane sum", () => {
    for (const type of TYPES) {
      for (const pitch of PITCHES) {
        const planes = decomposeRoofPlanes(8, 5, pitch, 0.3, type);
        const sum = planes.reduce((s, p) => s + p.sloped_area_m2, 0);
        expect(calculateRoofArea(8, 5, pitch, 0.3, type)).toBeCloseTo(sum, 2);
      }
    }
  });
});

describe("roof planes by type", () => {
  it("splits a gable into two equal rectangles on the horizontal half-span", () => {
    const planes = decomposeRoofPlanes(8, 5, 30, 0, "gable");
    expect(planes).toHaveLength(2);
    for (const p of planes) {
      // Rectangle: 8 m along the ridge × 2.5 m horizontal half-span.
      expect(p.projected_area_m2).toBeCloseTo(8 * 2.5, 9);
    }
  });

  it("builds a hip from two trapezoids and two triangles", () => {
    const planes = decomposeRoofPlanes(8, 5, 30, 0, "hip");
    expect(planes).toHaveLength(4);
    const trap = 8 * 5 - (5 * 5) / 2; // eave area less the two hip triangles
    const tri = (5 * 5) / 4;
    // Trapezoid: parallel sides 8 m and 3 m, depth 2.5 m.
    expect(planes[0].projected_area_m2).toBeCloseTo(((8 + 3) / 2) * 2.5, 9);
    expect(planes[0].projected_area_m2).toBeCloseTo(trap / 2, 9);
    // Triangle: base 5 m, depth 2.5 m.
    expect(planes[2].projected_area_m2).toBeCloseTo((5 * 2.5) / 2, 9);
    expect(planes[2].projected_area_m2).toBeCloseTo(tri, 9);
  });

  it("makes a square hip a pyramid with a zero-length ridge", () => {
    const planes = decomposeRoofPlanes(10, 10, 25, 0, "hip");
    expect(planes[0].label).toMatch(/pyramid/);
    const total = planes.reduce((s, p) => s + p.projected_area_m2, 0);
    expect(total).toBeCloseTo(100, 9);
    expect(calculateRidgeLength(10, 10, "hip")).toBe(0);
  });

  it("refuses to treat a vertical plane as a roof", () => {
    const planes = decomposeRoofPlanes(8, 5, 90, 0, "gable");
    expect(planes).toHaveLength(1);
    expect(planes[0].label).toMatch(/not a roof/);
    expect(planes[0].sloped_area_m2).toBeCloseTo(40, 9);
  });
});

describe("ridges and hips", () => {
  it("runs a gable ridge the full length plus both overhangs", () => {
    expect(calculateRidgeLength(8, 5, "gable", 0.3)).toBeCloseTo(8.6, 9);
    expect(calculateRidgeLength(8, 5, "hip", 0.3)).toBeCloseTo(3, 9);
    expect(calculateRidgeLength(8, 5, "mono_pitch", 0.3)).toBe(0);
    expect(calculateRidgeLength(8, 5, "flat", 0.3)).toBe(0);
  });

  it("takes a hip rafter over two runs and a rise, not one run over cos θ", () => {
    const run = 5 / 2;
    const pitch = 30;
    const rise = run * Math.tan((pitch * Math.PI) / 180);
    const perHip = Math.hypot(run, run, rise);
    expect(calculateHipLength(8, 5, pitch, 0)).toBeCloseTo(4 * perHip, 9);
    // The common-rafter shortcut is materially shorter: it is the error this
    // function exists to avoid.
    const commonRafter = (run / Math.cos((pitch * Math.PI) / 180)) * 4;
    expect(calculateHipLength(8, 5, pitch, 0)).toBeGreaterThan(
      commonRafter * 1.2,
    );
  });

  it("includes the overhang in the hip plan run", () => {
    const run = 5 / 2 + 0.5;
    const rise = run * Math.tan((45 * Math.PI) / 180);
    expect(calculateHipLength(8, 5, 45, 0.5)).toBeCloseTo(
      4 * Math.hypot(run, run, rise),
      9,
    );
  });
});
