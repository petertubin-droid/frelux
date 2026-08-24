// =========================================================
// FRELUX Build-to-Roof Engine — Comprehensive Tests (Audited)
// Phase 30 — Corrected
//
// Tests verify:
// - Concrete mix → material conversion (mass balance)
// - Block quantity calculations
// - Roof geometry (gable, hip, mono-pitch, flat)
// - Reinforcement estimation (with hooks)
// - Roofing sheet coverage by material type
// - Timber includes overhang
// - Foundation concrete uses configurable footing_thickness
// - Hardcore has material cost
// - DPM uses dpm_per_m2 price
// - Full estimate reconciliation (quantities → costs → stage totals → grand total)
// - Multiple building configurations (bungalow, duplex)
// - Edge cases
// =========================================================

import { describe, it, expect } from 'vitest';
import {
  calculateBuildToRoof,
  concreteToMaterials,
  mortarToMaterials,
  blocksPerM2,
  calculateRoofArea,
  calculateRidgeLength,
  calculateHipLength,
  calculateFasciaLength,
  estimateTimberMeters,
  estimateReinforcementKg,
  buildReinforcementBreakdown,
  m3ToTrips,
  roofingSheetsCount,
  getSheetCoverage,
  DEFAULT_PRICES,
  DEFAULT_LABOUR,
  DEFAULT_WASTAGE,
  CEMENT_VOLUME_PER_BAG,
  DRY_WET_RATIO,
  MORTAR_DRY_WET_RATIO,
  SHEET_COVERAGE,
} from './build-to-roof-engine';
import type { BuildToRoofInput, StructuralMemberInput } from '@/types/build-to-roof';

// ── Helper: create a standard test input ──

function createTestInput(overrides: Partial<BuildToRoofInput> = {}): BuildToRoofInput {
  return {
    project_name: 'Test Bungalow',
    location: 'Lagos',
    building_type: 'bungalow',
    number_of_floors: 1,
    building_length: 15,
    building_width: 10,
    floor_to_floor_height: 3,
    wall_thickness: 0.225,
    internal_wall_length: 25,
    internal_wall_thickness: 0.15,
    openings: [
      { type: 'door', width: 0.9, height: 2.1, count: 6 },
      { type: 'window', width: 1.2, height: 1.2, count: 8 },
    ],
    foundation_type: 'strip_footing',
    foundation_depth: 0.9,
    foundation_width: 0.675,
    footing_thickness: 0.225,
    blinding_thickness: 0.075,
    hardcore_thickness: 0.15,
    dpc_length: 50,
    block_size: '9inch',
    block_length: 450,
    block_height: 225,
    block_width: 225,
    concrete_mix_cement: 1,
    concrete_mix_sand: 2,
    concrete_mix_granite: 4,
    mortar_mix_cement: 1,
    mortar_mix_sand: 6,
    roof_type: 'gable',
    roof_pitch_degrees: 25,
    roof_overhang: 0.6,
    roofing_material: 'long_span_aluminium',
    structural_members: [],
    has_engineer_schedule: false,
    wastage: DEFAULT_WASTAGE,
    prices: DEFAULT_PRICES,
    labour: DEFAULT_LABOUR,
    contingency_percent: 5,
    ...overrides,
  };
}

// ── Concrete mix tests ──

describe('concreteToMaterials', () => {
  it('converts 1m³ of 1:2:4 concrete correctly', () => {
    const result = concreteToMaterials(1, 1, 2, 4);
    // dryVolume = 1 × 1.54 = 1.54
    // totalParts = 7
    // cementVol = 1.54 × (1/7) = 0.22
    // cementBags = 0.22 / 0.0347 = 6.34
    expect(result.cement_bags).toBeCloseTo(6.34, 1);
    expect(result.sand_m3).toBeCloseTo(0.44, 1);
    expect(result.granite_m3).toBeCloseTo(0.88, 1);
  });

  it('mass balance: cement + sand + aggregate volumes = dry volume', () => {
    for (const [c, s, a] of [[1, 2, 4], [1, 3, 6], [1, 1.5, 3], [1, 4, 8]]) {
      const result = concreteToMaterials(5, c, s, a);
      const total = result.cement_bags * CEMENT_VOLUME_PER_BAG + result.sand_m3 + result.granite_m3;
      const expected = 5 * DRY_WET_RATIO;
      expect(total).toBeCloseTo(expected, 4);
    }
  });

  it('returns zeros for zero volume', () => {
    const result = concreteToMaterials(0, 1, 2, 4);
    expect(result.cement_bags).toBe(0);
    expect(result.sand_m3).toBe(0);
    expect(result.granite_m3).toBe(0);
  });

  it('returns zeros for invalid mix (zero parts)', () => {
    const result = concreteToMaterials(10, 0, 0, 0);
    expect(result.cement_bags).toBe(0);
  });

  it('handles 1:3:6 mix', () => {
    const result = concreteToMaterials(10, 1, 3, 6);
    // dryVolume = 15.4, totalParts = 10
    // cementVol = 1.54, bags = 44.38
    expect(result.cement_bags).toBeCloseTo(44.38, 0);
    expect(result.sand_m3).toBeCloseTo(4.62, 0);
    expect(result.granite_m3).toBeCloseTo(9.24, 0);
  });
});

// ── Mortar mix tests ──

