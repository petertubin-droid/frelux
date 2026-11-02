import { describe, expect, it } from "vitest";
import {
  groupByMaterial,
  provenanceLabel,
  resolveMaterialPrice,
  toSamples,
} from "./resolver";
import type { IndexListing } from "./types";

const listing = (over: Partial<IndexListing>): IndexListing => ({
  price_id: over.price_id ?? Math.random().toString(36).slice(2),
  material_id: over.material_id ?? "mat-1",
  name: over.name ?? "Dangote 3X cement, 50 kg bag",
  slug: over.slug ?? "ng-cement-dangote-3x-50kg",
  category: over.category ?? "cement",
  sale_unit: over.sale_unit ?? "50 kg bag",
  price: over.price ?? 50000,
  currency: "NGN",
  price_kind: over.price_kind ?? "retail",
  market: "NG",
  city_slug: over.city_slug ?? "lagos",
  supplier_name: over.supplier_name ?? "Iyana Ipaja Depot",
  source_url: null,
  price_source: over.price_source ?? "supplier price list",
  effective_date: over.effective_date ?? "2026-10-28",
  verified_at: over.verified_at ?? null,
  verification_status: over.verification_status ?? "reported",
  supporting_submissions: over.supporting_submissions ?? 1,
});

describe("toSamples", () => {
  it("drops non-positive prices", () => {
    const samples = toSamples([
      listing({ price: 0 }),
      listing({ price: -3 }),
      listing({ price: 50000 }),
    ]);
    expect(samples).toHaveLength(1);
  });
});

describe("resolveMaterialPrice", () => {
  it("uses city evidence when the city clears the sample gate", () => {
    const resolved = resolveMaterialPrice({
      materialId: "mat-1",
      citySlug: "lagos",
      listings: [
        listing({ price: 50000 }),
        listing({ price: 51000 }),
        listing({ price: 52000 }),
        listing({ city_slug: "kano", price: 45000 }),
      ],
    });
    expect(resolved.status).toBe("ok");
    if (resolved.status !== "ok") return;
    expect(resolved.basis).toBe("city");
    expect(resolved.price).toBe(51000);
    expect(resolved.sample_size).toBe(3);
    expect(resolved.indicative).toBe(true);
  });

  it("falls back to the national median, labelled as such", () => {
    const resolved = resolveMaterialPrice({
      materialId: "mat-1",
      citySlug: "jos",
      listings: [
        listing({ city_slug: "lagos", price: 50000 }),
        listing({ city_slug: "kano", price: 52000 }),
        listing({ city_slug: "abuja", price: 54000 }),
      ],
    });
    expect(resolved.status).toBe("ok");
    if (resolved.status !== "ok") return;
    expect(resolved.basis).toBe("national");
    expect(resolved.price).toBe(52000);
    expect(resolved.note).toMatch(/indicative/);
    expect(resolved.indicative).toBe(true);
  });

  it("says unavailable rather than publishing a single submission", () => {
    const resolved = resolveMaterialPrice({
      materialId: "mat-1",
      citySlug: "lagos",
      listings: [listing({ price: 50000 })],
    });
    expect(resolved.status).toBe("unavailable");
    if (resolved.status !== "unavailable") return;
    expect(resolved.reason).toMatch(/1 price collected here/);
  });

  it("marks verified evidence as not indicative", () => {
    const resolved = resolveMaterialPrice({
      materialId: "mat-1",
      citySlug: "lagos",
      listings: [
        listing({ price: 50000, verification_status: "verified" }),
        listing({ price: 51000, verification_status: "verified" }),
        listing({ price: 52000, verification_status: "verified" }),
      ],
    });
    if (resolved.status !== "ok") throw new Error("expected ok");
    expect(resolved.confidence).toBe("verified");
    expect(resolved.indicative).toBe(false);
  });

  it("never uses a flagged price", () => {
    const resolved = resolveMaterialPrice({
      materialId: "mat-1",
      citySlug: "lagos",
      listings: [
        listing({ price: 50000, verification_status: "flagged" }),
        listing({ price: 51000, verification_status: "flagged" }),
        listing({ price: 52000, verification_status: "flagged" }),
      ],
    });
    expect(resolved.status).toBe("unavailable");
  });

  it("respects an explicit price kind", () => {
    const listings = [
      listing({ price: 50000, price_kind: "retail" }),
      listing({ price: 51000, price_kind: "retail" }),
      listing({ price: 52000, price_kind: "retail" }),
      listing({ price: 40000, price_kind: "wholesale" }),
    ];
    const retail = resolveMaterialPrice({
      materialId: "mat-1",
      citySlug: "lagos",
      listings,
      priceKind: "retail",
    });
    if (retail.status !== "ok") throw new Error("expected ok");
    expect(retail.price).toBe(51000);
  });

  it("carries the supplier and the observation date for display", () => {
    const resolved = resolveMaterialPrice({
      materialId: "mat-1",
      citySlug: "lagos",
      listings: [
        listing({ price: 50000, effective_date: "2026-10-20" }),
        listing({ price: 51000, effective_date: "2026-10-27" }),
        listing({ price: 52000, effective_date: "2026-10-28" }),
      ],
    });
    if (resolved.status !== "ok") throw new Error("expected ok");
    expect(resolved.last_observed_at).toBe("2026-10-28");
    expect(resolved.supplier_note).toContain("Iyana Ipaja Depot");
  });

  it("returns unavailable when there is no listing at all", () => {
    const resolved = resolveMaterialPrice({ materialId: "mat-9", citySlug: "lagos", listings: [] });
    expect(resolved.status).toBe("unavailable");
  });
});

describe("groupByMaterial", () => {
  it("groups listings by material id", () => {
    const grouped = groupByMaterial([
      listing({ material_id: "a" }),
      listing({ material_id: "b" }),
      listing({ material_id: "a" }),
    ]);
    expect(grouped.get("a")).toHaveLength(2);
    expect(grouped.get("b")).toHaveLength(1);
  });
});

describe("provenanceLabel", () => {
  it("describes a city, kind and trust level", () => {
    const resolved = resolveMaterialPrice({
      materialId: "mat-1",
      citySlug: "lagos",
      listings: [
        listing({ price: 50000 }),
        listing({ price: 51000 }),
        listing({ price: 52000 }),
      ],
    });
    expect(provenanceLabel(resolved)).toBe("retail · indicative");
  });

  it("says national when the figure is not local", () => {
    const resolved = resolveMaterialPrice({
      materialId: "mat-1",
      citySlug: "jos",
      listings: [
        listing({ city_slug: "lagos" }),
        listing({ city_slug: "kano" }),
        listing({ city_slug: "abuja" }),
      ],
    });
    expect(provenanceLabel(resolved)).toBe("national median · retail · indicative");
  });
});
