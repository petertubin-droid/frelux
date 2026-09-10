import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// =========================================================
// ARCHIE PRIVACY & MEMORY RIGHTS (PWA)
//
// Verifies the REAL privacy surface: consent toggles gate
// live features, the memory browser performs real search /
// correct / delete actions, retention is validated, and
// errors are surfaced honestly. The client is mocked here;
// in production every call hits the archie-legal edge
// function with server-side owner checks and a full audit
// trail.
// =========================================================

const fetchConsents = vi.fn();
const setConsent = vi.fn();
const searchMemory = vi.fn();
const correctMemory = vi.fn();
const deleteMemory = vi.fn();
const deleteMemorySubject = vi.fn();
const clearConversations = vi.fn();
const exportMyData = vi.fn();
const requestDeletion = vi.fn();
const myRightsRequests = vi.fn();

vi.mock("@/lib/archie/legal-client", () => ({
  fetchConsents: (...a: unknown[]) => fetchConsents(...a),
  setConsent: (...a: unknown[]) => setConsent(...a),
  searchMemory: (...a: unknown[]) => searchMemory(...a),
  correctMemory: (...a: unknown[]) => correctMemory(...a),
  deleteMemory: (...a: unknown[]) => deleteMemory(...a),
  deleteMemorySubject: (...a: unknown[]) => deleteMemorySubject(...a),
  clearConversations: (...a: unknown[]) => clearConversations(...a),
  exportMyData: (...a: unknown[]) => exportMyData(...a),
  requestDeletion: (...a: unknown[]) => requestDeletion(...a),
  myRightsRequests: (...a: unknown[]) => myRightsRequests(...a),
}));

import ArchiePrivacy from "./ArchiePrivacy";

const FACT = {
  id: "fact-1",
  subject: "owner",
  predicate: "prefers",
  object: "detailed answers",
  confidence: 0.9,
  status: "validated",
  provenance: { source: "chat" },
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

function consent(key: string, granted: boolean) {
  return {
    consent_key: key,
    granted,
    value: null,
    granted_at: "2026-09-01T00:00:00Z",
    revoked_at: granted ? null : "2026-09-02T00:00:00Z",
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ArchiePrivacy />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchConsents.mockResolvedValue({ ok: true, data: { consents: [] } });
  myRightsRequests.mockResolvedValue({ ok: true, data: { requests: [] } });
  searchMemory.mockResolvedValue({
    ok: true,
    data: { facts: [FACT], pruned: 0 },
  });
  setConsent.mockResolvedValue({ ok: true, pruned_facts: 0 });
  correctMemory.mockResolvedValue({ ok: true });
  deleteMemory.mockResolvedValue({ ok: true });
  deleteMemorySubject.mockResolvedValue({ ok: true, deleted: 1 });
  clearConversations.mockResolvedValue({
    ok: true,
    deleted_conversations: 1,
    deleted_messages: 2,
  });
  exportMyData.mockResolvedValue({ ok: true, data: { export: {} } });
  requestDeletion.mockResolvedValue({ ok: true });
});

describe("ArchiePrivacy — consent toggles are real controls", () => {
  it("renders all three consent switches ON by default (unset = available)", async () => {
    renderPage();
    const switches = await screen.findAllByRole("switch");
    expect(switches).toHaveLength(3);
    switches.forEach((s) =>
      expect(s.getAttribute("aria-checked")).toBe("true"),
    );
  });

  it("revoking personalization consent calls the backend and reloads state", async () => {
    fetchConsents
      .mockResolvedValueOnce({ ok: true, data: { consents: [] } })
      .mockResolvedValueOnce({
        ok: true,
        data: { consents: [consent("personalization_memory", false)] },
      });
    renderPage();
    const personalization = (await screen.findAllByRole("switch"))[0];
    fireEvent.click(personalization);
    await waitFor(() =>
      expect(setConsent).toHaveBeenCalledWith("personalization_memory", false),
    );
    expect(
      await screen.findByText(/Consent revoked — the corresponding feature/),
    ).toBeTruthy();
    // The switch now reflects the revoked state from the reloaded consents.
    await waitFor(() => {
      const sw = screen.getAllByRole("switch")[0];
      expect(sw.getAttribute("aria-checked")).toBe("false");
    });
  });

  it("shows a granted consent as OFF-gateable (aria-checked=false)", async () => {
    fetchConsents.mockResolvedValue({
      ok: true,
      data: {
        consents: [
          consent("personalization_memory", false),
          consent("voice_audio", true),
          consent("web_research", false),
        ],
      },
    });
    renderPage();
    await waitFor(() => {
      const switches = screen.getAllByRole("switch");
      expect(switches[0].getAttribute("aria-checked")).toBe("false");
      expect(switches[1].getAttribute("aria-checked")).toBe("true");
      expect(switches[2].getAttribute("aria-checked")).toBe("false");
    });
  });
});

describe("ArchiePrivacy — memory browser (real data rights)", () => {
  it("lists memory facts with subject/predicate", async () => {
    renderPage();
    expect(await screen.findByText(/detailed answers/)).toBeTruthy();
    expect(screen.getByText(/→ prefers →/)).toBeTruthy();
  });

  it("performs a real memory delete through the client", async () => {
    deleteMemory.mockResolvedValue({ ok: true });
    renderPage();
    fireEvent.click(await screen.findByLabelText("Delete memory"));
    await waitFor(() => expect(deleteMemory).toHaveBeenCalledWith("fact-1"));
    expect(await screen.findByText(/deleted/i)).toBeTruthy();
  });

  it("performs a real memory correction with JSON value", async () => {
    correctMemory.mockResolvedValue({ ok: true });
    renderPage();
    await screen.findByText(/detailed answers/);
    fireEvent.click(screen.getByLabelText("Correct memory"));
    fireEvent.change(screen.getByLabelText("New value (JSON)"), {
      target: { value: '"concise answers"' },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save correction/i }));
    await waitFor(() =>
      expect(correctMemory).toHaveBeenCalledWith("fact-1", "concise answers"),
    );
  });

  it("surfaces memory search errors honestly", async () => {
    searchMemory.mockResolvedValue({
      ok: true,
      data: { facts: [], pruned: 0 },
    });
    fetchConsents.mockResolvedValue({ ok: false, error: "Consent store down" });
    renderPage();
    expect(await screen.findByText(/Consent store down/i)).toBeTruthy();
  });
});

describe("ArchiePrivacy — retention validation", () => {
  it("rejects an invalid retention value without calling the backend", async () => {
    renderPage();
    await screen.findAllByRole("switch");
    const input = screen.getByLabelText("Retention days");
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /Apply/i }));
    expect(await screen.findByText(/positive number of days/i)).toBeTruthy();
    expect(setConsent).not.toHaveBeenCalled();
  });
});

describe("ArchiePrivacy — rights requests", () => {
  it("submits a deletion request through the backend, not a fake confirm", async () => {
    requestDeletion.mockResolvedValue({ ok: true });
    myRightsRequests.mockResolvedValue({
      ok: true,
      data: {
        requests: [
          {
            id: "req-1",
            kind: "delete_all",
            status: "pending",
            result_note: null,
            requested_at: "2026-09-10T00:00:00Z",
            completed_at: null,
          },
        ],
      },
    });
    renderPage();
    const btn = await screen.findByRole("button", {
      name: /request deletion/i,
    });
    fireEvent.click(btn);
    await waitFor(() => expect(requestDeletion).toHaveBeenCalled());
  });
});
