#!/usr/bin/env node
/**
 * Probe candidate supplier catalogues and report what they actually return.
 *
 * A market can only be covered by a supplier whose catalogue is fetchable and
 * priced. This script asks each candidate the two questions that matter:
 * does the storefront expose a machine readable catalogue, and does that
 * catalogue contain building materials rather than unrelated goods.
 *
 * Usage:
 *   node scripts/price-scan/probe-catalogues.mjs --market AU --in candidates.json
 *   node scripts/price-scan/probe-catalogues.mjs --urls https://a.com,https://b.com
 *
 * Output: a JSON report on stdout and, with --out, a registry file containing
 * only the sources that passed. Nothing is registered here; applying to the
 * database is the admin step.
 *
 * A candidate that fails is reported with its status, never dropped silently:
 * a 403 means the store blocks server-side fetch, a 0 means no reachable
 * endpoint, and both are different from "no building materials".
 */

import { writeFileSync } from "node:fs";

const BUILDING_NOUNS = [
  "timber",
  "lumber",
  "plywood",
  "cement",
  "sand",
  "granite",
  "tile",
  "paint",
  "steel",
  "rebar",
  "roof",
  "gypsum",
  "plaster",
  "mortar",
  "block",
  "brick",
  "insulation",
  "screed",
  "aggregate",
  "gravel",
  "hardware",
  "adhesive",
  "door",
  "window",
  "fence",
  "deck",
];

// A tool is not a material. "Paint sprayer", "tile cutter" and "hose kit" all
// contain a building noun while telling you nothing about the price of paint or
// tiles, so they are counted separately and can never make a source usable.
const TOOL_NOUNS = [
  "sprayer",
  "spray gun",
  "hose",
  "kit",
  "sander",
  "trolley",
  "charger",
  "battery",
  "blade",
  "brush",
  "roller cover",
  "gun",
  "pump",
  "compressor",
  "ladder",
  "tool belt",
  "work light",
  "cartridge",
  "nozzle",
  "tip",
];

const ENDPOINTS = [
  (base) => `${base}/products.json?limit=250`,
  (base) => `${base}/wp-json/wc/store/products?per_page=100`,
];

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function normaliseBase(url) {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    );
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "FreluxPriceBot/1.0 (+https://freluxtools.com)",
      },
    });
    const text = await res.text();
    if (!res.ok) return { status: res.status, json: null, text };
    try {
      return { status: res.status, json: JSON.parse(text), text };
    } catch {
      return { status: res.status, json: null, text };
    }
  } catch (error) {
    return { status: 0, json: null, text: String(error?.message ?? error) };
  } finally {
    clearTimeout(timer);
  }
}

function extractProducts(payload) {
  if (!payload) return [];
  const list = Array.isArray(payload) ? payload : payload.products;
  if (!Array.isArray(list)) return [];
  return list.map((product) => ({
    title: String(product.title ?? product.name ?? "").trim(),
    price:
      product.variants?.[0]?.price ??
      product.prices?.price ??
      product.price ??
      null,
    currency:
      product.prices?.currency_code ??
      product.currency ??
      product.variants?.[0]?.currency ??
      null,
  }));
}

function isTool(title) {
  const lower = title.toLowerCase();
  return TOOL_NOUNS.some((noun) => lower.includes(noun));
}

function buildingScore(products) {
  if (!products.length) return { matches: 0, tools: 0, examples: [] };
  const building = products.filter((product) => {
    const title = product.title.toLowerCase();
    return BUILDING_NOUNS.some((noun) => title.includes(noun));
  });
  const material = building.filter((product) => !isTool(product.title));
  return {
    matches: material.length,
    tools: building.length - material.length,
    examples: material.slice(0, 3).map((p) => p.title),
  };
}

export async function probeCandidate(baseUrl) {
  const base = normaliseBase(baseUrl);
  if (!base) {
    return {
      base: baseUrl,
      reachable: false,
      status: 0,
      platform: null,
      products: 0,
    };
  }
  const attempts = [];
  for (const [index, build] of ENDPOINTS.entries()) {
    const url = build(base);
    const { status, json } = await fetchJson(url);
    const products = extractProducts(json);
    attempts.push({
      url,
      status,
      products: products.length,
      platform: index === 0 ? "shopify" : "woocommerce",
    });
    if (products.length > 0) {
      const score = buildingScore(products);
      return {
        base,
        reachable: true,
        status,
        platform: index === 0 ? "shopify" : "woocommerce",
        catalogue_url: url,
        products: products.length,
        building_products: score.matches,
        tool_products_ignored: score.tools,
        examples: score.examples,
      };
    }
  }
  const last = attempts[attempts.length - 1];
  const blocked = attempts.some((a) => a.status === 403 || a.status === 429);
  return {
    base,
    reachable: false,
    status: last?.status ?? 0,
    platform: null,
    products: 0,
    reason: blocked
      ? "blocked"
      : last?.status === 404
        ? "no_catalogue"
        : "unreachable",
  };
}

async function main() {
  const args = parseArgs(process.argv);
  let candidates = [];
  if (typeof args.urls === "string") {
    candidates = args.urls
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
  }
  const market =
    typeof args.market === "string" ? args.market.toUpperCase() : null;

  const results = [];
  for (const candidate of candidates) {
    const result = await probeCandidate(candidate);
    results.push({ market, ...result });
    const verdict = result.reachable
      ? `ok  ${result.products} products, ${result.building_products} building, ${result.platform}`
      : `no  ${result.reason ?? "unknown"} (status ${result.status})`;
    console.error(`${result.base} -> ${verdict}`);
  }

  const registry = results.filter(
    (r) => r.reachable && (r.building_products ?? 0) > 0,
  );
  const report = { probed_at: new Date().toISOString(), results, registry };
  if (typeof args.out === "string") {
    writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.error(
      `\nwrote ${args.out}: ${registry.length} of ${results.length} usable`,
    );
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
