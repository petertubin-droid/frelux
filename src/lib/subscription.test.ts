import { describe, it, expect } from "vitest";
import {
  PAID_FEATURES,
  FEATURE_LABELS,
  planHasFeature,
  getFeatureMinPlan,
  isSubscriptionActive,
  getDaysRemaining,
  getPlan,
  type SubscriptionPlan,
  type PaidFeature,
} from "./subscription";
import type { DbUserPaidStatus } from "@/types/database";

describe("subscription", () => {
  it("PAID_FEATURES has 12 features", () => {
    expect(PAID_FEATURES.length).toBe(12);
  });

  it("FEATURE_LABELS has all features", () => {
    for (const f of PAID_FEATURES) {
      expect(FEATURE_LABELS[f]).toBeTruthy();
    }
  });

  it("planHasFeature: free user gets free features", () => {
    expect(planHasFeature("free", "ai_photo_estimator")).toBe(true);
  });

  it("planHasFeature: free user denied pro features", () => {
    expect(planHasFeature("free", "painting_estimator")).toBe(false);
  });

  it("planHasFeature: pro user gets pro features", () => {
    expect(planHasFeature("pro", "painting_estimator")).toBe(true);
  });

  it("planHasFeature: pro user denied premium features", () => {
    expect(planHasFeature("pro", "structural_calculator")).toBe(false);
  });

  it("planHasFeature: premium user gets all features", () => {
    expect(planHasFeature("premium", "structural_calculator")).toBe(true);
    expect(planHasFeature("premium", "ai_color_consult")).toBe(true);
  });

  it("planHasFeature: enterprise gets everything", () => {
    for (const f of PAID_FEATURES) {
      expect(planHasFeature("enterprise", f)).toBe(true);
    }
  });

  it("getFeatureMinPlan returns minimum plan for each feature", () => {
    expect(getFeatureMinPlan("ai_photo_estimator")).toBe("free");
    expect(getFeatureMinPlan("painting_estimator")).toBe("pro");
    expect(getFeatureMinPlan("structural_calculator")).toBe("premium");
  });

  it("isSubscriptionActive returns false for null", () => {
    expect(isSubscriptionActive(null)).toBe(false);
  });

  it("isSubscriptionActive returns false when not paid", () => {
    const status = { is_paid: false } as DbUserPaidStatus;
    expect(isSubscriptionActive(status)).toBe(false);
  });

  it("isSubscriptionActive returns true when paid and not expired", () => {
    const future = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const status = { is_paid: true, paid_until: future } as DbUserPaidStatus;
    expect(isSubscriptionActive(status)).toBe(true);
  });

  it("isSubscriptionActive returns false when expired", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const status = { is_paid: true, paid_until: past } as DbUserPaidStatus;
    expect(isSubscriptionActive(status)).toBe(false);
  });

  it("getDaysRemaining returns 0 for null", () => {
    expect(getDaysRemaining(null)).toBe(0);
  });

  it("getDaysRemaining returns days until expiry", () => {
    const future = new Date(
      Date.now() + 10 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const status = { paid_until: future } as DbUserPaidStatus;
    expect(getDaysRemaining(status)).toBeGreaterThanOrEqual(9);
    expect(getDaysRemaining(status)).toBeLessThanOrEqual(10);
  });

  it("getDaysRemaining returns 0 for expired", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const status = { paid_until: past } as DbUserPaidStatus;
    expect(getDaysRemaining(status)).toBe(0);
  });

  it("getPlan returns free for null", () => {
    expect(getPlan(null)).toBe("free");
  });

  it("getPlan returns free for unpaid", () => {
    expect(getPlan({ is_paid: false } as DbUserPaidStatus)).toBe("free");
  });

  it("getPlan returns basic for basic plan", () => {
    expect(getPlan({ is_paid: true, plan: "basic" } as DbUserPaidStatus)).toBe(
      "basic",
    );
  });

  it("getPlan returns pro for pro plan", () => {
    expect(getPlan({ is_paid: true, plan: "pro" } as DbUserPaidStatus)).toBe(
      "pro",
    );
  });

  it("getPlan returns premium for premium plan", () => {
    expect(
      getPlan({ is_paid: true, plan: "premium" } as DbUserPaidStatus),
    ).toBe("premium");
  });

  it("getPlan returns enterprise for enterprise plan", () => {
    expect(
      getPlan({ is_paid: true, plan: "enterprise" } as DbUserPaidStatus),
    ).toBe("enterprise");
  });

  it("getPlan returns pro for unrecognized paid plan", () => {
    expect(
      getPlan({ is_paid: true, plan: "custom_xyz" } as DbUserPaidStatus),
    ).toBe("pro");
  });

  it("getPlan handles starter as basic", () => {
    expect(
      getPlan({ is_paid: true, plan: "starter" } as DbUserPaidStatus),
    ).toBe("basic");
  });
});
