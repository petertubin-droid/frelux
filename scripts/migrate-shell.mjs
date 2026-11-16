#!/usr/bin/env node
/**
 * Move one calculator page onto the shared tool shell.
 *
 * The shell reads the page's heading, lede, eyebrow, search title and search
 * description from the catalogue, so moving a page means taking that copy out of
 * the page and putting it where every other page's copy already lives. This
 * script does the mechanical part and refuses anything it does not fully
 * understand: an unexpected header prop, search copy built from expressions, a
 * canonical that disagrees with the route, or a second `to:` entry. A refused
 * page is reported and left untouched.
 *
 *   node scripts/migrate-shell.mjs --dry src/pages/Thing.tsx:/route
 *   node scripts/migrate-shell.mjs src/pages/Thing.tsx:/route
 */
import fs from "node:fs";
import path from "node:path";

const CATALOGUE = "src/config/construction-tools.ts";
const ALLOWED_HEADER_PROPS = new Set(["breadcrumbs", "title", "subtitle", "eyebrow", "variant"]);
const ALLOWED_SEO_KEYS = new Set([
  "title",
  "description",
  "canonicalPath",
  "ogType",
  "keywords",
  "structuredData",
  "structuredDataArray",
]);

/** Types the shell already declares for every tool, or the components it renders. */
const SHELL_OWNED_TYPES = new Set([
  "WebApplication",
  "SoftwareApplication",
  "BreadcrumbList",
  "FAQPage",
]);

const fail = (why) => {
  throw new Error(why);
};

/** Index just past the closing `/>` of the element starting at `start`. */
function endOfSelfClosing(src, start, tag) {
  const close = src.indexOf(`</${tag}>`, start);
  const selfClose = src.indexOf("/>", start);
  if (selfClose < 0) fail(`no /> after <${tag}>`);
  if (close >= 0 && close < selfClose) fail(`<${tag}> has children, not handled`);
  return selfClose + 2;
}

/** Read the balanced braces that start at `open` (a `{`). */
function balanced(src, open, opener = "{", closer = "}") {
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === opener) depth += 1;
    else if (src[i] === closer) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  fail(`unbalanced ${opener}`);
}

/** A JSX prop whose value is a plain string, either "quoted" or {t("quoted")}. */
function readStringProp(block, name) {
  const quoted = new RegExp(`\\b${name}="([^"]*)"`);
  const direct = block.match(quoted);
  if (direct) return direct[1];
  const wrapped = block.match(new RegExp(`\\b${name}=\\{\\s*t\\(\\s*(?:"([^"]*)"|'([^']*)')\\s*\\)\\s*\\}`));
  if (wrapped) return wrapped[1] ?? wrapped[2];
  const bare = block.match(new RegExp(`\\b${name}=\\{\\s*(?:"([^"]*)"|'([^']*)')\\s*\\}`));
  if (bare) return bare[1] ?? bare[2];
  return null;
}

function headerProps(block) {
  const names = [...block.matchAll(/(?:^|\s)(\w+)=/g)].map((m) => m[1]);
  const unexpected = names.filter((n) => !ALLOWED_HEADER_PROPS.has(n));
  if (unexpected.length > 0) fail(`unexpected header props: ${unexpected.join(", ")}`);
}

/** A string literal used as an object value, single line only. */
function readLiteral(body, key) {
  const one = body.match(new RegExp(`\\b${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  if (one) return JSON.parse(`"${one[1]}"`);
  const single = body.match(new RegExp(`\\b${key}:\\s*'([^']*)'`));
  if (single) return single[1];
  return null;
}

function seoExtras(body) {
  // Colons inside the copy itself ("Estimator: quantities") are not keys.
  const scrubbed = body.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'[^']*'/g, "''");
  return [...scrubbed.matchAll(/(?:^|[\s,])(\w+):/g)]
    .map((m) => m[1])
    .filter((k) => !ALLOWED_SEO_KEYS.has(k));
}

