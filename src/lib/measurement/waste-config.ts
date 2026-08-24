/**
 * FRELUX CONFIGURABLE WASTE
 *
 * Feature 12 of 16: Configurable Waste
 *
 * Waste is a configurable parameter at the relevant scope.
 *
 * Hierarchy:
 *   GLOBAL DEFAULT → COUNTRY → MARKET → USER INPUT
 *
 * The system uses the most specific applicable value:
 * - If the user specifies a waste %, use it.
 * - Otherwise, check for a market-level waste rule.
 * - Otherwise, check for a country-level waste rule.
 * - Otherwise, use the global default.
 *
 * Waste sources must be transparent and traceable:
 * - What scope provided the waste %?
 * - What rule or input determined it?
 * - The system must expose which source was used.
 */

import type { CalculationRule } from './rule-registry';

// =========================================================
// WASTE SOURCE
// =========================================================

/**
 * The scope from which a waste percentage was sourced.
 */
export type WasteSource = 'user' | 'market' | 'country' | 'global_default' | 'rule';

export const WASTE_SOURCE_LABELS: Record<WasteSource, string> = {
  user: 'User Input',
  market: 'Market Rule',
  country: 'Country Rule',
  global_default: 'Global Default',
  rule: 'Calculation Rule',
};

/**
 * Information about how a waste percentage was determined.
 */
export interface WasteResolution {
  /** The resolved waste percentage (0–100) */
  wastePercent: number;
  /** Where the value came from */
  source: WasteSource;
  /** Human-readable explanation of why this value was used */
  explanation: string;
  /** The rule that provided this waste (if applicable) */
  ruleId?: string;
  /** Whether the waste was explicitly overridden */
  isOverride: boolean;
}

// =========================================================
// WASTE CONFIGURATION
// =========================================================

/**
 * A waste configuration that can be set at different scopes.
 * More specific scopes override more general ones.
 */
export interface WasteConfig {
  /** Global default waste percentage */
  globalDefault: number;
  /** Country-specific waste percentages (by country code) */
  byCountry: Record<string, number>;
  /** Market-specific waste percentages (by market code) */
  byMarket: Record<string, number>;
  /** User-specified waste percentage (highest priority) */
  userOverride?: number;
}

/**
 * Create a waste config with defaults.
 */
export function createWasteConfig(
  partial: Partial<WasteConfig> = {},
): WasteConfig {
  return {
    globalDefault: partial.globalDefault ?? 10,
    byCountry: partial.byCountry ?? {},
    byMarket: partial.byMarket ?? {},
    userOverride: partial.userOverride,
  };
}

// =========================================================
// WASTE RESOLUTION
// =========================================================

/**
 * Resolve the waste percentage for a given context.
 *
 * Priority: userOverride → byMarket → byCountry → globalDefault
 *
 * The resolution is transparent — it reports which source was used.
 *
 * @param config - Waste configuration
 * @param countryCode - ISO country code (optional)
 * @param marketCode - Market/region code (optional)
 * @param userWastePercent - User-specified waste % (highest priority)
 * @returns Waste resolution with source and explanation
 */
export function resolveWaste(
  config: WasteConfig,
  countryCode?: string,
  marketCode?: string,
  userWastePercent?: number,
): WasteResolution {
  // Priority 1: User input (explicit override)
  if (userWastePercent !== undefined && userWastePercent >= 0) {
    return {
      wastePercent: userWastePercent,
      source: 'user',
      explanation: `User specified ${userWastePercent}% waste`,
      isOverride: true,
    };
  }

  // Priority 2: Market-level rule
  if (marketCode && config.byMarket[marketCode] !== undefined) {
    return {
      wastePercent: config.byMarket[marketCode],
      source: 'market',
      explanation: `Market rule for ${marketCode}: ${config.byMarket[marketCode]}% waste`,
      isOverride: false,
    };
  }

  // Priority 3: Country-level rule
  if (countryCode && config.byCountry[countryCode] !== undefined) {
    return {
      wastePercent: config.byCountry[countryCode],
      source: 'country',
      explanation: `Country rule for ${countryCode}: ${config.byCountry[countryCode]}% waste`,
      isOverride: false,
    };
  }

  // Priority 4: Global default
  return {
    wastePercent: config.globalDefault,
    source: 'global_default',
    explanation: `Global default: ${config.globalDefault}% waste`,
    isOverride: false,
  };
}

