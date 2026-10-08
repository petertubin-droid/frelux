/**
 * Built-in default quality level for paint products.
 *
 * Problem this solves: the painting estimator requires a quality level
 * before it can calculate, but a product with no configured quality rows
 * (the live state until an admin adds tiers) left the form permanently
 * blocked with "Quality level is required."
 *
 * Rule: when a paint product has NO active quality rows, the estimator
 * offers one built-in "Standard" level so the calculator works out of the
 * box. As soon as an admin adds real quality levels for that product, the
 * built-in one disappears and users pick from the real tiers. Nothing is
 * written to the database and the engine is not loosened: the default is
 * an ordinary quality object that carries a real coverage figure, the same
 * platform-wide default (DEFAULT_COVERAGE_M2_PER_LITER) the other paint
 * calculators already use. The engine still never invents a value.
 */
import { DEFAULT_COVERAGE_M2_PER_LITER } from "@/lib/calc";
import type { EstimationProductQuality } from "@/types/estimation";

/** Prefix of every synthetic default id; real ids are UUIDs. */
export const DEFAULT_QUALITY_ID_PREFIX = "default-quality:";

export function defaultQualityIdFor(productId: string): string {
  return `${DEFAULT_QUALITY_ID_PREFIX}${productId}`;
}

/** True for the built-in (not database-backed) default quality. */
export function isDefaultQualityId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(DEFAULT_QUALITY_ID_PREFIX);
}

/** Builds the built-in "Standard" quality for one product. */
export function buildDefaultQuality(
  productId: string,
): EstimationProductQuality {
  return {
    id: defaultQualityIdFor(productId),
    product_id: productId,
    name: "Standard",
    slug: "standard",
    description:
      "Default quality level. Used when no quality tiers are configured for this paint.",
    coverage: DEFAULT_COVERAGE_M2_PER_LITER,
    coverage_unit: "m2_per_liter",
    ceiling_coverage: null,
    ceiling_coverage_unit: null,
    finish: null,
    texture: null,
    gloss_level: null,
    shine_level: null,
    durability: null,
    is_active: true,
    sort_order: 0,
    created_at: "",
    updated_at: "",
  };
}

/**
 * Returns the quality list for a product, falling back to the built-in
 * default only when the product has no active quality rows of its own.
 */
export function withDefaultQuality(
  productId: string,
  qualities: EstimationProductQuality[] | undefined,
): EstimationProductQuality[] {
  const real = qualities ?? [];
  if (real.some((q) => q.is_active)) return real;
  return [...real, buildDefaultQuality(productId)];
}
