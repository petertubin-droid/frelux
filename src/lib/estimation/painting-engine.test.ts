/**
 * FRELUX Painting Estimator — Comprehensive Tests
 *
 * Tests verify calculation outputs against established FRELUX rules.
 * Tests do NOT invent coverage values or prices — they use configured test data.
 *
 * Verification Tests (per spec section 28):
 * TEST 1: 10×12 ft room, 8ft, 2 coats → approximately 1 bucket
 * TEST 2: 12×12 ft room, 8ft, 2 coats → approximately 1.2 theoretical buckets (with ceiling)
 * TEST 3: 9ft height → high-height rule triggered
 * TEST 4: Multiple rooms → independent calculation + aggregation
 * TEST 5: Quality change Standard → Premium → coverage changes
 * TEST 6: Price change → new estimate uses new price, old retains snapshot
 * TEST 7: Labour is never calculated
 * TEST 8: Customer never required to enter m²
 */

import { describe, it, expect } from 'vitest';
import {
  calculateWallArea,
  calculateOpeningArea,
  calculateCeilingArea,
  calculateTheoreticalLitres,
  litresToBuckets,
  getCeilingQuantityBuckets,
  getPackSizeLitres,
  getRoundingRule,
  getStandardHeight,
  evaluateHeightAdjustment,
  getOpeningDeductionRule,
  validateRoomInput,
  calculateRoom,
  checkProductionEligibility,
  calculatePaintingProject,
  CALCULATOR_TYPE,
  type PaintingRoomInput,
  type ProductionRuleRow,
} from './painting-engine';
import type {
  EstimationProduct,
  EstimationProductQuality,
  EstimationPrice,
  EstimationCalcRule,
  EstimationColourCondition,
  EstimationSurfaceCondition,
} from '@/types/estimation';

// =========================================================
// Mock configuration data
// =========================================================

const mockProduct: EstimationProduct = {
  id: 'prod-emulsion', name: 'FRELUX Emulsion', slug: 'emulsion',
  category: 'emulsion', description: null, product_type: 'paint',
  calculation_method: 'room_based', standard_pack_size: 20, pack_unit_id: null,
  recommended_surface: null, finish: null, texture: null, gloss_level: null,
  durability: null, colour_compatibility: null, paint_compatibility: null,
  has_quality_levels: true, is_active: true, sort_order: 1, created_at: '', updated_at: '',
};

const mockQualityStandard: EstimationProductQuality = {
  id: 'qual-emulsion-std', product_id: 'prod-emulsion', name: 'Standard', slug: 'standard',
  description: null, coverage: 10, coverage_unit: 'm2_per_liter', ceiling_coverage: null, ceiling_coverage_unit: null, finish: null, texture: null,
  gloss_level: null, shine_level: null, durability: null, is_active: true, sort_order: 1, created_at: '', updated_at: '',
};

const mockQualityPremium: EstimationProductQuality = {
  ...mockQualityStandard, id: 'qual-emulsion-prem', name: 'Premium', slug: 'premium', coverage: 12, sort_order: 2,
};

const mockQualityHigh: EstimationProductQuality = {
  ...mockQualityStandard, id: 'qual-emulsion-hq', name: 'High Quality', slug: 'high_quality', coverage: 15, sort_order: 3,
};

const mockPrice: EstimationPrice = {
  id: 'price-1', price_type: 'quality', ref_id: 'qual-emulsion-std', price: 25000,
  currency: 'NGN', pack_size_id: null, effective_date: '2026-08-20', notes: null,
  is_active: true, created_at: '', updated_at: '',
};

const mockCeilingRule: EstimationCalcRule = {
  id: 'r1', rule_key: 'ceiling_quantity_per_room', calculator_type: 'painting',
  rule_value: { buckets: 0.5 }, rule_status: 'verified_frelux', description: '', is_active: true, created_at: '', updated_at: '',
};

const mockPackSizeRule: EstimationCalcRule = {
  id: 'r2', rule_key: 'pack_size_bucket_litres', calculator_type: 'painting',
  rule_value: { litres: 20 }, rule_status: 'verified_frelux', description: '', is_active: true, created_at: '', updated_at: '',
};

