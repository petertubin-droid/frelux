import { describe, expect, it } from "vitest";
import {
  DEFAULT_CALIBRATION_POLICY,
  buildCalibrationCandidate,
  buildCalibrationCandidates,
  calibrationCandidateFingerprint,
  calibrationCandidateKey,
  compareShadowEstimate,
  createAuditEvent,
  getEffectiveRoleWeight,
  empiricalConfidenceRange,
  exportBudgetCsv,
  normaliseMarketCode,
  normaliseMaterialKey,
  normaliseUnit,
  costCodeStandardForMarket,
  resolveApprovedMultiplier,
  sanitiseCalibrationFeedback,
  suggestCostCode,
  validateCalibrationFeedback,
  type CalibrationApproval,
  type CalibrationFeedback,
} from "../adaptive-calibration";

let sequence = 0;

const row = (over: Partial<CalibrationFeedback> = {}): CalibrationFeedback => ({
  id: `r${(sequence += 1)}`,
  projectId: "p1",
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
  source: "device",
  evidenceReference: "close-out-1",
  reviewerId: "admin-1",
  reviewerRole: "admin",
  reviewedAt: "2026-11-02T00:00:00.000Z",
  ...over,
});

const scope = {
  marketCode: "NG",
  materialKey: "block",
  measure: "material" as const,
  unit: "piece",
};

/** Five observations spread over three projects, with the given ratios. */
// The eligibility floor is 20 observations across 6 projects, so a series
// repeats the supplied pattern until it reaches that sample size.
const series = (ratios: number[], total = 20) =>
  Array.from({ length: total }, (_, index) =>
    row({
      projectId: `p${(index % 6) + 1}`,
      actualQuantity: 100 * ratios[index % ratios.length],
    }),
  );

const approvalFor = (
  candidate: ReturnType<typeof buildCalibrationCandidate>,
  over: Partial<CalibrationApproval> = {},
): CalibrationApproval => ({
  candidateKey: calibrationCandidateKey(candidate),
  decision: "approved",
  reviewerId: "admin-1",
  reviewerRole: "admin",
  reviewedAt: "2026-11-03T00:00:00.000Z",
  reason: "Checked against the close out records",
  candidateFingerprint: calibrationCandidateFingerprint(candidate),
  policyVersion: DEFAULT_CALIBRATION_POLICY.version,
  ...over,
});

