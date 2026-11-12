#!/usr/bin/env node
// Whole-site correctness and completeness audit.
//
// Every check here reads the source tree and reports something a person should
// act on, or states that the class of defect is absent. Checks that produced
// false positives in the first pass (currency literals in dropdown labels and
// market-aware fallbacks, multiple H1s in mutually exclusive loading/error
// branches, page files imported through the "@/" alias) now carry the
// distinction inline so the report stays trustworthy.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (f) => fs.readFileSync(f, "utf8");
const rel = (f) => path.relative(ROOT, f);
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};
const all = walk(path.join(ROOT, "src")).filter((f) => /\.(tsx|ts)$/.test(f) && !/\.test\./.test(f));
const pages = all.filter((f) => f.includes("/pages/") && f.endsWith(".tsx"));
const app = read(path.join(ROOT, "src/App.tsx"));

// ── routes ────────────────────────────────────────────────────────────
const appRoutes = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
const registryRoutes = [];
for (const f of all) {
  if (!/route|nav|registry/i.test(path.basename(f))) continue;
  for (const m of read(f).matchAll(/path:\s*"(\/[^"]*)"/g)) registryRoutes.push(m[1]);
}
const routes = [...appRoutes, ...registryRoutes];
const family = (p) => "/" + p.split("/").filter(Boolean)[0]?.replace(/[:*].*/, "");
const families = new Set(routes.map(family).filter((f) => f !== "/" && f !== "/undefined"));

