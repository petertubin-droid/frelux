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
// IT NEVER WRITES estimation_prices. Promoting a candidate into
// the live price book stays an explicit admin approval in
// AdminPriceScan — so admin overrides and manual prices survive
// automation by construction. A failing source never aborts the
// batch; it is recorded as a failed candidate.
//
// Deploy with --no-verify-jwt (the token header IS the gate).
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";

const CONCURRENCY = 6;
const STAGGER_MS = 700;
const FETCH_TIMEOUT_MS = 10_000;

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
  try {
    const fetchRes = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FreluxPriceIntel/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!fetchRes.ok) {
      fetchError = `site responded with ${fetchRes.status}`;
    } else {
      html = (await fetchRes.text()).slice(0, 2_000_000);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "network error";
    fetchError = `unreachable: ${msg}`;
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

  // ── Load active sources ──
  let query = supabase
    .from("price_scan_sources")
    .select(
      "id, market, material_slug, retailer, label, product_url, expected_unit, currency, last_scanned_at",
    )
    .eq("is_active", true)
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
  for (let i = 0; i < list.length; i += CONCURRENCY) {
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

  // ── Close the run audit row ──
  const finishedAt = new Date().toISOString();
  await supabase
    .from("price_scan_runs")
    .update({
      status: "completed",
      sources_total: list.length,
      sources_scanned: scanned,
      candidates_created: candidatesCreated,
      candidates_failed: candidatesFailed,
      finished_at: finishedAt,
      notes:
        failures.length > 0
          ? `${failures.length} source-level failures; first: ${failures[0].market}/${failures[0].slug} (${failures[0].reason})`
          : null,
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
      failures: failures.slice(0, 20),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
