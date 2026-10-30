// =========================================================
// price-intel-scan — recurring price intelligence batch
// (Phase 5 of the FRELUX global expansion)
//
// Called by pg_cron every Monday 06:40 UTC with the
// x-intel-token header (token lives server-side in
// public.price_intel_tokens, same pattern as price-digest), or
// on demand by an authenticated admin for a market subset.
//
// What it does — and deliberately does NOT do:
//   1. Loads every ACTIVE price_scan_sources row (optionally
//      one market only).
//   2. Fetches each retailer product page server-side
//      (SSRF-guarded, 10s timeout, polite 700ms stagger,
//      concurrency 6) and extracts the REAL price with the same
//      three-tier method as price-scan: JSON-LD (high),
//      og:price/product:price meta (medium), regex fallback
//      (low).
//   3. VALIDATES each extraction:
//        - currency sanity vs the source's configured currency
//          (mismatch downgrades confidence to low)
//        - deviation vs the market's CURRENT book price in
//          estimation_prices: recorded in review_note, outliers
//          (>50%) are flagged loudly for the reviewer
//   4. Files every result as a price_scan_candidates row with
//      status 'pending' (or 'failed' for fetch/parse failures)
//      tagged with run_id — one candidate per source per run
//      (unique index), so re-invocations never duplicate.
//   5. Updates the source row (last_scanned_at, last_scan_status,
//      last_scan_error) and closes the price_scan_runs audit row
//      with counts.
//
// AUTO-APPLY PHASE (2026-10-24): after filing candidates, groups
// this run's pending candidates by (market, material_slug) and
// applies the group median into estimation_prices ONLY when the
// per-market gates in price_auto_apply_rules all pass:
//   - every candidate meets the rule's min_confidence
//   - total agreeing observations >= min_agreeing_observations
//     (a search candidate counts its agreeing listings; a product
//     candidate counts 1)
//   - group prices agree within 25% of their median
//   - median deviates from the current book by at most the rule's
//     max_deviation_percent (no bound check when no current price)
// MANUAL prices (estimation_prices.origin='manual') are NEVER
// overwritten: those groups stay pending for explicit admin
// approval. Applied rows carry origin='scan' with full provenance
// and a estimation_price_history audit row. Anything failing a
// gate stays pending exactly as before.
//
// Deploy with --no-verify-jwt (the token header IS the gate).
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import {
  matchMaterials,
  parseFeed,
  parseRobots,
  robotsAllows,
  STRUCTURED_FORMATS,
  type FeedMapping,
  type MaterialRef,
  type RobotsRules,
  type SourceFormat,
} from "../_shared/market-feeds.ts";

const CONCURRENCY = 6;
const STAGGER_MS = 700;
const FETCH_TIMEOUT_MS = 12_000;
/** A retailer that throttles by source address (Amazon answers 503 to most
 *  requests and serves the page on a later one) must not be recorded as a
 *  failure on the first refusal. */
const FETCH_RETRY_DELAYS_MS = [1_200, 2_500];
const RETRY_STATUSES = new Set([403, 429, 500, 502, 503, 504]);
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
/** Stop starting new batches past this point so the invocation always gets to
 *  write its run row instead of being killed mid-flight. */
const RUN_BUDGET_MS = 110_000;
/** Search sources rotate across this many weekly groups so the
 *  bounded 200-source run covers every material at least once
 *  per cycle. Product sources always run. */
const ROTATION_GROUPS = 6;

interface ScanSource {
  id: string;
  market: string;
  material_slug: string;
  retailer: string;
  label: string | null;
  product_url: string;
  expected_unit: string | null;
  currency: string;
  last_scanned_at: string | null;
  source_type: "product" | "search";
  source_format: SourceFormat;
  brand: string | null;
  specification: string | null;
  measurement_unit: string | null;
  supplier_name: string | null;
  supplier_location: string | null;
  cadence_hours: number | null;
  feed_mapping: FeedMapping | null;
  consecutive_failures: number | null;
  http_etag: string | null;
  http_last_modified: string | null;
}

/** One supplier fact destined for market_price_observations. */
interface ObservationDraft {
  market: string;
  material_slug: string;
  brand: string;
  specification: string;
  unit: string;
  price: number;
  currency: string;
  supplier_name: string | null;
  supplier_location: string | null;
  source_id: string;
  source_url: string;
  source_format: string;
  extraction: string;
  confidence: "high" | "medium" | "low";
}

/** Robots.txt is per host and does not change within a run. */
const ROBOTS_CACHE = new Map<string, RobotsRules | null>();
const LAST_FETCH_BY_HOST = new Map<string, number>();
const POLITE_GAP_MS = 1_200;

interface ExtractedPrice {
  price: number | null;
  currency: string | null;
  product_name: string | null;
  extraction: "json_ld" | "meta" | "regex" | null;
  confidence: "high" | "medium" | "low" | null;
}

/** Reads robots.txt once per host per run and answers for one path.
 *  Unreachable robots.txt is treated as "no rules published", which is the
 *  spec default for an absent file; a 401/403 is treated as a refusal. */
async function robotsFor(
  origin: string,
  path: string,
): Promise<{ allowed: boolean; rules: RobotsRules | null; note?: string }> {
  if (!ROBOTS_CACHE.has(origin)) {
    try {
      const res = await fetch(`${origin}/robots.txt`, {
        headers: { "User-Agent": BROWSER_UA, Accept: "text/plain" },
        signal: AbortSignal.timeout(8_000),
        redirect: "follow",
      });
      if (res.status === 401 || res.status === 403) {
        ROBOTS_CACHE.set(origin, null);
        return {
          allowed: false,
          rules: null,
          note: `robots.txt ${res.status}`,
        };
      }
      ROBOTS_CACHE.set(
        origin,
        res.ok ? parseRobots(await res.text(), "frelux") : null,
      );
    } catch {
      ROBOTS_CACHE.set(origin, null);
    }
  }
  const rules = ROBOTS_CACHE.get(origin) ?? null;
  if (!rules) return { allowed: true, rules: null };
  return { allowed: robotsAllows(rules, path), rules };
}

/** Keeps at least POLITE_GAP_MS between calls to the same host (or the site's
 *  own crawl-delay when that is longer). */
async function respectHostGap(
  hostname: string,
  rules: RobotsRules | null,
): Promise<void> {
  const gap = Math.max(POLITE_GAP_MS, (rules?.crawlDelaySeconds ?? 0) * 1000);
  const last = LAST_FETCH_BY_HOST.get(hostname) ?? 0;
  const wait = last + gap - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, Math.min(wait, 10_000)));
  LAST_FETCH_BY_HOST.set(hostname, Date.now());
}

