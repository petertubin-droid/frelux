import { describe, it, expect } from "vitest";
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
} from "@/lib/measurement/rule-registry";

describe("rule-registry — createRuleRegistry", () => {
  it("creates an empty registry", () => {
    const registry = createRuleRegistry();
    expect(registry.rules).toEqual([]);
    expect(registry.rules.length).toBe(0);
  });
});

describe("rule-registry — createRule", () => {
  it("creates a rule with defaults", () => {
    const rule = createRule();
    expect(rule.ruleId).toBeTruthy();
    expect(rule.ruleName).toBe("New Rule");
    expect(rule.category).toBe("geometry");
    expect(rule.scope).toBe("global");
  });

  it("creates a rule with overrides", () => {
    const rule = createRule({
      ruleId: "test-1",
      ruleName: "My Rule",
      category: "painting",
      scope: "country",
      countryCode: "NG",
    });
    expect(rule.ruleId).toBe("test-1");
    expect(rule.ruleName).toBe("My Rule");
    expect(rule.category).toBe("painting");
    expect(rule.scope).toBe("country");
    expect(rule.countryCode).toBe("NG");
  });

  it("generates unique IDs", () => {
    const r1 = createRule();
    const r2 = createRule();
    expect(r1.ruleId).not.toBe(r2.ruleId);
  });
});

describe("rule-registry — registerRule", () => {
  it("adds a rule to the registry", () => {
    const registry = createRuleRegistry();
    const rule = createRule({ ruleId: "r1" });
    const updated = registerRule(registry, rule);
    expect(updated.rules.length).toBe(1);
    expect(updated.rules[0].ruleId).toBe("r1");
  });

  it("does not mutate original registry", () => {
    const registry = createRuleRegistry();
    const rule = createRule({ ruleId: "r1" });
    registerRule(registry, rule);
    expect(registry.rules.length).toBe(0);
  });
});

describe("rule-registry — registerRules", () => {
  it("adds multiple rules at once", () => {
    const registry = createRuleRegistry();
    const rules = [createRule({ ruleId: "r1" }), createRule({ ruleId: "r2" })];
    const updated = registerRules(registry, rules);
    expect(updated.rules.length).toBe(2);
  });
});

describe("rule-registry — findRules", () => {
  it("returns all rules when no query filter", () => {
    const rules = [createRule({ ruleId: "r1" }), createRule({ ruleId: "r2" })];
    const registry = registerRules(createRuleRegistry(), rules);
    const found = findRules(registry, {});
    expect(found.length).toBe(2);
  });

  it("filters by category", () => {
    const rules = [
      createRule({ ruleId: "r1", category: "geometry" }),
      createRule({ ruleId: "r2", category: "painting" }),
    ];
    const registry = registerRules(createRuleRegistry(), rules);
    const found = findRules(registry, { category: "painting" });
    expect(found.length).toBe(1);
    expect(found[0].ruleId).toBe("r2");
  });

  it("filters by scope", () => {
    const rules = [
      createRule({ ruleId: "r1", scope: "global" }),
      createRule({ ruleId: "r2", scope: "country", countryCode: "NG" }),
    ];
    const registry = registerRules(createRuleRegistry(), rules);
    const found = findRules(registry, { scope: "country" });
    expect(found.length).toBe(1);
    expect(found[0].ruleId).toBe("r2");
  });

  it("filters by countryCode", () => {
    const rules = [
      createRule({ ruleId: "r1", scope: "country", countryCode: "NG" }),
      createRule({ ruleId: "r2", scope: "country", countryCode: "US" }),
    ];
    const registry = registerRules(createRuleRegistry(), rules);
    const found = findRules(registry, { countryCode: "NG" });
    expect(found.length).toBe(1);
    expect(found[0].ruleId).toBe("r1");
  });

  it("sorts by scope specificity (global first)", () => {
    const rules = [
      createRule({ ruleId: "user-rule", scope: "user" }),
      createRule({ ruleId: "global-rule", scope: "global" }),
      createRule({ ruleId: "country-rule", scope: "country" }),
    ];
    const registry = registerRules(createRuleRegistry(), rules);
    const found = findRules(registry, {});
    expect(found[0].ruleId).toBe("global-rule");
    expect(found[1].ruleId).toBe("country-rule");
    expect(found[2].ruleId).toBe("user-rule");
  });
});

