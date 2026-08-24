import { describe, it, expect } from 'vitest';
import {
  normalizeCoverage,
  calculateRoom,
  calculatePaintProject,
  getCoverageUnitLabel,
  COVERAGE_UNIT_OPTIONS,
  getPackSizeLitres,
  getStandardHeight,
  getStandardCoatCount,
  getOpeningDeductionPct,
  getCeilingQuantityBuckets,
  getCalibrationReferences,
  type PaintEngineRoomInput,
  type PaintEngineConfig,
} from '../paint-engine';
import type {
  EstimationProduct,
  EstimationProductQuality,
  EstimationPrice,
  EstimationCalcRule,
  EstimationColourCondition,
  EstimationSurfaceCondition,
} from '@/types/estimation';

function mockProduct(o: Partial<EstimationProduct> = {}): EstimationProduct {
  return { id: 'prod-1', name: 'Emulsion', slug: 'emulsion', category: 'emulsion', description: null, product_type: 'paint', calculation_method: 'room_based', standard_pack_size: 20, pack_unit_id: null, recommended_surface: null, finish: null, texture: null, gloss_level: null, durability: null, colour_compatibility: null, paint_compatibility: null, has_quality_levels: true, is_active: true, sort_order: 1, created_at: '', updated_at: '', ...o };
}
function mockQuality(o: Partial<EstimationProductQuality> = {}): EstimationProductQuality {
  return { id: 'qual-1', product_id: 'prod-1', name: 'Standard', slug: 'standard', description: null, coverage: 10, coverage_unit: 'm2_per_liter', ceiling_coverage: null, ceiling_coverage_unit: null, finish: null, texture: null, gloss_level: null, shine_level: null, durability: null, is_active: true, sort_order: 1, created_at: '', updated_at: '', ...o };
}
function mockPrice(o: Partial<EstimationPrice> = {}): EstimationPrice {
  return { id: 'price-1', price_type: 'quality', ref_id: 'qual-1', price: 25000, currency: 'NGN', pack_size_id: null, effective_date: '2026-01-01', notes: null, is_active: true, created_at: '', updated_at: '', ...o };
}
function mockRoomInput(o: Partial<PaintEngineRoomInput> = {}): PaintEngineRoomInput {
  return { room_id: 'room-1', room_name: 'Living Room', length: 12, width: 14, height: 8, unit: 'feet', doors: [{ quantity: 1, width: 3, height: 7 }], windows: [{ quantity: 2, width: 3, height: 4 }], doors_unknown: false, windows_unknown: false, product_id: 'prod-1', quality_id: 'qual-1', coats: 2, include_ceiling: false, ceiling_colour: 'white', surface_condition_key: 'previously_painted_sound', colour_condition_key: 'previously_painted_same', include_primer: false, ...o };
}
function mockConfig(o: Partial<PaintEngineConfig> = {}): PaintEngineConfig {
  return { product: mockProduct(), quality: mockQuality(), price: mockPrice(), primer_price: null, ceilingRule: null, ceilingCoverageRule: null, packSizeRule: null, roundingRule: null, standardHeightRule: null, heightAdjustmentRule: null, openingDeductionRule: null, coatCountRule: null, calibrationReferencesRule: null, colourConditions: [], surfaceConditions: [], calcVersionId: 'v1', ...o };
}

describe('normalizeCoverage', () => {
  it('m2_per_liter uses value directly', () => { expect(normalizeCoverage(10, 'm2_per_liter', 20)).toBe(10); });
  it('m2_per_bucket divides by bucket', () => { expect(normalizeCoverage(200, 'm2_per_bucket', 20)).toBe(10); });
  it('ft2_per_liter converts to m2', () => { expect(normalizeCoverage(100, 'ft2_per_liter', 20)).toBeCloseTo(100 * 0.09290304, 4); });
  it('ft2_per_bucket converts and divides', () => { expect(normalizeCoverage(2000, 'ft2_per_bucket', 20)).toBeCloseTo((2000 * 0.09290304) / 20, 4); });
  it('frelux_calibration passes through', () => { expect(normalizeCoverage(5, 'frelux_calibration', 20)).toBe(5); });
  it('returns 0 for zero coverage', () => { expect(normalizeCoverage(0, 'm2_per_liter', 20)).toBe(0); });
  it('defaults to m2/L for unknown unit', () => { expect(normalizeCoverage(10, 'unknown', 20)).toBe(10); });
});

