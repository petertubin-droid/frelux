/**
 * Outcome-label schema + historical dataset tests — FRELUX
 * engine #3 "Predictive analytics & AI" milestone 1 (2026-10-15).
 *
 * Pins the honesty rules: labels derived (never typed), honest
 * nulls when facts are missing, unknown markets refused,
 * unfinished projects refused, and the schema itself documented.
 */

import { describe, expect, it } from "vitest";
import {
  OUTCOME_LABELS,
  prepareProjectOutcome,
  type ProjectOutcomeInput,
} from "./outcomes";

const BASE: ProjectOutcomeInput = {
  market_code: "NG",
  project_type: "detached duplex",
  actual_end_date: "2025-11-10",
  planned_end_date: "2025-10-01",
  budgeted_amount: 100_000_000,
  budgeted_currency: "NGN",
  final_amount: 112_000_000,
  safety_incident_count: 1,
};

describe("OUTCOME_LABELS schema", () => {
  it("defines exactly the three deterministic labels with derivations", () => {
    expect(OUTCOME_LABELS.map((l) => l.key)).toEqual([
      "delay_days",
      "cost_overrun_pct",
      "safety_incident_count",
    ]);
    for (const l of OUTCOME_LABELS) {
      expect(l.label.length).toBeGreaterThan(0);
      expect(l.derivation.length).toBeGreaterThan(0);
      expect(l.nullWhen.length).toBeGreaterThan(0);
    }
  });
});

describe("prepareProjectOutcome — label derivation", () => {
  it("derives delay_days from planned vs actual end (late completion positive)", () => {
    const p = prepareProjectOutcome(BASE);
    // 2025-10-01 -> 2025-11-10 = 40 days
    expect(p.delay_days).toBe(40);
  });

  it("negative delay for early completion is preserved, not clamped", () => {
    const p = prepareProjectOutcome({
      ...BASE,
      planned_end_date: "2025-11-20",
      actual_end_date: "2025-11-10",
    });
    expect(p.delay_days).toBe(-10);
  });

  it("delay_days is an honest NULL without a planned end date — never zero", () => {
    const p = prepareProjectOutcome({
      ...BASE,
      planned_end_date: undefined,
    });
    expect(p.delay_days).toBeNull();
  });

  it("derives cost_overrun_pct from budget vs final in the recorded currency", () => {
    const p = prepareProjectOutcome(BASE);
    expect(p.cost_overrun_pct).toBeCloseTo(12, 5);
  });

  it("cost_overrun_pct is NULL when budget or final amount is missing", () => {
    expect(
      prepareProjectOutcome({ ...BASE, final_amount: undefined })
        .cost_overrun_pct,
    ).toBeNull();
    expect(
      prepareProjectOutcome({ ...BASE, budgeted_amount: undefined })
        .cost_overrun_pct,
    ).toBeNull();
  });

  it("cost_overrun_pct is NULL for a zero budget — no division invention", () => {
    const p = prepareProjectOutcome({ ...BASE, budgeted_amount: 0 });
    expect(p.cost_overrun_pct).toBeNull();
  });

  it("a budget saving (final < budget) is a negative overrun, not refused", () => {
    const p = prepareProjectOutcome({ ...BASE, final_amount: 90_000_000 });
    expect(p.cost_overrun_pct).toBeCloseTo(-10, 5);
  });

  it("safety_incident_count defaults to 0, never invented", () => {
    const p = prepareProjectOutcome({
      ...BASE,
      safety_incident_count: undefined,
    });
    expect(p.safety_incident_count).toBe(0);
  });
});

describe("prepareProjectOutcome — honest refusals", () => {
  it("refuses markets outside the 20-market registry", () => {
    expect(() =>
      prepareProjectOutcome({ ...BASE, market_code: "XX" }),
    ).toThrow(/Unknown market "XX"/);
    expect(() =>
      prepareProjectOutcome({ ...BASE, market_code: "ng" }),
    ).toThrow(/Unknown market "ng"/);
  });

  it("refuses records without an actual end date (unfinished project)", () => {
    expect(() =>
      prepareProjectOutcome({ ...BASE, actual_end_date: "" }),
    ).toThrow(/actual_end_date/);
  });

  it("refuses malformed and impossible dates", () => {
    expect(() =>
      prepareProjectOutcome({ ...BASE, actual_end_date: "11/10/2025" }),
    ).toThrow(/YYYY-MM-DD/);
    expect(() =>
      prepareProjectOutcome({ ...BASE, actual_end_date: "2025-02-30" }),
    ).toThrow(/not a real calendar date/);
  });

  it("refuses a planned start after the planned end", () => {
    expect(() =>
      prepareProjectOutcome({
        ...BASE,
        planned_start_date: "2025-12-01",
      }),
    ).toThrow(/planned_start_date must not be after/);
  });

  it("refuses negative safety incidents and weather delays", () => {
    expect(() =>
      prepareProjectOutcome({ ...BASE, safety_incident_count: -1 }),
    ).toThrow(/safety_incident_count must be an integer >= 0/);
    expect(() =>
      prepareProjectOutcome({ ...BASE, weather_delay_days: -2 }),
    ).toThrow(/weather_delay_days must be an integer >= 0/);
  });

  it("refuses non-3-letter currency codes", () => {
    expect(() =>
      prepareProjectOutcome({ ...BASE, budgeted_currency: "naira" }),
    ).toThrow(/3-letter ISO code/);
    expect(() =>
      prepareProjectOutcome({ ...BASE, budgeted_currency: "12" }),
    ).toThrow(/3-letter ISO code/);
  });

  it("refuses non-positive size and non-integer stories", () => {
    expect(() => prepareProjectOutcome({ ...BASE, size_m2: -5 })).toThrow(
      /size_m2 must be a positive number/,
    );
    expect(() => prepareProjectOutcome({ ...BASE, stories: 0 })).toThrow(
      /stories must be an integer >= 1/,
    );
  });

  it("refuses an empty project type", () => {
    expect(() =>
      prepareProjectOutcome({ ...BASE, project_type: "  " }),
    ).toThrow(/project_type is required/);
  });
});

describe("prepareProjectOutcome — accepts the whole 20-market registry", () => {
  it.each([
    "NG", "US", "GB", "CA", "AU", "DE", "IN", "GH", "KE", "ZA",
    "JP", "FR", "BR", "SA", "AE", "CN", "ID", "MX", "KR", "IT",
  ])("market %s validates", (code) => {
    expect(
      prepareProjectOutcome({ ...BASE, market_code: code }).market_code,
    ).toBe(code);
  });
});