describe('mortarToMaterials', () => {
  it('converts 1m³ of 1:6 mortar', () => {
    const result = mortarToMaterials(1, 1, 6);
    // dryVolume = 1.33, totalParts = 7
    // cementVol = 0.19, bags = 5.48
    expect(result.cement_bags).toBeCloseTo(5.48, 0);
    expect(result.sand_m3).toBeCloseTo(1.14, 0);
  });

  it('mass balance: cement vol + sand vol = dry volume', () => {
    const result = mortarToMaterials(5, 1, 6);
    const total = result.cement_bags * CEMENT_VOLUME_PER_BAG + result.sand_m3;
    const expected = 5 * MORTAR_DRY_WET_RATIO;
    expect(total).toBeCloseTo(expected, 4);
  });

  it('returns zeros for zero volume', () => {
    const result = mortarToMaterials(0, 1, 6);
    expect(result.cement_bags).toBe(0);
    expect(result.sand_m3).toBe(0);
  });
});

// ── Block calculation tests ──

describe('blocksPerM2', () => {
  // NOTE: blocksPerM2 takes INCHES (matches real app usage — e.g. a
  // Nigerian 9-inch block is entered as 18" long × 9" high).
  it('calculates blocks per m² for an 18"×9" block (9-inch block)', () => {
    const result = blocksPerM2(18, 9);
    // face area = (18×0.0254) × (9×0.0254) = 0.4572 × 0.2286 ≈ 0.10453 m²
    // blocks per m² = 1 / 0.10453 ≈ 9.57
    expect(result).toBeCloseTo(9.57, 1);
  });

  it('calculates blocks per m² for an 18"×6" block (6-inch block)', () => {
    const result = blocksPerM2(18, 6);
    // face area = (18×0.0254) × (6×0.0254) = 0.4572 × 0.1524 ≈ 0.06968 m²
    // blocks per m² = 1 / 0.06968 ≈ 14.35
    expect(result).toBeCloseTo(14.35, 1);
  });

  it('returns 0 for invalid dimensions', () => {
    expect(blocksPerM2(0, 9)).toBe(0);
    expect(blocksPerM2(18, 0)).toBe(0);
    expect(blocksPerM2(-1, 9)).toBe(0);
  });
});

// ── Roof geometry tests ──

describe('calculateRoofArea', () => {
  it('calculates flat roof area = footprint', () => {
    const area = calculateRoofArea(15, 10, 0, 0.6, 'flat');
    expect(area).toBeCloseTo((15 + 1.2) * (10 + 1.2), 1);
  });

  it('calculates gable roof area with pitch (verified formula)', () => {
    const area = calculateRoofArea(15, 10, 25, 0.6, 'gable');
    const footprint = (15 + 1.2) * (10 + 1.2);
    const slopeFactor = 1 / Math.cos((25 * Math.PI) / 180);
    // Gable: 2 × (L+2oh) × (W/2+oh)/cos(pitch) = (L+2oh) × (W+2oh) / cos(pitch) = footprint × slopeFactor
    expect(area).toBeCloseTo(footprint * slopeFactor, 1);
  });

  it('handles 0° pitch (equals footprint)', () => {
    const area = calculateRoofArea(10, 8, 0, 0, 'gable');
    expect(area).toBeCloseTo(80, 1);
  });

  it('handles 90° pitch gracefully (returns footprint)', () => {
    const area = calculateRoofArea(10, 8, 90, 0, 'gable');
    expect(area).toBe(80);
  });
});

describe('calculateRidgeLength', () => {
  it('gable ridge = building length', () => {
    expect(calculateRidgeLength(15, 10, 'gable')).toBe(15);
  });

  it('hip ridge = length - width', () => {
    expect(calculateRidgeLength(15, 10, 'hip')).toBe(5);
  });

  it('hip ridge = 0 when length = width (square building)', () => {
    expect(calculateRidgeLength(10, 10, 'hip')).toBe(0);
  });

  it('flat ridge = 0', () => {
    expect(calculateRidgeLength(15, 10, 'flat')).toBe(0);
  });

  it('mono-pitch ridge = 0', () => {
    expect(calculateRidgeLength(15, 10, 'mono_pitch')).toBe(0);
  });
});

describe('calculateHipLength', () => {
  it('calculates 4 hip lengths for hip roof', () => {
    const hipLen = calculateHipLength(15, 10, 25);
    // halfWidth = 5, cos(25°) ≈ 0.906
    // hipSlope = 5 / 0.906 ≈ 5.52
    // total = 4 × 5.52 ≈ 22.06
    expect(hipLen).toBeCloseTo(22.06, 0);
  });
});

describe('calculateFasciaLength', () => {
  it('calculates fascia perimeter including overhang', () => {
    const fascia = calculateFasciaLength(15, 10, 0.6);
    // 2×(15+1.2) + 2×(10+1.2) = 32.4 + 22.4 = 54.8
    expect(fascia).toBeCloseTo(54.8, 1);
  });

  it('handles zero overhang', () => {
    const fascia = calculateFasciaLength(10, 8, 0);
    expect(fascia).toBeCloseTo(36, 1);
  });
});

// ── Timber estimation ──

