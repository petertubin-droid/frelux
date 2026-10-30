// Live Material Price Index, public read API.
//
// A reusable JSON endpoint for the index: aggregated market figures with the
// sample gate applied server-side, so any consumer (partner site, embed,
// future app) gets the same honest numbers the site shows.
//
// Caching: results are held in module memory for 60 seconds, keyed on the
// query. Price approvals are rare, so a minute of staleness costs nothing and
// removes almost all repeat database work. Rate limiting is per caller.
//
// The statistical rules here mirror src/lib/price-index/stats.ts, which is the
// tested canonical implementation: minimum three observations for a market
// figure, median as the headline, median/MAD outlier removal above five
// observations. If those thresholds change, both must change together.

import { createClient } from "npm:@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitHeaders,
} from "../_shared/rate-limit.ts";

const MIN_SAMPLES = 3;
const MIN_SAMPLES_FOR_OUTLIER_RULE = 5;
const CACHE_TTL_MS = 60_000;

type Cached = { at: number; payload: unknown };
const cache = new Map<string, Cached>();

function json(payload: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
      ...headers,
    },
  });
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function removeOutliers(values: number[]): number[] {
  if (values.length < MIN_SAMPLES_FOR_OUTLIER_RULE) return values;
  const centre = median(values);
  const mad = 1.4826 * median(values.map((value) => Math.abs(value - centre)));
  if (mad === 0) return values;
  const kept = values.filter((value) => Math.abs(value - centre) <= 3.5 * mad);
  return kept.length >= MIN_SAMPLES ? kept : values;
}

function stats(values: number[]) {
  if (values.length < MIN_SAMPLES) {
    return {
      status: "insufficient" as const,
      count: values.length,
      required: MIN_SAMPLES,
    };
  }
  const kept = removeOutliers(values);
  const md = median(kept);
  return {
    status: "ok" as const,
    count: values.length,
    counted: kept.length,
    excluded_outliers: values.length - kept.length,
    median: Math.round(md * 100) / 100,
    min: Math.min(...kept),
    max: Math.max(...kept),
  };
}

serveWithCors(async (req: Request): Promise<Response> => {
  if (req.method !== "GET") return json({ ok: false, error: "Use GET." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return json({ ok: false, error: "Pricing service is not configured." }, 500);
  }

  const limit = checkRateLimit(await getRateLimitKey(req), {
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return json(
      { ok: false, error: "Rate limit reached." },
      429,
      rateLimitHeaders(limit.remaining, limit.resetAt),
    );
  }

  const params = new URL(req.url).searchParams;
  const city = params.get("city");
  const category = params.get("category");
  const materialSlug = params.get("material");
  const cacheKey = [city ?? "*", category ?? "*", materialSlug ?? "*"].join("|");

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return json(cached.payload, 200, { "X-Cache": "hit" });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  let priceQuery = supabase
    .from("estimation_prices")
    .select(
      "ref_id,price,currency,city_slug,price_kind,sale_unit,supplier_name,price_source,effective_date,verification_status",
    )
    .eq("price_type", "material")
    .eq("market", "NG")
    .eq("is_active", true)
    .order("effective_date", { ascending: false })
    .limit(1000);

  if (city) priceQuery = priceQuery.eq("city_slug", city);

  const { data: prices, error } = await priceQuery;
  if (error) {
    console.error("price index read failed", error.message);
    return json({ ok: false, error: "The index could not be read." }, 500);
  }

  const materialIds = Array.from(
    new Set((prices ?? []).map((row) => row.ref_id as string).filter(Boolean)),
  );

  let materials: Record<string, { name: string; slug: string; category: string }> = {};
  if (materialIds.length) {
    const { data: materialRows } = await supabase
      .from("estimation_materials")
      .select("id,name,slug,category")
      .in("id", materialIds);
    materials = Object.fromEntries(
      (materialRows ?? []).map((row) => [
        row.id as string,
        { name: row.name as string, slug: row.slug as string, category: row.category as string },
      ]),
    );
  }

  const grouped = new Map<string, typeof prices>();
  for (const row of prices ?? []) {
    const material = materials[row.ref_id as string];
    if (!material) continue;
    if (category && material.category !== category) continue;
    if (materialSlug && material.slug !== materialSlug) continue;
    const key = row.ref_id as string;
    const bucket = grouped.get(key);
    if (bucket) bucket.push(row);
    else grouped.set(key, [row]);
  }

  const items = Array.from(grouped.entries()).map(([materialId, rows]) => {
    const material = materials[materialId];
    const usable = rows.filter(
      (row) => Number(row.price) > 0 && row.verification_status !== "flagged",
    );
    const result = stats(usable.map((row) => Number(row.price)));
    const latest = usable
      .filter((row) => row.effective_date)
      .sort((a, b) => (a.effective_date! < b.effective_date! ? 1 : -1))[0];

    return {
      material_id: materialId,
      name: material.name,
      slug: material.slug,
      category: material.category,
      sale_unit: latest?.sale_unit ?? null,
      currency: "NGN",
      price_kind: latest?.price_kind ?? null,
      basis: city ? "city" : "national",
      city_slug: city ?? null,
      source: latest?.supplier_name ?? latest?.price_source ?? null,
      last_observed_at: latest?.effective_date ?? null,
      verification_status: latest?.verification_status ?? "unverified",
      ...result,
    };
  });

  const payload = {
    ok: true,
    generated_at: new Date().toISOString(),
    market: "NG",
    min_samples: MIN_SAMPLES,
    city: city ?? null,
    category: category ?? null,
    materials_with_figure: items.filter((item) => item.status === "ok").length,
    items: items.sort((a, b) => a.name.localeCompare(b.name)),
    notes: [
      "A figure is published only when at least three independent observations support it.",
      "median is the headline value; min and max are the range of the retained observations.",
      "Figures are reported or verified as stated per item; reported prices carry a source but no independent verification.",
    ],
  };

  cache.set(cacheKey, { at: Date.now(), payload });
  return json(payload, 200, { "X-Cache": "miss" });
});
