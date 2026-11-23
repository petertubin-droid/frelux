import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminAIAssistant from "@/pages/admin/AdminAIAssistant";

const mockUseAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

let mockSiteSettingsQuery: any;
let mockAdminAiActionsQuery: any;
let mockFunctionsInvoke: any;

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "site_settings") return mockSiteSettingsQuery;
      if (table === "admin_ai_actions") return mockAdminAiActionsQuery;
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
    functions: {
      invoke: vi.fn().mockImplementation((...args) => mockFunctionsInvoke(...args)),
    },
  },
  getFunctionErrorMessage: vi.fn().mockImplementation(async (err: any) => {
    return err?.message || "Failed to reach the assistant";
  }),
}));

describe("AdminAIAssistant", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: { id: "admin-1", email: "admin@frelux.test" },
      loading: false,
      isAdmin: true,
    });

    mockSiteSettingsQuery = {
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { solas_api_key: "solas-secret-123", solas_chat_url: null },
        error: null,
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };

    mockAdminAiActionsQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: "act-1",
            title: "Fix paint calculator prices",
            category: "price_correction",
            status: "completed",
            description: "Corrected premium emulsion base cost for Lagos",
            resolution: "Updated Lagos price index record to 45,000 NGN.",
            conversation_id: "conv-101",
            created_at: "2026-11-20T12:00:00Z",
          },
        ],
        error: null,
      }),
    };

    mockFunctionsInvoke = vi.fn().mockResolvedValue({
      data: {
        response: "I inspected the Lagos index and adjusted the cement rate.",
        action: { id: "act-2", title: "Adjust Cement Rate", status: "completed" },
        conversationId: "conv-102",
      },
      error: null,
    });
  });

  it("renders header, tab navigation, and chat controls", async () => {
    render(
      <MemoryRouter>
        <AdminAIAssistant />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "AI Assistant" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Chat/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Action History/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Settings/i })).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Admin AI message/i)).toBeInTheDocument();
  });

  it("displays configuration banner when API key is missing", async () => {
    mockSiteSettingsQuery.single.mockResolvedValueOnce({
      data: { solas_api_key: null, solas_chat_url: null },
      error: null,
    });

    render(
      <MemoryRouter>
        <AdminAIAssistant />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Solas API Key Required/i)).toBeInTheDocument();
    });
  });

  it("saves a new API key in the settings tab", async () => {
    render(
      <MemoryRouter>
        <AdminAIAssistant />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Settings/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Settings/i }));

    const keyInput = screen.getByLabelText(/Superagent API Key/i);
    fireEvent.change(keyInput, { target: { value: "new-superagent-key-456" } });

    const saveBtn = screen.getByRole("button", { name: /Save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockSiteSettingsQuery.update).toHaveBeenCalledWith({
        solas_api_key: "new-superagent-key-456",
      });
    });
  });

  it("sends chat message and renders assistant reply", async () => {
    render(
      <MemoryRouter>
        <AdminAIAssistant />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Admin AI message/i)).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText(/Admin AI message/i);
    fireEvent.change(textarea, {
      target: { value: "Please check cement bag rates in Abuja" },
    });

    const sendBtn = screen.getByRole("button", { name: /Send to Solas/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        "ai-admin-assistant",
        expect.objectContaining({
          body: expect.objectContaining({
            message: "Please check cement bag rates in Abuja",
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText("I inspected the Lagos index and adjusted the cement rate."),
      ).toBeInTheDocument();
    });
  });

  it("displays error message if edge function fails", async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: "Edge Function invocation timed out" },
    });

    render(
      <MemoryRouter>
        <AdminAIAssistant />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Admin AI message/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Admin AI message/i), {
      target: { value: "Test fail message" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Send to Solas/i }));

    await waitFor(() => {
      expect(screen.getByText(/Edge Function invocation timed out/i)).toBeInTheDocument();
    });
  });

  it("loads and displays past actions in the Action History tab", async () => {
    render(
      <MemoryRouter>
        <AdminAIAssistant />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Action History/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Action History/i }));

    await waitFor(() => {
      expect(screen.getByText("Fix paint calculator prices")).toBeInTheDocument();
      expect(
        screen.getByText("Corrected premium emulsion base cost for Lagos"),
      ).toBeInTheDocument();
    });
  });

  it("loads historical action into the chat when clicked", async () => {
    render(
      <MemoryRouter>
        <AdminAIAssistant />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Action History/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Action History/i }));

    await waitFor(() => {
      expect(screen.getByText("Fix paint calculator prices")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Fix paint calculator prices"));

    await waitFor(() => {
      // Switched back to chat tab and populated user message + resolution
      expect(
        screen.getByText("Corrected premium emulsion base cost for Lagos"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Updated Lagos price index record to 45,000 NGN."),
      ).toBeInTheDocument();
    });
  });
});
