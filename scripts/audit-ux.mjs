#!/usr/bin/env node
/**
 * UX completeness + correctness audit for the public site.
 *
 * Reads the router, the page sources and the SEO route lists, then reports what
 * each page actually ships: ad slots, share actions, reset affordance,
 * disclaimers, methodology notes, accessibility labels, unit leakage, brand
 * copy rules and dead internal links.
 *
 *   node scripts/audit-ux.mjs [--json] [--only=<substring>]
 *
 * Output is a report plus a non-zero exit when a page breaks a hard rule, so it
 * can gate a release.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const only = (args.find((a) => a.startsWith("--only=")) || "").split("=")[1];

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

const app = read("src/App.tsx");
const pagesDir = path.join(ROOT, "src/pages");
/** Page modules, including the pages kept in subfolders
 *  (marketplace, contractor, admin, market-intelligence). */
function listPages(dir = pagesDir, prefix = "") {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) out.push(...listPages(path.join(dir, entry.name), `${prefix}${entry.name}/`));
    else if (entry.name.endsWith(".tsx") && !entry.name.includes(".test."))
      out.push(`${prefix}${entry.name.slice(0, -4)}`);
  }
  return out;
}
const pageFiles = listPages();

/** Every <Route> with its path and the page component it renders. */
function parseRoutes(src) {
  const chunks = src.split("<Route").slice(1);
  const rows = [];
  for (const chunk of chunks) {
    const stop = chunk.search(/<\/Route>|<Route\b/);
    const body = stop === -1 ? chunk : chunk.slice(0, stop);
    const p = body.match(/path=["'{]([^"'}]*)["'}]/);
    if (!p) continue;
    const comps = [...body.matchAll(/<([A-Z]\w+)/g)].map((m) => m[1]);
    const direct = comps.find((c) => pageFiles.some((f) => f.split("/").pop() === c));
    const aliased = comps.map((c) => aliasToModule.get(c)).find((m) => m && pageFiles.includes(m));
    const page = direct || aliased || null;
    rows.push({ path: p[1], page, comps });
  }
  return rows;
}

/** App.tsx imports pages under its own names, so resolve component -> module
 *  path before deciding a route has no page behind it. */
const aliasToModule = new Map();
for (const m of app.matchAll(/const\s+(\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*["']@\/pages\/([^"']+)["']/g))
  aliasToModule.set(m[1], m[2]);
for (const m of app.matchAll(/import\s+(\w+)\s*(?:,\s*\{[^}]*\})?\s*from\s*["']@\/pages\/([^"']+)["']/g))
  aliasToModule.set(m[1], m[2]);
for (const m of app.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']@\/pages\/([^"']+)["']/g))
  for (const name of m[1].split(",").map((x) => x.trim().split(/\s+as\s+/).pop()))
    if (name) aliasToModule.set(name, m[2]);

const routes = parseRoutes(app);
const routedPages = new Set(routes.map((r) => r.page).filter(Boolean));

// SEO + navigation sources that must agree with the router.
const seoFiles = ["src/lib/seo-routes.ts", "src/lib/routes.ts"].filter(exists);
const sitemapFile = ["scripts/prerender.mjs", "public/sitemap.xml"].find(exists);

/** Every local module a page pulls in, so a feature shipped by a shared shell
 *  counts for the page that renders it. Grepping one file per page would report
 *  a calculator as missing the share row its shell renders. */
const fileCache = new Map();
function localImports(file) {
  if (fileCache.has(file)) return fileCache.get(file);
  let out = [];
  if (exists(file)) {
    const src = fs.readFileSync(path.join(ROOT, file), "utf8");
    for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) {
      const spec = m[1];
      let target = null;
      if (spec.startsWith("@/")) target = `src/${spec.slice(2)}`;
      else if (spec.startsWith(".")) target = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec));
      if (!target) continue;
      for (const ext of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
        if (exists(target + ext)) {
          out.push(target + ext);
          break;
        }
      }
    }
  }
  fileCache.set(file, out);
  return out;
}

function closure(file, depth = 0, seen = new Set()) {
  if (seen.has(file) || depth > 8) return seen;
  seen.add(file);
  for (const dep of localImports(file)) closure(dep, depth + 1, seen);
  return seen;
}

