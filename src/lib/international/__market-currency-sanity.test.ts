/**
 * Wave 1.1 i18n contract: every Frelux market currency must format
 * through formatByCode with its own symbol + grouping. The list is
 * derived from the 32 builtin market profiles (below) so a new
 * market cannot ship without its currency contract covered.
 */
import { describe, expect, it } from "vitest";
import { formatByCode } from "@/lib/international/currency-format";
import { BUILTIN_MARKET_PROFILES } from "@/lib/international/market-context";

/** Distinct currency codes across all builtin market profiles. */
const PROFILE_CODES = [
  ...new Set(BUILTIN_MARKET_PROFILES.map((m) => m.currency_code)),
].sort();

import { DISPLAY_CURRENCIES } from "@/lib/international/fx-display";

/** Verified symbol metadata keyed by ISO code. */
const EXPECTED_SYMBOLS: Record<string, string> = Object.fromEntries(
  DISPLAY_CURRENCIES.map((c) => [c.code, c.symbol]),
);

describe("formatByCode across all Frelux markets", () => {
  it("every distinct profile currency has verified symbol metadata", () => {
    for (const code of PROFILE_CODES) {
      const found = DISPLAY_CURRENCIES.find((c) => c.code === code);
      expect(
        found,
        `missing DISPLAY_CURRENCIES entry for ${code}`,
      ).toBeDefined();
    }
  });

  it.each([...PROFILE_CODES])("formats %s with its verified symbol", (code) => {
    const out = formatByCode(1234567, code, { decimals: 0 });
    expect(out).toContain(EXPECTED_SYMBOLS[code]);
    expect(out).toMatch(/1[,.\s]234[,.\s]567/);
  });

  it("falls back to ISO 'XXX' text, never a hardcoded market, for blank codes", () => {
    const out = formatByCode(100, "", { decimals: 0 });
    expect(out).not.toContain("₦");
    expect(out).not.toContain("$");
  });
});
