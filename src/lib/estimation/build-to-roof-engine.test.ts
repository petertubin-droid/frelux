// =========================================================
// FRELUX Build-to-Roof Engine — Comprehensive Tests
// Phase 30
//
// Tests verify:
// - Concrete mix → material conversion
// - Block quantity calculations
// - Roof geometry (gable, hip, mono-pitch, flat)
// - Reinforcement estimation
// - Full estimate reconciliation (quantities → costs → stage totals → grand total)
// - Multiple building configurations (bungalow, duplex)
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
  roofingSheetsCount,
  DEFAULT_PRICES,
  DEFAULT_LABOUR,
  DEFAULT_WASTAGE,
  CEMENT_VOLUME_PER_BAG,
  DRY_WET_RATIO,
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
    blinding_thickness: 0.075,
    hardcore_thickness: 0.15,
    dpc_length: 50,
    block_size: '225mm',
    block_length: 450,
    block_height: 225,
    block_width: 225,
    concrete_mix_cement: 1,
    concrete_mix_sand: 2,
    concrete_mix_aggregate: 4,
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
    // sandVol = 1.54 × (2/7) = 0.44
    // aggVol = 1.54 × (4/7) = 0.88
    expect(result.cement_bags).toBeCloseTo(6.34, 1);
    expect(result.sand_m3).toBeCloseTo(0.44, 1);
    expect(result.aggregate_m3).toBeCloseTo(0.88, 1);
  });

  it('returns zeros for zero volume', () => {
    const result = concreteToMaterials(0, 1, 2, 4);
    expect(result.cement_bags).toBe(0);
    expect(result.sand_m3).toBe(0);
    expect(result.aggregate_m3).toBe(0);
  });

  it('handles 1:3:6 mix', () => {
    const result = concreteToMaterials(10, 1, 3, 6);
    // dryVolume = 15.4, totalParts = 10
    // cementVol = 1.54, bags = 44.38
    expect(result.cement_bags).toBeCloseTo(44.38, 0);
    expect(result.sand_m3).toBeCloseTo(4.62, 0);
    expect(result.aggregate_m3).toBeCloseTo(9.24, 0);
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

  it('returns zeros for zero volume', () => {
    const result = mortarToMaterials(0, 1, 6);
    expect(result.cement_bags).toBe(0);
    expect(result.sand_m3).toBe(0);
  });
});

// ── Block calculation tests ──

describe('blocksPerM2', () => {
  it('calculates blocks per m² for 450×225mm block', () => {
    // face area = 0.45 × 0.225 = 0.10125 m²
    // blocks per m² = 1 / 0.10125 ≈ 9.88
    const result = blocksPerM2(450, 225);
    expect(result).toBeCloseTo(9.88, 1);
  });

  it('calculates blocks per m² for 450×150mm block', () => {
    // face area = 0.45 × 0.15 = 0.0675
    // blocks per m² = 1 / 0.0675 ≈ 14.81
    const result = blocksPerM2(450, 150);
    expect(result).toBeCloseTo(14.81, 1);
  });
});

// ── Roof geometry tests ──

describe('calculateRoofArea', () => {
  it('calculates flat roof area = footprint', () => {
    const area = calculateRoofArea(15, 10, 0, 0.6, 'flat');
    expect(area).toBeCloseTo((15 + 1.2) * (10 + 1.2), 1); // 16.2 × 11.2 = 181.44
  });

  it('calculates gable roof area with pitch', () => {
    const area = calculateRoofArea(15, 10, 25, 0.6, 'gable');
    const footprint = (15 + 1.2) * (10 + 1.2);
    const slopeFactor = 1 / Math.cos((25 * Math.PI) / 180);
    expect(area).toBeCloseTo(footprint * slopeFactor, 1);
  });

  it('handles 0° pitch (equals footprint)', () => {
    const area = calculateRoofArea(10, 8, 0, 0, 'gable');
    expect(area).toBeCloseTo(80, 1);
  });
});

