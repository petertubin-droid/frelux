/**
 * Reads the construction tool registry straight from its TypeScript source.
 *
 * The registry (src/config/construction-tools.ts) is the only place a tool's
 * real behaviour is described: what it does, what you enter, what you get.
 * The prerenderer cannot import TypeScript, and hand-copying those strings into
 * the prerender route list is what let the static titles drift away from what
 * the page actually renders. Parsing the source keeps one source of truth.
 *
 * The shape is intentionally narrow: `slug`, `title`, `category`, `does`,
 * `enters`, `gets`, `to`, `benefit`. If the registry grows a nested object
 * inside those fields this parser must be revisited, and tool-seo.test.ts
 * fails loudly when a tool comes back with a missing field.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Resolved from the project root: the prerenderer runs as `node
// scripts/prerender.mjs` and the test runner from the same cwd, so a relative
// path is stable in both. import.meta.url is not (vitest hands back a
// vite-style URL rather than a file URL).
const SRC = ["src/config/construction-tools.ts", "construction-tools.ts"].map(
  (p) => join(process.cwd(), p),
).find(existsSync);

// Values may sit on the next line (prettier wraps long seoTitle strings), so
// the pattern allows whitespace — including newlines — before the quote.
const field = (block, name) => {
  const quoted = block.match(
    new RegExp(`\\n\\s*${name}:\\s*"((?:[^"\\\\]|\\\\.)*)"`),
  );
  if (quoted) return quoted[1].replace(/\\"/g, '"');
  const bare = block.match(new RegExp(`\\n\\s*${name}:\\s*(true|false)`));
  return bare ? bare[1] === "true" : undefined;
};

export function loadToolRegistry() {
  if (!SRC) throw new Error("construction-tools.ts not found from cwd");
  const src = readFileSync(SRC, "utf-8");
  const start = src.indexOf("export const CONSTRUCTION_TOOLS");
  const body = src.slice(start);
  // Split on the start of each entry rather than on "},\n{": entries are
  // separated by comments in places, and splitting on the brace pattern merged
  // those entries and silently dropped their fields.
  const starts = [...body.matchAll(/\n\s{4}slug: "/g)].map((m) => m.index);
  const blocks = starts.map((start, i) =>
    body.slice(start, i + 1 < starts.length ? starts[i + 1] : body.length),
  );
  const tools = [];
  for (const raw of blocks) {
    const slug = field(raw, "slug");
    if (!slug) continue;
    const to = field(raw, "to");
    tools.push({
      slug,
      title: field(raw, "title") ?? "",
      category: field(raw, "category") ?? "",
      does: field(raw, "does") ?? "",
      enters: field(raw, "enters") ?? "",
      gets: field(raw, "gets") ?? "",
      benefit: field(raw, "benefit") ?? "",
      seoTitle: field(raw, "seoTitle"),
      seoDescription: field(raw, "seoDescription"),
      path: to ? to.replace(/\/+$/, "") : `/${slug}`,
    });
  }
  return tools;
}
