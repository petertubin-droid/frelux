// ============================================================
// JP (JAPAN) construction standards — sync guard for migration
// 20261015770000 (Engine 1 closeout, priority 15, strict
// one-market-at-a-time flow).
//
// Pins: 2 JP rows only; the Building Standards Act (1950) with
// the confirmation-process caveat and 'medium'; JIS A 6901:2014
// as 'high'; no coverage rates; no unsubstantiated evidence_url;
// idempotency.
// ============================================================

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_MARKET_CODES } from "../capability-registry";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../../../supabase/migrations/20261015770000_jp_construction_standards.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("migration 20261015770000 (JP construction standards)", () => {
  it("seeds exactly 2 JP rows for a canonical registry market", () => {
    const rows = Array.from(SQL.matchAll(/\('(JP)', '/g));
    expect(rows.length).toBe(2);
    expect(ALL_MARKET_CODES).toContain("JP");
  });

  it("cites the Building Standards Act with the confirmation caveat", () => {
    expect(SQL).toContain("'building-standards-act-1950'");
    expect(SQL).toContain("Law No. 201 of 1950");
    const idx = SQL.indexOf("'building-standards-act-1950'");
    const row = SQL.slice(idx, SQL.indexOf("'),", idx));
    expect(row).toMatch(/building-confirmation/i);
    expect(row).toMatch(/'medium'/);
  });

  it("cites JIS A 6901:2014 as high confidence", () => {
    expect(SQL).toContain("'jis-a-6901-2014-gypsum-boards'");
    expect(SQL).toContain("JIS A 6901:2014");
    expect(SQL).toContain("ISO 6308");
    const idx = SQL.indexOf("'jis-a-6901-2014-gypsum-boards'");
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
