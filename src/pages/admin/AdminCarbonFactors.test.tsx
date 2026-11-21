import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";
import AdminCarbonFactors from "./AdminCarbonFactors";

const mockFactors = [
  {
    id: "cf-1",
    category: "emulsion_paint",
    category_label: "Emulsion Paint",
    unit: "litre",
    kg_co2e_per_unit: 2.5,
    effective_date: "2026-01-01",
    source_reference: "ICE Database v3.0",
    is_active: true,
    sort_order: 1,
    description: "Standard architectural emulsion",
  },
];

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: { id: "admin-1", email: "admin@frelux.com" }, loading: false })),
}));

vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

const mockFetchCarbonFactors = vi.fn();
const mockCreateCarbonFactor = vi.fn();
const mockUpdateCarbonFactor = vi.fn();
const mockDeleteCarbonFactor = vi.fn();

vi.mock("@/lib/estimation/queries", () => ({
  fetchCarbonFactors: () => mockFetchCarbonFactors(),
  createCarbonFactor: (data: unknown) => mockCreateCarbonFactor(data),
  updateCarbonFactor: (id: string, data: unknown) => mockUpdateCarbonFactor(id, data),
  deleteCarbonFactor: (id: string) => mockDeleteCarbonFactor(id),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchCarbonFactors.mockResolvedValue({ data: mockFactors, error: null });
  mockCreateCarbonFactor.mockResolvedValue({ id: "cf-2", category: "cement" });
  mockDeleteCarbonFactor.mockResolvedValue(true);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AdminCarbonFactors />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("AdminCarbonFactors", () => {
  it("renders carbon factors table with configured data", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("emulsion_paint")).toBeDefined();
      expect(screen.getByText("Emulsion Paint")).toBeDefined();
      expect(screen.getByText("ICE Database v3.0")).toBeDefined();
    });
  });

  it("opens add factor modal upon clicking Add Factor", async () => {
    renderPage();

    const addBtn = await screen.findByRole("button", { name: /Add Factor/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText(/Add carbon factor/i)).toBeDefined();
      expect(screen.getByLabelText(/Category key/i)).toBeDefined();
    });
  });

  it("calls deleteCarbonFactor when deleting an entry", async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("emulsion_paint")).toBeDefined();
    });

    const deleteBtn = screen.getByLabelText(/Delete/i);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockDeleteCarbonFactor).toHaveBeenCalledWith("cf-1");
    });
  });
});