describe('estimateTimberMeters', () => {
  it('includes overhang in rafter length (FIX)', () => {
    const timber = estimateTimberMeters(200, 15, 10, 25, 0.6, 'gable');
    // With overhang: slope = (10/2 + 0.6) / cos(25°) = 5.6 / 0.906 = 6.18m
    // Without overhang (old bug): slope = 5 / 0.906 = 5.52m
    expect(timber).toBeGreaterThan(100); // should be substantial
  });

  it('returns minimal timber for flat roof', () => {
    const timber = estimateTimberMeters(100, 10, 8, 0, 0, 'flat');
    expect(timber).toBeGreaterThanOrEqual(200);
  });

  it('returns more timber with overhang than without (overhang adds length)', () => {
    const withOverhang = estimateTimberMeters(200, 15, 10, 25, 0.6, 'gable');
    const noOverhang = estimateTimberMeters(200, 15, 10, 25, 0, 'gable');
    expect(withOverhang).toBeGreaterThan(noOverhang);
  });
});

// ── Reinforcement estimation ──

describe('estimateReinforcementKg', () => {
  it('calculates reinforcement for a column with hooks (FIX)', () => {
    const member: StructuralMemberInput = {
      id: 'col1',
      type: 'column',
      label: 'Column C1',
      length: 3,
      width: 0.225,
      depth: 0.225,
      quantity: 12,
      bar_diameter_mm: 16,
      bar_count_main: 4,
      bar_count_links: 8,
      link_diameter_mm: 8,
      cover_mm: 25,
    };
    const kg = estimateReinforcementKg(member);
    // Main bars: 4 × 3m × 12 = 144m of 16mm → 144 × 1.580 = 227.5 kg
    // Links: 8/m × 3m × 12 = 288 links
    // Link body: 2 × (0.225 + 0.225 - 4×0.025) = 2 × 0.35 = 0.70m
    // Hooks: 2 × 10 × 0.008 = 0.16m
    // Link total: 0.86m
    // Link weight: 8²/162 = 0.395 kg/m
    // Links: 288 × 0.86 × 0.395 = 97.8 kg
    // Total ≈ 325.3 kg (was 318.6 before hook fix)
    expect(kg).toBeGreaterThan(320);
    expect(kg).toBeLessThan(330);
  });

  it('returns 0 when no reinforcement spec provided', () => {
    const member: StructuralMemberInput = {
      id: 'col1',
      type: 'column',
      label: 'Column C1',
      length: 3,
      width: 0.225,
      depth: 0.225,
      quantity: 12,
    };
    expect(estimateReinforcementKg(member)).toBe(0);
  });

  it('handles slab with main bars but no links', () => {
    const member: StructuralMemberInput = {
      id: 'slab1',
      type: 'slab',
      label: 'Slab S1',
      length: 15,
      width: 10,
      depth: 0.15,
      quantity: 1,
      bar_diameter_mm: 12,
      bar_count_main: 50, // 50 main bars
      bar_length_main: 10, // each 10m long
    };
    const kg = estimateReinforcementKg(member);
    // 50 × 10m × (12²/162) = 500 × 0.889 = 444.4 kg
    expect(kg).toBeCloseTo(444.4, 0);
  });
});

// ── Roofing sheets ──

describe('roofingSheetsCount', () => {
  it('calculates sheets needed', () => {
    expect(roofingSheetsCount(150, 1.5)).toBe(100);
  });

  it('rounds up', () => {
    expect(roofingSheetsCount(151, 1.5)).toBe(Math.ceil(151 / 1.5));
  });

  it('returns 0 for invalid coverage', () => {
    expect(roofingSheetsCount(100, 0)).toBe(0);
  });
});

describe('getSheetCoverage', () => {
  it('returns different coverage for different materials (FIX)', () => {
    expect(getSheetCoverage('long_span_aluminium')).toBe(1.5);
    expect(getSheetCoverage('stone_coated')).toBe(0.53);
    expect(getSheetCoverage('gi_sheet')).toBe(1.52);
    expect(getSheetCoverage('shingle')).toBe(0.93);
    expect(getSheetCoverage('custom')).toBe(1.5);
  });

  it('stone coated needs more sheets than long span', () => {
    const area = 200;
    const longSpan = roofingSheetsCount(area, getSheetCoverage('long_span_aluminium'));
    const stoneCoated = roofingSheetsCount(area, getSheetCoverage('stone_coated'));
    expect(stoneCoated).toBeGreaterThan(longSpan);
  });
});

// ── Full estimate tests ──

