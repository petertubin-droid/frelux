// ============================================================
// CA (CANADA) construction standards — sync guard for migration
// 20261015730000 (Engine 1 closeout, priority 11, strict
// one-market-at-a-time flow).
//
// Pins: 3 CA rows only; NBC 2020 as a MODEL code with the
// provincial-adoption caveat and 'medium'; CAN/CSA-A82.31-M91
// and CSA A82.30-M as 'high'; no coverage rates; no
// unsubstantiated evidence_url; idempotency.
// ============================================================

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_MARKET_CODES } from "../capability-registry";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../../../supabase/migrations/20261015730000_ca_construction_standards.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("migration 20261015730000 (CA construction standards)", () => {
  it("seeds exactly 3 CA rows for a canonical registry market", () => {
    const rows = Array.from(SQL.matchAll(/\('(CA)', '/g));
    expect(rows.length).toBe(3);
    expect(ALL_MARKET_CODES).toContain("CA");
  });

  it("cites NBC 2020 as a model code with the provincial adoption caveat", () => {
    expect(SQL).toContain("'nbc-2020-model-code'");
    expect(SQL).toContain("MODEL code");
    expect(SQL).toMatch(/province or territory/i);
    const idx = SQL.indexOf("'nbc-2020-model-code'");
    const row = SQL.slice(idx, SQL.indexOf("'),", idx));
    expect(row).toMatch(/'medium'/);
  });

  it("cites both CSA gypsum standards as high confidence", () => {
    expect(SQL).toContain("'can-csa-a82-31-gypsum-board-application'");
    expect(SQL).toContain("CAN/CSA-A82.31-M91");
    expect(SQL).toContain("'csa-a82-30-lathing-plastering'");
    expect(SQL).toContain("CSA A82.30-M");
    for (const ref of ["'can-csa-a82-31-gypsum-board-application'", "'csa-a82-30-lathing-plastering'"]) {
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
