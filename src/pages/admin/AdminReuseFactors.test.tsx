import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminReuseFactors from "@/pages/admin/AdminReuseFactors";
import * as estimationQueries from "@/lib/estimation/queries";

const mockFactors = [
  {
    id: "rf-1",
    unit: "m2",
    category: "roof_timber_truss",
    category_label: "Roof Timber Truss",
    recovery_rate: 0.75,
    reuse_fraction: 0.5,
    recycle_fraction: 0.25,
    unit_value_naira: 4500,
    description: "Hardwood dimensional timber reclaimed from residential roofs",
    source_reference: "Lagos Demolition Contractors Audit 2026",
    effective_date: "2026-08-01",
    is_active: true,
    sort_order: 1,
  },
  {
    id: "rf-2",
    unit: "kg",
    category: "structural_steel_beams",
    category_label: "Structural Steel Beams",
    recovery_rate: 0.9,
    reuse_fraction: 0.6,
    recycle_fraction: 0.35, // 0.60 + 0.35 <= 1
    unit_value_naira: 850,
    description: "Heavy section universal beams and columns",
    source_reference: "WRAP Reclaimed Steel Protocol v4",
    effective_date: "2026-07-15",
    is_active: false,
    sort_order: 2,
  },
];

vi.mock("@/lib/estimation/queries", () => ({
  fetchMaterialReuseFactors: vi.fn(),
  createMaterialReuseFactor: vi.fn(),
  updateMaterialReuseFactor: vi.fn(),
  deleteMaterialReuseFactor: vi.fn(),
}));

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe("AdminReuseFactors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(estimationQueries.fetchMaterialReuseFactors).mockResolvedValue({
      data: mockFactors as any,
      error: null,
    });
    vi.mocked(estimationQueries.createMaterialReuseFactor).mockResolvedValue({
      data: { id: "new-rf" } as any,
      error: null,
    });
    vi.mocked(estimationQueries.updateMaterialReuseFactor).mockResolvedValue({
      data: {} as any,
      error: null,
    });
    vi.mocked(estimationQueries.deleteMaterialReuseFactor).mockResolvedValue({
      error: null,
    });
  });

  it("renders material reuse factor catalogue with categories, fractions and sources", async () => {
    render(
      <MemoryRouter>
        <AdminReuseFactors />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Material Reuse Factors/i,
    );

    await waitFor(() => {
      expect(screen.getByText("Roof Timber Truss")).toBeInTheDocument();
      expect(screen.getByText("roof_timber_truss")).toBeInTheDocument();
      expect(screen.getByText("0.75")).toBeInTheDocument();
      expect(
        screen.getByText("Lagos Demolition Contractors Audit 2026"),
      ).toBeInTheDocument();
      expect(screen.getByText("Structural Steel Beams")).toBeInTheDocument();
      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });
  });

  it("validates recovery, reuse and recycle fractions and their sum", async () => {
    render(
      <MemoryRouter>
        <AdminReuseFactors />
      </MemoryRouter>,
    );

    await screen.findByText("Roof Timber Truss");
    fireEvent.click(screen.getByRole("button", { name: /Add factor/i }));

    // Modal opens with correct title
    expect(
      screen.getByRole("heading", { name: "Add reuse factor" }),
    ).toBeInTheDocument();

    const createBtn = screen.getByRole("button", { name: "Create factor" });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText(/Category key is required/)).toBeInTheDocument();
    });

    // Fill category, unit, but invalid fractions
    fireEvent.change(screen.getByLabelText(/Category key/i), {
      target: { value: "copper_pipe" },
    });
    fireEvent.change(screen.getByLabelText(/Unit \(e\.g\./i), {
      target: { value: "m" },
    });
    fireEvent.change(screen.getByLabelText(/Recovery rate/i), {
      target: { value: "1.5" },
    });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Recovery rate must be a number between 0 and 1."),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Recovery rate/i), {
      target: { value: "0.8" },
    });
    fireEvent.change(screen.getByLabelText(/Reuse fraction/i), {
      target: { value: "0.7" },
    });
    fireEvent.change(screen.getByLabelText(/Recycle fraction/i), {
      target: { value: "0.5" },
    });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Reuse + recycle fractions cannot sum to more than 1.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("creates a new material reuse factor when inputs are valid", async () => {
    render(
      <MemoryRouter>
        <AdminReuseFactors />
      </MemoryRouter>,
    );

    await screen.findByText("Roof Timber Truss");
    fireEvent.click(screen.getByRole("button", { name: /Add factor/i }));

    fireEvent.change(screen.getByLabelText(/Unit \(e\.g\./i), {
      target: { value: "m2" },
    });
    fireEvent.change(screen.getByLabelText(/Category key/i), {
      target: { value: "ceramic_tiles" },
    });
    fireEvent.change(screen.getByLabelText(/Human label/i), {
      target: { value: "Reclaimed Ceramic Tiles" },
    });
    fireEvent.change(screen.getByLabelText(/Recovery rate/i), {
      target: { value: "0.60" },
    });
    fireEvent.change(screen.getByLabelText(/Reuse fraction/i), {
      target: { value: "0.40" },
    });
    fireEvent.change(screen.getByLabelText(/Recycle fraction/i), {
      target: { value: "0.20" },
    });
    fireEvent.change(screen.getByLabelText(/Reclaimed value/i), {
      target: { value: "1800" },
    });
    fireEvent.change(screen.getByLabelText(/Source reference/i), {
      target: { value: "Tile Reclaim Depot Survey 2026" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create factor" }));

    await waitFor(() => {
      expect(estimationQueries.createMaterialReuseFactor).toHaveBeenCalledWith(
        expect.objectContaining({
          unit: "m2",
          category: "ceramic_tiles",
          category_label: "Reclaimed Ceramic Tiles",
          recovery_rate: 0.6,
          reuse_fraction: 0.4,
          recycle_fraction: 0.2,
          unit_value_naira: 1800,
          source_reference: "Tile Reclaim Depot Survey 2026",
          is_active: true,
        }),
      );
    });
  });

  it("opens edit modal with corrected title and saves updates", async () => {
    render(
      <MemoryRouter>
        <AdminReuseFactors />
      </MemoryRouter>,
    );

    await screen.findByText("Roof Timber Truss");
    const editBtn = screen.getByRole("button", {
      name: "Edit Roof Timber Truss",
    });
    fireEvent.click(editBtn);

    // Verify the modal title is "Edit reuse factor" (and NOT "Edit thermal factor")
    expect(
      screen.getByRole("heading", { name: "Edit reuse factor" }),
    ).toBeInTheDocument();

    const valueInput = screen.getByLabelText(/Reclaimed value/i);
    expect(valueInput).toHaveValue(4500);
    fireEvent.change(valueInput, { target: { value: "5000" } });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(estimationQueries.updateMaterialReuseFactor).toHaveBeenCalledWith(
        "rf-1",
        expect.objectContaining({
          unit_value_naira: 5000,
        }),
      );
    });
  });

  it("deletes a factor upon confirmation", async () => {
    window.confirm = vi.fn().mockReturnValue(true);

    render(
      <MemoryRouter>
        <AdminReuseFactors />
      </MemoryRouter>,
    );

    await screen.findByText("Roof Timber Truss");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete Roof Timber Truss",
    });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(estimationQueries.deleteMaterialReuseFactor).toHaveBeenCalledWith(
        "rf-1",
      );
    });
  });
});
