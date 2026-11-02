// ============================================================
// ROLLOUT STANDARDS — CN / IT / NG / AE (Engine 1 closeouts,
// priorities 3/4/5/7). Sync guard for migration
// 20261015162000 — the one combined migration recorded before
// the owner directed strictly one-market-at-a-time work (kept
// as recorded production history; every future market gets its
// own migration + guard).
//
// Pins: per-market row counts and refs, jurisdiction caveats
// (CN provincial enforcement, IT seismic zones, NG state-level
// enforcement, AE emirate-level codes), IT role mappings wired
// only to materials whose EUR prices were verified live, no
// fabricated finishing prices for CN, idempotency.
// ============================================================

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_MARKET_CODES } from "../capability-registry";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../../../supabase/migrations/20261015162000_rollout_standards_cn_it_ng_ae.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

const standardsRows = () =>
  Array.from(SQL.matchAll(/\('([A-Z]{2})', '[a-z0-9_]+',/g)).map((m) => m[1]);

describe("migration 20261015162000 (rollout standards CN/IT/NG/AE)", () => {
  it("seeds only canonical registry markets, 10 standards rows total", () => {
    const rows = standardsRows();
    expect(rows.length).toBe(10);
    for (const mk of rows) {
      expect(ALL_MARKET_CODES).toContain(mk);
    }
    // CN 3, IT 3, NG 2, AE 2 (a third AE row: Knauf MP75 datasheet predated this migration)
    const counts: Record<string, number> = {};
    for (const mk of rows) counts[mk] = (counts[mk] ?? 0) + 1;
    expect(counts).toEqual({ CN: 3, IT: 3, NG: 2, AE: 2 });
  });

  it("CN seeds its national codes with the provincial-enforcement caveat, never fabricated prices", () => {
    for (const ref of ["gb-50009", "gb-50210", "gb-t-9775"]) {
      expect(SQL).toContain(ref);
    }
    const cnIdx = SQL.indexOf("'gb-50009'");
    const cnRow = SQL.slice(cnIdx, SQL.indexOf("'),", cnIdx));
    expect(cnRow).toMatch(/province|local/i);
    // CN has NO finishing price book — the migration must not invent one.
    expect(SQL).not.toMatch(/VALUES \(('cn-[a-z-]+')/);
    expect(SQL).not.toContain("INSERT INTO estimation_prices");
  });

  it("IT seeds NTC 2018 with the seismic-zone caveat and UNI product standards", () => {
    for (const ref of ["ntc-2018", "uni-en-998-1", "uni-en-13279"]) {
      expect(SQL).toContain(ref);
    }
    const ntcIdx = SQL.indexOf("'ntc-2018'");
    const ntcRow = SQL.slice(ntcIdx, SQL.indexOf("'),", ntcIdx));
    expect(ntcRow).toMatch(/seismic|municipality/i);
  });

  it("NG seeds the National Building Code + Lagos state regulations with honest scope", () => {
    expect(SQL).toContain("'national-building-code-2006'");
    expect(SQL).toContain("'lagos-state-planning-regulations'");
    const lagosIdx = SQL.indexOf("'lagos-state-planning-regulations'");
    const lagosRow = SQL.slice(lagosIdx, SQL.indexOf("'),", lagosIdx));
    expect(lagosRow).toMatch(/LAGOS-ONLY|never apply Lagos rules elsewhere/i);
  });

  it("AE seeds emirate-level codes with the emirate caveat", () => {
    for (const ref of [
      "uae-fire-life-safety-code",
      "abu-dhabi-international-building-codes",
    ]) {
      expect(SQL).toContain(ref);
      const idx = SQL.indexOf(`'${ref}'`);
      const row = SQL.slice(idx, SQL.indexOf("'),", idx));
      expect(row).toMatch(/emirate|DUBAI|ABU DHABI-ONLY/i);
    }
  });

  it("IT role mappings wire only live-verified priced materials (8 roles)", () => {
    const roles = Array.from(
      SQL.matchAll(/\('([a-z-]+)', '(it-[a-z0-9-]+|gen-[a-z-]+)'/g),
    ).map((m) => m[1]);
    expect(roles.length).toBe(8);
    for (const r of [
      "interior-paint",
      "exterior-paint",
      "primer",
      "joint-filler",
      "sand",
      "concrete-mix",
      "waterproofer",
      "sandpaper",
    ]) {
      expect(roles).toContain(r);
    }
    // every mapped row cites its EUR price evidence
    expect(SQL.match(/priced EUR/g)?.length).toBe(8);
  });

  it("every standards row carries a confidence rating consistent with its evidence", () => {
    const confidences = Array.from(
      SQL.matchAll(/'(high|medium|low)', '\d{4}-\d{2}-\d{2}'\)/g),
    ).map((m) => m[1]);
    expect(confidences.length).toBe(10);
    // product standards (GB/T 9775, UNI EN 998-1, UNI EN 13279) are high;
    // jurisdiction-dependent codes are medium.
    expect(confidences.filter((c) => c === "high").length).toBe(3);
    expect(confidences.filter((c) => c === "medium").length).toBe(7);
  });

  it("standards seeds are idempotent and role mappings are existence-guarded", () => {
    expect(SQL).toContain(
      "ON CONFLICT (market_code, domain, ref) DO NOTHING;",
    );
    expect(SQL).toContain("WHERE NOT EXISTS");
  });

  it("never stores an evidence_url it cannot substantiate", () => {
    expect(SQL).not.toMatch(/evidence_url[^(]*'http/);
  });
});
