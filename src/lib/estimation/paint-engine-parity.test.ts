/**
 * CROSS-ENGINE PARITY + UNIT REGRESSION TESTS (audit finding fixes)
 *
 * The audit found two genuine defects in painting-engine.ts:
 *  1. UNIT BUG: quality.coverage_unit was ignored — the raw configured value
 *     was treated as m²/L (a "m² per bucket" config would be wrong by ~20×
 *     here while the central paint-engine handled it correctly).
 *  2. CEILING DIVERGENCE: configured ceiling coverage (quality.ceiling_coverage
 *     or the ceiling_coverage_rate rule) was ignored — the per-room 0.5-bucket
 *     rule was always used, so the two calculators disagreed for the same room.
 *
 * These tests lock in the fixes: independent reference numbers computed from
 * first principles, plus strict parity between the two engines.
 *
 * Test data only — no invented business values; coverage/price are mock config.
 */
import { describe, it, expect } from "vitest";
import {
  calculateRoom as centralRoom,
  type PaintEngineConfig,
} from "./paint-engine";
import { calculateRoom as paintingRoom } from "./painting-engine";
import type {
  EstimationProduct,
  EstimationProductQuality,
  EstimationPrice,
  EstimationCalcRule,
  EstimationColourCondition,
  EstimationSurfaceCondition,
} from "@/types/estimation";

const product: EstimationProduct = {
  id: "p1",
  name: "Emulsion",
  slug: "emulsion",
  category: "emulsion",
  description: null,
  product_type: "paint",
  calculation_method: "room_based",
  standard_pack_size: 20,
  pack_unit_id: null,
  recommended_surface: null,
  finish: null,
  texture: null,
  gloss_level: null,
  durability: null,
  colour_compatibility: null,
  paint_compatibility: null,
  has_quality_levels: true,
  is_active: true,
  sort_order: 1,
  created_at: "",
  updated_at: "",
};

const price: EstimationPrice = {
  id: "pr1",
  price_type: "quality",
  ref_id: "q1",
  price: 25000,
  currency: "NGN",
  pack_size_id: null,
  effective_date: "2026-01-01",
  notes: null,
  is_active: true,
  created_at: "",
  updated_at: "",
};

const colourConditions: EstimationColourCondition[] = [
  {
    id: "cc1",
    condition_key: "new_unpainted",
    name: "New / Unpainted",
    description: null,
    requires_warning: false,
    min_coats_override: null,
    is_active: true,
    sort_order: 1,
    created_at: "",
    updated_at: "",
  },
];

const surfaceConditions: EstimationSurfaceCondition[] = [
  {
    id: "sc1",
    condition_key: "new_plastered",
    name: "New / Plastered",
    description: null,
    requires_preparation: false,
    primer_recommended: false,
    coverage_adjustment_factor: null,
    is_active: true,
    sort_order: 1,
    created_at: "",
    updated_at: "",
  },
];

const mkRule = (
  id: string,
  rule_key: string,
  rule_value: Record<string, unknown>,
): EstimationCalcRule => ({
  id,
  rule_key,
  calculator_type: "painting",
  rule_value,
  rule_status: "verified_frelux",
  description: "",
  is_active: true,
  created_at: "",
  updated_at: "",
});

const ceilingQtyRule = mkRule("r1", "ceiling_quantity_per_room", {
  buckets: 0.5,
});
const packSizeRule = mkRule("r2", "pack_size_bucket_litres", { litres: 20 });
const roundingRule = mkRule("r3", "purchase_rounding_rule", { rule: "ceil" });
const stdHeightRule = mkRule("r4", "standard_room_height", {
  value_ft: 8,
  value_m: 2.4384,
});
const openingRule = mkRule("r5", "opening_deduction_rule", {
  deduction_percentage: 100,
});
const ceilingCoverageRule = mkRule("r6", "ceiling_coverage_rate", {
  enabled: true,
  m2_per_liter: 9,
});

const mkQuality = (
  over: Partial<EstimationProductQuality> = {},
): EstimationProductQuality => ({
  id: "q1",
  product_id: "p1",
  name: "Standard",
  slug: "standard",
  description: null,
  coverage: 10,
  coverage_unit: "m2_per_liter",
  ceiling_coverage: null,
  ceiling_coverage_unit: null,
  finish: null,
  texture: null,
  gloss_level: null,
  shine_level: null,
  durability: null,
  is_active: true,
  sort_order: 1,
  created_at: "",
  updated_at: "",
  ...over,
});

