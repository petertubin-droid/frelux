/**
 * Hand-computed verification of the quantity engines.
 *
 * Every expected number below is worked out from first principles in the
 * comment above it, independently of the engine, so a change in the engine that
 * quietly moves a quantity fails here instead of reaching a customer quote.
 */
import { describe, it, expect } from "vitest";
import { calculateMasonryTakeoff } from "./masonry-standalone-engine";
import { calculatePlasteringTakeoff } from "./plastering-standalone-engine";
import {
  calculateTheoreticalLitres,
  calculateWallArea,
  calculateOpeningArea,
} from "./paint-engine";
import {
  calculateRoofArea,
  calculateRidgeLength,
  calculateHipLength,
  calculateFasciaLength,
} from "./build-to-roof-engine";
import { voltageDropPercent } from "./electrical-engine";
import { calculatePlumbing } from "./plumbing-engine";
import {
  calculateConcreteTakeoff,
  calculateEarthwork,
} from "./advanced-takeoff-engine";
import { calculateDrywallTakeoff } from "./drywall-standalone-engine";
import {
  tilesRequired,
  cartonsFromTileCount,
  cartonsFromCoverage,
} from "@/lib/measurement/geometry";

describe("masonry quantities", () => {
  // 10 m x 3 m = 30 m2. NG 9-inch hollow block 450 x 225 mm on a 12 mm joint:
  // 1 / (0.462 x 0.237) = 9.13 blocks/m2 -> 273.9 blocks, +5% waste = 288.
  // Mortar at 0.018 m3/m2 scaled for a 225 mm block = 0.02025 m3/m2 wet
  // -> 0.6075 m3 wet, x1.33 dry conversion x1.05 waste = 0.848 m3.
  // 1:4 mortar -> cement 0.848 / 5 = 0.170 m3 x 1440 kg/m3 = 244 kg = 5 bags.
  it("sizes blocks, mortar and cement for a 30 m2 wall", () => {
    const r = calculateMasonryTakeoff({
      marketCode: "NG",
      wallLengthM: 10,
      wallHeightM: 3,
      wallCount: 1,
      wastePercent: 5,
    } as never);
    expect(r.unitsPerM2).toBeCloseTo(9.13, 2);
    expect(r.unitsRequiredNet).toBeCloseTo(273.9, 0);
    expect(r.unitsRequiredGross).toBe(288);
    expect(r.mortarVolumeM3Net).toBeCloseTo(0.607, 3);
    expect(r.mortarVolumeM3Gross).toBeCloseTo(0.848, 2);
    expect(r.cementBagsRequired).toBe(5);
    expect(r.sandVolumeM3).toBeCloseTo(0.71, 1);
  });

  it("deducts openings before counting blocks", () => {
    const withDoor = calculateMasonryTakeoff({
      marketCode: "NG",
      wallLengthM: 10,
      wallHeightM: 3,
      wastePercent: 0,
      openings: [{ widthM: 0.9, heightM: 2.1, quantity: 1 }],
    } as never);
    // 30 - 1.89 = 28.11 m2 x 9.13 = 256.6 -> 257 blocks.
    expect(withDoor.netWallAreaM2).toBeCloseTo(28.11, 2);
    expect(withDoor.unitsRequiredGross).toBe(257);
  });
});

describe("plastering quantities", () => {
  // 30 m2 at 15 mm = 0.45 m3, plus the default 5% allowance for a smooth
  // substrate drawing in mortar = 0.4725 m3 wet. x1.33 = 0.6284 m3 dry,
  // x1.05 waste = 0.66 m3. 1:4 -> cement 0.132 m3 x 1440 = 190 kg -> 4 bags.
  it("sizes mortar and cement for a 15 mm 1:4 render", () => {
    const r = calculatePlasteringTakeoff({
      marketCode: "NG",
      surfaceAreaM2: 30,
      thicknessMm: 15,
      mixRatio: "1:4",
      wastePercent: 5,
    } as never);
    expect(r.totalAreaM2).toBe(30);
    expect(r.wetMortarVolumeM3).toBeCloseTo(0.472, 3);
    expect(r.dryMortarVolumeM3).toBeCloseTo(0.66, 2);
    expect(r.cementWeightKg).toBeCloseTo(190, -1);
    expect(r.cementBagsRequired).toBe(4);
    expect(r.sandVolumeM3).toBeCloseTo(0.53, 1);
  });
});

