/**
 * FRELUX INTERNATIONAL ARCHITECTURE, Calculator Config Service
 *
 * Resolves which calculators are available in each market.
 * Provides market-specific calculator settings and label overrides.
 *
 * TRUTHFUL AVAILABILITY (20-market mandate):
 * The canonical engine registry (`capability-registry.ts`) is the base
 * truth about which engines exist and which markets they are verified
 * for. Database rows in `market_calculator_config` can DISABLE a
 * capability or attach market config/labels, but can never manufacture
 * a capability the engine does not have: an `is_available = true` row
 * for an unverified market+engine yields `requires_verification`,
 * not `enabled`.
 *
 * Missing rows are never treated as evidence of anything — they resolve
 * to `not_configured` (with the registry deciding what that means).
 *
 * Existing calculators that don't use this service are unaffected.
 */

import { supabase } from "@/lib/supabase";
import type {
  MarketCalculatorConfig,
  MarketCalculatorType,
} from "@/types/international";
import {
  ENGINE_CAPABILITIES,
  resolveCapability,
  type AvailabilityResolution,
} from "./capability-registry";

export type { AvailabilityState } from "./capability-registry";

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
    .from("market_calculator_config")
    .select("*")
    .eq("market_code", marketCode);

  if (error || !data) return new Map();

  const configs = new Map<string, MarketCalculatorConfig>();
  for (const row of data as unknown as MarketCalculatorConfig[]) {
    configs.set(row.calculator_type, row);
  }

  configCache.set(marketCode, configs);
  return configs;
}

// ============================================================
// TRUTHFUL AVAILABILITY
// ============================================================

/**
 * Resolve the full availability state of an engine in a market.
 * Returns the state (enabled / disabled / not_configured /
 * not_implemented / requires_verification), a user-safe reason, and
 * the canonical engine record. Returns null for unknown engines.
 *
 * This is the authoritative resolution shared by UI, exports and
 * admin surfaces.
 */
export async function resolveCalculatorAvailability(
  marketCode: string,
  calculatorType: MarketCalculatorType,
): Promise<AvailabilityResolution | null> {
  const configs = await fetchCalculatorConfigs(marketCode);
  const row = configs.get(calculatorType) ?? null;
  return resolveCapability(calculatorType, marketCode, row);
}

/**
 * Check if a specific calculator is available in a market.
 * Backward-compatible boolean gate: true only when the truthful state
 * is "enabled" (verified + not admin-disabled). NG is no longer
 * special-cased at runtime; it is simply verified for the widest set
 * of engines in the registry, preserving existing Nigerian behaviour.
 */
export async function isCalculatorAvailable(
  marketCode: string,
  calculatorType: MarketCalculatorType,
): Promise<boolean> {
  const resolution = await resolveCalculatorAvailability(
    marketCode,
    calculatorType,
  );
  return resolution?.state === "enabled";
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
 * The canonical list of engines known to the registry, for tooling
 * that needs to enumerate everything that actually exists.
 */
export function listCanonicalEngines(): readonly MarketCalculatorType[] {
  return ENGINE_CAPABILITIES.map((e) => e.id as MarketCalculatorType);
}

/**
 * Get the list of calculators genuinely available (state "enabled")
 * in a market.
 */
export async function getAvailableCalculators(
  marketCode: string,
): Promise<MarketCalculatorType[]> {
  const configs = await fetchCalculatorConfigs(marketCode);
  const result: MarketCalculatorType[] = [];
  for (const engine of ENGINE_CAPABILITIES) {
    const row = configs.get(engine.id) ?? null;
    const resolution = resolveCapability(engine.id, marketCode, row);
    if (resolution?.state === "enabled") {
      result.push(engine.id as MarketCalculatorType);
    }
  }
  return result;
}

// ============================================================
// CLEAR CACHE
// ============================================================

/**
 * Clear the calculator config cache (e.g. after FRELUX change).
 */
export function clearCalculatorConfigCache(): void {
  configCache.clear();
}
