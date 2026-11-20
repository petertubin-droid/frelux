import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminBoqTemplates from "@/pages/admin/AdminBoqTemplates";

vi.mock("@/lib/boq/queries", () => ({
  fetchAllTemplates: vi.fn().mockResolvedValue([
    {
      id: "tpl-1",
      slug: "residential-nigeria",
      title: "Residential Building (Nigeria Standard)",
      description: "Standard BOQ template with NRM2 structure",
      market_code: "NG",
      measurement_standard: "NRM2",
      currency: "NGN",
      is_default: true,
      created_at: "2026-10-01T00:00:00Z",
    },
  ]),
  fetchAllSections: vi.fn().mockResolvedValue([
    {
      id: "sec-1",
      code: "SUB",
      title: "Substructure & Foundations",
      category: "structural",
      sort_order: 10,
    },
  ]),
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

    expect(screen.getByText(/BOQ Templates/i)).toBeDefined();
  });

  it("displays loaded template titles and sections", async () => {
    render(
      <MemoryRouter>
        <AdminBoqTemplates />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Residential Building \(Nigeria Standard\)/i)).toBeDefined();
    });
  });
});
