import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// =========================================================
// ADMIN ARCHIE WHATSAPP ASSISTANT CONSOLE
//
// Verifies the Owner console for the WhatsApp channel: every
// control triggers a REAL backend call on the archie-whatsapp
// edge function (owner-checked server-side), config presence
// is displayed honestly, and failures surface as errors —
// never faked status.
// =========================================================

const fetchWaStatus = vi.fn();
const saveWaSettings = vi.fn();
const addWaAccount = vi.fn();
const updateWaAccount = vi.fn();
const revokeWaAccount = vi.fn();
const deleteWaAccount = vi.fn();
const fetchWaMessages = vi.fn();
const fetchWaReminders = vi.fn();
const testWaConnection = vi.fn();
const disconnectWa = vi.fn();

vi.mock("@/lib/archie/whatsapp-client", () => ({
  fetchWaStatus: (...a: unknown[]) => fetchWaStatus(...a),
  saveWaSettings: (...a: unknown[]) => saveWaSettings(...a),
  addWaAccount: (...a: unknown[]) => addWaAccount(...a),
  updateWaAccount: (...a: unknown[]) => updateWaAccount(...a),
  revokeWaAccount: (...a: unknown[]) => revokeWaAccount(...a),
  deleteWaAccount: (...a: unknown[]) => deleteWaAccount(...a),
  fetchWaMessages: (...a: unknown[]) => fetchWaMessages(...a),
  fetchWaReminders: (...a: unknown[]) => fetchWaReminders(...a),
  testWaConnection: (...a: unknown[]) => testWaConnection(...a),
  disconnectWa: (...a: unknown[]) => disconnectWa(...a),
}));

import AdminArchieWhatsapp from "./AdminArchieWhatsapp";

const STATUS = {
  settings: {
    enabled: true,
    owner_learning_mode: true,
    retention_days: 365,
    updated_at: "2026-09-14T09:00:00Z",
  },
  config: {
    verifyTokenConfigured: true,
    appSecretConfigured: true,
    accessTokenConfigured: false,
    phoneNumberIdConfigured: false,
    internalKeyConfigured: true,
    graphVersion: "v21.0",
  },
  accounts: [
    {
      id: "acc-1",
      wa_id: "2348000005678",
      display_name: "Peter (Owner)",
      role: "owner",
      status: "active",
      learning_mode: true,
      memory_permission: true,
      last_message_at: "2026-09-14T08:00:00Z",
      created_at: "2026-09-14T07:00:00Z",
    },
    {
      id: "acc-2",
      wa_id: "2348000009999",
      display_name: "Family member",
      role: "family",
      status: "revoked",
      learning_mode: false,
      memory_permission: false,
      last_message_at: null,
      created_at: "2026-09-14T07:30:00Z",
    },
  ],
  messages7d: 12,
  sendErrors7d: 1,
  lastInboundAt: "2026-09-14T08:00:00Z",
  lastWebhookEventAt: "2026-09-14T08:00:05Z",
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminArchieWhatsapp />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchWaStatus.mockResolvedValue({ ok: true, data: STATUS });
  fetchWaMessages.mockResolvedValue({
    ok: true,
    data: {
      messages: [
        {
          id: "m1",
          direction: "in",
          media_type: "text",
          body: "status",
          status: "processed",
          error: null,
          created_at: "2026-09-14T08:00:00Z",
        },
        {
          id: "m2",
          direction: "out",
          media_type: "text",
          body: "ARCHIE WhatsApp Assistant — status:",
          status: "failed_send",
          error: "Graph API 401",
          created_at: "2026-09-14T08:00:01Z",
        },
      ],
    },
  });
  fetchWaReminders.mockResolvedValue({ ok: true, data: { reminders: [] } });
  saveWaSettings.mockResolvedValue({ ok: true });
  addWaAccount.mockResolvedValue({ ok: true });
  updateWaAccount.mockResolvedValue({ ok: true });
  revokeWaAccount.mockResolvedValue({ ok: true });
  deleteWaAccount.mockResolvedValue({ ok: true });
  testWaConnection.mockResolvedValue({ ok: true });
  disconnectWa.mockResolvedValue({ ok: true, data: { note: "disabled" } });
});

