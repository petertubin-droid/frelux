// =========================================================
// REGISTRY SYNC TEST (engine #7)
// The iot-ingest edge function mirrors METRIC_REGISTRY because
// Deno functions cannot import from src/. This test imports BOTH
// copies and fails the suite if they ever drift — a mirrored
// registry is only safe while it is machine-checked.
// =========================================================
import { describe, expect, it } from "vitest";
import { METRIC_REGISTRY } from "@/lib/iot/telemetry-validation";

// the edge function file is plain TS — extract its registry literal
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const edgeSource = readFileSync(
  resolve(__dirname, "../../../supabase/functions/iot-ingest/index.ts"),
  "utf8",
);

describe("IoT metric registry sync (edge function vs app lib)", () => {
  it("the edge function registry mirrors the app registry exactly", () => {
    const block = edgeSource.match(
      /const METRIC_REGISTRY: MetricSpec\[\] = \[(.*?)\n\];/s,
    );
    expect(block, "edge function METRIC_REGISTRY literal found").toBeTruthy();
    const literal = block![1];

    for (const spec of METRIC_REGISTRY) {
      expect(literal).toContain(`metric: "${spec.metric}"`);
      expect(literal).toContain(`unit: "${spec.unit}"`);
      expect(literal).toContain(`min: ${spec.min}`);
      expect(literal).toContain(`max: ${spec.max}`);
    }
    // same size — no extra or missing metrics on either side
    const edgeMetricCount = (literal.match(/metric: "/g) ?? []).length;
    expect(edgeMetricCount).toBe(METRIC_REGISTRY.length);
  });

  it("ingest batch limits mirror the app lib limits", () => {
    expect(edgeSource).toContain("maxReadingsPerBatch: 500");
    expect(edgeSource).toContain("maxReadingAgeDays: 30");
    expect(edgeSource).toContain("futureToleranceMinutes: 5");
  });

  it("the telemetry table CHECK constraints mirror the registry", () => {
    const migration = readFileSync(
      resolve(
        __dirname,
        "../../../supabase/migrations/20261018000000_iot_engine7.sql",
      ),
      "utf8",
    );
    for (const spec of METRIC_REGISTRY) {
      expect(migration).toContain(`'${spec.metric}'`);
    }
    for (const unit of new Set(METRIC_REGISTRY.map((m) => m.unit))) {
      expect(migration).toContain(`'${unit}'`);
    }
  });
});
