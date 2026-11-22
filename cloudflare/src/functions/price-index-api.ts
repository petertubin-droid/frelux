/**
 * GET /api/fn/price-index-api — native Worker port of
 * supabase/functions/price-index-api.
 *
 * A reusable JSON endpoint for the live material price index: aggregated
 * market figures with the sample gate applied server-side, so any consumer
 * (partner site, embed, future app) gets the same honest numbers the site
 * shows.
 *
 * The statistics are NOT reimplemented here: `computeStats` from
 * src/lib/price-index/stats.ts is the canonical, tested implementation, and
 * the Worker imports it. The Supabase function kept a local copy that had to
 * be kept in sync by hand; that duplication ends with this port.
 *
 * Worldwide-first: `market` is a query parameter defaulting to NG so existing
 * consumers keep working, and the currency is read from the rows rather than
 * hardcoded.
 */
import { json, type ApiEnv } from "../api";
import { computeStats, MIN_SAMPLES } from "../../../src/lib/price-index/stats";
import { RATE_LIMITS, clientKey, hit, rateLimitedResponse } from "./rate-limit";

const CACHE_TTL_MS = 60_000;

type Cached = { at: number; payload: unknown };
const cache = new Map<string, Cached>();

const reply = (
  payload: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  json(payload, status, {
    "cache-control": "public, max-age=60",
    ...headers,
  });

interface PriceRow {
  ref_id: string | null;
  price: number | string | null;
  currency: string | null;
  city_slug: string | null;
  price_kind: string | null;
  sale_unit: string | null;
  supplier_name: string | null;
  price_source: string | null;
  effective_date: string | null;
  verification_status: string | null;
}

interface MaterialRow {
  id: string;
  name: string;
  slug: string;
  category: string;
}

function serviceHeaders(env: ApiEnv): Record<string, string> | null {
  const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!env.SUPABASE_URL || !key) return null;
  const headers: Record<string, string> = { apikey: key };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  return headers;
}

export async function priceIndexApi(
  request: Request,
  env: ApiEnv,
  url: URL,
  cors: Record<string, string> = {},
): Promise<Response> {
  if (request.method !== "GET") {
    return reply({ ok: false, error: "Use GET." }, 405, cors);
  }

  const headers = serviceHeaders(env);
  if (!headers) {
    return reply(
      { ok: false, error: "Pricing service is not configured." },
      500,
      cors,
    );
  }
  const base = (env.SUPABASE_URL as string).replace(/\/$/, "");

  const limit = await hit(clientKey(request, "price-index-api"), RATE_LIMITS.GENERAL);
  if (!limit.allowed) return rateLimitedResponse(limit.resetAt, cors);

  const params = url.searchParams;
  const market = (params.get("market") ?? "NG").toUpperCase();
  const city = params.get("city");
  const category = params.get("category");
  const materialSlug = params.get("material");
  const cacheKey = [
    market,
    city ?? "*",
    category ?? "*",
    materialSlug ?? "*",
  ].join("|");

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return reply(cached.payload, 200, { ...cors, "x-cache": "hit" });
  }

  const select =
    "ref_id,price,currency,city_slug,price_kind,sale_unit,supplier_name," +
    "price_source,effective_date,verification_status";
  const query = [
    `select=${select}`,
    "price_type=eq.material",
    `market=eq.${encodeURIComponent(market)}`,
    "is_active=eq.true",
    "order=effective_date.desc",
    "limit=1000",
  ];
  if (city) query.push(`city_slug=eq.${encodeURIComponent(city)}`);

  let prices: PriceRow[];
  try {
    const res = await fetch(`${base}/rest/v1/estimation_prices?${query.join("&")}`, {
      headers,
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    prices = (await res.json()) as PriceRow[];
  } catch (error) {
    console.error(
      "price index read failed",
      error instanceof Error ? error.message : error,
    );
    return reply({ ok: false, error: "The index could not be read." }, 500, cors);
  }

  const materialIds = Array.from(
    new Set(prices.map((row) => row.ref_id).filter((id): id is string => !!id)),
  );

  let materials: Record<string, MaterialRow> = {};
  if (materialIds.length) {
    try {
      const res = await fetch(
        `${base}/rest/v1/estimation_materials?select=id,name,slug,category&id=in.(${materialIds
          .map((id) => encodeURIComponent(id))
          .join(",")})`,
        { headers },
      );
      if (res.ok) {
        const rows = (await res.json()) as MaterialRow[];
        materials = Object.fromEntries(rows.map((row) => [row.id, row]));
      }
    } catch {
      // Materials missing means no named items; the payload still answers.
      materials = {};
    }
  }

  const grouped = new Map<string, PriceRow[]>();
  for (const row of prices) {
    const material = row.ref_id ? materials[row.ref_id] : undefined;
    if (!material) continue;
    if (category && material.category !== category) continue;
    if (materialSlug && material.slug !== materialSlug) continue;
    const bucket = grouped.get(material.id);
    if (bucket) bucket.push(row);
    else grouped.set(material.id, [row]);
  }

  const items = Array.from(grouped.entries()).map(([materialId, rows]) => {
    const material = materials[materialId];
    const usable = rows.filter(
      (row) => Number(row.price) > 0 && row.verification_status !== "flagged",
    );
    const result = computeStats(
      usable.map((row) => ({
        value: Number(row.price),
        observed_at: row.effective_date ?? "",
        verification_status: (row.verification_status ?? "unverified") as
          | "verified"
          | "reported"
          | "unverified"
          | "flagged"
          | null,
      })),
    );
    const latest = usable
      .filter((row) => row.effective_date)
      .sort((a, b) => (a.effective_date! < b.effective_date! ? 1 : -1))[0];

    return {
      material_id: materialId,
      name: material.name,
      slug: material.slug,
      category: material.category,
      sale_unit: latest?.sale_unit ?? null,
      currency: latest?.currency ?? "NGN",
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
    market,
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
  return reply(payload, 200, { ...cors, "x-cache": "miss" });
}
