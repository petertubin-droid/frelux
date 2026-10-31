import { describe, expect, it } from "vitest";
import {
  buildSearchResult,
  isPromotedNow,
  organicScoreBreakdown,
  splitAndSort,
} from "@/lib/suppliers/ranking";
import type { SupplierListing, SupplierProfile } from "@/lib/suppliers/types";

const DAY = 86_400_000;

function profile(overrides: Partial<SupplierProfile> = {}): SupplierProfile {
  return {
    id: "sup-1",
    user_id: "user-1",
    company_name: "Lekki Building Supplies",
    contact_name: "Ada",
    country_name: "Nigeria",
    market_code: "NG",
    city: "Lagos",
    neighbourhood: "Lekki",
    address: "12 Admiralty Way",
    phone: "+2348000000000",
    whatsapp: null,
    email: "sales@example.com",
    business_reg_no: "RC123",
    tax_id: null,
    description: "Blocks and cement",
    product_categories: ["cement"],
    public_slug: "lekki-building-supplies",
    verification_status: "verified",
    verification_level: "identity_checked",
    is_verified: true,
    delivery_radius_km: 20,
    delivery_notes: null,
    minimum_order_value: null,
    delivery_fee_model: "per_order",
    rating: 4,
    total_quotes_served: 10,
    response_rate: 0.8,
    avg_response_hours: 3,
    subscription_plan: "free",
    subscription_status: "active",
    subscription_renews_at: null,
    is_featured: false,
    featured_until: null,
    lead_credits: 0,
    status: "active",
    verified_at: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function listing(overrides: Partial<SupplierListing> = {}): SupplierListing {
  return {
    id: "list-1",
    supplier_id: "sup-1",
    market_code: "NG",
    material_category: "cement",
    category: "cement",
    material_slug: "cement-dangote-42-5r",
    product_name: "Dangote cement 42.5R",
    brand_name: "Dangote",
    brand: "Dangote",
    specification: "42.5R",
    sku: null,
    description: null,
    unit: "50kg bag",
    unit_price: 9500,
    currency: "NGN",
    minimum_order_qty: null,
    in_stock: true,
    stock_status: "in_stock",
    lead_time_days: 1,
    delivery_available: true,
    delivery_fee: 20000,
    delivery_fee_currency: "NGN",
    bulk_discount_threshold: null,
    bulk_discount_pct: null,
    notes: null,
    is_featured: false,
    is_active: true,
    listing_status: "active",
    admin_notes: null,
    price_updated_at: new Date(Date.now() - 2 * DAY).toISOString(),
    last_updated_at: new Date(Date.now() - 2 * DAY).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("supplier organic ranking", () => {
  it("scores a verified, rated, responsive supplier above an unverified one", () => {
    const strong = organicScoreBreakdown({
      verificationLevel: "platform_verified",
      rating: 5,
      totalQuotesServed: 40,
      responseRate: 1,
      avgResponseHours: 1,
      freshestPriceDays: 1,
      listingCount: 12,
      inStockCount: 12,
    });
    const weak = organicScoreBreakdown({
      verificationLevel: "unverified",
      rating: null,
    });
    expect(strong.total).toBeGreaterThan(weak.total);
    expect(strong.verification).toBeGreaterThan(weak.verification);
    expect(weak.rating).toBe(0);
  });

  it("keeps paid placement out of the organic score", () => {
    const base = organicScoreBreakdown({
      verificationLevel: "documents_reviewed",
      rating: 4,
      freshestPriceDays: 3,
      listingCount: 5,
      inStockCount: 5,
    });
    const featuredSupplier = profile({
      is_featured: true,
      featured_until: new Date(Date.now() + 5 * DAY).toISOString(),
    });
    const result = buildSearchResult(
      featuredSupplier,
      [listing()],
      [listing()],
      [],
    );
    expect(result.promoted).toBe(true);
    // The score is identical to the same profile without the paid flag.
    const plain = buildSearchResult(profile(), [listing()], [listing()], []);
    expect(result.organicScore).toBe(plain.organicScore);
    expect(base.total).toBeGreaterThan(0);
  });

  it("lets a paid placement lapse on its end date", () => {
    const now = new Date("2026-10-31T10:00:00Z");
    expect(
      isPromotedNow(
        { is_featured: true, featured_until: "2026-11-30T00:00:00Z" },
        now,
      ),
    ).toBe(true);
    expect(
      isPromotedNow(
        { is_featured: true, featured_until: "2026-10-01T00:00:00Z" },
        now,
      ),
    ).toBe(false);
    expect(
      isPromotedNow({ is_featured: false, featured_until: null }, now),
    ).toBe(false);
  });

  it("reports promoted and organic results separately, organic sorted by score", () => {
    const paid = buildSearchResult(
      profile({
        id: "paid",
        company_name: "Paid Co",
        is_featured: true,
        featured_until: null,
      }),
      [listing()],
      [listing()],
      [],
    );
    const strong = buildSearchResult(
      profile({
        id: "strong",
        company_name: "A Strong",
        verification_level: "platform_verified",
        rating: 5,
      }),
      [listing()],
      [listing()],
      [],
    );
    const weak = buildSearchResult(
      profile({
        id: "weak",
        company_name: "Z Weak",
        verification_level: "unverified",
        rating: null,
      }),
      [listing()],
      [listing()],
      [],
    );
    const split = splitAndSort([weak, paid, strong]);
    expect(split.promoted.map((r) => r.supplier.id)).toEqual(["paid"]);
    expect(split.organic.map((r) => r.supplier.id)).toEqual(["strong", "weak"]);
  });

  it("returns no lowest price when nothing matched", () => {
    const result = buildSearchResult(profile(), [listing()], [], []);
    expect(result.lowestPrice).toBeNull();
    expect(result.currency).toBe("NGN");
  });
});
