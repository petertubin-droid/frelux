import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// =========================================================
// ADMIN ARCHIE EVIDENCE & TRUTH (§27, §29 regression 15)
//
// Verifies the Evidence & Truth admin surface:
//   * measured dashboard renders REAL health numbers
//   * claims explorer renders claims + state badges
//   * the claim inspector shows provenance chains,
//     evidence with reliability basis, premises
//   * conflicts are represented (never auto-resolved)
//   * the page never pretends data exists when tables
//     are empty — honest empty states
// =========================================================

const fetchEvidenceHealth = vi.fn();
const listEvidenceClaims = vi.fn();
const fetchClaimProvenance = vi.fn();
const listUnresolvedConflicts = vi.fn();

vi.mock("@/lib/archie/evidence-truth-client", () => ({
  fetchEvidenceHealth: (...a: unknown[]) => fetchEvidenceHealth(...a),
  listEvidenceClaims: (...a: unknown[]) => listEvidenceClaims(...a),
  fetchClaimProvenance: (...a: unknown[]) => fetchClaimProvenance(...a),
  listUnresolvedConflicts: (...a: unknown[]) => listUnresolvedConflicts(...a),
  STATE_STYLES: {
    VERIFIED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    UNVERIFIED: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  VERIFICATION_STATES: [
    "VERIFIED",
    "SUPPORTED",
    "USER_PROVIDED",
    "INFERRED",
    "CONFLICTED",
    "OUTDATED",
    "UNVERIFIED",
    "UNKNOWN",
  ],
}));

import AdminArchieEvidence from "./AdminArchieEvidence";

const HEALTH = {
  total_claims: 42,
  verified_claims: 10,
  supported_claims: 8,
  inferred_claims: 5,
  user_provided_claims: 7,
  conflicted_claims: 2,
  outdated_claims: 1,
  unverified_claims: 6,
  unknown_claims: 3,
  evidence_records: 77,
  evidence_sources: 9,
  provenance_records: 70,
  claim_evidence_links: 74,
  conflicts_total: 4,
  conflicts_unresolved: 2,
  claims_without_evidence: 3,
  orphaned_evidence: 0,
  inferred_marked_as_facts: 0,
  user_provided_marked_verified: 0,
  claims_missing_retrieved_at: 1,
  stale_claims: 1,
  conflicts_without_explanation: 2,
  sample_claims_without_evidence: [],
};

const CLAIM = {
  id: "claim-1",
  claim_key: "claim:abc123",
  subject: "cement",
  predicate: "HAS_COMPRESSIVE_STRENGTH",
  object_value: "42.5 MPa",
  claim_type: "QUANTITY",
  statement: "Portland cement has a compressive strength of 42.5 MPa",
  domain: "construction",
  geo_scope: null,
  subject_concept_key: "14828345-n",
  user_provided: false,
  inferred: false,
  directly_observed: true,
  question: false,
  verification_state: "VERIFIED",
  conflict_state: "NONE",
  source_availability: "SOURCE_AVAILABLE",
  applicable_from: null,
  applicable_until: null,
  retrieved_at: "2026-09-20T10:00:00.000Z",
  version: 1,
  history: [],
  created_date: "2026-09-20T10:00:00.000Z",
  updated_date: "2026-09-20T10:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchEvidenceHealth.mockResolvedValue(HEALTH);
  listEvidenceClaims.mockResolvedValue({ rows: [CLAIM], total: 1 });
  listUnresolvedConflicts.mockResolvedValue([]);
});

