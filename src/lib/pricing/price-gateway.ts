// =========================================================
// PRICE GATEWAY, one resolver, one response shape
//
// Phase 3 of the ecosystem synchronisation. The existing price
// modules are not wrong, they are uncoordinated: each estimator reads
// estimation_prices its own way, so the same market can be "verified"
// in one screen and "reference only" in another.
//
// This module does not replace any of them. It wraps the resolver that
// already implements the honest market-first order
// (resolveCityAwarePriceByRole, which delegates to
// resolveMaterialPriceByRole and then, in NG, prefers city-level
// listing evidence when it exists) and adds the two things callers keep
// getting wrong:
//
//   1. coverage, from the same snapshot the honesty badges use, so a
//      resolved number never travels without the sentence that says how
//      local it actually is;
//   2. provenance, so a price can be traced to a market, a row and a
//      date instead of appearing from nowhere.
//
// Rules this module enforces rather than trusts:
//   - No fabricated fallback. When nothing is priced, the status is
//     "not_priced" and the amount is null. Callers must handle it.
//   - A price borrowed from an ancestor market is "inherited", never
//     silently reported as local.
//   - Tax is always tax_not_determined. There is no default rate.
// =========================================================

import type { MaterialRole } from "@/lib/estimation/market-materials";
import { resolveCityAwarePriceByRole } from "@/lib/price-index/calculator-prices";
import { coverageFor, type MarketCoverage } from "@/lib/pricing/price-honesty";

/** How a resolved amount relates to the market that asked for it. */
export type PriceResolutionStatus =
  /** Priced in the requested market, and that market has verified prices. */
  | "local"
  /** Priced in the requested market, but coverage is unverified or partial. */
  | "unverified"
  /** Priced from an ancestor market through the inheritance chain. */
  | "inherited"
  /** Nothing priced, and nothing invented to cover for it. */
  | "not_priced";

/** Never a number. Tax needs a jurisdiction decision, not a default. */
export type TaxStatus = "tax_not_determined";

export interface PriceRequest {
  /** ISO market code the caller is pricing for. */
  market: string;
  /** Assembly role to price, as used by every estimator. */
  role: MaterialRole;
  /** Optional quantity, so the gateway can return a line total. */
  quantity?: number | null;
  /** Optional city, used where city-level evidence exists (NG today). */
  citySlug?: string | null;
}

export interface PriceProvenance {
  /** "city" when local listing evidence won, "market" otherwise. */
  basis: "market" | "city";
  /** Listings behind a city price, when the basis is city. */
  citySamples: number | null;
  citySlug: string | null;
  /** True when the amount is an indicative market figure, not a local one. */
  indicative: boolean;
  /** estimation_prices row id, or the bundled-book composite id. */
  priceId: string | null;
  materialSlug: string | null;
  materialName: string | null;
  /** Market whose price book actually supplied the amount. */
  sourcedMarket: string | null;
  requestedMarket: string;
  effectiveDate: string | null;
  /** Who supplied the price, when the row records it. */
  priceSource: string | null;
  scanConfidence: "low" | "medium" | "high" | null;
}

