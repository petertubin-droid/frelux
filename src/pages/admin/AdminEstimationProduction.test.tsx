import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminEstimationProduction from "./AdminEstimationProduction";
import { supabase } from "@/lib/supabase";

const mockRules = [
  {
    id: "rule-1",
    product_category: "emulsion",
    quality_slug: "standard",
    location_rule: "outside_owerri",
    min_quantity: 50,
    unit: "buckets",
    is_active: true,
    description: "Outside Owerri minimum run",
    sort_order: 1,
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z",
  },
  {
    id: "rule-2",
    product_category: "texcote",
    quality_slug: null,
    location_rule: "owerri",
    min_quantity: 1,
    unit: "drums",
    is_active: false,
    description: "No minimum in Owerri",
    sort_order: 2,
    created_at: "2026-11-02T10:00:00Z",
    updated_at: "2026-11-02T10:00:00Z",
  },
];

let rulesList = [...mockRules];
let fetchError: any = null;
const updateEqMock = vi.fn().mockResolvedValue({ error: null });
const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
const insertMock = vi.fn().mockResolvedValue({ error: null });

function createChainQuery(data: any, err: any = null) {
  const obj: any = {
    order: vi.fn().mockImplementation(() => obj),
    select: vi.fn().mockImplementation(() => obj),
    then: (resolve: any) => resolve({ data: err ? null : data, error: err }),
  };
  return obj;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "estimation_production_rules") {
        return {
          select: vi
            .fn()
            .mockImplementation(() => createChainQuery(rulesList, fetchError)),
          update: vi.fn().mockImplementation(() => ({
            eq: updateEqMock,
          })),
          delete: vi.fn().mockImplementation(() => ({
            eq: deleteEqMock,
          })),
          insert: insertMock,
        };
      }
      return createChainQuery([]);
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  rulesList = [...mockRules];
  fetchError = null;
  window.confirm = vi.fn().mockReturnValue(true);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminEstimationProduction />
    </MemoryRouter>,
  );
}

describe("AdminEstimationProduction", () => {
  it("renders Production Rules header and grouped rule cards", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Production Rules/i,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Emulsion")).toBeInTheDocument();
    expect(screen.getByText("Outside Owerri")).toBeInTheDocument();
    expect(screen.getByText("50 buckets")).toBeInTheDocument();
    expect(screen.getByText(/Outside Owerri minimum run/)).toBeInTheDocument();
  });

  it("toggles active state and calls supabase update", async () => {
    renderPage();

    await screen.findByText("Emulsion");
    const toggle = screen.getByLabelText("Active: emulsion outside_owerri");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "rule-1");
    });
  });

  it("deletes a production rule after confirmation", async () => {
    renderPage();

    await screen.findByText("Emulsion");
    const deleteBtn = screen.getByLabelText("Delete emulsion");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        "Delete this production rule?",
      );
      expect(deleteEqMock).toHaveBeenCalledWith("id", "rule-1");
    });
  });

  it("opens Add Rule modal and submits new rule", async () => {
    renderPage();

    await screen.findByText("Emulsion");
    const addBtn = screen.getByRole("button", { name: /Add Rule/i });
    fireEvent.click(addBtn);

    expect(
      await screen.findByRole("heading", { name: "Add Production Rule" }),
    ).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: "Save" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
    });
  });

  it("renders empty state when no rules are configured", async () => {
    rulesList = [];
    renderPage();

    expect(await screen.findByText("No rules found")).toBeInTheDocument();
  });

  it("renders error alert when database fetch fails", async () => {
    fetchError = { message: "Failed to load production rules" };
    renderPage();

    expect(
      await screen.findByText("Failed to load production rules"),
    ).toBeInTheDocument();
  });
});
