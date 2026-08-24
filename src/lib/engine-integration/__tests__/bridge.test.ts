/**
 * Tests for Engine Integration Layer
 *
 * Tests the bridge functions that convert between
 * DB records and in-memory engine types.
 * Does NOT hit Supabase — tests pure transformation logic.
 */

import { describe, it, expect } from 'vitest';
import {
  dbProfileToMaterialSpec,
  dbProfilesToMaterialSpecs,
  dbWasteConfigsToWasteConfig,
  resolveWasteFromDb,
  dbSettingsToMap,
  getSetting,
  dbMetadataToReference,
  dbRoofMaterialToSpec,
  dbRoofMaterialsToSpecs,
  dbRoofSectionToConfig,
  dbRoofSectionsToConfigs,
  buildEngineMarketProfile,
} from '../bridge';
import type {
  EmMaterialProfile,
  EmWasteConfig,
  EmRoofMaterial,
  EmRoofSection,
  EmEngineSetting,
  EmRuleMetadata,
} from '@/types/engine-integration';
import { calculateMaterialQuantity } from '@/lib/measurement/material-engine';

// ============================================================
// FACTORIES
// ============================================================

function makeMaterialProfile(overrides: Partial<EmMaterialProfile> = {}): EmMaterialProfile {
  return {
    id: 'test-id',
    material_key: 'paint-test-20l',
    product_name: 'Test Paint',
    brand: 'TestBrand',
    category: 'paint',
    coverage_type: 'area',
    coverage_value: 35,
    coverage_unit: 'm2',
    coverage_coats: 2,
    coverage_basis: 'per_bucket',
    package_size: 20,
    package_unit: 'litres',
    quantity_unit: 'buckets',
    default_waste_percent: 10,
    min_waste_percent: 0,
    max_waste_percent: 50,
    market_code: 'NG',
    is_approved: true,
    approved_by: null,
    approved_at: null,
    is_active: true,
    sort_order: 0,
    notes: null,
    created_at: '2026-08-24T00:00:00Z',
    updated_at: '2026-08-24T00:00:00Z',
    ...overrides,
  };
}

function makeWasteConfig(overrides: Partial<EmWasteConfig> = {}): EmWasteConfig {
  return {
    id: 'wc-1',
    scope_level: 'global',
    country_code: null,
    market_code: null,
    material_category: null,
    rule_id: null,
    waste_percent: 10,
    is_override: false,
    source: 'frelux',
    description: 'Global default',
    is_active: true,
    created_at: '2026-08-24T00:00:00Z',
    updated_at: '2026-08-24T00:00:00Z',
    ...overrides,
  };
}

function makeRoofMaterial(overrides: Partial<EmRoofMaterial> = {}): EmRoofMaterial {
  return {
    id: 'rm-1',
    material_key: 'roof-sheet-1',
    material_name: 'Stone Coated Sheet',
    brand: 'RoofTech',
    category: 'roofing',
    coverage_type: 'area',
    coverage_value: 0.5,
    coverage_unit: 'm2',
    coverage_basis: 'per_sheet',
    package_size: 10,
    package_unit: 'sheets',
    quantity_unit: 'cartons',
    default_waste_percent: 5,
    market_code: 'NG',
    is_approved: true,
    is_active: true,
    sort_order: 0,
    notes: null,
    created_at: '2026-08-24T00:00:00Z',
    updated_at: '2026-08-24T00:00:00Z',
    ...overrides,
  };
}

function makeRoofSection(overrides: Partial<EmRoofSection> = {}): EmRoofSection {
  return {
    id: 'rs-1',
    section_key: 'gable-1',
    section_name: 'Gable Roof',
    roof_type: 'gable',
    pitch_type: 'ratio',
    pitch_value: 4,
    pitch_ratio_run: 12,
    is_flat: false,
    default_length: 10,
    default_width: 8,
    default_overhang: 0.15,
    area_factor: 1.054,
    market_code: 'NG',
    is_active: true,
    sort_order: 0,
    notes: null,
    created_at: '2026-08-24T00:00:00Z',
    updated_at: '2026-08-24T00:00:00Z',
    ...overrides,
  };
}

function makeEngineSetting(overrides: Partial<EmEngineSetting> = {}): EmEngineSetting {
  return {
    id: 'es-1',
    setting_key: 'default_waste_percent',
    setting_value: 10,
    setting_type: 'number',
    category: 'waste',
    description: 'Default waste percentage',
    is_editable: true,
    created_at: '2026-08-24T00:00:00Z',
    updated_at: '2026-08-24T00:00:00Z',
    ...overrides,
  };
}

