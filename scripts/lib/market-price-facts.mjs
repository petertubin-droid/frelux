// Real local material prices per market, for the market template pages.
//
// The 1,280 /market/<code>/templates/<slug>/ pages were near-identical: the
// same template text with the country name swapped. What differs between them
// is the price book, so that is what these pages now show: the market's own
// verified rows for the materials that template consumes, with unit, source and
// date, straight from market_material_roles + estimation_materials +
// estimation_prices.
//
// Rules:
//   - only the market's OWN rows are published here. Nothing is inherited from
//     another country, converted, or averaged, so the table cannot claim a local
//     price the market does not have.
//   - a role with no priced row is listed as unpriced, not omitted and not
//     filled with a reference rate.
//   - no arithmetic: unit prices are shown as stored. Totals are the engines'
//     job and are never computed here.

// Vite loads .env files into import.meta.env, not process.env, so a prerender
// step that reads process.env sees nothing and quietly prices nothing. Read the
// env files directly as a fallback: these two values are the public project URL
// and the anon key, the same values that ship in the client bundle.
function readEnvFile(name) {
  try {
    const text = readFileSync(join(process.cwd(), name), "utf8");
    const out = {};
    for (const line of text.split("\n")) {
      const m = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

const envSources = [".env", ".env.local", ".env.audit"].map(readEnvFile);
const envValue = (key) =>
  process.env[key] || envSources.map((e) => e[key]).find(Boolean) || "";

const SUPABASE_URL = envValue("VITE_SUPABASE_URL");
const SUPABASE_ANON_KEY = envValue("VITE_SUPABASE_ANON_KEY");

import { readFileSync } from "node:fs";
import { join } from "node:path";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

import { ROLES_BY_TYPE, ROLE_LABELS } from "./template-price-roles.mjs";

/**
 * Reads a table completely.
 *
 * PostgREST caps one response at the server's row limit, so a query asking for
 * 4,000 price rows silently came back with the first 1,000. That truncation is
 * invisible in the output: roles whose price fell past the cap looked unpriced,
 * and pages were withheld from the index for want of a price the database
 * actually holds. Paging here fixes the cause rather than the symptom.
 */
const PAGE_SIZE = 1000;

export async function fetchAll(table, query) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const paged = `${query.replace(/(^|&)limit=\d+/, "")}&limit=${PAGE_SIZE}&offset=${offset}`;
    const batch = await fetchPage(`${table}?${paged}`);
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    if (offset > 100000) break;
  }
  return rows;
}

async function fetchPage(pathAndQuery) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      console.warn(`[prerender] ${pathAndQuery.split("?")[0]} skipped: HTTP ${res.status}`);
      return [];
    }
    const body = await res.json();
    return Array.isArray(body) ? body : [];
  } catch (error) {
    console.warn(`[prerender] ${pathAndQuery.split("?")[0]} skipped: ${error.message}`);
    return [];
  }
}

/**
 * Reads the three tables once and returns a lookup: market -> role -> price row.
 * Call once, then use the returned object for every page.
 */
export async function loadMarketPriceFacts() {
  const [roles, materials, prices] = await Promise.all([
    fetchAll(
      "market_material_roles",
      "select=market,role,material_slug,display_name,unit_label,is_active,sort_order&is_active=eq.true&limit=1000",
    ),
    fetchAll("estimation_materials", "select=id,slug,name&limit=2000"),
    fetchAll(
      "estimation_prices",
      "select=market,ref_id,price,currency,price_source,effective_date,verification_status,supplier_name,is_active&is_active=eq.true&limit=4000",
    ),
  ]);

  const materialById = new Map();
  for (const m of materials) materialById.set(m.id, m);

  // market|ref_id -> price row
  const priceByMarketRef = new Map();
  for (const p of prices) {
    if (p.market == null || p.ref_id == null) continue;
    priceByMarketRef.set(`${p.market}|${p.ref_id}`, p);
  }

  // market -> role -> { display_name, unit_label, material_name, price row }
  const byMarket = new Map();
  for (const r of roles) {
    const material = materials.find((m) => m.slug === r.material_slug);
    if (!material) continue;
    if (!byMarket.has(r.market)) byMarket.set(r.market, new Map());
    byMarket.get(r.market).set(r.role, {
      role: r.role,
      display_name: r.display_name,
      unit_label: r.unit_label,
      material_name: material.name,
      price: priceByMarketRef.get(`${r.market}|${material.id}`) ?? null,
    });
  }

  // market -> material slug -> price row, for the alias fallback below.
  const priceByMarketSlug = new Map();
  for (const p of prices) {
    if (p.market == null || p.ref_id == null || p.price == null) continue;
    const material = materialById.get(p.ref_id);
    if (!material) continue;
    if (!priceByMarketSlug.has(p.market)) priceByMarketSlug.set(p.market, new Map());
    const bucket = priceByMarketSlug.get(p.market);
    if (!bucket.has(material.slug)) bucket.set(material.slug, { ...p, material });
  }

  // Fill roles the market has no curated mapping for, but only where the market
  // already stores a price for the equivalent material.
  for (const [market, priced] of priceByMarketSlug) {
    if (!byMarket.has(market)) byMarket.set(market, new Map());
    const roleMap = byMarket.get(market);
    for (const [role, aliases] of Object.entries(ROLE_MATERIAL_ALIASES)) {
      const existing = roleMap.get(role);
      if (existing && existing.price) continue;
      const hit = aliases.map((slug) => priced.get(slug)).find(Boolean);
      if (!hit) continue;
      roleMap.set(role, {
        role,
        display_name: hit.material.name,
        unit_label: existing?.unit_label || "unit",
        material_name: hit.material.name,
        price: hit,
        alias: true,
      });
    }
  }

  return { byMarket, markets: [...byMarket.keys()] };
}

