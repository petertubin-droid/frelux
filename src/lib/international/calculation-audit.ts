/**
 * FRELUX INTERNATIONAL ARCHITECTURE, Calculation Audit
 *
 * Generates audit metadata for saved calculations.
 * This metadata is attached to calculation records for traceability
 * and future recalculation.
 *
 * Usage:
 *   const audit = createCalculationAudit(market, { inputUnit, ... });
 *   // Store audit on the calculation record.
 */

import {
  BUILTIN_MARKET_PROFILES,
  MARKET_STORAGE_KEY,
  LENGTH_UNIT_STORAGE_KEY,
} from './market-context';

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

/**
 * P1.9: storage-backed audit factory for the persistence layer.
 *
 * createCalculationAudit requires the live market context (React),
 * but estimates are persisted from non-React code paths. This factory
 * reads the same localStorage keys the MarketProvider resolves on
 * first render, so the audit always matches the market the estimate
 * was calculated under. Storage-unavailable environments fall back
 * to the NG legacy audit (never throws, never blocks a save).
 */
export function createEstimateAuditFromStorage(
  calculatorType: string,
): CalculationAuditMeta {
  let marketCode = 'NG';
  let currencyCode = 'NGN';
  let profileVersion = '1.0.0';
  let defaultUnit: string | null = null;
  try {
    const saved = window.localStorage.getItem(MARKET_STORAGE_KEY);
    const profile = saved
      ? BUILTIN_MARKET_PROFILES.find((p) => p.country_code === saved)
      : undefined;
    if (profile) {
      marketCode = profile.country_code;
      currencyCode = profile.currency_code;
      profileVersion = profile.profile_version;
      defaultUnit = profile.default_length_unit;
    }
  } catch {
    // storage unavailable — NG legacy defaults
  }
  let inputUnit = defaultUnit ?? 'meters';
  try {
    const saved = window.localStorage.getItem(LENGTH_UNIT_STORAGE_KEY);
    if (saved === 'meters' || saved === 'feet' || saved === 'inches') {
      inputUnit = saved;
    }
  } catch {
    // storage unavailable — keep profile default
  }
  return {
    market_code: marketCode,
    input_unit: inputUnit,
    normalized_unit: 'meters',
    market_profile_version: profileVersion,
    material_rule_version: null,
    calculator_version: `estimation-${calculatorType}`,
    currency_code: currencyCode,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Attach the calculation audit to an estimate payload additively.
 * Never overwrites an existing audit, never blocks a save, and leaves
 * payloads without inputs untouched.
 */
export function withCalculationAudit<
  T extends { inputs?: Record<string, unknown> | null },
>(data: T, calculatorType: string): T {
  const inputs = data.inputs;
  if (!inputs || typeof inputs !== 'object') return data;
  if ('calculation_audit' in inputs && inputs.calculation_audit) return data;
  return {
    ...data,
    inputs: {
      ...inputs,
      calculation_audit: createEstimateAuditFromStorage(calculatorType),
    },
  };
}
