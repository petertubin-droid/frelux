// ============================================================
// FR (FRANCE) construction standards — sync guard for migration
// 20261015780000 (Engine 1 closeout, priority 16, strict
// one-market-at-a-time flow).
//
// Pins: 2 FR rows only; NF DTU 25.41 (Feb 2022 revision) and
// NF DTU 26.2 as 'high'; no coverage rates; no unsubstantiated
// evidence_url; idempotency; does not touch the existing
// nf-dtu-42-1 row.
// ============================================================

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_MARKET_CODES } from "../capability-registry";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../../../supabase/migrations/20261015780000_fr_construction_standards.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("migration 20261015780000 (FR construction standards)", () => {
  it("seeds exactly 2 FR rows for a canonical registry market", () => {
    const rows = Array.from(SQL.matchAll(/\('(FR)', '/g));
    expect(rows.length).toBe(2);
    expect(ALL_MARKET_CODES).toContain("FR");
  });

  it("cites NF DTU 25.41 with the 2022 revision as high", () => {
    expect(SQL).toContain("'nf-dtu-25-41-ouvrages-plaques-platre'");
    expect(SQL).toContain("NF DTU 25.41");
    expect(SQL).toMatch(/February 2022/i);
    const idx = SQL.indexOf("'nf-dtu-25-41-ouvrages-plaques-platre'");
    const row = SQL.slice(idx, SQL.indexOf("'),", idx));
    expect(row).toMatch(/'high'/);
  });

  it("cites NF DTU 26.2 traditional renders as high", () => {
    expect(SQL).toContain("'nf-dtu-26-2-enduits-traditionnels'");
    expect(SQL).toContain("NF DTU 26.2");
    const idx = SQL.indexOf("'nf-dtu-26-2-enduits-traditionnels'");
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
