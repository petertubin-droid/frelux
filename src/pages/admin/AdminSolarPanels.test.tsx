import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminSolarPanels from "@/pages/admin/AdminSolarPanels";
import * as estimationQueries from "@/lib/estimation/queries";

const mockModels = [
  {
    id: "sp-1",
    model_name: "Jinko Tiger Pro 545W Mono-Facial",
    watt_peak: 545,
    length_m: 2.274,
    width_m: 1.134,
    unit_price_naira: 145000,
    description: "MBB HC Monocrystalline solar PV module",
    source_reference: "Jinko Solar JKM535-555M-72HL4-(V) Datasheet",
    effective_date: "2026-04-01",
    is_active: true,
    sort_order: 1,
  },
  {
    id: "sp-2",
    model_name: "Canadian Solar HiKu6 450W",
    watt_peak: 450,
    length_m: 1.903,
    width_m: 1.134,
    unit_price_naira: null, // Unpriced
    description: "High power bifacial dual cell module",
    source_reference: "Canadian Solar CS6L-MS Technical Datasheet",
    effective_date: "2026-03-15",
    is_active: false,
    sort_order: 2,
  },
];

vi.mock("@/lib/estimation/queries", () => ({
  fetchSolarPanelModels: vi.fn(),
  createSolarPanelModel: vi.fn(),
  updateSolarPanelModel: vi.fn(),
  deleteSolarPanelModel: vi.fn(),
}));

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe("AdminSolarPanels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(estimationQueries.fetchSolarPanelModels).mockResolvedValue({
      data: mockModels as any,
      error: null,
    });
    vi.mocked(estimationQueries.createSolarPanelModel).mockResolvedValue({
      data: { id: "new-sp" } as any,
      error: null,
    });
    vi.mocked(estimationQueries.updateSolarPanelModel).mockResolvedValue({
      data: {} as any,
      error: null,
    });
    vi.mocked(estimationQueries.deleteSolarPanelModel).mockResolvedValue({
      error: null,
    });
  });

  it("renders solar panel models list with wattage, dimensions, prices, and references", async () => {
    render(
      <MemoryRouter>
        <AdminSolarPanels />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Solar Panel Models/i,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Jinko Tiger Pro 545W Mono-Facial"),
      ).toBeInTheDocument();
      expect(screen.getByText("545")).toBeInTheDocument();
      expect(screen.getByText("2.274")).toBeInTheDocument();
      expect(screen.getByText("145000")).toBeInTheDocument();
      expect(
        screen.getByText("Jinko Solar JKM535-555M-72HL4-(V) Datasheet"),
      ).toBeInTheDocument();
      expect(screen.getByText("Canadian Solar HiKu6 450W")).toBeInTheDocument();
      expect(screen.getByText("N/A")).toBeInTheDocument(); // Unpriced model shows N/A honestly
    });
  });

  it("validates model name, positive watt peak, positive dimensions, and datasheet reference", async () => {
    render(
      <MemoryRouter>
        <AdminSolarPanels />
      </MemoryRouter>,
    );

    await screen.findByText("Jinko Tiger Pro 545W Mono-Facial");
    fireEvent.click(screen.getByRole("button", { name: /Add model/i }));

    const createBtn = screen.getByRole("button", { name: "Create model" });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText("Model name is required.")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Model name"), {
      target: { value: "JA Solar 500W" },
    });
    fireEvent.change(screen.getByLabelText(/Watt peak/i), {
      target: { value: "-5" },
    });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Watt peak must be a positive number (from the datasheet).",
        ),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Watt peak/i), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByLabelText("Length (m)"), {
      target: { value: "-1" },
    });
    fireEvent.change(screen.getByLabelText("Width (m)"), {
      target: { value: "1.1" },
    });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Panel length and width must be positive numbers in metres (from the datasheet).",
        ),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Length (m)"), {
      target: { value: "2.1" },
    });
    fireEvent.change(screen.getByLabelText(/Price per panel/i), {
      target: { value: "-100" },
    });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Panel price must be zero or a positive number (or left blank if unknown).",
        ),
      ).toBeInTheDocument();
    });
  });

  it("creates a new solar panel model when inputs are valid", async () => {
    render(
      <MemoryRouter>
        <AdminSolarPanels />
      </MemoryRouter>,
    );

    await screen.findByText("Jinko Tiger Pro 545W Mono-Facial");
    fireEvent.click(screen.getByRole("button", { name: /Add model/i }));

    fireEvent.change(screen.getByLabelText("Model name"), {
      target: { value: "Longi Hi-MO 6 Explorer 570W" },
    });
    fireEvent.change(screen.getByLabelText(/Watt peak/i), {
      target: { value: "570" },
    });
    fireEvent.change(screen.getByLabelText("Length (m)"), {
      target: { value: "2.278" },
    });
    fireEvent.change(screen.getByLabelText("Width (m)"), {
      target: { value: "1.134" },
    });
    fireEvent.change(screen.getByLabelText(/Price per panel/i), {
      target: { value: "165000" },
    });
    fireEvent.change(screen.getByLabelText(/Datasheet reference/i), {
      target: { value: "Longi LR5-72HTH-570M Specs" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create model" }));

    await waitFor(() => {
      expect(estimationQueries.createSolarPanelModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model_name: "Longi Hi-MO 6 Explorer 570W",
          watt_peak: 570,
          length_m: 2.278,
          width_m: 1.134,
          unit_price_naira: 165000,
          source_reference: "Longi LR5-72HTH-570M Specs",
          is_active: true,
        }),
      );
    });
  });

  it("opens edit modal and saves changes to an existing solar panel model", async () => {
    render(
      <MemoryRouter>
        <AdminSolarPanels />
      </MemoryRouter>,
    );

    await screen.findByText("Jinko Tiger Pro 545W Mono-Facial");
    const editBtn = screen.getByRole("button", {
      name: "Edit Jinko Tiger Pro 545W Mono-Facial",
    });
    fireEvent.click(editBtn);

    expect(
      screen.getByRole("heading", { name: "Edit panel model" }),
    ).toBeInTheDocument();

    const priceInput = screen.getByLabelText(/Price per panel/i);
    expect(priceInput).toHaveValue(145000);
    fireEvent.change(priceInput, { target: { value: "152000" } });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(estimationQueries.updateSolarPanelModel).toHaveBeenCalledWith(
        "sp-1",
        expect.objectContaining({
          unit_price_naira: 152000,
        }),
      );
    });
  });

  it("deletes a solar panel model upon user confirmation", async () => {
    window.confirm = vi.fn().mockReturnValue(true);

    render(
      <MemoryRouter>
        <AdminSolarPanels />
      </MemoryRouter>,
    );

    await screen.findByText("Jinko Tiger Pro 545W Mono-Facial");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete Jinko Tiger Pro 545W Mono-Facial",
    });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(estimationQueries.deleteSolarPanelModel).toHaveBeenCalledWith(
        "sp-1",
      );
    });
  });
});
