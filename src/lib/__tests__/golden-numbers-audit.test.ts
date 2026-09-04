/**
 * FRELUX Golden-Numbers Audit — pre-launch verification
 *
 * Every scenario below is computed BY HAND from first principles and pinned
 * against the engine output. These tests are the launch gate: if any result
 * doubles (or halves, or double-applies a factor), this file fails.
 *
 * Reference scenarios were chosen to be simple enough to verify mentally.
 */
import { describe, it, expect } from "vitest";
import {
  calculateWallArea,
  calculateCeilingArea,
  calculateOpeningArea as _calculateOpeningArea,
  calculateAdvancedEstimate,
  calculateScreedingMix,
  calculateScreedingPutty,
  calculateScreedingMixSystem,
} from "@/lib/calc";
import { calculateTile, calculatePopCeiling } from "@/lib/pop-tile-calc";
import { roundPackQuantity, calculateLeftover } from "@/lib/estimation/pack-sizing";
import { calculateLineTotal } from "@/lib/estimation/pricing";
import { calculateWallArea as engineWallArea } from "@/lib/estimation/painting-engine";
import type {
  AdvancedCalcInput,
  ScreedingMixConfig,
  ScreedingSystemConfig,
} from "@/lib/calc";
import type { TileCalcInput, PopCalcInput } from "@/types";
import type { DbTileMaterial, DbPopMaterial } from "@/types/database";

// ─────────────────────────────────────────────────────────
// Geometry primitives — used by every calculator
// ─────────────────────────────────────────────────────────
describe("GOLDEN: wall area geometry", () => {
  it("rectangular room: perimeter × height (no doubling)", () => {
    // 4m × 3m room, 3m height → perimeter 2×(4+3)=14m → 42 m²
    expect(calculateWallArea(4, 3, 3, "room")).toBe(42);
    expect(engineWallArea(4, 3, 3)).toBe(42);
  });

  it("square room does not double-count identical walls", () => {
    // 5×5×3 → 2×(5+5)×3 = 60 m² (NOT 5×5×2 sides × anything)
    expect(calculateWallArea(5, 5, 3, "room")).toBe(60);
    expect(engineWallArea(5, 5, 3)).toBe(60);
  });

  it("fence is a flat surface: length × height only", () => {
    expect(calculateWallArea(30, 0, 2.5, "fence")).toBe(75);
  });

  it("width=0 room counts only the two length walls", () => {
    expect(calculateWallArea(4, 0, 3, "room")).toBe(24);
  });

  it("ceiling area = length × width exactly once", () => {
    expect(calculateCeilingArea(4, 3)).toBe(12);
  });
});