describe('calculateBuildToRoof — Bungalow', () => {
  const input = createTestInput();
  const result = calculateBuildToRoof(input);

  it('produces 5 stages', () => {
    expect(result.stages).toHaveLength(5);
    expect(result.stages[0].stage_label).toBe('Site & Foundation');
    expect(result.stages[1].stage_label).toBe('Ground Floor');
    expect(result.stages[2].stage_label).toBe('Wall Construction');
    expect(result.stages[3].stage_label).toBe('Structural Frame');
    expect(result.stages[4].stage_label).toBe('Roofing');
  });

  it('calculates total floor area', () => {
    expect(result.total_floor_area).toBe(150);
  });

  it('foundation stage has materials and labour', () => {
    const foundation = result.stages[0];
    expect(foundation.materials.length).toBeGreaterThan(0);
    expect(foundation.labour.length).toBeGreaterThan(0);
    expect(foundation.stage_total).toBeCloseTo(foundation.materials_total + foundation.labour_total, 2);
  });

  it('wall stage deducts openings', () => {
    const walls = result.stages[2];
    const openingDeduction = walls.quantities.find(q => q.label === 'Opening deductions');
    expect(openingDeduction).toBeDefined();
    // 6 doors × 0.9×2.1 = 11.34, 8 windows × 1.2×1.2 = 11.52 → total = 22.86
    expect(Math.abs(openingDeduction!.base_quantity)).toBeCloseTo(22.86, 1);
  });

  it('structural frame is zero when no members provided', () => {
    expect(result.stages[3].stage_total).toBe(0);
  });

  it('grand total reconciles: materials + labour (incl. role-based) + contingency', () => {
    // grand_total = materials_total + labour_total (task-based + role-based day-rate labour) + contingency.
    // Note: role-based labour (bricklayer/foreman/etc. day rates) is a separate cost
    // bucket on top of per-stage totals, so we reconcile against the aggregate fields
    // rather than re-summing stage_total (which only carries task-based labour).
    const base = result.materials_total + result.labour_total;
    const contingency = base * (input.contingency_percent / 100);
    expect(result.grand_total).toBeCloseTo(base + contingency, 0);
  });

  it('materials + labour = stage total for each stage', () => {
    for (const stage of result.stages) {
      expect(stage.stage_total).toBeCloseTo(stage.materials_total + stage.labour_total, 0);
    }
  });

  it('confidence is moderate with dimensions but no engineer schedule', () => {
    expect(result.confidence).toBe('moderate');
  });

  it('has assumptions and limitations', () => {
    expect(result.assumptions.length).toBeGreaterThan(5);
    expect(result.limitations.length).toBeGreaterThan(3);
    expect(result.missing_info.length).toBeGreaterThan(0);
  });

  it('shopping list consolidates cement', () => {
    const cement = result.shopping_list.find(m => m.label === 'Cement');
    expect(cement).toBeDefined();
    expect(cement!.total_quantity).toBeGreaterThan(0);
  });

  it('shopping list includes hardcore (FIX: now has material cost)', () => {
    const hardcore = result.shopping_list.find(m => m.label === 'Hardcore Stone');
    expect(hardcore).toBeDefined();
    expect(hardcore!.total_quantity).toBeGreaterThan(0);
    expect(hardcore!.total_cost).toBeGreaterThan(0);
  });

  it('does not include finishing works', () => {
    const allLabels = result.stages.flatMap(s => s.materials.map(m => m.label));
    expect(allLabels.some(l => l.toLowerCase().includes('paint'))).toBe(false);
    expect(allLabels.some(l => l.toLowerCase().includes('tile'))).toBe(false);
    expect(allLabels.some(l => l.toLowerCase().includes('plaster'))).toBe(false);
    expect(allLabels.some(l => l.toLowerCase().includes('door'))).toBe(false);
    expect(allLabels.some(l => l.toLowerCase().includes('window'))).toBe(false);
  });

  it('foundation concrete uses footing_thickness (not hardcoded 0.225)', () => {
    const inputWithThickerFooting = createTestInput({ footing_thickness: 0.3 });
    const resultThicker = calculateBuildToRoof(inputWithThickerFooting);
    const inputThinner = createTestInput({ footing_thickness: 0.15 });
    const resultThinner = calculateBuildToRoof(inputThinner);

    // Thicker footing → more concrete → higher cost
    expect(resultThicker.stages[0].stage_total).toBeGreaterThan(resultThinner.stages[0].stage_total);
  });

  it('DPM membrane uses dpm_per_m2 price (FIX: not dpc_per_meter)', () => {
    const inputWithHighDpm = createTestInput({
      prices: { ...DEFAULT_PRICES, dpm_per_m2: 5000 },
    });
    const inputWithLowDpm = createTestInput({
      prices: { ...DEFAULT_PRICES, dpm_per_m2: 100 },
    });
    const resultHigh = calculateBuildToRoof(inputWithHighDpm);
    const resultLow = calculateBuildToRoof(inputWithLowDpm);

    // Higher DPM price → higher ground floor cost
    expect(resultHigh.stages[1].stage_total).toBeGreaterThan(resultLow.stages[1].stage_total);
  });

  it('backfilling is calculated (FIX: added)', () => {
    const foundation = result.stages[0];
    const backfill = foundation.quantities.find(q => q.label === 'Backfilling volume');
    expect(backfill).toBeDefined();
    expect(backfill!.base_quantity).toBeGreaterThan(0);
  });

  it('compaction is calculated (FIX: added)', () => {
    const foundation = result.stages[0];
    const compaction = foundation.quantities.find(q => q.label === 'Compaction volume');
    expect(compaction).toBeDefined();
    expect(compaction!.base_quantity).toBeGreaterThan(0);
  });

  it('sand filling in ground floor stage (FIX: added)', () => {
    const groundFloor = result.stages[1];
    const sandFilling = groundFloor.quantities.find(q => q.label === 'Sand filling (under slab)');
    expect(sandFilling).toBeDefined();
    expect(sandFilling!.base_quantity).toBeGreaterThan(0);
  });
});

