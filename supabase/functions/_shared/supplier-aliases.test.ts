import { describe, expect, it } from "vitest";
import {
  aliasMatchScore,
  matchMaterials,
  stripMarketSuffix,
} from "./market-feeds.ts";
import { canonicaliseProduct } from "./supplier-aliases.ts";

// Product names taken from the catalogues that are actually staged: Plyco
// (AU, Shopify products.json) and Handley Lumber (CA). Not invented samples.
const AU_PRODUCTS = [
  "Hoop Pine AC Plywood 18mm",
  "Hoop Pine AA Marine Plywood 24mm",
  "Premium Birch Plywood 30mm",
];
const CA_PRODUCTS = [
  "Treated Lumber 2x6",
  "Construction Screws",
  "Dock Hardware",
];

const material = (slug: string, name: string) => ({ slug, name });

const canonical = (name: string, market: string) => {
  const r = canonicaliseProduct(name, market);
  return r.kind === "material" ? r.canonical : null;
};

describe("market suffix on catalogue names", () => {
  it("is removed so a supplier row can still match", () => {
    expect(stripMarketSuffix("N-grade rebar 20mm x 12m (AU)")).toBe(
      "N-grade rebar 20mm x 12m",
    );
    expect(stripMarketSuffix("No suffix here")).toBe("No suffix here");
  });
});

describe("AU vocabulary", () => {
  it("keeps the real product identity intact", () => {
    expect(canonical("Hoop Pine AC Plywood 18mm", "AU")).toBe(
      "hoop pine ac plywood 18mm",
    );
  });

  it("matches an identical AU material by canonical name", () => {
    expect(
      aliasMatchScore(
        "Hoop Pine AC Plywood 18mm",
        "Hoop Pine AC Plywood 18mm (AU)",
        "AU",
      ),
    ).toBe(1);
  });

  it("translates Villaboard to the sheet it actually is", () => {
    expect(canonical("Villaboard 9mm 2700x1200", "AU")).toBe(
      "fibre cement sheet 9mm 2700x1200",
    );
    expect(
      aliasMatchScore("Villaboard 9mm", "Fibre cement sheet 9mm (AU)", "AU"),
    ).toBe(1);
  });

  it("translates Gyprock Base Coat as one compound, not two words", () => {
    expect(canonical("CSR Gyprock Base Coat 45", "AU")).toBe(
      "csr plasterboard joint compound 45",
    );
  });

  it("still refuses a thickness the material does not have", () => {
    // 30mm birch plywood is not the 18mm hoop pine row, however well the
    // words line up.
    expect(
      aliasMatchScore(
        "Premium Birch Plywood 30mm",
        "Hoop Pine AC Plywood 18mm",
        "AU",
      ),
    ).toBe(0);
  });
});

describe("CA vocabulary", () => {
  it("calls drywall what the catalogue calls it", () => {
    expect(canonical("Sheetrock 1/2 in 4x8", "CA")).toBe(
      "plasterboard 1/2 in 4x8",
    );
    expect(
      aliasMatchScore("Sheetrock 1/2 in", "Plasterboard 1/2 in (CA)", "CA"),
    ).toBe(1);
  });

  it("matches treated lumber on its own terms", () => {
    expect(
      aliasMatchScore("Treated Lumber 2x6", "Treated lumber 2x6 (CA)", "CA"),
    ).toBe(1);
  });

  it("maps OSB to the panel it is", () => {
    expect(canonical("OSB Sheathing 7/16", "CA")).toBe(
      "oriented strand board 7/16",
    );
  });
});

describe("aliases stay inside their market", () => {
  it("does not apply an AU term to a CA row", () => {
    // Nobody in Canada sells Villaboard; leaving the word alone is right.
    expect(canonical("Villaboard 9mm", "CA")).toBe("villaboard 9mm");
  });

  it("does not translate a word it has no alias for", () => {
    expect(canonical("Cement 50kg", "AU")).toBe("cement 50kg");
  });
});

describe("tools and hardware are refused, not mapped", () => {
  it("refuses the staged CA hardware rows", () => {
    for (const name of ["Construction Screws", "Dock Hardware"]) {
      const r = canonicaliseProduct(name, "CA");
      expect(r.kind).toBe("rejected");
    }
  });

  it("refuses the pipe wrench that was once auto-mapped as drainage pipe", () => {
    const score = aliasMatchScore(
      "Pipe Wrench 350mm",
      "Drainage pipe 110mm (AU)",
      "AU",
    );
    expect(score).toBe(0);
    expect(canonical("Pipe Wrench 350mm", "AU")).toBeNull();
  });

  it("refuses fasteners and abrasives", () => {
    for (const name of [
      "Deck Screws 50mm",
      "Cutting Disc 115mm",
      "Nails 75mm",
    ]) {
      expect(canonicaliseProduct(name, "AU").kind).toBe("rejected");
    }
  });
});

describe("binding a whole catalogue", () => {
  const catalogue = [
    material("au-hoop-pine-ac-18mm", "Hoop Pine AC Plywood 18mm (AU)"),
    material("au-fc-sheet-9mm", "Fibre cement sheet 9mm (AU)"),
    material("ca-treated-2x6", "Treated lumber 2x6 (CA)"),
    material("au-drainage-110", "Drainage pipe 110mm (AU)"),
  ];

  it("binds the AU panel products and skips the unmatched one", () => {
    const rows = AU_PRODUCTS.map((name) => ({ name }));
    const matched = matchMaterials(rows, catalogue, 0.6, "AU");
    // Hoop Pine AC matches; the marine and birch panels have no catalogue row.
    expect(matched.map((m) => m.material.slug)).toEqual([
      "au-hoop-pine-ac-18mm",
    ]);
  });

  it("binds CA lumber and rejects both hardware rows", () => {
    const rows = CA_PRODUCTS.map((name) => ({ name }));
    const matched = matchMaterials(rows, catalogue, 0.6, "CA");
    expect(matched.map((m) => m.material.slug)).toEqual(["ca-treated-2x6"]);
  });

  it("matches nothing at all without the market, which was the original gap", () => {
    const rows = [{ name: "Villaboard 9mm" }];
    expect(matchMaterials(rows, catalogue, 0.6)).toHaveLength(0);
  });

  it("matches it once the market is known", () => {
    const rows = [{ name: "Villaboard 9mm" }];
    expect(matchMaterials(rows, catalogue, 0.6, "AU")).toHaveLength(1);
  });
});