function makeRuleMetadata(overrides: Partial<EmRuleMetadata> = {}): EmRuleMetadata {
  return {
    id: 'rm-1',
    rule_id: 'rule-painting-interior',
    rule_name: 'Interior Painting Rule',
    rule_version: '1.0.0',
    source_type: 'frelux',
    source_name: 'FRELUX Engineering',
    source_url: null,
    source_date: null,
    reference_doc: null,
    reference_page: null,
    reference_author: null,
    is_verified: true,
    verified_by: null,
    verified_at: null,
    is_active: true,
    notes: 'Default rule',
    created_at: '2026-08-24T00:00:00Z',
    updated_at: '2026-08-24T00:00:00Z',
    ...overrides,
  };
}

// ============================================================
// MATERIAL PROFILE → MATERIAL SPEC
// ============================================================

describe('Material Profile Bridge', () => {
  it('converts a DB profile to a MaterialSpec', () => {
    const profile = makeMaterialProfile();
    const spec = dbProfileToMaterialSpec(profile);

    expect(spec.id).toBe('paint-test-20l');
    expect(spec.productName).toBe('Test Paint');
    expect(spec.brand).toBe('TestBrand');
    expect(spec.category).toBe('paint');
    expect(spec.isApproved).toBe(true);
  });

  it('preserves coverage values', () => {
    const profile = makeMaterialProfile({ coverage_value: 40, coverage_coats: 3 });
    const spec = dbProfileToMaterialSpec(profile);

    expect(spec.coverage.value).toBe(40);
    expect(spec.coverage.coats).toBe(3);
  });

  it('preserves waste percentage', () => {
    const profile = makeMaterialProfile({ default_waste_percent: 15 });
    const spec = dbProfileToMaterialSpec(profile);

    expect(spec.defaultWastePercent).toBe(15);
  });

  it('converts multiple profiles, filtering inactive', () => {
    const profiles = [
      makeMaterialProfile({ material_key: 'a', is_active: true }),
      makeMaterialProfile({ material_key: 'b', is_active: false }),
      makeMaterialProfile({ material_key: 'c', is_active: true }),
    ];
    const specs = dbProfilesToMaterialSpecs(profiles);
    expect(specs.length).toBe(2);
  });

  it('produces a spec that works with the material engine', () => {
    const profile = makeMaterialProfile({
      coverage_value: 35,
      coverage_coats: 2,
      package_size: 20,
      quantity_unit: 'buckets',
    });
    const spec = dbProfileToMaterialSpec(profile);
    const result = calculateMaterialQuantity(100, spec, 2, 10);

    expect(result.purchaseQuantity).toBeGreaterThan(0);
    expect(result.quantityUnit).toBe('buckets');
  });
});

// ============================================================
// WASTE CONFIG BRIDGE
// ============================================================

describe('Waste Config Bridge', () => {
  it('builds a WasteConfig from DB entries', () => {
    const configs = [
      makeWasteConfig({ scope_level: 'global', waste_percent: 10 }),
      makeWasteConfig({ scope_level: 'country', country_code: 'NG', waste_percent: 8 }),
    ];
    const config = dbWasteConfigsToWasteConfig(configs, 'NG');

    expect(config.globalDefault).toBe(10);
    expect(config.byCountry.NG).toBe(8);
  });

  it('resolves waste from DB configs (country overrides global)', () => {
    const configs = [
      makeWasteConfig({ scope_level: 'global', waste_percent: 10 }),
      makeWasteConfig({ scope_level: 'country', country_code: 'NG', waste_percent: 7 }),
    ];
    const resolution = resolveWasteFromDb(configs, 'NG');
    expect(resolution.wastePercent).toBe(7);
    expect(resolution.source).toBe('country');
  });

  it('falls back to global when country not found', () => {
    const configs = [
      makeWasteConfig({ scope_level: 'global', waste_percent: 12 }),
    ];
    const resolution = resolveWasteFromDb(configs, 'GH');
    expect(resolution.wastePercent).toBe(12);
    expect(resolution.source).toBe('global_default');
  });

  it('user override takes highest priority', () => {
    const configs = [
      makeWasteConfig({ scope_level: 'global', waste_percent: 10 }),
      makeWasteConfig({ scope_level: 'country', country_code: 'NG', waste_percent: 7 }),
    ];
    const resolution = resolveWasteFromDb(configs, 'NG', undefined, 15);
    expect(resolution.wastePercent).toBe(15);
    expect(resolution.source).toBe('user');
    expect(resolution.isOverride).toBe(true);
  });

  it('handles market-level configs', () => {
    const configs = [
      makeWasteConfig({ scope_level: 'global', waste_percent: 10 }),
      makeWasteConfig({ scope_level: 'market', market_code: 'NG-PH', waste_percent: 9 }),
    ];
    const resolution = resolveWasteFromDb(configs, 'NG', 'NG-PH');
    expect(resolution.wastePercent).toBe(9);
    expect(resolution.source).toBe('market');
  });
});

