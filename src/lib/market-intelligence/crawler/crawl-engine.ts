/**
 * FRELUX DIRECT CRAWLER — Crawl Engine
 *
 * The orchestrator that runs a full crawl job for a single source.
 *
 * Pipeline:
 *   1. Validate source (active, approved, provider compatible)
 *   2. Validate URL (SSRF check)
 *   3. Fetch page(s)
 *   4. Extract products + prices
 *   5. Normalize products (existing normalizer)
 *   6. Validate prices (existing validator)
 *   7. Detect anomalies
 *   8. Create price observations
 *   9. Auto-approve if confidence is high enough (configurable)
 *  10. Log everything to mi_crawl_logs
 *
 * Does NOT modify calculators.
 * Does NOT delete previous prices on failure.
 * Does NOT fabricate data.
 */

import type {
  MiSource,
  MiPriceObservation,
  ValidationStatus,
  MatchConfidence,
  Freshness,
} from '@/types/market-intelligence';
import type {
  CrawlJob,
  CrawlError,
  CrawlFetchResult,
  CrawlErrorType,
  ExtractedProduct,
  CrawlerConfig,
} from '@/types/crawler';
import { DEFAULT_CRAWLER_CONFIG } from '@/types/crawler';
import {
  calculateObservationConfidence,
  calculateFreshness,
  detectAnomalies,
  decideValidationStatus,
} from '../price-validator';
import {
  normalizeProduct,
  calculateMatchConfidence,
  calculateUnitPrice,
} from '../product-normalizer';
import { fetchAndExtract } from './frelux-crawler-adapter';
import { validateUrl, isUrlInDomain } from './url-validator';
import { fetchApprovedPrices, insertObservation, upsertApprovedPrice, insertCrawlLog, insertAnomalyFlag, updateObservationStatus, upsertSource } from '../queries';

// ============================================================
// CRAWL JOB MANAGER
// ============================================================

/**
 * Execute a crawl for a single source.
 * This is the main entry point called by admin "Crawl Now" or scheduled execution.
 */
