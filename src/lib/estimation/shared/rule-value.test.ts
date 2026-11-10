import { describe, it, expect } from "vitest";
import { numericPayload, ruleNumber, ruleDecimals } from "./rule-value";

const rule = (value: unknown, active = true) => ({
  rule_key: "coverage_m2_per_litre",
  rule_value: { value },
  is_active: active,
});

describe("rule payload parsing", () => {
  it("reads real numbers and numeric strings", () => {
    expect(numericPayload(12.5)).toBe(12.5);
    expect(numericPayload("12.5")).toBe(12.5);
    expect(numericPayload(" 8 ")).toBe(8);
    expect(numericPayload(-3)).toBe(-3);
    expect(numericPayload(0)).toBe(0);
  });

  it("never invents a zero from an empty or non-numeric payload", () => {
    // Number() returns 0 for every one of these, which is how a blank admin
    // rule used to read as a confident zero.
    for (const blank of [null, undefined, "", "   ", false, true, [], {}, "n/a"]) {
      expect(numericPayload(blank)).toBeNull();
    }
    expect(numericPayload(Number.NaN)).toBeNull();
    expect(numericPayload(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("falls back rather than reporting a blank rule as zero", () => {
    const rules = [rule(null)];
    expect(ruleNumber(rules, "coverage_m2_per_litre", 10)).toBe(10);
    expect(ruleNumber(rules, "coverage_m2_per_litre")).toBeNull();
    expect(ruleNumber([rule("")], "coverage_m2_per_litre", 10)).toBe(10);
  });

  it("still honours an explicit zero a human actually saved", () => {
    expect(ruleNumber([rule(0)], "coverage_m2_per_litre", 10)).toBe(0);
    expect(ruleNumber([rule("0")], "coverage_m2_per_litre", 10)).toBe(0);
  });

  it("skips inactive rules and clamps display decimals", () => {
    expect(ruleNumber([rule(5, false)], "coverage_m2_per_litre", 7)).toBe(7);
    expect(ruleDecimals([{ rule_key: "rounding_decimals", rule_value: { value: 4 } }])).toBe(4);
    expect(ruleDecimals([{ rule_key: "rounding_decimals", rule_value: { value: null } }])).toBe(2);
    expect(ruleDecimals([{ rule_key: "rounding_decimals", rule_value: { value: 9 } }])).toBe(2);
  });
});
