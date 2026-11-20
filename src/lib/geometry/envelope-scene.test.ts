import { describe, expect, it } from "vitest";
import * as THREE from "three";

import { buildEnvelope } from "@/lib/geometry/envelope";
import {
  buildEnvelopeScene,
  cameraDistanceFor,
  sceneDimensions,
  WALL_THICKNESS_M,
} from "@/lib/geometry/envelope-scene";

function envelope(roofRiseMm: number | null) {
  const outcome = buildEnvelope([
    { view: "front", widthMm: 12000, eaveHeightMm: 3000, roofRiseMm: null },
    { view: "back", widthMm: 12000, eaveHeightMm: 3000, roofRiseMm: null },
    { view: "left", widthMm: 8000, eaveHeightMm: 3000, roofRiseMm },
    { view: "right", widthMm: 8000, eaveHeightMm: 3000, roofRiseMm },
  ]);
  if (!outcome.ok) throw new Error(outcome.errors.join(" "));
  return outcome.envelope;
}

describe("envelope scene", () => {
  it("builds four walls, a slab and two roof planes at the measured size", () => {
    const scene = buildEnvelopeScene({ envelope: envelope(2600) });
    const parts = scene.group.children.map((c) => c.userData.part);
    expect(parts.filter((p) => p === "wall")).toHaveLength(4);
    expect(parts.filter((p) => p === "floor")).toHaveLength(1);
    expect(parts.filter((p) => p === "roof")).toHaveLength(2);
    expect(scene.flatRoof).toBe(false);

    const dims = sceneDimensions(scene.bounds);
    // 12 m wide, 8 m deep, 3 m eave plus 2.6 m rise (plus the 80 mm roof slab).
    expect(dims.widthM).toBeGreaterThan(12);
    expect(dims.widthM).toBeLessThan(12.4);
    expect(dims.depthM).toBeGreaterThan(8);
    expect(dims.depthM).toBeLessThan(8.4);
    expect(dims.heightM).toBeGreaterThan(5.5);
    expect(dims.heightM).toBeLessThan(5.8);
  });

  it("computes the rafter length, not the plan run", () => {
    const scene = buildEnvelopeScene({ envelope: envelope(2600) });
    // half the depth is 4 m, rise 2.6 m, so the slope is hypot(4, 2.6)
    expect(scene.roofSlopeLengthM).toBeCloseTo(Math.hypot(4, 2.6), 4);
  });

  it("cuts a real hole for every traced opening", () => {
    const scene = buildEnvelopeScene({
      envelope: envelope(2600),
      openings: {
        front: [
          { kind: "door", widthMm: 900, heightMm: 2100, offsetMm: 1500 },
          { kind: "window", widthMm: 1200, heightMm: 1200, offsetMm: 7000 },
        ],
      },
    });
    expect(scene.openingCount).toBe(2);
    const frontWall = scene.group.children.find(
      (child) => child.userData.view === "front",
    ) as THREE.Mesh;
    const geometry = frontWall.geometry as THREE.ExtrudeGeometry;
    // The hole is carried on the shape the extrusion was built from.
    const shapes = (
      geometry as unknown as {
        parameters: { shapes: THREE.Shape | THREE.Shape[] };
      }
    ).parameters.shapes;
    const shape = Array.isArray(shapes) ? shapes[0] : shapes;
    expect(shape.holes).toHaveLength(2);
  });

  it("draws a flat roof when no rise was measured, and says so", () => {
    const scene = buildEnvelopeScene({ envelope: envelope(null) });
    expect(scene.flatRoof).toBe(true);
    const roofs = scene.group.children.filter(
      (child) => child.userData.part === "roof",
    );
    expect(roofs).toHaveLength(1);
    expect(roofs[0].userData.flat).toBe(true);
  });

  it("ignores an opening dragged outside the wall instead of inverting it", () => {
    const scene = buildEnvelopeScene({
      envelope: envelope(2600),
      openings: {
        front: [
          { kind: "window", widthMm: 4000, heightMm: 1200, offsetMm: 11500 },
        ],
      },
    });
    expect(scene.openingCount).toBe(0);
  });

  it("frames a camera that fits the solid", () => {
    const scene = buildEnvelopeScene({ envelope: envelope(2600) });
    const distance = cameraDistanceFor(scene.bounds);
    expect(distance).toBeGreaterThan(8);
    expect(distance).toBeLessThan(60);
    expect(WALL_THICKNESS_M).toBe(0.2);
  });
});
