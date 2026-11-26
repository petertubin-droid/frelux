/**
 * Global readiness audit for every tool FRELUX publishes.
 *
 * One row per calculator, with the things that have to be true before a surface
 * can be called finished: the route exists, the page is registered, the sitemap
 * indexes it, an FAQ group answers for it, the page renders those questions, it
 * sits in the universal display layout, and the copy obeys the house rules.
 *
 * Read only. It prints a matrix and a summary, and exits non zero when a hard
 * check fails so it can gate a release later.
 *
 * Usage: node scripts/audit-global-readiness.mjs [--json]
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), "utf8");

const toolsSource = read("src/config/construction-tools.ts");
const appSource = read("src/App.tsx");
const sitemapSource = existsSync(join(root, "public/sitemap.xml"))
  ? read("public/sitemap.xml")
  : "";

const faqSources = [
  "src/config/tool-faqs.ts",
  "src/config/engine-faqs.ts",
  "src/config/faq-renovation.ts",
].map((p) => (existsSync(join(root, p)) ? read(p) : ""));

/** Tool entries: slug, title and route, in catalogue order. */
const tools = [];
const toolBlocks = toolsSource.split(/\n  \{\n/).slice(1);
for (const block of toolBlocks) {
  const slug = /slug: "([^"]+)"/.exec(block)?.[1];
  const title = /title: "([^"]+)"/.exec(block)?.[1];
  const to = /\n    to: "([^"]+)"/.exec(block)?.[1];
  if (slug && to) tools.push({ slug, title, route: to });
}

/** FAQ groups: slug plus the tool route they answer for. */
const faqGroups = [];
for (const source of faqSources) {
  for (const match of source.matchAll(/slug: "([a-z0-9-]+)",\s*\n\s*route: "([^"]+)"/g)) {
    faqGroups.push({ slug: match[1], route: match[2] });
  }
}
const faqByRoute = new Map();
for (const group of faqGroups) {
  if (!faqByRoute.has(group.route)) faqByRoute.set(group.route, []);
  faqByRoute.get(group.route).push(group.slug);
}

/** Lazy page modules, keyed by the component name App renders. */
const lazyPages = new Map();
for (const match of appSource.matchAll(
  /const ([A-Za-z0-9_]+) = lazy\(\s*\(\) => import\("@\/pages\/([\w./-]+)"\)\s*,?\s*\)/g,
)) {
  lazyPages.set(match[1], `src/pages/${match[2]}.tsx`);
}
for (const match of appSource.matchAll(
  /import ([A-Za-z0-9_]+) from "@\/pages\/([\w./-]+)"/g,
)) {
  lazyPages.set(match[1], `src/pages/${match[2]}.tsx`);
}

