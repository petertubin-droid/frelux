import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminMaintenanceProfiles from "@/pages/admin/AdminMaintenanceProfiles";
import * as estimationQueries from "@/lib/estimation/queries";

const mockProfiles = [
  {
    id: "mp-1",
    finish_category: "exterior_acrylic_emulsion",
    surface_type: "exterior",
    service_life_min_years: 5,
    service_life_max_years: 8,
    maintenance_interval_min_years: 2,
    maintenance_interval_max_years: 4,
    inspection_interval_years: 1,
    maintenance_cost_factor: 0.3,
    replacement_cost_factor: 1.0,
    description: "Tropical exterior weather-guard paint coating",
    source_reference: "Dulux Trade Tropical Specification Guide 2026",
    is_active: true,
    sort_order: 1,
  },
  {
    id: "mp-2",
    finish_category: "vitrified_floor_tiles",
    surface_type: "floor",
    service_life_min_years: 20,
    service_life_max_years: 30,
    maintenance_interval_min_years: null,
    maintenance_interval_max_years: null,
    inspection_interval_years: 5,
    maintenance_cost_factor: 0.1,
    replacement_cost_factor: 1.0,
    description: "Full body porcelain floor tile in commercial spaces",
    source_reference: "Tile Council of North America Handbook 2026",
    is_active: false,
    sort_order: 2,
  },
];

vi.mock("@/lib/estimation/queries", () => ({
  fetchMaintenanceProfiles: vi.fn(),
  createMaintenanceProfile: vi.fn(),
  updateMaintenanceProfile: vi.fn(),
  deleteMaintenanceProfile: vi.fn(),
}));

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe("AdminMaintenanceProfiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(estimationQueries.fetchMaintenanceProfiles).mockResolvedValue({
      data: mockProfiles as any,
      error: null,
    });
    vi.mocked(estimationQueries.createMaintenanceProfile).mockResolvedValue({
      data: { id: "new-mp" } as any,
      error: null,
    });
    vi.mocked(estimationQueries.updateMaintenanceProfile).mockResolvedValue({
      data: {} as any,
      error: null,
    });
    vi.mocked(estimationQueries.deleteMaintenanceProfile).mockResolvedValue({
      error: null,
    });
  });

  it("renders maintenance profiles with service life, intervals and sources", async () => {
    render(
      <MemoryRouter>
        <AdminMaintenanceProfiles />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Maintenance Profiles/i,
    );

    await waitFor(() => {
      expect(screen.getByText("exterior_acrylic_emulsion")).toBeInTheDocument();
      expect(screen.getByText("5–8 yrs")).toBeInTheDocument();
      expect(screen.getByText("2–4 yrs")).toBeInTheDocument();
      expect(
        screen.getByText("Dulux Trade Tropical Specification Guide 2026"),
      ).toBeInTheDocument();
      expect(screen.getByText("vitrified_floor_tiles")).toBeInTheDocument();
      expect(screen.getByText("20–30 yrs")).toBeInTheDocument();
    });
  });

  it("validates service life ranges and maintenance interval bounds", async () => {
    render(
      <MemoryRouter>
        <AdminMaintenanceProfiles />
      </MemoryRouter>,
    );

    await screen.findByText("exterior_acrylic_emulsion");
    fireEvent.click(screen.getByRole("button", { name: /Add Profile/i }));

    const createBtn = screen.getByRole("button", { name: "Create profile" });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Finish category is required."),
      ).toBeInTheDocument();
    });

    // Provide invalid service life min > max
    fireEvent.change(screen.getByLabelText(/Finish category \*/i), {
      target: { value: "epoxy_screed" },
    });
    fireEvent.change(screen.getByLabelText(/Service life: min/i), {
      target: { value: "15" },
    });
    fireEvent.change(screen.getByLabelText(/Service life: max/i), {
      target: { value: "10" },
    });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Service life min must not exceed max."),
      ).toBeInTheDocument();
    });

    // Maintenance interval max larger than service life min
    fireEvent.change(screen.getByLabelText(/Service life: min/i), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByLabelText(/Service life: max/i), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByLabelText(/Maintenance interval: min/i), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText(/Maintenance interval: max/i), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText(/Maintenance cost factor/i), {
      target: { value: "0.2" },
    });
    fireEvent.change(screen.getByLabelText(/Source reference \*/i), {
      target: { value: "Test Source" },
    });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/must fit inside the service life/),
      ).toBeInTheDocument();
    });
  });

  it("creates a new maintenance profile when fields are valid", async () => {
    render(
      <MemoryRouter>
        <AdminMaintenanceProfiles />
      </MemoryRouter>,
    );

    await screen.findByText("exterior_acrylic_emulsion");
    fireEvent.click(screen.getByRole("button", { name: /Add Profile/i }));

    fireEvent.change(screen.getByLabelText(/Finish category \*/i), {
      target: { value: "pop_ceiling_boards" },
    });
    fireEvent.change(screen.getByLabelText(/Surface type \*/i), {
      target: { value: "ceiling" },
    });
    fireEvent.change(screen.getByLabelText(/Service life: min/i), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText(/Service life: max/i), {
      target: { value: "15" },
    });
    fireEvent.change(screen.getByLabelText(/Maintenance interval: min/i), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText(/Maintenance interval: max/i), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText(/Inspection interval/i), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText(/Maintenance cost factor/i), {
      target: { value: "0.15" },
    });
    fireEvent.change(screen.getByLabelText(/Replacement cost factor/i), {
      target: { value: "1.0" },
    });
    fireEvent.change(screen.getByLabelText(/Source reference \*/i), {
      target: { value: "Gypsum Association GA-216 Standards" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create profile" }));

    await waitFor(() => {
      expect(estimationQueries.createMaintenanceProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          finish_category: "pop_ceiling_boards",
          surface_type: "ceiling",
          service_life_min_years: 10,
          service_life_max_years: 15,
          maintenance_interval_min_years: 3,
          maintenance_interval_max_years: 5,
          maintenance_cost_factor: 0.15,
          source_reference: "Gypsum Association GA-216 Standards",
          is_active: true,
        }),
      );
    });
  });

  it("opens edit modal and saves profile updates", async () => {
    render(
      <MemoryRouter>
        <AdminMaintenanceProfiles />
      </MemoryRouter>,
    );

    await screen.findByText("exterior_acrylic_emulsion");
    const editBtn = screen.getByRole("button", {
      name: "Edit exterior_acrylic_emulsion profile",
    });
    fireEvent.click(editBtn);

    expect(
      screen.getByRole("heading", { name: "Edit maintenance profile" }),
    ).toBeInTheDocument();

    const costInput = screen.getByLabelText(/Maintenance cost factor/i);
    fireEvent.change(costInput, { target: { value: "0.35" } });

    fireEvent.click(screen.getByRole("button", { name: "Update profile" }));

    await waitFor(() => {
      expect(estimationQueries.updateMaintenanceProfile).toHaveBeenCalledWith(
        "mp-1",
        expect.objectContaining({
          maintenance_cost_factor: 0.35,
        }),
      );
    });
  });

  it("deletes a maintenance profile upon confirmation", async () => {
    window.confirm = vi.fn().mockReturnValue(true);

    render(
      <MemoryRouter>
        <AdminMaintenanceProfiles />
      </MemoryRouter>,
    );

    await screen.findByText("exterior_acrylic_emulsion");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete exterior_acrylic_emulsion profile",
    });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(estimationQueries.deleteMaintenanceProfile).toHaveBeenCalledWith(
        "mp-1",
      );
    });
  });
});