describe("AdminArchieEvidence", () => {
  it("renders the measured dashboard from real health numbers", async () => {
    render(<AdminArchieEvidence />);
    await waitFor(() => expect(screen.getByText("Total claims")).toBeTruthy());
    expect(screen.getByText("42")).toBeTruthy(); // total claims
    expect(screen.getByText("10")).toBeTruthy(); // verified
    expect(screen.getByText("77")).toBeTruthy(); // evidence records
    expect(screen.getByText("9")).toBeTruthy(); // distinct sources
    expect(fetchEvidenceHealth).toHaveBeenCalledTimes(1);
  });

  it("renders health checks with their real counts", async () => {
    render(<AdminArchieEvidence />);
    await waitFor(() =>
      expect(screen.getByText("Claims without evidence")).toBeTruthy(),
    );
    // the real counts are shown next to their checks
    const checkLabels = [
      "Claims without evidence",
      "Inferences marked as facts",
      "Conflicts without explanation",
    ];
    for (const label of checkLabels) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    // "Claims without evidence" carries its measured count (3)
    const row = screen.getByText("Claims without evidence").closest("li");
    expect(row?.textContent).toContain("3");
  });

  it("renders claims with state badges and opens the provenance inspector", async () => {
    fetchClaimProvenance.mockResolvedValue({
      claim: CLAIM,
      evidence: [
        {
          record: {
            id: "ev-1",
            evidence_type: "GRAPH_RELATIONSHIP",
            source_type: "SEMANTIC_GRAPH",
            source_identity: "semantic_graph_edges",
            content_label: "sourced graph relationship",
            reliability: {
              tier: "STRUCTURED_VERIFIED",
              basis: "sourced graph row",
            },
            provenance_chain: [
              {
                stage: "SOURCE",
                detail: "semantic graph row",
                subsystem: "SEMANTIC_GRAPH",
                at: "2026-09-20T10:00:00.000Z",
              },
              {
                stage: "EXTRACTED_FACT",
                detail: "cement strength 42.5 MPa",
                subsystem: "Inference",
                at: "2026-09-20T10:00:00.000Z",
                transformation: "premise normalization",
              },
            ],
          },
          relation: "SUPPORTS",
          note: null,
        },
      ],
      premises: [],
      conflicts: [],
    });
    render(<AdminArchieEvidence />);
    await waitFor(() =>
      expect(
        screen.getByText(/Portland cement has a compressive strength/),
      ).toBeTruthy(),
    );
    fireEvent.click(screen.getByText("Inspect"));
    await waitFor(() =>
      expect(screen.getByText(/Provenance chain/)).toBeTruthy(),
    );
    // the chain steps render with their transformations
    expect(screen.getByText(/semantic graph row/)).toBeTruthy();
    expect(screen.getByText(/premise normalization/)).toBeTruthy();
    // reliability carries its documented basis
    expect(screen.getByText(/STRUCTURED_VERIFIED/)).toBeTruthy();
    expect(fetchClaimProvenance).toHaveBeenCalledWith("claim-1");
  });

  it("shows unresolved conflicts with both sides (never auto-resolved)", async () => {
    listUnresolvedConflicts.mockResolvedValue([
      {
        conflict: {
          id: "conf-1",
          kind: "VALUE_CONFLICT",
          explanation_status: "UNEXPLAINED",
          explanation: null,
          detected_at: "2026-09-20T10:00:00.000Z",
        },
        claimA: CLAIM,
        claimB: { ...CLAIM, id: "claim-2", statement: "X = 15" },
      },
    ]);
    render(<AdminArchieEvidence />);
    await waitFor(() =>
      expect(screen.getByText(/VALUE_CONFLICT/)).toBeTruthy(),
    );
    expect(screen.getByText(/never silently resolved/i)).toBeTruthy();
    // both sides render with their statements
    expect(screen.getByText(/X = 15/)).toBeTruthy();
  });

  it("shows honest empty states when no claims exist", async () => {
    listEvidenceClaims.mockResolvedValue({ rows: [], total: 0 });
    render(<AdminArchieEvidence />);
    await waitFor(() =>
      expect(screen.getByText(/No claims recorded yet/)).toBeTruthy(),
    );
  });

  it("filters claims by verification state via the real API", async () => {
    render(<AdminArchieEvidence />);
    await waitFor(() => expect(listEvidenceClaims).toHaveBeenCalled());
    const select = screen.getByDisplayValue("All verification states");
    fireEvent.change(select, { target: { value: "VERIFIED" } });
    await waitFor(() =>
      expect(listEvidenceClaims).toHaveBeenCalledWith({
        state: "VERIFIED",
        page: 1,
        pageSize: 25,
      }),
    );
  });

  it("surfaces loading errors honestly (never fabricated data)", async () => {
    fetchEvidenceHealth.mockRejectedValue(new Error("rpc unavailable"));
    listEvidenceClaims.mockRejectedValue(new Error("permission denied"));
    listUnresolvedConflicts.mockRejectedValue(new Error("permission denied"));
    render(<AdminArchieEvidence />);
    await waitFor(() =>
      expect(screen.getByText(/rpc unavailable/)).toBeTruthy(),
    );
    // no fabricated stats tiles appear
    expect(screen.queryByText("Total claims")).toBeNull();
  });
});
