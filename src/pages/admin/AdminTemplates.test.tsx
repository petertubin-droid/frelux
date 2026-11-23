import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminTemplates from "./AdminTemplates";

const {
  mockTemplates,
  getAllTemplatesMock,
  createTemplateMock,
  updateTemplateMock,
  deleteTemplateMock,
  mockToast,
} = vi.hoisted(() => {
  const mockTemplates = [
    {
      id: "tpl-1",
      name: "3-Bedroom Screeding Standard",
      description: "Standard screeding spec for residential bungalows",
      calculator_type: "screeding",
      visibility: "public",
      is_published: true,
      is_featured: false,
      slug: "3-bedroom-screeding-standard",
      input_data: { rooms: 3 },
    },
    {
      id: "tpl-2",
      name: "Luxury Living Room POP",
      description: "Suspended ceiling design with cove lighting",
      calculator_type: "pop",
      visibility: "public",
      is_published: false,
      is_featured: true,
      slug: "luxury-living-room-pop",
      input_data: { area: 45 },
    },
  ];

  return {
    mockTemplates,
    getAllTemplatesMock: vi.fn(),
    createTemplateMock: vi.fn(),
    updateTemplateMock: vi.fn(),
    deleteTemplateMock: vi.fn(),
    mockToast: vi.fn(),
  };
});

vi.mock("@/lib/templates", () => ({
  adminGetAllTemplates: getAllTemplatesMock,
  adminCreateTemplate: createTemplateMock,
  adminUpdateTemplate: updateTemplateMock,
  adminDeleteTemplate: deleteTemplateMock,
  calculatorLabel: (type: string) => {
    const labels: Record<string, string> = {
      screeding: "Screeding",
      pop: "POP Ceiling",
      paint: "Painting",
      tile: "Tiling",
    };
    return labels[type] || type;
  },
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  getAllTemplatesMock.mockResolvedValue([...mockTemplates]);
  createTemplateMock.mockResolvedValue({ id: "tpl-new" });
  updateTemplateMock.mockResolvedValue({ success: true });
  deleteTemplateMock.mockResolvedValue({ success: true });
  window.confirm = vi.fn().mockReturnValue(true);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminTemplates />
    </MemoryRouter>,
  );
}

describe("AdminTemplates", () => {
  it("renders page header and template table", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Calculator Templates/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /New Template/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("3-Bedroom Screeding Standard"),
    ).toBeInTheDocument();
    expect(screen.getByText("Luxury Living Room POP")).toBeInTheDocument();
  });

  it("filters templates by search term", async () => {
    renderPage();

    expect(
      await screen.findByText("3-Bedroom Screeding Standard"),
    ).toBeInTheDocument();
    const searchInput = screen.getByPlaceholderText("Search templates...");

    fireEvent.change(searchInput, { target: { value: "screeding" } });
    expect(
      screen.getByText("3-Bedroom Screeding Standard"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Luxury Living Room POP"),
    ).not.toBeInTheDocument();
  });

  it("toggles published status", async () => {
    renderPage();

    await screen.findByText("3-Bedroom Screeding Standard");
    const showBtns = screen.getAllByRole("button", { name: "Show" });
    fireEvent.click(showBtns[0]);

    await waitFor(() => {
      expect(updateTemplateMock).toHaveBeenCalledWith("tpl-1", {
        is_published: false,
      });
    });
  });

  it("toggles featured status", async () => {
    renderPage();

    await screen.findByText("3-Bedroom Screeding Standard");
    const featureBtns = screen.getAllByRole("button", {
      name: "Feature template",
    });
    fireEvent.click(featureBtns[0]);

    await waitFor(() => {
      expect(updateTemplateMock).toHaveBeenCalledWith("tpl-1", {
        is_featured: true,
      });
    });
  });

  it("duplicates a template", async () => {
    renderPage();

    await screen.findByText("3-Bedroom Screeding Standard");
    const copyBtns = screen.getAllByRole("button", { name: "Copy" });
    fireEvent.click(copyBtns[0]);

    await waitFor(() => {
      expect(createTemplateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "3-Bedroom Screeding Standard (Copy)",
          calculator_type: "screeding",
        }),
      );
    });
  });

  it("deletes a template after confirmation", async () => {
    renderPage();

    await screen.findByText("3-Bedroom Screeding Standard");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete 3-Bedroom Screeding Standard",
    });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        "Delete this template? This cannot be undone.",
      );
      expect(deleteTemplateMock).toHaveBeenCalledWith("tpl-1");
    });
  });
});