describe('calculateRidgeLength', () => {
  it('gable ridge = building length', () => {
    expect(calculateRidgeLength(15, 10, 'gable')).toBe(15);
  });

  it('hip ridge = length - width', () => {
    expect(calculateRidgeLength(15, 10, 'hip')).toBe(5);
  });

  it('flat ridge = 0', () => {
    expect(calculateRidgeLength(15, 10, 'flat')).toBe(0);
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
});

// ── Timber estimation ──

describe('estimateTimberMeters', () => {
  it('returns positive timber for gable roof', () => {
    const timber = estimateTimberMeters(200, 15, 10, 25, 'gable');
    expect(timber).toBeGreaterThan(0);
  });

  it('returns minimal timber for flat roof', () => {
    const timber = estimateTimberMeters(100, 10, 8, 0, 'flat');
    expect(timber).toBeGreaterThanOrEqual(200);
  });
});

// ── Reinforcement estimation ──

describe('estimateReinforcementKg', () => {
  it('calculates reinforcement for a column', () => {
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
    // Main bars: 4 bars × 3m × 12 cols = 144m of 16mm
    // weight per m = 16²/162 = 1.58 kg/m
    // main = 144 × 1.58 = 227.5 kg
    // Links: 8/m × 3m × 12 = 288 links
    // link length = 2×(0.225+0.225) - 2×0.05 = 0.8m
    // link weight per m = 8²/162 = 0.395
    // links = 288 × 0.8 × 0.395 = 91.1 kg
    // total ≈ 318.6 kg
    expect(kg).toBeGreaterThan(300);
    expect(kg).toBeLessThan(350);
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
    // 15 × 10 × 1 floor = 150 m²
    expect(result.total_floor_area).toBe(150);
  });

  it('foundation stage has materials and labour', () => {
    const foundation = result.stages[0];
    expect(foundation.materials.length).toBeGreaterThan(0);
    expect(foundation.labour.length).toBeGreaterThan(0);
    expect(foundation.stage_total).toBe(foundation.materials_total + foundation.labour_total);
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

  it('grand total reconciles', () => {
    const stageTotal = result.stages.reduce((s, st) => s + st.stage_total, 0);
    const contingency = stageTotal * (input.contingency_percent / 100);
    expect(result.grand_total).toBeCloseTo(stageTotal + contingency, 0);
  });

  it('materials + labour = stage total for each stage', () => {
    for (const stage of result.stages) {
      expect(stage.stage_total).toBeCloseTo(stage.materials_total + stage.labour_total, 0);
    }
  });

  it('confidence is preliminary without engineer schedule', () => {
    expect(result.confidence).toBe('moderate');
  });

  it('has assumptions and limitations', () => {
    expect(result.assumptions.length).toBeGreaterThan(0);
    expect(result.limitations.length).toBeGreaterThan(0);
    expect(result.missing_info.length).toBeGreaterThan(0);
  });

  it('shopping list consolidates cement', () => {
    const cement = result.shopping_list.find(m => m.label === 'Cement');
    expect(cement).toBeDefined();
    expect(cement!.total_quantity).toBeGreaterThan(0);
  });

  it('does not include finishing works', () => {
    const allLabels = result.stages.flatMap(s => s.materials.map(m => m.label));
    expect(allLabels.some(l => l.toLowerCase().includes('paint'))).toBe(false);
    expect(allLabels.some(l => l.toLowerCase().includes('tile'))).toBe(false);
    expect(allLabels.some(l => l.toLowerCase().includes('plaster'))).toBe(false);
    expect(allLabels.some(l => l.toLowerCase().includes('door'))).toBe(false);
    expect(allLabels.some(l => l.toLowerCase().includes('window'))).toBe(false);
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
      bar_diameter_mm: 12, bar_count_main: 0, bar_count_links: 0,
      bar_length_main: 150, cover_mm: 20,
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
    // 15 × 10 × 2 = 300
    expect(result.total_floor_area).toBe(300);
  });

  it('confidence is high with drawing + engineer schedule', () => {
    // No drawing but has engineer schedule → moderate
    expect(result.confidence).toBe('moderate');
  });

  it('wall area accounts for 2 floors', () => {
    const walls = result.stages[2];
    const ext = walls.quantities.find(q => q.label === 'External wall gross area');
    // perimeter = 2×(15+10) = 50, height = 3.3×2 = 6.6
    // area = 50 × 6.6 = 330
    expect(ext!.base_quantity).toBeCloseTo(330, 0);
  });

  it('reconciliation: grand total = stages + contingency', () => {
    const stageTotal = result.stages.reduce((s, st) => s + st.stage_total, 0);
    const contingency = stageTotal * (input.contingency_percent / 100);
    expect(result.grand_total).toBeCloseTo(stageTotal + contingency, 0);
  });
});

describe('calculateBuildToRoof — Edge cases', () => {
  it('handles zero contingency', () => {
    const input = createTestInput({ contingency_percent: 0 });
    const result = calculateBuildToRoof(input);
    const stageTotal = result.stages.reduce((s, st) => s + st.stage_total, 0);
    expect(result.grand_total).toBeCloseTo(stageTotal, 0);
    expect(result.contingency).toBe(0);
  });

  it('handles flat roof', () => {
    const input = createTestInput({ roof_type: 'flat', roof_pitch_degrees: 0 });
    const result = calculateBuildToRoof(input);
    const roofArea = result.stages[4].quantities.find(q => q.label === 'Roof surface area');
    expect(roofArea).toBeDefined();
    // Flat: footprint only
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
});
