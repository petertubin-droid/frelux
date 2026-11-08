/**
 * Which price roles does each market actually hold a figure for?
 *
 * The engines ask for a role, not a product: "interior-paint", "white-cement",
 * "screeding-paint". A role with no mapping, or a mapping whose product has no
 * price in that market's book, is a place where a calculator either refuses to
 * price or reaches for something that is not the thing it named. Both are worth
 * seeing before a user finds them.
 *
 * This reads the bundled static book only, so it answers without a database
 * connection and reports the same answer every time. Live admin mappings can
 * add coverage, never remove it, so what is listed here is the floor.
 */

import {
  MATERIAL_ROLES,
  type MaterialRole,
} from "@/lib/estimation/market-materials";
import {
  BUNDLED_PRICE_BOOK,
  BUNDLED_PRICED_MARKETS,
  getBundledRoleMapping,
  type BundledPrice,
} from "@/lib/international/bundled-price-books";

export interface RoleCoverageEntry {
  role: MaterialRole;
  /** Product the role points at in this market, if it is mapped at all. */
  slug: string | null;
  name: string | null;
  /** True when the mapped product carries a price for this market. */
  priced: boolean;
  /** Book confidence flag ("low" and friends) when the price carries one. */
  confidence: string | null;
  /** Where the figure came from, as the book records it. */
  source: string | null;
  /**
   * Markets that do hold a price for this product. When a role is mapped but
   * unpriced, this says whether the product simply exists elsewhere (a price
   * to acquire for this market) or appears in no market at all (a bad mapping).
   */
  pricedIn: string[];
}

export interface MarketRoleCoverage {
  market: string;
  mapped: number;
  priced: number;
  missing: MaterialRole[];
  unpriced: MaterialRole[];
  lowConfidence: number;
  /** How many products the market holds any price for, at all. */
  bookSize: number;
  /** True when the market barely prices anything: its engines cannot run. */
  thinBook: boolean;
  entries: RoleCoverageEntry[];
}

function priceFor(slug: string, market: string): BundledPrice | null {
  const material = BUNDLED_PRICE_BOOK[slug];
  if (!material) return null;
  return material.markets[market] ?? null;
}

function marketsPricing(slug: string): string[] {
  const material = BUNDLED_PRICE_BOOK[slug];
  if (!material) return [];
  return Object.keys(material.markets).sort();
}

/** Fewer priced products than this and the market cannot estimate anything. */
const THIN_BOOK_THRESHOLD = 3;

export function roleCoverageForMarket(market: string): MarketRoleCoverage {
  const code = market.toUpperCase();
  const entries: RoleCoverageEntry[] = [];
  const missing: MaterialRole[] = [];
  const unpriced: MaterialRole[] = [];
  let lowConfidence = 0;

  for (const role of MATERIAL_ROLES) {
    // Curated mapping first, then one derived from this market's own prices.
    const mapping = getBundledRoleMapping(code, role);
    if (!mapping) {
      missing.push(role);
      entries.push({
        role,
        slug: null,
        name: null,
        priced: false,
        confidence: null,
        source: null,
        pricedIn: [],
      });
      continue;
    }
    const price = priceFor(mapping.slug, code);
    if (!price) unpriced.push(role);
    if (price?.f === "low") lowConfidence += 1;
    entries.push({
      role,
      slug: mapping.slug,
      name: mapping.name,
      priced: Boolean(price),
      confidence: price?.f ?? null,
      source: price?.s ?? null,
      pricedIn: price ? [code] : marketsPricing(mapping.slug),
    });
  }

  const priced = entries.filter((entry) => entry.priced).length;
  const bookSize = Object.values(BUNDLED_PRICE_BOOK).filter((material) =>
    Boolean(material.markets[code]),
  ).length;

  return {
    market: code,
    mapped: MATERIAL_ROLES.length - missing.length,
    priced,
    missing,
    unpriced,
    lowConfidence,
    bookSize,
    thinBook: bookSize < THIN_BOOK_THRESHOLD,
    entries,
  };
}

export function roleCoverageByMarket(
  markets: readonly string[] = BUNDLED_PRICED_MARKETS,
): MarketRoleCoverage[] {
  return [...markets].map(roleCoverageForMarket);
}

export interface RoleCoverageSummary {
  markets: number;
  roles: number;
  /** Roles the whole book never maps for any market: a real catalogue gap. */
  unmappedEverywhere: MaterialRole[];
  /** Mapping slots that point at a product with no price in that market. */
  unpricedSlots: number;
}

export function roleCoverageSummary(
  rows: MarketRoleCoverage[],
): RoleCoverageSummary {
  const mappedEverywhere = new Set<MaterialRole>();
  for (const row of roleCoverageByMarket(BUNDLED_PRICED_MARKETS)) {
    for (const entry of row.entries) {
      if (entry.slug) mappedEverywhere.add(entry.role);
    }
  }
  return {
    markets: rows.length,
    roles: MATERIAL_ROLES.length,
    unmappedEverywhere: MATERIAL_ROLES.filter(
      (role) => !mappedEverywhere.has(role),
    ),
    unpricedSlots: rows.reduce(
      (sum, row) => sum + row.entries.filter((e) => e.slug && !e.priced).length,
      0,
    ),
  };
}
