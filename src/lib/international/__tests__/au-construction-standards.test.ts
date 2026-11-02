// ============================================================
// AU (AUSTRALIA) construction standards — sync guard for
// migration 20261015740000 (Engine 1 closeout, priority 12,
// strict one-market-at-a-time flow).
//
// Pins: 3 AU rows only; NCC with the state/territory adoption
// caveat and 'medium'; AS/NZS 2589:2017 and AS/NZS 2588 as
// 'high'; no coverage rates; no unsubstantiated evidence_url;
// idempotency.
// ============================================================

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_MARKET_CODES } from "../capability-registry";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../../../supabase/migrations/20261015740000_au_construction_standards.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("migration 20261015740000 (AU construction standards)", () => {
  it("seeds exactly 3 AU rows for a canonical registry market", () => {
    const rows = Array.from(SQL.matchAll(/\('(AU)', '/g));
    expect(rows.length).toBe(3);
    expect(ALL_MARKET_CODES).toContain("AU");
  });

  it("cites the NCC with the state/territory adoption caveat", () => {
    expect(SQL).toContain("'ncc-bca-state-adopted'");
    expect(SQL).toMatch(/state and territory/i);
    expect(SQL).toContain("1 May 2023");
    const idx = SQL.indexOf("'ncc-bca-state-adopted'");
    const row = SQL.slice(idx, SQL.indexOf("'),", idx));
    expect(row).toMatch(/'medium'/);
  });

  it("cites both AS/NZS gypsum standards as high confidence", () => {
    expect(SQL).toContain("'as-nzs-2589-2017-gypsum-linings'");
    expect(SQL).toContain("AS/NZS 2589:2017");
    expect(SQL).toContain("'as-nzs-2588-gypsum-plasterboard'");
    expect(SQL).toContain("AS/NZS 2588");
    for (const ref of ["'as-nzs-2589-2017-gypsum-linings'", "'as-nzs-2588-gypsum-plasterboard'"]) {
      const idx = SQL.indexOf(ref);
      const row = SQL.slice(idx, SQL.indexOf("'),", idx));
      expect(row).toMatch(/'high'/);
    }
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
