import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ENGINE_CAPABILITIES,
  ALL_MARKET_CODES,
  getEngineCapability,
  resolveCapability,
  defaultSeedAvailability,
} from "../capability-registry";

const MIGRATION_DIR = resolve(__dirname, "../../../../supabase/migrations");
// The canonical constraint/seed is the UNION of the original registry
// migration and the 2026-10-13 reconciliation migration (54 engines).
const MIGRATION_SQL =
  readFileSync(
    MIGRATION_DIR + "/20261014130000_engine_capability_registry.sql",
    "utf8",
  ) +
  "\n" +
  readFileSync(
    MIGRATION_DIR + "/20261014160000_reconcile_engine_registry.sql",
    "utf8",
  );

describe("capability-registry", () => {
  it("covers the 20 mandate markets", () => {
    expect(ALL_MARKET_CODES).toHaveLength(20);
    expect(ALL_MARKET_CODES).toContain("NG");
    expect(ALL_MARKET_CODES).toContain("IT");
  });

  it("every engine has unique ids, names and evidence", () => {
    const ids = ENGINE_CAPABILITIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of ENGINE_CAPABILITIES) {
      expect(e.name.length).toBeGreaterThan(0);
      expect(e.evidence.length).toBeGreaterThan(0);
      expect(e.unverifiedReason.length).toBeGreaterThan(0);
      expect(e.verifiedMarkets.length).toBeGreaterThan(0);
    }
  });

  it("every verified market is a registered 20-market code", () => {
    for (const e of ENGINE_CAPABILITIES) {
      for (const mk of e.verifiedMarkets) {
        expect(ALL_MARKET_CODES).toContain(mk);
      }
    }
  });

  it("NG is verified for the classic engines, preserving existing behaviour", () => {
    for (const id of [
      "painting",
      "screeding",
      "pop_ceiling",
      "tile",
      "tyrolene",
      "grafitex",
      "block",
      "roofing",
      "cost_estimator",
      "foundation",
      "structural",
      "build_to_roof",
    ] as const) {
      expect(getEngineCapability(id)?.verifiedMarkets).toContain("NG");
    }
  });

  it("the 15-market finishing set is verified for the finishing engines", () => {
    const finishingMarkets = [
      "NG",
      "US",
      "GB",
      "CA",
      "AU",
      "DE",
      "IN",
      "GH",
      "KE",
      "ZA",
      "JP",
      "FR",
      "BR",
      "SA",
      "AE",
    ];
    for (const id of [
      "painting",
      "screeding",
      "pop_ceiling",
      "tile",
      "wall_finishing",
    ] as const) {
      const cap = getEngineCapability(id);
      expect(cap?.verifiedMarkets).toEqual(finishingMarkets);
    }
    // CN/ID/MX/KR/IT are NOT verified for finishing engines yet
    for (const id of ["painting", "wall_finishing"] as const) {
      const cap = getEngineCapability(id);
      for (const mk of ["CN", "ID", "MX", "KR", "IT"]) {
        expect(cap?.verifiedMarkets).not.toContain(mk);
      }
    }
  });

  it("resolves the five states correctly", () => {
    // enabled: verified pair, no row
    expect(resolveCapability("painting", "KE", null)?.state).toBe("enabled");
    // disabled: admin row wins over verified
    expect(
      resolveCapability("painting", "KE", {
        calculator_type: "painting",
        is_available: false,
      })?.state,
    ).toBe("disabled");
    // requires_verification: DB row claims available but pair not verified
    const rv = resolveCapability("block", "KE", {
      calculator_type: "block",
      is_available: true,
    });
    expect(rv?.state).toBe("requires_verification");
    expect(rv?.reason).toContain("cannot take effect");
    // not_implemented: NG-bound method engine, no row
    expect(resolveCapability("build_to_roof", "US", null)?.state).toBe(
      "not_implemented",
    );
    // requires_verification: portable engine, no row
    expect(resolveCapability("solar_pv", "GB", null)?.state).toBe(
      "requires_verification",
    );
    // unknown engine
    expect(resolveCapability("warp_drive", "NG", null)).toBeNull();
  });

  it("defaultSeedAvailability only seeds verified pairs", () => {
    expect(defaultSeedAvailability("painting", "NG")).toBe(true);
    expect(defaultSeedAvailability("painting", "CN")).toBe(false);
    expect(defaultSeedAvailability("build_to_roof", "US")).toBe(false);
    expect(defaultSeedAvailability("unknown_engine", "NG")).toBe(false);
  });
});

describe("migration 20261014130000 stays in sync with the registry", () => {
  it("the CHECK constraint allows exactly the canonical engine ids", () => {
    // The constraint may be (re)defined across several migrations; the
    // canonical set is the union of every CHECK list in the combined SQL.
    const checks = MIGRATION_SQL.matchAll(
      /CHECK \(calculator_type (?:IN \(|= ANY \(ARRAY\[)([\s\S]*?)\)?\]?\)?\);/g,
    );
    const ids = Array.from(checks)
      .flatMap((c) => Array.from(c[1].matchAll(/'([a-z_]+)'/g)).map((m) => m[1]));
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ENGINE_CAPABILITIES.length);
    for (const e of ENGINE_CAPABILITIES) {
      expect(ids).toContain(e.id);
    }
  });

  it("the verified-pairs seed matches the registry exactly", () => {
    const seeds = MIGRATION_SQL.matchAll(
      /INSERT INTO engine_capability_verified \(engine_id, market_code\) VALUES\n([\s\S]*?)\nON CONFLICT/g,
    );
    const pairs = new Set(
      Array.from(seeds).flatMap((seed) =>
        Array.from(seed[1].matchAll(/'([a-z_]+)',\s*'([A-Z]{2})'\)/g)).map(
          (m) => `${m[1]}:${m[2]}`,
        ),
      ),
    );
    const registryPairs = new Set(
      ENGINE_CAPABILITIES.flatMap((e) =>
        e.verifiedMarkets.map((mk) => `${e.id}:${mk}`),
      ),
    );
    expect(pairs.size).toBe(registryPairs.size);
    expect([...registryPairs].every((p) => pairs.has(p))).toBe(true);
    expect([...pairs].every((p) => registryPairs.has(p))).toBe(true);
  });

  it("seeds market_calculator_config from verified pairs only, preserving admin rows", () => {
    expect(MIGRATION_SQL).toContain(
      "INSERT INTO market_calculator_config (market_code, calculator_type, is_available, config, labels)",
    );
    expect(MIGRATION_SQL).toContain(
      "ON CONFLICT (market_code, calculator_type) DO NOTHING;",
    );
  });
});
