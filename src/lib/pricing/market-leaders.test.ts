import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const registry = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "scripts/price-scan/market-leaders.json"),
    "utf8",
  ),
) as {
  summary: string;
  markets: Array<{
    market: string;
    country: string;
    leaders: Array<{
      name: string;
      url: string;
      status: string;
      note: string;
    }>;
    path_forward: string;
  }>;
};

const STATUSES = new Set([
  "ok",
  "blocked",
  "unreachable",
  "no_catalogue",
  "sample_catalogue",
  "not_probed",
]);

describe("market leader registry", () => {
  it("covers every market the owner named", () => {
    const covered = new Set(registry.markets.map((m) => m.market));
    for (const market of ["CN", "CA", "MX", "AU", "AE", "IT"]) {
      expect(covered.has(market)).toBe(true);
    }
  });

  it("names at least two leaders per market", () => {
    for (const market of registry.markets) {
      expect(market.leaders.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("records a probe answer for every leader instead of leaving it open", () => {
    for (const market of registry.markets) {
      for (const leader of market.leaders) {
        expect(STATUSES.has(leader.status)).toBe(true);
        expect(leader.note.length).toBeGreaterThan(10);
      }
    }
  });

  it("does not present a blocked leader as a working source", () => {
    for (const market of registry.markets) {
      const working = market.leaders.filter((l) => l.status === "ok");
      if (working.length > 0) {
        // Only Australia has one, and it is a mid-size merchant, not a leader.
        expect(market.market).toBe("AU");
        for (const leader of working) {
          expect(leader.name.toLowerCase()).toContain("plyco");
        }
      }
    }
  });

  it("states a path forward for each market rather than stopping at the blocker", () => {
    for (const market of registry.markets) {
      expect(market.path_forward.length).toBeGreaterThan(40);
    }
  });

  it("uses https URLs only", () => {
    for (const market of registry.markets) {
      for (const leader of market.leaders) {
        expect(leader.url.startsWith("https://")).toBe(true);
      }
    }
  });

  it("says out loud that leaders cannot carry coverage", () => {
    expect(registry.summary).toContain("cannot come from scraping leaders");
  });
});