interface FetchResult {
  ok: boolean;
  notModified: boolean;
  text: string;
  status: number;
  error: string | null;
  etag: string | null;
  lastModified: string | null;
  contentType: string | null;
}

/** Conditional GET: a feed that has not changed answers 304 and costs no parse. */
async function fetchDocument(
  url: URL,
  accept: string,
  etag: string | null,
  lastModified: string | null,
): Promise<FetchResult> {
  let lastError = "unreachable";
  for (let attempt = 0; attempt <= FETCH_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const headers: Record<string, string> = {
        "User-Agent": BROWSER_UA,
        Accept: accept,
        "Accept-Language": "en-US,en;q=0.9",
      };
      if (etag) headers["If-None-Match"] = etag;
      if (lastModified) headers["If-Modified-Since"] = lastModified;
      const res = await fetch(url.toString(), {
        headers,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        redirect: "follow",
      });
      if (res.status === 304) {
        return {
          ok: true,
          notModified: true,
          text: "",
          status: 304,
          error: null,
          etag,
          lastModified,
          contentType: res.headers.get("content-type"),
        };
      }
      if (res.ok) {
        return {
          ok: true,
          notModified: false,
          text: (await res.text()).slice(0, 4_000_000),
          status: res.status,
          error: null,
          etag: res.headers.get("etag"),
          lastModified: res.headers.get("last-modified"),
          contentType: res.headers.get("content-type"),
        };
      }
      lastError = `site responded with ${res.status}`;
      if (!RETRY_STATUSES.has(res.status)) break;
    } catch (err: unknown) {
      lastError = `unreachable: ${err instanceof Error ? err.message : "network error"}`;
    }
    if (attempt < FETCH_RETRY_DELAYS_MS.length) {
      await new Promise((r) => setTimeout(r, FETCH_RETRY_DELAYS_MS[attempt]));
    }
  }
  return {
    ok: false,
    notModified: false,
    text: "",
    status: 0,
    error: lastError,
    etag: null,
    lastModified: null,
    contentType: null,
  };
}

/** Structured feed source: JSON, API, CSV or RSS. Respects robots.txt, uses
 *  conditional GET, and only emits observations for rows it can both price and
 *  match to a material in this market's catalogue. */
async function scanFeedSource(
  source: ScanSource,
  materials: MaterialRef[],
  marketCurrency: string,
): Promise<{
  ok: boolean;
  notModified: boolean;
  observations: ObservationDraft[];
  matched: number;
  rejected: number;
  error: string | null;
  robotsAllowed: boolean;
  etag: string | null;
  lastModified: string | null;
  note: string;
}> {
  const empty = {
    ok: false,
    notModified: false,
    observations: [] as ObservationDraft[],
    matched: 0,
    rejected: 0,
    error: null as string | null,
    robotsAllowed: true,
    etag: null as string | null,
    lastModified: null as string | null,
    note: "",
  };
  let parsed: URL;
  try {
    parsed = new URL(source.product_url);
  } catch {
    return {
      ...empty,
      error: "invalid source url",
      note: "invalid source url",
    };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return {
      ...empty,
      error: "unsupported protocol",
      note: "unsupported protocol",
    };
  }
  if (isBlockedHost(parsed.hostname)) {
    return { ...empty, error: "blocked host", note: "blocked host" };
  }

  const robots = await robotsFor(parsed.origin, parsed.pathname);
  if (!robots.allowed) {
    return {
      ...empty,
      robotsAllowed: false,
      error: robots.note ?? "disallowed by robots.txt",
      note: "disallowed by robots.txt",
    };
  }
  await respectHostGap(parsed.hostname, robots.rules);

  const accept =
    source.source_format === "csv"
      ? "text/csv,text/plain;q=0.9,*/*;q=0.5"
      : source.source_format === "rss"
        ? "application/rss+xml,application/atom+xml,application/xml;q=0.9,*/*;q=0.5"
        : "application/json,text/plain;q=0.9,*/*;q=0.5";

  const doc = await fetchDocument(
    parsed,
    accept,
    source.http_etag,
    source.http_last_modified,
  );
  if (doc.notModified) {
    return {
      ...empty,
      ok: true,
      notModified: true,
      robotsAllowed: true,
      etag: doc.etag,
      lastModified: doc.lastModified,
      note: "feed unchanged (304)",
    };
  }
  if (!doc.ok) {
    return {
      ...empty,
      robotsAllowed: true,
      error: doc.error ?? "fetch failed",
      note: doc.error ?? "fetch failed",
    };
  }

  const rows = parseFeed(
    source.source_format,
    doc.text,
    (source.feed_mapping ?? {}) as FeedMapping,
  ).map((row) => ({
    ...row,
    currency: (row.currency ?? source.currency).toUpperCase(),
  }));

  if (rows.length === 0) {
    return {
      ...empty,
      ok: true,
      robotsAllowed: true,
      etag: doc.etag,
      lastModified: doc.lastModified,
      error: "feed carried no readable prices",
      note: "feed carried no readable prices",
    };
  }

  // A feed row binds to a material either because the source targets one slug
  // explicitly, or because its name matches the catalogue.
  const catalogue: MaterialRef[] =
    source.material_slug && source.material_slug !== "*"
      ? materials.filter((m) => m.slug === source.material_slug)
      : materials;
  const matched = matchMaterials(rows, catalogue);
  const observations: ObservationDraft[] = [];
  let rejected = 0;

  for (const row of matched) {
    const currency = (row.currency ?? source.currency).toUpperCase();
    if (currency !== marketCurrency.toUpperCase()) {
      rejected += 1;
      continue;
    }
    observations.push({
      market: source.market,
      material_slug: row.material.slug,
      brand: (row.brand ?? source.brand ?? "").slice(0, 120),
      specification: (row.specification ?? source.specification ?? "").slice(
        0,
        160,
      ),
      unit: (
        row.unit ??
        source.measurement_unit ??
        source.expected_unit ??
        ""
      ).slice(0, 40),
      price: Math.round(row.price * 100) / 100,
      currency,
      supplier_name:
        (row.supplier ?? source.supplier_name ?? source.retailer)?.slice(
          0,
          160,
        ) ?? null,
      supplier_location:
        (row.location ?? source.supplier_location)?.slice(0, 160) ?? null,
      source_id: source.id,
      source_url: source.product_url,
      source_format: source.source_format,
      extraction: source.source_format,
      // A structured feed states its prices; the confidence is about the
      // material match, not about parsing.
      confidence: row.score >= 0.85 ? "high" : "medium",
    });
  }

  return {
    ok: true,
    notModified: false,
    observations,
    matched: observations.length,
    rejected: rejected + (rows.length - matched.length),
    error: null,
    robotsAllowed: true,
    etag: doc.etag,
    lastModified: doc.lastModified,
    note:
      observations.length > 0
        ? `${observations.length} price(s) from ${rows.length} feed rows`
        : "no feed row matched a material",
  };
}

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) {
    return true;
  }
  if (h === "0.0.0.0" || h === "::1" || h === "[::1]") return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (
      a === 127 ||
      a === 10 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return true;
    }
  }
  return false;
}

