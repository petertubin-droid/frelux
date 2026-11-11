import { describe, expect, it } from "vitest";
import {
  aliasMatchScore,
  matchMaterials,
  matchScore,
  robotsAllows,
  parseRobots,
  stripMarketSuffix,
} from "./market-feeds.ts";

const scored = (row: string, material: string, market: string) =>
  aliasMatchScore(row, material, market);

describe("feed row scoring", () => {
  it("keeps a one-character pack size, so 4 L never prices a 20 L tub", () => {
    // Before: single-character tokens were dropped, "Bitumen primer 4 L"
    // tokenised without any size, and a 20 L tub scored 0.82 against it.
    expect(scored("Bitumen primer 20 L", "Bitumen primer 4 L (KE)", "KE")).toBe(
      0,
    );
    expect(
      scored("Bitumen primer 4 L", "Bitumen primer 4 L (KE)", "KE"),
    ).toBeGreaterThanOrEqual(0.6);
  });

  it("treats mm and m as different sizes", () => {
    expect(scored("Rebar 12m", "N-grade rebar 12mm x 12m (AU)", "AU")).toBe(0);
  });

  it("refuses a material whose only identity word is generic", () => {
    // "rebar" is a generic noun, so nothing anchored the row to the product and
    // a rope grab written "12mm" was priced as 12mm rebar.
    expect(
      scored(
        "Miller Auto Manual Rope Grab 12mm",
        "N-grade rebar 12mm x 12m (AU)",
        "AU",
      ),
    ).toBe(0);
    expect(
      scored("N12 rebar 12mm x 12m", "N-grade rebar 12mm x 12m (AU)", "AU"),
    ).toBeGreaterThanOrEqual(0.6);
  });

  it("refuses a different bag size of the same product", () => {
    expect(scored("Cement 25kg", "Cement 50kg bag (NG)", "NG")).toBe(0);
    expect(
      scored("Cement 50kg bag", "Cement 50kg bag (NG)", "NG"),
    ).toBeGreaterThanOrEqual(0.6);
  });

  it("still follows the market alias for a regional brand name", () => {
    // Villaboard is AU fibre cement sheet; without the alias this pair shares
    // no word but the size.
    expect(
      scored(
        "Villaboard 4.5mm 2700x1200 sheet",
        "Fibre cement sheet 4.5mm (AU)",
        "AU",
      ),
    ).toBeGreaterThanOrEqual(0.6);
  });

  it("scores a bare name pair without a market", () => {
    expect(matchScore("Cement 50kg", "Cement 50kg bag")).toBeGreaterThanOrEqual(
      0.6,
    );
  });

  it("drops rows it cannot place instead of guessing", () => {
    const materials = [
      {
        slug: "ke-primer-4l",
        name: "Bitumen primer 4 L (KE)",
        category: "waterproofing",
      },
      {
        slug: "ke-cement-50kg",
        name: "Cement 50kg bag (KE)",
        category: "cement",
      },
    ];
    const rows = [
      { name: "App Primer/Bitumen 20 Ltrs", price: 1800, currency: "KES" },
      { name: "Cement 50kg", price: 780, currency: "KES" },
      { name: "Garden hose 12mm", price: 300, currency: "KES" },
    ];
    const matched = matchMaterials(rows, materials, 0.6, "KE");
    expect(matched.map((m) => m.material.slug)).toEqual(["ke-cement-50kg"]);
  });
});

describe("market suffix", () => {
  it("removes only the market tag, never the size", () => {
    expect(stripMarketSuffix("Bitumen primer 4 L (KE)")).toBe(
      "Bitumen primer 4 L",
    );
    expect(stripMarketSuffix("Bitumen primer 4 L")).toBe("Bitumen primer 4 L");
  });
});

describe("robots", () => {
  const rules = parseRobots(
    [
      "User-agent: *",
      "Disallow: /checkout",
      "Allow: /products",
      "Crawl-delay: 2",
    ].join("\n"),
    "frelux",
  );

  it("allows a path no rule covers", () => {
    expect(robotsAllows(rules, "/wp-json/wc/store/products")).toBe(true);
  });

  it("blocks a disallowed path", () => {
    expect(robotsAllows(rules, "/checkout")).toBe(false);
  });

  it("reads the crawl delay", () => {
    expect(rules.crawlDelaySeconds).toBe(2);
  });

  it("treats an empty robots file as no rules", () => {
    const empty = parseRobots("", "frelux");
    expect(robotsAllows(empty, "/anything")).toBe(true);
  });
});
