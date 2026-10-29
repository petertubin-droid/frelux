#!/usr/bin/env node
/**
 * Translation coverage report.
 *
 * Language work is only trustworthy if it is measured. This reads the
 * dictionary in src/lib/i18n.tsx and reports, per locale, how much of the
 * navigation and footer catalog is actually translated. A locale at 100%
 * is safe to render everywhere and eligible for indexing; anything below
 * that keeps falling back to English and stays out of the sitemap.
 *
 * Usage: npm run i18n:coverage
 */
import { readFileSync } from "node:fs";

const SOURCE = "src/lib/i18n.tsx";
const source = readFileSync(SOURCE, "utf8");

const LANGS = ["en", "es", "fr", "de", "pt", "ru", "id", "sw", "ar", "hi", "zh", "ja", "nl"];

function blockFor(lang) {
  const start = source.indexOf(`\n  ${lang}: {`);
  if (start === -1) return "";
  return source.slice(start, source.indexOf("\n  },", start));
}

const keysOf = (block) =>
  new Set(
    [...block.matchAll(/\n\s{4}(?:"([^"]+)"|([A-Za-z_$][\w$]*))\s*:/g)].map(
      (m) => m[1] || m[2],
    ),
  );

const catalogSource = readFileSync("src/lib/i18n-coverage.ts", "utf8");
const catalogBlock = catalogSource.slice(
  catalogSource.indexOf("CORE_CATALOG"),
  catalogSource.indexOf("] as const;"),
);
const CATALOG = [...catalogBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

const rows = LANGS.map((lang) => {
  if (lang === "en") return { lang, done: CATALOG.length, percent: 100 };
  const keys = keysOf(blockFor(lang));
  const done = CATALOG.filter((k) => keys.has(k)).length;
  return { lang, done, percent: Math.floor((done / CATALOG.length) * 100) };
}).sort((a, b) => b.percent - a.percent);

console.log(`\nChrome catalog: ${CATALOG.length} strings\n`);
for (const row of rows) {
  const bar = "█".repeat(Math.round(row.percent / 5)).padEnd(20, "·");
  const mark = row.percent === 100 ? "indexable" : "UI only, English fallback";
  console.log(
    `  ${row.lang}  ${bar} ${String(row.percent).padStart(3)}%  ${row.done}/${CATALOG.length}  ${mark}`,
  );
}

const complete = rows.filter((r) => r.percent === 100).length;
console.log(`\n${complete}/${LANGS.length} locales complete.\n`);
