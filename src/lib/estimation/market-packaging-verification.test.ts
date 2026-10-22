import { MASONRY_MARKET_REGISTRY } from "./masonry-standalone-engine";
import { CEMENT_BAG_WEIGHT_BY_MARKET } from "./plastering-standalone-engine";
import { describe, expect, it } from "vitest";
import {
  CEMENT_PACKAGING_SOURCES,
  getPackagingEvidence,
} from "./market-packaging-verification";

describe("market packaging evidence", () => {
  it("records source observed sizes separately from nationwide claims", () => {
    const ev = getPackagingEvidence("gb", "cement", 25);
    expect(ev).toMatchObject({
      marketCode: "GB",
      quantityKg: 25,
      status: "source_observed",
      observedPackSizesKg: [25],
    });
    expect(ev.label).toContain("Source-observed");
    expect(ev.guidance).toContain("not a country-wide standard");
    expect(ev.sources[0].url).toMatch(/^https:\/\//);
  });

  it("keeps conflicting or multi-size market evidence visible", () => {
    expect(
      getPackagingEvidence("US", "cement", 42.6).observedPackSizesKg,
    ).toEqual([14, 21.3, 40, 42, 42.6]);
    expect(
      getPackagingEvidence("BR", "cement", 50).observedPackSizesKg,
    ).toEqual([25, 42.5, 50]);
    expect(getPackagingEvidence("MX", "cement", 50).guidance).toContain(
      "transition",
    );
  });

  it("does not imply evidence for a package size that the sources do not list", () => {
    expect(getPackagingEvidence("AU", "cement", 50)).toMatchObject({
      status: "planning_assumption",
      quantityKg: 50,
    });
  });

  it("provides evidence records for every currently configured Frelux market", () => {
    const marketCodes = [
      "NG",
      "US",
      "GB",
      "CA",
      "AU",
      "NZ",
      "DE",
      "FR",
      "IT",
      "ES",
      "NL",
      "PL",
      "SE",
      "CH",
      "IN",
      "ZA",
      "KE",
      "GH",
      "TZ",
      "CI",
      "ET",
      "EG",
      "SA",
      "AE",
      "TR",
      "JP",
      "KR",
      "CN",
      "ID",
      "BR",
      "MX",
      "SG",
    ];
    for (const code of marketCodes) {
      expect(
        CEMENT_PACKAGING_SOURCES[code],
        `missing source for ${code}`,
      ).toBeDefined();
      expect(CEMENT_PACKAGING_SOURCES[code].length).toBeGreaterThan(0);
    }
    expect(Object.keys(CEMENT_PACKAGING_SOURCES)).toHaveLength(32);
    for (const [code, config] of Object.entries(MASONRY_MARKET_REGISTRY)) {
      expect(
        CEMENT_PACKAGING_SOURCES[code].flatMap(
          (source) => source.observedPackSizesKg,
        ),
      ).toContain(config.cementBagWeightKg);
      expect(
        CEMENT_PACKAGING_SOURCES[code].flatMap(
          (source) => source.observedPackSizesKg,
        ),
      ).toContain(CEMENT_BAG_WEIGHT_BY_MARKET[code]);
    }
  });

  it("does not invent an unavailable package size", () => {
    expect(getPackagingEvidence("XX", "cement", undefined)).toMatchObject({
      marketCode: "XX",
      quantityKg: null,
      status: "not_available",
      label: "Package size not verified",
    });
  });

  it("rejects non-positive and non-finite pack quantities", () => {
    for (const size of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(getPackagingEvidence("US", "cement", size).quantityKg).toBeNull();
    }
  });
});
