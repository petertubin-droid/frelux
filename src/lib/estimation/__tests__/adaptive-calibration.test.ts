import { describe, expect, it } from "vitest";
import {
  buildCalibrationCandidate,
  calibrationCandidateKey,
  compareShadowEstimate,
  empiricalConfidenceRange,
  exportBudgetCsv,
  resolveApprovedMultiplier,
  suggestCostCode,
  validateCalibrationFeedback,
  type CalibrationFeedback,
} from "../adaptive-calibration";

function feedback(
  i: number,
  ratio: number,
  verified = true,
): CalibrationFeedback {
  return {
    id: `f${i}`,
    projectId: `p${i % 4}`,
    marketCode: "NG",
    materialKey: "paint",
    measure: "material",
    estimatedQuantity: 10,
    actualQuantity: 10 * ratio,
    unit: "L",
    evidence: verified ? "verified_project" : "user_reported",
    recordedAt: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
    context: "takeoff",
    status: "accepted",
    evidenceReference: `receipt-${i}`,
    reviewerId: "reviewer-1",
    reviewedAt: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
  };
}

describe("adaptive calibration", () => {
  it("requires sufficient verified data and produces a bounded shadow candidate", () => {
    const rows = [
      feedback(1, 1.5),
      feedback(2, 1.4),
      feedback(3, 1.3),
      feedback(4, 1.2),
      feedback(5, 1.1),
    ];
    const c = buildCalibrationCandidate(rows, "NG", "paint", "material");
    expect(c.eligible).toBe(true);
    expect(c.proposedMultiplier).toBeLessThanOrEqual(1.25);
    expect(c.proposedMultiplier).toBeGreaterThan(1);
    expect(c.observationCount).toBe(5);
  });

  it("does not treat insufficient reports as an active rule", () => {
    const c = buildCalibrationCandidate(
      [feedback(1, 1.5), feedback(2, 1.4)],
      "NG",
      "paint",
      "material",
    );
    expect(c.eligible).toBe(false);
    expect(c.blockers).toContain("insufficient_observations");
    expect(resolveApprovedMultiplier(c, null, "x")).toBeNull();
  });

  it("excludes structural and compliance observations", () => {
    const structural = { ...feedback(1, 1.1), context: "structural" as const };
    expect(validateCalibrationFeedback(structural)).toContain(
      "safety_sensitive_context",
    );
    expect(
      buildCalibrationCandidate([structural], "NG", "paint", "material")
        .observationCount,
    ).toBe(0);
  });

  it("deduplicates feedback ids and isolates market/material/measure groups", () => {
    const rows = Array.from({ length: 5 }, (_, i) => feedback(i + 1, 1.1));
    const c = buildCalibrationCandidate(
      [...rows, rows[0]],
      "NG",
      "paint",
      "material",
    );
    expect(c.observationCount).toBe(5);
    expect(
      buildCalibrationCandidate(rows, "GB", "paint", "material")
        .observationCount,
    ).toBe(0);
  });

  it("computes empirical range and shadow comparison deterministically", () => {
    const rows = [feedback(1, 0.9), feedback(2, 1), feedback(3, 1.1)];
    expect(
      empiricalConfidenceRange(100, rows, "NG", "paint", "material", "L"),
    ).toEqual({
      low: 92,
      likely: 100,
      high: 108,
      unit: "L",
      observations: 3,
      method: "empirical_quantiles",
    });
    expect(compareShadowEstimate(100, 1.1)).toEqual({
      baseline: 100,
      shadow: 110,
      delta: 10,
      deltaFraction: 0.1,
    });
  });

  it("requires explicit, snapshot-matched approval before activation", () => {
    const candidate = buildCalibrationCandidate(
      Array.from({ length: 5 }, (_, i) => feedback(i + 1, 1.1)),
      "NG",
      "paint",
      "material",
    );
    const fingerprint = "reviewed-snapshot-v1";
    const approval = {
      candidateKey: calibrationCandidateKey(candidate),
      decision: "approved" as const,
      reviewerId: "owner",
      reviewedAt: "2026-01-01T00:00:00.000Z",
      reason: "Reviewed",
      candidateFingerprint: fingerprint,
    };
    expect(resolveApprovedMultiplier(candidate, approval, fingerprint)).toBe(
      candidate.proposedMultiplier,
    );
    expect(
      resolveApprovedMultiplier(candidate, approval, "changed-data"),
    ).toBeNull();
  });

  it("suggests classification without inventing a price or accepting unknown trade", () => {
    expect(suggestCostCode("tile installation", "L")?.costCode).toBe(
      "09 00 00",
    );
    expect(suggestCostCode("unknown custom work", "O")).toBeNull();
  });

  it("exports escaped WBS data and includes market, currency, and provenance", () => {
    const csv = exportBudgetCsv([
      {
        costCode: "09 00 00",
        costCodeDescription: "Finishes",
        costType: "M",
        description: 'Paint, "premium"',
        uom: "L",
        quantity: 2,
        unitCost: 10,
        amount: 20,
        currency: "GBP",
        marketCode: "GB",
        sourceStatus: "user_entered",
      },
    ]);
    expect(csv).toContain('"Paint, ""premium"""');
    expect(csv).toContain("GBP");
    expect(csv).toContain("user_entered");
  });
});