describe("rule-registry — findApplicableRule", () => {
  it("returns most specific active+approved rule", () => {
    const rules = [
      createRule({
        ruleId: "r1",
        scope: "global",
        status: "active",
        approvalStatus: "approved",
      }),
      createRule({
        ruleId: "r2",
        scope: "country",
        countryCode: "NG",
        status: "active",
        approvalStatus: "approved",
      }),
    ];
    const registry = registerRules(createRuleRegistry(), rules);
    const found = findApplicableRule(registry, { countryCode: "NG" });
    expect(found?.ruleId).toBe("r2");
  });

  it("returns undefined for empty registry", () => {
    const registry = createRuleRegistry();
    const found = findApplicableRule(registry, {});
    expect(found).toBeUndefined();
  });

  it("filters out non-active rules", () => {
    const rules = [
      createRule({
        ruleId: "r1",
        scope: "global",
        status: "deprecated",
        approvalStatus: "approved",
      }),
    ];
    const registry = registerRules(createRuleRegistry(), rules);
    const found = findApplicableRule(registry, {});
    expect(found).toBeUndefined();
  });
});

describe("rule-registry — findApplicableRules", () => {
  it("returns all active+approved rules in specificity order", () => {
    const rules = [
      createRule({
        ruleId: "r1",
        scope: "global",
        status: "active",
        approvalStatus: "approved",
      }),
      createRule({
        ruleId: "r2",
        scope: "country",
        countryCode: "NG",
        status: "active",
        approvalStatus: "approved",
      }),
    ];
    const registry = registerRules(createRuleRegistry(), rules);
    const found = findApplicableRules(registry, {});
    expect(found.length).toBe(2);
    expect(found[0].ruleId).toBe("r1");
    expect(found[1].ruleId).toBe("r2");
  });
});

describe("rule-registry — getRuleById", () => {
  it("finds a rule by ID", () => {
    const rules = [createRule({ ruleId: "r1" }), createRule({ ruleId: "r2" })];
    const registry = registerRules(createRuleRegistry(), rules);
    const found = getRuleById(registry, "r1");
    expect(found?.ruleId).toBe("r1");
  });

  it("returns undefined for non-existent ID", () => {
    const registry = createRuleRegistry();
    expect(getRuleById(registry, "nonexistent")).toBeUndefined();
  });
});

describe("rule-registry — getRuleParameter", () => {
  it("returns parameter value when present", () => {
    const rule = createRule({ parameters: { wasteFactor: 15 } });
    expect(getRuleParameter(rule, "wasteFactor")).toBe(15);
  });

  it("returns default when parameter absent", () => {
    const rule = createRule({ parameters: {} });
    expect(getRuleParameter(rule, "wasteFactor", 10)).toBe(10);
  });

  it("returns 0 when parameter absent and no default", () => {
    const rule = createRule({ parameters: {} });
    expect(getRuleParameter(rule, "wasteFactor")).toBe(0);
  });
});

describe("rule-registry — built-in rules", () => {
  it("createGlobalGeometryRules returns non-empty array", () => {
    const rules = createGlobalGeometryRules();
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThan(0);
  });

  it("createNigeriaPaintingRules returns non-empty array", () => {
    const rules = createNigeriaPaintingRules();
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.scope).toBe("country");
      expect(r.countryCode).toBe("NG");
    }
  });

  it("createNigeriaScreedingRules returns non-empty array", () => {
    const rules = createNigeriaScreedingRules();
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThan(0);
  });

  it("all built-in rules have unique IDs", () => {
    const allRules = [
      ...createGlobalGeometryRules(),
      ...createNigeriaPaintingRules(),
      ...createNigeriaScreedingRules(),
    ];
    const ids = allRules.map((r) => r.ruleId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