function transform(file, route) {
  let src = fs.readFileSync(file, "utf8");
  if (src.includes("@/components/tools/ToolShell")) return { skip: "already on the shell" };
  // A page that quotes nothing keeps its silence: the shell would otherwise add
  // an estimate disclaimer the page never made.
  const quotesNothing = !/<EstimateDisclaimer/.test(src);

  // 1. The header.
  const headerStart = src.indexOf("<PageHeader");
  if (headerStart < 0) fail("no PageHeader");
  const headerEnd = endOfSelfClosing(src, headerStart, "PageHeader");
  const header = src.slice(headerStart, headerEnd);
  headerProps(header);
  const title = readStringProp(header, "title");
  const subtitle = readStringProp(header, "subtitle");
  const eyebrow = readStringProp(header, "eyebrow");
  if (!title) fail("header title is not a plain string");

  // 2. Search copy and breadcrumb marking.
  const seoStart = src.search(/\n\s*useSeo\(\{/);
  if (seoStart < 0) fail("no useSeo call");
  const seoOpen = src.indexOf("{", src.indexOf("useSeo(", seoStart));
  const seoClose = balanced(src, seoOpen);
  const seoBody = src.slice(seoOpen + 1, seoClose);
  // The shape of the markup is checked above; its internal keys are not page
  // copy, so they leave the body before the key scan.
  let copyBody = seoBody;
  for (const key of ["structuredDataArray", "structuredData"]) {
    let from = copyBody.indexOf(`${key}:`);
    while (from >= 0) {
      const valueAt = copyBody.indexOf("{", from) >= 0 && copyBody.indexOf("[", from) >= 0
        ? Math.min(copyBody.indexOf("{", from), copyBody.indexOf("[", from))
        : Math.max(copyBody.indexOf("{", from), copyBody.indexOf("[", from));
      const open = copyBody[valueAt];
      const end = balanced(copyBody, valueAt, open, open === "{" ? "}" : "]") + 1;
      const afterComma = /^\s*,/.test(copyBody.slice(end)) ? end + copyBody.slice(end).indexOf(",") + 1 : end;
      copyBody = copyBody.slice(0, from) + copyBody.slice(afterComma);
      from = copyBody.indexOf(`${key}:`);
    }
  }
  const extras = seoExtras(copyBody);
  if (extras.length > 0) fail(`search copy carries ${extras.join(", ")}`);
  // Inline markup is dropped only when the shell already says the same thing:
  // a calculator declaration, the trail, or the question set. Anything else is
  // the page's own claim and moving it here would lose it.
  // Only a block's own type is a claim; a Question inside an FAQPage is part of
  // that question set, not a separate thing the page says it is.
  const blockTypes = [...seoBody.matchAll(/"@type":\s*"([^"]+)"/g)].map((m) => m[1]);
  const topLevel = [];
  {
    let depth = 0;
    for (let i = 0; i < seoBody.length; i += 1) {
      const ch = seoBody[i];
      if (ch === "{" || ch === "[") depth += 1;
      else if (ch === "}" || ch === "]") depth -= 1;
      else if (ch === '"' && depth === 1) {
        const type = /^"@type":\s*"([^"]+)"/.exec(seoBody.slice(i));
        if (type && !topLevel.includes(type[1])) topLevel.push(type[1]);
        const close = seoBody.indexOf('"', i + 1);
        i = close;
      }
    }
  }
  const unowned = topLevel.filter((t) => !SHELL_OWNED_TYPES.has(t));
  if (unowned.length > 0) fail(`search copy declares ${unowned.join(", ")}`);
  const seoTitle = readLiteral(seoBody, "title");
  const seoDescription = readLiteral(seoBody, "description");
  if (!seoTitle || !seoDescription) fail("search copy is not a set of plain strings");
  const canonical = seoBody.match(/\bcanonicalPath:\s*"([^"]*)"/);
  if (canonical && canonical[1] !== route) fail(`canonical ${canonical[1]} is not the route`);
  const seoEnd = src.indexOf(");", seoClose) + 2;

  const crumbStart = src.search(/\n\s*useBreadcrumbJsonLd\(\[/);
  let crumbEnd = crumbStart;
  if (crumbStart >= 0) {
    const open = src.indexOf("[", crumbStart);
    crumbEnd = src.indexOf(");", balanced(src, open, "[", "]")) + 2;
  }

  // Remove the search call and the breadcrumb call, last first.
  if (crumbStart >= 0) src = src.slice(0, crumbStart) + src.slice(crumbEnd);
  const seoStartAfter = src.search(/\n\s*useSeo\(\{/);
  const seoOpenAfter = src.indexOf("{", src.indexOf("useSeo(", seoStartAfter));
  const seoEndAfter = src.indexOf(");", balanced(src, seoOpenAfter)) + 2;
  src = src.slice(0, seoStartAfter) + src.slice(seoEndAfter);

  // 3. The header itself.
  const headerStart2 = src.indexOf("<PageHeader");
  const headerEnd2 = endOfSelfClosing(src, headerStart2, "PageHeader");
  src = src.slice(0, headerStart2) + src.slice(headerEnd2);

  // 4. Tail chrome: the disclaimer line, and the row it sat under.
  src = src.replace(/\n\s*<EstimateDisclaimer\s*\/>/g, "");
  for (;;) {
    const row = src.indexOf('<div className="mt-10">');
    if (row < 0) break;
    const end = balanced(src, src.indexOf("{", row), "{", "}") + 1;
    // The brace pair closes the JSX expression, not the div: find `</div>` after it.
    const closeTag = src.indexOf("</div>", end) + "</div>".length;
    src = src.slice(0, row) + src.slice(closeTag);
  }
  // Pages that carried no related row keep their questions in a bare wrapper,
  // and a few keep a related row with no questions above it.
  src = src.replace(/\n\s*<div className="mt-8">\s*\n\s*<ToolFaqs[^>]*\/>\s*\n\s*<\/div>/g, "");
  src = src.replace(/\n\s*<ToolFaqs[^>]*\/>/g, "");
  src = src.replace(/\n\s*<RelatedTools[\s\S]*?\/>/g, "");
  if (/<ToolFaqs|<RelatedTools/.test(src)) fail("chrome remains after the row was removed");

  // 5. Wrap the page component's own return.
  // The shell belongs to the page, not to the first helper above it: a page may
  // declare small components before or after its default export, and wrapping a
  // helper's return puts a second shell inside the page.
  const namedExport = src.match(/^export default function (\w+)\s*\(/m);
  const renamedExport = src.match(/^const (\w+) = [\s\S]*?^export default \1;$/m);
  const pageName = namedExport ? namedExport[1] : renamedExport ? renamedExport[1] : null;
  if (!pageName) fail("no default exported page component");
  const declAt = src.search(new RegExp(`function ${pageName}\\s*\\(`));
  if (declAt < 0) fail(`page component ${pageName} not found`);
  const declEnd = src.indexOf("\n}\n", declAt);
  if (declEnd < 0) fail(`page component ${pageName} is not closed at top level`);
  const pageBody = src.slice(declAt, declEnd);
  const returnMatch = pageBody.match(/\n  return \(\n/);
  if (!returnMatch) fail("page component has no JSX return");
  const retStart = declAt + returnMatch.index + "\n  return (\n".length;
  const retEnd = src.indexOf("\n  );", retStart);
  if (retEnd < 0 || retEnd > declEnd) fail("page return does not close inside the component");
  src =
    src.slice(0, retStart) +
    `<ToolShell route="${route}"${quotesNothing ? " hideDisclaimer" : ""}>\n` +
    src.slice(retStart, retEnd) +
    `</ToolShell>\n` +
    src.slice(retEnd);

  // 6. Imports that are now unused. A name is dropped only when it no longer
  // appears in the file, and an import left empty goes with it.
  src = tidy(src);

  // Referencing the shell is the point of the migration, so the import is
  // written last and unconditionally.
  if (!src.includes('from "@/components/tools/ToolShell"')) {
    const lines = src.split("\n");
    const last = lines.reduce((acc, l, i) => (/^import .*;$/.test(l) ? i : acc), -1);
    if (last < 0) fail("no import block");
    lines.splice(last + 1, 0, 'import ToolShell from "@/components/tools/ToolShell";');
    src = lines.join("\n");
  }

  const entry = {
    heading: title,
    lede: subtitle,
    eyebrow,
    seoTitle,
    seoDescription,
  };
  if (entry.heading === undefined) fail("no heading");
  return { src, entry, quotesNothing };
}

function catalogueWith(entry, route) {
  const file = path.resolve(CATALOGUE);
  let src = fs.readFileSync(file, "utf8");
  const anchor = `    to: "${route}",`;
  const hits = src.split(anchor).length - 1;
  if (hits !== 1) fail(`${route} appears ${hits} times in the catalogue`);

  // Take the entry apart, drop the copy fields it already had, and write the
  // page's live copy in their place. A second set of keys would not compile, and
  // the copy the page was serving is the copy search engines have indexed.
  const at = src.indexOf(anchor);
  const start = src.lastIndexOf("\n  {\n", at) + 1;
  const end = src.indexOf("\n  },\n", at) + "\n  },\n".length;
  let entrySrc = src.slice(start, end);
  entrySrc = entrySrc.replace(/^\s*(heading|lede|eyebrow|seoTitle):.*\n/gm, "");
  entrySrc = entrySrc.replace(/^\s*seoDescription:\s*\n?\s*"[\s\S]*?",\n/gm, "");
  const line = (k, v) => (v ? `    ${k}: ${JSON.stringify(v)},\n` : "");
  const block =
    line("heading", entry.heading) +
    line("lede", entry.lede) +
    line("eyebrow", entry.eyebrow) +
    line("seoTitle", entry.seoTitle) +
    line("seoDescription", entry.seoDescription);
  entrySrc = entrySrc.replace(anchor, block + anchor);
  src = src.slice(0, start) + entrySrc + src.slice(end);
  return { src, file };
}


/** Names a migrated page no longer uses; the import goes with the chrome. */
const CHROME_NAMES = [
  "PageHeader",
  "ToolFaqs",
  "EstimateDisclaimer",
  "RelatedTools",
  "CALC_LINKS",
  "useSeo",
  "useBreadcrumbJsonLd",
  "MarketScopeNotice",
];

/** Put the wrapped body at the depth of the shell, and drop unused chrome imports. */
function tidy(src) {
  let out = src;
  for (const name of CHROME_NAMES) {
    const body = out.replace(/^import .*$/gm, "");
    if (new RegExp(`\\b${name}\\b`).test(body)) continue;
    // Drop the name from a named import list, or the whole default import.
    out = out.replace(new RegExp(`^(import \\{[^}]*?)\\b${name}\\b,? ?([^}]*\\} from .*)$`, "m"), (m, a, b) => {
      const inner = `${a}${b}`.replace(/\{\s*,/, "{").replace(/,\s*\}/, " }");
      return inner;
    });
    out = out.replace(new RegExp(`^import ${name} from .*\\n`, "m"), "");
  }
  return out;
}

function reindent(src) {
  const lines = src.split("\n");
  const open = lines.findIndex((l) => l.trim().startsWith("<ToolShell"));
  if (open < 0) return src;
  const close = lines.findIndex((l) => l.trim() === "</ToolShell>");
  if (close < 0) return src;
  const body = lines.slice(open + 1, close).map((l) => (l.trim() ? `  ${l}` : l.trimEnd()));
  const out = [...lines.slice(0, open + 1), ...body, "    </ToolShell>", ...lines.slice(close + 1)];
  for (let i = out.length - 1; i > 0; i -= 1) {
    if (out[i].trim() === ");") {
      out[i] = "  );";
      if (out[i + 1] && out[i + 1].trim() === "}") out[i + 1] = "}";
      break;
    }
  }
  return out.join("\n");
}

const tidyOnly = process.argv.includes("--tidy");
const apply = !process.argv.includes("--dry");
const targets = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const report = [];
let catalogueSrc = null;

for (const target of targets) {
  const [file, route] = target.split(":");
  try {
    if (tidyOnly) {
      fs.writeFileSync(file, reindent(tidy(fs.readFileSync(file, "utf8"))));
      report.push(`${file}: tidied`);
      continue;
    }
    const out = transform(file, route);
    if (out.skip) {
      report.push(`${file}: skipped (${out.skip})`);
      continue;
    }
    if (apply) {
      fs.writeFileSync(file, reindent(tidy(out.src)));
      const c = catalogueWith(out.entry, route);
      fs.writeFileSync(c.file, c.src);
      report.push(`${file}: migrated, catalogue copy added`);
    } else {
      report.push(`${file}: ${JSON.stringify(out.entry)}`);
    }
  } catch (error) {
    report.push(`${file}: REFUSED ${error.message}`);
  }
}
console.log(report.join("\n"));