const mockRoundingRule: EstimationCalcRule = {
  id: 'r3', rule_key: 'purchase_rounding_rule', calculator_type: 'painting',
  rule_value: { rule: 'ceil' }, rule_status: 'verified_frelux', description: '', is_active: true, created_at: '', updated_at: '',
};

const mockStandardHeightRule: EstimationCalcRule = {
  id: 'r4', rule_key: 'standard_room_height', calculator_type: 'painting',
  rule_value: { value_ft: 8, value_m: 2.4384 }, rule_status: 'verified_frelux', description: '', is_active: true, created_at: '', updated_at: '',
};

const mockHeightAdjustmentRule: EstimationCalcRule = {
  id: 'r5', rule_key: 'height_adjustment_rule', calculator_type: 'painting',
  rule_value: {
    enabled: true, standard_height_ft: 8, standard_height_m: 2.4384,
    warning_threshold_ft: 8, warning_threshold_m: 2.4384, adjustment_factor: 1.0,
    adjustment_type: 'warning_only',
    message: 'Wall height exceeds the FRELUX standard (7-8 ft). This is considered a high wall. Professional assessment recommended for non-standard heights.',
  },
  rule_status: 'verified_frelux', description: '', is_active: true, created_at: '', updated_at: '',
};

const mockOpeningDeductionRule: EstimationCalcRule = {
  id: 'r6', rule_key: 'opening_deduction_rule', calculator_type: 'painting',
  rule_value: { deduction_percentage: 100 }, rule_status: 'verified_frelux', description: '', is_active: true, created_at: '', updated_at: '',
};

const mockColourConditions: EstimationColourCondition[] = [
  { id: 'cc1', condition_key: 'new_unpainted', name: 'New / Unpainted', description: null, requires_warning: false, min_coats_override: null, is_active: true, sort_order: 1, created_at: '', updated_at: '' },
  { id: 'cc2', condition_key: 'light', name: 'Light Colour', description: null, requires_warning: false, min_coats_override: null, is_active: true, sort_order: 2, created_at: '', updated_at: '' },
  { id: 'cc3', condition_key: 'dark_strong', name: 'Dark / Strong Colour', description: null, requires_warning: true, min_coats_override: 3, is_active: true, sort_order: 4, created_at: '', updated_at: '' },
  { id: 'cc4', condition_key: 'significant_transition', name: 'Significant Colour Transition', description: null, requires_warning: true, min_coats_override: 3, is_active: true, sort_order: 7, created_at: '', updated_at: '' },
];

const mockSurfaceConditions: EstimationSurfaceCondition[] = [
  { id: 'sc1', condition_key: 'new_plastered', name: 'New / Plastered', description: null, requires_preparation: false, primer_recommended: false, coverage_adjustment_factor: null, is_active: true, sort_order: 1, created_at: '', updated_at: '' },
  { id: 'sc2', condition_key: 'previously_painted_sound', name: 'Previously Painted (Sound)', description: null, requires_preparation: false, primer_recommended: false, coverage_adjustment_factor: 1.0, is_active: true, sort_order: 2, created_at: '', updated_at: '' },
  { id: 'sc3', condition_key: 'peeling_flaking', name: 'Peeling / Flaking', description: null, requires_preparation: true, primer_recommended: true, coverage_adjustment_factor: 0.85, is_active: true, sort_order: 3, created_at: '', updated_at: '' },
];

const mockProductionRules: ProductionRuleRow[] = [
  { product_category: 'emulsion', quality_slug: null, location_rule: 'owerri', min_quantity: 0, is_active: true },
  { product_category: 'emulsion', quality_slug: null, location_rule: 'outside_owerri', min_quantity: 15, is_active: true },
  { product_category: 'matt', quality_slug: null, location_rule: 'outside_owerri', min_quantity: 15, is_active: true },
  { product_category: 'satin', quality_slug: 'high_quality', location_rule: 'outside_owerri', min_quantity: 5, is_active: true },
  { product_category: 'satin', quality_slug: null, location_rule: 'outside_owerri', min_quantity: 10, is_active: true },
];

