/**
 * FRELUX INTERNATIONAL ARCHITECTURE — Pricing Resolver
 *
 * Resolves market-specific pricing for materials and products.
 *
 * Prices are NEVER hardcoded in calculator formulas.
 * Each price is associated with a market, currency, and effective date.
 *
 * This module fetches the current active price for a given market + product/material.
 */

import { supabase } from '@/lib/supabase';
import type { MarketPricing } from '@/types/international';

// ============================================================
// CACHE
// ============================================================

const priceCache = new Map<string, MarketPricing | null>();

// ============================================================
// FETCH CURRENT PRICE
// ============================================================

/**
 * Get the current active price for a product in a specific market.
 * Returns null if no price is configured.
 */
export async function fetchCurrentPrice(
  marketCode: string,
  productId: string,
): Promise<MarketPricing | null> {
  const cacheKey = `${marketCode}:${productId}`;
  if (priceCache.has(cacheKey)) return priceCache.get(cacheKey) ?? null;

  const { data, error } = await supabase
    .from('market_pricing')
    .select('*')
    .eq('market_code', marketCode)
    .eq('product_id', productId)
    .is('effective_to', null)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    priceCache.set(cacheKey, null);
    return null;
  }

  const price = data as unknown as MarketPricing;
  priceCache.set(cacheKey, price);
  return price;
}

// ============================================================
// FETCH ALL PRICES FOR A MARKET + CATEGORY
// ============================================================

/**
 * Get all current active prices for a market, optionally filtered by type.
 */
export async function fetchMarketPrices(
  marketCode: string,
  priceType?: 'product' | 'material' | 'labour' | 'quality_level',
): Promise<MarketPricing[]> {
  let query = supabase
    .from('market_pricing')
    .select('*')
    .eq('market_code', marketCode)
    .is('effective_to', null)
    .order('price_type', { ascending: true });

  if (priceType) query = query.eq('price_type', priceType);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as MarketPricing[];
}

// ============================================================
// FETCH PRODUCTS FOR A MARKET + CALCULATOR
// ============================================================

import type { MarketProduct, MarketCalculatorType } from '@/types/international';

/**
 * Get all active products for a market that are compatible with a calculator.
 */
export async function fetchMarketProducts(
  marketCode: string,
  calculatorType?: MarketCalculatorType,
): Promise<MarketProduct[]> {
  let query = supabase
    .from('market_products')
    .select('*')
    .eq('market_code', marketCode)
    .eq('is_active', true);

  const { data, error } = await query;
  if (error || !data) return [];

  const products = data as unknown as MarketProduct[];
  if (!calculatorType) return products;

  // Filter by calculator compatibility
  return products.filter((p) =>
    p.calculator_compatibility?.includes(calculatorType)
  );
}

// ============================================================
// RESOLVE PRICE FOR A PRODUCT
// ============================================================

/**
 * Resolve the current price + currency for a product in a market.
 * Returns { price, currency, priceUnit, packageName } or null.
 */
export async function resolveProductPrice(
  marketCode: string,
  productId: string,
): Promise<{
  price: number;
  currency: string;
  priceUnit: string | null;
  packageSize: number | null;
  packageUnit: string | null;
} | null> {
  const pricing = await fetchCurrentPrice(marketCode, productId);
  if (!pricing) return null;

  return {
    price: pricing.price,
    currency: pricing.currency_code,
    priceUnit: pricing.price_unit,
    packageSize: pricing.package_size,
    packageUnit: pricing.package_unit,
  };
}

// ============================================================
// CLEAR CACHE
// ============================================================

export function clearPriceCache(): void {
  priceCache.clear();
}
