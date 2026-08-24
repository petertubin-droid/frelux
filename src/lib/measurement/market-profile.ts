/**
 * FRELUX INTERNATIONAL ARCHITECTURE
 *
 * Feature 16 of 16: International Architecture
 *
 * The system uses a market profile configuration that:
 * - Defines market-specific units, currency, and rules
 * - Keeps calculation geometry separate from market-specific rules
 * - Uses Nigeria as the default market profile
 * - Enables future African markets through configuration, not code changes
 * - Allows each market to have its own:
 *   - Default units (metric/imperial)
 *   - Currency
 *   - Waste defaults
 *   - Material package sizes
 *   - Rule sets (via rule registry)
 *
 * The architecture is configuration-driven:
 * - MarketProfile defines a market's characteristics
 * - No hardcoded market logic in the calculation engines
 * - New markets are added by creating a new profile, not changing code
 */

// =========================================================
// MARKET PROFILE
// =========================================================

/**
 * The unit system used by a market.
 */
export type UnitSystem = 'metric' | 'imperial' | 'mixed';

/**
 * A market profile that defines a market's characteristics.
 * This is configuration, not code — new markets are added by
 * creating new profiles.
 */
export interface MarketProfile {
  /** Market code (ISO country code or custom code) */
  marketCode: string;
  /** Market name */
  marketName: string;
  /** Default unit system */
  unitSystem: UnitSystem;
  /** Default length unit */
  defaultLengthUnit: string;
  /** Default currency code */
  currency: string;
  /** Currency symbol */
  currencySymbol: string;
  /** Default waste percentage */
  defaultWastePercent: number;
  /** Default package sizes by material category */
  defaultPackageSizes: Record<string, { size: number; unit: string }>;
  /** Default coverage rates by material category (m² per package) */
  defaultCoverage: Record<string, number>;
  /** Rule IDs for this market (references rule registry) */
  ruleIds: string[];
  /** Whether this market is active */
  isActive: boolean;
  /** Locale for formatting */
  locale: string;
}

// =========================================================
// MARKET PROFILE REGISTRY
// =========================================================

/**
 * A registry of market profiles.
 * The system looks up the active profile by market code.
 */
export interface MarketProfileRegistry {
  /** All registered profiles */
  profiles: Map<string, MarketProfile>;
  /** The default market code */
  defaultMarketCode: string;
}

/**
 * Create a market profile registry.
 */
export function createMarketProfileRegistry(
  defaultMarketCode: string = 'NG',
): MarketProfileRegistry {
  return {
    profiles: new Map(),
    defaultMarketCode,
  };
}

/**
 * Register a market profile.
 */
export function registerProfile(
  registry: MarketProfileRegistry,
  profile: MarketProfile,
): MarketProfileRegistry {
  const profiles = new Map(registry.profiles);
  profiles.set(profile.marketCode, profile);
  return { ...registry, profiles };
}

/**
 * Get a market profile by code.
 * Falls back to the default market if not found.
 */
export function getProfile(
  registry: MarketProfileRegistry,
  marketCode?: string,
): MarketProfile | undefined {
  const code = marketCode ?? registry.defaultMarketCode;
  return registry.profiles.get(code) ?? registry.profiles.get(registry.defaultMarketCode);
}

/**
 * Get all active profiles.
 */
export function getActiveProfiles(
  registry: MarketProfileRegistry,
): MarketProfile[] {
  return Array.from(registry.profiles.values()).filter((p) => p.isActive);
}

// =========================================================
// NIGERIA DEFAULT PROFILE
// =========================================================

/**
 * Create the Nigeria market profile.
 * Nigeria is the primary market — all others are additive.
 */
export function createNigeriaProfile(): MarketProfile {
  return {
    marketCode: 'NG',
    marketName: 'Nigeria',
    unitSystem: 'metric',
    defaultLengthUnit: 'meters',
    currency: 'NGN',
    currencySymbol: '₦',
    defaultWastePercent: 10,
    defaultPackageSizes: {
      paint: { size: 20, unit: 'litres' },
      cement: { size: 50, unit: 'kg' },
      tiles: { size: 1.44, unit: 'm2' },
      screeding: { size: 25, unit: 'kg' },
      primer: { size: 20, unit: 'litres' },
    },
    defaultCoverage: {
      paint: 35, // m² per 20L bucket (2 coats)
      cement: 5, // m² per 50kg bag
      tiles: 1.44, // m² per carton
      screeding: 20, // m² per 25kg bag
      primer: 40, // m² per 20L bucket
    },
    ruleIds: [
      'rule-painting-interior',
      'rule-tiling-floor',
      'rule-screeding-wall',
    ],
    isActive: true,
    locale: 'en-NG',
  };
}

// =========================================================
// GHANA PROFILE (Example for future expansion)
// =========================================================

/**
 * Create the Ghana market profile.
 * Similar to Nigeria but with GHS currency and local defaults.
 */
export function createGhanaProfile(): MarketProfile {
  return {
    marketCode: 'GH',
    marketName: 'Ghana',
    unitSystem: 'metric',
    defaultLengthUnit: 'meters',
    currency: 'GHS',
    currencySymbol: '₵',
    defaultWastePercent: 10,
    defaultPackageSizes: {
      paint: { size: 20, unit: 'litres' },
      cement: { size: 42.5, unit: 'kg' },
      tiles: { size: 1.44, unit: 'm2' },
      screeding: { size: 25, unit: 'kg' },
      primer: { size: 20, unit: 'litres' },
    },
    defaultCoverage: {
      paint: 35,
      cement: 5,
      tiles: 1.44,
      screeding: 20,
      primer: 40,
    },
    ruleIds: [
      'rule-painting-interior',
      'rule-tiling-floor',
      'rule-screeding-wall',
    ],
    isActive: false, // Not yet active
    locale: 'en-GH',
  };
}