/**
 * Resolve waste from a calculation rule's parameters.
 * Checks if the rule has a "defaultWastePercent" parameter.
 *
 * @param rule - Calculation rule with waste parameter
 * @param userWastePercent - User override (highest priority)
 * @returns Waste resolution
 */
export function resolveWasteFromRule(
  rule: CalculationRule,
  userWastePercent?: number,
): WasteResolution {
  // User override always wins
  if (userWastePercent !== undefined && userWastePercent >= 0) {
    return {
      wastePercent: userWastePercent,
      source: 'user',
      explanation: `User specified ${userWastePercent}% waste (overrides rule)`,
      isOverride: true,
    };
  }

  // Check rule parameters
  const ruleWaste = rule.parameters.defaultWastePercent;
  if (typeof ruleWaste === 'number' && ruleWaste >= 0) {
    return {
      wastePercent: ruleWaste,
      source: 'rule',
      explanation: `Rule "${rule.ruleName}" specifies ${ruleWaste}% waste`,
      ruleId: rule.ruleId,
      isOverride: false,
    };
  }

  // Fallback to global default (10%)
  return {
    wastePercent: 10,
    source: 'global_default',
    explanation: 'Global default: 10% waste (no rule parameter found)',
    isOverride: false,
  };
}

// =========================================================
// WASTE APPLICATION
// =========================================================

import { applyWasteMargin } from './geometry';

/**
 * Apply resolved waste to a base quantity.
 */
export function applyResolvedWaste(
  baseQuantity: number,
  resolution: WasteResolution,
): { quantity: number; resolution: WasteResolution } {
  return {
    quantity: applyWasteMargin(baseQuantity, resolution.wastePercent),
    resolution,
  };
}

// =========================================================
// WASTE CONFIG UPDATE
// =========================================================

/**
 * Set the global default waste percentage.
 */
export function setGlobalDefaultWaste(
  config: WasteConfig,
  percent: number,
): WasteConfig {
  return { ...config, globalDefault: percent };
}

/**
 * Set a country-level waste percentage.
 */
export function setCountryWaste(
  config: WasteConfig,
  countryCode: string,
  percent: number,
): WasteConfig {
  return {
    ...config,
    byCountry: { ...config.byCountry, [countryCode]: percent },
  };
}

/**
 * Set a market-level waste percentage.
 */
export function setMarketWaste(
  config: WasteConfig,
  marketCode: string,
  percent: number,
): WasteConfig {
  return {
    ...config,
    byMarket: { ...config.byMarket, [marketCode]: percent },
  };
}

/**
 * Set a user override waste percentage.
 */
export function setUserWaste(
  config: WasteConfig,
  percent: number | undefined,
): WasteConfig {
  return { ...config, userOverride: percent };
}

// =========================================================
// NIGERIA DEFAULTS
// =========================================================

/**
 * Create a waste config with Nigeria-specific defaults.
 * Nigeria remains the primary market — other markets use their own configs.
 */
export function createNigeriaWasteConfig(): WasteConfig {
  return createWasteConfig({
    globalDefault: 10,
    byCountry: {
      NG: 10, // Nigeria default: 10% waste
    },
    byMarket: {},
    userOverride: undefined,
  });
}

// =========================================================
// FORMATTING
// =========================================================

/**
 * Format waste resolution as readable text.
 */
export function wasteResolutionToText(resolution: WasteResolution): string {
  return `${resolution.wastePercent}% waste (${WASTE_SOURCE_LABELS[resolution.source]}) — ${resolution.explanation}`;
}
