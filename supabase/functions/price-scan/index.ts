// =========================================================
// Price Scan — Supabase Edge Function
// =========================================================
// Admin → Price Scan ("browse websites for prices"): fetches a
// retailer product page server-side (SSRF-guarded, same rules as
// ad-from-url) and extracts its REAL price, never invented:
//
//   1. JSON-LD (schema.org Product.offers) — confidence high
//   2. og:price:amount / product:price:amount meta — medium
//   3. Currency-amount regex fallback — low
//
// The result is stored as a PENDING price_scan_candidates row.
// Nothing touches estimation_prices here — only an explicit
// admin approval in the UI promotes a candidate into the price
// book (with the retailer recorded in price_source).
// =========================================================

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { errorResponse, handleCors } from "../_shared/cors.ts";
import { serveWithCors } from "../_shared/serve.ts";

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

interface ScanBody {
  source_id?: string;
  url?: string;
  market?: string;
  material_slug?: string;
  retailer?: string;
  currency?: string;
  unit?: string;
}

interface ExtractedPrice {
  price: number | null;
  currency: string | null;
  product_name: string | null;
  extraction: "json_ld" | "meta" | "regex" | null;
  confidence: "high" | "medium" | "low" | null;
}

/** Walk parsed JSON-LD nodes for a Product's offers price. */
function findJsonLdPrice(
  node: unknown,
  depth = 0,
): {
  price?: number;
  currency?: string;
  name?: string;
} | null {
  if (depth > 6 || node === null || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  const types = Array.isArray(type) ? type.map(String) : [String(type ?? "")];
  if (types.some((t) => t.toLowerCase() === "product")) {
    const offers = obj.offers;
    const offerList = Array.isArray(offers) ? offers : offers ? [offers] : [];
    for (const o of offerList) {
      if (typeof o !== "object" || o === null) continue;
      const rec = o as Record<string, unknown>;
      const raw =
        (rec.price as number | string | undefined) ??
        (rec.lowPrice as number | string | undefined) ??
        (rec.highPrice as number | string | undefined);
      const parsed = typeof raw === "number" ? raw : Number(String(raw ?? ""));
      if (Number.isFinite(parsed) && parsed > 0) {
        return {
          price: parsed,
          currency:
            typeof rec.priceCurrency === "string"
              ? rec.priceCurrency
              : undefined,
          name: typeof obj.name === "string" ? obj.name : undefined,
        };
      }
    }
  }
  for (const value of Object.values(obj)) {
    const found = findJsonLdPrice(value, depth + 1);
    if (found) return found;
  }
  return null;
}

function meta(html: string, prop: string): string | null {
  const m =
    html.match(
      new RegExp(
        `<meta[^>]+(?:property|name|itemprop)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
    ) ||
    html.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["']${prop}["']`,
        "i",
      ),
    );
  return m ? m[1].trim() : null;
}

function extract(html: string): ExtractedPrice {
  // 1. JSON-LD
  const ldMatches = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const m of ldMatches) {
    try {
      const parsed: unknown = JSON.parse(m[1].trim());
      const found = findJsonLdPrice(parsed);
      if (found?.price) {
        return {
          price: Math.round(found.price * 100) / 100,
          currency: found.currency ?? null,
          product_name: found.name ?? null,
          extraction: "json_ld",
          confidence: "high",
        };
      }
    } catch {
      // malformed JSON-LD block: skip, try the next
    }
  }

  // 2. Price meta tags
  const metaPrice =
    meta(html, "og:price:amount") ??
    meta(html, "product:price:amount") ??
    meta(html, "og:price:standard_amount");
  if (metaPrice) {
    const parsed = Number(metaPrice.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) {
      return {
        price: Math.round(parsed * 100) / 100,
        currency:
          meta(html, "product:price:currency") ??
          meta(html, "og:price:currency"),
        product_name: meta(html, "og:title"),
        extraction: "meta",
        confidence: "medium",
      };
    }
  }

  // 3. Currency-amount regex fallback (USD/EUR/GBP/NGN/₦/£/€/$)
  const m = html.match(
    /(?:[$£€₹]|USD\s*|EUR\s*|GBP\s*|NGN\s*)([0-9]{1,6}(?:[.,][0-9]{2})?)\b/,
  );
  if (m) {
    const parsed = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) {
      return {
        price: parsed,
        currency: null,
        product_name: meta(html, "og:title"),
        extraction: "regex",
        confidence: "low",
      };
    }
  }

  return {
    price: null,
    currency: null,
    product_name: meta(html, "og:title"),
    extraction: null,
    confidence: null,
  };
}

