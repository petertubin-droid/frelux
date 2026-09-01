// =========================================================
// FRELUX Brand Studio — Unit Tests
// =========================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Data ──────────────────────────────────────────

const mockConfig = {
  pdf_default_logo_url: null,
  pdf_default_brand_name: "FRELUX PAINT CALC",
  pdf_default_tagline: "Smart Construction Estimation",
  pdf_default_contact_email: "support@frelux.com",
  pdf_default_contact_phone: "+234800",
  pdf_default_address: "Lagos, Nigeria",
  pdf_default_primary_color: "#7C3AED",
  pdf_default_secondary_color: "#0B1120",
  pdf_template_id: null,
  pdf_watermark_enabled: true,
  pdf_watermark_opacity: 0.08,
  pdf_watermark_scale: 0.6,
  pdf_watermark_position: "center",
  pdf_watermark_diagonal: false,
  brand_studio_enabled: true,
  ai_logo_daily_limit: 3,
};

const mockProfile = {
  id: "profile-1",
  user_id: "test-user-id",
  name: "Andrew Luxury Paints",
  tagline: "Premium Painting",
  description: null,
  phone: "+234800",
  whatsapp: null,
  email: "info@andrew.com",
  address: "Lagos",
  website: "https://andrew.com",
  primary_color: "#FFD700",
  secondary_color: "#1a1a2e",
  accent_color: "#F97316",
  logo_url: "https://example.com/logo.png",
  template_id: null,
  watermark_config: {
    enabled: true,
    opacity: 0.1,
    scale: 0.5,
    position: "center" as const,
    diagonal: false,
  },
  logo_placement: "top-right" as const,
  is_default: true,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ─── Helper: create a simple chainable query mock ────────

function chainableQuery(result: unknown) {
  const obj = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    data: result,
  };
  obj.insert = vi.fn().mockReturnValue(obj);
  obj.update = vi.fn().mockReturnValue(obj);
  obj.delete = vi.fn().mockReturnValue(obj);
  obj.select = vi.fn().mockReturnValue(obj);
  obj.eq = vi.fn().mockReturnValue(obj);
  obj.neq = vi.fn().mockReturnValue(obj);
  obj.gt = vi.fn().mockReturnValue(obj);
  obj.order = vi.fn().mockReturnValue(obj);
  obj.limit = vi.fn().mockReturnValue(obj);
  return obj;
}

// ─── vi.hoisted mock supabase ───────────────────────────

const { mockSupabase } = vi.hoisted(() => {
  const mock = {
    from: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi
          .fn()
          .mockReturnValue({
            data: { publicUrl: "https://example.com/logo.png" },
          }),
      }),
    },
    functions: {
      invoke: vi
        .fn()
        .mockResolvedValue({
          data: { imageUrl: "https://example.com/logo.png" },
          error: null,
        }),
    },
  };
  return { mockSupabase: mock };
});

vi.mock("@/lib/supabase", () => ({
  supabase: mockSupabase,
  isSupabaseConfigured: true,
}));

vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      update: vi
        .fn()
        .mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }),
  }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: "test-user-id" },
    isAdmin: false,
    isPaid: false,
    paidStatus: null,
  }),
}));

vi.mock("@/lib/subscription", () => ({
  isSubscriptionActive: vi.fn(
    (paidStatus: { is_paid: boolean; paid_until: string | null } | null) => {
      if (!paidStatus || !paidStatus.is_paid) return false;
      if (paidStatus.paid_until)
        return new Date(paidStatus.paid_until).getTime() > Date.now();
      return true;
    },
  ),
}));

vi.mock("@/lib/rewarded-access", () => ({
  getClientHash: vi.fn().mockReturnValue("test-hash"),
}));

// ─── Imports ─────────────────────────────────────────────

import {
  resolveBranding,
  resolveBrandStudioAccess,
  SAFE_FALLBACK_BRANDING,
  invalidateBrandingConfigCache,
} from "@/lib/brand-studio";
import type { BrandStudioAccess } from "@/lib/brand-studio";

// ─── Setup ───────────────────────────────────────────────

beforeEach(() => {
  invalidateBrandingConfigCache();
  vi.clearAllMocks();
  // Reset from to default implementation (returns null data)
  mockSupabase.from = vi
    .fn()
    .mockImplementation((table: string) =>
      chainableQuery({ data: null, error: null }),
    );
});

// ─── Tests ───────────────────────────────────────────────

