import { describe, expect, it } from "vitest";
import {
  DEFAULT_BLOCK_WASTAGE,
  calculateFenceBlockwork,
} from "./fence-blockwork";
import {
  MASONRY_UNITS,
  PLOT_PRESETS,
  coachesToMetres,
  masonryUnitsForMarket,
  metresToCoaches,
  perimeterM,
  unitFaceAreaM2,
} from "@/config/masonry-units";

const base = {
  market: "NG",
  plotPreset: "full-plot" as const,
  coaches: 5,
  unitKey: "ng-block-9" as const,
};

describe("fence blockwork engine", () => {
  it("measures a full plot at 100 ft by 50 ft with a 91.44 m perimeter", () => {
    const { result, errors } = calculateFenceBlockwork(base);
    expect(errors).toEqual([]);
    expect(result!.site.perimeterM).toBeCloseTo(91.44, 2);
    expect(result!.site.lengthM).toBeCloseTo(30.48, 2);
    expect(result!.site.widthM).toBeCloseTo(15.24, 2);
  });

  it("turns coaches into a wall height through the course height", () => {
    const unit = MASONRY_UNITS["ng-block-9"];
    const { result } = calculateFenceBlockwork(base);
    expect(result!.wall.courseHeightM).toBeCloseTo(0.235, 3);
    expect(result!.wall.heightM).toBeCloseTo(1.18, 2);
    expect(coachesToMetres(5, unit)).toBeCloseTo(1.175, 3);
    expect(metresToCoaches(1.175, unit)).toBeCloseTo(5, 6);
  });

  it("counts blocks from wall area and the face area of one block", () => {
    const unit = MASONRY_UNITS["ng-block-9"];
    const { result } = calculateFenceBlockwork(base);
    const areaPerBlock = unitFaceAreaM2(unit);
    const expectedNet = Math.ceil(result!.wall.areaM2 / areaPerBlock);
    expect(result!.blocks.perSquareMetre).toBeCloseTo(9.25, 2);
    expect(result!.blocks.net).toBe(expectedNet);
    expect(result!.blocks.breakage).toBe(
      Math.ceil(expectedNet * DEFAULT_BLOCK_WASTAGE),
    );
    expect(result!.blocks.total).toBe(
      result!.blocks.net + result!.blocks.breakage,
    );
  });

  it("doubles the wall area when the coaches double, and never loses blocks", () => {
    const five = calculateFenceBlockwork(base).result!;
    const ten = calculateFenceBlockwork({ ...base, coaches: 10 }).result!;
    expect(ten.wall.areaM2).toBeCloseTo(five.wall.areaM2 * 2, 1);
    expect(ten.blocks.total).toBeGreaterThan(five.blocks.total * 1.9);
    expect(ten.blocks.total).toBeLessThan(five.blocks.total * 2.1);
  });

  it("keeps the block count for a 6 inch block and only thins the wall", () => {
    const nine = calculateFenceBlockwork(base).result!;
    const six = calculateFenceBlockwork({
      ...base,
      unitKey: "ng-block-6",
    }).result!;
    expect(six.wall.areaM2).toBeCloseTo(nine.wall.areaM2, 6);
    expect(six.blocks.total).toBe(nine.blocks.total);
    expect(six.wall.thicknessM).toBeCloseTo(0.15, 3);
    expect(six.mortar.sandM3).toBeLessThan(nine.mortar.sandM3);
  });

  it("halves the wall for a half plot", () => {
    const full = calculateFenceBlockwork(base).result!;
    const half = calculateFenceBlockwork({
      ...base,
      plotPreset: "half-plot",
    }).result!;
    expect(half.site.perimeterM).toBeCloseTo(
      perimeterM(
        PLOT_PRESETS["half-plot"].lengthM,
        PLOT_PRESETS["half-plot"].widthM,
      ),
      3,
    );
    expect(half.wall.areaM2).toBeLessThan(full.wall.areaM2);
  });

  it("reports sand as tipper trips, barrows and pans for a trip market", () => {
    const { result } = calculateFenceBlockwork(base);
    expect(result!.sand.cubicMetres).toBeGreaterThan(0);
    expect(result!.sand.trips.length).toBeGreaterThan(0);
    for (const trip of result!.sand.trips) {
      expect(trip.count).toBe(
        Math.ceil(result!.sand.cubicMetres / trip.cubicMetres),
      );
    }
    expect(result!.sand.wheelbarrows).toBeGreaterThan(
      result!.sand.trips[0].count,
    );
    expect(result!.sand.headPans).toBeGreaterThan(result!.sand.wheelbarrows);
  });

  it("uses the market cement bag mass", () => {
    const ng = calculateFenceBlockwork(base).result!;
    const us = calculateFenceBlockwork({
      ...base,
      market: "US",
      unitKey: "us-cmu",
      plotPreset: null,
      lengthM: 30.48,
      widthM: 15.24,
    }).result!;
    expect(ng.cement.bagKg).toBe(50);
    expect(us.cement.bagKg).toBeCloseTo(42.64, 2);
    expect(us.cement.bags).toBeGreaterThan(0);
  });

  it("accepts a site measured by hand instead of a preset", () => {
    const { result } = calculateFenceBlockwork({
      market: "NG",
      plotPreset: null,
      lengthM: 20,
      widthM: 10,
      coaches: 4,
      unitKey: "ng-block-9",
    });
    expect(result!.site.perimeterM).toBe(60);
    expect(result!.site.plotLabel).toBeNull();
  });

  it("returns professional errors instead of inventing numbers", () => {
    expect(calculateFenceBlockwork({ ...base, coaches: 0 }).errors.length).toBe(
      1,
    );
    const missingSite = calculateFenceBlockwork({
      market: "NG",
      plotPreset: null,
      lengthM: 0,
      widthM: 0,
      coaches: 3,
      unitKey: "ng-block-9",
    });
    expect(missingSite.result).toBeNull();
    expect(missingSite.errors).toHaveLength(2);
  });

  it("is deterministic for the same input", () => {
    const a = calculateFenceBlockwork(base).result!;
    const b = calculateFenceBlockwork(base).result!;
    expect(a).toEqual(b);
  });

  it("carries no prices, only quantities and stated assumptions", () => {
    const { result } = calculateFenceBlockwork(base);
    expect(result!.assumptions.join(" ")).toMatch(/Prices, tax and labour/i);
    const asText = JSON.stringify(result);
    expect(asText).not.toMatch(/ngn|₦|usd|\$/i);
  });

  it("deducts the gate opening from the wall, mortar and footing", () => {
    const open = calculateFenceBlockwork({
      ...base,
      gateWidthM: 3,
      gateCoaches: 4,
    }).result!;
    const closed = calculateFenceBlockwork(base).result!;
    expect(closed.gate.widthM).toBe(0);
    expect(open.gate.deductedAreaM2).toBeCloseTo(3 * 4 * 0.235, 2);
    expect(open.wall.areaM2).toBeCloseTo(
      closed.wall.areaM2 - open.gate.deductedAreaM2,
      2,
    );
    expect(open.blocks.net).toBeLessThan(closed.blocks.net);
  });

  it("counts foundation courses and the strip footing they sit on", () => {
    const withFoundation = calculateFenceBlockwork({
      ...base,
      foundationCourses: 3,
    }).result!;
    const above = calculateFenceBlockwork(base).result!;
    const foundationArea =
      withFoundation.site.perimeterM * 3 * withFoundation.wall.courseHeightM;
    expect(withFoundation.wall.areaM2).toBeCloseTo(
      above.wall.areaM2 + foundationArea,
      1,
    );
    expect(withFoundation.foundation.blocksTotal).toBeGreaterThan(0);
    expect(withFoundation.blocks.total).toBeGreaterThan(above.blocks.total);
    // Strip footing: wall thickness wide, 200 mm deep, run under the wall.
    expect(withFoundation.foundation.footingConcreteM3).toBeCloseTo(
      withFoundation.site.perimeterM * withFoundation.wall.thicknessM * 0.2,
      2,
    );
    expect(withFoundation.foundation.cementBags).toBeGreaterThan(0);
    expect(withFoundation.cement.bags).toBeGreaterThan(above.cement.bags);
  });

  it("offers a unit for every market it is driven by", () => {
    for (const market of ["NG", "UK", "US", "IN"]) {
      const units = masonryUnitsForMarket(market);
      expect(units.length).toBeGreaterThan(0);
      const result = calculateFenceBlockwork({
        ...base,
        market,
        unitKey: units[0].key,
      }).result!;
      expect(result.unit.key).toBe(units[0].key);
      expect(result.blocks.total).toBeGreaterThan(0);
    }
  });
});
