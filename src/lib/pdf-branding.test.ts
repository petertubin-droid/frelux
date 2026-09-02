import { describe, it, expect } from "vitest";
import {
  getHtmlWatermarkStyle,
  getHtmlWatermarkElement,
  getHtmlBrandedHeader,
  getHtmlBrandedFooter,
  getHtmlBrandedStyles,
  applyJspdfWatermark,
  applyJspdfHeader,
  applyJspdfFooter,
} from "@/lib/pdf-branding";
import type { ResolvedBranding } from "@/lib/brand-studio";

function makeBranding(
  overrides: Partial<ResolvedBranding> = {},
): ResolvedBranding {
  return {
    source: "user_premium",
    brandName: "TestBrand",
    tagline: "Quality First",
    email: "info@test.com",
    phone: "+1234567890",
    address: "123 Test St",
    whatsapp: "+1234567890",
    website: "www.test.com",
    logoUrl: null,
    primaryColor: "#7C3AED",
    secondaryColor: "#6B21A8",
    accentColor: "#A78BFA",
    watermark: {
      enabled: false,
      opacity: 0.1,
      scale: 0.5,
      position: "center",
      diagonal: false,
    },
    templateConfig: null,
    logoPlacement: "top-left",
    templateId: null,
    profileId: null,
    unlockId: null,
    ...overrides,
  };
}

function makeMockDoc() {
  const calls: { method: string; args: unknown[] }[] = [];
  const doc = {
    saveGraphicsState: () =>
      calls.push({ method: "saveGraphicsState", args: [] }),
    restoreGraphicsState: () =>
      calls.push({ method: "restoreGraphicsState", args: [] }),
    setGState: () => calls.push({ method: "setGState", args: [] }),
    GState: (opts: unknown) => {
      calls.push({ method: "GState", args: [opts] });
      return opts;
    },
    setFontSize: (s: number) =>
      calls.push({ method: "setFontSize", args: [s] }),
    setFont: (f: string, s: string) =>
      calls.push({ method: "setFont", args: [f, s] }),
    setTextColor: (...a: unknown[]) =>
      calls.push({ method: "setTextColor", args: a }),
    setFillColor: (...a: unknown[]) =>
      calls.push({ method: "setFillColor", args: a }),
    text: (...a: unknown[]) => calls.push({ method: "text", args: a }),
    rect: (...a: unknown[]) => calls.push({ method: "rect", args: a }),
    addImage: (...a: unknown[]) => calls.push({ method: "addImage", args: a }),
  };
  return { doc: doc as unknown as import("jspdf").jsPDF, calls };
}

