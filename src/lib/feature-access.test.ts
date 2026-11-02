import { describe, it, expect } from "vitest";
import * as fa from "@/lib/feature-access";

describe("feature-access unified registry", () => {
  it("re-exports the subscription plan-tier gating API", () => {
    expect(Array.isArray(fa.PAID_FEATURES)).toBe(true);
    expect(fa.PAID_FEATURES.length).toBeGreaterThan(0);
    expect(typeof fa.planHasFeature).toBe("function");
    expect(typeof fa.getFeatureMinPlan).toBe("function");
    expect(typeof fa.hasFeatureAccess).toBe("function");
    expect(typeof fa.isSubscriptionActive).toBe("function");
    expect(typeof fa.useSubscription).toBe("function");
    expect(typeof fa.formatSubscriptionStatus).toBe("function");
  });
  it("re-exports the AI rate-limiting API", () => {
    expect(typeof fa.fetchAiAccessConfig).toBe("function");
    expect(typeof fa.getAiUsageStatus).toBe("function");
    expect(typeof fa.checkAiAccess).toBe("function");
    expect(typeof fa.requestRewardedAccess).toBe("function");
  });
  it("re-exports the estimation rate-limiting API", () => {
    expect(typeof fa.fetchEstimationAccessConfig).toBe("function");
    expect(typeof fa.getEstimationUsageStatus).toBe("function");
    expect(typeof fa.checkUserPaidStatus).toBe("function");
    expect(typeof fa.checkEstimationAccess).toBe("function");
    expect(typeof fa.saveEstimationResult).toBe("function");
    expect(typeof fa.fetchSavedEstimates).toBe("function");
  });
  it("re-exports the brand-studio feature flags API", () => {
    expect(typeof fa.useBrandStudioAccess).toBe("function");
    expect(typeof fa.resolveBrandStudioAccess).toBe("function");
    expect(typeof fa.resolveBranding).toBe("function");
  });
});
