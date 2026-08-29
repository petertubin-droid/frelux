/**
 * Tests for Market Intelligence (Feature 15)
 */

import { describe, it, expect } from "vitest";
import {
  createMarketPriceCatalog,
  createMarketPrice,
  addPrice,
  addPrices,
  findPrices,
  findLatestApprovedPrice,
  getPriceAgeDays,
  isPriceFresh,
  getPriceFreshnessLabel,
  buildPriceEstimate,
  buildPriceEstimates,
  approvePrice,
  rejectPrice,
  priceEstimateToText,
  type PriceEstimate,
  PRICE_SOURCE_LABELS,
  SOURCE_RELIABILITY_LABELS,
} from "../market-intelligence";

describe("Market Price Catalog", () => {
  it("creates a catalog with defaults", () => {
    const catalog = createMarketPriceCatalog();
    expect(catalog.prices).toEqual([]);
    expect(catalog.defaultMarketCode).toBe("NG");
    expect(catalog.defaultCurrency).toBe("NGN");
  });

  it("creates a price entry", () => {
    const price = createMarketPrice({
      productName: "Portland Cement",
      brand: "Lafarge",
      packageSize: 40,
      packageUnit: "kg",
      price: 7500,
      currency: "NGN",
      marketCode: "NG",
      source: "vendor",
      reliability: "trusted",
    });
    expect(price.productName).toBe("Portland Cement");
    expect(price.price).toBe(7500);
    expect(price.currency).toBe("NGN");
    expect(price.source).toBe("vendor");
  });

  it("adds prices", () => {
    let catalog = createMarketPriceCatalog();
    catalog = addPrice(catalog, createMarketPrice({ productName: "A" }));
    catalog = addPrice(catalog, createMarketPrice({ productName: "B" }));
    expect(catalog.prices.length).toBe(2);
  });

  it("adds multiple prices", () => {
    const catalog = addPrices(createMarketPriceCatalog(), [
      createMarketPrice({ productName: "A" }),
      createMarketPrice({ productName: "B" }),
      createMarketPrice({ productName: "C" }),
    ]);
    expect(catalog.prices.length).toBe(3);
  });
});

describe("Price Lookup", () => {
  function setup() {
    return addPrices(createMarketPriceCatalog(), [
      createMarketPrice({
        productName: "Cement",
        brand: "Lafarge",
        marketCode: "NG",
        price: 7500,
        isApproved: true,
        recordedDate: "2026-08-20T10:00:00Z",
      }),
      createMarketPrice({
        productName: "Cement",
        brand: "Dangote",
        marketCode: "NG",
        price: 7000,
        isApproved: true,
        recordedDate: "2026-08-22T10:00:00Z",
      }),
      createMarketPrice({
        productName: "Cement",
        brand: "Lafarge",
        marketCode: "GH",
        price: 95,
        isApproved: true,
        recordedDate: "2026-08-15T10:00:00Z",
      }),
      createMarketPrice({
        productName: "Paint",
        brand: "Dulux",
        marketCode: "NG",
        price: 25000,
        isApproved: false,
        recordedDate: "2026-08-10T10:00:00Z",
      }),
    ]);
  }

  it("finds prices by product name", () => {
    const catalog = setup();
    const prices = findPrices(catalog, { productName: "Cement" });
    expect(prices.length).toBe(3);
  });

  it("filters by brand", () => {
    const catalog = setup();
    const prices = findPrices(catalog, {
      productName: "Cement",
      brand: "Lafarge",
    });
    expect(prices.length).toBe(2);
  });

  it("filters by market", () => {
    const catalog = setup();
    const prices = findPrices(catalog, {
      productName: "Cement",
      marketCode: "GH",
    });
    expect(prices.length).toBe(1);
    expect(prices[0].currency).toBe("NGN"); // default
  });

  it("filters by approval status", () => {
    const catalog = setup();
    const approved = findPrices(catalog, { isApproved: true });
    expect(approved.length).toBe(3);
  });

  it("sorts by date (most recent first)", () => {
    const catalog = setup();
    const prices = findPrices(catalog, {
      productName: "Cement",
      marketCode: "NG",
    });
    expect(prices[0].recordedDate).toBe("2026-08-22T10:00:00Z"); // most recent
  });

  it("finds latest approved price", () => {
    const catalog = setup();
    const latest = findLatestApprovedPrice(catalog, "Cement", "NG");
    expect(latest).toBeDefined();
    expect(latest!.recordedDate).toBe("2026-08-22T10:00:00Z");
  });
});

