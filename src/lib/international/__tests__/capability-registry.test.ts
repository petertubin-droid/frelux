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
  ) +
  "\n" +
  readFileSync(
    MIGRATION_DIR + "/20261015163000_it_engine_capability_verified.sql",
    "utf8",
  ) +
  "\n" +
  readFileSync(
    MIGRATION_DIR + "/20261015164000_it_capability_pair_fix.sql",
    "utf8",
  ) +
  "\n" +
  readFileSync(
    MIGRATION_DIR + "/20261024120000_capability_all_32_markets.sql",
    "utf8",
  );

describe("capability-registry", () => {
  it("covers the 32 website markets", () => {
    expect(ALL_MARKET_CODES).toHaveLength(32);
    expect(ALL_MARKET_CODES).toContain("NG");
    expect(ALL_MARKET_CODES).toContain("IT");
    // 2026-10-16 globalization wave: the final 12 markets registered
    expect(ALL_MARKET_CODES).toContain("ET");
    expect(ALL_MARKET_CODES).toContain("NZ");
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

  it("every approved market is verified for every engine (owner-directed 2026-10-24)", () => {
    // Owner approval 2026-10-24: all 32 approved markets verified for
    // all 54 engines under the market-first + local-price-entry
    // standard (no cross-market substitution, regression-guarded).
    for (const e of ENGINE_CAPABILITIES) {
      expect(e.verifiedMarkets).toEqual(ALL_MARKET_CODES);
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
    // Owner-directed 2026-10-24: block:KE is a verified pair now, so
    // an admin availability row resolves enabled (verified pairs win).
    const rv = resolveCapability("block", "KE", {
      calculator_type: "block",
      is_available: true,
    });
    expect(rv?.state).toBe("enabled");
    // Owner-directed 2026-10-24: all approved markets are verified, so
    // build_to_roof for US resolves enabled (market-first pricing with
    // explicit local-price entry where the US book has gaps).
    expect(resolveCapability("build_to_roof", "US", null)?.state).toBe(
      "enabled",
    );
    // Owner-directed 2026-10-24: all approved pairs are verified, so
    // solar_pv for GB resolves enabled (missing GB price-book items
    // require explicit local price entry, disclosed per estimate).
    expect(resolveCapability("solar_pv", "GB", null)?.state).toBe("enabled");
    // unknown engine
    expect(resolveCapability("warp_drive", "NG", null)).toBeNull();
  });

  it("defaultSeedAvailability seeds every approved pair (owner-directed 2026-10-24)", () => {
    expect(defaultSeedAvailability("painting", "NG")).toBe(true);
    expect(defaultSeedAvailability("painting", "CN")).toBe(true);
    expect(defaultSeedAvailability("build_to_roof", "US")).toBe(true);
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
    const ids = Array.from(checks).flatMap((c) =>
      Array.from(c[1].matchAll(/'([a-z_]+)'/g)).map((m) => m[1]),
    );
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ENGINE_CAPABILITIES.length);
    for (const e of ENGINE_CAPABILITIES) {
      expect(ids).toContain(e.id);
    }
  });

  it("the verified-pairs seed matches the registry exactly", () => {
    // Model the SQL sequentially: a later INSERT re-adds a pair an
    // earlier corrective DELETE removed (chronological truth).
    const inserts = Array.from(
      MIGRATION_SQL.matchAll(
        /INSERT INTO engine_capability_verified \(engine_id, market_code\) VALUES\n([\s\S]*?)\nON CONFLICT/g,
      ),
      (m) => ({
        op: "insert" as const,
        at: m.index ?? 0,
        body: m[1],
      }),
    );
    const deletes = Array.from(
      MIGRATION_SQL.matchAll(
        /DELETE FROM engine_capability_verified\s+WHERE market_code = '([A-Z]{2})'\s+AND engine_id IN \(([^)]+)\)/g,
      ),
      (m) => ({
        op: "delete" as const,
        at: m.index ?? 0,
        code: m[1],
        engines: m[2],
      }),
    );
    const orderedPairs = new Set<string>();
    for (const st of [...inserts, ...deletes].sort((a, b) => a.at - b.at)) {
      if (st.op === "insert") {
        for (const m of st.body.matchAll(/'([a-z_]+)',\s*'([A-Z]{2})'\)/g)) {
          orderedPairs.add(`${m[1]}:${m[2]}`);
        }
      } else {
        for (const eng of st.engines.matchAll(/'([a-z_]+)'/g)) {
          orderedPairs.delete(`${eng[1]}:${st.code}`);
        }
      }
    }
    const legacyPairs = new Set(
      ENGINE_CAPABILITIES.flatMap((e) =>
        e.verifiedMarkets.map((mk) => `${e.id}:${mk}`),
      ),
    );
    // the sequential net seeded state must equal the code registry
    expect(orderedPairs.size).toBe(legacyPairs.size);
    expect([...legacyPairs].every((p) => orderedPairs.has(p))).toBe(true);
    expect([...orderedPairs].every((p) => legacyPairs.has(p))).toBe(true);
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
