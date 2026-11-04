/**
 * Products FRELUX recommends inside its estimators.
 *
 * Two rules govern this file, and both exist because a recommendation that
 * quotes a wrong number is worse than one that says nothing:
 *
 * 1. Every entry names the page its figures came from and the day that page
 *    was read. No figure in here is remembered, inferred or rounded from a
 *    neighbouring product.
 * 2. An unpublished figure stays null. A product that is sold without a
 *    published pack price carries no pack price, and the UI says so instead of
 *    showing an estimate dressed as a fact.
 *
 * Prices are a published range, never a single invented point: manufacturers
 * and their stores price paint by colour and tint, so the range is what the
 * store actually shows. FRELUX quotes against its own verified price book for
 * calculations; what is here fills the "which product should I buy" question,
 * especially in markets whose book is priced by role rather than by product.
 */

export type VerifiedProductCategory =
  | "paint"
  | "cement"
  | "aggregate"
  | "rebar"
  | "steel"
  | "roofing"
  | "flooring"
  | "pipe"
  | "plumbing"
  | "waterproofing"
  | "electrical"
  | "doors_windows"
  | "timber"
  | "drywall"
  | "plaster"
  | "filler"
  | "primer"
  | "adhesive"
  | "sealant";

export type VerifiedFinish =
  "matt" | "satin" | "silk" | "gloss" | "textured" | "primer";

export interface VerifiedPack {
  /** Container size in litres, kilos or units, per `unit`. */
  size: number;
  /** "L", "kg" or "unit". */
  unit: "L" | "kg" | "unit";
  /** Lowest published price for this pack, in `currency`. */
  priceLow: number;
  /** Highest published price for this pack, in `currency`. */
  priceHigh: number;
}

export interface VerifiedProduct {
  /** Stable slug, unique across the file. */
  id: string;
  /** ISO market code whose stores publish these figures. */
  market: string;
  currency: string;
  brand: string;
  /** Manufacturer product name, as published. */
  line: string;
  category: VerifiedProductCategory;
  finish: VerifiedFinish | null;
  /** Coverage the manufacturer publishes, m² per litre per coat. */
  coveragePerLitre: number | null;
  /** Coats the manufacturer recommends for a full colour change. */
  coats: number | null;
  /** Published packs. Empty when the store does not publish a pack price. */
  packs: VerifiedPack[];
  /** One line of what the product is for, in the manufacturer's terms. */
  summary: string;
  /** Page the figures came from. */
  sourceUrl: string;
  sourceName: string;
  /** ISO date the page was read. */
  retrieved: string;
  /** Where a coverage figure comes from, when it is not the same page. */
  coverageSourceUrl?: string;
  /** Anything a buyer should know before the number is trusted. */
  caveat?: string;
}

export const VERIFIED_PRODUCTS: readonly VerifiedProduct[] = [
  {
    id: "ng-berger-luxol-premium-matt-20l",
    market: "NG",
    currency: "NGN",
    brand: "Berger",
    line: "Luxol Premium Matt",
    category: "paint",
    finish: "matt",
    coveragePerLitre: 16,
    coats: 2,
    packs: [{ size: 20, unit: "L", priceLow: 119110, priceHigh: 131795 }],
    summary:
      "Water based matt emulsion for interior walls and ceilings, two coats for a full colour change.",
    sourceUrl: "https://bergerpaintsnig.com/shop/product-category/decorative/",
    sourceName: "Berger Paints Nigeria store, Decorative range",
    retrieved: "2026-11-04",
    coverageSourceUrl:
      "https://nairametrics.com/2024/11/18/berger-paints-introduces-nigerias-first-eco-friendly-matt-finish-paint-luxol-premium-matt/",
    caveat:
      "The store prices this by colour, so the range covers the standard colours it lists for the 20 L pack.",
  },
  {
    id: "ng-berger-luxol-premium-silk-20l",
    market: "NG",
    currency: "NGN",
    brand: "Berger",
    line: "Luxol Premium Silk",
    category: "paint",
    finish: "silk",
    coveragePerLitre: null,
    coats: null,
    packs: [{ size: 20, unit: "L", priceLow: 141362.5, priceHigh: 156788.75 }],
    summary:
      "Silk sheen emulsion for interior walls, the harder wearing finish in the Luxol Premium range.",
    sourceUrl: "https://bergerpaintsnig.com/shop/product-category/decorative/",
    sourceName: "Berger Paints Nigeria store, Decorative range",
    retrieved: "2026-11-04",
    caveat:
      "Berger publishes no coverage rate for this line on the store page, so FRELUX quotes it against its own verified coverage for silk finishes rather than inventing one.",
  },
  {
    id: "ng-berger-superstar-standard-matt-20l",
    market: "NG",
    currency: "NGN",
    brand: "Berger",
    line: "Superstar Standard Matt",
    category: "paint",
    finish: "matt",
    coveragePerLitre: null,
    coats: null,
    packs: [{ size: 20, unit: "L", priceLow: 59017.5, priceHigh: 99437.5 }],
    summary:
      "The standard matt emulsion in Berger's range, for interiors where the finish matters less than the budget.",
    sourceUrl: "https://bergerpaintsnig.com/shop/product-category/decorative/",
    sourceName: "Berger Paints Nigeria store, Decorative range",
    retrieved: "2026-11-04",
    caveat:
      "No published coverage rate on the store page; FRELUX uses its own verified matt coverage for the calculation.",
  },
  {
    id: "ng-dulux-trade-vinyl-matt",
    market: "NG",
    currency: "NGN",
    brand: "Dulux",
    line: "Dulux Trade Vinyl Matt",
    category: "paint",
    finish: "matt",
    coveragePerLitre: 17,
    coats: 2,
    packs: [],
    summary:
      "High opacity matt emulsion for interior walls and ceilings, water based and 99.9% VOC free.",
    sourceUrl:
      "https://www.duluxtradepaintexpert.co.uk/en/products/dulux-trade-vinyl-matt/cccId_1091317",
    sourceName: "Dulux Trade product page (AkzoNobel)",
    retrieved: "2026-11-04",
    caveat:
      "Specification read from the manufacturer's own product page. Dulux Nigeria does not publish pack prices on a page FRELUX can read, so this line carries no naira figure here; FRELUX quotes Dulux work from its own verified price book.",
  },
  {
    id: "ng-dulux-trade-vinyl-silk",
    market: "NG",
    currency: "NGN",
    brand: "Dulux",
    line: "Dulux Trade Vinyl Silk",
    category: "paint",
    finish: "silk",
    coveragePerLitre: 16,
    coats: 2,
    packs: [],
    summary:
      "Washable mid sheen emulsion for interior walls, the tougher Dulux finish for high traffic rooms.",
    sourceUrl:
      "https://source.thenbs.com/en/gb/product/dulux-trade-vinyl-silk/ebF51nrsvP7AibP2UeZwF9/NGMbW5FmqiZsYoztc2u5p",
    sourceName: "NBS Source listing for Dulux Trade Vinyl Silk",
    retrieved: "2026-11-04",
    caveat:
      "Coverage read from the manufacturer's published product data. No published naira pack price, so this line carries no figure here.",
  },
];

/** Products for one category, in one market, in catalogue order. */
export function verifiedProductsFor(
  category: VerifiedProductCategory,
  market: string,
): VerifiedProduct[] {
  const code = (market || "").toUpperCase();
  return VERIFIED_PRODUCTS.filter(
    (p) => p.category === category && p.market === code,
  );
}
