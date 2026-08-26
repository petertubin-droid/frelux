import { describe, it, expect } from "vitest";
import { getRuleValue, getRuleString, getRuleArray } from "./use-calc-defaults";
import type { EstimationCalcRule } from "@/types/estimation";

function makeRule(value: unknown): EstimationCalcRule | undefined {
  return { rule_value: { value } } as any;
}

describe("use-calc-defaults", () => {
  it("getRuleValue returns numeric value", () => {
    expect(getRuleValue(makeRule(15), 10)).toBe(15);
  });

  it("getRuleValue returns fallback for undefined rule", () => {
    expect(getRuleValue(undefined, 10)).toBe(10);
  });

  it("getRuleValue returns fallback for non-numeric value", () => {
    expect(getRuleValue(makeRule("text"), 10)).toBe(10);
  });

  it("getRuleString returns string value", () => {
    expect(getRuleString(makeRule("meters"), "feet")).toBe("meters");
  });

  it("getRuleString returns fallback for undefined rule", () => {
    expect(getRuleString(undefined, "feet")).toBe("feet");
  });

  it("getRuleArray returns array value", () => {
    expect(getRuleArray(makeRule([1, 2, 3]), [])).toEqual([1, 2, 3]);
  });

  it("getRuleArray returns fallback for undefined rule", () => {
    expect(getRuleArray(undefined, [5])).toEqual([5]);
  });

  it("getRuleArray returns fallback for non-array value", () => {
    expect(getRuleArray(makeRule("text"), [5])).toEqual([5]);
  });
});
