import { describe, it, expect } from "vitest";
import {
  normalizeBaseUrl,
  housePromoConfigFrom,
  HOUSE_PROMO_SLUG,
  DEFAULT_CROSS_PROMO_BASE_URL,
} from "@/lib/house-promo";

describe("house-promo", () => {
  it("normalizeBaseUrl adds scheme, strips trailing slashes", () => {
    expect(normalizeBaseUrl("heartsyncx.netlify.app/")).toBe(
      "https://heartsyncx.netlify.app",
    );
    expect(normalizeBaseUrl("https://x.com///")).toBe("https://x.com");
    expect(normalizeBaseUrl("http://plain.io")).toBe("http://plain.io");
  });
  it("normalizeBaseUrl falls back to the default for empty input", () => {
    expect(normalizeBaseUrl(undefined)).toBe(DEFAULT_CROSS_PROMO_BASE_URL);
    expect(normalizeBaseUrl("   ")).toBe(DEFAULT_CROSS_PROMO_BASE_URL);
  });
  it("housePromoConfigFrom returns null when the row is missing or inactive", () => {
    expect(housePromoConfigFrom(null)).toBeNull();
    expect(housePromoConfigFrom([])).toBeNull();
    expect(
      housePromoConfigFrom([
        { slug: HOUSE_PROMO_SLUG, is_active: false, settings: {} },
      ]),
    ).toBeNull();
  });
  it("housePromoConfigFrom normalizes an active config", () => {
    const cfg = housePromoConfigFrom([
      { slug: "other", is_active: true, settings: {} },
      {
        slug: HOUSE_PROMO_SLUG,
        is_active: true,
        settings: {
          format: "card",
          base_url: "somesite.netlify.app/",
          external_promos: [{ url: "https://a.com" }, { label: "B" }],
        },
      },
    ]);
    expect(cfg).not.toBeNull();
    expect(cfg!.enabled).toBe(true);
    expect(cfg!.format).toBe("card");
    expect(cfg!.baseUrl).toBe("https://somesite.netlify.app");
    expect(cfg!.externalPromos).toHaveLength(2);
    expect(cfg!.externalPromos[0].id).toBe("ext-0");
    expect(cfg!.externalPromos[1].label).toBe("B");
  });
  it("housePromoConfigFrom falls back to display format for bad values", () => {
    const cfg = housePromoConfigFrom([
      {
        slug: HOUSE_PROMO_SLUG,
        is_active: true,
        settings: { format: "bogus" },
      },
    ]);
    expect(cfg!.format).toBe("display");
  });
});
