// ============================================================
// IN (INDIA) construction standards — sync guard for migration
// 20261015760000 (Engine 1 closeout, priority 14, strict
// one-market-at-a-time flow).
//
// Pins: 2 IN rows only; NBC 2026 (SP 7:2026) with the NBC-2016-
// withdrawn + voluntary/state-byelaw caveat and 'medium';
// IS 2095-1 with the mandatory QCO note as 'high'; no coverage
// rates; no unsubstantiated evidence_url; idempotency.
// ============================================================

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_MARKET_CODES } from "../capability-registry";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../../../supabase/migrations/20261015760000_in_construction_standards.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("migration 20261015760000 (IN construction standards)", () => {
  it("seeds exactly 2 IN rows for a canonical registry market", () => {
    const rows = Array.from(SQL.matchAll(/\('(IN)', '/g));
    expect(rows.length).toBe(2);
    expect(ALL_MARKET_CODES).toContain("IN");
  });

  it("cites NBC 2026 with the withdrawal and state-byelaw caveat", () => {
    expect(SQL).toContain("'nbc-2026-sp7-state-byelaws'");
    expect(SQL).toContain("SP 7:2026");
    expect(SQL).toMatch(/withdrawn/i);
    const idx = SQL.indexOf("'nbc-2026-sp7-state-byelaws'");
    const row = SQL.slice(idx, SQL.indexOf("'),", idx));
    expect(row).toMatch(/voluntary/i);
    expect(row).toMatch(/'medium'/);
  });

  it("cites IS 2095-1 with the mandatory QCO note as high", () => {
    expect(SQL).toContain("'is-2095-1-gypsum-plaster-boards'");
    expect(SQL).toContain("IS 2095");
    const idx = SQL.indexOf("'is-2095-1-gypsum-plaster-boards'");
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