// Central-engine room input (same physical room as painting-engine input)
const centralInput = {
  room_id: "room-1",
  room_name: "Parity Room",
  length: 10,
  width: 12,
  height: 8,
  unit: "feet" as const,
  doors: [{ quantity: 1, width: 3, height: 7 }],
  windows: [{ quantity: 1, width: 4, height: 4 }],
  doors_unknown: false,
  windows_unknown: false,
  product_id: "p1",
  quality_id: "q1",
  coats: 2,
  include_ceiling: false,
  ceiling_colour: "white",
  surface_condition_key: "new_plastered",
  colour_condition_key: "new_unpainted",
  include_primer: false,
};

const paintingInput = {
  room_id: "room-1",
  room_name: "Parity Room",
  length: 10,
  breadth: 12,
  height: 8,
  unit: "feet" as const,
  doors: [{ quantity: 1, width: 3, height: 7 }],
  windows: [{ quantity: 1, width: 4, height: 4 }],
  doors_unknown: false,
  windows_unknown: false,
  product_id: "p1",
  quality_id: "q1",
  colour_condition_key: "new_unpainted",
  surface_condition_key: "new_plastered",
  coats: 2,
  include_ceiling: false,
  ceiling_colour: "white",
};

const mkCentralConfig = (
  over: Partial<PaintEngineConfig> = {},
): PaintEngineConfig => ({
  product,
  quality: mkQuality(),
  price,
  primer_price: null,
  ceilingRule: ceilingQtyRule,
  ceilingCoverageRule: null,
  packSizeRule,
  roundingRule,
  standardHeightRule: stdHeightRule,
  heightAdjustmentRule: null,
  openingDeductionRule: openingRule,
  coatCountRule: null,
  calibrationReferencesRule: null,
  colourConditions,
  surfaceConditions,
  calcVersionId: "ver-1",
  ...over,
});

const mkPaintingConfig = (over: Record<string, unknown> = {}) => ({
  product,
  quality: mkQuality(),
  price,
  ceilingRule: ceilingQtyRule,
  packSizeRule,
  roundingRule,
  colourConditions,
  surfaceConditions,
  standardHeightRule: stdHeightRule,
  heightAdjustmentRule: null,
  openingDeductionRule: openingRule,
  ...over,
});

describe("AUDIT FIX 1: painting-engine honors coverage_unit", () => {
  it("m2_per_bucket coverage (100 m² per 20-L bucket = 5 m²/L) is normalized — independent reference", () => {
    // Independent: L=3.048, B=3.6576, H=2.4384 m → perimeter 13.4112 m
    // gross = 32.70 m²; door 3×7 ft = 1.95 m²; window 4×4 ft = 1.49 m²
    // net = 29.26 m²; litres = 29.26 × 2 / 5 = 11.70 L
    const result = paintingRoom(
      paintingInput,
      mkPaintingConfig({
        quality: mkQuality({ coverage: 100, coverage_unit: "m2_per_bucket" }),
      }),
    );
    expect(result.theoretical_wall_litres).toBeCloseTo(11.7, 1);
    expect(result.coverage_m2_per_liter).toBeCloseTo(5, 6);
    expect(result.practical_wall_buckets).toBe(1); // 11.70/20 = 0.585 → ceil = 1
  });

  it("ft2_per_liter coverage is normalized (100 ft²/L = 9.29 m²/L)", () => {
    const result = paintingRoom(
      paintingInput,
      mkPaintingConfig({
        quality: mkQuality({ coverage: 100, coverage_unit: "ft2_per_liter" }),
      }),
    );
    // net 29.26 m² × 2 / 9.290304 = 6.30 L
    expect(result.theoretical_wall_litres).toBeCloseTo(6.3, 1);
    expect(result.coverage_m2_per_liter).toBeCloseTo(9.290304, 4);
  });

  it("m2_per_liter coverage is unchanged (no behavior change for the default unit)", () => {
    const result = paintingRoom(paintingInput, mkPaintingConfig());
    expect(result.theoretical_wall_litres).toBeCloseTo(5.85, 2); // 29.26 × 2 / 10
  });
});

