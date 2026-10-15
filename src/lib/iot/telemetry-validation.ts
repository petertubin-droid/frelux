// =========================================================
// FRELUX ENGINE #7 — IoT & TELEMETRY VALIDATION (M1)
//
// Strict, deterministic validation for device telemetry:
//   * every reading must name a registered metric WITH its
//     paired unit — no free-form feeds
//   * values outside plausible physical ranges are flagged
//     suspect, never silently accepted as valid
//   * timestamps must be UTC ISO 8601, recent, and never in
//     the future (clock-skew tolerance only)
//   * payload shape limits prevent abuse of the ingest API
//
// MIRRORED REGISTRY: the iot-ingest edge function carries its
// own copy of METRIC_REGISTRY (Deno cannot import from src/).
// `iot-registry-sync.test.ts` fails the suite if the two drift.
// =========================================================

export type IotMetric =
  | "concrete_temp_c"
  | "ambient_temp_c"
  | "humidity_pct"
  | "concrete_maturity_index"
  | "vibration_mm_s"
  | "gps_lat_deg"
  | "gps_lng_deg"
  | "equipment_hours";

export type IotUnit =
  | "celsius"
  | "percent"
  | "celsius_hours"
  | "mm_s"
  | "degrees"
  | "hours";

export interface MetricSpec {
  metric: IotMetric;
  unit: IotUnit;
  /** Plausible physical bounds; outside => suspect (stored, flagged) */
  min: number;
  max: number;
  /** Readings that drive safety-relevant conclusions are named */
  safety_relevant: boolean;
  description: string;
}

export const METRIC_REGISTRY: MetricSpec[] = [
  {
    metric: "concrete_temp_c",
    unit: "celsius",
    min: -20,
    max: 110,
    safety_relevant: true,
    description: "In-place concrete temperature at the sensor.",
  },
  {
    metric: "ambient_temp_c",
    unit: "celsius",
    min: -60,
    max: 60,
    safety_relevant: false,
    description: "Ambient air temperature at the device location.",
  },
  {
    metric: "humidity_pct",
    unit: "percent",
    min: 0,
    max: 100,
    safety_relevant: false,
    description: "Relative humidity.",
  },
  {
    metric: "concrete_maturity_index",
    unit: "celsius_hours",
    min: 0,
    max: 20000,
    safety_relevant: true,
    description:
      "Nurse-Saul maturity index (Σ(T − T0)Δt, datum T0 = −10 °C) reported by the sensor.",
  },
  {
    metric: "vibration_mm_s",
    unit: "mm_s",
    min: 0,
    max: 500,
    safety_relevant: true,
    description: "Peak particle / structural vibration velocity.",
  },
  {
    metric: "gps_lat_deg",
    unit: "degrees",
    min: -90,
    max: 90,
    safety_relevant: false,
    description: "Device latitude in decimal degrees.",
  },
  {
    metric: "gps_lng_deg",
    unit: "degrees",
    min: -180,
    max: 180,
    safety_relevant: false,
    description: "Device longitude in decimal degrees.",
  },
  {
    metric: "equipment_hours",
    unit: "hours",
    min: 0,
    max: 100000,
    safety_relevant: false,
    description: "Cumulative equipment operating hours.",
  },
];

export const METRIC_BY_NAME: Record<string, MetricSpec> = Object.fromEntries(
  METRIC_REGISTRY.map((m) => [m.metric, m]),
);

/** Ingest batch limits — enforced identically client and server side. */
export const INGEST_LIMITS = {
  maxReadingsPerBatch: 500,
  /** readings older than this are rejected, not stored */
  maxReadingAgeDays: 30,
  /** clock-skew tolerance for future-stamped readings */
  futureToleranceMinutes: 5,
} as const;

export type ReadingInput = {
  metric: unknown;
  value: unknown;
  unit: unknown;
  recorded_at: unknown;
};

export type ReadingVerdict =
  | { status: "valid" }
  | { status: "suspect"; reason: string }
  | { status: "rejected"; reason: string };

/**
 * Validate one reading against the registry. Deterministic and pure:
 * same input always yields the same verdict.
 */
export function validateReading(
  reading: ReadingInput,
  now: Date = new Date(),
): ReadingVerdict {
  const { metric, value, unit, recorded_at } = reading;

  if (typeof metric !== "string") {
    return { status: "rejected", reason: "metric must be a string" };
  }
  const spec = METRIC_BY_NAME[metric];
  if (!spec) {
    return {
      status: "rejected",
      reason: `unknown metric "${metric}" — no free-form feeds`,
    };
  }
  if (unit !== spec.unit) {
    return {
      status: "rejected",
      reason: `metric "${metric}" requires unit "${spec.unit}", got "${String(unit)}"`,
    };
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { status: "rejected", reason: "value must be a finite number" };
  }
  if (typeof recorded_at !== "string") {
    return { status: "rejected", reason: "recorded_at must be an ISO string" };
  }
  const ts = new Date(recorded_at);
  if (Number.isNaN(ts.getTime())) {
    return { status: "rejected", reason: "recorded_at is not a valid date" };
  }
  const skewMs = ts.getTime() - now.getTime();
  if (skewMs > INGEST_LIMITS.futureToleranceMinutes * 60_000) {
    return {
      status: "rejected",
      reason: "recorded_at is in the future beyond clock-skew tolerance",
    };
  }
  const ageDays = (now.getTime() - ts.getTime()) / 86_400_000;
  if (ageDays > INGEST_LIMITS.maxReadingAgeDays) {
    return {
      status: "rejected",
      reason: `reading older than ${INGEST_LIMITS.maxReadingAgeDays} days`,
    };
  }
  if (value < spec.min || value > spec.max) {
    return {
      status: "suspect",
      reason: `value outside plausible range ${spec.min}..${spec.max} ${spec.unit}`,
    };
  }
  return { status: "valid" };
}

export type TelemetryPayload = {
  device_id: string;
  api_key: string;
  readings: ReadingInput[];
};

export type PayloadCheck =
  | { ok: true; readings: ReadingInput[] }
  | { ok: false; error: string };

/** Envelope-level validation before per-reading checks. */
export function validatePayloadShape(payload: unknown): PayloadCheck {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, error: "payload must be an object" };
  }
  const p = payload as Record<string, unknown>;
  if (typeof p.device_id !== "string" || !/^[0-9a-f-]{36}$/i.test(p.device_id)) {
    return { ok: false, error: "device_id must be a UUID string" };
  }
  if (typeof p.api_key !== "string" || p.api_key.length < 20) {
    return { ok: false, error: "api_key missing or malformed" };
  }
  if (!Array.isArray(p.readings) || p.readings.length === 0) {
    return { ok: false, error: "readings must be a non-empty array" };
  }
  if (p.readings.length > INGEST_LIMITS.maxReadingsPerBatch) {
    return {
      ok: false,
      error: `readings exceed batch limit of ${INGEST_LIMITS.maxReadingsPerBatch}`,
    };
  }
  return { ok: true, readings: p.readings as ReadingInput[] };
}
