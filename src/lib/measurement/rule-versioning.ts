/**
 * FRELUX RULE VERSIONING
 *
 * Feature 7 of 16: Rule Versioning
 *
 * Calculation rules must be versionable.
 * The system retains history to understand which rule produced a saved estimate.
 * Existing calculations remain reproducible.
 *
 * A rule version history tracks all versions of a rule.
 * When a rule is updated, a new version is created — the old version
 * is deprecated but NOT deleted.
 *
 * Saved estimates reference the specific rule version that produced them,
 * ensuring reproducibility.
 */

import type { CalculationRule } from './rule-registry';
import type { RuleStatus, RuleApprovalStatus } from './rule-registry';
import { generateId } from './factory';

// =========================================================
// RULE VERSION HISTORY
// =========================================================

/**
 * A version history entry for a single rule.
 * Tracks all versions of a rule by its base rule ID.
 */
export interface RuleVersionEntry {
  /** The version number */
  version: number;
  /** The full rule definition at this version */
  rule: CalculationRule;
  /** When this version was created */
  versionedAt: string;
  /** Who or what created this version */
  versionedBy: string;
  /** Reason for the new version */
  changeReason?: string;
}

/**
 * Version history for a single rule (identified by base rule ID).
 */
export interface RuleVersionHistory {
  /** Base rule ID (stable across all versions) */
  baseRuleId: string;
  /** Rule name (for display) */
  ruleName: string;
  /** All versions, ordered from oldest to newest */
  versions: RuleVersionEntry[];
}

// =========================================================
// VERSION REGISTRY
// =========================================================

/**
 * The version registry holds version histories for all rules.
 */
export interface RuleVersionRegistry {
  /** Map of baseRuleId → version history */
  histories: Map<string, RuleVersionHistory>;
}

/**
 * Create an empty version registry.
 */
export function createVersionRegistry(): RuleVersionRegistry {
  return { histories: new Map() };
}

// =========================================================
// VERSIONING OPERATIONS
// =========================================================

/**
 * Register the initial version of a rule (version 1).
 */
export function registerInitialVersion(
  registry: RuleVersionRegistry,
  rule: CalculationRule,
  versionedBy: string = 'system',
  changeReason?: string,
): RuleVersionRegistry {
  const histories = new Map(registry.histories);
  histories.set(rule.ruleId, {
    baseRuleId: rule.ruleId,
    ruleName: rule.ruleName,
    versions: [{
      version: rule.version,
      rule,
      versionedAt: new Date().toISOString(),
      versionedBy,
      changeReason,
    }],
  });
  return { histories };
}

/**
 * Create a new version of an existing rule.
 * The old version is NOT deleted — it's retained for reproducibility.
 *
 * @param registry - The version registry
 * @param baseRuleId - The stable rule ID
 * @param updatedRule - The new rule definition (version will be auto-incremented)
 * @param versionedBy - Who created this version
 * @param changeReason - Why the rule was updated
 * @returns Updated registry
 */
export function createNewVersion(
  registry: RuleVersionRegistry,
  baseRuleId: string,
  updatedRule: CalculationRule,
  versionedBy: string = 'system',
  changeReason?: string,
): RuleVersionRegistry {
  const history = registry.histories.get(baseRuleId);
  if (!history) {
    // No existing history — register as initial version
    return registerInitialVersion(registry, updatedRule, versionedBy, changeReason);
  }

  const newVersion = history.versions.length + 1;
  const versionedRule: CalculationRule = {
    ...updatedRule,
    ruleId: baseRuleId,
    version: newVersion,
    updatedAt: new Date().toISOString(),
  };

  // Deprecate the previous version (but keep it in history)
  const previousVersion = history.versions[history.versions.length - 1];
  const deprecatedPrevious: CalculationRule = {
    ...previousVersion.rule,
    status: 'deprecated' as RuleStatus,
  };

  const histories = new Map(registry.histories);
  histories.set(baseRuleId, {
    baseRuleId,
    ruleName: updatedRule.ruleName,
    versions: [
      ...history.versions.slice(0, -1),
      { ...previousVersion, rule: deprecatedPrevious },
      {
        version: newVersion,
        rule: versionedRule,
        versionedAt: new Date().toISOString(),
        versionedBy,
        changeReason,
      },
    ],
  });
  return { histories };
}

// =========================================================
// VERSION LOOKUP
// =========================================================

/**
 * Get the version history for a rule.
 */
export function getVersionHistory(
  registry: RuleVersionRegistry,
  baseRuleId: string,
): RuleVersionHistory | undefined {
  return registry.histories.get(baseRuleId);
}

/**
 * Get a specific version of a rule.
 */
export function getRuleVersion(
  registry: RuleVersionRegistry,
  baseRuleId: string,
  version: number,
): CalculationRule | undefined {
  const history = registry.histories.get(baseRuleId);
  if (!history) return undefined;
  const entry = history.versions.find((v) => v.version === version);
  return entry?.rule;
}

/**
 * Get the latest (current) version of a rule.
 */
export function getLatestVersion(
  registry: RuleVersionRegistry,
  baseRuleId: string,
): CalculationRule | undefined {
  const history = registry.histories.get(baseRuleId);
  if (!history || history.versions.length === 0) return undefined;
  return history.versions[history.versions.length - 1].rule;
}

/**
 * Get all version numbers for a rule.
 */
export function getAllVersions(
  registry: RuleVersionRegistry,
  baseRuleId: string,
): number[] {
  const history = registry.histories.get(baseRuleId);
  if (!history) return [];
  return history.versions.map((v) => v.version);
}

/**
 * Check if a rule has multiple versions.
 */
export function hasMultipleVersions(
  registry: RuleVersionRegistry,
  baseRuleId: string,
): boolean {
  const history = registry.histories.get(baseRuleId);
  return (history?.versions.length ?? 0) > 1;
}

// =========================================================
// ESTIMATE REPRODUCIBILITY
// =========================================================

/**
 * A reference to a specific rule version used in a saved estimate.
 * This allows estimates to be reproduced exactly, even if the rule
 * has been updated since the estimate was created.
 */
export interface RuleVersionReference {
  baseRuleId: string;
  version: number;
  /** Snapshot of the rule at the time of the estimate (for guaranteed reproducibility) */
  snapshot: CalculationRule;
}

/**
 * Create a rule version reference for a saved estimate.
 * This captures the exact rule used, so the estimate can be reproduced
 * even if the rule is later updated.
 */
export function createRuleVersionReference(
  rule: CalculationRule,
): RuleVersionReference {
  return {
    baseRuleId: rule.ruleId,
    version: rule.version,
    snapshot: JSON.parse(JSON.stringify(rule)),
  };
}

/**
 * Verify that a rule version reference matches the current rule version.
 * If the versions don't match, the estimate used an older rule version.
 */
export function verifyRuleVersion(
  reference: RuleVersionReference,
  currentRule: CalculationRule,
): { matches: boolean; referenceVersion: number; currentVersion: number } {
  return {
    matches: reference.version === currentRule.version && reference.baseRuleId === currentRule.ruleId,
    referenceVersion: reference.version,
    currentVersion: currentRule.version,
  };
}
