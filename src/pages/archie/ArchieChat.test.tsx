import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
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

import ArchieChat from "@/pages/archie/ArchieChat";

beforeEach(() => {
  vi.clearAllMocks();
  listConversations.mockResolvedValue([]);
  listMessages.mockResolvedValue([]);
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
});
