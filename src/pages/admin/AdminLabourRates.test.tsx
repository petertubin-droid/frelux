import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminLabourRates from "./AdminLabourRates";
import * as estimationQueries from "@/lib/estimation/queries";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: { id: "admin-1" }, loading: false })),
}));

vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

vi.mock("@/lib/estimation/queries", () => ({
  fetchLabourRates: vi.fn(),
  createLabourRate: vi.fn(),
  updateLabourRate: vi.fn(),
  deleteLabourRate: vi.fn(),
}));

const mockRatesList = [
  {
    id: "rate-1",
    task_key: "wall_screeding",
    task_label: "Wall Screeding & Skimming",
    unit: "sqm",
    output_per_worker_day: 35,
    description: "Two-coat skim coat on rendered blockwork",
    source_reference: "Lagos Master Artisans Guild 2026",
    is_active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "rate-2",
    task_key: "tiling_floor",
    task_label: "Floor Tiling (60x60)",
    unit: "sqm",
    output_per_worker_day: 15,
    description: "Porcelain tile installation with cement bed",
    source_reference: "Abuja Tiling Guild Standards",
    is_active: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(estimationQueries.fetchLabourRates).mockResolvedValue({
    data: mockRatesList,
    error: null,
  } as any);
  window.confirm = vi.fn(() => true);
});

describe("AdminLabourRates Interactive Suite", () => {
  it("renders productivity rates table with active task entries", async () => {
    render(
      <MemoryRouter>
        <AdminLabourRates />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Labour Rates")).toBeInTheDocument();
    expect(await screen.findByText("Wall Screeding & Skimming")).toBeInTheDocument();
    expect(screen.getByText("Floor Tiling (60x60)")).toBeInTheDocument();
    expect(screen.getByText("Lagos Master Artisans Guild 2026")).toBeInTheDocument();
  });

  it("opens modal when clicking Add Rate button", async () => {
    render(
      <MemoryRouter>
        <AdminLabourRates />
      </MemoryRouter>,
    );

    await screen.findByText("Labour Rates");
    const addBtn = screen.getByRole("button", { name: /Add Rate/i });
    fireEvent.click(addBtn);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("deletes a rate after confirmation", async () => {
    vi.mocked(estimationQueries.deleteLabourRate).mockResolvedValue({
      error: null,
    } as any);

    render(
      <MemoryRouter>
        <AdminLabourRates />
      </MemoryRouter>,
    );

    await screen.findByText("Wall Screeding & Skimming");
    const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(estimationQueries.deleteLabourRate).toHaveBeenCalledWith("rate-1");
  });
});
