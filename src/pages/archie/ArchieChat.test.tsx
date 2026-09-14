import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "u1", email: "owner@example.com" },
    isAdmin: true,
    loading: false,
  })),
}));

const listConversations = vi.fn().mockResolvedValue([]);
const listMessages = vi.fn().mockResolvedValue([]);
const createConversation = vi.fn();
const uploadAttachment = vi.fn();
const sendChatTurn = vi.fn();
const recordAuditEvent = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/archie/stage1-client", () => ({
  listConversations: (...a: unknown[]) => listConversations(...a),
  listMessages: (...a: unknown[]) => listMessages(...a),
  createConversation: (...a: unknown[]) => createConversation(...a),
  archiveConversation: vi.fn().mockResolvedValue(undefined),
  renameConversation: vi.fn().mockResolvedValue(undefined),
  uploadAttachment: (...a: unknown[]) => uploadAttachment(...a),
  sendChatTurn: (...a: unknown[]) => sendChatTurn(...a),
  recordAuditEvent: (...a: unknown[]) => recordAuditEvent(...a),
  validateAttachment: () => ({ ok: true }),
  MAX_ATTACHMENT_BYTES: 20 * 1024 * 1024,
}));

// ---- Advanced Voice Intelligence mocks (native layer) ----
const fetchConsents = vi.fn((_userId: string) => Promise.resolve({}));
const loadCachedConsents = vi.fn((_userId: string) => null);
const grantCapability = vi.fn(
  async (_userId: string, _cap: string) => undefined,
);
const revokeCapability = vi.fn(
  async (_userId: string, _cap: string) => undefined,
);
const speakArchie = vi.fn((_text: string, _consent: unknown) => ({
  ok: true,
  chunks: 1,
}));
const stopArchieVoice = vi.fn(() => undefined);
const createVoiceSession = vi.fn((_config: unknown, _events: unknown) =>
  Promise.resolve({} as unknown),
);
const loadProfileLocally = vi.fn(() => null);

vi.mock("@/lib/archie/mobile/consent", () => ({
  fetchConsents: (u: string) => fetchConsents(u),
  loadCachedConsents: (u: string) => loadCachedConsents(u),
  grantCapability: (u: string, c: string) => grantCapability(u, c),
  revokeCapability: (u: string, c: string) => revokeCapability(u, c),
}));
vi.mock("@/lib/archie/mobile/voice", () => ({
  speakArchie: (t: string, c: unknown) => speakArchie(t, c),
  stopArchieVoice: () => stopArchieVoice(),
}));
vi.mock("@/lib/archie/mobile/voice-profile", () => ({
  loadProfileLocally: () => loadProfileLocally(),
}));
vi.mock("@/lib/archie/voice-session", () => ({
  createVoiceSession: (c: unknown, e: unknown) => createVoiceSession(c, e),
}));

import ArchieChat from "@/pages/archie/ArchieChat";

/** Consent fixture: default both voice consents OFF —
 *  nothing listens or speaks without an explicit grant. */
