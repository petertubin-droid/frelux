// ============================================================
// KE (KENYA) construction standards — sync guard for migration
// 20261015710000 (Engine 1 closeout, priority 9, strict
// one-market-at-a-time flow).
//
// Pins: 3 KE rows only; the 2024 code (LN 47, replaces 1968)
// with the county-enforcement caveat and 'medium'; KS 2647:2016
// and KS EAS 18-1 'high'; no coverage rates; no unsubstantiated
// evidence_url; idempotency.
// ============================================================

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_MARKET_CODES } from "../capability-registry";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../../../supabase/migrations/20261015710000_ke_construction_standards.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("migration 20261015710000 (KE construction standards)", () => {
  it("seeds exactly 3 KE rows for a canonical registry market", () => {
    const rows = Array.from(SQL.matchAll(/\('(KE)', '/g));
    expect(rows.length).toBe(3);
    expect(ALL_MARKET_CODES).toContain("KE");
  });

  it("cites the 2024 code as Legal Notice No. 47 replacing the 1968 code, with the county caveat", () => {
    expect(SQL).toContain("'national-building-code-2024-ln-47'");
    expect(SQL).toContain("Legal Notice No. 47");
    expect(SQL).toContain("2024-03-01");
    expect(SQL).toContain("1968");
    const idx = SQL.indexOf("'national-building-code-2024-ln-47'");
    const row = SQL.slice(idx, SQL.indexOf("'),", idx));
    expect(row).toMatch(/county/i);
    expect(row).toMatch(/'medium'/);
  });

  it("cites real KEBS product standards as high confidence", () => {
    expect(SQL).toContain("'ks-2647-2016-gypsum-plasterboard'");
    expect(SQL).toContain("KS 2647:2016");
    expect(SQL).toContain("'ks-eas-18-1-cement'");
    expect(SQL).toContain("KS EAS 18-1");
    for (const ref of ["'ks-2647-2016-gypsum-plasterboard'", "'ks-eas-18-1-cement'"]) {
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
