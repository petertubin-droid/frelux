/**
 * FRELUX INTERNATIONAL ARCHITECTURE — Calculation Audit
 *
 * Generates audit metadata for saved calculations.
 * This metadata is attached to calculation records for traceability
 * and future recalculation.
 *
 * Usage:
 *   const audit = createCalculationAudit(market, { inputUnit, ... });
 *   // Store audit on the calculation record.
 */

import type {
  ResolvedMarketContext,
  CalculationAuditMeta,
} from '@/types/international';

/**
 * Create calculation audit metadata from the current market context.
 * This should be attached to every saved calculation.
 */
export function createCalculationAudit(
  market: ResolvedMarketContext,
  params: {
    inputUnit: string;
    normalizedUnit?: string;
    materialRuleVersion?: string | null;
    calculatorVersion?: string | null;
  },
): CalculationAuditMeta {
  return {
    market_code: market.marketCode,
    input_unit: params.inputUnit,
    normalized_unit: params.normalizedUnit ?? 'meters',
    market_profile_version: market.profileVersion,
    material_rule_version: params.materialRuleVersion ?? null,
    calculator_version: params.calculatorVersion ?? null,
    currency_code: market.currencyCode,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a backward-compatible audit for existing records that don't have one.
 * Defaults to Nigeria context.
 */
export function createLegacyAudit(): CalculationAuditMeta {
  return {
    market_code: 'NG',
    input_unit: 'meters',
    normalized_unit: 'meters',
    market_profile_version: '1.0.0',
    material_rule_version: null,
    calculator_version: null,
    currency_code: 'NGN',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Merge audit metadata into a calculation record's input/quantity data.
 * Returns a spread-able object for Supabase insert/update.
 */
export function auditToRecord(audit: CalculationAuditMeta): Record<string, unknown> {
  return {
    market_code: audit.market_code,
    input_unit: audit.input_unit,
    normalized_unit: audit.normalized_unit,
    market_profile_version: audit.market_profile_version,
    material_rule_version: audit.material_rule_version,
  };
}
