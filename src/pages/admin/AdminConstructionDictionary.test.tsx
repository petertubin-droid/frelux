import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminConstructionDictionary from "@/pages/admin/AdminConstructionDictionary";
import * as dictionaryClient from "@/lib/construction-dictionary/dictionary-client";
import type { ConstructionTerm } from "@/lib/construction-dictionary/types";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (s: string) => s }),
}));

vi.mock("@/lib/construction-dictionary/dictionary-client", () => ({
  listDictionaryTerms: vi.fn(),
  countDictionaryTerms: vi.fn(),
  getDictionaryStats: vi.fn(),
  verifyDictionaryTerm: vi.fn(),
  getTermHistory: vi.fn(),
}));

const mockTerm: ConstructionTerm = {
  id: "term-1",
  canonical_term: "Damp Proof Course",
  category: "foundation",
  definition: "Barrier to prevent moisture rising",
  technical_definition: "Horizontal barrier in masonry",
  simple_definition: "DPC to stop water",
  language: "yo",
  translation: "Idaabobo omi",
  alternative_terms: ["DPC"],
  local_terms: ["Rubaroid"],
  synonyms: [],
  abbreviations: ["DPC"],
  unit: "m",
  measurement_type: "length",
  construction_context: "Ground floor masonry base",
  example_usage: "Lay DPC on top of foundation blocks",
  related_terms: ["damp proof membrane"],
  common_mistakes: ["Omitting overlap at joints"],
  translation_notes: null,
  country: "NG",
  region: "South-West",
  source: "Nigerian National Building Code",
  source_url: null,
  source_date: "2026-01-01",
  confidence_score: 0.95,
  verified: false,
  verified_by: null,
  translation_status: "needs_review",
  keep_in_english: false,
  explanation_required: false,
  nigerian_terminology: {
    formal_term: "Damp Proof Course",
    nigerian_common_term: "DPC nylon / felt",
    technical_equivalent: "Horizontal moisture barrier",
  },
  source_details: null,
  version: 2,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-15T00:00:00Z",
};

const mockStats = {
  total_terms: 140,
  verified_terms: 90,
  unverified_terms: 50,
  needs_review_terms: 30,
  languages: 4,
  categories: 12,
  avg_confidence: "0.92",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(dictionaryClient.listDictionaryTerms).mockResolvedValue([mockTerm]);
  vi.mocked(dictionaryClient.countDictionaryTerms).mockResolvedValue(1);
  vi.mocked(dictionaryClient.getDictionaryStats).mockResolvedValue(mockStats);
  vi.mocked(dictionaryClient.verifyDictionaryTerm).mockResolvedValue(mockTerm);
  vi.mocked(dictionaryClient.getTermHistory).mockResolvedValue([
    {
      id: "v-1",
      term_id: "term-1",
      version: 1,
      canonical_term: "Damp Proof Course",
      translation: "Idaabobo omi",
      confidence_score: 0.85,
      changed_fields: ["translation"],
      change_note: "Initial machine translation",
      changed_by: "system",
      created_at: "2026-10-01T00:00:00Z",
    } as any,
  ]);
});

describe("AdminConstructionDictionary", () => {
  it("renders header, stats tiles, and lists terminology", async () => {
    render(
      <MemoryRouter>
        <AdminConstructionDictionary />
      </MemoryRouter>,
    );

    expect(screen.getByText("Construction Dictionary")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Damp Proof Course")).toBeInTheDocument();
      expect(screen.getByText("Idaabobo omi")).toBeInTheDocument();
      expect(screen.getByText("Total terms")).toBeInTheDocument();
      expect(screen.getByText("140")).toBeInTheDocument();
      expect(screen.getByText("0.92")).toBeInTheDocument();
    });
  });

  it("approves terminology with correct payload and refreshes list", async () => {
    render(
      <MemoryRouter>
        <AdminConstructionDictionary />
      </MemoryRouter>,
    );

    await screen.findByText("Damp Proof Course");
    const approveBtn = screen.getByTitle("Approve and verify this terminology");
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(dictionaryClient.verifyDictionaryTerm).toHaveBeenCalledWith({
        term_id: "term-1",
        action: "approve",
        verified_by: "admin",
        note: "Approved from the Dictionary Dashboard.",
      });
      // reload was called
      expect(dictionaryClient.listDictionaryTerms).toHaveBeenCalledTimes(2);
    });
  });

  it("rejects terminology and flags for review", async () => {
    render(
      <MemoryRouter>
        <AdminConstructionDictionary />
      </MemoryRouter>,
    );

    await screen.findByText("Damp Proof Course");
    const rejectBtn = screen.getByTitle("Reject and flag for review");
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(dictionaryClient.verifyDictionaryTerm).toHaveBeenCalledWith({
        term_id: "term-1",
        action: "reject",
        verified_by: "admin",
        note: "Rejected from the Dictionary Dashboard.",
      });
    });
  });

  it("opens version history panel when history button clicked", async () => {
    render(
      <MemoryRouter>
        <AdminConstructionDictionary />
      </MemoryRouter>,
    );

    await screen.findByText("Damp Proof Course");
    const historyBtn = screen.getByTitle("Version history");
    fireEvent.click(historyBtn);

    await waitFor(() => {
      expect(dictionaryClient.getTermHistory).toHaveBeenCalledWith("term-1");
      expect(screen.getByText(/Initial machine translation/i)).toBeInTheDocument();
    });
  });

  it("surfaces load failure when query fails", async () => {
    vi.mocked(dictionaryClient.listDictionaryTerms).mockRejectedValueOnce(
      new Error("Failed to reach dictionary database"),
    );

    render(
      <MemoryRouter>
        <AdminConstructionDictionary />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to reach dictionary database")).toBeInTheDocument();
    });
  });
});
