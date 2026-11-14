import {
  deleteCalibrationFeedback,
  getAuditEvents,
  getCalibrationFeedback,
  pruneFeedbackRecords,
  recordAuditEvent,
  saveCalibrationFeedback,
  updateCalibrationFeedback,
} from "../calibration-storage";
import { describe, expect, it } from "vitest";
import {
  autoApproveVerifiedCandidate,
  buildCalibrationCandidate,
  calibrationCandidateKey,
  compareShadowEstimate,
  computeHodgesLehmann,
  computeProjectDispersion,
  computeTrimmedMean,
  empiricalConfidenceRange,
  exportBudgetCsv,
  exportGlobalBudgetCsv,
  getPrimaryClassificationForMarket,
  resolveApprovedMultiplier,
  resolveGlobalClassification,
  suggestCostCode,
  validateCalibrationFeedback,
  verifyTripleCheckConsensus,
  type CalibrationFeedback,
} from "../adaptive-calibration";

function feedback(
  i: number,
  ratio: number,
  verified = true,
  projectId = `p${i % 4}`,
): CalibrationFeedback {
  return {
    id: `f${i}`,
    projectId,
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

describe("adaptive calibration and autonomous triple-check verification", () => {
  it("requires sufficient verified data and produces a bounded shadow candidate", () => {
    const rows = [
      feedback(1, 1.15, true, "p1"),
      feedback(2, 1.14, true, "p2"),
      feedback(3, 1.13, true, "p3"),
      feedback(4, 1.12, true, "p4"),
      feedback(5, 1.11, true, "p5"),
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
      Array.from({ length: 5 }, (_, i) => feedback(i + 1, 1.1, true, `p${i}`)),
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

  it("computes non-parametric Hodges-Lehmann estimator and trimmed mean with IQR outlier pruning", () => {
    // Inlier cluster around 1.10, with a wild outlier at 2.50
    const ratios = [1.09, 1.1, 1.11, 1.08, 1.12, 2.5];
    const hl = computeHodgesLehmann(ratios);
    const tm = computeTrimmedMean(ratios, 0.2);

    expect(hl).toBeGreaterThanOrEqual(1.09);
    expect(hl).toBeLessThanOrEqual(1.25);
    // Tukey IQR pruning drops the 2.50 outlier
    expect(tm).toBeGreaterThanOrEqual(1.09);
    expect(tm).toBeLessThanOrEqual(1.15);
  });

  it("detects cross-project concentration (HHI) and inter-project variance", () => {
    // Highly concentrated sample: 4 out of 5 from p1
    const concentrated = [
      { projectId: "p1", ratio: 1.1 },
      { projectId: "p1", ratio: 1.11 },
      { projectId: "p1", ratio: 1.12 },
      { projectId: "p1", ratio: 1.1 },
      { projectId: "p2", ratio: 1.1 },
    ];
    const dispConc = computeProjectDispersion(concentrated);
    expect(dispConc.hhi).toBeGreaterThan(0.38);

    // Balanced sample across 4 distinct projects
    const balanced = [
      { projectId: "p1", ratio: 1.1 },
      { projectId: "p2", ratio: 1.11 },
      { projectId: "p3", ratio: 1.09 },
      { projectId: "p4", ratio: 1.1 },
      { projectId: "p5", ratio: 1.12 },
    ];
    const dispBal = computeProjectDispersion(balanced);
    expect(dispBal.hhi).toBeLessThan(0.38);
    expect(dispBal.interProjectCV).toBeLessThan(0.05);
  });

  it("performs autonomous triple-check consensus verification and auto-approves when verified", () => {
    // 5 verified observations across 5 distinct projects with consensus ratios ~ 1.08
    const rows = [
      feedback(1, 1.08, true, "p1"),
      feedback(2, 1.07, true, "p2"),
      feedback(3, 1.09, true, "p3"),
      feedback(4, 1.08, true, "p4"),
      feedback(5, 1.08, true, "p5"),
    ];

    const result = verifyTripleCheckConsensus(rows, "NG", "paint", "material");
    expect(result.passed).toBe(true);
    expect(result.consensusReached).toBe(true);
    expect(result.projectDiversityPassed).toBe(true);
    expect(result.physicalBoundsPassed).toBe(true);
    expect(result.consensusMultiplier).toBeCloseTo(1.08, 2);
    expect(result.approval).not.toBeNull();
    expect(result.approval?.decision).toBe("approved");
    expect(result.approval?.reviewerId).toBe(
      "autonomous_triple_check_verifier_v1",
    );

    // Auto-approve integration test
    const candidate = buildCalibrationCandidate(
      rows,
      "NG",
      "paint",
      "material",
    );
    expect(candidate.verifiedAndApproved).toBe(true);
    const { approval } = autoApproveVerifiedCandidate(candidate, rows);
    expect(approval).not.toBeNull();

    // Verify resolved multiplier matches auto-approved multiplier
    const resolved = resolveApprovedMultiplier(
      candidate,
      approval,
      approval!.candidateFingerprint,
    );
    expect(resolved).toBe(candidate.proposedMultiplier);
  });

  it("blocks triple-check auto-approval when estimators diverge beyond consensusMaxDelta", () => {
    // Fabricate conflicting data that causes divergence between EMA and trimmed mean
    const divergingRows = [
      feedback(1, 0.85, true, "p1"),
      feedback(2, 0.85, true, "p2"),
      feedback(3, 0.86, true, "p3"),
      feedback(4, 1.25, true, "p4"),
      feedback(5, 1.25, true, "p5"),
    ];
    const result = verifyTripleCheckConsensus(
      divergingRows,
      "NG",
      "paint",
      "material",
      {
        minObservations: 5,
        minDistinctProjects: 3,
        minVerifiedObservations: 3,
        minVerifiedShare: 0.6,
        maxAdjustmentFraction: 0.25,
        emaAlpha: 0.5,
        consensusMaxDelta: 0.02, // strict threshold
        maxHhi: 0.38,
        maxInterProjectCV: 0.15,
        requireVerifiedEvidence: true,
      },
    );
    expect(result.passed).toBe(false);
    expect(result.consensusReached).toBe(false);
    expect(result.blockers).toContain("estimator_consensus_divergence");
    expect(result.approval).toBeNull();
  });

  it("resolves multi-standard global classifications beyond Procore", () => {
    // UK market classification resolves Uniclass 2015 and NRM2
    const ukConcrete = resolveGlobalClassification(
      "cast-in-place concrete slab",
      "GB",
    );
    expect(ukConcrete).not.toBeNull();
    expect(ukConcrete?.primaryCode).toContain("Ss_20_10");
    expect(ukConcrete?.masterFormat.code).toBe("03 30 00");
    expect(ukConcrete?.nrm2.code).toBe("Section 11");

    // Germany market classification resolves DIN 276
    const deMasonry = resolveGlobalClassification("brick masonry wall", "DE");
    expect(deMasonry).not.toBeNull();
    expect(deMasonry?.primaryCode).toContain("331.1");
    expect(deMasonry?.masterFormat.code).toBe("04 20 00");

    // Australia market classification resolves NATSPEC
    const auPaint = resolveGlobalClassification(
      "wall painting and finishes",
      "AU",
    );
    expect(auPaint).not.toBeNull();
    expect(auPaint?.natspec?.code).toBe("0611");

    // Primary standards per market
    expect(getPrimaryClassificationForMarket("GB").standard).toContain(
      "Uniclass 2015",
    );
    expect(getPrimaryClassificationForMarket("DE").standard).toContain(
      "DIN 276",
    );
    expect(getPrimaryClassificationForMarket("AU").standard).toContain(
      "NATSPEC",
    );
    expect(getPrimaryClassificationForMarket("US").standard).toContain(
      "CSI MasterFormat",
    );
  });

  it("exports multi-standard global budget CSV with calibration multiplier and verification status", () => {
    const csv = exportGlobalBudgetCsv([
      {
        costCode: "03 30 00",
        costCodeDescription: "Cast-in-Place Concrete",
        costType: "M",
        description: "Foundations concrete",
        uom: "m3",
        quantity: 54,
        baseQuantity: 50,
        multiplier: 1.08,
        multiplierStatus: "verified_triple_check",
        unitCost: 150,
        amount: 8100,
        currency: "GBP",
        marketCode: "GB",
        sourceStatus: "verified",
        primaryStandard: "Uniclass 2015 / NRM2",
        uniFormat: "B1010",
        uniclass2015: "Ss_20_10_75_15",
        nrm2: "Section 11",
        din276: "331",
      },
    ]);

    expect(csv).toContain("Uniclass 2015 / NRM2");
    expect(csv).toContain("Ss_20_10_75_15");
    expect(csv).toContain("Section 11");
    expect(csv).toContain("DIN 276");
    expect(csv).toContain("verified_triple_check");
    expect(csv).toContain("1.08");
    expect(csv).toContain("GBP");
  });

  it("suggests cost codes and exports standard budget csv with backward compatibility", () => {
    const costCode = suggestCostCode("cast-in-place concrete slab", "M", "US");
    expect(costCode?.costCode).toBe("03 30 00");
    expect(costCode?.primaryStandard).toContain("MasterFormat");

    const csv = exportBudgetCsv([
      {
        costCode: "03 30 00",
        costCodeDescription: "Cast-in-Place Concrete",
        costType: "M",
        description: "Test slab",
        uom: "m3",
        quantity: 10,
        unitCost: 100,
        amount: 1000,
        currency: "USD",
        marketCode: "US",
        sourceStatus: "verified",
      },
    ]);
    expect(csv).toContain("03 30 00");
    expect(csv).toContain("Test slab");
    expect(csv).toContain("1000");
  });

  it("hardens storage and validation against malformed or corrupted localStorage rows", () => {
    // Calling validation on empty or non-object row returns errors instead of throwing
    const emptyRowErrors = validateCalibrationFeedback({} as any);
    expect(emptyRowErrors).toContain("missing_id");
    expect(emptyRowErrors).toContain("missing_project_id");
    expect(emptyRowErrors).toContain("missing_market");

    // Null or undefined object handling
    expect(validateCalibrationFeedback(null as any)).toContain("invalid_row_object");

    // Memory storage with invalid JSON items
    const mockStore: Storage = {
      getItem: () => JSON.stringify([{}, { id: "corrupt" }, null, "garbage"]),
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 1,
    };
    const loaded = getCalibrationFeedback(mockStore);
    expect(loaded).toEqual([]);
  });

  it("isolates candidates by unit of measure preventing cross-unit mixing", () => {
    const mixedUnitRows: CalibrationFeedback[] = [
      {
        id: "r1",
        projectId: "p1",
        marketCode: "NG",
        materialKey: "sand",
        measure: "material",
        estimatedQuantity: 10,
        actualQuantity: 12,
        unit: "bag",
        evidence: "verified_project",
        evidenceReference: "PO-12345",
        reviewerId: "rev1",
        reviewedAt: "2026-01-01T00:00:00Z",
        recordedAt: "2026-01-01T00:00:00Z",
        context: "takeoff",
        status: "accepted",
      },
      {
        id: "r2",
        projectId: "p2",
        marketCode: "NG",
        materialKey: "sand",
        measure: "material",
        estimatedQuantity: 1000,
        actualQuantity: 1100,
        unit: "kg",
        evidence: "verified_project",
        evidenceReference: "PO-67890",
        reviewerId: "rev1",
        reviewedAt: "2026-01-02T00:00:00Z",
        recordedAt: "2026-01-02T00:00:00Z",
        context: "takeoff",
        status: "accepted",
      },
    ];

    const bagCandidate = buildCalibrationCandidate(mixedUnitRows, "NG", "sand", "material", "bag");
    expect(bagCandidate.unit).toBe("bag");
    expect(bagCandidate.observationCount).toBe(1);

    const kgCandidate = buildCalibrationCandidate(mixedUnitRows, "NG", "sand", "material", "kg");
    expect(kgCandidate.unit).toBe("kg");
    expect(kgCandidate.observationCount).toBe(1);

    expect(calibrationCandidateKey(bagCandidate)).not.toBe(calibrationCandidateKey(kgCandidate));
  });

  it("rejects invalid or unassigned market codes", () => {
    const invalidMarketCandidate = buildCalibrationCandidate(
      [],
      "UNKNOWN",
      "paint",
      "material",
    );
    expect(invalidMarketCandidate.eligible).toBe(false);
    expect(invalidMarketCandidate.blockers).toContain("invalid_or_unassigned_market");

    const currencyCandidate = buildCalibrationCandidate(
      [],
      "NGN",
      "paint",
      "material",
    );
    expect(currencyCandidate.eligible).toBe(false);
    expect(currencyCandidate.blockers).toContain("invalid_or_unassigned_market");
  });

  it("revokes accepted review status when actual quantities or units are modified", () => {
    let state: CalibrationFeedback[] = [
      {
        id: "rec1",
        projectId: "p1",
        marketCode: "NG",
        materialKey: "paint",
        measure: "material",
        estimatedQuantity: 10,
        actualQuantity: 11,
        unit: "ltr",
        evidence: "verified_project",
        evidenceReference: "REF-001",
        reviewerId: "auditor_1",
        reviewedAt: "2026-01-01T00:00:00Z",
        recordedAt: "2026-01-01T00:00:00Z",
        context: "takeoff",
        status: "accepted",
      },
    ];

    const mockStore: Storage = {
      getItem: () => JSON.stringify(state),
      setItem: (_, val) => {
        state = JSON.parse(val);
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 1,
    };

    // Update quantity
    updateCalibrationFeedback("rec1", { actualQuantity: 20 }, mockStore);
    expect(state[0].status).toBe("pending_review");
    expect(state[0].reviewerId).toBeUndefined();
    expect(state[0].reviewedAt).toBeUndefined();
  });

  it("prunes rejected rows before accepted or verified evidence when cap is reached", () => {
    const records: CalibrationFeedback[] = [
      {
        id: "rej1",
        projectId: "p1",
        marketCode: "NG",
        materialKey: "cement",
        measure: "material",
        estimatedQuantity: 10,
        actualQuantity: 10,
        unit: "bag",
        evidence: "user_reported",
        recordedAt: "2026-01-01T00:00:00Z",
        context: "takeoff",
        status: "rejected",
      },
      {
        id: "ver1",
        projectId: "p2",
        marketCode: "NG",
        materialKey: "cement",
        measure: "material",
        estimatedQuantity: 10,
        actualQuantity: 11,
        unit: "bag",
        evidence: "verified_project",
        evidenceReference: "PO-7777",
        reviewerId: "admin",
        reviewedAt: "2026-01-01T00:00:00Z",
        recordedAt: "2026-01-01T00:00:00Z",
        context: "takeoff",
        status: "accepted",
      },
    ];

    const pruned = pruneFeedbackRecords(records, 1);
    expect(pruned.length).toBe(1);
    expect(pruned[0].id).toBe("ver1");
  });

  it("neutralizes CSV formula injection and prepends UTF-8 BOM", () => {
    const dangerousRows = [
      {
        costCode: "01 00 00",
        costCodeDescription: '=HYPERLINK("http://attacker.com","click")',
        costType: "M",
        description: "+SUM(1,2)",
        uom: "@unit",
        quantity: 10,
        unitCost: null,
        amount: null,
        currency: "-USD",
        marketCode: "US",
        sourceStatus: "user_entered" as const,
      },
    ];

    const csv = exportBudgetCsv(dangerousRows);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+SUM(1,2)");
    expect(csv).toContain("'@unit");
    expect(csv).toContain("'-USD");
  });

  it("scores cost code classification with specificity (steel door -> openings, concrete block -> masonry)", () => {
    const steelDoor = resolveGlobalClassification("steel door", "US");
    expect(steelDoor).not.toBeNull();
    expect(steelDoor?.category).toBe("openings");
    expect(steelDoor?.masterFormat.code).toBe("08 00 00");

    const concreteBlock = resolveGlobalClassification("concrete block", "US");
    expect(concreteBlock).not.toBeNull();
    expect(concreteBlock?.category).toBe("masonry");
    expect(concreteBlock?.masterFormat.code).toBe("04 20 00");

    const readyMix = resolveGlobalClassification("ready mix concrete", "US");
    expect(readyMix?.category).toBe("concrete");
    expect(readyMix?.masterFormat.code).toBe("03 30 00");
  });

  it("clamps shadow estimates according to calibration policy limits", () => {
    const policy = {
      minObservations: 3,
      minDistinctProjects: 2,
      minVerifiedObservations: 2,
      minVerifiedShare: 0.5,
      maxAdjustmentFraction: 0.15, // max 1.15
      emaAlpha: 0.25,
    };

    const shadow = compareShadowEstimate(100, 1.5, policy);
    expect(shadow.shadow).toBe(115); // clamped to 1 + 0.15 = 1.15
    expect(shadow.delta).toBe(15);
  });

  it("guarantees empirical confidence range requires minimum observations and clamps outliers", () => {
    // Single observation returns null
    const singleRow: CalibrationFeedback[] = [
      {
        id: "s1",
        projectId: "p1",
        marketCode: "NG",
        materialKey: "tile",
        measure: "material",
        estimatedQuantity: 10,
        actualQuantity: 50, // 5x outlier
        unit: "m2",
        evidence: "verified_project",
        evidenceReference: "PO-123",
        reviewerId: "rev",
        reviewedAt: "2026-01-01T00:00:00Z",
        recordedAt: "2026-01-01T00:00:00Z",
        context: "takeoff",
        status: "accepted",
      },
    ];

    const rangeOne = empiricalConfidenceRange(10, singleRow, "NG", "tile", "material", "m2");
    expect(rangeOne).toBeNull();

    // 3 rows with outlier clamped to max adjustment (1.25)
    const threeRows: CalibrationFeedback[] = [
      ...singleRow,
      {
        id: "s2",
        projectId: "p2",
        marketCode: "NG",
        materialKey: "tile",
        measure: "material",
        estimatedQuantity: 10,
        actualQuantity: 10,
        unit: "m2",
        evidence: "verified_project",
        evidenceReference: "PO-124",
        reviewerId: "rev",
        reviewedAt: "2026-01-02T00:00:00Z",
        recordedAt: "2026-01-02T00:00:00Z",
        context: "takeoff",
        status: "accepted",
      },
      {
        id: "s3",
        projectId: "p3",
        marketCode: "NG",
        materialKey: "tile",
        measure: "material",
        estimatedQuantity: 10,
        actualQuantity: 11,
        unit: "m2",
        evidence: "verified_project",
        evidenceReference: "PO-125",
        reviewerId: "rev",
        reviewedAt: "2026-01-03T00:00:00Z",
        recordedAt: "2026-01-03T00:00:00Z",
        context: "takeoff",
        status: "accepted",
      },
    ];

    const rangeThree = empiricalConfidenceRange(10, threeRows, "NG", "tile", "material", "m2");
    expect(rangeThree).not.toBeNull();
    // High should be bounded by policy clamp (12.5), not 5x (50)
    expect(rangeThree!.high).toBeLessThanOrEqual(12.5);
  });

  it("supports record deletion and audit trail tracking", () => {
    let state: CalibrationFeedback[] = [
      {
        id: "del1",
        projectId: "p1",
        marketCode: "NG",
        materialKey: "paint",
        measure: "material",
        estimatedQuantity: 10,
        actualQuantity: 11,
        unit: "ltr",
        evidence: "user_reported",
        recordedAt: "2026-01-01T00:00:00Z",
        context: "takeoff",
        status: "pending_review",
      },
    ];

    let auditState: any[] = [];

    const mockStore: Storage = {
      getItem: (key) => (key.includes("audit") ? JSON.stringify(auditState) : JSON.stringify(state)),
      setItem: (key, val) => {
        if (key.includes("audit")) {
          auditState = JSON.parse(val);
        } else {
          state = JSON.parse(val);
        }
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 2,
    };

    deleteCalibrationFeedback("del1", mockStore);
    expect(state.length).toBe(0);

    recordAuditEvent(
      {
        eventType: "approval_revoked",
        candidateKey: "NG:paint:material:ltr",
        actorId: "test_actor",
        details: { reason: "quantity edited" },
      },
      mockStore,
    );

    const events = getAuditEvents(mockStore);
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("approval_revoked");
  });
});