describe("painting geometry and coverage", () => {
  it("takes wall area as the perimeter times height", () => {
    // 2 x (5 + 4) x 2.7 = 48.6 m2
    expect(calculateWallArea(5, 4, 2.7)).toBe(48.6);
  });

  it("takes a single-run wall when no width is given", () => {
    // 2 x 5 x 2.7 = 27 m2
    expect(calculateWallArea(5, 0, 2.7)).toBe(27);
  });

  it("divides area x coats by coverage", () => {
    // 30 m2 x 2 coats / 10 m2 per litre = 6 litres
    expect(calculateTheoreticalLitres(30, 2, 10)).toBe(6);
    expect(calculateTheoreticalLitres(30, 2, 0)).toBe(0);
  });

  it("measures an opening", () => {
    // 0.9 x 2.1 = 1.89 m2, twice over = 3.78 m2
    expect(
      calculateOpeningArea([{ width: 0.9, height: 2.1, quantity: 2 }], "meters"),
    ).toBeCloseTo(3.78, 2);
  });
});

describe("tiling quantities", () => {
  it("counts tiles from the exact area, without rounding", () => {
    // 30 m2 / 0.6 x 0.6 m tile = 83.33 tiles
    expect(tilesRequired(30, 0.36)).toBeCloseTo(83.33, 2);
  });

  it("rounds cartons up, because half a carton cannot be bought", () => {
    // 83.33 tiles / 10 per carton = 8.33 -> 9 cartons
    expect(cartonsFromTileCount(83.33, 10)).toBe(9);
    // 30 m2 / 1.44 m2 per carton = 20.83 -> 21 cartons
    expect(cartonsFromCoverage(30, 1.44)).toBe(21);
  });

  it("returns nothing for a zero-sized surface or tile", () => {
    expect(tilesRequired(0, 0.36)).toBe(0);
    expect(tilesRequired(30, 0)).toBe(0);
    expect(cartonsFromTileCount(0, 10)).toBe(0);
  });
});

describe("roof geometry", () => {
  // Footprint 10 x 8 m, 30 deg pitch, 0.5 m overhang on every edge:
  // plan 11 x 9 = 99 m2, sloped = 99 / cos 30 = 114.32 m2. Every plane of a
  // gable, hip and mono-pitch roof shares the same pitch, so all three give the
  // same sloped area over the same footprint.
  it("slopes the plan area by the pitch", () => {
    expect(calculateRoofArea(10, 8, 30, 0.5, "gable")).toBeCloseTo(114.32, 1);
    expect(calculateRoofArea(10, 8, 30, 0.5, "hip")).toBeCloseTo(114.32, 1);
    expect(calculateRoofArea(10, 8, 30, 0.5, "mono_pitch")).toBeCloseTo(
      114.32,
      1,
    );
  });

  it("runs a gable ridge the full length plus both overhangs", () => {
    // 10 + 2 x 0.5 = 11 m
    expect(calculateRidgeLength(10, 8, "gable", 0.5)).toBe(11);
  });

  it("runs a hip ridge between the two short hip ends", () => {
    // |10 - 8| = 2 m
    expect(calculateRidgeLength(10, 8, "hip", 0.5)).toBe(2);
  });

  it("takes hip rafters on the true 3D diagonal, not the slope length", () => {
    // run = 8 / 2 + 0.5 = 4.5 m, rise = 4.5 tan 30
    // hip = 4.5 x sqrt(2 + tan^2 30) = 6.874 m, four hips = 27.5 m
    expect(calculateHipLength(10, 8, 30, 0.5)).toBeCloseTo(27.5, 1);
  });

  it("takes fascia along the eaves line", () => {
    // perimeter of 11 x 9 = 40 m
    expect(calculateFasciaLength(10, 8, 0.5, "gable" as never)).toBeCloseTo(40, 1);
  });
});

