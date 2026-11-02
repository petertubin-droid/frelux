import { describe, expect, it } from "vitest";
import {
  classifySiteConditions,
  computeNurseSaulMaturity,
  VIBRATION_EVIDENCE_DISCLOSURE,
  type TelemetryRow,
} from "./signal-mapping";
import type { TelemetryRow as Row } from "@/lib/iot/device-client";

const row = (
  id: number,
  at: string,
  value: number,
  metric = "concrete_temp_c",
  quality: Row["quality_flag"] = "valid",
): TelemetryRow => ({
  id,
  device_id: "d1",
  recorded_at: at,
  received_at: at,
  metric,
  value,
  unit: metric === "humidity_pct" ? "percent" : "celsius",
  quality_flag: quality,
  notes: quality === "suspect" ? "flagged" : null,
});

describe("computeNurseSaulMaturity (engine #7 M2)", () => {
  it("computes the trapezoidal Nurse-Saul index for constant temperature", () => {
    // 10 °C for 12 h: (10 - (-10)) * 12 = 240 °C·h
    const r = computeNurseSaulMaturity([
      row(1, "2026-10-15T00:00:00Z", 10),
      row(2, "2026-10-15T06:00:00Z", 10),
      row(3, "2026-10-15T12:00:00Z", 10),
    ]);
    expect(r.status).toBe("computed");
    if (r.status !== "computed") return;
    expect(r.segments).toHaveLength(1);
    expect(r.totalMaturityIndex).toBeCloseTo(240, 5);
    expect(r.equivalentAgeHours20C).toBeCloseTo(8, 5); // 240 / 30
    expect(r.segments).toHaveLength(1);
  });

  it("interpolates linearly between differing temperatures", () => {
    // 10 °C -> 20 °C over 4 h: avg 15 °C, (15+10)*4 = 100 °C·h
    const r = computeNurseSaulMaturity([
      row(1, "2026-10-15T00:00:00Z", 10),
      row(2, "2026-10-15T04:00:00Z", 20),
    ]);
    if (r.status !== "computed") throw new Error("expected computed");
    expect(r.totalMaturityIndex).toBeCloseTo(100, 5);
  });

  it("sorts unsorted input and integrates in time order", () => {
    const r = computeNurseSaulMaturity([
      row(2, "2026-10-15T06:00:00Z", 20),
      row(1, "2026-10-15T00:00:00Z", 20),
    ]);
    if (r.status !== "computed") throw new Error("expected computed");
    expect(r.totalMaturityIndex).toBeCloseTo(180, 5); // 30 * 6
  });

  it("excludes suspect readings entirely instead of guessing", () => {
    // only the two valid readings participate
    const r = computeNurseSaulMaturity([
      row(1, "2026-10-15T00:00:00Z", 10),
      row(2, "2026-10-15T03:00:00Z", 900, "concrete_temp_c", "suspect"),
      row(3, "2026-10-15T04:00:00Z", 10),
    ]);
    if (r.status !== "computed") throw new Error("expected computed");
    expect(r.readingCount).toBe(2);
    expect(r.totalMaturityIndex).toBeCloseTo(80, 5); // 20 * 4
  });

  it("refuses below 2 valid readings with an honest reason", () => {
    const r = computeNurseSaulMaturity([row(1, "2026-10-15T00:00:00Z", 10)]);
    expect(r.status).toBe("refused");
    if (r.status !== "refused") return;
    expect(r.reason).toMatch(/2 valid concrete_temp_c readings/);
    expect(r.readingCount).toBe(1);
  });

  it("never interpolates across gaps longer than 6 h — segments split", () => {
    // 3 h at 10 °C, then a 48 h gap, then 3 h at 10 °C
    const r = computeNurseSaulMaturity([
      row(1, "2026-10-15T00:00:00Z", 10),
      row(2, "2026-10-15T03:00:00Z", 10),
      row(3, "2026-10-17T03:00:00Z", 10),
      row(4, "2026-10-17T06:00:00Z", 10),
    ]);
    if (r.status !== "computed") throw new Error("expected computed");
    expect(r.segments).toHaveLength(2);
    for (const seg of r.segments) {
      expect(seg.maturityIndex).toBeCloseTo(60, 5); // 20 * 3 per segment
    }
    expect(r.totalMaturityIndex).toBeCloseTo(120, 5);
  });

  it("allows negative contributions below the datum (no silent clamping)", () => {
    // -20 °C for 2 h: (-20 + 10) * 2 = -20 °C·h
    const r = computeNurseSaulMaturity([
      row(1, "2026-10-15T00:00:00Z", -20),
      row(2, "2026-10-15T02:00:00Z", -20),
    ]);
    if (r.status !== "computed") throw new Error("expected computed");
    expect(r.totalMaturityIndex).toBeCloseTo(-20, 5);
  });

  it("ignores readings with mismatched or wrong metrics", () => {
    const r = computeNurseSaulMaturity([
      row(1, "2026-10-15T00:00:00Z", 10),
      row(2, "2026-10-15T06:00:00Z", 30, "ambient_temp_c"),
    ]);
    expect(r.status).toBe("refused");
  });

  it("discloses that no strength value is derived", () => {
    const r = computeNurseSaulMaturity([
      row(1, "2026-10-15T00:00:00Z", 10),
      row(2, "2026-10-15T04:00:00Z", 10),
    ]);
    if (r.status !== "computed") throw new Error("expected computed");
    expect(r.disclosure).toMatch(/no strength value is derived/i);
    expect(r.disclosure).toMatch(/ASTM C1074/);
  });
});

