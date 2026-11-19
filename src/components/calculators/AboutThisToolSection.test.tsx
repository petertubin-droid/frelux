import { describe, expect, it } from "vitest";
import { ABOUT_TOOL_ROUTES, getAboutToolConfig, getAboutToolFaqs } from "@/config/about-this-tool";

describe("About This Tool content registry", () => {
  it("covers every existing catalogued tool route without changing the catalog", () => {
    expect(ABOUT_TOOL_ROUTES.length).toBeGreaterThan(0);
    for (const route of ABOUT_TOOL_ROUTES) {
      const content = getAboutToolConfig(route);
      expect(content, route).toBeDefined();
      expect(content?.route).toBe(route);
      expect(content?.scope.trim().length).toBeGreaterThan(0);
      expect(content?.inputs.trim().length).toBeGreaterThan(0);
      expect(content?.result.trim().length).toBeGreaterThan(0);
    }
  });

  it("uses the existing FAQ registry and does not invent FAQ schema copy", () => {
    const route = "/paint-calculator";
    const faqs = getAboutToolFaqs(route);
    expect(faqs.length).toBeGreaterThan(0);
    expect(faqs[0]).toHaveProperty("question");
    expect(faqs[0]).toHaveProperty("answer");
  });

  it("does not publish unverified formula, market standard, or rate assertions", () => {
    for (const route of ABOUT_TOOL_ROUTES) {
      const content = getAboutToolConfig(route)!;
      if (route !== "/paint-calculator" && route !== "/tile-calculator") {
        expect(content.verifiedFormula).toBeUndefined();
        expect(content.verifiedAssumptions).toBeUndefined();
        expect(content.verifiedStandards).toBeUndefined();
      }
    }
  });
});
