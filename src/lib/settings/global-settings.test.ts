import { describe, expect, it } from "vitest";
import {
  countryForMarket,
  countryDefaultsOrFallback,
  countryHasMarket,
  findCountryDefaults,
  SUPPORTED_COUNTRIES,
} from "./countries";
import {
  currencySymbol,
  formatArea,
  formatLength,
  formatMoney,
  formatNumberValue,
  formatVolume,
  formatWeight,
  parseNumberValue,
  resolveGlobalSettings,
  sanitizeOverrides,
} from "./global-settings";

describe("country catalogue", () => {
  it("names every country, not just the curated markets", () => {
    expect(SUPPORTED_COUNTRIES.length).toBeGreaterThanOrEqual(180);
    const codes = SUPPORTED_COUNTRIES.map((country) => country.code);
    expect(new Set(codes).size).toBe(codes.length);
    SUPPORTED_COUNTRIES.forEach((country) => {
      expect(country.code).toMatch(/^[A-Z]{2}$/);
      expect(country.name.length).toBeGreaterThan(1);
      expect(country.currencyCode).toMatch(/^[A-Z]{3}$/);
      expect(country.regional.paintBucketLitres.length).toBeGreaterThan(0);
    });
    // the catch-all stays last so the picker reads naturally
    expect(SUPPORTED_COUNTRIES[SUPPORTED_COUNTRIES.length - 1].code).toBe("ZZ");
  });

  it("honours each country's own currency and separators", () => {
    expect(findCountryDefaults("JP")?.currencyCode).toBe("JPY");
    expect(findCountryDefaults("JP")?.numberFormat.currencyDecimals).toBe(0);
    expect(findCountryDefaults("GH")?.currencyCode).toBe("GHS");
    expect(findCountryDefaults("IN")?.currencyCode).toBe("INR");
    expect(findCountryDefaults("BR")?.currencyCode).toBe("BRL");
    expect(findCountryDefaults("BR")?.numberFormat.decimal).toBe(",");
    expect(findCountryDefaults("SE")?.numberFormat.group).toBe(" ");
    expect(findCountryDefaults("SE")?.numberFormat.decimal).toBe(",");
    expect(findCountryDefaults("CH")?.numberFormat.decimal).toBe(",");
    expect(findCountryDefaults("SA")?.currencyCode).toBe("SAR");
  });

  it("knows which countries still measure in feet", () => {
    expect(findCountryDefaults("LR")?.measurementSystem).toBe("imperial");
    expect(findCountryDefaults("MM")?.measurementSystem).toBe("imperial");
    expect(findCountryDefaults("JP")?.measurementSystem).toBe("metric");
  });

  it("distinguishes a priced market from a settings-only country", () => {
    expect(countryHasMarket("NG")).toBe(true);
    expect(countryHasMarket("JP")).toBe(true);
    expect(countryHasMarket("SE")).toBe(true);
    expect(countryHasMarket("AF")).toBe(false);
    expect(findCountryDefaults("AF")?.marketCode).toBeUndefined();
  });

  it("keeps curated trade conventions on top of the generic ones", () => {
    expect(findCountryDefaults("NG")?.regional.bagKg).toBe(50);
    expect(findCountryDefaults("GB")?.regional.bagKg).toBe(25);
    expect(findCountryDefaults("NG")?.regional.paintBucketLitres).toEqual([
      20, 10, 4,
    ]);
    expect(findCountryDefaults("AF")?.regional.bagKg).toBe(50);
  });

  it("covers every requested market", () => {
    [
      "NG",
      "GB",
      "US",
      "CA",
      "AU",
      "CN",
      "AE",
      "MX",
      "KE",
      "ZA",
      "DE",
      "FR",
      "ZZ",
    ].forEach((code) => {
      expect(findCountryDefaults(code), code).not.toBeNull();
    });
    expect(SUPPORTED_COUNTRIES.length).toBeGreaterThanOrEqual(13);
  });

  it("is case insensitive and falls back safely", () => {
    expect(findCountryDefaults("gb")?.name).toBe("United Kingdom");
    expect(countryDefaultsOrFallback("nowhere").code).toBe("NG");
    expect(countryDefaultsOrFallback(undefined).code).toBe("NG");
  });

  it("maps a market back to its country", () => {
    expect(countryForMarket("KE")?.currencyCode).toBe("KES");
    expect(countryForMarket("zz-unknown")).toBeNull();
  });
});

