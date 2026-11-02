import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ALL_WITHIN_DISCLOSURE,
  NO_REVIEWED_THRESHOLD_DISCLOSURE,
  SAFETY_ALERT_DISCLOSURE,
  evaluateSafetyAlerts,
  type IotSafetyThresholdRow,
  type EvaluateSafetyAlertsInput,
} from "./safety-alerts";
import { METRIC_REGISTRY } from "./telemetry-validation";
import type { TelemetryRow } from "./device-client";
import { DEVICE_TYPES } from "./device-client";

const threshold = (over: Partial<IotSafetyThresholdRow>): IotSafetyThresholdRow => ({
  id: "t1",
  metric: "vibration_mm_s",
  device_type: null,
  market_code: null,
  threshold_value: 5,
  threshold_unit: "mm_s",
  direction: "above",
  basis: "Example reviewed basis, e.g. DIN 4150-3 derived limit",
  source_url: null,
  review_status: "approved",
  reviewer_name: "Eng. Reviewer",
  reviewer_credentials: "PE",
  review_notes: null,
  reviewed_at: "2026-10-14T00:00:00Z",
  created_at: "2026-10-13T00:00:00Z",
  updated_at: "2026-10-14T00:00:00Z",
  ...over,
});

const reading = (
  id: number,
  at: string,
  value: number,
  quality: TelemetryRow["quality_flag"] = "valid",
  metric = "vibration_mm_s",
): TelemetryRow => ({
  id,
  device_id: "d1",
  recorded_at: at,
  received_at: at,
  metric,
  value,
  unit: metric === "vibration_mm_s" ? "mm_s" : "celsius",
  quality_flag: quality,
  notes: null,
});

const input = (over: Partial<EvaluateSafetyAlertsInput> = {}): EvaluateSafetyAlertsInput => ({
  deviceType: "vibration_monitor",
  marketCode: "NG",
  telemetry: [],
  thresholds: [],
  ...over,
});

