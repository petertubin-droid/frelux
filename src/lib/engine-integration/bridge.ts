/**
 * FRELUX Engine Integration — Configuration Bridge
 *
 * Bridges between the measurement engine's in-memory types
 * and the database-stored configurations (em_* tables).
 *
 * The admin panel writes configs to the DB via queries.ts.
 * This bridge reads those configs and builds engine objects
 * (MaterialSpec, WasteConfig, MarketProfile, etc.) from them.
 *
 * This is the "control layer" — the admin manages configs in the DB,
 * and the engine reads them through this bridge.
 */

import type { MaterialSpec } from '@/lib/measurement/material-engine';
import type { WasteConfig } from '@/lib/measurement/waste-config';
import type { WasteResolution } from '@/lib/measurement/waste-config';
import type { MarketProfile as EngineMarketProfile } from '@/lib/measurement/market-profile';
import type {
  EmMaterialProfile,
  EmWasteConfig,
  EmRoofMaterial,
  EmRoofSection,
  EmEngineSetting,
  EmRuleMetadata,
} from '@/types/engine-integration';
import { createMaterialSpec } from '@/lib/measurement/material-engine';
import { createWasteConfig, resolveWaste } from '@/lib/measurement/waste-config';

// ============================================================
// MATERIAL PROFILE → MATERIAL SPEC
// ============================================================

/**
 * Convert a DB material profile to an engine MaterialSpec.
 */
export function dbProfileToMaterialSpec(profile: EmMaterialProfile): MaterialSpec {
  const spec = createMaterialSpec({
    productName: profile.product_name,
    brand: profile.brand ?? undefined,
    category: profile.category,
    quantityUnit: profile.quantity_unit as any,
    coverage: {
      type: profile.coverage_type as any,
      value: profile.coverage_value,
      unit: profile.coverage_unit as any,
      coats: profile.coverage_coats,
    },
    defaultWastePercent: profile.default_waste_percent,
    isApproved: profile.is_approved,
  });
  return { ...spec, id: profile.material_key };
}

/**
 * Convert multiple DB profiles to MaterialSpec array.
 */
export function dbProfilesToMaterialSpecs(profiles: EmMaterialProfile[]): MaterialSpec[] {
  return profiles
    .filter((p) => p.is_active)
    .map(dbProfileToMaterialSpec);
}

// ============================================================
// WASTE CONFIG DB → WASTE CONFIG
// ============================================================

/**
 * Build a WasteConfig from DB waste config entries.
 * Resolves the hierarchy: global → country → market → category.
 */
export function dbWasteConfigsToWasteConfig(
  configs: EmWasteConfig[],
  countryCode: string = 'NG',
  marketCode?: string,
): WasteConfig {
  const globalDefault = configs.find((c) => c.scope_level === 'global');
  const countryConfig = configs.find(
    (c) => c.scope_level === 'country' && c.country_code === countryCode
  );

  const byCountry: Record<string, number> = {};
  if (countryConfig) {
    byCountry[countryCode] = countryConfig.waste_percent;
  }

  const byMarket: Record<string, number> = {};
  for (const c of configs) {
    if (c.scope_level === 'market' && c.market_code) {
      byMarket[c.market_code] = c.waste_percent;
    }
  }

  return createWasteConfig({
    globalDefault: globalDefault?.waste_percent ?? 10,
    byCountry,
    byMarket,
  });
}

/**
 * Resolve waste for a specific context using DB configs.
 */
export function resolveWasteFromDb(
  configs: EmWasteConfig[],
  countryCode?: string,
  marketCode?: string,
  userWastePercent?: number,
): WasteResolution {
  const config = dbWasteConfigsToWasteConfig(configs, countryCode, marketCode);
  return resolveWaste(config, countryCode, marketCode, userWastePercent);
}

// ============================================================
// ENGINE SETTINGS → CONFIG MAP
// ============================================================

/**
 * Build a settings map from DB engine settings.
 */
export function dbSettingsToMap(settings: EmEngineSetting[]): Map<string, unknown> {
  const map = new Map<string, unknown>();
  for (const s of settings) {
    map.set(s.setting_key, s.setting_value);
  }
  return map;
}

/**
 * Get a setting value with a default.
 */
