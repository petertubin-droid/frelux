// =========================================================
// Polygon measurement: areas, perimeters and the pixel-to-millimetre scale
//
// Every quantity a takeoff reports comes from these functions. Areas use the
// shoelace formula on the vertices themselves, so a shape with any number of
// corners (an L-shaped wall, a gable end) is measured exactly rather than
// approximated by its bounding box.
// =========================================================

import type { Point } from "./homography";

/** Twice the signed area; positive for counter-clockwise vertex order. */
export function signedDoubleArea(polygon: readonly Point[]): number {
  if (polygon.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum;
}

/** Signed area in square pixels (or square units of whatever space the points are in). */
export function signedArea(polygon: readonly Point[]): number {
  return signedDoubleArea(polygon) / 2;
}

/** Area in the polygon's own units, always positive. */
export function polygonArea(polygon: readonly Point[]): number {
  return Math.abs(signedArea(polygon));
}

export function polygonPerimeter(polygon: readonly Point[]): number {
  if (polygon.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function boundingBox(polygon: readonly Point[]): Bounds | null {
  if (polygon.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { x, y } of polygon) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/** Ray casting: true when the point lies inside the polygon. */
export function pointInPolygon(
  point: Point,
  polygon: readonly Point[],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const straddles = a.y > point.y !== b.y > point.y;
    if (
      straddles &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Millimetres per pixel from one known real length.
 *
 * The visitor measures one segment they know (a 2100 mm door, a 12000 mm wall)
 * and states it in millimetres; this converts every other pixel length with
 * that single ratio. A non-positive or non-finite input returns null, never a
 * guess.
 */
export function calibrateMillimetresPerPixel(
  realLengthMm: number,
  pixelLength: number,
): number | null {
  if (!Number.isFinite(realLengthMm) || realLengthMm <= 0) return null;
  if (!Number.isFinite(pixelLength) || pixelLength <= 0) return null;
  return realLengthMm / pixelLength;
}

/** Multiply every vertex by a factor (pixels to millimetres, or back). */
export function scalePolygon(
  polygon: readonly Point[],
  factor: number,
): Point[] {
  return polygon.map((p) => ({ x: p.x * factor, y: p.y * factor }));
}

/** Area in square pixels converted to square millimetres. */
export function areaInMillimetresSquared(
  areaPx: number,
  millimetresPerPixel: number,
): number | null {
  if (!Number.isFinite(areaPx) || areaPx < 0) return null;
  if (!Number.isFinite(millimetresPerPixel) || millimetresPerPixel <= 0) {
    return null;
  }
  return areaPx * millimetresPerPixel * millimetresPerPixel;
}

/** A polygon measured in millimetres: area and perimeter both scaled once. */
export function measurePolygonInMillimetres(
  polygonPx: readonly Point[],
  millimetresPerPixel: number,
): { areaMm2: number; perimeterMm: number } | null {
  if (!Number.isFinite(millimetresPerPixel) || millimetresPerPixel <= 0) {
    return null;
  }
  const area = areaInMillimetresSquared(
    polygonArea(polygonPx),
    millimetresPerPixel,
  );
  if (area === null) return null;
  return {
    areaMm2: area,
    perimeterMm: polygonPerimeter(polygonPx) * millimetresPerPixel,
  };
}

export interface OpeningDeduction {
  /** Total opening area that was subtracted, in square millimetres. */
  deductedMm2: number;
  /** Gross minus openings, floored at zero. */
  netMm2: number;
  /** True when the openings exceeded the wall, which is a data error. */
  overDeducted: boolean;
}

/**
 * Net wall area: gross area less the openings cut into it.
 *
 * Openings can never exceed the wall they sit in. When they do the numbers are
 * wrong, so the result is floored at zero and flagged rather than returned as a
 * negative area that would quietly shrink a material order.
 */
export function deductOpenings(
  grossMm2: number,
  openingAreasMm2: readonly number[],
): OpeningDeduction {
  const gross = Number.isFinite(grossMm2) && grossMm2 > 0 ? grossMm2 : 0;
  const deducted = openingAreasMm2.reduce(
    (sum, area) => (Number.isFinite(area) && area > 0 ? sum + area : sum),
    0,
  );
  const net = gross - deducted;
  return {
    deductedMm2: deducted,
    netMm2: net > 0 ? net : 0,
    overDeducted: deducted > gross,
  };
}

/** Rectangular opening as a polygon, given its bottom-left corner. */
export function rectangle(
  x: number,
  y: number,
  width: number,
  height: number,
): Point[] {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}
