#!/usr/bin/env node
/**
 * Checks every retailer registered in the price-intel pipeline.
 *
 * For each retailer we build a real search URL from its pattern, fetch it, and
 * record what actually happened: HTTP status, page size, whether a price-like
 * amount came back, and the reason when it did not. Nothing is guessed: a
 * retailer that blocks automated fetches is reported as blocked, not "ok".
 *
 *   node scripts/price-scan/check-retailers.mjs [--query "cement 50kg"] [--concurrency 6]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "data/price-scan/retailers.json"), "utf8"));

const argValue = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const query = argValue("--query", "cement 50kg");
const concurrency = Number(argValue("--concurrency", "6"));
const TIMEOUT_MS = 20000;

// Three signals, because retailers do not agree on a format: JSON-LD product
// offers, a symbol before the amount, and the European symbol-after style.
const SIGNALS = {
  jsonld: /"price"\s*:\s*"?([0-9]+(?:[.,][0-9]+)?)"?/gi,
  symbol_before: /(?:[$€£¥₦]|USD|EUR|GBP|NGN|AED|ZAR|INR|JPY|BRL|MXN|CAD|AUD|IDR|KRW|CNY|SAR|KES|GHS)\s?([0-9]+(?:[.,][0-9]+)?)/g,
  symbol_after: /([0-9]+(?:[.,][0-9]+)?)\s?(?:€|EUR|zł|kr|₦|₵|R\$)/g,
};

const check = async (retailer) => {
  const url = retailer.url_pattern.replace("%s", encodeURIComponent(query).replace(/%20/g, "+"));
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FRELUXPriceIntel/1.0; +https://freluxtools.com)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en",
      },
    });
    const body = await res.text();
    const counts = Object.fromEntries(
      Object.entries(SIGNALS).map(([name, re]) => [name, (body.match(re) || []).length]),
    );
    const signal = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const prices = counts[signal] > 0 ? body.match(SIGNALS[signal]) || [] : [];
    const blocked =
      res.status === 403 || res.status === 429 || /captcha|are you a robot|access denied|unusual traffic/i.test(body.slice(0, 4000));
    return {
      ...retailer,
      url,
      status: res.status,
      bytes: body.length,
      price_tokens: prices.length,
      signal,
      signals: counts,
      outcome: !res.ok
        ? `http_${res.status}`
        : blocked
          ? "blocked"
          : prices.length === 0
            ? "no_price_found"
            : "parsed",
      sample: prices.slice(0, 3),
      ms: Date.now() - started,
    };
  } catch (error) {
    return { ...retailer, url, status: null, bytes: 0, price_tokens: 0, outcome: "fetch_error", error: String(error).slice(0, 120), ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
};

const run = async () => {
  const results = [];
  let index = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (index < registry.length) {
      const item = registry[index++];
      results.push(await check(item));
    }
  });
  await Promise.all(workers);
  results.sort((a, b) => (a.market + a.retailer).localeCompare(b.market + b.retailer));

  const stamp = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(
    path.join(ROOT, `data/price-scan/retailer-check-${stamp}.json`),
    JSON.stringify({ checked_at: new Date().toISOString(), query, results }, null, 2),
  );

  const tally = results.reduce((acc, r) => ((acc[r.outcome] = (acc[r.outcome] || 0) + 1), acc), {});
  console.log(`query "${query}" across ${results.length} retailers:`, tally);
  for (const r of results) {
    console.log(`${r.market} ${r.retailer.padEnd(16)} ${String(r.outcome).padEnd(16)} status=${r.status ?? "-"} bytes=${String(r.bytes).padStart(7)} prices=${String(r.price_tokens).padStart(3)} ${r.ms}ms`);
  }
};

run().catch((e) => { console.error("check failed:", e.message); process.exit(1); });
