/**
 * Generate sitemap.xml from the route list + live Learn content.
 * Usage: node scripts/generate-sitemap.mjs
 * Run AFTER `vite build` (writes to dist/sitemap.xml and public/sitemap.xml).
 *
 * Static routes come from the list below. Learn category and article URLs
 * are fetched from Supabase (RLS public read: active categories and
 * published articles only). If the fetch fails (e.g. local build without
 * env vars), the sitemap falls back to the static route list so the build
 * never breaks.
 */
import { writeFileSync, mkdirSync } from "fs";
import { marketLandingRoutes } from "./market-landing-data.mjs";
import { TEMPLATE_CATALOG } from "./lib/template-catalog.mjs";
import { SITE_URL } from "./lib/site-url.mjs";

const today = new Date().toISOString().split("T")[0];

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";

const routes = [
  { path: "/map", priority: "0.7", changefreq: "weekly" },
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/calculators", priority: "0.9", changefreq: "monthly" },
  { path: "/construction-tools", priority: "0.9", changefreq: "weekly" },
  { path: "/tools/finishes", priority: "0.8", changefreq: "monthly" },
  { path: "/tools/structure", priority: "0.8", changefreq: "monthly" },
  { path: "/tools/services", priority: "0.8", changefreq: "monthly" },
  { path: "/tools/components", priority: "0.7", changefreq: "monthly" },
  { path: "/tools/project", priority: "0.8", changefreq: "monthly" },
  { path: "/tools/ai", priority: "0.7", changefreq: "monthly" },
  { path: "/tools/pro", priority: "0.7", changefreq: "monthly" },
  { path: "/feedback", priority: "0.7", changefreq: "monthly" },
  { path: "/data-request", priority: "0.6", changefreq: "yearly" },
  { path: "/start-building", priority: "0.9", changefreq: "weekly" },
  { path: "/paint-calculator", priority: "0.9", changefreq: "monthly" },
  { path: "/screeding-calculator", priority: "0.9", changefreq: "monthly" },
  { path: "/pop-ceiling-calculator", priority: "0.8", changefreq: "monthly" },
  { path: "/tile-calculator", priority: "0.8", changefreq: "monthly" },
  { path: "/finish-estimator", priority: "0.7", changefreq: "monthly" },
  { path: "/colors", priority: "0.8", changefreq: "weekly" },
  { path: "/colors/compare", priority: "0.7", changefreq: "monthly" },
  { path: "/ai-color-assistant", priority: "0.7", changefreq: "monthly" },
  { path: "/learn", priority: "0.8", changefreq: "weekly" },
  { path: "/prices", priority: "0.8", changefreq: "daily" },
  { path: "/glossary", priority: "0.8", changefreq: "monthly" },
  { path: "/printables", priority: "0.8", changefreq: "monthly" },
  { path: "/learn/library", priority: "0.7", changefreq: "daily" },
  { path: "/user-guide", priority: "0.7", changefreq: "monthly" },
  { path: "/templates", priority: "0.6", changefreq: "weekly" },
  {
    path: "/templates/standard-living-room-painting",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/master-bedroom-painting",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/single-accent-wall-painting",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/exterior-bungalow-painting",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/dining-room-painting",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/childrens-room-painting",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/kitchen-walls-painting",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/corridor-stairwell-painting",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/2-bedroom-flat-full-painting",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/office-space-painting",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/exterior-duplex-painting",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/shop-retail-front-painting",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/standard-floor-tiling",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/bathroom-wall-tiling",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/large-hall-floor-tiling",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/kitchen-backsplash-tiling",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/balcony-floor-tiling",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/kitchen-floor-tiling",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/guest-toilet-wall-tiling",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/staircase-tiling",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/terrazzo-porcelain-floor-tiling",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/wall-feature-strip-tiling",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/standard-room-screeding",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/single-wall-screeding",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/living-room-ceiling-screeding",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/corridor-walls-screeding",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/dining-room-screeding",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/office-screeding",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/corridor-screeding",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/single-feature-wall-screeding",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/shop-front-screeding",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/standard-bedroom-pop-ceiling",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/large-living-room-pop-ceiling",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/small-office-pop-ceiling",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/hall-cornice-pop-ceiling",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/dining-room-pop-ceiling",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/kitchen-pop-ceiling",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/corridor-pop-ceiling",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/master-bedroom-pop-ceiling",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/conference-room-pop-ceiling",
    priority: "0.5",
    changefreq: "monthly",
  },
  { path: "/about", priority: "0.5", changefreq: "monthly" },
  { path: "/contact", priority: "0.5", changefreq: "monthly" },
  { path: "/build-to-roof-estimator", priority: "0.9", changefreq: "monthly" },
  { path: "/structural-calculator", priority: "0.8", changefreq: "monthly" },
  { path: "/masonry-calculator", priority: "0.8", changefreq: "monthly" },
  { path: "/plastering-calculator", priority: "0.8", changefreq: "monthly" },
  { path: "/drywall-calculator", priority: "0.8", changefreq: "monthly" },
  { path: "/paving-calculator", priority: "0.8", changefreq: "monthly" },
  { path: "/drainage-calculator", priority: "0.8", changefreq: "monthly" },
  { path: "/septic-sizing-calculator", priority: "0.8", changefreq: "monthly" },
  {
    path: "/temporary-works-calculator",
    priority: "0.8",
    changefreq: "monthly",
  },
  { path: "/insulation-calculator", priority: "0.8", changefreq: "monthly" },
  { path: "/demolition-calculator", priority: "0.8", changefreq: "monthly" },
  { path: "/blueprint-takeoff", priority: "0.8", changefreq: "monthly" },
  {
    path: "/concrete-takeoff-calculator",
    priority: "0.8",
    changefreq: "monthly",
  },
  { path: "/earthworks-cut-fill", priority: "0.8", changefreq: "monthly" },
  { path: "/roof-framing-calculator", priority: "0.8", changefreq: "monthly" },
  { path: "/foundation-calculator", priority: "0.8", changefreq: "monthly" },
  { path: "/project-timeline", priority: "0.7", changefreq: "monthly" },
  { path: "/construction-sequence", priority: "0.7", changefreq: "monthly" },
  { path: "/image-estimator", priority: "0.7", changefreq: "monthly" },
  { path: "/smart-calculator", priority: "0.8", changefreq: "monthly" },
  { path: "/marketplace", priority: "0.8", changefreq: "daily" },
  { path: "/pro-connect", priority: "0.8", changefreq: "weekly" },
  { path: "/paint-comparison", priority: "0.7", changefreq: "monthly" },
  { path: "/gallery", priority: "0.7", changefreq: "daily" },
  { path: "/case-studies", priority: "0.7", changefreq: "weekly" },
  { path: "/material-prices", priority: "0.7", changefreq: "daily" },
  { path: "/surface-assessment", priority: "0.7", changefreq: "monthly" },
  { path: "/pricing", priority: "0.6", changefreq: "monthly" },
  { path: "/partners", priority: "0.6", changefreq: "monthly" },
  { path: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/cookie-policy", priority: "0.3", changefreq: "yearly" },
  { path: "/disclaimer", priority: "0.3", changefreq: "yearly" },
  { path: "/ai-disclaimer", priority: "0.3", changefreq: "yearly" },
  // ── Engine & calculator pages (crawl priority 0.9) ──
  { path: "/bim-ifc-import", priority: "0.9", changefreq: "monthly" },
  { path: "/solar-pv-estimator", priority: "0.9", changefreq: "monthly" },
  { path: "/conversational-estimator", priority: "0.9", changefreq: "monthly" },
  { path: "/field-sync", priority: "0.8", changefreq: "monthly" },
  { path: "/count-vision", priority: "0.9", changefreq: "monthly" },
  { path: "/electrical", priority: "0.9", changefreq: "monthly" },
  { path: "/plumbing", priority: "0.9", changefreq: "monthly" },
  { path: "/waterproofing", priority: "0.9", changefreq: "monthly" },
  { path: "/wall-finish-estimator", priority: "0.9", changefreq: "monthly" },
  { path: "/flooring", priority: "0.9", changefreq: "monthly" },
  { path: "/reinforcement", priority: "0.9", changefreq: "monthly" },
  { path: "/foundation", priority: "0.9", changefreq: "monthly" },
  { path: "/doors-windows", priority: "0.9", changefreq: "monthly" },
  { path: "/generator", priority: "0.9", changefreq: "monthly" },
  { path: "/boq-generator", priority: "0.9", changefreq: "monthly" },
  { path: "/boq-studio", priority: "0.9", changefreq: "monthly" },
  { path: "/suppliers", priority: "0.9", changefreq: "daily" },
  { path: "/suppliers/register", priority: "0.6", changefreq: "monthly" },
  { path: "/suppliers/workspace", priority: "0.4", changefreq: "monthly" },
  { path: "/suppliers/compare", priority: "0.5", changefreq: "weekly" },
  { path: "/procurement", priority: "0.6", changefreq: "weekly" },
  { path: "/procurement/new", priority: "0.4", changefreq: "monthly" },
  { path: "/cash-flow-timeline", priority: "0.9", changefreq: "monthly" },
  { path: "/circular-reuse", priority: "0.9", changefreq: "monthly" },
  { path: "/contractor-credit", priority: "0.9", changefreq: "monthly" },
  { path: "/defect-diagnosis", priority: "0.9", changefreq: "monthly" },
  { path: "/estimate-refresh", priority: "0.9", changefreq: "monthly" },
  { path: "/heat-comfort", priority: "0.9", changefreq: "monthly" },
  { path: "/material-advisor", priority: "0.9", changefreq: "monthly" },
  { path: "/site-intelligence", priority: "0.9", changefreq: "monthly" },
  { path: "/diaspora-tracker", priority: "0.9", changefreq: "monthly" },
  { path: "/code-reference", priority: "0.9", changefreq: "monthly" },
  { path: "/material-price-index", priority: "0.9", changefreq: "daily" },
  { path: "/labour-estimator", priority: "0.9", changefreq: "monthly" },
  { path: "/maintenance-planner", priority: "0.9", changefreq: "monthly" },
  { path: "/margin-calculator", priority: "0.9", changefreq: "monthly" },
  { path: "/regional-cost-index", priority: "0.9", changefreq: "monthly" },
  { path: "/warranty-certificate", priority: "0.9", changefreq: "monthly" },
  { path: "/carbon-footprint", priority: "0.9", changefreq: "monthly" },
  { path: "/brand-studio", priority: "0.8", changefreq: "monthly" },
  // ── Secondary public pages ──
  { path: "/credits", priority: "0.6", changefreq: "monthly" },
  { path: "/developers", priority: "0.6", changefreq: "monthly" },
  { path: "/global-markets", priority: "0.7", changefreq: "monthly" },
  { path: "/rewards", priority: "0.6", changefreq: "monthly" },
  {
    path: "/increte-flooring-calculator",
    priority: "0.8",
    changefreq: "monthly",
  },
  {
    path: "/visual-finishing-estimator",
    priority: "0.8",
    changefreq: "monthly",
  },
  {
    path: "/tools/visual-finishing-estimator",
    priority: "0.8",
    changefreq: "monthly",
  },
  ...marketLandingRoutes.map((m) => ({
    path: `/market/${m.code.toLowerCase()}`,
    priority: "0.8",
    changefreq: "monthly",
  })),
];

// ── Learn section: dynamic category + article URLs from Supabase ─────
async function fetchLearnRoutes() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    failBuildIfNetlify(
      "Supabase env vars missing — dynamic Learn URLs skipped",
    );
    return [];
  }
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
  const learnRoutes = [];
  try {
    // Active categories (RLS: public read, is_active only)
    const catRes = await fetch(
      `${SUPABASE_URL}/rest/v1/learn_categories?select=slug,updated_at&is_active=eq.true`,
      { headers },
    );
    if (catRes.ok) {
      const cats = await catRes.json();
      for (const c of cats) {
        learnRoutes.push({
          path: `/learn/category/${c.slug}`,
          priority: "0.6",
          changefreq: "weekly",
        });
      }
    }

    // Published articles (RLS: public read, published + published_at <= now)
    let artRes = await fetch(
      `${SUPABASE_URL}/rest/v1/learn_articles?select=slug,updated_at,wall_market_code&status=eq.published&order=published_at.desc&limit=1000`,
      { headers },
    );
    // Keep builds compatible until the additive library migration is applied.
    // The fallback still lists ordinary Learn articles; market-tagged URLs are
    // emitted as soon as the database exposes wall_market_code.
    let hasMarketField = artRes.ok;
    if (!artRes.ok) {
      artRes = await fetch(
        `${SUPABASE_URL}/rest/v1/learn_articles?select=slug,updated_at&status=eq.published&order=published_at.desc&limit=1000`,
        { headers },
      );
    }
    if (artRes.ok) {
      const arts = await artRes.json();
      const wallCodes = new Set();
      for (const a of arts) {
        if (hasMarketField && a.wall_market_code) {
          wallCodes.add(a.wall_market_code.toLowerCase());
          learnRoutes.push({
            path: `/learn/wall-finishing/${a.wall_market_code.toLowerCase()}/${a.slug}`,
            priority: "0.7",
            changefreq: "monthly",
          });
        } else {
          learnRoutes.push({
            path: `/learn/${a.slug}`,
            priority: "0.7",
            changefreq: "monthly",
          });
        }
      }
      for (const code of wallCodes) {
        learnRoutes.push({
          path: `/learn/wall-finishing/${code}`,
          priority: "0.6",
          changefreq: "weekly",
        });
      }
    }
    console.log(`  ✅ Learn: ${learnRoutes.length} dynamic URLs`);
    if (!catRes.ok || !artRes.ok) {
      failBuildIfNetlify(
        `Learn fetch failed (categories ${catRes.status}, articles ${artRes.status})`,
      );
      return learnRoutes;
    }
  } catch (err) {
    failBuildIfNetlify(`Learn fetch failed (${err.message})`);
    return [];
  }
  return learnRoutes;
}

