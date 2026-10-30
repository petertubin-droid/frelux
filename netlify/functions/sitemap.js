/**
 * Dynamic sitemap for https://freluxtools.com
 *
 * Netlify function served at /sitemap.xml (netlify.toml redirects it here
 * with force=true, shadowing the stale static public/sitemap.xml). It is
 * generated per-request from the live database, so published articles,
 * categories, templates, and active colors appear without a rebuild or manual sync.
 *
 * Includes:
 *  - all static site routes (feature pages, calculators, templates, markets)
 *  - every published learn article, using its market-specific canonical path when set
 *  - every active learn category (/learn/category/<slug>/)
 *  - reviewed translations with reciprocal hreflang
 *  - dynamic active paint colors (/colors/paint/<slug>/)
 *  - dynamic published color palettes (/colors/<slug>/)
 *  - dynamic published calculator templates (/templates/<slug>/)
 *  - dynamic active pro profiles (/pro-connect/<slug>/)
 * Only canonical indexable URLs are included. Query pagination and
 * machine-translated locale clones are intentionally omitted.
 *
 * Uses the public anon key: published articles and active categories are
 * readable by RLS policy. If the database is unreachable the function
 * still returns a comprehensive, valid sitemap with all static routes.
 */
const SITE_URL = (
  process.env.SITE_URL ||
  process.env.VITE_SITE_URL ||
  "https://freluxtools.com"
).replace(/\/+$/, "");

