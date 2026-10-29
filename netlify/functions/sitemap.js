/**
 * Dynamic sitemap for https://freluxtools.com
 *
 * Netlify function served at /sitemap.xml (netlify.toml redirects it here
 * with force=true, shadowing the stale static public/sitemap.xml). It is
 * generated per-request from the live database, so published articles and
 * categories appear without a rebuild or manual sync.
 *
 * Includes:
 *  - all static site routes (feature pages, calculators, templates, ...)
 *  - every published learn article, using its market-specific canonical path when set
 *  - every active learn category (/learn/category/<slug>/)
 * Only canonical indexable URLs are included. Query pagination and
 * machine-translated locale clones are intentionally omitted.
 *
 * Uses the public anon key: published articles and active categories are
 * readable by RLS policy (the site itself queries them the same way).
 * If the database is unreachable the function still returns a valid
 * sitemap with the static routes.
 */
const SITE_URL = (process.env.SITE_URL || process.env.VITE_SITE_URL ||
  "https://freluxtools.com").replace(/\/+$/, "");

/** Static site routes kept in parity with the previous static sitemap. */
// NOTE: legacy calculator slugs (cost-estimator, painting-estimator, screeding-cost-estimator,
// pop-ceiling-cost-estimator, tile-cost-estimator, tyrolene-estimator) are intentionally NOT
// listed here: netlify.toml 301-redirects them to the consolidated calculator routes, and a
// sitemap must only contain canonical 200 URLs. Listing them made Google flag 240 sitemap
// URLs with 6 redirects.
const STATIC_PATHS = [
  "/",
  "/calculators/",
  "/construction-tools/",
  "/feedback/",
  "/data-request/",
  "/start-building/",
  "/paint-calculator/",
  "/screeding-calculator/",
  "/pop-ceiling-calculator/",
  "/tile-calculator/",
  "/finish-estimator/",
  "/colors/",
  "/colors/compare/",
  "/ai-color-assistant/",
  "/paint-comparison/",
  "/learn/",
  "/prices/",
  "/glossary/",
  "/printables/",
  "/user-guide/",
  "/templates/",
  "/about/",
  "/contact/",
  "/pricing/",
  "/privacy-policy/",
  "/terms/",
  "/cookie-policy/",
  "/disclaimer/",
  "/ai-disclaimer/",
  "/build-to-roof-estimator/",
  "/structural-calculator/",
  "/foundation-calculator/",
  "/project-timeline/",
  "/construction-sequence/",
  "/image-estimator/",
  "/smart-calculator/",
  "/conversational-estimator/",
  "/bim-ifc-import/",
  "/solar-pv-estimator/",
  "/field-sync/",
  "/count-vision/",
  "/electrical/",
  "/plumbing/",
  "/waterproofing/",
  "/flooring/",
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
  "/marketplace/",
  "/pro-connect/",
  "/gallery/",
  "/material-prices/",
  "/surface-assessment/",
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
    if (path.includes('?') || seen.has(path)) return;
    seen.add(path);
    urls.push({ path, lastmod, changefreq, priority });
  };

  for (const p of STATIC_PATHS) {
    add(p, today, "weekly", p === "/" ? "1.0" : "0.8");
  }

  let articles = [];
  let categories = [];
  try {
    const supabaseUrl =
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const anonKey =
      process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (supabaseUrl && anonKey) {
      const headers = {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      };
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
    }
  } catch (err) {
    console.error("[sitemap] DB fetch failed, serving static routes:", err);
  }

  // Canonical library listing and active category pages only.
  add(`/learn/library/`, today, "daily", "0.7");
  for (const cat of categories) {
    add(`/learn/category/${cat.slug}/`, today, "weekly", "0.7");
  }
  const referencedCategories = new Set(articles.map((a) => a.category_slug).filter(Boolean));
  const activeCategories = new Set(categories.map((c) => c.slug));
  for (const slug of referencedCategories) {
    if (!activeCategories.has(slug)) add(`/learn/category/${slug}/`, today, "weekly", "0.6");
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

  // Emit English canonical URLs only until localized pages contain genuinely
  // translated content with reciprocal hreflang declarations.
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
>
${urls
  .map((u) => `  <url>
    <loc>${escapeXml(`${SITE_URL}${u.path}`)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`)
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
