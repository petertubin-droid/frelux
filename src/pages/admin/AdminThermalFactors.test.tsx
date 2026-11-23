import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminThermalFactors from "@/pages/admin/AdminThermalFactors";
import * as estimationQueries from "@/lib/estimation/queries";

const mockFactors = [
  {
    id: "tf-1",
    surface_type: "roof" as const,
    category: "white_elastomeric_coating",
    category_label: "White Elastomeric Coating",
    solar_reflectance: 0.82,
    description: "High albedo cool roof acrylic polymer coating",
    source_reference: "CRRC Product ID 0670-0012 Test Report",
    effective_date: "2026-06-01",
    is_active: true,
    sort_order: 1,
  },
  {
    id: "tf-2",
    surface_type: "wall" as const,
    category: "dark_brick_finish",
    category_label: "Dark Burnt Brick",
    solar_reflectance: 0.25,
    description: "Dense clay burnt masonry exterior veneer",
    source_reference: "ASHRAE Standard 90.1 Envelope Library",
    effective_date: "2026-05-10",
    is_active: false,
    sort_order: 2,
  },
];

vi.mock("@/lib/estimation/queries", () => ({
  fetchThermalFinishFactors: vi.fn(),
  createThermalFinishFactor: vi.fn(),
  updateThermalFinishFactor: vi.fn(),
  deleteThermalFinishFactor: vi.fn(),
}));

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe("AdminThermalFactors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(estimationQueries.fetchThermalFinishFactors).mockResolvedValue({
      data: mockFactors as any,
      error: null,
    });
    vi.mocked(estimationQueries.createThermalFinishFactor).mockResolvedValue({
      error: null,
    });
    vi.mocked(estimationQueries.updateThermalFinishFactor).mockResolvedValue({
      error: null,
    });
    vi.mocked(estimationQueries.deleteThermalFinishFactor).mockResolvedValue({
      error: null,
    });
  });

  it("renders thermal finish factor catalogue with albedo and source citations", async () => {
    render(
      <MemoryRouter>
        <AdminThermalFactors />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Thermal Finish Factors/i,
    );

    await waitFor(() => {
      expect(screen.getByText("White Elastomeric Coating")).toBeInTheDocument();
      expect(screen.getByText("white_elastomeric_coating")).toBeInTheDocument();
      expect(screen.getByText("0.82")).toBeInTheDocument();
      expect(
        screen.getByText("CRRC Product ID 0670-0012 Test Report"),
      ).toBeInTheDocument();
      expect(screen.getByText("Dark Burnt Brick")).toBeInTheDocument();
      expect(screen.getByText("0.25")).toBeInTheDocument();
      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });
  });

  it("validates category key, albedo range (0-1), and required source reference", async () => {
    render(
      <MemoryRouter>
        <AdminThermalFactors />
      </MemoryRouter>,
    );

    await screen.findByText("White Elastomeric Coating");
    fireEvent.click(screen.getByRole("button", { name: /Add factor/i }));

    const createBtn = screen.getByRole("button", { name: "Create factor" });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText(/Category key is required/)).toBeInTheDocument();
    });

    // Valid category, but invalid albedo (> 1)
    fireEvent.change(screen.getByLabelText(/Category key/i), {
      target: { value: "dark_tiles" },
    });
    fireEvent.change(screen.getByLabelText(/Solar reflectance/i), {
      target: { value: "1.45" },
    });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Solar reflectance (albedo) must be a number between 0 and 1.",
        ),
      ).toBeInTheDocument();
    });

    // Valid albedo, but empty source reference
    fireEvent.change(screen.getByLabelText(/Solar reflectance/i), {
      target: { value: "0.40" },
    });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Source reference is required/),
      ).toBeInTheDocument();
    });
  });

  it("creates a new thermal finish factor when inputs are valid", async () => {
    render(
      <MemoryRouter>
        <AdminThermalFactors />
      </MemoryRouter>,
    );

    await screen.findByText("White Elastomeric Coating");
    fireEvent.click(screen.getByRole("button", { name: /Add factor/i }));

    fireEvent.change(screen.getByLabelText("Surface type"), {
      target: { value: "roof" },
    });
    fireEvent.change(screen.getByLabelText(/Category key/i), {
      target: { value: "corrugated_aluminium" },
    });
    fireEvent.change(screen.getByLabelText(/Human label/i), {
      target: { value: "Bright Corrugated Aluminium" },
    });
    fireEvent.change(screen.getByLabelText(/Solar reflectance/i), {
      target: { value: "0.65" },
    });
    fireEvent.change(screen.getByLabelText(/Source reference/i), {
      target: { value: "ASTM E1918 Spectrophotometer Test" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create factor" }));

    await waitFor(() => {
      expect(estimationQueries.createThermalFinishFactor).toHaveBeenCalledWith(
        expect.objectContaining({
          surface_type: "roof",
          category: "corrugated_aluminium",
          category_label: "Bright Corrugated Aluminium",
          solar_reflectance: 0.65,
          source_reference: "ASTM E1918 Spectrophotometer Test",
          is_active: true,
        }),
      );
    });
  });

  it("opens edit modal and updates an existing thermal factor", async () => {
    render(
      <MemoryRouter>
        <AdminThermalFactors />
      </MemoryRouter>,
    );

    await screen.findByText("White Elastomeric Coating");
    const editBtn = screen.getByRole("button", {
      name: "Edit White Elastomeric Coating (roof)",
    });
    fireEvent.click(editBtn);

    expect(
      screen.getByRole("heading", { name: "Edit thermal factor" }),
    ).toBeInTheDocument();

    const albedoInput = screen.getByLabelText(/Solar reflectance/i);
    expect(albedoInput).toHaveValue(0.82);
    fireEvent.change(albedoInput, { target: { value: "0.85" } });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(estimationQueries.updateThermalFinishFactor).toHaveBeenCalledWith(
        "tf-1",
        expect.objectContaining({
          solar_reflectance: 0.85,
        }),
      );
    });
  });

  it("deletes a thermal factor upon user confirmation", async () => {
    window.confirm = vi.fn().mockReturnValue(true);

    render(
      <MemoryRouter>
        <AdminThermalFactors />
      </MemoryRouter>,
    );

    await screen.findByText("White Elastomeric Coating");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete White Elastomeric Coating (roof)",
    });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(estimationQueries.deleteThermalFinishFactor).toHaveBeenCalledWith(
        "tf-1",
      );
    });
  });
});
