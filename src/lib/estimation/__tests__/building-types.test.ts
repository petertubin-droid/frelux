import { describe, it, expect } from "vitest";
import {
  BUILDING_TYPES,
  buildingTypeById,
  buildingTypesForMarket,
  openingCountsFor,
  regionForMarket,
} from "../building-types";

describe("building type catalogue", () => {
  it("offers fifteen types including custom", () => {
    expect(BUILDING_TYPES).toHaveLength(15);
    expect(BUILDING_TYPES.filter((t) => t.id === "custom")).toHaveLength(1);
  });

  it("has unique ids and a label and description for each", () => {
    const ids = BUILDING_TYPES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of BUILDING_TYPES) {
      expect(t.label.length).toBeGreaterThan(3);
      expect(t.description.length).toBeGreaterThan(10);
      expect(t.storeys).toBeGreaterThanOrEqual(1);
    }
  });

  it("maps markets to regions and falls back safely", () => {
    expect(regionForMarket("NG")).toBe("africa");
    expect(regionForMarket("US")).toBe("north_america");
    expect(regionForMarket("GB")).toBe("uk_ie");
    expect(regionForMarket("ZZ")).toBe("europe");
    expect(regionForMarket(null)).toBe("europe");
  });

  it("lists regional types first and custom last", () => {
    const ng = buildingTypesForMarket("NG");
    expect(ng[0].regions).toContain("africa");
    expect(ng[ng.length - 1].id).toBe("custom");
    expect(ng).toHaveLength(BUILDING_TYPES.length);

    const gb = buildingTypesForMarket("GB");
    expect(gb[0].regions).toContain("uk_ie");
  });

  it("applies regional opening counts where the local form differs", () => {
    // Same type, different climate and convention.
    expect(openingCountsFor("bungalow", "NG").window).toBe(14);
    expect(openingCountsFor("bungalow", "GB").window).toBe(10);
    expect(openingCountsFor("bungalow", "US").entrance_door).toBe(2);
    expect(openingCountsFor("bungalow", "NG").entrance_door).toBe(1);
  });

  it("returns the base counts where a region has no override", () => {
    const base = BUILDING_TYPES.find((t) => t.id === "office");
    expect(openingCountsFor("office", "NG").window).toBe(base?.openings.window);
  });

  it("gives an unknown type zero openings rather than guessing", () => {
    expect(openingCountsFor("not_a_type", "US")).toEqual({
      window: 0,
      internal_door: 0,
      entrance_door: 0,
    });
    expect(buildingTypeById("not_a_type")).toBeNull();
  });
});
