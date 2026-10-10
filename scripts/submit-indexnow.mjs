#!/usr/bin/env node
/**
 * IndexNow submission — Track 3 of the 2026-10-10 worldwide audit.
 *
 * Submits every canonical URL from the freshly built sitemap to the
 * IndexNow API (consumed by Bing, Yandex, Seznam and Naver), so
 * new/changed routes are picked up within days instead of waiting
 * for the next natural crawl. Google ignores IndexNow — Google
 * indexing still requires the Search Console sitemap submission
 * (owner action) and organic discovery.
 *
 * Usage:   node scripts/submit-indexnow.mjs [--dry-run]
 *
 * Prereq:   public/<INDEXNOW_KEY>.txt must exist (key file), which the
 *           build ships so search engines can verify ownership.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");
const SITE_URL = "https://freluxtools.netlify.app";
const SITEMAP = resolve(__dirname, "../dist/sitemap.xml");
const KEY_FILE = resolve(__dirname, "../public/indexnow-key.txt");

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

if (!existsSync(SITEMAP)) {
  fail("dist/sitemap.xml not found — run `npm run build` first.");
}
if (!existsSync(KEY_FILE)) {
  fail("public/indexnow-key.txt not found — generate a key first.");
}

const key = readFileSync(KEY_FILE, "utf8").trim();
const sitemap = readFileSync(SITEMAP, "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urls.length === 0) fail("No URLs found in sitemap.");

const payload = { host: "freluxtools.netlify.app", key, keyLocation: `${SITE_URL}/indexnow-key.txt`, urlList: urls };

console.log(`IndexNow: ${urls.length} URLs, key ${key.slice(0, 6)}…`);

if (DRY_RUN) {
  console.log("Dry run — payload ready, not submitting.");
  process.exit(0);
}

try {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  // 200 = accepted, 202 = accepted (some OK not all), 400 = bad format,
  // 403 = key verification failed, 422 = key doesn't look valid
  if (res.status === 200 || res.status === 202) {
    console.log(`✔ IndexNow accepted (${res.status}). URLs will be re-crawled soon.`);
  } else {
    console.error(`✖ IndexNow rejected: HTTP ${res.status}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`✖ IndexNow request failed: ${err.message}`);
  process.exit(1);
}
