/**
 * Golden variance gate.
 *
 * The benchmark suite proves the engines agree with published rules. This suite
 * proves something different and stricter: that for each golden case we can
 * state the expected figure from the source, measure what the engine actually
 * returns, and fail when the gap exceeds the contract.
 *
 * Every expected value below is derived here, in a comment, from the published
 * rule or the source document, never copied from the engine. The engine is
 * called only through its public entry point and compared afterwards.
 *
 * Tolerance contract: GOLDEN_TOLERANCE_PERCENT (5) unless a case records a
 * tighter band. A case may never record a wider one. When a real Bill of
 * Quantities or site receipt arrives, its figures replace the derivations here
 * and the tolerance tightens; nothing else about the harness changes.
 */
import { describe, expect, it } from "vitest";
import { calculateFenceBlockwork } from "../fence-blockwork";
import { calculateGermanFloor } from "../german-floor";
import { calculatePlasteringTakeoff } from "../plastering-standalone-engine";
import { resolveLayoutWastePercent } from "../site-conditions";
import { calculatePopCeiling, calculateTile } from "@/lib/pop-tile-calc";
import type { TileCalcInput } from "@/types";
import {
  GOLDEN_CASES,
  GOLDEN_TOLERANCE_PERCENT,
} from "./fixtures/golden-cases";

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

interface MeasuredLine {
  label: string;
  expected: number;
  actual: number;
  unit: string;
}

interface VarianceCase {
  /** Must match a case id in the golden registry. */
  id: string;
  trade: string;
  /** Expected figures derived from the source, stated independently. */
  measure: () => MeasuredLine[];
}

