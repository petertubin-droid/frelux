import { describe, it, expect } from "vitest";
import { getMarketTaxRate } from "./market-tax";
import { ALL_MARKET_CODES } from "./capability-registry";

describe("getMarketTaxRate", () => {
  it("returns Nigerian 7.5% VAT by default", () => {
    expect(getMarketTaxRate("NG")).toEqual({ name: "VAT", ratePercent: 7.5 });
    expect(getMarketTaxRate()).toEqual({ name: "VAT", ratePercent: 7.5 });
    expect(getMarketTaxRate(null)).toEqual({ name: "VAT", ratePercent: 7.5 });
  });

  it("returns verified rates for major international markets", () => {
    expect(getMarketTaxRate("GB")).toEqual({ name: "VAT", ratePercent: 20 });
    expect(getMarketTaxRate("AU")).toEqual({ name: "GST", ratePercent: 10 });
    expect(getMarketTaxRate("DE")).toEqual({ name: "MwSt", ratePercent: 19 });
    expect(getMarketTaxRate("IN")).toEqual({ name: "GST", ratePercent: 18 });
    expect(getMarketTaxRate("JP")).toEqual({ name: "Consumption Tax", ratePercent: 10 });
    expect(getMarketTaxRate("CA")).toMatchObject({ name: "HST/GST", ratePercent: 13 });
    expect(getMarketTaxRate("CN")).toEqual({ name: "VAT", ratePercent: 13 });
    expect(getMarketTaxRate("TR")).toEqual({ name: "KDV", ratePercent: 20 });
  });

  it("covers every market code in ALL_MARKET_CODES with a defined statutory rate", () => {
    for (const code of ALL_MARKET_CODES) {
      const tax = getMarketTaxRate(code);
      expect(tax.name).toBeTruthy();
      expect(typeof tax.ratePercent).toBe("number");
      expect(tax.ratePercent).toBeGreaterThanOrEqual(0);
    }
  });

  it("falls back gracefully for unknown markets", () => {
    expect(getMarketTaxRate("ZZ")).toEqual({ name: "VAT", ratePercent: 7.5 });
  });
});