describe("AUDIT FIX 2: painting-engine honors configured ceiling coverage", () => {
  it("quality ceiling_coverage (8 m²/L) is used, not the per-room rule — independent reference", () => {
    // Ceiling area = 3.048 × 3.6576 = 11.1487 m²; litres = 11.1487 × 2 / 8 = 2.79
    const result = paintingRoom(
      { ...paintingInput, include_ceiling: true },
      mkPaintingConfig({ quality: mkQuality({ ceiling_coverage: 8 }) }),
    );
    expect(result.theoretical_ceiling_litres).toBeCloseTo(2.79, 2);
    expect(result.theoretical_ceiling_buckets).toBeCloseTo(2.79 / 20, 4);
    expect(result.practical_ceiling_buckets).toBe(1);
  });

  it("ceiling_coverage_rate rule (9 m²/L) is used when quality ceiling coverage is absent", () => {
    // 11.1487 × 2 / 9 = 2.48 L
    const result = paintingRoom(
      { ...paintingInput, include_ceiling: true },
      mkPaintingConfig({ ceilingCoverageRule }),
    );
    expect(result.theoretical_ceiling_litres).toBeCloseTo(2.48, 2);
  });

  it("per-room 0.5-bucket rule still applies when no ceiling coverage is configured", () => {
    const result = paintingRoom(
      { ...paintingInput, include_ceiling: true },
      mkPaintingConfig(),
    );
    expect(result.theoretical_ceiling_buckets).toBe(0.5);
    expect(result.theoretical_ceiling_litres).toBe(10);
    expect(result.practical_ceiling_buckets).toBe(1);
  });
});

describe("CROSS-ENGINE PARITY: central paint-engine vs painting-engine", () => {
  const sameRoomCases = [
    {
      name: "m²/L coverage, no ceiling",
      quality: mkQuality(),
      include_ceiling: false,
    },
    {
      name: "m²/L coverage, per-room ceiling",
      quality: mkQuality(),
      include_ceiling: true,
    },
    {
      name: "m² per bucket coverage (previously divergent), no ceiling",
      quality: mkQuality({ coverage: 100, coverage_unit: "m2_per_bucket" }),
      include_ceiling: false,
    },
    {
      name: "quality ceiling coverage configured (previously divergent)",
      quality: mkQuality({ ceiling_coverage: 8 }),
      include_ceiling: true,
    },
    {
      name: "ceiling_coverage_rate rule (previously divergent)",
      quality: mkQuality(),
      include_ceiling: true,
      useCeilRule: true,
    },
  ];

  for (const tc of sameRoomCases) {
    it(`${tc.name}: identical net area, theoretical litres and practical buckets`, () => {
      const central = centralRoom(
        { ...centralInput, include_ceiling: tc.include_ceiling },
        mkCentralConfig({
          quality: tc.quality,
          ceilingCoverageRule: tc.useCeilRule ? ceilingCoverageRule : null,
        }),
      );
      const painting = paintingRoom(
        { ...paintingInput, include_ceiling: tc.include_ceiling },
        mkPaintingConfig({
          quality: tc.quality,
          ...(tc.useCeilRule ? { ceilingCoverageRule } : {}),
        }),
      );
      expect(painting.net_wall_area_m2).toBeCloseTo(
        central.net_wall_area_m2,
        2,
      );
      expect(painting.theoretical_wall_litres).toBeCloseTo(
        central.theoretical_wall_litres,
        2,
      );
      expect(painting.theoretical_ceiling_litres).toBeCloseTo(
        central.theoretical_ceiling_litres,
        2,
      );
      expect(painting.theoretical_total_litres).toBeCloseTo(
        central.theoretical_total_litres,
        2,
      );
      expect(painting.theoretical_total_buckets).toBeCloseTo(
        central.theoretical_total_buckets,
        4,
      );
      expect(painting.practical_total_buckets).toBe(
        central.practical_total_buckets,
      );
      // painting-engine stores buckets (litres = buckets × pack size)
      expect(
        painting.practical_total_buckets * painting.pack_size_litres,
      ).toBeCloseTo(central.practical_total_litres, 2);
    });
  }
});
