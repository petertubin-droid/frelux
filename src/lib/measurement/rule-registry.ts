/**
 * FRELUX CALCULATION RULE REGISTRY
 *
 * Feature 6 of 16: Calculation Rule Registry
 *
 * A centralized calculation-rule architecture.
 * Every significant calculation rule is identifiable and configurable.
 *
 * Rule hierarchy:
 *   GLOBAL RULE (universal geometry)
 *   + COUNTRY RULE (Nigeria-specific, Ghana-specific, etc.)
 *   + MARKET RULE (Rivers/Port Harcourt, Accra, Nairobi, etc.)
 *   + USER INPUT/PREFERENCE
 *
 * Global geometry: Area = Length × Width
 * Country rule: Nigeria-specific construction rule
 * Market rule: local market variation
 * User: unit preference
 *
 * Rules do NOT hardcode country assumptions into universal formulas.
 */

import type { FinishType } from './space-engine';
import type { LengthUnit } from './units';
import { generateId } from './factory';

// =========================================================
// RULE TYPES
// =========================================================

/**
 * The scope at which a rule applies.
 * Rules are evaluated from most general to most specific:
 * GLOBAL → COUNTRY → MARKET → USER
 */
export type RuleScope = 'global' | 'country' | 'market' | 'user';

/**
 * The status of a calculation rule.
 */
export type RuleStatus = 'active' | 'deprecated' | 'draft' | 'testing';

/**
 * Approval status of a rule.
 */
export type RuleApprovalStatus = 'approved' | 'pending' | 'rejected';

/**
 * The type of calculation a rule governs.
 */
export type RuleCategory =
  | 'geometry'        // area, volume, perimeter calculations
  | 'material'         // material quantity calculations
  | 'waste'            // waste allowance rules
  | 'opening'          // door/window deduction rules
  | 'coverage'         // coverage/yield rules
  | 'painting'         // painting-specific rules
  | 'screeding'        // screeding-specific rules
  | 'tiling'           // tiling-specific rules
  | 'grafitex'         // grafitex-specific rules
  | 'block'            // block-specific rules
  | 'fence'            // fence-specific rules
  | 'pop'              // POP-specific rules
  | 'tyrolene'         // tyrolene-specific rules
  | 'pricing';         // pricing rules (handled separately)

export const RULE_CATEGORY_LABELS: Record<RuleCategory, string> = {
  geometry: 'Geometry',
  material: 'Material',
  waste: 'Waste Allowance',
  opening: 'Opening Deduction',
  coverage: 'Coverage / Yield',
  painting: 'Painting',
  screeding: 'Screeding',
  tiling: 'Tiling',
  grafitex: 'Grafitex',
  block: 'Block',
  fence: 'Fence',
  pop: 'POP',
  tyrolene: 'Tyrolene',
  pricing: 'Pricing',
};

// =========================================================
// CALCULATION RULE
// =========================================================

/**
 * A calculation rule definition.
 * Each rule is identifiable, configurable, and traceable.
 */
export interface CalculationRule {
  /** Unique rule ID */
  ruleId: string;
  /** Human-readable rule name */
  ruleName: string;
  /** Rule category */
  category: RuleCategory;
  /** Scope: global, country, market, user */
  scope: RuleScope;
  /** Country code (for country/market scope) — ISO 3166-1 alpha-2 */
  countryCode?: string;
  /** Market/region code (for market scope) */
  marketCode?: string;
  /** City name (for market scope) */
  city?: string;
  /** Material this rule applies to (optional) */
  material?: string;
  /** Finish type this rule applies to */
  finishType?: FinishType;
  /** Formula or logic description (human-readable) */
  formula: string;
  /** Input units expected */
  inputUnits: string;
  /** Output unit */
  outputUnit: string;
  /** Rule version number */
  version: number;
  /** Effective date (ISO 8601) */
  effectiveDate: string;
  /** Rule status */
  status: RuleStatus;
  /** Approval status */
  approvalStatus: RuleApprovalStatus;
  /** Source/reference (documentation, standard, or organization) */
  source?: string;
  /** Notes */
  notes?: string;
  /** Rule parameters (key-value pairs for configurable values) */
  parameters: Record<string, number | string | boolean>;
  /** Created date */
  createdAt: string;
  /** Updated date */
  updatedAt: string;
}

