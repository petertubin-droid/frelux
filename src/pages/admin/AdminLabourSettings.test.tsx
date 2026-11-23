import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminLabourSettings from "./AdminLabourSettings";
import { supabase } from "@/lib/supabase";

const mockSettings = [
  {
    id: "setting-1",
    estimator_key: "paint",
    market: "NG",
    is_enabled: true,
    default_pricing_method: "per_sqm",
    suggested_rates: { standard: 500, premium: 800 },
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z",
  },
];

const mockCategories = [
  {
    id: "cat-1",
    estimator_key: "paint",
    category_name: "Internal Wall Painting",
    rate_unit: "per_sqm",
    suggested_rate: 650,
    is_active: true,
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z",
  },
];

let settingsList = [...mockSettings];
let categoriesList = [...mockCategories];
let fetchError: any = null;
const updateEqMock = vi.fn().mockResolvedValue({ error: null });
const deleteEqMock = vi.fn().mockResolvedValue({ error: null });

function createChainQuery(data: any) {
  const obj: any = {
    order: vi.fn().mockImplementation(() => obj),
    select: vi.fn().mockImplementation(() => obj),
    eq: vi.fn().mockImplementation(() => obj),
    then: (resolve: any) =>
      resolve({ data: fetchError ? null : data, error: fetchError }),
  };
  return obj;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "labour_settings") {
        return {
          select: vi
            .fn()
            .mockImplementation(() => createChainQuery(settingsList)),
          update: vi.fn().mockImplementation(() => ({
            eq: updateEqMock,
          })),
        };
      }
      if (table === "labour_categories") {
        return {
          select: vi
            .fn()
            .mockImplementation(() => createChainQuery(categoriesList)),
          update: vi.fn().mockImplementation(() => ({
            eq: updateEqMock,
          })),
          delete: vi.fn().mockImplementation(() => ({
            eq: deleteEqMock,
          })),
        };
      }
      return createChainQuery([]);
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  settingsList = [...mockSettings];
  categoriesList = [...mockCategories];
  fetchError = null;
  window.confirm = vi.fn().mockReturnValue(true);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminLabourSettings />
    </MemoryRouter>,
  );
}

describe("AdminLabourSettings", () => {
  it("renders Labour Settings header and Estimator Settings tab", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Labour Settings/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Estimator Settings/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Labour Categories/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Paint Cost Estimator")).toBeInTheDocument();
  });

  it("toggles estimator setting enabled state", async () => {
    renderPage();

    await screen.findByText("Paint Cost Estimator");
    const toggle = screen.getByLabelText("Enabled: Paint Cost Estimator NG");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "setting-1");
    });
  });

  it("switches to Labour Categories tab and displays categories", async () => {
    renderPage();

    await screen.findByText("Paint Cost Estimator");
    const categoriesTabBtn = screen.getByRole("button", {
      name: /Labour Categories/i,
    });
    fireEvent.click(categoriesTabBtn);

    expect(
      await screen.findByText("Internal Wall Painting"),
    ).toBeInTheDocument();
    expect(screen.getByText(/base ₦650/)).toBeInTheDocument();
  });

  it("toggles category active status in Labour Categories tab", async () => {
    renderPage();

    await screen.findByText("Paint Cost Estimator");
    const categoriesTabBtn = screen.getByRole("button", {
      name: /Labour Categories/i,
    });
    fireEvent.click(categoriesTabBtn);

    await screen.findByText("Internal Wall Painting");
    const toggle = screen.getByLabelText("Active: Internal Wall Painting");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "cat-1");
    });
  });

  it("deletes a category after confirmation", async () => {
    renderPage();

    await screen.findByText("Paint Cost Estimator");
    const categoriesTabBtn = screen.getByRole("button", {
      name: /Labour Categories/i,
    });
    fireEvent.click(categoriesTabBtn);

    await screen.findByText("Internal Wall Painting");
    const deleteBtn = screen.getByLabelText("Delete Internal Wall Painting");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(deleteEqMock).toHaveBeenCalledWith("id", "cat-1");
    });
  });

  it("displays error when fetching settings fails", async () => {
    fetchError = { message: "Could not fetch labour settings" };
    renderPage();

    expect(
      await screen.findByText("Could not fetch labour settings"),
    ).toBeInTheDocument();
  });
});
