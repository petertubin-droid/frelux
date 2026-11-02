import { describe, it, expect } from "vitest";
import {
  planHasFeature,
  getFeatureMinPlan,
  isSubscriptionActive,
  getDaysRemaining,
  getPlan,
  hasFeatureAccess,
  formatSubscriptionStatus,
  type SubscriptionState,
} from "./subscription";
import type { DbUserPaidStatus } from "@/types/database";

function paidStatus(
  overrides: Partial<DbUserPaidStatus> = {},
): DbUserPaidStatus {
  return {
    user_id: "u1",
    is_paid: true,
    plan: "pro",
    paid_until: null,
    payment_provider: "paystack",
    provider_customer_id: null,
    updated_at: new Date().toISOString(),
    ...overrides,
  } as DbUserPaidStatus;
}

describe("planHasFeature / getFeatureMinPlan", () => {
  it("allows a plan to access features at or below its tier", () => {
    expect(planHasFeature("premium", "ai_color_consult")).toBe(true);
    expect(planHasFeature("pro", "painting_estimator")).toBe(true);
  });

  it("denies a plan access to features above its tier", () => {
    expect(planHasFeature("pro", "structural_calculator")).toBe(false);
    expect(planHasFeature("free", "painting_estimator")).toBe(false);
  });

  it("reports the correct minimum plan for a feature", () => {
    expect(getFeatureMinPlan("structural_calculator")).toBe("premium");
    expect(getFeatureMinPlan("ai_photo_estimator")).toBe("free");
  });
});

describe("isSubscriptionActive", () => {
  it("is false for a null status", () => {
    expect(isSubscriptionActive(null)).toBe(false);
  });

  it("is false when is_paid is false", () => {
    expect(isSubscriptionActive(paidStatus({ is_paid: false }))).toBe(false);
  });

  it("is true when paid with no expiry", () => {
    expect(isSubscriptionActive(paidStatus({ paid_until: null }))).toBe(true);
  });

  it("is true when paid_until is in the future", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(isSubscriptionActive(paidStatus({ paid_until: future }))).toBe(true);
  });

  it("is false when paid_until is in the past", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(isSubscriptionActive(paidStatus({ paid_until: past }))).toBe(false);
  });
});

describe("getDaysRemaining", () => {
  it("returns 0 when there is no paid_until", () => {
    expect(getDaysRemaining(paidStatus({ paid_until: null }))).toBe(0);
  });

  it("returns 0 for a null status", () => {
    expect(getDaysRemaining(null)).toBe(0);
  });

  it("returns roughly the correct number of days for a future expiry", () => {
    const future = new Date(Date.now() + 5 * 86400000).toISOString();
    expect(
      getDaysRemaining(paidStatus({ paid_until: future })),
    ).toBeGreaterThanOrEqual(4);
  });

  it("never returns a negative number for an expired subscription", () => {
    const past = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(getDaysRemaining(paidStatus({ paid_until: past }))).toBe(0);
  });
});

describe("getPlan", () => {
  it("returns free for a null or unpaid status", () => {
    expect(getPlan(null)).toBe("free");
    expect(getPlan(paidStatus({ is_paid: false }))).toBe("free");
  });

  it("normalizes plan names containing known tiers", () => {
    expect(getPlan(paidStatus({ plan: "ENTERPRISE-YEARLY" }))).toBe(
      "enterprise",
    );
    expect(getPlan(paidStatus({ plan: "premium_monthly" }))).toBe("premium");
    expect(getPlan(paidStatus({ plan: "starter" }))).toBe("basic");
  });

  it("defaults to pro for an unrecognized but paid plan name", () => {
    expect(getPlan(paidStatus({ plan: "mystery-plan" }))).toBe("pro");
  });
});

describe("hasFeatureAccess", () => {
  const inactiveSub: SubscriptionState = {
    paidStatus: null,
    isActive: false,
    plan: "free",
    paidUntil: null,
    daysRemaining: 0,
    loading: false,
    error: null,
    refresh: async () => {},
  };

  it("always allows admins", () => {
    expect(
      hasFeatureAccess(inactiveSub, "structural_calculator", true).allowed,
    ).toBe(true);
  });

  it("allows free-tier features without an active subscription", () => {
    expect(hasFeatureAccess(inactiveSub, "ai_photo_estimator").allowed).toBe(
      true,
    );
  });

  it("denies paid features when subscription is inactive", () => {
    const result = hasFeatureAccess(inactiveSub, "painting_estimator");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("subscription_required");
  });

  it("denies paid features when the active plan is below the required tier", () => {
    const proSub: SubscriptionState = {
      ...inactiveSub,
      isActive: true,
      plan: "pro",
    };
    const result = hasFeatureAccess(proSub, "structural_calculator");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("plan_upgrade_required");
  });

  it("allows paid features when the plan meets the required tier", () => {
    const premiumSub: SubscriptionState = {
      ...inactiveSub,
      isActive: true,
      plan: "premium",
    };
    const result = hasFeatureAccess(premiumSub, "structural_calculator");
    expect(result.allowed).toBe(true);
  });
});

describe("formatSubscriptionStatus", () => {
  const base: SubscriptionState = {
    paidStatus: null,
    isActive: false,
    plan: "free",
    paidUntil: null,
    daysRemaining: 0,
    loading: false,
    error: null,
    refresh: async () => {},
  };

  it("reports no subscription when paidStatus is null", () => {
    expect(formatSubscriptionStatus(base)).toBe("No subscription");
  });

  it("reports free plan when not paid", () => {
    const sub = { ...base, paidStatus: paidStatus({ is_paid: false }) };
    expect(formatSubscriptionStatus(sub)).toBe("Free plan");
  });

  it("reports active plan with days remaining", () => {
    const sub: SubscriptionState = {
      ...base,
      paidStatus: paidStatus(),
      isActive: true,
      plan: "pro",
      daysRemaining: 10,
    };
    expect(formatSubscriptionStatus(sub)).toBe("PRO · 10 days remaining");
  });

  it('uses singular "day" for exactly one day remaining', () => {
    const sub: SubscriptionState = {
      ...base,
      paidStatus: paidStatus(),
      isActive: true,
      plan: "pro",
      daysRemaining: 1,
    };
    expect(formatSubscriptionStatus(sub)).toBe("PRO · 1 day remaining");
  });

  it("reports expired when inactive but was paid", () => {
    const sub: SubscriptionState = {
      ...base,
      paidStatus: paidStatus(),
      isActive: false,
      plan: "pro",
      daysRemaining: 0,
    };
    expect(formatSubscriptionStatus(sub)).toBe("PRO · Expired");
  });
});
