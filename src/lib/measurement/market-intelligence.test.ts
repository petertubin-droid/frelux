import { describe, it, expect } from "vitest";
import {
  createMarketPriceCatalog,
  createMarketPrice,
  addPrice,
  addPrices,
  getPriceAgeDays,
  isPriceFresh,
  getPriceFreshnessLabel,
  approvePrice,
  rejectPrice,
} from "./market-intelligence";

describe("measurement/market-intelligence", () => {
  it("createMarketPriceCatalog creates with defaults", () => {
    const c = createMarketPriceCatalog();
    expect(c.prices).toEqual([]);
    expect(c.defaultMarketCode).toBe("NG");
    expect(c.defaultCurrency).toBe("NGN");
  });

  it("createMarketPrice creates with defaults", () => {
    const p = createMarketPrice();
    expect(p.productName).toBe("Unknown Product");
    expect(p.price).toBe(0);
    expect(p.currency).toBe("NGN");
    expect(p.priceId).toBeTruthy();
    expect(p.recordedDate).toBeTruthy();
  });

  it("createMarketPrice accepts partial overrides", () => {
    const p = createMarketPrice({
      productName: "Cement",
      price: 5000,
      brand: "Lafarge",
    });
    expect(p.productName).toBe("Cement");
    expect(p.price).toBe(5000);
    expect(p.brand).toBe("Lafarge");
  });

  it("addPrice adds price to catalog", () => {
    const c = createMarketPriceCatalog();
    const p = createMarketPrice({ productName: "Paint" });
    const updated = addPrice(c, p);
    expect(updated.prices.length).toBe(1);
    expect(c.prices.length).toBe(0); // immutable
  });

  it("addPrices adds multiple prices", () => {
    const c = createMarketPriceCatalog();
    const prices = [
      createMarketPrice({ productName: "A" }),
      createMarketPrice({ productName: "B" }),
    ];
    const updated = addPrices(c, prices);
    expect(updated.prices.length).toBe(2);
  });

  it("getPriceAgeDays returns days since recorded", () => {
    const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const p = createMarketPrice({ recordedDate: old });
    expect(getPriceAgeDays(p)).toBe(10);
  });

  it("isPriceFresh returns true within threshold", () => {
    const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const p = createMarketPrice({ recordedDate: recent });
    expect(isPriceFresh(p, 30)).toBe(true);
  });

  it("isPriceFresh returns false beyond threshold", () => {
    const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const p = createMarketPrice({ recordedDate: old });
    expect(isPriceFresh(p, 30)).toBe(false);
  });

  it("getPriceFreshnessLabel returns appropriate label", () => {
    const recent = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      getPriceFreshnessLabel(createMarketPrice({ recordedDate: recent })),
    ).toBe("This week");

    const month = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      getPriceFreshnessLabel(createMarketPrice({ recordedDate: month })),
    ).toBe("This month");
  });

  it("approvePrice marks price as approved", () => {
    const p = createMarketPrice({ productName: "Cement" });
    const c = addPrice(createMarketPriceCatalog(), p);
    const approved = approvePrice(c, p.priceId);
    expect(approved.prices[0].isApproved).toBe(true);
  });

  it("rejectPrice marks price as not approved", () => {
    const p = createMarketPrice({ productName: "Cement" });
    const c = addPrice(createMarketPriceCatalog(), p);
    const rejected = rejectPrice(c, p.priceId);
    expect(rejected.prices[0].isApproved).toBe(false);
  });
});
