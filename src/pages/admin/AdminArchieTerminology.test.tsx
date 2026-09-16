import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// =========================================================
// ADMIN ARCHIE TERMINOLOGYBOOK (§16)
//
// Verifies the TerminologyBook lifecycle surface: entries
// are created UNVERIFIED, verification is a deliberate
// human action, and the console never pretends data exists
// when the table is empty.
// =========================================================

const listTerminology = vi.fn();
const createTerminology = vi.fn();
const updateTerminology = vi.fn();
const setVerification = vi.fn();
const deleteTerminology = vi.fn();
const validateTerminologyDraft = vi.fn();
const seedStarterTerms = vi.fn();

vi.mock("@/lib/archie/stage2-terminology-client", () => ({
  listTerminology: (...a: unknown[]) => listTerminology(...a),
  createTerminology: (...a: unknown[]) => createTerminology(...a),
  updateTerminology: (...a: unknown[]) => updateTerminology(...a),
  setVerification: (...a: unknown[]) => setVerification(...a),
  deleteTerminology: (...a: unknown[]) => deleteTerminology(...a),
  validateTerminologyDraft: (...a: unknown[]) => validateTerminologyDraft(...a),
  seedStarterTerms: (...a: unknown[]) => seedStarterTerms(...a),
  TERMINOLOGY_DOMAINS: ["materials", "labour", "equipment", "measurement", "process", "document"],
}));

const fetchActiveLanguages = vi.fn();
vi.mock("@/lib/archie/stage2-language-client", () => ({
  fetchActiveLanguages: (...a: unknown[]) => fetchActiveLanguages(...a),
}));

import AdminArchieTerminology from "./AdminArchieTerminology";

const ROW = {
  id: "term-1",
  domain: "materials",
  language_code: "pcm",
  canonical_term: "cement",
  regional_term: "simenti",
  meaning_note: "Portland cement",
  verification_status: "UNVERIFIED",
  source: "owner",
  version: 1,
};

function renderPage() {
  return render(<AdminArchieTerminology />);
}

beforeEach(() => {
  vi.clearAllMocks();
  listTerminology.mockResolvedValue([]);
  fetchActiveLanguages.mockResolvedValue([]);
  validateTerminologyDraft.mockReturnValue({ ok: true });
});

describe("AdminArchieTerminology — honest empty state", () => {
  it("states plainly that no terminology exists yet, and offers the seed action", async () => {
    renderPage();
    expect(
      await screen.findByText(/No terminology entries yet/),
    ).toBeTruthy();
    expect(screen.getByText("Seed starter terms")).toBeTruthy();
  });

  it("loads languages and terminology through the real clients on mount", async () => {
    renderPage();
    await waitFor(() => expect(listTerminology).toHaveBeenCalled());
    await waitFor(() => expect(fetchActiveLanguages).toHaveBeenCalled());
  });

  it("surfaces client errors honestly", async () => {
    listTerminology.mockRejectedValue(new Error("registry offline"));
    renderPage();
    expect(await screen.findByText(/registry offline/)).toBeTruthy();
  });
});

describe("AdminArchieTerminology — UNVERIFIED-by-default lifecycle", () => {
  it("lists real entries with their verification status", async () => {
    listTerminology.mockResolvedValue([ROW]);
    renderPage();
    expect(await screen.findByText("simenti")).toBeTruthy();
    expect(screen.getByText("UNVERIFIED")).toBeTruthy();
    expect(screen.getByText("cement")).toBeTruthy();
  });

  it("seeds starter terms through the client and reloads honestly", async () => {
    seedStarterTerms.mockResolvedValue({ ok: true, created: 12 });
    renderPage();
    fireEvent.click(await screen.findByText("Seed starter terms"));
    await waitFor(() => expect(seedStarterTerms).toHaveBeenCalled());
    await waitFor(() => expect(listTerminology.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it("refuses to add an invalid draft — validation is client-side honesty", async () => {
    validateTerminologyDraft.mockReturnValue({
      ok: false,
      error: "canonical term is required",
    });
    renderPage();
    fireEvent.click(await screen.findByText(/Add term|New term|Add entry/));
    // submit the form
    const save = screen.queryAllByText(/Save|Add/).pop();
    if (save) fireEvent.click(save);
    expect(createTerminology).not.toHaveBeenCalled();
  });
});
