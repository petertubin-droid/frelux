import { describe, expect, it } from "vitest";
import {
  DEFAULT_APPROVAL_POLICY,
  APPROVAL_STAGE_LABELS,
  determineDualSignoff,
  evaluateApprovalTransition,
  isAllowedTransition,
  type ApprovalRecordState,
} from "./approval-hierarchy";

describe("determineDualSignoff", () => {
  it("flags estimates at or above the USD 500,000 threshold", () => {
    const at = determineDualSignoff({ total: 500000, currency: "USD" });
    expect(at.required).toBe(true);
    expect(at.errors).toHaveLength(0);
    const over = determineDualSignoff({ total: 750000, currency: "USD" });
    expect(over.required).toBe(true);
  });

  it("keeps estimates below threshold single-approval", () => {
    const under = determineDualSignoff({ total: 499999.99, currency: "USD" });
    expect(under.required).toBe(false);
    expect(under.reason).toContain("below the 500000 threshold");
  });

  it("refuses a foreign-currency estimate without a converted total instead of guessing FX", () => {
    const r = determineDualSignoff({ total: 800000000, currency: "NGN" });
    expect(r.required).toBe(false);
    expect(r.errors.join(" ")).toContain("no exchange rate was guessed");
  });

  it("uses the caller-supplied converted total when the currency differs", () => {
    const r = determineDualSignoff({ total: 800000000, currency: "NGN", totalInPolicyCurrency: 520000 });
    expect(r.required).toBe(true);
    expect(r.effectiveTotalInPolicyCurrency).toBe(520000);
  });

  it("refuses negative or invalid totals and thresholds", () => {
    expect(determineDualSignoff({ total: -5, currency: "USD" }).errors.join(" ")).toContain("refused to guess");
    expect(
      determineDualSignoff({ total: 100, currency: "USD" }, { dualSignoffThreshold: -1, dualSignoffCurrency: "USD" })
        .errors.join(" "),
    ).toContain("cannot be negative");
  });
});

describe("isAllowedTransition", () => {
  it("walks the exact enterprise flow", () => {
    expect(isAllowedTransition("draft", "lead_estimator_reviewed", false)).toBe(true);
    expect(isAllowedTransition("lead_estimator_reviewed", "commercial_director_approved", false)).toBe(true);
    expect(isAllowedTransition("commercial_director_approved", "tender_issued", false)).toBe(true);
    // over threshold: must pass through the dual stage
    expect(isAllowedTransition("commercial_director_approved", "tender_issued", true)).toBe(false);
    expect(isAllowedTransition("commercial_director_approved", "executive_dual_signed", true)).toBe(true);
    expect(isAllowedTransition("executive_dual_signed", "tender_issued", true)).toBe(true);
  });

  it("forbids stage skipping, backwards moves and post-issue decisions", () => {
    expect(isAllowedTransition("draft", "commercial_director_approved", false)).toBe(false);
    expect(isAllowedTransition("tender_issued", "draft", false)).toBe(false);
    expect(isAllowedTransition("draft", "executive_dual_signed", true)).toBe(false);
    expect(isAllowedTransition("tender_issued", "rejected", false)).toBe(false);
    // reject/withdraw allowed from active stages
    expect(isAllowedTransition("commercial_director_approved", "rejected", true)).toBe(true);
  });
});

