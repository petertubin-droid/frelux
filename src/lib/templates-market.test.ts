/**
 * Market × template globalization contract (2026-10-29).
 *
 * FRELUX publishes every calculator template in all 32 markets at
 * /market/<code>/templates/<slug>. Because visibility depends on SEO, each
 * market page must carry its own canonical, a complete hreflang family, and
 * genuinely different copy (currency, units, country) — otherwise Google sees
 * 1,280 near-duplicate pages and indexes none of them.
 */
import { describe, expect, it } from "vitest";
import {
  buildMarketTemplateSeo,
  buildMarketTemplatesHubSeo,
  getTemplateMarketProfile,
  listTemplateMarkets,
  marketTemplatePath,
  marketTemplatesPath,
  resolveTemplateMarketContext,
  templateMarketAlternates,
} from "./templates-market";

const SOURCE = {
  name: "Standard Living Room",
  slug: "standard-living-room-painting",
  type: "paint" as const,
  description: "A 4 × 5 m living room repaint.",
  seoDescription: "Paint quantities and costs for a standard living room.",
};

describe("market registry", () => {
  it("exposes all 32 markets", () => {
    expect(listTemplateMarkets()).toHaveLength(32);
  });

  it("resolves any market by code, case-insensitively", () => {
    expect(getTemplateMarketProfile("de")?.country_name).toBe("Germany");
    expect(getTemplateMarketProfile("NG")?.country_name).toBe("Nigeria");
  });

  it("returns null for a market FRELUX does not cover", () => {
    expect(getTemplateMarketProfile("zz")).toBeNull();
    expect(getTemplateMarketProfile(null)).toBeNull();
  });

  it("builds a resolved context with the market's own currency and units", () => {
    const de = getTemplateMarketProfile("DE")!;
    const ctx = resolveTemplateMarketContext(de);
    expect(ctx.marketCode).toBe("DE");
    expect(ctx.currencyCode).toBe("EUR");
    expect(ctx.countryName).toBe("Germany");
  });
});

describe("market template paths", () => {
  it("uses lowercase market codes in URLs", () => {
    expect(marketTemplatesPath("DE")).toBe("/market/de/templates");
    expect(marketTemplatePath("NG", "x")).toBe("/market/ng/templates/x");
  });
});

describe("market template SEO", () => {
  const markets = listTemplateMarkets();

  it("produces a unique title and description per market", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const profile of markets) {
      const seo = buildMarketTemplateSeo(SOURCE, profile);
      titles.add(seo.title);
      descriptions.add(seo.description);
      // The country must be named in the title so the page can rank for it.
      expect(seo.title).toContain(profile.country_name);
      // Currency must be stated in the description (price-basis honesty).
      expect(seo.description).toContain(profile.currency_code);
    }
    expect(titles.size).toBe(markets.length);
    expect(descriptions.size).toBe(markets.length);
  });

  it("keeps descriptions within a search-snippet length", () => {
    for (const profile of markets) {
      const seo = buildMarketTemplateSeo(SOURCE, profile);
      expect(seo.description.length).toBeLessThanOrEqual(220);
      expect(seo.title.length).toBeLessThanOrEqual(100);
    }
  });

  it("self-canonicalizes each market page", () => {
    const de = getTemplateMarketProfile("DE")!;
    const seo = buildMarketTemplateSeo(SOURCE, de);
    expect(seo.canonicalPath).toBe(
      "/market/de/templates/standard-living-room-painting",
    );
  });

  it("declares 32 market alternates plus x-default", () => {
    const alternates = templateMarketAlternates(SOURCE.slug);
    expect(alternates).toHaveLength(33);
    const langs = alternates.map((a) => a.hreflang);
    expect(langs).toContain("x-default");
    expect(new Set(langs).size).toBe(33); // no duplicate hreflang values
    for (const a of alternates) {
      expect(a.href).toMatch(/^https:\/\/freluxtools\.com\//);
    }
  });

  it("every market alternate resolves to that market's template URL", () => {
    for (const a of templateMarketAlternates(SOURCE.slug)) {
      if (a.hreflang === "x-default") continue;
      expect(a.href).toContain(
        `/market/${a.hreflang}/templates/${SOURCE.slug}/`,
      );
    }
  });
});

describe("market template hub SEO", () => {
  it("names the country and states the currency", () => {
    const ng = getTemplateMarketProfile("NG")!;
    const seo = buildMarketTemplatesHubSeo(ng);
    expect(seo.title).toContain("Nigeria");
    expect(seo.description).toContain("NGN");
    expect(seo.canonicalPath).toBe("/market/ng/templates");
    expect(seo.alternates).toHaveLength(33);
  });
});
