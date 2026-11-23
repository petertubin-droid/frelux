import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";
import AdminColors from "./AdminColors";

const { mockColors, mockFamilies, mockCategories, updateEqMock, deleteEqMock } =
  vi.hoisted(() => {
    const mockFamilies = [
      {
        id: "fam-1",
        name: "Warm Neutrals",
        slug: "warm-neutrals",
        sort_order: 1,
      },
    ];

    const mockCategories = [
      {
        id: "cat-1",
        name: "Interior Wall",
        slug: "interior-wall",
        sort_order: 1,
      },
    ];

    const mockColors = [
      {
        id: "col-1",
        name: "Ivory Mist",
        slug: "ivory-mist",
        hex_code: "#F5F5DC",
        color_family_id: "fam-1",
        category_id: "cat-1",
        is_interior: true,
        is_exterior: false,
        is_featured: false,
        is_trending: true,
        is_active: true,
        popularity_score: 85,
        display_order: 1,
      },
    ];

    return {
      mockColors,
      mockFamilies,
      mockCategories,
      updateEqMock: vi.fn().mockResolvedValue({ error: null }),
      deleteEqMock: vi.fn().mockResolvedValue({ error: null }),
    };
  });

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "paint_colors") {
        return {
          select: vi.fn(
            (_cols?: string, opts?: { count?: string; head?: boolean }) => {
              if (opts?.count) {
                const countPromise = Promise.resolve({ count: 1, error: null });
                return Object.assign(countPromise, {
                  or: vi.fn().mockReturnThis(),
                });
              }
              return {
                or: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    range: vi.fn().mockResolvedValue({
                      data: mockColors,
                      error: null,
                    }),
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
        };
      }
      if (table === "color_families") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi
              .fn()
              .mockResolvedValue({ data: mockFamilies, error: null }),
          }),
        };
      }
      if (table === "color_categories") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi
              .fn()
              .mockResolvedValue({ data: mockCategories, error: null }),
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
        <AdminColors />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("AdminColors", () => {
  it("renders page header and navigation tabs", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /Color Gallery/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "paint colors" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "combinations" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "categories" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "families" }),
    ).toBeInTheDocument();
  });

  it("displays paint colors grouped under their color family", async () => {
    renderPage();

    expect(await screen.findByText("Warm Neutrals")).toBeInTheDocument();
    expect(screen.getByText("Ivory Mist")).toBeInTheDocument();
    expect(screen.getByText("#F5F5DC")).toBeInTheDocument();
  });

  it("toggles featured flag on a paint color", async () => {
    renderPage();

    await screen.findByText("Ivory Mist");
    const featBtn = screen.getByRole("button", { name: "Feat" });
    fireEvent.click(featBtn);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "col-1");
    });
  });

  it("deletes a color after confirmation", async () => {
    renderPage();

    await screen.findByText("Ivory Mist");
    const deleteBtn = screen.getByLabelText("Delete Ivory Mist");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Delete "Ivory Mist"?');
      expect(deleteEqMock).toHaveBeenCalledWith("id", "col-1");
    });
  });

  it("opens Add Color modal", async () => {
    renderPage();

    await screen.findByText("Ivory Mist");
    const addBtn = screen.getByRole("button", { name: /Add color/i });
    fireEvent.click(addBtn);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("switches to categories tab", async () => {
    renderPage();

    await screen.findByText("Ivory Mist");
    const catTab = screen.getByRole("button", { name: "categories" });
    fireEvent.click(catTab);

    expect(
      await screen.findByRole("button", { name: /Add category/i }),
    ).toBeInTheDocument();
  });
});
