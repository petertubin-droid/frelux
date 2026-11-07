import { describe, expect, it } from "vitest";
import {
  catalogueForMarket,
  createMaterialMatcher,
  matchMaterials,
  matchScore,
  type MaterialRef,
} from "./market-feeds.ts";
import { aliasMatchScore } from "./market-feeds.ts";

const MARKETS = [
  "US",
  "GB",
  "CN",
  "AU",
  "IN",
  "NG",
  "MX",
  "SA",
  "CA",
  "DE",
  "JP",
  "NL",
  "GH",
  "KE",
  "ZA",
  "ET",
  "EG",
  "TZ",
  "CI",
  "BR",
  "IT",
  "PL",
  "SE",
  "CH",
  "ID",
  "KR",
  "SG",
  "TR",
  "FR",
  "AE",
  "AT",
  "BE",
  "DK",
  "ES",
  "FI",
  "IE",
  "MY",
  "NO",
  "NZ",
  "PH",
  "PK",
  "PT",
  "TH",
];

const catalogue: MaterialRef[] = [
  {
    slug: "gb-pipe-cold",
    name: "PVC cold water pipe 20mm",
    category: "plumbing",
  },
  {
    slug: "gb-building-sand-25kg",
    name: "Building Sand (25kg bag)",
    category: "aggregates",
  },
  { slug: "jp-suna-25kg", name: "砂 25kg (JP)", category: "aggregates" },
  { slug: "ae-sand-25kg", name: "Sand 25 kg (AE)", category: "aggregates" },
  { slug: "pl-cement-25kg", name: "Cement 25 kg (PL)", category: "cement" },
  { slug: "sa-cement-50kg", name: "Cement 50 kg (SA)", category: "cement" },
  { slug: "sand", name: "Sand", category: "aggregates" },
  { slug: "timber-per-m", name: "Timber (2 x 4)", category: "timber" },
  { slug: "xy-shared-thing", name: "Generic item", category: "misc" },
];

const slugs = (mats: MaterialRef[]) => mats.map((m) => m.slug).sort();

describe("catalogueForMarket", () => {
  it("keeps the market's own slugs and the shared ones", () => {
    const gb = catalogueForMarket(catalogue, "GB", MARKETS);
    expect(slugs(gb)).toContain("gb-pipe-cold");
    expect(slugs(gb)).toContain("gb-building-sand-25kg");
    expect(slugs(gb)).toContain("sand");
    expect(slugs(gb)).toContain("timber-per-m");
  });

  it("drops every other market's slugs", () => {
    const gb = catalogueForMarket(catalogue, "GB", MARKETS);
    for (const foreign of [
      "jp-suna-25kg",
      "ae-sand-25kg",
      "pl-cement-25kg",
      "sa-cement-50kg",
    ]) {
      expect(slugs(gb), `${foreign} leaked into GB`).not.toContain(foreign);
    }
  });

  it("treats a two-letter prefix that is not a market code as shared", () => {
    const gb = catalogueForMarket(catalogue, "GB", MARKETS);
    expect(slugs(gb)).toContain("xy-shared-thing");
  });

  it("does not bind a UK sand row to a foreign sand slug", () => {
    const gb = catalogueForMarket(catalogue, "GB", MARKETS);
    const rows = [
      {
        name: "10 x Tarmac Sharp Sand 25KG (250KG) Building sand - Bulk discount",
        price: 5.5,
        currency: "GBP",
        unit: "each",
        brand: null,
        specification: null,
        supplier: "Bravikon",
        location: null,
      },
    ];
    const matched = matchMaterials(rows as never, gb, 0.6, "GB");
    for (const m of matched) {
      expect(m.material.slug).not.toBe("jp-suna-25kg");
      expect(m.material.slug).not.toBe("ae-sand-25kg");
    }
  });
});

describe("createMaterialMatcher", () => {
  const pairs: Array<[string, string]> = [
    ["Tarmac Kiln Dried Paving Sand 20KG - 1 bag", "Sand"],
    ["C16 Treated Kiln Dried Timber - 45 x 70 (45x70mm)", "Timber (2 x 4)"],
    ["Building sand 25kg bag", "Building Sand (25kg bag)"],
    ["Cement 25 kg paper bag", "Cement 25 kg (PL)"],
    ["Screwdriver set 12 piece", "Cement 25 kg (PL)"],
  ];

  it("scores exactly as the single-pair path does", () => {
    const matcher = createMaterialMatcher(catalogue, "GB");
    for (const [row, materialName] of pairs) {
      const target = catalogue.find((m) => m.name === materialName);
      if (!target) throw new Error(`missing material ${materialName}`);
      const reference = aliasMatchScore(row, materialName, "GB");
      const best = matcher.match(row);
      if (reference === 0) {
        // A tool, or a name the alias layer refuses, must not match this
        // material by the prepared path either.
        expect(best?.material.slug).not.toBe(target.slug);
        continue;
      }
      expect(best?.material.slug, `${row} should bind ${target.slug}`).toBe(
        target.slug,
      );
      expect(best?.score, `${row} vs ${materialName}`).toBeCloseTo(
        reference,
        5,
      );
    }
  });

  it("stays inside the time budget on a catalogue-sized scan", () => {
    const big: MaterialRef[] = [];
    for (let i = 0; i < 634; i += 1) {
      const word = ["alpha", "bravo", "charlie", "delta", "echo"][i % 5];
      big.push({
        slug: `us-item-${i}`,
        name: `${i % 7 === 0 ? "Cement" : "Sand"} 25kg ${word}`,
        category: "misc",
      });
    }
    const words = ["alpha", "bravo", "charlie", "delta", "echo"];
    const rows = Array.from({ length: 153 }, (_, i) => ({
      name: `Tarmac Sharp Sand 25kg ${words[i % 5]} bulk item ${i}`,
      price: 5,
      currency: "GBP",
      unit: "each",
      brand: null,
      specification: null,
      supplier: "Bravikon",
      location: null,
    }));
    const t0 = Date.now();
    const matched = matchMaterials(rows as never, big, 0.6, "GB");
    const ms = Date.now() - t0;
    expect(matched.length).toBeGreaterThan(0);
    // Before the prepared matcher this comparison took about 3.1 seconds, which
    // is what pushed the GB invocation past its limit.
    expect(ms, `scan took ${ms}ms`).toBeLessThan(700);
  });
});