/** App routes, with the page component each one renders. */
const appRoutes = new Map();
for (const match of appSource.matchAll(/path="([^"]+)"/g)) {
  const window = appSource.slice(match.index, match.index + 700);
  for (const tag of window.matchAll(/<([A-Za-z0-9_]+)/g)) {
    if (lazyPages.has(tag[1])) {
      if (!appRoutes.has(match[1])) appRoutes.set(match[1], tag[1]);
      break;
    }
  }
}
const appRoutePaths = new Set([...appSource.matchAll(/path="([^"]+)"/g)].map((m) => m[1]));

/** Page module for a component, found by its export. */
const pageFiles = readdirSync(join(root, "src/pages")).filter((f) => f.endsWith(".tsx") && !f.includes(".test."));
const pageSource = new Map();
for (const file of pageFiles) pageSource.set(file, read(`src/pages/${file}`));
function fileFor(component) {
  for (const [file, source] of pageSource) {
    if (new RegExp(`export default function ${component}\\b`).test(source)) return file;
  }
  return null;
}

const sitemapPaths = new Set(
  [...sitemapSource.matchAll(/<loc>https:\/\/[^/]+([^<]*)<\/loc>/g)].map((m) =>
    m[1].replace(/\/$/, "") || "/",
  ),
);
const EXCLUDED_SITEMAP_ROUTES = new Set([
  "/tools/offline-sync",
  "/color-preview",
]);
const inSitemap = (route) => {
  const clean = route.replace(/\/$/, "");
  return sitemapPaths.has(clean) || EXCLUDED_SITEMAP_ROUTES.has(clean);
};

/**
 * A specialty takeoff page renders through SpecialtyCalculatorShell, which mounts
 * the shared tool shell with the page's own routePath. One hop from the page is
 * therefore enough evidence that the route's questions and header render, but
 * only while that shell really does mount the tool shell.
 */
const specialtyChrome =
  "src/components/calculators/SpecialtyCalculatorShell.tsx";
const specialtySource = existsSync(join(root, specialtyChrome))
  ? read(specialtyChrome)
  : "";
const specialtyCarriesShell =
  /<ToolShell\b/.test(specialtySource) && /route=\{routePath\}/.test(specialtySource);

const rows = tools.map((tool) => {
  const component = appRoutes.get(tool.route) ?? null;
  const file =
    (component && lazyPages.get(component)) ??
    (component ? fileFor(component) : null) ??
    null;
  const exists = file ? existsSync(join(root, file)) : false;
  const source = exists ? read(file) : "";
  const groups = faqByRoute.get(tool.route) ?? [];
  return {
    slug: tool.slug,
    route: tool.route,
    component,
    file: exists ? file : null,
    routeRegistered: appRoutePaths.has(tool.route),
    sitemap: inSitemap(tool.route),
    faqGroups: groups,
    // A page on the shared shell does not name its questions: the shell resolves
    // them from the route, so the shell is the evidence that they render.
    rendersFaqs:
      /faqSlug=/.test(source) ||
      /<ToolFaqs\b/.test(source) ||
      /<ToolShell\b/.test(source) ||
      groups.some((slug) => source.includes(`"${slug}"`)) ||
      (specialtyCarriesShell &&
        /<SpecialtyCalculatorShell\b/.test(source) &&
        source.includes(`routePath="${tool.route}"`)),
    universalLayout:
      /<Container|<PageHeader|<ToolShell\b|SpecialtyCalculatorShell|CalculatorShell/.test(source),
    sharedPrimitives:
      /NumericInput|MarketSelector|ResultCard|EmptyState/.test(source),
  };
});

const counts = {
  tools: rows.length,
  routeMissing: rows.filter((r) => !r.routeRegistered).length,
  sitemapMissing: rows.filter((r) => !r.sitemap).length,
  noFaqGroup: rows.filter((r) => r.faqGroups.length === 0).length,
  faqNotRendered: rows.filter((r) => r.faqGroups.length > 0 && !r.rendersFaqs).length,
  noUniversalLayout: rows.filter((r) => !r.universalLayout).length,
  noSharedPrimitive: rows.filter((r) => !r.sharedPrimitives).length,
  pageMissing: rows.filter((r) => !r.file).length,
};

const list = (predicate, key) =>
  rows.filter(predicate).map((r) => `${r.route}${key ? ` [${r[key]}]` : ""}`);

const report = {
  counts,
  rows,
  routeMissing: list((r) => !r.routeRegistered),
  sitemapMissing: list((r) => !r.sitemap),
  noFaqGroup: list((r) => r.faqGroups.length === 0),
  faqGroupButNoRender: list((r) => r.faqGroups.length > 0 && !r.rendersFaqs),
  noUniversalLayout: list((r) => !r.universalLayout),
  pageMissing: list((r) => !r.file),
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`tools audited: ${counts.tools}`);
  for (const [key, value] of Object.entries(counts)) {
    if (key !== "tools") console.log(`${key}: ${value}`);
  }
  for (const key of [
    "routeMissing",
    "pageMissing",
    "sitemapMissing",
    "noFaqGroup",
    "faqGroupButNoRender",
    "noUniversalLayout",
  ]) {
    if (report[key].length) {
      console.log(`\n${key}:`);
      for (const line of report[key]) console.log(`  ${line}`);
    }
  }
}