/**
 * Display-side aliases: which of a market's priced materials answers a role
 * when the market has no curated market_material_roles row for that role.
 *
 * This is read-only and exists for the SEO pages only. The calculators keep
 * pricing through market_material_roles, so an alias here cannot change an
 * estimate; it can only show a visitor the local price the market already
 * stores for that material, under the role name the template uses. Unit bases
 * are kept identical (per m3 to per m3, per bag to per bag) so a displayed
 * price is never a price for a different quantity.
 */
export const ROLE_MATERIAL_ALIASES = Object.freeze({
  sand: ["sand-per-m3", "sand"],
  "concrete-mix": ["cement-per-bag", "cement"],
  "skim-plaster": ["plaster-per-bag", "skim-plaster", "gypsum-plaster"],
  "interior-paint": ["interior-emulsion", "emulsion", "paint-interior"],
  primer: ["primer", "emulsion-primer"],
  "joint-filler": ["joint-filler", "putty", "filler"],
  sandpaper: ["sandpaper", "abrasive"],
});

/** Rows for one market and one template type, priced first. */
export function priceRowsFor(facts, marketCode, templateType) {
  const roles = ROLES_BY_TYPE[templateType] ?? [];
  if (roles.length === 0) return { supported: false, rows: [] };
  const marketRows = facts.byMarket.get(String(marketCode).toUpperCase());
  if (!marketRows) return { supported: true, rows: [] };
  const rows = roles
    .map((role) => marketRows.get(role))
    .filter(Boolean)
    .map((row) => ({ ...row, label: ROLE_LABELS[row.role] ?? row.role }));
  return { supported: true, rows };
}

/**
 * True when this market has at least one stored price for this template's
 * materials. A page cannot claim local pricing without one.
 */
export function hasVerifiedPrices(facts, marketCode, templateType) {
  const { rows } = priceRowsFor(facts, marketCode, templateType);
  return rows.some((row) => row.price && row.price.price != null);
}

/** Body HTML for the "verified local prices" section, or "" when unsupported. */
export function renderPriceFacts(
  facts,
  marketCode,
  templateType,
  countryName,
  currency,
) {
  const { supported, rows } = priceRowsFor(facts, marketCode, templateType);
  if (!supported) return "";

  const priced = rows.filter((row) => row.price && row.price.price != null);
  if (priced.length === 0) {
    return (
      `<h2>Material prices in ${escapeHtml(countryName)}</h2>` +
      `<p>The FRELUX price book holds no verified ${escapeHtml(countryName)} row for the materials this template consumes. The calculator will not substitute another country's rate: those lines are marked as a reference rate and the estimate says so.</p>` +
      `<p><a href="/material-prices/">How material prices are collected</a></p>`
    );
  }

  const body = priced
    .map((row) => {
      const price = row.price;
      const amount = Number(price.price);
      const money = Number.isFinite(amount)
        ? `${escapeHtml(price.currency || currency)} ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
        : "Not stored";
      const source = price.price_source || price.supplier_name || "";
      const dated = price.effective_date
        ? ` (${escapeHtml(price.effective_date)})`
        : "";
      const status = price.verification_status
        ? ` &middot; ${escapeHtml(price.verification_status)}`
        : "";
      return (
        `<tr><th scope="row">${escapeHtml(row.label)}</th>` +
        `<td>${escapeHtml(row.display_name)}${row.unit_label ? ` (${escapeHtml(row.unit_label)})` : ""}</td>` +
        `<td>${money}</td>` +
        `<td>${source ? `${escapeHtml(source)}${dated}${status}` : `Stored market row${dated}${status}`}</td></tr>`
      );
    })
    .join("");

  const unpriced = rows.filter((row) => !row.price || row.price.price == null);

  return (
    `<h2>Material prices in ${escapeHtml(countryName)}</h2>` +
    `<p>What ${escapeHtml(countryName)} suppliers charge for the materials this template consumes, as stored in the price book. These are unit prices, not an estimate: the calculator multiplies them by the quantities your own measurements produce.</p>` +
    `<table><caption>Stored ${escapeHtml(countryName)} unit prices</caption>` +
    `<thead><tr><th scope="col">Material role</th><th scope="col">Local product</th><th scope="col">Unit price</th><th scope="col">Source</th></tr></thead>` +
    `<tbody>${body}</tbody></table>` +
    (unpriced.length
      ? `<p>Not priced in ${escapeHtml(countryName)} today: ${unpriced
          .map((row) => escapeHtml(row.label.toLowerCase()))
          .join(
            ", ",
          )}. Those lines are marked as a reference rate in the estimate rather than filled from another market.</p>`
      : "") +
    `<p><a href="/material-prices/">How FRELUX collects material prices</a> &middot; <a href="/market/${String(marketCode).toLowerCase()}/">${escapeHtml(countryName)} market overview</a></p>`
  );
}

export { ROLES_BY_TYPE, ROLE_LABELS };
