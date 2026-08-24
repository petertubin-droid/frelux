/**
 * FRELUX MARKET INTELLIGENCE — Barrel Export
 *
 * Import from here:
 *   import { resolveCalculatorPrice, normalizeProduct, ... } from '@/lib/market-intelligence';
 *
 * Everything is additive. Existing code is not modified.
 */

// Price resolver (what calculators use)
export {
  resolveCalculatorPrice,
  resolveCalculatorPriceByName,
  resolveCalculatorPricesBulk,
  clearApprovedPriceCache,
} from './price-resolver';

// Product normalizer
export {
  extractPackageInfo,
  extractBrand,
  normalizeProductName,
  classifyCategory,
  calculateMatchConfidence,
  normalizeProduct,
  calculateUnitPrice,
} from './product-normalizer';

// Price validator
export {
  calculateFreshness,
  calculateObservationConfidence,
  detectAnomalies,
  calculateMarketEstimate,
  decideValidationStatus,
  FRESH_THRESHOLD_DAYS,
  RECENT_THRESHOLD_DAYS,
  STALE_THRESHOLD_DAYS,
} from './price-validator';

// Provider registry
export {
  registerProviderAdapter,
  getProviderAdapter,
  getAllAdapters,
  selectProvider,
  getFallbackProviders,
  checkAllProviderHealth,
} from './provider-registry';

// Supabase queries (for admin + resolver)
export {
  fetchProviders,
  upsertProvider,
  toggleProvider,
  fetchSources,
  upsertSource,
  deleteSource,
  fetchProductAliases,
  upsertProductAlias,
  verifyProductAlias,
  deleteProductAlias,
  fetchObservations,
  insertObservation,
  updateObservationStatus,
  setObservationFreshness,
  fetchApprovedPrices,
  upsertApprovedPrice,
  deactivateApprovedPrice,
  fetchCrawlLogs,
  insertCrawlLog,
  fetchProviderUsage,
  fetchAnomalies,
  resolveAnomaly,
  insertAnomalyFlag,
  manuallyEnterPrice,
} from './queries';

// Types (re-export)
export type {
  MiProvider,
  MiSource,
  MiProductAlias,
  MiPriceObservation,
  MiApprovedPrice,
  MiCrawlLog,
  MiProviderUsage,
  MiAnomalyFlag,
  ProviderType,
  SourceType,
  CrawlFrequency,
  MatchConfidence,
  ValidationStatus,
  Freshness,
  AnomalyType,
  AnomalyResolution,
  CrawlEventType,
  PriceProviderAdapter,
  RawPageContent,
  ExtractedPriceData,
  ProviderHealthStatus,
  ResolvedCalculatorPrice,
} from '@/types/market-intelligence';

export {
  NO_PRICE_AVAILABLE,
  PROVIDER_TYPE_LABELS,
  SOURCE_TYPE_LABELS,
  CRAWL_FREQUENCY_LABELS,
  VALIDATION_STATUS_LABELS,
  FRESHNESS_LABELS,
  ANOMALY_TYPE_LABELS,
  CONFIDENCE_LABELS,
} from '@/types/market-intelligence';