function makeRoom(overrides: Partial<PaintingRoomInput> = {}): PaintingRoomInput {
  return {
    room_id: 'room-1', room_name: 'Test Room', length: 10, breadth: 12, height: 8,
    unit: 'feet',
    doors: [{ quantity: 1, width: 3, height: 7 }],
    windows: [{ quantity: 1, width: 4, height: 4 }],
    doors_unknown: false, windows_unknown: false,
    product_id: 'prod-emulsion', quality_id: 'qual-emulsion-std',
    colour_condition_key: 'new_unpainted', surface_condition_key: 'new_plastered',
    coats: 2, include_ceiling: false, ceiling_colour: 'white',
    ...overrides,
  };
}

function makeRoomConfig(overrides: Partial<{
  product: EstimationProduct | null; quality: EstimationProductQuality | null; price: EstimationPrice | null;
}> = {}) {
  return {
    product: overrides.product ?? mockProduct,
    quality: overrides.quality ?? mockQualityStandard,
    price: overrides.price ?? mockPrice,
    ceilingRule: mockCeilingRule, packSizeRule: mockPackSizeRule, roundingRule: mockRoundingRule,
    colourConditions: mockColourConditions, surfaceConditions: mockSurfaceConditions,
    standardHeightRule: mockStandardHeightRule, heightAdjustmentRule: mockHeightAdjustmentRule,
    openingDeductionRule: mockOpeningDeductionRule,
  };
}

function makeProjectConfig(overrides: Partial<{
  products: EstimationProduct[];
  qualities: Map<string, EstimationProductQuality[]>;
  prices: Map<string, EstimationPrice>;
}> = {}) {
  return {
    products: overrides.products ?? [mockProduct],
    qualities: overrides.qualities ?? new Map([['prod-emulsion', [mockQualityStandard, mockQualityPremium, mockQualityHigh]]]),
    prices: overrides.prices ?? new Map([['qual-emulsion-std', mockPrice]]),
    calcRules: new Map([
      ['ceiling_quantity_per_room', mockCeilingRule],
      ['pack_size_bucket_litres', mockPackSizeRule],
      ['purchase_rounding_rule', mockRoundingRule],
      ['standard_room_height', mockStandardHeightRule],
      ['height_adjustment_rule', mockHeightAdjustmentRule],
      ['opening_deduction_rule', mockOpeningDeductionRule],
    ]),
    colourConditions: mockColourConditions,
    surfaceConditions: mockSurfaceConditions,
    productionRules: mockProductionRules,
    calcVersionId: 'ver-1',
  };
}

// =========================================================
// Tests
// =========================================================

