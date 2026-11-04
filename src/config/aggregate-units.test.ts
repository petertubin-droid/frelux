import { describe, it, expect } from "vitest";
import {
  AGGREGATE_SOURCES,
  bookUnitMatches,
  defaultSandUnit,
  findSandUnit,
  measureInSiteUnits,
  sandUnitOptions,
  unitsToBuy,
} from "@/config/aggregate-units";

describe("aggregate units", () => {
  it("defaults Nigeria to a tipper trip, not a bag", () => {
    const unit = defaultSandUnit("NG");
    expect(unit.key).toBe("trip");
    expect(unit.cubicMetres).toBeGreaterThan(1);
  });

  it("gives Nigeria trip, wheelbarrow and head pan as usable units", () => {
    const keys = sandUnitOptions("NG").map((unit) => unit.key);
    expect(keys).toContain("trip");
    expect(keys).toContain("wheelbarrow");
    expect(keys).toContain("headpan");
  });

  it("keeps the site conversions consistent: four head pans in a barrow", () => {
    const pan = findSandUnit("NG", "headpan");
    const barrow = findSandUnit("NG", "wheelbarrow");
    expect(barrow.cubicMetres / pan.cubicMetres).toBeCloseTo(4, 1);
  });

  it("sizes a Nigerian trip so it matches 55 wheelbarrows", () => {
    const barrow = findSandUnit("NG", "wheelbarrow");
    const trip = findSandUnit("NG", "trip");
    const barrows = trip.cubicMetres / barrow.cubicMetres;
    expect(barrows).toBeGreaterThan(45);
    expect(barrows).toBeLessThan(95);
  });

  it("uses local units outside Nigeria", () => {
    expect(defaultSandUnit("GB").key).toBe("bulkbag");
    expect(defaultSandUnit("US").key).toBe("cubicyard");
    expect(defaultSandUnit("ZA").key).toBe("cubicmetre");
  });

  it("falls back to metric for a market with no table", () => {
    expect(defaultSandUnit("XX").key).toBe("cubicmetre");
  });

  it("buys whole units and never reports a fraction of a trip", () => {
    const trip = findSandUnit("NG", "trip");
    expect(unitsToBuy(0.9, trip)).toBe(1);
    expect(unitsToBuy(6.3, trip)).toBe(2);
    expect(unitsToBuy(0, trip)).toBe(0);
  });

  it("measures a volume in wheelbarrows and head pans", () => {
    const measured = measureInSiteUnits(0.68, "NG");
    expect(measured.wheelbarrows).toBe(10);
    expect(measured.headPans).toBe(40);
  });

  it("cites a source for every conversion it publishes", () => {
    const ids = new Set(AGGREGATE_SOURCES.map((source) => source.id));
    expect(ids.size).toBeGreaterThan(3);
    for (const unit of sandUnitOptions("NG")) {
      if (unit.sourceId) expect(ids.has(unit.sourceId)).toBe(true);
    }
    for (const source of AGGREGATE_SOURCES) {
      expect(source.url).toMatch(/^https?:\/\//);
    }
  });

  it("never leaves a unit with a zero or negative volume", () => {
    for (const market of ["NG", "GB", "US", "KE", "XX"]) {
      for (const unit of sandUnitOptions(market)) {
        expect(unit.cubicMetres).toBeGreaterThan(0);
        expect(unit.label.length).toBeGreaterThan(2);
      }
    }
  });
});

describe("book unit matching", () => {
  it("refuses a per bag price when the user is buying trips", () => {
    expect(bookUnitMatches("trip", "bag")).toBe(false);
    expect(bookUnitMatches("trip", "50 kg bag")).toBe(false);
  });

  it("accepts a trip price quoted as a trip or a tipper load", () => {
    expect(bookUnitMatches("trip", "trip")).toBe(true);
    expect(bookUnitMatches("trip", "Tipper load")).toBe(true);
  });

  it("accepts metric volume spellings", () => {
    expect(bookUnitMatches("cubicmetre", "m³")).toBe(true);
    expect(bookUnitMatches("cubicmetre", "cubic metre")).toBe(true);
  });

  it("has no opinion when the book does not say", () => {
    expect(bookUnitMatches("trip", null)).toBe(false);
    expect(bookUnitMatches("trip", "")).toBe(false);
  });
});
