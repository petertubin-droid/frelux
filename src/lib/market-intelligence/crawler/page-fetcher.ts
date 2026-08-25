/**
 * FRELUX DIRECT CRAWLER — Server-Side Page Fetcher
 *
 * Secure server-side HTTP fetcher with:
 * - SSRF protection (via url-validator)
 * - Response size limits
 * - Request timeouts
 * - Redirect limits
 * - Content-type validation
 * - Rate limiting (per domain)
 * - Robots.txt respect
 *
 * Does NOT implement:
 * - CAPTCHA bypassing
 * - Authentication bypassing
 * - Cloudflare bypassing
 * - Anti-bot evasion
 *
 * If a site blocks the crawler: record failure and stop.
 */

import type {
  CrawlerConfig,
  CrawlFetchResult,
  CrawlError,
  CrawlErrorType,
} from '@/types/crawler';
import { DEFAULT_CRAWLER_CONFIG } from '@/types/crawler';
import type { RawPageContent } from '@/types/market-intelligence';
import { validateUrl, isUrlInDomain } from './url-validator';
import { fetchRobotsTxt, isUrlAllowed } from './robots-checker';

// ============================================================
// RATE LIMITER (per domain)
// ============================================================

const lastRequestTime = new Map<string, number>();

async function enforceRateLimit(
  domain: string,
  minDelayMs: number,
): Promise<void> {
  const last = lastRequestTime.get(domain);
  if (last) {
    const elapsed = Date.now() - last;
    if (elapsed < minDelayMs) {
      const wait = minDelayMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  lastRequestTime.set(domain, Date.now());
}

// ============================================================
// FETCH PAGE
// ============================================================

/**
 * Fetch a single page server-side.
 * Returns structured fetch result.
 */
export async function fetchPage(
  url: string,
  config: CrawlerConfig = DEFAULT_CRAWLER_CONFIG,
  options?: {
    allowedDomain?: string;
    skipRobotsCheck?: boolean;
    requireContentTypeMatch?: boolean;
  },
): Promise<{ result: CrawlFetchResult; content: RawPageContent | null }> {
  const startedAt = Date.now();

  // 1. Validate URL (SSRF protection)
  const urlValidation = validateUrl(url);
  if (!urlValidation.valid) {
    return {
      result: {
        url,
        success: false,
        statusCode: 0,
        contentLength: 0,
        contentType: '',
        fetchDurationMs: Date.now() - startedAt,
        redirected: false,
        finalUrl: url,
        error: {
          type: urlValidation.reason?.includes('Private') || urlValidation.reason?.includes('Blocked')
            ? 'SSRF_BLOCKED' : 'INVALID_URL',
          message: urlValidation.reason ?? 'Invalid URL',
          url,
          timestamp: new Date().toISOString(),
        },
        renderingRequired: false,
      },
      content: null,
    };
  }

  const sanitizedUrl = urlValidation.sanitized!;
  const domain = urlValidation.domain!;

  // 2. Domain restriction check
  if (options?.allowedDomain && !isUrlInDomain(sanitizedUrl, options.allowedDomain)) {
    return {
      result: {
        url,
        success: false,
        statusCode: 0,
        contentLength: 0,
        contentType: '',
        fetchDurationMs: Date.now() - startedAt,
        redirected: false,
        finalUrl: sanitizedUrl,
        error: {
          type: 'SSRF_BLOCKED',
          message: `URL outside allowed domain: ${options.allowedDomain}`,
          url: sanitizedUrl,
          timestamp: new Date().toISOString(),
        },
        renderingRequired: false,
      },
      content: null,
    };
  }

  // 3. Robots.txt check
  if (!options?.skipRobotsCheck) {
    try {
      const robotsRules = await fetchRobotsTxt(domain, urlValidation.protocol ?? 'https', config.userAgent);
      const robotsCheck = isUrlAllowed(sanitizedUrl, robotsRules);
      if (!robotsCheck.allowed) {
        return {
          result: {
            url,
            success: false,
            statusCode: 0,
            contentLength: 0,
            contentType: '',
            fetchDurationMs: Date.now() - startedAt,
            redirected: false,
            finalUrl: sanitizedUrl,
            error: {
              type: 'ROBOTS_DISALLOWED',
              message: `Blocked by robots.txt for ${domain}`,
              url: sanitizedUrl,
              timestamp: new Date().toISOString(),
            },
            renderingRequired: false,
          },
          content: null,
        };
      }

      // Respect crawl-delay
      if (robotsCheck.crawlDelay && robotsCheck.crawlDelay > 0) {
        const delayMs = robotsCheck.crawlDelay * 1000;
        if (delayMs > config.minDelayBetweenRequestsMs) {
          config = { ...config, minDelayBetweenRequestsMs: delayMs };
        }
      }
    } catch {
      // If robots.txt can't be checked, proceed with caution
      // (fetchRobotsTxt already handles errors and defaults to allowed)
    }
  }

  // 4. Rate limiting
  await enforceRateLimit(domain, config.minDelayBetweenRequestsMs);

  // 5. Fetch the page
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

    const response = await fetch(sanitizedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': config.userAgent,
        'Accept': config.acceptedContentTypes.join(', '),
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'close',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    const fetchDurationMs = Date.now() - startedAt;
    const finalUrl = response.url;
    const redirected = finalUrl !== sanitizedUrl;
    const contentType = response.headers.get('content-type') ?? '';
    const contentLength = parseInt(response.headers.get('content-length') ?? '0', 10);

    // 6. Handle HTTP status codes
    if (response.status === 403) {
      return makeErrorResult(url, sanitizedUrl, finalUrl, 'HTTP_403', `HTTP 403 Forbidden from ${domain}`, response.status, fetchDurationMs, redirected, contentType, contentLength);
    }
    if (response.status === 404) {
      return makeErrorResult(url, sanitizedUrl, finalUrl, 'HTTP_404', `HTTP 404 Not Found at ${domain}`, response.status, fetchDurationMs, redirected, contentType, contentLength);
    }
    if (response.status >= 500) {
      return makeErrorResult(url, sanitizedUrl, finalUrl, 'HTTP_500', `HTTP ${response.status} from ${domain}`, response.status, fetchDurationMs, redirected, contentType, contentLength);
    }
    if (response.status >= 400) {
      return makeErrorResult(url, sanitizedUrl, finalUrl, 'HTTP_OTHER', `HTTP ${response.status} from ${domain}`, response.status, fetchDurationMs, redirected, contentType, contentLength);
    }

    // 7. Content-type validation
    const isAcceptedType = config.acceptedContentTypes.some((type) =>
      contentType.toLowerCase().includes(type.toLowerCase())
    );
    if (options?.requireContentTypeMatch && !isAcceptedType) {
      return makeErrorResult(url, sanitizedUrl, finalUrl, 'UNSUPPORTED_CONTENT_TYPE', `Content-Type "${contentType}" not supported`, response.status, fetchDurationMs, redirected, contentType, contentLength);
    }

    // 8. Response size check (Content-Length header)
    if (contentLength > config.maxResponseSizeBytes) {
      return makeErrorResult(url, sanitizedUrl, finalUrl, 'CONTENT_TOO_LARGE', `Response too large: ${contentLength} bytes (limit: ${config.maxResponseSizeBytes})`, response.status, fetchDurationMs, redirected, contentType, contentLength);
    }

    // 9. Read the body (with size limit enforcement)
    let html: string;
    try {
      // Read in chunks to enforce size limit even without Content-Length
      const reader = response.body?.getReader();
      if (reader) {
        const chunks: Uint8Array[] = [];
        let totalSize = 0;
        let done = false;
        while (!done) {
          const { done: readerDone, value } = await reader.read();
          done = readerDone;
          if (value) {
            totalSize += value.length;
            if (totalSize > config.maxResponseSizeBytes) {
              reader.cancel();
              return makeErrorResult(url, sanitizedUrl, finalUrl, 'CONTENT_TOO_LARGE', `Response body exceeded size limit: ${totalSize} bytes`, response.status, fetchDurationMs, redirected, contentType, totalSize);
            }
            chunks.push(value);
          }
        }
        const decoder = new TextDecoder('utf-8');
        html = decoder.decode(Buffer.concat(chunks));
      } else {
        html = await response.text();
        if (html.length > config.maxResponseSizeBytes) {
          return makeErrorResult(url, sanitizedUrl, finalUrl, 'CONTENT_TOO_LARGE', `Response text exceeded size limit: ${html.length} bytes`, response.status, fetchDurationMs, redirected, contentType, html.length);
        }
      }
    } catch (e) {
      return makeErrorResult(url, sanitizedUrl, finalUrl, 'PARSE_ERROR', `Failed to read response body: ${e instanceof Error ? e.message : 'unknown'}`, response.status, fetchDurationMs, redirected, contentType, 0);
    }

    // 10. Check for JavaScript-rendered pages (heuristic)
    const renderingRequired = detectJavascriptRenderingRequired(html, contentType);

    // 11. Success
    const result: CrawlFetchResult = {
      url,
      success: true,
      statusCode: response.status,
      contentLength: html.length,
      contentType,
      fetchDurationMs,
      redirected,
      finalUrl,
      error: null,
      renderingRequired,
    };

    const content: RawPageContent = {
      html,
      url: finalUrl,
      statusCode: response.status,
      fetchedAt: new Date().toISOString(),
    };

    return { result, content };
  } catch (e) {
    const fetchDurationMs = Date.now() - startedAt;
    let errorType: CrawlErrorType = 'CONNECTION_ERROR';
    let errorMessage = 'Connection failed';

    if (e instanceof Error) {
      if (e.name === 'AbortError') {
        errorType = 'FETCH_TIMEOUT';
        errorMessage = `Request timed out after ${config.requestTimeoutMs}ms`;
      } else if (e.message.includes('redirect')) {
        errorType = 'REDIRECT_TOO_MANY';
        errorMessage = `Too many redirects`;
      } else if (e.message.includes('ECONNREFUSED') || e.message.includes('ENOTFOUND')) {
        errorType = 'CONNECTION_ERROR';
        errorMessage = `Connection failed: ${e.message}`;
      } else {
        errorMessage = e.message;
      }
    }

    return {
      result: {
        url,
        success: false,
        statusCode: 0,
        contentLength: 0,
        contentType: '',
        fetchDurationMs,
        redirected: false,
        finalUrl: sanitizedUrl,
        error: { type: errorType, message: errorMessage, url: sanitizedUrl, timestamp: new Date().toISOString() },
        renderingRequired: false,
      },
      content: null,
    };
  }
}

// ============================================================
// HELPERS
// ============================================================

function makeErrorResult(
  originalUrl: string,
  sanitizedUrl: string,
  finalUrl: string,
  type: CrawlErrorType,
  message: string,
  statusCode: number,
  durationMs: number,
  redirected: boolean,
  contentType: string,
  contentLength: number,
): { result: CrawlFetchResult; content: null } {
  return {
    result: {
      url: originalUrl,
      success: false,
      statusCode,
      contentLength,
      contentType,
      fetchDurationMs: durationMs,
      redirected,
      finalUrl,
      error: { type, message, url: sanitizedUrl, statusCode, timestamp: new Date().toISOString() },
      renderingRequired: false,
    },
    content: null,
  };
}

/**
 * Heuristic detection of whether a page requires JavaScript rendering.
 * Checks for common signs that the page content is loaded client-side.
 */
function detectJavascriptRenderingRequired(html: string, _contentType: string): boolean {
  // If there's substantial visible text, it's probably server-rendered
  const textContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                          .replace(/<[^>]+>/g, '')
                          .trim();

  // If there's very little visible text but lots of script tags
  const scriptTags = (html.match(/<script\b/gi) || []).length;
  const textLength = textContent.length;

  if (textLength < 200 && scriptTags > 5) {
    return true;
  }

  // Check for common SPA frameworks that render client-side
  if (html.includes('id="root"') && textLength < 500) {
    return true;
  }
  if (html.includes('id="__next"') && !html.includes('__NEXT_DATA__')) {
    // Next.js without SSR data
    return true;
  }

  // Check for noscript messages indicating JS is required
  if (html.includes('enable javascript') || html.includes('requires javascript')) {
    return true;
  }

  return false;
}
