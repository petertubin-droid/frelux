import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminLearningReview from "@/pages/admin/AdminLearningReview";

const mockUseAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockFetchLearningRecords = vi.fn();
const mockFetchRecordAudit = vi.fn();
const mockReviewRecord = vi.fn();
const mockAdvanceRecord = vi.fn();
const mockRollbackKnowledgeForRecord = vi.fn();
const mockSubmitAiReference = vi.fn();
const mockRecordActualOutcome = vi.fn();

vi.mock("@/lib/learning/learning-client", () => ({
  fetchLearningRecords: (...args: any[]) => mockFetchLearningRecords(...args),
  fetchRecordAudit: (...args: any[]) => mockFetchRecordAudit(...args),
  reviewRecord: (...args: any[]) => mockReviewRecord(...args),
  advanceRecord: (...args: any[]) => mockAdvanceRecord(...args),
  rollbackKnowledgeForRecord: (...args: any[]) => mockRollbackKnowledgeForRecord(...args),
  submitAiReference: (...args: any[]) => mockSubmitAiReference(...args),
  recordActualOutcome: (...args: any[]) => mockRecordActualOutcome(...args),
  capabilityIsMath: (cap: string) => cap === "concrete_volume" || cap === "block_count",
}));

const mockRecords = [
  {
    id: "rec-1",
    source: "ARCHIE",
    source_type: "CHATGPT_REFERENCE",
    provider: "OPENAI",
    model_version: "gpt-5-preview",
    topic: "Optimized Paint Drying Wait Times",
    capability: "ux_recommendations",
    request_context: "User asked for recoat timeline in humid coastal zones",
    recommendation: "Allow 4-6 hours between coats when relative humidity exceeds 75%.",
    conclusion: "Standard 2 hour recommendation causes bubbling in coastal climates.",
    evidence: ["Manufacturer specs for Berger Luxol", "Site humidity test in Lekki"],
    cited_sources: ["Berger Technical Data Sheet 2026"],
    assumptions: ["Standard emulsion coat thickness 35 microns"],
    proposed_scope: "REGIONAL",
    scope_key: "NG-LA",
    confidence: 0.9,
    verification_status: "VERIFIED",
    evaluation_status: "PASSED",
    lifecycle_status: "READY_FOR_REVIEW",
    created_by: "admin-1",
    created_date: "2026-11-20T08:00:00Z",
    provenance: {},
  },
];

