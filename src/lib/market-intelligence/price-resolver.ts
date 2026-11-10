/**
 * FRELUX MARKET INTELLIGENCE, Calculator Price Resolver
 *
 * THE clean interface that FRELUX calculators use to get prices.
 *
 * Calculators do NOT:
 *   - scrape websites
 *   - know which provider collected the price
 *   - call any external API
 *
 * Calculators only call resolveCalculatorPrice() and get a validated price.
 *
 * What it does, in order:
 *   1. The approved price matching the requested package, at the freshest age.
 *   2. Any approved price for the same product and market, labelled as an
 *      estimate because the package differs.
 *   3. No price available. It is never borrowed from another market: a quote
 *      has to rest on this market's own retailer data.
 *
 * Age is derived from last_updated on every read, never taken from the stored
 * freshness column, and a stored label can only make a price look older or
 * worse, never fresher.
 *
 * The resolver NEVER invents a price.
 */

import { supabase } from '@/lib/supabase';
import type {
  ResolvedCalculatorPrice,
  MiApprovedPrice,
  Freshness,
} from '@/types/market-intelligence';
import { NO_PRICE_AVAILABLE } from '@/types/market-intelligence';
import { calculateFreshness } from './price-validator';

/**
 * Age of an approved price, computed from when it was last updated.
 *
 * mi_approved_prices.freshness is written as 'fresh' when a price is approved
 * and no job ever recomputes it, so a price approved last year still carries
 * the label and was served to calculators as "Current market price" with no
 * staleness warning. The stored label is now used as a floor: take whichever
 * of the two is worse, so a stale row cannot be talked up to fresh.
 */
export function derivedFreshness(price: MiApprovedPrice): Freshness {
  const stored = price.freshness;
  const anchor = price.last_updated ?? price.approved_at ?? null;
  const computed: Freshness = anchor ? calculateFreshness(anchor) : stored;
  const order: Record<Freshness, number> = { fresh: 0, recent: 1, stale: 2, expired: 3 };
  const rank = (f: Freshness) => order[f] ?? 3;
  return rank(computed) >= rank(stored) ? computed : stored;
}

/** A copy of the row with the freshness this read should report. */
function withDerivedFreshness(price: MiApprovedPrice): MiApprovedPrice {
  const freshness = derivedFreshness(price);
  return freshness === price.freshness ? price : { ...price, freshness };
}

// ============================================================
// RESOLVE PRICE
// ============================================================

/**
 * Resolve the current validated price for a product in a market.
 * This is the ONLY function calculators should call.
 *
 * @param marketCode  e.g. "NG", "GH", "KE"
 * @param productId   canonical_product_id from market_products
 * @param packageSize optional, match exact package size
 * @param packageUnit optional, match exact package unit
 */
export async function resolveCalculatorPrice(
  marketCode: string,
  productId: string,
  options?: {
    packageSize?: number;
    packageUnit?: string;
    region?: string;
  },
): Promise<ResolvedCalculatorPrice> {
  try {
    // Build query for approved prices
    let query = supabase
      .from('mi_approved_prices')
      .select('*')
      .eq('market_code', marketCode)
      .eq('canonical_product_id', productId)
      .eq('is_active', true)
      .order('last_updated', { ascending: false });

    if (options?.packageSize) query = query.eq('package_size', options.packageSize);
    if (options?.packageUnit) query = query.eq('package_unit', options.packageUnit);

    const { data, error } = await query.limit(10);

    if (error || !data || data.length === 0) {
      // No approved price, try fallback: any approved price for this product
      return tryFallback(marketCode, productId, options);
    }

    const prices = (data as unknown as MiApprovedPrice[]).map(withDerivedFreshness);

    // Filter by region if specified
    let filtered = prices;
    if (options?.region) {
      const regional = prices.filter((p) => p.region === options.region);
      if (regional.length > 0) filtered = regional;
    }

    // Sort by freshness: fresh > recent > stale > expired
    const freshnessOrder: Record<Freshness, number> = { fresh: 0, recent: 1, stale: 2, expired: 3 };
    filtered.sort((a, b) => freshnessOrder[a.freshness] - freshnessOrder[b.freshness]);

    // Use the freshest price
    const best = filtered[0];
    if (!best) return NO_PRICE_AVAILABLE;

    return formatResolvedPrice(best);
  } catch {
    return NO_PRICE_AVAILABLE;
  }
}

// ============================================================
// RESOLVE BY PRODUCT NAME (fallback when no product ID)
// ============================================================

/**
 * Resolve price by product name + market, when canonical product ID is unknown.
 * Searches approved prices by product_name.
 */
