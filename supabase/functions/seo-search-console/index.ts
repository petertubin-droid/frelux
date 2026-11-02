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
const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
const REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN") ?? "";
const STATIC_TOKEN = Deno.env.get("GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN") ?? "";

let cachedToken: { value: string; expiresAt: number } | null = null;

/** Mint an access token per invocation. A refresh token keeps the dashboard
 *  working past the one hour life of a hand-copied access token; a static
 *  access token is still honoured so an existing deployment keeps running. */
async function accessToken(): Promise<string> {
  if (REFRESH_TOKEN && CLIENT_ID && CLIENT_SECRET) {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
      return cachedToken.value;
    }
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!res.ok || !data.access_token) return "";
    cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return data.access_token;
  }
  return STATIC_TOKEN;
}
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

async function gsc(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
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
        "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN for a Google account that owns or has access to the property, then redeploy this function.",
      ...extra,
    },
    { status: 200 },
  );
}

serveWithCors(async (req) => {
    let body: QueryBody = {};
    if (req.method === "POST") {
      body = (await req.json().catch(() => ({}))) as QueryBody;
    }
    const action: Action = body.action ?? "status";

    const token = await accessToken();
    if (!token) return notConnected("no_credential");

    const encoded = encodeURIComponent(PROPERTY);

    if (action === "status") {
      const sites = await gsc(token, "/sites");
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
      const res = await gsc(token, `/sites/${encoded}/sitemaps`);
      if (!res.ok) {
        return notConnected("google_rejected_request", { google_status: res.status });
      }
      return Response.json({ connected: true, property: PROPERTY, sitemaps: res.body });
    }

    const startDate = body.startDate ?? isoDaysAgo(28);
    const endDate = body.endDate ?? isoDaysAgo(1);
    const dimensions = body.dimensions?.length ? body.dimensions : ["query"];
    const rowLimit = Math.min(body.rowLimit ?? 50, 250);

    const res = await gsc(token, `/sites/${encoded}/searchAnalytics/query`, {
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
  });
