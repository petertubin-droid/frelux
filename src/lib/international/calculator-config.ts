/**
 * FRELUX INTERNATIONAL ARCHITECTURE — Calculator Config Service
 *
 * Resolves which calculators are available in each market.
 * Provides market-specific calculator settings and label overrides.
 *
 * Existing calculators that don't use this service are unaffected.
 */

import { supabase } from '@/lib/supabase';
import type {
  MarketCalculatorConfig,
  MarketCalculatorType,
  ResolvedMarketContext,
} from '@/types/international';

// ============================================================
// CACHE
// ============================================================

const configCache = new Map<string, Map<string, MarketCalculatorConfig>>();

// ============================================================
// FETCH CALCULATOR CONFIG
// ============================================================

/**
 * Fetch all calculator configs for a market.
 * Results are cached for the session.
 */
export async function fetchCalculatorConfigs(
  marketCode: string,
): Promise<Map<string, MarketCalculatorConfig>> {
  const cached = configCache.get(marketCode);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('market_calculator_config')
    .select('*')
    .eq('market_code', marketCode);

  if (error || !data) return new Map();

  const configs = new Map<string, MarketCalculatorConfig>();
  for (const row of data as unknown as MarketCalculatorConfig[]) {
    configs.set(row.calculator_type, row);
  }

  configCache.set(marketCode, configs);
  return configs;
}

// ============================================================
// CHECK IF CALCULATOR IS AVAILABLE
// ============================================================

/**
 * Check if a specific calculator is available in a market.
 * For Nigeria, all calculators are available (backward compatible).
 * For unsupported/coming_soon markets, no calculators are available
 * unless explicitly configured.
 */
export async function isCalculatorAvailable(
  marketCode: string,
  calculatorType: MarketCalculatorType,
): Promise<boolean> {
  // Nigeria: all calculators are available (preserves existing behavior)
  if (marketCode === 'NG') return true;

  const configs = await fetchCalculatorConfigs(marketCode);
  const config = configs.get(calculatorType);
  return config?.is_available ?? false;
}

// ============================================================
// GET CALCULATOR CONFIG
// ============================================================

/**
 * Get the market-specific config for a calculator.
 * Returns the config JSON and label overrides, or null.
 */
export async function getCalculatorConfig(
  marketCode: string,
  calculatorType: MarketCalculatorType,
): Promise<MarketCalculatorConfig | null> {
  const configs = await fetchCalculatorConfigs(marketCode);
  return configs.get(calculatorType) ?? null;
}

/**
 * Get the label override for a calculator in a market.
 * Falls back to the provided default label.
 */
export async function getCalculatorLabel(
  marketCode: string,
  calculatorType: MarketCalculatorType,
  labelKey: string,
  defaultLabel: string,
): Promise<string> {
  const config = await getCalculatorConfig(marketCode, calculatorType);
  return config?.labels?.[labelKey] ?? defaultLabel;
}

// ============================================================
// GET AVAILABLE CALCULATORS
// ============================================================

/**
 * Get the list of calculators available in a market.
 */
export async function getAvailableCalculators(
  marketCode: string,
): Promise<MarketCalculatorType[]> {
  // Nigeria: all calculators (backward compatible)
  if (marketCode === 'NG') {
    return ['painting', 'screeding', 'pop_ceiling', 'tile', 'tyrolene', 'grafitex', 'cost_estimator'];
  }

  const configs = await fetchCalculatorConfigs(marketCode);
  const result: MarketCalculatorType[] = [];
  for (const [type, config] of configs.entries()) {
    if (config.is_available) {
      result.push(type as MarketCalculatorType);
    }
  }
  return result;
}

// ============================================================
// CLEAR CACHE
// ============================================================

export function clearCalculatorConfigCache(): void {
  configCache.clear();
}
