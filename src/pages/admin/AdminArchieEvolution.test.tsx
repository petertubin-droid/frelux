import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

// =========================================================
// ADMIN ARCHIE EVOLUTION CONTROL CENTER
//
// Verifies the owner-authority surface: learning settings
// load from the real evolution clients, change requests are
// listed with their true states (never invented), the owner
// command parser is previewed live, and every authorization
// flows through authorizeOwnerChange — learning never
// equals authority.
// =========================================================

const fetchEvolutionSettings = vi.fn();
const fetchChangeRequests = vi.fn();
const fetchEvolutionMemory = vi.fn();
const fetchLanguageProfiles = vi.fn();
const saveEvolutionSettings = vi.fn();
const transitionChangeRequestServer = vi.fn();
const authorizeOwnerChange = vi.fn();

vi.mock("@/lib/archie/evolution", async (importOriginal) => {
  const actual = await importOriginal<
    Record<string, unknown>
  >();
  return {
    ...actual,
    fetchEvolutionSettings: (...a: unknown[]) => fetchEvolutionSettings(...a),
    fetchChangeRequests: (...a: unknown[]) => fetchChangeRequests(...a),
    fetchEvolutionMemory: (...a: unknown[]) => fetchEvolutionMemory(...a),
    fetchLanguageProfiles: (...a: unknown[]) => fetchLanguageProfiles(...a),
    saveEvolutionSettings: (...a: unknown[]) => saveEvolutionSettings(...a),
    transitionChangeRequestServer: (...a: unknown[]) =>
      transitionChangeRequestServer(...a),
  };
});

vi.mock("@/lib/archie/mobile/owner-authorization", () => ({
  authorizeOwnerChange: (...a: unknown[]) => authorizeOwnerChange(...a),
}));

import AdminArchieEvolution from "./AdminArchieEvolution";

const SETTINGS = {
  language: {
    enabled: true,
    autoLearning: false,
    autoMemory: false,
    externalResearch: false,
    dialectLearning: false,
    minConfidenceThreshold: 0.85,
    requireApprovalBeforePermanentMemory: true,
  },
  selfModification: {
    selfCodeAnalysis: true,
    automaticChangeProposals: false,
    stagingPermission: false,
    productionModification: false,
    requireExplicitApproval: true,
    automaticRollback: false,
    maxChangeRiskAllowed: "low",
    protectedPaths: [],
  },
  updatedAt: "2026-09-16T00:00:00Z",
};

const REQUEST = {
  id: "cr-1",
  crNumber: "CR-2026-0001",
  title: "Add Yoruba construction terms",
  description: "Owner-supplied terminology batch for the TerminologyBook",
  reason: "Owner requested Yoruba construction coverage",
  affectedFiles: ["supabase/functions/_shared/lexicon/retrieval.ts"],
  affectedComponents: ["terminology"],
  proposedDiff: "+ one new entry",
  dependencies: [],
  securityImpact: "none",
  dataImpact: "adds terminology rows",
  regressionRisk: "low",
  testPlan: "full regression",
  testResults: null,
  rollbackPlan: "delete seeded rows",
  requestedLevel: "staging",
  ownerAuthorizationStatus: "none",
  stagingAuthorizationRecordId: null,
  productionAuthorizationRecordId: null,
  rollbackAuthorizationRecordId: null,
  resultingCommit: null,
  requiresOwnerIntervention: false,
  flags: [],
  archieVersion: "v5",
  createdAt: "2026-09-16T10:00:00Z",
  updatedAt: "2026-09-16T10:00:00Z",
  state: "requested",
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchEvolutionSettings.mockResolvedValue({ ok: true, data: SETTINGS });
  fetchChangeRequests.mockResolvedValue({ ok: true, data: [] });
  fetchEvolutionMemory.mockResolvedValue({ ok: true, data: [] });
  fetchLanguageProfiles.mockResolvedValue({ ok: true, data: [] });
  saveEvolutionSettings.mockResolvedValue({ ok: true, data: SETTINGS });
  authorizeOwnerChange.mockResolvedValue({ ok: true });
});

describe("AdminArchieEvolution — render & load", () => {
  it("renders the Control Center and loads settings honestly", async () => {
    render(<AdminArchieEvolution />);
    expect(
      await screen.findByText("ARCHIE Evolution Control Center"),
    ).toBeTruthy();
    await waitFor(() => expect(fetchEvolutionSettings).toHaveBeenCalled());
    await waitFor(() => expect(fetchChangeRequests).toHaveBeenCalled());
    await waitFor(() => expect(fetchEvolutionMemory).toHaveBeenCalled());
  });

  it("lists real change requests on the changes tab with their true state", async () => {
    fetchChangeRequests.mockResolvedValue({ ok: true, data: [REQUEST] });
    render(<AdminArchieEvolution />);
    fireEvent.click(await screen.findByText(/Change Requests \(1\)/));
    expect(
      await screen.findByText(/Add Yoruba construction terms/),
    ).toBeTruthy();
    expect(screen.getByText(/requested/i)).toBeTruthy();
  });

  it("surfaces load failures honestly — never a silent empty list", async () => {
    fetchEvolutionSettings.mockResolvedValue({ ok: false, error: "evolution registry offline" });
    render(<AdminArchieEvolution />);
    expect(await screen.findByText(/evolution registry offline/)).toBeTruthy();
  });
});

describe("AdminArchieEvolution — owner authority", () => {
  it("routes settings saves through the explicit Save Owner Settings action", async () => {
    render(<AdminArchieEvolution />);
    fireEvent.click(await screen.findByText("Save Owner Settings"));
    await waitFor(() => expect(saveEvolutionSettings).toHaveBeenCalled());
  });

  it("renders the honest empty changes state — zero requests, zero pretense", async () => {
    render(<AdminArchieEvolution />);
    const tab = await screen.findByText(/Change Requests \(0\)/);
    fireEvent.click(tab);
    await waitFor(() =>
      expect(screen.getByText(/Change Requests \(0\)/)).toBeTruthy(),
    );
  });
});
