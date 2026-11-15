/**
 * Site conditions, physical bulking factors, and geometric layout modifiers.
 *
 * Deterministic engineering constants representing physical site realities:
 * - Bulking and shrinkage factors (dry vs wet volume conversion).
 * - Substrate porosity modifiers (paint/screed absorption).
 * - Cutting and layout geometry complexity factors (tile and floor cutting waste).
 *
 * Reference & Standards Note:
 * - 1.54 concrete dry volume factor: standard empirical factor (e.g. BS 8110 / IS 456 / textbook mix design)
 *   accounting for sand filling aggregate voids and water cement paste reduction.
 * - 1.33 mortar bulking factor: empirical factor accounting for dry volume shrinkage when mixing mortar.
 * - 1.25 hardcore bulking factor: loose-to-compacted stone conversion.
 * Specific site aggregates and moisture conditions can vary; these factors represent transparent baseline defaults.
 */
// ============================================================================
// 1. Dry Volume vs Wet Volume Bulking & Shrinkage Factors
// ============================================================================

/**
 * Standard concrete dry volume factor: 1.54.
 * When dry cement, sand, and aggregate are mixed with water, sand grains fill the
 * voids between coarse aggregates and fine cement fills sand voids.
 * A finished 1.0 m³ wet compacted concrete slab requires 1.52 to 1.54 m³ of
 * dry loose ingredients.
 */
export const CONCRETE_DRY_VOLUME_FACTOR = 1.54;

/**
 * Standard mortar dry volume factor: 1.33.
 * Sand and cement mortar shrinks by approximately 25-33% when mixed with water.
 * A 1.0 m³ wet mortar joint or plaster layer requires 1.33 m³ of dry loose materials.
 */
export const MORTAR_DRY_VOLUME_FACTOR = 1.33;

/**
 * Hardcore / crushed stone loose bulking factor: 1.25.
 * Compacted stone fill requires 1.25x loose volume to reach design compaction.
 */
export const HARDCORE_LOOSE_BULKING_FACTOR = 1.25;

/**
 * Excavation bulking factor: 1.20.
 * Undisturbed virgin soil expands by 20% to 25% when excavated loose.
 */
export const EXCAVATION_BULKING_FACTOR = 1.2;

// ============================================================================
// 2. Substrate & Surface Porosity Modifiers (Paint / Plaster / Screed)
// ============================================================================

export type SurfacePorosityKey =
  "raw_plaster" | "screeded" | "repaint" | "unrendered_block";

export interface SurfacePorosityProfile {
  key: SurfacePorosityKey;
  label: string;
  coverageMultiplier: number;
  primerRecommended: boolean;
  extraCoatsRecommended: number;
  description: string;
}

export const SURFACE_POROSITY_PROFILES: Readonly<
  Record<SurfacePorosityKey, SurfacePorosityProfile>
> = Object.freeze({
  raw_plaster: {
    key: "raw_plaster",
    label: "Raw / Newly Plastered Cement Wall",
    coverageMultiplier: 0.75, // 0.75x spread rate -> ~33% more paint on absorption coat
    primerRecommended: true,
    extraCoatsRecommended: 0,
    description:
      "High porosity suction: unsealed fresh cement-sand absorbs liquid binder aggressively.",
  },
  screeded: {
    key: "screeded",
    label: "Screeded / Skim-Coated Wall",
    coverageMultiplier: 1.0, // standard baseline
    primerRecommended: true,
    extraCoatsRecommended: 0,
    description:
      "Smooth, uniform plaster of Paris (POP) or acrylic skim coat with standard baseline coverage.",
  },
  repaint: {
    key: "repaint",
    label: "Previously Painted (Repaint)",
    coverageMultiplier: 1.15, // 15% higher coverage because surface is already sealed
    primerRecommended: false,
    extraCoatsRecommended: 0,
    description:
      "Sealed substrate: existing sound coats prevent suction, resulting in higher spread rate.",
  },
  unrendered_block: {
    key: "unrendered_block",
    label: "Unrendered Sandcrete / Brick Blockwork",
    coverageMultiplier: 0.6, // 0.6x spread rate -> 66% more paint
    primerRecommended: true,
    extraCoatsRecommended: 1,
    description:
      "Extremely porous and textured surface: heavy suction into hollow/solid block pores.",
  },
});

