// =========================================================
// PREDICTIVE INTELLIGENCE, PROGRESS-VARIANCE TESTS (§8)
//
// The stage-completion rate counts every recorded stage equally.
// Disagreement is flagged ONLY when the user-stated progress
// differs from recorded stages by more than 20 points — and the
// records always win. Visual observations are supporting
// evidence, never an override.
// =========================================================
import { describe, it, expect } from "vitest";
import { analyzeProgressVariance } from "./progress-intelligence";

const NOW = "2026-09-18T12:00:00.000Z";
const D = (days: number) =>
  new Date(new Date(NOW).getTime() - days * 24 * 60 * 60 * 1000).toISOString();

function st(i: number, done: boolean) {
  return {
    id: `s${i}`,
    stageName: `stage ${i}`,
    sortOrder: i,
    isCompleted: done,
    completedAt: done ? D(2) : null,
    updatedAt: D(1),
  };
}

describe("analyzeProgressVariance", () => {
  it("no stages → insufficient_data (no invented progress)", () => {
    const r = analyzeProgressVariance({
      now: NOW,
      stages: [],
      userProgressPct: null,
      visualObservations: [],
    });
    expect(r.status).toBe("insufficient_data");
    expect(r.missingData).toContain("progress_stages");
  });

  it("stage completion rate is deterministic: 1 of 4 → 25%", () => {
    const r = analyzeProgressVariance({
      now: NOW,
      stages: [st(1, true), st(2, false), st(3, false), st(4, false)],
      userProgressPct: null,
      visualObservations: [],
    });
    expect(r.status).toBe("ok");
    expect(r.result?.stageCompletionPct).toBe(25);
    expect(r.result?.userProgressDisagrees).toBe(false);
    expect(r.prediction).toContain("1 of 4 stages complete (25%");
  });

  it("user progress within 20 points → consistent, no disagreement flag", () => {
    const r = analyzeProgressVariance({
      now: NOW,
      stages: [st(1, true), st(2, false), st(3, false), st(4, false)],
      userProgressPct: 40,
      visualObservations: [],
    });
    expect(r.result?.userProgressDisagrees).toBe(false);
  });

  it("user progress beyond 20 points → DISAGREES, records win", () => {
    const r = analyzeProgressVariance({
      now: NOW,
      stages: [st(1, true), st(2, false), st(3, false), st(4, false)],
      userProgressPct: 90,
      visualObservations: [],
    });
    expect(r.result?.userProgressDisagrees).toBe(true);
    expect(r.result?.userProgressPct).toBe(90);
    expect(r.prediction).toContain("disagree");
    expect(r.prediction).toContain("records disagree");
  });

  it("all stages complete → 100%, no comparison invented", () => {
    const r = analyzeProgressVariance({
      now: NOW,
      stages: [st(1, true), st(2, true)],
      userProgressPct: 100,
      visualObservations: [],
    });
    expect(r.result?.stageCompletionPct).toBe(100);
    expect(r.result?.userProgressDisagrees).toBe(false);
  });

  it("visual observations join as evidence with their verification state", () => {
    const r = analyzeProgressVariance({
      now: NOW,
      stages: [st(1, true)],
      userProgressPct: null,
      visualObservations: [
        {
          id: "o1",
          observation: "Walls plastered",
          observedAt: D(1),
          confidence: 0.7,
          verification: "user_confirmed",
          sourceLabel: "site photo",
        },
      ],
    });
    expect(r.evidence.some((e) => e.kind === "visual_observation")).toBe(true);
    expect(
      r.assumptions.some((a) => a.includes("supporting evidence only")),
    ).toBe(true);
  });

  it("invalid user progress (negative/NaN) is ignored, not clamped into agreement", () => {
    const r = analyzeProgressVariance({
      now: NOW,
      stages: [st(1, false)],
      userProgressPct: -10,
      visualObservations: [],
    });
    expect(r.result?.userProgressPct).toBeNull();
    expect(r.result?.userProgressDisagrees).toBe(false);
  });
});