// ============================================================
// ENGINE SETTINGS BRIDGE
// ============================================================

describe('Engine Settings Bridge', () => {
  it('builds a settings map from DB entries', () => {
    const settings = [
      makeEngineSetting({ setting_key: 'default_waste_percent', setting_value: 10 }),
      makeEngineSetting({ setting_key: 'default_currency', setting_value: 'NGN' }),
    ];
    const map = dbSettingsToMap(settings);
    expect(map.get('default_waste_percent')).toBe(10);
    expect(map.get('default_currency')).toBe('NGN');
  });

  it('gets setting with default', () => {
    const map = new Map([['a', 1]]);
    expect(getSetting(map, 'a', 0)).toBe(1);
    expect(getSetting(map, 'b', 42)).toBe(42);
    expect(getSetting(map, 'b', 'default')).toBe('default');
  });
});

// ============================================================
// RULE METADATA BRIDGE
// ============================================================

describe('Rule Metadata Bridge', () => {
  it('converts DB metadata to a reference object', () => {
    const meta = makeRuleMetadata({
      rule_id: 'rule-test',
      rule_name: 'Test Rule',
      rule_version: '2.0.0',
      source_type: 'industry_standard',
      source_name: 'NBS',
      is_verified: true,
    });
    const ref = dbMetadataToReference(meta);

    expect(ref.ruleId).toBe('rule-test');
    expect(ref.ruleName).toBe('Test Rule');
    expect(ref.version).toBe('2.0.0');
    expect(ref.source).toBe('industry_standard');
    expect(ref.sourceName).toBe('NBS');
    expect(ref.isVerified).toBe(true);
  });

  it('includes reference document info when present', () => {
    const meta = makeRuleMetadata({
      reference_doc: 'Building Code 2026',
      reference_page: '45',
      reference_author: 'NIA',
    });
    const ref = dbMetadataToReference(meta);

    expect(ref.reference).toBeDefined();
    expect(ref.reference?.document).toBe('Building Code 2026');
    expect(ref.reference?.page).toBe('45');
    expect(ref.reference?.author).toBe('NIA');
  });
});

// ============================================================
// ROOF MATERIAL BRIDGE
// ============================================================

describe('Roof Material Bridge', () => {
  it('converts a DB roof material to a MaterialSpec', () => {
    const material = makeRoofMaterial();
    const spec = dbRoofMaterialToSpec(material);

    expect(spec.id).toBe('roof-sheet-1');
    expect(spec.productName).toBe('Stone Coated Sheet');
    expect(spec.brand).toBe('RoofTech');
    expect(spec.category).toBe('roofing');
    expect(spec.isApproved).toBe(true);
  });

  it('converts multiple roof materials, filtering inactive', () => {
    const materials = [
      makeRoofMaterial({ material_key: 'a', is_active: true }),
      makeRoofMaterial({ material_key: 'b', is_active: false }),
    ];
    const specs = dbRoofMaterialsToSpecs(materials);
    expect(specs.length).toBe(1);
  });
});

// ============================================================
// ROOF SECTION BRIDGE
// ============================================================

describe('Roof Section Bridge', () => {
  it('converts a DB roof section to a config object', () => {
    const section = makeRoofSection();
    const config = dbRoofSectionToConfig(section);

    expect(config.sectionKey).toBe('gable-1');
    expect(config.sectionName).toBe('Gable Roof');
    expect(config.roofType).toBe('gable');
    expect(config.pitch.type).toBe('ratio');
    expect(config.pitch.value).toBe(4);
    expect(config.pitch.ratioRun).toBe(12);
    expect(config.pitch.isFlat).toBe(false);
    expect(config.areaFactor).toBe(1.054);
  });

  it('converts multiple roof sections, filtering inactive', () => {
    const sections = [
      makeRoofSection({ section_key: 'a', is_active: true }),
      makeRoofSection({ section_key: 'b', is_active: false }),
      makeRoofSection({ section_key: 'c', is_active: true }),
    ];
    const configs = dbRoofSectionsToConfigs(sections);
    expect(configs.length).toBe(2);
  });

  it('preserves flat roof flag', () => {
    const section = makeRoofSection({ is_flat: true, pitch_type: 'flat', pitch_value: null });
    const config = dbRoofSectionToConfig(section);
    expect(config.pitch.isFlat).toBe(true);
    expect(config.pitch.value).toBeNull();
  });
});

