// =========================================================
// Thin-content check
//
// "No thin content anywhere" is only true if something keeps checking.
// This walks the prerendered HTML and reports two failures:
//
//   * an indexable content page with too little text to stand on its own
//   * a set of indexable pages so alike that only the country name differs
//
// It reads dist/_prerender-manifest.json for the noindex set, so a page the
// prerenderer deliberately withheld is not counted as thin content: it is
// already out of the index.
//
// Usage:
//   node scripts/audit-thin-content.mjs            report only
//   node scripts/audit-thin-content.mjs --strict   exit 1 on any finding
// =========================================================

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "dist";
const MIN_WORDS = 300;
const SIMILARITY_LIMIT = 0.7;
const SHINGLE = 6;

// Only these families claim to be content. App routes render their body in the
// browser, so a short static shell there means nothing.
const CONTENT_FAMILIES = [
  "/market/",
  "/templates/",
  "/calculators/",
  "/learn/",
  "/cost/",
  "/prices/",
  "/glossary/",
  "/article/",
  "/blog/",
];

// Files that exist for verification, not for readers.
const IGNORED_PATHS = [/^\/google[0-9a-f]+\.html$/];

const strict = process.argv.includes("--strict");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (entry.endsWith(".html")) out.push(full);
  }
  return out;
}

function visibleText(html) {
  return html
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shingles(text) {
  const words = text.toLowerCase().split(" ");
  const set = new Set();
  for (let i = 0; i + SHINGLE <= words.length; i += 1) {
    set.add(words.slice(i, i + SHINGLE).join(" "));
  }
  return set;
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const item of a) if (b.has(item)) shared += 1;
  return shared / (a.size + b.size - shared);
}

const manifest = (() => {
  try {
    return JSON.parse(readFileSync(join(ROOT, "_prerender-manifest.json"), "utf8"));
  } catch {
    return { paths: [], noindex: [] };
  }
})();
const noindex = new Set(manifest.noindex ?? []);

const pages = walk(ROOT)
  .map((file) => {
    const route =
      "/" + relative(ROOT, file).replace(/index\.html$/, "").replace(/\.html$/, "");
    const clean = route.replace(/\/$/, "") || "/";
    if (IGNORED_PATHS.some((re) => re.test(clean))) return null;
    const html = readFileSync(file, "utf8");
    const text = visibleText(html);
    return {
      route: clean,
      words: text.split(" ").filter(Boolean).length,
      text,
      noindex: noindex.has(clean) || /name="robots"[^>]*noindex/i.test(html),
    };
  })
  .filter(Boolean);

const inFamily = (route) =>
  CONTENT_FAMILIES.some((prefix) => route.startsWith(prefix));

const thin = pages.filter(
  (page) => !page.noindex && inFamily(page.route) && page.words < MIN_WORDS,
);

// Group page families so a duplicate check compares like with like: the same
// template across markets, not a calculator against an article.
function family(route) {
  const parts = route.split("/").filter(Boolean);
  if (parts[0] === "market" && parts[2] === "templates") {
    return parts[3] ? `market-templates:${parts[3]}` : "market-templates:hub";
  }
  if (parts[0] === "templates" && parts[1]) return `templates:${parts[1]}`;
  return parts.slice(0, 2).join("/");
}

const groups = new Map();
for (const page of pages) {
  if (page.noindex || !inFamily(page.route)) continue;
  const key = family(page.route);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(page);
}

const duplicates = [];
for (const [key, members] of groups) {
  if (members.length < 2) continue;
  const withShingles = members.map((m) => ({ ...m, set: shingles(m.text) }));
  // Compare each page to the group's first as a cheap representative; a family
  // whose pages are near-identical to their sibling is the pattern we care
  // about.
  const [first, ...rest] = withShingles;
  const similar = rest.filter((m) => jaccard(first.set, m.set) > SIMILARITY_LIMIT);
  if (similar.length >= 1 && similar.length === rest.length) {
    duplicates.push({ key, count: members.length, sample: first.route });
  }
}

const pageCount = pages.length;
const indexable = pages.filter((p) => !p.noindex).length;

console.log(`[content] ${pageCount} pages, ${indexable} indexable`);
console.log(`[content] ${thin.length} indexable content pages under ${MIN_WORDS} words`);
for (const page of thin.slice(0, 20)) {
  console.log(`  ${String(page.words).padStart(4)} words  ${page.route}`);
}
console.log(`[content] ${duplicates.length} near-duplicate families`);
for (const dup of duplicates.slice(0, 20)) {
  console.log(`  ${String(dup.count).padStart(4)} pages  ${dup.key} (e.g. ${dup.sample})`);
}

if (strict && (thin.length > 0 || duplicates.length > 0)) {
  console.error(
    `[content] FAIL: ${thin.length} thin pages, ${duplicates.length} near-duplicate families`,
  );
  process.exit(1);
}
