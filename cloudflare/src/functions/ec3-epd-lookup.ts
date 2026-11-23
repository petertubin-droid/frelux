// =========================================================
// Ported: ec3-epd-lookup
//
// Transparent proxy to the Building Transparency EC3 API. The key lives in the
// Worker binding and never reaches the browser. No key means 503 with a precise
// reason, never an invented factor; upstream statuses pass through so the
// client can tell "no key" from "no results" from "EC3 down".
// =========================================================

import { hasBindings, json, type EdgeHandler } from "./runtime";

const EC3_API_BASE = "https://api.buildingtransparency.org/api/ec3";

export const requiredBindings = ["EC3_API_KEY"] as const;

export const ec3EpdLookupHandler: EdgeHandler = async (request, env, _ctx, cors) => {
  if (request.method !== "POST") {
    return json(
      { error: "POST only: send { materialQuery, plant?, country?, limit? }." },
      405,
      cors,
    );
  }
  if (!hasBindings(env, ["EC3_API_KEY"])) {
    return json(
      {
        error:
          "EC3 API key is not configured on the Worker (EC3_API_KEY). EPD lookup is unavailable; the client falls back to admin-configured carbon factors and no number is invented.",
      },
      503,
      cors,
    );
  }

  let body: {
    materialQuery?: string;
    plant?: string;
    country?: string;
    limit?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Invalid JSON body." }, 400, cors);
  }

  const materialQuery = (body.materialQuery ?? "").trim();
  if (!materialQuery) {
    return json(
      { error: "materialQuery is required: no EPD search is performed without a term." },
      400,
      cors,
    );
  }
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
      headers: {
        Authorization: `Bearer ${String(env.EC3_API_KEY)}`,
        Accept: "application/json",
      },
    });
  } catch (error) {
    return json(
      {
        error: `Could not reach the EC3 API: ${error instanceof Error ? error.message : "network error"}. EPD lookup is unavailable; the client falls back to admin-configured factors.`,
      },
      502,
      cors,
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return json(
      {
        error: `EC3 API responded ${upstream.status}${text ? `: ${text.slice(0, 500)}` : ""}. EPD lookup is unavailable; the client falls back to admin-configured factors.`,
        upstreamStatus: upstream.status,
      },
      upstream.status === 401 || upstream.status === 403 ? 502 : upstream.status,
      cors,
    );
  }

  const raw = (await upstream.json().catch(() => null)) as unknown;
  const epds = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { epds?: unknown[] }).epds)
      ? (raw as { epds: unknown[] }).epds
      : raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown[] }).data)
        ? (raw as { data: unknown[] }).data
        : [];

  return json(
    {
      epds,
      meta: {
        source: "building-transparency-ec3",
        queried: url.toString(),
        count: epds.length,
        note: "Raw EC3 EPD JSON forwarded transparently; normalisation and verification happen client-side in ec3-epd.ts.",
      },
    },
    200,
    cors,
  );
};

export const ec3EpdLookupConfig = {
  name: "ec3-epd-lookup",
  methods: ["POST"],
  requiredBindings: [...requiredBindings],
  handler: ec3EpdLookupHandler,
};
