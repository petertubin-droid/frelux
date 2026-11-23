import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";
import AdminLearn from "./AdminLearn";

const { mockArticles, mockCategories, mockFaqs, updateEqMock, deleteEqMock } =
  vi.hoisted(() => {
    const mockCategories = [
      {
        id: "cat-1",
        name: "Wall Preparation",
        slug: "wall-preparation",
        sort_order: 1,
        is_active: true,
      },
    ];

    const mockArticles = [
      {
        id: "art-1",
        slug: "how-to-prep-walls",
        title: "How to Prep Walls for Screeding",
        category_slug: "wall-preparation",
        content: "Complete guide on wall screeding preparation...",
        status: "published",
        is_featured: true,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];

    const mockFaqs = [
      {
        id: "faq-1",
        article_id: "art-1",
        question: "How long to dry?",
        answer: "Wait 24 hours.",
        sort_order: 0,
        is_active: true,
      },
    ];

    return {
      mockArticles,
      mockCategories,
      mockFaqs,
      updateEqMock: vi.fn().mockResolvedValue({ error: null }),
      deleteEqMock: vi.fn().mockResolvedValue({ error: null }),
    };
  });

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "learn_articles") {
        return {
          select: vi.fn(
            (_cols?: string, opts?: { count?: string; head?: boolean }) => {
              if (opts?.count) {
                return Promise.resolve({ count: 1, error: null });
              }
              return {
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockArticles,
                    error: null,
                  }),
                }),
              };
            },
          ),
          update: vi.fn().mockReturnValue({
            eq: updateEqMock,
          }),
          delete: vi.fn().mockReturnValue({
            eq: deleteEqMock,
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "learn_categories") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi
              .fn()
              .mockResolvedValue({ data: mockCategories, error: null }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "learn_article_faqs") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockFaqs, error: null }),
          }),
        };
      }
      if (table === "learn_article_inserts") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn().mockReturnValue(true);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AdminLearn />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("AdminLearn", () => {
  it("renders page header, tabs, and article list", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /Learn/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "articles" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "categories" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "faqs" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "inserts" })).toBeInTheDocument();

    expect(
      await screen.findByText("How to Prep Walls for Screeding"),
    ).toBeInTheDocument();
    expect(screen.getByText("Featured")).toBeInTheDocument();
  });

  it("toggles published status on an article", async () => {
    renderPage();

    await screen.findByText("How to Prep Walls for Screeding");
    const pubToggle = screen.getByLabelText(
      "Published: How to Prep Walls for Screeding",
    );
    fireEvent.click(pubToggle);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "art-1");
    });
  });

  it("opens article editor on clicking edit", async () => {
    renderPage();

    await screen.findByText("How to Prep Walls for Screeding");
    const editBtn = screen.getByLabelText(
      "Edit How to Prep Walls for Screeding",
    );
    fireEvent.click(editBtn);

    expect(
      await screen.findByDisplayValue("How to Prep Walls for Screeding"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Save Article/i }),
    ).toBeInTheDocument();
  });

  it("deletes an article after confirmation", async () => {
    renderPage();

    await screen.findByText("How to Prep Walls for Screeding");
    const deleteBtn = screen.getByLabelText(
      "Delete How to Prep Walls for Screeding",
    );
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith("Delete this article?");
      expect(deleteEqMock).toHaveBeenCalledWith("id", "art-1");
    });
  });

  it("switches to categories tab", async () => {
    renderPage();

    await screen.findByText("How to Prep Walls for Screeding");
    const catTab = screen.getByRole("button", { name: "categories" });
    fireEvent.click(catTab);

    expect(await screen.findByText("Wall Preparation")).toBeInTheDocument();
  });
});
