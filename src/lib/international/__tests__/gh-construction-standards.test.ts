// ============================================================
// GH (GHANA) construction standards — sync guard for migration
// 20261015170000 (Engine 1 closeout, priority 8, strict
// one-market-at-a-time flow).
//
// Pins: 2 GH rows only; L.I. 1630 with the MMDA-enforcement
// caveat and 'medium' confidence; Act 1078 'high'; no invented
// GS product-specification numbers; no coverage rates; no
// unsubstantiated evidence_url; idempotency.
// ============================================================

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_MARKET_CODES } from "../capability-registry";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../../../supabase/migrations/20261015700000_gh_construction_standards.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("migration 20261015700000 (GH construction standards)", () => {
  it("seeds exactly 2 GH rows for a canonical registry market", () => {
    const rows = Array.from(SQL.matchAll(/\('(GH)', '/g));
    expect(rows.length).toBe(2);
    expect(ALL_MARKET_CODES).toContain("GH");
  });

  it("cites the real 1996 regulation (L.I. 1630) with the MMDA enforcement caveat", () => {
    expect(SQL).toContain("'national-building-regulations-1996-li-1630'");
    expect(SQL).toContain("L.I. 1630");
    // NOT L.I. 1633 — the commonly mis-cited number; the real
    // regulation is L.I. 1630 (verified 2026-10-15).
    expect(SQL).not.toContain("L.I. 1633");
    expect(SQL).not.toContain("LI-1633");
    const idx = SQL.indexOf("'national-building-regulations-1996-li-1630'");
    const row = SQL.slice(idx, SQL.indexOf("'),", idx));
    expect(row).toMatch(/MMDA|District Assembl/i);
    expect(row).toMatch(/'medium'/);
  });

  it("cites GSA Act 1078 as high confidence without inventing GS numbers", () => {
    expect(SQL).toContain("'gsa-act-1078'");
    const idx = SQL.indexOf("'gsa-act-1078'");
    const row = SQL.slice(idx, SQL.indexOf("'),", idx));
    expect(row).toMatch(/'high'/);
    // No fabricated GS product-specification references
    expect(SQL).not.toMatch(/'gs-[0-9]/i);
    expect(SQL).not.toMatch(/GS \d{3,}/);
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