describe('FRELUX Painting Estimator', () => {

  // ── Area Calculations ──
  describe('Area Calculations', () => {
    it('calculates wall area for 10×12×8 ft room', () => {
      const wall = calculateWallArea(3.048, 3.658, 2.438);
      expect(wall).toBeGreaterThan(32);
      expect(wall).toBeLessThan(33);
    });

    it('calculates opening area for multiple doors', () => {
      const area = calculateOpeningArea([{ quantity: 1, width: 3, height: 7 }, { quantity: 2, width: 2.5, height: 6.5 }], 'feet');
      expect(area).toBeGreaterThan(4.9);
      expect(area).toBeLessThan(5.0);
    });

    it('calculates ceiling area', () => {
      expect(calculateCeilingArea(3.048, 3.658)).toBeGreaterThan(11.1);
      expect(calculateCeilingArea(3.048, 3.658)).toBeLessThan(11.2);
    });
  });

  // ── Theoretical Quantity ──
  describe('Theoretical Quantity', () => {
    it('calculates litres from area, coats, coverage', () => {
      expect(calculateTheoreticalLitres(30, 2, 10)).toBe(6);
    });
    it('returns 0 when coverage is 0', () => {
      expect(calculateTheoreticalLitres(30, 2, 0)).toBe(0);
    });
    it('converts litres to buckets', () => {
      expect(litresToBuckets(20, 20)).toBe(1);
      expect(litresToBuckets(40, 20)).toBe(2);
    });
  });

  // ── Ceiling Rule ──
  describe('Ceiling Rule', () => {
    it('returns 0.5 bucket per room', () => {
      expect(getCeilingQuantityBuckets(mockCeilingRule)).toBe(0.5);
    });
    it('falls back to 0.5 when null', () => {
      expect(getCeilingQuantityBuckets(null)).toBe(0.5);
    });
  });

  // ── Pack Size & Rounding ──
  describe('Pack Size & Rounding', () => {
    it('gets pack size from product', () => {
      expect(getPackSizeLitres(mockProduct, mockPackSizeRule)).toBe(20);
    });
    it('gets rounding rule', () => {
      expect(getRoundingRule(mockRoundingRule)).toBe('ceil');
    });
    it('defaults to ceil', () => {
      expect(getRoundingRule(null)).toBe('ceil');
    });
  });

  // ── Opening Deduction ──
  describe('Opening Deduction', () => {
    it('defaults to 100% deduction', () => {
      expect(getOpeningDeductionRule(null)).toBe(100);
    });
    it('reads configured percentage', () => {
      expect(getOpeningDeductionRule(mockOpeningDeductionRule)).toBe(100);
    });
    it('respects 50% deduction', () => {
      const halfRule: EstimationCalcRule = {
        ...mockOpeningDeductionRule, rule_value: { deduction_percentage: 50 },
      };
      expect(getOpeningDeductionRule(halfRule)).toBe(50);
    });
    it('deducts openings in room calculation', () => {
      const room = makeRoom();
      const result = calculateRoom(room, makeRoomConfig());
      expect(result.opening_deduction).not.toBeNull();
      expect(result.opening_deduction!.deduction_percentage).toBe(100);
      expect(result.opening_deduction!.total_opening_area_m2).toBeGreaterThan(0);
      expect(result.net_wall_area_m2).toBeLessThan(result.gross_wall_area_m2);
    });
  });

  // ── Height Adjustment ──
  describe('Height Adjustment', () => {
    it('gets standard height from rule', () => {
      const h = getStandardHeight(mockStandardHeightRule);
      expect(h.ft).toBe(8);
      expect(h.m).toBeCloseTo(2.4384, 3);
    });
    it('falls back to 8 ft', () => {
      expect(getStandardHeight(null).ft).toBe(8);
    });
    it('does NOT flag 7 ft', () => {
      expect(evaluateHeightAdjustment(2.1336, 'feet', 7, mockHeightAdjustmentRule, getStandardHeight(mockStandardHeightRule))).toBeNull();
    });
    it('does NOT flag 8 ft', () => {
      expect(evaluateHeightAdjustment(2.4384, 'feet', 8, mockHeightAdjustmentRule, getStandardHeight(mockStandardHeightRule))).toBeNull();
    });
    it('flags 9 ft as too high', () => {
      const adj = evaluateHeightAdjustment(2.7432, 'feet', 9, mockHeightAdjustmentRule, getStandardHeight(mockStandardHeightRule));
      expect(adj).not.toBeNull();
      expect(adj!.is_high).toBe(true);
      expect(adj!.message).toContain('FRELUX standard');
    });
    it('returns null when disabled', () => {
      const disabled: EstimationCalcRule = { ...mockHeightAdjustmentRule, rule_value: { ...mockHeightAdjustmentRule.rule_value, enabled: false } };
      expect(evaluateHeightAdjustment(2.7432, 'feet', 9, disabled, getStandardHeight(mockStandardHeightRule))).toBeNull();
    });
  });

  // ── Quality / Coverage ──
  describe('Quality & Coverage', () => {
    it('Standard > Premium > High Quality = decreasing litres (better coverage)', () => {
      const room = makeRoom();
      const std = calculateRoom(room, makeRoomConfig({ quality: mockQualityStandard }));
      const prem = calculateRoom(room, makeRoomConfig({ quality: mockQualityPremium }));
      const hq = calculateRoom(room, makeRoomConfig({ quality: mockQualityHigh }));
      expect(std.theoretical_wall_litres).toBeGreaterThan(prem.theoretical_wall_litres);
      expect(prem.theoretical_wall_litres).toBeGreaterThan(hq.theoretical_wall_litres);
    });
  });

  // ── Validation ──
  describe('Validation', () => {
    it('rejects zero dimensions', () => {
      expect(validateRoomInput(makeRoom({ length: 0 }), mockProduct, mockQualityStandard).valid).toBe(false);
    });
    it('rejects negative dimensions', () => {
      expect(validateRoomInput(makeRoom({ height: -1 }), mockProduct, mockQualityStandard).valid).toBe(false);
    });
    it('rejects inactive product', () => {
      expect(validateRoomInput(makeRoom(), { ...mockProduct, is_active: false }, mockQualityStandard).valid).toBe(false);
    });
    it('rejects zero coats', () => {
      expect(validateRoomInput(makeRoom({ coats: 0 }), mockProduct, mockQualityStandard).valid).toBe(false);
    });
    it('warns when openings unknown', () => {
      const r = validateRoomInput(makeRoom({ doors_unknown: true, windows_unknown: true }), mockProduct, mockQualityStandard);
      expect(r.warnings.some((w) => w.includes('not provided'))).toBe(true);
    });
    it('reports error for missing coverage', () => {
      const result = calculateRoom(makeRoom(), makeRoomConfig({ quality: { ...mockQualityStandard, coverage: null } }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Coverage has not been configured'))).toBe(true);
    });
  });

  // ── Colour / Surface Conditions ──
  describe('Colour & Surface Conditions', () => {
    it('warns on dark/strong colour, no auto adjustment', () => {
      const result = calculateRoom(makeRoom({ colour_condition_key: 'dark_strong' }), makeRoomConfig());
      expect(result.warnings.some((w) => w.includes('Strong colour transition'))).toBe(true);
      const expected = calculateTheoreticalLitres(result.net_wall_area_m2, result.coats, result.coverage_m2_per_liter!);
      expect(result.theoretical_wall_litres).toBe(expected);
    });
    it('warns on peeling surface, recommends primer', () => {
      const result = calculateRoom(makeRoom({ surface_condition_key: 'peeling_flaking' }), makeRoomConfig());
      expect(result.warnings.some((w) => w.includes('Peeling'))).toBe(true);
      expect(result.primer_recommended).toBe(true);
    });
    it('primer not recommended for new plastered', () => {
      const result = calculateRoom(makeRoom({ surface_condition_key: 'new_plastered' }), makeRoomConfig());
      expect(result.primer_recommended).toBe(false);
    });
  });

  // ── Calculation Transparency ──
  describe('Calculation Transparency', () => {
    it('produces steps for all stages', () => {
      const result = calculateRoom(makeRoom({ include_ceiling: true }), makeRoomConfig());
      const labels = result.calculation_steps.map((s) => s.label);
      expect(labels).toContain('Room Dimensions');
      expect(labels).toContain('Wall Geometry');
      expect(labels).toContain('Ceiling');
      expect(labels).toContain('Net Wall Area');
      expect(labels).toContain('Height Rule');
      expect(labels).toContain('Surface Condition');
      expect(labels).toContain('Colour Condition');
      expect(labels).toContain('Paint Type');
      expect(labels).toContain('Paint Quality & Coverage');
      expect(labels).toContain('Coats');
      expect(labels).toContain('Theoretical Wall Requirement');
      expect(labels).toContain('Total Theoretical Quantity');
      expect(labels).toContain('Practical Purchase Quantity');
    });
  });

  // ── Customer Summary ──
  describe('Customer Summary', () => {
    it('produces customer-facing summary in painter language', () => {
      const result = calculateRoom(makeRoom({ room_name: 'Living Room', include_ceiling: true }), makeRoomConfig());
      const cs = result.customer_summary;
      expect(cs.room_name).toBe('Living Room');
      expect(cs.room_size).toContain('10');
      expect(cs.room_size).toContain('12');
      expect(cs.wall_height).toContain('8');
      expect(cs.paint).toContain('Emulsion');
      expect(cs.coats).toBe('2');
      expect(cs.ceiling).toBe('Included');
      expect(cs.doors).toBe('1');
      expect(cs.windows).toBe('1');
      expect(cs.calculated_requirement).toContain('bucket');
      expect(cs.practical_purchase).toContain('bucket');
    });
  });

  // ── Calculator Type ──
  describe('Calculator Type', () => {
    it('uses "painting"', () => { expect(CALCULATOR_TYPE).toBe('painting'); });
  });

  // ═══════════════════════════════════════════════════════
  // VERIFICATION TESTS (per spec section 28)
  // ═══════════════════════════════════════════════════════

  // ── TEST 1: 10×12 ft, 8ft, 2 coats, walls only ──
  describe('TEST 1: 10×12 ft room, 8ft, 2 coats, walls only', () => {
    it('produces approximately 1 practical bucket', () => {
      const result = calculateRoom(makeRoom({
        length: 10, breadth: 12, height: 8, include_ceiling: false, coats: 2,
      }), makeRoomConfig());

      expect(result.valid).toBe(true);
      expect(result.include_ceiling).toBe(false);
      expect(result.theoretical_wall_litres).toBeGreaterThan(0);
      expect(result.theoretical_ceiling_litres).toBe(0);
      expect(result.practical_total_buckets).toBeGreaterThanOrEqual(1);
      expect(result.practical_total_buckets).toBe(result.practical_wall_buckets);
      expect(result.height_adjustment).toBeNull();
    });
  });

  // ── TEST 2: 12×12 ft, 8ft, 2 coats, ceiling included ──
  describe('TEST 2: 12×12 ft room, 8ft, 2 coats, ceiling included', () => {
    it('calculates wall + ceiling with theoretical and practical buckets', () => {
      const result = calculateRoom(makeRoom({
        length: 12, breadth: 12, height: 8, include_ceiling: true, coats: 2,
      }), makeRoomConfig());

      expect(result.valid).toBe(true);
      expect(result.theoretical_ceiling_buckets).toBe(0.5);
      expect(result.theoretical_ceiling_litres).toBe(10);
      expect(result.theoretical_total_buckets).toBe(result.theoretical_wall_buckets + 0.5);
      expect(result.practical_total_buckets).toBeGreaterThanOrEqual(result.theoretical_total_buckets);
      expect(result.practical_total_buckets).toBeGreaterThanOrEqual(2);
    });
  });

  // ── TEST 3: 9ft height triggers high-height rule ──
  describe('TEST 3: 9 ft height triggers high-height rule', () => {
    it('flags 9 ft as too high with warning', () => {
      const result = calculateRoom(makeRoom({ height: 9 }), makeRoomConfig());

      expect(result.height_adjustment).not.toBeNull();
      expect(result.height_adjustment!.is_high).toBe(true);
      expect(result.height_adjustment!.actual_height_m).toBeCloseTo(2.7432, 3);
      expect(result.warnings.some((w) => w.includes('FRELUX standard'))).toBe(true);

      const stepLabels = result.calculation_steps.map((s) => s.label);
      expect(stepLabels).toContain('Height Rule');
    });

    it('does NOT flag 8 ft', () => {
      const result = calculateRoom(makeRoom({ height: 8 }), makeRoomConfig());
      expect(result.height_adjustment).toBeNull();
    });
  });

  // ── TEST 4: Multiple rooms calculated independently and aggregated ──
  describe('TEST 4: Multi-room project', () => {
    it('calculates each room independently and aggregates', () => {
      const rooms: PaintingRoomInput[] = [
        makeRoom({ room_id: 'r1', room_name: 'Living Room', length: 12, breadth: 14, height: 8 }),
        makeRoom({ room_id: 'r2', room_name: 'Bedroom 1', length: 10, breadth: 12, height: 8 }),
        makeRoom({ room_id: 'r3', room_name: 'Bedroom 2', length: 10, breadth: 10, height: 8 }),
      ];

      const result = calculatePaintingProject({
        rooms, currency: 'NGN', user_id: null, client_hash: null,
        project_description: '3-room project', customer_location: 'owerri', add_primer: false,
      }, makeProjectConfig());

      expect(result.rooms).toHaveLength(3);
      expect(result.rooms[0].room_name).toBe('Living Room');
      expect(result.rooms[1].room_name).toBe('Bedroom 1');
      expect(result.rooms[2].room_name).toBe('Bedroom 2');

      // Each room should have its own calculation
      expect(result.rooms[0].theoretical_wall_litres).not.toBe(result.rooms[1].theoretical_wall_litres);
      expect(result.rooms[1].theoretical_wall_litres).not.toBe(result.rooms[2].theoretical_wall_litres);

      // Combined totals
      expect(result.combined_practical_buckets).toBeGreaterThanOrEqual(3);
      expect(result.total_material_cost).toBeGreaterThan(0);

      // Breakdown should exist
      expect(result.breakdown.length).toBeGreaterThan(0);
      expect(result.breakdown[0].room_count).toBe(3);
    });
  });

  // ── TEST 5: Quality change Standard → Premium ──
  describe('TEST 5: Quality change affects coverage', () => {
    it('Premium requires fewer litres than Standard (better coverage)', () => {
      const room = makeRoom();

      const stdResult = calculateRoom(room, makeRoomConfig({ quality: mockQualityStandard }));
      const premResult = calculateRoom(room, makeRoomConfig({ quality: mockQualityPremium }));

      expect(premResult.theoretical_wall_litres).toBeLessThan(stdResult.theoretical_wall_litres);
      expect(premResult.coverage_m2_per_liter).toBeGreaterThan(stdResult.coverage_m2_per_liter!);
    });

    it('High Quality requires even fewer litres', () => {
      const room = makeRoom();
      const premResult = calculateRoom(room, makeRoomConfig({ quality: mockQualityPremium }));
      const hqResult = calculateRoom(room, makeRoomConfig({ quality: mockQualityHigh }));

      expect(hqResult.theoretical_wall_litres).toBeLessThan(premResult.theoretical_wall_litres);
    });
  });

  // ── TEST 6: Price change — new estimate uses new price, old retains snapshot ──
  describe('TEST 6: Price snapshot', () => {
    it('new estimate uses current active price', () => {
      const result = calculatePaintingProject({
        rooms: [makeRoom()], currency: 'NGN', user_id: null, client_hash: 'test',
        project_description: 'Test', customer_location: 'owerri', add_primer: false,
      }, makeProjectConfig());

      expect(result.total_material_cost).toBeGreaterThan(0);
      expect(result.line_items[0].unit_price).toBe(25000);

      // Price change
      const newPrice = { ...mockPrice, id: 'price-2', price: 30000 };
      const newResult = calculatePaintingProject({
        rooms: [makeRoom()], currency: 'NGN', user_id: null, client_hash: 'test',
        project_description: 'Test', customer_location: 'owerri', add_primer: false,
      }, makeProjectConfig({ prices: new Map([['qual-emulsion-std', newPrice]]) }));

      expect(newResult.line_items[0].unit_price).toBe(30000);
      expect(newResult.total_material_cost).toBeGreaterThan(result.total_material_cost);
    });
  });

  // ── TEST 7: Labour is never calculated ──
  describe('TEST 7: Labour exclusion', () => {
    it('labour note says "Not included — negotiated separately"', () => {
      const result = calculatePaintingProject({
        rooms: [makeRoom()], currency: 'NGN', user_id: null, client_hash: null,
        project_description: 'Test', customer_location: 'owerri', add_primer: false,
      }, makeProjectConfig());

      expect(result.labour_note).toContain('Not included');
      expect(result.labour_note).toContain('negotiated separately');
    });

    it('no labour line items in result', () => {
      const result = calculatePaintingProject({
        rooms: [makeRoom()], currency: 'NGN', user_id: null, client_hash: null,
        project_description: 'Test', customer_location: 'owerri', add_primer: false,
      }, makeProjectConfig());

      const labourItems = result.line_items.filter((i) => i.item_type === 'labour');
      expect(labourItems).toHaveLength(0);
    });

    it('customer summary does not mention labour cost', () => {
      const result = calculateRoom(makeRoom(), makeRoomConfig());
      expect(result.customer_summary.material_cost).not.toContain('labour');
      expect(result.customer_summary.material_cost).not.toContain('labor');
    });
  });

  // ── TEST 8: Customer never required to enter m² ──
  describe('TEST 8: No m² input required', () => {
    it('room input uses length, breadth, height — not m²', () => {
      const room = makeRoom();
      expect(room).toHaveProperty('length');
      expect(room).toHaveProperty('breadth');
      expect(room).toHaveProperty('height');
      expect(room).not.toHaveProperty('wall_area_m2');
      expect(room).not.toHaveProperty('area_m2');
    });

    it('customer summary shows room dimensions, not m² as primary', () => {
      const result = calculateRoom(makeRoom({ room_name: 'Living Room' }), makeRoomConfig());
      const cs = result.customer_summary;

      // Primary info is room size in feet
      expect(cs.room_size).toContain("feet");
      expect(cs.wall_height).toContain("feet");
      expect(cs.calculated_requirement).toContain('bucket');
      expect(cs.practical_purchase).toContain('bucket');

      // m² should NOT appear in customer-facing summary fields
      expect(cs.room_size).not.toContain('m²');
      expect(cs.calculated_requirement).not.toContain('m²');
    });

    it('calculation steps include room dimensions as first step', () => {
      const result = calculateRoom(makeRoom(), makeRoomConfig());
      expect(result.calculation_steps[0].label).toBe('Room Dimensions');
      expect(result.calculation_steps[0].value).toContain('10');
      expect(result.calculation_steps[0].value).toContain('12');
    });
  });

  // ── Production Rules ──
  describe('Production Rules', () => {
    it('Owerri: no minimum', () => {
      const e = checkProductionEligibility('owerri', 'emulsion', null, 1, mockProductionRules);
      expect(e.eligible).toBe(true);
      expect(e.min_required).toBe(0);
    });
    it('Outside Owerri below minimum: not eligible', () => {
      const e = checkProductionEligibility('outside_owerri', 'emulsion', null, 5, mockProductionRules);
      expect(e.eligible).toBe(false);
      expect(e.min_required).toBe(15);
    });
    it('Outside Owerri meeting minimum: eligible', () => {
      const e = checkProductionEligibility('outside_owerri', 'emulsion', null, 15, mockProductionRules);
      expect(e.eligible).toBe(true);
    });
  });

  // ── Multi-room with different paint types ──
  describe('Multi-room with different paint types', () => {
    it('each room can use different paint type/quality', () => {
      const mattProduct = { ...mockProduct, id: 'prod-matt', category: 'matt', name: 'FRELUX Matt' };
      const mattPrem = { ...mockQualityStandard, id: 'qual-matt-prem', product_id: 'prod-matt', name: 'Premium', coverage: 11 };

      const result = calculatePaintingProject({
        rooms: [
          makeRoom({ room_id: 'r1', product_id: 'prod-emulsion', quality_id: 'qual-emulsion-std' }),
          makeRoom({ room_id: 'r2', product_id: 'prod-matt', quality_id: 'qual-matt-prem', length: 12, breadth: 10 }),
        ],
        currency: 'NGN', user_id: null, client_hash: null,
        project_description: 'Two-room', customer_location: 'owerri', add_primer: false,
      }, makeProjectConfig({
        products: [mockProduct, mattProduct],
        qualities: new Map([['prod-emulsion', [mockQualityStandard]], ['prod-matt', [mattPrem]]]),
        prices: new Map([
          ['qual-emulsion-std', mockPrice],
          ['qual-matt-prem', { ...mockPrice, id: 'pm', ref_id: 'qual-matt-prem' }],
        ]),
      }));

      expect(result.rooms).toHaveLength(2);
      expect(result.rooms[0].product?.id).toBe('prod-emulsion');
      expect(result.rooms[1].product?.id).toBe('prod-matt');
      expect(result.breakdown.length).toBe(2);
    });
  });
});
