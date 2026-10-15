// ============================================================
// GB CONSTRUCTION STANDARDS (Engine 1, GB closeout — priority 2)
// Sync guard for migration 20261015161000. Mirrors the US
// guard: pins market canonicality, evidence confidence, the
// devolution caveat for the England Approved Document, no
// unsubstantiated evidence_url, and idempotency.
// ============================================================

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_MARKET_CODES } from "../capability-registry";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../../../supabase/migrations/20261015161000_gb_construction_standards.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("migration 20261015161000 (GB construction standards)", () => {
  const seededMarkets = Array.from(SQL.matchAll(/\('([A-Z]{2})', '/g)).map(
    (m) => m[1],
  );

  it("seeds only the GB market (priority-2 closeout)", () => {
    expect(seededMarkets.length).toBe(5);
    for (const mk of seededMarkets) {
      expect(mk).toBe("GB");
      expect(ALL_MARKET_CODES).toContain(mk);
    }
  });

  it("covers the audited GB domains: building code, rendering, plaster, workmanship", () => {
    expect(SQL).toContain("'building_code', 'building-regs-2010-ad-a'");
    expect(SQL).toContain("'rendering', 'bs-en-13914-1'");
    expect(SQL).toContain("'rendering', 'bs-en-998-1'");
    expect(SQL).toContain("'plaster', 'bs-en-13279'");
    expect(SQL).toContain("'workmanship', 'bs-8000-10'");
  });

  it("every row carries a confidence rating consistent with its evidence", () => {
    const confidences = Array.from(
      SQL.matchAll(/'(high|medium|low)', '\d{4}-\d{2}-\d{2}'\)/g),
    ).map((m) => m[1]);
    // 1 devolved Approved Document (medium) + 4 BSI national standards (high).
    expect(confidences.length).toBe(5);
    expect(confidences.filter((c) => c === "medium").length).toBe(1);
    expect(confidences.filter((c) => c === "high").length).toBe(4);
  });

  it("discloses the England-devolution caveat in the Approved Document row", () => {
    const idx = SQL.indexOf("building-regs-2010-ad-a");
    const row = SQL.slice(idx, SQL.indexOf("'),", idx));
    expect(row).toMatch(/ENGLAND|devolved/i);
  });

  it("never stores an evidence_url it cannot substantiate", () => {
    expect(SQL).not.toMatch(/evidence_url[^(]*'http/);
  });

  it("is idempotent (ON CONFLICT DO NOTHING)", () => {
    expect(SQL).toContain(
      "ON CONFLICT (market_code, domain, ref) DO NOTHING;",
    );
  });
});