export interface PriceResolution {
  status: PriceResolutionStatus;
  role: MaterialRole;
  requestedMarket: string;
  sourcedMarket: string | null;
  unitPrice: number | null;
  currency: string | null;
  quantity: number | null;
  /** unitPrice * quantity, or null when either side is unknown. */
  total: number | null;
  taxStatus: TaxStatus;
  /** Coverage of the requested market, as the honesty badges report it. */
  coverage: Pick<
    MarketCoverage,
    "marketCode" | "status" | "statusLabel" | "sentence" | "snapshotStale"
  > | null;
  provenance: PriceProvenance;
  /** Anything the caller should show beside the number. */
  warnings: string[];
  /** One honest sentence for the UI. Never claims more than is known. */
  message: string;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Resolve one priced role for one market.
 *
 * Delegates the reading to resolveMaterialPriceByRole and classifies the
 * result. Never throws for a missing price: an unpriced role is a normal
 * state that every caller must handle.
 */
export async function resolvePrice(
  request: PriceRequest,
): Promise<PriceResolution> {
  const requestedMarket = (request.market || "").toUpperCase();
  const coverage = coverageFor(requestedMarket);
  const quantity =
    typeof request.quantity === "number" && Number.isFinite(request.quantity)
      ? request.quantity
      : null;

  const base = {
    role: request.role,
    requestedMarket,
    quantity,
    taxStatus: "tax_not_determined" as const,
    coverage: coverage
      ? {
          marketCode: coverage.marketCode,
          status: coverage.status,
          statusLabel: coverage.statusLabel,
          sentence: coverage.sentence,
          snapshotStale: coverage.snapshotStale,
        }
      : null,
  };

  if (!requestedMarket) {
    return {
      ...base,
      status: "not_priced",
      sourcedMarket: null,
      unitPrice: null,
      currency: null,
      total: null,
      provenance: emptyProvenance(""),
      warnings: ["No market supplied, so no price can be resolved."],
      message: "Choose a market to price this item.",
    };
  }

  const resolved = await resolveCityAwarePriceByRole(
    request.role,
    requestedMarket,
    request.citySlug ?? null,
  );

  if (!resolved) {
    return {
      ...base,
      status: "not_priced",
      sourcedMarket: null,
      unitPrice: null,
      currency: null,
      total: null,
      provenance: emptyProvenance(requestedMarket),
      warnings: coverage ? [coverage.sentence] : [],
      message: `No price for ${request.role} in ${requestedMarket}. Enter a price to continue.`,
    };
  }

  const sourcedMarket = (resolved.resolved_market || "").toUpperCase();
  const inherited = sourcedMarket !== "" && sourcedMarket !== requestedMarket;
  const unitPrice = resolved.price.price;
  const currency = resolved.price.currency ?? null;

  const status: PriceResolutionStatus = inherited
    ? "inherited"
    : coverage?.status === "local"
      ? "local"
      : "unverified";

  const warnings: string[] = [];
  if (inherited) {
    warnings.push(
      `Price for ${request.role} in ${requestedMarket} is inherited from ${sourcedMarket}.`,
    );
  }
  if (coverage) {
    warnings.push(coverage.sentence);
    if (coverage.snapshotStale) {
      warnings.push("The price verification snapshot is older than 45 days.");
    }
  }
  if (status === "unverified" && !inherited) {
    warnings.push(
      `${requestedMarket} has no verified price book, so this is an unverified local price.`,
    );
  }

  return {
    ...base,
    status,
    sourcedMarket: sourcedMarket || null,
    unitPrice,
    currency,
    total: quantity === null ? null : round2(unitPrice * quantity),
    provenance: {
      basis: resolved.basis,
      citySamples: resolved.city_samples ?? null,
      citySlug: resolved.city_slug ?? null,
      indicative: resolved.indicative,
      priceId: resolved.price.id ?? null,
      materialSlug: resolved.material.slug ?? null,
      materialName: resolved.material.name ?? null,
      sourcedMarket: sourcedMarket || null,
      requestedMarket,
      effectiveDate: resolved.price.effective_date ?? null,
      priceSource: resolved.price.price_source ?? null,
      scanConfidence: resolved.price.scan_confidence ?? null,
    },
    warnings,
    message: inherited
      ? `${request.role} priced from ${sourcedMarket} because ${requestedMarket} has no local price.`
      : status === "local"
        ? `${request.role} priced from ${requestedMarket} verified prices.`
        : `${request.role} priced from ${requestedMarket}, unverified.`,
  };
}

/** Resolve several roles for one market, preserving request order. */
export async function resolvePrices(
  market: string,
  roles: readonly MaterialRole[],
): Promise<PriceResolution[]> {
  const results: PriceResolution[] = [];
  for (const role of roles) {
    results.push(await resolvePrice({ market, role }));
  }
  return results;
}

/**
 * True when every resolution carries an amount. Callers use this to
 * decide whether a calculation may proceed; it never coerces a missing
 * price into a zero.
 */
export function allPriced(resolutions: readonly PriceResolution[]): boolean {
  return (
    resolutions.length > 0 &&
    resolutions.every((r) => r.unitPrice !== null && r.unitPrice > 0)
  );
}

/** Roles that could not be priced, in request order. */
export function unpricedRoles(
  resolutions: readonly PriceResolution[],
): MaterialRole[] {
  return resolutions.filter((r) => r.unitPrice === null).map((r) => r.role);
}

function emptyProvenance(requestedMarket: string): PriceProvenance {
  return {
    basis: "market",
    citySamples: null,
    citySlug: null,
    indicative: true,
    priceId: null,
    materialSlug: null,
    materialName: null,
    sourcedMarket: null,
    requestedMarket,
    effectiveDate: null,
    priceSource: null,
    scanConfidence: null,
  };
}