export function getSetting<T>(
  settings: Map<string, unknown>,
  key: string,
  defaultValue: T,
): T {
  const value = settings.get(key);
  if (value === undefined || value === null) return defaultValue;
  return value as T;
}

// ============================================================
// RULE METADATA → TRACEABLE REFERENCE
// ============================================================

/**
 * Build a rule metadata reference object from DB records.
 * This links engine rules to their source documentation.
 */
export function dbMetadataToReference(meta: EmRuleMetadata) {
  return {
    ruleId: meta.rule_id,
    ruleName: meta.rule_name,
    version: meta.rule_version,
    source: meta.source_type,
    sourceName: meta.source_name,
    sourceUrl: meta.source_url,
    sourceDate: meta.source_date,
    reference: meta.reference_doc
      ? {
          document: meta.reference_doc,
          page: meta.reference_page,
          author: meta.reference_author,
        }
      : undefined,
    isVerified: meta.is_verified,
    notes: meta.notes,
  };
}

// ============================================================
// ROOF MATERIAL → MATERIAL SPEC
// ============================================================

/**
 * Convert a DB roof material to an engine MaterialSpec.
 */
export function dbRoofMaterialToSpec(material: EmRoofMaterial): MaterialSpec {
  const spec = createMaterialSpec({
    productName: material.material_name,
    brand: material.brand ?? undefined,
    category: material.category,
    quantityUnit: material.quantity_unit as any,
    coverage: {
      type: material.coverage_type as any,
      value: material.coverage_value,
      unit: material.coverage_unit as any,
      coats: 1,
    },
    defaultWastePercent: material.default_waste_percent,
    isApproved: material.is_approved,
  });
  return { ...spec, id: material.material_key };
}

/**
 * Convert multiple DB roof materials to MaterialSpec array.
 */
export function dbRoofMaterialsToSpecs(materials: EmRoofMaterial[]): MaterialSpec[] {
  return materials
    .filter((m) => m.is_active)
    .map(dbRoofMaterialToSpec);
}

// ============================================================
// ROOF SECTION → CONFIG OBJECT
// ============================================================

/**
 * Convert a DB roof section to a config object.
 */
export function dbRoofSectionToConfig(section: EmRoofSection) {
  return {
    sectionKey: section.section_key,
    sectionName: section.section_name,
    roofType: section.roof_type,
    pitch: {
      type: section.pitch_type,
      value: section.pitch_value,
      ratioRun: section.pitch_ratio_run,
      isFlat: section.is_flat,
    },
    defaults: {
      length: section.default_length,
      width: section.default_width,
      overhang: section.default_overhang,
    },
    areaFactor: section.area_factor,
    marketCode: section.market_code,
  };
}

/**
 * Convert multiple DB roof sections to config objects.
 */
export function dbRoofSectionsToConfigs(sections: EmRoofSection[]) {
  return sections
    .filter((s) => s.is_active)
    .map(dbRoofSectionToConfig);
}

// ============================================================
// ENGINE MARKET PROFILE BUILDER
// ============================================================

/**
 * Build an engine MarketProfile from DB settings.
 * This creates the in-memory market profile that the engine uses.
 */
export function buildEngineMarketProfile(
  countryCode: string,
  settings: Map<string, unknown>,
): EngineMarketProfile {
  const marketNames: Record<string, string> = {
    NG: 'Nigeria',
    GH: 'Ghana',
    KE: 'Kenya',
  };

  const currencies: Record<string, { code: string; symbol: string }> = {
    NG: { code: 'NGN', symbol: '₦' },
    GH: { code: 'GHS', symbol: '₵' },
    KE: { code: 'KES', symbol: 'KSh' },
  };

  const currency = currencies[countryCode] ?? { code: 'NGN', symbol: '₦' };
  const wastePercent = getSetting(settings, 'default_waste_percent', 10);

  return {
    marketCode: countryCode,
    marketName: marketNames[countryCode] ?? countryCode,
    unitSystem: 'metric',
    defaultLengthUnit: getSetting(settings, 'default_length_unit', 'meters'),
    currency: currency.code,
    currencySymbol: currency.symbol,
    defaultWastePercent: wastePercent,
    defaultPackageSizes: {},
    defaultCoverage: {},
    ruleIds: [],
    isActive: countryCode === 'NG', // Only Nigeria is active
    locale: `en-${countryCode}`,
  };
}