// =========================================================
// RULE REGISTRY
// =========================================================

/**
 * The rule registry holds all calculation rules.
 * Rules are looked up by scope, category, and optional country/market filters.
 */
export interface RuleRegistry {
  rules: CalculationRule[];
}

/**
 * Create an empty rule registry.
 */
export function createRuleRegistry(): RuleRegistry {
  return { rules: [] };
}

/**
 * Create a calculation rule with defaults.
 */
export function createRule(
  partial: Partial<CalculationRule> = {},
): CalculationRule {
  const now = new Date().toISOString();
  return {
    ruleId: partial.ruleId ?? generateId('rule'),
    ruleName: partial.ruleName ?? 'New Rule',
    category: partial.category ?? 'geometry',
    scope: partial.scope ?? 'global',
    countryCode: partial.countryCode,
    marketCode: partial.marketCode,
    city: partial.city,
    material: partial.material,
    finishType: partial.finishType,
    formula: partial.formula ?? '',
    inputUnits: partial.inputUnits ?? 'm',
    outputUnit: partial.outputUnit ?? 'm²',
    version: partial.version ?? 1,
    effectiveDate: partial.effectiveDate ?? now,
    status: partial.status ?? 'draft',
    approvalStatus: partial.approvalStatus ?? 'pending',
    source: partial.source,
    notes: partial.notes,
    parameters: partial.parameters ?? {},
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Register a rule in the registry.
 */
export function registerRule(registry: RuleRegistry, rule: CalculationRule): RuleRegistry {
  return { rules: [...registry.rules, rule] };
}

/**
 * Register multiple rules.
 */
export function registerRules(registry: RuleRegistry, rules: CalculationRule[]): RuleRegistry {
  return { rules: [...registry.rules, ...rules] };
}

// =========================================================
// RULE LOOKUP
// =========================================================

/**
 * Query parameters for finding rules.
 */
export interface RuleQuery {
  category?: RuleCategory;
  scope?: RuleScope;
  countryCode?: string;
  marketCode?: string;
  finishType?: FinishType;
  material?: string;
  status?: RuleStatus;
  approvalStatus?: RuleApprovalStatus;
}

/**
 * Find rules matching the query.
 * Rules are sorted by scope specificity: global → country → market → user.
 */
export function findRules(registry: RuleRegistry, query: RuleQuery): CalculationRule[] {
  const scopeOrder: Record<RuleScope, number> = {
    global: 0,
    country: 1,
    market: 2,
    user: 3,
  };

  return registry.rules
    .filter((rule) => {
      if (query.category && rule.category !== query.category) return false;
      if (query.scope && rule.scope !== query.scope) return false;
      if (query.countryCode && rule.countryCode !== query.countryCode) return false;
      if (query.marketCode && rule.marketCode !== query.marketCode) return false;
      if (query.finishType && rule.finishType !== query.finishType) return false;
      if (query.material && rule.material !== query.material) return false;
      if (query.status && rule.status !== query.status) return false;
      if (query.approvalStatus && rule.approvalStatus !== query.approvalStatus) return false;
      return true;
    })
    .sort((a, b) => scopeOrder[a.scope] - scopeOrder[b.scope]);
}

/**
 * Find the most specific applicable rule for a query.
 * Returns the rule at the highest scope specificity that matches.
 */
export function findApplicableRule(
  registry: RuleRegistry,
  query: RuleQuery,
): CalculationRule | undefined {
  const rules = findRules(registry, { ...query, status: 'active', approvalStatus: 'approved' });
  return rules[rules.length - 1]; // most specific
}

/**
 * Find all applicable rules in specificity order (global → country → market → user).
 * This allows the calculation engine to apply rules in order, with more specific
 * rules overriding or supplementing global rules.
 */
export function findApplicableRules(
  registry: RuleRegistry,
  query: RuleQuery,
): CalculationRule[] {
  return findRules(registry, { ...query, status: 'active', approvalStatus: 'approved' });
}

/**
 * Get a rule by ID.
 */
export function getRuleById(registry: RuleRegistry, ruleId: string): CalculationRule | undefined {
  return registry.rules.find((r) => r.ruleId === ruleId);
}

/**
 * Get a parameter value from a rule.
 */
export function getRuleParameter(
  rule: CalculationRule,
  paramName: string,
  defaultValue?: number,
): number {
  const value = rule.parameters[paramName];
  if (typeof value === 'number') return value;
  return defaultValue ?? 0;
}

// =========================================================
// BUILT-IN GLOBAL RULES
// =========================================================

/**
 * Create the built-in global geometry rules.
 * These are universal mathematical rules — no country assumptions.
 */
export function createGlobalGeometryRules(): CalculationRule[] {
  const now = new Date().toISOString();
  return [
    createRule({
      ruleName: 'Rectangular Area',
      category: 'geometry',
      scope: 'global',
      formula: 'Area = Length × Width',
      inputUnits: 'm, m',
      outputUnit: 'm²',
      version: 1,
      effectiveDate: now,
      status: 'active',
      approvalStatus: 'approved',
      source: 'Universal geometry',
      notes: 'Universal rectangular area formula — applies to all markets',
      parameters: {},
    }),
    createRule({
      ruleName: 'Wall Area (Perimeter × Height)',
      category: 'geometry',
      scope: 'global',
      formula: 'Area = 2 × (Length + Width) × Height',
      inputUnits: 'm, m, m',
      outputUnit: 'm²',
      version: 1,
      effectiveDate: now,
      status: 'active',
      approvalStatus: 'approved',
      source: 'Universal geometry',
      parameters: {},
    }),
    createRule({
      ruleName: 'Fence Partition Area',
      category: 'geometry',
      scope: 'global',
      formula: 'Partition Area = Length × Height; Dimension Area = Partition × Count',
      inputUnits: 'm, m, count',
      outputUnit: 'm²',
      version: 1,
      effectiveDate: now,
      status: 'active',
      approvalStatus: 'approved',
      source: 'Universal geometry',
      parameters: {},
    }),
  ];
}

/**
 * Create a Nigeria-specific painting rule example.
 * Nigeria can remain the primary market without hardcoding it globally.
 */
export function createNigeriaPaintingRules(): CalculationRule[] {
  const now = new Date().toISOString();
  return [
    createRule({
      ruleName: 'Nigeria Painting — 2 Coats Standard',
      category: 'painting',
      scope: 'country',
      countryCode: 'NG',
      formula: 'Buckets = Area ÷ (Coverage per bucket ÷ Coats)',
      inputUnits: 'm²',
      outputUnit: 'buckets',
      version: 1,
      effectiveDate: now,
      status: 'active',
      approvalStatus: 'approved',
      source: 'FRELUX Nigeria construction standard',
      notes: 'Nigeria-specific painting rule — 2 coats standard for emulsion paint',
      parameters: { standardCoats: 2, defaultWastePercent: 5 },
    }),
  ];
}

/**
 * Create a Nigeria-specific screeding rule example.
 */
export function createNigeriaScreedingRules(): CalculationRule[] {
  const now = new Date().toISOString();
  return [
    createRule({
      ruleName: 'Nigeria Screeding — Area-Based',
      category: 'screeding',
      scope: 'country',
      countryCode: 'NG',
      formula: 'Screeding area = Length × Height (in m², not buckets)',
      inputUnits: 'm²',
      outputUnit: 'm²',
      version: 1,
      effectiveDate: now,
      status: 'active',
      approvalStatus: 'approved',
      source: 'FRELUX Nigeria construction standard',
      notes: 'Screeding is calculated as area in square metres, NOT as bucket count',
      parameters: {},
    }),
  ];
}
