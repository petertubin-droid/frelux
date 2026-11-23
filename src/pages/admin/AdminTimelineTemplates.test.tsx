import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminTimelineTemplates from "./AdminTimelineTemplates";
import { supabase } from "@/lib/supabase";
import type { DbTimelineTemplate } from "@/types/database";

const mockTemplates: DbTimelineTemplate[] = [
  {
    id: "tpl-1",
    project_type: "screeding",
    name: "Standard Residential Screeding",
    description: "Two-coat screed with 24h moisture cure.",
    phases: [
      {
        phase: "preparation",
        name: "Wall Sanding & Priming",
        days: 1,
        depends_on: null,
      },
      {
        phase: "screeding",
        name: "First Screed Coat",
        days: 2,
        depends_on: "preparation",
      },
      {
        phase: "drying",
        name: "Curing & Sanding",
        days: 1,
        depends_on: "screeding",
      },
    ],
    is_active: true,
    sort_order: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "tpl-2",
    project_type: "painting",
    name: "Interior Paint Schedule",
    description: "Primer plus two coats of emulsion.",
    phases: [
      {
        phase: "primer",
        name: "Undercoat Application",
        days: 1,
        depends_on: null,
      },
      {
        phase: "painting",
        name: "Finish Coats",
        days: 2,
        depends_on: "primer",
      },
    ],
    is_active: true,
    sort_order: 2,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

let queryResult = { data: mockTemplates, error: null };
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
  queryResult = { data: mockTemplates, error: null };
  window.confirm = vi.fn().mockReturnValue(true);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminTimelineTemplates />
    </MemoryRouter>,
  );
}

describe("AdminTimelineTemplates", () => {
  it("lists timeline templates with phases, duration days, and trade type", async () => {
    renderPage();

    expect(
      await screen.findByText("Standard Residential Screeding"),
    ).toBeInTheDocument();
    expect(screen.getByText("Interior Paint Schedule")).toBeInTheDocument();
    expect(screen.getByText("screeding")).toBeInTheDocument();
    expect(screen.getByText("painting")).toBeInTheDocument();
    expect(screen.getByText("Wall Sanding & Priming")).toBeInTheDocument();
    expect(screen.getAllByText("1d").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2d").length).toBeGreaterThan(0);
  });

  it("opens add template modal and inserts new template with phases", async () => {
    renderPage();

    await screen.findByText("Standard Residential Screeding");
    fireEvent.click(screen.getByRole("button", { name: /add template/i }));

    expect(
      await screen.findByRole("heading", { name: "Add Template" }),
    ).toBeInTheDocument();

    const nameInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(nameInput, { target: { value: "Full Turnkey Fitout" } });

    const createBtn = screen.getByRole("button", { name: /create template/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Full Turnkey Fitout",
          project_type: "painting",
          is_active: true,
        }),
      );
    });
  });

  it("opens edit modal for existing template and updates name and phases", async () => {
    renderPage();

    await screen.findByText("Standard Residential Screeding");
    const editBtn = screen.getByRole("button", {
      name: "Edit Standard Residential Screeding",
    });
    fireEvent.click(editBtn);

    expect(
      await screen.findByRole("heading", { name: "Edit Template" }),
    ).toBeInTheDocument();

    const nameInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(nameInput, {
      target: { value: "Standard Residential Screeding (Updated)" },
    });

    const updateBtn = screen.getByRole("button", { name: /update template/i });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "tpl-1");
    });
  });

  it("deletes a timeline template upon confirmation", async () => {
    renderPage();

    await screen.findByText("Standard Residential Screeding");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete Standard Residential Screeding",
    });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith("Delete this template?");
    await waitFor(() => {
      expect(deleteEqMock).toHaveBeenCalledWith("id", "tpl-1");
    });
  });

  it("cancels deletion when confirm dialog is rejected", async () => {
    window.confirm = vi.fn().mockReturnValue(false);
    renderPage();

    await screen.findByText("Standard Residential Screeding");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete Standard Residential Screeding",
    });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(deleteEqMock).not.toHaveBeenCalled();
  });

  it("displays database error message when loading fails", async () => {
    queryResult = {
      data: null as any,
      error: { message: "Failed to fetch timeline templates" } as any,
    };
    renderPage();

    expect(
      await screen.findByText("Failed to fetch timeline templates"),
    ).toBeInTheDocument();
  });

  it("displays empty state when no timeline templates exist", async () => {
    queryResult = { data: [], error: null };
    renderPage();

    expect(await screen.findByText("No templates found")).toBeInTheDocument();
  });
});
