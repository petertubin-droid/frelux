// =========================================================
// Envelope -> Three.js scene
//
// Pure scene construction against real three.js objects, so the geometry path
// is exercised in tests without a WebGL renderer (the same split the IFC viewer
// uses). The React component is a thin shell around this module.
//
// What is modelled, and what is not:
//   * Walls are extruded to a stated 200 mm thickness, the wall outline
//     including the gable triangle on the left and right, with a real hole cut
//     for every measured opening.
//   * The roof is two slabs laid on the measured pitch. When no rise was
//     measured the roof is flat and `flatRoof` says so, rather than a pitch
//     being invented for the render.
//   * Nothing decorative is added: no furniture, no ground plane, no invented
//     storey count.
// =========================================================

import * as THREE from "three";

import type { EnvelopeResult, ViewId } from "./envelope";

/** Stated wall thickness for the render, in metres. */
export const WALL_THICKNESS_M = 0.2;

export interface SceneOpening {
  kind: "window" | "door";
  widthMm: number;
  heightMm: number;
  /** Distance from the left edge of that elevation, in millimetres. */
  offsetMm: number;
  /** Sill height above the ground line, in millimetres. Defaults to 900. */
  sillMm?: number;
}

export interface EnvelopeSceneInput {
  envelope: EnvelopeResult;
  openings?: Partial<Record<ViewId, SceneOpening[]>>;
}

export interface EnvelopeScene {
  group: THREE.Group;
  /** Bounding box of everything built, in metres. */
  bounds: THREE.Box3;
  /** True when no roof rise was measured, so the roof was drawn flat. */
  flatRoof: boolean;
  /** Metres the sloped roof surface spans, for a camera fit. */
  roofSlopeLengthM: number;
  openingCount: number;
}

const MM = 0.001;
const WALL_COLOR = 0xd9d2c5;
const ROOF_COLOR = 0x6b5b4b;
const FLOOR_COLOR = 0x9a9a94;

function wallOutline(widthM: number, eaveM: number, riseM: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(widthM, 0);
  shape.lineTo(widthM, eaveM);
  if (riseM > 0) {
    shape.lineTo(widthM / 2, eaveM + riseM);
  }
  shape.lineTo(0, eaveM);
  shape.closePath();
  return shape;
}

function cutOpenings(
  shape: THREE.Shape,
  openings: SceneOpening[],
  widthM: number,
  eaveM: number,
) {
  let cut = 0;
  for (const opening of openings) {
    const w = opening.widthMm * MM;
    const h = opening.heightMm * MM;
    if (!(w > 0) || !(h > 0)) continue;
    const sill = (opening.sillMm ?? (opening.kind === "door" ? 0 : 900)) * MM;
    const x0 = opening.offsetMm * MM;
    const y0 = sill;
    // An opening that does not fit inside the wall is a mis-traced handle, not
    // a hole to shrink: clipping it would draw a window the visitor never
    // measured, so it is skipped and the count says so.
    if (x0 < -0.01 || y0 < -0.01) continue;
    if (x0 + w > widthM + 0.01 || y0 + h > eaveM + 0.01) continue;
    const x1 = x0 + w;
    const y1 = y0 + h;
    if (w < 0.05 || h < 0.05) continue;
    const hole = new THREE.Path();
    hole.moveTo(x0, y0);
    hole.lineTo(x1, y0);
    hole.lineTo(x1, y1);
    hole.lineTo(x0, y1);
    hole.closePath();
    shape.holes.push(hole);
    cut += 1;
  }
  return cut;
}

function wallMesh(
  shape: THREE.Shape,
  widthM: number,
  position: THREE.Vector3,
  rotationY: number,
): THREE.Mesh {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: WALL_THICKNESS_M,
    bevelEnabled: false,
  });
  // Centre the extrusion on its own footprint so a rotation about the mesh
  // origin swings the wall about its middle instead of doubling the building.
  geometry.translate(-widthM / 2, 0, -WALL_THICKNESS_M / 2);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshLambertMaterial({ color: WALL_COLOR }),
  );
  mesh.position.copy(position);
  mesh.rotation.y = rotationY;
  mesh.userData = { part: "wall" };
  return mesh;
}

