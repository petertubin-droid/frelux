/**
 * FRELUX MARKET INTELLIGENCE
 *
 * Feature 15 of 16: Market Intelligence Integration
 *
 * Market Intelligence is kept as a separate, decoupled component:
 * - Validates and stores approved market prices
 * - Provides price sources (manual entry, API, vendor, survey)
 * - Filters prices by market, brand, package size
 * - Reports freshness (how recent the price is)
 * - Reports source reliability
 * - The engine does NOT assume one specific price source
 *
 * Market Intelligence does NOT affect calculation logic.
 * Calculations are independent of market prices.
 *
 * Price structure:
 * - product name
 * - brand
 * - package size
 * - price
 * - currency
 * - market/country
 * - date
 * - source (manual, API, vendor, survey)
 * - confidence
 * - verification status
 */

import type { ConfidenceLevel } from './confidence-engine';
import { generateId } from './factory';

// =========================================================
// PRICE SOURCE
// =========================================================

/**
 * How a price was obtained.
 */
export type PriceSource = 'manual' | 'api' | 'vendor' | 'survey' | 'market_list';

export const PRICE_SOURCE_LABELS: Record<PriceSource, string> = {
  manual: 'Manual Entry',
  api: 'API Feed',
  vendor: 'Vendor Quote',
  survey: 'Market Survey',
  market_list: 'Published Market List',
};

/**
 * The reliability of a price source.
 */
export type SourceReliability = 'verified' | 'trusted' | 'unverified' | 'disputed';

export const SOURCE_RELIABILITY_LABELS: Record<SourceReliability, string> = {
  verified: 'Verified',
  trusted: 'Trusted',
  unverified: 'Unverified',
  disputed: 'Disputed',
};

// =========================================================
// MARKET PRICE
// =========================================================

/**
 * A single market price entry.
 * This represents a specific product at a specific price in a specific market.
 */
export interface MarketPrice {
  /** Unique price entry ID */
  priceId: string;
  /** Product name */
  productName: string;
  /** Brand (optional) */
  brand?: string;
  /** Package size */
  packageSize: number;
  /** Package unit */
  packageUnit: string;
  /** Price */
  price: number;
  /** Currency code (NGN, GHS, KES, ZAR, USD) */
  currency: string;
  /** Market/country code */
  marketCode: string;
  /** City (optional) */
  city?: string;
  /** Date the price was recorded (ISO 8601) */
  recordedDate: string;
  /** Source of the price */
  source: PriceSource;
  /** Source name (e.g. "Lafarge Distributor", "Jiji API") */
  sourceName?: string;
  /** Source reliability */
  reliability: SourceReliability;
  /** Verification status */
  isVerified: boolean;
  /** Confidence level for this price */
  confidence: ConfidenceLevel;
  /** Optional notes */
  notes?: string;
  /** Whether this price is currently approved for use */
  isApproved: boolean;
}

// =========================================================
// MARKET PRICE CATALOG
// =========================================================

/**
 * A catalog of market prices.
 * Prices can be filtered by market, brand, package size, etc.
 */
export interface MarketPriceCatalog {
  /** All price entries */
  prices: MarketPrice[];
  /** Default market code */
  defaultMarketCode: string;
  /** Default currency */
  defaultCurrency: string;
}

/**
 * Create a market price catalog.
 */
export function createMarketPriceCatalog(
  defaultMarketCode: string = 'NG',
  defaultCurrency: string = 'NGN',
): MarketPriceCatalog {
  return {
    prices: [],
    defaultMarketCode,
    defaultCurrency,
  };
}

/**
 * Create a market price entry.
 */
export function createMarketPrice(
  partial: Partial<MarketPrice> = {},
): MarketPrice {
  return {
    priceId: partial.priceId ?? generateId('price'),
    productName: partial.productName ?? 'Unknown Product',
    brand: partial.brand,
    packageSize: partial.packageSize ?? 1,
    packageUnit: partial.packageUnit ?? 'unit',
    price: partial.price ?? 0,
    currency: partial.currency ?? 'NGN',
    marketCode: partial.marketCode ?? 'NG',
    city: partial.city,
    recordedDate: partial.recordedDate ?? new Date().toISOString(),
    source: partial.source ?? 'manual',
    sourceName: partial.sourceName,
    reliability: partial.reliability ?? 'unverified',
    isVerified: partial.isVerified ?? false,
    confidence: partial.confidence ?? 'medium',
    notes: partial.notes,
    isApproved: partial.isApproved ?? false,
  };
}

// =========================================================
// PRICE OPERATIONS
// =========================================================

/**
 * Add a price to the catalog.
 */
export function addPrice(
  catalog: MarketPriceCatalog,
  price: MarketPrice,
): MarketPriceCatalog {
  return { ...catalog, prices: [...catalog.prices, price] };
}

/**
 * Add multiple prices.
 */
export function addPrices(
  catalog: MarketPriceCatalog,
  prices: MarketPrice[],
): MarketPriceCatalog {
  return { ...catalog, prices: [...catalog.prices, ...prices] };
}

// =========================================================
// PRICE LOOKUP
// =========================================================

/**
 * Query parameters for finding prices.
 */
export interface PriceQuery {
  productName?: string;
  brand?: string;
  marketCode?: string;
  city?: string;
  packageSize?: number;
  packageUnit?: string;
  currency?: string;
  source?: PriceSource;
  isVerified?: boolean;
  isApproved?: boolean;
}

/**
 * Find prices matching the query.
 * Returns prices sorted by recorded date (most recent first).
 */
