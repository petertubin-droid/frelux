/**
 * AdminBoqTemplates conformance (admin coverage tranche 3 / Tier 1 money, 2026-11-23).
 *
 * Asserts loading templates and sections, updating fields, saving template
 * payloads, saving section payloads, and adding sections.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminBoqTemplates from "@/pages/admin/AdminBoqTemplates";
import * as boqQueries from "@/lib/boq/queries";

vi.mock("@/lib/boq/queries", () => ({
  fetchAllTemplates: vi.fn(),
  fetchAllSections: vi.fn(),
  saveTemplate: vi.fn(),
  saveSection: vi.fn(),
}));

const mockTemplates = [
  {
    id: "tpl-1",
    name: "Residential Building (Nigeria Standard)",
    standard: "Commercial",
    market_code: "NG",
    currency: "NGN",
    rounding_decimals: 2,
    default_preliminaries_pct: 5,
    default_overhead_profit_pct: 10,
    default_contingency_pct: 5,
    default_retention_pct: 5,
    default_tax_pct: 7.5,
    page_size: "a4",
    footer_note: "Standard terms apply",
    show_labour_rate: true,
    show_plant_rate: true,
    show_material_rate: true,
    is_active: true,
  },
];

const mockSections = [
  {
    id: "sec-1",
    standard: "Commercial",
    code: "SUB",
    title: "Substructure & Foundations",
    sort_order: 10,
    is_active: true,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(boqQueries.fetchAllTemplates).mockResolvedValue({
    templates: [...mockTemplates],
    error: null,
  });
  vi.mocked(boqQueries.fetchAllSections).mockResolvedValue({
    sections: [...mockSections],
    error: null,
  });
  vi.mocked(boqQueries.saveTemplate).mockResolvedValue({ error: null });
  vi.mocked(boqQueries.saveSection).mockResolvedValue({ error: null });
});

describe("AdminBoqTemplates", () => {
  it("renders BOQ Templates configuration panel and loads templates/sections", async () => {
    render(
      <MemoryRouter>
        <AdminBoqTemplates />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /BOQ templates/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue(/Residential Building \(Nigeria Standard\)/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/Substructure & Foundations/i)).toBeInTheDocument();
    });
  });

  it("updates and saves a template with correct modified payload", async () => {
    render(
      <MemoryRouter>
        <AdminBoqTemplates />
      </MemoryRouter>,
    );

    const nameInput = await screen.findByDisplayValue(/Residential Building \(Nigeria Standard\)/i);
    fireEvent.change(nameInput, { target: { value: "Commercial Tower Template" } });

    const saveBtn = screen.getByRole("button", { name: /Save template/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(boqQueries.saveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "tpl-1",
          name: "Commercial Tower Template",
          standard: "Commercial",
          currency: "NGN",
        }),
      );
    });
  });

  it("updates and saves a section payload", async () => {
    render(
      <MemoryRouter>
        <AdminBoqTemplates />
      </MemoryRouter>,
    );

    const titleInput = await screen.findByDisplayValue(/Substructure & Foundations/i);
    fireEvent.change(titleInput, { target: { value: "Earthworks & Basements" } });

    const saveSectionBtn = screen.getByRole("button", { name: /^Save$/i });
    fireEvent.click(saveSectionBtn);

    await waitFor(() => {
      expect(boqQueries.saveSection).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "sec-1",
          title: "Earthworks & Basements",
          code: "SUB",
        }),
      );
    });
  });

  it("adds a new section with sequential sort order", async () => {
    render(
      <MemoryRouter>
        <AdminBoqTemplates />
      </MemoryRouter>,
    );

    await screen.findByDisplayValue(/Substructure & Foundations/i);

    const addBtn = screen.getByRole("button", { name: /Add section/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(boqQueries.saveSection).toHaveBeenCalledWith({
        standard: "Commercial",
        code: "S2",
        title: "New section",
        sort_order: 20,
        is_active: true,
      });
    });
  });
});
