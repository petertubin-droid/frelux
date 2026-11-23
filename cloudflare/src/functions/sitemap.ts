/**
 * GET /api/fn/sitemap — native Worker port of supabase/functions/sitemap.
 *
 * Builds the public sitemap from static routes plus live inventory (paint
 * colours, palettes, learn articles and categories, templates, marketplace
 * categories/locations/listings, pro profiles, reviewed translations).
 *
 * Two rules carried over verbatim, because they were deliberate:
 *   - Canonical form: pages are served with a trailing slash, so every <loc>
 *     is normalised to the URL Google actually serves. Listing a 301 wastes
 *     crawl budget and makes this file disagree with /sitemap.xml.
 *   - Programmatic category x location matrices are emitted only when real
 *     inventory backs the pair. A cartesian product of taxonomies produces
 *     doorway pages that rank for nothing and count against thin-content
 *     policy.
 *
 * Failures in the additive sections (translations, coverage) never break the
 * sitemap; a failure in the required reads returns 500 like before.
 */
import { type ApiEnv } from "../api";
import { RATE_LIMITS, clientKey, hit, rateLimitedResponse } from "./rate-limit";

const DEFAULT_SITE_URL = "https://freluxtools.com";
const CACHE_TTL_MS = 10 * 60_000;

type Cached = { at: number; xml: string };
let cached: Cached | null = null;

/** Test hook: the module cache would otherwise leak between cases. */
export function __resetSitemapCache(): void {
  cached = null;
}