describe("AdminLearningReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: { id: "admin-1", email: "admin@frelux.test" },
      loading: false,
    });

    mockFetchLearningRecords.mockResolvedValue(mockRecords);
    mockFetchRecordAudit.mockResolvedValue([
      {
        action: "STATUS_CHANGE",
        created_date: "2026-11-20T08:30:00Z",
        details: { reason: "Initial automated verification passed" },
      },
    ]);
    mockSubmitAiReference.mockResolvedValue({
      ok: true,
      message: "AI reference ingested as ARCHIE_RECEIVED",
    });
    mockAdvanceRecord.mockResolvedValue({
      ok: true,
      message: "Record advanced to CANDIDATE",
    });
    mockReviewRecord.mockResolvedValue({
      ok: true,
      message: "Record approved successfully",
    });
    mockRecordActualOutcome.mockResolvedValue({
      ok: true,
      delta: 0.05,
    });
  });

  it("renders header, ingestion forms, and learning records list", async () => {
    render(
      <MemoryRouter>
        <AdminLearningReview />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Learning Review" })).toBeInTheDocument();
      expect(screen.getByText(/Optimized Paint Drying Wait Times/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Ingest AI reference material/i)).toBeInTheDocument();
    expect(screen.getByText(/Record an actual project outcome/i)).toBeInTheDocument();
    expect(screen.getAllByText("READY_FOR_REVIEW").length).toBeGreaterThanOrEqual(1);
  });

  it("filters learning records by status", async () => {
    render(
      <MemoryRouter>
        <AdminLearningReview />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Filter learning records by status")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Filter learning records by status"), {
      target: { value: "READY_FOR_REVIEW" },
    });

    await waitFor(() => {
      expect(mockFetchLearningRecords).toHaveBeenCalledWith("READY_FOR_REVIEW");
    });
  });

  it("expands a record and displays audit trail and recommendation", async () => {
    render(
      <MemoryRouter>
        <AdminLearningReview />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Optimized Paint Drying Wait Times/i)).toBeInTheDocument();
    });

    // Click to expand record
    fireEvent.click(screen.getByText(/Optimized Paint Drying Wait Times/i));

    await waitFor(() => {
      expect(mockFetchRecordAudit).toHaveBeenCalledWith("rec-1");
      expect(
        screen.getByText(/Allow 4-6 hours between coats when relative humidity exceeds 75%/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Berger Technical Data Sheet 2026/i)).toBeInTheDocument();
      expect(screen.getByText(/Initial automated verification passed/i)).toBeInTheDocument();
    });
  });

  it("advances record lifecycle status with justification reason", async () => {
    render(
      <MemoryRouter>
        <AdminLearningReview />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Optimized Paint Drying Wait Times/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Optimized Paint Drying Wait Times/i));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Advance → Candidate" })).toBeInTheDocument();
    });

    const reasonInput = screen.getByLabelText("Reason / change justification (required for approval)");
    fireEvent.change(reasonInput, { target: { value: "Verified against manufacturer spec" } });

    fireEvent.click(screen.getByRole("button", { name: "Advance → Candidate" }));

    await waitFor(() => {
      expect(mockAdvanceRecord).toHaveBeenCalledWith(
        "rec-1",
        "CANDIDATE",
        "Verified against manufacturer spec",
      );
      expect(screen.getByText("Record advanced to CANDIDATE")).toBeInTheDocument();
    });
  });

  it("validates and submits new AI reference material", async () => {
    render(
      <MemoryRouter>
        <AdminLearningReview />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Submit for review" })).toBeInTheDocument();
    });

    // Attempt submit with empty fields
    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
    expect(screen.getByText("Topic and recommendation are required.")).toBeInTheDocument();
    expect(mockSubmitAiReference).not.toHaveBeenCalled();

    // Fill fields
    fireEvent.change(screen.getByLabelText("Topic"), {
      target: { value: "High-yield rebar cutting schedule" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Recommendation (conclusions only, no chain-of-thought)"),
      {
        target: { value: "Adopt 12m standard cutting lengths to minimize off-cut wastage below 4%." },
      },
    );

    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));

    await waitFor(() => {
      expect(mockSubmitAiReference).toHaveBeenCalledWith(
        expect.objectContaining({
          source: "ARCHIE",
          topic: "High-yield rebar cutting schedule",
          recommendation: "Adopt 12m standard cutting lengths to minimize off-cut wastage below 4%.",
        }),
      );
      expect(
        screen.getByText("AI reference ingested as ARCHIE_RECEIVED"),
      ).toBeInTheDocument();
    });
  });

  it("records an actual project outcome to calibrate predictions", async () => {
    render(
      <MemoryRouter>
        <AdminLearningReview />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Record outcome" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Subject (e.g. Stage 3 blocks)"), {
      target: { value: "Site A foundation concrete" },
    });
    fireEvent.change(screen.getByLabelText("Estimated value"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText("Actual value"), {
      target: { value: "105" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Record outcome" }));

    await waitFor(() => {
      expect(mockRecordActualOutcome).toHaveBeenCalledWith({
        capability: "build_to_roof",
        subject: "Site A foundation concrete",
        estimatedValue: "100",
        actualValue: "105",
      });
      expect(screen.getByText(/Outcome recorded \(delta 5.0%\)/i)).toBeInTheDocument();
    });
  });
});
