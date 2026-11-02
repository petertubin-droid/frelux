import { describe, expect, it } from "vitest";
import {
  matchMaterials,
  matchScore,
  parseCsvFeed,
  parseFeed,
  parseJsonFeed,
  parseRobots,
  parseRssFeed,
  robotsAllows,
  splitCsvLine,
  toNumber,
} from "../../../supabase/functions/_shared/market-feeds";

describe("toNumber", () => {
  it("reads the currency formats a supplier feed actually uses", () => {
    expect(toNumber("₦8,500.00")).toBe(8500);
    expect(toNumber("8 500,00")).toBe(8500);
    expect(toNumber("1.234,56")).toBe(1234.56);
    expect(toNumber("AED 12.50")).toBe(12.5);
    expect(toNumber(8500)).toBe(8500);
  });

  it("refuses what is not a price", () => {
    expect(toNumber("")).toBeNull();
    expect(toNumber("call us")).toBeNull();
    expect(toNumber(0)).toBeNull();
    expect(toNumber(-4)).toBeNull();
  });
});

describe("parseJsonFeed", () => {
  const payload = JSON.stringify({
    data: {
      products: [
        {
          name: "Dangote Cement 50kg",
          price: "₦8,500",
          currency: "NGN",
          unit: "bag",
          brand: "Dangote",
        },
        { name: "PVC Pipe 20mm", price: 1200, unit: "length" },
        { name: "No price here" },
      ],
    },
  });

  it("walks the mapped items path and skips unpriced rows", () => {
    const rows = parseJsonFeed(payload, {
      items: "data.products",
      price: "price",
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].price).toBe(8500);
    expect(rows[0].currency).toBe("NGN");
    expect(rows[1].name).toBe("PVC Pipe 20mm");
  });

  it("finds the array without a mapping", () => {
    expect(
      parseJsonFeed(JSON.stringify([{ name: "Sand", price: 40 }])),
    ).toHaveLength(1);
  });

  it("returns nothing for malformed JSON instead of throwing", () => {
    expect(parseJsonFeed("{not json")).toEqual([]);
  });
});

describe("parseCsvFeed", () => {
  it("uses the header row and honours quoted commas", () => {
    const csv = [
      "name,price,currency,unit,supplier",
      '"Cement, 50kg",8500,NGN,bag,"BuildCo, Lagos"',
      "Sharp Sand,12000,NGN,tonne,SandCo",
    ].join("\n");
    const rows = parseCsvFeed(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Cement, 50kg");
    expect(rows[0].supplier).toBe("BuildCo, Lagos");
    expect(rows[1].price).toBe(12000);
  });

  it("splits only on the configured delimiter", () => {
    expect(splitCsvLine('a;"b;c";d', ";")).toEqual(["a", "b;c", "d"]);
  });

  it("returns nothing when there is no price column", () => {
    expect(parseCsvFeed("name,unit\nSand,tonne")).toEqual([]);
  });
});

describe("parseRssFeed", () => {
  it("reads an explicit price element", () => {
    const rss = `<rss><channel>
      <item><title>Cement 50kg</title><price>8500</price><currency>NGN</currency></item>
      <item><title>No price</title></item>
    </channel></rss>`;
    const rows = parseRssFeed(rss);
    expect(rows).toHaveLength(1);
    expect(rows[0].price).toBe(8500);
    expect(rows[0].currency).toBe("NGN");
  });

  it("falls back to a currency amount in the title", () => {
    const rss = `<rss><channel><item><title>PVC pipe 20mm - KES 450</title></item></channel></rss>`;
    const rows = parseRssFeed(rss);
    expect(rows[0].price).toBe(450);
    expect(rows[0].currency).toBe("KES");
  });
});

describe("parseFeed dispatch", () => {
  it("routes each structured format", () => {
    expect(parseFeed("json", '[{"name":"Sand","price":40}]')).toHaveLength(1);
    expect(parseFeed("csv", "name,price\nSand,40")).toHaveLength(1);
    expect(parseFeed("product", "<html>no</html>")).toEqual([]);
  });
});

describe("matchMaterials", () => {
  const materials = [
    { slug: "cement-50kg", name: "Cement 50kg", category: "cement" },
    { slug: "pvc-pipe-20mm", name: "PVC Pipe 20mm", category: "plumbing" },
    { slug: "sharp-sand", name: "Sharp Sand", category: "aggregate" },
  ];

  it("matches a feed name to its material", () => {
    const matched = matchMaterials(
      [
        {
          price: 8500,
          currency: "NGN",
          name: "Dangote Cement 50kg bag",
          unit: "bag",
          brand: "Dangote",
          specification: null,
          supplier: "BuildCo",
          location: "Lagos",
        },
      ],
      materials,
    );
    expect(matched).toHaveLength(1);
    expect(matched[0].material.slug).toBe("cement-50kg");
  });

  it("drops a row it cannot match rather than guessing", () => {
    const matched = matchMaterials(
      [
        {
          price: 99,
          currency: null,
          name: "Garden hose reel",
          unit: null,
          brand: null,
          specification: null,
          supplier: null,
          location: null,
        },
      ],
      materials,
    );
    expect(matched).toEqual([]);
  });

  it("never matches a different size of the same product", () => {
    expect(matchScore("Cement", "Cement 50kg")).toBe(0);
    expect(matchScore("Cement 25kg bag", "Cement 50kg")).toBe(0);
    expect(matchScore("PVC pipe 32mm", "PVC Pipe 20mm")).toBe(0);
    expect(matchScore("Cement 50kg bag", "Cement 50kg")).toBeGreaterThanOrEqual(
      0.6,
    );
  });
});

describe("robots.txt", () => {
  it("honours the group aimed at us", () => {
    const rules = parseRobots(`
      User-agent: *
      Disallow: /
      User-agent: frelux
      Disallow: /admin
      Allow: /products
    `);
    expect(robotsAllows(rules, "/products/cement")).toBe(true);
    expect(robotsAllows(rules, "/admin/prices")).toBe(false);
    expect(robotsAllows(rules, "/checkout")).toBe(true);
  });

  it("applies the wildcard group when nothing names us", () => {
    const rules = parseRobots(
      "User-agent: *\nDisallow: /private\nCrawl-delay: 2",
    );
    expect(robotsAllows(rules, "/private/feed", true)).toBe(false);
    expect(robotsAllows(rules, "/feed.xml", true)).toBe(true);
    expect(rules.crawlDelaySeconds).toBe(2);
  });

  it("lets the longer rule win", () => {
    const rules = parseRobots(
      "User-agent: *\nDisallow: /data\nAllow: /data/public",
    );
    expect(robotsAllows(rules, "/data/secret", true)).toBe(false);
    expect(robotsAllows(rules, "/data/public/list", true)).toBe(true);
  });
});
