/**
 * FRELUX SEO: Google Search Console performance reader.
 *
 * Rules this function enforces:
 *  - It never invents metrics. With no credential, or with a credential that
 *    cannot see the property, it answers `connected: false` and says why. The
 *    dashboard then shows the setup state instead of a chart of guesses.
 *  - It reads only Google's own Search Analytics and sitemap endpoints, so the
 *    numbers on the page are the numbers Google reports, for the exact date
 *    range shown.
 *  - Costs no API call unless asked: the UI passes an action.
 *
 * Credential: GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN, an OAuth access token for an
 * account that has access to the property (webmasters.readonly is enough for
 * everything here).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serveWithCors } from "../_shared/serve.ts";

const API = "https://www.googleapis.com/webmasters/v3";
const TOKEN = Deno.env.get("GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN") ?? "";
const PROPERTY = Deno.env.get("GSC_PROPERTY") ?? "https://freluxtools.com/";

type Action = "status" | "query" | "sitemaps";

interface QueryBody {
  action?: Action;
  startDate?: string;
  endDate?: string;
  dimensions?: string[];
  rowLimit?: number;
}

const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

async function gsc(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

function notConnected(reason: string, extra: Record<string, unknown> = {}) {
  return Response.json(
    {
      connected: false,
      property: PROPERTY,
      reason,
      setup:
        "Set GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN to an OAuth token for a Google account that owns or has access to the property, then redeploy this function.",
      ...extra,
    },
    { status: 200 },
  );
}

Deno.serve(
  serveWithCors(async (req) => {
    let body: QueryBody = {};
    if (req.method === "POST") {
      body = (await req.json().catch(() => ({}))) as QueryBody;
    }
    const action: Action = body.action ?? "status";

    if (!TOKEN) return notConnected("no_credential");

    const encoded = encodeURIComponent(PROPERTY);

    if (action === "status") {
      const sites = await gsc("/sites");
      if (!sites.ok) {
        return notConnected("google_rejected_token", {
          google_status: sites.status,
        });
      }
      const list =
        ((sites.body as { siteEntry?: { siteUrl: string; permissionLevel: string }[] })
          ?.siteEntry ?? []);
      const match = list.find((s) => s.siteUrl === PROPERTY);
      if (!match) {
        return notConnected("property_not_in_account", {
          visible_properties: list.map((s) => s.siteUrl).slice(0, 20),
        });
      }
      return Response.json({
        connected: true,
        property: PROPERTY,
        permission: match.permissionLevel,
        visible_properties: list.map((s) => s.siteUrl),
      });
    }

    if (action === "sitemaps") {
      const res = await gsc(`/sites/${encoded}/sitemaps`);
      if (!res.ok) {
        return notConnected("google_rejected_request", { google_status: res.status });
      }
      return Response.json({ connected: true, property: PROPERTY, sitemaps: res.body });
    }

    const startDate = body.startDate ?? isoDaysAgo(28);
    const endDate = body.endDate ?? isoDaysAgo(1);
    const dimensions = body.dimensions?.length ? body.dimensions : ["query"];
    const rowLimit = Math.min(body.rowLimit ?? 50, 250);

    const res = await gsc(`/sites/${encoded}/searchAnalytics/query`, {
      method: "POST",
      body: JSON.stringify({ startDate, endDate, dimensions, rowLimit }),
    });
    if (!res.ok) {
      return notConnected("google_rejected_request", {
        google_status: res.status,
        google_error: res.body,
      });
    }

    const rows =
      ((res.body as { rows?: { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number }[] })
        ?.rows ?? []).map((r) => ({
        key: r.keys?.join(" / ") ?? "",
        keys: r.keys ?? [],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      }));

    const totals = rows.reduce(
      (acc, r) => {
        acc.clicks += r.clicks;
        acc.impressions += r.impressions;
        acc.positionWeighted += r.position * r.impressions;
        return acc;
      },
      { clicks: 0, impressions: 0, positionWeighted: 0 },
    );

    return Response.json({
      connected: true,
      property: PROPERTY,
      startDate,
      endDate,
      dimensions,
      rows,
      totals: {
        clicks: totals.clicks,
        impressions: totals.impressions,
        ctr: totals.impressions ? totals.clicks / totals.impressions : 0,
        position: totals.impressions ? totals.positionWeighted / totals.impressions : 0,
      },
    });
  }),
);
