import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminTranslations from "@/pages/admin/AdminTranslations";

const mockRow = {
  id: "trans-1",
  content_type: "article",
  content_key: "plaster-prep-lagos",
  locale: "es",
  title: "Preparación de yeso",
  description: "Guía de preparación",
  body_md: "Contenido traducido",
  status: "draft",
  translator: "machine-v1",
  notes: null,
  updated_at: "2026-11-20T12:00:00Z",
  published_at: null,
};

const mockUpdateEq = vi.fn();
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));
const mockInvoke = vi.fn();
const mockGetSession = vi.fn();

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (s: string) => s }),
}));

vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: vi.fn(async () => ({
    from: vi.fn((table: string) => {
      if (table === "content_translations") {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [mockRow], error: null }),
          update: mockUpdate,
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
      };
    }),
    auth: {
      getSession: mockGetSession,
    },
    functions: {
      invoke: mockInvoke,
    },
  })),
}));

describe("AdminTranslations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "mock-access-token",
          user: { id: "admin-reviewer-uuid" },
        },
      },
    });
    mockUpdateEq.mockResolvedValue({ error: null });
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
  });

  it("renders console header, draft generator, and translations table", async () => {
    render(
      <MemoryRouter>
        <AdminTranslations />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Content Translations/i);
    expect(screen.getByText(/Generate a machine draft/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Preparación de yeso")).toBeInTheDocument();
      expect(screen.getByText("plaster-prep-lagos")).toBeInTheDocument();
      expect(screen.getByText("machine-v1")).toBeInTheDocument();
    });
  });

  it("invokes translate-content edge function with auth bearer and payload", async () => {
    render(
      <MemoryRouter>
        <AdminTranslations />
      </MemoryRouter>,
    );

    await screen.findByText("Preparación de yeso");

    const input = screen.getByPlaceholderText("english-article-slug");
    fireEvent.change(input, { target: { value: "foundation-cost-guide" } });

    const generateBtn = screen.getByRole("button", { name: /Generate draft/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("translate-content", {
        headers: { Authorization: "Bearer mock-access-token" },
        body: {
          contentType: "article",
          key: "foundation-cost-guide",
          locale: "es",
        },
      });
    });
  });

  it("publishes translation and records reviewer id", async () => {
    render(
      <MemoryRouter>
        <AdminTranslations />
      </MemoryRouter>,
    );

    await screen.findByText("Preparación de yeso");

    const publishBtn = screen.getByTitle("Publish (makes the locale page indexable)");
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        status: "published",
        reviewer_id: "admin-reviewer-uuid",
      });
      expect(mockUpdateEq).toHaveBeenCalledWith("id", "trans-1");
    });
  });

  it("rejects translation via reject button", async () => {
    render(
      <MemoryRouter>
        <AdminTranslations />
      </MemoryRouter>,
    );

    await screen.findByText("Preparación de yeso");

    const rejectBtn = screen.getByTitle("Reject");
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        status: "rejected",
        reviewer_id: "admin-reviewer-uuid",
      });
      expect(mockUpdateEq).toHaveBeenCalledWith("id", "trans-1");
    });
  });

  it("opens review editor and saves modified title/description/body", async () => {
    render(
      <MemoryRouter>
        <AdminTranslations />
      </MemoryRouter>,
    );

    await screen.findByText("Preparación de yeso");

    const reviewBtn = screen.getByTitle("Review");
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByText(/Reviewing ES · plaster-prep-lagos/i)).toBeInTheDocument();
    });

    const titleInput = screen.getByDisplayValue("Preparación de yeso");
    fireEvent.change(titleInput, { target: { value: "Preparación de yeso en Lagos" } });

    const saveBtn = screen.getByRole("button", { name: /Save edits/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        title: "Preparación de yeso en Lagos",
        description: "Guía de preparación",
        body_md: "Contenido traducido",
      });
      expect(mockUpdateEq).toHaveBeenCalledWith("id", "trans-1");
    });
  });

  it("surfaces error when translation generation fails", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: new Error("Rate limit exceeded for translation service"),
    });

    render(
      <MemoryRouter>
        <AdminTranslations />
      </MemoryRouter>,
    );

    await screen.findByText("Preparación de yeso");

    const input = screen.getByPlaceholderText("english-article-slug");
    fireEvent.change(input, { target: { value: "slug-fails" } });

    const generateBtn = screen.getByRole("button", { name: /Generate draft/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText("Rate limit exceeded for translation service")).toBeInTheDocument();
    });
  });
});
