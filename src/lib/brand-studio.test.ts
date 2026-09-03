import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      })),
    })),
  },
  isSupabaseConfigured: false,
}));

vi.mock("@/lib/supabase-lazy", () => ({
  isSupabaseConfigured: false,
  getSupabase: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: null,
    isAdmin: false,
    isPaid: false,
    paidStatus: null,
  }),
}));

vi.mock("@/lib/subscription", () => ({
  isSubscriptionActive: () => false,
}));

import {
  SAFE_FALLBACK_BRANDING,
  invalidateBrandingConfigCache,
  type ResolvedBranding,
} from "@/lib/brand-studio";

describe("SAFE_FALLBACK_BRANDING", () => {
  it("has source = safe_fallback", () => {
    expect(SAFE_FALLBACK_BRANDING.source).toBe("safe_fallback");
  });

  it("has brandName FRELUX PROJECT CALC", () => {
    expect(SAFE_FALLBACK_BRANDING.brandName).toBe("FRELUX PROJECT CALC");
  });

  it("has Smart Construction Estimation tagline", () => {
    expect(SAFE_FALLBACK_BRANDING.tagline).toBe(
      "Smart Construction Estimation",
    );
  });

  it("has null contact fields", () => {
    expect(SAFE_FALLBACK_BRANDING.email).toBeNull();
    expect(SAFE_FALLBACK_BRANDING.phone).toBeNull();
    expect(SAFE_FALLBACK_BRANDING.address).toBeNull();
    expect(SAFE_FALLBACK_BRANDING.whatsapp).toBeNull();
    expect(SAFE_FALLBACK_BRANDING.website).toBeNull();
    expect(SAFE_FALLBACK_BRANDING.logoUrl).toBeNull();
  });

  it("has primaryColor #7C3AED", () => {
    expect(SAFE_FALLBACK_BRANDING.primaryColor).toBe("#7C3AED");
  });

  it("has watermark config", () => {
    expect(SAFE_FALLBACK_BRANDING.watermark).toBeDefined();
    expect(SAFE_FALLBACK_BRANDING.watermark.enabled).toBeDefined();
  });

  it("has templateConfig", () => {
    expect(SAFE_FALLBACK_BRANDING.templateConfig).toBeDefined();
  });

  it("has logoPlacement top-right", () => {
    expect(SAFE_FALLBACK_BRANDING.logoPlacement).toBe("top-right");
  });

  it("has null ids", () => {
    expect(SAFE_FALLBACK_BRANDING.templateId).toBeNull();
    expect(SAFE_FALLBACK_BRANDING.profileId).toBeNull();
    expect(SAFE_FALLBACK_BRANDING.unlockId).toBeNull();
  });
});

describe("invalidateBrandingConfigCache", () => {
  it("does not throw", () => {
    expect(() => invalidateBrandingConfigCache()).not.toThrow();
  });
});

describe("ResolvedBranding type", () => {
  it("can be constructed with all fields", () => {
    const branding: ResolvedBranding = {
      source: "user_premium",
      brandName: "Test",
      tagline: null,
      email: null,
      phone: null,
      address: null,
      whatsapp: null,
      website: null,
      logoUrl: null,
      primaryColor: "#000",
      secondaryColor: "#fff",
      accentColor: "#f00",
      watermark: {
        enabled: false,
        opacity: 0.1,
        scale: 0.5,
        position: "center",
        diagonal: false,
      },
      templateConfig: { accentBar: false, accentBarColor: "#000" },
      logoPlacement: "top-right",
      templateId: null,
      profileId: null,
      unlockId: null,
    };
    expect(branding.source).toBe("user_premium");
  });
});
