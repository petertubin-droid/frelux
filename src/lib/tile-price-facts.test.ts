/**
 * Parity guard for the tile price table.
 *
 * scripts/lib/tile-price-facts.mjs reads BUNDLED_TILE_MATERIALS out of the
 * TypeScript source with a narrow parser. If that parser silently stops
 * matching (a reformat, a renamed field), the prerendered tile tables would go
 * empty without failing anything. These assertions pin it to the source.
 */
import { describe, expect, it } from "vitest";
import {
  loadTileMaterialFacts,
  renderTilePriceFacts,
} from "../../scripts/lib/tile-price-facts.mjs";
import { BUNDLED_TILE_MATERIALS } from "@/lib/international/bundled-price-books";

describe("tile price facts", () => {
  const facts = loadTileMaterialFacts();

  it("reads every market that has tile rows in the source", () => {
    const sourceMarkets = new Set(
      (BUNDLED_TILE_MATERIALS as readonly { market?: string }[])
        .map((m) => m.market)
        .filter(Boolean) as string[],
    );
    expect([...facts.keys()].sort()).toEqual([...sourceMarkets].sort());
  });

  it("keeps the Nigerian row count and the grout price the calculator uses", () => {
    const ng = facts.get("NG") ?? [];
    expect(ng.length).toBe(
      (BUNDLED_TILE_MATERIALS as readonly { market?: string }[]).filter(
        (m) => m.market === "NG",
      ).length,
    );
    const grout = ng.find((r: { name: string }) => /grout/i.test(r.name));
    expect(grout?.unitPrice).toBeGreaterThan(0);
    expect(grout?.currency).toBe("NGN");
  });

  it("never publishes another market's rows for an unconfigured market", () => {
    // CN is the one market in the 32-market set with no tile rows at all.
    const html = renderTilePriceFacts(facts, "CN", "China");
    expect(html).toMatch(/No tile material row is configured for China/);
    // the Nigerian grout price must not leak into the Chinese page
    const ng = facts.get("NG") ?? [];
    const ngPrice = ng.find((r: { name: string }) =>
      /grout/i.test(r.name),
    )?.unitPrice;
    if (ngPrice) expect(html).not.toContain(String(ngPrice));
  });

  it("renders a table for a configured market", () => {
    const html = renderTilePriceFacts(facts, "US", "United States");
    expect(html).toContain("<table>");
    expect(html).toContain("USD");
  });
});
