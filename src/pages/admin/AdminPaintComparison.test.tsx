import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPaintComparison from "./AdminPaintComparison";
import * as projectIntel from "@/lib/project-intelligence";
import type { DbPaintComparison } from "@/types/database";

const mockComparisons: DbPaintComparison[] = [
  {
    id: "comp-1",
    paint_type: "matt_emulsion",
    display_name: "Matt Emulsion",
    description: "Classic interior non-reflective finish.",
    finish: "Flat / Matt",
    recommended_use: "Ceilings and low-traffic interior walls",
    durability: "Moderate",
    washability: "Wipe gently",
    appearance: "Deep velvety chalky look",
    product_characteristics: "Hides drywall surface imperfections",
    suitable_areas: "Bedrooms, living rooms",
    price_range: "$$",
    sort_order: 1,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "comp-2",
    paint_type: "silk_satin",
    display_name: "Silk Satin Emulsion",
    description: "Washable mid-sheen paint for high-traffic zones.",
    finish: "Mid-Sheen",
    recommended_use: "Hallways, kitchens, bathrooms",
    durability: "High",
    washability: "Scrub-resistant",
    appearance: "Soft radiant sheen",
    product_characteristics: "Resists moisture and grease",
    suitable_areas: "Kitchens, corridors, playrooms",
    price_range: "$$$",
    sort_order: 2,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const notifyErrorMock = vi.fn();

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({
    error: notifyErrorMock,
    success: vi.fn(),
    toast: vi.fn(),
  }),
}));

vi.mock("@/lib/project-intelligence", () => ({
  fetchPaintComparisons: vi.fn(),
  upsertPaintComparison: vi.fn(),
  deletePaintComparison: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn().mockReturnValue(true);
  vi.mocked(projectIntel.fetchPaintComparisons).mockResolvedValue(
    mockComparisons,
  );
  vi.mocked(projectIntel.upsertPaintComparison).mockResolvedValue({} as any);
  vi.mocked(projectIntel.deletePaintComparison).mockResolvedValue();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPaintComparison />
    </MemoryRouter>,
  );
}

describe("AdminPaintComparison", () => {
  it("lists comparison cards with display name, key, description, and finish tags", async () => {
    renderPage();

    expect(await screen.findByText("Matt Emulsion")).toBeInTheDocument();
    expect(screen.getByText("Silk Satin Emulsion")).toBeInTheDocument();
    expect(screen.getByText("matt_emulsion")).toBeInTheDocument();
    expect(screen.getByText("silk_satin")).toBeInTheDocument();
    expect(screen.getByText("Flat / Matt")).toBeInTheDocument();
    expect(screen.getByText("Mid-Sheen")).toBeInTheDocument();
  });

  it("opens add form and saves new paint comparison entry", async () => {
    renderPage();

    await screen.findByText("Matt Emulsion");
    fireEvent.click(screen.getByRole("button", { name: /add paint type/i }));

    expect(
      await screen.findByRole("heading", { name: "Add Paint Type" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Paint Type Key *"), {
      target: { value: "eggshell" },
    });
    fireEvent.change(screen.getByLabelText("Display Name *"), {
      target: { value: "Eggshell Finish" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Low-lustre finish with superior scrub resistance." },
    });
    fireEvent.change(screen.getByLabelText("Finish"), {
      target: { value: "Eggshell / Satin" },
    });

    const saveBtn = screen.getByRole("button", { name: /^Save$/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(projectIntel.upsertPaintComparison).toHaveBeenCalledWith(
        expect.objectContaining({
          paint_type: "eggshell",
          display_name: "Eggshell Finish",
          description: "Low-lustre finish with superior scrub resistance.",
          finish: "Eggshell / Satin",
        }),
      );
    });
  });

  it("prevents save when paint type key is empty", async () => {
    renderPage();

    await screen.findByText("Matt Emulsion");
    fireEvent.click(screen.getByRole("button", { name: /add paint type/i }));

    const saveBtn = await screen.findByRole("button", { name: /^Save$/i });
    fireEvent.click(saveBtn);

    expect(projectIntel.upsertPaintComparison).not.toHaveBeenCalled();
  });

  it("opens edit form with existing attributes and disabled key input", async () => {
    renderPage();

    await screen.findByText("Matt Emulsion");
    const editBtn = screen.getByRole("button", {
      name: "Edit paint entry: Matt Emulsion",
    });
    fireEvent.click(editBtn);

    expect(
      await screen.findByRole("heading", { name: "Edit Paint Type" }),
    ).toBeInTheDocument();
    const keyInput = screen.getByLabelText("Paint Type Key *");
    expect(keyInput).toBeDisabled();
    expect(keyInput).toHaveValue("matt_emulsion");
  });

  it("deletes paint comparison entry upon user confirmation", async () => {
    renderPage();

    await screen.findByText("Matt Emulsion");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete paint entry: Matt Emulsion",
    });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith(
      "Delete this paint comparison entry?",
    );
    await waitFor(() => {
      expect(projectIntel.deletePaintComparison).toHaveBeenCalledWith("comp-1");
    });
  });

  it("cancels deletion when confirm dialog is rejected", async () => {
    window.confirm = vi.fn().mockReturnValue(false);
    renderPage();

    await screen.findByText("Matt Emulsion");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete paint entry: Matt Emulsion",
    });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(projectIntel.deletePaintComparison).not.toHaveBeenCalled();
  });

  it("notifies toast error when upsert rejects", async () => {
    vi.mocked(projectIntel.upsertPaintComparison).mockRejectedValue(
      new Error("Database error writing comparison entry"),
    );

    renderPage();

    await screen.findByText("Matt Emulsion");
    fireEvent.click(screen.getByRole("button", { name: /add paint type/i }));

    fireEvent.change(await screen.findByLabelText("Paint Type Key *"), {
      target: { value: "primer" },
    });

    const saveBtn = screen.getByRole("button", { name: /^Save$/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(notifyErrorMock).toHaveBeenCalledWith(
        "Database error writing comparison entry",
      );
    });
  });
});
