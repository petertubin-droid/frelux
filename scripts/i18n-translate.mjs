#!/usr/bin/env node
/**
 * FRELUX translation engine.
 *
 * The site ships 13 languages. The critical interface strings (navigation,
 * footer, calculators, legal) are authored by hand in src/lib/i18n.tsx and
 * are never touched here. This script fills in the long tail: every string
 * the app already routes through t("...").
 *
 * Design rules:
 *  - Idempotent: a string already present in a locale file is skipped, so the
 *    script can be stopped and restarted, and hand-written entries always win.
 *  - Cached in /tmp so repeated runs cost nothing.
 *  - Placeholders ({count}, {{name}}, %s) and brand terms (FRELUX, ARCHIE,
 *    Paystack, Flutterwave) are protected and restored verbatim.
 *  - Em dashes are stripped from output (owner rule: no em dashes in the UI).
 *  - Code-shaped strings are never sent to a translator.
 *
 * Usage:
 *   node scripts/i18n-translate.mjs --lang=es
 *   node scripts/i18n-translate.mjs --lang=es,fr --limit=200
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const OUT_DIR = "src/lib/i18n/locales";

const CORE_PATH = "src/lib/i18n-coverage.ts";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

const LANGS = (args.lang || "es")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const LIMIT = Number(args.limit || 100000);
const CONCURRENCY = Number(args.concurrency || 3);

// Terms that must survive translation untouched.
const BRANDS = [
  "FRELUX", "ARCHIE", "Paystack", "Flutterwave", "Base44", "WhatsApp",
  "Google", "Excel", "Supabase", "Netlify", "Stripe", "PDF", "CSV", "BOQ",
  "NGN", "USD", "EUR", "GBP", "PWA", "SEO", "API", "CSV", "JSON",
];

const CODE_PATTERNS = [
  /^[@./#][\w/.-]*$/,          // imports, paths
  /^[a-z][a-z0-9_-]*$/,         // lowercase identifiers ("mode", "ref-1")
  /^[A-Z]{2,}$/,                // SCREAMING_CASE
  /^\d+$/,                      // bare numbers
  /^[0-9a-f]{3,8}$/i,           // colours / hashes
  /^\W+$/,                      // punctuation only
  /^(https?:|www\.)/,           // URLs
  /^[a-z]+([A-Z][a-z]+)+$/,     // camelCase identifiers
];

const looksLikeCode = (s) => {
  const t = s.trim();
  if (t.length === 0) return true;
  if (CODE_PATTERNS.some((re) => re.test(t))) return true;
  // Escapes, template fragments and JSX leftovers are never UI copy.
  if (/[\\{}\[\]<>$`]/.test(t)) return true;
  // Lowercase, comma-separated identifiers ("id, name", "ref-1, mode").
  if (/^[a-z0-9_,\s-]+$/.test(t) && !/[.!?]$/.test(t)) return true;
  return false;
};

function shieldBrands(text) {
  let out = text;
  BRANDS.forEach((brand, i) => {
    out = out.split(brand).join(`\u0001${i}\u0001`);
  });
  return out;
}

function restoreBrands(text) {
  let out = text;
  BRANDS.forEach((brand, i) => {
    out = out.split(`\u0001${i}\u0001`).join(brand);
  });
  return out;
}

// One cache file per language. A shared file let concurrent runs read each
// other's half-written state and crash, which silently lost whole languages.
const cachePath = (lang) => `/tmp/i18n-cache-${lang}.json`;
const caches = new Map();

function cacheFor(lang) {
  if (!caches.has(lang)) {
    const path = cachePath(lang);
    try {
      caches.set(lang, existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {});
    } catch {
      caches.set(lang, {});
    }
  }
  return caches.get(lang);
}

function saveCache(lang) {
  const path = cachePath(lang);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(cacheFor(lang)));
  renameSync(tmp, path);   // atomic, so a reader never sees a partial file
}

function loadLocale(lang) {
  const path = join(OUT_DIR, `${lang}.json`);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function saveLocale(lang, data) {
  const sorted = Object.fromEntries(
    Object.entries(data).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(join(OUT_DIR, `${lang}.json`), `${JSON.stringify(sorted, null, 2)}\n`);
}

/** Every key the app routes through t("...") or tx("..."), most-used first. */
function inventory() {
  const raw = execSync(
    // A leading character is captured instead of using a lookbehind, because
    // the backslashes a lookbehind needs do not survive the shell quoting.
    // The capture also keeps "select(" from being read as t(".
    `grep -rhoE '(^|[^A-Za-z0-9_$.])(t|tx)\\("[^"]{1,200}"\\)' src --include=*.tsx --include=*.ts || true`,
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const counts = new Map();
  for (const line of raw.split("\n")) {
    // The match may carry one character of context from the source line.
    const open = line.indexOf('("');
    if (open === -1 || !line.endsWith('")')) continue;
    const key = line.slice(open + 2, -2).replace(/\\"/g, '"');
    if (!key.trim() || looksLikeCode(key)) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  // The curated navigation and footer catalog is a hard requirement even when
  // a label happens to be rendered through data rather than t() today.
  const coverageSource = readFileSync(CORE_PATH, "utf8");
  const catalogBlock = coverageSource.slice(
    coverageSource.indexOf("CORE_CATALOG"),
    coverageSource.indexOf("] as const;"),
  );
  for (const match of catalogBlock.matchAll(/"([^"]+)"/g)) {
    if (!counts.has(match[1])) counts.set(match[1], 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Preferred provider: Google's clients5 endpoint accepts many `q` params in one
 * request, so 20 strings cost one round trip instead of twenty. That is what
 * makes a full 13-language pass practical without tripping rate limits.
 */
async function viaClients5Batch(texts, lang) {
  const url =
    "https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en" +
    `&tl=${encodeURIComponent(lang)}` +
    texts.map((t) => `&q=${encodeURIComponent(t)}`).join("");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`clients5 http ${res.status}`);
  const data = await res.json();
  const rows = Array.isArray(data) ? data : [data];
  if (rows.length !== texts.length) throw new Error(`clients5 expected ${texts.length} got ${rows.length}`);
  return rows.map((row) => {
    if (typeof row === "string") return row;
    if (Array.isArray(row)) {
      // Some payloads nest segments: [[["translated", ...]]]
      const first = row[0];
      if (typeof first === "string") return first;
      if (Array.isArray(first)) return first.map((seg) => (Array.isArray(seg) ? seg[0] ?? "" : seg ?? "")).join("");
    }
    return "";
  });
}

/** Provider 1: Google's public gtx endpoint (best quality, throttles per IP). */
async function viaGtx(text, lang) {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en" +
    `&tl=${encodeURIComponent(lang)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FRELUX-i18n/1.0)" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`gtx http ${res.status}`);
  const json = await res.json();
  const segments = json?.[0];
  if (!Array.isArray(segments)) throw new Error("gtx payload");
  return segments.map((s) => (Array.isArray(s) ? s[0] ?? "" : "")).join("");
}

/** Provider 2: MyMemory. Lower ceiling per day, but far more tolerant. */
async function viaMyMemory(text, lang) {
  const url =
    "https://api.mymemory.translated.net/get?q=" +
    encodeURIComponent(text) +
    `&langpair=${encodeURIComponent(`en|${lang}`)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`mymemory http ${res.status}`);
  const json = await res.json();
  if (json.quotaFinished) throw new Error("mymemory quota finished");
  if (json.responseStatus !== 200) throw new Error(`mymemory ${json.responseStatus}`);
  const out = json.responseData?.translatedText;
  if (!out) throw new Error("mymemory empty");
  return out;
}

async function translateSingle(text, lang) {
  const cache = cacheFor(lang);
  if (cache[text]) return cache[text];

  const shielded = shieldBrands(text);
  let lastError;

  for (const provider of [viaGtx, viaMyMemory]) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const raw = await provider(shielded, lang);
        const out = restoreBrands(raw)
          .replace(/\s*\u2014\s*/g, " ")   // owner rule: no em dashes in the UI
          .replace(/\s{2,}/g, " ")
          .trim();
        if (!out) throw new Error("empty translation");
        cache[text] = out;
        saveCache(lang);
        return out;
      } catch (err) {
        lastError = err;
        await sleep(400 * 2 ** attempt);
      }
    }
  }
  process.stderr.write(`skip ${lang}: ${text.slice(0, 40)} (${lastError?.message})\n`);
  return null;
}

const BATCH = Number(args.batch || 18);

const clean = (raw) =>
  restoreBrands(raw)
    .replace(/\s*\u2014\s*/g, " ")   // owner rule: no em dashes in the UI
    .replace(/\s{2,}/g, " ")
    .trim();

async function run() {
  mkdirSync(OUT_DIR, { recursive: true });
  const keys = inventory().slice(0, LIMIT);
  console.log(`${keys.length} candidate strings, languages: ${LANGS.join(" ")}`);

  for (const lang of LANGS) {
    const existing = loadLocale(lang);
    const cache = cacheFor(lang);
    const todo = keys.filter((k) => !existing[k]);
    console.log(`\n${lang}: ${todo.length} to translate (${Object.keys(existing).length} present)`);
    if (todo.length === 0) continue;

    // Serve from cache first so a resumed run never re-requests.
    const missing = [];
    for (const key of todo) {
      if (cache[key]) existing[key] = cache[key];
      else missing.push(key);
    }
    if (missing.length < todo.length) {
      saveLocale(lang, existing);
      console.log(`  ${lang}: ${todo.length - missing.length} restored from cache`);
    }

    let done = 0;
    let cursor = 0;
    const batches = Math.ceil(missing.length / BATCH);

    const worker = async () => {
      while (cursor < batches) {
        const index = cursor++;
        const chunk = missing.slice(index * BATCH, (index + 1) * BATCH);
        const shielded = chunk.map(shieldBrands);
        try {
          let values;
          try {
            values = await viaClients5Batch(shielded, lang);
          } catch (err) {
            // Fall back to one-at-a-time providers for this batch.
            values = [];
            for (const text of shielded) {
              const single = await translateSingle(text, lang);
              values.push(single ?? "");
            }
            if (values.every((v) => !v)) throw err;
          }
          chunk.forEach((key, i) => {
            const value = clean(values[i] ?? "");
            if (value) {
              existing[key] = value;
              cache[key] = value;
            }
          });
          done += chunk.length;
          if (done % (BATCH * 4) === 0 || done === missing.length) {
            saveLocale(lang, existing);
            saveCache(lang);
            console.log(`  ${lang}: ${Math.min(done, missing.length)}/${missing.length}`);
          }
        } catch (err) {
          process.stderr.write(`batch ${lang} failed: ${err.message}\n`);
          await sleep(1500);
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    saveLocale(lang, existing);
    saveCache(lang);
    console.log(`  ${lang}: done, ${Object.keys(existing).length} entries`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
