import { serveWithCors } from "../_shared/serve.ts";
import {
  checkRateLimit,
  getRateLimitKey,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";
import { rateLimitedResponse } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const METRICS = new Set(["LCP", "CLS", "INP", "TTFB", "FCP"]);
const RATINGS = new Set(["good", "needs-improvement", "poor"]);
const DEVICES = new Set(["phone", "tablet", "desktop"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Field performance intake.
 *
 * Accepts one Core Web Vitals measurement per call and stores it. Values are
 * validated against the metric's own plausible range so a typo or a fuzzer
 * cannot poison the averages: LCP and TTFB in milliseconds, CLS unitless,
 * INP in milliseconds.
 */
serveWithCors(async (req: Request) => {
  const rl = checkRateLimit(await getRateLimitKey(req), RATE_LIMITS.GENERAL);
  if (!rl.allowed) return rateLimitedResponse(rl.resetAt);
  if (req.method === "OPTIONS") return new Response(null, { status: 200 });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const metric = String(body.metric ?? "");
  const rating = String(body.rating ?? "");
  const value = Number(body.value);
  const path = String(body.path ?? "").slice(0, 200);

  if (!METRICS.has(metric)) return json({ error: "Unknown metric" }, 400);
  if (!RATINGS.has(rating)) return json({ error: "Unknown rating" }, 400);
  if (!Number.isFinite(value) || value < 0)
    return json({ error: "Bad value" }, 400);
  if (metric === "CLS" ? value > 10 : value > 600_000) {
    return json({ error: "Value out of range" }, 400);
  }
  if (!path.startsWith("/")) return json({ error: "Bad path" }, 400);

  const device = DEVICES.has(String(body.device)) ? String(body.device) : null;
  const connection =
    typeof body.connection === "string" ? body.connection.slice(0, 20) : null;
  const buildVersion =
    typeof body.buildVersion === "string"
      ? body.buildVersion.slice(0, 40)
      : null;

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { error } = await supabase.from("web_vitals").insert({
    metric,
    value,
    rating,
    path,
    device,
    connection,
    build_version: buildVersion,
  });
  if (error) return json({ error: "Could not record measurement" }, 500);

  return json({ ok: true });
});
