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
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { createHash } from "crypto";
import { marketLandingRoutes } from "./market-landing-data.mjs";
import { TEMPLATE_CATALOG } from "./lib/template-catalog.mjs";
import { SITE_URL } from "./lib/site-url.mjs";
import { isLocalePrefixed } from "./lib/locale-paths.mjs";

/**
 * FAQ article slugs, read from the registries so a new answer page is indexed
 * the moment it ships without a second list to maintain.
 */
function faqArticleRoutes() {
  const files = ["src/config/tool-faqs.ts", "src/config/engine-faqs.ts"];
  const slugs = new Set();
  for (const file of files) {
    let source = "";
    try {
      source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    } catch {
      continue;
    }
    for (const match of source.matchAll(/^\s*slug: "([a-z0-9-]+)",/gm)) {
      slugs.add(match[1]);
    }
  }
  return [...slugs].sort().map((slug) => ({
    path: `/faq/${slug}`,
    priority: "0.6",
    changefreq: "monthly",
  }));
}

const today = new Date().toISOString().split("T")[0];

/**
 * Per-URL lastmod, carried across builds.
 *
 * Every URL used to be stamped with the build date, so a five-file change
 * restamped 1,641 URLs and told crawlers the whole site had moved. The stamp
 * now follows the prerendered content: the manifest records a fingerprint of
 * each page's HTML with hashed asset URLs stripped (a new bundle hash rewrites
 * every page's markup without changing a word of it), and only pages whose
 * fingerprint moved get the build date. Pages with no prerendered HTML at all
 * keep their previous stamp rather than claiming a change nobody made.
 */
const LASTMOD_MANIFEST = "scripts/sitemap-lastmod.json";
let previousLastmod = {};
try {
  previousLastmod = JSON.parse(readFileSync(LASTMOD_MANIFEST, "utf8"));
} catch {
  previousLastmod = {};
}

function contentFingerprint(routePath) {
  const file =
    routePath === "/" ? "dist/index.html" : `dist${routePath}/index.html`;
  let html;
  try {
    html = readFileSync(file, "utf8");
  } catch {
    return null;
  }
  // Strip hashed asset names wherever they appear (src, href, preload, inline
  // module imports, og:image): a new bundle hash rewrites every page's markup
  // without changing a word of it, and lastmod must not claim that as a change.
  const normalized = html
    .replace(/(?:src|href)="[^"]*\/assets\/[^"]*"/g, 'src=""')
    .replace(/-[A-Za-z0-9_]{8}\.(?:js|mjs|css|woff2?|ttf|otf|png|jpe?g|webp|avif|svg)/g, "-HASH")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha1").update(normalized).digest("hex").slice(0, 16);
}

const nextLastmod = {};

