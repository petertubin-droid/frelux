#!/usr/bin/env node
/**
 * Translation coverage report.
 *
 * Two layers are measured, because the site has two:
 *  1. the curated catalog in src/lib/i18n.tsx (navigation, footer, legal) which
 *     gates indexing, and
 *  2. the generated dictionaries in src/lib/i18n/locales/*.json which carry the
 *     long tail of interface strings and fall back to English per key.
 *
 * Usage: npm run i18n:coverage
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";

const LANGS = ["en", "es", "fr", "de", "pt", "ar", "hi", "zh", "ja", "ru", "id", "sw", "nl"];

const source = readFileSync("src/lib/i18n.tsx", "utf8");
function blockFor(lang) {
  const start = source.indexOf(`\n  ${lang}: {`);
  return start === -1 ? "" : source.slice(start, source.indexOf("\n  },", start));
}
const dictionaryKeys = (block) =>
  new Set(
    [...block.matchAll(/\n\s{4}(?:"([^"]+)"|([A-Za-z_$][\w$]*))\s*:/g)].map((m) => m[1] || m[2]),
  );

const catalogSource = readFileSync("src/lib/i18n-coverage.ts", "utf8");
const catalogBlock = catalogSource.slice(
  catalogSource.indexOf("CORE_CATALOG"),
  catalogSource.indexOf("] as const;"),
);
const CORE = [...catalogBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

// The generated inventory is whatever the locale files actually cover.
const localeDir = "src/lib/i18n/locales";
const generated = {};
if (existsSync(localeDir)) {
  for (const file of readdirSync(localeDir).filter((f) => f.endsWith(".json"))) {
    generated[file.replace(".json", "")] = JSON.parse(readFileSync(`${localeDir}/${file}`, "utf8"));
  }
}
const INVENTORY = new Set(Object.values(generated).flatMap((d) => Object.keys(d)));

const bar = (pct) => "█".repeat(Math.round(pct / 5)).padEnd(20, "·");

console.log(`\nCurated catalog (gates indexing): ${CORE.length} strings`);
console.log(`Generated inventory (interface):  ${INVENTORY.size} strings\n`);
console.log("  lang   curated        generated");
console.log("  " + "-".repeat(52));

for (const lang of LANGS) {
  const isEnglish = lang === "en";
  const curatedKeys = isEnglish ? new Set(CORE) : dictionaryKeys(blockFor(lang));
  const curatedDone = CORE.filter((k) => curatedKeys.has(k)).length;
  const curatedPct = Math.floor((curatedDone / CORE.length) * 100);

  const gen = generated[lang] ?? {};
  const genKeys = Object.keys(gen);
  const nonEmpty = genKeys.filter((k) => String(gen[k] ?? "").trim().length > 0).length;
  const genPct = INVENTORY.size ? Math.floor((nonEmpty / INVENTORY.size) * 100) : 0;
  const genShown = isEnglish ? 100 : genPct;

  console.log(
    `  ${lang.padEnd(4)} ${bar(curatedPct)} ${String(curatedPct).padStart(3)}%  ` +
      `${bar(genShown)} ${String(genShown).padStart(3)}%`,
  );
}

const complete = LANGS.filter((lang) => {
  if (lang === "en") return true;
  const curatedKeys = dictionaryKeys(blockFor(lang));
  const curatedOk = CORE.every((k) => curatedKeys.has(k));
  const gen = generated[lang] ?? {};
  const genOk = [...INVENTORY].every((k) => String(gen[k] ?? "").trim().length > 0);
  return curatedOk && genOk;
});
console.log(`\n${complete.length}/${LANGS.length} locales complete in both layers.`);
if (complete.length < LANGS.length) {
  const missing = LANGS.filter((l) => !complete.includes(l));
  console.log(`Incomplete: ${missing.join(", ")}`);
}
console.log();
