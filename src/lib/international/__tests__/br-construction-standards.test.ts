// ============================================================
// BR (BRAZIL) construction standards — sync guard for migration
// 20261015790000 (Engine 1 closeout, priority 17, strict
// one-market-at-a-time flow).
//
// Pins: 2 BR rows only; NBR 14715-1:2021 as 'high'; NBR 15575
// with the municipal-adoption caveat and 'medium'; no coverage
// rates; no unsubstantiated evidence_url; idempotency.
// ============================================================

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_MARKET_CODES } from "../capability-registry";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../../../supabase/migrations/20261015790000_br_construction_standards.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("migration 20261015790000 (BR construction standards)", () => {
  it("seeds exactly 2 BR rows for a canonical registry market", () => {
    const rows = Array.from(SQL.matchAll(/\('(BR)', '/g));
    expect(rows.length).toBe(2);
    expect(ALL_MARKET_CODES).toContain("BR");
  });

  it("cites NBR 14715-1:2021 drywall requirements as high", () => {
    expect(SQL).toContain("'abnt-nbr-14715-1-2021-chapas-gesso-drywall'");
    expect(SQL).toContain("NBR 14715-1:2021");
    const idx = SQL.indexOf("'abnt-nbr-14715-1-2021-chapas-gesso-drywall'");
    const row = SQL.slice(idx, SQL.indexOf("'),", idx));
    expect(row).toMatch(/'high'/);
  });

  it("cites NBR 15575 with the municipal-adoption caveat as medium", () => {
    expect(SQL).toContain("'abnt-nbr-15575-desempenho'");
    expect(SQL).toContain("NBR 15575");
    const idx = SQL.indexOf("'abnt-nbr-15575-desempenho'");
    const row = SQL.slice(idx, SQL.indexOf("'),", idx));
    expect(row).toMatch(/municipal/i);
    expect(row).toMatch(/'medium'/);
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