describe("resolving settings", () => {
  it("suggests country defaults when nothing is overridden", () => {
    const us = resolveGlobalSettings({ countryCode: "US" });
    expect(us.measurementSystem).toBe("imperial");
    expect(us.currencyCode).toBe("USD");
    expect(us.numberFormat.decimal).toBe(".");
    expect(us.overridden).toEqual([]);
  });

  it("keeps national formatting conventions", () => {
    expect(
      resolveGlobalSettings({ countryCode: "DE" }).numberFormat.decimal,
    ).toBe(",");
    expect(
      resolveGlobalSettings({ countryCode: "DE" }).numberFormat.group,
    ).toBe(".");
    expect(
      resolveGlobalSettings({ countryCode: "ZA" }).numberFormat.group,
    ).toBe(" ");
  });

  it("lets a user override the suggested system and currency", () => {
    const overridden = resolveGlobalSettings({
      countryCode: "US",
      measurementSystem: "metric",
      currencyCode: "EUR",
    });
    expect(overridden.measurementSystem).toBe("metric");
    expect(overridden.currencyCode).toBe("EUR");
    expect(overridden.overridden).toContain("measurementSystem");
    expect(overridden.overridden).toContain("currencyCode");
    // country suggestion stays visible so the UI can offer a reset
    expect(overridden.countryDefaults.measurementSystem).toBe("imperial");
  });

  it("carries regional construction conventions", () => {
    expect(resolveGlobalSettings({ countryCode: "NG" }).regional.bagKg).toBe(
      50,
    );
    expect(resolveGlobalSettings({ countryCode: "GB" }).regional.bagKg).toBe(
      25,
    );
    expect(resolveGlobalSettings({ countryCode: "AU" }).regional.bagKg).toBe(
      20,
    );
    expect(
      resolveGlobalSettings({ countryCode: "NG" }).regional.paintBucketLitres,
    ).toEqual([20, 10, 4]);
    expect(
      resolveGlobalSettings({ countryCode: "US" }).regional.aggregateUnit,
    ).toBe("short ton");
  });

  it("allows regional numbers to be overridden", () => {
    const custom = resolveGlobalSettings({
      countryCode: "NG",
      regional: { bagKg: 25 },
    });
    expect(custom.regional.bagKg).toBe(25);
    expect(custom.regional.paintBucketLitres).toEqual([20, 10, 4]);
  });

  it("defaults the language without inventing a translation", () => {
    expect(resolveGlobalSettings({ countryCode: "FR" }).language).toBe("en");
    expect(
      resolveGlobalSettings({ countryCode: "FR", language: "fr" }).language,
    ).toBe("fr");
  });
});

describe("sanitising stored settings", () => {
  it("drops unknown countries and bad codes", () => {
    const clean = sanitizeOverrides({
      countryCode: "XX",
      currencyCode: "pounds",
      measurementSystem: "stone",
    });
    expect(clean.countryCode).toBeUndefined();
    expect(clean.currencyCode).toBeUndefined();
    expect(clean.measurementSystem).toBeUndefined();
  });

  it("survives junk, null and arrays", () => {
    expect(sanitizeOverrides(null)).toEqual({});
    expect(sanitizeOverrides("hello")).toEqual({});
    expect(sanitizeOverrides([1, 2, 3])).toEqual({});
    expect(
      sanitizeOverrides({ numberFormat: { decimals: 99 } }).numberFormat
        ?.decimals,
    ).toBeUndefined();
  });

  it("accepts snake_case rows coming from the database", () => {
    const clean = sanitizeOverrides({
      country_code: "ke",
      measurement_system: "imperial",
      currency_code: "usd",
      regional: { bag_kg: 25, paint_bucket_litres: [20, 5] },
    });
    expect(clean.countryCode).toBe("KE");
    expect(clean.measurementSystem).toBe("imperial");
    expect(clean.currencyCode).toBe("USD");
    expect(clean.regional?.bagKg).toBe(25);
    expect(clean.regional?.paintBucketLitres).toEqual([20, 5]);
  });
});

describe("formatting follows the settings", () => {
  it("groups with the local separators", () => {
    const ng = resolveGlobalSettings({ countryCode: "NG" });
    expect(formatNumberValue(ng, 1234567.891, { decimals: 2 })).toBe(
      "1,234,567.89",
    );

    const de = resolveGlobalSettings({ countryCode: "DE" });
    expect(formatNumberValue(de, 1234567.891, { decimals: 2 })).toBe(
      "1.234.567,89",
    );

    const za = resolveGlobalSettings({ countryCode: "ZA" });
    expect(formatNumberValue(za, 1234567.891, { decimals: 2 })).toBe(
      "1 234 567,89",
    );
  });

  it("formats money in the chosen currency", () => {
    expect(
      formatMoney(resolveGlobalSettings({ countryCode: "NG" }), 1250000),
    ).toBe("₦1,250,000.00");
    expect(
      formatMoney(resolveGlobalSettings({ countryCode: "US" }), 1234.5),
    ).toBe("$1,234.50");
    expect(formatMoney(resolveGlobalSettings({ countryCode: "GB" }), 640)).toBe(
      "£640.00",
    );
    expect(currencySymbol("XYZ")).toBe("XYZ ");
  });

  it("reads a number typed in either convention", () => {
    const ng = resolveGlobalSettings({ countryCode: "NG" });
    expect(parseNumberValue(ng, "1,250.75")).toBe(1250.75);
    const de = resolveGlobalSettings({ countryCode: "DE" });
    expect(parseNumberValue(de, "1.250,75")).toBe(1250.75);
    expect(parseNumberValue(de, "")).toBeNull();
    expect(parseNumberValue(de, "abc")).toBeNull();
  });

  it("shows measurements in the chosen system while maths stays metric", () => {
    const ng = resolveGlobalSettings({ countryCode: "NG" });
    const us = resolveGlobalSettings({ countryCode: "US" });

    expect(formatLength(ng, 3.048)).toBe("3.05 m");
    expect(formatLength(us, 3.048)).toBe("10.0 ft");
    expect(formatArea(ng, 100)).toBe("100.00 m²");
    expect(formatArea(us, 92.90304)).toBe("1,000.0 ft²");
    expect(formatWeight(ng, 20000)).toBe("20.00 t");
    expect(formatWeight(us, 907.18474)).toBe("2,000.0 lb");
    expect(formatVolume(ng, 20)).toBe("20.00 L");
    expect(formatVolume(us, 3.785411784)).toBe("1.0 US gal");
  });

  it("never prints a fake number for bad input", () => {
    const ng = resolveGlobalSettings({ countryCode: "NG" });
    expect(formatNumberValue(ng, Number.NaN)).toBe("n/a");
    expect(formatMoney(ng, Number.POSITIVE_INFINITY)).toBe("n/a");
    expect(formatLength(ng, Number.NaN)).toBe("n/a");
  });
});
