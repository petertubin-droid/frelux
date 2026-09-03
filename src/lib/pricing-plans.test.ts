import { describe, it, expect } from "vitest";
import { PRICING_PLANS } from "@/lib/pricing-plans";

describe("pricing-plans", () => {
  it("exports exactly 4 plans", () => {
    expect(PRICING_PLANS).toHaveLength(4);
  });

  it("plans are ordered free > pro > premium > enterprise", () => {
    expect(PRICING_PLANS.map((p) => p.id)).toEqual([
      "free",
      "pro",
      "premium",
      "enterprise",
    ]);
  });

  it("free plan has zero prices", () => {
    const free = PRICING_PLANS.find((p) => p.id === "free")!;
    expect(free.monthlyPrice).toBe(0);
    expect(free.yearlyPrice).toBe(0);
  });

  it("pro plan costs 5000 NGN/month", () => {
    const pro = PRICING_PLANS.find((p) => p.id === "pro")!;
    expect(pro.monthlyPrice).toBe(5000);
    expect(pro.yearlyPrice).toBe(50000);
  });

  it("premium plan costs 15000 NGN/month", () => {
    const premium = PRICING_PLANS.find((p) => p.id === "premium")!;
    expect(premium.monthlyPrice).toBe(15000);
    expect(premium.yearlyPrice).toBe(150000);
  });

  it("enterprise plan costs 50000 NGN/month", () => {
    const ent = PRICING_PLANS.find((p) => p.id === "enterprise")!;
    expect(ent.monthlyPrice).toBe(50000);
    expect(ent.yearlyPrice).toBe(500000);
  });

  it("every plan has a unique id", () => {
    const ids = PRICING_PLANS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every plan has a name and tagline", () => {
    PRICING_PLANS.forEach((p) => {
      expect(p.name).toBeTruthy();
      expect(p.tagline).toBeTruthy();
    });
  });

  it("every plan has at least 3 features", () => {
    PRICING_PLANS.forEach((p) => {
      expect(p.features.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("every plan has a CTA", () => {
    PRICING_PLANS.forEach((p) => {
      expect(p.cta).toBeTruthy();
    });
  });

  it("pro plan is highlighted as Most Popular", () => {
    const pro = PRICING_PLANS.find((p) => p.id === "pro")!;
    expect(pro.highlight).toBe(true);
    expect(pro.badge).toBe("Most Popular");
  });

  it("premium plan has Best Value badge", () => {
    const premium = PRICING_PLANS.find((p) => p.id === "premium")!;
    expect(premium.badge).toBe("Best Value");
  });

  it("free plan has no badge", () => {
    const free = PRICING_PLANS.find((p) => p.id === "free")!;
    expect(free.badge).toBeUndefined();
  });

  it("higher tiers include lower tier features", () => {
    const pro = PRICING_PLANS.find((p) => p.id === "pro")!;
    expect(pro.features).toContain("Everything in Free");
    const premium = PRICING_PLANS.find((p) => p.id === "premium")!;
    expect(premium.features).toContain("Everything in Pro");
  });

  it("yearly is cheaper than 12x monthly for paid plans", () => {
    PRICING_PLANS.filter((p) => p.monthlyPrice > 0).forEach((p) => {
      expect(p.yearlyPrice).toBeLessThan(p.monthlyPrice * 12);
    });
  });
});
