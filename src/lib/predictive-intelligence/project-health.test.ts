// =========================================================
// PREDICTIVE INTELLIGENCE, PROJECT-HEALTH TESTS (§13)
//
// The dashboard rollup contract: every area reports its own
// measured rating, and MISSING DATA IS NEVER REASSURING —
// an unavailable analysis surfaces as insufficient_data,
// never as "low risk".
// =========================================================
import { describe, it, expect } from "vitest";
import { buildProjectHealth } from "./project-health";
import type { HealthInput } from "./project-health";
import type { PredictionKind, PredictionResult } from "./types";

const NOW = "2026-09-18T12:00:00.000Z";

const insufficient = (kind: PredictionKind): PredictionResult<never> => ({
  kind,
  status: "insufficient_data",
  prediction: "Insufficient data.",
  result: null,
  evidence: [],
  inputs: [],
  assumptions: [],
  freshness: "unavailable",
  confidence: null,
  limitations: [],
  generatedAt: NOW,
  missingData: [kind],
});

function ok(
  kind: PredictionKind,
  result: Record<string, unknown>,
): PredictionResult<never> {
  // every analyzer result the rollup touches must be present:
  // otherwise the mapping itself would crash on real partial data
  const base: Record<string, Record<string, unknown>> = {
    cost_overrun: { rating: "low", burnPct: 0 },
    schedule_risk: { rating: "low", sequencingViolations: [], stallDays: null },
    procurement_risk: {
      rating: "low",
      unpurchasedCount: 0,
      missingSupplierNames: [],
    },
    progress_variance: {
      userProgressDisagrees: false,
      userProgressPct: null,
      stageCompletionPct: 0,
      completedStages: 0,
      totalStages: 0,
    },
  };
  return {
    kind,
    status: "ok",
    prediction: "ok",
    result: { ...base[kind], ...result } as never,
    evidence: [],
    inputs: [],
    assumptions: [],
    freshness: "current",
    confidence: null,
    limitations: [],
    generatedAt: NOW,
    missingData: [],
  };
}

function input(over: Partial<HealthInput> = {}): HealthInput {
  return {
    cost: ok("cost_overrun", {}),
    schedule: ok("schedule_risk", {}),
    procurement: ok("procurement_risk", {}),
    progress: ok("progress_variance", {}),
    dataQuality: { rating: "high", reason: "records present" },
    ...over,
  };
}

describe("buildProjectHealth", () => {
  it("healthy inputs → low ratings with recorded-data reasons", () => {
    const h = buildProjectHealth(input());
    expect(h.cost.rating).toBe("low");
    expect(h.schedule.rating).toBe("low");
    expect(h.procurement.rating).toBe("low");
  });

  it("a high cost burn is surfaced as high, with the measured reason", () => {
    const h = buildProjectHealth(
      input({
        cost: ok("cost_overrun", { rating: "high", burnPct: 0.21 }),
      }),
    );
    expect(h.cost.rating).toBe("high");
    expect(h.cost.reason).toContain("21.0%");
  });

  it("insufficient cost data → insufficient_data, never reassuring", () => {
    const h = buildProjectHealth(input({ cost: insufficient("cost_overrun") }));
    expect(h.cost.rating).toBe("insufficient_data");
    expect(h.cost.reason).toContain("Insufficient data");
  });

  it("insufficient schedule data → insufficient_data with honest reason", () => {
    const h = buildProjectHealth(
      input({ schedule: insufficient("schedule_risk") }),
    );
    expect(h.schedule.rating).toBe("insufficient_data");
  });

  it("insufficient procurement data → insufficient_data", () => {
    const h = buildProjectHealth(
      input({ procurement: insufficient("procurement_risk") }),
    );
    expect(h.procurement.rating).toBe("insufficient_data");
  });

  it("progress disagreement between stated and recorded → at_risk", () => {
    const h = buildProjectHealth(
      input({
        progress: ok("progress_variance", {
          userProgressDisagrees: true,
          userProgressPct: 90,
          stageCompletionPct: 25,
        }),
      }),
    );
    expect(h.progress.rating).toBe("at_risk");
    expect(h.progress.reason).toContain("disagrees");
  });

  it("progress agreement → on_track", () => {
    const h = buildProjectHealth(
      input({
        progress: ok("progress_variance", {
          userProgressDisagrees: false,
          userProgressPct: 50,
          stageCompletionPct: 50,
        }),
      }),
    );
    expect(h.progress.rating).toBe("on_track");
  });
});
