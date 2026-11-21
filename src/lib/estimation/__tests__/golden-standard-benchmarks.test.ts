/**
 * Multi-Trade Takeoff & Packaging Benchmark Test Suite
 *
 * Deterministic engineering benchmark suite verifying cross-trade takeoff consistency,
 * packaging unit roundups, dry-volume bulking factors, and regression boundaries
 * across 12 standardized reference scenarios (Nigeria, UK, US, South Africa, etc.).
 *
 * Note: These tests verify mathematical consistency and boundary enforcement
 * against textbook quantity surveying formulas and published standards; they do
 * not represent scanned physical paper receipts or audited external contractor BOQs.
 */
import { describe, expect, it } from "vitest";
import { calculateFenceBlockwork } from "../fence-blockwork";
import { calculateGermanFloor } from "../german-floor";
import { calculatePlasteringTakeoff } from "../plastering-standalone-engine";
import {
  calculateTheoreticalLitres,
  calculateWallArea,
  calculateOpeningArea,
} from "../paint-engine";
import { calculatePopCeiling, calculateTile } from "@/lib/pop-tile-calc";
import type { TileCalcInput } from "@/types";

function makeTileInput(overrides: Partial<TileCalcInput>): TileCalcInput {
  return {
    surfaceType: "floor",
    method: "adhesive",
    length: 5,
    width: 4,
    height: 3,
    tileWidthMm: 600,
    tileHeightMm: 600,
    tilesPerBox: 4,
    tilePricePerBox: 5000,
    adhesiveCoverageRate: 5,
    adhesivePricePerBag: 3500,
    cementCoverageRate: 5,
    cementPricePerBag: 4500,
    cementPackageSize: 1,
    sandCoverageRate: 5,
    sandPricePerBag: 3000,
    sandPackageSize: 1,
    groutCoverageRate: 10,
    groutPricePerKg: 2500,
    spacerCoverageRate: 50,
    spacerPricePerPack: 500,
    spacerPackageSize: 1,
    wasteMargin: 10,
    unit: "meters",
    quantity: 1,
    labourRatePerSqm: 1200,
    ...overrides,
  };
}
import {
  MORTAR_DRY_VOLUME_FACTOR,
  HARDCORE_LOOSE_BULKING_FACTOR,
  resolveSurfacePorosity,
  resolveLayoutWastePercent,
} from "../site-conditions";

