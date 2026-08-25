/**
 * FRELUX DIRECT CRAWLER — Extended Types
 *
 * Extends the existing Market Intelligence types with crawler-specific types.
 * Does NOT modify existing types — all additions are new.
 */

import type {
  _MiSource,
  _MiPriceObservation,
  _ValidationStatus,
  MatchConfidence,
  _Freshness,
} from '@/types/market-intelligence';

// ============================================================
// CRAWL JOB — tracks a single crawl execution
// ============================================================

export type CrawlJobStatus =
  | 'pending'
  | 'fetching'
  | 'extracting'
  | 'validating'
  | 'completed'
  | 'failed'
  | 'partial'
  | 'skipped';

export interface CrawlJob {
  id: string;                    // generated UUID
  sourceId: string;
  sourceName: string;
  providerName: string;
  status: CrawlJobStatus;
  mode: 'test' | 'production';
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;

  // Results
  pagesRequested: number;
  pagesFetched: number;
  productsDiscovered: number;
  pricesDiscovered: number;
  pricesAccepted: number;
  pricesRejected: number;
  pricesReviewRequired: number;
  anomaliesDetected: number;
  observationIds: string[];       // created observation IDs

  // Errors
  errors: CrawlError[];
  warnings: string[];

  // Fetch details
  fetchResults: CrawlFetchResult[];

  // Final status message
  message: string;
}

// ============================================================
// CRAWL ERROR
// ============================================================

export type CrawlErrorType =
  | 'FETCH_TIMEOUT'
  | 'HTTP_403'
  | 'HTTP_404'
  | 'HTTP_500'
  | 'HTTP_OTHER'
  | 'ROBOTS_DISALLOWED'
  | 'CONTENT_TOO_LARGE'
  | 'UNSUPPORTED_CONTENT_TYPE'
  | 'RENDERING_REQUIRED'
  | 'PRICE_NOT_FOUND'
  | 'CURRENCY_NOT_FOUND'
  | 'PACKAGE_NOT_FOUND'
  | 'PRODUCT_MATCH_LOW_CONFIDENCE'
  | 'PRICE_ANOMALY'
  | 'PROVIDER_DISABLED'
  | 'SOURCE_DISABLED'
  | 'SSRF_BLOCKED'
  | 'INVALID_URL'
  | 'RATE_LIMITED'
  | 'CONNECTION_ERROR'
  | 'PARSE_ERROR'
  | 'REDIRECT_TOO_MANY'
  | 'UNKNOWN';

export interface CrawlError {
  type: CrawlErrorType;
  message: string;
  url?: string;
  statusCode?: number;
  timestamp: string;
}

// ============================================================
// FETCH RESULT — result of a single page fetch
// ============================================================

export interface CrawlFetchResult {
  url: string;
  success: boolean;
  statusCode: number;
  contentLength: number;
  contentType: string;
  fetchDurationMs: number;
  redirected: boolean;
  finalUrl: string;
  error: CrawlError | null;
  renderingRequired: boolean;
}

// ============================================================
// EXTRACTED DATA — what the extractor found on a page
// ============================================================

export interface CrawlExtractionResult {
  url: string;
  products: ExtractedProduct[];
  renderingRequired: boolean;
  extractionMethod: 'jsonld' | 'opengraph' | 'html' | 'meta' | 'none';
  warnings: string[];
}

export interface ExtractedProduct {
  productName: string;
  price: number | null;
  currency: string | null;
  brand: string | null;
  category: string | null;
  packageSize: number | null;
  packageUnit: string | null;
  stockStatus: string | null;
  sku: string | null;
  url: string;
  extractionMethod: string;
  confidence: MatchConfidence;
}

// ============================================================
// CRAWL CONFIG — configurable limits
// ============================================================

export interface CrawlerConfig {
  // Request limits
  requestTimeoutMs: number;       // default: 15000
  maxResponseSizeBytes: number;   // default: 5MB (5_242_880)
  maxRedirects: number;           // default: 5

  // Rate limiting (per domain)
  minDelayBetweenRequestsMs: number;  // default: 2000
  maxPagesPerCrawl: number;           // default: 10
  maxCrawlDurationMs: number;          // default: 120000 (2 min)

  // Anomaly detection
  anomalyDeviationThreshold: number;   // default: 0.35 (35% from median)

  // Auto-approval
  autoApproveEnabled: boolean;          // default: false
  autoApproveMinConfidence: MatchConfidence;  // default: 'high'

  // User agent
  userAgent: string;

  // Content types to accept
  acceptedContentTypes: string[];
}

export const DEFAULT_CRAWLER_CONFIG: CrawlerConfig = {
  requestTimeoutMs: 15000,
  maxResponseSizeBytes: 5_242_880,
  maxRedirects: 5,
  minDelayBetweenRequestsMs: 2000,
  maxPagesPerCrawl: 10,
  maxCrawlDurationMs: 120_000,
  anomalyDeviationThreshold: 0.35,
  autoApproveEnabled: false,
  autoApproveMinConfidence: 'high',
  userAgent: 'FRELUX-Market-Intelligence-Bot/1.0 (+https://freluxtools.com)',
  acceptedContentTypes: [
    'text/html',
    'application/xhtml+xml',
    'application/xml',
    'text/plain',
  ],
};

// ============================================================
// ROBOTS.TXT
// ============================================================

export interface RobotsRule {
  allowed: boolean;
  crawlDelay: number | null;  // seconds
}

// ============================================================
// CRAWL TRIGGER — admin action result
// ============================================================

export interface CrawlTriggerResult {
  jobId: string;
  started: boolean;
  status: CrawlJobStatus;
  message: string;
}

// ============================================================
// SCHEDULED CRAWL CONFIG
// ============================================================

export interface ScheduledCrawlConfig {
  sourceId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  mode: 'test' | 'production';
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

// ============================================================
// ADAPTER EXTENSION — extends ExtractedPriceData with multiple products
// ============================================================

/**
 * The existing PriceProviderAdapter.extractPriceData() returns a single product.
 * The direct crawler needs to return multiple products per page.
 * This interface extends (not replaces) the existing adapter.
 */
export interface MultiProductExtraction {
  products: ExtractedProduct[];
  renderingRequired: boolean;
  method: string;
  warnings: string[];
}

// ============================================================
// URL VALIDATION RESULT
// ============================================================

export interface UrlValidationResult {
  valid: boolean;
  reason: string | null;
  sanitized: string | null;
  domain: string | null;
  protocol: string | null;
}
