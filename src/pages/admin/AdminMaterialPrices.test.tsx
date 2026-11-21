import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminMaterialPrices from "./AdminMaterialPrices";
import { ToastProvider } from "@/components/ui/Toast";
import * as projectIntelligence from "@/lib/project-intelligence";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: { id: "admin-1" }, loading: false })),
}));

vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

vi.mock("@/lib/project-intelligence", () => ({
  fetchMaterialsWithPrices: vi.fn(),
  updateMaterialPrice: vi.fn(),
  fetchMaterialPriceHistory: vi.fn(),
}));

const mockMaterials = [
  {
    id: "mat-1",
    name: "Portland Cement (50kg)",
    category: "cement",
    unit: "bag",
    price: 9500,
    previous_price: 9000,
    is_active: true,
    sort_order: 1,
    currency: "NGN",
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "mat-2",
    name: "Sharp Sand (20 tonnes)",
    category: "aggregate",
    unit: "trip",
    price: 120000,
    previous_price: 110000,
    is_active: true,
    sort_order: 2,
    currency: "NGN",
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

const mockHistory = [
  {
    id: "hist-1",
    material_id: "mat-1",
    material_name: "Portland Cement (50kg)",
    category: "cement",
    old_price: 9000,
    new_price: 9500,
    unit: "bag",
    price_source: "manual",
    changed_by: "admin",
    change_reason: "Market inflation adjustment",
    created_at: new Date().toISOString(),
  },
];

function renderWithProviders() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AdminMaterialPrices />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(projectIntelligence.fetchMaterialsWithPrices).mockResolvedValue(
    mockMaterials as any,
  );
  vi.mocked(projectIntelligence.fetchMaterialPriceHistory).mockResolvedValue(
    mockHistory as any,
  );
});

describe("AdminMaterialPrices Interactive Suite", () => {
  it("renders materials table with current and previous prices", async () => {
    renderWithProviders();

    expect(await screen.findByRole("heading", { name: /Material Price Tracker/i })).toBeInTheDocument();
    expect(await screen.findByText("Portland Cement (50kg)")).toBeInTheDocument();
    expect(screen.getByText("Sharp Sand (20 tonnes)")).toBeInTheDocument();
  });

  it("allows clicking Update to edit price and saves change", async () => {
    vi.mocked(projectIntelligence.updateMaterialPrice).mockResolvedValue(true as any);

    renderWithProviders();

    await screen.findByText("Portland Cement (50kg)");
    const updateButtons = screen.getAllByRole("button", { name: /Update/i });
    fireEvent.click(updateButtons[0]);

    // An input for the new price appears
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "9800" } });

    // Click save
    const saveButton = screen.getByRole("button", { name: /Save/i });
    fireEvent.click(saveButton);

    expect(projectIntelligence.updateMaterialPrice).toHaveBeenCalledWith("mat-1", 9800);
  });

  it("loads and displays price history modal when clicking Price History", async () => {
    renderWithProviders();

    await screen.findByRole("heading", { name: /Material Price Tracker/i });
    const historyBtn = screen.getByRole("button", { name: /Price History/i });
    fireEvent.click(historyBtn);

    expect(projectIntelligence.fetchMaterialPriceHistory).toHaveBeenCalled();
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Close price history")).toBeInTheDocument();
  });
});
