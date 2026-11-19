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
  it("prices an unknown market in dollars, never in naira", () => {
    // The site is global: an unlisted market must not inherit Nigeria's
    // currency, which would misprice its figures by orders of magnitude.
    expect(getCountryCurrency("XX")).toBe("USD");
    expect(getCountryCurrency("")).toBe("USD");
    expect(getCountryCurrency(null)).toBe("USD");
    expect(getCountryCurrency(undefined)).toBe("USD");
  });

  it("ignores the case and padding of a market code", () => {
    expect(getCountryCurrency("ng")).toBe("NGN");
    expect(getCountryCurrency(" us ")).toBe("USD");
    expect(getCountryCurrency("Gb")).toBe("GBP");
  });
  it("every group has a name and at least one country", () => {
    for (const g of COUNTRY_OPTIONS) {
      expect(g.group.length).toBeGreaterThan(0);
      expect(g.countries.length).toBeGreaterThan(0);
    }
  });
});

import {
  getCountryFlag,
  getCountryName,
  getCountryDialCode,
  inferCountryFromPhone,
  resolveUserCountry,
} from "@/lib/international/countries";

describe("country flags, dial codes, and resolver", () => {
  it("converts 2-letter ISO codes to unicode flag emojis", () => {
    expect(getCountryFlag("NG")).toBe("🇳🇬");
    expect(getCountryFlag("ng")).toBe("🇳🇬");
    expect(getCountryFlag("US")).toBe("🇺🇸");
    expect(getCountryFlag("GB")).toBe("🇬🇧");
    expect(getCountryFlag("DE")).toBe("🇩🇪");
    expect(getCountryFlag("CA")).toBe("🇨🇦");
    expect(getCountryFlag("")).toBe("🌐");
    expect(getCountryFlag(null)).toBe("🌐");
    expect(getCountryFlag("XYZ")).toBe("🌐");
  });

  it("returns human-readable country names", () => {
    expect(getCountryName("NG")).toBe("Nigeria");
    expect(getCountryName("US")).toBe("United States");
    expect(getCountryName("GB")).toBe("United Kingdom");
    expect(getCountryName("ZA")).toBe("South Africa");
    expect(getCountryName(null)).toBe("Unknown");
  });

  it("resolves telephone dial codes", () => {
    expect(getCountryDialCode("NG")).toBe("234");
    expect(getCountryDialCode("US")).toBe("1");
    expect(getCountryDialCode("GB")).toBe("44");
    expect(getCountryDialCode("DE")).toBe("49");
    expect(getCountryDialCode("UNKNOWN")).toBe(null);
  });

  it("infers country from phone numbers", () => {
    expect(inferCountryFromPhone("+2348012345678")).toBe("NG");
    expect(inferCountryFromPhone("08012345678")).toBe("NG");
    expect(inferCountryFromPhone("07031234567")).toBe("NG");
    expect(inferCountryFromPhone("+447911123456")).toBe("GB");
    expect(inferCountryFromPhone("+14155552671")).toBe(null); // +1 is shared by US and Canada
    expect(inferCountryFromPhone("+4915123456789")).toBe("DE");
    expect(inferCountryFromPhone("+254712345678")).toBe("KE");
    expect(inferCountryFromPhone("")).toBe(null);
    expect(inferCountryFromPhone(null)).toBe(null);
  });

  it("resolves full user country information with flag and code", () => {
    const directUser = { country_code: "GB", phone: "+447911123456" };
    const direct = resolveUserCountry(directUser);
    expect(direct.code).toBe("GB");
    expect(direct.flag).toBe("🇬🇧");
    expect(direct.name).toBe("United Kingdom");
    expect(direct.dialCode).toBe("44");
    expect(direct.source).toBe("reported");

    const inferredUser = { country_code: "", phone: "+2348012345678" };
    const inferred = resolveUserCountry(inferredUser);
    expect(inferred.code).toBe("NG");
    expect(inferred.flag).toBe("🇳🇬");
    expect(inferred.name).toBe("Nigeria");
    expect(inferred.dialCode).toBe("234");
    expect(inferred.source).toBe("phone");

    const unrecorded = resolveUserCountry({ country_code: null, phone: null });
    expect(unrecorded.code).toBe(null);
    expect(unrecorded.flag).toBe("🌐");
    expect(unrecorded.name).toBe("Unset");
    expect(unrecorded.dialCode).toBe(null);
    expect(unrecorded.source).toBe("unset");
  });
});
