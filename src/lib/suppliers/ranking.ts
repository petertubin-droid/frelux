/**
 * Search ranking.
 *
 * Two separate outputs, on purpose:
 *   - `promoted` holds results whose supplier paid for placement. They are
 *     labelled and shown apart from the list.
 *   - `organic` is every other result, ordered by a score computed only from
 *     evidence: verification level, buyer ratings, responsiveness and how fresh
 *     the prices are.
 *
 * No payment value is passed into `organicScore`, so a featured supplier cannot
 * rise in organic order. A verification level is a record of checks run, so it
 * is allowed to contribute; a subscription is not.
 */

import type {
  SupplierListing,
  SupplierProfile,
  SupplierSearchResult,
} from "./types";
import { levelRank } from "./verification";

export interface OrganicScoreInput {
  verificationLevel: string | null | undefined;
  rating: number | null | undefined;
  totalQuotesServed?: number | null;
  responseRate?: number | null;
  avgResponseHours?: number | null;
  /** Age in days of the supplier's freshest price. */
  freshestPriceDays?: number | null;
  listingCount?: number;
  inStockCount?: number;
}

export interface OrganicScoreBreakdown {
  verification: number;
  rating: number;
  responsiveness: number;
  freshness: number;
  catalogue: number;
  total: number;
}

const WEIGHTS = {
  verification: 45,
  rating: 20,
  responsiveness: 15,
  freshness: 15,
  catalogue: 5,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function organicScoreBreakdown(
  input: OrganicScoreInput,
): OrganicScoreBreakdown {
  // Verification: 0 to 45, linear across the five levels.
  const verification =
    (clamp(levelRank(input.verificationLevel), 0, 4) / 4) *
    WEIGHTS.verification;

  // Rating: 0 to 20 from a 0-5 buyer rating, only after at least one review.
  const rating =
    input.rating && input.rating > 0
      ? (clamp(input.rating, 0, 5) / 5) * WEIGHTS.rating
      : 0;

  // Responsiveness: reply rate and median reply time, when there is evidence.
  const rate =
    input.responseRate === null || input.responseRate === undefined
      ? null
      : clamp(input.responseRate, 0, 1);
  const hours = input.avgResponseHours ?? null;
  const speed = hours === null ? null : clamp(1 - hours / 72, 0, 1);
  const responsiveness =
    rate === null && speed === null
      ? 0
      : ((rate ?? speed ?? 0) * 0.6 + (speed ?? rate ?? 0) * 0.4) *
        WEIGHTS.responsiveness;

  // Freshness: a price updated today scores full, one 90+ days old scores zero.
  const days = input.freshestPriceDays;
  const freshness =
    days === null || days === undefined
      ? 0
      : clamp(1 - days / 90, 0, 1) * WEIGHTS.freshness;

  // Catalogue depth: having priced stock at all is worth a little.
  const catalogue =
    (clamp((input.inStockCount ?? 0) / 10, 0, 1) * 0.7 +
      clamp((input.listingCount ?? 0) / 20, 0, 1) * 0.3) *
    WEIGHTS.catalogue;

  const total = verification + rating + responsiveness + freshness + catalogue;
  const rounded = (n: number) => Math.round(n * 100) / 100;

  return {
    verification: rounded(verification),
    rating: rounded(rating),
    responsiveness: rounded(responsiveness),
    freshness: rounded(freshness),
    catalogue: rounded(catalogue),
    total: rounded(total),
  };
}

export function organicScore(input: OrganicScoreInput): number {
  return organicScoreBreakdown(input).total;
}

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

/** True only while a paid placement has not lapsed. */
export function isPromotedNow(
  profile: Pick<SupplierProfile, "is_featured" | "featured_until">,
  now = new Date(),
): boolean {
  if (!profile.is_featured) return false;
  if (!profile.featured_until) return true;
  return new Date(profile.featured_until) > now;
}

function freshestListingDays(listings: SupplierListing[]): number | null {
  const stamps = listings
    .map((l) => daysSince(l.price_updated_at ?? l.last_updated_at))
    .filter((d): d is number => d !== null);
  return stamps.length === 0 ? null : Math.min(...stamps);
}

export function buildSearchResult(
  profile: SupplierProfile,
  listings: SupplierListing[],
  matchedListings: SupplierListing[],
  zones: SupplierSearchResult["zones"],
): SupplierSearchResult {
  const inStock = listings.filter((l) => l.in_stock).length;
  const prices = matchedListings
    .map((l) => Number(l.unit_price))
    .filter((n) => Number.isFinite(n) && n > 0);
  const score = organicScore({
    verificationLevel: profile.verification_level,
    rating: profile.rating,
    totalQuotesServed: profile.total_quotes_served,
    responseRate: profile.response_rate,
    avgResponseHours: profile.avg_response_hours,
    freshestPriceDays: freshestListingDays(listings),
    listingCount: listings.length,
    inStockCount: inStock,
  });

  return {
    supplier: profile,
    listings,
    matchedListings,
    zones,
    promoted: isPromotedNow(profile),
    organicScore: score,
    lowestPrice: prices.length > 0 ? Math.min(...prices) : null,
    currency: matchedListings[0]?.currency ?? listings[0]?.currency ?? null,
  };
}

export interface SplitResults {
  /** Paid placements, labelled in the UI. Not ranked by the organic score. */
  promoted: SupplierSearchResult[];
  /** Everything else, best first. */
  organic: SupplierSearchResult[];
}

export function splitAndSort(results: SupplierSearchResult[]): SplitResults {
  const promoted: SupplierSearchResult[] = [];
  const organic: SupplierSearchResult[] = [];
  for (const result of results) {
    if (result.promoted) promoted.push(result);
    else organic.push(result);
  }
  const byScore = (a: SupplierSearchResult, b: SupplierSearchResult) =>
    b.organicScore - a.organicScore ||
    (b.supplier.rating ?? 0) - (a.supplier.rating ?? 0) ||
    a.supplier.company_name.localeCompare(b.supplier.company_name);
  organic.sort(byScore);
  promoted.sort((a, b) =>
    a.supplier.company_name.localeCompare(b.supplier.company_name),
  );
  return { promoted, organic };
}