describe("evaluateSafetyAlerts (engine #7 M4)", () => {
  it("alerts only from APPROVED thresholds, with the full citation chain", () => {
    const v = evaluateSafetyAlerts(
      input({
        telemetry: [reading(1, "2026-10-15T08:00:00Z", 8.2)],
        thresholds: [threshold({})],
      }),
    ).find((x) => x.metric === "vibration_mm_s");
    expect(v?.verdict).toBe("alert");
    expect(v?.alerts).toHaveLength(1);
    const a = v?.alerts?.[0];
    expect(a?.latestValue).toBe(8.2);
    expect(a?.thresholdValue).toBe(5);
    expect(a?.reviewerName).toBe("Eng. Reviewer");
    expect(a?.disclosure).toBe(SAFETY_ALERT_DISCLOSURE);
  });

  it("pending and rejected thresholds NEVER drive an alert", () => {
    for (const status of ["pending", "rejected"] as const) {
      const v = evaluateSafetyAlerts(
        input({
          telemetry: [reading(1, "2026-10-15T08:00:00Z", 8.2)],
          thresholds: [threshold({ review_status: status })],
        }),
      ).find((x) => x.metric === "vibration_mm_s");
      expect(v?.verdict).toBe("no-reviewed-threshold");
      expect(v?.disclosure).toBe(NO_REVIEWED_THRESHOLD_DISCLOSURE);
    }
  });

  it("reports no-verdict honestly when no approved threshold exists", () => {
    const v = evaluateSafetyAlerts(
      input({ telemetry: [reading(1, "2026-10-15T08:00:00Z", 99)] }),
    );
    expect(v[0].verdict).toBe("no-reviewed-threshold");
    expect(v[0].disclosure).toMatch(/never invents default safety limits/);
  });

  it("suspect readings never trigger safety alerts", () => {
    const v = evaluateSafetyAlerts(
      input({
        telemetry: [reading(1, "2026-10-15T08:00:00Z", 500, "suspect")],
        thresholds: [threshold({})],
      }),
    );
    expect(v).toHaveLength(0); // no valid readings at all -> no verdict entries
  });

  it("respects device-type and market scoping (NULL = any)", () => {
    const v = evaluateSafetyAlerts(
      input({
        telemetry: [reading(1, "2026-10-15T08:00:00Z", 8.2)],
        thresholds: [threshold({ device_type: "weather_station" })],
      }),
    );
    expect(v[0].verdict).toBe("no-reviewed-threshold");

    const v2 = evaluateSafetyAlerts(
      input({
        telemetry: [reading(1, "2026-10-15T08:00:00Z", 8.2)],
        thresholds: [threshold({ market_code: "KE" })],
      }),
    );
    expect(v2[0].verdict).toBe("no-reviewed-threshold");

    const v3 = evaluateSafetyAlerts(
      input({
        telemetry: [reading(1, "2026-10-15T08:00:00Z", 8.2)],
        thresholds: [threshold({ market_code: "NG" })],
      }),
    );
    expect(v3[0].verdict).toBe("alert");
  });

  it("ignores thresholds whose unit disagrees with the metric registry", () => {
    const v = evaluateSafetyAlerts(
      input({
        telemetry: [reading(1, "2026-10-15T08:00:00Z", 8.2)],
        thresholds: [threshold({ threshold_unit: "celsius" })],
      }),
    );
    expect(v[0].verdict).toBe("no-reviewed-threshold");
  });

  it("supports 'below' direction thresholds", () => {
    const v = evaluateSafetyAlerts(
      input({
        telemetry: [reading(1, "2026-10-15T08:00:00Z", -15, "valid", "ambient_temp_c")],
        thresholds: [
          threshold({
            metric: "ambient_temp_c",
            threshold_value: 0,
            threshold_unit: "celsius",
            direction: "below",
          }),
        ],
      }),
    );
    expect(v[0].verdict).toBe("alert");
    expect(v[0].alerts?.[0].latestValue).toBe(-15);
  });

  it("reports latest and worst breach with a count", () => {
    const v = evaluateSafetyAlerts(
      input({
        telemetry: [
          reading(1, "2026-10-15T06:00:00Z", 6.0),
          reading(2, "2026-10-15T08:00:00Z", 12.0),
          reading(3, "2026-10-15T10:00:00Z", 3.0), // within
          reading(4, "2026-10-15T12:00:00Z", 7.5),
        ],
        thresholds: [threshold({})],
      }),
    );
    const a = v[0].alerts?.[0];
    expect(a?.breachCount).toBe(3);
    expect(a?.latestValue).toBe(7.5);
    expect(a?.worstValue).toBe(12.0);
    expect(a?.worstAt).toBe("2026-10-15T08:00:00Z");
  });

  it("discloses all-within honestly when approved thresholds exist but nothing breached", () => {
    const v = evaluateSafetyAlerts(
      input({
        telemetry: [reading(1, "2026-10-15T08:00:00Z", 2.0)],
        thresholds: [threshold({})],
      }),
    );
    expect(v[0].verdict).toBe("alert");
    expect(v[0].alerts).toHaveLength(0);
    expect(v[0].disclosure).toBe(ALL_WITHIN_DISCLOSURE);
  });
});

describe("iot_safety_thresholds migration sync (engine #7 M4)", () => {
  const migration = readFileSync(
    resolve(__dirname, "../../../supabase/migrations/20261019000000_iot_safety_thresholds.sql"),
    "utf8",
  );

  it("the migration CHECK mirrors METRIC_REGISTRY exactly", () => {
    const block = migration.match(/metric text NOT NULL CHECK \(metric IN \((.*?)\)\)/s);
    expect(block, "metric CHECK literal found").toBeTruthy();
    const literal = block![1];
    for (const spec of METRIC_REGISTRY) {
      expect(literal).toContain(`'${spec.metric}'`);
    }
    const metricCount = (literal.match(/'/g) ?? []).length / 2;
    expect(metricCount).toBe(METRIC_REGISTRY.length);
  });

  it("the migration CHECK mirrors DEVICE_TYPES exactly", () => {
    const block = migration.match(/device_type IS NULL OR device_type IN \((.*?)\)/s);
    expect(block, "device_type CHECK literal found").toBeTruthy();
    const literal = block![1];
    for (const t of DEVICE_TYPES) {
      expect(literal).toContain(`'${t}'`);
    }
    const typeCount = (literal.match(/'/g) ?? []).length / 2;
    expect(typeCount).toBe(DEVICE_TYPES.length);
  });

  it("RLS is enabled with admin-only writes and public read", () => {
    expect(migration).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/iot_safety_thresholds_public_read/);
    expect(migration).toMatch(/iot_safety_thresholds_admin_write[\s\S]*?public\.is_admin\(\)/);
  });
});
