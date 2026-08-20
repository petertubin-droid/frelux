/**
 * FRELUX Phase 2 — Painting Estimator Tests
 *
 * Tests verify calculation outputs against established FRELUX rules.
 * Tests do NOT invent coverage values or prices — they use configured test data.
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
  validateRoomInput,
  calculateRoom,
  checkProductionEligibility,
  calculatePaintingProject,
  CALCULATOR_TYPE,
  type PaintingRoomInput,
  type PaintingProjectInput,
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
// Test Helpers — mock configuration data
// =========================================================

const mockProduct: EstimationProduct = {
  id: 'prod-emulsion',
  name: 'FRELUX Emulsion',
  slug: 'emulsion',
  category: 'emulsion',
  description: null,
  product_type: 'paint',
  calculation_method: 'room_based',
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
  created_at: '',
  updated_at: '',
};

const mockQualityStandard: EstimationProductQuality = {
  id: 'qual-emulsion-std',
  product_id: 'prod-emulsion',
  name: 'Standard',
  slug: 'standard',
  description: null,
  coverage: 10, // m² per litre per coat — TEST VALUE ONLY, NOT a FRELUX standard
  coverage_unit: 'm2_per_liter',
  finish: null,
  texture: null,
  gloss_level: null,
  shine_level: null,
  durability: null,
  is_active: true,
  sort_order: 1,
  created_at: '',
  updated_at: '',
};

const mockQualityPremium: EstimationProductQuality = {
  ...mockQualityStandard,
  id: 'qual-emulsion-prem',
  name: 'Premium',
  slug: 'premium',
  coverage: 12, // better coverage
  sort_order: 2,
};

const mockQualityHigh: EstimationProductQuality = {
  ...mockQualityStandard,
  id: 'qual-emulsion-hq',
  name: 'High Quality',
  slug: 'high_quality',
  coverage: 15, // best coverage
  sort_order: 3,
};

const mockPrice: EstimationPrice = {
  id: 'price-1',
  price_type: 'quality',
  ref_id: 'qual-emulsion-std',
  price: 25000, // ₦25,000 per 20L bucket
  currency: 'NGN',
  pack_size_id: null,
  effective_date: '2026-08-20',
  notes: null,
  is_active: true,
  created_at: '',
  updated_at: '',
};

const mockCeilingRule: EstimationCalcRule = {
  id: 'rule-1',
  rule_key: 'ceiling_quantity_per_room',
  calculator_type: 'painting',
  rule_value: { buckets: 0.5 },
  rule_status: 'verified_frelux',
  description: 'FRELUX rule: 0.5 bucket per room ceiling',
  is_active: true,
  created_at: '',
  updated_at: '',
};

const mockPackSizeRule: EstimationCalcRule = {
  id: 'rule-2',
  rule_key: 'pack_size_bucket_litres',
  calculator_type: 'painting',
  rule_value: { litres: 20 },
  rule_status: 'verified_frelux',
  description: 'FRELUX standard: 20L per bucket',
  is_active: true,
  created_at: '',
  updated_at: '',
};

const mockRoundingRule: EstimationCalcRule = {
  id: 'rule-3',
  rule_key: 'purchase_rounding_rule',
  calculator_type: 'painting',
  rule_value: { rule: 'ceil' },
  rule_status: 'verified_frelux',
  description: 'Round up to nearest full bucket',
  is_active: true,
  created_at: '',
  updated_at: '',
};

const mockColourConditions: EstimationColourCondition[] = [
  { id: 'cc1', condition_key: 'new_unpainted', name: 'New / Unpainted', description: null, requires_warning: false, is_active: true, sort_order: 1, created_at: '', updated_at: '' },
  { id: 'cc2', condition_key: 'light', name: 'Light Colour', description: null, requires_warning: false, is_active: true, sort_order: 2, created_at: '', updated_at: '' },
  { id: 'cc3', condition_key: 'dark_strong', name: 'Dark / Strong Colour', description: null, requires_warning: true, is_active: true, sort_order: 4, created_at: '', updated_at: '' },
  { id: 'cc4', condition_key: 'significant_transition', name: 'Significant Colour Transition', description: null, requires_warning: true, is_active: true, sort_order: 7, created_at: '', updated_at: '' },
];

const mockSurfaceConditions: EstimationSurfaceCondition[] = [
  { id: 'sc1', condition_key: 'new_plastered', name: 'New / Plastered', description: null, requires_preparation: false, primer_recommended: false, is_active: true, sort_order: 1, created_at: '', updated_at: '' },
  { id: 'sc2', condition_key: 'previously_painted_sound', name: 'Previously Painted (Sound)', description: null, requires_preparation: false, primer_recommended: false, is_active: true, sort_order: 2, created_at: '', updated_at: '' },
  { id: 'sc3', condition_key: 'peeling_flaking', name: 'Peeling / Flaking', description: null, requires_preparation: true, primer_recommended: true, is_active: true, sort_order: 3, created_at: '', updated_at: '' },
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
    room_id: 'room-1',
    room_name: 'Test Room',
    length: 10,
    breadth: 12,
    height: 8,
    unit: 'feet',
    doors: [{ quantity: 1, width: 3, height: 7 }],
    windows: [{ quantity: 1, width: 4, height: 4 }],
    doors_unknown: false,
    windows_unknown: false,
    product_id: 'prod-emulsion',
    quality_id: 'qual-emulsion-std',
    colour_condition_key: 'new_unpainted',
    surface_condition_key: 'new_plastered',
    coats: 2,
    include_ceiling: false,
    ceiling_colour: 'white',
    ...overrides,
  };
}

function makeRoomConfig(overrides: Partial<{
  product: EstimationProduct | null;
  quality: EstimationProductQuality | null;
  price: EstimationPrice | null;
}> = {}) {
  return {
    product: overrides.product ?? mockProduct,
    quality: overrides.quality ?? mockQualityStandard,
    price: overrides.price ?? mockPrice,
    ceilingRule: mockCeilingRule,
    packSizeRule: mockPackSizeRule,
    roundingRule: mockRoundingRule,
    colourConditions: mockColourConditions,
    surfaceConditions: mockSurfaceConditions,
  };
}

// =========================================================
// Tests
// =========================================================

describe('FRELUX Painting Estimator — Phase 2', () => {
  // ---------------------------------------------------------
  // Unit calculation tests
  // ---------------------------------------------------------
  describe('Area Calculations', () => {
    it('calculates wall area correctly for 10×12×8 ft room', () => {
      // 10ft = 3.048m, 12ft = 3.658m, 8ft = 2.438m
      const lengthM = 3.048;
      const breadthM = 3.658;
      const heightM = 2.438;
      const wall = calculateWallArea(lengthM, breadthM, heightM);
      // Perimeter = 2 * (3.048 + 3.658) = 13.412
      // Wall = 13.412 * 2.438 = 32.698...
      expect(wall).toBeGreaterThan(32);
      expect(wall).toBeLessThan(33);
    });

    it('calculates opening area for multiple doors', () => {
      const doors = [
        { quantity: 1, width: 3, height: 7 },
        { quantity: 2, width: 2.5, height: 6.5 },
      ];
      const area = calculateOpeningArea(doors, 'feet');
      // Door 1: 3*7 = 21 sq ft → in m: (0.9144 * 2.1336) = 1.951 m²
      // Door 2: 2*(2.5*6.5) = 2*(0.762*1.9812) = 2*1.509 = 3.019 m²
      expect(area).toBeGreaterThan(4.9);
      expect(area).toBeLessThan(5.0);
    });

    it('calculates ceiling area correctly', () => {
      const area = calculateCeilingArea(3.048, 3.658);
      expect(area).toBeGreaterThan(11.1);
      expect(area).toBeLessThan(11.2);
    });
  });

  // ---------------------------------------------------------
  // Theoretical quantity
  // ---------------------------------------------------------
  describe('Theoretical Quantity', () => {
    it('calculates litres from area, coats, and coverage', () => {
      const litres = calculateTheoreticalLitres(30, 2, 10);
      // (30 * 2) / 10 = 6
      expect(litres).toBe(6);
    });

    it('returns 0 when coverage is 0', () => {
      expect(calculateTheoreticalLitres(30, 2, 0)).toBe(0);
    });

    it('converts litres to buckets', () => {
      expect(litresToBuckets(20, 20)).toBe(1);
      expect(litresToBuckets(24, 20)).toBe(1.2);
      expect(litresToBuckets(40, 20)).toBe(2);
    });
  });

  // ---------------------------------------------------------
  // Ceiling rule
  // ---------------------------------------------------------
  describe('Ceiling Rule', () => {
    it('returns 0.5 bucket per room from configured rule', () => {
      expect(getCeilingQuantityBuckets(mockCeilingRule)).toBe(0.5);
    });

    it('falls back to 0.5 when rule is null', () => {
      expect(getCeilingQuantityBuckets(null)).toBe(0.5);
    });
  });

  // ---------------------------------------------------------
  // Pack size and rounding
  // ---------------------------------------------------------
  describe('Pack Size and Rounding', () => {
    it('gets pack size from product configuration', () => {
      expect(getPackSizeLitres(mockProduct, mockPackSizeRule)).toBe(20);
    });

    it('falls back to calc rule when product has no pack size', () => {
      const productNoPack = { ...mockProduct, standard_pack_size: null };
      expect(getPackSizeLitres(productNoPack, mockPackSizeRule)).toBe(20);
    });

    it('gets rounding rule from calc rule', () => {
      expect(getRoundingRule(mockRoundingRule)).toBe('ceil');
    });

    it('defaults to ceil when no rule', () => {
      expect(getRoundingRule(null)).toBe('ceil');
    });
  });

  // ---------------------------------------------------------
  // TEST 1: 10×12 ft room, 7-8 ft height, Emulsion, Standard, 2 coats, Walls only
  // ---------------------------------------------------------
  describe('TEST 1: 10×12 ft room, 8 ft height, Emulsion Standard, 2 coats, Walls only', () => {
    it('calculates wall quantity without ceiling', () => {
      const room = makeRoom({
        length: 10, breadth: 12, height: 8,
        include_ceiling: false,
        doors: [{ quantity: 1, width: 3, height: 7 }],
        windows: [{ quantity: 1, width: 4, height: 4 }],
      });
      const result = calculateRoom(room, makeRoomConfig());

      expect(result.valid).toBe(true);
      expect(result.include_ceiling).toBe(false);
      expect(result.ceiling_quantity_buckets).toBe(0);
      expect(result.theoretical_wall_litres).toBeGreaterThan(0);
      expect(result.theoretical_ceiling_litres).toBe(0);
      expect(result.theoretical_total_litres).toBe(result.theoretical_wall_litres);
      expect(result.practical_total_buckets).toBeGreaterThanOrEqual(1);
      expect(result.theoretical_total_buckets).toBeLessThanOrEqual(result.practical_total_buckets);
    });
  });

  // ---------------------------------------------------------
  // TEST 2: 10×12 ft room, 8 ft height, Emulsion, 2 coats, Ceiling included
  // ---------------------------------------------------------
  describe('TEST 2: 10×12 ft room, ceiling included', () => {
    it('calculates ceiling separately from walls', () => {
      const room = makeRoom({
        include_ceiling: true,
        ceiling_colour: 'white',
      });
      const result = calculateRoom(room, makeRoomConfig());

      expect(result.valid).toBe(true);
      expect(result.include_ceiling).toBe(true);
      expect(result.theoretical_ceiling_buckets).toBe(0.5);
      expect(result.theoretical_ceiling_litres).toBe(10); // 0.5 * 20L
      expect(result.ceiling_colour).toBe('white');
      expect(result.theoretical_total_litres).toBe(
        result.theoretical_wall_litres + result.theoretical_ceiling_litres
      );
    });
  });

  // ---------------------------------------------------------
  // TEST 3: 10×12 ft room, ceiling excluded
  // ---------------------------------------------------------
  describe('TEST 3: ceiling excluded', () => {
    it('ceiling quantity = 0 when not included', () => {
      const room = makeRoom({ include_ceiling: false });
      const result = calculateRoom(room, makeRoomConfig());

      expect(result.ceiling_quantity_buckets).toBe(0);
      expect(result.theoretical_ceiling_litres).toBe(0);
      expect(result.theoretical_total_litres).toBe(result.theoretical_wall_litres);
    });
  });

  // ---------------------------------------------------------
  // TEST 4: 12×12 ft room, ceiling included — theoretical vs practical
  // ---------------------------------------------------------
  describe('TEST 4: 12×12 ft room, ceiling included', () => {
    it('shows theoretical and practical quantities separately', () => {
      const room = makeRoom({
        length: 12, breadth: 12, height: 8,
        include_ceiling: true,
      });
      const result = calculateRoom(room, makeRoomConfig());

      expect(result.valid).toBe(true);
      expect(result.theoretical_total_buckets).toBeGreaterThan(0);
      expect(result.practical_total_buckets).toBeGreaterThan(0);
      // Practical must be >= theoretical (ceil rounding)
      expect(result.practical_total_buckets).toBeGreaterThanOrEqual(result.theoretical_total_buckets);
      // They should NOT be equal if theoretical is fractional
      // (the whole point is that practical rounds up)
      expect(result.theoretical_total_buckets).not.toBe(result.practical_total_buckets);
    });
  });

  // ---------------------------------------------------------
  // TEST 5: 12×12 ft room, ceiling excluded
  // ---------------------------------------------------------
  describe('TEST 5: 12×12 ft room, ceiling excluded', () => {
    it('wall quantity without ceiling paint', () => {
      const room = makeRoom({
        length: 12, breadth: 12, height: 8,
        include_ceiling: false,
      });
      const result = calculateRoom(room, makeRoomConfig());

      expect(result.theoretical_ceiling_litres).toBe(0);
      expect(result.practical_ceiling_buckets).toBe(0);
      expect(result.theoretical_total_litres).toBe(result.theoretical_wall_litres);
    });
  });

  // ---------------------------------------------------------
  // TEST 6: Room with multiple doors and windows
  // ---------------------------------------------------------
  describe('TEST 6: Multiple doors and windows', () => {
    it('deducts all opening areas', () => {
      const room = makeRoom({
        doors: [
          { quantity: 1, width: 3, height: 7 },
          { quantity: 2, width: 2.5, height: 6.5 },
        ],
        windows: [
          { quantity: 2, width: 4, height: 4 },
          { quantity: 1, width: 3, height: 5 },
        ],
      });
      const result = calculateRoom(room, makeRoomConfig());

      expect(result.valid).toBe(true);
      expect(result.door_area_m2).toBeGreaterThan(0);
      expect(result.window_area_m2).toBeGreaterThan(0);
      expect(result.net_wall_area_m2).toBeLessThan(result.gross_wall_area_m2);
    });
  });

  // ---------------------------------------------------------
  // TEST 7: Dark blue → white, warning appears, no auto percentage
  // ---------------------------------------------------------
  describe('TEST 7: Dark blue → white colour transition', () => {
    it('shows warning and does NOT apply automatic percentage', () => {
      const room = makeRoom({
        colour_condition_key: 'dark_strong',
      });
      const result = calculateRoom(room, makeRoomConfig());

      expect(result.warnings).toContain(
        'Strong colour transition detected. Additional preparation or paint may be required. Professional adjustment recommended.'
      );
      // Verify no automatic increase was applied — theoretical should be purely from area/coats/coverage
      const expectedLitres = calculateTheoreticalLitres(
        result.net_wall_area_m2,
        result.coats,
        result.coverage_m2_per_liter!
      );
      expect(result.theoretical_wall_litres).toBe(expectedLitres);
    });
  });

  // ---------------------------------------------------------
  // TEST 8: Peeling/flaking surface — warning + professional adjustment available
  // ---------------------------------------------------------
  describe('TEST 8: Peeling/flaking surface', () => {
    it('shows surface warning and recommends primer', () => {
      const room = makeRoom({
        surface_condition_key: 'peeling_flaking',
      });
      const result = calculateRoom(room, makeRoomConfig());

      expect(result.warnings).toContain(
        'Peeling / Flaking detected. Surface preparation may be required before painting.'
      );
      expect(result.primer_recommended).toBe(true);
    });
  });

  // ---------------------------------------------------------
  // TEST 9: Primer/sealer — optional, not forced
  // ---------------------------------------------------------
  describe('TEST 9: Primer is optional', () => {
    it('does not automatically include primer in estimate', () => {
      const room = makeRoom({
        surface_condition_key: 'new_plastered', // no primer recommendation
      });
      const result = calculateRoom(room, makeRoomConfig());
      expect(result.primer_recommended).toBe(false);
    });
  });

  // ---------------------------------------------------------
  // TEST 10-12: Coverage varies by quality level
  // ---------------------------------------------------------
  describe('TEST 10: Standard vs Premium vs High Quality Emulsion coverage', () => {
    it('reflects different configured coverage values', () => {
      const room = makeRoom();

      const stdResult = calculateRoom(room, makeRoomConfig({ quality: mockQualityStandard }));
      const premResult = calculateRoom(room, makeRoomConfig({ quality: mockQualityPremium }));
      const hqResult = calculateRoom(room, makeRoomConfig({ quality: mockQualityHigh }));

      // Higher quality = better coverage = fewer litres needed
      expect(stdResult.theoretical_wall_litres).toBeGreaterThan(premResult.theoretical_wall_litres);
      expect(premResult.theoretical_wall_litres).toBeGreaterThan(hqResult.theoretical_wall_litres);
    });
  });

  describe('TEST 11: Standard vs Premium vs High Quality Matt coverage', () => {
    it('reflects different configured coverage values', () => {
      const mattProduct = { ...mockProduct, id: 'prod-matt', category: 'matt', name: 'FRELUX Matt' };
      const mattStd = { ...mockQualityStandard, id: 'qual-matt-std', product_id: 'prod-matt', coverage: 9 };
      const mattPrem = { ...mockQualityStandard, id: 'qual-matt-prem', product_id: 'prod-matt', name: 'Premium', coverage: 11 };
      const mattHq = { ...mockQualityStandard, id: 'qual-matt-hq', product_id: 'prod-matt', name: 'High Quality', coverage: 14 };

      const room = makeRoom({ product_id: 'prod-matt' });
      const stdResult = calculateRoom(room, makeRoomConfig({ product: mattProduct, quality: mattStd }));
      const premResult = calculateRoom(room, makeRoomConfig({ product: mattProduct, quality: mattPrem }));
      const hqResult = calculateRoom(room, makeRoomConfig({ product: mattProduct, quality: mattHq }));

      expect(stdResult.theoretical_wall_litres).toBeGreaterThan(premResult.theoretical_wall_litres);
      expect(premResult.theoretical_wall_litres).toBeGreaterThan(hqResult.theoretical_wall_litres);
    });
  });

  describe('TEST 12: Standard vs Premium vs High Quality Satin coverage', () => {
    it('reflects different configured coverage values', () => {
      const satinProduct = { ...mockProduct, id: 'prod-satin', category: 'satin', name: 'FRELUX Satin' };
      const satinStd = { ...mockQualityStandard, id: 'qual-satin-std', product_id: 'prod-satin', coverage: 8 };
      const satinPrem = { ...mockQualityStandard, id: 'qual-satin-prem', product_id: 'prod-satin', name: 'Premium', coverage: 10 };
      const satinHq = { ...mockQualityStandard, id: 'qual-satin-hq', product_id: 'prod-satin', name: 'High Quality', coverage: 13 };

      const room = makeRoom({ product_id: 'prod-satin' });
      const stdResult = calculateRoom(room, makeRoomConfig({ product: satinProduct, quality: satinStd }));
      const premResult = calculateRoom(room, makeRoomConfig({ product: satinProduct, quality: satinPrem }));
      const hqResult = calculateRoom(room, makeRoomConfig({ product: satinProduct, quality: satinHq }));

      expect(stdResult.theoretical_wall_litres).toBeGreaterThan(premResult.theoretical_wall_litres);
      expect(premResult.theoretical_wall_litres).toBeGreaterThan(hqResult.theoretical_wall_litres);
    });
  });

  // ---------------------------------------------------------
  // TEST 13: Price change — new estimate uses new price, old retains snapshot
  // ---------------------------------------------------------
  describe('TEST 13: Price snapshot', () => {
    it('new estimate uses current active price', () => {
      const projectInput: PaintingProjectInput = {
        rooms: [makeRoom()],
        currency: 'NGN',
        user_id: null,
        client_hash: 'test-hash',
        project_description: 'Test project',
        customer_location: 'owerri',
        add_primer: false,
      };

      const config = {
        products: [mockProduct],
        qualities: new Map([['prod-emulsion', [mockQualityStandard]]]),
        prices: new Map([['qual-emulsion-std', mockPrice]]),
        calcRules: new Map([
          ['ceiling_quantity_per_room', mockCeilingRule],
          ['pack_size_bucket_litres', mockPackSizeRule],
          ['purchase_rounding_rule', mockRoundingRule],
        ]),
        colourConditions: mockColourConditions,
        surfaceConditions: mockSurfaceConditions,
        productionRules: mockProductionRules,
        calcVersionId: 'ver-1',
      };

      const result = calculatePaintingProject(projectInput, config);
      expect(result.total_material_cost).toBeGreaterThan(0);
      expect(result.line_items[0].unit_price).toBe(25000);

      // Now simulate price change
      const newPrice = { ...mockPrice, id: 'price-2', price: 30000 };
      const newConfig = {
        ...config,
        prices: new Map([['qual-emulsion-std', newPrice]]),
      };
      const newResult = calculatePaintingProject(projectInput, newConfig);
      expect(newResult.line_items[0].unit_price).toBe(30000);
    });
  });

  // ---------------------------------------------------------
  // TEST 14: Production in Owerri — no minimum
  // ---------------------------------------------------------
  describe('TEST 14: Production in Owerri', () => {
    it('no minimum applied for Owerri clients', () => {
      const eligibility = checkProductionEligibility('owerri', 'emulsion', null, 1, mockProductionRules);
      expect(eligibility.eligible).toBe(true);
      expect(eligibility.min_required).toBe(0);
    });
  });

  // ---------------------------------------------------------
  // TEST 15: Production outside Owerri below minimum
  // ---------------------------------------------------------
  describe('TEST 15: Production outside Owerri below minimum', () => {
    it('shows eligibility warning when below minimum', () => {
      const eligibility = checkProductionEligibility('outside_owerri', 'emulsion', null, 5, mockProductionRules);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.min_required).toBe(15);
      expect(eligibility.message).toContain('minimum');
    });
  });

  // ---------------------------------------------------------
  // TEST 16: Production outside Owerri meeting minimum
  // ---------------------------------------------------------
  describe('TEST 16: Production outside Owerri meeting minimum', () => {
    it('eligible when quantity meets minimum', () => {
      const eligibility = checkProductionEligibility('outside_owerri', 'emulsion', null, 15, mockProductionRules);
      expect(eligibility.eligible).toBe(true);
    });
  });

  // ---------------------------------------------------------
  // TEST 17: Labour NOT calculated
  // ---------------------------------------------------------
  describe('TEST 17: Labour is NOT calculated', () => {
    it('displays "Labour: Not included, negotiated separately."', () => {
      const projectInput: PaintingProjectInput = {
        rooms: [makeRoom()],
        currency: 'NGN',
        user_id: null,
        client_hash: 'test-hash',
        project_description: 'Test',
        customer_location: 'owerri',
        add_primer: false,
      };
      const config = {
        products: [mockProduct],
        qualities: new Map([['prod-emulsion', [mockQualityStandard]]]),
        prices: new Map([['qual-emulsion-std', mockPrice]]),
        calcRules: new Map([
          ['ceiling_quantity_per_room', mockCeilingRule],
          ['pack_size_bucket_litres', mockPackSizeRule],
          ['purchase_rounding_rule', mockRoundingRule],
        ]),
        colourConditions: mockColourConditions,
        surfaceConditions: mockSurfaceConditions,
        productionRules: mockProductionRules,
        calcVersionId: 'ver-1',
      };

      const result = calculatePaintingProject(projectInput, config);
      expect(result.labour_note).toBe('Labour: Not included, negotiated separately.');
      // No labour line items
      expect(result.line_items.every((li) => li.item_type !== 'labour')).toBe(true);
    });
  });

  // ---------------------------------------------------------
  // TEST 18: Multi-room project with different paint configs
  // ---------------------------------------------------------
  describe('TEST 18: Multi-room project', () => {
    it('each room can have different paint configurations', () => {
      const room1 = makeRoom({
        room_id: 'room-1', room_name: 'Living Room',
        product_id: 'prod-emulsion', quality_id: 'qual-emulsion-std',
      });
      const room2 = makeRoom({
        room_id: 'room-2', room_name: 'Bedroom',
        product_id: 'prod-matt', quality_id: 'qual-matt-prem',
        length: 12, breadth: 10, height: 8,
      });

      const mattProduct = { ...mockProduct, id: 'prod-matt', category: 'matt', name: 'FRELUX Matt' };
      const mattPrem = {
        ...mockQualityStandard, id: 'qual-matt-prem', product_id: 'prod-matt',
        name: 'Premium', coverage: 11,
      };

      const projectInput: PaintingProjectInput = {
        rooms: [room1, room2],
        currency: 'NGN',
        user_id: null,
        client_hash: 'test-hash',
        project_description: 'Two-room project',
        customer_location: 'owerri',
        add_primer: false,
      };

      const config = {
        products: [mockProduct, mattProduct],
        qualities: new Map([
          ['prod-emulsion', [mockQualityStandard]],
          ['prod-matt', [mattPrem]],
        ]),
        prices: new Map([
          ['qual-emulsion-std', mockPrice],
          ['qual-matt-prem', { ...mockPrice, id: 'price-matt', ref_id: 'qual-matt-prem' }],
        ]),
        calcRules: new Map([
          ['ceiling_quantity_per_room', mockCeilingRule],
          ['pack_size_bucket_litres', mockPackSizeRule],
          ['purchase_rounding_rule', mockRoundingRule],
        ]),
        colourConditions: mockColourConditions,
        surfaceConditions: mockSurfaceConditions,
        productionRules: mockProductionRules,
        calcVersionId: 'ver-1',
      };

      const result = calculatePaintingProject(projectInput, config);
      expect(result.rooms).toHaveLength(2);
      expect(result.rooms[0].product?.id).toBe('prod-emulsion');
      expect(result.rooms[1].product?.id).toBe('prod-matt');
      expect(result.combined_practical_buckets).toBeGreaterThanOrEqual(2);
      expect(result.total_material_cost).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------
  // TEST 19: Coverage configuration — missing coverage
  // ---------------------------------------------------------
  describe('TEST 19: Missing coverage configuration', () => {
    it('reports error when coverage is not configured', () => {
      const noCoverageQuality = { ...mockQualityStandard, coverage: null };
      const room = makeRoom();
      const result = calculateRoom(room, makeRoomConfig({ quality: noCoverageQuality }));

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Coverage has not been configured'))).toBe(true);
    });

    it('changing coverage affects new estimates', () => {
      const room = makeRoom();

      const result1 = calculateRoom(room, makeRoomConfig({ quality: { ...mockQualityStandard, coverage: 10 } }));
      const result2 = calculateRoom(room, makeRoomConfig({ quality: { ...mockQualityStandard, coverage: 12 } }));

      // Higher coverage = fewer litres
      expect(result2.theoretical_wall_litres).toBeLessThan(result1.theoretical_wall_litres);
    });
  });

  // ---------------------------------------------------------
  // Validation tests
  // ---------------------------------------------------------
  describe('Validation', () => {
    it('rejects zero dimensions', () => {
      const room = makeRoom({ length: 0 });
      const result = validateRoomInput(room, mockProduct, mockQualityStandard);
      expect(result.valid).toBe(false);
    });

    it('rejects negative dimensions', () => {
      const room = makeRoom({ height: -1 });
      const result = validateRoomInput(room, mockProduct, mockQualityStandard);
      expect(result.valid).toBe(false);
    });

    it('rejects inactive product', () => {
      const inactiveProduct = { ...mockProduct, is_active: false };
      const room = makeRoom();
      const result = validateRoomInput(room, inactiveProduct, mockQualityStandard);
      expect(result.valid).toBe(false);
    });

    it('rejects zero coats', () => {
      const room = makeRoom({ coats: 0 });
      const result = validateRoomInput(room, mockProduct, mockQualityStandard);
      expect(result.valid).toBe(false);
    });

    it('warns when opening dimensions are unknown', () => {
      const room = makeRoom({ doors_unknown: true, windows_unknown: true });
      const result = validateRoomInput(room, mockProduct, mockQualityStandard);
      expect(result.warnings.some((w) => w.includes('not provided'))).toBe(true);
    });
  });

  // ---------------------------------------------------------
  // Calculation transparency
  // ---------------------------------------------------------
  describe('Calculation Transparency', () => {
    it('produces calculation steps for every important stage', () => {
      const room = makeRoom({ include_ceiling: true });
      const result = calculateRoom(room, makeRoomConfig());

      const stepLabels = result.calculation_steps.map((s) => s.label);
      expect(stepLabels).toContain('Room Dimensions');
      expect(stepLabels).toContain('Gross Wall Area');
      expect(stepLabels).toContain('Net Wall Area');
      expect(stepLabels).toContain('Coverage Rate');
      expect(stepLabels).toContain('Pack Size');
      expect(stepLabels).toContain('Coats');
      expect(stepLabels).toContain('Theoretical Wall Quantity');
      expect(stepLabels).toContain('Ceiling');
      expect(stepLabels).toContain('Total Theoretical Quantity');
      expect(stepLabels).toContain('Practical Purchase Quantity');
    });
  });

  // ---------------------------------------------------------
  // Calculator type constant
  // ---------------------------------------------------------
  describe('Calculator Type', () => {
    it('uses "painting" as calculator type', () => {
      expect(CALCULATOR_TYPE).toBe('painting');
    });
  });
});
