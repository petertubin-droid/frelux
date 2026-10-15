// =========================================================
// FRELUX ENGINE #7 — IoT TELEMETRY INGESTION (M1)
//
// The ONLY write path for device telemetry. There is no
// authenticated-user INSERT policy on iot_telemetry; this
// function authenticates the DEVICE by id + API key (stored
// hashed) and gates on explicit consent:
//   1. payload envelope validation (uuid, key, batch limits)
//   2. device exists, is active, consent_granted_at is set,
//      key hash matches
//   3. per-reading strict validation (metric registry, paired
//      unit, plausible ranges => quality_flag, freshness)
//   4. valid + suspect rows stored with quality_flag; rejected
//      readings are reported back and NEVER stored
//
// MIRRORED REGISTRY: METRIC_REGISTRY mirrors
// src/lib/iot/telemetry-validation.ts (Deno cannot import
// from src/). iot-registry-sync.test.ts fails the suite if
// the two copies drift.
// =========================================================
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitHeaders,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";
import { serveWithCors } from "../_shared/serve.ts";

type IotMetric =
  | "concrete_temp_c"
  | "ambient_temp_c"
  | "humidity_pct"
  | "concrete_maturity_index"
  | "vibration_mm_s"
  | "gps_lat_deg"
  | "gps_lng_deg"
  | "equipment_hours";

interface MetricSpec {
  metric: IotMetric;
  unit: "celsius" | "percent" | "celsius_hours" | "mm_s" | "degrees" | "hours";
  min: number;
  max: number;
}

const METRIC_REGISTRY: MetricSpec[] = [
  { metric: "concrete_temp_c", unit: "celsius", min: -20, max: 110 },
  { metric: "ambient_temp_c", unit: "celsius", min: -60, max: 60 },
  { metric: "humidity_pct", unit: "percent", min: 0, max: 100 },
  { metric: "concrete_maturity_index", unit: "celsius_hours", min: 0, max: 20000 },
  { metric: "vibration_mm_s", unit: "mm_s", min: 0, max: 500 },
  { metric: "gps_lat_deg", unit: "degrees", min: -90, max: 90 },
  { metric: "gps_lng_deg", unit: "degrees", min: -180, max: 180 },
  { metric: "equipment_hours", unit: "hours", min: 0, max: 100000 },
];

const METRIC_BY_NAME = new Map(METRIC_REGISTRY.map((m) => [m.metric, m]));

const LIMITS = {
  maxReadingsPerBatch: 500,
  maxReadingAgeDays: 30,
  futureToleranceMinutes: 5,
} as const;

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface ReadingResult {
  index: number;
  status: "stored" | "suspect" | "rejected";
  reason?: string;
}

function jsonResponse(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...rateLimitHeaders(headers), "Content-Type": "application/json" },
  });
}

function validateReadingShape(
  reading: Record<string, unknown>,
  now: number,
): { ok: true } | { ok: false; reason: string } {
  const spec = METRIC_BY_NAME.get(reading.metric as string);
  if (!spec) {
    return { ok: false, reason: `unknown metric "${String(reading.metric)}"` };
  }
  if (reading.unit !== spec.unit) {
    return {
      ok: false,
      reason: `metric "${spec.metric}" requires unit "${spec.unit}", got "${String(reading.unit)}"`,
    };
  }
  const value = reading.value;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { ok: false, reason: "value must be a finite number" };
  }
  if (typeof reading.recorded_at !== "string") {
    return { ok: false, reason: "recorded_at must be an ISO string" };
  }
  const ts = Date.parse(reading.recorded_at);
  if (Number.isNaN(ts)) {
    return { ok: false, reason: "recorded_at is not a valid date" };
  }
  if (ts - now > LIMITS.futureToleranceMinutes * 60_000) {
    return { ok: false, reason: "recorded_at is in the future beyond clock-skew tolerance" };
  }
  if ((now - ts) / 86_400_000 > LIMITS.maxReadingAgeDays) {
    return { ok: false, reason: `reading older than ${LIMITS.maxReadingAgeDays} days` };
  }
  if (value < spec.min || value > spec.max) {
    return {
      ok: false,
      suspect: true,
      reason: `value outside plausible range ${spec.min}..${spec.max} ${spec.unit}`,
    } as { ok: false; suspect: boolean; reason: string };
  }
  return { ok: true };
}

