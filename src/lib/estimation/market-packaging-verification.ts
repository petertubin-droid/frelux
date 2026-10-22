/**
 * Market packaging transparency for takeoff calculators.
 *
 * These registries are planning assumptions, not evidence that a package
 * format is legally or commercially standard in a country. Product and
 * supplier-specific packaging must be confirmed before procurement.
 */
export type PackagingEvidenceStatus =
  "planning_assumption" | "user_confirmed" | "not_available";

export interface PackagingEvidence {
  marketCode: string;
  item: string;
  quantityKg: number | null;
  status: PackagingEvidenceStatus;
  label: string;
  guidance: string;
}

export function getPackagingEvidence(
  marketCode: string,
  item: string,
  quantityKg: number | undefined,
): PackagingEvidence {
  const market = (marketCode || "UNSPECIFIED").toUpperCase();
  const valid = Number.isFinite(quantityKg) && (quantityKg ?? 0) > 0;
  return {
    marketCode: market,
    item,
    quantityKg: valid ? quantityKg! : null,
    status: valid ? "planning_assumption" : "not_available",
    label: valid
      ? "Planning assumption · supplier confirmation required"
      : "Package size not verified",
    guidance: valid
      ? `${quantityKg} kg ${item} pack is a takeoff assumption for ${market}, not a verified country-wide standard. Confirm the product label and supplier pack size before ordering.`
      : `No package size is available for ${item} in ${market}. Enter the actual product pack size before estimating purchase quantities.`,
  };
}
