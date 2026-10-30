// Live Material Price Index, price submission endpoint.
//
// Public write path. Everything a client could tamper with is validated here:
// the city must exist and be enabled, the price must be a plausible positive
// naira amount, the basis must be one of the four recorded kinds, and a source
// link must be well formed if given. Duplicates inside 24 hours are refused so
// one supplier cannot seed a market sample by resubmitting.
//
// A submission never becomes a published price. It waits for an administrator
// in price-index-review.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import {
  RATE_LIMITS,
  checkRateLimit,
  getRateLimitKey,
  rateLimitHeaders,
} from "../_shared/rate-limit.ts";

const PRICE_KINDS = ["retail", "wholesale", "delivery_inclusive", "ex_depot"] as const;
const MAX_PRICE = 500_000_000; // ₦500m: above this it is a data-entry error.

type Body = {
  market?: string;
  city_slug?: string;
  item_name?: string;
  price?: number | string;
  unit?: string | null;
  price_kind?: string;
  vendor?: string | null;
  source_url?: string | null;
  notes?: string | null;
  contact_email?: string | null;
  estimation_material_id?: string | null;
};

function json(payload: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function validUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
}

async function matchMaterial(
  supabase: SupabaseClient,
  itemName: string,
  providedId: string | null,
): Promise<string | null> {
  if (providedId) {
    const { data } = await supabase
      .from("estimation_materials")
      .select("id")
      .eq("id", providedId)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  const { data: exact } = await supabase
    .from("estimation_materials")
    .select("id,name")
    .ilike("name", itemName)
    .eq("is_active", true)
    .limit(1);
  if (exact?.length) return exact[0].id as string;

  // Fall back to a prefix match on the first few significant words so that
  // "Dangote cement 50kg" still lands on the Dangote definition.
  const head = itemName.split(/\s+/).slice(0, 3).join(" ");
  if (head.length >= 4) {
    const { data: loose } = await supabase
      .from("estimation_materials")
      .select("id,name")
      .ilike("name", `${head}%`)
      .eq("is_active", true)
      .limit(1);
    if (loose?.length) return loose[0].id as string;
  }
  return null;
}

serveWithCors(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ ok: false, error: "Use POST." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return json({ ok: false, error: "Pricing service is not configured." }, 500);
  }

  const limit = checkRateLimit(await getRateLimitKey(req), {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return json(
      { ok: false, error: "Too many submissions from this address. Try again shortly." },
      429,
      rateLimitHeaders(limit.remaining, limit.resetAt),
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const market = (body.market ?? "NG").toUpperCase();
  if (market !== "NG") {
    return json({ ok: false, error: "The index currently collects Nigerian prices only." }, 400);
  }

  const itemName = text(body.item_name, 160);
  if (!itemName || itemName.length < 3) {
    return json({ ok: false, error: "Name the material being priced." }, 400);
  }

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    return json({ ok: false, error: "Enter a price above zero." }, 400);
  }
  if (price > MAX_PRICE) {
    return json(
      {
        ok: false,
        error: "That price looks like a data-entry error. Check the amount and the sale unit.",
      },
      400,
    );
  }

  const priceKind = text(body.price_kind, 24) ?? "retail";
  if (!PRICE_KINDS.includes(priceKind as (typeof PRICE_KINDS)[number])) {
    return json({ ok: false, error: "Choose retail, wholesale, delivery inclusive or ex-depot." }, 400);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  // City must exist and be enabled: a price cannot arrive for a market the
  // index does not track.
  let citySlug: string | null = null;
  let region = "Nigeria";
  if (body.city_slug) {
    const { data: city } = await supabase
      .from("market_cities")
      .select("slug,is_active,state")
      .eq("slug", body.city_slug)
      .eq("country_code", market)
      .maybeSingle();
    if (!city || !city.is_active) {
      return json({ ok: false, error: "That city is not currently tracked." }, 400);
    }
    citySlug = city.slug as string;
    region = (city.state as string | null) ?? "Nigeria";
  }

  const supplier = text(body.vendor, 120);
  const sourceUrl = validUrl(text(body.source_url, 600));
  if (body.source_url && !sourceUrl) {
    return json(
      { ok: false, error: "The source link must be a full http or https address." },
      400,
    );
  }

  const materialId = await matchMaterial(
    supabase,
    itemName,
    text(body.estimation_material_id, 64),
  );

  // Duplicate guard: same supplier, material, city, basis and price within a day.
  const since = new Date(Date.now() - 86400000).toISOString();
  const duplicateQuery = supabase
    .from("price_submissions")
    .select("id")
    .eq("market", market)
    .eq("price", price)
    .gte("created_at", since)
    .limit(1);
  if (citySlug) duplicateQuery.eq("city_slug", citySlug);
  if (materialId) duplicateQuery.eq("estimation_material_id", materialId);
  else duplicateQuery.eq("item_name", itemName);
  if (supplier) duplicateQuery.eq("vendor", supplier);

  const { data: existing } = await duplicateQuery;
  if (existing?.length) {
    return json({
      ok: true,
      duplicate: true,
      message: "This exact price was already submitted today and is waiting for review.",
    });
  }

  const { data, error } = await supabase
    .from("price_submissions")
    .insert({
      market,
      region,
      city_slug: citySlug,
      item_name: itemName,
      estimation_material_id: materialId,
      vendor: supplier,
      price,
      currency: "NGN",
      unit: text(body.unit, 40),
      price_kind: priceKind,
      source_url: sourceUrl,
      notes: text(body.notes, 1000),
      contact_email: text(body.contact_email, 200),
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    // A unique-index collision is the dedupe rule doing its job, not a fault.
    if (error.code === "23505") {
      return json({ ok: true, duplicate: true, message: "Already submitted today." });
    }
    console.error("price submission failed", error.message);
    return json({ ok: false, error: "The submission could not be saved." }, 500);
  }

  return json({
    ok: true,
    id: data.id,
    matched_material: Boolean(materialId),
    message: "Submitted for review. It will not change any price until approved.",
  });
});
