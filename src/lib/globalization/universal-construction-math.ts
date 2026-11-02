/**
 * Universal Global Construction Physics & Mathematics Module
 *
 * Provides standardized, deterministic conversions and engineering formulas
 * across international metric, imperial, and regional standards.
 *
 * 1. Bar Bending Schedule (BBS) & Rebar Weight:
 *    - Metric (ISO/EN): (diameter_mm^2) / 162 * length_m (returns kg)
 *    - Imperial (ASTM): (bar_number^2) * 0.04167 * length_ft (returns lbs)
 *
 * 2. Concrete Structural Grade & Materials Engine:
 *    - Volumetric Shrinkage Constancy: 1.54 dry-to-wet factor
 *    - International Structural Grades:
 *      * C15 / M15 (Lean foundation concrete): 1 : 2 : 4
 *      * C20 / M20 (Residential slabs & beams): 1 : 1.5 : 3
 *      * C25 / M25 (High-strength structural elements): 1 : 1 : 2
 *    - Cement bulk density: 1440 kg/m³
 *
 * 3. Irregular Polygon Coordinate Geometry (Shoelace Algorithm):
 *    - Calculates planar area of any non-self-intersecting polygon
 *      from survey / Cartesian coordinates [(x1, y1), (x2, y2), ...]
 */

export type RebarUnitSystem = "metric" | "imperial";

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
 * Metric: length in meters, size in mm. Formula: (D^2 / 162) * length
 * Imperial: length in feet, size as ASTM bar number (e.g. 3, 4, 5). Formula: (bar_number^2 * 0.04167) * length
 */
export function calculateGlobalRebarWeight(
  sizeInput: number | string,
  length: number,
  unitSystem: RebarUnitSystem = "metric",
): RebarWeightResult {
  if (!Number.isFinite(length) || length <= 0) {
    throw new RangeError(`Length must be a positive finite number (received ${length}).`);
  }

  if (unitSystem === "metric") {
    const diameter = typeof sizeInput === "string" ? parseFloat(sizeInput) : sizeInput;
    if (!Number.isFinite(diameter) || diameter <= 0) {
      throw new RangeError(`Metric rebar diameter must be positive (received ${sizeInput}).`);
    }
    const weightPerMeter = (diameter ** 2) / 162;
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
    const barNumber = typeof sizeInput === "string" ? parseInt(sizeInput.replace(/^#/, ""), 10) : Math.round(sizeInput);
    if (!Number.isFinite(barNumber) || barNumber <= 0) {
      throw new RangeError(`Imperial bar number must be a positive integer (received ${sizeInput}).`);
    }
    // ASTM: Weight (lb/ft) = (Imperial Bar Number)^2 * 0.04167
    const weightPerFoot = (barNumber ** 2) * 0.04167;
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

/**
 * Standard International Concrete Grade database.
 * Maps European (C) and Indian/Asian (M) characteristic strength grades
 * to volumetric nominal mix ratios (Cement : Sand : Coarse Aggregate).
 */
export const GLOBAL_CONCRETE_GRADE_MAP: Record<string, [number, number, number]> = {
  C15: [1, 2, 4],
  M15: [1, 2, 4],
  C20: [1, 1.5, 3],
  M20: [1, 1.5, 3],
  C25: [1, 1, 2],
  M25: [1, 1, 2],
};

/** Global physical constant: dry-to-wet shrinkage factor for aggregate mix */
export const GLOBAL_DRY_SHRINKAGE_FACTOR = 1.54;

/** Global physical constant: dry uncompacted bulk density of Portland cement (kg/m³) */
export const GLOBAL_CEMENT_DENSITY_KG_M3 = 1440;

export interface GlobalConcreteQuantities {
  grade: string;
  mixRatio: [number, number, number];
  wetVolumeM3: number;
  dryVolumeM3: number;
  cementMetricTons: number;
  cementKg: number;
  sandCubicMeters: number;
  gravelCubicMeters: number;
}

/**
 * Computes cement, sand, and gravel quantities based on international structural grades.
 *
 * @param volumeM3 Wet compacted concrete volume in cubic meters
 * @param grade International structural strength grade (e.g. "C15", "C20", "C25", "M20")
 */
export function calculateGlobalConcrete(
  volumeM3: number,
  grade: string = "C20",
): GlobalConcreteQuantities {
  if (!Number.isFinite(volumeM3) || volumeM3 <= 0) {
    throw new RangeError(`Concrete volume must be a positive finite number (received ${volumeM3}).`);
  }

  const normalizedGrade = grade.trim().toUpperCase();
  const ratio = GLOBAL_CONCRETE_GRADE_MAP[normalizedGrade] ?? [1, 2, 4];

  // Dry volume allowance based on global physical constant 1.54
  const dryVolume = volumeM3 * GLOBAL_DRY_SHRINKAGE_FACTOR;
  const totalParts = ratio[0] + ratio[1] + ratio[2];

  const cementVol = (ratio[0] / totalParts) * dryVolume;
  const sandVol = (ratio[1] / totalParts) * dryVolume;
  const gravelVol = (ratio[2] / totalParts) * dryVolume;

  // Cement mass via standard bulk density (1440 kg/m³)
  const cementKg = cementVol * GLOBAL_CEMENT_DENSITY_KG_M3;

  return {
    grade: normalizedGrade,
    mixRatio: ratio,
    wetVolumeM3: Math.round(volumeM3 * 100) / 100,
    dryVolumeM3: Math.round(dryVolume * 100) / 100,
    cementMetricTons: Math.round((cementKg / 1000) * 100) / 100,
    cementKg: Math.round(cementKg * 10) / 10,
    sandCubicMeters: Math.round(sandVol * 100) / 100,
    gravelCubicMeters: Math.round(gravelVol * 100) / 100,
  };
}

export type CartesianCoordinate = [number, number] | { x: number; y: number };

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
      throw new RangeError(`Vertex at index ${i} contains non-finite coordinates: (${x}, ${y}).`);
    }
    return [x, y];
  });

  let area = 0.0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    // Cross-product term: x_i * y_{j} - y_i * x_{j}
    area += pts[i][0] * pts[j][1];
    area -= pts[i][1] * pts[j][0];
  }

  return Math.round((Math.abs(area) / 2.0) * 100) / 100;
}
