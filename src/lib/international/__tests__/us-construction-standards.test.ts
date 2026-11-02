// ============================================================
// US CONSTRUCTION STANDARDS (Engine 1, US closeout) — sync guard
//
// Migration 20261015000000 seeds the US standards registry the
// §1B audit found missing. These guards pin the honesty rules:
//   * only canonical registry markets
//   * every row cites evidence and a confidence rating
//   * MODEL CODES (IRC/IBC/NEC) are rated 'medium' — the code
//     names are certain but adoption varies by jurisdiction;
//     anything 'high' must be a national product standard
//   * no evidence_url unless substantiated
//   * idempotent: never overwrites admin-edited rows
// ============================================================

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_MARKET_CODES } from "../capability-registry";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../../../supabase/migrations/20261015000000_us_construction_standards.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("migration 20261015000000 (US construction standards)", () => {
  const seededMarkets = Array.from(SQL.matchAll(/\('([A-Z]{2})', '/g)).map(
    (m) => m[1],
  );

  it("seeds only the US market (priority-1 closeout)", () => {
    expect(seededMarkets.length).toBe(4);
    for (const mk of seededMarkets) {
      expect(mk).toBe("US");
      expect(ALL_MARKET_CODES).toContain(mk);
    }
  });

  it("covers the four audited domains: residential, commercial, electrical, gypsum", () => {
    expect(SQL).toContain("'building_code', 'icc-irc-2021'");
    expect(SQL).toContain("'building_code', 'icc-ibc-2021'");
    expect(SQL).toContain("'electrical', 'nfpa-70-2023'");
    expect(SQL).toContain("'gypsum', 'astm-c1396'");
  });

  it("every row carries a confidence rating consistent with its evidence", () => {
    const confidences = Array.from(
      SQL.matchAll(/'(high|medium|low)', '\d{4}-\d{2}-\d{2}'\)/g),
    ).map((m) => m[1]);
    expect(confidences.length).toBe(4);
    // Model codes: adoption varies by jurisdiction → medium.
    // National product standard (ASTM C1396) → high.
    expect(confidences.filter((c) => c === "medium").length).toBe(3);
    expect(confidences.filter((c) => c === "high").length).toBe(1);
  });

  it("discloses the model-code adoption caveat in every jurisdiction-dependent row", () => {
    for (const ref of ["icc-irc-2021", "icc-ibc-2021", "nfpa-70-2023"]) {
      const idx = SQL.indexOf(ref);
      const row = SQL.slice(idx, SQL.indexOf("'),", idx));
      expect(row).toMatch(/adopt|jurisdiction/i);
    }
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