function consentsFixture(voiceInput = false, voiceOutput = false) {
  return {
    VOICE_INPUT: {
      capability: "VOICE_INPUT",
      granted: voiceInput,
      granted_at: null,
    },
    VOICE_OUTPUT: {
      capability: "VOICE_OUTPUT",
      granted: voiceOutput,
      granted_at: null,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  listConversations.mockResolvedValue([]);
  listMessages.mockResolvedValue([]);
  loadCachedConsents.mockReturnValue(null);
  fetchConsents.mockResolvedValue(consentsFixture());
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ArchieChat />
    </MemoryRouter>,
  );
}

describe("ArchieChat", () => {
  it("renders the empty state inviting the Owner to start a conversation", async () => {
    const { findByText, getByLabelText } = renderPage();
    expect(await findByText(/Start a conversation/i)).toBeTruthy();
    expect(getByLabelText("Message ARCHIE")).toBeTruthy();
  });

  it("exposes multimodal inputs (image, camera, document) — explicit selection only", () => {
    const { getByLabelText } = renderPage();
    expect(getByLabelText("Attach image")).toBeTruthy();
    expect(getByLabelText("Take photo")).toBeTruthy();
    expect(getByLabelText("Record voice note")).toBeTruthy();
    expect(getByLabelText("Attach document")).toBeTruthy();
  });

  it("offers the Teach ARCHIE action", () => {
    const { getByTitle } = renderPage();
    expect(
      getByTitle("Teach ARCHIE — queue a learning candidate for your approval"),
    ).toBeTruthy();
  });

  it("shows the loading state for the conversation list without faking content", async () => {
    listConversations.mockReturnValue(new Promise(() => []));
    const { container } = renderPage();
    // still mounts without crashing while unresolved
    expect(container.innerHTML).not.toBe("");
  });

  // ---- Advanced Voice Intelligence (native layer) ----

  it("offers the voice session control, disabled until VOICE_INPUT consent is granted", async () => {
    const { findByLabelText } = renderPage();
    const mic = await findByLabelText("Start voice session");
    expect(mic).toBeTruthy();
    // consent is OFF in the fixture → the gate holds
    expect((mic as HTMLButtonElement).disabled).toBe(true);
  });

  it("with VOICE_INPUT consent the session starts through the SAME cognitive engine config", async () => {
    fetchConsents.mockResolvedValue(consentsFixture(true, false));
    listConversations.mockResolvedValue([
      {
        id: "c1",
        title: "T",
        archived: false,
        created_date: "2026-09-14T00:00:00Z",
      },
    ]);
    createVoiceSession.mockResolvedValue({
      ok: true,
      session: { start: vi.fn().mockResolvedValue(undefined), stop: vi.fn() },
    });
    const { findByLabelText } = renderPage();
    const mic = (await findByLabelText(
      "Start voice session",
    )) as HTMLButtonElement;
    await waitFor(() => expect(mic.disabled).toBe(false));
    fireEvent.click(mic);
    await waitFor(() => expect(createVoiceSession).toHaveBeenCalledTimes(1));
    const config = createVoiceSession.mock.calls[0]?.[0] as {
      conversationId: string;
      voiceInputConsent: { granted: boolean };
      continuous: boolean;
    };
    // bound to the ACTIVE conversation, consent passed through
    expect(config.conversationId).toBe("c1");
    expect(config.voiceInputConsent.granted).toBe(true);
    expect(config.continuous).toBe(true);
  });

  it("the Speak toggle grants VOICE_OUTPUT through the consent manager (explicit owner action)", async () => {
    const { findByLabelText } = renderPage();
    const speak = (await findByLabelText(
      "Speak replies aloud",
    )) as HTMLButtonElement;
    expect(speak.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(speak);
    await waitFor(() =>
      expect(grantCapability).toHaveBeenCalledWith("u1", "VOICE_OUTPUT"),
    );
  });

  it("speaks a reply after send ONLY when VOICE_OUTPUT consent is granted", async () => {
    fetchConsents.mockResolvedValue(consentsFixture(true, true));
    listConversations.mockResolvedValue([
      {
        id: "c1",
        title: "T",
        archived: false,
        created_date: "2026-09-14T00:00:00Z",
      },
    ]);
    sendChatTurn.mockResolvedValue({
      ok: true,
      reply: "The roof costs ₦4.2M.",
    });
    listMessages.mockResolvedValue([
      {
        id: "m2",
        role: "archie",
        content: "The roof costs ₦4.2M.",
        created_date: "2026-09-14T00:00:02Z",
      },
    ]);
    const { findByLabelText, findByRole } = renderPage();
    const box = (await findByLabelText(
      "Message ARCHIE",
    )) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "what does the roof cost?" } });
    fireEvent.click(await findByRole("button", { name: "Send message" }));
    await waitFor(() => expect(sendChatTurn).toHaveBeenCalled());
    await waitFor(() => expect(speakArchie).toHaveBeenCalled());
    // spoken through the consent gate, never around it
    const spokenCall = speakArchie.mock.calls[0] as unknown as [
      string,
      { granted: boolean },
    ];
    expect(spokenCall[0]).toContain("roof costs");
    expect(spokenCall[1].granted).toBe(true);
  });

  it("never speaks the reply when VOICE_OUTPUT consent is absent", async () => {
    fetchConsents.mockResolvedValue(consentsFixture(true, false));
    listConversations.mockResolvedValue([
      {
        id: "c1",
        title: "T",
        archived: false,
        created_date: "2026-09-14T00:00:00Z",
      },
    ]);
    sendChatTurn.mockResolvedValue({ ok: true, reply: "quiet reply" });
    listMessages.mockResolvedValue([
      {
        id: "m2",
        role: "archie",
        content: "quiet reply",
        created_date: "2026-09-14T00:00:02Z",
      },
    ]);
    const { findByLabelText, findByRole } = renderPage();
    const box = (await findByLabelText(
      "Message ARCHIE",
    )) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "hello" } });
    fireEvent.click(await findByRole("button", { name: "Send message" }));
    await waitFor(() => expect(sendChatTurn).toHaveBeenCalled());
    await waitFor(() => expect(listMessages).toHaveBeenCalledTimes(2));
    expect(speakArchie).not.toHaveBeenCalled();
  });
});
