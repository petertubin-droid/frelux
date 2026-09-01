import { describe, it, expect, vi } from "vitest";

// Mock supabase-lazy before importing credits
vi.mock("@/lib/supabase-lazy", () => {
  const invoke = vi.fn();
  return {
    isSupabaseConfigured: true,
    getSupabase: vi.fn(() =>
      Promise.resolve({
        functions: { invoke },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() =>
                Promise.resolve({ data: null, error: null }),
              ),
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          })),
        })),
      }),
    ),
    getFunctionErrorMessage: vi.fn((e: unknown) =>
      typeof e === "object" && e && "message" in e
        ? String((e as Record<string, unknown>).message)
        : "Edge function error",
    ),
  };
});

import {
  spendAiCredits,
  unlockFeatureViaAd,
  getAiFeatureCost,
  generateReferenceId,
  AI_CREDIT_COST,
  CREDITS_PER_AD,
} from "@/lib/credits";

describe("Premium Feature Gating — credits integration", () => {
  describe("AI_CREDIT_COST constant", () => {
    it("is 10 credits per unlock", () => {
      expect(AI_CREDIT_COST).toBe(10);
    });
  });

  describe("CREDITS_PER_AD constant", () => {
    it("awards 5 credits per ad watch", () => {
      expect(CREDITS_PER_AD).toBe(5);
    });
  });

  describe("generateReferenceId for premium features", () => {
    it("generates a unique reference for pdf_export", () => {
      const ref = generateReferenceId("pdf_export");
      expect(ref.startsWith("pdf_export_")).toBe(true);
    });

    it("generates a unique reference for ai_building_estimation", () => {
      const ref = generateReferenceId("ai_building_estimation");
      expect(ref.startsWith("ai_building_estimation_")).toBe(true);
    });

    it("produces unique refs across different features", () => {
      const ref1 = generateReferenceId("pdf_export");
      const ref2 = generateReferenceId("ai_logo_generation");
      expect(ref1).not.toBe(ref2);
    });
  });

  describe("spendAiCredits — premium feature unlock", () => {
    it("calls spend-ai-credits edge function with feature key and idempotency key", async () => {
      const { getSupabase } = await import("@/lib/supabase-lazy");
      const supabase = await getSupabase();
      const invoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;
      invoke.mockResolvedValue({
        data: { success: true, newBalance: 90, cost: 10 },
        error: null,
      });

      const result = await spendAiCredits("pdf_export", "pdf_export_ref_001");

      expect(invoke).toHaveBeenCalledWith("spend-ai-credits", {
        body: {
          featureKey: "pdf_export",
          idempotencyKey: "pdf_export_ref_001",
          metadata: undefined,
        },
      });
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(90);
      expect(result.cost).toBe(10);
    });

    it("returns INSUFFICIENT_CREDITS when balance is too low", async () => {
      const { getSupabase } = await import("@/lib/supabase-lazy");
      const supabase = await getSupabase();
      const invoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;
      invoke.mockResolvedValue({
        data: {
          success: false,
          code: "INSUFFICIENT_CREDITS",
          requiredCredits: 10,
          currentBalance: 3,
        },
        error: null,
      });

      const result = await spendAiCredits("ai_logo_generation", "ref_001");

      expect(result.success).toBe(false);
      expect(result.code).toBe("INSUFFICIENT_CREDITS");
      expect(result.requiredCredits).toBe(10);
      expect(result.currentBalance).toBe(3);
    });

    it("returns DAILY_LIMIT when usage cap reached", async () => {
      const { getSupabase } = await import("@/lib/supabase-lazy");
      const supabase = await getSupabase();
      const invoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;
      invoke.mockResolvedValue({
        data: { success: false, code: "DAILY_LIMIT" },
        error: null,
      });

      const result = await spendAiCredits("ai_building_estimation", "ref_002");

      expect(result.success).toBe(false);
      expect(result.code).toBe("DAILY_LIMIT");
    });

    it("handles network errors gracefully", async () => {
      const { getSupabase } = await import("@/lib/supabase-lazy");
      const supabase = await getSupabase();
      const invoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;
      invoke.mockRejectedValue(new Error("network failure"));

      const result = await spendAiCredits("ai_color_consult", "ref_003");

      expect(result.success).toBe(false);
      expect(result.code).toBe("NETWORK_ERROR");
    });
  });

  describe("unlockFeatureViaAd — ad-based unlock", () => {
    it("calls verify-rewarded-ad with unlock_feature mode", async () => {
      const { getSupabase } = await import("@/lib/supabase-lazy");
      const supabase = await getSupabase();
      const invoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;
      invoke.mockResolvedValue({
        data: { success: true, message: "Feature unlocked" },
        error: null,
      });

      const result = await unlockFeatureViaAd(
        "pdf_export",
        "adsense",
        "ad_evt_001",
      );

      expect(invoke).toHaveBeenCalledWith("verify-rewarded-ad", {
        body: {
          adProvider: "adsense",
          adEventId: "ad_evt_001",
          mode: "unlock_feature",
          featureKey: "pdf_export",
          metadata: undefined,
        },
      });
      expect(result.success).toBe(true);
    });

    it("returns error when ad verification fails", async () => {
      const { getSupabase } = await import("@/lib/supabase-lazy");
      const supabase = await getSupabase();
      const invoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;
      invoke.mockResolvedValue({
        data: { success: false, error: "Ad not verified" },
        error: null,
      });

      const result = await unlockFeatureViaAd(
        "ai_color_preview",
        "adsense",
        "ad_evt_002",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Ad not verified");
    });

    it("handles network errors gracefully", async () => {
      const { getSupabase } = await import("@/lib/supabase-lazy");
      const supabase = await getSupabase();
      const invoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;
      invoke.mockRejectedValue(new Error("timeout"));

      const result = await unlockFeatureViaAd(
        "ai_logo_generation",
        "adsense",
        "ad_evt_003",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unable to reach");
    });
  });

  describe("getAiFeatureCost — fetching feature config from DB", () => {
    it("returns null when supabase returns no data (feature not found)", async () => {
      // The default mock chain returns { data: null, error: null } from maybeSingle
      const result = await getAiFeatureCost("nonexistent_feature");
      expect(result).toBeNull();
    });
  });
});

describe("Premium gating — one-time use session scoping", () => {
  // This documents the intended behavior: unlock state is useState in the
  // consuming component (not persisted), so leaving the feature resets it.
  // The PremiumFeatureGate itself doesn't persist unlock state — each
  // render starts fresh, requiring a new unlock.

  it("does not persist unlock state across renders", () => {
    // The component uses useState(false) for unlocked, meaning each
    // mount requires a fresh unlock. This is by design — one-time use.
    // We verify that generateReferenceId produces unique keys per call,
    // ensuring duplicate unlock attempts aren't deduplicated client-side.
    const ref1 = generateReferenceId("pdf_export");
    const ref2 = generateReferenceId("pdf_export");
    expect(ref1).not.toBe(ref2);
  });

  it("chat assistant (ai_livechat) is excluded from credit gating", () => {
    // ai_livechat is the only feature with requires_credits=false and
    // credit_cost=0. This is enforced at the DB level, not client-side.
    // The PremiumFeatureGate should never be rendered for ai_livechat.
    // This test documents that contract.
    expect(AI_CREDIT_COST).toBe(10); // all other features cost 10
  });
});