/** Walk parsed JSON-LD nodes for a Product's offers price. */
function findJsonLdPrice(
  node: unknown,
  depth = 0,
): {
  price?: number;
  currency?: string;
  name?: string;
} {
  if (depth > 6 || node === null || typeof node !== "object") return {};
  const obj = node as Record<string, unknown>;
  if (Array.isArray(obj["@graph"])) {
    for (const child of obj["@graph"] as unknown[]) {
      const hit = findJsonLdPrice(child, depth + 1);
      if (hit.price !== undefined) return hit;
    }
  }
  if (Array.isArray(obj.offers)) {
    for (const offer of obj.offers as unknown[]) {
      const hit = findJsonLdPrice(offer, depth + 1);
      if (hit.price !== undefined) return hit;
    }
  }
  const offers = obj.offers as Record<string, unknown> | undefined;
  if (offers && typeof offers === "object") {
    const nested = findJsonLdPrice(offers, depth + 1);
    if (nested.price !== undefined) return nested;
  }
  if (obj["@type"] === "Offer" || obj["@type"] === "AggregateOffer") {
    const raw = obj.lowPrice ?? obj.highPrice ?? obj.price ?? obj.priceCurrency;
    const priceVal = obj.lowPrice ?? obj.highPrice ?? obj.price;
    if (priceVal !== undefined && priceVal !== null) {
      const num = Number(String(priceVal).replace(/[^0-9.]/g, ""));
      if (Number.isFinite(num) && num > 0) {
        return {
          price: num,
          currency:
            typeof obj.priceCurrency === "string"
              ? obj.priceCurrency
              : undefined,
          name: typeof obj.name === "string" ? obj.name : undefined,
        };
      }
    }
  }
  if (obj["@type"] === "Product") {
    const name = typeof obj.name === "string" ? obj.name : undefined;
    if (obj.offers !== undefined) {
      const nested = findJsonLdPrice(obj.offers, depth + 1);
      if (nested.price !== undefined)
        return { ...nested, name: nested.name ?? name };
    }
  }
  for (const v of Object.values(obj)) {
    if (v !== null && typeof v === "object") {
      const hit = findJsonLdPrice(v, depth + 1);
      if (hit.price !== undefined) return hit;
    }
  }
  return {};
}

function extract(html: string): ExtractedPrice {
  // 1. JSON-LD (schema.org Product.offers) — confidence high.
  const ldBlocks =
    html.match(
      /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,
    ) ?? [];
  for (const block of ldBlocks) {
    const body = block.replace(/<[^>]+>/g, "").trim();
    try {
      const parsed = JSON.parse(body);
      const hit = findJsonLdPrice(parsed);
      if (hit.price !== undefined && hit.price > 0) {
        return {
          price: hit.price,
          currency: hit.currency ?? null,
          product_name: hit.name ?? null,
          extraction: "json_ld",
          confidence: "high",
        };
      }
    } catch {
      // malformed JSON-LD — fall through to the next block
    }
  }

  // 2. og:price:amount / product:price:amount meta — medium.
  const metaPrice =
    html.match(
      /<meta[^>]+(?:property|name)="(?:og:price:amount|product:price:amount)"[^>]+content="([\d.,]+)"/i,
    ) ??
    html.match(
      /<meta[^>]+content="([\d.,]+)"[^>]+(?:property|name)="(?:og:price:amount|product:price:amount)"/i,
    );
  const metaCurrency = html.match(
    /<meta[^>]+(?:property|name)="(?:og:price:currency|product:price:currency)"[^>]+content="([A-Z]{3})"/i,
  );
  if (metaPrice) {
    const num = Number(metaPrice[1].replace(/,/g, ""));
    if (Number.isFinite(num) && num > 0) {
      return {
        price: num,
        currency: metaCurrency ? metaCurrency[1] : null,
        product_name: null,
        extraction: "meta",
        confidence: "medium",
      };
    }
  }

  // 3. Currency-amount regex fallback — low.
  const currencyMatch = html.match(
    /(?:[$£€₹¥₩R$]|NGN|GHS|KES|ZAR|AED|SAR|BRL|JPY|EUR|USD|GBP|MXN|CNY|IDR|KRW|INR|CAD|AUD)\s?([\d][\d.,]{1,12})/,
  );
  if (currencyMatch) {
    const num = Number(currencyMatch[1].replace(/,/g, ""));
    if (Number.isFinite(num) && num > 0) {
      return {
        price: num,
        currency: null,
        product_name: null,
        extraction: "regex",
        confidence: "low",
      };
    }
  }

  return {
    price: null,
    currency: null,
    product_name: null,
    extraction: null,
    confidence: null,
  };
}

/** Walks parsed JSON-LD and COLLECTS every product price (search pages
 *  embed many products; product pages embed one). */