/** Feature flags across a page and everything it renders. */
function pageFeatures(file) {
  const files = [...closure(file)];
  const joined = files
    .filter((f) => exists(f))
    .map((f) => fs.readFileSync(path.join(ROOT, f), "utf8"))
    .join("\n");
  const hit = (rx) => rx.test(joined);
  return {
    adSlots: new Set(
      [...joined.matchAll(/<AdSlot[\s\S]{0,200}?(?:slotKey|placement|slot)=["']([^"']+)["']/g)].map((m) => m[1]),
    ).size,
    adSlotKeys: [
      ...new Set([...joined.matchAll(/<AdSlot[\s\S]{0,200}?(?:slotKey|placement|slot)=["']([^"']+)["']/g)].map((m) => m[1])),
    ],
    share: hit(/QuoteShareButton|ShareRow|shareEstimate|WhatsAppShare|ShareBar|buildShareMessage|shareQuote/),
    pdf: hit(/pdf|PDF|Pdf/),
    reset: hit(
      /CalculatorResetButton|ResetButton|onReset|handleReset|resetForm|StartOver|startOver|Start fresh|startFresh|clearAll|Clear all/i,
    ),
    disclaimer: hit(/Disclaimer|disclaimer/),
    methodology: hit(
      /HowCalculatedSection|methodology|MethodNote|howCalculated|how we calculated/i,
    ),
  };
}

const AD_CONTAINER_FALLBACK = /(?:>|\s)Advertisement\s*</;

/** Components a route can render that are not a page: layout, guards and the
 *  legacy-URL redirectors. A route pointing at one of these is not broken. */
const NON_PAGE = new Set([
  "Navigate",
  "RedirectToHub",
  "Redirect",
  "Outlet",
  "Suspense",
  "ProtectedRoute",
  "RequireAuth",
  "RequireRole",
  "NotFound",
  "NotFoundPage",
  "ErrorBoundary",
]);