describe("adaptive calibration", () => {
  it("builds a bounded candidate only from accepted comparisons", () => {
    const candidate = buildCalibrationCandidate(
      series([1.1, 1.2, 1.05, 0.95, 1.0]),
      scope,
    );
    expect(candidate.eligible).toBe(true);
    expect(candidate.blockers).toEqual([]);
    expect(candidate.observationCount).toBe(20);
    expect(candidate.distinctProjectCount).toBe(6);
    expect(candidate.verifiedObservationCount).toBe(20);
    expect(candidate.proposedMultiplier).toBeCloseTo(1.05, 4);
    expect(candidate.policyVersion).toBe(DEFAULT_CALIBRATION_POLICY.version);
    expect(candidate.fingerprint).toHaveLength(16);
  });

  it("states every reason a series is not yet usable", () => {
    const thin = [
      row({ projectId: "p1" }),
      row({ projectId: "p1" }),
      row({
        projectId: "p2",
        evidence: "self_attested",
        reviewerId: undefined,
        reviewerRole: "owner",
        evidenceReference: undefined,
      }),
    ];
    const candidate = buildCalibrationCandidate(thin, scope);
    expect(candidate.eligible).toBe(false);
    expect(candidate.blockers).toContain("insufficient_observations");
    expect(candidate.blockers).toContain("insufficient_distinct_projects");
    expect(candidate.blockers).toContain("insufficient_verified_observations");
  });

  it("excludes structural and compliance observations", () => {
    const structural = row({ context: "structural" });
    expect(validateCalibrationFeedback(structural)).toContain(
      "safety_sensitive_context",
    );
    expect(
      buildCalibrationCandidate([structural], scope).observationCount,
    ).toBe(0);
    expect(
      validateCalibrationFeedback(row({ context: "compliance" })),
    ).toContain("safety_sensitive_context");
  });

  it("deduplicates ids and keeps each unit as its own series", () => {
    const shared = [
      row({ id: "same" }),
      row({ id: "same" }),
      row({ unit: "bag" }),
      row({ unit: "litre" }),
    ];
    expect(buildCalibrationCandidate(shared, scope).observationCount).toBe(1);
    expect(
      buildCalibrationCandidates(shared, { marketCode: "NG" }),
    ).toHaveLength(3);
    const bags = buildCalibrationCandidate(shared, {
      ...scope,
      unit: "bag",
    });
    expect(bags.unit).toBe("bag");
    expect(bags.observationCount).toBe(1);
    // A bag series can never borrow the piece observations.
    expect(bags.proposedMultiplier).toBe(1.1);
  });

  it("refuses a currency code as a market", () => {
    expect(normaliseMarketCode("NGN")).toBe("");
    expect(normaliseMarketCode("ng")).toBe("NG");
    expect(normaliseMarketCode("UK")).toBe("GB");
    const candidate = buildCalibrationCandidate([row({ marketCode: "NGN" })], {
      ...scope,
      marketCode: "NGN",
    });
    expect(candidate.blockers).toContain("unsupported_market");
    expect(candidate.observationCount).toBe(0);
  });

  it("normalises regional spellings into one series", () => {
    expect(normaliseMaterialKey("9 inch block")).toBe("block");
    expect(normaliseMaterialKey("9 inch blocks")).toBe("block");
    expect(normaliseMaterialKey("Emulsion paint")).toBe("paint");
    expect(normaliseMaterialKey("  ")).toBe("");
    expect(normaliseUnit("M²")).toBe("m2");
    expect(normaliseUnit("head pans")).toBe("headpan");
    expect(normaliseUnit("litres")).toBe("litre");
    expect(normaliseUnit("")).toBe("");
  });

  it("requires an administrator approval of this exact snapshot", () => {
    const candidate = buildCalibrationCandidate(
      series([1.1, 1.2, 1.05, 0.95, 1.0]),
      scope,
    );
    const approval = approvalFor(candidate);
    expect(resolveApprovedMultiplier(candidate, approval)).toBe(
      candidate.proposedMultiplier,
    );
    expect(
      resolveApprovedMultiplier(candidate, {
        ...approval,
        reviewerRole: "owner",
      }),
    ).toBeNull();
    expect(
      resolveApprovedMultiplier(candidate, {
        ...approval,
        decision: "rejected",
      }),
    ).toBeNull();
    expect(
      resolveApprovedMultiplier(candidate, {
        ...approval,
        candidateFingerprint: "0".repeat(16),
      }),
    ).toBeNull();
    expect(
      resolveApprovedMultiplier(candidate, {
        ...approval,
        policyVersion: "2020-01-01",
      }),
    ).toBeNull();
    expect(resolveApprovedMultiplier(candidate, null)).toBeNull();
  });

  it("invalidates an approval when new evidence arrives", () => {
    const candidate = buildCalibrationCandidate(
      series([1.1, 1.2, 1.05, 0.95, 1.0]),
      scope,
    );
    const approval = approvalFor(candidate);
    const grown = buildCalibrationCandidate(
      [...series([1.1, 1.2, 1.05, 0.95, 1.0]), row({ projectId: "p4" })],
      scope,
    );
    expect(grown.fingerprint).not.toBe(candidate.fingerprint);
    expect(resolveApprovedMultiplier(grown, approval)).toBeNull();
  });

  it("binds the shadow clamp to the policy, not a constant", () => {
    const strict = {
      ...DEFAULT_CALIBRATION_POLICY,
      maxAdjustmentFraction: 0.1,
    };
    expect(compareShadowEstimate(100, 1.25, strict).shadow).toBeCloseTo(110, 3);
    expect(compareShadowEstimate(100, 0.5, strict).shadow).toBeCloseTo(90, 3);
    expect(compareShadowEstimate(100, null).shadow).toBeCloseTo(100, 3);
    expect(compareShadowEstimate(0, 1.2).deltaFraction).toBeNull();
  });

  it("gives a range the same minimum, clamp and dedupe as a candidate", () => {
    expect(
      empiricalConfidenceRange(
        100,
        [row({ id: "m1" }), row({ id: "m2" })],
        scope,
      ),
    ).toBeNull();
    expect(
      empiricalConfidenceRange(
        100,
        [row({ id: "x" }), row({ id: "x" }), row({ id: "y" })],
        scope,
      ),
    ).toBeNull();
    const range = empiricalConfidenceRange(
      100,
      [
        row({ id: "a", actualQuantity: 500 }),
        row({ id: "b", actualQuantity: 100 }),
        row({ id: "c", actualQuantity: 110 }),
      ],
      scope,
    );
    expect(range).not.toBeNull();
    expect(range!.high).toBeLessThanOrEqual(125);
    expect(range!.low).toBeGreaterThanOrEqual(75);
    expect(range!.observations).toBe(3);
    expect(range!.method).toBe("empirical_quantiles");
  });

  it("orders observations by instant, then id, so a trend is reproducible", () => {
    // A is 08:00Z and B is 09:00Z, but A sorts later as a string because of the
    // offset. The engine must use the instant.
    const a = row({
      id: "a",
      projectId: "p1",
      actualQuantity: 100,
      recordedAt: "2026-11-01T10:00:00+02:00",
    });
    const b = row({
      id: "b",
      projectId: "p2",
      actualQuantity: 120,
      recordedAt: "2026-11-01T09:00:00+00:00",
    });
    const forward = buildCalibrationCandidate([a, b], scope);
    const backward = buildCalibrationCandidate([b, a], scope);
    expect(forward.trendMultiplier).toBe(backward.trendMultiplier);
    expect(forward.trendMultiplier).toBeCloseTo(1.05, 4);
    expect(forward.observedAt).toBe("2026-11-01T09:00:00.000Z");
  });

  it("survives junk in storage instead of throwing", () => {
    const junk = [
      {},
      null,
      5,
      "row",
      { id: "x" },
      { id: "y", status: "maybe" },
    ];
    expect(() =>
      buildCalibrationCandidates(junk, { marketCode: "NG" }),
    ).not.toThrow();
    expect(buildCalibrationCandidates(junk, { marketCode: "NG" })).toEqual([]);
    expect(sanitiseCalibrationFeedback({})).toBeNull();
    expect(sanitiseCalibrationFeedback(null)).toBeNull();
    expect(validateCalibrationFeedback({})).toContain("missing_id");
  });

  it("classifies with whole words and an explicit priority", () => {
    // Priority and specificity decide, not the order of the hint table.
    expect(suggestCostCode("steel door", "M", "US")?.costCode).toBe("08 00 00");
    expect(suggestCostCode("steel", "M", "US")?.costCode).toBe("05 12 00");
    expect(suggestCostCode("tile roof", "M", "US")?.costCode).toBe("07 00 00");
    expect(suggestCostCode("concrete block", "M", "US")?.division).toBe("04");
    expect(suggestCostCode("emulsion paint", "M", "US")?.division).toBe("09");
    expect(suggestCostCode("quantum flux", "M", "US")).toBeNull();
    expect(suggestCostCode("", "M", "US")).toBeNull();
    expect(suggestCostCode("tile", "  ", "US")).toBeNull();
  });

  it("never borrows a foreign code for a market that has its own", () => {
    // The standard follows the market, so a Nigerian project is never handed a
    // US division number as if it were local.
    expect(suggestCostCode("tile", "M", "NG")?.standard).toBe("nrm");
    expect(suggestCostCode("tile", "M", "US")?.standard).toBe(
      "csi_masterformat",
    );
    expect(suggestCostCode("tile", "M", "IN")?.standard).toBe("is_1200");
    // No market at all: a trade group, still applicable, never a fake code.
    expect(suggestCostCode("tile", "M")?.standard).toBe("generic");
    expect(suggestCostCode("tile", "M")?.costCode).toBe("");
  });

  it("exports WBS data that a spreadsheet cannot execute", () => {
    const csv = exportBudgetCsv([
      {
        costCode: "09 00 00",
        costCodeDescription: "Finishes",
        costType: "M",
        description: '=HYPERLINK("http://example.com","click")',
        uom: "m2",
        quantity: 12,
        unitCost: null,
        amount: null,
        currency: "NGN",
        marketCode: "NG",
        sourceStatus: "user_entered",
        classificationStandard: "csi_masterformat",
      },
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).not.toMatch(/,=HYPERLINK/);
    expect(csv).toContain("NGN");
    expect(csv).toContain("user_entered");
    expect(csv).toContain("csi_masterformat");
    expect(csv).toContain('"Finishes"'.replace(/"/g, "") + "");
    const plain = exportBudgetCsv([], { bom: false });
    expect(plain.startsWith("Cost Code")).toBe(true);
    expect(plain).not.toContain("\uFEFF");
  });

  it("writes audit ids deterministically", () => {
    const input = {
      entityType: "calibration_candidate" as const,
      entityKey: "NG:block:material:piece",
      action: "approved" as const,
      actorId: "admin-1",
      occurredAt: "2026-11-03T00:00:00.000Z",
      reason: "Checked",
    };
    expect(createAuditEvent(input).id).toBe(createAuditEvent(input).id);
    expect(createAuditEvent(input).id).not.toBe(
      createAuditEvent({ ...input, reason: "Other" }).id,
    );
  });

  it("classifies into the standard the project's market actually uses", () => {
    const us = suggestCostCode("reinforcement", "M", "US");
    expect(us?.standard).toBe("csi_masterformat");
    expect(us?.costCode).toBe("03 30 00");

    const uk = suggestCostCode("reinforcement", "M", "GB");
    expect(uk?.standard).toBe("nrm");
    expect(uk?.costCode).toBe("2.1");

    const ng = suggestCostCode("reinforcement", "M", "NG");
    expect(ng?.standard).toBe("nrm");
    expect(ng?.standardLabel).toBe("RICS NRM");

    const india = suggestCostCode("reinforcement", "M", "IN");
    expect(india?.standard).toBe("is_1200");
    expect(india?.costCode).toBe("5.1");

    // A market with no registered convention gets a trade group, not a
    // borrowed foreign code.
    const unknown = suggestCostCode("reinforcement", "M", "ZZ");
    expect(unknown?.standard).toBe("generic");
    expect(unknown?.costCode).toBe("");
    expect(unknown?.description).toBe("Concrete");
    expect(costCodeStandardForMarket("ZZ")).toBe("generic");
  });

  it("refuses a candidate whose projects disagree, even with enough of them", () => {
    // Four tight observations and one project reporting four times the work.
    const rows = [
      row({ projectId: "a", actualQuantity: 104 }),
      row({ projectId: "b", actualQuantity: 100 }),
      row({ projectId: "c", actualQuantity: 102 }),
      row({ projectId: "d", actualQuantity: 400 }),
      row({ projectId: "e", actualQuantity: 20 }),
      row({ projectId: "f", actualQuantity: 500 }),
    ];
    const candidate = buildCalibrationCandidate(rows, scope);
    expect(candidate.observationCount).toBe(6);
    expect(candidate.distinctProjectCount).toBe(6);
    expect(candidate.checks.consensus).toBe(false);
    expect(candidate.blockers).toContain("insufficient_consensus");
    expect(candidate.eligible).toBe(false);
    // The median still holds, which is why it is the activation statistic.
    expect(candidate.proposedMultiplier).toBeGreaterThan(0.99);
    expect(candidate.proposedMultiplier).toBeLessThan(1.07);
  });

  it("passes all three gates only when sample, agreement and provenance hold", () => {
    const candidate = buildCalibrationCandidate(
      series([1.1, 1.2, 1.05, 0.95, 1.0]),
      scope,
    );
    expect(candidate.checks).toEqual({
      sample: true,
      consensus: true,
      provenance: true,
    });
    expect(candidate.consensus?.within).toBe(20);
    expect(candidate.consensus?.share).toBe(1);
  });

  it("groups international site units without merging them", () => {
    expect(normaliseUnit("brass")).toBe("brass");
    expect(normaliseUnit("Cu Ft")).toBe("cft");
    expect(normaliseUnit("sq ft")).toBe("sqft");
    expect(normaliseUnit("lbs")).toBe("pound");
    const rows = [
      row({ unit: "brass" }),
      row({ unit: "cft" }),
      row({ unit: "sqft" }),
    ];
    expect(buildCalibrationCandidates(rows, { marketCode: "NG" })).toHaveLength(
      3,
    );
  });

  it("clamps candidates to physical material bounds, not only the policy window", () => {
    const id = (n: string) =>
      row({ id: n, projectId: `p-${n}`, actualQuantity: 160 });
    const candidate = buildCalibrationCandidate(
      [id("a"), id("b"), id("c"), id("d"), id("e")],
      scope,
    );
    expect(candidate.proposedMultiplier).toBe(1.25);
    expect(candidate.physicalBoundsApplied.max).toBe(1.25);
    expect(candidate.physicalBoundsApplied.max).toBeLessThanOrEqual(
      1 + DEFAULT_CALIBRATION_POLICY.maxAdjustmentFraction,
    );
  });

  it("drops a typed-in outlier before it can move the statistic", () => {
    const candidate = buildCalibrationCandidate(
      [
        row({ id: "a", projectId: "p1", actualQuantity: 100 }),
        row({ id: "b", projectId: "p2", actualQuantity: 105 }),
        row({ id: "c", projectId: "p3", actualQuantity: 110 }),
        row({ id: "d", projectId: "p4", actualQuantity: 1000 }),
      ],
      scope,
    );
    expect(candidate.outlierCount).toBe(1);
    expect(candidate.outlierRatios).toContain(10);
    expect(candidate.proposedMultiplier).toBeCloseTo(1.05, 2);
  });

  it("weights a quantity surveyor above an anonymous report", () => {
    const candidate = buildCalibrationCandidate(
      [
        row({
          id: "a",
          projectId: "p1",
          actualQuantity: 100,
          contributorRole: "quantity_surveyor",
        }),
        row({
          id: "b",
          projectId: "p2",
          actualQuantity: 100,
          contributorRole: "quantity_surveyor",
        }),
        row({
          id: "c",
          projectId: "p3",
          actualQuantity: 140,
          evidence: "self_attested",
          reviewerId: undefined,
          reviewerRole: "owner",
          evidenceReference: undefined,
        }),
        row({
          id: "d",
          projectId: "p4",
          actualQuantity: 140,
          evidence: "self_attested",
          reviewerId: undefined,
          reviewerRole: "owner",
          evidenceReference: undefined,
        }),
        row({
          id: "e",
          projectId: "p5",
          actualQuantity: 140,
          evidence: "self_attested",
          reviewerId: undefined,
          reviewerRole: "owner",
          evidenceReference: undefined,
        }),
      ],
      scope,
    );
    expect(candidate.proposedMultiplier).toBe(1);
  });

  it("refuses elevated weights for self-attested claims without trusted verification", () => {
    const unverifiedQSRow = row({
      id: "unverified-qs",
      contributorRole: "quantity_surveyor",
      evidence: "self_attested",
      reviewerId: undefined,
      reviewerRole: undefined,
    });
    expect(getEffectiveRoleWeight(unverifiedQSRow)).toBe(1);

    const verifiedQSRow = row({
      id: "verified-qs",
      contributorRole: "quantity_surveyor",
      evidence: "admin_verified",
      reviewerId: "admin-1",
      reviewerRole: "admin",
    });
    expect(getEffectiveRoleWeight(verifiedQSRow)).toBe(3);
  });
});