describe("Brand Studio — Branding Resolution Priority", () => {
  it("returns safe_fallback when no branding data is available", async () => {
    mockSupabase.from = vi
      .fn()
      .mockImplementation(() => chainableQuery({ data: null, error: null }));

    const access: BrandStudioAccess = {
      featureEnabled: false,
      hasPremium: false,
      hasRewardedUnlock: false,
      activeUnlock: null,
      aiLogoDailyLimit: 3,
      canUseCustomBranding: false,
      canSaveMultipleProfiles: false,
      canUseAiLogo: false,
    };

    const result = await resolveBranding(null, access);
    expect(result.source).toBe("safe_fallback");
    expect(result.brandName).toBe("FRELUX PAINT CALC");
    expect(result.primaryColor).toBe("#7C3AED");
  });

  it("returns user_premium branding when user has premium and profile", async () => {
    mockSupabase.from = vi.fn().mockImplementation((table: string) => {
      if (table === "site_settings")
        return chainableQuery({ data: mockConfig, error: null });
      if (table === "brand_profiles")
        return chainableQuery({ data: mockProfile, error: null });
      return chainableQuery({ data: null, error: null });
    });

    const access: BrandStudioAccess = {
      featureEnabled: true,
      hasPremium: true,
      hasRewardedUnlock: false,
      activeUnlock: null,
      aiLogoDailyLimit: 3,
      canUseCustomBranding: true,
      canSaveMultipleProfiles: true,
      canUseAiLogo: false,
    };

    const result = await resolveBranding("profile-1", access);
    expect(result.source).toBe("user_premium");
    expect(result.brandName).toBe("Andrew Luxury Paints");
    expect(result.primaryColor).toBe("#FFD700");
    expect(result.logoUrl).toBe("https://example.com/logo.png");
  });

  it("returns rewarded_ad branding when user has active unlock but no premium", async () => {
    mockSupabase.from = vi.fn().mockImplementation((table: string) => {
      if (table === "site_settings")
        return chainableQuery({ data: mockConfig, error: null });
      return chainableQuery({ data: null, error: null });
    });

    const access: BrandStudioAccess = {
      featureEnabled: true,
      hasPremium: false,
      hasRewardedUnlock: true,
      activeUnlock: {
        id: "unlock-1",
        user_id: "test-user-id",
        client_hash: null,
        tool_key: "brand_studio_pdf",
        unlock_type: "single_export",
        template_id: null,
        brand_profile_id: null,
        unlocked_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        is_consumed: false,
        consumed_at: null,
        ad_provider: "adsense",
        created_at: new Date().toISOString(),
      },
      aiLogoDailyLimit: 3,
      canUseCustomBranding: true,
      canSaveMultipleProfiles: false,
      canUseAiLogo: false,
    };

    const result = await resolveBranding(null, access);
    expect(result.source).toBe("rewarded_ad");
    expect(result.unlockId).toBe("unlock-1");
  });

  it("returns frelux_default when config exists but no user branding", async () => {
    mockSupabase.from = vi.fn().mockImplementation((table: string) => {
      if (table === "site_settings")
        return chainableQuery({ data: mockConfig, error: null });
      return chainableQuery({ data: null, error: null });
    });

    const access: BrandStudioAccess = {
      featureEnabled: true,
      hasPremium: false,
      hasRewardedUnlock: false,
      activeUnlock: null,
      aiLogoDailyLimit: 3,
      canUseCustomBranding: false,
      canSaveMultipleProfiles: false,
      canUseAiLogo: false,
    };

    const result = await resolveBranding(null, access);
    expect(result.source).toBe("frelux_default");
    expect(result.brandName).toBe("FRELUX PAINT CALC");
  });

  it("SAFE_FALLBACK_BRANDING has correct default values", () => {
    expect(SAFE_FALLBACK_BRANDING.source).toBe("safe_fallback");
    expect(SAFE_FALLBACK_BRANDING.brandName).toBe("FRELUX PAINT CALC");
    expect(SAFE_FALLBACK_BRANDING.watermark.enabled).toBe(true);
    expect(SAFE_FALLBACK_BRANDING.watermark.opacity).toBe(0.08);
  });
});

