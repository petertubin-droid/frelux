// ============================================================
// ZA (SOUTH AFRICA) construction standards — sync guard for
// migration 20261015720000 (Engine 1 closeout, priority 10,
// strict one-market-at-a-time flow).
//
// Pins: 3 ZA rows only; Act 103 of 1977 + SANS 10400 with the
// municipal caveat and 'medium'; SANS 2001-CC1/CC2 and SANS
// 10109-1/2 as 'high'; no coverage rates; no unsubstantiated
// evidence_url; idempotency.
// ============================================================

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_MARKET_CODES } from "../capability-registry";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../../../supabase/migrations/20261015720000_za_construction_standards.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("migration 20261015720000 (ZA construction standards)", () => {
  it("seeds exactly 3 ZA rows for a canonical registry market", () => {
    const rows = Array.from(SQL.matchAll(/\('(ZA)', '/g));
    expect(rows.length).toBe(3);
    expect(ALL_MARKET_CODES).toContain("ZA");
  });

  it("cites Act 103 of 1977 with SANS 10400 and the municipal caveat", () => {
    expect(SQL).toContain("'nbrbs-act-103-1977-sans-10400'");
    expect(SQL).toContain("Act 103 of 1977");
    expect(SQL).toContain("SANS 10400");
    const idx = SQL.indexOf("'nbrbs-act-103-1977-sans-10400'");
    const row = SQL.slice(idx, SQL.indexOf("'),", idx));
    expect(row).toMatch(/local authorit|municipal/i);
    expect(row).toMatch(/'medium'/);
  });

  it("cites SANS 2001-CC and SANS 10109 as high confidence", () => {
    expect(SQL).toContain("'sans-2001-cc-concrete-works'");
    expect(SQL).toContain("SANS 2001-CC1");
    expect(SQL).toContain("SANS 2001-CC2");
    expect(SQL).toContain("'sans-10109-concrete-floors'");
    expect(SQL).toContain("SANS 10109-1");
    expect(SQL).toContain("SANS 10109-2");
    for (const ref of ["'sans-2001-cc-concrete-works'", "'sans-10109-concrete-floors'"]) {
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