function collectJsonLdPrices(
  node: unknown,
  found: Array<{ price: number; currency: string | null }>,
  depth = 0,
): void {
  if (depth > 6 || node === null || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  if (Array.isArray(obj["@graph"])) {
    for (const child of obj["@graph"] as unknown[])
      collectJsonLdPrices(child, found, depth + 1);
  }
  if (Array.isArray(obj.offers)) {
    for (const offer of obj.offers as unknown[])
      collectJsonLdPrices(offer, found, depth + 1);
  } else if (obj.offers && typeof obj.offers === "object") {
    collectJsonLdPrices(obj.offers, found, depth + 1);
  }
  if (obj["@type"] === "Offer" || obj["@type"] === "AggregateOffer") {
    const raw = obj.lowPrice ?? obj.highPrice ?? obj.price;
    if (raw !== undefined && raw !== null) {
      const num = Number(String(raw).replace(/[^0-9.]/g, ""));
      if (Number.isFinite(num) && num > 0) {
        found.push({
          price: num,
          currency:
            typeof obj.priceCurrency === "string" ? obj.priceCurrency : null,
        });
      }
    }
  }
  for (const v of Object.values(obj)) {
    if (v !== null && typeof v === "object")
      collectJsonLdPrices(v, found, depth + 1);
  }
}

/** Median-of-listings extraction for search result pages: robust
 *  against single-listing outliers, requires agreement, and
 *  reports how many listings agree (the observation count). */

/** Listing pages (Amazon and friends) carry no JSON-LD offers, so their prices
 *  have to come from the markup itself. Collecting many and taking the median is
 *  the only honest reading of a search page: one stray "$10" badge must not
 *  become a material price. */
function collectHtmlListingPrices(
  html: string,
  out: Array<{ price: number; currency: string | null }>,
): void {
  const toNumber = (raw: string): number => {
    const cleaned = raw.replace(/[^0-9.,]/g, "");
    const normalised =
      cleaned.includes(",") && cleaned.includes(".")
        ? cleaned.replace(/,/g, "")
        : cleaned.replace(/,/g, ".");
    return Number(normalised);
  };
  const plausible = (value: number) =>
    Number.isFinite(value) && value >= 0.5 && value <= 10_000_000;

  // Amazon-style offscreen price labels ("$12.98").
  for (const m of html.matchAll(
    /class="[^"]*(?:a-offscreen|price)[^"]*"[^>]*>\s*([^<]{1,24})\s*</gi,
  )) {
    if (!/[0-9]/.test(m[1])) continue;
    const value = toNumber(m[1]);
    if (plausible(value)) out.push({ price: value, currency: null });
  }
  // Explicit data attributes.
  for (const m of html.matchAll(
    /data-(?:price|product-price)="([0-9]+(?:[.,][0-9]+)?)"/gi,
  )) {
    const value = toNumber(m[1]);
    if (plausible(value)) out.push({ price: value, currency: null });
  }
}

function extractSearchMedian(html: string): {
  price: number | null;
  currency: string | null;
  agreeing: number;
  confidence: "high" | "medium" | "low" | null;
} {
  const found: Array<{ price: number; currency: string | null }> = [];
  const ldBlocks =
    html.match(
      /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,
    ) ?? [];
  for (const block of ldBlocks) {
    const body = block.replace(/<[^>]+>/g, "").trim();
    try {
      collectJsonLdPrices(JSON.parse(body), found);
    } catch {
      // malformed JSON-LD — fall through
    }
  }
  if (found.length < 2) {
    collectHtmlListingPrices(html, found);
  }
  if (found.length < 2) {
    return { price: null, currency: null, agreeing: 0, confidence: null };
  }
  // Drop 3x/one-third outliers around the raw median, then re-median.
  const sorted = found.map((f) => f.price).sort((a, b) => a - b);
  const rawMedian =
    sorted.length % 2 === 1
      ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const kept = found.filter(
    (f) => f.price >= rawMedian / 3 && f.price <= rawMedian * 3,
  );
  if (kept.length < 2) {
    return { price: null, currency: null, agreeing: 0, confidence: null };
  }
  const kSorted = kept.map((f) => f.price).sort((a, b) => a - b);
  const median =
    kSorted.length % 2 === 1
      ? kSorted[(kSorted.length - 1) / 2]
      : (kSorted[kSorted.length / 2 - 1] + kSorted[kSorted.length / 2]) / 2;
  // Agreement band: listings within 25% of the median.
  const agreeing = kept.filter(
    (f) => f.price >= median * 0.75 && f.price <= median * 1.25,
  );
  if (agreeing.length < 2) {
    return { price: null, currency: null, agreeing: 0, confidence: null };
  }
  const currency =
    agreeing.find((f) => f.currency)?.currency ??
    found.find((f) => f.currency)?.currency ??
    null;
  const confidence = agreeing.length >= 4 ? "high" : "medium";
  return {
    price: Math.round(median * 100) / 100,
    currency,
    agreeing: agreeing.length,
    confidence,
  };
}

interface ScanOutcome {
  source: ScanSource;
  ok: boolean;
  reason?: string;
}

async function scanOneSource(
  supabase: ReturnType<typeof createClient>,
  source: ScanSource,
  runId: string,
  knownMaterialId?: string | null,
): Promise<{
  filed: boolean;
  failed: boolean;
  note: string;
  observation?: ObservationDraft;
}> {
  let parsed: URL;
  try {
    parsed = new URL(source.product_url);
  } catch {
    return { filed: false, failed: true, note: "invalid product_url" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { filed: false, failed: true, note: "unsupported protocol" };
  }
  if (isBlockedHost(parsed.hostname)) {
    return { filed: false, failed: true, note: "blocked host" };
  }

  // Fetch the page.
  let html = "";
  let fetchError: string | null = null;
  let attempts = 0;
  for (let attempt = 0; attempt <= FETCH_RETRY_DELAYS_MS.length; attempt += 1) {
    attempts = attempt + 1;
    try {
      const fetchRes = await fetch(parsed.toString(), {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        redirect: "follow",
      });
      if (fetchRes.ok) {
        html = (await fetchRes.text()).slice(0, 2_000_000);
        fetchError = null;
        break;
      }
      fetchError = `site responded with ${fetchRes.status}`;
      if (!RETRY_STATUSES.has(fetchRes.status)) break;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "network error";
      fetchError = `unreachable: ${msg}`;
    }
    if (attempt < FETCH_RETRY_DELAYS_MS.length) {
      await new Promise((r) => setTimeout(r, FETCH_RETRY_DELAYS_MS[attempt]));
    }
  }
  if (fetchError && attempts > 1) {
    fetchError = `${fetchError} after ${attempts} attempts`;
  }

  const result = fetchError
    ? {
        price: null,
        currency: null,
        product_name: null,
        extraction: null,
        confidence: null,
      }
    : extract(html);

  // ── Validation (never auto-apply; only metadata for review) ──
  const notes: string[] = [];
  let confidence = result.confidence ?? "low";

  // Search sources: replace the single-product extraction with the
  // median-of-agreeing-listings extraction, and record how many
  // listings agreed (the observation count for the auto-apply gate).
  let observations = 1;
  if (!fetchError && source.source_type === "search") {
    const searchMedian = extractSearchMedian(html);
    if (searchMedian.price !== null) {
      result.price = searchMedian.price;
      result.currency = searchMedian.currency;
      result.extraction = "json_ld";
      result.confidence = searchMedian.confidence;
      confidence = searchMedian.confidence;
      observations = searchMedian.agreeing;
      notes.push(`search median of ${searchMedian.agreeing} agreeing listings`);
    } else {
      // No agreeing listings on the search page: a single stray amount from a
      // banner is not a price for this material, so drop it rather than file a
      // misleading candidate.
      result.price = null;
      result.currency = null;
      result.extraction = null;
      result.confidence = null;
      confidence = "low";
      observations = 0;
      notes.push("search page yielded no agreeing product listings");
    }
  }

  // Currency sanity: extracted vs configured.
  const extractedCurrency = result.currency;
  if (
    result.price !== null &&
    extractedCurrency &&
    extractedCurrency.toUpperCase() !== source.currency.toUpperCase()
  ) {
    confidence = "low";
    notes.push(
      `currency mismatch (page ${extractedCurrency} vs source ${source.currency})`,
    );
  }

  // Deviation vs the market's CURRENT book price.
  let deviationNote = "";
  if (result.price !== null) {
    const { data: material } = knownMaterialId
      ? { data: { id: knownMaterialId } }
      : await supabase
          .from("estimation_materials")
          .select("id")
          .eq("slug", source.material_slug)
          .maybeSingle();
    if (material) {
      const { data: current } = await supabase
        .from("estimation_prices")
        .select("price")
        .eq("price_type", "material")
        .eq("ref_id", material.id)
        .eq("market", source.market)
        .eq("is_active", true)
        .order("effective_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (current && Number(current.price) > 0) {
        const deviation = (result.price / Number(current.price) - 1) * 100;
        const band =
          Math.abs(deviation) > 50
            ? "OUTLIER"
            : Math.abs(deviation) > 15
              ? "notable"
              : "in-band";
        deviationNote = `vs current book ${Number(current.price).toFixed(2)} ${source.currency}: ${deviation >= 0 ? "+" : ""}${deviation.toFixed(1)}% (${band})`;
        if (band === "OUTLIER") notes.push(`PRICE OUTLIER — ${deviationNote}`);
        else notes.push(deviationNote);
      } else {
        notes.push("no current book price for this material/market (new)");
      }
    } else {
      notes.push("no shared material record for this slug (add it first)");
    }
  }

  const failed = Boolean(fetchError) || result.price === null;
  const reviewNote = notes.length
    ? `Recurring intel scan (run ${runId.slice(0, 8)}): ${notes.join("; ")}.`
    : null;

  // ── File the candidate (one per source per run; the unique
  // index (source_id, run_id) makes re-processing of the same
  // source within one run a no-op) ──
  const { error: insertError } = await supabase
    .from("price_scan_candidates")
    .insert({
      source_id: source.id,
      run_id: runId,
      market: source.market,
      material_slug: source.material_slug,
      retailer: source.retailer,
      product_url: source.product_url,
      product_name: result.product_name,
      scraped_price: result.price,
      currency: source.currency,
      unit: source.expected_unit ?? "unit",
      extraction: result.extraction,
      confidence,
      scrape_error:
        fetchError ??
        (result.price === null ? "No price found on the page" : null),
      status: failed ? "failed" : "pending",
      observations,
      review_note: reviewNote,
    });
  if (insertError && /duplicate key|unique/i.test(insertError.message)) {
    return { filed: true, failed, note: "already filed this run" };
  }

  // Per-source bookkeeping.
  await supabase
    .from("price_scan_sources")
    .update({
      last_scanned_at: new Date().toISOString(),
      last_scan_status: failed ? "failed" : "pending_review",
      last_scan_error: fetchError ?? null,
    })
    .eq("id", source.id);

  if (insertError) {
    return {
      filed: false,
      failed: true,
      note: `candidate insert failed: ${insertError.message}`,
    };
  }
  const observation: ObservationDraft | undefined =
    !failed && result.price !== null
      ? {
          market: source.market,
          material_slug: source.material_slug,
          brand: (source.brand ?? "").slice(0, 120),
          specification: (source.specification ?? "").slice(0, 160),
          unit: (source.measurement_unit ?? source.expected_unit ?? "").slice(
            0,
            40,
          ),
          price: Math.round(result.price * 100) / 100,
          currency: source.currency,
          supplier_name: source.supplier_name ?? source.retailer,
          supplier_location: source.supplier_location,
          source_id: source.id,
          source_url: source.product_url,
          source_format: source.source_format,
          extraction: result.extraction ?? "html",
          confidence: (confidence as "high" | "medium" | "low") ?? "low",
        }
      : undefined;

  return {
    filed: true,
    failed,
    note: failed ? (fetchError ?? "no price found") : deviationNote || "ok",
    observation,
  };
}

serveWithCors(async (req: Request) => {
  const url = new URL(req.url);

  // Parse the body exactly once: Deno request bodies are a
  // single-consumption stream, so every path below reads this.
  let parsedBody: Record<string, unknown> = {};
  try {
    parsedBody = req.body
      ? ((await req.json()) as Record<string, unknown>)
      : {};
  } catch {
    // empty body from cron is fine
  }

  // ── Auth: cron token OR authenticated admin ──
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  let trigger: "cron" | "admin" = "cron";
  const intelToken = req.headers.get("x-intel-token");
  if (intelToken) {
    const { data: tokenRow } = await supabase
      .from("price_intel_tokens")
      .select("token")
      .eq("token", intelToken)
      .maybeSingle();
    if (!tokenRow) {
      return new Response(JSON.stringify({ error: "invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (parsedBody.trigger === "admin") trigger = "admin";
  } else {
    // Admin on-demand path: Authorization Bearer.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "invalid auth" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    trigger = "admin";
  }

  const bodyParam = url.searchParams.get("market") ?? undefined;
  const marketFilter: string | undefined =
    (parsedBody.market as string) ?? bodyParam;

  // ── Open the run audit row ──
  const { data: run, error: runError } = await supabase
    .from("price_scan_runs")
    .insert({
      trigger,
      markets: marketFilter ? [marketFilter] : [],
      status: "running",
    })
    .select()
    .single();
  if (runError || !run) {
    return new Response(
      JSON.stringify({ error: `could not open run: ${runError?.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  const runId = run.id;

  // ── Load the sources that are due ──
  const forceScan = parsedBody.force === true || trigger === "admin";
  const epochWeek = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
  const weekMod = epochWeek % ROTATION_GROUPS;
  let query = supabase
    .from("price_scan_sources")
    .select(
      "id, market, material_slug, retailer, label, product_url, expected_unit, currency, last_scanned_at, source_type, source_format, brand, specification, measurement_unit, supplier_name, supplier_location, cadence_hours, feed_mapping, consecutive_failures, http_etag, http_last_modified",
    )
    .eq("is_active", true)
    // HTML search sources still rotate to keep an all-market batch inside the
    // invocation budget; structured feeds and product pages are cheap and due.
    .or(
      `rotation_group.eq.${weekMod},source_type.eq.product,source_format.in.(json,api,csv,rss)`,
    )
    .order("last_scanned_at", { ascending: true, nullsFirst: true })
    .order("market")
    .limit(marketFilter ? 200 : 400);
  if (marketFilter) query = query.eq("market", marketFilter);
  if (!forceScan) query = query.lte("next_scan_at", new Date().toISOString());
  const { data: sources, error: sourcesError } = await query;

  if (sourcesError) {
    await supabase
      .from("price_scan_runs")
      .update({
        status: "failed",
        error: sourcesError.message,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);
    return new Response(
      JSON.stringify({
        error: `could not load sources: ${sourcesError.message}`,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const list = (sources ?? []) as ScanSource[];

  // ── Catalogues the market logic needs ──
  const [{ data: materialRows }, { data: marketRows }] = await Promise.all([
    supabase
      .from("estimation_materials")
      .select("slug, name, category")
      .eq("is_active", true)
      .limit(3000),
    supabase
      .from("market_profiles")
      .select("country_code, currency_code, country_name"),
  ]);
  const materials = (materialRows ?? []) as MaterialRef[];
  const materialIdBySlug = new Map<string, string>();
  {
    const { data: idRows } = await supabase
      .from("estimation_materials")
      .select("id, slug")
      .eq("is_active", true)
      .limit(3000);
    for (const row of (idRows ?? []) as Array<{ id: string; slug: string }>) {
      materialIdBySlug.set(row.slug, row.id);
    }
  }
  const currencyByMarket = new Map<string, string>();
  const nameByMarket = new Map<string, string>();
  for (const row of (marketRows ?? []) as Array<{
    country_code: string;
    currency_code: string;
    country_name: string;
  }>) {
    currencyByMarket.set(row.country_code, row.currency_code);
    nameByMarket.set(row.country_code, row.country_name);
  }

  // ── Scan with a small concurrency pool; stagger politely ──
  let scanned = 0;
  let candidatesCreated = 0;
  let candidatesFailed = 0;
  const failures: Array<{ market: string; slug: string; reason: string }> = [];
  const observations: ObservationDraft[] = [];
  const sourceOutcomes: Array<{
    source: ScanSource;
    ok: boolean;
    notModified: boolean;
    robotsAllowed: boolean;
    etag: string | null;
    lastModified: string | null;
    note: string;
  }> = [];

  const runStartedAt = Date.now();
  let skippedForBudget = 0;
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    if (Date.now() - runStartedAt > RUN_BUDGET_MS) {
      skippedForBudget = list.length - i;
      break;
    }
    const batch = list.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (source, j) => {
        if (j > 0) await new Promise((r) => setTimeout(r, STAGGER_MS * j));
        const isStructured = STRUCTURED_FORMATS.includes(source.source_format);
        if (isStructured) {
          const feed = await scanFeedSource(
            source,
            materials,
            currencyByMarket.get(source.market) ?? source.currency,
          );
          return {
            kind: "feed" as const,
            feed,
            observation: undefined as ObservationDraft | undefined,
          };
        }
        const html = await scanOneSource(
          supabase,
          source,
          runId,
          materialIdBySlug.get(source.material_slug) ?? null,
        );
        return {
          kind: "html" as const,
          html,
          observation: html.observation,
        };
      }),
    );
    results.forEach((res, j) => {
      const source = batch[j];
      scanned++;
      if (res.status !== "fulfilled") {
        candidatesFailed++;
        failures.push({
          market: source.market,
          slug: source.material_slug,
          reason: String(res.reason),
        });
        sourceOutcomes.push({
          source,
          ok: false,
          notModified: false,
          robotsAllowed: true,
          etag: null,
          lastModified: null,
          note: String(res.reason),
        });
        return;
      }
      const value = res.value;
      if (value.kind === "feed") {
        const feed = value.feed;
        for (const draft of feed.observations) observations.push(draft);
        if (!feed.ok) {
          candidatesFailed++;
          failures.push({
            market: source.market,
            slug: source.material_slug,
            reason: feed.note || "feed failed",
          });
        } else if (feed.matched > 0) {
          candidatesCreated += feed.matched;
        }
        sourceOutcomes.push({
          source,
          ok: feed.ok,
          notModified: feed.notModified,
          robotsAllowed: feed.robotsAllowed,
          etag: feed.etag,
          lastModified: feed.lastModified,
          note: feed.note,
        });
        return;
      }
      const html = value.html;
      if (html.filed) {
        if (html.failed) candidatesFailed++;
        else candidatesCreated++;
      } else {
        candidatesFailed++;
        failures.push({
          market: source.market,
          slug: source.material_slug,
          reason: html.note,
        });
      }
      if (value.observation) observations.push(value.observation);
      sourceOutcomes.push({
        source,
        ok: value.observation !== undefined,
        notModified: false,
        robotsAllowed: true,
        etag: null,
        lastModified: null,
        note: html.note,
      });
    });
  }

  // ── Persist supplier observations ──
  // The unique (source, supplier, material, variant, day) index makes a second
  // run on the same day a no-op instead of a duplicate fact.
  let observationsFiled = 0;
  if (observations.length > 0) {
    const rows = observations.map((o) => ({
      market: o.market,
      material_slug: o.material_slug,
      material_id: materialIdBySlug.get(o.material_slug) ?? null,
      brand: o.brand,
      specification: o.specification,
      unit: o.unit,
      price: o.price,
      currency: o.currency,
      supplier_name: o.supplier_name,
      supplier_location: o.supplier_location,
      source_id: o.source_id,
      source_url: o.source_url,
      source_format: o.source_format,
      extraction: o.extraction,
      confidence: o.confidence,
      run_id: runId,
    }));
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { data: inserted, error: obsError } = await supabase
        .from("market_price_observations")
        .upsert(chunk, {
          onConflict:
            "source_id,supplier_name,market,material_slug,brand,specification,unit,observed_on",
          ignoreDuplicates: true,
        })
        .select("id");
      if (!obsError && inserted) observationsFiled += inserted.length;
    }
  }

  // ── Per-source bookkeeping: cadence, backoff, availability ──
  const nowIso = new Date().toISOString();
  for (const outcome of sourceOutcomes) {
    const cadence = Math.max(1, outcome.source.cadence_hours ?? 24);
    const failuresBefore = outcome.ok
      ? 0
      : (outcome.source.consecutive_failures ?? 0) + 1;
    // A failing source backs off exponentially but never stops being retried.
    const nextDelayHours = outcome.ok
      ? cadence
      : Math.min(cadence * Math.pow(2, Math.min(failuresBefore, 5)), 168);
    await supabase
      .from("price_scan_sources")
      .update({
        last_scanned_at: nowIso,
        last_success_at: outcome.ok ? nowIso : undefined,
        last_scan_status: outcome.ok
          ? outcome.notModified
            ? "unchanged"
            : "ok"
          : outcome.robotsAllowed
            ? "failed"
            : "blocked",
        last_scan_error: outcome.ok ? null : outcome.note || null,
        consecutive_failures: failuresBefore,
        next_scan_at: new Date(
          Date.now() + nextDelayHours * 3600 * 1000,
        ).toISOString(),
        http_etag: outcome.etag ?? outcome.source.http_etag,
        http_last_modified:
          outcome.lastModified ?? outcome.source.http_last_modified,
        robots_allowed: outcome.robotsAllowed,
        robots_checked_at: nowIso,
      })
      .eq("id", outcome.source.id);
  }

  // ── Refresh aggregates, then promote through the market gate ──
  const touchedMarkets = [
    ...new Set(sourceOutcomes.map((o) => o.source.market)),
  ];
  const groupsTouched = [
    ...new Set(
      observations.map(
        (o) =>
          `${o.market}\u0000${o.material_slug}\u0000${o.brand}\u0000${o.specification}\u0000${o.unit}`,
      ),
    ),
  ];
  for (const key of groupsTouched) {
    const [market, slug, brand, specification, unit] = key.split("\u0000");
    await supabase.rpc("refresh_market_material_price", {
      p_market: market,
      p_material_slug: slug,
      p_brand: brand,
      p_specification: specification,
      p_unit: unit,
    });
  }
  const appliedByMarket = new Map<string, number>();
  for (const market of touchedMarkets) {
    const { data: applied } = await supabase.rpc(
      "apply_market_material_prices",
      {
        p_market: market,
      },
    );
    appliedByMarket.set(market, Number(applied ?? 0));
  }

  // ── Per-market run ledger + cadence + availability alerts ──
  for (const market of touchedMarkets) {
    const marketSources = sourceOutcomes.filter(
      (o) => o.source.market === market,
    );
    const failed = marketSources.filter((o) => !o.ok).length;
    const marketObs = observations.filter((o) => o.market === market).length;
    await supabase.from("market_scan_runs").insert({
      run_id: runId,
      market,
      trigger,
      status:
        failed === marketSources.length && marketSources.length > 0
          ? "failed"
          : "completed",
      sources_total: marketSources.length,
      sources_scanned: marketSources.length,
      observations: marketObs,
      updated_prices: appliedByMarket.get(market) ?? 0,
      failed_sources: failed,
      skipped_not_due: 0,
      duration_ms: Date.now() - runStartedAt,
      finished_at: nowIso,
    });

    const { data: settings } = await supabase
      .from("market_scan_settings")
      .select("cadence_hours")
      .eq("market", market)
      .maybeSingle();
    const cadenceHours = Number(settings?.cadence_hours ?? 24);
    await supabase
      .from("market_scan_settings")
      .update({
        last_run_at: nowIso,
        last_success_at: failed < marketSources.length ? nowIso : undefined,
        next_run_at: new Date(
          Date.now() + cadenceHours * 3600 * 1000,
        ).toISOString(),
        updated_at: nowIso,
      })
      .eq("market", market);

    // A source that has failed three times running is an availability problem
    // an operator must see, not a silent gap.
    for (const outcome of marketSources.filter(
      (o) => !o.ok && (o.source.consecutive_failures ?? 0) >= 2,
    )) {
      const { data: existing } = await supabase
        .from("market_price_alerts")
        .select("id")
        .eq("market", market)
        .eq("kind", "source_failed")
        .is("acknowledged_at", null)
        .gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString())
        .limit(1);
      if ((existing ?? []).length > 0) continue;
      await supabase.from("market_price_alerts").insert({
        market,
        material_slug: outcome.source.material_slug,
        kind: "source_failed",
        severity: "warning",
        message: `${outcome.source.retailer} (${outcome.source.source_format}) has failed ${(outcome.source.consecutive_failures ?? 0) + 1} scans in a row: ${outcome.note}`,
      });
    }
  }

  // ── Auto-apply phase: promote gated candidate groups ──────
  let autoApplied = 0;
  const autoApplySkipped: Array<{
    market: string;
    slug: string;
    reason: string;
  }> = [];

  if (candidatesCreated > 0) {
    const { data: runCandidates } = await supabase
      .from("price_scan_candidates")
      .select(
        "id, source_id, market, material_slug, retailer, scraped_price, currency, unit, confidence, observations, review_note",
      )
      .eq("run_id", runId)
      .eq("status", "pending")
      .not("scraped_price", "is", null);
    const pending = (runCandidates ?? []) as Array<{
      id: string;
      source_id: string | null;
      market: string;
      material_slug: string;
      retailer: string;
      scraped_price: number | null;
      currency: string;
      unit: string | null;
      confidence: string;
      observations: number | null;
      review_note: string | null;
    }>;

    const { data: rulesRows } = await supabase
      .from("price_auto_apply_rules")
      .select(
        "market, min_confidence, max_deviation_percent, min_agreeing_observations",
      )
      .eq("is_active", true);
    const rules = new Map(
      (
        (rulesRows ?? []) as Array<{
          market: string;
          min_confidence: string;
          max_deviation_percent: number;
          min_agreeing_observations: number;
        }>
      ).map((r) => [r.market, r]),
    );

    const groups = new Map<string, typeof pending>();
    for (const c of pending) {
      const key = `${c.market}|${c.material_slug}`;
      const arr = groups.get(key) ?? [];
      arr.push(c);
      groups.set(key, arr);
    }

    const rank = { low: 0, medium: 1, high: 2 } as Record<string, number>;

    for (const [key, group] of groups) {
      const [market, slug] = key.split("|");
      const rule = rules.get(market);
      if (!rule) {
        autoApplySkipped.push({ market, slug, reason: "no active rule" });
        continue;
      }

      // Gate 1: every candidate meets the confidence floor.
      const ranked = group.filter(
        (c) => (rank[c.confidence] ?? -1) >= (rank[rule.min_confidence] ?? 2),
      );
      if (ranked.length === 0) {
        autoApplySkipped.push({
          market,
          slug,
          reason: `below min_confidence ${rule.min_confidence}`,
        });
        continue;
      }

      // Gate 2: total agreeing observations.
      const observations = ranked.reduce(
        (sum, c) => sum + (c.observations ?? 1),
        0,
      );
      if (observations < rule.min_agreeing_observations) {
        autoApplySkipped.push({
          market,
          slug,
          reason: `only ${observations} agreeing observations (need ${rule.min_agreeing_observations})`,
        });
        continue;
      }

      // Gate 3: prices agree within 25% of the group median.
      const prices = ranked
        .map((c) => Number(c.scraped_price))
        .sort((a, b) => a - b);
      const median =
        prices.length % 2 === 1
          ? prices[(prices.length - 1) / 2]
          : (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2;
      const inBand = prices.every(
        (p) => p >= median * 0.75 && p <= median * 1.25,
      );
      if (!inBand) {
        autoApplySkipped.push({
          market,
          slug,
          reason: "sources disagree by more than 25%",
        });
        continue;
      }

      const currency = ranked[0].currency;

      // Resolve the market material record.
      const { data: material } = await supabase
        .from("estimation_materials")
        .select("id")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (!material) {
        autoApplySkipped.push({
          market,
          slug,
          reason: "no material record for slug",
        });
        continue;
      }

      // Current book price (latest active) + origin protection.
      const { data: currentRows } = await supabase
        .from("estimation_prices")
        .select("id, price, origin")
        .eq("price_type", "material")
        .eq("ref_id", material.id)
        .eq("market", market)
        .eq("is_active", true)
        .order("effective_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      const current = currentRows as {
        id: string;
        price: number;
        origin: string;
      } | null;

      if (current && current.origin === "manual") {
        autoApplySkipped.push({
          market,
          slug,
          reason: "current price is admin-manual; stays pending for review",
        });
        continue;
      }

      // Gate 4: deviation vs the current book price.
      if (current && Number(current.price) > 0) {
        const deviation = (median / Number(current.price) - 1) * 100;
        if (Math.abs(deviation) > Number(rule.max_deviation_percent)) {
          autoApplySkipped.push({
            market,
            slug,
            reason: `deviation ${deviation.toFixed(1)}% exceeds ${rule.max_deviation_percent}% gate`,
          });
          continue;
        }
      }

      // Deactivate the current active row, insert the scan row.
      if (current) {
        await supabase
          .from("estimation_prices")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", current.id);
      }
      const appliedNote = `Weekly auto-scan (run ${runId.slice(0, 8)}): median of ${observations} agreeing observations from ${[...new Set(ranked.map((c) => c.retailer))].join(", ")}. Replaces the previous ${current ? current.origin : "first"} price.`;
      const { data: appliedRow, error: applyError } = await supabase
        .from("estimation_prices")
        .insert({
          price_type: "material",
          ref_id: material.id,
          price: median,
          currency,
          effective_date: new Date().toISOString().slice(0, 10),
          notes: appliedNote,
          is_active: true,
          price_source: appliedNote,
          scan_confidence: ranked[0].confidence,
          market,
          origin: "scan",
        })
        .select("id")
        .single();
      if (applyError || !appliedRow) {
        autoApplySkipped.push({
          market,
          slug,
          reason: `apply insert failed: ${applyError?.message ?? "unknown"}`,
        });
        continue;
      }

      // Audit history row.
      await supabase.from("estimation_price_history").insert({
        price_type: "material",
        ref_id: material.id,
        old_price: current ? Number(current.price) : null,
        new_price: median,
        currency,
        changed_by: null,
        change_reason: `weekly_auto_scan (run ${runId.slice(0, 8)}): ${appliedNote}`,
      });

      // Mark the group's candidates applied.
      const ids = ranked.map((c) => c.id);
      await supabase
        .from("price_scan_candidates")
        .update({
          status: "auto_applied",
          applied_price_id: appliedRow.id,
          reviewed_at: new Date().toISOString(),
          review_note:
            (ranked.length && ranked[0].review_note
              ? ranked[0].review_note + " "
              : "") + `AUTO-APPLIED: ${appliedNote}`,
        })
        .in("id", ids);
      autoApplied++;
    }
  }

  // ── Close the run audit row ──
  const finishedAt = new Date().toISOString();
  await supabase
    .from("price_scan_runs")
    .update({
      status: "completed",
      sources_total: list.length + skippedForBudget,
      sources_scanned: scanned,
      candidates_created: candidatesCreated,
      candidates_failed: candidatesFailed,
      observations_filed: observationsFiled,
      markets_scanned: touchedMarkets.length,
      prices_updated: [...appliedByMarket.values()].reduce((a, b) => a + b, 0),
      auto_applied: autoApplied,
      finished_at: finishedAt,
      notes:
        (failures.length > 0
          ? `${failures.length} source-level failures; first: ${failures[0].market}/${failures[0].slug} (${failures[0].reason})`
          : "") +
          (autoApplySkipped.length > 0
            ? `${failures.length > 0 ? "; " : ""}${autoApplySkipped.length} group(s) not auto-applied; first: ${autoApplySkipped[0].market}/${autoApplySkipped[0].slug} (${autoApplySkipped[0].reason})`
            : "") +
          (skippedForBudget > 0
            ? `${failures.length > 0 || autoApplySkipped.length > 0 ? "; " : ""}${skippedForBudget} source(s) left for the next run (time budget)`
            : "") || null,
    })
    .eq("id", runId);

  return new Response(
    JSON.stringify({
      run_id: runId,
      trigger,
      market: marketFilter ?? "all",
      sources: list.length,
      scanned,
      candidates_created: candidatesCreated,
      candidates_failed: candidatesFailed,
      observations_filed: observationsFiled,
      markets_scanned: touchedMarkets.length,
      prices_updated: [...appliedByMarket.values()].reduce((a, b) => a + b, 0),
      auto_applied: autoApplied,
      auto_apply_skipped: autoApplySkipped.slice(0, 20),
      failures: failures.slice(0, 20),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
