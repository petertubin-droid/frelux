// GA4 Data API bridge for the FRELUX admin traffic dashboard.
//
// A GA4 measurement ID (G-XXXXXXX) is write-only: it tells Google to collect
// events, it cannot read reports. Reading traffic therefore needs the GA4 Data
// API with a service account that has Viewer access to the property.
//
// Credentials, resolved in this order:
//   service account: GA4_SERVICE_ACCOUNT_JSON, then GOOGLE_SERVICE_ACCOUNT_JSON,
//                    then GOOGLE_APPLICATION_CREDENTIALS. The last two already
//                    exist for Search Console, so the same key can serve both
//                    once it is added as a viewer on the GA4 property.
//   property:        GA4_PROPERTY_ID when set, otherwise discovered through the
//                    GA4 Admin API from the properties the key can see.
//
// When either half is missing the function answers { configured: false } with a
// status code the dashboard can explain: no_credentials, api_disabled or
// no_property_access. It never invents numbers, and the dashboard falls back to
// first-party pageview traffic.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { serveWithCors } from "../_shared/serve.ts";

const corsHeaders = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

let cachedToken: { token: string; expiresAt: number } | null = null;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64url(input: Uint8Array | string): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function signJwt(
  clientEmail: string,
  privateKey: string,
  scope: string = SCOPE,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: clientEmail,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const pem = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const raw = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    raw,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(`${header}.${claims}`),
    ),
  );
  return `${header}.${claims}.${base64url(signature)}`;
}