describe('calculateBuildToRoof — Duplex with structural schedule', () => {
  const structuralMembers: StructuralMemberInput[] = [
    {
      id: 'col1', type: 'column', label: 'Column C1',
      length: 3, width: 0.225, depth: 0.225, quantity: 20,
      bar_diameter_mm: 16, bar_count_main: 4, bar_count_links: 8,
      link_diameter_mm: 8, cover_mm: 25,
    },
    {
      id: 'beam1', type: 'ground_beam', label: 'Ground Beam B1',
      length: 50, width: 0.225, depth: 0.45, quantity: 1,
      bar_diameter_mm: 16, bar_count_main: 4, bar_count_links: 6,
      link_diameter_mm: 10, cover_mm: 25,
    },
    {
      id: 'slab1', type: 'slab', label: 'First Floor Slab',
      length: 15, width: 10, depth: 0.15, quantity: 1,
      bar_diameter_mm: 12, bar_count_main: 50, bar_count_links: 0,
      bar_length_main: 10, cover_mm: 20,
    },
  ];

  const input = createTestInput({
    building_type: 'duplex',
    number_of_floors: 2,
    structural_members: structuralMembers,
    has_engineer_schedule: true,
    floor_to_floor_height: 3.3,
  });
  const result = calculateBuildToRoof(input);

  it('has structural frame quantities', () => {
    expect(result.stages[3].materials.length).toBeGreaterThan(0);
    expect(result.stages[3].stage_total).toBeGreaterThan(0);
  });

  it('total floor area is doubled for 2 floors', () => {
    expect(result.total_floor_area).toBe(300);
  });

  it('confidence is moderate with dimensions + engineer schedule but no drawing', () => {
    expect(result.confidence).toBe('moderate');
  });

  it('wall area accounts for 2 floors', () => {
    const walls = result.stages[2];
    const ext = walls.quantities.find(q => q.label === 'External wall gross area');
    // perimeter = 2×(15+10) = 50, height = 3.3×2 = 6.6
    // area = 50 × 6.6 = 330
    expect(ext!.base_quantity).toBeCloseTo(330, 0);
  });

  it('reconciliation: grand total = materials + labour (incl. role-based) + contingency', () => {
    const base = result.materials_total + result.labour_total;
    const contingency = base * (input.contingency_percent / 100);
    expect(result.grand_total).toBeCloseTo(base + contingency, 0);
  });
});

describe('calculateBuildToRoof — Roofing material variations (FIX)', () => {
  it('stone coated sheets cost more than long span for same roof', () => {
    const longSpan = calculateBuildToRoof(createTestInput({ roofing_material: 'long_span_aluminium' }));
    const stoneCoated = calculateBuildToRoof(createTestInput({ roofing_material: 'stone_coated' }));

    const longSpanSheets = longSpan.stages[4].materials.find(m => m.label === 'Roofing sheets');
    const stoneCoatedSheets = stoneCoated.stages[4].materials.find(m => m.label === 'Roofing sheets');

    // Stone coated needs more sheets (smaller coverage per sheet)
    expect(stoneCoatedSheets!.base_quantity).toBeGreaterThan(longSpanSheets!.base_quantity);
  });
});

describe('calculateBuildToRoof — Edge cases', () => {
  it('handles zero contingency', () => {
    const input = createTestInput({ contingency_percent: 0 });
    const result = calculateBuildToRoof(input);
    expect(result.grand_total).toBeCloseTo(result.materials_total + result.labour_total, 0);
    expect(result.contingency).toBe(0);
  });

  it('handles flat roof', () => {
    const input = createTestInput({ roof_type: 'flat', roof_pitch_degrees: 0 });
    const result = calculateBuildToRoof(input);
    const roofArea = result.stages[4].quantities.find(q => q.label === 'Roof surface area');
    expect(roofArea).toBeDefined();
    expect(roofArea!.base_quantity).toBeCloseTo((15 + 1.2) * (10 + 1.2), 0);
  });

  it('handles no openings', () => {
    const input = createTestInput({ openings: [] });
    const result = calculateBuildToRoof(input);
    const walls = result.stages[2];
    const openingDeduction = walls.quantities.find(q => q.label === 'Opening deductions');
    expect(Math.abs(openingDeduction!.base_quantity)).toBe(0);
    expect(result.missing_info).toContain('Door/window openings not specified — wall quantities include the full gross area with no deductions.');
  });

  it('handles hip roof', () => {
    const input = createTestInput({ roof_type: 'hip' });
    const result = calculateBuildToRoof(input);
    const hipMat = result.stages[4].materials.find(m => m.label === 'Hip accessories');
    expect(hipMat).toBeDefined();
  });

  it('net wall area never goes negative (excessive openings)', () => {
    const input = createTestInput({
      openings: [
        { type: 'window', width: 10, height: 10, count: 100 }, // absurdly large
      ],
    });
    const result = calculateBuildToRoof(input);
    const walls = result.stages[2];
    const netArea = walls.quantities.find(q => q.label === 'Net wall area');
    expect(netArea!.base_quantity).toBeGreaterThanOrEqual(0);
    // Blocks should be 0 when net area is 0
    const blocks = walls.materials.find(m => m.label === 'Blocks (walls)');
    expect(blocks!.base_quantity).toBeGreaterThanOrEqual(0);
  });

  it('zero dimensions produce zero estimate', () => {
    const input = createTestInput({
      building_length: 0, building_width: 0, internal_wall_length: 0,
    });
    const result = calculateBuildToRoof(input);
    expect(result.total_floor_area).toBe(0);
    expect(result.confidence).toBe('preliminary');
  });
});