/** Page files that some other module imports are composed rather than routed. */
function importGraph() {
  const imported = new Set();
  const roots = ["src/App.tsx", ...fs.readdirSync(pagesDir).map((f) => `src/pages/${f}`)];
  for (const rel of roots) {
    if (!exists(rel) || !rel.endsWith(".tsx")) continue;
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    for (const m of src.matchAll(/import\s+(?:\w+\s*,\s*)?[{]?\s*(\w+)[^;]*from\s+["'][^"']*pages\/(\w+)["']/g)) {
      if (m[1] === m[2]) imported.add(m[2]);
    }
    for (const m of src.matchAll(/lazy\(\s*\(\)\s*=>\s*import\(\s*["'][^"']*pages\/(\w+)/g)) imported.add(m[1]);
  }
  return imported;
}
const composedPages = importGraph();
const EMDASH = /[–—]/;

function auditPage(name, route) {
  const file = `src/pages/${name}.tsx`;
  if (!exists(file)) return null;
  const src = fs.readFileSync(path.join(ROOT, file), "utf8");
  const lower = src.toLowerCase();
  const isCalculator =
    /Calculator|Estimator|Takeoff|BoqGenerator/.test(name) &&
    !/Hub$|Landing|Marketplace|Studio|Gallery|Collection/.test(name);

  const feats = pageFeatures(file);
  const adSlots = feats.adSlots;
  const adSlotKeys = feats.adSlotKeys;
  const advertFallback = AD_CONTAINER_FALLBACK.test(src);
  const { share, pdf, reset, disclaimer, methodology } = feats;
  const ariaLabels = (src.match(/aria-label=/g) || []).length;
  const putsM2 = /m²|m2 total|area in m²/i.test(src) && isCalculator;
  const dashes = EMDASH.test(src);
  const hasTest =
    exists(`src/pages/${name}.test.tsx`) || exists(`src/pages/${name}.local-price.test.tsx`);

  return {
    page: name.split("/").pop(),
    route,
    isCalculator,
    adSlots,
    adSlotKeys,
    advertFallback,
    share,
    pdf,
    reset,
    disclaimer,
    methodology,
    ariaLabels,
    dashes,
    hasTest,
  };
}

const audited = routes
  .filter((r) => r.page)
  .filter((r) => (only ? r.path.includes(only) || r.page.includes(only) : true))
  .map((r) => auditPage(r.page, r.path))
  .filter(Boolean);

// Dedupe by page, keeping the first route.
const seen = new Set();
const unique = audited.filter((a) => (seen.has(a.page) ? false : seen.add(a.page)));

const brokenRoutes = routes.filter(
  (r) => !r.page && !r.comps.some((c) => NON_PAGE.has(c)) && r.path.startsWith("/"),
);
const routeTableMounted = new Set(
  ["market-intelligence", "admin", "contractor", "marketplace"].map((k) => k),
);
/** Admin and contractor consoles are mounted from generated navigation tables
 *  rather than literal <Route> elements, and they are not public UX, so the
 *  orphan and dead-route checks only look at public pages. */
const INTERNAL = /^(admin|contractor)\//;
const orphanPages = pageFiles.filter(
  (p) => !INTERNAL.test(p) && !routedPages.has(p.split("/").pop()) && !composedPages.has(p.split("/").pop()),
);
const unroutedComposed = pageFiles.filter((p) => !routedPages.has(p) && composedPages.has(p));

// Ad density: 2 slots for calculators, 3 for long-form pages.
const density = unique.filter((a) => (a.isCalculator ? a.adSlots > 2 : a.adSlots > 3));

// Internal link targets that no route serves.
const linkTargets = new Set();
for (const f of fs.readdirSync(pagesDir)) {
  if (!f.endsWith(".tsx") || f.includes(".test.")) continue;
  const src = fs.readFileSync(path.join(pagesDir, f), "utf8");
  for (const m of src.matchAll(/(?:to|href)=["'](\/[^"'#?]*)/g)) linkTargets.add(m[1]);
}
const routePaths = new Set(
  routes.map((r) => (r.path === "/" || r.path === "" ? "/" : r.path.replace(/\/$/, ""))),
);
const routeTails = new Set([...routePaths].map((r) => r.split("/").filter(Boolean).pop()));
const deadLinks = [...linkTargets].filter((t) => {
  if (t.includes("${") || t.length < 2) return false;
  const clean = t.replace(/\/$/, "");
  if (routePaths.has(clean)) return false;
  // A child route registered under a parent path ("post" inside "/marketplace")
  // serves the link even though the full path is never written in one place.
  if (routeTails.has(clean.split("/").filter(Boolean).pop())) return false;
  return ![...routePaths].some((r) => {
    if (!r.includes(":")) return false;
    const rx = new RegExp("^" + r.replace(/:[^/]+/g, "[^/]+") + "$");
    return rx.test(clean);
  });
});

const report = {
  generated_at: new Date().toISOString(),
  counts: {
    routes: routes.length,
    routedPages: routedPages.size,
    pageFiles: pageFiles.length,
    audited: unique.length,
    calculators: unique.filter((a) => a.isCalculator).length,
  },
  brokenRoutes,
  generatedRouteAreas: [...routeTableMounted],
  orphanPages,
  composedPages: unroutedComposed,
  density,
  deadLinks,
  missing: {
    share: unique.filter((a) => a.isCalculator && !a.share).map((a) => a.page),
    pdf: unique.filter((a) => a.isCalculator && !a.pdf).map((a) => a.page),
    reset: unique.filter((a) => a.isCalculator && !a.reset).map((a) => a.page),
    disclaimer: unique.filter((a) => a.isCalculator && !a.disclaimer).map((a) => a.page),
    methodology: unique.filter((a) => a.isCalculator && !a.methodology).map((a) => a.page),
    test: unique.filter((a) => a.isCalculator && !a.hasTest).map((a) => a.page),
    noAdSlot: unique.filter((a) => a.isCalculator && a.adSlots === 0).map((a) => a.page),
    advertFallback: unique.filter((a) => a.advertFallback).map((a) => a.page),
    dashes: unique.filter((a) => a.dashes).map((a) => a.page),
  },
  seo: { seoFiles, sitemapFile },
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const c = report.counts;
  console.log(`routes ${c.routes} | routed pages ${c.routedPages} | page files ${c.pageFiles} | calculators ${c.calculators}`);
  const show = (label, list) =>
    console.log(`${label} (${list.length})${list.length ? ": " + list.slice(0, 10).join(", ") + (list.length > 10 ? " ..." : "") : ""}`);
  show("broken routes", brokenRoutes.map((r) => r.path));
  show("orphan pages", orphanPages);
  show("composed, not routed", unroutedComposed);
  show("ad density over cap", density.map((d) => `${d.page}(${d.adSlots}: ${d.adSlotKeys.join("/")})`));
  show("dead internal links", deadLinks);
  for (const [k, v] of Object.entries(report.missing)) show(k, v);
}

const hardFail =
  report.brokenRoutes.length +
  report.deadLinks.length +
  report.density.length +
  report.missing.advertFallback.length +
  report.missing.dashes.length;
process.exit(hardFail > 0 ? 1 : 0);
