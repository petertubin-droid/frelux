import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { BrandingProvider, useBranding } from "@/lib/branding";

vi.mock("@/lib/supabase-lazy", () => ({
  isSupabaseConfigured: false,
  getSupabase: vi.fn(async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  })),
}));

describe("BrandingProvider", () => {
  it("provides null branding initially", () => {
    let branding: unknown = "not-set";

    function TestChild() {
      const ctx = useBranding();
      branding = ctx.branding;
      return null;
    }

    render(
      <BrandingProvider>
        <TestChild />
      </BrandingProvider>,
    );

    expect(branding).toBeNull();
  });

  it("provides loading state", () => {
    let loading: unknown = "not-set";

    function TestChild() {
      const ctx = useBranding();
      loading = ctx.loading;
      return null;
    }

    render(
      <BrandingProvider>
        <TestChild />
      </BrandingProvider>,
    );

    expect(loading).toBe(true);
  });
});
