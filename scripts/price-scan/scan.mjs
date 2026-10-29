#!/usr/bin/env node
/**
 * FRELUX weekly price-intel scan.
 *
 * Reads the live price book, classifies every active material price, fetches
 * registered retailer sources, and reports per-market verification coverage.
 *
 *   node scripts/price-scan/scan.mjs            # read + classify + report
 *   node scripts/price-scan/scan.mjs --fetch    # also fetch registered sources
 *   node scripts/price-scan/scan.mjs --apply    # write verified prices (needs service token)
 *
 * Classifications
 *   local_verified  real price in the market's own currency, fresh, not an FX reference
 *   fx_reference    derived from the NG book at an FX rate: NOT a local price
 *   stale           local currency but older than MAX_AGE_DAYS
 *
 * Apply refuses to run without a service-role key, and every write keeps the
 * retailer URL and fetch date with the price so the result stays auditable.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const MAX_AGE_DAYS = 45;
const SANE_BAND = 0.4; // reject a fetched price more than 40% away from current

const envFile = path.join(ROOT, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const URL_BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const READ_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const WRITE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_BASE || !READ_KEY) {
  console.error("no Supabase URL/anon key available");
  process.exit(2);
}

const rest = async (pathAndQuery, init = {}) => {
  const res = await fetch(`${URL_BASE}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: init.key || READ_KEY,
      Authorization: `Bearer ${init.key || READ_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${pathAndQuery} -> ${res.status} ${await res.text()}`);
  return res.json();
};

// Market currency map, straight from the market registry the UI uses.
const MARKET_CURRENCY = {
  NG: "NGN", US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", DE: "EUR", FR: "EUR",
  IT: "EUR", ES: "EUR", PT: "EUR", IE: "EUR", NL: "EUR", BE: "EUR", AT: "EUR",
  IN: "INR", GH: "GHS", KE: "KES", ZA: "ZAR", AE: "AED", SA: "SAR", BR: "BRL",
  MX: "MXN", CN: "CNY", JP: "JPY", KR: "KRW", ID: "IDR", PH: "PHP", TH: "THB",
  MY: "MYR", SG: "SGD", PK: "PKR", EG: "EGP", TR: "TRY", PL: "PLN", SE: "SEK",
  DK: "DKK", NO: "NOK", FI: "EUR", CH: "CHF", NZ: "NZD", TZ: "TZS", ET: "ETB",
  CI: "XOF",
};

const daysAgo = (iso) => Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
const isFxReference = (notes) => /fx reference/i.test(notes || "");

const main = async () => {
  const doFetch = process.argv.includes("--fetch");
  const doApply = process.argv.includes("--apply");

  const prices = await rest(
    "estimation_prices?select=id,price_type,ref_id,price,currency,effective_date,notes,is_active&price_type=eq.material&is_active=eq.true&limit=5000",
  );
  const materials = await rest("estimation_materials?select=id,slug,name,category&is_active=eq.true&limit=2000");
  const byId = new Map(materials.map((m) => [m.id, m]));

  const byCurrency = {};
  for (const row of prices) {
    const market = Object.entries(MARKET_CURRENCY).find(([, cur]) => cur === row.currency)?.[0] || row.currency;
    byCurrency[market] ??= { total: 0, local_verified: 0, fx_reference: 0, stale: 0 };
    byCurrency[market].total += 1;
    const age = daysAgo(row.effective_date || "1970-01-01");
    if (isFxReference(row.notes)) byCurrency[market].fx_reference += 1;
    else if (age > MAX_AGE_DAYS) byCurrency[market].stale += 1;
    else byCurrency[market].local_verified += 1;
  }

  const sourcesDoc = JSON.parse(fs.readFileSync(path.join(HERE, "sources.json"), "utf8"));
  const sources = (sourcesDoc.sources || []).filter((s) => s.url && s.active !== false);

  const fetched = [];
  if (doFetch) {
    for (const source of sources) {
      try {
        const res = await fetch(source.url, { headers: { "User-Agent": "FRELUX price-intel (weekly)" } });
        const html = await res.text();
        const match = html.match(source.pattern ? new RegExp(source.pattern) : /"price"\s*:\s*"?([0-9.]+)/i);
        const value = match ? Number(match[1]) : null;
        if (!value || !Number.isFinite(value)) {
          fetched.push({ ...source, status: "unparsed" });
          continue;
        }
        const current = prices.find((p) => p.ref_id === source.ref_id && p.currency === source.currency);
        const drift = current ? Math.abs(value - current.price) / current.price : 0;
        const withinBand = drift <= SANE_BAND;
        fetched.push({
          ...source,
          fetched_price: value,
          current_price: current?.price ?? null,
          drift: Number(drift.toFixed(3)),
          status: withinBand ? "candidate" : "out_of_band",
        });
      } catch (error) {
        fetched.push({ ...source, status: "fetch_failed", error: String(error).slice(0, 160) });
      }
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    material_prices_active: prices.length,
    materials_active: materials.length,
    max_age_days: MAX_AGE_DAYS,
    by_market: byCurrency,
    sources_registered: (sourcesDoc.sources || []).length,
    sources_usable: sources.length,
    fetched,
    apply: { requested: doApply, performed: false, reason: null },
  };

  if (doApply) {
    if (!WRITE_KEY) {
      report.apply.reason = "no service-role key available: cannot write prices";
    } else if (!fetched.some((f) => f.status === "candidate")) {
      report.apply.reason = "no validated candidates to apply";
    } else {
      const now = new Date().toISOString().slice(0, 10);
      for (const candidate of fetched.filter((f) => f.status === "candidate")) {
        await fetch(`${URL_BASE}/rest/v1/estimation_prices`, {
          method: "POST",
          headers: {
            apikey: WRITE_KEY,
            Authorization: `Bearer ${WRITE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            price_type: "material",
            ref_id: candidate.ref_id,
            price: candidate.fetched_price,
            currency: candidate.currency,
            effective_date: now,
            notes: `Weekly price-intel scan ${now}: ${candidate.retailer} ${candidate.url} (was ${candidate.current_price}).`,
            is_active: true,
          }),
        });
      }
      report.apply.performed = true;
    }
  }

  const stamp = new Date().toISOString().slice(0, 10);
  fs.mkdirSync(path.join(ROOT, "data/price-scan"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, `data/price-scan/report-${stamp}.json`), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(ROOT, "data/price-scan/latest.json"), JSON.stringify(report, null, 2));

  // Publish the market verification verdict for the UI gate. Counts only: no
  // prices leave this file, so it is safe to ship in the bundle.
  const verification = {
    scanned_at: report.generated_at,
    max_age_days: MAX_AGE_DAYS,
    markets: Object.fromEntries(
      Object.entries(byCurrency).map(([market, c]) => [
        market,
        {
          total: c.total,
          local_verified: c.local_verified,
          fx_reference: c.fx_reference,
          stale: c.stale,
          // A market is verified only when its prices are its own and fresh.
          verified: c.total >= 3 && c.fx_reference / c.total < 0.25 && c.stale / c.total < 0.25,
        },
      ]),
    ),
  };
  fs.writeFileSync(
    path.join(ROOT, "src/lib/international/price-verification.json"),
    JSON.stringify(verification, null, 2) + "\n",
  );

  const rows = Object.entries(byCurrency).sort((a, b) => b[1].total - a[1].total);
  console.log(`prices active: ${prices.length}, materials: ${materials.length}`);
  console.log("market  total  local  fx_ref  stale");
  for (const [market, c] of rows) {
    console.log(
      `${market.padEnd(5)} ${String(c.total).padStart(6)} ${String(c.local_verified).padStart(6)} ${String(c.fx_reference).padStart(7)} ${String(c.stale).padStart(6)}`,
    );
  }
  console.log(`sources registered: ${report.sources_registered}, usable: ${report.sources_usable}`);
  if (report.apply.reason) console.log(`apply: ${report.apply.reason}`);
  console.log(`report: data/price-scan/report-${stamp}.json`);
};

main().catch((error) => {
  console.error("scan failed:", error.message);
  process.exit(1);
});