// On Netlify builds, a failed Supabase fetch must fail the build: a
// sitemap that silently drops the 66 learn articles + 13 categories is
// how "Google only sees ~100 pages" happens unnoticed. Local dev (no
// env / no NETLIFY) keeps the static-routes fallback.
const failBuildIfNetlify = (reason) => {
  if (process.env.NETLIFY) {
    console.error(
      `\n ❌ ${reason} — failing the build so the sitemap cannot silently lose content pages.\n`,
    );
    process.exit(1);
  }
  console.log(
    `  ⚠️  ${reason} — falling back to static routes only (local dev)`,
  );
};

const learnRoutes = await fetchLearnRoutes();

// Market × template family: 32 market hubs + every curated template in every
// market. The app serves these at /market/<code>/templates[/<slug>] with
// distinct titles, canonicals and hreflang alternates (see
// src/lib/templates-market.ts), so they are first-class sitemap URLs.
const marketTemplateRoutes = [];
for (const m of marketLandingRoutes) {
  const hub = `/market/${m.code.toLowerCase()}/templates`;
  marketTemplateRoutes.push({
    path: hub,
    priority: "0.7",
    changefreq: "weekly",
  });
  for (const t of TEMPLATE_CATALOG) {
    marketTemplateRoutes.push({
      path: `${hub}/${t.slug}`,
      priority: "0.6",
      changefreq: "monthly",
    });
  }
}