describe("PDF Branding — HTML helpers", () => {
  describe("getHtmlWatermarkStyle", () => {
    it("returns empty string when watermark disabled", () => {
      expect(getHtmlWatermarkStyle(makeBranding())).toBe("");
    });

    it("returns text watermark CSS when no logoUrl", () => {
      const b = makeBranding({
        watermark: {
          enabled: true,
          opacity: 0.15,
          scale: 0.5,
          position: "center",
          diagonal: false,
        },
      });
      const css = getHtmlWatermarkStyle(b);
      expect(css).toContain(".pdf-watermark");
      expect(css).toContain("font-size: 60px");
      expect(css).toContain("color: #7C3AED");
      expect(css).toContain("opacity: 0.15");
    });

    it("returns image watermark CSS when logoUrl present", () => {
      const b = makeBranding({
        logoUrl: "https://example.com/logo.png",
        watermark: {
          enabled: true,
          opacity: 0.2,
          scale: 0.5,
          position: "center",
          diagonal: false,
        },
      });
      const css = getHtmlWatermarkStyle(b);
      expect(css).toContain(".pdf-watermark img");
      expect(css).toContain("width: 50%");
    });

    it("applies diagonal rotation when diagonal is true", () => {
      const b = makeBranding({
        watermark: {
          enabled: true,
          opacity: 0.1,
          scale: 0.5,
          position: "center",
          diagonal: true,
        },
      });
      expect(getHtmlWatermarkStyle(b)).toContain("rotate(-45deg)");
    });

    it("does not apply rotation when diagonal is false", () => {
      const b = makeBranding({
        watermark: {
          enabled: true,
          opacity: 0.1,
          scale: 0.5,
          position: "center",
          diagonal: false,
        },
      });
      expect(getHtmlWatermarkStyle(b)).not.toContain("rotate(-45deg)");
    });

    it("clamps opacity to [0.02, 0.3]", () => {
      const tooLow = makeBranding({
        watermark: {
          enabled: true,
          opacity: -0.5,
          scale: 0.5,
          position: "center",
          diagonal: false,
        },
      });
      expect(getHtmlWatermarkStyle(tooLow)).toContain("opacity: 0.02");
      const tooHigh = makeBranding({
        watermark: {
          enabled: true,
          opacity: 1.0,
          scale: 0.5,
          position: "center",
          diagonal: false,
        },
      });
      expect(getHtmlWatermarkStyle(tooHigh)).toContain("opacity: 0.3");
    });

    it("clamps scale to [10, 100]", () => {
      const tooLow = makeBranding({
        logoUrl: "x",
        watermark: {
          enabled: true,
          opacity: 0.1,
          scale: 0.05,
          position: "center",
          diagonal: false,
        },
      });
      expect(getHtmlWatermarkStyle(tooLow)).toContain("width: 10%");
      const tooHigh = makeBranding({
        logoUrl: "x",
        watermark: {
          enabled: true,
          opacity: 0.1,
          scale: 2.0,
          position: "center",
          diagonal: false,
        },
      });
      expect(getHtmlWatermarkStyle(tooHigh)).toContain("width: 100%");
    });
  });

  describe("getHtmlWatermarkElement", () => {
    it("returns empty string when watermark disabled", () => {
      expect(getHtmlWatermarkElement(makeBranding())).toBe("");
    });

    it("returns image element when logoUrl present", () => {
      const b = makeBranding({
        logoUrl: "https://example.com/logo.png",
        watermark: {
          enabled: true,
          opacity: 0.1,
          scale: 0.5,
          position: "center",
          diagonal: false,
        },
      });
      const html = getHtmlWatermarkElement(b);
      expect(html).toContain("<img");
      expect(html).toContain('src="https://example.com/logo.png"');
    });

    it("returns text element with uppercased brand name when no logoUrl", () => {
      const b = makeBranding({
        brandName: "MyBrand",
        watermark: {
          enabled: true,
          opacity: 0.1,
          scale: 0.5,
          position: "center",
          diagonal: false,
        },
      });
      const html = getHtmlWatermarkElement(b);
      expect(html).toContain("MYBRAND");
    });
  });

  describe("getHtmlBrandedHeader", () => {
    it("includes brand name with primary color", () => {
      const html = getHtmlBrandedHeader(
        makeBranding({ brandName: "Acme Corp", primaryColor: "#FF0000" }),
      );
      expect(html).toContain("Acme Corp");
      expect(html).toContain("color: #FF0000");
      expect(html).toContain("border-bottom: 2px solid #FF0000");
    });

    it("includes logo img when logoUrl present", () => {
      const html = getHtmlBrandedHeader(
        makeBranding({ logoUrl: "https://example.com/logo.png" }),
      );
      expect(html).toContain("<img");
    });

    it("includes tagline when present", () => {
      const html = getHtmlBrandedHeader(
        makeBranding({ tagline: "Best in town" }),
      );
      expect(html).toContain("Best in town");
      expect(html).toContain("font-style: italic");
    });

    it("omits tagline section when null", () => {
      const html = getHtmlBrandedHeader(makeBranding({ tagline: null }));
      expect(html).not.toContain("font-style: italic");
    });

    it("includes all contact fields when present", () => {
      const html = getHtmlBrandedHeader(makeBranding());
      expect(html).toContain("123 Test St");
      expect(html).toContain("Tel: +1234567890");
      expect(html).toContain("Email: info@test.com");
      expect(html).toContain("WhatsApp: +1234567890");
      expect(html).toContain("www.test.com");
    });

    it("omits contact fields when null", () => {
      const html = getHtmlBrandedHeader(
        makeBranding({
          address: null,
          phone: null,
          email: null,
          whatsapp: null,
          website: null,
        }),
      );
      expect(html).not.toContain("Tel:");
      expect(html).not.toContain("Email:");
    });

    it("escapes HTML in brand name", () => {
      const html = getHtmlBrandedHeader(
        makeBranding({ brandName: "<script>alert('xss')</script>" }),
      );
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });
  });

  describe("getHtmlBrandedFooter", () => {
    it("shows brand name for frelux_default source", () => {
      const html = getHtmlBrandedFooter(
        makeBranding({ source: "frelux_default", brandName: "FRELUX" }),
      );
      expect(html).toContain("Generated by FRELUX");
      expect(html).not.toContain("Powered by");
    });

    it("shows brand name for safe_fallback source", () => {
      const html = getHtmlBrandedFooter(
        makeBranding({ source: "safe_fallback", brandName: "FRELUX" }),
      );
      expect(html).toContain("Generated by FRELUX");
    });

    it("shows Powered by for user_premium source", () => {
      const html = getHtmlBrandedFooter(
        makeBranding({ source: "user_premium" }),
      );
      expect(html).toContain("Powered by FRELUX PAINT CALC");
    });

    it("shows Powered by for rewarded_ad source", () => {
      const html = getHtmlBrandedFooter(
        makeBranding({ source: "rewarded_ad" }),
      );
      expect(html).toContain("Powered by FRELUX PAINT CALC");
    });
  });

  describe("getHtmlBrandedStyles", () => {
    it("returns watermark styles when enabled", () => {
      const b = makeBranding({
        watermark: {
          enabled: true,
          opacity: 0.1,
          scale: 0.5,
          position: "center",
          diagonal: false,
        },
      });
      expect(getHtmlBrandedStyles(b)).toContain(".pdf-watermark");
    });

    it("does not include watermark CSS when disabled", () => {
      const styles = getHtmlBrandedStyles(makeBranding());
      expect(styles).toContain(".invoice");
      expect(styles).not.toContain(".pdf-watermark");
    });
  });
});

