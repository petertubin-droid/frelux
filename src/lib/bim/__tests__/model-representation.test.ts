/**
 * Representation-derived quantities: exact math, labelled derived, and a
 * refusal wherever the geometry does not imply one unambiguous number.
 */

import { describe, expect, it } from "vitest";
import {
  closedMeshVolume,
  extrusionQuantities,
  meshSurfaceArea,
  polygonArea,
  profileArea,
} from "../model-representation";

describe("polygonArea", () => {
  it("computes a rectangle from its corners", () => {
    expect(
      polygonArea([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 0, y: 1 },
      ]),
    ).toBeCloseTo(2, 10);
  });

  it("is orientation independent", () => {
    const cw = polygonArea([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 0 },
    ]);
    expect(cw).toBeCloseTo(2, 10);
  });

  it("refuses fewer than three points", () => {
    expect(
      polygonArea([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toBe(null);
  });

  it("refuses a degenerate (zero area) polygon", () => {
    expect(
      polygonArea([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ]),
    ).toBe(null);
  });
});

describe("profileArea", () => {
  it("computes rectangle, circle, hollow and arbitrary profiles", () => {
    expect(profileArea({ kind: "rectangle", xDim: 2, yDim: 0.2 })).toBeCloseTo(
      0.4,
      10,
    );
    expect(profileArea({ kind: "circle", radius: 0.5 })).toBeCloseTo(
      Math.PI * 0.25,
      10,
    );
    expect(
      profileArea({ kind: "circle-hollow", radius: 0.5, wallThickness: 0.1 }),
    ).toBeCloseTo(Math.PI * (0.25 - 0.16), 10);
    expect(
      profileArea({
        kind: "rectangle-hollow",
        xDim: 1,
        yDim: 1,
        wallThickness: 0.1,
      }),
    ).toBeCloseTo(1 - 0.64, 10);
    expect(
      profileArea({
        kind: "arbitrary-closed",
        points: [
          { x: 0, y: 0 },
          { x: 3, y: 0 },
          { x: 3, y: 2 },
          { x: 0, y: 2 },
        ],
      }),
    ).toBeCloseTo(6, 10);
  });

  it("refuses impossible dimensions instead of returning a negative area", () => {
    expect(profileArea({ kind: "rectangle", xDim: 0, yDim: 2 })).toBe(null);
    expect(
      profileArea({ kind: "circle-hollow", radius: 0.1, wallThickness: 0.1 }),
    ).toBe(null);
    expect(
      profileArea({
        kind: "rectangle-hollow",
        xDim: 0.1,
        yDim: 0.1,
        wallThickness: 0.1,
      }),
    ).toBe(null);
  });
});

describe("extrusionQuantities", () => {
  it("reports volume, cross-section area and depth, all labelled derived", () => {
    const qs = extrusionQuantities(0.4, 3);
    expect(qs.map((q) => q.kind)).toEqual(["volume", "area", "length"]);
    expect(qs[0].value).toBeCloseTo(1.2, 10);
    expect(qs[1].value).toBeCloseTo(0.4, 10);
    expect(qs[2].value).toBe(3);
    for (const q of qs) {
      expect(q.method).toBe("extruded-area-solid");
      expect(q.basis).toMatch(/derived/i);
      expect(q.basis).toMatch(/own units/i);
    }
  });

  it("returns nothing for a zero or negative extrusion", () => {
    expect(extrusionQuantities(0, 3)).toEqual([]);
    expect(extrusionQuantities(0.4, 0)).toEqual([]);
  });
});

// Unit cube, 12 triangles, watertight.
function cube(): { positions: Float32Array; indices: Uint32Array } {
  const positions = new Float32Array([
    0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1,
  ]);
  const indices = new Uint32Array([
    0,
    1,
    2,
    0,
    2,
    3, // bottom (z=0)
    4,
    6,
    5,
    4,
    7,
    6, // top
    0,
    4,
    5,
    0,
    5,
    1, // y=0
    3,
    2,
    6,
    3,
    6,
    7, // y=1
    0,
    3,
    7,
    0,
    7,
    4, // x=0
    1,
    5,
    6,
    1,
    6,
    2, // x=1
  ]);
  return { positions, indices };
}

describe("closedMeshVolume", () => {
  it("measures a watertight unit cube", () => {
    const { positions, indices } = cube();
    expect(closedMeshVolume(positions, indices)).toBeCloseTo(1, 6);
  });

  it("applies the placement matrix", () => {
    const { positions, indices } = cube();
    const scale2 = [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1];
    expect(closedMeshVolume(positions, indices, scale2)).toBeCloseTo(8, 6);
  });

  it("refuses an open shell rather than reporting a meaningless volume", () => {
    const { positions, indices } = cube();
    const open = indices.slice(0, indices.length - 6);
    expect(closedMeshVolume(positions, open)).toBe(null);
  });
});

describe("meshSurfaceArea", () => {
  it("sums the triangles of a unit cube", () => {
    const { positions, indices } = cube();
    expect(meshSurfaceArea(positions, indices)).toBeCloseTo(6, 6);
  });

  it("returns null for an empty mesh", () => {
    expect(meshSurfaceArea(new Float32Array(0), new Uint32Array(0))).toBe(null);
  });
});
