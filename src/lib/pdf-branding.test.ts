import { describe, it, expect } from "vitest";
import {
  getHtmlWatermarkStyle,
  getHtmlWatermarkElement,
  getHtmlBrandedHeader,
  getHtmlBrandedFooter,
  getHtmlBrandedStyles,
} from "@/lib/pdf-branding";
import type { ResolvedBranding } from "@/lib/brand-studio";

const baseBranding: ResolvedBranding = {
  source: "user_premium",
  brandName: "Test Brand",
  tagline: "Quality Work",
  email: "info@test.com",
  phone: "+234 800 123",
  address: "123 Main St",
  whatsapp: "+234 800 456",
  website: "www.test.com",
  logoUrl: null,
  primaryColor: "#7C3AED",
  secondaryColor: "#0B1120",
  accentColor: "#F97316",
  watermark: {
    enabled: true,
    opacity: 0.1,
    scale: 0.5,
    position: "center",
    diagonal: true,
  },
  templateConfig: {
    headerLayout: "logo-right",
    footerLayout: "default",
    contactPlacement: "header",
    accentBar: true,
    accentBarColor: "#7C3AED",
  },
  logoPlacement: "top-right",
  templateId: null,
  profileId: null,
  unlockId: null,
};

describe("getHtmlWatermarkStyle", () => {
  it("returns empty string when watermark disabled", () => {
    const result = getHtmlWatermarkStyle({
      ...baseBranding,
      watermark: { ...baseBranding.watermark, enabled: false },
    });
    expect(result).toBe("");
  });

  it("returns CSS with rotation for diagonal watermark", () => {
    const result = getHtmlWatermarkStyle(baseBranding);
    expect(result).toContain("rotate(-45deg)");
    expect(result).toContain("opacity: 0.1");
  });

  it("returns CSS without rotation for non-diagonal", () => {
    const result = getHtmlWatermarkStyle({
      ...baseBranding,
      watermark: { ...baseBranding.watermark, diagonal: false },
    });
    expect(result).not.toContain("rotate");
    expect(result).toContain("translate(-50%, -50%)");
  });

  it("clamps opacity to min 0.02", () => {
    const result = getHtmlWatermarkStyle({
      ...baseBranding,
      watermark: { ...baseBranding.watermark, opacity: 0.001 },
    });
    expect(result).toContain("opacity: 0.02");
  });

  it("clamps opacity to max 0.3", () => {
    const result = getHtmlWatermarkStyle({
      ...baseBranding,
      watermark: { ...baseBranding.watermark, opacity: 1 },
    });
    expect(result).toContain("opacity: 0.3");
  });

  it("returns img style when logoUrl is set", () => {
    const result = getHtmlWatermarkStyle({
      ...baseBranding,
      logoUrl: "https://example.com/logo.png",
    });
    expect(result).toContain(".pdf-watermark img");
  });

  it("returns text watermark style when no logoUrl", () => {
    const result = getHtmlWatermarkStyle(baseBranding);
    expect(result).toContain("font-size: 60px");
    expect(result).toContain(baseBranding.primaryColor);
  });
});

describe("getHtmlWatermarkElement", () => {
  it("returns empty string when watermark disabled", () => {
    const result = getHtmlWatermarkElement({
      ...baseBranding,
      watermark: { ...baseBranding.watermark, enabled: false },
    });
    expect(result).toBe("");
  });

  it("returns img element when logoUrl is set", () => {
    const result = getHtmlWatermarkElement({
      ...baseBranding,
      logoUrl: "https://example.com/logo.png",
    });
    expect(result).toContain("<img");
    expect(result).toContain("https://example.com/logo.png");
  });

  it("returns text element with brand name when no logoUrl", () => {
    const result = getHtmlWatermarkElement(baseBranding);
    expect(result).toContain("TEST BRAND");
    expect(result).toContain("pdf-watermark");
  });

  it("escapes HTML in brand name", () => {
    const result = getHtmlWatermarkElement({
      ...baseBranding,
      brandName: "<script>alert(1)</script>",
    });
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;SCRIPT&gt;");
  });
});

describe("getHtmlBrandedHeader", () => {
  it("includes brand name", () => {
    const result = getHtmlBrandedHeader(baseBranding);
    expect(result).toContain("Test Brand");
    expect(result).toContain("header");
  });

  it("includes logo img when logoUrl is set", () => {
    const result = getHtmlBrandedHeader({
      ...baseBranding,
      logoUrl: "https://example.com/logo.png",
    });
    expect(result).toContain("<img");
    expect(result).toContain("logo.png");
  });

  it("includes contact info", () => {
    const result = getHtmlBrandedHeader(baseBranding);
    expect(result).toContain("info@test.com");
    expect(result).toContain("+234 800 123");
    expect(result).toContain("123 Main St");
    expect(result).toContain("WhatsApp");
  });

  it("includes tagline when present", () => {
    const result = getHtmlBrandedHeader(baseBranding);
    expect(result).toContain("Quality Work");
  });

  it("omits tagline when null", () => {
    const result = getHtmlBrandedHeader({ ...baseBranding, tagline: null });
    expect(result).not.toContain("italic");
  });

  it("includes primaryColor in border", () => {
    const result = getHtmlBrandedHeader(baseBranding);
    expect(result).toContain("#7C3AED");
  });

  it("escapes HTML in fields", () => {
    const result = getHtmlBrandedHeader({
      ...baseBranding,
      brandName: "<b>X</b>",
    });
    expect(result).toContain("&lt;b&gt;");
    expect(result).not.toContain("<b>X</b>");
  });
});

describe("getHtmlBrandedFooter", () => {
  it("includes 'Powered by FRELUX' for user premium source", () => {
    const result = getHtmlBrandedFooter(baseBranding);
    expect(result).toContain("Powered by FRELUX");
  });

  it("includes 'Generated by' for frelux_default source", () => {
    const result = getHtmlBrandedFooter({
      ...baseBranding,
      source: "frelux_default",
    });
    expect(result).toContain("Generated by");
  });

  it("includes 'Generated by' for safe_fallback source", () => {
    const result = getHtmlBrandedFooter({
      ...baseBranding,
      source: "safe_fallback",
    });
    expect(result).toContain("Generated by");
  });

  it("wraps in footer div", () => {
    const result = getHtmlBrandedFooter(baseBranding);
    expect(result).toContain('class="footer"');
  });
});

describe("getHtmlBrandedStyles", () => {
  it("includes primaryColor", () => {
    const result = getHtmlBrandedStyles(baseBranding);
    expect(result).toContain("#7C3AED");
  });

  it("includes watermark styles when enabled", () => {
    const result = getHtmlBrandedStyles(baseBranding);
    expect(result).toContain("pdf-watermark");
  });

  it("excludes watermark styles when disabled", () => {
    const result = getHtmlBrandedStyles({
      ...baseBranding,
      watermark: { ...baseBranding.watermark, enabled: false },
    });
    expect(result).not.toContain("pdf-watermark");
  });
});
