import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DbSiteBranding } from "@/types/database";

beforeEach(() => {
  vi.clearAllMocks();
});

function row(over: Partial<DbSiteBranding>): DbSiteBranding {
  return {
    id: "x",
    website_name: "FRELUX",
    website_tagline: "Every Trade. Every Cost. One Platform.",
    browser_title: "FRELUX | Every Trade. Every Cost. One Platform.",
    light_logo_url: null,
    dark_logo_url: null,
    favicon_url: null,
    pwa_icon_url: null,
    primary_color: "#112233",
    secondary_color: "#0B1120",
    accent_color: "#F97316",
    hero_highlight_config: null,
    hero_image_url: null,
    hero_image_alt: null,
    hero_image_label: null,
    hero_swatch_colors: null,
    hero_swatch_name: null,
    hero_chip_label: null,
    hero_chip_value: null,
    hero_chip_subtext: null,
    hero_badge_label: null,
    hero_badge_value: null,
    is_active: true,
    created_at: "",
    updated_at: "",
    ...over,
  } as DbSiteBranding;
}

describe("branding", () => {
  it("module exports something", async () => {
    const mod = await import("@/lib/branding");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it("normalises the legacy FRELUXTOOLS / Build Smarter row back to FRELUX", async () => {
    const { normalizeBranding } = await import("@/lib/branding");
    const out = normalizeBranding(
      row({
        website_name: "FRELUXTOOLS",
        website_tagline: "Build Smarter",
        browser_title: "FRELUXTOOLS — Build Smarter",
      }),
    );
    expect(out.website_name).toBe("FRELUX");
    expect(out.website_tagline).toBe("Every Trade. Every Cost. One Platform.");
    expect(out.browser_title).not.toMatch(/FRELUXTOOLS/i);
    // admin-managed visuals are untouched
    expect(out.primary_color).toBe("#112233");
  });

  it("also catches 'FRELUX Tools' spellings", async () => {
    const { normalizeBranding } = await import("@/lib/branding");
    expect(
      normalizeBranding(row({ website_name: "FRELUX Tools" })).website_name,
    ).toBe("FRELUX");
  });

  it("leaves a legitimate custom brand untouched", async () => {
    const { normalizeBranding } = await import("@/lib/branding");
    const r = row({
      website_name: "FRELUX Paint",
      website_tagline: "Paint smarter",
    });
    expect(normalizeBranding(r)).toBe(r);
  });
});
