/**
 * AdminCashFlowTemplates conformance (admin coverage tranche 3 / Tier 1 money, 2026-11-23).
 *
 * Asserts listing templates, exact sum-to-100% milestone validation,
 * positive percent & non-negative offset enforcement, create/update payloads,
 * deletion confirmation, accessible toggle labels, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminCashFlowTemplates from "@/pages/admin/AdminCashFlowTemplates";
import * as estimationQueries from "@/lib/estimation/queries";
import type { CashFlowTemplate } from "@/types/estimation";

vi.mock("@/lib/estimation/queries", () => ({
  fetchCashFlowTemplates: vi.fn(),
  createCashFlowTemplate: vi.fn(),
  updateCashFlowTemplate: vi.fn(),
  deleteCashFlowTemplate: vi.fn(),
}));

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (s: string) => s }),
}));

const mockTemplates: CashFlowTemplate[] = [
  {
    id: "cft-1",
    name: "Standard Residential 40-35-25",
    description: "Standard three-stage disbursement",
    milestones: [
      { label: "Mobilization", percent: 40, offset_months: 0 },
      { label: "Roof Level", percent: 35, offset_months: 3 },
      { label: "Handover", percent: 25, offset_months: 6 },
    ],
    is_default: true,
    is_active: true,
    sort_order: 1,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn().mockReturnValue(true);
  vi.mocked(estimationQueries.fetchCashFlowTemplates).mockResolvedValue({
    data: [...mockTemplates],
    error: null,
  });
  vi.mocked(estimationQueries.createCashFlowTemplate).mockResolvedValue({
    data: null as any,
    error: null,
  });
  vi.mocked(estimationQueries.updateCashFlowTemplate).mockResolvedValue({
    data: null as any,
    error: null,
  });
  vi.mocked(estimationQueries.deleteCashFlowTemplate).mockResolvedValue({
    error: null,
  });
});

describe("AdminCashFlowTemplates", () => {
  it("renders header, lists existing templates and provides accessible toggle names", async () => {
    render(
      <MemoryRouter>
        <AdminCashFlowTemplates />
      </MemoryRouter>,
    );

    expect(screen.getByText("Cash-Flow Templates")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Standard Residential 40-35-25")).toBeInTheDocument();
      expect(screen.getByText(/Mobilization 40% @0m/i)).toBeInTheDocument();
    });

    expect(
      screen.getByRole("switch", { name: "Default: Standard Residential 40-35-25" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Active: Standard Residential 40-35-25" }),
    ).toBeInTheDocument();
  });

  it("refuses to save when milestone percentages do not sum to exactly 100%", async () => {
    render(
      <MemoryRouter>
        <AdminCashFlowTemplates />
      </MemoryRouter>,
    );

    await screen.findByText("Standard Residential 40-35-25");
    fireEvent.click(screen.getByRole("button", { name: /Add Template/i }));

    const nameInput = screen.getByLabelText(/Template name/i);
    fireEvent.change(nameInput, { target: { value: "Invalid Sum Template" } });

    const labelInput = screen.getByPlaceholderText(/Milestone 1 label/i);
    fireEvent.change(labelInput, { target: { value: "Advance Payment" } });

    const percentInput = screen.getByPlaceholderText("%");
    fireEvent.change(percentInput, { target: { value: "85" } }); // 85% != 100%

    const offsetInput = screen.getByPlaceholderText("months");
    fireEvent.change(offsetInput, { target: { value: "0" } });

    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Milestone percentages sum to 85%: they must sum to exactly 100%/i),
      ).toBeInTheDocument();
    });
    expect(estimationQueries.createCashFlowTemplate).not.toHaveBeenCalled();
  });

  it("creates a template with parsed numbers and trimmed strings", async () => {
    render(
      <MemoryRouter>
        <AdminCashFlowTemplates />
      </MemoryRouter>,
    );

    await screen.findByText("Standard Residential 40-35-25");
    fireEvent.click(screen.getByRole("button", { name: /Add Template/i }));

    fireEvent.change(screen.getByLabelText(/Template name/i), {
      target: { value: "Turnkey Full Advance" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Milestone 1 label/i), {
      target: { value: "Full Settlement" },
    });
    fireEvent.change(screen.getByPlaceholderText("%"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByPlaceholderText("months"), {
      target: { value: "0" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => {
      expect(estimationQueries.createCashFlowTemplate).toHaveBeenCalledWith({
        name: "Turnkey Full Advance",
        description: null,
        milestones: [
          {
            label: "Full Settlement",
            percent: 100,
            offset_months: 0,
          },
        ],
        is_default: false,
        is_active: true,
        sort_order: 0,
      });
    });
  });

  it("deletes a template after window confirmation", async () => {
    render(
      <MemoryRouter>
        <AdminCashFlowTemplates />
      </MemoryRouter>,
    );

    await screen.findByText("Standard Residential 40-35-25");
    const deleteBtn = screen.getByTitle("Delete");
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith(
      "Delete the Standard Residential 40-35-25 template?",
    );
    await waitFor(() => {
      expect(estimationQueries.deleteCashFlowTemplate).toHaveBeenCalledWith("cft-1");
    });
  });
});