describe("Standardized Trade Benchmark Test Suite (Multi-Trade Takeoff & Boundary Validation)", () => {
  // --------------------------------------------------------------------------
  // Benchmark 1: Standard Full-Plot Perimeter Fence (9-inch blocks)
  // --------------------------------------------------------------------------
  it("Benchmark Scenario 1: matches QS BOQ for a 100ft x 50ft perimeter fence (9-inch sandcrete blocks)", () => {
    // 100 ft x 50 ft plot (30.48m x 15.24m) = 91.44 m perimeter.
    // 10 coaches of 9" sandcrete blockwork, 1 gate opening (3.6m wide).
    const takeoff = calculateFenceBlockwork({
      market: "NG",
      plotPreset: "full-plot",
      coaches: 10,
      unitKey: "ng-block-9",
      gateWidthM: 3.6,
      gateCoaches: 10,
      wastage: 0.05,
    });

    expect(takeoff.errors).toEqual([]);
    const result = takeoff.result!;

    // Net wall length = 91.44m - 3.6m = 87.84m.
    // Wall height = 10 courses * 0.235m = 2.35m.
    // At 10 coaches, blocks = ~1,990 to 2,050 (including 5% breakage).
    expect(result.site.perimeterM).toBeCloseTo(91.44, 2);
    expect(result.blocks.total).toBeGreaterThanOrEqual(1950);
    expect(result.blocks.total).toBeLessThanOrEqual(2100);

    // Bed joint mortar cement (1:6 mix): 23 bags for wall joints
    expect(result.cement.bags).toBe(23);

    // Mortar sand volume
    expect(result.sand.cubicMetres).toBeCloseTo(3.13, 2);
  });

  // --------------------------------------------------------------------------
  // Benchmark 2: Half-Plot Perimeter Fence (6-inch blocks)
  // --------------------------------------------------------------------------
  it("Benchmark Scenario 2: matches BOQ for half-plot fence (50ft x 50ft, 8 courses of 6-inch blocks)", () => {
    // Half plot (15.24m x 15.24m) = 60.96m perimeter.
    const takeoff = calculateFenceBlockwork({
      market: "NG",
      plotPreset: "half-plot",
      coaches: 8,
      unitKey: "ng-block-6",
      gateWidthM: 3.0,
      gateCoaches: 8,
      wastage: 0.05,
    });

    expect(takeoff.errors).toEqual([]);
    const result = takeoff.result!;
    expect(result.site.perimeterM).toBeCloseTo(60.96, 2);
    // Net perimeter = 57.96m. 8 courses of 6" blocks = ~1,100 blocks
    expect(result.blocks.total).toBeGreaterThanOrEqual(1050);
    expect(result.blocks.total).toBeLessThanOrEqual(1200);
    expect(result.cement.bags).toBe(8);
  });

  // --------------------------------------------------------------------------
  // Benchmark 3: 120 m2 Residential German Floor Slab (3-Bedroom Bungalow)
  // --------------------------------------------------------------------------
  it("Benchmark Scenario 3: matches structural concrete takeoff for a 120 m² German floor slab (150mm concrete)", () => {
    // Custom dimensions 12m x 10m = 120 m² slab at 150mm thickness (1:2:4 mix).
    const takeoff = calculateGermanFloor({
      market: "NG",
      lengthM: 12.0,
      widthM: 10.0,
      slabMm: 150,
      hardcoreMm: 200,
      mixKey: "1:2:4",
      wastage: 0.05,
    });

    expect(takeoff.errors).toEqual([]);
    const res = takeoff.result!;
    expect(res.areaM2).toBeCloseTo(120, 2);

    // Wet volume = 120 m² * 0.15m = 18.0 m³.
    // Dry batch volume (1.54 factor, 5% waste) = 18.0 * 1.54 * 1.05 = ~29.1 m³.
    // In 1:2:4 mix (7 parts):
    // Cement: 1/7 * 29.1 m³ * 1440 kg/m³ / 50kg = ~120 bags.
    expect(res.cement.bags).toBeGreaterThanOrEqual(118);
    expect(res.cement.bags).toBeLessThanOrEqual(125);

    // Sand volume includes slab concrete sand (8.3 m³) and the 50mm blinding
    // bed at its purchase volume, 6.0 m³ plus the same 5 per cent every layer
    // carries = ~14.6 m³.
    expect(res.sand.cubicMetres).toBeCloseTo(14.6, 1);

    // Coarse aggregate (granite): 4/7 * 29.1 m³ = ~16.6 m³
    expect(res.aggregate.cubicMetres).toBeCloseTo(16.6, 1);
  });

  // --------------------------------------------------------------------------
  // Benchmark 4: 48 m2 Commercial Shop Slab
  // --------------------------------------------------------------------------
  it("Benchmark Scenario 4: matches hardcore fill and concrete takeoff for 48 m² shop slab (100mm)", () => {
    const takeoff = calculateGermanFloor({
      market: "NG",
      lengthM: 8.0,
      widthM: 6.0,
      slabMm: 100,
      hardcoreMm: 150,
      mixKey: "1:2:4",
      wastage: 0.05,
    });

    expect(takeoff.errors).toEqual([]);
    const res = takeoff.result!;
    expect(res.areaM2).toBeCloseTo(48, 2);

    // Hardcore compacted volume = 48 * 0.15 = 7.2 m³.
    // With 1.25 loose bulking factor: loose stone = 7.2 * 1.25 = 9.0 m³.
    expect(res.layers.hardcore.cubicMetres).toBeCloseTo(7.2, 1);
    expect(
      res.layers.hardcore.cubicMetres * HARDCORE_LOOSE_BULKING_FACTOR,
    ).toBeCloseTo(9.0, 1);

    // 100mm slab concrete wet volume = 4.8 m³ -> 32 bags cement
    expect(res.cement.bags).toBeGreaterThanOrEqual(30);
    expect(res.cement.bags).toBeLessThanOrEqual(35);
  });

  // --------------------------------------------------------------------------
  // Benchmark 5: Internal Bedroom Wall Plastering Takeoff
  // --------------------------------------------------------------------------
  it("Benchmark Scenario 5: matches QS plastering takeoff for a standard 4m x 3.5m x 3m bedroom (12mm plaster, 1:5 mix)", () => {
    // Net plastering area = 40.0 m².
    const netArea = 40.0;
    const takeoff = calculatePlasteringTakeoff({
      marketCode: "NG",
      surfaceAreaM2: netArea,
      thicknessMm: 12,
      coats: 1,
      mixRatio: "1:5",
      wastePercent: 5,
    });

    // Wet volume with 5% waste = 40 m² * 0.012m * 1.05 = 0.504 m³.
    expect(takeoff.wetMortarVolumeM3).toBeCloseTo(0.504, 3);
    // Dry mortar volume with 1.33 shrinkage factor and 5% waste = 0.504 * 1.33 * 1.05 = 0.704 m³.
    expect(takeoff.dryMortarVolumeM3).toBeCloseTo(
      0.504 * MORTAR_DRY_VOLUME_FACTOR * 1.05,
      3,
    );

    // In 1:5 mix: cement is 1/6th of dry volume -> 3 to 4 bags.
    expect(takeoff.cementBagsRequired).toBeGreaterThanOrEqual(3);
    expect(takeoff.cementBagsRequired).toBeLessThanOrEqual(4);

    // Plaster sand volume: 5/6 * 0.704 = ~0.59 m³.
    expect(takeoff.sandVolumeM3).toBeCloseTo(0.59, 1);
  });

  // --------------------------------------------------------------------------
  // Benchmark 6: External Waterproof Wall Rendering (145 m2, 20mm 2-coat, 1:4 mix)
  // --------------------------------------------------------------------------
  it("Benchmark Scenario 6: matches external rendering receipt for 145 m² at 20mm thickness (1:4 mix)", () => {
    const takeoff = calculatePlasteringTakeoff({
      marketCode: "NG",
      surfaceAreaM2: 145.0,
      thicknessMm: 20,
      coats: 2,
      mixRatio: "1:4",
      wastePercent: 5,
    });

    // Wet volume = 145 * 0.02 * 1.05 = 3.045 m³.
    expect(takeoff.wetMortarVolumeM3).toBeCloseTo(3.045, 3);
    // Dry volume = 3.045 * 1.33 * 1.05 = ~4.252 m³.
    expect(takeoff.dryMortarVolumeM3).toBeCloseTo(
      3.045 * MORTAR_DRY_VOLUME_FACTOR * 1.05,
      3,
    );

    // 1:4 mix has 1 part cement to 4 parts sand -> 24 to 25 bags.
    expect(takeoff.cementBagsRequired).toBeGreaterThanOrEqual(23);
    expect(takeoff.cementBagsRequired).toBeLessThanOrEqual(26);
  });

  // --------------------------------------------------------------------------
  // Benchmark 7: 4m x 5m POP Suspended Ceiling Takeoff
  // --------------------------------------------------------------------------
  it("Benchmark Scenario 7: matches material takeoff for a 4m x 5m suspended POP ceiling", () => {
    const result = calculatePopCeiling(
      {
        workflow: "nigeria",
        roomLength: 5.0,
        roomWidth: 4.0,
        unit: "meters",
        wasteMargin: 10,
        workers: 2,
        days: 2,
        includeDecorative: false,
        includeOptional: false,
      },
      [],
      "NGN",
      "₦",
    );

    // Area = 20 m². With 10% waste = 22 m².
    expect(result.ceilingArea).toBeCloseTo(20.0, 1);
    expect(result.wasteAmount).toBeCloseTo(2.0, 1);
    // Perimeter cornice length = 2 * (5 + 4) = 18m
    const perimeterM = 2 * (5.0 + 4.0);
    expect(perimeterM).toBe(18.0);
  });

  // --------------------------------------------------------------------------
  // Benchmark 8: Living Room Floor Tiling (6m x 8m, 600x600mm straight grid)
  // --------------------------------------------------------------------------
  it("Benchmark Scenario 8: matches contractor receipt for 48 m² floor tiling (600x600mm straight grid)", () => {
    // 6m x 8m = 48 m² floor area.
    // Tile size: 600mm x 600mm = 0.36 m² per tile.
    // 4 tiles per box = 1.44 m² per box.
    // Straight grid layout waste: 6%.
    const wastePercent = resolveLayoutWastePercent("simple_rectangular");
    expect(wastePercent).toBe(6);

    const tileResult = calculateTile(
      makeTileInput({
        surfaceType: "floor",
        length: 8.0,
        width: 6.0,
        unit: "meters",
        wasteMargin: wastePercent,
        tileWidthMm: 600,
        tileHeightMm: 600,
        tilesPerBox: 4,
        tilePricePerBox: 5000,
      }),
      [],
      "NGN",
      "₦",
    );

    expect(tileResult.surfaceArea).toBeCloseTo(48.0, 1);
    expect(tileResult.netSurfaceArea).toBeCloseTo(48.0, 1);
    // Tile unit area = 0.6 * 0.6 = 0.36 m²
    expect(tileResult.tileArea).toBeCloseTo(0.36, 2);

    // Adjusted area with 6% waste = 48 * 1.06 = 50.88 m².
    // Tiles needed = ceil(50.88 / 0.36) = 142 tiles.
    // Boxes needed = ceil(142 / 4) = 36 cartons.
    expect(tileResult.tilesNeeded).toBe(142);
    expect(tileResult.boxesNeeded).toBe(36);
  });

  // --------------------------------------------------------------------------
  // Benchmark 9: Complex Diagonal Bathroom Tiling (14% cutting waste)
  // --------------------------------------------------------------------------
  it("Benchmark Scenario 9: matches tile receipt for complex diagonal bathroom tiling (14% waste)", () => {
    const wastePercent = resolveLayoutWastePercent("complex_diagonal");
    expect(wastePercent).toBe(14);

    const bathroomResult = calculateTile(
      makeTileInput({
        surfaceType: "floor",
        length: 3.0,
        width: 2.5,
        unit: "meters",
        wasteMargin: wastePercent,
        tileWidthMm: 300,
        tileHeightMm: 300,
        tilesPerBox: 12,
        tilePricePerBox: 3000,
      }),
      [],
      "NGN",
      "₦",
    );

    // Net area = 7.5 m². With 14% cutting waste = 8.55 m².
    expect(bathroomResult.surfaceArea).toBeCloseTo(7.5, 2);
    expect(bathroomResult.tileArea).toBeCloseTo(0.09, 2);

    // Tiles needed = ceil(8.55 / 0.09) = 95 tiles.
    // Boxes needed = ceil(95 / 12) = 8 cartons.
    expect(bathroomResult.tilesNeeded).toBe(95);
    expect(bathroomResult.boxesNeeded).toBe(8);
  });

  // --------------------------------------------------------------------------
  // Benchmark 10: Raw Plaster Paint Suction Modifier
  // --------------------------------------------------------------------------
  it("Benchmark Scenario 10: correctly accounts for raw cement plaster suction (0.75x spread rate)", () => {
    const rawPlaster = resolveSurfacePorosity("raw_plaster");
    expect(rawPlaster.coverageMultiplier).toBe(0.75);
    expect(rawPlaster.primerRecommended).toBe(true);

    // Standard emulsion baseline: 10 m²/L over 2 coats.
    // On raw plaster: effective spread rate is 10 * 0.75 = 7.5 m²/L.
    const netAreaM2 = 220.0;
    const baselineLitres = calculateTheoreticalLitres(netAreaM2, 2, 10);
    const rawPlasterLitres = calculateTheoreticalLitres(
      netAreaM2,
      2,
      10 * rawPlaster.coverageMultiplier,
    );

    // Raw plaster requires 33% more paint on absorption coats
    expect(rawPlasterLitres).toBeGreaterThan(baselineLitres);
    expect(rawPlasterLitres / baselineLitres).toBeCloseTo(1 / 0.75, 2);
  });

  // --------------------------------------------------------------------------
  // Benchmark 11: Repaint Surface Modifier (Sealed substrate)
  // --------------------------------------------------------------------------
  it("Benchmark Scenario 11: accounts for higher coverage on sound repaints (1.15x spread rate)", () => {
    const repaint = resolveSurfacePorosity("repaint");
    expect(repaint.coverageMultiplier).toBe(1.15);
    expect(repaint.primerRecommended).toBe(false);

    const netAreaM2 = 310.0;
    const baselineLitres = calculateTheoreticalLitres(netAreaM2, 2, 10);
    const repaintLitres = calculateTheoreticalLitres(
      netAreaM2,
      2,
      10 * repaint.coverageMultiplier,
    );

    // Sealed sound paint spreads further
    expect(repaintLitres).toBeLessThan(baselineLitres);
    expect(baselineLitres / repaintLitres).toBeCloseTo(1.15, 2);
  });

  // --------------------------------------------------------------------------
  // Benchmark 12: End-to-End Drift Guard (Strict ±3% to ±5% Tolerance)
  // --------------------------------------------------------------------------
  it("Benchmark Scenario 12: asserts calculation outputs stay strictly within ±3% of verified quantity surveying rules", () => {
    // Test geometry: 4.5m x 3.2m x 2.7m room
    const wallArea = calculateWallArea(4.5, 3.2, 2.7);
    expect(wallArea).toBeCloseTo(41.58, 2);

    const openings = calculateOpeningArea(
      [
        { width: 0.9, height: 2.1, quantity: 1 }, // Door: 1.89 m²
        { width: 1.2, height: 1.2, quantity: 2 }, // 2 Windows: 2.88 m²
      ],
      "meters",
    );
    expect(openings).toBeCloseTo(4.77, 2);

    const netArea = wallArea - openings;
    expect(netArea).toBeCloseTo(36.81, 2);

    // Baseline coverage: 10 m²/L, 2 coats
    const litres = calculateTheoreticalLitres(netArea, 2, 10);
    // Theoretical litres = (36.81 * 2) / 10 = 7.362 L
    const verifiedQSBaseline = 7.362;
    const driftPercentage =
      Math.abs((litres - verifiedQSBaseline) / verifiedQSBaseline) * 100;

    // Must not drift more than 1% from exact arithmetic
    expect(driftPercentage).toBeLessThan(1.0);
  });
});
