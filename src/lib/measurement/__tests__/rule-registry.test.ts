/**
 * Tests for the Calculation Rule Registry (Feature 6)
 */

import { describe, it, expect } from 'vitest';
import {
  createRuleRegistry,
  createRule,
  registerRule,
  registerRules,
  findRules,
  findApplicableRule,
  findApplicableRules,
  getRuleById,
  getRuleParameter,
  createGlobalGeometryRules,
  createNigeriaPaintingRules,
  createNigeriaScreedingRules,
  RULE_CATEGORY_LABELS,
} from '../rule-registry';

describe('Rule Registry', () => {
  it('creates an empty registry', () => {
    const registry = createRuleRegistry();
    expect(registry.rules).toEqual([]);
  });

  it('creates a rule with defaults', () => {
    const rule = createRule();
    expect(rule.ruleId).toBeDefined();
    expect(rule.ruleName).toBe('New Rule');
    expect(rule.category).toBe('geometry');
    expect(rule.scope).toBe('global');
    expect(rule.version).toBe(1);
    expect(rule.status).toBe('draft');
    expect(rule.approvalStatus).toBe('pending');
    expect(rule.parameters).toEqual({});
  });

  it('creates a rule with custom values', () => {
    const rule = createRule({
      ruleName: 'Nigeria Painting 2-Coat',
      category: 'painting',
      scope: 'country',
      countryCode: 'NG',
      formula: 'Buckets = Area ÷ Coverage',
      version: 2,
      status: 'active',
      approvalStatus: 'approved',
      parameters: { standardCoats: 2, defaultWastePercent: 5 },
    });
    expect(rule.ruleName).toBe('Nigeria Painting 2-Coat');
    expect(rule.scope).toBe('country');
    expect(rule.countryCode).toBe('NG');
    expect(rule.version).toBe(2);
    expect(rule.parameters.standardCoats).toBe(2);
  });

  it('registers a rule', () => {
    const registry = createRuleRegistry();
    const rule = createRule({ ruleName: 'Test' });
    const updated = registerRule(registry, rule);
    expect(updated.rules.length).toBe(1);
    expect(registry.rules.length).toBe(0); // original unchanged
  });

  it('registers multiple rules', () => {
    const registry = createRuleRegistry();
    const rules = [createRule({ ruleName: 'A' }), createRule({ ruleName: 'B' })];
    const updated = registerRules(registry, rules);
    expect(updated.rules.length).toBe(2);
  });
});