describe("electrical voltage drop", () => {
  // Vd = 2 L I rho / A. 30 m, 5,000 W at 230 V -> I = 21.74 A.
  // 2 x 30 x 21.74 x 0.0172 / 4 = 5.61 V = 2.44% of 230 V.
  it("computes drop on the out-and-back conductor length", () => {
    const v = voltageDropPercent({
      run_m: 30,
      load_watts: 5000,
      voltage: 230,
      cross_section_mm2: 4,
      lighting_dominant: false,
    });
    expect(v.drop_percent).toBeCloseTo(2.44, 1);
    expect(v.passes).toBe(true);
  });

  it("fails a lighting circuit over 3% on the same load", () => {
    const v = voltageDropPercent({
      run_m: 30,
      load_watts: 5000,
      voltage: 230,
      cross_section_mm2: 2.5,
      lighting_dominant: true,
    });
    // 22.43 / 2.5 = 8.97 V = 3.90%
    expect(v.drop_percent).toBeCloseTo(3.9, 1);
    expect(v.limit_percent).toBe(3);
    expect(v.passes).toBe(false);
  });
});

describe("plumbing material takeoff", () => {
  const rules = {
    pipe_waste_pct: 5,
    elbow_per_fixture: 2,
    tee_per_fixture: null,
    reducer_per_fixture: null,
    union_per_fixture: null,
    valve_per_tap: 1,
  } as never;
  const prices = {
    "plumb-pipe-cold": 1200,
    "plumb-pipe-hot": 1500,
    "plumb-pipe-waste": 900,
    "plumb-pipe-drainage": 2000,
    "plumb-elbow": 300,
    "plumb-valve": 2500,
  } as never;
  const input = {
    taps: 3,
    wcs: 2,
    showers: 1,
    sinks: 1,
    floor_drains: 1,
    water_storage_tanks: 0,
    pumps: 0,
    cold_run_m: 40,
    hot_run_m: 20,
    waste_run_m: 15,
    drainage_run_m: 25,
    labour: { mode: "none" },
  } as never;

  // 40 x 1.05 = 42 m cold, 20 x 1.05 = 21 m hot, plus 5% on waste and drainage
  // with whole-metre purchase rounding: 15.75 -> 16, 26.25 -> 27.
  it("applies pipe waste and rounds purchases up to whole metres", () => {
    const r = calculatePlumbing(input, rules, prices);
    const qty = (slug: string) =>
      r.lines.find((l: never) => (l as { material_slug?: string }).material_slug === slug) as
        | { quantity: number }
        | undefined;
    expect(qty("plumb-pipe-cold")?.quantity).toBe(42);
    expect(qty("plumb-pipe-hot")?.quantity).toBe(21);
    expect(qty("plumb-pipe-waste")?.quantity).toBe(16);
    expect(qty("plumb-pipe-drainage")?.quantity).toBe(27);
  });

  // 8 fixtures x 2 elbows = 16; one valve per tap = 3.
  it("counts fittings from the configured rules", () => {
    const r = calculatePlumbing(input, rules, prices);
    const qty = (slug: string) =>
      r.lines.find((l: never) => (l as { material_slug?: string }).material_slug === slug) as
        | { quantity: number }
        | undefined;
    expect(qty("plumb-elbow")?.quantity).toBe(16);
    expect(qty("plumb-valve")?.quantity).toBe(3);
  });

  it("leaves the total null rather than guessing a missing price", () => {
    const r = calculatePlumbing(input, rules, { "plumb-pipe-cold": 1200 } as never);
    expect(r.material_subtotal).toBeNull();
    expect(r.grand_total).toBeNull();
    expect(r.incomplete).toBe(true);
  });
});

