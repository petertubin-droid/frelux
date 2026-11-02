/**
 * Price Index, calculator bridge.
 *
 * One question, answered honestly: what price should this calculator use for
 * this material in this city, and how much does that number deserve to be
 * trusted?
 *
 * Evidence ladder, strongest first. Every rung is labelled on the result:
 *   1. approved city index      verified samples, enough of them, same city
 *   2. approved national index  verified samples, enough of them, national
 *   3. qualified supplier offer published city figure resting on verified
 *                               supplier evidence mixed with reported prices
 *   4. crowdsourced benchmark    reported prices only, never market-verified
 *   5. macro-adjusted reference  an FX or indicative band, not a quotation
 *   6. baseline reference        a seeded figure with no live source
 *   7. unavailable, with the reason
 *
 * Two rules the ladder exists to protect:
 *   - A price for one market is never used for another. Passing `market`
 *     filters, and a mismatch says so instead of quietly borrowing.
 *   - Different brands, sale units or package sizes are never pooled into one
 *     median. A conflict is reported, not averaged away.
 *
 * A single submission never becomes a market price here; the sample gate in
 * stats.ts decides, and the returned object always carries the provenance the
 * calculator must display.
 */

import { computeStats, type Sample } from "./stats";
import type { IndexListing, PriceKind } from "./types";

/** Which rung of the evidence ladder a published figure sits on. */
export type EvidenceTier =
  | "approved_city_index"
  | "approved_national_index"
  | "qualified_supplier_offer"
  | "crowdsourced_benchmark"
  | "macro_adjusted_reference"
  | "baseline_reference";

export type UnavailableCode =
  | "no_evidence"
  | "market_mismatch"
  | "mixed_sale_unit"
  | "mixed_brand"
  | "insufficient_sample";

export type ResolvedIndexPrice =
  | {
      status: "ok";
      price: number;
      basis: "city" | "national";
      sample_size: number;
      confidence: "verified" | "mixed" | "reported";
      last_observed_at: string | null;
      price_kind: PriceKind | null;
      sale_unit: string | null;
      city_slug: string | null;
      supplier_note: string | null;
      /** True when the figure is reported, not verified, and must be labelled so. */
      indicative: boolean;
      note: string;
      /** Rung of the evidence ladder this figure sits on. */
      tier: EvidenceTier;
      market: string | null;
      currency: string | null;
      brand: string | null;
      package_size: string | null;
      source_url: string | null;
      /** null when the evidence does not say whether delivery is included. */
      delivery_included: boolean | null;
      /** Set when the figure is not what was asked for, e.g. national instead of city. */
      fallback_reason: string | null;
      /** Everything the calculator must surface alongside the number. */
      warnings: readonly string[];
    }
  | {
      status: "unavailable";
      reason: string;
      code?: UnavailableCode;
    };

export function toSamples(listings: IndexListing[]): Sample[] {
  return listings
    .filter((listing) => Number.isFinite(listing.price) && listing.price > 0)
    .map((listing) => ({
      value: listing.price,
      observed_at:
        (listing.verified_at ?? listing.effective_date ?? "").slice(0, 10) ||
        new Date(0).toISOString().slice(0, 10),
      verification_status: listing.verification_status,
    }));
}

function describeSource(listing: IndexListing | undefined): string | null {
  if (!listing) return null;
  if (listing.supplier_name && listing.price_source) {
    return `${listing.supplier_name}, ${listing.price_source}`;
  }
  return listing.supplier_name ?? listing.price_source ?? null;
}

function mostRecent(listings: IndexListing[]): IndexListing | undefined {
  return [...listings]
    .filter((listing) => listing.effective_date)
    .sort((a, b) => (a.effective_date! < b.effective_date! ? 1 : -1))[0];
}

/**
 * What kind of evidence is this row, judged from what it actually records.
 *
 * The database holds three distinct things that all look like "a price": a
 * supplier quotation, an FX or indicative band, and a seeded baseline. They
 * must never be presented as the same kind of number.
 */
export type EvidenceClass =
  "supplier_verified" | "supplier_reported" | "macro_reference" | "baseline";

export type EvidenceFields = {
  price_source?: string | null;
  supplier_name?: string | null;
  verification_status?: string | null;
};

