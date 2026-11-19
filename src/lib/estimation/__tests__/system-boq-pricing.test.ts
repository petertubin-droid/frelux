// =========================================================
// SYSTEM BOQ PRICING
//
// The failure this guards against is silent and expensive: multiplying a
// per-square-metre price by a block count overstates a wall by two orders of
// magnitude, and nothing about the number looks wrong afterwards.
// =========================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

const resolve = vi.fn();
vi.mock("@/lib/price-index/calculator-prices", () => ({
  resolveCityAwarePriceByRole: (role: string, market: string) =>
    resolve(role, market),
}));

import {
  formatMoney,
  priceSystemBoq,
  ROLE_PRICING_UNIT,
} from "../system-boq-pricing";

function hit(role: string, price: number, currency = "USD") {
  return {
    role,
    resolved_market: "US",
    material: { id: "m1", name: `${role} material`, slug: `us-${role}` },
    price: {
      price,
      currency,
      price_source: "test source",
      effective_date: "2026-11-19",
    },
    evidence: "supplier_reported",
  };
}

beforeEach(() => resolve.mockReset());

describe("priceSystemBoq", () => {
  it("multiplies the priced quantity, not the display quantity", async () => {
    // 228 blocks but 124.8 m2 of face: the block count must not be used.
    resolve.mockResolvedValue(hit("icf-form-block", 58.49));
    const pricing = await priceSystemBoq(
      [
        {
          code: "ICF-BLK-STR",
          quantity: 228,
          priceRole: "icf-form-block",
          pricingQuantity: 124.8,
          pricingUnit: "m²",
        },
      ],
      "US",
    );
    expect(pricing.lines["ICF-BLK-STR"].amount).toBeCloseTo(7299.55, 2);
    expect(pricing.total).toBeCloseTo(7299.55, 2);
    expect(pricing.currency).toBe("USD");
  });

  it("refuses to multiply when the engine unit disagrees with the priced unit", async () => {
    resolve.mockResolvedValue(hit("icf-form-block", 58.49));
    const pricing = await priceSystemBoq(
      [
        {
          code: "ICF-BLK-STR",
          quantity: 228,
          priceRole: "icf-form-block",
          pricingQuantity: 228,
          pricingUnit: "m³",
        },
      ],
      "US",
    );
    expect(pricing.lines["ICF-BLK-STR"]).toBeUndefined();
    expect(pricing.total).toBe(0);
    expect(pricing.unitMismatches).toHaveLength(1);
    expect(pricing.unitMismatches[0]).toContain("ICF-BLK-STR");
  });

  it("reports roles the market cannot price instead of guessing", async () => {
    resolve.mockImplementation(async (role: string) =>
      role === "icf-concrete" ? hit("icf-concrete", 210) : null,
    );
    const pricing = await priceSystemBoq(
      [
        {
          code: "CONC",
          quantity: 24.82,
          priceRole: "icf-concrete",
          pricingQuantity: 24.82,
          pricingUnit: "m³",
        },
        {
          code: "BLK",
          quantity: 228,
          priceRole: "icf-form-block",
          pricingQuantity: 124.8,
          pricingUnit: "m²",
        },
      ],
      "US",
    );
    expect(pricing.total).toBeCloseTo(5212.2, 2);
    expect(pricing.unpricedRoles).toEqual(["icf-form-block"]);
    expect(pricing.lines.BLK).toBeUndefined();
  });

  it("keeps quantity-only lines out of the total and names them", async () => {
    resolve.mockResolvedValue(hit("icf-rebar", 0.72));
    const pricing = await priceSystemBoq(
      [
        {
          code: "REBAR",
          quantity: 633,
          priceRole: "icf-rebar",
          pricingQuantity: 633,
          pricingUnit: "kg",
        },
        { code: "BRC-JACK-TURN", quantity: 31 },
      ],
      "US",
    );
    expect(pricing.quantityOnlyCodes).toEqual(["BRC-JACK-TURN"]);
    expect(pricing.total).toBeCloseTo(455.76, 2);
  });

  it("sums only priced lines and never invents a currency", async () => {
    resolve.mockResolvedValue(null);
    const pricing = await priceSystemBoq(
      [
        {
          code: "X",
          quantity: 1,
          priceRole: "eifs-mesh",
          pricingQuantity: 1,
          pricingUnit: "m²",
        },
      ],
      "NG",
    );
    expect(pricing.total).toBe(0);
    expect(pricing.currency).toBeNull();
    expect(pricing.unpricedRoles).toEqual(["eifs-mesh"]);
  });

  it("declares a priced unit for every system role", () => {
    expect(ROLE_PRICING_UNIT["icf-form-block"]).toBe("m²");
    expect(ROLE_PRICING_UNIT["icf-concrete"]).toBe("m³");
    expect(ROLE_PRICING_UNIT["icf-rebar"]).toBe("kg");
    expect(ROLE_PRICING_UNIT["eifs-mesh"]).toBe("m²");
    expect(ROLE_PRICING_UNIT["eifs-basecoat"]).toBe("kg");
  });
});

describe("formatMoney", () => {
  it("formats in the currency the book quoted", () => {
    expect(formatMoney(1234.5, "USD")).toContain("1,234.5");
    expect(formatMoney(10, "NGN")).toContain("10");
  });

  it("falls back to a plain number when there is no currency", () => {
    expect(formatMoney(12.5, null)).toBe("12.50");
  });
});
