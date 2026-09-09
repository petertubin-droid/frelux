import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/archie/stage1-client", () => ({
  recordAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

const listPeople = vi.fn();
const invitePerson = vi.fn();
const approvePerson = vi.fn();
const updatePerson = vi.fn();
const removePerson = vi.fn();

vi.mock("@/lib/archie/stage2-people-client", () => ({
  listPeople: (...a: unknown[]) => listPeople(...a),
  invitePerson: (...a: unknown[]) => invitePerson(...a),
  approvePerson: (...a: unknown[]) => approvePerson(...a),
  updatePerson: (...a: unknown[]) => updatePerson(...a),
  removePerson: (...a: unknown[]) => removePerson(...a),
  PEOPLE_PERMISSIONS: [
    "ARCHIE_CHAT",
    "VOICE",
    "CAMERA",
    "SHARED_KNOWLEDGE",
    "OWNER_DASHBOARD",
  ],
  PEOPLE_RELATIONS: ["FAMILY", "CONTRACTOR", "ENGINEER", "OTHER"],
  ACCESS_OPTIONS: [
    { label: "1 hour", hours: 1 },
    { label: "1 day", hours: 24 },
    { label: "7 days", hours: 168 },
    { label: "30 days", hours: 720 },
    { label: "Permanent", hours: 0 },
  ],
}));

import ArchiePeople from "./ArchiePeople";

function renderPage() {
  return render(
    <MemoryRouter>
      <ArchiePeople />
    </MemoryRouter>,
  );
}

describe("ArchiePeople (Stage 2 §§25-27)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPeople.mockResolvedValue({ ok: true, people: [], shares: [] });
  });

  it("renders the empty network state honestly", async () => {
    renderPage();
    expect(await screen.findByText(/No one yet/i)).toBeTruthy();
  });

  it("creates an invitation and shows the code exactly once (§25)", async () => {
    invitePerson.mockResolvedValue({
      ok: true,
      code: "ABCD234EFG",
      peopleId: "p1",
      expiresAt: new Date().toISOString(),
      note: "",
    });
    renderPage();
    const nameInput = screen.getByPlaceholderText("Their name");
    fireEvent.change(nameInput, { target: { value: "Ada" } });
    fireEvent.click(screen.getByText(/Generate invitation/i));
    expect(await screen.findByTestId("invite-code")).toBeTruthy();
    expect(screen.getByText("ABCD234EFG")).toBeTruthy();
    expect(invitePerson).toHaveBeenCalledWith("Ada", "FAMILY");
    expect(screen.getByText(/shown once/i)).toBeTruthy();
  });

  it("review flow starts from ZERO permissions — nothing auto-granted (§26)", async () => {
    listPeople.mockResolvedValue({
      ok: true,
      people: [
        {
          id: "p1",
          display_name: "Ada",
          relation: "FAMILY",
          status: "PENDING_REQUEST",
          permissions: [],
          access_expires_at: null,
          invited_at: new Date().toISOString(),
          activated_at: null,
          user_id: null,
        },
      ],
      shares: [],
    });
    approvePerson.mockResolvedValue({ ok: true });
    renderPage();
    fireEvent.click(await screen.findByText(/Review request/i));
    const panel = await screen.findByTestId("approval-panel");
    expect(panel.textContent).toMatch(/nothing is granted/i);
    // Every permission chip starts UNSELECTED — nothing is auto-granted.
    const permLabels = [
      "ARCHIE CHAT",
      "VOICE",
      "CAMERA",
      "SHARED KNOWLEDGE",
      "OWNER DASHBOARD",
    ];
    const buttons = Array.from(panel.querySelectorAll("button"));
    for (const label of permLabels) {
      const chip = buttons.find((b) => b.textContent === label);
      expect(chip, label).toBeTruthy();
      expect(chip!.className).not.toMatch(/bg-primary/);
    }
    fireEvent.click(screen.getByText(/Approve & activate/i));
    await waitFor(() => expect(approvePerson).toHaveBeenCalled());
    expect(approvePerson.mock.calls[0][1]).toEqual([]); // zero default permissions
  });

  it("surfaces server rejection errors", async () => {
    invitePerson.mockResolvedValue({
      ok: false,
      error: "Only the Owner may perform this action.",
    });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText("Their name"), {
      target: { value: "Ada" },
    });
    fireEvent.click(screen.getByText(/Generate invitation/i));
    expect(await screen.findByText(/Only the Owner may perform/i)).toBeTruthy();
  });
});
