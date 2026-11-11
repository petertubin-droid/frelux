#!/usr/bin/env node
/**
 * Reads the exact price of one pack size from a WooCommerce product page.
 *
 * Why this exists: a variable product lists its cheapest variant as the
 * headline price, so a 19 L cubeta of paint shows up as the per-litre price.
 * Filing that number as the can price understates a bucket by 19 times. The
 * page carries every variant's own price in its `data-product_variations`
 * payload, which is what this reads, so a pack price is quoted, never
 * multiplied.
 *
 * Usage:
 *   node scripts/price-scan/woo-variant-price.mjs <product-url> [--pack=cubeta] [--json]
 *
 * Exits 1 when the pack the caller asked for is not on the page, so a missing
 * variant can never be mistaken for a price.
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--"));
const packArg = (args.find((a) => a.startsWith("--pack=")) || "").split("=")[1];
const asJson = args.includes("--json");
if (!url) {
  console.error("usage: woo-variant-price.mjs <product-url> [--pack=<text>] [--json]");
  process.exit(2);
}

/** Decodes the HTML entities WooCommerce writes into the attribute, numeric
 *  ones included, so the payload parses as the JSON it already is. */
const decode = (s) =>
  s.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/** The attribute is one long escaped JSON array, so the closing quote is found
 *  by matching brackets rather than by pattern. */
function variationPayload(page) {
  const marker = page.indexOf('data-product_variations="');
  if (marker === -1) return null;
  let i = marker + 'data-product_variations="'.length;
  const start = i;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (; i < page.length; i++) {
    const ch = page[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "[" || ch === "{") depth++;
    else if (ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) return decode(page.slice(start, i + 1));
    }
  }
  return null;
}

const page = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
const payload = variationPayload(page);
if (!payload) {
  console.error("no data-product_variations payload: this is not a variable product page");
  process.exit(1);
}

let variants;
try {
  variants = JSON.parse(payload);
} catch (err) {
  console.error("variation payload did not parse:", err.message);
  process.exit(1);
}

const label = (v) =>
  Object.entries(v.attributes || {})
    .map(([, value]) => String(value))
    .join(" ");

const rows = variants.map((v) => ({
  pack: label(v),
  price: Number(v.display_price),
  regular: Number(v.display_regular_price),
  sku: v.sku || null,
}));

const wanted = packArg
  ? rows.filter((r) => r.pack.toLowerCase().includes(packArg.toLowerCase()))
  : rows;

if (!wanted.length) {
  console.error(`no variant matching "${packArg}" on ${url}`);
  console.error(`variants: ${rows.map((r) => r.pack).join(", ")}`);
  process.exit(1);
}

if (asJson) {
  console.log(JSON.stringify({ url, captured_at: new Date().toISOString(), variants: wanted }, null, 2));
} else {
  for (const r of wanted) console.log(`${r.pack.padEnd(26)} ${r.price}`);
}