serveWithCors(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // ── Auth: admin only (same gate as ad-from-url) ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Authentication required", 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return errorResponse("Invalid authentication", 401);
    }
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return errorResponse("Admin access required", 403);
    }

    // ── Body: a configured source_id, or a direct url payload ──
    const body = (await req.json()) as ScanBody;
    let source: Record<string, unknown> | null = null;
    if (body.source_id) {
      const { data, error: srcError } = await supabaseClient
        .from("price_scan_sources")
        .select("*")
        .eq("id", body.source_id)
        .maybeSingle();
      if (srcError || !data) {
        return errorResponse("Scan source not found", 404);
      }
      source = data as Record<string, unknown>;
    }
    const rawUrl = String(body.url ?? source?.product_url ?? "").trim();
    if (!rawUrl) {
      return errorResponse("A product URL is required", 400);
    }
    const target = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return errorResponse("That is not a valid URL", 400);
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return errorResponse("Only http:// and https:// URLs are supported", 400);
    }
    if (isBlockedHost(parsed.hostname)) {
      return errorResponse("That host cannot be fetched", 400);
    }

    // ── Derived fields (computed BEFORE fetching so a blocked or
    // unreachable retailer is still recorded as a FAILED candidate the
    // admin can review — a bot-blocked page is a scan outcome, not a
    // server error. Returning 502s here made the client UI show an
    // opaque "Edge Function returned a non-2xx status code" instead
    // of the actual reason: fix M-2026-10-10) ──
    const market = String(body.market ?? source?.market ?? "US");
    const materialSlug = String(
      body.material_slug ?? source?.material_slug ?? "",
    );
    const retailer = String(
      body.retailer ?? source?.retailer ?? parsed.hostname,
    );

    // ── Fetch the page ──
    let html = "";
    let fetchError: string | null = null;
    try {
      const fetchRes = await fetch(parsed.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FreluxPriceScan/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(10000),
        redirect: "follow",
      });
      if (!fetchRes.ok) {
        fetchError = `That site responded with ${fetchRes.status}`;
      } else {
        html = (await fetchRes.text()).slice(0, 2_000_000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "network error";
      fetchError = `Could not reach that URL: ${msg}`;
    }

    const result = fetchError
      ? { price: null, currency: null, product_name: null, extraction: null, confidence: null }
      : extract(html);

    // ── Store the scan as a candidate (pending review — never auto-apply) ──
    const candidateRow = {
      source_id: body.source_id ?? null,
      market,
      material_slug: materialSlug,
      retailer,
      product_url: parsed.toString(),
      product_name: result.product_name,
      scraped_price: result.price,
      currency: String(
        result.currency ?? body.currency ?? source?.currency ?? "USD",
      ),
      unit: String(body.unit ?? source?.expected_unit ?? "unit"),
      extraction: result.extraction,
      confidence: result.confidence ?? "low",
      scrape_error: fetchError ??
        (result.price === null ? "No price found on the page" : null),
      status: (fetchError || result.price === null) ? "failed" : "pending",
    };
    const { data: candidate, error: insertError } = await supabaseClient
      .from("price_scan_candidates")
      .insert(candidateRow)
      .select()
      .single();

    if (body.source_id) {
      await supabaseClient
        .from("price_scan_sources")
        .update({ last_scanned_at: new Date().toISOString() })
        .eq("id", body.source_id);
    }

    if (insertError || !candidate) {
      return errorResponse(
        `Could not save the scan result: ${insertError?.message ?? "unknown"}`,
        500,
      );
    }

    return new Response(JSON.stringify({ candidate }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unexpected error";
    return errorResponse(msg, 500);
  }
});
