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

// ── Phase 2 (2026-10-27): one-file market bundles ──────────────────────
import { MARKET_BUNDLES, getMarketBundle } from "@/lib/international/markets";
import type { MarketBundle } from "@/lib/international/markets";

describe("globalization completeness — per-market bundle files", () => {
  it("every one of the 32 markets has a complete bundle (no null slots)", () => {
    for (const code of ALL_MARKET_CODES) {
      const b = MARKET_BUNDLES[code];
      expect(b, `market bundle for ${code}`).toBeDefined();
      expect(b.code).toBe(code);
      expect(b.electrical.marketCode).toBe(code);
      expect(b.plumbing.marketCode).toBe(code);
      expect(b.masonry.marketCode).toBe(code);
      // DrywallMarketProfile carries board geometry, not a marketCode
      expect(b.drywall.boardWidthMm).toBeGreaterThan(0);
      expect(b.drywall.boardLengthMm).toBeGreaterThan(0);
      expect(b.cementBagWeightKg).toBeGreaterThan(0);
      expect(b.wallFinishing.code).toBe(code);
    }
  });

  it("bundle keys exactly match their declared market codes (no drift)", () => {
    for (const [key, bundle] of Object.entries(MARKET_BUNDLES)) {
      expect(bundle.code, `bundle ${key}`).toBe(key);
    }
  });

  it("the composed registries are built from the bundles (single source)", () => {
    for (const code of ALL_MARKET_CODES) {
      expect(ELECTRICAL_PROFILES[code]).toBe(MARKET_BUNDLES[code].electrical);
      expect(PLUMBING_PROFILES[code]).toBe(MARKET_BUNDLES[code].plumbing);
    }
  });

  it("getMarketBundle returns null for unknown markets - no invented bundles", () => {
    expect(getMarketBundle("XX")).toBeNull();
    expect(getMarketBundle("")).toBeNull();
  });
});

// ── Phase 3 (2026-10-27): market landing pages ──────────────────────────
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { marketLandingRoutes } from "../../../../scripts/market-landing-data.mjs";

describe("globalization completeness — market landing pages (Phase 3)", () => {
  it("there is exactly one landing-page entry per market (32, unique)", () => {
    expect(marketLandingRoutes).toHaveLength(32);
    const codes = marketLandingRoutes.map((m) => m.code);
    expect(new Set(codes).size).toBe(32);
    for (const code of ALL_MARKET_CODES) {
      expect(codes).toContain(code);
    }
  });

  it("landing data matches the TS bundles exactly - no drift, no invention", () => {
    for (const m of marketLandingRoutes) {
      const b = MARKET_BUNDLES[m.code];
      expect(b, `bundle for ${m.code}`).toBeDefined();
      expect(m.countryName).toBe(b.masonry.countryName);
      expect(m.currency).toBe(b.wallFinishing.currency);
      expect(m.currencySymbol).toBe(b.wallFinishing.currencySymbol);
      expect(m.blockName).toBe(b.masonry.defaultUnit.name);
      expect(m.blockLengthMm).toBe(b.masonry.defaultUnit.lengthMm);
      expect(m.blockHeightMm).toBe(b.masonry.defaultUnit.heightMm);
      expect(m.blockWidthMm).toBe(b.masonry.defaultUnit.widthMm);
      expect(m.cementBagKg).toBe(b.cementBagWeightKg);
      expect(m.electricalStandard).toBe(b.electrical.standardsRef);
      expect(m.electricalVoltage).toBe(b.electrical.nominalVoltage);
      expect(m.plumbingStandard).toBe(b.plumbing.standardsRef);
    }
  });

  it("the prerender, sitemap and SEO map all include the 32 market routes", () => {
    const root = process.cwd();
    const prerenderSrc = readFileSync(
      join(root, "scripts/prerender.mjs"),
      "utf8",
    );
    const sitemapSrc = readFileSync(
      join(root, "scripts/generate-sitemap.mjs"),
      "utf8",
    );
    const seoMapSrc = readFileSync(
      join(root, "scripts/seo-content-map.mjs"),
      "utf8",
    );
    expect(prerenderSrc).toContain("market-landing-data.mjs");
    expect(sitemapSrc).toContain("marketLandingRoutes");
    expect(seoMapSrc).toContain("marketLandingSeo");
    // app route exists
    const appSrc = readFileSync(join(root, "src/App.tsx"), "utf8");
    expect(appSrc).toContain('path="/market/:code"');
  });

  it("generated sitemap contains all 32 market URLs (after a build)", () => {
    const sitemapPath = join(process.cwd(), "dist/sitemap.xml");
    if (!existsSync(sitemapPath)) return; // skips in CI before Build step
    const xml = readFileSync(sitemapPath, "utf8");
    for (const m of marketLandingRoutes) {
      expect(xml).toContain(
        `https://freluxtools.netlify.app/market/${m.code.toLowerCase()}`,
      );
    }
  });
});