// ── Smart Adjustment Tests ──

describe('Smart Adjustments (Audit Phase)', () => {
  it('mortar volume scales with wall thickness', () => {
    const input225 = createTestInput({ wall_thickness: 0.225 });
    const input150 = createTestInput({ wall_thickness: 0.150 });
    const result225 = calculateBuildToRoof(input225);
    const result150 = calculateBuildToRoof(input150);

    const walls225 = result225.stages.find(s => s.stage === 'walls')!;
    const walls150 = result150.stages.find(s => s.stage === 'walls')!;

    const sand225 = walls225.materials.find(m => m.label.includes('Sand (wall mortar)'))!;
    const sand150 = walls150.materials.find(m => m.label.includes('Sand (wall mortar)'))!;

    // 150mm wall should use less mortar than 225mm
    expect(sand150.base_quantity).toBeLessThan(sand225.base_quantity);
  });

  it('sand filling thickness is configurable', () => {
    const inputDefault = createTestInput({});
    const inputThick = createTestInput({ sand_filling_thickness: 0.10 });

    const resultDefault = calculateBuildToRoof(inputDefault);
    const resultThick = calculateBuildToRoof(inputThick);

    const foundationDefault = resultDefault.stages.find(s => s.stage === 'site_preparation')!;
    const foundationThick = resultThick.stages.find(s => s.stage === 'site_preparation')!;

    const sandDefault = foundationDefault.materials.find(m => m.label.includes('Sand (filling)'))!;
    const sandThick = foundationThick.materials.find(m => m.label.includes('Sand (filling)'))!;

    // 100mm thickness should produce more sand volume than default 50mm
    expect(sandThick.base_quantity).toBeGreaterThan(sandDefault.base_quantity);
  });

  it('price freshness: age_days is calculated', () => {
    const input = createTestInput({
      prices: { ...DEFAULT_PRICES, price_date: '2026-01-01' },
    });
    const result = calculateBuildToRoof(input);
    expect(result.price_age_days).toBeGreaterThan(0);
  });

  it('price freshness: stale flag triggers when older than 30 days', () => {
    const input = createTestInput({
      prices: { ...DEFAULT_PRICES, price_date: '2026-01-01' },
    });
    const result = calculateBuildToRoof(input);
    expect(result.price_stale).toBe(true);
  });

  it('price freshness: stale flag false for recent prices', () => {
    const input = createTestInput({
      prices: { ...DEFAULT_PRICES, price_date: new Date().toISOString().split('T')[0] },
    });
    const result = calculateBuildToRoof(input);
    expect(result.price_stale).toBe(false);
    expect(result.price_age_days).toBeLessThanOrEqual(1);
  });

  it('default prices are realistic for Nigerian market (Aug 2026)', () => {
    // Cement should be between ₦7,000 and ₦15,000
    expect(DEFAULT_PRICES.cement_per_bag).toBeGreaterThanOrEqual(7000);
    expect(DEFAULT_PRICES.cement_per_bag).toBeLessThanOrEqual(15000);

    // Blocks should be between ₦250 and ₦700
    expect(DEFAULT_PRICES.block_per_piece).toBeGreaterThanOrEqual(250);
    expect(DEFAULT_PRICES.block_per_piece).toBeLessThanOrEqual(700);

    // Sand per m³ should be between ₦30,000 and ₦80,000
    expect(DEFAULT_PRICES.sand_per_m3).toBeGreaterThanOrEqual(30000);
    expect(DEFAULT_PRICES.sand_per_m3).toBeLessThanOrEqual(80000);

    // Granite per m³ should be between ₦70,000 and ₦150,000
    expect(DEFAULT_PRICES.granite_per_m3).toBeGreaterThanOrEqual(70000);
    expect(DEFAULT_PRICES.granite_per_m3).toBeLessThanOrEqual(150000);

    // Reinforcement per tonne should be between ₦900,000 and ₦1,800,000
    expect(DEFAULT_PRICES.reinforcement_per_tonne).toBeGreaterThanOrEqual(900000);
    expect(DEFAULT_PRICES.reinforcement_per_tonne).toBeLessThanOrEqual(1800000);
  });

  it('default labour rates are realistic for Nigerian market', () => {
    // Excavation per m³: ₦2,000–₦6,000
    expect(DEFAULT_LABOUR.excavation_per_m3).toBeGreaterThanOrEqual(2000);
    expect(DEFAULT_LABOUR.excavation_per_m3).toBeLessThanOrEqual(6000);

    // Blockwork per block: ₦100–₦300
    expect(DEFAULT_LABOUR.blockwork_per_block).toBeGreaterThanOrEqual(100);
    expect(DEFAULT_LABOUR.blockwork_per_block).toBeLessThanOrEqual(300);

    // Concrete per m³: ₦20,000–₦40,000
    expect(DEFAULT_LABOUR.concrete_per_m3).toBeGreaterThanOrEqual(20000);
    expect(DEFAULT_LABOUR.concrete_per_m3).toBeLessThanOrEqual(40000);
  });

  it('price scanner fallback prices are within market range', () => {
    // Import fallback prices
    // These should match the updated DEFAULT_PRICES
    expect(DEFAULT_PRICES.cement_per_bag).toBe(10000);
    expect(DEFAULT_PRICES.block_per_piece).toBe(450);
    expect(DEFAULT_PRICES.sand_per_m3).toBe(55000);
    expect(DEFAULT_PRICES.granite_per_m3).toBe(110000);
  });
});

