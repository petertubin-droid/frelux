import { describe, expect, it } from "vitest";
import {
  buildComparison,
  landedUnitPrice,
  listingSignature,
  quoteComparisonNote,
} from "@/lib/suppliers/comparison";
import type { SupplierListing, SupplierProfile } from "@/lib/suppliers/types";

const DAY = 86_400_000;

type SupplierRef = Pick<
  SupplierProfile,
  | "id"
  | "company_name"
  | "city"
  | "neighbourhood"
  | "verification_level"
  | "public_slug"
>;

function supplier(id: string, name: string): SupplierRef & { rating?: number } {
  return {
    id,
    company_name: name,
    city: "Lagos",
    neighbourhood: "Lekki",
    verification_level: "documents_reviewed",
    public_slug: id,
  };
}

function listing(overrides: Partial<SupplierListing> = {}): SupplierListing {
  return {
    id: "l1",
    supplier_id: "s1",
    market_code: "NG",
    material_category: "cement",
    category: "cement",
    material_slug: "cement-dangote-42-5r",
    product_name: "Dangote cement",
    brand_name: "Dangote",
    brand: "Dangote",
    specification: "42.5R",
    sku: null,
    description: null,
    unit: "50kg bag",
    unit_price: 9000,
    currency: "NGN",
    minimum_order_qty: null,
    in_stock: true,
    stock_status: "in_stock",
    lead_time_days: 1,
    delivery_available: true,
    delivery_fee: 10000,
    delivery_fee_currency: "NGN",
    bulk_discount_threshold: null,
    bulk_discount_pct: null,
    notes: null,
    is_featured: false,
    is_active: true,
    listing_status: "active",
    admin_notes: null,
    price_updated_at: new Date(Date.now() - DAY).toISOString(),
    last_updated_at: new Date(Date.now() - DAY).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("specification-aware comparison", () => {
  it("treats brand, specification and unit as part of the signature", () => {
    const base = listing();
    expect(listingSignature(base)).toBe(
      listingSignature(listing({ unit_price: 12000 })),
    );
    expect(listingSignature(base)).not.toBe(
      listingSignature(listing({ specification: "32.5R" })),
    );
    expect(listingSignature(base)).not.toBe(
      listingSignature(listing({ brand: "BUA", brand_name: "BUA" })),
    );
    expect(listingSignature(base)).not.toBe(
      listingSignature(listing({ unit: "tonne" })),
    );
  });

  it("spreads a per-order delivery fee over the quantity", () => {
    expect(
      landedUnitPrice(
        { unit_price: 9000, delivery_available: true, delivery_fee: 20000 },
        10,
      ),
    ).toEqual({
      value: 11000,
      deliveryKnown: true,
    });
    // Pickup: the unit price is the landed price, no delivery assumed.
    expect(
      landedUnitPrice(
        { unit_price: 9000, delivery_available: false, delivery_fee: 20000 },
        10,
      ),
    ).toEqual({
      value: 9000,
      deliveryKnown: true,
    });
  });

  it("leaves the landed price unknown when delivery is quoted per order", () => {
    expect(
      landedUnitPrice(
        { unit_price: 9000, delivery_available: true, delivery_fee: null },
        10,
      ),
    ).toEqual({
      value: null,
      deliveryKnown: false,
    });
    expect(
      landedUnitPrice(
        { unit_price: 0, delivery_available: true, delivery_fee: 500 },
        10,
      ).value,
    ).toBeNull();
  });

  it("ranks same-specification offers and marks only a real winner", () => {
    const groups = buildComparison(
      [
        {
          listing: listing({ id: "cheap", supplier_id: "a", unit_price: 8500 }),
          supplier: supplier("a", "Alpha"),
        },
        {
          listing: listing({ id: "dear", supplier_id: "b", unit_price: 9200 }),
          supplier: supplier("b", "Beta"),
        },
      ],
      10,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].comparable).toBe(true);
    expect(groups[0].specGroups[0].cheapestSupplierId).toBe("a");
    expect(
      groups[0].specGroups[0].listings.map((entry) => entry.listing.id),
    ).toEqual(["cheap", "dear"]);
  });

  it("keeps different specifications apart and claims no cheapest price across them", () => {
    const groups = buildComparison([
      {
        listing: listing({
          id: "42",
          supplier_id: "a",
          specification: "42.5R",
        }),
        supplier: supplier("a", "Alpha"),
      },
      {
        listing: listing({
          id: "32",
          supplier_id: "b",
          specification: "32.5R",
          unit_price: 7000,
        }),
        supplier: supplier("b", "Beta"),
      },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].comparable).toBe(false);
    expect(groups[0].specGroups).toHaveLength(2);
    for (const spec of groups[0].specGroups)
      expect(spec.cheapestSupplierId).toBeNull();
    expect(groups[0].note).toMatch(/differ/i);
  });

  it("does not call a winner when only one offer has a known landed price", () => {
    const groups = buildComparison([
      {
        listing: listing({ id: "known", supplier_id: "a", delivery_fee: 5000 }),
        supplier: supplier("a", "Alpha"),
      },
      {
        listing: listing({
          id: "unknown",
          supplier_id: "b",
          delivery_fee: null,
        }),
        supplier: supplier("b", "Beta"),
      },
    ]);
    expect(groups[0].specGroups[0].cheapestSupplierId).toBeNull();
    const unknown = groups[0].specGroups[0].listings.find(
      (entry) => entry.listing.id === "unknown",
    );
    expect(unknown?.landedUnitPrice).toBeNull();
  });
});

describe("quotation comparison notes", () => {
  it("flags mixed currencies and mixed line shapes", () => {
    const notes = quoteComparisonNote([
      {
        supplier_id: "a",
        total: 100000,
        currency: "NGN",
        lead_time_days: 2,
        valid_until: null,
        lines: [{ description: "Cement", unit: "bag", quantity: 100 }],
      },
      {
        supplier_id: "b",
        total: 250,
        currency: "USD",
        lead_time_days: 3,
        valid_until: null,
        lines: [{ description: "Cement", unit: "tonne", quantity: 5 }],
      },
    ]);
    expect(notes.join(" ")).toMatch(/different currencies/i);
    expect(notes.join(" ")).toMatch(/line by line/i);
  });

  it("says nothing when there is only one quotation", () => {
    expect(
      quoteComparisonNote([
        {
          supplier_id: "a",
          total: 1000,
          currency: "NGN",
          lead_time_days: null,
          valid_until: null,
          lines: [{ description: "Sand", unit: "tonne", quantity: 2 }],
        },
      ]),
    ).toEqual([]);
  });

  it("flags an expired validity date", () => {
    const notes = quoteComparisonNote([
      {
        supplier_id: "a",
        total: 1000,
        currency: "NGN",
        lead_time_days: null,
        valid_until: new Date(Date.now() - 3 * DAY).toISOString(),
        lines: [{ description: "Sand", unit: "tonne", quantity: 2 }],
      },
      {
        supplier_id: "b",
        total: 1100,
        currency: "NGN",
        lead_time_days: null,
        valid_until: new Date(Date.now() + 3 * DAY).toISOString(),
        lines: [{ description: "Sand", unit: "tonne", quantity: 2 }],
      },
    ]);
    expect(notes.join(" ")).toMatch(/validity date/i);
  });
});
