import { describe, expect, it } from "vitest";
import {
  INGEST_LIMITS,
  METRIC_REGISTRY,
  validatePayloadShape,
  validateReading,
} from "./telemetry-validation";

const now = new Date("2026-10-15T12:00:00Z");
const ts = "2026-10-15T11:00:00Z";
const reading = {
  metric: "concrete_temp_c",
  value: 24.5,
  unit: "celsius",
  recorded_at: ts,
};

describe("IoT telemetry validation (engine #7 M1)", () => {
  it("accepts a registered metric with paired unit and in-range value", () => {
    expect(validateReading(reading, now)).toEqual({ status: "valid" });
  });

  it("rejects unknown metrics outright — no free-form feeds", () => {
    const v = validateReading(
      { ...reading, metric: "vibes", unit: "celsius" },
      now,
    );
    expect(v.status).toBe("rejected");
  });

  it("rejects a metric/unit mismatch", () => {
    const v = validateReading(
      { ...reading, unit: "percent" },
      now,
    );
    expect(v.status).toBe("rejected");
    expect(v).toMatchObject({ reason: /requires unit "celsius"/ });
  });

  it("rejects non-finite values", () => {
    expect(
      validateReading({ ...reading, value: Number.NaN }, now).status,
    ).toBe("rejected");
    expect(
      validateReading({ ...reading, value: "hot" as unknown }, now).status,
    ).toBe("rejected");
  });

  it("flags out-of-plausible-range values as suspect, with the range in the reason", () => {
    const v = validateReading({ ...reading, value: 500 }, now);
    expect(v.status).toBe("suspect");
    expect(v).toMatchObject({ reason: /-20\.\.110 celsius/ });
  });

  it("rejects future timestamps beyond the clock-skew tolerance", () => {
    const v = validateReading(
      { ...reading, recorded_at: "2026-10-15T12:10:00Z" },
      now,
    );
    expect(v.status).toBe("rejected");
    expect(v).toMatchObject({ reason: /future/ });
  });

  it("accepts timestamps within the skew tolerance", () => {
    const v = validateReading(
      { ...reading, recorded_at: "2026-10-15T12:03:00Z" },
      now,
    );
    expect(v.status).toBe("valid");
  });

  it("rejects readings older than the retention window", () => {
    const v = validateReading(
      { ...reading, recorded_at: "2026-09-01T00:00:00Z" },
      now,
    );
    expect(v.status).toBe("rejected");
    expect(v).toMatchObject({ reason: /older than 30 days/ });
  });

  it("rejects malformed dates", () => {
    expect(
      validateReading({ ...reading, recorded_at: "yesterday-ish" }, now)
        .status,
    ).toBe("rejected");
  });

  it("validates the payload envelope: uuid, key, batch limit", () => {
    const ok = validatePayloadShape({
      device_id: "b7f0f6f0-1a1a-4a1a-9a1a-1a1a1a1a1a1a",
      api_key: "flx_live_abcdefghijklmnopqrstuvwxyz",
      readings: [reading],
    });
    expect(ok.ok).toBe(true);

    expect(validatePayloadShape(null).ok).toBe(false);
    expect(
      validatePayloadShape({ device_id: "not-a-uuid", api_key: "x".repeat(24), readings: [] }).ok,
    ).toBe(false);
    expect(
      validatePayloadShape({
        device_id: "b7f0f6f0-1a1a-4a1a-9a1a-1a1a1a1a1a1a",
        api_key: "flx_live_abcdefghijklmnopqrstuvwxyz",
        readings: [],
      }).ok,
    ).toBe(false);
    expect(
      validatePayloadShape({
        device_id: "b7f0f6f0-1a1a-4a1a-9a1a-1a1a1a1a1a1a",
        api_key: "flx_live_abcdefghijklmnopqrstuvwxyz",
        readings: Array(INGEST_LIMITS.maxReadingsPerBatch + 1).fill(reading),
      }).ok,
    ).toBe(false);
  });

  it("every registry metric names its safety relevance explicitly", () => {
    for (const spec of METRIC_REGISTRY) {
      expect(typeof spec.safety_relevant).toBe("boolean");
      expect(spec.min < spec.max).toBe(true);
      expect(spec.description.length).toBeGreaterThan(0);
    }
    // safety-relevant metrics are the ones we must never guess about
    expect(
      METRIC_REGISTRY.filter((m) => m.safety_relevant).map((m) => m.metric),
    ).toEqual(
      expect.arrayContaining(["concrete_temp_c", "concrete_maturity_index", "vibration_mm_s"]),
    );
  });

  it("is deterministic: the same input always yields the same verdict", () => {
    const first = validateReading({ ...reading, value: 500 }, now);
    const second = validateReading({ ...reading, value: 500 }, now);
    expect(first).toEqual(second);
  });
});