describe('getCoverageUnitLabel', () => {
  it('returns labels', () => {
    expect(getCoverageUnitLabel('m2_per_liter')).toBe('m² per litre');
    expect(getCoverageUnitLabel('m2_per_bucket')).toBe('m² per 20-L bucket');
    expect(getCoverageUnitLabel('ft2_per_liter')).toBe('ft² per litre');
    expect(getCoverageUnitLabel('ft2_per_bucket')).toBe('ft² per 20-L bucket');
    expect(getCoverageUnitLabel('frelux_calibration')).toBe('FRELUX Calibration');
  });
  it('has 5 options', () => { expect(COVERAGE_UNIT_OPTIONS).toHaveLength(5); });
});

describe('Rule helpers', () => {
  it('pack size from product', () => { expect(getPackSizeLitres(mockProduct({ standard_pack_size: 20 }), null)).toBe(20); });
  it('pack size from rule', () => {
    const r: EstimationCalcRule = { id: 'r1', rule_key: 'pack', calculator_type: 'p', rule_value: { litres: 20 }, rule_status: 'verified_frelux', description: null, is_active: true, created_at: '', updated_at: '' };
    expect(getPackSizeLitres(null, r)).toBe(20);
  });
  it('pack size default 20', () => { expect(getPackSizeLitres(null, null)).toBe(20); });
  it('height default 8ft', () => { expect(getStandardHeight(null).ft).toBe(8); });
  it('coats default 2', () => { expect(getStandardCoatCount(null)).toBe(2); });
  it('opening deduction default 100', () => { expect(getOpeningDeductionPct(null)).toBe(100); });
  it('ceiling buckets default 0.5', () => { expect(getCeilingQuantityBuckets(null)).toBe(0.5); });
  it('calibration refs empty for null', () => { expect(getCalibrationReferences(null)).toEqual([]); });
});

