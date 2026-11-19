/**
 * Pillar 3: representation-derived quantities.
 *
 * Some models declare no IfcQuantity values at all, but their geometry still
 * implies a quantity: an extruded wall of profile area A and depth D encloses
 * A x D. This module reads that implication and labels it as derived, never
 * as declared, so a takeoff line can say where its number came from.
 *
 * Honest scope:
 *  - Only extrusion solids are derived (IfcExtrudedAreaSolid), the shape most
 *    authoring tools emit for walls, slabs, columns and beams.
 *  - Only profiles whose area is exact are read: rectangle, circle, hollow
 *    circle, hollow rectangle and an arbitrary closed polyline (shoelace).
 *    Anything else is reported as unsupported, never approximated.
 *  - Values are computed in the model's own units and are NOT converted; the
 *    caller already knows the declared units from the parse result.
 *  - A derived quantity never overwrites a declared one; the estimate link
 *    prefers declared values and marks derived fallbacks as such.
 */

import type { IfcQuantityKind } from "./ifc-model-loader";

export type DerivedQuantityMethod =
  "extruded-area-solid" | "mesh-surface" | "mesh-closed-shell";

export interface DerivedQuantity {
  /** e.g. "Extrusion volume" */
  name: string;
  kind: IfcQuantityKind;
  value: number;
  method: DerivedQuantityMethod;
  /** what the derivation assumed, in plain words */
  basis: string;
}

export interface PlanarPoint {
  x: number;
  y: number;
}

/** Minimal shape of a tessellated part, as the loader already holds it. */
export interface MeshPart {
  positions: Float32Array;
  indices: Uint32Array;
  /** column-major 4x4 placement */
  matrix?: readonly number[];
}

export type ProfileShape =
  | { kind: "rectangle"; xDim: number; yDim: number }
  | { kind: "circle"; radius: number }
  | { kind: "circle-hollow"; radius: number; wallThickness: number }
  | {
      kind: "rectangle-hollow";
      xDim: number;
      yDim: number;
      wallThickness: number;
    }
  | { kind: "arbitrary-closed"; points: PlanarPoint[] };

/**
 * Area of a closed polygon (shoelace), absolute value. Fewer than three
 * distinct points is not a polygon: null, never zero.
 */
export function polygonArea(points: readonly PlanarPoint[]): number | null {
  if (points.length < 3) return null;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  const area = Math.abs(sum) / 2;
  return Number.isFinite(area) && area > 0 ? area : null;
}

/**
 * Exact cross-section area for the profiles this module reads. Null when the
 * profile is unsupported or its dimensions are not usable: the caller must
 * report that, not substitute an approximation.
 */
export function profileArea(profile: ProfileShape): number | null {
  switch (profile.kind) {
    case "rectangle": {
      const { xDim, yDim } = profile;
      if (!(xDim > 0) || !(yDim > 0)) return null;
      return xDim * yDim;
    }
    case "circle": {
      const { radius } = profile;
      if (!(radius > 0)) return null;
      return Math.PI * radius * radius;
    }
    case "circle-hollow": {
      const { radius, wallThickness } = profile;
      if (!(radius > 0) || !(wallThickness > 0)) return null;
      if (wallThickness >= radius) return null;
      const inner = radius - wallThickness;
      return Math.PI * (radius * radius - inner * inner);
    }
    case "rectangle-hollow": {
      const { xDim, yDim, wallThickness } = profile;
      if (!(xDim > 0) || !(yDim > 0) || !(wallThickness > 0)) return null;
      if (wallThickness * 2 >= Math.min(xDim, yDim)) return null;
      const outer = xDim * yDim;
      const inner = (xDim - 2 * wallThickness) * (yDim - 2 * wallThickness);
      return outer - inner;
    }
    case "arbitrary-closed":
      return polygonArea(profile.points);
  }
}

/**
 * Quantities an extrusion implies: the swept volume, the cross-section area
 * and the extrusion length. One entry per quantity, each labelled derived.
 */
export function extrusionQuantities(
  area: number,
  depth: number,
): DerivedQuantity[] {
  if (!(area > 0) || !(depth > 0)) return [];
  const volume = area * depth;
  if (!Number.isFinite(volume) || volume <= 0) return [];
  const basis =
    "Derived from the element's extrusion geometry (profile area x depth), in the model's own units; the file declares no IfcQuantity for it.";
  return [
    {
      name: "Extrusion volume",
      kind: "volume",
      value: volume,
      method: "extruded-area-solid",
      basis,
    },
    {
      name: "Extrusion cross-section area",
      kind: "area",
      value: area,
      method: "extruded-area-solid",
      basis,
    },
    {
      name: "Extrusion depth",
      kind: "length",
      value: depth,
      method: "extruded-area-solid",
      basis,
    },
  ];
}

/**
 * Area of a triangle soup, in the model's own units. Used only as a last
 * resort for elements with no declared and no extruded quantity, and always
 * labelled mesh-surface because it counts every face (both sides of a wall),
 * which is not the plan area an estimate usually wants.
 */
