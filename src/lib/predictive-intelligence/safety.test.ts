/**
 * Safety decision-support + validation gate tests — FRELUX
 * engine #3 "Predictive analytics & AI" milestone 4 (2026-10-15).
 *
 * Pins the gate: output_class is ALWAYS decision_support, the
 * app never claims validation without a record, refusals carry
 * the data-quality disclosure, and drivers use documented
 * thresholds.
 */

import { describe, expect, it } from "vitest";
import { assessSafetyRisk } from "./safety";
import type { ProjectOutcomeRecord } from "./outcomes";

const NOW = new Date("2026-10-15T00:00:00Z");

let seq = 0;
function rec(
  market_code: string,
  actual_end_date: string,
  incidents: number,
  opts: Partial<ProjectOutcomeRecord> = {},
): ProjectOutcomeRecord {
  seq++;
  return {
    id: `s${String(seq).padStart(4, "0")}`,
    user_id: null,
    project_id: null,
    market_code,
    project_type: "detached duplex",
    finish_quality: null,
    size_m2: 100 + (seq % 5) * 50,
    stories: 2,
    planned_start_date: null,
    planned_end_date: null,
    actual_end_date,
    budgeted_amount: null,
    budgeted_currency: "NGN",
    final_amount: null,
    delay_days: null,
    cost_overrun_pct: null,
    safety_incident_count: incidents,
    rfi_count: null,
    weather_delay_days: null,
    notes: null,
    created_at: actual_end_date,
    ...opts,
  };
}

/** 20 labelled NG records over 7 months: 5 incidents total. */
function ngDataset(): ProjectOutcomeRecord[] {
  return Array.from({ length: 20 }, (_, i) =>
    rec("NG", `2026-0${(i % 7) + 1}-1${i % 10}`, i < 5 ? 1 : 0, {
      project_type: i % 3 === 0 ? "bungalow" : "detached duplex",
    }),
  );
}

