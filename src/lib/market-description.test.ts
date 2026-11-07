import { describe, expect, it } from "vitest";
import {
  MARKET_DESCRIPTION_LIMIT,
  marketLandingDescription,
} from "../../scripts/lib/market-description.mjs";
import { marketLandingRoutes } from "../../scripts/market-landing-data.mjs";

/**
 * Market hub meta descriptions were ~370 characters and printed the block
 * dimensions twice. These assertions keep every one of them complete and
 * inside what a search result shows.
 */
describe("market hub meta description", () => {
  const descriptions = marketLandingRoutes.map((m) => ({
    code: m.code,
    market: m,
    text: marketLandingDescription(m) as string,
  }));

  it("covers every configured market", () => {
    expect(descriptions).toHaveLength(32);
  });

  it("stays inside the search-result limit", () => {
    for (const d of descriptions) {
      expect(
        d.text.length,
        `${d.code} is ${d.text.length} characters`,
      ).toBeLessThanOrEqual(MARKET_DESCRIPTION_LIMIT);
    }
  });

  it("ends on a complete sentence rather than a cut word", () => {
    for (const d of descriptions) {
      expect(d.text.trimEnd().endsWith("."), `${d.code}: ${d.text}`).toBe(true);
    }
  });

  it("names the market and never repeats the block dimensions", () => {
    for (const d of descriptions) {
      expect(d.text).toContain(d.market.countryName);
      const dims = `${d.market.blockLengthMm}x${d.market.blockHeightMm}x${d.market.blockWidthMm}mm`;
      const occurrences = d.text.split(dims).length - 1;
      expect(occurrences, `${d.code} repeats ${dims}`).toBeLessThanOrEqual(1);
    }
  });

  it("keeps the local wall unit wherever it fits", () => {
    const withBlock = descriptions.filter((d) =>
      d.text.includes(d.market.blockName),
    );
    expect(withBlock.length).toBeGreaterThan(20);
  });
});
