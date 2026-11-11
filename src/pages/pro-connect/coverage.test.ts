import { describe, expect, it } from "vitest";
import { COUNTRY_OPTIONS } from "@/lib/international/countries";
import {
  proConnectCities,
  proConnectCountryName,
  proConnectLocationsForCountry,
  proConnectStates,
} from "./coverage";
import { normalizeProConnectSearchQuery } from "@/lib/pro-connect-search";

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

describe("Pro Connect structured coverage", () => {
  const locations = [
    { id: "ng-1", country: "NG", state: "Lagos", city: "Ikeja" },
    { id: "ng-2", country: "NG", state: "Lagos", city: "Lekki" },
    { id: "gh-1", country: "GH", state: "Greater Accra", city: "Accra" },
    { id: "legacy", state: "Abuja", city: "Abuja" },
  ] as Parameters<typeof proConnectLocationsForCountry>[0];

  it("limits available states and cities to the chosen country", () => {
    const ghLocations = proConnectLocationsForCountry(locations, "gh");
    expect(proConnectStates(ghLocations)).toEqual(["Greater Accra"]);
    expect(proConnectCities(ghLocations, "Greater Accra")).toEqual(["Accra"]);
    expect(proConnectCities(ghLocations, "Lagos")).toEqual([]);
  });

  it("treats legacy locations without a country as Nigeria only", () => {
    expect(
      proConnectStates(proConnectLocationsForCountry(locations, "NG")),
    ).toEqual(["Abuja", "Lagos"]);
  });

  it("normalizes search text and removes PostgREST filter delimiters", () => {
    expect(normalizeProConnectSearchQuery("  Accra,  East?  ")).toBe(
      "Accra East",
    );
    expect(normalizeProConnectSearchQuery("x".repeat(100))).toHaveLength(80);
    expect(normalizeProConnectSearchQuery(" ,*() ")).toBe("");
  });
});
