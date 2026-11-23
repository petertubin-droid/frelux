// =========================================================
// Ported: price-index-api (public read)
//
// Same statistical contract as src/lib/price-index/stats.ts and the Supabase
// function: at least three observations before a figure is published, median as
// the headline, median/MAD outlier removal above five observations.
//
// Reads go straight to PostgREST with the service role binding: two GETs, no
// client library, and the sample gate is applied here so no consumer can see a
// figure the site would refuse to show.
// =========================================================

import { hasBindings, json, checkRateLimit, clientKey, type EdgeEnv, type EdgeHandler } from "./runtime";

const MIN_SAMPLES = 3;
const MIN_SAMPLES_FOR_OUTLIER_RULE = 5;
const CACHE_TTL_MS = 60_000;

export const requiredBindings = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;

type PriceRow = {
  ref_id: string;
  price: number | string;
  currency: string | null;
  city_slug: string | null;
  price_kind: string | null;
  sale_unit: string | null;
  supplier_name: string | null;
  price_source: string | null;
  effective_date: string | null;
  verification_status: string | null;
};

type MaterialRow = { id: string; name: string; slug: string; category: string };

const cache = new Map<string, { at: number; payload: unknown }>();

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function removeOutliers(values: number[]): number[] {
  if (values.length < MIN_SAMPLES_FOR_OUTLIER_RULE) return values;
  const centre = median(values);
  const mad = 1.4826 * median(values.map((value) => Math.abs(value - centre)));
  if (mad === 0) return values;
  const kept = values.filter((value) => Math.abs(value - centre) <= 3.5 * mad);
  return kept.length >= MIN_SAMPLES ? kept : values;
}

export function stats(values: number[]) {
  if (values.length < MIN_SAMPLES) {
    return { status: "insufficient" as const, count: values.length, required: MIN_SAMPLES };
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

async function restGet<T>(env: EdgeEnv, path: string): Promise<T[]> {
  const base = String(env.SUPABASE_URL).replace(/\/+$/, "");
  const res = await fetch(`${base}/rest/v1/${path}`, {
    headers: {
      apikey: String(env.SUPABASE_SERVICE_ROLE_KEY),
      authorization: `Bearer ${String(env.SUPABASE_SERVICE_ROLE_KEY)}`,
      accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`PostgREST ${res.status}`);
  const rows = (await res.json()) as unknown;
  return Array.isArray(rows) ? (rows as T[]) : [];
}

export const priceIndexApiHandler: EdgeHandler = async (request, env, _ctx, cors) => {
  if (request.method !== "GET") {
    return json({ ok: false, error: "Use GET." }, 405, cors);
  }
  if (!hasBindings(env, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])) {
    return json({ ok: false, error: "Pricing service is not configured." }, 503, cors);
  }

  const limit = checkRateLimit(`price-index:${clientKey(request)}`, {
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return new Response(JSON.stringify({ ok: false, error: "Rate limit reached." }), {
      status: 429,
      headers: {
        ...cors,
        "content-type": "application/json",
        "retry-after": String(limit.retryAfterSeconds),
      },
    });
  }

  const params = new URL(request.url).searchParams;
  const city = params.get("city");
  const category = params.get("category");
  const materialSlug = params.get("material");
  const cacheKey = [city ?? "*", category ?? "*", materialSlug ?? "*"].join("|");

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return new Response(JSON.stringify(cached.payload), {
      status: 200,
      headers: {
        ...cors,
        "content-type": "application/json",
        "cache-control": "public, max-age=60",
        "x-cache": "hit",
      },
    });
  }

  let prices: PriceRow[];
  try {
    const query = [
      "estimation_prices?select=ref_id,price,currency,city_slug,price_kind,sale_unit,supplier_name,price_source,effective_date,verification_status",
      "price_type=eq.material",
      "market=eq.NG",
      "is_active=eq.true",
      "order=effective_date.desc",
      "limit=1000",
      city ? `city_slug=eq.${encodeURIComponent(city)}` : "",
    ]
      .filter(Boolean)
      .join("&");
    prices = await restGet<PriceRow>(env, query);
  } catch {
    return json({ ok: false, error: "The index could not be read." }, 500, cors);
  }

  const materialIds = Array.from(
    new Set(prices.map((row) => row.ref_id).filter(Boolean)),
  );

  let materials: Record<string, MaterialRow> = {};
  if (materialIds.length) {
    try {
      const rows = await restGet<MaterialRow>(
        env,
        `estimation_materials?select=id,name,slug,category&id=in.(${materialIds
          .map((id) => encodeURIComponent(id))
          .join(",")})`,
      );
      materials = Object.fromEntries(rows.map((row) => [row.id, row]));
    } catch {
      // A materials read failure must not publish figures without names.
      return json({ ok: false, error: "The index could not be read." }, 500, cors);
    }
  }

  const grouped = new Map<string, PriceRow[]>();
  for (const row of prices) {
    const material = materials[row.ref_id];
    if (!material) continue;
    if (category && material.category !== category) continue;
    if (materialSlug && material.slug !== materialSlug) continue;
    const bucket = grouped.get(row.ref_id);
    if (bucket) bucket.push(row);
    else grouped.set(row.ref_id, [row]);
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
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      ...cors,
      "content-type": "application/json",
      "cache-control": "public, max-age=60",
      "x-cache": "miss",
    },
  });
};

export const priceIndexApiConfig = {
  name: "price-index-api",
  methods: ["GET"],
  requiredBindings: [...requiredBindings],
  handler: priceIndexApiHandler,
};
