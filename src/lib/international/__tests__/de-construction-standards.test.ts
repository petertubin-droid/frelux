// ============================================================
// DE (GERMANY) construction standards — sync guard for migration
// 20261015750000 (Engine 1 closeout, priority 13, strict
// one-market-at-a-time flow).
//
// Pins: 2 DE rows only; MBO/LBO with the 16-state adoption
// caveat and 'medium'; DIN EN 13914-1 + DIN 18550-2 as 'high';
// no coverage rates; no unsubstantiated evidence_url;
// idempotency.
// ============================================================

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_MARKET_CODES } from "../capability-registry";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../../../supabase/migrations/20261015750000_de_construction_standards.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("migration 20261015750000 (DE construction standards)", () => {
  it("seeds exactly 2 DE rows for a canonical registry market", () => {
    const rows = Array.from(SQL.matchAll(/\('(DE)', '/g));
    expect(rows.length).toBe(2);
    expect(ALL_MARKET_CODES).toContain("DE");
  });

  it("cites the MBO with the Landesbauordnungen caveat", () => {
    expect(SQL).toContain("'mbo-lbo-model-building-code'");
    expect(SQL).toContain("Musterbauordnung");
    expect(SQL).toContain("Landesbauordnungen");
    const idx = SQL.indexOf("'mbo-lbo-model-building-code'");
    const row = SQL.slice(idx, SQL.indexOf("'),", idx));
    expect(row).toMatch(/'medium'/);
  });

  it("cites DIN EN 13914-1 with DIN 18550 supplementary provisions as high", () => {
    expect(SQL).toContain("'din-en-13914-1-din-18550'");
    expect(SQL).toContain("DIN EN 13914-1:2016");
    expect(SQL).toContain("DIN 18550-2:2015-06");
    const idx = SQL.indexOf("'din-en-13914-1-din-18550'");
    const row = SQL.slice(idx, SQL.indexOf("'),", idx));
    expect(row).toMatch(/'high'/);
  });

  it("asserts no coverage rates and no unsubstantiated evidence_url", () => {
    expect(SQL).not.toMatch(/coverage rate.*\d+(\.\d+)?\s*(m²|sqm|litre)/i);
    expect(SQL).not.toMatch(/evidence_url[^(]*'http/);
  });

  it("is idempotent and additive", () => {
    expect(SQL).toContain(
      "ON CONFLICT (market_code, domain, ref) DO NOTHING;",
    );
    expect(SQL).not.toContain("DROP");
    expect(SQL).not.toContain("DELETE FROM");
  });
});
