/**
 * useCalcDefaults — fetches admin-configured calculation rules from
 * the estimation_calc_rules table. Replaces hardcoded frontend defaults.
 *
 * All calculator pages should use this hook to get their default values
 * (door/window dims, coverage rates, waste margins, container sizes, etc.)
 * instead of importing constants from calc.ts or utils.ts.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { EstimationCalcRule } from '@/types/estimation';

export interface CalcDefaults {
  // Global
  doorWidthM: number;
  doorHeightM: number;
  windowWidthM: number;
  windowHeightM: number;
  estimateDisclaimer: string;
  // Calculator-specific
  [key: string]: unknown;
}

export interface CalcRuleMap {
  [ruleKey: string]: EstimationCalcRule | undefined;
}

const EMPTY_DEFAULTS: CalcDefaults = {
  doorWidthM: 0.8,
  doorHeightM: 2.4,
  windowWidthM: 1.2,
  windowHeightM: 1.2,
  estimateDisclaimer: 'These estimates are calculated based on the assumptions shown above and may vary according to site conditions, products used, and current market prices. Always confirm with your supplier or contractor before purchasing.',
};

/**
 * Fetches calc rules for a given calculator type (plus global rules).
 * Returns a map of rule_key -> EstimationCalcRule for easy lookup.
 */
export function useCalcRules(calculatorType?: string) {
  const [rules, setRules] = useState<CalcRuleMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch global rules (calculator_type IS NULL) + calculator-specific rules
      let query = supabase.from('estimation_calc_rules').select('*').eq('is_active', true);
      if (calculatorType) {
        query = query.or(`calculator_type.is.null,calculator_type.eq.${calculatorType}`);
      } else {
        query = query.is('calculator_type', null);
      }
      const { data, error: dbError } = await query;
      if (dbError) throw new Error(dbError.message);
      const map: CalcRuleMap = {};
      for (const r of data ?? []) {
        // Calculator-specific rules override global ones
        if (!map[r.rule_key] || r.calculator_type === calculatorType) {
          map[r.rule_key] = r as EstimationCalcRule;
        }
      }
      setRules(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calc rules');
    } finally {
      setLoading(false);
    }
  }, [calculatorType]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { rules, loading, error, refetch: fetch };
}

/**
 * Extract a numeric value from a calc rule's rule_value JSON.
 */
export function getRuleValue(rule: EstimationCalcRule | undefined, fallback: number): number {
  if (!rule?.rule_value) return fallback;
  const v = (rule.rule_value as Record<string, unknown>)?.value;
  return typeof v === 'number' ? v : fallback;
}

/**
 * Extract a string value from a calc rule's rule_value JSON.
 */
export function getRuleString(rule: EstimationCalcRule | undefined, fallback: string): string {
  if (!rule?.rule_value) return fallback;
  const v = (rule.rule_value as Record<string, unknown>)?.value ?? (rule.rule_value as Record<string, unknown>)?.text;
  return typeof v === 'string' ? v : fallback;
}

/**
 * Extract a number array from a calc rule's rule_value JSON.
 */
export function getRuleArray(rule: EstimationCalcRule | undefined, fallback: number[]): number[] {
  if (!rule?.rule_value) return fallback;
  const v = (rule.rule_value as Record<string, unknown>)?.value;
  return Array.isArray(v) ? v : fallback;
}

/**
 * Convenience hook: returns parsed CalcDefaults for a calculator type.
 */
export function useCalcDefaults(calculatorType?: string) {
  const { rules, loading, error } = useCalcRules(calculatorType);

  const defaults: CalcDefaults = {
    doorWidthM: getRuleValue(rules['default_door_width_m'], 0.8),
    doorHeightM: getRuleValue(rules['default_door_height_m'], 2.4),
    windowWidthM: getRuleValue(rules['default_window_width_m'], 1.2),
    windowHeightM: getRuleValue(rules['default_window_height_m'], 1.2),
    estimateDisclaimer: getRuleString(rules['estimate_disclaimer'], EMPTY_DEFAULTS.estimateDisclaimer),
  };

  // Calculator-specific defaults
  if (calculatorType) {
    defaults.coverageM2PerLiter = getRuleValue(rules['default_coverage_m2_per_liter'], 10);
    defaults.containerSizes = getRuleArray(rules['default_container_sizes_liters'], [1, 4, 20]);
    defaults.defaultWasteMargin = getRuleValue(rules['default_waste_margin_pct'], 10);
    defaults.wasteMarginOptions = getRuleArray(rules['waste_margin_options'], [0, 5, 10, 15]);
    defaults.howCalculatedText = getRuleString(rules['how_calculated_text'], '');
    defaults.standardRoomHeightM = getRuleValue(rules['standard_room_height_m'], 2.4384);
  }

  return { defaults, rules, loading, error };
}
