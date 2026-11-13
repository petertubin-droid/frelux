import { describe, it, expect } from "vitest";
import {
  BUILTIN_MARKET_PROFILES,
  uiLocaleFor,
} from "@/lib/international/market-context";
import { PUBLISHED_MARKET_CODES } from "@/lib/templates-market";

describe("market publishing gate", () => {
  it("publishes only markets with a full local price book", () => {
    // The eleven thin-book markets are configured commercially but must not
    // get generated pages: thin pages are an SEO and AdSense liability.
    for (const code of [
      "AT",
      "BE",
      "DK",
      "FI",
      "IE",
      "MY",
      "NO",
      "PH",
      "PK",
      "PT",
      "TH",
    ]) {
      expect(PUBLISHED_MARKET_CODES).not.toContain(code);
    }
  });

  it("publishes every market it lists, and nothing else", () => {
    expect(PUBLISHED_MARKET_CODES).toEqual(
      BUILTIN_MARKET_PROFILES.map((p) => p.country_code),
    );
  });

  it("never claims a language the interface cannot render", () => {
    for (const profile of BUILTIN_MARKET_PROFILES) {
      const rendered = uiLocaleFor(profile.default_language);
      if (rendered === "en") {
        // English is always safe: it is the origin language.
        continue;
      }
      expect(profile.default_language.toLowerCase().split("-")[0]).toBe(
        rendered,
      );
    }
  });
});