export function classifyEvidence(listing: EvidenceFields): EvidenceClass {
  const text =
    `${listing.price_source ?? ""} ${listing.supplier_name ?? ""}`.toLowerCase();
  if (/seeded reference|no retailer link|baseline reference/.test(text)) {
    return "baseline";
  }
  if (
    /fx reference|macro|indicative\s+[a-z0-9\s.-]*band|index[- ]adjusted/.test(
      text,
    )
  ) {
    return "macro_reference";
  }
  if (listing.verification_status === "verified") return "supplier_verified";
  return "supplier_reported";
}

function distinctValues(
  listings: IndexListing[],
  pick: (listing: IndexListing) => string | null,
): string[] {
  const seen = new Set<string>();
  for (const listing of listings) {
    const value = pick(listing);
    if (value) seen.add(value);
  }
  return [...seen];
}

function tierFor(
  basis: "city" | "national",
  listings: IndexListing[],
): EvidenceTier {
  const classes = listings.map(classifyEvidence);
  const references = classes.filter(
    (c) => c === "macro_reference" || c === "baseline",
  );
  if (references.length === classes.length && classes.length > 0) {
    return classes.includes("macro_reference")
      ? "macro_adjusted_reference"
      : "baseline_reference";
  }
  const allVerified = classes.every((c) => c === "supplier_verified");
  if (allVerified) {
    return basis === "city" ? "approved_city_index" : "approved_national_index";
  }
  if (basis === "city" && classes.includes("supplier_verified")) {
    return "qualified_supplier_offer";
  }
  return "crowdsourced_benchmark";
}

const TIER_WARNINGS: Record<EvidenceTier, string | null> = {
  approved_city_index: null,
  approved_national_index: null,
  qualified_supplier_offer:
    "Mix of verified and reported prices, so treat this as indicative.",
  crowdsourced_benchmark:
    "Reported prices only. No supplier has verified this figure.",
  macro_adjusted_reference:
    "Reference figure derived from a macro or FX adjustment, not a supplier quotation.",
  baseline_reference:
    "Seeded baseline with no live source behind it. Not a market price.",
};

function buildOk(params: {
  price: number;
  basis: "city" | "national";
  sampleSize: number;
  confidence: "verified" | "mixed" | "reported";
  listings: IndexListing[];
  citySlug: string | null;
  note: string;
  fallbackReason: string | null;
}): ResolvedIndexPrice {
  const { listings } = params;
  const latest = mostRecent(listings);
  const tier = tierFor(params.basis, listings);
  const warnings: string[] = [];

  const tierWarning = TIER_WARNINGS[tier];
  if (tierWarning) warnings.push(tierWarning);

  const brands = distinctValues(listings, (l) => l.brand ?? null);
  const units = distinctValues(listings, (l) => l.sale_unit ?? null);
  if (brands.length === 0) {
    warnings.push("Brand not recorded on this evidence.");
  }
  if (units.length === 0) {
    warnings.push("Sale unit not recorded on this evidence.");
  }
  if (params.fallbackReason) warnings.push(params.fallbackReason);

  const indicative =
    params.confidence !== "verified" ||
    tier === "macro_adjusted_reference" ||
    tier === "baseline_reference";

  return {
    status: "ok",
    price: params.price,
    basis: params.basis,
    sample_size: params.sampleSize,
    confidence: params.confidence,
    last_observed_at: latest?.effective_date ?? null,
    price_kind: latest?.price_kind ?? null,
    sale_unit: units[0] ?? null,
    city_slug: params.basis === "city" ? params.citySlug : null,
    supplier_note: describeSource(latest),
    indicative,
    note: params.note,
    tier,
    market: latest?.market ?? null,
    currency: latest?.currency ?? null,
    brand: brands[0] ?? null,
    package_size: latest?.package_size ?? null,
    source_url: latest?.source_url ?? null,
    delivery_included: latest?.delivery_included ?? null,
    fallback_reason: params.fallbackReason,
    warnings,
  };
}

/**
 * Resolve the price a calculator should display.
 *
 * @param listings every listing available to the caller (any city)
 * @param citySlug the project city; null means the user has not chosen one
 * @param market the project market; when given, other markets are excluded
 * @param brand narrows the evidence to one brand instead of refusing
 * @param saleUnit narrows the evidence to one sale unit instead of refusing
 */
