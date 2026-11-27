/**
 * Universal Global Construction Physics & Mathematics Module
 *
 * Provides standardized, deterministic conversions and engineering formulas
 * across international metric, imperial, and regional standards.
 *
 * 1. Bar Bending Schedule (BBS) & Rebar Weight:
 *    - Metric (BS 4449 / EN 10080): 0.006165 * diameter_mm^2 * length_m (returns kg),
 *      the nominal mass in closed form at 7850 kg/m3, shared with every other
 *      rebar path so a bar weight cannot depend on which module is open
 *    - Imperial (ASTM): (bar_number^2) * 0.04167 * length_ft (returns lbs)
 *
 * 2. Concrete material takeoff:
 *    - An explicit user-supplied volumetric mix ratio and dry-volume allowance
 *    - No conversion from strength grade to mix ratio: strength depends on
 *      materials, water/cement ratio, batching, curing and the governing code.
 *    - Cement bulk density is an editable planning assumption, not universal.
 *
 * 3. Irregular Polygon Coordinate Geometry (Shoelace Algorithm):
 *    - Calculates planar area of any non-self-intersecting polygon
 *      from survey / Cartesian coordinates [(x1, y1), (x2, y2), ...]
 */

import { rebarMassPerM } from "../estimation/shared/rebar-mass";

export type RebarUnitSystem = "metric" | "imperial";

/**
 * ASTM A615 / A706 Standard Specification for Deformed and Plain Carbon-Steel Bars.
 * Standard nominal unit weight in pounds per linear foot (lb/ft).
 *
 * For bar sizes #3 through #8, nominal diameter equals (Bar Number / 8) inches.
 * For bar sizes #9 through #18, nominal dimensions correspond to equivalent-area square bars.
 */
export const ASTM_A615_NOMINAL_WEIGHTS_LB_PER_FT: Readonly<Record<number, number>> = {
  3: 0.376,
  4: 0.668,
  5: 1.043,
  6: 1.502,
  7: 2.044,
  8: 2.670,
  9: 3.400,
  10: 4.303,
  11: 5.313,
  14: 7.650,
  18: 13.600,
};

export interface GlobalRebarWeightOptions {
  /**
   * When true or when standard ASTM bar numbers (3-18) are given, uses published
   * ASTM A615 / A706 Table 1 nominal weights rather than the historical (N^2 * 0.04167) shortcut.
   */
  standardTable?: boolean;
}

export interface RebarWeightResult {
  weight: number;
  unit: "kg" | "lbs";
  unitSystem: RebarUnitSystem;
  unitWeightPerUnitLength: number;
  length: number;
  sizeInput: number | string;
}

/**
 * Calculates rebar weight globally across metric and imperial systems.
 *
 * Metric: length in meters, size in mm. Nominal mass 0.006165 D^2 kg/m, the
 * BS 4449 table value (12 mm 0.888, 16 mm 1.578, 25 mm 3.853 kg/m). The d^2/162
 * approximation this module used is 0.13 per cent heavy, about 13 kg per tonne.
 * Imperial: length in feet, size as ASTM bar number (e.g. 3, 4, 5). Formula: (bar_number^2 * 0.04167) * length
 */
