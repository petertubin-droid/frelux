// Market index scanner.
//
// Official statistics are recorded as index series, never as product prices.
// Only interfaces that answered openly are wired here: the U.S. BLS public
// API (values) and the UK CKAN dataset API (metadata, licence, resources).
// Everything else stays registered with its real access state so the admin
// dashboard can show what is missing instead of implying coverage.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type Point = {
  market: string;
  index_code: string;
  index_name: string;
  category: string | null;
  period_start: string;
  period_label: string;
  index_value: number;
  base_period: string | null;
};

// PPI series that describe the material categories Frelux prices.
const BLS_SERIES: Array<{ id: string; name: string; category: string }> = [
  {
    id: "PCU327310327310",
    name: "Cement manufacturing",
    category: "cement_concrete",
  },
  {
    id: "PCU327320327320",
    name: "Ready-mix concrete manufacturing",
    category: "cement_concrete",
  },
  {
    id: "PCU331110331110",
    name: "Iron and steel mills",
    category: "steel_reinforcement",
  },
  { id: "PCU321113321113", name: "Sawmills", category: "timber" },
  {
    id: "PCU325510325510",
    name: "Paint and coating manufacturing",
    category: "paints",
  },
  {
    id: "PCU327121327121",
    name: "Brick and structural clay tile",
    category: "construction_materials",
  },
  {
    id: "PCU332913332913",
    name: "Plumbing fixture fitting and trim",
    category: "plumbing",
  },
  {
    id: "PCU335312335312",
    name: "Motor and generator manufacturing",
    category: "pumps_generators",
  },
];

const MONTHS = [
  "M01",
  "M02",
  "M03",
  "M04",
  "M05",
  "M06",
  "M07",
  "M08",
  "M09",
  "M10",
  "M11",
  "M12",
];

async function fetchBls(): Promise<Point[]> {
  const res = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seriesid: BLS_SERIES.map((s) => s.id),
      startyear: String(new Date().getUTCFullYear() - 1),
      endyear: String(new Date().getUTCFullYear()),
    }),
  });
  if (!res.ok) throw new Error(`BLS HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== "REQUEST_SUCCEEDED") {
    throw new Error(
      `BLS refused: ${JSON.stringify(json.message ?? json.status)}`,
    );
  }
  const points: Point[] = [];
  for (const series of json.Results?.series ?? []) {
    const meta = BLS_SERIES.find((s) => s.id === series.seriesID);
    if (!meta) continue;
    for (const row of series.data ?? []) {
      const monthIndex = MONTHS.indexOf(row.period);
      // Annual averages and non-monthly periods are skipped: an index needs a
      // real period, not a derived annual figure.
      if (monthIndex < 0) continue;
      const value = Number(row.value);
      if (!Number.isFinite(value)) continue;
      const period = `${row.year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
      points.push({
        market: "US",
        index_code: series.seriesID,
        index_name: meta.name,
        category: meta.category,
        period_start: period,
        period_label: `${row.periodName} ${row.year}`,
        index_value: value,
        base_period: "1982=100",
      });
    }
  }
  return points;
}

async function verifyUkDataset(): Promise<string> {
  const res = await fetch(
    "https://ckan.publishing.service.gov.uk/api/3/action/package_show?id=75ee36ed-21f7-4d7b-9e7c-f5bf4546145d",
    {
      headers: {
        "User-Agent": "FreluxPriceBot/1.0 (+https://freluxtools.com)",
      },
    },
  );
  if (!res.ok) throw new Error(`UK CKAN HTTP ${res.status}`);
  const json = await res.json();
  const result = json.result ?? {};
  const resources = result.resources ?? [];
  const csv = resources.filter(
    (r: { format?: string }) => (r.format ?? "").toUpperCase() === "CSV",
  ).length;
  return `CKAN verified ${new Date().toISOString().slice(0, 10)}: ${resources.length} resource(s), ${csv} CSV. Licence: ${result.license_title ?? "Open Government Licence"}. Statistics, not product prices.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // Same credential the product scanner uses; no anonymous writes.
  const token = req.headers.get("x-intel-token");
  const { data: tokenRow } = await supabase
    .from("price_intel_tokens")
    .select("token")
    .eq("token", token ?? "")
    .maybeSingle();
  if (!tokenRow) {
    return new Response(JSON.stringify({ error: "invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const report: Record<string, unknown> = {};
  const started = Date.now();

  const { data: sources } = await supabase
    .from("price_scan_sources")
    .select(
      "id, market, publisher, product_url, source_class, licence_name, licence_url, attribution_text",
    )
    .like("source_class", "official%")
    .eq("access_status", "open_api");

  for (const source of sources ?? []) {
    try {
      if (source.publisher.includes("Bureau of Labor")) {
        const points = await fetchBls();
        if (points.length) {
          const { error } = await supabase.from("market_index_series").upsert(
            points.map((p) => ({
              ...p,
              country_name: "United States",
              publisher: source.publisher,
              source_id: source.id,
              source_url: "https://www.bls.gov/ppi/",
              source_class: "official_price_index",
              licence_name: source.licence_name,
              licence_url: source.licence_url,
              attribution_text: source.attribution_text,
            })),
            {
              onConflict: "market,index_code,period_start",
              ignoreDuplicates: false,
            },
          );
          if (error) throw new Error(error.message);
        }
        await supabase
          .from("price_scan_sources")
          .update({
            last_success_at: new Date().toISOString(),
            access_notes: `BLS API returned ${points.length} monthly index points on ${new Date().toISOString().slice(0, 10)}.`,
          })
          .eq("id", source.id);
        report.bls = { points: points.length };
      } else if (source.product_url.includes("data.gov.uk")) {
        const note = await verifyUkDataset();
        await supabase
          .from("price_scan_sources")
          .update({
            last_success_at: new Date().toISOString(),
            access_notes: note,
          })
          .eq("id", source.id);
        report.uk = note;
      }
    } catch (err) {
      await supabase
        .from("price_scan_sources")
        .update({
          last_scan_status: "failed",
          last_scan_error: err instanceof Error ? err.message : String(err),
          access_notes: `Last attempt failed: ${err instanceof Error ? err.message : err}`,
        })
        .eq("id", source.id);
      report[source.market] = {
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      sources: (sources ?? []).length,
      duration_ms: Date.now() - started,
      report,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
