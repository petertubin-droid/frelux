import { describe, it, expect } from "vitest";
import { PRICING_PLANS, formatNaira, getPlanById } from "./pricing-plans";

describe("PRICING_PLANS", () => {
  it("defines the four expected tiers in ascending price order", () => {
    expect(PRICING_PLANS.map((p) => p.id)).toEqual([
      "free",
      "pro",
      "premium",
      "enterprise",
    ]);
    for (let i = 1; i < PRICING_PLANS.length; i++) {
      expect(PRICING_PLANS[i].monthlyPrice).toBeGreaterThanOrEqual(
        PRICING_PLANS[i - 1].monthlyPrice,
      );
    }
  });

  it("gives every paid plan a yearly discount vs. 12x monthly", () => {
    for (const plan of PRICING_PLANS) {
      if (plan.monthlyPrice === 0) continue;
      expect(plan.yearlyPrice).toBeLessThan(plan.monthlyPrice * 12);
    }
  });

  it("gives every plan at least one feature and a CTA", () => {
    for (const plan of PRICING_PLANS) {
      expect(plan.features.length).toBeGreaterThan(0);
      expect(plan.cta).toBeTruthy();
      expect(plan.name).toBeTruthy();
    }
  });

  it("has unique plan ids", () => {
    const ids = PRICING_PLANS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("formatNaira", () => {
  it("formats a whole number amount as NGN currency with no decimals", () => {
    const formatted = formatNaira(5000);
    expect(formatted).toContain("5,000");
    expect(formatted).not.toMatch(/\.\d/);
  });

  it("formats zero correctly", () => {
    expect(formatNaira(0)).toContain("0");
  });

  it("formats large amounts with thousands separators", () => {
    expect(formatNaira(500000)).toContain("500,000");
  });
});

describe("getPlanById", () => {
  it("returns the matching plan for a valid id", () => {
    const plan = getPlanById("pro");
    expect(plan?.name).toBe("Pro");
  });

  it("returns undefined for an id with no matching plan", () => {
    expect(getPlanById("basic")).toBeUndefined();
  });
});