// =========================================================
// KENYA PROFILE (Example for future expansion)
// =========================================================

/**
 * Create the Kenya market profile.
 */
export function createKenyaProfile(): MarketProfile {
  return {
    marketCode: 'KE',
    marketName: 'Kenya',
    unitSystem: 'metric',
    defaultLengthUnit: 'meters',
    currency: 'KES',
    currencySymbol: 'KSh',
    defaultWastePercent: 10,
    defaultPackageSizes: {
      paint: { size: 20, unit: 'litres' },
      cement: { size: 50, unit: 'kg' },
      tiles: { size: 1.44, unit: 'm2' },
      screeding: { size: 25, unit: 'kg' },
      primer: { size: 20, unit: 'litres' },
    },
    defaultCoverage: {
      paint: 35,
      cement: 5,
      tiles: 1.44,
      screeding: 20,
      primer: 40,
    },
    ruleIds: [],
    isActive: false,
    locale: 'en-KE',
  };
}

// =========================================================
// DEFAULT REGISTRY
// =========================================================

/**
 * Create a registry with the default Nigeria profile.
 */
export function createDefaultRegistry(): MarketProfileRegistry {
  let registry = createMarketProfileRegistry('NG');
  registry = registerProfile(registry, createNigeriaProfile());
  registry = registerProfile(registry, createGhanaProfile());
  registry = registerProfile(registry, createKenyaProfile());
  return registry;
}

// =========================================================
// MARKET-SPECIFIC CONFIGURATION
// =========================================================

/**
 * Get the default waste percentage for a market.
 */
export function getMarketWastePercent(
  registry: MarketProfileRegistry,
  marketCode?: string,
): number {
  const profile = getProfile(registry, marketCode);
  return profile?.defaultWastePercent ?? 10;
}

/**
 * Get the default package size for a material category in a market.
 */
export function getMarketPackageSize(
  registry: MarketProfileRegistry,
  category: string,
  marketCode?: string,
): { size: number; unit: string } | undefined {
  const profile = getProfile(registry, marketCode);
  return profile?.defaultPackageSizes[category];
}

/**
 * Get the default coverage rate for a material category in a market.
 */
export function getMarketCoverage(
  registry: MarketProfileRegistry,
  category: string,
  marketCode?: string,
): number | undefined {
  const profile = getProfile(registry, marketCode);
  return profile?.defaultCoverage[category];
}

/**
 * Get the currency for a market.
 */
export function getMarketCurrency(
  registry: MarketProfileRegistry,
  marketCode?: string,
): { code: string; symbol: string } {
  const profile = getProfile(registry, marketCode);
  return {
    code: profile?.currency ?? 'NGN',
    symbol: profile?.currencySymbol ?? '₦',
  };
}

/**
 * Get the default length unit for a market.
 */
export function getMarketLengthUnit(
  registry: MarketProfileRegistry,
  marketCode?: string,
): string {
  const profile = getProfile(registry, marketCode);
  return profile?.defaultLengthUnit ?? 'meters';
}

/**
 * Get the rule IDs for a market.
 */
export function getMarketRuleIds(
  registry: MarketProfileRegistry,
  marketCode?: string,
): string[] {
  const profile = getProfile(registry, marketCode);
  return profile?.ruleIds ?? [];
}

/**
 * Check if a market is active.
 */
export function isMarketActive(
  registry: MarketProfileRegistry,
  marketCode: string,
): boolean {
  const profile = registry.profiles.get(marketCode);
  return profile?.isActive ?? false;
}

// =========================================================
// PROFILE FORMATTING
// =========================================================

/**
 * Format a market profile as readable text.
 */
export function marketProfileToText(profile: MarketProfile): string {
  const lines: string[] = [];
  lines.push(`MARKET PROFILE: ${profile.marketName} (${profile.marketCode})`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`Unit System: ${profile.unitSystem}`);
  lines.push(`Default Length: ${profile.defaultLengthUnit}`);
  lines.push(`Currency: ${profile.currency} (${profile.currencySymbol})`);
  lines.push(`Default Waste: ${profile.defaultWastePercent}%`);
  lines.push(`Locale: ${profile.locale}`);
  lines.push(`Active: ${profile.isActive ? 'Yes' : 'No'}`);
  lines.push('');
  lines.push('Default Package Sizes:');
  for (const [cat, pkg] of Object.entries(profile.defaultPackageSizes)) {
    lines.push(`  ${cat}: ${pkg.size} ${pkg.unit}`);
  }
  lines.push('');
  lines.push('Default Coverage (m² per package):');
  for (const [cat, cov] of Object.entries(profile.defaultCoverage)) {
    lines.push(`  ${cat}: ${cov} m²`);
  }
  if (profile.ruleIds.length > 0) {
    lines.push('');
    lines.push('Rules:');
    for (const ruleId of profile.ruleIds) {
      lines.push(`  • ${ruleId}`);
    }
  }
  return lines.join('\n');
}

/**
 * List all registered profiles.
 */
export function listProfiles(registry: MarketProfileRegistry): string {
  const lines: string[] = [];
  lines.push('REGISTERED MARKET PROFILES');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const profile of registry.profiles.values()) {
    const status = profile.isActive ? '✓ Active' : '○ Inactive';
    lines.push(`${status}  ${profile.marketName} (${profile.marketCode}) — ${profile.currency}`);
  }
  return lines.join('\n');
}
