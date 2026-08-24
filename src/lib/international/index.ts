/**
 * FRELUX INTERNATIONAL ARCHITECTURE — Barrel Export
 *
 * Import from here:
 *   import { useMarket, resolveMaterialRule, fetchCurrentPrice, ... } from '@/lib/international';
 *
 * Everything is additive. Existing code is not modified.
 */

// Market context (React provider + hook)
export {
  MarketProvider,
  useMarket,
  useCurrencySymbol,
  useCurrencyCode,
  DEFAULT_MARKET_CODE,
  NIGERIA_DEFAULTS,
} from './market-context';

// Material rule resolver
export {
  fetchMaterialRules,
  resolveMaterialRule,
  getCachedMaterialRule,
  resolveAllRules,
  preloadMaterialRules,
  clearMaterialRuleCache,
} from './material-rules';

// Pricing resolver
export {
  fetchCurrentPrice,
  fetchMarketPrices,
  fetchMarketProducts,
  resolveProductPrice,
  clearPriceCache,
} from './pricing-resolver';

// Calculator config service
export {
  fetchCalculatorConfigs,
  isCalculatorAvailable,
  getCalculatorConfig,
  getCalculatorLabel,
  getAvailableCalculators,
  clearCalculatorConfigCache,
} from './calculator-config';

// Measurement bridge (wraps existing measurement system)
export {
  getMarketDefaults,
  isLengthUnitSupported,
  isAreaUnitSupported,
  getSafeLengthUnit,
  getSafeAreaUnit,
  normalizeLength,
  normalizeArea,
  denormalizeLength,
  denormalizeArea,
} from './measurement-bridge';

// Calculation audit
export {
  createCalculationAudit,
  createLegacyAudit,
  auditToRecord,
} from './calculation-audit';

// Supabase queries (for admin)
export {
  fetchMarketProfiles,
  fetchMarketProfile,
  upsertMarketProfile,
  deleteMarketProfile,
  fetchMaterialRulesDb,
  upsertMaterialRule,
  deleteMaterialRule,
  fetchMarketProductsDb,
  upsertMarketProduct,
  deleteMarketProduct,
  fetchMarketPricingDb,
  upsertMarketPricing,
  deleteMarketPricing,
  fetchCalculatorConfigsDb,
  upsertCalculatorConfig,
  toggleCalculatorAvailability,
  fetchUserMarketPreference,
  upsertUserMarketPreference,
} from './queries';

// Types (re-export)
export type {
  MarketProfile,
  MarketMaterialRule,
  MarketProduct,
  MarketPricing,
  MarketCalculatorConfig,
  UserMarketPreference,
  ResolvedMarketContext,
  CalculationAuditMeta,
  MarketStatus,
  MeasurementSystem,
  MarketCalculatorType,
  PreferredLengthUnit,
  PreferredAreaUnit,
} from '@/types/international';
