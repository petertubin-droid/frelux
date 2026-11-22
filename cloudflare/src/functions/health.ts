/**
 * GET /api/fn/health — native Worker port of supabase/functions/health.
 *
 * Same contract as the Supabase function: 200 when healthy, 503 when the
 * database probe fails, `checks` reporting database / ai_providers / payment.
 *
 * The database probe is a real row read (one row from a tiny public table),
 * not the REST root, because the root answers 401 for keys that are valid on
 * tables and that made the probe report a healthy database as down.
 *
 * `uptime_seconds` is the age of the isolate that answered, not of the
 * service: Workers recycle isolates freely, so treat it as a liveness hint.
 */
import { json, type ApiEnv } from "../api";

/**
 * Cloudflare freezes `Date.now()` while module scope is evaluated, so a
 * module-level timestamp reads as 0 and `uptime_seconds` came out as the
 * epoch. The clock starts on the first request instead.
 */
let startedAt: number | null = null;

interface HealthStatus {
  status: "healthy" | "degraded" | "down";
  timestamp: string;
  version: string;
  checks: {
    database: "up" | "down" | "unknown";
    ai_providers: "up" | "down" | "unknown";
    payment: "up" | "down" | "unknown";
  };
  uptime_seconds: number;
}

/**
 * A key this Worker can authenticate to PostgREST with. Newer projects issue
 * secret keys as a JSON map under SUPABASE_SECRET_KEYS; the older service role
 * key is a JWT under SUPABASE_SERVICE_ROLE_KEY. Try the current shape first and
 * only send the JWT as a bearer token when it actually is one.
 */
export function probeHeaders(env: ApiEnv): Record<string, string> | null {
  const raw = env.SUPABASE_SECRET_KEYS;
  let key = "";
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      key = parsed.default ?? Object.values(parsed)[0] ?? "";
    } catch {
      key = raw.trim();
    }
  }
  if (!key) key = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!key) return null;

  const headers: Record<string, string> = { apikey: key };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  return headers;
}

export async function health(
  request: Request,
  env: ApiEnv,
  _url: URL,
  cors: Record<string, string> = {},
): Promise<Response> {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, 405, cors);
  }

  if (startedAt === null) startedAt = Date.now();

  const checks: HealthStatus["checks"] = {
    database: "unknown",
    ai_providers: "unknown",
    payment: "unknown",
  };
  let overallStatus: HealthStatus["status"] = "healthy";

  try {
    const headers = probeHeaders(env);
    if (env.SUPABASE_URL && headers) {
      const res = await fetch(
        `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/market_material_prices?select=id&limit=1`,
        { headers, signal: AbortSignal.timeout(3000) },
      );
      checks.database = res.ok ? "up" : "down";
      if (!res.ok) overallStatus = "degraded";
    }
  } catch {
    checks.database = "down";
    overallStatus = "degraded";
  }

  checks.ai_providers = env.GEMINI_API_KEY ? "up" : "unknown";
  checks.payment = env.PAYSTACK_SECRET_KEY ? "up" : "unknown";

  const body: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    checks,
    uptime_seconds: Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
  };

  return json(body, body.status === "down" ? 503 : 200, {
    ...cors,
    "cache-control": "public, max-age=30",
  });
}
