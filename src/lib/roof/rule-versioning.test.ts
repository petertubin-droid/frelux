import { describe, it, expect } from "vitest";
import {
  computeContentHash,
  createRuleSet,
  publishRuleSetVersion,
  getActiveRuleSet,
  getRuleSetVersion,
  toRuleVersionReference,
  createRuleSetHistory,
  verifyRuleVersion,
} from "./rule-versioning";

describe("roof/rule-versioning", () => {
  it("computeContentHash returns consistent hash for same input", () => {
    const rules = { a: 1, b: 2 };
    expect(computeContentHash(rules)).toBe(computeContentHash({ b: 2, a: 1 }));
  });

  it("computeContentHash returns different hash for different input", () => {
    expect(computeContentHash({ a: 1 })).not.toBe(computeContentHash({ a: 2 }));
  });

  it("computeContentHash returns string starting with h_", () => {
    const hash = computeContentHash({ a: 1 });
    expect(hash.startsWith("h_")).toBe(true);
  });

  it("createRuleSet creates a rule set with content hash", () => {
    const rs = createRuleSet("test_rules", "1.0.0", "Test", { a: 1 });
    expect(rs.name).toBe("test_rules");
    expect(rs.version).toBe("1.0.0");
    expect(rs.active).toBe(true);
    expect(rs.contentHash).toBeTruthy();
    expect(rs.rules).toEqual({ a: 1 });
  });

  it("createRuleSetHistory creates empty history", () => {
    const h = createRuleSetHistory("my_rules");
    expect(h.name).toBe("my_rules");
    expect(h.versions).toEqual([]);
  });

  it("publishRuleSetVersion adds new version and deactivates old", () => {
    const h = createRuleSetHistory("rules");
    const h1 = publishRuleSetVersion(h, "1.0.0", "V1", { a: 1 });
    const h2 = publishRuleSetVersion(h1, "2.0.0", "V2", { a: 2 });
    expect(h2.versions.length).toBe(2);
    expect(h2.versions[0].active).toBe(false);
    expect(h2.versions[1].active).toBe(true);
  });

  it("getActiveRuleSet returns the active version", () => {
    const h = createRuleSetHistory("rules");
    const h1 = publishRuleSetVersion(h, "1.0.0", "V1", { a: 1 });
    const h2 = publishRuleSetVersion(h1, "2.0.0", "V2", { a: 2 });
    const active = getActiveRuleSet(h2);
    expect(active?.version).toBe("2.0.0");
  });

  it("getActiveRuleSet returns null for empty history", () => {
    const h = createRuleSetHistory("rules");
    expect(getActiveRuleSet(h)).toBeNull();
  });

  it("getRuleSetVersion finds specific version", () => {
    const h = createRuleSetHistory("rules");
    const h1 = publishRuleSetVersion(h, "1.0.0", "V1", { a: 1 });
    const h2 = publishRuleSetVersion(h1, "2.0.0", "V2", { a: 2 });
    const v1 = getRuleSetVersion(h2, "1.0.0");
    expect(v1?.version).toBe("1.0.0");
  });

  it("getRuleSetVersion returns null for unknown version", () => {
    const h = createRuleSetHistory("rules");
    expect(getRuleSetVersion(h, "99.0.0")).toBeNull();
  });

  it("toRuleVersionReference creates reference from rule set", () => {
    const rs = createRuleSet("rules", "1.0.0", "Desc", { a: 1 });
    const ref = toRuleVersionReference(rs);
    expect(ref.ruleSet).toBe("rules");
    expect(ref.version).toBe("1.0.0");
    expect(ref.contentHash).toBe(rs.contentHash);
  });

  it("verifyRuleVersion returns true for matching ref and rule set", () => {
    const rs = createRuleSet("rules", "1.0.0", "Desc", { a: 1 });
    const ref = toRuleVersionReference(rs);
    expect(verifyRuleVersion(ref, rs)).toBe(true);
  });

  it("verifyRuleVersion returns false for mismatch", () => {
    const rs = createRuleSet("rules", "1.0.0", "Desc", { a: 1 });
    const ref = toRuleVersionReference(rs);
    const rs2 = createRuleSet("rules", "1.0.0", "Desc", { a: 2 });
    expect(verifyRuleVersion(ref, rs2)).toBe(false);
  });
});
