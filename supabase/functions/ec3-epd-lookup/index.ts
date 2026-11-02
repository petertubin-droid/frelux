/**
 * ec3-epd-lookup — Sustainability Pillar 5
 *
 * Server-side proxy to the Building Transparency EC3 API for
 * plant-specific, third-party verified EPDs. The EC3 API key lives
 * ONLY in this function's environment (EC3_API_KEY) and never reaches
 * the browser bundle.
 *
 * Contract:
 *   POST { materialQuery, plant?, country?, limit? }
 *   → 200 { epds: [...raw EC3 EPD objects...], meta: {...} }
 *   → 4xx/5xx { error: "..." }
 *
 * House rules (identical to the carbon engine):
 *   - No EC3_API_KEY configured → 503 with a precise reason. The client
 *     then falls back to admin-configured factors and says so; a number
 *     is never invented here.
 *   - The function is a TRANSPARENT proxy: it forwards the raw EPD JSON
 *     it received, normalisation happens client-side in
 *     src/lib/estimation/ec3-epd.ts where it is unit-tested.
 *   - Errors are passed through with their status so the client can
 *     tell "no key" from "no results" from "EC3 down".
 */

import { serveWithCors } from "../_shared/serve.ts";

const EC3_API_BASE = "https://api.buildingtransparency.org/api/ec3";

interface LookupRequest {
  materialQuery?: string;
  plant?: string;
  country?: string;
  limit?: number;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return json({ error: "POST only: send { materialQuery, plant?, country?, limit? }." }, 405);
  }

  const apiKey = Deno.env.get("EC3_API_KEY");
  if (!apiKey) {
    return json(
      {
        error:
          "EC3 API key is not configured on the edge function (EC3_API_KEY). EPD lookup is unavailable; the client falls back to admin-configured carbon factors and no number is invented.",
      },
      503,
    );
  }

  let body: LookupRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const materialQuery = (body.materialQuery ?? "").trim();
  if (!materialQuery) {
    return json({ error: "materialQuery is required: no EPD search is performed without a term." }, 400);
  }

  // Hard cap: EPD lookups are per-material, never a firehose.
  const limit = Math.min(Math.max(Number(body.limit) || 5, 1), 20);

  const url = new URL(`${EC3_API_BASE}/epds/v2`);
  url.searchParams.set("q", materialQuery);
  url.searchParams.set("limit", String(limit));
  if (body.plant?.trim()) url.searchParams.set("plant", body.plant.trim());
  if (body.country?.trim()) url.searchParams.set("jurisdiction", body.country.trim());

  let upstream: Response;
  try {
    upstream = await fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
  } catch (e) {
    return json(
      {
        error: `Could not reach the EC3 API: ${e instanceof Error ? e.message : "network error"}. EPD lookup is unavailable; the client falls back to admin-configured factors.`,
      },
      502,
    );
  }

  if (!upstream.ok) {
    // Pass the upstream status through: 401/403 = key problem,
    // 404 = search endpoint moved, 5xx = EC3 down. The client never guesses.
    const text = await upstream.text().catch(() => "");
    return json(
      {
        error: `EC3 API responded ${upstream.status}${text ? `: ${text.slice(0, 500)}` : ""}. EPD lookup is unavailable; the client falls back to admin-configured factors.`,
        upstreamStatus: upstream.status,
      },
      upstream.status === 401 || upstream.status === 403 ? 502 : upstream.status,
    );
  }

  const raw = await upstream.json().catch(() => null);
  const epds = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).epds)
      ? (raw as { epds: unknown[] }).epds
      : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).data)
        ? (raw as { data: unknown[] }).data
        : [];

  return json({
    epds,
    meta: {
      source: "building-transparency-ec3",
      queried: url.toString().replace(/Authorization.*/g, ""),
      count: epds.length,
      note: "Raw EC3 EPD JSON forwarded transparently; normalisation and verification happen client-side in ec3-epd.ts.",
    },
  });
}

serveWithCors(handler);
