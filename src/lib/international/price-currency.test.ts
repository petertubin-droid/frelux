import { describe, it, expect } from "vitest";
import { resolvePriceCurrency } from "./price-currency";

describe("price row currency", () => {
  it("takes the currency the row states", () => {
    expect(resolvePriceCurrency("usd", "NG")).toBe("USD");
    expect(resolvePriceCurrency(" GHS ", "GH")).toBe("GHS");
  });

  it("falls back to the currency of the market the row names", () => {
    expect(resolvePriceCurrency(null, "NG")).toBe("NGN");
    expect(resolvePriceCurrency(undefined, "gb")).toBe("GBP");
    expect(resolvePriceCurrency("", "KE")).toBe("KES");
  });

  it("never invents naira when neither currency nor market is stated", () => {
    expect(resolvePriceCurrency(null, null)).toBeNull();
    expect(resolvePriceCurrency(null, "")).toBeNull();
    expect(resolvePriceCurrency("", "   ")).toBeNull();
  });

  it("rejects values that are not ISO currency codes", () => {
    expect(resolvePriceCurrency("Naira", null)).toBeNull();
    expect(resolvePriceCurrency("12", null)).toBeNull();
    expect(resolvePriceCurrency(null, "ZZ")).toBeNull();
  });

  it("prefers a stated currency over the market default", () => {
    expect(resolvePriceCurrency("ZAR", "NG")).toBe("ZAR");
  });
});
