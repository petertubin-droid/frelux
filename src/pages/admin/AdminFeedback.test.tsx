import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminFeedback from "@/pages/admin/AdminFeedback";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (s: string) => s }),
}));

const mockFeedbacks = [
  {
    id: "fb-1",
    kind: "feature_request",
    category: "calculator",
    message: "Please add a stone dust calculation for paving.",
    page_url: "https://frelux.com/tools/paving",
    contact_email: "contractor@example.com",
    status: "new",
    created_at: "2026-11-20T10:00:00Z",
  },
];

const mockUpdateEq = vi.fn();
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === "feedback_suggestions") {
          return {
            select: vi.fn().mockImplementation((_cols, opts) => {
              if (opts?.head) {
                return {
                  eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
                  then: (fn: any) =>
                    Promise.resolve(fn({ count: 1, error: null })),
                };
              }
              return {
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockReturnValue({
                    eq: vi
                      .fn()
                      .mockResolvedValue({ data: mockFeedbacks, error: null }),
                    then: (fn: any) =>
                      Promise.resolve(fn({ data: mockFeedbacks, error: null })),
                  }),
                }),
              };
            }),
            update: mockUpdate,
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
        };
      }),
    },
  };
});

describe("AdminFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateEq.mockResolvedValue({ error: null });
  });

  it("renders header and lists feedback items", async () => {
    render(
      <MemoryRouter>
        <AdminFeedback />
      </MemoryRouter>,
    );

    expect(screen.getByText("Feedback & Suggestions")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText("Please add a stone dust calculation for paving."),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Contact: contractor@example.com"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("from https://frelux.com/tools/paving"),
      ).toBeInTheDocument();
    });
  });

  it("updates feedback status via dropdown", async () => {
    render(
      <MemoryRouter>
        <AdminFeedback />
      </MemoryRouter>,
    );

    await screen.findByText("Please add a stone dust calculation for paving.");
    const statusSelect = screen.getByLabelText("Feedback status");
    fireEvent.change(statusSelect, { target: { value: "planned" } });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ status: "planned" });
      expect(mockUpdateEq).toHaveBeenCalledWith("id", "fb-1");
    });
  });

  it("switches status filter and queries for selected status", async () => {
    render(
      <MemoryRouter>
        <AdminFeedback />
      </MemoryRouter>,
    );

    await screen.findByText("Please add a stone dust calculation for paving.");
    const shippedFilter = screen.getByRole("button", { name: /^shipped$/i });
    fireEvent.click(shippedFilter);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("feedback_suggestions");
    });
  });

  it("displays empty state when no feedback matches", async () => {
    vi.mocked(supabase.from).mockImplementationOnce(
      (_table: string) =>
        ({
          select: vi.fn().mockImplementation((_cols, opts) => {
            if (opts?.head) {
              return {
                eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
                then: (fn: any) =>
                  Promise.resolve(fn({ count: 0, error: null })),
              };
            }
            return {
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: [], error: null }),
                  then: (fn: any) =>
                    Promise.resolve(fn({ data: [], error: null })),
                }),
              }),
            };
          }),
          update: mockUpdate,
        }) as any,
    );

    render(
      <MemoryRouter>
        <AdminFeedback />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Nothing here")).toBeInTheDocument();
      expect(
        screen.getByText("No feedback in this view yet."),
      ).toBeInTheDocument();
    });
  });
});