describe("classifySiteConditions (engine #7 M2)", () => {
  const ambient = (id: number, at: string, v: number, quality: Row["quality_flag"] = "valid") =>
    row(id, at, v, "ambient_temp_c", quality);

  it("classifies cold-weather conditions with ACI 306R basis, pending verification", () => {
    const r = classifySiteConditions([ambient(1, "2026-10-15T02:00:00Z", 2)]);
    expect(r.label).toBe("cold-weather-concreting");
    expect(r.basis).toMatch(/ACI 306R-10/);
    expect(r.verification).toBe("pending");
  });

  it("classifies hot-weather conditions with ACI 305R basis", () => {
    const r = classifySiteConditions([ambient(1, "2026-10-15T14:00:00Z", 35)]);
    expect(r.label).toBe("hot-weather-concreting");
    expect(r.basis).toMatch(/ACI 305R/);
  });

  it("uses the LATEST valid ambient reading, ignoring suspect ones", () => {
    const r = classifySiteConditions([
      ambient(1, "2026-10-15T06:00:00Z", 2),
      ambient(2, "2026-10-15T09:00:00Z", 22),
      ambient(3, "2026-10-15T12:00:00Z", 33, "suspect"),
    ]);
    expect(r.label).toBe("normal-conditions");
    expect(r.asOf).toBe("2026-10-15T09:00:00Z");
  });

  it("refuses to classify without any valid ambient reading", () => {
    expect(classifySiteConditions([]).label).toBe("insufficient-data");
    expect(classifySiteConditions([ambient(1, "2026-10-15T06:00:00Z", 5, "suspect")]).label)
      .toBe("insufficient-data");
  });

  it("never presents guideline bands as verified compliance verdicts", () => {
    const r = classifySiteConditions([ambient(1, "2026-10-15T06:00:00Z", 0)]);
    expect(r.disclosure).toMatch(/not as a compliance verdict/i);
  });
});

describe("vibration handling (engine #7 M2)", () => {
  it("vibration stays evidence-only: disclosure names the independent-review requirement", () => {
    expect(VIBRATION_EVIDENCE_DISCLOSURE).toMatch(/evidence only/i);
    expect(VIBRATION_EVIDENCE_DISCLOSURE).toMatch(/independently reviewed limits/i);
  });
});