const STATIC_URLS: Array<{ loc: string; priority: string; changefreq: string }> = [
  { loc: "/", priority: "1.0", changefreq: "weekly" },
  { loc: "/paint-calculator", priority: "0.9", changefreq: "monthly" },
  { loc: "/cost-estimator", priority: "0.9", changefreq: "monthly" },
  { loc: "/screeding-calculator", priority: "0.9", changefreq: "monthly" },
  { loc: "/screeding-cost-estimator", priority: "0.8", changefreq: "monthly" },
  { loc: "/pop-ceiling-calculator", priority: "0.8", changefreq: "monthly" },
  { loc: "/pop-ceiling-cost-estimator", priority: "0.8", changefreq: "monthly" },
  { loc: "/tile-calculator", priority: "0.8", changefreq: "monthly" },
  { loc: "/tile-cost-estimator", priority: "0.8", changefreq: "monthly" },
  { loc: "/finish-estimator", priority: "0.7", changefreq: "monthly" },
  { loc: "/colors", priority: "0.8", changefreq: "weekly" },
  { loc: "/colors/compare", priority: "0.7", changefreq: "monthly" },
  { loc: "/ai-color-assistant", priority: "0.7", changefreq: "monthly" },
  { loc: "/learn", priority: "0.8", changefreq: "weekly" },
  { loc: "/templates", priority: "0.8", changefreq: "weekly" },
  { loc: "/contact", priority: "0.5", changefreq: "monthly" },
  { loc: "/about", priority: "0.5", changefreq: "monthly" },
  { loc: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
  { loc: "/terms", priority: "0.3", changefreq: "yearly" },
  { loc: "/cookie-policy", priority: "0.3", changefreq: "yearly" },
  { loc: "/disclaimer", priority: "0.3", changefreq: "yearly" },
  { loc: "/ai-disclaimer", priority: "0.3", changefreq: "yearly" },
  { loc: "/marketplace", priority: "0.8", changefreq: "daily" },
  { loc: "/pro-connect", priority: "0.8", changefreq: "daily" },
  { loc: "/global-markets", priority: "0.7", changefreq: "monthly" },
  { loc: "/escrow", priority: "0.6", changefreq: "monthly" },
  { loc: "/developers/merchant-webhooks", priority: "0.6", changefreq: "monthly" },
  { loc: "/build-to-roof-estimator", priority: "0.9", changefreq: "monthly" },
  { loc: "/image-estimator", priority: "0.8", changefreq: "monthly" },
  { loc: "/structural-calculator", priority: "0.8", changefreq: "monthly" },
  { loc: "/foundation-calculator", priority: "0.8", changefreq: "monthly" },
  { loc: "/project-timeline", priority: "0.7", changefreq: "monthly" },
  { loc: "/construction-sequence", priority: "0.7", changefreq: "monthly" },
];

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Trailing-slash canonical form; real files keep their exact path. */
export function canonicalizeLocs(xml: string): string {
  return xml.replace(/<loc>([^<]+)<\/loc>/g, (_m, raw: string) => {
    const url = raw.trim();
    const [pathAndQuery, ...hashParts] = url.split("#");
    const [path, query] = pathAndQuery.split("?");
    if (/\/[^/]+\.[a-z0-9]{2,5}$/i.test(path)) return `<loc>${url}</loc>`;
    const canonical = path.endsWith("/") ? path : `${path}/`;
    const q = query ? `?${query}` : "";
    const h = hashParts.length ? `#${hashParts.join("#")}` : "";
    return `<loc>${canonical}${q}${h}</loc>`;
  });
}

const day = (value: string | null | undefined): string =>
  new Date(value ?? Date.now()).toISOString().split("T")[0];

const entry = (
  loc: string,
  options: { lastmod?: string; changefreq?: string; priority?: string } = {},
) =>
  `  <url>
    <loc>${loc}</loc>${options.lastmod ? `\n    <lastmod>${options.lastmod}</lastmod>` : ""}${
    options.changefreq ? `\n    <changefreq>${options.changefreq}</changefreq>` : ""
  }${options.priority ? `\n    <priority>${options.priority}</priority>` : ""}
  </url>`;

export async function sitemap(
  request: Request,
  env: ApiEnv,
  _url: URL,
  cors: Record<string, string> = {},
): Promise<Response> {
  const xmlHeaders = {
    ...cors,
    "content-type": "application/xml",
    "cache-control": "public, max-age=3600",
  };

  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const limit = await hit(clientKey(request, "sitemap"), RATE_LIMITS.GENERAL);
  if (!limit.allowed) return rateLimitedResponse(limit.resetAt, cors);

  const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!env.SUPABASE_URL || !serviceKey) {
    return new Response(JSON.stringify({ error: "Failed to generate sitemap" }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return new Response(cached.xml, { headers: { ...xmlHeaders, "x-cache": "hit" } });
  }

  const base = env.SUPABASE_URL.replace(/\/$/, "");
  const siteUrl = (env.SITE_URL ?? DEFAULT_SITE_URL).replace(/\/+$/, "");
  const headers: Record<string, string> = {
    apikey: serviceKey,
    "content-type": "application/json",
  };
  if (serviceKey.startsWith("eyJ")) headers.Authorization = `Bearer ${serviceKey}`;

  const read = async (query: string): Promise<Array<Record<string, unknown>>> => {
    const res = await fetch(`${base}/rest/v1/${query}`, { headers });
    if (!res.ok) throw new Error(`read failed: ${query.split("?")[0]} ${res.status}`);
    return (await res.json()) as Array<Record<string, unknown>>;
  };

  const readOrEmpty = async (
    query: string,
  ): Promise<Array<Record<string, unknown>>> => {
    try {
      return await read(query);
    } catch {
      return [];
    }
  };

  try {
    const urls: string[] = STATIC_URLS.map((u) =>
      entry(`${siteUrl}${escapeXml(u.loc)}`, {
        changefreq: u.changefreq,
        priority: u.priority,
      }),
    );

    const [
      colors,
      palettes,
      articles,
      categories,
      templates,
      proCategories,
      proLocations,
      proProfiles,
      listings,
    ] = await Promise.all([
      read("paint_colors?select=slug,updated_at&is_active=eq.true&order=slug.asc"),
      read("color_combinations?select=slug,updated_at&is_published=eq.true&order=slug.asc"),
      read("learn_articles?select=slug,updated_at,published_at&status=eq.published&order=published_at.desc"),
      read("learn_categories?select=slug,is_active&is_active=eq.true&order=sort_order.asc"),
      read("calculator_templates?select=slug,updated_at&visibility=eq.public&is_published=eq.true&order=slug.asc"),
      read("pro_categories?select=slug,name,seo_indexable&is_active=eq.true&seo_indexable=eq.true&order=sort_order.asc"),
      read("pro_locations?select=slug,state,city,seo_indexable&is_active=eq.true&seo_indexable=eq.true&order=state.asc,city.asc"),
      read("pro_profiles?select=slug,updated_at,seo_indexable&is_listed=eq.true&seo_indexable=eq.true&verification_status=neq.suspended&order=updated_at.desc"),
      read("marketplace_listings?select=id,title,updated_at,seo_indexable,location_state,location_city&is_active=eq.true&admin_removed=eq.false&seo_indexable=eq.true&status=in.(open,awarded,in_progress)&order=updated_at.desc&limit=200"),
    ]);

    for (const c of colors) {
      urls.push(
        entry(`${siteUrl}/colors/paint/${escapeXml(String(c.slug))}`, {
          lastmod: day(c.updated_at as string),
          changefreq: "weekly",
          priority: "0.7",
        }),
      );
    }
    for (const p of palettes) {
      urls.push(
        entry(`${siteUrl}/colors/${escapeXml(String(p.slug))}`, {
          lastmod: day(p.updated_at as string),
          changefreq: "weekly",
          priority: "0.7",
        }),
      );
    }
    for (const cat of categories) {
      urls.push(
        entry(`${siteUrl}/learn/category/${escapeXml(String(cat.slug))}`, {
          changefreq: "weekly",
          priority: "0.8",
        }),
      );
    }
    for (const a of articles) {
      const lastmod = escapeXml(
        String(a.published_at ?? a.updated_at ?? "").split("T")[0] || day(null),
      );
      urls.push(
        entry(`${siteUrl}/learn/${escapeXml(String(a.slug))}`, {
          lastmod,
          changefreq: "monthly",
          priority: "0.8",
        }),
      );
    }

    // Reviewed translations: each published locale page is its own URL in its
    // own language, linked by hreflang from the English original.
    for (const t of await readOrEmpty(
      "content_translations?select=content_key,locale&status=eq.published",
    )) {
      urls.push(
        entry(
          `${siteUrl}/${String(t.locale)}/learn/${String(t.content_key)}/`,
          { changefreq: "monthly", priority: "0.5" },
        ),
      );
    }

    for (const t of templates) {
      const slug = escapeXml(String(t.slug ?? ""));
      if (!slug) continue;
      urls.push(
        entry(`${siteUrl}/templates/${slug}`, {
          lastmod: day(t.updated_at as string),
          changefreq: "monthly",
          priority: "0.6",
        }),
      );
    }
    for (const cat of proCategories) {
      if (!cat.slug || !cat.seo_indexable) continue;
      urls.push(
        entry(`${siteUrl}/marketplace/category/${escapeXml(String(cat.slug))}`, {
          changefreq: "daily",
          priority: "0.7",
        }),
      );
    }
    for (const loc of proLocations) {
      if (!loc.slug || !loc.seo_indexable) continue;
      urls.push(
        entry(`${siteUrl}/marketplace/sellers/${escapeXml(String(loc.slug))}`, {
          changefreq: "daily",
          priority: "0.7",
        }),
      );
    }
    for (const pro of proProfiles) {
      if (!pro.slug || !pro.seo_indexable) continue;
      urls.push(
        entry(`${siteUrl}/pro-connect/${escapeXml(String(pro.slug))}`, {
          lastmod: day(pro.updated_at as string),
          changefreq: "weekly",
          priority: "0.6",
        }),
      );
    }
    for (const listing of listings) {
      if (!listing.seo_indexable) continue;
      urls.push(
        entry(`${siteUrl}/marketplace/${escapeXml(String(listing.id))}`, {
          lastmod: day(listing.updated_at as string),
          changefreq: "daily",
          priority: "0.6",
        }),
      );
    }

    // Inventory check for the programmatic matrices: a category x location
    // pair with nothing behind it is a doorway page.
    const marketCoverage = new Set<string>();
    const proCoverage = new Set<string>();
    try {
      const [mkt, proSvc, proLoc] = await Promise.all([
        readOrEmpty(
          "marketplace_listings?select=category_id,location_state,location_city&is_active=eq.true&admin_removed=eq.false&seo_indexable=eq.true",
        ),
        readOrEmpty("pro_profile_services?select=profile_id,service_id"),
        readOrEmpty("pro_profile_locations?select=profile_id,location_id"),
      ]);
      for (const r of mkt) {
        const cat = String(r.category_id ?? "");
        const loc = String(r.location_state ?? "").trim();
        if (cat && loc) marketCoverage.add(`${cat}|${loc}`);
      }
      const services = new Set(
        proSvc.map((r) => String(r.service_id ?? "")).filter(Boolean),
      );
      const locations = new Set(
        proLoc.map((r) => String(r.location_id ?? "")).filter(Boolean),
      );
      for (const serviceId of services) {
        for (const locationId of locations) {
          proCoverage.add(`${serviceId}|${locationId}`);
        }
      }
    } catch {
      // Coverage is an optimisation: no programmatic pages rather than
      // hundreds of empty ones.
    }

    const matrixHasInventory = (
      catId: string,
      locId: string,
      catSlug: string,
      locSlug: string,
    ): boolean => {
      if (proCoverage.size === 0) return false;
      return (
        proCoverage.has(`${catId}|${locId}`) ||
        proCoverage.has(`${catSlug}|${locSlug}`) ||
        proCoverage.has(`${catId}|${locSlug}`) ||
        proCoverage.has(`${catSlug}|${locId}`)
      );
    };

    for (const cat of proCategories) {
      if (!cat.slug || !cat.seo_indexable) continue;
      for (const loc of proLocations) {
        if (!loc.slug || !loc.seo_indexable) continue;
        if (
          !matrixHasInventory(
            String(cat.id ?? ""),
            String(loc.id ?? ""),
            String(cat.slug),
            String(loc.slug),
          )
        ) {
          continue;
        }
        urls.push(
          entry(
            `${siteUrl}/pro/${escapeXml(String(cat.slug))}/${escapeXml(String(loc.slug))}`,
            { changefreq: "weekly", priority: "0.5" },
          ),
        );
      }
    }

    const xml = canonicalizeLocs(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`);

    cached = { at: Date.now(), xml };
    return new Response(xml, { headers: { ...xmlHeaders, "x-cache": "miss" } });
  } catch (error) {
    console.error(
      "[sitemap] failed:",
      error instanceof Error ? error.message : error,
    );
    return new Response(JSON.stringify({ error: "Failed to generate sitemap" }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }
}