export async function executeCrawl(
  source: MiSource,
  options: {
    mode: 'test' | 'production';
    config?: CrawlerConfig;
    adminUserId?: string;
    targetUrl?: string;  // optional: crawl a specific URL instead of source_url
    canonicalProductId?: string;  // optional: pre-matched product ID
  },
): Promise<CrawlJob> {
  const config = options.config ?? DEFAULT_CRAWLER_CONFIG;
  const jobId = crypto.randomUUID();
  const startedAt = Date.now();

  const job: CrawlJob = {
    id: jobId,
    sourceId: source.id,
    sourceName: source.source_name,
    providerName: 'FRELUX Crawler',
    status: 'pending',
    mode: options.mode,
    startedAt: new Date(startedAt).toISOString(),
    endedAt: null,
    durationMs: null,
    pagesRequested: 0,
    pagesFetched: 0,
    productsDiscovered: 0,
    pricesDiscovered: 0,
    pricesAccepted: 0,
    pricesRejected: 0,
    pricesReviewRequired: 0,
    anomaliesDetected: 0,
    observationIds: [],
    errors: [],
    warnings: [],
    fetchResults: [],
    message: '',
  };

  // 1. Validate source
  if (!source.is_active) {
    job.status = 'skipped';
    job.errors.push({
      type: 'SOURCE_DISABLED',
      message: `Source "${source.source_name}" is not active`,
      timestamp: new Date().toISOString(),
    });
    job.message = 'Source is not active — crawl skipped';
    finishJob(job, startedAt);
    await logCrawlResult(job);
    return job;
  }

  // 2. Determine URL to crawl
  const crawlUrl = options.targetUrl ?? source.source_url;
  if (!crawlUrl) {
    job.status = 'failed';
    job.errors.push({
      type: 'INVALID_URL',
      message: 'Source has no URL configured',
      timestamp: new Date().toISOString(),
    });
    job.message = 'No URL to crawl';
    finishJob(job, startedAt);
    await logCrawlResult(job);
    return job;
  }

  // 3. Validate URL (SSRF protection)
  const urlValidation = validateUrl(crawlUrl);
  if (!urlValidation.valid || !urlValidation.sanitized) {
    job.status = 'failed';
    job.errors.push({
      type: urlValidation.reason?.includes('Private') || urlValidation.reason?.includes('Blocked') ? 'SSRF_BLOCKED' : 'INVALID_URL',
      message: urlValidation.reason ?? 'Invalid URL',
      url: crawlUrl,
      timestamp: new Date().toISOString(),
    });
    job.message = `URL validation failed: ${urlValidation.reason}`;
    finishJob(job, startedAt);
    await logCrawlResult(job);
    return job;
  }

  // 4. Domain check
  if (source.domain && !isUrlInDomain(urlValidation.sanitized, source.domain)) {
    job.status = 'failed';
    job.errors.push({
      type: 'SSRF_BLOCKED',
      message: `URL does not match source domain: ${source.domain}`,
      url: crawlUrl,
      timestamp: new Date().toISOString(),
    });
    job.message = 'URL outside source domain';
    finishJob(job, startedAt);
    await logCrawlResult(job);
    return job;
  }

  // 5. Fetch + Extract
  job.status = 'fetching';
  job.pagesRequested = 1;

  const { fetchResult, products, renderingRequired, rawContent } = await fetchAndExtract(
    urlValidation.sanitized,
    source,
    config,
  );

  job.fetchResults.push(fetchResult);

  if (!fetchResult.success) {
    job.status = 'failed';
    job.errors.push(fetchResult.error ?? {
      type: 'CONNECTION_ERROR',
      message: 'Unknown fetch error',
      timestamp: new Date().toISOString(),
    });
    job.message = `Fetch failed: ${fetchResult.error?.message ?? 'unknown error'}`;

    // Update source health
    await updateSourceHealth(source, false, fetchResult.error?.message);

    finishJob(job, startedAt);
    await logCrawlResult(job);
    return job;
  }

  job.pagesFetched = 1;

  // 6. Check for JavaScript rendering requirement
  if (renderingRequired && products.length === 0) {
    job.status = 'skipped';
    job.warnings.push('Page appears to require JavaScript rendering. No products extracted.');
    job.errors.push({
      type: 'RENDERING_REQUIRED',
      message: `Page at ${urlValidation.sanitized} requires JavaScript rendering`,
      url: urlValidation.sanitized,
      timestamp: new Date().toISOString(),
    });
    job.message = 'Rendering required — direct crawler cannot extract data from this page';

    // Update source health
    await updateSourceHealth(source, false, 'RENDERING_REQUIRED');

    finishJob(job, startedAt);
    await logCrawlResult(job);
    return job;
  }

  // 7. Process extracted products
  job.status = 'extracting';
  job.productsDiscovered = products.length;

  if (products.length === 0) {
    job.status = 'completed';
    job.warnings.push('No products found on this page');
    job.message = 'Crawl completed — no products found';

    // Update source health — fetch succeeded but no products
    await updateSourceHealth(source, true, null);

    finishJob(job, startedAt);
    await logCrawlResult(job);
    return job;
  }

  // 8. Normalize, validate, and create observations
  job.status = 'validating';

  // Fetch existing approved prices for anomaly comparison
  let existingPrices: { price: number; id: string }[] = [];
  try {
    const approved = await fetchApprovedPrices(source.country_code);
    existingPrices = approved.map((p) => ({ price: p.price, id: p.id }));
  } catch {
    // If we can't fetch existing prices, skip anomaly comparison
  }

  for (const product of products) {
    // Skip products with no price
    if (product.price === null || product.price <= 0) {
      job.warnings.push(`Product "${product.productName}" — no price found`);
      continue;
    }

    job.pricesDiscovered++;

    // Normalize product name
    const normalized = normalizeProduct(product.productName);

    // Calculate match confidence
    const matchResult = calculateMatchConfidence(product.productName, {
      name: normalized.normalized_name,
      brand: normalized.normalized_brand,
      package_size: normalized.normalized_package_size,
      package_unit: normalized.normalized_package_unit,
      category: normalized.normalized_category,
    });

    // Calculate unit price if possible
    const unitPrice = calculateUnitPrice(
      product.price,
      product.packageSize ?? null,
      product.packageUnit ?? null,
    );

    // Calculate overall confidence
    const confidenceResult = calculateObservationConfidence(
      {
        match_confidence: matchResult.confidence,
        collected_at: new Date().toISOString(),
        package_size: product.packageSize ?? null,
        currency_code: product.currency ?? '',
        market_code: source.country_code,
      },
      {
        reliability_tier: source.reliability_tier,
        is_verified: source.is_verified,
        country_code: source.country_code,
      },
      product.currency ?? 'NGN',
      source.country_code,
    );

    // Determine validation status
    // In test mode, never auto-approve
    const autoApprove = options.mode === 'production' && config.autoApproveEnabled;
    const validationStatus: ValidationStatus = decideValidationStatus(
      confidenceResult.confidence,
      false, // anomaly check below
      autoApprove,
    );

    // Determine freshness
    const freshness: Freshness = calculateFreshness(new Date());

    // Create observation
    try {
      const observation = await insertObservation({
        market_code: source.country_code,
        country_code: source.country_code,
        region: source.region,
        city: source.city,
        source_id: source.id,
        provider_id: null, // FRELUX Crawler doesn't have a provider_id in this context
        original_product_name: product.productName,
        canonical_product_id: options.canonicalProductId ?? null,
        normalized_brand: normalized.normalized_brand,
        normalized_name: normalized.normalized_name,
        normalized_category: normalized.normalized_category,
        package_size: product.packageSize ?? null,
        package_unit: product.packageUnit ?? null,
        package_size_confidence: product.packageSize ? 'medium' : 'unknown',
        price: product.price,
        currency_code: product.currency ?? 'NGN',
        unit_price_per_kg: unitPrice.per_kg,
        unit_price_per_litre: unitPrice.per_litre,
        unit_price_calculable: unitPrice.calculable,
        collected_at: new Date().toISOString(),
        source_publication_date: null,
        stock_status: product.stockStatus,
        match_confidence: matchResult.confidence,
        validation_status: validationStatus,
        freshness,
        source_url: product.url,
        raw_extraction_ref: { extractionMethod: product.extractionMethod },
        admin_notes: null,
      });

      job.observationIds.push(observation.id);

      if (validationStatus === 'approved') {
        job.pricesAccepted++;

        // Create/update approved price
        if (options.mode === 'production') {
          await upsertApprovedPrice({
            market_code: source.country_code,
            canonical_product_id: options.canonicalProductId ?? null,
            product_name: normalized.normalized_name,
            brand: normalized.normalized_brand,
            category: normalized.normalized_category ?? 'uncategorized',
            package_size: product.packageSize ?? 1,
            package_unit: product.packageUnit ?? 'unit',
            price: product.price,
            currency_code: product.currency ?? 'NGN',
            unit_price_per_kg: unitPrice.per_kg,
            unit_price_per_litre: unitPrice.per_litre,
            unit_price_calculable: unitPrice.calculable,
            source_count: 1,
            confidence: confidenceResult.confidence,
            freshness,
            source_observations: [observation.id],
            auto_approved: true,
            region: source.region,
            city: source.city,
            is_active: true,
          });
        }
      } else if (validationStatus === 'review_required') {
        job.pricesReviewRequired++;
      } else {
        job.pricesRejected++;
      }
    } catch (e) {
      job.errors.push({
        type: 'PARSE_ERROR',
        message: `Failed to create observation for "${product.productName}": ${e instanceof Error ? e.message : 'unknown'}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 9. Anomaly detection
  if (job.observationIds.length >= 2) {
    try {
      const observations = job.observationIds.map(id => ({ id, price: 0 })); // would need actual prices
      // Anomaly detection on collected prices
      const productPrices = products
        .filter(p => p.price !== null)
        .map((p, i) => ({ id: job.observationIds[i] ?? '', price: p.price! }));

      if (productPrices.length >= 2) {
        const anomalies = detectAnomalies(productPrices);
        for (const anomaly of anomalies) {
          job.anomaliesDetected++;
          try {
            await insertAnomalyFlag(anomaly.observationId, 'price_deviation', {
              expectedRange: { median: anomaly.expectedMedian },
              actualValue: anomaly.deviationPercent,
              deviationPercent: anomaly.deviationPercent,
              description: `Price deviates ${anomaly.deviationPercent}% from median`,
            });
            // Update observation status to anomaly
            await updateObservationStatus(anomaly.observationId, 'anomaly');
          } catch {
            // Non-fatal if anomaly logging fails
          }
        }
      }
    } catch {
      // Non-fatal
    }
  }

  // 10. Final status
  if (job.errors.length > 0 && job.observationIds.length > 0) {
    job.status = 'partial';
    job.message = `Crawl partial — ${job.observationIds.length} observations created, ${job.errors.length} errors`;
  } else if (job.errors.length > 0 && job.observationIds.length === 0) {
    job.status = 'failed';
    job.message = `Crawl failed — ${job.errors.length} errors, 0 observations`;
  } else {
    job.status = 'completed';
    job.message = `Crawl completed — ${job.productsDiscovered} products found, ${job.observationIds.length} observations created (${job.pricesAccepted} approved, ${job.pricesReviewRequired} review required)`;
  }

  // Update source health
  const success = job.status === 'completed' || job.status === 'partial';
  await updateSourceHealth(source, success, success ? null : job.errors[0]?.message ?? null);

  finishJob(job, startedAt);
  await logCrawlResult(job);

  return job;
}

// ============================================================
// HELPERS
// ============================================================

function finishJob(job: CrawlJob, startedAt: number): void {
  job.endedAt = new Date().toISOString();
  job.durationMs = Date.now() - startedAt;
}

async function updateSourceHealth(source: MiSource, success: boolean, error: string | null): Promise<void> {
  try {
    await upsertSource({
      id: source.id,
      last_checked_at: new Date().toISOString(),
      last_success_at: success ? new Date().toISOString() : source.last_success_at,
      last_error: error,
    });
  } catch {
    // Non-fatal
  }
}

async function logCrawlResult(job: CrawlJob): Promise<void> {
  try {
    // Log crawl start
    await insertCrawlLog(
      'crawl_started',
      `Crawl started for ${job.sourceName} (${job.mode} mode)`,
      { jobId: job.id, mode: job.mode, sourceId: job.sourceId },
      { source_id: job.sourceId },
    );

    // Log crawl result
    const eventType = job.status === 'completed' ? 'crawl_completed'
      : job.status === 'failed' ? 'crawl_failed'
      : job.status === 'partial' ? 'crawl_completed'
      : 'crawl_failed';

    await insertCrawlLog(
      eventType as 'crawl_completed' | 'crawl_failed',
      job.message,
      {
        jobId: job.id,
        status: job.status,
        mode: job.mode,
        pagesRequested: job.pagesRequested,
        pagesFetched: job.pagesFetched,
        productsDiscovered: job.productsDiscovered,
        pricesDiscovered: job.pricesDiscovered,
        pricesAccepted: job.pricesAccepted,
        pricesReviewRequired: job.pricesReviewRequired,
        pricesRejected: job.pricesRejected,
        anomaliesDetected: job.anomaliesDetected,
        errors: job.errors.map((e) => e.type),
        warnings: job.warnings,
        durationMs: job.durationMs,
      },
      { source_id: job.sourceId },
    );

    // Log individual errors
    for (const error of job.errors) {
      await insertCrawlLog(
        'provider_error',
        `${error.type}: ${error.message}`,
        { errorType: error.type, url: error.url, statusCode: error.statusCode },
        { source_id: job.sourceId },
      );
    }
  } catch {
    // Non-fatal if logging fails
  }
}

// ============================================================
// ADAPTER REGISTRATION
// ============================================================

import { registerProviderAdapter } from '../provider-registry';
import { freluxCrawlerAdapter } from './frelux-crawler-adapter';

// Register the FRELUX Crawler adapter at module load
registerProviderAdapter(freluxCrawlerAdapter);