// ============================================================
// MARKET PROFILE BUILDER
// ============================================================

describe('Engine Market Profile Builder', () => {
  it('builds a Nigeria market profile from settings', () => {
    const settings = dbSettingsToMap([
      makeEngineSetting({ setting_key: 'default_length_unit', setting_value: 'meters' }),
      makeEngineSetting({ setting_key: 'default_waste_percent', setting_value: 10 }),
    ]);
    const profile = buildEngineMarketProfile('NG', settings);

    expect(profile.marketCode).toBe('NG');
    expect(profile.marketName).toBe('Nigeria');
    expect(profile.currency).toBe('NGN');
    expect(profile.currencySymbol).toBe('₦');
    expect(profile.isActive).toBe(true);
    expect(profile.defaultLengthUnit).toBe('meters');
    expect(profile.defaultWastePercent).toBe(10);
  });

  it('builds a Ghana market profile (inactive)', () => {
    const settings = new Map<string, unknown>();
    const profile = buildEngineMarketProfile('GH', settings);

    expect(profile.marketCode).toBe('GH');
    expect(profile.marketName).toBe('Ghana');
    expect(profile.currency).toBe('GHS');
    expect(profile.isActive).toBe(false); // Ghana is NOT active
  });

  it('builds a Kenya market profile (inactive)', () => {
    const settings = new Map<string, unknown>();
    const profile = buildEngineMarketProfile('KE', settings);

    expect(profile.marketCode).toBe('KE');
    expect(profile.currency).toBe('KES');
    expect(profile.isActive).toBe(false); // Kenya is NOT active
  });

  it('only Nigeria is active', () => {
    const settings = new Map<string, unknown>();
    const ng = buildEngineMarketProfile('NG', settings);
    const gh = buildEngineMarketProfile('GH', settings);
    const ke = buildEngineMarketProfile('KE', settings);

    expect(ng.isActive).toBe(true);
    expect(gh.isActive).toBe(false);
    expect(ke.isActive).toBe(false);
  });
});

// ============================================================
// INTEGRATION: END-TO-END FLOW
// ============================================================

describe('Integration: DB → Engine → Calculation', () => {
  it('can run a full calculation from DB-stored configs', () => {
    // 1. DB material profile
    const profile = makeMaterialProfile({
      coverage_value: 35,
      coverage_coats: 2,
      quantity_unit: 'buckets',
      default_waste_percent: 10,
      is_approved: true,
    });

    // 2. Convert to engine MaterialSpec
    const spec = dbProfileToMaterialSpec(profile);

    // 3. DB waste config
    const wasteConfigs = [
      makeWasteConfig({ scope_level: 'global', waste_percent: 10 }),
      makeWasteConfig({ scope_level: 'country', country_code: 'NG', waste_percent: 10 }),
    ];
    const wasteResolution = resolveWasteFromDb(wasteConfigs, 'NG');

    // 4. Run calculation
    const calcResult = calculateMaterialQuantity(100, spec, 2, wasteResolution.wastePercent);

    // 5. Verify
    expect(calcResult.purchaseQuantity).toBeGreaterThan(0);
    expect(calcResult.quantityUnit).toBe('buckets');
    expect(wasteResolution.source).toBe('country');
  });

  it('respects admin-set waste overrides', () => {
    const profile = makeMaterialProfile({ default_waste_percent: 10 });
    const spec = dbProfileToMaterialSpec(profile);

    // Admin set a market-level waste of 15%
    const wasteConfigs = [
      makeWasteConfig({ scope_level: 'global', waste_percent: 10 }),
      makeWasteConfig({ scope_level: 'country', country_code: 'NG', waste_percent: 10 }),
      makeWasteConfig({ scope_level: 'market', market_code: 'NG-Lagos', waste_percent: 15 }),
    ];

    const resolution = resolveWasteFromDb(wasteConfigs, 'NG', 'NG-Lagos');

    // 100 / 35 = 2.857 (with 2 coats)
    // 2.857 * 1.15 = 3.286
    // ceil(3.286) = 4
    const result = calculateMaterialQuantity(100, spec, 2, resolution.wastePercent);

    expect(resolution.wastePercent).toBe(15);
    expect(resolution.source).toBe('market');
    expect(result.purchaseQuantity).toBeGreaterThan(0);
  });
});
