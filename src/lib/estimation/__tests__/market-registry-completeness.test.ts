/**
 * Globalization completeness gate (2026-10-27).
 *
 * FRELUX supports 32 markets. Every per-market engine registry must carry a
 * REAL, standard-referenced profile for each of them — not a generic
 * fallback. This test fails CI if any registry drops below full coverage,
 * so a new market can never ship with silent fallback profiles.
 *
 * Honesty contract: fallbacks remain for hypothetical/unknown market codes
 * at runtime, but none of the 32 approved markets may resolve to one.
 */
import { describe, expect, it } from "vitest";
import { ALL_MARKET_CODES } from "@/lib/international/capability-registry";
import { ELECTRICAL_PROFILES } from "../electrical-profiles";
import { PLUMBING_PROFILES } from "../plumbing-profiles";
import { MASONRY_MARKET_REGISTRY } from "../masonry-standalone-engine";
import { DRYWALL_MARKET_PROFILES } from "../drywall-standalone-engine";
import { CEMENT_BAG_WEIGHT_BY_MARKET } from "../plastering-standalone-engine";
import { WALLFIN_COUNTRY_PROFILES } from "@/lib/wallfinishing/countries";

const EXPECTED_MARKET_COUNT = 32;

function registryKeys(obj: Record<string, unknown>): Set<string> {
  return new Set(Object.keys(obj));
}

describe("globalization completeness — every market registry covers all 32 markets", () => {
  it("the canonical market list has exactly 32 markets", () => {
    expect(ALL_MARKET_CODES).toHaveLength(EXPECTED_MARKET_COUNT);
    expect(new Set(ALL_MARKET_CODES).size).toBe(EXPECTED_MARKET_COUNT);
  });

  it("electrical profiles cover all 32 markets with real profiles", () => {
    const keys = registryKeys(ELECTRICAL_PROFILES);
    const missing = ALL_MARKET_CODES.filter((c) => !keys.has(c));
    expect(missing).toEqual([]);
    expect(keys.size).toBeGreaterThanOrEqual(EXPECTED_MARKET_COUNT);
  });

  it("plumbing profiles cover all 32 markets with real profiles", () => {
    const keys = registryKeys(PLUMBING_PROFILES);
    const missing = ALL_MARKET_CODES.filter((c) => !keys.has(c));
    expect(missing).toEqual([]);
    expect(keys.size).toBeGreaterThanOrEqual(EXPECTED_MARKET_COUNT);
  });

  it("masonry registry covers all 32 markets", () => {
    const keys = registryKeys(MASONRY_MARKET_REGISTRY);
    const missing = ALL_MARKET_CODES.filter((c) => !keys.has(c));
    expect(missing).toEqual([]);
  });

  it("drywall profiles cover all 32 markets", () => {
    const keys = registryKeys(DRYWALL_MARKET_PROFILES);
    const missing = ALL_MARKET_CODES.filter((c) => !keys.has(c));
    expect(missing).toEqual([]);
  });

  it("plastering cement-bag weights cover all 32 markets", () => {
    const keys = registryKeys(CEMENT_BAG_WEIGHT_BY_MARKET);
    const missing = ALL_MARKET_CODES.filter((c) => !keys.has(c));
    expect(missing).toEqual([]);
  });

  it("wall-finishing country profiles cover all 32 markets", () => {
    const codes: string[] = WALLFIN_COUNTRY_PROFILES.map(
      (p) => p.code as string,
    );
    const missing = ALL_MARKET_CODES.filter((c) => !codes.includes(c));
    expect(missing).toEqual([]);
    expect(WALLFIN_COUNTRY_PROFILES).toHaveLength(EXPECTED_MARKET_COUNT);
  });

  it("every electrical profile is market-referenced and standard-cited (no generic fallbacks among the 32)", () => {
    for (const code of ALL_MARKET_CODES) {
      const p = ELECTRICAL_PROFILES[code];
      expect(p, `electrical profile for ${code}`).toBeDefined();
      expect(p.marketCode).toBe(code);
      expect(p.standardsRef).toBeTruthy();
      // Generic fallback profiles carry the placeholder name pattern;
      // real profiles must name their market in `name`.
      expect(p.name).not.toMatch(/Local (Electrical|Plumbing) Practice/);
    }
  });

  it("every plumbing profile is market-referenced and standard-cited (no generic fallbacks among the 32)", () => {
    for (const code of ALL_MARKET_CODES) {
      const p = PLUMBING_PROFILES[code];
      expect(p, `plumbing profile for ${code}`).toBeDefined();
      expect(p.marketCode).toBe(code);
      expect(p.standardsRef).toBeTruthy();
      expect(p.name).not.toMatch(/Local (Electrical|Plumbing) Practice/);
    }
  });
});
