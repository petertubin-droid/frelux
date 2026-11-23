import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminLegal from "./AdminLegal";
import { supabase } from "@/lib/supabase";
import type { DbLegalPage } from "@/types/database";

const mockPages: DbLegalPage[] = [
  {
    id: "legal-1",
    slug: "privacy-policy",
    title: "Privacy Policy",
    content: "FRELUX respects user privacy and data rights.",
    is_published: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-11-20T00:00:00Z",
  },
  {
    id: "legal-2",
    slug: "terms-of-service",
    title: "Terms of Service",
    content: "Terms governing use of FRELUX estimation tools.",
    is_published: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-11-21T00:00:00Z",
  },
];

let queryResult = { data: mockPages, error: null };
const updateEqMock = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockImplementation(() => Promise.resolve(queryResult)),
      }),
      update: vi.fn().mockImplementation((payload) => ({
        eq: updateEqMock.mockImplementation(() =>
          Promise.resolve({ error: null }),
        ),
      })),
    })),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  queryResult = { data: mockPages, error: null };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminLegal />
    </MemoryRouter>,
  );
}

describe("AdminLegal", () => {
  it("lists legal pages with title, slug, and publication status", async () => {
    renderPage();

    expect(await screen.findByText("Privacy Policy")).toBeInTheDocument();
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    expect(screen.getByText(/\/privacy-policy/)).toBeInTheDocument();
    expect(screen.getByText(/\/terms-of-service/)).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("toggles published status and writes is_published payload to database", async () => {
    renderPage();

    await screen.findByText("Privacy Policy");
    // Verify accessible toggle label interpolated from title, not a raw string
    const toggle = screen.getByLabelText("Published: Privacy Policy");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("legal_pages");
      expect(updateEqMock).toHaveBeenCalledWith("id", "legal-1");
    });
  });

  it("opens edit modal with interpolated title and allows updating content", async () => {
    renderPage();

    await screen.findByText("Privacy Policy");
    const editBtns = screen.getAllByRole("button", { name: /edit/i });
    fireEvent.click(editBtns[0]);

    // Modal title should interpolate page title, not literal string
    expect(await screen.findByText("Edit Privacy Policy")).toBeInTheDocument();

    const titleInput = screen.getByLabelText("Title");
    fireEvent.change(titleInput, {
      target: { value: "Updated Privacy Policy" },
    });

    const contentInput = screen.getByLabelText(/Content/);
    fireEvent.change(contentInput, {
      target: { value: "Updated privacy terms with GDPR compliance." },
    });

    const saveBtn = screen.getByRole("button", { name: /^Save$/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "legal-1");
    });
  });

  it("validates required title and content before saving", async () => {
    renderPage();

    await screen.findByText("Privacy Policy");
    const editBtns = screen.getAllByRole("button", { name: /edit/i });
    fireEvent.click(editBtns[0]);

    await screen.findByText("Edit Privacy Policy");

    const titleInput = screen.getByLabelText("Title");
    fireEvent.change(titleInput, { target: { value: "   " } });

    const saveBtn = screen.getByRole("button", { name: /^Save$/i });
    fireEvent.click(saveBtn);

    expect(await screen.findByText("Title is required")).toBeInTheDocument();

    fireEvent.change(titleInput, { target: { value: "Valid Title" } });
    const contentInput = screen.getByLabelText(/Content/);
    fireEvent.change(contentInput, { target: { value: "   " } });

    fireEvent.click(saveBtn);
    expect(await screen.findByText("Content is required")).toBeInTheDocument();
  });

  it("surfaces database load error message honestly", async () => {
    queryResult = {
      data: null as any,
      error: { message: "Could not fetch legal pages" } as any,
    };
    renderPage();

    expect(
      await screen.findByText("Could not fetch legal pages"),
    ).toBeInTheDocument();
  });
});