export function resolveMaterialPrice(params: {
  materialId: string;
  citySlug: string | null;
  listings: IndexListing[];
  priceKind?: PriceKind | null;
  market?: string | null;
  brand?: string | null;
  saleUnit?: string | null;
}): ResolvedIndexPrice {
  const { materialId, citySlug, listings, priceKind, market, brand, saleUnit } =
    params;

  const matching = listings.filter(
    (listing) =>
      listing.material_id === materialId &&
      (!priceKind || listing.price_kind === priceKind) &&
      listing.verification_status !== "flagged",
  );

  if (matching.length === 0) {
    return {
      status: "unavailable",
      reason: "No collected price for this material yet.",
      code: "no_evidence",
    };
  }

  const forMaterial = market
    ? matching.filter((listing) => listing.market === market)
    : matching;

  if (forMaterial.length === 0) {
    const others = distinctValues(matching, (l) => l.market ?? null);
    return {
      status: "unavailable",
      reason: `No price evidence for ${market}. Prices exist for ${others.join(
        ", ",
      )} and will not be borrowed across markets.`,
      code: "market_mismatch",
    };
  }

  const scoped = forMaterial
    .filter((listing) => (brand ? listing.brand === brand : true))
    .filter((listing) => (saleUnit ? listing.sale_unit === saleUnit : true));

  if (scoped.length === 0) {
    return {
      status: "unavailable",
      reason: brand
        ? `No price evidence for ${brand} in this market.`
        : `No price evidence for the sale unit "${saleUnit}" in this market.`,
      code: "no_evidence",
    };
  }

  // Brands, sale units and package sizes are not interchangeable. If the
  // evidence spans more than one, refuse rather than blend them.
  const brands = distinctValues(scoped, (l) => l.brand ?? null);
  if (!brand && brands.length > 1) {
    return {
      status: "unavailable",
      reason: `This material is priced under ${brands.length} different brands (${brands.join(
        ", ",
      )}). Choose a brand instead of blending them.`,
      code: "mixed_brand",
    };
  }

  const units = distinctValues(scoped, (l) => l.sale_unit ?? null);
  if (!saleUnit && units.length > 1) {
    return {
      status: "unavailable",
      reason: `This material is priced in ${units.length} different sale units (${units.join(
        ", ",
      )}). Choose a unit instead of blending them.`,
      code: "mixed_sale_unit",
    };
  }

  const cityListings = citySlug
    ? scoped.filter((listing) => listing.city_slug === citySlug)
    : [];
  const cityStats = computeStats(toSamples(cityListings));

  if (cityStats.status === "ok") {
    return buildOk({
      price: cityStats.median,
      basis: "city",
      sampleSize: cityStats.counted,
      confidence: cityStats.confidence,
      listings: cityListings,
      citySlug,
      note:
        cityStats.confidence === "verified"
          ? "Verified prices from this city."
          : "Reported prices for this city, not independently verified.",
      fallbackReason: null,
    });
  }

  const nationalStats = computeStats(toSamples(scoped));
  if (nationalStats.status === "ok") {
    const fallbackReason = citySlug
      ? "Not enough prices in this city yet, so this is the national median and is indicative."
      : null;
    return buildOk({
      price: nationalStats.median,
      basis: "national",
      sampleSize: nationalStats.counted,
      confidence: nationalStats.confidence,
      listings: scoped,
      citySlug: null,
      note: citySlug
        ? "Not enough prices in this city yet, so this is the national median and is indicative."
        : "National median. Choose a city for a local figure.",
      fallbackReason,
    });
  }

  return {
    status: "unavailable",
    reason:
      cityListings.length > 0
        ? `Only ${cityListings.length} price${
            cityListings.length === 1 ? "" : "s"
          } collected here, below the ${cityStats.required} needed to publish a figure, and the national sample is also short.`
        : `No sufficient sample: ${
            nationalStats.status === "insufficient"
              ? nationalStats.reason
              : "no evidence."
          }`,
    code: "insufficient_sample",
  };
}

/** Group listings by material, for building stats inputs across a page. */
export function groupByMaterial(
  listings: IndexListing[],
): Map<string, IndexListing[]> {
  const grouped = new Map<string, IndexListing[]>();
  for (const listing of listings) {
    const existing = grouped.get(listing.material_id);
    if (existing) existing.push(listing);
    else grouped.set(listing.material_id, [listing]);
  }
  return grouped;
}

/** Label shown next to a resolved price wherever it appears. */
export function provenanceLabel(resolved: ResolvedIndexPrice): string | null {
  if (resolved.status !== "ok") return null;
  const place = resolved.basis === "city" ? null : "national median";
  const kind = resolved.price_kind
    ? resolved.price_kind.replace(/_/g, " ")
    : "price kind not recorded";
  const parts = [
    place,
    kind,
    resolved.indicative ? "indicative" : "verified",
  ].filter(Boolean);
  return parts.join(" · ");
}