describe("concrete and earthwork takeoff", () => {
  // 1.00 m3 at 5% waste = 1.05 m3 in place. Dry volume = 1.05 x 1.54 = 1.617
  // m3. 1:2:4 -> cement 1.617 / 7 = 0.231 m3; at 0.0347 m3 per 50 kg bag that
  // is 6.66 bags raw, 7 to buy. Sand 1.617 x 2/7 = 0.462 m3, aggregate 0.924 m3.
  it("converts a concrete volume into bags and aggregates", () => {
    const r = calculateConcreteTakeoff({
      elementType: "slab",
      lengthM: 1,
      widthM: 1,
      depthM: 1,
      cementParts: 1,
      sandParts: 2,
      aggregateParts: 4,
      wastePercent: 5,
      cementBagMassKg: 50,
    });
    expect(r.ok).toBe(true);
    const d = r.data!;
    expect(d.volumeWithWasteM3).toBeCloseTo(1.05, 2);
    expect(d.cementBagsRaw).toBeCloseTo(6.66, 1);
    expect(d.cementBagsToBuy).toBe(7);
    expect(d.sandM3).toBeCloseTo(0.462, 3);
    expect(d.aggregateM3).toBeCloseTo(0.924, 3);
  });

  // 12 mm bar = 144 / 162.2 = 0.888 kg/m, so 10 bars x 5 m = 50 m = 44.4 kg.
  it("weighs rebar from bar diameter", () => {
    const r = calculateConcreteTakeoff({
      elementType: "beam",
      lengthM: 5,
      widthM: 0.3,
      depthM: 0.45,
      cementParts: 1,
      sandParts: 2,
      aggregateParts: 4,
      wastePercent: 5,
      cementBagMassKg: 50,
      rebarGroups: [{ label: "main", diameterMm: 12, count: 10, lengthM: 5 }],
    });
    expect(r.data!.rebarWeightKg).toBeCloseTo(44.4, 1);
  });

  // Two sections 100 m apart, cut areas 10 and 20 m2: average end area gives
  // (10 + 20) / 2 x 100 = 1,500 m3 bank; at 25% bulking, 1,875 m3 loose.
  it("takes earthwork by average end area and bulks the loose volume", () => {
    const r = calculateEarthwork({
      stations: [
        { chainageM: 0, cutAreaM2: 10, fillAreaM2: 0 },
        { chainageM: 100, cutAreaM2: 20, fillAreaM2: 0 },
      ],
      bulkingPercent: 25,
      shrinkagePercent: 10,
      cutSuitableForFill: true,
    });
    expect(r.data!.cutBankM3).toBeCloseTo(1500, 0);
    expect(r.data!.cutLooseM3).toBeCloseTo(1875, 0);
  });
});

describe("drywall takeoff", () => {
  // 10 x 3 = 30 m2 of board. A 1.2 x 2.4 m sheet covers 2.88 m2, so 10.42
  // sheets, +10% waste = 11.46 -> 12 sheets. Studs at 600 mm centres over 10 m
  // are 16.67 bays, i.e. 18 studs including both end studs.
  it("counts boards and studs for a 30 m2 wall", () => {
    const r = calculateDrywallTakeoff({
      marketCode: "NG",
      wallLengthM: 10,
      wallHeightM: 3,
      boardWidthMm: 1200,
      boardLengthMm: 2400,
      boardLayers: 1,
      boardSides: 1,
      studSpacingMm: 600,
      trackStockLengthM: 3,
      wastePercent: 10,
    });
    expect(r.netWallAreaM2).toBe(30);
    expect(r.boardSheets).toBe(12);
    expect(r.studCount).toBe(18);
    // 20 m of track + 10% = 22 m, bought in 3 m lengths -> 8 pieces.
    expect(r.trackStockPieces).toBe(8);
  });
});