// ── Trip-based sand/granite tests ──

describe('m3ToTrips', () => {
  it('converts m³ to trips correctly (3.5 m³ per trip)', () => {
    expect(m3ToTrips(3.5)).toBe(1);
    expect(m3ToTrips(7)).toBe(2);
    expect(m3ToTrips(1.75)).toBe(0.5);
  });

  it('handles zero', () => {
    expect(m3ToTrips(0)).toBe(0);
  });
});

describe('sand and granite in trips', () => {
  it('shopping list shows sand in trips (not m³)', () => {
    const input = createTestInput();
    const result = calculateBuildToRoof(input);
    const sandItem = result.shopping_list.find(m => m.label.toLowerCase().includes('sand'));
    expect(sandItem).toBeDefined();
    expect(sandItem!.unit).toBe('trips');
    expect(sandItem!.total_quantity).toBeGreaterThan(0);
    // Trip price should be the per-trip price, not per-m³
    expect(sandItem!.total_cost).toBeGreaterThan(0);
  });

  it('shopping list shows granite in trips (not m³)', () => {
    const input = createTestInput();
    const result = calculateBuildToRoof(input);
    const graniteItem = result.shopping_list.find(m => m.label.toLowerCase().includes('granite'));
    expect(graniteItem).toBeDefined();
    expect(graniteItem!.unit).toBe('trips');
    expect(graniteItem!.total_quantity).toBeGreaterThan(0);
  });

  it('trip quantity is rounded up to whole trips', () => {
    const input = createTestInput();
    const result = calculateBuildToRoof(input);
    const sandItem = result.shopping_list.find(m => m.label.toLowerCase().includes('sand'));
    // Trips should be a whole number (ceil)
    expect(sandItem!.total_quantity % 1).toBe(0);
  });

  it('hardcore also shows in trips', () => {
    const input = createTestInput();
    const result = calculateBuildToRoof(input);
    const hardcoreItem = result.shopping_list.find(m => m.label.toLowerCase().includes('hardcore'));
    if (hardcoreItem) {
      expect(hardcoreItem.unit).toBe('trips');
    }
  });
});

// ── Reinforcement breakdown tests ──

