import { describe, it, expect } from "vitest";
import {
  planHasFeature,
  getFeatureMinPlan,
  isSubscriptionActive,
  getDaysRemaining,
  getPlan,
  hasFeatureAccess,
  formatSubscriptionStatus,
  PAID_FEATURES,
  type SubscriptionState,
} from "@/lib/subscription";
import type { DbUserPaidStatus } from "@/types/database";

function makePaidStatus(
  overrides: Partial<DbUserPaidStatus> = {},
): DbUserPaidStatus {
  return {
    user_id: "test-user",
    is_paid: true,
    plan: "pro",
    paid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    payment_provider: "paystack",
    provider_customer_id: null,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeSubState(
  overrides: Partial<SubscriptionState> = {},
): SubscriptionState {
  return {
    paidStatus: null,
    isActive: false,
    plan: "free",
    paidUntil: null,
    daysRemaining: 0,
    loading: false,
    error: null,
    refresh: async () => {},
    ...overrides,
  };
}

describe("subscription — planHasFeature", () => {
  it("returns true when user plan meets the minimum tier", () => {
    expect(planHasFeature("pro", "painting_estimator")).toBe(true);
    expect(planHasFeature("premium", "painting_estimator")).toBe(true);
    expect(planHasFeature("enterprise", "painting_estimator")).toBe(true);
  });

  it("returns true for free features regardless of plan", () => {
    expect(planHasFeature("free", "ai_photo_estimator")).toBe(true);
    expect(planHasFeature("basic", "ai_photo_estimator")).toBe(true);
  });

  it("returns false when user plan is below the required tier", () => {
    expect(planHasFeature("free", "painting_estimator")).toBe(false);
    expect(planHasFeature("basic", "painting_estimator")).toBe(false);
    expect(planHasFeature("pro", "structural_calculator")).toBe(false);
  });

  it("handles all paid features with enterprise", () => {
    PAID_FEATURES.forEach((feature) => {
      expect(planHasFeature("enterprise", feature)).toBe(true);
    });
  });
});

describe("subscription — getFeatureMinPlan", () => {
  it("returns the correct minimum plan for each feature", () => {
    expect(getFeatureMinPlan("ai_photo_estimator")).toBe("free");
    expect(getFeatureMinPlan("painting_estimator")).toBe("pro");
    expect(getFeatureMinPlan("structural_calculator")).toBe("premium");
    expect(getFeatureMinPlan("template_download")).toBe("premium");
  });
});

describe("subscription — isSubscriptionActive", () => {
  it("returns false for null paid status", () => {
    expect(isSubscriptionActive(null)).toBe(false);
  });

  it("returns false when is_paid is false", () => {
    expect(isSubscriptionActive(makePaidStatus({ is_paid: false }))).toBe(
      false,
    );
  });

  it("returns true when paid and not expired", () => {
    const future = new Date(
      Date.now() + 10 * 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(isSubscriptionActive(makePaidStatus({ paid_until: future }))).toBe(
      true,
    );
  });

  it("returns false when paid_until has passed", () => {
    const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(isSubscriptionActive(makePaidStatus({ paid_until: past }))).toBe(
      false,
    );
  });

  it("returns true when paid with no expiry date", () => {
    expect(isSubscriptionActive(makePaidStatus({ paid_until: null }))).toBe(
      true,
    );
  });
});

describe("subscription — getDaysRemaining", () => {
  it("returns 0 for null paid status", () => {
    expect(getDaysRemaining(null)).toBe(0);
  });

  it("returns 0 for null paid_until", () => {
    expect(getDaysRemaining(makePaidStatus({ paid_until: null }))).toBe(0);
  });

  it("returns positive days when expiry is in the future", () => {
    const future = new Date(
      Date.now() + 15 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const days = getDaysRemaining(makePaidStatus({ paid_until: future }));
    expect(days).toBeGreaterThanOrEqual(14);
    expect(days).toBeLessThanOrEqual(15);
  });

  it("returns 0 when expiry has passed", () => {
    const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(getDaysRemaining(makePaidStatus({ paid_until: past }))).toBe(0);
  });

  it("never returns negative", () => {
    const past = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      getDaysRemaining(makePaidStatus({ paid_until: past })),
    ).toBeGreaterThanOrEqual(0);
  });
});

describe("subscription — getPlan", () => {
  it("returns free for null paid status", () => {
    expect(getPlan(null)).toBe("free");
  });

  it("returns free when not paid", () => {
    expect(getPlan(makePaidStatus({ is_paid: false }))).toBe("free");
  });

  it("normalizes plan names to canonical tiers", () => {
    expect(getPlan(makePaidStatus({ plan: "Basic" }))).toBe("basic");
    expect(getPlan(makePaidStatus({ plan: "Pro" }))).toBe("pro");
    expect(getPlan(makePaidStatus({ plan: "Premium" }))).toBe("premium");
    expect(getPlan(makePaidStatus({ plan: "Enterprise" }))).toBe("enterprise");
  });

  it("defaults to pro for unrecognized plan names when paid", () => {
    expect(getPlan(makePaidStatus({ plan: "custom_plan" }))).toBe("pro");
    expect(getPlan(makePaidStatus({ plan: "" }))).toBe("pro");
  });

  it("handles mixed case plan names", () => {
    expect(getPlan(makePaidStatus({ plan: "BASIC" }))).toBe("basic");
    expect(getPlan(makePaidStatus({ plan: "Pro Plan" }))).toBe("pro");
  });
});

describe("subscription — hasFeatureAccess", () => {
  it("allows admin access to all features", () => {
    const state = makeSubState({ isActive: false, plan: "free" });
    const result = hasFeatureAccess(state, "structural_calculator", true);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("admin");
  });

  it("allows free features without subscription", () => {
    const state = makeSubState({ isActive: false, plan: "free" });
    const result = hasFeatureAccess(state, "ai_photo_estimator", false);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("free_tier");
  });

  it("denies paid features when subscription is inactive", () => {
    const state = makeSubState({ isActive: false, plan: "free" });
    const result = hasFeatureAccess(state, "painting_estimator", false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("subscription_required");
    expect(result.minPlan).toBe("pro");
  });

  it("denies features when plan tier is too low", () => {
    const state = makeSubState({ isActive: true, plan: "pro" });
    const result = hasFeatureAccess(state, "structural_calculator", false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("plan_upgrade_required");
    expect(result.minPlan).toBe("premium");
  });

  it("allows features when plan tier is sufficient", () => {
    const state = makeSubState({ isActive: true, plan: "premium" });
    const result = hasFeatureAccess(state, "painting_estimator", false);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("subscription_active");
  });

  it("allows all features for enterprise with active subscription", () => {
    const state = makeSubState({ isActive: true, plan: "enterprise" });
    PAID_FEATURES.forEach((feature) => {
      const result = hasFeatureAccess(state, feature, false);
      expect(result.allowed).toBe(true);
    });
  });
});

describe("subscription — formatSubscriptionStatus", () => {
  it('returns "No subscription" when no paid status', () => {
    expect(formatSubscriptionStatus(makeSubState())).toBe("No subscription");
  });

  it('returns "Free plan" when not paid', () => {
    const state = makeSubState({
      paidStatus: makePaidStatus({ is_paid: false }),
    });
    expect(formatSubscriptionStatus(state)).toBe("Free plan");
  });

  it("returns active plan with days remaining", () => {
    const state = makeSubState({
      paidStatus: makePaidStatus({ plan: "pro" }),
      isActive: true,
      plan: "pro",
      daysRemaining: 15,
    });
    const result = formatSubscriptionStatus(state);
    expect(result).toContain("PRO");
    expect(result).toContain("15 days remaining");
  });

  it("handles single day remaining", () => {
    const state = makeSubState({
      paidStatus: makePaidStatus({ plan: "premium" }),
      isActive: true,
      plan: "premium",
      daysRemaining: 1,
    });
    expect(formatSubscriptionStatus(state)).toContain("1 day remaining");
    expect(formatSubscriptionStatus(state)).not.toContain("1 days remaining");
  });

  it("returns expired status when not active", () => {
    const state = makeSubState({
      paidStatus: makePaidStatus({
        plan: "pro",
        paid_until: new Date(Date.now() - 1000).toISOString(),
      }),
      isActive: false,
      plan: "pro",
    });
    expect(formatSubscriptionStatus(state)).toContain("Expired");
  });
});
