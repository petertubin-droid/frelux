// =========================================================
// Ported: seo-search-console
//
// Reads Google's own Search Analytics and sitemap endpoints and nothing else.
// Credential resolution mirrors _shared/google-auth.ts: service account key
// (RS256 JWT signed with Web Crypto, which Workers do natively), then OAuth
// refresh token, then a static access token. With no usable credential it
// answers connected:false and says why - it never invents a metric.
// =========================================================

import { type EdgeContext, type EdgeEnv, json } from "./runtime";

const GSC_API = "https://www.googleapis.com/webmasters/v3";

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

const str = (env: EdgeEnv, key: string): string =>
  typeof env[key] === "string" ? (env[key] as string) : "";

function b64url(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

let cached: { value: string; expiresAt: number } | null = null;

async function serviceAccountToken(env: EdgeEnv): Promise<{ token: string; error: string }> {
  const raw = str(env, "GOOGLE_SERVICE_ACCOUNT_JSON") || str(env, "GOOGLE_APPLICATION_CREDENTIALS");
  if (!raw) return { token: "", error: "" };
  let sa: { client_email?: string; private_key?: string } = {};
  try {
    sa = JSON.parse(raw);
  } catch {
    return { token: "", error: "service_account_json_invalid" };
  }
  if (!sa.client_email || !sa.private_key) return { token: "", error: "service_account_incomplete" };
  try {
    const issued = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = b64url(
      JSON.stringify({
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/webmasters.readonly",
        aud: "https://oauth2.googleapis.com/token",
        iat: issued,
        exp: issued + 3600,
      }),
    );
    const key = await crypto.subtle.importKey(
      "pkcs8",
      pemToPkcs8(sa.private_key),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(`${header}.${claims}`),
    );
    const assertion = `${header}.${claims}.${b64url(new Uint8Array(signature))}`;
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    const payload = (await res.json().catch(() => null)) as { access_token?: string; error_description?: string } | null;
    if (!res.ok || !payload?.access_token) {
      return { token: "", error: payload?.error_description ?? "service_account_token_failed" };
    }
    cached = { value: payload.access_token, expiresAt: Date.now() + 50 * 60_000 };
    return { token: payload.access_token, error: "" };
  } catch (error) {
    return { token: "", error: error instanceof Error ? error.message : "service_account_error" };
  }
}

async function googleToken(env: EdgeEnv): Promise<{ token: string; error: string }> {
  if (cached && cached.expiresAt > Date.now()) return { token: cached.value, error: "" };
  const sa = await serviceAccountToken(env);
  if (sa.token || sa.error) return sa;

  const clientId = str(env, "GOOGLE_CLIENT_ID");
  const clientSecret = str(env, "GOOGLE_CLIENT_SECRET");
  const refreshToken = str(env, "GOOGLE_REFRESH_TOKEN");
  if (clientId && clientSecret && refreshToken) {
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });
      const payload = (await res.json().catch(() => null)) as { access_token?: string; error_description?: string } | null;
      if (res.ok && payload?.access_token) {
        cached = { value: payload.access_token, expiresAt: Date.now() + 50 * 60_000 };
        return { token: payload.access_token, error: "" };
      }
      return { token: "", error: payload?.error_description ?? "refresh_failed" };
    } catch (error) {
      return { token: "", error: error instanceof Error ? error.message : "refresh_error" };
    }
  }

  const staticToken = str(env, "GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN");
  if (staticToken) return { token: staticToken, error: "" };
  return { token: "", error: "" };
}

async function gsc(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${GSC_API}${path}`, {
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

function notConnected(reason: string, cors: Record<string, string>, property: string, extra: Record<string, unknown> = {}) {
  return json(
    {
      connected: false,
      property,
      reason,
      setup:
        "Set GOOGLE_SERVICE_ACCOUNT_JSON to a service account key whose address is a user on the property, or GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN, then redeploy the Worker.",
      ...extra,
    },
    200,
    cors,
  );
}

export async function handleSeoSearchConsole(
  request: Request,
  env: EdgeEnv,
  _ctx: EdgeContext,
  cors: Record<string, string>,
): Promise<Response> {
  const property = str(env, "GSC_PROPERTY") || "https://freluxtools.com/";
  let body: QueryBody = {};
  if (request.method === "POST") {
    body = ((await request.json().catch(() => ({}))) ?? {}) as QueryBody;
  }
  const action: Action = body.action ?? "status";

  const { token, error: authError } = await googleToken(env);
  if (!token) {
    return notConnected("no_credential", cors, property, authError ? { auth_error: authError } : {});
  }

  const encoded = encodeURIComponent(property);

  if (action === "status") {
    const sites = await gsc(token, "/sites");
    if (!sites.ok) return notConnected("google_rejected_token", cors, property, { google_status: sites.status });
    const list =
      (sites.body as { siteEntry?: { siteUrl: string; permissionLevel: string }[] } | null)?.siteEntry ?? [];
    const match = list.find((s) => s.siteUrl === property);
    if (!match) {
      return notConnected("property_not_in_account", cors, property, {
        visible_properties: list.map((s) => s.siteUrl).slice(0, 20),
      });
    }
    return json(
      {
        connected: true,
        property,
        permission: match.permissionLevel,
        visible_properties: list.map((s) => s.siteUrl),
      },
      200,
      cors,
    );
  }

  if (action === "sitemaps") {
    const res = await gsc(token, `/sites/${encoded}/sitemaps`);
    if (!res.ok) return notConnected("google_rejected_request", cors, property, { google_status: res.status });
    return json({ connected: true, property, sitemaps: res.body }, 200, cors);
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
    return notConnected("google_rejected_request", cors, property, {
      google_status: res.status,
      google_error: res.body,
    });
  }

  const rows = (
    (res.body as { rows?: { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number }[] } | null)
      ?.rows ?? []
  ).map((r) => ({
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

  return json(
    {
      connected: true,
      property,
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
    },
    200,
    cors,
  );
}

export const seoSearchConsoleConfig = {
  name: "seo-search-console",
  methods: ["POST"] as const,
  requiredBindings: [] as const,
  handler: handleSeoSearchConsole,
};
