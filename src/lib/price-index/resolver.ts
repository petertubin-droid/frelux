/**
 * Price Index, calculator bridge.
 *
 * One question, answered honestly: what price should this calculator use for
 * this material in this city, and how much does that number deserve to be
 * trusted?
 *
 * Order of preference:
 *   1. Qualifying price evidence for the selected city
 *   2. Qualifying national evidence, clearly labelled as national
 *   3. No price, with the reason
 *
 * A single submission never becomes a market price here; the sample gate in
 * stats.ts decides, and the returned object always carries the provenance the
 * calculator must display.
 */

import { computeStats, type Sample } from "./stats";
import type { IndexListing, PriceKind } from "./types";

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
    }
  | { status: "unavailable"; reason: string };

export function toSamples(listings: IndexListing[]): Sample[] {
  return listings
    .filter((listing) => Number.isFinite(listing.price) && listing.price > 0)
    .map((listing) => ({
      value: listing.price,
      observed_at: (listing.verified_at ?? listing.effective_date ?? "").slice(0, 10) ||
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
 * Resolve the price a calculator should display.
 *
 * @param listings every listing available to the caller (any city)
 * @param citySlug the project city; null means the user has not chosen one
 */
export function resolveMaterialPrice(params: {
  materialId: string;
  citySlug: string | null;
  listings: IndexListing[];
  priceKind?: PriceKind | null;
}): ResolvedIndexPrice {
  const { materialId, citySlug, listings, priceKind } = params;

  const forMaterial = listings.filter(
    (listing) =>
      listing.material_id === materialId &&
      (!priceKind || listing.price_kind === priceKind) &&
      listing.verification_status !== "flagged",
  );

  if (forMaterial.length === 0) {
    return {
      status: "unavailable",
      reason: "No collected price for this material yet.",
    };
  }

  const cityListings = citySlug
    ? forMaterial.filter((listing) => listing.city_slug === citySlug)
    : [];
  const cityStats = computeStats(toSamples(cityListings));

  if (cityStats.status === "ok") {
    const latest = mostRecent(cityListings);
    return {
      status: "ok",
      price: cityStats.median,
      basis: "city",
      sample_size: cityStats.counted,
      confidence: cityStats.confidence,
      last_observed_at: latest?.effective_date ?? null,
      price_kind: latest?.price_kind ?? null,
      sale_unit: latest?.sale_unit ?? null,
      city_slug: citySlug,
      supplier_note: describeSource(latest),
      indicative: cityStats.confidence !== "verified",
      note:
        cityStats.confidence === "verified"
          ? "Verified prices from this city."
          : "Reported prices for this city, not independently verified.",
    };
  }

  const nationalStats = computeStats(toSamples(forMaterial));
  if (nationalStats.status === "ok") {
    const latest = mostRecent(forMaterial);
    return {
      status: "ok",
      price: nationalStats.median,
      basis: "national",
      sample_size: nationalStats.counted,
      confidence: nationalStats.confidence,
      last_observed_at: latest?.effective_date ?? null,
      price_kind: latest?.price_kind ?? null,
      sale_unit: latest?.sale_unit ?? null,
      city_slug: null,
      supplier_note: describeSource(latest),
      indicative: true,
      note: citySlug
        ? "Not enough prices in this city yet, so this is the national median and is indicative."
        : "National median. Choose a city for a local figure.",
    };
  }

  return {
    status: "unavailable",
    reason:
      cityListings.length > 0
        ? `Only ${cityListings.length} price${cityListings.length === 1 ? "" : "s"} collected here, below the ${cityStats.required} needed to publish a figure, and the national sample is also short.`
        : `No sufficient sample: ${nationalStats.status === "insufficient" ? nationalStats.reason : "no evidence."}`,
  };
}

/** Group listings by material, for building stats inputs across a page. */
export function groupByMaterial(listings: IndexListing[]): Map<string, IndexListing[]> {
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
  const parts = [place, kind, resolved.indicative ? "indicative" : "verified"].filter(
    Boolean,
  );
  return parts.join(" · ");
}