/** Static site routes kept in parity with the comprehensive route catalog. */
// NOTE: legacy calculator slugs (cost-estimator, painting-estimator, screeding-cost-estimator,
// pop-ceiling-cost-estimator, tile-cost-estimator, tyrolene-estimator) are intentionally NOT
// listed here: netlify.toml 301-redirects them to the consolidated calculator routes, and a
// sitemap must only contain canonical 200 URLs. Listing them made Google flag 240 sitemap
// URLs with 6 redirects.
const STATIC_PATHS = [
  "/",
  "/calculators/",
  "/construction-tools/",
  "/tools/finishes/",
  "/tools/structure/",
  "/tools/services/",
  "/tools/components/",
  "/tools/project/",
  "/tools/ai/",
  "/tools/pro/",
  "/feedback/",
  "/data-request/",
  "/start-building/",
  "/unit-converter/",
  "/map/",
  "/paint-calculator/",
  "/screeding-calculator/",
  "/pop-ceiling-calculator/",
  "/tile-calculator/",
  "/finish-estimator/",
  "/colors/",
  "/colors/compare/",
  "/ai-color-assistant/",
  "/learn/",
  "/prices/",
  "/glossary/",
  "/printables/",
  "/learn/library/",
  "/user-guide/",
  "/templates/",
  "/templates/standard-living-room-painting/",
  "/templates/master-bedroom-painting/",
  "/templates/single-accent-wall-painting/",
  "/templates/exterior-bungalow-painting/",
  "/templates/dining-room-painting/",
  "/templates/childrens-room-painting/",
  "/templates/kitchen-walls-painting/",
  "/templates/corridor-stairwell-painting/",
  "/templates/2-bedroom-flat-full-painting/",
  "/templates/office-space-painting/",
  "/templates/exterior-duplex-painting/",
  "/templates/shop-retail-front-painting/",
  "/templates/standard-floor-tiling/",
  "/templates/bathroom-wall-tiling/",
  "/templates/large-hall-floor-tiling/",
  "/templates/kitchen-backsplash-tiling/",
  "/templates/balcony-floor-tiling/",
  "/templates/kitchen-floor-tiling/",
  "/templates/guest-toilet-wall-tiling/",
  "/templates/staircase-tiling/",
  "/templates/terrazzo-porcelain-floor-tiling/",
  "/templates/wall-feature-strip-tiling/",
  "/templates/standard-room-screeding/",
  "/templates/single-wall-screeding/",
  "/templates/living-room-ceiling-screeding/",
  "/templates/corridor-walls-screeding/",
  "/templates/dining-room-screeding/",
  "/templates/office-screeding/",
  "/templates/corridor-screeding/",
  "/templates/single-feature-wall-screeding/",
  "/templates/shop-front-screeding/",
  "/templates/standard-bedroom-pop-ceiling/",
  "/templates/large-living-room-pop-ceiling/",
  "/templates/small-office-pop-ceiling/",
  "/templates/hall-cornice-pop-ceiling/",
  "/templates/dining-room-pop-ceiling/",
  "/templates/kitchen-pop-ceiling/",
  "/templates/corridor-pop-ceiling/",
  "/templates/master-bedroom-pop-ceiling/",
  "/templates/conference-room-pop-ceiling/",
  "/about/",
  "/contact/",
  "/build-to-roof-estimator/",
  "/structural-calculator/",
  "/masonry-calculator/",
  "/plastering-calculator/",
  "/drywall-calculator/",
  "/paving-calculator/",
  "/drainage-calculator/",
  "/septic-sizing-calculator/",
  "/temporary-works-calculator/",
  "/insulation-calculator/",
  "/demolition-calculator/",
  "/blueprint-takeoff/",
  "/concrete-takeoff-calculator/",
  "/earthworks-cut-fill/",
  "/roof-framing-calculator/",
  "/foundation-calculator/",
  "/project-timeline/",
  "/construction-sequence/",
  "/image-estimator/",
  "/smart-calculator/",
  "/marketplace/",
  "/pro-connect/",
  "/paint-comparison/",
  "/gallery/",
  "/case-studies/",
  "/material-prices/",
  "/surface-assessment/",
  "/pricing/",
  "/partners/",
  "/privacy-policy/",
  "/terms/",
  "/cookie-policy/",
  "/disclaimer/",
  "/ai-disclaimer/",
  "/bim-ifc-import/",
  "/solar-pv-estimator/",
  "/conversational-estimator/",
  "/field-sync/",
  "/count-vision/",
  "/electrical/",
  "/plumbing/",
  "/waterproofing/",
  "/wall-finish-estimator/",
  "/flooring/",
  "/increte-flooring-calculator/",
  "/reinforcement/",
  "/foundation/",
  "/doors-windows/",
  "/generator/",
  "/boq-generator/",
  "/cash-flow-timeline/",
  "/circular-reuse/",
  "/contractor-credit/",
  "/defect-diagnosis/",
  "/estimate-refresh/",
  "/heat-comfort/",
  "/labour-estimator/",
  "/maintenance-planner/",
  "/margin-calculator/",
  "/regional-cost-index/",
  "/warranty-certificate/",
  "/carbon-footprint/",
  "/brand-studio/",
  "/visual-finishing-estimator/",
  "/tools/visual-finishing-estimator/",
  "/credits/",
  "/developers/",
  "/rewards/",
  "/market/ng/",
  "/market/us/",
  "/market/gb/",
  "/market/ca/",
  "/market/au/",
  "/market/de/",
  "/market/in/",
  "/market/gh/",
  "/market/ke/",
  "/market/za/",
  "/market/jp/",
  "/market/fr/",
  "/market/br/",
  "/market/sa/",
  "/market/ae/",
  "/market/cn/",
  "/market/id/",
  "/market/mx/",
  "/market/kr/",
  "/market/it/",
  "/market/et/",
  "/market/eg/",
  "/market/tz/",
  "/market/ci/",
  "/market/es/",
  "/market/nl/",
  "/market/pl/",
  "/market/se/",
  "/market/ch/",
  "/market/sg/",
  "/market/tr/",
  "/market/nz/",
  "/global-markets/",
];

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const handler = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [];

  // Include each canonical public path once; query variants are not indexable.
  const seen = new Set();
  const add = (path, lastmod, changefreq, priority) => {
    if (path.includes("?") || seen.has(path)) return;
    seen.add(path);
    urls.push({ path, lastmod, changefreq, priority });
  };

  for (const p of STATIC_PATHS) {
    add(p, today, "weekly", p === "/" ? "1.0" : "0.8");
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const headers =
    supabaseUrl && anonKey
      ? {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        }
      : null;

  let articles = [];
  let categories = [];

  if (headers && supabaseUrl) {
    try {
      const [artRes, catRes] = await Promise.all([
        fetch(
          `${supabaseUrl}/rest/v1/learn_articles` +
            "?select=slug,published_at,category_slug,wall_market_code" +
            "&status=eq.published&order=published_at.desc&limit=1000",
          { headers },
        ),
        fetch(
          `${supabaseUrl}/rest/v1/learn_categories` +
            "?select=slug&is_active=eq.true&limit=500",
          { headers },
        ),
      ]);
      if (artRes.ok) articles = await artRes.json();
      if (catRes.ok) categories = await catRes.json();
    } catch (err) {
      console.error("[sitemap] DB fetch for articles/categories failed:", err);
    }
  }

  // Canonical library listing and active category pages only.
  add("/learn/library/", today, "daily", "0.7");
  for (const cat of categories) {
    add(`/learn/category/${cat.slug}/`, today, "weekly", "0.7");
  }
  const referencedCategories = new Set(
    articles.map((a) => a.category_slug).filter(Boolean),
  );
  const activeCategories = new Set(categories.map((c) => c.slug));
  for (const slug of referencedCategories) {
    if (!activeCategories.has(slug))
      add(`/learn/category/${slug}/`, today, "weekly", "0.6");
  }

  // Every published article.
  for (const a of articles) {
    const lastmod =
      a.published_at && !Number.isNaN(Date.parse(a.published_at))
        ? new Date(a.published_at).toISOString().slice(0, 10)
        : today;
    const path = a.wall_market_code
      ? `/learn/wall-finishing/${String(a.wall_market_code).toLowerCase()}/${a.slug}/`
      : `/learn/${a.slug}/`;
    add(path, lastmod, "monthly", "0.7");
  }

  // Wall-finishing market hubs (/learn/wall-finishing/<market>): every market
  // that owns at least one published wall-finishing article gets a library page.
  const wallMarketCodes = [
    ...new Set(
      articles
        .filter((a) => a.wall_market_code)
        .map((a) => String(a.wall_market_code).toLowerCase()),
    ),
  ];
  for (const code of wallMarketCodes) {
    add(`/learn/wall-finishing/${code}/`, today, "weekly", "0.6");
  }

  // Reviewed translations.
  if (headers && supabaseUrl && articles.length > 0) {
    try {
      const trRes = await fetch(
        `${supabaseUrl}/rest/v1/content_translations?select=content_key,locale,published_at&status=eq.published`,
        { headers },
      );
      if (trRes.ok) {
        const translations = await trRes.json();
        const englishPathBySlug = new Map(
          articles.map((a) => [
            a.slug,
            a.wall_market_code
              ? `/learn/wall-finishing/${String(a.wall_market_code).toLowerCase()}/${a.slug}/`
              : `/learn/${a.slug}/`,
          ]),
        );
        for (const t of translations) {
          const base = englishPathBySlug.get(t.content_key);
          if (!base) continue;
          const lastmod =
            t.published_at && !Number.isNaN(Date.parse(t.published_at))
              ? new Date(t.published_at).toISOString().slice(0, 10)
              : today;
          add(`/${t.locale}${base}`, lastmod, "monthly", "0.5");
        }
      }
    } catch (err) {
      console.warn("[sitemap] Translations fetch skipped:", err);
    }
  }

  // Dynamic active paint colors
  if (headers && supabaseUrl) {
    try {
      const pcRes = await fetch(
        `${supabaseUrl}/rest/v1/paint_colors?select=slug,updated_at&is_active=eq.true&order=slug.asc&limit=1000`,
        { headers },
      );
      if (pcRes.ok) {
        const colors = await pcRes.json();
        for (const c of colors) {
          if (!c.slug) continue;
          const lastmod =
            c.updated_at && !Number.isNaN(Date.parse(c.updated_at))
              ? new Date(c.updated_at).toISOString().slice(0, 10)
              : today;
          add(`/colors/paint/${c.slug}/`, lastmod, "monthly", "0.6");
        }
      }
    } catch {
      // Paint colors are additive
    }
  }

  // Dynamic published color combinations / palettes
  if (headers && supabaseUrl) {
    try {
      const palRes = await fetch(
        `${supabaseUrl}/rest/v1/color_combinations?select=slug,updated_at&is_published=eq.true&order=slug.asc&limit=500`,
        { headers },
      );
      if (palRes.ok) {
        const palettes = await palRes.json();
        for (const p of palettes) {
          if (!p.slug) continue;
          const lastmod =
            p.updated_at && !Number.isNaN(Date.parse(p.updated_at))
              ? new Date(p.updated_at).toISOString().slice(0, 10)
              : today;
          add(`/colors/${p.slug}/`, lastmod, "monthly", "0.6");
        }
      }
    } catch {
      // Palettes are additive
    }
  }

  // Dynamic published calculator templates
  if (headers && supabaseUrl) {
    try {
      const tmplRes = await fetch(
        `${supabaseUrl}/rest/v1/calculator_templates?select=slug,updated_at&is_published=eq.true&order=slug.asc&limit=500`,
        { headers },
      );
      if (tmplRes.ok) {
        const tmpls = await tmplRes.json();
        for (const t of tmpls) {
          if (!t.slug) continue;
          const lastmod =
            t.updated_at && !Number.isNaN(Date.parse(t.updated_at))
              ? new Date(t.updated_at).toISOString().slice(0, 10)
              : today;
          add(`/templates/${t.slug}/`, lastmod, "monthly", "0.6");
        }
      }
    } catch {
      // Templates are additive
    }
  }

  // Public template slugs: live DB when reachable, static catalog as fallback,
  // so the 32-market template family is never empty because a query failed.
  const templateSlugs = new Set(
    STATIC_PATHS.filter((p) => /^\/templates\/[^/]+\/$/.test(p)).map(
      (p) => p.split("/")[2],
    ),
  );
  if (headers && supabaseUrl) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/calculator_templates?select=slug&is_published=eq.true&limit=500`,
        { headers },
      );
      if (res.ok) {
        for (const t of await res.json()) {
          if (t.slug) templateSlugs.add(t.slug);
        }
      }
    } catch {
      // Static fallback already covers the curated catalog.
    }
  }

  // Market × template pages: every market hub plus every template localized to
  // that market. These are real 200 pages with distinct titles, canonicals and
  // hreflang alternates, so they belong in the sitemap next to the global pages.
  const marketCodes = STATIC_PATHS.filter((p) =>
    /^\/market\/[a-z]{2}\/$/.test(p),
  ).map((p) => p.split("/")[2]);
  for (const code of marketCodes) {
    add(`/market/${code}/templates/`, today, "weekly", "0.7");
    for (const slug of templateSlugs) {
      add(`/market/${code}/templates/${slug}/`, today, "monthly", "0.6");
    }
  }

  // Dynamic active pro profiles
  if (headers && supabaseUrl) {
    try {
      const proRes = await fetch(
        `${supabaseUrl}/rest/v1/pro_profiles?select=slug,updated_at,is_listed,verification_status&is_listed=eq.true&verification_status=neq.suspended&order=slug.asc&limit=500`,
        { headers },
      );
      if (proRes.ok) {
        const pros = await proRes.json();
        for (const pr of pros) {
          if (!pr.slug) continue;
          const lastmod =
            pr.updated_at && !Number.isNaN(Date.parse(pr.updated_at))
              ? new Date(pr.updated_at).toISOString().slice(0, 10)
              : today;
          add(`/pro-connect/${pr.slug}/`, lastmod, "weekly", "0.6");
        }
      }
    } catch {
      // Pro profiles are additive
    }
  }

  // ── SEO landing families (public, robots-allowed pages the static list misses) ──
  if (headers && supabaseUrl) {
    const getJson = async (query) => {
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/${query}`, { headers });
        return res.ok ? await res.json() : [];
      } catch {
        return [];
      }
    };
    const slugify = (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    const lastmodOf = (row) => {
      const ts = row?.updated_at || row?.published_at || row?.created_at;
      return ts && !Number.isNaN(Date.parse(ts))
        ? new Date(ts).toISOString().slice(0, 10)
        : today;
    };

    // Pro directory: /pro/:categorySlug/:locationSlug pages that have a listed pro.
    const [proCats, proLocs, proRows, proLocRows] = await Promise.all([
      getJson("pro_categories?select=id,slug&is_active=eq.true&limit=500"),
      getJson("pro_locations?select=id,city&is_active=eq.true&limit=500"),
      getJson(
        "pro_profiles?select=id,category_id,updated_at&is_listed=eq.true&verification_status=neq.suspended&limit=1000",
      ),
      getJson("pro_profile_locations?select=profile_id,location_id&limit=2000"),
    ]);
    const catSlugById = new Map(proCats.map((c) => [c.id, c.slug]));
    const cityById = new Map(proLocs.map((l) => [l.id, l.city]));
    const profileCat = new Map(
      proRows.map((p) => [p.id, catSlugById.get(p.category_id)]),
    );
    const profileLastmod = new Map(proRows.map((p) => [p.id, lastmodOf(p)]));
    const proCombos = new Map();
    for (const link of proLocRows) {
      const cat = profileCat.get(link.profile_id);
      const city = slugify(cityById.get(link.location_id));
      if (!cat || !city) continue;
      const key = `${cat}/${city}`;
      const lm = profileLastmod.get(link.profile_id) || today;
      if (!proCombos.has(key) || proCombos.get(key) < lm)
        proCombos.set(key, lm);
    }
    for (const [key, lastmod] of proCombos) {
      add(`/pro/${key}/`, lastmod, "weekly", "0.6");
    }

    // Published case studies whose gallery entry is public + approved/featured.
    const [caseRows, galleryRows] = await Promise.all([
      getJson(
        "case_studies?select=id,published_at,gallery_entry_id&is_published=eq.true&limit=500",
      ),
      getJson(
        "gallery_entries?select=id,status,is_public&status=in.(approved,featured)&is_public=eq.true&limit=1000",
      ),
    ]);
    const publicEntryIds = new Set(galleryRows.map((g) => g.id));
    for (const cs of caseRows) {
      if (!cs.id) continue;
      if (cs.gallery_entry_id && !publicEntryIds.has(cs.gallery_entry_id))
        continue;
      add(`/case-studies/${cs.id}/`, lastmodOf(cs), "monthly", "0.6");
    }

    // Marketplace: categories, seller cities, category×city pages, listing details.
    const listings = await getJson(
      "marketplace_listings?select=id,category_id,location_city,updated_at&is_active=eq.true&admin_removed=eq.false&status=in.(open,awarded,in_progress)&order=updated_at.desc&limit=1000",
    );
    const mkCats = new Set();
    const mkCities = new Set();
    const mkPairs = new Set();
    for (const listing of listings) {
      const cat = catSlugById.get(listing.category_id);
      const city = slugify(listing.location_city);
      if (cat) mkCats.add(cat);
      if (city) mkCities.add(city);
      if (cat && city) mkPairs.add(`${cat}/${city}`);
      if (listing.id)
        add(`/marketplace/${listing.id}/`, lastmodOf(listing), "weekly", "0.5");
    }
    for (const cat of mkCats)
      add(`/marketplace/category/${cat}/`, today, "weekly", "0.6");
    for (const city of mkCities)
      add(`/marketplace/sellers/${city}/`, today, "weekly", "0.5");
    for (const pair of mkPairs)
      add(`/marketplace/${pair}/`, today, "weekly", "0.5");

    // Active marketplace products.
    const products = await getJson(
      "marketplace_products?select=id,updated_at&status=eq.active&admin_removed=eq.false&order=updated_at.desc&limit=1000",
    );
    for (const product of products) {
      if (product.id)
        add(
          `/marketplace/products/${product.id}/`,
          lastmodOf(product),
          "weekly",
          "0.5",
        );
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
>
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(`${SITE_URL}${u.path}`)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
    body,
  };
};