export function findPrices(
  catalog: MarketPriceCatalog,
  query: PriceQuery,
): MarketPrice[] {
  return catalog.prices
    .filter((p) => {
      if (query.productName && p.productName !== query.productName) return false;
      if (query.brand && p.brand !== query.brand) return false;
      if (query.marketCode && p.marketCode !== query.marketCode) return false;
      if (query.city && p.city !== query.city) return false;
      if (query.packageSize && p.packageSize !== query.packageSize) return false;
      if (query.packageUnit && p.packageUnit !== query.packageUnit) return false;
      if (query.currency && p.currency !== query.currency) return false;
      if (query.source && p.source !== query.source) return false;
      if (query.isVerified !== undefined && p.isVerified !== query.isVerified) return false;
      if (query.isApproved !== undefined && p.isApproved !== query.isApproved) return false;
      return true;
    })
    .sort((a, b) => new Date(b.recordedDate).getTime() - new Date(a.recordedDate).getTime());
}

/**
 * Find the most recent approved price for a product.
 */
export function findLatestApprovedPrice(
  catalog: MarketPriceCatalog,
  productName: string,
  marketCode?: string,
): MarketPrice | undefined {
  return findPrices(catalog, {
    productName,
    marketCode: marketCode ?? catalog.defaultMarketCode,
    isApproved: true,
  })[0];
}

// =========================================================
// PRICE FRESHNESS
// =========================================================

/**
 * Get the age of a price in days.
 */
export function getPriceAgeDays(price: MarketPrice): number {
  const now = Date.now();
  const recorded = new Date(price.recordedDate).getTime();
  return Math.floor((now - recorded) / (1000 * 60 * 60 * 24));
}

/**
 * Check if a price is fresh (within threshold days).
 */
export function isPriceFresh(price: MarketPrice, thresholdDays: number = 30): boolean {
  return getPriceAgeDays(price) <= thresholdDays;
}

/**
 * Get a freshness label for a price.
 */
export function getPriceFreshnessLabel(price: MarketPrice): string {
  const age = getPriceAgeDays(price);
  if (age <= 7) return 'This week';
  if (age <= 30) return 'This month';
  if (age <= 90) return `${age} days ago`;
  if (age <= 365) return `${Math.floor(age / 30)} months ago`;
  return `${Math.floor(age / 365)} year(s) ago`;
}

// =========================================================
// PRICE ESTIMATE
// =========================================================

/**
 * A price estimate for a material.
 * Combines the price with the quantity to give a total cost.
 */
export interface PriceEstimate {
  /** Material name */
  productName: string;
  /** Brand */
  brand?: string;
  /** Unit price */
  unitPrice: number;
  /** Currency */
  currency: string;
  /** Quantity */
  quantity: number;
  /** Quantity unit */
  quantityUnit: string;
  /** Total cost */
  totalCost: number;
  /** Price source */
  source: PriceSource;
  /** Price freshness */
  freshnessLabel: string;
  /** Price confidence */
  confidence: ConfidenceLevel;
  /** Whether the price is verified */
  isVerified: boolean;
}

/**
 * Build a price estimate from a market price and quantity.
 */
export function buildPriceEstimate(
  price: MarketPrice,
  quantity: number,
): PriceEstimate {
  return {
    productName: price.productName,
    brand: price.brand,
    unitPrice: price.price,
    currency: price.currency,
    quantity,
    quantityUnit: price.packageUnit,
    totalCost: price.price * quantity,
    source: price.source,
    freshnessLabel: getPriceFreshnessLabel(price),
    confidence: price.confidence,
    isVerified: price.isVerified,
  };
}

/**
 * Build price estimates for multiple materials.
 */
export function buildPriceEstimates(
  catalog: MarketPriceCatalog,
  items: { productName: string; quantity: number; marketCode?: string }[],
): PriceEstimate[] {
  const estimates: PriceEstimate[] = [];

  for (const item of items) {
    const price = findLatestApprovedPrice(catalog, item.productName, item.marketCode);
    if (price) {
      estimates.push(buildPriceEstimate(price, item.quantity));
    }
  }

  return estimates;
}

// =========================================================
// PRICE APPROVAL
// =========================================================

/**
 * Approve a price for use.
 */
export function approvePrice(
  catalog: MarketPriceCatalog,
  priceId: string,
): MarketPriceCatalog {
  return {
    ...catalog,
    prices: catalog.prices.map((p) =>
      p.priceId === priceId
        ? { ...p, isApproved: true, isVerified: true, reliability: 'verified' as SourceReliability }
        : p
    ),
  };
}

/**
 * Reject a price.
 */
export function rejectPrice(
  catalog: MarketPriceCatalog,
  priceId: string,
): MarketPriceCatalog {
  return {
    ...catalog,
    prices: catalog.prices.map((p) =>
      p.priceId === priceId
        ? { ...p, isApproved: false, reliability: 'disputed' as SourceReliability }
        : p
    ),
  };
}

// =========================================================
// PRICE SUMMARY
// =========================================================

/**
 * Format a price estimate as readable text.
 */
export function priceEstimateToText(estimate: PriceEstimate): string {
  const lines: string[] = [];
  lines.push(`${estimate.productName}${estimate.brand ? ` [${estimate.brand}]` : ''}`);
  lines.push(`  Unit price: ${estimate.currency} ${estimate.unitPrice} / ${estimate.quantityUnit}`);
  lines.push(`  Quantity: ${estimate.quantity} ${estimate.quantityUnit}`);
  lines.push(`  Total: ${estimate.currency} ${(estimate.totalCost).toLocaleString()}`);
  lines.push(`  Source: ${PRICE_SOURCE_LABELS[estimate.source]} (${estimate.freshnessLabel})`);
  lines.push(`  Verified: ${estimate.isVerified ? 'Yes' : 'No'}`);
  lines.push(`  Confidence: ${estimate.confidence.toUpperCase()}`);
  return lines.join('\n');
}
