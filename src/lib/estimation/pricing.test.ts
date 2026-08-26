import { describe, it, expect } from "vitest";
import {
  createPriceSnapshot,
  calculateLineTotal,
  calculateEstimateTotal,
  formatCurrency,
  isPriceConfigured,
} from "./pricing";

describe("estimation/pricing", () => {
  it("createPriceSnapshot builds correct object", () => {
    const snap = createPriceSnapshot(2500, "Premium Paint", 20, "litres");
    expect(snap.unit_price).toBe(2500);
    expect(snap.ref_name).toBe("Premium Paint");
    expect(snap.currency).toBe("NGN");
    expect(snap.pack_size).toBe(20);
    expect(snap.pack_unit).toBe("litres");
    expect(snap.price_type).toBe("product");
  });

  it("createPriceSnapshot handles NaN price", () => {
    const snap = createPriceSnapshot(NaN, "Test");
    expect(snap.unit_price).toBe(0);
  });

  it("createPriceSnapshot accepts options", () => {
    const snap = createPriceSnapshot(100, "Item", null, null, {
      priceType: "quality",
      currency: "USD",
      refId: "ref123",
    });
    expect(snap.price_type).toBe("quality");
    expect(snap.currency).toBe("USD");
    expect(snap.ref_id).toBe("ref123");
  });

  it("calculateLineTotal multiplies price * qty", () => {
    expect(calculateLineTotal(2500, 3)).toBe(7500);
    expect(calculateLineTotal(100.5, 2)).toBe(201);
  });

  it("calculateLineTotal handles NaN/zero", () => {
    expect(calculateLineTotal(NaN, 3)).toBe(0);
    expect(calculateLineTotal(100, NaN)).toBe(0);
    expect(calculateLineTotal(0, 5)).toBe(0);
  });

  it("calculateEstimateTotal sums line items", () => {
    const items = [
      { total_price: 5000 },
      { total_price: 3000 },
      { total_price: 2000 },
    ];
    expect(calculateEstimateTotal(items)).toBe(10000);
  });

  it("calculateEstimateTotal handles empty/invalid", () => {
    expect(calculateEstimateTotal([])).toBe(0);
    expect(calculateEstimateTotal(null as any)).toBe(0);
  });

  it("calculateEstimateTotal supports alternative field names", () => {
    const items = [{ total: 100 }, { lineTotal: 200 }, { total_price: 300 }];
    expect(calculateEstimateTotal(items)).toBe(600);
  });

  it("formatCurrency formats NGN with naira symbol", () => {
    expect(formatCurrency(5000, "NGN")).toBe("₦5,000");
    expect(formatCurrency(1234567.5, "NGN")).toBe("₦1,234,567.5");
  });

  it("formatCurrency formats USD/EUR/GBP", () => {
    expect(formatCurrency(100, "USD")).toBe("$100");
    expect(formatCurrency(100, "EUR")).toBe("€100");
    expect(formatCurrency(100, "GBP")).toBe("£100");
  });

  it("formatCurrency handles NaN", () => {
    expect(formatCurrency(NaN, "NGN")).toBe("₦0");
  });

  it("isPriceConfigured validates price", () => {
    expect(isPriceConfigured(100)).toBe(true);
    expect(isPriceConfigured(0)).toBe(true);
    expect(isPriceConfigured(null)).toBe(false);
    expect(isPriceConfigured(undefined)).toBe(false);
    expect(isPriceConfigured(NaN)).toBe(false);
    expect(isPriceConfigured(-5)).toBe(false);
    expect(isPriceConfigured("100")).toBe(false);
  });
});
