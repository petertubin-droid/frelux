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
}

interface ExtractedPrice {
  price: number | null;
  currency: string | null;
  product_name: string | null;
  extraction: "json_ld" | "meta" | "regex" | null;
  confidence: "high" | "medium" | "low" | null;
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
  for (const m of html.matchAll(/data-(?:price|product-price)="([0-9]+(?:[.,][0-9]+)?)"/gi)) {
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
): Promise<{ filed: boolean; failed: boolean; note: string }> {
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
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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
    const { data: material } = await supabase
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
  return {
    filed: true,
    failed,
    note: failed ? (fetchError ?? "no price found") : deviationNote || "ok",
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

  // ── Load active sources (search sources on their rotation week) ──
  const epochWeek = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
  const weekMod = epochWeek % ROTATION_GROUPS;
  let query = supabase
    .from("price_scan_sources")
    .select(
      "id, market, material_slug, retailer, label, product_url, expected_unit, currency, last_scanned_at, source_type",
    )
    .eq("is_active", true)
    // product sources scan every week; search sources only on
    // their rotation week, keeping the run inside its budget.
    .or(`rotation_group.eq.${weekMod},source_type.eq.product`)
    // Stalest first: with a bounded run, ordering by market alone means the
    // alphabetical tail is never reached once the source book outgrows the cap.
    .order("last_scanned_at", { ascending: true, nullsFirst: true })
    .order("market")
    .limit(200);
  if (marketFilter) query = query.eq("market", marketFilter);
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

  // ── Scan with a small concurrency pool; stagger politely ──
  let scanned = 0;
  let candidatesCreated = 0;
  let candidatesFailed = 0;
  const failures: Array<{ market: string; slug: string; reason: string }> = [];

  const outcomes: ScanOutcome[] = [];
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
        return scanOneSource(supabase, source, runId);
      }),
    );
    results.forEach((res, j) => {
      const source = batch[j];
      scanned++;
      if (res.status === "fulfilled") {
        if (res.value.filed) {
          if (res.value.failed) candidatesFailed++;
          else candidatesCreated++;
        } else {
          candidatesFailed++;
          failures.push({
            market: source.market,
            slug: source.material_slug,
            reason: res.value.note,
          });
        }
      } else {
        candidatesFailed++;
        failures.push({
          market: source.market,
          slug: source.material_slug,
          reason: String(res.reason),
        });
      }
      outcomes.push({ source, ok: res.status === "fulfilled" });
    });
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
      auto_applied: autoApplied,
      auto_apply_skipped: autoApplySkipped.slice(0, 20),
      failures: failures.slice(0, 20),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
