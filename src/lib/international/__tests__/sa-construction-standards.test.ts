// ============================================================
// SA (SAUDI ARABIA) construction standards — sync guard for
// migration 20261015800000 (Engine 1 closeout, final market of
// the 15, strict one-market-at-a-time flow).
//
// Pins: 2 SA rows only; SBC 2024 with the edition caveat and
// 'medium'; SASO gypsum application/finishing spec as 'high';
// no coverage rates; no unsubstantiated evidence_url;
// idempotency.
// ============================================================

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_MARKET_CODES } from "../capability-registry";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../../../supabase/migrations/20261015800000_sa_construction_standards.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("migration 20261015800000 (SA construction standards)", () => {
  it("seeds exactly 2 SA rows for a canonical registry market", () => {
    const rows = Array.from(SQL.matchAll(/\('(SA)', '/g));
    expect(rows.length).toBe(2);
    expect(ALL_MARKET_CODES).toContain("SA");
  });

  it("cites SBC 2024 with the nationwide mandatory status and edition caveat", () => {
    expect(SQL).toContain("'saudi-building-code-2024'");
    expect(SQL).toContain("30 June 2025");
    const idx = SQL.indexOf("'saudi-building-code-2024'");
    const row = SQL.slice(idx, SQL.indexOf("'),", idx));
    expect(row).toMatch(/mandatory/i);
    expect(row).toMatch(/'medium'/);
  });

  it("cites the SASO gypsum application standard as high", () => {
    expect(SQL).toContain("'saso-gypsum-board-application-finishing'");
    expect(SQL).toContain("Application and Finishing");
    const idx = SQL.indexOf("'saso-gypsum-board-application-finishing'");
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
