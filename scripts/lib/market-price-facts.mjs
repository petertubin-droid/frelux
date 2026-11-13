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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

import { ROLES_BY_TYPE, ROLE_LABELS } from "./template-price-roles.mjs";

export async function fetchAll(table, query) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      console.warn(`[prerender] ${table} skipped: HTTP ${res.status}`);
      return [];
    }
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.warn(`[prerender] ${table} skipped: ${error.message}`);
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

  return { byMarket, markets: [...byMarket.keys()] };
}

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
