import { describe, expect, it } from "vitest";
import {
  DEFAULT_CALIBRATION_POLICY,
  buildCalibrationCandidate,
  buildCalibrationCandidates,
  calibrationCandidateFingerprint,
  calibrationCandidateKey,
  compareShadowEstimate,
  createAuditEvent,
  empiricalConfidenceRange,
  exportBudgetCsv,
  normaliseMarketCode,
  normaliseMaterialKey,
  normaliseUnit,
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
const series = (ratios: number[]) =>
  ratios.map((ratio, index) =>
    row({
      projectId: `p${(index % 3) + 1}`,
      actualQuantity: 100 * ratio,
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
    expect(candidate.observationCount).toBe(5);
    expect(candidate.distinctProjectCount).toBe(3);
    expect(candidate.verifiedObservationCount).toBe(5);
    expect(candidate.proposedMultiplier).toBeCloseTo(1.05, 4);
    expect(candidate.policyVersion).toBe(DEFAULT_CALIBRATION_POLICY.version);
    expect(candidate.fingerprint).toHaveLength(16);
  });

  it("states every reason a series is not yet usable", () => {
    const candidate = buildCalibrationCandidate(series([1.1, 0.9]), scope);
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
    expect(empiricalConfidenceRange(100, series([1, 1.1]), scope)).toBeNull();
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
    expect(suggestCostCode("steel door", "M", "NG")?.costCode).toBe("08 00 00");
    expect(suggestCostCode("steel", "M", "NG")?.costCode).toBe("05 12 00");
    expect(suggestCostCode("tile roof", "M", "NG")?.costCode).toBe("07 00 00");
    expect(suggestCostCode("concrete block", "M", "NG")?.division).toBe("04");
    expect(suggestCostCode("emulsion paint", "M", "NG")?.division).toBe("09");
    expect(suggestCostCode("quantum flux", "M", "NG")).toBeNull();
    expect(suggestCostCode("", "M", "NG")).toBeNull();
    expect(suggestCostCode("tile", "  ", "NG")).toBeNull();
  });

  it("says whether a classification standard applies to the market", () => {
    expect(suggestCostCode("tile", "M", "NG")?.applicableToMarket).toBe(false);
    expect(suggestCostCode("tile", "M", "US")?.applicableToMarket).toBe(true);
    expect(suggestCostCode("tile", "M")?.applicableToMarket).toBe(false);
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

  it("clamps candidates strictly to physical material bounds", () => {
    // Block physical bounds are [0.85, 1.25]. A wild 2.0x ratio cannot break physics.
    const wildRatios = [1.8, 1.9, 2.0, 1.85, 1.95];
    const candidate = buildCalibrationCandidate(series(wildRatios), scope);
    expect(candidate.proposedMultiplier).toBeLessThanOrEqual(1.25);
    expect(candidate.physicalBoundsApplied?.max).toBe(1.25);
  });

  it("discards extreme outliers using IQR filtering so typos do not corrupt baseline", () => {
    // 5 normal observations around 1.05 and 1 extreme 10x typo entry
    const normalRows = series([1.02, 1.04, 1.05, 1.06, 1.05]);
    const typoRow = row({
      projectId: "p4",
      actualQuantity: 1000, // 10x typo (1000 instead of 100)
    });
    const candidate = buildCalibrationCandidate([...normalRows, typoRow], scope);
    expect(candidate.outlierCount).toBe(1);
    expect(candidate.outlierRatios).toContain(10);
    // Proposed multiplier should be uncorrupted by the 10x typo
    expect(candidate.proposedMultiplier).toBeCloseTo(1.05, 2);
  });

  it("weights Quantity Surveyors and Civil Engineers 3x higher than anonymous users", () => {
    // 3 anonymous rows at 1.00 and 1 QS row at 1.15
    const rows = [
      row({ id: "a1", projectId: "p1", actualQuantity: 100, contributorRole: "anonymous" }),
      row({ id: "a2", projectId: "p2", actualQuantity: 100, contributorRole: "anonymous" }),
      row({ id: "a3", projectId: "p3", actualQuantity: 100, contributorRole: "anonymous" }),
      row({ id: "qs1", projectId: "p1", actualQuantity: 115, contributorRole: "quantity_surveyor" }),
      row({ id: "a4", projectId: "p2", actualQuantity: 102, contributorRole: "anonymous" }),
    ];
    const candidate = buildCalibrationCandidate(rows, scope);
    // QS weight = 3x, anonymous = 1x.
    // Values: 1.00 (w=1), 1.00 (w=1), 1.00 (w=1), 1.02 (w=1), 1.15 (w=3). Total weight = 7. Half weight = 3.5.
    // Cum weight: 1.00 (3) -> 1.02 (4 >= 3.5) -> median is 1.02, shifted towards the QS observation.
    expect(candidate.proposedMultiplier).toBe(1.02);
  });
});
