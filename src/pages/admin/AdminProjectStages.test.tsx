import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminProjectStages from "./AdminProjectStages";
import * as projectIntel from "@/lib/project-intelligence";
import { supabase } from "@/lib/supabase";
import type { DbProjectStageTemplate } from "@/types/database";

const mockStages: DbProjectStageTemplate[] = [
  {
    id: "stage-1",
    stage_key: "surface_prep",
    stage_name: "Surface Preparation",
    description: "Cleaning, patching, sanding, and masking.",
    sort_order: 1,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "stage-2",
    stage_key: "primer_coat",
    stage_name: "Primer Application",
    description: "Sealing coat applied to raw or repaired plaster.",
    sort_order: 2,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const upsertMock = vi.fn().mockResolvedValue({ error: null });
const deleteEqMock = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock("@/lib/project-intelligence", () => ({
  fetchStageTemplates: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: upsertMock,
      delete: vi.fn(() => ({
        eq: deleteEqMock,
      })),
    })),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn().mockReturnValue(true);
  vi.mocked(projectIntel.fetchStageTemplates).mockResolvedValue(mockStages);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminProjectStages />
    </MemoryRouter>,
  );
}

describe("AdminProjectStages", () => {
  it("renders stage templates with name, sort order, and description", async () => {
    renderPage();

    expect(await screen.findByText("Surface Preparation")).toBeInTheDocument();
    expect(screen.getByText("Primer Application")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText(/Cleaning, patching, sanding/)).toBeInTheDocument();
  });

  it("opens add form with automatically incremented sort order", async () => {
    renderPage();

    await screen.findByText("Surface Preparation");
    const addBtn = screen.getByRole("button", { name: /add stage/i });
    fireEvent.click(addBtn);

    expect(
      await screen.findByRole("heading", { name: "Add Stage" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Sort Order")).toHaveValue(3); // 2 + 1
  });

  it("validates required stage key and stage name before upserting", async () => {
    renderPage();

    await screen.findByText("Surface Preparation");
    fireEvent.click(screen.getByRole("button", { name: /add stage/i }));

    const saveBtn = await screen.findByRole("button", { name: /^Save$/i });
    fireEvent.click(saveBtn);

    // Save should be a no-op if fields are missing
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("saves new stage template with upsert onConflict: stage_key", async () => {
    renderPage();

    await screen.findByText("Surface Preparation");
    fireEvent.click(screen.getByRole("button", { name: /add stage/i }));

    fireEvent.change(screen.getByLabelText("Stage Key *"), {
      target: { value: "finish_coat" },
    });
    fireEvent.change(screen.getByLabelText("Stage Name *"), {
      target: { value: "Top Coat Finishing" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Two coats of premium emulsion." },
    });

    const saveBtn = screen.getByRole("button", { name: /^Save$/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("project_stage_templates");
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          stage_key: "finish_coat",
          stage_name: "Top Coat Finishing",
          description: "Two coats of premium emulsion.",
          sort_order: 3,
          is_active: true,
        }),
        { onConflict: "stage_key" },
      );
    });
  });

  it("opens edit form for an existing stage and disables the key input", async () => {
    renderPage();

    await screen.findByText("Surface Preparation");
    const editBtn = screen.getByRole("button", {
      name: "Edit stage: Surface Preparation",
    });
    fireEvent.click(editBtn);

    expect(
      await screen.findByRole("heading", { name: "Edit Stage" }),
    ).toBeInTheDocument();
    const keyInput = screen.getByLabelText("Stage Key *");
    expect(keyInput).toBeDisabled();
    expect(keyInput).toHaveValue("surface_prep");
  });

  it("deletes a stage template after confirmation", async () => {
    renderPage();

    await screen.findByText("Surface Preparation");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete stage: Surface Preparation",
    });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith("Delete this stage template?");
    await waitFor(() => {
      expect(deleteEqMock).toHaveBeenCalledWith("id", "stage-1");
    });
  });

  it("cancels deletion when confirm dialog is rejected", async () => {
    window.confirm = vi.fn().mockReturnValue(false);
    renderPage();

    await screen.findByText("Surface Preparation");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete stage: Surface Preparation",
    });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(deleteEqMock).not.toHaveBeenCalled();
  });
});