export function calculateGlobalRebarWeight(
  sizeInput: number | string,
  length: number,
  unitSystem: RebarUnitSystem = "metric",
  options?: GlobalRebarWeightOptions,
): RebarWeightResult {
  if (!Number.isFinite(length) || length <= 0) {
    throw new RangeError(
      `Length must be a positive finite number (received ${length}).`,
    );
  }

  if (unitSystem === "metric") {
    const diameter =
      typeof sizeInput === "string" && /^\d+(?:\.\d+)?$/.test(sizeInput.trim())
        ? Number(sizeInput.trim())
        : typeof sizeInput === "number"
          ? sizeInput
          : Number.NaN;
    if (!Number.isFinite(diameter) || diameter <= 0) {
      throw new RangeError(
        `Metric rebar diameter must be positive (received ${sizeInput}).`,
      );
    }
    const weightPerMeter = rebarMassPerM(diameter);
    const totalWeight = Math.round(weightPerMeter * length * 100) / 100;
    return {
      weight: totalWeight,
      unit: "kg",
      unitSystem: "metric",
      unitWeightPerUnitLength: Math.round(weightPerMeter * 1000) / 1000,
      length,
      sizeInput,
    };
  } else if (unitSystem === "imperial") {
    const rawBarNumber =
      typeof sizeInput === "string" && /^#?\d+$/.test(sizeInput.trim())
        ? Number(sizeInput.trim().replace(/^#/, ""))
        : typeof sizeInput === "number"
          ? sizeInput
          : Number.NaN;
    const barNumber = rawBarNumber;
    if (
      !Number.isFinite(barNumber) ||
      !Number.isInteger(barNumber) ||
      barNumber <= 0
    ) {
      throw new RangeError(
        `Imperial bar number must be a positive integer (received ${sizeInput}).`,
      );
    }
    // ASTM: Check published ASTM A615/A706 nominal weight if standardTable is opted in or
    // fallback to standard formula (Bar Number)^2 * 0.04167 for legacy formula compatibility.
    const publishedAstm = ASTM_A615_NOMINAL_WEIGHTS_LB_PER_FT[barNumber];
    const weightPerFoot =
      options?.standardTable && publishedAstm !== undefined
        ? publishedAstm
        : barNumber ** 2 * 0.04167;
    const totalWeight = Math.round(weightPerFoot * length * 100) / 100;
    return {
      weight: totalWeight,
      unit: "lbs",
      unitSystem: "imperial",
      unitWeightPerUnitLength: Math.round(weightPerFoot * 1000) / 1000,
      length,
      sizeInput,
    };
  } else {
    throw new RangeError(`Unsupported unit system: ${unitSystem}`);
  }
}

/** Explicit volumetric mix ratio, ordered cement : fine aggregate : coarse aggregate. */
export type ConcreteMixRatio = readonly [number, number, number];

/**
 * Planning defaults only. They are not universal physical constants or
 * structural-grade mappings; callers should expose and disclose these values.
 */
export const GLOBAL_DRY_SHRINKAGE_FACTOR = 1.54;
export const GLOBAL_CEMENT_DENSITY_KG_M3 = 1440;

export interface GlobalConcreteQuantities {
  /** User-provided label; never inferred to be a strength class. */
  grade: string;
  mixRatio: ConcreteMixRatio;
  wetVolumeM3: number;
  dryVolumeM3: number;
  cementMetricTons: number;
  cementKg: number;
  sandCubicMeters: number;
  gravelCubicMeters: number;
  /** Volume in cubic yards (yd³) for North American / imperial construction */
  wetVolumeYd3: number;
  dryVolumeYd3: number;
  /** Cement weight in pounds (lbs) */
  cementLbs: number;
  /** Standard US 94-lb sacks of Portland cement */
  cementBags94lb: number;
  /** Fine aggregate volume in cubic yards */
  sandCubicYards: number;
  /** Coarse aggregate volume in cubic yards */
  gravelCubicYards: number;
}

/**
 * Computes a preliminary constituent takeoff from an explicit volumetric mix
 * ratio. This is not a strength-grade conversion or a concrete design.
 *
 * @param volumeM3 Wet compacted concrete volume in cubic meters
 * @param mixRatio User-supplied cement:fine aggregate:coarse aggregate parts
 * @param label Optional user label, for example a project mix ID (not a grade)
 * @param assumptions Optional dry-volume factor and loose cement density
 */
export interface GlobalConcreteAssumptions {
  dryVolumeFactor?: number;
  cementDensityKgM3?: number;
  /** When "imperial", the input volume is interpreted as cubic yards (yd³) and converted */
  unitSystem?: "metric" | "imperial";
}

export function calculateGlobalConcrete(
  volumeInput: number,
  mixRatio: ConcreteMixRatio,
  label = "user-specified mix",
  assumptions: GlobalConcreteAssumptions = {},
): GlobalConcreteQuantities {
  if (!Number.isFinite(volumeInput) || volumeInput <= 0) {
    throw new RangeError(
      `Concrete volume must be a positive finite number (received ${volumeInput}).`,
    );
  }
  const isImperial = assumptions.unitSystem === "imperial";
  const m3ToYd3 = 1.30795062;
  const volumeM3 = isImperial ? volumeInput / m3ToYd3 : volumeInput;
  if (
    !Array.isArray(mixRatio) ||
    mixRatio.length !== 3 ||
    mixRatio.some((part) => !Number.isFinite(part) || part <= 0)
  ) {
    throw new RangeError(
      "An explicit positive cement:fine aggregate:coarse aggregate ratio is required; strength grades are not mapped to nominal mixes.",
    );
  }
  const dryFactor = assumptions.dryVolumeFactor ?? GLOBAL_DRY_SHRINKAGE_FACTOR;
  const cementDensity =
    assumptions.cementDensityKgM3 ?? GLOBAL_CEMENT_DENSITY_KG_M3;
  if (!Number.isFinite(dryFactor) || dryFactor <= 0) {
    throw new RangeError("Dry-volume factor must be a positive finite number.");
  }
  if (!Number.isFinite(cementDensity) || cementDensity <= 0) {
    throw new RangeError(
      "Cement bulk density must be a positive finite number.",
    );
  }

  const ratio: [number, number, number] = [
    mixRatio[0],
    mixRatio[1],
    mixRatio[2],
  ];
  const dryVolume = volumeM3 * dryFactor;
  const totalParts = ratio[0] + ratio[1] + ratio[2];
  const cementVol = (ratio[0] / totalParts) * dryVolume;
  const sandVol = (ratio[1] / totalParts) * dryVolume;
  const gravelVol = (ratio[2] / totalParts) * dryVolume;
  const cementKg = cementVol * cementDensity;

  // Conversion factor m3ToYd3 defined above
  const kgToLbs = 2.20462;
  const cementTotalLbs = cementKg * kgToLbs;

  return {
    grade: label.trim() || "user-specified mix",
    mixRatio: ratio,
    wetVolumeM3: Math.round(volumeM3 * 100) / 100,
    dryVolumeM3: Math.round(dryVolume * 100) / 100,
    cementMetricTons: Math.round((cementKg / 1000) * 100) / 100,
    cementKg: Math.round(cementKg * 10) / 10,
    sandCubicMeters: Math.round(sandVol * 100) / 100,
    gravelCubicMeters: Math.round(gravelVol * 100) / 100,
    wetVolumeYd3: Math.round(volumeM3 * m3ToYd3 * 100) / 100,
    dryVolumeYd3: Math.round(dryVolume * m3ToYd3 * 100) / 100,
    cementLbs: Math.round(cementTotalLbs * 10) / 10,
    cementBags94lb: Math.ceil(cementTotalLbs / 94),
    sandCubicYards: Math.round(sandVol * m3ToYd3 * 100) / 100,
    gravelCubicYards: Math.round(gravelVol * m3ToYd3 * 100) / 100,
  };
}

export type CartesianCoordinate = [number, number] | { x: number; y: number };

/**
 * Cross product / orientation test of vector AB with AC.
 * Returns positive for counter-clockwise turn, negative for clockwise, near 0 if collinear.
 */
function ccw(
  a: readonly [number, number],
  b: readonly [number, number],
  c: readonly [number, number],
): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

/**
 * Checks whether point Q lies on segment PR (assuming P, Q, R are collinear).
 */
function onSegment(
  p: readonly [number, number],
  q: readonly [number, number],
  r: readonly [number, number],
): boolean {
  return (
    q[0] <= Math.max(p[0], r[0]) + 1e-9 &&
    q[0] >= Math.min(p[0], r[0]) - 1e-9 &&
    q[1] <= Math.max(p[1], r[1]) + 1e-9 &&
    q[1] >= Math.min(p[1], r[1]) - 1e-9
  );
}

/**
 * Determines whether two line segments AB and CD intersect (properly or collinearly overlapping).
 */
function segmentsIntersectProper(
  p1: readonly [number, number],
  p2: readonly [number, number],
  p3: readonly [number, number],
  p4: readonly [number, number],
): boolean {
  const EPS = 1e-9;
  const d1 = ccw(p3, p4, p1);
  const d2 = ccw(p3, p4, p2);
  const d3 = ccw(p1, p2, p3);
  const d4 = ccw(p1, p2, p4);

  // General case: strictly crossing
  if (
    ((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) &&
    ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS))
  ) {
    return true;
  }

  // Collinear cases
  if (Math.abs(d1) <= EPS && onSegment(p3, p1, p4)) return true;
  if (Math.abs(d2) <= EPS && onSegment(p3, p2, p4)) return true;
  if (Math.abs(d3) <= EPS && onSegment(p1, p3, p2)) return true;
  if (Math.abs(d4) <= EPS && onSegment(p1, p4, p2)) return true;

  return false;
}

/**
 * Validates whether a polygon's boundary contains any self-intersecting non-adjacent edges.
 */
export function isPolygonSelfIntersecting(
  coordinates: readonly CartesianCoordinate[],
): boolean {
  const n = coordinates.length;
  if (n < 4) return false;

  const pts: [number, number][] = coordinates.map((c) => {
    const x = Array.isArray(c) ? c[0] : c.x;
    const y = Array.isArray(c) ? c[1] : c.y;
    return [x, y];
  });

  for (let i = 0; i < n; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      // Adjacent edges share a legitimate vertex, don't test them
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
      const p3 = pts[j];
      const p4 = pts[(j + 1) % n];
      if (segmentsIntersectProper(p1, p2, p3, p4)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Calculates the exact planar area of any non-self-intersecting irregular polygon
 * using the Shoelace Formula (Surveyor's Formula / Gauss's Area Formula).
 *
 * Formula:
 * Area = 0.5 * | sum_{i=0}^{n-1} (x_i * y_{i+1} - y_i * x_{i+1}) |
 *
 * @param coordinates Array of [x, y] tuples or {x, y} coordinate objects
 * @returns Area in square units (e.g., m² or sq ft depending on input coordinate units)
 */
export function calculateIrregularPolygonArea(
  coordinates: readonly CartesianCoordinate[],
): number {
  const n = coordinates.length;
  if (n < 3) {
    throw new RangeError(
      `An irregular polygon requires at least 3 vertices; received ${n}. Area is never invented.`,
    );
  }

  // Normalize points to [x, y]
  const pts: [number, number][] = coordinates.map((c, i) => {
    const x = Array.isArray(c) ? c[0] : c.x;
    const y = Array.isArray(c) ? c[1] : c.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new RangeError(
        `Vertex at index ${i} contains non-finite coordinates: (${x}, ${y}).`,
      );
    }
    return [x, y];
  });

  if (isPolygonSelfIntersecting(pts)) {
    throw new RangeError(
      "Polygon edges self-intersect; the Shoelace formula requires a simple non-self-intersecting boundary.",
    );
  }

  let area = 0.0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    // Cross-product term: x_i * y_{j} - y_i * x_{j}
    area += pts[i][0] * pts[j][1];
    area -= pts[i][1] * pts[j][0];
  }

  return Math.round((Math.abs(area) / 2.0) * 100) / 100;
}