describe("Price Freshness", () => {
  it("calculates age in days", () => {
    const oldPrice = createMarketPrice({
      recordedDate: "2026-01-01T00:00:00Z",
    });
    const age = getPriceAgeDays(oldPrice);
    expect(age).toBeGreaterThan(200);
  });

  it("checks if price is fresh", () => {
    const recentPrice = createMarketPrice({
      recordedDate: new Date().toISOString(),
    });
    const oldPrice = createMarketPrice({
      recordedDate: "2026-01-01T00:00:00Z",
    });
    expect(isPriceFresh(recentPrice, 30)).toBe(true);
    expect(isPriceFresh(oldPrice, 30)).toBe(false);
  });

  it("gets freshness label", () => {
    const recent = createMarketPrice({
      recordedDate: new Date().toISOString(),
    });
    const label = getPriceFreshnessLabel(recent);
    expect(label).toBe("This week");
  });
});

describe("Price Estimates", () => {
  it("builds a price estimate", () => {
    const price = createMarketPrice({
      productName: "Cement",
      brand: "Lafarge",
      price: 7500,
      currency: "NGN",
      packageUnit: "bags",
      source: "vendor",
      isVerified: true,
      confidence: "high",
    });
    const estimate = buildPriceEstimate(price, 10);
    expect(estimate.productName).toBe("Cement");
    expect(estimate.unitPrice).toBe(7500);
    expect(estimate.quantity).toBe(10);
    expect(estimate.totalCost).toBe(75000);
    expect(estimate.currency).toBe("NGN");
  });

  it("builds multiple estimates from catalog", () => {
    let catalog = createMarketPriceCatalog();
    catalog = addPrice(
      catalog,
      createMarketPrice({
        productName: "Cement",
        price: 7500,
        isApproved: true,
        packageUnit: "bags",
      }),
    );
    catalog = addPrice(
      catalog,
      createMarketPrice({
        productName: "Paint",
        price: 25000,
        isApproved: true,
        packageUnit: "buckets",
      }),
    );

    const estimates = buildPriceEstimates(catalog, [
      { productName: "Cement", quantity: 10 },
      { productName: "Paint", quantity: 3 },
      { productName: "Tiles", quantity: 20 }, // not in catalog
    ]);
    expect(estimates.length).toBe(2); // only found prices
    expect(estimates[0].totalCost).toBe(75000);
    expect(estimates[1].totalCost).toBe(75000);
  });

  it("returns empty for unapproved prices", () => {
    let catalog = createMarketPriceCatalog();
    catalog = addPrice(
      catalog,
      createMarketPrice({
        productName: "Unapproved",
        price: 100,
        isApproved: false,
      }),
    );
    const estimates = buildPriceEstimates(catalog, [
      { productName: "Unapproved", quantity: 5 },
    ]);
    expect(estimates.length).toBe(0);
  });
});

describe("Price Approval", () => {
  it("approves a price", () => {
    let catalog = createMarketPriceCatalog();
    const price = createMarketPrice({
      productName: "Test",
      isApproved: false,
      isVerified: false,
    });
    catalog = addPrice(catalog, price);
    catalog = approvePrice(catalog, price.priceId);
    const approved = catalog.prices[0];
    expect(approved.isApproved).toBe(true);
    expect(approved.isVerified).toBe(true);
    expect(approved.reliability).toBe("verified");
  });

  it("rejects a price", () => {
    let catalog = createMarketPriceCatalog();
    const price = createMarketPrice({
      productName: "Test",
      isApproved: true,
      reliability: "trusted",
    });
    catalog = addPrice(catalog, price);
    catalog = rejectPrice(catalog, price.priceId);
    const rejected = catalog.prices[0];
    expect(rejected.isApproved).toBe(false);
    expect(rejected.reliability).toBe("disputed");
  });
});

describe("Formatting and Labels", () => {
  it("formats price estimate as text", () => {
    const estimate: PriceEstimate = {
      productName: "Cement",
      brand: "Lafarge",
      unitPrice: 7500,
      currency: "NGN",
      quantity: 10,
      quantityUnit: "bags",
      totalCost: 75000,
      source: "vendor",
      freshnessLabel: "This week",
      isVerified: true,
      confidence: "high",
    };
    const text = priceEstimateToText(estimate);
    expect(text).toContain("Cement");
    expect(text).toContain("Lafarge");
    expect(text).toContain("75,000");
    expect(text).toContain("Vendor Quote");
  });

  it("has source labels", () => {
    expect(PRICE_SOURCE_LABELS.manual).toBe("Manual Entry");
    expect(PRICE_SOURCE_LABELS.api).toBe("API Feed");
    expect(PRICE_SOURCE_LABELS.vendor).toBe("Vendor Quote");
    expect(PRICE_SOURCE_LABELS.survey).toBe("Market Survey");
  });

  it("has reliability labels", () => {
    expect(SOURCE_RELIABILITY_LABELS.verified).toBe("Verified");
    expect(SOURCE_RELIABILITY_LABELS.trusted).toBe("Trusted");
    expect(SOURCE_RELIABILITY_LABELS.unverified).toBe("Unverified");
    expect(SOURCE_RELIABILITY_LABELS.disputed).toBe("Disputed");
  });
});
