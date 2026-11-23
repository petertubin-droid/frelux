import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminSolarPrices from "@/pages/admin/AdminSolarPrices";
import * as estimationQueries from "@/lib/estimation/queries";

const mockPrices = [
  {
    id: "scp-1",
    component_key: "mounting_rail_per_m",
    component_label: "Aluminium Mounting Rail (per metre)",
    unit: "m",
    price_naira: 6500,
    description: "Anodised extruded aluminium solar mounting profile",
    source_reference: "SunPower Systems Trade Quote SQ-2026-44",
    effective_date: "2026-05-01",
    is_active: true,
    sort_order: 1,
  },
  {
    id: "scp-2",
    component_key: "mc4_connector_pair",
    component_label: "MC4 Connector Pair",
    unit: "pair",
    price_naira: 1200,
    description: "IP68 waterproof solar cable connector male/female",
    source_reference: "Lagos Electrical Wholesale Price List 2026",
    effective_date: "2026-04-10",
    is_active: false,
    sort_order: 2,
  },
];

vi.mock("@/lib/estimation/queries", () => ({
  fetchSolarComponentPrices: vi.fn(),
  createSolarComponentPrice: vi.fn(),
  updateSolarComponentPrice: vi.fn(),
  deleteSolarComponentPrice: vi.fn(),
}));

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe("AdminSolarPrices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(estimationQueries.fetchSolarComponentPrices).mockResolvedValue({
      data: mockPrices as any,
      error: null,
    });
    vi.mocked(estimationQueries.createSolarComponentPrice).mockResolvedValue({
      data: { id: "new-scp" } as any,
      error: null,
    });
    vi.mocked(estimationQueries.updateSolarComponentPrice).mockResolvedValue({
      data: {} as any,
      error: null,
    });
    vi.mocked(estimationQueries.deleteSolarComponentPrice).mockResolvedValue({
      error: null,
    });
  });

  it("renders solar component prices with keys, units, and supplier citations", async () => {
    render(
      <MemoryRouter>
        <AdminSolarPrices />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Solar Component Prices/i,
    );

    await waitFor(() => {
      expect(screen.getByText("mounting_rail_per_m")).toBeInTheDocument();
      expect(
        screen.getByText("Aluminium Mounting Rail (per metre)"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("SunPower Systems Trade Quote SQ-2026-44"),
      ).toBeInTheDocument();
      expect(screen.getByText("mc4_connector_pair")).toBeInTheDocument();
      expect(screen.getByText("MC4 Connector Pair")).toBeInTheDocument();
    });
  });

  it("validates recognised component key against engine supported keys", async () => {
    render(
      <MemoryRouter>
        <AdminSolarPrices />
      </MemoryRouter>,
    );

    await screen.findByText("mounting_rail_per_m");
    fireEvent.click(screen.getByRole("button", { name: /Add price/i }));

    const createBtn = screen.getByRole("button", { name: "Create price" });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Component key is required."),
      ).toBeInTheDocument();
    });

    const keyInput = screen.getByLabelText("Component key");
    fireEvent.change(keyInput, { target: { value: "unrecognised_gizmo" } });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Unknown component key 'unrecognised_gizmo'/),
      ).toBeInTheDocument();
    });
  });

  it("validates required unit, non-negative price, and required source reference", async () => {
    render(
      <MemoryRouter>
        <AdminSolarPrices />
      </MemoryRouter>,
    );

    await screen.findByText("mounting_rail_per_m");
    fireEvent.click(screen.getByRole("button", { name: /Add price/i }));

    const keyInput = screen.getByLabelText("Component key");
    fireEvent.change(keyInput, { target: { value: "dc_breaker" } });

    const createBtn = screen.getByRole("button", { name: "Create price" });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Unit is required (e.g. m, unit, pair, kW)."),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Unit \(e\.g\./i), {
      target: { value: "unit" },
    });
    fireEvent.change(screen.getByLabelText(/Base Price/i), {
      target: { value: "-500" },
    });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Price must be zero or a positive number (NGN)."),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Base Price/i), {
      target: { value: "8500" },
    });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Source reference is required (supplier quote)."),
      ).toBeInTheDocument();
    });
  });

  it("creates a new component price when inputs are valid", async () => {
    render(
      <MemoryRouter>
        <AdminSolarPrices />
      </MemoryRouter>,
    );

    await screen.findByText("mounting_rail_per_m");
    fireEvent.click(screen.getByRole("button", { name: /Add price/i }));

    fireEvent.change(screen.getByLabelText("Component key"), {
      target: { value: "surge_protector" },
    });
    fireEvent.change(screen.getByLabelText(/Human label/i), {
      target: { value: "DC Type 2 Surge Protection Device" },
    });
    fireEvent.change(screen.getByLabelText(/Unit \(e\.g\./i), {
      target: { value: "unit" },
    });
    fireEvent.change(screen.getByLabelText(/Base Price/i), {
      target: { value: "18500" },
    });
    fireEvent.change(screen.getByLabelText(/Supplier quote reference/i), {
      target: { value: "Schneider Electric Distributor Quote" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create price" }));

    await waitFor(() => {
      expect(estimationQueries.createSolarComponentPrice).toHaveBeenCalledWith(
        expect.objectContaining({
          component_key: "surge_protector",
          component_label: "DC Type 2 Surge Protection Device",
          unit: "unit",
          price_naira: 18500,
          source_reference: "Schneider Electric Distributor Quote",
          is_active: true,
        }),
      );
    });
  });

  it("opens edit modal and saves price updates", async () => {
    render(
      <MemoryRouter>
        <AdminSolarPrices />
      </MemoryRouter>,
    );

    await screen.findByText("mounting_rail_per_m");
    const editBtn = screen.getByRole("button", {
      name: "Edit Aluminium Mounting Rail (per metre)",
    });
    fireEvent.click(editBtn);

    expect(
      screen.getByRole("heading", { name: "Edit component price" }),
    ).toBeInTheDocument();

    const priceInput = screen.getByLabelText(/Base Price/i);
    expect(priceInput).toHaveValue(6500);
    fireEvent.change(priceInput, { target: { value: "7200" } });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(estimationQueries.updateSolarComponentPrice).toHaveBeenCalledWith(
        "scp-1",
        expect.objectContaining({
          price_naira: 7200,
        }),
      );
    });
  });

  it("deletes a solar component price upon confirmation", async () => {
    window.confirm = vi.fn().mockReturnValue(true);

    render(
      <MemoryRouter>
        <AdminSolarPrices />
      </MemoryRouter>,
    );

    await screen.findByText("mounting_rail_per_m");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete Aluminium Mounting Rail (per metre)",
    });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(estimationQueries.deleteSolarComponentPrice).toHaveBeenCalledWith(
        "scp-1",
      );
    });
  });
});
