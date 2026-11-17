// Guards the promises the catalogue makes to a reader in any market: the route
// exists in the router, and the tool has copy to show there. Both are checked
// against the real source rather than a remembered list.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CONSTRUCTION_TOOLS } from "@/config/construction-tools";
import { ALL_MARKET_CODES } from "@/lib/international/capability-registry";
import { getMarketToolCopy } from "@/lib/globalization/construction-terminology";

const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
const declaredPaths = new Set(
  [...appSource.matchAll(/path="([^"]+)"/g)].map((match) => match[1]),
);

describe("catalogue routes", () => {
  it("declares a router entry for every catalogue tool", () => {
    const missing = CONSTRUCTION_TOOLS.filter(
      (tool) => !declaredPaths.has(tool.to),
    ).map((tool) => `${tool.slug} -> ${tool.to}`);
    expect(missing).toEqual([]);
    expect(CONSTRUCTION_TOOLS.length).toBe(79);
  });

  it("gives each tool its own address", () => {
    const routes = CONSTRUCTION_TOOLS.map((tool) => tool.to);
    expect(new Set(routes).size).toBe(routes.length);
  });
});

describe("catalogue copy in every approved market", () => {
  it("has a title and a description for every tool in all 32 markets", () => {
    expect(ALL_MARKET_CODES.length).toBe(32);
    const gaps: string[] = [];
    for (const market of ALL_MARKET_CODES) {
      for (const tool of CONSTRUCTION_TOOLS) {
        const copy = getMarketToolCopy(tool.slug, market, tool);
        if (!copy.title?.trim() || !copy.does?.trim() || !copy.gets?.trim()) {
          gaps.push(`${market}:${tool.slug}`);
        }
      }
    }
    expect(gaps).toEqual([]);
    expect(ALL_MARKET_CODES.length * CONSTRUCTION_TOOLS.length).toBe(2528);
  });

  it("names the market's own practice where the terminology module knows it", () => {
    // Screeding is the market-aware tool: Nigeria says screeding, the United
    // States says floor levelling. The copy must follow the market asked for.
    const base = CONSTRUCTION_TOOLS.find((tool) => tool.slug === "screeding")!;
    const ng = getMarketToolCopy("screeding", "NG", base);
    const us = getMarketToolCopy("screeding", "US", base);
    expect(ng.title).not.toBe(us.title);
    expect(ng.title.toLowerCase()).toContain("screed");
  });
});
