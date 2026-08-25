/**
 * FRELUX RULE VERSIONING — Engine
 *
 * Versioned rule sets for reproducibility:
 *   - Every estimation references the exact rule versions used
 *   - Rule sets are immutable once published
 *   - New rule versions can be added without breaking old estimates
 *   - Reports include rule version references for full traceability
 *
 * Feature 14: Rule Versioning / Reproducibility
 */

// =========================================================
// Rule Version Types
// =========================================================

export interface RuleVersionReference {
  /** Rule set name (e.g. "roof_area_rules", "material_rules_ng") */
  ruleSet: string;
  /** Semantic version (e.g. "1.0.0") */
  version: string;
  /** Hash of the rule set content (for integrity verification) */
  contentHash: string;
  /** When this version was published (ISO 8601) */
  publishedAt: string;
}

export interface RuleSet {
  name: string;
  version: string;
  description: string;
  /** The actual rules as JSON */
  rules: Record<string, unknown>;
  /** Content hash computed from the rules */
  contentHash: string;
  publishedAt: string;
  /** Whether this is the current/active version */
  active: boolean;
}

export interface RuleSetHistory {
  name: string;
  versions: RuleSet[];
}

// =========================================================
// Content Hash
// =========================================================

/**
 * Compute a simple hash from a JSON string.
 * This is NOT cryptographic — it's for integrity verification
 * that two rule sets are identical.
 */
export function computeContentHash(rules: Record<string, unknown>): string {
  const json = JSON.stringify(rules, Object.keys(rules).sort());
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `h_${Math.abs(hash).toString(36)}`;
}

// =========================================================
// Rule Set Management
// =========================================================

export function createRuleSet(
  name: string,
  version: string,
  description: string,
  rules: Record<string, unknown>,
): RuleSet {
  return {
    name,
    version,
    description,
    rules: { ...rules },
    contentHash: computeContentHash(rules),
    publishedAt: new Date().toISOString(),
    active: true,
  };
}

/**
 * Publish a new version of an existing rule set.
 * The old version is deactivated.
 */
export function publishRuleSetVersion(
  history: RuleSetHistory,
  version: string,
  description: string,
  rules: Record<string, unknown>,
): RuleSetHistory {
  const newRuleSet = createRuleSet(history.name, version, description, rules);

  // Deactivate old versions
  const oldVersions = history.versions.map(v => ({ ...v, active: false }));

  return {
    name: history.name,
    versions: [...oldVersions, newRuleSet],
  };
}

/**
 * Get the active version of a rule set.
 */
export function getActiveRuleSet(history: RuleSetHistory): RuleSet | null {
  return history.versions.find(v => v.active) ?? null;
}

/**
 * Get a specific version of a rule set.
 */
export function getRuleSetVersion(
  history: RuleSetHistory,
  version: string,
): RuleSet | null {
  return history.versions.find(v => v.version === version) ?? null;
}

/**
 * Create a rule version reference from a rule set.
 */
export function toRuleVersionReference(ruleSet: RuleSet): RuleVersionReference {
  return {
    ruleSet: ruleSet.name,
    version: ruleSet.version,
    contentHash: ruleSet.contentHash,
    publishedAt: ruleSet.publishedAt,
  };
}

/**
 * Create a new empty rule set history.
 */
export function createRuleSetHistory(name: string): RuleSetHistory {
  return { name, versions: [] };
}

/**
 * Verify that a rule version reference matches a rule set.
 */
export function verifyRuleVersion(
  ref: RuleVersionReference,
  ruleSet: RuleSet,
): boolean {
  return (
    ref.ruleSet === ruleSet.name &&
    ref.version === ruleSet.version &&
    ref.contentHash === ruleSet.contentHash
  );
}
