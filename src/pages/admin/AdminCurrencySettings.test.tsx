import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminCurrencySettings from "@/pages/admin/AdminCurrencySettings";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (s: string) => s }),
}));

vi.mock("@/lib/supabase", () => {
  const maybeSingleMock = vi.fn();
  const updateEqMock = vi.fn();
  const updateMock = vi.fn(() => ({ eq: updateEqMock }));
  const selectMock = vi.fn(() => ({
    limit: vi.fn(() => ({
      maybeSingle: maybeSingleMock,
    })),
  }));

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === "site_settings") {
          return {
            select: selectMock,
            update: updateMock,
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
        };
      }),
    },
  };
});

describe("AdminCurrencySettings behavior", () => {
  const mockConfig = {
    id: "settings-row-1",
    display_currencies: {
      enabled: true,
      note: "Rates reviewed Q4",
      rates: {
        USD: 0.00065,
        GBP: 0.00052,
      },
      updated_at: "2026-10-01T00:00:00Z",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and displays existing currency config and rates", async () => {
    const fromMock = vi.mocked(supabase.from);
    const mockSelect = fromMock("site_settings").select as any;
    mockSelect().limit().maybeSingle.mockResolvedValueOnce({
      data: mockConfig,
      error: null,
    });

    render(
      <MemoryRouter>
        <AdminCurrencySettings />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Currency & FX Rates")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Rates reviewed Q4")).toBeInTheDocument();
      expect(screen.getByDisplayValue("0.00065")).toBeInTheDocument();
      expect(screen.getByDisplayValue("0.00052")).toBeInTheDocument();
    });
  });

  it("calculates rate from inverse NGN input and saves valid numeric rates", async () => {
    const fromMock = vi.mocked(supabase.from);
    const mockSelect = fromMock("site_settings").select as any;
    mockSelect().limit().maybeSingle.mockResolvedValueOnce({
      data: {
        id: "settings-row-1",
        display_currencies: {
          enabled: false,
          note: "",
          rates: {},
        },
      },
      error: null,
    });

    const mockUpdate = fromMock("site_settings").update as any;
    const mockEq = vi.fn().mockResolvedValueOnce({ error: null });
    mockUpdate.mockReturnValueOnce({ eq: mockEq });

    render(
      <MemoryRouter>
        <AdminCurrencySettings />
      </MemoryRouter>,
    );

    await screen.findByText("Currency & FX Rates");

    // Toggle enabled
    fireEvent.click(screen.getByRole("switch", { name: /Enable visitor currency switcher/i }));

    // Change note
    const noteInput = screen.getByPlaceholderText("Rates reviewed 2026-10-04");
    fireEvent.change(noteInput, { target: { value: "Updated rates Nov 2026" } });

    // Click inverse helper input for USD (placeholder e.g. 1540)
    const inverseInputs = screen.getAllByPlaceholderText("e.g. 1540");
    fireEvent.change(inverseInputs[0], { target: { value: "1500" } });

    // Save
    fireEvent.click(screen.getByRole("button", { name: /Save currency settings/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          display_currencies: expect.objectContaining({
            enabled: true,
            note: "Updated rates Nov 2026",
            rates: expect.objectContaining({
              USD: Number((1 / 1500).toFixed(8)),
            }),
          }),
        }),
      );
      expect(mockEq).toHaveBeenCalledWith("id", "settings-row-1");
    });
  });

  it("surfaces load failure when settings query fails", async () => {
    const fromMock = vi.mocked(supabase.from);
    const mockSelect = fromMock("site_settings").select as any;
    mockSelect().limit().maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "Database connection failed" },
    });

    render(
      <MemoryRouter>
        <AdminCurrencySettings />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Database connection failed")).toBeInTheDocument();
    });
  });

  it("surfaces save error when update call fails", async () => {
    const fromMock = vi.mocked(supabase.from);
    const mockSelect = fromMock("site_settings").select as any;
    mockSelect().limit().maybeSingle.mockResolvedValueOnce({
      data: { id: "row-1", display_currencies: null },
      error: null,
    });

    const mockUpdate = fromMock("site_settings").update as any;
    mockUpdate.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValueOnce({ error: { message: "Permission denied for site_settings" } }),
    });

    render(
      <MemoryRouter>
        <AdminCurrencySettings />
      </MemoryRouter>,
    );

    await screen.findByText("Currency & FX Rates");
    fireEvent.click(screen.getByRole("button", { name: /Save currency settings/i }));

    await waitFor(() => {
      expect(screen.getByText("Permission denied for site_settings")).toBeInTheDocument();
    });
  });
});

describe("AdminCurrencySettings routing", () => {
  const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

  it("is wired into the admin routes at /admin/currency", () => {
    const src = read("src/App.tsx");
    expect(src).toContain('import("@/pages/admin/AdminCurrencySettings")');
    expect(src).toMatch(/path="currency"/);
    expect(src).toMatch(/element=\{<AdminCurrencySettings \/>\}/);
  });

  it("matches the existing sidebar nav entry", () => {
    const nav = read("src/components/admin/AdminLayout.tsx");
    expect(nav).toContain('"/admin/currency"');
  });
});
