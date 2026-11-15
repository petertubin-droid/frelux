import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GOLDEN_CASES,
  GOLDEN_TOLERANCE_PERCENT,
} from "./fixtures/golden-cases";

const suite = readFileSync(
  join(
    process.cwd(),
    "src/lib/estimation/__tests__/golden-standard-benchmarks.test.ts",
  ),
  "utf8",
);

describe("golden case registry", () => {
  it("holds at least ten cases across at least six trades", () => {
    expect(GOLDEN_CASES.length).toBeGreaterThanOrEqual(10);
    const trades = new Set(GOLDEN_CASES.map((entry) => entry.trade));
    expect(trades.size).toBeGreaterThanOrEqual(6);
  });

  it("gives every case a source, a date and the shared tolerance", () => {
    for (const entry of GOLDEN_CASES) {
      expect(entry.source.trim().length).toBeGreaterThan(10);
      expect(entry.recordedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.tolerancePercent).toBe(GOLDEN_TOLERANCE_PERCENT);
      expect(entry.tolerancePercent).toBeLessThanOrEqual(5);
    }
  });

  it("keeps unique ids", () => {
    const ids = GOLDEN_CASES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only claims external verification when a verifier is recorded", () => {
    for (const entry of GOLDEN_CASES) {
      if (entry.evidence === "embedded_takeoff") continue;
      expect(entry.verifiedBy?.trim().length ?? 0).toBeGreaterThan(2);
    }
  });

  it("is backed by a benchmark assertion in the suite", () => {
    const tradesInSuite = GOLDEN_CASES.filter((entry) =>
      suite.toLowerCase().includes(entry.trade.split("_")[0]),
    );
    expect(tradesInSuite.length).toBeGreaterThanOrEqual(8);
  });
});