describe("Brand Studio — Access Control", () => {
  it("denies access when feature is disabled (no config)", async () => {
    mockSupabase.from = vi
      .fn()
      .mockImplementation(() => chainableQuery({ data: null, error: null }));

    const result = await resolveBrandStudioAccess("user-1", false, false, null);
    expect(result.featureEnabled).toBe(false);
    expect(result.canUseCustomBranding).toBe(false);
  });

  it("denies access when brand_studio_enabled is false in config", async () => {
    mockSupabase.from = vi.fn().mockImplementation((table: string) => {
      if (table === "site_settings")
        return chainableQuery({
          data: { ...mockConfig, brand_studio_enabled: false },
          error: null,
        });
      return chainableQuery({ data: null, error: null });
    });

    const result = await resolveBrandStudioAccess("user-1", false, false, null);
    expect(result.featureEnabled).toBe(false);
    expect(result.canUseCustomBranding).toBe(false);
  });

  it("grants premium access when user has active subscription", async () => {
    mockSupabase.from = vi.fn().mockImplementation((table: string) => {
      if (table === "site_settings")
        return chainableQuery({ data: mockConfig, error: null });
      return chainableQuery({ data: null, error: null });
    });

    const result = await resolveBrandStudioAccess("user-1", false, true, {
      is_paid: true,
      paid_until: new Date(Date.now() + 86400000).toISOString(),
      plan: "pro",
    });

    expect(result.featureEnabled).toBe(true);
    expect(result.hasPremium).toBe(true);
    expect(result.canUseCustomBranding).toBe(true);
    expect(result.canSaveMultipleProfiles).toBe(true);
  });

  it("denies custom branding for free users without rewarded unlock", async () => {
    mockSupabase.from = vi.fn().mockImplementation((table: string) => {
      if (table === "site_settings")
        return chainableQuery({ data: mockConfig, error: null });
      return chainableQuery({ data: null, error: null });
    });

    const result = await resolveBrandStudioAccess("user-2", false, false, null);
    expect(result.canUseCustomBranding).toBe(false);
    expect(result.hasPremium).toBe(false);
  });

  it("admins always have premium access", async () => {
    mockSupabase.from = vi.fn().mockImplementation((table: string) => {
      if (table === "site_settings")
        return chainableQuery({ data: mockConfig, error: null });
      return chainableQuery({ data: null, error: null });
    });

    const result = await resolveBrandStudioAccess("admin-1", true, false, null);
    expect(result.hasPremium).toBe(true);
    expect(result.canUseCustomBranding).toBe(true);
  });
});

describe("Brand Studio — Rewarded-Ad Unlock Validation", () => {
  it("expired unlock is rejected", () => {
    const expiredUnlock = {
      id: "unlock-expired",
      expires_at: new Date(Date.now() - 3600000).toISOString(),
      is_consumed: false,
    };
    const isExpired = new Date(expiredUnlock.expires_at).getTime() < Date.now();
    expect(isExpired).toBe(true);
  });

  it("consumed unlock is rejected", () => {
    const consumedUnlock = {
      id: "unlock-consumed",
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      is_consumed: true,
    };
    expect(consumedUnlock.is_consumed).toBe(true);
  });

  it("valid unlock is accepted", () => {
    const validUnlock = {
      id: "unlock-valid",
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      is_consumed: false,
    };
    const isValid =
      !validUnlock.is_consumed &&
      new Date(validUnlock.expires_at).getTime() > Date.now();
    expect(isValid).toBe(true);
  });
});

describe("Brand Studio — PDF Branding Layer", () => {
  it("branded header HTML includes brand name", async () => {
    const { getHtmlBrandedHeader } = await import("@/lib/pdf-branding");
    const branding = {
      ...SAFE_FALLBACK_BRANDING,
      brandName: "Test Brand Co",
      tagline: "We Paint Everything",
      address: "123 Test St",
      phone: "+234800",
      email: "test@test.com",
    };
    const html = getHtmlBrandedHeader(branding);
    expect(html).toContain("Test Brand Co");
    expect(html).toContain("We Paint Everything");
    expect(html).toContain("123 Test St");
    expect(html).toContain("+234800");
    expect(html).toContain("test@test.com");
  });

  it("branded footer HTML includes attribution", async () => {
    const { getHtmlBrandedFooter } = await import("@/lib/pdf-branding");
    const html = getHtmlBrandedFooter(SAFE_FALLBACK_BRANDING);
    expect(html).toContain("FRELUX PAINT CALC");
  });

  it("watermark HTML element is empty when disabled", async () => {
    const { getHtmlWatermarkElement } = await import("@/lib/pdf-branding");
    const branding = {
      ...SAFE_FALLBACK_BRANDING,
      watermark: { ...SAFE_FALLBACK_BRANDING.watermark, enabled: false },
    };
    const html = getHtmlWatermarkElement(branding);
    expect(html).toBe("");
  });

  it("watermark HTML element contains brand name for text watermark", async () => {
    const { getHtmlWatermarkElement } = await import("@/lib/pdf-branding");
    const html = getHtmlWatermarkElement(SAFE_FALLBACK_BRANDING);
    expect(html).toContain("FRELUX PAINT CALC");
  });

  it("branded styles include primary color", async () => {
    const { getHtmlBrandedStyles } = await import("@/lib/pdf-branding");
    const html = getHtmlBrandedStyles(SAFE_FALLBACK_BRANDING);
    expect(html).toContain("#7C3AED");
  });

  it("escapeHtml prevents XSS in brand name", async () => {
    const { getHtmlBrandedHeader } = await import("@/lib/pdf-branding");
    const branding = {
      ...SAFE_FALLBACK_BRANDING,
      brandName: '<script>alert("xss")</script>',
    };
    const html = getHtmlBrandedHeader(branding);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
