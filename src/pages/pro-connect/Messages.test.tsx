import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const conversations = vi.hoisted(() => ({
  list: [] as unknown[],
  byId: null as unknown,
}));

// A stable object: a fresh identity on every render would re-run the page's
// load effect each time and leave it permanently loading.
const AUTH = {
  user: { id: "cust-1", email: "client@example.com" },
  profile: null,
  loading: false,
  isPaid: false,
};

vi.mock("@/lib/auth", () => ({
  useAuth: () => AUTH,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
    }),
    removeChannel: () => {},
  },
}));

vi.mock("@/lib/pro-connect", () => ({
  getMyConversations: vi.fn(async () => conversations.list),
  getConversationById: vi.fn(async () => conversations.byId),
  getMessages: vi.fn(async () => []),
  sendMessage: vi.fn(),
  markMessagesRead: vi.fn(),
}));

import Messages from "@/pages/pro-connect/Messages";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:conversationId" element={<Messages />} />
      </Routes>
    </MemoryRouter>,
  );

const convo = {
  id: "convo-1",
  customer_id: "cust-1",
  professional_id: "pro-1",
  project_ref: null,
  project_context: null,
  last_message_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  professional: {
    id: "pro-1",
    display_name: "Ada Obi",
    slug: "ada-obi",
    business_name: "Ada Builds",
  },
};

describe("Pro Connect messages", () => {
  beforeEach(() => {
    conversations.list = [];
    conversations.byId = null;
  });

  it("opens a linked conversation that the list did not return", async () => {
    conversations.byId = convo;
    renderAt("/messages/convo-1");

    // The thread names the professional it fetched directly.
    await waitFor(() => expect(screen.getAllByText("Ada Obi").length).toBeGreaterThan(0));
    expect(
      screen.queryByText("This conversation could not be opened"),
    ).toBeNull();
  });

  it("never leaves the page empty when the conversation cannot be read", async () => {
    renderAt("/messages/missing-1");

    await waitFor(() =>
      expect(
        screen.getByText("This conversation could not be opened"),
      ).toBeInTheDocument(),
    );
    // The empty conversation list also offers this link, hence the plural match.
    expect(screen.getAllByText("Browse professionals").length).toBeGreaterThan(0);
  });

  it("asks for a conversation when none is addressed", async () => {
    conversations.list = [convo];
    renderAt("/messages");

    await waitFor(() =>
      expect(
        screen.getByText("Select a conversation to view messages"),
      ).toBeInTheDocument(),
    );
  });

  it("keeps the draft visible and reports an error when sending fails", async () => {
    conversations.list = [convo];
    const { sendMessage } = await import("@/lib/pro-connect");
    vi.mocked(sendMessage).mockResolvedValue({ error: "Not enough FRELUX Credits. Sending costs 5 credits." });
    renderAt("/messages/convo-1");

    const input = await screen.findByPlaceholderText("Type a message...");
    fireEvent.change(input, { target: { value: "Can you help with this job?" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Not enough FRELUX Credits"));
    expect(input).toHaveValue("Can you help with this job?");
  });
});