const CASES: VarianceCase[] = [
  {
    id: "fence-full-plot-9in",
    trade: "fence_blockwork",
    measure: () => {
      // 100 ft x 50 ft plot = 30.48 m x 15.24 m, so 2 x (30.48 + 15.24)
      // = 91.44 m of perimeter. Gate opening 3.6 m leaves 87.84 m of wall.
      // 10 coaches of a 450 x 225 block at a 10 mm joint is 2.35 m high, so
      // the wall has 87.84 x 2.35 = 206.42 m2 of face.
      // One block plus its joint covers 0.46 x 0.235 = 0.1081 m2, so a bare
      // wall needs 206.42 / 0.1081 = 1,910 blocks. 5 percent breakage is the
      // allowance in force, so 2,005 blocks.
      const perimeterM = 2 * (30.48 + 15.24);
      const netWallM = perimeterM - 3.6;
      const wallHeightM = 10 * (0.225 + 0.01);
      const expectedBlocks = ((netWallM * wallHeightM) / (0.46 * 0.235)) * 1.05;

      const takeoff = calculateFenceBlockwork({
        market: "NG",
        plotPreset: "full-plot",
        coaches: 10,
        unitKey: "ng-block-9",
        gateWidthM: 3.6,
        gateCoaches: 10,
        wastage: 0.05,
      });
      const result = takeoff.result;
      if (!result) throw new Error("fence takeoff returned no result");

      return [
        {
          label: "perimeter",
          expected: perimeterM,
          actual: result.site.perimeterM,
          unit: "m",
        },
        {
          label: "blocks",
          expected: expectedBlocks,
          actual: result.blocks.total,
          unit: "blocks",
        },
      ];
    },
  },
  {
    id: "german-floor-120",
    trade: "concrete_slab",
    measure: () => {
      // 12 m x 10 m slab at 150 mm is 120 m2 and 18.00 m3 of wet concrete.
      // Dry batch volume at the site factor with 5 percent waste is
      // 18.00 x 1.54 x 1.05 = 29.11 m3.
      // A 1:2:4 mix is 7 parts: cement 1/7, sand 2/7, granite 4/7.
      // Cement bags = (29.11 / 7) x 1,440 kg/m3 / 50 kg = 119.7 bags.
      // Sand = 8.32 m3 for the slab plus a 50 mm blinding layer over 120 m2
      // (6.00 m3) = 14.32 m3. Granite = 4/7 x 29.11 = 16.63 m3.
      const wetM3 = 120 * 0.15;
      const dryM3 = wetM3 * 1.54 * 1.05;
      const expectedCementBags = ((dryM3 / 7) * 1440) / 50;
      const expectedSandM3 = (dryM3 * 2) / 7 + 120 * 0.05;
      const expectedGraniteM3 = (dryM3 * 4) / 7;

      const takeoff = calculateGermanFloor({
        market: "NG",
        lengthM: 12,
        widthM: 10,
        slabMm: 150,
        hardcoreMm: 200,
        mixKey: "1:2:4",
        wastage: 0.05,
      });
      const res = takeoff.result;
      if (!res) throw new Error("german floor takeoff returned no result");

      return [
        {
          label: "cement",
          expected: expectedCementBags,
          actual: res.cement.bags,
          unit: "bags",
        },
        {
          label: "sand",
          expected: expectedSandM3,
          actual: res.sand.cubicMetres,
          unit: "m3",
        },
        {
          label: "granite",
          expected: expectedGraniteM3,
          actual: res.aggregate.cubicMetres,
          unit: "m3",
        },
      ];
    },
  },
  {
    id: "plaster-bedroom-4x35x3",
    trade: "plastering",
    measure: () => {
      // 40.00 m2 net plaster, 12 mm thick, 1:5, 5 percent waste.
      // Two separate allowances are in force and must be derived separately:
      // a 5 percent substrate roughness allowance on the wet volume, and a
      // 5 percent waste allowance on the dry batch.
      // Wet mortar = 40.00 x 0.012 x 1.05 = 0.504 m3.
      // Dry mortar = wet x 1.33 shrinkage x 1.05 waste.
      // Cement = 1/6 of dry at 1,440 kg/m3, in 50 kg bags.
      // Sand = 5/6 of dry.
      const wetM3 = 40 * 0.012 * 1.05;
      const dryM3 = wetM3 * 1.33 * 1.05;
      // Cement is bought in whole bags, so the source figure rounds up.
      const expectedCementBags = Math.ceil(((dryM3 / 6) * 1440) / 50);
      const expectedSandM3 = (dryM3 * 5) / 6;

      const takeoff = calculatePlasteringTakeoff({
        marketCode: "NG",
        surfaceAreaM2: 40,
        thicknessMm: 12,
        coats: 1,
        mixRatio: "1:5",
        wastePercent: 5,
      });

      expect(
        takeoff.roughnessAllowancePercent,
        "roughness must be disclosed",
      ).toBe(5);
      expect(takeoff.wastePercentApplied, "waste must be disclosed").toBe(5);
      expect(takeoff.marketNotes).toContain("substrate roughness allowance");
      expect(takeoff.marketNotes).toContain("waste allowance");

      return [
        {
          label: "wet mortar",
          expected: wetM3,
          actual: takeoff.wetMortarVolumeM3,
          unit: "m3",
        },
        {
          label: "dry mortar",
          expected: dryM3,
          actual: takeoff.dryMortarVolumeM3,
          unit: "m3",
        },
        {
          label: "cement",
          expected: expectedCementBags,
          actual: takeoff.cementBagsRequired,
          unit: "bags",
        },
        {
          label: "sand",
          expected: expectedSandM3,
          actual: takeoff.sandVolumeM3,
          unit: "m3",
        },
      ];
    },
  },
  {
    id: "render-external-145",
    trade: "plastering",
    measure: () => {
      // 145.00 m2 external render at 20 mm, 1:4, 5 percent waste.
      // Same two allowances as the bedroom case, derived separately:
      // wet = 145.00 x 0.020 x 1.05 = 3.045 m3, dry = wet x 1.33 x 1.05.
      // Cement = 1/5 of dry, sand = 4/5 of dry.
      const wetM3 = 145 * 0.02 * 1.05;
      const dryM3 = wetM3 * 1.33 * 1.05;
      // Whole bags, rounded up, as the merchant sells them.
      const expectedCementBags = Math.ceil(((dryM3 / 5) * 1440) / 50);
      const expectedSandM3 = (dryM3 * 4) / 5;

      const takeoff = calculatePlasteringTakeoff({
        marketCode: "NG",
        surfaceAreaM2: 145,
        thicknessMm: 20,
        coats: 1,
        mixRatio: "1:4",
        wastePercent: 5,
      });

      return [
        {
          label: "wet mortar",
          expected: wetM3,
          actual: takeoff.wetMortarVolumeM3,
          unit: "m3",
        },
        {
          label: "cement",
          expected: expectedCementBags,
          actual: takeoff.cementBagsRequired,
          unit: "bags",
        },
        {
          label: "sand",
          expected: expectedSandM3,
          actual: takeoff.sandVolumeM3,
          unit: "m3",
        },
      ];
    },
  },
  {
    id: "pop-ceiling-4x5",
    trade: "ceiling",
    measure: () => {
      // 4 m x 5 m room = 20.00 m2, 10 percent waste = 2.00 m2 of offcut.
      const result = calculatePopCeiling(
        {
          workflow: "nigeria",
          roomLength: 5,
          roomWidth: 4,
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

      return [
        {
          label: "ceiling area",
          expected: 20,
          actual: result.ceilingArea,
          unit: "m2",
        },
        {
          label: "waste",
          expected: 2,
          actual: result.wasteAmount,
          unit: "m2",
        },
      ];
    },
  },
  {
    id: "tile-hall-48-straight",
    trade: "tiling",
    measure: () => {
      // 8 m x 6 m = 48.00 m2 floor. A 600 x 600 tile is 0.36 m2, four to a box
      // so 1.44 m2 per box. Straight grid layout waste from the shared layout
      // profile. Wasted area = 48.00 x 1.06 = 50.88 m2.
      // Tiles = ceil(50.88 / 0.36) = 142. Boxes = ceil(142 / 4) = 36.
      const wastePercent = resolveLayoutWastePercent("simple_rectangular");
      const expectedTiles = Math.ceil((48 * (1 + wastePercent / 100)) / 0.36);
      const expectedBoxes = Math.ceil(expectedTiles / 4);

      const tileResult = calculateTile(
        makeTileInput({
          surfaceType: "floor",
          length: 8,
          width: 6,
          unit: "meters",
          wasteMargin: wastePercent,
          tileWidthMm: 600,
          tileHeightMm: 600,
          tilesPerBox: 4,
        }),
        [],
        "NGN",
        "₦",
      );

      return [
        {
          label: "tiles",
          expected: expectedTiles,
          actual: tileResult.tilesNeeded,
          unit: "tiles",
        },
        {
          label: "boxes",
          expected: expectedBoxes,
          actual: tileResult.boxesNeeded,
          unit: "boxes",
        },
      ];
    },
  },
];

const percentDeviation = (actual: number, expected: number): number => {
  if (expected === 0) return actual === 0 ? 0 : Number.POSITIVE_INFINITY;
  return ((actual - expected) / expected) * 100;
};

const registryIds = new Set(GOLDEN_CASES.map((entry) => entry.id));

describe("golden variance gate", () => {
  it("gates at least six cases across at least five trades", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(6);
    const trades = new Set(CASES.map((entry) => entry.trade));
    expect(trades.size).toBeGreaterThanOrEqual(5);
  });

  it("ties every measured case to a registered golden case", () => {
    for (const entry of CASES) {
      expect(
        registryIds.has(entry.id),
        `${entry.id} is not in the registry`,
      ).toBe(true);
    }
  });

  it("records the deviation of every measured line", () => {
    const report: Record<string, string>[] = [];

    for (const varianceCase of CASES) {
      const tolerance =
        GOLDEN_CASES.find((entry) => entry.id === varianceCase.id)
          ?.tolerancePercent ?? GOLDEN_TOLERANCE_PERCENT;

      for (const line of varianceCase.measure()) {
        const deviation = percentDeviation(line.actual, line.expected);
        report.push({
          case: varianceCase.id,
          line: line.label,
          expected: `${line.expected.toFixed(2)} ${line.unit}`,
          engine: `${line.actual.toFixed(2)} ${line.unit}`,
          drift: `${deviation.toFixed(2)}%`,
          band: `±${tolerance}%`,
        });
        expect(
          Math.abs(deviation),
          `${varianceCase.id} ${line.label}: expected ${line.expected.toFixed(
            2,
          )} ${line.unit}, engine returned ${line.actual.toFixed(2)} ${
            line.unit
          }, drift ${deviation.toFixed(2)}% outside ±${tolerance}%`,
        ).toBeLessThanOrEqual(tolerance);
      }
    }

    // The table is the point of the run: it states the margin each case holds
    // against its source, so a tightening engine shows up as a number, not a
    // green tick.
    // eslint-disable-next-line no-console
    console.table(report);
  });

  it("measures every line against a non-zero source figure", () => {
    for (const varianceCase of CASES) {
      for (const line of varianceCase.measure()) {
        expect(
          Number.isFinite(line.expected) && line.expected !== 0,
          `${varianceCase.id} ${line.label} has no source figure`,
        ).toBe(true);
      }
    }
  });
});