describe('buildReinforcementBreakdown', () => {
  it('splits reinforcement by bar diameter', () => {
    const members: StructuralMemberInput[] = [
      {
        id: 'col1',
        type: 'column',
        label: 'Column C1',
        length: 3,
        width: 0.225,
        depth: 0.225,
        quantity: 12,
        bar_diameter_mm: 16,
        bar_count_main: 4,
        bar_count_links: 8,
        link_diameter_mm: 8,
        cover_mm: 25,
      },
      {
        id: 'beam1',
        type: 'beam',
        label: 'Beam B1',
        length: 6,
        width: 0.225,
        depth: 0.3,
        quantity: 4,
        bar_diameter_mm: 20,
        bar_count_main: 5,
        bar_count_links: 6,
        link_diameter_mm: 10,
        cover_mm: 25,
      },
    ];

    const breakdown = buildReinforcementBreakdown(members, 3, DEFAULT_PRICES);

    // Should have entries for 16mm main, 8mm links, 20mm main, 10mm links
    expect(breakdown.items.length).toBeGreaterThanOrEqual(4);

    // Check 16mm main bars exist
    const bars16mm = breakdown.items.find(i => i.diameter_mm === 16 && i.source === 'main');
    expect(bars16mm).toBeDefined();
    expect(bars16mm!.standard_lengths).toBeGreaterThan(0);
    expect(bars16mm!.unit_price).toBe(DEFAULT_PRICES.rebar_16mm_per_length);

    // Check 20mm main bars exist
    const bars20mm = breakdown.items.find(i => i.diameter_mm === 20 && i.source === 'main');
    expect(bars20mm).toBeDefined();
    expect(bars20mm!.standard_lengths).toBeGreaterThan(0);
    expect(bars20mm!.unit_price).toBe(DEFAULT_PRICES.rebar_20mm_per_length);
  });

  it('each diameter uses its own price, not a global per-tonne rate', () => {
    const members: StructuralMemberInput[] = [
      {
        id: 'col1',
        type: 'column',
        label: 'Column C1',
        length: 3,
        width: 0.225,
        depth: 0.225,
        quantity: 12,
        bar_diameter_mm: 12,
        bar_count_main: 4,
        cover_mm: 25,
      },
      {
        id: 'col2',
        type: 'column',
        label: 'Column C2',
        length: 3,
        width: 0.225,
        depth: 0.225,
        quantity: 12,
        bar_diameter_mm: 25,
        bar_count_main: 4,
        cover_mm: 25,
      },
    ];

    const breakdown = buildReinforcementBreakdown(members, 3, DEFAULT_PRICES);

    const bars12mm = breakdown.items.find(i => i.diameter_mm === 12 && i.source === 'main');
    const bars25mm = breakdown.items.find(i => i.diameter_mm === 25 && i.source === 'main');

    expect(bars12mm).toBeDefined();
    expect(bars25mm).toBeDefined();

    // 12mm and 25mm must have different unit prices
    expect(bars12mm!.unit_price).toBe(DEFAULT_PRICES.rebar_12mm_per_length);
    expect(bars25mm!.unit_price).toBe(DEFAULT_PRICES.rebar_25mm_per_length);
    expect(bars12mm!.unit_price).not.toBe(bars25mm!.unit_price);
  });

  it('standard lengths are calculated as ceil(total_length / 12)', () => {
    const members: StructuralMemberInput[] = [
      {
        id: 'slab1',
        type: 'slab',
        label: 'Slab S1',
        length: 15,
        width: 10,
        depth: 0.15,
        quantity: 1,
        bar_diameter_mm: 12,
        bar_count_main: 50,
        bar_length_main: 10, // 50 × 10m = 500m total
        cover_mm: 25,
      },
    ];

    const breakdown = buildReinforcementBreakdown(members, 0, DEFAULT_PRICES);
    const bars12mm = breakdown.items.find(i => i.diameter_mm === 12 && i.source === 'main');

    expect(bars12mm).toBeDefined();
    // 500m / 12m = 41.67 → ceil = 42 lengths
    expect(bars12mm!.standard_lengths).toBe(42);
    expect(bars12mm!.total_length_m).toBe(500);
  });

  it('includes binding wire in breakdown', () => {
    const members: StructuralMemberInput[] = [
      {
        id: 'col1',
        type: 'column',
        label: 'Column C1',
        length: 3,
        width: 0.225,
        depth: 0.225,
        quantity: 12,
        bar_diameter_mm: 16,
        bar_count_main: 4,
        cover_mm: 25,
      },
    ];

    const breakdown = buildReinforcementBreakdown(members, 3, DEFAULT_PRICES);
    expect(breakdown.binding_wire_kg).toBeGreaterThan(0);
    expect(breakdown.binding_wire_cost).toBeGreaterThan(0);
  });

  it('handles empty members array', () => {
    const breakdown = buildReinforcementBreakdown([], 3, DEFAULT_PRICES);
    expect(breakdown.items).toHaveLength(0);
    expect(breakdown.total_weight_tonnes).toBe(0);
    expect(breakdown.total_cost).toBe(0);
  });

  it('falls back to per-tonne price for non-standard diameters', () => {
    const members: StructuralMemberInput[] = [
      {
        id: 'col1',
        type: 'column',
        label: 'Column C1',
        length: 3,
        width: 0.225,
        depth: 0.225,
        quantity: 1,
        bar_diameter_mm: 10, // non-standard (not 12/16/20/25)
        bar_count_main: 4,
        cover_mm: 25,
      },
    ];

    const breakdown = buildReinforcementBreakdown(members, 0, DEFAULT_PRICES);
    const item = breakdown.items.find(i => i.diameter_mm === 10);
    expect(item).toBeDefined();
    // Should estimate from per-tonne: weight per 12m = (10²/162) × 12 = 7.41 kg
    // price per length = 1350000/1000 × 7.41 = ₦10,030 (approx)
    expect(item!.unit_price).toBeGreaterThan(0);
  });
});

describe('reinforcement breakdown in full estimate', () => {
  it('result includes reinforcement_breakdown when structural members exist', () => {
    const input = createTestInput({
      has_engineer_schedule: true,
      structural_members: [
        {
          id: 'col1',
          type: 'column',
          label: 'Column C1',
          length: 3,
          width: 0.225,
          depth: 0.225,
          quantity: 12,
          bar_diameter_mm: 16,
          bar_count_main: 4,
          bar_count_links: 8,
          link_diameter_mm: 8,
          cover_mm: 25,
        },
      ],
    });
    const result = calculateBuildToRoof(input);
    expect(result.reinforcement_breakdown).toBeDefined();
    expect(result.reinforcement_breakdown!.items.length).toBeGreaterThan(0);
  });

  it('result reinforcement_breakdown is undefined when no structural members', () => {
    const input = createTestInput({ structural_members: [] });
    const result = calculateBuildToRoof(input);
    // No structural frame stage → no breakdown
    expect(result.reinforcement_breakdown).toBeUndefined();
  });

  it('default rebar prices are realistic for Nigerian market', () => {
    // 12mm: ₦5,000–₦15,000 per 12m length
    expect(DEFAULT_PRICES.rebar_12mm_per_length).toBeGreaterThanOrEqual(5000);
    expect(DEFAULT_PRICES.rebar_12mm_per_length).toBeLessThanOrEqual(15000);

    // 16mm: ₦10,000–₦25,000 per 12m length
    expect(DEFAULT_PRICES.rebar_16mm_per_length).toBeGreaterThanOrEqual(10000);
    expect(DEFAULT_PRICES.rebar_16mm_per_length).toBeLessThanOrEqual(25000);

    // 20mm: ₦18,000–₦35,000 per 12m length
    expect(DEFAULT_PRICES.rebar_20mm_per_length).toBeGreaterThanOrEqual(18000);
    expect(DEFAULT_PRICES.rebar_20mm_per_length).toBeLessThanOrEqual(35000);

    // 25mm: ₦30,000–₦50,000 per 12m length
    expect(DEFAULT_PRICES.rebar_25mm_per_length).toBeGreaterThanOrEqual(30000);
    expect(DEFAULT_PRICES.rebar_25mm_per_length).toBeLessThanOrEqual(50000);
  });
});