export async function resolveCalculatorPriceByName(
  marketCode: string,
  productName: string,
  options?: {
    packageSize?: number;
    packageUnit?: string;
    region?: string;
  },
): Promise<ResolvedCalculatorPrice> {
  try {
    let query = supabase
      .from('mi_approved_prices')
      .select('*')
      .eq('market_code', marketCode)
      .eq('is_active', true)
      .ilike('product_name', `%${productName}%`)
      .order('last_updated', { ascending: false });

    if (options?.packageSize) query = query.eq('package_size', options.packageSize);
    if (options?.packageUnit) query = query.eq('package_unit', options.packageUnit);

    const { data, error } = await query.limit(5);

    if (error || !data || data.length === 0) return NO_PRICE_AVAILABLE;

    const prices = (data as unknown as MiApprovedPrice[]).map(withDerivedFreshness);
    const freshnessOrder: Record<Freshness, number> = { fresh: 0, recent: 1, stale: 2, expired: 3 };
    prices.sort((a, b) => freshnessOrder[a.freshness] - freshnessOrder[b.freshness]);

    return formatResolvedPrice(prices[0]);
  } catch {
    return NO_PRICE_AVAILABLE;
  }
}

// ============================================================
// FALLBACK CHAIN
// ============================================================

async function tryFallback(
  marketCode: string,
  productId: string,
  _options?: { packageSize?: number; packageUnit?: string; region?: string },
): Promise<ResolvedCalculatorPrice> {
  // Try any approved price for this product (ignore package size/unit)
  const { data } = await supabase
    .from('mi_approved_prices')
    .select('*')
    .eq('market_code', marketCode)
    .eq('canonical_product_id', productId)
    .eq('is_active', true)
    .order('last_updated', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const price = withDerivedFreshness(data[0] as unknown as MiApprovedPrice);
    const resolved = formatResolvedPrice(price);
    return {
      ...resolved,
      isEstimated: true,
      message: `Estimated price (package mismatch), ${resolved.message}`,
    };
  }

  return NO_PRICE_AVAILABLE;
}

// ============================================================
// FORMAT
// ============================================================

function formatResolvedPrice(price: MiApprovedPrice): ResolvedCalculatorPrice {
  const isStale = price.freshness === 'stale' || price.freshness === 'expired';
  const isRecent = price.freshness === 'recent';

  return {
    found: true,
    price: price.price,
    currency: price.currency_code,
    freshness: price.freshness,
    confidence: price.confidence as 'high' | 'medium' | 'low' | 'review_required',
    sourceCount: price.source_count,
    lastUpdated: price.last_updated,
    isStale,
    isEstimated: isRecent || isStale,
    message: isStale
      ? `Last known price (stale as of ${new Date(price.last_updated).toLocaleDateString()})`
      : isRecent
      ? 'Recent market price'
      : 'Current market price',
  };
}

// ============================================================
// BULK RESOLVE
// ============================================================

/**
 * Resolve prices for multiple products at once.
 * Returns a map of productId → ResolvedCalculatorPrice.
 */
export async function resolveCalculatorPricesBulk(
  marketCode: string,
  productIds: string[],
): Promise<Map<string, ResolvedCalculatorPrice>> {
  const results = new Map<string, ResolvedCalculatorPrice>();

  if (productIds.length === 0) return results;

  const { data, error } = await supabase
    .from('mi_approved_prices')
    .select('*')
    .eq('market_code', marketCode)
    .eq('is_active', true)
    .in('canonical_product_id', productIds)
    .order('last_updated', { ascending: false });

  if (error || !data) {
    for (const id of productIds) results.set(id, NO_PRICE_AVAILABLE);
    return results;
  }

  // Group by product and pick freshest
  const byProduct = new Map<string, MiApprovedPrice>();
  const freshnessOrder: Record<Freshness, number> = { fresh: 0, recent: 1, stale: 2, expired: 3 };

  for (const row of data as unknown as MiApprovedPrice[]) {
    const fresh = withDerivedFreshness(row);
    const existing = byProduct.get(fresh.canonical_product_id ?? '');
    if (!existing || freshnessOrder[fresh.freshness] < freshnessOrder[existing.freshness]) {
      byProduct.set(fresh.canonical_product_id ?? '', fresh);
    }
  }

  for (const id of productIds) {
    const price = byProduct.get(id);
    results.set(id, price ? formatResolvedPrice(price) : NO_PRICE_AVAILABLE);
  }

  return results;
}

// ============================================================
// CLEAR CACHE
// ============================================================

/**
 * Kept for existing callers. The resolver holds no cache: an approved price can
 * be re-approved, withdrawn or aged out between two calls, so every read goes
 * to the table and derives its own freshness.
 */
export function clearApprovedPriceCache(): void {
  // Nothing cached to clear.
}