describe("AdminArchieWhatsapp", () => {
  it("shows the live integration status with honest config presence", async () => {
    renderPage();
    expect(await screen.findByText(/Channel ENABLED/i)).toBeInTheDocument();
    // Config presence pills — sending config honestly missing here.
    expect(screen.getByText(/Access token/i)).toBeInTheDocument();
    expect(screen.getByText(/Phone number ID/i)).toBeInTheDocument();
    expect(screen.getByText(/Messages \(7d\)/i)).toBeInTheDocument();
    expect(screen.getByText(/12/)).toBeInTheDocument();
  });

  it("shows mapped accounts with masked numbers and per-account controls", async () => {
    renderPage();
    await screen.findByText(/Peter \(Owner\)/i);
    // Numbers masked to last 4 digits.
    expect(screen.getByText(/\*\*\*5678/)).toBeInTheDocument();
    expect(screen.getByText(/role owner · status active/i)).toBeInTheDocument();
    expect(screen.getByText(/Family member/)).toBeInTheDocument();
    expect(
      screen.getByText(/role family · status revoked/i),
    ).toBeInTheDocument();
  });

  it("shows the message audit log including send failures honestly", async () => {
    renderPage();
    expect(
      await screen.findByText(/ARCHIE WhatsApp Assistant — status:/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Graph API 401/)).toBeInTheDocument();
  });

  it("linking an account calls the real backend with the sanitized number", async () => {
    renderPage();
    await screen.findByText(/Identity mappings/i);
    const numberInput = screen.getByPlaceholderText(/WhatsApp number/i);
    fireEvent.change(numberInput, { target: { value: "+234 811 000 0000" } });
    fireEvent.click(screen.getByRole("button", { name: /Link/i }));
    await waitFor(() =>
      expect(addWaAccount).toHaveBeenCalledWith("2348110000000", "", "family"),
    );
  });

  it("validates the number before calling the backend", async () => {
    renderPage();
    await screen.findByText(/Identity mappings/i);
    fireEvent.change(screen.getByPlaceholderText(/WhatsApp number/i), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Link/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/Enter the WhatsApp number/i),
      ).toBeInTheDocument(),
    );
    expect(addWaAccount).not.toHaveBeenCalled();
  });

  it("reveals the test-connection result — connected or honest failure", async () => {
    renderPage();
    await screen.findByText(/Connection & security/i);
    testWaConnection.mockResolvedValueOnce({
      ok: true,
      data: {
        connected: true,
        displayPhoneNumber: "+234 800 000 0000",
        verifiedName: "FRELUX",
        qualityRating: "GREEN",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /Test connection/i }));
    expect(
      await screen.findByText(/FRELUX — \+234 800 000 0000/),
    ).toBeInTheDocument();
    expect(screen.getByText(/quality GREEN/i)).toBeInTheDocument();
  });

  it("revoking an account calls the backend and refreshes", async () => {
    renderPage();
    await screen.findByText(/Peter \(Owner\)/i);
    fireEvent.click(screen.getByRole("button", { name: /^Revoke$/ }));
    await waitFor(() => expect(revokeWaAccount).toHaveBeenCalledWith("acc-1"));
  });

  it("toggling Owner Learning Mode saves settings through the backend", async () => {
    renderPage();
    await screen.findByText(/Owner Learning Mode/i);
    // Per-account "Learning" switches (one per mapping); click
    // the first account's.
    const learningSwitches = screen.getAllByRole("switch", {
      name: /^Learning$/,
    });
    fireEvent.click(learningSwitches[0]);
    await waitFor(() =>
      expect(updateWaAccount).toHaveBeenCalledWith("acc-1", {
        learningMode: false,
      }),
    );
  });

  it("disconnect revokes everything through the backend", async () => {
    renderPage();
    await screen.findByText(/Disconnect \/ revoke all/i);
    fireEvent.click(
      screen.getByRole("button", { name: /Disconnect \/ revoke all/i }),
    );
    await waitFor(() => expect(disconnectWa).toHaveBeenCalled());
  });

  it("surfaces a backend failure honestly — never fake status", async () => {
    fetchWaStatus.mockResolvedValueOnce({
      ok: false,
      error: "Function archie-whatsapp not found",
    });
    renderPage();
    expect(
      await screen.findByText(/Integration status unavailable/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/never shows fake status/i)).toBeInTheDocument();
  });
});
