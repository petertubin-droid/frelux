import { describe, it, expect } from "vitest";
import {
  COUNTRY_OPTIONS,
  COUNTRY_CURRENCY,
  getCountryCurrency,
} from "@/lib/international/countries";

describe("country data integrity", () => {
  it("every country code is a unique 2-letter uppercase code", () => {
    const codes = COUNTRY_OPTIONS.flatMap((g) =>
      g.countries.map((c) => c.code),
    );
    expect(codes.length).toBeGreaterThan(20);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) expect(code).toMatch(/^[A-Z]{2}$/);
  });
  it("every currency is a 3-letter code", () => {
    for (const g of COUNTRY_OPTIONS) {
      for (const c of g.countries) expect(c.currency).toMatch(/^[A-Z]{3}$/);
    }
  });
  it("covers the flagship and global markets", () => {
    const flat = COUNTRY_OPTIONS.flatMap((g) => g.countries);
    for (const code of [
      "NG",
      "GH",
      "KE",
      "ZA",
      "US",
      "GB",
      "DE",
      "CN",
      "IN",
      "JP",
      "AE",
      "BR",
    ]) {
      expect(flat.some((c) => c.code === code)).toBe(true);
    }
  });
  it("COUNTRY_CURRENCY lookup matches the option list", () => {
    expect(COUNTRY_CURRENCY.NG).toBe("NGN");
    expect(COUNTRY_CURRENCY.US).toBe("USD");
    const flat = COUNTRY_OPTIONS.flatMap((g) => g.countries);
    for (const c of flat) expect(COUNTRY_CURRENCY[c.code]).toBe(c.currency);
  });
  it("getCountryCurrency returns a string for unknown codes", () => {
    expect(typeof getCountryCurrency("XX")).toBe("string");
  });
  it("every group has a name and at least one country", () => {
    for (const g of COUNTRY_OPTIONS) {
      expect(g.group.length).toBeGreaterThan(0);
      expect(g.countries.length).toBeGreaterThan(0);
    }
  });
});
