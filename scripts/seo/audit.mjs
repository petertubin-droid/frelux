/**
 * On-page SEO audit over the prerendered build.
 *
 * Reads every dist/<path>/index.html and reports the things Google actually
 * evaluates in a search result: title, description, canonical, robots, H1,
 * structured-data types, internal links and body word count. No network calls,
 * no simulated metrics: it describes the files this build would publish.
 *
 * Usage: node scripts/seo/audit.mjs [--json out.json] [--verbose]
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const SITE = "https://freluxtools.com";

function walk(dir, prefix = "", out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith("_") || e.name === "assets") continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, `${prefix}/${e.name}`, out);
    else if (e.name === "index.html") out.push(prefix === "" ? "/" : `${prefix}/`);
  }
  return out;
}

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&rsaquo;/g, ">")
    .replace(/&nbsp;/g, " ");

function auditPage(path) {
  const file = path === "/" ? join(DIST, "index.html") : join(DIST, path, "index.html");
  const html = readFileSync(file, "utf-8");
  const head = html.slice(0, html.indexOf("</head>") + 7);

  const title = decode((head.match(/<title>([\s\S]*?)<\/title>/) || [, ""])[1].trim());
  const desc = decode(
    (head.match(/<meta\s+name="description"\s+content="([^"]*)"/) || [, ""])[1].trim(),
  );
  const canonical = (head.match(/<link\s+rel="canonical"\s+href="([^"]*)"/) || [, ""])[1];
  const robots = (head.match(/<meta\s+name="robots"\s+content="([^"]*)"/) || [, ""])[1];

  const ldRaw = [...head.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  const ldTypes = [];
  for (const m of ldRaw) {
    try {
      const parsed = JSON.parse(m[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const it of items) {
        const t = it["@type"];
        if (Array.isArray(t)) ldTypes.push(...t);
        else if (t) ldTypes.push(t);
        if (Array.isArray(it["@graph"]))
          for (const g of it["@graph"]) if (g["@type"]) ldTypes.push(g["@type"]);
      }
    } catch {
      ldTypes.push("INVALID_JSON");
    }
  }

  const bodyStart = html.indexOf('<div id="root">');
  const body = bodyStart >= 0 ? html.slice(bodyStart) : "";
  const h1Count = (body.match(/<h1[\s>]/g) || []).length;
  const text = body
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text ? text.split(" ").length : 0;

  const hrefs = [...body.matchAll(/href="(\/[^"#?]*)/g)].map((m) => m[1]);
  const distinctInternal = new Set(hrefs);

  return {
    path,
    title,
    titleLength: title.length,
    description: desc,
    descriptionLength: desc.length,
    canonical,
    canonicalSelf: canonical === `${SITE}${path}`,
    robots: robots || "(none)",
    h1Count,
    words,
    ldTypes: [...new Set(ldTypes)],
    internalLinks: distinctInternal.size,
  };
}

const paths = walk(DIST).sort();
const pages = paths.map(auditPage);

const dupes = (key) => {
  const seen = new Map();
  for (const p of pages) {
    if (!p[key]) continue;
    if (!seen.has(p[key])) seen.set(p[key], []);
    seen.get(p[key]).push(p.path);
  }
  return [...seen.entries()].filter(([, v]) => v.length > 1);
};

const report = {
  generated_at: new Date().toISOString(),
  page_count: pages.length,
  duplicate_titles: dupes("title").map(([value, paths]) => ({ value, count: paths.length, paths: paths.slice(0, 5) })),
  duplicate_descriptions: dupes("description").map(([value, paths]) => ({ value, count: paths.length, paths: paths.slice(0, 5) })),
  missing_title: pages.filter((p) => !p.title).map((p) => p.path),
  missing_description: pages.filter((p) => !p.description).map((p) => p.path),
  long_titles: pages.filter((p) => p.titleLength > 62).map((p) => ({ path: p.path, length: p.titleLength, title: p.title })),
  long_descriptions: pages.filter((p) => p.descriptionLength > 165).map((p) => ({ path: p.path, length: p.descriptionLength })),
  short_descriptions: pages.filter((p) => p.description && p.descriptionLength < 70).map((p) => ({ path: p.path, length: p.descriptionLength })),
  canonical_not_self: pages.filter((p) => p.canonical && !p.canonicalSelf).map((p) => ({ path: p.path, canonical: p.canonical })),
  noindex_pages: pages.filter((p) => /noindex/.test(p.robots)).map((p) => p.path),
  h1_problems: pages.filter((p) => p.h1Count !== 1).map((p) => ({ path: p.path, h1: p.h1Count })),
  thin_pages: pages.filter((p) => p.words < 120).map((p) => ({ path: p.path, words: p.words })),
  no_internal_links: pages.filter((p) => p.internalLinks < 3).map((p) => ({ path: p.path, links: p.internalLinks })),
  no_structured_data: pages.filter((p) => p.ldTypes.length === 0).map((p) => p.path),
  invalid_structured_data: pages.filter((p) => p.ldTypes.includes("INVALID_JSON")).map((p) => p.path),
  structured_data_coverage: pages.reduce((acc, p) => {
    for (const t of p.ldTypes) acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {}),
};

const outIdx = process.argv.indexOf("--json");
const outFile = outIdx > -1 ? process.argv[outIdx + 1] : "dist/_seo-audit.json";
writeFileSync(outFile, JSON.stringify({ report, pages }, null, 1));

const line = (label, n) => console.log(`${label.padEnd(26)} ${n}`);
console.log(`pages analysed: ${pages.length}`);
line("duplicate titles", report.duplicate_titles.length);
line("duplicate descriptions", report.duplicate_descriptions.length);
line("missing title", report.missing_title.length);
line("missing description", report.missing_description.length);
line("titles > 62 chars", report.long_titles.length);
line("descriptions > 165", report.long_descriptions.length);
line("descriptions < 70", report.short_descriptions.length);
line("canonical not self", report.canonical_not_self.length);
line("noindex", report.noindex_pages.length);
line("H1 count != 1", report.h1_problems.length);
line("thin (<120 words)", report.thin_pages.length);
line("< 3 internal links", report.no_internal_links.length);
line("no structured data", report.no_structured_data.length);
console.log("structured data:", JSON.stringify(report.structured_data_coverage));
console.log(`written: ${outFile}`);