export function meshSurfaceArea(
  positions: Float32Array,
  indices: Uint32Array,
  matrix?: readonly number[],
): number | null {
  if (indices.length < 3) return null;
  const p = (i: number): PlanarPoint & { z: number } => {
    let x = positions[i * 3];
    let y = positions[i * 3 + 1];
    let z = positions[i * 3 + 2];
    if (matrix && matrix.length === 16) {
      // column-major 4x4
      const m = matrix;
      const tx = m[0] * x + m[4] * y + m[8] * z + m[12];
      const ty = m[1] * x + m[5] * y + m[9] * z + m[13];
      const tz = m[2] * x + m[6] * y + m[10] * z + m[14];
      x = tx;
      y = ty;
      z = tz;
    }
    return { x, y, z };
  };
  let total = 0;
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const a = p(indices[i]);
    const b = p(indices[i + 1]);
    const c = p(indices[i + 2]);
    const ux = b.x - a.x;
    const uy = b.y - a.y;
    const uz = b.z - a.z;
    const vx = c.x - a.x;
    const vy = c.y - a.y;
    const vz = c.z - a.z;
    const cx = uy * vz - uz * vy;
    const cy = uz * vx - ux * vz;
    const cz = ux * vy - uy * vx;
    total += Math.sqrt(cx * cx + cy * cy + cz * cz) / 2;
  }
  return Number.isFinite(total) && total > 0 ? total : null;
}

/**
 * Signed volume of a closed triangle mesh (divergence theorem). Null unless
 * the mesh is watertight: every undirected edge must be shared by exactly two
 * triangles. An open shell's "volume" would be a number with no meaning, so it
 * is refused rather than reported.
 */
export function closedMeshVolume(
  positions: Float32Array,
  indices: Uint32Array,
  matrix?: readonly number[],
): number | null {
  if (indices.length < 12) return null;

  // Tessellations split vertices per face (flat shading), so edges must be
  // paired by position, not by index: an index-only check would call a closed
  // brep "open" and refuse a volume the geometry really has.
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  for (let i = 0; i + 2 < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  const diag = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ);
  const tol = diag > 0 ? diag * 1e-7 : 1e-9;
  const quantize = (v: number) => Math.round(v / tol);

  const vertexKey = (index: number): string => {
    const i = index * 3;
    return `${quantize(positions[i])},${quantize(positions[i + 1])},${quantize(
      positions[i + 2],
    )}`;
  };

  const edges = new Map<string, number>();
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const tri = [
      vertexKey(indices[i]),
      vertexKey(indices[i + 1]),
      vertexKey(indices[i + 2]),
    ];
    for (let e = 0; e < 3; e++) {
      const a = tri[e];
      const b = tri[(e + 1) % 3];
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  for (const count of edges.values()) {
    if (count !== 2) return null;
  }

  const p = (i: number): PlanarPoint & { z: number } => {
    let x = positions[i * 3];
    let y = positions[i * 3 + 1];
    let z = positions[i * 3 + 2];
    if (matrix && matrix.length === 16) {
      const m = matrix;
      const tx = m[0] * x + m[4] * y + m[8] * z + m[12];
      const ty = m[1] * x + m[5] * y + m[9] * z + m[13];
      const tz = m[2] * x + m[6] * y + m[10] * z + m[14];
      x = tx;
      y = ty;
      z = tz;
    }
    return { x, y, z };
  };

  let sum = 0;
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const a = p(indices[i]);
    const b = p(indices[i + 1]);
    const c = p(indices[i + 2]);
    sum +=
      (a.x * (b.y * c.z - b.z * c.y) -
        a.y * (b.x * c.z - b.z * c.x) +
        a.z * (b.x * c.y - b.y * c.x)) /
      6;
  }
  const volume = Math.abs(sum);
  return Number.isFinite(volume) && volume > 0 ? volume : null;
}

/**
 * Quantities from the tessellated mesh.
 *
 * This is the path that covers what the analytic extrusion reader cannot:
 * boolean results (IfcBooleanResult / IfcBooleanClippingResult), swept disks
 * and advanced breps. web-ifc has already evaluated those into triangles, so
 * the mesh is the model's own answer rather than an approximation we invent.
 *
 * Rules, all of them refusals rather than guesses:
 *  - volume only when EVERY part is watertight (each edge shared by exactly
 *    two triangles); one open part and there is no volume, because summing a
 *    meaningless number would be worse than reporting none
 *  - surface area is always meaningful, but it counts every face (both sides
 *    of a wall), so it is labelled mesh-surface and never called plan area
 */
export function meshQuantities(parts: readonly MeshPart[]): DerivedQuantity[] {
  if (parts.length === 0) return [];
  const usable = parts.filter(
    (p) => p.positions.length >= 9 && p.indices.length >= 3,
  );
  if (usable.length === 0) return [];

  const out: DerivedQuantity[] = [];

  let volumeTotal = 0;
  let allClosed = true;
  for (const part of usable) {
    const v = closedMeshVolume(part.positions, part.indices, part.matrix);
    if (v === null) {
      allClosed = false;
      break;
    }
    volumeTotal += v;
  }
  if (allClosed && volumeTotal > 0) {
    out.push({
      name: "Mesh volume",
      kind: "volume",
      value: volumeTotal,
      method: "mesh-closed-shell",
      basis:
        "Measured from the watertight tessellated mesh, in the model's own units. This covers boolean, swept-disk and brep shapes the extrusion reader cannot evaluate.",
    });
  }

  let areaTotal = 0;
  let anyArea = false;
  for (const part of usable) {
    const a = meshSurfaceArea(part.positions, part.indices, part.matrix);
    if (a === null) continue;
    areaTotal += a;
    anyArea = true;
  }
  if (anyArea && areaTotal > 0) {
    out.push({
      name: "Mesh surface area",
      kind: "area",
      value: areaTotal,
      method: "mesh-surface",
      basis:
        "Total tessellated surface, both faces included, in the model's own units. Not a plan or painting area.",
    });
  }

  return out;
}
