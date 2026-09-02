import { describe, it, expect } from "vitest";
import {
  PAID_FEATURES,
  FEATURE_LABELS,
  planHasFeature,
  getFeatureMinPlan,
  isSubscriptionActive,
  getDaysRemaining,
  getPlan,
  hasFeatureAccess,
  formatSubscriptionStatus,
  type SubscriptionState,
} from "@/lib/subscription";

describe("subscription constants", () => {
  it("PAID_FEATURES is non-empty", () => {
    expect(PAID_FEATURES.length).toBeGreaterThan(0);
  });

  it("every paid feature has a label", () => {
    PAID_FEATURES.forEach((f) => {
      expect(FEATURE_LABELS[f]).toBeTruthy();
    });
  });
});

describe("planHasFeature", () => {
  it("free plan does not have pro features", () => {
    expect(planHasFeature("free", "painting_estimator")).toBe(false);
  });

  it("pro plan has pro features", () => {
    expect(planHasFeature("pro", "painting_estimator")).toBe(true);
  });

  it("pro plan does not have premium features", () => {
    expect(planHasFeature("pro", "structural_calculator")).toBe(false);
  });

  it("premium plan has premium features", () => {
    expect(planHasFeature("premium", "structural_calculator")).toBe(true);
  });

  it("enterprise has all features", () => {
    PAID_FEATURES.forEach((f) => {
      expect(planHasFeature("enterprise", f)).toBe(true);
    });
  });

  it("free plan has free-tier features", () => {
    expect(planHasFeature("free", "ai_photo_estimator")).toBe(true);
  });
});

describe("getFeatureMinPlan", () => {
  it("returns free for ai_photo_estimator", () => {
    expect(getFeatureMinPlan("ai_photo_estimator")).toBe("free");
  });

  it("returns pro for painting_estimator", () => {
    expect(getFeatureMinPlan("painting_estimator")).toBe("pro");
  });

  it("returns premium for structural_calculator", () => {
    expect(getFeatureMinPlan("structural_calculator")).toBe("premium");
  });
});

describe("isSubscriptionActive", () => {
  it("returns false for null", () => {
    expect(isSubscriptionActive(null)).toBe(false);
  });

  it("returns false when is_paid is false", () => {
    expect(
      isSubscriptionActive({ is_paid: false, plan: "pro", paid_until: null }),
    ).toBe(false);
  });

  it("returns true when paid with no expiry", () => {
    expect(
      isSubscriptionActive({ is_paid: true, plan: "pro", paid_until: null }),
    ).toBe(true);
  });

  it("returns true when paid and not expired", () => {
    const future = new Date(Date.now() + 30 * 86400000).toISOString();
    expect(
      isSubscriptionActive({ is_paid: true, plan: "pro", paid_until: future }),
    ).toBe(true);
  });

  it("returns false when paid but expired", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(
      isSubscriptionActive({ is_paid: true, plan: "pro", paid_until: past }),
    ).toBe(false);
  });
});

describe("getDaysRemaining", () => {
  it("returns 0 for null", () => {
    expect(getDaysRemaining(null)).toBe(0);
  });

  it("returns 0 when no paid_until", () => {
    expect(
      getDaysRemaining({ is_paid: true, plan: "pro", paid_until: null }),
    ).toBe(0);
  });

  it("returns positive days for future expiry", () => {
    const future = new Date(Date.now() + 30 * 86400000).toISOString();
    expect(
      getDaysRemaining({ is_paid: true, plan: "pro", paid_until: future }),
    ).toBeGreaterThan(28);
  });

  it("returns 0 for past expiry", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(
      getDaysRemaining({ is_paid: true, plan: "pro", paid_until: past }),
    ).toBe(0);
  });
});

describe("getPlan", () => {
  it("returns free for null", () => {
    expect(getPlan(null)).toBe("free");
  });

  it("returns free when not paid", () => {
    expect(getPlan({ is_paid: false, plan: "pro", paid_until: null })).toBe(
      "free",
    );
  });

  it("returns pro for pro plan", () => {
    expect(getPlan({ is_paid: true, plan: "pro", paid_until: null })).toBe(
      "pro",
    );
  });

  it("returns premium for premium plan", () => {
    expect(getPlan({ is_paid: true, plan: "premium", paid_until: null })).toBe(
      "premium",
    );
  });

  it("returns enterprise for enterprise plan", () => {
    expect(
      getPlan({ is_paid: true, plan: "enterprise", paid_until: null }),
    ).toBe("enterprise");
  });

  it("returns basic for basic plan", () => {
    expect(getPlan({ is_paid: true, plan: "basic", paid_until: null })).toBe(
      "basic",
    );
  });

  it("returns basic for starter plan", () => {
    expect(getPlan({ is_paid: true, plan: "starter", paid_until: null })).toBe(
      "basic",
    );
  });

  it("defaults to pro for unrecognized paid plan", () => {
    expect(getPlan({ is_paid: true, plan: "unknown", paid_until: null })).toBe(
      "pro",
    );
  });

  it("handles case-insensitive plan names", () => {
    expect(getPlan({ is_paid: true, plan: "PRO", paid_until: null })).toBe(
      "pro",
    );
    expect(getPlan({ is_paid: true, plan: "Premium", paid_until: null })).toBe(
      "premium",
    );
  });
});

