import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminBoqTemplates from "@/pages/admin/AdminBoqTemplates";

vi.mock("@/lib/boq/queries", () => ({
  fetchAllTemplates: vi.fn().mockResolvedValue({
    templates: [
      {
        id: "tpl-1",
        name: "Residential Building (Nigeria Standard)",
        standard: "Commercial",
        rounding_step: 1,
        show_labour_rate: true,
        show_equipment_rate: true,
        show_material_rate: true,
      },
    ],
    error: null,
  }),
  fetchAllSections: vi.fn().mockResolvedValue({
    sections: [
      {
        id: "sec-1",
        standard: "Commercial",
        code: "SUB",
        title: "Substructure & Foundations",
        sort_order: 10,
        is_active: true,
      },
    ],
    error: null,
  }),
  saveTemplate: vi.fn().mockResolvedValue({ error: null }),
  saveSection: vi.fn().mockResolvedValue({ error: null }),
}));

describe("AdminBoqTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders BOQ Templates configuration panel", async () => {
    render(
      <MemoryRouter>
        <AdminBoqTemplates />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /BOQ templates/i })).toBeDefined();
  });

  it("displays loaded template titles and sections", async () => {
    render(
      <MemoryRouter>
        <AdminBoqTemplates />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue(/Residential Building \(Nigeria Standard\)/i)).toBeDefined();
      expect(screen.getByDisplayValue(/Substructure & Foundations/i)).toBeDefined();
    });
  });
});
