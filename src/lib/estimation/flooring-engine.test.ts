import { describe, expect, it } from "vitest";
import { parseFlooringRules } from "./flooring-engine";

describe("market-scoped calc rules", () => {
  const rows = [
    {
      rule_key: "adhesive_coverage_m2_per_bag",
      rule_value: { value: 5 },
      is_active: true,
    },
    {
      rule_key: "adhesive_coverage_m2_per_bag",
      rule_value: { value: 6.25 },
      is_active: true,
      market: "DE",
    },
  ];

  it("uses the market row over the global default", () => {
    expect(
      parseFlooringRules(rows as never, "DE").adhesive_coverage_m2_per_bag,
    ).toBe(6.25);
    expect(
      parseFlooringRules(rows as never, "de").adhesive_coverage_m2_per_bag,
    ).toBe(6.25);
  });

  it("falls back to the global default in a market with no override", () => {
    expect(
      parseFlooringRules(rows as never, "NG").adhesive_coverage_m2_per_bag,
    ).toBe(5);
    expect(parseFlooringRules(rows as never).adhesive_coverage_m2_per_bag).toBe(
      5,
    );
  });

  it("sizes 25 kg bags with the 25 kg coverage", () => {
    const rules = parseFlooringRules(rows as never, "DE");
    expect(100 / (rules.adhesive_coverage_m2_per_bag as number)).toBeCloseTo(
      16,
      5,
    );
    expect(100 / 5).toBe(20);
  });
});
