// =========================================================
// PREDICTIVE INTELLIGENCE, RISK-REGISTER TESTS (§13)
//
// The register converts analyzer outputs into owner-facing
// risks + recommendations. Pinned:
//   * low ratings produce NO risk (no noise)
//   * insufficient analyzers produce NO invented risk
//   * high cost pressure yields a HIGH risk carrying the
//     deterministic projection basis
// =========================================================
import { describe, it, expect } from "vitest";
import { buildRiskRegister } from "./risk-register";
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
  missingData: [],
});
function ok(
  kind: PredictionKind,
  result: Record<string, unknown>,
): PredictionResult<never> {
  const base: Record<string, Record<string, unknown>> = {
    cost_overrun: {
      rating: "low",
      burnVariance: 0,
      projectedOverrunPct: 0,
      burnPct: 0,
    },
    schedule_risk: { rating: "low", sequencingViolations: [], stallDays: null },
    procurement_risk: {
      rating: "low",
      unpurchasedCount: 0,
      missingSupplierNames: [],
      priceIncreasedLines: [],
    },
    material_price_trend: { rating: "low", trends: [] },
    progress_variance: {
      userProgressDisagrees: false,
      userProgressPct: null,
      stageCompletionPct: 0,
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
    confidence: { score: 0.8, band: "high", method: "test" } as never,
    limitations: [],
    generatedAt: NOW,
    missingData: [],
  };
}

function input(over: Record<string, PredictionResult<never>> = {}) {
  return {
    now: NOW,
    cost: ok("cost_overrun", {}),
    schedule: ok("schedule_risk", {}),
    procurement: ok("procurement_risk", {}),
    market: ok("material_price_trend", {}),
    progress: ok("progress_variance", {}),
    ...over,
  };
}

describe("buildRiskRegister", () => {
  it("all-low inputs → an empty register, no invented risks", () => {
    const { risks } = buildRiskRegister(input());
    expect(risks).toHaveLength(0);
  });

  it("high cost pressure → one HIGH Cost risk with the projection basis", () => {
    const { risks } = buildRiskRegister(
      input({
        cost: ok("cost_overrun", {
          rating: "high",
          burnVariance: 1500,
          projectedOverrunPct: 0.15,
        }),
      }),
    );
    const cost = risks.find((r) => r.category === "Cost");
    expect(cost).toBeDefined();
    expect(cost?.severity).toBe("high");
    expect(cost?.probability?.value).toBeCloseTo(0.15, 10);
    expect(cost?.probability?.basis).toContain("15.0%");
  });

  it("medium cost pressure → a MEDIUM risk, never inflated to high", () => {
    const { risks } = buildRiskRegister(
      input({
        cost: ok("cost_overrun", {
          rating: "medium",
          burnVariance: 500,
          projectedOverrunPct: 0.05,
        }),
      }),
    );
    expect(risks.find((r) => r.category === "Cost")?.severity).toBe("medium");
  });

  it("insufficient analyzers contribute nothing — no fake risks from missing data", () => {
    const { risks } = buildRiskRegister(
      input({
        cost: insufficient("cost_overrun"),
        schedule: insufficient("schedule_risk"),
        procurement: insufficient("procurement_risk"),
      }),
    );
    expect(risks).toHaveLength(0);
  });

  it("every emitted risk is fully evidenced (id, action, confidence, dates)", () => {
    const { risks } = buildRiskRegister(
      input({
        schedule: ok("schedule_risk", {
          rating: "high",
          sequencingViolations: [{ laterStage: "s2", earlierStage: "s1" }],
          stallDays: null,
        }),
      }),
    );
    const sched = risks.find((r) => r.id === "sequence-violation");
    expect(sched).toBeDefined();
    expect(sched?.severity).toBe("high");
    expect(sched?.recommendedAction).toBeTruthy();
    expect(sched?.confidence.band).toBe("high");
    expect(sched?.createdAt).toBeTruthy();
    expect(sched?.updatedAt).toBeTruthy();
  });

  it("recommendations accompany material risks", () => {
    const { recommendations } = buildRiskRegister(
      input({
        cost: ok("cost_overrun", {
          rating: "high",
          burnVariance: 1500,
          projectedOverrunPct: 0.15,
        }),
      }),
    );
    expect(recommendations.length).toBeGreaterThan(0);
  });
});