/**
 * Build the envelope solid.
 *
 * Coordinates: x runs along the width, y is up from the ground line, z runs
 * along the depth with the front wall at +depth/2.
 */
export function buildEnvelopeScene(input: EnvelopeSceneInput): EnvelopeScene {
  const { envelope } = input;
  const widthM = envelope.widthMm * MM;
  const depthM = envelope.depthMm * MM;
  const eaveM = envelope.eaveHeightMm * MM;
  const riseM = (envelope.roofRiseMm ?? 0) * MM;
  const flatRoof = !(riseM > 0);

  const group = new THREE.Group();
  let openingCount = 0;

  // Front and back: rectangles to the eave line.
  for (const [view, z, rotation] of [
    ["front", depthM / 2, 0],
    ["back", -depthM / 2, Math.PI],
  ] as Array<[ViewId, number, number]>) {
    const shape = wallOutline(widthM, eaveM, 0);
    openingCount += cutOpenings(
      shape,
      input.openings?.[view] ?? [],
      widthM,
      eaveM,
    );
    const mesh = wallMesh(shape, widthM, new THREE.Vector3(0, 0, z), rotation);
    mesh.userData.view = view;
    group.add(mesh);
  }

  // Left and right: the gable ends, where the roof rise shows.
  for (const [view, x, rotation] of [
    ["right", widthM / 2, Math.PI / 2],
    ["left", -widthM / 2, -Math.PI / 2],
  ] as Array<[ViewId, number, number]>) {
    const shape = wallOutline(depthM, eaveM, riseM);
    openingCount += cutOpenings(
      shape,
      input.openings?.[view] ?? [],
      depthM,
      eaveM,
    );
    const mesh = wallMesh(shape, depthM, new THREE.Vector3(x, 0, 0), rotation);
    mesh.userData.view = view;
    group.add(mesh);
  }

  // Floor slab: the footprint, drawn thin so it reads as a slab.
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(widthM, 0.1, depthM),
    new THREE.MeshLambertMaterial({ color: FLOOR_COLOR }),
  );
  floor.position.set(0, -0.05, 0);
  floor.userData = { part: "floor" };
  group.add(floor);

  // Roof: two slabs on the measured pitch, or one flat slab when no rise was
  // measured. The slope length is the rafter length, not the plan run.
  const runM = depthM / 2;
  const slopeM = Math.hypot(runM, riseM);
  const roofMaterial = new THREE.MeshLambertMaterial({ color: ROOF_COLOR });
  const overhangM = 0.15;

  if (flatRoof) {
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(widthM + overhangM * 2, 0.08, depthM),
      roofMaterial,
    );
    slab.position.set(0, eaveM + 0.04, 0);
    slab.userData = { part: "roof", flat: true };
    group.add(slab);
  } else {
    const pitch = Math.atan2(riseM, runM);
    for (const side of [1, -1] as const) {
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(widthM + overhangM * 2, 0.08, slopeM),
        roofMaterial,
      );
      // Centre of a rafter: half way up the slope, half way along the run.
      slab.position.set(0, eaveM + riseM / 2 + 0.04, (side * runM) / 2);
      slab.rotation.x = side * pitch;
      slab.userData = { part: "roof", flat: false, side };
      group.add(slab);
    }
  }

  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);

  return { group, bounds, flatRoof, roofSlopeLengthM: slopeM, openingCount };
}

/** Frame the whole building: returns a camera distance that fits the bounds. */
export function cameraDistanceFor(bounds: THREE.Box3): number {
  if (bounds.isEmpty()) return 12;
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const radius = Math.max(size.x, size.y, size.z) / 2;
  // 35 degrees vertical field of view, with a margin so nothing clips.
  return (radius / Math.tan((35 * Math.PI) / 360)) * 1.6;
}

/** Human-readable size of the model, in metres. */
export function sceneDimensions(bounds: THREE.Box3): {
  widthM: number;
  heightM: number;
  depthM: number;
} {
  if (bounds.isEmpty()) return { widthM: 0, heightM: 0, depthM: 0 };
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return {
    widthM: round(size.x),
    heightM: round(size.y),
    depthM: round(size.z),
  };
}
