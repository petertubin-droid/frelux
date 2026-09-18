// =========================================================
// PREDICTIVE INTELLIGENCE, SCHEDULE-RISK TESTS (§13)
//
// Deterministic bands (documented in code):
//   high: sequencing violation OR stall > 14 days
//   medium: stalled but ≤ 14 days (in progress, work remaining)
//   low: ordered completions, no stall / all complete
// =========================================================
import { describe, it, expect } from "vitest";
import { analyzeScheduleRisk } from "./schedule-risk";

const NOW = "2026-09-18T12:00:00.000Z";
const D = (days: number) =>
  new Date(new Date(NOW).getTime() - days * 24 * 60 * 60 * 1000).toISOString();

function st(i: number, done: boolean, completedAt: string | null = null) {
  return {
    id: `s${i}`,
    stageName: `stage ${i}`,
    sortOrder: i,
    isCompleted: done,
    completedAt,
    updatedAt: completedAt ?? D(1),
  };
}

describe("analyzeScheduleRisk", () => {
  it("no stages → insufficient_data, no calendar prediction", () => {
    const r = analyzeScheduleRisk({
      now: NOW,
      projectStatus: "in_progress",
      stages: [],
    });
    expect(r.status).toBe("insufficient_data");
    expect(r.missingData).toContain("progress_stages");
  });

  it("out-of-order completion → HIGH with the violating pair named", () => {
    const r = analyzeScheduleRisk({
      now: NOW,
      projectStatus: "in_progress",
      stages: [st(1, false), st(2, true, D(5))],
    });
    expect(r.status).toBe("ok");
    expect(r.result?.rating).toBe("high");
    expect(r.result?.sequencingViolations).toEqual([
      { laterStage: "stage 2", earlierStage: "stage 1" },
    ]);
    expect(r.prediction).toContain("out-of-order");
  });

  it("stalled > 14 days in progress → HIGH", () => {
    const r = analyzeScheduleRisk({
      now: NOW,
      projectStatus: "in_progress",
      stages: [st(1, true, D(20)), st(2, false)],
    });
    expect(r.result?.rating).toBe("high");
    expect(r.result?.stallDays).toBe(20);
    expect(r.prediction).toContain("20 days");
  });

  it("in-progress, no stall → LOW (steady)", () => {
    const r = analyzeScheduleRisk({
      now: NOW,
      projectStatus: "in_progress",
      stages: [st(1, true, D(2)), st(2, false)],
    });
    expect(r.result?.rating).toBe("low");
    expect(r.result?.stallDays).toBeNull();
  });

  it("completed project → LOW, no remaining work", () => {
    const r = analyzeScheduleRisk({
      now: NOW,
      projectStatus: "in_progress",
      stages: [st(1, true, D(30)), st(2, true, D(25))],
    });
    expect(r.result?.rating).toBe("low");
    expect(r.prediction).toContain("All recorded stages are complete");
  });

  it("not in progress → a stall is not claimed", () => {
    const r = analyzeScheduleRisk({
      now: NOW,
      projectStatus: "completed",
      stages: [st(1, true, D(60)), st(2, false)],
    });
    expect(r.result?.rating).toBe("low");
    expect(r.result?.stallDays).toBeNull();
  });
});
