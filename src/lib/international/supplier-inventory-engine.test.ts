import { describe, it, expect } from "vitest";
import {
  SAMPLE_SUPPLIER_INVENTORY,
  SAMPLE_SUPPLIER_PROFILES,
  calculateBulkSupplierDiscount,
  selectBestSupplierQuote,
  toSupplierOffers,
} from "./supplier-inventory-engine";
import type { SupplierInventoryItem } from "@/types/hybrid-pricing";

describe("System C: Localized Supplier Inventory Engine", () => {
  it("selects most competitive verified supplier quote", () => {
    const items: SupplierInventoryItem[] = [
      {
        id: "item-a",
        supplier_id: "supplier-a",
        market_code: "KE",
        material_category: "cement",
        material_slug: "cement-bag-50kg",
        product_name: "Premium Cement",
        unit: "50kg bag",
        unit_price: 1000,
        currency: "KES",
        minimum_order_qty: 1,
        in_stock: true,
        bulk_discount_threshold: 100,
        bulk_discount_pct: 4,
      },
      {
        id: "item-b",
        supplier_id: "supplier-b",
        market_code: "KE",
        material_category: "cement",
        material_slug: "cement-bag-50kg",
        product_name: "Budget Cement",
        unit: "50kg bag",
        unit_price: 950,
        currency: "KES",
        minimum_order_qty: 1,
        in_stock: true,
      },
    ];

    const best = selectBestSupplierQuote(items, 20);
    expect(best?.id).toBe("item-b");
  });

  it("calculates bulk discounts", () => {
    const item = SAMPLE_SUPPLIER_INVENTORY.find(
      (i) => i.id === "item-ke-cement-001",
    )!;
    const calc = calculateBulkSupplierDiscount(item, 120);

    expect(calc.discountPct).toBe(3.5);
    expect(calc.unitPrice).toBe(946);
    expect(calc.totalPrice).toBe(113520);
    expect(calc.savings).toBe(4080);
  });

  it("fetches sample Kenya supplier inventory for cement", async () => {
    const items = SAMPLE_SUPPLIER_INVENTORY.filter(
      (i) => i.market_code === "KE" && i.material_slug === "cement-bag-50kg",
    );
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].unit_price).toBe(980);
  });

  it("does not infer supplier identity or verification from demo fixture ids", () => {
    const fixture = SAMPLE_SUPPLIER_INVENTORY.find((i) => i.market_code === "KE")!;
    const offer = toSupplierOffers([{ ...fixture, supplier: undefined }])[0];
    expect(offer.supplierName).toBe("Supplier identity unavailable");
    expect(offer.isVerified).toBe(false);
  });

  it("has supplier profiles for all seeded markets", () => {
    const markets = new Set(SAMPLE_SUPPLIER_PROFILES.map((p) => p.market_code));
    expect(markets).toEqual(new Set(["KE", "NG", "GH", "ZA"]));
  });
});
