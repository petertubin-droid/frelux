import { describe, it, expect } from "vitest";
import { PRICING_PLANS, formatNaira, getPlanById } from "./pricing-plans";
import type { SubscriptionPlan } from "./subscription";

describe("pricing-plans", () => {
  it("PRICING_PLANS has 4 plans", () => {
    expect(PRICING_PLANS.length).toBe(4);
  });

  it("PRICING_PLANS includes free, pro, premium, enterprise", () => {
    const ids = PRICING_PLANS.map((p) => p.id);
    expect(ids).toContain("free");
    expect(ids).toContain("pro");
    expect(ids).toContain("premium");
    expect(ids).toContain("enterprise");
  });

  it("free plan has 0 price", () => {
    const free = getPlanById("free");
    expect(free?.monthlyPrice).toBe(0);
    expect(free?.yearlyPrice).toBe(0);
  });

  it("pro plan costs ₦5,000/month", () => {
    const pro = getPlanById("pro");
    expect(pro?.monthlyPrice).toBe(5000);
    expect(pro?.yearlyPrice).toBe(50000);
  });

  it("premium plan costs ₦15,000/month", () => {
    const premium = getPlanById("premium");
    expect(premium?.monthlyPrice).toBe(15000);
    expect(premium?.yearlyPrice).toBe(150000);
  });

  it("enterprise plan costs ₦50,000/month", () => {
    const enterprise = getPlanById("enterprise");
    expect(enterprise?.monthlyPrice).toBe(50000);
    expect(enterprise?.yearlyPrice).toBe(500000);
  });

  it("pro plan has highlight and badge", () => {
    const pro = getPlanById("pro");
    expect(pro?.highlight).toBe(true);
    expect(pro?.badge).toBeTruthy();
  });

  it("all plans have features array", () => {
    for (const plan of PRICING_PLANS) {
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  it("all plans have cta text", () => {
    for (const plan of PRICING_PLANS) {
      expect(plan.cta.length).toBeGreaterThan(0);
    }
  });

  it("formatNaira formats amounts with naira symbol", () => {
    const formatted = formatNaira(5000);
    expect(formatted).toContain("₦");
    expect(formatted).toContain("5,000");
  });

  it("formatNaira handles zero", () => {
    expect(formatNaira(0)).toContain("₦");
  });

  it("formatNaira handles large amounts", () => {
    const formatted = formatNaira(500000);
    expect(formatted).toContain("500,000");
  });

  it("getPlanById returns undefined for unknown plan", () => {
    expect(getPlanById("unknown" as SubscriptionPlan)).toBeUndefined();
  });
});
