import { describe, expect, it } from "vitest";
import { COUNTRY_OPTIONS } from "@/lib/international/countries";
import { proConnectCountryName } from "./coverage";

describe("Pro Connect country coverage labels", () => {
  it("supports every configured FRELUX country with its curated market name", () => {
    for (const group of COUNTRY_OPTIONS) {
      for (const country of group.countries) {
        expect(proConnectCountryName(country.code)).toBe(country.name);
      }
    }
  });

  it("handles missing and unknown country codes without throwing", () => {
    expect(proConnectCountryName(null)).toBe("");
    expect(proConnectCountryName("xx")).toBe("XX");
  });
});