describe("hasFeatureAccess", () => {
  const activePro: SubscriptionState = {
    paidStatus: {
      is_paid: true,
      plan: "pro",
      paid_until: new Date(Date.now() + 30 * 86400000).toISOString(),
    },
    isActive: true,
    plan: "pro",
    paidUntil: new Date(Date.now() + 30 * 86400000),
    daysRemaining: 30,
    loading: false,
    error: null,
    refresh: async () => {},
  };

  const inactive: SubscriptionState = {
    paidStatus: null,
    isActive: false,
    plan: "free",
    paidUntil: null,
    daysRemaining: 0,
    loading: false,
    error: null,
    refresh: async () => {},
  };

  it("allows admin access to everything", () => {
    const result = hasFeatureAccess(inactive, "structural_calculator", true);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("admin");
  });

  it("allows free features for inactive subscription", () => {
    const result = hasFeatureAccess(inactive, "ai_photo_estimator");
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("free_tier");
  });

  it("blocks pro features for inactive subscription", () => {
    const result = hasFeatureAccess(inactive, "painting_estimator");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("subscription_required");
  });

  it("allows pro features for active pro subscription", () => {
    const result = hasFeatureAccess(activePro, "painting_estimator");
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("subscription_active");
  });

  it("blocks premium features for pro subscription", () => {
    const result = hasFeatureAccess(activePro, "structural_calculator");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("plan_upgrade_required");
  });

  it("includes minPlan in blocked response", () => {
    const result = hasFeatureAccess(activePro, "structural_calculator");
    expect(result.minPlan).toBe("premium");
  });
});

describe("formatSubscriptionStatus", () => {
  it("returns 'No subscription' for null paidStatus", () => {
    const state: SubscriptionState = {
      paidStatus: null,
      isActive: false,
      plan: "free",
      paidUntil: null,
      daysRemaining: 0,
      loading: false,
      error: null,
      refresh: async () => {},
    };
    expect(formatSubscriptionStatus(state)).toBe("No subscription");
  });

  it("returns 'Free plan' when not paid", () => {
    const state: SubscriptionState = {
      paidStatus: { is_paid: false, plan: "free", paid_until: null },
      isActive: false,
      plan: "free",
      paidUntil: null,
      daysRemaining: 0,
      loading: false,
      error: null,
      refresh: async () => {},
    };
    expect(formatSubscriptionStatus(state)).toBe("Free plan");
  });

  it("returns plan with days remaining when active", () => {
    const state: SubscriptionState = {
      paidStatus: {
        is_paid: true,
        plan: "pro",
        paid_until: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
      isActive: true,
      plan: "pro",
      paidUntil: new Date(Date.now() + 30 * 86400000),
      daysRemaining: 30,
      loading: false,
      error: null,
      refresh: async () => {},
    };
    const status = formatSubscriptionStatus(state);
    expect(status).toContain("PRO");
    expect(status).toContain("30 day");
  });

  it("uses singular 'day' for 1 remaining", () => {
    const state: SubscriptionState = {
      paidStatus: {
        is_paid: true,
        plan: "pro",
        paid_until: new Date(Date.now() + 86400000).toISOString(),
      },
      isActive: true,
      plan: "pro",
      paidUntil: new Date(Date.now() + 86400000),
      daysRemaining: 1,
      loading: false,
      error: null,
      refresh: async () => {},
    };
    expect(formatSubscriptionStatus(state)).toContain("1 day remaining");
  });

  it("returns expired when not active but paid", () => {
    const state: SubscriptionState = {
      paidStatus: {
        is_paid: true,
        plan: "pro",
        paid_until: new Date(Date.now() - 86400000).toISOString(),
      },
      isActive: false,
      plan: "pro",
      paidUntil: null,
      daysRemaining: 0,
      loading: false,
      error: null,
      refresh: async () => {},
    };
    expect(formatSubscriptionStatus(state)).toContain("Expired");
  });
});