describe('calculateRoom', () => {
  it('calculates room estimate', () => {
    const r = calculateRoom(mockRoomInput(), mockConfig());
    expect(r.valid).toBe(true);
    expect(r.gross_wall_area_m2).toBeGreaterThan(0);
    expect(r.theoretical_total_litres).toBeGreaterThan(0);
    expect(r.practical_total_buckets).toBeGreaterThanOrEqual(r.theoretical_total_buckets);
  });
  it('uses room dimensions not m2', () => {
    const r = calculateRoom(mockRoomInput(), mockConfig());
    expect(r.customer_summary.room_size).toContain('12 × 14 feet');
  });
  it('theoretical not rounded prematurely', () => {
    const r = calculateRoom(mockRoomInput(), mockConfig());
    expect(r.theoretical_total_litres % 1).not.toBe(0);
  });
  it('practical rounds up to buckets', () => {
    const r = calculateRoom(mockRoomInput(), mockConfig());
    expect(r.practical_total_buckets).toBe(Math.ceil(r.practical_total_buckets));
    expect(r.practical_total_litres).toBe(r.practical_total_buckets * r.pack_size_litres);
  });
  it('practical >= theoretical', () => {
    const r = calculateRoom(mockRoomInput(), mockConfig());
    expect(r.practical_total_litres).toBeGreaterThanOrEqual(r.theoretical_total_litres);
  });
  it('labour NOT calculated', () => {
    const r = calculateRoom(mockRoomInput(), mockConfig());
    expect(r.customer_summary.labour_note).toContain('Not included');
    expect(r.customer_summary.labour_note).toContain('negotiated separately');
  });
  it('errors when coverage missing', () => {
    const r = calculateRoom(mockRoomInput(), mockConfig({ quality: mockQuality({ coverage: null }) }));
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('Coverage has not been configured'))).toBe(true);
  });
  it('warns when price missing', () => {
    const r = calculateRoom(mockRoomInput(), mockConfig({ price: mockPrice({ price: 0 }) }));
    expect(r.warnings.some(w => w.includes('Price not configured'))).toBe(true);
    expect(r.material_cost).toBe(0);
  });
  it('does NOT invent coverage', () => {
    const r = calculateRoom(mockRoomInput(), mockConfig({ quality: mockQuality({ coverage: null }) }));
    expect(r.theoretical_total_litres).toBe(0);
  });
  it('ceiling included separately', () => {
    const r = calculateRoom(mockRoomInput({ include_ceiling: true }), mockConfig());
    expect(r.ceiling_area_m2).toBeGreaterThan(0);
    expect(r.theoretical_ceiling_litres).toBeGreaterThanOrEqual(0);
  });
  it('ceiling NOT included when not requested', () => {
    const r = calculateRoom(mockRoomInput({ include_ceiling: false }), mockConfig());
    expect(r.ceiling_area_m2).toBe(0);
  });
  it('ceiling uses separate coverage', () => {
    const r = calculateRoom(mockRoomInput({ include_ceiling: true }), mockConfig({
      quality: mockQuality({ coverage: 10, ceiling_coverage: 8, ceiling_coverage_unit: 'm2_per_liter' }),
    }));
    expect(r.ceiling_coverage_rate).toBe(8);
    expect(r.theoretical_ceiling_litres).toBeGreaterThan(0);
  });
  it('height warning above 8ft', () => {
    const r = calculateRoom(mockRoomInput({ height: 9 }), mockConfig());
    expect(r.height_warning).not.toBeNull();
  });
  it('no height warning at 8ft', () => {
    const r = calculateRoom(mockRoomInput({ height: 8 }), mockConfig());
    expect(r.height_warning).toBeNull();
  });
  it('deducts openings', () => {
    const r = calculateRoom(mockRoomInput(), mockConfig());
    expect(r.opening_deduction_m2).toBeGreaterThan(0);
    expect(r.net_wall_area_m2).toBeLessThan(r.gross_wall_area_m2);
  });
  it('price snapshot preserved', () => {
    const r = calculateRoom(mockRoomInput(), mockConfig());
    expect(r.price_snapshot).not.toBeNull();
    expect(r.price_snapshot!.unit_price).toBe(25000);
    expect(r.price_snapshot!.product_name).toBe('Emulsion');
    expect(r.price_snapshot!.calc_version_id).toBe('v1');
  });
  it('has calculation steps', () => {
    const r = calculateRoom(mockRoomInput(), mockConfig());
    expect(r.calculation_steps.length).toBeGreaterThan(10);
    const labels = r.calculation_steps.map(s => s.label);
    expect(labels).toContain('Room Dimensions');
    expect(labels).toContain('Practical Purchase Quantity');
  });
});

describe('Product/Quality specific coverage', () => {
  it('Emulsion Standard uses own coverage', () => {
    const r = calculateRoom(mockRoomInput(), mockConfig({
      product: mockProduct({ name: 'Emulsion' }),
      quality: mockQuality({ name: 'Standard', coverage: 12 }),
    }));
    expect(r.coverage_rate).toBe(12);
  });
  it('Emulsion Premium differs from Standard', () => {
    const std = calculateRoom(mockRoomInput(), mockConfig({ quality: mockQuality({ coverage: 10 }) }));
    const prem = calculateRoom(mockRoomInput(), mockConfig({ quality: mockQuality({ coverage: 14 }) }));
    expect(std.coverage_rate).not.toBe(prem.coverage_rate);
  });
  it('Matt not inherited from Emulsion', () => {
    const em = calculateRoom(mockRoomInput(), mockConfig({ quality: mockQuality({ coverage: 12 }) }));
    const mt = calculateRoom(mockRoomInput(), mockConfig({ quality: mockQuality({ coverage: 9 }) }));
    expect(em.coverage_rate).not.toBe(mt.coverage_rate);
  });
});

