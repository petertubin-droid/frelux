#!/usr/bin/env node
/**
 * Engine matrix verification gate.
 *
 * The inventory must not claim half-support: every engine in every market is
 * either verified or unavailable. This script decides which, from evidence that
 * can be re-checked at any time:
 *
 *   1. market wiring in the shipped code (price book, labour config, typology,
 *      market code reaching the calculation)
 *   2. retailer-sourced price rows for that market in the bundled price book
 *      ("indicative band" rows do not count)
 *
 * verified    = wiring found AND at least MIN_SOURCED retailer-sourced rows
 * unavailable = otherwise, with the failing condition recorded in the note
 *
 * Run: npx tsx scripts/verify-engine-matrix.mjs [--write]
 */
import fs from "node:fs";
import path from "node:path";
import { BUNDLED_PRICE_BOOK } from "../src/lib/international/bundled-price-books.ts";

const MIN_SOURCED = 3;
// Pages whose filename does not match their engine id or name.
const PAGE_HINTS = {
  grafitex: ["src/pages/ConfigurableFinishCalculator.tsx"],
  stucco: ["src/pages/MineralStoneCalculator.tsx"],
  mineral_stone: ["src/pages/MineralStoneCalculator.tsx"],
};
const WIRING_TOKENS = [
  "fetchMarketPriceBook",
  "useLabourConfig",
  "getConstructionTypology",
  "marketCode",
];

const inventoryPath = path.resolve("src/lib/international/engine-inventory.ts");
let source = fs.readFileSync(inventoryPath, "utf8");

const perMarket = {};
for (const material of Object.values(BUNDLED_PRICE_BOOK)) {
  for (const [market, price] of Object.entries(material.markets)) {
    perMarket[market] ??= { sourced: 0, rows: 0 };
    perMarket[market].rows += 1;
    const retailer = typeof price.s === "string" ? price.s : "";
    if (retailer && !/indicative/i.test(retailer)) perMarket[market].sourced += 1;
  }
}

const pages = (() => {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
    }
  };
  walk(path.resolve("src/pages"));
  return out.map((f) => ({ rel: path.relative(process.cwd(), f), base: path.basename(f).toLowerCase() }));
})();

const read = (file) => {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
};

const results = [];
const engineBlocks = [...source.matchAll(/\n  \{\n    id: "([^"]+)",/g)];
for (let i = 0; i < engineBlocks.length; i += 1) {
  const id = engineBlocks[i][1];
  const start = engineBlocks[i].index;
  const end = i + 1 < engineBlocks.length ? engineBlocks[i + 1].index : source.length;
  const block = source.slice(start, end);

  const declared = [...block.matchAll(/"(src\/[^"]+\.tsx?)"/g)].map((m) => m[1]);
  // The page that actually renders the engine is sometimes not declared, so
  // fall back to a filename match on the engine id and name.
  const idTokens = [id, id.replace(/_/g, "")];
  const nameTokens = (block.match(/name: "([^"]+)"/)?.[1] || "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 3);
  const matchedPages = pages
    .filter((p) => {
      const base = p.base.replace(/\.tsx?$/, "");
      return idTokens.some((t) => base.includes(t.replace(/_/g, ""))) ||
        nameTokens.some((t) => base.includes(t));
    })
    .map((p) => p.rel);
  const fileList = [
    ...new Set([...declared, ...matchedPages, ...(PAGE_HINTS[id] || [])]),
  ];
  const code = fileList.map(read).join("\n");
  const wiring = WIRING_TOKENS.filter((token) => code.includes(token));
  const markets = [...block.matchAll(/\n      ([A-Z]{2}): \{\n        status: "([a-z_]+)"/g)];

  for (const [, market, status] of markets) {
    if (status === "verified") continue;
    const coverage = perMarket[market]?.sourced ?? 0;
    const ok = wiring.length > 0 && coverage >= MIN_SOURCED;
    const nextStatus = ok ? "verified" : "unavailable";
    const note = ok
      ? `Verified by scripts/verify-engine-matrix.mjs: market wiring present (${wiring.join(", ")}) and ${coverage} retailer-sourced price rows for ${market}. Re-run the gate after any pricing or method change.`
      : wiring.length === 0
        ? `Unavailable in ${market}: no market wiring reaches the calculation (no price book, labour config or typology), so local figures cannot be verified.`
        : `Unavailable in ${market}: only ${coverage} retailer-sourced price row(s), below the ${MIN_SOURCED} the verification gate requires. Add local prices, then re-run scripts/verify-engine-matrix.mjs.`;
    results.push({ id, market, status, nextStatus, wiring: wiring.length, coverage, note });
  }
}

let updated = source;
for (const row of results) {
  const engineAt = updated.indexOf(`\n    id: "${row.id}",`);
  if (engineAt < 0) continue;
  const blockEnd = updated.indexOf("\n  {\n", engineAt);
  const block = updated.slice(engineAt, blockEnd > 0 ? blockEnd : updated.length);
  const entry = new RegExp(
    `      ${row.market}: \\{\\n        status: "[a-z_]+",\\n        notes:\\s*\\n?\\s*"(?:[^"\\\\]|\\\\.)*",\\n      \\},`,
  );
  const replaced = block.replace(
    entry,
    `      ${row.market}: {\n        status: "${row.nextStatus}",\n        notes:\n          "${row.note.replace(/"/g, '\\"')}",\n      },`,
  );
  if (blockEnd < 0) {
    updated = updated.slice(0, engineAt) + replaced;
  } else {
    updated = updated.slice(0, engineAt) + replaced + updated.slice(blockEnd);
  }
}

const counts = results.reduce((acc, r) => {
  acc[r.nextStatus] = (acc[r.nextStatus] || 0) + 1;
  return acc;
}, {});
console.log("entries examined:", results.length, counts);
for (const r of results.filter((x) => x.nextStatus === "unavailable").slice(0, 8)) {
  console.log(`  ${r.id}/${r.market}: wiring=${r.wiring} sourced=${r.coverage}`);
}

if (process.argv.includes("--write")) {
  fs.writeFileSync(inventoryPath, updated);
  console.log("matrix written");
} else {
  console.log("dry run (pass --write to apply)");
}