describe("assessSafetyRisk — the validation gate", () => {
  it("output_class is ALWAYS decision_support, with or without validation", () => {
    const project = {
      market_code: "NG",
      stories: 2,
      excavation_depth_m: 1,
      weather_delay_days: 5,
      planned_duration_days: 100,
    };
    const unvalidated = assessSafetyRisk({
      project,
      records: ngDataset(),
      validation: null,
      now: NOW,
    });
    expect(unvalidated.output_class).toBe("decision_support");
    expect(unvalidated.validation).toBeNull();
    expect(unvalidated.disclosure).toMatch(/DECISION SUPPORT ONLY/i);
    expect(unvalidated.disclosure).toMatch(/does not self-certify/);

    const validated = assessSafetyRisk({
      project,
      records: ngDataset(),
      validation: {
        id: "v1",
        model_scope: "safety_risk",
        method: "Independent expert review against recorded outcomes",
        validator_name: "External safety review board",
        validated_on: "2026-10-01",
        scope_summary: "NG market, 20 projects, incident-baseline model",
        limitations: "Decision support only; not a certified safety assessment.",
        created_at: "2026-10-01T00:00:00Z",
      },
      now: NOW,
    });
    expect(validated.output_class).toBe("decision_support");
    expect(validated.validation?.validator_name).toBe(
      "External safety review board",
    );
    expect(validated.disclosure).toMatch(/independent validation record exists/);
    // Even with validation the class stays decision support.
    expect(validated.disclosure).toMatch(/Decision support, not a certified safety assessment/i);
  });

  it("refuses markets outside the 20-market registry", () => {
    const r = assessSafetyRisk({
      project: {
        market_code: "XX",
        stories: 2,
        excavation_depth_m: null,
        weather_delay_days: null,
        planned_duration_days: null,
      },
      records: [],
      validation: null,
      now: NOW,
    });
    expect(r.status).toBe("unsupported_region");
    expect(r.disclosure).toMatch(/not in the 20-market registry/);
  });

  it("refuses to invent a baseline when the dataset is below the gates", () => {
    const r = assessSafetyRisk({
      project: {
        market_code: "KE",
        stories: 4,
        excavation_depth_m: 2,
        weather_delay_days: null,
        planned_duration_days: null,
      },
      records: [rec("KE", "2026-05-01", 1)],
      validation: null,
      now: NOW,
    });
    expect(r.status).toBe("insufficient_data");
    expect(r.baseline_incidents_per_project).toBeNull();
    expect(r.risk_band).toBeNull();
    expect(r.disclosure).toMatch(/does not substitute national averages/i);
  });

  it("computes the incident baseline from the owner's recorded history", () => {
    const r = assessSafetyRisk({
      project: {
        market_code: "NG",
        stories: 2,
        excavation_depth_m: 0.5,
        weather_delay_days: 5,
        planned_duration_days: 200,
      },
      records: ngDataset(),
      validation: null,
      now: NOW,
    });
    expect(r.status).toBe("ok");
    expect(r.baseline_projects).toBe(20);
    expect(r.baseline_incidents_per_project).toBeCloseTo(0.25, 10);
    expect(r.risk_band).toBe("at_baseline");
    expect(r.disclosure).toMatch(/5 incident\(s\) across 20 completed NG project/);
  });

  it("raises the band only when a documented driver triggers", () => {
    const base = {
      market_code: "NG",
      excavation_depth_m: 0.5,
      weather_delay_days: 5,
      planned_duration_days: 200,
    };
    const deep = assessSafetyRisk({
      project: { ...base, stories: 2, excavation_depth_m: 2.0 },
      records: ngDataset(),
      validation: null,
      now: NOW,
    });
    expect(deep.risk_band).toBe("raised");
    expect(
      deep.drivers.find((d) => d.driver === "deep_excavation")!.detail,
    ).toMatch(/1\.5 m threshold/);

    const tall = assessSafetyRisk({
      project: { ...base, stories: 5 },
      records: ngDataset(),
      validation: null,
      now: NOW,
    });
    expect(tall.risk_band).toBe("raised");
    expect(
      tall.drivers.find((d) => d.driver === "multi_storey")!.detail,
    ).toMatch(/3-storey threshold/);

    const weather = assessSafetyRisk({
      project: { ...base, stories: 2, weather_delay_days: 60 },
      records: ngDataset(),
      validation: null,
      now: NOW,
    });
    expect(weather.risk_band).toBe("raised");
    expect(
      weather.drivers.find((d) => d.driver === "weather_exposure")!.detail,
    ).toMatch(/25%/);
  });

  it("discloses when a driver cannot be evaluated (missing facts, never guessed)", () => {
    const r = assessSafetyRisk({
      project: {
        market_code: "NG",
        stories: null,
        excavation_depth_m: null,
        weather_delay_days: null,
        planned_duration_days: null,
      },
      records: ngDataset(),
      validation: null,
      now: NOW,
    });
    expect(r.risk_band).toBe("at_baseline");
    for (const d of r.drivers) {
      expect(d.triggered).toBe(false);
      expect(d.detail).toMatch(/not recorded|not computable/);
    }
  });

  it("carries the data-quality verdict into the caution when history is stale", () => {
    const records = Array.from({ length: 20 }, (_, i) =>
      rec("GB", `2023-0${(i % 7) + 1}-1${i % 10}`, 0, {
        project_type: i % 3 === 0 ? "bungalow" : "detached duplex",
      }),
    );
    const r = assessSafetyRisk({
      project: {
        market_code: "GB",
        stories: 2,
        excavation_depth_m: 0.5,
        weather_delay_days: 5,
        planned_duration_days: 200,
      },
      records,
      validation: null,
      now: NOW,
    });
    expect(r.status).toBe("ok");
    expect(r.data_quality?.verdict).toBe("stale");
    expect(r.disclosure).toMatch(/CAUTION: .*stale/);
  });
});
