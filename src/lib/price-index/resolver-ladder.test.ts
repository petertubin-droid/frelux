import { describe, expect, it } from "vitest";
import { classifyEvidence, resolveMaterialPrice } from "./resolver";
import type { IndexListing } from "./types";

const base: IndexListing = {
  price_id: "p1",
  material_id: "mat-1",
  name: "Cement, 50 kg bag",
  slug: "ng-cement-50kg",
  category: "cement",
  sale_unit: "50 kg bag",
  price: 50000,
  currency: "NGN",
  price_kind: "retail",
  market: "NG",
  city_slug: "lagos",
  supplier_name: "Iyana Ipaja Depot",
  brand: "Dangote",
  package_size: "50 kg",
  delivery_included: false,
  source_url: "https://example.com/cement",
  price_source: "supplier price list",
  effective_date: "2026-10-28",
  verified_at: "2026-10-28",
  verification_status: "verified",
  supporting_submissions: 3,
};

const listing = (over: Partial<IndexListing>): IndexListing => ({
  ...base,
  ...over,
});

const three = (over: Partial<IndexListing>): IndexListing[] => [
  listing({ price_id: "a", price: 48000, ...over }),
  listing({ price_id: "b", price: 50000, ...over }),
  listing({ price_id: "c", price: 52000, ...over }),
];

describe("evidence ladder", () => {
  it("labels verified city evidence as the top rung", () => {
    const result = resolveMaterialPrice({
      materialId: "mat-1",
      citySlug: "lagos",
      listings: three({}),
      market: "NG",
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.tier).toBe("approved_city_index");
    expect(result.indicative).toBe(false);
    expect(result.warnings).toEqual([]);
    expect(result.currency).toBe("NGN");
    expect(result.brand).toBe("Dangote");
    expect(result.package_size).toBe("50 kg");
    expect(result.delivery_included).toBe(false);
    expect(result.source_url).toBe("https://example.com/cement");
  });

  it("labels reported-only evidence as a crowdsourced benchmark", () => {
    const result = resolveMaterialPrice({
      materialId: "mat-1",
      citySlug: "lagos",
      listings: three({ verification_status: "reported", verified_at: null }),
      market: "NG",
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.tier).toBe("crowdsourced_benchmark");
    expect(result.indicative).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/no supplier has verified/i);
  });

  it("labels an FX reference band as macro-adjusted, never as a quotation", () => {
    const result = resolveMaterialPrice({
      materialId: "mat-1",
      citySlug: "lagos",
      listings: three({
        verification_status: "reported",
        verified_at: null,
        price_source: "FX reference from the live NG book",
      }),
      market: "NG",
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.tier).toBe("macro_adjusted_reference");
    expect(result.indicative).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/not a supplier quotation/i);
  });

  it("labels a seeded baseline as a baseline, not a market price", () => {
    const result = resolveMaterialPrice({
      materialId: "mat-1",
      citySlug: "lagos",
      listings: three({
        verification_status: "reported",
        verified_at: null,
        price_source: "seeded reference (pre-Oct 2026, no retailer link)",
      }),
      market: "NG",
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.tier).toBe("baseline_reference");
    expect(result.warnings.join(" ")).toMatch(/no live source/i);
  });

  it("records a fallback reason when the city is short of evidence", () => {
    const result = resolveMaterialPrice({
      materialId: "mat-1",
      citySlug: "abuja",
      listings: three({}),
      market: "NG",
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.basis).toBe("national");
    expect(result.fallback_reason).toMatch(/not enough prices in this city/i);
    expect(result.warnings).toContain(result.fallback_reason);
  });
});

describe("market isolation", () => {
  it("refuses to borrow another market's prices", () => {
    const result = resolveMaterialPrice({
      materialId: "mat-1",
      citySlug: "lagos",
      listings: three({ market: "US", currency: "USD", price: 12 }),
      market: "NG",
    });
    expect(result.status).toBe("unavailable");
    if (result.status !== "unavailable") return;
    expect(result.code).toBe("market_mismatch");
    expect(result.reason).toMatch(/will not be borrowed across markets/i);
  });

  it("keeps markets apart when both are present", () => {
    const result = resolveMaterialPrice({
      materialId: "mat-1",
      citySlug: "lagos",
      listings: [
        ...three({}),
        listing({ price_id: "us1", market: "US", currency: "USD", price: 12 }),
        listing({ price_id: "us2", market: "US", currency: "USD", price: 13 }),
        listing({ price_id: "us3", market: "US", currency: "USD", price: 14 }),
      ],
      market: "NG",
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.market).toBe("NG");
    expect(result.currency).toBe("NGN");
    expect(result.price).toBe(50000);
  });
});

describe("incompatible evidence is never pooled", () => {
  it("refuses to blend two brands", () => {
    const result = resolveMaterialPrice({
      materialId: "mat-1",
      citySlug: "lagos",
      listings: [
        listing({ price_id: "a", brand: "Dangote", price: 48000 }),
        listing({ price_id: "b", brand: "BUA", price: 52000 }),
        listing({ price_id: "c", brand: "Lafarge", price: 54000 }),
      ],
      market: "NG",
    });
    expect(result.status).toBe("unavailable");
    if (result.status !== "unavailable") return;
    expect(result.code).toBe("mixed_brand");
  });

  it("resolves cleanly once a brand is chosen", () => {
    const result = resolveMaterialPrice({
      materialId: "mat-1",
      citySlug: "lagos",
      brand: "BUA",
      listings: [
        ...three({ brand: "BUA" }),
        listing({ price_id: "b", brand: "Dangote", price: 52000 }),
      ],
      market: "NG",
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.brand).toBe("BUA");
    expect(result.price).toBe(50000);
  });

  it("refuses to blend two sale units", () => {
    const result = resolveMaterialPrice({
      materialId: "mat-1",
      citySlug: "lagos",
      listings: [
        listing({ price_id: "a", sale_unit: "50 kg bag", price: 50000 }),
        listing({ price_id: "b", sale_unit: "tonne", price: 900000 }),
        listing({ price_id: "c", sale_unit: "25 kg bag", price: 27000 }),
      ],
      market: "NG",
    });
    expect(result.status).toBe("unavailable");
    if (result.status !== "unavailable") return;
    expect(result.code).toBe("mixed_sale_unit");
  });
});

describe("classifyEvidence", () => {
  it("separates quotations from references and baselines", () => {
    expect(classifyEvidence(listing({ verification_status: "verified" }))).toBe(
      "supplier_verified",
    );
    expect(
      classifyEvidence(
        listing({
          verification_status: "reported",
          price_source: "Home Depot",
        }),
      ),
    ).toBe("supplier_reported");
    expect(
      classifyEvidence(
        listing({
          price_source: "Indicative 2026 retail band; admin-adjustable",
        }),
      ),
    ).toBe("macro_reference");
    expect(
      classifyEvidence(
        listing({ price_source: "seeded reference, no retailer link" }),
      ),
    ).toBe("baseline");
  });
});