describe('Satin independent coverage', () => {
  it('Satin Standard own coverage', () => {
    const r = calculateRoom(mockRoomInput(), mockConfig({
      product: mockProduct({ name: 'Satin', category: 'satin' }),
      quality: mockQuality({ coverage: 11 }),
    }));
    expect(r.coverage_rate).toBe(11);
    expect(r.product?.category).toBe('satin');
  });
  it('Satin Premium differs from Standard', () => {
    const std = calculateRoom(mockRoomInput(), mockConfig({ quality: mockQuality({ coverage: 11 }) }));
    const prem = calculateRoom(mockRoomInput(), mockConfig({ quality: mockQuality({ coverage: 13 }) }));
    expect(std.coverage_rate).not.toBe(prem.coverage_rate);
  });
  it('Satin Premium vs Emulsion Premium vs Matt Premium all different', () => {
    const em = calculateRoom(mockRoomInput(), mockConfig({ quality: mockQuality({ coverage: 14 }) })).coverage_rate;
    const mt = calculateRoom(mockRoomInput(), mockConfig({ quality: mockQuality({ coverage: 11 }) })).coverage_rate;
    const st = calculateRoom(mockRoomInput(), mockConfig({ quality: mockQuality({ coverage: 13 }) })).coverage_rate;
    expect(new Set([em, mt, st]).size).toBe(3);
  });
});

describe('Coverage unit in engine', () => {
  it('m2_per_bucket normalized', () => {
    const r = calculateRoom(mockRoomInput(), mockConfig({ quality: mockQuality({ coverage: 200, coverage_unit: 'm2_per_bucket' }) }));
    const expected = (r.net_wall_area_m2 * 2) / 10;
    expect(r.theoretical_wall_litres).toBeCloseTo(expected, 1);
  });
  it('ft2_per_liter converted', () => {
    const r = calculateRoom(mockRoomInput(), mockConfig({ quality: mockQuality({ coverage: 100, coverage_unit: 'ft2_per_liter' }) }));
    const expectedCov = 100 * 0.09290304;
    expect(r.theoretical_wall_litres).toBeCloseTo((r.net_wall_area_m2 * 2) / expectedCov, 1);
  });
});

describe('Multi-room project', () => {
  it('aggregates multiple rooms', () => {
    const rooms = [
      mockRoomInput({ room_id: 'r1', room_name: 'Living', length: 12, width: 14 }),
      mockRoomInput({ room_id: 'r2', room_name: 'Bedroom', length: 10, width: 12 }),
    ];
    const r = calculatePaintProject(rooms, {
      products: [mockProduct()], qualities: new Map([['prod-1', [mockQuality()]]]),
      prices: new Map([['qual-1', mockPrice()]]), calcRules: new Map(),
      colourConditions: [], surfaceConditions: [], calcVersionId: 'v1',
    });
    expect(r.rooms).toHaveLength(2);
    expect(r.combined_theoretical_litres).toBeGreaterThan(0);
    expect(r.total_material_cost).toBeGreaterThan(0);
  });
  it('labour note negotiated separately', () => {
    const r = calculatePaintProject([mockRoomInput()], {
      products: [mockProduct()], qualities: new Map([['prod-1', [mockQuality()]]]),
      prices: new Map([['qual-1', mockPrice()]]), calcRules: new Map(),
      colourConditions: [], surfaceConditions: [], calcVersionId: 'v1',
    });
    expect(r.labour_note).toContain('negotiated separately');
  });
});

