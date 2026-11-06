import { describe, expect, it } from "vitest";
import {
  CONCRETE_DRY_FACTOR,
  CONCRETE_MIXES,
  HARDCORE_LOOSE_BULKING,
  MEMBRANE_LAP_PERCENT,
  SLAB_LAYER_DEFAULTS,
  calculateGermanFloor,
} from "./german-floor";
import { CEMENT_DENSITY_KG_M3 } from "@/config/masonry-units";

const base = {
  market: "NG",
  plotPreset: "full-plot" as const,
  slabMm: 100,
  mixKey: "1:2:4" as const,
};

describe("german floor engine", () => {
  it("takes the area from the plot preset", () => {
    const { result, errors } = calculateGermanFloor(base);
    expect(errors).toEqual([]);
    expect(result!.areaM2).toBeCloseTo(464.5, 1);
  });

  it("turns each layer into a volume from its own thickness", () => {
    const { result } = calculateGermanFloor(base);
    const { hardcore, blinding, slab } = result!.layers;
    expect(hardcore.thicknessMm).toBe(SLAB_LAYER_DEFAULTS.hardcoreMm);
    expect(hardcore.cubicMetres).toBeCloseTo(result!.areaM2 * 0.15, 2);
    expect(blinding.cubicMetres).toBeCloseTo(result!.areaM2 * 0.05, 2);
    expect(slab.cubicMetres).toBeCloseTo(result!.areaM2 * 0.1, 2);
  });

  it("splits a 1:2:4 mix by dry volume", () => {
    const { result } = calculateGermanFloor(base);
    const dry = result!.layers.slab.cubicMetres * 1.05 * CONCRETE_DRY_FACTOR;
    expect(result!.mix.dryM3).toBeCloseTo(dry, 2);
    expect(result!.mix.cementM3).toBeCloseTo(dry / 7, 3);
    expect(result!.mix.sandM3).toBeCloseTo((dry * 2) / 7, 3);
    expect(result!.mix.aggregateM3).toBeCloseTo((dry * 4) / 7, 3);
    expect(
      result!.mix.cementM3 + result!.mix.sandM3 + result!.mix.aggregateM3,
    ).toBeCloseTo(dry, 2);
  });

  it("counts cement in the market bag mass", () => {
    const ng = calculateGermanFloor(base).result!;
    const uk = calculateGermanFloor({ ...base, market: "UK" }).result!;
    expect(ng.cement.bagKg).toBe(50);
    expect(uk.cement.bagKg).toBe(25);
    const bagM3 = 50 / CEMENT_DENSITY_KG_M3;
    expect(ng.cement.bags).toBe(Math.ceil(ng.mix.cementM3 / bagM3));
    // Half the bag mass means about twice the bags, allowing for rounding up.
    expect(uk.cement.bags).toBeGreaterThanOrEqual(ng.cement.bags * 2 - 1);
    expect(uk.cement.bags).toBeLessThanOrEqual(ng.cement.bags * 2);
  });

  it("adds blinding sand to the concrete sand and quotes every tipper", () => {
    const { result } = calculateGermanFloor(base);
    expect(result!.sand.cubicMetres).toBeCloseTo(
      result!.mix.sandM3 + result!.layers.blinding.cubicMetres,
      2,
    );
    expect(result!.sand.trips.length).toBeGreaterThan(0);
    for (const trip of result!.sand.trips) {
      expect(trip.count).toBe(
        Math.ceil(result!.sand.cubicMetres / trip.cubicMetres),
      );
    }
    expect(result!.sand.headPans).toBeGreaterThan(result!.sand.wheelbarrows);
  });

  it("quotes granite separately from sand", () => {
    const { result } = calculateGermanFloor(base);
    expect(result!.aggregate.cubicMetres).toBeCloseTo(
      result!.mix.aggregateM3,
      3,
    );
    expect(result!.aggregate.trips.length).toBeGreaterThan(0);
  });

  it("membrane covers the whole floor area", () => {
    const { result } = calculateGermanFloor(base);
    expect(result!.membraneM2).toBe(result!.areaM2);
  });

  it("a thicker slab uses more cement but does not change the hardcore", () => {
    const thin = calculateGermanFloor(base).result!;
    const thick = calculateGermanFloor({ ...base, slabMm: 150 }).result!;
    expect(thick.cement.bags).toBeGreaterThan(thin.cement.bags);
    expect(thick.layers.hardcore.cubicMetres).toBe(
      thin.layers.hardcore.cubicMetres,
    );
  });

  it("a leaner mix needs less cement", () => {
    const rich = calculateGermanFloor(base).result!;
    const lean = calculateGermanFloor({ ...base, mixKey: "1:3:6" }).result!;
    expect(lean.cement.bags).toBeLessThan(rich.cement.bags);
    expect(lean.mix.aggregateM3).toBeGreaterThan(rich.mix.aggregateM3);
    expect(Object.keys(CONCRETE_MIXES)).toContain("1:3:6");
  });

  it("accepts a measured floor and zero hardcore when the ground is solid", () => {
    const { result, errors } = calculateGermanFloor({
      market: "NG",
      plotPreset: null,
      lengthM: 10,
      widthM: 8,
      slabMm: 120,
      hardcoreMm: 0,
    });
    expect(errors).toEqual([]);
    expect(result!.areaM2).toBe(80);
    expect(result!.layers.hardcore.cubicMetres).toBe(0);
  });

  it("returns professional errors instead of guessing a floor size", () => {
    const missing = calculateGermanFloor({
      market: "NG",
      plotPreset: null,
      lengthM: 0,
      widthM: 0,
      slabMm: 100,
    });
    expect(missing.result).toBeNull();
    expect(missing.errors).toHaveLength(2);

    const noThickness = calculateGermanFloor({ ...base, slabMm: 0 });
    expect(noThickness.result).toBeNull();
    expect(noThickness.errors.length).toBe(1);
  });

  it("is deterministic and carries no prices", () => {
    const a = calculateGermanFloor(base).result!;
    const b = calculateGermanFloor(base).result!;
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).not.toMatch(/ngn|₦|usd|\$/i);
    expect(a.assumptions.join(" ")).toMatch(/Prices, tax and labour/i);
  });

  it("orders hardcore loose and adds loss to every layer", () => {
    const { result } = calculateGermanFloor(base);
    // 150 mm over the plot is measured compacted; fill only reaches that
    // density after compaction, so the order is larger by the bulking factor.
    const compacted = result!.layers.hardcore.cubicMetres;
    expect(result!.layers.hardcore.purchaseCubicMetres).toBeCloseTo(
      compacted * HARDCORE_LOOSE_BULKING * 1.05,
      2,
    );
    expect(result!.layers.blinding.purchaseCubicMetres).toBeCloseTo(
      result!.layers.blinding.cubicMetres * 1.05,
      2,
    );
    expect(result!.layers.slab.purchaseCubicMetres).toBeCloseTo(
      result!.layers.slab.cubicMetres * 1.05,
      2,
    );
  });

  it("orders the membrane with laps", () => {
    const { result } = calculateGermanFloor(base);
    expect(result!.membrane.lapPercent).toBe(MEMBRANE_LAP_PERCENT);
    expect(result!.membrane.orderM2).toBeCloseTo(
      result!.membraneM2 * (1 + MEMBRANE_LAP_PERCENT / 100),
      1,
    );
    expect(result!.membrane.orderM2).toBeGreaterThan(result!.membraneM2);
  });

  it("counts cement in the pack the market sells", () => {
    // Germany sells 25 kg bags, so the same volume is twice the bag count. The
    // table used to fall back to 50 kg for every market it did not name.
    const ng = calculateGermanFloor({ ...base, market: "NG" }).result!;
    const de = calculateGermanFloor({ ...base, market: "DE" }).result!;
    expect(ng.cement.bagKg).toBe(50);
    expect(de.cement.bagKg).toBe(25);
    expect(de.cement.bags).toBeGreaterThanOrEqual(ng.cement.bags * 2 - 1);
    expect(de.cement.bags).toBeLessThanOrEqual(ng.cement.bags * 2);
  });
});
