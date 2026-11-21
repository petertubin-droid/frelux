/**
 * One resolver for paint coverage, so two admin screens can never disagree
 * about it.
 *
 * Coverage used to have two owners: `paint_types.coverage_rate` (edited in
 * AdminPaintTypes, used by the Paint Calculator) and the
 * `default_coverage_m2_per_liter` calc rule (edited in AdminEstimationConfig,
 * used by the Cost Estimator). Changing one left the other silently in charge,
 * and a litre figure could differ between the two pages for the same wall.
 *
 * The precedence here is deliberate and documented:
 *   1. the selected paint type's own coverage rate (it describes that product)
 *   2. the admin calc rule (a house default)
 *   3. the documented fallback of 10 m²/L
 *
 * A paint type stored in square feet per litre is converted, because a
 * non-metric row would otherwise inflate litres by roughly eleven times.
 */

export const DEFAULT_COVERAGE_M2_PER_LITER = 10;

/** Square metres in one square foot. */
const SQFT_TO_SQM = 0.09290304;

export type CoverageSource = "paint_type" | "calc_rule" | "fallback";

export interface CoverageResolution {
  /** Square metres covered per litre per coat. Always positive. */
  m2PerLiter: number;
  /** Which owner supplied the value, so a page can say where it came from. */
  source: CoverageSource;
}

export interface CoveragePaintTypeLike {
  coverage_rate?: number | string | null;
  coverage_unit?: string | null;
}

function toPositive(value: number | string | null | undefined): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  if (n == null || !Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** True when the row's unit is square feet rather than square metres. */
function isImperialUnit(unit: string | null | undefined): boolean {
  if (!unit) return false;
  const normalised = unit.toLowerCase().replace(/\s+/g, "");
  // "m²/l", "m2/l", "sqm/l" are metric; "ft²/l", "sqft/l", "ft2/l" are not.
  if (normalised.includes("m2") || normalised.includes("m²")) return false;
  return (
    normalised.includes("ft2") ||
    normalised.includes("ft²") ||
    normalised.includes("sqft") ||
    normalised.includes("ft/l")
  );
}

export function resolvePaintCoverage(
  paintType: CoveragePaintTypeLike | null | undefined,
  calcRuleCoverage: number | null | undefined,
): CoverageResolution {
  const fromType = toPositive(paintType?.coverage_rate);
  if (fromType != null) {
    const m2PerLiter = isImperialUnit(paintType?.coverage_unit)
      ? fromType * SQFT_TO_SQM
      : fromType;
    if (Number.isFinite(m2PerLiter) && m2PerLiter > 0) {
      return { m2PerLiter, source: "paint_type" };
    }
  }

  const fromRule = toPositive(calcRuleCoverage);
  if (fromRule != null) return { m2PerLiter: fromRule, source: "calc_rule" };

  return { m2PerLiter: DEFAULT_COVERAGE_M2_PER_LITER, source: "fallback" };
}

/** Litres needed for an area and coat count, rounded up to whole litres. */
export function litresForArea(
  areaM2: number,
  coats: number,
  resolution: CoverageResolution,
): number | null {
  if (!Number.isFinite(areaM2) || areaM2 <= 0) return null;
  const coatCount = Number.isFinite(coats) && coats > 0 ? coats : 1;
  const litres = (areaM2 * coatCount) / resolution.m2PerLiter;
  if (!Number.isFinite(litres) || litres <= 0) return null;
  return Math.ceil(litres);
}

/** Plain-language note naming the owner of the coverage figure. */
export function coverageSourceLabel(source: CoverageSource): string {
  switch (source) {
    case "paint_type":
      return "the selected paint type";
    case "calc_rule":
      return "the admin default";
    default:
      return "the documented default";
  }
}