async function accessToken(
  clientEmail: string,
  privateKey: string,
  scope: string = SCOPE,
): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const assertion = await signJwt(clientEmail, privateKey, scope);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed (${res.status})`);
  }
  const payload = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    token: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };
  return payload.access_token;
}

type Row = {
  dimensionValues?: { value: string }[];
  metricValues?: { value: string }[];
};

async function runReport(
  propertyId: string,
  token: string,
  days: number,
): Promise<Record<string, number>> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
        ],
      }),
    },
  );
  if (!res.ok) throw new Error(`GA4 report failed (${res.status})`);
  const payload = (await res.json()) as { rows?: Row[] };
  const values = payload.rows?.[0]?.metricValues ?? [];
  return {
    activeUsers: Number(values[0]?.value ?? 0),
    sessions: Number(values[1]?.value ?? 0),
    pageViews: Number(values[2]?.value ?? 0),
  };
}

async function realtimeUsers(
  propertyId: string,
  token: string,
): Promise<number> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ metrics: [{ name: "activeUsers" }] }),
    },
  );
  if (!res.ok) return 0;
  const payload = (await res.json()) as { rows?: Row[] };
  return Number(payload.rows?.[0]?.metricValues?.[0]?.value ?? 0);
}

type Ga4StatusCode =
  "ready" | "no_credentials" | "api_disabled" | "no_property_access" | "error";

interface Ga4Status {
  configured: boolean;
  code: Ga4StatusCode;
  reason: string;
  serviceAccount?: string;
  project?: string;
  propertyId?: string;
  propertyName?: string;
  steps: string[];
}

const ADMIN_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

interface ServiceAccount {
  client_email?: string;
  private_key?: string;
  project_id?: string;
}

/** Reads the first service-account secret that exists, preferring the GA4 one. */
function resolveServiceAccount(): ServiceAccount | null {
  const candidates = [
    "GA4_SERVICE_ACCOUNT_JSON",
    "GOOGLE_SERVICE_ACCOUNT_JSON",
    "GOOGLE_APPLICATION_CREDENTIALS",
  ];
  for (const name of candidates) {
    const raw = (Deno.env.get(name) ?? "").trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as ServiceAccount;
      if (parsed.client_email && parsed.private_key) return parsed;
    } catch {
      // A malformed secret is reported as missing credentials, not as a crash.
    }
  }
  return null;
}

function activationUrl(message: string): string | null {
  const match = message.match(
    /https:\/\/console\.developers\.google\.com[^"\s\\]+/,
  );
  return match ? match[0].replace(/\\/g, "") : null;
}

/** Lists the GA4 properties the key can see. Empty when it sees none. */
async function discoverProperty(
  token: string,
): Promise<
  | { ok: true; id: string; name: string }
  | { ok: false; code: "api_disabled" | "no_property_access"; reason: string }
> {
  const res = await fetch(
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=50",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const text = await res.text();
  if (!res.ok) {
    if (
      text.includes("SERVICE_DISABLED") ||
      text.includes("has not been used in project")
    ) {
      return {
        ok: false,
        code: "api_disabled",
        reason:
          "The GA4 Admin API is disabled on the Google Cloud project that owns the service account.",
      };
    }
    return {
      ok: false,
      code: "no_property_access",
      reason:
        "Google refused the Admin API call. The service account is probably not a user on any GA4 property.",
    };
  }
  const payload = JSON.parse(text) as {
    accountSummaries?: {
      propertySummaries?: { property?: string; displayName?: string }[];
    }[];
  };
  const summaries = (payload.accountSummaries ?? []).flatMap(
    (account) => account.propertySummaries ?? [],
  );
  const first = summaries.find((entry) => entry.property);
  if (!first?.property) {
    return {
      ok: false,
      code: "no_property_access",
      reason:
        "The service account is not a viewer on any GA4 property yet, so there is nothing to report.",
    };
  }
  return {
    ok: true,
    id: first.property.replace("properties/", ""),
    name: first.displayName ?? first.property,
  };
}

/** The status the dashboard renders: what works, and the exact missing step. */
async function readStatus(
  days: number,
  runQueries: boolean,
): Promise<{
  status: Ga4Status;
  totals?: Record<string, number>;
  realtime?: number;
}> {
  const account = resolveServiceAccount();
  if (!account) {
    return {
      status: {
        configured: false,
        code: "no_credentials",
        reason:
          "No service-account JSON is stored, so GA4 reports cannot be read.",
        steps: [
          "Create a service account key in Google Cloud with the Analytics Data API enabled.",
          "Save it as the GA4_SERVICE_ACCOUNT_JSON secret, then run this check again.",
        ],
      },
    };
  }

  const email = account.client_email;
  const explicitProperty = (Deno.env.get("GA4_PROPERTY_ID") ?? "").trim();
  let token: string;
  try {
    token = await accessToken(
      account.client_email!,
      account.private_key!,
      ADMIN_SCOPE,
    );
  } catch (err) {
    return {
      status: {
        configured: false,
        code: "error",
        reason:
          err instanceof Error ? err.message : "Google token exchange failed",
        serviceAccount: email,
        project: account.project_id,
        propertyId: explicitProperty || undefined,
        steps: [],
      },
    };
  }

  let propertyId = explicitProperty;
  let propertyName = explicitProperty ? `properties/${explicitProperty}` : "";

  if (!propertyId) {
    const discovered = await discoverProperty(token);
    if (!discovered.ok) {
      const url = activationUrl(discovered.reason);
      return {
        status: {
          configured: false,
          code: discovered.code,
          reason: discovered.reason,
          serviceAccount: email,
          project: account.project_id,
          steps:
            discovered.code === "api_disabled"
              ? [
                  `Enable the Analytics Admin API: https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com${account.project_id ? `?project=${account.project_id}` : ""}`,
                  `Enable the Analytics Data API: https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com${account.project_id ? `?project=${account.project_id}` : ""}`,
                  `Add ${email} as a Viewer on the GA4 property (Google Analytics, Admin, Property access management).`,
                  "Run this check again in a minute, no redeploy needed.",
                ]
              : [
                  `Add ${email} as a Viewer on the GA4 property in Google Analytics, Admin, Property access management.`,
                  "Enable the GA4 Admin API on the Google Cloud project that owns the key.",
                  "Run this check again, no redeploy needed.",
                ],
        },
      };
    }
    propertyId = discovered.id;
    propertyName = discovered.name;
  }

  if (!runQueries) {
    return {
      status: {
        configured: true,
        code: "ready",
        reason: `Reading GA4 property ${propertyName}.`,
        serviceAccount: email,
        project: account.project_id,
        propertyId,
        propertyName,
        steps: [],
      },
    };
  }

  try {
    const [totals, realtime] = await Promise.all([
      runReport(propertyId!, token, days),
      realtimeUsers(propertyId!, token),
    ]);
    return {
      status: {
        configured: true,
        code: "ready",
        reason: `Reading GA4 property ${propertyName}.`,
        serviceAccount: email,
        project: account.project_id,
        propertyId,
        propertyName,
        steps: [],
      },
      totals,
      realtime,
    };
  } catch (err) {
    return {
      status: {
        configured: false,
        code: "error",
        reason: err instanceof Error ? err.message : "GA4 request failed",
        serviceAccount: email,
        project: account.project_id,
        propertyId,
        steps: [],
      },
    };
  }
}

serveWithCors(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!url || !anon) return json({ error: "Not configured" }, 500);

  // Only admins may read traffic for the property.
  const asUser = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: isAdmin, error: adminError } = await asUser.rpc("is_admin");
  if (adminError) return json({ error: "Unauthorized" }, 401);
  if (isAdmin !== true) return json({ error: "Forbidden" }, 403);

  let body: { days?: number; statusOnly?: boolean } = {};
  try {
    body = (await req.json()) as { days?: number; statusOnly?: boolean };
  } catch {
    body = {};
  }
  const days = Math.min(90, Math.max(1, Number(body.days) || 7));
  const statusOnly = body.statusOnly === true;

  const { status, totals, realtime } = await readStatus(days, !statusOnly);

  if (!status.configured) {
    return json({ configured: false, propertyId: status.propertyId, status });
  }

  return json({
    configured: true,
    propertyId: status.propertyId,
    propertyName: status.propertyName,
    periodDays: days,
    status,
    ...(totals ?? {}),
    realtimeUsers: realtime ?? 0,
  });
});