describe("PDF Branding — jsPDF helpers", () => {
  describe("applyJspdfWatermark", () => {
    it("does nothing when watermark disabled", () => {
      const { doc, calls } = makeMockDoc();
      applyJspdfWatermark(doc, makeBranding(), 210, 297);
      expect(calls.length).toBe(0);
    });

    it("applies text watermark when no logoUrl", () => {
      const { doc, calls } = makeMockDoc();
      const b = makeBranding({
        brandName: "TestBrand",
        watermark: {
          enabled: true,
          opacity: 0.15,
          scale: 0.5,
          position: "center",
          diagonal: false,
        },
      });
      applyJspdfWatermark(doc, b, 210, 297);
      const textCall = calls.find((c) => c.method === "text");
      expect(textCall).toBeDefined();
      expect(textCall!.args[0]).toBe("TESTBRAND");
    });

    it("applies diagonal text when diagonal is true", () => {
      const { doc, calls } = makeMockDoc();
      const b = makeBranding({
        brandName: "Diag",
        watermark: {
          enabled: true,
          opacity: 0.15,
          scale: 0.5,
          position: "center",
          diagonal: true,
        },
      });
      applyJspdfWatermark(doc, b, 210, 297);
      const textCall = calls.find((c) => c.method === "text") as any;
      expect(textCall.args[3]).toHaveProperty("angle", 45);
    });

    it("positions image watermark at top-left", () => {
      const { doc, calls } = makeMockDoc();
      const b = makeBranding({
        logoUrl: "logo.png",
        brandName: "X",
        watermark: {
          enabled: true,
          opacity: 0.15,
          scale: 0.5,
          position: "top-left",
          diagonal: false,
        },
      });
      applyJspdfWatermark(doc, b, 210, 297);
      const imgCall = calls.find((c) => c.method === "addImage") as any;
      expect(imgCall).toBeDefined();
      expect(imgCall.args[2]).toBe(20);
      expect(imgCall.args[3]).toBe(20);
    });

    it("positions image watermark at top-right", () => {
      const { doc, calls } = makeMockDoc();
      const b = makeBranding({
        logoUrl: "logo.png",
        brandName: "X",
        watermark: {
          enabled: true,
          opacity: 0.15,
          scale: 0.5,
          position: "top-right",
          diagonal: false,
        },
      });
      applyJspdfWatermark(doc, b, 210, 297);
      const imgCall = calls.find((c) => c.method === "addImage") as any;
      expect(imgCall).toBeDefined();
      expect(imgCall.args[2]).toBe(85);
      expect(imgCall.args[3]).toBe(20);
    });

    it("positions image watermark at bottom-left", () => {
      const { doc, calls } = makeMockDoc();
      const b = makeBranding({
        logoUrl: "logo.png",
        brandName: "X",
        watermark: {
          enabled: true,
          opacity: 0.15,
          scale: 0.5,
          position: "bottom-left",
          diagonal: false,
        },
      });
      applyJspdfWatermark(doc, b, 210, 297);
      const imgCall = calls.find((c) => c.method === "addImage") as any;
      expect(imgCall).toBeDefined();
      expect(imgCall.args[2]).toBe(20);
      expect(imgCall.args[3]).toBe(235);
    });

    it("centers text watermark regardless of position config", () => {
      const { doc, calls } = makeMockDoc();
      const b = makeBranding({
        brandName: "Center",
        watermark: {
          enabled: true,
          opacity: 0.15,
          scale: 0.5,
          position: "top-left",
          diagonal: false,
        },
      });
      applyJspdfWatermark(doc, b, 210, 297);
      const textCall = calls.find((c) => c.method === "text") as any;
      expect(textCall.args[1]).toBe(105);
      expect(textCall.args[2]).toBe(148.5);
    });
  });

  describe("applyJspdfHeader", () => {
    it("draws accent bar when accentBar is true", () => {
      const { doc, calls } = makeMockDoc();
      const b = makeBranding({
        templateConfig: {
          headerLayout: "logo-right",
          footerLayout: "default",
          contactPlacement: "header",
          accentBar: true,
          accentBarColor: "#7C3AED",
        },
      });
      applyJspdfHeader(doc, b, b.templateConfig, 210, 15, 15);
      expect(calls.find((c) => c.method === "rect")).toBeDefined();
    });

    it("does not draw accent bar when accentBar is false", () => {
      const { doc, calls } = makeMockDoc();
      const b = makeBranding({
        templateConfig: {
          headerLayout: "text-only",
          footerLayout: "default",
          contactPlacement: "footer",
          accentBar: false,
        },
      });
      applyJspdfHeader(doc, b, b.templateConfig, 210, 15, 15);
      expect(calls.find((c) => c.method === "rect")).toBeUndefined();
    });

    it("renders brand name", () => {
      const { doc, calls } = makeMockDoc();
      applyJspdfHeader(
        doc,
        makeBranding({ brandName: "MyCompany" }),
        null,
        210,
        15,
        15,
      );
      expect(
        calls.some((c) => c.method === "text" && c.args[0] === "MyCompany"),
      ).toBe(true);
    });

    it("renders tagline when present", () => {
      const { doc, calls } = makeMockDoc();
      applyJspdfHeader(
        doc,
        makeBranding({ tagline: "We build" }),
        null,
        210,
        15,
        15,
      );
      expect(
        calls.some((c) => c.method === "text" && c.args[0] === "We build"),
      ).toBe(true);
    });

    it("renders contact info when contactPlacement is header", () => {
      const { doc, calls } = makeMockDoc();
      const b = makeBranding({
        phone: "+123",
        templateConfig: {
          headerLayout: "text-only",
          footerLayout: "default",
          contactPlacement: "header",
          accentBar: false,
        },
      });
      applyJspdfHeader(doc, b, b.templateConfig, 210, 15, 15);
      expect(
        calls.some(
          (c) => c.method === "text" && String(c.args[0]).includes("Tel:"),
        ),
      ).toBe(true);
    });

    it("does not render contact info when contactPlacement is footer", () => {
      const { doc, calls } = makeMockDoc();
      const b = makeBranding({
        phone: "+123",
        templateConfig: {
          headerLayout: "text-only",
          footerLayout: "default",
          contactPlacement: "footer",
          accentBar: false,
        },
      });
      applyJspdfHeader(doc, b, b.templateConfig, 210, 15, 15);
      expect(
        calls.some(
          (c) => c.method === "text" && String(c.args[0]).includes("Tel:"),
        ),
      ).toBe(false);
    });

    it("returns increased Y position", () => {
      const { doc } = makeMockDoc();
      const newY = applyJspdfHeader(
        doc,
        makeBranding({ tagline: "T", phone: "+1" }),
        null,
        210,
        15,
        15,
      );
      expect(newY).toBeGreaterThan(15);
    });

    it("uses default template config when null", () => {
      const { doc, calls } = makeMockDoc();
      applyJspdfHeader(doc, makeBranding(), null, 210, 15, 15);
      expect(calls.find((c) => c.method === "rect")).toBeDefined();
    });
  });

  describe("applyJspdfFooter", () => {
    it("shows brand name for frelux_default", () => {
      const { doc, calls } = makeMockDoc();
      applyJspdfFooter(
        doc,
        makeBranding({ source: "frelux_default", brandName: "FRELUX" }),
        210,
        297,
        15,
      );
      expect(
        calls.some(
          (c) =>
            c.method === "text" &&
            String(c.args[0]).includes("Generated by FRELUX"),
        ),
      ).toBe(true);
    });

    it("shows Powered by for user_premium", () => {
      const { doc, calls } = makeMockDoc();
      applyJspdfFooter(
        doc,
        makeBranding({ source: "user_premium" }),
        210,
        297,
        15,
      );
      expect(
        calls.some(
          (c) =>
            c.method === "text" &&
            String(c.args[0]).includes("Powered by FRELUX"),
        ),
      ).toBe(true);
    });

    it("renders website when present", () => {
      const { doc, calls } = makeMockDoc();
      applyJspdfFooter(
        doc,
        makeBranding({ website: "www.test.com" }),
        210,
        297,
        15,
      );
      expect(
        calls.some((c) => c.method === "text" && c.args[0] === "www.test.com"),
      ).toBe(true);
    });
  });
});