serveWithCors(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200 });
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const rlKey = await getRateLimitKey(req);
  const rl = checkRateLimit(rlKey, RATE_LIMITS.GENERAL);
  const rlHeaders = rateLimitHeaders(rl.remaining, rl.resetAt);
  if (!rl.allowed) {
    return jsonResponse({ error: "Rate limit exceeded" }, 429, rlHeaders);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Body must be JSON" }, 400, rlHeaders);
  }

  const deviceId = payload.device_id;
  const apiKey = payload.api_key;
  if (typeof deviceId !== "string" || !/^[0-9a-f-]{36}$/i.test(deviceId)) {
    return jsonResponse({ error: "device_id must be a UUID string" }, 400, rlHeaders);
  }
  if (typeof apiKey !== "string" || apiKey.length < 20) {
    return jsonResponse({ error: "api_key missing or malformed" }, 400, rlHeaders);
  }
  const readings = payload.readings;
  if (!Array.isArray(readings) || readings.length === 0) {
    return jsonResponse({ error: "readings must be a non-empty array" }, 400, rlHeaders);
  }
  if (readings.length > LIMITS.maxReadingsPerBatch) {
    return jsonResponse(
      { error: `readings exceed batch limit of ${LIMITS.maxReadingsPerBatch}` },
      413,
      rlHeaders,
    );
  }

  // Service role: the device table is read here only for auth +
  // consent checks; telemetry inserts also require it.
  const service = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const { data: device, error: deviceErr } = await service
    .from("iot_devices")
    .select("id, status, consent_granted_at, api_key_hash")
    .eq("id", deviceId)
    .maybeSingle();
  if (deviceErr) {
    return jsonResponse(
      { error: "Lookup failed", detail: deviceErr.message },
      500,
      rlHeaders,
    );
  }
  if (!device) {
    return jsonResponse({ error: "Unknown device" }, 404, rlHeaders);
  }
  const keyHash = await sha256Hex(apiKey);
  // constant-time-ish compare: hash comparison over hex strings
  if (keyHash !== device.api_key_hash) {
    return jsonResponse({ error: "Invalid device credentials" }, 401, rlHeaders);
  }
  if (device.status !== "active") {
    return jsonResponse(
      { error: `Device is ${device.status}; ingestion refused` },
      409,
      rlHeaders,
    );
  }
  if (!device.consent_granted_at) {
    return jsonResponse(
      { error: "Device has no recorded data-collection consent; ingestion refused" },
      409,
      rlHeaders,
    );
  }

  const now = Date.now();
  const results: ReadingResult[] = [];
  const toInsert: {
    device_id: string;
    recorded_at: string;
    metric: string;
    value: number;
    unit: string;
    quality_flag: "valid" | "suspect";
    notes: string | null;
  }[] = [];

  for (let i = 0; i < readings.length; i++) {
    const raw = readings[i];
    if (typeof raw !== "object" || raw === null) {
      results.push({ index: i, status: "rejected", reason: "reading must be an object" });
      continue;
    }
    const r = raw as Record<string, unknown>;
    const verdict = validateReadingShape(r, now);
    if (verdict.ok) {
      toInsert.push({
        device_id: deviceId,
        recorded_at: r.recorded_at as string,
        metric: r.metric as string,
        value: r.value as number,
        unit: r.unit as string,
        quality_flag: "valid",
        notes: null,
      });
      results.push({ index: i, status: "stored" });
    } else {
      const suspect = (verdict as { suspect?: boolean }).suspect === true;
      if (suspect) {
        toInsert.push({
          device_id: deviceId,
          recorded_at: r.recorded_at as string,
          metric: r.metric as string,
          value: r.value as number,
          unit: r.unit as string,
          quality_flag: "suspect",
          notes: verdict.reason,
        });
        results.push({ index: i, status: "suspect", reason: verdict.reason });
      } else {
        results.push({ index: i, status: "rejected", reason: verdict.reason });
      }
    }
  }

  if (toInsert.length > 0) {
    const { error: insertErr } = await service
      .from("iot_telemetry")
      .insert(toInsert);
    if (insertErr) {
      return jsonResponse(
        { error: "Ingestion failed", detail: insertErr.message },
        500,
        rlHeaders,
      );
    }
  }

  // touch last_seen_at (single UPDATE on the device row)
  await service
    .from("iot_devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", deviceId);

  return jsonResponse(
    {
      stored: results.filter((r) => r.status === "stored").length,
      suspect: results.filter((r) => r.status === "suspect").length,
      rejected: results.filter((r) => r.status === "rejected").length,
      results,
    },
    200,
    rlHeaders,
  );
});
