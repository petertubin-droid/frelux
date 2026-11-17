import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  calculateTheoreticalLitres,
  MIN_PLAUSIBLE_COVERAGE_M2_PER_L,
} from "@/lib/estimation/paint-engine";

const SQL = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261117090000_paint_coverage_restore_measured_rates.sql",
  ),
  "utf8",
);

/**
 * The production paint_types rows were edited to half the spread rate their
 * manufacturers publish, which doubled the paint every estimate ordered. These
 * values are the published lower bounds.
 */
const MEASURED: Record<string, number> = {
  Emulsion: 10,
  Matt: 11,
  Gloss: 12,
  Satin: 11,
  Enamel: 13,
  "Primer-only": 12,
};

describe("paint coverage configuration", () => {
  it("restores every finish to a published spread rate", () => {
    for (const [name, rate] of Object.entries(MEASURED)) {
      const pattern = new RegExp(
        `UPDATE public\\.paint_types SET coverage_rate = ${rate},\\s*coverage_unit = 'm2_per_liter'\\s*WHERE name = '${name}';`,
      );
      expect(SQL, name).toMatch(pattern);
    }
  });

  it("keeps every restored rate at or above the plausibility floor", () => {
    for (const [name, rate] of Object.entries(MEASURED)) {
      expect(rate, name).toBeGreaterThanOrEqual(
        MIN_PLAUSIBLE_COVERAGE_M2_PER_L,
      );
    }
  });

  it("turns the old and restored rates into the litres each asks for", () => {
    // 100 m2 of wall in two coats is 200 m2 of paint. At the edited 4 m2/L the
    // engine asked for 50 L; at Berger's lower published rate it is 20 L.
    expect(calculateTheoreticalLitres(100, 2, 4)).toBe(50);
    expect(calculateTheoreticalLitres(100, 2, MEASURED.Emulsion)).toBe(20);
  });

  it("names the sources the rates came from", () => {
    expect(SQL).toContain("Luxol Emulsion technical manual: 10 to 12 m2/L");
    expect(SQL).toContain("Dulux Trade Vinyl Matt: up to 17 m2/L");
    expect(SQL).toContain("8.6 m2/L");
  });
});