describe('Rule Lookup', () => {
  function setupRegistry() {
    return registerRules(createRuleRegistry(), [
      ...createGlobalGeometryRules(),
      ...createNigeriaPaintingRules(),
      ...createNigeriaScreedingRules(),
    ]);
  }

  it('finds rules by category', () => {
    const registry = setupRegistry();
    const geometryRules = findRules(registry, { category: 'geometry' });
    expect(geometryRules.length).toBe(3);
  });

  it('finds rules by scope', () => {
    const registry = setupRegistry();
    const globalRules = findRules(registry, { scope: 'global' });
    const countryRules = findRules(registry, { scope: 'country' });
    expect(globalRules.length).toBe(3);
    expect(countryRules.length).toBe(2);
  });

  it('finds rules by country code', () => {
    const registry = setupRegistry();
    const nigeriaRules = findRules(registry, { countryCode: 'NG' });
    expect(nigeriaRules.length).toBe(2);
    expect(nigeriaRules.every((r) => r.countryCode === 'NG')).toBe(true);
  });

  it('finds rules by category and country', () => {
    const registry = setupRegistry();
    const nigeriaPainting = findRules(registry, { category: 'painting', countryCode: 'NG' });
    expect(nigeriaPainting.length).toBe(1);
    expect(nigeriaPainting[0].ruleName).toContain('Nigeria Painting');
  });

  it('returns rules sorted by scope specificity', () => {
    const registry = setupRegistry();
    const rules = findRules(registry, {});
    // Global rules should come first
    expect(rules[0].scope).toBe('global');
    // Country rules should come after
    const countryRules = rules.filter((r) => r.scope === 'country');
    expect(countryRules.length).toBe(2);
  });

  it('finds the most specific applicable rule', () => {
    const registry = setupRegistry();
    const rule = findApplicableRule(registry, { category: 'painting', countryCode: 'NG' });
    expect(rule).toBeDefined();
    expect(rule!.scope).toBe('country'); // most specific
    expect(rule!.countryCode).toBe('NG');
  });

  it('finds applicable rules in specificity order', () => {
    const registry = setupRegistry();
    const rules = findApplicableRules(registry, { category: 'geometry' });
    expect(rules.length).toBe(3); // all global geometry rules
    expect(rules.every((r) => r.status === 'active')).toBe(true);
    expect(rules.every((r) => r.approvalStatus === 'approved')).toBe(true);
  });

  it('excludes non-active or non-approved rules', () => {
    let registry = setupRegistry();
    registry = registerRule(registry, createRule({
      category: 'painting',
      scope: 'global',
      status: 'draft',
      approvalStatus: 'pending',
    }));
    const rules = findApplicableRules(registry, { category: 'painting' });
    expect(rules.length).toBe(1); // only the approved Nigeria rule
  });

  it('gets rule by ID', () => {
    const registry = setupRegistry();
    const firstRule = registry.rules[0];
    const found = getRuleById(registry, firstRule.ruleId);
    expect(found).toBeDefined();
    expect(found!.ruleId).toBe(firstRule.ruleId);
  });
});

describe('Rule Parameters', () => {
  it('gets a parameter value', () => {
    const rule = createRule({
      parameters: { standardCoats: 2, defaultWastePercent: 5 },
    });
    expect(getRuleParameter(rule, 'standardCoats')).toBe(2);
    expect(getRuleParameter(rule, 'defaultWastePercent')).toBe(5);
  });

  it('returns default for missing parameter', () => {
    const rule = createRule({ parameters: {} });
    expect(getRuleParameter(rule, 'missing', 10)).toBe(10);
    expect(getRuleParameter(rule, 'missing')).toBe(0);
  });
});

describe('Built-in Rules', () => {
  it('creates global geometry rules', () => {
    const rules = createGlobalGeometryRules();
    expect(rules.length).toBe(3);
    expect(rules.every((r) => r.scope === 'global')).toBe(true);
    expect(rules.every((r) => r.status === 'active')).toBe(true);
    expect(rules.every((r) => r.approvalStatus === 'approved')).toBe(true);
  });

  it('creates Nigeria painting rules', () => {
    const rules = createNigeriaPaintingRules();
    expect(rules.length).toBe(1);
    expect(rules[0].countryCode).toBe('NG');
    expect(rules[0].scope).toBe('country');
    expect(rules[0].parameters.standardCoats).toBe(2);
  });

  it('creates Nigeria screeding rules', () => {
    const rules = createNigeriaScreedingRules();
    expect(rules.length).toBe(1);
    expect(rules[0].countryCode).toBe('NG');
    expect(rules[0].category).toBe('screeding');
  });

  it('global rules do not hardcode Nigeria', () => {
    const rules = createGlobalGeometryRules();
    expect(rules.every((r) => r.countryCode === undefined)).toBe(true);
    expect(rules.every((r) => r.marketCode === undefined)).toBe(true);
  });
});

describe('Rule Category Labels', () => {
  it('has labels for all categories', () => {
    expect(RULE_CATEGORY_LABELS.geometry).toBe('Geometry');
    expect(RULE_CATEGORY_LABELS.painting).toBe('Painting');
    expect(RULE_CATEGORY_LABELS.screeding).toBe('Screeding');
    expect(RULE_CATEGORY_LABELS.tiling).toBe('Tiling');
    expect(RULE_CATEGORY_LABELS.pricing).toBe('Pricing');
  });
});