const allRoutes = [...routes, ...learnRoutes, ...marketTemplateRoutes];

// Netlify's "pretty URLs" force-redirect every path to its trailing-slash
// form (301 /calculators -> /calculators/). The sitemap must list the final
// URL only, otherwise Google Search Console flags every entry as a redirect.
// The deprecated consolidation routes (cost-estimator etc.) redirect to
// ?mode= URLs, so they are deliberately absent from the route list.
const canonical = (p) => (p === "/" ? p : `${p}/`);

// ── English-only URL emission ────────────────────────────────────────
// The 11 locale-prefixed URL forms (/es/, /fr/, ...) were previously
// listed with hreflang alternates, but prerender emits exactly one
// content-bearing page per route (English), so every locale URL served
// a byte-identical copy of the home page to crawlers. Google Search
// Console kept only ~107 of the 2,058 submitted URLs for exactly this
// reason, and AdSense reviews read that mass-duplication as low-value
// content. Until locale URLs carry genuinely translated content, the
// sitemap lists only the unique English URLs. Locale switching stays
// fully client-side (LocaleAwareRoutes) for human visitors.
const urlEntry = (path, opts = {}) => `  <url>
    <loc>${SITE_URL}${canonical(path)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${opts.changefreq ?? "monthly"}</changefreq>
    <priority>${opts.priority ?? "0.6"}</priority>
  </url>`;
const localizedEntries = [];
for (const r of allRoutes) {
  localizedEntries.push(
    urlEntry(r.path, {
      priority: r.priority ?? (r.path === "/" ? "1.0" : "0.6"),
      changefreq: r.changefreq,
    }),
  );
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${" "}
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${localizedEntries.join("\n")}
</urlset>
`;

// Write to both dist/ and public/
try {
  writeFileSync("dist/sitemap.xml", xml);
  console.log("  ✅ dist/sitemap.xml");
} catch {
  console.log("  ⚠️  dist/ not found, skipping dist/sitemap.xml");
}
writeFileSync("public/sitemap.xml", xml);
console.log("  ✅ public/sitemap.xml");
console.log(
  `\n sitemap generated with ${localizedEntries.length} URLs (${allRoutes.length} unique English routes)`,
);
