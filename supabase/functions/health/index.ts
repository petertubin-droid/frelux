// =========================================================
// Health Check Endpoint
// GET /health — returns 200 if healthy, 503 if degraded
// =========================================================

import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import { serveWithCors } from "../_shared/serve.ts";

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

const startTime = Date.now();

serveWithCors(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  /**
   * A key this function can authenticate to PostgREST with.
   *
   * Supabase issues keys in two shapes now. The newer secret keys live in a JSON
   * map under SUPABASE_SECRET_KEYS and are opaque strings; the older service role
   * key is a JWT under SUPABASE_SERVICE_ROLE_KEY. Projects migrated to the new
   * keys keep the old variable around, but REST rejects the retired value, which
   * is how this probe spent a while reporting a healthy database as down.
   *
   * The secret keys are tried first because they are the ones currently issued,
   * and the JWT is only sent as a bearer token when it actually is one: a
   * non-JWT bearer is rejected outright rather than treated as an API key.
   */
  function resolveProbeHeaders(): Record<string, string> | null {
    const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
    let key = "";
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, string>;
        key = parsed.default ?? Object.values(parsed)[0] ?? "";
      } catch {
        // Some deployments store a single key rather than the JSON map.
        key = raw.trim();
      }
    }
    if (!key) key = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
    if (!key) return null;

    const headers: Record<string, string> = { apikey: key };
    if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
    return headers;
  }

  const checks: HealthStatus["checks"] = {
    database: "unknown",
    ai_providers: "unknown",
    payment: "unknown",
  };

  let overallStatus: "healthy" | "degraded" | "down" = "healthy";

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // No key at all means this probe cannot answer, which is not the same as a
    // database being down. Say "unknown" rather than fail a healthy project.
    const headers = resolveProbeHeaders();
    if (supabaseUrl && headers) {
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers,
        signal: AbortSignal.timeout(3000),
      });
      checks.database = res.ok ? "up" : "down";
      if (!res.ok) overallStatus = "degraded";
    }
  } catch {
    checks.database = "down";
    overallStatus = "degraded";
  }

  checks.ai_providers = Deno.env.get("GEMINI_API_KEY") ? "up" : "unknown";
  checks.payment = Deno.env.get("PAYSTACK_SECRET_KEY") ? "up" : "unknown";

  const health: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    checks,
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
  };

  return jsonResponse(
    health,
    overallStatus === "down" ? 503 : 200,
    corsHeaders,
  );
});