export function resolveSurfacePorosity(
  key?: string | null,
): SurfacePorosityProfile {
  if (!key) return SURFACE_POROSITY_PROFILES.screeded;
  const normalized = key.toLowerCase().trim();
  if (
    normalized === "raw_plaster" ||
    normalized === "new_plastered" ||
    normalized === "plaster"
  ) {
    return SURFACE_POROSITY_PROFILES.raw_plaster;
  }
  if (
    normalized === "repaint" ||
    normalized === "previously_painted" ||
    normalized === "sound_repaint"
  ) {
    return SURFACE_POROSITY_PROFILES.repaint;
  }
  if (
    normalized === "unrendered_block" ||
    normalized === "blockwork" ||
    normalized === "brick"
  ) {
    return SURFACE_POROSITY_PROFILES.unrendered_block;
  }
  return SURFACE_POROSITY_PROFILES.screeded;
}

// ============================================================================
// 3. Layout Cutting & Geometry Breakage Modifiers (Flooring & Tiling)
// ============================================================================

export type LayoutComplexityKey =
  "simple_rectangular" | "standard_residential" | "complex_diagonal";

export interface LayoutComplexityProfile {
  key: LayoutComplexityKey;
  label: string;
  wastePercent: number;
  description: string;
}

export const LAYOUT_COMPLEXITY_PROFILES: Readonly<
  Record<LayoutComplexityKey, LayoutComplexityProfile>
> = Object.freeze({
  simple_rectangular: {
    key: "simple_rectangular",
    label: "Large Open Hall (Straight Grid)",
    wastePercent: 6, // 5% - 7%
    description:
      "Few cuts, straight parallel grid, minimum perimeter waste (typical 5-7%).",
  },
  standard_residential: {
    key: "standard_residential",
    label: "Standard Multi-Room Residential",
    wastePercent: 10, // 8% - 10%
    description:
      "Standard doorways, closets, window reveals and perimeter cuts (typical 8-10%).",
  },
  complex_diagonal: {
    key: "complex_diagonal",
    label: "Complex / Diagonal Pattern / Bathrooms",
    wastePercent: 14, // 12% - 15%
    description:
      "45-degree angle diagonal cuts, pipe penetrations, niche recesses and triangular off-cuts (typical 12-15%).",
  },
});

export function resolveLayoutWastePercent(key?: string | null): number {
  if (!key) return LAYOUT_COMPLEXITY_PROFILES.standard_residential.wastePercent;
  const normalized = key.toLowerCase().trim();
  if (
    normalized === "simple_rectangular" ||
    normalized === "open_hall" ||
    normalized === "simple"
  ) {
    return LAYOUT_COMPLEXITY_PROFILES.simple_rectangular.wastePercent;
  }
  if (
    normalized === "complex_diagonal" ||
    normalized === "diagonal" ||
    normalized === "complex" ||
    normalized === "bathroom"
  ) {
    return LAYOUT_COMPLEXITY_PROFILES.complex_diagonal.wastePercent;
  }
  return LAYOUT_COMPLEXITY_PROFILES.standard_residential.wastePercent;
}

// ============================================================================
// 3. Paint surface modifiers
// ============================================================================

/**
 * The coverage multipliers the paint estimator applies, kept beside the porosity
 * profiles so a surface has one definition in the codebase. Values are unchanged
 * from the estimator table they were moved from; the profile keys above describe
 * the same physics and are the reference for any future recalibration.
 */
export const PAINT_SURFACE_FACTORS = Object.freeze({
  screeded: {
    factor: 1.0,
    label: "Screeded / prepared plaster",
    description:
      "Sound prepared plaster, unpainted: the standard coverage baseline.",
  },
  smooth: {
    factor: 1.15,
    label: "Previously painted / sealed",
    description:
      "Sealed, sound surface: about 15% less paint than a bare screed.",
  },
  textured: {
    factor: 0.85,
    label: "Textured",
    description: "Textured surface, about 15% more paint absorbed.",
  },
  rough: {
    factor: 0.75,
    label: "Rough",
    description: "Rough surface, about 25% more paint absorbed.",
  },
  new_plaster: {
    factor: 0.75,
    label: "New / Bare Plaster",
    description:
      "Unsealed fresh plaster absorbs binder: about 33% more paint on the first coat. Primer strongly recommended.",
  },
} as const);

/** Which porosity profile a paint surface behaves like, for cross checking. */
export const PAINT_SURFACE_TO_POROSITY: Readonly<
  Record<string, SurfacePorosityKey>
> = Object.freeze({
  screeded: "screeded",
  smooth: "repaint",
  // Texture is a geometry effect (more area per square metre), not extra
  // absorption: the profile stays screeded while the coverage factor carries
  // the 15% area penalty.
  textured: "screeded",
  rough: "raw_plaster",
  new_plaster: "raw_plaster",
});

export function resolvePaintSurfaceFactor(surface?: string | null): number {
  const key = (surface ?? "").trim().toLowerCase();
  return (
    (PAINT_SURFACE_FACTORS as Record<string, { factor: number }>)[key]
      ?.factor ?? 1
  );
}
