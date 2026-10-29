import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

/**
 * Keeps only real interface strings in the generated dictionaries.
 *
 * The first extraction pass matched `select("*, buyer:profiles(...)")` because
 * "select(" ends in "t(", so several hundred database queries were written into
 * the locale files as if they were UI text. This rebuilds the authoritative key
 * set from actual t("...")/tx("...") call sites and drops everything else.
 */

const raw = execSync(
  `grep -rhoE '(^|[^A-Za-z0-9_$.])(t|tx)\\("[^"]{1,200}"\\)' src --include=*.tsx --include=*.ts || true`,
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);

const allowed = new Set();
for (const line of raw.split("\n")) {
  const open = line.indexOf('("');
  if (open === -1 || !line.endsWith('")')) continue;
  const key = line.slice(open + 2, -2).replace(/\\"/g, '"');
  if (key.trim()) allowed.add(key);
}

// Curated catalog and hand-approved overrides are legitimate by definition.
const coverage = readFileSync("src/lib/i18n-coverage.ts", "utf8");
const block = coverage.slice(
  coverage.indexOf("CORE_CATALOG"),
  coverage.indexOf("] as const;"),
);
for (const match of block.matchAll(/"([^"]+)"/g)) allowed.add(match[1]);

const overrides = readFileSync("src/lib/i18n/overrides.json", "utf8");
for (const match of overrides.matchAll(/"([^"]+)":/g)) allowed.add(match[1]);

console.log(`authoritative interface strings: ${allowed.size}`);

let pruned = 0;
for (const file of readdirSync("src/lib/i18n/locales")) {
  if (!file.endsWith(".json")) continue;
  const path = `src/lib/i18n/locales/${file}`;
  const dictionary = JSON.parse(readFileSync(path, "utf8"));
  const kept = {};
  for (const [key, value] of Object.entries(dictionary)) {
    if (allowed.has(key)) kept[key] = value;
    else pruned += 1;
  }
  writeFileSync(path, `${JSON.stringify(kept, null, 2)}\n`);
  console.log(`${file}: ${Object.keys(kept).length} kept`);
}
console.log(`pruned ${pruned} non-interface entries`);
