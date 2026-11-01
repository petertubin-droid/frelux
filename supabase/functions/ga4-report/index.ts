// GA4 Data API bridge for the FRELUX admin traffic dashboard.
//
// A GA4 measurement ID (G-XXXXXXX) is write-only: it tells Google to collect
// events, it cannot read reports. Reading traffic therefore needs the GA4 Data
// API with a service account that has Viewer access to the property.
//
// Secrets required (set in Supabase → Edge Functions → Secrets):
//   GA4_PROPERTY_ID            numeric property id, e.g. 123456789
//   GA4_SERVICE_ACCOUNT_JSON   full service-account JSON (client_email + private_key)
//
// Without them the function answers { configured: false } and the dashboard
// quietly falls back to first-party pageview traffic.

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
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: clientEmail,
      scope: SCOPE,
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
): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const assertion = await signJwt(clientEmail, privateKey);
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

  let body: { days?: number } = {};
  try {
    body = (await req.json()) as { days?: number };
  } catch {
    body = {};
  }
  const days = Math.min(90, Math.max(1, Number(body.days) || 7));

  const propertyId = (Deno.env.get("GA4_PROPERTY_ID") ?? "").trim();
  const serviceAccountRaw = Deno.env.get("GA4_SERVICE_ACCOUNT_JSON") ?? "";

  if (!propertyId || !serviceAccountRaw) {
    return json({
      configured: false,
      reason:
        "Set GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_JSON to read GA4 reports.",
    });
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountRaw) as {
      client_email?: string;
      private_key?: string;
    };
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      return json({
        configured: false,
        reason: "Service account JSON incomplete.",
      });
    }

    const access = await accessToken(
      serviceAccount.client_email,
      serviceAccount.private_key,
    );
    const [totals, realtime] = await Promise.all([
      runReport(propertyId, access, days),
      realtimeUsers(propertyId, access),
    ]);

    return json({
      configured: true,
      propertyId,
      periodDays: days,
      ...totals,
      realtimeUsers: realtime,
    });
  } catch (err) {
    return json(
      {
        configured: true,
        error: err instanceof Error ? err.message : "GA4 request failed",
      },
      502,
    );
  }
});