describe('Calibration', () => {
  it('reads calibration refs', () => {
    const rule: EstimationCalcRule = { id: 'c1', rule_key: 'cal', calculator_type: 'p', rule_value: { references: [{ room_ft: '10x12', height_ft: 8, coats: 2, buckets: 1.0 }] }, rule_status: 'admin_configured', description: null, is_active: true, created_at: '', updated_at: '' };
    expect(getCalibrationReferences(rule)).toHaveLength(1);
  });
  it('calibration step appears', () => {
    const rule: EstimationCalcRule = { id: 'c1', rule_key: 'cal', calculator_type: 'p', rule_value: { references: [{ room_ft: '12x14', height_ft: 8, coats: 2, buckets: 1.5 }] }, rule_status: 'admin_configured', description: null, is_active: true, created_at: '', updated_at: '' };
    const r = calculateRoom(mockRoomInput({ length: 12, width: 14, height: 8, coats: 2 }), mockConfig({
      quality: mockQuality({ coverage: 10, coverage_unit: 'frelux_calibration' }),
      calibrationReferencesRule: rule,
    }));
    const step = r.calculation_steps.find(s => s.label === 'FRELUX Calibration');
    expect(step).toBeDefined();
    expect(step!.value).toContain('1.5');
  });
});

describe('Surface condition', () => {
  it('applies factor', () => {
    const sc: EstimationSurfaceCondition[] = [
      { id: 's1', condition_key: 'rough', name: 'Rough', coverage_adjustment_factor: 0.75, requires_preparation: true, primer_recommended: true, is_active: true, sort_order: 1, created_at: '', updated_at: '' } as EstimationSurfaceCondition,
    ];
    const smooth = calculateRoom(mockRoomInput({ surface_condition_key: 'smooth' }), mockConfig({ surfaceConditions: sc }));
    const rough = calculateRoom(mockRoomInput({ surface_condition_key: 'rough' }), mockConfig({ surfaceConditions: sc }));
    expect(rough.theoretical_wall_litres).toBeGreaterThan(smooth.theoretical_wall_litres);
    expect(rough.surface_factor).toBe(0.75);
  });
  it('primer recommended for rough', () => {
    const sc: EstimationSurfaceCondition[] = [
      { id: 's1', condition_key: 'rough', name: 'Rough', coverage_adjustment_factor: 0.75, requires_preparation: true, primer_recommended: true, is_active: true, sort_order: 1, created_at: '', updated_at: '' } as EstimationSurfaceCondition,
    ];
    const r = calculateRoom(mockRoomInput({ surface_condition_key: 'rough' }), mockConfig({ surfaceConditions: sc }));
    expect(r.primer_recommended).toBe(true);
  });
});

describe('Colour condition min coats', () => {
  it('applies min_coats_override', () => {
    const cc: EstimationColourCondition[] = [
      { id: 'c1', condition_key: 'dark_over_light', name: 'Dark over Light', requires_warning: true, min_coats_override: 3, is_active: true, sort_order: 1, created_at: '', updated_at: '' } as EstimationColourCondition,
    ];
    const r = calculateRoom(mockRoomInput({ coats: 2, colour_condition_key: 'dark_over_light' }), mockConfig({ colourConditions: cc }));
    expect(r.effective_coats).toBe(3);
  });
  it('user coats above override', () => {
    const cc: EstimationColourCondition[] = [
      { id: 'c1', condition_key: 'dark_over_light', name: 'Dark over Light', requires_warning: true, min_coats_override: 3, is_active: true, sort_order: 1, created_at: '', updated_at: '' } as EstimationColourCondition,
    ];
    const r = calculateRoom(mockRoomInput({ coats: 4, colour_condition_key: 'dark_over_light' }), mockConfig({ colourConditions: cc }));
    expect(r.effective_coats).toBe(4);
  });
});
