/**
 * FRELUX INTERNATIONAL ARCHITECTURE — Material Rule Resolver
 *
 * Resolves market-specific material rules for a given calculator.
 *
 * Flow:
 *   Geometry → area/volume (global, unit-agnostic)
 *   → Material Rule (market-specific) → material quantity
 *   → Product packaging (market-specific) → buckets/bags/cartons
 *   → Pricing (market-specific) → estimated cost
 *
 * This module is the bridge between universal geometry and market-specific rules.
 * It does NOT contain calculation logic — it resolves configuration.
 */

import { supabase } from '@/lib/supabase';
import type { MarketMaterialRule, MarketCalculatorType } from '@/types/international';

// ============================================================
// CACHE — rules are cached per market+calculator for the session
// ============================================================

const ruleCache = new Map<string, Map<string, MarketMaterialRule>>();

function cacheKey(marketCode: string, calculatorType: string): string {
  return `${marketCode}:${calculatorType}`;
}

// ============================================================
// FETCH RULES
// ============================================================

/**
 * Fetch all active material rules for a market + calculator.
 * Results are cached for the session.
 */
export async function fetchMaterialRules(
  marketCode: string,
  calculatorType: MarketCalculatorType,
): Promise<Map<string, MarketMaterialRule>> {
  const key = cacheKey(marketCode, calculatorType);
  const cached = ruleCache.get(key);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('market_material_rules')
    .select('*')
    .eq('market_code', marketCode)
    .eq('calculator_type', calculatorType)
    .eq('is_active', true)
    .is('effective_to', null);

  if (error || !data) return new Map();

  const rules = new Map<string, MarketMaterialRule>();
  for (const row of data as unknown as MarketMaterialRule[]) {
    rules.set(row.rule_key, row);
  }

  ruleCache.set(key, rules);
  return rules;
}

// ============================================================
// RESOLVE A SINGLE RULE
// ============================================================

/**
 * Resolve a specific material rule for a market + calculator.
 * Returns the rule value, or null if not configured.
 *
 * IMPORTANT: If a rule is not found, returns null.
 * Calculators must handle null gracefully — never invent a value.
 */
export async function resolveMaterialRule<T = unknown>(
  marketCode: string,
  calculatorType: MarketCalculatorType,
  ruleKey: string,
): Promise<T | null> {
  const rules = await fetchMaterialRules(marketCode, calculatorType);
  const rule = rules.get(ruleKey);
  if (!rule) return null;
  return rule.rule_value as T;
}

/**
 * Synchronous version — uses cache only. Returns null if not cached.
 * Use this in hot calculation paths where async fetch is not practical.
 */
export function getCachedMaterialRule<T = unknown>(
  marketCode: string,
  calculatorType: MarketCalculatorType,
  ruleKey: string,
): T | null {
  const rules = ruleCache.get(cacheKey(marketCode, calculatorType));
  if (!rules) return null;
  const rule = rules.get(ruleKey);
  if (!rule) return null;
  return rule.rule_value as T;
}

// ============================================================
// RESOLVE MULTIPLE RULES
// ============================================================

/**
 * Resolve all rules for a calculator at once.
 * Returns a plain object keyed by rule_key → rule_value.
 */
export async function resolveAllRules(
  marketCode: string,
  calculatorType: MarketCalculatorType,
): Promise<Record<string, unknown>> {
  const rules = await fetchMaterialRules(marketCode, calculatorType);
  const result: Record<string, unknown> = {};
  for (const [key, rule] of rules.entries()) {
    result[key] = rule.rule_value;
  }
  return result;
}

// ============================================================
// PRELOAD — warm the cache for common calculators
// ============================================================

export async function preloadMaterialRules(marketCode: string): Promise<void> {
  const calculators: MarketCalculatorType[] = [
    'painting', 'screeding', 'pop_ceiling', 'tile', 'tyrolene', 'grafitex',
  ];
  await Promise.all(calculators.map((c) => fetchMaterialRules(marketCode, c)));
}

// ============================================================
// CLEAR CACHE
// ============================================================

export function clearMaterialRuleCache(): void {
  ruleCache.clear();
}
