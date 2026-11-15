import { describe, expect, it } from "vitest";
import {
  DEFAULT_CALIBRATION_POLICY,
  buildCalibrationCandidate,
  calibrationCandidateFingerprint,
  calibrationCandidateKey,
  type CalibrationApproval,
  type CalibrationFeedback,
} from "../adaptive-calibration";
import {
  applyApprovedCalibration,
  readActivationFlag,
} from "../calibration-overlay";

let sequence = 0;

const row = (over: Partial<CalibrationFeedback> = {}): CalibrationFeedback => ({
  id: `o${(sequence += 1)}`,
  projectId: `p${(sequence % 3) + 1}`,
  marketCode: "NG",
  materialKey: "block",
  measure: "material",
  estimatedQuantity: 100,
  actualQuantity: 110,
  unit: "piece",
  evidence: "admin_verified",
  recordedAt: "2026-11-01T00:00:00.000Z",
  context: "takeoff",
  status: "accepted",
  source: "cloud",
  evidenceReference: "close-out",
  reviewerId: "admin-1",
  reviewerRole: "admin",
  reviewedAt: "2026-11-02T00:00:00.000Z",
  ...over,
});

const series = (ratios: number[], total = 20) =>
  Array.from({ length: total }, (_, index) =>
    row({
      projectId: `p${(index % 6) + 1}`,
      actualQuantity: 100 * ratios[index % ratios.length],
    }),
  );

const scope = {
  marketCode: "NG",
  materialKey: "block",
  measure: "material" as const,
  unit: "piece",
};

const candidate = () =>
  buildCalibrationCandidate(series([1.1, 1.2, 1.05, 0.95, 1.0]), scope);

const approval = (): CalibrationApproval => {
  const built = candidate();
  return {
    candidateKey: calibrationCandidateKey(built),
    decision: "approved",
    reviewerId: "admin-1",
    reviewerRole: "admin",
    reviewedAt: "2026-11-03T00:00:00.000Z",
    reason: "Checked",
    candidateFingerprint: calibrationCandidateFingerprint(built),
    policyVersion: DEFAULT_CALIBRATION_POLICY.version,
  };
};

describe("calibration activation", () => {
  it("reads the deployment flag conservatively", () => {
    expect(readActivationFlag("on").enabled).toBe(true);
    expect(readActivationFlag("TRUE").enabled).toBe(true);
    expect(readActivationFlag("off").enabled).toBe(false);
    expect(readActivationFlag("").enabled).toBe(false);
    expect(readActivationFlag(undefined).reason).toBe("flag_unset");
  });

  it("reports the shadow value and keeps the baseline when the flag is off", () => {
    const result = applyApprovedCalibration({
      baseline: 1000,
      candidate: candidate(),
      approval: approval(),
      flag: { enabled: false, reason: "flag_unset" },
    });
    expect(result.applied).toBe(false);
    expect(result.value).toBe(1000);
    expect(result.multiplier).toBeCloseTo(1.05, 4);
    expect(result.comparison.shadow).toBeCloseTo(1050, 3);
    expect(result.blockedReason).toBe("activation_disabled");
    expect(result.audit).toBeNull();
  });

  it("applies a bounded adjustment only when every gate passes", () => {
    const result = applyApprovedCalibration({
      baseline: 1000,
      candidate: candidate(),
      approval: approval(),
      flag: { enabled: true, reason: "flag_on" },
    });
    expect(result.applied).toBe(true);
    expect(result.value).toBeCloseTo(1050, 3);
    expect(result.blockedReason).toBe("none");
    expect(result.audit?.action).toBe("activated");
  });

  it("rolls back when the approval is withdrawn", () => {
    const result = applyApprovedCalibration({
      baseline: 1000,
      candidate: candidate(),
      approval: null,
      flag: { enabled: true, reason: "flag_on" },
    });
    expect(result.applied).toBe(false);
    expect(result.value).toBe(1000);
    expect(result.blockedReason).toBe("no_approval");
  });

  it("rolls back when new evidence changes the snapshot", () => {
    const stale = approval();
    const grown = buildCalibrationCandidate(
      [
        ...series([1.1, 1.2, 1.05, 0.95, 1.0]),
        row({ projectId: "p9", actualQuantity: 108 }),
      ],
      scope,
    );
    const result = applyApprovedCalibration({
      baseline: 1000,
      candidate: grown,
      approval: stale,
      flag: { enabled: true, reason: "flag_on" },
    });
    expect(result.applied).toBe(false);
    expect(result.value).toBe(1000);
    expect(result.blockedReason).toBe("policy_or_evidence_changed");
    expect(result.audit?.action).toBe("rejected");
  });

  it("refuses an ineligible candidate even with a valid approval", () => {
    const thin = buildCalibrationCandidate([row()], scope);
    const result = applyApprovedCalibration({
      baseline: 500,
      candidate: thin,
      approval: approval(),
      flag: { enabled: true, reason: "flag_on" },
    });
    expect(result.applied).toBe(false);
    expect(result.value).toBe(500);
    expect(result.blockedReason).toBe("not_eligible");
  });

  it("never returns a value outside the policy clamp", () => {
    const strict = {
      ...DEFAULT_CALIBRATION_POLICY,
      maxAdjustmentFraction: 0.05,
    };
    const built = buildCalibrationCandidate(
      series([1.4, 1.5, 1.6, 1.5, 1.45]),
      scope,
      strict,
    );
    const approved: CalibrationApproval = {
      candidateKey: calibrationCandidateKey(built),
      decision: "approved",
      reviewerId: "admin-1",
      reviewerRole: "admin",
      reviewedAt: "2026-11-03T00:00:00.000Z",
      reason: "Checked",
      candidateFingerprint: calibrationCandidateFingerprint(built, strict),
      policyVersion: strict.version,
    };
    const result = applyApprovedCalibration({
      baseline: 1000,
      candidate: built,
      approval: approved,
      flag: { enabled: true, reason: "flag_on" },
      policy: strict,
    });
    expect(result.applied).toBe(true);
    // The candidate itself is bounded at 1.05, and the overlay clamps again.
    expect(result.value).toBeLessThanOrEqual(1050);
    expect(result.value).toBeGreaterThanOrEqual(950);
  });
});
