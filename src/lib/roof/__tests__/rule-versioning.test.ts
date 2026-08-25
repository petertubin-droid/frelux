/**
 * FRELUX RULE VERSIONING — Tests
 *
 * Feature 14: Rule Versioning / Reproducibility
 */

import { describe, it, expect } from 'vitest';
import {
  computeContentHash,
  createRuleSet,
  publishRuleSetVersion,
  getActiveRuleSet,
  getRuleSetVersion,
  toRuleVersionReference,
  createRuleSetHistory,
  verifyRuleVersion,
} from '../rule-versioning';

describe('Rule Versioning: Content Hash', () => {
  it('computes a hash for a rule set', () => {
    const rules = { pitch: 30, waste: 5 };
    const hash = computeContentHash(rules);
    expect(hash).toBeTruthy();
    expect(hash).toMatch(/^h_[a-z0-9]+$/);
  });

  it('same rules produce same hash', () => {
    const rules1 = { pitch: 30, waste: 5 };
    const rules2 = { pitch: 30, waste: 5 };
    expect(computeContentHash(rules1)).toBe(computeContentHash(rules2));
  });

  it('different rules produce different hash', () => {
    const rules1 = { pitch: 30, waste: 5 };
    const rules2 = { pitch: 35, waste: 5 };
    expect(computeContentHash(rules1)).not.toBe(computeContentHash(rules2));
  });

  it('order-independent (keys sorted)', () => {
    const rules1 = { a: 1, b: 2 };
    const rules2 = { b: 2, a: 1 };
    expect(computeContentHash(rules1)).toBe(computeContentHash(rules2));
  });
});

describe('Rule Versioning: Rule Set Creation', () => {
  it('creates a rule set with hash and timestamp', () => {
    const rs = createRuleSet('roof_area_rules', '1.0.0', 'Initial rules', { pitch: 30 });
    expect(rs.name).toBe('roof_area_rules');
    expect(rs.version).toBe('1.0.0');
    expect(rs.contentHash).toBeTruthy();
    expect(rs.publishedAt).toBeTruthy();
    expect(rs.active).toBe(true);
    expect(rs.rules).toEqual({ pitch: 30 });
  });
});

describe('Rule Versioning: Publishing', () => {
  it('publishes a new version and deactivates old ones', () => {
    let history = createRuleSetHistory('roof_area_rules');
    history = publishRuleSetVersion(history, '1.0.0', 'Initial', { waste: 5 });
    history = publishRuleSetVersion(history, '2.0.0', 'Updated waste', { waste: 10 });

    expect(history.versions).toHaveLength(2);
    expect(history.versions[0].active).toBe(false);
    expect(history.versions[1].active).toBe(true);
  });

  it('gets the active rule set', () => {
    let history = createRuleSetHistory('test_rules');
    history = publishRuleSetVersion(history, '1.0.0', 'V1', { a: 1 });
    history = publishRuleSetVersion(history, '2.0.0', 'V2', { a: 2 });
    const active = getActiveRuleSet(history);
    expect(active?.version).toBe('2.0.0');
    expect(active?.rules.a).toBe(2);
  });

  it('gets a specific version', () => {
    let history = createRuleSetHistory('test_rules');
    history = publishRuleSetVersion(history, '1.0.0', 'V1', { a: 1 });
    history = publishRuleSetVersion(history, '2.0.0', 'V2', { a: 2 });
    const v1 = getRuleSetVersion(history, '1.0.0');
    expect(v1?.version).toBe('1.0.0');
    expect(v1?.rules.a).toBe(1);
    expect(v1?.active).toBe(false);
  });

  it('returns null for nonexistent version', () => {
    const history = createRuleSetHistory('test');
    expect(getRuleSetVersion(history, '99.0.0')).toBeNull();
  });
});

describe('Rule Versioning: References', () => {
  it('creates a reference from a rule set', () => {
    const rs = createRuleSet('roof_area_rules', '1.0.0', 'Test', { pitch: 30 });
    const ref = toRuleVersionReference(rs);
    expect(ref.ruleSet).toBe('roof_area_rules');
    expect(ref.version).toBe('1.0.0');
    expect(ref.contentHash).toBe(rs.contentHash);
    expect(ref.publishedAt).toBe(rs.publishedAt);
  });

  it('verifies a matching reference', () => {
    const rs = createRuleSet('roof_area_rules', '1.0.0', 'Test', { pitch: 30 });
    const ref = toRuleVersionReference(rs);
    expect(verifyRuleVersion(ref, rs)).toBe(true);
  });

  it('rejects a mismatched reference', () => {
    const rs = createRuleSet('roof_area_rules', '1.0.0', 'Test', { pitch: 30 });
    const ref = toRuleVersionReference(rs);
    const rs2 = createRuleSet('roof_area_rules', '1.0.0', 'Test', { pitch: 35 });
    expect(verifyRuleVersion(ref, rs2)).toBe(false);
  });
});

describe('Rule Versioning: Empty History', () => {
  it('returns null for active rule set in empty history', () => {
    const history = createRuleSetHistory('empty');
    expect(getActiveRuleSet(history)).toBeNull();
  });
});
