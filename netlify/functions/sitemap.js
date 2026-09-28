/**
 * Dynamic sitemap for https://freluxtools.netlify.app
 *
 * Netlify function served at /sitemap.xml (netlify.toml redirects it here
 * with force=true, shadowing the stale static public/sitemap.xml). It is
 * generated per-request from the live database, so articles, categories
 * and paginated listing URLs published in the future appear automatically
 * with no rebuild or manual sync.
 *
 * Includes:
 *  - all static site routes (feature pages, calculators, templates, ...)
 *  - every published learn article (/learn/<slug>/)
 *  - every active learn category (/learn/category/<slug>/)
 *  - paginated listing URLs (/learn?page=N and per-category ?page=N,
 *    20 articles per page) so crawlers can reach every article through
 *    the listing pages
 *
 * Uses the public anon key: published articles and active categories are
 * readable by RLS policy (the site itself queries them the same way).
 * If the database is unreachable the function still returns a valid
 * sitemap with the static routes.
 */
const SITE_URL = "https://freluxtools.netlify.app";

/** Must mirror ARTICLES_PER_PAGE in src/pages/learn/Learn.tsx and
 *  src/pages/learn/LearnCategory.tsx. */
const ARTICLES_PER_PAGE = 20;

/** Static site routes kept in parity with the previous static sitemap. */
const STATIC_PATHS = [
  "/",
  "/calculators/",
  "/start-building/",
  "/paint-calculator/",
  "/screeding-calculator/",
  "/pop-ceiling-calculator/",
  "/tile-calculator/",
  "/finish-estimator/",
  "/colors/",
  "/colors/compare/",
  "/ai-color-assistant/",
  "/learn/",
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
  "/foundation-calculator/",
  "/project-timeline/",
  "/construction-sequence/",
  "/image-estimator/",
  "/smart-calculator/",
  "/marketplace/",
  "/pro-connect/",
  "/paint-comparison/",
  "/gallery/",
  "/material-prices/",
  "/surface-assessment/",
  "/pricing/",
  "/privacy-policy/",
  "/terms/",
  "/cookie-policy/",
  "/disclaimer/",
  "/ai-disclaimer/",
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

  const add = (loc, lastmod, changefreq, priority) =>
    urls.push({ loc, lastmod, changefreq, priority });

  for (const p of STATIC_PATHS) {
    add(`${SITE_URL}${p}`, today, "weekly", p === "/" ? "1.0" : "0.8");
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
            "?select=slug,published_at,category_slug" +
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

  // Paginated Learn hub listing: page 1 is the canonical /learn/ above.
  if (articles.length > ARTICLES_PER_PAGE) {
    const totalPages = Math.ceil(articles.length / ARTICLES_PER_PAGE);
    for (let p = 2; p <= totalPages; p++) {
      add(`${SITE_URL}/learn/?page=${p}`, today, "daily", "0.7");
    }
  }

  // Category pages + their paginated listings.
  const perCategory = {};
  for (const a of articles) {
    if (a.category_slug) perCategory[a.category_slug] = (perCategory[a.category_slug] || 0) + 1;
  }
  for (const cat of categories) {
    add(`${SITE_URL}/learn/category/${cat.slug}/`, today, "weekly", "0.7");
    const n = perCategory[cat.slug] || 0;
    if (n > ARTICLES_PER_PAGE) {
      const tp = Math.ceil(n / ARTICLES_PER_PAGE);
      for (let p = 2; p <= tp; p++) {
        add(
          `${SITE_URL}/learn/category/${cat.slug}/?page=${p}`,
          today,
          "weekly",
          "0.6",
        );
      }
    }
    delete perCategory[cat.slug];
  }
  // Categories referenced by articles but missing from the category table.
  for (const slug of Object.keys(perCategory)) {
    add(`${SITE_URL}/learn/category/${slug}/`, today, "weekly", "0.6");
  }

  // Every published article.
  for (const a of articles) {
    const lastmod =
      a.published_at && !Number.isNaN(Date.parse(a.published_at))
        ? new Date(a.published_at).toISOString().slice(0, 10)
        : today;
    add(`${SITE_URL}/learn/${a.slug}/`, lastmod, "monthly", "0.7");
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url>
    <loc>${escapeXml(u.loc)}</loc>
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
