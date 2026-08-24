/**
 * Tests for Rule Versioning (Feature 7)
 */

import { describe, it, expect } from 'vitest';
import {
  createVersionRegistry,
  registerInitialVersion,
  createNewVersion,
  getVersionHistory,
  getRuleVersion,
  getLatestVersion,
  getAllVersions,
  hasMultipleVersions,
  createRuleVersionReference,
  verifyRuleVersion,
} from '../rule-versioning';
import { createRule } from '../rule-registry';

describe('Version Registry', () => {
  it('creates an empty version registry', () => {
    const registry = createVersionRegistry();
    expect(registry.histories.size).toBe(0);
  });

  it('registers an initial version', () => {
    const registry = createVersionRegistry();
    const rule = createRule({ ruleName: 'Test Rule', version: 1 });
    const updated = registerInitialVersion(registry, rule);
    const history = getVersionHistory(updated, rule.ruleId);
    expect(history).toBeDefined();
    expect(history!.versions.length).toBe(1);
    expect(history!.versions[0].version).toBe(1);
  });
});

describe('Version Creation', () => {
  it('creates a new version, keeping the old one', () => {
    let registry = createVersionRegistry();
    const rule = createRule({ ruleName: 'Painting Rule', version: 1, status: 'active' });
    registry = registerInitialVersion(registry, rule);

    // Create version 2 with updated parameters
    const updatedRule = createRule({
      ...rule,
      parameters: { standardCoats: 3 },
    });
    registry = createNewVersion(registry, rule.ruleId, updatedRule, 'admin', 'Changed to 3 coats');

    const history = getVersionHistory(registry, rule.ruleId);
    expect(history!.versions.length).toBe(2);
    expect(history!.versions[0].version).toBe(1);
    expect(history!.versions[1].version).toBe(2);
  });

  it('deprecates the previous version', () => {
    let registry = createVersionRegistry();
    const rule = createRule({ ruleName: 'Test', version: 1, status: 'active' });
    registry = registerInitialVersion(registry, rule);

    const updated = createRule({ ...rule, parameters: { newParam: true } });
    registry = createNewVersion(registry, rule.ruleId, updated);

    const history = getVersionHistory(registry, rule.ruleId);
    expect(history!.versions[0].rule.status).toBe('deprecated');
    expect(history!.versions[1].rule.status).toBe('active'); // new version
  });

  it('increments version number automatically', () => {
    let registry = createVersionRegistry();
    const rule = createRule({ ruleName: 'Test', version: 1 });
    registry = registerInitialVersion(registry, rule);

    registry = createNewVersion(registry, rule.ruleId, createRule({ ...rule, parameters: { a: 1 } }));
    registry = createNewVersion(registry, rule.ruleId, createRule({ ...rule, parameters: { a: 2 } }));

    const history = getVersionHistory(registry, rule.ruleId);
    expect(history!.versions.length).toBe(3);
    expect(history!.versions[0].version).toBe(1);
    expect(history!.versions[1].version).toBe(2);
    expect(history!.versions[2].version).toBe(3);
  });

  it('stores change reason', () => {
    let registry = createVersionRegistry();
    const rule = createRule({ ruleName: 'Test', version: 1 });
    registry = registerInitialVersion(registry, rule, 'admin', 'Initial version');

    registry = createNewVersion(registry, rule.ruleId, createRule({ ...rule }), 'admin', 'Updated waste %');

    const history = getVersionHistory(registry, rule.ruleId);
    expect(history!.versions[1].changeReason).toBe('Updated waste %');
  });
});

describe('Version Lookup', () => {
  function setupRegistry() {
    let registry = createVersionRegistry();
    const rule = createRule({ ruleName: 'Test', version: 1, parameters: { coats: 2 } });
    registry = registerInitialVersion(registry, rule);
    registry = createNewVersion(registry, rule.ruleId, createRule({ ...rule, parameters: { coats: 3 } }), 'admin', 'Changed to 3 coats');
    return { registry, ruleId: rule.ruleId };
  }

  it('gets a specific version', () => {
    const { registry, ruleId } = setupRegistry();
    const v1 = getRuleVersion(registry, ruleId, 1);
    const v2 = getRuleVersion(registry, ruleId, 2);
    expect(v1).toBeDefined();
    expect(v2).toBeDefined();
    expect(v1!.parameters.coats).toBe(2);
    expect(v2!.parameters.coats).toBe(3);
  });

  it('gets the latest version', () => {
    const { registry, ruleId } = setupRegistry();
    const latest = getLatestVersion(registry, ruleId);
    expect(latest).toBeDefined();
    expect(latest!.version).toBe(2);
    expect(latest!.parameters.coats).toBe(3);
  });

  it('gets all version numbers', () => {
    const { registry, ruleId } = setupRegistry();
    const versions = getAllVersions(registry, ruleId);
    expect(versions).toEqual([1, 2]);
  });

  it('checks if rule has multiple versions', () => {
    const { registry, ruleId } = setupRegistry();
    expect(hasMultipleVersions(registry, ruleId)).toBe(true);

    const singleReg = registerInitialVersion(createVersionRegistry(), createRule({ ruleName: 'Single' }));
    expect(hasMultipleVersions(singleReg, singleReg.histories.keys().next().value)).toBe(false);
  });
});

describe('Estimate Reproducibility', () => {
  it('creates a rule version reference', () => {
    const rule = createRule({ ruleName: 'Test', version: 2, parameters: { coats: 3 } });
    const ref = createRuleVersionReference(rule);
    expect(ref.baseRuleId).toBe(rule.ruleId);
    expect(ref.version).toBe(2);
    expect(ref.snapshot.parameters.coats).toBe(3);
  });

  it('verifies matching version', () => {
    const rule = createRule({ ruleName: 'Test', version: 1 });
    const ref = createRuleVersionReference(rule);
    const result = verifyRuleVersion(ref, rule);
    expect(result.matches).toBe(true);
  });

  it('detects version mismatch', () => {
    const ruleV1 = createRule({ ruleName: 'Test', version: 1 });
    const ref = createRuleVersionReference(ruleV1);

    // Simulate rule updated to version 2
    const ruleV2 = { ...ruleV1, version: 2 };
    const result = verifyRuleVersion(ref, ruleV2);
    expect(result.matches).toBe(false);
    expect(result.referenceVersion).toBe(1);
    expect(result.currentVersion).toBe(2);
  });

  it('snapshot is independent of original rule', () => {
    const rule = createRule({ ruleName: 'Test', version: 1, parameters: { value: 5 } });
    const ref = createRuleVersionReference(rule);

    // Modify the original rule
    rule.parameters.value = 99;

    // The snapshot should still have the original value
    expect(ref.snapshot.parameters.value).toBe(5);
  });
});
