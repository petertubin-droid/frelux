import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminTypography from "./AdminTypography";

const { updateTypographyMock } = vi.hoisted(() => ({
  updateTypographyMock: vi.fn(),
}));

vi.mock("@/lib/font-loader", () => ({
  preloadFontForPreview: vi.fn(),
  clearDynamicFonts: vi.fn(),
}));

vi.mock("@/lib/useTypography", () => ({
  previewTypography: vi.fn(),
  resetPreview: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "site_settings") {
        return {
          select: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "settings-typography-1",
                  typography_config: {
                    body: "Inter",
                    headings: "Space Grotesk",
                    nav: "Inter",
                    btn: "Inter",
                    calcTitle: "Space Grotesk",
                    calcResult: "Space Grotesk",
                  },
                },
                error: null,
              }),
            })),
          })),
          update: vi.fn((patch: any) => ({
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              updateTypographyMock(patch, col, val);
              return Promise.resolve({ error: null });
            }),
          })),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: { id: "new-row" }, error: null }),
              }),
            }),
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
      <AdminTypography />
    </MemoryRouter>,
  );
}

describe("AdminTypography", () => {
  it("renders page header and typography areas", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Typography Manager/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Save & Apply/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reset/i })).toBeInTheDocument();
    expect(screen.getByText("Font Assignments")).toBeInTheDocument();
    expect(screen.getByText("Live Website Preview")).toBeInTheDocument();
  });

  it("opens font picker when an area card is clicked", async () => {
    renderPage();

    const headingsCard = await screen.findByText("Headings");
    fireEvent.click(headingsCard);

    expect(
      await screen.findByText(/Select Font for Headings/i),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search fonts…")).toBeInTheDocument();
  });

  it("selects a new font for an area and saves changes", async () => {
    renderPage();

    const headingsCard = await screen.findByText("Headings");
    fireEvent.click(headingsCard);

    await screen.findByText(/Select Font for Headings/i);
    const applyBtns = screen.getAllByRole("button", {
      name: /Apply This Font/i,
    });
    fireEvent.click(applyBtns[0]);

    const saveBtn = screen.getByRole("button", { name: /Save & Apply/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateTypographyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          typography_config: expect.any(Object),
        }),
        "id",
        "settings-typography-1",
      );
    });

    expect(
      await screen.findByText(/Typography saved and applied globally\./i),
    ).toBeInTheDocument();
  });

  it("resets typography to default fonts", async () => {
    renderPage();

    await screen.findByRole("heading", {
      level: 1,
      name: /Typography Manager/i,
    });
    const resetBtn = screen.getByRole("button", { name: /Reset/i });
    fireEvent.click(resetBtn);

    expect(window.confirm).toHaveBeenCalledWith(
      "Reset all typography to the default FRELUX fonts?",
    );
  });
});
