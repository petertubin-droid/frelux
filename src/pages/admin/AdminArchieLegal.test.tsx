import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// =========================================================
// ADMIN ARCHIE LEGAL CONSOLE
//
// Verifies the draft → approve → publish lifecycle UI: every
// action maps to a real backend call on the archie-legal
// edge function (owner-checked server-side), drafts are
// validated before saving, and errors are surfaced honestly.
// =========================================================

const adminAllDocuments = vi.fn();
const adminSaveDraft = vi.fn();
const adminApprove = vi.fn();
const adminPublish = vi.fn();
const adminHistory = vi.fn();

vi.mock("@/lib/archie/legal-client", () => ({
  adminAllDocuments: (...a: unknown[]) => adminAllDocuments(...a),
  adminSaveDraft: (...a: unknown[]) => adminSaveDraft(...a),
  adminApprove: (...a: unknown[]) => adminApprove(...a),
  adminPublish: (...a: unknown[]) => adminPublish(...a),
  adminHistory: (...a: unknown[]) => adminHistory(...a),
}));

import AdminArchieLegal from "./AdminArchieLegal";

const DOC = (
  status: "draft" | "approved" | "published",
  doc_key = "terms_of_service",
) => ({
  id: `doc-${status}`,
  doc_key,
  version: 2,
  title: "Terms of Service",
  status,
  effective_date: status === "published" ? "2026-09-13" : null,
  created_at: "2026-09-13T10:00:00Z",
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminArchieLegal />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  adminAllDocuments.mockResolvedValue({ ok: true, data: { documents: [] } });
  adminSaveDraft.mockResolvedValue({ ok: true });
  adminApprove.mockResolvedValue({ ok: true });
  adminPublish.mockResolvedValue({ ok: true });
  adminHistory.mockResolvedValue({ ok: true, data: { events: [] } });
});

describe("AdminArchieLegal", () => {
  it("renders all ten corpus documents with an honest never-seeded state", async () => {
    renderPage();
    expect(
      await screen.findByText("Terms of Service", { selector: "h3" }),
    ).toBeTruthy();
    expect(screen.getByText("AI Disclosure")).toBeTruthy();
    expect(screen.getByText("Memory & Data Rights Policy")).toBeTruthy();
    // Every document shows the honest "never seeded" status when absent.
    expect(screen.getAllByText("never seeded").length).toBe(10);
  });

  it("refuses to save a draft without a body (no accidental blank publish)", async () => {
    renderPage();
    const buttons = await screen.findAllByText("New draft");
    fireEvent.click(buttons[0]);
    fireEvent.click(await screen.findByRole("button", { name: /save draft/i }));
    expect(
      (await screen.findAllByText(/Title and body are both required/)).length,
    ).toBeGreaterThan(0);
    expect(adminSaveDraft).not.toHaveBeenCalled();
  });

  it("saves a draft through the backend and reloads the corpus", async () => {
    renderPage();
    fireEvent.click((await screen.findAllByText("New draft"))[0]);
    fireEvent.change(await screen.findByLabelText(/body/i), {
      target: { value: "New terms body." },
    });
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() =>
      expect(adminSaveDraft).toHaveBeenCalledWith(
        "terms_of_service",
        "Terms of Service",
        "New terms body.",
      ),
    );
    expect(
      await screen.findByText(/Draft saved\. It must be approved/),
    ).toBeTruthy();
  });

  it("offers Approve for a draft and Publish for an approved revision", async () => {
    adminAllDocuments.mockResolvedValue({
      ok: true,
      data: {
        documents: [
          DOC("draft"),
          DOC("approved", "privacy_policy"),
          DOC("published", "ai_disclosure"),
        ],
      },
    });
    renderPage();
    expect(
      await screen.findByRole("button", { name: /Approve v2/ }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Publish v2/ })).toBeTruthy();
    expect(screen.getByText("published · v2")).toBeTruthy();
  });

  it("approving calls the backend and reports the next gate honestly", async () => {
    adminAllDocuments.mockResolvedValue({
      ok: true,
      data: { documents: [DOC("draft")] },
    });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Approve v2/ }));
    await waitFor(() => expect(adminApprove).toHaveBeenCalledWith("doc-draft"));
    expect(
      await screen.findByText(/Approved — publish to go live/),
    ).toBeTruthy();
  });

  it("publishing requires an explicit window.confirm (Owner gate)", async () => {
    const confirm = vi.fn().mockReturnValue(true);
    const original = window.confirm;
    window.confirm = confirm as unknown as typeof window.confirm;
    adminAllDocuments.mockResolvedValue({
      ok: true,
      data: { documents: [DOC("approved")] },
    });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Publish v2/ }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    await waitFor(() =>
      expect(adminPublish).toHaveBeenCalledWith("doc-approved"),
    );
    window.confirm = original;
  });

  it("cancelling the confirm never publishes", async () => {
    const confirm = vi.fn().mockReturnValue(false);
    const original = window.confirm;
    window.confirm = confirm as unknown as typeof window.confirm;
    adminAllDocuments.mockResolvedValue({
      ok: true,
      data: { documents: [DOC("approved")] },
    });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Publish v2/ }));
    expect(adminPublish).not.toHaveBeenCalled();
    window.confirm = original;
  });

  it("surfaces load errors honestly instead of an empty fake console", async () => {
    adminAllDocuments.mockResolvedValue({
      ok: false,
      error: "Legal function unreachable",
    });
    renderPage();
    expect(
      (await screen.findAllByText(/Legal function unreachable/)).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("never seeded")).toBeNull();
  });

  it("opens the revision history modal from the backend audit trail", async () => {
    adminHistory.mockResolvedValue({
      ok: true,
      data: {
        versions: [DOC("published", "terms_of_service")],
        events: [
          {
            id: "e1",
            event: "published",
            version: 1,
            actor: "owner",
            created_at: "2026-09-13T10:00:00Z",
          },
        ],
      },
    });
    renderPage();
    fireEvent.click((await screen.findAllByText("History"))[0]);
    await waitFor(() => expect(adminHistory).toHaveBeenCalled());
    // "published" appears in the version chip and the audit event line.
    expect(
      (await screen.findAllByText(/published/i)).length,
    ).toBeGreaterThanOrEqual(2);
  });
});
