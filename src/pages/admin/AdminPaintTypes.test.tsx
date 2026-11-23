import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPaintTypes from "./AdminPaintTypes";
import { supabase } from "@/lib/supabase";
import type { DbPaintType } from "@/types/database";

const mockPaintTypes: DbPaintType[] = [
  {
    id: "paint-1",
    name: "Emulsion Matt",
    description: "Low-sheen interior emulsion for ceilings and walls.",
    coverage_rate: 12,
    coverage_unit: "m2_per_liter",
    container_sizes: [1, 4, 20],
    is_active: true,
    sort_order: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "paint-2",
    name: "High Gloss Enamel",
    description: "Oil-based gloss for trims, doors, and metals.",
    coverage_rate: 14,
    coverage_unit: "m2_per_liter",
    container_sizes: [1, 4],
    is_active: false,
    sort_order: 2,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

let queryResult = { data: mockPaintTypes, error: null };
const insertMock = vi.fn().mockResolvedValue({ error: null });
const updateEqMock = vi.fn().mockResolvedValue({ error: null });
const deleteEqMock = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve(queryResult)),
      })),
      insert: insertMock,
      update: vi.fn(() => ({
        eq: updateEqMock,
      })),
      delete: vi.fn(() => ({
        eq: deleteEqMock,
      })),
    })),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  queryResult = { data: mockPaintTypes, error: null };
  window.confirm = vi.fn().mockReturnValue(true);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPaintTypes />
    </MemoryRouter>,
  );
}

describe("AdminPaintTypes", () => {
  it("lists paint types with name, coverage rate, containers, and inactive badge", async () => {
    renderPage();

    expect(await screen.findByText("Emulsion Matt")).toBeInTheDocument();
    expect(screen.getByText("High Gloss Enamel")).toBeInTheDocument();
    expect(screen.getByText(/Containers: 1, 4, 20 L/)).toBeInTheDocument();
    expect(screen.getByText(/Containers: 1, 4 L/)).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("toggles active status with interpolated switch label", async () => {
    renderPage();

    await screen.findByText("Emulsion Matt");
    const toggle = screen.getByLabelText("Active: Emulsion Matt");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("paint_types");
      expect(updateEqMock).toHaveBeenCalledWith("id", "paint-1");
    });
  });

  it("opens add form, validates required fields, and creates new paint type", async () => {
    renderPage();

    await screen.findByText("Emulsion Matt");
    fireEvent.click(screen.getByRole("button", { name: /add paint type/i }));

    expect(
      await screen.findByRole("heading", { name: "Add paint type" }),
    ).toBeInTheDocument();

    const nameInput = screen.getByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "   " } });

    const saveBtn = screen.getByRole("button", { name: /^Save$/i });
    fireEvent.click(saveBtn);

    expect(await screen.findByText("Name is required")).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: "Satin Finish" } });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Washable mid-sheen coating." },
    });
    fireEvent.change(screen.getByLabelText(/Container sizes/i), {
      target: { value: "2.5, 5, 10" },
    });

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Satin Finish",
          description: "Washable mid-sheen coating.",
          container_sizes: [2.5, 5, 10],
          coverage_rate: 10,
          is_active: true,
        }),
      );
    });
  });

  it("opens edit form for existing paint type and updates attributes", async () => {
    renderPage();

    await screen.findByText("Emulsion Matt");
    const editBtns = screen.getAllByRole("button", { name: /edit/i });
    fireEvent.click(editBtns[0]);

    expect(
      await screen.findByRole("heading", { name: "Edit paint type" }),
    ).toBeInTheDocument();
    const nameInput = screen.getByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "Premium Emulsion Matt" } });

    const saveBtn = screen.getByRole("button", { name: /^Save$/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "paint-1");
    });
  });

  it("deletes a paint type after user confirmation", async () => {
    renderPage();

    await screen.findByText("Emulsion Matt");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete paint type: Emulsion Matt",
    });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith(
      'Delete "Emulsion Matt"? This cannot be undone.',
    );
    await waitFor(() => {
      expect(deleteEqMock).toHaveBeenCalledWith("id", "paint-1");
    });
  });

  it("cancels deletion when confirm dialog is dismissed", async () => {
    window.confirm = vi.fn().mockReturnValue(false);
    renderPage();

    await screen.findByText("Emulsion Matt");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete paint type: Emulsion Matt",
    });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(deleteEqMock).not.toHaveBeenCalled();
  });
});
