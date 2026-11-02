import { describe, it, expect } from "vitest";
import {
  PRICING_PLANS,
  SUBSCRIPTION_CURRENCY,
  formatUsdPrice,
  isPurchasablePlan,
  planPriceCents,
  yearlySavingPercent,
} from "@/lib/pricing-plans";

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

  it("prices every plan in USD", () => {
    expect(SUBSCRIPTION_CURRENCY).toBe("USD");
  });

  it("free plan has zero prices", () => {
    const free = PRICING_PLANS.find((p) => p.id === "free")!;
    expect(free.monthlyPrice).toBe(0);
    expect(free.yearlyPrice).toBe(0);
  });

  it("pro plan costs $4.99/month and $49.99/year", () => {
    const pro = PRICING_PLANS.find((p) => p.id === "pro")!;
    expect(pro.monthlyPrice).toBe(4.99);
    expect(pro.yearlyPrice).toBe(49.99);
  });

  it("premium plan costs $9.99/month and $99.99/year", () => {
    const premium = PRICING_PLANS.find((p) => p.id === "premium")!;
    expect(premium.monthlyPrice).toBe(9.99);
    expect(premium.yearlyPrice).toBe(99.99);
  });

  it("enterprise plan costs $49.99/month and $499.99/year", () => {
    const ent = PRICING_PLANS.find((p) => p.id === "enterprise")!;
    expect(ent.monthlyPrice).toBe(49.99);
    expect(ent.yearlyPrice).toBe(499.99);
  });

  it("converts prices to exact cents without float drift", () => {
    const pro = PRICING_PLANS.find((p) => p.id === "pro")!;
    const premium = PRICING_PLANS.find((p) => p.id === "premium")!;
    const ent = PRICING_PLANS.find((p) => p.id === "enterprise")!;
    expect(planPriceCents(pro, "monthly")).toBe(499);
    expect(planPriceCents(pro, "yearly")).toBe(4999);
    expect(planPriceCents(premium, "monthly")).toBe(999);
    expect(planPriceCents(premium, "yearly")).toBe(9999);
    expect(planPriceCents(ent, "monthly")).toBe(4999);
    expect(planPriceCents(ent, "yearly")).toBe(49999);
  });

  it("formats USD prices with the dollar sign", () => {
    expect(formatUsdPrice(4.99)).toBe("$4.99");
    expect(formatUsdPrice(9.99)).toBe("$9.99");
    expect(formatUsdPrice(499.99)).toBe("$499.99");
    expect(formatUsdPrice(0)).toBe("$0");
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

  it("premium plan is the highlighted Most Popular plan", () => {
    const premium = PRICING_PLANS.find((p) => p.id === "premium")!;
    expect(premium.highlight).toBe(true);
    expect(premium.badge).toBe("Most Popular");
  });

  it("highlights exactly one plan", () => {
    expect(PRICING_PLANS.filter((p) => p.highlight)).toHaveLength(1);
    expect(
      PRICING_PLANS.filter((p) => p.badge === "Most Popular"),
    ).toHaveLength(1);
  });

  it("pro plan is not highlighted", () => {
    const pro = PRICING_PLANS.find((p) => p.id === "pro")!;
    expect(pro.highlight).toBeFalsy();
    expect(pro.badge).toBeUndefined();
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

  it("annual plans save roughly two months", () => {
    PRICING_PLANS.filter((p) => p.monthlyPrice > 0).forEach((p) => {
      const saving = yearlySavingPercent(p);
      expect(saving).toBeGreaterThanOrEqual(15);
      expect(saving).toBeLessThanOrEqual(20);
    });
  });

  it("treats every paid plan as purchasable and Free as not", () => {
    expect(isPurchasablePlan("free")).toBe(false);
    expect(isPurchasablePlan("pro")).toBe(true);
    expect(isPurchasablePlan("premium")).toBe(true);
    expect(isPurchasablePlan("enterprise")).toBe(true);
  });
});