function resolveLastmod(routePath, stated) {
  const previous = previousLastmod[routePath];
  const fingerprint = contentFingerprint(routePath);
  let lastmod;
  if (stated) lastmod = String(stated).slice(0, 10);
  else if (!fingerprint) lastmod = previous?.lastmod ?? today;
  else if (previous?.hash === fingerprint) lastmod = previous.lastmod;
  else lastmod = today;
  nextLastmod[routePath] = {
    lastmod,
    hash: fingerprint ?? previous?.hash ?? null,
  };
  return lastmod;
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";

/**
 * Locales whose translated pages are allowed in the index. Mirrors
 * INDEXABLE_LOCALES in src/lib/translation-index.ts and prerender.mjs: a locale
 * is listed here only once its content is genuinely translated.
 */
const INDEXABLE_LOCALE_CODES = ["es"];
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";

const routes = [
  {
    path: "/learn/build-in-nigeria-from-abroad",
    priority: "0.8",
    changefreq: "monthly",
  },
  { path: "/map", priority: "0.7", changefreq: "weekly" },
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/calculators", priority: "0.9", changefreq: "monthly" },
  { path: "/construction-tools", priority: "0.9", changefreq: "weekly" },
  { path: "/fence-block-calculator", priority: "0.9", changefreq: "monthly" },
  { path: "/german-floor-calculator", priority: "0.9", changefreq: "monthly" },
  { path: "/window-blind-calculator", priority: "0.9", changefreq: "monthly" },
  { path: "/tools/finishes", priority: "0.8", changefreq: "monthly" },
  { path: "/tools/structure", priority: "0.8", changefreq: "monthly" },
  { path: "/tools/services", priority: "0.8", changefreq: "monthly" },
  { path: "/tools/components", priority: "0.7", changefreq: "monthly" },
  { path: "/tools/interiors", priority: "0.8", changefreq: "monthly" },
  { path: "/tools/project", priority: "0.8", changefreq: "monthly" },
  { path: "/tools/ai", priority: "0.7", changefreq: "monthly" },
  { path: "/tools/pro", priority: "0.7", changefreq: "monthly" },
  { path: "/feedback", priority: "0.7", changefreq: "monthly" },
  { path: "/faq", priority: "0.9", changefreq: "monthly" },
  ...faqArticleRoutes(),
  { path: "/data-request", priority: "0.6", changefreq: "yearly" },
  { path: "/start-building", priority: "0.9", changefreq: "weekly" },
  { path: "/escrow", priority: "0.6", changefreq: "monthly" },
  {
    path: "/developers/merchant-webhooks",
    priority: "0.6",
    changefreq: "monthly",
  },
  { path: "/paint-calculator", priority: "0.9", changefreq: "monthly" },
  { path: "/screeding-calculator", priority: "0.9", changefreq: "monthly" },
  { path: "/pop-ceiling-calculator", priority: "0.8", changefreq: "monthly" },
  { path: "/wallpaper-calculator", priority: "0.8", changefreq: "monthly" },
  { path: "/tile-calculator", priority: "0.8", changefreq: "monthly" },
  { path: "/finish-estimator", priority: "0.7", changefreq: "monthly" },
  { path: "/mineral-stone-calculator", priority: "0.7", changefreq: "monthly" },
  { path: "/stucco-calculator", priority: "0.7", changefreq: "monthly" },
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
  { path: "/mathematical-plan-elevation", priority: "0.7", changefreq: "monthly" },
  { path: "/tall-building-structure", priority: "0.8", changefreq: "monthly" },
  { path: "/tv-console-calculator", priority: "0.7", changefreq: "monthly" },
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
  { path: "/planning-approvals", priority: "0.8", changefreq: "monthly" },
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
  {
    path: "/retaining-wall-calculator",
    priority: "0.9",
    changefreq: "monthly",
  },
  {
    path: "/rainwater-gutter-soffit-cost-estimator",
    priority: "0.9",
    changefreq: "monthly",
  },
  {
    path: "/electrical-conduit-wiring-estimator",
    priority: "0.9",
    changefreq: "monthly",
  },
  {
    path: "/water-tower-staging-estimator",
    priority: "0.9",
    changefreq: "monthly",
  },
  {
    path: "/borehole-water-system-estimator",
    priority: "0.9",
    changefreq: "monthly",
  },
  {
    path: "/global-site-safety-estimator",
    priority: "0.9",
    changefreq: "monthly",
  },
  { path: "/diaspora-budget-tracker", priority: "0.9", changefreq: "monthly" },
  {
    path: "/structural-steel-i-beam-calculator",
    priority: "0.9",
    changefreq: "monthly",
  },
  { path: "/doors-windows", priority: "0.9", changefreq: "monthly" },
  { path: "/generator", priority: "0.9", changefreq: "monthly" },
  { path: "/boq-generator", priority: "0.9", changefreq: "monthly" },
  { path: "/boq-studio", priority: "0.9", changefreq: "monthly" },
  { path: "/suppliers", priority: "0.9", changefreq: "daily" },
  { path: "/suppliers/register", priority: "0.6", changefreq: "monthly" },
  { path: "/suppliers/compare", priority: "0.5", changefreq: "weekly" },
  { path: "/procurement", priority: "0.6", changefreq: "weekly" },
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
  { path: "/quote-check", priority: "0.9", changefreq: "monthly" },
  { path: "/regional-cost-index", priority: "0.9", changefreq: "monthly" },
  { path: "/warranty-certificate", priority: "0.9", changefreq: "monthly" },
  { path: "/carbon-footprint", priority: "0.9", changefreq: "monthly" },
  { path: "/brand-studio", priority: "0.8", changefreq: "monthly" },
  // ── Secondary public pages ──
  { path: "/credits", priority: "0.6", changefreq: "monthly" },
  { path: "/developers", priority: "0.6", changefreq: "monthly" },
  { path: "/market-intelligence", priority: "0.8", changefreq: "daily" },
  { path: "/market-intelligence/stocks", priority: "0.8", changefreq: "daily" },
  {
    path: "/market-intelligence/materials",
    priority: "0.8",
    changefreq: "weekly",
  },
  {
    path: "/market-intelligence/trends",
    priority: "0.7",
    changefreq: "weekly",
  },
  {
    path: "/market-intelligence/investment",
    priority: "0.6",
    changefreq: "weekly",
  },
  { path: "/market-intelligence/news", priority: "0.6", changefreq: "daily" },
  {
    path: "/market-intelligence/companies",
    priority: "0.6",
    changefreq: "monthly",
  },
  { path: "/unit-converter", priority: "0.7", changefreq: "monthly" },
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

    // Active supplier profiles (RLS: public read) — the directory's leaf pages
    const supplierRes = await fetch(
      `${SUPABASE_URL}/rest/v1/supplier_profiles?select=public_slug,updated_at&is_active=eq.true&public_slug=not.is.null&order=updated_at.desc&limit=1000`,
      { headers },
    );
    if (supplierRes.ok) {
      for (const sup of await supplierRes.json()) {
        routes.push({
          path: `/suppliers/${sup.public_slug}`,
          priority: "0.6",
          changefreq: "weekly",
          lastmod: sup.updated_at,
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

/**
 * Published Spanish article translations, keyed by article slug.
 *
 * Prerender already emits one /es/learn/<slug> page per published translation
 * and marks it index, follow with reciprocal hreflang. The sitemap only learned
 * about those pages second hand, from the prerender manifest, and listed them
 * as bare URLs with no alternates. Google wants the pairing stated either in
 * the HTML or in the sitemap; reading the translations here means both sides
 * say it, and a localized URL is listed because its translation exists rather
 * than because a file happened to be emitted.
 */
async function fetchPublishedArticleLocales() {
  const byslug = new Map();
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return byslug;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/content_translations?select=content_key,locale&content_type=eq.article&status=eq.published&limit=1000`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    );
    if (!res.ok) return byslug;
    for (const row of await res.json()) {
      if (!row?.content_key || !row?.locale || row.locale === "en") continue;
      const set = byslug.get(row.content_key) ?? new Set();
      set.add(row.locale);
      byslug.set(row.content_key, set);
    }
  } catch {
    // A sitemap without alternates is still correct, just less explicit.
  }
  return byslug;
}

const articleLocales = await fetchPublishedArticleLocales();

/** Locales published for a Learn article slug, restricted to indexable ones. */
const localesForSlug = (slug) =>
  [...(articleLocales.get(slug) ?? [])].filter((l) =>
    INDEXABLE_LOCALE_CODES.includes(l),
  );

/** Netlify serves the trailing-slash form; hrefs must match the final URL. */
const withSlash = (p) => (p === "/" ? p : `${p}/`);

/** hreflang set for one article: English, x-default, then each translation. */
function articleAlternates(articlePath, slug) {
  const locales = localesForSlug(slug);
  if (locales.length === 0) return undefined;
  return [
    { hreflang: "x-default", href: `${SITE_URL}${withSlash(articlePath)}` },
    { hreflang: "en", href: `${SITE_URL}${withSlash(articlePath)}` },
    ...locales.map((l) => ({
      hreflang: l,
      href: `${SITE_URL}${withSlash(`/${l}${articlePath}`)}`,
    })),
  ];
}

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

const manifestData = (() => {
  try {
    const raw = readFileSync("dist/_prerender-manifest.json", "utf-8");
    const parsed = JSON.parse(raw);
    return {
      paths: parsed.paths ?? [],
      noindex: new Set(parsed.noindex ?? []),
    };
  } catch {
    return { paths: [], noindex: new Set() };
  }
})();
const manifest = manifestData.paths;
const manifestNoindex = manifestData.noindex;

/**
 * Reviewed translations, and only those.
 *
 * Prerender emits a locale page for every article: index, follow when a
 * published translation exists, noindex when it does not. The edge noindex in
 * public/_headers is scoped to let those pages carry their own decision, so the
 * indexable ones are real pages with hreflang and a self-canonical, and they
 * belong in the sitemap. A noindex page never does.
 */
const translatedLocalePaths = new Set(
  manifest.filter((p) => isLocalePrefixed(p) && !manifestNoindex.has(p)),
);

// The manifest is written by prerender.mjs from the files it actually emitted,
// so a page that exists but is missing from the curated lists above still gets
// advertised, and a page the lists mention without a file never does.
const manifestOnlyRoutes = manifest
  .filter((p) => !routes.some((r) => r.path === p))
  .filter((p) => !learnRoutes.some((r) => r.path === p))
  .filter((p) => !marketTemplateRoutes.some((r) => r.path === p))
  .map((path) => ({ path, priority: "0.5", changefreq: "monthly" }));

const candidateRoutes = [
  ...routes,
  ...learnRoutes,
  ...marketTemplateRoutes,
  ...manifestOnlyRoutes,
];

// Enforce the English-only rule at assembly time, not only in the static list.
// Learn and template URLs arrive from Supabase, and a translated row would
// otherwise put a locale-prefixed duplicate into the sitemap even though
// public/_headers marks that URL noindex. Production carried 157 such /es/
// URLs before this guard.
const allRoutes = candidateRoutes.filter(
  (r) => !isLocalePrefixed(r.path) || translatedLocalePaths.has(r.path),
);
const droppedLocaleRoutes = candidateRoutes.length - allRoutes.length;
if (droppedLocaleRoutes > 0) {
  console.log(
    `  ℹ️  sitemap dropped ${droppedLocaleRoutes} locale-prefixed URL(s) with no reviewed translation`,
  );
}

// ── Learn article hreflang ───────────────────────────────────────────
// Pair every English article with its published translations, and add the
// localized URLs themselves, each carrying the same alternate set. Without this
// the /es pages only reached the sitemap through the prerender manifest and
// stated no relationship to the English original.
const articleRouteBySlug = new Map();
for (const r of allRoutes) {
  // Two canonical shapes: a library article at /learn/<slug> and a
  // market-tagged one at /learn/wall-finishing/<market>/<slug>. The translation
  // key is the slug in both.
  const m = /^\/learn\/(?:wall-finishing\/[a-z]{2}\/([^/]+)|([^/]+))$/.exec(
    r.path,
  );
  if (m) articleRouteBySlug.set(m[1] || m[2], r);
}

for (const [slug, route] of articleRouteBySlug) {
  const locales = localesForSlug(slug);
  if (locales.length === 0) continue;
  const alternates = articleAlternates(route.path, slug);
  route.alternates = alternates;
  for (const locale of locales) {
    const localizedPath = `/${locale}${route.path}`;
    if (allRoutes.some((r) => r.path === localizedPath)) {
      const existing = allRoutes.find((r) => r.path === localizedPath);
      existing.alternates = alternates;
      existing.lang = locale;
      continue;
    }
    allRoutes.push({
      path: localizedPath,
      priority: "0.5",
      changefreq: "monthly",
      lang: locale,
      alternates,
    });
  }
}
const translatedArticleCount = [...articleRouteBySlug.keys()].filter(
  (slug) => localesForSlug(slug).length > 0,
).length;
console.log(
  `  ✅ Learn hreflang: ${translatedArticleCount} article(s) paired with published translations`,
);

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
${(opts.alternates ?? [])
  .map(
    (a) =>
      `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`,
  )
  .join("\n")}${(opts.alternates ?? []).length ? "\n" : ""}    <lastmod>${opts.lastmod ?? today}</lastmod>
    <changefreq>${opts.changefreq ?? "monthly"}</changefreq>
    <priority>${opts.priority ?? "0.6"}</priority>
  </url>`;
const localizedEntries = [];
for (const r of allRoutes) {
  localizedEntries.push(
    urlEntry(r.path, {
      priority: r.priority ?? (r.path === "/" ? "1.0" : "0.6"),
      changefreq: r.changefreq,
      lastmod: resolveLastmod(r.path, r.lastmod),
      alternates: r.alternates,
    }),
  );
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${" "}
        xmlns:xhtml="http://www.w3.org/1999/xhtml"${" "}
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

// Persist the fingerprints for the next build. Sorted so the diff is readable
// and a no-op build produces no diff at all.
const manifestEntries = Object.entries(nextLastmod).sort(([a], [b]) =>
  a < b ? -1 : a > b ? 1 : 0,
);
if (existsSync(LASTMOD_MANIFEST) || manifestEntries.length > 0) {
  writeFileSync(
    LASTMOD_MANIFEST,
    `${JSON.stringify(Object.fromEntries(manifestEntries), null, 2)}\n`,
  );
  console.log(`  ✅ ${LASTMOD_MANIFEST}`);
}
console.log(
  `\n sitemap generated with ${localizedEntries.length} URLs (${allRoutes.length} unique English routes)`,
);