describe("evaluateApprovalTransition", () => {
  const state = (over: Partial<ApprovalRecordState> = {}): ApprovalRecordState => ({
    estimateRef: "EST-001",
    currentStage: "draft",
    requiresDualSignoff: false,
    executiveSigners: [],
    ...over,
  });

  it("moves draft -> lead review only for the lead estimator", () => {
    const ok = evaluateApprovalTransition(state(), {
      target: "lead_estimator_reviewed",
      actorId: "u-lead",
      actorRole: "lead_estimator",
    });
    expect(ok.ok).toBe(true);
    expect(ok.reason).toContain("lead_estimator");

    const wrong = evaluateApprovalTransition(state(), {
      target: "lead_estimator_reviewed",
      actorId: "u-x",
      actorRole: "commercial_director",
    });
    expect(wrong.ok).toBe(false);
    expect(wrong.errors.join(" ")).toContain("requires the lead_estimator role");
  });

  it("moves review -> approval only for the commercial director", () => {
    const ok = evaluateApprovalTransition(
      state({ currentStage: "lead_estimator_reviewed" }),
      { target: "commercial_director_approved", actorId: "u-cd", actorRole: "commercial_director" },
    );
    expect(ok.ok).toBe(true);

    const exec = evaluateApprovalTransition(
      state({ currentStage: "lead_estimator_reviewed" }),
      { target: "commercial_director_approved", actorId: "u-exec", actorRole: "executive" },
    );
    expect(exec.ok).toBe(false);
    expect(exec.errors.join(" ")).toContain("requires the commercial_director role");
  });

  it("issues below threshold as commercial director (executive may also act)", () => {
    const cd = evaluateApprovalTransition(
      state({ currentStage: "commercial_director_approved" }),
      { target: "tender_issued", actorId: "u-cd", actorRole: "commercial_director" },
    );
    expect(cd.ok).toBe(true);

    const exec = evaluateApprovalTransition(
      state({ currentStage: "commercial_director_approved" }),
      { target: "tender_issued", actorId: "u-exec", actorRole: "executive" },
    );
    expect(exec.ok).toBe(true);
  });

  it("refuses direct issue over threshold and demands the dual stage first", () => {
    const r = evaluateApprovalTransition(
      state({ currentStage: "commercial_director_approved", requiresDualSignoff: true }),
      { target: "tender_issued", actorId: "u-exec", actorRole: "executive" },
    );
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("Invalid transition");
  });

  it("collects two distinct executive signatures over threshold", () => {
    const first = evaluateApprovalTransition(
      state({ currentStage: "commercial_director_approved", requiresDualSignoff: true }),
      { target: "executive_dual_signed", actorId: "u-exec-1", actorRole: "executive" },
    );
    expect(first.ok).toBe(true);
    expect(first.executiveSignersAfter).toEqual(["u-exec-1"]);

    // Same executive cannot sign twice
    const same = evaluateApprovalTransition(
      state({ currentStage: "commercial_director_approved", requiresDualSignoff: true, executiveSigners: ["u-exec-1"] }),
      { target: "executive_dual_signed", actorId: "u-exec-1", actorRole: "executive" },
    );
    expect(same.ok).toBe(false);
    expect(same.errors.join(" ")).toContain("two DISTINCT executives");

    // Second distinct executive issues
    const second = evaluateApprovalTransition(
      state({ currentStage: "executive_dual_signed", requiresDualSignoff: true, executiveSigners: ["u-exec-1"] }),
      { target: "tender_issued", actorId: "u-exec-2", actorRole: "executive" },
    );
    expect(second.ok).toBe(true);
    expect(second.executiveSignersAfter).toEqual(["u-exec-1", "u-exec-2"]);
    expect(second.reason).toContain("Second distinct executive signature");
  });

  it("refuses issue with no prior executive signature, or a repeat signer", () => {
    const none = evaluateApprovalTransition(
      state({ currentStage: "executive_dual_signed", requiresDualSignoff: true, executiveSigners: [] }),
      { target: "tender_issued", actorId: "u-exec-2", actorRole: "executive" },
    );
    expect(none.ok).toBe(false);
    expect(none.errors.join(" ")).toContain("no first executive signature");

    const repeat = evaluateApprovalTransition(
      state({ currentStage: "executive_dual_signed", requiresDualSignoff: true, executiveSigners: ["u-exec-1"] }),
      { target: "tender_issued", actorId: "u-exec-1", actorRole: "executive" },
    );
    expect(repeat.ok).toBe(false);
    expect(repeat.errors.join(" ")).toContain("must differ from the first executive signer");
  });

  it("refuses unsigned or system-issued transitions", () => {
    const unsigned = evaluateApprovalTransition(state(), {
      target: "lead_estimator_reviewed",
      actorId: "",
      actorRole: "lead_estimator",
    });
    expect(unsigned.ok).toBe(false);
    expect(unsigned.errors.join(" ")).toContain("Unsigned transition");

    const system = evaluateApprovalTransition(state(), {
      target: "lead_estimator_reviewed",
      actorId: "sys",
      actorRole: "system",
    });
    expect(system.ok).toBe(false);
    expect(system.errors.join(" ")).toContain("cannot approve or reject");
  });

  it("allows reject/withdraw from an active stage with a signed actor", () => {
    const reject = evaluateApprovalTransition(
      state({ currentStage: "commercial_director_approved" }),
      { target: "rejected", actorId: "u-cd", actorRole: "commercial_director" },
    );
    expect(reject.ok).toBe(true);
    expect(reject.reason).toContain("rejected");
  });

  it("labels the stages for UIs", () => {
    expect(APPROVAL_STAGE_LABELS.lead_estimator_reviewed).toBe("Reviewed by Lead Estimator");
    expect(APPROVAL_STAGE_LABELS.tender_issued).toBe("Tender Issued");
    expect(DEFAULT_APPROVAL_POLICY.dualSignoffThreshold).toBe(500000);
  });
});
