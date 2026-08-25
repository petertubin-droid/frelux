/**
 * FRELUX DIRECT CRAWLER — Provider Adapter
 *
 * Implements the existing PriceProviderAdapter interface.
 * Registered via registerProviderAdapter() at module load.
 *
 * This adapter:
 * - Fetches pages server-side via the page-fetcher
 * - Extracts products/prices via the content-extractor
 * - Does NOT require any external API key
 * - Does NOT bypass website security
 * - Respects robots.txt
 * - Enforces SSRF protection, rate limits, and response limits
 *
 * The adapter handles the fetch + extract step.
 * The crawl orchestrator (crawl-engine.ts) handles the full pipeline:
 *   fetch → extract → normalize → validate → observe → log
 */

import type {
  PriceProviderAdapter,
  RawPageContent,
  ExtractedPriceData,
  ProviderHealthStatus,
  MiSource,
  MiProviderUsage,
} from '@/types/market-intelligence';
import type { CrawlerConfig, ExtractedProduct } from '@/types/crawler';
import { DEFAULT_CRAWLER_CONFIG } from '@/types/crawler';
import { fetchPage } from './page-fetcher';
import { extractProductsFromHtml, deriveCurrencyFromMarket } from './content-extractor';

// ============================================================
// ADAPTER STATE
// ============================================================

let lastError: string | null = null;
let requestCount = 0;
let healthCheckPassed = true;

// ============================================================
// FRELUX DIRECT CRAWLER ADAPTER
// ============================================================

export const freluxCrawlerAdapter: PriceProviderAdapter = {
  name: 'FRELUX Crawler' as const,
  type: 'crawler' as const,
  isFree: true,

  /**
   * The FRELUX Direct Crawler is always configured — it requires no API key.
   * It only needs enabled sources in mi_sources.
   */
  isConfigured(): boolean {
    return true;
  },

  /**
   * Free provider — no quota limits.
   * Rate limiting is handled per-domain by the fetcher.
   */
  hasQuota(_usage: MiProviderUsage | null): boolean {
    return true;
  },

  /**
   * Record a request for cost tracking.
   * For a free provider, this is informational only.
   */
  recordRequest(): void {
    requestCount++;
  },

  /**
   * Fetch a single page from a URL.
   * Implements the existing PriceProviderAdapter.fetchPage() contract.
   *
   * SSRF protection, robots.txt, rate limiting, and response limits are enforced.
   */
  async fetchPage(url: string): Promise<RawPageContent | null> {
    const { result, content } = await fetchPage(url, DEFAULT_CRAWLER_CONFIG, {
      requireContentTypeMatch: true,
    });

    if (!result.success || !content) {
      lastError = result.error?.message ?? 'Fetch failed';
      healthCheckPassed = result.error?.type !== 'SSRF_BLOCKED';
      return null;
    }

    return content;
  },

  /**
   * Extract product + price data from fetched content.
   * Implements the existing PriceProviderAdapter.extractPriceData() contract.
   *
   * Returns the FIRST product found. For multiple products, the crawl engine
   * calls extractMultipleProducts() instead.
   */
  async extractPriceData(raw: RawPageContent, source: MiSource): Promise<ExtractedPriceData | null> {
    const extraction = extractProductsFromHtml(raw.html, raw.url);

    if (extraction.products.length === 0) {
      return null;
    }

    const product = extraction.products[0];

    // Derive currency from source market if extraction didn't find it
    let currency = product.currency;
    if (!currency) {
      currency = deriveCurrencyFromMarket(source.country_code);
    }

    return {
      productName: product.productName,
      price: product.price ?? 0,
      currency: currency ?? 'NGN',
      packageSize: product.packageSize ?? undefined,
      packageUnit: product.packageUnit ?? undefined,
      brand: product.brand ?? undefined,
      stockStatus: product.stockStatus ?? undefined,
      sourceUrl: raw.url,
      rawExtractionRef: { extractionMethod: product.extractionMethod },
    };
  },

  /**
   * Get provider health status.
   */
  getHealthStatus(): ProviderHealthStatus {
    return {
      isHealthy: healthCheckPassed,
      lastError,
      remainingQuota: null, // unlimited
      message: lastError ?? 'FRELUX Direct Crawler — operational',
    };
  },
};

// ============================================================
// EXTENDED API — multi-product extraction (not part of interface)
// ============================================================

/**
 * Extract ALL products from a page (not just the first one).
 * The crawl engine uses this instead of extractPriceData() for full extraction.
 */
export function extractMultipleProducts(
  raw: RawPageContent,
  source: MiSource,
): { products: ExtractedProduct[]; renderingRequired: boolean; method: string; warnings: string[] } {
  const extraction = extractProductsFromHtml(raw.html, raw.url);

  // Derive currency for products that don't have it
  const products = extraction.products.map((product) => {
    if (!product.currency) {
      product.currency = deriveCurrencyFromMarket(source.country_code);
    }
    return product;
  });

  return {
    products,
    renderingRequired: extraction.renderingRequired,
    method: extraction.extractionMethod,
    warnings: extraction.warnings,
  };
}

/**
 * Fetch + extract in one call (convenience for the crawl engine).
 */
export async function fetchAndExtract(
  url: string,
  source: MiSource,
  config: CrawlerConfig = DEFAULT_CRAWLER_CONFIG,
): Promise<{
  fetchResult: import('@/types/crawler').CrawlFetchResult;
  products: ExtractedProduct[];
  renderingRequired: boolean;
  rawContent: RawPageContent | null;
}> {
  const { result, content } = await fetchPage(url, config, {
    allowedDomain: source.domain ?? undefined,
    requireContentTypeMatch: true,
  });

  if (!result.success || !content) {
    return { fetchResult: result, products: [], renderingRequired: false, rawContent: null };
  }

  const extraction = extractMultipleProducts(content, source);

  return {
    fetchResult: result,
    products: extraction.products,
    renderingRequired: extraction.renderingRequired || result.renderingRequired,
    rawContent: content,
  };
}

/**
 * Reset adapter state (for testing).
 */
export function resetAdapterState(): void {
  lastError = null;
  requestCount = 0;
  healthCheckPassed = true;
}

/**
 * Get request count (for diagnostics).
 */
export function getRequestCount(): number {
  return requestCount;
}
