import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminRegionalCostIndices from "@/pages/admin/AdminRegionalCostIndices";
import * as estimationQueries from "@/lib/estimation/queries";

const mockIndices = [
  {
    id: "idx-1",
    country: "NG",
    state: "Lagos",
    category: "general",
    cost_factor: 1.15,
    description: "Port congestion and elevated logistics costs",
    source_reference: "Q3 2026 Master Builders Lagos Survey",
    effective_date: "2026-09-01",
    is_active: true,
    sort_order: 1,
  },
  {
    id: "idx-2",
    country: "NG",
    state: "Kano",
    category: "labour",
    cost_factor: 0.88,
    description: "Regional artisan wage rate baseline",
    source_reference: "Kano Trades Union Gazette 2026",
    effective_date: "2026-08-15",
    is_active: false,
    sort_order: 2,
  },
];

vi.mock("@/lib/estimation/queries", () => ({
  fetchRegionalCostIndices: vi.fn(),
  createRegionalCostIndex: vi.fn(),
  updateRegionalCostIndex: vi.fn(),
  deleteRegionalCostIndex: vi.fn(),
}));

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe("AdminRegionalCostIndices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(estimationQueries.fetchRegionalCostIndices).mockResolvedValue({
      data: mockIndices as any,
      error: null,
    });
    vi.mocked(estimationQueries.createRegionalCostIndex).mockResolvedValue({
      data: { id: "new-idx" } as any,
      error: null,
    });
    vi.mocked(estimationQueries.updateRegionalCostIndex).mockResolvedValue({
      data: {} as any,
      error: null,
    });
    vi.mocked(estimationQueries.deleteRegionalCostIndex).mockResolvedValue({
      error: null,
    });
  });

  it("renders regional cost index entries with factors, sources and status", async () => {
    render(
      <MemoryRouter>
        <AdminRegionalCostIndices />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Regional Cost Indices/i,
    );

    await waitFor(() => {
      expect(screen.getByText(/NG \/ Lagos/)).toBeInTheDocument();
      expect(screen.getByText("1.15")).toBeInTheDocument();
      expect(
        screen.getByText("Q3 2026 Master Builders Lagos Survey"),
      ).toBeInTheDocument();
      expect(screen.getByText(/NG \/ Kano/)).toBeInTheDocument();
      expect(screen.getByText("0.88")).toBeInTheDocument();
    });
  });

  it("validates form fields preventing non-positive factor or empty source reference", async () => {
    render(
      <MemoryRouter>
        <AdminRegionalCostIndices />
      </MemoryRouter>,
    );

    await screen.findByText(/NG \/ Lagos/);
    const addBtn = screen.getByRole("button", { name: /Add Index/i });
    fireEvent.click(addBtn);

    const saveBtn = screen.getByRole("button", { name: /^Save$/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText("State is required.")).toBeInTheDocument();
    });

    // Fill state, but invalid factor
    const stateSelect = screen.getByLabelText(/State \/ Region \*/i);
    fireEvent.change(stateSelect, { target: { value: "Ogun" } });
    const factorInput = screen.getByLabelText(/Cost factor \*/i);
    fireEvent.change(factorInput, { target: { value: "-0.5" } });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Cost factor must be a positive number/),
      ).toBeInTheDocument();
    });

    // Valid factor, but empty source reference
    fireEvent.change(factorInput, { target: { value: "1.05" } });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Source reference is required/),
      ).toBeInTheDocument();
    });
  });

  it("detects and rejects duplicate active index for the same state and category", async () => {
    render(
      <MemoryRouter>
        <AdminRegionalCostIndices />
      </MemoryRouter>,
    );

    await screen.findByText(/NG \/ Lagos/);
    fireEvent.click(screen.getByRole("button", { name: /Add Index/i }));

    const stateSelect = screen.getByLabelText(/State \/ Region \*/i);
    fireEvent.change(stateSelect, { target: { value: "Lagos" } });
    const factorInput = screen.getByLabelText(/Cost factor \*/i);
    fireEvent.change(factorInput, { target: { value: "1.20" } });
    const sourceInput = screen.getByLabelText(/Source reference \*/i);
    fireEvent.change(sourceInput, { target: { value: "Another survey" } });

    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          /An active general index already exists for NG\/Lagos/,
        ),
      ).toBeInTheDocument();
      expect(estimationQueries.createRegionalCostIndex).not.toHaveBeenCalled();
    });
  });

  it("creates a new regional index when valid", async () => {
    render(
      <MemoryRouter>
        <AdminRegionalCostIndices />
      </MemoryRouter>,
    );

    await screen.findByText(/NG \/ Lagos/);
    fireEvent.click(screen.getByRole("button", { name: /Add Index/i }));

    fireEvent.change(screen.getByLabelText(/State \/ Region \*/i), {
      target: { value: "Rivers" },
    });
    fireEvent.change(screen.getByLabelText(/Cost factor \*/i), {
      target: { value: "1.10" },
    });
    fireEvent.change(screen.getByLabelText(/Source reference \*/i), {
      target: { value: "Rivers Builders Association 2026" },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "Coastal transport markup" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => {
      expect(estimationQueries.createRegionalCostIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          country: "NG",
          state: "Rivers",
          category: "general",
          cost_factor: 1.1,
          source_reference: "Rivers Builders Association 2026",
          is_active: true,
        }),
      );
    });
  });

  it("toggles active state of an index", async () => {
    render(
      <MemoryRouter>
        <AdminRegionalCostIndices />
      </MemoryRouter>,
    );

    await screen.findByText(/NG \/ Lagos/);
    const toggleBtn = screen.getByRole("switch", {
      name: "Active: Lagos general",
    });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(estimationQueries.updateRegionalCostIndex).toHaveBeenCalledWith(
        "idx-1",
        { is_active: false },
      );
    });
  });

  it("deletes an index when confirmed", async () => {
    window.confirm = vi.fn().mockReturnValue(true);

    render(
      <MemoryRouter>
        <AdminRegionalCostIndices />
      </MemoryRouter>,
    );

    await screen.findByText(/NG \/ Lagos/);
    const deleteBtn = screen.getByRole("button", { name: "Delete Lagos" });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(estimationQueries.deleteRegionalCostIndex).toHaveBeenCalledWith(
        "idx-1",
      );
    });
  });
});
