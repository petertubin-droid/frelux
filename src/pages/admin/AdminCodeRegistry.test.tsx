import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const storeMock = vi.hoisted(() => ({
  fetchStatusOverlay: vi.fn(),
  fetchStatusHistory: vi.fn(),
  saveStatusChange: vi.fn(),
}));

vi.mock("@/lib/codes/status-store", () => storeMock);

import AdminCodeRegistry from "./AdminCodeRegistry";

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminCodeRegistry />
    </MemoryRouter>,
  );
}

describe("AdminCodeRegistry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMock.fetchStatusOverlay.mockResolvedValue({
      overlay: {},
      rows: [],
      error: null,
    });
    storeMock.fetchStatusHistory.mockResolvedValue({ rows: [], error: null });
    storeMock.saveStatusChange.mockResolvedValue({ ok: true, error: null });
  });

  it("lists the Eurocode references with their library status", async () => {
    renderPage();
    expect(
      await screen.findByText("EN 1992-1-1", {}, { timeout: 2000 }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Concrete design").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Administrative overlay on library v/i),
    ).toBeInTheDocument();
  });

  it("saves a status change with the reviewer and note", async () => {
    renderPage();
    await screen.findByText("EN 1992-1-1", {}, { timeout: 2000 });

    fireEvent.change(screen.getByLabelText(/administrative status/i), {
      target: { value: "under-review" },
    });
    fireEvent.change(screen.getByLabelText(/reviewer/i), {
      target: { value: "Eng. Test, COREN" },
    });
    fireEvent.change(screen.getByLabelText(/note shown with the reference/i), {
      target: { value: "Edition being confirmed with the authority." },
    });
    fireEvent.click(screen.getByRole("button", { name: /save status/i }));

    await waitFor(() => {
      expect(storeMock.saveStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          entryKey: "eurocode:concrete:EN 1992-1-1",
          familyId: "eurocode",
          domain: "concrete",
          document: "EN 1992-1-1",
          status: "under-review",
          reviewer: "Eng. Test, COREN",
          note: "Edition being confirmed with the authority.",
        }),
      );
    });
    expect(
      await screen.findByText(/Saved with a history entry/i),
    ).toBeInTheDocument();
  });

  it("surfaces a save failure instead of pretending success", async () => {
    storeMock.saveStatusChange.mockResolvedValue({
      ok: false,
      error: "No database connection: changes cannot be saved.",
    });
    renderPage();
    await screen.findByText("EN 1992-1-1", {}, { timeout: 2000 });
    fireEvent.click(screen.getByRole("button", { name: /save status/i }));
    expect(
      await screen.findByText(/no database connection/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Saved with a history entry/i),
    ).not.toBeInTheDocument();
  });

  it("renders the recorded update history", async () => {
    storeMock.fetchStatusHistory.mockResolvedValue({
      rows: [
        {
          id: "h1",
          entry_key: "eurocode:wind:EN 1991-1-4",
          status: "verified",
          note: "Changed from library-default. Checked against the National Annex.",
          reviewer: "Eng. Reviewer",
          created_at: "2026-10-30T12:00:00.000Z",
        },
      ],
      error: null,
    });
    renderPage();
    expect(await screen.findByText(/Eng. Reviewer/)).toBeInTheDocument();
    expect(
      screen.getByText(/Checked against the National Annex/),
    ).toBeInTheDocument();
  });

  it("reports a registry load failure without inventing statuses", async () => {
    storeMock.fetchStatusOverlay.mockResolvedValue({
      overlay: {},
      rows: [],
      error: "permission denied",
    });
    renderPage();
    expect(
      await screen.findByText(/Registry status unavailable/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/No status is guessed/i)).toBeInTheDocument();
  });
});