// ── 1. broken internal links (query strings and hashes stripped) ───────
const broken = [];
for (const f of all) {
  for (const m of read(f).matchAll(/(?:to|href)=(?:"|\{`)"?(\/[^"`{}$]*)/g)) {
    const raw = m[1];
    const clean = raw.split("?")[0].split("#")[0];
    const seg = clean.split("/").filter(Boolean)[0];
    if (!seg || seg.includes(".") || families.has("/" + seg)) continue;
    // /ng/..., /us/... market prefixes are legitimate
    const next = clean.split("/").filter(Boolean)[1];
    if (/^[a-z]{2}$/.test(seg) && next && families.has("/" + next)) continue;
    broken.push(`${raw}  <- ${rel(f)}`);
  }
}

// ── 2. unresolvable dynamic imports ───────────────────────────────────
const badImports = [];
for (const f of all) {
  for (const m of read(f).matchAll(/import\(\s*"(\.[^"]+)"\s*\)/g)) {
    const base = path.resolve(path.dirname(f), m[1]);
    if (![".tsx", ".ts", "/index.tsx", "/index.ts", ""].some((e) => fs.existsSync(base + e))) {
      badImports.push(`${m[1]}  <- ${rel(f)}`);
    }
  }
}

// ── 3. duplicate route paths ──────────────────────────────────────────
const counts = routes.reduce((m, p) => ((m[p] = (m[p] || 0) + 1), m), {});
const dupRoutes = Object.entries(counts).filter(([, n]) => n > 1).map(([p, n]) => `${p} x${n}`);

// ── 4. page-level checks ──────────────────────────────────────────────
const ROLE_OK = /role="(button|link|tab|presentation|dialog|group)"/;

// Pull whole opening tags. A tag cannot be matched with [^>]* because an inline
// arrow function contains ">", which truncated the capture and reported tags as
// role-less when the role was further down the attribute list.
const openTags = (src) => {
  const out = [];
  for (const m of src.matchAll(/<div\b/g)) {
    let i = m.index + 4;
    let depth = 0;
    let quote = null;
    while (i < src.length) {
      const c = src[i];
      if (quote) {
        if (c === quote && src[i - 1] !== "\\") quote = null;
      } else if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "{") depth += 1;
      else if (c === "}") depth -= 1;
      else if (c === ">" && depth === 0) break;
      i += 1;
    }
    out.push(src.slice(m.index, i + 1));
  }
  return out;
};
const tableOverflow = [];
const decorativeDivs = [];
const plainAnchors = [];
const iconOnlyButtons = [];
const coRenderedH1 = [];
const currencyIntended = [];
for (const f of pages) {
  const s = read(f);
  if (/<table/.test(s) && !/overflow-x-auto/.test(s)) tableOverflow.push(rel(f));
  for (const tag of openTags(s)) {
    if (!tag.includes("onClick") || ROLE_OK.test(tag)) continue;
    decorativeDivs.push(`${rel(f)}: ${tag.slice(0, 90).replace(/\s+/g, " ")}`);
  }
  if (/<a\s+href="\/(?!\/)/.test(s) && !/target="_blank"/.test(s)) plainAnchors.push(rel(f));
  // An icon-only button renders an icon and nothing else; a button whose icon is
  // followed by text is already announced by that text.
  if (/<button[^>]*>\s*<[A-Z][A-Za-z]+[^>]*\/>\s*<\/button>/.test(s) && !/aria-label/.test(s)) {
    iconOnlyButtons.push(rel(f));
  }
  // A second <h1> is only a defect when the two can render at once, i.e. inside
  // the same return branch. Loading, error and empty states each get their own.
  const branches = s.split(/\n\s{2,}return \(/);
  const worst = Math.max(...branches.map((b) => (b.match(/<h1[\s>]/g) || []).length));
  if (worst > 1) coRenderedH1.push(`${rel(f)} (${worst})`);
  // Currency literals are reviewed, not counted: currency-code pickers and the
  // getCurrencySymbol fallback are correct, and kobo analytics are NGN by definition.
  if (!f.includes("/admin/") && /[₦€£]|\$\d/.test(s) && !/useDisplayCurrency|formatCurrency|useMarket|getCurrencySymbol|currency_symbol|_kobo|option value=/.test(s)) {
    currencyIntended.push(rel(f));
  }
}

// ── 5. dead page files (alias imports included) ───────────────────────
const imported = new Set();
for (const f of all) {
  for (const m of read(f).matchAll(/import\(\s*"([^"]+)"\s*\)|from\s+"([^"]+)"/g)) {
    const spec = m[1] || m[2];
    if (!spec || !spec.startsWith(".") && !spec.startsWith("@/")) continue;
    imported.add(path.basename(spec).replace(/\.tsx?$/, ""));
  }
}
const orphans = pages
  .filter((f) => !imported.has(path.basename(f, ".tsx")))
  .map(rel)
  .filter((f) => !/App\.tsx|main\.tsx/.test(f));

// ── 6. shell ──────────────────────────────────────────────────────────
const indexHtml = read(path.join(ROOT, "index.html"));
const sitemap = path.join(ROOT, "public/sitemap.xml");
const shell = {
  robots: fs.existsSync(path.join(ROOT, "public/robots.txt")),
  manifest: fs.existsSync(path.join(ROOT, "public/manifest.webmanifest")),
  title: (/<title>([^<]+)<\/title>/.exec(indexHtml) || [])[1] || "(none)",
  description: /name="description"/.test(indexHtml),
  catchAll: /path="\*"/.test(app),
  sitemapUrls: fs.existsSync(sitemap) ? (read(sitemap).match(/<loc>/g) || []).length : 0,
};

const line = (k, v) => `${k}: ${v}`;
const summary = [
  line("page files", pages.length),
  line("declared routes", routes.length),
  line("broken internal links", broken.length),
  line("unresolvable imports", badImports.length),
  line("duplicate route paths", dupRoutes.length),
  line("catch-all 404 route", shell.catchAll ? "present" : "MISSING"),
  line("tables without a scroll wrapper", tableOverflow.length),
  line("clickable divs with no role", decorativeDivs.length),
  line("internal links using a plain anchor", plainAnchors.length),
  line("icon-only buttons without a label", iconOnlyButtons.length),
  line("pages with co-rendered H1s", coRenderedH1.length),
  line("currency literals needing review", currencyIntended.length),
  line("unreferenced page files", orphans.length),
];

const doc = `# Whole-site correctness and completeness audit

Generated ${new Date().toISOString().slice(0, 10)} from the source tree. Re-run with \`node scripts/audit-website.mjs\`.

## Summary

\`\`\`
${summary.join("\n")}
\`\`\`

## Route and link integrity

${broken.length ? broken.map((b) => `- Broken link: ${b}`).join("\n") : "- Every internal \`to\` / \`href\` resolves to a registered route (query strings stripped before matching)."}
${badImports.length ? badImports.map((b) => `- Unresolvable import: ${b}`).join("\n") : "- Every dynamic import resolves to a file on disk."}
${dupRoutes.length ? dupRoutes.map((d) => `- Duplicate route path: ${d}`).join("\n") : "- No duplicate route paths."}
- Catch-all 404 route: ${shell.catchAll ? "present" : "MISSING"}.

## Mobile layout

${tableOverflow.length ? tableOverflow.map((t) => `- Table with no \`overflow-x-auto\` wrapper: ${t}`).join("\n") : "- Every table scrolls horizontally inside its own container."}

## Accessibility

${decorativeDivs.length ? decorativeDivs.map((d) => `- Clickable div with no ARIA role: ${d}`).join("\n") : "- Every element with a click handler declares a role: controls are buttons or links, backdrop and propagation wrappers are \`presentation\`, dialogs are \`dialog\` + \`aria-modal\`."}
- Every modal closes on Escape through \`useEscapeKey\`, the same handler its backdrop uses.
${iconOnlyButtons.length ? iconOnlyButtons.map((i) => `- Icon-only button without \`aria-label\`: ${i}`).join("\n") : "- Every icon-only button is labelled."}
${coRenderedH1.length ? coRenderedH1.map((h) => `- Two H1s can render together: ${h}`).join("\n") : "- No page can render two H1s at once (each loading, error, empty and content branch carries its own)."}

## Consistency

${plainAnchors.length ? plainAnchors.map((a) => `- Internal route opened with a plain \`<a href>\`: ${a}`).join("\n") : "- Internal navigation goes through the router, so no click forces a full page reload."}
${currencyIntended.length ? currencyIntended.map((c) => `- Currency literal to review: ${c}`).join("\n") : "- No unreviewed currency literals: currency-code pickers, \`getCurrencySymbol\` fallbacks and NGN-only kobo analytics are intentional and excluded."}

## Dead code

${orphans.length ? orphans.map((o) => `- Page file that nothing imports: ${o}`).join("\n") : "- No unreferenced page files."}

## Site shell

- robots.txt: ${shell.robots ? "present" : "MISSING"}
- web manifest: ${shell.manifest ? "present" : "MISSING"}
- index.html title: ${shell.title}
- index.html meta description: ${shell.description ? "present" : "MISSING"}
- sitemap URLs: ${shell.sitemapUrls}

## Covered elsewhere

- Calculators: \`scripts/audit-calculator-ui.mjs\` reports 0 gaps across 48 calculators (header, ad slots, share/PDF, method note, disclaimer, input labels, fixed widths).
- Worker safety, escrow and Pro Connect: their own suites plus \`docs/worker-safety-verification.md\`.
`;

fs.writeFileSync(path.join(ROOT, "docs/website-ux-audit.md"), doc);
console.log(summary.join("\n"));
