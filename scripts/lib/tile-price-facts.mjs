// Tile material prices per market, read from the bundled tile catalog.
//
// The tile templates had no price section at all because tiles are not in
// estimation_prices: the tile engine prices from BUNDLED_TILE_MATERIALS, which
// carries a real per-market row set (42 markets). This module reads that array
// out of the TypeScript source at build time so the prerendered page shows the
// same numbers the calculator uses.
//
// Two rules, same as everywhere else:
//   - only the market's own rows. fetchTileMaterials() refuses to substitute
//     Nigeria offline, and this table refuses it too.
//   - no arithmetic. Coverage and unit price are shown as stored; the estimate
//     is the engine's output, not this table's.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const SOURCE = "src/lib/international/bundled-price-books.ts";

const str = (block, key) => {
  const m = new RegExp(`${key}:\\s*"([^"]*)"`).exec(block);
  return m ? m[1] : null;
};
const num = (block, key) => {
  const m = new RegExp(`${key}:\\s*(-?[0-9.]+)`).exec(block);
  return m ? Number(m[1]) : null;
};

/**
 * Parses BUNDLED_TILE_MATERIALS out of the source. Kept deliberately narrow:
 * the fields below are the only ones this table shows. src/lib/bundled-tile-
 * facts.test.ts fails if the parsed set stops matching the source.
 */
export function loadTileMaterialFacts(root = process.cwd()) {
  const src = readFileSync(join(root, SOURCE), "utf8");
  const start = src.indexOf("export const BUNDLED_TILE_MATERIALS");
  if (start < 0) return new Map();
  const end = src.indexOf("\nexport const", start + 10);
  const segment = src.slice(start, end < 0 ? undefined : end);

  const byMarket = new Map();
  const blocks = segment.split(/\{\s*\n\s*id:/).slice(1);
  for (const raw of blocks) {
    const block = `id:${raw.split("\n  },")[0]}`;
    const market = str(block, "market");
    const name = str(block, "name");
    if (!market || !name) continue;
    const row = {
      market,
      category: str(block, "category"),
      name,
      unit: str(block, "unit"),
      coverageRate: num(block, "coverageRate"),
      coverageUnit: str(block, "coverageUnit"),
      packageSize: num(block, "packageSize"),
      packageUnit: str(block, "packageUnit"),
      unitPrice: num(block, "unitPrice"),
      currency: str(block, "currency"),
    };
    if (!byMarket.has(market)) byMarket.set(market, []);
    byMarket.get(market).push(row);
  }
  return byMarket;
}

const formatCoverage = (row) => {
  if (row.coverageRate == null || !row.coverageUnit) return "";
  const per =
    row.packageSize != null && row.packageUnit
      ? ` per ${row.packageSize} ${row.packageUnit}`
      : "";
  return `${row.coverageRate} ${row.coverageUnit}${per}`;
};

/** Body HTML for the tile price section, or "" when the market has no rows. */
/** True when the market has any configured tile material row. */
export function hasTilePrices(byMarket, marketCode) {
  return (byMarket.get(String(marketCode).toUpperCase()) ?? []).length > 0;
}

export function renderTilePriceFacts(byMarket, marketCode, countryName) {
  const rows = byMarket.get(String(marketCode).toUpperCase()) ?? [];
  if (rows.length === 0) {
    return (
      `<h2>Tile material prices in ${escapeHtml(countryName)}</h2>` +
      `<p>No tile material row is configured for ${escapeHtml(countryName)}. The tiling calculator therefore asks for your own adhesive and grout prices instead of substituting another country's, and the estimate labels every line as entered rather than observed.</p>` +
      `<p><a href="/tile-calculator/">Open the tile calculator</a> &middot; <a href="/material-prices/">How material prices are collected</a></p>`
    );
  }

  const body = rows
    .map((row) => {
      const price =
        row.unitPrice != null && row.currency
          ? `${escapeHtml(row.currency)} ${row.unitPrice.toLocaleString(
              "en-US",
              {
                maximumFractionDigits: 2,
              },
            )}`
          : "Not stored";
      const pack =
        row.packageSize != null
          ? `${row.packageSize} ${row.packageUnit ?? row.unit ?? ""}`.trim()
          : (row.unit ?? "");
      return (
        `<tr><th scope="row">${escapeHtml(row.name)}</th>` +
        `<td>${escapeHtml(pack)}</td>` +
        `<td>${escapeHtml(formatCoverage(row) || "Not stored")}</td>` +
        `<td>${price}</td></tr>`
      );
    })
    .join("");

  return (
    `<h2>Tile material prices in ${escapeHtml(countryName)}</h2>` +
    `<p>The adhesive and grout prices the tiling calculator uses for ${escapeHtml(countryName)}, with the coverage each pack is expected to give. These are stored unit prices, not an estimate: tiles themselves are priced from the size and grade you enter.</p>` +
    `<table><caption>Stored ${escapeHtml(countryName)} tile material prices</caption>` +
    `<thead><tr><th scope="col">Material</th><th scope="col">Pack</th><th scope="col">Coverage</th><th scope="col">Unit price</th></tr></thead>` +
    `<tbody>${body}</tbody></table>` +
    `<p><a href="/tile-calculator/">Open the tile calculator</a> &middot; <a href="/material-prices/">How FRELUX collects material prices</a></p>`
  );
}
