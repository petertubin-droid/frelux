/**
 * Maintenance Planner page tests (Future Engine 1)
 *
 * The deterministic math is covered by maintenance-engine.test.ts.
 * These tests pin the page wiring: loading profiles from the loader,
 * refusing without configuration, and rendering the hand-verified
 * schedule end-to-end.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MaintenancePlanner from "./MaintenancePlanner";

const mockProfiles = [
  {
    id: "mp-1",
    finish_category: "paint",
    surface_type: "exterior",
    service_life_min_years: 8,
    service_life_max_years: 12,
    maintenance_interval_min_years: 4,
    maintenance_interval_max_years: 6,
    inspection_interval_years: 1,
    maintenance_cost_factor: 0.35,
    replacement_cost_factor: 1.0,
    description: "Exterior emulsion, coastal",
    source_reference: "Manufacturer datasheet X-2026",
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
];

vi.mock("@/lib/estimation/queries", async () => {
  const actual = await vi.importActual("@/lib/estimation/queries");
  return {
    ...actual,
    fetchMaintenanceProfiles: vi.fn(),
    saveMaintenancePlan: vi.fn(),
  };
});

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/achievements", () => ({ trackCalculation: vi.fn() }));
vi.mock("@/lib/smart-defaults", () => ({ trackRecentTool: vi.fn() }));
vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
  useBreadcrumbJsonLd: vi.fn(() => null),
}));

import {
  fetchMaintenanceProfiles,
  saveMaintenancePlan,
} from "@/lib/estimation/queries";
const mockedFetch = vi.mocked(fetchMaintenanceProfiles);
const mockedSave = vi.mocked(saveMaintenancePlan);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/finishing-calculator?mode=maintenance"]}>
      <MaintenancePlanner />
    </MemoryRouter>,
  );
}

vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));
beforeEach(() => {
  vi.clearAllMocks();
  mockedSave.mockResolvedValue({ data: null, error: null });
});

describe("MaintenancePlanner", () => {
  it("shows the data-requirement message when nothing is configured", async () => {
    mockedFetch.mockResolvedValue({ data: [], error: null });
    renderPage();
    expect(
      await screen.findByText(/No maintenance profiles configured yet/i),
    ).toBeInTheDocument();
    expect(mockedFetch).toHaveBeenCalled();
  });

  it("renders the hand-verified schedule from a configured profile", async () => {
    mockedFetch.mockResolvedValue({ data: mockProfiles, error: null });
    renderPage();

    const categorySelect = await screen.findByLabelText(/Finish category/i);
    fireEvent.change(categorySelect, { target: { value: "paint" } });
    fireEvent.change(screen.getByLabelText(/Surface type/i), {
      target: { value: "exterior" },
    });
    fireEvent.change(screen.getByLabelText(/Installed cost/i), {
      target: { value: "100000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Plan Maintenance/i }));

    // Milestones: year 3 → ₦0, year 5 → ₦35,000, year 10 → ₦170,000
    await waitFor(() => {
      expect(screen.getByText("YEAR 3")).toBeInTheDocument();
    });
    expect(screen.getAllByText("₦35,000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("₦170,000")).toBeInTheDocument();
    // Full redecoration event with its range preserved (schedule row + breakdown step)
    expect(screen.getAllByText(/years 8–12/).length).toBeGreaterThanOrEqual(1);
    // First maintenance cycle cost = 35% of 100,000
    expect(screen.getAllByText(/₦35,000/).length).toBeGreaterThanOrEqual(2);
  });

  it("shows the timing-only warning without an installed cost", async () => {
    mockedFetch.mockResolvedValue({ data: mockProfiles, error: null });
    renderPage();

    const categorySelect = await screen.findByLabelText(/Finish category/i);
    fireEvent.change(categorySelect, { target: { value: "paint" } });
    fireEvent.change(screen.getByLabelText(/Surface type/i), {
      target: { value: "exterior" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Plan Maintenance/i }));

    await waitFor(() => {
      expect(screen.getByText(/No initial cost provided/i)).toBeInTheDocument();
    });
  });

  it("saves the plan with its configuration snapshot", async () => {
    mockedFetch.mockResolvedValue({ data: mockProfiles, error: null });
    renderPage();

    const categorySelect = await screen.findByLabelText(/Finish category/i);
    fireEvent.change(categorySelect, { target: { value: "paint" } });
    fireEvent.change(screen.getByLabelText(/Surface type/i), {
      target: { value: "exterior" },
    });
    fireEvent.change(screen.getByLabelText(/Installed cost/i), {
      target: { value: "100000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Plan Maintenance/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Export PDF/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Plan/i }));
    await waitFor(() => {
      expect(mockedSave).toHaveBeenCalledTimes(1);
    });
    const payload = mockedSave.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.estimate_ref).toMatch(/^MNT-/);
    expect(payload.finish_category).toBe("paint");
    expect(payload.profile_snapshot).toMatchObject({ id: "mp-1" });
    expect((payload.schedule as Record<string, unknown>).events).toHaveLength(
      13,
    );
  });
});
