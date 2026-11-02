/**
 * Regional data-quality + bias assessment tests — FRELUX engine
 * #3 "Predictive analytics & AI" milestone 3 (2026-10-15).
 *
 * Pins the honesty rules: verdicts from checkable findings, stale
 * data disclosed (never silently used), concentration and
 * size-collapse flags, and refusal for empty datasets.
 */

import { describe, expect, it } from "vitest";
import { assessMarketDataQuality } from "./data-quality";
import type { ProjectOutcomeRecord } from "./outcomes";

const NOW = new Date("2026-10-15T00:00:00Z");

let seq = 0;
function rec(
  market_code: string,
  actual_end_date: string,
  opts: Partial<ProjectOutcomeRecord> = {},
): ProjectOutcomeRecord {
  seq++;
  return {
    id: `q${String(seq).padStart(4, "0")}`,
    user_id: null,
    project_id: null,
    market_code,
    project_type: "detached duplex",
    finish_quality: null,
    size_m2: 200,
    stories: 2,
    planned_start_date: null,
    planned_end_date: null,
    actual_end_date,
    budgeted_amount: null,
    budgeted_currency: "NGN",
    final_amount: null,
    delay_days: 10,
    cost_overrun_pct: null,
    safety_incident_count: 0,
    rfi_count: null,
    weather_delay_days: null,
    notes: null,
    created_at: actual_end_date,
    ...opts,
  };
}

/** A fully adequate dataset: 20 labelled records, 8 months, varied types/sizes. */
function adequateSet(market = "NG") {
  return Array.from({ length: 20 }, (_, i) =>
    rec(market, `2026-0${(i % 7) + 1}-1${i % 10}`, {
      project_type: i % 3 === 0 ? "bungalow" : "detached duplex",
      size_m2: 100 + i * 10,
    }),
  );
}

describe("assessMarketDataQuality — verdicts", () => {
  it("passes an adequate dataset with every gate named", () => {
    const r = assessMarketDataQuality({
      market_code: "NG",
      label: "delay_days",
      records: adequateSet(),
      now: NOW,
    });
    expect(r.verdict).toBe("adequate");
    expect(r.labelled_size).toBe(20);
    expect(r.findings.map((f) => f.passed)).toEqual(
      Array(6).fill(true),
    );
    expect(r.disclosure).toMatch(/pass every data-quality gate/);
    expect(r.disclosure).toMatch(/back-test report remains the source/);
  });

  it("refuses an empty dataset — insufficient_data, no invented facts", () => {
    const r = assessMarketDataQuality({
      market_code: "US",
      label: "delay_days",
      records: [],
      now: NOW,
    });
    expect(r.verdict).toBe("insufficient_data");
    expect(r.labelled_size).toBe(0);
    expect(r.disclosure).toMatch(/NOT adequate/);
    expect(r.findings.every((f) => typeof f.detail === "string")).toBe(true);
  });

  it("refuses a below-minimum labelled sample even when the raw record count is large", () => {
    const records = [
      ...adequateSet(),
      ...Array.from({ length: 10 }, (_, i) =>
        rec("NG", `2026-03-0${i + 1}`, { delay_days: null }),
      ),
    ];
    const r = assessMarketDataQuality({
      market_code: "NG",
      label: "delay_days",
      // 30 raw records but only 20 labelled -> sample passes,
      // completeness (20/30 = 0.67 < 0.8) fails honestly.
      records,
      now: NOW,
    });
    expect(r.sample_size).toBe(30);
    expect(r.labelled_size).toBe(20);
    expect(r.verdict).toBe("insufficient_data");
    expect(r.findings.find((f) => f.check === "completeness")!.passed).toBe(
      false,
    );
  });

  it("flags stale history: newest completion beyond the 24-month limit", () => {
    const records = Array.from({ length: 20 }, (_, i) =>
      rec("GB", `2023-0${(i % 6) + 1}-1${i % 10}`, { size_m2: 100 + i }),
    );
    const r = assessMarketDataQuality({
      market_code: "GB",
      label: "delay_days",
      records,
      now: NOW,
    });
    expect(r.verdict).toBe("stale");
    expect(r.findings.find((f) => f.check === "recency")!.passed).toBe(false);
    expect(r.disclosure).toMatch(/stale/);
  });

  it("flags a one-type sample as biased even with enough records", () => {
    const records = Array.from({ length: 20 }, (_, i) =>
      rec("DE", `2026-0${(i % 6) + 1}-0${(i % 9) + 1}`, {
        project_type: "detached duplex",
        size_m2: 100 + i,
      }),
    );
    const r = assessMarketDataQuality({
      market_code: "DE",
      label: "delay_days",
      records,
      now: NOW,
    });
    expect(r.verdict).toBe("biased_sample");
    expect(r.dominant_type).toEqual({
      type: "detached duplex",
      share: 1,
    });
    expect(r.disclosure).toMatch(/type_concentration/);
  });

  it("flags a size-collapsed sample (one distinct size) as biased", () => {
    const records = Array.from({ length: 20 }, (_, i) =>
      rec("FR", `2026-0${(i % 6) + 1}-0${(i % 9) + 1}`, {
        project_type: i % 2 === 0 ? "bungalow" : "duplex",
        size_m2: 150,
      }),
    );
    const r = assessMarketDataQuality({
      market_code: "FR",
      label: "delay_days",
      records,
      now: NOW,
    });
    expect(r.verdict).toBe("biased_sample");
    expect(r.distinct_sizes).toBe(1);
    expect(r.findings.find((f) => f.check === "size_spread")!.passed).toBe(
      false,
    );
  });

  it("assesses ONLY the requested market's records", () => {
    const r = assessMarketDataQuality({
      market_code: "KE",
      label: "delay_days",
      records: [...adequateSet("NG"), ...adequateSet("KE")],
      now: NOW,
    });
    expect(r.market_code).toBe("KE");
    expect(r.sample_size).toBe(20);
    expect(r.verdict).toBe("adequate");
  });

  it("lists several failures together in one disclosure", () => {
    const r = assessMarketDataQuality({
      market_code: "IT",
      label: "delay_days",
      records: [rec("IT", "2022-01-01", { delay_days: null })],
      now: NOW,
    });
    expect(r.verdict).toBe("insufficient_data");
    const failed = r.findings.filter((f) => !f.passed).map((f) => f.check);
    expect(failed).toContain("sample");
    expect(failed).toContain("recency");
    expect(failed).toContain("completeness");
    expect(r.disclosure).toMatch(/sample, recency/);
  });
});
