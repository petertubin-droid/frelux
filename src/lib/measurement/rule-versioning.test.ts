import { describe, it, expect } from "vitest";
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
} from "./rule-versioning";
import type { CalculationRule } from "./rule-registry";

function makeRule(id: string, version: number = 1): CalculationRule {
  return {
    ruleId: id,
    ruleName: `Rule ${id}`,
    category: "paint" as unknown as never,
    scope: "global" as unknown as never,
    formula: "area * rate",
    version,
    effectiveDate: new Date().toISOString(),
    status: "active",
    approvalStatus: "approved" as unknown as never,
    updatedAt: new Date().toISOString(),
  } as unknown as CalculationRule;
}

describe("measurement/rule-versioning", () => {
  it("createVersionRegistry starts empty", () => {
    const reg = createVersionRegistry();
    expect(reg.histories.size).toBe(0);
  });

  it("registerInitialVersion creates first version", () => {
    const reg = createVersionRegistry();
    const updated = registerInitialVersion(
      reg,
      makeRule("r1"),
      "admin",
      "Initial",
    );
    expect(updated.histories.size).toBe(1);
    const history = updated.histories.get("r1");
    expect(history?.versions.length).toBe(1);
    expect(history?.versions[0].version).toBe(1);
  });

  it("registerInitialVersion does not mutate original", () => {
    const reg = createVersionRegistry();
    registerInitialVersion(reg, makeRule("r1"));
    expect(reg.histories.size).toBe(0);
  });

  it("createNewVersion adds new version and deprecates old", () => {
    let reg = createVersionRegistry();
    reg = registerInitialVersion(reg, makeRule("r1", 1));
    reg = createNewVersion(
      reg,
      "r1",
      makeRule("r1", 2),
      "admin",
      "Updated rate",
    );
    const history = reg.histories.get("r1");
    expect(history?.versions.length).toBe(2);
    expect(history?.versions[0].rule.status).toBe("deprecated");
    expect(history?.versions[1].version).toBe(2);
  });

  it("createNewVersion auto-increments version", () => {
    let reg = createVersionRegistry();
    reg = registerInitialVersion(reg, makeRule("r1", 1));
    reg = createNewVersion(reg, "r1", makeRule("r1", 5), "admin");
    reg = createNewVersion(reg, "r1", makeRule("r1", 10), "admin");
    const history = reg.histories.get("r1");
    expect(history?.versions.length).toBe(3);
    expect(history?.versions[2].version).toBe(3);
  });

  it("createNewVersion registers as initial if not found", () => {
    const reg = createVersionRegistry();
    const updated = createNewVersion(reg, "r2", makeRule("r2"), "admin");
    expect(updated.histories.size).toBe(1);
  });

  it("getVersionHistory returns history", () => {
    let reg = createVersionRegistry();
    reg = registerInitialVersion(reg, makeRule("r1"));
    const history = getVersionHistory(reg, "r1");
    expect(history?.baseRuleId).toBe("r1");
  });

  it("getVersionHistory returns undefined for unknown", () => {
    const reg = createVersionRegistry();
    expect(getVersionHistory(reg, "unknown")).toBeUndefined();
  });

  it("getRuleVersion returns specific version", () => {
    let reg = createVersionRegistry();
    reg = registerInitialVersion(reg, makeRule("r1", 1));
    reg = createNewVersion(reg, "r1", makeRule("r1", 2));
    const v1 = getRuleVersion(reg, "r1", 1);
    expect(v1?.version).toBe(1);
  });

  it("getRuleVersion returns undefined for unknown version", () => {
    let reg = createVersionRegistry();
    reg = registerInitialVersion(reg, makeRule("r1"));
    expect(getRuleVersion(reg, "r1", 99)).toBeUndefined();
  });

  it("getLatestVersion returns the last version", () => {
    let reg = createVersionRegistry();
    reg = registerInitialVersion(reg, makeRule("r1", 1));
    reg = createNewVersion(reg, "r1", makeRule("r1", 2));
    reg = createNewVersion(reg, "r1", makeRule("r1", 3));
    const latest = getLatestVersion(reg, "r1");
    expect(latest?.version).toBe(3);
  });

  it("getLatestVersion returns undefined for unknown", () => {
    expect(
      getLatestVersion(createVersionRegistry(), "unknown"),
    ).toBeUndefined();
  });

  it("getAllVersions returns version numbers", () => {
    let reg = createVersionRegistry();
    reg = registerInitialVersion(reg, makeRule("r1", 1));
    reg = createNewVersion(reg, "r1", makeRule("r1", 2));
    expect(getAllVersions(reg, "r1")).toEqual([1, 2]);
  });

  it("getAllVersions returns empty for unknown", () => {
    expect(getAllVersions(createVersionRegistry(), "unknown")).toEqual([]);
  });

  it("hasMultipleVersions returns true when more than 1", () => {
    let reg = createVersionRegistry();
    reg = registerInitialVersion(reg, makeRule("r1"));
    reg = createNewVersion(reg, "r1", makeRule("r1", 2));
    expect(hasMultipleVersions(reg, "r1")).toBe(true);
  });

  it("hasMultipleVersions returns false for single version", () => {
    let reg = createVersionRegistry();
    reg = registerInitialVersion(reg, makeRule("r1"));
    expect(hasMultipleVersions(reg, "r1")).toBe(false);
  });

  it("createRuleVersionReference captures snapshot", () => {
    const rule = makeRule("r1", 5);
    const ref = createRuleVersionReference(rule);
    expect(ref.baseRuleId).toBe("r1");
    expect(ref.version).toBe(5);
    expect(ref.snapshot).toBeTruthy();
  });

  it("verifyRuleVersion matches when same version", () => {
    const rule = makeRule("r1", 1);
    const ref = createRuleVersionReference(rule);
    const result = verifyRuleVersion(ref, rule);
    expect(result.matches).toBe(true);
  });

  it("verifyRuleVersion detects version mismatch", () => {
    const rule = makeRule("r1", 1);
    const ref = createRuleVersionReference(rule);
    const updated = makeRule("r1", 2);
    const result = verifyRuleVersion(ref, updated);
    expect(result.matches).toBe(false);
    expect(result.referenceVersion).toBe(1);
    expect(result.currentVersion).toBe(2);
  });
});
