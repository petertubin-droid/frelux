import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_MARKET_CODES } from "../capability-registry";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../../../supabase/migrations/20261014140000_construction_standards_evidence.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("migration 20261014140000 (construction standards evidence)", () => {
  const seededMarkets = Array.from(SQL.matchAll(/\('([A-Z]{2})', '/g)).map(
    (m) => m[1],
  );

  it("seeds only canonical registry markets", () => {
    expect(seededMarkets.length).toBeGreaterThan(10);
    for (const mk of seededMarkets) {
      expect(ALL_MARKET_CODES).toContain(mk);
    }
  });

  it("every seeded row cites evidence and carries a confidence rating", () => {
    const rows = SQL.match(/\('[A-Z]{2}', '[^)]+?\),?\n/g) ?? [];
    // confidence values are the 13th column of each value row
    const confidences = Array.from(
      SQL.matchAll(/'(high|medium|low)', '\d{4}-\d{2}-\d{2}'\)/g),
    ).map((m) => m[1]);
    expect(confidences.length).toBe(seededMarkets.length);
    for (const c of confidences) {
      expect(["high", "medium", "low"]).toContain(c);
    }
  });

  it("never stores an evidence_url it cannot substantiate", () => {
    // Seeds deliberately omit evidence_url; sources live in notes text
    // (verbatim from project migrations) until archived URLs exist.
    expect(SQL).not.toMatch(/evidence_url[^(]*'http/);
  });

  it("is idempotent (ON CONFLICT DO NOTHING)", () => {
    expect(SQL).toContain("ON CONFLICT (market_code, domain, ref) DO NOTHING;");
  });
});