// ─────────────────────────────────────────────────────────
// Tile calculator — full hand-check
// ─────────────────────────────────────────────────────────
describe("GOLDEN: tile calculator", () => {
  const base: TileCalcInput = {
    surfaceType: "floor",
    length: 4, // meters
    width: 3, // meters
    height: 0,
    unit: "meters",
    tileWidthMm: 400,
    tileHeightMm: 400,
    tilesPerBox: 8,
    tilePricePerBox: 12000,
    wasteMargin: 10,
    method: "adhesive",
    adhesiveCoverageRate: 5, // m² per bag
    adhesivePricePerBag: 3500,
    cementCoverageRate: 0,
    cementPricePerBag: 0,
    cementPackageSize: 1,
    sandCoverageRate: 0,
    sandPricePerBag: 0,
    sandPackageSize: 1,
    groutCoverageRate: 20, // m² per kg
    groutPricePerKg: 800,
    spacerCoverageRate: 10, // m² per pack
    spacerPackageSize: 1,
    spacerPricePerPack: 500,
  };

  // Hand math: area 12 m², +10% waste → 13.2 m²
  // Tile 0.4×0.4 = 0.16 m² → ceil(13.2/0.16)=ceil(82.5)=83 tiles
  // Boxes: ceil(83/8)=11 → tile cost 11×12000 = 132,000
  // Adhesive: 13.2/5 = 2.64 → ceil 3 bags → 10,500
  // Grout: 13.2/20 = 0.66 → ceil 1 kg → 800
  // Spacers: 13.2/10 = 1.32 → ceil 2 packs → 1,000
  // Total: 132,000+10,500+800+1,000 = 144,300
  it("floor: 4×3m, 400mm tiles, 10% waste — exact hand-computed totals", () => {
    const r = calculateTile(base, [] as DbTileMaterial[], "NGN", "₦");
    expect(r.surfaceArea).toBe(12);
    expect(r.tilesNeeded).toBe(83);
    expect(r.boxesNeeded).toBe(11);
    expect(r.tileCost).toBe(132000);
    expect(r.adhesiveNeeded).toBe(3);
    expect(r.adhesiveCost).toBe(10500);
    expect(r.groutNeeded).toBe(1);
    expect(r.groutCost).toBe(800);
    expect(r.spacerNeeded).toBe(2);
    expect(r.spacerCost).toBe(1000);
    expect(r.materialCost).toBe(144300);
    expect(r.grandTotal).toBe(144300);
  });

  it("waste is applied exactly once (10% of base area, not compounded)", () => {
    const r = calculateTile(base, [] as DbTileMaterial[], "NGN", "₦");
    // 12 × 0.10 = 1.2 m² — NOT 12×1.1×1.1
    expect(r.wasteAmount).toBeCloseTo(1.2, 5);
  });

  it("0% waste gives raw quantities", () => {
    const r = calculateTile({ ...base, wasteMargin: 0 }, [] as DbTileMaterial[], "NGN", "₦");
    expect(r.tilesNeeded).toBe(Math.ceil(12 / 0.16)); // 75
    expect(r.wasteAmount).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────
// POP ceiling calculator
// ─────────────────────────────────────────────────────────
describe("GOLDEN: POP ceiling calculator", () => {
  const materials: DbPopMaterial[] = [
    {
      id: "m1",
      name: "POP Cement",
      category: "binding",
      workflow: "direct",
      coverage_rate: "4", // m² per kg
      coverage_unit: "kg",
      package_size: "20", // kg per bag
      unit_price: 4500,
      sort_order: 1,
      is_active: true,
      is_optional: false,
    } as unknown as DbPopMaterial,
  ];

  // 5m × 4m = 20 m², 15% waste → 23 m²
  // POP cement: 23/4 = 5.75 → ceil(5.75/20) = 1 bag → 4,500
  it("5×4m ceiling, 15% waste — hand-computed totals", () => {
    const input: PopCalcInput = {
      roomLength: 5,
      roomWidth: 4,
      unit: "meters",
      wasteMargin: 15,
      workflow: "direct",
      includeOptional: false,
      includeDecorative: false,
    };
    const r = calculatePopCeiling(input, materials, "NGN", "₦");
    expect(r.ceilingArea).toBe(20);
    expect(r.wasteAmount).toBeCloseTo(3, 5); // 20 × 0.15 — applied once
    expect(r.materials[0].packagesNeeded).toBe(1);
    expect(r.materialCost).toBe(4500);
    expect(r.grandTotal).toBe(4500);
  });
});

// ─────────────────────────────────────────────────────────
// Screeding systems — coat-factor model
// ─────────────────────────────────────────────────────────
describe("GOLDEN: screeding putty system", () => {
  const config: ScreedingSystemConfig = {
    systemType: "putty",
    coverageAreaM2: 12, // 2 buckets per 12 m²
    puttyQuantity: 2,
    defaultCoats: 2,
    wastePercentage: 10,
    puttyPricePerUnit: 5500,
    roundingRule: "ceil",
    puttyName: "Putty",
    puttyUnit: "bucket",
    currency: "NGN",
    currencySymbol: "₦",
  };

  it("at default coats, configured ratio applies verbatim (factor exactly 1)", () => {
    // 24 m² / 12 m² = 2 coverage units × 2 buckets = 4 base buckets
    // +10% waste = 4.4 → ceil = 5 buckets → 27,500
    const r = calculateScreedingPutty(24, config);
    expect(r.putty.baseQuantity).toBe(4);
    expect(r.putty.finalQuantity).toBeCloseTo(4.4, 5);
    expect(r.putty.purchaseQuantity).toBe(5);
    expect(r.materialCost).toBe(27500);
  });

  it("double coats is ×1.5 relative to 2-coat default — NOT ×2", () => {
    // 3 coats / 2 default = 1.5 factor (the ratio already includes 2 coats)
    const r3 = calculateScreedingPutty(24, config, 3);
    expect(r3.putty.baseQuantity).toBe(6); // 4 × 1.5
    // and 4 coats = ×2, which is correct (twice the paint for twice the coats)
    const r4 = calculateScreedingPutty(24, config, 4);
    expect(r4.putty.baseQuantity).toBe(8);
    // but 2 coats (the default) must NOT be ×2 on top of a ratio that
    // already includes 2 coats — the classic double-count:
    const r2 = calculateScreedingPutty(24, config, 2);
    expect(r2.putty.baseQuantity).toBe(4);
  });
});

describe("GOLDEN: screeding white-cement + paint system", () => {
  const config: ScreedingSystemConfig = {
    systemType: "white_cement_paint",
    coverageAreaM2: 20, // per 20 m²
    paintQuantity: 2,
    cementQuantity: 1,
    defaultCoats: 2,
    wastePercentage: 5,
    paintPricePerUnit: 9000,
    cementPricePerUnit: 4000,
    roundingRule: "ceil",
    paintName: "Screeding Paint",
    paintUnit: "bucket",
    cementName: "White Cement",
    cementUnit: "bag",
    currency: "NGN",
    currencySymbol: "₦",
  };

  it("40 m² at default coats: verbatim ratio, single waste application", () => {
    // 40/20 = 2 units → paint 4 buckets, cement 2 bags
    // +5% waste: paint 4.2→5, cement 2.1→3
    // cost: 5×9000 + 3×4000 = 57,000
    const r = calculateScreedingMixSystem(40, config);
    expect(r.paint.baseQuantity).toBe(4);
    expect(r.paint.purchaseQuantity).toBe(5);
    expect(r.cement.baseQuantity).toBe(2);
    expect(r.cement.purchaseQuantity).toBe(3);
    expect(r.materialCost).toBe(57000);
  });
});

// ─────────────────────────────────────────────────────────
// Advanced estimate — full cost chain
// ─────────────────────────────────────────────────────────
describe("GOLDEN: advanced estimate chain (waste→markup→profit→tax)", () => {
  const input: AdvancedCalcInput = {
    netArea: 100,
    wastePercentage: 10,
    coats: 2,
    thickness: 10, // baseline 10mm → factor 1
    paintCoverageRateM2PerL: 10,
    paintBucketSizeL: 20,
    paintPricePerBucket: 20000,
    cementRatioKgPerL: 0.5,
    cementBagSizeKg: 40,
    cementPricePerBag: 6000,
    labourCost: 0,
    transportCost: 5000,
    markupPercentage: 20,
    profitPercentage: 10,
    taxPercentage: 7.5,
    currency: "NGN",
    currencySymbol: "₦",
  };

  // Hand math:
  // base litres = 100 × 2 / 10 = 20 L; +10% waste = 22 L
  // buckets = ceil(22/20) = 2 → paint 40,000
  // cement kg = 22 × 0.5 = 11 → ceil(11/40) = 1 bag → 6,000
  // material = 46,000; subtotal = +transport 5,000 = 51,000
  // markup 20% = 10,200 → 61,200
  // profit 10% of 61,200 = 6,120 → 67,320
  // tax 7.5% = 5,049 → grand = 72,369
  it("each factor applied exactly once, in order", () => {
    const r = calculateAdvancedEstimate(input);
    expect(r.paintBuckets).toBe(2);
    expect(r.cementBags).toBe(1);
    expect(r.materialCost).toBe(46000);
    // material + transport = 51,000 (implicit subtotal; no double-count check)
    expect(r.markupAmount / (r.materialCost + input.transportCost)).toBeCloseTo(0.2, 5);
    expect(r.markupAmount).toBe(10200);
    expect(r.profitAmount).toBe(6120);
    expect(r.taxAmount).toBeCloseTo(5049, 0);
    expect(r.grandTotal).toBeCloseTo(72369, 0);
  });

  it("0% everything degenerates to raw costs", () => {
    const r = calculateAdvancedEstimate({
      ...input,
      wastePercentage: 0,
      markupPercentage: 0,
      profitPercentage: 0,
      taxPercentage: 0,
    });
    expect(r.paintBuckets).toBe(1); // 20 L exactly fills one 20 L bucket
    expect(r.materialCost).toBe(26000);
    expect(r.grandTotal).toBe(31000); // 26,000 material + 5,000 transport, nothing else
  });
});

// ─────────────────────────────────────────────────────────
// Screeding mix (coverage-rate model)
// ─────────────────────────────────────────────────────────
describe("GOLDEN: screeding mix coverage model", () => {
  const config: ScreedingMixConfig = {
    paintCoverageRateM2PerL: 10,
    wastePercentage: 10,
    taxVatPercentage: 0,
    paintBucketSizeL: 20,
    paintPricePerBucket: 20000,
    cementConsumptionRatioKgPerL: 0.5,
    cementBagSizeKg: 40,
    cementPricePerBag: 6000,
    currency: "NGN",
    currencySymbol: "₦",
  };

  it("100 m²: litres scaled by waste once, then single tax", () => {
    // litres = 100/10 = 10 → ×1.1 = 11 L
    // buckets = ceil(11/20) = 1 → 20,000
    // cement = 11 × 0.5 = 5.5 kg → 1 bag → 6,000
    // material 26,000; tax 0 → grand 26,000
    const r = calculateScreedingMix(100, config);
    expect(r.paintRequiredLiters).toBe(11);
    expect(r.paintBucketsNeeded).toBe(1);
    expect(r.cementRequiredKg).toBeCloseTo(5.5, 3);
    expect(r.cementBagsNeeded).toBe(1);
    expect(r.materialCost).toBe(26000);
    expect(r.grandTotal).toBe(26000);
  });
});

// ─────────────────────────────────────────────────────────
// Pack sizing & line totals
// ─────────────────────────────────────────────────────────
describe("GOLDEN: pack rounding", () => {
  it("ceil: 22 L into 20 L buckets = 2 buckets = 40 L", () => {
    const r = roundPackQuantity(22, 20, "ceil");
    expect(r.pack_count).toBe(2);
    expect(r.practical_purchase_quantity).toBe(40);
    expect(r.leftover_quantity).toBe(18);
  });

  it("leftover never negative; exact fit leaves zero", () => {
    const r = roundPackQuantity(40, 20, "ceil");
    expect(r.pack_count).toBe(2);
    expect(r.leftover_quantity).toBe(0);
    expect(calculateLeftover(50, 40)).toBe(0);
  });

  it("line total = unit price × qty, rounded once", () => {
    expect(calculateLineTotal(4500, 3)).toBe(13500);
    expect(calculateLineTotal(333.34, 3)).toBe(1000.02); // rounded once at the end
  });
});

// ─────────────────────────────────────────────────────────
// Cross-cutting invariants
// ─────────────────────────────────────────────────────────
describe("GOLDEN: cross-cutting invariants", () => {
  it("grand total is never more than 2× a zero-config baseline for sane inputs", () => {
    // Sanity net: with all adjustments at 0 the total must equal raw costs.
    // With each adjustment at its default the total must be within a
    // hand-computable band — guarding against compounding factors.
    const base: AdvancedCalcInput = {
      netArea: 50,
      wastePercentage: 0,
      coats: 1,
      thickness: 10,
      paintCoverageRateM2PerL: 10,
      paintBucketSizeL: 20,
      paintPricePerBucket: 20000,
      cementRatioKgPerL: 0.5,
      cementBagSizeKg: 40,
      cementPricePerBag: 6000,
      labourCost: 0,
      transportCost: 0,
      markupPercentage: 0,
      profitPercentage: 0,
      taxPercentage: 0,
      currency: "NGN",
      currencySymbol: "₦",
    };
    const zero = calculateAdvancedEstimate(base);
    // Same job with every factor at a modest 10%:
    // paint 1 bucket either way; the invariant is that the taxed total
    // stays under 1.4× the raw baseline.
    const boosted = calculateAdvancedEstimate({
      ...base,
      wastePercentage: 10,
      markupPercentage: 10,
      profitPercentage: 10,
      taxPercentage: 10,
    });
    expect(boosted.grandTotal).toBeLessThan(zero.grandTotal * 1.4);
    expect(boosted.grandTotal).toBeGreaterThan(zero.grandTotal);
  });
});
