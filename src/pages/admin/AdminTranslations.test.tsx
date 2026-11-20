import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminTranslations from "@/pages/admin/AdminTranslations";

vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((fn) =>
        Promise.resolve(
          fn({
            data: [
              {
                id: "test-trans-1",
                content_type: "article",
                content_key: "plaster-prep-lagos",
                locale: "fr",
                title: "Préparation du plâtre",
                description: "Guide français",
                body_md: "Contenu en français",
                status: "draft",
                updated_at: "2026-11-20T12:00:00Z",
              },
            ],
            error: null,
          }),
        ),
      ),
    }),
  })),
}));

describe("AdminTranslations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the translation console header and locale selection", async () => {
    render(
      <MemoryRouter>
        <AdminTranslations />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Content Translations/i);
    expect(screen.getByText(/Generate a machine draft/i)).toBeDefined();
  });

  it("lists translation entries and allows selecting locales", async () => {
    render(
      <MemoryRouter>
        <AdminTranslations />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Préparation du plâtre")).toBeDefined();
      expect(screen.getByText("plaster-prep-lagos")).toBeDefined();
    });
  });
});
